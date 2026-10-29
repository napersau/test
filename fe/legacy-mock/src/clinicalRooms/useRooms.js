import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useCustomerData from '../customer/useCustomerData';
import { USERS_CHANGED } from '../users/usersRepository';
import { PETS_CHANGED } from '../pets/petsRepository';
import { CUSTOMERS_CHANGED } from '../reception/customerProfileStorage';
import { APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED } from '../appointments/appointmentPolicy';
import { LAB_CONFIG_CHANGED } from '../labConfig/labConfigRepository';
import { listRoomQueue, getRoomEntry, callPatient, reportMissed, markPresentAgain, recallPatient, postponeCrossRoom, startService, markSampleTaken, saveLabResult, saveImagingResult, cancelRoomService } from './roomsRepository';

const EVENTS = [USERS_CHANGED, PETS_CHANGED, CUSTOMERS_CHANGED, APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED, LAB_CONFIG_CHANGED];
export function useRoomQueue(room) { const reader = useCallback((id) => listRoomQueue(id, room), [room]); return useCustomerData(reader, EVENTS); }
export function useRoomEntry(key) { const reader = useCallback((id) => getRoomEntry(id, key), [key]); return useCustomerData(reader, EVENTS); }
export function useRoomActions() {
  const { user } = useAuth(); const [saving, setSaving] = useState(false); const lock = useRef(false);
  const run = useCallback(async (writer) => {
    if (lock.current) throw new Error('Đang xử lý. Vui lòng chờ.');
    lock.current = true; setSaving(true);
    try { await Promise.resolve(); return writer(); } finally { lock.current = false; setSaving(false); }
  }, []);
  return { saving,
    call: (key) => run(() => callPatient(user.id, key)), missed: (key) => run(() => reportMissed(user.id, key)), present: (key) => run(() => markPresentAgain(user.id, key)),
    recall: (key) => run(() => recallPatient(user.id, key)), postpone: (key) => run(() => postponeCrossRoom(user.id, key)), start: (key) => run(() => startService(user.id, key)),
    sampled: (key) => run(() => markSampleTaken(user.id, key)), saveLab: (key, input) => run(() => saveLabResult(user.id, key, input)),
    saveImaging: (key, input) => run(() => saveImagingResult(user.id, key, input)), cancel: (key, reason) => run(() => cancelRoomService(user.id, key, reason)) };
}
