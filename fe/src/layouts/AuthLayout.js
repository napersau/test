import Brand from '../components/common/Brand';

export default function AuthLayout({ children, mode }) {
  const isLogin = mode === 'login';

  return (
    <main className="auth-layout">
      <section className="auth-showcase" aria-label="Giới thiệu PawCare">
        <div className="auth-showcase-inner">
          <Brand href="/" />
          <div className="auth-showcase-copy">
            <span className="auth-kicker">🐾 Đồng hành cùng thú cưng</span>
            <h1>{isLogin ? 'Chào mừng bạn trở lại!' : 'Bắt đầu hành trình chăm sóc'}</h1>
            <p>Quản lý lịch khám, hồ sơ sức khoẻ và nhắc lịch vaccine của các bé tại một nơi.</p>
          </div>
          <div className="auth-pet-card">
            <img src="/images/landing/hero-dog.jpg" alt="Chú chó vui vẻ tại PawCare" />
            <div><strong>Chăm sóc tận tâm</strong><span>Cho mọi người bạn nhỏ</span></div>
          </div>
          <div className="auth-trust"><span><b>✓</b> Hồ sơ bảo mật</span><span><b>✓</b> Đặt lịch nhanh</span><span><b>✓</b> Hỗ trợ 7 ngày</span></div>
        </div>
      </section>
      <section className="auth-content">
        <a className="auth-back" href="/" aria-label="Quay về trang chủ">← <span>Về trang chủ</span></a>
        <div className="auth-mobile-brand"><Brand href="/" /></div>
        {children}
      </section>
    </main>
  );
}
