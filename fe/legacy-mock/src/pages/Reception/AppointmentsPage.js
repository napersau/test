import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReceptionLayout from '../../layouts/ReceptionLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import InsightsPagination from '../../components/admin/InsightsPagination';
import { ReceptionNotice, ReceptionState } from '../../components/reception/ReceptionUI';
import useReceptionFilters from '../../features/reception/useReceptionFilters';
import useIntake from '../../features/intake/useIntake';
import AppointmentEditor from '../../features/intake/components/AppointmentEditor';
import ConfirmAppointmentDialog from '../../features/intake/components/ConfirmAppointmentDialog';
import IntakeEditor from '../../features/intake/components/IntakeEditor';
import IntakeDetail from '../../features/intake/components/IntakeDetail';
import AppointmentCloseDialog from '../../features/intake/components/AppointmentCloseDialog';
import NoteDialog from '../../features/intake/components/NoteDialog';
import PrintSlipDialog from '../../features/intake/components/PrintSlipDialog';
import { APPOINTMENT_STATUSES, appointmentDateTime } from '../../features/appointments/appointmentPolicy';
import { INTAKE_SOURCES, canCheckIn, isOverdue } from '../../features/intake/intakePolicy';
import { clinicToday, normalize } from '../../features/catalog/catalogPolicy';
import '../../styles/intake.css';

const TABS = { PENDING: 'Chờ duyệt', TODAY: 'Hôm nay', ALL: 'Tất cả' };
const NOTE_DIALOGS = {
  contact: { title: 'Ghi chú liên hệ thất bại', intro: 'Không gọi được cho khách? Ghi lại lần liên hệ. Yêu cầu vẫn ở trạng thái chờ xác nhận và tiếp tục giữ chỗ.', label: 'Ghi chú liên hệ', placeholder: 'Ví dụ: gọi 2 lần, thuê bao không liên lạc được', submitLabel: 'Lưu ghi chú' },
  late: { title: 'Khách đến muộn', intro: 'Khách báo đang trên đường đến trễ: giữ lịch và ghi chú để lễ tân ca sau nắm được.', label: 'Ghi chú', placeholder: 'Khách đến muộn 15p', submitLabel: 'Lưu ghi chú' },
};

export default function AppointmentsPage() {
  const state = useIntake(); const [dialog, setDialog] = useState(null); const [notice, setNotice] = useState(''); const [slip, setSlip] = useState(null);
  const owners = new Map(state.customers.map((item) => [item.id, item]));
  const today = clinicToday();
  const tabOf = (values) => (Object.keys(TABS).includes(values.tab) ? values.tab : 'PENDING');
  const inTab = (tab, record) => (tab === 'PENDING' ? record.status === 'PENDING' : tab === 'TODAY' ? ['CONFIRMED', 'PENDING'].includes(record.status) && clinicToday(new Date(record.startsAt)) === today : true);
  const ordered = [...state.appointments].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const filters = useReceptionFilters(ordered, (item, values) => {
    const tab = tabOf(values);
    return inTab(tab, item) && (tab !== 'ALL' || ((!values.status || item.status === values.status) && (!values.date || clinicToday(new Date(item.startsAt)) === values.date) && (!values.source || item.source === values.source)))
      && normalize(`${item.code} ${item.petName} ${owners.get(item.ownerId)?.fullName || ''} ${owners.get(item.ownerId)?.phone || ''}`).includes(values.search);
  });
  const tab = tabOf(Object.fromEntries(filters.params));
  // Chờ duyệt: yêu cầu gửi sớm nhất xử lý trước; các tab khác theo giờ hẹn.
  const rows = tab === 'PENDING' ? [...filters.rows].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)) : filters.rows;
  const open = (name, record) => { setDialog({ name, record }); setNotice(''); };
  const finish = (message) => { setDialog(null); setNotice(message); };
  const slipFor = (record) => setSlip(record);
  const counts = { PENDING: state.appointments.filter((item) => inTab('PENDING', item)).length, TODAY: state.appointments.filter((item) => inTab('TODAY', item)).length, ALL: state.appointments.length };
  const actionsFor = (record) => {
    const buttons = [<button type="button" key="detail" aria-label={`Chi tiết ${record.code}`} onClick={() => open('detail', record)}>Chi tiết</button>];
    const add = (key, label, handler, disabled = false) => buttons.push(<button type="button" key={key} aria-label={`${label} ${record.code}`} disabled={disabled} onClick={handler}>{label}</button>);
    if (record.status === 'PENDING') { add('confirm', 'Xác nhận lịch', () => open('confirm', record)); add('reject', 'Từ chối', () => open('close', record)); add('contact', 'Ghi chú liên hệ thất bại', () => open('contact', record)); }
    if (record.status === 'CONFIRMED') {
      add('checkin', 'Check-in', () => open('checkin', record), !canCheckIn(record));
      if (isOverdue(record)) { add('late', 'Khách đến muộn', () => open('late', record)); add('noshow', 'Đánh dấu vắng mặt', () => open('noshow', record)); }
      add('slip', 'In phiếu hẹn', () => slipFor(record));
    }
    if (['PENDING', 'CONFIRMED'].includes(record.status)) { add('edit', 'Đổi giờ', () => open('edit', record)); if (record.status === 'CONFIRMED') add('cancel', 'Hủy', () => open('close', record)); }
    return buttons;
  };
  const note = NOTE_DIALOGS[dialog?.name];
  return <ReceptionLayout title="Quản lý lịch hẹn"><div className="admin-page-title"><div><span className="admin-eyebrow">LỊCH KHÁM PHÒNG KHÁM</span><h1>Quản lý lịch hẹn</h1><p>Duyệt yêu cầu đặt online, tạo lịch qua điện thoại / tại quầy, theo dõi lịch hôm nay và khách không đến.</p></div><button type="button" className="admin-button primary" disabled={state.loading || !!state.error} onClick={() => open('create')}><AdminIcon name="plus" />Tạo lịch hẹn</button></div><ReceptionNotice message={notice} /><ReceptionState state={state}>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Danh sách lịch hẹn <span>{state.appointments.length}</span></h2><p>{tab === 'PENDING' ? 'Yêu cầu online cần gọi xác nhận trong vòng 15–30 phút; yêu cầu gửi sớm nhất ở trên cùng.' : tab === 'TODAY' ? 'Lịch hôm nay: check-in khi khách đến, cảnh báo khi quá giờ hẹn 30 phút.' : 'Tra cứu mọi trạng thái theo ngày, kênh và từ khóa.'}</p></div><Link className="admin-button secondary" to="/reception/intake">Mở bàn tiếp nhận →</Link></div>
      <nav className="intake-tabs" aria-label="Nhóm lịch hẹn">{Object.entries(TABS).map(([key, label]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => filters.set('tab', key)}>{label}<span>{counts[key]}</span></button>)}</nav>
      <div className="admin-filters"><label className="admin-search"><AdminIcon name="search" /><input aria-label="Tìm lịch hẹn lễ tân" placeholder="Số điện thoại, mã lịch, tên bé, chủ nuôi…" value={filters.params.get('search') || ''} onChange={(event) => filters.set('search', event.target.value)} /></label>
        {tab === 'ALL' && <><input type="date" aria-label="Lọc ngày hẹn" className="staff-date-input" value={filters.params.get('date') || ''} onChange={(event) => filters.set('date', event.target.value)} /><select aria-label="Lọc trạng thái lịch hẹn lễ tân" value={filters.params.get('status') || ''} onChange={(event) => filters.set('status', event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(APPOINTMENT_STATUSES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select><select aria-label="Lọc kênh đặt lịch" value={filters.params.get('source') || ''} onChange={(event) => filters.set('source', event.target.value)}><option value="">Tất cả kênh</option>{Object.entries(INTAKE_SOURCES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></>}
        <button type="button" className="admin-clear" onClick={() => filters.replace({ tab })}>Xóa bộ lọc</button></div>
      {rows.length ? <div className="admin-table-scroll" role="region" tabIndex={0} aria-label="Bảng lịch hẹn lễ tân"><table className="admin-users-table intake-table"><thead><tr><th scope="col">Lịch hẹn</th><th scope="col">Khách hàng</th><th scope="col">Kênh</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead><tbody>{rows.map((record) => { const owner = owners.get(record.ownerId); const late = isOverdue(record);
        return <tr key={record.id}><td><div className="reception-table-contact"><strong>{record.code} · {record.petName}</strong><span>{appointmentDateTime(record.startsAt)}</span><span>{record.reason}</span></div></td>
          <td><div className="reception-table-contact"><strong>{owner?.fullName || 'Không tìm thấy chủ nuôi'}</strong><span>{owner?.phone || '—'}</span></div></td>
          <td><span className="reception-badge blue">{INTAKE_SOURCES[record.source] || 'Chưa có nguồn'}</span></td>
          <td><div className="reception-table-contact"><span className="reception-badge blue">{APPOINTMENT_STATUSES[record.status].label}</span>{late && <span className="intake-late" role="status">Quá giờ hẹn 30 phút, khách chưa đến</span>}{record.lateNote && <span>{record.lateNote}</span>}{record.contactAttempts > 0 && <span>Liên hệ không thành {record.contactAttempts} lần</span>}</div></td>
          <td><div className="admin-row-actions">{actionsFor(record)}</div></td></tr>; })}</tbody></table></div>
        : <div className="admin-empty"><AdminIcon name="calendar" width="40" height="40" /><h2>{tab === 'PENDING' ? 'Không có yêu cầu chờ duyệt' : 'Chưa có lịch hẹn phù hợp'}</h2><p>Thay bộ lọc hoặc tạo lịch mới. Yêu cầu đặt online của khách tự xuất hiện tại đây.</p></div>}
      <InsightsPagination {...filters} />
    </section>
    <p className="admin-bottom-note">"Vắng mặt" chỉ ghi nhận sau giờ hẹn ít nhất 30 phút và cần lý do. Mỗi khung giờ nhận tối đa bằng số bác sĩ đang hoạt động.</p>
  </ReceptionState>
    {dialog?.name === 'create' && <AppointmentEditor options={state} saving={state.saving} onClose={() => setDialog(null)} onSave={async (values) => { const saved = await state.saveAppointment(values); finish(`Đã lưu ${saved.code} ở trạng thái đã xác nhận.`); filters.replace({ tab: 'ALL' }); if (saved.source === 'COUNTER') slipFor(saved); }} />}
    {dialog?.name === 'edit' && <AppointmentEditor appointment={dialog.record} options={state} saving={state.saving} onClose={() => setDialog(null)} onSave={async (values, record) => { const saved = await state.saveAppointment(values, record.id); finish(`Đã đổi giờ ${saved.code}; khung giờ cũ được trả lại chỗ.`); }} />}
    {dialog?.name === 'confirm' && <ConfirmAppointmentDialog record={dialog.record} owner={owners.get(dialog.record.ownerId)} saving={state.saving} onClose={() => setDialog(null)} onConfirm={async (id, values) => { const saved = await state.confirm(id, values); finish(`Đã xác nhận ${saved.code}. Khách nhận thông báo xác nhận.`); }} />}
    {dialog?.name === 'checkin' && <IntakeEditor mode="SCHEDULED" appointment={dialog.record} options={state} saving={state.saving} onClose={() => setDialog(null)} onSave={async (values, record) => { const saved = await state.checkIn(record.id, values); finish(`Đã tiếp nhận ${saved.petName} (${saved.code}) vào hàng đợi chờ khám.`); }} />}
    {['close', 'noshow'].includes(dialog?.name) && <AppointmentCloseDialog record={dialog.record} status={dialog.name === 'noshow' ? 'NO_SHOW' : 'CANCELLED'} saving={state.saving} onClose={() => setDialog(null)} onConfirm={async (...args) => { const saved = await state.closeAppointment(...args); finish(saved.status === 'NO_SHOW' ? `Đã ghi nhận ${saved.code} vắng mặt.` : `Đã cập nhật trạng thái ${saved.code}; khung giờ đã được trả lại chỗ.`); }} />}
    {note && <NoteDialog {...note} record={dialog.record} saving={state.saving} onClose={() => setDialog(null)} onConfirm={async (id, text, version) => { if (dialog.name === 'contact') await state.contactFailed(id, text, version); else await state.lateNote(id, text, version); finish('Đã lưu ghi chú; lịch hẹn được giữ nguyên.'); }} />}
    {dialog?.name === 'detail' && <IntakeDetail record={dialog.record} owner={owners.get(dialog.record.ownerId)} onClose={() => setDialog(null)} />}
    {slip && <PrintSlipDialog title="Phiếu hẹn" heading={`Lịch hẹn ${slip.code}`} entries={[['Khách hàng', owners.get(slip.ownerId) ? `${owners.get(slip.ownerId).fullName} · ${owners.get(slip.ownerId).phone}` : ''], ['Thú cưng', slip.petName], ['Giờ hẹn', appointmentDateTime(slip.startsAt)], ['Dịch vụ', slip.serviceName], ['Lời dặn', slip.confirmAdvice]]} note="Vui lòng đến đúng giờ. Quá 30 phút phòng khám có thể ghi nhận vắng mặt." onClose={() => setSlip(null)} />}
  </ReceptionLayout>;
}
