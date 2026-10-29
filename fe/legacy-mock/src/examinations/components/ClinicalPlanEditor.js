import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import AdminIcon from '../../../components/admin/AdminIcon';
import Modal from '../../../components/common/Modal';
import { CLINICAL_PLANS, ORDER_STATES, ORDER_TONES, newPlanRow, planDraftKey, validatePlan, isPlanDraft } from '../clinicalPlanPolicy';
import { MEDICINE_UNITS, serviceTypeLabel, normalize, money } from '../../catalog/catalogPolicy';
import { appointmentDateTime } from '../../appointments/appointmentPolicy';

export default function ClinicalPlanEditor({ kind, record, appointment, catalog, saving, onSave }) {
  const config = CLINICAL_PLANS[kind]; const prescription = kind === 'prescriptions'; const readOnly = !record.editable; const { user } = useAuth();
  const key = planDraftKey(user.id, appointment.id, kind); const root = useRef(null); const lock = useRef(false); const blockedDraft = useRef(false);
  const [items, setItems] = useState(record.items); const [baseline, setBaseline] = useState(JSON.stringify(record.items));
  const [version, setVersion] = useState(record.version); const [appointmentVersion, setAppointmentVersion] = useState(appointment.version);
  const [search, setSearch] = useState(''); const [errors, setErrors] = useState({}); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(null); const [ack, setAck] = useState(false); const [stamp, setStamp] = useState('');
  const [recovery, setRecovery] = useState(() => {
    try { const saved = sessionStorage.getItem(key); if (!saved || readOnly) return null; const draft = JSON.parse(saved);
      if (!isPlanDraft(draft, kind)) throw new Error('invalid'); return draft;
    } catch { blockedDraft.current = true; return { invalid: true }; }
  });
  const dirty = JSON.stringify(items) !== baseline; const stale = version !== record.version || appointmentVersion !== appointment.version;
  useEffect(() => {
    if (!dirty || readOnly || blockedDraft.current) return;
    try { const savedAt = new Date().toISOString(); sessionStorage.setItem(key, JSON.stringify({ items, version, appointmentVersion, savedAt })); setStamp(savedAt); }
    catch { setError('Không giữ được nháp cục bộ. Hãy lưu trước khi rời trang.'); }
  }, [items, dirty, readOnly, key, version, appointmentVersion]);
  useEffect(() => {
    if (!readOnly) return;
    setItems(record.items); setBaseline(JSON.stringify(record.items)); setVersion(record.version); setAppointmentVersion(appointment.version); setConfirm(null);
  }, [readOnly, record, appointment.version]);
  useEffect(() => {
    if (!dirty || readOnly) return undefined;
    const unload = (event) => { event.preventDefault(); event.returnValue = ''; };
    const leave = (event) => { const link = event.target.closest?.('a[href]'); if (link && new URL(link.href).origin === window.location.origin && !link.hash && !window.confirm('Nội dung chưa lưu. Rời trang và giữ nháp cục bộ trong tab?')) { event.preventDefault(); event.stopPropagation(); } };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', leave, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', leave, true); };
  }, [dirty, readOnly]);
  useEffect(() => { if (!confirm && Object.keys(errors).length) root.current?.querySelector('[aria-invalid="true"]')?.focus(); }, [errors, confirm]);
  const change = (index, field, value) => {
    setItems((current) => current.map((item, row) => row === index ? { ...item, [field]: value } : item)); setErrors({}); setError(''); setNotice('');
  };
  const select = (index, id) => {
    const source = catalog.find((item) => item.id === id);
    setItems((current) => current.map((item, row) => row !== index ? item : prescription ? { ...item, medicineId: id, medicineName: source?.name || '', unit: source ? MEDICINE_UNITS[source.unit] : '' }
      : { ...item, serviceId: id, name: source?.name || '', serviceType: source?.serviceType || '', unitPrice: source?.price ?? null, requiresResult: source?.requiresResult || false }));
    setErrors({}); setError(''); setNotice('');
  };
  const openSave = () => { const next = validatePlan(items, kind); setErrors(next); if (Object.keys(next).length) { setError('Kiểm tra các trường được đánh dấu trước khi lưu.'); return; } setError(''); setAck(false); setConfirm({ version, appointmentVersion }); };
  const submit = async (event) => {
    event.preventDefault(); if (saving || lock.current || readOnly || !confirm) return;
    if (!ack) { setError('Xác nhận đã đối chiếu trước khi lưu.'); return; }
    lock.current = true;
    try { const saved = await onSave({ items, expectedVersion: confirm.version, expectedAppointmentVersion: confirm.appointmentVersion });
      setItems(saved.items); setBaseline(JSON.stringify(saved.items)); setVersion(saved.version); setAppointmentVersion(confirm.appointmentVersion); setConfirm(null); setRecovery(null); setStamp(''); setErrors({}); setError('');
      try { sessionStorage.removeItem(key); blockedDraft.current = false; } catch { setError('Đã lưu hồ sơ nhưng chưa xóa được nháp cục bộ.'); }
      setNotice(prescription ? 'Đã lưu đơn thuốc vào hồ sơ. Chưa xuất kho; khách chỉ thấy sau khi hoàn tất khám.' : 'Đã lưu chỉ định. Chưa thực hiện dịch vụ hoặc tạo khoản thu.');
    } catch (problem) { setError(problem.message); setErrors(problem.fieldErrors || {}); setConfirm(null); }
    finally { lock.current = false; }
  };
  const field = (item, index, name, label, disabled) => <label className="admin-field" htmlFor={`plan-${index}-${name}`}><span>{label}</span>{name === 'instructions' || name === 'notes'
    ? <textarea id={`plan-${index}-${name}`} value={item[name] || ''} rows="2" maxLength="1000" disabled={disabled} onChange={(event) => change(index, name, event.target.value)} aria-invalid={!!errors[`${index}.${name}`]} aria-describedby={errors[`${index}.${name}`] ? `plan-${index}-${name}-error` : undefined} />
    : <input id={`plan-${index}-${name}`} type={name === 'quantity' ? 'number' : 'text'} min={name === 'quantity' ? '1' : undefined} max={name === 'quantity' ? '10000' : undefined} step={name === 'quantity' ? '1' : undefined} maxLength="200" value={item[name] ?? ''} disabled={disabled} onChange={(event) => change(index, name, event.target.value)} aria-invalid={!!errors[`${index}.${name}`]} aria-describedby={errors[`${index}.${name}`] ? `plan-${index}-${name}-error` : undefined} />}{errors[`${index}.${name}`] && <small className="admin-field-error" id={`plan-${index}-${name}-error`}>{errors[`${index}.${name}`]}</small>}</label>;
  const estimates = items.filter((item) => item.status !== 'CANCELLED').reduce((total, item) => total + (Number(item.quantity) || 0) * (item.unitPrice || 0), 0);
  return <div ref={root} className="vet-plan-editor">{notice && <p role="status" className="admin-alert success">{notice}</p>}{error && !confirm && <p role="alert" className="admin-alert error">{error}</p>}
    {stale && !readOnly && <p role="alert" className="admin-alert error">Hồ sơ hoặc lịch đã thay đổi. Nội dung đang nhập được giữ; tải lại để đối chiếu trước khi lưu.</p>}
    {recovery && !readOnly && <section className="admin-panel vet-editor-section"><h2>{recovery.invalid ? 'Nháp cục bộ không hợp lệ' : 'Có nháp đơn/chỉ định chưa lưu'}</h2><p>{recovery.invalid ? 'Không tự ghi đè nháp lỗi.' : `Lưu cục bộ ${appointmentDateTime(recovery.savedAt)}. Cần kiểm tra lại danh mục và phiên bản.`}</p>{!recovery.invalid && <button type="button" className="admin-button secondary" onClick={() => { if ((recovery.version !== version || recovery.appointmentVersion !== appointmentVersion) && !window.confirm('Nháp thuộc phiên bản cũ. Khôi phục để đối chiếu thủ công?')) return; setItems(recovery.items); setRecovery(null); }}>Khôi phục nháp chỉ định</button>} <button type="button" className="admin-button secondary" onClick={() => { if (!window.confirm('Xóa nháp cục bộ? Dữ liệu đã lưu không thay đổi.')) return; try { sessionStorage.removeItem(key); setRecovery(null); blockedDraft.current = false; } catch { setError('Không xóa được nháp cục bộ.'); } }}>Xóa nháp cục bộ</button></section>}
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>{prescription ? 'Thuốc trong đơn' : 'Dịch vụ được chỉ định'}</h2><p>{readOnly ? (record.status === 'COMPLETED' ? 'Hồ sơ đã chốt · Chỉ đọc' : 'Hồ sơ đang tạm khóa (chờ kết quả hoặc đã chuyển giai đoạn khác) · Chỉ đọc') : 'Nhập nội dung, đối chiếu rồi lưu vào hồ sơ.'}</p></div><span className="reception-badge blue">{items.filter((item) => item.status !== 'CANCELLED').length} {prescription ? 'thuốc' : 'dịch vụ'}</span></div>
      {!readOnly && <div className="vet-plan-catalog-search"><label className="admin-search"><AdminIcon name="search" /><input aria-label="Tìm trong danh mục chỉ định" placeholder={prescription ? 'Tìm mã hoặc tên thuốc…' : 'Tìm mã hoặc tên dịch vụ…'} value={search} onChange={(event) => setSearch(event.target.value)} /></label><small>Chỉ chọn mục đang sử dụng. Hướng dẫn chuyên môn do bác sĩ nhập.</small></div>}
      <fieldset className="vet-plan-fieldset" disabled={saving || readOnly}><legend className="pet-sr-only">Nội dung {config.title.toLowerCase()}</legend>
      {items.length ? items.map((item, index) => {
        const idKey = prescription ? 'medicineId' : 'serviceId'; const frozen = !prescription && item.status !== 'ORDERED';
        const available = catalog.filter((source) => normalize(`${source.code} ${source.name}`).includes(normalize(search)) || source.id === item[idKey]);
        return <article className={`vet-plan-row ${frozen ? 'is-frozen' : ''}`} key={item.id || `new-${index}`}><div className="vet-plan-row-heading"><strong>{String(index + 1).padStart(2, '0')} · {prescription ? item.medicineName || 'Thuốc mới' : item.name || 'Dịch vụ mới'}</strong>{!prescription && <span className={`reception-badge ${item.id ? ORDER_TONES[item.status] : ''}`}>{item.id ? ORDER_STATES[item.status] : 'Chưa lưu'}</span>}{!readOnly && !frozen && <button type="button" className="admin-clear" onClick={() => { if (!prescription && item.id) { if (window.confirm('Hủy chỉ định đã lưu? Thay đổi chỉ có hiệu lực sau khi lưu lại.')) change(index, 'status', 'CANCELLED'); } else setItems((current) => current.filter((_, row) => row !== index)); }}>{!prescription && item.id ? 'Hủy chỉ định' : 'Xóa dòng'}</button>}</div>
          <label className="admin-field" htmlFor={`plan-${index}-${idKey}`}><span>{prescription ? 'Thuốc *' : 'Dịch vụ *'}</span><select id={`plan-${index}-${idKey}`} value={item[idKey]} disabled={frozen || (!prescription && !!item.id)} aria-invalid={!!errors[`${index}.${idKey}`]} aria-describedby={errors[`${index}.${idKey}`] ? `plan-${index}-${idKey}-error` : undefined} onChange={(event) => select(index, event.target.value)}><option value="">{readOnly ? item.medicineName || item.name || 'Chưa có danh mục' : 'Chọn từ danh mục'}</option>{item[idKey] && !catalog.some((source) => source.id === item[idKey]) && <option value={item[idKey]}>{item.medicineName || item.name} · không còn hoạt động</option>}{available.map((source) => <option key={source.id} value={source.id}>{source.code} · {source.name}{prescription ? ` · ${source.activeIngredient || 'chưa có hoạt chất'} · ${money(source.salePrice)}/${MEDICINE_UNITS[source.unit] || ''} · tồn ${source.availableStock}` : ''}</option>)}</select>{errors[`${index}.${idKey}`] && <small className="admin-field-error" id={`plan-${index}-${idKey}-error`}>{errors[`${index}.${idKey}`]}</small>}</label>
          {prescription ? <><div className="vet-plan-fields">{field(item, index, 'dosage', 'Liều dùng *', false)}{field(item, index, 'frequency', 'Tần suất dùng *', false)}{field(item, index, 'duration', 'Thời gian dùng *', false)}{field(item, index, 'quantity', `Số lượng *${item.unit ? ` (${item.unit})` : ''}`, false)}</div>{field(item, index, 'instructions', 'Hướng dẫn sử dụng *', false)}</> : <><div className="vet-plan-service-facts"><span>{serviceTypeLabel(item.serviceType) || 'Chưa chọn nhóm'}</span><strong>{item.unitPrice === null || item.unitPrice === undefined ? 'Chưa có giá' : money(item.unitPrice)} / lượt</strong><span>{item.requiresResult ? 'Yêu cầu kết quả khi thực hiện' : 'Không yêu cầu kết quả'}</span></div>{field(item, index, 'quantity', 'Số lượng dịch vụ *', frozen)}{field(item, index, 'notes', 'Ghi chú chỉ định', frozen)}{item.orderedAt && <p className="vet-muted">{item.doctorName} · Chỉ định {appointmentDateTime(item.orderedAt)}</p>}</>}
        </article>;
      }) : <div className="admin-empty"><AdminIcon name={config.icon} width="40" height="40" /><h2>{prescription ? 'Chưa có thuốc trong đơn' : 'Chưa có chỉ định dịch vụ'}</h2><p>{readOnly ? 'Hồ sơ này không có nội dung đã lưu.' : 'Thêm dòng từ danh mục, không tự điền nội dung điều trị.'}</p></div>}
      {!readOnly && <button type="button" className="admin-button secondary vet-plan-add" disabled={!catalog.length || items.length >= 50} onClick={() => { setItems((current) => [...current, newPlanRow(kind)]); setErrors({}); setError(''); }}><AdminIcon name="plus" />{config.add}</button>}</fieldset>
      {!catalog.length && !readOnly && <p className="admin-alert error">Danh mục đang sử dụng trống. Nhờ quản trị viên bổ sung.</p>}
      {!prescription && <div className="vet-plan-estimate"><span>Dự kiến chỉ định (không phải hóa đơn)</span><strong>{money(estimates)}</strong></div>}
    </section>{!readOnly && <div className="vet-editor-actions"><span>{dirty ? 'Có nội dung chưa lưu' : `Đã lưu · ${appointmentDateTime(record.updatedAt)}`}{stamp && ' · Có nháp cục bộ'}</span><button type="button" className="admin-button primary" disabled={saving || stale || !dirty} onClick={openSave}>{saving ? 'Đang lưu…' : config.save}</button></div>}
    {confirm && <Modal title={`Xác nhận ${config.title.toLowerCase()}`} id="vet-plan-confirm" busy={saving} onClose={() => !saving && setConfirm(null)}><form className="admin-editor" onSubmit={submit}><p>{record.code} · {items.filter((item) => item.status !== 'CANCELLED').length} {prescription ? 'thuốc' : 'dịch vụ'}. {config.help}</p><label className="vet-checkbox"><input type="checkbox" checked={ack} disabled={saving} onChange={(event) => { setAck(event.target.checked); setError(''); }} />Đã đối chiếu đúng thú cưng, dị ứng và nội dung chỉ định.</label>{error && <p role="alert" className="admin-alert error">{error}</p>}<div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={() => setConfirm(null)}>Kiểm tra lại</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Xác nhận lưu'}</button></div></form></Modal>}
  </div>;
}
