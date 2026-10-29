import { CALL_LIMIT } from '../examinations/examinationPolicy';

export { CALL_LIMIT };
export const ROOM_TYPES = {
  LABORATORY: { label: 'Phòng Xét nghiệm', short: 'Xét nghiệm', path: '/vet/lab', icon: 'activity', start: 'Bắt đầu thực hiện', startedLabel: 'Đang thực hiện' },
  IMAGING: { label: 'Phòng Chẩn đoán hình ảnh', short: 'CĐHA', path: '/vet/imaging', icon: 'document', start: 'Bắt đầu chụp / siêu âm', startedLabel: 'Đang chụp / siêu âm' },
};
export const ROOM_TABS = { QUEUE: 'Hàng đợi', IN_PROGRESS: 'Đang thực hiện', POSTPONED: 'Ca tạm hoãn', DONE: 'Hoàn tất hôm nay' };
export const LAB_EVALUATIONS = { LOW: { label: 'Thấp', tone: 'blue' }, NORMAL: { label: 'Bình thường', tone: 'green' }, HIGH: { label: 'Cao', tone: 'red' } };
export const CROSS_BADGES = {
  LAB_COLLECTING: { icon: '🟡', label: 'Đang lấy máu bên phòng Lab', tone: 'amber' },
  LAB_SAMPLED: { icon: '🟢', label: 'Đã lấy máu xong, sẵn sàng chụp', tone: 'green' },
};
export const roomKey = (appointmentId, orderId) => `${appointmentId}~${orderId}`;
export const parseRoomKey = (key) => { const [appointmentId, orderId] = String(key).split('~'); return { appointmentId, orderId }; };

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'dcm', 'dicom'];
// Kiểm tra tệp ảnh CĐHA: JPG / PNG / DICOM, tối đa 10MB. Trả về thông báo lỗi hoặc ''.
export function imageFileError(file) {
  const extension = String(file.name || '').split('.').pop().toLowerCase();
  if (!IMAGE_EXTENSIONS.includes(extension)) return `"${file.name}" không đúng định dạng. Chỉ nhận JPG, PNG hoặc DICOM.`;
  if (!(file.size > 0)) return `"${file.name}" là tệp rỗng. Vui lòng chọn lại.`;
  if (file.size > IMAGE_MAX_BYTES) return `"${file.name}" vượt quá 10MB. Vui lòng chọn tệp nhỏ hơn.`;
  return '';
}
export const MAX_IMAGES = 8;
export const MAX_STORED_DATA_URL = 450000; // ~450 KB mỗi ảnh lưu trong bản demo (localStorage).

export function validateImaging(values) {
  const errors = {};
  if (typeof values.description !== 'string' || !values.description.trim() || values.description.length > 3000) errors.description = 'Nhập mô tả hình ảnh (tối đa 3.000 ký tự).';
  if (typeof values.conclusion !== 'string' || !values.conclusion.trim() || values.conclusion.length > 3000) errors.conclusion = 'Nhập kết luận chẩn đoán hình ảnh (tối đa 3.000 ký tự).';
  if (!Array.isArray(values.images) || !values.images.length) errors.images = 'Tải lên ít nhất một ảnh siêu âm / X-quang.';
  else if (values.images.length > MAX_IMAGES) errors.images = `Tối đa ${MAX_IMAGES} ảnh cho một chỉ định.`;
  return errors;
}
export function validateLabValues(items, values) {
  const errors = {};
  items.forEach((item) => {
    const raw = values?.[item.id];
    if (raw === '' || raw === undefined || raw === null || !Number.isFinite(Number(raw))) errors[item.id] = `Nhập giá trị ${item.code}.`;
    else if (Number(raw) < 0 || Number(raw) > 1e6) errors[item.id] = `${item.code} phải là số không âm, hợp lý.`;
  });
  return errors;
}
