import { clinicToday, SERVICE_TYPES, MEDICINE_UNITS } from '../catalog/catalogPolicy';
import { EMPTY_PET } from '../pets/petPolicy';
import { EMPTY_EXAM } from '../examinations/examinationPolicy';
import { DEMO_PASSWORD, DEMO_NOTICE } from './demoConfig';

// Deterministic, linked fixture factory. Pages never import fixture data.
export function buildDemoDataset(now = new Date(), admin = { id: 'admin-default', fullName: 'Quản trị viên PawCare (demo)', role: 'ADMIN' }) {
  const today = clinicToday(now);
  const date = (days) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  const at = (days, time = '09:00') => `${date(days)}T${time}:00+07:00`;
  const stamp = now.toISOString();
  const recent = new Date(Math.max(Date.parse(`${today}T00:00:00+07:00`), now.getTime() - 60000)).toISOString();
  const base = { demo: true, createdAt: at(-28), updatedAt: stamp };
  const customerNames = ['Nguyễn An Nhiên (demo)', 'Trần Hoàng Minh (demo)', 'Lê Thảo Vy (demo)', 'Phạm Gia Huy (demo)', 'Võ Ngọc Hà (demo)', 'Đặng Tuấn Anh (demo)', 'Bùi Khánh Linh (demo)', 'Đỗ Minh Châu (demo)'];
  const users = customerNames.map((fullName, i) => ({ ...base, id: `demo-v1-customer-${i + 1}`, fullName,
    email: i === 0 ? 'demo.customer@pawcare.vn' : `demo.customer${i + 1}@pawcare.vn`, phone: `09990000${String(i + 1).padStart(2, '0')}`,
    password: DEMO_PASSWORD, role: 'CUSTOMER', status: i === 7 ? 'INACTIVE' : 'ACTIVE', address: `${i + 10} Đường Mẫu, TP. Hồ Chí Minh`, birthDate: '1998-06-15', gender: i % 2 ? 'MALE' : 'FEMALE', receiveAppointmentReminders: true, receiveHealthTips: true, createdAt: at(-27 + i) }));
  ['Hoàng Minh Đức (demo)', 'Nguyễn Thùy Dương (demo)', 'Lê Quang Huy (demo)', 'Trần Bảo An (demo)'].forEach((fullName, i) => users.push({ ...base, id: `demo-v1-vet-${i + 1}`, fullName, email: i ? `demo.vet${i + 1}@pawcare.vn` : 'demo.vet@pawcare.vn', phone: `09990001${String(i + 1).padStart(2, '0')}`, password: DEMO_PASSWORD, role: 'VETERINARIAN', roomNumber: `P0${i + 3}`, status: 'ACTIVE' }));
  ['Lê Minh Thư (demo)', 'Phan Thu Ngân (demo)'].forEach((fullName, i) => users.push({ ...base, id: `demo-v1-reception-${i + 1}`, fullName, email: i ? 'demo.reception2@pawcare.vn' : 'demo.reception@pawcare.vn', phone: `09990002${String(i + 1).padStart(2, '0')}`, password: DEMO_PASSWORD, role: 'RECEPTIONIST', status: i ? 'INACTIVE' : 'ACTIVE' }));
  const customers = [{ ...base, id: 'walkin-demo-v1-1', fullName: 'Khách trực tiếp Hồng Phúc (demo)', phone: '0999000301', email: '', address: 'Địa chỉ minh họa tại TP. Hồ Chí Minh', version: 1 }];
  const names = ['Milo', 'Luna', 'Bông', 'Lucky', 'Miu', 'Coco', 'Bắp', 'Simba', 'Thỏ Mây', 'Chíp', 'Đậu', 'Nâu'];
  const species = ['DOG', 'CAT', 'DOG', 'DOG', 'CAT', 'CAT', 'DOG', 'CAT', 'RABBIT', 'BIRD', 'CAT', 'DOG'];
  const owners = [0, 0, 1, 1, 2, 3, 4, 5, 6, 6, 7, -1];
  const weights = [6.5, 3.8, 9.2, 12.1, 4.2, 3.5, 7.6, 5.1, 1.8, 0.15, 4, 8.5];
  const pets = names.map((name, i) => ({ ...EMPTY_PET, ...base, id: `demo-v1-pet-${i + 1}`, ownerId: owners[i] < 0 ? customers[0].id : users[owners[i]].id,
    name, species: species[i], breed: species[i] === 'DOG' ? 'Poodle / lai (demo)' : species[i] === 'CAT' ? 'Mèo nhà (demo)' : 'Giống minh họa',
    gender: i % 2 ? 'FEMALE' : 'MALE', birthDate: date(-500 - i * 30), weight: weights[i], color: i % 2 ? 'Trắng / xám' : 'Nâu vàng',
    microchip: `DEMO-CHIP-${String(i + 1).padStart(3, '0')}`, neutered: i % 3 === 0, allergies: i === 0 ? 'Thông tin dị ứng mẫu do chủ nuôi khai báo — cần đối chiếu trước khi khám.' : '',
    photo: i === 0 ? '/images/landing/pet-daisy.jpg' : '', notes: DEMO_NOTICE, status: i === 10 ? 'ARCHIVED' : 'ACTIVE', version: 1 }));
  const serviceNames = ['Khám tổng quát', 'Công tiêm vaccine', 'Công tẩy giun', 'Trị ve rận', 'Truyền dịch', 'Xét nghiệm máu CBC', 'Siêu âm ổ bụng', 'Phẫu thuật nhỏ', 'Thay băng vết thương'];
  const prices = [150000, 50000, 30000, 60000, 120000, 250000, 300000, 700000, 80000];
  const services = Object.keys(SERVICE_TYPES).map((serviceType, i) => ({ ...base, id: `demo-v1-service-${i + 1}`, code: `DEMO-DV${i + 1}`, name: `${serviceNames[i]} (demo)`, serviceType,
    price: prices[i], description: DEMO_NOTICE, status: i === 8 ? 'INACTIVE' : 'ACTIVE', requiresResult: ['LABORATORY', 'IMAGING'].includes(serviceType), allowsAttachment: serviceType === 'IMAGING' }));
  const labService = services.find((service) => service.serviceType === 'LABORATORY');
  const medicineRows = [['Vitamin bổ sung', 'SUPPLEMENT', 'TABLET', 10000, 30], ['Men vi sinh', 'SUPPLEMENT', 'SACHET', 18000, 25], ['Dung dịch chăm sóc', 'OTHER', 'BOTTLE', 60000, 10], ['Vaccine mẫu', 'VACCINE', 'DOSE', 280000, 10], ['Thuốc ký sinh trùng mẫu', 'ANTIPARASITIC', 'TABLET', 45000, 20], ['Gel chăm sóc mẫu', 'OTHER', 'TUBE', 95000, 10], ['Thuốc kháng sinh mẫu', 'ANTIBIOTIC', 'TABLET', 8000, 20]];
  const medicines = medicineRows.map(([name, category, unit, salePrice, minStockLevel], i) => ({ ...base, id: `demo-v1-medicine-${i + 1}`, code: `DEMO-TH${i + 1}`, name: `${name} (demo)`, category, unit, salePrice, minStockLevel, status: i === 5 ? 'INACTIVE' : 'ACTIVE', description: DEMO_NOTICE }));
  const batches = medicines.map((medicine, i) => ({ id: `demo-v1-batch-${i + 1}`, demo: true, medicineId: medicine.id, batchNo: `DEMO-LOT-${i + 1}`, quantity: 100, remaining: [80, 8, 40, 20, 5, 0, 50][i], expiry: date(i === 2 ? -5 : i === 3 ? 12 : 180), importPrice: Math.round(medicine.salePrice * 0.6), importedAt: at(-20 + i) }));
  const rooms = Array.from({ length: 4 }, (_, i) => ({ id: `demo-v1-room-${i + 1}`, name: `Phòng mẫu ${i + 1} (demo)`, status: 'ACTIVE', demo: true }));
  const appointments = []; const visits = []; const invoices = []; const vaccinations = []; const notifications = []; const audit = [];
  const doctors = users.filter((item) => item.role === 'VETERINARIAN'); const receptionist = users.find((item) => item.id === 'demo-v1-reception-1');
  // waiting = khách vãng lai đã check-in nhưng chưa được lễ tân phân công bác sĩ (nằm trong hàng đợi chung).
  const appointment = (petIndex, status, days, time, doctorIndex = 0, waiting = false) => {
    const pet = pets[petIndex]; const doctor = doctors[doctorIndex]; const room = rooms[doctorIndex]; const number = appointments.length + 1;
    const inClinic = ['CHECKED_IN', 'IN_PROGRESS', 'WAITING_RESULTS', 'RESULTS_READY', 'WAITING_PAYMENT', 'COMPLETED'].includes(status);
    const started = days < 0 ? at(days, time) : recent;
    const createdAt = at(Math.min(-1, days - 2), '08:00');
    const record = { ...base, id: `demo-v1-appointment-${number}`, code: `APT-DEMO-${String(number).padStart(3, '0')}`, ownerId: pet.ownerId, petId: pet.id, petName: pet.name,
      serviceId: services[0].id, serviceName: services[0].name, estimatedPrice: services[0].price, reason: `Khám và đối chiếu hồ sơ của ${pet.name} — tình huống demo`,
      startsAt: at(days, time), status, source: petIndex === 11 ? 'WALK_IN' : 'ONLINE', priority: petIndex === 0 ? 'PRIORITY' : 'NORMAL', version: 1,
      createdAt, updatedAt: inClinic ? started : createdAt, preferredDoctorId: '', preferredDoctorName: '',
      assignedDoctorId: status === 'PENDING' || waiting ? '' : doctor.id, assignedDoctorName: status === 'PENDING' || waiting ? '' : doctor.fullName,
      roomId: status === 'PENDING' || waiting ? '' : room.id, roomName: status === 'PENDING' || waiting ? '' : room.name, confirmedAt: status === 'PENDING' ? '' : createdAt,
      ...(inClinic ? { weightKg: 4.8 + petIndex / 10, temperatureC: 38.4 } : {}),
      checkedInAt: inClinic ? started : '', intakeNote: 'Đã đối chiếu hồ sơ — dữ liệu demo', ...(status === 'CANCELLED' ? { cancellationReason: 'Chủ nuôi đổi kế hoạch (demo)', cancelledAt: createdAt } : {}),
      ...(['IN_PROGRESS', 'WAITING_RESULTS', 'RESULTS_READY', 'WAITING_PAYMENT', 'COMPLETED'].includes(status) ? { startedAt: started, phase: 1 } : {}), ...(['COMPLETED', 'WAITING_PAYMENT'].includes(status) ? { completedAt: started } : {}),
      ...(['WAITING_RESULTS', 'RESULTS_READY'].includes(status) ? { sentToRoomsAt: started } : {}), ...(status === 'RESULTS_READY' ? { resultsReadyAt: recent, callbackPostponed: false } : {}) };
    appointments.push(record); return record;
  };
  // dispensed = đơn thuốc đã được lễ tân xuất kho sau khi thanh toán; ngược lại thuốc vẫn ở trạng thái ORDERED (đã tính tiền, chờ phát).
  const visit = (appt, weight, completed, dispensed = false) => {
    const id = `demo-v1-record-${visits.length + 1}`; const doctor = doctors.find((item) => item.id === appt.assignedDoctorId);
    const order = { id: `${id}-order`, serviceId: labService.id, name: labService.name, serviceType: labService.serviceType, unitPrice: labService.price, quantity: 1, labItemIds: ['lab-item-1', 'lab-item-2', 'lab-item-3', 'lab-item-4', 'lab-item-5'],
      notes: 'Chỉ định mẫu để kiểm tra giao diện; không áp dụng thực tế.', status: completed ? 'COMPLETED' : 'ORDERED', requiresResult: true, orderedAt: appt.startedAt, doctorId: doctor.id, doctorName: doctor.fullName };
    const rxLine = (suffix, medicine, quantity, dosage, frequency, duration) => ({ id: `${id}-${suffix}`, medicineId: medicine.id, medicineName: medicine.name, quantity, unit: MEDICINE_UNITS[medicine.unit], unitPrice: medicine.salePrice,
      dosage, frequency, duration, instructions: DEMO_NOTICE, ...(dispensed ? { dispensedAt: appt.completedAt, dispensedBy: receptionist.id } : {}) });
    const rx = rxLine('rx', medicines[0], 2, 'Liều minh họa — không áp dụng thực tế', 'Ngày 2 lần, sau ăn', '5 ngày');
    // Ca đã chốt kê thêm một thuốc nữa để hóa đơn và phiếu phát thuốc có nhiều dòng.
    const prescriptions = completed ? [rx, rxLine('rx2', medicines[6], 6, 'Liều minh họa — không áp dụng thực tế', 'Ngày 2 lần', '3 ngày')] : [rx];
    const billableItems = completed ? [{ id: `${id}-exam`, type: 'SERVICE', name: appt.serviceName, quantity: 1, unit: 'Lượt', unitPrice: appt.estimatedPrice, fulfillmentStatus: 'COMPLETED' },
      { id: `${id}-lab`, type: 'SERVICE', name: labService.name, quantity: 1, unit: 'Lượt', unitPrice: labService.price, fulfillmentStatus: 'COMPLETED' },
      ...prescriptions.map((line) => ({ id: line.id, type: 'MEDICINE', name: line.medicineName, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice, fulfillmentStatus: dispensed ? 'DISPENSED' : 'ORDERED' }))] : [];
    const row = { ...EMPTY_EXAM, ...base, id, appointmentId: appt.id, ownerId: appt.ownerId, petId: appt.petId, doctorId: doctor.id, doctorName: doctor.fullName, status: completed ? 'COMPLETED' : 'IN_PROGRESS', version: 1,
      startedAt: appt.startedAt, updatedAt: appt.startedAt, reason: appt.reason, symptoms: 'Biểu hiện và thông tin do chủ nuôi cung cấp (demo).', examination: 'Nội dung quan sát lâm sàng minh họa.', preliminaryAssessment: 'Đánh giá sơ bộ mẫu, không phải kết luận thực tế.',
      diagnosis: completed ? 'Kết luận khám minh họa — không sử dụng cho điều trị.' : '', treatmentPlan: 'Kế hoạch chăm sóc mẫu để thử giao diện.', recommendations: DEMO_NOTICE,
      doctorOnlyNotes: 'GHI_CHU_NOI_BO_DEMO_KHONG_HIEN_KHACH_HANG', weight, temperature: 38.5, heartRate: 100, respiratoryRate: 25, followUpDate: completed ? date(7) : '',
      prescriptions, serviceOrders: [order], results: completed ? [{ id: `${id}-result`, name: 'Kết quả CBC (demo)', result: 'Kết quả minh họa, không có giá trị chẩn đoán.' }] : [], billableItems,
      ...(completed ? { examinedAt: appt.completedAt, completedAt: appt.completedAt } : {}), ...(dispensed ? { dispensedAt: appt.completedAt } : {}) };
    visits.push(row); return row;
  };
  // Three measurements for the main patient's weight chart; each additional patient has a completed visit.
  [[0, -21, 6.1], [0, -14, 6.3], [0, -3, 6.5], ...pets.map((pet, i) => [i, -2 - i, pet.weight]).filter(([i]) => i > 0)].forEach(([i, days, weight], index) => {
    const appt = appointment(i, 'COMPLETED', days, i === 1 ? '10:00' : '09:00', i < 2 ? 0 : index % doctors.length);
    // Loại thanh toán xoay vòng: 0 chưa trả · 1 trả một phần · 2 trả đủ · 3 trả rồi hoàn tiền · 4 hóa đơn hủy.
    // Trả đủ ở ca 2 và 12 đã phát thuốc; ca 7 đã trả nhưng thuốc chưa phát (nằm trong hàng chờ phát thuốc của lễ tân).
    const paymentType = index % 5; const record = visit(appt, weight, true, paymentType === 2 && index !== 7);
    // Hai ca đã chốt chưa có hóa đơn để lễ tân tự lập; lượt khám chưa thu đủ hoặc chưa phát thuốc vẫn ở trạng thái chờ thanh toán.
    const noInvoice = index === 3 || index === 11;
    if (noInvoice || [0, 1].includes(paymentType) || index === 7) appt.status = 'WAITING_PAYMENT';
    if (noInvoice) return;
    const total = record.billableItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const method = ['CASH', 'TRANSFER', 'CARD'][index % 3];
    const payments = paymentType === 0 ? [] : [{ id: `${record.id}-payment`, type: 'PAYMENT', status: 'COMPLETED', amount: paymentType === 1 ? 100000 : total, method: paymentType === 1 ? 'CASH' : method, paidAt: appt.completedAt, demo: true }];
    if (paymentType === 3 || paymentType === 4) payments.push({ id: `${record.id}-refund`, type: 'REFUND', status: 'COMPLETED', amount: total, method: 'TRANSFER', paidAt: appt.completedAt, demo: true });
    invoices.push({ ...base, id: `demo-v1-invoice-${index + 1}`, code: `INV-DEMO-${String(index + 1).padStart(3, '0')}`, ownerId: record.ownerId, petId: record.petId, visitId: record.id, status: paymentType === 4 ? 'CANCELLED' : 'ISSUED', issuedAt: appt.completedAt, updatedAt: appt.completedAt, issuedBy: receptionist.id, version: 1,
      ...(index === 0 ? { discount: 20000 } : {}), items: record.billableItems, payments });
  });
  visit(appointment(1, 'IN_PROGRESS', 0, '09:00'), 3.8, false);
  // Giai đoạn sau khám: chờ kết quả cận lâm sàng (Lab + CĐHA), đã đủ kết quả (khóa ưu tiên bác sĩ), chờ thanh toán.
  const imagingService = services.find((service) => service.serviceType === 'IMAGING');
  const roomOrder = (visitId, service, status, extra = {}) => ({ id: `${visitId}-${service.serviceType.toLowerCase()}`, serviceId: service.id, name: service.name, serviceType: service.serviceType, unitPrice: service.price, quantity: 1,
    notes: 'Chỉ định cận lâm sàng mẫu — không áp dụng thực tế.', status, requiresResult: true, orderedAt: at(0, '08:10'), sentAt: at(0, '08:20'), callCount: 0, doctorId: doctors[1].id, doctorName: doctors[1].fullName, ...(service.serviceType === 'LABORATORY' ? { labItemIds: ['lab-item-1', 'lab-item-2', 'lab-item-3', 'lab-item-4', 'lab-item-5'] } : {}), ...extra });
  const waiting = visit(appointment(4, 'WAITING_RESULTS', 0, '08:00', 1), 4.2, false);
  waiting.serviceOrders = [roomOrder(waiting.id, labService, 'PENDING', { callCount: 1 }), roomOrder(waiting.id, imagingService, 'PENDING')];
  const catRanges = [[5.5, 19.5, 21], [5, 10, 7.2], [8, 15, 11], [24, 45, 30], [300, 700, 250]];
  const labResults = ['WBC', 'RBC', 'HGB', 'HCT', 'PLT'].map((code, index) => ({ itemId: `lab-item-${index + 1}`, code, name: code, unit: ['10^9/L', '10^12/L', 'g/dL', '%', '10^9/L'][index], species: 'CAT', value: catRanges[index][2], min: catRanges[index][0], max: catRanges[index][1],
    evaluation: catRanges[index][2] < catRanges[index][0] ? 'LOW' : catRanges[index][2] > catRanges[index][1] ? 'HIGH' : 'NORMAL' }));
  // Ca đã đủ kết quả thuộc bác sĩ demo chính, đúng lúc bác sĩ đang khám Luna: hàng đợi tái khám của họ có việc và lễ tân thấy khóa ưu tiên sau khi ca hiện tại kết thúc.
  const ready = visit(appointment(5, 'RESULTS_READY', 0, '08:30', 0), 3.5, false);
  ready.serviceOrders = [roomOrder(ready.id, labService, 'COMPLETED', { labResults, resultComment: 'Kết quả minh họa, không có giá trị chẩn đoán.', completedAt: recent, doctorId: doctors[0].id, doctorName: doctors[0].fullName })];
  visit(appointment(6, 'WAITING_PAYMENT', 0, '09:15', 3), 7.6, true);
  appointment(0, 'CHECKED_IN', 0, '09:30'); appointment(2, 'CHECKED_IN', 0, '10:00', 1); appointment(11, 'CHECKED_IN', 0, '10:30', 2, true);
  // Lịch đã xác nhận nhưng quá giờ hẹn (khung 08:00) để lễ tân thử gọi hỏi và đánh dấu vắng mặt; thêm một yêu cầu online hôm nay chờ duyệt.
  appointment(7, 'CONFIRMED', 0, '08:00', 2); appointment(3, 'PENDING', 0, '16:30');
  appointment(3, 'CONFIRMED', 0, '15:00', 3);
  appointment(0, 'PENDING', 1, '09:00'); appointment(1, 'CONFIRMED', 2, '10:00');
  appointment(2, 'PENDING', 1, '13:30', 1); appointment(4, 'CONFIRMED', 3, '14:00', 2);
  appointment(0, 'CANCELLED', 4, '11:00'); appointment(3, 'NO_SHOW', -1, '10:00', 1);
  pets.forEach((pet, i) => {
    const vaccineBase = { demo: true, ownerId: pet.ownerId, petId: pet.id, vaccineName: 'Vaccine phòng bệnh (demo)', doseLabel: 'Mũi minh họa', doctorName: doctors[i % 4].fullName, clinicName: 'PawCare — dữ liệu demo', customerNotes: DEMO_NOTICE };
    vaccinations.push({ ...vaccineBase, id: `demo-v1-vax-${i + 1}-done`, dueDate: date(-30 - i), administeredAt: at(-30 - i), status: 'COMPLETED' });
    vaccinations.push({ ...vaccineBase, id: `demo-v1-vax-${i + 1}-planned`, dueDate: date([-2, 0, 10, 45][i % 4]), status: i === 10 ? 'CANCELLED' : 'PLANNED' });
  });
  const notify = (pet, kind, title, message, entityId, days = -1, read = false) => notifications.push({ id: `demo-v1-notification-${notifications.length + 1}`, demo: true,
    ownerId: pet.ownerId, petId: pet.id, kind, title, message: `${message} Dữ liệu demo.`, entityId, createdAt: at(days), readAt: read ? at(days, '10:00') : '' });
  users.filter((item) => item.role === 'CUSTOMER').forEach((user) => {
    const pet = pets.find((item) => item.ownerId === user.id);
    const vax = vaccinations.find((item) => item.petId === pet.id && item.status === 'PLANNED');
    if (vax) notify(pet, 'VACCINATION', 'Nhắc lịch tiêm phòng', `Xem lịch dự kiến của ${pet.name}; chưa phải xác nhận đã tiêm.`, vax.id);
    const invoice = invoices.find((item) => item.ownerId === user.id); if (invoice) notify(pet, 'INVOICE', 'Hóa đơn đã được lập', `Xem chi phí lượt khám của ${pet.name}.`, invoice.id, -2, true);
    const record = visits.find((item) => item.petId === pet.id && item.status === 'COMPLETED');
    if (record) notify(pet, 'MEDICAL_RECORD', 'Có hồ sơ khám mới', `Kết quả khám của ${pet.name} đã được chốt.`, record.id, -1);
    const appt = appointments.find((item) => item.ownerId === user.id && item.status === 'CONFIRMED');
    if (appt) notify(pets.find((item) => item.id === appt.petId), 'APPOINTMENT', 'Lịch hẹn đã xác nhận', 'Mở danh sách để kiểm tra ngày giờ lịch hẹn.', appt.id);
  });
  const addAudit = (actor, module, action, target, targetName, createdAt) => audit.push({ id: `demo-v1-audit-${audit.length + 1}`, demo: true, actorId: actor.id, actorName: actor.fullName, actorRole: actor.role, module, action, targetId: target.id, targetName: `${targetName} [DEMO]`, fields: [], createdAt });
  users.slice(0, 8).forEach((item) => addAudit(admin, 'USERS', 'USER_CREATE', item, item.fullName, item.createdAt));
  appointments.filter((item) => ['COMPLETED', 'WAITING_PAYMENT'].includes(item.status)).forEach((item) => addAudit(doctors.find((doctor) => doctor.id === item.assignedDoctorId), 'EXAMINATIONS', 'EXAMINATION_COMPLETE', item, item.code, item.completedAt));
  invoices.forEach((item) => addAudit(receptionist, 'BILLING', 'INVOICE_ISSUE', item, item.code, item.issuedAt));
  return { users, customers, pets, services, inventory: { medicines, batches }, rooms, appointments, visits, invoices, vaccinations, notifications, audit, staff: [] };
}
