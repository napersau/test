import { Link } from 'react-router-dom';
import Modal from '../../../components/common/Modal';
import { ReceptionFacts } from '../../../components/reception/ReceptionUI';
import { appointmentDateTime, APPOINTMENT_STATUSES } from '../../appointments/appointmentPolicy';
import { INTAKE_PRIORITIES, INTAKE_SOURCES, waitMinutes } from '../intakePolicy';

export default function IntakeDetail({ record, owner, onClose }) {
  const waiting = record.status === 'CHECKED_IN';
  return <Modal title={`Chi tiết lịch / tiếp nhận ${record.code}`} id="intake-detail-title" className="intake-editor-modal" onClose={onClose}><div className="admin-editor">
    <span className="reception-badge blue">{APPOINTMENT_STATUSES[record.status].label}</span>
    <ReceptionFacts entries={[
      ['Khách hàng', owner ? <Link to={`/reception/customers/${encodeURIComponent(owner.id)}`} onClick={onClose}>{owner.fullName} · {owner.phone}</Link> : 'Không tìm thấy hồ sơ chủ nuôi'],
      ['Thú cưng', <Link to={`/reception/pets/${encodeURIComponent(record.petId)}`} onClick={onClose}>{record.petName}</Link>], ['Kênh', INTAKE_SOURCES[record.source] || 'Chưa có nguồn'],
      ['Dịch vụ', record.serviceName], ['Giờ hẹn', appointmentDateTime(record.startsAt)], ['Triệu chứng / lý do', record.reason], ['Lời dặn đã gửi khách', record.confirmAdvice],
      ['Liên hệ không thành', record.contactAttempts ? `${record.contactAttempts} lần · ${record.contactNote}` : ''], ['Ghi chú đến muộn', record.lateNote],
      ['Cân nặng', record.weightKg !== '' ? `${record.weightKg} kg` : ''], ['Thân nhiệt', record.temperatureC !== '' ? `${record.temperatureC} °C` : ''],
      ['Bác sĩ phụ trách', record.assignedDoctorName || (waiting ? 'Chưa phân công' : '')], ['Phòng khám', record.roomName], ['Ưu tiên', INTAKE_PRIORITIES[record.priority]],
      ['Thời gian tiếp nhận', record.checkedInAt ? appointmentDateTime(record.checkedInAt) : 'Chưa tiếp nhận'], ['Thời gian chờ', waiting ? `${waitMinutes(record.checkedInAt)} phút (ước tính)` : ''], ['Ghi chú tiếp nhận', record.intakeNote],
      ['Lý do hủy / không đến', record.cancellationReason], ['Người hủy', record.cancelledBy === 'CUSTOMER' ? 'Khách hàng' : record.cancelledBy === 'RECEPTION' ? 'Lễ tân' : ''],
    ]} /><p className="intake-disclaimer">Lễ tân chỉ điều phối và ghi nhận thông tin tiếp đón. Việc bắt đầu khám và mọi nội dung chuyên môn do bác sĩ thực hiện.</p><div className="admin-modal-actions"><button type="button" className="admin-button secondary" onClick={onClose}>Đóng</button></div>
  </div></Modal>;
}
