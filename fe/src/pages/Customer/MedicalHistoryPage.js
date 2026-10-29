import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import MedicalEntry from '../../components/shared/MedicalEntry';
import { AsyncView, Field, PageHead, Pager, Select } from '../../components/ui';
import { petsApi } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';

function History({ petId }) {
  const [page, setPage] = useState(0);
  const history = useAsync(() => petsApi.medicalHistory(petId, { page, size: 5 }), [petId, page]);
  return <AsyncView state={history} isEmpty={(data) => data.items.length === 0} empty="Chưa có đợt khám nào hoàn tất. Kết quả khám xuất hiện ở đây sau khi bé khám xong và thanh toán.">
    {(data) => <>{data.items.map((entry) => <MedicalEntry key={entry.visit.id} entry={entry} />)}<Pager page={data} onChange={setPage} /></>}
  </AsyncView>;
}

export default function MedicalHistoryPage() {
  const [params, setParams] = useSearchParams();
  const pets = useAsync(() => petsApi.list({ size: 100 }), []);
  const [chosen, setChosen] = useState(params.get('petId') || '');
  const items = pets.data?.items || [];
  const petId = chosen || (items.length === 1 ? String(items[0].id) : '');
  const choose = (value) => { setChosen(value); setParams(value ? { petId: value } : {}); };
  return <CustomerLayout>
    <PageHead eyebrow="BỆNH ÁN" title="Lịch sử khám bệnh">Toàn bộ các đợt khám đã hoàn tất của bé: chẩn đoán, xét nghiệm, hình ảnh và đơn thuốc, mới nhất trước.</PageHead>
    <AsyncView state={pets} isEmpty={(data) => data.items.length === 0} empty={<>Bạn chưa có hồ sơ thú cưng. <Link className="ui-link" to="/portal/pets">Thêm thú cưng</Link></>}>
      {() => <>
        <div className="ui-toolbar"><Field label="Thú cưng"><Select value={petId} onChange={(event) => choose(event.target.value)}><option value="">Chọn thú cưng</option>{items.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} ({pet.speciesName})</option>)}</Select></Field></div>
        {petId ? <History key={petId} petId={petId} /> : <p className="ui-muted">Chọn một thú cưng để xem lịch sử khám.</p>}
      </>}
    </AsyncView>
  </CustomerLayout>;
}
