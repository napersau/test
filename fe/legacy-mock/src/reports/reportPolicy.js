import { clinicToday, validDate, calendarDate, SERVICE_TYPES } from '../catalog/catalogPolicy';
import { APPOINTMENT_STATUSES } from '../appointments/appointmentPolicy';

export function validateRange(from, to, required = false) {
  if ((required && (!from || !to)) || (from && !validDate(from)) || (to && !validDate(to))) return 'Vui lòng chọn ngày bắt đầu và kết thúc hợp lệ.';
  if (from && to && from > to) return 'Ngày bắt đầu không được sau ngày kết thúc.';
  if (required && (Date.parse(to) - Date.parse(from)) / 86400000 > 365) return 'Mỗi báo cáo hỗ trợ tối đa 366 ngày. Vui lòng thu hẹp khoảng thời gian.';
  return '';
}

export function inDateRange(timestamp, from, to) {
  if (!Number.isFinite(Date.parse(timestamp))) return false;
  const date = clinicToday(new Date(timestamp));
  return (!from || date >= from) && (!to || date <= to);
}

export function formatTimestamp(value) {
  if (!Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
}

export function buildReport({ users, services, medicines, activity, care = { pets: [], appointments: [], visits: [], invoices: [] } }, from, to) {
  const error = validateRange(from, to, true);
  if (error) throw new Error(error);
  const customers = users.filter((user) => user.role === 'CUSTOMER' && inDateRange(user.createdAt, from, to));
  const batches = medicines.flatMap((medicine) => medicine.batches).filter((batch) => inDateRange(batch.importedAt, from, to));
  const events = activity.filter((event) => inDateRange(event.createdAt, from, to));
  const monthly = (Date.parse(to) - Date.parse(from)) / 86400000 > 62;
  const keyOf = (date) => monthly ? date.slice(0, 7) : date;
  const rows = new Map();
  for (let cursor = Date.parse(from); cursor <= Date.parse(to); cursor += 86400000) {
    const date = new Date(cursor).toISOString().slice(0, 10);
    const key = keyOf(date);
    if (!rows.has(key)) rows.set(key, { key, label: monthly ? `${key.slice(5)}/${key.slice(0, 4)}` : calendarDate(date), customers: 0, batches: 0, importCost: 0, actions: 0, receipts: 0, refunds: 0, visits: 0 });
  }
  const rowFor = (timestamp) => rows.get(keyOf(clinicToday(new Date(timestamp))));
  customers.forEach((customer) => { rowFor(customer.createdAt).customers += 1; });
  batches.forEach((batch) => { const row = rowFor(batch.importedAt); row.batches += 1; row.importCost += batch.quantity * batch.importPrice; });
  events.forEach((event) => { rowFor(event.createdAt).actions += 1; });
  const invoicePeriod = care.invoices.filter((item) => inDateRange(item.issuedAt, from, to));
  const visits = care.visits.filter((item) => inDateRange(item.examinedAt, from, to)); visits.forEach((item) => { rowFor(item.examinedAt).visits += 1; });
  const payments = care.invoices.flatMap((item) => item.payments).filter((item) => inDateRange(item.paidAt, from, to));
  const receipts = payments.filter((item) => item.type === 'PAYMENT').reduce((sum, item) => sum + item.amount, 0);
  const refunds = payments.filter((item) => item.type === 'REFUND').reduce((sum, item) => sum + item.amount, 0);
  payments.forEach((item) => { rowFor(item.paidAt)[item.type === 'PAYMENT' ? 'receipts' : 'refunds'] += item.amount; });
  const top = new Map();
  invoicePeriod.filter((item) => item.status !== 'CANCELLED').forEach((invoice) => invoice.items.filter((item) => item.type === 'SERVICE').forEach((item) => {
    const group = top.get(item.name) || { name: item.name, quantity: 0, amount: 0 }; group.quantity += item.quantity; group.amount += item.amount; top.set(item.name, group);
  }));
  const appointments = care.appointments.filter((item) => inDateRange(item.startsAt, from, to));
  // Doanh thu tách riêng dịch vụ và thuốc (BR-21); chỉ tính dòng hợp lệ của hóa đơn chưa hủy.
  const validItems = invoicePeriod.filter((item) => item.status !== 'CANCELLED').flatMap((invoice) => invoice.items);
  const sumItems = (type) => validItems.filter((item) => item.type === type).reduce((sum, item) => sum + item.amount, 0);
  const medicineTop = new Map();
  validItems.filter((item) => item.type === 'MEDICINE').forEach((item) => {
    const group = medicineTop.get(item.name) || { name: item.name, unit: item.unit, quantity: 0, amount: 0 }; group.quantity += item.quantity; group.amount += item.amount; medicineTop.set(item.name, group);
  });
  // Thống kê theo bác sĩ: ca được phân công đã/đang khám và ca hoàn tất (chỉ để theo dõi, không ảnh hưởng quyền).
  const doctorStats = users.filter((user) => user.role === 'VETERINARIAN').map((doctor) => {
    const own = appointments.filter((item) => item.doctorId === doctor.id);
    return { id: doctor.id, name: doctor.fullName, room: doctor.roomNumber || '', status: doctor.status,
      examined: own.filter((item) => ['IN_PROGRESS', 'COMPLETED'].includes(item.status)).length, completed: own.filter((item) => item.status === 'COMPLETED').length };
  }).sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name, 'vi'));
  const billedTotal = invoicePeriod.filter((item) => item.status !== 'CANCELLED').reduce((sum, item) => sum + item.total, 0);
  const outstanding = invoicePeriod.reduce((sum, item) => sum + item.remaining, 0);
  if (![receipts, refunds, receipts - refunds, billedTotal, outstanding, ...[...top.values()].flatMap((item) => [item.quantity, item.amount])].every(Number.isSafeInteger)) throw new Error('Tổng báo cáo vượt giới hạn số nguyên an toàn.');
  const allBatches = medicines.flatMap((medicine) => medicine.batches);
  const today = clinicToday();
  return {
    customers: customers.length, batches: batches.length, actions: events.length,
    billedTotal, receipts, refunds, netCollections: receipts - refunds, outstanding, invoiceCount: invoicePeriod.length, visitCount: visits.length,
    petCount: care.pets.length, activePetCount: care.pets.filter((item) => item.status === 'ACTIVE').length,
    appointmentCount: appointments.length, appointmentStatuses: Object.entries(APPOINTMENT_STATUSES).map(([status, item]) => ({ status, ...item, count: appointments.filter((appt) => appt.status === status).length })),
    serviceRevenue: sumItems('SERVICE'), medicineRevenue: sumItems('MEDICINE'), doctorStats,
    topMedicines: [...medicineTop.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'vi')),
    topServices: [...top.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'vi')),
    importCost: batches.reduce((sum, batch) => sum + batch.quantity * batch.importPrice, 0),
    availableValue: allBatches.filter((batch) => batch.expiry >= today).reduce((sum, batch) => sum + batch.remaining * batch.importPrice, 0),
    expiredValue: allBatches.filter((batch) => batch.expiry < today).reduce((sum, batch) => sum + batch.remaining * batch.importPrice, 0),
    warnings: medicines.filter((medicine) => (medicine.status === 'ACTIVE' && medicine.lowStock) || medicine.expiredStock > 0 || medicine.nearExpiryBatches > 0),
    serviceGroups: Object.entries(SERVICE_TYPES).map(([type, label]) => {
      const items = services.filter((service) => service.serviceType === type && service.status === 'ACTIVE');
      return { type, label, count: items.length, minPrice: items.length ? Math.min(...items.map((item) => item.price)) : null, maxPrice: items.length ? Math.max(...items.map((item) => item.price)) : null };
    }),
    trend: [...rows.values()], monthly,
  };
}
