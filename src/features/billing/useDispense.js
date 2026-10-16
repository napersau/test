import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useCustomerData from '../customer/useCustomerData';
import { USERS_CHANGED } from '../users/usersRepository';
import { CUSTOMERS_CHANGED } from '../reception/customerProfileStorage';
import { PETS_CHANGED } from '../pets/petsRepository';
import { MEDICAL_RECORDS_CHANGED } from '../appointments/appointmentPolicy';
import { INVOICES_CHANGED } from '../invoices/invoicePolicy';
import { MEDICINES_CHANGED } from '../medicines/medicinesRepository';
import { listDispenseQueue, dispensePrescription } from './billingRepository';

const EVENTS = [USERS_CHANGED, CUSTOMERS_CHANGED, PETS_CHANGED, MEDICAL_RECORDS_CHANGED, INVOICES_CHANGED, MEDICINES_CHANGED];
export default function useDispense() {
  const { user } = useAuth(); const state = useCustomerData(listDispenseQueue, EVENTS); const { refresh } = state;
  const [saving, setSaving] = useState(false); const lock = useRef(false);
  const dispense = useCallback(async (visitId, revision) => {
    if (lock.current) throw new Error('Đang xuất kho. Vui lòng chờ.');
    lock.current = true; setSaving(true);
    try { await Promise.resolve(); const result = dispensePrescription(user.id, visitId, revision); refresh(); return result; }
    finally { lock.current = false; setSaving(false); }
  }, [refresh, user.id]);
  return { ...state, queue: state.data || [], saving, dispense };
}
