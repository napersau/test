import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReceptionLayout from '../../layouts/ReceptionLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import InsightsPagination from '../../components/admin/InsightsPagination';
import { ReceptionState } from '../../components/reception/ReceptionUI';
import useReceptionFilters from '../../features/reception/useReceptionFilters';
import useIntake from '../../features/intake/useIntake';
import IntakeEditor from '../../features/intake/components/IntakeEditor';
import IntakeDetail from '../../features/intake/components/IntakeDetail';
import { clinicToday, normalize } from '../../features/catalog/catalogPolicy';
import { APPOINTMENT_STATUSES, appointmentDateTime } from '../../features/appointments/appointmentPolicy';
import { INTAKE_TABS, INTAKE_SOURCES, canCheckIn, isOverdue, waitMinutes, waitingQueue } from '../../features/intake/intakePolicy';
import '../../styles/intake.css';

const HELP = {
  SCHEDULED: 'Tra cứu theo số điện thoại hoặc mã lịch, đo sinh hiệu rồi đưa khách có lịch hẹn hôm nay vào hàng đợi.',
  WALK_IN: 'Khách không đặt trước: tra cứu số điện thoại, tạo nhanh hồ sơ nếu là khách mới và đưa vào hàng đợi chung.',
  EMERGENCY: 'Thú cưng nguy kịch (tai nạn, co giật, khó thở, ngộ độc, xuất huyết): ca được gắn cờ đỏ và lên đầu hàng đợi.',
};
const ACTION = { SCHEDULED: 'Tiếp nhận khách có lịch hẹn', WALK_IN: 'Tiếp nhận khách vãng lai', EMERGENCY: 'Tiếp nhận cấp cứu' };

export default function IntakePage() {
  const state = useIntake(); const [editor, setEditor] = useState(null); const [detail, setDetail] = useState(null); const [done, setDone] = useState(null);
  const owners = new Map(state.customers.map((item) => [item.id, item]));
  const today = clinicToday(); const isToday = (iso) => !!iso && clinicToday(new Date(iso)) === today;
  const tabOf = (values) => (Object.keys(INTAKE_TABS).includes(values.tab) ? values.tab : 'SCHEDULED');
  const rowsFor = (tab, record) => (tab === 'SCHEDULED' ? record.status === 'CONFIRMED' && isToday(record.startsAt)
    : record.source === tab && isToday(record.checkedInAt || record.startsAt) && ['CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(record.status));
  const ordered = [...state.appointments].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const filters = useReceptionFilters(ordered, (record, values) => rowsFor(tabOf(values), record)
    && normalize(`${record.code} ${record.petName} ${owners.get(record.ownerId)?.fullName || ''} ${owners.get(record.ownerId)?.phone || ''}`).includes(values.search));
  const tab = tabOf(Object.fromEntries(filters.params));
  const count = (key) => state.appointments.filter((record) => rowsFor(key, record)).length;
  const save = async (values, appointment) => {
    const record = appointment ? await state.checkIn(appointment.id, values) : await state.walkIn(values);
    setEditor(null); setDone(record);
  };
  const queue = waitingQueue(state.appointments);
  return <ReceptionLayout title="Tiếp nhận khách hàng">
    <div className="admin-page-title"><div><span className="admin-eyebrow">BÀN TIẾP NHẬN · {new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())}</span><h1>Tiếp nhận khách hàng</h1><p>Check-in khách có hẹn, tiếp nhận khách vãng lai hoặc ca cấp cứu và đưa vào hàng đợi khám.</p></div>
      {tab !== 'SCHEDULED' && <button type="button" className="admin-button primary" disabled={state.loading || !!state.error} onClick={() => { setEditor({ mode: tab }); setDone(null); }}><AdminIcon name="plus" />{ACTION[tab]}</button>}</div>
    {done && <div className="admin-alert success" role="status"><AdminIcon name="check" />Đã tiếp nhận {done.petName} ({done.code}) vào hàng đợi chờ khám. <Link to="/reception/queue">{done.priority === 'PRIORITY' ? 'Điều phối bác sĩ ngay →' : 'Xem hàng đợi →'}</Link></div>}
    <ReceptionState state={state}>
      <div className="reception-stats">{[
        ['Lịch đã xác nhận hôm nay', count('SCHEDULED'), 'Chờ khách đến quầy', 'calendar'],
        ['Đã tiếp nhận hôm nay', state.appointments.filter((item) => isToday(item.checkedInAt)).length, 'Lượt có thời gian check-in', 'check'],
        ['Đang chờ phân công', queue.length, 'Ưu tiên cấp cứu, sau đó theo giờ đến', 'users'],
      ].map(([label, value, help, icon]) => <section className="admin-panel" key={label}><div><span>{label}</span><strong>{value}</strong><small>{help}</small></div><span className="reception-stat-icon"><AdminIcon name={icon} /></span></section>)}</div>
      <section className="admin-panel intake-work-panel"><div className="admin-panel-heading"><div><h2>Bàn làm việc lễ tân</h2><p>{HELP[tab]}</p></div><button type="button" className="admin-button secondary" onClick={state.refresh}><AdminIcon name="refresh" />Làm mới</button></div>
        <nav className="intake-tabs" aria-label="Loại tiếp nhận">{Object.entries(INTAKE_TABS).map(([key, label]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => filters.set('tab', key)}>{label}<span>{count(key)}</span></button>)}</nav>
        <div className="admin-filters"><label className="admin-search"><AdminIcon name="search" /><input aria-label="Tìm lượt tiếp nhận" placeholder="Số điện thoại, mã lịch, tên bé, tên khách…" value={filters.params.get('search') || ''} onChange={(event) => filters.set('search', event.target.value)} /></label><button type="button" className="admin-clear" onClick={filters.reset}>Xóa bộ lọc</button></div>
        {filters.rows.length ? <div className="admin-table-scroll" role="region" tabIndex={0} aria-label="Bảng tiếp nhận"><table className="admin-users-table intake-table"><thead><tr><th scope="col">Khách hàng & thú cưng</th><th scope="col">Lượt khám</th><th scope="col">{tab === 'SCHEDULED' ? 'Kênh' : 'Trạng thái'}</th><th scope="col">Thao tác</th></tr></thead><tbody>{filters.rows.map((record) => {
          const owner = owners.get(record.ownerId); const late = isOverdue(record);
          return <tr key={record.id}><td><div className="reception-table-contact"><strong>{record.petName}</strong>{owner ? <Link to={`/reception/customers/${encodeURIComponent(owner.id)}`}>{owner.fullName}</Link> : <span>Không tìm thấy chủ nuôi</span>}<span>{owner?.phone || '—'}</span></div></td>
            <td><div className="reception-table-contact"><strong>{record.code}</strong><span>{record.serviceName}</span><span>{appointmentDateTime(record.checkedInAt || record.startsAt)}</span></div></td>
            <td>{tab === 'SCHEDULED' ? <div className="reception-table-contact"><span className="reception-badge blue">{INTAKE_SOURCES[record.source] || 'Chưa có nguồn'}</span>{late && <span className="intake-late" role="status">Quá giờ hẹn 30 phút</span>}{record.lateNote && <span>{record.lateNote}</span>}</div>
              : <div className="reception-table-contact"><span className="reception-badge blue">{APPOINTMENT_STATUSES[record.status].label}</span>{record.status === 'CHECKED_IN' && <span>{record.assignedDoctorName ? `${record.assignedDoctorName} · ${record.roomName}` : `Chờ phân công · ${waitMinutes(record.checkedInAt)} phút`}</span>}</div>}</td>
            <td><div className="admin-row-actions"><button type="button" aria-label={`Chi tiết ${record.code}`} onClick={() => setDetail(record)}>Chi tiết</button>{tab === 'SCHEDULED' && <button type="button" aria-label={`Tiếp nhận ${record.code}`} disabled={!canCheckIn(record)} onClick={() => { setEditor({ mode: 'SCHEDULED', appointment: record }); setDone(null); }}>Tiếp nhận</button>}</div></td></tr>;
        })}</tbody></table></div> : <div className="admin-empty"><AdminIcon name={tab === 'SCHEDULED' ? 'calendar' : 'users'} width="40" height="40" /><h2>{tab === 'SCHEDULED' ? 'Chưa có lịch đã xác nhận cho hôm nay' : tab === 'WALK_IN' ? 'Hôm nay chưa tiếp nhận khách vãng lai' : 'Hôm nay chưa có ca cấp cứu'}</h2><p>{tab === 'SCHEDULED' ? 'Yêu cầu đặt online cần được xác nhận ở trang Quản lý lịch hẹn trước khi check-in.' : 'Dùng nút phía trên để tiếp nhận.'}</p></div>}
        <InsightsPagination {...filters} />
      </section><p className="admin-bottom-note"><AdminIcon name="shield" />Tiếp nhận chỉ đưa vào hàng đợi; phân công bác sĩ thực hiện ở Bảng điều phối, bác sĩ tự bấm bắt đầu khám.</p>
    </ReceptionState>
    {editor && <IntakeEditor mode={editor.mode} appointment={editor.appointment} options={state} saving={state.saving} onClose={() => setEditor(null)} onSave={save} />}
    {detail && <IntakeDetail record={detail} owner={owners.get(detail.ownerId)} onClose={() => setDetail(null)} />}
  </ReceptionLayout>;
}
