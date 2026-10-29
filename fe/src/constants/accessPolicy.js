// Sáu vai trò của hệ thống, khớp mã vai trò của backend (roles.code).
export const ROLES = {
  ADMIN: { label: 'Quản trị viên', home: '/admin/dashboard', tone: 'violet' },
  RECEPTIONIST: { label: 'Lễ tân', home: '/reception/queue', tone: 'blue' },
  VETERINARIAN: { label: 'Bác sĩ thú y', home: '/vet/today', tone: 'teal' },
  LAB_TECHNICIAN: { label: 'Kỹ thuật viên xét nghiệm', home: '/lab/queue', tone: 'green' },
  IMAGING_TECHNICIAN: { label: 'Kỹ thuật viên CĐHA', home: '/imaging/queue', tone: 'green' },
  PET_OWNER: { label: 'Chủ thú cưng', home: '/portal/profile', tone: 'orange' },
};

export const ACCOUNT_STATUSES = {
  ACTIVE: { label: 'Đang hoạt động', tone: 'active' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'inactive' },
  LOCKED: { label: 'Bị khóa', tone: 'orange' },
};
// Admin tạo tài khoản nhân sự; chủ thú cưng tự đăng ký hoặc do lễ tân tạo.
export const STAFF_ROLES = ['VETERINARIAN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'IMAGING_TECHNICIAN'];
// Vai trò có số phòng làm việc cố định (UC-02).
export const ROOM_ROLES = ['VETERINARIAN', 'LAB_TECHNICIAN', 'IMAGING_TECHNICIAN'];

export const getRoleHome = (role) => ROLES[role]?.home || '/';
