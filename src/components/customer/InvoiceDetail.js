import { INVOICE_ITEM_TYPES, PAYMENT_METHODS } from '../../features/invoices/invoicePolicy';
import { money } from '../../features/catalog/catalogPolicy';
import { appointmentDateTime } from '../../features/appointments/appointmentPolicy';

function ItemsTable({ items, caption }) {
  return <div className="invoice-table-wrap" tabIndex="0" role="region" aria-label={caption}><table><caption>{caption}</caption><thead><tr><th scope="col">Nội dung</th><th scope="col">Loại</th><th scope="col">Số lượng</th><th scope="col">Đơn giá</th><th scope="col">Thành tiền</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><th scope="row">{item.name}</th><td>{INVOICE_ITEM_TYPES[item.type]}{item.type === 'MEDICINE' && item.fulfillmentStatus === 'DISPENSED' ? ' · đã phát' : ''}</td><td>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</td><td>{money(item.unitPrice)}</td><td>{money(item.amount)}</td></tr>)}</tbody></table></div>;
}

export default function InvoiceDetail({ invoice, variant = 'customer' }) {
  const services = invoice.items.filter((item) => item.type === 'SERVICE'); const medicines = invoice.items.filter((item) => item.type === 'MEDICINE');
  const sum = (items) => items.reduce((total, item) => total + item.amount, 0);
  return <><section className="pet-panel invoice-lines"><h2>Chi tiết hóa đơn</h2><p className="care-note">Chỉ tính dịch vụ đã hoàn tất và thuốc có trong đơn của bác sĩ. Dịch vụ đã hủy không được tính tiền. Đơn giá được chốt tại thời điểm thực hiện / kê đơn.</p>
    {variant === 'staff' ? <>
      {services.length > 0 && <ItemsTable items={services} caption={`Dịch vụ của ${invoice.code}`} />}
      {medicines.length > 0 && <ItemsTable items={medicines} caption={`Thuốc trong đơn của ${invoice.code}`} />}
    </> : <ItemsTable items={invoice.items} caption={`Các khoản tính tiền của ${invoice.code}`} />}
    <dl className="invoice-totals" aria-label="Tổng kết hóa đơn">
      {(medicines.length > 0 || invoice.discount > 0) && <><div><dt>Tổng dịch vụ</dt><dd>{money(sum(services))}</dd></div><div><dt>Tổng thuốc</dt><dd>{money(sum(medicines))}</dd></div></>}
      {invoice.discount > 0 && <div><dt>Chiết khấu</dt><dd>− {money(invoice.discount)}</dd></div>}
      <div><dt>Tổng phải thanh toán</dt><dd>{money(invoice.total)}</dd></div><div><dt>Đã ghi nhận thanh toán</dt><dd>{money(invoice.paid)}</dd></div>{invoice.refunded > 0 && <div><dt>Đã hoàn tiền</dt><dd>{money(invoice.refunded)}</dd></div>}<div><dt>Còn phải thanh toán</dt><dd>{money(invoice.remaining)}</dd></div></dl>{invoice.status === 'CANCELLED' && <p className="pet-alert neutral">Hóa đơn đã hủy. Số tiền còn phải thanh toán bằng 0.</p>}{invoice.status === 'REFUNDED' && <p className="pet-alert neutral">Hóa đơn đã được hoàn tiền. Không yêu cầu thanh toán lại tại trang này.</p>}</section>
    <section className="pet-panel care-record-section"><h2>Lịch sử thanh toán được cung cấp</h2>{invoice.payments.length ? invoice.payments.map((payment) => <div className="invoice-payment" key={payment.id}><div><strong>{payment.type === 'REFUND' ? 'Hoàn tiền' : 'Thanh toán'} · {PAYMENT_METHODS[payment.method]}</strong><p>{appointmentDateTime(payment.paidAt)}</p></div><strong>{money(payment.amount)}</strong></div>) : <p>Chưa có khoản thanh toán nào được ghi nhận.</p>}<p className="care-note">{variant === 'staff' ? 'Các khoản ghi nhận cục bộ; không kết nối cổng thanh toán hoặc xác minh ngân hàng tự động.' : 'Đây là thông tin đọc từ hóa đơn, không phải chức năng chuyển tiền hoặc xác nhận thu tiền.'}</p></section></>;
}
