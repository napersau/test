# KẾ HOẠCH XÂY DỰNG GIAO DIỆN (FRONTEND) – HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y

> **Dành cho Claude (AI) đọc trước khi viết code.** File này mô tả TOÀN BỘ màn hình + chức năng của từng vai trò để dựng UI đúng nghiệp vụ.
> **Phạm vi:** CHỈ GIAO DIỆN. **Không gọi API. Dữ liệu fix cứng (mock).** Mọi thao tác (duyệt, phân công, thanh toán…) chỉ cập nhật state phía client để demo luồng.
> Nguồn nghiệp vụ gốc: thư mục `../tài liệu đồ án/` (nghiệp vụ, đặc tả UC, ERD, enum, state machine, ngoại lệ). Khi có mâu thuẫn, **file này là chuẩn cho FE**.

---

## 0. Quy ước làm việc cho Claude

1. **Stack hiện có:** React 19 + CRA (`react-scripts`) + `react-router-dom` 6, JavaScript (không TS), CSS thuần trong `src/styles/*.css`. **Không thêm thư viện nặng** nếu không cần (không Redux, không UI kit). Được dùng thêm nếu thật sự cần: không.
2. **Giữ nguyên tiền tố route hiện có:** `/portal/*` (chủ thú cưng), `/reception/*` (lễ tân), `/vet/*` (bác sĩ), `/admin/*` (quản trị). Trang công khai `/`, `/auth/login`, `/auth/register`.
3. **Mã vai trò theo tài liệu:** `ADMIN`, `VETERINARIAN`, `RECEPTIONIST`, `PET_OWNER`. Code cũ đang dùng `'CUSTOMER'` → đổi thành `PET_OWNER` ở MỘT chỗ (`accessPolicy.js`, `AuthContext`, `RequireRole`), không rải rác.
4. **Dữ liệu mock:** tạo thư mục `src/mock/` (xem §9). Dùng 1 `ClinicContext` (React Context + `useReducer`) giữ state của appointments/visits/invoices…, khởi tạo từ mock. Reload trang có thể reset (tuỳ chọn: lưu `localStorage` khóa `pawcare_mock_v2`). **Không** gọi `fetch`/`axios`.
5. **Tận dụng code sẵn có:** layout (`AdminLayout`, `ReceptionLayout`, `VeterinarianLayout`, `CustomerLayout`), `components/common/Modal`, `Brand`, `RequireRole`… Chỉ sửa/thay khi sai nghiệp vụ. Các `features/*/…Repository.js` hiện tại (đang dùng localStorage, theo mô hình cũ chỉ có `appointment`) **sẽ được thay dần bằng `ClinicContext`** – không viết thêm repository mới.
6. **Ngôn ngữ giao diện:** tiếng Việt. Mã trạng thái (enum) giữ tiếng Anh trong code, hiển thị qua bảng nhãn ở §3.
7. **Mỗi màn hình phải có:** tiêu đề, trạng thái rỗng (empty state), badge trạng thái đúng màu, thông báo toast/inline khi thao tác, modal xác nhận cho hành động không thể hoàn tác. Responsive tối thiểu tablet (lễ tân/bác sĩ dùng máy tính/tablet; portal dùng được trên mobile).
8. **Validation phía client** theo §8 (chặn như tài liệu mô tả: nhập thiếu chẩn đoán, thuốc vượt tồn, giảm giá > tổng, SĐT 10 số…).

---

## 1. Bản đồ vai trò → khu vực giao diện

| Vai trò | Khu vực | Route gốc | Mục đích |
|---|---|---|---|
| (khách chưa đăng nhập) | Public | `/`, `/auth/*` | Trang giới thiệu, đăng nhập, đăng ký |
| `PET_OWNER` | Customer Portal | `/portal` | Thú cưng, đặt lịch, lịch hẹn, bệnh án |
| `RECEPTIONIST` | Reception Console | `/reception` | Lịch hẹn, tiếp đón, hàng đợi, phân công, thu ngân, phát thuốc |
| `VETERINARIAN` | Vet Console | `/vet` | Khám GĐ1/GĐ2, phòng Xét nghiệm, phòng CĐHA, kê đơn |
| `ADMIN` | Admin Console | `/admin` | Tài khoản, nhân sự, danh mục, kho, báo cáo |

**Lưu ý nghiệp vụ quan trọng:**
- Không có vai trò "Kỹ thuật viên". **Phòng Xét nghiệm và phòng CĐHA do tài khoản `VETERINARIAN` vận hành** → trong khu `/vet` có 3 không gian: *Phòng khám* · *Phòng Xét nghiệm* · *Phòng CĐHA* (tab/nav riêng).
- **ADMIN không có màn hình khám chữa bệnh** (không xem/sửa nội dung chuyên môn của đợt khám; chỉ thống kê).
- **RECEPTIONIST không sửa dữ liệu chuyên môn** (chẩn đoán, KQ xét nghiệm, đơn thuốc) → mọi màn hình chuyên môn hiển thị ở chế độ chỉ đọc cho lễ tân.
- **PET_OWNER không chọn bác sĩ** khi đặt lịch.
- Mỗi người dùng đúng 1 vai trò. Đăng nhập xong chuyển về trang chủ của vai trò: portal → `/portal/pets`, reception → `/reception/queue`, vet → `/vet/dashboard`, admin → `/admin/dashboard`.

---

## 2. Luồng nghiệp vụ tổng thể (UI phải thể hiện đúng)

```
PET_OWNER đặt lịch ONLINE → appointment PENDING
RECEPTIONIST duyệt → CONFIRMED  (hoặc từ chối → CANCELLED + lý do)
(Lễ tân đặt qua PHONE / WALK_IN-tại-quầy → CONFIRMED ngay)
Khách đến → Check-in (cân, nhiệt độ, triệu chứng) → appointment CHECKED_IN + tạo Visit WAITING
Khách vãng lai (không lịch hẹn) / Cấp cứu → tạo Visit WAITING (appointment = null, cấp cứu: is_emergency)
Lễ tân xem HÀNG ĐỢI + bảng bác sĩ → chọn ca → Phân công bác sĩ AVAILABLE → visit có doctor + room
Bác sĩ "Bắt đầu khám" → IN_PROGRESS (GĐ1) → bác sĩ BUSY
   ├─ Không cần cận lâm sàng → nhập chẩn đoán + kê đơn → Chốt → WAITING_PAYMENT
   └─ Cần CLS → Chỉ định dịch vụ → WAITING_RESULTS (bác sĩ được giải phóng)
         Phòng Xét nghiệm / CĐHA nhập KQ → khi hết PENDING/IN_PROGRESS → RESULTS_READY
         Bác sĩ "Mời vào phòng" → IN_PROGRESS (GĐ2) → chẩn đoán xác định + kê đơn → Chốt → WAITING_PAYMENT
Lễ tân thu tiền → invoice PAID → Xuất thuốc (trừ kho, prescription DISPENSED) → visit COMPLETED
```

---

## 3. Bảng nhãn & màu cho enum (dùng chung toàn app – tạo `src/constants/statusLabels.js`)

| Enum | Giá trị → Nhãn VI → Màu gợi ý |
|---|---|
| `AppointmentStatus` | PENDING “Chờ xác nhận” (vàng) · CONFIRMED “Đã xác nhận” (xanh dương) · CHECKED_IN “Đã đến khám” (xanh lá) · CANCELLED “Đã hủy” (xám/đỏ nhạt) · NO_SHOW “Vắng mặt” (đỏ) |
| `BookingChannel` | ONLINE “Trực tuyến” · PHONE “Qua điện thoại” · WALK_IN “Đặt tại quầy” |
| `VisitStatus` | WAITING “Chờ khám” · IN_PROGRESS “Đang khám” · WAITING_RESULTS “Chờ kết quả CLS” · RESULTS_READY “Đã có kết quả” (cam) · WAITING_PAYMENT “Chờ thanh toán” · COMPLETED “Hoàn thành” (xanh lá) · CANCELLED “Đã hủy” |
| Trạng thái bác sĩ (tính động) | AVAILABLE “Sẵn sàng” (xanh lá) · AVAILABLE_PRIORITY_CALLBACK “Ưu tiên ca có kết quả” (cam) · BUSY “Đang bận khám” (đỏ) |
| `ServiceDetailStatus` | PENDING “Chờ thực hiện” · IN_PROGRESS “Đang thực hiện” · COMPLETED “Hoàn tất” · CANCELLED “Đã hủy” |
| `LabEvaluation` | LOW “Thấp” (vàng) · NORMAL “Bình thường” (xanh lá) · HIGH “Cao” (đỏ) |
| `PrescriptionStatus` | PRESCRIBED “Đã kê” · DISPENSED “Đã phát thuốc” · CANCELLED “Đã hủy” |
| `PaymentStatus` | PENDING “Chờ thanh toán” · PAID “Đã thanh toán” · CANCELLED “Đã hủy” |
| `PaymentMethod` | CASH “Tiền mặt” · BANK_TRANSFER “Chuyển khoản (VietQR)” · CARD “Thẻ POS” |
| `ServiceCategory` | EXAMINATION Khám · VACCINATION Tiêm phòng · DEWORMING Tẩy giun · EXTERNAL_PARASITE Ký sinh trùng ngoài · INJECTION_INFUSION Tiêm/Truyền · LABORATORY Xét nghiệm · IMAGING Chẩn đoán hình ảnh · SURGERY Phẫu thuật · PROCEDURE Thủ thuật |
| `UserStatus` | ACTIVE “Hoạt động” · INACTIVE “Ngừng” · LOCKED “Bị khóa” |
| `PetGender` | MALE Đực · FEMALE Cái · UNKNOWN Chưa rõ |
| `InventoryTransactionType` | IMPORT Nhập kho · EXPORT_PRESCRIPTION Xuất theo đơn · ADJUSTMENT Điều chỉnh |

Ca **cấp cứu** (`is_emergency`): viền/nhãn đỏ nhấp nháy ở mọi danh sách.

---

## 4. Các quy tắc nghiệp vụ UI bắt buộc tuân thủ

### 4.1 Khung giờ đặt lịch
- Giờ làm việc 08:00–17:30, **14 khung 30 phút**: sáng `08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00` ; nghỉ trưa 12:00–13:30 (không có khung); chiều `13:30, 14:00, 14:30, 15:00, 15:30, 16:00, 16:30`. (Khung cuối bắt đầu 16:30 – kết thúc 17:00 theo tài liệu.)
- **Sức chứa mỗi khung = số bác sĩ ACTIVE** (lấy từ mock users). `booked = số appointment PENDING/CONFIRMED/CHECKED_IN` của khung đó.
- `booked < capacity` → nút xanh “Còn N chỗ”; ngược lại → mờ, disabled, nhãn “Đã kín lịch”.
- Chủ nuôi chọn ngày từ hôm nay đến +30 ngày. Không có bước chọn bác sĩ.
- Khi hủy/từ chối/no-show/đổi lịch: slot cũ được trả 1 suất (tính lại tự động từ state, không lưu counter).

### 4.2 Đổi/hủy lịch của khách
- Chỉ khi lịch ở `PENDING`/`CONFIRMED` **và còn ≥ 2 tiếng** tới giờ hẹn. Dưới 2 tiếng: nút bị khóa + thông báo “Vui lòng gọi hotline để được hỗ trợ”.
- Hủy bắt buộc chọn lý do (Bận đột xuất / Thú cưng đã khỏi / Đổi cơ sở khác / Khác).
- Khi mock “giờ hiện tại”: dùng một hằng `MOCK_NOW` (có thể chỉnh) để demo cả 2 trường hợp ≥2h và <2h.

### 4.3 Hàng đợi tiếp đón (Visit `WAITING`) – thứ tự hiển thị
1. `is_emergency = true` lên đầu tuyệt đối.
2. Có lịch hẹn và check-in **đúng khung giờ** (FIFO theo giờ hẹn).
3. Vãng lai + có hẹn nhưng **đến trễ** quá khung (FIFO theo `checked_in_at`).
- Hiển thị cột: STT, mã visit, thú cưng/chủ nuôi, loại (Cấp cứu / Có hẹn / Vãng lai / Đến trễ), triệu chứng, thời gian chờ (phút), nút “Phân công”.

### 4.4 Trạng thái bác sĩ (tính từ các visit của bác sĩ – viết 1 hàm `getDoctorStatus(doctorId, visits)`)
- Có ca `IN_PROGRESS` → `BUSY`
- Ngược lại có ca `RESULTS_READY` (chưa bị “tạm hoãn”) → `AVAILABLE_PRIORITY_CALLBACK` (**Priority Lock**: nút “Phân công vào phòng này” của lễ tân **disabled**, hiện “Đang ưu tiên đón ca tái khám: [Tên Pet]”)
- Ngược lại → `AVAILABLE`
- Ca đã được lễ tân gán nhưng bác sĩ chưa bấm “Bắt đầu khám” (visit `WAITING` có `doctor_id`) cũng tính là **không nhận thêm ca mới** (tránh gán đôi). Hiển thị “Đã nhận ca, chờ bắt đầu”.
- “Tạm hoãn ca tái khám” (bác sĩ): đặt cờ `callbackPostponed = true` trên visit → bác sĩ coi như `AVAILABLE`, visit giữ `RESULTS_READY` nằm ở tab “Đã hoãn”. “Gọi lại vào phòng” (Recall) bỏ cờ.
- Mỗi bác sĩ một số phòng cố định (P01, P02, P03…).

### 4.5 Chuyển trạng thái Visit (hàm thuần trong `ClinicContext`, mỗi hàm kiểm điều kiện guard)
| Từ → Đến | Hành động UI | Guard |
|---|---|---|
| (mới) → WAITING | Check-in / vãng lai / cấp cứu | cân nặng, nhiệt độ > 0 |
| WAITING → (gán bác sĩ) | Lễ tân “Xác nhận phân công” | bác sĩ `AVAILABLE` (re-check lúc bấm) |
| WAITING → IN_PROGRESS | Bác sĩ “Bắt đầu khám” | visit đã gán cho chính bác sĩ này; bác sĩ không BUSY |
| WAITING → CANCELLED | Lễ tân “Hủy tiếp nhận” | nhập lý do |
| IN_PROGRESS(GĐ1) → WAITING_RESULTS | Bác sĩ “Xác nhận chỉ định & chuyển CLS” | ≥1 dịch vụ LABORATORY/IMAGING |
| IN_PROGRESS(GĐ1) → WAITING_PAYMENT | Bác sĩ “Chốt đợt khám” (ca không CLS) | có `diagnosis` |
| IN_PROGRESS(GĐ1) → CANCELLED | “Khách từ chối / chuyển viện” | nhập lý do |
| WAITING_RESULTS → RESULTS_READY | **Tự động** | không còn service detail PENDING/IN_PROGRESS (COMPLETED hoặc CANCELLED hết) |
| WAITING_RESULTS → CANCELLED | “Khách bỏ về” | lý do |
| RESULTS_READY → IN_PROGRESS(GĐ2) | Bác sĩ “Mời vào phòng” / “Gọi lại” | bác sĩ không BUSY |
| RESULTS_READY → COMPLETED | “Đóng ca / Khách bỏ về” | tạo invoice PENDING (ghi nợ) – hiển thị nhãn “Ghi nợ” |
| IN_PROGRESS(GĐ2) → WAITING_PAYMENT | “Chốt đợt khám” | có `diagnosis`; khóa hồ sơ |
| WAITING_PAYMENT → COMPLETED | Thu tiền (PAID) rồi Phát thuốc (hoặc không có đơn thuốc) | invoice PAID; prescription DISPENSED nếu có |

- Sau “Chốt”: toàn bộ form chuyên môn **read-only** + banner “Hồ sơ đã khóa”.
- Phân biệt GĐ1/GĐ2 bằng cờ `phase: 1 | 2` trên visit (không phải enum, chỉ để UI).

### 4.6 Dịch vụ cận lâm sàng
- Hai hàng đợi độc lập: **Lab** (`category = LABORATORY`) và **CĐHA** (`category = IMAGING`). Sắp xếp: cấp cứu trước → FIFO theo giờ gửi chỉ định.
- Nút “Mời vào phòng” (mock loa) vẫn giữ PENDING. “Bắt đầu thực hiện” → IN_PROGRESS. “Lưu & Xác nhận kết quả” → COMPLETED.
- “Báo vắng mặt / Gọi ca tiếp” (sau 3 lần gọi – hiển thị bộ đếm lần gọi 1/3, 2/3, 3/3): giữ PENDING, chuyển sang tab **“Ca tạm hoãn do vắng mặt”**. Khi khách quay lại (“Tôi đã có mặt” – nút mô phỏng): hiển thị xanh nhấp nháy + ghim “Ưu tiên kế tiếp” lên đầu hàng đợi; nút “Gọi lại vào phòng”.
- Huy hiệu liên phòng trên hàng đợi CĐHA khi cùng visit có xét nghiệm chưa xong: 🟡 “Đang lấy máu bên phòng Lab” / 🟢 “Đã lấy máu xong, sẵn sàng chụp”.
- “Hủy dịch vụ” (kèm lý do) → CANCELLED, **không tính tiền** ở hóa đơn.
- Xét nghiệm: nhập `result_value` cho từng chỉ số của gói (§9.5); UI tự đối chiếu khoảng tham chiếu **theo loài** của thú cưng (Chó/Mèo) → gán LOW/NORMAL/HIGH, hiển thị khoảng tham chiếu cạnh ô nhập, tô màu. Lưu kèm snapshot min/max.
- CĐHA: mô tả hình ảnh, kết luận, **tải ảnh** (chọn file trong trình duyệt → xem trước bằng `URL.createObjectURL`, giới hạn JPG/PNG/DICOM ≤ 10MB; sai định dạng/quá dung lượng → báo lỗi và yêu cầu chọn lại). Không upload thật.

### 4.7 Kê đơn & tồn kho
- Tối đa **1 đơn thuốc / visit**. Mỗi dòng: thuốc, số lượng, liều dùng, tần suất, số ngày, hướng dẫn.
- Dropdown/tìm thuốc hiển thị: tên, hoạt chất, đơn vị, giá bán, **tồn kho khả dụng**. Số lượng > tồn → chặn: “Số lượng kê (10) vượt quá tồn kho khả dụng (6). Vui lòng giảm số lượng hoặc kê loại thuốc thay thế”.
- `unit_price` được **snapshot** vào dòng thuốc lúc thêm; đổi giá danh mục sau đó không ảnh hưởng đơn cũ.

### 4.8 Hóa đơn & thanh toán
- Công thức: `Tổng dịch vụ + Tổng thuốc − Chiết khấu = Tổng phải thanh toán`. Dịch vụ `CANCELLED` không tính.
- Chiết khấu > (dịch vụ + thuốc) → chặn: “Số tiền giảm giá không thể vượt quá tổng viện phí của ca khám”.
- Hình thức: tiền mặt / chuyển khoản (hiện **mã VietQR giả** + số tiền + nội dung) / thẻ POS. Có nút “In phiếu tạm tính” và “In hóa đơn” (mở `window.print()` với CSS in).
- Thu ngân **không sửa** chỉ định/đơn thuốc; nếu cần sửa → nút “Yêu cầu mở lại đợt khám” (chỉ hiển thị thông báo mô phỏng).
- Sau PAID: nút “Chuyển sang phát thuốc”. Ca không có đơn thuốc → tự `COMPLETED`.

### 4.9 Xuất thuốc
- Điều kiện: invoice PAID, prescription PRESCRIBED.
- Bấm “Xác nhận xuất thuốc & Hoàn tất ca khám”: kiểm tồn từng thuốc; thiếu → báo lỗi “Không thể xuất kho: Thuốc [Tên] trong kho không đủ số lượng…”, **không thay đổi gì**. Đủ → trừ `stock_quantity`, thêm dòng `inventory_transactions (EXPORT_PRESCRIPTION)`, prescription → DISPENSED, visit → COMPLETED. Bấm lần 2 → chặn “Đơn thuốc này đã được xuất kho trước đó”. Disable nút sau khi bấm (chống double-click).
- In “Phiếu hướng dẫn dùng thuốc”.

---

## 5. KHU VỰC PET_OWNER – Customer Portal (`/portal`)

Layout: header + menu (Thú cưng · Đặt lịch · Lịch hẹn · Bệnh án · Thông báo · Hồ sơ cá nhân). Chỉ role `PET_OWNER`.

| # | Route | Màn hình | Chức năng chi tiết |
|---|---|---|---|
| P1 | `/` | Trang chủ công khai | Hero, dịch vụ, bảng giá (lấy từ mock services), nút “Đặt lịch” (chưa đăng nhập → về login) |
| P2 | `/auth/login`, `/auth/register` | Đăng nhập / Đăng ký | Đăng nhập bằng username hoặc SĐT + mật khẩu (mock: chấp nhận tài khoản trong mock users; có nút điền nhanh tài khoản demo cho 4 vai trò). Đăng ký: họ tên, SĐT (10 số, duy nhất), email, địa chỉ, mật khẩu. Sai thông tin → thông báo lỗi. Tài khoản `LOCKED`/`INACTIVE` → báo không đăng nhập được |
| P3 | `/portal/profile` | Thông tin cá nhân | Xem/sửa họ tên, email, địa chỉ; SĐT chỉ xem; đổi mật khẩu (form mô phỏng) |
| P4 | `/portal/pets` | Danh sách thú cưng | Thẻ thú cưng (ảnh avatar, tên, loài, giống, tuổi); nút “Thêm thú cưng” (modal/form: tên, loài [Chó, Mèo, Chim, Thỏ…], giống, giới tính, ngày sinh, màu lông, cân nặng, đã triệt sản?, đặc điểm nhận dạng, ghi chú) |
| P5 | `/portal/pets/:petId` | Chi tiết thú cưng | Xem/sửa thông tin, đặc điểm nhận dạng; tab “Lịch sử khám” rút gọn; nút “Đặt lịch cho bé” |
| P6 | `/portal/booking` | Đặt lịch khám (3 bước) | B1 chọn thú cưng (hoặc “Thêm mới” inline) → B2 chọn ngày (≤30 ngày) rồi lưới 14 khung giờ với trạng thái Còn chỗ/Đã kín (§4.1) → B3 nhập lý do/triệu chứng + xác nhận. Kết quả: màn hình thành công có mã `APT-YYYYMMDD-NNN`, trạng thái **Chờ xác nhận**, thông báo “Lễ tân sẽ liên hệ xác nhận trong vòng 30 phút”. **Không có ô chọn bác sĩ.** Giữ dữ liệu form khi lỗi |
| P7 | `/portal/appointments` | Lịch hẹn của tôi | Tab/lọc theo trạng thái (Chờ xác nhận, Đã xác nhận, Đã đến khám, Đã hủy, Vắng mặt). Mỗi lịch: mã, thú cưng, ngày giờ, lý do, kênh, badge. Nút **Đổi ngày/giờ** (mở lưới khung giờ ngày mới, nhập lý do, xác nhận) và **Hủy lịch** (chọn lý do) – tuân §4.2. Lịch `CANCELLED` hiển thị `cancel_reason` |
| P8 | `/portal/medical-history` | Lịch sử khám bệnh | Chọn thú cưng → danh sách visit `COMPLETED` (mã, ngày, chẩn đoán tóm tắt) |
| P9 | `/portal/medical-history/:visitId` | Chi tiết bệnh án | Triệu chứng, chẩn đoán, phác đồ, lời dặn; bảng **kết quả xét nghiệm** (chỉ số, giá trị, đơn vị, khoảng tham chiếu, badge Thấp/BT/Cao); **kết quả CĐHA** (mô tả, kết luận, thư viện ảnh có phóng to); **đơn thuốc** chi tiết; **hóa đơn** tóm tắt. Tất cả read-only |
| P10 | `/portal/prescriptions`, `/portal/vaccinations`, `/portal/invoices` (+`/:id`) | Tra cứu nhanh (tuỳ chọn, đã có trong code) | Danh sách đơn thuốc / mũi tiêm-tẩy giun (lọc từ visit có dịch vụ VACCINATION/DEWORMING) / hóa đơn. Chỉ xem |
| P11 | `/portal/notifications` | Thông báo | Danh sách (lịch hẹn được duyệt/từ chối, đổi lịch, hủy, “bé đã có kết quả CLS, vui lòng chờ tại sảnh”, mời vào phòng P0x). Đánh dấu đã đọc. Dữ liệu mock cố định |

Trạng thái khách có thể thấy trên visit đang diễn ra (tuỳ chọn banner ở `/portal/appointments`): “Bé đã đến – Chờ khám / Đang khám phòng P02 / Chờ kết quả / Có kết quả – chờ bác sĩ mời vào”.

---

## 6. KHU VỰC RECEPTIONIST – Reception Console (`/reception`)

Menu: **Bảng điều phối hàng đợi** · Lịch hẹn · Tiếp nhận · Khách hàng & Thú cưng · Thu ngân · Phát thuốc. Chỉ role `RECEPTIONIST`.

| # | Route | Màn hình | Chức năng chi tiết |
|---|---|---|---|
| R1 | `/reception/queue` (trang chủ) | **Bảng điều phối hàng đợi** (UC-20, UC-21) | 2 cột: **(Trái)** hàng đợi `WAITING` sắp theo §4.3, ca cấp cứu nhấp nháy đỏ; **(Phải)** bảng bác sĩ: tên, phòng cố định, trạng thái (§4.4), số ca đang chờ đọc KQ. Thanh tóm tắt: số ca chờ, số bác sĩ rảnh, ca chờ KQ, ca chờ thanh toán. Hành động trên mỗi ca: **Phân công bác sĩ**, **Tạm hoãn** (đẩy xuống cuối hàng, chờ kích hoạt lại), **Hủy tiếp nhận** (lý do). Có khu “Đang chờ kết quả CLS” (chỉ xem, nhóm theo bác sĩ). Hàng đợi trống → “Hiện không có bệnh nhân nào trong hàng đợi”. Tất cả bác sĩ bận → hiển thị thời gian khám ước tính từng phòng |
| R1a | (modal) | Phân công bác sĩ | Chọn ca → liệt kê bác sĩ; chỉ bác sĩ `AVAILABLE` chọn được; `AVAILABLE_PRIORITY_CALLBACK` bị disable + nhãn cam “Đang ưu tiên đón ca tái khám: [Tên Pet]”; `BUSY` mờ. “Xác nhận phân công” → re-check: nếu bác sĩ vừa đổi trạng thái → báo “Bác sĩ đã nhận ca khám khác, vui lòng chọn bác sĩ khác”. Thành công: gán `doctor`, `assigned_room`, toast “Mời khách vào phòng P0x”, nút **In phiếu số phòng**. Cho phép **đổi bác sĩ** khi bác sĩ chưa bấm bắt đầu khám |
| R2 | `/reception/appointments` | Quản lý lịch hẹn (UC-17, 16, 15) | **Tab “Chờ duyệt”** (PENDING, sắp theo giờ gửi): xem chi tiết (chủ nuôi, SĐT, thú cưng, loài, triệu chứng, ngày/giờ) → **Xác nhận lịch hẹn** (có gợi ý dặn dò “nhịn ăn 6 tiếng nếu cần XN máu”) / **Từ chối** (bắt buộc lý do) / **Ghi chú liên hệ thất bại** (giữ PENDING). **Tab “Hôm nay”** (CONFIRMED): nút Check-in, Đổi giờ, Hủy; **cảnh báo quá giờ 30 phút** + nút **Đánh dấu vắng mặt (No-Show)** / “Ghi chú: khách đến muộn 15p”. **Tab “Tất cả”**: lọc theo ngày/trạng thái/kênh/từ khóa SĐT. Hiển thị cột kênh (Online/Điện thoại/Tại quầy) |
| R2a | `/reception/appointments/new` (hoặc modal) | Tạo lịch hẹn (UC-16) | Nhập SĐT tra cứu: khách cũ → hiện chủ nuôi + chọn thú cưng; khách mới → “Tạo nhanh khách hàng & thú cưng” (họ tên, SĐT, địa chỉ, tên pet, loài). Chọn ngày + lưới khung giờ (§4.1), triệu chứng, chọn kênh **Qua điện thoại** hoặc **Tại quầy** → “Tạo & Xác nhận” → trạng thái **CONFIRMED** ngay, có nút **In phiếu hẹn** (kênh tại quầy) |
| R3 | `/reception/intake` | Tiếp nhận tại quầy (UC-19) | 3 tab: **Có lịch hẹn** (tra cứu SĐT/mã lịch → chọn lịch CONFIRMED hôm nay), **Khách vãng lai** (tra SĐT; khách mới tạo nhanh hồ sơ qua R4), **Cấp cứu** (bật cờ `is_emergency`, chọn nhanh/tạo nhanh bệnh nhân). Form sinh hiệu: cân nặng (kg), thân nhiệt (°C), triệu chứng/ghi chú. Validation: số âm/không hợp lý → cảnh báo. “Hoàn tất tiếp đón” → tạo Visit `WAITING` (mã `VIS-…`), lịch hẹn → CHECKED_IN, toast + link “Xem hàng đợi” |
| R4 | `/reception/customers` | Danh sách khách hàng (UC-18) | Tìm theo tên/SĐT, bảng: tên, SĐT, số thú cưng, số lần no-show (cảnh báo nếu ≥2). Nút “Thêm khách hàng” |
| R4a | (form) | Thêm khách + thú cưng đầu tiên | Họ tên, SĐT (10 số, trùng → “Số điện thoại này đã được đăng ký cho khách hàng [Tên]…”), email, địa chỉ; kèm thú cưng: tên, loài, giống, giới tính, ngày sinh/tuổi, màu lông, triệt sản, đặc điểm nhận dạng. Thông báo: tài khoản PET_OWNER được tạo tự động (mật khẩu mặc định) |
| R5 | `/reception/customers/:customerId` | Chi tiết khách hàng | Sửa thông tin liên hệ; danh sách thú cưng + “Thêm thú cưng”; lịch sử lịch hẹn; lịch sử no-show; công nợ (hóa đơn ghi nợ PENDING nếu có) |
| R6 | `/reception/pets`, `/reception/pets/:petId` | Hồ sơ thú cưng | Danh sách/tìm kiếm; chi tiết + sửa thông tin hành chính (KHÔNG sửa dữ liệu chuyên môn); danh sách các lần khám (chỉ xem tóm tắt, không chẩn đoán chi tiết sửa được) |
| R7 | `/reception/invoices` | Thu ngân – chờ thanh toán (UC-34) | Danh sách visit `WAITING_PAYMENT` + hóa đơn PENDING (kể cả ghi nợ), tab “Đã thanh toán”. Lọc, tìm |
| R7a | `/reception/invoices/:visitId` | Chi tiết & thu tiền (UC-34_35) | Bảng kê: dịch vụ (khám, CLS – bỏ dịch vụ đã hủy), thuốc, tách riêng 2 nhóm; ô chiết khấu (validate §4.8); tổng tự tính; chọn phương thức (VietQR hiển thị QR giả); “In phiếu tạm tính”; “Xác nhận thanh toán” → PAID + `paid_at` + thu ngân; sau đó nút “Chuyển sang phát thuốc” |
| R8 | `/reception/dispense` | Phát thuốc (UC-36) | Danh sách đơn thuốc chờ phát (invoice PAID, prescription PRESCRIBED). Chi tiết: thuốc, hoạt chất, số lượng, liều, hướng dẫn, tồn hiện tại; nút “Xác nhận xuất thuốc & Hoàn tất ca khám” (§4.9); in phiếu hướng dẫn |
| R9 | (thông báo nổi) | Chuông thông báo | “Ca VIS-… đã có KQ”, “Bác sĩ X đang ưu tiên ca tái khám”, “Lịch hẹn mới chờ duyệt” |

Quy tắc chung: lễ tân xem được chẩn đoán/đơn thuốc nhưng **mọi ô chuyên môn read-only**.

---

## 7. KHU VỰC VETERINARIAN – Vet Console (`/vet`)

Nav 3 nhóm: **Phòng khám** (Tổng quan · Ca của tôi · Ca chờ tái khám · Hồ sơ bệnh án) · **Phòng Xét nghiệm** · **Phòng CĐHA**. Header luôn hiện: tên bác sĩ, **phòng cố định**, **badge trạng thái tức thời** (§4.4). Chỉ role `VETERINARIAN`.

### 7.1 Phòng khám

| # | Route | Màn hình | Chức năng chi tiết |
|---|---|---|---|
| V1 | `/vet/dashboard` | Tổng quan bác sĩ | Trạng thái hiện tại + phòng; ca đang khám (nút “Tiếp tục khám”); hộp thoại nổi **“Ca khám tiếp theo: Bệnh nhân [Tên Pet] (đã có đủ kết quả CLS) [MỜI VÀO PHÒNG]”** khi có ca `RESULTS_READY`; số ca đã khám hôm nay; huy hiệu thông báo nhẹ “Ca VIS-… đã có kết quả” khi bác sĩ đang BUSY |
| V2 | `/vet/my-cases` | Ca của tôi (UC-22) | Danh sách ca lễ tân đã phân công vào phòng của bác sĩ (visit `WAITING` có `doctor_id` = tôi), cấp cứu lên đầu. Nút **Bắt đầu khám** (khi bệnh nhân vào phòng) → `IN_PROGRESS`, badge → BUSY, mở màn khám. Nút “Báo vắng mặt / Chuyển trả lễ tân” |
| V3 | `/vet/examinations/:visitId` | **Khám GĐ1** (UC-22_23) | Bố cục 3 cột. *Trái:* thông tin thú cưng/chủ nuôi, sinh hiệu lúc tiếp nhận, triệu chứng ban đầu, **Lịch sử bệnh án** (các visit cũ: chẩn đoán, tiêm phòng, đơn thuốc, dị ứng). *Giữa:* form khám lâm sàng: cân nặng, thân nhiệt đo lại, nghe tim phổi, niêm mạc, hạch, ổ bụng, ghi chú khám, **chẩn đoán sơ bộ**. *Phải:* panel **Chỉ định dịch vụ** (tìm theo danh mục, lọc theo nhóm, hiển thị đơn giá niêm yết, thành tiền tự tính, snapshot giá). Hai nút kết: **“Xác nhận chỉ định & chuyển phòng CLS”** (→ WAITING_RESULTS, bác sĩ được giải phóng, toast hướng dẫn chủ nuôi lộ trình XN máu trước rồi CĐHA) hoặc **“Khám xong – không cần CLS”** (chuyển sang bước kê đơn/chốt, cho phép thêm dịch vụ tại chỗ như tiêm phòng/tẩy giun) |
| V4 | `/vet/callback` | Ca chờ tái khám | Tab **“Có kết quả”** (RESULTS_READY của tôi, FIFO) – nút **Mời vào phòng**; tab **“Đã hoãn”** – nút **Gọi lại vào phòng (Recall)**; nút **Tạm hoãn / Gọi ca tiếp** (sau 2–3 lần gọi, bộ đếm). Tab “Đang chờ kết quả” (WAITING_RESULTS của tôi, kèm tiến độ từng dịch vụ 1/2 hoàn tất) |
| V5 | `/vet/examinations/:visitId/consult` | **Hội chẩn GĐ2 + kê đơn + chốt** (UC-30_31_33) | *Khối kết quả:* bảng xét nghiệm (badge LOW/NORMAL/HIGH, khoảng tham chiếu), ảnh siêu âm/X-quang (xem phóng to) + kết luận. *Khối chẩn đoán:* chẩn đoán xác định (**bắt buộc**), phác đồ điều trị, lời dặn chủ nuôi. *Khối kê đơn:* thêm thuốc (§4.7), bảng dòng thuốc với thành tiền, tổng tiền thuốc. *Nút:* “Lưu đơn thuốc”, **“Chốt đợt khám / Chuyển thanh toán”** → modal xác nhận “Sau khi chốt, hồ sơ bệnh án sẽ bị khóa chỉnh sửa” → WAITING_PAYMENT; bác sĩ về AVAILABLE hoặc PRIORITY_CALLBACK nếu còn ca RESULTS_READY (hiện ngay hộp thoại ca tiếp theo). Chốt khi thiếu chẩn đoán → “Vui lòng nhập kết luận chẩn đoán xác định trước khi chốt đợt khám”. Ca không qua CLS dùng cùng màn hình này (ẩn khối kết quả) |
| V6 | `/vet/records` | Hồ sơ bệnh án đã khám | Bảng các visit tôi phụ trách (lọc trạng thái, ngày, tìm theo thú cưng); mở chi tiết read-only |
| V7 | `/vet/pets/:petId/history` | Lịch sử bệnh án thú cưng | Timeline toàn bộ visit của thú cưng (chẩn đoán, XN, CĐHA, đơn thuốc, tiêm phòng/tẩy giun) |

Màn khám sau khi đã chốt (hoặc mở lại visit cũ): tất cả input **disabled** + banner khóa.

### 7.2 Phòng Xét nghiệm (Lab) – `VETERINARIAN` vận hành

| # | Route | Màn hình | Chức năng chi tiết |
|---|---|---|---|
| L1 | `/vet/lab` | Hàng đợi Phòng Xét nghiệm (UC-25) | Danh sách service detail `category=LABORATORY` trạng thái PENDING (cấp cứu đỏ nhấp nháy trước, FIFO). Cột: STT, thú cưng/chủ, loài, xét nghiệm, giờ chỉ định, bác sĩ chỉ định. Nút **Mời vào phòng** (đếm lần gọi 1–3), **Bắt đầu thực hiện** (→ IN_PROGRESS), **Báo vắng mặt / Gọi ca tiếp**. Tab: *Hàng đợi · Đang thực hiện · Ca tạm hoãn do vắng mặt (nút “Khách đã có mặt” → Ưu tiên kế tiếp + “Gọi lại”) · Hoàn tất hôm nay* |
| L2 | `/vet/lab/:detailId` | Nhập kết quả xét nghiệm | Form theo gói (vd. CBC: WBC, RBC, HGB, HCT, PLT): mỗi dòng gồm tên chỉ số, ô giá trị, đơn vị, **khoảng tham chiếu theo loài** của bệnh nhân, badge đánh giá tự động; nhận xét chuyên môn. “Lưu & Xác nhận kết quả” → COMPLETED; nếu đây là dịch vụ cuối của visit → toast “Ca đã có kết quả – đã báo bác sĩ khám chính”. Nút **Hủy dịch vụ** (lý do) |

### 7.3 Phòng Chẩn đoán hình ảnh (CĐHA)

| # | Route | Màn hình | Chức năng chi tiết |
|---|---|---|---|
| I1 | `/vet/imaging` | Hàng đợi CĐHA | Tương tự L1 cho `category=IMAGING` (siêu âm, X-quang) + **huy hiệu liên phòng** (§4.6) + nút **Tạm hoãn / Gọi ca tiếp** + tab ca tạm hoãn, nút Recall |
| I2 | `/vet/imaging/:detailId` | Nhập kết quả CĐHA | Mô tả hình ảnh, kết luận, **upload nhiều ảnh** (preview, xoá, kiểm định dạng/dung lượng), “Bắt đầu chụp/siêu âm” → “Lưu & Xác nhận kết quả”. Hủy dịch vụ kèm lý do (vd. thú cưng quá hung dữ) → nếu các dịch vụ còn lại đều xong thì visit tự → RESULTS_READY |

---

## 8. KHU VỰC ADMIN – Admin Console (`/admin`)

Menu: Tổng quan · Tài khoản · Nhân sự & Phòng khám · Dịch vụ · Xét nghiệm & Tham chiếu · Thuốc & Kho · Báo cáo · (tuỳ chọn) Nhật ký hoạt động. Chỉ role `ADMIN`. **Không có màn hình sửa dữ liệu chuyên môn.**

| # | Route | Màn hình | Chức năng chi tiết |
|---|---|---|---|
| A1 | `/admin/dashboard` | Tổng quan | Thẻ số liệu: lượt khám hôm nay, ca hoàn tất, ca hủy, no-show, doanh thu hôm nay/tháng, thuốc sắp hết hàng (cảnh báo), số bác sĩ ACTIVE (= sức chứa mỗi khung). Biểu đồ doanh thu 7/30 ngày (SVG/CSS thuần), top dịch vụ |
| A2 | `/admin/users` | Tài khoản & người dùng | Bảng users (tên, username, SĐT, vai trò, trạng thái); lọc theo vai trò/trạng thái; tạo tài khoản nhân viên (Bác sĩ, Lễ tân); **Kích hoạt / Ngừng / Khóa**; reset mật khẩu (mô phỏng). SĐT/username duy nhất. Không tạo thêm role ngoài 4 role |
| A3 | `/admin/staff` | Nhân sự & Phòng khám | Danh sách bác sĩ: tên, **`room_number` cố định** (chọn/nhập P01…; không trùng giữa 2 bác sĩ), trạng thái. Sửa phòng. Hiển thị banner: “Sức chứa mỗi khung giờ hiện tại = N (số bác sĩ ACTIVE)”; khóa/ngừng 1 bác sĩ → N giảm ngay. Danh sách lễ tân |
| A4 | `/admin/services` | Danh mục dịch vụ | CRUD: mã, tên, nhóm (9 `ServiceCategory`), giá, mô tả, `is_active`. **Không xóa cứng** dịch vụ đã dùng → chỉ “Ngừng cung cấp”. Với nhóm LABORATORY: gán danh sách chỉ số (xem A5). Đổi giá không ảnh hưởng đơn cũ (ghi chú UI) |
| A5 | `/admin/lab-config` | Chỉ số xét nghiệm & Khoảng tham chiếu | Tab 1 **Chỉ số** (`code, tên, đơn vị, mô tả`: WBC, RBC, HGB, HCT, PLT, GLUCOSE…). Tab 2 **Khoảng tham chiếu theo loài**: ma trận chỉ số × loài (Chó/Mèo/…) với `min`, `max` (vd. WBC Chó 6.00–17.00, Mèo 5.50–19.50; PLT Chó 200–500, Mèo 300–700). Sửa/thêm; cảnh báo “KQ cũ giữ nguyên snapshot”. Tab 3 **Gói XN ↔ chỉ số** (CBC gồm WBC,RBC,HGB,HCT,PLT) |
| A6 | `/admin/medicines` | Danh mục thuốc & Tồn kho | CRUD thuốc: mã, tên, hoạt chất, dạng bào chế, đơn vị, giá bán, tồn kho, ngưỡng cảnh báo `min_stock_alert`, `is_active`. Dòng `tồn ≤ ngưỡng` tô cảnh báo “Sắp hết”. Nút **Nhập kho** (số lượng + ghi chú), **Điều chỉnh kho** (+/−, lý do bắt buộc: kiểm kê/hao hụt/hết hạn). Tab **Nhật ký kho** (`inventory_transactions`: thời gian, thuốc, loại, ±SL, tồn sau, tham chiếu đơn, người thực hiện) |
| A7 | `/admin/reports` | Báo cáo & thống kê | Bộ lọc thời gian (ngày/tháng/năm/khoảng tuỳ chọn). Tab: **Doanh thu** (theo ngày/tháng/năm, tách dịch vụ vs thuốc) · **Hoạt động khám** (số lượt, hoàn tất, hủy, no-show) · **Dịch vụ** (dùng nhiều nhất, doanh thu theo dịch vụ) · **Thuốc** (bán chạy, sắp hết) · **Bác sĩ** (số ca khám/hoàn thành – thống kê, không phân quyền). Bảng + biểu đồ; nút “Xuất CSV” (client-side từ mock) |
| A8 | `/admin/activity` | Nhật ký hoạt động (tuỳ chọn) | Danh sách sự kiện mock: đăng nhập, khóa tài khoản, đổi giá… (đã có trong code cũ) |

---

## 9. Dữ liệu mock (fix cứng) – thiết kế để mọi màn hình đều có dữ liệu demo

Tạo `src/mock/` gồm: `users.js, species.js, pets.js, appointments.js, visits.js, services.js, labConfig.js, visitServices.js, labResults.js, imagingResults.js, medicines.js, prescriptions.js, invoices.js, inventory.js, notifications.js, index.js` (export 1 object `initialClinicState`). Quan hệ khóa tuân ERD (`../tài liệu đồ án/THIET_KE_CO_SO_DU_LIEU_ERD (1).md`).

### 9.1 Users (mật khẩu demo chung `123456`)
- `admin` (ADMIN) · `letan01`, `letan02` (RECEPTIONIST)
- `bacsi01` Phòng **P01**, `bacsi02` **P02**, `bacsi03` **P03** (VETERINARIAN, ACTIVE) + 1 bác sĩ `bacsi04` **INACTIVE** (để minh họa sức chứa giảm) → capacity mặc định = 3
- 5–6 PET_OWNER (vd. Nguyễn Văn A có Miu/Bông/Lucky; 1 khách có 2 lần no-show; 1 khách đang ghi nợ)
- Màn đăng nhập có nút “Điền nhanh” cho từng vai trò.

### 9.2 Danh mục
- `species`: DOG Chó, CAT Mèo, BIRD Chim, RABBIT Thỏ.
- `services` (≥ 14), đủ 9 nhóm: Khám tổng quát 100.000; Vaccine 5 bệnh (công tiêm) 50.000; Tẩy giun 30.000; Trị ve rận 60.000; Truyền dịch 120.000; **XN máu CBC 250.000 (LABORATORY)**; XN sinh hóa 300.000 (LABORATORY); **Siêu âm ổ bụng 200.000 (IMAGING)**; X-quang ngực 220.000 (IMAGING); Triệt sản 800.000 (SURGERY); Cắt chỉ 40.000 (PROCEDURE)… Một dịch vụ `is_active=false`.
- `lab_test_items`: WBC (10^9/L), RBC (10^12/L), HGB (g/dL), HCT (%), PLT (10^9/L), GLUCOSE (mmol/L).
- `lab_test_reference_ranges`: theo loài, tối thiểu WBC Chó 6.00–17.00 / Mèo 5.50–19.50; PLT Chó 200–500 / Mèo 300–700; các chỉ số còn lại có số liệu hợp lý cho cả Chó & Mèo.
- Mapping gói: CBC → WBC,RBC,HGB,HCT,PLT; Sinh hóa → GLUCOSE (+ vài chỉ số).
- `medicines` (≥ 10): có thuốc tồn thấp (≤ ngưỡng), 1 thuốc tồn 6 (để demo lỗi “kê 10 > tồn 6”), 1 thuốc ngừng bán; có vaccine/thuốc tẩy giun (tách riêng khỏi dịch vụ công tiêm).

### 9.3 Dữ liệu giao dịch – phủ đủ trạng thái (để demo không cần thao tác trước)
- **Appointments** (hôm nay = `MOCK_NOW`): ≥2 PENDING (ONLINE), ≥3 CONFIRMED (có 1 quá giờ > 30 phút để demo No-show, 1 sắp tới < 2h, 1 > 2h), 1 CHECKED_IN, 1 CANCELLED (có lý do), 1 NO_SHOW; vài lịch ngày mai/tuần sau để lưới khung giờ có khung “kín” (cho 1 khung có booked = capacity).
- **Visits** ít nhất 1 ca cho MỖI trạng thái: WAITING (có 1 cấp cứu, 1 vãng lai, 1 có hẹn đúng giờ, 1 có hẹn đến trễ), WAITING (đã gán bác sĩ, chưa bắt đầu), IN_PROGRESS GĐ1, IN_PROGRESS GĐ2, WAITING_RESULTS (1 dịch vụ xong, 1 chưa), **RESULTS_READY** (gắn với bacsi02 để bác sĩ này ở trạng thái PRIORITY_CALLBACK; 1 ca RESULTS_READY “đã hoãn”), WAITING_PAYMENT (có đơn thuốc), COMPLETED (nhiều ca lịch sử, nhiều ngày để báo cáo), CANCELLED.
- Trạng thái bác sĩ mặc định: bacsi01 = BUSY, bacsi02 = PRIORITY_CALLBACK, bacsi03 = AVAILABLE.
- **visit_service_details** đủ PENDING/IN_PROGRESS/COMPLETED/CANCELLED; hàng đợi Lab có ≥3 ca (1 cấp cứu, 1 “ca tạm hoãn do vắng mặt”), hàng đợi CĐHA có ≥3 ca (1 có huy hiệu “Đang lấy máu bên phòng Lab”).
- **lab_test_results**: giá trị đủ LOW/NORMAL/HIGH (vd. máu Chó WBC = 21.0 → HIGH) kèm snapshot min/max.
- **imaging_results**: 2–3 kết quả với 1–3 ảnh (dùng ảnh trong `public/mock/` hoặc placeholder SVG/data-URI).
- **invoices**: PENDING (ca WAITING_PAYMENT), PAID (nhiều ca, nhiều phương thức), 1 PENDING “ghi nợ” (ca đóng do khách bỏ về), 1 CANCELLED.
- **prescriptions**: PRESCRIBED, DISPENSED; `prescription_items` có snapshot giá.
- **inventory_transactions**: vài dòng IMPORT / EXPORT_PRESCRIPTION / ADJUSTMENT.
- **notifications** cho từng vai trò.

### 9.4 Mã sinh tự động (mock)
`APT-YYYYMMDD-NNN`, `PET-YYYYMM-NNN`, `VIS-YYYY-NNNN`, `INV-YYYY-NNNN`. Hàm sinh mã nằm trong `ClinicContext`.

---

## 10. Cấu trúc thư mục đề xuất

```
src/
  mock/                     # dữ liệu fix cứng (§9)
  contexts/
    AuthContext.js          # đăng nhập mock theo mock/users
    ClinicContext.js        # state + reducer + các action nghiệp vụ (§4.5)
  domain/                   # hàm thuần, KHÔNG phụ thuộc React → dễ test
    slots.js                # sinh 14 khung, tính capacity/booked
    doctorStatus.js         # getDoctorStatus
    queue.js                # sortWaitingQueue (§4.3)
    billing.js              # tính tổng, validate chiết khấu
    labEvaluation.js        # đánh giá LOW/NORMAL/HIGH theo loài
    visitTransitions.js     # guard chuyển trạng thái (§4.5)
  constants/statusLabels.js # §3
  components/
    common/                 # Modal, StatusBadge, EmptyState, ConfirmDialog, Toast, DataTable, Tabs, TimeSlotGrid, VitalsForm, PetCard, PrintSheet, FakeQrCode
    ...                     # (giữ các thư mục admin/customer/reception/veterinarian hiện có)
  pages/{Public,Auth,Customer,Reception,Veterinarian,Admin}/
  layouts/                  # giữ nguyên + thêm nav mới
```
Component dùng lại nhiều nhất: `StatusBadge`, `TimeSlotGrid`, `DoctorStatusCard`, `QueueTable`, `ServiceOrderPanel`, `LabResultForm`, `ImagingUploader`, `PrescriptionBuilder`, `InvoiceSummary`, `ConfirmDialog`.

---

## 11. Điều hướng & bảo vệ route

- `RequireRole role="…"` cho từng nhóm route (đã có). Sai vai trò → chuyển về trang chủ vai trò của mình + toast “Bạn không có quyền truy cập”.
- Cập nhật `*Navigation.js`/`accessPolicy.js` theo bảng route ở §5–§8 (đổi tên menu vet: Tổng quan, Ca của tôi, Ca chờ tái khám, Hồ sơ bệnh án, Phòng Xét nghiệm, Phòng CĐHA; reception: Điều phối hàng đợi, Lịch hẹn, Tiếp nhận, Khách hàng, Thú cưng, Thu ngân, Phát thuốc; admin thêm Xét nghiệm & Tham chiếu).
- Route cũ không còn dùng (`/vet/prescriptions`, `/vet/service-orders`, `/vet/diagnoses` tách rời theo mô hình appointment cũ) → **gộp vào màn khám V3/V5**, giữ redirect về `/vet/my-cases`.

---

## 12. Thứ tự triển khai đề xuất (làm xong bước nào chạy được bước đó)

1. `mock/*` + `ClinicContext` + `domain/*` (slots, doctorStatus, queue, billing, labEvaluation) + test Jest cho `domain/*`.
2. `statusLabels` + `StatusBadge` + các component dùng chung.
3. Auth mock + điều hướng theo vai trò (§1, §11).
4. **Portal:** pets → booking (lưới khung giờ) → appointments (đổi/hủy 2h) → medical history → notifications.
5. **Reception:** appointments (duyệt/từ chối/no-show/tạo mới) → customers/pets → intake (3 loại) → **queue + phân công + Priority Lock**.
6. **Vet – phòng khám:** my-cases → khám GĐ1 (+chỉ định) → Lab queue/result → Imaging queue/result → callback → consult GĐ2 + kê đơn + chốt.
7. **Reception – thu ngân & phát thuốc** (§4.8, §4.9) → hoàn tất vòng đời.
8. **Admin:** users/staff → services → lab-config → medicines/kho → dashboard/reports.
9. Rà soát §13, in ấn, responsive, empty state.

---

## 13. Checklist nghiệm thu (UI phải làm được)

- [ ] Chủ nuôi đặt lịch **không chọn bác sĩ**; khung đầy bị mờ; sức chứa đổi khi Admin khóa 1 bác sĩ.
- [ ] Đổi/hủy lịch bị chặn khi < 2 giờ; hủy bắt buộc lý do.
- [ ] Lễ tân duyệt/từ chối (bắt buộc lý do) lịch PENDING; đặt qua điện thoại/tại quầy → CONFIRMED ngay; đánh dấu NO_SHOW.
- [ ] Check-in lịch hẹn, vãng lai, cấp cứu → xuất hiện đúng thứ tự trong hàng đợi (cấp cứu > đúng giờ > vãng lai/trễ).
- [ ] Bảng bác sĩ hiện đủ 3 trạng thái; bác sĩ `PRIORITY_CALLBACK` bị khóa phân công kèm nhãn “Đang ưu tiên đón ca tái khám: [Tên Pet]”; phân công xung đột báo lỗi.
- [ ] Bác sĩ: bắt đầu khám → BUSY; chỉ định CLS → ca sang WAITING_RESULTS và bác sĩ được giải phóng; không CLS → chốt thẳng.
- [ ] Lab & CĐHA là 2 hàng đợi độc lập, cấp cứu lên đầu, gọi 3 lần → báo vắng mặt → tab tạm hoãn → “Khách đã có mặt” → ưu tiên kế tiếp; huy hiệu liên phòng.
- [ ] Nhập KQ xét nghiệm tự đánh giá theo loài (Chó ≠ Mèo) và hiển thị khoảng tham chiếu; upload ảnh CĐHA có kiểm tra; hủy 1 dịch vụ vẫn làm ca sang RESULTS_READY và **không tính tiền**.
- [ ] Hết dịch vụ PENDING/IN_PROGRESS → visit tự `RESULTS_READY`, bác sĩ thấy hộp thoại “Mời vào phòng”; “Tạm hoãn” giải phóng bác sĩ; “Gọi lại” hoạt động.
- [ ] Chốt ca bắt buộc chẩn đoán; kê thuốc không vượt tồn; sau chốt toàn bộ form bị khóa.
- [ ] Thu ngân: tách dịch vụ/thuốc, chiết khấu không vượt tổng, 3 phương thức (QR giả), in phiếu.
- [ ] Phát thuốc: trừ kho + ghi nhật ký; thiếu hàng → báo lỗi, không đổi gì; xuất lần 2 bị chặn; ca hoàn thành vào lịch sử bệnh án (chủ nuôi xem được).
- [ ] Admin: CRUD dịch vụ (không xóa cứng), thuốc + nhập/điều chỉnh kho + cảnh báo tồn thấp, khoảng tham chiếu theo loài, gán phòng cố định cho bác sĩ, khóa tài khoản, báo cáo.
- [ ] Mỗi vai trò chỉ thấy menu/route của mình; lễ tân và admin không sửa được dữ liệu chuyên môn.

---

## 14. Điểm mơ hồ trong tài liệu gốc – quyết định dùng cho FE (đừng tự đổi)

| Vấn đề | Quyết định FE |
|---|---|
| Khách bỏ về khi `RESULTS_READY` (EX-11) → `COMPLETED` nhưng hóa đơn còn nợ, mâu thuẫn BR-28 | Cho phép; hiển thị nhãn “Ghi nợ” trên invoice PENDING của visit COMPLETED; tab “Công nợ” ở chi tiết khách hàng |
| Thời điểm tạo hóa đơn | Hệ thống tạo invoice `PENDING` khi visit sang `WAITING_PAYMENT`; thu ngân chỉ chọn phương thức + chiết khấu rồi xác nhận PAID |
| Trạng thái bác sĩ “đã được gán nhưng chưa bắt đầu” | Coi là không nhận thêm ca (§4.4) |
| “Tạm hoãn” ca RESULTS_READY nhưng trạng thái tính động vẫn đếm | Dùng cờ `callbackPostponed` (§4.4) |
| Gói xét nghiệm ↔ chỉ số chưa có bảng trong ERD | Mock `service.labItems[]`; Admin cấu hình ở A5 |
| Không có role Kỹ thuật viên | Bác sĩ (`VETERINARIAN`) vận hành Lab/CĐHA |
| `WALK_IN` trong BookingChannel = “đặt trước tại quầy” (khác với “khách vãng lai” là visit không có lịch) | Nhãn UI: “Đặt tại quầy” vs “Vãng lai” để không nhầm |
| Lịch `PENDING` không có thời hạn tự hết | Chỉ hiện cảnh báo nếu chờ > 30 phút; không tự hủy |
| Mở lại visit sau khi chốt | Chỉ có nút mô phỏng “Yêu cầu mở lại đợt khám” (không triển khai sửa) |
