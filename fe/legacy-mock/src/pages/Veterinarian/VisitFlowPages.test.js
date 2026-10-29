import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../../features/auth/authStorage';
import { createWalkIn } from '../../features/intake/intakeRepository';
import { getClinicalPlan, saveClinicalPlan, getExamination, startExamination, listVeterinarianAppointments } from '../../features/examinations/examinationRepository';
import { sendToClinicalRooms, listCallbackCases } from '../../features/examinations/visitFlowRepository';
import { listRoomQueue, startService, saveLabResult, getRoomEntry } from '../../features/clinicalRooms/roomsRepository';
import { IMAGE_MAX_BYTES } from '../../features/clinicalRooms/roomsPolicy';

const VET = 'vet-demo';
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, '', '/'); jest.useFakeTimers({ doNotFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'queueMicrotask', 'nextTick', 'setImmediate'] }); jest.setSystemTime(new Date('2026-10-03T03:00:00Z')); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
const open = (path, email = 'vet@pawcare.vn') => { authenticate(email, '123456', true); window.history.replaceState({}, '', path); return render(<App />); };
const dialog = () => within(screen.getByRole('dialog'));
const click = (name, scope) => fireEvent.click((scope ?? screen).getByRole('button', { name }));

function startedVisit(petId = 'pet-bo-demo') {
  const walkIn = createWalkIn('reception-demo', { ownerId: 'customer-demo', petId, serviceId: 'service-1', reason: 'Nôn ói', weightKg: 5.2, temperatureC: 38.6, assignedDoctorId: VET });
  startExamination(VET, walkIn.id, walkIn.version); return walkIn.id;
}
function orderServices(id, serviceIds) {
  const plan = getClinicalPlan(VET, id, 'services'); const price = { 'service-2': 250000, 'service-3': 200000 };
  saveClinicalPlan(VET, id, 'services', { items: serviceIds.map((serviceId) => ({ id: '', serviceId, quantity: '1', notes: 'Kiểm thử', status: 'ORDERED', unitPrice: price[serviceId] })), expectedVersion: plan.record.version, expectedAppointmentVersion: plan.appointment.version });
}
const sendRooms = (id) => { const exam = getExamination(VET, id); sendToClinicalRooms(VET, id, { expectedVersion: exam.record.version, expectedAppointmentVersion: exam.appointment.version }); };

test('doctor sends lab and imaging orders from the examination screen and is freed for the next case', async () => {
  const id = startedVisit(); orderServices(id, ['service-2', 'service-3']);
  open(`/vet/examinations/${id}`);
  expect(await screen.findByText('Giai đoạn 1 · khám lâm sàng và ra chỉ định')).toBeInTheDocument(); expect(screen.getByText(/SINH HIỆU LÚC TIẾP NHẬN/)).toBeInTheDocument(); expect(screen.getByText(/5.2 kg · 38.6 °C/)).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Trạng thái bác sĩ' })).getByText('Đang khám')).toBeInTheDocument();
  click('Xác nhận chỉ định & chuyển phòng CLS'); expect(dialog().getByText(/Phòng Xét nghiệm/)).toBeInTheDocument(); expect(dialog().getByText(/Phòng Chẩn đoán hình ảnh/)).toBeInTheDocument();
  click('Xác nhận gửi chỉ định', dialog());
  expect(await screen.findByText('Đang chờ kết quả cận lâm sàng — bác sĩ được giải phóng để khám ca khác')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Trạng thái bác sĩ' })).getByText('Sẵn sàng nhận ca')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Lưu nháp hồ sơ' })).not.toBeInTheDocument();
  expect(screen.getByText('Hồ sơ đang tạm khóa · Chỉ đọc')).toBeInTheDocument();
  expect(screen.getByText('Tiến độ cận lâm sàng: 0/2 dịch vụ đã xong.')).toBeInTheDocument();
  expect(listVeterinarianAppointments(VET)[0].status).toBe('WAITING_RESULTS');
});

test('sending without a lab or imaging order is not offered; a visit can be cancelled with a reason code', async () => {
  const id = startedVisit(); open(`/vet/examinations/${id}`);
  expect(await screen.findByText('Giai đoạn 1 · khám lâm sàng và ra chỉ định')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: /chuyển phòng CLS/ })).not.toBeInTheDocument();
  click('Hủy lượt khám'); fireEvent.change(dialog().getByLabelText(/Lý do hủy/), { target: { value: 'OTHER' } }); click('Xác nhận hủy lượt khám', dialog());
  expect(await dialog().findByRole('alert')).toHaveTextContent(/ghi rõ nội dung|Nhập ghi chú/);
  fireEvent.change(dialog().getByLabelText(/Ghi chú/), { target: { value: 'Chuyển bệnh viện khác' } }); click('Xác nhận hủy lượt khám', dialog());
  expect(await screen.findByText(/Đã hủy lượt khám/)).toBeInTheDocument(); expect(screen.getByText('Lượt khám đã hủy')).toBeInTheDocument();
});

test('lab room: call three times, start, enter values, species-based evaluation badges, then the visit is ready for the doctor', async () => {
  const id = startedVisit(); orderServices(id, ['service-2']); sendRooms(id);
  open('/vet/lab'); expect(await screen.findByText('Bô')).toBeInTheDocument(); expect(screen.getByText('Đã gọi 0/3 lần')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Báo vắng mặt Bô' })).toBeDisabled();
  for (let count = 1; count <= 3; count += 1) { click('Mời vào phòng Bô'); expect(await screen.findByText(`Đã gọi ${count}/3 lần`)).toBeInTheDocument(); }
  expect(screen.getByRole('button', { name: 'Mời vào phòng Bô' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Báo vắng mặt Bô' })).toBeEnabled();
  click('Bắt đầu thực hiện Bô'); expect(await screen.findByText(/Đã bắt đầu Xét nghiệm máu CBC/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Đang thực hiện/ })); expect(await screen.findByText(/Đang thực hiện · đang lấy mẫu/)).toBeInTheDocument();
  click('Đã lấy mẫu xong Bô'); expect(await screen.findByText(/đã lấy mẫu/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Nhập kết quả' }));
  expect(await screen.findByLabelText('Giá trị WBC')).toBeInTheDocument(); expect(screen.getByText('Tham chiếu Chó: 6 – 17 10^9/L')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Giá trị WBC'), { target: { value: '21' } }); expect(screen.getByText('Cao')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Giá trị PLT'), { target: { value: '150' } }); expect(screen.getByText('Thấp')).toBeInTheDocument();
  click('Lưu & Xác nhận kết quả'); expect(await screen.findByText(/Nhập giá trị RBC/)).toBeInTheDocument();
  ['RBC', 'HGB', 'HCT'].forEach((code) => fireEvent.change(screen.getByLabelText(`Giá trị ${code}`), { target: { value: '10' } }));
  click('Lưu & Xác nhận kết quả'); expect(await screen.findByText(/Ca đã có kết quả đầy đủ — đã báo bác sĩ khám chính/)).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Kết quả Xét nghiệm máu CBC' })).toBeInTheDocument(); expect(screen.queryByLabelText('Giá trị WBC')).not.toBeInTheDocument();
  expect(listVeterinarianAppointments(VET)[0].status).toBe('RESULTS_READY');
});

test('imaging room: cross-room badge, postpone/recall, invalid file errors and a successful upload with preview', async () => {
  const id = startedVisit(); orderServices(id, ['service-2', 'service-3']); sendRooms(id);
  const lab = listRoomQueue(VET, 'LABORATORY')[0]; startService(VET, lab.key);
  open('/vet/imaging'); expect(await screen.findByText('🟡 Đang lấy máu bên phòng Lab')).toBeInTheDocument();
  click('Tạm hoãn Bô'); expect(await screen.findByText(/Đã tạm hoãn Bô/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Ca tạm hoãn/ })); expect(await screen.findByText('Tạm hoãn: chưa sang phòng')).toBeInTheDocument();
  click('Gọi lại vào phòng Bô'); expect(await screen.findByText(/Đã gọi lại Bô/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Hàng đợi/ })); expect(await screen.findByText('Ưu tiên kế tiếp')).toBeInTheDocument();
  click('Bắt đầu chụp / siêu âm Bô'); fireEvent.click(await screen.findByRole('button', { name: /Đang thực hiện/ })); fireEvent.click(await screen.findByRole('link', { name: 'Nhập kết quả' }));
  const input = await screen.findByLabelText(/Ảnh siêu âm/);
  fireEvent.change(input, { target: { files: [new File(['x'], 'tai-lieu.gif', { type: 'image/gif' })] } });
  expect(await screen.findByText(/không đúng định dạng/)).toBeInTheDocument();
  const big = new File(['x'], 'lon.jpg', { type: 'image/jpeg' }); Object.defineProperty(big, 'size', { value: IMAGE_MAX_BYTES + 1 });
  fireEvent.change(input, { target: { files: [big] } }); expect(await screen.findByText(/vượt quá 10MB/)).toBeInTheDocument();
  click('Lưu & Xác nhận kết quả'); expect(await screen.findByText(/Nhập mô tả hình ảnh/)).toBeInTheDocument(); expect(screen.getByText(/Tải lên ít nhất một ảnh/)).toBeInTheDocument();
  fireEvent.change(input, { target: { files: [new File(['abc'], 'sieu-am.png', { type: 'image/png' })] } });
  expect(await screen.findByAltText('Xem trước sieu-am.png')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Mô tả hình ảnh/), { target: { value: 'Gan, thận bình thường' } }); fireEvent.change(screen.getByLabelText(/Kết luận chẩn đoán hình ảnh/), { target: { value: 'Chưa thấy bất thường' } });
  click('Lưu & Xác nhận kết quả'); expect(await screen.findByText(/Đã lưu và xác nhận kết quả chẩn đoán hình ảnh/)).toBeInTheDocument();
  expect(await screen.findByText('Gan, thận bình thường')).toBeInTheDocument(); expect(getRoomEntry(VET, lab.key).entry.status).toBe('IN_PROGRESS');
});

test('cancelling a room service needs a reason and returns the case to the doctor when it was the last one', async () => {
  const id = startedVisit(); orderServices(id, ['service-3']); sendRooms(id); const [entry] = listRoomQueue(VET, 'IMAGING');
  open(`/vet/imaging/${encodeURIComponent(entry.key)}`); fireEvent.click(await screen.findByRole('button', { name: 'Hủy dịch vụ' }));
  fireEvent.change(dialog().getByLabelText(/Lý do hủy/), { target: { value: ' ' } }); click('Xác nhận hủy dịch vụ', dialog()); expect(await dialog().findByRole('alert')).toHaveTextContent(/lý do/);
  fireEvent.change(dialog().getByLabelText(/Lý do hủy/), { target: { value: 'Thú cưng quá hung dữ' } }); click('Xác nhận hủy dịch vụ', dialog());
  expect(await screen.findByText(/Ca đã đủ kết quả — đã báo bác sĩ khám chính/)).toBeInTheDocument(); expect(listVeterinarianAppointments(VET)[0].status).toBe('RESULTS_READY');
});

test('priority prompt invites the next case with results; the callback page lists, invites and shows postponed cases', async () => {
  const id = startedVisit(); orderServices(id, ['service-2']); sendRooms(id); const [lab] = listRoomQueue(VET, 'LABORATORY'); startService(VET, lab.key);
  saveLabResult(VET, lab.key, { values: Object.fromEntries(getRoomEntry(VET, lab.key).indicators.map((item) => [item.id, 7])) });
  open('/vet/today');
  expect(await screen.findByText('Ca khám tiếp theo: Bệnh nhân Bô')).toBeInTheDocument(); expect(screen.getByText('Sẵn sàng · ưu tiên đón ca tái khám')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Ca chờ tái khám' }));
  expect(await screen.findByRole('heading', { name: 'Ca chờ tái khám' })).toBeInTheDocument(); expect(screen.getByText('Thứ tự 1')).toBeInTheDocument();
  click('Mời vào phòng Bô');
  expect(await screen.findByText('Giai đoạn 2 · đọc kết quả, chẩn đoán xác định và kê đơn')).toBeInTheDocument(); expect(screen.getByRole('region', { name: 'Kết quả cận lâm sàng' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Kết quả Xét nghiệm máu CBC' })).toBeInTheDocument();
  click('Tạm hoãn / Gọi ca tiếp (khách chưa vào phòng)'); expect(await screen.findByText(/Đã có kết quả · khách chưa vào phòng/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Ca chờ tái khám' })); fireEvent.click(await screen.findByRole('button', { name: /Đã hoãn/ }));
  click('Gọi lại vào phòng Bô'); expect(await screen.findByText('Giai đoạn 2 · đọc kết quả, chẩn đoán xác định và kê đơn')).toBeInTheDocument();
  expect(listCallbackCases(VET)).toEqual([]);
});

test('closing an abandoned case from the vet screen asks for the contact result', async () => {
  const id = startedVisit(); orderServices(id, ['service-2']); sendRooms(id);
  open(`/vet/examinations/${id}`); fireEvent.click(await screen.findByRole('button', { name: 'Đóng ca / Khách bỏ về' }));
  click('Xác nhận đóng ca', dialog()); expect(await dialog().findByRole('alert')).toHaveTextContent(/ghi chú xác nhận|Ghi lại kết quả liên hệ/);
  fireEvent.change(dialog().getByLabelText(/Kết quả liên hệ khách/), { target: { value: 'Đã gọi, khách không quay lại' } }); click('Xác nhận đóng ca', dialog());
  expect(await screen.findByText(/Đã đóng ca/)).toBeInTheDocument(); expect(await screen.findByText('Lượt khám đã hoàn tất')).toBeInTheDocument();
});

test.each(['/vet/callback', '/vet/lab', '/vet/imaging', '/vet/lab/x~y', '/vet/imaging/x~y'])('vet room page %s blocks other roles', (path) => {
  open(path, 'reception@pawcare.vn'); expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeInTheDocument();
});

test('reception sees the priority lock reason and the waiting-results panel', async () => {
  const id = startedVisit(); orderServices(id, ['service-2']); sendRooms(id);
  open('/reception/queue', 'reception@pawcare.vn'); expect(await screen.findByRole('heading', { name: /Đang chờ kết quả cận lâm sàng/ })).toBeInTheDocument(); expect(screen.getByText('Chờ kết quả cận lâm sàng')).toBeInTheDocument();
  const [lab] = listRoomQueue(VET, 'LABORATORY'); act(() => { startService(VET, lab.key); saveLabResult(VET, lab.key, { values: Object.fromEntries(getRoomEntry(VET, lab.key).indicators.map((item) => [item.id, 7])) }); });
  expect(await screen.findByText('Sẵn sàng · ưu tiên đón ca tái khám')).toBeInTheDocument();
});
