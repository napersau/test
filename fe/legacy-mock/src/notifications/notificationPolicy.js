export const NOTIFICATIONS_KEY = 'pawcare_notifications_v1';
export const NOTIFICATIONS_CHANGED = 'pawcare:notifications-changed';
export const NOTIFICATION_KINDS = { APPOINTMENT: 'Lịch hẹn', MEDICAL_RECORD: 'Hồ sơ khám', VACCINATION: 'Tiêm phòng', FOLLOW_UP: 'Tái khám', INVOICE: 'Hóa đơn' };
export function notificationPath(record) {
  const id = encodeURIComponent(record.entityId);
  return { APPOINTMENT: '/portal/appointments', MEDICAL_RECORD: `/portal/medical-history/${id}`, FOLLOW_UP: `/portal/medical-history/${id}`, VACCINATION: `/portal/vaccinations/${id}`, INVOICE: `/portal/invoices/${id}` }[record.kind];
}
