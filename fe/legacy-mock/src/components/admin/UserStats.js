import AdminIcon from './AdminIcon';

export default function UserStats({ users }) {
  const items = [
    { label: 'Tổng người dùng', value: users.length, note: 'Tất cả tài khoản trong hệ thống', icon: 'users', tone: 'blue' },
    { label: 'Đang hoạt động', value: users.filter((user) => user.status === 'ACTIVE').length, note: 'Được phép đăng nhập', icon: 'check', tone: 'teal' },
    { label: 'Tài khoản nhân viên', value: users.filter((user) => user.role !== 'CUSTOMER').length, note: 'Admin, bác sĩ và lễ tân', icon: 'shield', tone: 'violet' },
    { label: 'Bị khóa / ngừng hoạt động', value: users.filter((user) => user.status !== 'ACTIVE').length, note: 'Không được phép đăng nhập', icon: 'lock', tone: 'orange' },
  ];
  return <div className="admin-stats">{items.map((item) => <article className="admin-stat" key={item.label}><span className={`admin-stat-icon tone-${item.tone}`}><AdminIcon name={item.icon} /></span><span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></article>)}</div>;
}
