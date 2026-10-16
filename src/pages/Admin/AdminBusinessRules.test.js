import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { listLabItems } from '../../features/labConfig/labConfigRepository';
import { listMedicines } from '../../features/medicines/medicinesRepository';
import { findAccount, updateUser } from '../../features/users/usersRepository';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/'); });
function openPage(path) {
  authenticate('admin@admin', '123456', true);
  window.history.replaceState({}, '', path);
  return render(<App />);
}

test('staff page shows fixed rooms and capacity, and assigns a unique room to a doctor', async () => {
  openPage('/admin/staff');
  expect(await screen.findByRole('heading', { name: 'Nhân sự & phòng khám' })).toBeInTheDocument();
  expect(screen.getByText(/2 lịch hẹn/)).toBeInTheDocument();
  expect(screen.getByText('P01')).toBeInTheDocument();
  expect(screen.queryByText(/Chuyên môn|Ghi chú ca|Kinh nghiệm/)).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Đổi phòng' })[0]);
  fireEvent.change(screen.getByLabelText(/Số phòng của/), { target: { value: 'p02' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu phòng' }));
  expect(await screen.findByText('Phòng khám này đã được gán cho bác sĩ khác.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Số phòng của/), { target: { value: 'p07' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu phòng' }));
  expect(await screen.findByText('P07')).toBeInTheDocument();
  expect(findAccount('vet-demo').roomNumber).toBe('P07');
});

test('locking a doctor lowers the booking capacity shown to the admin', async () => {
  openPage('/admin/staff');
  expect(await screen.findByText(/2 lịch hẹn/)).toBeInTheDocument();
  updateUser('admin-default', 'vet-two', { status: 'LOCKED' });
  expect(await screen.findByText(/1 lịch hẹn/)).toBeInTheDocument();
});

test('users page offers all three statuses, and creates only staff accounts', async () => {
  openPage('/admin/users');
  expect(await screen.findByRole('heading', { name: 'Tài khoản & người dùng' })).toBeInTheDocument();
  const status = screen.getByLabelText('Lọc trạng thái');
  expect([...status.options].map((option) => option.value)).toEqual(['', 'ACTIVE', 'INACTIVE', 'LOCKED']);
  fireEvent.click(screen.getByRole('button', { name: 'Thêm nhân viên' }));
  const dialog = screen.getByRole('dialog');
  expect([...within(dialog).getByLabelText('Vai trò').options].map((option) => option.value)).toEqual(['RECEPTIONIST', 'VETERINARIAN']);
  expect(within(dialog).getByLabelText('Số phòng khám cố định (ví dụ P01)')).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('Vai trò'), { target: { value: 'RECEPTIONIST' } });
  expect(within(dialog).queryByLabelText('Số phòng khám cố định (ví dụ P01)')).not.toBeInTheDocument();
});

test('lab config page lists species-specific ranges and edits one with validation', async () => {
  openPage('/admin/lab-config');
  expect(await screen.findByRole('heading', { name: 'Chỉ số xét nghiệm & khoảng tham chiếu' })).toBeInTheDocument();
  expect(screen.getByText('6 – 17')).toBeInTheDocument();
  expect(screen.getByText('5.5 – 19.5')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa Bạch cầu' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Ngưỡng dưới Mèo'), { target: { value: '30' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu chỉ số' }));
  expect(await within(dialog).findByText('Ngưỡng dưới phải nhỏ hơn ngưỡng trên.')).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('Ngưỡng dưới Mèo'), { target: { value: '6' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu chỉ số' }));
  expect(await screen.findByText('Đã cập nhật chỉ số xét nghiệm.')).toBeInTheDocument();
  expect(listLabItems('admin-default').find((item) => item.code === 'WBC').ranges.CAT).toEqual({ min: 6, max: 19.5 });
});

test('laboratory services must pick indicators; other categories hide the picker', async () => {
  openPage('/admin/services');
  fireEvent.click(await screen.findByRole('button', { name: 'Thêm dịch vụ' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).queryByText('Chỉ số xét nghiệm của gói *')).not.toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('Nhóm dịch vụ'), { target: { value: 'LABORATORY' } });
  expect(within(dialog).getByText('Chỉ số xét nghiệm của gói *')).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('Mã dịch vụ'), { target: { value: 'DV-LAB2' } });
  fireEvent.change(within(dialog).getByLabelText('Tên dịch vụ'), { target: { value: 'Sinh hóa máu' } });
  fireEvent.change(within(dialog).getByLabelText('Đơn giá (VND)'), { target: { value: '300000' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu dịch vụ' }));
  expect(await within(dialog).findByText('Chọn ít nhất một chỉ số xét nghiệm cho dịch vụ này.')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByLabelText(/GLUCOSE/));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu dịch vụ' }));
  expect(await screen.findByText('Đã thêm dịch vụ.')).toBeInTheDocument();
});

test('medicine stock can be adjusted with a reason and appears in the stock log', async () => {
  openPage('/admin/medicines');
  fireEvent.click(await screen.findByRole('button', { name: 'Lô hàng Amoxicillin 250 mg' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Điều chỉnh lô LOT-001' }));
  fireEvent.change(within(dialog).getByLabelText(/Số lượng ±/), { target: { value: '-20' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu điều chỉnh' }));
  expect(await within(dialog).findByText(/Nhập lý do điều chỉnh/)).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('Lý do điều chỉnh'), { target: { value: 'Kiểm kê thiếu' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu điều chỉnh' }));
  expect(await within(dialog).findByText('Đã điều chỉnh tồn kho và ghi nhật ký.')).toBeInTheDocument();
  expect(within(within(dialog).getByRole('region', { name: 'Nhật ký kho' })).getByText('Điều chỉnh')).toBeInTheDocument();
  expect(listMedicines('admin-default').find((item) => item.id === 'medicine-1').availableStock).toBe(100);
});

test('dashboard shows booking capacity and low stock warnings', async () => {
  openPage('/admin/dashboard');
  expect(await screen.findByRole('heading', { name: 'Sức chứa đặt lịch' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Cảnh báo tồn kho thuốc' })).toBeInTheDocument();
  expect(await screen.findByText(/Thuốc tẩy giun thú y/)).toBeInTheDocument();
});
