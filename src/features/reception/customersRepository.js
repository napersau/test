import { requireReceptionist, listReceptionAccounts, updateReceptionCustomer, assertReceptionContactUnique } from '../users/usersRepository';
import { recordActivity } from '../activity/auditStorage';
import { readCustomerProfiles, commitCustomerProfiles, customerDTO, customerError, validateCustomer, cleanCustomer, EMPTY_CUSTOMER, CUSTOMER_FIELDS } from './customerProfileStorage';

export function listReceptionCustomers(actorId) {
  requireReceptionist(actorId);
  return [...listReceptionAccounts(actorId), ...readCustomerProfiles().map((item) => customerDTO(item, 'WALK_IN'))]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function getReceptionCustomer(actorId, id) {
  const customer = listReceptionCustomers(actorId).find((item) => item.id === id);
  if (!customer) throw new Error('Không tìm thấy hồ sơ khách hàng.');
  return customer;
}

export function saveReceptionCustomer(actorId, values, id) {
  const actor = requireReceptionist(actorId);
  const customer = id ? getReceptionCustomer(actorId, id) : null;
  if (customer?.source === 'ACCOUNT') return updateReceptionCustomer(actorId, id, values);
  const records = readCustomerProfiles();
  const current = id ? records.find((item) => item.id === id) : null;
  if (current && values.expectedRevision !== customerDTO(current, 'WALK_IN').revision) throw customerError('Hồ sơ vừa thay đổi. Đóng form rồi mở lại để cập nhật.', {}, 'CONFLICT');
  const contact = { ...EMPTY_CUSTOMER, ...Object.fromEntries(CUSTOMER_FIELDS.map((key) => [key, values[key] ?? current?.[key] ?? EMPTY_CUSTOMER[key]])) };
  const errors = validateCustomer(contact);
  if (Object.keys(errors).length) throw customerError('Vui lòng kiểm tra thông tin khách hàng.', errors);
  assertReceptionContactUnique(actorId, contact, id);
  const now = new Date().toISOString();
  const record = { ...cleanCustomer(contact), id: current?.id || `walkin-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    createdAt: current?.createdAt || now, updatedAt: now, version: (current?.version || 0) + 1 };
  commitCustomerProfiles(current ? records.map((item) => item.id === id ? record : item) : [record, ...records]);
  recordActivity({ actor, module: 'CUSTOMERS', action: current ? 'CUSTOMER_UPDATE' : 'CUSTOMER_CREATE', targetId: record.id, targetName: record.fullName });
  return customerDTO(record, 'WALK_IN');
}
