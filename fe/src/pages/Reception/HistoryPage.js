import StaffLayout from '../../layouts/StaffLayout';
import HistoryLookup from '../../components/shared/HistoryLookup';
import { PageHead } from '../../components/ui';

export default function HistoryPage() {
  return <StaffLayout area="reception" title="Tra cứu bệnh án">
    <PageHead eyebrow="BỆNH ÁN" title="Tra cứu bệnh án">Xem toàn bộ các đợt khám của một thú cưng để hỗ trợ khách hàng và chuẩn bị tiếp nhận.</PageHead>
    <HistoryLookup />
  </StaffLayout>;
}
