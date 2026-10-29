import { clinicToday, validDate, normalize } from '../catalog/catalogPolicy';
export const HEALTH_HISTORY_PATH = '/vet/health-history';
export const HEALTH_EVENT_TYPES = {
  all: { label: 'Tất cả', icon: 'heart' }, visits: { label: 'Lần khám', icon: 'document' },
  results: { label: 'Kết quả', icon: 'activity' }, prescriptions: { label: 'Đơn thuốc', icon: 'medicine' },
  services: { label: 'Chỉ định', icon: 'service' }, vaccinations: { label: 'Tiêm phòng', icon: 'shield' }, appointments: { label: 'Lịch hẹn', icon: 'calendar' },
};
export function healthDateError(from, to) {
  return (from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to) ? 'Khoảng ngày không hợp lệ. Ngày bắt đầu không được sau ngày kết thúc.' : '';
}
export const healthInRange = (date, from, to) => (!from || date >= from) && (!to || date <= to);
export function matchHealthEvent(event, filters) {
  return (!filters.kind || filters.kind === 'all' || filters.kind === event.kind) && healthInRange(event.date, filters.from, filters.to)
    && normalize(event.search).includes(filters.search);
}
export const healthEvent = (kind, id, at, title, data, search, date = clinicToday(new Date(at))) => ({ kind, id: `${kind}:${id}`, at, date, title, data, search });
