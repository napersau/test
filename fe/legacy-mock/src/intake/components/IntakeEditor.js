import { useEffect, useRef, useState } from 'react';
import Modal from '../../../components/common/Modal';
import { ReceptionFacts } from '../../../components/reception/ReceptionUI';
import { appointmentDateTime } from '../../appointments/appointmentPolicy';
import { money } from '../../catalog/catalogPolicy';
import { EMPTY_INTAKE, VITAL_LIMITS, getDoctorStatus, validateIntake } from '../intakePolicy';
import CustomerPetPicker from './CustomerPetPicker';

const TITLES = { SCHEDULED: 'Tiếp nhận khách có lịch hẹn', WALK_IN: 'Tiếp nhận khách vãng lai', EMERGENCY: 'Tiếp nhận cấp cứu' };
const INTRO = {
  SCHEDULED: 'Đo cân nặng, thân nhiệt và hỏi lại triệu chứng. Sau khi hoàn tất, bé vào hàng đợi chờ phân công bác sĩ.',
  WALK_IN: 'Tra cứu theo số điện thoại. Khách mới được tạo nhanh hồ sơ. Sau khi hoàn tất, bé vào hàng đợi chung.',
  EMERGENCY: 'Ca cấp cứu được gắn cờ ưu tiên và lên đầu hàng đợi. Nhập nhanh thông tin cần thiết rồi điều phối bác sĩ ngay.',
};

// mode: SCHEDULED (check-in lịch hẹn đã xác nhận) | WALK_IN | EMERGENCY.
export default function IntakeEditor({ mode, appointment, options, onSave, onClose, saving }) {
  const walkIn = mode !== 'SCHEDULED';
  const [initial] = useState(() => ({ ...EMPTY_INTAKE, ownerId: '', petId: '', newCustomer: null, newPet: null, priority: mode === 'EMERGENCY' ? 'PRIORITY' : 'NORMAL',
    serviceId: appointment?.serviceId || options.services[0]?.id || '', reason: appointment?.reason || '' }));
  const [form, setForm] = useState(initial); const [version] = useState(appointment?.version);
  const [errors, setErrors] = useState({}); const [error, setError] = useState('');
  const formRef = useRef(null); const firstRef = useRef(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => { if (!dirty) return undefined; const warn = (event) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const close = () => { if (!saving && (!dirty || window.confirm('Lượt tiếp nhận chưa lưu. Bạn muốn bỏ thay đổi?'))) onClose(); };
  const patch = (values) => { setForm((current) => ({ ...current, ...values })); setError(''); setErrors({}); };
  const change = (event) => { const { name, value } = event.target; patch({ [name]: value }); };
  const readyDoctors = (options.doctors || []).filter((doctor) => doctor.roomNumber && getDoctorStatus(doctor.id, options.appointments || []).key === 'AVAILABLE');
  const submit = async (event) => {
    event.preventDefault(); if (saving) return;
    const subject = walkIn ? { ownerId: form.ownerId || (form.newCustomer ? 'new' : ''), petId: form.petId || (form.newPet ? 'new' : '') } : {};
    const problems = validateIntake({ ...form, ...subject }, mode); setErrors(problems); setError('');
    if (Object.keys(problems).length) { formRef.current?.elements.namedItem(Object.keys(problems)[0])?.focus(); return; }
    try { await onSave({ ...form, emergency: mode === 'EMERGENCY', expectedVersion: version }, appointment); }
    catch (problem) { setError(problem.message); setErrors(problem.fieldErrors || {}); formRef.current?.elements.namedItem(Object.keys(problem.fieldErrors || {})[0])?.focus(); }
  };
  const field = (name, label, control) => <label className="admin-field" htmlFor={`intake-${name}`}><span>{label}</span>{control}{errors[name] && <small className="admin-field-error" id={`intake-error-${name}`}>{errors[name]}</small>}</label>;
  const vital = (name) => { const { label, unit, min, max } = VITAL_LIMITS[name];
    return field(name, `${label} (${unit}) *`, <input id={`intake-${name}`} name={name} type="text" inputMode="decimal" autoComplete="off" placeholder={`${min} – ${max}`} value={form[name]} onChange={change} ref={name === 'weightKg' && !walkIn ? firstRef : undefined}
      aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `intake-error-${name}` : undefined} />); };
  return <Modal title={TITLES[mode]} id="intake-editor-title" className="intake-editor-modal" onClose={close} busy={saving} initialFocusRef={firstRef}>
    <form className="admin-editor" ref={formRef} onSubmit={submit} noValidate>
      <p>{INTRO[mode]}</p>
      {appointment && <div className="intake-summary"><strong>{appointment.code}</strong><ReceptionFacts entries={[
        ['Khách hàng', options.customers.find((item) => item.id === appointment.ownerId)?.fullName], ['Thú cưng', appointment.petName], ['Giờ hẹn', appointmentDateTime(appointment.startsAt)],
        ['Dịch vụ', appointment.serviceName], ['Triệu chứng khi đặt lịch', appointment.reason], ['Lời dặn đã gửi', appointment.confirmAdvice],
      ]} /></div>}
      <fieldset disabled={saving}><legend className="pet-sr-only">Thông tin lượt tiếp nhận</legend>
        {walkIn && <>
          <CustomerPetPicker options={options} value={form} onChange={patch} errors={errors} firstRef={firstRef} />
          {field('serviceId', 'Loại khám *', <select id="intake-serviceId" name="serviceId" value={form.serviceId} onChange={change} aria-invalid={!!errors.serviceId}><option value="">Chọn loại khám…</option>{options.services.map((item) => <option key={item.id} value={item.id}>{item.name} · {money(item.price)} (tham khảo)</option>)}</select>)}
        </>}
        <div className="admin-form-row">{vital('weightKg')}{vital('temperatureC')}</div>
        {field('reason', walkIn ? 'Triệu chứng / lý do đến khám *' : 'Triệu chứng hiện tại (cập nhật nếu khác khi đặt lịch)', <textarea id="intake-reason" name="reason" rows={3} maxLength={1000} value={form.reason} onChange={change} aria-invalid={!!errors.reason} />)}
        {mode === 'EMERGENCY' && field('assignedDoctorId', 'Điều phối ngay cho bác sĩ sẵn sàng (không bắt buộc)', <select id="intake-assignedDoctorId" name="assignedDoctorId" value={form.assignedDoctorId} onChange={change}><option value="">Phân công sau ở Bảng điều phối</option>{readyDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.fullName} · Phòng {doctor.roomNumber}</option>)}</select>)}
        {mode === 'SCHEDULED' && <label className="intake-ack"><input type="checkbox" checked={form.priority === 'PRIORITY'} onChange={(event) => patch({ priority: event.target.checked ? 'PRIORITY' : 'NORMAL' })} />Tình trạng nguy kịch — đánh dấu cấp cứu để lên đầu hàng đợi.</label>}
        {field('intakeNote', 'Ghi chú tiếp nhận (không bắt buộc)', <textarea id="intake-intakeNote" name="intakeNote" rows={2} maxLength={500} value={form.intakeNote} onChange={change} aria-invalid={!!errors.intakeNote} />)}
      </fieldset>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      <p className="intake-disclaimer">Lễ tân chỉ ghi nhận cân nặng, thân nhiệt và triệu chứng ban đầu; không ghi nhận kết luận chuyên môn.</p>
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={close}>Hủy</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Hoàn tất tiếp đón'}</button></div>
    </form>
  </Modal>;
}
