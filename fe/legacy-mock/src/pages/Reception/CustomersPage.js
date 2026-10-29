import { Link } from 'react-router-dom';
import ReceptionLayout from '../../layouts/ReceptionLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import InsightsPagination from '../../components/admin/InsightsPagination';
import { CustomerSource, ReceptionState, ReceptionNotice, ReceptionStats } from '../../components/reception/ReceptionUI';
import useReception from '../../features/reception/useReception';
import useReceptionActions from '../../features/reception/useReceptionActions';
import useReceptionFilters from '../../features/reception/useReceptionFilters';
import useCustomerHistory from '../../features/reception/useCustomerHistory';
import { NO_SHOW_WARNING_COUNT, countNoShows } from '../../features/intake/intakePolicy';
import { normalize } from '../../features/catalog/catalogPolicy';

function NoShowCount({ count }) {
  if (!count) return <span>0 lần</span>;
  return <span className={`reception-badge ${count >= NO_SHOW_WARNING_COUNT ? 'intake-priority' : ''}`}>{count} lần{count >= NO_SHOW_WARNING_COUNT ? ' · hay bùng lịch' : ''}</span>;
}

export default function CustomersPage() {
  const state = useReception(); const history = useCustomerHistory();
  const filters = useReceptionFilters(state.customers, (item, values) => (!values.source || item.source === values.source) && normalize(`${item.fullName} ${item.phone} ${item.email}`).includes(values.search));
  const actions = useReceptionActions(state, filters.reset);
  return <ReceptionLayout title="Thông tin khách hàng">
    <div className="admin-page-title"><div><span className="admin-eyebrow">HỒ SƠ CHỦ NUÔI</span><h1>Quản lý khách hàng</h1><p>Tra cứu thông tin liên hệ và tìm đúng thú cưng của từng khách hàng.</p></div><button type="button" className="admin-button primary" disabled={state.loading || !!state.error} onClick={() => actions.openCustomer()}><AdminIcon name="plus" />Thêm khách hàng</button></div>
    <ReceptionNotice message={actions.notice} />
    <ReceptionState state={state}>
      <ReceptionStats customers={state.customers} pets={state.pets} />
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Danh sách khách hàng <span>{state.customers.length}</span></h2><p>Hồ sơ có tài khoản và khách đến trực tiếp tại phòng khám.</p></div></div>
        <div className="admin-filters"><label className="admin-search"><AdminIcon name="search" /><input aria-label="Tìm khách hàng" placeholder="Tên, số điện thoại, email…" value={filters.params.get('search') || ''} onChange={(event) => filters.set('search', event.target.value)} /></label><select aria-label="Lọc loại khách hàng" value={filters.params.get('source') || ''} onChange={(event) => filters.set('source', event.target.value)}><option value="">Tất cả khách hàng</option><option value="ACCOUNT">Có tài khoản</option><option value="WALK_IN">Khách vãng lai</option></select><button type="button" className="admin-clear" onClick={filters.reset}>Xóa bộ lọc</button></div>
        {filters.rows.length ? <div className="admin-table-scroll" role="region" tabIndex={0} aria-label="Bảng khách hàng"><table className="admin-users-table"><thead><tr><th scope="col">Khách hàng</th><th scope="col">Thông tin liên hệ</th><th scope="col">Loại hồ sơ</th><th scope="col">Thú cưng</th><th scope="col">Vắng mặt</th><th scope="col">Thao tác</th></tr></thead><tbody>{filters.rows.map((customer) => <tr key={customer.id}>
          <td><div className="admin-user-cell"><span className="admin-user-avatar tone-blue">{customer.fullName.charAt(0)}</span><div><strong><Link to={`/reception/customers/${encodeURIComponent(customer.id)}`}>{customer.fullName}</Link></strong><small>{customer.accountStatus === 'INACTIVE' ? 'Tài khoản đã khóa · hồ sơ vẫn được giữ' : 'Hồ sơ chủ nuôi'}</small></div></div></td>
          <td><div className="reception-table-contact"><a href={`tel:${customer.phone}`}>{customer.phone}</a><span>{customer.email || 'Chưa có email'}</span></div></td><td><CustomerSource customer={customer} /></td><td>{state.pets.filter((pet) => pet.ownerId === customer.id && pet.status === 'ACTIVE').length} đang quản lý</td><td><NoShowCount count={countNoShows(history.appointments, customer.id)} /></td><td><div className="admin-row-actions"><Link to={`/reception/customers/${encodeURIComponent(customer.id)}`}>Xem hồ sơ</Link><button type="button" aria-label={`Chỉnh sửa ${customer.fullName}`} onClick={() => actions.openCustomer(customer)}>Chỉnh sửa</button></div></td>
        </tr>)}</tbody></table></div> : <div className="admin-empty"><AdminIcon name="users" width="40" height="40" /><h2>{state.customers.length ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng'}</h2><p>Tìm theo số điện thoại hoặc thêm hồ sơ khách hàng mới.</p></div>}
        <InsightsPagination {...filters} />
      </section><p className="admin-bottom-note"><AdminIcon name="shield" />Lễ tân chỉ quản lý hồ sơ; mật khẩu, vai trò và khóa tài khoản thuộc quyền Admin.</p>
    </ReceptionState>{actions.dialogs}
  </ReceptionLayout>;
}
