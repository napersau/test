// Internal best-effort writer. Public workflow repositories authorize/commit first.
// Re-check canonical owner/pet/entity; never include diagnosis, contact, dosage or private notes.
import { NOTIFICATIONS_KEY, NOTIFICATIONS_CHANGED, NOTIFICATION_KINDS } from './notificationPolicy';
import { isText, isTimestamp } from '../customerRecords/recordStorage';
import { clinicToday, daysUntil, validDate } from '../catalog/catalogPolicy';
let warning = '';
export const getNotificationWriteWarning = () => warning;
const KEYS = { users: 'pawcare_users_v1', pets: 'pawcare_pets_v1', APPOINTMENT: 'pawcare_appointments_v1', MEDICAL_RECORD: 'pawcare_medical_records_v1', FOLLOW_UP: 'pawcare_medical_records_v1', VACCINATION: 'pawcare_vaccinations_v1', INVOICE: 'pawcare_invoices_v1' };
function read(key) {
  const raw = localStorage.getItem(key); if (raw === null) return [];
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.some((item) => !item || typeof item.id !== 'string' || !item.id) || new Set(rows.map((item) => item.id)).size !== rows.length) throw new Error('Invalid notification source');
  return rows;
}
export function notifyCustomerEvent(kind, entityId, token, title, message) {
  try {
    if (!KEYS[kind] || typeof token !== 'string' || !token || !isText(title, 160) || !title.trim() || !isText(message, 1800)) throw new Error('Invalid notification event');
    const entity = read(KEYS[kind]).find((item) => item.id === entityId);
    const owner = read(KEYS.users).find((item) => item.id === entity?.ownerId && item.role === 'CUSTOMER' && item.status === 'ACTIVE');
    const pet = read(KEYS.pets).find((item) => item.id === entity?.petId && item.ownerId === owner?.id);
    if (!owner || !pet) return false; // Walk-ins have no customer inbox.
    if (['APPOINTMENT', 'VACCINATION', 'FOLLOW_UP'].includes(kind) && owner.receiveAppointmentReminders === false) return false;
    if (['MEDICAL_RECORD', 'FOLLOW_UP'].includes(kind) && entity.status !== 'COMPLETED') return false;
    const rows = read(NOTIFICATIONS_KEY);
    if (rows.some((item) => ['ownerId', 'petId', 'entityId'].some((field) => typeof item[field] !== 'string' || !item[field])
      || !NOTIFICATION_KINDS[item.kind] || !isText(item.title, 160) || !item.title.trim() || !isText(item.message, 2000)
      || !isTimestamp(item.createdAt) || Date.parse(item.createdAt) > Date.now()
      || (item.readAt !== '' && (!isTimestamp(item.readAt) || Date.parse(item.readAt) > Date.now() || Date.parse(item.readAt) < Date.parse(item.createdAt))))) throw new Error('Invalid inbox');
    const id = `notice-${kind.toLowerCase()}-${entity.id}-${token}`;
    if (rows.some((item) => item.id === id)) return false;
    const notice = { id, demo: true, ownerId: owner.id, petId: pet.id, kind, entityId: entity.id,
      title, message: `${message} Chỉ thông báo demo trong ứng dụng.`, createdAt: new Date().toISOString(), readAt: '' };
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([...rows, notice])); warning = '';
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)); return true;
  } catch {
    warning = 'Thao tác nghiệp vụ đã lưu nhưng chưa ghi được thông báo demo. Kiểm tra dữ liệu/dung lượng lưu trữ.';
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)); return false;
  }
}
export function refreshCustomerReminders(actorId) {
  try {
    const actor = read(KEYS.users).find((item) => item.id === actorId && item.role === 'CUSTOMER' && item.status === 'ACTIVE');
    if (!actor) throw new Error('Chỉ khách hàng đang hoạt động được cập nhật nhắc nhở.');
    warning = '';
    if (actor.receiveAppointmentReminders === false) return;
    const pets = read(KEYS.pets).filter((pet) => pet.ownerId === actor.id && pet.status === 'ACTIVE');
    const owned = (item) => item.ownerId === actor.id && pets.some((pet) => pet.id === item.petId);
    const today = clinicToday();
    read(KEYS.VACCINATION).filter((item) => owned(item) && item.status === 'PLANNED' && validDate(item.dueDate) && daysUntil(item.dueDate, today) <= 30).forEach((item) => {
      notifyCustomerEvent('VACCINATION', item.id, `due-${item.dueDate}`, 'Nhắc theo dõi lịch tiêm', `Ngày dự kiến ${item.dueDate}. Mở hồ sơ để kiểm tra lịch; thông báo không xác nhận đã tiêm.`);
    });
    const latest = new Map();
    read(KEYS.MEDICAL_RECORD).filter((item) => owned(item) && item.status === 'COMPLETED').forEach((item) => { if (!latest.has(item.petId) || Date.parse(item.examinedAt) > Date.parse(latest.get(item.petId).examinedAt)) latest.set(item.petId, item); });
    [...latest.values()].filter((item) => validDate(item.followUpDate) && daysUntil(item.followUpDate, today) <= 30).forEach((item) => notifyCustomerEvent('FOLLOW_UP', item.id, `due-${item.followUpDate}`, 'Nhắc theo dõi ngày tái khám', `Đề nghị tái khám ${item.followUpDate} trong hồ sơ gần nhất; chưa phải lịch hẹn đã đặt.`));
  } catch {
    warning = 'Chưa cập nhật được nhắc nhở demo. Dữ liệu nguồn được giữ nguyên.';
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  }
}
