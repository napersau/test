import { clinicToday } from '../catalog/catalogPolicy';
import { isAmount, isText, isTimestamp, ownedRecords } from '../customerRecords/recordStorage';
import { INVOICES_KEY, PAYMENT_METHODS, FULFILLMENT_STATUSES, isBillableItem } from './invoicePolicy';

function invalid() { throw new Error('Dữ liệu hóa đơn hoặc thanh toán không hợp lệ.'); }
export function projectInvoice(record, petName) {
  if (!['ISSUED', 'CANCELLED'].includes(record.status) || !isText(record.code, 80) || !record.code.trim() || !isTimestamp(record.issuedAt) || Date.parse(record.issuedAt) > Date.now()
    || !Array.isArray(record.items) || !Array.isArray(record.payments)) invalid();
  if (record.items.some((item) => !item || typeof item.id !== 'string' || !['SERVICE', 'MEDICINE'].includes(item.type)
    || !FULFILLMENT_STATUSES.includes(item.fulfillmentStatus))
    || new Set(record.items.map((item) => item.id)).size !== record.items.length) invalid();
  const items = record.items.filter(isBillableItem).map((item) => {
    if (!isText(item.name, 200) || !item.name.trim() || !isText(item.unit ?? '', 60) || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || !isAmount(item.unitPrice) || !isAmount(item.quantity * item.unitPrice)) invalid();
    return { id: item.id, type: item.type, name: item.name, quantity: item.quantity, unit: item.unit || '', unitPrice: item.unitPrice, amount: item.quantity * item.unitPrice, fulfillmentStatus: item.fulfillmentStatus };
  });
  if (!items.length) invalid();
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0); if (!isAmount(subtotal)) invalid();
  // Tổng phải thanh toán = tổng dịch vụ + tổng thuốc − chiết khấu (chiết khấu không vượt tổng viện phí).
  const discount = record.discount ?? 0; if (!isAmount(discount) || discount > subtotal) invalid();
  const total = subtotal - discount;
  if (record.payments.some((payment) => !payment || typeof payment.id !== 'string' || !['PAYMENT', 'REFUND'].includes(payment.type)
    || !['COMPLETED', 'VOID'].includes(payment.status) || !isAmount(payment.amount) || payment.amount <= 0 || !Object.keys(PAYMENT_METHODS).includes(payment.method)
    || !isTimestamp(payment.paidAt) || Date.parse(payment.paidAt) > Date.now()) || new Set(record.payments.map((payment) => payment.id)).size !== record.payments.length) invalid();
  const payments = record.payments.filter((payment) => payment.status === 'COMPLETED').map(({ id, type, amount, paidAt, method }) => ({ id, type, amount, paidAt, method }));
  const paid = payments.filter((payment) => payment.type === 'PAYMENT').reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = payments.filter((payment) => payment.type === 'REFUND').reduce((sum, payment) => sum + payment.amount, 0);
  if (!isAmount(paid) || !isAmount(refunded) || refunded > paid || paid - refunded > total) invalid();
  const netPaid = paid - refunded;
  if (record.status === 'CANCELLED' && netPaid > 0) invalid();
  const status = record.status === 'CANCELLED' ? 'CANCELLED' : refunded > 0 && netPaid === 0 ? 'REFUNDED' : netPaid === total ? 'PAID' : netPaid > 0 ? 'PARTIALLY_PAID' : 'PENDING';
  return { id: record.id, code: record.code, petId: record.petId, petName, issuedAt: record.issuedAt, date: clinicToday(new Date(record.issuedAt)),
    status, items, payments, subtotal, discount, total, paid, refunded, netPaid, remaining: record.status === 'CANCELLED' || status === 'REFUNDED' ? 0 : total - netPaid };
}
export function listInvoices(actorId) {
  const { records, pets } = ownedRecords(actorId, INVOICES_KEY, 'hóa đơn');
  return records.map((record) => projectInvoice(record, pets.find((pet) => pet.id === record.petId).name))
    .sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt));
}
