// Profile-only walk-ins have no login credentials. This module has no account dependencies.
export const CUSTOMERS_KEY = 'pawcare_customer_profiles_v1';
export const CUSTOMERS_CHANGED = 'pawcare:customers-changed';
export const CUSTOMER_FIELDS = ['fullName', 'phone', 'email', 'address'];
export const EMPTY_CUSTOMER = { fullName: '', phone: '', email: '', address: '' };

export function validateCustomer(values, emailRequired = false) {
  const errors = {};
  if (typeof values.fullName !== 'string' || !values.fullName.trim() || values.fullName.trim().length > 100) errors.fullName = 'Nhập họ tên từ 1 đến 100 ký tự.';
  if (typeof values.phone !== 'string' || !/^0\d{9}$/.test(values.phone.replace(/\s/g, ''))) errors.phone = 'Nhập số điện thoại Việt Nam gồm 10 số, bắt đầu bằng 0.';
  if (typeof values.email !== 'string' || values.email.length > 160 || (values.email.trim() ? !/^[^\s@]+@[^\s@]+$/.test(values.email.trim()) : emailRequired)) errors.email = emailRequired ? 'Nhập email hợp lệ cho hồ sơ đã có tài khoản.' : 'Email không hợp lệ.';
  if (typeof values.address !== 'string' || values.address.length > 300) errors.address = 'Địa chỉ không được quá 300 ký tự.';
  return errors;
}

export function cleanCustomer(values) {
  return { fullName: values.fullName.trim(), phone: values.phone.replace(/\s/g, ''), email: values.email.trim().toLowerCase(), address: values.address.trim() };
}

export function customerError(message, fieldErrors, code) {
  const error = new Error(message); error.fieldErrors = fieldErrors; error.code = code; return error;
}

export function customerDTO(record, source) {
  const contact = Object.fromEntries(CUSTOMER_FIELDS.map((key) => [key, record[key] || '']));
  return { ...contact, id: record.id, source, accountStatus: source === 'ACCOUNT' ? record.status : null,
    createdAt: record.createdAt, updatedAt: record.updatedAt,
    revision: JSON.stringify([contact, record.updatedAt, record.version ?? 0, record.status ?? null]) };
}

export function readCustomerProfiles() {
  const saved = localStorage.getItem(CUSTOMERS_KEY);
  if (saved === null) return [];
  let records;
  try { records = JSON.parse(saved); } catch { throw new Error('Dữ liệu khách hàng không hợp lệ. Không tự động ghi đè hồ sơ.'); }
  if (!Array.isArray(records) || records.some((item) => !item || typeof item.id !== 'string' || !item.id.startsWith('walkin-')
    || Object.keys(validateCustomer(item)).length || !Number.isInteger(item.version) || item.version < 1
    || !Number.isFinite(Date.parse(item.createdAt)) || !Number.isFinite(Date.parse(item.updatedAt)))
    || new Set(records.map((item) => item.id)).size !== records.length) throw new Error('Dữ liệu khách hàng không hợp lệ. Vui lòng kiểm tra dữ liệu lưu trữ.');
  return records;
}

export function commitCustomerProfiles(records) {
  try { localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(records)); }
  catch { throw new Error('Không lưu được hồ sơ khách hàng. Kiểm tra dung lượng bộ nhớ trình duyệt rồi thử lại.'); }
  window.dispatchEvent(new Event(CUSTOMERS_CHANGED));
}

export function assertContactUnique(records, values, id) {
  const contact = cleanCustomer({ ...EMPTY_CUSTOMER, ...values });
  const others = records.filter((item) => item.id !== id);
  const errors = {};
  const samePhone = others.find((item) => item.phone.replace(/\s/g, '') === contact.phone);
  if (samePhone) errors.phone = `Số điện thoại này đã được đăng ký cho khách hàng ${samePhone.fullName}. Tìm hồ sơ hiện có trước khi thêm.`;
  if (contact.email && others.some((item) => item.email?.trim().toLowerCase() === contact.email)) errors.email = 'Email này đã được sử dụng.';
  if (Object.keys(errors).length) throw customerError('Thông tin liên hệ bị trùng.', errors, 'CONFLICT');
}
