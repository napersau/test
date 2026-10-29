// Sức chứa tối đa của mỗi khung giờ đặt lịch = số bác sĩ đang hoạt động (ACTIVE).
export const countActiveVeterinarians = (users) => users.filter((user) => user.role === 'VETERINARIAN' && user.status === 'ACTIVE').length;
