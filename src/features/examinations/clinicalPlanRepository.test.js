import { createWalkIn } from '../intake/intakeRepository';
import { getClinicalPlan, saveClinicalPlan, getExamination, startExamination, saveExamination } from './examinationRepository';
import { EMPTY_EXAM } from './examinationPolicy';
import { validatePlan } from './clinicalPlanPolicy';
import { listVeterinarianMedicines, MEDICINES_KEY } from '../medicines/medicinesRepository';
import { listVeterinarianServices, saveService } from '../services/servicesRepository';
import { listMedicalHistory } from '../medicalHistory/medicalHistoryRepository';
import { listBillingCandidates } from '../billing/billingRepository';
import { MEDICAL_RECORDS_KEY, APPOINTMENTS_KEY } from '../appointments/appointmentPolicy';
const actor = 'vet-demo';
const medicine = { id: '', medicineId: 'medicine-1', quantity: '2', dosage: 'Liều do bác sĩ nhập (kiểm thử)', frequency: 'Tần suất kiểm thử', duration: 'Thời gian kiểm thử', instructions: 'Hướng dẫn kiểm thử' };
const service = { id: '', serviceId: 'service-2', quantity: '2', notes: 'Ghi chú kiểm thử', status: 'ORDERED', unitPrice: 250000 };
function visit() {
  const appointment = createWalkIn('reception-demo', { ownerId: 'customer-demo', petId: 'pet-bo-demo', serviceId: 'service-1', assignedDoctorId: actor, weightKg: 5.2, temperatureC: 38.6, priority: 'NORMAL', reason: 'Lượt kiểm thử', intakeNote: '', acknowledged: true });
  startExamination(actor, appointment.id, appointment.version); return appointment.id;
}
const save = (id, kind, items, extra = {}) => { const state = getClinicalPlan(actor, id, kind); return saveClinicalPlan(actor, id, kind, { items, expectedVersion: state.record.version, expectedAppointmentVersion: state.appointment.version, ...extra }); };
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-04T02:00:00Z')); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test.each(['customer-demo', 'admin-default', 'reception-demo', 'missing'])('plan/catalog readers and writers block actor %s before accessing data', (id) => {
  expect(() => listVeterinarianMedicines(id)).toThrow(/bác sĩ/); expect(() => listVeterinarianServices(id)).toThrow(/bác sĩ/);
  expect(() => getClinicalPlan(id, 'missing', 'services')).toThrow(/bác sĩ/); expect(() => saveClinicalPlan(id, 'missing', 'prescriptions', {})).toThrow(/bác sĩ/);
  expect(localStorage.getItem(MEDICINES_KEY)).toBeNull();
});
test('active catalog projections omit batches, import prices and inactive entries', () => {
  const medicines = listVeterinarianMedicines(actor); expect(medicines.find((item) => item.id === 'medicine-6')).toBeUndefined();
  expect(JSON.stringify(medicines)).not.toMatch(/batches|importPrice|remaining/); expect(listVeterinarianServices(actor).find((item) => item.id === 'service-7')).toBeUndefined();
});
test('prescribing never guesses directions, allows no duplicate or invalid quantity', () => {
  expect(validatePlan([{ ...medicine, dosage: '', frequency: '', duration: '', instructions: '' }], 'prescriptions')).toHaveProperty(['0.dosage']);
  expect(validatePlan([medicine, medicine], 'prescriptions')).toHaveProperty(['1.medicineId']);
  for (const quantity of ['0', '1.5', 'Infinity', '', '10001']) expect(validatePlan([{ ...medicine, quantity }], 'prescriptions')).toHaveProperty(['0.quantity']);
});
test('save prescription uses canonical snapshots, increments shared version without stock, charges or public draft', () => {
  const id = visit(); getClinicalPlan(actor, id, 'prescriptions'); const inventory = localStorage.getItem(MEDICINES_KEY); const appointments = localStorage.getItem(APPOINTMENTS_KEY);
  const record = save(id, 'prescriptions', [{ ...medicine, medicineName: 'FORGED', unit: 'FORGED', dispensed: true }]);
  expect(record.items[0]).toMatchObject({ medicineName: 'Amoxicillin 250 mg', unit: 'Viên', quantity: 2 }); expect(record.version).toBe(2);
  expect(localStorage.getItem(MEDICINES_KEY)).toBe(inventory); expect(localStorage.getItem(APPOINTMENTS_KEY)).toBe(appointments);
  expect(listMedicalHistory('customer-demo')).toEqual([]); expect(listBillingCandidates('reception-demo')).toEqual([]);
  expect(JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY))[0].billableItems).toEqual([]);
  expect(() => getClinicalPlan('vet-two', id, 'prescriptions')).toThrow(/phân công/);
});
test('clinical completion preserves saved prescription and orders, publishes prescription only then, and locks both editors', () => {
  const id = visit(); save(id, 'prescriptions', [medicine]); save(id, 'services', [{ ...service, serviceId: 'service-4', quantity: '1', unitPrice: 50000 }]);
  const state = getExamination(actor, id); saveExamination(actor, id, { ...EMPTY_EXAM, reason: 'Lý do thử', symptoms: 'Triệu chứng thử', examination: 'Khám thử', diagnosis: 'Chẩn đoán thử', treatmentPlan: 'Kế hoạch thử', recommendations: 'Dặn dò thử', temperature: '38.5', acknowledged: true, expectedVersion: state.record.version, expectedAppointmentVersion: state.appointment.version }, true);
  expect(listMedicalHistory('customer-demo')[0].prescriptions[0]).toMatchObject({ medicineName: 'Amoxicillin 250 mg', quantity: 2 });
  // Dịch vụ làm tại phòng khám (tiêm vaccine) được ghi nhận đã thực hiện khi chốt đợt khám và vào lịch sử tiêm phòng.
  expect(getClinicalPlan(actor, id, 'services').record.items[0].status).toBe('COMPLETED'); expect(getExamination(actor, id).appointment.status).toBe('WAITING_PAYMENT');
  expect(JSON.parse(localStorage.getItem('pawcare_vaccinations_v1'))[0]).toMatchObject({ petId: 'pet-bo-demo', status: 'COMPLETED', vaccineName: 'Công tiêm vaccine' });
  const billable = JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY))[0].billableItems;
  // Lượt khám + thuốc trong đơn (đơn giá chốt lúc kê đơn, chờ phát sau khi thanh toán); chỉ định dịch vụ chưa thực hiện thì chưa tính tiền.
  expect(billable).toHaveLength(3); expect(billable[0]).toMatchObject({ type: 'SERVICE', fulfillmentStatus: 'COMPLETED', unitPrice: 150000 });
  expect(billable[1]).toMatchObject({ type: 'SERVICE', fulfillmentStatus: 'COMPLETED', name: 'Công tiêm vaccine', unitPrice: 50000, quantity: 1 });
  expect(billable[2]).toMatchObject({ type: 'MEDICINE', fulfillmentStatus: 'ORDERED', name: 'Amoxicillin 250 mg', quantity: 2, unitPrice: 8000 });
  for (const kind of ['prescriptions', 'services']) expect(() => save(id, kind, [])).toThrow(/chỉ được xem/);
});
test('ordered services preserve price and metadata, cancellation keeps history and does not bill', () => {
  const id = visit(); const saved = save(id, 'services', [service]); expect(saved.items[0]).toMatchObject({ status: 'ORDERED', unitPrice: 250000, requiresResult: true, doctorName: 'Trần Minh Khang' });
  saveService('admin-default', { code: 'DV002', name: 'CBC giá mới', serviceType: 'LABORATORY', price: 500000, status: 'ACTIVE' }, 'service-2');
  const changed = save(id, 'services', [{ ...saved.items[0], quantity: '3', unitPrice: 1, name: 'FORGED' }]);
  expect(changed.items[0]).toMatchObject({ quantity: 3, unitPrice: 250000, name: 'Xét nghiệm máu CBC' });
  expect(() => save(id, 'services', [])).toThrow(/Không xóa/);
  const cancelled = save(id, 'services', [{ ...changed.items[0], status: 'CANCELLED' }]); expect(cancelled.items[0].status).toBe('CANCELLED');
  expect(listBillingCandidates('reception-demo')).toEqual([]); expect(() => save(id, 'services', [{ ...cancelled.items[0], status: 'ORDERED' }])).toThrow(/chỉ được xem/);
});
test('invalid/inactive catalog, price change and version conflicts preserve source', () => {
  const id = visit(); const source = localStorage.getItem(MEDICAL_RECORDS_KEY);
  expect(() => save(id, 'prescriptions', [{ ...medicine, medicineId: 'medicine-6' }])).toThrow(/Danh mục/);
  expect(() => save(id, 'services', [{ ...service, unitPrice: 1 }])).toThrow(/Giá/);
  expect(() => save(id, 'services', [{ ...service, status: 'COMPLETED' }])).toThrow(/đánh dấu/);
  expect(() => save(id, 'prescriptions', [medicine], { expectedVersion: 0 })).toThrow(/vừa thay đổi/);
  expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBe(source);
});
test('save rejects corrupt arrays and rollback restores shared records on storage failure', () => {
  const id = visit(); const raw = JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY)); raw[0].serviceOrders = null;
  localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify(raw)); expect(() => getClinicalPlan(actor, id, 'services')).toThrow(/không hợp lệ/);
  delete raw[0].serviceOrders; localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify(raw)); const previous = localStorage.getItem(MEDICAL_RECORDS_KEY);
  getClinicalPlan(actor, id, 'prescriptions'); const original = Storage.prototype.setItem; let once = true;
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) { if (key === APPOINTMENTS_KEY && once) { once = false; throw new Error('quota'); } return original.call(this, key, value); });
  expect(() => save(id, 'prescriptions', [medicine])).toThrow(/Không lưu/); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBe(previous);
});
