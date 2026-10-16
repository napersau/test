import { useRef, useState } from 'react';
import Modal from '../../../components/common/Modal';
import { ReceptionFacts } from '../../../components/reception/ReceptionUI';
import { DOCTOR_STATUSES, QUEUE_KINDS, queueKind } from '../intakePolicy';

// Chọn bác sĩ cho một ca đang chờ. Chỉ bác sĩ sẵn sàng mới chọn được; bệnh nhân vào đúng phòng cố định của bác sĩ.
export default function AssignDoctorDialog({ record, doctors, saving, onAssign, onClose }) {
  const [doctorId, setDoctorId] = useState(''); const [error, setError] = useState(''); const firstRef = useRef(null);
  const changing = !!record.assignedDoctorId;
  const reason = (doctor) => {
    if (doctor.id === record.assignedDoctorId) return 'Đang phụ trách ca này';
    if (!doctor.roomNumber) return 'Chưa gán phòng khám cố định';
    if (doctor.status.key === 'AVAILABLE_PRIORITY_CALLBACK') return `Đang ưu tiên đón ca tái khám: ${doctor.status.record.petName}`;
    if (doctor.status.key === 'BUSY') return `Đang khám ${doctor.status.record.petName} · còn khoảng ${doctor.status.estimatedMinutes} phút`;
    if (doctor.status.key === 'ASSIGNED') return `Đã nhận ca ${doctor.status.record.petName}, chờ bắt đầu`;
    return '';
  };
  return <Modal title={changing ? `Đổi bác sĩ cho ${record.petName}` : `Phân công bác sĩ cho ${record.petName}`} id="assign-doctor-title" className="intake-editor-modal" onClose={onClose} busy={saving} initialFocusRef={firstRef}>
    <form className="admin-editor" onSubmit={async (event) => { event.preventDefault(); if (saving) return; if (!doctorId) { setError('Chọn một bác sĩ đang sẵn sàng.'); return; } try { await onAssign(record.id, doctorId, record.version); } catch (problem) { setError(problem.message); } }}>
      <p>{changing ? 'Bác sĩ hiện tại chưa bấm bắt đầu khám nên vẫn có thể đổi sang bác sĩ khác đang sẵn sàng.' : 'Chọn bác sĩ đang sẵn sàng. Khách sẽ được mời vào đúng phòng khám cố định của bác sĩ.'}</p>
      <div className="intake-summary"><ReceptionFacts entries={[['Thú cưng', record.petName], ['Loại ca', QUEUE_KINDS[queueKind(record)]], ['Triệu chứng', record.reason], ['Cân nặng / thân nhiệt', record.weightKg !== '' ? `${record.weightKg} kg · ${record.temperatureC} °C` : '']]} /></div>
      <fieldset className="queue-doctor-options" disabled={saving}><legend>Bác sĩ</legend>
        {doctors.map((doctor, index) => { const blocked = reason(doctor); const status = DOCTOR_STATUSES[doctor.status.key];
          return <label key={doctor.id} className={`queue-doctor-option ${blocked ? 'blocked' : ''}`}><input ref={index === 0 ? firstRef : undefined} type="radio" name="doctor" value={doctor.id} disabled={!!blocked} checked={doctorId === doctor.id} onChange={() => { setDoctorId(doctor.id); setError(''); }} />
            <span><strong>{doctor.fullName}</strong> · {doctor.roomNumber ? `Phòng ${doctor.roomNumber}` : 'Chưa có phòng'}<small>{blocked || status.label}</small></span></label>; })}
        {!doctors.length && <p className="intake-field-help">Chưa có bác sĩ đang hoạt động.</p>}
      </fieldset>
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={onClose}>Đóng</button><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Xác nhận phân công'}</button></div>
    </form>
  </Modal>;
}
