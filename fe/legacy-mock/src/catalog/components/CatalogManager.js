import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import AdminIcon from '../../../components/admin/AdminIcon';
import CatalogBadge from '../../../components/admin/CatalogBadge';
import CatalogStats from '../../../components/admin/CatalogStats';
import CatalogEditor from './CatalogEditor';
import CatalogStatusDialog from './CatalogStatusDialog';
import { CATALOG_STATUSES, normalize } from '../catalogPolicy';

const PAGE_SIZE = 6;
export default function CatalogManager({ kind, catalog, title, intro, groups, groupKey, columns, stats, onBatches, children }) {
  const { items, loading, error, refresh, save, saving } = catalog;
  const [params, setParams] = useSearchParams();
  const [editor, setEditor] = useState(null);
  const [target, setTarget] = useState(null);
  const [notice, setNotice] = useState('');
  const noun = kind === 'service' ? 'dịch vụ' : 'thuốc';
  const search = params.get('search') || '';
  const group = params.get('group') || '';
  const status = params.get('status') || '';
  const stock = params.get('stock') || '';
  const filtered = items.filter((item) => (!group || item[groupKey] === group) && (!status || item.status === status)
    && normalize(`${item.code} ${item.name}`).includes(normalize(search.trim()))
    && (kind !== 'medicine' || !stock || (stock === 'low' ? item.lowStock : stock === 'near' ? item.nearExpiryBatches > 0 : stock === 'expired' ? item.expiredStock > 0 : true)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.get('page'), 10) || 1));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const setFilter = (name, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(name, value) : next.delete(name);
    next.delete('page'); setParams(next, { replace: true });
  };
  const setPage = (value) => { const next = new URLSearchParams(params); next.set('page', value); setParams(next, { replace: true }); };
  return <AdminLayout title={title}>
    <div className="admin-page-title"><div><span className="admin-eyebrow">DANH MỤC PHÒNG KHÁM</span><h1>{title}</h1><p>{intro}</p></div>
      <button type="button" className="admin-button primary" disabled={loading || Boolean(error)} onClick={() => { setNotice(''); setEditor({}); }}><AdminIcon name="plus" />Thêm {noun}</button></div>
    {notice && <div className="admin-alert success" role="status"><AdminIcon name="check" />{notice}<button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}
    {loading ? <div className="admin-loading" role="status">Đang tải danh mục…</div> : error ? <div className="admin-empty" role="alert"><h2>Không thể tải danh mục</h2><p>{error}</p><button type="button" className="admin-button secondary" onClick={refresh}>Thử lại</button></div> : <>
      <CatalogStats stats={stats} />
      {kind === 'medicine' && <div className="catalog-inventory-note"><AdminIcon name="box" /><p>Tồn có thể dùng không bao gồm lô hết hạn. Cảnh báo sắp hết hạn trong <strong>30 ngày</strong>; hạn sử dụng tính theo ngày tại phòng khám (Việt Nam).</p></div>}
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Danh sách {noun} <span>{items.length}</span></h2><p>{kind === 'service' ? 'Đơn giá và cấu hình áp dụng cho danh mục dịch vụ.' : 'Giá bán theo đơn vị, lô hàng và ngưỡng cảnh báo tồn kho.'}</p></div><span className="admin-updated">● Dữ liệu demo cục bộ</span></div>
        <div className="admin-filters">
          <label className="admin-search"><AdminIcon name="search" /><input aria-label={`Tìm ${noun}`} value={search} placeholder={`Tìm mã hoặc tên ${noun}…`} onChange={(event) => setFilter('search', event.target.value)} /></label>
          <select aria-label={`Lọc nhóm ${noun}`} value={group} onChange={(event) => setFilter('group', event.target.value)}><option value="">Tất cả nhóm</option>{Object.entries(groups).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <select aria-label="Lọc trạng thái" value={status} onChange={(event) => setFilter('status', event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(CATALOG_STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          {kind === 'medicine' && <select aria-label="Lọc cảnh báo tồn kho" value={stock} onChange={(event) => setFilter('stock', event.target.value)}><option value="">Tất cả tồn kho</option><option value="low">Chạm ngưỡng cảnh báo</option><option value="near">Sắp hết hạn</option><option value="expired">Có lô hết hạn</option></select>}
          {(search || group || status || stock) && <button type="button" className="admin-clear" onClick={() => setParams({})}>Xóa bộ lọc</button>}
        </div>
        {visible.length ? <div className="admin-table-scroll" tabIndex={0} role="region" aria-label={`Bảng ${noun}`}><table className="admin-users-table catalog-table">
          <thead><tr><th scope="col">{kind === 'service' ? 'Dịch vụ' : 'Thuốc'}</th>{columns.map((column) => <th scope="col" key={column.label}>{column.label}</th>)}<th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>
          <tbody>{visible.map((item) => <tr key={item.id}>
            <td><div className="catalog-name"><span className={`catalog-icon tone-${kind === 'service' ? 'teal' : 'blue'}`}><AdminIcon name={kind === 'service' ? 'service' : 'medicine'} /></span><div><strong>{item.name}</strong><small>{item.code}</small></div></div></td>
            {columns.map((column) => <td key={column.label}>{column.render(item)}</td>)}<td><CatalogBadge status={item.status} /></td>
            <td><div className="admin-row-actions catalog-actions"><button type="button" aria-label={`Chỉnh sửa ${item.name}`} onClick={() => { setNotice(''); setEditor(item); }}>Chỉnh sửa</button>
              {onBatches && <button type="button" aria-label={`Lô hàng ${item.name}`} onClick={() => onBatches(item.id)}>Lô hàng</button>}
              <button type="button" className={item.status === 'ACTIVE' ? 'lock' : 'unlock'} aria-label={`${item.status === 'ACTIVE' ? 'Ngừng' : 'Kích hoạt'} ${item.name}`} onClick={() => { setNotice(''); setTarget(item); }}>{item.status === 'ACTIVE' ? 'Ngừng' : 'Kích hoạt'}</button></div></td>
          </tr>)}</tbody>
        </table></div> : <div className="admin-empty"><AdminIcon name={kind === 'service' ? 'service' : 'medicine'} width="40" height="40" /><h3>{items.length ? `Không tìm thấy ${noun}` : `Chưa có ${noun}`}</h3><p>{items.length ? 'Đổi từ khóa hoặc xóa bộ lọc để xem danh sách.' : `Thêm ${noun} đầu tiên cho phòng khám.`}</p></div>}
        <div className="admin-pagination"><span>{filtered.length ? `Hiển thị ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} trong ${filtered.length} ${noun}` : `0 ${noun}`}</span><div><button type="button" aria-label="Trang trước" disabled={page === 1} onClick={() => setPage(page - 1)}>←</button><span>Trang {page} / {pages}</span><button type="button" aria-label="Trang sau" disabled={page === pages} onClick={() => setPage(page + 1)}>→</button></div></div>
      </section>
      <p className="admin-bottom-note"><AdminIcon name="shield" />Ngừng sử dụng thay vì xóa để giữ lại danh mục và lịch sử liên quan.</p>
    </>}
    {editor && <CatalogEditor kind={kind} item={editor.id ? editor : null} saving={saving} onClose={() => setEditor(null)} onSave={async (values, id) => { await save(values, id); setEditor(null); setNotice(`Đã ${id ? 'cập nhật' : 'thêm'} ${noun}.`); }} />}
    {target && <CatalogStatusDialog item={target} kind={kind} saving={saving} onClose={() => setTarget(null)} onConfirm={async () => { const nextStatus = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'; await save({ status: nextStatus }, target.id); setTarget(null); setNotice(`Đã ${nextStatus === 'ACTIVE' ? 'kích hoạt' : 'ngừng sử dụng'} ${noun}.`); }} />}
    {children}
  </AdminLayout>;
}
