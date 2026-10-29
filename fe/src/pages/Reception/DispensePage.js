import { useState } from 'react';
import StaffLayout from '../../layouts/StaffLayout';
import { AsyncView, Badge, Button, ConfirmDialog, FormDialog, Notice, PageHead, Pager, Panel, Table, Tabs } from '../../components/ui';
import { pharmacyApi } from '../../api/endpoints';
import { useNotificationEvents } from '../../contexts/NotificationContext';
import useAsync from '../../hooks/useAsync';
import { formatDateTime, formatMoney } from '../../lib/format';
import { PAYMENT_STATUS, PRESCRIPTION_STATUS } from '../../lib/labels';

function DetailDialog({ id, onClose, onDispense, onCancel }) {
  const detail = useAsync(() => pharmacyApi.prescription(id), [id]);
  return <FormDialog title="Chi tiết đơn thuốc" onClose={onClose} onSubmit={async () => {}} submitLabel="Đóng" wide>
    <AsyncView state={detail}>{(p) => <div className="ui-stack" style={{ gap: 14 }}>
      <p className="ui-confirm-text">{p.visitCode} · {p.petName} · <Badge map={PRESCRIPTION_STATUS} value={p.status} /> {p.invoiceStatus && <Badge map={PAYMENT_STATUS} value={p.invoiceStatus} />}</p>
      {p.doctorNotes && <p className="ui-confirm-text"><strong>Lời dặn:</strong> {p.doctorNotes}</p>}
      <Table caption="Thuốc trong đơn" rowKey="id" rows={p.items} columns={[
        { title: 'Thuốc', render: (row) => <><strong>{row.medicineName}</strong><small>{row.activeIngredient}</small></> },
        { title: 'SL', render: (row) => `${row.quantity} ${row.unit}` },
        { title: 'Cách dùng', render: (row) => <>{row.dosage}, {row.frequency}, {row.durationDays} ngày{row.instructions && <small>{row.instructions}</small>}</> },
        { title: 'Thành tiền', align: 'right', render: (row) => formatMoney(row.subtotal) }]} />
      <div className="ui-actions">
        {p.status === 'PRESCRIBED' && p.invoiceStatus === 'PAID' && <Button variant="primary" onClick={() => onDispense(p)}>Phát thuốc</Button>}
        {p.status === 'PRESCRIBED' && p.invoiceStatus !== 'PAID' && <Button variant="danger" onClick={() => onCancel(p)}>Hủy đơn (khách mua ngoài)</Button>}
      </div>
      {p.status === 'PRESCRIBED' && p.invoiceStatus !== 'PAID' && <p className="ui-muted">Chỉ phát thuốc sau khi hóa đơn đã thanh toán.</p>}
    </div>}</AsyncView>
  </FormDialog>;
}

export default function DispensePage() {
  const [tab, setTab] = useState('wait');
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);
  const list = useAsync(() => pharmacyApi.prescriptions(tab === 'wait' ? { awaitingDispense: true, page, size: 20 } : { status: tab || undefined, page, size: 20 }), [tab, page]);
  useNotificationEvents(() => list.refresh(), ['PAYMENT_PENDING', 'VISIT_COMPLETED']);
  const done = (text) => { setNotice({ type: 'success', text }); setDialog(null); list.refresh(); };

  return <StaffLayout area="reception" title="Phát thuốc">
    <PageHead eyebrow="QUẦY THUỐC" title="Phát thuốc">Hàng đợi gồm các đơn đã thanh toán và chưa phát, cũ nhất trước. Khi phát, kho bị trừ nguyên tử; thiếu một loại thì cả đơn không được phát.</PageHead>
    <Notice notice={notice} onClose={() => setNotice(null)} />
    <Tabs tabs={[{ key: 'wait', label: 'Chờ phát thuốc' }, { key: 'DISPENSED', label: 'Đã phát' }, { key: 'CANCELLED', label: 'Đã hủy' }, { key: '', label: 'Tất cả' }]} value={tab} onChange={(key) => { setTab(key); setPage(0); }} />
    <Panel flush>
      <AsyncView state={list} isEmpty={(data) => data.items.length === 0} empty="Không có đơn thuốc nào trong mục này.">
        {(data) => <>
          <Table caption="Đơn thuốc" rows={data.items} columns={[
            { title: 'Đợt khám', render: (row) => <><strong>{row.visitCode || `#${row.visitId}`}</strong><small>{row.petName}</small></> },
            { title: 'Số loại', key: 'itemCount' }, { title: 'Tiền thuốc', align: 'right', render: (row) => formatMoney(row.totalAmount) },
            { title: 'Kê lúc', render: (row) => formatDateTime(row.createdAt) }, { title: 'Phát lúc', render: (row) => formatDateTime(row.dispensedAt) },
            { title: 'Trạng thái', render: (row) => <Badge map={PRESCRIPTION_STATUS} value={row.status} /> },
            { title: '', align: 'right', render: (row) => <Button className="small" onClick={() => setDialog({ type: 'detail', id: row.id })}>Chi tiết</Button> }]} />
          <Pager page={data} onChange={setPage} />
        </>}
      </AsyncView>
    </Panel>
    {dialog?.type === 'detail' && <DetailDialog id={dialog.id} onClose={() => setDialog(null)} onDispense={(p) => setDialog({ type: 'dispense', p })} onCancel={(p) => setDialog({ type: 'cancel', p })} />}
    {dialog?.type === 'dispense' && <ConfirmDialog title="Xác nhận phát thuốc" confirmLabel="Phát thuốc" onClose={() => setDialog(null)} onConfirm={async () => { await pharmacyApi.dispense(dialog.p.id); done(`Đã phát thuốc cho ${dialog.p.petName}. Ca khám ${dialog.p.visitCode} hoàn tất.`); }}>
      Trừ kho theo đơn của {dialog.p.petName} ({dialog.p.visitCode}). Không thể hoàn tác.</ConfirmDialog>}
    {dialog?.type === 'cancel' && <ConfirmDialog title="Hủy đơn thuốc" danger confirmLabel="Hủy đơn" onClose={() => setDialog(null)} onConfirm={async () => { await pharmacyApi.cancelPrescription(dialog.p.id); done('Đã hủy đơn; dòng thuốc được gỡ khỏi hóa đơn.'); }}>
      Dùng khi khách xin toa để mua thuốc ngoài. Dòng thuốc sẽ được gỡ khỏi hóa đơn chưa thanh toán và tổng tiền được tính lại.</ConfirmDialog>}
  </StaffLayout>;
}
