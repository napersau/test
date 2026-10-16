import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { CATALOG_STATUSES, DOSAGE_FORMS, MEDICINE_CATEGORIES, MEDICINE_UNITS, SERVICE_TYPES } from '../catalogPolicy';
import { listLabItems } from '../../labConfig/labConfigRepository';
import { validateCatalog } from '../catalogSchema';
import CatalogField from './CatalogField';

// Chọn các chỉ số cấu thành gói xét nghiệm (dịch vụ nhóm LABORATORY).
function LabItemPicker({ selected, error, onChange }) {
  const { user } = useAuth();
  let items = [];
  let loadError = '';
  try { items = listLabItems(user.id); } catch (problem) { loadError = problem.message; }
  const toggle = (id) => onChange('labItemIds', selected.includes(id) ? selected.filter((entry) => entry !== id) : [...selected, id]);
  return <fieldset className="catalog-lab-items"><legend>Chỉ số xét nghiệm của gói *</legend>
    {loadError ? <span className="admin-field-error">{loadError}</span> : <div className="catalog-checkboxes">{items.map((entry) => <label key={entry.id}><input type="checkbox" checked={selected.includes(entry.id)} onChange={() => toggle(entry.id)} />{entry.code} · {entry.name} ({entry.unit})</label>)}</div>}
    <small className="admin-form-note">Phòng xét nghiệm sẽ nhập kết quả đúng các chỉ số này và đối chiếu khoảng tham chiếu theo loài.</small>
    {error && <span className="admin-field-error">{error}</span>}
  </fieldset>;
}

export default function CatalogEditor({ kind, item, saving, onClose, onSave }) {
  const isService = kind === 'service';
  const title = isService ? 'dịch vụ' : 'thuốc';
  const [values, setValues] = useState(() => ({ code: '', name: '', description: '', status: 'ACTIVE',
    ...(isService ? { serviceType: 'EXAMINATION', price: '', labItemIds: [] }
      : { category: 'OTHER', unit: 'TABLET', dosageForm: 'TABLET', activeIngredient: '', salePrice: '', minStockLevel: '10' }), ...item }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const change = (name, value) => { setValues((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: '' })); setError(''); };
  const field = (name, label, props = {}) => <CatalogField name={name} label={label} value={values[name]} error={errors[name]} onChange={change} {...props} />;
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const problems = validateCatalog(values, kind);
    setErrors(problems); setError('');
    if (Object.keys(problems).length) { setError('Vui lòng kiểm tra các trường được đánh dấu.'); return; }
    try { await onSave(values, item?.id); }
    catch (problem) { setErrors(problem.fieldErrors || {}); setError(problem.message); }
  };
  const lockedUnit = !isService && Boolean(item?.batches?.length);
  return <Modal title={`${item ? 'Chỉnh sửa' : 'Thêm'} ${title}`} id="catalog-editor-title" onClose={onClose} busy={saving}>
    <form className="admin-editor" onSubmit={submit} noValidate>
      <p>{isService ? 'Thiết lập nhóm và đơn giá dịch vụ. Đơn giá được chụp lại vào chỉ định tại thời điểm bác sĩ ra chỉ định.' : 'Thiết lập thông tin thuốc. Số lượng tồn được tính từ các lô hàng, không nhập trực tiếp ở đây.'}</p>
      <fieldset disabled={saving}>
        <div className="admin-form-row">{field('code', `Mã ${title}`, { maxLength: 30 })}{field('status', 'Trạng thái', { options: CATALOG_STATUSES })}</div>
        {field('name', `Tên ${title}`, { maxLength: 120 })}
        {isService ? <>
          <div className="admin-form-row">{field('serviceType', 'Nhóm dịch vụ', { options: SERVICE_TYPES })}{field('price', 'Đơn giá (VND)', { type: 'number', min: 0 })}</div>
          {values.serviceType === 'LABORATORY' && <LabItemPicker selected={values.labItemIds || []} error={errors.labItemIds} onChange={change} />}
          {values.serviceType === 'IMAGING' && <p className="admin-form-note">Dịch vụ chẩn đoán hình ảnh: kết quả gồm mô tả, kết luận và ảnh đính kèm.</p>}
          {['VACCINATION', 'DEWORMING', 'INJECTION_INFUSION'].includes(values.serviceType) && <p className="admin-form-note">Đây là công thực hiện. Vaccine, thuốc tẩy giun, dịch truyền, dây tiêm tính riêng ở danh mục Thuốc & kho.</p>}
        </> : <>
          {field('activeIngredient', 'Hoạt chất chính', { maxLength: 150 })}
          <div className="admin-form-row">{field('category', 'Nhóm thuốc', { options: MEDICINE_CATEGORIES })}{field('dosageForm', 'Dạng bào chế', { options: DOSAGE_FORMS })}</div>
          <div className="admin-form-row">{field('unit', 'Đơn vị tính', { options: MEDICINE_UNITS, disabled: lockedUnit })}</div>
          {lockedUnit && <p className="admin-form-note">Đơn vị tính được giữ cố định vì thuốc đã có lô hàng.</p>}
          <div className="admin-form-row">{field('salePrice', 'Giá bán (VND/đơn vị)', { type: 'number', min: 0 })}{field('minStockLevel', 'Ngưỡng cảnh báo tồn kho (cảnh báo khi tồn ≤ ngưỡng)', { type: 'number', min: 0 })}</div>
        </>}
        {field('description', 'Mô tả', { type: 'textarea', maxLength: 1000 })}
      </fieldset>
      {error && <div className="admin-alert error" role="alert">{error}</div>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" onClick={onClose} disabled={saving}>Hủy</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang lưu…' : `Lưu ${title}`}</button></div>
    </form>
  </Modal>;
}
