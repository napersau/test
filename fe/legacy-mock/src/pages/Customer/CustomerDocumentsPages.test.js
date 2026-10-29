import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { clinicToday } from '../../features/catalog/catalogPolicy';
import { makeCustomerRecordsFixtures } from '../../test/customerRecordsFixtures';
import { VACCINATIONS_CHANGED, VACCINATIONS_KEY } from '../../features/vaccinations/vaccinationPolicy';
import { INVOICES_KEY } from '../../features/invoices/invoicePolicy';
import { MEDICAL_RECORDS_KEY } from '../../features/appointments/appointmentPolicy';

let fixtures;
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/'); fixtures = makeCustomerRecordsFixtures(clinicToday()); });
afterEach(() => jest.restoreAllMocks());
function openPage(path, account = 'customer@pawcare.vn') { authenticate(account, '123456', true); window.history.replaceState({}, '', path); return render(<App />); }
function seed() { localStorage.setItem(VACCINATIONS_KEY, JSON.stringify(fixtures.vaccinations)); localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify(fixtures.visits)); localStorage.setItem(INVOICES_KEY, JSON.stringify(fixtures.invoices)); }
function change(label, value) { fireEvent.change(screen.getByLabelText(label), { target: { value } }); }

test.each([['vaccinations', 'Chưa có lịch tiêm phòng'], ['prescriptions', 'Chưa có đơn thuốc'], ['invoices', 'Chưa có hóa đơn']])('empty %s page shares layout and exposes customer navigation without fabricated records', async (kind, title) => {
  openPage(`/portal/${kind}`); expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument(); expect(screen.getByRole('banner')).toBeInTheDocument(); expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  const nav = within(screen.getByRole('navigation', { name: 'Khu vực khách hàng' })); expect(nav.getByRole('link', { name: 'Lịch tiêm phòng' })).toHaveAttribute('href', '/portal/vaccinations'); expect(nav.getByRole('link', { name: 'Đơn thuốc' })).toHaveAttribute('href', '/portal/prescriptions'); expect(nav.getByRole('link', { name: 'Hóa đơn' })).toHaveAttribute('href', '/portal/invoices');
});

test('vaccine feed shows statuses, filters dates/pets and reads a specific completed dose safely', async () => {
  seed(); openPage('/portal/vaccinations'); expect(await screen.findAllByRole('article')).toHaveLength(6);
  change('Lọc trạng thái', 'COMPLETED'); expect(screen.getAllByRole('article')).toHaveLength(1); expect(screen.getByRole('article')).toHaveTextContent('Đã tiêm');
  fireEvent.click(screen.getByRole('link', { name: 'Xem lịch tiêm' })); expect(await screen.findByRole('heading', { name: 'Thông tin lịch / mũi tiêm' })).toBeInTheDocument(); expect(screen.queryByText('PRIVATE_FIXTURE_NOTE')).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: /Xác nhận.*tiêm/ })).not.toBeInTheDocument();
});

test('prescription detail preserves supplied directions, hides notes and links to its completed visit', async () => {
  seed(); openPage('/portal/prescriptions'); fireEvent.click(await screen.findByRole('link', { name: 'Xem đơn thuốc' }));
  expect(await screen.findByRole('heading', { name: 'Thuốc fixture kiểm thử' })).toBeInTheDocument(); expect(screen.getByText('Tần suất fixture')).toBeInTheDocument(); expect(screen.getByText('Thời gian fixture')).toBeInTheDocument(); expect(screen.getByText('2 Viên')).toBeInTheDocument(); expect(screen.queryByText('PRIVATE_FIXTURE_NOTE')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Xem lần khám liên quan' })); expect(await screen.findByRole('heading', { name: 'Kết quả khám · Bô' })).toBeInTheDocument();
});

test('invoice details derive amounts and expose a print action without checkout or writes', async () => {
  seed(); const print = jest.spyOn(window, 'print').mockImplementation(() => {}); openPage('/portal/invoices'); fireEvent.click(await screen.findByRole('link', { name: 'Xem hóa đơn' }));
  const table = await screen.findByRole('table'); expect(within(table).getAllByRole('row')).toHaveLength(3); expect(screen.queryByText('Dịch vụ hủy không tính tiền')).not.toBeInTheDocument(); expect(screen.queryByText('Thuốc đã hủy khỏi đơn không tính tiền')).not.toBeInTheDocument(); expect(screen.queryByText('PRIVATE_FIXTURE_NOTE')).not.toBeInTheDocument();
  const totals = screen.getByLabelText('Tổng kết hóa đơn'); expect(totals).toHaveTextContent('200.000'); expect(totals).toHaveTextContent('50.000'); expect(totals).toHaveTextContent('150.000');
  const before = localStorage.getItem(INVOICES_KEY); fireEvent.click(screen.getByRole('button', { name: 'In hóa đơn' })); expect(print).toHaveBeenCalledTimes(1); expect(localStorage.getItem(INVOICES_KEY)).toBe(before); expect(screen.queryByRole('button', { name: /Thanh toán/ })).not.toBeInTheDocument();
});

test('search is accent-insensitive; date errors, pagination and event refresh work without stale page selection', async () => {
  fixtures.vaccinations = Array.from({ length: 7 }, (_, index) => ({ ...fixtures.vaccinations[0], id: `dose-${index}`, vaccineName: `Mũi ${index}` })); seed(); openPage('/portal/vaccinations'); expect(await screen.findAllByRole('article')).toHaveLength(6);
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau →' })); expect(screen.getAllByRole('article')).toHaveLength(1); change('Tìm lịch tiêm phòng', 'mui 0'); expect(screen.getByText(/Trang 1\/1/)).toBeInTheDocument(); expect(screen.getByRole('article')).toHaveTextContent('Mũi 0');
  change('Từ ngày', '2030-02-02'); change('Đến ngày', '2030-01-01'); expect(screen.getByRole('alert')).toHaveTextContent(/Khoảng ngày không hợp lệ/); fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
  act(() => { localStorage.setItem(VACCINATIONS_KEY, '[]'); window.dispatchEvent(new Event(VACCINATIONS_CHANGED)); }); expect(screen.getByRole('heading', { name: 'Chưa có lịch tiêm phòng' })).toBeInTheDocument();
});

test.each(['vaccinations/vax-completed', 'prescriptions/visit-rx-fixture', 'invoices/invoice-fixture'])('foreign %s detail URL does not reveal someone else’s data', async (path) => {
  seed(); openPage(`/portal/${path}`, 'nam@pawcare.vn'); expect(await screen.findByRole('heading', { name: 'Không tìm thấy dữ liệu' })).toBeInTheDocument(); expect(screen.queryByText('Vaccine fixture kiểm thử')).not.toBeInTheDocument(); expect(screen.queryByText('Thuốc fixture kiểm thử')).not.toBeInTheDocument(); expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test.each(['vaccinations', 'prescriptions', 'invoices', 'invoices/invoice-fixture'])('admin cannot open customer %s page', (path) => {
  seed(); openPage(`/portal/${path}`, 'admin@admin'); expect(screen.getByRole('heading', { name: /không có quyền truy cập/ })).toBeInTheDocument();
});

test('malformed storage shows retry and never overwrites saved data', async () => {
  localStorage.setItem(INVOICES_KEY, '{bad'); openPage('/portal/invoices'); expect(await screen.findByRole('alert')).toHaveTextContent(/không hợp lệ/); expect(localStorage.getItem(INVOICES_KEY)).toBe('{bad'); localStorage.setItem(INVOICES_KEY, '[]'); fireEvent.click(screen.getByRole('button', { name: 'Thử lại' })); expect(screen.getByRole('heading', { name: 'Chưa có hóa đơn' })).toBeInTheDocument();
});

test('customer avatar links include the new features; anonymous users must sign in', () => {
  const view = openPage('/'); fireEvent.click(screen.getByRole('button', { name: 'Mở menu tài khoản' })); const menu = within(screen.getByRole('region', { name: 'Tài khoản của bạn' }));
  ['Lịch tiêm phòng', 'Đơn thuốc', 'Hóa đơn'].forEach((name) => expect(menu.getByRole('link', { name: new RegExp(`^${name}`) })).toBeInTheDocument()); view.unmount(); localStorage.removeItem('pawcare_auth_session'); window.history.replaceState({}, '', '/portal/vaccinations'); render(<App />); expect(window.location.pathname).toBe('/auth/login');
});
