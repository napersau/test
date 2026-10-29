// 9 nhóm dịch vụ theo ServiceCategory của tài liệu (không có nội trú).
export const SERVICE_TYPES = {
  EXAMINATION: 'Khám lâm sàng', VACCINATION: 'Tiêm phòng', DEWORMING: 'Tẩy giun',
  EXTERNAL_PARASITE: 'Trị ký sinh trùng ngoài da', INJECTION_INFUSION: 'Tiêm / Truyền dịch',
  LABORATORY: 'Xét nghiệm', IMAGING: 'Chẩn đoán hình ảnh', SURGERY: 'Phẫu thuật', PROCEDURE: 'Thủ thuật',
};
// Mã nhóm cũ (trước khi chuẩn hóa) còn có thể nằm trong localStorage của các phiên demo trước.
const LEGACY_SERVICE_TYPES = { EXAM: 'EXAMINATION', LAB_TEST: 'LABORATORY', TREATMENT: 'PROCEDURE', CARE: 'PROCEDURE', HOSPITALIZATION: 'PROCEDURE' };
export const normalizeServiceType = (type) => (SERVICE_TYPES[type] ? type : LEGACY_SERVICE_TYPES[type] || type);
export const isServiceType = (type) => Boolean(SERVICE_TYPES[normalizeServiceType(type)]);
export const serviceTypeLabel = (type) => SERVICE_TYPES[normalizeServiceType(type)] || type;
// Xét nghiệm nhập chỉ số; CĐHA nhập mô tả + ảnh. Hai cờ này suy ra từ nhóm, không cho Admin tự chọn.
export const RESULT_SERVICE_TYPES = ['LABORATORY', 'IMAGING'];
export const DOSAGE_FORMS = { TABLET: 'Viên nén', INJECTION: 'Dung dịch tiêm', ORAL_SOLUTION: 'Dung dịch uống', OINTMENT: 'Thuốc mỡ', POWDER: 'Thuốc bột / gói', OTHER: 'Khác' };
export const MEDICINE_CATEGORIES = {
  ANTIBIOTIC: 'Kháng sinh', ANTIPARASITIC: 'Chống ký sinh trùng',
  VACCINE: 'Vaccine', SUPPLEMENT: 'Vitamin & bổ sung', OTHER: 'Khác',
};
export const MEDICINE_UNITS = { TABLET: 'Viên', BOTTLE: 'Chai', VIAL: 'Lọ', AMPOULE: 'Ống', DOSE: 'Liều', TUBE: 'Tuýp', SACHET: 'Gói' };
export const CATALOG_STATUSES = { ACTIVE: 'Đang sử dụng', INACTIVE: 'Ngừng sử dụng' };
export const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
export const normalize = (value) => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

// Date-only values are clinic calendar dates, not UTC timestamps.
export function clinicToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export const daysUntil = (value, today = clinicToday()) => Math.round((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
export const calendarDate = (value) => value.split('-').reverse().join('/');
export function dateOffset(days) {
  return new Date(Date.parse(`${clinicToday()}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
