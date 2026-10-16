import { clinicToday } from '../catalog/catalogPolicy';

// Lượt tiếp nhận hiện được lưu trên bản ghi lịch hẹn: CHECKED_IN không có bác sĩ = đang ở hàng đợi chờ phân công.
export const INTAKE_PRIORITIES = { NORMAL: 'Thông thường', PRIORITY: 'Cấp cứu' };
// Kênh lễ tân được tạo lịch hộ (booking_channel = PHONE | WALK_IN "đặt trước tại quầy").
export const BOOKING_CHANNELS = { PHONE: 'Qua điện thoại', COUNTER: 'Đặt trước tại quầy' };
export const INTAKE_SOURCES = { ONLINE: 'Đặt online', ...BOOKING_CHANNELS, WALK_IN: 'Khách vãng lai', EMERGENCY: 'Cấp cứu' };
export const INTAKE_TABS = { SCHEDULED: 'Có lịch hẹn', WALK_IN: 'Khách vãng lai', EMERGENCY: 'Cấp cứu' };
export const EMPTY_INTAKE = { ownerId: '', petId: '', serviceId: '', reason: '', weightKg: '', temperatureC: '', priority: 'NORMAL', intakeNote: '', assignedDoctorId: '' };
export const EMPTY_NEW_CUSTOMER = { fullName: '', phone: '', address: '' };
export const EMPTY_NEW_PET = { name: '', species: 'DOG', breed: '', gender: 'UNKNOWN' };
export const DEMO_SLOT_MINUTES = 30;
export const ROOMS_KEY = 'pawcare_rooms_v1';
export const ROOMS_CHANGED = 'pawcare:rooms-changed';
// Khách có hẹn quá 30 phút sau giờ hẹn mà chưa đến: cảnh báo để lễ tân gọi điện / đánh dấu vắng mặt.
export const NO_SHOW_AFTER_MINUTES = 30;
// Từ lần vắng mặt thứ 2 trở đi hệ thống cảnh báo khách hay bùng lịch.
export const NO_SHOW_WARNING_COUNT = 2;
export const FASTING_ADVICE = 'Nhịn ăn 6 tiếng trước giờ hẹn nếu cần xét nghiệm máu.';

export const VITAL_LIMITS = {
  weightKg: { min: 0.05, max: 150, label: 'Cân nặng', unit: 'kg' },
  temperatureC: { min: 30, max: 45, label: 'Thân nhiệt', unit: '°C' },
};

export function intakeError(message, fieldErrors = {}, status = 400) {
  const error = new Error(message); error.fieldErrors = fieldErrors; error.status = status; error.code = status === 409 ? 'CONFLICT' : 'INVALID_INTAKE'; return error;
}

export const parseVital = (value) => (typeof value === 'number' ? value : Number(String(value ?? '').trim().replace(',', '.')));

export function validateVitals(values) {
  const errors = {};
  Object.entries(VITAL_LIMITS).forEach(([key, { min, max, label, unit }]) => {
    const raw = values[key]; const number = parseVital(raw);
    if (raw === '' || raw === null || raw === undefined || !Number.isFinite(number)) errors[key] = `Nhập ${label.toLowerCase()} (${unit}).`;
    else if (number < min || number > max) errors[key] = `${label} ${number} ${unit} không hợp lý. Kiểm tra lại số đo (từ ${min} đến ${max} ${unit}).`;
  });
  return errors;
}

// mode: SCHEDULED (check-in lịch hẹn) | WALK_IN | EMERGENCY. Sinh hiệu luôn bắt buộc.
export function validateIntake(values, mode = 'SCHEDULED') {
  const errors = validateVitals(values);
  const walkIn = mode !== 'SCHEDULED';
  if (walkIn) {
    const labels = { ownerId: 'khách hàng', petId: 'thú cưng', serviceId: 'loại khám' };
    Object.entries(labels).forEach(([key, label]) => { if (typeof values[key] !== 'string' || !values[key]) errors[key] = `Chọn ${label}.`; });
  }
  const reason = typeof values.reason === 'string' ? values.reason.trim() : '';
  if ((walkIn && !reason) || reason.length > 1000) errors.reason = 'Nhập triệu chứng / lý do đến khám từ 1 đến 1.000 ký tự.';
  if (!Object.keys(INTAKE_PRIORITIES).includes(values.priority)) errors.priority = 'Chọn mức ưu tiên hợp lệ.';
  if (typeof values.intakeNote !== 'string' || values.intakeNote.length > 500) errors.intakeNote = 'Ghi chú tiếp nhận không được quá 500 ký tự.';
  return errors;
}

export const canCheckIn = (record, now = new Date()) => record.status === 'CONFIRMED' && clinicToday(new Date(record.startsAt)) === clinicToday(now);
export const waitMinutes = (iso, now = new Date()) => Number.isFinite(Date.parse(iso)) ? Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 60000)) : null;
// Lịch CONFIRMED đã quá giờ hẹn 30 phút mà khách chưa check-in.
export const isOverdue = (record, now = new Date()) => record.status === 'CONFIRMED' && now.getTime() >= Date.parse(record.startsAt) + NO_SHOW_AFTER_MINUTES * 60000;
export const countNoShows = (appointments, ownerId) => appointments.filter((item) => item.ownerId === ownerId && item.status === 'NO_SHOW').length;

// ---- Hàng đợi tiếp đón ----
export const QUEUE_KINDS = { EMERGENCY: 'Cấp cứu', SCHEDULED: 'Có hẹn', LATE: 'Đến trễ', WALK_IN: 'Vãng lai' };
// Ca cấp cứu > có hẹn check-in đúng khung giờ > đến trễ / vãng lai (ngang nhau).
export function queueKind(record) {
  if (record.priority === 'PRIORITY' || record.source === 'EMERGENCY') return 'EMERGENCY';
  if (!['ONLINE', ...Object.keys(BOOKING_CHANNELS)].includes(record.source)) return 'WALK_IN';
  return Date.parse(record.checkedInAt) <= Date.parse(record.startsAt) + DEMO_SLOT_MINUTES * 60000 ? 'SCHEDULED' : 'LATE';
}
const RANK = { EMERGENCY: 0, SCHEDULED: 1, LATE: 2, WALK_IN: 2 };
export function sortIntakeQueue(records) {
  return [...records].sort((a, b) => {
    if (!!a.postponedAt !== !!b.postponedAt) return a.postponedAt ? 1 : -1; // ca tạm hoãn nằm cuối hàng
    if (a.postponedAt) return Date.parse(a.postponedAt) - Date.parse(b.postponedAt);
    const kindA = queueKind(a); const kindB = queueKind(b);
    if (RANK[kindA] !== RANK[kindB]) return RANK[kindA] - RANK[kindB];
    if (kindA === 'SCHEDULED' && a.startsAt !== b.startsAt) return Date.parse(a.startsAt) - Date.parse(b.startsAt);
    return Date.parse(a.checkedInAt) - Date.parse(b.checkedInAt);
  });
}
// Hàng đợi chung = đã check-in nhưng chưa phân công bác sĩ.
export const waitingQueue = (appointments) => sortIntakeQueue(appointments.filter((item) => item.status === 'CHECKED_IN' && !item.assignedDoctorId));

// ---- Trạng thái bác sĩ (tính từ các lượt khám, không lưu) ----
export const DOCTOR_STATUSES = {
  AVAILABLE: { label: 'Sẵn sàng nhận ca', tone: 'green' },
  AVAILABLE_PRIORITY_CALLBACK: { label: 'Sẵn sàng · ưu tiên đón ca tái khám', tone: 'amber' },
  ASSIGNED: { label: 'Đã nhận ca, chờ bắt đầu', tone: 'amber' },
  BUSY: { label: 'Đang khám', tone: 'gray' },
};
const AVERAGE_EXAM_MINUTES = 30;
export function getDoctorStatus(doctorId, appointments, now = new Date()) {
  const mine = appointments.filter((item) => item.assignedDoctorId === doctorId);
  const active = mine.find((item) => item.status === 'IN_PROGRESS');
  if (active) {
    const started = Date.parse(active.startedAt);
    const elapsed = Number.isFinite(started) ? Math.max(0, Math.floor((now.getTime() - started) / 60000)) : 0;
    return { key: 'BUSY', record: active, estimatedMinutes: Math.max(5, AVERAGE_EXAM_MINUTES - elapsed) };
  }
  // Priority Lock: có ca đã đủ kết quả cận lâm sàng (chưa hoãn) thì khóa phân công ca mới để bác sĩ ưu tiên gọi ca đó.
  const callback = mine.filter((item) => item.status === 'RESULTS_READY' && !item.callbackPostponed).sort((a, b) => Date.parse(a.resultsReadyAt || 0) - Date.parse(b.resultsReadyAt || 0))[0];
  if (callback) return { key: 'AVAILABLE_PRIORITY_CALLBACK', record: callback, estimatedMinutes: 0 };
  const assigned = mine.find((item) => item.status === 'CHECKED_IN');
  if (assigned) return { key: 'ASSIGNED', record: assigned, estimatedMinutes: AVERAGE_EXAM_MINUTES };
  return { key: 'AVAILABLE', record: null, estimatedMinutes: 0 };
}
