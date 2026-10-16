import { Link } from 'react-router-dom';
import AdminIcon from '../admin/AdminIcon';
import PetAvatar from '../customer/PetAvatar';
import { PET_SPECIES, PET_STATUSES } from '../../features/pets/petPolicy';

export function ReceptionState({ state, missing, children }) {
  if (state.loading) return <div className="admin-loading" role="status">Đang tải hồ sơ phòng khám…</div>;
  if (state.error) return <section className="admin-empty admin-panel" role="alert"><h2>Không thể tải hồ sơ</h2><p>{state.error}</p><button type="button" className="admin-button secondary" onClick={state.refresh}>Thử lại</button></section>;
  if (missing) return <section className="admin-empty admin-panel"><h1>Không tìm thấy hồ sơ</h1><p>Hồ sơ không tồn tại hoặc đã thay đổi loại tài khoản.</p><Link className="admin-button secondary" to="/reception/customers">Về danh sách khách hàng</Link></section>;
  return children;
}

export function ReceptionNotice({ message }) {
  return message ? <div className="admin-alert success" role="status"><AdminIcon name="check" />{message}</div> : null;
}

export function ReceptionStats({ customers, pets }) {
  return <div className="reception-stats">{[
    ['Khách hàng', customers.length, 'Hồ sơ tại phòng khám', 'users'],
    ['Thú cưng đang quản lý', pets.filter((pet) => pet.status === 'ACTIVE').length, 'Gắn với chủ nuôi', 'heart'],
    ['Khách vãng lai', customers.filter((item) => item.source === 'WALK_IN').length, 'Không có tài khoản đăng nhập', 'shield'],
  ].map(([label, value, help, icon]) => <section className="admin-panel" key={label}><div><span>{label}</span><strong>{value}</strong><small>{help}</small></div><span className="reception-stat-icon"><AdminIcon name={icon} /></span></section>)}</div>;
}

export function CustomerSource({ customer }) {
  return <span className={`reception-badge ${customer.source === 'ACCOUNT' ? 'blue' : ''}`}>{customer.source === 'ACCOUNT' ? 'Có tài khoản' : 'Khách vãng lai'}</span>;
}

export function PetBadge({ pet }) {
  return <span className={`reception-badge ${pet.status === 'ACTIVE' ? 'green' : ''}`}>{PET_STATUSES[pet.status]}</span>;
}

export function ReceptionPetCard({ pet, owner, onEdit, onStatus }) {
  return <article className="admin-panel reception-pet-card"><div className="reception-pet-card-heading"><PetAvatar pet={pet} /><div><h3><Link to={`/reception/pets/${encodeURIComponent(pet.id)}`}>{pet.name}</Link></h3><p>{PET_SPECIES[pet.species]} · {pet.breed || 'Chưa có giống'}</p><PetBadge pet={pet} /></div></div><div className="reception-card-owner"><small>CHỦ NUÔI</small>{owner ? <Link to={`/reception/customers/${encodeURIComponent(owner.id)}`}>{owner.fullName}<span>{owner.phone}</span></Link> : <span>Không tìm thấy hồ sơ chủ nuôi</span>}</div>{pet.allergies && <p className="reception-allergy">Lưu ý dị ứng: {pet.allergies}</p>}<div className="reception-card-actions"><Link to={`/reception/pets/${encodeURIComponent(pet.id)}`}>Xem hồ sơ →</Link>{pet.status === 'ACTIVE' && <button type="button" aria-label={`Chỉnh sửa ${pet.name}`} onClick={() => onEdit(pet)}>Sửa</button>}<button type="button" aria-label={`${pet.status === 'ACTIVE' ? 'Lưu trữ' : 'Khôi phục'} ${pet.name}`} onClick={() => onStatus(pet)}>{pet.status === 'ACTIVE' ? 'Lưu trữ' : 'Khôi phục'}</button></div></article>;
}

export function ReceptionFacts({ entries }) {
  return <dl className="reception-facts">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}</dl>;
}
