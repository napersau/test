import { requireVeterinarian, findAccount } from '../users/usersRepository';
import { readAppointments } from '../appointments/appointmentStorage';
import { APPOINTMENTS_KEY, APPOINTMENTS_CHANGED } from '../appointments/appointmentPolicy';
import { isAmount } from '../customerRecords/recordStorage';
import { recordActivity } from '../activity/auditStorage';
import { notifyCustomerEvent } from '../notifications/notificationWriter';
import { examError, VISIT_CANCEL_REASONS } from './examinationPolicy';
import { CLINICAL_ROOMS, isRoomService } from './clinicalPlanPolicy';
import { getDoctorStatus } from '../intake/intakePolicy';
import { assignedAppointment, commitClinical, linkedRecord, orderSummaries, pair, readMedicalRecords, visitMismatch } from './examinationRepository';

// Các bước chuyển trạng thái Visit sau giai đoạn 1: gửi chỉ định → chờ kết quả → mời vào lại (GĐ2) → hủy / đóng ca.
function load(actorId, appointmentId, expectedVersion) {
  const actor = requireVeterinarian(actorId); const appointments = readAppointments(); const appointment = assignedAppointment(actorId, appointmentId, appointments);
  const records = readMedicalRecords(); const record = linkedRecord(records, appointment, actorId);
  if (!record || visitMismatch(record, appointment)) throw examError('Lịch hẹn và hồ sơ khám chưa đồng nhất. Tải lại trước khi tiếp tục.', {}, 409);
  if (expectedVersion !== undefined && expectedVersion !== appointment.version) throw examError('Lượt khám vừa thay đổi. Tải lại để đối chiếu rồi thử lại.', {}, 409);
  return { actor, appointments, appointment, records, record };
}
function save(ctx, appointment, record) {
  commitClinical(ctx.appointments.map((item) => (item.id === appointment.id ? appointment : item)), ctx.records.map((item) => (item.id === record.id ? record : item)));
}

// Giai đoạn 1 → WAITING_RESULTS: dịch vụ Xét nghiệm / CĐHA vào hàng đợi phòng chuyên môn (PENDING), bác sĩ được giải phóng để khám ca khác.
export function sendToClinicalRooms(actorId, appointmentId, input = {}) {
  const ctx = load(actorId, appointmentId, input.expectedAppointmentVersion); const { actor, appointment, record } = ctx;
  if (appointment.status !== 'IN_PROGRESS' || record.status !== 'IN_PROGRESS') throw examError('Chỉ gửi chỉ định khi đang khám.');
  if (input.expectedVersion !== undefined && input.expectedVersion !== record.version) throw examError('Hồ sơ vừa thay đổi. Tải lại để đối chiếu rồi thử lại.', {}, 409);
  const orders = record.serviceOrders || []; const toSend = orders.filter((order) => order.status === 'ORDERED' && isRoomService(order));
  if (!toSend.length) throw examError('Chưa có chỉ định xét nghiệm hoặc chẩn đoán hình ảnh để gửi. Thêm chỉ định ở trang Chỉ định dịch vụ.');
  const stamp = new Date().toISOString(); const ids = new Set(toSend.map((order) => order.id));
  const updatedRecord = { ...record, serviceOrders: orders.map((order) => (ids.has(order.id) ? { ...order, status: 'PENDING', sentAt: stamp, callCount: 0 } : order)), version: record.version + 1, updatedAt: stamp };
  const updated = { ...appointment, status: 'WAITING_RESULTS', sentToRoomsAt: stamp, updatedAt: stamp, version: appointment.version + 1 };
  save(ctx, updated, updatedRecord);
  recordActivity({ actor, module: 'EXAMINATIONS', action: 'VISIT_SEND_ROOMS', targetId: appointment.id, targetName: appointment.code });
  const hasLab = toSend.some((order) => order.serviceType === 'LABORATORY'); const hasImaging = toSend.some((order) => order.serviceType === 'IMAGING');
  notifyCustomerEvent('APPOINTMENT', appointment.id, `sent-rooms-${updated.version}`, 'Đã gửi chỉ định cận lâm sàng',
    `Bé ${appointment.petName} cần: ${toSend.map((order) => order.name).join(', ')}. ${hasLab && hasImaging ? 'Nên đưa bé vào phòng Xét nghiệm lấy mẫu máu trước, rồi sang phòng Chẩn đoán hình ảnh trong lúc máy phân tích.' : `Vui lòng đưa bé đến ${hasLab ? CLINICAL_ROOMS.LABORATORY.label : CLINICAL_ROOMS.IMAGING.label}.`} Chờ tại sảnh khi có kết quả.`);
  return { appointment: updated, sent: toSend.length };
}

// Ca lễ tân đã phân công nhưng khách chưa vào phòng: bác sĩ trả ca về hàng đợi chung để lễ tân điều phối lại.
export function returnToReception(actorId, appointmentId, expectedVersion) {
  const actor = requireVeterinarian(actorId); const appointments = readAppointments(); const appointment = assignedAppointment(actorId, appointmentId, appointments);
  if (expectedVersion !== appointment.version) throw examError('Lượt khám vừa thay đổi. Tải lại để đối chiếu rồi thử lại.', {}, 409);
  if (appointment.status !== 'CHECKED_IN') throw examError('Chỉ trả về lễ tân các ca đã nhận nhưng chưa bắt đầu khám.');
  const stamp = new Date().toISOString();
  const updated = { ...appointment, assignedDoctorId: '', assignedDoctorName: '', roomId: '', roomName: '', assignedAt: '', returnedByDoctorAt: stamp, updatedAt: stamp, version: appointment.version + 1 };
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments.map((item) => (item.id === appointment.id ? updated : item)))); window.dispatchEvent(new Event(APPOINTMENTS_CHANGED));
  recordActivity({ actor, module: 'EXAMINATIONS', action: 'VISIT_RECALL', targetId: appointment.id, targetName: appointment.code });
  return { appointment: updated };
}

// RESULTS_READY → IN_PROGRESS (giai đoạn 2). Bác sĩ phải rảnh; ca chuyển BUSY.
export function inviteBackToRoom(actorId, appointmentId, expectedVersion) {
  const ctx = load(actorId, appointmentId, expectedVersion); const { actor, appointment, record } = ctx;
  if (appointment.status !== 'RESULTS_READY') throw examError('Chỉ mời vào phòng khi ca đã có đủ kết quả cận lâm sàng.');
  if (ctx.appointments.some((item) => item.id !== appointment.id && item.assignedDoctorId === actorId && item.status === 'IN_PROGRESS')) throw examError('Bạn đang khám một ca khác. Chốt ca hoặc gửi chỉ định ca đó trước khi mời bệnh nhân vào lại.', {}, 409);
  const stamp = new Date().toISOString();
  const updatedRecord = { ...record, version: record.version + 1, updatedAt: stamp };
  const updated = { ...appointment, status: 'IN_PROGRESS', phase: 2, callbackPostponed: false, callbackCalls: (appointment.callbackCalls || 0) + 1, invitedAt: stamp, inviteRecordVersion: updatedRecord.version, updatedAt: stamp, version: appointment.version + 1 };
  save(ctx, updated, updatedRecord);
  recordActivity({ actor, module: 'EXAMINATIONS', action: 'VISIT_RECALL', targetId: appointment.id, targetName: appointment.code });
  notifyCustomerEvent('APPOINTMENT', appointment.id, `recall-${updated.version}`, `Mời vào ${appointment.roomName || 'phòng khám'}`, `Mời bạn đưa bé ${appointment.petName} vào ${appointment.roomName || 'phòng khám'} gặp bác sĩ ${actor.fullName} để đọc kết quả.`);
  return { appointment: updated };
}

// Khách chưa vào phòng sau khi gọi: giữ RESULTS_READY, chuyển sang tab "Đã hoãn" và giải phóng bác sĩ. Chỉ khi chưa bắt đầu nội dung giai đoạn 2.
export function postponeCallback(actorId, appointmentId, expectedVersion) {
  const ctx = load(actorId, appointmentId, expectedVersion); const { actor, appointment, record } = ctx;
  if (appointment.status !== 'IN_PROGRESS' || appointment.phase !== 2) throw examError('Chỉ tạm hoãn ca tái khám vừa được mời vào phòng.');
  if (record.version !== appointment.inviteRecordVersion) throw examError('Đã có nội dung được lưu sau khi mời vào phòng nên không thể tạm hoãn. Hãy tiếp tục hoặc chốt ca.');
  const stamp = new Date().toISOString();
  const updated = { ...appointment, status: 'RESULTS_READY', callbackPostponed: true, postponedAt: stamp, updatedAt: stamp, version: appointment.version + 1 };
  save(ctx, updated, { ...record, version: record.version + 1, updatedAt: stamp });
  recordActivity({ actor, module: 'EXAMINATIONS', action: 'VISIT_RECALL', targetId: appointment.id, targetName: appointment.code });
  return { appointment: updated };
}

function settleOnClose(orders, stamp, reason, actorId) {
  return orders.map((order) => (order.status === 'COMPLETED' || order.status === 'CANCELLED' ? order : { ...order, status: 'CANCELLED', cancelReason: reason, cancelledAt: stamp, cancelledBy: actorId }));
}

// Hủy lượt khám (IN_PROGRESS giai đoạn 1 hoặc WAITING_RESULTS): lưu người hủy, thời gian, mã lý do. Không hủy được nếu đã có dịch vụ hoàn tất (dùng "Đóng ca").
export function cancelVisit(actorId, appointmentId, input) {
  const ctx = load(actorId, appointmentId, input.expectedVersion); const { actor, appointment, record } = ctx;
  const validStage = (appointment.status === 'IN_PROGRESS' && appointment.phase !== 2) || appointment.status === 'WAITING_RESULTS';
  if (!validStage) throw examError('Chỉ hủy lượt khám khi đang khám giai đoạn 1 hoặc đang chờ kết quả cận lâm sàng.');
  if (!Object.keys(VISIT_CANCEL_REASONS).includes(input.code)) throw examError('Chọn lý do hủy.', { code: 'Chọn lý do hủy lượt khám.' });
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if ((input.code === 'OTHER' && !note) || note.length > 500) throw examError('Nhập ghi chú lý do hủy (tối đa 500 ký tự).', { note: 'Với lý do khác, cần ghi rõ nội dung.' });
  if ((record.serviceOrders || []).some((order) => order.status === 'COMPLETED' && isRoomService(order))) throw examError('Đã có kết quả cận lâm sàng hoàn tất. Dùng "Đóng ca / Khách bỏ về" để lưu kết quả và ghi nợ chi phí.');
  const stamp = new Date().toISOString(); const reason = `${VISIT_CANCEL_REASONS[input.code]}${note ? ` — ${note}` : ''}`;
  const updatedRecord = { ...record, status: 'CANCELLED', serviceOrders: settleOnClose(record.serviceOrders || [], stamp, reason, actor.id), cancelledAt: stamp, version: record.version + 1, updatedAt: stamp };
  const updated = { ...appointment, status: 'CANCELLED', cancellationReason: reason, cancelReasonCode: input.code, cancelledBy: 'VETERINARIAN', cancelledById: actor.id, cancelledAt: stamp, updatedAt: stamp, version: appointment.version + 1 };
  save(ctx, updated, updatedRecord);
  recordActivity({ actor, module: 'EXAMINATIONS', action: 'VISIT_CANCEL', targetId: appointment.id, targetName: appointment.code });
  notifyCustomerEvent('APPOINTMENT', appointment.id, `visit-cancelled-${updated.version}`, 'Lượt khám đã kết thúc', `Lượt khám ${appointment.code} đã được hủy: ${reason}.`);
  return { appointment: updated };
}

// Đóng ca / Khách bỏ về (WAITING_RESULTS hoặc RESULTS_READY): khóa hồ sơ, giữ kết quả đã có, dịch vụ chưa làm → hủy, chi phí đã làm chuyển sang hóa đơn (ghi nợ nếu chưa thu).
export function closeAbandonedVisit(actorId, appointmentId, input = {}) {
  const actor = findAccount(actorId);
  if (!actor || actor.status !== 'ACTIVE' || !['VETERINARIAN', 'RECEPTIONIST'].includes(actor.role)) throw new Error('Chỉ bác sĩ hoặc lễ tân đang hoạt động được đóng ca.');
  const appointments = readAppointments(); const appointment = appointments.find((item) => item.id === appointmentId && (actor.role === 'RECEPTIONIST' || item.assignedDoctorId === actorId));
  if (!appointment) throw examError('Không tìm thấy lượt khám.', {}, 404);
  if (input.expectedVersion !== appointment.version) throw examError('Lượt khám vừa thay đổi. Tải lại để đối chiếu rồi thử lại.', {}, 409);
  if (!['WAITING_RESULTS', 'RESULTS_READY'].includes(appointment.status)) throw examError('Chỉ đóng ca khi đang chờ kết quả hoặc đã có kết quả mà khách bỏ về.');
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (!note || note.length > 500) throw examError('Nhập ghi chú xác nhận khách bỏ về (tối đa 500 ký tự).', { note: 'Ghi lại kết quả liên hệ khách.' });
  const records = readMedicalRecords(); const record = records.find((item) => item.appointmentId === appointment.id);
  if (!record || visitMismatch(record, appointment)) throw examError('Lịch hẹn và hồ sơ khám chưa đồng nhất. Tải lại trước khi tiếp tục.', {}, 409);
  const stamp = new Date().toISOString(); const orders = settleOnClose(record.serviceOrders || [], stamp, 'Khách bỏ về trước khi hoàn tất', actor.id);
  const reason = `Khách bỏ về trước khi đọc kết quả. ${note}`;
  const billable = [
    ...(isAmount(appointment.estimatedPrice) ? [{ id: `exam-${appointment.id}`, type: 'SERVICE', name: appointment.serviceName, quantity: 1, unit: 'Lượt', unitPrice: appointment.estimatedPrice, fulfillmentStatus: 'COMPLETED' }] : []),
    ...orders.filter((order) => order.status === 'COMPLETED' && isAmount(order.unitPrice) && Number.isSafeInteger(Number(order.quantity))).map((order) => ({ id: order.id, type: 'SERVICE', name: order.name, quantity: Number(order.quantity), unit: 'Lượt', unitPrice: order.unitPrice, fulfillmentStatus: 'COMPLETED' })),
  ];
  const updatedRecord = { ...record, status: 'COMPLETED', undetermined: true, diagnosisReason: reason, diagnosis: `Chưa xác định chẩn đoán: ${reason}`, serviceOrders: orders, billableItems: billable, abandoned: true,
    completedAt: stamp, examinedAt: stamp, version: record.version + 1, updatedAt: stamp };
  const updated = { ...appointment, status: 'COMPLETED', abandoned: true, closeNote: note, completedAt: stamp, updatedAt: stamp, version: appointment.version + 1 };
  commitClinical(appointments.map((item) => (item.id === appointment.id ? updated : item)), records.map((item) => (item.id === record.id ? updatedRecord : item)));
  recordActivity({ actor, module: 'EXAMINATIONS', action: 'VISIT_CLOSE', targetId: appointment.id, targetName: appointment.code });
  notifyCustomerEvent('APPOINTMENT', appointment.id, `visit-closed-${updated.version}`, 'Lượt khám đã được đóng', `Lượt khám ${appointment.code} đã đóng. Kết quả đã thực hiện được lưu vào lịch sử bệnh án; chi phí dịch vụ đã làm sẽ được thu ở lần đến tiếp theo.`);
  return { appointment: updated };
}

// Ca của bác sĩ sau khi gửi chỉ định: đang chờ kết quả, đã có kết quả (FIFO theo giờ có kết quả), đã hoãn.
export function listCallbackCases(actorId) {
  requireVeterinarian(actorId); const records = readMedicalRecords();
  return readAppointments().filter((item) => item.assignedDoctorId === actorId && ['WAITING_RESULTS', 'RESULTS_READY'].includes(item.status)).map((appointment) => {
    const record = linkedRecord(records, appointment, actorId);
    if (!record || visitMismatch(record, appointment)) throw new Error('Lịch hẹn và hồ sơ khám chưa đồng nhất. Kiểm tra nguồn dữ liệu.');
    const { pet, owner } = pair(actorId, appointment); const orders = orderSummaries(record).filter((order) => ['LABORATORY', 'IMAGING'].includes(order.serviceType));
    const done = orders.filter((order) => ['COMPLETED', 'CANCELLED'].includes(order.status)).length;
    return { id: appointment.id, code: appointment.code, version: appointment.version, petName: appointment.petName, pet, owner, status: appointment.status, priority: appointment.priority || 'NORMAL', roomName: appointment.roomName || '',
      group: appointment.status === 'WAITING_RESULTS' ? 'WAITING' : appointment.callbackPostponed ? 'POSTPONED' : 'READY', sentAt: appointment.sentToRoomsAt || '', resultsReadyAt: appointment.resultsReadyAt || '',
      callbackCalls: appointment.callbackCalls || 0, orders, progress: { done, total: orders.length } };
  }).sort((a, b) => Date.parse(a.resultsReadyAt || a.sentAt || 0) - Date.parse(b.resultsReadyAt || b.sentAt || 0));
}

// Trạng thái tức thời của chính bác sĩ (cho thanh trạng thái): sẵn sàng / ưu tiên đón ca tái khám / bận, cùng ca tái khám kế tiếp.
export function getMyDoctorState(actorId) {
  const actor = requireVeterinarian(actorId); const appointments = readAppointments().filter((item) => item.assignedDoctorId === actorId);
  const status = getDoctorStatus(actorId, appointments);
  const next = appointments.filter((item) => item.status === 'RESULTS_READY' && !item.callbackPostponed).sort((a, b) => Date.parse(a.resultsReadyAt || 0) - Date.parse(b.resultsReadyAt || 0))[0] || null;
  return { key: status.key, record: status.record ? { id: status.record.id, code: status.record.code, petName: status.record.petName, status: status.record.status } : null, estimatedMinutes: status.estimatedMinutes,
    roomNumber: actor.roomNumber || '', next: next ? { id: next.id, code: next.code, petName: next.petName, version: next.version, roomName: next.roomName } : null,
    postponed: appointments.filter((item) => item.status === 'RESULTS_READY' && item.callbackPostponed).length };
}
