import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { useAuth } from '../../contexts/AuthContext';
import PetAvatar from '../../components/customer/PetAvatar';
import { AppointmentBadge, CareHeading, CareState } from '../../components/customer/CareUI';
import PetField from '../../features/pets/components/PetField';
import { PET_SPECIES } from '../../features/pets/petPolicy';
import { useBooking } from '../../features/appointments/useCustomerCare';
import SlotPicker from '../../components/customer/SlotPicker';
import { appointmentDateTime, BOOKING_STEPS, bookingDraftKey, clinicDateOffset, EMPTY_BOOKING, MAX_BOOKING_DAYS, slotLabel, validateBooking } from '../../features/appointments/appointmentPolicy';
import { clinicToday, money } from '../../features/catalog/catalogPolicy';
import '../../styles/pets.css';
import '../../styles/care.css';

function initialDraft(ownerId, search) {
  try {
    const draft = JSON.parse(sessionStorage.getItem(bookingDraftKey(ownerId)) || 'null');
    if (draft && Object.keys(EMPTY_BOOKING).every((key) => typeof draft.form?.[key] === 'string' && draft.form[key].length <= 1000)
      && Number.isInteger(draft.step) && draft.step >= 0 && draft.step <= 3) {
      return { form: Object.fromEntries(Object.keys(EMPTY_BOOKING).map((key) => [key, draft.form[key]])), step: draft.step };
    }
  } catch { /* An unreadable draft must never prevent booking. */ }
  return { form: { ...EMPTY_BOOKING, petId: new URLSearchParams(search).get('petId') || '' }, step: 0 };
}
export default function BookingPage() {
  const { user } = useAuth(); const location = useLocation();
  const [draft] = useState(() => initialDraft(user.id, location.search));
  const [form, setForm] = useState(draft.form); const [step, setStep] = useState(draft.step);
  const [errors, setErrors] = useState({}); const [error, setError] = useState(''); const [draftWarning, setDraftWarning] = useState('');
  const [confirmed, setConfirmed] = useState(false); const [success, setSuccess] = useState(null);
  const { data, loading, error: loadError, refresh, saving, mutate } = useBooking();
  const formRef = useRef(null); const headingRef = useRef(null);
  const pet = data?.pets.find((item) => item.id === form.petId);
  const service = data?.services.find((item) => item.id === form.serviceId);
  const dirty = Object.keys(EMPTY_BOOKING).some((key) => form[key] !== EMPTY_BOOKING[key]);
  useEffect(() => {
    if (success || !dirty) return;
    try { sessionStorage.setItem(bookingDraftKey(user.id), JSON.stringify({ form, step })); setDraftWarning(''); }
    catch { setDraftWarning('Không lưu được bản nháp. Bạn vẫn có thể gửi yêu cầu; tải lại trang có thể mất thông tin chưa gửi.'); }
  }, [form, step, dirty, success, user.id]);
  useEffect(() => {
    if (!dirty || success) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, success]);
  const change = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value, ...(name === 'date' ? { time: '' } : {}) }));
    setErrors((current) => ({ ...current, [name]: '' })); setError(''); setConfirmed(false);
  };
  const chooseTime = (time) => { setForm((current) => ({ ...current, time })); setErrors((current) => ({ ...current, time: '' })); setError(''); setConfirmed(false); };
  const showErrors = (fieldErrors, message) => {
    setErrors(fieldErrors); setError(message);
    const fields = [['petId'], ['serviceId', 'reason'], ['date', 'time']];
    const invalidStep = fields.findIndex((items) => items.some((key) => fieldErrors[key]));
    if (invalidStep >= 0 && invalidStep !== step) setStep(invalidStep);
    else formRef.current?.elements.namedItem(Object.keys(fieldErrors)[0])?.focus();
  };
  const next = (event) => {
    event.preventDefault(); if (saving) return;
    const allErrors = validateBooking(form);
    if (!pet) allErrors.petId = 'Chọn thú cưng đang quản lý thuộc tài khoản của bạn.';
    if (!service) allErrors.serviceId = 'Chọn nhu cầu khám đang được sử dụng.';
    const relevant = [['petId'], ['serviceId', 'reason'], ['date', 'time']][step];
    const currentErrors = Object.fromEntries(Object.entries(allErrors).filter(([key]) => relevant.includes(key)));
    if (Object.keys(currentErrors).length) { showErrors(currentErrors, 'Vui lòng kiểm tra thông tin ở bước này.'); return; }
    setErrors({}); setError(''); setStep((current) => current + 1); headingRef.current?.focus();
  };
  const submit = async (event) => {
    event.preventDefault(); if (saving) return;
    if (!confirmed) { setError('Xác nhận thông tin trước khi gửi yêu cầu.'); return; }
    const fieldErrors = validateBooking(form);
    if (Object.keys(fieldErrors).length) { showErrors(fieldErrors, 'Vui lòng kiểm tra thông tin đặt lịch.'); return; }
    try {
      const appointment = await mutate(form); setSuccess(appointment); setError('');
      try { sessionStorage.removeItem(bookingDraftKey(user.id)); } catch { /* The request is already saved. */ }
    } catch (problem) { showErrors(problem.fieldErrors || {}, problem.message); }
  };
  return <CustomerLayout><main className="care-page"><div className="profile-container">
    <CareHeading eyebrow="MỘT CUỘC HẸN, THÊM AN TÂM" title="Đặt lịch khám">Chọn bé, ngày và khung giờ khám. Phòng khám sẽ sắp xếp bác sĩ và xác nhận lịch cho bạn.</CareHeading>
    {success ? <section className="pet-panel care-booking-success" aria-labelledby="booking-success-title"><span className="care-success-icon" aria-hidden="true">✓</span><h2 id="booking-success-title">Đã gửi yêu cầu đặt lịch</h2><p role="status">Mã lịch hẹn: <strong>{success.code}</strong></p><AppointmentBadge status={success.status} /><dl className="care-facts"><div><dt>Thú cưng</dt><dd>{success.petName}</dd></div><div><dt>Ngày & khung giờ</dt><dd>{appointmentDateTime(success.startsAt)}</dd></div><div><dt>Nhu cầu khám</dt><dd>{success.serviceName}</dd></div></dl><p>Lịch hẹn đã được ghi nhận và đang chờ xác nhận. Lễ tân phòng khám sẽ liên hệ xác nhận trong vòng 30 phút.</p><div className="care-actions"><Link className="pet-button primary" to="/portal/appointments">Xem lịch hẹn của tôi</Link><Link className="pet-button secondary" to="/portal/pets">Về thú cưng của tôi</Link></div></section> : <CareState loading={loading} error={loadError} refresh={refresh}>
      {data && (!data.pets.length || !data.services.length) ? <section className="pet-panel pet-empty"><h2>{!data.pets.length ? 'Cần hồ sơ thú cưng trước khi đặt lịch' : 'Chưa có dịch vụ khám nhận yêu cầu'}</h2><p>{!data.pets.length ? 'Thêm thú cưng hoặc khôi phục hồ sơ đã lưu trữ để tiếp tục.' : 'Danh mục hiện chưa có dịch vụ khám đang hoạt động. Vui lòng thử lại sau.'}</p>{!data.pets.length ? <Link className="pet-button primary" to="/portal/pets">Quản lý thú cưng</Link> : <button type="button" className="pet-button secondary" onClick={refresh}>Làm mới dịch vụ</button>}</section> : data && <>
        <ol className="care-steps" aria-label="Các bước đặt lịch">{BOOKING_STEPS.map((label, index) => <li key={label} className={index === step ? 'current' : index < step ? 'done' : ''} aria-current={index === step ? 'step' : undefined}><span>{index < step ? '✓' : index + 1}</span>{label}</li>)}</ol>
        {draftWarning && <p className="pet-alert neutral" role="status">{draftWarning}</p>}
        <div className="care-booking-grid"><section className="pet-panel care-booking-panel"><h2 ref={headingRef} tabIndex="-1">{BOOKING_STEPS[step]}</h2><form ref={formRef} className="care-booking-form" onSubmit={step === 3 ? submit : next} noValidate>
          <fieldset disabled={saving}><legend className="pet-sr-only">{BOOKING_STEPS[step]}</legend>
          {step === 0 && <><p>Mỗi lịch hẹn dành cho một thú cưng thuộc tài khoản của bạn.</p><PetField name="petId" label="Thú cưng cần khám" as="select" value={form.petId} onChange={change} required error={errors.petId}><option value="">Chọn thú cưng</option>{data.pets.map((item) => <option key={item.id} value={item.id}>{item.name} · {PET_SPECIES[item.species]}</option>)}</PetField>{pet && <div className="care-selected-pet"><PetAvatar pet={pet} /><div><strong>{pet.name}</strong><p>{pet.breed || PET_SPECIES[pet.species]}</p><Link to={`/portal/pets/${pet.id}`}>Xem hồ sơ của bé</Link></div></div>}</>}
          {step === 1 && <><PetField name="serviceId" label="Nhu cầu khám" as="select" value={form.serviceId} onChange={change} required error={errors.serviceId}><option value="">Chọn nhu cầu khám</option>{data.services.map((item) => <option key={item.id} value={item.id}>{item.name} · {money(item.price)}</option>)}</PetField><PetField name="reason" label="Lý do khám / biểu hiện của bé" as="textarea" rows={5} maxLength={1000} value={form.reason} onChange={change} required error={errors.reason} placeholder="Mô tả điều bạn muốn bác sĩ kiểm tra…" /><p className="care-note">Đặt lịch online không dành cho cấp cứu. Nếu bé cần trợ giúp khẩn cấp, hãy liên hệ trực tiếp cơ sở thú y.</p></>}
          {step === 2 && <><PetField name="date" label="Ngày khám" type="date" min={clinicToday()} max={clinicDateOffset(MAX_BOOKING_DAYS)} value={form.date} onChange={change} required error={errors.date} /><div className="pet-field"><span className="pet-label">Khung giờ tiếp nhận *</span><SlotPicker date={form.date} value={form.time} onChange={chooseTime} error={errors.time} /></div><p className="care-note">Bạn chỉ chọn ngày và khung giờ, không chọn bác sĩ. Lễ tân sẽ phân công bác sĩ và phòng khám khi bé đến. Có thể đặt trước tối đa {MAX_BOOKING_DAYS} ngày.</p></>}
          {step === 3 && <><dl className="care-facts"><div><dt>Thú cưng</dt><dd>{pet?.name || 'Hồ sơ không còn khả dụng'}</dd></div><div><dt>Nhu cầu khám</dt><dd>{service?.name || 'Dịch vụ không còn khả dụng'}</dd></div><div><dt>Ngày & khung giờ</dt><dd>{form.date && form.time ? `${form.date.split('-').reverse().join('/')} · ${slotLabel(form.time)}` : 'Chưa chọn'}</dd></div><div className="care-fact-wide"><dt>Lý do khám</dt><dd>{form.reason}</dd></div></dl><label className="care-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setError(''); }} />Tôi đã kiểm tra thông tin và hiểu lịch cần được xác nhận.</label></>}
          </fieldset>{error && <div className="pet-alert error" role="alert">{error}</div>}
          <div className="care-actions">{step > 0 && <button type="button" className="pet-button secondary" disabled={saving} onClick={() => { setStep((current) => current - 1); setErrors({}); setError(''); setConfirmed(false); }}>← Quay lại</button>}<button type="submit" className="pet-button primary" disabled={saving}>{saving ? 'Đang gửi yêu cầu…' : step === 3 ? 'Gửi yêu cầu đặt lịch' : 'Tiếp tục →'}</button></div>
        </form></section><aside className="pet-panel care-summary"><span className="care-calendar-icon" aria-hidden="true">▦</span><h2>Hẹn bé một ngày khỏe hơn</h2><p>Bản nháp được giữ trong phiên trình duyệt để bạn tiếp tục khi quay lại.</p><hr /><p><strong>Chi phí tham khảo</strong></p><strong className="care-price">{service ? money(service.price) : 'Chọn nhu cầu khám'}</strong><p>Giá dịch vụ chưa bao gồm chỉ định/thuốc phát sinh. Chưa tạo hóa đơn hoặc yêu cầu thanh toán.</p><Link to="/portal/appointments">Xem các lịch hẹn đã gửi →</Link></aside></div>
      </>}
    </CareState>}
  </div></main></CustomerLayout>;
}
