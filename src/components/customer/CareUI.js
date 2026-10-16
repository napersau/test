import { Link } from 'react-router-dom';
import { APPOINTMENT_STATUSES } from '../../features/appointments/appointmentPolicy';

export function CareHeading({ eyebrow, title, children, action }) {
  return <div className="care-heading"><div><span className="pet-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{children}</p></div>{action}</div>;
}
export function CareState({ loading, error, refresh, children }) {
  if (loading) return <p className="pet-loading" role="status">Đang tải dữ liệu…</p>;
  if (error) return <section className="pet-panel pet-empty" role="alert"><h2>Không thể tải dữ liệu</h2><p>{error}</p><button type="button" className="pet-button secondary" onClick={refresh}>Thử lại</button></section>;
  return children;
}
export function CareEmpty({ title, children, booking = true }) {
  return <section className="pet-panel pet-empty care-empty"><span aria-hidden="true">♡</span><h2>{title}</h2><p>{children}</p>{booking && <Link className="pet-button primary" to="/portal/booking">Đặt lịch khám</Link>}</section>;
}
export function AppointmentBadge({ status }) {
  const item = APPOINTMENT_STATUSES[status];
  return <span className={`care-status ${item.tone}`}>{item.label}</span>;
}
export function CarePagination({ page, pages, total, onChange }) {
  return <div className="pet-pagination"><span>{total} kết quả · Trang {page}/{pages}</span><div><button type="button" className="pet-button secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Trang trước</button><button type="button" className="pet-button secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>Trang sau →</button></div></div>;
}
