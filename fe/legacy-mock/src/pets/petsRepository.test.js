import { getPet, listPets, PETS_KEY, savePet, setPetStatus } from './petsRepository';
import { EMPTY_PET, petAge, petWeight, validatePet } from './petPolicy';
import { dateOffset } from '../catalog/catalogPolicy';
import { listActivity } from '../activity/activityRepository';
import { preparePetPhoto } from './petPhoto';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

test('lists only owned pets and blocks other customers, staff, admins and locked accounts', () => {
  expect(listPets('customer-demo')).toHaveLength(2);
  expect(listPets('customer-two')).toEqual([]);
  ['admin-default', 'vet-demo', 'reception-demo', 'customer-three', 'unknown'].forEach((actor) => expect(() => listPets(actor)).toThrow(/khách hàng/));
  expect(() => getPet('customer-two', 'pet-bo-demo')).toThrow(/Không tìm thấy/);
  expect(() => savePet('customer-two', { name: 'Stolen' }, 'pet-bo-demo')).toThrow(/Không tìm thấy/);
  expect(() => setPetStatus('customer-two', 'pet-bo-demo', 'ARCHIVED')).toThrow(/Không tìm thấy/);
  expect(getPet('customer-demo', 'pet-bo-demo').name).toBe('Bô');
});

test('creates, edits, persists, prevents owner/status injection and checks unique microchips', () => {
  const pet = savePet('customer-two', { name: ' Mít ', species: 'CAT', weight: '4.25', birthDate: dateOffset(-100), microchip: 'CHIP-123', ownerId: 'customer-demo', status: 'ARCHIVED', id: 'spoofed-id' });
  expect(pet).toMatchObject({ name: 'Mít', species: 'CAT', weight: 4.25, ownerId: 'customer-two', status: 'ACTIVE', version: 1 });
  expect(pet.id).not.toBe('spoofed-id');
  expect(getPet('customer-two', pet.id)).toEqual(pet);
  const edited = savePet('customer-two', { name: 'Mít Mít', allergies: 'secret allergy', expectedVersion: pet.version }, pet.id);
  expect(edited.createdAt).toBe(pet.createdAt);
  expect(edited.version).toBe(2);
  expect(listPets('customer-demo')).toHaveLength(2);
  expect(() => savePet('customer-demo', { name: 'Trùng chip', microchip: 'chip-123' })).toThrow(/kiểm tra/);
  const events = listActivity('admin-default');
  expect(events.map((event) => event.action)).toEqual(expect.arrayContaining(['PET_CREATE', 'PET_UPDATE']));
  expect(JSON.stringify(events)).not.toContain('secret allergy');
});

test('archives without deletion, restores, rejects archived edits and stale revisions', () => {
  const pet = savePet('customer-two', { name: 'Mochi' });
  const changed = savePet('customer-two', { weight: '3', expectedVersion: pet.version }, pet.id);
  expect(() => savePet('customer-two', { weight: '4', expectedVersion: pet.version }, pet.id)).toThrow(/vừa được cập nhật/);
  const archived = setPetStatus('customer-two', pet.id, 'ARCHIVED');
  expect(getPet('customer-two', pet.id)).toMatchObject({ status: 'ARCHIVED', weight: 3, version: changed.version + 1 });
  expect(() => savePet('customer-two', { name: 'Other' }, pet.id)).toThrow(/Khôi phục/);
  expect(setPetStatus('customer-two', pet.id, 'ACTIVE')).toMatchObject({ status: 'ACTIVE', name: 'Mochi' });
  expect(listPets('customer-two')).toHaveLength(1);
  expect(archived.photo).toBe('');
  expect(() => setPetStatus('customer-two', pet.id, 'DELETED')).toThrow(/không hợp lệ/);
});

test('validates required names, enums, birth date, weight, text limits and safe photo sources', () => {
  // Deliberately unsafe URL used as a negative validation fixture.
  // eslint-disable-next-line no-script-url
  const invalid = validatePet({ ...EMPTY_PET, name: '', species: '__proto__', gender: 'toString', birthDate: dateOffset(1), weight: '-3', photo: 'javascript:alert(1)' });
  ['name', 'species', 'gender', 'birthDate', 'weight', 'photo'].forEach((key) => expect(invalid[key]).toBeTruthy());
  expect(validatePet({ ...EMPTY_PET, name: 'Bé', estimatedBirthDate: true })).toHaveProperty('birthDate');
  expect(validatePet({ ...EMPTY_PET, name: 'Bé', birthDate: '2026-02-30' })).toHaveProperty('birthDate');
  [0, 501, 0.001, true, Infinity].forEach((weight) => expect(validatePet({ ...EMPTY_PET, name: 'Bé', weight })).toHaveProperty('weight'));
  expect(validatePet({ ...EMPTY_PET, name: 'Bé', weight: '', notes: 'x'.repeat(1001) })).toHaveProperty('notes');
  expect(validatePet({ ...EMPTY_PET, name: 'Bé', weight: null })).toEqual({});
  expect(() => savePet('customer-two', { name: '   ' })).toThrow(/kiểm tra/);
});

test('preserves malformed stored data and handles quota failure without false success', () => {
  localStorage.setItem(PETS_KEY, '{bad');
  expect(() => listPets('customer-demo')).toThrow(/không hợp lệ/);
  expect(() => savePet('customer-demo', { name: 'Bé' })).toThrow(/không hợp lệ/);
  expect(localStorage.getItem(PETS_KEY)).toBe('{bad');
  localStorage.removeItem(PETS_KEY); listPets('customer-demo');
  const before = localStorage.getItem(PETS_KEY); const setItem = Storage.prototype.setItem;
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function write(key, value) { if (key === PETS_KEY) throw new Error('Quota'); return setItem.call(this, key, value); });
  try { expect(() => savePet('customer-demo', { name: 'Bé' })).toThrow(/ảnh nhỏ hơn/); expect(localStorage.getItem(PETS_KEY)).toBe(before); }
  finally { spy.mockRestore(); }
});

test('age/weight display avoids fake values and image upload rejects invalid type/size', async () => {
  expect(petAge('', false, '2026-10-02')).toBe('Chưa có ngày sinh');
  expect(petAge('2024-10-03', false, '2026-10-02')).toBe('1 tuổi 11 tháng');
  expect(petAge('2026-10-01', true, '2026-10-02')).toBe('Khoảng dưới 1 tháng');
  expect(petAge('2027-01-01', false, '2026-10-02')).toBe('Chưa có ngày sinh');
  expect(petWeight(null)).toBe('Chưa cập nhật'); expect(petWeight(4.25)).toBe('4,25 kg');
  await expect(preparePetPhoto(new File(['bad'], 'file.svg', { type: 'image/svg+xml' }))).rejects.toThrow(/JPG/);
  await expect(preparePetPhoto(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'file.png', { type: 'image/png' }))).rejects.toThrow(/2 MB/);
});
