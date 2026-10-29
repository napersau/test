import { runLabRound } from '../../test/visitFlowHelpers';
import { loadDemoDataset, extendDemoDataset, DEMO_STORES } from './demoRepository';
import { findAccount, USERS_KEY } from '../users/usersRepository';
import { createAppointment, cancelAppointment } from '../appointments/appointmentsRepository';
import { confirmIntakeAppointment } from '../intake/intakeRepository';
import { getExamination, saveExamination } from '../examinations/examinationRepository';
import { listBillingCandidates, issueReceptionInvoice, recordReceptionPayment } from '../billing/billingRepository';
import { NOTIFICATIONS_KEY } from '../notifications/notificationPolicy';
import { notifyCustomerEvent, refreshCustomerReminders, getNotificationWriteWarning } from '../notifications/notificationWriter';
import { listNotifications } from '../notifications/notificationsRepository';
import { listAdminCare } from '../reports/adminCareRepository';
import { buildReport } from '../reports/reportPolicy';
import { listStaff, STAFF_KEY } from '../staff/staffRepository';
import { MEDICAL_RECORDS_KEY, APPOINTMENTS_KEY } from '../appointments/appointmentPolicy';
import { INVOICES_KEY } from '../invoices/invoicePolicy';
import { DEMO_KEY } from './demoConfig';
const admin = 'admin-default', customer = 'demo-v1-customer-1', reception = 'demo-v1-reception-1', vet = 'demo-v1-vet-1';
const rows = (key) => JSON.parse(localStorage.getItem(key));
const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const snapshot = () => Object.fromEntries([...DEMO_STORES.map(([key]) => key), DEMO_KEY].map((key) => [key, localStorage.getItem(key)]));
const booking = () => createAppointment(customer, { petId: 'demo-v1-pet-1', serviceId: 'demo-v1-service-1', date: '2026-10-06', time: '16:30', reason: 'PRIVATE_REASON' });
beforeEach(() => { localStorage.clear(); jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-04T05:00:00Z')); findAccount(admin); loadDemoDataset(admin); extendDemoDataset(admin); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('booking, staff confirmation and cancellation generate owned deduplicated public notices', () => {
  const appointment = booking();
  const confirmed = confirmIntakeAppointment(reception, appointment.id, { assignedDoctorId: 'demo-v1-vet-2', roomId: 'demo-v1-room-2', priority: 'NORMAL', intakeNote: 'PRIVATE_INTAKE', expectedVersion: appointment.version, acknowledged: true });
  cancelAppointment(customer, appointment.id, 'PRIVATE_CANCEL', confirmed.version);
  const notices = rows(NOTIFICATIONS_KEY).filter((item) => item.entityId === appointment.id);
  expect(notices).toHaveLength(3); expect(JSON.stringify(notices)).not.toMatch(/PRIVATE_/);
  expect(listNotifications(customer).filter((item) => notices.some((notice) => notice.id === item.id)).every((item) => item.to === '/portal/appointments')).toBe(true);
  expect(listNotifications('demo-v1-customer-2').some((item) => notices.some((notice) => notice.id === item.id))).toBe(false);
  const before = localStorage.getItem(NOTIFICATIONS_KEY);
  expect(notifyCustomerEvent('APPOINTMENT', appointment.id, 'created-1', 'Lặp', 'Kiểm thử')).toBe(false); expect(localStorage.getItem(NOTIFICATIONS_KEY)).toBe(before);
});

test('draft stays unpublished; finishing a visit, issuing invoice and one payment creates notices without private content', () => {
  const appointment = rows(APPOINTMENTS_KEY).find((item) => item.status === 'IN_PROGRESS');
  runLabRound(vet, appointment.id); const initial = getExamination(vet, appointment.id);
  const input = (context) => ({ ...context.record, symptoms: 'PRIVATE_SYMPTOMS', diagnosis: 'PRIVATE_DIAGNOSIS', examination: 'Quan sát giả', treatmentPlan: 'Kế hoạch giả', reason: 'Khám demo', doctorOnlyNotes: 'PRIVATE_DOCTOR', acknowledged: true, expectedVersion: context.record.version, expectedAppointmentVersion: context.appointment.version });
  const before = localStorage.getItem(NOTIFICATIONS_KEY);
  saveExamination(vet, appointment.id, input(initial)); expect(localStorage.getItem(NOTIFICATIONS_KEY)).toBe(before);
  const completed = saveExamination(vet, appointment.id, input(getExamination(vet, appointment.id)), true);
  const candidate = listBillingCandidates(reception).find((item) => item.id === completed.id);
  const invoice = issueReceptionInvoice(reception, candidate.id, candidate.revision);
  const payment = { amount: invoice.remaining, method: 'CASH', note: 'PRIVATE_PAYMENT', receiptId: 'receipt-notification-workflow', expectedRevision: invoice.revision, acknowledged: true };
  recordReceptionPayment(reception, invoice.id, payment); const after = localStorage.getItem(NOTIFICATIONS_KEY);
  recordReceptionPayment(reception, invoice.id, payment); expect(localStorage.getItem(NOTIFICATIONS_KEY)).toBe(after);
  const added = rows(NOTIFICATIONS_KEY).filter((item) => item.entityId === completed.id || item.entityId === invoice.id);
  expect(added).toHaveLength(3); expect(JSON.stringify(added)).not.toMatch(/PRIVATE_/);
  expect(listNotifications(customer).filter((item) => added.some((notice) => notice.id === item.id)).every((item) => item.to)).toBe(true);
});

test('corrupt/quota inbox does not roll back a successfully booked appointment or replace the broken inbox', () => {
  localStorage.setItem(NOTIFICATIONS_KEY, '{broken'); const appointment = booking();
  expect(rows(APPOINTMENTS_KEY).some((item) => item.id === appointment.id)).toBe(true); expect(localStorage.getItem(NOTIFICATIONS_KEY)).toBe('{broken'); expect(getNotificationWriteWarning()).toMatch(/đã lưu/);
  localStorage.setItem(NOTIFICATIONS_KEY, '[]'); const real = Storage.prototype.setItem;
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) { if (key === NOTIFICATIONS_KEY) throw new Error('quota'); return real.call(this, key, value); });
  const cancelled = cancelAppointment(customer, appointment.id, 'Kiểm thử', appointment.version);
  expect(cancelled.status).toBe('CANCELLED'); expect(localStorage.getItem(NOTIFICATIONS_KEY)).toBe('[]'); expect(getNotificationWriteWarning()).toMatch(/đã lưu/);
});

test('reminders obey preferences, use latest completed visit per pet, dedupe and never change vaccine/clinical source', () => {
  const before = snapshot(); refreshCustomerReminders(customer);
  const generated = rows(NOTIFICATIONS_KEY).filter((item) => item.id.startsWith('notice-'));
  expect(generated.filter((item) => item.kind === 'VACCINATION')).toHaveLength(4);
  expect(generated.filter((item) => item.kind === 'FOLLOW_UP').map((item) => item.entityId)).toEqual(expect.arrayContaining(['demo-v2-record-1', 'demo-v2-record-2']));
  expect(generated.filter((item) => item.kind === 'FOLLOW_UP')).toHaveLength(2);
  const after = snapshot(); for (const key of Object.keys(before).filter((key) => key !== NOTIFICATIONS_KEY)) expect(after[key]).toBe(before[key]);
  refreshCustomerReminders(customer); expect(snapshot()).toEqual(after);
  save(USERS_KEY, rows(USERS_KEY).map((item) => item.id === customer ? { ...item, receiveAppointmentReminders: false } : item));
  const inbox = localStorage.getItem(NOTIFICATIONS_KEY); booking(); refreshCustomerReminders(customer); expect(localStorage.getItem(NOTIFICATIONS_KEY)).toBe(inbox);
});

test('walk-in and inactive owners get no inbox; invalid notice payload does not overwrite existing data', () => {
  const walkin = rows(APPOINTMENTS_KEY).find((item) => item.ownerId === 'walkin-demo-v1-1');
  const before = localStorage.getItem(NOTIFICATIONS_KEY);
  expect(notifyCustomerEvent('APPOINTMENT', walkin.id, 'test', 'Mẫu', 'Thông báo')).toBe(false);
  save(USERS_KEY, rows(USERS_KEY).map((item) => item.id === customer ? { ...item, status: 'INACTIVE' } : item));
  expect(notifyCustomerEvent('MEDICAL_RECORD', 'demo-v2-record-1', 'test', 'Mẫu', 'Thông báo')).toBe(false);
  expect(notifyCustomerEvent('INVOICE', 'demo-v2-invoice-1', 'bad', '', 'Thông báo')).toBe(false);
  expect(localStorage.getItem(NOTIFICATIONS_KEY)).toBe(before);
});

test('care reports reconcile invoice/ledger/service/visit snapshots and reveal no clinical/private fields', () => {
  const care = listAdminCare(admin); expect(JSON.stringify(care)).not.toMatch(/GHI_CHU_NOI_BO|diagnosis|symptoms|password|doctorOnlyNotes/);
  const report = buildReport({ users: [], services: [], medicines: [], activity: [], care }, '2026-09-01', '2026-10-04');
  expect(report.visitCount).toBe(21); expect(report.invoiceCount).toBe(17);
  expect(report.billedTotal).toBe(care.invoices.filter((item) => item.status !== 'CANCELLED').reduce((sum, item) => sum + item.total, 0));
  const ledger = care.invoices.flatMap((item) => item.payments);
  expect(report.receipts).toBe(ledger.filter((item) => item.type === 'PAYMENT').reduce((sum, item) => sum + item.amount, 0));
  expect(report.refunds).toBe(ledger.filter((item) => item.type === 'REFUND').reduce((sum, item) => sum + item.amount, 0));
  expect(report.trend.reduce((sum, row) => sum + row.receipts, 0)).toBe(report.receipts); expect(report.trend.reduce((sum, row) => sum + row.refunds, 0)).toBe(report.refunds);
  expect(report.trend.reduce((sum, row) => sum + row.visits, 0)).toBe(report.visitCount);
  const billableServices = care.invoices.filter((item) => item.status !== 'CANCELLED').flatMap((item) => item.items).filter((item) => item.type === 'SERVICE');
  expect(report.topServices.reduce((sum, item) => sum + item.quantity, 0)).toBe(billableServices.reduce((sum, item) => sum + item.quantity, 0));
});

test('cash flows use transaction dates even for earlier invoices; refunds can make the selected period negative', () => {
  const invoice = listAdminCare(admin).invoices.find((item) => item.status === 'REFUNDED');
  const care = { pets: [], appointments: [], visits: [], invoices: [{ ...invoice, issuedAt: '2026-09-01T09:00:00+07:00', payments: [{ type: 'PAYMENT', amount: 500, paidAt: '2026-10-03T16:59:59Z' }, { type: 'REFUND', amount: 500, paidAt: '2026-10-03T17:00:00Z' }] }] };
  const report = buildReport({ users: [], services: [], medicines: [], activity: [], care }, '2026-10-04', '2026-10-04');
  expect(report).toMatchObject({ billedTotal: 0, receipts: 0, refunds: 500, netCollections: -500, invoiceCount: 0 }); expect(report.trend[0].refunds).toBe(500);
});

test.each([MEDICAL_RECORDS_KEY, INVOICES_KEY])('corrupt %s fails visibly without replacing source with zero or empty', (key) => {
  localStorage.setItem(key, '{broken'); const before = snapshot();
  expect(() => key === STAFF_KEY ? listStaff(admin) : listAdminCare(admin)).toThrow(); expect(snapshot()).toEqual(before);
});

test.each(['customer-demo', 'vet-demo', 'reception-demo'])('admin reporting/staff sources reject %s before reading clinical data', (actor) => {
  localStorage.setItem(MEDICAL_RECORDS_KEY, '{broken'); localStorage.setItem(STAFF_KEY, '{broken');
  expect(() => listAdminCare(actor)).toThrow(/quyền quản lý/); expect(() => listStaff(actor)).toThrow(/quyền quản lý/);
});

test('V2 conflicts block before any writes (duplicate namespace and historical allocation)', () => {
  localStorage.clear(); findAccount(admin); loadDemoDataset(admin);
  const existing = rows(APPOINTMENTS_KEY); const extra = { ...existing[0], id: 'demo-v2-appointment-1', code: 'APT-CONFLICT' };
  save(APPOINTMENTS_KEY, [...existing, extra]); let before = snapshot(); expect(() => extendDemoDataset(admin)).toThrow(/trùng/); expect(snapshot()).toEqual(before);
  save(APPOINTMENTS_KEY, [...existing, { ...extra, id: 'user-owned-appointment', assignedDoctorId: vet, roomId: 'demo-v1-room-1', startsAt: '2026-10-03T13:30:00+07:00' }]);
  before = snapshot(); expect(() => extendDemoDataset(admin)).toThrow(/trùng khung/); expect(snapshot()).toEqual(before);
});
