import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { LAB_EVALUATIONS } from '../../clinicalRooms/roomsPolicy';
import { PET_SPECIES } from '../../pets/petPolicy';
import { appointmentDateTime } from '../../appointments/appointmentPolicy';

// Kết quả cận lâm sàng đã hoàn tất: bảng xét nghiệm (LOW / NORMAL / HIGH theo khoảng tham chiếu đã snapshot) và ảnh + kết luận CĐHA.
export function LabResultTable({ order, species }) {
  return <div className="invoice-table-wrap" tabIndex="0" role="region" aria-label={`Kết quả ${order.name}`}><table className="vet-results-table"><caption>{order.name}{species ? ` · ${PET_SPECIES[species] || species}` : ''}</caption>
    <thead><tr><th scope="col">Chỉ số</th><th scope="col">Giá trị</th><th scope="col">Khoảng tham chiếu</th><th scope="col">Đánh giá</th></tr></thead>
    <tbody>{order.labResults.map((item) => <tr key={item.itemId}><th scope="row">{item.code} <small>{item.name}</small></th><td>{item.value} {item.unit}</td><td>{item.min !== null && item.max !== null ? `${item.min} – ${item.max} ${item.unit}` : 'Chưa có khoảng cho loài này'}</td>
      <td>{item.evaluation ? <span className={`vet-eval ${item.evaluation}`}>{LAB_EVALUATIONS[item.evaluation].label}</span> : '—'}</td></tr>)}</tbody></table>
    {order.resultComment && <p className="vet-muted">Nhận xét: {order.resultComment}</p>}</div>;
}
export function ImagingResult({ order }) {
  const [zoom, setZoom] = useState(null);
  return <div><h3>{order.name}</h3><p><strong>Mô tả:</strong> {order.imaging.description}</p><p><strong>Kết luận:</strong> {order.imaging.conclusion}</p>
    <div className="vet-image-grid">{order.imaging.images.map((image) => <figure key={image.id}>{image.dataUrl ? <img src={image.dataUrl} alt={`Ảnh ${image.name}`} role="button" tabIndex={0} onClick={() => setZoom(image)} onKeyDown={(event) => { if (event.key === 'Enter') setZoom(image); }} /> : <div className="vet-muted">Tệp {image.name} (không lưu hình trong bản demo)</div>}<figcaption>{image.name}</figcaption></figure>)}</div>
    {zoom && <Modal title={zoom.name} id="vet-image-zoom" onClose={() => setZoom(null)}><div className="admin-editor"><img src={zoom.dataUrl} alt={`Ảnh phóng to ${zoom.name}`} style={{ maxWidth: '100%' }} /></div></Modal>}</div>;
}
export default function OrderResults({ orders, species }) {
  const done = orders.filter((order) => order.status === 'COMPLETED' && (order.labResults.length || order.imaging));
  const cancelled = orders.filter((order) => order.status === 'CANCELLED' && ['LABORATORY', 'IMAGING'].includes(order.serviceType));
  if (!done.length && !cancelled.length) return null;
  return <section className="admin-panel vet-flow-panel" aria-label="Kết quả cận lâm sàng"><h2>Kết quả cận lâm sàng</h2>
    {done.map((order) => <div key={order.id}>{order.labResults.length > 0 && <LabResultTable order={order} species={species} />}{order.imaging && <ImagingResult order={order} />}{order.completedAt && <p className="vet-muted">Hoàn tất {appointmentDateTime(order.completedAt)}</p>}</div>)}
    {cancelled.map((order) => <p key={order.id} className="vet-muted">{order.name}: đã hủy — {order.cancelReason || 'không có lý do'}. Không tính tiền.</p>)}
  </section>;
}
