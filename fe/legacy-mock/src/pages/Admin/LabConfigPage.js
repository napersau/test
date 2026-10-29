import { useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import useLabConfig from '../../features/labConfig/useLabConfig';
import LabItemEditor from '../../features/labConfig/LabItemEditor';
import { LAB_SPECIES } from '../../features/labConfig/labConfigRepository';

const range = (value) => (value ? `${value.min} – ${value.max}` : 'Chưa cấu hình');

export default function LabConfigPage() {
  const { items, loading, error, saving, refresh, save } = useLabConfig();
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState('');
  return <AdminLayout title="Xét nghiệm & tham chiếu">
    <div className="admin-page-title"><div><span className="admin-eyebrow">CẤU HÌNH XÉT NGHIỆM</span><h1>Chỉ số xét nghiệm & khoảng tham chiếu</h1><p>Định nghĩa các chỉ số đo và ngưỡng bình thường theo loài. Phòng xét nghiệm dùng cấu hình này để tự đánh giá Thấp / Bình thường / Cao.</p></div>
      <button type="button" className="admin-button primary" disabled={loading || Boolean(error)} onClick={() => { setNotice(''); setEditor({}); }}><AdminIcon name="plus" />Thêm chỉ số</button></div>
    {notice && <div className="admin-alert success" role="status"><AdminIcon name="check" />{notice}<button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}
    <div className="catalog-inventory-note"><AdminIcon name="shield" /><p>Dịch vụ nhóm <strong>Xét nghiệm</strong> được gắn với các chỉ số ở đây tại trang Dịch vụ. Đổi ngưỡng không làm thay đổi kết quả đã đo trước đó vì kết quả lưu kèm ngưỡng tại thời điểm xét nghiệm.</p></div>
    {loading ? <div className="admin-loading" role="status">Đang tải cấu hình…</div> : error ? <div className="admin-empty" role="alert"><h2>Không thể tải cấu hình</h2><p>{error}</p><button type="button" className="admin-button secondary" onClick={refresh}>Thử lại</button></div> :
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Chỉ số & khoảng tham chiếu theo loài <span>{items.length}</span></h2><p>Giá trị trong khoảng [ngưỡng dưới, ngưỡng trên] là bình thường.</p></div></div>
        {items.length ? <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Bảng chỉ số xét nghiệm"><table className="admin-users-table catalog-table">
          <thead><tr><th scope="col">Chỉ số</th><th scope="col">Đơn vị</th>{Object.values(LAB_SPECIES).map((label) => <th scope="col" key={label}>Tham chiếu · {label}</th>)}<th scope="col">Thao tác</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.id}>
            <td><div className="catalog-name"><span className="catalog-icon tone-teal"><AdminIcon name="activity" /></span><div><strong>{item.name}</strong><small>{item.code}{item.description ? ` · ${item.description}` : ''}</small></div></div></td>
            <td>{item.unit}</td>
            {Object.keys(LAB_SPECIES).map((species) => <td key={species}>{range(item.ranges[species])}</td>)}
            <td><div className="admin-row-actions"><button type="button" aria-label={`Chỉnh sửa ${item.name}`} onClick={() => { setNotice(''); setEditor(item); }}>Chỉnh sửa</button></div></td>
          </tr>)}</tbody>
        </table></div> : <div className="admin-empty"><AdminIcon name="activity" width="40" height="40" /><h3>Chưa có chỉ số xét nghiệm</h3><p>Thêm chỉ số đầu tiên, ví dụ WBC.</p></div>}
      </section>}
    {editor && <LabItemEditor item={editor.id ? editor : null} saving={saving} onClose={() => setEditor(null)} onSave={async (values, id) => { await save(values, id); setEditor(null); setNotice(`Đã ${id ? 'cập nhật' : 'thêm'} chỉ số xét nghiệm.`); }} />}
  </AdminLayout>;
}
