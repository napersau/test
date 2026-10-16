import { clinicToday, validDate } from '../catalog/catalogPolicy';

export const PET_SPECIES = { DOG: 'Chó', CAT: 'Mèo', RABBIT: 'Thỏ', BIRD: 'Chim', OTHER: 'Khác' };
export const PET_GENDERS = { MALE: 'Đực', FEMALE: 'Cái', UNKNOWN: 'Chưa xác định' };
export const PET_STATUSES = { ACTIVE: 'Đang quản lý', ARCHIVED: 'Đã lưu trữ' };
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const EMPTY_PET = { name: '', species: 'DOG', breed: '', gender: 'UNKNOWN', birthDate: '', estimatedBirthDate: false,
  weight: '', color: '', microchip: '', neutered: false, allergies: '', notes: '', photo: '' };
const DEMO_PHOTOS = ['/images/landing/pet-daisy.jpg', '/images/landing/pet-bella.jpg'];

export function isPetPhoto(photo) {
  return photo === '' || DEMO_PHOTOS.includes(photo) || (typeof photo === 'string' && photo.length <= 800000
    && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(photo));
}

export function validatePet(values, today = clinicToday()) {
  const errors = {};
  if (typeof values.name !== 'string' || !values.name.trim() || values.name.trim().length > 60) errors.name = 'Nhập tên thú cưng từ 1 đến 60 ký tự.';
  if (!Object.keys(PET_SPECIES).includes(values.species)) errors.species = 'Vui lòng chọn loài thú cưng.';
  if (!Object.keys(PET_GENDERS).includes(values.gender)) errors.gender = 'Vui lòng chọn giới tính hợp lệ.';
  if (typeof values.birthDate !== 'string' || (values.birthDate && (!validDate(values.birthDate) || values.birthDate > today))) errors.birthDate = 'Ngày sinh phải hợp lệ và không ở tương lai.';
  if (values.estimatedBirthDate && !values.birthDate) errors.birthDate = 'Chọn ngày sinh trước khi đánh dấu ngày ước tính.';
  if (values.weight !== '' && values.weight !== null && values.weight !== undefined
    && (!['string', 'number'].includes(typeof values.weight) || !Number.isFinite(Number(values.weight)) || Number(values.weight) <= 0 || Number(values.weight) > 500
      || Math.abs(Number(values.weight) * 100 - Math.round(Number(values.weight) * 100)) > 0.000001)) errors.weight = 'Cân nặng từ 0,01 đến 500 kg, tối đa 2 chữ số thập phân.';
  ['breed', 'color', 'microchip'].forEach((field) => { if (typeof values[field] !== 'string' || values[field].length > 80) errors[field] = 'Thông tin này không được quá 80 ký tự.'; });
  ['allergies', 'notes'].forEach((field) => { if (typeof values[field] !== 'string' || values[field].length > 1000) errors[field] = 'Thông tin này không được quá 1.000 ký tự.'; });
  if (typeof values.neutered !== 'boolean' || typeof values.estimatedBirthDate !== 'boolean') errors.notes = 'Vui lòng kiểm tra các tùy chọn hồ sơ.';
  if (!isPetPhoto(values.photo)) errors.photo = 'Ảnh không hợp lệ. Chọn ảnh JPG, PNG hoặc WebP từ thiết bị.';
  return errors;
}

export function petAge(birthDate, estimated = false, today = clinicToday()) {
  if (!birthDate || !validDate(birthDate) || birthDate > today) return 'Chưa có ngày sinh';
  const [year, month, day] = birthDate.split('-').map(Number);
  const [currentYear, currentMonth, currentDay] = today.split('-').map(Number);
  const months = (currentYear - year) * 12 + currentMonth - month - (currentDay < day ? 1 : 0);
  const years = Math.floor(Math.max(0, months) / 12);
  const remainder = Math.max(0, months) % 12;
  const label = years ? `${years} tuổi${remainder ? ` ${remainder} tháng` : ''}` : remainder ? `${remainder} tháng` : 'Dưới 1 tháng';
  return estimated ? `Khoảng ${label.charAt(0).toLowerCase()}${label.slice(1)}` : label;
}

export const petWeight = (weight) => weight === null || weight === '' || weight === undefined ? 'Chưa cập nhật' : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(weight)} kg`;
