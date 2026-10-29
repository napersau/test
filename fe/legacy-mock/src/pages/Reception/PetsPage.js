import ReceptionLayout from '../../layouts/ReceptionLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import InsightsPagination from '../../components/admin/InsightsPagination';
import { ReceptionState, ReceptionNotice, ReceptionStats, ReceptionPetCard } from '../../components/reception/ReceptionUI';
import useReception from '../../features/reception/useReception';
import useReceptionActions from '../../features/reception/useReceptionActions';
import useReceptionFilters from '../../features/reception/useReceptionFilters';
import { normalize } from '../../features/catalog/catalogPolicy';
import { PET_SPECIES, PET_STATUSES } from '../../features/pets/petPolicy';

export default function PetsPage() {
  const state = useReception();
  const owners = new Map(state.customers.map((item) => [item.id, item]));
  const filters = useReceptionFilters(state.pets, (pet, values) => (!values.status || pet.status === values.status) && (!values.species || pet.species === values.species) && (!values.ownerId || pet.ownerId === values.ownerId) && normalize(`${pet.name} ${pet.id} ${pet.microchip} ${owners.get(pet.ownerId)?.fullName || ''} ${owners.get(pet.ownerId)?.phone || ''}`).includes(values.search));
  const actions = useReceptionActions(state, filters.reset);
  return <ReceptionLayout title="Thông tin thú cưng">
    <div className="admin-page-title"><div><span className="admin-eyebrow">HỒ SƠ THÚ CƯNG</span><h1>Quản lý thú cưng</h1><p>Nhận diện, liên kết chủ nuôi và ghi nhận thông tin chăm sóc được cung cấp.</p></div><button type="button" className="admin-button primary" disabled={state.loading || !!state.error || !state.customers.length} onClick={() => actions.openPet()}><AdminIcon name="plus" />Thêm thú cưng</button></div>
    <ReceptionNotice message={actions.notice} />
    <ReceptionState state={state}>
      <ReceptionStats customers={state.customers} pets={state.pets} />
      <section className="admin-panel reception-pet-list"><div className="admin-panel-heading"><div><h2>Danh sách thú cưng <span>{state.pets.length}</span></h2><p>Tìm tên, mã hồ sơ, mã chip, tên chủ nuôi hoặc số điện thoại.</p></div></div>
        <div className="admin-filters"><label className="admin-search"><AdminIcon name="search" /><input aria-label="Tìm thú cưng" placeholder="Tên bé, mã chip, chủ nuôi…" value={filters.params.get('search') || ''} onChange={(event) => filters.set('search', event.target.value)} /></label><select aria-label="Lọc loài" value={filters.params.get('species') || ''} onChange={(event) => filters.set('species', event.target.value)}><option value="">Tất cả loài</option>{Object.entries(PET_SPECIES).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select><select aria-label="Lọc trạng thái hồ sơ" value={filters.params.get('status') || ''} onChange={(event) => filters.set('status', event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(PET_STATUSES).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select><button type="button" className="admin-clear" onClick={filters.reset}>Xóa bộ lọc</button></div>
        {filters.rows.length ? <div className="reception-pets-grid">{filters.rows.map((pet) => <ReceptionPetCard key={pet.id} pet={pet} owner={owners.get(pet.ownerId)} onEdit={actions.openPet} onStatus={actions.openStatus} />)}</div> : <div className="admin-empty"><AdminIcon name="heart" width="40" height="40" /><h2>{state.pets.length ? 'Không tìm thấy thú cưng' : 'Chưa có hồ sơ thú cưng'}</h2><p>Đổi bộ lọc hoặc tạo hồ sơ khách hàng rồi thêm thú cưng.</p></div>}
        <InsightsPagination {...filters} />
      </section><p className="admin-bottom-note"><AdminIcon name="shield" />Lưu trữ thay vì xóa để giữ hồ sơ và lịch sử. Không chỉnh sửa chẩn đoán hoặc đơn thuốc tại đây.</p>
    </ReceptionState>{actions.dialogs}
  </ReceptionLayout>;
}
