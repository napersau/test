import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StaffLayout from '../../layouts/StaffLayout';
import CustomerFormDialog from '../../components/shared/CustomerFormDialog';
import PetFormDialog from '../../components/shared/PetFormDialog';
import Modal from '../../components/common/Modal';
import { AsyncView, Badge, Button, Facts, Field, Input, Notice, PageHead, Panel, Table } from '../../components/ui';
import { petsApi, usersApi } from '../../api/endpoints';
import { temporaryPassword } from '../../api/normalize';
import useAction from '../../hooks/useAction';
import useAsync from '../../hooks/useAsync';
import { formatAge, formatDateTime } from '../../lib/format';
import { ACCOUNT_STATUS, PET_GENDER } from '../../lib/labels';

function ResetPasswordDialog({ customer, onClose }) {
  const [password] = useState(temporaryPassword);
  const [done, setDone] = useState(false);
  const action = useAction();
  const apply = async () => { if (await action.run(() => usersApi.resetPassword(customer.id, password))) setDone(true); };
  return <Modal title={`Đặt lại mật khẩu — ${customer.fullName}`} id="reset-password-title" onClose={onClose} busy={action.busy}>
    <div className="ui-form-body">
      {done ? <div className="ui-alert success"><span>Đã đặt mật khẩu tạm. Mọi phiên đăng nhập cũ của khách đã bị đăng xuất.</span></div>
        : <p className="ui-confirm-text">Hệ thống sẽ đặt một mật khẩu tạm cho khách. Hãy đưa mật khẩu này cho khách và nhắc đổi lại sau khi đăng nhập.</p>}
      <Notice notice={action.notice} />
      <Field label="Mật khẩu tạm"><Input readOnly value={password} className="ui-mono" data-testid="temporary-password" onFocus={(event) => event.target.select()} /></Field>
    </div>
    <div className="ui-form-actions"><Button onClick={onClose}>{done ? 'Đóng' : 'Hủy'}</Button>{!done && <Button variant="primary" busy={action.busy} onClick={apply}>Đặt mật khẩu tạm</Button>}</div>
  </Modal>;
}

export default function CustomerDetailPage() {
  const { customerId } = useParams();
  const customer = useAsync(() => usersApi.get(customerId), [customerId]);
  const pets = useAsync(() => petsApi.list({ ownerId: customerId, size: 100 }), [customerId]);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);
  return <StaffLayout area="reception" title="Hồ sơ khách hàng">
    <Notice notice={notice} onClose={() => setNotice(null)} />
    <AsyncView state={customer}>
      {(c) => <>
        <PageHead eyebrow="KHÁCH HÀNG" title={c.fullName} actions={<><Link className="ui-button" to="/reception/customers">← Danh sách</Link><Button onClick={() => setDialog({ type: 'edit' })}>Sửa thông tin</Button><Button onClick={() => setDialog({ type: 'reset' })}>Đặt lại mật khẩu</Button></>}>
          Tên đăng nhập: {c.username} · Tạo lúc {formatDateTime(c.createdAt)}
        </PageHead>
        <Panel title="Thông tin liên hệ" actions={<Badge map={ACCOUNT_STATUS} value={c.status} />}>
          <Facts items={[['Số điện thoại', c.phoneNumber], ['Email', c.email], ['Địa chỉ', c.address]]} />
        </Panel>
        <Panel title="Thú cưng" actions={<Button variant="primary" onClick={() => setDialog({ type: 'pet' })}>+ Thêm thú cưng</Button>} flush>
          <AsyncView state={pets} isEmpty={(data) => data.items.length === 0} empty="Khách chưa có hồ sơ thú cưng.">
            {(data) => <Table caption="Thú cưng của khách" rows={data.items} columns={[
              { title: 'Thú cưng', render: (row) => <><strong>{row.name}</strong><small>{row.petCode}</small></> },
              { title: 'Loài', render: (row) => `${row.speciesName}${row.breed ? ` · ${row.breed}` : ''}` },
              { title: 'Giới tính / tuổi', render: (row) => `${PET_GENDER[row.gender] || ''} · ${formatAge(row.dateOfBirth)}` },
              { title: 'Ghi chú', render: (row) => row.notes || '—' },
              { title: '', align: 'right', render: (row) => <div className="ui-actions" style={{ justifyContent: 'flex-end' }}><Button className="small" onClick={() => setDialog({ type: 'pet', pet: row })}>Sửa</Button><Link className="ui-button small" to={`/reception/history?petId=${row.id}`}>Bệnh án</Link></div> }]} />}
          </AsyncView>
        </Panel>
        {dialog?.type === 'edit' && <CustomerFormDialog customer={c} onClose={() => setDialog(null)} onSaved={() => { setNotice({ type: 'success', text: 'Đã cập nhật thông tin khách hàng.' }); customer.refresh(); }} />}
        {dialog?.type === 'reset' && <ResetPasswordDialog customer={c} onClose={() => setDialog(null)} />}
        {dialog?.type === 'pet' && <PetFormDialog pet={dialog.pet} ownerId={c.id} onClose={() => setDialog(null)} onSaved={(saved) => { setNotice({ type: 'success', text: `Đã lưu hồ sơ của ${saved.name}.` }); pets.refresh(); }} />}
      </>}
    </AsyncView>
  </StaffLayout>;
}
