import { useMemo, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import DateRangeFilter from '../../components/admin/DateRangeFilter';
import InsightsPagination, { useInsightsPagination } from '../../components/admin/InsightsPagination';
import Modal from '../../components/common/Modal';
import { ROLES } from '../../constants/accessPolicy';
import { AUDIT_ACTIONS, AUDIT_LIMIT, AUDIT_MODULES } from '../../features/activity/auditStorage';
import useAdminInsights, { INSIGHT_SOURCES } from '../../features/admin/useAdminInsights';
import useDateRange from '../../features/reports/useDateRange';
import { formatTimestamp, inDateRange } from '../../features/reports/reportPolicy';
import { normalize } from '../../features/catalog/catalogPolicy';

const FIELD_LABELS = { fullName: 'Họ tên', role: 'Vai trò', status: 'Trạng thái', password: 'Mật khẩu (chỉ ghi nhận đã đổi)', code: 'Mã', name: 'Tên', serviceType: 'Nhóm dịch vụ', price: 'Đơn giá', description: 'Mô tả', requiresResult: 'Yêu cầu kết quả', allowsAttachment: 'Cho phép đính kèm', category: 'Nhóm thuốc', unit: 'Đơn vị', salePrice: 'Giá bán', minStockLevel: 'Ngưỡng cảnh báo tồn', roomNumber: 'Phòng khám cố định', dosageForm: 'Dạng bào chế', activeIngredient: 'Hoạt chất', labItemIds: 'Chỉ số xét nghiệm' };

export default function ActivityPage() {
  const { data, errors, loading, updatedAt, warning, refresh } = useAdminInsights();
  const range = useDateRange();
  const [query, setQuery] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [detail, setDetail] = useState(null);
  const filtered = useMemo(() => range.error ? [] : data.activity.filter((event) => (!module || event.module === module)
    && (!action || event.action === action) && inDateRange(event.createdAt, range.from, range.to)
    && normalize(`${event.actorName} ${event.targetName} ${AUDIT_ACTIONS[event.action]} ${AUDIT_MODULES[event.module]}`).includes(normalize(query.trim()))),
  [data.activity, range.error, range.from, range.to, query, module, action]);
  const pagination = useInsightsPagination(filtered, `${query}|${module}|${action}|${range.from}|${range.to}`);
  const clearFilters = () => { setQuery(''); setModule(''); setAction(''); range.change({ from: '', to: '' }); };
  return <AdminLayout title="Hoạt động hệ thống"><div className="admin-activity-page">
    <div className="admin-page-title"><div><span className="admin-eyebrow">SYSTEM ACTIVITY</span><h1>Hoạt động hệ thống</h1><p>Theo dõi thao tác và tình trạng đọc dữ liệu của bản demo.</p></div><button type="button" className="admin-button secondary" onClick={refresh}><AdminIcon name="refresh" />Làm mới</button></div>
    <div className="catalog-inventory-note"><AdminIcon name="shield" /><p>Nhật ký bắt đầu khi chức năng được triển khai, lưu tối đa {AUDIT_LIMIT.toLocaleString('vi-VN')} thao tác thành công gần nhất trên trình duyệt này. Không lưu mật khẩu, nội dung hồ sơ hay phiên đăng nhập. Đây chưa phải giám sát máy chủ hoặc nhật ký bảo mật backend.</p></div>
    {warning && <div role="alert" className="admin-alert error">{warning}</div>}
    {loading ? <p role="status">Đang tải hoạt động…</p> : <>
      <section className="admin-panel insights-health"><div className="admin-panel-heading"><div><h2>Tình trạng dữ liệu cục bộ</h2><p>Kiểm tra lần cuối: {formatTimestamp(updatedAt)} · Tự cập nhật mỗi phút.</p></div><AdminIcon name="box" /></div>
        <div className="insights-health-grid">{Object.entries(INSIGHT_SOURCES).map(([key, label]) => <div key={key}><span className={`admin-badge ${errors[key] ? 'tone-inactive' : 'tone-active'}`}>{errors[key] ? 'Lỗi đọc dữ liệu' : 'Đọc được dữ liệu'}</span><strong>{label}</strong><small>{errors[key] || `${data[key].length} bản ghi${key === 'activity' ? ' được lưu' : ''}`}</small></div>)}</div>
      </section>
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Nhật ký hoạt động</h2><p>Lọc theo người thực hiện, đối tượng, chức năng và khoảng ngày (giờ Việt Nam).</p></div><AdminIcon name="activity" /></div>
        <div className="admin-filters"><label className="admin-search"><AdminIcon name="search" /><input aria-label="Tìm hoạt động" placeholder="Tìm người, đối tượng, thao tác…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <select aria-label="Lọc chức năng" value={module} onChange={(event) => setModule(event.target.value)}><option value="">Tất cả chức năng</option>{Object.entries(AUDIT_MODULES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select aria-label="Lọc thao tác" value={action} onChange={(event) => setAction(event.target.value)}><option value="">Tất cả thao tác</option>{Object.entries(AUDIT_ACTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <button className="admin-button secondary" type="button" onClick={clearFilters}>Xóa bộ lọc</button>
        </div><DateRangeFilter range={range} />
        {errors.activity ? <div className="admin-empty" role="alert"><h3>Không thể tải nhật ký</h3><p>{errors.activity}</p><button className="admin-button secondary" onClick={refresh}>Thử lại</button></div> : !range.error && <>
          <div className="insights-inline-stats"><span><strong>{filtered.length}</strong> thao tác</span><span><strong>{new Set(filtered.map((event) => event.actorId)).size}</strong> người thực hiện</span><span><strong>{filtered.filter((event) => event.action === 'BATCH_IMPORT').length}</strong> lần nhập lô</span><small>Trong bộ lọc hiện tại</small></div>
          {filtered.length ? <div className="admin-table-scroll"><table className="admin-users-table insights-activity-table"><caption className="insights-sr-only">Thao tác thành công, mới nhất trước</caption><thead><tr><th scope="col">Thời gian (VN)</th><th scope="col">Người thực hiện</th><th scope="col">Thao tác</th><th scope="col">Đối tượng</th><th scope="col">Chi tiết</th></tr></thead><tbody>{pagination.rows.map((event) => <tr key={event.id}>
            <td className="insights-nowrap">{formatTimestamp(event.createdAt)}</td><td><div className="insights-cell"><strong>{event.actorName}</strong><small>{ROLES[event.actorRole]?.label || 'Người dùng'}</small></div></td>
            <td><div className="insights-cell"><strong>{AUDIT_ACTIONS[event.action]}</strong><small>{AUDIT_MODULES[event.module]}</small></div></td><td className="insights-target">{event.targetName}</td><td><button className="admin-button secondary" type="button" aria-label={`Chi tiết ${AUDIT_ACTIONS[event.action]}: ${event.targetName}`} onClick={() => setDetail(event)}>Xem</button></td>
          </tr>)}</tbody></table></div> : <div className="admin-empty"><AdminIcon name="activity" /><h3>{data.activity.length ? 'Không tìm thấy hoạt động' : 'Chưa có hoạt động được ghi nhận'}</h3><p>{data.activity.length ? 'Thử thay đổi từ khóa hoặc khoảng ngày.' : 'Thực hiện một thao tác quản trị để bắt đầu nhật ký.'}</p></div>}
          <InsightsPagination {...pagination} />
        </>}
      </section>
    </>}
    {detail && <Modal title="Chi tiết hoạt động" id="activity-detail-title" onClose={() => setDetail(null)}><div className="insights-detail"><span className="admin-badge tone-active">Thao tác thành công</span><dl>
      <dt>Thời gian (Việt Nam)</dt><dd>{formatTimestamp(detail.createdAt)}</dd><dt>Người thực hiện</dt><dd>{detail.actorName} · {ROLES[detail.actorRole]?.label || 'Người dùng'}</dd><dt>Chức năng</dt><dd>{AUDIT_MODULES[detail.module]}</dd><dt>Thao tác</dt><dd>{AUDIT_ACTIONS[detail.action]}</dd><dt>Đối tượng</dt><dd>{detail.targetName}</dd><dt>Mã đối tượng</dt><dd>{detail.targetId || '—'}</dd><dt>Trường đã thay đổi</dt><dd>{detail.fields.length ? detail.fields.map((field) => FIELD_LABELS[field] || 'Thông tin danh mục').join(', ') : 'Không lưu nội dung thay đổi chi tiết.'}</dd>
    </dl><p className="admin-form-note">Chỉ lưu tên trường; không lưu giá trị trước/sau hoặc thông tin xác thực.</p><button className="admin-button secondary" onClick={() => setDetail(null)}>Đóng</button></div></Modal>}
  </div></AdminLayout>;
}
