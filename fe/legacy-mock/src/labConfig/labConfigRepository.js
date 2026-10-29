import { assertFields, catalogId, commitCatalog, readCatalog, requireCatalogAdmin } from '../catalog/catalogStorage';
import { findAccount, requireVeterinarian } from '../users/usersRepository';
import { recordActivity } from '../activity/auditStorage';

export const LAB_CONFIG_KEY = 'pawcare_lab_config_v1';
export const LAB_CONFIG_CHANGED = 'pawcare:lab-config-changed';
// Khoảng tham chiếu phụ thuộc loài; phạm vi xét nghiệm của phòng khám là Chó và Mèo.
export const LAB_SPECIES = { DOG: 'Chó', CAT: 'Mèo' };

// [mã, tên, đơn vị, mô tả, Chó [min, max], Mèo [min, max]]
const SEED = [
  ['WBC', 'Bạch cầu', '10^9/L', 'Số lượng bạch cầu, phản ánh viêm/nhiễm trùng', [6, 17], [5.5, 19.5]],
  ['RBC', 'Hồng cầu', '10^12/L', 'Số lượng hồng cầu, đánh giá thiếu máu', [5.5, 8.5], [5, 10]],
  ['HGB', 'Huyết sắc tố', 'g/dL', 'Lượng hemoglobin trong máu', [12, 18], [8, 15]],
  ['HCT', 'Dung tích hồng cầu', '%', 'Tỷ lệ thể tích hồng cầu trong máu', [37, 55], [24, 45]],
  ['PLT', 'Tiểu cầu', '10^9/L', 'Số lượng tiểu cầu, đánh giá đông máu', [200, 500], [300, 700]],
  ['GLUCOSE', 'Đường huyết', 'mmol/L', 'Nồng độ glucose trong máu', [4.11, 7.95], [3.89, 7.99]],
];
function seedLabConfig() {
  const items = SEED.map(([code, name, unit, description], index) => ({ id: `lab-item-${index + 1}`, code, name, unit, description }));
  const ranges = SEED.flatMap(([, , , , dog, cat], index) => [
    { id: `lab-range-${index + 1}-dog`, itemId: `lab-item-${index + 1}`, species: 'DOG', min: dog[0], max: dog[1] },
    { id: `lab-range-${index + 1}-cat`, itemId: `lab-item-${index + 1}`, species: 'CAT', min: cat[0], max: cat[1] },
  ]);
  return { items, ranges };
}
function readConfig() {
  const data = readCatalog(LAB_CONFIG_KEY, seedLabConfig);
  if (!data || !Array.isArray(data.items) || !Array.isArray(data.ranges)) throw new Error('Dữ liệu cấu hình xét nghiệm không hợp lệ.');
  return data;
}
const isNumber = (value) => value !== '' && value !== null && Number.isFinite(Number(value));

// Mỗi chỉ số kèm khoảng tham chiếu của từng loài: { items: [{ ..., ranges: { DOG: { min, max }, CAT: {...} } }] }
export function listLabItems(actorId) {
  requireCatalogAdmin(actorId);
  const { items, ranges } = readConfig();
  return items.map((item) => ({ ...item, ranges: Object.fromEntries(Object.keys(LAB_SPECIES).map((species) => {
    const range = ranges.find((entry) => entry.itemId === item.id && entry.species === species);
    return [species, range ? { min: range.min, max: range.max } : null];
  })) }));
}

// Bác sĩ / kỹ thuật viên phòng Lab đọc chỉ số kèm khoảng tham chiếu để nhập kết quả (không sửa được).
export function listLabReferences(actorId) {
  requireVeterinarian(actorId);
  const { items, ranges } = readConfig();
  return items.map((item) => ({ ...item, ranges: Object.fromEntries(Object.keys(LAB_SPECIES).map((species) => {
    const range = ranges.find((entry) => entry.itemId === item.id && entry.species === species);
    return [species, range ? { min: range.min, max: range.max } : null];
  })) }));
}
// LOW / NORMAL / HIGH theo khoảng tham chiếu của đúng loài; '' khi chưa có khoảng cho loài đó.
export function evaluateLabValue(value, range) {
  if (!range || value === '' || value === null || value === undefined || !Number.isFinite(Number(value))) return '';
  return Number(value) < range.min ? 'LOW' : Number(value) > range.max ? 'HIGH' : 'NORMAL';
}
export function validateLabItem(values) {
  const errors = {};
  if (!/^[a-z0-9][a-z0-9_-]{0,29}$/i.test(values.code?.trim() || '')) errors.code = 'Mã gồm 1–30 ký tự chữ, số, dấu - hoặc _ (ví dụ WBC).';
  if (!values.name?.trim() || values.name.trim().length > 100) errors.name = 'Nhập tên chỉ số, tối đa 100 ký tự.';
  if (!values.unit?.trim() || values.unit.trim().length > 30) errors.unit = 'Nhập đơn vị đo, tối đa 30 ký tự.';
  if ((values.description || '').length > 255) errors.description = 'Ý nghĩa lâm sàng tối đa 255 ký tự.';
  Object.keys(LAB_SPECIES).forEach((species) => {
    const range = values.ranges?.[species] || {};
    if (!isNumber(range.min) || !isNumber(range.max)) errors[`range-${species}`] = `Nhập đủ ngưỡng dưới và ngưỡng trên cho loài ${LAB_SPECIES[species]}.`;
    else if (Number(range.min) >= Number(range.max)) errors[`range-${species}`] = 'Ngưỡng dưới phải nhỏ hơn ngưỡng trên.';
    else if (Number(range.min) < 0) errors[`range-${species}`] = 'Ngưỡng không được âm.';
  });
  return errors;
}

export function saveLabItem(actorId, values, id) {
  requireCatalogAdmin(actorId);
  const data = readConfig();
  const current = id ? data.items.find((item) => item.id === id) : null;
  if (id && !current) throw new Error('Không tìm thấy chỉ số xét nghiệm.');
  const errors = validateLabItem(values);
  if (!errors.code && data.items.some((item) => item.id !== id && item.code.toUpperCase() === values.code.trim().toUpperCase())) errors.code = 'Mã chỉ số này đã được sử dụng.';
  assertFields(errors);
  const item = { id: current?.id || catalogId(), code: values.code.trim().toUpperCase(), name: values.name.trim(), unit: values.unit.trim(), description: (values.description || '').trim() };
  const ranges = [...data.ranges.filter((entry) => entry.itemId !== item.id), ...Object.keys(LAB_SPECIES).map((species) => ({
    id: `${item.id}-${species.toLowerCase()}`, itemId: item.id, species, min: Number(values.ranges[species].min), max: Number(values.ranges[species].max) }))];
  // Kết quả đã đo lưu snapshot ngưỡng tại thời điểm xét nghiệm nên đổi cấu hình ở đây không làm đổi kết quả cũ.
  commitCatalog(LAB_CONFIG_KEY, LAB_CONFIG_CHANGED, { items: id ? data.items.map((entry) => (entry.id === id ? item : entry)) : [...data.items, item], ranges });
  recordActivity({ actor: findAccount(actorId), module: 'LAB_CONFIG', action: current ? 'LAB_ITEM_UPDATE' : 'LAB_ITEM_CREATE', targetId: item.id,
    targetName: `${item.code} · ${item.name}`, fields: current ? ['code', 'name', 'unit', 'description'].filter((field) => current[field] !== item[field]) : [] });
  return item;
}
export const labConfigRepository = { list: listLabItems, save: saveLabItem, event: LAB_CONFIG_CHANGED };
