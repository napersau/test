import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listUsers, USERS_CHANGED } from '../users/usersRepository';
import { listServices, SERVICES_CHANGED } from '../services/servicesRepository';
import { listMedicines, MEDICINES_CHANGED } from '../medicines/medicinesRepository';
import { listActivity } from '../activity/activityRepository';
import { AUDIT_CHANGED, getAuditWriteWarning } from '../activity/auditStorage';
import { listAdminCare } from '../reports/adminCareRepository';
import { APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED } from '../appointments/appointmentPolicy';
import { PETS_CHANGED } from '../pets/petsRepository';
import { INVOICES_CHANGED } from '../invoices/invoicePolicy';
import { CUSTOMERS_CHANGED } from '../reception/customerProfileStorage';

export const INSIGHT_SOURCES = { users: 'Tài khoản', services: 'Dịch vụ', medicines: 'Thuốc & lô hàng', activity: 'Nhật ký hoạt động', care: 'Thú cưng, lịch khám & hóa đơn' };
const readers = { users: listUsers, services: listServices, medicines: listMedicines, activity: listActivity, care: listAdminCare };
const events = [USERS_CHANGED, SERVICES_CHANGED, MEDICINES_CHANGED, AUDIT_CHANGED, APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED, PETS_CHANGED, INVOICES_CHANGED, CUSTOMERS_CHANGED, 'storage'];

export default function useAdminInsights() {
  const { user } = useAuth();
  const [state, setState] = useState({ data: { users: [], services: [], medicines: [], activity: [] }, errors: {}, loading: true, updatedAt: '', warning: '' });
  const refresh = useCallback(() => {
    const data = {};
    const errors = {};
    Object.entries(readers).forEach(([key, read]) => {
      try { data[key] = read(user.id); }
      catch (error) { data[key] = []; errors[key] = error.message; }
    });
    setState({ data, errors, loading: false, updatedAt: new Date().toISOString(), warning: getAuditWriteWarning() });
  }, [user.id]);
  useEffect(() => {
    refresh();
    events.forEach((event) => window.addEventListener(event, refresh));
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, refresh));
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [refresh]);
  return { ...state, refresh };
}
