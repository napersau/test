import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReceptionLayout from '../../layouts/ReceptionLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import { ReceptionNotice, ReceptionState } from '../../components/reception/ReceptionUI';
import useIntake from '../../features/intake/useIntake';
import AssignDoctorDialog from '../../features/intake/components/AssignDoctorDialog';
import AppointmentCloseDialog from '../../features/intake/components/AppointmentCloseDialog';
import PrintSlipDialog from '../../features/intake/components/PrintSlipDialog';
import NoteDialog from '../../features/intake/components/NoteDialog';
import { APPOINTMENT_STATUSES } from '../../features/appointments/appointmentPolicy';
import { DOCTOR_STATUSES, QUEUE_KINDS, getDoctorStatus, queueKind, waitMinutes, waitingQueue } from '../../features/intake/intakePolicy';
import { appointmentDateTime } from '../../features/appointments/appointmentPolicy';
import '../../styles/intake.css';

// Bảng điều phối hàng đợi: ca đang chờ (trái) và trạng thái các bác sĩ (phải).
export default function QueuePage() {
  const state = useIntake(); const [assigning, setAssigning] = useState(null); const [closing, setClosing] = useState(null); const [slip, setSlip] = useState(null);
  const [notice, setNotice] = useState(''); const [actionError, setActionError] = useState(''); const [abandon, setAbandon] = useState(null);
  const owners = new Map(state.customers.map((item) => [item.id, item]));
  const queue = waitingQueue(state.appointments);
  const doctors = state.doctors.map((doctor) => ({ ...doctor, status: getDoctorStatus(doctor.id, state.appointments) }));
  const available = doctors.filter((doctor) => doctor.roomNumber && doctor.status.key === 'AVAILABLE');
  const inProgress = state.appointments.filter((item) => item.status === 'IN_PROGRESS');
  const pendingResults = state.appointments.filter((item) => ['WAITING_RESULTS', 'RESULTS_READY'].includes(item.status)).sort((a, b) => a.assignedDoctorName.localeCompare(b.assignedDoctorName));
  const ownerName = (record) => owners.get(record.ownerId)?.fullName || 'Không tìm thấy chủ nuôi';
  const postpone = async (record) => {
    setActionError('');
    try { await state.postpone(record.id, !record.postponedAt, record.version); setNotice(record.postponedAt ? `Đã kích hoạt lại ${record.petName} trong hàng đợi.` : `Đã tạm hoãn ${record.petName}; ca được đẩy xuống cuối hàng đợi.`); }
    catch (problem) { setActionError(problem.message); }
  };
  const assign = async (id, doctorId, version) => {
    const record = await state.assign(id, doctorId, version);
    setAssigning(null); setNotice(`Mời khách vào ${record.roomName} — ${record.assignedDoctorName}.`);
    setSlip(record);
  };
  const stats = [['Ca đang chờ', queue.length, 'Chưa được phân công bác sĩ', 'users'], ['Bác sĩ sẵn sàng', available.length, `${doctors.length} bác sĩ đang hoạt động`, 'check'], ['Đang khám', inProgress.length, 'Bác sĩ đã bắt đầu khám', 'heart']];
  return <ReceptionLayout title="Bảng điều phối hàng đợi">
    <div className="admin-page-title"><div><span className="admin-eyebrow">ĐIỀU PHỐI TIẾP ĐÓN</span><h1>Bảng điều phối hàng đợi</h1><p>Theo dõi ca chờ khám, trạng thái bác sĩ và phân công bệnh nhân vào đúng phòng khám cố định.</p></div>
      <div className="reception-heading-actions"><Link className="admin-button secondary" to="/reception/intake">Tiếp nhận khách →</Link><button type="button" className="admin-button secondary" onClick={state.refresh}><AdminIcon name="refresh" />Làm mới</button></div></div>
    <ReceptionNotice message={notice} />
    {actionError && <p className="admin-alert error" role="alert">{actionError}</p>}
    <ReceptionState state={state}>
      <div className="reception-stats">{stats.map(([label, value, help, icon]) => <section className="admin-panel" key={label}><div><span>{label}</span><strong>{value}</strong><small>{help}</small></div><span className="reception-stat-icon"><AdminIcon name={icon} /></span></section>)}</div>
      <div className="queue-board">
        <section className="admin-panel queue-column" aria-labelledby="queue-heading"><div className="admin-panel-heading"><div><h2 id="queue-heading">Hàng đợi chờ khám <span>{queue.length}</span></h2><p>Cấp cứu → có hẹn đúng giờ → đến trễ / vãng lai (theo thời gian check-in).</p></div></div>
          {queue.length ? <div className="admin-table-scroll" role="region" tabIndex={0} aria-label="Bảng hàng đợi chờ khám"><table className="admin-users-table queue-table"><thead><tr><th scope="col">STT</th><th scope="col">Thú cưng</th><th scope="col">Loại</th><th scope="col">Triệu chứng</th><th scope="col">Chờ</th><th scope="col">Thao tác</th></tr></thead><tbody>
            {queue.map((record, index) => { const kind = queueKind(record); return <tr key={record.id} className={kind === 'EMERGENCY' ? 'queue-emergency' : record.postponedAt ? 'queue-postponed' : ''}>
              <td>{index + 1}</td>
              <td><div className="reception-table-contact"><strong>{record.petName}</strong><span>{ownerName(record)}</span><span>{record.code}</span></div></td>
              <td><span className={`reception-badge ${kind === 'EMERGENCY' ? 'intake-priority' : kind === 'SCHEDULED' ? 'blue' : ''}`}>{QUEUE_KINDS[kind]}</span>{record.postponedAt && <span className="reception-badge">Tạm hoãn</span>}</td>
              <td className="queue-reason">{record.reason}{record.weightKg !== '' && <small>{record.weightKg} kg · {record.temperatureC} °C</small>}</td>
              <td>{waitMinutes(record.checkedInAt)} phút</td>
              <td><div className="admin-row-actions"><button type="button" aria-label={`Phân công ${record.code}`} disabled={!!record.postponedAt || state.saving} onClick={() => { setAssigning(record); setNotice(''); setActionError(''); }}>Phân công</button>
                {kind !== 'EMERGENCY' && <button type="button" aria-label={`${record.postponedAt ? 'Kích hoạt lại' : 'Tạm hoãn'} ${record.code}`} disabled={state.saving} onClick={() => postpone(record)}>{record.postponedAt ? 'Kích hoạt lại' : 'Tạm hoãn'}</button>}
                <button type="button" aria-label={`Hủy tiếp nhận ${record.code}`} disabled={state.saving} onClick={() => { setClosing(record); setNotice(''); setActionError(''); }}>Hủy tiếp nhận</button></div></td>
            </tr>; })}</tbody></table></div>
            : <div className="admin-empty"><AdminIcon name="users" width="40" height="40" /><h2>Hiện không có bệnh nhân nào trong hàng đợi</h2><p>Ca mới được thêm sau khi lễ tân hoàn tất tiếp đón tại quầy.</p></div>}
          {queue.length > 0 && !available.length && <p className="queue-eta" role="status">Tất cả bác sĩ đang bận. Thời gian khám ước tính: {doctors.filter((doctor) => doctor.roomNumber).map((doctor) => `Phòng ${doctor.roomNumber} ~${doctor.status.estimatedMinutes} phút`).join(' · ') || 'chưa có phòng khám nào được gán'}.</p>}
        </section>
        <section className="admin-panel queue-column" aria-labelledby="doctors-heading"><div className="admin-panel-heading"><div><h2 id="doctors-heading">Bác sĩ & phòng khám <span>{doctors.length}</span></h2><p>Trạng thái tính tức thời từ các ca đã phân công.</p></div></div>
          {doctors.length ? <ul className="queue-doctors">{doctors.map((doctor) => { const status = DOCTOR_STATUSES[doctor.status.key]; const record = doctor.status.record;
            return <li key={doctor.id} className="queue-doctor"><div><strong>{doctor.fullName}</strong><span>{doctor.roomNumber ? `Phòng ${doctor.roomNumber}` : 'Chưa gán phòng cố định'}</span></div>
              <span className={`reception-badge ${status.tone === 'green' ? 'green' : status.tone === 'amber' ? 'intake-priority' : ''}`}>{status.label}</span>
              {record && <p>{doctor.status.key === 'BUSY' ? `Đang khám ${record.petName} · còn khoảng ${doctor.status.estimatedMinutes} phút` : `Chờ bắt đầu: ${record.petName} (nhận ca ${appointmentDateTime(record.assignedAt || record.checkedInAt)})`}</p>}
              {doctor.status.key === 'ASSIGNED' && <div className="admin-row-actions"><button type="button" aria-label={`Đổi bác sĩ ${record.code}`} disabled={state.saving} onClick={() => { setAssigning(record); setNotice(''); setActionError(''); }}>Đổi bác sĩ</button><button type="button" aria-label={`In phiếu số phòng ${record.code}`} onClick={() => setSlip(record)}>In phiếu số phòng</button></div>}
            </li>; })}</ul>
            : <div className="admin-empty"><h2>Chưa có bác sĩ hoạt động</h2><p>Admin cần tạo và kích hoạt tài khoản bác sĩ.</p></div>}
        </section>
      </div>
      <section className="admin-panel queue-results" aria-labelledby="results-heading"><div className="admin-panel-heading"><div><h2 id="results-heading">Đang chờ kết quả cận lâm sàng <span>{pendingResults.length}</span></h2><p>Chỉ xem, nhóm theo bác sĩ phụ trách. Khách bỏ về hẳn thì đóng ca để chuyển chi phí đã làm sang hóa đơn.</p></div></div>
        {pendingResults.length ? <ul className="queue-doctors">{pendingResults.map((record) => <li key={record.id} className="queue-doctor"><div><strong>{record.petName}</strong><span>{record.code} · {record.assignedDoctorName} · {record.roomName}</span></div><span className="reception-badge blue">{APPOINTMENT_STATUSES[record.status].label}</span>{record.callbackPostponed && <span className="reception-badge">Đã hoãn gọi</span>}<div className="admin-row-actions"><button type="button" aria-label={`Đóng ca ${record.code}`} disabled={state.saving} onClick={() => { setAbandon(record); setNotice(''); setActionError(''); }}>Đóng ca / Khách bỏ về</button></div></li>)}</ul> : <p className="queue-eta">Không có ca nào đang chờ kết quả.</p>}</section>
      <p className="admin-bottom-note"><AdminIcon name="shield" />Lễ tân chỉ điều phối ca và phòng; bác sĩ tự bấm "Bắt đầu khám". Ca của bác sĩ đang khám hoặc đã nhận ca không thể phân công thêm.</p>
    </ReceptionState>
    {abandon && <NoteDialog title="Đóng ca / Khách bỏ về" intro="Chỉ thực hiện sau khi đã liên hệ điện thoại xác nhận khách không quay lại. Hồ sơ chuyên môn bị khóa, dịch vụ chưa làm bị hủy, chi phí đã làm chuyển sang hóa đơn ghi nợ." label="Kết quả liên hệ khách" placeholder="Đã gọi điện, khách xác nhận không quay lại" submitLabel="Xác nhận đóng ca" record={abandon} saving={state.saving} onClose={() => setAbandon(null)} onConfirm={async (id, note, version) => { await state.closeVisit(id, note, version); setAbandon(null); setNotice('Đã đóng ca. Kết quả đã làm được lưu vào bệnh án; lập hóa đơn ghi nợ ở mục Hóa đơn & thanh toán.'); }} />}
    {assigning && <AssignDoctorDialog record={assigning} doctors={doctors} saving={state.saving} onAssign={assign} onClose={() => setAssigning(null)} />}
    {closing && <AppointmentCloseDialog record={closing} status="CANCELLED" saving={state.saving} onClose={() => setClosing(null)} onConfirm={async (...args) => { await state.closeAppointment(...args); setClosing(null); setNotice('Đã hủy tiếp nhận. Hồ sơ vẫn được giữ lại.'); }} />}
    {slip && <PrintSlipDialog title="Phiếu số phòng" heading={`Mời vào ${slip.roomName}`} entries={[['Thú cưng', slip.petName], ['Chủ nuôi', ownerName(slip)], ['Mã tiếp nhận', slip.code], ['Bác sĩ', slip.assignedDoctorName], ['Phòng khám', slip.roomName]]} note="Vui lòng vào đúng phòng khám và chờ bác sĩ mời." onClose={() => setSlip(null)} />}
  </ReceptionLayout>;
}
