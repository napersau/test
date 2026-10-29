import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { ROLES, ACCOUNT_STATUSES, STAFF_ROLES } from '../../../constants/accessPolicy';
import { validateUser } from '../userSchema';

export default function UserEditor({ user, actorId, onSave, onClose, saving }) {
  const [values, setValues] = useState(() => ({ fullName: user?.fullName || '', email: user?.email || '', phone: user?.phone || '', role: user?.role || 'VETERINARIAN', roomNumber: user?.roomNumber || '', status: user?.status || 'ACTIVE', password: '' }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const isSelf = user?.id === actorId;
  const change = (event) => {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
    setErrors((current) => ({ ...current, [event.target.name]: '' }));
    setError('');
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const validation = validateUser(values, !user);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    try { await onSave(values, user?.id); }
    catch (problem) { setErrors(problem.fieldErrors || {}); setError(problem.message); }
  };
  const field = (name, label, type = 'text') => (
    <label className="admin-field" htmlFor={`user-${name}`}>
      <span>{label}</span>
      <input id={`user-${name}`} name={name} type={type} value={values[name]} onChange={change} autoComplete={name === 'password' ? 'new-password' : 'off'} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `error-${name}` : undefined} />
      {errors[name] && <small id={`error-${name}`} className="admin-field-error">{errors[name]}</small>}
    </label>
  );
  return (
    <Modal title={user ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản nhân viên'} id="user-editor-title" onClose={onClose} busy={saving}>
      <form className="admin-editor" noValidate onSubmit={handleSubmit}>
        <p>Thông tin tài khoản và quyền truy cập của người dùng.</p>
        <fieldset disabled={saving}>
          {field('fullName', 'Họ và tên')}
          {field('email', 'Email đăng nhập')}
          {field('phone', 'Số điện thoại', 'tel')}
          <div className="admin-form-row">
            <label className="admin-field"><span>Vai trò</span><select name="role" value={values.role} disabled={Boolean(user)} onChange={change}>{Object.entries(ROLES).filter(([value]) => user || STAFF_ROLES.includes(value)).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
            <label className="admin-field"><span>Trạng thái</span><select name="status" value={values.status} disabled={isSelf} onChange={change}>{Object.entries(ACCOUNT_STATUSES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>
          </div>
          {values.role === 'VETERINARIAN' && field('roomNumber', 'Số phòng khám cố định (ví dụ P01)')}
          {field('password', user ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu khởi tạo', 'password')}
          {user ? <p className="admin-form-note">Mỗi tài khoản chỉ có một vai trò cố định, không đổi sau khi tạo.</p> : <p className="admin-form-note">Quản trị viên chỉ tạo tài khoản nhân viên (bác sĩ, lễ tân). Chủ thú cưng tự đăng ký hoặc do lễ tân tạo hồ sơ tại quầy.</p>}
          {isSelf && <p className="admin-form-note">Tài khoản đang đăng nhập luôn giữ vai trò quản trị viên và trạng thái hoạt động.</p>}
        </fieldset>
        {error && <p className="admin-alert error" role="alert">{error}</p>}
        <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={onClose}>Hủy</button><button className="admin-button primary" type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu tài khoản'}</button></div>
      </form>
    </Modal>
  );
}
