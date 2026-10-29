import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { createWalkIn } from '../../features/intake/intakeRepository';
import { getClinicalPlan, startExamination, saveClinicalPlan, getExamination, saveExamination } from '../../features/examinations/examinationRepository';
import { EMPTY_EXAM } from '../../features/examinations/examinationPolicy';
import { MEDICAL_RECORDS_KEY } from '../../features/appointments/appointmentPolicy';
import { planDraftKey } from '../../features/examinations/clinicalPlanPolicy';
const open = (route, email = 'vet@pawcare.vn') => { authenticate(email, '123456', true); window.history.replaceState({}, '', route); return render(<App />); };
const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
function visit() { const appointment = createWalkIn('reception-demo', { ownerId: 'customer-demo', petId: 'pet-bella-demo', serviceId: 'service-1', assignedDoctorId: 'vet-demo', weightKg: 5.2, temperatureC: 38.6, priority: 'NORMAL', reason: 'Lượt kiểm thử', intakeNote: '', acknowledged: true }); startExamination('vet-demo', appointment.id, 1); return appointment.id; }
async function confirm() { fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox')); const button = within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận lưu' }); await act(async () => { button.click(); }); }
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-04T02:00:00Z')); window.history.replaceState({}, '', '/'); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
test.each(['/vet/prescriptions', '/vet/service-orders'])('new page %s has empty state, common header/footer and visible nav', async (route) => {
  open(route); expect(await screen.findByRole('heading', { name: 'Chưa có hồ sơ khám' })).toBeInTheDocument(); expect(screen.getByRole('banner')).toBeInTheDocument(); expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  expect(within(screen.getByRole('navigation', { name: 'Điều hướng bác sĩ' })).getAllByRole('link')).toHaveLength(10);
});
test('prescription validates fields, focuses invalid input, saves with confirmation and restores local draft', async () => {
  const id = visit(); const view = open(`/vet/prescriptions/${id}`); fireEvent.click(await screen.findByRole('button', { name: 'Thêm thuốc' }));
  expect(screen.getByText(/Dị ứng \/ cảnh báo/)).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Lưu đơn thuốc' })); expect(screen.getByLabelText(/^Thuốc \*/)).toHaveFocus();
  change(/^Thuốc \*/, 'medicine-1'); change('Liều dùng *', 'Liều kiểm thử'); change('Tần suất dùng *', 'Tần suất kiểm thử'); change('Thời gian dùng *', 'Thời gian kiểm thử'); change('Số lượng * (Viên)', '2'); change('Hướng dẫn sử dụng *', 'Hướng dẫn kiểm thử');
  expect(sessionStorage.getItem(planDraftKey('vet-demo', id, 'prescriptions'))).toContain('Liều kiểm thử'); view.unmount(); open(`/vet/prescriptions/${id}`);
  fireEvent.click(await screen.findByRole('button', { name: 'Khôi phục nháp chỉ định' })); expect(screen.getByLabelText('Liều dùng *')).toHaveValue('Liều kiểm thử');
  fireEvent.click(screen.getByRole('button', { name: 'Lưu đơn thuốc' })); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận lưu' })); expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(/Xác nhận/);
  await confirm(); expect(await screen.findByText(/Đã lưu đơn thuốc vào hồ sơ/)).toBeInTheDocument(); expect(getClinicalPlan('vet-demo', id, 'prescriptions').record.items[0].quantity).toBe(2);
  expect(sessionStorage.getItem(planDraftKey('vet-demo', id, 'prescriptions'))).toBeNull();
});
test('service order preview, duplicate validation, save and cancel retain history without clinical completion', async () => {
  const id = visit(); open(`/vet/service-orders/${id}`); fireEvent.click(await screen.findByRole('button', { name: 'Thêm dịch vụ' })); change('Dịch vụ *', 'service-2'); change('Số lượng dịch vụ *', '2'); change('Ghi chú chỉ định', 'Ghi chú thử');
  expect(screen.getByText(/500\.000/)).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Lưu chỉ định' })); await confirm(); expect(await screen.findByText(/Đã lưu chỉ định/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Thêm dịch vụ' })); const selects = screen.getAllByLabelText('Dịch vụ *'); fireEvent.change(selects[1], { target: { value: 'service-2' } }); fireEvent.click(screen.getByRole('button', { name: 'Lưu chỉ định' })); expect(screen.getByText(/Đã có trong danh sách/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Xóa dòng' })); jest.spyOn(window, 'confirm').mockReturnValue(true); fireEvent.click(screen.getByRole('button', { name: 'Hủy chỉ định' })); fireEvent.click(screen.getByRole('button', { name: 'Lưu chỉ định' })); await confirm();
  expect((await screen.findAllByText('Đã hủy')).length).toBeGreaterThan(0); const raw = JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY))[0]; expect(raw.serviceOrders).toHaveLength(1); expect(raw.status).toBe('IN_PROGRESS'); expect(raw.billableItems).toEqual([]);
});
test('stale plan cannot overwrite a changed shared record', async () => {
  const id = visit(); open(`/vet/prescriptions/${id}`); fireEvent.click(await screen.findByRole('button', { name: 'Thêm thuốc' })); change('Thuốc *', 'medicine-1'); change('Liều dùng *', 'Nội dung đang nhập');
  act(() => { const state = getClinicalPlan('vet-demo', id, 'prescriptions'); saveClinicalPlan('vet-demo', id, 'prescriptions', { items: [], expectedVersion: state.record.version, expectedAppointmentVersion: state.appointment.version }); });
  expect(screen.getByRole('button', { name: 'Lưu đơn thuốc' })).toBeDisabled(); expect(screen.getByLabelText('Liều dùng *')).toHaveValue('Nội dung đang nhập'); expect(screen.getByText(/Hồ sơ hoặc lịch đã thay đổi/)).toBeInTheDocument();
});
test.each(['/vet/prescriptions', '/vet/service-orders', '/vet/prescriptions/missing', '/vet/service-orders/missing'])('route %s rejects customer', (route) => {
  open(route, 'customer@pawcare.vn'); expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument();
});
test('known appointment from another doctor is rejected without showing form', async () => {
  const id = visit(); open(`/vet/prescriptions/${id}`, 'ngoc@pawcare.vn'); expect(await screen.findByRole('alert')).toHaveTextContent(/phân công/); expect(screen.queryByRole('button', { name: 'Thêm thuốc' })).not.toBeInTheDocument();
});
test.each(['prescriptions', 'services'])('completed %s stays read-only through the new route', async (kind) => {
  const id = visit(); const state = getExamination('vet-demo', id);
  saveExamination('vet-demo', id, { ...EMPTY_EXAM, reason: 'Lý do thử', symptoms: 'Triệu chứng thử', examination: 'Khám thử', diagnosis: 'Chẩn đoán thử', treatmentPlan: 'Kế hoạch thử', recommendations: 'Dặn dò thử', acknowledged: true, expectedVersion: state.record.version, expectedAppointmentVersion: state.appointment.version }, true);
  open(`${kind === 'services' ? '/vet/service-orders' : '/vet/prescriptions'}/${id}`); expect(await screen.findByText('Hồ sơ đã chốt · Chỉ đọc')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Thêm thuốc|Thêm dịch vụ|Lưu đơn thuốc|Lưu chỉ định/ })).not.toBeInTheDocument();
});
test('invalid local plan draft remains intact and is not rendered as form data', async () => {
  const id = visit(); const key = planDraftKey('vet-demo', id, 'prescriptions'); sessionStorage.setItem(key, JSON.stringify({ version: 1, appointmentVersion: 2, savedAt: new Date().toISOString(), items: [{ medicineName: {} }] })); const saved = sessionStorage.getItem(key);
  open(`/vet/prescriptions/${id}`); expect(await screen.findByRole('heading', { name: 'Nháp cục bộ không hợp lệ' })).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'Thêm thuốc' })); expect(sessionStorage.getItem(key)).toBe(saved);
});
