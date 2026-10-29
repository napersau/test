# TÀI LIỆU MÔ TẢ NGHIỆP VỤ HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y

> **Tài liệu nền tảng phục vụ xây dựng biểu đồ Use Case, Đặc tả Use Case và Thiết kế CSDL (ERD).**

---

## 0. Các định hướng nghiệp vụ cốt lõi (Cập nhật mới)

- **Quy trình đặt lịch:** Chủ nuôi **chỉ đặt ngày + khung giờ + nhu cầu khám**, tuyệt đối **không chọn bác sĩ**.
- **Tiếp đón:** Khi khách đến phòng khám, lịch hẹn chuyển trạng thái thành `CHECKED_IN` và chuyển tiếp thành Đợt khám (`Pet Visit`).
- **Phân công ca khám:** Lễ tân quan sát **hàng đợi + trạng thái hiện tại của bác sĩ (Rảnh / Đang khám)** để trực tiếp điều phối, phân công bác sĩ phụ trách. Hệ thống giả định tất cả bác sĩ đều đi làm đầy đủ, không quản lý ca kíp và không quản lý nghỉ phép.
- **Phòng khám:** Mỗi bác sĩ được gán một **số phòng khám cố định** (quản lý trực tiếp qua thuộc tính `room_number` trong thông tin tài khoản bác sĩ, không tạo bảng phòng khám riêng).
- **Vai trò chuyên môn:** Phân định rõ ràng giữa Bác sĩ khám lâm sàng chính (`VETERINARIAN`), Kỹ thuật viên/Bác sĩ xét nghiệm (`LAB_TECHNICIAN`), và Kỹ thuật viên/Bác sĩ chẩn đoán hình ảnh (`IMAGING_TECHNICIAN`), giúp chuẩn hóa chuyên môn và quản lý phòng ban hiệu quả.
- **Mô hình tài khoản CSDL:** Sử dụng mô hình tập trung **`users` + `roles`**, không phân mảnh thành các bảng tài khoản riêng lẻ (`veterinarians`, `receptionists`, ...).

---

## 1. Tổng quan hệ thống

Hệ thống quản lý phòng khám thú y được xây dựng nhằm hỗ trợ phòng khám quản lý tập trung toàn bộ hoạt động từ **tiếp nhận khách hàng và thú cưng, quản lý lịch hẹn, phân công bác sĩ, khám chữa bệnh, xét nghiệm, chẩn đoán hình ảnh, kê đơn thuốc, thanh toán, xuất thuốc cho đến lưu trữ lịch sử bệnh án**.

Hệ thống đồng thời hỗ trợ quản lý hoạt động vận hành của phòng khám như:

- Quản lý tài khoản và phân quyền.
- Quản lý bác sĩ (kèm số phòng khám cố định).
- Quản lý lễ tân.
- Quản lý hàng đợi khám.
- Quản lý lịch hẹn.
- Quản lý danh mục dịch vụ.
- Quản lý danh mục thuốc.
- Quản lý tồn kho.
- Quản lý cấu hình xét nghiệm.
- Quản lý khoảng tham chiếu xét nghiệm theo loài.
- Quản lý thanh toán và hóa đơn.
- Thống kê doanh thu và hoạt động phòng khám.

Hệ thống được định hướng cho phòng khám thú y quy mô vừa và nhỏ, trong đó quy trình được tổ chức theo nguyên tắc:

> **Đặt lịch → Tiếp đón → Hàng đợi → Phân công bác sĩ → Khám → Chỉ định → Kết quả → Chẩn đoán → Kê đơn → Thanh toán → Xuất thuốc → Hoàn tất.**

---

## 2. Mục tiêu của hệ thống

### 2.1. Quản lý tập trung thông tin khách hàng

Hệ thống lưu trữ thông tin chủ thú cưng:

- Họ tên.
- Số điện thoại.
- Email.
- Địa chỉ.
- Thông tin tài khoản nếu sử dụng Portal.

Một khách hàng có thể sở hữu nhiều thú cưng.

Ví dụ:

```text
Nguyễn Văn A
│
├── Miu
├── Bông
└── Lucky
```

---

### 2.2. Quản lý hồ sơ thú cưng

Mỗi thú cưng có một hồ sơ riêng.

Thông tin gồm:

- Mã thú cưng.
- Tên.
- Loài.
- Giống.
- Giới tính.
- Ngày sinh / Tuổi.
- Màu lông.
- Cân nặng hiện tại.
- Tình trạng triệt sản.
- Đặc điểm nhận dạng.
- Chủ sở hữu.
- Ghi chú.

Hồ sơ thú cưng là cơ sở để xây dựng **lịch sử bệnh án lâu dài**.

---

### 2.3. Quản lý toàn bộ vòng đời một lần khám

Mỗi lần thú cưng đến phòng khám được xem là một **Đợt khám – Pet Visit**.

Một Visit có thể phát sinh:

- Khám lâm sàng.
- Xét nghiệm.
- Chẩn đoán hình ảnh.
- Tiêm phòng.
- Tẩy giun.
- Điều trị.
- Phẫu thuật.
- Thủ thuật.
- Kê đơn thuốc.

Không bắt buộc một Visit phải sử dụng tất cả các nghiệp vụ trên.

---

## 3. Các nhóm người dùng & Phân quyền hệ thống

Hệ thống sử dụng mô hình quản lý người dùng và phân quyền tập trung dựa trên hai bảng:
- `users`: Lưu trữ thông tin tài khoản, thông tin cá nhân, trạng thái hoạt động và số phòng khám cố định (nếu là Bác sĩ).
- `roles`: Bảng danh mục vai trò cố định (`ADMIN`, `VETERINARIAN`, `RECEPTIONIST`, `LAB_TECHNICIAN`, `IMAGING_TECHNICIAN`, `PET_OWNER`).

Mỗi người dùng trong hệ thống được gán **duy nhất một vai trò (`Role`)**, tương ứng với 6 nhóm người dùng chính sau:

---

### 3.1. Nhóm Quản trị viên (ADMIN)

Quản trị viên chịu trách nhiệm quản lý toàn diện cấu hình và hoạt động vận hành của hệ thống phòng khám.

**Nhiệm vụ và quyền hạn:**
- **Quản lý tài khoản & nhân sự:** Tạo, kích hoạt, khóa tài khoản nhân viên (Bác sĩ, Lễ tân); phân công số phòng khám cố định cho từng Bác sĩ.
- **Cấu hình danh mục chuyên môn:** Quản lý danh mục dịch vụ kỹ thuật (`services`), danh mục thuốc & tủ thuốc (`medicines`), quản lý chỉ số xét nghiệm (`lab_test_items`) và thiết lập khoảng tham chiếu sinh lý chuẩn theo loài (`lab_test_reference_ranges`).
- **Giám sát kho dược:** Quản lý nhập/xuất kho, theo dõi số lượng tồn kho khả dụng và nhận cảnh báo khi thuốc chạm ngưỡng tối thiểu (`min_stock_alert`).
- **Báo cáo & Thống kê:** Xem báo cáo doanh thu theo thời gian, theo dịch vụ, theo thuốc; theo dõi hiệu suất khám bệnh của các phòng khám.

> **Lưu ý:** Quản trị viên **không trực tiếp tham gia quy trình khám chữa bệnh** hay can thiệp vào chuyên môn của đợt khám.

---

### 3.2. Nhóm Bác sĩ thú y (VETERINARIAN)

Bác sĩ thú y là nhân sự trực tiếp chịu trách nhiệm về chuyên môn y tế trong toàn bộ quá trình khám chữa bệnh cho thú cưng.

**Đặc điểm nghiệp vụ và phân quyền:**
- **Cùng vai trò nghiệp vụ:** Tất cả các bác sĩ trong hệ thống đều có chung vai trò `VETERINARIAN` và cùng tập quyền hạn chuyên môn, không phân chia bác sĩ trưởng hay bác sĩ thường, không chia chuyên khoa trong phạm vi đồ án.
- **Phòng khám cố định:** Mỗi Bác sĩ được cấu hình làm việc tại một **số phòng khám cố định** (quản lý trực tiếp qua thuộc tính `room_number` trong thông tin tài khoản `users`, ví dụ: Bác sĩ A gắn với Phòng P01, Bác sĩ B gắn với Phòng P02). Khi Lễ tân phân công ca khám cho bác sĩ, bệnh nhân tự động được hướng dẫn vào đúng số phòng cố định này mà không cần bảng phòng khám riêng.
- **Phạm vi công việc:**
  - Khám lâm sàng sơ bộ (Giai đoạn 1): Tiếp nhận ca từ hàng đợi, đo sinh hiệu, thăm khám, tra cứu tiền sử bệnh án.
  - Ra chỉ định dịch vụ kỹ thuật: Chỉ định xét nghiệm máu, siêu âm, chụp X-quang (chuyển tới hàng đợi chuyên biệt của phòng Xét nghiệm và phòng CĐHA).
  - Chẩn đoán xác định & Kê đơn thuốc (Giai đoạn 2): Tiếp nhận kết quả cận lâm sàng do phòng Xét nghiệm và phòng CĐHA hoàn tất gửi về, phân tích đối chiếu, đưa ra chẩn đoán xác định, lập phác đồ điều trị, kê đơn thuốc điện tử (kiểm tra tồn kho khả dụng) và dặn dò chủ nuôi.
  - Chốt đợt khám: Khóa hồ sơ chuyên môn và chuyển ca khám sang bộ phận thanh toán viện phí.

---

### 3.3. Nhóm Kỹ thuật viên / Bác sĩ Xét nghiệm (LAB_TECHNICIAN)

Kỹ thuật viên / Bác sĩ xét nghiệm phụ trách vận hành chuyên môn độc lập tại Phòng Xét nghiệm (Lab Room).

**Phạm vi công việc và quyền hạn:**
- **Theo dõi Hàng đợi xét nghiệm (Lab Queue):** Tiếp nhận danh sách các chỉ định xét nghiệm cận lâm sàng (`category = 'LABORATORY'`: Tổng phân tích tế bào máu CBC, sinh hóa máu, soi phân, test nhanh truyền nhiễm) được chỉ định từ các phòng khám.
- **Tiếp nhận mẫu bệnh phẩm & Thực hiện:** Lấy mẫu máu/bệnh phẩm từ thú cưng, vận hành máy phân tích tự động, cập nhật trạng thái dịch vụ sang `IN_PROGRESS`.
- **Nhập kết quả & Đối soát chỉ số:** Nhập giá trị đo đạc thực tế cho từng chỉ số xét nghiệm (`lab_test_items`); hệ thống tự động đối soát với khoảng tham chiếu chuẩn theo loài (`min_value`, `max_value`) và gắn nhãn cảnh báo (`LOW`, `NORMAL`, `HIGH`); nhập ghi chú nhận xét chuyên môn và xác nhận hoàn tất kết quả (`COMPLETED`).

---

### 3.4. Nhóm Kỹ thuật viên / Bác sĩ Chẩn đoán hình ảnh (IMAGING_TECHNICIAN)

Kỹ thuật viên / Bác sĩ chẩn đoán hình ảnh phụ trách vận hành chuyên môn độc lập tại Phòng Chẩn đoán hình ảnh (Imaging Room).

**Phạm vi công việc và quyền hạn:**
- **Theo dõi Hàng đợi CĐHA (Imaging Queue):** Tiếp nhận danh sách các chỉ định Siêu âm, Chụp X-quang (`category = 'IMAGING'`) từ bác sĩ lâm sàng; điều phối tiếp nhận theo cơ chế chống xung đột liên phòng.
- **Thực hiện chụp chiếu / siêu âm:** Chuẩn bị tư thế cho thú cưng, vận hành máy chụp X-quang hoặc máy siêu âm; cập nhật trạng thái dịch vụ sang `IN_PROGRESS`.
- **Tải ảnh & Nhập kết luận hình ảnh học:** Tải các tệp hình ảnh chẩn đoán (JPEG/PNG/DICOM) đính kèm vào hệ thống; ghi nhận mô tả chi tiết tổn thương hình thái và kết luận chẩn đoán hình ảnh; xác nhận hoàn tất (`COMPLETED`).

---

### 3.5. Nhóm Nhân viên Lễ tân / Thu ngân (RECEPTIONIST)

Lễ tân là nhân sự điều phối toàn bộ hoạt động tiếp đón, vận hành hàng đợi, thu viện phí và cấp phát thuốc tại quầy.

**Phạm vi công việc và quyền hạn:**
- **Tiếp đón & Quản lý khách hàng:** Tra cứu thông tin chủ nuôi, tạo mới hồ sơ khách hàng (hệ thống tự động cấp tài khoản), khởi tạo và cập nhật hồ sơ thú cưng.
- **Quản lý lịch hẹn:** Tiếp nhận và duyệt các yêu cầu đặt lịch trực tuyến (`PENDING` $\rightarrow$ `CONFIRMED` hoặc `CANCELLED`); tạo lịch hẹn mới qua điện thoại hoặc đặt trước trực tiếp tại quầy; thực hiện đổi ngày/khung giờ hẹn cho khách.
- **Tiếp nhận tại quầy (Check-in):** Thực hiện check-in cho khách có lịch hẹn hoặc tiếp nhận khách vãng lai (Walk-in), cân đo sinh hiệu ban đầu, chuyển đổi Lịch hẹn thành Đợt khám (`Pet Visit`) ở trạng thái chờ khám (`WAITING`).
- **Điều phối hàng đợi & Phân công phòng khám:** Giám sát hàng đợi khám bệnh tập trung, xử lý ưu tiên ca cấp cứu, quan sát trạng thái sẵn sàng của các Bác sĩ để phân công ca khám vào đúng số phòng cố định tương ứng.
- **Viện phí, Thanh toán & Phát thuốc:** Tổng hợp chi phí dịch vụ và tiền thuốc, lập hóa đơn viện phí, thu tiền (tiền mặt, VietQR, thẻ POS), xác nhận thanh toán thành công, thực hiện đóng gói xuất thuốc theo đơn (kích hoạt trừ tồn kho tự động trong một giao dịch an toàn), in phiếu hướng dẫn dùng thuốc cho khách.

> **Nguyên tắc phân quyền nghiêm ngặt:** Lễ tân **tuyệt đối không được chỉnh sửa các dữ liệu chuyên môn** do Bác sĩ lập (nhận định lâm sàng, kết quả xét nghiệm, kết luận siêu âm, chẩn đoán xác định, đơn thuốc).

---

### 3.6. Nhóm Khách hàng / Chủ thú cưng (PET_OWNER)

Chủ thú cưng là người sử dụng Cổng thông tin khách hàng (Customer Portal) để tương tác trực tuyến với phòng khám.

**Quyền hạn và chức năng trên Portal:**
- **Quản lý hồ sơ thú cưng gia đình:** Xem danh sách các bé thú cưng của mình, đăng ký thêm hồ sơ thú cưng mới hoặc cập nhật thông tin đặc điểm nhận dạng.
- **Đặt lịch hẹn khám trực tuyến:** Chọn thú cưng, chọn ngày và khung giờ 30 phút mong muốn (theo sức chứa tự động tính toán của hệ thống), nhập lý do/triệu chứng ban đầu. **Chủ thú cưng không chọn bác sĩ khi đặt lịch.**
- **Quản lý lịch hẹn cá nhân:** Theo dõi trạng thái lịch hẹn (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `CANCELLED`); thực hiện đổi khung giờ hoặc tự hủy lịch hẹn trước giờ hẹn tối thiểu 02 tiếng.
- **Tra cứu hồ sơ bệnh án trực tuyến:** Xem lại toàn bộ lịch sử các đợt khám bệnh của thú cưng, bao gồm kết luận chẩn đoán của bác sĩ, kết quả xét nghiệm, hình ảnh siêu âm/X-quang và đơn thuốc chi tiết.

---

## 4. Quy định về thời gian làm việc của bác sĩ

Trong phạm vi hệ thống:

- **Bác sĩ luôn làm việc đầy đủ:** Coi như toàn bộ các bác sĩ đều có mặt và làm việc đầy đủ theo giờ mở cửa của phòng khám.
- **Không quản lý ca kíp và không quản lý nghỉ phép:** Hệ thống lược bỏ hoàn toàn các chức năng chấm công, xếp ca làm việc và đơn xin nghỉ phép để đơn giản hóa vận hành và tập trung vào nghiệp vụ khám chữa bệnh cốt lõi.
- Lễ tân phân công bệnh nhân hoàn toàn dựa trên **tính sẵn sàng tức thời** (bác sĩ đang rảnh hay đang bận khám ca khác).

---

## 5. Nguyên tắc đặt lịch & Cơ chế Khung giờ tiếp nhận (Time Slots & Capacity)

### 5.1. Nguyên tắc cốt lõi: Khách hàng không chọn Bác sĩ
Trong mô hình vận hành mới của phòng khám:
- **Chủ thú cưng chỉ đăng ký:** Thú cưng cần khám, ngày khám, khung giờ mong muốn và lý do khám / triệu chứng ban đầu.
- **Tuyệt đối không chọn bác sĩ khám khi đặt lịch:** Việc phân bổ bác sĩ nào khám ca nào sẽ do nhân viên Lễ tân tại quầy trực tiếp điều phối dựa trên hàng đợi thực tế và trạng thái sẵn sàng của các bác sĩ tại cơ sở.
- **Mục đích nghiệp vụ:** 
  - Tránh tình trạng dồn ứ bệnh nhân vào một bác sĩ "ngôi sao" gây quá tải cục bộ, trong khi các bác sĩ khác phải ngồi chờ.
  - Đảm bảo cân bằng tải làm việc giữa các phòng khám trong toàn bộ ngày làm việc.
  - Phù hợp với năng lực chuyên môn đồng đều của đội ngũ bác sĩ (`VETERINARIAN`).

### 5.2. Cấu trúc Khung giờ làm việc chuẩn (Standard Time Slots)
Phòng khám hoạt động trong khung giờ hành chính cố định từ **08:00 đến 17:30** hàng ngày. Một ngày làm việc được chia thành **14 khung giờ tiếp nhận chuẩn (Fixed Time Slots)**, mỗi khung giờ kéo dài **30 phút**:

| Ca làm việc | Khung giờ tiếp nhận | Thời lượng | Mục đích vận hành |
| :--- | :---: | :---: | :--- |
| **Ca sáng** | `08:00 - 08:30` | 30 phút | Tiếp nhận ca sáng sớm, ưu tiên ca lấy mẫu xét nghiệm nhịn ăn |
| *(08:00 - 12:00)* | `08:30 - 09:00` | 30 phút | Tiếp nhận lịch hẹn khám & tái khám |
| | `09:00 - 09:30` | 30 phút | Tiếp nhận lịch hẹn khám & tiêm phòng |
| | `09:30 - 10:00` | 30 phút | Tiếp nhận lịch hẹn khám cao điểm sáng |
| | `10:00 - 10:30` | 30 phút | Tiếp nhận lịch hẹn khám & cận lâm sàng |
| | `10:30 - 11:00` | 30 phút | Tiếp nhận ca khám cuối buổi sáng |
| | `11:00 - 11:30` | 30 phút | Khung giờ dự phòng trả kết quả xét nghiệm ca sáng |
| **Nghỉ trưa** | `12:00 - 13:30` | 90 phút | Bác sĩ hội chẩn, vệ sinh khử trùng phòng khám |
| **Ca chiều** | `13:30 - 14:00` | 30 phút | Tiếp nhận ca đầu giờ chiều |
| *(13:30 - 17:30)* | `14:00 - 14:30` | 30 phút | Tiếp nhận lịch hẹn khám & tiêm phòng |
| | `14:30 - 15:00` | 30 phút | Tiếp nhận lịch hẹn khám cao điểm chiều |
| | `15:00 - 15:30` | 30 phút | Tiếp nhận lịch hẹn khám & siêu âm |
| | `15:30 - 16:00` | 30 phút | Tiếp nhận lịch hẹn khám & tẩy giun |
| | `16:00 - 16:30` | 30 phút | Tiếp nhận lịch hẹn khám muộn |
| | `16:30 - 17:00` | 30 phút | Khung giờ tiếp nhận lịch hẹn cuối cùng trong ngày |

### 5.3. Cơ chế Sức chứa khung giờ tính động theo số Bác sĩ (Dynamic Slot Capacity based on Active Doctors)
Sức chứa tối đa của mỗi khung giờ tiếp nhận không bị cố định cứng mà được **hệ thống tự động tính toán linh hoạt dựa trên tổng số Bác sĩ đang hoạt động (`ACTIVE`) có trong hệ thống**:
$$\text{MAX\_APPOINTMENTS\_PER\_SLOT} = \text{COUNT}(\text{users where role} = 'VETERINARIAN' \text{ and status} = 'ACTIVE')$$

**Ý nghĩa và ưu điểm vận hành:**
- **Tự động mở rộng theo quy mô phòng khám:** Khi phòng khám tuyển thêm bác sĩ mới (ví dụ từ 3 bác sĩ tăng lên 4 hoặc 5 bác sĩ), hệ thống tự động tăng sức chứa tiếp nhận của mỗi khung giờ lên 4 hoặc 5 lịch hẹn mà không cần lập trình viên sửa đổi mã nguồn.
- **Tự động phòng chống quá tải:** Nếu một tài khoản bác sĩ tạm thời bị khóa hoặc chuyển sang trạng thái ngừng hoạt động (`INACTIVE`), sức chứa tiếp nhận của các khung giờ sẽ tự động giảm tương ứng để đảm bảo năng lực phục vụ thực tế của phòng khám.

**Thuật toán kiểm tra trạng thái khung giờ trên giao diện:**
Khi khách hàng chọn một ngày trên lịch, hệ thống thực hiện các bước tính toán:
1. **Bước 1:** Xác định sức chứa tối đa của một khung giờ tại thời điểm hiện tại:
   ```sql
   SELECT COUNT(*) AS max_capacity
   FROM users u
   JOIN roles r ON u.role_id = r.id
   WHERE r.code = 'VETERINARIAN' AND u.status = 'ACTIVE';
   ```
2. **Bước 2:** Đếm số lượng lịch hẹn đang chiếm chỗ trong từng khung giờ của ngày đã chọn:
   ```sql
   SELECT start_time, COUNT(*) AS booked_count
   FROM appointments
   WHERE appointment_date = :selected_date
     AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
   GROUP BY start_time;
   ```
3. **Bước 3:** Đánh giá tính khả dụng và hiển thị:
   - **Trường hợp 1 (Còn chỗ - Available):** `booked_count < max_capacity`
     - Giao diện hiển thị nút chọn khung giờ màu xanh lá, kèm thông tin trực quan: *"Còn [max_capacity - booked_count] chỗ"*.
     - Khách hàng được phép click chọn để tiếp tục luồng đặt lịch.
   - **Trường hợp 2 (Đã kín lịch - Full/Disabled):** `booked_count >= max_capacity`
     - Giao diện làm mờ (disable) nút chọn khung giờ, đổi sang màu xám kèm nhãn *"Đã kín lịch"*.
     - Hệ thống ngăn chặn việc click chọn, hướng dẫn khách chọn khung giờ khác hoặc ngày khác.

---

## 6. Các kênh tiếp nhận đặt lịch & Quy trình xử lý

Hệ thống hỗ trợ 3 kênh tiếp nhận đặt lịch, được quản lý qua thuộc tính `booking_channel`:

```text
               CÁC KÊNH ĐẶT LỊCH HẸN KHÁM
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
 KÊNH 1: ONLINE      KÊNH 2: PHONE       KÊNH 3: WALK_IN
 (Khách tự đặt)    (Lễ tân đặt hộ)    (Đặt trước tại quầy)
       │                   │                   │
       ▼                   ▼                   ▼
Trạng thái: PENDING  Trạng thái: CONFIRMED Trạng thái: CONFIRMED
(Chờ lễ tân duyệt)   (Đã xác nhận ngay)  (Đã xác nhận ngay)
```

### 6.1. Kênh 1: Đặt lịch trực tuyến qua Cổng Portal (`booking_channel = 'ONLINE'`)
- **Đối tượng thực hiện:** Chủ thú cưng tự thao tác trên Cổng thông tin khách hàng (Website/App).
- **Quy trình các bước:**
  1. Chủ nuôi đăng nhập vào tài khoản cá nhân.
  2. Chọn thú cưng từ danh sách thú cưng của gia đình (hoặc bấm *"Thêm mới thú cưng"* nếu chưa có hồ sơ).
  3. Chọn ngày muốn khám (từ ngày hiện tại đến tối đa 30 ngày tới).
  4. Hệ thống tải danh sách 14 khung giờ trong ngày kèm trạng thái Còn chỗ / Hết chỗ.
  5. Chủ nuôi chọn một khung giờ còn chỗ và nhập lý do khám / triệu chứng ban đầu.
  6. Bấm *"Xác nhận đặt lịch"*.
  7. Hệ thống tạo lịch hẹn ở trạng thái **`PENDING` (Chờ xác nhận)** và sinh mã lịch hẹn duy nhất (ví dụ: `APT-20261010-001`).
  8. Hệ thống gửi thông báo cho khách hàng: *"Lịch hẹn đã được ghi nhận. Lễ tân phòng khám sẽ liên hệ xác nhận trong vòng 30 phút."*

### 6.2. Kênh 2: Đặt lịch qua điện thoại (`booking_channel = 'PHONE'`)
- **Đối tượng thực hiện:** Nhân viên Lễ tân trực tổng đài phòng khám.
- **Quy trình các bước:**
  1. Khách hàng gọi điện đến số hotline phòng khám yêu cầu đặt lịch.
  2. Lễ tân mở màn hình *"Tạo lịch hẹn mới"* trên phần mềm quản trị.
  3. Lễ tân nhập Số điện thoại của khách hàng để tra cứu:
     - Nếu khách cũ: Hệ thống hiển thị thông tin chủ nuôi và danh sách thú cưng để chọn.
     - Nếu khách mới: Lễ tân nhập nhanh Họ tên, SĐT, Địa chỉ và Tên thú cưng, Loài (Chó/Mèo).
  4. Lễ tân kiểm tra ngày và khung giờ khách mong muốn trên giao diện lịch làm việc.
  5. Nhập triệu chứng khách mô tả qua điện thoại.
  6. Lễ tân bấm *"Lưu & Xác nhận lịch hẹn"*.
  7. Lịch hẹn được tạo ngay ở trạng thái **`CONFIRMED` (Đã xác nhận)** vì đã được nhân viên phòng khám trực tiếp kiểm tra và trao đổi qua điện thoại.

### 6.3. Kênh 3: Đặt lịch trực tiếp tại quầy cho lần sau (`booking_channel = 'WALK_IN'`)
- **Đối tượng thực hiện:** Nhân viên Lễ tân tại quầy tiếp đón.
- **Hoàn cảnh áp dụng:** Khách hàng đang có mặt tại phòng khám (ví dụ: vừa khám xong, hoặc mua thức ăn/phụ kiện) và muốn hẹn trước lịch tái khám, lịch tiêm phòng mũi tiếp theo cho tuần sau/tháng sau.
- **Quy trình:** Tương tự như Kênh 2, lịch hẹn được tạo trực tiếp tại quầy và chuyển ngay sang trạng thái **`CONFIRMED`**. Lễ tân có thể in ngay phiếu hẹn trao tay cho khách hàng.

---

## 7. Vòng đời, Máy trạng thái và Quy tắc xử lý Lịch hẹn (Appointment Lifecycle)

### 7.1. Sơ đồ chuyển đổi trạng thái (State Transition Diagram)

```text
                     [ Đặt lịch Online ]
                              │
                              ▼
                     ┌─────────────────┐
           ┌─────────┤     PENDING     ├────────┐
           │         └────────┬────────┘        │
(Từ chối / Hủy)               │                 │ (Khách tự hủy)
           │           (Lễ tân duyệt)           │
           │                  │                 │
           ▼                  ▼                 ▼
     ┌───────────┐    ┌─────────────────┐ ┌───────────┐
     │ CANCELLED │    │    CONFIRMED    │ │ CANCELLED │
     └───────────┘    └───────┬─────────┘ └───────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │ (Khách đến quầy)  │ (Quá 30p ko đến)  │ (Báo bận hủy hẹn)
          ▼                   ▼                   ▼
    ┌───────────┐       ┌───────────┐       ┌───────────┐
    │CHECKED_IN │       │  NO_SHOW  │       │ CANCELLED │
    └─────┬─────┘       └───────────┘       └───────────┘
          │
          ▼
   [ Tạo PET VISIT ]
   (Vào Hàng đợi khám)
```

### 7.2. Chi tiết 5 trạng thái nghiệp vụ của Lịch hẹn
1. **`PENDING` (Chờ xác nhận):**
   - Áp dụng riêng cho lịch hẹn đặt qua kênh `ONLINE`.
   - Vẫn **tạm thời chiếm 1 suất sức chứa** trong khung giờ đã chọn để tránh tình trạng khách khác đặt đè lên trong lúc chờ duyệt.
   - Lễ tân có trách nhiệm kiểm tra và xử lý trong vòng 15 – 30 phút.
2. **`CONFIRMED` (Đã xác nhận):**
   - Lịch hẹn đã được Lễ tân kiểm tra hợp lệ và chấp thuận tiếp nhận (hoặc được tạo trực tiếp qua điện thoại / tại quầy).
   - Suất giữ chỗ chính thức được bảo lưu. Khách hàng nhận được tin nhắn/thông báo xác nhận thời gian có mặt.
3. **`CHECKED_IN` (Đã đến khám):**
   - Khách hàng đã thực sự đưa thú cưng đến quầy tiếp đón của phòng khám trong ngày hẹn.
   - Đây là điểm mốc then chốt: **Lịch hẹn kết thúc vòng đời đặt chỗ và chuyển tiếp thành Đợt khám (`Pet Visit`)** để bước vào quy trình y tế.
4. **`CANCELLED` (Đã hủy):**
   - Lịch hẹn bị hủy bỏ trước thời điểm khám.
   - **Quy tắc giải phóng:** Ngay khi lịch hẹn bị hủy, hệ thống **hoàn trả ngay lập tức 1 suất sức chứa** cho khung giờ đó để khách hàng khác có thể đặt chỗ.
   - Hệ thống bắt buộc ghi nhận: Lý do hủy (`cancel_reason`), người thực hiện hủy (Khách hay Lễ tân) và thời điểm hủy.
5. **`NO_SHOW` (Khách không đến):**
   - Khách có lịch hẹn `CONFIRMED` nhưng không đến phòng khám và không liên hệ báo hủy.
   - Hệ thống đánh dấu trạng thái này để phục vụ thống kê tỷ lệ bùng lịch, cảnh báo nếu khách hàng có lịch sử bùng lịch nhiều lần.

### 7.3. Quy trình xác nhận và từ chối lịch hẹn trực tuyến
- **Xác nhận (`PENDING` $\rightarrow$ `CONFIRMED`):**
  - Lễ tân mở danh sách lịch hẹn chờ duyệt trên phần mềm.
  - Lễ tân gọi điện thoại cho khách hàng để xác nhận lại tình trạng thú cưng, dặn dò các lưu ý chuyên môn (ví dụ: *nếu cần xét nghiệm máu thì dặn nhịn ăn trước 6 tiếng*).
  - Lễ tân bấm nút **"Xác nhận lịch hẹn"**. Hệ thống chuyển trạng thái sang `CONFIRMED` và gửi thông báo xác nhận đến tài khoản của khách.
- **Từ chối / Hủy từ phía phòng khám (`PENDING` $\rightarrow$ `CANCELLED`):**
  - Nếu phòng khám đột xuất có ca phẫu thuật lớn, mất điện, hoặc khách đặt sai nội dung (ví dụ: yêu cầu dịch vụ phòng khám không cung cấp), Lễ tân bấm **"Từ chối lịch hẹn"**.
  - Bắt buộc nhập lý do từ chối (ví dụ: *"Phòng khám bảo trì máy xét nghiệm, xin lỗi quý khách"*).
  - Hệ thống giải phóng slot và gửi thông báo giải thích cho khách hàng.

### 7.4. Quy trình đổi lịch hẹn (Reschedule: Đổi ngày / Đổi khung giờ)
- **Quy tắc đổi lịch:**
  - Khách hàng chỉ được phép đổi lịch trước giờ hẹn **tối thiểu 02 tiếng**.
  - Chỉ được đổi sang khung giờ **còn chỗ** (`booked_count < 3`).
- **Cơ chế giao dịch hệ thống khi đổi lịch:**
  1. Kiểm tra sức chứa của khung giờ mới. Nếu mới đầy chỗ thì từ chối.
  2. Giảm 1 suất đặt ở khung giờ cũ (giải phóng slot cũ).
  3. Tăng 1 suất đặt ở khung giờ mới (chiếm giữ slot mới).
  4. Cập nhật `appointment_date`, `start_time`, `end_time` trong bản ghi `appointments`.
  5. Giữ nguyên trạng thái `CONFIRMED` (hoặc `PENDING`) và gửi thông báo cập nhật thời gian mới cho khách hàng.

### 7.5. Quy trình hủy lịch hẹn từ phía Khách hàng
- **Quy tắc tự hủy:**
  - Khách hàng có thể chủ động bấm *"Hủy lịch hẹn"* trên Portal trước giờ hẹn tối thiểu 02 tiếng.
  - Khách hàng chọn lý do hủy (Bận đột xuất, Thú cưng đã ổn, Đổi cơ sở khác...).
  - Hệ thống chuyển `status = 'CANCELLED'`, giải phóng sức chứa của slot và gửi thông báo hủy thành công.
- **Nếu khách báo hủy sát giờ (dưới 2 tiếng):** Khách không thể tự hủy trên Web mà phải gọi điện trực tiếp cho Lễ tân phòng khám để xử lý ngoại lệ.

### 7.6. Quy trình xử lý khách không đến (No-Show Handling)
- Định kỳ cuối mỗi ca làm việc (hoặc sau khi khung giờ hẹn kết thúc **30 phút**):
  - Lễ tân rà soát các lịch hẹn `CONFIRMED` trong khung giờ mà khách vẫn chưa check-in.
  - Lễ tân gọi điện thoại kiểm tra:
    - Nếu khách báo đang trên đường đến trễ $\rightarrow$ Lễ tân giữ lịch, ghi chú *"Khách đến muộn 15p"*.
    - Nếu không liên lạc được hoặc khách báo quên không đến $\rightarrow$ Lễ tân bấm **"Đánh dấu vắng mặt (No-Show)"**.
  - Hệ thống cập nhật `status = 'NO_SHOW'`. Lịch sử bùng lịch được lưu vào hồ sơ chủ nuôi.

---

## 8. Quy trình tiếp đón tại quầy & Chuyển đổi sang Đợt khám (Reception & Check-in)

```text
Khách đến phòng khám
        │
        ├──> [ ĐÃ CÓ LỊCH HẸN ] ──> Tra cứu theo SĐT/Mã ──> Check-in ──┐
        │                                                               │
        ├──> [ KHÁCH VÃNG LAI ] ──> Đón tiếp tại quầy ────> Tạo mới ────┼──> Đo sinh hiệu ban đầu
        │                                                               │    (Cân nặng, Thân nhiệt)
        └──> [ CA CẤP CỨU ] ─────> Bật cờ ƯU TIÊN ────────> Tiếp nhận ─┘               │
                                                                                       ▼
                                                                             Khởi tạo PET VISIT
                                                                          (Trạng thái: WAITING)
                                                                                       │
                                                                                       ▼
                                                                             Đưa vào HÀNG ĐỢI KHÁM
```

### 8.1. Luồng tiếp nhận khách có lịch hẹn (Appointment Check-in)
1. Khách hàng và thú cưng có mặt tại quầy tiếp đón.
2. Lễ tân tra cứu lịch hẹn bằng Số điện thoại hoặc Mã lịch hẹn.
3. Hệ thống hiển thị thông tin lịch hẹn đã xác nhận trong ngày.
4. Lễ tân thực hiện tiếp nhận hành chính và sàng lọc sơ bộ tại quầy:
   - Quan sát, đánh giá nhanh tri giác và dấu hiệu nguy kịch (nếu nguy kịch thì chuyển ngay sang luồng Cấp cứu).
   - Hỏi thăm lý do đến khám / triệu chứng hiện tại, ghi chú bổ sung nếu có thay đổi so với khi đặt lịch.
   - *(Lưu ý: Thao tác đo cân nặng và thân nhiệt sẽ do Bác sĩ trực tiếp thực hiện trong phòng khám lâm sàng).*
5. Lễ tân bấm nút **"Hoàn tất tiếp đón"**.
6. **Hệ thống xử lý trong cùng một giao dịch an toàn:**
   - Cập nhật lịch hẹn sang `appointments.status = 'CHECKED_IN'`.
   - Khởi tạo Đợt khám mới (`pet_visits`) với trạng thái ban đầu là `WAITING` (Chờ khám).
   - Thiết lập khóa ngoại liên kết: `pet_visits.appointment_id = appointments.id`.
   - Ghi nhận thời điểm tiếp nhận (`checked_in_at = NOW()`), ID lễ tân tiếp đón và cờ cấp cứu (nếu có).
   - Tự động đưa Đợt khám vào **Hàng đợi khám bệnh chung** của phòng khám.

### 8.2. Luồng tiếp nhận khách vãng lai (Walk-in Visit - Không đặt trước)
Không phải tất cả khách hàng đều đặt lịch trước. Phòng khám luôn sẵn sàng phục vụ khách hàng vãng lai:
1. Khách hàng trực tiếp đưa thú cưng đến quầy tiếp đón.
2. Lễ tân chọn chức năng *"Tiếp nhận khách vãng lai"*.
3. Lễ tân tra cứu Số điện thoại:
   - **Khách hàng cũ:** Hệ thống hiển thị hồ sơ chủ nuôi và danh sách thú cưng đã có $\rightarrow$ Lễ tân chọn bé cần khám.
   - **Khách hàng mới:** Lễ tân nhập nhanh Họ tên, Số điện thoại, Địa chỉ và tạo hồ sơ thú cưng (Tên, Loài, Giống, Giới tính). Hệ thống tự động cấp tài khoản cho khách hàng.
4. Lễ tân nhập lý do đến khám / triệu chứng ban đầu (việc đo cân nặng, thân nhiệt sẽ do Bác sĩ thực hiện trong phòng khám).
5. Lễ tân bấm lưu:
   - Hệ thống tạo Đợt khám mới (`pet_visits`) với `appointment_id = NULL`.
   - Trạng thái ca khám là `WAITING` (Chờ khám) và được đưa vào hàng đợi chung.

### 8.3. Luồng tiếp nhận khẩn cấp (Emergency Priority Case)
- Áp dụng khi thú cưng gặp tình trạng nguy kịch: Tai nạn giao thông, co giật, khó thở dữ dội, ngộ độc, xuất huyết ồ ạt.
- Lễ tân bấm chọn nút **"Tiếp nhận Cấp cứu"**:
  - Hệ thống gắn cờ ưu tiên đặc biệt (`is_emergency = TRUE` hoặc nhãn nổi bật đỏ).
  - Ca khám được đẩy ngay lên **vị trí số 1 trên đầu Hàng đợi khám bệnh**, vượt qua tất cả các ca khám thông thường khác.
  - Lễ tân điều phối ngay cho Bác sĩ sẵn sàng gần nhất (hoặc ngắt quãng một ca khám bệnh nhẹ) để cấp cứu tính mạng cho thú cưng kịp thời.

### 8.4. Quy tắc ưu tiên trong Hàng đợi khám bệnh
Hàng đợi khám bệnh chung (`pet_visits.status = 'WAITING'`) hoạt động theo nguyên tắc kết hợp:
1. **Ưu tiên tuyệt đối:** Ca cấp cứu khẩn cấp luôn được xếp đầu tiên.
2. **Ưu tiên có hẹn đúng giờ:** Khách có lịch hẹn đến trong khung giờ đã đặt được ưu tiên khám trước khách vãng lai đến cùng thời điểm.
3. **Thứ tự tiếp nhận:** Đối với các ca cùng nhóm ưu tiên, phân bổ theo thứ tự thời gian bấm check-in tại quầy (FIFO - Đến trước phục vụ trước).
4. **Khách đến muộn:** Khách có hẹn nhưng đến trễ quá khung giờ hẹn sẽ bị chuyển mức ưu tiên xuống ngang bằng với khách vãng lai.

---

## 9. Hàng đợi khám

Hệ thống quản lý hàng đợi phân cấp thành **2 tầng hàng đợi độc lập** nhằm đảm bảo tính công bằng và liên tục của quy trình khám:

1. **Hàng đợi Tiếp đón chung (General Reception Queue – `WAITING`):**
   - Do nhân viên Lễ tân giám sát tại sảnh tiếp đón.
   - Chứa toàn bộ thú cưng mới tiếp nhận tại quầy (từ lịch hẹn hoặc khách vãng lai) đang chờ được phân công Bác sĩ lần đầu.
   - Thứ tự ưu tiên trong hàng đợi chung:
     - *Ưu tiên 1 (Tuyệt đối):* Ca cấp cứu nguy kịch (`is_emergency = TRUE`).
     - *Ưu tiên 2:* Khách có lịch hẹn đến đúng khung giờ tiếp nhận (FIFO theo giờ hẹn).
     - *Ưu tiên 3:* Khách vãng lai (Walk-in) và khách có hẹn nhưng đến trễ quá khung giờ (FIFO theo thời gian check-in).

2. **Hàng đợi Tái khám ưu tiên của từng Bác sĩ (Doctor's Priority Callback Queue – `RESULTS_READY`):**
   - Được gắn riêng cho từng Bác sĩ phụ trách chính ban đầu (`doctor_id`).
   - Chứa các ca bệnh đã khám lâm sàng Giai đoạn 1 với Bác sĩ đó, vừa được phòng Cận lâm sàng hoàn tất toàn bộ kết quả xét nghiệm/CĐHA và đang chờ gọi lại vào phòng để chẩn đoán xác định.
   - Thú cưng và chủ nuôi ngồi chờ tại sảnh / phòng chờ kết quả.
   - Hàng đợi này có **quyền ưu tiên cao hơn** việc tiếp nhận ca mới từ Hàng đợi tiếp đón chung.

---

## 10. Phân công bác sĩ

**Khách không chọn bác sĩ.**

Lễ tân là người phân công.

Lễ tân dựa trên:

- Trạng thái tức thời của bác sĩ (đang rảnh hay đang bận khám ca khác).
- Số phòng cố định của bác sĩ.
- Thứ tự hàng đợi tiếp nhận.
- Mức độ ưu tiên của ca khám (cấp cứu / thông thường).

Ví dụ:

```text
Bác sĩ A → Đang khám (BUSY)      → Phòng P01
Bác sĩ B → Rảnh (AVAILABLE)      → Phòng P02
Bác sĩ C → Đang khám (BUSY)      → Phòng P03
```

Lễ tân có thể phân công:

```text
Visit #1025
      ↓
Bác sĩ B
      ↓
Phòng P02
```

---

## 11. Nguyên tắc phân công & Cơ chế Khóa ưu tiên trả kết quả (Priority Lock)

Hệ thống không tự động ép buộc phân công cứng nhắc mà hiển thị bảng điều phối trực quan để Lễ tân quyết định gán bệnh nhân vào phòng khám:

```text
Bác sĩ
Số phòng cố định
Trạng thái (AVAILABLE / AVAILABLE_PRIORITY_CALLBACK / BUSY)
Số ca đang chờ đọc kết quả
```

**Nguyên tắc bảo vệ ca đã làm cận lâm sàng (Cơ chế Khóa ưu tiên - Priority Lock):**
- Khi một Bác sĩ vừa kết thúc ca khám hiện tại nhưng đang có bệnh nhân ở trạng thái `RESULTS_READY` (đã chờ xét nghiệm 15-30 phút), hệ thống **tự động kích hoạt cơ chế Khóa ưu tiên (Priority Lock)**:
  - Hệ thống **tạm khóa nút phân công ca mới** từ sảnh tiếp đón của Lễ tân vào Bác sĩ này.
  - Trên màn hình Lễ tân hiển thị trạng thái màu vàng cam: *"Đang ưu tiên đón ca tái khám: [Tên Pet]"*.
  - Điều này ngăn chặn triệt để tình trạng Lễ tân đẩy khách mới toanh vào cướp phòng của khách hàng đã chờ xét nghiệm lâu.

---

## 12. Trạng thái bác sĩ

Trạng thái phục vụ tức thời của Bác sĩ được hệ thống tự động nhận diện theo thời gian thực gồm 3 trạng thái:

```text
AVAILABLE
AVAILABLE_PRIORITY_CALLBACK
BUSY
```

- **`AVAILABLE` (Sẵn sàng nhận ca mới):** Bác sĩ đang rảnh, không có ca khám nào ở trạng thái `IN_PROGRESS` và **không có ca nào đang chờ đọc kết quả (`RESULTS_READY`)**. Lễ tân được quyền phân công ca bệnh mới từ hàng đợi tiếp đón chung vào phòng Bác sĩ này.
- **`AVAILABLE_PRIORITY_CALLBACK` (Sẵn sàng – Ưu tiên trả kết quả):** Bác sĩ đang rảnh (không có ca `IN_PROGRESS`), nhưng **đang có ít nhất 1 ca ở trạng thái `RESULTS_READY`** trong danh sách chờ của mình. Hệ thống tạm khóa việc gán ca mới từ Lễ tân để Bác sĩ ưu tiên gọi ca có kết quả vào phòng trước.
- **`BUSY` (Đang bận khám):** Bác sĩ đang trực tiếp thực hiện thăm khám một ca (`IN_PROGRESS`).

*(Hệ thống không cần trạng thái `OFF` vì mặc định các bác sĩ luôn có mặt làm việc đầy đủ trong phạm vi đồ án).*

---

## 13. Đợt khám – Pet Visit

Visit là **trung tâm của toàn bộ hệ thống y tế**.

Quan hệ:

```text
Pet
 │
 └── 1:N
       │
       ↓
     Visit
```

Một thú cưng có thể khám nhiều lần.

Mỗi lần khám là một Visit độc lập.

---

## 14. Thông tin Visit

Visit lưu:

- Mã Visit.
- Thú cưng.
- Appointment nếu có.
- Bác sĩ được phân công.
- Lễ tân tiếp nhận.
- Phòng khám.
- Thời gian tiếp nhận.
- Thời gian bắt đầu khám.
- Thời gian kết thúc.
- Cân nặng.
- Thân nhiệt.
- Triệu chứng ban đầu.
- Chẩn đoán.
- Hướng điều trị.
- Lời dặn.
- Trạng thái.

---

## 15. Trạng thái Visit (Vòng đời Đợt khám - Chu kỳ Bất đồng bộ)

Quy trình khám chữa bệnh tại phòng khám thú y **không phải là một màn hình nhập liệu CRUD tuyến tính đơn giản**, mà là một **quy trình y tế bất đồng bộ (Asynchronous Multi-stage Workflow)** chia làm 2 giai đoạn nếu có phát sinh dịch vụ cận lâm sàng:

```text
                 ┌─────────┐
                 │ WAITING │ (Hàng đợi tiếp đón ban đầu)
                 └────┬────┘
                      │ Lễ tân phân công Bác sĩ
                      ↓
               ┌─────────────┐
        ┌───── │ IN_PROGRESS │ (Giai đoạn 1: Khám lâm sàng & Ra chỉ định)
        │      └──────┬──────┘
        │             │ 
        │ (Nếu có chỉ │ Bác sĩ gửi phiếu chỉ định Cận lâm sàng
        │  định Lab / │ Thú cưng sang phòng XN / Siêu âm
        │  CĐHA)      ↓ (Bác sĩ tạm giải phóng về AVAILABLE để khám ca khác)
        │      ┌─────────────────┐
        │      │ WAITING_RESULTS │ (Chờ máy chạy XN / Chụp chiếu 15-45 phút)
        │      └────────┬────────┘
        │               │ Phòng Cận lâm sàng nhập xong kết quả
        │               ↓
        │      ┌─────────────────┐
        │      │  RESULTS_READY  │ (Đã có đủ KQ - Ưu tiên gọi lại vào phòng)
        │      └────────┬────────┘
        │               │ Bác sĩ gọi lại thú cưng vào phòng khám
        │               ↓
        │      ┌─────────────┐
        └────> │ IN_PROGRESS │ (Giai đoạn 2: Đọc KQ, Chẩn đoán xác định & Kê đơn)
               └──────┬──────┘
                      │ Bác sĩ chốt chuyên môn & kê đơn
                      ↓
             ┌──────────────────┐
             │ WAITING_PAYMENT  │ (Lễ tân thu tiền viện phí)
             └────────┬─────────┘
                      │ Thanh toán & Xuất thuốc
                      ↓
                ┌───────────┐
                │ COMPLETED │ (Hoàn tất, lưu bệnh án vĩnh viễn)
                └───────────┘

Nhánh hủy / kết thúc đặc biệt:
- WAITING         ───(Khách bỏ về / lỗi tiếp nhận)───→ CANCELLED
- IN_PROGRESS (GĐ 1) ───(Khách từ chối khám / Chuyển viện)─→ CANCELLED
- WAITING_RESULTS ───(Khách hủy không làm xét nghiệm)─→ CANCELLED
```

---

## 16. WAITING – Chờ khám ban đầu

Sau khi tiếp nhận tại quầy (từ lịch hẹn hoặc khách vãng lai):
- `Visit.status = WAITING`
- Ca khám xuất hiện trong danh sách hàng đợi chung của phòng khám.
- Thú cưng và chủ nuôi ngồi chờ tại sảnh tiếp đón. Chưa phát sinh hoạt động chuyên môn.

---

## 17. IN_PROGRESS (Giai đoạn 1) – Khám lâm sàng & Quyết định chỉ định

- Lễ tân điều phối ca khám cho Bác sĩ đang rảnh (`AVAILABLE`).
- Thú cưng được mời vào phòng khám cố định của Bác sĩ. Bác sĩ bấm **"Bắt đầu khám"** -> `Visit.status = IN_PROGRESS`. Bác sĩ chuyển sang trạng thái bận (`BUSY`).
- Bác sĩ tiến hành **Khám lâm sàng & Đo sinh hiệu**:
  - Hỏi bệnh sử, triệu chứng phát sinh.
  - Đặt thú cưng lên bàn cân (`weight_at_visit`) và dùng nhiệt kế đo thân nhiệt (`temperature`), ghi nhận vào bệnh án.
  - Nghe tim phổi, nắn bụng, kiểm tra niêm mạc, hạch bạch huyết.
  - Ghi nhận nhận định lâm sàng ban đầu.
- **Rẽ nhánh nghiệp vụ:**
  - **Trường hợp 1 (Khám thông thường / Tiêm phòng / Tẩy giun thuần túy):** Không cần cận lâm sàng -> Bác sĩ kết luận chẩn đoán, kê đơn/tiêm thuốc ngay và bấm Chốt ca -> Chuyển thẳng sang `WAITING_PAYMENT`.
  - **Trường hợp 2 (Cần xét nghiệm máu / Siêu âm / X-quang):** Bác sĩ lập phiếu chỉ định dịch vụ kỹ thuật. Khi xác nhận gửi chỉ định, ca khám chuyển sang trạng thái `WAITING_RESULTS`. Bác sĩ tạm thời giải phóng trạng thái về `AVAILABLE` để có thể nhận khám ca tiếp theo trong hàng đợi, tránh tình trạng tắc nghẽn phòng khám trong 15-45 phút chờ kết quả.

---

## 17.1. WAITING_RESULTS – Chờ kết quả cận lâm sàng & Quản lý 2 Hàng đợi chuyên môn độc lập

Khi Bác sĩ xác nhận gửi chỉ định, ca khám chuyển sang trạng thái `WAITING_RESULTS`. Các dịch vụ kỹ thuật được đẩy vào **2 Hàng đợi Cận lâm sàng độc lập** tương ứng với 2 phòng chuyên môn riêng biệt.

### 1. Phân tách 2 Phòng chuyên môn & 2 Hàng đợi độc lập
Hệ thống thiết kế theo mô hình phòng khám quy chuẩn:
1. **Phòng Xét nghiệm (Lab Room):**
   - Quản lý **Hàng đợi Phòng Xét nghiệm (Lab Queue)**, chỉ lọc các chỉ định có `category = 'LABORATORY'` (Tổng phân tích tế bào máu CBC, sinh hóa máu, soi phân, test nhanh truyền nhiễm).
   - Nhân sự phụ trách: Kỹ thuật viên / Bác sĩ chuyên trách phòng Lab.
2. **Phòng Chẩn đoán hình ảnh (Imaging Room):**
   - Quản lý **Hàng đợi Chẩn đoán hình ảnh (Imaging Queue)**, chỉ lọc các chỉ định có `category = 'IMAGING'` (Siêu âm ổ bụng, siêu âm tim, chụp X-quang tim phổi / xương khớp).
   - Nhân sự phụ trách: Bác sĩ chuyên trách chẩn đoán hình ảnh.
- **Nguyên tắc vận hành:** Hai phòng hoạt động hoàn toàn độc lập và song song. Hàng đợi của phòng này không bao giờ bị khóa hoặc chờ đợi cứng nhắc bởi phòng kia.

### 2. Thuật toán sắp xếp thứ tự ưu tiên trong từng Hàng đợi
Trong mỗi hàng đợi (Lab Queue & Imaging Queue), hệ thống sắp xếp tự động:
- **Ưu tiên 1 (Tuyệt đối):** Các ca gắn cờ **Cấp cứu khẩn cấp (`is_emergency = TRUE`)** tự động nhảy lên vị trí đầu tiên của hàng đợi kèm viền đỏ nhấp nháy trên màn hình. Kỹ thuật viên / Bác sĩ CĐHA bắt buộc phải tiếp nhận lấy mẫu hoặc chụp chiếu ngay lập tức.
- **Ưu tiên 2:** Các ca thông thường được xếp theo **thứ tự thời gian Bác sĩ nhấn xác nhận gửi chỉ định (FIFO - Đến trước làm trước)**.

### 3. Quy trình điều phối tối ưu khi chỉ định đồng thời 2 dịch vụ (Quy trình song song)
Khi một ca bệnh được chỉ định đồng thời cả Xét nghiệm máu và Siêu âm/X-quang, ca bệnh xuất hiện đồng thời trên cả 2 hàng đợi ở trạng thái `PENDING`:
- **Chỉ dẫn lộ trình khuyến nghị (Parallel Flow):** Hệ thống in phiếu chỉ định và gửi thông báo qua ứng dụng hướng dẫn chủ nuôi:
  > **Bước 1:** Ưu tiên đưa thú cưng vào **Phòng Xét nghiệm lấy mẫu máu trước** (thao tác lấy ven chỉ mất 2–3 phút).  
  > **Bước 2:** Kỹ thuật viên nạp mẫu vào máy phân tích tự động (thời gian máy chạy tự động mất 15–20 phút).  
  > **Bước 3:** Trong lúc máy xét nghiệm máu đang tự động phân tích ngầm, chủ nuôi đưa thú cưng sang **Phòng Chẩn đoán hình ảnh để thực hiện Siêu âm hoặc Chụp X-quang** (mất 10–15 phút).  
  > **Bước 4:** Khi siêu âm hoàn tất và tải ảnh lên hệ thống (`COMPLETED`), máy xét nghiệm máu bên phòng Lab cũng vừa in kết quả $\rightarrow$ Kỹ thuật viên Lab nhập chỉ số máu (`COMPLETED`).
- **Lợi ích vận hành:** Hai quy trình diễn ra gần như song song. Tổng thời gian chờ đợi rút ngắn chỉ còn khoảng 20 phút (thay vì 35–45 phút nếu làm tuần tự nối tiếp).

### 4. Cơ chế Điều phối liên phòng & Tránh xung đột gọi số (Cross-room Coordination)
Để giải quyết tình huống phòng CĐHA gọi số đúng lúc thú cưng đang lấy máu bên phòng Xét nghiệm:
- **Huy hiệu trạng thái liên phòng (Cross-room Badge):** Trên màn hình Hàng đợi CĐHA, ca khám hiển thị huy hiệu trực quan:
  - 🟡 `[Đang lấy máu bên phòng Lab]`: Khi phòng Lab vừa bấm tiếp nhận lấy máu.
  - 🟢 `[Đã lấy máu xong, sẵn sàng chụp]`: Khi phòng Lab đã nạp mẫu vào máy, thú cưng đã rời phòng Lab.
- **Cơ chế Tạm hoãn không làm nghẽn phòng máy:** Nếu đến lượt ca này trong hàng đợi CĐHA nhưng thú cưng chưa sang (đang lấy máu bên Lab), Bác sĩ CĐHA bấm nút **"Tạm hoãn / Gọi ca tiếp"**:
  - Dòng dịch vụ CĐHA **giữ nguyên là `PENDING`** (chưa thực hiện, không tốn vật tư).
  - Ca này được chuyển vào tab *"Ca tạm hoãn"* của phòng CĐHA.
  - Hệ thống **lập tức gọi ca kế tiếp** vào phòng siêu âm $\rightarrow$ **Phòng CĐHA không bao giờ bị treo!**
  - Khi thú cưng lấy máu xong bước sang cửa phòng CĐHA: Bác sĩ CĐHA bấm nút **"Gọi lại" (Recall)** $\rightarrow$ Mời vào phòng $\rightarrow$ Bấm *"Bắt đầu chụp"* $\rightarrow$ Dịch vụ CĐHA chuyển sang `IN_PROGRESS`.

### 5. Vòng đời chuyển trạng thái của dịch vụ cận lâm sàng (`visit_service_details.status`)
1. **`PENDING` (Chờ thực hiện):** Bác sĩ lâm sàng vừa gửi chỉ định, dịch vụ xuất hiện trong hàng đợi của phòng chuyên môn.
2. **Khi nhân viên bấm gọi số vào phòng:** Dịch vụ **VẪN GIỮ NGUYÊN `PENDING`** vì thú cưng chưa bước chân vào phòng, chưa phát sinh hao phí vật tư y tế.
3. **`IN_PROGRESS` (Đang thực hiện):** Thú cưng đã vào phòng, nhân viên bấm *"Bắt đầu thực hiện"* (lấy máu nạp máy hoặc bắt đầu quét siêu âm).
4. **`COMPLETED` (Đã hoàn tất):** Nhân viên nhập đầy đủ các chỉ số đo đạc hoặc tải tệp ảnh chẩn đoán lên và nhấn nút **"Lưu & Xác nhận kết quả"**.
5. **`CANCELLED` (Đã hủy):** Chỉ định bị hủy bỏ do chủ nuôi từ chối thực hiện hoặc Bác sĩ đổi hướng xử lý.

### 6. Cơ chế Quản lý ca vắng mặt (Missed Turn & Reactivation Workflow)
Khi gọi số vào phòng mà khách không có mặt (khách ra ngoài, cho thú cưng đi dạo, nghe điện thoại):
1. **Quy tắc 3 lần gọi:** Hệ thống hiển thị thông báo gọi số trên màn hình điều phối sảnh và gửi thông báo đến ứng dụng của chủ nuôi. Sau 3 lần gọi (mỗi lần cách nhau 60 giây) nếu khách chưa vào phòng:
2. **Báo vắng mặt:** Nhân viên bấm nút **"Báo vắng mặt / Gọi ca tiếp"**:
   - Trạng thái dịch vụ `visit_service_details.status` **GIỮ NGUYÊN LÀ `PENDING`**.
   - Ca khám được rút khỏi hàng đợi chính, chuyển sang tab **"Ca tạm hoãn do vắng mặt" (Missed Queue)**.
   - Hệ thống **lập tức gọi ca kế tiếp** $\rightarrow$ Không làm chậm trễ các bệnh nhân đang chờ phía sau.
   - Hệ thống gửi tin nhắn thông báo đến điện thoại chủ nuôi: *"Lượt gọi của bé [Tên Pet] đã qua do bạn vắng mặt. Lượt của bạn đang được tạm hoãn. Khi quay lại phòng khám, vui lòng báo Lễ tân hoặc nhấn 'Tôi đã có mặt' trên ứng dụng để được xếp lượt sớm nhất."*
3. **Kích hoạt lại khi khách quay lại:**
   - Khách quay lại báo với Lễ tân hoặc bấm nút "Tôi đã có mặt" trên ứng dụng.
   - Trên màn hình phòng máy: Ca tạm hoãn hiển thị màu xanh lá nhấp nháy `🟢 [Khách đã có mặt trở lại]`.
   - **Nguyên tắc xếp lượt công bằng:** Ca này được tự động ghim vào vị trí **"Ưu tiên kế tiếp" (Next In Line)** - được gọi ngay sau khi ca đang làm dở hoàn tất, không phải xếp hàng lại từ đầu. Nhân viên bấm **"Gọi lại vào phòng" (Recall)**.
4. **Xử lý cuối ngày (Khách bỏ về hẳn):** Nếu sau 60–120 phút khách vẫn không quay lại, Lễ tân liên hệ điện thoại xác nhận không quay lại $\rightarrow$ Thực hiện thao tác **"Đóng ca / Khách bỏ về"**: Các dịch vụ chưa làm chuyển `CANCELLED`; các dịch vụ đã làm chuyển chi phí sang hóa đơn ghi nợ; đóng hồ sơ ca khám.

### 7. Xử lý ngoại lệ: Khách xin hủy 1 trong 2 dịch vụ giữa chừng
- **Kịch bản:** Thú cưng đã làm xong Xét nghiệm máu (`COMPLETED`), nhưng khi sang phòng CĐHA thì thú cưng quá giãy giụa hoặc chủ nuôi đổi ý xin hủy không siêu âm nữa.
- **Xử lý:** Bác sĩ CĐHA chọn thao tác **"Hủy dịch vụ"** kèm lý do $\rightarrow$ Dịch vụ Siêu âm chuyển sang `CANCELLED`.
- **Kích hoạt ca khám:** Hệ thống kiểm tra: Tất cả các dịch vụ cận lâm sàng của ca khám này đều đã đạt `COMPLETED` hoặc `CANCELLED` $\rightarrow$ Tự động chuyển ca khám sang `pet_visits.status = 'RESULTS_READY'` để trả về cho Bác sĩ khám chính đọc kết quả xét nghiệm máu đã làm.
- **Viện phí:** Hóa đơn chỉ tính tiền xét nghiệm máu thực tế, tuyệt đối không tính tiền dịch vụ siêu âm đã hủy.

> **Cơ chế kích hoạt tự động sang cấp độ Đợt khám (`pet_visits`):**  
> Mỗi khi một dịch vụ chuyển sang `COMPLETED` hoặc `CANCELLED`, hệ thống tự động kiểm tra: Nếu **không còn dịch vụ nào ở trạng thái `PENDING` hoặc `IN_PROGRESS`**, hệ thống tự động cập nhật `pet_visits.status = 'RESULTS_READY'`, kích hoạt Khóa ưu tiên (Priority Lock) và thông báo cho Bác sĩ khám chính để ưu tiên gọi lại bệnh nhân vào phòng.

---

## 17.2. RESULTS_READY – Đã có kết quả cận lâm sàng & Quy trình xử lý hàng đợi tái khám

Khi nhân sự phòng Lab / CĐHA nhập đầy đủ kết quả đo đạc (WBC, RBC, HGB...) hoặc tải ảnh chụp siêu âm/X-quang và bấm **"Xác nhận hoàn tất kết quả"**:
- Hệ thống tự động chuyển trạng thái ca khám sang `RESULTS_READY`.
- Quy trình xử lý hàng đợi và điều phối tái khám được thực hiện qua **3 bước tự động**:

### Bước 1: Lúc có kết quả khi Bác sĩ phụ trách đang bận (`BUSY`)
- Ca khám được tự động đưa vào **Hàng đợi tái khám ưu tiên của Bác sĩ khám chính** (xếp theo FIFO: ca nào có kết quả trước đứng trước).
- **Trên màn hình Bác sĩ khám chính:** Hệ thống hiển thị huy hiệu thông báo nhẹ (Notification Badge) ở góc màn hình: *"Ca khám [Mã Visit - Tên Pet] đã có kết quả cận lâm sàng"* để Bác sĩ nắm được thông tin mà không bị ngắt quãng ca khám hiện tại.
- **Trên màn hình phòng chờ / Ứng dụng của chủ nuôi:** Hệ thống tự động phát thông báo: *"Bé [Tên Pet] đã có đầy đủ kết quả cận lâm sàng. Bác sĩ [Tên Bác sĩ] đang hoàn thành ca khám dở, dự kiến mời bạn và bé vào phòng khám trong ít phút nữa. Xin vui lòng chờ tại sảnh."*

### Bước 2: Thời điểm Bác sĩ kết thúc ca khám dở
Ngay khi Bác sĩ bấm Chốt ca hoặc chuyển ca hiện tại đi xét nghiệm:
- Hệ thống kiểm tra: Bác sĩ có ca bệnh nào đang ở trạng thái `RESULTS_READY` hay không?
- Nếu CÓ:
  - Hệ thống kích hoạt **Cơ chế Khóa ưu tiên (Priority Lock)**: Bác sĩ chuyển sang trạng thái `AVAILABLE_PRIORITY_CALLBACK`, tạm khóa nút phân công ca mới của Lễ tân.
  - Trên màn hình của Bác sĩ, hệ thống lập tức hiển thị hộp thoại nổi bật ca tái khám tiếp theo:
    > *"Ca khám tiếp theo: **Bệnh nhân [Tên Pet]** (Đã có đủ kết quả cận lâm sàng). [NÚT: MỜI VÀO PHÒNG]"*

### Bước 3: Bác sĩ bấm nút "Mời vào phòng"
- Bác sĩ bấm nút **"Mời vào phòng"**:
  - Hệ thống tự động hiển thị thông báo gọi số trên màn hình điều phối sảnh và gửi thông báo tới ứng dụng của chủ nuôi: *"Mời thú cưng [Tên Pet] của chủ nuôi [Tên Khách] vào lại phòng khám [Số phòng] gặp Bác sĩ [Tên Bác sĩ]"*.
  - Đẩy thông báo trực tiếp đến ứng dụng/tin nhắn của chủ nuôi: *"Mời bạn đưa bé vào phòng khám [Số phòng]"*.
  - Ca khám tự động chuyển sang trạng thái `IN_PROGRESS` (Giai đoạn 2).
  - Bác sĩ chuyển sang trạng thái `BUSY`.

> **Xử lý tình huống khách chưa vào phòng ngay (Cơ chế Tạm hoãn & Kích hoạt lại):**  
> - **Khi khách vắng mặt lúc gọi số:** Nếu đã thông báo gọi số 2–3 lần nhưng khách chưa vào phòng (do khách ra ngoài hoặc đưa thú cưng đi dạo), Bác sĩ bấm nút **"Tạm hoãn / Gọi ca tiếp"**:  
>   + Ca khám được giữ ở trạng thái `RESULTS_READY` và chuyển sang tab danh sách *"Ca chờ tái khám / Đã hoãn"* của Bác sĩ đó.  
>   + Hệ thống tạm giải phóng Bác sĩ về trạng thái `AVAILABLE` (nếu không còn ca chờ kết quả khác) để Lễ tân có thể phân ca mới vào phòng, tránh lãng phí thời gian chờ đợi của Bác sĩ.  
> - **Khi khách quay lại phòng khám:** Ca khám vẫn hiển thị sẵn sàng trong tab chờ của Bác sĩ. Bất kỳ lúc nào Bác sĩ khám xong ca khác hoặc thấy khách có mặt trước cửa phòng, Bác sĩ chỉ cần bấm nút **"Gọi lại vào phòng" (Recall)** $\rightarrow$ Hệ thống gửi thông báo trên màn hình sảnh và mời thú cưng vào tiếp tục Giai đoạn 2.  
> - **Trường hợp khách bỏ về hẳn (không quay lại đọc kết quả):** Sau khi Lễ tân liên hệ điện thoại xác nhận khách đã bỏ về hoặc đến hết ngày làm việc, Lễ tân hoặc Bác sĩ chọn thao tác **"Đóng ca / Khách bỏ về"**:  
>   + Hệ thống khóa hồ sơ chuyên môn, lưu trữ vĩnh viễn các kết quả xét nghiệm/CĐHA đã thực hiện vào Lịch sử bệnh án của thú cưng.  
>   + Chi phí các dịch vụ kỹ thuật đã thực hiện được chuyển sang hóa đơn để thu bù trong lần tiếp theo hoặc ghi nợ vào hồ sơ khách hàng (đảm bảo không thất thoát doanh thu của phòng khám).

---

## 17.3. IN_PROGRESS (Giai đoạn 2) – Đọc kết quả, Chẩn đoán xác định & Kê đơn

- Bệnh nhân bước vào phòng khám. Màn hình Bác sĩ tự động mở giao diện Bệnh án tổng hợp:
  - Xem bảng chỉ số máu đã được hệ thống tự động so sánh với khoảng tham chiếu chuẩn theo loài (chỉ rõ chỉ số nào `LOW`, `NORMAL`, `HIGH`).
  - Xem hình ảnh siêu âm / X-quang và kết luận hình thái học.
- Bác sĩ tổng hợp với triệu chứng lâm sàng ban đầu để đưa ra:
  - **Chẩn đoán xác định** (`diagnosis`).
  - **Phác đồ điều trị** (`treatment_plan`).
  - **Kê đơn thuốc điện tử** (`prescriptions` - kiểm tra tồn kho khả dụng tức thời).
- Bác sĩ thực hiện thao tác **Chốt đợt khám** -> `Visit.status = WAITING_PAYMENT`. Hồ sơ chuyên môn của ca bệnh được khóa lại.
- **Xử lý trạng thái Bác sĩ sau khi chốt ca:**
  - Nếu Bác sĩ **vẫn còn ca khác đang `RESULTS_READY`**: Hệ thống tiếp tục giữ trạng thái `AVAILABLE_PRIORITY_CALLBACK` và hiển thị ca tiếp theo để Bác sĩ gọi vào.
  - Nếu Bác sĩ **hết sạch ca chờ kết quả**: Hệ thống chuyển Bác sĩ về trạng thái `AVAILABLE` (Sẵn sàng nhận ca mới), mở khóa nút phân công trên màn hình của Lễ tân.

---

---

## 18. Khám lâm sàng chi tiết

Bác sĩ thực hiện thăm khám toàn diện:
- Quan sát tri giác, dáng đi, thể trạng (gầy/béo).
- Khám mắt, mũi, miệng, tai, răng miệng.
- Nghe tim phổi (nhịp tim, âm phổi bất thường).
- Sờ nắn hạch ngoại vi, sờ nắn ổ bụng (kiểm tra khối u, đau bụng).
- Đo các chỉ số sinh hiệu: Thân nhiệt (°C), Cân nặng (kg).
- Ghi nhận triệu chứng lâm sàng vào bệnh án điện tử.

---

## 19. Chỉ định dịch vụ

Bác sĩ quyết định có cần dịch vụ bổ sung hay không.

Ví dụ:

```text
Khám
 ↓
Nghi ngờ bệnh tiêu hóa
 ↓
Chỉ định:
 ├── Xét nghiệm máu
 └── Siêu âm
```

Mỗi dịch vụ được tạo thành một dòng:

```text
visit_service_details
```

---

## 20. Danh mục dịch vụ & Phân tích sự khác biệt về quy trình thực hiện

Hệ thống quản lý các nhóm dịch vụ kỹ thuật:

```text
EXAMINATION          (Khám lâm sàng tổng quát / chuyên sâu)
VACCINATION          (Tiêm phòng vaccine)
DEWORMING            (Tẩy giun sán)
EXTERNAL_PARASITE    (Trị ve, rận, bọ chét)
INJECTION_INFUSION   (Tiêm thuốc, truyền dịch)
LABORATORY           (Xét nghiệm máu, sinh hóa, nước tiểu)
IMAGING              (Siêu âm, Chụp X-quang)
SURGERY              (Phẫu thuật ngoại khoa)
PROCEDURE            (Thủ thuật: cắt chỉ, nẹp xương, rửa vết thương)
```

> **TRẢ LỜI CÂU HỎI NGHIỆP VỤ: "CÁC DỊCH VỤ CÓ TIẾN HÀNH GIỐNG NHAU KHÔNG?"**  
> **Hoàn toàn KHÔNG.** Mỗi nhóm dịch vụ có bản chất y tế, không gian thực hiện, thiết bị chuyên dụng, chu kỳ thời gian và cấu trúc dữ liệu đầu ra hoàn toàn khác nhau. Hệ thống chia thành **3 quy trình dịch vụ chuyên biệt**:

---

### Quy trình 1: Nhóm Cận lâm sàng Xét nghiệm (`LABORATORY`)
- **Không gian & Thiết bị:** Phòng xét nghiệm riêng biệt với máy phân tích huyết học/sinh hóa tự động.
- **Tiến hành:**
  1. Điều dưỡng/Kỹ thuật viên lấy mẫu máu/bệnh phẩm từ thú cưng.
  2. Mẫu được nạp vào máy chạy tự động (mất từ 15 – 30 phút).
  3. Nhân sự phòng Lab mở màn hình *"Chỉ định chờ thực hiện"*, nhập các chỉ số đo đạc thực tế (`WBC`, `RBC`, `HGB`, `PLT`, `Glucose`...).
- **Đặc thù nghiệp vụ:**
  - Hệ thống **tự động đối chiếu theo loài (`species_id`: Chó khác Mèo)** để đánh giá kết quả: `LOW` (Thấp), `NORMAL` (Bình thường), `HIGH` (Cao).
  - Snapshot khoảng tham chiếu (`min_value`, `max_value`) vào kết quả để bảo toàn lịch sử y khoa.

---

### Quy trình 2: Nhóm Chẩn đoán hình ảnh (`IMAGING` - Siêu âm, X-quang)
- **Không gian & Thiết bị:** Phòng tối máy siêu âm màu hoặc phòng chì chụp X-quang kỹ thuật số chống bức xạ.
- **Tiến hành:**
  1. Thú cưng được đưa vào phòng CĐHA, cố định tư thế (cạo lông vùng bụng nếu siêu âm, đặt lên bàn chụp nếu X-quang).
  2. Bác sĩ/KTV chuyên trách thực hiện quét đầu dò hoặc bấm tia X.
  3. Bác sĩ quan sát hình ảnh, nhập **mô tả tổn thương hình thái học** và **kết luận chẩn đoán hình ảnh**.
  4. Tải các tệp hình ảnh thực tế (JPEG/PNG/DICOM) lên hệ thống lưu trữ (MinIO/S3).
- **Đặc thù nghiệp vụ:** Đầu ra là hình ảnh trực quan và kết luận giải phẫu, không phải là các chỉ số số học như xét nghiệm.

---

### Quy trình 3: Nhóm Tiêm chủng & Tẩy giun (`VACCINATION` & `DEWORMING`)
- **Không gian & Thiết bị:** Tiến hành ngay tại phòng khám của Bác sĩ.
- **Tiến hành:**
  1. **Khám sàng lọc bắt buộc:** Bác sĩ đo nhiệt độ, kiểm tra thể trạng. Thú cưng phải hoàn toàn khỏe mạnh, không sốt, không tiêu chảy mới được tiêm.
  2. Lấy vaccine/thuốc từ tủ bảo quản lạnh chuyên dụng (2-8°C).
  3. Thực hiện tiêm dưới da/bắp thịt hoặc cho uống thuốc tẩy giun.
- **Đặc thù nghiệp vụ:**
  - **Tách biệt chi phí:** Công tiêm/khám là `Service`, lọ vaccine/viên thuốc là `Medicine`.

---

## 21. Quy tắc tách biệt chi phí Dịch vụ và Thuốc

Hệ thống quản lý minh bạch hai dòng doanh thu và tồn kho:

```text
- Tiêm vaccine:
  ├── Công tiêm / Khám sàng lọc  ───→ Dịch vụ (Service)
  └── Lọ Vaccine phòng bệnh      ───→ Thuốc & Vật tư (Medicine)

- Truyền dịch:
  ├── Công đặt catheter & truyền ───→ Dịch vụ (Service)
  └── Chai dịch truyền, dây tiêm ───→ Thuốc & Vật tư (Medicine)

- Tẩy giun:
  ├── Công khám & cho uống thuốc ───→ Dịch vụ (Service)
  └── Viên thuốc tẩy giun        ───→ Thuốc & Vật tư (Medicine)
```

Nhờ đó phòng khám có thể quản lý:
- Doanh thu dịch vụ kỹ thuật.
- Doanh thu và tồn kho dược phẩm một cách độc lập, chính xác.

---

## 22. Xét nghiệm máu & Quy tắc đối chiếu tham chiếu theo loài

Khi chỉ định gói dịch vụ xét nghiệm (ví dụ `CBC - Tổng phân tích tế bào máu`), hệ thống xác định các chỉ số đo đạc thành phần:

```text
CBC
├── WBC  (Bạch cầu)
├── RBC  (Hồng cầu)
├── HGB  (Huyết sắc tố)
├── HCT  (Dung tích hồng cầu)
└── PLT  (Tiểu cầu)
```

### Khoảng tham chiếu sinh lý phụ thuộc theo loài (`Species`)
Khoảng tham chiếu của Chó và Mèo hoàn toàn khác biệt về mặt y khoa:

```text
Chỉ số WBC (Bạch cầu):
├── Chó: Ngưỡng bình thường: 6.00  - 17.00 (10^9/L)
└── Mèo: Ngưỡng bình thường: 5.50  - 19.50 (10^9/L)

Chỉ số PLT (Tiểu cầu):
├── Chó: Ngưỡng bình thường: 200.00 - 500.00 (10^9/L)
└── Mèo: Ngưỡng bình thường: 300.00 - 700.00 (10^9/L)
```

Khi nhập giá trị đo được (ví dụ đo máu Chó có `WBC = 21.0`), hệ thống tự động so sánh với ngưỡng loài Chó và gán nhãn `evaluation = 'HIGH'`.

---

## 23. Snapshot Reference Range & Snapshot Đơn giá

Nhằm bảo toàn tính pháp lý và lịch sử bệnh án:
- **Snapshot Tham chiếu:** Khi lưu kết quả xét nghiệm, hệ thống sao chép trực tiếp `min_value` và `max_value` tại thời điểm đó vào bản ghi `lab_test_results`. Nếu sau này Quản trị viên điều chỉnh cấu hình tham chiếu trong danh mục, các kết quả cũ đã đo trong quá khứ vẫn giữ nguyên giá trị đánh giá gốc.
- **Snapshot Đơn giá:** Đơn giá dịch vụ (`visit_service_details.unit_price`) và đơn giá thuốc (`prescription_items.unit_price`) được chụp lại tại thời điểm chỉ định/kê đơn, độc lập với các lần tăng/giảm giá niêm yết sau này.

---

## 24. Chẩn đoán cuối cùng

Sau khi có đủ kết quả:

```text
Khám + Xét nghiệm + CĐHA + Theo dõi ───→ Chẩn đoán
```

Bác sĩ cập nhật:

- Chẩn đoán xác định.
- Hướng điều trị.
- Lời dặn.
- Kế hoạch theo dõi nếu cần.

---

## 25. Kê đơn

Một Visit có tối đa một Prescription.

```text
Visit
  │
  └── Prescription
          │
          ├── Medicine A
          ├── Medicine B
          └── Medicine C
```

Cấu trúc CSDL:

```text
prescriptions
       │
       ↓
prescription_items
       │
       ↓
medicines
```

Mỗi `prescription_item` lưu:

- Thuốc.
- Số lượng.
- Đơn giá.
- Liều dùng.
- Số lần/ngày.
- Số ngày.
- Hướng dẫn sử dụng.

---

## 26. Snapshot giá

Khi thuốc được kê:

```text
Medicine: price = 50.000
Prescription Item: unit_price = 50.000
```

Sau này nếu giá thay đổi:

```text
Medicine: price = 60.000
```

Đơn thuốc cũ vẫn giữ nguyên `unit_price = 50.000`.

Tương tự, đơn giá dịch vụ được snapshot tại thời điểm chỉ định.

---

## 27. Chốt chuyên môn

Khi bác sĩ hoàn thành công việc:

```text
IN_PROGRESS ───→ WAITING_PAYMENT
```

Bác sĩ thực hiện thao tác: **Chốt đợt khám / Chuyển thanh toán**.

Sau khi chốt:

- Không được sửa tùy ý kết quả.
- Không được thêm thuốc.
- Không được thêm dịch vụ.
- Không được sửa chẩn đoán.

Nếu phát hiện sai sót, cần có nghiệp vụ **mở lại Visit** bởi người có thẩm quyền.

---

## 28. Tính viện phí

Công thức:

```text
Tổng dịch vụ + Tổng thuốc - Chiết khấu = Tổng phải thanh toán
```

Ví dụ:

```text
Khám                  100.000
Xét nghiệm             250.000
Siêu âm                200.000
Thuốc                   80.000
--------------------------------
Tạm tính               630.000
Chiết khấu              30.000
--------------------------------
Thanh toán             600.000
```

---

## 29. Hóa đơn

Một Visit có tối đa một Invoice.

```text
Visit ───→ Invoice
```

Invoice lưu:

- Mã hóa đơn.
- Visit.
- Tổng tiền dịch vụ.
- Tổng tiền thuốc.
- Chiết khấu.
- Tổng phải thanh toán.
- Phương thức thanh toán.
- Thời gian thanh toán.
- Trạng thái thanh toán.

---

## 30. Thanh toán

Khách hàng thực hiện thanh toán viện phí bên ngoài quầy (trả tiền mặt hoặc tự chuyển khoản ngân hàng riêng). Lễ tân / Thu ngân thực hiện:

1. Mở màn hình hóa đơn của đợt khám và kiểm tra chi tiết bảng kê viện phí cùng khách hàng.
2. Xác nhận tổng số tiền thanh toán (sau khi áp dụng chiết khấu nếu có).
3. Khách hàng thanh toán tiền bên ngoài quầy.
4. Sau khi nhận đủ tiền mặt hoặc xác nhận tiền đã vào tài khoản phòng khám, Lễ tân/Thu ngân nhấn nút **"Xác nhận thanh toán"** trên hệ thống (chưa cần tích hợp chọn phương thức thanh toán).
5. Hệ thống cập nhật hóa đơn sang `PAID`, ghi nhận `paid_at = NOW()`, `cashier_id = :id` và mở khóa quy trình xuất thuốc.

---

## 31. Xuất thuốc

Sau khi thanh toán:

```text
Prescription ───→ Dispense ───→ Trừ tồn kho
```

Ví dụ:

```text
Kho: Amoxicillin = 100 viên
Khách mua: 10 viên
Sau xuất: 90 viên
```

Hệ thống phải đảm bảo một đơn thuốc không bị trừ kho hai lần.

---

## 32. Hoàn tất Visit

Sau khi thanh toán thành công:

```text
WAITING_PAYMENT ───→ COMPLETED
```

Visit trở thành một phần của lịch sử bệnh án.

---

## 33. Hủy Visit

Nếu khách đang chờ hoặc đang khám nhưng không tiếp tục:

```text
WAITING → CANCELLED
hoặc
IN_PROGRESS → CANCELLED
```

Phải lưu:

- Người thực hiện hủy.
- Thời gian.
- Lý do hủy (`OWNER_REQUEST`, `CREATED_BY_MISTAKE`, `EMERGENCY`, `OTHER`, ...).

---

## 34. Lịch sử bệnh án

Lịch sử bệnh án của thú cưng được hình thành từ toàn bộ các Visit:

```text
PET
 │
 ├── Visit 01 (Diagnosis, Lab, Prescription)
 ├── Visit 02 (Diagnosis, Imaging)
 └── Visit 03 (Diagnosis, Prescription)
```

Bác sĩ có thể tra cứu lịch sử bệnh án trước khi đưa ra chẩn đoán mới.

---

## 35. Tiêm phòng và tẩy giun định kỳ

Khi thực hiện `Vaccination` hoặc `Deworming`, hệ thống ghi nhận:

- Ngày thực hiện.
- Loại vaccine / thuốc.
- Lần thực hiện.
Hệ thống ghi nhận vào lịch sử bệnh án của thú cưng để phục vụ tra cứu sau này.

---

## 36. Portal dành cho chủ thú cưng

Chủ thú cưng có thể:

- **Quản lý thú cưng:** Xem danh sách thú cưng, cập nhật thông tin.
- **Đặt lịch:** Chọn thú cưng, chọn ngày, chọn khung giờ, nhập lý do (**không chọn bác sĩ**).
- **Theo dõi lịch:** Chờ xác nhận, đã xác nhận, đã đến, đã hủy.
- **Xem bệnh án:** Lịch sử khám, chẩn đoán, xét nghiệm, hình ảnh, đơn thuốc.

---

## 37. Quản lý danh mục thuốc

Administrator quản lý thông tin thuốc:

- Mã thuốc (`Code`).
- Tên thuốc (`Name`).
- Hoạt chất (`Active Ingredient`).
- Dạng bào chế (`Dosage Form`).
- Đơn vị tính (`Unit`).
- Giá bán lẻ (`Sale Price`).
- Số lượng tồn kho (`Stock Quantity`).
- Mức tồn tối thiểu cảnh báo (`Minimum Stock`).
- Trạng thái (`Status`).

*(Mở rộng trong tương lai: Quản lý lô thuốc, hạn sử dụng, nhà cung cấp).*

---

## 38. Quản lý kho

Hệ thống quản lý số lượng thuốc:

```text
Tồn cuối = Tồn đầu + Nhập kho - Xuất kho
```

Khi `stock_quantity <= min_stock_alert`, hệ thống phát cảnh báo tồn kho thấp.

---

## 39. Quản lý danh mục dịch vụ

Administrator có thể:

- Thêm dịch vụ.
- Sửa dịch vụ.
- Ngừng sử dụng dịch vụ (`ACTIVE` / `INACTIVE`).
- Thiết lập bảng giá.
- Phân loại nhóm dịch vụ.

> Không xóa cứng dịch vụ đã từng phát sinh trong lịch sử khám để bảo toàn tính toàn vẹn dữ liệu.

---

## 40. Báo cáo và thống kê

Administrator có thể xem:

- **Doanh thu:** Theo ngày, theo tháng, theo năm, theo dịch vụ, theo thuốc.
- **Hoạt động khám:** Số lượt khám, số ca hoàn tất, số ca hủy, số ca No-show.
- **Dịch vụ:** Dịch vụ dùng nhiều nhất, doanh thu theo dịch vụ.
- **Thuốc:** Thuốc bán chạy, thuốc sắp hết hàng.
- **Bác sĩ:** Thống kê số ca khám, số ca hoàn thành (không phân quyền theo thống kê).

---

## 41. Các quy tắc nghiệp vụ cốt lõi (Business Rules)

### Nhóm khách hàng & Thú cưng
- **BR-01:** Một khách hàng có thể sở hữu nhiều thú cưng.
- **BR-02:** Một thú cưng thuộc về một chủ sở hữu chính.
- **BR-03:** Một thú cưng có thể có nhiều Visit trong suốt vòng đời.

### Nhóm Appointment
- **BR-04:** Khách hàng không được chọn bác sĩ khi đặt lịch.
- **BR-05:** Appointment chỉ xác định thời gian dự kiến và nhu cầu khám.
- **BR-06:** Một Appointment chuyển đổi thành tối đa một Visit.
- **BR-07:** Appointment có thể bị hủy bởi khách hoặc nhân viên kèm lý do.
- **BR-08:** Appointment chuyển thành `NO_SHOW` nếu quá thời gian quy định (ví dụ 30 phút) mà khách không đến.

### Nhóm hàng đợi & Phân công
- **BR-09:** Visit sau khi tiếp nhận được tự động đưa vào hàng đợi (`WAITING`).
- **BR-10:** Lễ tân chịu trách nhiệm phân công bác sĩ phụ trách.
- **BR-11:** Chỉ bác sĩ có trạng thái `AVAILABLE` (không bận khám ca khác) mới được tiếp nhận ca mới.
- **BR-12:** Một bác sĩ chỉ khám một ca tại một thời điểm (không gán đồng thời 2 ca `IN_PROGRESS`).
- **BR-13:** Bác sĩ khám tại số phòng cố định đã được gán sẵn trong tài khoản.

### Nhóm Visit
- **BR-14:** Visit có thể sinh ra từ Appointment (`CHECKED_IN`) hoặc tạo trực tiếp từ Walk-in.
- **BR-15:** Một Visit gắn liền với duy nhất một thú cưng.
- **BR-16:** Một Visit có một bác sĩ phụ trách chính sau khi phân công.
- **BR-17:** Một Visit có thể bao gồm nhiều chỉ định dịch vụ kỹ thuật.
- **BR-18:** Một Visit có tối đa một Prescription (đơn thuốc).
- **BR-19:** Một Visit có tối đa một Invoice (hóa đơn).

### Nhóm chuyên môn
- **BR-20:** Phân quyền ghi dữ liệu chuyên môn nghiêm ngặt theo vai trò: `VETERINARIAN` (khám lâm sàng, ra chỉ định, chẩn đoán xác định, kê đơn), `LAB_TECHNICIAN` (nhập kết quả xét nghiệm), `IMAGING_TECHNICIAN` (tải tệp ảnh và nhập kết luận chẩn đoán hình ảnh).
- **BR-21:** Dịch vụ kỹ thuật và Thuốc được quản lý tách biệt (công thực hiện vs vật tư/thuốc).
- **BR-22:** Mỗi dịch vụ kỹ thuật có thể sinh ra các bản ghi kết quả chi tiết riêng (xét nghiệm, chẩn đoán hình ảnh).
- **BR-23:** Khoảng tham chiếu xét nghiệm phải phụ thuộc theo loài (`Species`).
- **BR-24:** Khoảng tham chiếu (min, max) phải được snapshot vào kết quả tại thời điểm thực hiện.

### Nhóm tài chính & Thanh toán
- **BR-25:** Đơn giá dịch vụ được snapshot tại thời điểm bác sĩ chỉ định.
- **BR-26:** Đơn giá thuốc được snapshot tại thời điểm kê đơn.
- **BR-27:** Visit phải được bác sĩ chốt chuyên môn và chuyển sang `WAITING_PAYMENT` trước khi thu ngân thanh toán.
- **BR-28:** Visit chỉ chuyển sang `COMPLETED` sau khi hóa đơn được thanh toán thành công (`PAID`).

### Nhóm kho dược
- **BR-29:** Thuốc chỉ được tự động trừ tồn kho khi lễ tân thực hiện nghiệp vụ xuất thuốc sau thanh toán.
- **BR-30:** Không được xuất thuốc vượt quá số lượng tồn kho khả dụng.
- **BR-31:** Một đơn thuốc không được phép trừ kho nhiều hơn một lần.

---

## 42. State Machine hoàn chỉnh

### 48.1. State Machine: Appointment

```text
                 ┌─────────────┐
                 │   PENDING   │
                 └──────┬──────┘
                        │ (Xác nhận lịch)
                        ↓
                 ┌─────────────┐
                 │  CONFIRMED  │
                 └──────┬──────┘
                        │ (Khách đến phòng khám)
                        ↓
                 ┌─────────────┐
                 │ CHECKED_IN  │ ──────→ Tạo Pet Visit
                 └─────────────┘

Nhánh kết thúc khác:
- PENDING   ───(Khách/Lễ tân hủy)──────────────→ CANCELLED
- CONFIRMED ───(Khách/Lễ tân hủy)──────────────→ CANCELLED
- CONFIRMED ───(Quá hạn giờ hẹn 30 phút)──────→ NO_SHOW
```

---

### 48.2. State Machine: Pet Visit

```text
                 ┌─────────┐
                 │ WAITING │ (Nằm trong hàng đợi phòng khám)
                 └────┬────┘
                      │ Lễ tân phân công Bác sĩ (Bác sĩ nhận ca)
                      ↓
               ┌─────────────┐
               │ IN_PROGRESS │ (Khám, xét nghiệm, CĐHA, kê đơn)
               └──────┬──────┘
                      │ Bác sĩ chốt đợt khám
                      ↓
             ┌──────────────────┐
             │ WAITING_PAYMENT  │ (Lễ tân thu tiền)
             └────────┬─────────┘
                      │ Thanh toán thành công & Xuất thuốc
                      ↓
                ┌───────────┐
                │ COMPLETED │ (Lưu trữ vào lịch sử bệnh án)
                └───────────┘

Nhánh hủy:
- WAITING         ───(Khách bỏ về / lỗi tạo)──────────→ CANCELLED
- IN_PROGRESS     ───(Khách từ chối khám / Chuyển viện)─→ CANCELLED
- WAITING_RESULTS ───(Khách bỏ về chưa có KQ)──────────→ CANCELLED
```

---

## 43. Luồng nghiệp vụ tổng thể (End-to-End Workflow)

```text
                  CHỦ THÚ CƯNG
                       │
             ┌─────────┴─────────┐
             │                   │
        Đặt lịch Online       Walk-in
             │                   │
             ↓                   │
        APPOINTMENT              │
             │                   │
       PENDING/CONFIRMED         │
             │                   │
             ↓                   │
         CHECKED_IN              │
             │                   │
             └─────────┬─────────┘
                       ↓
                  TẠO VISIT
                       │
                       ↓
                    WAITING (Hàng đợi)
                       │
                       ↓
              LỄ TÂN PHÂN CÔNG
                       │
             ┌─────────┼─────────┐
             ↓         ↓         ↓
            BS A      BS B      BS C
             │         │         │
           P01       P02       P03
                       │
                       ↓
                 IN_PROGRESS
                       │
             ┌─────────┼─────────┐
             │         │         │
             ↓         ↓         ↓
           Khám      Xét nghiệm  CĐHA
             │         │         │
             │         ↓         ↓
             │       Results   Results
             │         │         │
             └─────────┼─────────┘
                       ↓
                   Chẩn đoán
                       ↓
                    Kê đơn
                       ↓
              CHỐT ĐỢT KHÁM
                       ↓
                WAITING_PAYMENT
                       ↓
                    INVOICE
                       ↓
                  THANH TOÁN
                       ↓
                  XUẤT THUỐC
                       ↓
                  TRỪ TỒN KHO
                       ↓
                   COMPLETED
                       ↓
              LỊCH SỬ BỆNH ÁN
```

---

## 44. Mô hình dữ liệu khái niệm (Conceptual Data Model)

### 44.1. Cấu trúc tài khoản người dùng
Không chia thành các bảng tài khoản phân mảnh, sử dụng mô hình xác thực tập trung:
- `users`: Thông tin định danh, tài khoản, mật khẩu, trạng thái.
- `roles`: Bảng vai trò (`ADMIN`, `VETERINARIAN`, `RECEPTIONIST`, `PET_OWNER`).

### 44.2. Các thực thể chính trong hệ thống

```text
1. USERS
2. ROLES
3. REFRESH_TOKENS

4. APPOINTMENTS
5. APPOINTMENT_STATUS_HISTORIES

6. SPECIES
7. PETS
8. SERVICES
9. LAB_TEST_ITEMS
10. LAB_TEST_REFERENCE_RANGES
11. PET_VISITS
12. PET_VISIT_STATUS_HISTORIES
13. VISIT_SERVICE_DETAILS
14. VISIT_SERVICE_DETAIL_HISTORIES
15. LAB_TEST_RESULTS
16. IMAGING_RESULTS
17. IMAGING_ATTACHMENTS

18. MEDICINES
19. PRESCRIPTIONS
20. PRESCRIPTION_ITEMS
21. INVENTORY_TRANSACTIONS
22. INVOICES
23. INVOICE_ITEMS
```

### 44.3. Trục dữ liệu chính (Core Data Backbone)

```text
APPOINTMENTS ─── (1 : N) ─── APPOINTMENT_STATUS_HISTORIES

PET_OWNER (USER)
    ↓ (1 : N)
PET
    ↓ (1 : N)
PET_VISIT ─── (1 : N) ─── PET_VISIT_STATUS_HISTORIES
    ├── (1 : N) ─── VISIT_SERVICE_DETAILS ─── (1 : N) ─── VISIT_SERVICE_DETAIL_HISTORIES
    │                     ├── LAB_TEST_RESULTS
    │                     └── IMAGING_RESULTS ─── (1 : N) ─── IMAGING_ATTACHMENTS
    │
    ├── (1 : 1) ─── PRESCRIPTION ─── (1 : 1) ─── INVOICE
    │                     └── (1 : N) ─── PRESCRIPTION_ITEMS      └── (1 : N) ─── INVOICE_ITEMS
    │                                           └── (N : 1) ─── MEDICINES
    │                                                             └── (1 : N) ─── INVENTORY_TRANSACTIONS
    └── (1 : 1) ─── INVOICE (Settles visit & prescription)
```

### 44.4. Phân rã nghiệp vụ theo vai trò người dùng

```text
USER
 │
 ├── ADMIN
 │      ├── Quản lý nhân sự, gán phòng làm việc cố định
 │      ├── Cấu hình danh mục Dịch vụ, Thuốc, Xét nghiệm, Tham chiếu
 │      └── Xem thống kê, báo cáo doanh thu & vận hành
 │
 ├── RECEPTIONIST
 │      ├── Tiếp nhận đặt lịch, check-in
 │      ├── Điều phối hàng đợi & phân công Bác sĩ vào phòng
 │      └── Lập hóa đơn, thu tiền, xuất thuốc tại quầy
 │
 ├── VETERINARIAN
 │      ├── Khám lâm sàng & ghi nhận triệu chứng ban đầu
 │      ├── Chỉ định dịch vụ cận lâm sàng (Lab, CĐHA)
 │      ├── Kết luận chẩn đoán xác định & kê đơn thuốc
 │      └── Chốt đợt khám, chuyển trạng thái thanh toán
 │
 ├── LAB_TECHNICIAN
 │      ├── Tiếp nhận chỉ định xét nghiệm & nhận mẫu bệnh phẩm
 │      ├── Vận hành máy xét nghiệm tự động
 │      └── Nhập chỉ số đo lường, đối soát tham chiếu & xác nhận kết quả
 │
 ├── IMAGING_TECHNICIAN
 │      ├── Tiếp nhận chỉ định CĐHA (X-quang, Siêu âm)
 │      ├── Thực hiện chụp chiếu / siêu âm & tải tệp ảnh lên hệ thống
 │      └── Nhập mô tả hình ảnh tổn thương & kết luận hình thái học
 │
 └── PET_OWNER
        ├── Quản lý hồ sơ thú cưng gia đình
        ├── Đặt lịch hẹn trực tuyến (không chọn BS)
        └── Tra cứu lịch sử khám bệnh & đơn thuốc
```
