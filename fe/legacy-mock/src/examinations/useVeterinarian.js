import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useCustomerData from '../customer/useCustomerData';
import { USERS_CHANGED } from '../users/usersRepository';
import { CUSTOMERS_CHANGED } from '../reception/customerProfileStorage';
import { PETS_CHANGED } from '../pets/petsRepository';
import { APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED } from '../appointments/appointmentPolicy';
import { listVeterinarianAppointments, listVeterinarianRecords, getExamination, startExamination, saveExamination } from './examinationRepository';
const EVENTS = [USERS_CHANGED, CUSTOMERS_CHANGED, PETS_CHANGED, APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED];
export function useVeterinarianAppointments() { return useCustomerData(listVeterinarianAppointments, EVENTS); }
export function useVeterinarianRecords() { return useCustomerData(listVeterinarianRecords, EVENTS); }
export function useExamination(appointmentId) {
  const { user } = useAuth(); const reader = useCallback((id) => getExamination(id, appointmentId), [appointmentId]);
  const state = useCustomerData(reader, EVENTS); const [saving, setSaving] = useState(false); const locked = useRef(false);
  const mutate = async (writer) => { if (locked.current) throw new Error('Đang lưu. Vui lòng chờ.'); locked.current = true; setSaving(true); try { await Promise.resolve(); const record = writer(); state.refresh(); return record; } finally { locked.current = false; setSaving(false); } };
  return { ...state, saving, start: (version) => mutate(() => startExamination(user.id, appointmentId, version)), save: (values, final) => mutate(() => saveExamination(user.id, appointmentId, values, final)) };
}
