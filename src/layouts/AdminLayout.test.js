import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { authenticate } from '../features/auth/authStorage';
import { ADMIN_THEME_KEY } from '../features/admin/useAdminTheme';

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  authenticate('admin@admin', '123456', true);
  window.history.replaceState({}, '', '/admin/users');
});

test('admin defaults to dark; theme persists across pages, dialogs, and stays off the public site', async () => {
  render(<App />);
  expect(screen.getByTestId('admin-shell')).toHaveAttribute('data-theme', 'dark');
  fireEvent.click(screen.getByRole('button', { name: 'Chuyển sang giao diện sáng' }));
  expect(screen.getByTestId('admin-shell')).toHaveAttribute('data-theme', 'light');
  expect(localStorage.getItem(ADMIN_THEME_KEY)).toBe('light');
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Điều hướng quản trị' })).getByRole('link', { name: 'Dịch vụ' }));
  expect(await screen.findByRole('heading', { name: 'Quản lý dịch vụ' })).toBeInTheDocument();
  expect(screen.getByTestId('admin-shell')).toHaveAttribute('data-theme', 'light');
  fireEvent.click(screen.getByRole('button', { name: 'Thêm dịch vụ' }));
  expect(screen.getByTestId('admin-shell')).toContainElement(screen.getByRole('dialog'));
  fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
  fireEvent.click(screen.getByRole('link', { name: 'Về trang chủ PawCare' }));
  expect(screen.queryByTestId('admin-shell')).not.toBeInTheDocument();
  expect(document.documentElement).not.toHaveClass('dark');
  expect(document.body).not.toHaveClass('dark');
});

test('header search supports Vietnamese without accents and navigates to an existing admin page', async () => {
  render(<App />);
  const search = screen.getByRole('search');
  fireEvent.change(within(search).getByRole('searchbox', { name: 'Tìm trang quản trị' }), { target: { value: 'thuoc' } });
  expect(within(search).getByRole('link', { name: 'Thuốc & kho' })).toBeInTheDocument();
  fireEvent.submit(search);
  expect(await screen.findByRole('heading', { name: 'Quản lý thuốc' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/admin/medicines');
});

test('mobile navigation closes on Escape and restores focus to the menu button', () => {
  render(<App />);
  const button = screen.getByRole('button', { name: 'Mở menu quản trị' });
  fireEvent.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'true');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(button).toHaveFocus();
});
