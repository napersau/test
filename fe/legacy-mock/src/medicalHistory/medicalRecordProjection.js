import { validDate } from '../catalog/catalogPolicy';
import { projectPrescription } from '../prescriptions/prescriptionPolicy';

function projectClinicalOrders(orders) {
  return (Array.isArray(orders) ? orders : []).filter((order) => order && order.status === 'COMPLETED' && ((Array.isArray(order.labResults) && order.labResults.length) || order.imaging)).map((order) => ({
    id: order.id, name: order.name, serviceType: order.serviceType, comment: typeof order.resultComment === 'string' ? order.resultComment : '',
    labResults: (order.labResults || []).map(({ itemId, code, name, unit, value, min, max, evaluation }) => ({ itemId, code, name, unit, value, min, max, evaluation })),
    imaging: order.imaging ? { description: order.imaging.description, conclusion: order.imaging.conclusion, images: (order.imaging.images || []).map(({ id, name, dataUrl }) => ({ id, name, dataUrl })) } : null }));
}

// Pure public clinical projection, shared by authorized Customer and Vet readers.
export function projectCompletedVisit(record, pet) {
  if (!Number.isFinite(Date.parse(record.examinedAt)) || Date.parse(record.examinedAt) > Date.now()
    || ['doctorName', 'diagnosis', 'recommendations'].some((key) => typeof record[key] !== 'string') || !record.diagnosis.trim()
    || (record.treatmentPlan !== undefined && typeof record.treatmentPlan !== 'string')
    || (record.followUpDate && !validDate(record.followUpDate))
    || (record.weight !== null && record.weight !== undefined && (typeof record.weight !== 'number' || record.weight <= 0 || record.weight > 500))
    || !Array.isArray(record.results) || record.results.some((item) => !item || ['id', 'name', 'result'].some((key) => typeof item[key] !== 'string'))
    || !Array.isArray(record.prescriptions) || record.prescriptions.some((item) => !item || ['id', 'medicineName', 'dosage', 'instructions'].some((key) => typeof item[key] !== 'string'))) throw new Error('Hồ sơ khám đã hoàn tất có dữ liệu không hợp lệ.');
  return { id: record.id, petId: record.petId, petName: pet.name, examinedAt: record.examinedAt,
    doctorName: record.doctorName, diagnosis: record.diagnosis, treatmentPlan: record.treatmentPlan || '', recommendations: record.recommendations, weight: record.weight ?? null,
    followUpDate: record.followUpDate || '', results: record.results.map(({ id, name, result }) => ({ id, name, result })),
    // Kết quả cận lâm sàng có cấu trúc (xét nghiệm kèm khoảng tham chiếu theo loài, ảnh + kết luận CĐHA); không kèm ghi chú nội bộ.
    orders: projectClinicalOrders(record.serviceOrders), prescriptions: record.prescriptions.map(projectPrescription) };
}
