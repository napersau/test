import { calendarDate, clinicToday, validDate } from '../catalog/catalogPolicy';
import { isText, isTimestamp, ownedRecords } from '../customerRecords/recordStorage';
import { VACCINATIONS_KEY, vaccinationStatus } from './vaccinationPolicy';

export function listVaccinations(actorId) {
  const { records, pets } = ownedRecords(actorId, VACCINATIONS_KEY, 'tiêm phòng');
  return records.map((record) => projectVaccination(record, pets.find((pet) => pet.id === record.petId))).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
export function projectVaccination(record, pet) {
    if (!['PLANNED', 'COMPLETED', 'CANCELLED'].includes(record.status) || !isText(record.vaccineName, 160) || !record.vaccineName.trim()
      || !isText(record.doseLabel, 120) || !validDate(record.dueDate)
      || !isText(record.doctorName ?? '', 160) || !isText(record.clinicName ?? '', 200) || !isText(record.customerNotes ?? '', 2000)
      || (record.status === 'COMPLETED' && (!isTimestamp(record.administeredAt) || Date.parse(record.administeredAt) > Date.now()))
      || (record.status !== 'COMPLETED' && record.administeredAt)) throw new Error('Hồ sơ tiêm phòng có dữ liệu không hợp lệ.');
    const status = vaccinationStatus(record);
    return { id: record.id, petId: record.petId, petName: pet.name,
      vaccineName: record.vaccineName, doseLabel: record.doseLabel, dueDate: record.dueDate,
      administeredAt: record.status === 'COMPLETED' ? record.administeredAt : '',
      doctorName: record.doctorName || '', clinicName: record.clinicName || '', customerNotes: record.customerNotes || '', status,
      date: record.status === 'COMPLETED' ? clinicToday(new Date(record.administeredAt)) : record.dueDate,
      displayDate: calendarDate(record.dueDate) };
}
