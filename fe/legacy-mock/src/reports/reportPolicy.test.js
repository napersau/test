import { buildReport, inDateRange, validateRange } from './reportPolicy';
import { listUsers } from '../users/usersRepository';
import { listServices } from '../services/servicesRepository';
import { listMedicines } from '../medicines/medicinesRepository';

beforeEach(() => localStorage.clear());

test('date ranges are strict and include both Vietnamese calendar boundaries', () => {
  expect(inDateRange('2026-10-01T17:00:00Z', '2026-10-02', '2026-10-02')).toBe(true);
  expect(inDateRange('2026-10-02T16:59:59.999Z', '2026-10-02', '2026-10-02')).toBe(true);
  expect(inDateRange('2026-10-01T16:59:59Z', '2026-10-02', '2026-10-02')).toBe(false);
  expect(inDateRange('2026-10-02T17:00:00Z', '2026-10-02', '2026-10-02')).toBe(false);
  expect(inDateRange('invalid', '', '')).toBe(false);
  expect(validateRange('2026-02-30', '2026-10-02', true)).toMatch(/hợp lệ/);
  expect(validateRange('2026-10-03', '2026-10-02', true)).toMatch(/không được sau/);
  expect(validateRange('', '', true)).toMatch(/hợp lệ/);
  expect(validateRange('2025-01-01', '2026-10-02', true)).toMatch(/366/);
  expect(validateRange('', '')).toBe('');
});

test('report totals match source data and the daily chart/table, not revenue', () => {
  const users = listUsers('admin-default');
  const services = listServices('admin-default');
  const medicines = listMedicines('admin-default').map((medicine) => ({ ...medicine, batches: medicine.batches.map((batch) => ({ ...batch, importedAt: '2026-10-02T10:00:00+07:00' })) }));
  const activity = [{ createdAt: '2026-10-02T16:59:59Z' }, { createdAt: '2026-10-02T17:00:00Z' }];
  const report = buildReport({ users, services, medicines, activity }, '2026-10-01', '2026-10-02');
  expect(report.customers).toBe(3);
  expect(report.batches).toBe(6);
  expect(report.actions).toBe(1);
  expect(report.importCost).toBe(medicines.flatMap((medicine) => medicine.batches).reduce((total, batch) => total + batch.quantity * batch.importPrice, 0));
  expect(report.trend).toHaveLength(2);
  expect(report.trend[1]).toMatchObject({ customers: 3, batches: 6, actions: 1, importCost: report.importCost });
  expect(report.serviceGroups.reduce((total, group) => total + group.count, 0)).toBe(8);
  expect(report.warnings.map((medicine) => medicine.id)).toEqual(expect.arrayContaining(['medicine-2', 'medicine-3', 'medicine-4']));
  expect(report.expiredValue).toBeGreaterThan(0);
  expect(report).not.toHaveProperty('revenue');
  const otherPeriod = buildReport({ users, services, medicines, activity }, '2026-10-03', '2026-10-03');
  expect(otherPeriod.customers).toBe(0);
  expect(otherPeriod.availableValue).toBe(report.availableValue);
});

test('monthly buckets clip the first/last months to the range and handle empty sources', () => {
  const data = { users: [{ role: 'CUSTOMER', createdAt: '2026-01-14T12:00:00+07:00' }, { role: 'CUSTOMER', createdAt: '2026-01-15T00:00:00+07:00' }, { role: 'CUSTOMER', createdAt: '2026-04-16T00:00:00+07:00' }], services: [], medicines: [], activity: [] };
  const report = buildReport(data, '2026-01-15', '2026-04-15');
  expect(report.monthly).toBe(true);
  expect(report.customers).toBe(1);
  expect(report.trend).toHaveLength(4);
  expect(report.trend[0].customers).toBe(1);
  const empty = buildReport({ users: [], services: [], medicines: [], activity: [] }, '2026-10-02', '2026-10-02');
  expect(empty).toMatchObject({ customers: 0, batches: 0, actions: 0, importCost: 0, availableValue: 0, expiredValue: 0, warnings: [] });
  expect(() => buildReport(data, '2026-10-03', '2026-10-02')).toThrow(/không được sau/);
});
