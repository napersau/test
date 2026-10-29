import { createUser, findAccount, listUsers, registerCustomer, updateOwnProfile, updateUser, verifyCredentials } from './usersRepository';

beforeEach(() => localStorage.clear());

const input = { fullName: 'Nguyễn Kiểm Thử', email: 'test@pawcare.vn', phone: '0987654321', password: '123456', role: 'RECEPTIONIST', status: 'ACTIVE' };
const vetInput = { ...input, email: 'vet.test@pawcare.vn', phone: '0987654322', role: 'VETERINARIAN', roomNumber: 'p09' };

test('admin creates account, locks login and unlocks it without losing the profile', () => {
  const created = createUser('admin-default', input);
  expect(created.password).toBeUndefined();
  expect(verifyCredentials(input.email, input.password).id).toBe(created.id);
  updateUser('admin-default', created.id, { status: 'LOCKED' });
  expect(() => verifyCredentials(input.email, input.password)).toThrow(/bị khóa/);
  updateUser('admin-default', created.id, { status: 'ACTIVE', fullName: 'Tên cập nhật' });
  expect(verifyCredentials(input.phone, input.password).fullName).toBe('Tên cập nhật');
});

test('duplicate identifiers are rejected and active admin cannot lock or demote itself', () => {
  createUser('admin-default', input);
  expect(() => createUser('admin-default', { ...input, email: 'TEST@pawcare.vn' })).toThrow(/Email này/);
  expect(() => updateUser('admin-default', 'admin-default', { role: 'CUSTOMER' })).toThrow(/vai trò/);
  expect(() => updateUser('admin-default', 'admin-default', { status: 'LOCKED' })).toThrow(/đang đăng nhập/);
  expect(findAccount('admin-default').status).toBe('ACTIVE');
});

test('customer registration participates in login and cannot manage users or escalate through profile', () => {
  const registered = registerCustomer(input, 'new-password');
  expect(verifyCredentials(input.email, 'new-password').id).toBe(registered.id);
  expect(() => listUsers(registered.id)).toThrow(/không có quyền/);
  const updated = updateOwnProfile(registered.id, { fullName: 'Tên mới', role: 'ADMIN', status: 'INACTIVE', password: 'hacked' });
  expect(updated.role).toBe('CUSTOMER');
  expect(updated.status).toBe('ACTIVE');
  expect(verifyCredentials(input.email, 'new-password').fullName).toBe('Tên mới');
});

test('admin only creates staff accounts; role is fixed after creation', () => {
  expect(() => createUser('admin-default', { ...input, role: 'CUSTOMER' })).toThrow(/bác sĩ hoặc lễ tân/);
  expect(() => createUser('admin-default', { ...input, role: 'ADMIN' })).toThrow(/bác sĩ hoặc lễ tân/);
  const created = createUser('admin-default', input);
  expect(() => updateUser('admin-default', created.id, { role: 'VETERINARIAN' })).toThrow(/vai trò/);
});

test('every account status is valid and only ACTIVE accounts can log in', () => {
  const created = createUser('admin-default', input);
  ['INACTIVE', 'LOCKED'].forEach((status) => {
    updateUser('admin-default', created.id, { status });
    expect(() => verifyCredentials(input.email, input.password)).toThrow(/bị khóa/);
  });
  expect(() => updateUser('admin-default', created.id, { status: 'DELETED' })).toThrow();
});

test('a veterinarian needs a unique fixed clinic room, normalised to upper case; other roles keep none', () => {
  expect(() => createUser('admin-default', { ...vetInput, roomNumber: '' })).toThrow('Vui lòng kiểm tra');
  expect(() => createUser('admin-default', { ...vetInput, roomNumber: 'P 01!' })).toThrow('Vui lòng kiểm tra');
  const vet = createUser('admin-default', vetInput);
  expect(vet.roomNumber).toBe('P09');
  expect(() => createUser('admin-default', { ...vetInput, email: 'other@pawcare.vn', phone: '0987654323', roomNumber: 'p09' })).toThrow(/Phòng khám này/);
  expect(() => updateUser('admin-default', 'vet-two', { roomNumber: 'P01' })).toThrow(/Phòng khám này/);
  expect(updateUser('admin-default', vet.id, { roomNumber: 'P10' }).roomNumber).toBe('P10');
  expect(createUser('admin-default', input).roomNumber).toBeUndefined();
  // Khóa bác sĩ chưa có số phòng (dữ liệu cũ) không bị chặn bởi quy tắc bắt buộc phòng.
  expect(updateUser('admin-default', vet.id, { status: 'LOCKED' }).status).toBe('LOCKED');
});
