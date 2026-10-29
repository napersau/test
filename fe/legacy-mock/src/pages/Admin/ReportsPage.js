import { useMemo } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import CatalogStats from '../../components/admin/CatalogStats';
import DateRangeFilter from '../../components/admin/DateRangeFilter';
import RoleDistribution from '../../components/admin/RoleDistribution';
import InsightsPagination, { useInsightsPagination } from '../../components/admin/InsightsPagination';
import useAdminInsights, { INSIGHT_SOURCES } from '../../features/admin/useAdminInsights';
import useDateRange from '../../features/reports/useDateRange';
import { buildReport, formatTimestamp } from '../../features/reports/reportPolicy';
import { money } from '../../features/catalog/catalogPolicy';
import ReportTrend from '../../features/reports/components/ReportTrend';
import InventoryWarnings from '../../features/reports/components/InventoryWarnings';
import CareReport from '../../features/reports/components/CareReport';

export default function ReportsPage() {
  const { data, errors, loading, updatedAt, warning, refresh } = useAdminInsights();
  const range = useDateRange(true);
  const hasError = Object.keys(errors).length > 0;
  const { report, calculationError } = useMemo(() => {
    if (loading || hasError || range.error) return { report: null, calculationError: '' };
    try { return { report: buildReport(data, range.from, range.to), calculationError: '' }; }
    catch (error) { return { report: null, calculationError: error.message }; }
  }, [data, loading, hasError, range.error, range.from, range.to]);
  const pagination = useInsightsPagination(report?.trend || [], `${range.from}|${range.to}`);
  const groupMax = Math.max(1, ...(report?.serviceGroups.map((group) => group.count) || []));
  return <AdminLayout title="Báo cáo & thống kê"><div className="admin-reports-page">
    <div className="admin-page-title"><div><span className="admin-eyebrow">REPORTS & INSIGHTS</span><h1>Báo cáo & thống kê</h1><p>Số liệu từ tài khoản, danh mục và kho thuốc đang có trong hệ thống.</p></div><button type="button" className="admin-button secondary" onClick={refresh}><AdminIcon name="refresh" />Làm mới</button></div>
    <section className="admin-panel insights-range-panel"><div className="admin-panel-heading"><div><h2>Khoảng thời gian báo cáo</h2><p>Gồm cả ngày bắt đầu và kết thúc · Giờ Việt Nam · Tối đa 366 ngày.</p></div><AdminIcon name="calendar" /></div><DateRangeFilter range={range} /></section>
    <div className="catalog-inventory-note"><AdminIcon name="chart" /><p>Số liệu tổng hợp từ dữ liệu localStorage, gồm cả hóa đơn/lịch khám/thú cưng và nhật ký. Dữ liệu mẫu không phải giao dịch thật; chi phí nhập và giá trị hóa đơn không phải lợi nhuận. Các số tiền thu/hoàn được đối chiếu theo ledger.</p></div>
    {warning && <div className="admin-alert error" role="alert">{warning}</div>}
    {calculationError && <p className="admin-alert error" role="alert">Không thể tính báo cáo: {calculationError} Kiểm tra nguồn dữ liệu, không thay tổng bằng số 0.</p>}
    {loading ? <p role="status">Đang tải báo cáo…</p> : hasError ? <section className="admin-panel admin-empty" role="alert"><h2>Không thể tổng hợp báo cáo</h2><p>Sửa lỗi nguồn dữ liệu trước khi tính số liệu; không thay dữ liệu lỗi bằng số 0.</p>{Object.entries(errors).map(([key, message]) => <p key={key}>{INSIGHT_SOURCES[key]}: {message}</p>)}<button type="button" className="admin-button secondary" onClick={refresh}>Thử lại</button></section> : report && <>
      <CareReport report={report} />
      <div className="insights-section-title"><div><h2>Thống kê trong kỳ</h2><p>Khách hàng theo ngày tạo, lô hàng theo ngày nhập, thao tác theo thời điểm ghi nhật ký.</p></div><small>Cập nhật: {formatTimestamp(updatedAt)}</small></div>
      <CatalogStats stats={[
        { label: 'Khách hàng mới', value: report.customers, note: 'Tài khoản thuộc vai trò khách hàng hiện tại', icon: 'users', tone: 'blue' },
        { label: 'Lô hàng nhập', value: report.batches, note: 'Bao gồm lô có ngày nhập trong kỳ', icon: 'box', tone: 'teal' },
        { label: 'Chi phí nhập trong kỳ', value: money(report.importCost), valueClass: 'insights-money', note: 'Số lượng nhập × giá nhập từng lô', icon: 'medicine', tone: 'orange' },
        { label: 'Thao tác được ghi nhận', value: report.actions, note: 'Chỉ các thao tác có trong nhật ký đã lưu', icon: 'activity', tone: 'violet' },
      ]} />
      {!report.customers && !report.batches && !report.actions && !report.invoiceCount && !report.visitCount && !report.appointmentCount && !report.receipts && !report.refunds && <p className="insights-period-empty" role="status">Không có phát sinh trong khoảng thời gian đã chọn.</p>}
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Khách hàng mới & nhập kho</h2><p>{report.monthly ? 'Gộp theo tháng; tháng đầu/cuối chỉ tính các ngày trong khoảng đã chọn.' : 'Phát sinh theo từng ngày trong khoảng đã chọn.'}</p></div><AdminIcon name="chart" /></div><ReportTrend rows={report.trend} monthly={report.monthly} />
        <div className="admin-table-scroll"><table className="admin-users-table insights-report-table"><caption className="insights-sr-only">Chi tiết số liệu trong kỳ, cùng nguồn với biểu đồ</caption><thead><tr><th scope="col">{report.monthly ? 'Tháng' : 'Ngày'}</th><th scope="col">Khách hàng mới</th><th scope="col">Lô nhập</th><th scope="col">Chi phí nhập</th><th scope="col">Thao tác</th></tr></thead><tbody>{pagination.rows.map((row) => <tr key={row.key}><td>{row.label}</td><td>{row.customers}</td><td>{row.batches}</td><td className="insights-nowrap">{money(row.importCost)}</td><td>{row.actions}</td></tr>)}</tbody><tfoot><tr><th scope="row">Tổng trong kỳ</th><td>{report.customers}</td><td>{report.batches}</td><td>{money(report.importCost)}</td><td>{report.actions}</td></tr></tfoot></table></div><InsightsPagination {...pagination} />
      </section>
      <div className="insights-section-title"><div><h2>Tổng quan hiện tại</h2><p>Ảnh chụp dữ liệu lúc làm mới; không phụ thuộc bộ lọc ngày phía trên.</p></div></div>
      <CatalogStats stats={[
        { label: 'Tài khoản hoạt động', value: data.users.filter((user) => user.status === 'ACTIVE').length, note: `Trên tổng ${data.users.length} tài khoản`, icon: 'users', tone: 'blue' },
        { label: 'Dịch vụ đang sử dụng', value: data.services.filter((service) => service.status === 'ACTIVE').length, note: `Trên tổng ${data.services.length} dịch vụ`, icon: 'service', tone: 'teal' },
        { label: 'Thuốc đang sử dụng', value: data.medicines.filter((medicine) => medicine.status === 'ACTIVE').length, note: `${report.warnings.length} thuốc có cảnh báo tồn hoặc hạn dùng`, icon: 'medicine', tone: 'orange' },
        { label: 'Giá trị tồn có thể dùng', value: money(report.availableValue), valueClass: 'insights-money', note: 'Tồn chưa hết hạn × giá nhập, gồm thuốc ngừng dùng', icon: 'box', tone: 'violet' },
      ]} />
      <div className="admin-dashboard-grid"><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Phân bổ tài khoản hiện tại</h2><p>Theo vai trò, bao gồm tài khoản đã khóa.</p></div></div><RoleDistribution users={data.users} /></section>
        <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Danh mục dịch vụ hiện tại</h2><p>Số dịch vụ đang dùng theo nhóm; không phải dịch vụ bán chạy.</p></div></div><div className="insights-service-groups">{report.serviceGroups.map((group) => <div key={group.type}><div><strong>{group.label}</strong><span>{group.count} dịch vụ</span></div><div className="insights-group-track"><span style={{ width: `${group.count / groupMax * 100}%` }} /></div><small>{group.count ? `${money(group.minPrice)} – ${money(group.maxPrice)}` : 'Chưa có dịch vụ đang dùng'}</small></div>)}</div></section>
      </div><InventoryWarnings report={report} />
      <p className="admin-bottom-note">Bản demo có dữ liệu mẫu. Khách hàng được phân loại theo vai trò hiện tại, không có lịch sử vai trò. Nhật ký chỉ giữ 2.000 thao tác gần nhất, không phải tổng hoạt động toàn hệ thống.</p>
    </>}
  </div></AdminLayout>;
}
