import { listBillingCandidates, listReceptionInvoices, issueReceptionInvoice, recordReceptionPayment, applyInvoiceDiscount, listDispenseQueue, dispensePrescription } from './billingRepository';
import { listMedicines, MEDICINES_KEY } from '../medicines/medicinesRepository';
import { MEDICAL_RECORDS_KEY, APPOINTMENTS_KEY } from '../appointments/appointmentPolicy';
import { INVOICES_KEY } from '../invoices/invoicePolicy';
import { listInvoices } from '../invoices/invoicesRepository';
import { listActivity } from '../activity/activityRepository';
import { updateUser } from '../users/usersRepository';
import { makeCustomerRecordsFixtures } from '../../test/customerRecordsFixtures';
const ACTOR = 'reception-demo'; let visit;
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-03T02:00:00Z')); const fixtures = makeCustomerRecordsFixtures('2026-10-03'); visit = { ...fixtures.visits[0], billableItems: fixtures.invoices[0].items }; });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
const seed = () => localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify([visit]));
const pay = (invoice, extra = {}) => ({ amount: 50000, method: 'CASH', note: 'Ghi chú thu ngân', acknowledged: true, receiptId: 'receipt-test-12345678', expectedRevision: invoice.revision, ...extra });

test.each(['admin-default', 'vet-demo', 'customer-demo', 'customer-three', 'missing'])('billing blocks unauthorized actor %s', (actor) => {
  expect(() => listBillingCandidates(actor)).toThrow(/lễ tân/); expect(() => listReceptionInvoices(actor)).toThrow(/lễ tân/);
  expect(() => issueReceptionInvoice(actor, 'missing', '')).toThrow(/lễ tân/); expect(() => recordReceptionPayment(actor, 'missing', {})).toThrow(/lễ tân/);
});
test('sources start empty; cannot issue from pending visit or unspecified prices/cancelled medicine', () => {
  expect(listBillingCandidates(ACTOR)).toEqual([]); expect(listReceptionInvoices(ACTOR)).toEqual([]); expect(localStorage.getItem(INVOICES_KEY)).toBeNull();
  visit.status = 'IN_PROGRESS'; seed(); expect(listBillingCandidates(ACTOR)).toEqual([]);
  visit.status = 'COMPLETED'; visit.billableItems = [visit.billableItems[3]]; seed(); const candidate = listBillingCandidates(ACTOR)[0];
  expect(candidate.items).toEqual([]); expect(() => issueReceptionInvoice(ACTOR, visit.id, candidate.revision)).toThrow(/Chưa có dịch vụ/);
});
test('issues immutable charge snapshots from eligible source lines only, with ownership and duplicate protection', () => {
  seed(); const candidate = listBillingCandidates(ACTOR)[0]; expect(candidate.total).toBe(200000); expect(candidate.items).toHaveLength(2);
  const invoice = issueReceptionInvoice(ACTOR, candidate.id, candidate.revision); expect(invoice).toMatchObject({ total: 200000, remaining: 200000, status: 'PENDING', ownerId: 'customer-demo' });
  expect(listInvoices('customer-demo')[0].total).toBe(200000); expect(listInvoices('customer-two')).toEqual([]);
  expect(() => issueReceptionInvoice(ACTOR, candidate.id, candidate.revision)).toThrow(/đã có hóa đơn/);
  expect(JSON.stringify(invoice)).not.toContain('PRIVATE_FIXTURE_NOTE'); expect(JSON.stringify(JSON.parse(localStorage.getItem(INVOICES_KEY)))).not.toContain('PRIVATE_FIXTURE_NOTE');
});
test('partial then full payments derive correct balances; receipt retries are idempotent and overpayment is blocked', () => {
  seed(); const candidate = listBillingCandidates(ACTOR)[0]; const invoice = issueReceptionInvoice(ACTOR, candidate.id, candidate.revision);
  const input = pay(invoice); const partial = recordReceptionPayment(ACTOR, invoice.id, input);
  expect(partial).toMatchObject({ total: 200000, remaining: 150000, status: 'PARTIALLY_PAID' });
  expect(recordReceptionPayment(ACTOR, invoice.id, input).payments).toHaveLength(1);
  expect(() => recordReceptionPayment(ACTOR, invoice.id, pay(partial, { amount: 150001, receiptId: 'receipt-overpayment-123' }))).toThrow(/vượt/);
  expect(() => recordReceptionPayment(ACTOR, invoice.id, pay(partial, { amount: 50001 }))).toThrow(/nội dung khác/);
  const full = recordReceptionPayment(ACTOR, invoice.id, pay(partial, { amount: 150000, receiptId: 'receipt-second-12345678', method: 'TRANSFER' }));
  expect(full).toMatchObject({ status: 'PAID', remaining: 0, netPaid: 200000 }); expect(listInvoices('customer-demo')[0].status).toBe('PAID');
  expect(JSON.stringify(listInvoices('customer-demo'))).not.toMatch(/Ghi chú thu ngân|receivedBy/);
});
test('stale sources or invoices reject writes; malformed amounts, missing acknowledgement and locked actors fail', () => {
  seed(); const candidate = listBillingCandidates(ACTOR)[0]; visit.billableItems[0].unitPrice = 160000; seed();
  expect(() => issueReceptionInvoice(ACTOR, candidate.id, candidate.revision)).toThrow(/vừa thay đổi/);
  const fresh = listBillingCandidates(ACTOR)[0]; const invoice = issueReceptionInvoice(ACTOR, fresh.id, fresh.revision);
  ['1e5', '1.5', -1, Number.MAX_SAFE_INTEGER + 1].forEach((amount) => expect(() => recordReceptionPayment(ACTOR, invoice.id, pay(invoice, { amount }))).toThrow(/kiểm tra/));
  expect(() => recordReceptionPayment(ACTOR, invoice.id, pay(invoice, { acknowledged: false }))).toThrow(/kiểm tra/);
  recordReceptionPayment(ACTOR, invoice.id, pay(invoice)); expect(() => recordReceptionPayment(ACTOR, invoice.id, pay(invoice, { receiptId: 'receipt-stale-12345678' }))).toThrow(/vừa thay đổi/);
  updateUser('admin-default', ACTOR, { status: 'INACTIVE' }); expect(() => recordReceptionPayment(ACTOR, invoice.id, pay(invoice))).toThrow(/lễ tân/);
});
test('rejects mismatched owners and corrupt charge data without overwriting, preserves failed quota writes', () => {
  seed(); visit.ownerId = 'customer-two'; seed(); expect(() => listBillingCandidates(ACTOR)).toThrow(/không khớp/); visit.ownerId = 'customer-demo'; seed();
  const candidate = listBillingCandidates(ACTOR)[0]; const setter = Storage.prototype.setItem;
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function write(key, data) { if (key === INVOICES_KEY) throw new Error('quota'); return setter.call(this, key, data); });
  expect(() => issueReceptionInvoice(ACTOR, candidate.id, candidate.revision)).toThrow(/Không lưu/); expect(localStorage.getItem(INVOICES_KEY)).toBeNull(); spy.mockRestore();
  localStorage.setItem(INVOICES_KEY, '{bad'); expect(() => listReceptionInvoices(ACTOR)).toThrow(/không hợp lệ/); expect(localStorage.getItem(INVOICES_KEY)).toBe('{bad');
});
test('payments never change inventory or clinical records; audit contains metadata only', () => {
  seed(); const before = localStorage.getItem(MEDICAL_RECORDS_KEY); const candidate = listBillingCandidates(ACTOR)[0]; const invoice = issueReceptionInvoice(ACTOR, candidate.id, candidate.revision); recordReceptionPayment(ACTOR, invoice.id, pay(invoice));
  expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBe(before); expect(localStorage.getItem(APPOINTMENTS_KEY)).toBeNull(); expect(localStorage.getItem('pawcare_medicines_v1')).toBeNull();
  const audit = listActivity('admin-default'); expect(audit.map((item) => item.action)).toEqual(expect.arrayContaining(['INVOICE_ISSUE', 'PAYMENT_RECORD'])); expect(JSON.stringify(audit)).not.toMatch(/Ghi chú thu ngân|PRIVATE_FIXTURE_NOTE/);
});

test('legacy invoice revisions whitelist financial fields, keeping internal notes private', () => {
  const fixture = makeCustomerRecordsFixtures('2026-10-03');
  localStorage.setItem(INVOICES_KEY, JSON.stringify(fixture.invoices));
  expect(JSON.stringify(listReceptionInvoices(ACTOR))).not.toContain('PRIVATE_FIXTURE_NOTE');
});

test('legacy completed visits can use only the completed linked examination snapshot', () => {
  delete visit.billableItems; visit.appointmentId = 'exam-legacy'; seed();
  const record = { id: 'exam-legacy', code: 'APT-LEGACY', ownerId: visit.ownerId, petId: visit.petId, petName: 'Bô', serviceId: 'service-1', serviceName: 'Khám snapshot cũ', reason: 'Khám', estimatedPrice: 125000, startsAt: '2026-10-03T08:00:00+07:00', createdAt: '2026-10-02T00:00:00Z', status: 'CONFIRMED', version: 1 };
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([record])); expect(listBillingCandidates(ACTOR)[0].items).toEqual([]);
  record.status = 'COMPLETED'; localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([record]));
  expect(listBillingCandidates(ACTOR)[0]).toMatchObject({ total: 125000, items: [{ name: 'Khám snapshot cũ', unitPrice: 125000 }] });
});

const prescribed = (extra = {}) => { // Hồ sơ có đơn 2 viên Amoxicillin (thuốc 1 trong kho mặc định), đã kê và chờ phát
  visit.prescriptions = [{ id: 'rx-line', medicineId: 'medicine-1', medicineName: 'Amoxicillin 250 mg', quantity: 2, unit: 'Viên', dosage: '1 viên', frequency: '2 lần/ngày', duration: '5 ngày', instructions: 'Uống sau ăn', unitPrice: 8000, ...extra }];
  visit.billableItems = [visit.billableItems[0], { id: 'rx-line', type: 'MEDICINE', name: 'Amoxicillin 250 mg', quantity: 2, unit: 'Viên', unitPrice: 8000, fulfillmentStatus: 'ORDERED' }]; seed();
};
const stockOf = (id) => listMedicines('admin-default').find((item) => item.id === id).availableStock;
test('prescribed medicines are billed with the services before dispensing; cancelled lines are not', () => {
  prescribed(); const candidate = listBillingCandidates(ACTOR)[0];
  expect(candidate.items.map((item) => item.type)).toEqual(['SERVICE', 'MEDICINE']); expect(candidate.total).toBe(150000 + 16000);
  const invoice = issueReceptionInvoice(ACTOR, candidate.id, candidate.revision);
  expect(invoice).toMatchObject({ subtotal: 166000, discount: 0, total: 166000, status: 'PENDING' });
  expect(invoice.items.find((item) => item.type === 'MEDICINE')).toMatchObject({ fulfillmentStatus: 'ORDERED', amount: 16000 });
  visit.billableItems[1].fulfillmentStatus = 'CANCELLED'; seed(); expect(listBillingCandidates(ACTOR)[0].total).toBe(150000);
});
test('discount: services + medicines − discount; cannot exceed the total, only before any payment', () => {
  prescribed(); const candidate = listBillingCandidates(ACTOR)[0]; const invoice = issueReceptionInvoice(ACTOR, candidate.id, candidate.revision);
  expect(() => applyInvoiceDiscount(ACTOR, invoice.id, '166001', invoice.revision)).toThrow(/không thể vượt quá tổng viện phí/);
  ['-5', '1.5', 'abc'].forEach((amount) => expect(() => applyInvoiceDiscount(ACTOR, invoice.id, amount, invoice.revision)).toThrow(/số nguyên/));
  expect(() => applyInvoiceDiscount(ACTOR, invoice.id, '1000', 'stale')).toThrow(/vừa thay đổi/);
  const discounted = applyInvoiceDiscount(ACTOR, invoice.id, '16000', invoice.revision);
  expect(discounted).toMatchObject({ subtotal: 166000, discount: 16000, total: 150000, remaining: 150000 }); expect(listInvoices('customer-demo')[0]).toMatchObject({ discount: 16000, total: 150000 });
  expect(listActivity('admin-default').some((item) => item.action === 'INVOICE_DISCOUNT')).toBe(true);
  const paid = recordReceptionPayment(ACTOR, invoice.id, pay(discounted, { amount: 150000, method: 'CARD' })); expect(paid.status).toBe('PAID');
  expect(() => applyInvoiceDiscount(ACTOR, invoice.id, '0', paid.revision)).toThrow(/chưa có khoản thanh toán/);
  expect(() => recordReceptionPayment(ACTOR, invoice.id, pay(paid, { method: 'BITCOIN', receiptId: 'receipt-method-12345678' }))).toThrow(/kiểm tra/);
});
test('dispensing needs a PAID invoice, deducts stock once with an export transaction, marks lines dispensed and blocks a second export', () => {
  prescribed(); expect(listDispenseQueue(ACTOR)[0]).toMatchObject({ state: 'NO_INVOICE' });
  const candidate = listBillingCandidates(ACTOR)[0]; const invoice = issueReceptionInvoice(ACTOR, candidate.id, candidate.revision);
  let entry = listDispenseQueue(ACTOR)[0]; expect(entry).toMatchObject({ state: 'WAITING_PAYMENT', invoiceCode: invoice.code });
  expect(entry.lines[0]).toMatchObject({ medicineName: 'Amoxicillin 250 mg', activeIngredient: 'Amoxicillin', stock: 120, dispensed: false });
  expect(() => dispensePrescription(ACTOR, visit.id, entry.revision)).toThrow(/chưa thanh toán đủ/);
  recordReceptionPayment(ACTOR, invoice.id, pay(invoice, { amount: invoice.remaining })); entry = listDispenseQueue(ACTOR)[0]; expect(entry.state).toBe('READY');
  expect(() => dispensePrescription(ACTOR, visit.id, 'stale')).toThrow(/vừa thay đổi/);
  const done = dispensePrescription(ACTOR, visit.id, entry.revision);
  expect(done).toMatchObject({ state: 'DISPENSED' }); expect(done.lines[0].dispensed).toBe(true); expect(stockOf('medicine-1')).toBe(118);
  const transactions = listMedicines('admin-default').find((item) => item.id === 'medicine-1').transactions;
  expect(transactions[0]).toMatchObject({ type: 'EXPORT_PRESCRIPTION', quantity: -2, balanceAfter: 118, referenceId: visit.id, createdBy: ACTOR });
  expect(JSON.parse(localStorage.getItem(MEDICAL_RECORDS_KEY))[0].billableItems[1].fulfillmentStatus).toBe('DISPENSED');
  expect(JSON.parse(localStorage.getItem(INVOICES_KEY))[0].items.find((item) => item.type === 'MEDICINE').fulfillmentStatus).toBe('DISPENSED');
  expect(() => dispensePrescription(ACTOR, visit.id, done.revision)).toThrow(/đã được xuất kho trước đó/); expect(stockOf('medicine-1')).toBe(118);
  expect(listActivity('admin-default').some((item) => item.action === 'MEDICINE_DISPENSE')).toBe(true);
});
test('dispensing with insufficient stock changes nothing', () => {
  prescribed({ quantity: 500 }); visit.billableItems[1].quantity = 500; seed();
  const candidate = listBillingCandidates(ACTOR)[0]; const invoice = issueReceptionInvoice(ACTOR, candidate.id, candidate.revision);
  recordReceptionPayment(ACTOR, invoice.id, pay(invoice, { amount: invoice.remaining })); const entry = listDispenseQueue(ACTOR)[0];
  const recordsBefore = localStorage.getItem(MEDICAL_RECORDS_KEY); const invoicesBefore = localStorage.getItem(INVOICES_KEY); const stockBefore = localStorage.getItem(MEDICINES_KEY);
  expect(() => dispensePrescription(ACTOR, visit.id, entry.revision)).toThrow(/Không thể xuất kho: Thuốc Amoxicillin 250 mg trong kho không đủ số lượng \(cần 500, còn 120\)/);
  expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBe(recordsBefore); expect(localStorage.getItem(INVOICES_KEY)).toBe(invoicesBefore); expect(localStorage.getItem(MEDICINES_KEY)).toBe(stockBefore);
  expect(listDispenseQueue(ACTOR)[0].state).toBe('READY');
});
test('dispensing is receptionist-only', () => {
  prescribed(); ['admin-default', 'vet-demo', 'customer-demo'].forEach((actor) => { expect(() => listDispenseQueue(actor)).toThrow(/lễ tân/); expect(() => dispensePrescription(actor, visit.id, '')).toThrow(/lễ tân/); });
});
