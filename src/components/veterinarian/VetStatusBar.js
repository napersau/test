import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMyDoctorState, useVisitActions } from '../../features/examinations/useVisitFlow';
import { DOCTOR_STATUSES } from '../../features/intake/intakePolicy';

// Thanh trạng thái tức thời của bác sĩ + hộp thoại nổi "Ca khám tiếp theo" khi có ca đã đủ kết quả cận lâm sàng (Priority Lock).
export default function VetStatusBar() {
  const state = useMyDoctorState(); const actions = useVisitActions(); const navigate = useNavigate(); const [error, setError] = useState('');
  const doctor = state.data; if (!doctor) return null;
  const status = DOCTOR_STATUSES[doctor.key]; const next = doctor.next;
  const invite = async () => {
    setError('');
    try { await actions.invite(next.id, next.version); navigate(`/vet/examinations/${encodeURIComponent(next.id)}`); }
    catch (problem) { setError(problem.message); }
  };
  return <section className="vet-status-bar" aria-label="Trạng thái bác sĩ">
    <div className="vet-status-facts"><span>Phòng khám cố định <strong>{doctor.roomNumber || 'Chưa gán'}</strong></span>
      <span>Trạng thái <strong className={`vet-status-badge tone-${status.tone}`}>{status.label}</strong></span>
      {doctor.record && <span>{doctor.key === 'BUSY' ? 'Đang khám' : doctor.key === 'ASSIGNED' ? 'Chờ bắt đầu' : 'Ca tái khám'}: <Link to={`/vet/examinations/${encodeURIComponent(doctor.record.id)}`}>{doctor.record.petName}</Link></span>}
      {doctor.postponed > 0 && <Link to="/vet/callback?tab=POSTPONED">{doctor.postponed} ca đã hoãn</Link>}</div>
    {next && doctor.key === 'AVAILABLE_PRIORITY_CALLBACK' && <div className="vet-callback-prompt" role="alert">
      <div><strong>Ca khám tiếp theo: Bệnh nhân {next.petName}</strong><span>Đã có đủ kết quả cận lâm sàng · mã {next.code}</span></div>
      <button type="button" className="admin-button primary" disabled={actions.saving} onClick={invite}>{actions.saving ? 'Đang mời…' : 'Mời vào phòng'}</button></div>}
    {next && doctor.key === 'BUSY' && <p className="vet-ready-badge" role="status">Ca {next.code} — {next.petName} đã có kết quả cận lâm sàng. <Link to="/vet/callback">Xem ca chờ tái khám</Link></p>}
    {error && <p className="admin-alert error" role="alert">{error}</p>}
  </section>;
}
