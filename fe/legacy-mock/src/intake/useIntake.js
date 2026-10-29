import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useCustomerData from '../customer/useCustomerData';
import { USERS_CHANGED } from '../users/usersRepository';
import { CUSTOMERS_CHANGED } from '../reception/customerProfileStorage';
import { PETS_CHANGED } from '../pets/petsRepository';
import { SERVICES_CHANGED } from '../services/servicesRepository';
import { APPOINTMENTS_CHANGED } from '../appointments/appointmentPolicy';
import { ROOMS_CHANGED } from './intakePolicy';
import { closeAbandonedVisit } from '../examinations/visitFlowRepository';
import { getIntakeOptions, listIntakeAppointments, createWalkIn, confirmIntakeAppointment, logContactFailure, noteLateArrival, checkInAppointment, saveReceptionAppointment, closeReceptionAppointment, assignDoctor, setIntakePostponed } from './intakeRepository';

const EVENTS = [USERS_CHANGED, CUSTOMERS_CHANGED, PETS_CHANGED, SERVICES_CHANGED, APPOINTMENTS_CHANGED, ROOMS_CHANGED];
const read = (actorId) => ({ ...getIntakeOptions(actorId), appointments: listIntakeAppointments(actorId), refreshedAt: Date.now() });
const EMPTY = { customers: [], pets: [], doctors: [], rooms: [], services: [], appointments: [] };
export default function useIntake() {
  const { user } = useAuth(); const state = useCustomerData(read, EVENTS); const { refresh } = state;
  const lock = useRef(false); const [saving, setSaving] = useState(false);
  const mutate = useCallback(async (writer) => {
    if (lock.current) throw new Error('Đang lưu lượt tiếp nhận. Vui lòng chờ.');
    lock.current = true; setSaving(true);
    try { await Promise.resolve(); const result = writer(); refresh(); return result; }
    finally { lock.current = false; setSaving(false); }
  }, [refresh]);
  return { ...state, ...(state.data || EMPTY), saving,
    walkIn: (values) => mutate(() => createWalkIn(user.id, values)),
    confirm: (id, values) => mutate(() => confirmIntakeAppointment(user.id, id, values)),
    contactFailed: (id, note, version) => mutate(() => logContactFailure(user.id, id, note, version)),
    lateNote: (id, note, version) => mutate(() => noteLateArrival(user.id, id, note, version)),
    assign: (id, doctorId, version) => mutate(() => assignDoctor(user.id, id, doctorId, version)),
    closeVisit: (id, note, version) => mutate(() => closeAbandonedVisit(user.id, id, { note, expectedVersion: version })),
    postpone: (id, postponed, version) => mutate(() => setIntakePostponed(user.id, id, postponed, version)),
    checkIn: (id, values) => mutate(() => checkInAppointment(user.id, id, values)),
    saveAppointment: (values, id) => mutate(() => saveReceptionAppointment(user.id, values, id)),
    closeAppointment: (id, status, reason, version) => mutate(() => closeReceptionAppointment(user.id, id, status, reason, version)) };
}
