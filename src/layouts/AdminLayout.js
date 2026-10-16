import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminIcon from '../components/admin/AdminIcon';
import AdminPageSearch from '../components/admin/AdminPageSearch';
import { ADMIN_NAVIGATION } from '../constants/adminNavigation';
import useAdminTheme from '../features/admin/useAdminTheme';
import '../styles/admin.css';

export default function AdminLayout({ children, title }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  const { theme, toggleTheme } = useAdminTheme();
  const navigate = useNavigate();
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event) => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menuOpen]);
  return (
    <div className="admin-shell" data-theme={theme} data-testid="admin-shell">
      <a className="admin-skip-link" href="#admin-main">Đến nội dung chính</a>
      {menuOpen && <button className="admin-sidebar-backdrop" type="button" aria-label="Đóng menu quản trị" onClick={() => setMenuOpen(false)} />}
      <aside id="admin-sidebar" className={`admin-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <Link className="admin-brand" to="/"><span><AdminIcon name="shield" /></span><div>PawCare<small>ADMIN CONSOLE</small></div></Link>
        <span className="admin-nav-caption">MENU QUẢN TRỊ</span>
        <nav aria-label="Điều hướng quản trị">
          {ADMIN_NAVIGATION.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}><AdminIcon name={item.icon} /><span>{item.label}</span><AdminIcon name="arrow" className="admin-nav-arrow" /></NavLink>)}
        </nav>
        <div className="admin-sidebar-note"><span><AdminIcon name="shield" />PAWCARE WORKSPACE</span><strong>Chăm sóc tốt hơn.<br />Quản lý đơn giản hơn.</strong><p>Không gian dành riêng cho đội ngũ quản trị phòng khám.</p><Link to="/">Về trang chủ PawCare <AdminIcon name="arrow" /></Link></div>
        <div className="admin-sidebar-account"><span className="admin-avatar">{user.fullName.charAt(0)}</span><div><strong>Quản trị viên</strong><small>{user.email}</small></div><span className="admin-online-dot" title="Đang đăng nhập" /></div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <button ref={menuButton} className="admin-menu-button" type="button" aria-label={menuOpen ? 'Đóng menu quản trị' : 'Mở menu quản trị'} aria-expanded={menuOpen} aria-controls="admin-sidebar" onClick={() => setMenuOpen(!menuOpen)}><AdminIcon name="menu" /></button>
          <AdminPageSearch />
          <span className="admin-mobile-title">{title}</span>
          <button type="button" className="admin-icon-button admin-theme-toggle" aria-label={`Chuyển sang giao diện ${theme === 'dark' ? 'sáng' : 'tối'}`} title={`Chuyển sang giao diện ${theme === 'dark' ? 'sáng' : 'tối'}`} onClick={toggleTheme}><AdminIcon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
          <div className="admin-account"><span className="admin-avatar">{user.fullName.charAt(0)}</span><div><strong>{user.fullName}</strong><small>Quản trị viên</small></div><button type="button" className="admin-icon-button" aria-label="Đăng xuất" onClick={() => { logout(); navigate('/auth/login', { replace: true }); }}><AdminIcon name="logout" /></button></div>
        </header>
        <main id="admin-main" className="admin-main" tabIndex={-1}><div className="admin-breadcrumb"><Link to="/admin/dashboard">Quản trị</Link><AdminIcon name="arrow" /><span>{title}</span></div>{children}</main>
        <footer className="admin-footer"><span>© 2026 PawCare</span><span>Hệ thống quản lý phòng khám thú y</span></footer>
      </div>
    </div>
  );
}
