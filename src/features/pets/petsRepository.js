import { findAccount, requireReceptionist, requireVeterinarian } from '../users/usersRepository';
import { readAppointments } from '../appointments/appointmentStorage';
import { getReceptionCustomer } from '../reception/customersRepository';
import { EMPTY_PET, PET_STATUSES, validatePet } from './petPolicy';
import { recordActivity } from '../activity/auditStorage';

export const PETS_KEY = 'pawcare_pets_v1';
export const PETS_CHANGED = 'pawcare:pets-changed';

export function requireCustomer(actorId) {
  const actor = findAccount(actorId);
  if (actor?.role !== 'CUSTOMER' || actor.status !== 'ACTIVE') throw new Error('Chỉ khách hàng đang hoạt động được quản lý thú cưng của mình.');
  return actor;
}

function initialPets() {
  const createdAt = new Date().toISOString();
  return [
    { ...EMPTY_PET, id: 'pet-bo-demo', ownerId: 'customer-demo', name: 'Bô', species: 'DOG', breed: 'Poodle', gender: 'MALE', birthDate: '2023-02-10', weight: 6.5, color: 'Nâu vàng', neutered: true, photo: '/images/landing/pet-daisy.jpg', notes: 'Hồ sơ mẫu để trải nghiệm giao diện.', status: 'ACTIVE', createdAt, updatedAt: createdAt, version: 1, demo: true },
    { ...EMPTY_PET, id: 'pet-bella-demo', ownerId: 'customer-demo', name: 'Bella', species: 'DOG', breed: 'Beagle', gender: 'FEMALE', birthDate: '2024-06-15', weight: 9.2, color: 'Tam thể', photo: '/images/landing/pet-bella.jpg', allergies: 'Thông tin dị ứng mẫu, do chủ nuôi cung cấp.', status: 'ACTIVE', createdAt, updatedAt: createdAt, version: 1, demo: true },
  ];
}

function readPets() {
  const saved = localStorage.getItem(PETS_KEY);
  if (saved === null) { const pets = initialPets(); localStorage.setItem(PETS_KEY, JSON.stringify(pets)); return pets; }
  let pets;
  try { pets = JSON.parse(saved); } catch { throw new Error('Dữ liệu thú cưng không hợp lệ. Không tự động ghi đè hồ sơ đã lưu.'); }
  if (!Array.isArray(pets) || pets.some((pet) => !pet || typeof pet.id !== 'string' || typeof pet.ownerId !== 'string'
    || !Object.keys(PET_STATUSES).includes(pet.status) || Object.keys(validatePet(pet)).length
    || !Number.isFinite(Date.parse(pet.createdAt)) || !Number.isFinite(Date.parse(pet.updatedAt))
    || !Number.isInteger(pet.version ?? 1) || (pet.version ?? 1) < 1) || new Set(pets.map((pet) => pet.id)).size !== pets.length) {
    throw new Error('Dữ liệu thú cưng không hợp lệ. Vui lòng kiểm tra dữ liệu lưu trữ.');
  }
  return pets;
}

function commit(pets) {
  try { localStorage.setItem(PETS_KEY, JSON.stringify(pets)); }
  catch { throw new Error('Không lưu được hồ sơ. Bộ nhớ trình duyệt có thể đã đầy; thử dùng ảnh nhỏ hơn hoặc bỏ ảnh.'); }
  window.dispatchEvent(new Event(PETS_CHANGED));
}

export function listPets(actorId) {
  requireCustomer(actorId);
  return readPets().filter((pet) => pet.ownerId === actorId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function getPet(actorId, id) {
  requireCustomer(actorId);
  const pet = readPets().find((item) => item.id === id && item.ownerId === actorId);
  if (!pet) throw new Error('Không tìm thấy thú cưng trong hồ sơ của bạn.');
  return pet;
}

export function savePet(actorId, values, id) {
  const actor = requireCustomer(actorId);
  return writePet(actor, actorId, values, id);
}

// Mã hồ sơ thú cưng hiển thị: PET-YYYYMM-NNN (số thứ tự trong tháng tạo). Hồ sơ cũ chưa có mã vẫn dùng bình thường.
function nextPetCode(pets, now) {
  const prefix = `PET-${now.slice(0, 7).replace('-', '')}-`;
  const used = new Set(pets.map((pet) => pet.code));
  let number = pets.filter((pet) => (pet.code || '').startsWith(prefix)).length + 1;
  while (used.has(`${prefix}${String(number).padStart(3, '0')}`)) number += 1;
  return `${prefix}${String(number).padStart(3, '0')}`;
}
function writePet(actor, ownerId, values, id) {
  const pets = readPets();
  const current = id ? pets.find((pet) => pet.id === id && pet.ownerId === ownerId) : null;
  if (id && !current) throw new Error('Không tìm thấy thú cưng trong hồ sơ của bạn.');
  if (current?.status === 'ARCHIVED') throw new Error('Khôi phục hồ sơ trước khi chỉnh sửa thông tin.');
  if (current && values.expectedVersion !== undefined && values.expectedVersion !== (current.version ?? 1)) throw new Error('Hồ sơ vừa được cập nhật ở nơi khác. Đóng form rồi mở lại trước khi chỉnh sửa.');
  const merged = { ...EMPTY_PET, ...current, ...values };
  const fieldErrors = validatePet(merged);
  if (merged.microchip?.trim() && pets.some((pet) => pet.id !== id && pet.microchip.trim().toLowerCase() === merged.microchip.trim().toLowerCase())) fieldErrors.microchip = 'Mã chip này đã được sử dụng. Vui lòng kiểm tra lại.';
  if (Object.keys(fieldErrors).length) { const error = new Error('Vui lòng kiểm tra thông tin thú cưng.'); error.fieldErrors = fieldErrors; throw error; }
  const now = new Date().toISOString();
  const record = {
    id: current?.id || window.crypto?.randomUUID?.() || `pet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ownerId, code: current ? current.code : nextPetCode(pets, now), status: current?.status || 'ACTIVE', name: merged.name.trim(), species: merged.species, breed: merged.breed.trim(),
    gender: merged.gender, birthDate: merged.birthDate, estimatedBirthDate: merged.estimatedBirthDate, weight: merged.weight === '' || merged.weight === null || merged.weight === undefined ? null : Number(merged.weight),
    color: merged.color.trim(), microchip: merged.microchip.trim(), neutered: merged.neutered,
    allergies: merged.allergies.trim(), notes: merged.notes.trim(), photo: merged.photo,
    createdAt: current?.createdAt || now, updatedAt: now, version: current ? (current.version ?? 1) + 1 : 1, demo: current?.demo || false,
  };
  commit(current ? pets.map((pet) => pet.id === id ? record : pet) : [record, ...pets]);
  recordActivity({ actor, module: 'PETS', action: current ? 'PET_UPDATE' : 'PET_CREATE', targetId: record.id, targetName: record.name });
  return record;
}

export function setPetStatus(actorId, id, status) {
  const actor = requireCustomer(actorId);
  return writePetStatus(actor, actorId, id, status);
}

function writePetStatus(actor, ownerId, id, status, expectedVersion) {
  if (!Object.keys(PET_STATUSES).includes(status)) throw new Error('Trạng thái hồ sơ không hợp lệ.');
  const pets = readPets();
  const current = pets.find((pet) => pet.id === id && pet.ownerId === ownerId);
  if (!current) throw new Error('Không tìm thấy thú cưng trong hồ sơ của bạn.');
  if (expectedVersion !== undefined && expectedVersion !== (current.version ?? 1)) throw new Error('Hồ sơ vừa thay đổi. Đóng hộp thoại rồi mở lại để cập nhật.');
  if (current.status === status) return current;
  const updated = { ...current, status, updatedAt: new Date().toISOString(), version: (current.version ?? 1) + 1 };
  commit(pets.map((pet) => pet.id === id ? updated : pet));
  recordActivity({ actor, module: 'PETS', action: status === 'ARCHIVED' ? 'PET_ARCHIVE' : 'PET_RESTORE', targetId: id, targetName: current.name });
  return updated;
}

// Staff reads have a dedicated role guard; never impersonate the pet's owner.
export function listReceptionPets(actorId) {
  requireReceptionist(actorId);
  return readPets().map((pet) => ({ ...Object.fromEntries(Object.keys(EMPTY_PET).map((key) => [key, pet[key]])),
    id: pet.id, ownerId: pet.ownerId, status: pet.status, createdAt: pet.createdAt, updatedAt: pet.updatedAt, version: pet.version ?? 1 }));
}

export function listVeterinarianPets(actorId) {
  requireVeterinarian(actorId);
  const links = readAppointments().filter((item) => item.assignedDoctorId === actorId);
  return readPets().filter((pet) => links.some((item) => item.petId === pet.id && item.ownerId === pet.ownerId)).map((pet) => ({
    ...Object.fromEntries(Object.keys(EMPTY_PET).map((key) => [key, pet[key]])), id: pet.id, ownerId: pet.ownerId, status: pet.status,
  }));
}

// Phòng Xét nghiệm / CĐHA chỉ cần tên và loài của bé trong các lượt đang xử lý, không giới hạn theo bác sĩ phụ trách.
export function listClinicalRoomPets(actorId) {
  requireVeterinarian(actorId);
  const open = new Set(readAppointments().filter((item) => ['IN_PROGRESS', 'WAITING_RESULTS', 'RESULTS_READY', 'WAITING_PAYMENT', 'COMPLETED'].includes(item.status)).map((item) => item.petId));
  return readPets().filter((pet) => open.has(pet.id)).map(({ id, ownerId, name, species }) => ({ id, ownerId, name, species }));
}

export function saveReceptionPet(actorId, ownerId, values, id) {
  const actor = requireReceptionist(actorId);
  const current = id ? readPets().find((pet) => pet.id === id) : null;
  if (id && !current) throw new Error('Không tìm thấy hồ sơ thú cưng.');
  // Existing ownership is immutable: moving a pet would break linked care and billing records.
  if (current && ownerId !== current.ownerId) throw new Error('Không được đổi chủ nuôi của hồ sơ đã tạo.');
  getReceptionCustomer(actorId, current?.ownerId || ownerId);
  if (current && values.expectedVersion !== (current.version ?? 1)) throw new Error('Hồ sơ vừa được cập nhật ở nơi khác. Đóng form rồi mở lại trước khi chỉnh sửa.');
  return writePet(actor, current?.ownerId || ownerId, values, id);
}

export function setReceptionPetStatus(actorId, id, status, expectedVersion) {
  const actor = requireReceptionist(actorId);
  const current = readPets().find((pet) => pet.id === id);
  if (!current) throw new Error('Không tìm thấy hồ sơ thú cưng.');
  getReceptionCustomer(actorId, current.ownerId);
  if (expectedVersion === undefined) throw new Error('Mở lại hộp thoại để cập nhật phiên bản hồ sơ.');
  return writePetStatus(actor, current.ownerId, id, status, expectedVersion);
}
