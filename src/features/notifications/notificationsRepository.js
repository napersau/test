import { ownedRecords, isText, isTimestamp } from '../customerRecords/recordStorage';
import { listAppointments } from '../appointments/appointmentsRepository';
import { listMedicalHistory } from '../medicalHistory/medicalHistoryRepository';
import { listVaccinations } from '../vaccinations/vaccinationsRepository';
import { listInvoices } from '../invoices/invoicesRepository';
import { NOTIFICATIONS_KEY, NOTIFICATIONS_CHANGED, NOTIFICATION_KINDS, notificationPath } from './notificationPolicy';

function source(actorId) {
  const data = ownedRecords(actorId, NOTIFICATIONS_KEY, 'thông báo');
  if (data.records.some((item) => !NOTIFICATION_KINDS[item.kind] || !isText(item.title, 160) || !item.title.trim() || !isText(item.message, 2000)
    || !isText(item.entityId, 200) || !item.entityId || !isTimestamp(item.createdAt) || Date.parse(item.createdAt) > Date.now()
    || (item.readAt !== '' && (!isTimestamp(item.readAt) || Date.parse(item.readAt) > Date.now() || Date.parse(item.readAt) < Date.parse(item.createdAt))))) throw new Error('Dữ liệu thông báo không hợp lệ. Không tự ghi đè.');
  return data;
}
export function listNotifications(actorId) {
  const { records, pets } = source(actorId);
  const readers = { APPOINTMENT: listAppointments, MEDICAL_RECORD: listMedicalHistory, FOLLOW_UP: listMedicalHistory, VACCINATION: listVaccinations, INVOICE: listInvoices };
  const entities = new Map();
  return records.map((item) => {
    if (!entities.has(item.kind)) entities.set(item.kind, readers[item.kind](actorId));
    const accessible = entities.get(item.kind).some((entity) => entity.id === item.entityId && entity.petId === item.petId);
    // Entity may have been removed outside the demo: retain the notice without an unsafe/dead detail link.
    return { ...Object.fromEntries(['id', 'kind', 'title', 'message', 'createdAt', 'readAt', 'demo'].map((field) => [field, item[field]])),
      petName: pets.find((pet) => pet.id === item.petId).name, to: accessible ? notificationPath(item) : '' };
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
export function markNotificationRead(actorId, id) {
  const { records } = source(actorId); const current = records.find((item) => item.id === id);
  if (!current) throw new Error('Không tìm thấy thông báo của bạn.');
  if (current.readAt) return;
  const all = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY));
  const stamp = new Date().toISOString();
  try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all.map((item) => item.id === id && item.ownerId === actorId ? { ...item, readAt: stamp } : item))); }
  catch { throw new Error('Không lưu được trạng thái đã đọc. Kiểm tra dung lượng trình duyệt rồi thử lại.'); }
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
}
