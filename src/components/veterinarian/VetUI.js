import { Link } from 'react-router-dom';
import { APPOINTMENT_STATUSES, appointmentDateTime } from '../../features/appointments/appointmentPolicy';
export function VetState({ state, children }) {
  if (state.loading) return <div className="admin-loading" role="status">Đang tải lịch và hồ sơ khám…</div>;
  if (state.error) return <section className="admin-panel admin-empty" role="alert"><h1>Không thể tải dữ liệu khám</h1><p>{state.error}</p><button type="button" className="admin-button secondary" onClick={state.refresh}>Thử lại</button><Link className="vet-back" to="/vet/today">Về khu vực khám bệnh</Link></section>;
  return children;
}
export function VetStatus({ status }) { const spec = APPOINTMENT_STATUSES[status]; return <span className={`reception-badge ${spec?.tone === 'green' ? 'green' : spec?.tone === 'blue' ? 'blue' : ''}`}>{spec?.label || status}</span>; }
export function VetTimeline({ appointment }) {
  return <ol className="vet-timeline" aria-label="Tiến trình lượt khám">{[
    ['Xác nhận', appointment.confirmedAt], ['Tiếp nhận', appointment.checkedInAt], ['Bắt đầu khám', appointment.startedAt], ...(appointment.sentToRoomsAt ? [['Gửi chỉ định cận lâm sàng', appointment.sentToRoomsAt], ['Đã có kết quả', appointment.resultsReadyAt]] : []), ['Chốt / hoàn tất', appointment.completedAt],
  ].map(([label, at]) => <li key={label} className={at ? 'done' : ''}><span aria-hidden="true">{at ? '✓' : '○'}</span><div><strong>{label}</strong><small>{at ? appointmentDateTime(at) : 'Chưa thực hiện'}</small></div></li>)}</ol>;
}
export function VetAppointmentAction({ appointment }) {
  const labels = { CHECKED_IN: 'Mở ca khám', IN_PROGRESS: 'Tiếp tục khám', WAITING_RESULTS: 'Xem tiến độ', RESULTS_READY: 'Xem kết quả', WAITING_PAYMENT: 'Xem hồ sơ', COMPLETED: 'Xem hồ sơ' };
  return labels[appointment.status] ? <Link className="admin-button secondary" to={`/vet/examinations/${encodeURIComponent(appointment.id)}`}>{labels[appointment.status]}</Link> : <span className="vet-muted">{appointment.status === 'CONFIRMED' ? 'Chờ lễ tân tiếp nhận' : 'Không có thao tác khám'}</span>;
}
