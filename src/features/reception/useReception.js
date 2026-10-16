import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useCustomerData from '../customer/useCustomerData';
import { USERS_CHANGED } from '../users/usersRepository';
import { PETS_CHANGED, listReceptionPets, saveReceptionPet, setReceptionPetStatus } from '../pets/petsRepository';
import { CUSTOMERS_CHANGED } from './customerProfileStorage';
import { listReceptionCustomers, saveReceptionCustomer } from './customersRepository';

const EVENTS = [USERS_CHANGED, PETS_CHANGED, CUSTOMERS_CHANGED];
const read = (actorId) => ({ customers: listReceptionCustomers(actorId), pets: listReceptionPets(actorId) });

export default function useReception() {
  const { user } = useAuth();
  const state = useCustomerData(read, EVENTS);
  const { refresh } = state;
  const lock = useRef(false); const [saving, setSaving] = useState(false);
  const mutate = useCallback(async (writer) => {
    if (lock.current) throw new Error('Đang lưu hồ sơ. Vui lòng chờ.');
    lock.current = true; setSaving(true);
    try { await Promise.resolve(); const result = writer(); refresh(); return result; }
    finally { lock.current = false; setSaving(false); }
  }, [refresh]);
  return { ...state, customers: state.data?.customers || [], pets: state.data?.pets || [], saving,
    saveCustomer: (values, id) => mutate(() => saveReceptionCustomer(user.id, values, id)),
    savePet: (ownerId, values, id) => mutate(() => saveReceptionPet(user.id, ownerId, values, id)),
    setPetStatus: (id, status, version) => mutate(() => setReceptionPetStatus(user.id, id, status, version)) };
}
