import { Link, useParams } from 'react-router-dom';
import ReceptionLayout from '../../layouts/ReceptionLayout';
import PetAvatar from '../../components/customer/PetAvatar';
import { ReceptionState, ReceptionNotice, ReceptionFacts, PetBadge } from '../../components/reception/ReceptionUI';
import useReception from '../../features/reception/useReception';
import useReceptionActions from '../../features/reception/useReceptionActions';
import { PET_SPECIES, PET_GENDERS, petAge, petWeight } from '../../features/pets/petPolicy';
import { calendarDate } from '../../features/catalog/catalogPolicy';

export default function PetDetailPage() {
  const { petId } = useParams(); const state = useReception(); const actions = useReceptionActions(state);
  const pet = state.pets.find((item) => item.id === petId); const owner = state.customers.find((item) => item.id === pet?.ownerId);
  return <ReceptionLayout title="Hồ sơ thú cưng"><Link className="reception-back" to="/reception/pets">← Danh sách thú cưng</Link><ReceptionState state={state} missing={!pet}>
    {pet && <><div className="admin-page-title"><div><span className="admin-eyebrow">HỒ SƠ THÚ CƯNG</span><h1>{pet.name}</h1><p>Thông tin nhận diện và chăm sóc do chủ nuôi cung cấp.</p></div><div className="reception-heading-actions">{pet.status === 'ACTIVE' && <button type="button" className="admin-button primary" onClick={() => actions.openPet(pet)}>Chỉnh sửa hồ sơ</button>}<button type="button" className="admin-button secondary" onClick={() => actions.openStatus(pet)}>{pet.status === 'ACTIVE' ? 'Lưu trữ hồ sơ' : 'Khôi phục hồ sơ'}</button></div></div><ReceptionNotice message={actions.notice} />
      {pet.status === 'ARCHIVED' && <p className="reception-info">Hồ sơ đã lưu trữ. Khôi phục để tiếp tục chỉnh sửa; thông tin và lịch sử không bị xóa.</p>}
      <div className="reception-detail-grid"><aside className="admin-panel reception-pet-summary"><PetAvatar pet={pet} /><h2>{pet.name}</h2><p>{PET_SPECIES[pet.species]} · {pet.breed || 'Chưa có giống'}</p><PetBadge pet={pet} /><p>{petAge(pet.birthDate, pet.estimatedBirthDate)} · {petWeight(pet.weight)}</p><div className="reception-card-owner"><small>CHỦ NUÔI</small>{owner ? <Link to={`/reception/customers/${encodeURIComponent(owner.id)}`}>{owner.fullName}<span>{owner.phone}</span></Link> : <p>Không tìm thấy chủ nuôi; kiểm tra hồ sơ khách hàng trước khi cập nhật.</p>}</div></aside>
        <div><section className="admin-panel reception-detail-panel"><h2>Thông tin nhận diện</h2><ReceptionFacts entries={[
          ['Mã hồ sơ', pet.id], ['Loài', PET_SPECIES[pet.species]], ['Giống', pet.breed], ['Giới tính', PET_GENDERS[pet.gender]], [pet.estimatedBirthDate ? 'Ngày sinh (ước tính)' : 'Ngày sinh', pet.birthDate ? calendarDate(pet.birthDate) : ''], ['Cân nặng khai báo', petWeight(pet.weight)], ['Màu lông', pet.color], ['Mã chip', pet.microchip], ['Triệt sản', pet.neutered ? 'Đã triệt sản' : 'Chưa xác nhận đã triệt sản'],
        ]} /></section><section className="admin-panel reception-detail-panel"><h2>Dị ứng & lưu ý chăm sóc</h2><p className="reception-disclaimer">Thông tin do chủ nuôi cung cấp, không thay thế xác nhận hay hồ sơ khám của bác sĩ.</p>{pet.allergies ? <p className="reception-allergy">Lưu ý dị ứng: {pet.allergies}</p> : <p className="reception-disclaimer">Chưa khai báo thông tin dị ứng.</p>}<h3>Ghi chú</h3><p className="reception-note">{pet.notes || 'Chưa có ghi chú chăm sóc.'}</p></section></div>
      </div>
    </>}
  </ReceptionState>{actions.dialogs}</ReceptionLayout>;
}
