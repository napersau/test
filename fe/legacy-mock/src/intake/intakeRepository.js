import { requireReceptionist, listReceptionDoctors, assertReceptionContactUnique } from '../users/usersRepository';
import { listReceptionCustomers, saveReceptionCustomer } from '../reception/customersRepository';
import { validateCustomer, EMPTY_CUSTOMER } from '../reception/customerProfileStorage';
import { listReceptionPets, saveReceptionPet } from '../pets/petsRepository';
import { EMPTY_PET, validatePet } from '../pets/petPolicy';
import { listReceptionExamServices } from '../services/servicesRepository';
import { readAppointments, commitAppointments } from '../appointments/appointmentStorage';
import { assertSlotFree, nextAppointmentCode } from '../appointments/appointmentsRepository';
import { recordActivity } from '../activity/auditStorage';
import { notifyCustomerEvent } from '../notifications/notificationWriter';
import { clinicToday } from '../catalog/catalogPolicy';
import { OPEN_VISIT_STATUSES } from '../examinations/examinationPolicy';
import { validateBooking, requestTimestamp } from '../appointments/appointmentPolicy';
import {
  ROOMS_KEY, INTAKE_PRIORITIES, INTAKE_SOURCES, BOOKING_CHANNELS, EMPTY_INTAKE, EMPTY_NEW_CUSTOMER, EMPTY_NEW_PET, NO_SHOW_AFTER_MINUTES,
  intakeError, validateIntake, canCheckIn, parseVital, getDoctorStatus,
} from './intakePolicy';

function readRooms() {
  const saved = localStorage.getItem(ROOMS_KEY);
  // Dữ liệu phòng cũ (demo); phòng khám thực tế gắn cố định với bác sĩ qua users.roomNumber.
  if (saved === null) return [{ id: 'room-demo-1', name: 'Phòng khám 01 (demo)', status: 'ACTIVE' }, { id: 'room-demo-2', name: 'Phòng khám 02 (demo)', status: 'ACTIVE' }];
  let records;
  try { records = JSON.parse(saved); } catch { throw new Error('Dữ liệu phòng khám không hợp lệ.'); }
  if (!Array.isArray(records) || records.some((item) => !item || typeof item.id !== 'string' || !item.id || typeof item.name !== 'string' || !item.name.trim() || !['ACTIVE', 'MAINTENANCE', 'INACTIVE'].includes(item.status))
    || new Set(records.map((item) => item.id)).size !== records.length) throw new Error('Dữ liệu phòng khám không hợp lệ.');
  return records.filter((item) => item.status === 'ACTIVE').map(({ id, name, status }) => ({ id, name, status }));
}

export function getIntakeOptions(actorId) {
  requireReceptionist(actorId);
  return { customers: listReceptionCustomers(actorId), pets: listReceptionPets(actorId), doctors: listReceptionDoctors(actorId), services: listReceptionExamServices(actorId), rooms: readRooms() };
}

const STRING_KEYS = ['id', 'code', 'ownerId', 'petId', 'petName', 'serviceId', 'serviceName', 'reason', 'startsAt', 'status', 'source', 'createdAt', 'updatedAt', 'preferredDoctorId', 'preferredDoctorName',
  'assignedDoctorId', 'assignedDoctorName', 'roomId', 'roomName', 'checkedInAt', 'confirmedAt', 'startedAt', 'cancellationReason', 'cancelledBy', 'cancelledAt', 'intakeNote', 'confirmAdvice', 'contactNote', 'lateNote', 'postponedAt', 'assignedAt', 'rescheduleReason', 'resultsReadyAt', 'sentToRoomsAt'];
const NUMBER_KEYS = ['version', 'contactAttempts', 'weightKg', 'temperatureC'];
export function listIntakeAppointments(actorId) {
  requireReceptionist(actorId);
  return readAppointments().map((record) => {
    if (record.callbackPostponed !== undefined && typeof record.callbackPostponed !== 'boolean') throw new Error('Thông tin tiếp nhận trong lịch hẹn không hợp lệ.');
    if (STRING_KEYS.some((key) => record[key] !== undefined && typeof record[key] !== 'string') || NUMBER_KEYS.some((key) => record[key] !== undefined && !Number.isFinite(record[key]))
      || (record.priority !== undefined && !Object.keys(INTAKE_PRIORITIES).includes(record.priority))
      || (record.source !== undefined && !Object.keys(INTAKE_SOURCES).includes(record.source))
      || (record.checkedInAt && !Number.isFinite(Date.parse(record.checkedInAt)))) throw new Error('Thông tin tiếp nhận trong lịch hẹn không hợp lệ.');
    if (record.status === 'CHECKED_IN' && !Number.isFinite(Date.parse(record.checkedInAt))) throw new Error('Lịch đã tiếp nhận thiếu thời gian check-in. Kiểm tra hồ sơ lịch hẹn.');
    return { ...Object.fromEntries(STRING_KEYS.map((key) => [key, record[key] ?? ''])), version: record.version, contactAttempts: record.contactAttempts ?? 0,
      weightKg: record.weightKg ?? '', temperatureC: record.temperatureC ?? '', callbackPostponed: record.callbackPostponed === true, priority: record.priority || 'NORMAL' };
  });
}

function validateReferences(options, ownerId, petId, serviceId) {
  const owner = options.customers.find((item) => item.id === ownerId);
  const pet = options.pets.find((item) => item.id === petId && item.ownerId === ownerId);
  const service = options.services.find((item) => item.id === serviceId);
  const errors = {};
  if (!owner) errors.ownerId = 'Không tìm thấy hồ sơ khách hàng.';
  if (!pet || pet.status !== 'ACTIVE') errors.petId = 'Chọn thú cưng đang quản lý của đúng khách hàng.';
  if (!service) errors.serviceId = 'Loại khám không còn hoạt động.';
  if (Object.keys(errors).length) throw intakeError('Thông tin tiếp nhận đã thay đổi. Vui lòng kiểm tra lại.', errors);
  return { owner, pet, service };
}

// Khách mới tạo nhanh khi lễ tân đặt lịch qua điện thoại hoặc tiếp nhận vãng lai / cấp cứu: họ tên, SĐT, địa chỉ + tên thú cưng, loài.
function resolveSubjects(actorId, values) {
  if (!values.newCustomer && !values.newPet) return values;
  const errors = {};
  let ownerId = values.ownerId;
  if (values.newCustomer) {
    const contact = { ...EMPTY_CUSTOMER, ...EMPTY_NEW_CUSTOMER, ...values.newCustomer };
    Object.entries(validateCustomer(contact)).forEach(([key, message]) => { errors[`newCustomer.${key}`] = message; });
    if (!Object.keys(errors).length) {
      try { assertReceptionContactUnique(actorId, contact); } catch (problem) { Object.entries(problem.fieldErrors || {}).forEach(([key, message]) => { errors[`newCustomer.${key}`] = message; }); }
    }
  }
  const pet = { ...EMPTY_PET, ...EMPTY_NEW_PET, ...values.newPet };
  Object.entries(validatePet(pet)).forEach(([key, message]) => { errors[`newPet.${key}`] = message; });
  if (Object.keys(errors).length) throw intakeError('Vui lòng kiểm tra thông tin khách hàng và thú cưng mới.', errors);
  if (values.newCustomer) ownerId = saveReceptionCustomer(actorId, { ...EMPTY_CUSTOMER, ...EMPTY_NEW_CUSTOMER, ...values.newCustomer }).id;
  const petId = saveReceptionPet(actorId, ownerId, pet).id;
  return { ...values, ownerId, petId };
}

const activeSeat = (item) => OPEN_VISIT_STATUSES.includes(item.status);

// PENDING → CONFIRMED. Lễ tân đã gọi xác nhận khách và dặn dò; chưa phân công bác sĩ.
export function confirmIntakeAppointment(actorId, id, input = {}) {
  const actor = requireReceptionist(actorId); const records = readAppointments();
  const current = records.find((item) => item.id === id);
  if (!current) throw intakeError('Không tìm thấy lịch hẹn.', {}, 404);
  if (input.expectedVersion !== current.version) throw intakeError('Lịch hẹn vừa thay đổi. Đóng form rồi mở lại để xác nhận.', {}, 409);
  const now = new Date();
  if (current.status !== 'PENDING' || Date.parse(current.startsAt) < now.getTime()) throw intakeError('Chỉ xác nhận yêu cầu đang chờ và chưa qua giờ hẹn.');
  const advice = typeof input.advice === 'string' ? input.advice.trim() : '';
  if (advice.length > 300) throw intakeError('Lời dặn không được quá 300 ký tự.', { advice: 'Tối đa 300 ký tự.' });
  const stamp = now.toISOString();
  const updated = { ...current, status: 'CONFIRMED', confirmedAt: stamp, confirmedBy: actor.id, confirmAdvice: advice, updatedAt: stamp, version: current.version + 1 };
  commitAppointments(records.map((item) => (item.id === id ? updated : item)));
  recordActivity({ actor, module: 'APPOINTMENTS', action: 'APPOINTMENT_CONFIRM', targetId: id, targetName: current.code });
  notifyCustomerEvent('APPOINTMENT', id, `confirmed-${updated.version}`, 'Lịch hẹn đã được xác nhận', `Lịch ${current.code} đã được phòng khám xác nhận.${advice ? ` Lưu ý: ${advice}` : ''}`);
  return updated;
}

// Gọi điện không liên lạc được: giữ nguyên PENDING (vẫn chiếm chỗ), ghi chú lần liên hệ.
export function logContactFailure(actorId, id, note, expectedVersion) {
  const actor = requireReceptionist(actorId); const records = readAppointments();
  const current = records.find((item) => item.id === id);
  if (!current) throw intakeError('Không tìm thấy lịch hẹn.', {}, 404);
  if (expectedVersion !== current.version) throw intakeError('Lịch hẹn vừa thay đổi. Đóng hộp thoại rồi mở lại.', {}, 409);
  if (current.status !== 'PENDING') throw intakeError('Chỉ ghi chú liên hệ cho yêu cầu đang chờ xác nhận.');
  const text = typeof note === 'string' ? note.trim() : '';
  if (!text || text.length > 300) throw intakeError('Nhập ghi chú từ 1 đến 300 ký tự.', { note: 'Nhập ghi chú liên hệ.' });
  const stamp = new Date().toISOString();
  const updated = { ...current, contactAttempts: (current.contactAttempts || 0) + 1, contactNote: text, contactAttemptedAt: stamp, updatedAt: stamp, version: current.version + 1 };
  commitAppointments(records.map((item) => (item.id === id ? updated : item)));
  recordActivity({ actor, module: 'APPOINTMENTS', action: 'APPOINTMENT_CONTACT_NOTE', targetId: id, targetName: current.code });
  return updated;
}

// Khách báo đến muộn: giữ lịch CONFIRMED, ghi chú (ví dụ "Khách đến muộn 15p").
export function noteLateArrival(actorId, id, note, expectedVersion) {
  const actor = requireReceptionist(actorId); const records = readAppointments();
  const current = records.find((item) => item.id === id);
  if (!current) throw intakeError('Không tìm thấy lịch hẹn.', {}, 404);
  if (expectedVersion !== current.version) throw intakeError('Lịch hẹn vừa thay đổi. Đóng hộp thoại rồi mở lại.', {}, 409);
  if (current.status !== 'CONFIRMED') throw intakeError('Chỉ ghi chú đến muộn cho lịch đã xác nhận.');
  const text = typeof note === 'string' ? note.trim() : '';
  if (!text || text.length > 300) throw intakeError('Nhập ghi chú từ 1 đến 300 ký tự.', { note: 'Nhập ghi chú, ví dụ "Khách đến muộn 15p".' });
  const updated = { ...current, lateNote: text, updatedAt: new Date().toISOString(), version: current.version + 1 };
  commitAppointments(records.map((item) => (item.id === id ? updated : item)));
  recordActivity({ actor, module: 'APPOINTMENTS', action: 'APPOINTMENT_CONTACT_NOTE', targetId: id, targetName: current.code });
  return updated;
}

const vitalsOf = (values) => ({ weightKg: parseVital(values.weightKg), temperatureC: parseVital(values.temperatureC) });

// CONFIRMED (hôm nay) → CHECKED_IN: ghi sinh hiệu, vào hàng đợi chung chờ lễ tân phân công bác sĩ.
export function checkInAppointment(actorId, id, input) {
  const actor = requireReceptionist(actorId); const records = readAppointments();
  const current = records.find((item) => item.id === id);
  if (!current) throw intakeError('Không tìm thấy lịch hẹn.', {}, 404);
  if (input.expectedVersion !== current.version) throw intakeError('Lịch hẹn vừa thay đổi. Đóng form rồi mở lại để tiếp nhận.', {}, 409);
  const now = new Date();
  if (!canCheckIn(current, now)) throw intakeError('Chỉ tiếp nhận lịch đã xác nhận có ngày khám hôm nay.');
  const values = { ...EMPTY_INTAKE, ...input };
  const errors = validateIntake(values, 'SCHEDULED');
  if (Object.keys(errors).length) throw intakeError('Vui lòng kiểm tra thông tin tiếp nhận.', errors);
  const { pet } = validateReferences(getIntakeOptions(actorId), current.ownerId, current.petId, current.serviceId);
  if (records.some((item) => item.id !== id && item.petId === pet.id && activeSeat(item))) throw intakeError('Bé đã có lượt đang chờ hoặc đang khám. Không tiếp nhận trùng.', { petId: 'Kiểm tra lượt khám hiện có.' }, 409);
  const stamp = now.toISOString(); const symptoms = values.reason.trim();
  const updated = { ...current, status: 'CHECKED_IN', checkedInAt: stamp, checkedInBy: actor.id, ...vitalsOf(values), priority: values.priority, intakeNote: values.intakeNote.trim(),
    ...(symptoms ? { reason: symptoms } : {}), assignedDoctorId: '', assignedDoctorName: '', roomId: '', roomName: '', postponedAt: '', updatedAt: stamp, version: current.version + 1 };
  commitAppointments(records.map((item) => (item.id === id ? updated : item)));
  recordActivity({ actor, module: 'APPOINTMENTS', action: 'APPOINTMENT_CHECK_IN', targetId: id, targetName: current.code });
  notifyCustomerEvent('APPOINTMENT', id, `checked-in-${updated.version}`, 'Đã tiếp nhận tại phòng khám', `Bé ${current.petName} đã vào hàng đợi chờ khám. Lễ tân sẽ mời vào phòng khi đến lượt.`);
  return updated;
}

// Khách vãng lai hoặc cấp cứu (input.priority = 'PRIORITY'): tạo lượt khám WAITING không gắn lịch hẹn.
export function createWalkIn(actorId, input) {
  const actor = requireReceptionist(actorId); const emergency = input.emergency === true || input.priority === 'PRIORITY';
  const values = { ...EMPTY_INTAKE, ...input, priority: emergency ? 'PRIORITY' : 'NORMAL' };
  const errors = validateIntake({ ...values, ownerId: values.ownerId || (values.newCustomer ? 'new' : ''), petId: values.petId || (values.newPet ? 'new' : '') }, emergency ? 'EMERGENCY' : 'WALK_IN');
  if (Object.keys(errors).length) throw intakeError('Vui lòng kiểm tra thông tin tiếp nhận.', errors);
  const resolved = resolveSubjects(actorId, values);
  const { owner, pet, service } = validateReferences(getIntakeOptions(actorId), resolved.ownerId, resolved.petId, resolved.serviceId);
  const records = readAppointments();
  if (records.some((item) => item.petId === pet.id && activeSeat(item))) throw intakeError('Bé đã được tiếp nhận hoặc đang khám. Không tạo thêm lượt tiếp nhận.', { petId: 'Kiểm tra lượt khám hiện có của bé.' }, 409);
  // Khách vãng lai không được vòng qua luồng check-in của lịch hẹn hôm nay; ca cấp cứu thì luôn được nhận.
  if (!emergency && records.some((item) => item.petId === pet.id && ['PENDING', 'CONFIRMED'].includes(item.status) && clinicToday(new Date(item.startsAt)) === clinicToday())) throw intakeError('Bé đã có yêu cầu hoặc lịch hẹn hôm nay. Tra cứu và xử lý lịch hiện có.', { petId: 'Dùng lượt hẹn hiện có thay vì tạo trùng.' }, 409);
  // Ca cấp cứu có thể điều phối ngay cho bác sĩ đang sẵn sàng ngay khi tiếp nhận.
  const assignedNow = values.assignedDoctorId ? { ...doctorAssignment(actorId, records, values.assignedDoctorId), assignedAt: new Date().toISOString(), assignedBy: actor.id } : {};
  const now = new Date().toISOString();
  const id = window.crypto?.randomUUID?.() || `walkin-apt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const record = { id, code: nextAppointmentCode(records, clinicToday()), ownerId: owner.id, petId: pet.id, petName: pet.name,
    serviceId: service.id, serviceName: service.name, estimatedPrice: service.price, reason: values.reason.trim(), startsAt: now,
    ...vitalsOf(values), priority: values.priority, intakeNote: values.intakeNote.trim(), assignedDoctorId: '', assignedDoctorName: '', roomId: '', roomName: '', ...assignedNow,
    source: emergency ? 'EMERGENCY' : 'WALK_IN', status: 'CHECKED_IN', checkedInAt: now, checkedInBy: actor.id,
    preferredDoctorId: '', preferredDoctorName: '', cancellationReason: '', createdAt: now, updatedAt: now, version: 1 };
  commitAppointments([record, ...records]);
  recordActivity({ actor, module: 'APPOINTMENTS', action: 'APPOINTMENT_WALK_IN', targetId: id, targetName: record.code });
  notifyCustomerEvent('APPOINTMENT', id, 'walk-in-1', emergency ? 'Đã tiếp nhận ca cấp cứu' : 'Đã tiếp nhận khách trực tiếp', `Lượt ${record.code} đã vào hàng đợi.`);
  return record;
}

// Lễ tân tạo lịch hộ (điện thoại / tại quầy) → CONFIRMED ngay; hoặc đổi ngày / giờ lịch PENDING / CONFIRMED (giữ trạng thái).
export function saveReceptionAppointment(actorId, input, id) {
  const actor = requireReceptionist(actorId); const records = readAppointments();
  const current = id ? records.find((item) => item.id === id) : null;
  if (id && !current) throw intakeError('Không tìm thấy lịch hẹn.', {}, 404);
  if (current && (input.expectedVersion !== current.version || !['PENDING', 'CONFIRMED'].includes(current.status))) throw intakeError('Lịch đã thay đổi hoặc không còn được chỉnh sửa. Mở lại form.', {}, 409);
  const values = { ...EMPTY_INTAKE, ...input, ...(current ? { ownerId: current.ownerId, petId: current.petId, serviceId: current.serviceId } : {}) };
  const channel = current ? current.source : values.source;
  const errors = validateBooking({ ...values, petId: values.petId || (values.newPet ? 'new' : '') }, new Date(), 0);
  if (!current && !Object.keys(BOOKING_CHANNELS).includes(channel)) errors.source = 'Chọn kênh đặt lịch: qua điện thoại hoặc tại quầy.';
  if (!current && !values.ownerId && !values.newCustomer) errors.ownerId = 'Chọn khách hàng hoặc tạo nhanh khách mới.';
  if (Object.keys(errors).length) throw intakeError('Vui lòng kiểm tra thông tin lịch hẹn.', errors);
  const resolved = resolveSubjects(actorId, values);
  const { owner, pet, service } = validateReferences(getIntakeOptions(actorId), resolved.ownerId, resolved.petId, resolved.serviceId);
  const startsAt = requestTimestamp(values.date, values.time);
  try { assertSlotFree(records, pet, startsAt, values.date, values.time, id); }
  catch (problem) { throw intakeError(problem.message, problem.fieldErrors || {}, 409); }
  const stamp = new Date().toISOString(); const recordId = current?.id || window.crypto?.randomUUID?.() || `staff-apt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const reschedule = !!current && current.startsAt !== startsAt;
  if (reschedule && !(values.rescheduleReason || '').trim()) throw intakeError('Nhập lý do đổi giờ để ghi vào lịch hẹn.', { rescheduleReason: 'Nhập lý do đổi giờ.' });
  const updated = { ...current, id: recordId, code: current?.code || nextAppointmentCode(records, values.date),
    ownerId: owner.id, petId: pet.id, petName: pet.name, serviceId: service.id, serviceName: current?.serviceName || service.name, estimatedPrice: current?.estimatedPrice ?? service.price,
    reason: values.reason.trim(), startsAt, source: channel, status: current?.status || 'CONFIRMED', priority: 'NORMAL', intakeNote: current?.intakeNote || '',
    preferredDoctorId: '', preferredDoctorName: '', cancellationReason: '',
    ...(current ? (reschedule ? { previousStartsAt: current.startsAt, rescheduledAt: stamp, rescheduleReason: (values.rescheduleReason || '').trim() } : {}) : { confirmedAt: stamp, confirmedBy: actor.id }),
    createdAt: current?.createdAt || stamp, updatedAt: stamp, version: (current?.version || 0) + 1 };
  commitAppointments(current ? records.map((item) => (item.id === id ? updated : item)) : [updated, ...records]);
  recordActivity({ actor, module: 'APPOINTMENTS', action: current ? 'APPOINTMENT_RESCHEDULE' : 'APPOINTMENT_STAFF_CREATE', targetId: recordId, targetName: updated.code });
  notifyCustomerEvent('APPOINTMENT', recordId, `scheduled-${updated.version}`, current ? 'Lịch hẹn đã đổi giờ' : 'Phòng khám đã tạo lịch hẹn cho bé', `Lịch ${updated.code} đã cập nhật; kiểm tra ngày giờ mới trong danh sách.`);
  return updated;
}

// Hủy lịch / từ chối yêu cầu online (CANCELLED) hoặc ghi nhận khách không đến (NO_SHOW, sau giờ hẹn 30 phút). Bắt buộc lý do.
export function closeReceptionAppointment(actorId, id, status, reason, expectedVersion) {
  const actor = requireReceptionist(actorId); const records = readAppointments(); const current = records.find((item) => item.id === id);
  if (!current) throw intakeError('Không tìm thấy lịch hẹn.', {}, 404);
  if (expectedVersion !== current.version) throw intakeError('Lịch hẹn vừa thay đổi. Đóng hộp thoại rồi mở lại.', {}, 409);
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) throw intakeError('Nhập lý do từ 1 đến 500 ký tự.', { reason: 'Vui lòng nhập lý do.' });
  const cancelling = status === 'CANCELLED' && ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(current.status);
  const noShow = status === 'NO_SHOW' && current.status === 'CONFIRMED' && Date.now() >= Date.parse(current.startsAt) + NO_SHOW_AFTER_MINUTES * 60000;
  if (!cancelling && !noShow) throw intakeError('Thao tác không hợp lệ với trạng thái hoặc thời gian hiện tại.');
  const stamp = new Date().toISOString(); const rejected = cancelling && current.status === 'PENDING';
  const updated = { ...current, status, cancellationReason: reason.trim(), updatedAt: stamp, version: current.version + 1, closedBy: actor.id,
    ...(cancelling ? { cancelledBy: 'RECEPTION', cancelledAt: stamp } : {}) };
  commitAppointments(records.map((item) => (item.id === id ? updated : item)));
  recordActivity({ actor, module: 'APPOINTMENTS', action: cancelling ? 'APPOINTMENT_CANCEL' : 'APPOINTMENT_NO_SHOW', targetId: id, targetName: current.code });
  if (cancelling) notifyCustomerEvent('APPOINTMENT', id, `${updated.status.toLowerCase()}-${updated.version}`, rejected ? 'Phòng khám đã từ chối lịch hẹn' : 'Phòng khám đã hủy lịch', `Lịch ${current.code}: ${reason.trim()}`);
  else notifyCustomerEvent('APPOINTMENT', id, `${updated.status.toLowerCase()}-${updated.version}`, 'Lịch hẹn được ghi nhận không đến', `Kiểm tra trạng thái lịch ${current.code} trong danh sách.`);
  return updated;
}

// Kiểm tra và tính các trường phân công: bác sĩ hoạt động, có phòng cố định và đang sẵn sàng (kiểm tra lại ngay lúc bấm).
function doctorAssignment(actorId, records, doctorId, excludeId = '') {
  const doctor = listReceptionDoctors(actorId).find((item) => item.id === doctorId);
  if (!doctor) throw intakeError('Bác sĩ không còn hoạt động. Chọn lại bác sĩ.', { doctorId: 'Chọn bác sĩ đang hoạt động.' });
  if (!doctor.roomNumber) throw intakeError('Bác sĩ chưa được gán phòng khám cố định. Liên hệ Admin để gán phòng.', { doctorId: 'Bác sĩ chưa có phòng khám cố định.' });
  const status = getDoctorStatus(doctorId, records.filter((item) => item.id !== excludeId));
  if (status.key === 'AVAILABLE_PRIORITY_CALLBACK') throw intakeError(`Bác sĩ đang ưu tiên đón ca tái khám: ${status.record.petName}. Vui lòng chọn bác sĩ khác.`, { doctorId: 'Bác sĩ đang ưu tiên ca tái khám.' }, 409);
  if (status.key !== 'AVAILABLE') throw intakeError('Bác sĩ đã nhận ca khám khác, vui lòng chọn bác sĩ khác.', { doctorId: 'Bác sĩ không còn sẵn sàng.' }, 409);
  return { assignedDoctorId: doctor.id, assignedDoctorName: doctor.fullName, roomId: doctor.roomNumber, roomName: `Phòng ${doctor.roomNumber}` };
}

// Lễ tân phân công ca đang chờ cho một bác sĩ rảnh; bệnh nhân vào đúng phòng cố định của bác sĩ. Đổi bác sĩ được khi chưa bắt đầu khám.
export function assignDoctor(actorId, id, doctorId, expectedVersion) {
  const actor = requireReceptionist(actorId); const records = readAppointments();
  const current = records.find((item) => item.id === id);
  if (!current) throw intakeError('Không tìm thấy lượt tiếp nhận.', {}, 404);
  if (expectedVersion !== current.version) throw intakeError('Lượt tiếp nhận vừa thay đổi. Đóng hộp thoại rồi mở lại.', {}, 409);
  if (current.status !== 'CHECKED_IN') throw intakeError('Chỉ phân công ca đang chờ khám, chưa bắt đầu.');
  if (current.assignedDoctorId === doctorId) throw intakeError('Ca này đã được phân công cho bác sĩ đó.', { doctorId: 'Chọn bác sĩ khác để đổi.' });
  const stamp = new Date().toISOString();
  const updated = { ...current, ...doctorAssignment(actorId, records, doctorId, id), assignedAt: stamp, assignedBy: actor.id, postponedAt: '', updatedAt: stamp, version: current.version + 1 };
  commitAppointments(records.map((item) => (item.id === id ? updated : item)));
  recordActivity({ actor, module: 'APPOINTMENTS', action: 'APPOINTMENT_ASSIGN', targetId: id, targetName: current.code });
  notifyCustomerEvent('APPOINTMENT', id, `assigned-${updated.version}`, `Mời vào ${updated.roomName}`, `Bé ${current.petName} được mời vào ${updated.roomName} (${updated.assignedDoctorName}).`);
  return updated;
}

// Tạm hoãn: đẩy ca xuống cuối hàng đợi, chờ kích hoạt lại. Ca cấp cứu không được hoãn.
export function setIntakePostponed(actorId, id, postponed, expectedVersion) {
  const actor = requireReceptionist(actorId); const records = readAppointments();
  const current = records.find((item) => item.id === id);
  if (!current) throw intakeError('Không tìm thấy lượt tiếp nhận.', {}, 404);
  if (expectedVersion !== current.version) throw intakeError('Lượt tiếp nhận vừa thay đổi. Làm mới rồi thử lại.', {}, 409);
  if (current.status !== 'CHECKED_IN' || current.assignedDoctorId) throw intakeError('Chỉ tạm hoãn ca đang chờ phân công.');
  if (postponed && (current.priority === 'PRIORITY' || current.source === 'EMERGENCY')) throw intakeError('Không thể tạm hoãn ca cấp cứu.');
  const stamp = new Date().toISOString();
  const updated = { ...current, postponedAt: postponed ? stamp : '', updatedAt: stamp, version: current.version + 1 };
  commitAppointments(records.map((item) => (item.id === id ? updated : item)));
  recordActivity({ actor, module: 'APPOINTMENTS', action: 'APPOINTMENT_POSTPONE', targetId: id, targetName: current.code });
  return updated;
}
