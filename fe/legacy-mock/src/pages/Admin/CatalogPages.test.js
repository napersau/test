import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { listServices, SERVICES_KEY } from '../../features/services/servicesRepository';
import { listMedicines } from '../../features/medicines/medicinesRepository';
import { dateOffset } from '../../features/catalog/catalogPolicy';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/'); });
function openPage(path, account = 'admin@admin') {
  authenticate(account, '123456', true);
  window.history.replaceState({}, '', path);
  return render(<App />);
}
function change(dialog, label, value) { fireEvent.change(within(dialog).getByLabelText(label), { target: { value } }); }

test('service page searches without accents, paginates, creates, edits, stops and activates', async () => {
  openPage('/admin/services');
  expect(await screen.findByRole('heading', { name: 'Quản lý dịch vụ' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  expect(screen.getByText('Thay băng, rửa vết thương')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Tìm dịch vụ'), { target: { value: 'sieu am' } });
  expect(screen.getByText('Siêu âm ổ bụng')).toBeInTheDocument();
  expect(screen.queryByText('Khám tổng quát')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
  fireEvent.click(screen.getByRole('button', { name: 'Thêm dịch vụ' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu dịch vụ' }));
  expect(within(dialog).getByRole('alert')).toBeInTheDocument();
  change(dialog, 'Mã dịch vụ', 'DV-TEST'); change(dialog, 'Tên dịch vụ', 'Khám thử nghiệm'); change(dialog, 'Đơn giá (VND)', '175000');
  change(dialog, 'Nhóm dịch vụ', 'IMAGING');
  expect(within(dialog).queryByLabelText('Yêu cầu kết quả')).not.toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu dịch vụ' }));
  expect(within(dialog).getByRole('button', { name: 'Đang lưu…' })).toBeDisabled();
  expect(await screen.findByText('Đã thêm dịch vụ.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Tìm dịch vụ'), { target: { value: 'dv-test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa Khám thử nghiệm' }));
  change(screen.getByRole('dialog'), 'Đơn giá (VND)', '190000');
  fireEvent.click(screen.getByRole('button', { name: 'Lưu dịch vụ' }));
  expect(await screen.findByText('Đã cập nhật dịch vụ.')).toBeInTheDocument();
  expect(listServices('admin-default').find((item) => item.code === 'DV-TEST')).toMatchObject({ price: 190000, serviceType: 'IMAGING', requiresResult: true, allowsAttachment: true });
  fireEvent.click(screen.getByRole('button', { name: 'Ngừng Khám thử nghiệm' }));
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ngừng' }));
  expect(await screen.findByText('Đã ngừng sử dụng dịch vụ.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Kích hoạt Khám thử nghiệm' }));
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận kích hoạt' }));
  expect(await screen.findByText('Đã kích hoạt dịch vụ.')).toBeInTheDocument();
});

test('medicine page filters warnings, creates medicine, imports batch, rejects duplicates and persists on remount', async () => {
  const view = openPage('/admin/medicines');
  expect(await screen.findByRole('heading', { name: 'Quản lý thuốc' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Lọc cảnh báo tồn kho'), { target: { value: 'expired' } });
  expect(screen.getByText('Vitamin tổng hợp')).toBeInTheDocument();
  expect(screen.queryByText('Amoxicillin 250 mg')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
  fireEvent.click(screen.getByRole('button', { name: 'Thêm thuốc' }));
  let dialog = screen.getByRole('dialog');
  change(dialog, 'Mã thuốc', 'TH-TEST'); change(dialog, 'Tên thuốc', 'Thuốc kiểm thử'); change(dialog, 'Giá bán (VND/đơn vị)', '20000');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thuốc' }));
  expect(await screen.findByText('Đã thêm thuốc.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Tìm thuốc'), { target: { value: 'TH-TEST' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lô hàng Thuốc kiểm thử' }));
  dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(/Chưa có lô hàng/)).toBeInTheDocument();
  change(dialog, 'Số lô', 'TEST-LOT'); change(dialog, 'Hạn sử dụng', dateOffset(12)); change(dialog, 'Số lượng nhập (viên)', '15'); change(dialog, 'Giá nhập (VND/đơn vị)', '15000');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Nhập lô hàng' }));
  expect(await within(dialog).findByText('Đã nhập lô hàng và cập nhật tồn kho.')).toBeInTheDocument();
  expect(within(dialog).getByText('TEST-LOT')).toBeInTheDocument();
  expect(listMedicines('admin-default').find((item) => item.code === 'TH-TEST')).toMatchObject({ availableStock: 15, nearExpiryBatches: 1 });
  change(dialog, 'Số lô', 'TEST-LOT'); change(dialog, 'Hạn sử dụng', dateOffset(12)); change(dialog, 'Số lượng nhập (viên)', '15'); change(dialog, 'Giá nhập (VND/đơn vị)', '15000');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Nhập lô hàng' }));
  expect(await within(dialog).findByText('Số lô này đã tồn tại cho thuốc này.')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }));
  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa Thuốc kiểm thử' }));
  expect(screen.getByLabelText('Đơn vị tính')).toBeDisabled();
  change(screen.getByRole('dialog'), 'Giá bán (VND/đơn vị)', '25000');
  fireEvent.click(screen.getByRole('button', { name: 'Lưu thuốc' }));
  expect(await screen.findByText('Đã cập nhật thuốc.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ngừng Thuốc kiểm thử' }));
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ngừng' }));
  expect(await screen.findByText('Đã ngừng sử dụng thuốc.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Lô hàng Thuốc kiểm thử' }));
  expect(screen.getByRole('button', { name: 'Nhập lô hàng' })).toBeDisabled();
  view.unmount(); render(<App />);
  expect(await screen.findByText('Thuốc kiểm thử')).toBeInTheDocument();
  expect(listMedicines('admin-default').find((item) => item.code === 'TH-TEST')).toMatchObject({ availableStock: 15, status: 'INACTIVE', salePrice: 25000 });
});

test('catalog shows empty search and recoverable loading errors', async () => {
  localStorage.setItem(SERVICES_KEY, '{bad');
  openPage('/admin/services');
  expect(await screen.findByRole('heading', { name: 'Không thể tải danh mục' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Thêm dịch vụ' })).toBeDisabled();
  localStorage.removeItem(SERVICES_KEY);
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('Khám tổng quát')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Tìm dịch vụ'), { target: { value: 'not-found-123' } });
  expect(screen.getByRole('heading', { name: 'Không tìm thấy dịch vụ' })).toBeInTheDocument();
});

test.each(['/admin/services', '/admin/medicines'])('customers are denied catalog route %s', (path) => {
  openPage(path, 'customer@pawcare.vn');
  expect(screen.getByRole('heading', { name: /không có quyền truy cập/ })).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
