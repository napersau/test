import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import PetAvatar from '../../components/customer/PetAvatar';
import PetIcon from '../../components/customer/PetIcon';
import usePets from '../../features/pets/usePets';
import PetEditor from '../../features/pets/components/PetEditor';
import PetStatusDialog from '../../features/pets/components/PetStatusDialog';
import { PET_GENDERS, PET_SPECIES, PET_STATUSES, petAge, petWeight } from '../../features/pets/petPolicy';
import { calendarDate, clinicToday } from '../../features/catalog/catalogPolicy';
import '../../styles/pets.css';

export default function PetDetailPage() {
  const { petId } = useParams();
  const { pets, loading, error, refresh, saving, save, setStatus } = usePets();
  const [editing, setEditing] = useState(false); const [statusOpen, setStatusOpen] = useState(false); const [message, setMessage] = useState('');
  const pet = pets.find((item) => item.id === petId);
  const saveForm = async (values, id) => { await save(values, id); setEditing(false); setMessage('Đã cập nhật thông tin thú cưng.'); };
  const changeStatus = async (id, status) => { await setStatus(id, status); setStatusOpen(false); setMessage(status === 'ARCHIVED' ? 'Đã lưu trữ hồ sơ. Bạn vẫn có thể xem và khôi phục.' : 'Đã khôi phục hồ sơ thú cưng.'); };
  return <CustomerLayout><main className="customer-pets-page"><div className="profile-container">
    <Link className="pet-back-link" to="/portal/pets"><PetIcon name="back" />Thú cưng của tôi</Link>
    {loading ? <p role="status" className="pet-loading">Đang tải hồ sơ thú cưng…</p> : error ? <section className="pet-panel pet-empty" role="alert"><h1>Không thể tải hồ sơ</h1><p>{error}</p><button className="pet-button secondary" onClick={refresh}>Thử lại</button></section> : !pet ? <section className="pet-panel pet-empty"><PetIcon width="44" height="44" /><h1>Không tìm thấy thú cưng</h1><p>Hồ sơ không tồn tại hoặc không thuộc tài khoản của bạn.</p><Link className="pet-button primary" to="/portal/pets">Về danh sách của tôi</Link></section> : <>
      <div className="pet-detail-heading"><div><span className="pet-eyebrow">HỒ SƠ NGƯỜI BẠN NHỎ</span><h1>{pet.name}</h1><p>Thông tin do chủ nuôi cung cấp · Cập nhật {calendarDate(clinicToday(new Date(pet.updatedAt)))}</p></div><div className="pet-heading-actions">{pet.status === 'ACTIVE' && <button className="pet-button primary" onClick={() => { setEditing(true); setMessage(''); }}><PetIcon name="edit" />Chỉnh sửa hồ sơ</button>}<button className="pet-button secondary" onClick={() => { setStatusOpen(true); setMessage(''); }}><PetIcon name="archive" />{pet.status === 'ACTIVE' ? 'Lưu trữ hồ sơ' : 'Khôi phục hồ sơ'}</button></div></div>
      {message && <div className="pet-alert success" role="status">{message}</div>}
      {pet.status === 'ARCHIVED' && <div className="pet-alert neutral">Hồ sơ đã lưu trữ. Thông tin vẫn được giữ lại; khôi phục để tiếp tục chỉnh sửa.</div>}
      <div className="pet-detail-grid"><aside className="pet-panel pet-detail-summary"><PetAvatar pet={pet} /><h2>{pet.name}</h2><p>{PET_SPECIES[pet.species]} · {pet.breed || 'Chưa cập nhật giống'}</p><span className={`pet-status-badge ${pet.status === 'ARCHIVED' ? 'archived' : ''}`}>{PET_STATUSES[pet.status]}</span>{pet.demo && <small className="pet-detail-demo">Hồ sơ mẫu cho bản demo</small>}<div className="pet-detail-mini-stats"><div><strong>{petWeight(pet.weight)}</strong><span>Cân nặng khai báo</span></div><div><strong>{petAge(pet.birthDate, pet.estimatedBirthDate)}</strong><span>Độ tuổi theo ngày sinh</span></div></div></aside>
        <div className="pet-detail-content"><section className="pet-panel"><div className="pet-panel-title"><span><PetIcon /></span><div><h2>Thông tin cơ bản</h2><p>Những thông tin nhận diện và chăm sóc của bé.</p></div></div><dl className="pet-profile-facts">{[
          ['Tên thú cưng', pet.name], ['Loài', PET_SPECIES[pet.species]], ['Giống', pet.breed || 'Chưa cập nhật'], ['Giới tính', PET_GENDERS[pet.gender]],
          [pet.estimatedBirthDate ? 'Ngày sinh (ước tính)' : 'Ngày sinh', pet.birthDate ? calendarDate(pet.birthDate) : 'Chưa cập nhật'], ['Cân nặng hiện tại', petWeight(pet.weight)],
          ['Màu lông', pet.color || 'Chưa cập nhật'], ['Mã chip', pet.microchip || 'Chưa cập nhật'], ['Triệt sản', pet.neutered ? 'Đã triệt sản' : 'Chưa xác nhận đã triệt sản'],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
        <section className={`pet-panel pet-care-panel ${pet.allergies ? 'has-allergy' : ''}`}><div className="pet-panel-title"><span><PetIcon name="heart" /></span><div><h2>Dị ứng & lưu ý chăm sóc</h2><p>Do bạn khai báo, chưa phải xác nhận của bác sĩ.</p></div></div><div className="pet-care-copy"><h3>Thông tin dị ứng</h3><p>{pet.allergies || 'Chưa cập nhật thông tin dị ứng.'}</p><h3>Ghi chú thêm</h3><p>{pet.notes || 'Chưa có ghi chú chăm sóc.'}</p></div></section>
        <section className="pet-medical-placeholder"><PetIcon name="heart" /><div><h2>Hồ sơ khám & lịch hẹn</h2><p>Xem các lần khám đã hoàn tất hoặc gửi yêu cầu khám mới cho bé. Hồ sơ y tế không được tạo tự động khi đặt lịch.</p><div className="pet-heading-actions">{pet.status === 'ACTIVE' && <Link className="pet-button primary" to={`/portal/booking?petId=${encodeURIComponent(pet.id)}`}>Đặt lịch cho bé</Link>}<Link className="pet-button secondary" to="/portal/medical-history">Lịch sử khám bệnh</Link></div></div></section>
        </div>
      </div>
      {editing && <PetEditor pet={pet} onSave={saveForm} onClose={() => setEditing(false)} saving={saving} />}
      {statusOpen && <PetStatusDialog pet={pet} onConfirm={changeStatus} onClose={() => setStatusOpen(false)} saving={saving} />}
    </>}
  </div></main></CustomerLayout>;
}
