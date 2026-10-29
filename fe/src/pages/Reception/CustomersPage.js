import { useState } from 'react';
import { Link } from 'react-router-dom';
import StaffLayout from '../../layouts/StaffLayout';
import CustomerFormDialog from '../../components/shared/CustomerFormDialog';
import { AsyncView, Badge, Button, Notice, PageHead, Pager, Panel, SearchBox, Table } from '../../components/ui';
import { usersApi } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';
import useDebounced from '../../hooks/useDebounced';
import { formatDateTime } from '../../lib/format';
import { ACCOUNT_STATUS } from '../../lib/labels';

export default function CustomersPage() {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState(null);
  const search = useDebounced(keyword);
  const list = useAsync(() => usersApi.list({ role: 'PET_OWNER', keyword: search.trim() || undefined, page, size: 15 }), [search, page]);
  return <StaffLayout area="reception" title="Khách hàng">
    <PageHead eyebrow="KHÁCH HÀNG" title="Thông tin khách hàng" actions={<Button variant="primary" onClick={() => setCreating(true)}>+ Thêm khách hàng</Button>}>
      Tra cứu chủ nuôi theo tên hoặc số điện thoại, tạo tài khoản cho khách mới và đặt lại mật khẩu khi khách quên.
    </PageHead>
    <Notice notice={notice} onClose={() => setNotice(null)} />
    <div className="ui-toolbar"><SearchBox value={keyword} onChange={(value) => { setKeyword(value); setPage(0); }} placeholder="Tên hoặc số điện thoại" label="Tìm khách hàng" /></div>
    <Panel flush>
      <AsyncView state={list} isEmpty={(data) => data.items.length === 0} empty="Không tìm thấy khách hàng nào.">
        {(data) => <>
          <Table caption="Khách hàng" rows={data.items} columns={[
            { title: 'Khách hàng', render: (row) => <Link className="ui-link" to={`/reception/customers/${row.id}`}><strong>{row.fullName}</strong></Link> },
            { title: 'Liên hệ', render: (row) => <>{row.phoneNumber}<small>{row.email || 'Chưa có email'}</small></> },
            { title: 'Địa chỉ', render: (row) => row.address || '—' },
            { title: 'Tạo lúc', render: (row) => formatDateTime(row.createdAt) },
            { title: 'Trạng thái', render: (row) => <Badge map={ACCOUNT_STATUS} value={row.status} /> },
            { title: '', align: 'right', render: (row) => <Link className="ui-button small" to={`/reception/customers/${row.id}`}>Hồ sơ</Link> }]} />
          <Pager page={data} onChange={setPage} />
        </>}
      </AsyncView>
    </Panel>
    {creating && <CustomerFormDialog onClose={() => setCreating(false)} onSaved={(saved) => { setNotice({ type: 'success', text: `Đã tạo tài khoản cho ${saved.fullName}.` }); list.refresh(); }} />}
  </StaffLayout>;
}
