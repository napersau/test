import { findAccount } from '../users/usersRepository';

export function requireCatalogAdmin(actorId) {
  const actor = findAccount(actorId);
  if (actor?.role !== 'ADMIN' || actor.status !== 'ACTIVE') throw new Error('Bạn không có quyền quản lý danh mục.');
}
export function readCatalog(key, seed) {
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    try { return JSON.parse(saved); }
    catch { throw new Error('Dữ liệu danh mục không hợp lệ. Vui lòng kiểm tra dữ liệu lưu trữ.'); }
  }
  const initial = seed();
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
}
export function commitCatalog(key, eventName, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(eventName));
}
export const catalogId = () => window.crypto?.randomUUID?.() || `catalog-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function assertFields(errors) {
  if (!Object.keys(errors).length) return;
  const error = new Error('Vui lòng kiểm tra lại thông tin.');
  error.fieldErrors = errors;
  throw error;
}
export function assertUniqueCode(records, code, id) {
  if (records.some((item) => item.id !== id && item.code.toUpperCase() === code.trim().toUpperCase())) {
    assertFields({ code: 'Mã này đã được sử dụng.' });
  }
}
