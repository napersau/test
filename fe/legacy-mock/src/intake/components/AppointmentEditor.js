import { useEffect, useRef, useState } from 'react';
import Modal from '../../../components/common/Modal';
import SlotPicker from '../../../components/customer/SlotPicker';
import { ReceptionFacts } from '../../../components/reception/ReceptionUI';
import { appointmentDateTime, clinicDateOffset, MAX_BOOKING_DAYS, validateBooking } from '../../appointments/appointmentPolicy';
import { clinicToday, money } from '../../catalog/catalogPolicy';
import { BOOKING_CHANNELS, INTAKE_SOURCES } from '../intakePolicy';
import CustomerPetPicker from './CustomerPetPicker';

// Lễ tân tạo lịch hộ khách (điện thoại / đặt trước tại quầy → CONFIRMED ngay) hoặc đổi ngày / giờ một lịch đang có.
export default function AppointmentEditor({ appointment, options, onSave, onClose, saving }) {
  const editing = !!appointment;
  const [initial] = useState(() => ({ ownerId: '', petId: '', newCustomer: null, newPet: null, serviceId: appointment?.serviceId || options.services[0]?.id || '', source: 'PHONE',
    reason: appointment?.reason || '', rescheduleReason: '', date: appointment ? clinicToday(new Date(appointment.startsAt)) : '', time: '' }));
  const [form, setForm] = useState(initial); const [version] = useState(appointment?.version);
  const [errors, setErrors] = useState({}); const [error, setError] = useState('');
  const formRef = useRef(null); const firstRef = useRef(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => { if (!dirty) return undefined; const warn = (event) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const close = () => { if (!saving && (!dirty || window.confirm('Lịch hẹn chưa lưu. Bạn muốn bỏ thay đổi?'))) onClose(); };
  const patch = (values) => { setForm((current) => ({ ...current, ...values })); setError(''); setErrors({}); };
  const change = (event) => { const { name, value } = event.target; patch({ [name]: value, ...(name === 'date' ? { time: '' } : {}) }); };
  const submit = async (event) => {
    event.preventDefault(); if (saving) return;
    const problems = { ...validateBooking({ ...form, petId: editing ? appointment.petId : form.petId || (form.newPet ? 'new' : '') }, new Date(), 0) };
    if (!editing && !form.ownerId && !form.newCustomer) problems.ownerId = 'Nhập số điện thoại để chọn khách hàng hoặc tạo nhanh khách mới.';
    if (editing && !form.rescheduleReason.trim()) problems.rescheduleReason = 'Nhập lý do đổi giờ để ghi vào lịch hẹn.';
    setErrors(problems); setError('');
    if (Object.keys(problems).length) { formRef.current?.elements.namedItem(Object.keys(problems)[0])?.focus(); return; }
    try { await onSave({ ...form, expectedVersion: version }, appointment); }
    catch (problem) { setError(problem.message); setErrors(problem.fieldErrors || {}); formRef.current?.elements.namedItem(Object.keys(problem.fieldErrors || {})[0])?.focus(); }
  };
  const field = (name, label, control) => <label className="admin-field" htmlFor={`appt-${name}`}><span>{label}</span>{control}{errors[name] && <small className="admin-field-error" id={`appt-error-${name}`}>{errors[name]}</small>}</label>;
  return <Modal title={editing ? 'Đổi ngày / giờ hẹn' : 'Tạo lịch hẹn'} id="appointment-editor-title" className="intake-editor-modal" onClose={close} busy={saving} initialFocusRef={firstRef}>
    <form className="admin-editor" ref={formRef} onSubmit={submit} noValidate>
      <p>{editing ? 'Chọn ngày và khung giờ còn chỗ. Trạng thái lịch được giữ nguyên, khung cũ tự được trả lại chỗ.' : 'Tạo lịch cho khách gọi điện hoặc đang có mặt tại quầy. Lịch được xác nhận ngay sau khi lưu.'}</p>
      {editing && <div className="intake-summary"><strong>{appointment.code}</strong><ReceptionFacts entries={[
        ['Khách hàng', options.customers.find((item) => item.id === appointment.ownerId)?.fullName], ['Thú cưng', appointment.petName], ['Giờ hẹn hiện tại', appointmentDateTime(appointment.startsAt)], ['Kênh', INTAKE_SOURCES[appointment.source]]]} /></div>}
      <fieldset disabled={saving}><legend className="pet-sr-only">Thông tin lịch hẹn</legend>
        {!editing && <>
          {field('source', 'Kênh đặt lịch *', <select id="appt-source" name="source" value={form.source} onChange={change}>{Object.entries(BOOKING_CHANNELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>)}
          <CustomerPetPicker options={options} value={form} onChange={patch} errors={errors} firstRef={firstRef} />
          {field('serviceId', 'Loại khám *', <select id="appt-serviceId" name="serviceId" value={form.serviceId} onChange={change} aria-invalid={!!errors.serviceId}><option value="">Chọn loại khám…</option>{options.services.map((item) => <option key={item.id} value={item.id}>{item.name} · {money(item.price)} (tham khảo)</option>)}</select>)}
        </>}
        {field('date', 'Ngày khám *', <input id="appt-date" name="date" type="date" ref={editing ? firstRef : undefined} min={clinicToday()} max={clinicDateOffset(MAX_BOOKING_DAYS)} value={form.date} onChange={change} aria-invalid={!!errors.date} />)}
        <div className="admin-field"><span id="appt-slot-label">Khung giờ * (mỗi khung nhận tối đa bằng số bác sĩ đang hoạt động)</span><SlotPicker date={form.date} value={form.time} onChange={(time) => patch({ time })} excludeId={appointment?.id || ''} error={errors.time} /></div>
        {field('reason', 'Triệu chứng / lý do khám *', <textarea id="appt-reason" name="reason" rows={3} maxLength={1000} value={form.reason} onChange={change} aria-invalid={!!errors.reason} />)}
        {editing && field('rescheduleReason', 'Lý do đổi giờ *', <input id="appt-rescheduleReason" name="rescheduleReason" maxLength={300} value={form.rescheduleReason} onChange={change} aria-invalid={!!errors.rescheduleReason} />)}
      </fieldset>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={close}>Hủy</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang lưu…' : editing ? 'Lưu giờ hẹn mới' : 'Lưu & xác nhận lịch hẹn'}</button></div>
    </form>
  </Modal>;
}
