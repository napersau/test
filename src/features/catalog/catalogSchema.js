import { CATALOG_STATUSES, DOSAGE_FORMS, MEDICINE_CATEGORIES, MEDICINE_UNITS, SERVICE_TYPES, clinicToday, validDate } from './catalogPolicy';

export function validNumber(value, minimum = 0, maximum = 1e12) {
  return (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
    && Number.isSafeInteger(Number(value)) && Number(value) >= minimum && Number(value) <= maximum;
}
export function validateCatalog(values, kind) {
  const errors = {};
  if (!/^[a-z0-9][a-z0-9_-]{1,29}$/i.test(values.code?.trim() || '')) errors.code = 'Mã gồm 2–30 ký tự chữ, số, dấu - hoặc _.';
  if (!values.name?.trim() || values.name.trim().length > 120) errors.name = 'Nhập tên, tối đa 120 ký tự.';
  if (!CATALOG_STATUSES[values.status]) errors.status = 'Chọn trạng thái hợp lệ.';
  if ((values.description || '').length > 1000) errors.description = 'Mô tả tối đa 1.000 ký tự.';
  const priceKey = kind === 'service' ? 'price' : 'salePrice';
  if (!validNumber(values[priceKey])) errors[priceKey] = 'Nhập giá nguyên không âm, tối đa 1.000 tỷ đồng.';
  if (kind === 'service') {
    if (!SERVICE_TYPES[values.serviceType]) errors.serviceType = 'Chọn nhóm dịch vụ.';
  } else {
    if (!MEDICINE_CATEGORIES[values.category]) errors.category = 'Chọn nhóm thuốc.';
    if (!MEDICINE_UNITS[values.unit]) errors.unit = 'Chọn đơn vị tính.';
    if (!DOSAGE_FORMS[values.dosageForm]) errors.dosageForm = 'Chọn dạng bào chế.';
    if ((values.activeIngredient || '').length > 150) errors.activeIngredient = 'Hoạt chất tối đa 150 ký tự.';
    if (!validNumber(values.minStockLevel, 0, 1e9)) errors.minStockLevel = 'Nhập ngưỡng cảnh báo tồn nguyên không âm, tối đa 1 tỷ.';
  }
  return errors;
}
export function validateBatch(values) {
  const errors = {};
  if (!/^[a-z0-9][a-z0-9_/-]{1,39}$/i.test(values.batchNo?.trim() || '')) errors.batchNo = 'Số lô gồm 2–40 ký tự chữ, số, dấu -, / hoặc _.';
  if (!validDate(values.expiry) || values.expiry < clinicToday()) errors.expiry = 'Chọn ngày hết hạn từ hôm nay trở đi.';
  if (!validNumber(values.quantity, 1, 1e9)) errors.quantity = 'Số lượng phải là số nguyên dương, tối đa 1 tỷ.';
  if (!validNumber(values.importPrice)) errors.importPrice = 'Nhập giá nhập nguyên không âm (VND/đơn vị).';
  return errors;
}
