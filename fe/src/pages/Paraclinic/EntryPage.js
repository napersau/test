import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import StaffLayout from '../../layouts/StaffLayout';
import { ROOM } from './QueuePage';
import { AsyncView, Button, Facts, Field, Input, Notice, PageHead, Panel, Table, Textarea } from '../../components/ui';
import { paraclinicApi } from '../../api/endpoints';
import useAction from '../../hooks/useAction';
import useAsync from '../../hooks/useAsync';
import { blankToNull, formatNumber } from '../../lib/format';

const MAX_FILE = 20 * 1024 * 1024;
const ALLOWED = /\.(jpe?g|png|dcm)$/i;

function useQueueItem(kind, detailId) {
  const room = ROOM[kind];
  return useAsync(async () => {
    const item = (await room.load()).find((entry) => String(entry.serviceDetailId) === String(detailId));
    if (!item) throw new Error('Ca này không còn trong hàng đợi (đã hoàn tất, bị hủy hoặc thuộc phòng khác).');
    return item;
  }, [kind, detailId]);
}

function Header({ item, kind }) {
  return <Panel title={`${item.petName} — ${item.serviceName}`}><Facts items={[['Đợt khám', item.visitCode], ['Loài', item.speciesName], ['Ca cấp cứu', item.emergency ? 'Có' : 'Không'], ['Ghi chú của bác sĩ', item.notes]]} />
    <div style={{ marginTop: 14 }}><Link className="ui-button" to={`${ROOM[kind].base}/queue`}>← Về hàng đợi</Link></div></Panel>;
}

function LabForm({ item, detailId, onDone }) {
  const form = useAsync(() => paraclinicApi.labForm(detailId), [detailId]);
  const [values, setValues] = useState({});
  const action = useAction();
  const submit = async (event) => {
    event.preventDefault();
    const entries = Object.entries(values).filter(([, entry]) => entry.value !== '' && entry.value !== undefined);
    if (!entries.length) { action.setNotice({ type: 'error', text: 'Nhập ít nhất một chỉ số.' }); return; }
    if (entries.some(([, entry]) => Number.isNaN(Number(entry.value)) || Number(entry.value) < 0)) { action.setNotice({ type: 'error', text: 'Giá trị đo phải là số không âm.' }); return; }
    const items = entries.map(([id, entry]) => ({ labTestItemId: Number(id), value: Number(entry.value), notes: blankToNull(entry.notes || '') }));
    if (await action.run(() => paraclinicApi.saveLabResults(detailId, items))) onDone();
  };
  const set = (id, key, value) => setValues({ ...values, [id]: { ...values[id], [key]: value } });
  return <Panel title="Nhập kết quả xét nghiệm" subtitle="Khoảng tham chiếu theo loài của thú cưng; hệ thống tự đánh giá Thấp / Bình thường / Cao khi lưu.">
    <AsyncView state={form} empty="Dịch vụ này chưa có chỉ số xét nghiệm nào được cấu hình.">
      {(rows) => <form onSubmit={submit} noValidate className="ui-stack" style={{ gap: 14 }}>
        <Notice notice={action.notice} onClose={action.clear} />
        <Table caption="Chỉ số xét nghiệm" rowKey="id" rows={rows} columns={[
          { title: 'Chỉ số', render: (row) => <><strong>{row.name}</strong><small>{row.code}</small></> },
          { title: 'Khoảng tham chiếu', render: (row) => { const range = row.ranges?.[0]; return range ? `${formatNumber(range.minValue, 2)} – ${formatNumber(range.maxValue, 2)} ${row.unit}` : 'Chưa cấu hình cho loài này'; } },
          { title: 'Giá trị đo', render: (row) => <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Input type="number" step="0.01" min="0" aria-label={`Giá trị ${row.name}`} style={{ maxWidth: 140 }} value={values[row.id]?.value ?? ''} onChange={(event) => set(row.id, 'value', event.target.value)} /><span className="ui-muted">{row.unit}</span></div> },
          { title: 'Ghi chú', render: (row) => <Input aria-label={`Ghi chú ${row.name}`} value={values[row.id]?.notes ?? ''} onChange={(event) => set(row.id, 'notes', event.target.value)} maxLength={500} /> }]} />
        <div><Button type="submit" variant="primary" busy={action.busy}>Lưu kết quả và hoàn tất</Button></div>
      </form>}
    </AsyncView>
  </Panel>;
}

function ImagingForm({ detailId, onDone }) {
  const [description, setDescription] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const action = useAction();
  const pick = (event) => {
    const list = Array.from(event.target.files || []);
    const bad = list.find((file) => !ALLOWED.test(file.name) || file.size > MAX_FILE);
    setError(bad ? `Tệp "${bad.name}" không hợp lệ: chỉ nhận JPEG, PNG hoặc DICOM, tối đa 20 MB mỗi tệp.` : '');
    setFiles(bad ? [] : list);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!description.trim()) { setError('Nhập mô tả kết quả.'); return; }
    if (!files.length) { setError('Đính kèm ít nhất một tệp ảnh.'); return; }
    setError('');
    if (await action.run(() => paraclinicApi.saveImagingResult(detailId, { description: description.trim(), conclusion: conclusion.trim(), files }))) onDone();
  };
  return <Panel title="Nhập kết quả chẩn đoán hình ảnh" subtitle="Định dạng JPEG, PNG hoặc DICOM, tối đa 20 MB mỗi tệp. Hệ thống kiểm tra nội dung tệp, không chỉ phần mở rộng.">
    <form onSubmit={submit} noValidate className="ui-stack" style={{ gap: 14 }}>
      <Notice notice={action.notice} onClose={action.clear} />
      {error && <div className="ui-alert error" role="alert"><span>{error}</span></div>}
      <Field label="Mô tả *"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} /></Field>
      <Field label="Kết luận"><Textarea value={conclusion} onChange={(event) => setConclusion(event.target.value)} maxLength={2000} rows={2} /></Field>
      <Field label="Tệp ảnh *" hint={files.length ? `${files.length} tệp đã chọn` : undefined}><input type="file" multiple accept=".jpg,.jpeg,.png,.dcm,image/jpeg,image/png,application/dicom" onChange={pick} /></Field>
      <div><Button type="submit" variant="primary" busy={action.busy}>Lưu kết quả và hoàn tất</Button></div>
    </form>
  </Panel>;
}

export default function EntryPage({ kind }) {
  const { detailId } = useParams();
  const navigate = useNavigate();
  const room = ROOM[kind];
  const item = useQueueItem(kind, detailId);
  const back = () => navigate(`${room.base}/queue`, { replace: true });
  return <StaffLayout area={room.area} title="Nhập kết quả">
    <PageHead eyebrow={room.eyebrow} title="Nhập kết quả" />
    <AsyncView state={item}>
      {(data) => data.queueState !== 'IN_PROGRESS'
        ? <div className="ui-alert warning"><span>Dịch vụ chưa được bắt đầu. Hãy bấm “Bắt đầu” ở hàng đợi trước khi nhập kết quả.</span> <Link className="ui-link" to={`${room.base}/queue`}>Về hàng đợi</Link></div>
        : <><Header item={data} kind={kind} />{kind === 'lab' ? <LabForm item={data} detailId={detailId} onDone={back} /> : <ImagingForm detailId={detailId} onDone={back} />}</>}
    </AsyncView>
  </StaffLayout>;
}
