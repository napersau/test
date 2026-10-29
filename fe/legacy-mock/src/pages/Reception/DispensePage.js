import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReceptionLayout from '../../layouts/ReceptionLayout';
import AdminIcon from '../../components/admin/AdminIcon';
import InsightsPagination from '../../components/admin/InsightsPagination';
import Modal from '../../components/common/Modal';
import { ReceptionFacts, ReceptionNotice, ReceptionState } from '../../components/reception/ReceptionUI';
import useReceptionFilters from '../../features/reception/useReceptionFilters';
import useDispense from '../../features/billing/useDispense';
import useCustomerData from '../../features/customer/useCustomerData';
import { listReceptionCustomers } from '../../features/reception/customersRepository';
import { CUSTOMERS_CHANGED } from '../../features/reception/customerProfileStorage';
import { USERS_CHANGED } from '../../features/users/usersRepository';
import { appointmentDateTime } from '../../features/appointments/appointmentPolicy';
import { normalize } from '../../features/catalog/catalogPolicy';
import '../../styles/billing.css';
import '../../styles/intake.css';

const TABS = { READY: 'Chờ phát thuốc', WAITING: 'Chờ thanh toán', DONE: 'Đã phát' };
const STATES = { READY: { label: 'Sẵn sàng phát', tone: 'green' }, WAITING_PAYMENT: { label: 'Chờ thanh toán', tone: 'blue' }, NO_INVOICE: { label: 'Chưa có hóa đơn', tone: 'blue' }, DISPENSED: { label: 'Đã phát', tone: 'green' } };
const inTab = (tab, entry) => (tab === 'READY' ? entry.state === 'READY' : tab === 'DONE' ? entry.state === 'DISPENSED' : ['WAITING_PAYMENT', 'NO_INVOICE'].includes(entry.state));
const tabOf = (value) => (Object.keys(TABS).includes(value) ? value : 'READY');
const OWNER_EVENTS = [USERS_CHANGED, CUSTOMERS_CHANGED];

function DispenseDialog({ entry, owner, saving, onDispense, onClose }) {
  const [error, setError] = useState(''); const pending = entry.lines.filter((line) => !line.dispensed); const ready = entry.state === 'READY';
  return <Modal title={`Đơn thuốc của ${entry.petName}`} id="dispense-title" className="intake-editor-modal print-slip-modal" onClose={onClose} busy={saving}>
    <div className="admin-editor">
      <div className="print-slip"><strong>PAWCARE · Phiếu hướng dẫn dùng thuốc</strong>
        <ReceptionFacts entries={[['Thú cưng', entry.petName], ['Chủ nuôi', owner ? `${owner.fullName} · ${owner.phone}` : ''], ['Bác sĩ kê đơn', entry.doctorName], ['Ngày khám', entry.examinedAt ? appointmentDateTime(entry.examinedAt) : ''], ['Hóa đơn', entry.invoiceCode ? `${entry.invoiceCode} · ${STATES[entry.state].label}` : STATES[entry.state].label]]} />
        <div className="admin-table-scroll" role="region" tabIndex={0} aria-label="Danh sách thuốc trong đơn"><table className="admin-users-table dispense-table"><thead><tr><th scope="col">Thuốc</th><th scope="col">Số lượng</th><th scope="col">Cách dùng</th><th scope="col">Tồn kho</th></tr></thead><tbody>
          {entry.lines.map((line) => <tr key={line.id}><th scope="row"><div className="reception-table-contact"><strong>{line.medicineName}</strong><span>{line.activeIngredient || 'Chưa có hoạt chất'}</span></div></th>
            <td>{line.quantity} {line.unit}</td><td><div className="reception-table-contact"><span>{[line.dosage, line.frequency, line.duration].filter(Boolean).join(' · ') || '—'}</span><span>{line.instructions}</span></div></td>
            <td>{line.dispensed ? <span className="reception-badge green">Đã phát</span> : <span className={line.stock < line.quantity ? 'intake-late' : ''}>{line.stock} {line.unit}{line.stock < line.quantity ? ' · không đủ' : ''}</span>}</td></tr>)}</tbody></table></div></div>
      {!ready && entry.state !== 'DISPENSED' && <p className="admin-alert error" role="status">{entry.state === 'NO_INVOICE' ? 'Lượt khám chưa có hóa đơn. Lập hóa đơn và thu tiền trước khi phát thuốc.' : 'Hóa đơn chưa thanh toán đủ. Chỉ phát thuốc sau khi thu tiền.'}{entry.invoiceId && <> <Link to={`/reception/invoices/${encodeURIComponent(entry.invoiceId)}`}>Mở hóa đơn →</Link></>}</p>}
      {error && <p className="admin-alert error" role="alert">{error}</p>}
      <div className="admin-modal-actions"><button type="button" className="admin-button secondary" disabled={saving} onClick={onClose}>Đóng</button><button type="button" className="admin-button secondary" onClick={() => window.print()}>In phiếu hướng dẫn</button>
        <button type="button" className="admin-button primary" disabled={saving || !ready || !pending.length} onClick={async () => { setError(''); try { await onDispense(entry); } catch (problem) { setError(problem.message); } }}>{saving ? 'Đang xuất kho…' : 'Xác nhận xuất thuốc & Hoàn tất ca khám'}</button></div>
    </div>
  </Modal>;
}

export default function DispensePage() {
  const state = useDispense(); const customers = useCustomerData(listReceptionCustomers, OWNER_EVENTS);
  const [selected, setSelected] = useState(null); const [notice, setNotice] = useState('');
  const owners = new Map((customers.data || []).map((item) => [item.id, item]));
  const filters = useReceptionFilters(state.queue, (entry, values) => inTab(tabOf(values.tab), entry)
    && normalize(`${entry.petName} ${entry.invoiceCode} ${owners.get(entry.ownerId)?.fullName || ''} ${owners.get(entry.ownerId)?.phone || ''}`).includes(values.search));
  const tab = tabOf(filters.params.get('tab')); const current = state.queue.find((entry) => entry.visitId === selected);
  return <ReceptionLayout title="Phát thuốc">
    <div className="admin-page-title"><div><span className="admin-eyebrow">QUẦY THUỐC · DEMO</span><h1>Phát thuốc</h1><p>Phát thuốc theo đơn sau khi hóa đơn đã thanh toán. Hệ thống kiểm tra tồn kho, trừ kho và ghi nhật ký xuất thuốc.</p></div><button type="button" className="admin-button secondary" onClick={state.refresh}><AdminIcon name="refresh" />Làm mới</button></div>
    <ReceptionNotice message={notice} />
    <ReceptionState state={state}>
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Đơn thuốc <span>{state.queue.length}</span></h2><p>Chỉ đơn của hồ sơ khám đã hoàn tất. Lễ tân không sửa nội dung đơn thuốc.</p></div></div>
        <nav className="intake-tabs" aria-label="Nhóm đơn thuốc">{Object.entries(TABS).map(([key, label]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => filters.set('tab', key)}>{label}<span>{state.queue.filter((entry) => inTab(key, entry)).length}</span></button>)}</nav>
        <div className="admin-filters"><label className="admin-search"><AdminIcon name="search" /><input aria-label="Tìm đơn thuốc" placeholder="Tên bé, chủ nuôi, điện thoại, mã hóa đơn…" value={filters.params.get('search') || ''} onChange={(event) => filters.set('search', event.target.value)} /></label><button type="button" className="admin-clear" onClick={() => filters.replace({ tab })}>Xóa bộ lọc</button></div>
        {filters.rows.length ? <div className="admin-table-scroll" role="region" tabIndex={0} aria-label="Bảng đơn thuốc"><table className="admin-users-table"><thead><tr><th scope="col">Thú cưng & chủ nuôi</th><th scope="col">Hóa đơn</th><th scope="col">Số thuốc</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead><tbody>{filters.rows.map((entry) => { const owner = owners.get(entry.ownerId);
          return <tr key={entry.visitId}><td><div className="reception-table-contact"><strong>{entry.petName}</strong><span>{owner?.fullName || '—'} · {owner?.phone || '—'}</span></div></td><td>{entry.invoiceCode || '—'}</td><td>{entry.lines.length} loại</td>
            <td><span className={`reception-badge ${STATES[entry.state].tone}`}>{STATES[entry.state].label}</span></td>
            <td><button type="button" className="admin-button secondary" aria-label={`Xem đơn thuốc ${entry.petName}`} onClick={() => { setSelected(entry.visitId); setNotice(''); }}>{entry.state === 'READY' ? 'Xem & phát thuốc' : 'Xem đơn'}</button></td></tr>; })}</tbody></table></div>
          : <div className="admin-empty"><AdminIcon name="medicine" width="40" height="40" /><h2>{tab === 'READY' ? 'Không có đơn thuốc chờ phát' : tab === 'DONE' ? 'Chưa có đơn thuốc đã phát' : 'Không có đơn thuốc chờ thanh toán'}</h2><p>Đơn thuốc xuất hiện sau khi bác sĩ hoàn tất hồ sơ khám có kê thuốc.</p></div>}
        <InsightsPagination {...filters} />
      </section>
      <p className="admin-bottom-note"><AdminIcon name="shield" />Xuất thuốc trừ tồn kho theo lô gần hết hạn trước. Nếu thiếu một thuốc, toàn bộ đơn không bị thay đổi.</p>
    </ReceptionState>
    {current && <DispenseDialog entry={current} owner={owners.get(current.ownerId)} saving={state.saving} onClose={() => setSelected(null)} onDispense={async (entry) => { await state.dispense(entry.visitId, entry.revision); setNotice(`Đã xuất thuốc cho ${entry.petName} và hoàn tất ca khám. Tồn kho đã được trừ.`); setSelected(null); }} />}
  </ReceptionLayout>;
}
