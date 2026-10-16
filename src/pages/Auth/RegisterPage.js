import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordInput from '../../components/auth/PasswordInput';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from '../../layouts/AuthLayout';
import '../../styles/auth.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitError('');
    if (password !== confirmation) {
      setError('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    const form = new FormData(event.currentTarget);
    setError('');
    try {
      register({
        fullName: form.get('name').trim(),
        phone: form.get('phone').trim(),
        email: form.get('email').trim().toLowerCase(),
      }, password);
      navigate('/portal/profile', { replace: true });
    } catch (problem) {
      setSubmitError(problem.message);
    }
  };

  return (
    <AuthLayout mode="register">
      <div className="auth-card auth-card-register">
        <div className="auth-heading">
          <span className="auth-heading-icon" aria-hidden="true">🌟</span>
          <h2>Tạo tài khoản</h2>
          <p>Tham gia PawCare để chăm sóc bé dễ dàng hơn.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-name-grid">
            <label className="auth-field" htmlFor="register-name"><span>Họ và tên</span><input id="register-name" name="name" autoComplete="name" placeholder="Nguyễn Văn A" required /></label>
            <label className="auth-field" htmlFor="register-phone"><span>Số điện thoại</span><input id="register-phone" name="phone" type="tel" autoComplete="tel" placeholder="0901 234 567" pattern="[0-9 ]{9,14}" required /></label>
          </div>
          <label className="auth-field" htmlFor="register-email"><span>Email</span><input id="register-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
          <PasswordInput id="register-password" label="Mật khẩu" name="password" autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <PasswordInput id="register-confirmation" label="Xác nhận mật khẩu" name="passwordConfirmation" autoComplete="new-password" placeholder="Nhập lại mật khẩu" minLength="8" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} error={error} required />
          <label className="check-option terms-option"><input type="checkbox" name="terms" required /><span>Tôi đồng ý với <a href="#terms">Điều khoản sử dụng</a> và <a href="#privacy">Chính sách bảo mật</a>.</span></label>
          <button className="auth-submit" type="submit">Tạo tài khoản <span aria-hidden="true">→</span></button>
          {submitError && <p className="field-error" role="alert">{submitError}</p>}
        </form>
        <p className="auth-switch">Đã có tài khoản? <Link to="/auth/login">Đăng nhập</Link></p>
      </div>
    </AuthLayout>
  );
}
