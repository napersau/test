import { ACCOUNT_STATUSES, ROLES } from '../../constants/accessPolicy';

export default function UserBadge({ value, type = 'role' }) {
  const item = (type === 'status' ? ACCOUNT_STATUSES : ROLES)[value];
  return <span className={`admin-badge tone-${item?.tone || 'gray'}`}>{type === 'status' && <span aria-hidden="true">{value === 'ACTIVE' ? '●' : '○'}</span>}{item?.label || value}</span>;
}
