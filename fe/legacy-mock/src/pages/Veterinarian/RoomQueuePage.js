import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import VeterinarianLayout from '../../layouts/VeterinarianLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import { VetState } from '../../components/veterinarian/VetUI';
import { ReceptionNotice } from '../../components/reception/ReceptionUI';
import { useRoomActions, useRoomQueue } from '../../features/clinicalRooms/useRooms';
import { CALL_LIMIT, CROSS_BADGES, ROOM_TABS, ROOM_TYPES } from '../../features/clinicalRooms/roomsPolicy';
import { PET_SPECIES } from '../../features/pets/petPolicy';
import { appointmentDateTime } from '../../features/appointments/appointmentPolicy';
import { waitMinutes } from '../../features/intake/intakePolicy';
import '../../styles/veterinarian.css';
import '../../styles/intake.css';

// Hàng đợi một phòng chuyên môn (Xét nghiệm hoặc CĐHA): hai phòng chạy độc lập, cấp cứu lên đầu, còn lại FIFO theo giờ gửi chỉ định.
export default function RoomQueuePage({ room }) {
  const config = ROOM_TYPES[room]; const state = useRoomQueue(room); const actions = useRoomActions(); const [params, setParams] = useSearchParams();
  const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const tab = Object.keys(ROOM_TABS).includes(params.get('tab')) ? params.get('tab') : 'QUEUE'; const rows = state.data || []; const visible = rows.filter((entry) => entry.tab === tab);
  const act = async (writer, message) => { setError(''); try { await writer(); setNotice(message); } catch (problem) { setError(problem.message); } };
  return <VeterinarianLayout title={config.label}>
    <div className="admin-page-title"><div><span className="admin-eyebrow">PHÒNG CHUYÊN MÔN · {config.short.toUpperCase()}</span><h1>Hàng đợi {config.label}</h1><p>{room === 'LABORATORY' ? 'Gọi bệnh nhân vào lấy mẫu, nhập chỉ số đo được và hệ thống tự đối chiếu khoảng tham chiếu theo loài.' : 'Gọi bệnh nhân vào chụp / siêu âm, nhập mô tả, kết luận và tải ảnh. Ca chưa sang (đang lấy máu bên Lab) được tạm hoãn để không treo phòng máy.'}</p></div>
      <button type="button" className="admin-button secondary" onClick={state.refresh}><AdminIcon name="refresh" />Làm mới</button></div>
    <ReceptionNotice message={notice} />{error && <p className="admin-alert error" role="alert">{error}</p>}
    <VetState state={state}>
      <nav className="intake-tabs" aria-label={`Nhóm ca ${config.short}`}>{Object.entries(ROOM_TABS).map(([key, label]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => setParams({ tab: key }, { replace: true })}>{label}<span>{rows.filter((entry) => entry.tab === key).length}</span></button>)}</nav>
      {visible.length ? <section className="admin-panel"><div className="admin-table-scroll" role="region" tabIndex={0} aria-label={`Bảng ${ROOM_TABS[tab].toLowerCase()}`}><table className="admin-users-table"><thead><tr><th scope="col">STT</th><th scope="col">Bệnh nhân</th><th scope="col">Dịch vụ</th><th scope="col">Giờ chỉ định</th><th scope="col">Tình trạng</th><th scope="col">Thao tác</th></tr></thead><tbody>
        {visible.map((entry, index) => { const href = `${config.path}/${encodeURIComponent(entry.key)}`;
          return <tr key={entry.key} className={`${entry.emergency ? 'room-row-emergency' : ''} ${entry.presentAgain ? 'room-present' : ''}`}>
            <td>{index + 1}</td>
            <td><div className="reception-table-contact"><strong>{entry.petName}</strong><span>{PET_SPECIES[entry.species] || '—'} · {entry.ownerName}</span><span>{entry.appointmentCode}</span>{entry.emergency && <span className="reception-badge emergency">Cấp cứu</span>}{entry.priorityNext && <span className="reception-badge intake-priority">Ưu tiên kế tiếp</span>}</div></td>
            <td><div className="reception-table-contact"><strong>{entry.orderName}</strong><span>Bác sĩ chỉ định: {entry.doctorName}</span>{entry.notes && <span>{entry.notes}</span>}</div></td>
            <td>{entry.tab === 'DONE' ? `Xong ${appointmentDateTime(entry.completedAt)}` : <>{appointmentDateTime(entry.sentAt)}<br /><small>Chờ {waitMinutes(entry.sentAt)} phút</small></>}</td>
            <td><div className="reception-table-contact">
              {entry.tab === 'QUEUE' && <span>Đã gọi {entry.callCount}/{CALL_LIMIT} lần</span>}
              {entry.badge && <span className={`room-badge ${CROSS_BADGES[entry.badge].tone}`}>{CROSS_BADGES[entry.badge].icon} {CROSS_BADGES[entry.badge].label}</span>}
              {entry.tab === 'POSTPONED' && <span>{entry.missed ? 'Vắng mặt khi gọi số' : 'Tạm hoãn: chưa sang phòng'}</span>}
              {entry.presentAgain && <span className="room-badge green">🟢 Khách đã có mặt trở lại</span>}
              {entry.tab === 'IN_PROGRESS' && <span>{config.startedLabel}{room === 'LABORATORY' && (entry.sampleTaken ? ' · đã lấy mẫu' : ' · đang lấy mẫu')}</span>}
              {entry.tab === 'DONE' && <span>{entry.status === 'CANCELLED' ? `Đã hủy: ${entry.cancelReason}` : 'Đã có kết quả'}</span>}</div></td>
            <td><div className="admin-row-actions">
              {entry.tab === 'QUEUE' && <>
                <button type="button" aria-label={`Mời vào phòng ${entry.petName}`} disabled={actions.saving || entry.callCount >= CALL_LIMIT} onClick={() => act(() => actions.call(entry.key), `Đã gọi ${entry.petName} (lần ${entry.callCount + 1}/${CALL_LIMIT}).`)}>Mời vào phòng</button>
                <button type="button" aria-label={`${config.start} ${entry.petName}`} disabled={actions.saving} onClick={() => act(() => actions.start(entry.key), `Đã bắt đầu ${entry.orderName} cho ${entry.petName}.`)}>{config.start}</button>
                <button type="button" aria-label={`Báo vắng mặt ${entry.petName}`} disabled={actions.saving || entry.callCount < CALL_LIMIT} onClick={() => act(() => actions.missed(entry.key), `Đã báo vắng mặt, ${entry.petName} chuyển sang tab ca tạm hoãn. Gọi ca kế tiếp.`)}>Báo vắng mặt / Gọi ca tiếp</button>
                {room === 'IMAGING' && <button type="button" aria-label={`Tạm hoãn ${entry.petName}`} disabled={actions.saving} onClick={() => act(() => actions.postpone(entry.key), `Đã tạm hoãn ${entry.petName} (dịch vụ giữ nguyên chờ thực hiện). Gọi ca kế tiếp.`)}>Tạm hoãn / Gọi ca tiếp</button>}
              </>}
              {entry.tab === 'POSTPONED' && <>
                {entry.missed && !entry.presentAgain && <button type="button" aria-label={`Khách đã có mặt ${entry.petName}`} disabled={actions.saving} onClick={() => act(() => actions.present(entry.key), `${entry.petName}: khách đã có mặt trở lại.`)}>Khách đã có mặt</button>}
                <button type="button" aria-label={`Gọi lại vào phòng ${entry.petName}`} disabled={actions.saving || (entry.missed && !entry.presentAgain)} onClick={() => act(() => actions.recall(entry.key), `Đã gọi lại ${entry.petName}; ca được ghim lên đầu hàng đợi.`)}>Gọi lại vào phòng</button>
              </>}
              {entry.tab === 'IN_PROGRESS' && <>
                {room === 'LABORATORY' && !entry.sampleTaken && <button type="button" aria-label={`Đã lấy mẫu xong ${entry.petName}`} disabled={actions.saving} onClick={() => act(() => actions.sampled(entry.key), `Đã lấy mẫu của ${entry.petName}; phòng CĐHA thấy huy hiệu sẵn sàng chụp.`)}>Đã lấy mẫu xong</button>}
                <Link to={href}>Nhập kết quả</Link></>}
              {entry.tab !== 'DONE' && <Link to={href} aria-label={`Chi tiết ${entry.petName}`}>Chi tiết</Link>}
              {entry.tab === 'DONE' && entry.status === 'COMPLETED' && <Link to={href}>Xem kết quả</Link>}
            </div></td></tr>; })}</tbody></table></div></section>
        : <div className="admin-empty"><AdminIcon name={config.icon} width="40" height="40" /><h2>{tab === 'QUEUE' ? `Hàng đợi ${config.short} đang trống` : `Không có ca trong mục "${ROOM_TABS[tab]}"`}</h2><p>Chỉ định xuất hiện khi bác sĩ xác nhận gửi sang phòng chuyên môn.</p></div>}
      <p className="admin-bottom-note"><AdminIcon name="shield" />Khi phát loa gọi số, dịch vụ vẫn giữ trạng thái chờ. Sau {CALL_LIMIT} lần gọi (cách nhau 60 giây) mà khách chưa vào phòng mới báo vắng mặt. Hai phòng hoạt động độc lập.</p>
    </VetState>
  </VeterinarianLayout>;
}

