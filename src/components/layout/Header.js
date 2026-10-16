import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Brand from '../common/Brand';
import AccountMenu from './AccountMenu';

const navigation = [
  { href: '/#services', label: 'Dịch vụ' },
  { href: '/#patients', label: 'Khách hàng' },
  { href: '/#pricing', label: 'Bảng giá' },
  { href: '/#reviews', label: 'Đánh giá' },
];

export default function Header() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuButton = useRef(null); const header = useRef(null);
  const location = useLocation();
  const closeMenu = () => { setMenuOpen(false); setAccountOpen(false); };
  const changeAccount = useCallback((open) => { setAccountOpen(open); if (open) setMenuOpen(false); }, []);
  useEffect(() => { setMenuOpen(false); setAccountOpen(false); }, [location.pathname, location.search, location.hash, user?.id]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const outside = (event) => { if (!header.current?.contains(event.target)) setMenuOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [menuOpen]);

  return (
    <header className="site-header" ref={header}>
      <div className="container nav-wrap">
        <Brand href="/" onClick={closeMenu} />
        <nav id="site-navigation" className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Điều hướng chính">
          {navigation.map((item) => <a href={item.href} onClick={closeMenu} key={item.href}>{item.label}</a>)}
          {user?.role === 'CUSTOMER' && <Link className="nav-my-pets" to="/portal/pets" onClick={closeMenu}><span aria-hidden="true">🐾</span>Thú cưng của tôi</Link>}
          {!user && <Link className="mobile-auth-link" to="/auth/login" onClick={closeMenu}>Đăng nhập</Link>}
        </nav>
        <div className="nav-actions">
          {!user && <Link className="sign-in" to="/auth/login">Đăng nhập</Link>}
          <Link className="button button-primary button-small header-booking" to="/portal/booking" onClick={closeMenu}>Đặt lịch <span aria-hidden="true">🐾</span></Link>
          {user && <AccountMenu open={accountOpen} onOpenChange={changeAccount} />}
          <button ref={menuButton} className="menu-toggle" type="button" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => { setMenuOpen((current) => !current); setAccountOpen(false); }}><span /><span /><span /></button>
        </div>
      </div>
    </header>
  );
}
