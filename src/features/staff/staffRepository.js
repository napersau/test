import { listUsers } from '../users/usersRepository';
// Khóa lưu hồ sơ nhân sự demo (bản V2) được giữ lại để bộ nạp dữ liệu demo còn dùng; màn Nhân sự không còn hiển thị chuyên khoa/ca trực.
export const STAFF_KEY = 'pawcare_staff_profiles_v1';
export const STAFF_CHANGED = 'pawcare:staff-profiles-changed';
// Nhân sự = bác sĩ + lễ tân. Bác sĩ có số phòng khám cố định; hệ thống không quản lý ca kíp, chuyên khoa hay nghỉ phép.
export function listStaff(actorId) {
  return listUsers(actorId).filter((user) => ['VETERINARIAN', 'RECEPTIONIST'].includes(user.role))
    .map(({ id, fullName, email, phone, role, status, roomNumber }) => ({ id, fullName, email, phone, role, status, roomNumber: roomNumber || '' }))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === 'VETERINARIAN' ? -1 : 1) || a.fullName.localeCompare(b.fullName, 'vi'));
}
