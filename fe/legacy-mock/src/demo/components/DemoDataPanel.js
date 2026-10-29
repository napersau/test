import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import Modal from '../../../components/common/Modal';
import useCustomerData from '../../customer/useCustomerData';
import { getDemoStatus, loadDemoDataset, extendDemoDataset, refreshDemoDataset } from '../demoRepository';
import { DEMO_ACCOUNTS, DEMO_OWN_ACCOUNTS, DEMO_CHANGED, DEMO_NOTICE, DEMO_PASSWORD } from '../demoConfig';
const EVENTS = [DEMO_CHANGED];
export default function DemoDataPanel() {
  const { user } = useAuth(); const { data: marker, error, loading, refresh } = useCustomerData(getDemoStatus, EVENTS);
  const [confirm, setConfirm] = useState(false); const [ack, setAck] = useState(false); const [busy, setBusy] = useState(false); const [problem, setProblem] = useState(''); const [message, setMessage] = useState('');
  const [extending, setExtending] = useState(false); const [refreshing, setRefreshing] = useState(false);
  const load = async () => {
    if (!ack || busy) return; setBusy(true); setProblem('');
    // Yield so the loading state paints before the synchronous local adapter commits.
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    try { const result = refreshing ? refreshDemoDataset(user.id, new Date(), { adoptBaseAccounts: true }) : extending ? extendDemoDataset(user.id) : loadDemoDataset(user.id, new Date(), { adoptBaseAccounts: true }); setMessage(result.alreadyLoaded ? 'Bộ dữ liệu đã được nạp; không tạo thêm bản trùng.' : refreshing ? 'Đã làm mới dữ liệu demo theo bản mới nhất: lịch hẹn, hóa đơn, thanh toán, phát thuốc, hàng chờ bác sĩ. Dữ liệu thật của bạn không bị đụng tới.' : extending ? 'Đã bổ sung V2: hồ sơ khám đa dạng, hóa đơn/thuốc đã cấp mẫu, thông báo và hồ sơ nhân sự. Các dữ liệu cũ giữ nguyên.' : 'Đã nạp dữ liệu demo cho 4 vai trò. Bạn có thể bổ sung V2 bên dưới.'); setConfirm(false); refresh(); }
    catch (issue) { setProblem(issue.message); }
    finally { setBusy(false); }
  };
  return <section className="admin-panel demo-data-panel" aria-labelledby="demo-data-title">
    <div className="admin-panel-heading"><div><h2 id="demo-data-title">Dữ liệu demo liên kết</h2><p>Thử trực quan 4 vai trò với lịch hẹn, khám bệnh, đơn thuốc, lịch tiêm và hóa đơn mẫu.</p></div><span className="admin-badge blue">Chỉ kiểm thử</span></div>
    <p className="admin-alert">{DEMO_NOTICE} Chỉ thêm hồ sơ mẫu riêng, không sửa dữ liệu đã nhập. Mỗi phiên bản nạp một lần cho trình duyệt này; không tự nạp lại khi tải trang.</p>
    {loading ? <p role="status">Đang kiểm tra bộ demo…</p> : error ? <div className="admin-alert error" role="alert">{error}<button type="button" onClick={refresh}>Thử lại</button></div> : <>
      {message && <p className="admin-alert success" role="status">{message}</p>}
      {marker ? <><p role="status">Đã nạp lúc {new Date(marker.loadedAt).toLocaleString('vi-VN')}. {marker.counts.users} tài khoản, {marker.counts.pets} thú cưng, {marker.counts.appointments} lịch hẹn, {marker.counts.visits} hồ sơ khám, {marker.counts.invoices} hóa đơn và {marker.counts.vaccinations} lịch/mũi tiêm mẫu.</p>
        {marker.revision !== 2 ? <div className="admin-alert"><p>Bổ sung các tình huống khám khác nhau, hóa đơn đủ trạng thái, nhật ký mọi nhóm thao tác và hồ sơ nhân viên/bác sĩ. Không thay các hồ sơ V1 bạn đã sửa.</p><button type="button" className="admin-button primary" onClick={() => { setExtending(true); setRefreshing(false); setAck(false); setProblem(''); setConfirm(true); }}>Bổ sung dữ liệu demo V2</button></div> : <p className="admin-alert success" role="status">Bộ bổ sung V2 đã nạp. Xem Nhân viên & bác sĩ, Báo cáo & thống kê và các hồ sơ mới trong khu vực khách hàng/bác sĩ.</p>}
        <div className="admin-alert"><p>Dữ liệu demo cũ nạp từ phiên bản trước có thể thiếu các tình huống mới (thuốc trong hóa đơn, chờ phát thuốc, ca chờ tái khám). Làm mới sẽ xóa riêng các dòng demo rồi nạp lại.</p><button type="button" className="admin-button" onClick={() => { setRefreshing(true); setExtending(false); setAck(false); setProblem(''); setConfirm(true); }}>Làm mới dữ liệu demo</button></div>
        <div className="demo-account-grid">{(marker.aliases ? DEMO_ACCOUNTS : DEMO_OWN_ACCOUNTS).map((account) => <div key={account.id}><strong>{account.role}</strong><code>{account.email}</code><span>Mật khẩu: {DEMO_PASSWORD}</span></div>)}</div>
        <p>Đăng xuất qua avatar để chuyển tài khoản. Admin vẫn dùng tài khoản hiện tại, không thay đổi mật khẩu.</p>
        <details><summary>Gợi ý luồng kiểm thử</summary><ul><li>Khách hàng: xem Milo/Luna, gửi lịch mới, mở lịch sử, lịch tiêm, đơn thuốc, hóa đơn và thông báo.</li><li>Bác sĩ: hoàn tất hồ sơ Luna đang khám trước, rồi bắt đầu ca Milo đã tiếp nhận; thử kê đơn, chỉ định và xem biểu đồ cân nặng Milo.</li><li>Lễ tân: xác nhận yêu cầu online, tiếp nhận, điều chỉnh lịch và lập hóa đơn cho các hồ sơ chưa có hóa đơn; thử thu phần tiền còn lại.</li><li>Admin: lọc tài khoản theo vai trò để quản lý nhân viên/bác sĩ; xem danh mục, lô hết hạn/tồn thấp, nhật ký và thống kê từ nguồn demo.</li></ul></details>
        <Link to="/admin/staff">Mở danh sách nhân viên / bác sĩ →</Link>
      </> : <button type="button" className="admin-button primary" onClick={() => { setExtending(false); setRefreshing(false); setAck(false); setProblem(''); setConfirm(true); }}>Nạp dữ liệu demo</button>}
    </>}
    {confirm && <Modal title={refreshing ? 'Làm mới dữ liệu demo' : extending ? 'Bổ sung dữ liệu demo V2' : 'Nạp bộ dữ liệu demo'} id="demo-confirm-title" onClose={() => setConfirm(false)} busy={busy}>
      <div className="demo-confirm-body">
      <p>{refreshing ? 'Xóa các tài khoản, thú cưng, lịch hẹn, hồ sơ, hóa đơn và thông báo thuộc bộ demo (kể cả phần bạn đã thử sửa hoặc tạo thêm trên chúng), rồi nạp lại bản mới nhất. Tài khoản và dữ liệu không thuộc bộ demo được giữ nguyên.' : extending ? 'Thêm 6 hồ sơ khám, 5 hóa đơn, lịch tiêm/tái khám và thông báo bổ sung, hồ sơ nhân sự mẫu cùng nhật ký đa dạng. Giữ nguyên tài khoản, tên/giá đã sửa và mọi hồ sơ V1.' : 'Thêm 8 khách hàng có tài khoản, 1 khách trực tiếp, 4 bác sĩ, 2 lễ tân, 12 thú cưng và dữ liệu nghiệp vụ liên kết. Có hồ sơ hoàn tất, đang khám, chờ tiếp nhận; hóa đơn chưa trả, trả một phần, đã trả, hoàn tiền và hủy.'}</p>
      <p>Ngày mẫu tính theo lúc nạp. Giữ nguyên hồ sơ/tài khoản hiện có. Không thay đổi phiên đăng nhập, không gửi thông báo hoặc thu tiền thật.</p>
      <label className="demo-confirm-check"><input type="checkbox" checked={ack} disabled={busy} onChange={(event) => setAck(event.target.checked)} /> Tôi hiểu đây là dữ liệu giả và đồng ý ghi vào bộ nhớ trình duyệt.</label>
      {problem && <p className="admin-alert error" role="alert">{problem}</p>}
      <div className="demo-dialog-actions"><button type="button" className="admin-button" disabled={busy} onClick={() => setConfirm(false)}>Hủy</button><button type="button" className="admin-button primary" disabled={!ack || busy} onClick={load}>{busy ? 'Đang nạp…' : refreshing ? 'Xác nhận làm mới' : 'Xác nhận nạp demo'}</button></div>
      </div>
    </Modal>}
  </section>;
}
