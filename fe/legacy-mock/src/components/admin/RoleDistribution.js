import { ROLES } from '../../constants/accessPolicy';
import UserBadge from './UserBadge';

const COLORS = ['#465fff', '#9cb9ff', '#36bffa', '#7a5af8'];
export default function RoleDistribution({ users }) {
  let offset = 0;
  const segments = Object.entries(ROLES).map(([role, info], index) => {
    const count = users.filter((user) => user.role === role).length;
    const percent = users.length ? count / users.length * 100 : 0;
    const segment = { role, label: info.label, count, percent, offset, color: COLORS[index] };
    offset += percent;
    return segment;
  });
  return <div className="admin-role-distribution">
    <div className="admin-donut" aria-hidden="true"><svg viewBox="0 0 120 120"><circle className="admin-donut-track" cx="60" cy="60" r="48" fill="none" strokeWidth="13" />{segments.filter((segment) => segment.count).map((segment) => <circle key={segment.role} cx="60" cy="60" r="48" fill="none" stroke={segment.color} strokeWidth="13" pathLength="100" strokeDasharray={`${segment.percent} ${100 - segment.percent}`} strokeDashoffset={-segment.offset} transform="rotate(-90 60 60)" />)}</svg><div><strong>{users.length}</strong><span>Tài khoản</span></div></div>
    <div className="admin-role-summary">{segments.map((segment) => <div key={segment.role}><div><UserBadge value={segment.role} /><strong>{segment.count} <small>({Math.round(segment.percent)}%)</small></strong></div><progress style={{ '--role-color': segment.color }} value={segment.count} max={Math.max(1, users.length)} aria-label={segment.label} /></div>)}</div>
  </div>;
}
