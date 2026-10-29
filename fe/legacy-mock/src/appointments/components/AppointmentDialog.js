import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { AppointmentBadge } from '../../../components/customer/CareUI';
import SlotPicker from '../../../components/customer/SlotPicker';
import PetField from '../../pets/components/PetField';
import { appointmentDateTime, CANCEL_REASONS, clinicDateOffset, MAX_BOOKING_DAYS, slotLabel } from '../appointmentPolicy';
import { clinicToday, money } from '../../catalog/catalogPolicy';

const TITLES = { cancel: 'Hủy lịch', reschedule: 'Đổi ngày / khung giờ', view: 'Lịch hẹn' };
const slotOf = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

// mode: 'view' | 'cancel' | 'reschedule'. Đổi/hủy chỉ được mở khi còn ít nhất 2 giờ tới giờ hẹn.
export default function AppointmentDialog({ appointment, mode = 'view', saving, onCancel, onReschedule, onClose }) {
  const [choice, setChoice] = useState(''); const [detail, setDetail] = useState('');
  const [date, setDate] = useState(''); const [time, setTime] = useState(''); const [changeReason, setChangeReason] = useState('');
  const [errors, setErrors] = useState({}); const [error, setError] = useState('');
  const cancelReason = choice === 'Lý do khác' ? detail.trim() : [choice, detail.trim()].filter(Boolean).join(' — ');
  const confirmCancel = async (event) => {
    event.preventDefault(); if (saving) return;
    if (!choice) { setError('Vui lòng chọn lý do hủy lịch.'); return; }
    if (choice === 'Lý do khác' && !detail.trim()) { setError('Vui lòng nhập lý do hủy lịch.'); return; }
    try { await onCancel(appointment.id, cancelReason, appointment.version); } catch (problem) { setError(problem.message); }
  };
  const confirmReschedule = async (event) => {
    event.preventDefault(); if (saving) return;
    try { await onReschedule(appointment.id, { date, time, reason: changeReason }, appointment.version); }
    catch (problem) { setErrors(problem.fieldErrors || {}); setError(problem.message); }
  };
  return <Modal variant="customer" title={`${TITLES[mode]} ${appointment.code}`} id="appointment-dialog-title" onClose={onClose} busy={saving}>
    <div className="care-dialog"><AppointmentBadge status={appointment.status} /><dl className="care-facts"><div><dt>Thú cưng</dt><dd>{appointment.petName}</dd></div><div><dt>Ngày & khung giờ</dt><dd>{appointmentDateTime(appointment.startsAt)} ({slotLabel(slotOf(appointment.startsAt))})</dd></div><div><dt>Nhu cầu khám</dt><dd>{appointment.serviceName}</dd></div><div><dt>Giá tham khảo lúc đặt</dt><dd>{money(appointment.estimatedPrice)}</dd></div><div className="care-fact-wide"><dt>Lý do khám</dt><dd>{appointment.reason}</dd></div>{appointment.rescheduleReason && <div className="care-fact-wide"><dt>Lý do đổi lịch gần nhất</dt><dd>{appointment.rescheduleReason}</dd></div>}{appointment.cancellationReason && <div className="care-fact-wide"><dt>Lý do hủy</dt><dd>{appointment.cancellationReason}</dd></div>}</dl>
      {(appointment.assignedDoctorName || appointment.roomName || appointment.checkedInAt) && <dl className="care-facts"><div><dt>Bác sĩ được phân công</dt><dd>{appointment.assignedDoctorName || 'Chưa phân công'}</dd></div><div><dt>Phòng khám</dt><dd>{appointment.roomName || 'Chưa phân công'}</dd></div>{appointment.checkedInAt && <div><dt>Đã tiếp nhận lúc</dt><dd>{appointmentDateTime(appointment.checkedInAt)}</dd></div>}</dl>}
      {mode === 'cancel' && <form onSubmit={confirmCancel}><PetField name="cancelChoice" label="Lý do hủy lịch" as="select" value={choice} required disabled={saving} onChange={(event) => { setChoice(event.target.value); setError(''); }}><option value="">Chọn lý do</option>{CANCEL_REASONS.map((item) => <option key={item} value={item}>{item}</option>)}</PetField>
        <PetField name="cancellationReason" label={choice === 'Lý do khác' ? 'Nhập lý do khác' : 'Ghi chú thêm (không bắt buộc)'} as="textarea" value={detail} maxLength={400} required={choice === 'Lý do khác'} rows={3} disabled={saving} onChange={(event) => { setDetail(event.target.value); setError(''); }} />{error && <p className="pet-alert error" role="alert">{error}</p>}<div className="care-actions"><button type="button" className="pet-button secondary" disabled={saving} onClick={onClose}>Giữ lịch hẹn</button><button type="submit" className="pet-button primary" disabled={saving}>{saving ? 'Đang hủy…' : 'Xác nhận hủy lịch'}</button></div></form>}
      {mode === 'reschedule' && <form onSubmit={confirmReschedule} noValidate><PetField name="rescheduleDate" label="Ngày khám mới" type="date" min={clinicToday()} max={clinicDateOffset(MAX_BOOKING_DAYS)} value={date} required disabled={saving} error={errors.date} onChange={(event) => { setDate(event.target.value); setTime(''); setErrors({}); setError(''); }} />
        <div className="pet-field"><span className="pet-label">Khung giờ mới *</span><SlotPicker date={date} value={time} excludeId={appointment.id} error={errors.time} onChange={(next) => { setTime(next); setErrors({}); setError(''); }} /></div>
        <PetField name="rescheduleReason" label="Lý do đổi lịch" as="textarea" value={changeReason} maxLength={500} required rows={2} disabled={saving} error={errors.rescheduleReason} onChange={(event) => { setChangeReason(event.target.value); setErrors({}); setError(''); }} />{error && <p className="pet-alert error" role="alert">{error}</p>}<div className="care-actions"><button type="button" className="pet-button secondary" disabled={saving} onClick={onClose}>Giữ lịch hiện tại</button><button type="submit" className="pet-button primary" disabled={saving}>{saving ? 'Đang đổi lịch…' : 'Xác nhận đổi lịch'}</button></div></form>}
      {mode === 'view' && <><p className="care-note">Lịch chờ xác nhận chưa phải lịch được bảo đảm. Bạn có thể tự đổi hoặc hủy lịch trước giờ hẹn tối thiểu 2 tiếng. Kết quả khám được xem riêng tại Lịch sử khám bệnh.</p><button type="button" className="pet-button secondary" onClick={onClose}>Đóng</button></>}
    </div>
  </Modal>;
}
