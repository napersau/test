import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import App from '../../App';
import RegisterPage from './RegisterPage';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.pushState({}, '', '/');
});

test('login page submits valid demo credentials', () => {
  window.history.pushState({}, '', '/auth/login');
  render(<App />);

  fireEvent.change(screen.getByLabelText(/email hoặc số điện thoại/i), { target: { value: 'admin@admin' } });
  fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), { target: { value: '123456' } });
  fireEvent.click(screen.getByLabelText(/ghi nhớ đăng nhập/i));
  fireEvent.submit(screen.getByRole('button', { name: /^đăng nhập/i }).closest('form'));

  expect(screen.getByRole('heading', { name: /xin chào/i })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/admin/dashboard');
  expect(localStorage.getItem('pawcare_auth_session')).not.toBeNull();
});

test('register page reports mismatched passwords', () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><RegisterPage /></AuthProvider></MemoryRouter>);

  fireEvent.change(screen.getByLabelText(/^mật khẩu$/i), { target: { value: 'password-one' } });
  fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu/i), { target: { value: 'password-two' } });
  fireEvent.submit(screen.getByRole('button', { name: /tạo tài khoản/i }).closest('form'));

  expect(screen.getByText(/mật khẩu xác nhận chưa khớp/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/xác nhận mật khẩu/i)).toHaveAttribute('aria-invalid', 'true');
});
