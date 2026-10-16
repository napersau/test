// Tài khoản gốc của hệ thống (khách, bác sĩ, lễ tân quen dùng) nhận luôn dữ liệu của các nhân vật demo tương ứng,
// để đăng nhập bằng customer@ / vet@ / reception@ là thấy ngay lịch hẹn, hồ sơ khám, hóa đơn mẫu.
export const BASE_ACCOUNT_ALIASES = [
  ['demo-v1-customer-1', 'customer-demo', 'CUSTOMER'], ['demo-v1-customer-2', 'customer-two', 'CUSTOMER'],
  ['demo-v1-vet-1', 'vet-demo', 'VETERINARIAN'], ['demo-v1-vet-2', 'vet-two', 'VETERINARIAN'],
  ['demo-v1-reception-1', 'reception-demo', 'RECEPTIONIST'],
];
// Chỉ nhận tài khoản gốc còn tồn tại, đúng vai trò và đang hoạt động; tài khoản nào không đủ điều kiện vẫn dùng nhân vật demo riêng.
export function adoptBaseAccounts(dataset, users) {
  const ids = new Map(); const names = new Map();
  BASE_ACCOUNT_ALIASES.forEach(([demoId, realId, role]) => {
    const real = users.find((item) => item.id === realId); const demo = dataset.users.find((item) => item.id === demoId);
    if (real && demo && real.role === role && real.status === 'ACTIVE') { ids.set(demoId, realId); names.set(demo.fullName, real.fullName); }
  });
  if (!ids.size) return { dataset, aliases: {} };
  const swap = (value) => {
    if (typeof value === 'string') return ids.get(value) ?? names.get(value) ?? value;
    if (Array.isArray(value)) return value.map(swap);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, swap(item)]));
    return value;
  };
  return { dataset: swap({ ...dataset, users: dataset.users.filter((item) => !ids.has(item.id)) }), aliases: Object.fromEntries(ids) };
}
