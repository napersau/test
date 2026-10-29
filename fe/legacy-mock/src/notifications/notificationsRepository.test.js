import { listNotifications, markNotificationRead } from './notificationsRepository';
import { NOTIFICATIONS_KEY } from './notificationPolicy';
import { loadDemoDataset } from '../demo/demoRepository';
import { findAccount, USERS_KEY } from '../users/usersRepository';
const customer = 'demo-v1-customer-1';
beforeEach(() => { localStorage.clear(); findAccount('admin-default'); loadDemoDataset('admin-default'); });
test('projects only own notifications and validated entity links; no credentials or private notes', () => {
  const records = listNotifications(customer); expect(records.length).toBeGreaterThan(3);
  expect(records.every((item) => ['Milo', 'Luna'].includes(item.petName) && item.to.startsWith('/portal/'))).toBe(true);
  expect(JSON.stringify(records)).not.toMatch(/GHI_CHU_NOI_BO|password|ownerId/);
});
test('mark read preserves all other owners, is idempotent and persists', () => {
  const before = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY)); const current = before.find((item) => item.ownerId === customer && !item.readAt);
  markNotificationRead(customer, current.id); const saved = localStorage.getItem(NOTIFICATIONS_KEY);
  expect(listNotifications(customer).find((item) => item.id === current.id).readAt).toBeTruthy();
  expect(JSON.parse(saved).filter((item) => item.id !== current.id)).toEqual(before.filter((item) => item.id !== current.id));
  markNotificationRead(customer, current.id); expect(localStorage.getItem(NOTIFICATIONS_KEY)).toBe(saved);
});
test('cannot mark another owner notification; rejects staff, locked accounts and corrupt source', () => {
  const other = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY)).find((item) => item.ownerId !== customer); const before = localStorage.getItem(NOTIFICATIONS_KEY);
  expect(() => markNotificationRead(customer, other.id)).toThrow(); expect(localStorage.getItem(NOTIFICATIONS_KEY)).toBe(before);
  expect(() => listNotifications('demo-v1-vet-1')).toThrow();
  const users = JSON.parse(localStorage.getItem(USERS_KEY)); users.find((item) => item.id === customer).status = 'INACTIVE'; localStorage.setItem(USERS_KEY, JSON.stringify(users)); expect(() => listNotifications(customer)).toThrow();
  localStorage.setItem(NOTIFICATIONS_KEY, '{broken'); expect(() => listNotifications('demo-v1-customer-2')).toThrow(); expect(localStorage.getItem(NOTIFICATIONS_KEY)).toBe('{broken');
});
test('unsafe/cross-owner entity references never become a link; quota error preserves unread', () => {
  const records = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY)); const record = records.find((item) => item.ownerId === customer && !item.readAt);
  record.entityId = records.find((item) => item.ownerId !== customer).entityId; localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(records));
  expect(listNotifications(customer).find((item) => item.id === record.id).to).toBe('');
  const before = localStorage.getItem(NOTIFICATIONS_KEY); const actual = Storage.prototype.setItem;
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) { if (key === NOTIFICATIONS_KEY) throw new Error('quota'); return actual.call(this, key, value); });
  try { expect(() => markNotificationRead(customer, record.id)).toThrow(/Không lưu/); expect(localStorage.getItem(NOTIFICATIONS_KEY)).toBe(before); } finally { spy.mockRestore(); }
});
