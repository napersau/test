import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useCustomerData from '../customer/useCustomerData';
import { USERS_CHANGED } from '../users/usersRepository';
import { CUSTOMERS_CHANGED } from '../reception/customerProfileStorage';
import { PETS_CHANGED } from '../pets/petsRepository';
import { MEDICAL_RECORDS_CHANGED, APPOINTMENTS_CHANGED } from '../appointments/appointmentPolicy';
import { INVOICES_CHANGED } from '../invoices/invoicePolicy';
import { listReceptionCustomers } from '../reception/customersRepository';
import { listReceptionInvoices, listBillingCandidates, issueReceptionInvoice, recordReceptionPayment, applyInvoiceDiscount } from './billingRepository';
const EVENTS = [USERS_CHANGED, CUSTOMERS_CHANGED, PETS_CHANGED, MEDICAL_RECORDS_CHANGED, APPOINTMENTS_CHANGED, INVOICES_CHANGED];
const read = (actorId) => ({ customers: listReceptionCustomers(actorId), invoices: listReceptionInvoices(actorId), candidates: listBillingCandidates(actorId) });
const readInvoiceOnly = (actorId) => ({ customers: listReceptionCustomers(actorId), invoices: listReceptionInvoices(actorId), candidates: [] });
export default function useBilling(includeCandidates = true) {
  const { user } = useAuth(); const state = useCustomerData(includeCandidates ? read : readInvoiceOnly, EVENTS); const { refresh } = state;
  const [saving, setSaving] = useState(false); const lock = useRef(false);
  const mutate = useCallback(async (writer) => { if (lock.current) throw new Error('Đang lưu. Vui lòng chờ.'); lock.current = true; setSaving(true); try { await Promise.resolve(); const result = writer(); refresh(); return result; } finally { lock.current = false; setSaving(false); } }, [refresh]);
  return { ...state, customers: state.data?.customers || [], invoices: state.data?.invoices || [], candidates: state.data?.candidates || [], saving,
    issue: (id, revision) => mutate(() => issueReceptionInvoice(user.id, id, revision)),
    pay: (id, values) => mutate(() => recordReceptionPayment(user.id, id, values)),
    discount: (id, amount, revision) => mutate(() => applyInvoiceDiscount(user.id, id, amount, revision)) };
}
