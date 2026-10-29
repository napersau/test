import { requireVeterinarian, getVeterinarianCustomer } from '../users/usersRepository';
import { listVeterinarianPets } from '../pets/petsRepository';
import { readAppointments } from '../appointments/appointmentStorage';
import { APPOINTMENTS_KEY, APPOINTMENTS_CHANGED, MEDICAL_RECORDS_KEY, MEDICAL_RECORDS_CHANGED } from '../appointments/appointmentPolicy';
import { isAmount, isTimestamp } from '../customerRecords/recordStorage';
import { recordActivity } from '../activity/auditStorage';
import { EMPTY_EXAM, examValues, validateExamination, cleanExamination, examError, medicalRecordCode, diagnosisState, RECORD_STATUS_FOR_VISIT, SCREENED_SERVICE_TYPES, FEVER_THRESHOLD } from './examinationPolicy';
import { listVeterinarianMedicines } from '../medicines/medicinesRepository';
import { listVeterinarianServices } from '../services/servicesRepository';
import { MEDICINE_UNITS, isServiceType } from '../catalog/catalogPolicy';
import { catalogId } from '../catalog/catalogStorage';
import { CLINICAL_PLANS, validatePlan, isRoomService, OPEN_ORDER_STATUSES } from './clinicalPlanPolicy';
import { VACCINATIONS_KEY } from '../vaccinations/vaccinationPolicy';
import { notifyCustomerEvent } from '../notifications/notificationWriter';

export function readMedicalRecords() {
  const saved = localStorage.getItem(MEDICAL_RECORDS_KEY); if (saved === null) return [];
  let records; try { records = JSON.parse(saved); } catch { throw new Error('Dữ liệu hồ sơ khám không hợp lệ. Không tự động ghi đè.'); }
  if (!Array.isArray(records) || records.some((record) => !record || ['id', 'ownerId', 'petId', 'status'].some((key) => typeof record[key] !== 'string' || !record[key])) || new Set(records.map((item) => item.id)).size !== records.length) throw new Error('Dữ liệu hồ sơ khám không hợp lệ.');
  return records;
}
export function assignedAppointment(actorId, id, appointments = readAppointments()) {
  const appointment = appointments.find((item) => item.id === id && item.assignedDoctorId === actorId);
  if (!appointment) throw examError('Không tìm thấy lịch khám được phân công cho bạn.', {}, 404);
  return appointment;
}
export function linkedRecord(records, appointment, actorId) {
  const matches = records.filter((item) => item.appointmentId === appointment.id);
  if (matches.length > 1) throw new Error('Lượt khám có nhiều hồ sơ trùng. Kiểm tra nguồn dữ liệu.');
  const record = matches[0];
  if (record && (record.ownerId !== appointment.ownerId || record.petId !== appointment.petId || record.doctorId !== actorId || !Number.isInteger(record.version) || record.version < 1 || !['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(record.status))) throw new Error('Hồ sơ khám không khớp lượt hẹn/bác sĩ.');
  if (record && (Object.keys(validateExamination({ ...examValues(record), followUpDate: '' })).length || !isTimestamp(record.startedAt) || !isTimestamp(record.updatedAt)
    || typeof record.doctorName !== 'string' || !record.doctorName.trim() || (record.status === 'COMPLETED' && (!isTimestamp(record.examinedAt) || !record.diagnosis?.trim())))) throw new Error('Nội dung hồ sơ khám không hợp lệ.');
  return record;
}
function planItems(record, kind) {
  const field = CLINICAL_PLANS[kind].field; const items = record[field] === undefined ? [] : record[field];
  if (!Array.isArray(items) || items.some((item) => !item || typeof item.id !== 'string' || !item.id) || new Set(items.map((item) => item.id)).size !== items.length) throw new Error('Dữ liệu đơn thuốc/chỉ định không hợp lệ. Không tự ghi đè.');
  if (kind === 'prescriptions') {
    if (items.some((item) => ['medicineName', 'dosage', 'instructions'].some((field) => typeof item[field] !== 'string')
      || ['medicineId', 'unit', 'frequency', 'duration'].some((field) => item[field] !== undefined && typeof item[field] !== 'string')
      || (item.quantity !== undefined && (!Number.isSafeInteger(item.quantity) || item.quantity <= 0)))) throw new Error('Dữ liệu đơn thuốc không hợp lệ. Không tự ghi đè.');
    return items.map(({ id, medicineId, medicineName, unit, dosage, frequency, duration, quantity, instructions, unitPrice }) => ({ id, medicineId: medicineId || '', medicineName, unit: unit || '', dosage, frequency: frequency || '', duration: duration || '', quantity: quantity ?? '', instructions, ...(isAmount(unitPrice) ? { unitPrice } : {}) }));
  }
  if (Object.keys(validatePlan(items, kind)).length || items.some((item) => !isAmount(item.unitPrice) || typeof item.name !== 'string' || !item.name.trim()
    || !isServiceType(item.serviceType) || typeof item.requiresResult !== 'boolean' || !isTimestamp(item.orderedAt) || typeof item.doctorName !== 'string')) throw new Error('Dữ liệu chỉ định không hợp lệ. Không tự ghi đè.');
  return items.map(({ id, serviceId, name, serviceType, quantity, unitPrice, notes, status, requiresResult, orderedAt, doctorName }) => ({ id, serviceId, name, serviceType, quantity, unitPrice, notes, status, requiresResult, orderedAt, doctorName }));
}
export function getClinicalPlan(actorId, appointmentId, kind) {
  if (!CLINICAL_PLANS[kind]) throw new Error('Chức năng không hợp lệ.');
  const data = getExamination(actorId, appointmentId);
  const raw = data.record ? readMedicalRecords().find((item) => item.id === data.record.id) : null;
  return { appointment: data.appointment, pet: data.pet, owner: data.owner, record: data.record ? {
    id: data.record.id, code: data.record.code, version: data.record.version, status: data.record.status, editable: data.record.editable, updatedAt: data.record.updatedAt,
    diagnosis: data.record.diagnosis, items: planItems(raw, kind),
  } : null, catalog: kind === 'prescriptions' ? listVeterinarianMedicines(actorId) : listVeterinarianServices(actorId) };
}
export function saveClinicalPlan(actorId, appointmentId, kind, input) {
  const actor = requireVeterinarian(actorId); if (!CLINICAL_PLANS[kind]) throw new Error('Chức năng không hợp lệ.');
  const appointments = readAppointments(); const appointment = assignedAppointment(actorId, appointmentId, appointments);
  const records = readMedicalRecords(); const current = linkedRecord(records, appointment, actorId);
  if (appointment.status !== 'IN_PROGRESS' || current?.status !== 'IN_PROGRESS') throw examError('Chỉ chỉnh sửa hồ sơ đang khám. Hồ sơ hoàn tất chỉ được xem.');
  if (input.expectedVersion !== current.version || input.expectedAppointmentVersion !== appointment.version) throw examError('Hồ sơ hoặc lịch vừa thay đổi. Giữ bản nháp và tải lại để đối chiếu.', {}, 409);
  pair(actorId, appointment);
  const errors = validatePlan(input.items, kind); if (Object.keys(errors).length) throw examError('Kiểm tra đơn thuốc/chỉ định.', errors);
  const previous = planItems(current, kind); const catalog = kind === 'prescriptions' ? listVeterinarianMedicines(actorId) : listVeterinarianServices(actorId);
  const stamp = new Date().toISOString(); const idKey = kind === 'prescriptions' ? 'medicineId' : 'serviceId';
  const ids = input.items.filter((item) => item.id).map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw examError('Dòng dữ liệu bị trùng mã.');
  const items = input.items.map((item, index) => {
    const old = previous.find((row) => row.id === item.id); const source = catalog.find((row) => row.id === item[idKey]);
    if ((!old || old[idKey] !== item[idKey]) && !source) throw examError('Danh mục đã thay đổi. Chọn lại thuốc/dịch vụ đang sử dụng.', { [`${index}.${idKey}`]: 'Không còn trong danh mục đang sử dụng.' });
    if (kind === 'prescriptions') {
      // Số lượng kê không được vượt tồn kho khả dụng tức thời (lô còn hạn).
      const stock = catalog.find((row) => row.id === item.medicineId)?.availableStock;
      if (stock !== undefined && Number(item.quantity) > stock) throw examError('Kiểm tra số lượng thuốc.', { [`${index}.quantity`]: `Số lượng kê (${Number(item.quantity)}) vượt quá tồn kho khả dụng (${stock}). Vui lòng giảm số lượng hoặc kê loại thuốc thay thế.` });
    }
    if (kind === 'prescriptions') return {
      id: old?.id || catalogId(), medicineId: item.medicineId, medicineName: old?.medicineId === item.medicineId ? old.medicineName : source.name,
      unit: old?.medicineId === item.medicineId ? old.unit : MEDICINE_UNITS[source.unit], quantity: Number(item.quantity),
      // Đơn giá bán được chốt (snapshot) lúc kê đơn; đổi giá danh mục sau đó không ảnh hưởng đơn cũ.
      unitPrice: old?.medicineId === item.medicineId && isAmount(old.unitPrice) ? old.unitPrice : source.salePrice,
      ...Object.fromEntries(['dosage', 'frequency', 'duration', 'instructions'].map((field) => [field, item[field].trim()])),
    };
    if (!old && source.price !== item.unitPrice) throw examError('Giá dịch vụ vừa thay đổi. Chọn lại dịch vụ và đối chiếu trước khi lưu.', { [`${index}.serviceId`]: 'Giá thay đổi, chọn lại dịch vụ.' }, 409);
    if (old && old.status !== 'ORDERED') {
      if (JSON.stringify(old) !== JSON.stringify(item)) throw examError('Chỉ định đã hủy/đang thực hiện/hoàn tất chỉ được xem.');
      return current.serviceOrders.find((row) => row.id === old.id);
    }
    if ((!old && item.status !== 'ORDERED') || (old && !['ORDERED', 'CANCELLED'].includes(item.status)) || (old && old.serviceId !== item.serviceId)) throw examError('Không đổi dịch vụ hoặc tự đánh dấu đã thực hiện. Hủy chỉ định cũ rồi thêm dòng mới.');
    return { ...(old ? current.serviceOrders.find((row) => row.id === old.id) : { id: catalogId(), serviceId: source.id, name: source.name, serviceType: source.serviceType,
      unitPrice: source.price, requiresResult: source.requiresResult, ...(source.labItemIds ? { labItemIds: source.labItemIds } : {}), orderedAt: stamp, doctorId: actor.id, doctorName: actor.fullName }),
      quantity: Number(item.quantity), notes: item.notes.trim(), status: item.status, ...(item.status === 'CANCELLED' ? { cancelledAt: stamp } : {}) };
  });
  if (kind === 'services' && previous.some((row) => !items.some((item) => item.id === row.id))) throw examError('Không xóa chỉ định đã lưu. Hãy hủy chỉ định để giữ lịch sử.');
  const updated = { ...current, [CLINICAL_PLANS[kind].field]: items, version: current.version + 1, updatedAt: stamp };
  commitClinical(appointments, records.map((row) => row.id === current.id ? updated : row));
  recordActivity({ actor, module: 'EXAMINATIONS', action: kind === 'prescriptions' ? 'PRESCRIPTION_SAVE' : 'SERVICE_ORDER_SAVE', targetId: appointment.id, targetName: appointment.code });
  return getClinicalPlan(actorId, appointmentId, kind).record;
}
export function pair(actorId, appointment) {
  const pet = listVeterinarianPets(actorId).find((item) => item.id === appointment.petId && item.ownerId === appointment.ownerId);
  if (!pet) throw new Error('Thú cưng không khớp chủ nuôi trong lịch khám.');
  return { pet, owner: getVeterinarianCustomer(actorId, appointment.ownerId) };
}
// Best-effort rollback for the local demo; not a cross-tab/server transaction.
export function commitClinical(appointments, records) {
  const oldMedical = localStorage.getItem(MEDICAL_RECORDS_KEY);
  const oldAppointments = localStorage.getItem(APPOINTMENTS_KEY);
  try { localStorage.setItem(MEDICAL_RECORDS_KEY, JSON.stringify(records)); localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments)); }
  catch {
    try {
      if (localStorage.getItem(MEDICAL_RECORDS_KEY) !== oldMedical) oldMedical === null ? localStorage.removeItem(MEDICAL_RECORDS_KEY) : localStorage.setItem(MEDICAL_RECORDS_KEY, oldMedical);
      if (localStorage.getItem(APPOINTMENTS_KEY) !== oldAppointments) oldAppointments === null ? localStorage.removeItem(APPOINTMENTS_KEY) : localStorage.setItem(APPOINTMENTS_KEY, oldAppointments);
    } catch { throw new Error('Lưu thất bại và chưa khôi phục đủ hai nguồn dữ liệu. Dừng thao tác và kiểm tra bộ nhớ trình duyệt.'); }
    throw new Error('Không lưu được hồ sơ khám. Dữ liệu trước thao tác được giữ lại; kiểm tra dung lượng và thử lại.');
  }
  window.dispatchEvent(new Event(MEDICAL_RECORDS_CHANGED)); window.dispatchEvent(new Event(APPOINTMENTS_CHANGED));
}
// Hồ sơ khám phải khớp vòng đời Visit trên lịch hẹn (xem RECORD_STATUS_FOR_VISIT); lịch mới tiếp nhận / hủy trước khi khám chưa có hồ sơ.
export const visitMismatch = (record, appointment) => (record ? record.status !== RECORD_STATUS_FOR_VISIT[appointment.status] : !['CHECKED_IN', 'CANCELLED'].includes(appointment.status));
const appointmentDTO = (item) => Object.fromEntries(['id', 'code', 'ownerId', 'petId', 'petName', 'serviceName', 'reason', 'status', 'source', 'startsAt', 'version', 'roomId', 'roomName', 'assignedDoctorName', 'priority', 'checkedInAt', 'confirmedAt', 'startedAt', 'completedAt', 'cancellationReason', 'weightKg', 'temperatureC', 'phase', 'callbackPostponed', 'resultsReadyAt', 'sentToRoomsAt', 'cancelledAt', 'cancelReasonCode', 'inviteRecordVersion', 'callbackCalls', 'abandoned'].map((key) => [key, item[key] ?? '']));
const recordDTO = (record) => record ? { ...examValues(record), id: record.id, code: medicalRecordCode(record.id), status: record.status, version: record.version, updatedAt: record.updatedAt, startedAt: record.startedAt, completedAt: record.completedAt || '' } : null;
// Tóm tắt chỉ định của hồ sơ (kèm tiến độ và kết quả) cho màn khám của bác sĩ.
export function orderSummaries(record) {
  return (record.serviceOrders || []).map((order) => ({ id: order.id, serviceId: order.serviceId, name: order.name, serviceType: order.serviceType, status: order.status, quantity: order.quantity, unitPrice: order.unitPrice,
    sentAt: order.sentAt || '', completedAt: order.completedAt || '', cancelReason: order.cancelReason || '', labResults: order.labResults || [], resultComment: order.resultComment || '', imaging: order.imaging || null }));
}
export function listVeterinarianRecords(actorId) {
  requireVeterinarian(actorId);
  const records = readMedicalRecords();
  const appointments = readAppointments().filter((item) => item.assignedDoctorId === actorId && (['CHECKED_IN', 'IN_PROGRESS', 'WAITING_RESULTS', 'RESULTS_READY', 'WAITING_PAYMENT', 'COMPLETED'].includes(item.status) || (item.status === 'CANCELLED' && records.some((record) => record.appointmentId === item.id))));
  return appointments.map((appointment) => {
    const raw = linkedRecord(records, appointment, actorId);
    if (visitMismatch(raw, appointment)) throw new Error('Lịch hẹn và hồ sơ khám chưa đồng nhất. Kiểm tra nguồn dữ liệu.');
    const { pet, owner } = pair(actorId, appointment);
    const record = raw ? { id: raw.id, code: medicalRecordCode(raw.id), status: raw.status, version: raw.version, startedAt: raw.startedAt, updatedAt: raw.updatedAt,
      completedAt: raw.completedAt || '', symptoms: raw.symptoms || '', preliminaryAssessment: raw.preliminaryAssessment || '', diagnosis: raw.diagnosis || '',
      diagnosisReason: raw.diagnosisReason || '', undetermined: raw.undetermined || false, diagnosisState: diagnosisState(raw) } : null;
    return { appointment: appointmentDTO(appointment), pet, owner, record,
      canCreate: !record && pet.status === 'ACTIVE' && isTimestamp(appointment.checkedInAt) && Date.parse(appointment.checkedInAt) <= Date.now() && !!appointment.roomId && !!appointment.roomName };
  }).sort((a, b) => Date.parse(b.record?.updatedAt || b.appointment.checkedInAt) - Date.parse(a.record?.updatedAt || a.appointment.checkedInAt));
}
export function listVeterinarianAppointments(actorId) {
  requireVeterinarian(actorId);
  const appointments = readAppointments().filter((item) => item.assignedDoctorId === actorId);
  return appointments.map((appointment) => ({ ...appointmentDTO(appointment), ...pair(actorId, appointment) })).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}
export function getExamination(actorId, appointmentId) {
  requireVeterinarian(actorId); const appointment = assignedAppointment(actorId, appointmentId); const { pet, owner } = pair(actorId, appointment);
  const records = readMedicalRecords(); const record = linkedRecord(records, appointment, actorId);
  if (visitMismatch(record, appointment)) throw new Error('Lịch hẹn và hồ sơ khám chưa đồng nhất. Kiểm tra nguồn dữ liệu trước khi tiếp tục.');
  const history = records.filter((item) => item.status === 'COMPLETED' && item.petId === pet.id && item.ownerId === pet.ownerId && item.id !== record?.id)
    .map(({ id, examinedAt, doctorName, diagnosis, recommendations }) => {
      if (!isTimestamp(examinedAt) || Date.parse(examinedAt) > Date.now() || [doctorName, diagnosis, recommendations].some((value) => typeof value !== 'string')) throw new Error('Nguồn lịch sử khám có dữ liệu không hợp lệ.');
      return { id, examinedAt, doctorName, diagnosis, recommendations };
    })
    .sort((a, b) => Date.parse(b.examinedAt) - Date.parse(a.examinedAt));
  return { appointment: appointmentDTO(appointment), pet, owner, record: record ? { ...recordDTO(record), editable: appointment.status === 'IN_PROGRESS' && record.status === 'IN_PROGRESS', orders: orderSummaries(record) } : null, history };
}
export function startExamination(actorId, appointmentId, expectedVersion) {
  const actor = requireVeterinarian(actorId); const appointments = readAppointments(); const current = assignedAppointment(actorId, appointmentId, appointments);
  if (expectedVersion !== current.version) throw examError('Lịch vừa thay đổi. Tải lại trước khi bắt đầu khám.', {}, 409);
  if (current.status !== 'CHECKED_IN' || !isTimestamp(current.checkedInAt) || Date.parse(current.checkedInAt) > Date.now() || !current.roomId || !current.roomName) throw examError('Chỉ bắt đầu khám cho khách đã được lễ tân tiếp nhận và phân phòng hợp lệ.');
  const { pet } = pair(actorId, current); if (pet.status !== 'ACTIVE') throw examError('Hồ sơ thú cưng đã lưu trữ. Nhờ lễ tân kiểm tra trước khi khám.');
  if (appointments.some((item) => item.id !== current.id && item.status === 'IN_PROGRESS' && (item.assignedDoctorId === actorId || item.petId === pet.id || (current.roomId && item.roomId === current.roomId)))) throw examError('Bác sĩ, thú cưng hoặc phòng đang có lượt khám khác chưa hoàn tất.', {}, 409);
  const records = readMedicalRecords(); if (linkedRecord(records, current, actorId)) throw examError('Lượt hẹn đã có hồ sơ khám. Không tạo thêm.', {}, 409);
  const stamp = new Date().toISOString(); const id = window.crypto?.randomUUID?.() || `exam-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const record = { ...EMPTY_EXAM, weight: null, temperature: null, heartRate: null, respiratoryRate: null, id, appointmentId, ownerId: current.ownerId, petId: current.petId,
    doctorId: actorId, doctorName: actor.fullName, reason: current.reason, status: 'IN_PROGRESS', startedAt: stamp, updatedAt: stamp, version: 1, results: [], prescriptions: [], billableItems: [] };
  const updated = { ...current, status: 'IN_PROGRESS', phase: 1, startedAt: stamp, updatedAt: stamp, version: current.version + 1 };
  commitClinical(appointments.map((item) => item.id === appointmentId ? updated : item), [record, ...records]);
  recordActivity({ actor, module: 'EXAMINATIONS', action: 'EXAMINATION_START', targetId: appointmentId, targetName: current.code }); return recordDTO(record);
}
// Tiêm phòng / tẩy giun đã thực hiện được ghi vào lịch sử tiêm phòng của thú cưng (ngày, loại, lần thực hiện).
export function recordPerformedVaccinations(record, orders, stamp) {
  const items = orders.filter((order) => ['VACCINATION', 'DEWORMING'].includes(order.serviceType));
  if (!items.length) return;
  try {
    const saved = JSON.parse(localStorage.getItem(VACCINATIONS_KEY) || '[]'); const known = new Set(saved.map((row) => row.id));
    const added = items.filter((order) => !known.has(`vax-${order.id}`)).map((order, index) => ({ id: `vax-${order.id}`, ownerId: record.ownerId, petId: record.petId, vaccineName: order.name,
      doseLabel: `Lần thực hiện ${saved.filter((row) => row.petId === record.petId && row.vaccineName === order.name).length + index + 1}`, dueDate: stamp.slice(0, 10), administeredAt: stamp, status: 'COMPLETED',
      doctorName: record.doctorName, clinicName: 'PawCare', customerNotes: '' }));
    if (added.length) localStorage.setItem(VACCINATIONS_KEY, JSON.stringify([...saved, ...added]));
  } catch { /* lịch sử tiêm phòng hỏng: không ghi đè, hồ sơ khám vẫn được lưu */ }
}
export function saveExamination(actorId, appointmentId, input, final = false) {
  const actor = requireVeterinarian(actorId); const appointments = readAppointments(); const appointment = assignedAppointment(actorId, appointmentId, appointments);
  const records = readMedicalRecords(); const current = linkedRecord(records, appointment, actorId);
  if (appointment.status !== 'IN_PROGRESS' || current?.status !== 'IN_PROGRESS') throw examError('Chỉ chỉnh sửa hồ sơ đang khám. Hồ sơ hoàn tất chỉ được xem.');
  if (input.expectedVersion !== current.version || input.expectedAppointmentVersion !== appointment.version) throw examError('Hồ sơ hoặc lịch vừa thay đổi. Giữ bản nháp và tải lại để đối chiếu.', {}, 409);
  pair(actorId, appointment);
  const values = { ...EMPTY_EXAM, ...Object.fromEntries(Object.keys(EMPTY_EXAM).map((key) => [key, input[key] ?? EMPTY_EXAM[key]])), acknowledged: input.acknowledged };
  const errors = validateExamination(values, final); if (Object.keys(errors).length) throw examError('Vui lòng kiểm tra nội dung hồ sơ khám.', errors);
  const stamp = new Date().toISOString(); const clean = cleanExamination(values);
  const updated = { ...current, ...clean, updatedAt: stamp, version: current.version + 1 };
  let nextAppointment = appointment;
  let doneOrders = [];
  if (final) {
    // Chốt đợt khám: IN_PROGRESS → WAITING_PAYMENT, hồ sơ chuyên môn bị khóa. Dịch vụ làm tại phòng khám (tiêm, tẩy giun, thủ thuật…) được ghi nhận đã thực hiện.
    const orders = current.serviceOrders || [];
    const unsent = orders.filter((order) => order.status === 'ORDERED' && isRoomService(order));
    if (unsent.length) throw examError(`Còn ${unsent.length} chỉ định cận lâm sàng chưa gửi (${unsent.map((order) => order.name).join(', ')}). Hãy gửi sang phòng chuyên môn hoặc hủy chỉ định trước khi chốt đợt khám.`);
    if (orders.some((order) => OPEN_ORDER_STATUSES.includes(order.status))) throw examError('Còn dịch vụ cận lâm sàng chưa có kết quả. Chờ phòng chuyên môn hoàn tất trước khi chốt.');
    doneOrders = orders.filter((order) => order.status === 'ORDERED');
    const screened = doneOrders.filter((order) => SCREENED_SERVICE_TYPES.includes(order.serviceType));
    if (screened.length) {
      if (clean.temperature === null) throw examError(`Khám sàng lọc bắt buộc trước khi thực hiện ${screened.map((order) => order.name).join(', ')}: nhập nhiệt độ đo lúc khám.`, { temperature: 'Nhập nhiệt độ đo lúc khám.' });
      if (clean.temperature >= FEVER_THRESHOLD) throw examError(`Thú cưng đang sốt (${clean.temperature} °C), không đủ điều kiện thực hiện ${screened.map((order) => order.name).join(', ')}. Hủy chỉ định hoặc đo lại nhiệt độ.`, { temperature: `Thân nhiệt ${clean.temperature} °C vượt ngưỡng sàng lọc ${FEVER_THRESHOLD} °C.` });
    }
    updated.serviceOrders = orders.map((order) => (order.status === 'ORDERED' ? { ...order, status: 'COMPLETED', completedAt: stamp, performedBy: actor.id } : order));
    updated.status = 'COMPLETED'; updated.completedAt = stamp; updated.examinedAt = stamp;
    if (clean.undetermined) updated.diagnosis = `Chưa xác định chẩn đoán: ${clean.diagnosisReason}`;
    // Khoản tính tiền chốt khi hoàn tất: lượt khám + dịch vụ đã thực hiện + thuốc trong đơn (chờ phát sau khi thanh toán); dịch vụ hủy không tính.
    updated.billableItems = [
      ...(isAmount(appointment.estimatedPrice) ? [{ id: `exam-${appointment.id}`, type: 'SERVICE', name: appointment.serviceName, quantity: 1, unit: 'Lượt', unitPrice: appointment.estimatedPrice, fulfillmentStatus: 'COMPLETED' }] : []),
      ...updated.serviceOrders.filter((order) => order.status === 'COMPLETED' && isAmount(order.unitPrice) && Number.isSafeInteger(Number(order.quantity)))
        .map((order) => ({ id: order.id, type: 'SERVICE', name: order.name, quantity: Number(order.quantity), unit: 'Lượt', unitPrice: order.unitPrice, fulfillmentStatus: 'COMPLETED' })),
      ...(current.prescriptions || []).filter((rx) => isAmount(rx.unitPrice) && Number.isSafeInteger(rx.quantity) && rx.quantity > 0)
        .map((rx) => ({ id: rx.id, type: 'MEDICINE', name: rx.medicineName, quantity: rx.quantity, unit: rx.unit, unitPrice: rx.unitPrice, fulfillmentStatus: 'ORDERED' })),
    ];
    nextAppointment = { ...appointment, status: 'WAITING_PAYMENT', completedAt: stamp, chotAt: stamp, updatedAt: stamp, version: appointment.version + 1 };
  }
  commitClinical(appointments.map((item) => item.id === appointmentId ? nextAppointment : item), records.map((item) => item.id === current.id ? updated : item));
  if (final) recordPerformedVaccinations(updated, doneOrders, stamp);
  recordActivity({ actor, module: 'EXAMINATIONS', action: final ? 'EXAMINATION_COMPLETE' : 'EXAMINATION_SAVE', targetId: appointmentId, targetName: appointment.code });
  if (final) notifyCustomerEvent('MEDICAL_RECORD', updated.id, 'completed', 'Hồ sơ khám đã hoàn tất', `Hồ sơ của lịch ${appointment.code} đã chốt. Bạn có thể xem kết quả và đơn thuốc trong khu vực khách hàng.`);
  return recordDTO(updated);
}
