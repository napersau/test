import { useSearchParams } from 'react-router-dom';
import { normalize } from '../catalog/catalogPolicy';

export default function useReceptionFilters(items, match) {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(params); filters.search = normalize((params.get('search') || '').trim());
  const filtered = items.filter((item) => match(item, filters));
  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.get('page'), 10) || 1));
  const set = (name, value) => { const next = new URLSearchParams(params); if (value) next.set(name, value); else next.delete(name); if (name !== 'page') next.delete('page'); setParams(next, { replace: true }); };
  return { params, rows: filtered.slice((page - 1) * 6, page * 6), total: filtered.length, pages, page, onChange: (value) => set('page', value), set, replace: (values) => setParams(values, { replace: true }), reset: () => setParams({}, { replace: true }) };
}
