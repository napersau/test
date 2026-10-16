import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import UserStats from '../../components/admin/UserStats';
import UserBadge from '../../components/admin/UserBadge';
import AdminIcon from '../../components/admin/AdminIcon';
import useUsers from '../../features/users/useUsers';
import { ROLES } from '../../constants/accessPolicy';
import { useAuth } from '../../contexts/AuthContext';
import RoleDistribution from '../../components/admin/RoleDistribution';
import { ADMIN_NAVIGATION } from '../../constants/adminNavigation';
import useAdminCatalog from '../../features/catalog/useAdminCatalog';
import { medicinesRepository } from '../../features/medicines/medicinesRepository';
import { countActiveVeterinarians } from '../../features/staff/capacityPolicy';
import DemoDataPanel from '../../features/demo/components/DemoDataPanel';

export default function DashboardPage() {
  const { user } = useAuth();
  const { users, loading, error, refresh } = useUsers();
  const medicines = useAdminCatalog(medicinesRepository);
  const lowStock = medicines.items.filter((item) => item.status === 'ACTIVE' && item.lowStock);
  return (
    <AdminLayout title="Tổng quan">
      <div className="admin-page-title"><div><span className="admin-eyebrow">PAWCARE ADMIN</span><h1>Xin chào, {user.fullName}</h1><p>Tổng quan tài khoản và đội ngũ của phòng khám hôm nay.</p></div><Link className="admin-button primary" to="/admin/users"><AdminIcon name="users" />Quản lý người dùng</Link></div>
      <DemoDataPanel />
      {loading ? <p role="status">Đang tải tổng quan…</p> : error ? <div className="admin-alert error" role="alert">{error}<button type="button" onClick={refresh}>Thử lại</button></div> : <>
        <UserStats users={users} />
        <div className="admin-dashboard-grid">
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Sức chứa đặt lịch</h2><p>Mỗi khung giờ nhận tối đa bằng số bác sĩ đang hoạt động.</p></div><Link to="/admin/staff">Nhân sự →</Link></div><p><strong>{countActiveVeterinarians(users)}</strong> lịch hẹn / khung giờ · 14 khung giờ mỗi ngày</p></section>
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Cảnh báo tồn kho thuốc</h2><p>Thuốc đang bán có tồn kho ≤ ngưỡng cảnh báo.</p></div><Link to="/admin/medicines?stock=low">Xem kho →</Link></div>
            {lowStock.length ? <ul>{lowStock.slice(0, 5).map((item) => <li key={item.id}><strong>{item.name}</strong> — còn {item.availableStock} (ngưỡng {item.minStockLevel})</li>)}</ul> : <p>Chưa có thuốc nào chạm ngưỡng cảnh báo.</p>}</section>
        </div>
        <div className="admin-dashboard-grid">
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Phân bổ vai trò</h2><p>Thành viên thuộc từng khu vực sử dụng.</p></div><AdminIcon name="users" /></div><RoleDistribution users={users} /></section>
          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Tài khoản mới nhất</h2><p>Theo thời điểm tạo tài khoản.</p></div><Link to="/admin/users">Xem tất cả →</Link></div><div className="admin-recent-users">{[...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5).map((account) => <div key={account.id}><span className={`admin-user-avatar tone-${ROLES[account.role].tone}`}>{account.fullName.charAt(0)}</span><div><strong>{account.fullName}</strong><span>{account.email}</span></div><UserBadge value={account.role} /></div>)}</div></section>
        </div>
        <section className="admin-quick-access" aria-label="Truy cập nhanh">{ADMIN_NAVIGATION.slice(1).map((item) => <Link to={item.to} key={item.to}><span><AdminIcon name={item.icon} /></span><div><strong>{item.label}</strong><small>Mở trang quản lý</small></div><AdminIcon name="arrow" /></Link>)}</section>
      </>}
    </AdminLayout>
  );
}
