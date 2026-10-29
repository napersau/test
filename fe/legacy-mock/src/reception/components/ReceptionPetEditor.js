import { useState } from 'react';
import PetEditor from '../../pets/components/PetEditor';

export default function ReceptionPetEditor({ pet, customerId, customers, onSave, onClose, saving }) {
  const [ownerId, setOwnerId] = useState(pet?.ownerId || customerId || ''); const [error, setError] = useState('');
  const [initialOwnerId] = useState(ownerId);
  const owner = customers.find((item) => item.id === ownerId);
  return <PetEditor variant="admin" externalDirty={ownerId !== initialOwnerId} pet={pet} saving={saving} onClose={onClose} onSave={async (values, id) => {
    if (!ownerId) { setError('Chọn chủ nuôi trước khi lưu thú cưng.'); document.getElementById('reception-owner')?.focus(); throw new Error('Vui lòng chọn chủ nuôi.'); }
    await onSave(ownerId, values, id);
  }} ownerField={<div className="reception-owner-field"><label className="admin-field" htmlFor="reception-owner"><span>Chủ nuôi *</span>{pet || customerId ? <strong>{owner?.fullName || 'Không tìm thấy chủ nuôi'} · {owner?.phone || '—'}</strong> : <select id="reception-owner" value={ownerId} required aria-invalid={!!error} aria-describedby={error ? 'reception-owner-error' : 'reception-owner-help'} onChange={(event) => { setOwnerId(event.target.value); setError(''); }}><option value="">Chọn khách hàng…</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.phone}</option>)}</select>}</label><p id="reception-owner-help">Hồ sơ gắn với một chủ nuôi; không đổi chủ để giữ nguyên liên kết lịch khám và hóa đơn.</p>{error && <small className="admin-field-error" id="reception-owner-error">{error}</small>}</div>} />;
}
