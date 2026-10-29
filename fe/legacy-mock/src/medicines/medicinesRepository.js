import { clinicToday, dateOffset, daysUntil } from '../catalog/catalogPolicy';
import { assertFields, assertUniqueCode, catalogId, commitCatalog, readCatalog, requireCatalogAdmin } from '../catalog/catalogStorage';
import { validateBatch, validateCatalog } from '../catalog/catalogSchema';
import { findAccount, requireReceptionist, requireVeterinarian } from '../users/usersRepository';
import { recordActivity } from '../activity/auditStorage';

export const MEDICINES_KEY = 'pawcare_medicines_v1';
export const MEDICINES_CHANGED = 'pawcare:medicines-changed';
const ACTIVE_INGREDIENTS = ['Amoxicillin', 'Praziquantel + Pyrantel', 'Kháng nguyên vaccine tổng hợp', 'Vitamin A, D, E, nhóm B', 'Chlorhexidine', 'Hydrocortisone', 'Lactobacillus'];
const DOSAGE_BY_UNIT = { TABLET: 'TABLET', SACHET: 'POWDER', TUBE: 'OINTMENT', BOTTLE: 'ORAL_SOLUTION', DOSE: 'INJECTION', VIAL: 'INJECTION', AMPOULE: 'INJECTION' };
function seedMedicines() {
  const items = [
    ['Amoxicillin 250 mg', 'ANTIBIOTIC', 'TABLET', 8000, 30],
    ['Thuốc tẩy giun thú y', 'ANTIPARASITIC', 'TABLET', 45000, 20],
    ['Vaccine tổng hợp chó', 'VACCINE', 'DOSE', 280000, 10],
    ['Vitamin tổng hợp', 'SUPPLEMENT', 'BOTTLE', 120000, 15],
    ['Dung dịch sát khuẩn', 'OTHER', 'BOTTLE', 60000, 10],
    ['Gel chăm sóc da', 'OTHER', 'TUBE', 95000, 10],
    ['Men vi sinh thú y', 'SUPPLEMENT', 'SACHET', 18000, 25],
  ];
  const quantities = [120, 8, 25, 6, 40, 0, 30];
  const medicines = items.map(([name, category, unit, salePrice, minStockLevel], index) => ({
    id: `medicine-${index + 1}`, code: `TH00${index + 1}`, name, category, unit, salePrice, minStockLevel,
    activeIngredient: ACTIVE_INGREDIENTS[index], dosageForm: DOSAGE_BY_UNIT[unit] || 'OTHER',
    description: '', status: index === 5 ? 'INACTIVE' : 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }));
  const batches = medicines.filter((_, index) => quantities[index] > 0).map((medicine) => {
    const index = medicines.indexOf(medicine);
    return { id: `batch-${index + 1}`, medicineId: medicine.id, batchNo: `LOT-00${index + 1}`, expiry: dateOffset(index === 2 ? 18 : index === 3 ? -7 : 180),
      remaining: quantities[index], quantity: quantities[index], importPrice: Math.round(medicine.salePrice * 0.65), importedAt: new Date().toISOString() };
  });
  return { medicines, batches, transactions: [] };
}
function readInventory() {
  const data = readCatalog(MEDICINES_KEY, seedMedicines);
  if (!data || !Array.isArray(data.medicines) || !Array.isArray(data.batches)) throw new Error('Dữ liệu thuốc và lô hàng không hợp lệ.');
  if (data.transactions !== undefined && !Array.isArray(data.transactions)) throw new Error('Nhật ký kho không hợp lệ.');
  // Bổ sung hoạt chất / dạng bào chế cho thuốc lưu từ phiên demo cũ.
  return { ...data, transactions: data.transactions || [],
    medicines: data.medicines.map((item) => (item && (item.dosageForm === undefined || item.activeIngredient === undefined) ? { ...item, dosageForm: item.dosageForm || 'OTHER', activeIngredient: item.activeIngredient || '' } : item)) };
}
export function stockSummary(medicine, batches, today = clinicToday()) {
  const lots = batches.filter((batch) => batch.medicineId === medicine.id);
  const availableStock = lots.filter((batch) => batch.expiry >= today).reduce((sum, batch) => sum + batch.remaining, 0);
  const expiredStock = lots.filter((batch) => batch.expiry < today).reduce((sum, batch) => sum + batch.remaining, 0);
  const nearExpiryBatches = lots.filter((batch) => batch.remaining > 0 && daysUntil(batch.expiry, today) >= 0 && daysUntil(batch.expiry, today) <= 30).length;
  return { totalStock: availableStock + expiredStock, availableStock, expiredStock, nearExpiryBatches, lowStock: availableStock <= medicine.minStockLevel };
}
export function listMedicines(actorId) {
  requireCatalogAdmin(actorId);
  const { medicines, batches } = readInventory();
  const { transactions } = readInventory();
  return medicines.map((medicine) => ({ ...medicine, ...stockSummary(medicine, batches), batches: batches.filter((batch) => batch.medicineId === medicine.id).sort((a, b) => a.expiry.localeCompare(b.expiry)),
    transactions: transactions.filter((entry) => entry.medicineId === medicine.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }));
}
export function listVeterinarianMedicines(actorId) {
  requireVeterinarian(actorId);
  const { medicines, batches } = readInventory();
  if (medicines.some((item) => !item || typeof item.id !== 'string' || !item.id || Object.keys(validateCatalog(item, 'medicine')).length)
    || new Set(medicines.map((item) => item.id)).size !== medicines.length) throw new Error('Dữ liệu thuốc không hợp lệ.');
  return medicines.filter((item) => item.status === 'ACTIVE').map((item) => ({ id: item.id, code: item.code, name: item.name, category: item.category, unit: item.unit, salePrice: item.salePrice, activeIngredient: item.activeIngredient || '', availableStock: stockSummary(item, batches).availableStock }));
}
// Tồn khả dụng (lô chưa hết hạn) để lễ tân đối chiếu khi phát thuốc.
export function listDispenseStock(actorId) {
  requireReceptionist(actorId);
  const { medicines, batches } = readInventory();
  return medicines.map((medicine) => ({ id: medicine.id, name: medicine.name, activeIngredient: medicine.activeIngredient || '', availableStock: stockSummary(medicine, batches).availableStock }));
}
export function saveMedicine(actorId, values, id) {
  requireCatalogAdmin(actorId);
  const data = readInventory();
  const current = id ? data.medicines.find((item) => item.id === id) : null;
  if (id && !current) throw new Error('Không tìm thấy thuốc.');
  const merged = { ...current, ...values };
  assertFields(validateCatalog(merged, 'medicine'));
  assertUniqueCode(data.medicines, merged.code, id);
  if (current && current.unit !== merged.unit && data.batches.some((batch) => batch.medicineId === id)) assertFields({ unit: 'Không thể đổi đơn vị của thuốc đã có lô hàng.' });
  const now = new Date().toISOString();
  const record = {
    id: current?.id || catalogId(), code: merged.code.trim().toUpperCase(), name: merged.name.trim(), category: merged.category,
    unit: merged.unit, dosageForm: merged.dosageForm, activeIngredient: (merged.activeIngredient || '').trim(), salePrice: Number(merged.salePrice), minStockLevel: Number(merged.minStockLevel), status: merged.status,
    description: (merged.description || '').trim(), createdAt: current?.createdAt || now, updatedAt: now,
  };
  commitCatalog(MEDICINES_KEY, MEDICINES_CHANGED, { ...data, medicines: id ? data.medicines.map((item) => item.id === id ? record : item) : [record, ...data.medicines] });
  recordActivity({ actor: findAccount(actorId), module: 'MEDICINES', action: !current ? 'MEDICINE_CREATE' : current.status !== record.status ? 'MEDICINE_STATUS' : 'MEDICINE_UPDATE',
    targetId: record.id, targetName: `${record.code} · ${record.name}`, fields: current ? Object.keys(record).filter((field) => current[field] !== record[field]) : [] });
  return record;
}
// Nhật ký biến động kho (IMPORT / EXPORT_PRESCRIPTION / ADJUSTMENT): số lượng ±, tồn sau giao dịch, người thực hiện.
function stockTransaction(actorId, medicineId, type, quantity, batchesAfter, { notes = '', referenceId = null } = {}) {
  const balanceAfter = batchesAfter.filter((batch) => batch.medicineId === medicineId).reduce((sum, batch) => sum + batch.remaining, 0);
  return { id: catalogId(), medicineId, type, quantity, balanceAfter, referenceId, notes, createdBy: actorId, createdAt: new Date().toISOString() };
}
// Điều chỉnh tồn một lô sau kiểm kê (thừa/thiếu, hao hụt, hết hạn). Bắt buộc có lý do; không làm tồn lô xuống âm.
export function adjustStock(actorId, medicineId, batchId, values) {
  requireCatalogAdmin(actorId);
  const data = readInventory();
  const medicine = data.medicines.find((item) => item.id === medicineId);
  const batch = data.batches.find((item) => item.id === batchId && item.medicineId === medicineId);
  if (!medicine || !batch) throw new Error('Không tìm thấy thuốc hoặc lô hàng.');
  const errors = {};
  const delta = Number(values.delta);
  if (values.delta === '' || !Number.isSafeInteger(delta) || delta === 0) errors.delta = 'Nhập số lượng điều chỉnh là số nguyên khác 0 (dương để tăng, âm để giảm).';
  else if (batch.remaining + delta < 0) errors.delta = `Không thể giảm quá số còn lại của lô (${batch.remaining}).`;
  const reason = (values.reason || '').trim();
  if (reason.length < 3 || reason.length > 255) errors.reason = 'Nhập lý do điều chỉnh (3–255 ký tự), ví dụ kiểm kê, hao hụt, hết hạn.';
  assertFields(errors);
  const batches = data.batches.map((item) => (item.id === batchId ? { ...item, remaining: item.remaining + delta } : item));
  const transaction = stockTransaction(actorId, medicineId, 'ADJUSTMENT', delta, batches, { notes: `${batch.batchNo}: ${reason}`, referenceId: batchId });
  commitCatalog(MEDICINES_KEY, MEDICINES_CHANGED, { ...data, batches, transactions: [...data.transactions, transaction] });
  recordActivity({ actor: findAccount(actorId), module: 'MEDICINES', action: 'STOCK_ADJUST', targetId: batchId, targetName: `${medicine.code} · ${medicine.name} · ${batch.batchNo}` });
  return transaction;
}
// Xuất kho theo đơn: kiểm tra đủ tồn khả dụng cho TẤT CẢ dòng trước khi trừ (thiếu một thuốc thì không thay đổi gì), trừ theo lô gần hết hạn trước,
// ghi dòng nhật ký EXPORT_PRESCRIPTION cho từng thuốc. Chỉ lễ tân gọi sau khi hóa đơn đã thanh toán.
export function exportPrescription(actorId, lines, referenceId) {
  requireReceptionist(actorId);
  const data = readInventory(); const today = clinicToday(); const need = new Map();
  lines.forEach((line) => need.set(line.medicineId, (need.get(line.medicineId) || 0) + line.quantity));
  need.forEach((quantity, medicineId) => {
    const medicine = data.medicines.find((item) => item.id === medicineId);
    if (!medicine) throw new Error('Không thể xuất kho: thuốc trong đơn không còn trong danh mục. Không có thay đổi nào được ghi nhận.');
    const available = stockSummary(medicine, data.batches, today).availableStock;
    if (available < quantity) throw new Error(`Không thể xuất kho: Thuốc ${medicine.name} trong kho không đủ số lượng (cần ${quantity}, còn ${available}). Không có thay đổi nào được ghi nhận.`);
  });
  const batches = data.batches.map((batch) => ({ ...batch })); const transactions = [];
  need.forEach((quantity, medicineId) => {
    let left = quantity;
    batches.filter((batch) => batch.medicineId === medicineId && batch.expiry >= today && batch.remaining > 0).sort((a, b) => a.expiry.localeCompare(b.expiry)).forEach((batch) => {
      const take = Math.min(left, batch.remaining); batch.remaining -= take; left -= take;
    });
    transactions.push(stockTransaction(actorId, medicineId, 'EXPORT_PRESCRIPTION', -quantity, batches, { notes: 'Xuất theo đơn thuốc', referenceId }));
  });
  commitCatalog(MEDICINES_KEY, MEDICINES_CHANGED, { ...data, batches, transactions: [...data.transactions, ...transactions] });
  return transactions;
}
export function importBatch(actorId, medicineId, values) {
  requireCatalogAdmin(actorId);
  const data = readInventory();
  const medicine = data.medicines.find((item) => item.id === medicineId);
  if (!medicine) throw new Error('Không tìm thấy thuốc.');
  if (medicine.status !== 'ACTIVE') throw new Error('Kích hoạt thuốc trước khi nhập lô mới.');
  assertFields(validateBatch(values));
  if (data.batches.some((batch) => batch.medicineId === medicineId && batch.batchNo.toUpperCase() === values.batchNo.trim().toUpperCase())) assertFields({ batchNo: 'Số lô này đã tồn tại cho thuốc này.' });
  const batch = { id: catalogId(), medicineId, batchNo: values.batchNo.trim().toUpperCase(), expiry: values.expiry,
    quantity: Number(values.quantity), remaining: Number(values.quantity), importPrice: Number(values.importPrice), importedAt: new Date().toISOString() };
  const transaction = stockTransaction(actorId, medicineId, 'IMPORT', batch.quantity, [...data.batches, batch], { notes: `Nhập lô ${batch.batchNo}`, referenceId: batch.id });
  commitCatalog(MEDICINES_KEY, MEDICINES_CHANGED, { ...data, batches: [...data.batches, batch], transactions: [...data.transactions, transaction] });
  recordActivity({ actor: findAccount(actorId), module: 'MEDICINES', action: 'BATCH_IMPORT', targetId: batch.id, targetName: `${medicine.code} · ${medicine.name} · ${batch.batchNo}` });
  return batch;
}
export const medicinesRepository = { list: listMedicines, save: saveMedicine, importBatch, adjustStock, event: MEDICINES_CHANGED };
