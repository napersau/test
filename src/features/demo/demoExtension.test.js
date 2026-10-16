import { loadDemoDataset, extendDemoDataset, DEMO_STORES } from './demoRepository';
import { DEMO_KEY } from './demoConfig';
import { findAccount, USERS_KEY, updateUser } from '../users/usersRepository';
import { MEDICAL_RECORDS_KEY, APPOINTMENTS_KEY } from '../appointments/appointmentPolicy';
import { PETS_KEY } from '../pets/petsRepository';
import { MEDICINES_KEY } from '../medicines/medicinesRepository';
import { listStaff } from '../staff/staffRepository';
import { listMedicalHistory } from '../medicalHistory/medicalHistoryRepository';
import { listInvoices } from '../invoices/invoicesRepository';
import { listNotifications } from '../notifications/notificationsRepository';
import { listVeterinarianRecords, getClinicalPlan } from '../examinations/examinationRepository';
import { getVeterinarianHealthHistory } from '../healthHistory/healthHistoryRepository';
import { listActivity } from '../activity/activityRepository';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../activity/auditStorage';
import { listAdminCare } from '../reports/adminCareRepository';
const admin = 'admin-default'; const customer = 'demo-v1-customer-1'; const vet = 'demo-v1-vet-1';
const snapshot = () => Object.fromEntries([...DEMO_STORES.map(([key]) => key), DEMO_KEY].map((key) => [key, localStorage.getItem(key)]));
beforeEach(() => { localStorage.clear(); findAccount(admin); loadDemoDataset(admin); });
test('upgrade accepts old marker, appends linked v2 only, preserves edited v1 and inventory/session, is idempotent', () => {
  const oldMarker = JSON.parse(localStorage.getItem(DEMO_KEY)); delete oldMarker.counts.staff; localStorage.setItem(DEMO_KEY, JSON.stringify(oldMarker));
  updateUser(admin, customer, { fullName: 'Chủ nuôi đã sửa' }); const before = snapshot(); const result = extendDemoDataset(admin);
  expect(result.revision).toBe(2); expect(result.counts).toMatchObject({ appointments: 36, visits: 24, invoices: 17, vaccinations: 26, staff: 6 });
  for (const key of [USERS_KEY, PETS_KEY, MEDICINES_KEY]) expect(localStorage.getItem(key)).toBe(before[key]);
  expect(JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY)).slice(0, 18)).toEqual(JSON.parse(before[MEDICAL_RECORDS_KEY]));
  const after = snapshot(); expect(extendDemoDataset(admin).alreadyLoaded).toBe(true); expect(snapshot()).toEqual(after);
});
test('v2 all public readers/clinical plans accept diverse Rx/orders/results/payment states and hide private notes', () => {
  extendDemoDataset(admin);
  const records = listMedicalHistory(customer); expect(records).toHaveLength(10); expect(new Set(records.map((item) => item.diagnosis)).size).toBeGreaterThan(5);
  expect(JSON.stringify(records)).not.toMatch(/GHI_CHU_NOI_BO/);
  expect(new Set(listInvoices(customer).map((item) => item.status))).toEqual(new Set(['PENDING', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'CANCELLED']));
  expect(listNotifications(customer).every((item) => item.to.startsWith('/portal/'))).toBe(true);
  listVeterinarianRecords(vet).filter((item) => item.appointment.id.startsWith('demo-v2')).forEach((item) => {
    expect(() => getClinicalPlan(vet, item.appointment.id, 'prescriptions')).not.toThrow(); expect(() => getClinicalPlan(vet, item.appointment.id, 'services')).not.toThrow();
  });
  expect(getVeterinarianHealthHistory(vet, 'demo-v1-pet-1').visits.length).toBeGreaterThan(3);
  expect(listStaff(admin).every((item) => ['VETERINARIAN', 'RECEPTIONIST'].includes(item.role) && !('profile' in item))).toBe(true);
  const audit = listActivity(admin); expect(new Set(audit.filter((item) => item.id.startsWith('demo-v2')).map((item) => item.action))).toEqual(new Set(Object.keys(AUDIT_ACTIONS)));
  expect(new Set(audit.map((item) => item.module))).toEqual(new Set(Object.keys(AUDIT_MODULES)));
  expect(listAdminCare(admin).invoices).toHaveLength(17);
});
test.each(['customer-demo', 'vet-demo', 'reception-demo'])('v2 denies %s before modifying stores', (actor) => {
  const before = snapshot(); expect(() => extendDemoDataset(actor)).toThrow(); expect(snapshot()).toEqual(before);
});
test('v2 rejects corrupt source and deleted dependency without writes', () => {
  localStorage.setItem(APPOINTMENTS_KEY, '{bad'); let before = snapshot(); expect(() => extendDemoDataset(admin)).toThrow(); expect(snapshot()).toEqual(before);
  localStorage.setItem(APPOINTMENTS_KEY, before[APPOINTMENTS_KEY] === '{bad' ? '[]' : before[APPOINTMENTS_KEY]);
  const pets = JSON.parse(localStorage.getItem(PETS_KEY)); localStorage.setItem(PETS_KEY, JSON.stringify(pets.filter((item) => item.id !== 'demo-v1-pet-1')));
  before = snapshot(); expect(() => extendDemoDataset(admin)).toThrow(/Thiếu/); expect(snapshot()).toEqual(before);
});
test('v2 quota failure restores all previously written stores and the original marker', () => {
  const before = snapshot(); const actual = Storage.prototype.setItem; let failed = false;
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) { if (key === DEMO_KEY && !failed) { failed = true; throw new Error('quota'); } return actual.call(this, key, value); });
  try { expect(() => extendDemoDataset(admin)).toThrow(/khôi phục/); expect(snapshot()).toEqual(before); } finally { spy.mockRestore(); }
});
