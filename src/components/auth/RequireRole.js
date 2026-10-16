import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleHome } from '../../constants/accessPolicy';
import RequireAuth from './RequireAuth';

export default function RequireRole({ role, children }) {
  const { user } = useAuth();
  return (
    <RequireAuth>
      {user && user.role !== role ? (
        <main className="access-denied">
          <p>403</p><h1>Bạn không có quyền truy cập</h1>
          <span>Trang này dành cho tài khoản có vai trò phù hợp.</span>
          <Link to={getRoleHome(user.role)}>Về khu vực của tôi</Link>
        </main>
      ) : children}
    </RequireAuth>
  );
}
