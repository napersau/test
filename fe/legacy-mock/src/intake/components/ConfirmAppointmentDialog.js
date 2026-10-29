import { useRef, useState } from 'react';
import Modal from '../../../components/common/Modal';
import { ReceptionFacts } from '../../../components/reception/ReceptionUI';
import { appointmentDateTime } from '../../appointments/appointmentPolicy';
import { FASTING_ADVICE } from '../intakePolicy';

// Lễ tân gọi xác nhận khách, dặn dò chuyên môn (ví dụ nhịn ăn trước xét nghiệm máu) rồi mới bấm "Xác nhận lịch hẹn".
export default function ConfirmAppointmentDialog({ record, owner, saving, onConfirm, onClose }) {
  const [fasting, setFasting] = useState(false); const [extra, setExtra] = useState(''); const [error, setError] = useState(''); const firstRef = useRef(null);
  const advice = [fasting ? FASTING_ADVICE : '', extra.trim()].filter(Boolean).join(' ');
  return <Modal title={`Xác nhận lịch hẹn ${record.code}`} id="appointment-confirm-title" className="intake-editor-modal" onClose={onClose} busy={saving} initialFocusRef={firstRef}>
    <form className="admin-editor" onSubmit={async (event) => { event.preventDefault(); if (saving) return; try { await onConfirm(record.id, { advice, expectedVersion: record.version }); } catch (problem) { setError(problem.message); } }}>
      <p>Gọi điện xác nhận tình trạng thú cưng với khách, dặn dò lưu ý rồi xác nhận. Khách nhận thông báo xác nhận trong tài khoản.</p>
      <div className="intake-summary"><ReceptionFacts entries={[['Khách hàng', owner ? `${owner.fullName} · ${owner.phone}` : 'Không tìm thấy hồ sơ'], ['Thú cưng', record.petName], ['Giờ hẹn', appointmentDateTime(record.startsAt)], ['Triệu chứng', record.reason], ['Lần liên hệ không thành', record.contactAttempts ? `${record.contactAttempts} · ${record.contactNote}` : '']]} /></div>
      <fieldset disabled={saving}><legend className="pet-sr-only">Lời dặn gửi khách</legend>
        <label className="intake-ack"><input ref={firstRef} type="checkbox" checked={fasting} onChange={(event) => setFasting(event.target.checked)} />{FASTING_ADVICE}</label>
        <label className="admin-field" htmlFor="confirm-advice"><span>Lời dặn khác (không bắt buộc)</span><textarea id="confirm-advice" rows={2} maxLength={200} value={extra} onChange={(event) => setExtra(event.target.value)} /></label>
      </fieldset>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={onClose}>Đóng</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Xác nhận lịch hẹn'}</button></div>
    </form>
  </Modal>;
}
