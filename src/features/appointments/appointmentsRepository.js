import { getPet, listPets, requireCustomer } from '../pets/petsRepository';
import { listBookableServices } from '../services/servicesRepository';
import { findAccount, getBookingCapacity } from '../users/usersRepository';
import { recordActivity } from '../activity/auditStorage';
import { buildSlots, canChangeAppointment, REQUEST_TIMES, requestTimestamp, TOO_LATE_MESSAGE, validateBooking } from './appointmentPolicy';
import { readAppointments, commitAppointments as commit } from './appointmentStorage';
import { notifyCustomerEvent } from '../notifications/notificationWriter';

function fieldError(field, message) { const error = new Error(message); error.fieldErrors = { [field]: message }; throw error; }
export function getBookingOptions(actorId) {
  requireCustomer(actorId);
  return { pets: listPets(actorId).filter((pet) => pet.status === 'ACTIVE'), services: listBookableServices(actorId), capacity: getBookingCapacity() };
}
// Trạng thái 14 khung giờ của một ngày: còn chỗ / đã kín. excludeId bỏ qua chính lịch đang đổi.
// Khách hàng xem khi đặt / đổi lịch; lễ tân xem khi đặt hộ qua điện thoại hoặc tại quầy (không cần đệm 30 phút).
export function getSlotAvailability(actorId, date, excludeId = '') {
  const actor = findAccount(actorId);
  if (actor?.status !== 'ACTIVE' || !['CUSTOMER', 'RECEPTIONIST'].includes(actor.role)) throw new Error('Chỉ khách hàng hoặc lễ tân đang hoạt động được xem khung giờ.');
  const lead = actor.role === 'RECEPTIONIST' ? 0 : 30; const capacity = getBookingCapacity();
  const errors = validateBooking({ petId: 'x', serviceId: 'x', reason: 'x', date, time: REQUEST_TIMES[0] }, new Date(), lead);
  if (errors.date) return { capacity, slots: [], error: errors.date };
  return { capacity, slots: buildSlots(readAppointments(), capacity, date, new Date(), excludeId, lead), error: '' };
}
// Mã lịch hẹn APT-YYYYMMDD-NNN (theo ngày hẹn, số thứ tự trong ngày).
export function nextAppointmentCode(records, date) {
  const prefix = `APT-${date.replaceAll('-', '')}-`;
  const used = new Set(records.map((record) => record.code));
  let number = records.filter((record) => record.code.startsWith(prefix)).length + 1;
  while (used.has(`${prefix}${String(number).padStart(3, '0')}`)) number += 1;
  return `${prefix}${String(number).padStart(3, '0')}`;
}
export function assertSlotFree(records, pet, startsAt, date, time, excludeId) {
  const capacity = getBookingCapacity();
  if (buildSlots(records, capacity, date, new Date(), excludeId).find((slot) => slot.time === time)?.full) fieldError('time', 'Khung giờ này đã kín lịch. Vui lòng chọn khung giờ khác.');
  if (records.some((record) => record.id !== excludeId && record.petId === pet.id && !['CANCELLED', 'NO_SHOW'].includes(record.status) && Math.abs(Date.parse(record.startsAt) - Date.parse(startsAt)) < 30 * 60000)) fieldError('time', 'Bé đã có lịch hẹn trong khung giờ này. Vui lòng chọn giờ khác.');
}
export function listAppointments(actorId) {
  requireCustomer(actorId);
  const ownedPets = new Set(listPets(actorId).map((pet) => pet.id));
  const fields = ['id', 'ownerId', 'petId', 'code', 'petName', 'serviceId', 'serviceName', 'reason', 'startsAt', 'status', 'source', 'estimatedPrice', 'cancellationReason', 'rescheduleReason', 'rescheduledAt', 'createdAt', 'updatedAt', 'version', 'assignedDoctorId', 'assignedDoctorName', 'roomId', 'roomName', 'checkedInAt', 'confirmedAt'];
  return readAppointments().filter((record) => record.ownerId === actorId && ownedPets.has(record.petId)).sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))
    .map((record) => Object.fromEntries(fields.filter((key) => key in record).map((key) => [key, record[key]])));
}
export function createAppointment(actorId, values) {
  const actor = requireCustomer(actorId);
  const errors = validateBooking(values);
  if (Object.keys(errors).length) { const error = new Error('Vui lòng kiểm tra thông tin đặt lịch.'); error.fieldErrors = errors; throw error; }
  const pet = getPet(actorId, values.petId);
  if (pet.status !== 'ACTIVE') fieldError('petId', 'Thú cưng đã lưu trữ. Khôi phục hồ sơ trước khi đặt lịch.');
  const service = listBookableServices(actorId).find((item) => item.id === values.serviceId);
  if (!service) fieldError('serviceId', 'Dịch vụ khám này không còn được sử dụng. Chọn lại dịch vụ.');
  const records = readAppointments();
  const startsAt = requestTimestamp(values.date, values.time);
  assertSlotFree(records, pet, startsAt, values.date, values.time, '');
  const id = window.crypto?.randomUUID?.() || `apt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  const record = { id, code: nextAppointmentCode(records, values.date), ownerId: actorId, petId: pet.id, petName: pet.name,
    serviceId: service.id, serviceName: service.name, estimatedPrice: service.price, reason: values.reason.trim(), startsAt,
    preferredDoctorId: '', preferredDoctorName: '', status: 'PENDING', source: 'ONLINE',
    cancellationReason: '', createdAt: now, updatedAt: now, version: 1 };
  commit([record, ...records]);
  recordActivity({ actor, module: 'APPOINTMENTS', action: 'APPOINTMENT_CREATE', targetId: id, targetName: record.code });
  notifyCustomerEvent('APPOINTMENT', id, `created-${record.version}`, 'Đã gửi yêu cầu đặt lịch', `Yêu cầu ${record.code} đang chờ phòng khám xác nhận.`);
  return record;
}
export function cancelAppointment(actorId, id, reason, expectedVersion) {
  const actor = requireCustomer(actorId);
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) fieldError('cancellationReason', 'Nhập lý do hủy từ 1 đến 500 ký tự.');
  const records = readAppointments();
  const current = records.find((record) => record.id === id && record.ownerId === actorId);
  if (!current) throw new Error('Không tìm thấy lịch hẹn của bạn.');
  getPet(actorId, current.petId);
  if (expectedVersion !== current.version) throw new Error('Lịch hẹn vừa thay đổi. Đóng hộp thoại và kiểm tra lại.');
  if (!['PENDING', 'CONFIRMED'].includes(current.status)) throw new Error('Chỉ hủy lịch chờ xác nhận hoặc đã xác nhận.');
  if (!canChangeAppointment(current)) throw new Error(TOO_LATE_MESSAGE);
  const stamp = new Date().toISOString();
  const updated = { ...current, status: 'CANCELLED', cancellationReason: reason.trim(), cancelledBy: 'CUSTOMER', cancelledAt: stamp, updatedAt: stamp, version: current.version + 1 };
  commit(records.map((record) => record.id === id ? updated : record));
  recordActivity({ actor, module: 'APPOINTMENTS', action: 'APPOINTMENT_CANCEL', targetId: id, targetName: current.code });
  notifyCustomerEvent('APPOINTMENT', id, `cancelled-${updated.version}`, 'Lịch hẹn đã hủy', `Lịch ${current.code} đã hủy. Xem trạng thái trong danh sách lịch hẹn.`);
  return updated;
}
export function rescheduleAppointment(actorId, id, values, expectedVersion) {
  const actor = requireCustomer(actorId);
  const reason = typeof values.reason === 'string' ? values.reason.trim() : '';
  const records = readAppointments();
  const current = records.find((record) => record.id === id && record.ownerId === actorId);
  if (!current) throw new Error('Không tìm thấy lịch hẹn của bạn.');
  const pet = getPet(actorId, current.petId);
  if (expectedVersion !== current.version) throw new Error('Lịch hẹn vừa thay đổi. Đóng hộp thoại và kiểm tra lại.');
  if (!['PENDING', 'CONFIRMED'].includes(current.status)) throw new Error('Chỉ đổi lịch chờ xác nhận hoặc đã xác nhận.');
  if (!canChangeAppointment(current)) throw new Error(TOO_LATE_MESSAGE);
  const errors = Object.fromEntries(Object.entries(validateBooking({ petId: pet.id, serviceId: current.serviceId, reason: current.reason, date: values.date, time: values.time })).filter(([key]) => ['date', 'time'].includes(key)));
  if (!reason || reason.length > 500) errors.rescheduleReason = 'Nhập lý do đổi lịch từ 1 đến 500 ký tự.';
  if (Object.keys(errors).length) { const error = new Error('Vui lòng kiểm tra ngày và khung giờ mới.'); error.fieldErrors = errors; throw error; }
  const startsAt = requestTimestamp(values.date, values.time);
  if (startsAt === current.startsAt) fieldError('time', 'Chọn ngày hoặc khung giờ khác với lịch hiện tại.');
  assertSlotFree(records, pet, startsAt, values.date, values.time, id);
  const now = new Date().toISOString();
  // Giữ nguyên trạng thái (PENDING / CONFIRMED); khung giờ cũ tự được trả chỗ vì sức chứa tính từ danh sách lịch.
  const updated = { ...current, startsAt, rescheduleReason: reason, previousStartsAt: current.startsAt, rescheduledAt: now, updatedAt: now, version: current.version + 1 };
  commit(records.map((record) => (record.id === id ? updated : record)));
  recordActivity({ actor, module: 'APPOINTMENTS', action: 'APPOINTMENT_RESCHEDULE', targetId: id, targetName: current.code });
  notifyCustomerEvent('APPOINTMENT', id, `rescheduled-${updated.version}`, 'Đã đổi lịch hẹn', `Lịch ${current.code} được chuyển sang khung giờ mới.`);
  return updated;
}
