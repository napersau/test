import { APPOINTMENT_STATUSES, APPOINTMENTS_CHANGED, APPOINTMENTS_KEY } from './appointmentPolicy';

// Shared persistence only; each public repository must authorize its actor before using this adapter.
export function readAppointments() {
  const saved = localStorage.getItem(APPOINTMENTS_KEY);
  if (saved === null) return [];
  let records;
  try { records = JSON.parse(saved); } catch { throw new Error('Dữ liệu lịch hẹn không hợp lệ. Không tự động ghi đè dữ liệu đã lưu.'); }
  if (!Array.isArray(records) || records.some((record) => !record || ['id', 'ownerId', 'petId', 'code', 'petName', 'serviceId', 'serviceName', 'reason'].some((key) => typeof record[key] !== 'string')
    || !Object.keys(APPOINTMENT_STATUSES).includes(record.status) || !Number.isFinite(Date.parse(record.startsAt)) || !Number.isFinite(Date.parse(record.createdAt))
    || !Number.isInteger(record.version) || record.version < 1) || new Set(records.map((record) => record.id)).size !== records.length) throw new Error('Dữ liệu lịch hẹn không hợp lệ. Vui lòng kiểm tra bộ nhớ trình duyệt.');
  return records;
}

export function commitAppointments(records) {
  try { localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(records)); }
  catch { throw new Error('Không lưu được lịch hẹn. Kiểm tra dung lượng bộ nhớ trình duyệt và thử lại.'); }
  window.dispatchEvent(new Event(APPOINTMENTS_CHANGED));
}
