import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PasswordInput from '../../components/auth/PasswordInput';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_ACCOUNT } from '../../features/auth/authStorage';
import { getRoleHome } from '../../constants/accessPolicy';
import AuthLayout from '../../layouts/AuthLayout';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../features/demo/demoConfig';
import '../../styles/auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = login(identifier, password, form.get('remember') === 'on');
    if (!result.success) {
      setError(result.message);
      return;
    }
    const returnTo = location.state?.from;
    const allowedReturn = typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
      && (returnTo.startsWith('/admin/') ? result.user.role === 'ADMIN'
        : returnTo.startsWith('/reception/') ? result.user.role === 'RECEPTIONIST'
          : returnTo.startsWith('/vet/') ? result.user.role === 'VETERINARIAN'
          : returnTo === '/portal/profile' || !returnTo.startsWith('/portal/') || result.user.role === 'CUSTOMER');
    navigate(allowedReturn ? returnTo : getRoleHome(result.user.role), { replace: true });
  };

  const fillDemoAccount = () => {
    setIdentifier(DEFAULT_ACCOUNT.email);
    setPassword(DEFAULT_ACCOUNT.password);
    setError('');
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
            <span>Email hoặc số điện thoại</span>
            <input id="login-email" name="identifier" autoComplete="username" placeholder="you@example.com" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
          </label>
          <PasswordInput id="login-password" label="Mật khẩu" name="password" autoComplete="current-password" placeholder="Nhập mật khẩu" minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} error={error} required />
          <div className="auth-options">
            <label className="check-option"><input type="checkbox" name="remember" /><span>Ghi nhớ đăng nhập</span></label>
            <a href="#forgot-password">Quên mật khẩu?</a>
          </div>
          <button className="auth-submit" type="submit">Đăng nhập <span aria-hidden="true">→</span></button>
        </form>

        {/* <div className="demo-account" aria-label="Tài khoản dùng thử">
          <div><span>🔑</span><p><strong>Tài khoản mặc định</strong><small>{DEFAULT_ACCOUNT.email} / {DEFAULT_ACCOUNT.password}</small></p></div>
          <button type="button" onClick={fillDemoAccount}>Dùng tài khoản</button>
        </div> */}
        <details className="auth-demo-roles"><summary>Tài khoản trải nghiệm dữ liệu mẫu</summary><p>Đăng nhập Admin và nạp bộ dữ liệu demo ở Tổng quan trước. Các tài khoản này không tự được tạo khi mở trang đăng nhập.</p><div>{DEMO_ACCOUNTS.map((account) => <button key={account.id} type="button" onClick={() => { setIdentifier(account.email); setPassword(DEMO_PASSWORD); setError(''); }}><strong>{account.role}</strong><small>{account.email}</small></button>)}</div><p>Mật khẩu mẫu: {DEMO_PASSWORD}. Bạn vẫn cần bấm Đăng nhập.</p></details>

        <div className="auth-divider"><span>hoặc tiếp tục với</span></div>
        <div className="social-login">
          <button type="button"><span className="google-mark">G</span> Google</button>
          <button type="button"><span className="facebook-mark">f</span> Facebook</button>
        </div>
        <p className="auth-switch">Chưa có tài khoản? <Link to="/auth/register">Đăng ký ngay</Link></p>
      </div>
    </AuthLayout>
  );
}
