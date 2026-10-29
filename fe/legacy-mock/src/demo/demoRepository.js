import { listUsers, USERS_KEY, USERS_CHANGED } from '../users/usersRepository';
import { PETS_KEY, PETS_CHANGED } from '../pets/petsRepository';
import { CUSTOMERS_KEY, CUSTOMERS_CHANGED } from '../reception/customerProfileStorage';
import { SERVICES_KEY, SERVICES_CHANGED } from '../services/servicesRepository';
import { MEDICINES_KEY, MEDICINES_CHANGED } from '../medicines/medicinesRepository';
import { APPOINTMENTS_KEY, APPOINTMENTS_CHANGED, MEDICAL_RECORDS_KEY, MEDICAL_RECORDS_CHANGED } from '../appointments/appointmentPolicy';
import { ROOMS_KEY, ROOMS_CHANGED } from '../intake/intakePolicy';
import { INVOICES_KEY, INVOICES_CHANGED } from '../invoices/invoicePolicy';
import { VACCINATIONS_KEY, VACCINATIONS_CHANGED } from '../vaccinations/vaccinationPolicy';
import { NOTIFICATIONS_KEY, NOTIFICATIONS_CHANGED } from '../notifications/notificationPolicy';
import { AUDIT_KEY, AUDIT_CHANGED } from '../activity/auditStorage';
import { buildDemoDataset } from './buildDemoDataset';
import { buildDemoExtension } from './buildDemoExtension';
import { adoptBaseAccounts } from './adoptBaseAccounts';
import { DEMO_KEY, DEMO_CHANGED, DEMO_DATA_REVISION } from './demoConfig';
import { clinicToday } from '../catalog/catalogPolicy';
import { STAFF_KEY, STAFF_CHANGED } from '../staff/staffRepository';

export const DEMO_STORES = [
  [USERS_KEY, USERS_CHANGED, 'users'], [CUSTOMERS_KEY, CUSTOMERS_CHANGED, 'customers'], [PETS_KEY, PETS_CHANGED, 'pets'],
  [SERVICES_KEY, SERVICES_CHANGED, 'services'], [MEDICINES_KEY, MEDICINES_CHANGED, 'inventory'], [ROOMS_KEY, ROOMS_CHANGED, 'rooms'],
  [APPOINTMENTS_KEY, APPOINTMENTS_CHANGED, 'appointments'], [MEDICAL_RECORDS_KEY, MEDICAL_RECORDS_CHANGED, 'visits'],
  [INVOICES_KEY, INVOICES_CHANGED, 'invoices'], [VACCINATIONS_KEY, VACCINATIONS_CHANGED, 'vaccinations'],
  [NOTIFICATIONS_KEY, NOTIFICATIONS_CHANGED, 'notifications'], [AUDIT_KEY, AUDIT_CHANGED, 'audit'],
  [STAFF_KEY, STAFF_CHANGED, 'staff'],
];
function readMarker() {
  const raw = localStorage.getItem(DEMO_KEY); if (raw === null) return null;
  let marker; try { marker = JSON.parse(raw); } catch { throw new Error('Thông tin bộ demo bị lỗi. Không nạp lại hoặc ghi đè dữ liệu.'); }
  if (marker?.counts && marker.counts.staff === undefined && marker.revision !== 2) marker = { ...marker, counts: { ...marker.counts, staff: 0 } };
  if (marker?.version !== 1 || !Number.isFinite(Date.parse(marker.loadedAt)) || !marker.counts || DEMO_STORES.some(([, , name]) => !Number.isInteger(marker.counts[name]) || marker.counts[name] < 0)) throw new Error('Thông tin bộ demo không hợp lệ. Giữ nguyên dữ liệu để kiểm tra.');
  if (marker.revision !== undefined && ![1, 2].includes(marker.revision)) throw new Error('Phiên bản demo không hợp lệ.');
  return marker;
}
export function getDemoStatus(actorId) { listUsers(actorId); return readMarker(); }
function readArray(raw, label) {
  if (raw === null) return [];
  let records; try { records = JSON.parse(raw); } catch { throw new Error(`Nguồn ${label} bị lỗi JSON. Không thay đổi dữ liệu đã lưu.`); }
  assertArray(records, label); return records;
}
function assertArray(records, label) {
  if (!Array.isArray(records) || records.some((item) => !item || typeof item.id !== 'string' || !item.id) || new Set(records.map((item) => item.id)).size !== records.length) throw new Error(`Nguồn ${label} không hợp lệ. Không thay đổi dữ liệu đã lưu.`);
}
function append(existing, incoming, label) {
  assertArray(existing, label); assertArray(incoming, label);
  if (existing.some((item) => incoming.some((row) => row.id === item.id || (row.code && item.code?.toUpperCase() === row.code.toUpperCase())
    || (row.microchip && item.microchip?.toLowerCase() === row.microchip.toLowerCase())))) throw new Error(`Mã dữ liệu demo trùng với nguồn ${label}. Không ghi đè; hãy dùng trình duyệt/profile riêng để thử.`);
  return [...existing, ...incoming];
}
// Explicit, admin-only, once-per-browser append. No silent startup seed and no destructive reset.
// options.adoptBaseAccounts: gắn dữ liệu của nhân vật demo vào các tài khoản gốc (customer@, vet@, reception@...).
export function loadDemoDataset(actorId, now = new Date(), options = {}) {
  const users = listUsers(actorId); // Canonical active ADMIN guard; never trusts a session role.
  const marker = readMarker(); if (marker) return { ...marker, alreadyLoaded: true };
  const built = buildDemoDataset(now, users.find((item) => item.id === actorId));
  const { dataset, aliases } = options.adoptBaseAccounts ? adoptBaseAccounts(built, users) : { dataset: built, aliases: {} };
  const originals = new Map(DEMO_STORES.map(([key]) => [key, localStorage.getItem(key)]));
  const writes = new Map();
  for (const [key, , name] of DEMO_STORES) {
    const raw = originals.get(key);
    if (name === 'inventory') {
      let previous = { medicines: [], batches: [] };
      if (raw !== null) { try { previous = JSON.parse(raw); } catch { throw new Error('Nguồn thuốc bị lỗi JSON. Không thay đổi dữ liệu đã lưu.'); } }
      if (!previous) throw new Error('Nguồn thuốc không hợp lệ.');
      writes.set(key, JSON.stringify({ ...previous, medicines: append(previous.medicines, dataset.inventory.medicines, 'thuốc'), batches: append(previous.batches, dataset.inventory.batches, 'lô thuốc') }));
    } else {
      writes.set(key, JSON.stringify(append(readArray(raw, name), dataset[name], name)));
    }
  }
  const contacts = [...readArray(originals.get(USERS_KEY), 'tài khoản'), ...readArray(originals.get(CUSTOMERS_KEY), 'khách hàng')];
  if ([...dataset.users, ...dataset.customers].some((item) => contacts.some((old) => (item.email && old.email?.trim().toLowerCase() === item.email.toLowerCase()) || old.phone?.replace(/\s/g, '') === item.phone))) throw new Error('Email hoặc điện thoại demo đã được sử dụng. Không đổi tài khoản hiện tại; hãy dùng profile trình duyệt riêng.');
  const result = { version: 1, loadedAt: now.toISOString(), dataRevision: DEMO_DATA_REVISION, ...(Object.keys(aliases).length ? { aliases } : {}), counts: Object.fromEntries(DEMO_STORES.map(([, , name]) => [name, name === 'inventory' ? dataset.inventory.medicines.length : dataset[name].length])) };
  writes.set(DEMO_KEY, JSON.stringify(result)); originals.set(DEMO_KEY, null);
  commitWrites(writes, originals);
  return { ...result, alreadyLoaded: false };
}
function commitWrites(writes, originals) {
  const changed = [];
  try {
    for (const [key, value] of writes) { localStorage.setItem(key, value); changed.push(key); }
  } catch {
    let restored = true;
    for (const key of changed.reverse()) {
      try { const old = originals.get(key); old === null ? localStorage.removeItem(key) : localStorage.setItem(key, old); } catch { restored = false; }
    }
    if (!restored) throw new Error('Lưu thất bại và chưa khôi phục đủ nguồn. Dừng thao tác, không nạp lại; kiểm tra bộ nhớ trình duyệt.');
    throw new Error('Không đủ bộ nhớ để nạp demo. Dữ liệu trước thao tác đã được khôi phục.');
  }
  // Dispatch only after all related stores are committed, so readers never see partial fixtures.
  DEMO_STORES.forEach(([, event]) => window.dispatchEvent(new Event(event)));
  window.dispatchEvent(new Event(DEMO_CHANGED));
}
const isDemoRow = (item, owners, pets) => item.demo === true || owners.has(item.ownerId) || pets.has(item.petId) || owners.has(item.actorId);
// Bỏ mọi dòng thuộc bộ demo (kể cả hồ sơ do thao tác thử tạo thêm trên thú cưng/chủ nuôi demo) nhưng giữ nguyên dữ liệu thật của người dùng.
function stripDemoRows(raw, name, owners, pets) {
  if (raw === null) return null;
  const parsed = JSON.parse(raw);
  if (name === 'inventory') return JSON.stringify({ ...parsed, medicines: parsed.medicines.filter((item) => item.demo !== true), batches: parsed.batches.filter((item) => item.demo !== true) });
  return JSON.stringify(parsed.filter((item) => !isDemoRow(item, owners, pets)));
}
// Xóa bộ demo cũ rồi nạp lại bản mới nhất (giữ cả bản bổ sung V2 nếu đã nạp). Mọi thay đổi được hoàn tác nếu có bước nào lỗi.
export function refreshDemoDataset(actorId, now = new Date(), options = {}) {
  listUsers(actorId); const marker = readMarker();
  if (!marker) throw new Error('Chưa có bộ demo để làm mới. Hãy nạp dữ liệu demo trước.');
  const keys = [...DEMO_STORES.map(([key]) => key), DEMO_KEY]; const originals = new Map(keys.map((key) => [key, localStorage.getItem(key)]));
  const restore = () => { keys.forEach((key) => { try { const old = originals.get(key); old === null ? localStorage.removeItem(key) : localStorage.setItem(key, old); } catch { /* best effort */ } }); DEMO_STORES.forEach(([, event]) => window.dispatchEvent(new Event(event))); window.dispatchEvent(new Event(DEMO_CHANGED)); };
  try {
    const parse = (key) => { const raw = originals.get(key); return raw === null ? [] : JSON.parse(raw); };
    const owners = new Set([...parse(USERS_KEY), ...parse(CUSTOMERS_KEY)].filter((item) => item.demo === true).map((item) => item.id));
    const pets = new Set(parse(PETS_KEY).filter((item) => item.demo === true || owners.has(item.ownerId)).map((item) => item.id));
    DEMO_STORES.forEach(([key, , name]) => { const next = stripDemoRows(originals.get(key), name, owners, pets); if (next !== null) localStorage.setItem(key, next); });
    localStorage.removeItem(DEMO_KEY);
    loadDemoDataset(actorId, now, { adoptBaseAccounts: options.adoptBaseAccounts ?? !!marker.aliases }); if (marker.revision === 2) extendDemoDataset(actorId, now);
    return { ...readMarker(), alreadyLoaded: false };
  } catch (problem) {
    restore();
    throw new Error(problem.message?.startsWith('Không') || problem.message?.startsWith('Chưa') ? problem.message : 'Không làm mới được dữ liệu demo. Dữ liệu trước thao tác đã được khôi phục.');
  }
}
export function extendDemoDataset(actorId, now = new Date()) {
  const users = listUsers(actorId); const marker = readMarker();
  if (!marker) throw new Error('Nạp bộ dữ liệu demo cơ bản trước khi bổ sung.');
  if (marker.revision === 2) return { ...marker, alreadyLoaded: true };
  const originals = new Map(DEMO_STORES.map(([key]) => [key, localStorage.getItem(key)])); originals.set(DEMO_KEY, localStorage.getItem(DEMO_KEY));
  const source = Object.fromEntries(DEMO_STORES.map(([key, , name]) => {
    if (name !== 'inventory') return [name, readArray(originals.get(key), name)];
    let inventory; try { inventory = JSON.parse(originals.get(key)); } catch { throw new Error('Dữ liệu thuốc bị lỗi.'); }
    assertArray(inventory?.medicines, 'thuốc'); assertArray(inventory?.batches, 'lô'); return [name, inventory];
  }));
  const extra = buildDemoExtension({ ...source, aliases: marker.aliases || {} }, users.find((item) => item.id === actorId), now);
  const writes = new Map();
  DEMO_STORES.forEach(([key, , name]) => {
    if (name !== 'inventory' && extra[name].length) writes.set(key, JSON.stringify(append(source[name], extra[name], name)));
  });
  // No new live resource allocation. Historical visits still must not overlap existing vet/room slots.
  if (extra.appointments.some((item) => source.appointments.some((old) => !['CANCELLED', 'NO_SHOW', 'PENDING'].includes(old.status) && Math.abs(Date.parse(item.startsAt) - Date.parse(old.startsAt)) < 30 * 60000 && (old.assignedDoctorId === item.assignedDoctorId || old.roomId === item.roomId || old.petId === item.petId)))) throw new Error('Ca mẫu bổ sung trùng khung giờ dữ liệu hiện có. Không thay đổi lịch đã lưu; dùng profile riêng để thử bộ mới.');
  const counts = Object.fromEntries(DEMO_STORES.map(([, , name]) => [name, marker.counts[name] + (name === 'inventory' ? 0 : extra[name].length)]));
  const result = { ...marker, revision: 2, extendedAt: now.toISOString(), counts };
  writes.set(DEMO_KEY, JSON.stringify(result)); commitWrites(writes, originals);
  return { ...result, alreadyLoaded: false };
}

// Chạy khi mở ứng dụng (không chạy trong test): trình duyệt chưa có demo thì nạp đủ V1 + V2 gắn vào tài khoản gốc;
// bộ demo nạp từ ngày hôm trước hoặc từ phiên bản nội dung cũ thì làm mới để lịch "hôm nay" luôn có ca. Lỗi dữ liệu thì bỏ qua, không ghi đè.
export function ensureDemoData(now = new Date()) {
  const actor = 'admin-default'; const options = { adoptBaseAccounts: true };
  try {
    if (localStorage.getItem(DEMO_KEY) === null) { loadDemoDataset(actor, now, options); extendDemoDataset(actor, now); return 'loaded'; }
    const marker = readMarker();
    if (clinicToday(new Date(marker.loadedAt)) !== clinicToday(now) || (marker.dataRevision || 0) < DEMO_DATA_REVISION) { refreshDemoDataset(actor, now, options); return 'refreshed'; }
  } catch (problem) { console.warn('Không tự nạp được dữ liệu demo:', problem.message); return 'failed'; }
  return 'skipped';
}
