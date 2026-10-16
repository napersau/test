import { useState } from 'react';

export function useInsightsPagination(items, filterKey, pageSize = 8) {
  const [selection, setSelection] = useState({ key: filterKey, page: 1 });
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = selection.key === filterKey ? Math.min(selection.page, pages) : 1;
  return { page, pages, total: items.length, rows: items.slice((page - 1) * pageSize, page * pageSize),
    onChange: (nextPage) => setSelection({ key: filterKey, page: Math.max(1, Math.min(pages, nextPage)) }) };
}

export default function InsightsPagination({ page, pages, total, onChange }) {
  return <div className="admin-pagination insights-pagination"><span>{total} kết quả · Trang {page}/{pages}</span><div>
    <button type="button" className="admin-button secondary" aria-label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Trước</button>
    <button type="button" className="admin-button secondary" aria-label="Trang sau" disabled={page >= pages} onClick={() => onChange(page + 1)}>Sau →</button>
  </div></div>;
}
