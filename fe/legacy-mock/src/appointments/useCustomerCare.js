import { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PETS_CHANGED } from '../pets/petsRepository';
import { SERVICES_CHANGED } from '../services/servicesRepository';
import { USERS_CHANGED } from '../users/usersRepository';
import { listMedicalHistory } from '../medicalHistory/medicalHistoryRepository';
import { useCallback } from 'react';
import { cancelAppointment, createAppointment, getBookingOptions, getSlotAvailability, listAppointments, rescheduleAppointment } from './appointmentsRepository';
import { APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED } from './appointmentPolicy';
import useCustomerData from '../customer/useCustomerData';

const BOOKING_EVENTS = [PETS_CHANGED, SERVICES_CHANGED, USERS_CHANGED, APPOINTMENTS_CHANGED];
const APPOINTMENT_EVENTS = [PETS_CHANGED, APPOINTMENTS_CHANGED];
const SLOT_EVENTS = [APPOINTMENTS_CHANGED, USERS_CHANGED];
const MEDICAL_EVENTS = [PETS_CHANGED, MEDICAL_RECORDS_CHANGED];
function useCustomerMutation(operation) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false); const lock = useRef(false);
  const mutate = async (...args) => {
    if (lock.current) throw new Error('Đang lưu, vui lòng chờ.');
    lock.current = true; setSaving(true);
    try { await Promise.resolve(); return operation(user.id, ...args); }
    finally { lock.current = false; setSaving(false); }
  };
  return { saving, mutate };
}
export function useBooking() { return { ...useCustomerData(getBookingOptions, BOOKING_EVENTS), ...useCustomerMutation(createAppointment) }; }
export function useAppointments() {
  const { saving, mutate: cancel } = useCustomerMutation(cancelAppointment);
  const reschedule = useCustomerMutation(rescheduleAppointment);
  return { ...useCustomerData(listAppointments, APPOINTMENT_EVENTS), saving: saving || reschedule.saving, mutate: cancel, reschedule: reschedule.mutate };
}
// 14 khung giờ của một ngày với số chỗ còn lại; tự cập nhật khi lịch hẹn hoặc số bác sĩ thay đổi.
export function useSlotAvailability(date, excludeId = '') {
  const reader = useCallback((actorId) => getSlotAvailability(actorId, date, excludeId), [date, excludeId]);
  return useCustomerData(reader, SLOT_EVENTS);
}
export function useMedicalHistory() { return useCustomerData(listMedicalHistory, MEDICAL_EVENTS); }
