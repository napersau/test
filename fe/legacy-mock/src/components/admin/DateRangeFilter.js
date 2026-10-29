import { calendarDate, clinicToday, dateOffset } from '../../features/catalog/catalogPolicy';

export default function DateRangeFilter({ range }) {
  return <div className="insights-date-filter" role="group" aria-label="Khoảng thời gian">
    <div className="insights-date-inputs">
      <label>Từ ngày<input type="date" aria-label="Từ ngày" value={range.from} onChange={(event) => range.change({ from: event.target.value })} aria-invalid={!!range.error} aria-describedby={range.error ? 'date-range-error' : undefined} /></label>
      <label>Đến ngày<input type="date" aria-label="Đến ngày" value={range.to} onChange={(event) => range.change({ to: event.target.value })} aria-invalid={!!range.error} aria-describedby={range.error ? 'date-range-error' : undefined} /></label>
    </div>
    <div className="insights-date-presets">{[1, 7, 30, 90].map((days) => <button key={days} className="admin-button secondary" type="button" onClick={() => range.change({ from: dateOffset(1 - days), to: clinicToday() })}>{days === 1 ? 'Hôm nay' : `${days} ngày`}</button>)}
      {!range.required && <button className="admin-button secondary" type="button" onClick={() => range.change({ from: '', to: '' })}>Tất cả ngày</button>}
    </div>
    {!range.error && <small className="insights-date-summary">Khoảng chọn: {range.from ? calendarDate(range.from) : 'Không giới hạn bắt đầu'} – {range.to ? calendarDate(range.to) : 'Không giới hạn kết thúc'}</small>}
    {range.error && <p id="date-range-error" className="insights-range-error" role="alert">{range.error}</p>}
  </div>;
}
