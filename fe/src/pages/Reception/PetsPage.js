import { useState } from 'react';
import { Link } from 'react-router-dom';
import StaffLayout from '../../layouts/StaffLayout';
import PetFormDialog from '../../components/shared/PetFormDialog';
import { AsyncView, Button, Notice, PageHead, Pager, Panel, SearchBox, Table } from '../../components/ui';
import { petsApi } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';
import useDebounced from '../../hooks/useDebounced';
import { formatAge } from '../../lib/format';
import { PET_GENDER } from '../../lib/labels';

export default function PetsPage() {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(null);
  const search = useDebounced(keyword);
  const list = useAsync(() => petsApi.list({ keyword: search.trim() || undefined, page, size: 15 }), [search, page]);
  return <StaffLayout area="reception" title="Thú cưng">
    <PageHead eyebrow="THÚ CƯNG" title="Thông tin thú cưng">Tra cứu hồ sơ theo tên hoặc mã thú cưng. Thêm thú cưng mới từ hồ sơ của chủ nuôi để gắn đúng người.</PageHead>
    <Notice notice={notice} onClose={() => setNotice(null)} />
    <div className="ui-toolbar"><SearchBox value={keyword} onChange={(value) => { setKeyword(value); setPage(0); }} placeholder="Tên hoặc mã thú cưng (PET-…)" label="Tìm thú cưng" /></div>
    <Panel flush>
      <AsyncView state={list} isEmpty={(data) => data.items.length === 0} empty="Không tìm thấy thú cưng nào.">
        {(data) => <>
          <Table caption="Thú cưng" rows={data.items} columns={[
            { title: 'Thú cưng', render: (row) => <><strong>{row.name}</strong><small>{row.petCode}</small></> },
            { title: 'Loài / giống', render: (row) => `${row.speciesName}${row.breed ? ` · ${row.breed}` : ''}` },
            { title: 'Giới tính / tuổi', render: (row) => `${PET_GENDER[row.gender] || ''} · ${formatAge(row.dateOfBirth)}` },
            { title: 'Chủ nuôi', render: (row) => <Link className="ui-link" to={`/reception/customers/${row.ownerId}`}>Xem chủ nuôi</Link> },
            { title: 'Lưu ý', render: (row) => row.notes || '—' },
            { title: '', align: 'right', render: (row) => <div className="ui-actions" style={{ justifyContent: 'flex-end' }}><Button className="small" onClick={() => setEditing(row)}>Sửa</Button><Link className="ui-button small" to={`/reception/history?petId=${row.id}`}>Bệnh án</Link></div> }]} />
          <Pager page={data} onChange={setPage} />
        </>}
      </AsyncView>
    </Panel>
    {editing && <PetFormDialog pet={editing} onClose={() => setEditing(null)} onSaved={(saved) => { setNotice({ type: 'success', text: `Đã lưu hồ sơ của ${saved.name}.` }); list.refresh(); }} />}
  </StaffLayout>;
}
