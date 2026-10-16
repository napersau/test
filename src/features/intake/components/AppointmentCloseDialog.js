import { useRef, useState } from 'react';
import Modal from '../../../components/common/Modal';

const COPY = {
  NO_SHOW: { title: 'Đánh dấu vắng mặt (No-Show)', intro: 'Lịch hẹn chuyển sang "Không đến khám" và được tính vào lịch sử vắng mặt của khách. Hồ sơ vẫn được giữ lại.', keep: 'Giữ lịch hẹn', label: 'Lý do / kết quả liên hệ *' },
  REJECT: { title: 'Từ chối lịch hẹn', intro: 'Khung giờ được trả lại ngay và khách nhận thông báo kèm lý do. Hồ sơ vẫn được giữ lại.', keep: 'Giữ yêu cầu', label: 'Lý do từ chối *' },
  CANCEL: { title: 'Hủy lịch hẹn', intro: 'Khung giờ được trả lại ngay. Hệ thống ghi nhận lý do, người hủy (lễ tân) và thời điểm hủy.', keep: 'Giữ lịch hẹn', label: 'Lý do hủy *' },
  INTAKE: { title: 'Hủy tiếp nhận', intro: 'Ca đang chờ khám sẽ bị hủy khỏi hàng đợi. Hệ thống ghi nhận lý do (ví dụ khách bỏ về).', keep: 'Giữ trong hàng đợi', label: 'Lý do hủy tiếp nhận *' },
};
export default function AppointmentCloseDialog({ record, status, saving, onConfirm, onClose }) {
  const kind = status === 'NO_SHOW' ? 'NO_SHOW' : record.status === 'PENDING' ? 'REJECT' : record.status === 'CHECKED_IN' ? 'INTAKE' : 'CANCEL'; const copy = COPY[kind];
  const [reason, setReason] = useState(''); const [error, setError] = useState(''); const inputRef = useRef(null);
  return <Modal title={`${copy.title} ${record.code}`} id="appointment-close-title" onClose={onClose} busy={saving} initialFocusRef={inputRef}><form className="admin-editor" onSubmit={async (event) => { event.preventDefault(); if (saving) return; try { await onConfirm(record.id, status, reason, record.version); } catch (problem) { setError(problem.message); } }}>
    <p>{copy.intro}</p><label className="admin-field" htmlFor="staff-close-reason"><span>{copy.label}</span><textarea id="staff-close-reason" ref={inputRef} maxLength={500} value={reason} onChange={(event) => { setReason(event.target.value); setError(''); }} required /></label>{error && <p className="admin-alert error" role="alert">{error}</p>}<div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={onClose}>{copy.keep}</button><button className="admin-button primary" type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Xác nhận thao tác'}</button></div>
  </form></Modal>;
}
