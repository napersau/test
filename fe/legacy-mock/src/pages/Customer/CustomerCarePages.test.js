import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { createAppointment, listAppointments } from '../../features/appointments/appointmentsRepository';
import { APPOINTMENTS_KEY, bookingDraftKey, clinicDateOffset, MEDICAL_RECORDS_KEY } from '../../features/appointments/appointmentPolicy';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/'); });
afterEach(() => jest.restoreAllMocks());
function openPage(path, account = 'customer@pawcare.vn') { authenticate(account, '123456', true); window.history.replaceState({}, '', path); return render(<App />); }
function change(label, value) { fireEvent.change(screen.getByLabelText(label), { target: { value } }); }
function next() { fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục →' })); }
async function fillBooking() {
  await screen.findByLabelText('Thú cưng cần khám'); change('Thú cưng cần khám', 'pet-bo-demo'); next();
  change('Nhu cầu khám', 'service-1'); change('Lý do khám / biểu hiện của bé', 'Kiểm tra sức khỏe'); next();
  change('Ngày khám', clinicDateOffset(1)); fireEvent.click(await screen.findByRole('radio', { name: /09:00 - 09:30/ })); next();
  fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đã kiểm tra/ }));
}
const visit = (changes = {}) => ({ id: 'record-bo', ownerId: 'customer-demo', petId: 'pet-bo-demo', status: 'COMPLETED', examinedAt: '2026-10-01T09:00:00+07:00', doctorName: 'Bác sĩ fixture', diagnosis: 'Chẩn đoán fixture', recommendations: 'Dặn dò fixture', weight: 6.5, followUpDate: '', results: [{ id: 'result', name: 'Dịch vụ fixture', result: 'Kết quả fixture' }], prescriptions: [{ id: 'rx', medicineName: 'Thuốc fixture', dosage: 'Liều fixture', instructions: 'Chỉ dẫn fixture' }], doctorOnlyNotes: 'Nội dung riêng của bác sĩ', ...changes });

test('booking wizard validates, reviews, persists one pending request and links to real appointment list', async () => {
  openPage('/portal/booking'); expect(screen.getByRole('banner')).toBeInTheDocument(); expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  await screen.findByLabelText('Thú cưng cần khám'); next(); expect(screen.getByRole('alert')).toHaveTextContent(/kiểm tra/);
  await fillBooking(); fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu đặt lịch' }));
  expect(await screen.findByRole('heading', { name: 'Đã gửi yêu cầu đặt lịch' })).toBeInTheDocument();
  expect(listAppointments('customer-demo')).toHaveLength(1); expect(listAppointments('customer-demo')[0].status).toBe('PENDING'); expect(sessionStorage.getItem(bookingDraftKey('customer-demo'))).toBeNull(); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: 'Xem lịch hẹn của tôi' }));
  expect(await screen.findByRole('article')).toHaveTextContent('Chờ xác nhận'); fireEvent.click(screen.getByRole('button', { name: 'Xem chi tiết' })); expect(screen.getByRole('dialog')).toHaveTextContent('Kiểm tra sức khỏe');
});

test('draft is restored for the same customer and does not leak into a different account', async () => {
  const view = openPage('/portal/booking'); await screen.findByLabelText('Thú cưng cần khám'); change('Thú cưng cần khám', 'pet-bo-demo'); next(); change('Nhu cầu khám', 'service-1'); change('Lý do khám / biểu hiện của bé', 'Bản nháp riêng');
  view.unmount(); const utils = render(<App />); expect(await screen.findByLabelText('Lý do khám / biểu hiện của bé')).toHaveValue('Bản nháp riêng'); utils.unmount();
  openPage('/portal/booking', 'nam@pawcare.vn'); expect(await screen.findByRole('heading', { name: /Cần hồ sơ thú cưng/ })).toBeInTheDocument(); expect(screen.queryByDisplayValue('Bản nháp riêng')).not.toBeInTheDocument();
});

test('submission failure preserves the review and can be retried without duplicate bookings', async () => {
  openPage('/portal/booking'); await fillBooking(); const original = Storage.prototype.setItem;
  const write = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) { if (key === APPOINTMENTS_KEY) throw new Error('Quota'); return original.call(this, key, value); });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu đặt lịch' })); expect(await screen.findByRole('alert')).toHaveTextContent(/Không lưu được lịch hẹn/); expect(screen.getByText('Kiểm tra sức khỏe')).toBeInTheDocument(); expect(listAppointments('customer-demo')).toEqual([]);
  write.mockRestore(); const submit = screen.getByRole('button', { name: 'Gửi yêu cầu đặt lịch' }); fireEvent.click(submit); fireEvent.click(submit);
  expect(await screen.findByRole('heading', { name: 'Đã gửi yêu cầu đặt lịch' })).toBeInTheDocument(); expect(listAppointments('customer-demo')).toHaveLength(1);
});

test('appointment cancellation preserves the history and supports status filtering', async () => {
  const appointment = createAppointment('customer-demo', { petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Kiểm tra fixture', date: clinicDateOffset(1), time: '09:00' });
  openPage('/portal/appointments'); fireEvent.click(await screen.findByRole('button', { name: 'Hủy lịch' }));
  const dialog = within(screen.getByRole('dialog')); fireEvent.click(dialog.getByRole('button', { name: 'Xác nhận hủy lịch' })); expect(await dialog.findByRole('alert')).toHaveTextContent(/chọn lý do/); fireEvent.change(dialog.getByLabelText('Lý do hủy lịch'), { target: { value: 'Đổi sang cơ sở khác' } }); fireEvent.click(dialog.getByRole('button', { name: 'Xác nhận hủy lịch' }));
  expect(await screen.findByRole('status')).toHaveTextContent(/Đã hủy lịch hẹn/); expect(listAppointments('customer-demo')[0]).toMatchObject({ id: appointment.id, status: 'CANCELLED', cancellationReason: 'Đổi sang cơ sở khác' }); expect(screen.queryByRole('button', { name: 'Hủy lịch' })).not.toBeInTheDocument();
  change('Lọc trạng thái lịch hẹn', 'PENDING'); expect(screen.getByRole('heading', { name: 'Không tìm thấy lịch hẹn' })).toBeInTheDocument(); change('Lọc trạng thái lịch hẹn', 'CANCELLED'); expect(screen.getByRole('article')).toBeInTheDocument();
});

test('medical history distinguishes empty visits from appointments and reads only completed customer-safe data', async () => {
  openPage('/portal/medical-history'); expect(await screen.findByRole('heading', { name: 'Chưa có lịch sử khám bệnh' })).toBeInTheDocument();
  act(() => { localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify([visit(), visit({ id: 'unfinished', status: 'IN_PROGRESS' }), visit({ id: 'other', ownerId: 'customer-two' })])); window.dispatchEvent(new Event('pawcare:medical-records-changed')); });
  expect(await screen.findByRole('heading', { name: 'Bô' })).toBeInTheDocument(); expect(screen.getAllByRole('article')).toHaveLength(1); expect(screen.queryByText('Nội dung riêng của bác sĩ')).not.toBeInTheDocument();
  change('Tìm lịch sử khám', 'chan doan'); expect(screen.getByRole('article')).toBeInTheDocument(); change('Lịch sử từ ngày', '2026-10-02'); expect(screen.getByRole('heading', { name: /Không tìm thấy lần khám/ })).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
  fireEvent.click(screen.getByRole('link', { name: 'Xem kết quả khám' })); expect(await screen.findByRole('heading', { name: 'Kết quả khám · Bô' })).toBeInTheDocument(); expect(screen.getByText('Kết quả fixture')).toBeInTheDocument(); expect(screen.getByText('Thuốc fixture')).toBeInTheDocument(); expect(screen.queryByText('Nội dung riêng của bác sĩ')).not.toBeInTheDocument();
});

test('missing/foreign medical record URLs reveal no clinical payload', async () => {
  localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify([visit()])); openPage('/portal/medical-history/record-bo', 'nam@pawcare.vn');
  expect(await screen.findByRole('heading', { name: 'Không tìm thấy hồ sơ khám' })).toBeInTheDocument(); expect(screen.queryByText('Chẩn đoán fixture')).not.toBeInTheDocument();
});

test('corrupted appointment storage shows retry without overwriting it', async () => {
  localStorage.setItem(APPOINTMENTS_KEY, '{bad'); openPage('/portal/appointments'); expect(await screen.findByRole('alert')).toHaveTextContent(/không hợp lệ/); expect(localStorage.getItem(APPOINTMENTS_KEY)).toBe('{bad');
  localStorage.setItem(APPOINTMENTS_KEY, '[]'); fireEvent.click(screen.getByRole('button', { name: 'Thử lại' })); expect(screen.getByRole('heading', { name: 'Bạn chưa có lịch hẹn' })).toBeInTheDocument();
});

test.each(['/portal/booking', '/portal/appointments', '/portal/medical-history', '/portal/medical-history/record-bo'])('customer route %s rejects admin', (path) => {
  openPage(path, 'admin@admin'); expect(screen.getByRole('heading', { name: /không có quyền truy cập/ })).toBeInTheDocument();
});

test('anonymous booking preserves safe return path through login', () => {
  window.history.replaceState({}, '', '/portal/booking'); render(<App />); expect(window.location.pathname).toBe('/auth/login');
  change('Email hoặc số điện thoại', 'customer@pawcare.vn'); change('Mật khẩu', '123456'); fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/ })); expect(window.location.pathname).toBe('/portal/booking');
});

test('booking offers 14 slots with remaining seats, no doctor choice, and a full slot cannot be chosen', async () => {
  openPage('/portal/booking'); await screen.findByLabelText('Thú cưng cần khám'); change('Thú cưng cần khám', 'pet-bo-demo'); next();
  change('Nhu cầu khám', 'service-1'); change('Lý do khám / biểu hiện của bé', 'Kiểm tra'); next();
  expect(screen.queryByLabelText(/Bác sĩ/)).not.toBeInTheDocument();
  expect(screen.getByText(/Chọn ngày khám để xem/)).toBeInTheDocument();
  const day = clinicDateOffset(2); change('Ngày khám', day);
  expect(await screen.findAllByRole('radio')).toHaveLength(14);
  expect(screen.getByRole('radio', { name: /08:00 - 08:30, Còn 2 chỗ/ })).toBeEnabled();
  expect(screen.queryByRole('radio', { name: /^(11:30|17:00) - / })).not.toBeInTheDocument();
  createAppointment('customer-demo', { petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Kín 1', date: day, time: '09:00' });
  createAppointment('customer-demo', { petId: 'pet-bella-demo', serviceId: 'service-1', reason: 'Kín 2', date: day, time: '09:00' });
  const full = await screen.findByRole('radio', { name: /09:00 - 09:30, Đã kín lịch/ });
  expect(full).toBeDisabled();
});

test('appointment can be rescheduled to another free slot, keeping the pending status', async () => {
  const appointment = createAppointment('customer-demo', { petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Kiểm tra fixture', date: clinicDateOffset(1), time: '09:00' });
  openPage('/portal/appointments'); fireEvent.click(await screen.findByRole('button', { name: 'Đổi ngày / giờ' }));
  const dialog = within(screen.getByRole('dialog'));
  fireEvent.click(dialog.getByRole('button', { name: 'Xác nhận đổi lịch' }));
  expect(await dialog.findByRole('alert')).toBeInTheDocument();
  fireEvent.change(dialog.getByLabelText('Ngày khám mới'), { target: { value: clinicDateOffset(3) } });
  fireEvent.click(await dialog.findByRole('radio', { name: /14:00 - 14:30/ }));
  fireEvent.change(dialog.getByLabelText('Lý do đổi lịch'), { target: { value: 'Bận buổi sáng' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Xác nhận đổi lịch' }));
  expect(await screen.findByRole('status')).toHaveTextContent(/Đã đổi lịch/);
  expect(listAppointments('customer-demo')[0]).toMatchObject({ id: appointment.id, status: 'PENDING', rescheduleReason: 'Bận buổi sáng', version: 2 });
  expect(listAppointments('customer-demo')[0].startsAt).toBe(`${clinicDateOffset(3)}T14:00:00+07:00`);
});

test('appointments within 2 hours show no cancel or reschedule actions, only the hotline notice', async () => {
  jest.useFakeTimers({ doNotFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'queueMicrotask', 'nextTick', 'setImmediate'] });
  const now = new Date(); const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
  jest.setSystemTime(new Date(`${day}T08:00:00+07:00`));
  createAppointment('customer-demo', { petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Sát giờ', date: day, time: '10:00' });
  jest.setSystemTime(new Date(`${day}T08:30:00+07:00`));
  openPage('/portal/appointments');
  expect(await screen.findByText(/hotline phòng khám/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Hủy lịch' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Đổi ngày / giờ' })).not.toBeInTheDocument();
  jest.useRealTimers();
});
