import { Link } from 'react-router-dom';
import { MEDICINE_UNITS, money } from '../../catalog/catalogPolicy';

export default function InventoryWarnings({ report }) {
  return <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Cảnh báo kho hiện tại</h2><p>{report.warnings.length} thuốc cần kiểm tra · Giá trị tồn hết hạn theo giá nhập: {money(report.expiredValue)}.</p></div><Link to="/admin/medicines">Mở kho →</Link></div>
    {report.warnings.length ? <div className="admin-table-scroll"><table className="admin-users-table insights-inventory-table"><caption className="insights-sr-only">Cảnh báo tồn kho hiện tại, không phụ thuộc khoảng ngày báo cáo</caption><thead><tr><th scope="col">Thuốc</th><th scope="col">Có thể dùng / Ngưỡng tồn</th><th scope="col">Hết hạn</th><th scope="col">Cảnh báo</th></tr></thead><tbody>{report.warnings.map((medicine) => <tr key={medicine.id}><td><div className="insights-cell"><strong>{medicine.name}</strong><small>{medicine.code} · {medicine.status === 'ACTIVE' ? 'Đang sử dụng' : 'Ngừng sử dụng'}</small></div></td><td>{medicine.availableStock} / {medicine.minStockLevel} {MEDICINE_UNITS[medicine.unit]}</td><td>{medicine.expiredStock} {MEDICINE_UNITS[medicine.unit]}</td><td><div className="catalog-flags">
      {medicine.status === 'ACTIVE' && medicine.lowStock && <span>Tồn thấp</span>}{medicine.expiredStock > 0 && <span>Có lô hết hạn</span>}{medicine.nearExpiryBatches > 0 && <span>{medicine.nearExpiryBatches} lô sắp hết hạn</span>}
    </div></td></tr>)}</tbody></table></div> : <div className="admin-empty"><h3>Không có cảnh báo tồn kho</h3><p>Cảnh báo sắp hết hạn tính trong 30 ngày, theo ngày Việt Nam.</p></div>}
  </section>;
}
