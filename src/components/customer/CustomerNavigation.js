import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CUSTOMER_LINKS } from '../../constants/customerNavigation';

export default function CustomerNavigation() {
  const { user } = useAuth();
  const customer = user?.role === 'CUSTOMER';
  return <div className="customer-navigation"><div className="profile-container">
    <div className="customer-breadcrumb"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span>{customer ? 'Khu vực khách hàng' : 'Khu vực cá nhân'}</span></div>
    <nav className={customer ? 'customer-nav-links' : undefined} aria-label={customer ? 'Khu vực khách hàng' : 'Khu vực cá nhân'}>{(customer ? CUSTOMER_LINKS : CUSTOMER_LINKS.slice(0, 1)).map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}{user?.role === 'ADMIN' && <NavLink to="/admin/dashboard">Trang quản trị</NavLink>}</nav>
  </div></div>;
}
