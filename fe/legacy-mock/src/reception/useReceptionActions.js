import { useState } from 'react';
import CustomerEditor from './components/CustomerEditor';
import ReceptionPetEditor from './components/ReceptionPetEditor';
import PetStatusDialog from '../pets/components/PetStatusDialog';

export default function useReceptionActions(state, onCreated) {
  const [customerEditor, setCustomerEditor] = useState(null); const [petEditor, setPetEditor] = useState(null); const [statusTarget, setStatusTarget] = useState(null); const [notice, setNotice] = useState('');
  const openCustomer = (customer = {}) => { setNotice(''); setCustomerEditor(customer); };
  const openPet = (pet = null, customerId = '') => { setNotice(''); setPetEditor({ pet, customerId }); };
  const openStatus = (pet) => { setNotice(''); setStatusTarget(pet); };
  const dialogs = <>
    {customerEditor && <CustomerEditor customer={customerEditor.id ? customerEditor : null} saving={state.saving} onClose={() => setCustomerEditor(null)} onSave={async (values, id) => { await state.saveCustomer(values, id); setCustomerEditor(null); setNotice(id ? 'Đã cập nhật hồ sơ khách hàng.' : 'Đã thêm hồ sơ khách vãng lai. Chưa tạo tài khoản đăng nhập.'); if (!id) onCreated?.(); }} />}
    {petEditor && <ReceptionPetEditor {...petEditor} customers={state.customers} saving={state.saving} onClose={() => setPetEditor(null)} onSave={async (ownerId, values, id) => { await state.savePet(ownerId, values, id); setPetEditor(null); setNotice(id ? 'Đã cập nhật hồ sơ thú cưng.' : 'Đã thêm thú cưng và liên kết chủ nuôi.'); if (!id) onCreated?.(); }} />}
    {statusTarget && <PetStatusDialog variant="admin" pet={statusTarget} saving={state.saving} onClose={() => setStatusTarget(null)} onConfirm={async (id, status) => { await state.setPetStatus(id, status, statusTarget.version); setStatusTarget(null); setNotice(status === 'ARCHIVED' ? 'Đã lưu trữ hồ sơ. Thông tin và lịch sử vẫn được giữ lại.' : 'Đã khôi phục hồ sơ thú cưng.'); }} />}
  </>;
  return { openCustomer, openPet, openStatus, notice, dialogs };
}
