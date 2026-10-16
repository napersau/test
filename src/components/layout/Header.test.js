import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { findAccount } from '../../features/users/usersRepository';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/'); });
function openHome(account) { if (account) authenticate(account, '123456', true); return render(<App />); }
function openAccount() { fireEvent.click(screen.getByRole('button', { name: 'Mở menu tài khoản' })); return screen.getByRole('region', { name: 'Tài khoản của bạn' }); }

test('guest header keeps login/booking and has no account avatar or pet management link', () => {
  openHome(); const header = within(screen.getByRole('banner'));
  expect(header.getAllByRole('link', { name: 'Đăng nhập' }).length).toBeGreaterThan(0);
  expect(header.getByRole('link', { name: /Đặt lịch/ })).toBeInTheDocument();
  expect(header.queryByRole('button', { name: 'Mở menu tài khoản' })).not.toBeInTheDocument();
  expect(header.queryByRole('link', { name: /Thú cưng của tôi/ })).not.toBeInTheDocument();
});

test('customer avatar replaces standalone account/logout links and navigates directly to pets', async () => {
  openHome('customer@pawcare.vn'); const header = within(screen.getByRole('banner'));
  expect(header.getByRole('button', { name: 'Mở menu tài khoản' })).toHaveAttribute('aria-expanded', 'false');
  expect(header.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument();
  expect(header.getByRole('link', { name: /Thú cưng của tôi/ })).toHaveAttribute('href', '/portal/pets');
  const panel = within(openAccount());
  expect(panel.getByText('Nguyễn Ngọc Lan')).toBeInTheDocument();
  expect(panel.getByRole('link', { name: /^Thông tin cá nhân/ })).toHaveAttribute('href', '/portal/profile');
  expect(panel.queryByRole('link', { name: /^Trang quản trị/ })).not.toBeInTheDocument();
  fireEvent.click(panel.getByRole('link', { name: /^Thú cưng của tôi/ }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Thú cưng của tôi' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/portal/pets'); expect(screen.queryByRole('region', { name: 'Tài khoản của bạn' })).not.toBeInTheDocument();
});

test('admin menu has management but no customer-only pets, and personal profile works without 403', async () => {
  openHome('admin@admin'); let panel = within(openAccount());
  expect(panel.getByRole('link', { name: /^Trang quản trị/ })).toHaveAttribute('href', '/admin/dashboard');
  expect(panel.queryByRole('link', { name: /^Thú cưng của tôi/ })).not.toBeInTheDocument();
  fireEvent.click(panel.getByRole('link', { name: /^Thông tin cá nhân/ }));
  expect(screen.getByRole('heading', { name: 'Thông tin cá nhân' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /không có quyền truy cập/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Chỉnh sửa/ }));
  fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Admin PawCare mới' } });
  fireEvent.click(screen.getByRole('button', { name: /Lưu thông tin/ }));
  expect(findAccount('admin-default')).toMatchObject({ role: 'ADMIN', status: 'ACTIVE', fullName: 'Admin PawCare mới' });
  panel = within(openAccount()); fireEvent.click(panel.getByRole('link', { name: /^Trang quản trị/ }));
  expect(await screen.findByRole('heading', { name: /Xin chào/ })).toBeInTheDocument(); expect(window.location.pathname).toBe('/admin/dashboard');
});

test('staff can open their personal profile without seeing admin/customer-only actions', () => {
  openHome('vet@pawcare.vn'); const panel = within(openAccount());
  expect(panel.queryByRole('link', { name: /^Trang quản trị/ })).not.toBeInTheDocument();
  expect(panel.queryByRole('link', { name: /^Thú cưng của tôi/ })).not.toBeInTheDocument();
  fireEvent.click(panel.getByRole('link', { name: /^Thông tin cá nhân/ }));
  expect(screen.getByRole('heading', { name: 'Thông tin cá nhân' })).toBeInTheDocument(); expect(screen.getByText('Bác sĩ thú y')).toBeInTheDocument();
});

test('Escape restores avatar focus; outside pointer/focus and repeat click close account dropdown', () => {
  openHome('customer@pawcare.vn'); openAccount();
  fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.getByRole('button', { name: 'Mở menu tài khoản' })).toHaveFocus();
  expect(screen.queryByRole('region', { name: 'Tài khoản của bạn' })).not.toBeInTheDocument();
  openAccount(); fireEvent.pointerDown(document.body); expect(screen.queryByRole('region', { name: 'Tài khoản của bạn' })).not.toBeInTheDocument();
  openAccount(); fireEvent.focusIn(screen.getByRole('navigation', { name: 'Điều hướng chính' })); expect(screen.queryByRole('region', { name: 'Tài khoản của bạn' })).not.toBeInTheDocument();
  openAccount(); fireEvent.click(screen.getByRole('button', { name: 'Đóng menu tài khoản' })); expect(screen.queryByRole('region', { name: 'Tài khoản của bạn' })).not.toBeInTheDocument();
});

test('account and mobile navigation never stay open together; Escape closes navigation', () => {
  openHome('customer@pawcare.vn'); fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }));
  expect(screen.getByRole('button', { name: 'Đóng menu' })).toHaveAttribute('aria-expanded', 'true');
  openAccount(); expect(screen.getByRole('button', { name: 'Mở menu' })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Mở menu' })); expect(screen.queryByRole('region', { name: 'Tài khoản của bạn' })).not.toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.getByRole('button', { name: 'Mở menu' })).toHaveFocus();
});

test('logout clears the session and closes the account menu', () => {
  openHome('customer@pawcare.vn'); const panel = within(openAccount());
  fireEvent.click(panel.getByRole('button', { name: 'Đăng xuất' }));
  expect(localStorage.getItem('pawcare_auth_session')).toBeNull(); expect(sessionStorage.getItem('pawcare_auth_session')).toBeNull();
  expect(window.location.pathname).toBe('/auth/login'); expect(screen.getByRole('heading', { name: /Chào mừng/ })).toBeInTheDocument();
});
