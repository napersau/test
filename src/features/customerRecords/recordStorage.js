import { listPets, requireCustomer } from '../pets/petsRepository';
import { validDate } from '../catalog/catalogPolicy';

export function ownedRecords(actorId, key, label) {
  requireCustomer(actorId);
  const pets = listPets(actorId); const raw = localStorage.getItem(key);
  if (raw === null) return { records: [], pets };
  let records;
  try { records = JSON.parse(raw); } catch { throw new Error(`Dữ liệu ${label} không hợp lệ. Không tự động ghi đè dữ liệu đã lưu.`); }
  if (!Array.isArray(records) || records.some((item) => !item || ['id', 'ownerId', 'petId'].some((field) => typeof item[field] !== 'string' || !item[field]))
    || new Set(records.map((item) => item.id)).size !== records.length) throw new Error(`Dữ liệu ${label} không hợp lệ.`);
  return { pets, records: records.filter((item) => item.ownerId === actorId && pets.some((pet) => pet.id === item.petId)) };
}
export const isText = (value, limit = 1000) => typeof value === 'string' && value.length <= limit;
export const isAmount = (value) => Number.isSafeInteger(value) && value >= 0;
export const isTimestamp = (value) => typeof value === 'string' && validDate(value.slice(0, 10))
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
