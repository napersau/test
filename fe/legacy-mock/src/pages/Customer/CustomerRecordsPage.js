import { useState } from 'react';
import CustomerLayout from '../../layouts/CustomerLayout';
import { CareEmpty, CareHeading, CarePagination, CareState } from '../../components/customer/CareUI';
import CustomerRecordCard from '../../components/customer/CustomerRecordCard';
import useCustomerData from '../../features/customer/useCustomerData';
import { CUSTOMER_RECORD_CONFIG } from '../../features/customerRecords/recordConfig';
import { money, normalize, validDate } from '../../features/catalog/catalogPolicy';
import '../../styles/pets.css';
import '../../styles/care.css';
import '../../styles/customer-records.css';

export default function CustomerRecordsPage({ kind }) {
  const config = CUSTOMER_RECORD_CONFIG[kind]; const { data, loading, error, refresh } = useCustomerData(config.reader, config.events);
  const [query, setQuery] = useState(''); const [petId, setPetId] = useState(''); const [status, setStatus] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [selection, setSelection] = useState({});
  const records = data || []; const pets = [...new Map(records.map((record) => [record.petId, record.petName])).entries()];
  const invalidDates = (from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to);
  const filtered = invalidDates ? [] : records.filter((record) => (!petId || record.petId === petId) && (!status || record.status === status)
    && (!from || record.date >= from) && (!to || record.date <= to) && normalize(config.search(record)).includes(normalize(query.trim())));
  const key = `${query}|${petId}|${status}|${from}|${to}`; const pages = Math.max(1, Math.ceil(filtered.length / 6)); const page = selection.key === key ? Math.min(selection.page, pages) : 1;
  const clear = () => { setQuery(''); setPetId(''); setStatus(''); setFrom(''); setTo(''); };
  const due = records.filter((record) => ['OVERDUE', 'DUE', 'UPCOMING'].includes(record.status)).length;
  const balance = records.reduce((sum, record) => sum + (record.remaining || 0), 0);
  return <CustomerLayout><main className={`care-page customer-records-page records-${kind}`}><div className="profile-container"><CareHeading eyebrow={config.eyebrow} title={config.title}>{config.description}</CareHeading>
    <CareState loading={loading} error={error} refresh={refresh}>{!records.length ? <CareEmpty title={config.emptyTitle} booking={kind === 'vaccinations'}>{config.emptyText}</CareEmpty> : <>
      <div className="record-summary-grid"><div><span>{kind === 'prescriptions' ? 'Đơn theo lần khám' : kind === 'vaccinations' ? 'Lịch / mũi tiêm' : 'Hóa đơn'}</span><strong>{records.length}</strong></div><div><span>Thú cưng có dữ liệu</span><strong>{pets.length}</strong></div><div><span>{kind === 'vaccinations' ? 'Cần theo dõi · trong 30 ngày / quá ngày' : kind === 'prescriptions' ? 'Dòng thuốc được kê' : 'Còn phải thanh toán'}</span><strong>{kind === 'vaccinations' ? due : kind === 'prescriptions' ? records.reduce((sum, record) => sum + record.items.length, 0) : Number.isSafeInteger(balance) ? money(balance) : 'Xem từng hóa đơn'}</strong></div></div>
      <div className="record-filters"><label className="pet-search"><input aria-label={config.searchLabel} placeholder={config.searchHint} value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Thú cưng<select aria-label="Lọc thú cưng" value={petId} onChange={(event) => setPetId(event.target.value)}><option value="">Tất cả thú cưng</option>{pets.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>{config.statuses && <label>Trạng thái<select aria-label="Lọc trạng thái" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(config.statuses).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label>}<label>Từ ngày<input aria-label="Từ ngày" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Đến ngày<input aria-label="Đến ngày" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><button type="button" className="pet-text-button" onClick={clear}>Xóa bộ lọc</button><button type="button" className="pet-text-button" onClick={refresh}>Làm mới</button></div>
      {kind === 'vaccinations' && <p className="care-note">Lọc ngày dự kiến đối với lịch chưa tiêm; lọc ngày đã tiêm đối với mũi hoàn tất. Ngày dự kiến do phòng khám cung cấp, không tự tạo lịch y tế.</p>}
      {invalidDates ? <p className="pet-alert error" role="alert">Khoảng ngày không hợp lệ. Ngày bắt đầu không được sau ngày kết thúc.</p> : !filtered.length ? <CareEmpty title="Không có dữ liệu phù hợp" booking={false}>Thử đổi từ khóa, thú cưng hoặc bộ lọc.</CareEmpty> : <><div className="customer-record-grid">{filtered.slice((page - 1) * 6, page * 6).map((record) => <CustomerRecordCard key={record.id} kind={kind} record={record} />)}</div><CarePagination page={page} pages={pages} total={filtered.length} onChange={(next) => setSelection({ key, page: next })} /></>}
    </>}</CareState><p className="care-note record-source-note">Dữ liệu chỉ đọc từ nguồn demo cục bộ theo tài khoản của bạn. Các mũi tiêm, đơn thuốc và hóa đơn không được tạo giả khi đặt lịch hoặc thêm thú cưng.</p>
  </div></main></CustomerLayout>;
}
