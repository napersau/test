# TÀI LIỆU YÊU CẦU CHỨC NĂNG VÀ PHI CHỨC NĂNG
## HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y (VETERINARY CLINIC MANAGEMENT SYSTEM)

> **Tài liệu chuẩn IEEE 830 / ISO/IEC/IEEE 29148 phục vụ Thuyết minh & Bảo vệ Đồ án Tốt nghiệp**  
> **Phiên bản:** 2.0 (Đã tinh gọn nghiệp vụ ngoại trú, loại bỏ lưu chuồng nội trú và lịch nhắc định kỳ)  
> **Mục tiêu:** Định nghĩa toàn diện, chuẩn xác và có thể kiểm chứng được (verifiable) toàn bộ các Yêu cầu Chức năng (Functional Requirements - FR) và Yêu cầu Phi chức năng (Non-Functional Requirements - NFR) của hệ thống phần mềm, làm cơ sở pháp lý và kỹ thuật cho thiết kế kiến trúc, CSDL, giao diện và kiểm thử.

---

## MỤC LỤC TỔNG QUAN

1. [Tổng quan Phạm vi Hệ thống & Tác nhân (Scope & Actors)](#1-tổng-quan-phạm-vi-hệ-thống--tác-nhân)
2. [Yêu cầu Chức năng (Functional Requirements - FR)](#2-yêu-cầu-chức-năng-functional-requirements---fr)
   - [Phân hệ 1: Quản trị Hệ thống, Tài khoản & Cấu hình Danh mục](#phân-hệ-1-quản-trị-hệ-thống-tài-khoản--cấu-hình-danh-mục)
   - [Phân hệ 2: Quản lý Hồ sơ Khách hàng & Thú cưng](#phân-hệ-2-quản-lý-hồ-sơ-khách-hàng--thú-cưng)
   - [Phân hệ 3: Đặt lịch hẹn Khám & Quản lý Lịch hẹn](#phân-hệ-3-đặt-lịch-hẹn-khám--quản-lý-lịch-hẹn)
   - [Phân hệ 4: Tiếp đón Sảnh, Hàng đợi & Phân công Bác sĩ](#phân-hệ-4-tiếp-đón-sảnh-hàng-đợi--phân-công-bác-sĩ)
   - [Phân hệ 5: Khám Lâm sàng Sơ bộ & Chỉ định Dịch vụ Kỹ thuật (GĐ 1)](#phân-hệ-5-khám-lâm-sàng-sơ-bộ--chỉ-định-dịch-vụ-kỹ-thuật-gđ-1)
   - [Phân hệ 6: Quản lý & Thực hiện Cận lâm sàng (Lab & CĐHA)](#phân-hệ-6-quản-lý--thực-hiện-cận-lâm-sàng-lab--cđha)
   - [Phân hệ 7: Hội chẩn Kết quả, Chẩn đoán Xác định & Kê đơn (GĐ 2)](#phân-hệ-7-hội-chẩn-kết-quả-chẩn-đoán-xác-định--kê-đơn-gđ-2)
   - [Phân hệ 8: Viện phí, Hóa đơn Thanh toán & Xuất thuốc Trừ kho](#phân-hệ-8-viện-phí-hóa-đơn-thanh-toán--xuất-thuốc-trừ-kho)
   - [Phân hệ 9: Tra cứu Bệnh án Điện tử & Báo cáo Thống kê](#phân-hệ-9-tra-cứu-bệnh-án-điện-tử--báo-cáo-thống-kê)
3. [Yêu cầu Phi chức năng (Non-Functional Requirements - NFR)](#3-yêu-cầu-phi-chức-năng-non-functional-requirements---nfr)
   - [Danh mục 8 Yêu cầu Phi chức năng chuẩn Đồ án Tốt nghiệp](#danh-mục-8-yêu-cầu-phi-chức-năng-chuẩn-đồ-án-tốt-nghiệp)
4. [Ma trận Truy vết Yêu cầu Tổng hợp (Requirements Traceability Matrix - RTM)](#4-ma-trận-truy-vết-yêu-cầu-tổng-hợp-requirements-traceability-matrix---rtm)

---

## 1. TỔNG QUAN PHẠM VI HỆ THỐNG & TÁC NHÂN

### 1.1. Phạm vi bài toán
Hệ thống tin học hóa toàn diện quy trình vận hành phòng khám thú y điều trị ngoại trú theo mô hình **Chu kỳ Y tế Bất đồng bộ Hai pha (Two-Phase Asynchronous Clinical Cycle)**:
- **Pha 1 (Lâm sàng sơ bộ):** Tiếp đón $\rightarrow$ Hàng đợi sảnh $\rightarrow$ Bác sĩ khám thực thể $\rightarrow$ Ra chỉ định cận lâm sàng $\rightarrow$ Giải phóng Bác sĩ về rảnh để khám ca tiếp theo.
- **Tiến trình Song song:** Thực hiện cận lâm sàng đồng thời tại Phòng Xét nghiệm (Lab) và Phòng Chẩn đoán hình ảnh (CĐHA).
- **Pha 2 (Hội chẩn & Chốt ca):** Hệ thống kích hoạt Khóa ưu tiên (Priority Lock) $\rightarrow$ Bác sĩ đón ca có kết quả $\rightarrow$ Hội chẩn, chẩn đoán xác định $\rightarrow$ Kê đơn thuốc $\rightarrow$ Thu ngân viện phí $\rightarrow$ Lấy thuốc từ tủ thuốc trừ kho an toàn $\rightarrow$ Hoàn tất.

### 1.2. Danh sách 6 Vai trò người dùng chính thức (Roles)

| Mã Vai trò | Tên Vai trò | Mô tả thẩm quyền & Phạm vi trách nhiệm nghiệp vụ |
| :---: | :--- | :--- |
| **`ADMIN`** | Quản trị viên hệ thống | Toàn quyền quản trị tài khoản nhân sự, phân bổ số phòng làm việc cố định cho bác sĩ và kỹ thuật viên, cấu hình danh mục dịch vụ, danh mục thuốc, cấu hình chỉ số xét nghiệm, khoảng tham chiếu loài và xem toàn bộ báo cáo doanh thu. |
| **`RECEPTIONIST`** | Lễ tân / Thu ngân | Tiếp đón khách hàng, tiếp nhận lịch hẹn, tạo hồ sơ khách hàng/thú cưng, điều phối hàng đợi sảnh, phân công bác sĩ vào phòng khám, mở hóa đơn viện phí, thu tiền thanh toán và trực tiếp lấy thuốc từ tủ thuốc theo đơn để cấp phát cho chủ nuôi. |
| **`VETERINARIAN`** | Bác sĩ khám lâm sàng | Bác sĩ khám chính tại phòng khám cố định; thực hiện khám lâm sàng sơ bộ (GĐ 1), chỉ định cận lâm sàng, đọc kết quả chẩn đoán hình ảnh/xét nghiệm (GĐ 2), chẩn đoán xác định, kê đơn thuốc điện tử và khóa hồ sơ bệnh án. |
| **`LAB_TECHNICIAN`** | Kỹ thuật viên / Bác sĩ Xét nghiệm | Phụ trách Phòng Xét nghiệm; theo dõi hàng đợi Lab, lấy mẫu bệnh phẩm, vận hành máy phân tích tự động, nhập chỉ số đo lường thực tế, đối soát với khoảng tham chiếu sinh lý của loài và xác nhận hoàn tất kết quả. |
| **`IMAGING_TECHNICIAN`** | Kỹ thuật viên / Bác sĩ Chẩn đoán hình ảnh | Phụ trách Phòng Chẩn đoán hình ảnh; theo dõi hàng đợi CĐHA, chụp X-quang, quét siêu âm, tải các tệp ảnh thực tế/DICOM lên hệ thống, nhập mô tả hình ảnh tổn thương và kết luận hình thái học. |
| **`PET_OWNER`** | Khách hàng / Chủ thú cưng | Sử dụng Cổng thông tin (Customer Portal) để quản lý hồ sơ thú cưng cá nhân, đặt lịch hẹn khám trực tuyến theo khung giờ, quản lý hủy/đổi lịch hẹn và tra cứu toàn bộ lịch sử bệnh án, kết quả xét nghiệm, đơn thuốc điện tử. |

---

## 2. YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS - FR)

> **Quy ước mức độ ưu tiên theo chuẩn MoSCoW:**
> - **Must Have (M):** Bắt buộc phải có để hệ thống vận hành được, không thể thiếu khi bảo vệ đồ án.
> - **Should Have (S):** Rất quan trọng, nâng cao chất lượng vận hành và giải quyết các ngoại lệ nghiệp vụ.
> - **Could Have (C):** Tiện ích mở rộng nhằm tối ưu hóa trải nghiệm người dùng.

---

### Phân hệ 1: Quản trị Hệ thống, Tài khoản & Cấu hình Danh mục

| Mã FR | Tên Yêu cầu Chức năng | Mô tả chi tiết hành vi hệ thống | Tác nhân | Ưu tiên | Use Case / Quy tắc |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **FR-01** | Quản lý tài khoản & Phân quyền nội bộ | Cho phép Admin tạo, xem danh sách, cập nhật thông tin nhân sự và khóa/mở khóa tài khoản nhân viên (`ACTIVE`, `INACTIVE`, `LOCKED`). Gán đúng 1 vai trò trong 3 vai trò nội bộ (`ADMIN`, `VETERINARIAN`, `RECEPTIONIST`). | Admin | **M** | UC-01<br>BR-01 |
| **FR-02** | Quản lý số phòng khám cố định cho Bác sĩ | Cho phép Admin gán và cập nhật số phòng khám cố định (`room_number`) trực tiếp vào hồ sơ của từng Bác sĩ thú y. Hệ thống không tạo bảng phòng khám riêng biệt. | Admin | **M** | UC-02<br>BR-13 |
| **FR-03** | Quản lý danh mục Dịch vụ kỹ thuật | Cho phép Admin tạo mới, chỉnh sửa thông tin dịch vụ kỹ thuật: Mã dịch vụ, Tên dịch vụ, Phân nhóm (`category` thuộc 9 nhóm cố định), Đơn giá niêm yết (`base_price`), Trạng thái hoạt động. | Admin | **M** | UC-03<br>BR-25 |
| **FR-04** | Quản lý danh mục Thuốc & Tủ thuốc | Cho phép Admin quản lý danh mục dược phẩm: Mã thuốc, Tên thương mại, Hoạt chất, Đơn vị tính (Viên, Ống, Lọ, Gói), Dạng bào chế, Đơn giá bán niêm yết (`sale_price`) và Số lượng tồn kho khả dụng hiện tại (`stock_quantity`). | Admin | **M** | UC-04<br>BR-26, BR-30 |
| **FR-05** | Quản lý danh mục Chỉ số xét nghiệm (Lab Items) | Cho phép Admin quản lý danh mục các chỉ số phân tích huyết học/sinh hóa: Mã chỉ số (WBC, RBC, HGB, PLT...), Tên chỉ số, Đơn vị đo lường chuẩn quốc tế (10^9/L, g/dL...). | Admin | **M** | UC-05<br>BR-23 |
| **FR-06** | Quản lý Khoảng tham chiếu sinh lý theo Loài | Cho phép Admin thiết lập khoảng giá trị sinh lý bình thường cho từng chỉ số theo loài (`min_value`, `max_value` riêng biệt cho loài `DOG` và loài `CAT`). | Admin | **M** | UC-06<br>BR-23, BR-24 |
| **FR-07** | Quản lý danh mục Loài thú cưng | Cho phép Admin cấu hình danh mục loài thú cưng được tiếp nhận tại phòng khám (Mã loài, Tên loài: Chó, Mèo...). | Admin | **M** | UC-07<br>BR-15 |

---

### Phân hệ 2: Quản lý Hồ sơ Khách hàng & Thú cưng

| Mã FR | Tên Yêu cầu Chức năng | Mô tả chi tiết hành vi hệ thống | Tác nhân | Ưu tiên | Use Case / Quy tắc |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **FR-08** | Tìm kiếm thông tin Khách hàng đa tiêu chí | Cho phép Lễ tân tìm kiếm hồ sơ khách hàng nhanh chóng qua Số điện thoại (chính xác), Họ tên hoặc Tên thú cưng. Thời gian trả về tức thì. | Lễ tân | **M** | UC-18<br>NFR-01 |
| **FR-09** | Đăng ký & Cập nhật Hồ sơ Khách hàng | Cho phép Lễ tân tạo mới hồ sơ chủ nuôi khi đến phòng khám lần đầu: Họ tên, Số điện thoại (duy nhất, bắt buộc), Email, Địa chỉ liên hệ. | Lễ tân | **M** | UC-18<br>BR-14 |
| **FR-10** | Đăng ký & Quản lý Hồ sơ Thú cưng | Cho phép Lễ tân (hoặc Chủ nuôi trên Portal) tạo mới/cập nhật hồ sơ bệnh nhân: Tên thú cưng, Loài (`species_id`), Giống, Giới tính (`MALE`, `FEMALE`, `UNKNOWN`), Ngày sinh/Tuổi ước tính, Màu lông, Tình trạng triệt sản và Đặc điểm nhận dạng. | Lễ tân, Chủ nuôi | **M** | UC-18<br>BR-15 |
| **FR-11** | Quản lý quan hệ 1 Khách hàng - Nhiều Thú cưng | Hệ thống duy trì mối liên kết một chủ nuôi có thể sở hữu nhiều thú cưng; hiển thị danh sách toàn bộ thú cưng của khách hàng khi mở hồ sơ chủ nuôi. | Lễ tân, Chủ nuôi | **M** | UC-18 |

---

### Phân hệ 3: Đặt lịch hẹn Khám & Quản lý Lịch hẹn

| Mã FR | Tên Yêu cầu Chức năng | Mô tả chi tiết hành vi hệ thống | Tác nhân | Ưu tiên | Use Case / Quy tắc |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **FR-12** | Đặt lịch hẹn khám trực tuyến qua Portal | Cho phép Chủ thú cưng đặt lịch hẹn trước: Chọn thú cưng trong danh sách, chọn ngày hẹn, chọn khung giờ 30 phút còn trống, nhập lý do khám/triệu chứng ban đầu. **Hệ thống tuyệt đối không cho phép khách hàng chọn Bác sĩ khám khi đặt lịch**. Lịch hẹn tạo ra có trạng thái `PENDING`. | Chủ nuôi | **M** | UC-14<br>BR-04, BR-05 |
| **FR-13** | Kiểm soát sức chứa khung giờ đặt hẹn tự động | Hệ thống tự động tính toán số lượng lịch tối đa cho mỗi khung giờ 30 phút bằng tổng số Bác sĩ đang hoạt động (`max_capacity`). Khi một khung giờ đã đủ số lượng đặt, hệ thống tự động làm mờ và chặn đặt tiếp. | Hệ thống | **M** | UC-14<br>EX-01 |
| **FR-14** | Quản lý Lịch hẹn cá nhân trên Portal | Cho phép Chủ thú cưng theo dõi trạng thái lịch hẹn cá nhân (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `CANCELLED`, `NO_SHOW`). Cho phép tự hủy hẹn hoặc đổi khung giờ trước giờ hẹn tối thiểu 02 tiếng. | Chủ nuôi | **M** | UC-15<br>BR-05 |
| **FR-15** | Đặt lịch hẹn trực tiếp tại quầy / qua điện thoại | Cho phép Lễ tân đặt lịch hẹn cho khách gọi điện hoặc đăng ký tại quầy. Lịch hẹn do Lễ tân tạo được tự động xác nhận ngay sang trạng thái `CONFIRMED`. | Lễ tân | **M** | UC-16<br>BR-14 |
| **FR-16** | Duyệt xác nhận / Từ chối Lịch hẹn trực tuyến | Cho phép Lễ tân mở danh sách lịch hẹn chờ duyệt (`PENDING`), gọi điện xác thực thông tin và bấm "Duyệt xác nhận" (`CONFIRMED`) hoặc "Từ chối" (`CANCELLED` kèm lý do từ chối bắt buộc). Gửi thông báo đến Portal khách hàng. | Lễ tân | **M** | UC-17<br>BR-05 |
| **FR-17** | Tự động quét vắng mặt lịch hẹn (Auto No-Show) | Hệ thống chạy tiến trình ngầm (Cronjob) định kỳ: Nếu thời gian hiện tại vượt quá giờ hẹn 30 phút mà khách hàng chưa check-in tại quầy, tự động cập nhật lịch hẹn sang `NO_SHOW` để giải phóng suất giữ chỗ cho khách vãng lai. | Hệ thống | **S** | UC-17<br>EX-01 |
| **FR-18** | Tiếp nhận ca trễ hẹn sau khi đã No-Show | Khi khách hàng đến muộn sau khi lịch hẹn đã chuyển `NO_SHOW`, Lễ tân bấm tiếp nhận ca trễ hẹn: Hệ thống giữ nguyên trạng thái `NO_SHOW` của lịch hẹn (ghi nhận lịch sử uy tín), đồng thời tạo một đợt khám mới dạng khách vãng lai (`appointment_id = NULL`) và xếp vào hàng đợi sảnh bình thường. | Lễ tân | **S** | UC-19<br>EX-02 |

---

### Phân hệ 4: Tiếp đón Sảnh, Hàng đợi & Phân công Bác sĩ

| Mã FR | Tên Yêu cầu Chức năng | Mô tả chi tiết hành vi hệ thống | Tác nhân | Ưu tiên | Use Case / Quy tắc |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **FR-19** | Tiếp nhận thú cưng tại quầy (Check-in) | Cho phép Lễ tân tiếp đón cả 2 luồng khách hàng: Khách có lịch hẹn `CONFIRMED` (chuyển lịch hẹn sang `CHECKED_IN` và sinh đợt khám `pet_visits` tương ứng) hoặc Khách vãng lai Walk-in (tạo đợt khám mới trực tiếp). Đợt khám mới có trạng thái ban đầu là `WAITING`. | Lễ tân | **M** | UC-19<br>BR-06, BR-09, BR-14 |
| **FR-20** | Phân loại sàng lọc cấp cứu ban đầu (Triage) | Lễ tân quan sát, đánh giá nhanh tri giác và dấu hiệu nguy kịch (co giật, khó thở dữ dội, chấn thương/chảy máu nhiều do tai nạn). Nếu phát hiện thú cưng nguy kịch, Lễ tân đánh dấu cờ `is_emergency = TRUE` để kích hoạt luồng ưu tiên cấp cứu (việc đo thân nhiệt, cân nặng sẽ do Bác sĩ thực hiện trong phòng khám). | Lễ tân | **M** | UC-19<br>BR-09 |
| **FR-21** | Hiển thị & Giám sát Hàng đợi khám bệnh sảnh | Hệ thống hiển thị bảng theo dõi hàng đợi khám chung tại sảnh theo thời gian thực: Ca cấp cứu (`is_emergency = TRUE`) được tự động đưa lên đầu danh sách kèm viền đỏ nổi bật; các ca thông thường được sắp xếp tuần tự theo thời gian check-in (FIFO). | Lễ tân | **M** | UC-20<br>BR-09, BR-10 |
| **FR-22** | Suy diễn trạng thái phục vụ tức thời của Bác sĩ | Hệ thống tự động tính toán động trạng thái phục vụ tức thời của từng Bác sĩ theo công thức SQL thời gian thực: `BUSY` (nếu đang có ca `IN_PROGRESS`), `AVAILABLE_PRIORITY_CALLBACK` (nếu đang rảnh nhưng có ca `RESULTS_READY`), hoặc `AVAILABLE` (rảnh hoàn toàn, không có ca nào đang khám hoặc chờ KQ). Không lưu trường trạng thái tĩnh. | Hệ thống | **M** | UC-20, UC-21<br>BR-11, BR-12 |
| **FR-23** | Kích hoạt cơ chế Khóa ưu tiên Bác sĩ (Priority Lock) | Khi một Bác sĩ đang có ít nhất 1 ca ở trạng thái `RESULTS_READY` (đã chờ xét nghiệm 15-30 phút), hệ thống tự động khóa nút phân công ca mới của Bác sĩ này trên màn hình Lễ tân. Nếu Lễ tân cố tình phân công ca mới từ sảnh, hệ thống hiển thị cảnh báo từ chối. | Hệ thống | **M** | UC-20, UC-21<br>EX-04, EX-05 |
| **FR-24** | Điều phối & Phân công Bác sĩ vào phòng khám | Lễ tân chọn ca khám trong hàng đợi sảnh, chọn một Bác sĩ đang ở trạng thái `AVAILABLE` và bấm "Phân công vào phòng". Hệ thống cập nhật `doctor_id` vào đợt khám và tự động hiển thị thông báo mời thú cưng vào phòng trên màn hình sảnh và ứng dụng. | Lễ tân | **M** | UC-21<br>BR-10, BR-11, BR-13 |
| **FR-25** | Kiểm soát xung đột phân công thời gian thực | Tại thời điểm Lễ tân bấm phân công, hệ thống kiểm tra lại trạng thái Bác sĩ trong giao dịch: Nếu Bác sĩ vừa được lễ tân khác phân công hoặc vừa bấm nhận ca khác (`BUSY`), hệ thống từ chối giao dịch và yêu cầu chọn bác sĩ khác. | Hệ thống | **M** | UC-21<br>EX-05 |
| **FR-26** | Hủy tiếp nhận ca khám tại sảnh | Cho phép Lễ tân hủy đợt khám khi khách hàng chờ lâu xin về hoặc có việc bận đột xuất: Cập nhật `pet_visits.status = 'CANCELLED'`, ghi nhận lý do hủy (`cancel_reason`), rút ca khỏi hàng đợi sảnh. | Lễ tân | **S** | UC-20<br>EX-03 |

---

### Phân hệ 5: Khám Lâm sàng Sơ bộ & Chỉ định Dịch vụ Kỹ thuật (GĐ 1)

| Mã FR | Tên Yêu cầu Chức năng | Mô tả chi tiết hành vi hệ thống | Tác nhân | Ưu tiên | Use Case / Quy tắc |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **FR-27** | Bác sĩ tiếp nhận bệnh nhân & Bắt đầu khám (GĐ 1) | Khi thú cưng bước vào phòng, Bác sĩ bấm "Bắt đầu khám". Hệ thống ghi nhận `started_at = NOW()`, cập nhật `pet_visits.status = 'IN_PROGRESS'`, chuyển trạng thái Bác sĩ sang `BUSY` và mở Bệnh án điện tử. | Bác sĩ | **M** | UC-22<br>BR-12, BR-20 |
| **FR-28** | Tra cứu Lịch sử bệnh án điện tử tại phòng khám | Cho phép Bác sĩ xem toàn bộ lịch sử khám bệnh cũ của thú cưng ngay trên giao diện khám: tiền sử bệnh mãn tính, dị ứng thuốc, các đợt tiêm vaccine trước đây, kết quả xét nghiệm cũ và các đơn thuốc đã dùng. | Bác sĩ | **M** | UC-22 |
| **FR-29** | Thăm khám lâm sàng & Đo sinh hiệu sơ bộ | Bác sĩ trực tiếp đo cân nặng (`weight_at_visit`), thân nhiệt (`temperature`) cho thú cưng tại phòng khám; kiểm tra tim phổi, da, niêm mạc, hạch bạch huyết; nhập ghi chú triệu chứng lâm sàng và nhận định chẩn đoán sơ bộ ban đầu. | Bác sĩ | **M** | UC-22<br>BR-20 |
| **FR-30** | Rẽ nhánh Chốt ca khám thông thường / Tiêm phòng | Đối với ca bệnh nhẹ không cần cận lâm sàng hoặc ca tiêm phòng/tẩy giun: Cho phép Bác sĩ chẩn đoán xác định ngay, kê đơn thuốc ngoại trú (nếu có), dặn dò và bấm "Chốt đợt khám & Chuyển thanh toán". Ca chuyển thẳng sang `WAITING_PAYMENT`, khóa hồ sơ bệnh án và giải phóng Bác sĩ. | Bác sĩ | **M** | UC-22_23<br>UC-30_33 |
| **FR-31** | Chỉ định Dịch vụ Kỹ thuật cận lâm sàng | Cho phép Bác sĩ chọn một hoặc nhiều dịch vụ kỹ thuật từ danh mục (Xét nghiệm máu tổng quát, Siêu âm ổ bụng, Chụp X-quang kỹ thuật số). Hệ thống hiển thị tổng chi phí tạm tính của các dịch vụ được chọn. | Bác sĩ | **M** | UC-23<br>BR-20, BR-25 |
| **FR-32** | Snapshot Đơn giá dịch vụ niêm yết bất biến | Khi Bác sĩ nhấn "Xác nhận chỉ định & Chuyển phòng CLS", hệ thống snapshot đơn giá niêm yết hiện tại của dịch vụ vào cột `unit_price` của bảng `visit_service_details`. Đơn giá này bất biến kể cả khi sau này Admin thay đổi bảng giá. | Hệ thống | **M** | UC-23<br>BR-25 |
| **FR-33** | Đẩy phiếu chỉ định liên phòng & Giải phóng Bác sĩ | Hệ thống lưu các dòng chỉ định dịch vụ kỹ thuật ở trạng thái `PENDING`, tự động đẩy phiếu vào hàng đợi phòng Lab và phòng CĐHA tương ứng; cập nhật `pet_visits.status = 'WAITING_RESULTS'`, **giải phóng trạng thái Bác sĩ về `AVAILABLE`** để đón ca khám mới từ sảnh mà không bị lãng phí thời gian chờ kết quả. | Hệ thống | **M** | UC-23<br>BR-12 |
| **FR-34** | Hủy ca khám tại phòng GĐ 1 do chuyển viện | Nếu trong lúc thăm khám phát hiện thú cưng bị bệnh quá nặng cần chuyển viện chuyên khoa tuyến trên hoặc chủ nuôi từ chối tiếp tục điều trị: Cho phép Bác sĩ bấm "Hủy ca / Chuyển viện cấp cứu", cập nhật `pet_visits.status = 'CANCELLED'`, ghi rõ lý do và giải phóng Bác sĩ về `AVAILABLE`. | Bác sĩ | **S** | UC-22_23 |

---

### Phân hệ 6: Quản lý & Thực hiện Cận lâm sàng (Lab & CĐHA)

| Mã FR | Tên Yêu cầu Chức năng | Mô tả chi tiết hành vi hệ thống | Tác nhân | Ưu tiên | Use Case / Quy tắc |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **FR-35** | Quản lý 2 Hàng đợi Cận lâm sàng độc lập | Hệ thống duy trì 2 hàng đợi thực hiện chuyên môn riêng biệt: Hàng đợi Phòng Xét nghiệm (Lab) và Hàng đợi Phòng Chẩn đoán hình ảnh (CĐHA). Hai phòng hoạt động hoàn toàn song song, không phòng nào bị khóa hay phụ thuộc cứng vào phòng kia. | LAB_TECHNICIAN, IMAGING_TECHNICIAN | **M** | UC-25, UC-26 |
| **FR-36** | Điều phối ca có chỉ định đồng thời cả 2 phòng | Đối với ca khám được chỉ định cả Xét nghiệm và Chẩn đoán hình ảnh: Hệ thống hướng dẫn khách lấy máu bên phòng Lab trước (2-3 phút); trong lúc máy phân tích huyết học chạy tự động (15-20 phút), khách đưa thú cưng sang phòng CĐHA siêu âm/chụp X-quang (10-15 phút). Màn hình CĐHA hiển thị huy hiệu liên phòng: `[Đang lấy máu bên phòng Lab]` hoặc `[Đã lấy máu, sẵn sàng chụp]`. | Hệ thống, LAB_TECHNICIAN, IMAGING_TECHNICIAN | **M** | UC-25_26 |
| **FR-37** | Tiếp nhận & Bắt đầu làm dịch vụ kỹ thuật | Kỹ thuật viên bấm nút "Mời vào phòng" (hệ thống gửi thông báo gọi lượt, dịch vụ vẫn `PENDING`). Khi thú cưng bước vào phòng lấy ven hoặc lên bàn chụp, nhân viên bấm "Bắt đầu thực hiện", dịch vụ chuyển sang `IN_PROGRESS` để bắt đầu tiêu hao vật tư. | LAB_TECHNICIAN, IMAGING_TECHNICIAN | **M** | UC-25_26 |
| **FR-38** | Cơ chế Quản lý ca vắng mặt tại phòng CLS (Missed Turn) | Nếu thông báo gọi 3 lần khách không có mặt, nhân viên bấm "Tạm hoãn do vắng mặt": Dịch vụ giữ nguyên `PENDING`, rút khỏi hàng đợi chính đưa vào tab *"Ca tạm hoãn do vắng mặt"*, gọi ca tiếp theo ngay để không làm treo phòng máy; đồng thời gửi tin nhắn thông báo đến điện thoại chủ nuôi. | LAB_TECHNICIAN, IMAGING_TECHNICIAN | **M** | UC-25_26<br>EX-06 |
| **FR-39** | Kích hoạt lại ca tạm hoãn khi khách quay lại (Recall) | Khi khách hàng quay lại và báo có mặt (hoặc bấm "Tôi đã có mặt" trên ứng dụng): Dịch vụ đổi màu xanh nhấp nháy, tự động ghim vào vị trí **"Ưu tiên kế tiếp" (Next In Line)**. Nhân viên bấm Recall để mời vào phòng ngay sau khi kết thúc ca đang làm dở. | LAB_TECHNICIAN, IMAGING_TECHNICIAN | **M** | UC-25_26<br>EX-07 |
| **FR-40** | Nhập kết quả Xét nghiệm & Đối chiếu tham chiếu loài | Kỹ thuật viên nhập các chỉ số đo đạc từ máy in xét nghiệm (WBC, RBC, HGB, PLT...). Hệ thống tự động lấy khoảng tham chiếu sinh lý của loài tương ứng (Chó/Mèo) để đánh giá và bôi màu trực quan: Thấp `LOW` (Vàng), Bình thường `NORMAL` (Xanh lá), Cao `HIGH` (Đỏ cảnh báo nguy hiểm). | LAB_TECHNICIAN | **M** | UC-25_26<br>BR-23 |
| **FR-41** | Snapshot Khoảng tham chiếu sinh lý bất biến | Khi lưu kết quả xét nghiệm, hệ thống sao lưu cố định `min_value` và `max_value` tại thời điểm xét nghiệm vào từng dòng kết quả `lab_test_results`. Đảm bảo tính pháp lý lịch sử không bị ảnh hưởng nếu sau này cấu hình tham chiếu thay đổi. | Hệ thống | **M** | UC-25_26<br>BR-24 |
| **FR-42** | Tải ảnh đính kèm & Nhập kết luận Chẩn đoán hình ảnh | Kỹ thuật viên / Bác sĩ CĐHA tải các tệp ảnh chụp thực tế (X-quang, Siêu âm định dạng JPG/PNG/DICOM) lên hệ thống, nhập mô tả giải phẫu, nhận xét hình thái học và kết luận chẩn đoán hình ảnh. Lưu vào `imaging_results` và `imaging_attachments`. | IMAGING_TECHNICIAN | **M** | UC-25_26 |
| **FR-43** | Xử lý Khách xin hủy 1 trong 2 dịch vụ cận lâm sàng | Nếu khách hàng xin hủy dịch vụ chụp X-quang vì thú cưng quá hung dữ hoặc không đủ kinh phí: Nhân viên chọn "Hủy dịch vụ" kèm lý do $\rightarrow$ Dịch vụ chuyển sang `CANCELLED`. Hệ thống kiểm tra các dịch vụ còn lại (xét nghiệm máu) đã `COMPLETED` thì tự động kích hoạt ca có kết quả; **Hóa đơn viện phí chỉ tính tiền dịch vụ đã làm thực tế**. | LAB_TECHNICIAN, IMAGING_TECHNICIAN, Hệ thống | **M** | UC-25_26<br>EX-08 |
| **FR-44** | Đánh giá hoàn tất cận lâm sàng & Kích hoạt Khóa ưu tiên | Mỗi khi một dịch vụ chuyển `COMPLETED` hoặc `CANCELLED`, hệ thống kiểm tra: Nếu `COUNT(*) WHERE status IN ('PENDING', 'IN_PROGRESS') == 0`, tự động cập nhật `pet_visits.status = 'RESULTS_READY'`, tự động đẩy ca vào Hàng đợi ưu tiên của Bác sĩ khám chính, hiển thị Notification Badge trên màn hình Bác sĩ và kích hoạt **Khóa ưu tiên (Priority Lock)**. | Hệ thống | **M** | UC-25_26<br>BR-11, BR-12 |
| **FR-45** | Xử lý Khách bỏ về giữa chừng khi chưa có kết quả | Nếu khách hàng tự ý bỏ về khi máy chưa chạy xong kết quả và Lễ tân gọi điện xác nhận khách không quay lại: Lễ tân thực hiện hủy đợt khám $\rightarrow$ `pet_visits.status = 'CANCELLED'`. | Lễ tân | **S** | UC-25_26 |

---

### Phân hệ 7: Hội chẩn Kết quả, Chẩn đoán Xác định & Kê đơn (GĐ 2)

| Mã FR | Tên Yêu cầu Chức năng | Mô tả chi tiết hành vi hệ thống | Tác nhân | Ưu tiên | Use Case / Quy tắc |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **FR-46** | Bác sĩ đón ca có kết quả vào phòng (GĐ 2) | Bác sĩ vừa kết thúc ca trước, trên màn hình hiển thị hộp thoại nổi bật ca tái khám có kết quả. Bác sĩ bấm "Mời bệnh nhân vào phòng": Hệ thống hiển thị thông báo mời vào phòng trên màn hình Bác sĩ và ứng dụng, cập nhật `pet_visits.status = 'IN_PROGRESS'` (Giai đoạn 2), chuyển Bác sĩ sang `BUSY` và mở Bệnh án tổng hợp. | Bác sĩ | **M** | UC-30<br>BR-12 |
| **FR-47** | Xử lý Gọi lại GĐ 2 nhưng Khách vắng mặt | Nếu thông báo gọi 2-3 lần khách chưa vào (do khách ra ngoài nghe điện thoại): Bác sĩ bấm nút *"Tạm hoãn / Gọi ca tiếp"*. Ca khám được giữ ở `RESULTS_READY` và chuyển sang tab chờ của Bác sĩ; **Hệ thống giải phóng trạng thái Bác sĩ về `AVAILABLE`** để Lễ tân có thể phân ca mới từ sảnh, tránh làm treo phòng khám. Khi khách quay lại, Bác sĩ bấm Recall. | Bác sĩ | **M** | UC-30<br>EX-10 |
| **FR-48** | Xử lý Khách bỏ về hẳn không quay lại đọc kết quả | Nếu khách bỏ về hẳn không quay lại: Bác sĩ hoặc Lễ tân chọn thao tác *"Đóng ca / Khách bỏ về"*. Hệ thống cập nhật `pet_visits.status = 'COMPLETED'` (khóa vĩnh viễn kết quả vào lịch sử bệnh án), đồng thời tự động tạo Hóa đơn viện phí ở trạng thái `PENDING` (ghi nhận nợ viện phí đối với các dịch vụ cận lâm sàng đã làm để thu bù lần sau), giải phóng Bác sĩ. | Bác sĩ, Lễ tân | **M** | UC-30<br>EX-11 |
| **FR-49** | Màn hình Bệnh án điện tử Tổng hợp đa chiều | Giao diện Giai đoạn 2 tổng hợp đầy đủ trên một màn hình: Các chỉ số sinh hiệu đo ở GĐ 1, bảng chỉ số xét nghiệm máu có tô màu cảnh báo bất thường, hình ảnh chụp X-quang/siêu âm thu phóng được và nhận xét hình thái học. | Bác sĩ | **M** | UC-30 |
| **FR-50** | Ghi nhận Chẩn đoán xác định & Phác đồ điều trị | Cho phép Bác sĩ tổng hợp kết quả cận lâm sàng với triệu chứng lâm sàng ban đầu; nhập Chẩn đoán xác định, Phác đồ điều trị và Lời dặn dò chế độ chăm sóc cho chủ nuôi. | Bác sĩ | **M** | UC-30<br>BR-20 |
| **FR-51** | Kê đơn thuốc điện tử (Electronic Prescription) | Cho phép Bác sĩ tìm kiếm thuốc trong danh mục tủ thuốc phòng khám, hiển thị hoạt chất, đơn vị tính, đơn giá bán và số lượng tồn kho khả dụng hiện tại. Bác sĩ nhập số lượng kê, liều lượng, tần suất và số ngày sử dụng. | Bác sĩ | **M** | UC-31<br>BR-18, BR-20 |
| **FR-52** | Kiểm soát Giới hạn tồn kho khả dụng khi kê đơn | Hệ thống tự động kiểm tra số lượng kê so với tồn kho khả dụng thời gian thực (`stock_quantity >= quantity`). Nếu Bác sĩ nhập số lượng lớn hơn tồn kho thực tế, hệ thống cảnh báo và chặn lưu, yêu cầu giảm số lượng hoặc kê loại thuốc thay thế. | Hệ thống | **M** | UC-31<br>BR-30, EX-13 |
| **FR-53** | Snapshot Đơn giá bán thuốc bất biến | Khi Bác sĩ nhấn "Lưu đơn thuốc", hệ thống snapshot đơn giá bán hiện tại của từng loại thuốc vào cột `unit_price` của bảng `prescription_items`, tự động tính thành tiền. Đơn giá này bất biến kể cả khi giá thuốc sau này thay đổi. | Hệ thống | **M** | UC-31<br>BR-26 |
| **FR-54** | Chốt đợt khám & Khóa hồ sơ bệnh án chuyên môn 1 chiều | Bác sĩ giải thích tình trạng bệnh cho chủ nuôi, hướng dẫn dùng thuốc và nhấn "Chốt đợt khám / Chuyển thanh toán". Hệ thống cập nhật `closed_at = NOW()`, cập nhật `pet_visits.status = 'WAITING_PAYMENT'`, **khóa toàn bộ quyền chỉnh sửa chuyên môn của bệnh án**, giải phóng Bác sĩ về `AVAILABLE` và đẩy ca sang màn hình Thu ngân. | Bác sĩ | **M** | UC-30_33<br>BR-27 |

---

### Phân hệ 8: Viện phí, Hóa đơn Thanh toán & Xuất thuốc Trừ kho

| Mã FR | Tên Yêu cầu Chức năng | Mô tả chi tiết hành vi hệ thống | Tác nhân | Ưu tiên | Use Case / Quy tắc |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **FR-55** | Tự động tổng hợp Bảng kê viện phí tạm tính | Khi ca khám chuyển sang `WAITING_PAYMENT`, hệ thống tự động tổng hợp chi tiết viện phí: Tiền công khám + Tiền các dịch vụ cận lâm sàng đã hoàn thành + Tiền thuốc kê theo đơn. Tách biệt rõ ràng hai khoản mục: Dịch vụ kỹ thuật và Thuốc men. | Hệ thống | **M** | UC-34<br>BR-19, BR-21 |
| **FR-56** | Áp dụng Chiết khấu / Khuyến mại viện phí | Thu ngân kiểm tra bảng kê cùng khách hàng. Nếu có chính sách ưu đãi, Thu ngân nhập số tiền giảm giá (`discount_amount`). Hệ thống kiểm tra điều kiện canh: `discount_amount <= total_amount` (nếu vượt quá, cảnh báo lỗi và chặn lưu, EX-14). Tính `final_amount = total_amount - discount_amount`. | Thu ngân | **M** | UC-34<br>EX-14 |
| **FR-57** | Xác nhận thanh toán viện phí | Khách hàng thực hiện thanh toán viện phí bên ngoài quầy (tiền mặt hoặc chuyển khoản riêng). Sau khi khách thanh toán xong, Lễ tân/Thu ngân chỉ cần nhấn nút "Xác nhận thanh toán" trên hệ thống (chưa cần tích hợp chọn phương thức thanh toán). | Thu ngân | **M** | UC-35 |
| **FR-58** | In Phiếu tạm tính & Hóa đơn viện phí chính thức | Cho phép Thu ngân in Bảng kê chi phí tạm tính để khách hàng đối chiếu trước khi chuyển tiền; và in Hóa đơn thanh toán chính thức có mã duy nhất (`INV-YYYY-XXXX`) sau khi thu tiền thành công. | Thu ngân | **M** | UC-34, UC-35 |
| **FR-59** | Xác nhận thanh toán Hóa đơn viện phí | Thu ngân nhấn "Xác nhận thanh toán": Hệ thống cập nhật `invoices.payment_status = 'PAID'`, ghi nhận `paid_at = NOW()` và `cashier_id = :id`. Mở khóa quyền xuất thuốc tại tủ thuốc phòng khám. | Thu ngân | **M** | UC-35<br>BR-19, BR-27 |
| **FR-60** | Tự động hoàn tất Ca khám không kê đơn thuốc | Đối với các ca khám nhẹ thuần túy dịch vụ hoặc tiêm phòng không kê đơn thuốc mang về: Ngay sau khi thanh toán hóa đơn thành công ở Bước 59, hệ thống tự động cập nhật `pet_visits.status = 'COMPLETED'` và ghi nhận `completed_at = NOW()` mà không cần qua bước phát thuốc. | Hệ thống | **M** | UC-35<br>BR-28 |
| **FR-61** | Mở màn hình Chuẩn bị thuốc theo đơn | Sau khi hóa đơn `PAID`, trên màn hình Lễ tân hiển thị chi tiết đơn thuốc cần cấp: Tên thuốc, hoạt chất, số lượng cần lấy, liều dùng và hướng dẫn cách uống/bôi. | Lễ tân | **M** | UC-36<br>BR-28 |
| **FR-62** | Lễ tân kiểm tra & Chuẩn bị thuốc từ tủ thuốc | Lễ tân mở tủ thuốc phòng khám, lấy đúng chủng loại và đủ số lượng thuốc theo đơn, kiểm tra hạn sử dụng trên vỉ/lọ, dán nhãn hướng dẫn liều dùng và bàn giao cho chủ nuôi. | Lễ tân | **M** | UC-36<br>BR-28 |
| **FR-63** | Giao dịch Xuất thuốc & Trừ kho tự động an toàn | Lễ tân nhấn "Xác nhận xuất thuốc & Hoàn tất ca khám". Hệ thống thực thi giao dịch an toàn (`@Transactional`): Kiểm tra tồn kho khả dụng $\rightarrow$ Trừ `medicines.stock_quantity` $\rightarrow$ Ghi bản ghi `inventory_transactions` (`EXPORT_PRESCRIPTION`) $\rightarrow$ Cập nhật `prescriptions.status = 'DISPENSED'` $\rightarrow$ Cập nhật `pet_visits.status = 'COMPLETED'` (`completed_at = NOW()`). Đợt khám được lưu vĩnh viễn vào Bệnh án điện tử. | Hệ thống | **M** | UC-36<br>BR-28, BR-29 |
| **FR-64** | Xử lý Thiếu tồn kho thực tế tại thời điểm xuất (Race Condition) | Nếu số lượng tồn kho thực tế bị thiếu hụt so với đơn kê tại đúng thời điểm bấm nút xuất (do ca cấp cứu khác vừa xuất hết): Hệ thống tự động **Rollback toàn bộ giao dịch**, giữ nguyên tồn kho, cảnh báo lỗi chi tiết để Lễ tân báo Bác sĩ đổi thuốc hoặc bổ sung kho kịp thời. | Hệ thống | **M** | UC-36<br>BR-30, EX-15 |
| **FR-65** | Chống Xuất kho lặp lại (Double-Dispensing) | Nếu người dùng vô tình bấm xuất thuốc 2 lần hoặc cố tình xuất lại một đơn đã cấp: Hệ thống phát hiện `prescriptions.status = 'DISPENSED'`, lập tức chặn đứng thao tác và thông báo: *"Đơn thuốc này đã được xuất kho trước đó"*. Ngăn chặn triệt để thất thoát thuốc. | Hệ thống | **M** | UC-36<br>BR-31, EX-16 |
| **FR-66** | Quản lý Nhập kho & Cân chỉnh kho thuốc | Cho phép Quản trị viên thực hiện nhập thêm thuốc mới vào kho (`transaction_type = 'IMPORT'`, tăng tồn kho `+`) và cân chỉnh kho sau kiểm kê thực tế phát hiện hao hụt, hư hỏng hoặc hết hạn (`ADJUSTMENT`, tăng hoặc giảm `+/-`). | Admin | **M** | UC-04 |

---

### Phân hệ 9: Tra cứu Bệnh án Điện tử & Báo cáo Thống kê

| Mã FR | Tên Yêu cầu Chức năng | Mô tả chi tiết hành vi hệ thống | Tác nhân | Ưu tiên | Use Case / Quy tắc |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **FR-67** | Tra cứu Lịch sử bệnh án điện tử trọn đời của Thú cưng | Cho phép Bác sĩ và Lễ tân tra cứu toàn bộ các đợt khám trong quá khứ của một thú cưng theo thời gian (Timeline): ngày khám, bác sĩ phụ trách, chẩn đoán xác định, kết quả xét nghiệm máu chi tiết, ảnh chụp X-quang/siêu âm và đơn thuốc đã cấp. Dữ liệu bệnh án không bao giờ bị xóa. | Bác sĩ, Lễ tân | **M** | UC-22<br>BR-15 |
| **FR-68** | Cổng thông tin Tra cứu Bệnh án cho Chủ nuôi (Portal) | Cho phép Chủ thú cưng đăng nhập tài khoản cá nhân, xem hồ sơ danh sách thú cưng của mình và tra cứu đầy đủ kết quả khám bệnh, hình ảnh chẩn đoán và hướng dẫn dùng thuốc điện tử trao tay mọi lúc mọi nơi. | Chủ nuôi | **S** | UC-15 |
| **FR-69** | Báo cáo Thống kê Doanh thu phòng khám | Cho phép Admin xem báo cáo doanh thu theo ngày, tuần, tháng, quý hoặc khoảng thời gian tùy chọn; phân rã doanh thu chi tiết theo 2 nguồn: Doanh thu Dịch vụ kỹ thuật và Doanh thu Bán thuốc; thống kê doanh thu theo thời gian và trạng thái hóa đơn. | Admin | **M** | UC-08 |
| **FR-70** | Báo cáo Hiệu suất vận hành phòng khám | Cho phép Admin xem các chỉ số vận hành: Tổng số lượt khám, tỷ lệ ca khám thông thường vs ca có làm cận lâm sàng, số ca hoàn tất (`COMPLETED`), số ca hủy (`CANCELLED`), tỷ lệ bỏ hẹn (`NO_SHOW`) và số lượng ca khám phụ trách của từng Bác sĩ. | Admin | **S** | UC-08 |

---

## 3. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)

> **Mục tiêu:** Tập trung vào các yêu cầu chất lượng phần mềm thực tế, cốt lõi, phù hợp với phạm vi Đồ án Tốt nghiệp ngành Công nghệ Thông tin; loại bỏ các chỉ số đo lường doanh nghiệp phức tạp (P95/P99, stress test quy mô lớn) để tập trung vào tính khả thi, tính toàn vẹn dữ liệu, hiệu năng cơ bản và bảo mật hệ thống.

---

### Danh mục 8 Yêu cầu Phi chức năng chuẩn Đồ án Tốt nghiệp

| Mã NFR | Nhóm Yêu cầu | Mô tả chi tiết yêu cầu kỹ thuật | Giải pháp kỹ thuật / Tiêu chí nghiệm thu đồ án |
| :---: | :--- | :--- | :--- |
| **NFR-01** | **Hiệu năng cơ bản (Performance)** | Các thao tác cơ bản như tra cứu hồ sơ khách hàng, tải danh sách hàng đợi khám, mở hồ sơ bệnh án và tìm kiếm danh mục thuốc/dịch vụ phản hồi nhanh chóng, không gây trễ hoặc đơ giao diện. | Thời gian phản hồi $\le 2.0\text{ giây}$ cho các thao tác tải trang và truy vấn dữ liệu thông thường trong môi trường mạng thử nghiệm/demo. |
| **NFR-02** | **Bảo mật tài khoản & Xác thực (Authentication)** | Bảo mật thông tin đăng nhập của người dùng. Mật khẩu không được lưu dưới dạng văn bản thô (plaintext). Phiên làm việc được quản lý bằng Token an toàn, có thời hạn và tự động hết hạn khi đăng xuất. | Sử dụng thuật toán **BCrypt** để băm mật khẩu người dùng trước khi lưu vào CSDL; áp dụng cơ chế xác thực không trạng thái qua **JSON Web Token (JWT)**. |
| **NFR-03** | **Phân quyền người dùng (Role-Based Access Control - RBAC)** | Hệ thống phân quyền chặt chẽ theo 6 vai trò người dùng (`ADMIN`, `RECEPTIONIST`, `VETERINARIAN`, `LAB_TECHNICIAN`, `IMAGING_TECHNICIAN`, `PET_OWNER`). Mỗi vai trò chỉ được phép truy cập và thực hiện đúng các chức năng thuộc phạm vi quyền hạn của mình. | Chặn quyền tại cả tầng Frontend (ẩn/hiện menu, nút bấm) và tầng Backend (kiểm tra token/role trước khi xử lý request API). |
| **NFR-04** | **Toàn vẹn giao dịch (ACID Transactions)** | Các nghiệp vụ cập nhật dữ liệu quan trọng liên quan đến tài chính và kho hàng (xác nhận thanh toán, xuất thuốc trừ kho, hoàn tất ca khám) bắt buộc phải đảm bảo tính nguyên tử (Atomicity). Nếu có lỗi phát sinh giữa chừng, toàn bộ giao dịch phải được khôi phục về trạng thái ban đầu. | Sử dụng cơ chế quản lý giao dịch CSDL (`@Transactional` trong Spring Boot hoặc Transactions trong NodeJS/SQL) để đảm bảo rollback an toàn 100%. |
| **NFR-05** | **Giao diện thân thiện & Công thái học (Usability & Responsive)** | Giao diện đồ họa trực quan, hiện đại, dễ thao tác cho nhân viên phòng khám; cung cấp thông báo rõ ràng khi thao tác thành công hoặc khi xảy ra lỗi dữ liệu; hỗ trợ hiển thị tốt trên màn hình máy tính để bàn (nhân viên) và tương thích thiết bị di động (khách hàng xem Portal). | Bố cục trực quan, thông báo Toast/Alert rõ ràng; áp dụng Responsive Layout (Desktop cho nghiệp vụ phòng khám, Mobile-friendly cho Customer Portal). |
| **NFR-06** | **Tính toàn vẹn & Bất biến của Bệnh án (Data Integrity)** | Đảm bảo tính pháp lý và lịch sử điều trị: Đơn giá dịch vụ, đơn giá thuốc và kết quả xét nghiệm được lưu cố định (snapshot) tại thời điểm khám; hồ sơ bệnh án sau khi bác sĩ chốt và hoàn tất đợt khám sẽ bị khóa chỉnh sửa chuyên môn để đảm bảo toàn vẹn dữ liệu. | Snapshot giá và tham chiếu vào bảng chi tiết giao dịch; khóa trạng thái `is_locked` hoặc chặn cập nhật chuyên môn khi ca khám đã `COMPLETED`. |
| **NFR-07** | **Kiến trúc module hóa & Dễ bảo trì (Maintainability)** | Mã nguồn được tổ chức theo kiến trúc phân tầng rõ ràng (Controller - Service - Repository) hoặc kiến trúc Microservices theo từng miền nghiệp vụ (Bounded Context); cấu trúc CSDL đạt chuẩn hóa 3NF, có quan hệ khóa ngoại chặt chẽ, dễ đọc hiểu và mở rộng tính năng mới. | Tách biệt rõ ràng tầng nghiệp vụ và tầng truy xuất dữ liệu; chuẩn hóa CSDL 3NF, loại bỏ dữ liệu dư thừa bất hợp lý. |
| **NFR-08** | **Khả năng triển khai & Đóng gói (Portability & Deployment)** | Ứng dụng dễ dàng cấu hình, đóng gói và chạy thử nghiệm trên các máy tính khác nhau phục vụ hội đồng chấm và đánh giá đồ án mà không gặp xung đột môi trường phức tạp. | Hỗ trợ cấu hình chạy qua **Docker / Docker Compose** (đóng gói Backend, Frontend, MySQL/PostgreSQL); chạy tốt trên các trình duyệt web hiện đại (Chrome, Edge, Firefox). |

---

## 4. MA TRẬN TRUY VẾT YÊU CẦU TỔNG HỢP (REQUIREMENTS TRACEABILITY MATRIX - RTM)

Bảng ma trận truy vết dưới đây thiết lập mối liên kết hai chiều khép kín (Bidirectional Traceability) giữa các **Yêu cầu Chức năng (FR)** với **Ca sử dụng (Use Case)**, **Bảng CSDL (`schema_init.sql`)**, **Sơ đồ Trạng thái (State Machine)**, **Sơ đồ Hoạt động (Activity Diagram)** và **Ngoại lệ xử lý (Exception)**:

| Nhóm Phân hệ | Mã FR | Use Case liên quan | Bảng CSDL lưu trữ chính | State Machine liên quan | Activity Diagram | Mã Ngoại lệ xử lý |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: |
| **1. Quản trị & Danh mục** | FR-01 $\rightarrow$ FR-07 | UC-01 $\rightarrow$ UC-07 | `users`, `roles`, `services`, `medicines`, `lab_test_items`, `lab_test_reference_ranges`, `species` | - | - | - |
| **2. Khách hàng & Thú cưng** | FR-08 $\rightarrow$ FR-11 | UC-18 | `users`, `pets` | - | AD-02 | - |
| **3. Lịch hẹn khám** | FR-12 $\rightarrow$ FR-18 | UC-14 $\rightarrow$ UC-17 | `appointments`, `appointment_status_histories` | `appointments` (SM-04) | AD-02 | EX-01, EX-02 |
| **4. Tiếp đón & Hàng đợi** | FR-19 $\rightarrow$ FR-26 | UC-18 $\rightarrow$ UC-21 | `pet_visits`, `appointments` | `pet_visits` (`WAITING`)<br>`doctor_serving_status` (SM-02) | AD-01, AD-02 | EX-03, EX-04, EX-05 |
| **5. Khám lâm sàng GĐ 1** | FR-27 $\rightarrow$ FR-34 | UC-22, UC-23 | `pet_visits`, `visit_service_details` | `pet_visits` (`IN_PROGRESS_1` $\rightarrow$ `WAITING_RESULTS`) | AD-01, AD-03 | EX-03, EX-12 |
| **6. Cận lâm sàng (Lab & CĐHA)**| FR-35 $\rightarrow$ FR-45 | UC-25, UC-26 | `visit_service_details`, `lab_test_results`, `imaging_results`, `imaging_attachments` | `visit_service_details` (SM-03)<br>`pet_visits` (`RESULTS_READY`) | AD-01, AD-04 | EX-06, EX-07, EX-08, EX-09 |
| **7. Hội chẩn & Kê đơn GĐ 2** | FR-46 $\rightarrow$ FR-54 | UC-30, UC-31, UC-33 | `pet_visits`, `prescriptions`, `prescription_items` | `pet_visits` (`IN_PROGRESS_2` $\rightarrow$ `WAITING_PAYMENT`)<br>`prescriptions` (SM-06) | AD-01, AD-05 | EX-10, EX-11, EX-13 |
| **8. Viện phí & Xuất thuốc** | FR-55 $\rightarrow$ FR-66 | UC-34, UC-35, UC-36 | `invoices`, `invoice_items`, `prescriptions`, `medicines`, `inventory_transactions` | `invoices` (SM-05)<br>`prescriptions` (SM-06)<br>`pet_visits` (`COMPLETED`) | AD-01, AD-06 | EX-14, EX-15, EX-16 |
| **9. Bệnh án & Báo cáo** | FR-67 $\rightarrow$ FR-70 | UC-08, UC-15, UC-22 | Toàn bộ 23 bảng CSDL | Toàn bộ 6 State Machines | AD-01 | - |

---

## 5. TỔNG KẾT BÀN GIAO TÀI LIỆU

- **Tổng số Yêu cầu Chức năng (FR):** **70 Yêu cầu** (được định lượng chi tiết từ `FR-01` đến `FR-70`, bao phủ 100% chu trình khám chữa bệnh ngoại trú, quản trị danh mục và vận hành phòng khám).
- **Tổng số Yêu cầu Phi chức năng (NFR):** **8 Yêu cầu** (tinh gọn, thực dụng, tập trung vào các tiêu chí cốt lõi: Hiệu năng cơ bản, Bảo mật BCrypt/JWT, Phân quyền RBAC 6 vai trò, Toàn vẹn giao dịch ACID, Usability, Toàn vẹn bệnh án, Kiến trúc module hóa và Đóng gói Docker phục vụ Đồ án Tốt nghiệp).
- **Tính nhất quán chéo:** Khớp 100% với 23 bảng CSDL (`schema_init.sql`), 13 kiểu Enum (`DANH_SACH_KIEU_ENUM_HE_THONG.md`), 6 Sơ đồ Trạng thái (`THIET_KE_SO_DO_TRANG_THAI_STATE_MACHINE.md`), 6 Sơ đồ Hoạt động (`THIET_KE_SO_DO_HOAT_DONG_ACTIVITY.md`) và 16 ngoại lệ nghiệp vụ (`TONG_HOP_NGOAI_LE_VA_XU_LY_HE_THONG.md`).
