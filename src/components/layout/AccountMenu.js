import { useEffect, useId, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants/accessPolicy';
import { CUSTOMER_LINKS } from '../../constants/customerNavigation';
import { RECEPTION_LINKS } from '../../constants/receptionNavigation';
import { VETERINARIAN_LINKS } from '../../constants/veterinarianNavigation';

function AccountIcon({ name }) {
  const paths = { user: 'M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    pets: 'M8 14c-2 0-4 3-4 5 0 3 4 1 8 1s8 2 8-1c0-2-2-5-4-5l-4-2z M6 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M11 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M17 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M22 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
    calendar: 'M5 5h14v16H5z M8 3v4 M16 3v4 M5 10h14 M9 14h2 M14 14h2 M9 18h2',
    document: 'M6 3h9l4 4v14H6z M15 3v5h4 M9 12h7 M9 16h7',
    medicine: 'M9 3a6 6 0 0 1 8.5 8.5L11.5 18A6 6 0 0 1 3 9.5z M7 7l10 10',
    service: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
    heart: 'M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 6 8 15 8 15S25 11 20 5z',
    admin: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', logout: 'M9 21H4V3h5 M14 8l5 4-5 4 M8 12h11' };
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function AccountMenu({ open, onOpenChange }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const root = useRef(null); const trigger = useRef(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => { if (!root.current?.contains(event.target)) onOpenChange(false); };
    const escape = (event) => { if (event.key === 'Escape') { onOpenChange(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); document.removeEventListener('keydown', escape); };
  }, [open, onOpenChange]);
  if (!user) return null;
  const names = (user.fullName || '').trim().split(/\s+/).filter(Boolean);
  const initials = names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : names[0]?.[0].toUpperCase() || 'P';
  const close = () => onOpenChange(false);
  return <div className="header-account" ref={root}>
    <button type="button" className={`account-trigger ${open ? 'is-open' : ''}`} ref={trigger} aria-label={open ? 'Đóng menu tài khoản' : 'Mở menu tài khoản'} aria-expanded={open} aria-controls={panelId} title={`Tài khoản của ${user.fullName}`} onClick={() => onOpenChange(!open)}>
      <span className="account-avatar" aria-hidden="true">{initials}</span><svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open && <div className="account-dropdown" id={panelId} role="region" aria-label="Tài khoản của bạn">
      <div className="account-identity"><span className="account-avatar" aria-hidden="true">{initials}</span><div><strong>{user.fullName || 'Người dùng PawCare'}</strong><span>{user.email}</span><small>{ROLES[user.role]?.label || 'Thành viên'}</small></div></div>
      <nav className="account-links" aria-label="Tác vụ tài khoản"><Link to="/portal/profile" onClick={close}><AccountIcon name="user" /><span>Thông tin cá nhân<small>Xem và quản lý hồ sơ của bạn</small></span></Link>
        {user.role === 'CUSTOMER' && CUSTOMER_LINKS.slice(1).map((item) => <Link key={item.to} to={item.to} onClick={close}><AccountIcon name={item.icon} /><span>{item.label}<small>{item.description}</small></span></Link>)}
        {user.role === 'ADMIN' && <Link to="/admin/dashboard" onClick={close}><AccountIcon name="admin" /><span>Trang quản trị<small>Mở khu vực quản lý hệ thống</small></span></Link>}
        {user.role === 'RECEPTIONIST' && RECEPTION_LINKS.map((item) => <Link key={item.to} to={item.to} onClick={close}><AccountIcon name={item.icon === 'users' ? 'user' : item.icon === 'calendar' ? 'calendar' : item.icon === 'chart' ? 'document' : 'pets'} /><span>{item.label}<small>Khu vực nhân viên lễ tân</small></span></Link>)}
        {user.role === 'VETERINARIAN' && VETERINARIAN_LINKS.map((item) => <Link key={item.to} to={item.to} onClick={close}><AccountIcon name={item.icon} /><span>{item.label}<small>Khu vực bác sĩ thú y</small></span></Link>)}
      </nav><div className="account-logout"><button type="button" onClick={() => { logout(); close(); navigate('/auth/login', { replace: true }); }}><AccountIcon name="logout" />Đăng xuất</button></div>
    </div>}
  </div>;
}
