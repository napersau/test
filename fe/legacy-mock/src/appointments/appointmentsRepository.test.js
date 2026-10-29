import { cancelAppointment, createAppointment, getBookingOptions, getSlotAvailability, listAppointments, rescheduleAppointment } from './appointmentsRepository';
import { APPOINTMENTS_KEY, clinicDateOffset, MEDICAL_RECORDS_KEY, validateBooking } from './appointmentPolicy';
import { listMedicalHistory } from '../medicalHistory/medicalHistoryRepository';
import { savePet, setPetStatus } from '../pets/petsRepository';
import { listActivity } from '../activity/activityRepository';
import { SERVICES_KEY, saveService } from '../services/servicesRepository';
import { USERS_KEY } from '../users/usersRepository';

const NOW = new Date('2026-10-03T02:00:00Z');
const values = (changes = {}) => ({ petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Kiểm tra sức khỏe cho bé', date: '2026-10-04', time: '09:00', ...changes });
export const clinicalFixture = (changes = {}) => ({ id: 'visit-bo', ownerId: 'customer-demo', petId: 'pet-bo-demo', status: 'COMPLETED', examinedAt: '2026-10-01T09:00:00+07:00', doctorName: 'Trần Minh Khang', diagnosis: 'Chẩn đoán fixture kiểm thử', recommendations: 'Dặn dò fixture', weight: 6.5, followUpDate: '2026-10-12',
  results: [{ id: 'result-1', name: 'Kết quả fixture', result: 'Nội dung kết quả fixture', internalNotes: 'private result' }], prescriptions: [{ id: 'rx-1', medicineName: 'Thuốc fixture', dosage: 'Liều fixture', instructions: 'Hướng dẫn fixture', privateNotes: 'private prescription' }], doctorOnlyNotes: 'private clinical notes', ...changes });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('customer options expose only owned active pets, active consultations and the slot capacity, never doctors', () => {
  const options = getBookingOptions('customer-demo');
  expect(options.pets).toHaveLength(2); expect(options.services).toEqual([expect.objectContaining({ id: 'service-1', price: 150000 })]);
  expect(options.capacity).toBe(2);
  expect(options).not.toHaveProperty('doctors');
  setPetStatus('customer-demo', 'pet-bo-demo', 'ARCHIVED'); expect(getBookingOptions('customer-demo').pets.map((pet) => pet.id)).toEqual(['pet-bella-demo']);
  ['admin-default', 'vet-demo', 'reception-demo', 'customer-three', 'unknown'].forEach((id) => expect(() => getBookingOptions(id)).toThrow(/khách hàng/));
});

test('creates ONLINE/PENDING using protected ownership and snapshots, never creates a clinical record', () => {
  const appointment = createAppointment('customer-demo', values({ ownerId: 'customer-two', status: 'COMPLETED', source: 'WALK_IN', preferredDoctorId: 'vet-demo', estimatedPrice: 1 }));
  expect(appointment).toMatchObject({ ownerId: 'customer-demo', status: 'PENDING', source: 'ONLINE', estimatedPrice: 150000, preferredDoctorId: '', preferredDoctorName: '', version: 1, startsAt: '2026-10-04T09:00:00+07:00' });
  expect(appointment.code).toBe('APT-20261004-001');
  expect(createAppointment('customer-demo', values({ petId: 'pet-bella-demo', time: '10:00' })).code).toBe('APT-20261004-002');
  expect(listAppointments('customer-demo').find((item) => item.id === appointment.id)).toMatchObject({ id: appointment.id, code: appointment.code, status: 'PENDING', startsAt: appointment.startsAt }); expect(listAppointments('customer-two')).toEqual([]);
  expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBeNull(); expect(listMedicalHistory('customer-demo')).toEqual([]);
  const audit = listActivity('admin-default'); expect(audit).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'APPOINTMENT_CREATE' })])); expect(JSON.stringify(audit)).not.toContain(appointment.reason);
});

test('rejects foreign/archived pets, inactive services/doctors, duplicate pet slots and forged mutations', () => {
  expect(() => createAppointment('customer-two', values())).toThrow(/Không tìm thấy/);
  expect(() => createAppointment('admin-default', values())).toThrow(/khách hàng/);
  setPetStatus('customer-demo', 'pet-bo-demo', 'ARCHIVED'); expect(() => createAppointment('customer-demo', values())).toThrow(/lưu trữ/);
  setPetStatus('customer-demo', 'pet-bo-demo', 'ACTIVE');
  expect(() => createAppointment('customer-demo', values({ serviceId: 'service-2' }))).toThrow(/không còn/);
  const appointment = createAppointment('customer-demo', values()); expect(() => createAppointment('customer-demo', values())).toThrow(/khung giờ/);
  expect(() => cancelAppointment('customer-two', appointment.id, 'Hủy', 1)).toThrow(/Không tìm thấy/);
  expect(() => cancelAppointment('customer-demo', appointment.id, ' ', 1)).toThrow(/lý do hủy/);
  cancelAppointment('customer-demo', appointment.id, 'Đổi kế hoạch', 1);
  expect(createAppointment('customer-demo', values()).status).toBe('PENDING');
});

test('rechecks service state at submission and keeps snapshots when the catalogue changes', () => {
  getBookingOptions('customer-demo'); const service = JSON.parse(localStorage.getItem(SERVICES_KEY))[0];
  const appointment = createAppointment('customer-demo', values());
  saveService('admin-default', { ...service, status: 'INACTIVE', price: 190000 }, service.id);
  expect(() => createAppointment('customer-demo', values({ time: '10:00' }))).toThrow(/Dịch vụ/);
  expect(listAppointments('customer-demo')[0]).toMatchObject({ id: appointment.id, estimatedPrice: 150000, serviceName: service.name });
  const users = JSON.parse(localStorage.getItem(USERS_KEY)); localStorage.setItem(USERS_KEY, JSON.stringify(users.map((user) => user.id === 'customer-demo' ? { ...user, status: 'INACTIVE' } : user)));
  expect(() => listAppointments('customer-demo')).toThrow(/khách hàng/);
});

test('cancellation requires a current revision, an allowed status and a future appointment', () => {
  const appointment = createAppointment('customer-demo', values());
  expect(() => cancelAppointment('customer-demo', appointment.id, 'Đổi giờ', 0)).toThrow(/vừa thay đổi/);
  const cancelled = cancelAppointment('customer-demo', appointment.id, ' Đổi giờ ', 1); expect(cancelled).toMatchObject({ status: 'CANCELLED', cancellationReason: 'Đổi giờ', version: 2 });
  expect(listAppointments('customer-demo')).toHaveLength(1);
  expect(() => cancelAppointment('customer-demo', appointment.id, 'Lần nữa', 2)).toThrow(/Chỉ hủy/);
  const next = createAppointment('customer-demo', values({ time: '10:00' })); jest.setSystemTime(new Date('2026-10-04T04:00:00Z'));
  expect(() => cancelAppointment('customer-demo', next.id, 'Đã trễ', 1)).toThrow(/quá thời gian/);
});

test('validates Vietnam calendar boundaries, lead time, invalid dates and 30-day horizon', () => {
  const lateUtc = new Date('2026-10-03T17:30:00Z'); expect(clinicDateOffset(0, lateUtc)).toBe('2026-10-04');
  expect(validateBooking(values({ date: '2026-02-30', reason: '' }))).toHaveProperty('date');
  expect(validateBooking(values({ date: '2026-10-03', time: '09:00' }))).toHaveProperty('time');
  expect(validateBooking(values({ date: clinicDateOffset(31, NOW) }))).toHaveProperty('date');
  expect(validateBooking(values({ date: clinicDateOffset(30, NOW) }))).not.toHaveProperty('date');
  ['12:00', '11:30', '17:00', '13:00'].forEach((time) => expect(validateBooking(values({ time }))).toHaveProperty('time'));
  expect(validateBooking(values({ reason: 'x'.repeat(1001) }))).toHaveProperty('reason');
  expect(validateBooking(values())).toEqual({});
});

test('storage corruption and quota failures do not overwrite history or report success', () => {
  localStorage.setItem(APPOINTMENTS_KEY, '{bad'); expect(() => createAppointment('customer-demo', values())).toThrow(/không hợp lệ/); expect(localStorage.getItem(APPOINTMENTS_KEY)).toBe('{bad');
  localStorage.removeItem(APPOINTMENTS_KEY); getBookingOptions('customer-demo');
  const original = Storage.prototype.setItem;
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) { if (key === APPOINTMENTS_KEY) throw new Error('Quota'); return original.call(this, key, value); });
  expect(() => createAppointment('customer-demo', values())).toThrow(/Không lưu được/); expect(listAppointments('customer-demo')).toEqual([]);
});

test('medical reader is read-only, ownership-bound, completed-only and strips private notes at every level', () => {
  const foreign = savePet('customer-two', { name: 'Thú cưng của khách khác' });
  localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify([clinicalFixture(), clinicalFixture({ id: 'draft', status: 'IN_PROGRESS' }), clinicalFixture({ id: 'foreign', ownerId: 'customer-two', petId: foreign.id }), clinicalFixture({ id: 'spoofed-owner', petId: foreign.id })]));
  const history = listMedicalHistory('customer-demo'); expect(history).toHaveLength(1); expect(history[0]).toMatchObject({ petName: 'Bô', weight: 6.5 }); expect(JSON.stringify(history)).not.toContain('private');
  expect(listMedicalHistory('customer-two').map((record) => record.id)).toEqual(['foreign']);
  setPetStatus('customer-demo', 'pet-bo-demo', 'ARCHIVED'); expect(listMedicalHistory('customer-demo')).toHaveLength(1);
  expect(() => listMedicalHistory('admin-default')).toThrow(/khách hàng/);
  localStorage.setItem(MEDICAL_RECORDS_KEY, '{bad'); expect(() => listMedicalHistory('customer-demo')).toThrow(/không hợp lệ/); expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBe('{bad');
});

test('a day has exactly the 14 clinic slots and capacity equals the active doctors', () => {
  const { capacity, slots } = getSlotAvailability('customer-demo', '2026-10-04');
  expect(capacity).toBe(2);
  expect(slots.map((slot) => slot.time)).toEqual(['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']);
  expect(slots.find((slot) => slot.time === '09:00')).toMatchObject({ booked: 0, remaining: 2, full: false, label: '09:00 - 09:30' });
  expect(getSlotAvailability('customer-demo', '2026-12-31').error).toMatch(/30 ngày/);
  createAppointment('customer-demo', values());
  expect(getSlotAvailability('customer-demo', '2026-10-04').slots.find((slot) => slot.time === '09:00')).toMatchObject({ booked: 1, remaining: 1 });
  expect(() => getSlotAvailability('admin-default', '2026-10-04')).toThrow(/khách hàng/);
});

test('a full slot rejects new bookings; cancelling or locking a doctor changes capacity', () => {
  const foreign = savePet('customer-two', { name: 'Mực' });
  const first = createAppointment('customer-demo', values());
  createAppointment('customer-demo', values({ petId: 'pet-bella-demo' }));
  expect(getSlotAvailability('customer-demo', '2026-10-04').slots.find((slot) => slot.time === '09:00').full).toBe(true);
  expect(() => createAppointment('customer-two', values({ petId: foreign.id }))).toThrow(/đã kín lịch/);
  cancelAppointment('customer-demo', first.id, 'Bận đột xuất', 1);
  expect(createAppointment('customer-two', values({ petId: foreign.id })).status).toBe('PENDING');
  const users = JSON.parse(localStorage.getItem(USERS_KEY));
  localStorage.setItem(USERS_KEY, JSON.stringify(users.map((user) => (user.id === 'vet-two' ? { ...user, status: 'LOCKED' } : user))));
  expect(getBookingOptions('customer-demo').capacity).toBe(1);
  expect(getSlotAvailability('customer-demo', '2026-10-04').slots.find((slot) => slot.time === '09:00').full).toBe(true);
});

test('self-service cancel and reschedule need at least 2 hours before the appointment', () => {
  const exactlyTwoHours = createAppointment('customer-demo', values({ date: '2026-10-03', time: '11:00' }));
  expect(cancelAppointment('customer-demo', exactlyTwoHours.id, 'Bận đột xuất', 1).status).toBe('CANCELLED');
  const tooSoon = createAppointment('customer-demo', values({ date: '2026-10-03', time: '10:00' }));
  expect(() => cancelAppointment('customer-demo', tooSoon.id, 'Bận đột xuất', 1)).toThrow(/hotline/);
  expect(() => rescheduleAppointment('customer-demo', tooSoon.id, { date: '2026-10-05', time: '10:00', reason: 'Bận' }, 1)).toThrow(/hotline/);
});

test('rescheduling moves the slot, keeps the status, frees the old slot and validates the new one', () => {
  const foreign = savePet('customer-two', { name: 'Mực' });
  const appointment = createAppointment('customer-demo', values());
  const target = { date: '2026-10-05', time: '14:00', reason: 'Bận việc buổi sáng' };
  expect(() => rescheduleAppointment('customer-two', appointment.id, target, 1)).toThrow(/Không tìm thấy/);
  expect(() => rescheduleAppointment('customer-demo', appointment.id, target, 9)).toThrow(/vừa thay đổi/);
  expect(() => rescheduleAppointment('customer-demo', appointment.id, { ...target, reason: ' ' }, 1)).toThrow(/ngày và khung giờ/);
  expect(() => rescheduleAppointment('customer-demo', appointment.id, { ...target, time: '11:30' }, 1)).toThrow(/ngày và khung giờ/);
  expect(() => rescheduleAppointment('customer-demo', appointment.id, { ...target, date: '2026-10-04', time: '09:00' }, 1)).toThrow(/khác với lịch hiện tại/);
  createAppointment('customer-demo', values({ petId: 'pet-bella-demo', date: '2026-10-05', time: '14:00' }));
  createAppointment('customer-two', values({ petId: foreign.id, date: '2026-10-05', time: '14:00' }));
  expect(() => rescheduleAppointment('customer-demo', appointment.id, target, 1)).toThrow(/đã kín lịch/);
  const moved = rescheduleAppointment('customer-demo', appointment.id, { ...target, time: '14:30' }, 1);
  expect(moved).toMatchObject({ status: 'PENDING', startsAt: '2026-10-05T14:30:00+07:00', version: 2, rescheduleReason: 'Bận việc buổi sáng' });
  expect(getSlotAvailability('customer-demo', '2026-10-04').slots.find((slot) => slot.time === '09:00').booked).toBe(0);
  expect(listActivity('admin-default').map((event) => event.action)).toContain('APPOINTMENT_RESCHEDULE');
});
