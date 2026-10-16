export const ROLES = {
  ADMIN: { label: 'Quản trị viên', home: '/admin/dashboard', tone: 'violet' },
  RECEPTIONIST: { label: 'Lễ tân', home: '/reception/queue', tone: 'blue' },
  VETERINARIAN: { label: 'Bác sĩ thú y', home: '/vet/today', tone: 'teal' },
  CUSTOMER: { label: 'Chủ thú cưng', home: '/portal/profile', tone: 'orange' },
};

export const ACCOUNT_STATUSES = {
  ACTIVE: { label: 'Đang hoạt động', tone: 'active' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'inactive' },
  LOCKED: { label: 'Bị khóa', tone: 'orange' },
};
// Admin chỉ tạo tài khoản nhân viên; chủ thú cưng tự đăng ký hoặc do lễ tân tạo.
export const STAFF_ROLES = ['VETERINARIAN', 'RECEPTIONIST'];

export const getRoleHome = (role) => ROLES[role]?.home || '/';
