import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PasswordInput from '../../components/auth/PasswordInput';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleHome } from '../../constants/accessPolicy';
import AuthLayout from '../../layouts/AuthLayout';
import '../../styles/auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    const result = await login(identifier, password, form.get('remember') === 'on');
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    const role = result.user.role;
    const returnTo = location.state?.from;
    const areas = { '/admin/': 'ADMIN', '/reception/': 'RECEPTIONIST', '/vet/': 'VETERINARIAN', '/lab/': 'LAB_TECHNICIAN', '/imaging/': 'IMAGING_TECHNICIAN' };
    const area = typeof returnTo === 'string' ? Object.keys(areas).find((prefix) => returnTo.startsWith(prefix)) : null;
    const allowedReturn = typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
      && (area ? areas[area] === role : returnTo === '/portal/profile' || !returnTo.startsWith('/portal/') || role === 'PET_OWNER');
    navigate(allowedReturn ? returnTo : getRoleHome(role), { replace: true });
  };

  return (
    <AuthLayout mode="login">
      <div className="auth-card">
        <div className="auth-heading">
          <span className="auth-heading-icon" aria-hidden="true">👋</span>
          <h2>Đăng nhập</h2>
          <p>Chào mừng bạn quay lại với PawCare.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field" htmlFor="login-email">
            <span>Tên đăng nhập hoặc số điện thoại</span>
            <input id="login-email" name="identifier" autoComplete="username" placeholder="Số điện thoại hoặc tên đăng nhập" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
          </label>
          <PasswordInput id="login-password" label="Mật khẩu" name="password" autoComplete="current-password" placeholder="Nhập mật khẩu" minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} error={error} required />
          <div className="auth-options">
            <label className="check-option"><input type="checkbox" name="remember" /><span>Ghi nhớ đăng nhập</span></label>
            <span className="auth-hint">Quên mật khẩu? Liên hệ lễ tân để được đặt lại.</span>
          </div>
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'} <span aria-hidden="true">→</span></button>
        </form>


        <p className="auth-switch">Chưa có tài khoản? <Link to="/auth/register">Đăng ký ngay</Link></p>
      </div>
    </AuthLayout>
  );
}
