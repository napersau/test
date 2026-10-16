import { listMedicalHistory } from '../medicalHistory/medicalHistoryRepository';
import { clinicToday } from '../catalog/catalogPolicy';

export function listPrescriptions(actorId) {
  return listMedicalHistory(actorId).filter((visit) => visit.prescriptions.length > 0).map((visit) => ({
    id: visit.id, petId: visit.petId, petName: visit.petName, issuedAt: visit.examinedAt, date: clinicToday(new Date(visit.examinedAt)),
    doctorName: visit.doctorName, diagnosis: visit.diagnosis, instructions: visit.recommendations, items: visit.prescriptions,
  }));
}
