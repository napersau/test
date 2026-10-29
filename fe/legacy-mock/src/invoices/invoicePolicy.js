export const INVOICES_KEY = 'pawcare_invoices_v1';
export const INVOICES_CHANGED = 'pawcare:invoices-changed';
export const INVOICE_STATUSES = {
  PENDING: { label: 'Chưa thanh toán', tone: 'amber' }, PARTIALLY_PAID: { label: 'Thanh toán một phần', tone: 'blue' },
  PAID: { label: 'Đã thanh toán', tone: 'green' }, REFUNDED: { label: 'Đã hoàn tiền', tone: 'gray' }, CANCELLED: { label: 'Hóa đơn đã hủy', tone: 'gray' },
};
export const INVOICE_ITEM_TYPES = { SERVICE: 'Dịch vụ', MEDICINE: 'Thuốc theo đơn' };
export const PAYMENT_METHODS = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', CARD: 'Thẻ POS', OTHER: 'Khác' };
// Phương thức lễ tân được chọn khi thu tiền (OTHER chỉ còn để đọc dữ liệu cũ).
export const COLLECTABLE_METHODS = ['CASH', 'TRANSFER', 'CARD'];
export const FULFILLMENT_STATUSES = ['ORDERED', 'IN_PROGRESS', 'COMPLETED', 'DISPENSED', 'CANCELLED'];
// Khoản tính tiền: dịch vụ đã hoàn tất, thuốc đã kê trong đơn (chờ phát hoặc đã phát). Dịch vụ / thuốc bị hủy không tính.
export const isBillableItem = (item) => (item.type === 'SERVICE' ? item.fulfillmentStatus === 'COMPLETED' : ['ORDERED', 'DISPENSED'].includes(item.fulfillmentStatus));
export const DISCOUNT_TOO_HIGH = 'Số tiền giảm giá không thể vượt quá tổng viện phí của ca khám.';
