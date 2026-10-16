import { appointmentDateTime } from '../../appointments/appointmentPolicy';
import { calendarDate, clinicToday } from '../../catalog/catalogPolicy';

export default function WeightHistory({ points }) {
  const recent = points.slice(-20); const times = recent.map((item) => Date.parse(item.at)); const values = recent.map((item) => item.weight);
  const enough = recent.length >= 3 && new Set(times).size >= 3;
  const min = Math.min(...values); const max = Math.max(...values); const span = max - min || 1;
  const xy = recent.map((point, index) => [20 + (times[index] - times[0]) / (times[times.length - 1] - times[0] || 1) * 280, 130 - (point.weight - min) / span * 100]);
  return <section className="admin-panel vet-health-weight"><h2>Cân nặng qua các lần khám</h2><p className="vet-muted">Số đo trong hồ sơ đã chốt, theo khoảng ngày đang lọc. Không thay cân nặng khai báo hiện tại và không tự đánh giá tình trạng sức khỏe.</p>
    {!recent.length ? <p className="vet-muted">Chưa có số đo cân nặng trong khoảng này.</p> : <>{enough ? <><svg role="img" aria-label={`Biểu đồ ${recent.length} số đo cân nặng, từ ${min} đến ${max} kg`} viewBox="0 0 320 160" className="vet-health-chart"><path d="M20 20v120h280" className="vet-health-axis" /><polyline points={xy.map((pair) => pair.join(',')).join(' ')} />{xy.map(([x, y], index) => <circle key={recent[index].id} cx={x} cy={y} r="4"><title>{appointmentDateTime(recent[index].at)}: {recent[index].weight} kg</title></circle>)}</svg><div className="vet-health-chart-labels"><span>{calendarDate(clinicToday(new Date(recent[0].at)))}</span><span>{min}–{max} kg</span><span>{calendarDate(clinicToday(new Date(recent[recent.length - 1].at)))}</span></div></> : <p className="vet-muted">Cần ít nhất 3 số đo ở thời điểm khác nhau để dựng biểu đồ. Các số đo hiện có vẫn hiển thị bên dưới.</p>}
      <details className="vet-health-weight-details" open><summary>Số đo đã ghi nhận ({recent.length}{points.length > 20 ? ' gần nhất' : ''})</summary><div className="admin-table-scroll"><table className="vet-health-weight-table"><caption className="pet-sr-only">Bảng cân nặng theo lần khám</caption><thead><tr><th>Ngày khám</th><th>kg</th><th>Bác sĩ</th></tr></thead><tbody>{[...recent].reverse().map((point) => <tr key={point.id}><td>{appointmentDateTime(point.at)}</td><td>{point.weight}</td><td>{point.doctorName}</td></tr>)}</tbody></table></div></details></>}
  </section>;
}
