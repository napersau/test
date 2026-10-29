import AdminIcon from './AdminIcon';

export default function CatalogStats({ stats }) {
  return <div className="admin-stats">{stats.map((stat) => <div className="admin-stat" key={stat.label} role="group" aria-label={stat.label}>
    <span className={`admin-stat-icon tone-${stat.tone}`}><AdminIcon name={stat.icon} /></span><span>{stat.label}</span><strong className={stat.valueClass}>{stat.value}</strong><small>{stat.note}</small>
  </div>)}</div>;
}
