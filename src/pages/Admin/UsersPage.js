import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import UserBadge from '../../components/admin/UserBadge';
import UserStats from '../../components/admin/UserStats';
import { ROLES, ACCOUNT_STATUSES } from '../../constants/accessPolicy';
import { useAuth } from '../../contexts/AuthContext';
import useUsers from '../../features/users/useUsers';
import UserEditor from '../../features/users/components/UserEditor';
import AccountStatusDialog from '../../features/users/components/AccountStatusDialog';

const PAGE_SIZE = 6;
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const statusActionLabel = (status) => (status === 'ACTIVE' ? 'Khóa' : status === 'INACTIVE' ? 'Kích hoạt' : 'Mở khóa');
const formatDate = (value) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));

export default function UsersPage() {
  const { user: actor } = useAuth();
  const { users, loading, error, refresh, save, saving } = useUsers();
  const [params, setParams] = useSearchParams();
  const [editor, setEditor] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [notice, setNotice] = useState('');
  const search = params.get('search') || '';
  const role = params.get('role') || '';
  const status = params.get('status') || '';
  const filtered = users.filter((user) => (!role || user.role === role) && (!status || user.status === status)
    && normalize(`${user.fullName} ${user.email} ${user.phone}`).includes(normalize(search.trim())));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.get('page'), 10) || 1));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };
  const setPage = (value) => {
    const next = new URLSearchParams(params);
    next.set('page', value);
    setParams(next, { replace: true });
  };
  const handleSave = async (values, id) => {
    await save(values, id);
    setEditor(null);
    setNotice(id ? 'Đã cập nhật tài khoản.' : 'Đã tạo tài khoản. Người dùng có thể đăng nhập bằng mật khẩu khởi tạo.');
  };

  return (
    <AdminLayout title="Tài khoản & người dùng">
      <div className="admin-page-title">
        <div><span className="admin-eyebrow">QUẢN LÝ TRUY CẬP</span><h1>Tài khoản & người dùng</h1><p>Quản lý đội ngũ, khách hàng và quyền truy cập trong một không gian.</p></div>
        <button type="button" className="admin-button primary" disabled={loading || Boolean(error)} onClick={() => { setEditor({}); setNotice(''); }}><AdminIcon name="plus" />Thêm nhân viên</button>
      </div>
      {notice && <div className="admin-alert success" role="status"><AdminIcon name="check" />{notice}<button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}
      {loading ? <div className="admin-loading" role="status">Đang tải danh sách người dùng…</div> : error ? (
        <div className="admin-empty" role="alert"><h2>Không thể tải tài khoản</h2><p>{error}</p><button className="admin-button secondary" type="button" onClick={refresh}>Thử lại</button></div>
      ) : (
        <>
          <UserStats users={users} />
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Danh sách người dùng <span>{users.length}</span></h2><p>Kiểm soát vai trò và trạng thái của từng tài khoản.</p></div><span className="admin-updated"><span aria-hidden="true">●</span> Dữ liệu đã đồng bộ</span></div>
            <div className="admin-filters">
              <label className="admin-search"><AdminIcon name="search" /><input aria-label="Tìm người dùng" placeholder="Tìm tên, email hoặc số điện thoại…" value={search} onChange={(event) => setFilter('search', event.target.value)} /></label>
              <select aria-label="Lọc vai trò" value={role} onChange={(event) => setFilter('role', event.target.value)}><option value="">Tất cả vai trò</option>{Object.entries(ROLES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select>
              <select aria-label="Lọc trạng thái" value={status} onChange={(event) => setFilter('status', event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(ACCOUNT_STATUSES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select>
              {(search || role || status) && <button type="button" className="admin-clear" onClick={() => setParams({})}>Xóa bộ lọc</button>}
            </div>
            {visible.length ? (
              <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Bảng người dùng">
                <table className="admin-users-table">
                  <thead><tr><th scope="col">Người dùng</th><th scope="col">Vai trò</th><th scope="col">Trạng thái</th><th scope="col">Ngày tạo</th><th scope="col">Thao tác</th></tr></thead>
                  <tbody>{visible.map((user) => <tr key={user.id}>
                    <td><div className="admin-user-cell"><span className={`admin-user-avatar tone-${ROLES[user.role].tone}`}>{user.fullName.charAt(0)}</span><div><strong>{user.fullName}{user.id === actor.id && <small className="admin-you">Bạn</small>}</strong><span>{user.email}</span><small>{user.phone}{user.role === 'VETERINARIAN' && ` · ${user.roomNumber ? `Phòng ${user.roomNumber}` : 'Chưa gán phòng'}`}</small></div></div></td>
                    <td><UserBadge value={user.role} /></td>
                    <td><UserBadge value={user.status} type="status" /></td>
                    <td className="admin-date">{formatDate(user.createdAt)}</td>
                    <td><div className="admin-row-actions"><button type="button" aria-label={`Chỉnh sửa ${user.fullName}`} onClick={() => { setEditor(user); setNotice(''); }}>Chỉnh sửa</button><button type="button" className={user.status === 'ACTIVE' ? 'lock' : 'unlock'} disabled={user.id === actor.id} title={user.id === actor.id ? 'Không thể khóa tài khoản đang đăng nhập' : undefined} aria-label={`${statusActionLabel(user.status)} ${user.fullName}`} onClick={() => { setStatusTarget(user); setNotice(''); }}>{statusActionLabel(user.status)}</button></div></td>
                  </tr>)}</tbody>
                </table>
              </div>
            ) : <div className="admin-empty"><AdminIcon name="users" width="40" height="40" /><h3>{users.length ? 'Không tìm thấy người dùng' : 'Chưa có người dùng'}</h3><p>{users.length ? 'Thử đổi từ khóa hoặc xóa bộ lọc để xem lại danh sách.' : 'Thêm tài khoản đầu tiên cho phòng khám.'}</p></div>}
            <div className="admin-pagination"><span>{filtered.length ? `Hiển thị ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} trong ${filtered.length} người dùng` : '0 người dùng'} </span><div><button type="button" aria-label="Trang trước" disabled={page === 1} onClick={() => setPage(page - 1)}>←</button><span>Trang {page} / {pages}</span><button type="button" aria-label="Trang sau" disabled={page === pages} onClick={() => setPage(page + 1)}>→</button></div></div>
          </section>
          <p className="admin-bottom-note"><AdminIcon name="shield" />Khóa tài khoản để ngưng truy cập; hồ sơ và lịch sử của người dùng vẫn được giữ lại.</p>
        </>
      )}
      {editor && <UserEditor user={editor.id ? editor : null} actorId={actor.id} saving={saving} onClose={() => setEditor(null)} onSave={handleSave} />}
      {statusTarget && <AccountStatusDialog user={statusTarget} saving={saving} onClose={() => setStatusTarget(null)} onConfirm={async () => { await save({ status: statusTarget.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' }, statusTarget.id); setNotice(statusTarget.status === 'ACTIVE' ? 'Đã khóa tài khoản.' : statusTarget.status === 'INACTIVE' ? 'Đã kích hoạt tài khoản.' : 'Đã mở khóa tài khoản.'); setStatusTarget(null); }} />}
    </AdminLayout>
  );
}
