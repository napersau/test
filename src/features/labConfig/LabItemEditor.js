import { useState } from 'react';
import Modal from '../../components/common/Modal';
import CatalogField from '../catalog/components/CatalogField';
import { LAB_SPECIES, validateLabItem } from './labConfigRepository';

export default function LabItemEditor({ item, saving, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ code: item?.code || '', name: item?.name || '', unit: item?.unit || '', description: item?.description || '',
    ranges: Object.fromEntries(Object.keys(LAB_SPECIES).map((species) => [species, { min: item?.ranges?.[species]?.min ?? '', max: item?.ranges?.[species]?.max ?? '' }])) }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const change = (name, value) => { setValues((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: '' })); setError(''); };
  const changeRange = (species, bound, value) => {
    setValues((current) => ({ ...current, ranges: { ...current.ranges, [species]: { ...current.ranges[species], [bound]: value } } }));
    setErrors((current) => ({ ...current, [`range-${species}`]: '' })); setError('');
  };
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const problems = validateLabItem(values);
    setErrors(problems);
    if (Object.keys(problems).length) { setError('Vui lòng kiểm tra các trường được đánh dấu.'); return; }
    try { await onSave(values, item?.id); }
    catch (problem) { setErrors(problem.fieldErrors || {}); setError(problem.message); }
  };
  const field = (name, label, props = {}) => <CatalogField name={name} label={label} value={values[name]} error={errors[name]} onChange={change} {...props} />;
  return <Modal title={`${item ? 'Chỉnh sửa' : 'Thêm'} chỉ số xét nghiệm`} id="lab-item-editor-title" onClose={onClose} busy={saving}>
    <form className="admin-editor" onSubmit={submit} noValidate>
      <p>Mỗi chỉ số có khoảng tham chiếu riêng cho từng loài. Kết quả đã đo giữ nguyên ngưỡng tại thời điểm xét nghiệm.</p>
      <fieldset disabled={saving}>
        <div className="admin-form-row">{field('code', 'Mã chỉ số', { maxLength: 30 })}{field('unit', 'Đơn vị đo', { maxLength: 30 })}</div>
        {field('name', 'Tên chỉ số', { maxLength: 100 })}
        {field('description', 'Ý nghĩa lâm sàng', { type: 'textarea', maxLength: 255, rows: 2 })}
        {Object.entries(LAB_SPECIES).map(([species, label]) => <fieldset key={species} className="lab-range-fieldset"><legend>Khoảng tham chiếu · {label}</legend>
          <div className="admin-form-row">
            <label className="admin-field"><span>Ngưỡng dưới</span><input type="number" step="any" aria-label={`Ngưỡng dưới ${label}`} value={values.ranges[species].min} onChange={(event) => changeRange(species, 'min', event.target.value)} /></label>
            <label className="admin-field"><span>Ngưỡng trên</span><input type="number" step="any" aria-label={`Ngưỡng trên ${label}`} value={values.ranges[species].max} onChange={(event) => changeRange(species, 'max', event.target.value)} /></label>
          </div>
          {errors[`range-${species}`] && <span className="admin-field-error">{errors[`range-${species}`]}</span>}
        </fieldset>)}
      </fieldset>
      {error && <div className="admin-alert error" role="alert">{error}</div>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" onClick={onClose} disabled={saving}>Hủy</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu chỉ số'}</button></div>
    </form>
  </Modal>;
}
