import { buildDemoDataset } from './buildDemoDataset';
import { DEMO_KEY, DEMO_ACCOUNTS } from './demoConfig';
import { DEMO_STORES, loadDemoDataset, getDemoStatus, refreshDemoDataset, extendDemoDataset, ensureDemoData } from './demoRepository';
import { findAccount, listUsers, verifyCredentials, USERS_KEY, updateUser } from '../users/usersRepository';
import { listPets, PETS_KEY, savePet } from '../pets/petsRepository';
import { EMPTY_PET } from '../pets/petPolicy';
import { listReceptionCustomers } from '../reception/customersRepository';
import { listServices } from '../services/servicesRepository';
import { listMedicines } from '../medicines/medicinesRepository';
import { listActivity } from '../activity/activityRepository';
import { buildReport } from '../reports/reportPolicy';
import { clinicToday } from '../catalog/catalogPolicy';
import { listAppointments, createAppointment } from '../appointments/appointmentsRepository';
import { APPOINTMENTS_KEY, MEDICAL_RECORDS_KEY } from '../appointments/appointmentPolicy';
import { listIntakeAppointments, getIntakeOptions } from '../intake/intakeRepository';
import { listMedicalHistory } from '../medicalHistory/medicalHistoryRepository';
import { listPrescriptions } from '../prescriptions/prescriptionsRepository';
import { RECORD_STATUS_FOR_VISIT } from '../examinations/examinationPolicy';
import { runLabRound } from '../../test/visitFlowHelpers';
import { listVaccinations } from '../vaccinations/vaccinationsRepository';
import { listInvoices } from '../invoices/invoicesRepository';
import { listVeterinarianRecords, listVeterinarianAppointments, getClinicalPlan, startExamination, saveExamination, getExamination } from '../examinations/examinationRepository';
import { getVeterinarianHealthHistory } from '../healthHistory/healthHistoryRepository';
import { listBillingCandidates, listReceptionInvoices, issueReceptionInvoice, recordReceptionPayment, listDispenseQueue } from '../billing/billingRepository';
import { listNotifications } from '../notifications/notificationsRepository';
const admin = 'admin-default'; const customer = 'demo-v1-customer-1'; const vet = 'demo-v1-vet-1'; const reception = 'demo-v1-reception-1';
const snapshot = () => Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).map((key) => [key, localStorage.getItem(key)]));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); findAccount(admin); });

test('fixture factory is deterministic and has all roles, statuses and linked ids', () => {
  const now = new Date('2026-10-04T10:00:00+07:00'); const data = buildDemoDataset(now);
  expect(buildDemoDataset(now)).toEqual(data);
  expect(data.users.filter((user) => user.role === 'CUSTOMER')).toHaveLength(8);
  expect(data.users.filter((user) => user.role === 'VETERINARIAN')).toHaveLength(4);
  expect(data.pets).toHaveLength(12);
  expect(new Set(data.appointments.map((item) => item.status))).toEqual(new Set(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'WAITING_RESULTS', 'RESULTS_READY', 'WAITING_PAYMENT', 'COMPLETED', 'CANCELLED', 'NO_SHOW']));
  data.appointments.forEach((item) => expect(data.pets.find((pet) => pet.id === item.petId).ownerId).toBe(item.ownerId));
  data.visits.forEach((item) => expect(data.appointments.find((appt) => appt.id === item.appointmentId)).toMatchObject({ petId: item.petId, ownerId: item.ownerId, assignedDoctorId: item.doctorId }));
  data.visits.forEach((item) => expect(RECORD_STATUS_FOR_VISIT[data.appointments.find((appt) => appt.id === item.appointmentId).status]).toBe(item.status));
  const assigned = data.appointments.filter((item) => item.assignedDoctorId && !['CANCELLED', 'NO_SHOW'].includes(item.status));
  const overlapping = assigned.flatMap((item, index) => assigned.slice(index + 1).filter((other) => Math.abs(Date.parse(item.startsAt) - Date.parse(other.startsAt)) < 30 * 60000).map((other) => [item, other]));
  overlapping.forEach(([item, other]) => {
    expect(item.assignedDoctorId).not.toBe(other.assignedDoctorId); expect(item.roomId).not.toBe(other.roomId); expect(item.petId).not.toBe(other.petId);
  });
});
test.each(['customer-demo', 'vet-demo', 'reception-demo', 'missing'])('rejects non-admin %s without writing demo', (actor) => {
  const before = snapshot(); expect(() => loadDemoDataset(actor)).toThrow(); expect(snapshot()).toEqual(before); expect(() => getDemoStatus(actor)).toThrow();
});
test('locked admin cannot seed', () => {
  const users = JSON.parse(localStorage.getItem(USERS_KEY)); users[0].status = 'INACTIVE'; localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const before = snapshot(); expect(() => loadDemoDataset(admin)).toThrow(); expect(snapshot()).toEqual(before);
});
test('append preserves existing data and session; repeats preserve edits and never duplicate', () => {
  listPets('customer-demo'); listServices(admin); listMedicines(admin);
  localStorage.setItem('pawcare_auth_session', 'original-session'); sessionStorage.setItem('custom-draft', 'original-draft');
  const oldUsers = JSON.parse(localStorage.getItem(USERS_KEY)); const oldPets = JSON.parse(localStorage.getItem(PETS_KEY));
  const result = loadDemoDataset(admin); expect(result.alreadyLoaded).toBe(false);
  expect(JSON.parse(localStorage.getItem(USERS_KEY)).slice(0, oldUsers.length)).toEqual(oldUsers);
  expect(JSON.parse(localStorage.getItem(PETS_KEY)).slice(0, oldPets.length)).toEqual(oldPets);
  expect(localStorage.getItem('pawcare_auth_session')).toBe('original-session'); expect(sessionStorage.getItem('custom-draft')).toBe('original-draft');
  updateUser(admin, customer, { fullName: 'Tên demo đã chỉnh sửa' });
  const before = snapshot(); expect(loadDemoDataset(admin).alreadyLoaded).toBe(true); expect(snapshot()).toEqual(before);
  expect(verifyCredentials('demo.customer@pawcare.vn', '123456').fullName).toBe('Tên demo đã chỉnh sửa');
});
test.each([['invalid JSON', '{oops'], ['wrong root', '{}'], ['duplicate ids', '[{"id":"same"},{"id":"same"}]']])('refuses existing corrupt source: %s and preserves all stores', (_, value) => {
  localStorage.setItem(APPOINTMENTS_KEY, value); const before = snapshot(); expect(() => loadDemoDataset(admin)).toThrow(); expect(snapshot()).toEqual(before);
});
test('id, email and marker conflicts are rejected without replacing user data', () => {
  localStorage.setItem(PETS_KEY, '[{"id":"demo-v1-pet-1"}]'); let before = snapshot(); expect(() => loadDemoDataset(admin)).toThrow(/trùng/); expect(snapshot()).toEqual(before);
  localStorage.removeItem(PETS_KEY); const users = JSON.parse(localStorage.getItem(USERS_KEY)); users[1].email = 'DEMO.CUSTOMER@pawcare.vn'; localStorage.setItem(USERS_KEY, JSON.stringify(users));
  before = snapshot(); expect(() => loadDemoDataset(admin)).toThrow(/Email/); expect(snapshot()).toEqual(before);
  localStorage.setItem(DEMO_KEY, '{}'); before = snapshot(); expect(() => loadDemoDataset(admin)).toThrow(/không hợp lệ/); expect(snapshot()).toEqual(before);
});
test('quota failure rolls back all affected keys including absent ones', () => {
  const before = snapshot(); const actual = Storage.prototype.setItem; let failed = false;
  const mocked = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === MEDICAL_RECORDS_KEY && !failed) { failed = true; throw new Error('quota'); } return actual.call(this, key, value);
  });
  try { expect(() => loadDemoDataset(admin)).toThrow(/khôi phục/); expect(snapshot()).toEqual(before); } finally { mocked.mockRestore(); }
});
test('change events dispatch only after complete linked stores and marker are available', () => {
  let checks = 0; const listener = () => { expect(localStorage.getItem(DEMO_KEY)).not.toBeNull(); expect(listMedicalHistory(customer)).toHaveLength(4); checks++; };
  const event = DEMO_STORES.find(([, , name]) => name === 'users')[1]; window.addEventListener(event, listener);
  try { loadDemoDataset(admin); expect(checks).toBe(1); } finally { window.removeEventListener(event, listener); }
});
test('all real readers accept the dataset; private notes and drafts never reach customer', () => {
  loadDemoDataset(admin);
  expect(verifyCredentials('demo.vet@pawcare.vn', '123456').id).toBe(vet);
  expect(verifyCredentials('demo.reception@pawcare.vn', '123456').id).toBe(reception);
  expect(listPets(customer)).toHaveLength(2); expect(listAppointments(customer).length).toBeGreaterThan(5);
  const history = listMedicalHistory(customer); expect(history).toHaveLength(4); expect(JSON.stringify(history)).not.toMatch(/GHI_CHU_NOI_BO/);
  expect(listPrescriptions(customer)).toHaveLength(4);
  expect(new Set(listVaccinations(customer).map((item) => item.status))).toEqual(new Set(['OVERDUE', 'DUE', 'COMPLETED']));
  expect(new Set(listInvoices(customer).map((item) => item.status))).toEqual(new Set(['PENDING', 'PARTIALLY_PAID', 'PAID']));
  expect(listReceptionCustomers(reception)).toHaveLength(12); expect(listIntakeAppointments(reception)).toHaveLength(30);
  expect(getIntakeOptions(reception).rooms).toHaveLength(4);
  expect(listVeterinarianRecords(vet).length).toBeGreaterThan(4); expect(listVeterinarianAppointments(vet).length).toBeGreaterThan(5);
  const health = getVeterinarianHealthHistory(vet, 'demo-v1-pet-1'); expect(health.weights).toHaveLength(3); expect(JSON.stringify(health)).not.toMatch(/GHI_CHU_NOI_BO/);
  const active = listVeterinarianRecords(vet).find((item) => item.appointment.status === 'IN_PROGRESS');
  expect(getClinicalPlan(vet, active.appointment.id, 'prescriptions').record.items).toHaveLength(1);
  expect(getClinicalPlan(vet, active.appointment.id, 'services').record.items).toHaveLength(1);
  expect(new Set(listReceptionInvoices(reception).map((item) => item.status))).toEqual(new Set(['PENDING', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'CANCELLED']));
  expect(listNotifications(customer).every((item) => item.to)).toBe(true);
  const report = buildReport({ users: listUsers(admin), services: listServices(admin), medicines: listMedicines(admin), activity: listActivity(admin) }, buildDemoDataset().users[0].createdAt.slice(0, 10), clinicToday());
  expect(report.customers).toBeGreaterThanOrEqual(8); expect(report.actions).toBeGreaterThan(20); expect(report.warnings.length).toBeGreaterThan(2);
});
test('fixtures support actual finish/start, pet edit, booking, invoice issuing and payment without bypassing guards', () => {
  loadDemoDataset(admin);
  const active = listVeterinarianRecords(vet).find((item) => item.appointment.status === 'IN_PROGRESS'); runLabRound(vet, active.appointment.id); const exam = getExamination(vet, active.appointment.id);
  saveExamination(vet, active.appointment.id, { ...exam.record, diagnosis: 'Chốt hồ sơ khi test demo', acknowledged: true, expectedVersion: exam.record.version, expectedAppointmentVersion: exam.appointment.version }, true);
  const next = listVeterinarianRecords(vet).find((item) => item.appointment.status === 'CHECKED_IN');
  expect(startExamination(vet, next.appointment.id, next.appointment.version).status).toBe('IN_PROGRESS');
  const pet = listPets(customer)[0]; expect(savePet(customer, { ...pet, color: 'Màu đã chỉnh sửa', expectedVersion: pet.version }, pet.id).color).toBe('Màu đã chỉnh sửa');
  const bookingDate = new Date(Date.parse(`${clinicToday()}T00:00:00Z`) + 10 * 86400000).toISOString().slice(0, 10);
  expect(createAppointment(customer, { petId: pet.id, serviceId: 'demo-v1-service-1', reason: 'Test trên dữ liệu demo', date: bookingDate, time: '11:00', preferredDoctorId: vet }).status).toBe('PENDING');
  const candidate = listBillingCandidates(reception).find((item) => !item.invoiceId);
  const invoice = issueReceptionInvoice(reception, candidate.id, candidate.revision);
  expect(recordReceptionPayment(reception, invoice.id, { amount: invoice.remaining, method: 'CASH', note: 'Test demo', receiptId: 'receipt-demo-test-12345678', acknowledged: true, expectedRevision: invoice.revision }).status).toBe('PAID');
});
test('all active demo customers and all four doctors have valid complete read models', () => {
  loadDemoDataset(admin);
  const users = listUsers(admin).filter((item) => item.demo && item.status === 'ACTIVE');
  users.filter((item) => item.role === 'CUSTOMER').forEach((item) => {
    expect(listPets(item.id).length).toBeGreaterThan(0); expect(listMedicalHistory(item.id).length).toBeGreaterThan(0);
    expect(() => listPrescriptions(item.id)).not.toThrow(); expect(() => listInvoices(item.id)).not.toThrow(); expect(() => listVaccinations(item.id)).not.toThrow(); expect(() => listNotifications(item.id)).not.toThrow();
  });
  users.filter((item) => item.role === 'VETERINARIAN').forEach((item) => {
    expect(listVeterinarianRecords(item.id).length).toBeGreaterThan(0);
    listVeterinarianRecords(item.id).forEach((row) => { expect(() => getExamination(item.id, row.appointment.id)).not.toThrow(); expect(() => getVeterinarianHealthHistory(item.id, row.pet.id)).not.toThrow(); });
  });
});

test('base accounts adopt the demo characters: no duplicate demo users, data reachable by customer@ / vet@ / reception@', () => {
  const result = loadDemoDataset(admin, new Date(), { adoptBaseAccounts: true });
  expect(result.aliases).toEqual({ 'demo-v1-customer-1': 'customer-demo', 'demo-v1-customer-2': 'customer-two', 'demo-v1-vet-1': 'vet-demo', 'demo-v1-vet-2': 'vet-two', 'demo-v1-reception-1': 'reception-demo' });
  DEMO_ACCOUNTS.forEach((account) => expect(verifyCredentials(account.email, '123456').id).toBe(account.id));
  expect(listUsers(admin).filter((item) => item.id.startsWith('demo-v1-vet'))).toHaveLength(2);
  expect(listPets('customer-demo').filter((item) => item.demo).length).toBe(2); expect(listAppointments('customer-demo').length).toBeGreaterThan(5);
  expect(listVeterinarianRecords('vet-demo').length).toBeGreaterThan(4);
  expect(listVeterinarianAppointments('vet-demo').map((item) => item.status)).toEqual(expect.arrayContaining(['IN_PROGRESS', 'RESULTS_READY', 'CHECKED_IN']));
  expect(listVeterinarianRecords('vet-two').length).toBeGreaterThan(0);
  expect(listReceptionInvoices('reception-demo').length).toBeGreaterThan(10);
  expect(listInvoices('customer-demo').length).toBeGreaterThan(2);
  const stored = JSON.parse(localStorage.getItem(DEMO_KEY)); expect(stored.aliases['demo-v1-vet-1']).toBe('vet-demo');
  expect(extendDemoDataset(admin).counts.staff).toBeGreaterThan(5);
  expect(JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY)).some((row) => row.doctorId === 'vet-demo' && row.id.startsWith('demo-v2'))).toBe(true);
});
test('adoption skips a base account that is locked or has another role', () => {
  const users = JSON.parse(localStorage.getItem(USERS_KEY)); users.find((item) => item.id === 'vet-demo').status = 'LOCKED'; localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const result = loadDemoDataset(admin, new Date(), { adoptBaseAccounts: true });
  expect(result.aliases['demo-v1-vet-1']).toBeUndefined(); expect(verifyCredentials('demo.vet@pawcare.vn', '123456').id).toBe('demo-v1-vet-1');
});
test('refresh keeps base-account adoption', () => {
  loadDemoDataset(admin, new Date(), { adoptBaseAccounts: true }); const result = refreshDemoDataset(admin);
  expect(result.aliases['demo-v1-vet-1']).toBe('vet-demo'); expect(listVeterinarianRecords('vet-demo').length).toBeGreaterThan(4);
  expect(listUsers(admin).filter((item) => item.id.startsWith('demo-v1-vet'))).toHaveLength(2);
});
test('demo covers the new visit stages for the main vet and the dispensing queue states', () => {
  loadDemoDataset(admin);
  const statuses = listVeterinarianAppointments(vet).map((item) => item.status);
  expect(statuses).toEqual(expect.arrayContaining(['IN_PROGRESS', 'RESULTS_READY', 'CHECKED_IN']));
  expect(new Set(listDispenseQueue(reception).map((item) => item.state))).toEqual(new Set(['NO_INVOICE', 'WAITING_PAYMENT', 'READY', 'DISPENSED']));
  expect(listReceptionInvoices(reception).some((item) => item.discount > 0)).toBe(true);
  expect(listReceptionInvoices(reception).some((item) => item.items.some((line) => line.type === 'MEDICINE'))).toBe(true);
});
test('refresh replaces only demo rows, keeps real data and extension, and rolls back on failure', () => {
  loadDemoDataset(admin); extendDemoDataset(admin);
  const pet = listPets(customer)[0]; savePet(customer, { ...pet, color: 'Màu đã chỉnh sửa', expectedVersion: pet.version }, pet.id);
  const real = savePet('customer-demo', { ...EMPTY_PET, name: 'Thú cưng thật', species: 'DOG', gender: 'MALE', birthDate: '2022-01-01', weight: 5 });
  const before = JSON.parse(localStorage.getItem(USERS_KEY)).filter((item) => !item.demo);
  const result = refreshDemoDataset(admin); expect(result.alreadyLoaded).toBe(false); expect(result.revision).toBe(2);
  expect(listPets(customer).find((item) => item.id === pet.id).color).not.toBe('Màu đã chỉnh sửa');
  expect(JSON.parse(localStorage.getItem(PETS_KEY)).some((item) => item.id === real.id)).toBe(true);
  expect(JSON.parse(localStorage.getItem(USERS_KEY)).filter((item) => !item.demo)).toEqual(before);
  expect(JSON.parse(localStorage.getItem(PETS_KEY)).filter((item) => item.demo)).toHaveLength(12);
  const snap = snapshot(); const actual = Storage.prototype.setItem; let failed = false;
  const mocked = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) { if (key === MEDICAL_RECORDS_KEY && !failed) { failed = true; throw new Error('quota'); } return actual.call(this, key, value); });
  try { expect(() => refreshDemoDataset(admin)).toThrow(); expect(snapshot()).toEqual(snap); } finally { mocked.mockRestore(); }
});
test('refresh requires a loaded demo and an admin', () => {
  expect(() => refreshDemoDataset(admin)).toThrow(/Chưa có bộ demo/);
  loadDemoDataset(admin); expect(() => refreshDemoDataset('vet-demo')).toThrow();
});

test('ensureDemoData loads full demo on a clean browser, refreshes a stale one, and otherwise leaves data alone', () => {
  const morning = new Date('2026-10-10T08:00:00+07:00'); const nextDay = new Date('2026-10-11T08:00:00+07:00');
  expect(ensureDemoData(morning)).toBe('loaded');
  const marker = JSON.parse(localStorage.getItem(DEMO_KEY)); expect(marker.revision).toBe(2); expect(marker.aliases['demo-v1-vet-1']).toBe('vet-demo');
  expect(ensureDemoData(new Date('2026-10-10T20:00:00+07:00'))).toBe('skipped');
  const appts = () => JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)); const today = (list, day) => list.filter((item) => item.startsAt.startsWith(day) && item.status === 'CONFIRMED').length;
  expect(today(appts(), '2026-10-11')).toBe(0);
  expect(ensureDemoData(nextDay)).toBe('refreshed'); expect(today(appts(), '2026-10-11')).toBeGreaterThan(0); expect(JSON.parse(localStorage.getItem(DEMO_KEY)).revision).toBe(2);
  const old = JSON.parse(localStorage.getItem(DEMO_KEY)); delete old.dataRevision; localStorage.setItem(DEMO_KEY, JSON.stringify(old));
  expect(ensureDemoData(nextDay)).toBe('refreshed');
});
test('ensureDemoData never overwrites when sources are corrupt', () => {
  localStorage.setItem(APPOINTMENTS_KEY, '{broken'); const before = snapshot(); const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try { expect(ensureDemoData()).toBe('failed'); expect(snapshot()).toEqual(before); } finally { warn.mockRestore(); }
});
