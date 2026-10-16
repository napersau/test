import { listUsers } from '../users/usersRepository';
import { readCustomerProfiles } from '../reception/customerProfileStorage';
import { readAppointments } from '../appointments/appointmentStorage';
import { APPOINTMENTS_KEY, MEDICAL_RECORDS_KEY } from '../appointments/appointmentPolicy';
import { PETS_KEY } from '../pets/petsRepository';
import { INVOICES_KEY } from '../invoices/invoicePolicy';
import { projectInvoice } from '../invoices/invoicesRepository';
import { projectCompletedVisit } from '../medicalHistory/medicalRecordProjection';
import { validatePet } from '../pets/petPolicy';

function read(key, label) {
  const saved = localStorage.getItem(key); if (saved === null) return [];
  let rows; try { rows = JSON.parse(saved); } catch { throw new Error(`Nguồn ${label} bị lỗi JSON. Không thay thế bằng số 0.`); }
  if (!Array.isArray(rows) || rows.some((item) => !item || typeof item.id !== 'string' || !item.id) || new Set(rows.map((item) => item.id)).size !== rows.length) throw new Error(`Nguồn ${label} không hợp lệ.`);
  return rows;
}
export function listAdminCare(actorId) {
  const users = listUsers(actorId); // Active ADMIN guard before clinical/financial reads.
  const owners = new Set([...users.filter((item) => item.role === 'CUSTOMER'), ...readCustomerProfiles()].map((item) => item.id));
  const pets = read(PETS_KEY, 'thú cưng');
  if (pets.some((pet) => !owners.has(pet.ownerId) || !['ACTIVE', 'ARCHIVED'].includes(pet.status) || Object.keys(validatePet(pet)).length)) throw new Error('Nguồn thú cưng/chủ nuôi không khớp.');
  const petFor = (item) => { const pet = pets.find((pet) => pet.id === item.petId && pet.ownerId === item.ownerId); if (!pet) throw new Error('Nguồn báo cáo không khớp chủ nuôi/thú cưng.'); return pet; };
  const rawAppointments = readAppointments();
  const appointments = rawAppointments.map((item) => { petFor(item); return { id: item.id, status: item.status, startsAt: item.startsAt, doctorId: item.assignedDoctorId || '' }; });
  const rawVisits = read(MEDICAL_RECORDS_KEY, 'hồ sơ khám');
  rawVisits.forEach((item) => { petFor(item); if (!['IN_PROGRESS', 'COMPLETED'].includes(item.status)) throw new Error('Trạng thái hồ sơ khám không hợp lệ.'); });
  const visits = rawVisits.filter((item) => item.status === 'COMPLETED').map((item) => {
    const publicVisit = projectCompletedVisit(item, petFor(item));
    const linked = item.appointmentId ? rawAppointments.find((appt) => appt.id === item.appointmentId) : null;
    if (item.appointmentId && (!linked || linked.ownerId !== item.ownerId || linked.petId !== item.petId || !['WAITING_PAYMENT', 'COMPLETED'].includes(linked.status))) throw new Error('Hồ sơ khám và lịch hẹn không đồng nhất.');
    return { id: publicVisit.id, examinedAt: publicVisit.examinedAt };
  });
  const invoices = read(INVOICES_KEY, 'hóa đơn').map((item) => projectInvoice(item, petFor(item).name));
  return { pets: pets.map(({ id, status }) => ({ id, status })), appointments, visits, invoices, sourceKey: APPOINTMENTS_KEY };
}
