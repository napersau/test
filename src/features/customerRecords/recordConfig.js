import { PETS_CHANGED } from '../pets/petsRepository';
import { MEDICAL_RECORDS_CHANGED } from '../appointments/appointmentPolicy';
import { listVaccinations } from '../vaccinations/vaccinationsRepository';
import { VACCINATIONS_CHANGED, VACCINATION_STATUSES } from '../vaccinations/vaccinationPolicy';
import { listPrescriptions } from '../prescriptions/prescriptionsRepository';
import { listInvoices } from '../invoices/invoicesRepository';
import { INVOICES_CHANGED, INVOICE_STATUSES } from '../invoices/invoicePolicy';

export const CUSTOMER_RECORD_CONFIG = {
  vaccinations: { title: 'Theo dõi lịch tiêm phòng', eyebrow: 'LỊCH CHĂM SÓC DÀI LÂU', route: '/portal/vaccinations', reader: listVaccinations, events: [PETS_CHANGED, VACCINATIONS_CHANGED], statuses: VACCINATION_STATUSES,
    description: 'Theo dõi ngày do phòng khám đề nghị và những mũi đã được ghi nhận. Không tự tính phác đồ tiêm theo loài hoặc độ tuổi.',
    emptyTitle: 'Chưa có lịch tiêm phòng', emptyText: 'Lịch dự kiến và mũi đã tiêm sẽ xuất hiện khi phòng khám cung cấp dữ liệu. Khách hàng không tự xác nhận đã tiêm.', searchLabel: 'Tìm lịch tiêm phòng', searchHint: 'Tìm tên thú cưng, vaccine, mũi tiêm…',
    search: (item) => `${item.petName} ${item.vaccineName} ${item.doseLabel}` },
  prescriptions: { title: 'Đơn thuốc của tôi', eyebrow: 'DẶN DÒ ĐƯỢC LƯU GIỮ', route: '/portal/prescriptions', reader: listPrescriptions, events: [PETS_CHANGED, MEDICAL_RECORDS_CHANGED], statuses: null,
    description: 'Xem thuốc và hướng dẫn được cung cấp trong hồ sơ khám đã hoàn tất của thú cưng. Đơn kê không xác nhận thuốc đã được cấp hoặc thanh toán.',
    emptyTitle: 'Chưa có đơn thuốc', emptyText: 'Đơn thuốc sẽ hiển thị khi hồ sơ khám đã hoàn tất có danh sách thuốc do bác sĩ cung cấp.', searchLabel: 'Tìm đơn thuốc', searchHint: 'Tìm thú cưng, bác sĩ, tên thuốc…',
    search: (item) => `${item.petName} ${item.doctorName} ${item.items.map((medicine) => medicine.medicineName).join(' ')}` },
  invoices: { title: 'Hóa đơn của tôi', eyebrow: 'CHI PHÍ RÕ RÀNG', route: '/portal/invoices', reader: listInvoices, events: [PETS_CHANGED, INVOICES_CHANGED], statuses: INVOICE_STATUSES,
    description: 'Xem chi tiết dịch vụ đã hoàn tất, thuốc đã cấp và các khoản thanh toán được ghi nhận. Trang này không thực hiện thu tiền.',
    emptyTitle: 'Chưa có hóa đơn', emptyText: 'Hóa đơn sẽ xuất hiện khi phòng khám phát hành. Đặt lịch và kê đơn không tự tạo hóa đơn.', searchLabel: 'Tìm hóa đơn', searchHint: 'Tìm mã hóa đơn hoặc tên thú cưng…',
    search: (item) => `${item.code} ${item.petName}` },
};
