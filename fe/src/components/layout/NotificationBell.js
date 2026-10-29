import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDateTime } from '../../lib/format';

const SEVERITY_TONE = { INFO: 'blue', WARNING: 'amber', CRITICAL: 'red' };

export function NotificationList({ items, empty = 'Chưa có thông báo nào.' }) {
  if (!items.length) return <p className="ui-muted" style={{ padding: 16, margin: 0 }}>{empty}</p>;
  return <ul className="ui-list">{items.map((item) => <li key={item.id}>
    <div><span className={`ui-badge ${SEVERITY_TONE[item.severity] || 'blue'}`}>{item.title}</span><small>{item.body}</small></div>
    <small>{formatDateTime(item.createdAt)}</small>
  </li>)}</ul>;
}

/** Chuông thông báo + khung nổi cho thông báo mới (CRITICAL giữ lâu hơn). `allPath` là trang xem toàn bộ (nếu có). */
export default function NotificationBell({ allPath }) {
  const { items, unread, connection, markAllRead, toast, dismissToast } = useNotifications();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const toggle = () => { if (!open) markAllRead(); setOpen(!open); };
  return <div className="notify-bell" ref={root}>
    <button type="button" className="admin-icon-button" aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`} aria-expanded={open} onClick={toggle}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0" /></svg>
      {unread > 0 && <span className="notify-count">{unread > 99 ? '99+' : unread}</span>}
      <span className={`notify-dot ${connection}`} title={connection === 'connected' ? 'Đang nhận thông báo trực tiếp' : 'Chưa kết nối thông báo trực tiếp'} />
    </button>
    {open && <div className="notify-panel" role="region" aria-label="Thông báo gần đây">
      <header><strong>Thông báo</strong>{allPath && <Link to={allPath} onClick={() => setOpen(false)}>Xem tất cả</Link>}</header>
      <NotificationList items={items.slice(0, 8)} />
    </div>}
    {toast && <div className={`notify-toast ${toast.severity === 'CRITICAL' ? 'critical' : ''}`} role="alert">
      <strong>{toast.title}</strong><span>{toast.body}</span>
      {toast.data?.action === 'INVITE_PATIENT' && <Link className="notify-action" to="/vet/today" onClick={dismissToast}>Mời bệnh nhân vào phòng</Link>}
      <button type="button" aria-label="Đóng thông báo" onClick={dismissToast}>×</button>
    </div>}
  </div>;
}
