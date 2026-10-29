import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useCustomerData from '../customer/useCustomerData';
import { USERS_CHANGED } from '../users/usersRepository';
import { PETS_CHANGED } from '../pets/petsRepository';
import { CUSTOMERS_CHANGED } from '../reception/customerProfileStorage';
import { APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED } from '../appointments/appointmentPolicy';
import { SERVICES_CHANGED } from '../services/servicesRepository';
import { MEDICINES_CHANGED } from '../medicines/medicinesRepository';
import { getClinicalPlan, saveClinicalPlan } from './examinationRepository';
const EVENTS = [USERS_CHANGED, PETS_CHANGED, CUSTOMERS_CHANGED, APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED, SERVICES_CHANGED, MEDICINES_CHANGED];
export default function useClinicalPlan(appointmentId, kind) {
  const { user } = useAuth(); const reader = useCallback((id) => getClinicalPlan(id, appointmentId, kind), [appointmentId, kind]);
  const state = useCustomerData(reader, EVENTS); const [saving, setSaving] = useState(false); const locked = useRef(false);
  const save = async (input) => {
    if (locked.current) throw new Error('Đang lưu. Vui lòng chờ.');
    locked.current = true; setSaving(true);
    try { await Promise.resolve(); const saved = saveClinicalPlan(user.id, appointmentId, kind, input); state.refresh(); return saved; }
    finally { locked.current = false; setSaving(false); }
  };
  return { ...state, saving, save };
}
