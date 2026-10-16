import Modal from '../../../components/common/Modal';
import { ReceptionFacts } from '../../../components/reception/ReceptionUI';

// Phiếu in nhanh (phiếu số phòng, phiếu hẹn). window.print() chỉ in nội dung hộp thoại nhờ CSS @media print trong intake.css.
export default function PrintSlipDialog({ title, heading, entries, note, onClose }) {
  return <Modal title={title} id="print-slip-title" className="print-slip-modal" onClose={onClose}>
    <div className="admin-editor">
      <div className="print-slip"><strong>PAWCARE · Phòng khám thú y</strong><h3>{heading}</h3><ReceptionFacts entries={entries} />{note && <p>{note}</p>}</div>
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" onClick={onClose}>Đóng</button><button type="button" className="admin-button primary" onClick={() => window.print()}>In phiếu</button></div>
    </div>
  </Modal>;
}
