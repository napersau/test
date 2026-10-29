import { getVeterinarianHealthHistory, listVeterinarianHealthPets } from './healthHistoryRepository';
import { healthDateError, matchHealthEvent } from './healthHistoryPolicy';
import { createWalkIn } from '../intake/intakeRepository';
import { startExamination, getExamination, saveExamination, saveClinicalPlan, getClinicalPlan } from '../examinations/examinationRepository';
import { EMPTY_EXAM } from '../examinations/examinationPolicy';
import { MEDICAL_RECORDS_KEY } from '../appointments/appointmentPolicy';
import { VACCINATIONS_KEY } from '../vaccinations/vaccinationPolicy';
import { listMedicalHistory } from '../medicalHistory/medicalHistoryRepository';
import { listVaccinations } from '../vaccinations/vaccinationsRepository';
import { makeCustomerRecordsFixtures } from '../../test/customerRecordsFixtures';
import { updateUser } from '../users/usersRepository';

const actor = 'vet-demo';
export function assignedVisit(extra = {}) { return createWalkIn('reception-demo', { ownerId: 'customer-demo', petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Lượt kiểm thử sức khỏe', assignedDoctorId: actor, weightKg: 5.2, temperatureC: 38.6, priority: 'NORMAL', intakeNote: 'INTAKE_PRIVATE', acknowledged: true, ...extra }); }
export function seedHistory() { const data = makeCustomerRecordsFixtures('2026-10-04'); localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify(data.visits)); localStorage.setItem(VACCINATIONS_KEY, JSON.stringify(data.vaccinations)); return data; }
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-04T02:00:00Z')); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
test.each(['customer-demo', 'reception-demo', 'admin-default', 'missing'])('health readers reject actor %s before reading sources', (id) => {
  localStorage.setItem(MEDICAL_RECORDS_KEY, '{bad'); expect(() => listVeterinarianHealthPets(id)).toThrow(/bác sĩ/); expect(() => getVeterinarianHealthHistory(id, 'pet-bo-demo')).toThrow(/bác sĩ/); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBe('{bad');
});
test('empty source is not seeded; assigned pet appears without invented clinical history', () => {
  expect(listVeterinarianHealthPets(actor)).toEqual([]); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBeNull(); expect(localStorage.getItem(VACCINATIONS_KEY)).toBeNull();
  assignedVisit(); const list = listVeterinarianHealthPets(actor); expect(list).toHaveLength(1); expect(list[0]).toMatchObject({ visitCount: 0, vaccinationCount: 0 });
  const history = getVeterinarianHealthHistory(actor, 'pet-bo-demo'); expect(history.visits).toEqual([]); expect(history.weights).toEqual([]); expect(history.events.map((event) => event.kind)).toEqual(['appointments']);
});
test('only assigned pets, owner pair and completed records are visible; legacy visits by other doctors are allowed without private payload', () => {
  assignedVisit(); const data = seedHistory(); data.visits.push({ ...data.visits[0], id: 'other-pet', petId: 'pet-bella-demo', diagnosis: 'OTHER_PET_PRIVATE' }, { ...data.visits[0], id: 'wrong-owner', ownerId: 'customer-two', diagnosis: 'OTHER_OWNER_PRIVATE' }, { ...data.visits[0], id: 'draft', status: 'IN_PROGRESS', diagnosis: 'DRAFT_PRIVATE' }); localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify(data.visits));
  const history = getVeterinarianHealthHistory(actor, 'pet-bo-demo'); expect(history.visits).toHaveLength(1); expect(history.visits[0].doctorName).toBe('Bác sĩ fixture');
  expect(new Set(history.events.map((event) => event.kind))).toEqual(new Set(['visits', 'prescriptions', 'vaccinations', 'appointments']));
  expect(JSON.stringify(history)).not.toMatch(/PRIVATE|password|doctorOnlyNotes/); expect(() => getVeterinarianHealthHistory(actor, 'pet-bella-demo')).toThrow(/phân công/); expect(() => getVeterinarianHealthHistory('vet-two', 'pet-bo-demo')).toThrow(/phân công/);
  expect(history.weights[0].weight).toBe(6.5); expect(history.vaccinations.find((item) => item.id === 'vax-overdue').status).toBe('OVERDUE'); expect(history.vaccinations.find((item) => item.id === 'vax-completed').status).toBe('COMPLETED');
  expect(history.events.find((item) => item.id === 'vaccinations:vax-today').dateOnly).toBe(true); expect(history.events.find((item) => item.id === 'vaccinations:vax-completed').dateOnly).toBe(false);
});
test('multiple results and prescriptions stay attached to their own completed visit, weight history uses measurements only', () => {
  assignedVisit(); const data = seedHistory(); const first = data.visits[0]; first.results = [{ id: 'result-one', name: 'Kết quả A', result: 'Nội dung A', privateNotes: 'PRIVATE' }];
  const second = { ...first, id: 'visit-two', examinedAt: '2026-10-01T02:00:00Z', weight: null, results: [{ id: 'result-one', name: 'Kết quả B', result: 'Nội dung B' }], prescriptions: [] };
  const third = { ...second, id: 'visit-three', examinedAt: '2026-09-30T02:00:00Z', weight: 7.25 };
  localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify([first, second, third])); const history = getVeterinarianHealthHistory(actor, 'pet-bo-demo');
  expect(history.events.filter((event) => event.kind === 'results')).toHaveLength(3); expect(new Set(history.events.map((event) => event.id)).size).toBe(history.events.length); expect(history.weights.map((point) => point.weight)).toEqual([7.25, 6.5]);
  expect(history.events.find((event) => event.id.includes('visit-two:result-one')).data.result).toBe('Nội dung B');
});
test('real completion updates read-only history and shared customer projection, but draft does not', () => {
  const appointment = assignedVisit(); startExamination(actor, appointment.id, 1); let plan = getClinicalPlan(actor, appointment.id, 'services');
  saveClinicalPlan(actor, appointment.id, 'services', { items: [{ id: '', serviceId: 'service-4', quantity: 1, unitPrice: 50000, notes: 'Ghi chú chỉ định thử', status: 'ORDERED' }], expectedVersion: plan.record.version, expectedAppointmentVersion: plan.appointment.version });
  expect(getVeterinarianHealthHistory(actor, 'pet-bo-demo').events.some((event) => event.kind === 'services')).toBe(false);
  const state = getExamination(actor, appointment.id); saveExamination(actor, appointment.id, { ...EMPTY_EXAM, reason: 'Lý do thử', symptoms: 'Triệu chứng thử', examination: 'Khám thử', diagnosis: 'Chẩn đoán thử', treatmentPlan: 'Kế hoạch thử', recommendations: 'Dặn dò thử', weight: '7.5', temperature: '38.5', doctorOnlyNotes: 'PRIVATE', acknowledged: true, expectedVersion: state.record.version, expectedAppointmentVersion: state.appointment.version }, true);
  const raw = localStorage.getItem(MEDICAL_RECORDS_KEY); const history = getVeterinarianHealthHistory(actor, 'pet-bo-demo'); expect(history.visits[0].appointmentId).toBe(appointment.id); expect(history.events.find((event) => event.kind === 'services').data.status).toBe('COMPLETED'); expect(history.visits[0].diagnosis).toBe(listMedicalHistory('customer-demo')[0].diagnosis); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBe(raw);
});
test('same vaccination DTO for staff/customer; cancelled and planned doses are not counted as administered', () => {
  assignedVisit(); seedHistory(); const history = getVeterinarianHealthHistory(actor, 'pet-bo-demo'); expect(history.vaccinations).toEqual(expect.arrayContaining(listVaccinations('customer-demo'))); expect(listVeterinarianHealthPets(actor)[0].vaccinationCount).toBe(1);
});
test.each(['future', 'weight', 'duplicate', 'relation', 'corrupt'])('invalid source %s is rejected without overwriting stored data', (issue) => {
  const appointment = assignedVisit(); const data = seedHistory();
  if (issue === 'future') data.visits[0].examinedAt = '2026-11-01T02:00:00Z';
  if (issue === 'weight') data.visits[0].weight = '6.5';
  if (issue === 'duplicate') data.visits.push(data.visits[0]);
  if (issue === 'relation') data.visits[0].appointmentId = appointment.id;
  localStorage.setItem(MEDICAL_RECORDS_KEY, issue === 'corrupt' ? '{bad' : JSON.stringify(data.visits)); const raw = localStorage.getItem(MEDICAL_RECORDS_KEY);
  expect(() => getVeterinarianHealthHistory(actor, 'pet-bo-demo')).toThrow(); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBe(raw);
});
test('disabled veterinarian loses access even with known pet URL', () => {
  assignedVisit(); updateUser('admin-default', actor, { status: 'INACTIVE' }); expect(() => getVeterinarianHealthHistory(actor, 'pet-bo-demo')).toThrow(/bác sĩ/);
});
test('filter dates use clinic days and reject invalid/inverted ranges; unknown query does not match', () => {
  expect(healthDateError('2026-10-04', '2026-10-02')).toMatch(/không hợp lệ/); expect(healthDateError('bad', '')).toMatch(/không hợp lệ/); expect(healthDateError('', '')).toBe('');
  expect(matchHealthEvent({ date: '2026-10-04', kind: 'visits', search: 'Chẩn đoán thử' }, { search: 'chan doan', kind: 'visits', from: '2026-10-04', to: '2026-10-04' })).toBe(true);
  expect(matchHealthEvent({ date: '2026-10-04', kind: 'visits', search: 'Chẩn đoán thử' }, { search: '', kind: 'unknown' })).toBe(false);
});
