import { clinicToday, daysUntil } from '../catalog/catalogPolicy';

export const VACCINATIONS_KEY = 'pawcare_vaccinations_v1';
export const VACCINATIONS_CHANGED = 'pawcare:vaccinations-changed';
export const VACCINATION_STATUSES = {
  OVERDUE: { label: 'Quá ngày dự kiến', tone: 'red', icon: '!' }, DUE: { label: 'Đến ngày dự kiến', tone: 'amber', icon: '▦' },
  UPCOMING: { label: 'Sắp đến · trong 30 ngày', tone: 'blue', icon: '◷' }, SCHEDULED: { label: 'Dự kiến · sau 30 ngày', tone: 'gray', icon: '▦' },
  COMPLETED: { label: 'Đã tiêm', tone: 'green', icon: '✓' }, CANCELLED: { label: 'Đã hủy lịch tiêm', tone: 'gray', icon: '×' },
};
export function vaccinationStatus(record, today = clinicToday()) {
  if (record.status === 'COMPLETED' || record.status === 'CANCELLED') return record.status;
  const days = daysUntil(record.dueDate, today);
  return days < 0 ? 'OVERDUE' : days === 0 ? 'DUE' : days <= 30 ? 'UPCOMING' : 'SCHEDULED';
}
