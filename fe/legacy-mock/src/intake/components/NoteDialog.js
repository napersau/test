import { useRef, useState } from 'react';
import Modal from '../../../components/common/Modal';

// Hộp thoại ghi chú ngắn: "Liên hệ thất bại" (lịch chờ duyệt) hoặc "Khách đến muộn" (lịch hôm nay).
export default function NoteDialog({ title, intro, label, placeholder, submitLabel, record, saving, onConfirm, onClose }) {
  const [note, setNote] = useState(''); const [error, setError] = useState(''); const inputRef = useRef(null);
  return <Modal title={`${title} ${record.code}`} id="appointment-note-title" onClose={onClose} busy={saving} initialFocusRef={inputRef}>
    <form className="admin-editor" onSubmit={async (event) => { event.preventDefault(); if (saving) return; try { await onConfirm(record.id, note, record.version); } catch (problem) { setError(problem.fieldErrors?.note || problem.message); } }}>
      <p>{intro}</p>
      <label className="admin-field" htmlFor="appointment-note"><span>{label} *</span><input id="appointment-note" ref={inputRef} maxLength={300} placeholder={placeholder} value={note} onChange={(event) => { setNote(event.target.value); setError(''); }} /></label>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={onClose}>Đóng</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang lưu…' : submitLabel}</button></div>
    </form>
  </Modal>;
}
