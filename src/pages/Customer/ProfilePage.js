import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import CustomerLayout from '../../layouts/CustomerLayout';
import { ROLES } from '../../constants/accessPolicy';
import '../../styles/profile.css';

function createFormState(user) {
  return {
    fullName: user.fullName || '',
    email: user.email || '',
    phone: user.phone || '',
    birthDate: user.birthDate || '',
    gender: user.gender || '',
    address: user.address || '',
    receiveAppointmentReminders: user.receiveAppointmentReminders ?? true,
    receiveHealthTips: user.receiveHealthTips ?? true,
  };
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState(() => createFormState(user));
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setForm(createFormState(user)), [user]);

  const updateField = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setSaved(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    try {
      updateProfile(form);
      setEditing(false);
      setSaved(true);
      setError('');
    } catch (problem) {
      setError(problem.message);
    }
  };

  const cancelEditing = () => {
    setForm(createFormState(user));
    setEditing(false);
    setSaved(false);
  };

  return (
    <CustomerLayout>
      <main className="profile-page">
        <div className="profile-container">
          <div className="profile-page-heading"><div><span>{user.role === 'CUSTOMER' ? 'Hồ sơ khách hàng' : 'Hồ sơ cá nhân'}</span><h1>Thông tin cá nhân</h1><p>Cập nhật thông tin để PawCare hỗ trợ bạn tốt hơn.</p></div>{!editing && <button className="profile-edit-button" type="button" onClick={() => { setEditing(true); setSaved(false); }}>✎ Chỉnh sửa</button>}</div>

          {saved && <div className="profile-success" role="status">✓ Thông tin cá nhân đã được lưu.</div>}
          {error && <p className="field-error" role="alert">{error}</p>}

          <form className="profile-grid" onSubmit={handleSubmit}>
            <aside className="profile-summary-card">
              <div className="profile-avatar">{form.fullName.charAt(0).toUpperCase() || 'P'}<span aria-hidden="true">🐾</span></div>
              <h2>{form.fullName || 'Thành viên PawCare'}</h2><p>{form.email}</p><span className="profile-role">{ROLES[user.role]?.label || 'Thành viên'}</span>
              <div className="profile-summary-divider" />
              <div className="profile-stat"><span>🐶</span><div><strong>Hồ sơ của bạn</strong><small>Thông tin được lưu cục bộ trong bản demo</small></div></div>
            </aside>

            <div className="profile-form-card">
              <section>
                <div className="profile-section-title"><span>👤</span><div><h2>Thông tin cơ bản</h2><p>Thông tin liên hệ và nhận diện của bạn.</p></div></div>
                <div className="profile-fields">
                  <label>Họ và tên<input name="fullName" value={form.fullName} onChange={updateField} disabled={!editing} required /></label>
                  <label>Email<input name="email" type="email" value={form.email} onChange={updateField} disabled={!editing} required /></label>
                  <label>Số điện thoại<input name="phone" type="tel" value={form.phone} onChange={updateField} disabled={!editing} pattern="[0-9 ]{9,14}" required /></label>
                  <label>Ngày sinh<input name="birthDate" type="date" value={form.birthDate} onChange={updateField} disabled={!editing} /></label>
                  <label>Giới tính<select name="gender" value={form.gender} onChange={updateField} disabled={!editing}><option value="">Chưa cập nhật</option><option value="FEMALE">Nữ</option><option value="MALE">Nam</option><option value="OTHER">Khác</option></select></label>
                  <label className="profile-field-wide">Địa chỉ<input name="address" value={form.address} onChange={updateField} disabled={!editing} placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" /></label>
                </div>
              </section>

              <section className="notification-section">
                <div className="profile-section-title"><span>🔔</span><div><h2>Tùy chọn thông báo</h2><p>Chọn những thông tin bạn muốn nhận từ PawCare.</p></div></div>
                <label className="preference-row"><div><strong>Nhắc lịch khám và vaccine</strong><span>Nhận thông báo trước lịch hẹn của thú cưng.</span></div><input name="receiveAppointmentReminders" type="checkbox" checked={form.receiveAppointmentReminders} onChange={updateField} disabled={!editing} /></label>
                <label className="preference-row"><div><strong>Mẹo chăm sóc sức khoẻ</strong><span>Nhận nội dung hữu ích theo từng giai đoạn của bé.</span></div><input name="receiveHealthTips" type="checkbox" checked={form.receiveHealthTips} onChange={updateField} disabled={!editing} /></label>
              </section>

              {editing && <div className="profile-actions"><button className="profile-cancel" type="button" onClick={cancelEditing}>Hủy thay đổi</button><button className="profile-save" type="submit">Lưu thông tin ✓</button></div>}
            </div>
          </form>
        </div>
      </main>
    </CustomerLayout>
  );
}
