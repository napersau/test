import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

test('users page filters, creates a user, and confirms locking', async () => {
  authenticate('admin@admin', '123456', true);
  window.history.replaceState({}, '', '/admin/users');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Tài khoản & người dùng' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  expect(screen.getByText('Vũ Bảo Ngọc')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Trang trước' }));

  fireEvent.change(screen.getByRole('textbox', { name: 'Tìm người dùng' }), { target: { value: 'Le Thu Thao' } });
  expect(screen.getByText('Lê Thu Thảo')).toBeInTheDocument();
  expect(screen.queryByText('Nguyễn Ngọc Lan')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));

  fireEvent.click(screen.getByRole('button', { name: 'Thêm nhân viên' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Họ và tên'), { target: { value: 'Người dùng mới' } });
  fireEvent.change(within(dialog).getByLabelText('Email đăng nhập'), { target: { value: 'new@pawcare.vn' } });
  fireEvent.change(within(dialog).getByLabelText('Số điện thoại'), { target: { value: '0988776655' } });
  fireEvent.change(within(dialog).getByLabelText('Số phòng khám cố định (ví dụ P01)'), { target: { value: 'p05' } });
  fireEvent.change(within(dialog).getByLabelText('Mật khẩu khởi tạo'), { target: { value: '123456' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu tài khoản' }));
  expect(await screen.findByText(/Đã tạo tài khoản/)).toBeInTheDocument();

  fireEvent.change(screen.getByRole('textbox', { name: 'Tìm người dùng' }), { target: { value: 'new@pawcare.vn' } });
  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa Người dùng mới' }));
  fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Người dùng cập nhật' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu tài khoản' }));
  expect(await screen.findByText('Đã cập nhật tài khoản.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Khóa Người dùng cập nhật' }));
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận khóa' }));
  expect(await screen.findByText('Đã khóa tài khoản.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mở khóa Người dùng cập nhật' })).toBeInTheDocument();
});

test('customer cannot open admin pages and receives 403', async () => {
  authenticate('customer@pawcare.vn', '123456', true);
  window.history.replaceState({}, '', '/admin/users');
  render(<App />);
  expect(screen.getByRole('heading', { name: /không có quyền truy cập/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Thêm nhân viên' })).not.toBeInTheDocument();
});

test('anonymous admin access redirects to login and preserves returnTo', async () => {
  window.history.replaceState({}, '', '/admin/users');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dùng tài khoản' }));
  fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập/ }));
  expect(await screen.findByRole('heading', { name: 'Tài khoản & người dùng' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/admin/users');
});
