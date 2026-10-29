export default function ReportTrend({ rows, monthly }) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.customers, row.batches]));
  const step = 640 / rows.length;
  const labelEvery = Math.max(1, Math.ceil(rows.length / 7));
  if (!rows.some((row) => row.customers || row.batches)) return <div className="insights-chart-empty"><p>Không có khách hàng mới hoặc lô nhập trong kỳ.</p><small>Bảng bên dưới vẫn hiển thị số liệu chính xác theo thời gian.</small></div>;
  return <div className="insights-chart"><div className="insights-legend"><span><i />Khách hàng mới</span><span><i />Lô nhập</span><small>Theo {monthly ? 'tháng' : 'ngày'} · đơn vị: số lượng</small></div>
    <svg viewBox="0 0 720 240" role="img" aria-label={`Biểu đồ khách hàng mới và lô nhập theo ${monthly ? 'tháng' : 'ngày'}. Số liệu chi tiết ở bảng bên dưới.`}>
      {[0, 0.5, 1].map((ratio) => <g key={ratio}><line x1="45" x2="685" y1={190 - ratio * 160} y2={190 - ratio * 160} className="insights-chart-grid" /><text x="35" y={194 - ratio * 160} textAnchor="end">{Number((ratio * max).toFixed(1))}</text></g>)}
      {rows.map((row, index) => <g key={row.key}><title>{row.label}: {row.customers} khách hàng mới, {row.batches} lô nhập</title>
        <rect x={45 + index * step + step * 0.1} y={190 - row.customers / max * 160} width={step * 0.32} height={row.customers / max * 160} rx="2" className="insights-bar-customers" />
        <rect x={45 + index * step + step * 0.5} y={190 - row.batches / max * 160} width={step * 0.32} height={row.batches / max * 160} rx="2" className="insights-bar-batches" />
        {index % labelEvery === 0 && <text x={45 + (index + 0.5) * step} y="220" textAnchor="middle">{monthly ? row.label : row.label.slice(0, 5)}</text>}
      </g>)}
    </svg>
  </div>;
}
