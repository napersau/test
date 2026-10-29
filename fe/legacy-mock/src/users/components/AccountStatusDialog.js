import { useState } from 'react';
import Modal from '../../../components/common/Modal';

export default function AccountStatusDialog({ user, onConfirm, onClose, saving }) {
  const [error, setError] = useState('');
  const locking = user.status === 'ACTIVE';
  const activating = user.status === 'INACTIVE';
  return (
    <Modal id="account-status-title" title={locking ? 'Khóa tài khoản?' : activating ? 'Kích hoạt tài khoản?' : 'Mở khóa tài khoản?'} onClose={onClose} busy={saving}>
      <div className="admin-confirm">
        <p><strong>{user.fullName}</strong> ({user.email})</p>
        <p>{locking ? 'Người dùng sẽ không thể đăng nhập. Nếu là bác sĩ, sức chứa các khung giờ đặt lịch sẽ giảm tương ứng. Dữ liệu và hồ sơ liên quan được giữ lại.' : 'Người dùng sẽ có thể đăng nhập và sử dụng lại tài khoản. Nếu là bác sĩ, sức chứa các khung giờ đặt lịch sẽ tăng tương ứng.'}</p>
        {error && <p className="admin-alert error" role="alert">{error}</p>}
        <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={onClose}>Hủy</button><button type="button" className={`admin-button ${locking ? 'danger' : 'primary'}`} disabled={saving} onClick={async () => { try { await onConfirm(); } catch (problem) { setError(problem.message); } }}>{saving ? 'Đang xử lý…' : locking ? 'Xác nhận khóa' : activating ? 'Xác nhận kích hoạt' : 'Xác nhận mở khóa'}</button></div>
      </div>
    </Modal>
  );
}
