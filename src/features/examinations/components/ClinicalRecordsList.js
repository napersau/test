import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import VeterinarianLayout from '../../../layouts/VeterinarianLayout';
import AdminIcon from '../../../components/admin/AdminIcon';
import PetAvatar from '../../../components/customer/PetAvatar';
import Modal from '../../../components/common/Modal';
import InsightsPagination from '../../../components/admin/InsightsPagination';
import { VetState, VetStatus } from '../../../components/veterinarian/VetUI';
import useReceptionFilters from '../../reception/useReceptionFilters';
import { useVeterinarianRecords } from '../useVeterinarian';
import { DIAGNOSIS_STATES } from '../examinationPolicy';
import { clinicToday, normalize } from '../../catalog/catalogPolicy';
import { appointmentDateTime } from '../../appointments/appointmentPolicy';
import '../../../styles/veterinarian.css';

export default function ClinicalRecordsList({ kind }) {
  const diagnosis = kind === 'diagnoses'; const state = useVeterinarianRecords(); const navigate = useNavigate();
  const [create, setCreate] = useState(false); const [selected, setSelected] = useState(''); const [error, setError] = useState('');
  const rows = state.data || []; const records = rows.filter((item) => item.record); const candidates = rows.filter((item) => item.canCreate);
  const pets = [...new Map(records.map((item) => [item.pet.id, item.pet])).values()];
  const filters = useReceptionFilters(records, (item, values) => {
    const record = item.record; const text = `${record.code} ${record.id} ${item.appointment.code} ${item.pet.name} ${item.owner.fullName} ${item.owner.phone} ${diagnosis ? `${record.symptoms} ${record.diagnosis} ${record.preliminaryAssessment} ${record.diagnosisReason}` : ''}`;
    return normalize(text).includes(values.search) && (!values.pet || item.pet.id === values.pet)
      && (!values.status || (diagnosis ? record.diagnosisState : record.status) === values.status)
      && (!values.date || clinicToday(new Date(record.updatedAt)) === values.date);
  });
  const title = diagnosis ? 'Triệu chứng & chẩn đoán' : 'Lập hồ sơ khám';
  return <VeterinarianLayout title={title}><div className="admin-page-title"><div><span className="admin-eyebrow">BỆNH ÁN · BÁC SĨ THÚ Y</span><h1>{title}</h1><p>{diagnosis ? 'Ghi nhận triệu chứng, đánh giá sơ bộ và chẩn đoán trong hồ sơ khám được phân công.' : 'Lập một hồ sơ cho mỗi lượt đã tiếp nhận, tiếp tục nháp hoặc xem lại hồ sơ đã hoàn tất.'}</p></div>{diagnosis ? <Link className="admin-button secondary" to="/vet/records"><AdminIcon name="document" />Mở danh sách hồ sơ</Link> : <button type="button" className="admin-button primary" disabled={state.loading || !!state.error || !candidates.length} onClick={() => { setCreate(true); setSelected(''); setError(''); }}><AdminIcon name="plus" />Lập hồ sơ khám mới</button>}</div>
    <VetState state={state}><div className="reception-stats">{(diagnosis ? [
      ['Cần ghi chẩn đoán', records.filter((item) => item.record.status === 'IN_PROGRESS' && ['EMPTY', 'PRELIMINARY'].includes(item.record.diagnosisState)).length, 'Bác sĩ tự nhập, không gợi ý chẩn đoán tự động'],
      ['Đang soạn', records.filter((item) => item.record.diagnosisState === 'DRAFT').length, 'Chưa chia sẻ với chủ nuôi'],
      ['Hồ sơ đã chốt', records.filter((item) => item.record.status === 'COMPLETED').length, 'Chẩn đoán cuối hoặc lý do chưa xác định'],
    ] : [
      ['Hồ sơ đang khám', records.filter((item) => item.record.status === 'IN_PROGRESS').length, 'Có thể ghi nhận và lưu nháp'],
      ['Hồ sơ hoàn tất', records.filter((item) => item.record.status === 'COMPLETED').length, 'Chỉ đọc, không sửa dữ liệu đã chốt'],
      ['Ca chờ lập hồ sơ', candidates.length, 'Đã tiếp nhận, đúng bác sĩ và thú cưng'],
    ]).map(([label, value, help]) => <section className="admin-panel" key={label}><div><span>{label}</span><strong>{value}</strong><small>{help}</small></div></section>)}</div>
    {!diagnosis && <section className="admin-panel vet-record-intro"><div><h2>Lập hồ sơ từ lượt đã tiếp nhận</h2><p>{candidates.length ? `Có ${candidates.length} lượt đủ điều kiện đối chiếu. Xác nhận bắt đầu khám sẽ tạo một hồ sơ IN_PROGRESS, không tạo kết quả hoặc hóa đơn tự động.` : 'Chưa có lượt đủ điều kiện. Lễ tân cần phân công và check-in; ca đã có hồ sơ phải tiếp tục hồ sơ hiện có.'}</p></div><Link className="admin-button secondary" to="/vet/today">Mở hàng đợi →</Link></section>}
    <section className="admin-panel vet-record-list"><div className="admin-panel-heading"><div><h2>{diagnosis ? 'Theo dõi nội dung lâm sàng' : 'Danh sách hồ sơ đã lập'}</h2><p>{diagnosis ? 'Phân biệt nội dung đang soạn với chẩn đoán đã chốt; không hiển thị ghi chú nội bộ trong danh sách.' : 'Dùng chung hồ sơ của màn thực hiện khám, không tạo một nguồn bệnh án thứ hai.'}</p></div><button className="admin-button secondary" type="button" onClick={state.refresh}>Làm mới</button></div>
      <div className="admin-filters"><label className="admin-search"><AdminIcon name="search" /><input aria-label={diagnosis ? 'Tìm triệu chứng và chẩn đoán' : 'Tìm hồ sơ khám'} placeholder={diagnosis ? 'Thú cưng, triệu chứng, chẩn đoán…' : 'Mã hồ sơ, mã lịch, thú cưng, chủ nuôi…'} value={filters.params.get('search') || ''} onChange={(event) => filters.set('search', event.target.value)} /></label>
        <select aria-label="Lọc thú cưng hồ sơ" value={filters.params.get('pet') || ''} onChange={(event) => filters.set('pet', event.target.value)}><option value="">Mọi thú cưng</option>{pets.map((pet) => <option value={pet.id} key={pet.id}>{pet.name}</option>)}</select>
        <select aria-label={diagnosis ? 'Lọc tình trạng chẩn đoán' : 'Lọc trạng thái hồ sơ'} value={filters.params.get('status') || ''} onChange={(event) => filters.set('status', event.target.value)}><option value="">Mọi trạng thái</option>{Object.entries(diagnosis ? DIAGNOSIS_STATES : { IN_PROGRESS: 'Đang khám / nháp', COMPLETED: 'Đã hoàn tất' }).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
        <input type="date" className="vet-date-input" aria-label="Lọc ngày cập nhật hồ sơ" value={filters.params.get('date') || ''} onChange={(event) => filters.set('date', event.target.value)} /><button type="button" className="admin-clear" onClick={filters.reset}>Xóa bộ lọc</button>
      </div>{filters.rows.length ? <div className="vet-record-grid">{filters.rows.map(({ record, appointment, pet, owner }) => <article className="vet-record-card" key={record.id} aria-label={`Hồ sơ ${record.code}`}><div className="vet-pet-heading"><PetAvatar pet={pet} /><div><small className="vet-record-code">{record.code}</small><h3>{pet.name}</h3><p>{owner.fullName} · {owner.phone}</p></div></div><div className="vet-record-meta"><VetStatus status={record.status} /><span>{appointment.code}</span></div><p className="vet-muted">Cập nhật {appointmentDateTime(record.updatedAt)} · {appointment.roomName}</p>
        {diagnosis ? <><div className="vet-clinical-preview"><h4>Triệu chứng / bệnh sử</h4><p>{record.symptoms || 'Chưa ghi nhận triệu chứng.'}</p></div><div className="vet-clinical-preview"><h4>{DIAGNOSIS_STATES[record.diagnosisState]}</h4><p>{record.status === 'COMPLETED' ? record.diagnosis : record.undetermined ? record.diagnosisReason || 'Chưa nhập lý do chưa xác định.' : record.diagnosis || record.preliminaryAssessment || 'Chưa nhập đánh giá hoặc chẩn đoán.'}</p></div></> : <div className="vet-clinical-preview"><h4>Lý do khám</h4><p>{appointment.reason}</p></div>}
        <div className="vet-record-actions"><Link className="admin-button secondary" to={`/vet/records/${encodeURIComponent(appointment.id)}`}>Xem hồ sơ</Link><Link className="admin-button primary" to={`/vet/diagnoses/${encodeURIComponent(appointment.id)}`}>{record.status === 'COMPLETED' ? 'Xem triệu chứng & chẩn đoán' : 'Ghi triệu chứng & chẩn đoán'}</Link></div>
      </article>)}</div> : <div className="admin-empty"><AdminIcon name="document" width="42" height="42" /><h2>{records.length ? 'Không tìm thấy hồ sơ phù hợp' : diagnosis ? 'Chưa có hồ sơ để ghi triệu chứng và chẩn đoán' : 'Chưa có hồ sơ khám đã lập'}</h2><p>{records.length ? 'Thử thay đổi từ khóa hoặc bộ lọc.' : 'Lập hồ sơ từ ca đã tiếp nhận trước khi ghi nội dung lâm sàng. Không tự tạo bệnh án mẫu.'}</p>{diagnosis && <Link className="admin-button secondary" to="/vet/records">Lập hồ sơ khám →</Link>}</div>}<InsightsPagination {...filters} />
    </section><p className="admin-bottom-note">Chỉ hồ sơ được phân công cho bạn. Nháp chưa chia sẻ với khách; hồ sơ hoàn tất chỉ đọc. Dữ liệu hiện là demo cục bộ.</p></VetState>
    {create && <Modal title="Chọn lượt để lập hồ sơ khám" id="vet-create-record-title" onClose={() => setCreate(false)}><form className="admin-editor" onSubmit={(event) => { event.preventDefault(); if (!candidates.some((item) => item.appointment.id === selected)) { setError('Chọn lượt còn đủ điều kiện để lập hồ sơ.'); return; } setCreate(false); navigate(`/vet/records/${encodeURIComponent(selected)}`); }}><p>Chọn ca đã tiếp nhận để đối chiếu. Hồ sơ chỉ được tạo sau khi bạn xác nhận bắt đầu khám ở bước tiếp theo.</p><label className="admin-field" htmlFor="vet-record-appointment"><span>Lượt đã tiếp nhận *</span><select id="vet-record-appointment" value={selected} onChange={(event) => { setSelected(event.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'vet-record-create-error' : undefined}><option value="">Chọn lượt khám</option>{candidates.map((item) => <option value={item.appointment.id} key={item.appointment.id}>{item.appointment.code} · {item.pet.name} · {item.owner.fullName}</option>)}</select></label>{error && <p className="admin-alert error" role="alert" id="vet-record-create-error">{error}</p>}<div className="admin-modal-actions"><button type="button" className="admin-button secondary" onClick={() => setCreate(false)}>Hủy</button><button type="submit" className="admin-button primary">Đối chiếu lượt khám</button></div></form></Modal>}
  </VeterinarianLayout>;
}
