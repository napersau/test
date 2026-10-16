import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { DEMO_KEY } from '../../features/demo/demoConfig';
import { APPOINTMENTS_KEY } from '../../features/appointments/appointmentPolicy';
import { loadDemoDataset } from '../../features/demo/demoRepository';
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/admin/dashboard'); authenticate('admin@admin', '123456', true); });
test('explicit confirmation seeds once, refreshes dashboard and survives remount without changing session', async () => {
  const view = render(<App />); const session = localStorage.getItem('pawcare_auth_session');
  fireEvent.click(await screen.findByRole('button', { name: 'Nạp dữ liệu demo' }));
  const dialog = within(screen.getByRole('dialog')); expect(dialog.getByRole('button', { name: 'Xác nhận nạp demo' })).toBeDisabled();
  fireEvent.click(dialog.getByRole('checkbox')); fireEvent.click(dialog.getByRole('button', { name: 'Xác nhận nạp demo' }));
  expect(await screen.findByText(/Đã nạp dữ liệu demo cho 4 vai trò/)).toBeInTheDocument(); expect(screen.getByText('customer@pawcare.vn', { selector: 'code' })).toBeInTheDocument(); expect(localStorage.getItem(DEMO_KEY)).not.toBeNull();
  expect(localStorage.getItem('pawcare_auth_session')).toBe(session); expect(screen.queryByRole('button', { name: 'Nạp dữ liệu demo' })).not.toBeInTheDocument();
  const appointments = localStorage.getItem(APPOINTMENTS_KEY); view.unmount(); render(<App />);
  expect(await screen.findByText('vet@pawcare.vn', { selector: 'code' })).toBeInTheDocument(); expect(localStorage.getItem(APPOINTMENTS_KEY)).toBe(appointments);
});
test('cancel is non-mutating and existing corrupt source shows an actionable error', async () => {
  render(<App />); fireEvent.click(await screen.findByRole('button', { name: 'Nạp dữ liệu demo' })); fireEvent.click(screen.getByRole('button', { name: 'Hủy' })); expect(localStorage.getItem(DEMO_KEY)).toBeNull();
  localStorage.setItem(APPOINTMENTS_KEY, '{broken'); fireEvent.click(screen.getByRole('button', { name: 'Nạp dữ liệu demo' })); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Xác nhận nạp demo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('bị lỗi JSON'); expect(localStorage.getItem(APPOINTMENTS_KEY)).toBe('{broken'); expect(localStorage.getItem(DEMO_KEY)).toBeNull();
});

test('existing V1 enables explicit V2 confirmation, adds counts once and survives remount', async () => {
  loadDemoDataset('admin-default'); const view = render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Bổ sung dữ liệu demo V2' }));
  const dialog = within(screen.getByRole('dialog')); expect(dialog.getByRole('button', { name: 'Xác nhận nạp demo' })).toBeDisabled();
  fireEvent.click(dialog.getByRole('checkbox')); fireEvent.click(dialog.getByRole('button', { name: 'Xác nhận nạp demo' }));
  expect(await screen.findByText(/Đã bổ sung V2:/)).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(DEMO_KEY))).toMatchObject({ revision: 2, counts: { appointments: 36, visits: 24, invoices: 17, staff: 6 } });
  expect(screen.queryByRole('button', { name: 'Bổ sung dữ liệu demo V2' })).not.toBeInTheDocument();
  const appointments = localStorage.getItem(APPOINTMENTS_KEY); view.unmount(); render(<App />);
  expect(await screen.findByText(/Bộ bổ sung V2 đã nạp/)).toBeInTheDocument(); expect(localStorage.getItem(APPOINTMENTS_KEY)).toBe(appointments);
});

test('refresh needs confirmation, then reloads demo rows without touching the session', async () => {
  loadDemoDataset('admin-default'); render(<App />); const session = localStorage.getItem('pawcare_auth_session');
  fireEvent.click(await screen.findByRole('button', { name: 'Làm mới dữ liệu demo' }));
  const dialog = within(screen.getByRole('dialog')); expect(dialog.getByRole('button', { name: 'Xác nhận làm mới' })).toBeDisabled();
  fireEvent.click(dialog.getByRole('checkbox')); fireEvent.click(dialog.getByRole('button', { name: 'Xác nhận làm mới' }));
  expect(await screen.findByText(/Đã làm mới dữ liệu demo/)).toBeInTheDocument();
  expect(localStorage.getItem('pawcare_auth_session')).toBe(session); expect(JSON.parse(localStorage.getItem(DEMO_KEY)).counts.appointments).toBe(30);
});
