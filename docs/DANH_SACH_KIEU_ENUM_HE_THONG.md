# TÀI LIỆU QUY CHUẨN CÁC KIỂU DỮ LIỆU CỐ ĐỊNH (ENUM TYPES SPECIFICATION)
## HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y

> **Mục đích:** Tài liệu này tổng hợp toàn bộ các trường dữ liệu có tập giá trị cố định (Domain Constraints / ENUM) trong hệ thống, nhằm chuẩn hóa việc lưu trữ trong Cơ sở dữ liệu MySQL, lập trình Backend (Enum trong Java/Spring Boot, C#, Python, TypeScript) và hiển thị giao diện Frontend.

---

## TỔNG HỢP DANH SÁCH 13 KIỂU ENUM TRONG HỆ THỐNG

| STT | Tên ENUM / Cột CSDL | Bảng áp dụng | Danh sách các giá trị hợp lệ |
| :---: | :--- | :--- | :--- |
| **1** | `RoleCode` (`code`) | `roles` | `'ADMIN'`, `'VETERINARIAN'`, `'RECEPTIONIST'`, `'LAB_TECHNICIAN'`, `'IMAGING_TECHNICIAN'`, `'PET_OWNER'` |
| **2** | `UserStatus` (`status`) | `users` | `'ACTIVE'`, `'INACTIVE'`, `'LOCKED'` |
| **3** | `PetGender` (`gender`) | `pets` | `'MALE'`, `'FEMALE'`, `'UNKNOWN'` |
| **4** | `BookingChannel` (`booking_channel`) | `appointments` | `'ONLINE'`, `'PHONE'`, `'WALK_IN'` |
| **5** | `AppointmentStatus` (`status`) | `appointments`, `appointment_status_histories` | `'PENDING'`, `'CONFIRMED'`, `'CHECKED_IN'`, `'CANCELLED'`, `'NO_SHOW'` |
| **6** | `VisitStatus` (`status`) | `pet_visits` | `'WAITING'`, `'IN_PROGRESS'`, `'WAITING_RESULTS'`, `'RESULTS_READY'`, `'WAITING_PAYMENT'`, `'COMPLETED'`, `'CANCELLED'` |
| **7** | `ServiceCategory` (`category`) | `services` | `'EXAMINATION'`, `'VACCINATION'`, `'DEWORMING'`, `'EXTERNAL_PARASITE'`, `'INJECTION_INFUSION'`, `'LABORATORY'`, `'IMAGING'`, `'SURGERY'`, `'PROCEDURE'` |
| **8** | `LabEvaluation` (`evaluation`) | `lab_test_results`| `'LOW'`, `'NORMAL'`, `'HIGH'` |
| **9** | `PrescriptionStatus` (`status`) | `prescriptions` | `'PRESCRIBED'`, `'DISPENSED'`, `'CANCELLED'` |
| **10** | `InventoryTransactionType` (`transaction_type`) | `inventory_transactions` | `'IMPORT'`, `'EXPORT_PRESCRIPTION'`, `'ADJUSTMENT'` |
| **11** | `PaymentStatus` (`payment_status`) | `invoices` | `'PENDING'`, `'PAID'`, `'CANCELLED'` |
| **12** | `ServiceDetailStatus` (`status`) | `visit_service_details` | `'PENDING'`, `'IN_PROGRESS'`, `'COMPLETED'`, `'CANCELLED'` |
| **13** | `InvoiceItemType` (`item_type`) | `invoice_items` | `'SERVICE'`, `'MEDICINE'` |

---

## CHI TIẾT TỪNG KIỂU DỮ LIỆU ENUM

### 1. `RoleCode` - Mã vai trò người dùng
- **Bảng:** `roles` | **Cột:** `code`
- **Cú pháp CSDL:** `ENUM('ADMIN', 'VETERINARIAN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'IMAGING_TECHNICIAN', 'PET_OWNER') NOT NULL UNIQUE`
- **Ý nghĩa các giá trị:**
  - `'ADMIN'`: Quản trị viên hệ thống (cấu hình danh mục, quản lý người dùng, xem thống kê).
  - `'VETERINARIAN'`: Bác sĩ thú y khám chính (khám lâm sàng, chỉ định cận lâm sàng, chẩn đoán xác định, kê đơn).
  - `'RECEPTIONIST'`: Lễ tân / Thu ngân (tiếp đón, điều phối phân công bác sĩ, thanh toán, xuất thuốc).
  - `'LAB_TECHNICIAN'`: Bác sĩ / Kỹ thuật viên Xét nghiệm (tiếp nhận mẫu bệnh phẩm, phân tích huyết học/sinh hóa và nhập kết quả).
  - `'IMAGING_TECHNICIAN'`: Bác sĩ / Kỹ thuật viên Chẩn đoán hình ảnh (thực hiện siêu âm, chụp X-quang, tải ảnh và kết luận hình thái).
  - `'PET_OWNER'`: Khách hàng / Chủ thú cưng (đặt lịch trực tuyến, tra cứu hồ sơ bệnh án).

---

### 2. `UserStatus` - Trạng thái tài khoản người dùng
- **Bảng:** `users` | **Cột:** `status`
- **Cú pháp CSDL:** `ENUM('ACTIVE', 'INACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE'`
- **Ý nghĩa các giá trị:**
  - `'ACTIVE'`: Tài khoản đang hoạt động bình thường.
  - `'INACTIVE'`: Tài khoản chưa kích hoạt hoặc đã ngừng sử dụng (nhân viên đã nghỉ việc).
  - `'LOCKED'`: Tài khoản bị tạm khóa do vi phạm hoặc bảo mật (nhập sai mật khẩu nhiều lần).

---

### 3. `PetGender` - Giới tính thú cưng
- **Bảng:** `pets` | **Cột:** `gender`
- **Cú pháp CSDL:** `ENUM('MALE', 'FEMALE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN'`
- **Ý nghĩa các giá trị:**
  - `'MALE'`: Thú cưng đực.
  - `'FEMALE'`: Thú cưng cái.
  - `'UNKNOWN'`: Chưa xác định rõ giới tính (thú non, chim, bò sát).

---

### 4. `BookingChannel` - Kênh đặt lịch hẹn
- **Bảng:** `appointments` | **Cột:** `booking_channel`
- **Cú pháp CSDL:** `ENUM('ONLINE', 'PHONE', 'WALK_IN') NOT NULL DEFAULT 'ONLINE'`
- **Ý nghĩa các giá trị:**
  - `'ONLINE'`: Khách hàng tự đặt trên Portal / Ứng dụng di động.
  - `'PHONE'`: Khách hàng gọi điện thoại đến phòng khám và Lễ tân tạo lịch giúp.
  - `'WALK_IN'`: Khách hàng đến trực tiếp quầy để đặt lịch cho ngày khác.

---

### 5. `AppointmentStatus` - Trạng thái lịch hẹn khám
- **Bảng:** `appointments`, `appointment_status_histories` | **Cột:** `status`, `from_status`, `to_status`
- **Cú pháp CSDL:** `ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING'`
- **Ý nghĩa các giá trị:**
  - `'PENDING'`: Yêu cầu vừa gửi từ Portal, chờ Lễ tân xác nhận.
  - `'CONFIRMED'`: Lễ tân đã gọi điện xác nhận, giữ khung giờ cho khách.
  - `'CHECKED_IN'`: Khách đã đưa thú cưng đến phòng khám (chuyển tiếp sang tạo `Pet Visit`).
  - `'CANCELLED'`: Lịch bị hủy (bởi khách hoặc do phòng khám báo bận).
  - `'NO_SHOW'`: Khách không đến sau quá 30 phút so với giờ hẹn đã xác nhận.

---

### 6. `VisitStatus` - Vòng đời Đợt khám bệnh (Chu kỳ Y tế Bất đồng bộ)
- **Bảng:** `pet_visits`, `pet_visit_status_histories` | **Cột:** `status`, `from_status`, `to_status`
- **Cú pháp CSDL:** `ENUM('WAITING', 'IN_PROGRESS', 'WAITING_RESULTS', 'RESULTS_READY', 'WAITING_PAYMENT', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'WAITING'`
- **Ý nghĩa các giá trị:**
  - `'WAITING'`: Đang ở hàng đợi tiếp đón chung của phòng khám, chờ lễ tân phân công bác sĩ.
  - `'IN_PROGRESS'`: Bác sĩ đang trực tiếp khám (Giai đoạn 1 khám sơ bộ, hoặc Giai đoạn 2 kết luận chẩn đoán).
  - `'WAITING_RESULTS'`: Bác sĩ đã ra chỉ định cận lâm sàng, thú cưng đang ở phòng xét nghiệm/CĐHA (Bác sĩ tạm giải phóng để khám ca khác).
  - `'RESULTS_READY'`: Phòng Cận lâm sàng đã nhập đủ kết quả, hệ thống báo Bác sĩ để ưu tiên gọi lại vào phòng.
  - `'WAITING_PAYMENT'`: Bác sĩ đã chốt chuyên môn và khóa chỉnh sửa, chờ Lễ tân thu tiền viện phí.
  - `'COMPLETED'`: Đã thanh toán thành công và xuất thuốc trừ kho hoàn tất, lưu vào lịch sử bệnh án vĩnh viễn.
  - `'CANCELLED'`: Ca khám bị hủy bỏ trước hoặc trong khi khám (khách bỏ về, chuyển viện khẩn cấp).

---

### 7. `ServiceCategory` - Phân nhóm dịch vụ kỹ thuật
- **Bảng:** `services` | **Cột:** `category`
- **Cú pháp CSDL:** `ENUM('EXAMINATION', 'VACCINATION', 'DEWORMING', 'EXTERNAL_PARASITE', 'INJECTION_INFUSION', 'LABORATORY', 'IMAGING', 'SURGERY', 'PROCEDURE') NOT NULL`
- **Ý nghĩa các giá trị:**
  - `'EXAMINATION'`: Khám lâm sàng tổng quát / chuyên sâu.
  - `'VACCINATION'`: Tiêm phòng vaccine (bắt buộc khám sàng lọc trước tiêm).
  - `'DEWORMING'`: Tẩy giun sán đường ruột định kỳ.
  - `'EXTERNAL_PARASITE'`: Trị ký sinh trùng ngoài da (ve, bọ chét, ghẻ).
  - `'INJECTION_INFUSION'`: Công tiêm thuốc điều trị, công truyền dịch.
  - `'LABORATORY'`: Các gói xét nghiệm huyết học, sinh hóa, nước tiểu (chạy máy, đối chiếu tham chiếu loài).
  - `'IMAGING'`: Chẩn đoán hình ảnh: Siêu âm ổ bụng, chụp phim X-quang kỹ thuật số (tải ảnh đính kèm).
  - `'SURGERY'`: Phẫu thuật ngoại khoa (triệt sản, mổ đẻ, mổ u).
  - `'PROCEDURE'`: Thủ thuật điều trị (thay băng, rửa vết thương, cắt chỉ, nẹp xương).

---

### 8. `LabEvaluation` - Đánh giá chỉ số xét nghiệm theo khoảng tham chiếu loài
- **Bảng:** `lab_test_results` | **Cột:** `evaluation`
- **Cú pháp CSDL:** `ENUM('LOW', 'NORMAL', 'HIGH') NOT NULL`
- **Ý nghĩa các giá trị:**
  - `'LOW'`: Chỉ số đo được thấp hơn ngưỡng dưới tham chiếu của loài (`value < min_value`). Hiển thị cảnh báo vàng.
  - `'NORMAL'`: Chỉ số nằm trong khoảng an toàn bình thường (`min_value <= value <= max_value`). Hiển thị xanh lá.
  - `'HIGH'`: Chỉ số đo được vượt ngưỡng trên tham chiếu của loài (`value > max_value`). Hiển thị cảnh báo đỏ nguy hiểm.

---

### 9. `PrescriptionStatus` - Trạng thái đơn thuốc
- **Bảng:** `prescriptions` | **Cột:** `status`
- **Cú pháp CSDL:** `ENUM('PRESCRIBED', 'DISPENSED', 'CANCELLED') NOT NULL DEFAULT 'PRESCRIBED'`
- **Ý nghĩa các giá trị:**
  - `'PRESCRIBED'`: Bác sĩ vừa kê đơn, chưa thanh toán và chưa xuất thuốc từ kho.
  - `'DISPENSED'`: Đã thanh toán và Lễ tân/Dược sĩ đã phát thuốc, kho thuốc đã bị trừ tương ứng.
  - `'CANCELLED'`: Đơn thuốc bị hủy bỏ (do hủy ca khám hoặc đổi phác đồ trước khi thanh toán).

---

### 10. `InventoryTransactionType` - Loại giao dịch biến động kho dược
- **Bảng:** `inventory_transactions` | **Cột:** `transaction_type`
- **Cú pháp CSDL:** `ENUM('IMPORT', 'EXPORT_PRESCRIPTION', 'ADJUSTMENT') NOT NULL`
- **Ý nghĩa các giá trị:**
  - `'IMPORT'`: Nhập thêm thuốc mới vào kho (tăng số lượng tồn kho `+`).
  - `'EXPORT_PRESCRIPTION'`: Tự động xuất thuốc theo đơn đã thanh toán (giảm số lượng tồn kho `-`).
  - `'ADJUSTMENT'`: Cân chỉnh kho sau kiểm kê thực tế phát hiện thừa/thiếu, hao hụt hoặc hết hạn sử dụng (`+/-`).

---

### 11. `PaymentStatus` - Trạng thái thanh toán hóa đơn
- **Bảng:** `invoices` | **Cột:** `payment_status`
- **Cú pháp CSDL:** `ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING'`
- **Ý nghĩa các giá trị:**
  - `'PENDING'`: Hóa đơn vừa tạo, đang chờ thu tiền từ khách hàng.
  - `'PAID'`: Khách hàng đã thanh toán đủ tiền bên ngoài quầy, hoàn tất thu ngân.
  - `'CANCELLED'`: Hóa đơn bị hủy bỏ.

---

### 12. `ServiceDetailStatus` - Trạng thái thực hiện chỉ định dịch vụ kỹ thuật
- **Bảng:** `visit_service_details`, `visit_service_detail_histories` | **Cột:** `status`, `from_status`, `to_status`
- **Cú pháp CSDL:** `ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING'`
- **Ý nghĩa các giá trị:**
  - `'PENDING'`: Dịch vụ vừa được Bác sĩ chỉ định, đang chờ phòng chuyên môn (Lab / CĐHA) tiếp nhận và thực hiện.
  - `'IN_PROGRESS'`: Kỹ thuật viên đã tiếp nhận thú cưng / lấy mẫu bệnh phẩm, máy đang phân tích tự động hoặc thú cưng đang trong phòng siêu âm/X-quang.
  - `'COMPLETED'`: Kỹ thuật viên / Bác sĩ CĐHA đã nhập đầy đủ kết quả đo đạc hoặc tải tệp ảnh chẩn đoán lên và nhấn xác nhận hoàn tất.
  - `'CANCELLED'`: Chỉ định bị hủy bỏ (chủ nuôi từ chối thực hiện hoặc bác sĩ thay đổi hướng xử lý).

---

### 13. `InvoiceItemType` - Phân loại dòng mục chi tiết trong hóa đơn
- **Bảng:** `invoice_items` | **Cột:** `item_type`
- **Cú pháp CSDL:** `ENUM('SERVICE', 'MEDICINE') NOT NULL`
- **Ý nghĩa các giá trị:**
  - `'SERVICE'`: Dòng mục chi phí dịch vụ kỹ thuật (tiền khám lâm sàng, tiền xét nghiệm máy, tiền siêu âm, chụp X-quang, tiêm ngừa).
  - `'MEDICINE'`: Dòng mục chi phí thuốc tân dược / vật tư y tế theo đơn kê của bác sĩ.
- **Vai trò nghiệp vụ & Kế toán:** Giúp hệ thống tự động bóc tách doanh thu dịch vụ y tế vs doanh thu bán lẻ kho dược, đồng thời áp đúng mức thuế suất GTGT (VAT) tương ứng cho từng nhóm mặt hàng.
