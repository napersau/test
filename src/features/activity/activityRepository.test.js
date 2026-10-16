import { authenticate } from '../auth/authStorage';
import { createUser, findAccount, updateUser } from '../users/usersRepository';
import { listServices, saveService } from '../services/servicesRepository';
import { importBatch, listMedicines } from '../medicines/medicinesRepository';
import { dateOffset } from '../catalog/catalogPolicy';
import { listActivity } from './activityRepository';
import { AUDIT_KEY, AUDIT_LIMIT, getAuditWriteWarning, recordActivity } from './auditStorage';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => {
  jest.restoreAllMocks(); localStorage.removeItem(AUDIT_KEY);
  recordActivity({ actor: { id: 'reset' }, module: 'AUTH', action: 'LOGIN' });
  localStorage.clear();
});

test('records real successful mutations without secrets or contact/session payloads', () => {
  expect(listActivity('admin-default')).toEqual([]);
  authenticate('admin@admin', '123456', true);
  const user = createUser('admin-default', { fullName: 'Người dùng kiểm thử', email: 'audit@pawcare.vn', phone: '0919998888', role: 'RECEPTIONIST', status: 'ACTIVE', password: 'secret-one' });
  updateUser('admin-default', user.id, { password: 'secret-two', status: 'LOCKED' });
  const service = listServices('admin-default')[0];
  saveService('admin-default', { ...service, price: service.price + 1000 }, service.id);
  const medicine = listMedicines('admin-default')[0];
  importBatch('admin-default', medicine.id, { batchNo: 'AUDIT-LOT', expiry: dateOffset(100), quantity: '10', importPrice: '2000' });
  const events = listActivity('admin-default');
  expect(events).toHaveLength(5);
  expect(events.map((event) => event.action)).toEqual(expect.arrayContaining(['LOGIN', 'USER_CREATE', 'USER_STATUS', 'SERVICE_UPDATE', 'BATCH_IMPORT']));
  expect(events.find((event) => event.action === 'USER_STATUS').fields).toContain('password');
  const serialized = JSON.stringify(events);
  ['123456', 'secret-one', 'secret-two', 'audit@pawcare.vn', '0919998888', 'pawcare_auth_session'].forEach((secret) => expect(serialized).not.toContain(secret));
  const count = events.length;
  expect(authenticate('admin@admin', 'wrong', true).success).toBe(false);
  expect(() => saveService('customer-demo', {}, service.id)).toThrow();
  expect(listActivity('admin-default')).toHaveLength(count);
});

test('reader rejects non-admin, locked admin, and corrupt logs without overwriting them', () => {
  expect(() => listActivity('customer-demo')).toThrow(/không có quyền/);
  expect(() => listActivity('unknown')).toThrow(/không có quyền/);
  const staff = createUser('admin-default', { fullName: 'Lễ tân phụ', email: 'other@pawcare.vn', phone: '0910002222', role: 'RECEPTIONIST', status: 'ACTIVE', password: '123456' });
  expect(() => listActivity(staff.id)).toThrow(/không có quyền/);
  const accounts = JSON.parse(localStorage.getItem('pawcare_users_v1'));
  localStorage.setItem('pawcare_users_v1', JSON.stringify(accounts.map((item) => (item.id === 'admin-default' ? { ...item, status: 'LOCKED' } : item))));
  expect(() => listActivity('admin-default')).toThrow(/không có quyền/);
  localStorage.setItem('pawcare_users_v1', JSON.stringify(accounts));
  localStorage.setItem(AUDIT_KEY, '{bad');
  expect(() => listActivity('admin-default')).toThrow(/không hợp lệ/);
  recordActivity({ actor: findAccount('admin-default'), module: 'AUTH', action: 'LOGIN' });
  expect(localStorage.getItem(AUDIT_KEY)).toBe('{bad');
  expect(getAuditWriteWarning()).toMatch(/chưa ghi được/);
});

test('retains only latest 2000 records and audit storage failure does not falsely fail an entity write', () => {
  const actor = findAccount('admin-default');
  recordActivity({ actor, module: 'AUTH', action: 'LOGIN', password: 'never-log', fields: ['email', 'status'] });
  const [event] = listActivity(actor.id);
  expect(event.fields).toEqual(['status']);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(Array.from({ length: AUDIT_LIMIT }, (_, index) => ({ ...event, id: `old-${index}` }))));
  recordActivity({ actor, module: 'AUTH', action: 'LOGOUT' });
  expect(listActivity(actor.id)).toHaveLength(AUDIT_LIMIT);
  expect(JSON.parse(localStorage.getItem(AUDIT_KEY))[0].action).toBe('LOGOUT');
  const original = Storage.prototype.setItem;
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
    if (key === AUDIT_KEY) throw new Error('Quota exceeded');
    return original.call(this, key, value);
  });
  const service = listServices(actor.id)[0];
  expect(() => saveService(actor.id, { ...service, price: 999000 }, service.id)).not.toThrow();
  expect(listServices(actor.id)[0].price).toBe(999000);
  expect(getAuditWriteWarning()).toMatch(/Thao tác đã hoàn tất/);
});
