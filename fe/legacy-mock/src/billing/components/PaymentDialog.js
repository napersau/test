import { useEffect, useRef, useState } from 'react';
import Modal from '../../../components/common/Modal';
import { PAYMENT_METHODS, COLLECTABLE_METHODS } from '../../invoices/invoicePolicy';
import FakeQr from './FakeQr';
import { money } from '../../catalog/catalogPolicy';
export default function PaymentDialog({ invoice, saving, onSave, onClose }) {
  const [revision] = useState(invoice.revision); const [receiptId] = useState(() => `receipt-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`);
  const [initial] = useState({ amount: String(invoice.remaining), method: 'CASH', note: '', acknowledged: false });
  const [form, setForm] = useState(initial); const [error, setError] = useState(''); const [errors, setErrors] = useState({}); const amountRef = useRef(null); const formRef = useRef(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => { if (error && !saving) (formRef.current?.elements.namedItem(Object.keys(errors)[0]) || amountRef.current)?.focus(); }, [error, errors, saving]);
  useEffect(() => { const warn = (event) => { event.preventDefault(); event.returnValue = ''; }; if (!dirty) return undefined; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const close = () => { if (!saving && (!dirty || window.confirm('Khoản thanh toán chưa lưu. Bỏ thay đổi?'))) onClose(); };
  const change = (event) => { const { name, value, type, checked } = event.target; setForm({ ...form, [name]: type === 'checkbox' ? checked : value }); setError(''); setErrors({ ...errors, [name]: '' }); };
  return <Modal title={`Ghi nhận thanh toán ${invoice.code}`} id="payment-title" onClose={close} busy={saving} initialFocusRef={amountRef}><form className="admin-editor" ref={formRef} noValidate onSubmit={async (event) => { event.preventDefault(); if (saving) return; try { await onSave(invoice.id, { ...form, expectedRevision: revision, receiptId }); } catch (problem) { setError(problem.message); setErrors(problem.fieldErrors || {}); formRef.current?.elements.namedItem(Object.keys(problem.fieldErrors || {})[0])?.focus(); } }}>
    <p>Còn phải thu: <strong>{money(invoice.remaining)}</strong>. Đây là ghi nhận cục bộ, không chuyển tiền hay xác nhận tự động từ ngân hàng.</p><fieldset disabled={saving}><legend className="pet-sr-only">Khoản thanh toán demo</legend>
      <label className="admin-field" htmlFor="payment-amount"><span>Số tiền (VND) *</span><input id="payment-amount" ref={amountRef} name="amount" type="number" inputMode="numeric" min="1" max={invoice.remaining} step="1" value={form.amount} onChange={change} aria-invalid={!!errors.amount} aria-describedby={errors.amount ? 'payment-amount-error' : undefined} />{errors.amount && <small id="payment-amount-error" className="admin-field-error">{errors.amount}</small>}</label>
      <label className="admin-field" htmlFor="payment-method"><span>Phương thức *</span><select id="payment-method" name="method" value={form.method} onChange={change}>{COLLECTABLE_METHODS.map((key) => <option key={key} value={key}>{PAYMENT_METHODS[key]}</option>)}</select></label>
      {form.method === 'TRANSFER' && <FakeQr value={`${invoice.code}-${form.amount}`} amount={money(Number(form.amount) || 0)} content={`THANH TOAN ${invoice.code}`} />}
      <label className="admin-field" htmlFor="payment-note"><span>Ghi chú (không bắt buộc)</span><textarea id="payment-note" name="note" maxLength={300} rows={2} value={form.note} onChange={change} /></label>
      <label className="intake-ack"><input type="checkbox" name="acknowledged" checked={form.acknowledged} onChange={change} aria-invalid={!!errors.acknowledged} aria-describedby={errors.acknowledged ? 'payment-ack-error' : undefined} />Đã nhận và đối chiếu khoản thanh toán trong bản demo.</label>{errors.acknowledged && <small id="payment-ack-error" className="admin-field-error">{errors.acknowledged}</small>}
    </fieldset>{error && <p className="admin-alert error" role="alert">{error}</p>}<div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={close}>Hủy</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thanh toán demo'}</button></div>
  </form></Modal>;
}
