import { useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { AppointmentBadge, CareEmpty, CareHeading, CarePagination, CareState } from '../../components/customer/CareUI';
import AppointmentDialog from '../../features/appointments/components/AppointmentDialog';
import { useAppointments } from '../../features/appointments/useCustomerCare';
import { APPOINTMENT_STATUSES, appointmentDateTime, canChangeAppointment, slotLabel, TOO_LATE_MESSAGE } from '../../features/appointments/appointmentPolicy';
import { normalize } from '../../features/catalog/catalogPolicy';
import '../../styles/pets.css';
import '../../styles/care.css';

export default function AppointmentsPage() {
  const { data, loading, error, refresh, saving, mutate, reschedule } = useAppointments();
  const [query, setQuery] = useState(''); const [status, setStatus] = useState(''); const [selection, setSelection] = useState({});
  const [dialog, setDialog] = useState(null); const [message, setMessage] = useState('');
  const appointments = data || [];
  const filtered = appointments.filter((item) => (!status || item.status === status) && normalize(`${item.code} ${item.petName} ${item.serviceName}`).includes(normalize(query.trim())));
  const key = `${query}|${status}`; const pages = Math.max(1, Math.ceil(filtered.length / 6)); const page = selection.key === key ? Math.min(selection.page, pages) : 1;
  const cancel = async (...args) => { await mutate(...args); setDialog(null); setMessage('Đã hủy lịch hẹn. Thông tin vẫn được giữ lại trong danh sách.'); };
  const change = async (...args) => { await reschedule(...args); setDialog(null); setMessage('Đã đổi lịch hẹn thành công.'); };
  const slotOf = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  return <CustomerLayout><main className="care-page"><div className="profile-container"><CareHeading eyebrow="LỊCH CHĂM SÓC CỦA BÉ" title="Lịch hẹn của tôi" action={<Link className="pet-button primary" to="/portal/booking">+ Đặt lịch khám</Link>}>Theo dõi trạng thái lịch hẹn, tự đổi ngày/giờ hoặc hủy lịch trước giờ hẹn tối thiểu 2 tiếng. Lịch hẹn không phải hồ sơ khám bệnh.</CareHeading>
    {message && <p className="pet-alert success" role="status">{message}</p>}
    <CareState loading={loading} error={error} refresh={refresh}>{!appointments.length ? <CareEmpty title="Bạn chưa có lịch hẹn">Gửi yêu cầu đầu tiên cho người bạn nhỏ của bạn.</CareEmpty> : <>
      <div className="care-list-toolbar"><label className="pet-search"><input aria-label="Tìm lịch hẹn" placeholder="Tìm mã lịch, tên thú cưng, dịch vụ…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select aria-label="Lọc trạng thái lịch hẹn" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(APPOINTMENT_STATUSES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select><button type="button" className="pet-button secondary" onClick={refresh}>Làm mới</button></div>
{!filtered.length ? <CareEmpty title="Không tìm thấy lịch hẹn" booking={false}>Thử thay đổi từ khóa hoặc trạng thái lọc.</CareEmpty> : <><div className="care-appointment-list">{filtered.slice((page - 1) * 6, page * 6).map((appointment) => <article key={appointment.id} className="pet-panel care-appointment-card" aria-label={`Lịch ${appointment.code}`}><div className="care-appointment-date"><span aria-hidden="true">▦</span><strong>{appointmentDateTime(appointment.startsAt)}</strong><small>Khung giờ {slotLabel(slotOf(appointment.startsAt))}</small></div><div className="care-appointment-body"><div className="care-card-top"><span className="care-code">{appointment.code}</span><AppointmentBadge status={appointment.status} /></div><h2>{appointment.petName}</h2><p>{appointment.serviceName}</p><p className="care-note">{appointment.assignedDoctorName ? `Bác sĩ phụ trách: ${appointment.assignedDoctorName}` : 'Bác sĩ sẽ được lễ tân phân công khi bé đến phòng khám'}</p><div className="care-actions"><button type="button" className="pet-button secondary" onClick={() => setDialog({ appointment, mode: 'view' })}>Xem chi tiết</button>{canChangeAppointment(appointment) && <><button type="button" className="pet-text-button" onClick={() => { setDialog({ appointment, mode: 'reschedule' }); setMessage(''); }}>Đổi ngày / giờ</button><button type="button" className="pet-text-button" onClick={() => { setDialog({ appointment, mode: 'cancel' }); setMessage(''); }}>Hủy lịch</button></>}<Link className="pet-text-button" to={`/portal/booking?petId=${encodeURIComponent(appointment.petId)}`}>Đặt lịch mới</Link></div>{['PENDING', 'CONFIRMED'].includes(appointment.status) && !canChangeAppointment(appointment) && Date.parse(appointment.startsAt) > Date.now() && <p className="care-note">{TOO_LATE_MESSAGE}</p>}</div></article>)}</div><CarePagination total={filtered.length} page={page} pages={pages} onChange={(next) => setSelection({ key, page: next })} /></>}
    </>}</CareState>{dialog && <AppointmentDialog appointment={dialog.appointment} mode={dialog.mode} onCancel={cancel} onReschedule={change} onClose={() => setDialog(null)} saving={saving} />}
  </div></main></CustomerLayout>;
}
