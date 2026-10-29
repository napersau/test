import { RESULT_SERVICE_TYPES, normalizeServiceType } from '../catalog/catalogPolicy';
import { assertFields, assertUniqueCode, catalogId, commitCatalog, readCatalog, requireCatalogAdmin } from '../catalog/catalogStorage';
import { validateCatalog } from '../catalog/catalogSchema';
import { findAccount, requireReceptionist, requireVeterinarian } from '../users/usersRepository';
import { recordActivity } from '../activity/auditStorage';
import { LAB_CONFIG_KEY } from '../labConfig/labConfigRepository';

export const SERVICES_KEY = 'pawcare_services_v1';
export const SERVICES_CHANGED = 'pawcare:services-changed';
const SEED_LAB_IDS = ['lab-item-1', 'lab-item-2', 'lab-item-3', 'lab-item-4', 'lab-item-5', 'lab-item-6'];
// Thứ tự seed giữ cố định (id service-N) để các màn khác tham chiếu: 1 khám, 2 xét nghiệm, 3 CĐHA.
const SEED = [
  ['EXAMINATION', 'Khám tổng quát', 150000, 'ACTIVE'], ['LABORATORY', 'Xét nghiệm máu CBC', 250000, 'ACTIVE'], ['IMAGING', 'Siêu âm ổ bụng', 200000, 'ACTIVE'],
  ['VACCINATION', 'Công tiêm vaccine', 50000, 'ACTIVE'], ['DEWORMING', 'Công tẩy giun', 30000, 'ACTIVE'], ['EXTERNAL_PARASITE', 'Trị ve, rận, bọ chét', 60000, 'ACTIVE'],
  ['PROCEDURE', 'Thay băng, rửa vết thương', 40000, 'INACTIVE'], ['INJECTION_INFUSION', 'Truyền dịch', 120000, 'ACTIVE'], ['SURGERY', 'Phẫu thuật triệt sản', 800000, 'ACTIVE'],
];
function seedServices() {
  const now = new Date().toISOString();
  return SEED.map(([serviceType, name, price, status], index) => ({
    id: `service-${index + 1}`, code: `DV00${index + 1}`, name, serviceType, price, description: '', status,
    requiresResult: RESULT_SERVICE_TYPES.includes(serviceType), allowsAttachment: serviceType === 'IMAGING',
    // Gói CBC gồm 5 chỉ số huyết học (seed cấu hình xét nghiệm có id lab-item-1..5).
    ...(serviceType === 'LABORATORY' ? { labItemIds: ['lab-item-1', 'lab-item-2', 'lab-item-3', 'lab-item-4', 'lab-item-5'] } : {}),
    createdAt: now, updatedAt: now,
  }));
}
function readServices() {
  const records = readCatalog(SERVICES_KEY, seedServices);
  if (!Array.isArray(records)) throw new Error('Dữ liệu dịch vụ không hợp lệ.');
  // Quy đổi mã nhóm cũ của các phiên demo trước sang 9 nhóm chuẩn.
  return records.map((item) => (item && item.serviceType && normalizeServiceType(item.serviceType) !== item.serviceType
    ? { ...item, serviceType: normalizeServiceType(item.serviceType), requiresResult: RESULT_SERVICE_TYPES.includes(normalizeServiceType(item.serviceType)), allowsAttachment: normalizeServiceType(item.serviceType) === 'IMAGING' } : item));
}
export function listServices(actorId) { requireCatalogAdmin(actorId); return readServices(); }
export function listVeterinarianServices(actorId) {
  requireVeterinarian(actorId);
  const records = readServices();
  if (records.some((item) => !item || typeof item.id !== 'string' || !item.id || Object.keys(validateCatalog(item, 'service')).length)
    || new Set(records.map((item) => item.id)).size !== records.length) throw new Error('Dữ liệu dịch vụ không hợp lệ.');
  return records.filter((item) => item.status === 'ACTIVE').map(({ id, code, name, serviceType, price, requiresResult, labItemIds }) => ({ id, code, name, serviceType, price, requiresResult, ...(serviceType === 'LABORATORY' ? { labItemIds: labItemIds || [] } : {}) }));
}
// Customer projection: only active consultation services, never the admin catalogue payload.
export function listBookableServices(actorId) {
  const actor = findAccount(actorId);
  if (actor?.role !== 'CUSTOMER' || actor.status !== 'ACTIVE') throw new Error('Chỉ khách hàng đang hoạt động được đặt lịch khám.');
  const records = readServices();
  if (records.some((service) => !service || Object.keys(validateCatalog(service, 'service')).length)) throw new Error('Dữ liệu dịch vụ không hợp lệ.');
  return records.filter((service) => service.status === 'ACTIVE' && service.serviceType === 'EXAMINATION')
    .map(({ id, name, price, description }) => ({ id, name, price, description }));
}

export function listReceptionExamServices(actorId) {
  requireReceptionist(actorId);
  const records = readServices();
  if (records.some((service) => !service || Object.keys(validateCatalog(service, 'service')).length)) throw new Error('Dữ liệu dịch vụ không hợp lệ.');
  return records.filter((service) => service.status === 'ACTIVE' && service.serviceType === 'EXAMINATION')
    .map(({ id, name, price }) => ({ id, name, price }));
}
export function saveService(actorId, values, id) {
  requireCatalogAdmin(actorId);
  const records = readServices();
  const current = id ? records.find((item) => item.id === id) : null;
  if (id && !current) throw new Error('Không tìm thấy dịch vụ.');
  const merged = { ...current, ...values };
  const errors = validateCatalog(merged, 'service');
  const labItemIds = merged.serviceType === 'LABORATORY' ? [...new Set(merged.labItemIds || [])] : [];
  // Gói xét nghiệm phải gắn với chỉ số cụ thể để phòng Lab biết cần nhập gì; chỉ kiểm khi form gửi danh sách chỉ số.
  if (merged.serviceType === 'LABORATORY' && (!current || 'labItemIds' in values)) {
    const known = JSON.parse(localStorage.getItem(LAB_CONFIG_KEY) || 'null')?.items?.map((item) => item.id) || SEED_LAB_IDS;
    if (!labItemIds.length) errors.labItemIds = 'Chọn ít nhất một chỉ số xét nghiệm cho dịch vụ này.';
    else if (labItemIds.some((itemId) => !known.includes(itemId))) errors.labItemIds = 'Có chỉ số xét nghiệm không tồn tại.';
  }
  assertFields(errors);
  assertUniqueCode(records, merged.code, id);
  const now = new Date().toISOString();
  const record = {
    id: current?.id || catalogId(), code: merged.code.trim().toUpperCase(), name: merged.name.trim(),
    serviceType: merged.serviceType, price: Number(merged.price), status: merged.status, description: (merged.description || '').trim(),
    requiresResult: RESULT_SERVICE_TYPES.includes(merged.serviceType), allowsAttachment: merged.serviceType === 'IMAGING',
    ...(merged.serviceType === 'LABORATORY' ? { labItemIds: labItemIds.length ? labItemIds : current?.labItemIds || [] } : {}),
    createdAt: current?.createdAt || now, updatedAt: now,
  };
  commitCatalog(SERVICES_KEY, SERVICES_CHANGED, id ? records.map((item) => item.id === id ? record : item) : [record, ...records]);
  recordActivity({ actor: findAccount(actorId), module: 'SERVICES', action: !current ? 'SERVICE_CREATE' : current.status !== record.status ? 'SERVICE_STATUS' : 'SERVICE_UPDATE',
    targetId: record.id, targetName: `${record.code} · ${record.name}`, fields: current ? Object.keys(record).filter((field) => JSON.stringify(current[field]) !== JSON.stringify(record[field])) : [] });
  return record;
}
export const servicesRepository = { list: listServices, save: saveService, event: SERVICES_CHANGED };
