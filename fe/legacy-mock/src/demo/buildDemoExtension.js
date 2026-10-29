import { clinicToday, MEDICINE_UNITS } from '../catalog/catalogPolicy';
import { EMPTY_EXAM } from '../examinations/examinationPolicy';
import { AUDIT_ACTIONS } from '../activity/auditStorage';
import { DEMO_NOTICE } from './demoConfig';
import { isBillableItem } from '../invoices/invoicePolicy';

// Append-only v2: source identities/names/prices reflect the existing, possibly edited v1 stores.
export function buildDemoExtension(source, admin, now = new Date()) {
  const today = clinicToday(now);
  const date = (days) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  const at = (days, time = '13:30') => `${date(days)}T${time}:00+07:00`;
  const requireItem = (items, id, label) => { const item = items.find((row) => row.id === id); if (!item) throw new Error(`Thiếu ${label} của bộ demo cũ. Không tự tạo lại hoặc ghi đè; kiểm tra dữ liệu trước khi bổ sung.`); return item; };
  const alias = (id) => source.aliases?.[id] || id; // tài khoản gốc đã nhận dữ liệu của nhân vật demo
  const vet = requireItem(source.users, alias('demo-v1-vet-1'), 'bác sĩ'); const reception = requireItem(source.users, alias('demo-v1-reception-1'), 'lễ tân');
  if (vet.role !== 'VETERINARIAN' || reception.role !== 'RECEPTIONIST') throw new Error('Vai trò tài khoản demo đã thay đổi. Không ghép thêm hồ sơ sai quyền.');
  const exam = requireItem(source.services, 'demo-v1-service-1', 'dịch vụ khám');
  const room = requireItem(source.rooms, 'demo-v1-room-1', 'phòng khám');
  const cases = [
    ['Khám định kỳ', 'Chủ nuôi đề nghị kiểm tra định kỳ và đối chiếu cân nặng.', 'Hồ sơ kiểm tra định kỳ minh họa', [1], [1, 2]],
    ['Theo dõi da', 'Chủ nuôi ghi nhận bé gãi và muốn kiểm tra da.', 'Theo dõi biểu hiện ngoài da — tình huống giả', [2, 3], [1]],
    ['Theo dõi tiêu hóa', 'Chủ nuôi muốn trao đổi về thay đổi ăn uống.', 'Hồ sơ theo dõi tiêu hóa minh họa', [2, 4], [2, 3]],
    ['Kiểm tra vận động', 'Chủ nuôi đề nghị kiểm tra khả năng vận động.', 'Hồ sơ kiểm tra vận động minh họa', [3], []],
    ['Khám lại', 'Đối chiếu kết quả của lần khám trước.', 'Hồ sơ tái khám minh họa', [1, 2], [1, 3]],
    ['Đối chiếu lịch tiêm', 'Kiểm tra thông tin lịch tiêm do phòng khám cung cấp.', 'Hồ sơ đối chiếu lịch tiêm — chưa xác nhận tiêm mới', [4], []],
  ];
  const result = { users: [], customers: [], pets: [], services: [], inventory: { medicines: [], batches: [] }, rooms: [], appointments: [], visits: [], invoices: [], vaccinations: [], notifications: [], audit: [], staff: [] };
  source.users.filter((item) => (item.demo || Object.values(source.aliases || {}).includes(item.id)) && ['VETERINARIAN', 'RECEPTIONIST'].includes(item.role)).forEach((user, i) => result.staff.push({ id: `demo-v2-staff-${user.id}`, userId: user.id, demo: true,
    specialty: user.role === 'VETERINARIAN' ? ['Khám tổng quát (demo)', 'Chẩn đoán hình ảnh (demo)', 'Theo dõi ngoại trú (demo)', 'Khám định kỳ (demo)'][i % 4] : 'Tiếp nhận & thanh toán (demo)',
    qualification: user.role === 'VETERINARIAN' ? 'Chứng nhận chuyên môn minh họa, không có giá trị hành nghề' : 'Đào tạo nghiệp vụ lễ tân minh họa',
    experienceYears: i + 1, joinedDate: date(-365 - i * 30), shiftNote: i % 2 ? 'Ca chiều minh họa — chưa phải lịch phân công' : 'Ca sáng minh họa — chưa phải lịch phân công' }));
  cases.forEach(([label, symptoms, diagnosis, serviceNumbers, medicineNumbers], i) => {
    const pet = requireItem(source.pets, `demo-v1-pet-${i % 2 + 1}`, 'thú cưng');
    const owner = requireItem(source.users, pet.ownerId, 'chủ nuôi'); if (owner.role !== 'CUSTOMER') throw new Error('Chủ nuôi demo không còn là khách hàng.');
    const stamp = at(-1 - i, i % 2 ? '15:00' : '13:30'); const id = `demo-v2-record-${i + 1}`;
    const appointment = { id: `demo-v2-appointment-${i + 1}`, code: `APT-DEMO2-${i + 1}`, demo: true, ownerId: owner.id, petId: pet.id, petName: pet.name,
      serviceId: exam.id, serviceName: exam.name, estimatedPrice: exam.price, reason: `${label} cho ${pet.name} (demo)`, startsAt: stamp, status: 'COMPLETED', source: i % 2 ? 'WALK_IN' : 'ONLINE', priority: 'NORMAL',
      assignedDoctorId: vet.id, assignedDoctorName: vet.fullName, roomId: room.id, roomName: room.name, preferredDoctorId: '', preferredDoctorName: '',
      confirmedAt: stamp, checkedInAt: stamp, startedAt: stamp, completedAt: stamp, createdAt: at(-2 - i), updatedAt: stamp, intakeNote: 'Đối chiếu dữ liệu bổ sung (demo)', version: 1 };
    const selected = serviceNumbers.map((number) => requireItem(source.services, `demo-v1-service-${number + 1}`, 'dịch vụ chỉ định'));
    const serviceOrders = selected.map((service, index) => ({ id: `${id}-order-${index + 1}`, serviceId: service.id, name: service.name, serviceType: service.serviceType, requiresResult: service.requiresResult,
      quantity: index + 1, unitPrice: service.price, notes: `${label}: chỉ định minh họa ${index + 1}. ${DEMO_NOTICE}`, status: i === 3 ? 'CANCELLED' : index === 1 && i === 2 ? 'ORDERED' : 'COMPLETED', orderedAt: stamp, doctorId: vet.id, doctorName: vet.fullName }));
    const prescriptions = medicineNumbers.map((number, index) => {
      const medicine = requireItem(source.inventory.medicines, `demo-v1-medicine-${number}`, 'thuốc');
      return { id: `${id}-rx-${index + 1}`, medicineId: medicine.id, medicineName: medicine.name, unit: MEDICINE_UNITS[medicine.unit], quantity: index + 2, unitPrice: medicine.salePrice,
        dosage: `${label}: thông số liều minh họa, không áp dụng thực tế`, frequency: `Tần suất do bác sĩ nhập — mẫu ${i + 1}`, duration: `Thời gian minh họa ${i + 1}`, instructions: DEMO_NOTICE };
    });
    const billableItems = [{ id: `${id}-exam`, type: 'SERVICE', name: exam.name, quantity: 1, unit: 'Lượt', unitPrice: exam.price, fulfillmentStatus: 'COMPLETED' },
      ...serviceOrders.map((order) => ({ id: order.id, type: 'SERVICE', name: order.name, quantity: order.quantity, unit: 'Lượt', unitPrice: order.unitPrice, fulfillmentStatus: order.status }))];
    // Historical fake dispensing is explicit; ORDERED medicines are excluded by the shared invoice reader.
    prescriptions.forEach((rx, index) => { const medicine = source.inventory.medicines.find((item) => item.id === rx.medicineId); billableItems.push({ id: rx.id, type: 'MEDICINE', name: rx.medicineName, quantity: rx.quantity, unit: rx.unit, unitPrice: medicine.salePrice, fulfillmentStatus: i === 2 || index > 0 ? 'ORDERED' : 'DISPENSED' }); });
    const record = { ...EMPTY_EXAM, id, demo: true, ownerId: owner.id, petId: pet.id, appointmentId: appointment.id, doctorId: vet.id, doctorName: vet.fullName,
      status: 'COMPLETED', startedAt: stamp, examinedAt: stamp, completedAt: stamp, updatedAt: stamp, createdAt: stamp, version: 1, reason: appointment.reason, symptoms: `${symptoms} (demo)`, examination: `${label}: nội dung quan sát mẫu.`, preliminaryAssessment: `${label}: đánh giá sơ bộ giả.`,
      diagnosis: `${diagnosis}. Không sử dụng để điều trị.`, treatmentPlan: `Kế hoạch minh họa của ca ${label.toLowerCase()}.`, recommendations: DEMO_NOTICE, doctorOnlyNotes: 'GHI_CHU_NOI_BO_DEMO_V2',
      weight: Number((Number(pet.weight || 4) + i * 0.1).toFixed(2)), temperature: 38.4, heartRate: 90 + i, respiratoryRate: 20 + i, followUpDate: date(i + 1), prescriptions, serviceOrders,
      results: serviceOrders.filter((order) => order.status === 'COMPLETED' && order.requiresResult).map((order) => ({ id: `${order.id}-result`, name: `${order.name} — ca ${label}`, result: `Nội dung kết quả mẫu ${i + 1}. ${DEMO_NOTICE}` })), billableItems };
    result.appointments.push(appointment); result.visits.push(record);
    if (i === 5) return; // A new unbilled candidate for reception.
    const items = billableItems.filter(isBillableItem);
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const payment = (type, amount, suffix) => ({ id: `${id}-${suffix}`, type, amount, method: ['CASH', 'TRANSFER', 'CARD', 'OTHER'][i % 4], status: 'COMPLETED', paidAt: stamp, demo: true });
    const payments = i === 0 || total === 0 ? [] : [payment('PAYMENT', i === 1 ? Math.max(1, Math.floor(total / 2)) : total, 'payment')];
    if ((i === 3 || i === 4) && payments.length) payments.push(payment('REFUND', total, 'refund'));
    result.invoices.push({ id: `demo-v2-invoice-${i + 1}`, code: `INV-DEMO2-${i + 1}`, ownerId: owner.id, petId: pet.id, visitId: id, demo: true, status: i === 4 ? 'CANCELLED' : 'ISSUED', issuedAt: stamp, updatedAt: stamp, version: 1, issuedBy: reception.id, items: billableItems, payments });
  });
  const pet = source.pets.find((item) => item.id === 'demo-v1-pet-1');
  [1, 10].forEach((days, i) => result.vaccinations.push({ id: `demo-v2-vax-${i + 1}`, demo: true, ownerId: pet.ownerId, petId: pet.id, vaccineName: `Lịch tiêm theo dõi bổ sung ${i + 1} (demo)`, doseLabel: 'Mũi dự kiến minh họa', dueDate: date(days), status: 'PLANNED', doctorName: vet.fullName, clinicName: 'PawCare (demo)', customerNotes: DEMO_NOTICE }));
  const notify = (kind, entity, title, message) => result.notifications.push({ id: `demo-v2-notification-${result.notifications.length + 1}`, demo: true, ownerId: entity.ownerId, petId: entity.petId, kind, entityId: entity.id, title, message: `${message} Dữ liệu giả để kiểm thử.`, createdAt: now.toISOString(), readAt: '' });
  result.visits.forEach((record) => { notify('MEDICAL_RECORD', record, 'Kết quả khám bổ sung đã có', record.diagnosis); notify('FOLLOW_UP', record, 'Nhắc ngày tái khám dự kiến', `Đề nghị tái khám ${record.followUpDate}; chưa phải lịch hẹn đã đặt.`); });
  result.invoices.forEach((invoice) => notify('INVOICE', invoice, 'Cập nhật hóa đơn demo', `Xem hóa đơn ${invoice.code} và lịch sử thanh toán/hoàn tiền.`));
  result.vaccinations.forEach((vax) => notify('VACCINATION', vax, 'Lịch tiêm sắp đến (demo)', `Ngày dự kiến ${vax.dueDate}; không xác nhận đã tiêm.`));
  const targets = { AUTH: admin, USERS: vet, CUSTOMERS: source.customers[0] || source.users.find((item) => item.role === 'CUSTOMER'), SERVICES: exam, MEDICINES: source.inventory.medicines[0], LAB_CONFIG: { id: 'lab-item-1' }, PETS: pet, APPOINTMENTS: result.appointments[0], BILLING: result.invoices[0], EXAMINATIONS: result.visits[0] };
  const groups = { AUTH: ['LOGIN', 'LOGOUT', 'REGISTER', 'PROFILE_UPDATE'], USERS: ['USER_CREATE', 'USER_UPDATE', 'USER_STATUS'], CUSTOMERS: ['CUSTOMER_CREATE', 'CUSTOMER_UPDATE'], SERVICES: ['SERVICE_CREATE', 'SERVICE_UPDATE', 'SERVICE_STATUS'], MEDICINES: ['MEDICINE_CREATE', 'MEDICINE_UPDATE', 'MEDICINE_STATUS', 'BATCH_IMPORT', 'STOCK_ADJUST'], LAB_CONFIG: ['LAB_ITEM_CREATE', 'LAB_ITEM_UPDATE'], PETS: ['PET_CREATE', 'PET_UPDATE', 'PET_ARCHIVE', 'PET_RESTORE'],
    APPOINTMENTS: ['APPOINTMENT_CREATE', 'APPOINTMENT_CANCEL', 'APPOINTMENT_CONFIRM', 'APPOINTMENT_CHECK_IN', 'APPOINTMENT_WALK_IN', 'APPOINTMENT_STAFF_CREATE', 'APPOINTMENT_RESCHEDULE', 'APPOINTMENT_NO_SHOW', 'APPOINTMENT_CONTACT_NOTE', 'APPOINTMENT_ASSIGN', 'APPOINTMENT_POSTPONE'], BILLING: ['INVOICE_ISSUE', 'INVOICE_DISCOUNT', 'PAYMENT_RECORD', 'MEDICINE_DISPENSE'], EXAMINATIONS: ['EXAMINATION_START', 'EXAMINATION_SAVE', 'EXAMINATION_COMPLETE', 'PRESCRIPTION_SAVE', 'SERVICE_ORDER_SAVE', 'VISIT_SEND_ROOMS', 'VISIT_RECALL', 'VISIT_CANCEL', 'VISIT_CLOSE', 'ROOM_RESULT', 'ROOM_QUEUE'] };
  Object.entries(groups).forEach(([module, actions]) => actions.forEach((action, index) => {
    const actor = ['USERS', 'SERVICES', 'MEDICINES', 'LAB_CONFIG'].includes(module) ? admin : module === 'EXAMINATIONS' ? vet : module === 'AUTH' || action === 'APPOINTMENT_CREATE' ? source.users.find((item) => item.id === pet.ownerId) : reception;
    const target = targets[module]; result.audit.push({ id: `demo-v2-audit-${action.toLowerCase()}`, demo: true, actorId: actor.id, actorName: actor.fullName, actorRole: actor.role,
      module, action, targetId: target.id, targetName: `${AUDIT_ACTIONS[action]} — tình huống [DEMO V2]`, fields: [], createdAt: at(-1 - index, '17:00') });
  }));
  return result;
}
