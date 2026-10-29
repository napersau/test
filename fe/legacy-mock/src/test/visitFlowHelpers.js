const { getExamination } = require('../features/examinations/examinationRepository');
const { sendToClinicalRooms, inviteBackToRoom, listCallbackCases } = require('../features/examinations/visitFlowRepository');
const { listRoomQueue, getRoomEntry, startService, saveLabResult } = require('../features/clinicalRooms/roomsRepository');

// Đưa một lượt khám đang IN_PROGRESS có chỉ định xét nghiệm chưa gửi đi hết vòng: gửi phòng Lab → thực hiện → có kết quả → mời vào lại (giai đoạn 2).
function runLabRound(vet, appointmentId) {
  const exam = getExamination(vet, appointmentId);
  sendToClinicalRooms(vet, appointmentId, { expectedVersion: exam.record.version, expectedAppointmentVersion: exam.appointment.version });
  const entry = listRoomQueue(vet, 'LABORATORY').find((item) => item.appointmentId === appointmentId);
  startService(vet, entry.key);
  const data = getRoomEntry(vet, entry.key);
  saveLabResult(vet, entry.key, { values: Object.fromEntries(data.indicators.map((item) => [item.id, 7])), comment: '' });
  inviteBackToRoom(vet, appointmentId, listCallbackCases(vet).find((item) => item.id === appointmentId).version);
}
module.exports = { runLabRound };
