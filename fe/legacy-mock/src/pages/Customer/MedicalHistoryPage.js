import { useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { CareEmpty, CareHeading, CarePagination, CareState } from '../../components/customer/CareUI';
import { useMedicalHistory } from '../../features/appointments/useCustomerCare';
import { appointmentDateTime } from '../../features/appointments/appointmentPolicy';
import { clinicToday, normalize, validDate } from '../../features/catalog/catalogPolicy';
import '../../styles/pets.css';
import '../../styles/care.css';

export default function MedicalHistoryPage() {
  const { data, loading, error, refresh } = useMedicalHistory();
  const [query, setQuery] = useState(''); const [petId, setPetId] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [selection, setSelection] = useState({});
  const records = data || [];
  const pets = [...new Map(records.map((record) => [record.petId, record.petName])).entries()];
  const dateError = (from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to);
  const filtered = dateError ? [] : records.filter((record) => (!petId || record.petId === petId) && (!from || clinicToday(new Date(record.examinedAt)) >= from) && (!to || clinicToday(new Date(record.examinedAt)) <= to)
    && normalize(`${record.petName} ${record.doctorName} ${record.diagnosis}`).includes(normalize(query.trim())));
  const key = `${query}|${petId}|${from}|${to}`; const pages = Math.max(1, Math.ceil(filtered.length / 6)); const page = selection.key === key ? Math.min(selection.page, pages) : 1;
  const clear = () => { setQuery(''); setPetId(''); setFrom(''); setTo(''); };
  return <CustomerLayout><main className="care-page"><div className="profile-container"><CareHeading eyebrow="CHĂM SÓC ĐƯỢC GHI NHỚ" title="Lịch sử khám bệnh" action={<Link className="pet-button secondary" to="/portal/appointments">Xem lịch hẹn</Link>}>Các lần khám đã hoàn tất của thú cưng thuộc tài khoản bạn. Không hiển thị ghi chú nội bộ của bác sĩ.</CareHeading>
    <CareState loading={loading} error={error} refresh={refresh}>{!records.length ? <CareEmpty title="Chưa có lịch sử khám bệnh">Hồ sơ sẽ xuất hiện khi phòng khám hoàn tất và cung cấp kết quả khám. Yêu cầu đặt lịch không tự tạo chẩn đoán hoặc đơn thuốc.</CareEmpty> : <>
      <div className="care-history-summary"><strong>{records.length}</strong><span>lần khám đã hoàn tất</span><strong>{pets.length}</strong><span>thú cưng có hồ sơ khám</span></div>
      <div className="care-history-filters"><label className="pet-search"><input aria-label="Tìm lịch sử khám" placeholder="Tìm thú cưng, bác sĩ hoặc chẩn đoán…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Thú cưng<select aria-label="Lọc thú cưng trong lịch sử" value={petId} onChange={(event) => setPetId(event.target.value)}><option value="">Tất cả thú cưng</option>{pets.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>Từ ngày<input type="date" aria-label="Lịch sử từ ngày" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Đến ngày<input type="date" aria-label="Lịch sử đến ngày" value={to} onChange={(event) => setTo(event.target.value)} /></label><button type="button" className="pet-text-button" onClick={clear}>Xóa bộ lọc</button><button type="button" className="pet-text-button" onClick={refresh}>Làm mới</button></div>
      {dateError ? <p className="pet-alert error" role="alert">Khoảng ngày không hợp lệ. Ngày bắt đầu không được sau ngày kết thúc.</p> : !filtered.length ? <CareEmpty title="Không tìm thấy lần khám phù hợp" booking={false}>Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</CareEmpty> : <><div className="care-history-list">{filtered.slice((page - 1) * 6, page * 6).map((record) => <article key={record.id} className="pet-panel care-history-card"><span className="care-status green">Đã hoàn tất</span><p className="care-note">{appointmentDateTime(record.examinedAt)}</p><h2>{record.petName}</h2><p>Bác sĩ: {record.doctorName}</p><h3>Chẩn đoán</h3><p className="care-diagnosis">{record.diagnosis}</p><div className="care-actions"><Link className="pet-button secondary" to={`/portal/medical-history/${record.id}`}>Xem kết quả khám</Link><Link className="pet-text-button" to={`/portal/booking?petId=${encodeURIComponent(record.petId)}`}>Đặt lịch tái khám</Link></div></article>)}</div><CarePagination page={page} pages={pages} total={filtered.length} onChange={(next) => setSelection({ key, page: next })} /></>}
    </>}</CareState><p className="care-note">Dữ liệu hiện là adapter cục bộ. Không tự tạo hồ sơ y tế mẫu cho khách hàng; kết nối với hệ thống bác sĩ sẽ được thực hiện ở chức năng riêng.</p>
  </div></main></CustomerLayout>;
}
