import { Link, useParams } from 'react-router-dom';
import ReceptionLayout from '../../layouts/ReceptionLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import { ReceptionState, ReceptionNotice, ReceptionFacts, CustomerSource, ReceptionPetCard } from '../../components/reception/ReceptionUI';
import useReception from '../../features/reception/useReception';
import useReceptionActions from '../../features/reception/useReceptionActions';
import useCustomerHistory from '../../features/reception/useCustomerHistory';
import { APPOINTMENT_STATUSES, appointmentDateTime } from '../../features/appointments/appointmentPolicy';
import { INTAKE_SOURCES, NO_SHOW_WARNING_COUNT } from '../../features/intake/intakePolicy';
import { INVOICE_STATUSES } from '../../features/invoices/invoicePolicy';
import { money } from '../../features/catalog/catalogPolicy';

export default function CustomerDetailPage() {
  const { customerId } = useParams(); const state = useReception(); const actions = useReceptionActions(state); const history = useCustomerHistory(true);
  const customer = state.customers.find((item) => item.id === customerId);
  const pets = state.pets.filter((item) => item.ownerId === customerId);
  const appointments = history.appointments.filter((item) => item.ownerId === customerId).sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const noShows = appointments.filter((item) => item.status === 'NO_SHOW');
  const debts = history.invoices.filter((item) => item.ownerId === customerId && item.remaining > 0);
  const debtTotal = debts.reduce((sum, item) => sum + item.remaining, 0);
  return <ReceptionLayout title="Hồ sơ khách hàng"><Link className="reception-back" to="/reception/customers">← Danh sách khách hàng</Link><ReceptionState state={state} missing={!customer}>
    {customer && <><div className="admin-page-title"><div><span className="admin-eyebrow">HỒ SƠ CHỦ NUÔI</span><h1>{customer.fullName}</h1><p>Thông tin liên hệ và các thú cưng đang gắn với khách hàng.</p></div><button type="button" className="admin-button primary" onClick={() => actions.openCustomer(customer)}><AdminIcon name="users" />Chỉnh sửa thông tin</button></div><ReceptionNotice message={actions.notice} />
      <section className="admin-panel reception-detail-panel"><div className="reception-section-title"><h2>Thông tin khách hàng</h2><CustomerSource customer={customer} /></div><ReceptionFacts entries={[
        ['Họ và tên', customer.fullName], ['Số điện thoại', <a href={`tel:${customer.phone}`}>{customer.phone}</a>], ['Email', customer.email], ['Địa chỉ', customer.address], ['Trạng thái tài khoản', customer.accountStatus ? customer.accountStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa bởi Admin' : 'Chưa có tài khoản đăng nhập'],
      ]} /></section>
      {noShows.length >= NO_SHOW_WARNING_COUNT && <p className="admin-alert error" role="alert">Cảnh báo: khách đã vắng mặt {noShows.length} lần. Cân nhắc gọi xác nhận kỹ trước khi giữ chỗ.</p>}
      <section className="admin-panel reception-detail-panel"><div className="reception-section-title"><h2>Công nợ</h2><span className={`reception-badge ${debtTotal ? 'intake-priority' : 'green'}`}>{debtTotal ? `Còn nợ ${money(debtTotal)}` : 'Không có công nợ'}</span></div>
        {debts.length ? <ul className="customer-history-list">{debts.map((invoice) => <li key={invoice.id}><Link to={`/reception/invoices/${encodeURIComponent(invoice.id)}`}>{invoice.code}</Link><span>{invoice.petName} · {INVOICE_STATUSES[invoice.status].label}</span><strong>{money(invoice.remaining)}</strong></li>)}</ul> : <p className="intake-field-help">Tất cả hóa đơn của khách đã được thanh toán hoặc chưa có hóa đơn còn phải thu.</p>}</section>
      <section className="admin-panel reception-detail-panel"><div className="reception-section-title"><h2>Lịch sử lịch hẹn <span>({appointments.length})</span></h2><span className="reception-badge">{noShows.length} lần vắng mặt</span></div>
        {appointments.length ? <ul className="customer-history-list">{appointments.map((item) => <li key={item.id}><strong>{item.code} · {item.petName}</strong><span>{appointmentDateTime(item.startsAt)} · {INTAKE_SOURCES[item.source] || 'Chưa có nguồn'}</span><span className="reception-badge blue">{APPOINTMENT_STATUSES[item.status].label}</span>{item.cancellationReason && <small>{item.status === 'NO_SHOW' ? 'Ghi nhận' : 'Lý do hủy'}: {item.cancellationReason}</small>}</li>)}</ul> : <p className="intake-field-help">Khách chưa có lịch hẹn nào.</p>}</section>
      <div className="reception-section-title"><div><h2>Thú cưng của khách hàng <span>({pets.length})</span></h2><p>Bao gồm hồ sơ đang quản lý và đã lưu trữ.</p></div><button type="button" className="admin-button primary" onClick={() => actions.openPet(null, customer.id)}><AdminIcon name="plus" />Thêm thú cưng</button></div>
      {pets.length ? <div className="reception-pets-grid">{pets.map((pet) => <ReceptionPetCard key={pet.id} pet={pet} owner={customer} onEdit={actions.openPet} onStatus={actions.openStatus} />)}</div> : <section className="admin-panel admin-empty"><AdminIcon name="heart" width="40" height="40" /><h2>Khách hàng chưa có thú cưng</h2><p>Thêm hồ sơ đầu tiên; chủ nuôi được liên kết sẵn với khách hàng này.</p></section>}
    </>}
  </ReceptionState>{actions.dialogs}</ReceptionLayout>;
}
