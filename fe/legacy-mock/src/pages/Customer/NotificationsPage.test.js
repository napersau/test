import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { findAccount } from '../../features/users/usersRepository';
import { loadDemoDataset } from '../../features/demo/demoRepository';
import { NOTIFICATIONS_KEY } from '../../features/notifications/notificationPolicy';
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/portal/notifications'); findAccount('admin-default'); });
test('seeded notifications have common navigation, filter, mark-read persistence and safe detail navigation', async () => {
  loadDemoDataset('admin-default'); authenticate('demo.customer@pawcare.vn', '123456', true); const view = render(<App />);
  expect(await screen.findByRole('heading', { name: 'Thông báo & nhắc nhở' })).toBeInTheDocument(); expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  expect(within(screen.getByRole('navigation', { name: 'Khu vực khách hàng' })).getByRole('link', { name: 'Thông báo' })).toHaveAttribute('aria-current', 'page');
  fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'unread' } });
  const mark = screen.getAllByRole('button', { name: /Đánh dấu đã đọc:/ })[0]; fireEvent.click(mark);
  expect(await screen.findByRole('status')).toHaveTextContent('Đã đánh dấu');
  fireEvent.change(screen.getByLabelText('Tìm thông báo'), { target: { value: 'no-match-123' } }); expect(screen.getByRole('heading', { name: 'Không có thông báo phù hợp' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' })); view.unmount(); render(<App />);
  expect(screen.getAllByText('Đã đọc').length).toBeGreaterThan(1); fireEvent.click(screen.getAllByRole('link', { name: 'Xem thông tin →' })[0]);
  expect(window.location.pathname).toMatch(/^\/portal\/(medical-history|vaccinations|invoices|appointments)/);
});
test('empty/error/retry preserve source and forbid staff role', async () => {
  authenticate('customer@pawcare.vn', '123456', true); const view = render(<App />); expect(await screen.findByRole('heading', { name: 'Chưa có thông báo' })).toBeInTheDocument();
  localStorage.setItem(NOTIFICATIONS_KEY, '{broken'); fireEvent.click(screen.getByRole('button', { name: 'Làm mới' })); expect(screen.getByRole('alert')).toHaveTextContent('không hợp lệ');
  localStorage.setItem(NOTIFICATIONS_KEY, '[]'); fireEvent.click(screen.getByRole('button', { name: 'Thử lại' })); expect(screen.getByRole('heading', { name: 'Chưa có thông báo' })).toBeInTheDocument();
  view.unmount(); authenticate('reception@pawcare.vn', '123456', true); render(<App />); expect(screen.getByRole('heading', { name: /không có quyền truy cập/ })).toBeInTheDocument();
});
