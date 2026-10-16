import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { createAppointment } from '../../features/appointments/appointmentsRepository';
import { APPOINTMENTS_KEY, MEDICAL_RECORDS_KEY } from '../../features/appointments/appointmentPolicy';
import { listIntakeAppointments, createWalkIn, confirmIntakeAppointment, saveReceptionAppointment, closeReceptionAppointment } from '../../features/intake/intakeRepository';
import { listReceptionInvoices, issueReceptionInvoice, recordReceptionPayment, listBillingCandidates, listDispenseQueue } from '../../features/billing/billingRepository';
import { listMedicines } from '../../features/medicines/medicinesRepository';
import { makeCustomerRecordsFixtures } from '../../test/customerRecordsFixtures';

const NOW = new Date('2026-10-03T00:00:00Z'); // 07:00 giờ Việt Nam
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/'); jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
const open = (path, email = 'reception@pawcare.vn') => { authenticate(email, '123456', true); window.history.replaceState({}, '', path); return render(<App />); };
const dialog = () => within(screen.getByRole('dialog'));
const field = (name, value) => fireEvent.change(dialog().getByLabelText(name), { target: { value } });
const click = (name, scope) => fireEvent.click((scope ?? screen).getByRole('button', { name }));
const vitals = { weightKg: 5.2, temperatureC: 38.6 };
const walkIn = (extra = {}) => ({ ownerId: 'customer-demo', petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Khám', ...vitals, ...extra });
const online = (extra = {}) => createAppointment('customer-demo', { petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Kiểm tra thử nghiệm', date: '2026-10-03', time: '08:00', ...extra });
const billSource = (prescribed = false) => {
  const fixture = makeCustomerRecordsFixtures('2026-10-03'); const items = fixture.invoices[0].items;
  const visit = { ...fixture.visits[0], billableItems: prescribed ? [items[0], { id: 'rx-line', type: 'MEDICINE', name: 'Amoxicillin 250 mg', quantity: 2, unit: 'Viên', unitPrice: 8000, fulfillmentStatus: 'ORDERED' }] : items };
  if (prescribed) visit.prescriptions = [{ id: 'rx-line', medicineId: 'medicine-1', medicineName: 'Amoxicillin 250 mg', quantity: 2, unit: 'Viên', dosage: '1 viên', frequency: '2 lần/ngày', duration: '5 ngày', instructions: 'Uống sau ăn', unitPrice: 8000 }];
  localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify([visit])); return visit;
};

test('queue board starts empty, orders emergency first and assigns a free doctor to the fixed room', async () => {
  open('/reception/queue');
  expect(screen.getByRole('banner')).toBeInTheDocument(); expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Hiện không có bệnh nhân nào trong hàng đợi' })).toBeInTheDocument();
  expect(screen.getAllByText('Sẵn sàng nhận ca')).toHaveLength(2);
  let normal; let urgent;
  act(() => { normal = createWalkIn('reception-demo', walkIn()); urgent = createWalkIn('reception-demo', walkIn({ petId: 'pet-bella-demo', emergency: true, reason: 'Co giật' })); });
  const rows = within(await screen.findByRole('table')).getAllByRole('row');
  expect(rows[1]).toHaveTextContent('Bella'); expect(rows[1]).toHaveTextContent('Cấp cứu'); expect(rows[2]).toHaveTextContent('Vãng lai');
  click(`Phân công ${urgent.code}`);
  expect(dialog().getByRole('radio', { name: /Trần Minh Khang/ })).toBeEnabled();
  click('Xác nhận phân công', dialog());
  expect(await dialog().findByRole('alert')).toHaveTextContent(/Chọn một bác sĩ/);
  fireEvent.click(dialog().getByRole('radio', { name: /Trần Minh Khang/ })); click('Xác nhận phân công', dialog());
  expect(await screen.findByText(/Mời khách vào Phòng P01 — Trần Minh Khang/)).toBeInTheDocument();
  expect(dialog().getByText('Mời vào Phòng P01')).toBeInTheDocument(); click('Đóng', dialog());
  expect(listIntakeAppointments('reception-demo').find((item) => item.id === urgent.id)).toMatchObject({ assignedDoctorId: 'vet-demo', roomName: 'Phòng P01' });
  expect(screen.getByText('Đã nhận ca, chờ bắt đầu')).toBeInTheDocument(); expect(screen.getByText(/Chờ bắt đầu: Bella/)).toBeInTheDocument();
  click(`Phân công ${normal.code}`);
  expect(dialog().getByRole('radio', { name: /Trần Minh Khang/ })).toBeDisabled(); expect(dialog().getByText(/Đã nhận ca Bella, chờ bắt đầu/)).toBeInTheDocument();
  expect(dialog().getByRole('radio', { name: /Vũ Bảo Ngọc/ })).toBeEnabled();
});

test('queue actions: postpone to the bottom and reactivate, cancel an intake with a reason, change doctor before the exam starts', async () => {
  const first = createWalkIn('reception-demo', walkIn()); jest.advanceTimersByTime(60000); const second = createWalkIn('reception-demo', walkIn({ petId: 'pet-bella-demo' }));
  open('/reception/queue'); const order = () => within(screen.getByRole('table')).getAllByRole('row').slice(1).map((row) => row.textContent);
  expect(await screen.findByRole('table')).toBeInTheDocument(); expect(order()[0]).toContain(first.petName);
  click(`Tạm hoãn ${first.code}`); expect(await screen.findByText(/Đã tạm hoãn Bô/)).toBeInTheDocument(); expect(order()[1]).toContain('Tạm hoãn'); expect(order()[0]).toContain('Bella');
  expect(screen.getByRole('button', { name: `Phân công ${first.code}` })).toBeDisabled();
  click(`Kích hoạt lại ${first.code}`); expect(await screen.findByText(/Đã kích hoạt lại Bô/)).toBeInTheDocument();
  click(`Hủy tiếp nhận ${second.code}`); fireEvent.change(dialog().getByLabelText(/Lý do hủy tiếp nhận/), { target: { value: 'Khách bỏ về' } }); click('Xác nhận thao tác', dialog());
  expect(await screen.findByText(/Đã hủy tiếp nhận/)).toBeInTheDocument(); expect(listIntakeAppointments('reception-demo').find((item) => item.id === second.id)).toMatchObject({ status: 'CANCELLED', cancelledBy: 'RECEPTION' });
  click(`Phân công ${first.code}`); fireEvent.click(dialog().getByRole('radio', { name: /Trần Minh Khang/ })); click('Xác nhận phân công', dialog()); expect(await screen.findByText(/Mời khách vào Phòng P01/)).toBeInTheDocument(); click('Đóng', dialog());
  click(`Đổi bác sĩ ${first.code}`); expect(dialog().getByRole('radio', { name: /Trần Minh Khang/ })).toBeDisabled(); fireEvent.click(dialog().getByRole('radio', { name: /Vũ Bảo Ngọc/ })); click('Xác nhận phân công', dialog());
  expect(await screen.findByText(/Mời khách vào Phòng P02/)).toBeInTheDocument();
});

test('scheduled check-in needs plausible vitals and puts the pet in the waiting queue without clinical or invoice writes', async () => {
  const record = confirmIntakeAppointment('reception-demo', online().id, { expectedVersion: 1 }); open('/reception/intake');
  expect(await screen.findByRole('button', { name: `Tiếp nhận ${record.code}` })).toBeEnabled();
  click(`Tiếp nhận ${record.code}`); expect(dialog().getByLabelText(/Cân nặng/)).toHaveFocus();
  click('Hoàn tất tiếp đón', dialog()); expect(dialog().getByText(/Nhập cân nặng/)).toBeInTheDocument(); expect(dialog().getByText(/Nhập thân nhiệt/)).toBeInTheDocument();
  field(/Cân nặng/, '-2'); field(/Thân nhiệt/, '60'); click('Hoàn tất tiếp đón', dialog());
  expect(dialog().getAllByText(/không hợp lý/)).toHaveLength(2);
  field(/Cân nặng/, '5,4'); field(/Thân nhiệt/, '38,7'); click('Hoàn tất tiếp đón', dialog());
  expect(await screen.findByText(/Đã tiếp nhận Bô/)).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Xem hàng đợi →' })).toHaveAttribute('href', '/reception/queue');
  expect(listIntakeAppointments('reception-demo')[0]).toMatchObject({ status: 'CHECKED_IN', weightKg: 5.4, temperatureC: 38.7, assignedDoctorId: '' });
  expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBeNull(); expect(localStorage.getItem('pawcare_invoices_v1')).toBeNull();
});

test('walk-in intake finds a customer by phone, quick-creates a new customer and pet, and guards discarding a draft', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  open('/reception/intake'); fireEvent.click(await screen.findByRole('button', { name: /Khách vãng lai/ })); click('Tiếp nhận khách vãng lai');
  expect(dialog().getByLabelText(/Số điện thoại khách hàng/)).toHaveFocus();
  click('Hoàn tất tiếp đón', dialog()); expect(dialog().getByText('Chọn khách hàng.')).toBeInTheDocument();
  field(/Số điện thoại khách hàng/, '0902345678'); expect(dialog().getByText('Nguyễn Ngọc Lan')).toBeInTheDocument();
  field(/Thú cưng \*/, 'pet-bo-demo'); field(/Cân nặng/, '5.2'); field(/Thân nhiệt/, '38.5'); field(/Triệu chứng/, 'Bỏ ăn');
  click('Hủy', dialog()); expect(confirm).toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeInTheDocument();
  click('Hoàn tất tiếp đón', dialog()); expect(await screen.findByText(/Đã tiếp nhận Bô/)).toBeInTheDocument();
  expect(listIntakeAppointments('reception-demo')[0]).toMatchObject({ source: 'WALK_IN', status: 'CHECKED_IN' });
  click('Tiếp nhận khách vãng lai'); field(/Số điện thoại khách hàng/, '0988777666');
  expect(dialog().getByText(/Chưa có khách hàng với số này/)).toBeInTheDocument(); click('Tạo nhanh khách hàng & thú cưng', dialog());
  click('Hoàn tất tiếp đón', dialog()); expect(dialog().getAllByText(/Nhập/).length).toBeGreaterThan(0);
  field(/Họ tên khách hàng/, 'Hoàng Gia Bảo'); field(/Tên thú cưng/, 'Lu'); field(/Cân nặng/, '4'); field(/Thân nhiệt/, '38.2'); field(/Triệu chứng/, 'Nôn ói'); click('Hoàn tất tiếp đón', dialog());
  expect(await screen.findByText(/Đã tiếp nhận Lu/)).toBeInTheDocument();
});

test('emergency intake flags the case and can dispatch a free doctor immediately', async () => {
  open('/reception/intake'); fireEvent.click(await screen.findByRole('button', { name: /^Cấp cứu/ })); click('Tiếp nhận cấp cứu');
  field(/Số điện thoại khách hàng/, '0902345678'); field(/Thú cưng \*/, 'pet-bella-demo'); field(/Cân nặng/, '9'); field(/Thân nhiệt/, '40.1'); field(/Triệu chứng/, 'Co giật liên tục');
  field(/Điều phối ngay/, 'vet-two'); click('Hoàn tất tiếp đón', dialog());
  expect(await screen.findByRole('link', { name: 'Điều phối bác sĩ ngay →' })).toBeInTheDocument();
  expect(listIntakeAppointments('reception-demo')[0]).toMatchObject({ source: 'EMERGENCY', priority: 'PRIORITY', assignedDoctorId: 'vet-two', roomName: 'Phòng P02' });
});

test('pending requests: confirm with advice, record a failed call, reject with a reason; the slot is freed on rejection', async () => {
  const first = online(); const second = online({ petId: 'pet-bella-demo', time: '09:00' }); const third = online({ petId: 'pet-bella-demo', time: '10:00' });
  open('/reception/appointments'); expect(await screen.findByRole('button', { name: `Xác nhận lịch ${first.code}` })).toBeInTheDocument();
  click(`Ghi chú liên hệ thất bại ${second.code}`); field(/Ghi chú liên hệ/, 'Gọi 2 lần không nghe máy'); click('Lưu ghi chú', dialog());
  expect(await screen.findByText(/Đã lưu ghi chú; lịch hẹn được giữ nguyên/)).toBeInTheDocument(); expect(screen.getByText('Liên hệ không thành 1 lần')).toBeInTheDocument();
  click(`Xác nhận lịch ${first.code}`); fireEvent.click(dialog().getByRole('checkbox', { name: /Nhịn ăn 6 tiếng/ })); click('Xác nhận lịch hẹn', dialog());
  expect(await screen.findByText(new RegExp(`Đã xác nhận ${first.code}`))).toBeInTheDocument();
  expect(listIntakeAppointments('reception-demo').find((item) => item.id === first.id)).toMatchObject({ status: 'CONFIRMED', confirmAdvice: expect.stringContaining('Nhịn ăn 6 tiếng') });
  click(`Từ chối ${third.code}`); expect(dialog().getByText(/Khung giờ được trả lại ngay/)).toBeInTheDocument();
  field(/Lý do từ chối/, 'Phòng khám bảo trì máy xét nghiệm'); click('Xác nhận thao tác', dialog());
  expect(await screen.findByText(new RegExp(`Đã cập nhật trạng thái ${third.code}`))).toBeInTheDocument();
  expect(listIntakeAppointments('reception-demo').find((item) => item.id === third.id)).toMatchObject({ status: 'CANCELLED', cancelledBy: 'RECEPTION' });
});

test('creating a phone booking for a new customer shows capacity, confirms at once and prints a slip for counter bookings', async () => {
  open('/reception/appointments'); fireEvent.click(await screen.findByRole('button', { name: 'Tạo lịch hẹn' }));
  field(/Số điện thoại khách hàng/, '0988777666'); click('Tạo nhanh khách hàng & thú cưng', dialog());
  field(/Họ tên khách hàng/, 'Hoàng Gia Bảo'); field(/Tên thú cưng/, 'Lu'); field(/Triệu chứng \/ lý do khám/, 'Bỏ ăn hai ngày');
  click('Lưu & xác nhận lịch hẹn', dialog()); expect(dialog().getAllByText(/Chọn/).length).toBeGreaterThan(0);
  field(/Ngày khám/, '2026-10-04'); expect(await dialog().findAllByRole('radio')).toHaveLength(14);
  expect(dialog().getByRole('radio', { name: /08:00 - 08:30, Còn 2 chỗ/ })).toBeEnabled();
  field(/Kênh đặt lịch/, 'COUNTER'); fireEvent.click(dialog().getByRole('radio', { name: /09:00 - 09:30/ })); click('Lưu & xác nhận lịch hẹn', dialog());
  expect(await screen.findByText(/Đã lưu APT-20261004-001 ở trạng thái đã xác nhận/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Lịch hẹn APT-20261004-001' })).toBeInTheDocument(); click('Đóng', dialog());
  expect(listIntakeAppointments('reception-demo')[0]).toMatchObject({ status: 'CONFIRMED', source: 'COUNTER', petName: 'Lu' });
  const print = jest.spyOn(window, 'print').mockImplementation(() => {});
  click('In phiếu hẹn APT-20261004-001'); click('In phiếu', dialog()); expect(print).toHaveBeenCalled();
});

test('today tab warns 30 minutes after the slot, lets staff note a late arrival or mark a no-show with a reason, and reschedules', async () => {
  const record = confirmIntakeAppointment('reception-demo', online().id, { expectedVersion: 1 });
  jest.setSystemTime(new Date('2026-10-03T01:45:00Z')); // 08:45
  open('/reception/appointments?tab=TODAY'); expect(await screen.findByText('Quá giờ hẹn 30 phút, khách chưa đến')).toBeInTheDocument();
  click(`Khách đến muộn ${record.code}`); field(/Ghi chú/, 'Khách đến muộn 15p'); click('Lưu ghi chú', dialog());
  expect(await screen.findByText('Khách đến muộn 15p')).toBeInTheDocument();
  click(`Đổi giờ ${record.code}`); field(/Ngày khám/, '2026-10-05'); fireEvent.click(await dialog().findByRole('radio', { name: /14:00 - 14:30/ }));
  click('Lưu giờ hẹn mới', dialog()); expect(dialog().getByText(/Nhập lý do đổi giờ/)).toBeInTheDocument();
  field(/Lý do đổi giờ/, 'Khách nhờ dời'); click('Lưu giờ hẹn mới', dialog()); expect(await screen.findByText(/khung giờ cũ được trả lại chỗ/)).toBeInTheDocument();
  jest.setSystemTime(new Date('2026-10-05T07:30:00Z')); // 14:30 ngày 05/10, quá 30 phút
  act(() => { window.dispatchEvent(new Event('visibilitychange')); });
  fireEvent.click(await screen.findByRole('button', { name: /^Tất cả/ })); click(`Đánh dấu vắng mặt ${record.code}`);
  field(/Lý do/, 'Không liên hệ được'); click('Xác nhận thao tác', dialog());
  expect(await screen.findByText(new RegExp(`Đã ghi nhận ${record.code} vắng mặt`))).toBeInTheDocument(); expect(listIntakeAppointments('reception-demo')[0].status).toBe('NO_SHOW');
});

test('customers list flags repeated no-shows and the detail page shows history and debts', async () => {
  const slots = ['09:00', '10:00'].map((time) => saveReceptionAppointment('reception-demo', { ownerId: 'customer-demo', petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Hẹn', source: 'PHONE', date: '2026-10-04', time }));
  jest.setSystemTime(new Date('2026-10-04T08:00:00Z'));
  slots.forEach((slot) => closeReceptionAppointment('reception-demo', slot.id, 'NO_SHOW', 'Không đến', 1));
  open('/reception/customers'); expect(await screen.findByText('2 lần · hay bùng lịch')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('link', { name: 'Nguyễn Ngọc Lan' })[0]);
  expect(await screen.findByText(/đã vắng mặt 2 lần/)).toBeInTheDocument(); expect(screen.getByText('2 lần vắng mặt')).toBeInTheDocument(); expect(screen.getByText('Không có công nợ')).toBeInTheDocument();
  expect(screen.getAllByText('Không đến khám').length).toBeGreaterThanOrEqual(2);
});

test('billing starts empty, issues an invoice with services and medicines, applies a capped discount, shows a QR for transfers and pays', async () => {
  open('/reception/invoices'); expect(await screen.findByRole('heading', { name: 'Chưa có hồ sơ cần lập hóa đơn' })).toBeInTheDocument();
  act(() => { billSource(true); window.dispatchEvent(new Event('pawcare:medical-records-changed')); });
  click('Lập hóa đơn visit-rx-fixture'); expect(dialog().getByText('Khám fixture')).toBeInTheDocument(); expect(dialog().queryByText(/Dịch vụ hủy/)).not.toBeInTheDocument();
  click('Xác nhận lập hóa đơn', dialog());
  expect(await screen.findByRole('button', { name: 'Ghi nhận thanh toán' })).toBeInTheDocument();
  expect(screen.getByRole('table', { name: /Dịch vụ của/ })).toBeInTheDocument(); expect(screen.getByRole('table', { name: /Thuốc trong đơn của/ })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Chiết khấu \(VND\)/), { target: { value: '999999' } }); click('Áp dụng chiết khấu');
  expect(await screen.findByRole('alert')).toHaveTextContent(/không thể vượt quá tổng viện phí/);
  fireEvent.change(screen.getByLabelText(/Chiết khấu \(VND\)/), { target: { value: '16000' } }); click('Áp dụng chiết khấu');
  expect(await screen.findByText(/Đã cập nhật chiết khấu/)).toBeInTheDocument(); expect(listReceptionInvoices('reception-demo')[0]).toMatchObject({ discount: 16000, total: 150000 });
  expect(screen.getByLabelText('Tổng kết hóa đơn')).toHaveTextContent('Chiết khấu');
  click('In phiếu tạm tính'); click('Yêu cầu mở lại đợt khám'); expect(screen.getByText(/mở lại đợt khám tới bác sĩ phụ trách/)).toBeInTheDocument();
  click('Ghi nhận thanh toán'); expect(within(screen.getByRole('dialog')).queryByRole('option', { name: 'Khác' })).not.toBeInTheDocument();
  field(/Phương thức/, 'TRANSFER'); expect(dialog().getByRole('img', { name: /Mã VietQR minh họa/ })).toBeInTheDocument(); expect(dialog().getByText(/Nội dung: THANH TOAN INV-/)).toBeInTheDocument();
  field(/Số tiền/, '200001'); fireEvent.click(dialog().getByRole('checkbox')); click('Lưu thanh toán demo', dialog());
  expect(await dialog().findByRole('alert')).toHaveTextContent(/vượt/); field(/Số tiền/, '150000'); click('Lưu thanh toán demo', dialog());
  expect(await screen.findByText('Đã thanh toán')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Ghi nhận thanh toán' })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Chuyển sang phát thuốc →' })).toHaveAttribute('href', '/reception/dispense');
  const print = jest.spyOn(window, 'print').mockImplementation(() => {}); click('In hóa đơn'); expect(print).toHaveBeenCalled();
});

test('dispense page lists paid prescriptions, blocks unpaid ones, shows stock errors and completes with a stock deduction', async () => {
  const visit = billSource(true);
  const candidate = listBillingCandidates('reception-demo')[0]; const invoice = issueReceptionInvoice('reception-demo', candidate.id, candidate.revision);
  open('/reception/dispense?tab=WAITING'); fireEvent.click(await screen.findByRole('button', { name: 'Xem đơn thuốc Bô' }));
  expect(dialog().getByText('Amoxicillin')).toBeInTheDocument();
  expect(dialog().getByRole('button', { name: 'Xác nhận xuất thuốc & Hoàn tất ca khám' })).toBeDisabled(); expect(dialog().getByText(/chưa thanh toán đủ/)).toBeInTheDocument(); click('Đóng', dialog());
  act(() => { recordReceptionPayment('reception-demo', invoice.id, { amount: invoice.remaining, method: 'CASH', note: '', acknowledged: true, receiptId: 'receipt-dispense-12345678', expectedRevision: invoice.revision }); });
  fireEvent.click(await screen.findByRole('button', { name: /^Chờ phát thuốc/ })); fireEvent.click(await screen.findByRole('button', { name: 'Xem đơn thuốc Bô' }));
  expect(dialog().getByText('120 Viên')).toBeInTheDocument();
  click('Xác nhận xuất thuốc & Hoàn tất ca khám', dialog());
  expect(await screen.findByText(/Đã xuất thuốc cho Bô và hoàn tất ca khám/)).toBeInTheDocument();
  expect(listMedicines('admin-default').find((item) => item.id === 'medicine-1').availableStock).toBe(118); expect(listDispenseQueue('reception-demo')[0].state).toBe('DISPENSED'); expect(visit.id).toBe('visit-rx-fixture');
  fireEvent.click(screen.getByRole('button', { name: /^Đã phát/ })); expect(await screen.findByRole('button', { name: 'Xem đơn thuốc Bô' })).toBeInTheDocument();
});

test('dispense page reports insufficient stock without changing anything', async () => {
  const visit = billSource(true); visit.prescriptions[0].quantity = 500; visit.billableItems[1].quantity = 500; localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify([visit]));
  const candidate = listBillingCandidates('reception-demo')[0]; const invoice = issueReceptionInvoice('reception-demo', candidate.id, candidate.revision);
  recordReceptionPayment('reception-demo', invoice.id, { amount: invoice.remaining, method: 'CARD', note: '', acknowledged: true, receiptId: 'receipt-stock-12345678', expectedRevision: invoice.revision });
  open('/reception/dispense'); fireEvent.click(await screen.findByRole('button', { name: 'Xem đơn thuốc Bô' })); expect(dialog().getByText(/không đủ/)).toBeInTheDocument();
  click('Xác nhận xuất thuốc & Hoàn tất ca khám', dialog());
  expect(await dialog().findByRole('alert')).toHaveTextContent(/Không thể xuất kho: Thuốc Amoxicillin 250 mg trong kho không đủ số lượng/);
  expect(listMedicines('admin-default').find((item) => item.id === 'medicine-1').availableStock).toBe(120); expect(listDispenseQueue('reception-demo')[0].state).toBe('READY');
});

test('malformed appointments show error/retry and creation is disabled; does not erase data', async () => {
  localStorage.setItem(APPOINTMENTS_KEY, '{bad'); open('/reception/appointments');
  expect(await screen.findByRole('heading', { name: 'Không thể tải hồ sơ' })).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Tạo lịch hẹn' })).toBeDisabled(); expect(localStorage.getItem(APPOINTMENTS_KEY)).toBe('{bad');
  localStorage.setItem(APPOINTMENTS_KEY, '[]'); click('Thử lại'); expect(screen.getByRole('button', { name: 'Tạo lịch hẹn' })).toBeEnabled();
});

test('an open confirm dialog cannot overwrite a concurrent reception update', async () => {
  const record = online(); open('/reception/appointments'); fireEvent.click(await screen.findByRole('button', { name: `Xác nhận lịch ${record.code}` }));
  act(() => { const records = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)); localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(records.map((item) => ({ ...item, version: item.version + 1 })))); window.dispatchEvent(new Event('pawcare:appointments-changed')); });
  click('Xác nhận lịch hẹn', dialog()); expect(await dialog().findByRole('alert')).toHaveTextContent(/vừa thay đổi/); expect(listIntakeAppointments('reception-demo')[0].status).toBe('PENDING');
});

test.each(['/reception/queue', '/reception/intake', '/reception/appointments', '/reception/invoices', '/reception/dispense', '/reception/invoices/missing'])('staff page %s blocks customers', (path) => {
  open(path, 'customer@pawcare.vn'); expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument();
});

test('reception home is the queue board and the navigation lists every receptionist function', async () => {
  open('/reception');
  expect(await screen.findByRole('heading', { name: 'Bảng điều phối hàng đợi' })).toBeInTheDocument();
  const labels = within(screen.getByRole('navigation', { name: /lễ tân/i })).getAllByRole('link').map((link) => link.textContent);
  ['Bảng điều phối hàng đợi', 'Tiếp nhận khách hàng', 'Quản lý lịch hẹn', 'Hóa đơn & thanh toán', 'Phát thuốc', 'Thông tin khách hàng', 'Thông tin thú cưng'].forEach((label) => expect(labels.some((text) => text.includes(label))).toBe(true));
});
