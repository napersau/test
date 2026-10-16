export const CLINICAL_PLANS = {
  prescriptions: { title: 'Kê đơn thuốc', path: '/vet/prescriptions', field: 'prescriptions', add: 'Thêm thuốc', save: 'Lưu đơn thuốc', icon: 'medicine',
    help: 'Bác sĩ tự nhập liều dùng và hướng dẫn sau khi đối chiếu thú cưng, dị ứng. Không gợi ý liều, không tự xuất kho hoặc tính tiền.' },
  services: { title: 'Chỉ định dịch vụ', path: '/vet/service-orders', field: 'serviceOrders', add: 'Thêm dịch vụ', save: 'Lưu chỉ định', icon: 'service',
    help: 'Lưu chỉ định với giá tại thời điểm chọn. Chỉ định chưa phải dịch vụ đã thực hiện, không tự có kết quả hoặc hóa đơn.' },
};
// ORDERED = bác sĩ đã chỉ định nhưng chưa gửi; PENDING = đã gửi sang phòng Xét nghiệm / CĐHA, chờ thực hiện.
export const ORDER_STATES = { ORDERED: 'Đã chỉ định', PENDING: 'Chờ thực hiện', IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Đã thực hiện', CANCELLED: 'Đã hủy' };
export const ORDER_TONES = { ORDERED: 'blue', PENDING: 'blue', IN_PROGRESS: 'blue', COMPLETED: 'green', CANCELLED: '' };
// Hai nhóm dịch vụ thực hiện ở phòng chuyên môn riêng (hàng đợi độc lập); các nhóm còn lại làm ngay tại phòng khám của bác sĩ.
export const CLINICAL_ROOMS = { LABORATORY: { label: 'Phòng Xét nghiệm', path: '/vet/lab' }, IMAGING: { label: 'Phòng Chẩn đoán hình ảnh', path: '/vet/imaging' } };
export const isRoomService = (order) => Object.keys(CLINICAL_ROOMS).includes(order.serviceType);
export const OPEN_ORDER_STATUSES = ['PENDING', 'IN_PROGRESS'];
export const planDraftKey = (actorId, appointmentId, kind) => `pawcare_plan_draft_v1:${actorId}:${appointmentId}:${kind}`;
export const newPlanRow = (kind) => kind === 'prescriptions'
  ? { id: '', medicineId: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '' }
  : { id: '', serviceId: '', quantity: '1', notes: '', status: 'ORDERED' };
export function isPlanDraft(draft, kind) {
  const prescription = kind === 'prescriptions'; const required = prescription ? ['id', 'medicineId', 'dosage', 'frequency', 'duration', 'instructions'] : ['id', 'serviceId', 'notes', 'status'];
  const optional = prescription ? ['medicineName', 'unit'] : ['name', 'serviceType', 'doctorName', 'orderedAt'];
  return !!draft && Number.isInteger(draft.version) && draft.version > 0 && Number.isInteger(draft.appointmentVersion) && draft.appointmentVersion > 0
    && typeof draft.savedAt === 'string' && Number.isFinite(Date.parse(draft.savedAt)) && Array.isArray(draft.items) && draft.items.length <= 50
    && draft.items.every((item) => item && required.every((field) => typeof item[field] === 'string' && item[field].length <= 1000)
      && optional.every((field) => item[field] === undefined || (typeof item[field] === 'string' && item[field].length <= 1000))
      && ['string', 'number'].includes(typeof item.quantity)
      && (prescription || (!!ORDER_STATES[item.status] && (item.unitPrice === undefined || item.unitPrice === null || (Number.isSafeInteger(item.unitPrice) && item.unitPrice >= 0)))));
}
export function validatePlan(items, kind) {
  const errors = {}; const prescription = kind === 'prescriptions'; const seen = new Set();
  if (!Array.isArray(items) || items.length > 50) return { items: 'Tối đa 50 dòng trong một hồ sơ.' };
  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') { errors.items = 'Dòng dữ liệu không hợp lệ.'; return; }
    const idKey = prescription ? 'medicineId' : 'serviceId'; const id = item[idKey]; const active = prescription || item.status !== 'CANCELLED';
    if (typeof id !== 'string' || !id) errors[`${index}.${idKey}`] = prescription ? 'Chọn thuốc trong danh mục.' : 'Chọn dịch vụ trong danh mục.';
    if (active && seen.has(id)) errors[`${index}.${idKey}`] = 'Đã có trong danh sách. Hãy chỉnh số lượng ở dòng hiện có.';
    if (active) seen.add(id);
    if (!['number', 'string'].includes(typeof item.quantity) || !String(item.quantity).trim() || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 10000) errors[`${index}.quantity`] = 'Số lượng nguyên từ 1 đến 10.000.';
    (prescription ? ['dosage', 'frequency', 'duration', 'instructions'] : ['notes']).forEach((field) => {
      const max = field === 'instructions' || field === 'notes' ? 1000 : 200;
      if (typeof item[field] !== 'string' || item[field].length > max || (prescription && !item[field].trim())) errors[`${index}.${field}`] = prescription ? `Nhập hướng dẫn, tối đa ${max} ký tự.` : 'Ghi chú tối đa 1.000 ký tự.';
    });
    if (!prescription && !ORDER_STATES[item.status]) errors[`${index}.status`] = 'Trạng thái không hợp lệ.';
  });
  return errors;
}
