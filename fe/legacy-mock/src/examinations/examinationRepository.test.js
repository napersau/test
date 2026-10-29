import { listVeterinarianAppointments, listVeterinarianRecords, getExamination, startExamination, saveExamination } from './examinationRepository';
import { EMPTY_EXAM } from './examinationPolicy';
import { assignDoctor, createWalkIn, saveReceptionAppointment } from '../intake/intakeRepository';
import { APPOINTMENTS_KEY, MEDICAL_RECORDS_KEY } from '../appointments/appointmentPolicy';
import { listMedicalHistory } from '../medicalHistory/medicalHistoryRepository';
import { listBillingCandidates, issueReceptionInvoice, recordReceptionPayment } from '../billing/billingRepository';
import { listInvoices } from '../invoices/invoicesRepository';
import { listActivity } from '../activity/activityRepository';
import { updateUser, getVeterinarianCustomer } from '../users/usersRepository';
import { listVeterinarianPets } from '../pets/petsRepository';
import { setPetStatus } from '../pets/petsRepository';
const ACTOR = 'vet-demo';
const reception = (extra = {}) => ({ ownerId: 'customer-demo', petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Khám theo yêu cầu', assignedDoctorId: ACTOR, weightKg: 5.2, temperatureC: 38.6, priority: 'NORMAL', intakeNote: 'RECEPTION_PRIVATE', acknowledged: true, date: '2026-10-04', time: '09:00', ...extra });
const content = (record, appointment, extra = {}) => ({ ...EMPTY_EXAM, reason: 'Lý do bác sĩ xác minh', symptoms: 'Triệu chứng kiểm thử, không tư vấn', examination: 'Quan sát kiểm thử', diagnosis: 'Chẩn đoán kiểm thử', treatmentPlan: 'Kế hoạch kiểm thử', recommendations: 'Dặn dò kiểm thử', weight: '6.25', temperature: '38.1', heartRate: '100', respiratoryRate: '25', doctorOnlyNotes: 'CLINICAL_PRIVATE', acknowledged: true, expectedVersion: record.version, expectedAppointmentVersion: appointment.version, ...extra });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-03T00:00:00Z')); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
test.each(['admin-default', 'reception-demo', 'customer-demo', 'customer-three', 'missing'])('blocks non-active-vet actor %s in every entry point', (actor) => {
  expect(() => listVeterinarianAppointments(actor)).toThrow(/bác sĩ/); expect(() => getExamination(actor, 'fake')).toThrow(/bác sĩ/);
  expect(() => listVeterinarianRecords(actor)).toThrow(/bác sĩ/);
  expect(() => startExamination(actor, 'fake', 1)).toThrow(/bác sĩ/); expect(() => saveExamination(actor, 'fake', {})).toThrow(/bác sĩ/);
  expect(() => listVeterinarianPets(actor)).toThrow(/bác sĩ/); expect(() => getVeterinarianCustomer(actor, 'customer-demo')).toThrow(/bác sĩ/);
});
test('empty inbox is not seeded, staff only sees assigned appointments/pets/customer contacts', () => {
  expect(listVeterinarianAppointments(ACTOR)).toEqual([]); expect(localStorage.getItem(APPOINTMENTS_KEY)).toBeNull(); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBeNull();
  const appointment = createWalkIn('reception-demo', reception());
  expect(listVeterinarianAppointments(ACTOR)).toHaveLength(1); expect(listVeterinarianAppointments('vet-two')).toEqual([]); expect(listVeterinarianPets('vet-two')).toEqual([]);
  expect(() => getExamination('vet-two', appointment.id)).toThrow(/phân công/); expect(() => startExamination('vet-two', appointment.id, 1)).toThrow(/phân công/);
  expect(() => getVeterinarianCustomer(ACTOR, 'customer-two')).toThrow(/phân công/);
  expect(JSON.stringify(listVeterinarianAppointments(ACTOR))).not.toMatch(/password|RECEPTION_PRIVATE/);
});
test('cannot start before check-in or start twice, supports resume and forbids archived pet', () => {
  const scheduled = saveReceptionAppointment('reception-demo', reception({ source: 'PHONE' })); expect(() => startExamination(ACTOR, scheduled.id, scheduled.version)).toThrow(/phân công/);
  const appointment = createWalkIn('reception-demo', reception()); setPetStatus('customer-demo', appointment.petId, 'ARCHIVED'); expect(() => startExamination(ACTOR, appointment.id, 1)).toThrow(/lưu trữ/);
  setPetStatus('customer-demo', appointment.petId, 'ACTIVE'); const record = startExamination(ACTOR, appointment.id, 1);
  expect(record.status).toBe('IN_PROGRESS'); expect(getExamination(ACTOR, appointment.id).record.id).toBe(record.id);
  expect(() => startExamination(ACTOR, appointment.id, 2)).toThrow(/tiếp nhận/);
  expect(JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY))).toHaveLength(1); expect(listMedicalHistory('customer-demo')).toEqual([]);
});
test('only one active examination per doctor, pet or room; never automatically overrides a conflict', () => {
  const first = createWalkIn('reception-demo', reception()); jest.advanceTimersByTime(31 * 60000);
  // Lễ tân không thể phân công thêm cho bác sĩ đang bận; lớp bảo vệ phía bác sĩ vẫn chặn nếu dữ liệu bị gán trùng.
  const second = createWalkIn('reception-demo', reception({ petId: 'pet-bella-demo', assignedDoctorId: '' })); startExamination(ACTOR, first.id, 1);
  expect(() => assignDoctor('reception-demo', second.id, ACTOR, 1)).toThrow(/đã nhận ca khám khác/);
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)).map((item) => (item.id === second.id ? { ...item, assignedDoctorId: ACTOR, assignedDoctorName: 'Trần Minh Khang', roomId: 'P02', roomName: 'Phòng P02' } : item))));
  expect(() => startExamination(ACTOR, second.id, 1)).toThrow(/chưa hoàn tất/);
});
test('draft saves validate metrics and preserve protected identity, arrays and private fields', () => {
  const appointment = createWalkIn('reception-demo', reception()); const started = startExamination(ACTOR, appointment.id, 1); const current = getExamination(ACTOR, appointment.id).appointment;
  for (const extra of [{ weight: '0' }, { heartRate: '1.5' }, { temperature: 'abc' }, { respiratoryRate: '1001' }, { followUpDate: '2026-10-02' }]) expect(() => saveExamination(ACTOR, appointment.id, content(started, current, extra))).toThrow(/kiểm tra/);
  const saved = saveExamination(ACTOR, appointment.id, content(started, current, { id: 'fake', ownerId: 'customer-two', doctorId: 'vet-two', status: 'COMPLETED', billableItems: [{ name: 'fake' }], prescriptions: [{ name: 'fake' }] }));
  expect(saved).toMatchObject({ id: started.id, version: 2, status: 'IN_PROGRESS', weight: 6.25 });
  const raw = JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY))[0]; expect(raw).toMatchObject({ ownerId: 'customer-demo', doctorId: ACTOR, prescriptions: [], billableItems: [] }); expect(raw.doctorOnlyNotes).toBe('CLINICAL_PRIVATE');
  expect(listMedicalHistory('customer-demo')).toEqual([]); expect(listBillingCandidates('reception-demo')).toEqual([]);
});
test('final confirmation requires clinical content and acknowledgement; supports explicit undetermined reason', () => {
  const appointment = createWalkIn('reception-demo', reception()); const record = startExamination(ACTOR, appointment.id, 1); const current = getExamination(ACTOR, appointment.id).appointment;
  expect(() => saveExamination(ACTOR, appointment.id, content(record, current, { acknowledged: false }), true)).toThrow(/kiểm tra/);
  expect(() => saveExamination(ACTOR, appointment.id, content(record, current, { symptoms: '' }), true)).toThrow(/kiểm tra/);
  expect(() => saveExamination(ACTOR, appointment.id, content(record, current, { diagnosis: '', undetermined: true }), true)).toThrow(/kiểm tra/);
  saveExamination(ACTOR, appointment.id, content(record, current, { diagnosis: '', undetermined: true, diagnosisReason: 'Cần theo dõi thêm' }), true);
  expect(listMedicalHistory('customer-demo')[0].diagnosis).toContain('Cần theo dõi thêm');
});
test('completes real workflow into safe customer history and a billable examination snapshot, then receptionist payment', () => {
  const appointment = createWalkIn('reception-demo', reception()); const started = startExamination(ACTOR, appointment.id, 1); const current = getExamination(ACTOR, appointment.id).appointment;
  const finished = saveExamination(ACTOR, appointment.id, content(started, current), true); expect(finished.status).toBe('COMPLETED');
  expect(getExamination(ACTOR, appointment.id).appointment.status).toBe('WAITING_PAYMENT');
  expect(() => saveExamination(ACTOR, appointment.id, content(finished, current))).toThrow(/hoàn tất|đang khám/);
  const publicHistory = listMedicalHistory('customer-demo'); expect(publicHistory).toHaveLength(1); expect(listMedicalHistory('customer-two')).toEqual([]); expect(JSON.stringify(publicHistory)).not.toContain('CLINICAL_PRIVATE');
  const candidate = listBillingCandidates('reception-demo')[0]; expect(candidate).toMatchObject({ total: 150000, items: [{ type: 'SERVICE', quantity: 1, unitPrice: 150000 }] });
  const invoice = issueReceptionInvoice('reception-demo', candidate.id, candidate.revision);
  recordReceptionPayment('reception-demo', invoice.id, { amount: 150000, method: 'CASH', note: '', acknowledged: true, receiptId: 'receipt-vet-workflow-123', expectedRevision: invoice.revision }); expect(listInvoices('customer-demo')[0].status).toBe('PAID');
  // Hóa đơn đã thu đủ và không có đơn thuốc → lượt khám hoàn tất.
  expect(getExamination(ACTOR, appointment.id).appointment.status).toBe('COMPLETED');
  const audit = listActivity('admin-default'); expect(audit.map((item) => item.action)).toEqual(expect.arrayContaining(['EXAMINATION_START', 'EXAMINATION_COMPLETE'])); expect(JSON.stringify(audit)).not.toMatch(/CLINICAL_PRIVATE|Lý do bác sĩ/);
  expect(localStorage.getItem('pawcare_medicines_v1')).toBeNull();
});
test('stale clinical/appointment revisions and canonical vet lock are rechecked on writes', () => {
  const appointment = createWalkIn('reception-demo', reception()); const started = startExamination(ACTOR, appointment.id, 1); const current = getExamination(ACTOR, appointment.id).appointment;
  saveExamination(ACTOR, appointment.id, content(started, current)); expect(() => saveExamination(ACTOR, appointment.id, content(started, current))).toThrow(/vừa thay đổi/);
  const fresh = getExamination(ACTOR, appointment.id); const appointments = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)); appointments[0].version += 1; localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
  expect(() => saveExamination(ACTOR, appointment.id, content(fresh.record, fresh.appointment))).toThrow(/vừa thay đổi/);
  updateUser('admin-default', ACTOR, { status: 'INACTIVE' }); expect(() => getExamination(ACTOR, appointment.id)).toThrow(/bác sĩ/);
});
test('corrupt records never overwritten; failed second-store writes roll back rather than orphan clinical state', () => {
  const appointment = createWalkIn('reception-demo', reception()); localStorage.setItem(MEDICAL_RECORDS_KEY, '{bad'); expect(() => startExamination(ACTOR, appointment.id, 1)).toThrow(/không hợp lệ/); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBe('{bad'); localStorage.removeItem(MEDICAL_RECORDS_KEY);
  const before = localStorage.getItem(APPOINTMENTS_KEY); const setter = Storage.prototype.setItem;
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function write(key, value) { if (key === APPOINTMENTS_KEY) throw new Error('quota'); return setter.call(this, key, value); });
  expect(() => startExamination(ACTOR, appointment.id, 1)).toThrow(/Không lưu/); expect(localStorage.getItem(APPOINTMENTS_KEY)).toBe(before); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBeNull();
});

test('records overview separates creation candidates from existing records and never projects private notes', () => {
  expect(listVeterinarianRecords(ACTOR)).toEqual([]); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBeNull();
  const appointment = createWalkIn('reception-demo', reception()); const candidate = listVeterinarianRecords(ACTOR)[0];
  expect(candidate).toMatchObject({ record: null, canCreate: true }); expect(listVeterinarianRecords('vet-two')).toEqual([]);
  const started = startExamination(ACTOR, appointment.id, 1); const current = getExamination(ACTOR, appointment.id).appointment;
  saveExamination(ACTOR, appointment.id, content(started, current, { diagnosis: '', preliminaryAssessment: 'Đánh giá thử' }));
  const draft = listVeterinarianRecords(ACTOR)[0]; expect(draft.record).toMatchObject({ diagnosisState: 'PRELIMINARY', symptoms: 'Triệu chứng kiểm thử, không tư vấn' });
  expect(draft.record.code).toMatch(/^MR-/); expect(draft.canCreate).toBe(false); expect(JSON.stringify(draft)).not.toContain('CLINICAL_PRIVATE');
  const fresh = getExamination(ACTOR, appointment.id); saveExamination(ACTOR, appointment.id, content(fresh.record, fresh.appointment), true);
  expect(listVeterinarianRecords(ACTOR)[0].record).toMatchObject({ code: draft.record.code, diagnosisState: 'FINAL', status: 'COMPLETED' });
});

test('diagnosis overview treats draft diagnosis and explicit undetermined final state separately', () => {
  const appointment = createWalkIn('reception-demo', reception()); const record = startExamination(ACTOR, appointment.id, 1); const current = getExamination(ACTOR, appointment.id).appointment;
  expect(listVeterinarianRecords(ACTOR)[0].record.diagnosisState).toBe('EMPTY');
  saveExamination(ACTOR, appointment.id, content(record, current)); expect(listVeterinarianRecords(ACTOR)[0].record.diagnosisState).toBe('DRAFT');
  const fresh = getExamination(ACTOR, appointment.id); saveExamination(ACTOR, appointment.id, content(fresh.record, fresh.appointment, { undetermined: true, diagnosis: '', diagnosisReason: 'Chưa đủ dữ kiện' }), true);
  expect(listVeterinarianRecords(ACTOR)[0].record.diagnosisState).toBe('UNDETERMINED');
});

test('corrupt or inconsistent overview sources fail without erasing data or allowing duplicate creation', () => {
  const appointment = createWalkIn('reception-demo', reception()); startExamination(ACTOR, appointment.id, 1);
  const appointments = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)); appointments[0].status = 'CHECKED_IN'; localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
  expect(() => listVeterinarianRecords(ACTOR)).toThrow(/đồng nhất/); expect(() => getExamination(ACTOR, appointment.id)).toThrow(/đồng nhất/);
  localStorage.setItem(MEDICAL_RECORDS_KEY, '{bad'); expect(() => listVeterinarianRecords(ACTOR)).toThrow(/không hợp lệ/); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBe('{bad');
});
