import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { getReceptionCustomer, listReceptionCustomers, saveReceptionCustomer } from '../../features/reception/customersRepository';
import { CUSTOMERS_KEY } from '../../features/reception/customerProfileStorage';
import { getPet, listReceptionPets, savePet } from '../../features/pets/petsRepository';
import { updateOwnProfile } from '../../features/users/usersRepository';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/'); });
afterEach(() => jest.restoreAllMocks());
const open = (path = '/reception/customers', email = 'reception@pawcare.vn') => { authenticate(email, '123456', true); window.history.replaceState({}, '', path); return render(<App />); };
const field = (name, value) => fireEvent.change(within(screen.getByRole('dialog')).getByLabelText(name), { target: { value } });

test('shared staff shell, searches without accents, filters source and paginates profiles', async () => {
  open();
  expect(await screen.findByRole('heading', { name: 'Quản lý khách hàng' })).toBeInTheDocument();
  expect(screen.getByRole('banner')).toBeInTheDocument(); expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  expect(within(screen.getByRole('navigation', { name: 'Điều hướng lễ tân' })).getByRole('link', { name: 'Thông tin khách hàng' })).toHaveAttribute('aria-current', 'page');
  fireEvent.change(screen.getByLabelText('Tìm khách hàng'), { target: { value: 'ngoc lan' } });
  expect(screen.getByRole('link', { name: 'Nguyễn Ngọc Lan' })).toBeInTheDocument(); expect(screen.queryByRole('link', { name: 'Phạm Hoàng Nam' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Lọc loại khách hàng'), { target: { value: 'WALK_IN' } });
  expect(screen.getByRole('heading', { name: 'Không tìm thấy khách hàng' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
  act(() => { for (let index = 0; index < 7; index++) saveReceptionCustomer('reception-demo', { fullName: `Khách ${index}`, phone: `091111110${index}`, email: '', address: '' }); });
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(7);
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(5);
});

test('validates, rejects duplicate phone, preserves form for retry and makes created profile visible', async () => {
  open(); fireEvent.change(await screen.findByLabelText('Tìm khách hàng'), { target: { value: 'không trùng' } });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm khách hàng' }));
  const dialog = screen.getByRole('dialog'); expect(within(dialog).getByLabelText(/Họ và tên/)).toHaveFocus();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu khách hàng' }));
  expect(within(dialog).getByText(/Nhập họ tên/)).toBeInTheDocument();
  field(/Họ và tên/, 'Khách thử nghiệm'); field(/Số điện thoại/, '0902345678');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu khách hàng' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(/trùng/);
  expect(within(dialog).getByLabelText(/Họ và tên/)).toHaveValue('Khách thử nghiệm');
  field(/Số điện thoại/, '0911111111');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu khách hàng' }));
  expect(await screen.findByRole('link', { name: 'Khách thử nghiệm' })).toBeInTheDocument();
  expect(screen.getByLabelText('Tìm khách hàng')).toHaveValue('');
  expect(listReceptionCustomers('reception-demo').find((item) => item.fullName === 'Khách thử nghiệm').source).toBe('WALK_IN');
});

test('customer detail fixes owner for pet creation and persisted edit/archive/restore', async () => {
  const view = open('/reception/customers/customer-two');
  expect(await screen.findByRole('heading', { name: 'Khách hàng chưa có thú cưng' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Thêm thú cưng' }));
  let dialog = screen.getByRole('dialog');
  expect(within(dialog).queryByRole('combobox', { name: /Chủ nuôi/ })).not.toBeInTheDocument();
  field('Tên thú cưng', 'Mít lễ tân'); field('Loài', 'CAT'); field('Thông tin dị ứng', 'Lưu ý chủ nuôi');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thú cưng' }));
  expect(await screen.findByRole('heading', { name: 'Mít lễ tân' })).toBeInTheDocument();
  const pet = listReceptionPets('reception-demo').find((item) => item.name === 'Mít lễ tân');
  expect(getPet('customer-two', pet.id).allergies).toBe('Lưu ý chủ nuôi');
  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa Mít lễ tân' }));
  field('Màu lông', 'Xám'); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu thay đổi' }));
  expect(await screen.findByText('Đã cập nhật hồ sơ thú cưng.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Lưu trữ Mít lễ tân' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận lưu trữ' }));
  expect(await screen.findByRole('button', { name: 'Khôi phục Mít lễ tân' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Khôi phục Mít lễ tân' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận khôi phục' }));
  expect(await screen.findByText('Đã khôi phục hồ sơ thú cưng.')).toBeInTheDocument();
  view.unmount(); render(<App />); expect(await screen.findByRole('heading', { name: 'Mít lễ tân' })).toBeInTheDocument();
  expect(getPet('customer-two', pet.id)).toMatchObject({ color: 'Xám', status: 'ACTIVE' });
});

test('pet list requires owner selection and supports owner search and species filters', async () => {
  open('/reception/pets');
  fireEvent.change(await screen.findByLabelText('Tìm thú cưng'), { target: { value: '0902345678' } });
  expect(screen.getAllByRole('article')).toHaveLength(2);
  fireEvent.change(screen.getByLabelText('Lọc loài'), { target: { value: 'CAT' } });
  expect(screen.getByRole('heading', { name: 'Không tìm thấy thú cưng' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Thêm thú cưng' })); field('Tên thú cưng', 'Bé mới');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu thú cưng' }));
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(/chủ nuôi/);
  field(/Chủ nuôi/, 'customer-two');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu thú cưng' }));
  expect(await screen.findByRole('heading', { name: 'Bé mới' })).toBeInTheDocument();
  expect(getPet('customer-two', listReceptionPets('reception-demo').find((item) => item.name === 'Bé mới').id).ownerId).toBe('customer-two');
});

test('open customer form rejects concurrent self-edit rather than silently overwriting', async () => {
  open('/reception/customers/customer-demo');
  fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' })); field(/Họ và tên/, 'Form cũ');
  act(() => updateOwnProfile('customer-demo', { fullName: 'Thông tin mới' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu khách hàng' }));
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(/vừa thay đổi/);
  expect(getReceptionCustomer('reception-demo', 'customer-demo').fullName).toBe('Thông tin mới');
});

test('open pet form rejects concurrent customer pet edit', async () => {
  open('/reception/pets/pet-bo-demo'); fireEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' })); field('Màu lông', 'Form cũ');
  act(() => savePet('customer-demo', { color: 'Cập nhật của chủ nuôi' }, 'pet-bo-demo'));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lưu thay đổi' }));
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(/vừa được cập nhật/);
  expect(getPet('customer-demo', 'pet-bo-demo').color).toBe('Cập nhật của chủ nuôi');
});

test('dirty customer form asks before discard and storage errors can be retried', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  open(); fireEvent.click(await screen.findByRole('button', { name: 'Thêm khách hàng' })); field(/Họ và tên/, 'Chưa lưu');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy' })); expect(confirm).toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeInTheDocument();
  confirm.mockReturnValue(true); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy' }));
  act(() => { localStorage.setItem(CUSTOMERS_KEY, '{bad'); window.dispatchEvent(new Event('pawcare:customers-changed')); });
  expect(screen.getByRole('heading', { name: 'Không thể tải hồ sơ' })).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Thêm khách hàng' })).toBeDisabled();
  localStorage.setItem(CUSTOMERS_KEY, '[]'); fireEvent.click(screen.getByRole('button', { name: 'Thử lại' })); expect(screen.getByRole('button', { name: 'Thêm khách hàng' })).toBeEnabled();
});

test.each(['/reception/customers', '/reception/customers/customer-demo', '/reception/pets', '/reception/pets/pet-bo-demo'])('customer cannot open staff route %s', (path) => {
  open(path, 'customer@pawcare.vn'); expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument();
});

test('anonymous visitors go to login and receptionist login lands in the console', async () => {
  window.history.replaceState({}, '', '/reception/customers'); render(<App />);
  expect(window.location.pathname).toBe('/auth/login');
  fireEvent.change(screen.getByLabelText('Email hoặc số điện thoại'), { target: { value: 'reception@pawcare.vn' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByRole('heading', { name: 'Quản lý khách hàng' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/reception/customers');
});

test('public avatar exposes both receptionist functions and no admin/customer pet access', () => {
  open('/'); fireEvent.click(screen.getByRole('button', { name: 'Mở menu tài khoản' }));
  const nav = within(screen.getByRole('navigation', { name: 'Tác vụ tài khoản' }));
  expect(nav.getByRole('link', { name: /Thông tin khách hàng/ })).toHaveAttribute('href', '/reception/customers');
  expect(nav.getByRole('link', { name: /Thông tin thú cưng/ })).toHaveAttribute('href', '/reception/pets');
  expect(nav.queryByRole('link', { name: /Trang quản trị|Thú cưng của tôi/ })).not.toBeInTheDocument();
});

test('login does not send a different role back into a protected receptionist page', async () => {
  window.history.replaceState({}, '', '/reception/pets'); render(<App />);
  fireEvent.change(screen.getByLabelText('Email hoặc số điện thoại'), { target: { value: 'customer@pawcare.vn' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(await screen.findByRole('heading', { name: /Thông tin cá nhân/i })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/portal/profile');
});
