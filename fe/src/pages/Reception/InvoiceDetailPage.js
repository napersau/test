import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StaffLayout from '../../layouts/StaffLayout';
import { AsyncView, Badge, Button, ConfirmDialog, Facts, Field, FormDialog, Input, Notice, PageHead, Panel, Table, Textarea } from '../../components/ui';
import { billingApi } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';
import useAction from '../../hooks/useAction';
import { formatDateTime, formatMoney } from '../../lib/format';
import { INVOICE_ITEM_TYPE, PAYMENT_STATUS } from '../../lib/labels';

function DiscountDialog({ invoice, onClose, onDone }) {
  const [amount, setAmount] = useState(String(invoice.discountAmount ?? 0));
  const [notes, setNotes] = useState(invoice.notes || '');
  const gross = Number(invoice.finalAmount) + Number(invoice.discountAmount);
  const submit = async () => {
    const value = Number(amount);
    if (Number.isNaN(value) || value < 0) throw new Error('Số tiền chiết khấu không hợp lệ.');
    if (value > gross) throw new Error(`Chiết khấu không được vượt tổng viện phí ${formatMoney(gross)}.`);
    await billingApi.setDiscount(invoice.id, value, notes.trim() || null);
    onDone('Đã cập nhật chiết khấu.');
  };
  return <FormDialog title="Áp dụng chiết khấu" onClose={onClose} onSubmit={submit}>
    <p className="ui-confirm-text">Tổng viện phí (đã gồm VAT): <strong>{formatMoney(gross)}</strong>. Chiết khấu tối đa bằng số này.</p>
    <Field label="Số tiền chiết khấu (VND)"><Input type="number" min="0" step="1000" value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus /></Field>
    <Field label="Ghi chú"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={2} /></Field>
  </FormDialog>;
}

function CancelDialog({ invoice, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const submit = async () => {
    if (!reason.trim()) throw new Error('Nhập lý do hủy hóa đơn.');
    await billingApi.cancelInvoice(invoice.id, reason.trim());
    onDone(`Đã hủy hóa đơn ${invoice.invoiceCode}.`);
  };
  return <FormDialog title={`Hủy hóa đơn ${invoice.invoiceCode}`} onClose={onClose} onSubmit={submit} submitLabel="Hủy hóa đơn" danger>
    <p className="ui-confirm-text">Chỉ hủy được hóa đơn chưa thanh toán. Hóa đơn đã thanh toán không thể hủy.</p>
    <Field label="Lý do *"><Textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} autoFocus /></Field>
  </FormDialog>;
}

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const invoice = useAsync(() => billingApi.invoice(invoiceId), [invoiceId]);
  const [dialog, setDialog] = useState(null);
  const action = useAction();
  const done = (text) => { setDialog(null); action.setNotice({ type: 'success', text }); invoice.refresh(); };

  return <StaffLayout area="reception" title="Chi tiết hóa đơn">
    <AsyncView state={invoice}>
      {(inv) => {
        const pending = inv.paymentStatus === 'PENDING';
        return <>
          <PageHead eyebrow="HÓA ĐƠN" title={inv.invoiceCode}
            actions={<><Link className="ui-button" to="/reception/invoices">← Danh sách</Link><Button onClick={() => window.print()}>In hóa đơn</Button></>}>
            Đợt khám {inv.visitCode || `#${inv.visitId}`} · {inv.petName} · Lập lúc {formatDateTime(inv.createdAt)}
          </PageHead>
          <Notice notice={action.notice} onClose={action.clear} />
          <Panel title="Tổng quan" actions={<Badge map={PAYMENT_STATUS} value={inv.paymentStatus} />}>
            <Facts items={[['Tiền dịch vụ', formatMoney(inv.totalServiceAmount)], ['Tiền thuốc', formatMoney(inv.totalMedicineAmount)], ['VAT', formatMoney(inv.totalVatAmount)], ['Chiết khấu', formatMoney(inv.discountAmount)],
              ['Tổng thanh toán', <strong key="f">{formatMoney(inv.finalAmount)}</strong>], ['Thanh toán lúc', formatDateTime(inv.paidAt)], ['Thu ngân', inv.cashierId ? `#${inv.cashierId}` : null], ['Ghi chú', inv.notes]]} />
          </Panel>
          <Panel title="Chi tiết" flush>
            <Table caption="Các khoản trong hóa đơn" rowKey="id" rows={inv.items} columns={[
              { title: 'Khoản', render: (row) => <><strong>{row.itemName}</strong><small>{INVOICE_ITEM_TYPE[row.itemType]}</small></> },
              { title: 'SL', key: 'quantity' }, { title: 'Đơn giá', align: 'right', render: (row) => formatMoney(row.unitPrice) },
              { title: 'VAT', align: 'right', render: (row) => formatMoney(row.vatAmount) }, { title: 'Thành tiền', align: 'right', render: (row) => formatMoney(row.subtotal) }]} />
          </Panel>
          {pending && <div className="ui-actions ui-no-print">
            <Button variant="primary" onClick={() => setDialog('pay')}>Xác nhận thanh toán</Button>
            <Button onClick={() => setDialog('discount')}>Chiết khấu</Button>
            <Button variant="danger" onClick={() => setDialog('cancel')}>Hủy hóa đơn</Button>
          </div>}
          {inv.paymentStatus === 'PAID' && inv.prescriptionId && <p className="ui-muted ui-no-print">Hóa đơn có đơn thuốc — chuyển sang mục <Link className="ui-link" to="/reception/dispense">Phát thuốc</Link> để hoàn tất ca khám.</p>}
          {dialog === 'discount' && <DiscountDialog invoice={inv} onClose={() => setDialog(null)} onDone={done} />}
          {dialog === 'cancel' && <CancelDialog invoice={inv} onClose={() => setDialog(null)} onDone={done} />}
          {dialog === 'pay' && <ConfirmDialog title="Xác nhận thanh toán" confirmLabel="Đã thu tiền" onClose={() => setDialog(null)} onConfirm={async () => { await billingApi.confirmPayment(inv.id); done(inv.prescriptionId ? 'Đã ghi nhận thanh toán. Chuyển sang mục Phát thuốc để giao thuốc cho khách.' : 'Đã ghi nhận thanh toán. Ca khám hoàn tất.'); }}>
            Thu <strong>{formatMoney(inv.finalAmount)}</strong> cho hóa đơn {inv.invoiceCode}. Không thể hoàn tác sau khi xác nhận.</ConfirmDialog>}
        </>;
      }}
    </AsyncView>
  </StaffLayout>;
}
