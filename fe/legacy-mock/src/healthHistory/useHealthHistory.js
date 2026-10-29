import { useCallback } from 'react';
import useCustomerData from '../customer/useCustomerData';
import { USERS_CHANGED } from '../users/usersRepository';
import { PETS_CHANGED } from '../pets/petsRepository';
import { CUSTOMERS_CHANGED } from '../reception/customerProfileStorage';
import { APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED } from '../appointments/appointmentPolicy';
import { VACCINATIONS_CHANGED } from '../vaccinations/vaccinationPolicy';
import { listVeterinarianHealthPets, getVeterinarianHealthHistory } from './healthHistoryRepository';
const EVENTS = [USERS_CHANGED, CUSTOMERS_CHANGED, PETS_CHANGED, APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED, VACCINATIONS_CHANGED];
export function useVeterinarianHealthPets() { return useCustomerData(listVeterinarianHealthPets, EVENTS); }
export function useVeterinarianHealthHistory(petId) { const reader = useCallback((id) => getVeterinarianHealthHistory(id, petId), [petId]); return useCustomerData(reader, EVENTS); }
