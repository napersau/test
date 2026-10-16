import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { getPet, listPets, PETS_KEY, savePet, setPetStatus } from '../../features/pets/petsRepository';
import { preparePetPhoto } from '../../features/pets/petPhoto';
import { dateOffset } from '../../features/catalog/catalogPolicy';

jest.mock('../../features/pets/petPhoto', () => ({ preparePetPhoto: jest.fn() }));
const PHOTO = 'data:image/png;base64,aGVsbG8=';
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/'); preparePetPhoto.mockReset(); });
afterEach(() => jest.restoreAllMocks());
function openPage(path = '/portal/pets', account = 'customer@pawcare.vn') { authenticate(account, '123456', true); window.history.replaceState({}, '', path); return render(<App />); }
function field(label, value) { fireEvent.change(within(screen.getByRole('dialog')).getByLabelText(label), { target: { value } }); }

test('pet portal shares header/footer, searches without accents and supports species/empty filters', async () => {
  openPage();
  expect(await screen.findByRole('heading', { name: 'Những người bạn của bạn' })).toBeInTheDocument();
  expect(screen.getByRole('banner')).toBeInTheDocument(); expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  expect(within(screen.getByRole('navigation', { name: 'Khu vực khách hàng' })).getByRole('link', { name: /Thú cưng của tôi/ })).toHaveAttribute('aria-current', 'page');
  expect(screen.getAllByRole('article')).toHaveLength(2);
  fireEvent.change(screen.getByLabelText('Tìm thú cưng'), { target: { value: 'bo' } });
  expect(screen.getByRole('heading', { name: 'Bô' })).toBeInTheDocument(); expect(screen.queryByRole('heading', { name: 'Bella' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Lọc loài'), { target: { value: 'CAT' } });
  expect(screen.getByRole('heading', { name: 'Không tìm thấy thú cưng' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' })); expect(screen.getAllByRole('article')).toHaveLength(2);
});

test('creates with validation/photo preview, opens detail, edits and persists on remount', async () => {
  preparePetPhoto.mockResolvedValue(PHOTO);
  const view = openPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Thêm thú cưng' }));
  let dialog = screen.getByRole('dialog'); expect(within(dialog).getByLabelText('Tên thú cưng')).toHaveFocus();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thú cưng' })); expect(within(dialog).getByRole('alert')).toHaveTextContent(/kiểm tra/);
  field('Tên thú cưng', 'Mít'); field('Loài', 'CAT'); field('Giống', 'Mèo Anh'); field('Ngày sinh', dateOffset(-500)); field('Cân nặng (kg)', '-3');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thú cưng' })); expect(within(dialog).getByText(/Cân nặng từ/)).toBeInTheDocument();
  field('Cân nặng (kg)', '4.25'); field('Thông tin dị ứng', 'Lưu ý thử nghiệm');
  fireEvent.change(within(dialog).getByLabelText('Ảnh thú cưng'), { target: { files: [new File(['photo'], 'pet.png', { type: 'image/png' })] } });
  expect(await within(dialog).findByAltText('Ảnh của bé Mít')).toHaveAttribute('src', PHOTO);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thú cưng' }));
  expect(await screen.findByText('Đã thêm thú cưng vào gia đình của bạn.')).toBeInTheDocument();
  const created = listPets('customer-demo').find((pet) => pet.name === 'Mít'); expect(created.weight).toBe(4.25);
  fireEvent.click(within(screen.getByRole('article', { name: 'Hồ sơ Mít' })).getByRole('link', { name: /Xem hồ sơ/ }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Mít' })).toBeInTheDocument(); expect(screen.getByText('Lưu ý thử nghiệm')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' })); dialog = screen.getByRole('dialog'); field('Màu lông', 'Xám bạc');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' })); expect(await screen.findByText('Đã cập nhật thông tin thú cưng.')).toBeInTheDocument();
  expect(getPet('customer-demo', created.id).color).toBe('Xám bạc');
  view.unmount(); render(<App />); expect(await screen.findByText('Xám bạc')).toBeInTheDocument();
});

test('dirty cancellation is confirmed; invalid photo error keeps form recoverable', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  preparePetPhoto.mockRejectedValue(new Error('Ảnh không được lớn hơn 2 MB.'));
  openPage(); fireEvent.click(await screen.findByRole('button', { name: 'Thêm thú cưng' }));
  field('Tên thú cưng', 'Chưa lưu');
  fireEvent.change(screen.getByLabelText('Ảnh thú cưng'), { target: { files: [new File(['photo'], 'pet.png', { type: 'image/png' })] } });
  expect(await screen.findByText('Ảnh không được lớn hơn 2 MB.')).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy' })); expect(confirm).toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeInTheDocument();
  confirm.mockReturnValue(true); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(listPets('customer-demo')).toHaveLength(2);
});

test('archives and restores without deleting; filters update and persist', async () => {
  openPage(); fireEvent.click(await screen.findByRole('button', { name: 'Lưu trữ Bô' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận lưu trữ' }));
  expect(await screen.findByText(/Đã lưu trữ hồ sơ. Thông tin/)).toBeInTheDocument(); expect(screen.queryByRole('heading', { name: 'Bô' })).not.toBeInTheDocument();
  expect(getPet('customer-demo', 'pet-bo-demo').status).toBe('ARCHIVED');
  fireEvent.change(screen.getByLabelText('Lọc trạng thái hồ sơ'), { target: { value: 'ARCHIVED' } }); expect(screen.getByRole('heading', { name: 'Bô' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Chỉnh sửa Bô' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Khôi phục Bô' })); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận khôi phục' }));
  expect(await screen.findByText('Đã khôi phục hồ sơ thú cưng.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Lọc trạng thái hồ sơ'), { target: { value: 'ACTIVE' } }); expect(screen.getByRole('heading', { name: 'Bô' })).toBeInTheDocument();
});

test('new customers have no borrowed pets; list paginates and reacts to storage changes', async () => {
  openPage('/portal/pets', 'nam@pawcare.vn'); expect(await screen.findByRole('heading', { name: 'Gia đình nhỏ đang chờ thành viên mới' })).toBeInTheDocument();
  act(() => { for (let index = 0; index < 7; index++) savePet('customer-two', { name: `Bé ${index}` }); });
  expect(screen.getAllByRole('article')).toHaveLength(6); fireEvent.click(screen.getByRole('button', { name: 'Trang sau' })); expect(screen.getAllByRole('article')).toHaveLength(1);
  fireEvent.change(screen.getByLabelText('Tìm thú cưng'), { target: { value: 'Bé 0' } }); expect(screen.getByText(/Trang 1\/1/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Bé 0' })).toBeInTheDocument(); expect(screen.queryByRole('heading', { name: 'Bô' })).not.toBeInTheDocument();
});

test('malformed storage is not overwritten; retry recovers and add is disabled during errors', async () => {
  localStorage.setItem(PETS_KEY, '{bad'); openPage();
  expect(await screen.findByRole('heading', { name: 'Không thể tải hồ sơ thú cưng' })).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Thêm thú cưng' })).toBeDisabled();
  expect(localStorage.getItem(PETS_KEY)).toBe('{bad'); localStorage.setItem(PETS_KEY, '[]'); fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(screen.getByRole('heading', { name: 'Gia đình nhỏ đang chờ thành viên mới' })).toBeInTheDocument();
});

test('foreign and missing detail URLs reveal no pet information', async () => {
  openPage('/portal/pets/pet-bo-demo', 'nam@pawcare.vn');
  expect(await screen.findByRole('heading', { name: 'Không tìm thấy thú cưng' })).toBeInTheDocument(); expect(screen.queryByRole('heading', { name: 'Bô' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Chỉnh sửa hồ sơ' })).not.toBeInTheDocument();
});

test.each(['/portal/pets', '/portal/pets/pet-bo-demo'])('admin cannot access customer pet route %s', (path) => {
  openPage(path, 'admin@admin'); expect(screen.getByRole('heading', { name: /không có quyền truy cập/ })).toBeInTheDocument(); expect(screen.queryByRole('article')).not.toBeInTheDocument();
});

test('anonymous pet visitors go to login', () => {
  window.history.replaceState({}, '', '/portal/pets'); render(<App />); expect(window.location.pathname).toBe('/auth/login');
});

test('a newly created pet is visible even when the previous search/species/status filters exclude it', async () => {
  openPage();
  fireEvent.change(await screen.findByLabelText('Tìm thú cưng'), { target: { value: 'Không trùng tên' } });
  fireEvent.change(screen.getByLabelText('Lọc loài'), { target: { value: 'CAT' } });
  fireEvent.change(screen.getByLabelText('Lọc trạng thái hồ sơ'), { target: { value: 'ARCHIVED' } });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm thú cưng' }));
  field('Tên thú cưng', 'Mochi');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu thú cưng' }));
  expect(await screen.findByRole('heading', { name: 'Mochi' })).toBeInTheDocument();
  expect(screen.getByLabelText('Tìm thú cưng')).toHaveValue('');
  expect(screen.getByLabelText('Lọc loài')).toHaveValue('');
  expect(screen.getByLabelText('Lọc trạng thái hồ sơ')).toHaveValue('ACTIVE');
  expect(getPet('customer-demo', listPets('customer-demo').find((pet) => pet.name === 'Mochi').id).status).toBe('ACTIVE');
});

test('detail editor keeps its initial revision and cannot overwrite a newer update', async () => {
  openPage('/portal/pets/pet-bo-demo');
  fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }));
  field('Màu lông', 'Thay đổi từ form cũ');
  act(() => { savePet('customer-demo', { color: 'Thông tin mới ở tab khác' }, 'pet-bo-demo'); });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu thay đổi' }));
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(/vừa được cập nhật/);
  expect(getPet('customer-demo', 'pet-bo-demo').color).toBe('Thông tin mới ở tab khác');
  expect(screen.queryByText('Đã cập nhật thông tin thú cưng.')).not.toBeInTheDocument();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy' }));
  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }));
  expect(within(screen.getByRole('dialog')).getByLabelText('Màu lông')).toHaveValue('Thông tin mới ở tab khác');
  field('Màu lông', 'Thông tin sau khi tải lại');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu thay đổi' }));
  expect(await screen.findByText('Đã cập nhật thông tin thú cưng.')).toBeInTheDocument();
  expect(getPet('customer-demo', 'pet-bo-demo').color).toBe('Thông tin sau khi tải lại');
});

test('storage failure keeps the editor and unsaved values so the customer can retry', async () => {
  openPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Thêm thú cưng' }));
  field('Tên thú cưng', 'Mít chưa lưu');
  const original = Storage.prototype.setItem;
  const write = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === PETS_KEY) throw new Error('Quota');
    return original.call(this, key, value);
  });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu thú cưng' }));
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(/Không lưu được hồ sơ/);
  expect(within(screen.getByRole('dialog')).getByLabelText('Tên thú cưng')).toHaveValue('Mít chưa lưu');
  expect(listPets('customer-demo').some((pet) => pet.name === 'Mít chưa lưu')).toBe(false);
  write.mockRestore();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu thú cưng' }));
  expect(await screen.findByRole('heading', { name: 'Mít chưa lưu' })).toBeInTheDocument();
  expect(listPets('customer-demo').filter((pet) => pet.name === 'Mít chưa lưu')).toHaveLength(1);
});

test('archived detail remains readable and can be restored before editing', async () => {
  setPetStatus('customer-demo', 'pet-bo-demo', 'ARCHIVED');
  openPage('/portal/pets/pet-bo-demo');
  expect(await screen.findByRole('heading', { level: 1, name: 'Bô' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Chỉnh sửa hồ sơ' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Khôi phục hồ sơ' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận khôi phục' }));
  expect(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' })).toBeInTheDocument();
  expect(getPet('customer-demo', 'pet-bo-demo').status).toBe('ACTIVE');
});
