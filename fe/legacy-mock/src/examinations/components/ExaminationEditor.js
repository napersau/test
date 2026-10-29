import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Modal from '../../../components/common/Modal';
import { EXAM_METRICS, EXAM_TABS, examValues, examDraftKey, validateExamination, isExaminationDraft } from '../examinationPolicy';
import { appointmentDateTime } from '../../appointments/appointmentPolicy';
import { Link } from 'react-router-dom';
import { CLINICAL_PLANS } from '../clinicalPlanPolicy';
import { HEALTH_HISTORY_PATH } from '../../healthHistory/healthHistoryPolicy';
export default function ExaminationEditor({ record, appointment, history, saving, onSave, onNotice, initialTab = 'clinical', diagnosisMode = false }) {
  const { user } = useAuth(); const key = examDraftKey(user.id, appointment.id); const readOnly = !record.editable;
  const [form, setForm] = useState(() => examValues(record)); const [baseline, setBaseline] = useState(() => JSON.stringify(examValues(record)));
  const [version, setVersion] = useState(record.version); const [appointmentVersion, setAppointmentVersion] = useState(appointment.version);
  const [tab, setTab] = useState(initialTab); const [focusField, setFocusField] = useState(''); const [errors, setErrors] = useState({}); const [error, setError] = useState('');
  const [complete, setComplete] = useState(false); const [ack, setAck] = useState(false); const [stamp, setStamp] = useState('');
  const root = useRef(null); const lock = useRef(false); const draftBlocked = useRef(false);
  const [recovery, setRecovery] = useState(() => {
    try { const raw = sessionStorage.getItem(key); if (!raw) return null; const draft = JSON.parse(raw);
      if (!isExaminationDraft(draft)) throw new Error('invalid');
      return draft;
    } catch { draftBlocked.current = true; return { invalid: true }; }
  });
  const dirty = JSON.stringify(form) !== baseline;
  const stale = version !== record.version || appointmentVersion !== appointment.version;
  useEffect(() => { if (focusField && !readOnly) root.current?.querySelector(`[name="${focusField}"]`)?.focus(); setFocusField(''); }, [focusField, tab, readOnly]);
  useEffect(() => {
    if (readOnly) setComplete(false);
    if (readOnly && version !== record.version) { const values = examValues(record); setForm(values); setBaseline(JSON.stringify(values)); setVersion(record.version); setAppointmentVersion(appointment.version); }
  }, [readOnly, record, appointment.version, version]);
  useEffect(() => {
    if (!dirty || readOnly || draftBlocked.current) return;
    try { const savedAt = new Date().toISOString(); sessionStorage.setItem(key, JSON.stringify({ version, appointmentVersion, values: form, savedAt })); setStamp(savedAt); }
    catch { setError('Không lưu được bản nháp cục bộ. Hãy lưu nháp hồ sơ trước khi rời trang.'); }
  }, [dirty, form, key, version, appointmentVersion, readOnly]);
  useEffect(() => {
    if (!dirty || readOnly) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    const guard = (event) => { const link = event.target.closest?.('a[href]'); if (link && new URL(link.href).origin === window.location.origin && !link.hash && !window.confirm('Bạn có nội dung chưa lưu vào hồ sơ. Rời trang và giữ bản nháp cục bộ?')) { event.preventDefault(); event.stopPropagation(); } };
    window.addEventListener('beforeunload', warn); document.addEventListener('click', guard, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guard, true); };
  }, [dirty, readOnly]);
  useEffect(() => { const name = Object.keys(errors).find((key) => errors[key]); if (!saving && name && !complete) root.current?.querySelector(`[name="${name}"]`)?.focus(); }, [errors, saving, complete, tab]);
  const change = (event) => { const { name, type, checked, value } = event.target; setForm({ ...form, [name]: type === 'checkbox' ? checked : value }); setErrors({ ...errors, [name]: '' }); setError(''); };
  const discardRecovery = () => { if (!window.confirm('Xóa bản nháp cục bộ của lượt khám này? Hồ sơ đã lưu không thay đổi.')) return; try { sessionStorage.removeItem(key); draftBlocked.current = false; setRecovery(null); } catch { setError('Không xóa được bản nháp cục bộ.'); } };
  const restore = () => {
    if (recovery.invalid) return;
    if (recovery.version !== version && !window.confirm('Bản nháp dựa trên phiên bản cũ. Khôi phục để đối chiếu thủ công với hồ sơ hiện tại?')) return;
    setForm(recovery.values); setRecovery(null); setError(''); onNotice('Đã khôi phục bản nháp cục bộ. Kiểm tra lại nội dung rồi lưu vào hồ sơ.');
  };
  const submit = async (final) => {
    if (saving || lock.current || readOnly) return;
    if (final && !ack) { setErrors({ acknowledged: 'Xác nhận đã kiểm tra hồ sơ trước khi hoàn tất.' }); return; }
    const values = { ...form, acknowledged: ack }; const fieldErrors = validateExamination(values, final);
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); setError('Vui lòng kiểm tra nội dung hồ sơ khám.'); setComplete(false); setTab(['reason', 'symptoms', 'examination', 'preliminaryAssessment', ...Object.keys(EXAM_METRICS)].includes(Object.keys(fieldErrors)[0]) ? 'clinical' : 'conclusion'); return; }
    lock.current = true; setError(''); setErrors({});
    try { const saved = await onSave({ ...values, expectedVersion: version, expectedAppointmentVersion: appointmentVersion }, final);
      const next = examValues(saved); setForm(next); setBaseline(JSON.stringify(next)); setVersion(saved.version); setAppointmentVersion(appointmentVersion + (final ? 1 : 0)); setComplete(false); setRecovery(null); setStamp('');
      try { sessionStorage.removeItem(key); draftBlocked.current = false; } catch { setError('Hồ sơ đã lưu nhưng chưa xóa được bản nháp cục bộ.'); }
      onNotice(final ? 'Đã chốt đợt khám. Hồ sơ bị khóa, lượt khám chuyển sang chờ thanh toán; lễ tân có thể lập hóa đơn.' : 'Đã lưu nháp hồ sơ khám. Khách hàng chưa thấy kết quả chưa hoàn tất.');
    } catch (problem) { setError(problem.message); setErrors(problem.fieldErrors || {}); setComplete(false); }
    finally { lock.current = false; }
  };
  const field = (name, label, textarea = true) => <label className="admin-field" key={name} htmlFor={`exam-${name}`}><span>{label}</span>{textarea ? <textarea id={`exam-${name}`} name={name} rows={3} maxLength={3000} value={form[name]} onChange={change} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `exam-${name}-error` : undefined} /> : <input id={`exam-${name}`} name={name} type="date" value={form[name]} onChange={change} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `exam-${name}-error` : undefined} />}{errors[name] && <small id={`exam-${name}-error`} className="admin-field-error">{errors[name]}</small>}</label>;
  return <div ref={root}>{error && <p className="admin-alert error" role="alert">{error}</p>}{stale && !readOnly && <div className="admin-alert error" role="alert">Hồ sơ đã thay đổi ở nơi khác. Nội dung đang nhập được giữ; tải lại để đối chiếu trước khi lưu.<button type="button" className="admin-button secondary" onClick={() => { if (!dirty || window.confirm('Tải lại để đối chiếu? Bản nháp cục bộ được giữ nếu đã lưu thành công.')) window.location.reload(); }}>Tải lại hồ sơ</button></div>}
    {recovery && !readOnly && <section className="admin-panel vet-editor-section"><h2>{recovery.invalid ? 'Bản nháp cục bộ không hợp lệ' : 'Có bản nháp chưa lưu vào hồ sơ'}</h2><p>{recovery.invalid ? 'Không tự động ghi đè dữ liệu nháp lỗi. Bạn có thể xóa rõ ràng rồi tiếp tục.' : `Đã lưu cục bộ lúc ${appointmentDateTime(recovery.savedAt)}. ${recovery.version !== version ? 'Bản nháp thuộc phiên bản cũ, cần đối chiếu.' : ''}`}</p>{!recovery.invalid && <button type="button" className="admin-button primary" onClick={restore}>Khôi phục bản nháp</button>} <button type="button" className="admin-button secondary" onClick={discardRecovery}>Xóa bản nháp cục bộ</button></section>}
    {diagnosisMode && <section className="admin-panel vet-diagnosis-guide"><strong>{record.code} · Ghi nhận lâm sàng</strong><p>Triệu chứng: {form.symptoms.trim() ? 'đã nhập' : 'chưa nhập'} · Chẩn đoán: {form.diagnosis.trim() || (form.undetermined && form.diagnosisReason.trim()) ? 'đã nhập nội dung' : 'chưa nhập'}. {readOnly ? 'Hồ sơ đã chốt, chỉ xem.' : 'Nội dung đang soạn chỉ được chia sẻ với chủ nuôi sau khi hoàn tất khám.'}</p><div><button type="button" className="admin-button secondary" onClick={() => { setTab('clinical'); setFocusField('symptoms'); }}>{readOnly ? 'Xem triệu chứng' : 'Ghi nhận triệu chứng'}</button><button type="button" className="admin-button secondary" onClick={() => { setTab('conclusion'); setFocusField('diagnosis'); }}>{readOnly ? 'Xem chẩn đoán' : 'Ghi nhận chẩn đoán'}</button></div></section>}
    <section className="admin-panel"><nav className="vet-editor-tabs" aria-label="Phần hồ sơ khám">{Object.entries(EXAM_TABS).map(([key, label]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</nav><div className="vet-save-status" role="status">{readOnly ? (record.status === 'COMPLETED' ? 'Hồ sơ đã chốt · Chỉ đọc' : 'Hồ sơ đang tạm khóa · Chỉ đọc') : dirty ? 'Có nội dung chưa lưu vào hồ sơ' : `Hồ sơ đã lưu · ${appointmentDateTime(record.updatedAt)}`}{stamp && !readOnly && <> · Bản nháp cục bộ: {appointmentDateTime(stamp)}</>}</div>
      <div className="vet-editor-section"><fieldset disabled={saving || readOnly}><legend className="pet-sr-only">Nội dung hồ sơ khám</legend><div hidden={tab !== 'clinical'}><h2>Khám lâm sàng</h2><p className="vet-muted">Nhập quan sát và số đo thực tế; để trống chỉ số chưa đo. Giới hạn nhập liệu không phải khoảng bình thường y khoa.</p>{field('reason', 'Lý do khám *')}{field('symptoms', 'Triệu chứng / bệnh sử *')}<div className="admin-form-row">{Object.entries(EXAM_METRICS).map(([name, spec]) => <label className="admin-field" key={name} htmlFor={`exam-${name}`}><span>{spec.label} ({spec.unit})</span><input id={`exam-${name}`} name={name} type="number" inputMode="decimal" min={spec.step} max={spec.max} step={spec.step} value={form[name] ?? ''} onChange={change} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `exam-${name}-error` : undefined} />{errors[name] && <small id={`exam-${name}-error`} className="admin-field-error">{errors[name]}</small>}</label>)}</div>{field('examination', 'Kết quả thăm khám lâm sàng *')}{field('preliminaryAssessment', 'Đánh giá sơ bộ')}</div>
      <div hidden={tab !== 'conclusion'}><h2>Chẩn đoán & điều trị</h2>{field('diagnosis', 'Chẩn đoán cuối') }<label className="vet-checkbox"><input name="undetermined" type="checkbox" checked={form.undetermined} onChange={change} />Chưa xác định chẩn đoán cuối — ghi rõ lý do.</label>{form.undetermined && field('diagnosisReason', 'Lý do chưa xác định chẩn đoán *')}{field('treatmentPlan', 'Kế hoạch điều trị *')}{field('recommendations', 'Dặn dò chia sẻ với chủ nuôi *')}{field('followUpDate', 'Ngày tái khám đề nghị (không bắt buộc)', false)}{field('doctorOnlyNotes', 'Ghi chú nội bộ bác sĩ (không chia sẻ với khách)')}<p className="vet-muted">Kê đơn và chỉ định tại các trang riêng bên dưới. Không tự cấp thuốc, giảm kho, tạo lịch tái khám hay giao dịch thanh toán.</p></div></fieldset>
      {tab === 'conclusion' && <div className="vet-plan-shortcuts">{Object.values(CLINICAL_PLANS).map((config) => <Link key={config.path} className="admin-button secondary" to={`${config.path}/${encodeURIComponent(appointment.id)}`}>{readOnly ? `Xem ${config.title.toLowerCase()}` : config.title} →</Link>)}<p className="vet-muted">Lưu nháp lâm sàng trước khi chuyển trang. Đơn/chỉ định và khám lâm sàng dùng chung phiên bản hồ sơ.</p></div>}
      {tab === 'history' && <div><h2>Lịch sử khám đã hoàn tất</h2><Link className="admin-button secondary" to={`${HEALTH_HISTORY_PATH}/${encodeURIComponent(appointment.petId)}`}>Mở dòng thời gian sức khỏe đầy đủ →</Link>{history.length ? history.map((item) => <article className="vet-history-item" key={item.id}><h3>{Number.isFinite(Date.parse(item.examinedAt)) ? appointmentDateTime(item.examinedAt) : 'Chưa có ngày hợp lệ'} · {item.doctorName}</h3><p>{item.diagnosis}</p><p className="vet-muted">{item.recommendations}</p></article>) : <p>Chưa có lần khám hoàn tất trước đó của thú cưng này.</p>}</div>}
      </div></section>{!readOnly && <div className="vet-editor-actions"><span>{dirty ? 'Nội dung chưa lưu' : 'Đã lưu vào hồ sơ'}</span><button type="button" className="admin-button secondary" disabled={saving || stale} onClick={() => submit(false)}>{saving ? 'Đang lưu…' : 'Lưu nháp hồ sơ'}</button><button type="button" className="admin-button primary" disabled={saving || stale} onClick={() => { setComplete(true); setAck(false); }}>Chốt đợt khám / Chuyển thanh toán</button></div>}
{complete && <Modal title="Xác nhận chốt đợt khám" id="vet-complete-title" busy={saving} onClose={() => !saving && setComplete(false)}><form className="admin-editor" onSubmit={(event) => { event.preventDefault(); submit(true); }}><p>Sau khi chốt, hồ sơ bệnh án sẽ bị khóa chỉnh sửa và lượt khám chuyển sang <strong>Chờ thanh toán</strong>. Dịch vụ làm tại phòng khám (tiêm phòng, tẩy giun, thủ thuật…) được ghi nhận đã thực hiện; thuốc trong đơn chờ lễ tân thu tiền rồi phát thuốc.</p><p><strong>Chẩn đoán:</strong> {form.undetermined ? `Chưa xác định — ${form.diagnosisReason || 'Chưa nhập lý do'}` : form.diagnosis || 'Chưa nhập'}</p><label className="vet-checkbox"><input name="acknowledged" type="checkbox" checked={ack} disabled={saving} onChange={(event) => setAck(event.target.checked)} />Đã kiểm tra thông tin khám, chẩn đoán, đơn thuốc và dặn dò trước khi chốt.</label>{errors.acknowledged && <p className="admin-alert error" role="alert">{errors.acknowledged}</p>}<div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={() => setComplete(false)}>Kiểm tra lại</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang chốt…' : 'Xác nhận chốt đợt khám'}</button></div></form></Modal>}
  </div>;
}
