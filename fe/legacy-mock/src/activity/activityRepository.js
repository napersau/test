import { findAccount } from '../users/usersRepository';
import { readAuditStorage } from './auditStorage';

export function listActivity(actorId) {
  const actor = findAccount(actorId);
  if (actor?.role !== 'ADMIN' || actor.status !== 'ACTIVE') throw new Error('Bạn không có quyền xem nhật ký hệ thống.');
  return readAuditStorage().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
