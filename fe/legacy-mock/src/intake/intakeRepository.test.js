import { createAppointment, listAppointments, cancelAppointment, getSlotAvailability } from '../appointments/appointmentsRepository';
import { APPOINTMENTS_KEY, MEDICAL_RECORDS_KEY } from '../appointments/appointmentPolicy';
import {
  confirmIntakeAppointment, logContactFailure, noteLateArrival, checkInAppointment, createWalkIn, saveReceptionAppointment, closeReceptionAppointment,
  assignDoctor, setIntakePostponed, getIntakeOptions, listIntakeAppointments,
} from './intakeRepository';
import { sortIntakeQueue, waitingQueue, queueKind, getDoctorStatus, validateVitals, waitMinutes, countNoShows } from './intakePolicy';
import { INVOICES_KEY } from '../invoices/invoicePolicy';
import { updateUser } from '../users/usersRepository';
import { setPetStatus } from '../pets/petsRepository';
import { listActivity } from '../activity/activityRepository';
import { listNotifications } from '../notifications/notificationsRepository';
import { listReceptionCustomers } from '../reception/customersRepository';
import { listReceptionPets } from '../pets/petsRepository';

const NOW = new Date('2026-10-03T00:00:00Z'); // 07:00 giờ Việt Nam
const RECEPTION = 'reception-demo';
const vitals = { weightKg: 5.2, temperatureC: 38.6 };
const walkIn = (extra = {}) => ({ ownerId: 'customer-demo', petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Lý do riêng của khách', intakeNote: 'Ghi chú nội bộ tiếp nhận', ...vitals, ...extra });
const booking = (extra = {}) => ({ ownerId: 'customer-demo', petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Khám theo hẹn', source: 'PHONE', date: '2026-10-04', time: '09:00', ...extra });
const NEW_CUSTOMER = { fullName: 'Hoàng Gia Bảo', phone: '0988777666', address: 'Quận 1' };
const NEW_PET = { name: 'Lu', species: 'CAT', breed: 'Mèo ta', gender: 'MALE' };
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
const online = (extra = {}) => createAppointment('customer-demo', { petId: 'pet-bo-demo', serviceId: 'service-1', reason: 'Khám thử nghiệm', date: '2026-10-03', time: '10:00', ...extra });
const confirmedToday = (extra) => confirmIntakeAppointment(RECEPTION, online(extra).id, { expectedVersion: 1 });

test.each(['admin-default', 'vet-demo', 'customer-demo', 'customer-three', 'missing'])('blocks all staff scheduling/intake actions for %s', (actor) => {
  expect(() => getIntakeOptions(actor)).toThrow(/lễ tân/); expect(() => listIntakeAppointments(actor)).toThrow(/lễ tân/);
  expect(() => createWalkIn(actor, walkIn())).toThrow(/lễ tân/); expect(() => saveReceptionAppointment(actor, booking())).toThrow(/lễ tân/);
  expect(() => confirmIntakeAppointment(actor, 'fake', {})).toThrow(/lễ tân/); expect(() => checkInAppointment(actor, 'fake', walkIn())).toThrow(/lễ tân/);
  expect(() => logContactFailure(actor, 'fake', 'x', 1)).toThrow(/lễ tân/); expect(() => noteLateArrival(actor, 'fake', 'x', 1)).toThrow(/lễ tân/);
  expect(() => assignDoctor(actor, 'fake', 'vet-demo', 1)).toThrow(/lễ tân/); expect(() => setIntakePostponed(actor, 'fake', true, 1)).toThrow(/lễ tân/);
  expect(() => closeReceptionAppointment(actor, 'fake', 'CANCELLED', 'Lý do', 1)).toThrow(/lễ tân/);
});

test('confirming an online request needs no doctor, keeps the slot and sends the advice; check-in is a separate step', () => {
  const pending = online();
  expect(() => checkInAppointment(RECEPTION, pending.id, walkIn({ expectedVersion: 1 }))).toThrow(/đã xác nhận/);
  expect(() => confirmIntakeAppointment(RECEPTION, pending.id, { expectedVersion: 9 })).toThrow(/vừa thay đổi/);
  const confirmed = confirmIntakeAppointment(RECEPTION, pending.id, { expectedVersion: 1, advice: 'Nhịn ăn 6 tiếng trước giờ hẹn nếu cần xét nghiệm máu.' });
  expect(confirmed).toMatchObject({ status: 'CONFIRMED', version: 2, confirmedBy: RECEPTION });
  expect(listNotifications('customer-demo').some((item) => /xác nhận/.test(item.title) && /Nhịn ăn 6 tiếng/.test(item.message))).toBe(true);
  const checked = checkInAppointment(RECEPTION, pending.id, walkIn({ expectedVersion: 2, status: 'COMPLETED', ownerId: 'customer-two', reason: 'Bé bỏ ăn từ sáng' }));
  expect(checked).toMatchObject({ status: 'CHECKED_IN', version: 3, ownerId: 'customer-demo', checkedInBy: RECEPTION, weightKg: 5.2, temperatureC: 38.6, assignedDoctorId: '', reason: 'Bé bỏ ăn từ sáng' });
  expect(listAppointments('customer-demo')[0].status).toBe('CHECKED_IN'); expect(listAppointments('customer-two')).toEqual([]);
  expect(JSON.stringify(listAppointments('customer-demo'))).not.toContain('Ghi chú nội bộ');
  expect(() => checkInAppointment(RECEPTION, pending.id, walkIn({ expectedVersion: 3 }))).toThrow(/đã xác nhận/);
  [MEDICAL_RECORDS_KEY, INVOICES_KEY].forEach((key) => expect(localStorage.getItem(key)).toBeNull());
});

test('check-in requires plausible weight and temperature', () => {
  const confirmed = confirmedToday();
  const attempt = (extra) => checkInAppointment(RECEPTION, confirmed.id, walkIn({ expectedVersion: 2, ...extra }));
  expect(() => attempt({ weightKg: '' })).toThrow(/kiểm tra/); expect(() => attempt({ temperatureC: '' })).toThrow(/kiểm tra/);
  expect(() => attempt({ weightKg: -3 })).toThrow(/kiểm tra/); expect(() => attempt({ temperatureC: 60 })).toThrow(/kiểm tra/); expect(() => attempt({ weightKg: 'abc' })).toThrow(/kiểm tra/);
  expect(Object.keys(validateVitals({ weightKg: 0, temperatureC: 20 }))).toEqual(['weightKg', 'temperatureC']);
  expect(validateVitals({ weightKg: '5,2', temperatureC: '38,5' })).toEqual({});
  expect(attempt({ weightKg: '5,25', temperatureC: '38,5' })).toMatchObject({ status: 'CHECKED_IN', weightKg: 5.25, temperatureC: 38.5 });
});

test('a failed phone contact keeps the request pending and counted; late notes only apply to confirmed visits', () => {
  const pending = online();
  expect(() => logContactFailure(RECEPTION, pending.id, '', 1)).toThrow(/ghi chú/);
  const tried = logContactFailure(RECEPTION, pending.id, 'Gọi 2 lần không nghe máy', 1);
  expect(tried).toMatchObject({ status: 'PENDING', contactAttempts: 1, contactNote: 'Gọi 2 lần không nghe máy', version: 2 });
  expect(logContactFailure(RECEPTION, pending.id, 'Gọi lần 3', 2).contactAttempts).toBe(2);
  expect(() => noteLateArrival(RECEPTION, pending.id, 'Khách đến muộn 15p', 3)).toThrow(/đã xác nhận/);
  const confirmed = confirmIntakeAppointment(RECEPTION, pending.id, { expectedVersion: 3 });
  expect(() => logContactFailure(RECEPTION, pending.id, 'x', confirmed.version)).toThrow(/chờ xác nhận/);
  expect(noteLateArrival(RECEPTION, pending.id, 'Khách đến muộn 15p', confirmed.version)).toMatchObject({ status: 'CONFIRMED', lateNote: 'Khách đến muộn 15p' });
});

test('rejecting a pending request records who cancelled and tells the customer why', () => {
  const pending = online();
  expect(() => closeReceptionAppointment(RECEPTION, pending.id, 'CANCELLED', '  ', 1)).toThrow(/lý do/);
  const rejected = closeReceptionAppointment(RECEPTION, pending.id, 'CANCELLED', 'Phòng khám bảo trì máy xét nghiệm', 1);
  expect(rejected).toMatchObject({ status: 'CANCELLED', cancelledBy: 'RECEPTION', cancellationReason: 'Phòng khám bảo trì máy xét nghiệm' });
  expect(Number.isFinite(Date.parse(rejected.cancelledAt))).toBe(true);
  expect(listNotifications('customer-demo').some((item) => /từ chối/.test(item.title) && /bảo trì máy xét nghiệm/.test(item.message))).toBe(true);
  expect(getSlotAvailability(RECEPTION, '2026-10-03').slots.find((slot) => slot.time === '10:00').booked).toBe(0);
});

test('walk-ins enter the shared queue unassigned; emergency is flagged; no accounts or clinical data are created', () => {
  expect(() => createWalkIn(RECEPTION, walkIn({ ownerId: 'customer-two' }))).toThrow(/thay đổi/);
  expect(() => createWalkIn(RECEPTION, walkIn({ serviceId: 'missing' }))).toThrow(/thay đổi/);
  expect(() => createWalkIn(RECEPTION, walkIn({ weightKg: '' }))).toThrow(/kiểm tra/);
  expect(() => createWalkIn(RECEPTION, walkIn({ reason: ' ' }))).toThrow(/kiểm tra/);
  const normal = createWalkIn(RECEPTION, walkIn({ source: 'ONLINE', status: 'COMPLETED' }));
  expect(normal).toMatchObject({ source: 'WALK_IN', status: 'CHECKED_IN', priority: 'NORMAL', estimatedPrice: 150000, assignedDoctorId: '', roomId: '', code: 'APT-20261003-001' });
  expect(() => createWalkIn(RECEPTION, walkIn({ petId: 'pet-bo-demo' }))).toThrow(/đã được tiếp nhận/);
  const emergency = createWalkIn(RECEPTION, walkIn({ petId: 'pet-bella-demo', emergency: true, reason: 'Co giật' }));
  expect(emergency).toMatchObject({ source: 'EMERGENCY', priority: 'PRIORITY', status: 'CHECKED_IN' });
  expect(localStorage.getItem(MEDICAL_RECORDS_KEY)).toBeNull(); expect(localStorage.getItem(INVOICES_KEY)).toBeNull();
});

test('quick-creating a new customer and pet during intake validates first and rejects a duplicate phone naming the owner', () => {
  const base = { serviceId: 'service-1', reason: 'Nôn ói', ...vitals };
  expect(() => createWalkIn(RECEPTION, { ...base, newCustomer: { ...NEW_CUSTOMER, fullName: '' }, newPet: NEW_PET })).toThrow(/khách hàng và thú cưng mới/);
  let duplicate; try { createWalkIn(RECEPTION, { ...base, newCustomer: { ...NEW_CUSTOMER, phone: '0902345678' }, newPet: NEW_PET }); } catch (problem) { duplicate = problem; }
  expect(duplicate.fieldErrors['newCustomer.phone']).toMatch(/Nguyễn Ngọc Lan/);
  expect(listReceptionCustomers(RECEPTION).some((item) => item.phone === '0988777666')).toBe(false);
  const record = createWalkIn(RECEPTION, { ...base, newCustomer: NEW_CUSTOMER, newPet: NEW_PET });
  const created = listReceptionCustomers(RECEPTION).find((item) => item.phone === '0988777666');
  expect(created).toMatchObject({ fullName: 'Hoàng Gia Bảo', source: 'WALK_IN' });
  expect(record).toMatchObject({ ownerId: created.id, petName: 'Lu', status: 'CHECKED_IN' });
  expect(listReceptionPets(RECEPTION).find((pet) => pet.id === record.petId)).toMatchObject({ ownerId: created.id, species: 'CAT', status: 'ACTIVE' });
  // Khách cũ + thú cưng mới nhanh
  const another = createWalkIn(RECEPTION, { ...base, ownerId: 'customer-two', newPet: { ...NEW_PET, name: 'Mít' } });
  expect(another).toMatchObject({ ownerId: 'customer-two', petName: 'Mít' });
});

test('staff bookings by phone/counter are confirmed at once, respect slot capacity and need a channel', () => {
  expect(() => saveReceptionAppointment(RECEPTION, booking({ source: '' }))).toThrow(/kiểm tra/);
  expect(() => saveReceptionAppointment(RECEPTION, booking({ source: 'ONLINE' }))).toThrow(/kiểm tra/);
  expect(() => saveReceptionAppointment(RECEPTION, booking({ time: '11:30' }))).toThrow(/kiểm tra/);
  expect(() => saveReceptionAppointment(RECEPTION, booking({ date: '2026-11-30' }))).toThrow(/kiểm tra/);
  const first = saveReceptionAppointment(RECEPTION, booking({ estimatedPrice: 1 }));
  expect(first).toMatchObject({ status: 'CONFIRMED', source: 'PHONE', estimatedPrice: 150000, code: 'APT-20261004-001', confirmedBy: RECEPTION });
  expect(() => saveReceptionAppointment(RECEPTION, booking({ source: 'COUNTER' }))).toThrow(/trong khung giờ/); // cùng bé, cùng khung
  const second = saveReceptionAppointment(RECEPTION, booking({ petId: 'pet-bella-demo', source: 'COUNTER' }));
  expect(second.source).toBe('COUNTER');
  const slot = getSlotAvailability(RECEPTION, '2026-10-04').slots.find((item) => item.time === '09:00');
  expect(slot).toMatchObject({ booked: 2, remaining: 0, full: true });
  expect(() => saveReceptionAppointment(RECEPTION, booking({ ownerId: 'customer-two', petId: undefined, newPet: NEW_PET }))).toThrow(/đã kín lịch/);
  // Khung đã bắt đầu vẫn chặn, nhưng khung còn lại trong ngày hôm nay dùng được cho lễ tân (không cần đệm 30 phút)
  jest.setSystemTime(new Date('2026-10-03T02:50:00Z')); // 09:50
  expect(saveReceptionAppointment(RECEPTION, booking({ date: '2026-10-03', time: '10:00', petId: 'pet-bella-demo' })).startsAt).toBe('2026-10-03T10:00:00+07:00');
  expect(() => saveReceptionAppointment(RECEPTION, booking({ date: '2026-10-03', time: '09:30' }))).toThrow(/kiểm tra/);
});

test('staff booking can create a brand-new customer and pet in one step', () => {
  const record = saveReceptionAppointment(RECEPTION, booking({ ownerId: '', petId: '', newCustomer: NEW_CUSTOMER, newPet: NEW_PET }));
  expect(record).toMatchObject({ status: 'CONFIRMED', petName: 'Lu', source: 'PHONE' });
  expect(listReceptionCustomers(RECEPTION).find((item) => item.id === record.ownerId).fullName).toBe('Hoàng Gia Bảo');
});

test('rescheduling keeps the status, frees the old slot, needs a reason and detects stale forms', () => {
  const first = saveReceptionAppointment(RECEPTION, booking());
  const target = { expectedVersion: 1, date: '2026-10-04', time: '10:00', reason: 'Khám theo hẹn', rescheduleReason: 'Khách nhờ dời' };
  expect(() => saveReceptionAppointment(RECEPTION, { ...target, rescheduleReason: '' }, first.id)).toThrow(/lý do đổi giờ/);
  expect(() => saveReceptionAppointment(RECEPTION, { ...target, expectedVersion: 7 }, first.id)).toThrow(/thay đổi/);
  const edited = saveReceptionAppointment(RECEPTION, { ...target, ownerId: 'customer-two', petId: 'foreign', estimatedPrice: 1 }, first.id);
  expect(edited).toMatchObject({ ownerId: 'customer-demo', petId: 'pet-bo-demo', estimatedPrice: 150000, version: 2, status: 'CONFIRMED', rescheduleReason: 'Khách nhờ dời', previousStartsAt: '2026-10-04T09:00:00+07:00' });
  const slots = getSlotAvailability(RECEPTION, '2026-10-04').slots;
  expect(slots.find((slot) => slot.time === '09:00').booked).toBe(0); expect(slots.find((slot) => slot.time === '10:00').booked).toBe(1);
  expect(listActivity('admin-default').some((item) => item.action === 'APPOINTMENT_RESCHEDULE')).toBe(true);
  const pending = online({ date: '2026-10-05', time: '14:00' });
  expect(saveReceptionAppointment(RECEPTION, { ...target, date: '2026-10-05', time: '14:30', expectedVersion: pending.version }, pending.id).status).toBe('PENDING');
});

test('cannot bypass an existing online visit with a walk-in; concurrent cancellation is respected', () => {
  const pending = online(); expect(() => createWalkIn(RECEPTION, walkIn())).toThrow(/lịch hẹn hôm nay/);
  expect(createWalkIn(RECEPTION, walkIn({ emergency: true })).source).toBe('EMERGENCY'); // cấp cứu luôn được nhận
  cancelAppointment('customer-demo', pending.id, 'Đổi kế hoạch', 1);
  expect(() => confirmIntakeAppointment(RECEPTION, pending.id, { expectedVersion: 1 })).toThrow(/vừa thay đổi/);
});

test('canonical account locks, archived pets and inactive services/doctors are checked at mutation time', () => {
  getIntakeOptions(RECEPTION); setPetStatus('customer-demo', 'pet-bo-demo', 'ARCHIVED');
  expect(() => createWalkIn(RECEPTION, walkIn())).toThrow(/thay đổi/); setPetStatus('customer-demo', 'pet-bo-demo', 'ACTIVE');
  updateUser('admin-default', 'vet-demo', { status: 'INACTIVE' });
  expect(() => createWalkIn(RECEPTION, walkIn({ assignedDoctorId: 'vet-demo' }))).toThrow(/không còn hoạt động/);
  expect(getIntakeOptions(RECEPTION).doctors.map((item) => item.id)).toEqual(['vet-two']);
  updateUser('admin-default', RECEPTION, { status: 'INACTIVE' }); expect(() => createWalkIn(RECEPTION, walkIn())).toThrow(/lễ tân/);
});

test('queue order: emergency, then on-time appointments by slot, then late/walk-in by arrival; postponed go last', () => {
  const early = confirmIntakeAppointment(RECEPTION, online({ time: '10:30' }).id, { expectedVersion: 1 });
  const onTime = confirmIntakeAppointment(RECEPTION, online({ petId: 'pet-bella-demo', time: '10:00' }).id, { expectedVersion: 1 });
  jest.setSystemTime(new Date('2026-10-03T03:00:00Z')); // 10:00
  const checkIn = (record, extra) => checkInAppointment(RECEPTION, record.id, walkIn({ expectedVersion: 2, ...extra }));
  const walk = createWalkIn(RECEPTION, walkIn({ ownerId: 'customer-two', petId: undefined, newPet: { ...NEW_PET, name: 'Mực' } }));
  jest.advanceTimersByTime(60000); checkIn(early); jest.advanceTimersByTime(60000); checkIn(onTime);
  jest.advanceTimersByTime(60000);
  const emergency = createWalkIn(RECEPTION, walkIn({ ownerId: 'customer-two', petId: undefined, newPet: { ...NEW_PET, name: 'Tom' }, emergency: true }));
  let rows = listIntakeAppointments(RECEPTION);
  expect(queueKind(rows.find((item) => item.id === emergency.id))).toBe('EMERGENCY'); expect(queueKind(rows.find((item) => item.id === walk.id))).toBe('WALK_IN');
  expect(sortIntakeQueue(rows.filter((item) => item.status === 'CHECKED_IN')).map((item) => item.id)).toEqual([emergency.id, onTime.id, early.id, walk.id]);
  const postponed = setIntakePostponed(RECEPTION, onTime.id, true, rows.find((item) => item.id === onTime.id).version);
  expect(postponed.postponedAt).toBeTruthy();
  rows = listIntakeAppointments(RECEPTION);
  expect(waitingQueue(rows).map((item) => item.id)).toEqual([emergency.id, early.id, walk.id, onTime.id]);
  expect(() => setIntakePostponed(RECEPTION, emergency.id, true, emergency.version)).toThrow(/cấp cứu/);
  expect(setIntakePostponed(RECEPTION, onTime.id, false, postponed.version).postponedAt).toBe('');
  expect(waitMinutes(walk.checkedInAt)).toBe(3);
});

test('a late scheduled arrival drops to the walk-in level', () => {
  const confirmed = confirmIntakeAppointment(RECEPTION, online({ time: '10:00' }).id, { expectedVersion: 1 });
  jest.setSystemTime(new Date('2026-10-03T03:31:00Z')); // 10:31, quá khung 10:00 hơn 30 phút
  const lateOne = checkInAppointment(RECEPTION, confirmed.id, walkIn({ expectedVersion: 2 }));
  expect(queueKind(lateOne)).toBe('LATE');
});

test('assigning a doctor sends the patient to the fixed room, re-checks availability and allows changing before the exam starts', () => {
  const first = createWalkIn(RECEPTION, walkIn()); const second = createWalkIn(RECEPTION, walkIn({ petId: 'pet-bella-demo' }));
  expect(() => assignDoctor(RECEPTION, first.id, 'admin-default', 1)).toThrow(/không còn hoạt động/);
  expect(() => assignDoctor(RECEPTION, first.id, 'vet-demo', 9)).toThrow(/vừa thay đổi/);
  const assigned = assignDoctor(RECEPTION, first.id, 'vet-demo', 1);
  expect(assigned).toMatchObject({ assignedDoctorId: 'vet-demo', roomId: 'P01', roomName: 'Phòng P01', status: 'CHECKED_IN', version: 2 });
  expect(listNotifications('customer-demo').some((item) => /Phòng P01/.test(item.title))).toBe(true);
  expect(() => assignDoctor(RECEPTION, second.id, 'vet-demo', 1)).toThrow(/đã nhận ca khám khác/);
  expect(() => assignDoctor(RECEPTION, first.id, 'vet-demo', 2)).toThrow(/đã được phân công/);
  const changed = assignDoctor(RECEPTION, first.id, 'vet-two', 2);
  expect(changed).toMatchObject({ assignedDoctorId: 'vet-two', roomName: 'Phòng P02' });
  expect(assignDoctor(RECEPTION, second.id, 'vet-demo', 1).roomName).toBe('Phòng P01');
  const rows = listIntakeAppointments(RECEPTION);
  expect(getDoctorStatus('vet-demo', rows)).toMatchObject({ key: 'ASSIGNED' }); expect(waitingQueue(rows)).toEqual([]);
  expect(listActivity('admin-default').some((item) => item.action === 'APPOINTMENT_ASSIGN')).toBe(true);
});

test('a doctor in an exam is busy and cannot be assigned; a doctor without a room cannot be assigned', () => {
  const first = createWalkIn(RECEPTION, walkIn({ assignedDoctorId: 'vet-demo' }));
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)).map((item) => (item.id === first.id ? { ...item, status: 'IN_PROGRESS', startedAt: new Date().toISOString() } : item))));
  jest.advanceTimersByTime(10 * 60000);
  expect(getDoctorStatus('vet-demo', listIntakeAppointments(RECEPTION))).toMatchObject({ key: 'BUSY', estimatedMinutes: 20 });
  const waiting = createWalkIn(RECEPTION, walkIn({ petId: 'pet-bella-demo' }));
  expect(() => assignDoctor(RECEPTION, waiting.id, 'vet-demo', 1)).toThrow(/đã nhận ca khám khác/);
  localStorage.setItem('pawcare_users_v1', JSON.stringify(JSON.parse(localStorage.getItem('pawcare_users_v1')).map((user) => (user.id === 'vet-two' ? { ...user, roomNumber: '' } : user))));
  expect(() => assignDoctor(RECEPTION, waiting.id, 'vet-two', 1)).toThrow(/phòng khám cố định/);
  expect(() => assignDoctor(RECEPTION, first.id, 'vet-two', 1)).toThrow(/chưa bắt đầu/);
});

test('cancelling an intake from the queue needs a reason and releases the pet', () => {
  const first = createWalkIn(RECEPTION, walkIn()); jest.advanceTimersByTime(60000);
  const cancelled = closeReceptionAppointment(RECEPTION, first.id, 'CANCELLED', 'Khách bỏ về', 1);
  expect(cancelled).toMatchObject({ status: 'CANCELLED', cancelledBy: 'RECEPTION' }); expect(() => closeReceptionAppointment(RECEPTION, first.id, 'COMPLETED', 'Invalid', 2)).toThrow(/không hợp lệ/);
  expect(createWalkIn(RECEPTION, walkIn()).status).toBe('CHECKED_IN');
});

test('no-show requires confirmed status, a reason, revision and a 30-minute grace period; repeated no-shows are counted', () => {
  const appointment = saveReceptionAppointment(RECEPTION, booking());
  expect(() => closeReceptionAppointment(RECEPTION, appointment.id, 'NO_SHOW', 'Không đến', 1)).toThrow(/không hợp lệ/);
  jest.setSystemTime(new Date('2026-10-04T02:30:00Z'));
  expect(() => closeReceptionAppointment(RECEPTION, appointment.id, 'NO_SHOW', '', 1)).toThrow(/lý do/);
  expect(closeReceptionAppointment(RECEPTION, appointment.id, 'NO_SHOW', 'Không liên hệ được', 1).status).toBe('NO_SHOW');
  expect(countNoShows(listIntakeAppointments(RECEPTION), 'customer-demo')).toBe(1);
  expect(getSlotAvailability(RECEPTION, '2026-10-04').slots.find((slot) => slot.time === '09:00').booked).toBe(0);
});

test('storage corruption and quota errors never overwrite or report success, audit excludes notes', () => {
  localStorage.setItem(APPOINTMENTS_KEY, '{bad'); expect(() => listIntakeAppointments(RECEPTION)).toThrow(/không hợp lệ/); expect(localStorage.getItem(APPOINTMENTS_KEY)).toBe('{bad');
  localStorage.removeItem(APPOINTMENTS_KEY); getIntakeOptions(RECEPTION);
  const setter = Storage.prototype.setItem; const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function write(key, data) { if (key === APPOINTMENTS_KEY) throw new Error('quota'); return setter.call(this, key, data); });
  expect(() => createWalkIn(RECEPTION, walkIn())).toThrow(/Không lưu/); spy.mockRestore();
  createWalkIn(RECEPTION, walkIn()); const events = listActivity('admin-default'); expect(events.some((item) => item.action === 'APPOINTMENT_WALK_IN' && item.actorId === RECEPTION)).toBe(true);
  expect(JSON.stringify(events)).not.toMatch(/Lý do riêng|Ghi chú nội bộ/);
});
