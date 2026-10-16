import { listPets, requireCustomer } from '../pets/petsRepository';
import { MEDICAL_RECORDS_KEY } from '../appointments/appointmentPolicy';
import { projectCompletedVisit } from './medicalRecordProjection';

// Read-only customer adapter. Records are supplied by the clinical system, not by booking.
export function listMedicalHistory(actorId) {
  requireCustomer(actorId);
  const pets = listPets(actorId); const saved = localStorage.getItem(MEDICAL_RECORDS_KEY);
  if (saved === null) return [];
  let records;
  try { records = JSON.parse(saved); } catch { throw new Error('Dữ liệu lịch sử khám không hợp lệ. Không tự động ghi đè dữ liệu đã lưu.'); }
  if (!Array.isArray(records) || records.some((record) => !record || ['id', 'ownerId', 'petId', 'status'].some((key) => typeof record[key] !== 'string'))
    || new Set(records.map((record) => record.id)).size !== records.length) throw new Error('Dữ liệu lịch sử khám không hợp lệ.');
  return records.filter((record) => record.ownerId === actorId && record.status === 'COMPLETED' && pets.some((pet) => pet.id === record.petId))
    .map((record) => projectCompletedVisit(record, pets.find((pet) => pet.id === record.petId)))
    .sort((a, b) => Date.parse(b.examinedAt) - Date.parse(a.examinedAt));
}
