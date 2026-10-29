import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { createWalkIn } from '../../features/intake/intakeRepository';
import { getExamination, listVeterinarianRecords, startExamination, saveExamination } from '../../features/examinations/examinationRepository';
import { EMPTY_EXAM, examDraftKey } from '../../features/examinations/examinationPolicy';
import { listMedicalHistory } from '../../features/medicalHistory/medicalHistoryRepository';
const values = (extra = {}) => ({ ownerId: 'customer-demo', petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Lý do kiểm thử', assignedDoctorId: 'vet-demo', weightKg: 5.2, temperatureC: 38.6, priority: 'NORMAL', intakeNote: '', acknowledged: true, date: '2026-10-04', time: '09:00', ...extra });
const open = (route, email = 'vet@pawcare.vn') => { authenticate(email, '123456', true); window.history.replaceState({}, '', route); return render(<App />); };
const field = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-03T00:00:00Z')); window.history.replaceState({}, '', '/'); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
test('vet empty desk uses shared header/footer and both navigation links', async () => {
  open('/vet/today'); expect(await screen.findByRole('heading', { name: 'Chưa có ca chờ hoặc đang khám' })).toBeInTheDocument();
  expect(screen.getByRole('banner')).toBeInTheDocument(); expect(screen.getByRole('contentinfo')).toBeInTheDocument(); expect(within(screen.getByRole('navigation', { name: 'Điều hướng bác sĩ' })).getAllByRole('link')).toHaveLength(10);
});
test('appointment search/filter/detail timeline only shows cases assigned to this doctor', async () => {
  const appointment = createWalkIn('reception-demo', values()); createWalkIn('reception-demo', values({ petId: 'pet-bella-demo', assignedDoctorId: 'vet-two' }));
  open('/vet/appointments'); const table = await screen.findByRole('table'); expect(within(table).getAllByRole('row')).toHaveLength(2); expect(within(table).queryByText('Bella')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: `Chi tiết ${appointment.code}` })); expect(within(screen.getByRole('dialog')).getByRole('list', { name: 'Tiến trình lượt khám' })).toBeInTheDocument(); expect(within(screen.getByRole('dialog')).getByRole('link', { name: 'Mở ca khám' })).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Đóng hộp thoại' })); field('Tìm lịch khám bác sĩ', 'no-match'); expect(screen.getByRole('heading', { name: 'Chưa có lịch khám phù hợp' })).toBeInTheDocument();
});
test('start, validate, save draft and complete shows public result only after finish', async () => {
  const appointment = createWalkIn('reception-demo', values()); open(`/vet/examinations/${appointment.id}`);
  fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu khám' })); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận bắt đầu khám' })); expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(/đối chiếu/);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox')); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận bắt đầu khám' }));
  expect(await screen.findByLabelText('Triệu chứng / bệnh sử *')).toBeInTheDocument(); expect(screen.getByText(/Chưa có thông tin dị ứng/)).toBeInTheDocument();
  field(/Cân nặng đo lúc khám \(kg\)/, '0'); fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp hồ sơ' })); expect(screen.getByLabelText(/Cân nặng đo lúc khám \(kg\)/)).toHaveAttribute('aria-invalid', 'true');
  field(/Cân nặng đo lúc khám \(kg\)/, '6.5'); field('Triệu chứng / bệnh sử *', 'Triệu chứng kiểm thử'); field('Kết quả thăm khám lâm sàng *', 'Kết quả kiểm thử'); fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp hồ sơ' }));
  expect(await screen.findByText(/Đã lưu nháp hồ sơ khám/)).toBeInTheDocument(); expect(listMedicalHistory('customer-demo')).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: 'Chẩn đoán & điều trị' })); field('Chẩn đoán cuối', 'Chẩn đoán kiểm thử'); field('Kế hoạch điều trị *', 'Điều trị kiểm thử'); field('Dặn dò chia sẻ với chủ nuôi *', 'Dặn dò kiểm thử'); field('Ghi chú nội bộ bác sĩ (không chia sẻ với khách)', 'PRIVATE_UI');
  fireEvent.click(screen.getByRole('button', { name: 'Chốt đợt khám / Chuyển thanh toán' })); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận chốt đợt khám' })); expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(/Xác nhận/);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox')); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận chốt đợt khám' }));
  expect(await screen.findByText('Hồ sơ đã chốt · Chỉ đọc')).toBeInTheDocument(); expect(screen.getByLabelText('Chẩn đoán cuối')).toBeDisabled(); expect(screen.queryByRole('button', { name: 'Lưu nháp hồ sơ' })).not.toBeInTheDocument(); expect(listMedicalHistory('customer-demo')[0].diagnosis).toBe('Chẩn đoán kiểm thử'); expect(JSON.stringify(listMedicalHistory('customer-demo'))).not.toContain('PRIVATE_UI');
}, 15000); // Multi-step clinical workflow; allow headroom when production build runs concurrently.
test('local draft survives unmount and reload, can restore invalid input for correction, guards dirty navigation', async () => {
  const appointment = createWalkIn('reception-demo', values()); startExamination('vet-demo', appointment.id, 1);
  const view = open(`/vet/examinations/${appointment.id}`); field('Triệu chứng / bệnh sử *', 'Nháp chưa lưu'); field('Cân nặng đo lúc khám (kg)', '-1');
  expect(JSON.parse(sessionStorage.getItem(examDraftKey('vet-demo', appointment.id))).values.symptoms).toBe('Nháp chưa lưu');
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false); fireEvent.click(screen.getByRole('link', { name: '← Bàn khám bệnh' })); expect(confirm).toHaveBeenCalled();
  view.unmount(); open(`/vet/examinations/${appointment.id}`); fireEvent.click(await screen.findByRole('button', { name: 'Khôi phục bản nháp' })); expect(screen.getByLabelText('Triệu chứng / bệnh sử *')).toHaveValue('Nháp chưa lưu'); expect(screen.getByLabelText('Cân nặng đo lúc khám (kg)')).toHaveValue(-1);
});
test('concurrent save does not silently promote old form revision; reader errors preserve sources', async () => {
  const appointment = createWalkIn('reception-demo', values()); startExamination('vet-demo', appointment.id, 1); open(`/vet/examinations/${appointment.id}`); field('Triệu chứng / bệnh sử *', 'Nội dung cũ');
  act(() => { const state = getExamination('vet-demo', appointment.id); saveExamination('vet-demo', appointment.id, { ...EMPTY_EXAM, reason: 'Nháp mới', expectedVersion: state.record.version, expectedAppointmentVersion: state.appointment.version }); });
  expect(screen.getByRole('button', { name: 'Lưu nháp hồ sơ' })).toBeDisabled(); expect(screen.getByLabelText('Triệu chứng / bệnh sử *')).toHaveValue('Nội dung cũ'); expect(screen.getByText(/Hồ sơ đã thay đổi ở nơi khác/)).toBeInTheDocument();
});
test.each(['/vet/today', '/vet/appointments', '/vet/examinations/missing'])('route %s blocks wrong role', (route) => {
  open(route, 'reception@pawcare.vn'); expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument();
});
test('another doctor cannot open a known examination URL', async () => {
  const appointment = createWalkIn('reception-demo', values()); open(`/vet/examinations/${appointment.id}`, 'ngoc@pawcare.vn'); expect(await screen.findByRole('alert')).toHaveTextContent(/phân công/); expect(screen.queryByRole('button', { name: 'Bắt đầu khám' })).not.toBeInTheDocument();
});

test('vet login uses the correct role home and returns safely to a protected vet route', async () => {
  window.history.replaceState({}, '', '/vet/appointments'); render(<App />);
  field(/Email hoặc số điện thoại/, 'vet@pawcare.vn'); field(/^Mật khẩu$/, '123456');
  fireEvent.click(screen.getByRole('button', { name: /^Đăng nhập/ }));
  expect(await screen.findByRole('heading', { name: 'Quản lý lịch khám' })).toBeInTheDocument(); expect(window.location.pathname).toBe('/vet/appointments');
});

test('corrupt local draft remains intact until explicit discard', async () => {
  const appointment = createWalkIn('reception-demo', values()); startExamination('vet-demo', appointment.id, 1);
  const key = examDraftKey('vet-demo', appointment.id); sessionStorage.setItem(key, '{bad'); open(`/vet/examinations/${appointment.id}`);
  expect(await screen.findByRole('heading', { name: 'Bản nháp cục bộ không hợp lệ' })).toBeInTheDocument(); expect(sessionStorage.getItem(key)).toBe('{bad');
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true); fireEvent.click(screen.getByRole('button', { name: 'Xóa bản nháp cục bộ' })); expect(confirm).toHaveBeenCalled(); expect(sessionStorage.getItem(key)).toBeNull();
});

test('new records list is empty until a checked-in visit is explicitly selected and confirmed', async () => {
  const appointment = createWalkIn('reception-demo', values()); open('/vet/records');
  expect(await screen.findByRole('heading', { name: 'Chưa có hồ sơ khám đã lập' })).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Lập hồ sơ khám mới' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Đối chiếu lượt khám' })); expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(/Chọn lượt/);
  fireEvent.change(within(screen.getByRole('dialog')).getByLabelText(/Lượt đã tiếp nhận/), { target: { value: appointment.id } });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Đối chiếu lượt khám' })); expect(window.location.pathname).toBe(`/vet/records/${appointment.id}`);
  fireEvent.click(await screen.findByRole('button', { name: 'Lập hồ sơ và bắt đầu khám' })); fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox')); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận bắt đầu khám' }));
  expect(await screen.findByRole('button', { name: 'Lưu nháp hồ sơ' })).toBeInTheDocument(); expect(listVeterinarianRecords('vet-demo')[0].record).not.toBeNull();
  fireEvent.click(screen.getByRole('link', { name: '← Danh sách hồ sơ khám' })); expect(await screen.findByRole('link', { name: 'Xem hồ sơ' })).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Lập hồ sơ khám mới' })).toBeDisabled();
});

test('diagnosis page saves symptoms and preliminary/final draft without completing or publishing results', async () => {
  const appointment = createWalkIn('reception-demo', values()); startExamination('vet-demo', appointment.id, 1); open(`/vet/diagnoses/${appointment.id}`);
  fireEvent.click(await screen.findByRole('button', { name: 'Ghi nhận triệu chứng' })); expect(screen.getByLabelText('Triệu chứng / bệnh sử *')).toHaveFocus(); field('Triệu chứng / bệnh sử *', 'Triệu chứng mới kiểm thử'); field('Đánh giá sơ bộ', 'Đánh giá sơ bộ kiểm thử');
  fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận chẩn đoán' })); expect(screen.getByLabelText('Chẩn đoán cuối')).toHaveFocus(); field('Chẩn đoán cuối', 'Chẩn đoán đang soạn kiểm thử');
  fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp hồ sơ' })); expect(await screen.findByText(/Đã lưu nháp hồ sơ khám/)).toBeInTheDocument();
  expect(listMedicalHistory('customer-demo')).toEqual([]); fireEvent.click(screen.getByRole('link', { name: '← Danh sách triệu chứng & chẩn đoán' }));
  expect(await screen.findByRole('heading', { name: 'Chẩn đoán đang soạn' })).toBeInTheDocument(); expect(screen.getByText('Triệu chứng mới kiểm thử')).toBeInTheDocument();
  field('Tìm triệu chứng và chẩn đoán', 'khong-trung'); expect(screen.getByRole('heading', { name: 'Không tìm thấy hồ sơ phù hợp' })).toBeInTheDocument();
});

test('completed records stay read-only through new detail routes and support record status filters', async () => {
  const appointment = createWalkIn('reception-demo', values()); const record = startExamination('vet-demo', appointment.id, 1); const current = getExamination('vet-demo', appointment.id).appointment;
  saveExamination('vet-demo', appointment.id, { ...EMPTY_EXAM, reason: 'Khám', symptoms: 'Triệu chứng thử', examination: 'Quan sát thử', diagnosis: 'Chẩn đoán thử', treatmentPlan: 'Kế hoạch thử', recommendations: 'Dặn dò thử', acknowledged: true, expectedVersion: record.version, expectedAppointmentVersion: current.version }, true);
  open('/vet/records'); field('Lọc trạng thái hồ sơ', 'IN_PROGRESS'); expect(await screen.findByRole('heading', { name: 'Không tìm thấy hồ sơ phù hợp' })).toBeInTheDocument(); field('Lọc trạng thái hồ sơ', 'COMPLETED');
  fireEvent.click(screen.getByRole('link', { name: 'Xem triệu chứng & chẩn đoán' })); fireEvent.click(await screen.findByRole('button', { name: 'Xem chẩn đoán' })); expect(screen.getByLabelText('Chẩn đoán cuối')).toBeDisabled(); expect(screen.queryByRole('button', { name: 'Lưu nháp hồ sơ' })).not.toBeInTheDocument();
});

test('start confirmation keeps its original revision even when reception updates the open visit', async () => {
  const appointment = createWalkIn('reception-demo', values()); open(`/vet/records/${appointment.id}`); fireEvent.click(await screen.findByRole('button', { name: 'Lập hồ sơ và bắt đầu khám' })); fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox'));
  act(() => { const records = JSON.parse(localStorage.getItem('pawcare_appointments_v1')); records[0].version += 1; localStorage.setItem('pawcare_appointments_v1', JSON.stringify(records)); window.dispatchEvent(new Event('pawcare:appointments-changed')); });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận bắt đầu khám' })); expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(/vừa thay đổi/); expect(listVeterinarianRecords('vet-demo')[0].record).toBeNull();
});

test.each(['/vet/records', '/vet/diagnoses', '/vet/records/missing', '/vet/diagnoses/missing'])('clinical route %s blocks customers', (route) => {
  open(route, 'customer@pawcare.vn'); expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument();
});
