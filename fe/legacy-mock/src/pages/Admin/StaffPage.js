import { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import UserBadge from '../../components/admin/UserBadge';
import useCustomerData from '../../features/customer/useCustomerData';
import { useAuth } from '../../contexts/AuthContext';
import { listStaff, STAFF_CHANGED } from '../../features/staff/staffRepository';
import { countActiveVeterinarians } from '../../features/staff/capacityPolicy';
import { updateUser, USERS_CHANGED } from '../../features/users/usersRepository';
import { normalize } from '../../features/catalog/catalogPolicy';

const EVENTS = [USERS_CHANGED, STAFF_CHANGED];
const PAGE_SIZE = 6;

// Gán / đổi số phòng khám cố định của một bác sĩ (users.room_number).
function RoomEditor({ doctor }) {
  const { user: actor } = useAuth();
  const [editing, setEditing] = useState(false);
  const [room, setRoom] = useState(doctor.roomNumber);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try { updateUser(actor.id, doctor.id, { roomNumber: room }); setEditing(false); setError(''); }
    catch (problem) { setError(problem.fieldErrors?.roomNumber || problem.message); }
    finally { setSaving(false); }
  };
  if (!editing) {
    return <div className="staff-room"><dt>Phòng khám cố định</dt><dd>{doctor.roomNumber ? <strong>{doctor.roomNumber}</strong> : <span className="admin-field-error">Chưa gán phòng</span>}</dd>
      <button type="button" className="admin-button secondary" onClick={() => { setRoom(doctor.roomNumber); setEditing(true); }}>{doctor.roomNumber ? 'Đổi phòng' : 'Gán phòng'}</button></div>;
  }
  return <form className="staff-room" onSubmit={save} noValidate>
    <label className="admin-field"><span>Số phòng khám (ví dụ P01)</span><input aria-label={`Số phòng của ${doctor.fullName}`} value={room} onChange={(event) => { setRoom(event.target.value); setError(''); }} maxLength={20} /></label>
    {error && <small className="admin-field-error" role="alert">{error}</small>}
    <div className="admin-row-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={() => setEditing(false)}>Hủy</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu phòng'}</button></div>
  </form>;
}

export default function StaffPage() {
  const { data, loading, error, refresh } = useCustomerData(listStaff, EVENTS);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const staff = data || [];
  const rows = staff.filter((item) => (!role || item.role === role) && (!status || item.status === status)
    && normalize(`${item.fullName} ${item.email} ${item.phone} ${item.roomNumber}`).includes(normalize(query.trim())));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const capacity = countActiveVeterinarians(staff);
  const unassigned = staff.filter((item) => item.role === 'VETERINARIAN' && item.status === 'ACTIVE' && !item.roomNumber).length;
  const filter = (setter) => (event) => { setter(event.target.value); setPage(1); };
  return <AdminLayout title="Nhân sự & phòng khám">
    <div className="admin-page-title"><div><span className="admin-eyebrow">ĐỘI NGŨ PHÒNG KHÁM</span><h1>Nhân sự & phòng khám</h1><p>Bác sĩ và lễ tân của phòng khám. Mỗi bác sĩ làm việc tại một số phòng cố định; hệ thống không quản lý ca kíp hay nghỉ phép.</p></div><Link className="admin-button primary" to="/admin/users">Quản lý tài khoản nhân sự</Link></div>
    {loading ? <p role="status">Đang tải đội ngũ…</p> : error ? <div className="admin-alert error" role="alert">{error}<button type="button" onClick={refresh}>Thử lại</button></div> : <>
      <div className="catalog-inventory-note"><AdminIcon name="calendar" /><p>Sức chứa tối đa mỗi khung giờ đặt lịch hiện tại: <strong>{capacity} lịch hẹn</strong> (bằng số bác sĩ đang hoạt động). Khóa hoặc ngừng một bác sĩ sẽ làm sức chứa giảm ngay; thêm bác sĩ mới sẽ tự tăng.{unassigned > 0 && <> <strong>{unassigned} bác sĩ đang hoạt động chưa được gán phòng khám.</strong></>}</p></div>
      <div className="admin-filters"><label className="admin-search"><input aria-label="Tìm nhân viên bác sĩ" placeholder="Tên, email, số điện thoại, số phòng…" value={query} onChange={filter(setQuery)} /></label>
        <select aria-label="Vai trò nhân sự" value={role} onChange={filter(setRole)}><option value="">Tất cả nhân sự</option><option value="VETERINARIAN">Bác sĩ thú y</option><option value="RECEPTIONIST">Lễ tân</option></select>
        <select aria-label="Trạng thái nhân sự" value={status} onChange={filter(setStatus)}><option value="">Tất cả trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option><option value="LOCKED">Bị khóa</option></select>
        <button className="admin-button" type="button" onClick={refresh}>Làm mới</button></div>
      {!rows.length ? <section className="admin-panel admin-empty"><h2>Không có nhân sự phù hợp</h2><p>Thử đổi từ khóa hoặc bộ lọc.</p></section> : <>
        <div className="staff-card-grid">{rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((item) => <article className="admin-panel staff-card" key={item.id}>
          <div className="staff-card-heading"><h2>{item.fullName}</h2><UserBadge value={item.status} type="status" /></div>
          <UserBadge value={item.role} />
          <p>{item.email}<br />{item.phone}</p>
          {item.role === 'VETERINARIAN' ? <RoomEditor key={`${item.id}-${item.roomNumber}`} doctor={item} /> : <p className="admin-form-note">Lễ tân tiếp đón, điều phối hàng đợi, thu ngân và phát thuốc.</p>}
          <Link to={`/admin/users?search=${encodeURIComponent(item.email)}`}>Sửa / khóa tài khoản →</Link>
        </article>)}</div>
        <div className="admin-pagination"><span>{rows.length} nhân sự · Trang {current}/{pages}</span><div><button type="button" className="admin-button" disabled={current === 1} onClick={() => setPage(current - 1)}>Trang trước</button><button type="button" className="admin-button" disabled={current === pages} onClick={() => setPage(current + 1)}>Trang sau</button></div></div></>}
    </>}
  </AdminLayout>;
}
