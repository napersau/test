# Kịch bản kiểm thử Use Case — Hệ thống Quản lý Phòng khám Thú y (VetClinic)

> Mục đích: tài liệu để nhóm **test thủ công** (Postman / curl / giao diện) từng chức năng, kèm API, dữ liệu vào và kết quả mong đợi.
> Tên trường, quyền và mã lỗi lấy từ code trong `vetclinic-backend/`. Dữ liệu mẫu lấy từ `docs/schema_init.sql`.
> Test tự động tương ứng nằm ở `e2e/` (xem mục 9).

---

## 0. Chuẩn bị môi trường

```bash
cp .env.example .env                 # lần đầu, điền JWT_SECRET (openssl rand -hex 32)
docker compose up -d --build
docker compose ps                    # mọi container phải "healthy"
```

**Hai chế độ dữ liệu**

| Chế độ | Cách có | Dùng khi |
|---|---|---|
| **Demo** (mặc định) | `docker compose down -v && docker compose up -d` (nạp `docs/schema_init.sql` PHẦN 5: 16 tài khoản, 16 thú cưng, 17 lịch hẹn, 20 đợt khám ở đủ trạng thái, 11 hóa đơn...) | Demo, và test hầu hết use case ở mục 3 đến 9 trên dữ liệu có sẵn (xem bản đồ ở mục 1.5) |
| **Sạch** | `bash e2e/reset_data.sh` (xóa dữ liệu demo, chỉ còn `admin` và danh mục gốc: 2 loài, 7 dịch vụ, 4 thuốc, 4 chỉ số) | Chạy test tự động `e2e/`, hoặc muốn tự tạo mọi thứ từ đầu theo đúng thứ tự mục 3 đến 7 |

Dữ liệu demo tính thời gian **tương đối so với lúc dựng DB** ("hôm nay" theo giờ VN). Hãy `down -v` rồi `up` ngay trước buổi demo để các lịch hẹn hôm nay và ngày mai còn hiệu lực.

| Thành phần | Địa chỉ |
|---|---|
| API Gateway (mọi lời gọi test đi qua đây) | `http://localhost:8080` |
| Giao diện | `http://localhost:3000` |
| Hộp thư thử (xem email xác nhận) | `http://localhost:8025` (chỉ khi chạy kèm `docker-compose.dev.yml`) |
| RabbitMQ UI (xem DLQ) | `http://localhost:15672` (file dev) |

**Quy ước trong tài liệu**

- `{{BASE}}` = `http://localhost:8080`. Mọi request (trừ các API public) có header `Authorization: Bearer {{token_<vai trò>}}` và `Content-Type: application/json`.
- Mọi phản hồi có dạng `ApiResponse`: `{ status, errorCode, message, data, timestamp }`. Cột "Mong đợi" ghi HTTP status và `errorCode` (nếu là lỗi).
- `{{xxx}}` là biến lấy từ phản hồi của bước trước (id, mã...). Mọi id gửi lên là số.
- `{{NGAY_MAI}}`, `{{HOM_NAY}}`: định dạng `yyyy-MM-dd`, **giờ Việt Nam**.
- Khung giờ hẹn hợp lệ (14 khung, mỗi khung 30 phút): sáng `08:00 08:30 09:00 09:30 10:00 10:30 11:00`, chiều `13:30 14:00 14:30 15:00 15:30 16:00 16:30`. Giờ khác → lỗi.
- Mật khẩu: 8–72 ký tự, có chữ và số. SĐT: đúng 10 số, bắt đầu bằng `0`.
- Chạy theo **thứ tự các mục**: dữ liệu của mục sau phụ thuộc mục trước.

---

## 1. Dữ liệu dùng để test

### 1.1. Danh mục gốc (luôn có, ở cả hai chế độ dữ liệu)

| Loại | Dữ liệu |
|---|---|
| Tài khoản gốc | `admin` / `Admin@123` (ADMIN, SĐT `0901234567`) |
| Loài (`species`) | id 1 = `DOG` (Chó), id 2 = `CAT` (Mèo) |
| Dịch vụ (`services`) | `EXAM_GEN` Khám tổng quát 100.000 · `VAC_7B` Vaccine 7 bệnh (chó) 150.000 · `VAC_4B` Vaccine 4 bệnh (mèo) 150.000 · `DEWORM` Tẩy giun 50.000 · `LAB_CBC` Xét nghiệm CBC 250.000 (LABORATORY) · `IMG_US_AB` Siêu âm ổ bụng 200.000 (IMAGING) · `IMG_XRAY` X-quang 180.000 (IMAGING) |
| Chỉ số xét nghiệm | `WBC` (10^9/L), `RBC` (10^12/L), `HGB` (g/dL), `PLT` (10^9/L). Dịch vụ `LAB_CBC` gồm cả 4 chỉ số |
| Khoảng tham chiếu **Chó** | WBC 6.00–17.00 · RBC 5.50–8.50 · HGB 12.00–18.00 · PLT 200–500 |
| Khoảng tham chiếu **Mèo** | WBC 5.50–19.50 · RBC 5.00–10.00 · HGB 8.00–15.00 · PLT 300–700 |
| Thuốc (`medicines`) | `MED_AMOX` Clavamox 250mg: giá 15.000, tồn 200, ngưỡng cảnh báo 20 · `MED_VANG_7B` Vaccine Vanguard: 180.000, tồn 50, ngưỡng 10 · `MED_PURE_4B` Vaccine Purevax (mèo): 190.000, tồn 40, ngưỡng 10 · `MED_DRON_DOG` Drontal Plus: 45.000, tồn 100, ngưỡng 15 |
| VAT | Mặc định 0% (chưa chốt tỉ lệ thực tế) nên `tổng = Σ thành tiền − chiết khấu` |

### 1.2. Tài khoản

**a) Tài khoản có sẵn ở chế độ Demo** (tên đăng nhập = SĐT; mật khẩu chung `Demo@1234`, riêng `admin` là `Admin@123`):

| Biến | Vai trò | Họ tên | SĐT | Số phòng | Ghi chú |
|---|---|---|---|---|---|
| `ADMIN` | `ADMIN` | Quản trị viên hệ thống | `admin` | – | |
| `LETAN` | `RECEPTIONIST` | Nguyễn Thị Lan | `0910000001` | – | Lễ tân / thu ngân chính |
| `LETAN2` | `RECEPTIONIST` | Ngô Thanh Tâm | `0910000008` | – | |
| `BS1` | `VETERINARIAN` | BS. Trần Văn An | `0910000002` | `P01` | Đang khám ca VIS-…-00012 (BUSY) |
| `BS2` | `VETERINARIAN` | BS. Lê Thị Bình | `0910000003` | `P02` | Có ca đã đủ kết quả: Khóa ưu tiên tái khám |
| `BS3` | `VETERINARIAN` | BS. Phạm Quốc Cường | `0910000006` | `P03` | Đang khám ca đã mở lại (BUSY) |
| `BS4` | `VETERINARIAN` | BS. Đặng Thu Hương | `0910000007` | `P04` | **Rảnh**, dùng để demo phân công |
| `BS5` | `VETERINARIAN` | BS. Võ Minh Tuấn | `0910000009` | `P05` | `INACTIVE` (không đăng nhập được, `AUTH_1108`) |
| `XN` | `LAB_TECHNICIAN` | KTV. Phạm Văn Xuân | `0910000004` | `XN01` | |
| `CDHA` | `IMAGING_TECHNICIAN` | KTV. Hoàng Thị Hà | `0910000005` | `CDHA01` | |
| `CHU_A` | `PET_OWNER` | Đỗ Minh Quân | `0920000001` | – | 3 thú cưng: Lucky, Mimi, Xoài |
| `CHU_B` | `PET_OWNER` | Vũ Thu Trang | `0920000002` | – | Bông, Kitty, Bống |
| `CHU_C` | `PET_OWNER` | Nguyễn Hoàng Nam | `0920000003` | – | Rex, Miu, Cốm |
| `CHU_D` | `PET_OWNER` | Trần Thị Mai | `0920000004` | – | Mực, Tom, Gấu |
| `CHU_E` | `PET_OWNER` | Lê Văn Hùng | `0920000005` | – | Bơ, Nhím, Chip |
| `CHU_F` | `PET_OWNER` | Phạm Ngọc Anh | `0920000006` | – | `LOCKED` (`AUTH_1107`), 1 thú cưng: Cún |

**b) Dữ liệu dùng cho các test TẠO MỚI** (mục 3.3, 3.6, 3.7). Dùng SĐT khác dải demo để không trùng. Ở chế độ Sạch thì có thể dùng luôn bảng (a) làm dữ liệu tạo mới.

| Biến | Vai trò (`roleCode`) | Họ tên | SĐT | Mật khẩu | Số phòng |
|---|---|---|---|---|---|
| `NEW_LETAN` | `RECEPTIONIST` | Lý Thị Hồng | `0930000011` | `Test@1234` | – |
| `NEW_BS` | `VETERINARIAN` | BS. Mai Văn Long | `0930000012` | `Test@1234` | `P11` |
| `NEW_BS2` | `VETERINARIAN` | BS. Cao Thị Nga | `0930000013` | `Test@1234` | `P12` |
| `NEW_XN` | `LAB_TECHNICIAN` | KTV. Đinh Văn Phúc | `0930000014` | `Test@1234` | `XN11` |
| `NEW_CDHA` | `IMAGING_TECHNICIAN` | KTV. Tạ Thị Quỳnh | `0930000015` | `Test@1234` | `CDHA11` |
| `NEW_CHU` | `PET_OWNER` (tự đăng ký) | Đỗ Minh Quân | `0930000001` | `Owner@1234` | – |
| `NEW_CHU2` | `PET_OWNER` (lễ tân tạo) | Vũ Thu Trang | `0930000002` | `Owner@1234` | – |

Email gợi ý để test thư xác nhận: `chua@example.com`, `chub@example.com` (xem ở Mailpit).

### 1.3. Thú cưng

**Có sẵn ở chế độ Demo** (id dùng trong URL; các biến `{{...}}` ở những mục sau lấy theo bảng này):

| Biến | id | Tên (loài) | Chủ | Đang ở trạng thái |
|---|---|---|---|---|
| `CHO_A` | 1 | Lucky (chó Golden) | CHU_A | Có đợt khám đang chờ (có hẹn đúng giờ) |
| `MEO_A` | 2 | Mimi (mèo Anh) | CHU_A | Đợt khám **cấp cứu** đang chờ |
| `CHO_B` | 3 | Bông (chó Poodle) | CHU_B | Đang chờ kết quả xét nghiệm và siêu âm |
| – | 4 | Kitty (mèo Ba Tư) | CHU_B | Chờ thanh toán (hóa đơn 705.000đ, đơn thuốc chưa phát) |
| – | 5 | Rex (chó Becgie) | CHU_C | Đang khám (BS1) |
| – | 6 | Miu (mèo tam thể) | CHU_C | Đã đủ kết quả, chờ bác sĩ mời tái khám (BS2) |
| – | 7 | Mực (chó Phú Quốc) | CHU_D | Chờ kết quả xét nghiệm sinh hóa và X-quang |
| – | 8 | Tom (mèo mướp) | CHU_D | Ca đã mở lại, đang khám (BS3) |
| `RANH_1` | 9 | Bơ (chó Corgi) | CHU_E | **Rảnh**, có lịch CONFIRMED hôm nay 16:30 để check-in |
| – | 10 | Nhím (hamster) | CHU_E | Chờ thanh toán (100.000đ, không có đơn thuốc) |
| – | 11 | Cốm (thỏ) | CHU_C | Đã thanh toán, chờ phát thuốc |
| – | 12 | Xoài (chó Husky) | CHU_A | Đợt khám vãng lai đang chờ |
| `RANH_2` | 13 | Bống (mèo Xiêm) | CHU_B | **Rảnh**, có lịch CONFIRMED hôm nay 16:00 để check-in |
| – | 14 | Gấu (chó Samoyed) | CHU_D | Có hẹn nhưng đến trễ, đang chờ |
| `RANH_3` | 15 | Cún (chó cỏ) | CHU_F (bị khóa) | Rảnh |
| `RANH_4` | 16 | Chip (vẹt) | CHU_E | Rảnh, có lịch PENDING ngày mai |

**Dùng cho test tạo mới (chế độ Sạch, hoặc tạo thêm ở chế độ Demo):**

| Biến | Chủ | Dữ liệu |
|---|---|---|
| `NEW_CHO` | NEW_CHU | `speciesId:1, name:"Lucky", breed:"Golden Retriever", gender:"MALE", color:"Vàng", weight:28.5, neutered:true` |
| `NEW_MEO` | NEW_CHU | `speciesId:2, name:"Mimi", breed:"Mèo Anh lông ngắn", gender:"FEMALE", color:"Xám", weight:4.2, neutered:false` |
| `NEW_CHO_B` | NEW_CHU2 | `speciesId:1, name:"Bông", breed:"Poodle", gender:"FEMALE", color:"Trắng", weight:5.0, neutered:true` |

### 1.4. Bộ giá trị biên cho test lỗi

| Trường | Giá trị sai cần thử |
|---|---|
| SĐT | `091000000` (9 số), `09100000011` (11 số), `abc`, rỗng |
| Mật khẩu | `abc12` (ngắn), `abcdefgh` (không có số), `12345678` (không có chữ), chuỗi > 72 ký tự |
| Email | `khongphaiemail` |
| Giờ hẹn | `08:15`, `12:00`, `07:00`, `17:00` |
| Cân nặng khám | `0`, `0.05`, `-1` ; thân nhiệt `30`, `50` (ngoài khoảng 35–43 °C) |
| Chỉ số xét nghiệm | `-1`, bỏ trống, chỉ số không thuộc dịch vụ |
| Số lượng thuốc | `0`, `-1`, `10001` ; `durationDays`: `0`, `366` |
| Ảnh CĐHA | File `.txt` đổi đuôi `.jpg`, file > 20 MB |

### 1.5. Bản đồ dữ liệu Demo → use case (bấm thử ngay, không cần chuẩn bị)

| Muốn demo | Đăng nhập | Dùng dữ liệu | Thao tác |
|---|---|---|---|
| Duyệt / từ chối lịch hẹn (UC-17) | `LETAN` | 4 lịch **PENDING** (hàng chờ duyệt) | Lịch hẹn → chờ duyệt → Duyệt, hoặc Từ chối kèm lý do; chủ nuôi nhận thông báo và email |
| Check-in có hẹn (UC-19) | `LETAN` | Lịch **CONFIRMED hôm nay** của Bơ (16:30) và Bống (16:00) | Tiếp đón → chọn lịch → Check-in (lịch đã quá giờ sẽ bị hệ thống chuyển NO_SHOW sau 30 phút, nên dựng DB đúng ngày demo) |
| Check-in vãng lai (UC-19) | `LETAN` | `RANH_3` Cún, `RANH_4` Chip | Tiếp đón → vãng lai; thử cả cờ cấp cứu |
| Hàng đợi 3 bậc (UC-20) | `LETAN` | 4 ca WAITING: **cấp cứu** (Mimi) → **có hẹn đúng giờ** (Lucky) → vãng lai (Xoài) → đến trễ (Gấu) | Xem thứ tự hàng đợi |
| Phân công bác sĩ (UC-21) | `LETAN` | Chỉ **BS4** rảnh; BS1, BS3 đang BUSY; BS2 có Khóa ưu tiên | Gán ca cấp cứu cho BS4; gán ca thứ hai cho BS4 → `CLIN_1302`; gán cho BS2 → `CLIN_1303` |
| Khám, chỉ định, kê đơn, chốt ca (UC-22, 23, 31, 32) | `BS1` | Ca Rex (`IN_PROGRESS`, đã có khám + trị ve bọ chét) | Thêm dịch vụ, kê đơn, chốt ca |
| Mời tái khám, Khóa ưu tiên (UC-28..30, EX-10) | `BS2` | Ca Miu `RESULTS_READY` | Mời tái khám hoặc tạm hoãn; popup đỏ kèm số phòng |
| Mở lại ca (T12) | `ADMIN` | Ca Tom là ca đã mở lại (hóa đơn cũ `CANCELLED`) để xem kết quả. Muốn thử mở: chốt ca Rex hoặc Miu rồi mở khi chưa thu tiền | Đợt khám → Mở lại, bắt buộc lý do |
| Hàng đợi xét nghiệm (UC-24, 25) | `XN` | CBC của Bông (`NEXT_IN_LINE`), sinh hóa của Mực (tab **Hoãn**) | Bắt đầu → nhập kết quả (khoảng tham chiếu theo **loài**); sinh hóa gồm ALT, CREA, GLU, BUN |
| Hàng đợi CĐHA (UC-26, 27) | `CDHA` | Siêu âm Bông (chờ), X-quang Mực (đang làm) | Nhập mô tả, kết luận, tải ảnh |
| Xem kết quả kèm ảnh, bệnh án (UC-38, 39) | `CHU_A`, `BS1` | Mimi, Bông, Rex, Kitty, Miu đều có siêu âm hoặc X-quang kèm ảnh mẫu | Hồ sơ → lịch sử khám; xem và tải ảnh |
| Thu ngân (UC-33..35) | `LETAN` | 3 hóa đơn **PENDING**: ca Tom bỏ về (nợ 350.000), Kitty 705.000 (kèm đơn thuốc), Nhím 100.000 | Chiết khấu, thanh toán, hủy hóa đơn |
| Phát thuốc (UC-36) | `LETAN` | Đơn của Cốm (đã thanh toán, chờ phát). Thanh toán hóa đơn Kitty thì đơn Kitty cũng vào hàng đợi; phát xong Oresol còn 3 → cảnh báo sắp hết gửi Admin | Phát thuốc → ca chuyển `COMPLETED` |
| Khách bỏ về (EX-11) | `LETAN` | Xem ca Tom trước đó: `COMPLETED`, hóa đơn nợ `PENDING`, đơn thuốc `CANCELLED`. Muốn thử mới: ca Miu `RESULTS_READY` → `abandon` | |
| Quản lý người dùng | `ADMIN` | 16 tài khoản gồm `INACTIVE` (BS5) và `LOCKED` (CHU_F) | Mở khóa, đổi vai trò, đặt lại mật khẩu |
| Danh mục dịch vụ, chỉ số xét nghiệm | `ADMIN` | 14 dịch vụ đủ 9 nhóm (IMG_CT đã ngừng), 8 chỉ số, 5 loài | Sửa giá, bật/tắt, thêm khoảng tham chiếu |
| Kho thuốc | `ADMIN` | 9 thuốc: Oresol tồn 8 (sắp hết), Metronidazole đã ngừng kinh doanh; nhật ký 19 giao dịch | Nhập kho, cân chỉnh, xem nhật ký |
| Báo cáo | `ADMIN` | Doanh thu 7 hóa đơn đã thu (3.210.000đ) trong 14 ngày; 20 đợt khám; 17 lịch hẹn | Doanh thu theo ngày/tuần/tháng, vận hành, tỉ lệ vắng mặt và hủy |
| Đặt lịch của chủ nuôi (UC-14) | `CHU_E` | Bơ (rảnh); ngày mai đã có lịch ở khung 09:00 và 13:30 | Đặt lịch, đổi giờ, hủy (cách giờ hẹn < 2 giờ bị chặn) |

---

## 2. Ma trận vai trò – chức năng (để test phân quyền)

| Chức năng | ADMIN | RECEPTIONIST | VETERINARIAN | LAB_TECH | IMAGING_TECH | PET_OWNER |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Quản lý người dùng, đổi vai trò, khóa tài khoản | ✔ | tạo/tìm chủ nuôi, đặt lại MK chủ nuôi | – | – | – | – |
| Danh mục dịch vụ, loài, chỉ số XN | ✔ ghi | đọc | đọc | đọc | đọc | đọc loài |
| Đặt lịch hẹn | – | ✔ (thay khách) | – | – | – | ✔ |
| Duyệt/từ chối/vắng mặt lịch | – | ✔ | – | – | – | hủy/đổi lịch của mình |
| Check-in, phân công bác sĩ | – | ✔ | – | – | – | – |
| Khám, chỉ định, chốt ca | – | – | ✔ | – | – | – |
| Hàng đợi + nhập kết quả Lab | xem | – | xem | ✔ | – | – |
| Hàng đợi + nhập kết quả CĐHA | xem | – | xem | – | ✔ | – |
| Kê đơn thuốc | – | – | ✔ | – | – | xem đơn của mình |
| Hóa đơn, thanh toán, phát thuốc | ✔ | ✔ | – | – | – | – |
| Kho thuốc, nhập/cân chỉnh | ✔ | đọc | đọc | – | – | – |
| Mở lại đợt khám | ✔ | – | – | – | – | – |
| Báo cáo | ✔ | – | – | – | – | – |

---

## 3. Xác thực & người dùng (auth-service)

### 3.1. UC Đăng nhập — `POST /api/v1/auth/login` (public)

| # | Dữ liệu vào | Mong đợi |
|---|---|---|
| 3.1.1 | `{"username":"admin","password":"Admin@123"}` | 200, `data.accessToken`, `data.refreshToken`, hồ sơ có `role:"ADMIN"` |
| 3.1.2 | `{"username":"admin","password":"SaiMatKhau1"}` | 401 `AUTH_1103` |
| 3.1.3 | `{"username":"khongtontai","password":"Admin@123"}` | 401 `AUTH_1103` (**cùng thông báo** với 3.1.2, không lộ tài khoản có tồn tại hay không) |
| 3.1.4 | Sai mật khẩu 5 lần liên tiếp với cùng username, rồi đăng nhập lại | Lần thứ 6: 429 `AUTH_1112`, khóa 15 phút (kể cả khi nhập đúng mật khẩu) |
| 3.1.5 | Thiếu `password` | 400 `SYS_1001` |
| 3.1.6 | Đăng nhập tài khoản đã bị khóa/ngừng (mục 3.8) với mật khẩu **đúng** | 403 `AUTH_1107` (khóa) hoặc `AUTH_1108` (ngừng hoạt động); với mật khẩu sai vẫn là `AUTH_1103` |

Lưu `accessToken` thành `{{token_admin}}`, `{{token_letan}}`, ... cho các bước sau.

### 3.2. Refresh / Logout

| # | API | Dữ liệu | Mong đợi |
|---|---|---|---|
| 3.2.1 | `POST /api/v1/auth/refresh` | `{"refreshToken":"{{rt}}"}` | 200, cặp token mới; token cũ **hết hiệu lực** |
| 3.2.2 | `POST /api/v1/auth/refresh` | dùng lại `{{rt}}` cũ ở 3.2.1 | 401 `AUTH_1105`; coi là đánh cắp → **mọi phiên của người này bị thu hồi** (refresh token mới cũng hỏng) |
| 3.2.3 | `POST /api/v1/auth/logout` | `{"refreshToken":"{{rt}}"}` | 200; refresh lại bằng token đó → 401 |
| 3.2.4 | Gọi API với access token hết hạn / sai chữ ký / bỏ trống header | Mọi API nghiệp vụ | 401 ngay tại Gateway |

### 3.3. Tự đăng ký chủ nuôi — `POST /api/v1/auth/register` (public)

| # | Dữ liệu vào | Mong đợi |
|---|---|---|
| 3.3.1 | `{"fullName":"Đỗ Minh Quân","phoneNumber":"0930000001","password":"Owner@1234","email":"chua@example.com","address":"12 Lê Lợi, Hà Nội"}` | 201, vai trò `PET_OWNER`, `ACTIVE`, tên đăng nhập = SĐT |
| 3.3.2 | Cùng body, thêm `"roleCode":"ADMIN","username":"hacker"` | 201 nhưng vẫn là `PET_OWNER`, tên đăng nhập = SĐT (hai trường thừa bị bỏ qua) |
| 3.3.3 | Đăng ký lại cùng SĐT | 409 `AUTH_1102` |
| 3.3.4 | SĐT/mật khẩu/email sai định dạng (mục 1.4) | 400 `SYS_1001` |

### 3.4. Hồ sơ cá nhân — `GET/PUT /api/v1/auth/me`

| # | API | Dữ liệu | Mong đợi |
|---|---|---|---|
| 3.4.1 | `GET /me` (mọi vai trò) | – | 200, thông tin của chính mình |
| 3.4.2 | `PUT /me` (bằng `NEW_CHU`) | `{"fullName":"Đỗ Minh Quân","phoneNumber":"0930000001","email":"quan.new@example.com","address":"34 Hai Bà Trưng"}` | 200, dữ liệu đã đổi |
| 3.4.3 | `PUT /me` | `{"phoneNumber":"123"}` | 400 `SYS_1001` |

### 3.5. Đổi mật khẩu — `POST /api/v1/auth/change-password`

| # | Dữ liệu vào | Mong đợi |
|---|---|---|
| 3.5.1 | `{"currentPassword":"Owner@1234","newPassword":"Owner@5678"}` (bằng `NEW_CHU`) | 200; **mọi refresh token cũ bị thu hồi**; đăng nhập bằng mật khẩu cũ thất bại, mật khẩu mới thành công |
| 3.5.2 | `currentPassword` sai | 400 `AUTH_1111`, mật khẩu không đổi |
| 3.5.3 | `newPassword` = `abcdefgh` | 400 `SYS_1001` |

Sau bước này đổi lại về `Owner@1234`. Làm bằng `NEW_CHU`, không dùng tài khoản demo để khỏi đổi mật khẩu chung.

### 3.6. Lễ tân tạo / tìm tài khoản chủ nuôi — `POST|GET /api/v1/auth/users`

| # | Vai trò | API + dữ liệu | Mong đợi |
|---|---|---|---|
| 3.6.1 | LETAN | `POST /users` `{"fullName":"Vũ Thu Trang","phoneNumber":"0930000002","password":"Owner@1234","email":"chub@example.com","roleCode":"PET_OWNER"}` | 201; `username` bỏ trống → = SĐT |
| 3.6.2 | LETAN | `POST /users` với `"roleCode":"VETERINARIAN"` | Bị từ chối (lễ tân chỉ tạo được `PET_OWNER`) |
| 3.6.3 | LETAN | `GET /users?keyword=0920` (chế độ Demo: thấy 6 chủ nuôi) | 200, chỉ thấy `PET_OWNER` (ép lọc), không thấy nhân sự |
| 3.6.4 | CHU_A | `GET /users` | 403 |

### 3.7. Admin tạo nhân sự — `POST /api/v1/auth/users`

Gọi bằng `{{token_admin}}`, mỗi dòng `NEW_*` trong bảng mục 1.2(b). Ví dụ bác sĩ:

```json
{ "fullName": "BS. Mai Văn Long", "phoneNumber": "0930000012", "password": "Test@1234",
  "email": "long.mai@vetclinic.com", "roleCode": "VETERINARIAN", "roomNumber": "P11" }
```

| # | Kiểm tra | Mong đợi |
|---|---|---|
| 3.7.1 | Tạo đủ 5 nhân sự `NEW_*` (lễ tân, 2 bác sĩ, KTV xét nghiệm, KTV CĐHA) | 201 cho từng tài khoản |
| 3.7.2 | Tạo tài khoản mới với `roomNumber:"P01"` (đã gán cho `BS1` ở chế độ Demo; chế độ Sạch thì tạo hai lần với cùng số phòng) | 409 `AUTH_1113` (số phòng là duy nhất) |
| 3.7.3 | `roomNumber:"P 01!"` | 400 (chỉ chữ, số, `_`, `-`, tối đa 20 ký tự) |
| 3.7.4 | `GET /users/doctors` (ADMIN, LETAN) | 200, danh sách bác sĩ `ACTIVE` |
| 3.7.5 | `GET /users/{id}` bằng BS1 (id của người khác) | 200 (nhân sự y tế được xem); CHU_A gọi → 403 |

### 3.8. Admin quản trị tài khoản

| # | API | Dữ liệu | Mong đợi |
|---|---|---|---|
| 3.8.1 | `PUT /users/{id}` | `{"fullName":"BS. Trần Văn An","roomNumber":"P03"}` | 200 |
| 3.8.2 | `POST /users/{id}/status` | `{"status":"INACTIVE"}` với BS2 | 200; mọi refresh token của BS2 bị thu hồi; BS2 không đăng nhập được; **sức chứa khung giờ giảm 1** (mục 5.1) |
| 3.8.3 | `POST /users/{id}/status` | `{"status":"ACTIVE"}` với BS2 | 200; sức chứa tăng lại |
| 3.8.4 | `POST /users/{adminId}/status` | `{"status":"INACTIVE"}` với **chính admin** | 400 `AUTH_1114` (không tự khóa mình) |
| 3.8.5 | `POST /users/{id}/role` | `{"roleCode":"LAB_TECHNICIAN"}` với một nhân sự | 200; refresh token bị thu hồi; số phòng bị xóa nếu vai trò mới không có phòng cố định |
| 3.8.6 | `POST /users/{adminId}/role` | đổi vai trò của chính mình | 400 `AUTH_1114` |
| 3.8.7 | `POST /users/{CHU_A id}/role` | `{"roleCode":"VETERINARIAN"}` | Bị từ chối (không đổi từ/sang `PET_OWNER`) |
| 3.8.8 | `POST /users/{id}/reset-password` (ADMIN, mọi tài khoản) | `{"newPassword":"Tam@12345"}` | 200; refresh token bị thu hồi; đăng nhập bằng mật khẩu tạm thành công |
| 3.8.9 | `POST /users/{CHU_A id}/reset-password` (LETAN) | như trên | 200 (lễ tân chỉ đặt lại cho chủ nuôi) |
| 3.8.10 | `POST /users/{BS1 id}/reset-password` (LETAN) | như trên | 403 |
| 3.8.11 | Đặt lại mật khẩu của chính mình | – | Bị từ chối |

---

## 4. Danh mục (clinical-service, billing-pharmacy-service)

### 4.1. Loài thú cưng — `/api/v1/species`

| # | Vai trò | API + dữ liệu | Mong đợi |
|---|---|---|---|
| 4.1.1 | CHU_A | `GET /species` | 200, có `DOG`, `CAT` |
| 4.1.2 | ADMIN | `POST /species` `{"code":"RABBIT","name":"Thỏ","description":"Thỏ cảnh"}` | 201 |
| 4.1.3 | ADMIN | `POST /species` cùng `code` | 409 `CLIN_1318` |
| 4.1.4 | ADMIN | `PUT /species/{id}` `{"code":"RABBIT","name":"Thỏ cảnh","description":"..."}` | 200 |
| 4.1.5 | LETAN | `POST /species` | 403 |

### 4.2. Dịch vụ — `/api/v1/clinical/services`

| # | Vai trò | API + dữ liệu | Mong đợi |
|---|---|---|---|
| 4.2.1 | LETAN | `GET /clinical/services` | 200, 7 dịch vụ mẫu |
| 4.2.2 | ADMIN | `POST /clinical/services` `{"code":"BATH","name":"Tắm vệ sinh","category":"PROCEDURE","price":120000,"description":"Tắm và sấy"}` | 201 |
| 4.2.3 | ADMIN | `PUT /clinical/services/{id}` `{"name":"Tắm vệ sinh cao cấp","price":150000,"active":false}` | 200; dịch vụ ngừng dùng không được chỉ định mới, **không xóa cứng** |
| 4.2.4 | ADMIN | `price: -1` | 400 `SYS_1001` |
| 4.2.5 | BS1 | `POST /clinical/services` | 403 |

`category` hợp lệ: `EXAMINATION, VACCINATION, DEWORMING, EXTERNAL_PARASITE, INJECTION_INFUSION, LABORATORY, IMAGING, SURGERY, PROCEDURE`.

### 4.3. Chỉ số xét nghiệm & khoảng tham chiếu (UC-05, UC-06)

| # | Vai trò | API + dữ liệu | Mong đợi |
|---|---|---|---|
| 4.3.1 | XN | `GET /clinical/lab-test-items` | 200, 4 chỉ số kèm khoảng theo loài |
| 4.3.2 | ADMIN | `POST /clinical/lab-test-items` `{"code":"HCT","name":"Hematocrit","unit":"%","description":"Dung tích hồng cầu","ranges":[{"speciesId":1,"minValue":37,"maxValue":55},{"speciesId":2,"minValue":30,"maxValue":45}]}` | 201 |
| 4.3.3 | ADMIN | `PUT /clinical/lab-test-items/{id}` `{"name":"Hematocrit (HCT)","unit":"%","description":"..."}` | 200, `code` bất biến |
| 4.3.4 | ADMIN | `PUT /clinical/lab-test-items/{id}/ranges/1` `{"minValue":35,"maxValue":52}` | 200; **kết quả cũ giữ nguyên khoảng cũ** (snapshot) |
| 4.3.5 | ADMIN | `minValue` > `maxValue` | Lỗi, không lưu |
| 4.3.6 | ADMIN | `PUT /clinical/services/{LAB_CBC id}/lab-test-items` `{"labTestItemIds":[1,2,3,4]}` | 200 (gửi `[]` = dịch vụ gồm **mọi** chỉ số) |
| 4.3.7 | ADMIN | `PUT /clinical/services/{EXAM_GEN id}/lab-test-items` | Lỗi (chỉ dịch vụ `LABORATORY`) |
| 4.3.8 | LETAN | `GET /clinical/services/{LAB_CBC id}/lab-test-items` | 200 |

### 4.4. Kho thuốc (UC kho dược) — `/api/v1/pharmacy/medicines`

| # | Vai trò | API + dữ liệu | Mong đợi |
|---|---|---|---|
| 4.4.1 | BS1 | `GET /pharmacy/medicines?keyword=amox` | 200; chỉ thấy thuốc đang kinh doanh |
| 4.4.2 | ADMIN | `GET /pharmacy/medicines?lowStock=true` | 200, thuốc có tồn ≤ ngưỡng |
| 4.4.3 | ADMIN | `POST /pharmacy/medicines` `{"code":"MED_PARA","name":"Paracetamol 500mg","activeIngredient":"Paracetamol","dosageForm":"Viên nén","unit":"Viên","salePrice":2000,"initialStock":100,"minStockAlert":10}` | 201 |
| 4.4.4 | ADMIN | `POST /pharmacy/medicines` cùng `code` | Lỗi trùng mã |
| 4.4.5 | ADMIN | `PUT /pharmacy/medicines/{id}` `{"name":"Paracetamol 500mg","dosageForm":"Viên nén","unit":"Viên","salePrice":2500,"minStockAlert":15,"active":true}` | 200; **tồn kho không bị đổi** |
| 4.4.6 | ADMIN | `POST /pharmacy/medicines/{id}/import` `{"quantity":50,"notes":"Nhập lô tháng 10"}` | 200, tồn +50; có dòng `IMPORT` trong nhật ký |
| 4.4.7 | ADMIN | `POST .../import` `{"quantity":0}` | 400 |
| 4.4.8 | ADMIN | `POST .../adjust` `{"delta":-5,"reason":"Hao hụt kiểm kê"}` | 200, tồn −5 |
| 4.4.9 | ADMIN | `POST .../adjust` `{"delta":-99999,"reason":"Thử âm kho"}` | Lỗi `PHARM_1412`, tồn không đổi |
| 4.4.10 | ADMIN | `POST .../adjust` `{"delta":0,"reason":"x"}` hoặc thiếu `reason` | 400 |
| 4.4.11 | ADMIN | `GET .../{id}/transactions` | 200, nhật ký nhập/xuất/cân chỉnh |
| 4.4.12 | LETAN | `POST .../import` | 403 |
| 4.4.13 | ADMIN | `PUT` với `"active":false` | Thuốc ngừng kinh doanh; bác sĩ/lễ tân không còn thấy, **không kê được** |

---

## 5. Thú cưng & đặt lịch hẹn

> **Chế độ Demo:** `CHO_A`, `MEO_A`, `CHO_B` đã có đợt khám đang mở, và Lucky đã có lịch hôm nay. Khi cần thú cưng "rảnh" để đặt lịch hoặc check-in, dùng `RANH_1..RANH_4` (mục 1.3), hoặc tạo thú cưng mới bằng `NEW_CHU`. Các test báo lỗi trùng (ví dụ 5.3.3, 6.1.4) có thể làm ngay trên dữ liệu có sẵn.

### 5.1. Khung giờ — `GET /api/v1/appointments/slots?date={{NGAY_MAI}}`

| # | Điều kiện | Mong đợi |
|---|---|---|
| 5.1.1 | Mọi vai trò đã đăng nhập | 200, **14 khung** với `capacity, booked, remaining, available, past` |
| 5.1.2 | Có 2 bác sĩ `ACTIVE` (BS1, BS2) | `capacity = 2` cho mọi khung |
| 5.1.3 | Khóa BS2 (3.8.2) rồi gọi lại | `capacity = 1` ngay |
| 5.1.4 | Chưa có bác sĩ `ACTIVE` | Mọi khung `available:false` |
| 5.1.5 | `date` là hôm nay | Các khung đã qua giờ có `past:true` |

### 5.2. Hồ sơ thú cưng (UC-12, UC-13) — `/api/v1/pets`

| # | Vai trò | API + dữ liệu | Mong đợi |
|---|---|---|---|
| 5.2.1 | CHU_A | `POST /pets` `{"speciesId":1,"name":"Lucky","breed":"Golden Retriever","gender":"MALE","color":"Vàng","weight":28.5,"neutered":true,"identifyingCharacteristics":"Vết đen tai trái","notes":"Dị ứng hải sản"}` | 201, mã `PET-yyyy-NNNNN`, `ownerId` = CHU_A (dù body có gửi `ownerId` khác) |
| 5.2.2 | CHU_A | `POST /pets` cho `MEO_A` | 201 |
| 5.2.3 | CHU_B | `POST /pets` cho `CHO_B` | 201 |
| 5.2.4 | LETAN | `POST /pets` `{"ownerId":{{CHU_A.id}},...}` | 201; thiếu `ownerId` → 400; `ownerId` không phải `PET_OWNER` → lỗi |
| 5.2.5 | CHU_A | `GET /pets` | Chỉ thấy 2 thú của mình |
| 5.2.6 | CHU_A | `GET /pets/{CHO_B id}` | 404 `APPT_1201` (không lộ sự tồn tại) |
| 5.2.7 | LETAN | `GET /pets?keyword=Lucky&ownerId={{CHU_A.id}}` | 200, lọc đúng |
| 5.2.8 | CHU_A | `PUT /pets/{id}` `{"weight":29.0,"color":"Vàng nâu"}` | 200; `speciesId` không đổi được |
| 5.2.9 | CHU_A | `weight: 200` hoặc `name` rỗng | 400 `SYS_1001` |
| 5.2.10 | BS1 | `GET /pets/{id}/visits` | 200, danh sách đợt khám |

### 5.3. Chủ nuôi đặt lịch (UC-14) — `POST /api/v1/appointments`

| # | Vai trò | Dữ liệu | Mong đợi |
|---|---|---|---|
| 5.3.1 | CHU_A | `{"petId":{{CHO_A}},"appointmentDate":"{{NGAY_MAI}}","startTime":"09:00","reason":"Tiêm phòng định kỳ"}` | 201, mã `APT-yyyyMMdd-NNNNN`, `status:"PENDING"`, `bookingChannel:"ONLINE"`; lễ tân nhận thông báo; chủ nuôi nhận thông báo + email |
| 5.3.2 | CHU_A | Thêm `"ownerId":9999,"bookingChannel":"PHONE"` | Hai trường này bị bỏ qua |
| 5.3.3 | CHU_A | Đặt thêm **một lịch nữa cho `CHO_A` cùng ngày**, khung `10:00` | 409 `APPT_1207` (một thú cưng một lịch/ngày) |
| 5.3.4 | CHU_A | `petId` = `CHO_B` (thú của người khác) | `APPT_1201` |
| 5.3.5 | CHU_A | `startTime:"08:15"` hoặc ngày trong quá khứ | Lỗi |
| 5.3.6 | CHU_A | Thiếu `reason` | 400 `SYS_1001` |
| 5.3.7 | CHU_A | Khung đã đủ `capacity` (đặt đủ 2 lịch ở một khung cho 2 thú khác nhau, lịch thứ 3) | 409 `APPT_1203` |
| 5.3.8 | BS1 | `POST /appointments` | 403 |

### 5.4. Lễ tân đặt thay (UC-16)

| # | Dữ liệu | Mong đợi |
|---|---|---|
| 5.4.1 | `{"petId":{{MEO_A}},"ownerId":{{CHU_A.id}},"bookingChannel":"PHONE","appointmentDate":"{{NGAY_MAI}}","startTime":"09:30","reason":"Mèo bỏ ăn"}` | 201, `status:"CONFIRMED"` ngay |
| 5.4.2 | Cùng body, `"bookingChannel":"WALK_IN"` | 201 |
| 5.4.3 | Thiếu `ownerId` | 400 |
| 5.4.4 | `ownerId` của tài khoản đã bị khóa hoặc không phải `PET_OWNER` | Lỗi |
| 5.4.5 | `petId` không thuộc `ownerId` | `APPT_1201` |

### 5.5. Duyệt hàng chờ (UC-17) và vòng đời lịch hẹn

| # | Vai trò | API + dữ liệu | Mong đợi |
|---|---|---|---|
| 5.5.1 | LETAN | `GET /appointments?status=PENDING&sortBy=createdAt&ascending=true` | Hàng chờ duyệt, cũ nhất trước; có `petName, ownerName, ownerPhone` |
| 5.5.2 | LETAN | `POST /appointments/{id}/confirm` | `PENDING → CONFIRMED`; **chủ nuôi nhận thông báo** "Lịch hẹn đã được xác nhận" + email |
| 5.5.3 | LETAN | Bấm confirm lần 2 | Lỗi chuyển trạng thái, không tạo bản ghi trùng |
| 5.5.4 | LETAN | `POST /appointments/{id}/cancel` `{"reason":"Phòng khám bảo trì thiết bị"}` | `CANCELLED`; chủ nuôi nhận thông báo cảnh báo **kèm lý do**; trả lại chỗ cho khung giờ |
| 5.5.5 | LETAN | `cancel` thiếu `reason` | 400 `SYS_1001` |
| 5.5.6 | LETAN | `POST /appointments/{id}/reschedule` `{"newDate":"{{NGAY_MAI}}","newStartTime":"10:00","reason":"Bác sĩ đi công tác"}` | 200, giữ nguyên trạng thái; chủ nuôi nhận thông báo "dời giờ"; lịch sử ghi `from = to` |
| 5.5.7 | CHU_A | `cancel` lịch của mình, hẹn còn ≥ 2 giờ | `CANCELLED`; **không** gửi thông báo ngược lại cho chính mình |
| 5.5.8 | CHU_A | `cancel` hoặc `reschedule` khi còn < 2 giờ nữa là tới giờ hẹn | 409 `APPT_1204` (lễ tân không bị giới hạn này) |
| 5.5.9 | CHU_A | `cancel`/`GET` lịch của CHU_B | 404 `APPT_1202` |
| 5.5.10 | LETAN | `POST /appointments/{id}/no-show` | `CONFIRMED → NO_SHOW`; chủ nuôi nhận thông báo cảnh báo |
| 5.5.11 | LETAN/ADMIN | `GET /appointments/{id}/history` | Audit trail; `changedByUserId = null` = hệ thống |
| 5.5.12 | CHU_A | `GET /appointments/{id}/history` | 403 |
| 5.5.13 | LETAN | `GET /appointments?fromDate=..&toDate=..&status=CONFIRMED&code=APT-` | 200, phân trang, lọc đúng |

### 5.6. Tác vụ tự động (EX-01)

| # | Kịch bản | Mong đợi |
|---|---|---|
| 5.6.1 | Lịch `CONFIRMED` đã qua giờ **kết thúc khung + 30 phút**, chưa check-in | Tự chuyển `NO_SHOW` (quét mỗi 15 phút, 7h–21h); chủ nuôi nhận thông báo |
| 5.6.2 | Lịch `PENDING` đã qua giờ kết thúc khung mà chưa ai duyệt | Tự `CANCELLED`, lý do "Quá giờ hẹn mà phòng khám chưa xác nhận", trả chỗ |
| 5.6.3 | Lịch `PENDING` quá hạn không bị chuyển `NO_SHOW` | Đúng |
| 5.6.4 | Muốn thử nhanh | Khởi động appointment-service với `BOOKING_PENDING_EXPIRY_CRON='*/5 * * * * *'` hoặc `BOOKING_NO_SHOW_CRON` |

### 5.7. Chống đặt trùng khi đồng thời

Gửi **8 request song song** `POST /appointments` (8 thú cưng khác nhau) vào một khung giờ có sức chứa 2: đúng **2 thành công**, 6 lỗi `APPT_1203`. Gửi 5 request song song cho **cùng một thú cưng** ở 5 khung khác nhau cùng ngày: đúng 1 thành công.

---

## 6. Tiếp đón & khám bệnh (clinical-service)

> Điều kiện chạy mục này: có BS1, BS2 `ACTIVE`; thú cưng đã tạo. **Chế độ Demo:** Lucky, Mimi, Bông đã có đợt khám đang mở nên thay vào đó dùng `RANH_1..RANH_4` (Bơ, Bống, Cún, Chip) cho check-in mới, hoặc làm tiếp trên các ca có sẵn theo bản đồ ở mục 1.5.
> Check-in lịch hẹn chỉ nhận lịch `CONFIRMED` **đúng ngày hôm nay**. Để test, đặt lịch cho hôm nay ở khung chưa qua giờ (trong giờ làm việc), hoặc dùng khách vãng lai.

### 6.1. Check-in (UC-19) — `POST /api/v1/clinical/pet-visits/check-in`

| # | Dữ liệu | Mong đợi |
|---|---|---|
| 6.1.1 | Khách vãng lai: `{"petId":{{CHO_B}},"initialSymptoms":"Ho, bỏ ăn 2 ngày"}` | 201, mã ca `VIS-...`, `status:"WAITING"` |
| 6.1.2 | Khách có hẹn: `{"appointmentId":{{LICH_HOM_NAY}}}` | 201; lịch hẹn tự chuyển `CHECKED_IN` (kiểm tra `GET /appointments/{id}` sau vài giây) |
| 6.1.3 | Cấp cứu: `{"petId":{{MEO_A}},"emergency":true,"initialSymptoms":"Co giật"}` | 201; bác sĩ nhận thông báo CRITICAL; ca lên đầu hàng đợi |
| 6.1.4 | Check-in lại thú cưng đang có đợt khám mở | 409 `CLIN_1306` |
| 6.1.5 | Check-in lại lịch hẹn đã dùng | `CLIN_1306` |
| 6.1.6 | `appointmentId` của lịch `PENDING`, `CANCELLED` hoặc không phải hôm nay | Lỗi |
| 6.1.7 | Không gửi cả `petId` lẫn `appointmentId` | 400 |
| 6.1.8 | 6 request song song cho cùng một thú cưng | Đúng 1 thành công |
| 6.1.9 | CHU_A / BS1 gọi check-in | 403 |

### 6.2. Hàng đợi 3 bậc (UC-20)

`GET /api/v1/clinical/pet-visits/queue` (LETAN).

Chuẩn bị: check-in theo thứ tự (1) khách vãng lai X, (2) khách có hẹn đến đúng khung Y, (3) ca cấp cứu Z, (4) khách có hẹn nhưng **đến sau khi hết khung giờ** T.

| # | Mong đợi |
|---|---|
| 6.2.1 | Thứ tự: **Z** (cấp cứu) → **Y** (có hẹn đúng khung, `scheduledAt` ≠ null) → **X**, **T** theo giờ check-in (T có lịch sử "đến trễ", `scheduledAt = null`) |
| 6.2.2 | Ca đến sớm hơn giờ hẹn vẫn tính "đúng giờ" |
| 6.2.3 | `GET /pet-visits?status=WAITING&date={{HOM_NAY}}&keyword=VIS-` | 200, phân trang, `size` tối đa 100 |

### 6.3. Phân công bác sĩ (UC-21) — `POST /pet-visits/{id}/assign`

| # | Dữ liệu | Mong đợi |
|---|---|---|
| 6.3.1 | LETAN `GET /clinical/doctors/status` | BS1, BS2 `AVAILABLE` |
| 6.3.2 | `{"doctorId":{{BS1.id}}}` | 200; BS1 chuyển `BUSY` (có ca `WAITING` đã giao) |
| 6.3.3 | Gán BS1 cho ca khác | 409 `CLIN_1302` |
| 6.3.4 | 2 lễ tân gán **song song** cùng bác sĩ cho 2 ca khác nhau | Đúng 1 thành công |
| 6.3.5 | BS đang có ca `RESULTS_READY` (khóa ưu tiên tái khám) | `CLIN_1303` với ca mới |
| 6.3.6 | Đổi sang bác sĩ khác khi ca chưa khám (`WAITING`) | 200 |
| 6.3.7 | `doctorId` là tài khoản không phải bác sĩ / bị khóa | Lỗi |

### 6.4. Khám lâm sàng (UC-22) — BS1

| # | API + dữ liệu | Mong đợi |
|---|---|---|
| 6.4.1 | `GET /clinical/doctors/me/visits` | Ca được giao cho mình |
| 6.4.2 | `POST /pet-visits/{id}/start-exam` `{"weightAtVisit":28.5,"temperature":38.6,"clinicalNotes":"Ho khan, niêm mạc hồng"}` | `WAITING → IN_PROGRESS`; tự thêm dòng `EXAM_GEN` 100.000 (`COMPLETED`) |
| 6.4.3 | `start-exam` bởi BS2 (không phải bác sĩ được giao) | 403/`CLIN_1308` |
| 6.4.4 | `weightAtVisit: 0`, `temperature: 30` hoặc `50` | 400 `SYS_1001` |
| 6.4.5 | `start-exam` lần 2 | Lỗi chuyển trạng thái |
| 6.4.6 | `POST /pet-visits/{id}/services` `{"services":[{"serviceId":{{DEWORM.id}},"quantity":1,"notes":"Tẩy giun"}]}` | 200; dịch vụ phòng bác sĩ ghi thẳng `COMPLETED`, đơn giá chốt lúc chỉ định |
| 6.4.7 | `services` rỗng, hoặc `quantity: 21` | 400 |
| 6.4.8 | `GET /pet-visits/{id}`, `/{id}/history` | Chi tiết ca; lịch sử trạng thái đủ các bước |

### 6.5. Chỉ định cận lâm sàng (UC-23, khám 2 pha)

| # | API + dữ liệu | Mong đợi |
|---|---|---|
| 6.5.1 | BS1 `POST /pet-visits/{id}/services` `{"services":[{"serviceId":{{LAB_CBC.id}},"quantity":1},{"serviceId":{{IMG_US_AB.id}},"quantity":1,"notes":"Nghi tắc ruột"}]}` | Ca → `WAITING_RESULTS`; **bác sĩ được giải phóng ngay** (`AVAILABLE`), có thể nhận ca khác |
| 6.5.2 | `GET /clinical/doctors/me/visits` | Ca này **biến mất** khỏi danh sách cho tới khi `RESULTS_READY` |
| 6.5.3 | BS1 `POST /service-details/{id}/cancel` `{"reason":"Chủ nuôi từ chối siêu âm"}` | Dòng bị hủy, không tính tiền; nếu là dòng cuối còn chờ → ca vẫn xét sang `RESULTS_READY` |

### 6.6. Xét nghiệm (UC-24, UC-25) — KTV Lab

| # | API + dữ liệu | Mong đợi |
|---|---|---|
| 6.6.1 | XN `GET /clinical/lab-queue` | Dòng xét nghiệm với `queueState` (`NEXT_IN_LINE`, `POSTPONED`...) và `otherRoomStatus` (thú đang ở phòng CĐHA) |
| 6.6.2 | XN `POST /service-details/{id}/start` | Dòng → `IN_PROGRESS` |
| 6.6.3 | XN `GET /service-details/{id}/lab-form` | Chỉ 4 chỉ số của CBC, khoảng tham chiếu **theo loài** của thú |
| 6.6.4 | XN `POST /service-details/{id}/lab-results` cho **chó**: `{"items":[{"labTestItemId":1,"value":22.5},{"labTestItemId":2,"value":6.8},{"labTestItemId":3,"value":10.2,"notes":"Thiếu máu nhẹ"},{"labTestItemId":4,"value":250}]}` | WBC **HIGH** (22.5 > 17), RBC **NORMAL**, HGB **LOW** (10.2 < 12), PLT **NORMAL**; mỗi dòng lưu snapshot khoảng tham chiếu |
| 6.6.5 | Cùng giá trị cho **mèo** | WBC NORMAL (5.5–19.5), HGB NORMAL (8–15) — khác với chó |
| 6.6.6 | Nhập chỉ số không thuộc dịch vụ (ví dụ `HCT` khi CBC chỉ có 4 chỉ số) | `CLIN_1319` |
| 6.6.7 | `value: -1`, `items: []` | 400 |
| 6.6.8 | XN `postpone` `{"reason":"Chờ mẫu"}` rồi `recall` | Dòng sang tab "Hoãn" rồi quay lại `NEXT_IN_LINE` |
| 6.6.9 | Nhập kết quả khi chưa `start` | Lỗi trạng thái |
| 6.6.10 | CDHA gọi `lab-queue`/`lab-results` | 403 |

### 6.7. Chẩn đoán hình ảnh (UC-26, UC-27) — KTV CĐHA

| # | API + dữ liệu | Mong đợi |
|---|---|---|
| 6.7.1 | CDHA `GET /clinical/imaging-queue` | Hàng đợi siêu âm |
| 6.7.2 | `POST /service-details/{id}/start` | `IN_PROGRESS` |
| 6.7.3 | `POST /service-details/{id}/imaging-result` (multipart): `description="Quai ruột giãn, có dịch"`, `conclusion="Nghi tắc ruột"`, `files=sieuam1.jpg` | 200, có ảnh đính kèm |
| 6.7.4 | `GET /imaging-attachments/{id}/file` bằng BS1 / LETAN / CHU_A (chủ thú) | 200 trả file; CHU_B → từ chối |
| 6.7.5 | Gửi file `.txt` đổi tên `.jpg` | Bị chặn (kiểm tra magic-byte JPEG/PNG/DICOM, không tin `Content-Type`) |
| 6.7.6 | File > 20 MB | Bị chặn |
| 6.7.7 | Không đính ảnh, chỉ mô tả và kết luận | Chấp nhận (`files` tùy chọn) |

### 6.8. Chuyển `RESULTS_READY` và mời tái khám (UC-28..30, EX-08, EX-10)

| # | Kịch bản | Mong đợi |
|---|---|---|
| 6.8.1 | Hoàn tất cả hai dòng Lab và CĐHA | Ca `WAITING_RESULTS → RESULTS_READY`; **BS1 nhận popup CRITICAL** "Mời bệnh nhân" kèm số phòng; lễ tân và chủ nuôi nhận thông báo; BS1 ở trạng thái `AVAILABLE_PRIORITY_CALLBACK` |
| 6.8.2 | Hai KTV hoàn tất hai dòng cuối **đồng thời** | Ca vẫn sang `RESULTS_READY` (không kẹt) |
| 6.8.3 | Khi BS1 đang khóa ưu tiên: lễ tân gán ca mới cho BS1 | `CLIN_1303` |
| 6.8.4 | BS1 `POST /pet-visits/{id}/postpone-callback` | Ghi `callback_postponed_at`; BS1 hết khóa ưu tiên, nhận ca mới được |
| 6.8.5 | BS1 `POST /pet-visits/{id}/call-back` | Xóa tạm hoãn, `RESULTS_READY → IN_PROGRESS` |
| 6.8.6 | Hủy một trong hai dòng CLS, dòng còn lại hoàn tất | Vẫn sang `RESULTS_READY` (EX-08) |
| 6.8.7 | Khách bỏ về khi ca `RESULTS_READY` — LETAN `POST /pet-visits/{id}/abandon` | Ca → `COMPLETED`, vẫn phát `visit.closed_to_payment`; lễ tân nhận cảnh báo "ghi nợ"; hóa đơn `PENDING` được lập (EX-11) |

### 6.9. Hủy ca — `POST /pet-visits/{id}/cancel` `{"reason":"Chủ nuôi xin về"}`

| # | Mong đợi |
|---|---|
| 6.9.1 | Ca `WAITING`/`IN_PROGRESS`/`WAITING_RESULTS` → `CANCELLED`; bác sĩ được giải phóng; thiếu `reason` → 400 |
| 6.9.2 | Ca `WAITING_PAYMENT`/`COMPLETED` không hủy được |

---

## 7. Kê đơn, chốt ca, thanh toán, phát thuốc (billing-pharmacy-service)

> Luồng chuẩn: **bác sĩ kê đơn trước** → `close-visit` → hóa đơn tự lập → thu ngân thanh toán → phát thuốc → ca `COMPLETED`.

### 7.1. Kê đơn (UC-31) — BS1 (đúng bác sĩ của ca, ca `IN_PROGRESS`)

| # | API + dữ liệu | Mong đợi |
|---|---|---|
| 7.1.1 | `POST /pharmacy/prescriptions` `{"visitId":{{VISIT}},"doctorNotes":"Theo dõi 5 ngày","items":[{"medicineId":{{MED_AMOX.id}},"quantity":10,"dosage":"1 viên","frequency":"2 lần/ngày","durationDays":5,"instructions":"Uống sau ăn"}]}` | 201, `PRESCRIBED`; đơn giá chốt hiện tại; **chưa trừ kho** (tồn Amox vẫn 200) |
| 7.1.2 | Kê lần 2 cho cùng ca | `PHARM_1408` |
| 7.1.3 | `quantity: 9999` vượt tồn kho | `PHARM_1406` |
| 7.1.4 | `quantity: 0`, `durationDays: 366`, `items: []`, 21 dòng thuốc | 400 `SYS_1001` |
| 7.1.5 | Thuốc đã `active:false` | Lỗi |
| 7.1.6 | BS2 (không phải bác sĩ của ca) kê đơn | 403 |
| 7.1.7 | `PUT /pharmacy/prescriptions/{id}` thay toàn bộ dòng thuốc (ca còn `IN_PROGRESS`) | 200 |
| 7.1.8 | `POST /pharmacy/prescriptions/{id}/cancel` bởi BS1 (ca còn `IN_PROGRESS`, chưa hóa đơn) | `CANCELLED`; sau đó `POST` lại cho cùng ca dùng lại đúng dòng cũ |
| 7.1.9 | `GET /pharmacy/prescriptions/by-visit/{visitId}` bởi CHU_A (chủ thú) | 200; CHU_B → `PHARM_1404` |

### 7.2. Chốt ca (UC-32) — `POST /pet-visits/{id}/close-visit`

| # | Dữ liệu | Mong đợi |
|---|---|---|
| 7.2.1 | `{"diagnosis":"Viêm đường hô hấp trên","treatmentPlan":"Kháng sinh 5 ngày","doctorAdvice":"Giữ ấm, tái khám sau 7 ngày","clinicalNotes":"..."}` | `IN_PROGRESS → WAITING_PAYMENT`; hồ sơ **bị khóa**; vài giây sau hóa đơn `PENDING` tự xuất hiện |
| 7.2.2 | Thiếu `diagnosis` | `CLIN_1312` |
| 7.2.3 | Sau chốt: thêm dịch vụ / sửa đơn thuốc | Bị chặn (`PHARM_1409`, lỗi trạng thái) |
| 7.2.4 | Chốt lần 2 | Lỗi chuyển trạng thái, không tạo hóa đơn trùng |

### 7.3. Hóa đơn (UC-33, UC-34, UC-35)

Ví dụ ca có: Khám 100.000 + CBC 250.000 + Siêu âm 200.000 + Amox 10 × 15.000 = **700.000** (VAT 0%).

| # | Vai trò | API + dữ liệu | Mong đợi |
|---|---|---|---|
| 7.3.1 | LETAN | `GET /billing/invoices?status=PENDING&ascending=true` | Hàng chờ thu ngân, kèm `visitCode, petName, ownerId` |
| 7.3.2 | LETAN | `GET /billing/invoices/by-visit/{visitId}` | Dòng dịch vụ (chỉ `COMPLETED`, không có dòng đã hủy) + dòng thuốc; `finalAmount = 700000`; mã `INV-yyyy-NNNNN` |
| 7.3.3 | LETAN | `PUT /billing/invoices/{id}/discount` `{"discountAmount":50000,"notes":"Khách thân thiết"}` | 200, `finalAmount = 650000` |
| 7.3.4 | LETAN | `discountAmount: 700000` | 200 (bằng tổng được phép) |
| 7.3.5 | LETAN | `discountAmount: 700001` | `BILL_1402` (EX-14) |
| 7.3.6 | LETAN | `discountAmount: -1` | 400 |
| 7.3.7 | LETAN | `POST /billing/invoices/{id}/confirm-payment` | `PENDING → PAID`, ghi `cashierId`, `paidAt`. **Có đơn thuốc** → ca vẫn `WAITING_PAYMENT` chờ phát thuốc |
| 7.3.8 | LETAN | `confirm-payment` lần 2 (hoặc 6 lần song song) | `BILL_1403`; song song chỉ đúng 1 thành công |
| 7.3.9 | LETAN | `discount` sau khi `PAID` | `BILL_1403` |
| 7.3.10 | LETAN | `POST /billing/invoices/{id}/cancel` `{"reason":"Lập sai"}` với hóa đơn `PENDING` | `CANCELLED`, đơn thuốc được gỡ liên kết |
| 7.3.11 | LETAN | `cancel` hóa đơn `PAID` | `BILL_1403` |
| 7.3.12 | LETAN | `confirm-payment`/`discount` hóa đơn đã `CANCELLED` | `BILL_1414` |
| 7.3.13 | LETAN | `POST /billing/invoices/from-visit/{visitId}` khi ca chưa chốt | `BILL_1415`; ca đã chốt: lập hóa đơn, gọi lại vẫn trả cùng hóa đơn (idempotent) |
| 7.3.14 | LETAN | Hủy đơn thuốc (khách xin toa mua ngoài) khi hóa đơn còn `PENDING`: `POST /pharmacy/prescriptions/{id}/cancel` | Dòng thuốc gỡ khỏi hóa đơn, tổng tính lại, chiết khấu bị kéo về mức trần mới |
| 7.3.15 | CHU_A | `GET /billing/invoices` | 403 (chủ nuôi chưa có API xem hóa đơn — đã ghi nhận ở `update.md`) |
| 7.3.16 | ca **không** kê đơn | Thanh toán xong | Ca chuyển `COMPLETED` ngay; chủ nuôi nhận thông báo + email xác nhận thanh toán |

### 7.4. Phát thuốc (UC-36) — `POST /pharmacy/prescriptions/{id}/dispense`

| # | Điều kiện | Mong đợi |
|---|---|---|
| 7.4.1 | LETAN `GET /pharmacy/prescriptions?awaitingDispense=true` | Hàng đợi phát thuốc: đơn `PRESCRIBED` có hóa đơn `PAID` |
| 7.4.2 | Hóa đơn **chưa** `PAID` | `BILL_1413` |
| 7.4.3 | Hóa đơn `PAID`, đủ tồn | 200, đơn `DISPENSED`; tồn Amox 200 → 190; nhật ký `EXPORT_PRESCRIPTION`; ca `WAITING_PAYMENT → COMPLETED`, lịch sử ghi người đổi = thu ngân; chủ nuôi nhận thông báo/email |
| 7.4.4 | Phát lần 2 (hoặc 6 request song song) | `PHARM_1407`; chỉ 1 lần trừ kho (EX-16) |
| 7.4.5 | Đơn 2 thuốc, thuốc thứ hai thiếu hàng (cân chỉnh kho về thấp sau khi kê) | `PHARM_1406`, **rollback toàn bộ**: thuốc đầu không bị trừ (EX-15) |
| 7.4.6 | Sau khi phát tồn ≤ `minStockAlert` | ADMIN nhận thông báo CRITICAL "Thuốc sắp hết" |

### 7.5. Mở lại đợt khám (T12) — ADMIN

| # | API + dữ liệu | Mong đợi |
|---|---|---|
| 7.5.1 | `POST /pet-visits/{id}/reopen` `{"reason":"Bác sĩ quên kê thêm thuốc"}` khi ca `WAITING_PAYMENT`, hóa đơn `PENDING`, bác sĩ không `BUSY` | 200: hóa đơn `PENDING` bị hủy, ca → `IN_PROGRESS`, mở khóa hồ sơ, lịch sử ghi lý do |
| 7.5.2 | Bác sĩ sửa đơn (`PUT`), `close-visit` lại | Hóa đơn được **dựng lại cùng id, cùng mã** với nội dung mới, chiết khấu về 0 |
| 7.5.3 | Hóa đơn đã `PAID` | `BILL_1403` |
| 7.5.4 | Ca `COMPLETED` | `CLIN_1305` |
| 7.5.5 | Bác sĩ phụ trách đang `BUSY` | Lỗi, ca giữ nguyên |
| 7.5.6 | LETAN/BS1 gọi `reopen` | 403 |

### 7.6. Bệnh án trọn đời (UC-38, UC-39)

| # | Vai trò | API | Mong đợi |
|---|---|---|---|
| 7.6.1 | CHU_A | `GET /pets/{CHO_A}/medical-history?page=0&size=10` | Chỉ các đợt `COMPLETED`; mỗi mục có chẩn đoán, dịch vụ, kết quả XN có đánh giá HIGH/LOW/NORMAL, ảnh CĐHA, `doctorName`, đơn thuốc kèm liều dùng |
| 7.6.2 | CHU_A | `GET /pets/{CHO_B}/medical-history` | `APPT_1201` |
| 7.6.3 | BS1, LETAN, ADMIN | Cùng API | Thấy cả ca chưa hoàn tất |
| 7.6.4 | CHU_A | Tải ảnh CĐHA qua `GET /imaging-attachments/{id}/file` | 200 |

---

## 8. Thông báo thời gian thực & email (notification-service)

### 8.1. Kết nối WebSocket

| # | Kịch bản | Mong đợi |
|---|---|---|
| 8.1.1 | Mở `ws://localhost:8080/ws`, gửi frame `CONNECT` kèm `Authorization: Bearer {{token}}` | `CONNECTED` |
| 8.1.2 | `CONNECT` với token sai/hết hạn/thiếu | Frame `ERROR`, kết nối đóng |
| 8.1.3 | `SUBSCRIBE /user/queue/notifications` và `/topic/role/<vai trò của mình>` | Thành công |
| 8.1.4 | Đăng ký `/topic/role/ADMIN` bằng tài khoản chủ nuôi, hoặc kênh lạ | `ERROR` + đóng |
| 8.1.5 | Client gửi `SEND` | Bị cấm |
| 8.1.6 | `GET /api/v1/notifications?limit=20` | Thông báo gần nhất của mình (riêng + chung vai trò), mới nhất trước |

### 8.2. Ai nhận gì

| Sự kiện (hành động gây ra) | Người nhận | Kiểm tra |
|---|---|---|
| Chủ nuôi đặt lịch (5.3.1) | LETAN (chỉ lịch `PENDING`); CHU_A | Thông báo + **email xác nhận** ở Mailpit |
| Lễ tân duyệt/từ chối/dời giờ/vắng mặt (5.5) | **Chỉ chủ nuôi** | Loại `APPOINTMENT_UPDATED`; từ chối có lý do; email |
| Chủ nuôi tự hủy/tự đổi | Không ai | Không có thông báo thừa |
| Check-in (6.1) | LETAN, CHU_A; cấp cứu thêm **toàn bộ bác sĩ** (CRITICAL) | |
| Ca sang `RESULTS_READY` (6.8.1) | **Chỉ bác sĩ phụ trách** (`data.action=INVITE_PATIENT`), LETAN, CHU_A | BS2 không nhận |
| Chốt ca (7.2.1) | LETAN | Ca chờ thanh toán |
| Thanh toán xong (7.3.16, 7.4.3) | LETAN, CHU_A + email | |
| Tồn kho ≤ ngưỡng (7.4.6) | ADMIN (CRITICAL) | |

### 8.3. Gửi email thủ công — `POST /api/v1/notifications/send-email` (ADMIN)

| # | Dữ liệu | Mong đợi |
|---|---|---|
| 8.3.1 | `{"to":"test@example.com","subject":"Thông báo thử","content":"Nội dung thử"}` | 200, thư xuất hiện ở Mailpit |
| 8.3.2 | LETAN gọi | 403 |
| 8.3.3 | Tắt SMTP (hoặc dừng mailpit) rồi gây sự kiện cần email | Thử lại 3 lần rồi vào DLQ `notification-service.<routing-key>.dlq`; thông báo trong ứng dụng không bị nhận trùng |

---

## 9. Báo cáo (ADMIN, FR-69, FR-70)

| # | API | Mong đợi |
|---|---|---|
| 9.1 | `GET /billing/reports/revenue?fromDate=2026-10-01&toDate=2026-10-31&groupBy=DAY` (hoặc `WEEK, MONTH, QUARTER`) | Doanh thu chỉ tính hóa đơn `PAID` theo ngày thu tiền (giờ VN): dịch vụ, thuốc, VAT, chiết khấu, thực thu; kỳ không có doanh thu vẫn có dòng 0; `byStatus` (`PENDING` = công nợ) |
| 9.2 | `GET /clinical/reports/operations?fromDate&toDate` | Tổng ca, theo trạng thái, hoàn tất, hủy, cấp cứu, ca thường vs ca có cận lâm sàng, số ca từng bác sĩ |
| 9.3 | `GET /appointments/reports/summary?fromDate&toDate` | Số lịch theo trạng thái/kênh, `noShowRate = NO_SHOW/(CHECKED_IN+NO_SHOW)`, `cancellationRate = CANCELLED/tổng` |
| 9.4 | Khoảng ngày > 366 ngày, hoặc `fromDate > toDate` | Lỗi |
| 9.5 | LETAN / BS1 gọi các API trên | 403 |
| 9.6 | Đối chiếu số liệu với các hóa đơn/ca vừa tạo | Khớp từng đồng |
| 9.7 | `GET /pet-visits?status=COMPLETED&date=...` (ADMIN) | Danh sách ca phân trang |

---

## 10. Phân quyền & bảo mật (kiểm tra chéo)

| # | Kịch bản | Mong đợi |
|---|---|---|
| 10.1 | Không gửi `Authorization` vào bất kỳ API `/api/v1/**` (trừ `login`, `refresh`, `register`) | 401 |
| 10.2 | Gửi header giả `X-User-Id: 1`, `X-User-Role: ADMIN` kèm token của chủ nuôi | Header giả bị Gateway xóa, vẫn là quyền chủ nuôi |
| 10.3 | Gọi `/internal/**` từ ngoài qua Gateway (`{{BASE}}/internal/auth/doctors/active-count`) | Không định tuyến được (404/403) |
| 10.4 | Cổng `8081–8085` từ máy ngoài | Không truy cập được (chỉ publish `8080`) |
| 10.5 | Mỗi vai trò gọi một API của vai trò khác (theo ma trận mục 2) | 403 |
| 10.6 | CHU_A đọc/sửa pet, lịch, đơn thuốc, bệnh án của CHU_B | 404 (`APPT_1201`, `APPT_1202`, `PHARM_1404`) chứ không phải 403 |
| 10.7 | Đăng nhập sai quá 5 lần (3.1.4) | Khóa 15 phút |
| 10.8 | SQL injection thử: `keyword=' OR 1=1 --` | Không lỗi 500, không rò dữ liệu |
| 10.9 | CORS: gọi từ origin `http://localhost:3000` | Có header `Access-Control-Allow-Origin` (chỉ một giá trị, không trùng) |

---

## 11. Kịch bản tích hợp trọn vẹn (chạy một lượt, ~15 phút)

Mục tiêu: một ca khám đi qua **cả 6 vai trò**, kiểm tra các sự kiện liên service.

| Bước | Vai trò | Hành động | Kiểm tra |
|---|---|---|---|
| 1 | CHU_A | Đăng ký (3.3.1), thêm `CHO_A` (5.2.1) | Có hồ sơ |
| 2 | CHU_A | Đặt lịch hôm nay, khung chưa qua (5.3.1) | `PENDING`, LETAN có thông báo |
| 3 | LETAN | Duyệt lịch (5.5.2) | `CONFIRMED`, CHU_A có thông báo + email |
| 4 | LETAN | Check-in bằng `appointmentId` (6.1.2) | Ca `WAITING`; lịch → `CHECKED_IN` |
| 5 | LETAN | Gán BS1 (6.3.2) | BS1 `BUSY` |
| 6 | BS1 | `start-exam` (6.4.2) | Ca `IN_PROGRESS`, có phí khám |
| 7 | BS1 | Chỉ định CBC + siêu âm (6.5.1) | `WAITING_RESULTS`, BS1 rảnh |
| 8 | XN | Start + nhập 4 chỉ số (6.6.4) | HIGH/LOW đúng theo loài chó |
| 9 | CDHA | Start + kết quả kèm ảnh (6.7.3) | Ca → `RESULTS_READY`, **BS1 nhận popup mời bệnh nhân** |
| 10 | BS1 | `call-back` (6.8.5), kê đơn Amox ×10 (7.1.1), `close-visit` (7.2.1) | `WAITING_PAYMENT`, hóa đơn 700.000 xuất hiện |
| 11 | LETAN | Chiết khấu 50.000, `confirm-payment` (7.3.3, 7.3.7) | Hóa đơn `PAID`, 650.000, ca chờ phát thuốc |
| 12 | LETAN | `dispense` (7.4.3) | Ca `COMPLETED`, tồn Amox −10 |
| 13 | CHU_A | Xem bệnh án (7.6.1) | Có đủ chẩn đoán, kết quả XN, ảnh, đơn thuốc |
| 14 | ADMIN | Xem báo cáo (mục 9) | Doanh thu +650.000, 1 ca hoàn tất |

Kịch bản biến thể: lặp lại với (a) **khách vãng lai + cấp cứu**, (b) ca **không** có cận lâm sàng và không kê đơn (thanh toán xong là `COMPLETED`), (c) khách bỏ về ở `RESULTS_READY` (6.8.7), (d) mở lại ca (7.5).

---

## 12. Test tự động có sẵn (chạy lại thay cho thủ công)

| Lệnh | Phạm vi | Số kiểm tra |
|---|---|---|
| `cd vetclinic-backend && mvn clean install` | Unit test backend (JAVA_HOME phải là JDK 21) | 288 |
| `bash e2e/run_all.sh` | appointment (85), clinical (171), billing (151), notification (68) | 475 |
| `python e2e/features.py` | Tự đăng ký, đổi vai trò, danh mục XN, hàng đợi 3 bậc, bệnh án, báo cáo, mở lại ca (cần `BOOKING_PENDING_EXPIRY_CRON='*/5 * * * * *'`) | 138 |
| `cd fe && npm test` | Lớp API, STOMP, định dạng | 22 |
| `node e2e/fe_smoke.mjs` | Một ca khám trọn vẹn trên giao diện Chrome thật, 6 vai trò | 50 |

> **Cảnh báo:** các kịch bản e2e tự gọi `e2e/reset_data.sh` nên **xóa luôn dữ liệu demo** và
> **xóa dữ liệu nghiệp vụ** (mọi người dùng trừ `admin`). Chạy xong thì dữ liệu test thủ công ở trên bị mất; nếu muốn test thủ công thì chạy `bash e2e/reset_data.sh` rồi tạo lại tài khoản theo mục 1.2.

---

## 13. Mẫu ghi nhận kết quả

| Mã test | Người test | Ngày | Kết quả (Đạt / Không đạt) | Ghi chú / HTTP / `errorCode` thực tế | Ảnh chụp / log |
|---|---|---|---|---|---|
| 3.1.1 | | | | | |
| ... | | | | | |

**Khi báo lỗi** ghi đủ: mã test, vai trò, request (URL + body), phản hồi thực tế, kết quả mong đợi, thời điểm (để tra log `docker compose logs <service>`).
