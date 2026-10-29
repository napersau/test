import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { createWalkIn } from '../../features/intake/intakeRepository';
import { MEDICAL_RECORDS_KEY, MEDICAL_RECORDS_CHANGED } from '../../features/appointments/appointmentPolicy';
import { VACCINATIONS_KEY } from '../../features/vaccinations/vaccinationPolicy';
import { makeCustomerRecordsFixtures } from '../../test/customerRecordsFixtures';
const open = (route, email = 'vet@pawcare.vn') => { authenticate(email, '123456', true); window.history.replaceState({}, '', route); return render(<App />); };
function seed() { createWalkIn('reception-demo', { ownerId: 'customer-demo', petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Lượt sức khỏe thử', assignedDoctorId: 'vet-demo', weightKg: 5.2, temperatureC: 38.6, priority: 'NORMAL', intakeNote: '', acknowledged: true }); const data = makeCustomerRecordsFixtures('2026-10-04'); localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify(data.visits)); localStorage.setItem(VACCINATIONS_KEY, JSON.stringify(data.vaccinations)); return data; }
const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-04T02:00:00Z')); window.history.replaceState({}, '', '/'); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
test('health menu and empty assigned-pet state use common staff header/footer', async () => {
  open('/vet/health-history'); expect(await screen.findByRole('heading', { name: 'Chưa có thú cưng được phân công' })).toBeInTheDocument(); expect(screen.getByRole('banner')).toBeInTheDocument(); expect(screen.getByRole('contentinfo')).toBeInTheDocument(); expect(within(screen.getByRole('navigation', { name: 'Điều hướng bác sĩ' })).getAllByRole('link')).toHaveLength(10);
});
test('pet selector, timeline tabs, prescription detail, dates and search stay scoped to assigned pet', async () => {
  seed(); open('/vet/health-history'); fireEvent.click(await screen.findByRole('link', { name: 'Xem lịch sử sức khỏe' })); expect(window.location.pathname).toBe('/vet/health-history/pet-bo-demo');
  expect(await screen.findByRole('list', { name: 'Dòng thời gian sức khỏe thú cưng' })).toBeInTheDocument(); expect(screen.queryByText('PRIVATE_FIXTURE_NOTE')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Đơn thuốc/ })); fireEvent.click(screen.getByRole('button', { name: /Xem chi tiết Đơn thuốc theo lần khám/ })); expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Thuốc fixture kiểm thử' })).toBeInTheDocument(); expect(within(screen.getByRole('dialog')).getByText('Tần suất fixture')).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Đóng hộp thoại' })); change('Tìm lịch sử sức khỏe', 'no-match'); expect(screen.getByRole('heading', { name: 'Không có sự kiện phù hợp' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' })); change('Lịch sử sức khỏe từ ngày', '2026-10-04'); change('Lịch sử sức khỏe đến ngày', '2026-10-02'); expect(screen.getByRole('alert')).toHaveTextContent(/Khoảng ngày không hợp lệ/);
  expect(screen.queryByRole('list', { name: 'Dòng thời gian sức khỏe thú cưng' })).not.toBeInTheDocument();
});
test('weight table appears without fabricated graph for a single measurement, chart after three readings', async () => {
  const data = seed(); open('/vet/health-history/pet-bo-demo'); expect(await screen.findByRole('table', { name: 'Bảng cân nặng theo lần khám' })).toBeInTheDocument(); expect(screen.queryByRole('img', { name: /Biểu đồ/ })).not.toBeInTheDocument();
  const second = { ...data.visits[0], id: 'older-weight', examinedAt: '2026-10-01T02:00:00Z', weight: 7 }; const third = { ...second, id: 'oldest-weight', examinedAt: '2026-09-30T02:00:00Z', weight: 7.5 };
  act(() => { localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify([...data.visits, second, third])); window.dispatchEvent(new Event(MEDICAL_RECORDS_CHANGED)); }); expect(screen.getByRole('img', { name: /Biểu đồ 3 số đo/ })).toBeInTheDocument();
});
test('vaccination timeline distinguishes planned/overdue and completed without mutating source', async () => {
  seed(); const raw = localStorage.getItem(VACCINATIONS_KEY); open('/vet/health-history/pet-bo-demo'); fireEvent.click(await screen.findByRole('button', { name: /^Tiêm phòng/ })); expect(screen.getByText('Quá ngày dự kiến')).toBeInTheDocument(); expect(screen.getByText('Đã tiêm')).toBeInTheDocument(); expect(localStorage.getItem(VACCINATIONS_KEY)).toBe(raw);
});
test.each(['/vet/health-history', '/vet/health-history/pet-bo-demo'])('health route %s blocks customers', (route) => {
  open(route, 'customer@pawcare.vn'); expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument();
});
test('another doctor cannot open assigned-pet health history', async () => {
  seed(); open('/vet/health-history/pet-bo-demo', 'ngoc@pawcare.vn'); expect(await screen.findByRole('alert')).toHaveTextContent(/phân công/); expect(screen.queryByRole('list', { name: 'Dòng thời gian sức khỏe thú cưng' })).not.toBeInTheDocument();
});
test('malformed data offers retry and keeps original storage', async () => {
  seed(); localStorage.setItem(MEDICAL_RECORDS_KEY, '{bad'); open('/vet/health-history/pet-bo-demo'); expect(await screen.findByRole('alert')).toHaveTextContent(/không hợp lệ/); expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument(); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBe('{bad');
});
test('timeline supports query pagination and invalid type is recoverable', async () => {
  seed(); const view = open('/vet/health-history/pet-bo-demo'); const list = await screen.findByRole('list', { name: 'Dòng thời gian sức khỏe thú cưng' }); expect(within(list).getAllByRole('listitem')).toHaveLength(6); fireEvent.click(screen.getByRole('button', { name: 'Trang sau' })); expect(window.location.search).toContain('page=2'); view.unmount();
  open('/vet/health-history/pet-bo-demo?kind=invalid'); expect(await screen.findByRole('alert')).toHaveTextContent(/Loại sự kiện không hợp lệ/); fireEvent.click(screen.getByRole('button', { name: /^Lần khám/ })); expect(screen.getByRole('list', { name: 'Dòng thời gian sức khỏe thú cưng' })).toBeInTheDocument();
});
