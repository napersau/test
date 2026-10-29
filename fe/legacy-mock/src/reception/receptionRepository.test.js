import { listReceptionCustomers, getReceptionCustomer, saveReceptionCustomer } from './customersRepository';
import { CUSTOMERS_KEY, validateCustomer } from './customerProfileStorage';
import { findAccount, registerCustomer, updateOwnProfile, updateUser, USERS_KEY, verifyCredentials } from '../users/usersRepository';
import { getPet, listPets, listReceptionPets, savePet, saveReceptionPet, setReceptionPetStatus, PETS_KEY } from '../pets/petsRepository';
import { listActivity } from '../activity/activityRepository';

const ACTOR = 'reception-demo';
const CONTACT = { fullName: 'Nguyễn An', phone: '0911111111', email: '', address: 'Hồ Chí Minh' };
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

test('staff sees safe customer contact projections, no staff accounts or passwords', () => {
  const customers = listReceptionCustomers(ACTOR);
  expect(customers).toHaveLength(3);
  expect(customers.map((item) => item.id)).not.toContain(ACTOR);
  expect(JSON.stringify(customers)).not.toContain('123456');
  expect(customers[0]).not.toHaveProperty('role');
  expect(customers.find((item) => item.id === 'customer-three').accountStatus).toBe('LOCKED');
});

test.each(['admin-default', 'vet-demo', 'customer-demo', 'customer-three', 'missing'])('blocks reads and writes by %s', (id) => {
  expect(() => listReceptionCustomers(id)).toThrow(/lễ tân/);
  expect(() => saveReceptionCustomer(id, CONTACT)).toThrow(/lễ tân/);
  expect(() => listReceptionPets(id)).toThrow(/lễ tân/);
  expect(() => saveReceptionPet(id, 'customer-demo', { name: 'X' })).toThrow(/lễ tân/);
  expect(() => setReceptionPetStatus(id, 'pet-bo-demo', 'ARCHIVED', 1)).toThrow(/lễ tân/);
});

test('rechecks canonical receptionist status and does not grant admin access', () => {
  listReceptionCustomers(ACTOR);
  expect(() => updateUser(ACTOR, 'customer-demo', { role: 'ADMIN' })).toThrow(/quyền/);
  updateUser('admin-default', ACTOR, { status: 'INACTIVE' });
  expect(() => saveReceptionCustomer(ACTOR, CONTACT)).toThrow(/lễ tân/);
  expect(() => listReceptionPets(ACTOR)).toThrow(/lễ tân/);
});

test('creates durable walk-in profiles without credentials or an account, rejects spoofed fields', () => {
  const accounts = localStorage.getItem(USERS_KEY);
  const customer = saveReceptionCustomer(ACTOR, { ...CONTACT, fullName: ' Nguyễn An ', role: 'ADMIN', password: 'attack', id: 'stolen' });
  expect(customer).toMatchObject({ fullName: 'Nguyễn An', source: 'WALK_IN', accountStatus: null });
  expect(customer.id).toMatch(/^walkin-/);
  expect(customer).not.toHaveProperty('password');
  expect(getReceptionCustomer(ACTOR, customer.id)).toEqual(customer);
  expect(findAccount(customer.id)).toBeUndefined();
  expect(() => verifyCredentials(CONTACT.phone, '123456')).toThrow(/không chính xác/);
  expect(JSON.stringify(JSON.parse(localStorage.getItem(CUSTOMERS_KEY)))).not.toMatch(/attack|ADMIN|stolen/);
  // Account seeds are initialized, but no new account was appended.
  expect(JSON.parse(localStorage.getItem(USERS_KEY))).toHaveLength(7);
  expect(accounts).toBeNull();
});

test('checks duplicates across walk-ins and all accounts in both directions', () => {
  expect(() => saveReceptionCustomer(ACTOR, { ...CONTACT, phone: '0902345678' })).toThrow(/trùng/);
  expect(() => saveReceptionCustomer(ACTOR, { ...CONTACT, email: 'ADMIN@ADMIN' })).toThrow(/trùng/);
  saveReceptionCustomer(ACTOR, CONTACT);
  expect(() => saveReceptionCustomer(ACTOR, { ...CONTACT, fullName: 'Khác' })).toThrow(/trùng/);
  expect(() => registerCustomer({ ...CONTACT, email: 'new@pawcare.vn' }, '123456')).toThrow(/trùng/);
  expect(() => updateOwnProfile('customer-two', { phone: CONTACT.phone })).toThrow(/trùng/);
});

test('edits contacts on existing accounts, preserving credentials, role, status and custom fields', () => {
  const current = getReceptionCustomer(ACTOR, 'customer-demo'); const original = findAccount(current.id);
  const updated = saveReceptionCustomer(ACTOR, { ...current, fullName: 'Lan mới', expectedRevision: current.revision,
    password: 'attack', role: 'ADMIN', status: 'INACTIVE', receiveHealthTips: true }, current.id);
  expect(updated.fullName).toBe('Lan mới');
  expect(findAccount(current.id)).toMatchObject({ password: original.password, role: 'CUSTOMER', status: 'ACTIVE' });
  expect(findAccount(current.id)).not.toHaveProperty('receiveHealthTips');
  expect(verifyCredentials(current.email, original.password).fullName).toBe('Lan mới');
  expect(() => saveReceptionCustomer(ACTOR, CONTACT, 'vet-demo')).toThrow(/Không tìm thấy/);
});

test('requires frozen revisions for both sources, including customer self-edits', () => {
  const customer = saveReceptionCustomer(ACTOR, CONTACT);
  saveReceptionCustomer(ACTOR, { ...customer, fullName: 'An mới', expectedRevision: customer.revision }, customer.id);
  expect(() => saveReceptionCustomer(ACTOR, { ...customer, expectedRevision: customer.revision }, customer.id)).toThrow(/vừa thay đổi/);
  const linked = getReceptionCustomer(ACTOR, 'customer-demo');
  updateOwnProfile(linked.id, { fullName: 'Chủ nuôi tự đổi tên' });
  expect(() => saveReceptionCustomer(ACTOR, { ...linked, expectedRevision: linked.revision }, linked.id)).toThrow(/vừa thay đổi/);
  expect(() => saveReceptionCustomer(ACTOR, { ...linked }, linked.id)).toThrow(/vừa thay đổi/);
});

test('staff updates same customer pets without weakening portal ownership guards or changing owners', () => {
  const current = listReceptionPets(ACTOR).find((item) => item.id === 'pet-bo-demo');
  const updated = saveReceptionPet(ACTOR, current.ownerId, { name: 'Bô mới', ownerId: 'customer-two', expectedVersion: current.version }, current.id);
  expect(updated.ownerId).toBe('customer-demo');
  expect(getPet('customer-demo', current.id).name).toBe('Bô mới');
  expect(() => getPet('customer-two', current.id)).toThrow(/Không tìm thấy/);
  expect(() => listPets(ACTOR)).toThrow(/khách hàng/);
  expect(() => saveReceptionPet(ACTOR, 'customer-two', { name: 'Stolen', expectedVersion: updated.version }, current.id)).toThrow(/đổi chủ/);
  expect(() => saveReceptionPet(ACTOR, 'vet-demo', { name: 'X' })).toThrow(/khách hàng/);
});

test('links new pets to walk-in profiles and supports revision-safe archive/restore without deletion', () => {
  const owner = saveReceptionCustomer(ACTOR, CONTACT);
  const pet = saveReceptionPet(ACTOR, owner.id, { name: 'Mít', species: 'CAT', microchip: 'CHIP-WALKIN' });
  expect(pet.ownerId).toBe(owner.id);
  const archived = setReceptionPetStatus(ACTOR, pet.id, 'ARCHIVED', pet.version);
  expect(listReceptionPets(ACTOR).find((item) => item.id === pet.id).status).toBe('ARCHIVED');
  expect(() => saveReceptionPet(ACTOR, owner.id, { name: 'Other', expectedVersion: archived.version }, pet.id)).toThrow(/Khôi phục/);
  expect(() => setReceptionPetStatus(ACTOR, pet.id, 'ACTIVE', pet.version)).toThrow(/vừa thay đổi/);
  const restored = setReceptionPetStatus(ACTOR, pet.id, 'ACTIVE', archived.version);
  expect(restored).toMatchObject({ microchip: 'CHIP-WALKIN', ownerId: owner.id, version: 3 });
  expect(() => savePet('customer-two', { name: 'Chip duplicate', microchip: 'chip-walkin' })).toThrow(/kiểm tra/);
});

test('rejects stale staff pet edits and does not leak arbitrary internal pet properties', () => {
  const pet = listReceptionPets(ACTOR)[0];
  savePet(pet.ownerId, { name: 'Updated by owner', expectedVersion: pet.version }, pet.id);
  expect(() => saveReceptionPet(ACTOR, pet.ownerId, { name: 'Old form', expectedVersion: pet.version }, pet.id)).toThrow(/vừa được cập nhật/);
  const pets = JSON.parse(localStorage.getItem(PETS_KEY)); pets[0].doctorOnlyNotes = 'private'; localStorage.setItem(PETS_KEY, JSON.stringify(pets));
  expect(JSON.stringify(listReceptionPets(ACTOR))).not.toContain('private');
});

test('preserves malformed storage and surfaces quota failure without false success', () => {
  localStorage.setItem(CUSTOMERS_KEY, '{bad');
  expect(() => listReceptionCustomers(ACTOR)).toThrow(/không hợp lệ/);
  expect(() => saveReceptionCustomer(ACTOR, CONTACT)).toThrow(/không hợp lệ/);
  expect(localStorage.getItem(CUSTOMERS_KEY)).toBe('{bad');
  localStorage.removeItem(CUSTOMERS_KEY); listReceptionCustomers(ACTOR);
  const setter = Storage.prototype.setItem;
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function write(key, value) { if ([CUSTOMERS_KEY, USERS_KEY].includes(key)) throw new Error('quota'); return setter.call(this, key, value); });
  try {
    expect(() => saveReceptionCustomer(ACTOR, CONTACT)).toThrow(/Không lưu/);
    const linked = getReceptionCustomer(ACTOR, 'customer-demo');
    expect(() => saveReceptionCustomer(ACTOR, { ...linked, fullName: 'Failed', expectedRevision: linked.revision }, linked.id)).toThrow(/Không lưu/);
    expect(getReceptionCustomer(ACTOR, linked.id).fullName).toBe(linked.fullName);
    expect(localStorage.getItem(CUSTOMERS_KEY)).toBeNull();
  } finally { spy.mockRestore(); }
});

test('logs receptionist identity, not owner identity or sensitive contact/health payloads', () => {
  const customer = saveReceptionCustomer(ACTOR, CONTACT);
  saveReceptionPet(ACTOR, customer.id, { name: 'Mít', notes: 'Sensitive health details' });
  const events = listActivity('admin-default');
  expect(events.filter((item) => item.module === 'CUSTOMERS' || item.module === 'PETS').every((item) => item.actorId === ACTOR)).toBe(true);
  expect(events.map((item) => item.action)).toContain('CUSTOMER_CREATE');
  expect(JSON.stringify(events)).not.toMatch(/Sensitive health details|0911111111|Hồ Chí Minh/);
});

test('validates contact constraints and linked-account email requirements', () => {
  expect(validateCustomer(CONTACT)).toEqual({});
  expect(validateCustomer(CONTACT, true)).toHaveProperty('email');
  expect(validateCustomer({ fullName: '', phone: 'abc', email: '@', address: 'x'.repeat(301) })).toHaveProperty('phone');
  expect(() => saveReceptionCustomer(ACTOR, { ...CONTACT, phone: '123' })).toThrow(/kiểm tra/);
});
