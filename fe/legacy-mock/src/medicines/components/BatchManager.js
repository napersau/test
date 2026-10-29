import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import AdminIcon from '../../../components/admin/AdminIcon';
import CatalogField from '../../catalog/components/CatalogField';
import { MEDICINE_UNITS, calendarDate, clinicToday, daysUntil, money } from '../../catalog/catalogPolicy';
import { validateBatch } from '../../catalog/catalogSchema';

const emptyForm = { batchNo: '', expiry: '', quantity: '', importPrice: '' };
const TRANSACTION_TYPES = { IMPORT: 'Nhập kho', EXPORT_PRESCRIPTION: 'Xuất theo đơn', ADJUSTMENT: 'Điều chỉnh' };
const formatTime = (value) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));

// Điều chỉnh tồn của một lô sau kiểm kê; bắt buộc có lý do và được ghi vào nhật ký kho.
function AdjustForm({ batch, saving, onSubmit, onCancel }) {
  const [values, setValues] = useState({ delta: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const change = (name, value) => { setValues((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: '' })); setError(''); };
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    try { await onSubmit(batch.id, values); }
    catch (problem) { setErrors(problem.fieldErrors || {}); setError(problem.message); }
  };
  return <form className="catalog-import-form" onSubmit={submit} noValidate>
    <h3>Điều chỉnh tồn · lô {batch.batchNo}</h3>
    <fieldset disabled={saving}>
      <div className="admin-form-row"><CatalogField name="adjust-delta" label={`Số lượng ± (hiện còn ${batch.remaining})`} type="number" value={values.delta} error={errors.delta} onChange={(_, value) => change('delta', value)} />
        <CatalogField name="adjust-reason" label="Lý do điều chỉnh" maxLength={255} value={values.reason} error={errors.reason} onChange={(_, value) => change('reason', value)} /></div>
    </fieldset>
    {error && !errors.delta && !errors.reason && <div className="admin-alert error" role="alert">{error}</div>}
    <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={onCancel}>Hủy</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu điều chỉnh'}</button></div>
  </form>;
}

export default function BatchManager({ medicine, saving, onClose, onImport, onAdjust }) {
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adjusting, setAdjusting] = useState(null);
  const today = clinicToday();
  const inactive = medicine.status !== 'ACTIVE';
  const change = (name, value) => { setValues((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: '' })); setError(''); setNotice(''); };
  const field = (name, label, props) => <CatalogField name={name} label={label} value={values[name]} error={errors[name]} onChange={change} {...props} />;
  const submit = async (event) => {
    event.preventDefault();
    if (saving || inactive) return;
    const problems = validateBatch(values);
    setErrors(problems); setError(''); setNotice('');
    if (Object.keys(problems).length) { setError('Vui lòng kiểm tra thông tin lô nhập.'); return; }
    try { await onImport(values); setValues(emptyForm); setNotice('Đã nhập lô hàng và cập nhật tồn kho.'); }
    catch (problem) { setErrors(problem.fieldErrors || {}); setError(problem.message); }
  };
  const adjust = async (batchId, form) => { await onAdjust(batchId, form); setAdjusting(null); setNotice('Đã điều chỉnh tồn kho và ghi nhật ký.'); };
  const adjustingBatch = medicine.batches.find((batch) => batch.id === adjusting);
  return <Modal title={`Lô hàng · ${medicine.name}`} id="batch-manager-title" onClose={onClose} busy={saving} className="catalog-batch-modal">
    <div className="catalog-batch-content">
      <div className="catalog-batch-summary"><span><strong>{medicine.availableStock}</strong> có thể dùng</span><span>Tổng tồn: <strong>{medicine.totalStock}</strong></span><span>Ngưỡng cảnh báo: <strong>{medicine.minStockLevel}</strong></span><span>Đơn vị: <strong>{MEDICINE_UNITS[medicine.unit]}</strong></span></div>
      {medicine.lowStock && <div className="admin-alert error" role="status">Tồn kho đã chạm ngưỡng cảnh báo — cần nhập thêm thuốc.</div>}
      <p className="admin-form-note">Các lô được sắp theo hạn sử dụng. Lô hết hạn không được tính vào tồn có thể dùng. Tồn kho chỉ thay đổi qua nhập kho, xuất thuốc theo đơn đã thanh toán, hoặc điều chỉnh sau kiểm kê (đều có nhật ký).</p>
      {medicine.batches.length ? <div className="admin-table-scroll" role="region" aria-label="Bảng lô hàng" tabIndex={0}><table className="admin-users-table catalog-batch-table">
        <thead><tr><th scope="col">Số lô</th><th scope="col">Hạn sử dụng</th><th scope="col">SL nhập / Còn lại</th><th scope="col">Giá nhập / đơn vị</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>
        <tbody>{medicine.batches.map((batch) => {
          const expired = batch.expiry < today;
          const near = !expired && daysUntil(batch.expiry, today) <= 30;
          const label = batch.remaining === 0 ? 'Hết tồn' : expired ? 'Đã hết hạn' : near ? 'Sắp hết hạn' : 'Còn hạn';
          return <tr key={batch.id}><td><strong>{batch.batchNo}</strong></td><td>{calendarDate(batch.expiry)}</td><td>{batch.quantity} / <strong>{batch.remaining}</strong></td><td>{money(batch.importPrice)}</td><td><span className={`admin-badge tone-${expired ? 'inactive' : near ? 'orange' : 'active'}`}>{label}</span></td>
            <td><div className="admin-row-actions"><button type="button" aria-label={`Điều chỉnh lô ${batch.batchNo}`} disabled={saving} onClick={() => { setNotice(''); setAdjusting(batch.id); }}>Điều chỉnh</button></div></td></tr>;
        })}</tbody>
      </table></div> : <div className="catalog-batch-empty"><AdminIcon name="box" /><p>Chưa có lô hàng. Nhập lô đầu tiên để bổ sung tồn kho.</p></div>}
      {adjustingBatch && <AdjustForm key={adjustingBatch.id} batch={adjustingBatch} saving={saving} onSubmit={adjust} onCancel={() => setAdjusting(null)} />}
      <form className="catalog-import-form" onSubmit={submit} noValidate>
        <h3>Nhập lô mới</h3>
        {inactive && <div className="admin-alert error" role="alert">Thuốc đang ngừng sử dụng. Kích hoạt thuốc trước khi nhập lô.</div>}
        <fieldset disabled={saving || inactive}>
          <div className="admin-form-row">{field('batchNo', 'Số lô', { maxLength: 40 })}{field('expiry', 'Hạn sử dụng', { type: 'date', min: today })}</div>
          <div className="admin-form-row">{field('quantity', `Số lượng nhập (${MEDICINE_UNITS[medicine.unit].toLowerCase()})`, { type: 'number', min: 1 })}{field('importPrice', 'Giá nhập (VND/đơn vị)', { type: 'number', min: 0 })}</div>
        </fieldset>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        {notice && <div className="admin-alert success" role="status">{notice}</div>}
        <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={onClose}>Đóng</button><button type="submit" className="admin-button primary" disabled={saving || inactive}><AdminIcon name="plus" />{saving ? 'Đang nhập…' : 'Nhập lô hàng'}</button></div>
      </form>
      <h3>Nhật ký kho</h3>
      {medicine.transactions.length ? <div className="admin-table-scroll" role="region" aria-label="Nhật ký kho" tabIndex={0}><table className="admin-users-table catalog-batch-table">
        <thead><tr><th scope="col">Thời gian</th><th scope="col">Loại</th><th scope="col">Biến động</th><th scope="col">Tồn sau</th><th scope="col">Ghi chú</th></tr></thead>
        <tbody>{medicine.transactions.map((entry) => <tr key={entry.id}><td className="insights-nowrap">{formatTime(entry.createdAt)}</td><td>{TRANSACTION_TYPES[entry.type] || entry.type}</td><td><strong>{entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}</strong></td><td>{entry.balanceAfter}</td><td>{entry.notes}</td></tr>)}</tbody>
      </table></div> : <p className="admin-form-note">Chưa có biến động kho nào được ghi nhận.</p>}
    </div>
  </Modal>;
}
