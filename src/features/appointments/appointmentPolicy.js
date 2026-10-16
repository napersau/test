import { calendarDate, clinicToday, validDate } from '../catalog/catalogPolicy';

export const APPOINTMENT_STATUSES = {
  PENDING: { label: 'Chờ xác nhận', tone: 'amber' }, CONFIRMED: { label: 'Đã xác nhận', tone: 'blue' },
  CHECKED_IN: { label: 'Đã đến phòng khám', tone: 'blue' }, IN_PROGRESS: { label: 'Đang khám', tone: 'blue' },
  WAITING_RESULTS: { label: 'Chờ kết quả cận lâm sàng', tone: 'amber' }, RESULTS_READY: { label: 'Đã có kết quả, chờ bác sĩ', tone: 'green' }, WAITING_PAYMENT: { label: 'Chờ thanh toán', tone: 'blue' },
  COMPLETED: { label: 'Đã hoàn tất', tone: 'green' }, CANCELLED: { label: 'Đã hủy', tone: 'gray' }, NO_SHOW: { label: 'Không đến khám', tone: 'gray' },
};
// 14 khung tiếp nhận 30 phút: sáng 08:00–12:00 (7 khung), nghỉ trưa 12:00–13:30, chiều 13:30–17:00 (7 khung).
export const REQUEST_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
export const MAX_BOOKING_DAYS = 30;
// Khách chỉ được tự đổi / hủy lịch khi còn ít nhất 2 giờ tới giờ hẹn.
export const SELF_SERVICE_MIN_HOURS = 2;
export const BOOKING_STEPS = ['Chọn thú cưng', 'Nhu cầu khám', 'Ngày & khung giờ', 'Kiểm tra & gửi'];
export const EMPTY_BOOKING = { petId: '', serviceId: '', reason: '', date: '', time: '' };
export const CANCEL_REASONS = ['Bận việc đột xuất', 'Thú cưng đã khỏe hơn', 'Đổi sang cơ sở khác', 'Lý do khác'];
export const slotLabel = (time) => {
  const [hour, minute] = time.split(':').map(Number);
  const end = hour * 60 + minute + 30;
  return `${time} - ${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
};
// Lịch còn chiếm chỗ trong khung giờ: mọi trạng thái trừ đã hủy và khách không đến.
export const occupiesSlot = (record) => !['CANCELLED', 'NO_SHOW'].includes(record.status);
// Sức chứa mỗi khung = số bác sĩ đang hoạt động. Trả về trạng thái của 14 khung trong ngày.
export function buildSlots(records, capacity, date, now = new Date(), excludeId = '', leadMinutes = 30) {
  return REQUEST_TIMES.map((time) => {
    const booked = records.filter((record) => record.id !== excludeId && occupiesSlot(record) && record.startsAt === requestTimestamp(date, time)).length;
    const remaining = Math.max(0, capacity - booked);
    return { time, label: slotLabel(time), booked, capacity, remaining, past: !isFutureRequest(date, time, now, leadMinutes), full: remaining === 0 };
  });
}
export const APPOINTMENTS_KEY = 'pawcare_appointments_v1';
export const APPOINTMENTS_CHANGED = 'pawcare:appointments-changed';
export const MEDICAL_RECORDS_KEY = 'pawcare_medical_records_v1';
export const MEDICAL_RECORDS_CHANGED = 'pawcare:medical-records-changed';
export const bookingDraftKey = (ownerId) => `pawcare_booking_draft_v1:${ownerId}`;
export const clinicDateOffset = (days, now = new Date()) => new Date(Date.parse(`${clinicToday(now)}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const requestTimestamp = (date, time) => `${date}T${time}:00+07:00`;
// Khách đặt online phải cách giờ hẹn hơn 30 phút; lễ tân đặt hộ / tại quầy (leadMinutes = 0) chỉ cần khung chưa bắt đầu.
export const isFutureRequest = (date, time, now = new Date(), leadMinutes = 30) => validDate(date) && REQUEST_TIMES.includes(time) && Date.parse(requestTimestamp(date, time)) > now.getTime() + leadMinutes * 60000;
export function validateBooking(values, now = new Date(), leadMinutes = 30) {
  const errors = {};
  if (typeof values.petId !== 'string' || !values.petId) errors.petId = 'Chọn thú cưng cần khám.';
  if (typeof values.serviceId !== 'string' || !values.serviceId) errors.serviceId = 'Chọn nhu cầu khám.';
  if (typeof values.reason !== 'string' || !values.reason.trim() || values.reason.trim().length > 1000) errors.reason = 'Nhập lý do khám từ 1 đến 1.000 ký tự.';
  if (!validDate(values.date) || values.date < clinicToday(now) || values.date > clinicDateOffset(MAX_BOOKING_DAYS, now)) errors.date = `Chọn ngày từ hôm nay đến ${MAX_BOOKING_DAYS} ngày tới.`;
  if (!REQUEST_TIMES.includes(values.time)) errors.time = 'Chọn khung giờ tiếp nhận.';
  else if (!errors.date && !isFutureRequest(values.date, values.time, now, leadMinutes)) errors.time = leadMinutes ? `Chọn giờ cách hiện tại hơn ${leadMinutes} phút.` : 'Khung giờ này đã bắt đầu hoặc đã qua. Chọn khung giờ khác.';
  return errors;
}
export const hoursUntil = (appointment, now = new Date()) => (Date.parse(appointment.startsAt) - now.getTime()) / 3600000;
// Đổi / hủy chỉ áp dụng cho lịch chờ xác nhận hoặc đã xác nhận, và còn ít nhất 2 giờ tới giờ hẹn.
export const canChangeAppointment = (appointment, now = new Date()) => ['PENDING', 'CONFIRMED'].includes(appointment.status) && hoursUntil(appointment, now) >= SELF_SERVICE_MIN_HOURS;
export const canCancelAppointment = canChangeAppointment;
export const canRescheduleAppointment = canChangeAppointment;
export const TOO_LATE_MESSAGE = 'Đã quá thời gian cho phép tự đổi/hủy lịch trên hệ thống (tối thiểu 2 tiếng trước giờ hẹn). Vui lòng liên hệ trực tiếp hotline phòng khám để được hỗ trợ.';
export const appointmentDateTime = (iso) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
export const appointmentDay = (iso) => calendarDate(clinicToday(new Date(iso)));
