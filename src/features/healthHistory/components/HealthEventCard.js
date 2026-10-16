import { Link } from 'react-router-dom';
import AdminIcon from '../../../components/admin/AdminIcon';
import { HEALTH_EVENT_TYPES } from '../healthHistoryPolicy';
import { ORDER_STATES, ORDER_TONES } from '../../examinations/clinicalPlanPolicy';
import { VACCINATION_STATUSES } from '../../vaccinations/vaccinationPolicy';
import { APPOINTMENT_STATUSES, appointmentDateTime } from '../../appointments/appointmentPolicy';
import { serviceTypeLabel, calendarDate } from '../../catalog/catalogPolicy';

export function HealthEventStatus({ event }) {
  const { kind, data } = event;
  const spec = kind === 'vaccinations' ? VACCINATION_STATUSES[data.status] : kind === 'appointments' ? APPOINTMENT_STATUSES[data.status] : null;
  const label = spec?.label || (kind === 'services' ? ORDER_STATES[data.status] : 'Theo hồ sơ đã hoàn tất');
  const tone = kind === 'services' ? ORDER_TONES[data.status] : spec?.tone || 'green';
  return <span className={`reception-badge vet-health-badge ${tone}`}>{spec?.icon && <span aria-hidden="true">{spec.icon}</span>}{label}</span>;
}
export default function HealthEventCard({ event, onOpen }) {
  const { data, kind } = event;
  const preview = kind === 'visits' ? data.diagnosis : kind === 'results' ? data.result : kind === 'prescriptions' ? data.items.map((item) => item.medicineName).join(', ')
    : kind === 'vaccinations' ? `${data.doseLabel || 'Chưa có nhãn mũi'} · Ngày dự kiến ${calendarDate(data.dueDate)}` : kind === 'services' ? data.notes || 'Chưa có ghi chú chỉ định.' : data.reason;
  return <article className="admin-panel vet-health-event"><span className="vet-health-event-icon"><AdminIcon name={HEALTH_EVENT_TYPES[kind].icon} /></span><div className="vet-health-event-main"><div className="vet-health-event-top"><span>{HEALTH_EVENT_TYPES[kind].label} · {event.dateOnly ? calendarDate(event.date) : appointmentDateTime(event.at)}</span><HealthEventStatus event={event} /></div><h3>{event.title}</h3><p className="vet-health-preview">{preview}</p><div className="vet-health-event-bottom"><small>{data.recordCode || data.code || ''}{data.doctorName ? ` · ${data.doctorName}` : ''}</small><button type="button" className="admin-button secondary" onClick={() => onOpen(event.id)}>Xem chi tiết<span className="pet-sr-only"> {event.title}</span><AdminIcon name="arrow" /></button></div></div></article>;
}
const text = (label, value) => <div className="vet-health-detail-field"><h3>{label}</h3><p>{value || 'Chưa có thông tin.'}</p></div>;
export function HealthEventDetail({ event }) {
  const { kind, data } = event;
  return <div className="vet-health-detail"><HealthEventStatus event={event} /><p className="vet-muted">{event.dateOnly ? calendarDate(event.date) : appointmentDateTime(event.at)}{data.doctorName && ` · ${data.doctorName}`}{data.recordCode && ` · ${data.recordCode}`}</p>{['results', 'prescriptions'].includes(kind) && <p className="vet-muted">Thời gian trên theo lần khám đã hoàn tất, không tự suy ra thời điểm cấp thuốc hoặc trả kết quả.</p>}
    {kind === 'visits' && <>{text('Chẩn đoán đã chốt', data.diagnosis)}{text('Kế hoạch điều trị', data.treatmentPlan)}{text('Dặn dò', data.recommendations)}<p>Cân nặng lúc khám: {data.weight === null ? 'Chưa đo' : `${data.weight} kg`}</p>{data.followUpDate && <p>Đề nghị tái khám: {calendarDate(data.followUpDate)}. Đây không phải lịch hẹn đã đặt.</p>}{data.appointmentId && <Link className="admin-button secondary" to={`/vet/records/${encodeURIComponent(data.appointmentId)}`}>Xem hồ sơ khám của bạn</Link>}</>}
    {kind === 'results' && <>{text('Kết quả được ghi nhận', data.result)}<p className="vet-muted">Kết quả thuộc hồ sơ hiển thị trên đây; không tự suy luận liên kết với một chỉ định khác.</p></>}
    {kind === 'prescriptions' && <><p className="vet-muted">Đơn kê không xác nhận đã cấp thuốc hoặc thanh toán. Thiếu hướng dẫn không được tự điền.</p>{data.items.map((item) => <section className="vet-health-medicine" key={item.id}><h3>{item.medicineName}</h3>{text('Liều dùng', item.dosage)}{text('Tần suất', item.frequency)}{text('Thời gian dùng', item.duration)}<p>Số lượng: {item.quantity ?? 'Chưa ghi nhận'} {item.unit}</p>{text('Hướng dẫn sử dụng', item.instructions)}</section>)}</>}
    {kind === 'services' && <><p>{serviceTypeLabel(data.serviceType)} · Số lượng {data.quantity}</p>{text('Ghi chú chỉ định', data.notes)}<p className="vet-muted">{data.requiresResult ? 'Dịch vụ yêu cầu kết quả khi thực hiện. ' : ''}Trạng thái chỉ định không thay thế kết quả lâm sàng hoặc hóa đơn.</p></>}
    {kind === 'vaccinations' && <><p>Mũi: {data.doseLabel || 'Chưa ghi nhận'}</p><p>Ngày dự kiến: {calendarDate(data.dueDate)}</p>{data.administeredAt && <p>Đã ghi nhận tiêm: {appointmentDateTime(data.administeredAt)}</p>}{text('Cơ sở', data.clinicName)}{text('Lưu ý được chia sẻ', data.customerNotes)}<p className="vet-muted">Chỉ đọc dữ liệu tiêm phòng của phòng khám, không tự xác nhận đã tiêm hoặc tính phác đồ.</p></>}
    {kind === 'appointments' && <><p>{data.code}</p>{text('Lý do đăng ký', data.reason)}<p className="vet-muted">Đây là trạng thái lịch được phân công cho bạn. Lịch hẹn không thay thế hồ sơ khám đã chốt.</p></>}
  </div>;
}
