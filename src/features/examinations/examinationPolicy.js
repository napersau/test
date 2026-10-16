import { clinicToday, validDate } from '../catalog/catalogPolicy';
export const EXAM_TEXT_FIELDS = ['reason', 'symptoms', 'examination', 'preliminaryAssessment', 'diagnosis', 'diagnosisReason', 'treatmentPlan', 'recommendations', 'doctorOnlyNotes', 'followUpDate'];
export const EXAM_METRICS = {
  weight: { label: 'Cân nặng đo lúc khám', unit: 'kg', max: 500, step: '0.01' },
  temperature: { label: 'Nhiệt độ đo lúc khám', unit: '°C', max: 100, step: '0.1' },
  heartRate: { label: 'Nhịp tim', unit: 'lần/phút', max: 1000, step: '1' },
  respiratoryRate: { label: 'Nhịp thở', unit: 'lần/phút', max: 1000, step: '1' },
};
export const EXAM_FIELDS = [...EXAM_TEXT_FIELDS, ...Object.keys(EXAM_METRICS), 'undetermined'];
export const EMPTY_EXAM = { ...Object.fromEntries([...EXAM_TEXT_FIELDS, ...Object.keys(EXAM_METRICS)].map((key) => [key, ''])), undetermined: false };
export const EXAM_TABS = { clinical: 'Khám lâm sàng', conclusion: 'Chẩn đoán & điều trị', history: 'Lịch sử khám' };
export const medicalRecordCode = (id) => `MR-${id.replace(/[^a-z0-9]/gi, '').slice(-10).toUpperCase()}`;
export const DIAGNOSIS_STATES = { EMPTY: 'Chưa ghi chẩn đoán', PRELIMINARY: 'Đánh giá sơ bộ', DRAFT: 'Chẩn đoán đang soạn', FINAL: 'Chẩn đoán đã chốt', UNDETERMINED: 'Chưa xác định' };
export function diagnosisState(record) {
  if (record.status === 'COMPLETED') return record.undetermined ? 'UNDETERMINED' : 'FINAL';
  if (record.diagnosis?.trim() || (record.undetermined && record.diagnosisReason?.trim())) return 'DRAFT';
  return record.preliminaryAssessment?.trim() ? 'PRELIMINARY' : 'EMPTY';
}
export const EXAM_PAGE_MODES = {
  examination: { title: 'Hồ sơ khám bệnh', heading: 'Khám bệnh', back: '/vet/today', backLabel: 'Bàn khám bệnh', tab: 'clinical', start: 'Bắt đầu khám' },
  records: { title: 'Lập hồ sơ khám', heading: 'Hồ sơ khám', back: '/vet/records', backLabel: 'Danh sách hồ sơ khám', tab: 'clinical', start: 'Lập hồ sơ và bắt đầu khám' },
  diagnoses: { title: 'Triệu chứng & chẩn đoán', heading: 'Triệu chứng & chẩn đoán', back: '/vet/diagnoses', backLabel: 'Danh sách triệu chứng & chẩn đoán', tab: 'clinical', start: 'Lập hồ sơ và bắt đầu khám' },
};
export const examDraftKey = (actorId, appointmentId) => `pawcare_exam_draft_v1:${actorId}:${appointmentId}`;
export const isExaminationDraft = (draft) => !!draft && Number.isInteger(draft.version) && draft.version > 0 && Number.isInteger(draft.appointmentVersion) && draft.appointmentVersion > 0
  && !!draft.values && EXAM_TEXT_FIELDS.every((field) => typeof draft.values[field] === 'string' && draft.values[field].length <= 3000)
  && Object.keys(EXAM_METRICS).every((field) => draft.values[field] === null || ['number', 'string'].includes(typeof draft.values[field]))
  && typeof draft.values.undetermined === 'boolean' && Number.isFinite(Date.parse(draft.savedAt));
export const examError = (message, fieldErrors = {}, status = 400) => Object.assign(new Error(message), { fieldErrors, status, code: status === 409 ? 'CONFLICT' : 'INVALID_EXAMINATION' });
export function examValues(record) {
  return Object.fromEntries(EXAM_FIELDS.map((key) => [key, record[key] ?? EMPTY_EXAM[key]]));
}
export function validateExamination(values, final = false) {
  const errors = {};
  EXAM_TEXT_FIELDS.forEach((key) => { if (typeof values[key] !== 'string' || values[key].length > (key === 'followUpDate' ? 10 : 3000)) errors[key] = 'Nội dung tối đa 3.000 ký tự.'; });
  if (typeof values.undetermined !== 'boolean') errors.undetermined = 'Kiểm tra tùy chọn chẩn đoán.';
  Object.entries(EXAM_METRICS).forEach(([key, spec]) => {
    const value = values[key]; if (value === '' || value === null) return;
    const number = Number(value); const factor = 1 / Number(spec.step);
    if (!['string', 'number'].includes(typeof value) || !String(value).trim() || !Number.isFinite(number) || number <= 0 || number > spec.max || Math.abs(number * factor - Math.round(number * factor)) > 0.00001) errors[key] = `Nhập số dương không quá ${spec.max}, bước ${spec.step}; để trống nếu chưa đo.`;
  });
  if (values.followUpDate && (!validDate(values.followUpDate) || values.followUpDate < clinicToday())) errors.followUpDate = 'Ngày tái khám không được trước hôm nay.';
  if (final) {
    // Bắt buộc: lý do/triệu chứng, kết quả thăm khám và chẩn đoán xác định. Phác đồ, lời dặn chỉ cần khi bác sĩ thấy cần.
    ['reason', 'symptoms', 'examination'].forEach((key) => { if (typeof values[key] !== 'string' || !values[key].trim()) errors[key] = 'Nhập nội dung trước khi chốt đợt khám.'; });
    const key = values.undetermined ? 'diagnosisReason' : 'diagnosis';
    if (typeof values[key] !== 'string' || !values[key].trim()) errors[key] = values.undetermined ? 'Nêu lý do chưa xác định chẩn đoán.' : 'Vui lòng nhập kết luận chẩn đoán xác định trước khi chốt đợt khám.';
    if (values.acknowledged !== true) errors.acknowledged = 'Xác nhận đã kiểm tra hồ sơ trước khi chốt đợt khám.';
  }
  return errors;
}
export function cleanExamination(input) {
  return { ...Object.fromEntries(EXAM_TEXT_FIELDS.map((key) => [key, input[key].trim()])),
    ...Object.fromEntries(Object.keys(EXAM_METRICS).map((key) => [key, input[key] === '' || input[key] === null ? null : Number(input[key])])), undetermined: input.undetermined };
}

// Vòng đời Visit lưu trên lịch hẹn; hồ sơ khám đi kèm có trạng thái tương ứng (IN_PROGRESS = đang mở, COMPLETED = đã chốt chuyên môn).
export const RECORD_STATUS_FOR_VISIT = { IN_PROGRESS: 'IN_PROGRESS', WAITING_RESULTS: 'IN_PROGRESS', RESULTS_READY: 'IN_PROGRESS', WAITING_PAYMENT: 'COMPLETED', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' };
// Lượt khám còn mở (thú cưng đang ở phòng khám / chờ xử lý) — dùng chống tiếp nhận trùng.
export const OPEN_VISIT_STATUSES = ['CHECKED_IN', 'IN_PROGRESS', 'WAITING_RESULTS', 'RESULTS_READY', 'WAITING_PAYMENT'];
export const VISIT_CANCEL_REASONS = { OWNER_REQUEST: 'Chủ nuôi từ chối khám / không tiếp tục', CREATED_BY_MISTAKE: 'Tạo nhầm lượt khám', EMERGENCY: 'Chuyển viện / tình huống khẩn cấp', OTHER: 'Lý do khác' };
export const CALL_LIMIT = 3; // Sau 3 lần gọi mà khách chưa vào phòng mới được báo vắng mặt.
// Khám sàng lọc trước tiêm phòng / tẩy giun: bắt buộc đo thân nhiệt; thú cưng sốt thì không đủ điều kiện thực hiện.
export const SCREENED_SERVICE_TYPES = ['VACCINATION', 'DEWORMING'];
export const FEVER_THRESHOLD = 39.5;
