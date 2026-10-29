# TỔNG HỢP CÁC TRƯỜNG HỢP NGOẠI LỆ VÀ CƠ CHẾ XỬ LÝ HỆ THỐNG
## HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y

> **Tài liệu phục vụ Báo cáo & Giải trình Đồ án tốt nghiệp Công nghệ Thông tin**  
> **Mục tiêu:** Liệt kê toàn diện các tình huống biên (Edge Cases), lỗi phát sinh và ngoại lệ nghiệp vụ (Business Exceptions) trong thực tế vận hành phòng khám thú y, cùng cơ chế điều phối và biến động trạng thái dữ liệu (Database State Transitions) chi tiết.

---

## MỤC LỤC TỔNG QUAN

1. [Bảng Ma trận Tổng hợp các Ngoại lệ Hệ thống](#1-bảng-ma-trận-tổng-hợp-các-ngoại-lệ-hệ-thống)
2. [Phân hệ 1: Đặt lịch hẹn & Hàng đợi Tiếp đón (Booking & Reception)](#2-phân-hệ-1-đặt-lịch-hẹn--hàng-đợi-tiếp-đón)
3. [Phân hệ 2: Khám lâm sàng & Điều phối Bác sĩ (Clinical Phase 1 & Dispatching)](#3-phân-hệ-2-khám-lâm-sàng--điều-phối-bác-sĩ)
4. [Phân hệ 3: Cận lâm sàng & 2 Hàng đợi Chuyên môn độc lập (Lab & Imaging)](#4-phân-hệ-3-cận-lâm-sàng--2-hàng-đợi-chuyên-môn-độc-lập)
5. [Phân hệ 4: Hội chẩn Giai đoạn 2, Hàng đợi Tái khám & Kê đơn (Clinical Phase 2)](#5-phân-hệ-4-hội-chẩn-giai-đoạn-2-hàng-đợi-tái-khám--kê-đơn)
6. [Phân hệ 5: Thanh toán Viện phí & Xuất kho Dược phẩm (Billing & Pharmacy)](#6-phân-hệ-5-thanh-toán-viện-phí--xuất-kho-dược-phẩm)

---

## 1. BẢNG MA TRẬN TỔNG HỢP CÁC NGOẠI LỆ HỆ THỐNG

| Mã NL | Tên tình huống ngoại lệ | Phân hệ phát sinh | Bảng & Cột CSDL biến động | Trạng thái Trước $\rightarrow$ Sau | Giải pháp xử lý nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **EX-01** | Khách đặt hẹn không đến đúng giờ | Đặt lịch hẹn | `appointments.status` | `CONFIRMED` $\rightarrow$ `NO_SHOW` | Quá 30 phút tự động hủy giữ chỗ, nhường lượt cho khách tại sảnh. |
| **EX-02** | Khách vãng lai (Walk-in) không đặt lịch | Tiếp đón | `pet_visits.appointment_id`<br>`pet_visits.status` | `NULL`<br>`[Tạo mới]` $\rightarrow$ `WAITING` | Lễ tân tiếp nhận linh hoạt, tạo tài khoản/hồ sơ tức thì, xếp vào hàng đợi sảnh. |
| **EX-03** | Khách bỏ về khi đang chờ ở sảnh tiếp đón | Tiếp đón | `pet_visits.status` | `WAITING` $\rightarrow$ `CANCELLED` | Lễ tân hủy ca, rút khỏi hàng đợi chung, ghi nhận `cancel_reason`. |
| **EX-04** | Ca cấp cứu khẩn cấp chen ngang hàng đợi | Tiếp đón / Khám | `pet_visits.is_emergency` | `FALSE` $\rightarrow$ `TRUE` | Tự động nhảy lên vị trí số 1 của tất cả hàng đợi, viền đỏ cảnh báo. |
| **EX-05** | Phân công ca mới khi Bác sĩ có ca chờ kết quả | Điều phối | *Bị chặn bởi ứng dụng* (`doctor_serving_status`) | `AVAILABLE_PRIORITY_CALLBACK` | Kích hoạt Khóa ưu tiên (Priority Lock), disable nút phân công của Lễ tân. |
| **EX-06** | Khách vắng mặt khi gọi vào phòng Xét nghiệm / CĐHA | Cận lâm sàng | `visit_service_details.status` | Giữ nguyên `PENDING` | Gọi 3 lần không vào $\rightarrow$ Bấm tạm hoãn, chuyển tab chờ, gọi ca sau ngay. |
| **EX-07** | Khách quay lại sau khi bị tạm hoãn ở phòng máy | Cận lâm sàng | `visit_service_details.status` | `PENDING` $\rightarrow$ `IN_PROGRESS` (khi vào phòng) | Báo có mặt $\rightarrow$ Ghim "Ưu tiên kế tiếp" (Next in line), bấm Recall mời vào phòng. |
| **EX-08** | Khách xin hủy 1 trong 2 dịch vụ cận lâm sàng | Cận lâm sàng | `visit_service_details.status`<br>`pet_visits.status` | `PENDING` $\rightarrow$ `CANCELLED`<br>`WAITING_RESULTS` $\rightarrow$ `RESULTS_READY` | Chuyển dịch vụ sang `CANCELLED`, hoàn tất các dịch vụ còn lại $\rightarrow$ Chuyển ca sang có kết quả. Hóa đơn chỉ tính tiền dịch vụ đã làm. |
| **EX-09** | CĐHA gọi số đúng lúc thú cưng đang lấy máu | Điều phối liên phòng | `visit_service_details.status` | Giữ nguyên `PENDING` | Hiện huy hiệu `[Đang lấy máu bên phòng Lab]`, Bác sĩ CĐHA bấm tạm hoãn làm ca khác. |
| **EX-10** | Bác sĩ khám chính gọi lại nhưng khách vắng mặt | Tái khám GĐ 2 | `pet_visits.status`<br>`doctor_serving_status` | Giữ nguyên `RESULTS_READY`<br>`AVAILABLE_PRIORITY_CALLBACK` $\rightarrow$ `AVAILABLE` | Bấm "Tạm hoãn / Gọi ca tiếp", giải phóng Bác sĩ để khám ca mới, lưu ca vào tab chờ. |
| **EX-11** | Khách bỏ về hẳn không quay lại đọc kết quả | Hội chẩn GĐ 2 | `pet_visits.status`<br>`invoices.payment_status` | `RESULTS_READY` $\rightarrow$ `COMPLETED` (khóa)<br>`[Tạo mới]` $\rightarrow$ `PENDING` (nợ) | Thao tác "Đóng ca / Khách bỏ về", lưu vĩnh viễn kết quả vào bệnh án, ghi nợ viện phí. |
| **EX-12** | Bấm chốt đợt khám khi chưa nhập chẩn đoán | Kê đơn / Chốt ca | *Validation Form chặn lại* | Không đổi trạng thái | Cảnh báo yêu cầu nhập `diagnosis` trước khi chuyển sang thanh toán. |
| **EX-13** | Số lượng thuốc kê vượt quá tồn kho khả dụng | Kê đơn | *Validation Form chặn lại* | Không cho thêm vào đơn | Báo lỗi thiếu tồn kho, yêu cầu giảm số lượng hoặc kê biệt dược thay thế. |
| **EX-14** | Nhập tiền giảm giá vượt quá tổng viện phí | Thanh toán | *Validation Form chặn lại* | Không tạo hóa đơn | Cảnh báo số tiền chiết khấu không được vượt quá tổng viện phí. |
| **EX-15** | Tồn kho thực tế bị thiếu tại thời điểm xuất kho | Xuất kho Dược | *Database Transaction Rollback* | Rollback toàn bộ | Rollback trừ kho, giữ nguyên tồn kho, báo lỗi để Bác sĩ đổi đơn thuốc. |
| **EX-16** | Cố tình xuất kho đơn thuốc đã cấp trước đó | Quầy Thu ngân / Tủ thuốc | `prescriptions.status` | Đã là `DISPENSED` $\rightarrow$ Chặn lại | Ngăn chặn hành vi xuất trùng, thất thoát dược phẩm. |

---

## 2. PHÂN HỆ 1: ĐẶT LỊCH HẸN & HÀNG ĐỢI TIẾP ĐÓN

### EX-01: Khách hàng đặt lịch hẹn trực tuyến nhưng không đến đúng giờ (No-show)
- **Bối cảnh thực tế:** Khách đặt hẹn lúc 09:00, đã được Lễ tân xác nhận (`CONFIRMED`). Tuy nhiên đến 09:30 khách vẫn không có mặt.
- **Cơ chế xử lý nghiệp vụ:**
  - Để tránh chiếm dụng khung giờ của khách hàng khác, hệ thống áp dụng nguyên tắc: **Trễ quá 30 phút so với giờ hẹn** được tính là vắng mặt.
  - Lễ tân liên hệ không được sẽ bấm nút *"Xác nhận vắng mặt (No-show)"* (hoặc Cronjob hệ thống quét tự động cuối khung giờ).
- **Biến động CSDL:**
  - Bảng `appointments`: Cột `status` chuyển từ `'CONFIRMED'` sang `'NO_SHOW'`, `updated_at = NOW()`.
  - Bảng `appointment_status_histories`: Ghi nhận 01 bản ghi Audit Trail (`from_status = 'CONFIRMED'`, `to_status = 'NO_SHOW'`, `changed_by_user_id = NULL` nếu do Scheduled Task quét tự động hoặc `receptionist_id` nếu Lễ tân bấm thủ công, `notes = 'Tự động đánh dấu vắng mặt (No-show) do trễ quá 30 phút khung giờ hẹn'`).
  - Khung giờ được giải phóng để tiếp nhận ca vãng lai tại quầy.

### EX-02: Khách vãng lai (Walk-in) đến trực tiếp không qua đặt lịch
- **Bối cảnh thực tế:** Khách bế thú cưng đến thẳng phòng khám do bị bệnh đột ngột.
- **Cơ chế xử lý nghiệp vụ:**
  - Hệ thống áp dụng nguyên tắc **Liên kết lỏng (Loose Coupling)** giữa Lịch hẹn và Ca khám.
  - Lễ tân tra cứu số điện thoại:
    - Nếu là khách mới: Tạo nhanh tài khoản `users` (`role = 'PET_OWNER'`) và tạo hồ sơ `pets`.
    - Nếu là khách quen: Chọn thú cưng có sẵn trong danh sách.
  - Lễ tân tạo đợt khám mới (`Pet Visit`) mà không cần chọn lịch hẹn.
- **Biến động CSDL:**
  - Bảng `pet_visits`: Cột `appointment_id = NULL`, cột `status = 'WAITING'`, cột `checked_in_at = CURRENT_TIMESTAMP`.

### EX-03: Khách hàng tự ý bỏ về khi đang ngồi chờ tiếp đón ở sảnh
- **Bối cảnh thực tế:** Khách đã lấy số tiếp đón nhưng chờ lâu hoặc có việc bận đột xuất nên xin về trước khi được phân công Bác sĩ.
- **Cơ chế xử lý nghiệp vụ:** Lễ tân bấm nút *"Hủy tiếp nhận"* trên màn hình hàng đợi sảnh, chọn lý do hủy.
- **Biến động CSDL:**
  - Bảng `pet_visits`: Cột `status` chuyển từ `'WAITING'` sang `'CANCELLED'`.
  - Cột `cancel_reason` ghi nhận lý do: *"Khách bận việc gia đình xin về"*.
  - Ca khám biến mất khỏi danh sách chờ tiếp đón của Lễ tân.

### EX-04: Ca bệnh cấp cứu khẩn cấp chen ngang hàng đợi (Emergency Preemption)
- **Bối cảnh thực tế:** Thú cưng bị sốc phản vệ, tai nạn giao thông, co giật hoặc khó thở tím tái cần được cấp cứu ngay lập tức.
- **Cơ chế xử lý nghiệp vụ:**
  - Lễ tân tích chọn ô **"Ca cấp cứu khẩn cấp"** lúc tiếp nhận (hoặc Bác sĩ bật cờ khẩn cấp).
  - Thuật toán sắp xếp hàng đợi tự động đưa ca này lên **vị trí số 1 tuyệt đối** trên màn hình điều phối và màn hình phòng khám, kèm viền đỏ nhấp nháy cảnh báo.
- **Biến động CSDL:**
  - Bảng `pet_visits`: Cột `is_emergency = TRUE`.
  - Nhờ chỉ mục hỗn hợp `idx_visits_queue (status, is_emergency, checked_in_at)`, câu lệnh `ORDER BY is_emergency DESC, checked_in_at ASC` lập tức định vị ca này lên đầu với chi phí truy vấn $O(\log N)$.

---

## 3. PHÂN HỆ 2: KHÁM LÂM SÀNG & ĐIỀU PHỐI BÁC SĨ

### EX-05: Lễ tân cố tình phân công ca mới vào Bác sĩ đang có ca chờ kết quả
- **Bối cảnh thực tế:** Bác sĩ A vừa khám xong ca hiện tại, trong danh sách của Bác sĩ A đang có 1 ca đã đi xét nghiệm 20 phút trước và vừa có kết quả (`RESULTS_READY`). Lễ tân tại sảnh thấy Bác sĩ A đang trống phòng nên định gán 1 ca mới toanh vào phòng Bác sĩ A.
- **Cơ chế xử lý nghiệp vụ (Khóa ưu tiên - Priority Lock):**
  - Hệ thống tự động phát hiện: `COUNT(RESULTS_READY) > 0` và `COUNT(IN_PROGRESS) = 0`.
  - Trạng thái phục vụ tức thời của Bác sĩ được suy ra là **`AVAILABLE_PRIORITY_CALLBACK`** (Sẵn sàng - Ưu tiên trả kết quả).
  - **Trên màn hình Lễ tân:** Nút *"Phân công vào phòng này"* bị vô hiệu hóa (disabled), hiển thị nhãn màu vàng cam: *"Đang ưu tiên đón ca tái khám: [Tên Pet]"*.
  - Ngăn chặn triệt để tình trạng khách mới cướp phòng của khách cũ đã đợi xét nghiệm lâu.
- **Biến động CSDL:**
  - Không thay đổi bảng vật lý; trạng thái được tính toán động tại tầng Application/View logic, đảm bảo tính nhất quán thời gian thực.

---

## 4. PHÂN HỆ 3: CẬN LÂM SÀNG & 2 HÀNG ĐỢI CHUYÊN MÔN ĐỘC LẬP

### EX-06: Khách hàng vắng mặt khi gọi vào phòng Xét nghiệm / CĐHA
- **Bối cảnh thực tế:** Đến lượt làm xét nghiệm/siêu âm, hệ thống hiển thị thông báo gọi lượt nhưng chủ nuôi đưa thú cưng ra ngoài đi dạo hoặc đi vệ sinh.
- **Cơ chế xử lý nghiệp vụ (Cơ chế 3 lần gọi & Báo vắng mặt):**
  - Kỹ thuật viên bấm *"Mời vào phòng"*: Hệ thống kích hoạt thông báo trên màn hình sảnh và ứng dụng của chủ nuôi. Lúc này dịch vụ **VẪN GIỮ `PENDING`**.
  - Sau 3 lần gọi (mỗi lần cách 60s) không thấy vào, Kỹ thuật viên bấm nút **"Báo vắng mặt / Gọi ca tiếp"**:
    - Dịch vụ kỹ thuật **giữ nguyên là `PENDING`** (chưa hao phí vật tư y tế).
    - Ca khám được rút khỏi hàng đợi chính, chuyển sang tab *"Ca tạm hoãn do vắng mặt" (Missed Queue)*.
    - Hệ thống gọi ngay ca kế tiếp trên màn hình $\rightarrow$ **Phòng máy không bị treo 1 phút nào.**
    - Gửi tin nhắn SMS/App cho chủ nuôi thông báo ca đã bị tạm hoãn.
- **Biến động CSDL:**
  - Bảng `visit_service_details`: Cột `status` giữ nguyên `'PENDING'`.

### EX-07: Khách hàng quay lại phòng máy sau khi bị tạm hoãn
- **Bối cảnh thực tế:** Khách hàng quay lại sảnh phòng khám sau khi nghe thông báo điện thoại.
- **Cơ chế xử lý nghiệp vụ:**
  - Khách báo Lễ tân hoặc bấm nút *"Tôi đã có mặt"* trên ứng dụng di động.
  - Trên màn hình phòng máy: Ca tạm hoãn đổi màu xanh nhấp nháy `🟢 [Khách đã có mặt trở lại]`.
  - **Nguyên tắc công bằng:** Ca này được ghim vào vị trí **"Ưu tiên kế tiếp" (Next In Line)** - được gọi ngay sau ca đang thực hiện dở, không bắt khách phải xếp hàng lại từ đầu.
  - Kỹ thuật viên bấm nút *"Gọi lại vào phòng"* (Recall), khi thú cưng bước vào phòng mới bấm *"Bắt đầu thực hiện"* để chuyển sang `IN_PROGRESS`.
- **Biến động CSDL:**
  - Bảng `visit_service_details`: Cột `status` chuyển từ `'PENDING'` sang `'IN_PROGRESS'`.

### EX-08: Khách hàng xin hủy 1 trong 2 dịch vụ cận lâm sàng giữa chừng
- **Bối cảnh thực tế:** Bác sĩ chỉ định cả Xét nghiệm máu và Siêu âm bụng. Thú cưng đã lấy máu xong (`COMPLETED`), nhưng khi sang phòng CĐHA, thú cưng quá hoảng loạn/hung dữ hoặc chủ nuôi không đủ kinh phí nên xin hủy không siêu âm nữa.
- **Cơ chế xử lý nghiệp vụ:**
  - Bác sĩ CĐHA chọn thao tác *"Hủy dịch vụ"* trên dòng siêu âm, nhập lý do hủy.
  - Hệ thống kiểm tra: Tất cả dịch vụ cận lâm sàng còn lại của ca này đều đã đạt `COMPLETED` hoặc `CANCELLED`.
  - Ca khám tự động chuyển sang `RESULTS_READY` để trả về Bác sĩ khám chính hội chẩn dựa trên kết quả xét nghiệm máu đã làm.
  - Hóa đơn viện phí chỉ tính tiền xét nghiệm máu, **tuyệt đối không tính tiền dịch vụ siêu âm đã hủy**.
- **Biến động CSDL:**
  - Bảng `visit_service_details`: Dòng dịch vụ Siêu âm chuyển `status = 'CANCELLED'`.
  - Bảng `pet_visits`: Cột `status` chuyển từ `'WAITING_RESULTS'` sang `'RESULTS_READY'`.

### EX-09: Phòng Chẩn đoán hình ảnh gọi số đúng lúc thú cưng đang lấy máu bên phòng Lab
- **Bối cảnh thực tế:** Phòng CĐHA vắng khách, đến lượt ca này trong hàng đợi CĐHA nhưng thú cưng đang ở phòng Lab lấy ven.
- **Cơ chế xử lý nghiệp vụ:**
  - Trên màn hình CĐHA hiển thị huy hiệu liên phòng: `🟡 [Đang lấy máu bên phòng Lab]`.
  - Bác sĩ CĐHA bấm nút *"Tạm hoãn / Gọi ca tiếp"*: Dịch vụ CĐHA giữ `PENDING`, ca chuyển vào tab tạm hoãn, gọi ca kế tiếp vào siêu âm ngay.
  - Khi thú cưng lấy máu xong bước sang phòng CĐHA: Bác sĩ CĐHA bấm nút *"Gọi lại"* (Recall) để đón vào phòng.
- **Biến động CSDL:**
  - Bảng `visit_service_details` (dòng CĐHA): Giữ nguyên `'PENDING'`.

---

## 5. PHÂN HỆ 4: HỘI CHẨN GIAI ĐOẠN 2, HÀNG ĐỢI TÁI KHÁM & KÊ ĐƠN

### EX-10: Bác sĩ khám chính gọi lại ca có kết quả nhưng khách chưa vào phòng ngay
- **Bối cảnh thực tế:** Ca khám đã có đủ kết quả (`RESULTS_READY`), Bác sĩ bấm *"Mời vào phòng"* nhưng khách bận ra ngoài nghe điện thoại.
- **Cơ chế xử lý nghiệp vụ:**
  - Thông báo gọi 2–3 lần không vào, Bác sĩ bấm nút *"Tạm hoãn / Gọi ca tiếp"*.
  - Ca khám được giữ ở trạng thái `RESULTS_READY`, chuyển sang tab *"Ca chờ tái khám / Đã hoãn"* của Bác sĩ đó.
  - Trạng thái Bác sĩ được giải phóng về `AVAILABLE` (nếu không còn ca chờ kết quả khác) để Lễ tân có thể phân ca mới vào phòng khám, tránh lãng phí thời gian của Bác sĩ.
  - Khi khách quay lại trước cửa phòng: Bác sĩ bấm *"Gọi lại vào phòng"* (Recall) để tiếp tục Giai đoạn 2.
- **Biến động CSDL:**
  - Bảng `pet_visits`: Cột `status` giữ nguyên `'RESULTS_READY'`.
  - Trạng thái Bác sĩ suy ra chuyển từ `AVAILABLE_PRIORITY_CALLBACK` về `AVAILABLE`.

### EX-11: Khách hàng bỏ về hẳn không quay lại đọc kết quả cận lâm sàng
- **Bối cảnh thực tế:** Khách đã làm xong xét nghiệm và chụp chiếu nhưng tự ý bế thú cưng về nhà, Lễ tân gọi điện xác nhận khách không quay lại.
- **Cơ chế xử lý nghiệp vụ:**
  - Lễ tân hoặc Bác sĩ chọn thao tác **"Đóng ca / Khách bỏ về"**:
  - Khóa chuyên môn đợt khám: Các kết quả xét nghiệm/CĐHA đã làm được lưu trữ vĩnh viễn vào Lịch sử bệnh án của thú cưng để phục vụ tra cứu sau này.
  - Chi phí các dịch vụ kỹ thuật đã thực hiện được kết chuyển sang Hóa đơn ở trạng thái chờ thanh toán (`PENDING`) và ghi nợ vào hồ sơ khách hàng để thu bù trong lần ghé khám tiếp theo.
- **Biến động CSDL:**
  - Bảng `pet_visits`: Cột `status` chuyển từ `'RESULTS_READY'` sang `'COMPLETED'`, cột `closed_at = NOW()`, `completed_at = NOW()`.
  - Bảng `invoices`: Tạo hóa đơn viện phí với `payment_status = 'PENDING'`, ghi nhận công nợ.

### EX-12: Bác sĩ bấm chốt đợt khám khi thông tin chẩn đoán đang để trống
- **Bối cảnh thực tế:** Bác sĩ quên nhập kết luận chẩn đoán bệnh mà bấm luôn nút *"Chốt đợt khám / Chuyển thanh toán"*.
- **Cơ chế xử lý nghiệp vụ:** Tầng giao diện và Backend Validation chặn lại: *"Vui lòng nhập kết luận chẩn đoán xác định trước khi chốt đợt khám"*.
- **Biến động CSDL:** Không thay đổi CSDL; đợt khám giữ nguyên trạng thái `'IN_PROGRESS'`.

### EX-13: Số lượng thuốc kê trong đơn vượt quá tồn kho khả dụng
- **Bối cảnh thực tế:** Bác sĩ kê 10 vỉ thuốc *Clavamox 250mg*, nhưng trong tủ thuốc phòng khám chỉ còn 6 vỉ khả dụng.
- **Cơ chế xử lý nghiệp vụ:**
  - Hệ thống kiểm tra tức thời: `quantity_prescribed > current_stock`.
  - Hiển thị hộp thoại cảnh báo màu đỏ: *"Số lượng kê (10) vượt quá tồn kho khả dụng (6). Vui lòng giảm số lượng hoặc kê loại thuốc thay thế"*.
  - Chặn không cho thêm thuốc vào đơn cho đến khi nhập số lượng hợp lệ.
- **Biến động CSDL:** Không lưu bản ghi không hợp lệ vào bảng `prescription_items`.

---

## 6. PHÂN HỆ 5: THANH TOÁN VIỆN PHÍ & XUẤT KHO DƯỢC PHẨM

### EX-14: Thu ngân nhập số tiền giảm giá lớn hơn tổng viện phí
- **Bối cảnh thực tế:** Tổng viện phí là 500,000 VNĐ nhưng Thu ngân gõ nhầm mã giảm giá hoặc số tiền chiết khấu thành 600,000 VNĐ.
- **Cơ chế xử lý nghiệp vụ:** Hệ thống chặn lại tại giao diện: *"Số tiền giảm giá không thể vượt quá tổng viện phí của ca khám"*. Ngăn chặn tạo hóa đơn âm tiền.
- **Biến động CSDL:** Không cho phép thực thi giao dịch tạo bản ghi trong bảng `invoices`.

### EX-15: Tồn kho thực tế bị thiếu hụt tại thời điểm Lễ tân bấm xuất kho (Race Condition)
- **Bối cảnh thực tế:** Lúc Bác sĩ kê đơn thì thuốc còn 2 lọ. Trong lúc khách đi thanh toán, một Bác sĩ khác đã xuất 2 lọ đó cho ca cấp cứu khác. Đến khi Lễ tân bấm xuất thuốc thì kho đã hết hàng.
- **Cơ chế xử lý nghiệp vụ (Database Transaction Rollback):**
  - Hệ thống thực thi quy trình xuất kho trong một giao dịch an toàn (`@Transactional`):
    - Kiểm tra `stock_quantity >= quantity_prescribed`.
    - Phát hiện thiếu hàng $\rightarrow$ Kích hoạt `Rollback` toàn bộ giao dịch.
    - Hiển thị thông báo lỗi chi tiết: *"Không thể xuất kho: Thuốc [Tên thuốc] trong kho không đủ số lượng. Vui lòng báo Bác sĩ đổi thuốc hoặc nhập bổ sung kho"*.
    - Tuyệt đối không trừ âm kho và không chuyển trạng thái đơn thuốc sang đã phát.
- **Biến động CSDL:**
  - Bảng `medicines`: Cột `stock_quantity` giữ nguyên, không bị trừ âm.
  - Bảng `prescriptions`: Cột `status` giữ nguyên `'PRESCRIBED'`.
  - Bảng `inventory_transactions`: Không ghi nhận giao dịch xuất kho lỗi.

### EX-16: Cố tình hoặc thao tác nhầm xuất kho đơn thuốc đã cấp trước đó
- **Bối cảnh thực tế:** Nhân viên nhấn đúp chuột hoặc bấm lại nút xác nhận xuất thuốc cho một đơn đã phát thuốc 5 phút trước.
- **Cơ chế xử lý nghiệp vụ (Ngăn chặn Double-Dispense):**
  - Hệ thống kiểm tra điều kiện tiên quyết: `prescriptions.status` phải là `PRESCRIBED`.
  - Nếu đã là `DISPENSED`, hệ thống chặn lại và thông báo: *"Đơn thuốc này đã được xuất kho trước đó lúc [Thời gian]"*.
- **Biến động CSDL:** Ngăn chặn trừ kho lần 2, bảo toàn số lượng tồn kho dược phẩm chính xác tuyệt đối.

---

## TỔNG KẾT KIẾN TRÚC TOÀN VẸN DỮ LIỆU
Toàn bộ 16 trường hợp ngoại lệ trên đã được thiết kế đồng bộ và nhất quán qua:
1. **Schema CSDL & Chỉ mục:** [schema_init.sql](file:///c:/Users/Admin/Desktop/Đồ%20án%20tốt%20nghiệp/schema_init.sql)
2. **Từ điển dữ liệu & Quan hệ:** [THIET_KE_CO_SO_DU_LIEU_ERD.md](file:///c:/Users/Admin/Desktop/Đồ%20án%20tốt%20nghiệp/THIET_KE_CO_SO_DU_LIEU_ERD.md)
3. **Chuẩn hóa Kiểu liệt kê ENUM:** [DANH_SACH_KIEU_ENUM_HE_THONG.md](file:///c:/Users/Admin/Desktop/Đồ%20án%20tốt%20nghiệp/DANH_SACH_KIEU_ENUM_HE_THONG.md)
4. **Tài liệu Nghiệp vụ tổng thể:** [TAI_LIEU_MO_TA_NGHIEP_VU_PHONG_KHAM_THU_Y.md](file:///c:/Users/Admin/Desktop/Đồ%20án%20tốt%20nghiệp/TAI_LIEU_MO_TA_NGHIEP_VU_PHONG_KHAM_THU_Y.md)
5. **Đặc tả Chi tiết Use Case:** [DAC_TA_USE_CASE_CORE.md](file:///c:/Users/Admin/Desktop/Đồ%20án%20tốt%20nghiệp/DAC_TA_USE_CASE_CORE.md)
