import useCustomerData from '../customer/useCustomerData';
import { USERS_CHANGED } from '../users/usersRepository';
import { PETS_CHANGED } from '../pets/petsRepository';
import { APPOINTMENTS_CHANGED } from '../appointments/appointmentPolicy';
import { INVOICES_CHANGED } from '../invoices/invoicePolicy';
import { listIntakeAppointments } from '../intake/intakeRepository';
import { listReceptionInvoices } from '../billing/billingRepository';

const EVENTS = [USERS_CHANGED, PETS_CHANGED, APPOINTMENTS_CHANGED, INVOICES_CHANGED];
const readAppointmentsOnly = (actorId) => ({ appointments: listIntakeAppointments(actorId), invoices: [] });
const readAll = (actorId) => ({ appointments: listIntakeAppointments(actorId), invoices: listReceptionInvoices(actorId) });

// Lịch sử lịch hẹn / vắng mặt / công nợ của khách. Lỗi đọc lịch sử không chặn trang hồ sơ khách hàng.
export default function useCustomerHistory(withInvoices = false) {
  const state = useCustomerData(withInvoices ? readAll : readAppointmentsOnly, EVENTS);
  return { appointments: state.data?.appointments || [], invoices: state.data?.invoices || [], historyError: state.error };
}
