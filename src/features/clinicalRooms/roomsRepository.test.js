import { createWalkIn, assignDoctor } from '../intake/intakeRepository';
import { getClinicalPlan, saveClinicalPlan, getExamination, startExamination, saveExamination, listVeterinarianAppointments } from '../examinations/examinationRepository';
import { sendToClinicalRooms, inviteBackToRoom, postponeCallback, cancelVisit, closeAbandonedVisit, listCallbackCases, getMyDoctorState, returnToReception } from '../examinations/visitFlowRepository';
import { EMPTY_EXAM } from '../examinations/examinationPolicy';
import { getDoctorStatus } from '../intake/intakePolicy';
import { listIntakeAppointments } from '../intake/intakeRepository';
import { listBillingCandidates } from '../billing/billingRepository';
import { listMedicalHistory } from '../medicalHistory/medicalHistoryRepository';
import { listNotifications } from '../notifications/notificationsRepository';
import { listLabReferences } from '../labConfig/labConfigRepository';
import { MEDICAL_RECORDS_KEY, APPOINTMENTS_KEY } from '../appointments/appointmentPolicy';
import { callPatient, reportMissed, markPresentAgain, recallPatient, postponeCrossRoom, startService, markSampleTaken, saveLabResult, saveImagingResult, cancelRoomService, listRoomQueue, getRoomEntry } from './roomsRepository';
import { imageFileError, IMAGE_MAX_BYTES } from './roomsPolicy';

const VET = 'vet-demo'; const OTHER = 'vet-two'; const RECEPTION = 'reception-demo';
const image = { id: 'img-1', name: 'sieu-am.jpg', type: 'image/jpeg', size: 1000, dataUrl: 'data:image/jpeg;base64,AAAA' };
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-03T03:00:00Z')); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

function openVisit(extra = {}) {
  const walkIn = createWalkIn(RECEPTION, { ownerId: 'customer-demo', petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Nôn ói', weightKg: 5.2, temperatureC: 38.6, assignedDoctorId: VET, ...extra });
  startExamination(VET, walkIn.id, walkIn.version); return walkIn.id;
}
const order = (serviceId, price) => ({ id: '', serviceId, quantity: '1', notes: 'Kiểm thử', status: 'ORDERED', unitPrice: price });
function saveOrders(id, items) { const plan = getClinicalPlan(VET, id, 'services'); return saveClinicalPlan(VET, id, 'services', { items, expectedVersion: plan.record.version, expectedAppointmentVersion: plan.appointment.version }); }
function send(id) { const exam = getExamination(VET, id); return sendToClinicalRooms(VET, id, { expectedVersion: exam.record.version, expectedAppointmentVersion: exam.appointment.version }); }
const rows = (room) => listRoomQueue(VET, room);
const labValues = (key, values = {}) => Object.fromEntries(getRoomEntry(VET, key).indicators.map((item) => [item.id, values[item.code] ?? 7]));
const finalInput = (id, extra = {}) => { const exam = getExamination(VET, id); return { ...EMPTY_EXAM, ...extra, reason: 'Nôn ói', symptoms: 'Nôn nhiều', examination: 'Bụng căng nhẹ', diagnosis: 'Viêm dạ dày ruột', acknowledged: true, expectedVersion: exam.record.version, expectedAppointmentVersion: exam.appointment.version }; };
const status = (id) => listIntakeAppointments(RECEPTION).find((item) => item.id === id).status;

test('clinical rooms are veterinarian-only', () => {
  ['admin-default', RECEPTION, 'customer-demo', 'missing'].forEach((actor) => {
    expect(() => listRoomQueue(actor, 'LABORATORY')).toThrow(/bác sĩ/); expect(() => listCallbackCases(actor)).toThrow(/bác sĩ/); expect(() => getMyDoctorState(actor)).toThrow(/bác sĩ/);
    expect(() => callPatient(actor, 'a~b')).toThrow(/bác sĩ/); expect(() => sendToClinicalRooms(actor, 'x', {})).toThrow(/bác sĩ/);
  });
  expect(() => listRoomQueue(VET, 'PHARMACY')).toThrow(/không hợp lệ/);
});

test('sending lab and imaging orders frees the doctor, fills both queues in parallel and locks the clinical record', () => {
  const id = openVisit();
  expect(getMyDoctorState(VET)).toMatchObject({ key: 'BUSY', roomNumber: 'P01' });
  expect(() => send(id)).toThrow(/Chưa có chỉ định/);
  saveOrders(id, [order('service-2', 250000), order('service-3', 200000)]);
  expect(rows('LABORATORY')).toEqual([]); // chưa gửi thì chưa vào hàng đợi
  const result = send(id); expect(result.sent).toBe(2);
  expect(status(id)).toBe('WAITING_RESULTS'); expect(getMyDoctorState(VET)).toMatchObject({ key: 'AVAILABLE', next: null });
  expect(rows('LABORATORY')).toHaveLength(1); expect(rows('IMAGING')).toHaveLength(1);
  expect(rows('LABORATORY')[0]).toMatchObject({ orderName: 'Xét nghiệm máu CBC', tab: 'QUEUE', callCount: 0, species: 'DOG', ownerName: 'Nguyễn Ngọc Lan' });
  // Hồ sơ lâm sàng bị khóa trong lúc chờ kết quả
  expect(getExamination(VET, id).record.editable).toBe(false);
  expect(() => saveExamination(VET, id, finalInput(id), true)).toThrow(/Chỉ chỉnh sửa hồ sơ đang khám/);
  expect(listNotifications('customer-demo').some((item) => /chỉ định cận lâm sàng/.test(item.title) && /phòng Xét nghiệm/.test(item.message))).toBe(true);
  // Bác sĩ khác nhận ca mới ngay: reception phân công được cho bác sĩ vừa được giải phóng
  const next = createWalkIn(RECEPTION, { ownerId: 'customer-demo', petId: 'pet-bella-demo', serviceId: 'service-1', reason: 'Khám', weightKg: 9, temperatureC: 38.5 });
  expect(assignDoctor(RECEPTION, next.id, VET, next.version).assignedDoctorId).toBe(VET);
});

test('lab and imaging results run in parallel, evaluate by species, and the last one makes the visit RESULTS_READY with a priority lock', () => {
  const id = openVisit(); saveOrders(id, [order('service-2', 250000), order('service-3', 200000)]); send(id);
  const lab = rows('LABORATORY')[0]; const imaging = rows('IMAGING')[0];
  // Huy hiệu liên phòng
  expect(imaging.badge).toBe(''); startService(VET, lab.key); expect(rows('IMAGING')[0].badge).toBe('LAB_COLLECTING');
  markSampleTaken(VET, lab.key); expect(rows('IMAGING')[0].badge).toBe('LAB_SAMPLED');
  expect(() => saveLabResult(VET, imaging.key, { values: {} })).toThrow(/Bắt đầu thực hiện|Bấm/);
  const entry = getRoomEntry(VET, lab.key); expect(entry.indicators.map((item) => item.code)).toEqual(['WBC', 'RBC', 'HGB', 'HCT', 'PLT']); expect(entry.indicators[0].range).toEqual({ min: 6, max: 17 });
  expect(() => saveLabResult(VET, lab.key, { values: { ...labValues(lab.key), [entry.indicators[0].id]: '' } })).toThrow(/Kiểm tra các chỉ số/);
  expect(() => saveLabResult(VET, lab.key, { values: { ...labValues(lab.key), [entry.indicators[0].id]: '-1' } })).toThrow(/Kiểm tra các chỉ số/);
  saveLabResult(VET, lab.key, { values: labValues(lab.key, { WBC: 21, PLT: 150, HGB: 14 }), comment: 'Bạch cầu tăng' });
  const saved = getRoomEntry(VET, lab.key); expect(saved.labResults.map((item) => [item.code, item.evaluation])).toEqual([['WBC', 'HIGH'], ['RBC', 'NORMAL'], ['HGB', 'NORMAL'], ['HCT', 'LOW'], ['PLT', 'LOW']]);
  expect(saved.labResults[0]).toMatchObject({ min: 6, max: 17, species: 'DOG' }); // snapshot khoảng tham chiếu theo loài
  expect(status(id)).toBe('WAITING_RESULTS'); // CĐHA còn chưa xong
  expect(() => saveImagingResult(VET, imaging.key, { description: 'Gan bình thường', conclusion: 'Không bất thường', images: [image] })).toThrow(/Bấm "Bắt đầu chụp/);
  startService(VET, imaging.key);
  expect(() => saveImagingResult(VET, imaging.key, { description: '', conclusion: '', images: [] })).toThrow(/Kiểm tra kết quả/);
  expect(saveImagingResult(VET, imaging.key, { description: 'Gan bình thường', conclusion: 'Không bất thường', images: [image] }).ready).toBe(true);
  expect(status(id)).toBe('RESULTS_READY');
  expect(getMyDoctorState(VET)).toMatchObject({ key: 'AVAILABLE_PRIORITY_CALLBACK', next: { petName: 'Bô' } });
  expect(listNotifications('customer-demo').some((item) => /đầy đủ kết quả cận lâm sàng/.test(item.title))).toBe(true);
  // Priority Lock: lễ tân không phân công thêm ca mới cho bác sĩ này
  const next = createWalkIn(RECEPTION, { ownerId: 'customer-demo', petId: 'pet-bella-demo', serviceId: 'service-1', reason: 'Khám', weightKg: 9, temperatureC: 38.5 });
  expect(() => assignDoctor(RECEPTION, next.id, VET, next.version)).toThrow(/ưu tiên đón ca tái khám: Bô/);
  expect(getDoctorStatus(VET, listIntakeAppointments(RECEPTION)).key).toBe('AVAILABLE_PRIORITY_CALLBACK');
  // Mời vào phòng → giai đoạn 2, bác sĩ BUSY; chốt → WAITING_PAYMENT; kết quả sang bệnh án khách hàng; hóa đơn có cả XN và CĐHA
  const cases = listCallbackCases(VET); expect(cases[0]).toMatchObject({ group: 'READY', progress: { done: 2, total: 2 } });
  const invited = inviteBackToRoom(VET, id, cases[0].version).appointment; expect(invited).toMatchObject({ status: 'IN_PROGRESS', phase: 2, callbackCalls: 1 });
  expect(getMyDoctorState(VET).key).toBe('BUSY'); expect(getExamination(VET, id).record.orders.filter((item) => item.status === 'COMPLETED')).toHaveLength(2);
  saveExamination(VET, id, finalInput(id), true); expect(status(id)).toBe('WAITING_PAYMENT'); expect(getMyDoctorState(VET).key).toBe('AVAILABLE');
  expect(getExamination(VET, id).record.editable).toBe(false);
  const history = listMedicalHistory('customer-demo')[0]; expect(history.results.map((item) => item.name).sort()).toEqual(['Siêu âm ổ bụng', 'Xét nghiệm máu CBC']);
  expect(history.results.find((item) => item.name === 'Xét nghiệm máu CBC').result).toMatch(/WBC: 21 10\^9\/L \(Cao; tham chiếu 6–17\)/);
  const candidate = listBillingCandidates(RECEPTION)[0]; expect(candidate.items.map((item) => item.name).sort()).toEqual(['Khám tổng quát', 'Siêu âm ổ bụng', 'Xét nghiệm máu CBC']); expect(candidate.total).toBe(150000 + 250000 + 200000);
});

test('3 calls are needed before a no-show; the case waits in the postponed tab and is pinned next when the owner is back', () => {
  const id = openVisit(); saveOrders(id, [order('service-2', 250000)]); send(id); jest.advanceTimersByTime(60000);
  const other = openVisitFor('pet-bella-demo'); saveOrders(other, [order('service-2', 250000)]); send(other);
  const [first, second] = rows('LABORATORY'); expect(first.petName).toBe('Bô');
  expect(() => reportMissed(VET, first.key)).toThrow(/gọi đủ 3 lần/);
  expect(callPatient(VET, first.key)).toBe(1); callPatient(VET, first.key); callPatient(VET, first.key);
  expect(() => callPatient(VET, first.key)).toThrow(/Đã gọi đủ 3 lần/);
  reportMissed(VET, first.key); expect(rows('LABORATORY').find((item) => item.key === first.key)).toMatchObject({ tab: 'POSTPONED', missed: true, status: 'PENDING' });
  expect(listNotifications('customer-demo').some((item) => /vắng mặt/.test(item.title))).toBe(true);
  expect(() => startService(VET, first.key)).toThrow(/tạm hoãn/); expect(() => recallPatient(VET, first.key)).toThrow(/chưa báo đã có mặt/);
  expect(rows('LABORATORY').filter((item) => item.tab === 'QUEUE').map((item) => item.petName)).toEqual(['Bella']);
  markPresentAgain(VET, first.key); expect(rows('LABORATORY').find((item) => item.key === first.key).presentAgain).toBe(true);
  recallPatient(VET, first.key); const queue = rows('LABORATORY').filter((item) => item.tab === 'QUEUE');
  expect(queue.map((item) => item.petName)).toEqual(['Bô', 'Bella']); expect(queue[0]).toMatchObject({ priorityNext: true, missed: false }); expect(second.status).toBe('PENDING');
});

function openVisitFor(petId) {
  const walkIn = createWalkIn(RECEPTION, { ownerId: 'customer-demo', petId, serviceId: 'service-1', reason: 'Khám', weightKg: 9, temperatureC: 38.5, assignedDoctorId: VET });
  startExamination(VET, walkIn.id, walkIn.version); return walkIn.id;
}

test('imaging can postpone a case whose pet is still in the lab without blocking the room, then recall it', () => {
  const id = openVisit(); saveOrders(id, [order('service-2', 250000), order('service-3', 200000)]); send(id);
  const imaging = rows('IMAGING')[0]; expect(() => postponeCrossRoom(VET, rows('LABORATORY')[0].key)).toThrow(/Chỉ phòng Chẩn đoán hình ảnh/);
  postponeCrossRoom(VET, imaging.key); expect(rows('IMAGING')[0]).toMatchObject({ tab: 'POSTPONED', status: 'PENDING', crossPostponed: true });
  expect(() => startService(VET, imaging.key)).toThrow(/tạm hoãn/);
  recallPatient(VET, imaging.key); expect(rows('IMAGING')[0]).toMatchObject({ tab: 'QUEUE', priorityNext: true });
});

test('emergency cases go first in the room queue and ordinary cases follow FIFO by the time orders were sent', () => {
  const first = openVisit(); saveOrders(first, [order('service-2', 250000)]); send(first); jest.advanceTimersByTime(60000);
  const second = openVisitFor('pet-bella-demo'); saveOrders(second, [order('service-2', 250000)]); send(second); jest.advanceTimersByTime(60000);
  expect(rows('LABORATORY').map((item) => item.petName)).toEqual(['Bô', 'Bella']);
  const raw = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)); localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(raw.map((item) => (item.id === second ? { ...item, priority: 'PRIORITY' } : item))));
  expect(rows('LABORATORY').map((item) => [item.petName, item.emergency])).toEqual([['Bella', true], ['Bô', false]]);
});

test('cancelling the last pending service returns the visit to the doctor and the cancelled service is never billed', () => {
  const id = openVisit(); saveOrders(id, [order('service-2', 250000), order('service-3', 200000)]); send(id);
  const [lab] = rows('LABORATORY'); const [imaging] = rows('IMAGING');
  expect(() => cancelRoomService(VET, imaging.key, '  ')).toThrow(/lý do/);
  startService(VET, lab.key); saveLabResult(VET, lab.key, { values: labValues(lab.key) });
  expect(cancelRoomService(VET, imaging.key, 'Thú cưng quá hung dữ').ready).toBe(true); expect(status(id)).toBe('RESULTS_READY');
  inviteBackToRoom(VET, id, listCallbackCases(VET)[0].version); saveExamination(VET, id, finalInput(id), true);
  expect(listBillingCandidates(RECEPTION)[0].items.map((item) => item.name).sort()).toEqual(['Khám tổng quát', 'Xét nghiệm máu CBC']);
  expect(getExamination(VET, id).record.orders.find((item) => item.serviceType === 'IMAGING')).toMatchObject({ status: 'CANCELLED', cancelReason: 'Thú cưng quá hung dữ' });
});

test('postponing a recalled case frees the doctor and keeps it in the postponed tab; recall resumes it', () => {
  const id = openVisit(); saveOrders(id, [order('service-2', 250000)]); send(id); const [lab] = rows('LABORATORY');
  startService(VET, lab.key); saveLabResult(VET, lab.key, { values: labValues(lab.key) });
  inviteBackToRoom(VET, id, listCallbackCases(VET)[0].version); expect(getMyDoctorState(VET).key).toBe('BUSY');
  const version = getExamination(VET, id).appointment.version; expect(postponeCallback(VET, id, version).appointment).toMatchObject({ status: 'RESULTS_READY', callbackPostponed: true });
  expect(getMyDoctorState(VET)).toMatchObject({ key: 'AVAILABLE', next: null, postponed: 1 }); expect(listCallbackCases(VET)[0].group).toBe('POSTPONED');
  // Bác sĩ rảnh nên lễ tân phân ca khác được; ca hoãn vẫn gọi lại được sau đó nếu bác sĩ không bận
  inviteBackToRoom(VET, id, listCallbackCases(VET)[0].version); expect(getExamination(VET, id).appointment.callbackCalls).toBe(2);
  saveExamination(VET, id, { ...finalInput(id) }, false); expect(() => postponeCallback(VET, id, getExamination(VET, id).appointment.version)).toThrow(/Đã có nội dung được lưu/);
});

test('a doctor in an exam cannot invite another case back until the current one is done', () => {
  const id = openVisit(); saveOrders(id, [order('service-2', 250000)]); send(id); const [lab] = rows('LABORATORY');
  const next = createWalkIn(RECEPTION, { ownerId: 'customer-demo', petId: 'pet-bella-demo', serviceId: 'service-1', reason: 'Khám', weightKg: 9, temperatureC: 38.5, assignedDoctorId: VET });
  startExamination(VET, next.id, next.version); startService(VET, lab.key); saveLabResult(VET, lab.key, { values: labValues(lab.key) });
  expect(status(id)).toBe('RESULTS_READY'); expect(getMyDoctorState(VET)).toMatchObject({ key: 'BUSY', next: { petName: 'Bô' } });
  expect(() => inviteBackToRoom(VET, id, listCallbackCases(VET)[0].version)).toThrow(/đang khám một ca khác/);
});

test('visit cancellation records who, when and why; it is blocked once a result exists and unfinished services are cancelled', () => {
  const id = openVisit(); saveOrders(id, [order('service-2', 250000)]);
  const version = () => getExamination(VET, id).appointment.version;
  expect(() => cancelVisit(VET, id, { code: 'BAD', expectedVersion: version() })).toThrow(/Chọn lý do/);
  expect(() => cancelVisit(VET, id, { code: 'OTHER', note: ' ', expectedVersion: version() })).toThrow(/ghi chú/i);
  expect(() => cancelVisit(VET, id, { code: 'OWNER_REQUEST', expectedVersion: 99 })).toThrow(/vừa thay đổi/);
  const cancelled = cancelVisit(VET, id, { code: 'OWNER_REQUEST', note: 'Chủ nuôi chuyển viện', expectedVersion: version() }).appointment;
  expect(cancelled).toMatchObject({ status: 'CANCELLED', cancelReasonCode: 'OWNER_REQUEST', cancelledBy: 'VETERINARIAN' }); expect(cancelled.cancellationReason).toMatch(/Chủ nuôi chuyển viện/);
  expect(Number.isFinite(Date.parse(cancelled.cancelledAt))).toBe(true); expect(JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY))[0]).toMatchObject({ status: 'CANCELLED' });
  expect(JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY))[0].serviceOrders[0].status).toBe('CANCELLED'); expect(listBillingCandidates(RECEPTION)).toEqual([]); expect(listMedicalHistory('customer-demo')).toEqual([]);
  expect(listVeterinarianAppointments(VET)[0].status).toBe('CANCELLED');
  // Đã có kết quả hoàn tất → không hủy được, phải đóng ca
  const second = openVisitFor('pet-bella-demo'); const plan = getClinicalPlan(VET, second, 'services');
  saveClinicalPlan(VET, second, 'services', { items: [order('service-2', 250000), order('service-3', 200000)], expectedVersion: plan.record.version, expectedAppointmentVersion: plan.appointment.version });
  const exam = getExamination(VET, second); sendToClinicalRooms(VET, second, { expectedVersion: exam.record.version, expectedAppointmentVersion: exam.appointment.version });
  const lab = rows('LABORATORY')[0]; startService(VET, lab.key); saveLabResult(VET, lab.key, { values: labValues(lab.key) });
  const v2 = getExamination(VET, second).appointment.version;
  expect(() => cancelVisit(VET, second, { code: 'OWNER_REQUEST', expectedVersion: v2 })).toThrow(/Đóng ca/);
});

test('closing an abandoned case locks the record, cancels unfinished services and carries finished costs to an unpaid invoice (debt)', () => {
  const id = openVisit(); saveOrders(id, [order('service-2', 250000), order('service-3', 200000)]); send(id);
  const [lab] = rows('LABORATORY'); startService(VET, lab.key); saveLabResult(VET, lab.key, { values: labValues(lab.key) });
  const version = () => listIntakeAppointments(RECEPTION).find((item) => item.id === id).version;
  expect(status(id)).toBe('WAITING_RESULTS');
  expect(() => closeAbandonedVisit(RECEPTION, id, { note: '', expectedVersion: version() })).toThrow(/ghi chú xác nhận/);
  expect(() => closeAbandonedVisit('customer-demo', id, { note: 'x', expectedVersion: version() })).toThrow(/bác sĩ hoặc lễ tân/);
  const closed = closeAbandonedVisit(RECEPTION, id, { note: 'Đã gọi điện, khách không quay lại', expectedVersion: version() }).appointment;
  expect(closed).toMatchObject({ status: 'COMPLETED', abandoned: true });
  const record = JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY))[0]; expect(record).toMatchObject({ status: 'COMPLETED', abandoned: true });
  expect(record.serviceOrders.map((item) => [item.serviceType, item.status])).toEqual([['LABORATORY', 'COMPLETED'], ['IMAGING', 'CANCELLED']]);
  expect(listMedicalHistory('customer-demo')[0].results.map((item) => item.name)).toEqual(['Xét nghiệm máu CBC']); // kết quả đã làm được giữ lại
  expect(listBillingCandidates(RECEPTION)[0].items.map((item) => item.name).sort()).toEqual(['Khám tổng quát', 'Xét nghiệm máu CBC']);
  expect(() => closeAbandonedVisit(RECEPTION, id, { note: 'again', expectedVersion: closed.version })).toThrow(/chờ kết quả|đã có kết quả/);
});

test('prescriptions cannot exceed the available stock; the price is snapshotted at prescribing time', () => {
  const id = openVisit(); const plan = getClinicalPlan(VET, id, 'prescriptions');
  const rx = (quantity) => ({ id: '', medicineId: 'medicine-1', quantity, dosage: '1 viên', frequency: '2 lần/ngày', duration: '5 ngày', instructions: 'Uống sau ăn' });
  const attempt = (quantity) => () => saveClinicalPlan(VET, id, 'prescriptions', { items: [rx(quantity)], expectedVersion: plan.record.version, expectedAppointmentVersion: plan.appointment.version });
  expect(attempt('121')).toThrow(/Kiểm tra số lượng thuốc/);
  let problem; try { attempt('121')(); } catch (error) { problem = error; }
  expect(problem.fieldErrors['0.quantity']).toBe('Số lượng kê (121) vượt quá tồn kho khả dụng (120). Vui lòng giảm số lượng hoặc kê loại thuốc thay thế.');
  expect(attempt('120')().items[0]).toMatchObject({ medicineName: 'Amoxicillin 250 mg', quantity: 120 });
  expect(getClinicalPlan(VET, id, 'prescriptions').catalog.find((item) => item.id === 'medicine-1')).toMatchObject({ availableStock: 120, activeIngredient: 'Amoxicillin', salePrice: 8000 });
});

test('chốt is blocked by unsent lab/imaging orders but in-room services are recorded as performed', () => {
  const id = openVisit(); saveOrders(id, [order('service-2', 250000), order('service-5', 30000)]);
  expect(() => saveExamination(VET, id, finalInput(id), true)).toThrow(/chưa gửi.*Xét nghiệm máu CBC/);
  const plan = getClinicalPlan(VET, id, 'services'); saveClinicalPlan(VET, id, 'services', { items: plan.record.items.map((item) => (item.serviceId === 'service-2' ? { ...item, status: 'CANCELLED' } : item)), expectedVersion: plan.record.version, expectedAppointmentVersion: plan.appointment.version });
  // Khám sàng lọc trước tẩy giun: bắt buộc có nhiệt độ và không sốt
  expect(() => saveExamination(VET, id, finalInput(id), true)).toThrow(/Khám sàng lọc bắt buộc.*nhập nhiệt độ/);
  expect(() => saveExamination(VET, id, finalInput(id, { temperature: '40.1' }), true)).toThrow(/đang sốt \(40.1 °C\)/);
  saveExamination(VET, id, finalInput(id, { temperature: '38.4' }), true);
  const record = JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY))[0]; expect(record.serviceOrders.map((item) => [item.name, item.status])).toEqual([['Xét nghiệm máu CBC', 'CANCELLED'], ['Công tẩy giun', 'COMPLETED']]);
  expect(record.billableItems.map((item) => item.name)).toEqual(['Khám tổng quát', 'Công tẩy giun']);
  expect(JSON.parse(localStorage.getItem('pawcare_vaccinations_v1')).map((item) => item.vaccineName)).toEqual(['Công tẩy giun']);
  expect(() => saveExamination(VET, id, finalInput(id), true)).toThrow();
});

test('a doctor can return an assigned case that has not started to the shared queue', () => {
  const walkIn = createWalkIn(RECEPTION, { ownerId: 'customer-demo', petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Khám', weightKg: 5, temperatureC: 38.5, assignedDoctorId: VET });
  expect(() => returnToReception(OTHER, walkIn.id, walkIn.version)).toThrow(/phân công/);
  expect(() => returnToReception(VET, walkIn.id, 99)).toThrow(/vừa thay đổi/);
  expect(returnToReception(VET, walkIn.id, walkIn.version).appointment).toMatchObject({ assignedDoctorId: '', roomName: '', status: 'CHECKED_IN' });
  expect(getMyDoctorState(VET).key).toBe('AVAILABLE'); expect(assignDoctor(RECEPTION, walkIn.id, 'vet-two', walkIn.version + 1).assignedDoctorId).toBe('vet-two');
  startExamination('vet-two', walkIn.id, walkIn.version + 2); expect(() => returnToReception('vet-two', walkIn.id, walkIn.version + 3)).toThrow(/chưa bắt đầu/);
});

test('image files must be JPG, PNG or DICOM and at most 10MB', () => {
  expect(imageFileError({ name: 'a.jpg', size: 100 })).toBe(''); expect(imageFileError({ name: 'a.PNG', size: 100 })).toBe(''); expect(imageFileError({ name: 'ct.dcm', size: 100 })).toBe('');
  expect(imageFileError({ name: 'a.gif', size: 100 })).toMatch(/không đúng định dạng/); expect(imageFileError({ name: 'a.jpg', size: IMAGE_MAX_BYTES + 1 })).toMatch(/vượt quá 10MB/); expect(imageFileError({ name: 'a.jpg', size: 0 })).toMatch(/rỗng/);
});

test('lab references for veterinarians expose species ranges read-only', () => {
  const items = listLabReferences(VET); expect(items).toHaveLength(6); expect(items[0].ranges).toEqual({ DOG: { min: 6, max: 17 }, CAT: { min: 5.5, max: 19.5 } });
  expect(() => listLabReferences(RECEPTION)).toThrow(/bác sĩ/);
});
