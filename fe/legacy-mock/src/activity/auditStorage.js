// Isolated from account repositories to avoid circular imports. Never pass form/session payloads here.
export const AUDIT_KEY = 'pawcare_audit_v1';
export const AUDIT_CHANGED = 'pawcare:audit-changed';
export const AUDIT_LIMIT = 2000;
export const AUDIT_MODULES = { AUTH: 'Đăng nhập & hồ sơ', USERS: 'Tài khoản', CUSTOMERS: 'Hồ sơ khách hàng', SERVICES: 'Dịch vụ', LAB_CONFIG: 'Xét nghiệm & tham chiếu', MEDICINES: 'Thuốc & kho', PETS: 'Thú cưng', APPOINTMENTS: 'Lịch hẹn', BILLING: 'Hóa đơn & thanh toán', EXAMINATIONS: 'Khám bệnh' };
export const AUDIT_ACTIONS = {
  LOGIN: 'Đăng nhập', LOGOUT: 'Đăng xuất', REGISTER: 'Đăng ký', PROFILE_UPDATE: 'Cập nhật hồ sơ',
  USER_CREATE: 'Tạo tài khoản', USER_UPDATE: 'Cập nhật tài khoản', USER_STATUS: 'Đổi trạng thái tài khoản',
  CUSTOMER_CREATE: 'Thêm hồ sơ khách hàng', CUSTOMER_UPDATE: 'Cập nhật hồ sơ khách hàng',
  SERVICE_CREATE: 'Thêm dịch vụ', SERVICE_UPDATE: 'Cập nhật dịch vụ', SERVICE_STATUS: 'Đổi trạng thái dịch vụ',
  MEDICINE_CREATE: 'Thêm thuốc', MEDICINE_UPDATE: 'Cập nhật thuốc', MEDICINE_STATUS: 'Đổi trạng thái thuốc', BATCH_IMPORT: 'Nhập lô hàng', STOCK_ADJUST: 'Điều chỉnh kho',
  LAB_ITEM_CREATE: 'Thêm chỉ số xét nghiệm', LAB_ITEM_UPDATE: 'Cập nhật chỉ số / khoảng tham chiếu',
  PET_CREATE: 'Thêm thú cưng', PET_UPDATE: 'Cập nhật thú cưng', PET_ARCHIVE: 'Lưu trữ hồ sơ thú cưng', PET_RESTORE: 'Khôi phục hồ sơ thú cưng',
  APPOINTMENT_CREATE: 'Đặt lịch khám', APPOINTMENT_CANCEL: 'Hủy lịch khám',
  APPOINTMENT_CONFIRM: 'Xác nhận lịch khám', APPOINTMENT_CHECK_IN: 'Tiếp nhận lịch hẹn', APPOINTMENT_WALK_IN: 'Tiếp nhận khách trực tiếp',
  APPOINTMENT_STAFF_CREATE: 'Tạo lịch tại quầy', APPOINTMENT_RESCHEDULE: 'Điều chỉnh lịch hẹn', APPOINTMENT_NO_SHOW: 'Ghi nhận không đến',
  APPOINTMENT_CONTACT_NOTE: 'Ghi chú liên hệ lịch hẹn', APPOINTMENT_ASSIGN: 'Phân công bác sĩ', APPOINTMENT_POSTPONE: 'Tạm hoãn / kích hoạt lại hàng đợi',
  INVOICE_ISSUE: 'Lập hóa đơn', INVOICE_DISCOUNT: 'Áp dụng chiết khấu hóa đơn', PAYMENT_RECORD: 'Ghi nhận thanh toán demo', MEDICINE_DISPENSE: 'Xuất thuốc theo đơn',
  EXAMINATION_START: 'Bắt đầu khám', EXAMINATION_SAVE: 'Lưu nháp hồ sơ khám', EXAMINATION_COMPLETE: 'Hoàn tất khám',
  PRESCRIPTION_SAVE: 'Lưu đơn thuốc', SERVICE_ORDER_SAVE: 'Lưu chỉ định dịch vụ',
  VISIT_SEND_ROOMS: 'Gửi chỉ định cận lâm sàng', VISIT_RECALL: 'Mời bệnh nhân vào lại / tạm hoãn', VISIT_CANCEL: 'Hủy lượt khám', VISIT_CLOSE: 'Đóng ca / khách bỏ về', ROOM_RESULT: 'Nhập kết quả cận lâm sàng', ROOM_QUEUE: 'Điều phối hàng đợi phòng chuyên môn',
};
const SAFE_FIELDS = ['fullName', 'role', 'status', 'password', 'code', 'name', 'serviceType', 'price', 'description', 'requiresResult', 'allowsAttachment', 'category', 'unit', 'salePrice', 'minStockLevel', 'roomNumber', 'dosageForm', 'activeIngredient', 'labItemIds'];
let writeWarning = '';
const safeText = (value) => String(value || '').slice(0, 160);

export function readAuditStorage() {
  const saved = localStorage.getItem(AUDIT_KEY);
  if (saved === null) return [];
  let events;
  try { events = JSON.parse(saved); } catch { throw new Error('Nhật ký lưu trữ không hợp lệ.'); }
  if (!Array.isArray(events) || events.some((event) => !event || typeof event.id !== 'string'
    || typeof event.createdAt !== 'string' || !Number.isFinite(Date.parse(event.createdAt))
    || !Object.keys(AUDIT_MODULES).includes(event.module) || !Object.keys(AUDIT_ACTIONS).includes(event.action)
    || typeof event.actorId !== 'string' || typeof event.targetId !== 'string'
    || typeof event.actorName !== 'string' || typeof event.targetName !== 'string' || !Array.isArray(event.fields)
    || event.fields.some((field) => !SAFE_FIELDS.includes(field)))) {
    throw new Error('Nhật ký lưu trữ không hợp lệ.');
  }
  return events;
}

export const getAuditWriteWarning = () => writeWarning;

// The demo entity write has already succeeded. Audit storage failure must not make that operation appear failed.
// A backend transaction is needed for a durable, tamper-resistant production audit trail.
export function recordActivity({ actor, module, action, targetId, targetName, fields = [] }) {
  try {
    if (!actor?.id || !Object.keys(AUDIT_MODULES).includes(module) || !Object.keys(AUDIT_ACTIONS).includes(action)) throw new Error('Invalid audit event');
    const events = readAuditStorage();
    const event = {
      id: window.crypto?.randomUUID?.() || `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(), actorId: safeText(actor.id), actorName: safeText(actor.fullName),
      actorRole: safeText(actor.role), module, action, targetId: safeText(targetId), targetName: safeText(targetName),
      fields: fields.filter((field) => SAFE_FIELDS.includes(field)),
    };
    localStorage.setItem(AUDIT_KEY, JSON.stringify([event, ...events].slice(0, AUDIT_LIMIT)));
    writeWarning = '';
  } catch {
    writeWarning = 'Thao tác đã hoàn tất nhưng chưa ghi được nhật ký. Kiểm tra dữ liệu hoặc dung lượng lưu trữ trình duyệt.';
  }
  window.dispatchEvent(new Event(AUDIT_CHANGED));
}
