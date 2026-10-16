import { useState } from 'react';
import Modal from '../../../components/common/Modal';

export default function CatalogStatusDialog({ item, kind, saving, onClose, onConfirm }) {
  const [error, setError] = useState('');
  const stopping = item.status === 'ACTIVE';
  return <Modal title={stopping ? 'Ngừng sử dụng danh mục?' : 'Kích hoạt danh mục?'} id="catalog-status-title" onClose={onClose} busy={saving}>
    <div className="admin-confirm">
      <p>{stopping ? 'Ngừng sử dụng' : 'Kích hoạt'} <strong>{item.name}</strong>? Thông tin và lịch sử liên quan vẫn được giữ lại.{stopping && kind === 'medicine' && ' Thuốc ngừng sử dụng không được nhập lô mới.'}</p>
      {error && <div className="admin-alert error" role="alert">{error}</div>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={onClose}>Hủy</button><button type="button" className={`admin-button ${stopping ? 'danger' : 'primary'}`} disabled={saving} onClick={async () => { if (saving) return; try { await onConfirm(); } catch (problem) { setError(problem.message); } }}>{saving ? 'Đang lưu…' : stopping ? 'Xác nhận ngừng' : 'Xác nhận kích hoạt'}</button></div>
    </div>
  </Modal>;
}
