import { Link, useParams } from 'react-router-dom';
import VeterinarianLayout from '../../layouts/VeterinarianLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import PetAvatar from '../../components/customer/PetAvatar';
import { VetState, VetStatus } from '../../components/veterinarian/VetUI';
import InsightsPagination from '../../components/admin/InsightsPagination';
import { CLINICAL_PLANS } from '../../features/examinations/clinicalPlanPolicy';
import { useVeterinarianRecords } from '../../features/examinations/useVeterinarian';
import useClinicalPlan from '../../features/examinations/useClinicalPlan';
import useReceptionFilters from '../../features/reception/useReceptionFilters';
import { normalize } from '../../features/catalog/catalogPolicy';
import { appointmentDateTime } from '../../features/appointments/appointmentPolicy';
import ClinicalPlanEditor from '../../features/examinations/components/ClinicalPlanEditor';
import VisitFlowPanel from '../../features/examinations/components/VisitFlowPanel';
import { useExamination } from '../../features/examinations/useVeterinarian';
import { ReceptionNotice } from '../../components/reception/ReceptionUI';
import { useState } from 'react';
import '../../styles/veterinarian.css';

function PlanRecords({ kind }) {
  const config = CLINICAL_PLANS[kind]; const state = useVeterinarianRecords();
  const records = (state.data || []).filter((item) => item.record);
  const filters = useReceptionFilters(records, (item, values) => normalize(`${item.record.code} ${item.pet.name} ${item.owner.fullName} ${item.appointment.code}`).includes(values.search)
    && (!values.status || item.record.status === values.status));
  return <VetState state={state}><section className="admin-panel vet-record-list"><div className="admin-panel-heading"><div><h2>Chọn hồ sơ khám</h2><p>Chỉ hồ sơ được phân công cho bạn. Ca đang khám được chỉnh sửa; ca hoàn tất chỉ xem.</p></div><Link className="admin-button secondary" to="/vet/records">Mở hồ sơ khám</Link></div>
    <div className="admin-filters"><label className="admin-search"><AdminIcon name="search" /><input aria-label="Tìm hồ sơ để chỉ định" placeholder="Mã hồ sơ, thú cưng, chủ nuôi…" value={filters.params.get('search') || ''} onChange={(event) => filters.set('search', event.target.value)} /></label>
      <select aria-label="Lọc hồ sơ chỉ định" value={filters.params.get('status') || ''} onChange={(event) => filters.set('status', event.target.value)}><option value="">Mọi trạng thái</option><option value="IN_PROGRESS">Đang khám</option><option value="COMPLETED">Đã hoàn tất</option></select><button className="admin-clear" type="button" onClick={filters.reset}>Xóa bộ lọc</button></div>
    {filters.rows.length ? <div className="vet-record-grid">{filters.rows.map(({ record, appointment, pet, owner }) => <article className="vet-record-card" key={record.id}><div className="vet-pet-heading"><PetAvatar pet={pet} /><div><small className="vet-record-code">{record.code}</small><h3>{pet.name}</h3><p>{owner.fullName}</p></div></div><div className="vet-record-meta"><VetStatus status={record.status} /><span>{appointment.code}</span></div><p className="vet-muted">Cập nhật {appointmentDateTime(record.updatedAt)}</p><div className="vet-record-actions"><Link className="admin-button primary" to={`${config.path}/${encodeURIComponent(appointment.id)}`}>{record.status === 'COMPLETED' ? 'Xem đã lưu' : config.title}<AdminIcon name="arrow" /></Link></div></article>)}</div> : <div className="admin-empty"><AdminIcon name={config.icon} width="42" height="42" /><h2>{records.length ? 'Không có hồ sơ phù hợp' : 'Chưa có hồ sơ khám'}</h2><p>{records.length ? 'Thử thay đổi bộ lọc.' : 'Lễ tân tiếp nhận và phân công ca, sau đó bác sĩ bắt đầu khám để lập hồ sơ.'}</p><Link className="admin-button secondary" to="/vet/records">Lập hồ sơ khám →</Link></div>}<InsightsPagination {...filters} /></section></VetState>;
}
function PlanDetail({ kind, appointmentId }) {
  const state = useClinicalPlan(appointmentId, kind); const config = CLINICAL_PLANS[kind]; const exam = useExamination(appointmentId); const [notice, setNotice] = useState('');
  const { record, appointment, pet, owner, catalog } = state.data || {};
  return <><Link className="reception-back" to={config.path}>← Chọn hồ sơ khác</Link><VetState state={state}>{appointment && <><div className="admin-panel vet-plan-patient"><div className="vet-pet-heading"><PetAvatar pet={pet} /><div><small>{record?.code || appointment.code}</small><h2>{pet.name}</h2><p>{owner.fullName} · {owner.phone}</p></div></div><VetStatus status={appointment.status} /><p className="reception-allergy"><strong>Dị ứng / cảnh báo do chủ cung cấp</strong><br />{pet.allergies || 'Chưa có thông tin dị ứng. Cần xác minh khi khám.'}</p><p className="vet-muted">Chẩn đoán {record?.status === 'COMPLETED' ? 'đã chốt' : 'đang soạn'}: {record?.diagnosis || 'Chưa ghi nhận.'}</p><Link className="admin-button secondary" to={`/vet/records/${encodeURIComponent(appointment.id)}`}>Mở hồ sơ lâm sàng</Link></div>
    <ReceptionNotice message={notice} />{kind === 'services' && exam.data?.record && <VisitFlowPanel appointment={exam.data.appointment} record={exam.data.record} orders={exam.data.record.orders} onNotice={setNotice} />}
    {record ? <ClinicalPlanEditor key={`${kind}:${record.id}`} kind={kind} record={record} appointment={appointment} catalog={catalog} saving={state.saving} onSave={state.save} /> : <div className="admin-empty"><h2>Chưa lập hồ sơ khám</h2><p>Bắt đầu khám trước khi kê đơn hoặc chỉ định dịch vụ.</p></div>}</>}</VetState></>;
}
export default function ClinicalPlanPage({ kind }) {
  const config = CLINICAL_PLANS[kind]; const { appointmentId } = useParams();
  return <VeterinarianLayout title={config.title}><div className="admin-page-title"><div><span className="admin-eyebrow">ĐIỀU TRỊ · BÁC SĨ THÚ Y</span><h1>{config.title}</h1><p>{config.help}</p></div><span className="vet-plan-title-icon"><AdminIcon name={config.icon} width="28" height="28" /></span></div>{appointmentId ? <PlanDetail kind={kind} appointmentId={appointmentId} /> : <PlanRecords kind={kind} />}<p className="admin-bottom-note">Demo cục bộ · Đơn thuốc chỉ chia sẻ với khách khi hồ sơ khám hoàn tất. Kê đơn không trừ kho; chỉ định chưa được tính vào hóa đơn.</p></VeterinarianLayout>;
}
