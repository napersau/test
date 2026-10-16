import { CATALOG_STATUSES } from '../../features/catalog/catalogPolicy';

export default function CatalogBadge({ status }) {
  return <span className={`admin-badge tone-${status === 'ACTIVE' ? 'active' : 'inactive'}`}>{CATALOG_STATUSES[status]}</span>;
}
