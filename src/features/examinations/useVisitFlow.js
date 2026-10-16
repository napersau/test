import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useCustomerData from '../customer/useCustomerData';
import { USERS_CHANGED } from '../users/usersRepository';
import { PETS_CHANGED } from '../pets/petsRepository';
import { CUSTOMERS_CHANGED } from '../reception/customerProfileStorage';
import { APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED } from '../appointments/appointmentPolicy';
import { sendToClinicalRooms, inviteBackToRoom, postponeCallback, cancelVisit, closeAbandonedVisit, listCallbackCases, getMyDoctorState, returnToReception } from './visitFlowRepository';

const EVENTS = [USERS_CHANGED, PETS_CHANGED, CUSTOMERS_CHANGED, APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED];
// Trạng thái tức thời của bác sĩ đang đăng nhập (sẵn sàng / ưu tiên đón ca tái khám / bận) và ca tái khám kế tiếp.
export function useMyDoctorState() { return useCustomerData(getMyDoctorState, EVENTS); }
export function useCallbackCases() { return useCustomerData(listCallbackCases, EVENTS); }
// Các thao tác chuyển trạng thái Visit; mỗi thao tác tự khóa chống bấm đôi và báo lỗi nguyên văn cho giao diện.
export function useVisitActions() {
  const { user } = useAuth(); const [saving, setSaving] = useState(false); const lock = useRef(false);
  const run = useCallback(async (writer) => {
    if (lock.current) throw new Error('Đang xử lý. Vui lòng chờ.');
    lock.current = true; setSaving(true);
    try { await Promise.resolve(); return writer(); } finally { lock.current = false; setSaving(false); }
  }, []);
  return { saving,
    send: (id, input) => run(() => sendToClinicalRooms(user.id, id, input)),
    invite: (id, version) => run(() => inviteBackToRoom(user.id, id, version)),
    postpone: (id, version) => run(() => postponeCallback(user.id, id, version)),
    returnToQueue: (id, version) => run(() => returnToReception(user.id, id, version)),
    cancel: (id, input) => run(() => cancelVisit(user.id, id, input)),
    close: (id, input) => run(() => closeAbandonedVisit(user.id, id, input)) };
}
