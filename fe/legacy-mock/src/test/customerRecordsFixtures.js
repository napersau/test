// Test/preview-only data. Never import this module from application components or repositories.
function makeCustomerRecordsFixtures(today) {
  const date = (days) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  const owner = { ownerId: 'customer-demo', petId: 'pet-bo-demo' };
  const planned = { ...owner, vaccineName: 'Vaccine fixture kiểm thử', doseLabel: 'Mũi fixture', status: 'PLANNED', doctorName: 'Bác sĩ fixture', clinicName: 'Cơ sở fixture', customerNotes: 'Lưu ý chỉ dùng kiểm thử', doctorOnlyNotes: 'PRIVATE_FIXTURE_NOTE' };
  const vaccinations = [
    { ...planned, id: 'vax-overdue', dueDate: date(-2) }, { ...planned, id: 'vax-today', dueDate: today },
    { ...planned, id: 'vax-upcoming', dueDate: date(15) }, { ...planned, id: 'vax-later', dueDate: date(40) },
    { ...planned, id: 'vax-completed', status: 'COMPLETED', dueDate: date(-10), administeredAt: `${date(-10)}T09:00:00+07:00` },
    { ...planned, id: 'vax-cancelled', status: 'CANCELLED', dueDate: date(6) },
  ];
  const visits = [{ ...owner, id: 'visit-rx-fixture', status: 'COMPLETED', examinedAt: `${date(-2)}T09:00:00+07:00`, doctorName: 'Bác sĩ fixture', diagnosis: 'Chẩn đoán fixture kiểm thử', recommendations: 'Dặn dò fixture, không phải tư vấn y tế', weight: 6.5, followUpDate: '', results: [], doctorOnlyNotes: 'PRIVATE_FIXTURE_NOTE',
    prescriptions: [{ id: 'rx-line', medicineName: 'Thuốc fixture kiểm thử', dosage: 'Liều fixture', frequency: 'Tần suất fixture', duration: 'Thời gian fixture', quantity: 2, unit: 'Viên', instructions: 'Hướng dẫn fixture', privateNotes: 'PRIVATE_FIXTURE_NOTE' }] }];
  const invoice = { ...owner, id: 'invoice-fixture', code: 'INV-FIXTURE', status: 'ISSUED', issuedAt: `${date(-2)}T10:00:00+07:00`, total: 1, privateNotes: 'PRIVATE_FIXTURE_NOTE',
    items: [
      { id: 'exam-line', type: 'SERVICE', name: 'Khám fixture', quantity: 1, unitPrice: 150000, fulfillmentStatus: 'COMPLETED', privateNotes: 'PRIVATE_FIXTURE_NOTE' },
      { id: 'medicine-line', type: 'MEDICINE', name: 'Thuốc đã cấp fixture', quantity: 2, unit: 'Viên', unitPrice: 25000, fulfillmentStatus: 'DISPENSED' },
      { id: 'cancelled-line', type: 'SERVICE', name: 'Dịch vụ hủy không tính tiền', quantity: 1, unitPrice: 999000, fulfillmentStatus: 'CANCELLED' },
      { id: 'unissued-line', type: 'MEDICINE', name: 'Thuốc đã hủy khỏi đơn không tính tiền', quantity: 10, unitPrice: 999000, fulfillmentStatus: 'CANCELLED' },
    ], payments: [{ id: 'payment-fixture', type: 'PAYMENT', status: 'COMPLETED', amount: 50000, method: 'CASH', paidAt: `${date(-2)}T11:00:00+07:00`, privateNotes: 'PRIVATE_FIXTURE_NOTE' }] };
  return { vaccinations, visits, invoices: [invoice] };
}
module.exports = { makeCustomerRecordsFixtures };
