import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import ProfilePage from './ProfilePage';

const customer = {
  id: 'customer-test',
  role: 'CUSTOMER',
  fullName: 'Nguyễn Văn A',
  email: 'customer@pawcare.vn',
  phone: '0901234567',
  address: '',
  receiveAppointmentReminders: true,
  receiveHealthTips: true,
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('pawcare_auth_session', JSON.stringify(customer));
});

test('customer can edit and persist personal information', () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><ProfilePage /></AuthProvider></MemoryRouter>);

  fireEvent.click(screen.getByRole('button', { name: /chỉnh sửa/i }));
  const nameInput = screen.getByLabelText(/họ và tên/i);
  fireEvent.change(nameInput, { target: { value: 'Nguyễn Minh Anh' } });
  fireEvent.click(screen.getByRole('button', { name: /lưu thông tin/i }));

  expect(screen.getByRole('status')).toHaveTextContent(/thông tin cá nhân đã được lưu/i);
  expect(JSON.parse(localStorage.getItem('pawcare_customer_profile')).fullName).toBe('Nguyễn Minh Anh');
});
