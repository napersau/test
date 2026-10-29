# Kịch bản kiểm thử end-to-end

Chạy qua API Gateway (`http://localhost:8080`) trên hệ thống Docker thật, tự đối chiếu `[PASS]`/`[FAIL]`.
Mỗi kịch bản in dòng cuối `KET QUA: N dat, M khong dat`.

| File | Phạm vi | Số kiểm tra |
|---|---|---|
| `auth.sh` | auth-service: đăng nhập, refresh, khóa tài khoản, endpoint nội bộ (kịch bản quan sát, không đếm PASS) | – |
| `appointment.sh` | đặt lịch, sức chứa khung giờ, song song, NO_SHOW, kiểm tra thú cưng | 85 |
| `clinical.sh` | thú cưng, check-in, hàng đợi, phân công, khám 2 pha, Lab/CĐHA, tải ảnh, đồng thời | 171 |
| `billing.sh` | kê đơn, hóa đơn, thanh toán, xuất thuốc, kho, EX-14/15/16, đồng thời, DLQ | 151 |
| `notification.py` | STOMP/WebSocket thật (JWT, quyền đăng ký kênh), 6 sự kiện, email Mailpit, DLQ | 68 |
| `features.py` | tự đăng ký / đổi vai trò / đặt lại mật khẩu, danh mục xét nghiệm, hàng đợi 3 bậc, bệnh án trọn đời, báo cáo, hết hạn PENDING, hủy hóa đơn + mở lại đợt khám | 138 |
| `fe_smoke.mjs` | **giao diện thật** trên Chrome headless: một ca khám trọn vẹn qua 6 vai trò (xem mục dưới) | 50 |

## Chạy

```bash
docker compose up -d --build        # chờ mọi container healthy
pip install websockets              # chỉ cần cho notification.py
bash e2e/run_all.sh                 # chạy 4 kịch bản đầu + notification.py
```

`features.py` thử việc tự hủy lịch PENDING quá hạn nên cần cron quét nhanh. Chạy riêng như sau:

```bash
BOOKING_PENDING_EXPIRY_CRON='*/5 * * * * *' docker compose up -d appointment-service
python e2e/features.py
docker compose up -d appointment-service     # trả lại cấu hình thường
```

## Giao diện (`fe_smoke.mjs`)

`node e2e/fe_smoke.mjs` điều khiển Chrome headless (qua Chrome DevTools Protocol, dùng gói `ws` có sẵn trong `fe/node_modules`) đi trọn một ca khám bằng giao diện thật:
chủ nuôi đăng ký + thêm thú cưng + đặt lịch → lễ tân duyệt lịch, tiếp nhận khách, phân công → bác sĩ khám và chỉ định xét nghiệm + siêu âm → KTV xét nghiệm và KTV CĐHA nhập kết quả (có tải ảnh) → bác sĩ mời tái khám, kê đơn, chốt ca → lễ tân thu tiền, phát thuốc → chủ nuôi xem bệnh án → admin mở các trang quản trị → kiểm tra chặn quyền. In ra mọi lỗi console / HTTP ≥ 400 phát sinh.

Yêu cầu: stack đang chạy (`docker compose up -d`), Chrome cài sẵn (hoặc đặt `CHROME_PATH`), và giao diện ở cổng 3000 — hoặc đã `npm run build` trong `fe/` (script tự phục vụ thư mục `fe/build` nếu cổng 3000 trống). Biến tùy chọn: `API_URL`, `FE_PORT`.
Script tự tạo 4 tài khoản nhân sự (`0990000001..4`, mật khẩu `Smoke@1234`) nếu chưa có. **Tạo và để lại dữ liệu nghiệp vụ**: chạy `bash e2e/reset_data.sh` trước mỗi lần chạy lại (ca dở dang còn giữ bác sĩ ở trạng thái BUSY sẽ làm bước phân công thất bại).

## Lưu ý

- **Mỗi kịch bản xóa dữ liệu nghiệp vụ** (mọi người dùng trừ `admin`, thú cưng, lịch hẹn, đợt khám, hóa đơn...) và đặt lại tồn kho thuốc
  về dữ liệu mẫu. Chỉ chạy trên môi trường thử nghiệm.
- `features.py` thay đổi cấu hình xét nghiệm (thêm chỉ số HCT, đổi chỉ số của dịch vụ CBC). Nó tự dọn ở đầu lần chạy sau, nhưng nếu
  chạy `clinical.sh` ngay sau đó thì trước hết đặt lại: `docker compose down -v && docker compose up -d` hoặc chạy lại `features.py`.
- Lịch sử thông báo của notification-service nằm trong bộ nhớ nên còn lại giữa các lần chạy; `notification.py` đã lọc theo thời điểm chạy.
- `bash e2e/reset_data.sh` đưa dữ liệu về sạch (chỉ còn `admin` và dữ liệu mẫu) mà không cần dựng lại DB.
- Đầu ra tạm ghi vào `e2e/.tmp/` (bị bỏ qua khi commit).
