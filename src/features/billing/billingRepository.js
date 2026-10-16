import { requireReceptionist } from '../users/usersRepository';
import { listReceptionCustomers } from '../reception/customersRepository';
import { listReceptionPets } from '../pets/petsRepository';
import { readAppointments, commitAppointments } from '../appointments/appointmentStorage';
import { MEDICAL_RECORDS_KEY, MEDICAL_RECORDS_CHANGED } from '../appointments/appointmentPolicy';
import { listDispenseStock, exportPrescription } from '../medicines/medicinesRepository';
import { projectInvoice } from '../invoices/invoicesRepository';
import { INVOICES_KEY, INVOICES_CHANGED, COLLECTABLE_METHODS, FULFILLMENT_STATUSES, DISCOUNT_TOO_HIGH, isBillableItem } from '../invoices/invoicePolicy';
import { isAmount, isTimestamp } from '../customerRecords/recordStorage';
import { recordActivity } from '../activity/auditStorage';
import { notifyCustomerEvent } from '../notifications/notificationWriter';

export function billingError(message, fieldErrors = {}, status = 400) { const error = new Error(message); error.fieldErrors = fieldErrors; error.status = status; error.code = status === 409 ? 'CONFLICT' : 'INVALID_BILLING'; return error; }
function readArray(key, label) {
  const saved = localStorage.getItem(key); if (saved === null) return [];
  let records; try { records = JSON.parse(saved); } catch { throw new Error(`Dữ liệu ${label} không hợp lệ. Không tự động ghi đè.`); }
  if (!Array.isArray(records) || records.some((item) => !item || ['id', 'ownerId', 'petId'].some((field) => typeof item[field] !== 'string' || !item[field])) || new Set(records.map((item) => item.id)).size !== records.length) throw new Error(`Dữ liệu ${label} không hợp lệ.`);
  return records;
}
function commit(records) {
  try { localStorage.setItem(INVOICES_KEY, JSON.stringify(records)); } catch { throw new Error('Không lưu được hóa đơn/thanh toán. Kiểm tra dung lượng trình duyệt rồi thử lại.'); }
  window.dispatchEvent(new Event(INVOICES_CHANGED));
}
function context(actorId) {
  requireReceptionist(actorId); return { customers: listReceptionCustomers(actorId), pets: listReceptionPets(actorId) };
}
function linkedPet(ctx, record) {
  const pet = ctx.pets.find((item) => item.id === record.petId && item.ownerId === record.ownerId);
  if (!pet || !ctx.customers.some((item) => item.id === record.ownerId)) throw new Error('Hồ sơ tính tiền không khớp chủ nuôi và thú cưng. Kiểm tra nguồn dữ liệu.');
  return pet;
}
const pick = (record, fields) => Object.fromEntries(fields.map((field) => [field, record[field]]));
const revision = (record) => JSON.stringify([record.id, record.status,
  record.items.map((item) => pick(item, ['id', 'type', 'name', 'quantity', 'unitPrice', 'unit', 'fulfillmentStatus'])),
  record.payments.map((item) => pick(item, ['id', 'type', 'status', 'amount', 'method', 'paidAt'])), record.discount ?? 0, record.version ?? 1]);
function invoiceDTO(record, ctx) {
  const invoice = projectInvoice(record, linkedPet(ctx, record).name);
  return { ...invoice, ownerId: record.ownerId, visitId: record.visitId || '', revision: revision(record) };
}

// Visit WAITING_PAYMENT → COMPLETED khi hóa đơn đã thanh toán đủ và (nếu có) đơn thuốc đã được xuất kho.
function settleVisitIfDone(visitId) {
  const visit = readArray(MEDICAL_RECORDS_KEY, 'hồ sơ khám').find((item) => item.id === visitId); if (!visit) return;
  const appointments = readAppointments(); const appointment = appointments.find((item) => item.id === visit.appointmentId);
  if (!appointment || appointment.status !== 'WAITING_PAYMENT') return;
  const pending = (visit.prescriptions || []).some((rx) => !rxCancelled(visit, rx) && !rxDone(visit, rx));
  const stamp = new Date().toISOString();
  if (!pending) commitAppointments(appointments.map((item) => (item.id === appointment.id ? { ...item, status: 'COMPLETED', settledAt: stamp, updatedAt: stamp, version: item.version + 1 } : item)));
}
export function listReceptionInvoices(actorId) {
  const ctx = context(actorId);
  return readArray(INVOICES_KEY, 'hóa đơn').map((item) => invoiceDTO(item, ctx)).sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt));
}

// Financial source contract: completed clinical visits may supply immutable billableItems snapshots.
// Legacy visits can use the completed, linked appointment's examination price; never today's catalogue price.
export function listBillingCandidates(actorId) {
  const ctx = context(actorId); const invoices = readArray(INVOICES_KEY, 'hóa đơn'); const appointments = readAppointments();
  return readArray(MEDICAL_RECORDS_KEY, 'hồ sơ khám').filter((visit) => visit.status === 'COMPLETED').map((visit) => {
    const pet = linkedPet(ctx, visit);
    if (!isTimestamp(visit.examinedAt) || Date.parse(visit.examinedAt) > Date.now()) throw new Error('Hồ sơ khám hoàn tất có thời gian không hợp lệ.');
    let rawItems = visit.billableItems;
    if (rawItems === undefined) {
      const appointment = appointments.find((item) => item.id === visit.appointmentId && item.ownerId === visit.ownerId && item.petId === visit.petId && item.status === 'COMPLETED');
      rawItems = appointment && isAmount(appointment.estimatedPrice) ? [{ id: `exam-${appointment.id}`, type: 'SERVICE', name: appointment.serviceName, quantity: 1, unit: 'Lượt', unitPrice: appointment.estimatedPrice, fulfillmentStatus: 'COMPLETED' }] : [];
    }
    if (!Array.isArray(rawItems) || rawItems.some((item) => !item || !['SERVICE', 'MEDICINE'].includes(item.type) || !FULFILLMENT_STATUSES.includes(item.fulfillmentStatus))) throw new Error('Nguồn khoản tính tiền không hợp lệ.');
    const eligible = rawItems.filter(isBillableItem);
    const items = eligible.map(({ id, type, name, quantity, unitPrice, unit = '', fulfillmentStatus }) => ({ id, type, name, quantity, unitPrice, unit, fulfillmentStatus }));
    const preview = items.length ? projectInvoice({ id: visit.id, code: 'INV-PREVIEW', status: 'ISSUED', issuedAt: new Date().toISOString(), items, payments: [] }, pet.name) : null;
    return { id: visit.id, ownerId: visit.ownerId, petId: pet.id, petName: pet.name, examinedAt: visit.examinedAt, items, total: preview?.total || 0,
      invoiceId: invoices.find((invoice) => invoice.visitId === visit.id && invoice.status !== 'CANCELLED')?.id || '',
      revision: JSON.stringify([visit.id, visit.ownerId, visit.petId, visit.examinedAt, items]) };
  }).sort((a, b) => Date.parse(b.examinedAt) - Date.parse(a.examinedAt));
}

export function issueReceptionInvoice(actorId, visitId, expectedRevision) {
  const actor = requireReceptionist(actorId); const candidate = listBillingCandidates(actorId).find((item) => item.id === visitId);
  if (!candidate) throw billingError('Không tìm thấy hồ sơ khám hoàn tất.', {}, 404);
  if (candidate.revision !== expectedRevision) throw billingError('Các khoản tính tiền vừa thay đổi. Mở lại form để đối chiếu.', {}, 409);
  if (candidate.invoiceId) throw billingError('Lượt khám này đã có hóa đơn. Không lập trùng.', {}, 409);
  if (!candidate.items.length) throw billingError('Chưa có dịch vụ hoàn tất hoặc thuốc trong đơn kèm đơn giá. Không tự tạo khoản thu.');
  const ctx = context(actorId); const records = readArray(INVOICES_KEY, 'hóa đơn'); records.forEach((item) => invoiceDTO(item, ctx));
  const id = window.crypto?.randomUUID?.() || `invoice-${Date.now()}-${Math.random().toString(36).slice(2)}`; const stamp = new Date().toISOString();
  const record = { id, code: `INV-${id.replace(/[^a-z0-9]/gi, '').slice(-10).toUpperCase()}`, ownerId: candidate.ownerId, petId: candidate.petId, visitId,
    status: 'ISSUED', issuedAt: stamp, items: candidate.items, payments: [], version: 1, issuedBy: actor.id, updatedAt: stamp };
  const dto = invoiceDTO(record, ctx); commit([record, ...records]);
  recordActivity({ actor, module: 'BILLING', action: 'INVOICE_ISSUE', targetId: id, targetName: record.code });
  notifyCustomerEvent('INVOICE', id, 'issued-1', 'Hóa đơn mới đã được lập', `Hóa đơn ${record.code} đã được lập. Mở hóa đơn để xem khoản cần thanh toán.`); return dto;
}

export function recordReceptionPayment(actorId, invoiceId, input) {
  const actor = requireReceptionist(actorId); const ctx = context(actorId); const records = readArray(INVOICES_KEY, 'hóa đơn'); const current = records.find((item) => item.id === invoiceId);
  if (!current) throw billingError('Không tìm thấy hóa đơn.', {}, 404);
  const invoice = invoiceDTO(current, ctx); const errors = {};
  if (!/^[1-9]\d*$/.test(String(input.amount)) || !isAmount(Number(input.amount))) errors.amount = 'Nhập số tiền VND nguyên dương hợp lệ.';
  if (!COLLECTABLE_METHODS.includes(input.method)) errors.method = 'Chọn phương thức thanh toán: tiền mặt, chuyển khoản hoặc thẻ POS.';
  if (typeof input.note !== 'string' || input.note.length > 300) errors.note = 'Ghi chú tối đa 300 ký tự.';
  if (input.acknowledged !== true) errors.acknowledged = 'Xác nhận đã nhận và đối chiếu khoản thanh toán trong bản demo.';
  if (typeof input.receiptId !== 'string' || !/^receipt-[a-z0-9-]{8,100}$/i.test(input.receiptId)) errors.receiptId = 'Mở lại form để tạo mã ghi nhận mới.';
  if (Object.keys(errors).length) throw billingError('Vui lòng kiểm tra thanh toán.', errors);
  const amount = Number(input.amount); const prior = current.payments.find((item) => item.id === input.receiptId);
  if (prior) { if (prior.amount === amount && prior.method === input.method && (prior.note || '') === input.note.trim() && prior.type === 'PAYMENT' && prior.status === 'COMPLETED') return invoice; throw billingError('Mã ghi nhận đã được sử dụng với nội dung khác.', {}, 409); }
  if (records.some((item) => item.id !== invoiceId && item.payments.some((payment) => payment.id === input.receiptId))) throw billingError('Mã ghi nhận đã gắn với hóa đơn khác.', {}, 409);
  if (input.expectedRevision !== invoice.revision) throw billingError('Hóa đơn vừa thay đổi. Đóng form rồi mở lại để kiểm tra số còn phải thu.', {}, 409);
  if (['CANCELLED', 'REFUNDED', 'PAID'].includes(invoice.status) || invoice.remaining <= 0) throw billingError('Hóa đơn không còn khoản cần thanh toán.');
  if (amount > invoice.remaining) throw billingError('Số tiền vượt số còn phải thanh toán.', { amount: `Chỉ ghi nhận tối đa ${invoice.remaining} VND.` });
  const stamp = new Date().toISOString(); const payment = { id: input.receiptId, type: 'PAYMENT', status: 'COMPLETED', amount, method: input.method, note: input.note.trim(), paidAt: stamp, receivedBy: actor.id, demo: true };
  const updated = { ...current, payments: [...current.payments, payment], version: (current.version ?? 1) + 1, updatedAt: stamp };
  const dto = invoiceDTO(updated, ctx); commit(records.map((item) => item.id === invoiceId ? updated : item));
  if (dto.status === 'PAID' && updated.visitId) settleVisitIfDone(updated.visitId);
  recordActivity({ actor, module: 'BILLING', action: 'PAYMENT_RECORD', targetId: invoiceId, targetName: current.code });
  notifyCustomerEvent('INVOICE', invoiceId, `payment-${payment.id}`, 'Đã ghi nhận thanh toán demo', `Thanh toán cho hóa đơn ${current.code} đã được cập nhật. Không phải xác nhận giao dịch ngân hàng thật.`); return dto;
}

// Chiết khấu chỉ áp dụng khi hóa đơn chưa có khoản thu nào. Tổng phải thanh toán = dịch vụ + thuốc − chiết khấu.
export function applyInvoiceDiscount(actorId, invoiceId, amount, expectedRevision) {
  const actor = requireReceptionist(actorId); const ctx = context(actorId); const records = readArray(INVOICES_KEY, 'hóa đơn'); const current = records.find((item) => item.id === invoiceId);
  if (!current) throw billingError('Không tìm thấy hóa đơn.', {}, 404);
  const invoice = invoiceDTO(current, ctx);
  if (expectedRevision !== invoice.revision) throw billingError('Hóa đơn vừa thay đổi. Tải lại trang để đối chiếu.', {}, 409);
  if (['CANCELLED', 'REFUNDED'].includes(invoice.status) || invoice.paid > 0) throw billingError('Chỉ áp dụng chiết khấu cho hóa đơn chưa có khoản thanh toán.');
  const text = String(amount ?? '').trim();
  if (!/^\d+$/.test(text) || !isAmount(Number(text))) throw billingError('Nhập số tiền giảm giá là số nguyên VND, không âm.', { discount: 'Nhập số tiền giảm giá hợp lệ.' });
  const discount = Number(text);
  if (discount > invoice.subtotal) throw billingError(DISCOUNT_TOO_HIGH, { discount: DISCOUNT_TOO_HIGH });
  const stamp = new Date().toISOString(); const updated = { ...current, discount, version: (current.version ?? 1) + 1, updatedAt: stamp };
  const dto = invoiceDTO(updated, ctx); commit(records.map((item) => (item.id === invoiceId ? updated : item)));
  recordActivity({ actor, module: 'BILLING', action: 'INVOICE_DISCOUNT', targetId: invoiceId, targetName: current.code });
  return dto;
}

// ---- Phát thuốc (sau khi hóa đơn đã thanh toán) ----
const rxDone = (visit, rx) => !!rx.dispensedAt || (visit.billableItems || []).some((item) => item.id === rx.id && item.type === 'MEDICINE' && item.fulfillmentStatus === 'DISPENSED');
const rxCancelled = (visit, rx) => (visit.billableItems || []).some((item) => item.id === rx.id && item.type === 'MEDICINE' && item.fulfillmentStatus === 'CANCELLED');

export function listDispenseQueue(actorId) {
  const ctx = context(actorId); const stock = new Map(listDispenseStock(actorId).map((item) => [item.id, item]));
  const invoices = readArray(INVOICES_KEY, 'hóa đơn');
  return readArray(MEDICAL_RECORDS_KEY, 'hồ sơ khám').filter((visit) => visit.status === 'COMPLETED' && Array.isArray(visit.prescriptions) && visit.prescriptions.length).map((visit) => {
    const pet = linkedPet(ctx, visit); const raw = invoices.find((invoice) => invoice.visitId === visit.id && invoice.status !== 'CANCELLED');
    const invoice = raw ? invoiceDTO(raw, ctx) : null;
    const lines = visit.prescriptions.filter((rx) => !rxCancelled(visit, rx)).map((rx) => ({ id: rx.id, medicineId: rx.medicineId || '', medicineName: rx.medicineName, activeIngredient: stock.get(rx.medicineId)?.activeIngredient || '',
      unit: rx.unit || '', quantity: rx.quantity, dosage: rx.dosage || '', frequency: rx.frequency || '', duration: rx.duration || '', instructions: rx.instructions || '', stock: stock.get(rx.medicineId)?.availableStock ?? 0, dispensed: rxDone(visit, rx) }));
    const pending = lines.filter((line) => !line.dispensed);
    const state = !pending.length ? 'DISPENSED' : !invoice ? 'NO_INVOICE' : invoice.status === 'PAID' ? 'READY' : 'WAITING_PAYMENT';
    return { visitId: visit.id, ownerId: visit.ownerId, petId: pet.id, petName: pet.name, examinedAt: visit.examinedAt, doctorName: visit.doctorName || '', invoiceId: invoice?.id || '', invoiceCode: invoice?.code || '',
      invoiceStatus: invoice?.status || '', lines, state, revision: JSON.stringify([visit.id, state, lines.map((line) => [line.id, line.quantity, line.dispensed])]) };
  }).sort((a, b) => Date.parse(b.examinedAt) - Date.parse(a.examinedAt));
}

// Điều kiện: hóa đơn PAID và đơn chưa xuất. Thiếu tồn (dù chỉ một thuốc) → báo lỗi và không thay đổi gì; đủ → trừ kho, ghi nhật ký EXPORT_PRESCRIPTION, đánh dấu đã phát.
export function dispensePrescription(actorId, visitId, expectedRevision) {
  const actor = requireReceptionist(actorId); const entry = listDispenseQueue(actorId).find((item) => item.visitId === visitId);
  if (!entry) throw billingError('Không tìm thấy đơn thuốc của lượt khám.', {}, 404);
  if (entry.state === 'DISPENSED') throw billingError('Đơn thuốc này đã được xuất kho trước đó.', {}, 409);
  if (expectedRevision !== entry.revision) throw billingError('Đơn thuốc vừa thay đổi. Tải lại danh sách để đối chiếu.', {}, 409);
  if (entry.state !== 'READY') throw billingError(entry.state === 'NO_INVOICE' ? 'Lượt khám chưa có hóa đơn. Lập hóa đơn và thu tiền trước khi phát thuốc.' : 'Hóa đơn chưa thanh toán đủ. Chỉ phát thuốc sau khi thu tiền.');
  const pending = entry.lines.filter((line) => !line.dispensed);
  if (pending.some((line) => !line.medicineId || !Number.isSafeInteger(line.quantity) || line.quantity <= 0)) throw billingError('Dòng thuốc thiếu mã thuốc hoặc số lượng hợp lệ. Liên hệ bác sĩ kê đơn.');
  exportPrescription(actorId, pending, visitId); // ném lỗi trước khi thay đổi bất cứ dữ liệu nào nếu thiếu tồn
  const stamp = new Date().toISOString(); const ids = new Set(pending.map((line) => line.id));
  const visits = readArray(MEDICAL_RECORDS_KEY, 'hồ sơ khám'); const invoices = readArray(INVOICES_KEY, 'hóa đơn');
  const mark = (items) => (Array.isArray(items) ? items.map((item) => (ids.has(item.id) && item.type === 'MEDICINE' ? { ...item, fulfillmentStatus: 'DISPENSED' } : item)) : items);
  const nextVisits = visits.map((visit) => (visit.id === visitId ? { ...visit, billableItems: mark(visit.billableItems), prescriptions: visit.prescriptions.map((rx) => (ids.has(rx.id) ? { ...rx, dispensedAt: stamp, dispensedBy: actor.id } : rx)), dispensedAt: stamp, updatedAt: stamp } : visit));
  localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify(nextVisits)); window.dispatchEvent(new Event(MEDICAL_RECORDS_CHANGED));
  commit(invoices.map((invoice) => (invoice.id === entry.invoiceId ? { ...invoice, items: mark(invoice.items), version: (invoice.version ?? 1) + 1, updatedAt: stamp } : invoice)));
  settleVisitIfDone(visitId);
  recordActivity({ actor, module: 'BILLING', action: 'MEDICINE_DISPENSE', targetId: visitId, targetName: entry.invoiceCode });
  return listDispenseQueue(actorId).find((item) => item.visitId === visitId);
}
