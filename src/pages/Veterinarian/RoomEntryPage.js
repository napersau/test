import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import VeterinarianLayout from '../../layouts/VeterinarianLayout';
import Modal from '../../components/common/Modal';
import { VetState } from '../../components/veterinarian/VetUI';
import { ReceptionFacts, ReceptionNotice } from '../../components/reception/ReceptionUI';
import { ImagingResult, LabResultTable } from '../../features/examinations/components/OrderResults';
import { useRoomActions, useRoomEntry } from '../../features/clinicalRooms/useRooms';
import { IMAGE_MAX_BYTES, LAB_EVALUATIONS, MAX_IMAGES, ROOM_TYPES, imageFileError, validateImaging } from '../../features/clinicalRooms/roomsPolicy';
import { evaluateLabValue } from '../../features/labConfig/labConfigRepository';
import { readImageFile } from '../../features/clinicalRooms/imageFiles';
import { PET_SPECIES } from '../../features/pets/petPolicy';
import { appointmentDateTime } from '../../features/appointments/appointmentPolicy';
import '../../styles/veterinarian.css';

function LabForm({ data, actions, onDone, onError }) {
  const [values, setValues] = useState(() => Object.fromEntries(data.indicators.map((item) => [item.id, '']))); const [comment, setComment] = useState(''); const [errors, setErrors] = useState({});
  const submit = async (event) => {
    event.preventDefault(); if (actions.saving) return; onError('');
    try { const result = await actions.saveLab(data.entry.key, { values, comment, expectedVersion: data.version }); onDone(result.ready ? 'Đã lưu kết quả. Ca đã có kết quả đầy đủ — đã báo bác sĩ khám chính.' : 'Đã lưu và xác nhận kết quả xét nghiệm.'); }
    catch (problem) { setErrors(problem.fieldErrors || {}); onError(problem.message); }
  };
  return <form className="admin-editor" onSubmit={submit} noValidate><fieldset disabled={actions.saving}><legend className="pet-sr-only">Chỉ số xét nghiệm</legend>
    <div className="lab-indicator-grid">{data.indicators.map((item) => { const evaluation = evaluateLabValue(values[item.id], item.range);
      return <div className="lab-indicator" key={item.id}><label htmlFor={`lab-${item.id}`}><strong>{item.code}</strong> <small>{item.name}</small></label>
        <input id={`lab-${item.id}`} type="number" step="any" min="0" inputMode="decimal" aria-label={`Giá trị ${item.code}`} value={values[item.id]} aria-invalid={!!errors[item.id]} onChange={(event) => { setValues({ ...values, [item.id]: event.target.value }); setErrors({ ...errors, [item.id]: '' }); }} />
        <span className="vet-muted">{item.range ? `Tham chiếu ${PET_SPECIES[data.species]}: ${item.range.min} – ${item.range.max} ${item.unit}` : 'Chưa có khoảng tham chiếu cho loài này'}</span>
        {evaluation ? <span className={`vet-eval ${evaluation}`}>{LAB_EVALUATIONS[evaluation].label}</span> : <span />}
        {errors[item.id] && <small className="admin-field-error" style={{ gridColumn: '1 / -1' }}>{errors[item.id]}</small>}</div>; })}</div>
    <label className="admin-field" htmlFor="lab-comment"><span>Nhận xét chuyên môn (không bắt buộc)</span><textarea id="lab-comment" rows={2} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} /></label></fieldset>
    <div className="admin-modal-actions"><button type="submit" className="admin-button primary" disabled={actions.saving}>{actions.saving ? 'Đang lưu…' : 'Lưu & Xác nhận kết quả'}</button></div></form>;
}

function ImagingForm({ data, actions, onDone, onError }) {
  const [form, setForm] = useState({ description: '', conclusion: '', images: [] }); const [errors, setErrors] = useState({}); const [fileErrors, setFileErrors] = useState([]); const input = useRef(null);
  const pick = async (event) => {
    const files = [...event.target.files]; event.target.value = ''; const problems = []; const accepted = [];
    for (const file of files) { const message = imageFileError(file); if (message) problems.push(message); else if (form.images.length + accepted.length >= MAX_IMAGES) problems.push(`Tối đa ${MAX_IMAGES} ảnh cho một chỉ định.`); else accepted.push(await readImageFile(file)); }
    setFileErrors(problems); setForm((current) => ({ ...current, images: [...current.images, ...accepted] })); setErrors((current) => ({ ...current, images: '' }));
  };
  const submit = async (event) => {
    event.preventDefault(); if (actions.saving) return; onError(''); const problems = validateImaging(form); setErrors(problems); if (Object.keys(problems).length) return;
    try { const result = await actions.saveImaging(data.entry.key, { ...form, expectedVersion: data.version }); onDone(result.ready ? 'Đã lưu kết quả. Ca đã có kết quả đầy đủ — đã báo bác sĩ khám chính.' : 'Đã lưu và xác nhận kết quả chẩn đoán hình ảnh.'); }
    catch (problem) { setErrors(problem.fieldErrors || {}); onError(problem.message); }
  };
  return <form className="admin-editor" onSubmit={submit} noValidate><fieldset disabled={actions.saving}><legend className="pet-sr-only">Kết quả chẩn đoán hình ảnh</legend>
    <label className="admin-field" htmlFor="img-description"><span>Mô tả hình ảnh *</span><textarea id="img-description" rows={4} maxLength={3000} value={form.description} aria-invalid={!!errors.description} onChange={(event) => { setForm({ ...form, description: event.target.value }); setErrors({ ...errors, description: '' }); }} />{errors.description && <small className="admin-field-error">{errors.description}</small>}</label>
    <label className="admin-field" htmlFor="img-conclusion"><span>Kết luận chẩn đoán hình ảnh *</span><textarea id="img-conclusion" rows={3} maxLength={3000} value={form.conclusion} aria-invalid={!!errors.conclusion} onChange={(event) => { setForm({ ...form, conclusion: event.target.value }); setErrors({ ...errors, conclusion: '' }); }} />{errors.conclusion && <small className="admin-field-error">{errors.conclusion}</small>}</label>
    <div className="admin-field"><label htmlFor="img-files"><span>Ảnh siêu âm / X-quang * (JPG, PNG, DICOM, tối đa {Math.round(IMAGE_MAX_BYTES / 1048576)}MB mỗi tệp)</span></label>
      <input id="img-files" ref={input} type="file" multiple accept=".jpg,.jpeg,.png,.dcm,.dicom,image/jpeg,image/png" onChange={pick} />
      {errors.images && <small className="admin-field-error">{errors.images}</small>}{fileErrors.map((message) => <small key={message} className="admin-field-error" role="alert">{message} Vui lòng chọn lại.</small>)}
      {form.images.length > 0 && <div className="vet-image-grid" aria-label="Ảnh đã chọn">{form.images.map((image) => <figure key={image.id}>{image.dataUrl ? <img src={image.dataUrl} alt={`Xem trước ${image.name}`} /> : <div className="vet-muted">{image.name} (không xem trước)</div>}<figcaption>{image.name}<button type="button" className="admin-clear" aria-label={`Xóa ảnh ${image.name}`} onClick={() => setForm({ ...form, images: form.images.filter((item) => item.id !== image.id) })}>Xóa</button></figcaption></figure>)}</div>}</div></fieldset>
    <div className="admin-modal-actions"><button type="submit" className="admin-button primary" disabled={actions.saving}>{actions.saving ? 'Đang lưu…' : 'Lưu & Xác nhận kết quả'}</button></div></form>;
}

export default function RoomEntryPage({ room }) {
  const config = ROOM_TYPES[room]; const { key } = useParams(); const state = useRoomEntry(key); const actions = useRoomActions();
  const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [cancel, setCancel] = useState(false); const [reason, setReason] = useState(''); const [cancelError, setCancelError] = useState('');
  const data = state.data; const entry = data?.entry; const done = entry && entry.status === 'COMPLETED';
  const order = data && { name: entry.orderName, labResults: data.labResults, resultComment: data.resultComment, imaging: data.imaging };
  const start = async () => { setError(''); try { await actions.start(key); setNotice('Đã bắt đầu thực hiện. Nhập kết quả bên dưới.'); } catch (problem) { setError(problem.message); } };
  const doCancel = async (event) => {
    event.preventDefault(); setCancelError('');
    try { const result = await actions.cancel(key, reason); setCancel(false); setNotice(result.ready ? 'Đã hủy dịch vụ (không tính tiền). Ca đã đủ kết quả — đã báo bác sĩ khám chính.' : 'Đã hủy dịch vụ (không tính tiền).'); }
    catch (problem) { setCancelError(problem.fieldErrors?.reason || problem.message); }
  };
  return <VeterinarianLayout title={`Kết quả ${config.short}`}>
    <Link className="reception-back" to={config.path}>← Hàng đợi {config.label}</Link>
    <VetState state={state}>{entry && <>
      <div className="admin-page-title"><div><span className="admin-eyebrow">{config.label.toUpperCase()} · {entry.appointmentCode}</span><h1>{entry.orderName} · {entry.petName}</h1><p>{PET_SPECIES[entry.species] || 'Chưa rõ loài'} · chủ nuôi {entry.ownerName} · bác sĩ chỉ định {entry.doctorName}</p></div>
        <span className={`reception-badge ${done ? 'green' : 'blue'}`}>{{ PENDING: 'Chờ thực hiện', IN_PROGRESS: config.startedLabel, COMPLETED: 'Đã có kết quả', CANCELLED: 'Đã hủy' }[entry.status]}</span></div>
      <ReceptionNotice message={notice} />{error && <p className="admin-alert error" role="alert">{error}</p>}
      <section className="admin-panel vet-flow-panel"><ReceptionFacts entries={[['Giờ chỉ định', entry.sentAt ? appointmentDateTime(entry.sentAt) : ''], ['Ghi chú của bác sĩ', entry.notes], ['Số lần đã gọi', entry.status === 'PENDING' ? String(entry.callCount) : ''], ['Lý do hủy', entry.cancelReason]]} />
        {entry.status === 'PENDING' && <div className="vet-flow-actions"><button type="button" className="admin-button primary" disabled={actions.saving || entry.missed || entry.crossPostponed} onClick={start}>{config.start}</button>{(entry.missed || entry.crossPostponed) && <span className="vet-muted">Ca đang tạm hoãn — gọi lại ở hàng đợi trước khi thực hiện.</span>}</div>}
        {['PENDING', 'IN_PROGRESS'].includes(entry.status) && <div className="vet-flow-actions"><button type="button" className="admin-button secondary" onClick={() => { setCancel(true); setCancelError(''); }}>Hủy dịch vụ</button></div>}</section>
      {data.editable && <section className="admin-panel vet-flow-panel"><h2>{room === 'LABORATORY' ? 'Nhập chỉ số xét nghiệm' : 'Kết quả chẩn đoán hình ảnh'}</h2>{room === 'LABORATORY' ? (data.indicators.length ? <LabForm data={data} actions={actions} onDone={setNotice} onError={setError} /> : <p className="admin-alert error" role="alert">Dịch vụ chưa được cấu hình chỉ số xét nghiệm. Nhờ quản trị viên bổ sung ở mục Xét nghiệm & tham chiếu.</p>) : <ImagingForm data={data} actions={actions} onDone={setNotice} onError={setError} />}</section>}
      {done && <section className="admin-panel vet-flow-panel"><h2>Kết quả đã xác nhận</h2>{data.labResults.length > 0 && <LabResultTable order={order} species={data.species} />}{data.imaging && <ImagingResult order={order} />}<p className="vet-muted">Kết quả đã khóa, chỉ xem. {entry.completedAt && `Hoàn tất ${appointmentDateTime(entry.completedAt)}.`}</p></section>}
    </>}</VetState>
    {cancel && <Modal title="Hủy dịch vụ" id="room-cancel-title" busy={actions.saving} onClose={() => setCancel(false)}><form className="admin-editor" onSubmit={doCancel}><p>Dịch vụ chuyển sang đã hủy và không được tính tiền. Nếu đây là dịch vụ cuối, ca khám tự chuyển sang "đã có kết quả".</p>
      <label className="admin-field" htmlFor="room-cancel-reason"><span>Lý do hủy *</span><textarea id="room-cancel-reason" rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: thú cưng quá hung dữ, chủ nuôi từ chối" /></label>
      {cancelError && <p className="admin-alert error" role="alert">{cancelError}</p>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={actions.saving} onClick={() => setCancel(false)}>Giữ dịch vụ</button><button type="submit" className="admin-button primary" disabled={actions.saving}>Xác nhận hủy dịch vụ</button></div></form></Modal>}
  </VeterinarianLayout>;
}
