// Mã VietQR minh họa (giả): sinh ô vuông cố định từ nội dung để demo, KHÔNG quét được và không kết nối ngân hàng.
const SIZE = 25;
function cells(text) {
  let seed = 2166136261;
  for (const char of text) { seed ^= char.charCodeAt(0); seed = Math.imul(seed, 16777619) >>> 0; }
  const next = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed; };
  const finder = (x, y) => [[0, 0], [SIZE - 7, 0], [0, SIZE - 7]].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
  return Array.from({ length: SIZE * SIZE }, (_, index) => { const x = index % SIZE; const y = Math.floor(index / SIZE); return !finder(x, y) && next() % 2 === 0; });
}
const FINDERS = [[0, 0], [SIZE - 7, 0], [0, SIZE - 7]];

export default function FakeQr({ value, amount, content }) {
  const dark = cells(value);
  return <figure className="fake-qr">
    <svg viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`} role="img" aria-label="Mã VietQR minh họa, không dùng để chuyển tiền thật" shapeRendering="crispEdges">
      <rect x="-1" y="-1" width={SIZE + 2} height={SIZE + 2} fill="#fff" />
      {dark.map((on, index) => (on ? <rect key={index} x={index % SIZE} y={Math.floor(index / SIZE)} width="1" height="1" fill="#111" /> : null))}
      {FINDERS.map(([x, y]) => <g key={`${x}-${y}`}><rect x={x} y={y} width="7" height="7" fill="#111" /><rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" /><rect x={x + 2} y={y + 2} width="3" height="3" fill="#111" /></g>)}
    </svg>
    <figcaption><strong>{amount}</strong><span>Nội dung: {content}</span><small>Mã QR minh họa (demo) — không chuyển tiền thật.</small></figcaption>
  </figure>;
}
