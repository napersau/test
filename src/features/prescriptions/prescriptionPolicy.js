import { isText } from '../customerRecords/recordStorage';

// Optional fields preserve older completed-visit data; missing directions are never invented.
export function projectPrescription(item) {
  const optional = ['frequency', 'duration', 'unit'];
  if (optional.some((field) => item[field] !== undefined && !isText(item[field], 200))
    || (item.quantity !== undefined && (!Number.isSafeInteger(item.quantity) || item.quantity <= 0))) throw new Error('Chi tiết đơn thuốc không hợp lệ.');
  return { id: item.id, medicineName: item.medicineName, dosage: item.dosage, instructions: item.instructions,
    frequency: item.frequency || '', duration: item.duration || '', unit: item.unit || '', quantity: item.quantity ?? null };
}
