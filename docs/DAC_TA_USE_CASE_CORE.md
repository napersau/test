# TÀI LIỆU ĐẶC TẢ USE CASE HỆ THỐNG
## HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y

> **Tài liệu chuẩn RUP / IEEE phục vụ Đồ án tốt nghiệp Công nghệ Thông tin**  
> **Định dạng:** Chuẩn bảng đặc tả 2 cột (Use Case Specification Table Format) phục vụ đóng tập báo cáo đồ án.  
> **Nguyên tắc kỹ thuật:**  
> - Tập trung 100% vào **Luồng nghiệp vụ** và hành vi tương tác giữa Người dùng và Hệ thống.  
> - Tuyệt đối không đưa các chi tiết cài đặt kỹ thuật cơ sở dữ liệu tầng thấp (tên bảng, tên cột, SQL, hàm thời gian hệ thống hay công thức toán học nội bộ CSDL) vào nội dung Use Case.  
> - Các thao tác cập nhật đa thực thể được mô tả bằng quy trình giao dịch nghiệp vụ an toàn (*atomic business transaction with rollback on failure*).

---

## MỤC LỤC CÁC USE CASE ĐẶC TẢ

### PHẦN I: PHÂN HỆ 3 - TIẾP ĐÓN, ĐẶT LỊCH & HÀNG ĐỢI (BOOKING & QUEUE RECEPTION)
1. [UC-14: Đặt lịch hẹn khám trực tuyến (Online Booking)](#1-uc-14-đặt-lịch-hẹn-khám-trực-tuyến)
2. [UC-15: Quản lý lịch hẹn cá nhân (Manage Personal Appointments)](#2-uc-15-quản-lý-lịch-hẹn-cá-nhân)
3. [UC-16: Đặt lịch hẹn tại quầy / qua điện thoại (Receptionist Appointment Booking)](#3-uc-16-đặt-lịch-hẹn-tại-quầy--qua-điện-thoại)
4. [UC-17: Duyệt xác nhận / Từ chối lịch hẹn trực tuyến (Confirm & Cancel Online Appointment)](#4-uc-17-duyệt-xác-nhận--từ-chối-lịch-hẹn-trực-tuyến)
5. [UC-18: Quản lý hồ sơ Khách hàng & Thú cưng tại quầy (Manage Pet Owners & Pets)](#5-uc-18-quản-lý-hồ-sơ-khách-hàng--thú-cưng-tại-quầy)
6. [UC-19: Tiếp nhận thú cưng tại quầy (Check-in Appointment & Walk-in)](#6-uc-19-tiếp-nhận-thú-cưng-tại-quầy)
7. [UC-20: Giám sát & Điều phối hàng đợi khám bệnh (Queue Monitoring & Priority Handling)](#7-uc-20-giám-sát--điều-phối-hàng-đợi-khám-bệnh)
8. [UC-21: Điều phối & Phân công Bác sĩ phụ trách ca khám (Assign Doctor to Visit)](#8-uc-21-điều-phối--phân-công-bác-sĩ-phụ-trách-ca-khám)

### PHẦN II: LUỒNG CHUYÊN MÔN KHÁM CHỮA BỆNH, CẬN LÂM SÀNG, VIỆN PHÍ & DƯỢC
9. [UC-22 & UC-23: Khám lâm sàng sơ bộ & Chỉ định dịch vụ - Giai đoạn 1 (Clinical Assessment & Service Ordering)](#9-uc-22--uc-23-khám-lâm-sàng-sơ-bộ--chỉ-định-dịch-vụ-giai-đoạn-1)
10. [UC-25 & UC-26: Tiếp nhận mẫu, Thực hiện Cận lâm sàng & Trả kết quả (Process Lab & Imaging Services)](#10-uc-25--uc-26-tiếp-nhận-mẫu-thực-hiện-cận-lâm-sàng--trả-kết-quả)
11. [UC-30, UC-31 & UC-33: Hội chẩn kết quả, Kê đơn & Chốt đợt khám - Giai đoạn 2 (Final Clinical Diagnosis & Visit Closing)](#11-uc-30-uc-31--uc-33-hội-chẩn-kết-quả-kê-đơn--chốt-đợt-khám-giai-đoạn-2)
12. [UC-34 & UC-35: Lập hóa đơn viện phí & Xác nhận thanh toán (Billing & Payment Processing)](#12-uc-34--uc-35-lập-hóa-đơn-viện-phí--xác-nhận-thanh-toán)
13. [UC-36: Xuất thuốc theo đơn & Tự động trừ tồn kho (Dispense Prescription & Deduct Stock)](#13-uc-36-xuất-thuốc-theo-đơn--tự-động-trừ-tồn-kho)

---

## SƠ ĐỒ LUỒNG THỰC THI LIÊN KẾT GIỮA CÁC USE CASE

```text
[ CHỦ THÚ CƯNG ]
      │
      ├──> UC-14: Đặt lịch trực tuyến (Chờ xác nhận)
      │       │
      │       └──> UC-15: Quản lý lịch hẹn cá nhân (Đổi giờ / Tự hủy hẹn)
      │
══════╪═══════════════════════════════════════════════════════════════════════════
[ LỄ TÂN ]
      │
      ├──> UC-16: Đặt lịch qua điện thoại / tại quầy (Xác nhận ngay)
      ├──> UC-17: Duyệt xác nhận / Từ chối lịch hẹn trực tuyến
      ├──> UC-18: Quản lý hồ sơ Khách hàng & Thú cưng
      │
      ├──> UC-19: Tiếp nhận thú cưng (Check-in Appointment & Walk-in)
      │       │
      │       ▼
      ├──> UC-20: Giám sát & Quản lý Hàng đợi khám bệnh (Phân loại ưu tiên)
      │       │
      │       ▼
      └──> UC-21: Điều phối & Phân công Bác sĩ vào Phòng khám cố định
              │
══════════════╪═══════════════════════════════════════════════════════════════════
[ BÁC SĨ THÚ Y - PHÒNG KHÁM LÂM SÀNG ]
      │
      ▼
   UC-22 & 23: Nhận ca & Khám lâm sàng sơ bộ (Đang khám - Giai đoạn 1)
      │
      ├─────────────────────────────────────────────┐ (Nếu cần Cận lâm sàng)
      │ (Nếu không cần Cận lâm sàng: Tiêm/Khám nhẹ) │ Ra chỉ định Xét nghiệm/Siêu âm
      │                                             ▼
      │                                    [ Chờ kết quả cận lâm sàng ] 
      │                                (Bác sĩ tạm giải phóng để khám ca khác)
      │                                             │
      │   ══════════════════════════════════════════════════════════════════════
      │   [ KỸ THUẬT VIÊN XÉT NGHIỆM (LAB_TECHNICIAN) & CĐHA (IMAGING_TECHNICIAN) ]
      │         │
      │         ▼
      │      UC-25 & 26: Tiếp nhận mẫu, Chạy xét nghiệm / Chụp CĐHA
      │                  (Nhập kết quả, đối chiếu tham chiếu loài, tải ảnh)
      │         │
      │         ▼
      │      [ Đã có kết quả ] (Hệ thống thông báo cho Bác sĩ khám chính)
      │   ══════════════════════════════════════════════════════════════════════
      │                                             │
      │ <───────────────────────────────────────────┘ (Gọi lại bệnh nhân vào phòng)
      ▼
   UC-30, 31 & 33: Hội chẩn kết quả, Chẩn đoán, Kê đơn & Chốt ca (Đang khám - Giai đoạn 2)
      │
      ▼
   [ Chờ thanh toán ]
      │
═════════════════════════════════════════════════════════════════════════════════
[ LỄ TÂN / THU NGÂN ]
      │
      ▼
   UC-34 & 35: Lập hóa đơn & Xác nhận thanh toán (Đã thanh toán)
      │
      ▼
   UC-36: Xuất thuốc theo đơn & Tự động trừ tồn kho (Đã hoàn thành)
```

---

## PHẦN I: ĐẶC TẢ CÁC USE CASE PHÂN HỆ 3 (TIẾP ĐÓN, ĐẶT LỊCH & HÀNG ĐỢI)

### 1. UC-14: Đặt lịch hẹn khám trực tuyến

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-14: Đặt lịch hẹn khám trực tuyến (Book Appointment Online)** |
| **Các yêu cầu liên quan** | BR-04, BR-05, REQ-BOOKING-01 |
| **Tác nhân chính** | Khách hàng (Chủ thú cưng) |
| **Tác nhân phụ** | Hệ thống thông báo |
| **Điều kiện tiên quyết** | 1. Khách hàng đã đăng nhập thành công vào Cổng thông tin với vai trò Chủ thú cưng.<br>2. Khách hàng đã có ít nhất một hồ sơ thú cưng được đăng ký trên hệ thống. |
| **Hậu điều kiện** | 1. Hệ thống ghi nhận thông tin lịch hẹn mới ở trạng thái "Chờ xác nhận" (PENDING).<br>2. Khung giờ được tạm giữ 1 suất sức chứa; Khách hàng nhận được mã số lịch hẹn duy nhất và thông báo chờ phòng khám tiếp nhận. |
| **Chuỗi sự kiện chính** | 1. Khách hàng nhấn vào chức năng "Đặt lịch khám mới" trên giao diện Cổng thông tin.<br>2. Giao diện hiển thị biểu mẫu đặt lịch hẹn khám bệnh.<br>3. Khách hàng chọn thú cưng từ danh sách thú cưng của mình; hệ thống hiển thị thông tin nhận diện cơ bản của thú cưng.<br>4. Khách hàng chọn ngày muốn khám bệnh (từ ngày hiện tại trở đi); hệ thống tải và hiển thị danh sách 14 khung giờ tiếp nhận trong ngày kèm trạng thái Còn chỗ / Hết chỗ (Sức chứa tối đa của mỗi khung giờ được **tính tự động theo tổng số Bác sĩ đang hoạt động** trong hệ thống).<br>5. Khách hàng chọn khung giờ mong muốn và nhập lý do khám hoặc triệu chứng ban đầu của thú cưng.<br>6. Khách hàng nhấn nút "Xác nhận đặt lịch".<br>7. Hệ thống thực hiện quy trình tiếp nhận đặt lịch trong một giao dịch an toàn:<br>&nbsp;&nbsp;&nbsp;&nbsp;7.1. Kiểm tra tính khả dụng của khung giờ đã chọn (đảm bảo số lịch đã đặt < tổng số Bác sĩ đang hoạt động).<br>&nbsp;&nbsp;&nbsp;&nbsp;7.2. Tạo mã số lịch hẹn duy nhất (ví dụ: `APT-20261010-001`).<br>&nbsp;&nbsp;&nbsp;&nbsp;7.3. Ghi nhận lịch hẹn mới ở trạng thái "Chờ xác nhận" qua kênh đặt lịch trực tuyến (`ONLINE`).<br>&nbsp;&nbsp;&nbsp;&nbsp;7.4. Tạm giữ 1 suất sức chứa trong khung giờ đã chọn.<br>&nbsp;&nbsp;&nbsp;&nbsp;7.5. Hiển thị thông báo đặt lịch thành công kèm mã số lịch hẹn và hướng dẫn khách hàng chờ phòng khám liên hệ xác nhận.<br>&nbsp;&nbsp;&nbsp;&nbsp;7.6. Nếu xảy ra lỗi trong quá trình lưu trữ, hệ thống hoàn tác toàn bộ thao tác và thông báo đặt lịch thất bại. |
| **Luồng rẽ nhánh** | **3a. Thú cưng chưa có hồ sơ trên hệ thống:** Tại Bước 3, khách hàng chọn "Thêm mới thú cưng", nhập tên, loài (Chó, Mèo), giống loài, giới tính. Hệ thống lưu hồ sơ thú cưng mới và tự động chọn thú cưng này để tiếp tục luồng đặt lịch.<br>**5a. Thay đổi ngày hoặc khung giờ:** Khách hàng có thể chọn lại ngày hoặc khung giờ khác trước khi bấm xác nhận. |
| **Ngoại lệ** | **5.1. Khung giờ đã hết chỗ tiếp nhận:** Tại Bước 5, nếu khung giờ đã đạt giới hạn tiếp nhận tối đa (số lịch đã đặt bằng tổng số Bác sĩ đang hoạt động), hệ thống làm mờ khung giờ đó và thông báo: *"Khung giờ này đã đủ lịch hẹn, vui lòng chọn khung giờ khác"*.<br>**7.1. Lỗi xử lý hệ thống khi lưu trữ:** Tại Bước 7, nếu hệ thống gặp sự cố không thể hoàn tất giao dịch, hệ thống hoàn tác thao tác, thông báo lỗi cho người dùng và giữ nguyên các thông tin khách đã nhập trên biểu mẫu để không phải nhập lại. |

---

### 2. UC-15: Quản lý lịch hẹn cá nhân

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-15: Quản lý lịch hẹn cá nhân (Manage Personal Appointments)** |
| **Các yêu cầu liên quan** | BR-04, BR-05, REQ-BOOKING-02 |
| **Tác nhân chính** | Khách hàng (Chủ thú cưng) |
| **Điều kiện tiên quyết** | Khách hàng đã đăng nhập thành công vào Cổng thông tin với vai trò Chủ thú cưng. |
| **Hậu điều kiện** | 1. Lịch hẹn được cập nhật thời gian mới (nếu đổi lịch) hoặc chuyển sang trạng thái "Đã hủy" (nếu hủy lịch).<br>2. Suất sức chứa (Slot Capacity) của khung giờ tương ứng được tự động giải phóng hoặc hoán đổi trên hệ thống. |
| **Chuỗi sự kiện chính** | 1. Khách hàng truy cập mục "Lịch hẹn của tôi" trên Cổng thông tin.<br>2. Hệ thống hiển thị danh sách các lịch hẹn đã đặt, phân loại theo trạng thái: "Chờ xác nhận", "Đã xác nhận", "Đã đến khám", "Đã hủy".<br>3. Khách hàng chọn một lịch hẹn đang ở trạng thái "Chờ xác nhận" hoặc "Đã xác nhận" cần thay đổi và nhấn nút "Đổi ngày / Khung giờ".<br>4. Hệ thống kiểm tra điều kiện thời gian: Thời điểm hiện tại phải cách giờ hẹn tối thiểu 02 tiếng.<br>5. Hệ thống hiển thị lịch chọn ngày và danh sách các khung giờ tiếp nhận còn trống trong ngày mới.<br>6. Khách hàng chọn ngày và khung giờ mới còn chỗ, nhập lý do thay đổi và bấm "Xác nhận đổi lịch".<br>7. Hệ thống thực hiện đổi lịch trong một giao dịch an toàn:<br>&nbsp;&nbsp;&nbsp;&nbsp;7.1. Kiểm tra lại sức chứa khả dụng của khung giờ mới.<br>&nbsp;&nbsp;&nbsp;&nbsp;7.2. Hoàn trả 1 suất sức chứa của khung giờ cũ.<br>&nbsp;&nbsp;&nbsp;&nbsp;7.3. Chiếm giữ 1 suất sức chứa của khung giờ mới.<br>&nbsp;&nbsp;&nbsp;&nbsp;7.4. Cập nhật ngày hẹn và khung giờ mới cho lịch hẹn, ghi nhận thời điểm đổi.<br>&nbsp;&nbsp;&nbsp;&nbsp;7.5. Hiển thị thông báo đổi lịch thành công cho khách hàng.<br>&nbsp;&nbsp;&nbsp;&nbsp;7.6. Nếu xảy ra lỗi hoặc khung giờ mới vừa hết chỗ, hệ thống hoàn tác thao tác và thông báo thất bại. |
| **Luồng rẽ nhánh** | **3a. Hủy lịch hẹn:** Tại Bước 3, khách hàng chọn "Hủy lịch hẹn". Hệ thống yêu cầu chọn lý do hủy (Bận việc đột xuất, Thú cưng đã khỏi, Đổi cơ sở khác...). Khách hàng bấm xác nhận; hệ thống cập nhật trạng thái sang "Đã hủy" (CANCELLED), hoàn trả ngay 1 suất sức chứa cho khung giờ đó và gửi thông báo hủy thành công. |
| **Ngoại lệ** | **4.1. Đổi hoặc hủy lịch sát giờ (Dưới 02 tiếng):** Tại Bước 4, nếu thời gian còn lại đến giờ hẹn dưới 2 tiếng, hệ thống chặn lại và thông báo: *"Đã quá thời gian cho phép tự đổi/hủy lịch trên hệ thống (tối thiểu 2 tiếng trước giờ hẹn). Vui lòng liên hệ trực tiếp hotline phòng khám để được hỗ trợ"*.<br>**7.1. Khung giờ mới đã hết chỗ:** Tại Bước 7.1, nếu khung giờ mới vừa bị người khác đặt kín chỗ trong cùng thời điểm, hệ thống từ chối cập nhật và yêu cầu khách chọn khung giờ khác. |

---

### 3. UC-16: Đặt lịch hẹn tại quầy / qua điện thoại

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-16: Đặt lịch hẹn tại quầy / qua điện thoại (Receptionist Appointment Booking)** |
| **Các yêu cầu liên quan** | BR-04, BR-05, BR-14, REQ-BOOKING-03 |
| **Tác nhân chính** | Lễ tân |
| **Tác nhân phụ** | Khách hàng (Người gọi điện hoặc đang tại quầy) |
| **Điều kiện tiên quyết** | Lễ tân đã đăng nhập vào hệ thống với vai trò Lễ tân. |
| **Hậu điều kiện** | Lịch hẹn mới được ghi nhận trực tiếp ở trạng thái "Đã xác nhận" (CONFIRMED) và chiếm 1 suất sức chứa của khung giờ tương ứng. |
| **Chuỗi sự kiện chính** | 1. Lễ tân tiếp nhận cuộc gọi của khách hàng đến hotline phòng khám yêu cầu đặt lịch hẹn.<br>2. Lễ tân mở màn hình "Đặt lịch hẹn tại cơ sở" trên giao diện quản trị phòng khám.<br>3. Lễ tân nhập Số điện thoại của khách hàng để tra cứu: Hệ thống hiển thị thông tin chủ nuôi và danh sách thú cưng của họ.<br>4. Lễ tân chọn thú cưng cần khám theo yêu cầu của khách.<br>5. Lễ tân hỏi ngày và khung giờ khách muốn đặt; hệ thống hiển thị trực quan các khung giờ còn chỗ trong ngày (Số lịch đã đặt < Tổng số Bác sĩ đang hoạt động).<br>6. Lễ tân chọn khung giờ khách đồng ý, nhập lý do khám / triệu chứng khách mô tả qua điện thoại và chọn kênh đặt lịch là "Qua điện thoại".<br>7. Lễ tân nhấn nút "Tạo & Xác nhận lịch hẹn".<br>8. Hệ thống thực hiện lưu lịch hẹn trong một giao dịch an toàn:<br>&nbsp;&nbsp;&nbsp;&nbsp;8.1. Kiểm tra lại sức chứa khả dụng của khung giờ đã chọn.<br>&nbsp;&nbsp;&nbsp;&nbsp;8.2. Tạo mã số lịch hẹn duy nhất.<br>&nbsp;&nbsp;&nbsp;&nbsp;8.3. Ghi nhận lịch hẹn mới ở trạng thái "Đã xác nhận" (CONFIRMED), ghi nhận nhân viên lễ tân tạo lịch và thời điểm tạo.<br>&nbsp;&nbsp;&nbsp;&nbsp;8.4. Chiếm giữ 1 suất sức chứa của khung giờ đó.<br>&nbsp;&nbsp;&nbsp;&nbsp;8.5. Hiển thị thông báo tạo lịch thành công và gửi tin nhắn/thông báo xác nhận đến số điện thoại khách hàng.<br>&nbsp;&nbsp;&nbsp;&nbsp;8.6. Nếu xảy ra lỗi, hệ thống hoàn tác toàn bộ thao tác. |
| **Luồng rẽ nhánh** | **3a. Khách hàng mới chưa có thông tin trên hệ thống:** Tại Bước 3, nếu tra cứu không thấy SĐT, Lễ tân chọn "Tạo nhanh khách hàng & Thú cưng", nhập Họ tên, SĐT, Địa chỉ, Tên thú cưng, Loài (Chó/Mèo). Hệ thống tự động cấp tài khoản và tiếp tục luồng đặt lịch.<br>**6a. Đặt lịch trực tiếp tại quầy cho lần sau:** Khách hàng đang ở phòng khám đặt trước cho buổi tái khám tuần sau, Lễ tân chọn kênh đặt là "Tại quầy". Sau khi hoàn tất ở Bước 8, hệ thống cung cấp tùy chọn in phiếu hẹn trao tay cho khách hàng. |
| **Ngoại lệ** | **5.1. Khung giờ khách yêu cầu đã kín chỗ:** Tại Bước 5, hệ thống làm mờ khung giờ đã đủ số lượng lịch hẹn theo năng lực phục vụ của các bác sĩ; Lễ tân tư vấn khách chọn các khung giờ lân cận còn trống.<br>**8.1. Lỗi hệ thống khi lưu trữ:** Tại Bước 8, nếu lưu trữ thất bại, hệ thống hoàn tác toàn bộ giao dịch và hiển thị thông báo lỗi. |

---

### 4. UC-17: Duyệt xác nhận / Từ chối lịch hẹn trực tuyến

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-17: Duyệt xác nhận / Từ chối lịch hẹn trực tuyến (Confirm & Cancel Online Appointment)** |
| **Các yêu cầu liên quan** | BR-04, BR-05, REQ-APPT-APPROVAL-01 |
| **Tác nhân chính** | Lễ tân |
| **Tác nhân phụ** | Hệ thống thông báo |
| **Điều kiện tiên quyết** | 1. Lễ tân đã đăng nhập vào hệ thống với vai trò Lễ tân.<br>2. Có ít nhất một lịch hẹn trực tuyến đang ở trạng thái "Chờ xác nhận" (PENDING). |
| **Hậu điều kiện** | 1. Lịch hẹn được chuyển sang trạng thái "Đã xác nhận" (CONFIRMED) hoặc "Đã hủy" (CANCELLED).<br>2. Khách hàng nhận được thông báo kết quả phê duyệt. Nếu từ chối, 1 suất sức chứa của khung giờ được giải phóng. |
| **Chuỗi sự kiện chính** | 1. Lễ tân mở màn hình "Quản lý duyệt lịch hẹn trực tuyến".<br>2. Hệ thống hiển thị danh sách các lịch hẹn đang ở trạng thái "Chờ xác nhận", sắp xếp theo thời gian gửi yêu cầu tăng dần.<br>3. Lễ tân chọn một yêu cầu đặt lịch để xem chi tiết: Tên chủ nuôi, SĐT, Tên thú cưng, Loài, Triệu chứng ban đầu, Ngày và Khung giờ hẹn.<br>4. Lễ tân gọi điện thoại cho khách hàng theo SĐT đăng ký để xác nhận thông tin, hỏi thêm về tình trạng bệnh và dặn dò chuyên môn (nhịn ăn nếu cần làm xét nghiệm).<br>5. Sau khi trao đổi thành công, Lễ tân nhấn nút "Xác nhận lịch hẹn".<br>6. Hệ thống thực hiện cập nhật trong một giao dịch an toàn:<br>&nbsp;&nbsp;&nbsp;&nbsp;6.1. Cập nhật trạng thái lịch hẹn từ "Chờ xác nhận" sang "Đã xác nhận" (CONFIRMED).<br>&nbsp;&nbsp;&nbsp;&nbsp;6.2. Ghi nhận thời điểm duyệt và nhân viên lễ tân thực hiện.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.3. Giữ nguyên 1 suất sức chứa chính thức trong khung giờ đó.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.4. Gửi thông báo phê duyệt thành công đến Cổng thông tin của khách hàng kèm hướng dẫn thời gian có mặt.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.5. Nếu xảy ra lỗi, hoàn tác toàn bộ thao tác. |
| **Luồng rẽ nhánh** | **5a. Từ chối / Hủy lịch hẹn:** Tại Bước 5, nếu phòng khám không thể tiếp nhận (mất điện đột xuất, bảo trì thiết bị, khách đặt sai dịch vụ) hoặc khách báo hủy qua điện thoại, Lễ tân bấm nút "Từ chối lịch hẹn". Lễ tân nhập lý do từ chối (bắt buộc). Hệ thống cập nhật trạng thái sang "Đã hủy" (CANCELLED), giải phóng ngay 1 suất sức chứa của khung giờ đó và gửi thông báo giải thích lý do cho khách hàng. |
| **Ngoại lệ** | **4.1. Không liên lạc được với khách hàng:** Tại Bước 4, nếu gọi nhiều lần khách không nghe máy, Lễ tân chọn "Ghi chú liên hệ thất bại" và giữ trạng thái "Chờ xác nhận" để liên hệ lại sau.<br>**6.1. Lỗi hệ thống khi cập nhật trạng thái:** Nếu quá trình lưu trữ gặp sự cố, hệ thống hoàn tác thao tác, giữ nguyên trạng thái "Chờ xác nhận" và thông báo lỗi. |

---

### 5. UC-18: Quản lý hồ sơ Khách hàng & Thú cưng tại quầy

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-18: Quản lý hồ sơ Khách hàng & Thú cưng tại quầy (Manage Pet Owners & Pets)** |
| **Các yêu cầu liên quan** | BR-14, BR-15, REQ-CUSTOMER-01 |
| **Tác nhân chính** | Lễ tân |
| **Điều kiện tiên quyết** | Lễ tân đã đăng nhập vào hệ thống với vai trò Lễ tân. |
| **Hậu điều kiện** | Thông tin khách hàng và hồ sơ thú cưng được khởi tạo hoặc cập nhật chính xác trên hệ thống, sẵn sàng cho việc đặt lịch hoặc tiếp nhận khám. |
| **Chuỗi sự kiện chính** | 1. Lễ tân mở màn hình "Quản lý Khách hàng & Thú cưng" tại quầy tiếp đón.<br>2. Lễ tân nhấn nút "Thêm mới Khách hàng".<br>3. Lễ tân nhập thông tin khách hàng: Họ và tên, Số điện thoại (bắt buộc duy nhất), Email, Địa chỉ liên hệ.<br>4. Nhập thông tin thú cưng đầu tiên của khách: Tên thú cưng, Loài (chọn Chó hoặc Mèo), Giống loài, Giới tính, Ngày sinh / Tuổi ước tính, Màu lông, Tình trạng triệt sản, Đặc điểm nhận dạng ban đầu.<br>5. Lễ tân nhấn nút "Lưu hồ sơ".<br>6. Hệ thống thực hiện tạo hồ sơ trong một giao dịch an toàn:<br>&nbsp;&nbsp;&nbsp;&nbsp;6.1. Kiểm tra tính hợp lệ của dữ liệu (SĐT đúng 10 số, không bị trùng lặp trong hệ thống).<br>&nbsp;&nbsp;&nbsp;&nbsp;6.2. Tạo tài khoản người dùng cho khách hàng với vai trò "Chủ thú cưng", mật khẩu khởi tạo mặc định.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.3. Khởi tạo mã thú cưng duy nhất (ví dụ: `PET-202610-008`).<br>&nbsp;&nbsp;&nbsp;&nbsp;6.4. Lưu hồ sơ thú cưng và liên kết với tài khoản chủ nuôi vừa tạo.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.5. Hiển thị thông báo lưu thành công và hiển thị hồ sơ chi tiết.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.6. Nếu xảy ra lỗi, hoàn tác toàn bộ thao tác. |
| **Luồng rẽ nhánh** | **1a. Tra cứu và cập nhật thông tin:** Tại Bước 1, Lễ tân nhập SĐT hoặc Tên khách hàng để tìm kiếm. Hệ thống hiển thị danh sách thú cưng của khách. Lễ tân có thể chọn cập nhật thông tin liên hệ của chủ nuôi, chỉnh sửa thông tin thú cưng hoặc bấm "Thêm thú cưng mới" cho chủ nuôi đã có sẵn trên hệ thống. |
| **Ngoại lệ** | **6.1. Số điện thoại đã tồn tại trên hệ thống:** Tại Bước 6.1, nếu SĐT trùng với khách hàng khác, hệ thống cảnh báo: *"Số điện thoại này đã được đăng ký cho khách hàng [Tên khách hàng cũ]. Vui lòng kiểm tra lại hoặc tra cứu hồ sơ cũ"*.<br>**6.2. Lỗi giao dịch hệ thống:** Nếu lỗi kết nối khi lưu đồng thời khách và thú cưng, hệ thống rollback toàn bộ và thông báo thất bại. |

---

### 6. UC-19: Tiếp nhận thú cưng tại quầy

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-19: Tiếp nhận thú cưng tại quầy (Check-in Appointment & Walk-in)** |
| **Các yêu cầu liên quan** | BR-06, BR-09, BR-14, REQ-CHECKIN-01 |
| **Tác nhân chính** | Lễ tân |
| **Điều kiện tiên quyết** | 1. Lễ tân đã đăng nhập vào hệ thống với vai trò Lễ tân.<br>2. Khách hàng và thú cưng đã có mặt trực tiếp tại quầy tiếp đón của phòng khám. |
| **Hậu điều kiện** | 1. Đợt khám mới được tạo ở trạng thái "Chờ khám" (WAITING) và xuất hiện trong Hàng đợi khám bệnh chung.<br>2. Lịch hẹn tương ứng (nếu có) được chuyển sang trạng thái "Đã đến khám" (CHECKED_IN) và liên kết chặt chẽ với đợt khám vừa tạo. |
| **Chuỗi sự kiện chính** | 1. Lễ tân mở màn hình "Tiếp nhận bệnh nhân" tại quầy tiếp đón. Hệ thống hiển thị danh sách các lịch hẹn đã được xác nhận trong ngày.<br>2. Lễ tân tra cứu lịch hẹn theo Số điện thoại khách hàng hoặc Mã lịch hẹn. Hệ thống trả về thông tin khách hàng, thú cưng và khung giờ hẹn.<br>3. Lễ tân nhấn chọn "Tiếp nhận / Check-in" trên dòng lịch hẹn tương ứng. Hệ thống hiển thị biểu mẫu tiếp nhận đợt khám mới.<br>4. Lễ tân quan sát, đánh giá nhanh tri giác và dấu hiệu nguy kịch của thú cưng (nếu co giật, khó thở dữ dội, tai nạn thì đánh dấu cờ `is_emergency`). Việc đo thân nhiệt, cân nặng sẽ do Bác sĩ thực hiện trực tiếp trong phòng khám.<br>5. Lễ tân xác nhận lý do đến khám / triệu chứng ban đầu với chủ nuôi và bổ sung các ghi chú sơ bộ.<br>6. Lễ tân nhấn nút "Hoàn tất tiếp đón".<br>7. Hệ thống thực hiện quy trình tiếp nhận trong một giao dịch an toàn:<br>&nbsp;&nbsp;&nbsp;&nbsp;7.1. Tạo mã số đợt khám duy nhất.<br>&nbsp;&nbsp;&nbsp;&nbsp;7.2. Ghi nhận đợt khám mới ở trạng thái "Chờ khám" cùng thời điểm tiếp nhận và cờ cấp cứu (nếu có).<br>&nbsp;&nbsp;&nbsp;&nbsp;7.3. Cập nhật trạng thái lịch hẹn tương ứng thành "Đã đến khám" và liên kết với đợt khám vừa tạo.<br>&nbsp;&nbsp;&nbsp;&nbsp;7.4. Đưa đợt khám vào danh sách hàng đợi khám chung của phòng khám.<br>&nbsp;&nbsp;&nbsp;&nbsp;7.5. Nếu xảy ra lỗi trong quá trình xử lý, hệ thống hoàn tác toàn bộ thao tác và thông báo tiếp nhận thất bại. |
| **Luồng rẽ nhánh** | **2a. Khách hàng đến trực tiếp không đặt trước (Khách vãng lai):**<br>1. Tại Bước 2, Lễ tân chọn chức năng "Tiếp nhận khách vãng lai".<br>2. Lễ tân tra cứu Số điện thoại khách hàng: Nếu khách cũ, hệ thống tải thông tin; Nếu khách mới, tạo hồ sơ qua UC-18.<br>3. Lễ tân nhập lý do đến khám / triệu chứng ban đầu, đánh dấu cờ cấp cứu nếu cần và bấm lưu.<br>4. Hệ thống tạo đợt khám mới với liên kết lịch hẹn để trống (`appointment_id = NULL`), đặt trạng thái "Chờ khám" và đưa vào hàng đợi chung. |
| **Ngoại lệ** | **4.1. Thông tin khách hàng không hợp lệ:** Tại Bước 2 hoặc Bước 2a, nếu số điện thoại không đúng định dạng hoặc thiếu thông tin bắt buộc, hệ thống cảnh báo và yêu cầu chỉnh sửa lại.<br>**7.1. Lỗi hệ thống khi khởi tạo đợt khám:** Tại Bước 7, nếu quá trình ghi nhận đợt khám thất bại, hệ thống hoàn tác toàn bộ thao tác, giữ nguyên trạng thái lịch hẹn cũ và hiển thị thông báo lỗi. |

---

### 7. UC-20: Giám sát & Điều phối hàng đợi khám bệnh

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-20: Giám sát & Điều phối hàng đợi khám bệnh (Queue Monitoring & Priority Handling)** |
| **Các yêu cầu liên quan** | BR-09, BR-10, BR-11, BR-12, BR-13, REQ-QUEUE-01 |
| **Tác nhân chính** | Lễ tân |
| **Điều kiện tiên quyết** | Lễ tân đã đăng nhập vào hệ thống với vai trò Lễ tân. |
| **Hậu điều kiện** | Thứ tự các ca khám trong hàng đợi được hiển thị chính xác theo mức độ ưu tiên nghiệp vụ, sẵn sàng cho việc phân công Bác sĩ vào phòng khám cố định. |
| **Chuỗi sự kiện chính** | 1. Lễ tân mở màn hình "Bảng điều phối hàng đợi khám bệnh tập trung".<br>2. Hệ thống tải và hiển thị danh sách các Đợt khám đang ở trạng thái "Chờ khám" (WAITING), tự động sắp xếp theo thứ tự ưu tiên nghiệp vụ:<br>&nbsp;&nbsp;&nbsp;&nbsp;- Nhóm 1 (Đầu hàng đợi): Các ca được gắn cờ "Cấp cứu khẩn cấp".<br>&nbsp;&nbsp;&nbsp;&nbsp;- Nhóm 2: Các ca có lịch hẹn đến đúng khung giờ tiếp nhận, sắp xếp theo thời gian check-in tăng dần.<br>&nbsp;&nbsp;&nbsp;&nbsp;- Nhóm 3: Các ca vãng lai và các ca có lịch hẹn nhưng đến trễ quá khung giờ, sắp xếp theo thời gian check-in tăng dần.<br>3. Hệ thống hiển thị song song bảng trạng thái phòng khám của các Bác sĩ: Số phòng cố định, Tên Bác sĩ, Trạng thái hiện tại ("Sẵn sàng - AVAILABLE", "Sẵn sàng (Ưu tiên ca có kết quả) - AVAILABLE_PRIORITY_CALLBACK" hoặc "Đang bận khám - BUSY").<br>4. Lễ tân theo dõi thời gian chờ đợi của từng thú cưng; thông báo mời bệnh nhân chuẩn bị khi sắp đến lượt trên màn hình chờ.<br>5. Khi có Bác sĩ ở trạng thái "Sẵn sàng" thuần túy (`AVAILABLE`), Lễ tân chọn ca khám ưu tiên cao nhất tiếp theo để thực hiện quy trình phân công bác sĩ (UC-21). Đối với Bác sĩ ở trạng thái "Sẵn sàng (Ưu tiên ca có kết quả)", hệ thống tạm khóa nút phân công để Bác sĩ gọi ca tái khám vào phòng trước. |
| **Luồng rẽ nhánh** | **2a. Tiếp nhận ca cấp cứu phát sinh đột xuất:** Khi có thú cưng nguy kịch vừa được tiếp nhận tại quầy (UC-19), hệ thống tự động đẩy ca này lên vị trí đầu tiên của hàng đợi kèm cảnh báo nhấp nháy đỏ trên màn hình điều phối để Lễ tân ưu tiên phân phòng ngay lập tức.<br>**4a. Bệnh nhân xin ra ngoài / Tạm hoãn lượt khám:** Nếu chủ nuôi có việc đột xuất cần ra ngoài 15 phút, Lễ tân chọn ca khám và bấm "Tạm hoãn". Hệ thống giữ ca khám ở cuối hàng đợi chờ kích hoạt lại. |
| **Ngoại lệ** | **2.1. Hàng đợi trống (Không có bệnh nhân chờ):** Hệ thống hiển thị thông báo: *"Hiện không có bệnh nhân nào trong hàng đợi"* và tự động làm mới khi có ca check-in mới.<br>**5.1. Tất cả các phòng khám đều đang bận:** Hệ thống hiển thị thời gian ước tính ca khám hiện tại của từng phòng để Lễ tân giải thích và hướng dẫn khách hàng tiếp tục chờ đợi trong phòng chờ.<br>**5.2. Bác sĩ đang có ca chờ đọc kết quả (Khóa ưu tiên):** Nếu Lễ tân cố tình chọn Bác sĩ đang có ca `RESULTS_READY`, hệ thống cảnh báo: *"Bác sĩ đang ưu tiên đón ca tái khám có kết quả xét nghiệm. Vui lòng chọn Bác sĩ khác hoặc chờ Bác sĩ tiếp nhận xong ca tái khám."* |

---

### 8. UC-21: Điều phối & Phân công Bác sĩ phụ trách ca khám

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-21: Điều phối & Phân công Bác sĩ phụ trách ca khám (Assign Doctor to Visit)** |
| **Các yêu cầu liên quan** | BR-10, BR-11, BR-12, BR-13, REQ-DISPATCH-01 |
| **Tác nhân chính** | Lễ tân |
| **Điều kiện tiên quyết** | 1. Đợt khám đang ở trạng thái "Chờ khám" trong hàng đợi chung.<br>2. Có ít nhất một Bác sĩ đang ở trạng thái "Sẵn sàng" thuần túy (`AVAILABLE` - không có ca đang khám dở và không có ca nào đang chờ đọc kết quả `RESULTS_READY`). |
| **Hậu điều kiện** | 1. Đợt khám được gán Bác sĩ phụ trách chính và số phòng khám cố định của bác sĩ.<br>2. Màn hình làm việc của Bác sĩ được chỉ định nhận được thông báo có bệnh nhân mới được phân công vào phòng. |
| **Chuỗi sự kiện chính** | 1. Lễ tân mở màn hình "Điều phối hàng đợi khám bệnh". Hệ thống hiển thị song song danh sách bệnh nhân đang chờ khám (sắp xếp theo thời gian tiếp nhận tăng dần) và danh sách Bác sĩ kèm Số phòng cố định và Trạng thái hiện tại ("Sẵn sàng" hoặc "Đang bận").<br>2. Lễ tân chọn một ca khám từ hàng đợi (ưu tiên ca tiếp nhận trước hoặc ca cấp cứu).<br>3. Lễ tân nhấn nút "Phân công Bác sĩ". Hệ thống hiển thị danh sách các Bác sĩ đang ở trạng thái "Sẵn sàng".<br>4. Lễ tân chọn Bác sĩ mong muốn (ví dụ: Bác sĩ Nguyễn Văn A - Phòng khám 101).<br>5. Lễ tân nhấn nút "Xác nhận phân công".<br>6. Hệ thống thực hiện quy trình phân công trong một giao dịch an toàn:<br>&nbsp;&nbsp;&nbsp;&nbsp;6.1. Kiểm tra lại trạng thái sẵn sàng của Bác sĩ được chọn.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.2. Gán Bác sĩ phụ trách chính và số phòng khám cố định của bác sĩ vào đợt khám.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.3. Gửi thông báo tức thời đến màn hình làm việc của Bác sĩ được chỉ định.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.4. In phiếu số thứ tự phòng khám và hướng dẫn chủ nuôi đưa thú cưng vào đúng phòng.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.5. Nếu Bác sĩ không còn khả dụng, hệ thống hoàn tác toàn bộ thao tác và thông báo cho Lễ tân. |
| **Luồng rẽ nhánh** | **2a. Tiếp nhận ca cấp cứu khẩn cấp:** Tại Bước 2, nếu xuất hiện ca bệnh nguy kịch, Lễ tân chọn ca này ưu tiên phân công ngay cho Bác sĩ sẵn sàng gần nhất mà không cần đợi theo thứ tự thời gian tiếp nhận thông thường.<br>**5a. Thay đổi Bác sĩ khi chưa bắt đầu khám:** Nếu Bác sĩ đã phân công gặp sự cố đột xuất và chưa bắt đầu khám ca bệnh, Lễ tân có thể chọn lại ca khám và chuyển sang một Bác sĩ khác đang ở trạng thái "Sẵn sàng". |
| **Ngoại lệ** | **6.1. Bác sĩ vừa nhận ca khám khác (Xung đột thời gian thực):** Tại Bước 6, nếu bác sĩ vừa được phân công ca khác trong cùng thời điểm và đã chuyển sang trạng thái "Đang bận", hệ thống từ chối phân công và thông báo: *"Bác sĩ đã nhận ca khám khác, vui lòng chọn bác sĩ khác đang sẵn sàng"*.<br>**6.2. Tất cả Bác sĩ đều đang bận:** Nếu toàn bộ bác sĩ đều ở trạng thái "Đang bận", nút phân công bị tạm khóa cho đến khi có bác sĩ hoàn thành ca khám.<br>**6.3. Bác sĩ đang có ca chờ đọc kết quả (Khóa ưu tiên):** Nếu Bác sĩ vừa hoàn tất ca khám nhưng có bệnh nhân trong danh sách chờ kết quả (`RESULTS_READY`), hệ thống từ chối phân công ca mới từ sảnh và thông báo: *"Bác sĩ đang có ca chờ đọc kết quả xét nghiệm, vui lòng chọn Bác sĩ khác."* |

---

## PHẦN II: ĐẶC TẢ CÁC USE CASE KHÁM CHỮA BỆNH, CẬN LÂM SÀNG, VIỆN PHÍ & DƯỢC

### 9. UC-22 & UC-23: Khám lâm sàng sơ bộ & Chỉ định dịch vụ (Giai đoạn 1)

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-22_23: Khám lâm sàng sơ bộ & Chỉ định dịch vụ - Giai đoạn 1 (Clinical Assessment & Service Ordering)** |
| **Các yêu cầu liên quan** | BR-15, BR-20, BR-25, REQ-CLINIC-01 |
| **Tác nhân chính** | Bác sĩ thú y (Bác sĩ khám chính) |
| **Điều kiện tiên quyết** | 1. Bác sĩ đã đăng nhập vào hệ thống với vai trò Bác sĩ thú y.<br>2. Ca khám đã được Lễ tân phân công cho Bác sĩ này và bệnh nhân đang chờ trước phòng khám. |
| **Hậu điều kiện** | 1. Thời điểm bắt đầu khám được ghi nhận; thông tin thăm khám lâm sàng ban đầu được lưu trữ.<br>2. **Nếu có chỉ định Cận lâm sàng:** Đợt khám chuyển sang trạng thái "Chờ kết quả cận lâm sàng"; Bác sĩ được giải phóng sang trạng thái "Sẵn sàng" để tiếp nhận ca tiếp theo; Phiếu chỉ định được đẩy sang hàng đợi phòng cận lâm sàng.<br>3. **Nếu không cần Cận lâm sàng:** Đợt khám giữ trạng thái "Đang khám" để tiếp tục xử lý và chốt đợt khám ngay trong một lần khám duy nhất. |
| **Chuỗi sự kiện chính** | 1. Bác sĩ mở màn hình danh sách ca khám tại phòng khám của mình. Hệ thống hiển thị thông tin ca khám vừa được lễ tân phân công vào phòng.<br>2. Bác sĩ nhấn nút "Bắt đầu khám" khi bệnh nhân bước vào phòng. Hệ thống cập nhật trạng thái đợt khám thành "Đang khám", ghi nhận thời điểm bắt đầu khám, chuyển trạng thái bác sĩ sang "Đang bận" và mở giao diện Bệnh án điện tử.<br>3. Bác sĩ mở mục "Lịch sử bệnh án" để tra cứu tiền sử bệnh, dị ứng, các đợt tiêm phòng và đơn thuốc cũ của thú cưng.<br>4. Bác sĩ tiến hành thăm khám thực thể: Trực tiếp đặt thú cưng lên bàn cân và đo nhiệt độ trực tràng (ghi nhận cân nặng `weight_at_visit` và thân nhiệt `temperature` vào bệnh án), sau đó nghe tim phổi, kiểm tra niêm mạc, hạch bạch huyết và các triệu chứng thực thể.<br>5. Bác sĩ nhập thông tin ghi chú khám lâm sàng và nhận định chẩn đoán sơ bộ ban đầu.<br>6. Bác sĩ nghi ngờ bệnh lý, chuyển sang mục "Chỉ định dịch vụ" và chọn các dịch vụ kỹ thuật cần làm (ví dụ: Xét nghiệm máu tổng quát, Siêu âm ổ bụng). Hệ thống lấy đơn giá niêm yết hiện tại để lưu giữ cố định và tự động tính thành tiền cho từng dịch vụ.<br>7. Bác sĩ nhấn nút "Xác nhận chỉ định & Chuyển phòng Cận lâm sàng".<br>8. Hệ thống thực hiện lưu chỉ định trong một giao dịch an toàn:<br>&nbsp;&nbsp;&nbsp;&nbsp;8.1. Lưu danh sách các dịch vụ kỹ thuật được chỉ định vào đợt khám.<br>&nbsp;&nbsp;&nbsp;&nbsp;8.2. Cập nhật trạng thái đợt khám thành "Chờ kết quả cận lâm sàng".<br>&nbsp;&nbsp;&nbsp;&nbsp;8.3. Giải phóng trạng thái Bác sĩ về "Sẵn sàng" để có thể nhận ca tiếp theo trong hàng đợi.<br>&nbsp;&nbsp;&nbsp;&nbsp;8.4. Đẩy phiếu chỉ định sang hàng đợi thực hiện của Phòng Xét nghiệm và Chẩn đoán hình ảnh.<br>&nbsp;&nbsp;&nbsp;&nbsp;8.5. Thông báo hướng dẫn chủ nuôi đưa thú cưng ra khu vực lấy mẫu / chụp chiếu.<br>&nbsp;&nbsp;&nbsp;&nbsp;8.6. Nếu xảy ra lỗi hệ thống, toàn bộ thao tác được hoàn tác và giữ nguyên trạng thái ca khám. |
| **Luồng rẽ nhánh** | **6a. Ca khám thông thường, tiêm phòng hoặc tẩy giun (Không cần cận lâm sàng):** Tại Bước 6, Bác sĩ không chỉ định cận lâm sàng mà thực hiện tiêm phòng, tẩy giun hoặc khám thông thường ngay tại phòng. Bác sĩ tiếp tục thực hiện ca sử dụng UC-30_31_33 để kê đơn thuốc, và chốt đợt khám ngay trong buổi khám. |
| **Ngoại lệ** | **2.1. Bệnh nhân không vào phòng hoặc bỏ về trước khi khám:** Nếu đã gọi nhiều lần mà bệnh nhân không có mặt, Bác sĩ chọn *"Báo vắng mặt / Chuyển trả lễ tân"*. Lễ tân sẽ liên hệ khách hàng hoặc thực hiện hủy đợt khám.<br>**8.1. Lỗi hệ thống khi chuyển phiếu chỉ định:** Tại Bước 8, nếu không thể đẩy phiếu chỉ định sang phòng cận lâm sàng, hệ thống hoàn tác toàn bộ giao dịch, giữ nguyên trạng thái "Đang khám" và hiển thị thông báo lỗi. |

---

### 10. UC-25 & UC-26: Tiếp nhận mẫu, Thực hiện Cận lâm sàng & Trả kết quả

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-25_26: Tiếp nhận mẫu, Thực hiện Cận lâm sàng & Trả kết quả (Process Lab & Imaging Services)** |
| **Các yêu cầu liên quan** | BR-21, BR-23, BR-24, REQ-PARACLINIC-01 |
| **Tác nhân chính** | Kỹ thuật viên Xét nghiệm (`LAB_TECHNICIAN`) / Kỹ thuật viên Chẩn đoán hình ảnh (`IMAGING_TECHNICIAN`) |
| **Điều kiện tiên quyết** | 1. Đợt khám đang ở trạng thái "Chờ kết quả cận lâm sàng".<br>2. Nhân sự phòng Cận lâm sàng tương ứng đã đăng nhập vào hệ thống với vai trò `LAB_TECHNICIAN` (đối với phòng Xét nghiệm) hoặc `IMAGING_TECHNICIAN` (đối với phòng Chẩn đoán hình ảnh). |
| **Hậu điều kiện** | 1. Kết quả xét nghiệm và/hoặc chẩn đoán hình ảnh được ghi nhận đầy đủ, chính xác kèm tệp ảnh và khoảng tham chiếu theo loài.<br>2. Trạng thái đợt khám tự động chuyển thành "Đã có kết quả".<br>3. Bác sĩ khám chính nhận được thông báo kết quả đã sẵn sàng để ưu tiên gọi lại bệnh nhân vào phòng khám. |
| **Chuỗi sự kiện chính** | 1. Nhân viên mở màn hình "Hàng đợi chỉ định Cận lâm sàng" của phòng chuyên môn tương ứng (Hàng đợi Xét nghiệm hoặc Hàng đợi Chẩn đoán hình ảnh). Hệ thống tự động sắp xếp danh sách chờ ở trạng thái `PENDING`: Ca cấp cứu (`is_emergency = TRUE`) được ưu tiên đưa lên đầu kèm viền đỏ cảnh báo; tiếp theo là các ca thông thường theo thứ tự thời gian Bác sĩ gửi chỉ định (FIFO).<br>2. Nhân viên bấm nút "Mời vào phòng" (hệ thống hiển thị thông báo gọi số trên màn hình sảnh và gửi thông báo điện thoại). Dịch vụ vẫn ở trạng thái `PENDING`. Khi thú cưng bước vào phòng, nhân viên bấm nút "Bắt đầu thực hiện", hệ thống cập nhật trạng thái dòng chỉ định dịch vụ kỹ thuật sang *Đang thực hiện* (`visit_service_details.status = 'IN_PROGRESS'`).<br>3. Nhân viên thực hiện thao tác chuyên môn: Kỹ thuật viên Lab lấy ven máu và nạp mẫu vào máy phân tích huyết học tự động; hoặc Bác sĩ CĐHA quét siêu âm/chụp X-quang.<br>4. Nhân viên mở biểu mẫu nhập kết quả trên hệ thống:<br>&nbsp;&nbsp;&nbsp;&nbsp;4.1. Đối với xét nghiệm: Khi máy in kết quả, nhập các chỉ số đo đạc (WBC, RBC...). Hệ thống tự động lấy khoảng tham chiếu chuẩn của loài tương ứng (Chó/Mèo) để đối chiếu và đánh giá: Thấp (vàng), Bình thường (xanh), Cao (đỏ).<br>&nbsp;&nbsp;&nbsp;&nbsp;4.2. Đối với chẩn đoán hình ảnh: Nhập mô tả giải phẫu, kết luận hình thái học và tải các tệp hình ảnh thực tế lên hệ thống.<br>5. Nhân viên nhập nhận xét chuyên môn và nhấn "Lưu & Xác nhận kết quả".<br>6. Hệ thống thực hiện cập nhật kết quả trong một giao dịch an toàn:<br>&nbsp;&nbsp;&nbsp;&nbsp;6.1. Lưu trữ kết quả đo đạc vào `lab_test_results` hoặc kết quả hình ảnh vào `imaging_results`, `imaging_attachments`.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.2. Cập nhật trạng thái dòng chỉ định dịch vụ kỹ thuật này sang *Đã hoàn thành* (`visit_service_details.status = 'COMPLETED'`).<br>&nbsp;&nbsp;&nbsp;&nbsp;6.3. Kiểm tra: Nếu tất cả dịch vụ cận lâm sàng được chỉ định trong đợt khám này đều đã kết thúc (`COMPLETED` hoặc `CANCELLED`) thì tự động chuyển trạng thái đợt khám thành "Đã có kết quả" (`pet_visits.status = 'RESULTS_READY'`), tự động đưa ca khám vào Hàng đợi tái khám ưu tiên của Bác sĩ khám chính, hiển thị huy hiệu thông báo nhẹ (Notification Badge) lên màn hình Bác sĩ và gửi thông báo hướng dẫn chủ nuôi tiếp tục ngồi chờ tại sảnh phòng khám.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.4. Nhân viên hoàn tất ca và mời ca tiếp theo trong hàng đợi của phòng mình. Nếu xảy ra sự cố lưu trữ, hệ thống hoàn tác toàn bộ thao tác và thông báo lỗi. |
| **Luồng rẽ nhánh** | **2a. Khách hàng chưa vào phòng ngay & Cơ chế Quản lý ca vắng mặt (Missed Turn):**<br>1. Tại Bước 2, nếu hệ thống đã thông báo gọi 3 lần nhưng chủ nuôi chưa đưa thú cưng vào, nhân viên bấm nút *"Báo vắng mặt / Gọi ca tiếp"*. Hệ thống **giữ nguyên trạng thái dịch vụ là `PENDING`** (chưa thực hiện, không tốn vật tư), rút ca khỏi hàng đợi chính đưa vào tab "Ca tạm hoãn do vắng mặt", gọi ca kế tiếp ngay trên màn hình để không làm chậm trễ các bệnh nhân sau, và gửi thông báo hướng dẫn đến ứng dụng của chủ nuôi.<br>2. Khi khách hàng quay lại: Khách báo Lễ tân hoặc nhấn nút "Tôi đã có mặt" trên ứng dụng di động. Ca tạm hoãn đổi màu xanh nhấp nháy và tự động được ghim vào vị trí "Ưu tiên kế tiếp" (Next In Line - gọi ngay sau ca đang làm dở). Nhân viên bấm nút *"Gọi lại vào phòng"* (Recall), khi thú cưng bước vào phòng mới bấm *"Bắt đầu thực hiện"* để chuyển sang `IN_PROGRESS` và tiến hành bình thường.<br>**4a. Thực hiện dịch vụ Chẩn đoán hình ảnh (Siêu âm hoặc Chụp X-quang):** Thú cưng được đưa vào phòng CĐHA. Bác sĩ chẩn đoán hình ảnh bấm "Bắt đầu chụp/siêu âm" (`IN_PROGRESS`), thực hiện quét/chụp phim, nhập kết quả mô tả, tải tệp ảnh lên và bấm "Lưu & Xác nhận kết quả" (`COMPLETED`).<br>**4b. Điều phối ca khám có chỉ định đồng thời tại cả 2 phòng (Quy trình song song & Huy hiệu liên phòng):**<br>1. Đối với ca khám được chỉ định đồng thời cả Xét nghiệm máu và Siêu âm/X-quang, ca xuất hiện đồng thời trên cả 2 hàng đợi. Hệ thống hướng dẫn chủ nuôi đưa thú cưng vào Phòng Xét nghiệm lấy mẫu máu trước (2–3 phút). Trong lúc máy phân tích huyết học tự động chạy phân tích (15–20 phút), thú cưng được đưa sang phòng CĐHA để thực hiện Siêu âm hoặc Chụp X-quang (10–15 phút), giúp hai quy trình diễn ra song song.<br>2. Trên màn hình CĐHA hiển thị huy hiệu trạng thái liên phòng: `[Đang lấy máu bên phòng Lab]` hoặc `[Đã lấy máu, sẵn sàng chụp]`. Nếu phòng CĐHA đến lượt gọi mà thú cưng chưa sang (đang lấy máu), Bác sĩ CĐHA bấm *"Tạm hoãn / Gọi ca tiếp"*, dịch vụ CĐHA giữ `PENDING` và gọi ca khác ngay để không làm treo phòng máy; khi thú cưng sang bấm Recall.<br>**4c. Khách hàng xin hủy 1 trong 2 dịch vụ giữa chừng:** Tại Bước 3 hoặc Bước 4, nếu chủ nuôi xin hủy không siêu âm nữa sau khi đã làm xét nghiệm máu, Bác sĩ CĐHA chọn thao tác *"Hủy dịch vụ"* kèm lý do $\rightarrow$ Dịch vụ Siêu âm chuyển sang `CANCELLED`. Hệ thống kiểm tra tất cả dịch vụ còn lại đều đã đạt `COMPLETED` $\rightarrow$ Tự động chuyển ca sang `RESULTS_READY` để Bác sĩ khám chính hội chẩn với kết quả xét nghiệm máu đã làm. Hóa đơn viện phí chỉ tính tiền dịch vụ xét nghiệm máu thực tế. |
| **Ngoại lệ** | **4.1. Lỗi tải tệp ảnh chẩn đoán hình ảnh:** Tại Luồng 4a, nếu tệp tải lên vượt quá dung lượng cho phép hoặc sai định dạng ảnh, hệ thống thông báo lỗi cụ thể và yêu cầu chọn lại tệp hợp lệ. |

---

### 11. UC-30, UC-31 & UC-33: Hội chẩn kết quả, Kê đơn & Chốt đợt khám (Giai đoạn 2)

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-30_31_33: Hội chẩn kết quả, Chẩn đoán xác định, Kê đơn & Chốt đợt khám (Final Clinical Diagnosis & Visit Closing)** |
| **Các yêu cầu liên quan** | BR-18, BR-26, BR-27, BR-30, REQ-PRESCRIPTION-01 |
| **Tác nhân chính** | Bác sĩ thú y (Bác sĩ khám chính) |
| **Điều kiện tiên quyết** | 1. Đợt khám đang ở trạng thái "Đã có kết quả" (hoặc đang ở trạng thái "Đang khám" nếu là ca bệnh nhẹ không qua cận lâm sàng).<br>2. Bác sĩ khám chính đang làm việc tại phòng khám cố định của mình. |
| **Hậu điều kiện** | 1. Đợt khám được cập nhật chẩn đoán xác định, phác đồ điều trị và lời dặn dò chủ nuôi.<br>2. Đơn thuốc điện tử được ghi nhận với đơn giá bán cố định tại thời điểm kê đơn.<br>3. Đợt khám chuyển sang trạng thái "Chờ thanh toán" và ghi nhận thời điểm hoàn tất khám.<br>4. Bác sĩ được giải phóng sang trạng thái "Sẵn sàng" để tiếp nhận bệnh nhân tiếp theo.<br>5. Toàn bộ hồ sơ bệnh án chuyên môn bị khóa, không được tự ý sửa đổi. |
| **Chuỗi sự kiện chính** | 1. Bác sĩ kết thúc ca khám hiện tại. Hệ thống kiểm tra phát hiện có ca bệnh đang ở trạng thái "Đã có kết quả" (`RESULTS_READY`), tự động kích hoạt Khóa ưu tiên (Priority Lock) với Lễ tân và hiển thị hộp thoại nổi bật ca tái khám tiếp theo kèm nút "Mời bệnh nhân vào phòng".<br>2. Bác sĩ nhấn nút "Mời bệnh nhân vào phòng". Hệ thống tự động hiển thị thông báo nổi bật trên màn hình Bác sĩ và gửi thông báo đến ứng dụng của chủ nuôi: *"Mời thú cưng [Tên Pet] vào lại phòng khám [Số phòng] gặp Bác sĩ"*; cập nhật trạng thái đợt khám thành "Đang khám", chuyển trạng thái bác sĩ sang "Đang bận" và mở giao diện tổng hợp toàn bộ kết quả bệnh án.<br>3. Bác sĩ phân tích kết quả: Xem bảng các chỉ số máu (chú ý các chỉ số cảnh báo Cao hoặc Thấp), xem hình ảnh siêu âm/X-quang và kết luận hình thái học.<br>4. Bác sĩ tổng hợp với triệu chứng lâm sàng đã thăm khám ở Giai đoạn 1; nhập Chẩn đoán xác định, Phác đồ điều trị và Lời dặn dò cho chủ nuôi.<br>5. Bác sĩ chuyển sang mục "Kê đơn thuốc" và nhấn "Thêm thuốc vào đơn". Hệ thống hiển thị danh mục thuốc trong kho kèm thông tin hoạt chất, đơn vị tính, giá bán và số lượng tồn kho khả dụng hiện tại.<br>6. Bác sĩ tìm kiếm và chọn thuốc cần kê (ví dụ: *Clavamox 250mg*). Nhập số lượng kê, liều dùng, tần suất và số ngày sử dụng. Hệ thống kiểm tra số lượng yêu cầu so với tồn kho khả dụng, ghi nhận đơn giá bán hiện tại làm đơn giá cố định và tự động tính thành tiền.<br>7. Bác sĩ lặp lại Bước 6 cho các loại thuốc khác nếu có, sau đó nhấn nút "Lưu đơn thuốc".<br>8. Bác sĩ giải thích tình trạng bệnh cho chủ nuôi, hướng dẫn dùng thuốc và nhấn nút "Chốt đợt khám / Chuyển thanh toán". Hệ thống hiển thị hộp thoại xác nhận: *"Bạn có chắc chắn muốn chốt chuyên môn và chuyển đợt khám sang thanh toán? Sau khi chốt, hồ sơ bệnh án sẽ bị khóa chỉnh sửa."*<br>9. Bác sĩ nhấn "Xác nhận chốt".<br>10. Hệ thống thực hiện chốt đợt khám trong một giao dịch an toàn:<br>&nbsp;&nbsp;&nbsp;&nbsp;10.1. Lưu trữ kết luận chẩn đoán xác định, phác đồ điều trị và dặn dò.<br>&nbsp;&nbsp;&nbsp;&nbsp;10.2. Lưu đơn thuốc điện tử với đơn giá bán cố định tại thời điểm kê đơn.<br>&nbsp;&nbsp;&nbsp;&nbsp;10.3. Cập nhật trạng thái đợt khám thành "Chờ thanh toán" và ghi nhận thời điểm hoàn tất khám.<br>&nbsp;&nbsp;&nbsp;&nbsp;10.4. Giải phóng trạng thái Bác sĩ về "Sẵn sàng".<br>&nbsp;&nbsp;&nbsp;&nbsp;10.5. Khóa quyền chỉnh sửa chuyên môn của đợt khám.<br>&nbsp;&nbsp;&nbsp;&nbsp;10.6. Chuyển thông tin đợt khám sang danh sách chờ thanh toán của bộ phận Thu ngân.<br>&nbsp;&nbsp;&nbsp;&nbsp;10.7. Nếu xảy ra lỗi trong quá trình xử lý, hệ thống hoàn tác toàn bộ thao tác để đảm bảo tính nhất quán dữ liệu. |
| **Luồng rẽ nhánh** | **2a. Khách hàng chưa vào phòng ngay & Kích hoạt lại sau khi tạm hoãn:**<br>1. Tại Bước 2, nếu hệ thống đã thông báo 2-3 lần nhưng chủ nuôi chưa đưa thú cưng vào phòng, Bác sĩ bấm nút *"Tạm hoãn / Gọi ca tiếp"*. Hệ thống giữ ca khám ở trạng thái `RESULTS_READY` nhưng đưa vào tab "Ca chờ tái khám / Đã hoãn" của Bác sĩ đó; đồng thời giải phóng trạng thái Bác sĩ về "Sẵn sàng" (`AVAILABLE`, nếu không còn ca chờ kết quả khác) để Lễ tân có thể phân ca mới vào phòng, tránh lãng phí thời gian của Bác sĩ.<br>2. Khi khách hàng quay lại phòng khám: Ca khám vẫn hiển thị sẵn sàng trong danh sách chờ của Bác sĩ. Bất kỳ lúc nào Bác sĩ khám xong ca khác hoặc thấy khách có mặt trước cửa phòng, Bác sĩ chỉ cần bấm nút *"Gọi lại vào phòng"* (Recall). Hệ thống gửi thông báo và mời thú cưng vào tiếp tục quy trình Giai đoạn 2. |
| **Ngoại lệ** | **2.2. Khách hàng bỏ về hẳn không quay lại đọc kết quả:** Tại Bước 2 hoặc Luồng 2a, nếu khách tự ý bỏ về và Lễ tân liên hệ điện thoại xác nhận không quay lại, Lễ tân hoặc Bác sĩ chọn thao tác *"Đóng ca / Khách bỏ về"*. Hệ thống khóa chuyên môn, lưu trữ vĩnh viễn các kết quả cận lâm sàng đã làm vào lịch sử bệnh án của thú cưng, đồng thời đẩy chi phí dịch vụ kỹ thuật đã phát sinh sang hóa đơn để thu bù trong lần tiếp theo hoặc ghi nợ vào hồ sơ khách hàng.<br>**6.1. Số lượng thuốc yêu cầu vượt quá tồn kho khả dụng:** Tại Bước 6, nếu Bác sĩ nhập số lượng lớn hơn tồn kho thực tế, hệ thống cảnh báo: *"Số lượng kê vượt quá số lượng tồn kho khả dụng trong tủ thuốc. Vui lòng giảm số lượng hoặc kê loại thuốc thay thế"*.<br>**8.1. Chưa nhập chẩn đoán xác định mà đã bấm chốt:** Tại Bước 8, nếu thông tin chẩn đoán đang để trống, hệ thống chặn lại và thông báo: *"Vui lòng nhập kết luận chẩn đoán trước khi chốt đợt khám"*.<br>**10.1. Lỗi giao dịch khi chốt đợt khám:** Tại Bước 10, nếu hệ thống gặp lỗi kết nối hoặc lưu trữ, hệ thống hoàn tác thao tác, đợt khám vẫn giữ trạng thái "Đang khám" và thông báo để Bác sĩ thử lại. |

---

### 12. UC-34 & UC-35: Lập hóa đơn viện phí & Xác nhận thanh toán

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-34_35: Lập hóa đơn viện phí & Xác nhận thanh toán (Billing & Payment Confirmation)** |
| **Các yêu cầu liên quan** | BR-19, BR-27, REQ-BILLING-01 |
| **Tác nhân chính** | Lễ tân / Thu ngân |
| **Tác nhân phụ** | Chủ thú cưng (Người thanh toán) |
| **Điều kiện tiên quyết** | 1. Đợt khám đang ở trạng thái "Chờ thanh toán".<br>2. Thu ngân đã đăng nhập vào hệ thống với vai trò Lễ tân / Thu ngân. |
| **Hậu điều kiện** | 1. Hóa đơn viện phí được tạo và chuyển sang trạng thái "Đã thanh toán".<br>2. Hệ thống ghi nhận thời điểm thanh toán thành công và nhân viên thu tiền.<br>3. Mở khóa cho phép thực hiện quy trình xuất thuốc khỏi kho. |
| **Chuỗi sự kiện chính** | 1. Thu ngân mở màn hình danh sách chờ thanh toán viện phí tại quầy. Hệ thống hiển thị danh sách các đợt khám đang ở trạng thái "Chờ thanh toán".<br>2. Thu ngân chọn ca khám của khách hàng đang có mặt tại quầy. Hệ thống tự động tổng hợp tiền khám, tiền dịch vụ kỹ thuật/cận lâm sàng và tiền thuốc, hiển thị bảng kê chi tiết viện phí tạm tính.<br>3. Thu ngân kiểm tra các khoản mục chi phí cùng khách hàng. Nếu có chính sách ưu đãi hoặc mã giảm giá, Thu ngân nhập số tiền chiết khấu. Hệ thống tự động tính tổng tiền thanh toán bằng tổng tiền dịch vụ cộng tổng tiền thuốc trừ đi số tiền chiết khấu.<br>4. Khách hàng thực hiện thanh toán viện phí bên ngoài quầy (trả tiền mặt hoặc tự chuyển khoản trực tiếp vào tài khoản ngân hàng của phòng khám).<br>5. Sau khi nhận đủ tiền hoặc xác nhận tiền đã về tài khoản, Thu ngân nhấn nút "Xác nhận thanh toán" trên hệ thống (chưa cần chọn phương thức thanh toán).<br>6. Hệ thống thực hiện xử lý thanh toán trong một giao dịch an toàn:<br>&nbsp;&nbsp;&nbsp;&nbsp;6.1. Tạo mã số hóa đơn duy nhất.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.2. Lưu hóa đơn ở trạng thái "Đã thanh toán", ghi nhận thời điểm thu tiền và nhân viên thu ngân thực hiện.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.3. Mở khóa cho phép thực hiện quy trình xuất thuốc theo đơn từ tủ thuốc.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.4. Hiển thị tùy chọn in hóa đơn thanh toán cho khách hàng.<br>&nbsp;&nbsp;&nbsp;&nbsp;6.5. Nếu xảy ra lỗi trong quá trình ghi nhận, toàn bộ thao tác được hoàn tác và thông báo thanh toán thất bại. |
| **Luồng rẽ nhánh** | **3a. Khách hàng yêu cầu in bảng kê chi phí trước khi thanh toán:** Tại Bước 3, Thu ngân nhấn nút "In phiếu tạm tính". Hệ thống xuất bảng kê chi phí để khách hàng kiểm tra đối chiếu trước khi thực hiện trả tiền ngoài quầy. |
| **Ngoại lệ** | **3.1. Số tiền chiết khấu vượt quá tổng viện phí:** Tại Bước 3, nếu thu ngân nhập số tiền giảm giá lớn hơn tổng viện phí, hệ thống cảnh báo: *"Số tiền giảm giá không thể vượt quá tổng viện phí của ca khám"*.<br>**5.1. Phát hiện sai sót cần điều chỉnh chuyên môn:** Nếu khách hàng thắc mắc về một chỉ định dịch vụ nhầm lẫn, Thu ngân không được tự ý sửa đổi, mà phải yêu cầu người có thẩm quyền thực hiện quy trình mở lại đợt khám để Bác sĩ điều chỉnh.<br>**6.1. Lỗi hệ thống khi lưu hóa đơn:** Tại Bước 6, nếu hệ thống không thể tạo hóa đơn, giao dịch bị hoàn tác hoàn toàn, đơn thuốc không được mở khóa xuất kho và hiển thị thông báo lỗi. |

---

### 13. UC-36: Xuất thuốc theo đơn & Tự động trừ tồn kho

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Tên Use case** | **UC-36: Xuất thuốc theo đơn & Tự động trừ tồn kho (Dispense Prescription & Deduct Stock)** |
| **Các yêu cầu liên quan** | BR-28, BR-29, BR-30, BR-31, REQ-INVENTORY-01 |
| **Tác nhân chính** | Lễ tân / Thu ngân |
| **Điều kiện tiên quyết** | 1. Đợt khám có đơn thuốc được kê.<br>2. Hóa đơn của đợt khám đã được thanh toán thành công ở trạng thái "Đã thanh toán".<br>3. Đơn thuốc chưa từng được xuất kho trước đó. |
| **Hậu điều kiện** | 1. Số lượng tồn kho của các loại thuốc trong đơn bị trừ tương ứng trong kho dược.<br>2. Lịch sử biến động xuất kho được ghi nhận đầy đủ.<br>3. Đơn thuốc chuyển sang trạng thái "Đã cấp thuốc".<br>4. Đợt khám chuyển sang trạng thái "Đã hoàn thành" và ghi nhận thời điểm hoàn tất.<br>5. Đợt khám trở thành một bản ghi hoàn chỉnh trong **Lịch sử bệnh án** của thú cưng. |
| **Chuỗi sự kiện chính** | 1. Sau khi thanh toán hóa đơn, nhân viên nhấn nút "Chuyển sang phát thuốc" (hoặc mở danh sách đơn thuốc chờ phát). Hệ thống hiển thị chi tiết đơn thuốc: Tên thuốc, hoạt chất, số lượng cần lấy, liều dùng và hướng dẫn sử dụng.<br>2. Nhân viên lấy đúng chủng loại và đủ số lượng thuốc từ tủ thuốc phòng khám, kiểm tra hạn sử dụng và dán nhãn hướng dẫn.<br>3. Nhân viên bàn giao thuốc cho chủ nuôi, dặn dò cách dùng theo đúng chỉ dẫn của Bác sĩ.<br>4. Nhân viên nhấn nút "Xác nhận xuất thuốc & Hoàn tất ca khám".<br>5. Hệ thống thực hiện quy trình cấp thuốc trong một giao dịch an toàn:<br>&nbsp;&nbsp;&nbsp;&nbsp;5.1. Kiểm tra số lượng tồn kho khả dụng của từng loại thuốc trong đơn.<br>&nbsp;&nbsp;&nbsp;&nbsp;5.2. Nếu tất cả thuốc đều đủ số lượng, hệ thống thực hiện xuất thuốc khỏi kho.<br>&nbsp;&nbsp;&nbsp;&nbsp;5.3. Hệ thống ghi nhận lịch sử xuất thuốc.<br>&nbsp;&nbsp;&nbsp;&nbsp;5.4. Hệ thống cập nhật trạng thái đơn thuốc thành "Đã cấp thuốc".<br>&nbsp;&nbsp;&nbsp;&nbsp;5.5. Hệ thống cập nhật lượt khám thành "Đã hoàn thành" và ghi nhận thời điểm hoàn thành.<br>&nbsp;&nbsp;&nbsp;&nbsp;5.6. Nếu xảy ra lỗi trong quá trình xử lý, hệ thống hoàn tác toàn bộ thao tác và thông báo cấp thuốc thất bại.<br>6. Giao dịch thành công, hệ thống thông báo hoàn tất ca khám và in phiếu hướng dẫn dùng thuốc trao tay cho khách hàng. |
| **Luồng rẽ nhánh** | **1a. Ca khám không có đơn thuốc (chỉ sử dụng dịch vụ thuần túy):** Đối với ca khám không kê đơn, ngay sau khi thanh toán hóa đơn thành công ở UC-35, hệ thống tự động cập nhật đợt khám thành "Đã hoàn thành" mà không cần qua bước phát thuốc. |
| **Ngoại lệ** | **5.1. Tồn kho thực tế không đủ tại thời điểm xuất kho:** Tại Bước 5, nếu số lượng tồn kho khả dụng của một loại thuốc bị thiếu hụt so với đơn kê:<br>&nbsp;&nbsp;&nbsp;&nbsp;- Hệ thống hoàn tác toàn bộ giao dịch.<br>&nbsp;&nbsp;&nbsp;&nbsp;- Thông báo lỗi: *"Không thể xuất kho: Thuốc [Tên thuốc] trong kho không đủ số lượng để xuất theo đơn. Vui lòng báo Bác sĩ đổi thuốc hoặc kiểm tra lại kho dược."* (Tuân thủ nguyên tắc BR-30).<br>**5.2. Đơn thuốc đã từng được xuất kho trước đó:** Nếu thao tác xuất thuốc bị lặp lại, hệ thống chặn lại và thông báo: *"Đơn thuốc này đã được xuất kho trước đó"* (Tuân thủ nguyên tắc BR-31).<br>**5.3. Lỗi giao dịch hệ thống khi trừ kho:** Nếu xảy ra sự cố kỹ thuật trong quá trình ghi nhật ký biến động kho, hệ thống tự động hoàn tác toàn bộ giao dịch, giữ nguyên số lượng tồn kho và thông báo thất bại. |

---

## PHẦN III: TỔNG HỢP MA TRẬN TRUY VẾT THỰC THỂ NGHIỆP VỤ (CRUD MATRIX)

| Thực thể nghiệp vụ | UC-14 | UC-15 | UC-16 | UC-17 | UC-18 | UC-19 | UC-20 | UC-21 | UC-22_23 | UC-25_26 | UC-30_31_33 | UC-34_35 | UC-36 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Người dùng / Khách hàng** | Xem | Xem | Xem, Tạo | Xem | Tạo, Cập nhật | Tạo, Xem | Xem | Xem | Xem | Xem | Xem | Xem | Xem |
| **Hồ sơ thú cưng** | Xem | Xem | Xem, Tạo | Xem | Tạo, Cập nhật | Tạo, Xem | Xem | Xem | Xem, Cập nhật | Xem | Xem | Xem | Xem |
| **Lịch hẹn khám** | Tạo | Cập nhật | Tạo | Cập nhật | - | Cập nhật | Xem | Xem | - | - | - | - | - |
| **Đợt khám y tế (Pet Visit)**| - | - | - | - | - | Tạo | Cập nhật | Cập nhật | Cập nhật | Cập nhật | Cập nhật | Cập nhật | Cập nhật |
| **Danh mục dịch vụ kỹ thuật**| - | - | - | - | - | - | - | - | Xem | Xem | - | - | - |
| **Chỉ định dịch vụ** | - | - | - | - | - | - | - | - | Tạo, Xem | Xem | Xem | Xem | Xem |
| **Chỉ số xét nghiệm & Tham chiếu**| - | - | - | - | - | - | - | - | - | Xem | - | - | - |
| **Kết quả xét nghiệm & CĐHA**| - | - | - | - | - | - | - | - | - | Tạo, Xem | Xem | Xem | Xem |
| **Danh mục thuốc & Tồn kho** | - | - | - | - | - | - | - | - | - | - | Xem | Xem | Cập nhật |
| **Đơn thuốc & Chi tiết đơn** | - | - | - | - | - | - | - | - | - | - | Tạo | Xem | Cập nhật |
| **Lịch sử biến động kho** | - | - | - | - | - | - | - | - | - | - | - | - | Tạo |
| **Hóa đơn viện phí** | - | - | - | - | - | - | - | - | - | - | - | Tạo, Cập nhật | Xem |

*(Ghi chú: **Tạo** - Khởi tạo dữ liệu mới, **Xem** - Tra cứu đọc dữ liệu, **Cập nhật** - Cập nhật trạng thái hoặc thông tin, **-** - Không truy cập)*

---

## PHẦN IV: PHỤ LỤC DANH MỤC QUY TẮC NGHIỆP VỤ LIÊN QUAN (BUSINESS RULES INDEX)

| Mã BR | Tên quy tắc nghiệp vụ | Mô tả nghiệp vụ | Áp dụng tại UC |
| :---: | :--- | :--- | :---: |
| **BR-04** | Không chọn bác sĩ khi đặt hẹn | Khách hàng chỉ chọn ngày, khung giờ và triệu chứng ban đầu; không được chỉ định bác sĩ khi đặt lịch online. | UC-14, UC-15, UC-16 |
| **BR-05** | Bản chất lịch hẹn | Lịch hẹn chỉ xác định khung giờ dự kiến tiếp nhận, không thay thế quy trình tiếp nhận lâm sàng thực tế. | UC-14, UC-15, UC-16, UC-17 |
| **BR-06** | Quan hệ lịch hẹn - đợt khám | Một lịch hẹn được chuyển đổi thành tối đa một đợt khám y tế khi khách hàng check-in tại quầy. | UC-19 |
| **BR-09** | Trạng thái sau tiếp nhận | Đợt khám sau khi check-in bắt buộc chuyển sang trạng thái "Chờ khám" và xuất hiện trong hàng đợi chung. | UC-19, UC-20 |
| **BR-10** | Trách nhiệm điều phối | Nhân viên Lễ tân chịu trách nhiệm điều phối hàng đợi và phân công ca khám cho bác sĩ. | UC-20, UC-21 |
| **BR-11** | Điều kiện nhận ca mới | Chỉ những Bác sĩ đang ở trạng thái "Sẵn sàng" mới được hệ thống cho phép phân công ca khám mới. | UC-20, UC-21 |
| **BR-12** | Giới hạn ca khám đồng thời | Một Bác sĩ chỉ khám duy nhất một ca bệnh tại một thời điểm (trừ khoảng thời gian chờ kết quả cận lâm sàng). | UC-21 |
| **BR-13** | Phòng khám cố định | Mỗi Bác sĩ làm việc tại đúng số phòng khám cố định đã được cấu hình trên hệ thống. | UC-20, UC-21 |
| **BR-14** | Tiếp nhận đa kênh | Hệ thống hỗ trợ đón tiếp đồng thời cả hai luồng: khách đã đặt hẹn trước và khách đến vãng lai. | UC-16, UC-18, UC-19 |
| **BR-15** | Đơn vị đợt khám | Mỗi đợt khám y tế chỉ gắn liền với duy nhất một thú cưng cụ thể. | UC-18, UC-22_23 |
| **BR-18** | Đơn thuốc duy nhất | Mỗi đợt khám y tế có tối đa một đơn thuốc điện tử tương ứng. | UC-30_31_33 |
| **BR-19** | Hóa đơn viện phí duy nhất | Mỗi đợt khám y tế có tối đa một hóa đơn thanh toán viện phí tương ứng. | UC-34_35 |
| **BR-20** | Thẩm quyền chuyên môn | Bác sĩ khám lâm sàng (`VETERINARIAN`) phụ trách khám sơ bộ, chỉ định và kê đơn; Kỹ thuật viên Xét nghiệm (`LAB_TECHNICIAN`) nhập kết quả Lab; Kỹ thuật viên CĐHA (`IMAGING_TECHNICIAN`) tải ảnh và kết luận CĐHA. | UC-22_23, UC-25_26, UC-30_31_33 |
| **BR-21** | Tách biệt chi phí | Chi phí kỹ thuật dịch vụ cận lâm sàng và chi phí thuốc men được quản lý và hiển thị độc lập trên viện phí. | UC-25_26, UC-34_35 |
| **BR-23** | Tham chiếu phụ thuộc loài | Các chỉ số xét nghiệm bắt buộc phải được đánh giá dựa trên khoảng tham chiếu sinh lý chuẩn riêng của Chó hoặc Mèo. | UC-25_26 |
| **BR-24** | Bất biến khoảng tham chiếu | Khoảng tham chiếu sinh lý được lưu cố định cùng kết quả tại thời điểm xét nghiệm để đảm bảo tính pháp lý lịch sử. | UC-25_26 |
| **BR-25** | Bất biến giá dịch vụ | Đơn giá kỹ thuật dịch vụ được chốt cố định theo giá niêm yết tại đúng thời điểm Bác sĩ ra chỉ định. | UC-22_23 |
| **BR-26** | Bất biến giá thuốc | Đơn giá bán của từng loại thuốc được chốt cố định tại đúng thời điểm Bác sĩ hoàn thành kê đơn. | UC-30_31_33 |
| **BR-27** | Điều kiện lập hóa đơn | Đợt khám bắt buộc phải được Bác sĩ chốt chuyên môn chuyển sang "Chờ thanh toán" trước khi thu ngân lập hóa đơn. | UC-34_35 |
| **BR-28** | Điều kiện hoàn thành ca khám | Đợt khám chỉ chuyển sang trạng thái "Đã hoàn thành" sau khi hóa đơn được thanh toán thành công và thuốc được xuất kho. | UC-36 |
| **BR-29** | Thời điểm trừ kho | Thuốc trong kho dược chỉ được tự động trừ tồn kho khi nhân viên thực hiện thao tác xuất thuốc sau thanh toán. | UC-36 |
| **BR-30** | Giới hạn tồn kho khả dụng | Tuyệt đối không cho phép kê đơn hoặc xuất thuốc vượt quá số lượng tồn kho khả dụng hiện tại trong tủ thuốc. | UC-30_31_33, UC-36 |
| **BR-31** | Chống xuất kho lặp lại | Một đơn thuốc tuyệt đối không được phép thực hiện xuất kho và trừ tồn kho nhiều hơn một lần. | UC-36 |

---

## PHẦN V: DANH MỤC TOÀN BỘ CÁC USE CASE CỦA HỆ THỐNG (FULL USE CASE LIST)

Dưới đây là danh mục đầy đủ **39 Ca sử dụng (Use Cases)** của Hệ thống Quản lý Phòng khám Thú y, được phân bổ theo 9 Phân hệ chức năng và các tác nhân nghiệp vụ:

| Mã UC | Tên Ca Sử dụng (Use Case Name) | Tác nhân chính (Primary Actor) | Phân hệ Nghiệp vụ |
| :---: | :--- | :---: | :--- |
| **UC-01** | Quản lý tài khoản người dùng & Phân quyền nội bộ *(Manage User Accounts & Roles)* | Quản trị viên (ADMIN) | Phân hệ 1: Quản trị Hệ thống & Danh mục |
| **UC-02** | Quản lý số phòng làm việc cố định của Bác sĩ / Kỹ thuật viên *(Manage Work Rooms)* | Quản trị viên (ADMIN) | Phân hệ 1: Quản trị Hệ thống & Danh mục |
| **UC-03** | Quản lý danh mục Dịch vụ kỹ thuật *(Manage Services Catalog)* | Quản trị viên (ADMIN) | Phân hệ 1: Quản trị Hệ thống & Danh mục |
| **UC-04** | Quản lý danh mục Thuốc & Tủ thuốc *(Manage Medicines Catalog)* | Quản trị viên (ADMIN) | Phân hệ 1: Quản trị Hệ thống & Danh mục |
| **UC-05** | Quản lý danh mục Chỉ số xét nghiệm *(Manage Lab Test Items)* | Quản trị viên (ADMIN) | Phân hệ 1: Quản trị Hệ thống & Danh mục |
| **UC-06** | Quản lý Khoảng tham chiếu sinh lý theo Loài *(Manage Species Reference Ranges)* | Quản trị viên (ADMIN) | Phân hệ 1: Quản trị Hệ thống & Danh mục |
| **UC-07** | Quản lý danh mục Loài thú cưng *(Manage Species Catalog)* | Quản trị viên (ADMIN) | Phân hệ 1: Quản trị Hệ thống & Danh mục |
| **UC-08** | Báo cáo Thống kê Doanh thu & Hiệu suất phòng khám *(Analytics & Operational Reports)* | Quản trị viên (ADMIN) | Phân hệ 1: Quản trị Hệ thống & Danh mục |
| **UC-09** | Tìm kiếm thông tin Khách hàng đa tiêu chí *(Search Pet Owners)* | Lễ tân (RECEPTIONIST) | Phân hệ 2: Quản lý Khách hàng & Thú cưng |
| **UC-10** | Tạo mới hồ sơ Khách hàng & Cấp tài khoản tự động *(Register Pet Owner)* | Lễ tân (RECEPTIONIST) | Phân hệ 2: Quản lý Khách hàng & Thú cưng |
| **UC-11** | Cập nhật thông tin hồ sơ Khách hàng *(Update Pet Owner Profile)* | Lễ tân / Chủ nuôi | Phân hệ 2: Quản lý Khách hàng & Thú cưng |
| **UC-12** | Đăng ký hồ sơ Thú cưng mới *(Register New Pet)* | Lễ tân / Chủ nuôi | Phân hệ 2: Quản lý Khách hàng & Thú cưng |
| **UC-13** | Cập nhật hồ sơ & Đặc điểm nhận dạng Thú cưng *(Update Pet Profile)* | Lễ tân / Chủ nuôi | Phân hệ 2: Quản lý Khách hàng & Thú cưng |
| **UC-14** | Đặt lịch hẹn khám trực tuyến qua Portal *(Online Appointment Booking)* | Chủ thú cưng (PET_OWNER) | Phân hệ 3: Đặt lịch hẹn khám |
| **UC-15** | Quản lý lịch hẹn cá nhân: Đổi giờ / Hủy hẹn online *(Manage Personal Appointments)* | Chủ thú cưng (PET_OWNER) | Phân hệ 3: Đặt lịch hẹn khám |
| **UC-16** | Đặt lịch hẹn tại quầy / qua điện thoại *(Receptionist Appointment Booking)* | Lễ tân (RECEPTIONIST) | Phân hệ 3: Đặt lịch hẹn khám |
| **UC-17** | Duyệt xác nhận / Từ chối lịch hẹn trực tuyến *(Confirm & Cancel Online Appointments)* | Lễ tân (RECEPTIONIST) | Phân hệ 3: Đặt lịch hẹn khám |
| **UC-18** | Tiếp nhận hồ sơ Khách hàng & Thú cưng tại quầy *(Front-desk Pet & Owner Reception)* | Lễ tân (RECEPTIONIST) | Phân hệ 4: Tiếp đón & Hàng đợi Sảnh |
| **UC-19** | Tiếp nhận thú cưng tại quầy: Check-in & Walk-in *(Check-in Appointment & Walk-in)* | Lễ tân (RECEPTIONIST) | Phân hệ 4: Tiếp đón & Hàng đợi Sảnh |
| **UC-20** | Giám sát & Điều phối hàng đợi khám bệnh tập trung *(Queue Monitoring & Priority Handling)* | Lễ tân (RECEPTIONIST) | Phân hệ 4: Tiếp đón & Hàng đợi Sảnh |
| **UC-21** | Điều phối & Phân công Bác sĩ vào phòng khám cố định *(Assign Doctor to Visit)* | Lễ tân (RECEPTIONIST) | Phân hệ 4: Tiếp đón & Hàng đợi Sảnh |
| **UC-22** | Bác sĩ tiếp nhận bệnh nhân & Khám lâm sàng sơ bộ *(Clinical Examination - Phase 1)* | Bác sĩ (VETERINARIAN) | Phân hệ 5: Khám Lâm sàng Sơ bộ (GĐ 1) |
| **UC-23** | Chỉ định Dịch vụ Kỹ thuật cận lâm sàng *(Order Paraclinical Services)* | Bác sĩ (VETERINARIAN) | Phân hệ 5: Khám Lâm sàng Sơ bộ (GĐ 1) |
| **UC-24** | Xử lý rẽ nhánh Chốt ca khám thông thường / Tiêm phòng *(Fast-track Non-paraclinical Visit)* | Bác sĩ (VETERINARIAN) | Phân hệ 5: Khám Lâm sàng Sơ bộ (GĐ 1) |
| **UC-25** | Tiếp nhận mẫu, Vận hành máy & Nhập kết quả Xét nghiệm *(Perform Laboratory Tests)* | KTV Xét nghiệm (LAB_TECHNICIAN) | Phân hệ 6: Quản lý & Thực hiện Cận lâm sàng |
| **UC-26** | Chụp X-quang / Siêu âm, Tải ảnh & Kết luận CĐHA *(Perform Imaging Diagnostics)* | KTV CĐHA (IMAGING_TECHNICIAN) | Phân hệ 6: Quản lý & Thực hiện Cận lâm sàng |
| **UC-27** | Quản lý ca tạm hoãn do vắng mặt tại phòng CLS *(Manage Missed Turns in Paraclinic)* | KTV Lab / KTV CĐHA | Phân hệ 6: Quản lý & Thực hiện Cận lâm sàng |
| **UC-28** | Kích hoạt lại ca tạm hoãn khi khách quay lại phòng CLS *(Recall Patient in Paraclinic)* | KTV Lab / KTV CĐHA | Phân hệ 6: Quản lý & Thực hiện Cận lâm sàng |
| **UC-29** | Xử lý khách hàng xin hủy dịch vụ cận lâm sàng giữa chừng *(Cancel Paraclinical Service)* | KTV Lab / KTV CĐHA | Phân hệ 6: Quản lý & Thực hiện Cận lâm sàng |
| **UC-30** | Bác sĩ đón ca có kết quả & Kích hoạt Khóa ưu tiên *(Doctor Priority Callback - Phase 2)* | Bác sĩ (VETERINARIAN) | Phân hệ 7: Hội chẩn Kết quả & Kê đơn (GĐ 2) |
| **UC-31** | Kê đơn thuốc điện tử *(Electronic Prescription)* | Bác sĩ (VETERINARIAN) | Phân hệ 7: Hội chẩn Kết quả & Kê đơn (GĐ 2) |
| **UC-32** | Xử lý tạm hoãn ca tái khám khi khách vắng mặt GĐ 2 *(Postpone Recall Visit)* | Bác sĩ (VETERINARIAN) | Phân hệ 7: Hội chẩn Kết quả & Kê đơn (GĐ 2) |
| **UC-33** | Chốt đợt khám & Khóa hồ sơ bệnh án chuyên môn 1 chiều *(Finalize Visit & Lock Record)* | Bác sĩ (VETERINARIAN) | Phân hệ 7: Hội chẩn Kết quả & Kê đơn (GĐ 2) |
| **UC-34** | Lập hóa đơn viện phí & Áp dụng chiết khấu / khuyến mại *(Generate Invoice & Discount)* | Thu ngân (RECEPTIONIST) | Phân hệ 8: Viện phí & Xuất thuốc Trừ kho |
| **UC-35** | Xác nhận thanh toán viện phí *(Confirm Payment Processing)* | Thu ngân (RECEPTIONIST) | Phân hệ 8: Viện phí & Xuất thuốc Trừ kho |
| **UC-36** | Xuất thuốc theo đơn & Tự động trừ tồn kho an toàn *(Dispense Medicines & Deduct Stock)* | Lễ tân / Thu ngân | Phân hệ 8: Viện phí & Xuất thuốc Trừ kho |
| **UC-37** | Quản lý Nhập kho thuốc & Cân chỉnh kho dược *(Manage Pharmacy Stock Inflow)* | Quản trị viên (ADMIN) | Phân hệ 8: Viện phí & Xuất thuốc Trừ kho |
| **UC-38** | Tra cứu Lịch sử bệnh án điện tử trọn đời của Thú cưng *(View Lifelong Medical Records)* | Bác sĩ / Lễ tân / Chủ nuôi | Phân hệ 9: Tra cứu Bệnh án & Portal |
| **UC-39** | Xem đơn thuốc & Hướng dẫn sử dụng thuốc điện tử trên Portal *(View Digital Prescriptions)* | Chủ thú cưng (PET_OWNER) | Phân hệ 9: Tra cứu Bệnh án & Portal |
