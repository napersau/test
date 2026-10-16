import { listVaccinations } from '../vaccinations/vaccinationsRepository';
import { vaccinationStatus, VACCINATIONS_KEY } from '../vaccinations/vaccinationPolicy';
import { listPrescriptions } from '../prescriptions/prescriptionsRepository';
import { listInvoices, projectInvoice } from '../invoices/invoicesRepository';
import { INVOICES_KEY } from '../invoices/invoicePolicy';
import { MEDICAL_RECORDS_KEY } from '../appointments/appointmentPolicy';
import { listPets, savePet, setPetStatus } from '../pets/petsRepository';
import { makeCustomerRecordsFixtures } from '../../test/customerRecordsFixtures';
import { USERS_KEY } from '../users/usersRepository';

let fixtures;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-03T02:00:00Z'));
  fixtures = makeCustomerRecordsFixtures('2026-10-03');
});
afterEach(() => jest.useRealTimers());
function seed() { localStorage.setItem(VACCINATIONS_KEY, JSON.stringify(fixtures.vaccinations)); localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify(fixtures.visits)); localStorage.setItem(INVOICES_KEY, JSON.stringify(fixtures.invoices)); }

test('readers start empty without fabricating vaccinations, prescriptions or invoices', () => {
  expect(listVaccinations('customer-demo')).toEqual([]); expect(listPrescriptions('customer-demo')).toEqual([]); expect(listInvoices('customer-demo')).toEqual([]);
  [VACCINATIONS_KEY, MEDICAL_RECORDS_KEY, INVOICES_KEY].forEach((key) => expect(localStorage.getItem(key)).toBeNull());
});

test('vaccination states distinguish clinic-day due/overdue/upcoming/later from completed/cancelled', () => {
  seed(); const records = listVaccinations('customer-demo');
  expect(records.map((item) => item.status)).toEqual(expect.arrayContaining(['OVERDUE', 'DUE', 'UPCOMING', 'SCHEDULED', 'COMPLETED', 'CANCELLED']));
  expect(records.find((item) => item.id === 'vax-completed').status).toBe('COMPLETED');
  expect(vaccinationStatus({ status: 'PLANNED', dueDate: '2026-11-02' }, '2026-10-03')).toBe('UPCOMING');
  expect(vaccinationStatus({ status: 'PLANNED', dueDate: '2026-11-03' }, '2026-10-03')).toBe('SCHEDULED');
  jest.setSystemTime(new Date('2026-10-03T17:01:00Z')); expect(listVaccinations('customer-demo').find((item) => item.id === 'vax-today').status).toBe('OVERDUE');
});

test('all sources enforce role, current account state and pet ownership even when IDs are forged', () => {
  seed(); const foreignPet = savePet('customer-two', { name: 'Pet riêng' });
  localStorage.setItem(VACCINATIONS_KEY, JSON.stringify([...fixtures.vaccinations, { ...fixtures.vaccinations[0], id: 'forged-pet', petId: foreignPet.id }]));
  localStorage.setItem(INVOICES_KEY, JSON.stringify([...fixtures.invoices, { ...fixtures.invoices[0], id: 'forged-invoice', petId: foreignPet.id }]));
  const readers = [listVaccinations, listPrescriptions, listInvoices];
  readers.forEach((reader) => {
    expect(reader('customer-two')).toEqual([]);
    ['admin-default', 'vet-demo', 'reception-demo', 'customer-three', 'unknown'].forEach((id) => expect(() => reader(id)).toThrow(/khách hàng/));
  });
  expect(listVaccinations('customer-demo')).toHaveLength(6); expect(listInvoices('customer-demo')).toHaveLength(1);
  setPetStatus('customer-demo', 'pet-bo-demo', 'ARCHIVED'); expect(listPrescriptions('customer-demo')).toHaveLength(1); expect(listInvoices('customer-demo')).toHaveLength(1);
  const users = JSON.parse(localStorage.getItem(USERS_KEY)); localStorage.setItem(USERS_KEY, JSON.stringify(users.map((user) => user.id === 'customer-demo' ? { ...user, status: 'INACTIVE' } : user)));
  readers.forEach((reader) => expect(() => reader('customer-demo')).toThrow(/khách hàng/));
});

test('public projections remove internal notes, preserve supplied directions and support old completed visits', () => {
  seed(); [listVaccinations, listPrescriptions, listInvoices].forEach((reader) => expect(JSON.stringify(reader('customer-demo'))).not.toContain('PRIVATE_FIXTURE_NOTE'));
  expect(listPrescriptions('customer-demo')[0].items[0]).toMatchObject({ dosage: 'Liều fixture', frequency: 'Tần suất fixture', duration: 'Thời gian fixture', quantity: 2 });
  const legacy = { ...fixtures.visits[0], prescriptions: [{ id: 'legacy', medicineName: 'Thuốc cũ fixture', dosage: '', instructions: '' }] };
  localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify([legacy, { ...legacy, id: 'draft', status: 'IN_PROGRESS' }, { ...legacy, id: 'no-rx', prescriptions: [] }]));
  expect(listPrescriptions('customer-demo')).toHaveLength(1); expect(listPrescriptions('customer-demo')[0].items[0]).toMatchObject({ quantity: null, frequency: '', duration: '' });
});

test('invoice totals derive from completed services and dispensed quantities, ignoring fabricated totals', () => {
  seed(); const invoice = listInvoices('customer-demo')[0];
  expect(invoice).toMatchObject({ total: 200000, paid: 50000, refunded: 0, remaining: 150000, status: 'PARTIALLY_PAID' });
  expect(invoice.items).toHaveLength(2); expect(invoice.items[1]).toMatchObject({ quantity: 2, amount: 50000 });
  expect(JSON.stringify(invoice)).not.toMatch(/Dịch vụ hủy|Thuốc đã hủy khỏi đơn/);
  expect(projectInvoice({ ...fixtures.invoices[0], payments: [] }, 'Bô').status).toBe('PENDING');
  const payment = fixtures.invoices[0].payments[0];
  expect(projectInvoice({ ...fixtures.invoices[0], payments: [{ ...payment, amount: 200000 }] }, 'Bô').status).toBe('PAID');
  expect(projectInvoice({ ...fixtures.invoices[0], payments: [{ ...payment, amount: 200000 }, { ...payment, id: 'refund', type: 'REFUND', amount: 200000 }] }, 'Bô')).toMatchObject({ status: 'REFUNDED', remaining: 0 });
  expect(projectInvoice({ ...fixtures.invoices[0], status: 'CANCELLED', payments: [] }, 'Bô')).toMatchObject({ status: 'CANCELLED', remaining: 0 });
});

test('invalid quantities, ledger overpayments/refunds and unsafe totals fail rather than display wrong money', () => {
  const invoice = fixtures.invoices[0]; const payment = invoice.payments[0];
  [-1, 1.5, Infinity].forEach((quantity) => expect(() => projectInvoice({ ...invoice, items: [{ ...invoice.items[0], quantity }] }, 'Bô')).toThrow(/không hợp lệ/));
  expect(() => projectInvoice({ ...invoice, items: [{ ...invoice.items[0], quantity: Number.MAX_SAFE_INTEGER }] }, 'Bô')).toThrow(/không hợp lệ/);
  expect(() => projectInvoice({ ...invoice, payments: [{ ...payment, amount: 200001 }] }, 'Bô')).toThrow(/không hợp lệ/);
  expect(() => projectInvoice({ ...invoice, payments: [{ ...payment, type: 'REFUND' }] }, 'Bô')).toThrow(/không hợp lệ/);
  expect(() => projectInvoice({ ...invoice, status: 'CANCELLED' }, 'Bô')).toThrow(/không hợp lệ/);
  expect(() => projectInvoice({ ...invoice, items: [invoice.items[2]] }, 'Bô')).toThrow(/không hợp lệ/);
});

test('corruption is preserved and completed injections or missing clinical metadata cannot become real vaccinations', () => {
  [VACCINATIONS_KEY, MEDICAL_RECORDS_KEY, INVOICES_KEY].forEach((key) => localStorage.setItem(key, '{bad'));
  [listVaccinations, listPrescriptions, listInvoices].forEach((reader) => expect(() => reader('customer-demo')).toThrow(/không hợp lệ/));
  [VACCINATIONS_KEY, MEDICAL_RECORDS_KEY, INVOICES_KEY].forEach((key) => expect(localStorage.getItem(key)).toBe('{bad'));
  localStorage.setItem(VACCINATIONS_KEY, JSON.stringify([{ ...fixtures.vaccinations[0], status: 'COMPLETED' }])); expect(() => listVaccinations('customer-demo')).toThrow(/không hợp lệ/);
  localStorage.setItem(VACCINATIONS_KEY, JSON.stringify([{ ...fixtures.vaccinations[0], dueDate: '2026-02-30' }])); expect(() => listVaccinations('customer-demo')).toThrow(/không hợp lệ/);
  localStorage.setItem(VACCINATIONS_KEY, JSON.stringify([{ ...fixtures.vaccinations[4], administeredAt: '2026-10-04T09:00:00+07:00' }])); expect(() => listVaccinations('customer-demo')).toThrow(/không hợp lệ/);
});

test('viewing all documents never mutates the underlying records, inventory or billing', () => {
  listPets('customer-demo'); seed(); const before = { ...localStorage };
  listVaccinations('customer-demo'); listPrescriptions('customer-demo'); listInvoices('customer-demo');
  expect({ ...localStorage }).toEqual(before);
});
