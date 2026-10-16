import { Link } from 'react-router-dom';
import { calendarDate, money } from '../../features/catalog/catalogPolicy';
import { appointmentDateTime } from '../../features/appointments/appointmentPolicy';
import { CUSTOMER_RECORD_CONFIG } from '../../features/customerRecords/recordConfig';

export function CustomerRecordBadge({ kind, status }) {
  const badge = CUSTOMER_RECORD_CONFIG[kind].statuses?.[status];
  if (!badge) return <span className="care-status green">Đơn theo hồ sơ khám hoàn tất</span>;
  return <span className={`care-status ${badge.tone}`}>{badge.icon && <span aria-hidden="true">{badge.icon} </span>}{badge.label}</span>;
}
export default function CustomerRecordCard({ kind, record }) {
  const config = CUSTOMER_RECORD_CONFIG[kind];
  return <article className={`pet-panel customer-record-card record-${kind}`}>
    <div className="care-card-top"><span className="record-kind-symbol" aria-hidden="true">{kind === 'vaccinations' ? '♡' : kind === 'prescriptions' ? 'Rx' : '₫'}</span><CustomerRecordBadge kind={kind} status={record.status} /></div>
    <h2>{kind === 'vaccinations' ? record.vaccineName : kind === 'prescriptions' ? `Đơn của ${record.petName}` : record.code}</h2><p className="record-pet-name">{record.petName}{kind === 'vaccinations' && record.doseLabel ? ` · ${record.doseLabel}` : ''}</p>
    {kind === 'vaccinations' ? <><p><span className="care-note">Ngày dự kiến: </span><strong>{calendarDate(record.dueDate)}</strong></p>{record.administeredAt && <p><span className="care-note">Đã ghi nhận tiêm: </span>{appointmentDateTime(record.administeredAt)}</p>}</> : <p className="care-note">{appointmentDateTime(record.issuedAt)}</p>}
    {kind === 'prescriptions' && <><p>Bác sĩ: {record.doctorName}</p><p>{record.items.length} loại thuốc · {record.items.slice(0, 3).map((medicine) => medicine.medicineName).join(', ')}{record.items.length > 3 ? '…' : ''}</p></>}
    {kind === 'invoices' && <div className="record-invoice-amount"><span>Tổng hóa đơn</span><strong>{money(record.total)}</strong><small>{record.status === 'CANCELLED' ? 'Hóa đơn đã hủy, không yêu cầu thanh toán.' : record.status === 'REFUNDED' ? `Đã hoàn tiền: ${money(record.refunded)}` : `Còn phải thanh toán: ${money(record.remaining)}`}</small></div>}
    <div className="care-actions"><Link className="pet-button secondary" to={`${config.route}/${encodeURIComponent(record.id)}`}>{kind === 'vaccinations' ? 'Xem lịch tiêm' : kind === 'prescriptions' ? 'Xem đơn thuốc' : 'Xem hóa đơn'}</Link>{kind === 'vaccinations' && !['COMPLETED', 'CANCELLED'].includes(record.status) && <Link className="pet-text-button" to={`/portal/booking?petId=${encodeURIComponent(record.petId)}`}>Đặt lịch khám</Link>}</div>
  </article>;
}
