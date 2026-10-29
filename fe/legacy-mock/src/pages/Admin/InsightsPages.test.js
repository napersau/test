import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { AUDIT_KEY, recordActivity } from '../../features/activity/auditStorage';
import { findAccount, listUsers, USERS_KEY, USERS_CHANGED } from '../../features/users/usersRepository';
import { listServices, SERVICES_KEY } from '../../features/services/servicesRepository';
import { listMedicines, MEDICINES_KEY } from '../../features/medicines/medicinesRepository';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/'); });
function openPage(path, account = 'admin@admin') {
  authenticate(account, '123456', true);
  window.history.replaceState({}, '', path);
  return render(<App />);
}

test('activity searches without accents, filters, paginates, opens details and updates live', async () => {
  const actor = findAccount('admin-default');
  for (let index = 0; index < 10; index++) recordActivity({ actor, module: 'SERVICES', action: 'SERVICE_CREATE', targetId: `s-${index}`, targetName: `Dịch vụ kiểm thử ${index}` });
  openPage('/admin/activity');
  expect(await screen.findByRole('heading', { name: 'Nhật ký hoạt động' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  expect(screen.getByText(/Trang 2\/2/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Tìm hoạt động'), { target: { value: 'kiem thu 3' } });
  expect(screen.getByText('Dịch vụ kiểm thử 3')).toBeInTheDocument();
  expect(screen.queryByText('Dịch vụ kiểm thử 4')).not.toBeInTheDocument();
  expect(screen.getByText(/Trang 1\/1/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Chi tiết Thêm dịch vụ: Dịch vụ kiểm thử 3/ }));
  expect(within(screen.getByRole('dialog')).getByText('s-3')).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Đóng' }));
  fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
  fireEvent.change(screen.getByLabelText('Lọc chức năng'), { target: { value: 'MEDICINES' } });
  expect(screen.getByRole('heading', { name: 'Không tìm thấy hoạt động' })).toBeInTheDocument();
  act(() => recordActivity({ actor, module: 'MEDICINES', action: 'BATCH_IMPORT', targetName: 'Lô kiểm thử trực tiếp' }));
  expect(screen.getByText('Lô kiểm thử trực tiếp')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-03' } });
  fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-10-02' } });
  expect(screen.getByRole('alert')).toHaveTextContent('không được sau');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('activity has genuine empty and corrupt storage states with retry', async () => {
  authenticate('admin@admin', '123456', true);
  localStorage.removeItem(AUDIT_KEY);
  window.history.replaceState({}, '', '/admin/activity');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Chưa có hoạt động được ghi nhận' })).toBeInTheDocument();
  act(() => { localStorage.setItem(AUDIT_KEY, '{bad'); window.dispatchEvent(new Event('storage')); });
  expect(screen.getByRole('heading', { name: 'Không thể tải nhật ký' })).toBeInTheDocument();
  localStorage.removeItem(AUDIT_KEY);
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(screen.getByRole('heading', { name: 'Chưa có hoạt động được ghi nhận' })).toBeInTheDocument();
});

test('reports show source totals, URL date filters, empty period, invalid range and live changes', async () => {
  listServices('admin-default'); listMedicines('admin-default');
  const inventory = JSON.parse(localStorage.getItem(MEDICINES_KEY));
  inventory.batches.forEach((batch) => { batch.importedAt = '2026-10-02T09:00:00+07:00'; });
  localStorage.setItem(MEDICINES_KEY, JSON.stringify(inventory));
  openPage('/admin/reports?from=2026-10-02&to=2026-10-02');
  expect(await screen.findByRole('heading', { name: 'Thống kê trong kỳ' })).toBeInTheDocument();
  expect(within(screen.getByRole('group', { name: 'Khách hàng mới' })).getByText('3')).toBeInTheDocument();
  expect(within(screen.getByRole('group', { name: 'Lô hàng nhập' })).getByText('6')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /Biểu đồ khách hàng mới/ })).toBeInTheDocument();
  expect(screen.getByText('Vitamin tổng hợp')).toBeInTheDocument();
  const users = JSON.parse(localStorage.getItem(USERS_KEY));
  users.find((user) => user.id === 'customer-two').createdAt = '2026-10-03T00:00:00+07:00';
  act(() => { localStorage.setItem(USERS_KEY, JSON.stringify(users)); window.dispatchEvent(new Event(USERS_CHANGED)); });
  expect(within(screen.getByRole('group', { name: 'Khách hàng mới' })).getByText('2')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2099-01-01' } });
  expect(screen.getByRole('alert')).toHaveTextContent('366 ngày');
  fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2099-01-01' } });
  expect(screen.getByText('Không có phát sinh trong khoảng thời gian đã chọn.')).toBeInTheDocument();
  expect(window.location.search).toContain('from=2099-01-01');
  expect(screen.getByRole('heading', { name: 'Cảnh báo kho hiện tại' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2099-01-02' } });
  expect(screen.getByRole('alert')).toHaveTextContent('không được sau');
  expect(screen.queryByRole('heading', { name: 'Thống kê trong kỳ' })).not.toBeInTheDocument();
});

test('report refuses corrupt source data, retries, and supports empty catalogs', async () => {
  listUsers('admin-default'); listServices('admin-default'); listMedicines('admin-default');
  localStorage.setItem(SERVICES_KEY, '{bad');
  openPage('/admin/reports');
  expect(await screen.findByRole('heading', { name: 'Không thể tổng hợp báo cáo' })).toBeInTheDocument();
  expect(screen.queryByText('Khách hàng mới')).not.toBeInTheDocument();
  localStorage.setItem(SERVICES_KEY, '[]'); localStorage.setItem(MEDICINES_KEY, JSON.stringify({ medicines: [], batches: [] }));
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(screen.getByRole('heading', { name: 'Không có cảnh báo tồn kho' })).toBeInTheDocument();
  expect(window.location.search).toMatch(/from=.*to=/);
});

test.each(['/admin/activity', '/admin/reports'])('customers cannot access insight route %s', (path) => {
  openPage(path, 'customer@pawcare.vn');
  expect(screen.getByRole('heading', { name: /không có quyền truy cập/ })).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('anonymous visitors are redirected to login with the report return path', () => {
  window.history.replaceState({}, '', '/admin/reports?from=2026-10-02&to=2026-10-02');
  render(<App />);
  expect(screen.getByRole('heading', { name: /Chào mừng/ })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/auth/login');
});
