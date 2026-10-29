import { useEffect, useState } from 'react';
import { paraclinicApi } from '../../api/endpoints';
import { Badge, Facts, Table } from '../ui';
import { LAB_EVALUATION, PRESCRIPTION_STATUS, SERVICE_CATEGORY, SERVICE_DETAIL_STATUS, VISIT_STATUS } from '../../lib/labels';
import { formatDateTime, formatMoney, formatNumber } from '../../lib/format';

/** Ảnh CĐHA: tải qua API có xác thực (không dùng thẻ img trực tiếp vì cần Authorization). DICOM chỉ tải về. */
export function AttachmentView({ attachment }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const previewable = /^image\/(jpeg|png)$/.test(attachment.contentType || '');
  useEffect(() => {
    let revoked = false; let created = '';
    paraclinicApi.attachment(attachment.id).then((blob) => { if (!revoked) { created = URL.createObjectURL(blob); setUrl(created); } }).catch(() => setFailed(true));
    return () => { revoked = true; if (created) URL.revokeObjectURL(created); };
  }, [attachment.id]);
  if (failed) return <span className="ui-muted">Không tải được tệp {attachment.fileName}.</span>;
  if (!url) return <span className="ui-muted">Đang tải {attachment.fileName}…</span>;
  return <figure style={{ margin: 0 }}>
    {previewable && <a href={url} target="_blank" rel="noreferrer"><img className="ui-image" src={url} alt={`Ảnh kết quả ${attachment.fileName}`} /></a>}
    <figcaption><a className="ui-link" href={url} download={attachment.fileName}>Tải {attachment.fileName}</a> <small className="ui-muted">({formatNumber((attachment.fileSize || 0) / 1024)} KB)</small></figcaption>
  </figure>;
}

export function LabResultsTable({ results }) {
  if (!results?.length) return null;
  return <Table caption="Kết quả xét nghiệm" rowKey="id" columns={[
    { title: 'Chỉ số', render: (row) => <><strong>{row.name}</strong><small>{row.code}</small></> },
    { title: 'Kết quả', render: (row) => <span className={row.evaluation === 'HIGH' ? 'ui-lab-high' : row.evaluation === 'LOW' ? 'ui-lab-low' : ''}>{formatNumber(row.value, 2)} {row.unit}</span> },
    { title: 'Khoảng tham chiếu', render: (row) => (row.minValue !== null && row.minValue !== undefined ? `${formatNumber(row.minValue, 2)} – ${formatNumber(row.maxValue, 2)} ${row.unit}` : '—') },
    { title: 'Đánh giá', render: (row) => <Badge map={LAB_EVALUATION} value={row.evaluation} /> },
  ]} rows={results} />;
}

export function ImagingResults({ results }) {
  if (!results?.length) return null;
  return <div className="ui-stack" style={{ gap: 14 }}>{results.map((result) => <div key={result.id}>
    <Facts items={[['Mô tả', result.description], ['Kết luận', result.conclusion], ['Thực hiện lúc', formatDateTime(result.performedAt)]]} />
    <div className="ui-actions" style={{ marginTop: 12, alignItems: 'flex-start' }}>{(result.attachments || []).map((file) => <AttachmentView key={file.id} attachment={file} />)}</div>
  </div>)}</div>;
}

export function PrescriptionView({ prescription }) {
  if (!prescription) return <p className="ui-muted">Không có đơn thuốc cho đợt khám này.</p>;
  return <div className="ui-stack" style={{ gap: 12 }}>
    {prescription.status && <div><Badge map={PRESCRIPTION_STATUS} value={prescription.status} /></div>}
    {prescription.doctorNotes && <p style={{ margin: 0 }}><strong>Lời dặn của bác sĩ:</strong> {prescription.doctorNotes}</p>}
    <Table caption="Đơn thuốc" rowKey={(row) => row.medicineId} columns={[
      { title: 'Thuốc', render: (row) => <><strong>{row.medicineName}</strong><small>{row.activeIngredient || row.medicineCode}</small></> },
      { title: 'Số lượng', render: (row) => `${row.quantity} ${row.unit}` },
      { title: 'Cách dùng', render: (row) => <>{row.dosage}, {row.frequency}, {row.durationDays} ngày{row.instructions && <small>{row.instructions}</small>}</> },
    ]} rows={prescription.items || []} />
  </div>;
}

/** Một đợt khám trong bệnh án (MedicalHistoryEntry của backend): chẩn đoán, dịch vụ, xét nghiệm, hình ảnh, đơn thuốc. */
export default function MedicalEntry({ entry }) {
  const { visit, doctorName, prescription } = entry;
  const services = (visit.services || []).filter((item) => item.status !== 'CANCELLED');
  return <article className="ui-panel">
    <header className="ui-panel-head"><div><h2>{visit.visitCode} · {formatDateTime(visit.checkedInAt)}</h2><p>Bác sĩ phụ trách: {doctorName || (visit.doctorId ? `#${visit.doctorId}` : 'Chưa ghi nhận')}{visit.emergency ? ' · Cấp cứu' : ''}</p></div><Badge map={VISIT_STATUS} value={visit.status} /></header>
    <div className="ui-panel-body ui-stack" style={{ gap: 20 }}>
      <Facts items={[['Triệu chứng ban đầu', visit.initialSymptoms], ['Cân nặng', visit.weightAtVisit ? `${formatNumber(visit.weightAtVisit, 2)} kg` : null], ['Thân nhiệt', visit.temperature ? `${formatNumber(visit.temperature, 1)} °C` : null],
        ['Ghi chú lâm sàng', visit.clinicalNotes], ['Chẩn đoán', visit.diagnosis], ['Phác đồ điều trị', visit.treatmentPlan], ['Lời dặn của bác sĩ', visit.doctorAdvice]]} />
      {services.length > 0 && <div><h3>Dịch vụ đã thực hiện</h3><Table caption="Dịch vụ" columns={[
        { title: 'Dịch vụ', render: (row) => <><strong>{row.serviceName}</strong><small>{SERVICE_CATEGORY[row.category]}</small></> },
        { title: 'SL', key: 'quantity' }, { title: 'Thành tiền', align: 'right', render: (row) => formatMoney(row.subtotal) },
        { title: 'Trạng thái', render: (row) => <Badge map={SERVICE_DETAIL_STATUS} value={row.status} /> }]} rows={services} /></div>}
      {visit.labResults?.length > 0 && <div><h3>Kết quả xét nghiệm</h3><LabResultsTable results={visit.labResults} /></div>}
      {visit.imagingResults?.length > 0 && <div><h3>Chẩn đoán hình ảnh</h3><ImagingResults results={visit.imagingResults} /></div>}
      <div><h3>Đơn thuốc</h3><PrescriptionView prescription={prescription} /></div>
    </div>
  </article>;
}
