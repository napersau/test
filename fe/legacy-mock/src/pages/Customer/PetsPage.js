import { useMemo, useState } from 'react';
import CustomerLayout from '../../layouts/CustomerLayout';
import PetIcon from '../../components/customer/PetIcon';
import usePets from '../../features/pets/usePets';
import { PET_SPECIES, PET_STATUSES } from '../../features/pets/petPolicy';
import { normalize } from '../../features/catalog/catalogPolicy';
import PetCard from '../../features/pets/components/PetCard';
import PetEditor from '../../features/pets/components/PetEditor';
import PetStatusDialog from '../../features/pets/components/PetStatusDialog';
import '../../styles/pets.css';

export default function PetsPage() {
  const { pets, loading, error, saving, refresh, save, setStatus } = usePets();
  const [query, setQuery] = useState(''); const [species, setSpecies] = useState(''); const [status, setStatusFilter] = useState('ACTIVE');
  const [editor, setEditor] = useState(null); const [statusPet, setStatusPet] = useState(null); const [message, setMessage] = useState('');
  const [pageSelection, setPageSelection] = useState({ key: '', page: 1 });
  const filtered = useMemo(() => pets.filter((pet) => (!species || pet.species === species) && (!status || pet.status === status)
    && normalize(`${pet.name} ${pet.breed} ${pet.microchip}`).includes(normalize(query.trim()))), [pets, species, status, query]);
  const filterKey = `${query}|${species}|${status}`; const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const page = pageSelection.key === filterKey ? Math.min(pageSelection.page, pages) : 1;
  const openEditor = (pet = null) => { setEditor({ pet }); setMessage(''); };
  const saveForm = async (values, id) => {
    await save(values, id);
    if (!id) {
      setQuery('');
      setSpecies('');
      setStatusFilter('ACTIVE');
      setPageSelection({ key: '', page: 1 });
    }
    setEditor(null);
    setMessage(id ? 'Đã cập nhật thông tin thú cưng.' : 'Đã thêm thú cưng vào gia đình của bạn.');
  };
  const changeStatus = async (id, nextStatus) => { await setStatus(id, nextStatus); setStatusPet(null); setMessage(nextStatus === 'ARCHIVED' ? 'Đã lưu trữ hồ sơ. Thông tin của bé vẫn được giữ lại.' : 'Đã khôi phục hồ sơ thú cưng.'); };
  const clear = () => { setQuery(''); setSpecies(''); setStatusFilter(''); };
  return <CustomerLayout><main className="customer-pets-page"><div className="profile-container">
    <section className="pet-page-hero"><div><span className="pet-eyebrow">MY LITTLE FAMILY</span><h1>Thú cưng của tôi</h1><p>Mỗi người bạn nhỏ, một hồ sơ riêng.<br />Lưu thông tin để việc chăm sóc bé luôn dễ dàng hơn.</p><button className="pet-button primary" type="button" onClick={() => openEditor()} disabled={loading || !!error}><PetIcon name="plus" />Thêm thú cưng</button></div><div className="pet-hero-art" aria-hidden="true"><span className="pet-hero-heart">♡</span><div><PetIcon width="76" height="76" /></div><span className="pet-hero-caption">Nhỏ bé, nhưng thật quan trọng.</span></div></section>
    {message && <div className="pet-alert success" role="status">{message}</div>}
    {loading ? <p className="pet-loading" role="status">Đang tải hồ sơ thú cưng…</p> : error ? <section className="pet-empty pet-panel" role="alert"><PetIcon /><h2>Không thể tải hồ sơ thú cưng</h2><p>{error}</p><button className="pet-button secondary" onClick={refresh}>Thử lại</button></section> : <>
      <section className="pet-summary-grid" aria-label="Tổng quan thú cưng">{[{ label: 'Tổng hồ sơ', count: pets.length, icon: 'paw', tone: 'peach' }, { label: 'Đang quản lý', count: pets.filter((pet) => pet.status === 'ACTIVE').length, icon: 'heart', tone: 'pink' }, { label: 'Đã lưu trữ', count: pets.filter((pet) => pet.status === 'ARCHIVED').length, icon: 'archive', tone: 'lilac' }].map((item) => <div key={item.label} role="group" aria-label={item.label}><span className={`pet-summary-icon ${item.tone}`}><PetIcon name={item.icon} /></span><div><strong>{item.count}</strong><span>{item.label}</span></div></div>)}</section>
      <section className="pet-list-section" aria-labelledby="pet-list-title"><div className="pet-list-heading"><div><h2 id="pet-list-title">Những người bạn của bạn</h2><p>{filtered.length} hồ sơ phù hợp · Chỉ hiển thị thú cưng thuộc tài khoản của bạn.</p></div><button className="pet-text-button" type="button" onClick={refresh}>Làm mới ↻</button></div>
        <div className="pet-list-filters"><label className="pet-search"><PetIcon name="search" /><input aria-label="Tìm thú cưng" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, giống hoặc mã chip…" /></label><select aria-label="Lọc loài" value={species} onChange={(event) => setSpecies(event.target.value)}><option value="">Tất cả loài</option>{Object.entries(PET_SPECIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Lọc trạng thái hồ sơ" value={status} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Tất cả hồ sơ</option>{Object.entries(PET_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        {filtered.length ? <><div className="customer-pets-grid">{filtered.slice((page - 1) * 6, page * 6).map((pet) => <PetCard key={pet.id} pet={pet} onEdit={openEditor} onStatus={(item) => { setStatusPet(item); setMessage(''); }} />)}</div><div className="pet-pagination"><span>{filtered.length} hồ sơ · Trang {page}/{pages}</span><div><button className="pet-button secondary" aria-label="Trang trước" disabled={page === 1} onClick={() => setPageSelection({ key: filterKey, page: page - 1 })}>← Trước</button><button className="pet-button secondary" aria-label="Trang sau" disabled={page === pages} onClick={() => setPageSelection({ key: filterKey, page: page + 1 })}>Sau →</button></div></div></> : <div className="pet-empty pet-panel"><div className="pet-empty-icon"><PetIcon width="44" height="44" /></div><h2>{pets.length ? 'Không tìm thấy thú cưng' : 'Gia đình nhỏ đang chờ thành viên mới'}</h2><p>{pets.length ? 'Thử thay đổi từ khóa, loài hoặc trạng thái hồ sơ.' : 'Thêm hồ sơ đầu tiên để lưu thông tin và ảnh của người bạn nhỏ.'}</p><button className="pet-button primary" onClick={() => pets.length ? clear() : openEditor()}>{pets.length ? 'Xóa bộ lọc' : 'Thêm thú cưng đầu tiên'}</button></div>}
      </section><p className="pet-storage-note"><PetIcon /><span>Thông tin được lưu cục bộ trong bản demo. Hồ sơ mẫu chỉ có ở tài khoản khách hàng mẫu; không có lịch khám hoặc hồ sơ bác sĩ được tạo giả.</span></p>
    </>}
    {editor && <PetEditor pet={editor.pet} saving={saving} onSave={saveForm} onClose={() => setEditor(null)} />}
    {statusPet && <PetStatusDialog pet={statusPet} saving={saving} onConfirm={changeStatus} onClose={() => setStatusPet(null)} />}
  </div></main></CustomerLayout>;
}
