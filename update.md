# update.md — Rà soát BE / FE từng chức năng so với đồ án (29/10/2026)



# 1. Xóa container, volume (DB + ảnh), image do compose build, container mồ côi
docker compose down -v --rmi local --remove-orphans

# 2. (Tùy chọn) dọn image <none> cũ và cache build để build thật sự từ đầu
docker image prune -f
docker builder prune -af

# 3. Build lại không dùng cache rồi chạy
docker compose build --no-cache
docker compose up -d
docker compose ps 








Phạm vi đối chiếu: `docs/DAC_TA_USE_CASE_CORE.md` (13 nhóm UC cốt lõi), `docs/YEU_CAU_CHUC_NANG_VA_PHI_CHUC_NANG.md` (FR-01…FR-70) và `docs/TONG_HOP_NGOAI_LE_VA_XU_LY_HE_THONG.md` (EX-01…EX-16).
Cách làm: đọc từng bước "chuỗi sự kiện chính / rẽ nhánh / ngoại lệ" của đặc tả, đối chiếu với hành vi BE (đã có 560 kiểm tra e2e + 288 unit test, đọc lại code ở mọi điểm nghi ngờ) và với màn hình FE (chạy thật bằng `e2e/fe_smoke.mjs`).

Ký hiệu: ✅ đúng đặc tả · 🔧 đã sửa trong đợt này · ⚠️ lệch / chưa làm — **cần nhóm xác định** (xem mục 3).

---

## 1. Kết quả theo từng chức năng

| UC | Chức năng | BE | FE | Ghi chú |
|---|---|---|---|---|
| UC-14 | Chủ nuôi đặt lịch online | ✅ | 🔧 | BE: sức chứa = số bác sĩ ACTIVE, 1 thú cưng/ngày, trạng thái PENDING, kênh ONLINE, không chọn bác sĩ. FE: thêm **"Thêm thú cưng mới" ngay trên biểu mẫu đặt lịch** (luồng rẽ nhánh 3a). |
| UC-15 | Chủ nuôi đổi / hủy lịch | ✅ | 🔧 | Chặn dưới 2 giờ đúng đặc tả. FE: thêm gợi ý lý do hủy (Bận việc đột xuất / Thú cưng đã khỏi / Đổi cơ sở khác). |
| UC-16 | Lễ tân đặt lịch qua điện thoại / tại quầy | ✅ | ✅ | Tra cứu theo SĐT, tạo nhanh khách + thú cưng, xác nhận ngay. ⚠️ SMS và in phiếu hẹn chưa có (3.1). |
| UC-17 | Lễ tân duyệt / từ chối lịch online | 🔧 | ✅ | **Lỗi luồng, đã sửa:** chủ nuôi không được báo khi lịch được duyệt / bị từ chối (xem 2.1). ⚠️ "Ghi chú liên hệ thất bại" (4.1) chưa có. |
| UC-18 | Hồ sơ khách hàng & thú cưng tại quầy | ✅ | 🔧 | FE: kiểm tra SĐT **đúng 10 số** (trước đó chấp nhận 10–11, lệch với BE `^0\d{9}$`). Tài khoản mới dùng **mật khẩu tạm ngẫu nhiên hiển thị một lần** thay cho "mật khẩu mặc định" (an toàn hơn, chủ ý). |
| UC-19 / FR-18 | Check-in lịch hẹn & khách vãng lai | ✅ | 🔧 | Khách đến trễ sau khi lịch đã NO_SHOW: tiếp nhận ở tab *Khách vãng lai* (lịch giữ nguyên NO_SHOW, đúng FR-18). FE thêm dòng hướng dẫn này. |
| UC-20 | Giám sát hàng đợi 3 bậc | ✅ | 🔧 | FE: viền/nền đỏ cho ca cấp cứu, hiện **thời gian đã chờ**, nút *Hủy* ở ca đang khám đã bỏ (BE chỉ cho bác sĩ hủy ca `IN_PROGRESS` → lễ tân bấm sẽ bị `ACCESS_DENIED`). ⚠️ "Tạm hoãn lượt khám" của lễ tân và ước tính thời gian phòng chưa có (3.2). |
| UC-21 | Phân công bác sĩ | ✅ | 🔧 | BE cho **đổi bác sĩ khi chưa bắt đầu khám** (5a) nhưng FE trước đây ẩn nút sau lần phân công đầu → đã thêm "Đổi bác sĩ". Hộp thoại chỉ cho chọn bác sĩ `AVAILABLE`, bác sĩ bận / giữ khóa ưu tiên bị làm mờ kèm lý do. |
| UC-22/23 | Bác sĩ khám giai đoạn 1, chỉ định dịch vụ | ✅ | ✅ | Đo cân nặng / thân nhiệt, tự thêm phí khám, chỉ định CLS giải phóng bác sĩ. ⚠️ "Báo vắng mặt / chuyển trả lễ tân" (2.1 của đặc tả) chưa có (3.3). |
| UC-25/26 | Kỹ thuật viên Lab / CĐHA | ✅ | 🔧 | FE: tab **"Ca tạm hoãn do vắng mặt"**, viền đỏ ca cấp cứu, màu đánh giá **Thấp = vàng** (đặc tả FR-40 ghi vàng; trước đó FE tô xanh dương). ⚠️ Nút "Mời vào phòng" (gọi số) chưa có (3.4). |
| UC-30/31/33 | Hội chẩn, kê đơn, chốt ca | ✅ | 🔧 | FE: thông báo "mời bệnh nhân" của bác sĩ có **nút "Mời bệnh nhân vào phòng"**; thêm **"Khách bỏ về — đóng ca"** (EX-11, đặc tả cho phép cả bác sĩ lẫn lễ tân; trước đây FE chỉ có ở lễ tân). |
| UC-34/35 | Hóa đơn, chiết khấu, thanh toán | ✅ | ✅ | Chiết khấu ≤ tổng viện phí (EX-14), in phiếu tạm tính / hóa đơn bằng trình duyệt. |
| UC-36 | Phát thuốc, trừ kho | ✅ | ✅ | Trừ kho nguyên tử, chặn xuất lặp (EX-15/16). ⚠️ In phiếu hướng dẫn dùng thuốc chưa có (3.1). |
| UC-01…07 | Admin: tài khoản, phòng, dịch vụ, thuốc, chỉ số XN, khoảng tham chiếu, loài | ✅ | ✅ | |
| UC-38/39, FR-67/68 | Bệnh án trọn đời (lễ tân, bác sĩ, chủ nuôi) | ✅ | ✅ | Chủ nuôi chỉ thấy ca đã hoàn tất của thú cưng mình. |
| FR-69/70 | Báo cáo doanh thu / vận hành | ✅ | ✅ | |
| FR-08 | Tìm khách theo SĐT / tên / **tên thú cưng** | ✅ | ⚠️ | Tìm theo tên thú cưng nằm ở trang *Thú cưng* (có liên kết sang chủ nuôi), không nằm ở ô tìm khách. Chấp nhận được, ghi để nhóm biết. |
| Cổng chủ nuôi | Xem hóa đơn | ⚠️ | ⚠️ | Đặc tả không có UC riêng; BE chưa có endpoint cho `PET_OWNER`. Đơn thuốc đã xem được trong *Lịch sử khám bệnh*. |

Các EX-01…EX-16 đều có xử lý ở BE và có kiểm chứng e2e; riêng EX-04, EX-05, EX-06, EX-07, EX-09, EX-10, EX-11 đã có màn hình tương ứng ở FE (sau các sửa ở trên).

---

## 2. Các sửa đã thực hiện

### 2.1. [BE — sửa luồng] Chủ nuôi không được thông báo khi lịch hẹn được duyệt / từ chối / dời giờ

- **Đặc tả:** UC-17 hậu điều kiện 2 ("Khách hàng nhận được thông báo kết quả phê duyệt… nếu từ chối… gửi thông báo giải thích lý do") và FR-16.
- **Hiện trạng trước sửa:** appointment-service chỉ phát `appointment.created`. Lễ tân duyệt hay từ chối xong thì chủ nuôi **không nhận gì** — trong khi màn hình đặt lịch của FE hứa "bạn nhận thông báo khi lịch được duyệt".
- **Đã làm:**
  - `common-library`: thêm `AppointmentStatusChangedEvent` + routing key `appointment.status_changed`.
  - `appointment-service` (`AppointmentServiceImpl`): phát sự kiện (sau commit, qua `DomainEventRabbitPublisher`) khi **lễ tân hoặc hệ thống** đổi lịch sang `CONFIRMED`, `CANCELLED` (kèm lý do), `NO_SHOW` (kể cả tự quét và tự hủy lịch PENDING quá hạn), hoặc lễ tân **dời giờ** hộ khách. Hành động do **chính chủ nuôi** làm (tự hủy / tự đổi) không phát vì họ đã thấy kết quả ngay. `CHECKED_IN` không phát (đã có thông báo `visit.checked_in`).
  - `notification-service`: queue `notification-service.appointment.status_changed` (có DLQ), listener gửi thông báo riêng cho chủ nuôi (loại mới `APPOINTMENT_UPDATED`; từ chối / vắng mặt mức WARNING) **và email** nếu chủ nuôi có email; idempotent theo `eventId` như các sự kiện khác.
  - Tài liệu: bảng sự kiện ở `CLAUDE.md` §5.3, bảng thông báo và `QUY_CHUAN_…` (danh mục 7 sự kiện).
- **Kiểm chứng:** 6 unit test mới (3 ở appointment, 3 ở notification); chạy thật trên Docker: từ chối kèm lý do, duyệt, dời giờ đều tới chủ nuôi qua thông báo + email (kiểm tra Mailpit), chủ nuôi tự hủy thì không bị báo lại; `fe_smoke.mjs` có thêm bước "chủ nuôi được báo khi lễ tân duyệt lịch".

### 2.2. [BE — bổ sung] `GET /api/v1/clinical/pet-visits`

Danh sách đợt khám phân trang có lọc (`status`, `date` theo giờ VN, `doctorId`, `petId`, `keyword`). Cần cho bảng điều phối của lễ tân và trang *Đợt khám* của Admin (mở lại ca T12). Có unit test. (Đã làm ở đợt trước; ghi lại để đủ hồ sơ.)

### 2.3. [FE — sửa lệch đặc tả / lỗi]

| # | Sửa | File chính |
|---|---|---|
| 1 | SĐT đúng 10 số (khớp BE) | `ProfilePage`, `CustomerFormDialog`, `UsersPage` |
| 2 | Lễ tân **đổi bác sĩ** khi ca chưa khám; hộp thoại chỉ cho chọn bác sĩ sẵn sàng | `Reception/QueuePage` |
| 3 | Bỏ nút *Hủy* của lễ tân ở ca `IN_PROGRESS` (BE từ chối); ca `WAITING_RESULTS` đổi nhãn "Khách bỏ về / Hủy" | `Reception/QueuePage` |
| 4 | Thời gian chờ; ca cấp cứu viền đỏ (hàng đợi lễ tân, Lab, CĐHA) | `QueuePage`, `Paraclinic/QueuePage`, `ui/index.js` (`rowClass`), `ui.css` |
| 5 | Tab "Ca tạm hoãn do vắng mặt" ở hàng đợi Lab / CĐHA | `Paraclinic/QueuePage` |
| 6 | Đánh giá xét nghiệm "Thấp" màu vàng | `lib/labels.js`, `ui.css` |
| 7 | Bác sĩ có "Khách bỏ về — đóng ca" khi ca đã có kết quả | `Veterinarian/VisitPage` |
| 8 | Thông báo mời bệnh nhân có nút "Mời bệnh nhân vào phòng" | `NotificationBell` |
| 9 | Thêm thú cưng ngay trong đặt lịch; gợi ý lý do hủy; hướng dẫn khách đến trễ | `BookingPage`, `AppointmentDialogs`, `IntakePage` |

---

## 3. Chỗ lệch / chưa làm — nhóm cần xác định (KHÔNG tự ý làm)

Đây là các bước **có trong đặc tả** nhưng chưa có ở hệ thống. Đề xuất mặc định ghi ở cột cuối; nhóm chọn "làm", "bỏ khỏi phạm vi" hoặc "ghi vào báo cáo là hướng phát triển".

| # | Nội dung (nguồn) | Hiện trạng | Đề xuất |
|---|---|---|---|
| 3.1 | In phiếu: phiếu hẹn (UC-16 6a), phiếu số thứ tự phòng (UC-21 6.4), phiếu hướng dẫn dùng thuốc (UC-36 6); gửi SMS xác nhận (UC-16 8.5) | Chưa có. Hóa đơn / phiếu tạm tính đã in được bằng trình duyệt. Thông báo chỉ qua ứng dụng + email | Bỏ khỏi phạm vi (SMS cần nhà cung cấp bên ngoài); phiếu in có thể làm sau bằng `window.print()` |
| 3.2 | Lễ tân "Tạm hoãn lượt khám" đưa ca xuống cuối hàng đợi (UC-20 4a); ước tính thời gian phòng khi tất cả bận (5.1) | Chưa có. **Không có FR / trạng thái nào mô tả**, state machine SM-01 cũng không có | Bỏ khỏi phạm vi, hoặc nhóm bổ sung FR + cột dữ liệu trước khi làm |
| 3.3 | Bác sĩ "Báo vắng mặt / chuyển trả lễ tân" khi bệnh nhân không vào phòng (UC-22 2.1) | Chưa có. Thay thế hiện tại: lễ tân **hủy ca** hoặc **đổi bác sĩ** | Chấp nhận thay thế; hoặc thêm thao tác "bỏ phân công" (BE nhỏ) |
| 3.4 | KTV bấm "Mời vào phòng" (gọi số, thông báo cho chủ nuôi) trước "Bắt đầu thực hiện" (UC-25 2); chủ nuôi bấm "Tôi đã có mặt" (FR-39) | Chưa có. KTV bấm *Bắt đầu* trực tiếp; ca tạm hoãn được *Gọi lại* bởi KTV | Chấp nhận (không ảnh hưởng trạng thái dữ liệu) |
| 3.5 | UC-17 4.1 "Ghi chú liên hệ thất bại" | Chưa có; lịch giữ `PENDING` và tự hủy khi quá giờ hẹn | Chấp nhận, hoặc thêm trường ghi chú liên hệ vào lịch sử trạng thái |
| 3.6 | Chủ nuôi xem hóa đơn | Chưa có endpoint cho `PET_OWNER` | Bỏ khỏi phạm vi (không có FR) hoặc thêm `GET /billing/invoices/mine` |
| 3.7 | Quên mật khẩu tự phục vụ; xác minh SĐT / email khi tự đăng ký | Chưa có. Xử lý tại quầy bằng "Đặt lại mật khẩu" | Ghi vào báo cáo là hạn chế đã biết |
| 3.8 | FR-01 ghi Admin gán 3 vai trò nội bộ, hệ thống có 6 vai trò | Admin gán được 5 vai trò nhân sự; `PET_OWNER` tự đăng ký / do lễ tân tạo | **Câu hỏi mở #5 trong `CLAUDE.md` §8** — cần nhóm xác nhận; nên cập nhật FR-01 trong tài liệu cho khớp |
| 3.9 | Tỉ lệ VAT thực tế | Cấu hình, mặc định 0 | **Câu hỏi mở #3** — chờ nhóm |

---

## 4. Kiểm chứng sau các sửa

- Backend: `mvn clean install` — **288 test đạt** (appointment 54, notification 35, clinical 103, auth 28, billing 68).
- Frontend: `npm run build` — Compiled successfully; `npm test` — 22 test đạt.
- Trên Docker thật: `node e2e/fe_smoke.mjs` — **50/50 bước đạt**, không có lỗi console / HTTP bất thường; kiểm tra riêng luồng từ chối + dời giờ + email (như mục 2.1).
- Đã chạy lại `bash e2e/run_all.sh` sau thay đổi `common-library` / appointment / notification: appointment **85/85**, clinical **171/171**, billing **151/151**, notification **68/68** (không đạt: 0). `e2e/features.py` (138, cần cron quét nhanh) chưa chạy lại vì không đụng tới phần nó kiểm tra.

## 5. Việc nên làm trước 20/11/2026

1. Nhóm quyết các mục ở mục 3 (đặc biệt 3.2, 3.3, 3.8, 3.9).
2. Chạy lại `bash e2e/run_all.sh` và `node e2e/fe_smoke.mjs` một lượt cuối trên máy demo (nhớ `bash e2e/reset_data.sh` trước `fe_smoke.mjs`).
3. Xóa `fe/legacy-mock/` khi chắc chắn không cần tham khảo bản giao diện cũ.
