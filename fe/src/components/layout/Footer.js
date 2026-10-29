import Brand from '../common/Brand';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand"><Brand href="/" /><p>Chăm sóc thú y tận tâm để mỗi người bạn nhỏ luôn khoẻ mạnh và hạnh phúc. 🐾</p></div>
        <div><h3>Dịch vụ</h3><a href="/#services">Khám tổng quát</a><a href="/#services">Tiêm phòng</a><a href="/#services">Xét nghiệm</a><a href="/#services">Chăm sóc nội trú</a></div>
        <div><h3>PawCare</h3><a href="/">Về chúng tôi</a><a href="/#patients">Đội ngũ bác sĩ</a><a href="/#reviews">Đánh giá</a><a href="/#booking">Liên hệ</a></div>
        <div><h3>Liên hệ</h3><p>📍 123 Nguyễn Văn Linh, TP.HCM</p><p>📞 1900 6868</p><p>✉️ hello@pawcare.vn</p><p>🕒 08:00 – 20:00, mỗi ngày</p></div>
      </div>
      <div className="container footer-bottom"><span>© 2026 PawCare. All rights reserved. 🐾</span><div><a href="/">Chính sách bảo mật</a><a href="/">Điều khoản sử dụng</a></div></div>
    </footer>
  );
}
