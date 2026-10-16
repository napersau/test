import { requireVeterinarian } from '../users/usersRepository';
import { listClinicalRoomOwners } from '../users/usersRepository';
import { listClinicalRoomPets } from '../pets/petsRepository';
import { listLabReferences, evaluateLabValue } from '../labConfig/labConfigRepository';
import { listVeterinarianServices } from '../services/servicesRepository';
import { readAppointments } from '../appointments/appointmentStorage';
import { recordActivity } from '../activity/auditStorage';
import { notifyCustomerEvent } from '../notifications/notificationWriter';
import { clinicToday } from '../catalog/catalogPolicy';
import { examError } from '../examinations/examinationPolicy';
import { isRoomService, OPEN_ORDER_STATUSES } from '../examinations/clinicalPlanPolicy';
import { commitClinical, readMedicalRecords } from '../examinations/examinationRepository';
import { CALL_LIMIT, LAB_EVALUATIONS, ROOM_TYPES, parseRoomKey, roomKey, validateImaging, validateLabValues } from './roomsPolicy';

const VISIBLE_VISITS = ['WAITING_RESULTS', 'RESULTS_READY', 'IN_PROGRESS', 'WAITING_PAYMENT', 'COMPLETED'];

function context(actorId) {
  const actor = requireVeterinarian(actorId);
  return { actor, appointments: readAppointments(), records: readMedicalRecords(), pets: listClinicalRoomPets(actorId), owners: listClinicalRoomOwners(actorId) };
}
function locate(ctx, key) {
  const { appointmentId, orderId } = parseRoomKey(key);
  const appointment = ctx.appointments.find((item) => item.id === appointmentId); const record = ctx.records.find((item) => item.appointmentId === appointmentId);
  const order = record?.serviceOrders?.find((item) => item.id === orderId);
  if (!appointment || !record || !order || !isRoomService(order)) throw examError('Không tìm thấy chỉ định cận lâm sàng.', {}, 404);
  return { appointment, record, order, pet: ctx.pets.find((item) => item.id === appointment.petId), owner: ctx.owners.find((item) => item.id === appointment.ownerId) };
}
function crossBadge(record, order) {
  if (order.serviceType !== 'IMAGING') return '';
  const lab = (record.serviceOrders || []).find((item) => item.serviceType === 'LABORATORY' && item.status !== 'CANCELLED');
  if (!lab || lab.status === 'PENDING') return '';
  return lab.status === 'COMPLETED' || lab.sampleTakenAt ? 'LAB_SAMPLED' : 'LAB_COLLECTING';
}
const sameDay = (iso) => !!iso && clinicToday(new Date(iso)) === clinicToday();

function row(ctx, appointment, record, order) {
  const pet = ctx.pets.find((item) => item.id === appointment.petId); const owner = ctx.owners.find((item) => item.id === appointment.ownerId);
  const missed = !!order.missed; const crossPostponed = !!order.crossPostponed;
  const tab = order.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : order.status === 'PENDING' ? (missed || crossPostponed ? 'POSTPONED' : 'QUEUE') : 'DONE';
  return { key: roomKey(appointment.id, order.id), appointmentId: appointment.id, appointmentCode: appointment.code, visitStatus: appointment.status, petName: appointment.petName, species: pet?.species || '', ownerName: owner?.fullName || '—',
    emergency: appointment.priority === 'PRIORITY' || appointment.source === 'EMERGENCY', doctorName: order.doctorName || record.doctorName || '', orderName: order.name, serviceType: order.serviceType, quantity: order.quantity, notes: order.notes || '',
    status: order.status, tab, sentAt: order.sentAt || '', callCount: order.callCount || 0, missed, presentAgain: !!order.presentAgainAt, priorityNext: !!order.priorityNext, crossPostponed,
    startedAt: order.startedAt || '', completedAt: order.completedAt || order.cancelledAt || '', sampleTaken: !!order.sampleTakenAt || order.status === 'COMPLETED', badge: crossBadge(record, order), cancelReason: order.cancelReason || '' };
}

// Hàng đợi của một phòng: cấp cứu trước, ca "ưu tiên kế tiếp" (khách quay lại), rồi FIFO theo giờ bác sĩ gửi chỉ định.
export function listRoomQueue(actorId, room) {
  if (!ROOM_TYPES[room]) throw new Error('Phòng chuyên môn không hợp lệ.');
  const ctx = context(actorId); const rows = [];
  ctx.appointments.filter((item) => VISIBLE_VISITS.includes(item.status)).forEach((appointment) => {
    const record = ctx.records.find((item) => item.appointmentId === appointment.id); if (!record) return;
    (record.serviceOrders || []).filter((order) => order.serviceType === room && ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(order.status) && order.sentAt)
      .forEach((order) => { const entry = row(ctx, appointment, record, order); if (entry.tab !== 'DONE' || sameDay(entry.completedAt)) rows.push(entry); });
  });
  const rank = (entry) => (entry.emergency ? 0 : entry.priorityNext ? 1 : 2);
  return rows.sort((a, b) => rank(a) - rank(b) || Date.parse(a.sentAt) - Date.parse(b.sentAt));
}

// Chi tiết một chỉ định để nhập kết quả: chỉ số xét nghiệm kèm khoảng tham chiếu theo loài của bé, hoặc dữ liệu CĐHA.
export function getRoomEntry(actorId, key) {
  const ctx = context(actorId); const { appointment, record, order, pet } = locate(ctx, key); const entry = row(ctx, appointment, record, order);
  let indicators = [];
  if (order.serviceType === 'LABORATORY') {
    const references = listLabReferences(actorId);
    // Chỉ số của gói xét nghiệm được chốt lúc chỉ định; chỉ định cũ chưa có thì lấy theo cấu hình hiện tại của dịch vụ.
    const ids = order.labResults?.length ? order.labResults.map((item) => item.itemId) : (order.labItemIds || listVeterinarianServices(actorId).find((item) => item.id === order.serviceId)?.labItemIds || []);
    indicators = ids.map((id) => references.find((item) => item.id === id)).filter(Boolean).map((item) => ({ id: item.id, code: item.code, name: item.name, unit: item.unit, range: pet?.species ? item.ranges[pet.species] || null : null }));
  }
  return { entry, version: appointment.version, species: pet?.species || '', indicators, labResults: order.labResults || [], resultComment: order.resultComment || '', imaging: order.imaging || null,
    editable: order.status === 'IN_PROGRESS' && appointment.status === 'WAITING_RESULTS' };
}

function updateOrder(ctx, located, changes, { visitChanges = {}, push = null } = {}) {
  const { appointment, record, order } = located; const stamp = new Date().toISOString();
  const nextOrder = { ...order, ...changes };
  const orders = record.serviceOrders.map((item) => (item.id === order.id ? nextOrder : item));
  let nextAppointment = { ...appointment, ...visitChanges }; let ready = false;
  // Mọi dịch vụ cận lâm sàng đã COMPLETED hoặc CANCELLED → tự động chuyển Visit sang RESULTS_READY, khóa ưu tiên đón ca tái khám.
  if (appointment.status === 'WAITING_RESULTS' && !orders.some((item) => OPEN_ORDER_STATUSES.includes(item.status))) {
    nextAppointment = { ...nextAppointment, status: 'RESULTS_READY', resultsReadyAt: stamp, callbackPostponed: false, updatedAt: stamp, version: appointment.version + 1 }; ready = true;
  }
  const results = push ? [...(record.results || []).filter((item) => item.id !== order.id), push] : record.results || [];
  const nextRecord = { ...record, serviceOrders: orders, results, version: record.version + 1, updatedAt: stamp };
  commitClinical(ctx.appointments.map((item) => (item.id === appointment.id ? nextAppointment : item)), ctx.records.map((item) => (item.id === record.id ? nextRecord : item)));
  if (ready) {
    notifyCustomerEvent('APPOINTMENT', appointment.id, `results-ready-${nextAppointment.version}`, 'Bé đã có đầy đủ kết quả cận lâm sàng',
      `Bé ${appointment.petName} đã có đầy đủ kết quả cận lâm sàng. Bác sĩ ${record.doctorName} sẽ mời bạn và bé vào phòng khám trong ít phút nữa. Xin vui lòng chờ tại sảnh.`);
  }
  return { appointment: nextAppointment, order: nextOrder, ready };
}
const audit = (ctx, action, appointment) => recordActivity({ actor: ctx.actor, module: 'EXAMINATIONS', action, targetId: appointment.id, targetName: appointment.code });
function need(located, condition, message) { if (!condition) throw examError(message, {}, 409); }
const roomOf = (order) => ROOM_TYPES[order.serviceType];
const stage = (located) => located.appointment.status === 'WAITING_RESULTS';

// Phát loa gọi số: dịch vụ VẪN GIỮ PENDING, chỉ tăng bộ đếm lần gọi (tối đa 3).
export function callPatient(actorId, key) {
  const ctx = context(actorId); const located = locate(ctx, key); const { order, appointment } = located;
  need(located, stage(located) && order.status === 'PENDING' && !order.missed && !order.crossPostponed, 'Chỉ gọi ca đang chờ trong hàng đợi chính.');
  if ((order.callCount || 0) >= CALL_LIMIT) throw examError(`Đã gọi đủ ${CALL_LIMIT} lần. Hãy báo vắng mặt / gọi ca tiếp.`, {}, 409);
  const count = (order.callCount || 0) + 1;
  updateOrder(ctx, located, { callCount: count, calledAt: new Date().toISOString() });
  audit(ctx, 'ROOM_QUEUE', appointment);
  notifyCustomerEvent('APPOINTMENT', appointment.id, `room-call-${order.id}-${count}`, `Mời vào ${roomOf(order).label}`, `Mời bé ${appointment.petName} vào ${roomOf(order).label} (lần gọi ${count}/${CALL_LIMIT}).`);
  return count;
}
// Sau 3 lần gọi khách chưa vào: dịch vụ giữ PENDING, chuyển sang tab "Ca tạm hoãn do vắng mặt".
export function reportMissed(actorId, key) {
  const ctx = context(actorId); const located = locate(ctx, key); const { order, appointment } = located;
  need(located, stage(located) && order.status === 'PENDING' && !order.missed, 'Chỉ báo vắng mặt cho ca đang chờ.');
  if ((order.callCount || 0) < CALL_LIMIT) throw examError(`Cần gọi đủ ${CALL_LIMIT} lần (mỗi lần cách nhau 60 giây) trước khi báo vắng mặt. Hiện mới gọi ${order.callCount || 0} lần.`, {}, 409);
  updateOrder(ctx, located, { missed: true, missedAt: new Date().toISOString(), presentAgainAt: '' });
  audit(ctx, 'ROOM_QUEUE', appointment);
  notifyCustomerEvent('APPOINTMENT', appointment.id, `room-missed-${order.id}`, 'Lượt gọi đã qua do vắng mặt',
    `Lượt gọi của bé ${appointment.petName} đã qua do bạn vắng mặt. Lượt của bạn đang được tạm hoãn. Khi quay lại phòng khám, vui lòng báo Lễ tân hoặc nhấn "Tôi đã có mặt" để được xếp lượt sớm nhất.`);
}
// Khách quay lại (báo lễ tân hoặc bấm "Tôi đã có mặt"): ca hiển thị xanh nhấp nháy để gọi lại.
export function markPresentAgain(actorId, key) {
  const ctx = context(actorId); const located = locate(ctx, key);
  need(located, stage(located) && located.order.status === 'PENDING' && located.order.missed, 'Chỉ đánh dấu có mặt cho ca đang tạm hoãn do vắng mặt.');
  updateOrder(ctx, located, { presentAgainAt: new Date().toISOString() });
}
// Gọi lại vào phòng: ca vắng mặt (đã có mặt trở lại) hoặc ca CĐHA tạm hoãn quay lại hàng đợi ở vị trí "Ưu tiên kế tiếp".
export function recallPatient(actorId, key) {
  const ctx = context(actorId); const located = locate(ctx, key); const { order, appointment } = located;
  need(located, stage(located) && order.status === 'PENDING' && (order.missed || order.crossPostponed), 'Ca này không nằm trong danh sách tạm hoãn.');
  need(located, !order.missed || order.presentAgainAt, 'Khách chưa báo đã có mặt trở lại. Chỉ gọi lại khi khách đã quay lại.');
  updateOrder(ctx, located, { missed: false, crossPostponed: false, priorityNext: true, callCount: 1, calledAt: new Date().toISOString() });
  audit(ctx, 'ROOM_QUEUE', appointment);
  notifyCustomerEvent('APPOINTMENT', appointment.id, `room-recall-${order.id}-${Date.now()}`, `Mời vào ${roomOf(order).label}`, `Mời bé ${appointment.petName} vào ${roomOf(order).label}.`);
}
// Phòng CĐHA: thú cưng chưa sang (đang lấy máu bên Lab) → tạm hoãn, vẫn PENDING, gọi ca kế tiếp để phòng máy không bị treo.
export function postponeCrossRoom(actorId, key) {
  const ctx = context(actorId); const located = locate(ctx, key); const { order, appointment } = located;
  need(located, order.serviceType === 'IMAGING', 'Chỉ phòng Chẩn đoán hình ảnh dùng thao tác tạm hoãn liên phòng.');
  need(located, stage(located) && order.status === 'PENDING' && !order.missed && !order.crossPostponed, 'Chỉ tạm hoãn ca đang chờ trong hàng đợi chính.');
  updateOrder(ctx, located, { crossPostponed: true, postponedAt: new Date().toISOString(), priorityNext: false });
  audit(ctx, 'ROOM_QUEUE', appointment);
}
export function startService(actorId, key) {
  const ctx = context(actorId); const located = locate(ctx, key); const { order, appointment } = located;
  need(located, stage(located) && order.status === 'PENDING' && !order.missed && !order.crossPostponed, 'Chỉ bắt đầu thực hiện ca đang chờ trong hàng đợi chính (không phải ca tạm hoãn).');
  updateOrder(ctx, located, { status: 'IN_PROGRESS', startedAt: new Date().toISOString(), startedBy: ctx.actor.id, priorityNext: false });
  audit(ctx, 'ROOM_QUEUE', appointment);
}
// Phòng Lab: đã lấy mẫu và nạp máy, thú cưng rời phòng → phòng CĐHA thấy huy hiệu xanh "sẵn sàng chụp".
export function markSampleTaken(actorId, key) {
  const ctx = context(actorId); const located = locate(ctx, key);
  need(located, located.order.serviceType === 'LABORATORY' && located.order.status === 'IN_PROGRESS' && stage(located), 'Chỉ xác nhận lấy mẫu cho xét nghiệm đang thực hiện.');
  updateOrder(ctx, located, { sampleTakenAt: new Date().toISOString() });
}

const resultText = (order) => {
  if (order.serviceType === 'LABORATORY') return order.labResults.map((item) => `${item.code}: ${item.value} ${item.unit}${item.evaluation ? ` (${LAB_EVALUATIONS[item.evaluation].label}; tham chiếu ${item.min}–${item.max})` : ''}`).join('; ') + (order.resultComment ? `. Nhận xét: ${order.resultComment}` : '');
  return `Mô tả: ${order.imaging.description} Kết luận: ${order.imaging.conclusion}`;
};

// Lưu & xác nhận kết quả xét nghiệm: đối chiếu khoảng tham chiếu theo loài, snapshot min/max vào kết quả.
export function saveLabResult(actorId, key, input) {
  const ctx = context(actorId); const located = locate(ctx, key); const { order, appointment, pet } = located;
  need(located, order.serviceType === 'LABORATORY' && order.status === 'IN_PROGRESS' && stage(located), 'Bấm "Bắt đầu thực hiện" trước khi nhập kết quả.');
  if (input.expectedVersion !== undefined && input.expectedVersion !== appointment.version) throw examError('Lượt khám vừa thay đổi. Tải lại để đối chiếu.', {}, 409);
  const definitions = getRoomEntry(actorId, key).indicators; const errors = validateLabValues(definitions, input.values);
  if (Object.keys(errors).length) throw examError('Kiểm tra các chỉ số xét nghiệm.', errors);
  const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
  if (comment.length > 1000) throw examError('Nhận xét tối đa 1.000 ký tự.', { comment: 'Nhận xét tối đa 1.000 ký tự.' });
  const stamp = new Date().toISOString();
  const labResults = definitions.map((item) => { const value = Number(input.values[item.id]);
    return { itemId: item.id, code: item.code, name: item.name, unit: item.unit, species: pet?.species || '', value, min: item.range?.min ?? null, max: item.range?.max ?? null, evaluation: evaluateLabValue(value, item.range) }; });
  const next = { ...order, labResults, resultComment: comment };
  const done = updateOrder(ctx, located, { labResults, resultComment: comment, status: 'COMPLETED', completedAt: stamp, performedBy: ctx.actor.id, performedByName: ctx.actor.fullName },
    { push: { id: order.id, name: order.name, result: resultText(next) } });
  audit(ctx, 'ROOM_RESULT', appointment);
  return { ready: done.ready };
}
export function saveImagingResult(actorId, key, input) {
  const ctx = context(actorId); const located = locate(ctx, key); const { order, appointment } = located;
  need(located, order.serviceType === 'IMAGING' && order.status === 'IN_PROGRESS' && stage(located), 'Bấm "Bắt đầu chụp / siêu âm" trước khi nhập kết quả.');
  if (input.expectedVersion !== undefined && input.expectedVersion !== appointment.version) throw examError('Lượt khám vừa thay đổi. Tải lại để đối chiếu.', {}, 409);
  const errors = validateImaging(input); if (Object.keys(errors).length) throw examError('Kiểm tra kết quả chẩn đoán hình ảnh.', errors);
  const imaging = { description: input.description.trim(), conclusion: input.conclusion.trim(), images: input.images.map(({ id, name, type, size, dataUrl }) => ({ id, name, type, size, dataUrl: dataUrl || '' })) };
  const stamp = new Date().toISOString(); const next = { ...order, imaging };
  const done = updateOrder(ctx, located, { imaging, status: 'COMPLETED', completedAt: stamp, performedBy: ctx.actor.id, performedByName: ctx.actor.fullName }, { push: { id: order.id, name: order.name, result: resultText(next) } });
  audit(ctx, 'ROOM_RESULT', appointment);
  return { ready: done.ready };
}
// Hủy dịch vụ cận lâm sàng kèm lý do (chủ nuôi từ chối, thú cưng quá hung dữ…): không tính tiền; nếu là dịch vụ cuối thì Visit tự sang RESULTS_READY.
export function cancelRoomService(actorId, key, reason) {
  const ctx = context(actorId); const located = locate(ctx, key); const { order, appointment } = located;
  need(located, stage(located) && OPEN_ORDER_STATUSES.includes(order.status), 'Chỉ hủy dịch vụ đang chờ hoặc đang thực hiện.');
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (!text || text.length > 500) throw examError('Nhập lý do hủy dịch vụ (tối đa 500 ký tự).', { reason: 'Nhập lý do hủy dịch vụ.' });
  const done = updateOrder(ctx, located, { status: 'CANCELLED', cancelReason: text, cancelledAt: new Date().toISOString(), cancelledBy: ctx.actor.id });
  audit(ctx, 'ROOM_QUEUE', appointment);
  return { ready: done.ready };
}
