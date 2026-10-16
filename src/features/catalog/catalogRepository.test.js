import { listServices, saveService, SERVICES_KEY } from '../services/servicesRepository';
import { adjustStock, importBatch, listMedicines, saveMedicine, stockSummary, MEDICINES_KEY } from '../medicines/medicinesRepository';
import { clinicToday, dateOffset, validDate } from './catalogPolicy';
import { updateUser } from '../users/usersRepository';
import { listLabItems, saveLabItem } from '../labConfig/labConfigRepository';

const actor = 'admin-default';
const service = { code: 'dv-new', name: 'Khám chuyên khoa', serviceType: 'IMAGING', price: 180000, status: 'ACTIVE' };
const medicine = { code: 'th-new', name: 'Thuốc mới', category: 'OTHER', unit: 'TABLET', dosageForm: 'TABLET', activeIngredient: 'Hoạt chất mẫu', salePrice: 20000, minStockLevel: 10, status: 'ACTIVE' };
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

test('service CRUD validates unique codes, price and configuration; deactivation preserves data', () => {
  const created = saveService(actor, service);
  expect(created.code).toBe('DV-NEW');
  expect(() => saveService(actor, service)).toThrow('Vui lòng kiểm tra');
  expect(() => saveService(actor, { ...service, code: 'DV-X', price: -1 })).toThrow();
  expect(() => saveService(actor, { ...service, code: 'DV-X', serviceType: 'INVALID' })).toThrow();
  saveService(actor, { price: 0, status: 'INACTIVE' }, created.id);
  const updated = listServices(actor).find((item) => item.id === created.id);
  expect(updated).toMatchObject({ status: 'INACTIVE', price: 0, serviceType: 'IMAGING', requiresResult: true, allowsAttachment: true, createdAt: created.createdAt });
  saveService(actor, { status: 'ACTIVE' }, created.id);
  expect(listServices(actor).find((item) => item.id === created.id).status).toBe('ACTIVE');
  expect(JSON.parse(localStorage.getItem(SERVICES_KEY))).toHaveLength(10);
});

test('medicine stock derives from batches, not arbitrary master edits; imports validate and persist atomically', () => {
  const created = saveMedicine(actor, medicine);
  const input = { batchNo: 'lot-new', expiry: dateOffset(10), quantity: 12, importPrice: 15000 };
  importBatch(actor, created.id, input);
  let stored = listMedicines(actor).find((item) => item.id === created.id);
  expect(stored).toMatchObject({ totalStock: 12, availableStock: 12, nearExpiryBatches: 1, expiredStock: 0, lowStock: false });
  expect(stored.batches[0]).toMatchObject({ batchNo: 'LOT-NEW', quantity: 12, remaining: 12 });
  expect(() => importBatch(actor, created.id, input)).toThrow();
  expect(() => importBatch(actor, created.id, { ...input, batchNo: 'new-2', expiry: dateOffset(-1) })).toThrow();
  expect(() => importBatch(actor, created.id, { ...input, batchNo: 'new-2', quantity: 1.5 })).toThrow();
  expect(() => importBatch(actor, created.id, { ...input, batchNo: 'new-2', quantity: 0 })).toThrow();
  expect(() => saveMedicine(actor, { unit: 'DOSE' }, created.id)).toThrow();
  saveMedicine(actor, { totalStock: 999, availableStock: 999, status: 'INACTIVE', salePrice: 23000 }, created.id);
  expect(() => importBatch(actor, created.id, { ...input, batchNo: 'new-2' })).toThrow('Kích hoạt thuốc');
  stored = listMedicines(actor).find((item) => item.id === created.id);
  expect(stored).toMatchObject({ totalStock: 12, status: 'INACTIVE', salePrice: 23000 });
  expect(JSON.parse(localStorage.getItem(MEDICINES_KEY)).batches.filter((batch) => batch.medicineId === created.id)).toHaveLength(1);
  saveMedicine(actor, { status: 'ACTIVE' }, created.id);
  importBatch(actor, created.id, { ...input, batchNo: 'LOT-2', expiry: dateOffset(100), quantity: 8 });
  expect(listMedicines(actor).find((item) => item.id === created.id).availableStock).toBe(20);
});

test('clinic date and inventory boundaries: today is usable, expired never usable, alerts stop after 30 days', () => {
  expect(clinicToday(new Date('2026-10-01T18:00:00Z'))).toBe('2026-10-02');
  expect(validDate('2026-02-30')).toBe(false);
  const batches = [
    { medicineId: 'x', expiry: '2026-10-01', remaining: 100 },
    { medicineId: 'x', expiry: '2026-10-02', remaining: 2 },
    { medicineId: 'x', expiry: '2026-11-01', remaining: 3 },
    { medicineId: 'x', expiry: '2026-11-02', remaining: 4 },
    { medicineId: 'x', expiry: '2026-10-10', remaining: 0 },
    { medicineId: 'other', expiry: '2026-10-20', remaining: 300 },
  ];
  expect(stockSummary({ id: 'x', minStockLevel: 10 }, batches, '2026-10-02')).toEqual({ totalStock: 109, availableStock: 9, expiredStock: 100, nearExpiryBatches: 2, lowStock: true });
  expect(stockSummary({ id: 'x', minStockLevel: 8 }, batches, '2026-10-02').lowStock).toBe(false);
  // Chạm đúng ngưỡng (tồn = ngưỡng) đã phải cảnh báo.
  expect(stockSummary({ id: 'x', minStockLevel: 9 }, batches, '2026-10-02').lowStock).toBe(true);
});

test('every repository operation denies customers and inactive admins', () => {
  const operations = [
    (id) => listServices(id), (id) => saveService(id, service),
    (id) => listMedicines(id), (id) => saveMedicine(id, medicine),
    (id) => importBatch(id, 'medicine-1', { batchNo: 'LOT-X', expiry: dateOffset(5), quantity: 1, importPrice: 1 }),
  ];
  operations.forEach((operation) => expect(() => operation('customer-demo')).toThrow('không có quyền'));
  const users = JSON.parse(localStorage.getItem('pawcare_users_v1'));
  localStorage.setItem('pawcare_users_v1', JSON.stringify(users.map((item) => item.id === actor ? { ...item, status: 'INACTIVE' } : item)));
  operations.forEach((operation) => expect(() => operation(actor)).toThrow('không có quyền'));
});

test('corrupt catalog data produces recoverable errors without overwriting saved storage', () => {
  localStorage.setItem(SERVICES_KEY, '{corrupt');
  localStorage.setItem(MEDICINES_KEY, JSON.stringify({ batches: [] }));
  expect(() => listServices(actor)).toThrow('không hợp lệ');
  expect(() => listMedicines(actor)).toThrow('không hợp lệ');
  expect(localStorage.getItem(SERVICES_KEY)).toBe('{corrupt');
});

test('an admin locked by another admin loses catalog mutation access', () => {
  const users = JSON.parse(localStorage.getItem('pawcare_users_v1') || '[]');
  // Initialize demo accounts through a normal read before simulating a second administrator.
  listServices(actor);
  const records = users.length ? users : JSON.parse(localStorage.getItem('pawcare_users_v1'));
  localStorage.setItem('pawcare_users_v1', JSON.stringify([...records, { ...records[0], id: 'second-admin', email: 'second@admin', phone: '0900000011' }]));
  updateUser('second-admin', actor, { status: 'INACTIVE' });
  expect(() => saveService(actor, service)).toThrow('không có quyền');
});

test('service categories follow the 9 clinic categories and derive result flags from the category', () => {
  const types = ['EXAMINATION', 'VACCINATION', 'DEWORMING', 'EXTERNAL_PARASITE', 'INJECTION_INFUSION', 'LABORATORY', 'IMAGING', 'SURGERY', 'PROCEDURE'];
  expect([...listServices(actor).map((item) => item.serviceType)].sort()).toEqual([...types].sort());
  ['HOSPITALIZATION', 'EXAM', 'LAB_TEST'].forEach((type) => expect(() => saveService(actor, { ...service, code: `DV-${type}`, serviceType: type })).toThrow());
  expect(saveService(actor, { ...service, code: 'DV-A', serviceType: 'PROCEDURE', requiresResult: true })).toMatchObject({ requiresResult: false, allowsAttachment: false });
  expect(saveService(actor, { ...service, code: 'DV-B', serviceType: 'IMAGING' })).toMatchObject({ requiresResult: true, allowsAttachment: true });
});

test('a laboratory service must list existing lab indicators; changing status keeps them', () => {
  const lab = { ...service, code: 'DV-LAB', serviceType: 'LABORATORY' };
  expect(() => saveService(actor, lab)).toThrow('Vui lòng kiểm tra');
  expect(() => saveService(actor, { ...lab, labItemIds: ['no-such-item'] })).toThrow('Vui lòng kiểm tra');
  const created = saveService(actor, { ...lab, labItemIds: ['lab-item-1', 'lab-item-1', 'lab-item-5'] });
  expect(created.labItemIds).toEqual(['lab-item-1', 'lab-item-5']);
  expect(saveService(actor, { status: 'INACTIVE' }, created.id).labItemIds).toEqual(['lab-item-1', 'lab-item-5']);
  expect(listServices(actor).find((item) => item.code === 'DV002').labItemIds).toHaveLength(5);
});

test('lab indicators carry a reference range for each species; ranges are validated', () => {
  const items = listLabItems(actor);
  expect(items.find((item) => item.code === 'WBC').ranges).toEqual({ DOG: { min: 6, max: 17 }, CAT: { min: 5.5, max: 19.5 } });
  expect(items.find((item) => item.code === 'PLT').ranges).toEqual({ DOG: { min: 200, max: 500 }, CAT: { min: 300, max: 700 } });
  const base = { code: 'ALT', name: 'Men gan ALT', unit: 'U/L', description: '', ranges: { DOG: { min: 10, max: 100 }, CAT: { min: 12, max: 130 } } };
  expect(() => saveLabItem(actor, { ...base, code: 'wbc' })).toThrow('Vui lòng kiểm tra');
  expect(() => saveLabItem(actor, { ...base, ranges: { ...base.ranges, CAT: { min: 5, max: 5 } } })).toThrow('Vui lòng kiểm tra');
  expect(() => saveLabItem(actor, { ...base, ranges: { DOG: base.ranges.DOG } })).toThrow('Vui lòng kiểm tra');
  const created = saveLabItem(actor, base);
  saveLabItem(actor, { ...base, ranges: { ...base.ranges, DOG: { min: 20, max: 120 } } }, created.id);
  expect(listLabItems(actor).find((item) => item.id === created.id).ranges.DOG).toEqual({ min: 20, max: 120 });
  expect(() => listLabItems('customer-demo')).toThrow('không có quyền');
});

test('stock changes are logged; adjustments need a reason and never drive a lot negative', () => {
  const created = saveMedicine(actor, medicine);
  const lot = importBatch(actor, created.id, { batchNo: 'lot-a', expiry: dateOffset(90), quantity: 10, importPrice: 1000 });
  expect(() => adjustStock(actor, created.id, lot.id, { delta: -11, reason: 'Kiểm kê' })).toThrow('Vui lòng kiểm tra');
  expect(() => adjustStock(actor, created.id, lot.id, { delta: 0, reason: 'Kiểm kê' })).toThrow('Vui lòng kiểm tra');
  expect(() => adjustStock(actor, created.id, lot.id, { delta: -2, reason: '' })).toThrow('Vui lòng kiểm tra');
  adjustStock(actor, created.id, lot.id, { delta: -3, reason: 'Hao hụt khi kiểm kê' });
  const stored = listMedicines(actor).find((item) => item.id === created.id);
  expect(stored.availableStock).toBe(7);
  expect(stored.transactions.map((entry) => [entry.type, entry.quantity, entry.balanceAfter])).toEqual([['ADJUSTMENT', -3, 7], ['IMPORT', 10, 10]]);
  expect(stored.transactions[0].notes).toMatch(/Hao hụt/);
  expect(() => adjustStock('customer-demo', created.id, lot.id, { delta: 1, reason: 'abc' })).toThrow('không có quyền');
});

test('medicines carry active ingredient and dosage form; dosage form is required', () => {
  expect(listMedicines(actor).every((item) => item.dosageForm && typeof item.activeIngredient === 'string')).toBe(true);
  expect(() => saveMedicine(actor, { ...medicine, dosageForm: '' })).toThrow('Vui lòng kiểm tra');
  expect(saveMedicine(actor, medicine)).toMatchObject({ dosageForm: 'TABLET', activeIngredient: 'Hoạt chất mẫu' });
});
