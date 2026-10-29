import { useState } from 'react';
import { Link } from 'react-router-dom';
import StaffLayout from '../../layouts/StaffLayout';
import { AsyncView, Badge, Input, PageHead, Pager, Panel, Table, Tabs } from '../../components/ui';
import { billingApi } from '../../api/endpoints';
import { useNotificationEvents } from '../../contexts/NotificationContext';
import useAsync from '../../hooks/useAsync';
import useDebounced from '../../hooks/useDebounced';
import usePolling from '../../hooks/usePolling';
import { formatDateTime, formatMoney } from '../../lib/format';
import { PAYMENT_STATUS } from '../../lib/labels';

const TABS = [{ key: 'PENDING', label: 'Chờ thanh toán' }, { key: 'PAID', label: 'Đã thanh toán' }, { key: 'CANCELLED', label: 'Đã hủy' }, { key: '', label: 'Tất cả' }];

export default function InvoicesPage() {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(0);
  const [code, setCode] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const search = useDebounced(code);
  const list = useAsync(() => billingApi.invoices({ status, code: search.trim() || undefined, fromDate, toDate, ascending: status === 'PENDING', page, size: 20 }), [status, search, fromDate, toDate, page]);
  useNotificationEvents(() => list.refresh(), ['PAYMENT_PENDING', 'VISIT_COMPLETED']);
  usePolling(list.refresh, 30000);
  const reset = (setter) => (event) => { setter(event.target.value); setPage(0); };
  return <StaffLayout area="reception" title="Hóa đơn & thanh toán">
    <PageHead eyebrow="THU NGÂN" title="Hóa đơn & thanh toán">Hóa đơn được lập tự động khi bác sĩ chốt ca. Mở hóa đơn để áp dụng chiết khấu, xác nhận thanh toán hoặc hủy.</PageHead>
    <Tabs tabs={TABS} value={status} onChange={(key) => { setStatus(key); setPage(0); }} />
    <div className="ui-toolbar">
      <Input aria-label="Mã hóa đơn" placeholder="Mã hóa đơn (INV-…)" value={code} onChange={reset(setCode)} />
      <Input type="date" aria-label="Từ ngày" value={fromDate} onChange={reset(setFromDate)} />
      <Input type="date" aria-label="Đến ngày" value={toDate} onChange={reset(setToDate)} />
    </div>
    <Panel flush>
      <AsyncView state={list} isEmpty={(data) => data.items.length === 0} empty="Không có hóa đơn phù hợp.">
        {(data) => <>
          <Table caption="Danh sách hóa đơn" rows={data.items} columns={[
            { title: 'Mã hóa đơn', render: (row) => <Link className="ui-link" to={`/reception/invoices/${row.id}`}><strong>{row.invoiceCode}</strong></Link> },
            { title: 'Đợt khám', render: (row) => <>{row.visitCode || `#${row.visitId}`}<small>{row.petName}</small></> },
            { title: 'Lập lúc', render: (row) => formatDateTime(row.createdAt) },
            { title: 'Thanh toán lúc', render: (row) => formatDateTime(row.paidAt) },
            { title: 'Tổng thanh toán', align: 'right', render: (row) => <strong>{formatMoney(row.finalAmount)}</strong> },
            { title: 'Trạng thái', render: (row) => <Badge map={PAYMENT_STATUS} value={row.paymentStatus} /> },
            { title: '', align: 'right', render: (row) => <Link className="ui-button small" to={`/reception/invoices/${row.id}`}>Mở</Link> }]} />
          <Pager page={data} onChange={setPage} />
        </>}
      </AsyncView>
    </Panel>
  </StaffLayout>;
}
