import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReceptionLayout from '../../layouts/ReceptionLayout';
import InvoiceDetail from '../../components/customer/InvoiceDetail';
import { ReceptionFacts, ReceptionNotice, ReceptionState } from '../../components/reception/ReceptionUI';
import useBilling from '../../features/billing/useBilling';
import PaymentDialog from '../../features/billing/components/PaymentDialog';
import { INVOICE_STATUSES } from '../../features/invoices/invoicePolicy';
import { money } from '../../features/catalog/catalogPolicy';
import '../../styles/billing.css';
import '../../styles/intake.css';

// Chiết khấu chỉ nhập được khi hóa đơn chưa có khoản thu; không vượt tổng viện phí (dịch vụ + thuốc).
function DiscountForm({ invoice, saving, onApply }) {
  const [value, setValue] = useState(String(invoice.discount || '')); const [error, setError] = useState('');
  return <form className="invoice-discount" noValidate onSubmit={async (event) => { event.preventDefault(); if (saving) return; try { await onApply(invoice.id, value || '0', invoice.revision); setError(''); } catch (problem) { setError(problem.fieldErrors?.discount || problem.message); } }}>
    <label className="admin-field" htmlFor="invoice-discount"><span>Chiết khấu (VND) — tối đa {money(invoice.subtotal)}</span>
      <input id="invoice-discount" type="number" inputMode="numeric" min="0" step="1" value={value} aria-invalid={!!error} aria-describedby={error ? 'invoice-discount-error' : undefined} onChange={(event) => { setValue(event.target.value); setError(''); }} />
      {error && <small className="admin-field-error" id="invoice-discount-error" role="alert">{error}</small>}</label>
    <button type="submit" className="admin-button secondary" disabled={saving}>Áp dụng chiết khấu</button>
  </form>;
}

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams(); const state = useBilling(false); const [payment, setPayment] = useState(null); const [notice, setNotice] = useState('');
  const invoice = state.invoices.find((item) => item.id === invoiceId); const owner = state.customers.find((item) => item.id === invoice?.ownerId);
  const unpaid = invoice && invoice.remaining > 0; const hasPendingMedicine = invoice?.items.some((item) => item.type === 'MEDICINE' && item.fulfillmentStatus === 'ORDERED');
  const canDiscount = invoice && invoice.paid === 0 && !['CANCELLED', 'REFUNDED'].includes(invoice.status);
  return <ReceptionLayout title="Chi tiết hóa đơn"><div className="staff-invoice-page"><Link className="reception-back" to="/reception/invoices">← Danh sách hóa đơn</Link><ReceptionState state={state} missing={!invoice}>
    {invoice && <><div className="admin-page-title"><div><span className="admin-eyebrow">PAWCARE · HÓA ĐƠN DEMO</span><h1>{invoice.code}</h1><span className={`reception-badge ${invoice.status === 'PAID' ? 'green' : 'blue'}`}>{INVOICE_STATUSES[invoice.status].label}</span></div><div className="reception-heading-actions">
      <button type="button" className="admin-button secondary" onClick={() => window.print()}>{unpaid ? 'In phiếu tạm tính' : 'In hóa đơn'}</button>
      {unpaid && <button type="button" className="admin-button secondary" onClick={() => setNotice('Đã gửi yêu cầu mở lại đợt khám tới bác sĩ phụ trách (mô phỏng). Lễ tân không sửa chỉ định hoặc đơn thuốc.')}>Yêu cầu mở lại đợt khám</button>}
      {invoice.status === 'PAID' && hasPendingMedicine && <Link className="admin-button primary" to="/reception/dispense">Chuyển sang phát thuốc →</Link>}
      <button type="button" className="admin-button primary" disabled={!unpaid || state.saving} onClick={() => { setPayment(invoice); setNotice(''); }}>Ghi nhận thanh toán</button></div></div><ReceptionNotice message={notice} /><section className="admin-panel reception-detail-panel"><h2>Thông tin thanh toán</h2><ReceptionFacts entries={[
      ['Khách hàng', owner?.fullName], ['Điện thoại', owner?.phone], ['Thú cưng', invoice.petName], ['Nguồn hồ sơ khám', invoice.visitId || 'Hóa đơn từ nguồn hiện có'],
    ]} />{canDiscount && <DiscountForm key={invoice.revision} invoice={invoice} saving={state.saving} onApply={async (...args) => { await state.discount(...args); setNotice('Đã cập nhật chiết khấu. Tổng phải thanh toán được tính lại.'); }} />}</section><InvoiceDetail invoice={invoice} variant="staff" /><p className="billing-print-note">Dữ liệu demo localStorage; không phải hóa đơn điện tử hợp lệ hoặc chứng nhận giao dịch ngân hàng. Thu ngân không sửa chỉ định hay đơn thuốc của bác sĩ.</p></>}
  </ReceptionState>{payment && <PaymentDialog invoice={payment} saving={state.saving} onClose={() => setPayment(null)} onSave={async (id, values) => { await state.pay(id, values); setPayment(null); setNotice('Đã ghi nhận thanh toán demo. Số còn phải thu đã được cập nhật.'); }} />}</div></ReceptionLayout>;
}
