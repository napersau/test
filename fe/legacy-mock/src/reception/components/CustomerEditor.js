import { useEffect, useRef, useState } from 'react';
import Modal from '../../../components/common/Modal';
import { CUSTOMER_FIELDS, EMPTY_CUSTOMER, validateCustomer } from '../customerProfileStorage';

export default function CustomerEditor({ customer, onSave, onClose, saving }) {
  const [initial] = useState(() => ({ ...EMPTY_CUSTOMER, ...Object.fromEntries(CUSTOMER_FIELDS.map((key) => [key, customer?.[key] || ''])) }));
  const [revision] = useState(customer?.revision);
  const [form, setForm] = useState(initial); const [errors, setErrors] = useState({}); const [error, setError] = useState('');
  const nameRef = useRef(null); const formRef = useRef(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const close = () => { if (!saving && (!dirty || window.confirm('Thông tin chưa lưu. Bạn muốn bỏ thay đổi?'))) onClose(); };
  const submit = async (event) => {
    event.preventDefault(); if (saving) return;
    const fieldErrors = validateCustomer(form, customer?.source === 'ACCOUNT'); setErrors(fieldErrors); setError('');
    if (Object.keys(fieldErrors).length) { formRef.current?.elements.namedItem(Object.keys(fieldErrors)[0])?.focus(); return; }
    try { await onSave({ ...form, expectedRevision: revision }, customer?.id); }
    catch (problem) { setError(problem.message); setErrors(problem.fieldErrors || {}); formRef.current?.elements.namedItem(Object.keys(problem.fieldErrors || {})[0])?.focus(); }
  };
  return <Modal title={customer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'} id="customer-editor-title" onClose={close} busy={saving} initialFocusRef={nameRef}>
    <form className="admin-editor" ref={formRef} noValidate onSubmit={submit}>
      <p>{customer?.source === 'ACCOUNT' ? 'Cập nhật thông tin liên hệ. Email và số điện thoại cũng được dùng khi khách hàng đăng nhập.' : 'Tạo hồ sơ khách vãng lai để liên kết thú cưng. Không tạo tài khoản hoặc mật khẩu đăng nhập.'}</p>
      <fieldset disabled={saving}><legend className="pet-sr-only">Thông tin khách hàng</legend>
        {[['fullName', 'Họ và tên', 'text', 100], ['phone', 'Số điện thoại', 'tel', 20], ['email', customer?.source === 'ACCOUNT' ? 'Email đăng nhập' : 'Email (không bắt buộc)', 'email', 160], ['address', 'Địa chỉ (không bắt buộc)', 'text', 300]].map(([name, label, type, maxLength]) => <label className="admin-field" key={name} htmlFor={`customer-${name}`}><span>{label}{['fullName', 'phone'].includes(name) && ' *'}</span><input ref={name === 'fullName' ? nameRef : undefined} id={`customer-${name}`} name={name} type={type} maxLength={maxLength} value={form[name]} required={['fullName', 'phone'].includes(name) || (name === 'email' && customer?.source === 'ACCOUNT')} autoComplete="off" onChange={(event) => { setForm({ ...form, [name]: event.target.value }); setErrors({ ...errors, [name]: '' }); setError(''); }} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `customer-error-${name}` : undefined} />{errors[name] && <small className="admin-field-error" id={`customer-error-${name}`}>{errors[name]}</small>}</label>)}
      </fieldset>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={close}>Hủy</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu khách hàng'}</button></div>
    </form>
  </Modal>;
}
