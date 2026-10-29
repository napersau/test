import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import VeterinarianLayout from '../../layouts/VeterinarianLayout';
import PetAvatar from '../../components/customer/PetAvatar';
import AdminIcon from '../../components/admin/AdminIcon';
import { VetState } from '../../components/veterinarian/VetUI';
import { ReceptionNotice } from '../../components/reception/ReceptionUI';
import { useCallbackCases, useVisitActions } from '../../features/examinations/useVisitFlow';
import { ORDER_STATES, ORDER_TONES } from '../../features/examinations/clinicalPlanPolicy';
import { appointmentDateTime } from '../../features/appointments/appointmentPolicy';
import '../../styles/veterinarian.css';

const TABS = { READY: 'Có kết quả', POSTPONED: 'Đã hoãn', WAITING: 'Đang chờ kết quả' };
const EMPTY = { READY: 'Chưa có ca nào đủ kết quả cận lâm sàng.', POSTPONED: 'Không có ca tái khám nào đang tạm hoãn.', WAITING: 'Không có ca nào đang chờ phòng Xét nghiệm / CĐHA.' };

// Ca chờ tái khám của bác sĩ: ưu tiên mời bệnh nhân đã có kết quả (FIFO), gọi lại ca đã hoãn, theo dõi ca đang chờ kết quả.
export default function CallbackPage() {
  const state = useCallbackCases(); const actions = useVisitActions(); const navigate = useNavigate(); const [params, setParams] = useSearchParams();
  const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const cases = state.data || []; const tab = Object.keys(TABS).includes(params.get('tab')) ? params.get('tab') : 'READY';
  const rows = cases.filter((item) => item.group === tab);
  const invite = async (item) => {
    setError('');
    try { await actions.invite(item.id, item.version); navigate(`/vet/examinations/${encodeURIComponent(item.id)}`); }
    catch (problem) { setError(problem.message); }
  };
  return <VeterinarianLayout title="Ca chờ tái khám">
    <div className="admin-page-title"><div><span className="admin-eyebrow">TÁI KHÁM SAU CẬN LÂM SÀNG</span><h1>Ca chờ tái khám</h1><p>Mời bệnh nhân đã có đủ kết quả vào phòng theo thứ tự có kết quả trước đứng trước. Khi còn ca có kết quả, lễ tân không phân thêm ca mới cho bạn.</p></div></div>
    <ReceptionNotice message={notice} />{error && <p className="admin-alert error" role="alert">{error}</p>}
    <VetState state={state}>
      <nav className="intake-tabs" aria-label="Nhóm ca tái khám">{Object.entries(TABS).map(([key, label]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => setParams({ tab: key }, { replace: true })}>{label}<span>{cases.filter((item) => item.group === key).length}</span></button>)}</nav>
      {rows.length ? <div className="vet-queue-grid">{rows.map((item, index) => <article className="vet-queue-card" key={item.id}>
        <div className="vet-pet-heading"><PetAvatar pet={item.pet} /><div><span className="reception-badge">{tab === 'READY' ? `Thứ tự ${index + 1}` : TABS[tab]}</span><h3>{item.petName}</h3><p>{item.owner.fullName} · {item.owner.phone}</p></div></div>
        <p className="vet-muted">{item.code}{item.roomName ? ` · ${item.roomName}` : ''}{item.resultsReadyAt ? ` · có kết quả ${appointmentDateTime(item.resultsReadyAt)}` : item.sentAt ? ` · gửi chỉ định ${appointmentDateTime(item.sentAt)}` : ''}{item.callbackCalls ? ` · đã gọi ${item.callbackCalls} lần` : ''}</p>
        <ul className="vet-flow-orders" aria-label={`Tiến độ cận lâm sàng của ${item.petName}`}>{item.orders.map((order) => <li key={order.id}><strong>{order.name}</strong><span className={`reception-badge ${ORDER_TONES[order.status]}`}>{ORDER_STATES[order.status]}</span></li>)}</ul>
        {tab === 'WAITING' && <p className="vet-muted">Tiến độ: {item.progress.done}/{item.progress.total} dịch vụ đã xong.</p>}
        <div className="vet-record-actions">
          {tab === 'READY' && <button type="button" className="admin-button primary" disabled={actions.saving} aria-label={`Mời vào phòng ${item.petName}`} onClick={() => invite(item)}>Mời vào phòng</button>}
          {tab === 'POSTPONED' && <button type="button" className="admin-button primary" disabled={actions.saving} aria-label={`Gọi lại vào phòng ${item.petName}`} onClick={() => invite(item)}>Gọi lại vào phòng (Recall)</button>}
          <Link className="admin-button secondary" to={`/vet/examinations/${encodeURIComponent(item.id)}`}>Mở hồ sơ <AdminIcon name="arrow" /></Link>
        </div></article>)}</div>
        : <div className="admin-empty"><AdminIcon name="users" width="40" height="40" /><h2>{EMPTY[tab]}</h2><p>Ca xuất hiện ở đây sau khi bạn gửi chỉ định xét nghiệm hoặc chẩn đoán hình ảnh.</p></div>}
      <button type="button" className="admin-button secondary" onClick={() => { state.refresh(); setNotice(''); setError(''); }}>Làm mới</button>
    </VetState>
  </VeterinarianLayout>;
}
