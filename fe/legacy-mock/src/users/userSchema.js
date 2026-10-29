import { ROLES, ACCOUNT_STATUSES } from '../../constants/accessPolicy';

export function validateUser(values, isNew = false) {
  const errors = {};
  if (!values.fullName?.trim()) errors.fullName = 'Vui lòng nhập họ tên.';
  if (!/^[^\s@]+@[^\s@]+$/.test(values.email?.trim() || '')) errors.email = 'Email không hợp lệ.';
  if (!/^0\d{9}$/.test((values.phone || '').replace(/\s/g, ''))) errors.phone = 'Nhập số điện thoại Việt Nam gồm 10 chữ số.';
  if (!ROLES[values.role]) errors.role = 'Vui lòng chọn vai trò.';
  if (!ACCOUNT_STATUSES[values.status]) errors.status = 'Trạng thái không hợp lệ.';
  if (values.role === 'VETERINARIAN') {
    const room = (values.roomNumber || '').trim();
    if (isNew && !room) errors.roomNumber = 'Bác sĩ cần có số phòng khám cố định (ví dụ P01).';
    else if (room && !/^[A-Za-z0-9-]{1,20}$/.test(room)) errors.roomNumber = 'Số phòng gồm chữ, số hoặc dấu -, tối đa 20 ký tự (ví dụ P01).';
  }
  if ((isNew || values.password) && (values.password || '').length < 6) errors.password = 'Mật khẩu cần ít nhất 6 ký tự.';
  return errors;
}
