import '../../styles/slots.css';
import { useSlotAvailability } from '../../features/appointments/useCustomerCare';

// Lưới 14 khung giờ tiếp nhận của một ngày. Khung đầy hoặc đã qua bị làm mờ và không chọn được.
export default function SlotPicker({ date, value, onChange, excludeId = '', error }) {
  const { data, loading, error: loadError, refresh } = useSlotAvailability(date, excludeId);
  if (!date) return <p className="care-note">Chọn ngày khám để xem các khung giờ còn chỗ.</p>;
  if (loading) return <p className="pet-loading" role="status">Đang tải khung giờ…</p>;
  if (loadError) return <p className="pet-alert error" role="alert">{loadError} <button type="button" className="pet-text-button" onClick={refresh}>Thử lại</button></p>;
  if (data.error) return <p className="pet-alert error" role="alert">{data.error}</p>;
  const available = data.slots.filter((slot) => !slot.past && !slot.full).length;
  return <div className="care-slot-picker">
    <div role="radiogroup" aria-label="Khung giờ tiếp nhận" className="care-slot-grid">
      {data.slots.map((slot) => {
        const unavailable = slot.past || slot.full;
        const note = slot.past ? 'Đã qua' : slot.full ? 'Đã kín lịch' : `Còn ${slot.remaining} chỗ`;
        return <button key={slot.time} type="button" role="radio" aria-checked={value === slot.time} disabled={unavailable} aria-label={`${slot.label}, ${note}`}
          className={`care-slot ${value === slot.time ? 'selected' : ''} ${slot.full ? 'full' : ''}`} onClick={() => onChange(slot.time)}>
          <strong>{slot.label}</strong><small>{note}</small>
        </button>;
      })}
    </div>
    {!available && <p className="care-note" role="status">Ngày này không còn khung giờ trống. Vui lòng chọn ngày khác.</p>}
    {error && <small className="pet-field-error" role="alert">{error}</small>}
  </div>;
}
