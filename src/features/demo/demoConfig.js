export const DEMO_KEY = 'pawcare_demo_dataset_v1';
export const DEMO_CHANGED = 'pawcare:demo-changed';
export const DEMO_ACCOUNTS = [
  { role: 'Khách hàng', email: 'customer@pawcare.vn', path: '/portal/pets', id: 'customer-demo' },
  { role: 'Bác sĩ thú y', email: 'vet@pawcare.vn', path: '/vet/today', id: 'vet-demo' },
  { role: 'Lễ tân', email: 'reception@pawcare.vn', path: '/reception/intake', id: 'reception-demo' },
];
// Khi tài khoản gốc không nhận được dữ liệu (đã bị khóa / đổi vai trò) hoặc nạp không gắn tài khoản gốc, dùng nhân vật demo riêng.
export const DEMO_OWN_ACCOUNTS = [
  { role: 'Khách hàng', email: 'demo.customer@pawcare.vn', path: '/portal/pets', id: 'demo-v1-customer-1' },
  { role: 'Bác sĩ thú y', email: 'demo.vet@pawcare.vn', path: '/vet/today', id: 'demo-v1-vet-1' },
  { role: 'Lễ tân', email: 'demo.reception@pawcare.vn', path: '/reception/intake', id: 'demo-v1-reception-1' },
];
// Tăng số này khi đổi nội dung bộ demo để các trình duyệt đã nạp bản cũ tự được làm mới.
export const DEMO_DATA_REVISION = 3;
export const DEMO_PASSWORD = '123456';
export const DEMO_NOTICE = 'Dữ liệu giả để kiểm thử giao diện. Không dùng để điều trị hoặc làm chứng từ thanh toán thật.';
