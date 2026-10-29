# Giao diện PawCare (React)

Kết nối tới backend qua API Gateway. Kiến trúc và quy ước: mục "Frontend" trong `../CLAUDE.md`.

```bash
cp .env.example .env     # REACT_APP_API_URL=http://localhost:8080, PORT=3000
npm install
npm start                # http://localhost:3000
npm test                 # test đơn vị (lớp API, STOMP, định dạng)
npm run build            # phải "Compiled successfully"
```

Chạy cả hệ thống (kể cả giao diện) bằng Docker từ thư mục gốc: `docker compose up -d --build` → http://localhost:3000.
Tài khoản mẫu: `admin` / `Admin@123`. Các vai trò khác do admin tạo ở "Tài khoản & nhân sự"; chủ nuôi tự đăng ký ở `/auth/register`.

Kiểm thử trên trình duyệt thật: `node ../e2e/fe_smoke.mjs` (xem `../e2e/README.md`).

`legacy-mock/` là bản giao diện cũ dùng dữ liệu giả trong localStorage, giữ lại để tham khảo (không được build).
