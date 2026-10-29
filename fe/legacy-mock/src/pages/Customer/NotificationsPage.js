import { useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { CareHeading, CareState, CareEmpty, CarePagination } from '../../components/customer/CareUI';
import { useAuth } from '../../contexts/AuthContext';
import useCustomerData from '../../features/customer/useCustomerData';
import { listNotifications, markNotificationRead } from '../../features/notifications/notificationsRepository';
import { NOTIFICATION_KINDS, NOTIFICATIONS_CHANGED } from '../../features/notifications/notificationPolicy';
import { USERS_CHANGED } from '../../features/users/usersRepository';
import { PETS_CHANGED } from '../../features/pets/petsRepository';
import { APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED, appointmentDateTime } from '../../features/appointments/appointmentPolicy';
import { VACCINATIONS_CHANGED } from '../../features/vaccinations/vaccinationPolicy';
import { INVOICES_CHANGED } from '../../features/invoices/invoicePolicy';
import { normalize } from '../../features/catalog/catalogPolicy';
import { getNotificationWriteWarning } from '../../features/notifications/notificationWriter';
import '../../styles/pets.css';
import '../../styles/care.css';
import '../../styles/notifications.css';
const EVENTS = [NOTIFICATIONS_CHANGED, USERS_CHANGED, PETS_CHANGED, APPOINTMENTS_CHANGED, MEDICAL_RECORDS_CHANGED, VACCINATIONS_CHANGED, INVOICES_CHANGED];
export default function NotificationsPage() {
  const { user } = useAuth(); const { data, loading, error, refresh } = useCustomerData(listNotifications, EVENTS);
  const [filter, setFilter] = useState(''); const [query, setQuery] = useState(''); const [kind, setKind] = useState(''); const [page, setPage] = useState(1);
  const [problem, setProblem] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState('');
  const records = data || []; const filtered = records.filter((item) => (!filter || (filter === 'unread' ? !item.readAt : !!item.readAt)) && (!kind || item.kind === kind) && normalize(`${item.title} ${item.message} ${item.petName}`).includes(normalize(query.trim())));
  const pages = Math.max(1, Math.ceil(filtered.length / 6)); const currentPage = Math.min(page, pages);
  const markRead = async (id) => {
    if (busy) return; setBusy(id); setProblem(''); setNotice('');
    await Promise.resolve();
    try { markNotificationRead(user.id, id); setNotice('Đã đánh dấu thông báo đã đọc.'); refresh(); }
    catch (issue) { setProblem(issue.message); }
    finally { setBusy(''); }
  };
  return <CustomerLayout><main className="care-main" id="main-content"><div className="profile-container">
    <CareHeading eyebrow="GÓC CHĂM SÓC" title="Thông báo & nhắc nhở">Theo dõi lịch hẹn, hồ sơ khám, lịch tiêm và hóa đơn của các bé.</CareHeading>
    <p className="care-note">Thông báo demo cập nhật khi thao tác lịch hẹn, chốt khám, lập hóa đơn/thanh toán và nhắc lịch tiêm/tái khám khi bạn mở khu vực khách hàng. Chưa gửi email/SMS hoặc cảnh báo y tế tự động. Ngày dự kiến không xác nhận đã tiêm hoặc đã đặt lịch.</p>
    {!error && getNotificationWriteWarning() && <p className="pet-alert error" role="alert">{getNotificationWriteWarning()}</p>}
    {problem && <p className="pet-alert error" role="alert">{problem}</p>}{notice && <p className="pet-alert" role="status">{notice}</p>}
    <CareState loading={loading} error={error} refresh={refresh}>
      <div className="notification-toolbar"><label>Tìm thông báo<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tên bé, nội dung nhắc nhở…" /></label>
        <label>Trạng thái<select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="">Tất cả ({records.length})</option><option value="unread">Chưa đọc ({records.filter((item) => !item.readAt).length})</option><option value="read">Đã đọc</option></select></label>
        <label>Loại thông báo<select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}><option value="">Tất cả loại</option>{Object.entries(NOTIFICATION_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="pet-text-button" type="button" onClick={() => { setFilter(''); setQuery(''); setKind(''); setPage(1); }}>Xóa bộ lọc</button><button className="pet-text-button" type="button" onClick={refresh}>Làm mới</button></div>
      {!filtered.length ? <CareEmpty title={records.length ? 'Không có thông báo phù hợp' : 'Chưa có thông báo'} booking={false}>Thông báo được hiển thị theo đúng tài khoản của bạn. Thử đổi bộ lọc nếu cần.</CareEmpty> : <><ol className="notification-list">{filtered.slice((currentPage - 1) * 6, currentPage * 6).map((item) => <li className={`pet-panel notification-card ${item.readAt ? '' : 'unread'}`} key={item.id}>
        <div className="notification-card-heading"><span>{NOTIFICATION_KINDS[item.kind]} · {item.petName}</span><span className={`care-status ${item.readAt ? 'gray' : 'amber'}`}>{item.readAt ? 'Đã đọc' : 'Chưa đọc'}</span></div><h2>{item.title}</h2><p>{item.message}</p><time dateTime={item.createdAt}>{appointmentDateTime(item.createdAt)}</time>
        <div className="notification-card-actions">{item.to ? <Link className="pet-text-button" to={item.to}>Xem thông tin →</Link> : <span>Hồ sơ liên quan không còn khả dụng.</span>}{!item.readAt && <button className="pet-button secondary" type="button" disabled={!!busy} aria-label={`Đánh dấu đã đọc: ${item.title} · ${item.petName}`} onClick={() => markRead(item.id)}>{busy === item.id ? 'Đang lưu…' : 'Đánh dấu đã đọc'}</button>}</div>
      </li>)}</ol><CarePagination total={filtered.length} page={currentPage} pages={pages} onChange={setPage} /></>}
    </CareState>
  </div></main></CustomerLayout>;
}
