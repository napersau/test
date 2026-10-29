import { validateUser } from './userSchema';
import { STAFF_ROLES } from '../../constants/accessPolicy';
import { recordActivity } from '../activity/auditStorage';
import { readAppointments } from '../appointments/appointmentStorage';
import { readCustomerProfiles, assertContactUnique, customerDTO, CUSTOMER_FIELDS, EMPTY_CUSTOMER, validateCustomer, cleanCustomer, customerError } from '../reception/customerProfileStorage';

export const USERS_KEY = 'pawcare_users_v1';
export const USERS_CHANGED = 'pawcare:users-changed';
const INITIAL_DATE = '2026-10-02T09:00:00+07:00';

const initialUsers = [
  { id: 'admin-default', fullName: 'Quản trị viên PawCare', email: 'admin@admin', phone: '0901234567', role: 'ADMIN', status: 'ACTIVE', password: '123456' },
  { id: 'customer-demo', fullName: 'Nguyễn Ngọc Lan', email: 'customer@pawcare.vn', phone: '0902345678', role: 'CUSTOMER', status: 'ACTIVE', password: '123456' },
  { id: 'vet-demo', fullName: 'Trần Minh Khang', email: 'vet@pawcare.vn', phone: '0903456789', role: 'VETERINARIAN', roomNumber: 'P01', status: 'ACTIVE', password: '123456' },
  { id: 'reception-demo', fullName: 'Lê Thu Thảo', email: 'reception@pawcare.vn', phone: '0904567890', role: 'RECEPTIONIST', status: 'ACTIVE', password: '123456' },
  { id: 'customer-two', fullName: 'Phạm Hoàng Nam', email: 'nam@pawcare.vn', phone: '0905678901', role: 'CUSTOMER', status: 'ACTIVE', password: '123456' },
  { id: 'customer-three', fullName: 'Đỗ Mai Anh', email: 'maianh@pawcare.vn', phone: '0906789012', role: 'CUSTOMER', status: 'LOCKED', password: '123456' },
  { id: 'vet-two', fullName: 'Vũ Bảo Ngọc', email: 'ngoc@pawcare.vn', phone: '0907890123', role: 'VETERINARIAN', roomNumber: 'P02', status: 'ACTIVE', password: '123456' },
];

export function publicUser(record) {
  const { password, ...user } = record;
  return user;
}

// Sức chứa mỗi khung giờ đặt lịch = số bác sĩ đang hoạt động. Chỉ trả về một con số, không lộ thông tin bác sĩ.
export function getBookingCapacity() {
  return readRecords().filter((user) => user.role === 'VETERINARIAN' && user.status === 'ACTIVE').length;
}

function readRecords() {
  const saved = localStorage.getItem(USERS_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error('Dữ liệu tài khoản không hợp lệ.');
    return parsed;
  }
  const records = initialUsers.map((user) => ({ ...user, createdAt: INITIAL_DATE, updatedAt: INITIAL_DATE }));
  localStorage.setItem(USERS_KEY, JSON.stringify(records));
  return records;
}

function commit(records) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(records)); }
  catch { throw new Error('Không lưu được thông tin. Kiểm tra dung lượng bộ nhớ trình duyệt rồi thử lại.'); }
  window.dispatchEvent(new Event(USERS_CHANGED));
}

function requireAdmin(actorId, records) {
  const actor = records.find((user) => user.id === actorId);
  if (actor?.role !== 'ADMIN' || actor.status !== 'ACTIVE') throw new Error('Bạn không có quyền quản lý tài khoản.');
}

function assertUnique(records, values, id) {
  assertContactUnique(readCustomerProfiles(), { ...EMPTY_CUSTOMER, ...values }, id);
  if (records.some((user) => user.id !== id && user.email.toLowerCase() === values.email.trim().toLowerCase())) {
    const error = new Error('Email này đã được sử dụng.');
    error.fieldErrors = { email: error.message };
    throw error;
  }
  const room = values.role === 'VETERINARIAN' ? (values.roomNumber || '').trim().toUpperCase() : '';
  if (room && records.some((user) => user.id !== id && user.role === 'VETERINARIAN' && (user.roomNumber || '').toUpperCase() === room)) {
    const error = new Error('Phòng khám này đã được gán cho bác sĩ khác.');
    error.fieldErrors = { roomNumber: error.message };
    throw error;
  }
  if (records.some((user) => user.id !== id && user.phone.replace(/\s/g, '') === values.phone.replace(/\s/g, ''))) {
    const error = new Error('Số điện thoại này đã được sử dụng.');
    error.fieldErrors = { phone: error.message };
    throw error;
  }
}

function validate(values, isNew) {
  const fieldErrors = validateUser(values, isNew);
  if (Object.keys(fieldErrors).length) {
    const error = new Error('Vui lòng kiểm tra lại thông tin.');
    error.fieldErrors = fieldErrors;
    throw error;
  }
}

function cleanValues(values) {
  const base = { fullName: values.fullName.trim(), email: values.email.trim().toLowerCase(), phone: values.phone.replace(/\s/g, ''), role: values.role, status: values.status };
  // Số phòng cố định chỉ áp dụng cho bác sĩ.
  return values.role === 'VETERINARIAN' ? { ...base, roomNumber: (values.roomNumber || '').trim().toUpperCase() } : base;
}

export function findAccount(id) {
  return readRecords().find((user) => user.id === id);
}

export function verifyCredentials(identifier, password) {
  const normalized = identifier.trim().toLowerCase();
  const record = readRecords().find((user) => user.email.toLowerCase() === normalized || user.phone === normalized.replace(/\s/g, ''));
  if (!record || record.password !== password) throw new Error('Email hoặc mật khẩu không chính xác.');
  if (record.status !== 'ACTIVE') throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
  return publicUser(record);
}

export function listUsers(actorId) {
  const records = readRecords();
  requireAdmin(actorId, records);
  return records.map(publicUser);
}

export function requireReceptionist(actorId) {
  const actor = findAccount(actorId);
  if (actor?.role !== 'RECEPTIONIST' || actor.status !== 'ACTIVE') throw new Error('Chỉ nhân viên lễ tân đang hoạt động được quản lý hồ sơ.');
  return actor;
}

export function requireVeterinarian(actorId) {
  const actor = findAccount(actorId);
  if (actor?.role !== 'VETERINARIAN' || actor.status !== 'ACTIVE') throw new Error('Chỉ bác sĩ thú y đang hoạt động được truy cập lịch và hồ sơ khám.');
  return actor;
}

export function getVeterinarianCustomer(actorId, ownerId) {
  requireVeterinarian(actorId);
  if (!readAppointments().some((item) => item.ownerId === ownerId && item.assignedDoctorId === actorId)) throw new Error('Chủ nuôi không có lượt khám được phân công cho bạn.');
  const record = readRecords().find((item) => item.id === ownerId && item.role === 'CUSTOMER') || readCustomerProfiles().find((item) => item.id === ownerId);
  if (!record) throw new Error('Không tìm thấy chủ nuôi của lượt khám.');
  return { id: record.id, fullName: record.fullName, phone: record.phone, email: record.email || '', address: record.address || '' };
}

export function listClinicalRoomOwners(actorId) {
  requireVeterinarian(actorId);
  const ids = new Set(readAppointments().filter((item) => ['IN_PROGRESS', 'WAITING_RESULTS', 'RESULTS_READY'].includes(item.status)).map((item) => item.ownerId));
  return [...readRecords().filter((item) => item.role === 'CUSTOMER'), ...readCustomerProfiles()].filter((item) => ids.has(item.id)).map(({ id, fullName }) => ({ id, fullName }));
}

export function listReceptionAccounts(actorId) {
  requireReceptionist(actorId);
  return readRecords().filter((item) => item.role === 'CUSTOMER').map((item) => customerDTO(item, 'ACCOUNT'));
}

export function listReceptionDoctors(actorId) {
  requireReceptionist(actorId);
  return readRecords().filter((item) => item.role === 'VETERINARIAN' && item.status === 'ACTIVE')
    .map(({ id, fullName, roomNumber }) => ({ id, fullName, roomNumber: roomNumber || '' }));
}

export function assertReceptionContactUnique(actorId, values, id) {
  requireReceptionist(actorId);
  assertContactUnique([...readRecords(), ...readCustomerProfiles()], values, id);
}

export function updateReceptionCustomer(actorId, id, values) {
  const actor = requireReceptionist(actorId);
  const records = readRecords();
  const current = records.find((item) => item.id === id && item.role === 'CUSTOMER');
  if (!current) throw new Error('Không tìm thấy hồ sơ khách hàng.');
  if (values.expectedRevision !== customerDTO(current, 'ACCOUNT').revision) throw customerError('Hồ sơ vừa thay đổi. Đóng form rồi mở lại để cập nhật.', {}, 'CONFLICT');
  const contact = { ...EMPTY_CUSTOMER, ...Object.fromEntries(CUSTOMER_FIELDS.map((key) => [key, values[key] ?? current[key] ?? ''])) };
  const errors = validateCustomer(contact, true);
  if (Object.keys(errors).length) throw customerError('Vui lòng kiểm tra thông tin khách hàng.', errors);
  assertReceptionContactUnique(actorId, contact, id);
  const updated = { ...current, ...cleanCustomer(contact), updatedAt: new Date().toISOString() };
  commit(records.map((item) => item.id === id ? updated : item));
  recordActivity({ actor, module: 'CUSTOMERS', action: 'CUSTOMER_UPDATE', targetId: id, targetName: updated.fullName });
  return customerDTO(updated, 'ACCOUNT');
}

function insertAccount(values) {
  const records = readRecords();
  validate(values, true);
  assertUnique(records, values);
  const now = new Date().toISOString();
  const id = window.crypto?.randomUUID?.() || `user-${Date.now()}-${records.length + 1}`;
  const record = { ...cleanValues(values), password: values.password, id, createdAt: now, updatedAt: now };
  commit([...records, record]);
  return publicUser(record);
}

export function createUser(actorId, values) {
  requireAdmin(actorId, readRecords());
  if (!STAFF_ROLES.includes(values.role)) {
    const error = new Error('Quản trị viên chỉ tạo tài khoản bác sĩ hoặc lễ tân.');
    error.fieldErrors = { role: 'Chỉ được tạo tài khoản bác sĩ hoặc lễ tân. Chủ thú cưng đăng ký qua Portal hoặc do lễ tân tạo.' };
    throw error;
  }
  const user = insertAccount(values);
  recordActivity({ actor: findAccount(actorId), module: 'USERS', action: 'USER_CREATE', targetId: user.id, targetName: user.fullName });
  return user;
}

export function registerCustomer(profile, password) {
  const user = insertAccount({ ...profile, password, role: 'CUSTOMER', status: 'ACTIVE' });
  recordActivity({ actor: user, module: 'AUTH', action: 'REGISTER', targetId: user.id, targetName: user.fullName });
  return user;
}

export function updateUser(actorId, id, values) {
  const records = readRecords();
  requireAdmin(actorId, records);
  const current = records.find((user) => user.id === id);
  if (!current) throw new Error('Không tìm thấy tài khoản.');
  const merged = { ...current, ...values };
  if (values.role && values.role !== current.role) throw new Error('Mỗi tài khoản chỉ có một vai trò cố định, không thể đổi vai trò.');
  validate(merged, false);
  assertUnique(records, merged, id);
  if (id === actorId && (merged.status !== 'ACTIVE' || merged.role !== 'ADMIN')) throw new Error('Không thể khóa hoặc đổi vai trò tài khoản đang đăng nhập.');
  if (current.role === 'ADMIN' && current.status === 'ACTIVE' && (merged.role !== 'ADMIN' || merged.status !== 'ACTIVE')
    && records.filter((user) => user.role === 'ADMIN' && user.status === 'ACTIVE').length === 1) throw new Error('Hệ thống phải có ít nhất một quản trị viên hoạt động.');
  const updated = { ...current, ...cleanValues(merged), updatedAt: new Date().toISOString() };
  if (values.password) updated.password = values.password;
  commit(records.map((user) => user.id === id ? updated : user));
  recordActivity({ actor: records.find((user) => user.id === actorId), module: 'USERS', action: current.status !== updated.status ? 'USER_STATUS' : 'USER_UPDATE',
    targetId: id, targetName: updated.fullName, fields: ['fullName', 'role', 'status', 'password', 'roomNumber'].filter((field) => current[field] !== updated[field]) });
  return publicUser(updated);
}

export function updateOwnProfile(id, values) {
  const records = readRecords();
  const current = records.find((user) => user.id === id);
  if (!current || current.status !== 'ACTIVE') throw new Error('Không tìm thấy tài khoản đang hoạt động.');
  const fields = ['fullName', 'email', 'phone', 'address', 'birthDate', 'gender', 'receiveAppointmentReminders', 'receiveHealthTips'];
  const profile = Object.fromEntries(fields.filter((key) => key in values).map((key) => [key, values[key]]));
  const merged = { ...current, ...profile };
  validate(merged, false);
  assertUnique(records, merged, id);
  const updated = { ...merged, ...cleanValues(merged), updatedAt: new Date().toISOString() };
  commit(records.map((user) => user.id === id ? updated : user));
  recordActivity({ actor: updated, module: 'AUTH', action: 'PROFILE_UPDATE', targetId: id, targetName: updated.fullName });
  return publicUser(updated);
}
