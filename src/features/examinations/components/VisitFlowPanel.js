import { useRef, useState } from 'react';
import Modal from '../../../components/common/Modal';
import { ORDER_STATES, ORDER_TONES, CLINICAL_ROOMS, isRoomService } from '../clinicalPlanPolicy';
import { VISIT_CANCEL_REASONS } from '../examinationPolicy';
import { appointmentDateTime } from '../../appointments/appointmentPolicy';
import { useVisitActions } from '../useVisitFlow';

const STAGE = {
  IN_PROGRESS: (appointment) => (appointment.phase === 2 ? 'Giai đoạn 2 · đọc kết quả, chẩn đoán xác định và kê đơn' : 'Giai đoạn 1 · khám lâm sàng và ra chỉ định'),
  WAITING_RESULTS: () => 'Đang chờ kết quả cận lâm sàng — bác sĩ được giải phóng để khám ca khác',
  RESULTS_READY: (appointment) => (appointment.callbackPostponed ? 'Đã có kết quả · khách chưa vào phòng, ca đang tạm hoãn' : 'Đã có đủ kết quả cận lâm sàng — ưu tiên mời bệnh nhân vào phòng'),
  WAITING_PAYMENT: () => 'Đã chốt chuyên môn — chờ lễ tân thu viện phí. Hồ sơ đã khóa',
  COMPLETED: () => 'Lượt khám đã hoàn tất', CANCELLED: () => 'Lượt khám đã hủy',
};

// Bảng điều khiển vòng đời Visit sau khám: gửi chỉ định cận lâm sàng, mời vào lại, tạm hoãn, hủy lượt khám, đóng ca khi khách bỏ về.
export default function VisitFlowPanel({ appointment, record, orders, onNotice }) {
  const actions = useVisitActions(); const [dialog, setDialog] = useState(null); const [error, setError] = useState(''); const [code, setCode] = useState('OWNER_REQUEST'); const [note, setNote] = useState(''); const inputRef = useRef(null);
  const roomOrders = orders.filter(isRoomService); const unsent = roomOrders.filter((order) => order.status === 'ORDERED');
  const sent = roomOrders.filter((order) => order.sentAt); const finished = sent.filter((order) => ['COMPLETED', 'CANCELLED'].includes(order.status)).length;
  const run = async (writer, message) => {
    setError('');
    try { await writer(); setDialog(null); setNote(''); if (message) onNotice(message); } catch (problem) { setError(problem.fieldErrors?.note || problem.fieldErrors?.code || problem.message); }
  };
  const canPostpone = appointment.status === 'IN_PROGRESS' && appointment.phase === 2 && record.version === appointment.inviteRecordVersion;
  const open = (name) => { setDialog(name); setError(''); };
  return <section className="admin-panel vet-flow-panel" aria-label="Tiến trình lượt khám">
    <h2>{STAGE[appointment.status]?.(appointment) || appointment.status}</h2>
    {orders.length > 0 && <ul className="vet-flow-orders" aria-label="Chỉ định dịch vụ">{orders.map((order) => <li key={order.id}><strong>{order.name}</strong><span className={`reception-badge ${ORDER_TONES[order.status]}`}>{ORDER_STATES[order.status]}</span>
      {isRoomService(order) && <span className="vet-muted">{CLINICAL_ROOMS[order.serviceType].label}</span>}{(order.sentAt || order.cancelReason) && <small>{order.sentAt ? `Gửi ${appointmentDateTime(order.sentAt)}` : ''}{order.cancelReason ? ` · ${order.cancelReason}` : ''}</small>}</li>)}</ul>}
    {sent.length > 0 && <p className="vet-muted" role="status">Tiến độ cận lâm sàng: {finished}/{sent.length} dịch vụ đã xong.</p>}
    <div className="vet-flow-actions">
      {appointment.status === 'IN_PROGRESS' && unsent.length > 0 && <button type="button" className="admin-button primary" onClick={() => open('send')}>Xác nhận chỉ định & chuyển phòng CLS</button>}
      {canPostpone && <button type="button" className="admin-button secondary" disabled={actions.saving} onClick={() => run(() => actions.postpone(appointment.id, appointment.version), 'Đã tạm hoãn ca tái khám. Bạn sẵn sàng nhận ca khác; gọi lại ở trang Ca chờ tái khám.')}>Tạm hoãn / Gọi ca tiếp (khách chưa vào phòng)</button>}
      {appointment.status === 'RESULTS_READY' && <button type="button" className="admin-button primary" disabled={actions.saving} onClick={() => run(() => actions.invite(appointment.id, appointment.version), 'Đã mời bệnh nhân vào phòng. Ca chuyển sang giai đoạn 2.')}>{appointment.callbackPostponed ? 'Gọi lại vào phòng' : 'Mời vào phòng'}</button>}
      {((appointment.status === 'IN_PROGRESS' && appointment.phase !== 2) || appointment.status === 'WAITING_RESULTS') && <button type="button" className="admin-button secondary" onClick={() => open('cancel')}>Hủy lượt khám</button>}
      {['WAITING_RESULTS', 'RESULTS_READY'].includes(appointment.status) && <button type="button" className="admin-button secondary" onClick={() => open('close')}>Đóng ca / Khách bỏ về</button>}
    </div>
    {error && !dialog && <p className="admin-alert error" role="alert">{error}</p>}
    {dialog === 'send' && <Modal title="Gửi chỉ định cận lâm sàng" id="visit-send-title" busy={actions.saving} onClose={() => setDialog(null)}><form className="admin-editor" onSubmit={(event) => { event.preventDefault(); run(() => actions.send(appointment.id, { expectedVersion: record.version, expectedAppointmentVersion: appointment.version }), 'Đã gửi chỉ định sang phòng chuyên môn. Bác sĩ được giải phóng để khám ca khác.'); }}>
      <p>Các dịch vụ sau được đẩy vào hàng đợi của phòng chuyên môn. Ca khám chuyển sang <strong>Chờ kết quả</strong> và hồ sơ khám tạm khóa chỉnh sửa; bạn trở về trạng thái sẵn sàng nhận ca khác.</p>
      <ul>{unsent.map((order) => <li key={order.id}>{order.name} → {CLINICAL_ROOMS[order.serviceType].label}</li>)}</ul>
      <p className="vet-muted">Lộ trình khuyến nghị cho chủ nuôi: lấy mẫu máu ở phòng Xét nghiệm trước, rồi sang phòng Chẩn đoán hình ảnh trong lúc máy phân tích.</p>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={actions.saving} onClick={() => setDialog(null)}>Kiểm tra lại</button><button type="submit" className="admin-button primary" disabled={actions.saving}>{actions.saving ? 'Đang gửi…' : 'Xác nhận gửi chỉ định'}</button></div></form></Modal>}
    {dialog === 'cancel' && <Modal title="Hủy lượt khám" id="visit-cancel-title" busy={actions.saving} initialFocusRef={inputRef} onClose={() => setDialog(null)}><form className="admin-editor" onSubmit={(event) => { event.preventDefault(); run(() => actions.cancel(appointment.id, { code, note, expectedVersion: appointment.version }), 'Đã hủy lượt khám. Hệ thống lưu người hủy, thời gian và lý do.'); }}>
      <p>Khách từ chối khám hoặc chuyển viện. Dịch vụ chưa thực hiện bị hủy và không tính tiền.</p>
      <label className="admin-field" htmlFor="visit-cancel-code"><span>Lý do hủy *</span><select id="visit-cancel-code" ref={inputRef} value={code} onChange={(event) => setCode(event.target.value)}>{Object.entries(VISIT_CANCEL_REASONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="admin-field" htmlFor="visit-cancel-note"><span>Ghi chú {code === 'OTHER' ? '*' : '(không bắt buộc)'}</span><textarea id="visit-cancel-note" rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={actions.saving} onClick={() => setDialog(null)}>Giữ lượt khám</button><button type="submit" className="admin-button primary" disabled={actions.saving}>{actions.saving ? 'Đang hủy…' : 'Xác nhận hủy lượt khám'}</button></div></form></Modal>}
    {dialog === 'close' && <Modal title="Đóng ca / Khách bỏ về" id="visit-close-title" busy={actions.saving} initialFocusRef={inputRef} onClose={() => setDialog(null)}><form className="admin-editor" onSubmit={(event) => { event.preventDefault(); run(() => actions.close(appointment.id, { note, expectedVersion: appointment.version }), 'Đã đóng ca. Kết quả đã làm được lưu vào bệnh án; chi phí chuyển sang hóa đơn để thu sau.'); }}>
      <p>Hồ sơ chuyên môn bị khóa, kết quả đã có được lưu vào lịch sử bệnh án. Dịch vụ chưa làm bị hủy; chi phí dịch vụ đã làm chuyển sang hóa đơn ghi nợ.</p>
      <label className="admin-field" htmlFor="visit-close-note"><span>Kết quả liên hệ khách *</span><textarea id="visit-close-note" ref={inputRef} rows={2} maxLength={500} placeholder="Đã gọi điện, khách xác nhận không quay lại" value={note} onChange={(event) => setNote(event.target.value)} /></label>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={actions.saving} onClick={() => setDialog(null)}>Chưa đóng</button><button type="submit" className="admin-button primary" disabled={actions.saving}>{actions.saving ? 'Đang đóng…' : 'Xác nhận đóng ca'}</button></div></form></Modal>}
  </section>;
}
