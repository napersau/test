import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import PetIcon from '../../../components/customer/PetIcon';

export default function PetStatusDialog({ pet, onConfirm, onClose, saving, variant = 'customer' }) {
  const [error, setError] = useState('');
  const archiving = pet.status === 'ACTIVE';
  return <Modal variant={variant} className={variant === 'admin' ? 'reception-pet-modal' : ''} title={archiving ? 'Lưu trữ hồ sơ thú cưng' : 'Khôi phục hồ sơ thú cưng'} id="pet-status-title" onClose={onClose} busy={saving}>
    <div className="pet-status-content"><div className="pet-status-icon"><PetIcon name="archive" /></div><p>{archiving ? <>Lưu trữ hồ sơ của <strong>{pet.name}</strong>?</> : <>Đưa <strong>{pet.name}</strong> trở lại danh sách đang quản lý?</>}</p><p className="pet-form-disclaimer">{archiving ? 'Hồ sơ và thông tin vẫn được giữ lại. Bạn có thể xem trong bộ lọc “Đã lưu trữ” và khôi phục bất cứ lúc nào.' : 'Sau khi khôi phục, bạn có thể tiếp tục cập nhật thông tin của bé.'}</p>
      {error && <p role="alert" className="pet-alert error">{error}</p>}
      <div className="pet-dialog-actions"><button className="pet-button secondary" onClick={onClose} disabled={saving}>Hủy</button><button className="pet-button primary" disabled={saving} onClick={async () => { try { await onConfirm(pet.id, archiving ? 'ARCHIVED' : 'ACTIVE'); } catch (problem) { setError(problem.message); } }}>{saving ? 'Đang lưu…' : archiving ? 'Xác nhận lưu trữ' : 'Xác nhận khôi phục'}</button></div>
    </div>
  </Modal>;
}
