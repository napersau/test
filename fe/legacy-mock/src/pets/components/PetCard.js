import { Link } from 'react-router-dom';
import PetAvatar from '../../../components/customer/PetAvatar';
import PetIcon from '../../../components/customer/PetIcon';
import { PET_GENDERS, PET_SPECIES, PET_STATUSES, petAge, petWeight } from '../petPolicy';

export default function PetCard({ pet, onEdit, onStatus }) {
  const archived = pet.status === 'ARCHIVED';
  return <article className={`customer-pet-card ${archived ? 'is-archived' : ''}`} aria-label={`Hồ sơ ${pet.name}`}>
    <div className="pet-card-cover"><PetAvatar pet={pet} /><span className={`pet-status-badge ${archived ? 'archived' : ''}`}>{PET_STATUSES[pet.status]}</span>{pet.demo && <span className="pet-demo-badge">Hồ sơ mẫu</span>}</div>
    <div className="pet-card-content"><div className="pet-card-name"><div><h2><Link to={`/portal/pets/${pet.id}`}>{pet.name}</Link></h2><p>{pet.breed || 'Chưa cập nhật giống'}</p>{pet.code && <small className="pet-code">Mã hồ sơ: {pet.code}</small>}</div><span className={`pet-species-tag species-${pet.species.toLowerCase()}`}>{PET_SPECIES[pet.species]}</span></div>
      <dl className="pet-card-facts"><div><dt>Độ tuổi</dt><dd>{petAge(pet.birthDate, pet.estimatedBirthDate)}</dd></div><div><dt>Cân nặng</dt><dd>{petWeight(pet.weight)}</dd></div><div><dt>Giới tính</dt><dd>{PET_GENDERS[pet.gender]}</dd></div></dl>
      <div className={`pet-card-note ${pet.allergies ? 'has-allergy' : ''}`}><PetIcon name="heart" /><span>{pet.allergies ? 'Có lưu ý dị ứng do chủ nuôi cung cấp' : 'Thông tin chăm sóc trong hồ sơ của bé'}</span></div>
      <Link className="pet-button secondary pet-card-detail" to={`/portal/pets/${pet.id}`}>Xem hồ sơ<PetIcon name="arrow" /></Link>
      <div className="pet-card-actions">{!archived && <button type="button" className="pet-text-button" aria-label={`Chỉnh sửa ${pet.name}`} onClick={() => onEdit(pet)}><PetIcon name="edit" />Chỉnh sửa</button>}<button type="button" className="pet-text-button" aria-label={`${archived ? 'Khôi phục' : 'Lưu trữ'} ${pet.name}`} onClick={() => onStatus(pet)}><PetIcon name="archive" />{archived ? 'Khôi phục' : 'Lưu trữ'}</button></div>
    </div>
  </article>;
}
