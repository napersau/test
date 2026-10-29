import { requireVeterinarian, getVeterinarianCustomer } from '../users/usersRepository';
import { listVeterinarianPets } from '../pets/petsRepository';
import { readAppointments } from '../appointments/appointmentStorage';
import { MEDICAL_RECORDS_KEY, APPOINTMENT_STATUSES } from '../appointments/appointmentPolicy';
import { VACCINATIONS_KEY } from '../vaccinations/vaccinationPolicy';
import { projectVaccination } from '../vaccinations/vaccinationsRepository';
import { projectCompletedVisit } from '../medicalHistory/medicalRecordProjection';
import { isText, isTimestamp, isAmount } from '../customerRecords/recordStorage';
import { medicalRecordCode } from '../examinations/examinationPolicy';
import { validatePlan } from '../examinations/clinicalPlanPolicy';
import { isServiceType } from '../catalog/catalogPolicy';
import { healthEvent } from './healthHistoryPolicy';

function readHistory(key, label) {
  const raw = localStorage.getItem(key); if (raw === null) return [];
  let records; try { records = JSON.parse(raw); } catch { throw new Error(`Dữ liệu ${label} không hợp lệ. Không tự ghi đè.`); }
  if (!Array.isArray(records) || records.some((item) => !item || ['id', 'ownerId', 'petId', 'status'].some((field) => typeof item[field] !== 'string' || !item[field]))
    || new Set(records.map((item) => item.id)).size !== records.length) throw new Error(`Dữ liệu ${label} không hợp lệ. Không tự ghi đè.`);
  return records;
}
function services(record) {
  const rows = record.serviceOrders === undefined ? [] : record.serviceOrders;
  if (!Array.isArray(rows) || Object.keys(validatePlan(rows, 'services')).length
    || rows.some((item) => !isText(item.id, 200) || !item.id || !isText(item.name, 200) || !item.name.trim() || !isServiceType(item.serviceType)
      || !isAmount(item.unitPrice) || typeof item.requiresResult !== 'boolean' || !isTimestamp(item.orderedAt) || Date.parse(item.orderedAt) > Date.now() || !isText(item.doctorName, 160))
    || new Set(rows.map((item) => item.id)).size !== rows.length) throw new Error('Lịch sử chỉ định có dữ liệu không hợp lệ.');
  return rows.map(({ id, name, serviceType, quantity, notes, status, orderedAt, doctorName, requiresResult }) => ({ id, name, serviceType, quantity, notes, status, orderedAt, doctorName, requiresResult }));
}
function historyForPet(actorId, pet, medical, vaccinations, appointments) {
  const visits = medical.filter((item) => item.ownerId === pet.ownerId && item.petId === pet.id && item.status === 'COMPLETED').map((item) => {
    if (!isTimestamp(item.examinedAt) || !isText(item.doctorName, 160) || !item.doctorName.trim()
      || ['diagnosis', 'recommendations', 'treatmentPlan'].some((field) => item[field] !== undefined && !isText(item[field], 3000))) throw new Error('Lịch sử khám có dữ liệu không hợp lệ.');
    const linked = item.appointmentId ? appointments.find((row) => row.id === item.appointmentId) : null;
    if (linked && (linked.ownerId !== pet.ownerId || linked.petId !== pet.id || !['WAITING_PAYMENT', 'COMPLETED'].includes(linked.status))) throw new Error('Lịch sử khám không khớp lượt hẹn.');
    const visit = projectCompletedVisit(item, pet);
    if ([visit.results, visit.prescriptions].some((rows) => rows.some((row) => !row.id) || new Set(rows.map((row) => row.id)).size !== rows.length)) throw new Error('Lịch sử khám có dòng dữ liệu trùng hoặc thiếu mã.');
    return { ...visit, code: medicalRecordCode(item.id), appointmentId: linked?.assignedDoctorId === actorId ? linked.id : '', serviceOrders: services(item) };
  }).sort((a, b) => Date.parse(b.examinedAt) - Date.parse(a.examinedAt));
  const vaccines = vaccinations.filter((item) => item.petId === pet.id && item.ownerId === pet.ownerId).map((item) => projectVaccination(item, pet));
  return { pet, owner: getVeterinarianCustomer(actorId, pet.ownerId), visits, vaccinations: vaccines };
}
function sources(actorId) {
  requireVeterinarian(actorId);
  const pets = listVeterinarianPets(actorId);
  return { pets, appointments: readAppointments(), medical: readHistory(MEDICAL_RECORDS_KEY, 'lịch sử khám'), vaccinations: readHistory(VACCINATIONS_KEY, 'tiêm phòng') };
}
export function listVeterinarianHealthPets(actorId) {
  const data = sources(actorId);
  return data.pets.map((pet) => {
    const history = historyForPet(actorId, pet, data.medical, data.vaccinations, data.appointments);
    return { pet, owner: history.owner, visitCount: history.visits.length, lastExaminedAt: history.visits[0]?.examinedAt || '',
      prescriptionCount: history.visits.filter((item) => item.prescriptions.length).length, vaccinationCount: history.vaccinations.filter((item) => item.status === 'COMPLETED').length };
  }).sort((a, b) => a.pet.name.localeCompare(b.pet.name, 'vi'));
}
export function getVeterinarianHealthHistory(actorId, petId) {
  requireVeterinarian(actorId);
  const pets = listVeterinarianPets(actorId); const pet = pets.find((item) => item.id === petId);
  if (!pet) throw new Error('Không tìm thấy thú cưng được phân công cho bạn.');
  const appointments = readAppointments(); const medical = readHistory(MEDICAL_RECORDS_KEY, 'lịch sử khám'); const vaccinations = readHistory(VACCINATIONS_KEY, 'tiêm phòng');
  const history = historyForPet(actorId, pet, medical, vaccinations, appointments); const events = [];
  history.visits.forEach((visit) => {
    const search = `${visit.code} ${visit.doctorName} ${visit.diagnosis} ${visit.recommendations} ${visit.treatmentPlan}`;
    events.push(healthEvent('visits', visit.id, visit.examinedAt, 'Lần khám đã hoàn tất', visit, search));
    visit.results.forEach((item) => events.push(healthEvent('results', `${visit.id}:${item.id}`, visit.examinedAt, item.name, { ...item, recordCode: visit.code, doctorName: visit.doctorName }, `${search} ${item.name} ${item.result}`)));
    if (visit.prescriptions.length) events.push(healthEvent('prescriptions', visit.id, visit.examinedAt, 'Đơn thuốc theo lần khám', { items: visit.prescriptions, recordCode: visit.code, doctorName: visit.doctorName }, `${search} ${visit.prescriptions.map((item) => `${item.medicineName} ${item.instructions}`).join(' ')}`));
    visit.serviceOrders.forEach((item) => events.push(healthEvent('services', `${visit.id}:${item.id}`, item.orderedAt, item.name, { ...item, recordCode: visit.code }, `${search} ${item.name} ${item.notes}`)));
  });
  history.vaccinations.forEach((item) => events.push({ ...healthEvent('vaccinations', item.id, item.administeredAt || `${item.dueDate}T00:00:00+07:00`, item.vaccineName, item, `${item.vaccineName} ${item.doseLabel} ${item.customerNotes}`, item.date), dateOnly: !item.administeredAt }));
  appointments.filter((item) => item.assignedDoctorId === actorId && item.ownerId === pet.ownerId && item.petId === pet.id).forEach((item) => {
    const projected = { code: item.code, serviceName: item.serviceName, reason: item.reason, status: item.status };
    events.push(healthEvent('appointments', item.id, item.startsAt, item.serviceName, projected, `${item.code} ${item.reason} ${item.serviceName} ${APPOINTMENT_STATUSES[item.status].label}`));
  });
  return { ...history, events: events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id)),
    weights: history.visits.filter((visit) => visit.weight !== null).map(({ id, examinedAt, weight, doctorName }) => ({ id, at: examinedAt, weight, doctorName })).reverse() };
}
