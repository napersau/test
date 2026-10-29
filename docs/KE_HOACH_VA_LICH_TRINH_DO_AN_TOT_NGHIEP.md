# KẾ HOẠCH & LỊCH TRÌNH TOÀN DIỆN THỰC HIỆN ĐỒ ÁN TỐT NGHIỆP
## ĐỀ TÀI: HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y

> **Thời gian thực hiện toàn khóa:** 24/08/2026 – 20/11/2026 (Tổng cộng **13 tuần / 89 ngày**)  
> **Mốc bắt đầu:** Ngày 24/08/2026  
> **Thời điểm hiện tại:** Ngày 12/10/2026 (Bắt đầu Tuần thứ 8)  
> **Mốc đích đến (Target Milestone):** Ngày 20/11/2026 – Nộp bản thảo Báo cáo hoàn chỉnh + Demo sản phẩm chạy mượt mà để Giảng viên hướng dẫn (GVHD) nghiệm thu duyệt bảo vệ trước Hội đồng.  
> **Kiến trúc áp dụng:** Microservices Architecture (Spring Cloud Ecosystem, RabbitMQ, MySQL, React Vite, Docker Compose).

---

## 1. Thông tin Chung & Ma trận Phân công Trách nhiệm (RACI Matrix)

### 1.1. Danh sách Thành viên & Vai trò Chính
1. **Lưu Minh Hiển (Trưởng nhóm):**
   - Chịu trách nhiệm: Quản lý tiến độ chung, Khảo sát & Phân tích nghiệp vụ, Kiến trúc hệ thống, Backend Engineer (Phân hệ Đặt lịch & Khám lâm sàng), Viết báo cáo & Tổng duyệt.
2. **Nguyễn Đức Khởi (Thành viên):**
   - Chịu trách nhiệm: Phân tích & Thiết kế kỹ thuật, Backend Engineer (Phân hệ Cận lâm sàng, Viện phí, Kho dược & Tích hợp RabbitMQ), Cấu hình hạ tầng Docker Compose, Viết báo cáo kỹ thuật.
3. **Vũ Hồng Linh (Thành viên):**
   - Chịu trách nhiệm: UI/UX Designer, Frontend Engineer (Toàn bộ giao diện React: Khách hàng Portal & Nội bộ Staff), Ghép nối REST API qua Gateway, Kiểm thử giao diện người dùng.

### 1.2. Ma trận Trách nhiệm Toàn khóa (RACI Matrix)
- **R (Responsible):** Người trực tiếp thực hiện.
- **A (Accountable):** Người chịu trách nhiệm phê duyệt cuối cùng (Trưởng nhóm).
- **C (Consulted):** Người được tham vấn chuyên môn.
- **I (Informed):** Người được thông báo kết quả.

| Nhóm Hạng mục Công việc | Lưu Minh Hiển | Nguyễn Đức Khởi | Vũ Hồng Linh |
| :--- | :---: | :---: | :---: |
| **Khảo sát nghiệp vụ, WBS & Lập phạm vi đề tài** | **A / R** | R | R |
| **Đặc tả Yêu cầu (SRS, Use Case, Business Rules)** | **A / R** | R | I |
| **Mô hình hóa Hành vi (State Machine, Activity, Sequence)** | **A / R** | R | C |
| **Thiết kế CSDL (ERD, Data Dictionary, SQL Schema)** | **A / R** | R | C |
| **Thiết kế Giao diện Prototype UI/UX (Figma)** | C | C | **A / R** |
| **Thiết kế Kiến trúc Hệ thống (Microservices Architecture)** | **A / R** | R | I |
| **Thiết lập Hạ tầng (Docker Compose, Eureka, Gateway, RabbitMQ)** | A | **R** | I |
| **Phát triển Backend Microservices (5 Services)** | **R** | **R** | I |
| **Phát triển Frontend Web App (React SPA)** | C | C | **A / R** |
| **Tích hợp Hệ thống & Kiểm thử Chức năng E2E** | **A / R** | R | R |
| **Soạn thảo Cuốn Báo cáo Đồ án (Microsoft Word)** | **A / R** | R | R |
| **Thiết kế Slide Thuyết trình & Chuẩn bị Kịch bản Demo** | **A / R** | R | R |

---

## 2. Bảng Tổng quan Tiến độ Toàn khóa (13 Tuần: 24/08/2026 – 20/11/2026)

| Tuần | Khoảng Thời gian | Giai đoạn | Trọng tâm Công việc | Tình trạng |
| :---: | :---: | :---: | :--- | :---: |
| **Tuần 1** | 24/08 – 30/08/2026 | **Phân tích** | Khảo sát thực tế phòng khám, Xác định đề tài & Phạm vi bài toán | **ĐÃ XONG** |
| **Tuần 2** | 31/08 – 06/09/2026 | **Phân tích** | Cấu trúc phân rã công việc (WBS) & Mô tả quy trình nghiệp vụ | **ĐÃ XONG** |
| **Tuần 3** | 07/09 – 13/09/2026 | **Phân tích** | Xác định Yêu cầu chức năng (FR) & Phi chức năng (NFR) | **ĐÃ XONG** |
| **Tuần 4** | 14/09 – 20/09/2026 | **Phân tích** | Lập sơ đồ Use Case & Đặc tả chi tiết các Use Case cốt lõi | **ĐÃ XONG** |
| **Tuần 5** | 21/09 – 27/09/2026 | **Thiết kế** | Mô hình hóa máy trạng thái (State Machine Diagram) 5 thực thể | **ĐÃ XONG** |
| **Tuần 6** | 28/09 – 04/10/2026 | **Thiết kế** | Sơ đồ Hoạt động phân làn (Activity Diagram) & Tổng hợp Ngoại lệ | **ĐÃ XONG** |
| **Tuần 7** | 05/10 – 11/10/2026 | **Thiết kế** | Thiết kế CSDL (ERD, Data Dictionary), UI/UX Figma & Kiến trúc Microservices | **ĐÃ XONG** |
| **Tuần 8** | **12/10 – 18/10/2026** | **Khởi tạo** | **Sơ đồ Lớp, Tuần tự & Dựng Khung dự án (Docker, Eureka, Gateway, React)** | **ĐANG LÀM** |
| **Tuần 9** | 19/10 – 25/10/2026 | **Sprint 1** | Core Booking & Reception (`auth`, `appointment`, Check-in) + Báo cáo Ch.1,2 | Sắp tới |
| **Tuần 10** | 26/10 – 01/11/2026 | **Sprint 2** | Core Clinical (`clinical-service`: Khám 2 pha, Hàng đợi Lab & CĐHA) | Sắp tới |
| **Tuần 11** | 02/11 – 08/11/2026 | **Sprint 3** | Core Finance & Stock (`billing-pharmacy`, WebSocket realtime) + Báo cáo Ch.3 | Sắp tới |
| **Tuần 12** | 09/11 – 15/11/2026 | **Sprint 4** | Tích hợp hệ thống Gateway, Kiểm thử E2E, Nạp Seed Data + Báo cáo Ch.4,5 | Sắp tới |
| **Tuần 13** | 16/11 – 20/11/2026 | **Về đích** | Tổng duyệt, Slide thuyết trình, Quay Video Demo & Nộp GVHD nghiệm thu | **ĐÍCH ĐẾN** |

---

## 3. Lịch trình Chi tiết Từng Tuần (Week-by-Week Breakdown)

---

### Tuần 1: Khảo sát Thực tế, Xác định Đề tài & Lập Phạm vi (24/08 – 30/08/2026)
- **Mục tiêu tuần:** Xác định đề tài, thống nhất mục tiêu nghiên cứu và khoanh vùng phạm vi bài toán phòng khám thú y.
- **Công việc chi tiết từng thành viên:**
  - **Lưu Minh Hiển (Trưởng nhóm):**
    * Thu thập tài liệu, khảo sát quy trình vận hành thực tế tại các phòng khám thú y đô thị.
    * Xác định đối tượng phục vụ: Khách hàng (Chủ thú cưng) và Nhân sự phòng khám (Bác sĩ, Lễ tân).
    * Phác thảo đề cương sơ bộ của đồ án gửi xin ý kiến định hướng ban đầu của GVHD.
  - **Nguyễn Đức Khởi:**
    * Khảo sát các giải pháp phần mềm quản lý phòng khám hiện có trên thị trường (phân tích điểm mạnh, điểm yếu).
    * Đề xuất phạm vi tập trung vào mô hình khám chữa bệnh ngoại trú (Outpatient Care) để đảm bảo tính khả thi.
  - **Vũ Hồng Linh:**
    * Khảo sát hành vi người dùng: Quy trình khách hàng đặt lịch khám qua điện thoại/web và quy trình tiếp đón tại quầy sảnh.
    * Thu thập mẫu phiếu tiếp nhận, sổ y bạ, phiếu chỉ định xét nghiệm và đơn thuốc thực tế làm tư liệu thiết kế.
- **Kết quả đầu ra (Deliverables):**
  - Bản Đề cương tổng quan đồ án (Project Proposal) được GVHD thông qua.
  - Văn bản thống nhất phạm vi: Tập trung vào khám ngoại trú hai pha, không làm lưu chuồng nội trú phức tạp.

---

### Tuần 2: Phân rã Công việc (WBS) & Mô tả Quy trình Nghiệp vụ (31/08 – 06/09/2026)
- **Mục tiêu tuần:** Chuẩn hóa toàn bộ dòng chảy nghiệp vụ thực tế và xây dựng Cấu trúc Phân rã Công việc (WBS).
- **Công việc chi tiết từng thành viên:**
  - **Lưu Minh Hiển:**
    * Xây dựng Cấu trúc phân rã công việc WBS (Work Breakdown Structure) đa cấp độ cho dự án.
    * Mô tả chi tiết quy trình tiếp đón, check-in, phân công bác sĩ vào phòng khám cố định.
    * Mô tả quy trình khám lâm sàng sơ bộ (Giai đoạn 1) và quy trình hội chẩn chốt ca (Giai đoạn 2).
  - **Nguyễn Đức Khởi:**
    * Mô tả quy trình vận hành cận lâm sàng song song: Hàng đợi Phòng Xét nghiệm (Lab) và Hàng đợi Phòng Chẩn đoán hình ảnh (CĐHA).
    * Mô tả quy trình tài chính: Lập hóa đơn viện phí, thu tiền thanh toán và quy trình xuất thuốc trừ kho an toàn tại quầy.
  - **Vũ Hồng Linh:**
    * Sơ đồ hóa luồng trải nghiệm người dùng (User Journey Map) cho Chủ thú cưng và Nhân viên tiếp đón.
    * Phân tích các bước thao tác trên màn hình cần thiết cho từng vai trò nghiệp vụ.
- **Kết quả đầu ra (Deliverables):**
  - Bản tài liệu Mô tả nghiệp vụ phòng khám thú y phiên bản đầu tiên (`TAI_LIEU_MO_TA_NGHIEP_VU_PHONG_KHAM_THU_Y.md`).
  - Cây phân rã công việc WBS hoàn chỉnh.

---

### Tuần 3: Danh mục Yêu cầu Chức năng (FR) & Phi chức năng (NFR) (07/09 – 13/09/2026)
- **Mục tiêu tuần:** Đặc tả danh mục yêu cầu hệ thống theo chuẩn công nghiệp và phân loại mức độ ưu tiên MoSCoW.
- **Công việc chi tiết từng thành viên:**
  - **Lưu Minh Hiển:**
    * Xây dựng danh mục Yêu cầu chức năng cho các Phân hệ Quản trị, Hồ sơ Khách hàng & Thú cưng, Đặt lịch hẹn trực tuyến và Điều phối sảnh (FR-01 đến FR-24).
    * Xây dựng danh mục Yêu cầu Khám lâm sàng GĐ 1 và GĐ 2 (FR-25 đến FR-34, FR-46 đến FR-54).
    * Chuẩn hóa 6 vai trò chính thức: `ADMIN`, `VETERINARIAN`, `RECEPTIONIST`, `LAB_TECHNICIAN`, `IMAGING_TECHNICIAN`, `PET_OWNER`.
  - **Nguyễn Đức Khởi:**
    * Xây dựng danh mục Yêu cầu Cận lâm sàng Lab & CĐHA (FR-35 đến FR-45).
    * Xây dựng danh mục Yêu cầu Viện phí, Kê đơn & Kho dược (FR-55 đến FR-66).
    * Thiết lập danh mục Yêu cầu Phi chức năng NFR: Hiệu năng (Performance), Bảo mật (RBAC, BCrypt, JWT, OWASP), Độ tin cậy (ACID Transactions, Snapshot giá).
  - **Vũ Hồng Linh:**
    * Rà soát tính khả thi của các yêu cầu chức năng đối với giao diện người dùng.
    * Phân loại các trường dữ liệu bắt buộc (Validation Rules) trên từng form giao diện.
- **Kết quả đầu ra (Deliverables):**
  - File hoàn chỉnh: `YEU_CAU_CHUC_NANG_VA_PHI_CHUC_NANG.md` gồm đầy đủ 66 Yêu cầu chức năng và 15 Yêu cầu phi chức năng.

---

### Tuần 4: Lập Sơ đồ Use Case & Đặc tả Use Case Cốt lõi (14/09 – 20/09/2026)
- **Mục tiêu tuần:** Xây dựng Sơ đồ Use Case và viết bảng đặc tả chi tiết 2 cột theo chuẩn RUP/IEEE cho toàn bộ các ca sử dụng cốt lõi.
- **Công việc chi tiết từng thành viên:**
  - **Lưu Minh Hiển:**
    * Vẽ Sơ đồ Use Case phân rã theo từng tác nhân (Chủ thú cưng, Lễ tân, Bác sĩ, Kỹ thuật viên).
    * Soạn thảo bảng đặc tả chi tiết cho: UC-14 (Đặt lịch online), UC-15 (Quản lý lịch cá nhân), UC-16 (Đặt lịch tại quầy), UC-17 (Duyệt lịch hẹn), UC-18 (Quản lý hồ sơ), UC-19 (Check-in), UC-20 (Điều phối hàng đợi sảnh), UC-21 (Phân công Bác sĩ).
    * Đặc tả UC-22 & UC-23 (Khám lâm sàng sơ bộ & Chỉ định cận lâm sàng).
  - **Nguyễn Đức Khởi:**
    * Đặc tả UC-25 & UC-26 (Tiếp nhận mẫu, Thực hiện cận lâm sàng Lab & CĐHA, Trả kết quả).
    * Đặc tả UC-30, 31, 33 (Hội chẩn kết quả GĐ 2, Kê đơn thuốc điện tử & Chốt đợt khám).
    * Đặc tả UC-34, 35 (Lập hóa đơn & Thanh toán viện phí) và UC-36 (Xuất thuốc trừ kho an toàn).
    * Xây dựng Ma trận truy vết thực thể nghiệp vụ (CRUD Matrix) và Chỉ mục Quy tắc nghiệp vụ (Business Rules BR-01 đến BR-31).
  - **Vũ Hồng Linh:**
    * Đối chiếu các luồng sự kiện (Luồng chính, Luồng rẽ nhánh, Ngoại lệ) trong Use Case với luồng wireframe giao diện.
- **Kết quả đầu ra (Deliverables):**
  - File hoàn chỉnh: `DAC_TA_USE_CASE_CORE.md` (chuẩn đặc tả RUP/IEEE chi tiết từng bước tương tác).

---

### Tuần 5: Mô hình hóa Máy Trạng thái (State Machine Diagrams) (21/09 – 27/09/2026)
- **Mục tiêu tuần:** Thiết kế sơ đồ máy trạng thái biểu diễn toàn diện vòng đời của các thực thể nghiệp vụ quan trọng.
- **Công việc chi tiết từng thành viên:**
  - **Lưu Minh Hiển:**
    * Thiết kế Sơ đồ trạng thái Lịch hẹn (`APPOINTMENT`: PENDING $\rightarrow$ CONFIRMED $\rightarrow$ CHECKED_IN / CANCELLED).
    * Thiết kế Sơ đồ trạng thái Đợt khám cốt lõi (`PET_VISIT`: WAITING $\rightarrow$ IN_PROGRESS $\rightarrow$ WAITING_RESULTS $\rightarrow$ RESULTS_READY $\rightarrow$ IN_PROGRESS $\rightarrow$ WAITING_PAYMENT $\rightarrow$ COMPLETED).
    * Xây dựng ma trận chuyển đổi trạng thái và logic kích hoạt Khóa ưu tiên (Priority Lock).
  - **Nguyễn Đức Khởi:**
    * Thiết kế Sơ đồ trạng thái Dịch vụ kỹ thuật (`VISIT_SERVICE_DETAIL`: PENDING $\rightarrow$ IN_PROGRESS $\rightarrow$ COMPLETED / CANCELLED).
    * Thiết kế Sơ đồ trạng thái Đơn thuốc (`PRESCRIPTION`: PRESCRIBED $\rightarrow$ DISPENSED / CANCELLED).
    * Thiết kế Sơ đồ trạng thái Hóa đơn viện phí (`INVOICE`: PENDING $\rightarrow$ PAID / CANCELLED).
  - **Vũ Hồng Linh:**
    * Thiết kế bảng màu và nhãn trạng thái (Status Badges) tương ứng trên giao diện (xanh lá, vàng cam, xanh dương, đỏ) đảm bảo tính đồng bộ trực quan.
- **Kết quả đầu ra (Deliverables):**
  - File hoàn chỉnh: `THIET_KE_SO_DO_TRANG_THAI_STATE_MACHINE.md` (chứa 5 sơ đồ Mermaid State Machine chuẩn xác, không có trạng thái thừa).

---

### Tuần 6: Sơ đồ Hoạt động Phân làn (Activity Diagrams) & Xử lý Ngoại lệ (28/09 – 04/10/2026)
- **Mục tiêu tuần:** Mô hình hóa các luồng nghiệp vụ phức tạp bằng biểu đồ phân làn Swimlanes và tổng hợp toàn diện các tình huống ngoại lệ.
- **Công việc chi tiết từng thành viên:**
  - **Lưu Minh Hiển:**
    * Thiết kế AD-01: Chu trình khám chữa bệnh ngoại trú 2 pha tổng thể (6 phân làn trách nhiệm).
    * Thiết kế AD-02: Quy trình tiếp đón, điều phối hàng đợi sảnh & kiểm soát Khóa ưu tiên Bác sĩ.
    * Thiết kế AD-03: Thăm khám lâm sàng GĐ 1 & Ra chỉ định cận lâm sàng.
  - **Nguyễn Đức Khởi:**
    * Thiết kế AD-04: Tiến trình thực hiện cận lâm sàng song song tại 2 phòng Lab & CĐHA (Fork & Join) và cơ chế chống xung đột liên phòng.
    * Thiết kế AD-05: Đón lại ca tái khám GĐ 2, chẩn đoán xác định & kê đơn thuốc.
    * Thiết kế AD-06: Thu ngân viện phí & Xuất thuốc trừ kho an toàn nguyên tử.
    * Biên soạn tài liệu Tổng hợp ngoại lệ hệ thống: Phân tích 15 tình huống ngoại lệ thực tế (EX-01 đến EX-15: vắng mặt, hủy ca, hết thuốc, lỗi mạng...) và giải pháp xử lý.
  - **Vũ Hồng Linh:**
    * Thiết kế các hộp thoại thông báo lỗi (Error Modals) và cảnh báo (Alert Banners) tương ứng với 15 ngoại lệ trên giao diện.
- **Kết quả đầu ra (Deliverables):**
  - File hoàn chỉnh: `THIET_KE_SO_DO_HOAT_DONG_ACTIVITY.md` (6 sơ đồ hoạt động phân làn Swimlane chuẩn).
  - File hoàn chỉnh: `TONG_HOP_NGOAI_LE_VA_XU_LY_HE_THONG.md` (15 ngoại lệ và giải pháp xử lý).

---

### Tuần 7: Thiết kế CSDL (ERD), Prototype UI/UX & Kiến trúc Microservices (05/10 – 11/10/2026)
- **Mục tiêu tuần:** Hoàn thành thiết kế CSDL quan hệ 23 bảng, bộ mã script SQL, prototype UI/UX Figma và kiến trúc Microservices.
- **Công việc chi tiết từng thành viên:**
  - **Lưu Minh Hiển:**
    * Thiết kế Sơ đồ thực thể - mối quan hệ (ERD) chuẩn 3NF gồm 23 bảng.
    * Soạn thảo Từ điển dữ liệu chi tiết (Data Dictionary 23 bảng) và danh mục 13 Kiểu dữ liệu Enum hệ thống.
    * Viết mã nguồn CSDL `schema_init.sql` (bổ sung khóa ngoại `performed_by` cho kết quả xét nghiệm, các bảng audit trail và invoice_items).
  - **Nguyễn Đức Khởi:**
    * Nghiên cứu và thiết kế Kiến trúc hệ thống Microservices: Phân rã 5 service nghiệp vụ + 2 service hạ tầng (Gateway, Eureka), cơ chế giao tiếp OpenFeign / RabbitMQ.
    * Hoàn thiện tài liệu kiến trúc: `THIET_KE_KIEN_TRUC_MICROSERVICES.md`.
  - **Vũ Hồng Linh:**
    * Hoàn thành 100% bản thiết kế giao diện UI/UX trên Figma: Màn hình Portal khách hàng, Màn hình Tiếp đón Lễ tân, Màn hình Bệnh án Bác sĩ 2 pha, Màn hình KTV Lab, Màn hình KTV CĐHA, Màn hình Thu ngân viện phí, Màn hình Quản trị Admin.
- **Kết quả đầu ra (Deliverables):**
  - File hoàn chỉnh: `THIET_KE_CO_SO_DU_LIEU_ERD.md`, `DANH_SACH_KIEU_ENUM_HE_THONG.md`, `schema_init.sql`.
  - File hoàn chỉnh: `THIET_KE_KIEN_TRUC_MICROSERVICES.md`.
  - Link Figma UI/UX Prototype hoàn thiện sẵn sàng cắt giao diện.

---

### Tuần 8: Sơ đồ Lớp, Tuần tự & Khởi tạo Khung Dự án (Skeleton) (12/10 – 18/10/2026) *(HIỆN TẠI)*
- **Mục tiêu tuần:** Hoàn thành Sơ đồ Lớp (Class Diagram), Sơ đồ Tuần tự (Sequence Diagram) và dựng khung hạ tầng kỹ thuật chạy được trên Docker.
- **Công việc chi tiết từng thành viên:**
  - **Lưu Minh Hiển:**
    * Thiết kế **Sơ đồ Lớp chi tiết (Class Diagram)**: Biểu diễn các Entity, Repository, Service và Controller của từng phân hệ.
    * Thiết kế **Sơ đồ Tuần tự (Sequence Diagram)**: Cho 3 luồng phức tạp nhất: (1) Đặt lịch & Thuật toán tính slot động; (2) Chỉ định cận lâm sàng & Xử lý song song; (3) Khóa ưu tiên & Đón ca tái khám GĐ 2.
    * Khởi tạo Git Repository chung, thiết lập quy chuẩn commit và nhánh phát triển (`main`, `develop`, `feature/*`).
  - **Nguyễn Đức Khởi:**
    * Viết file `docker-compose.yml`: Cấu hình container MySQL 8.0 (khởi tạo 4 logical database), RabbitMQ Server (kèm Management UI trên port `15672`), cấu hình Docker Volume lưu ảnh chẩn đoán.
    * Khởi tạo 2 service hạ tầng cốt lõi: `service-registry` (Spring Cloud Eureka Server :8761) và `api-gateway` (Spring Cloud Gateway :8080).
    * Dựng khung dự án `auth-service` (:8081): kết nối DB `pet_clinic_auth_db`, tạo Entity `User`, `Role`.
  - **Vũ Hồng Linh:**
    * Khởi tạo dự án Frontend React (Vite + TailwindCSS / Ant Design).
    * Cấu hình thư viện Axios, cài đặt Interceptor tự động gắn Bearer Token vào Header và xử lý điều hướng khi gặp lỗi 401/403.
    * Xây dựng Layout khung hoàn chỉnh: Header, Sidebar hiển thị menu động theo vai trò (Admin, Bác sĩ, Lễ tân, Kỹ thuật viên, Khách hàng), Auth Route Guards, trang Login.
- **Kết quả đầu ra (Milestone 1 - Ngày 18/10/2026):**
  - Tài liệu Sơ đồ Lớp và Sơ đồ Tuần tự hoàn chỉnh.
  - Toàn bộ khung hạ tầng Backend chạy thành công qua lệnh `docker compose up -d` (MySQL, RabbitMQ, Eureka, Gateway sẵn sàng).
  - Frontend đăng nhập được (dữ liệu mock) và hiển thị đúng Sidebar phân quyền.

---

### Tuần 9: Sprint 1 - Tiếp đón, Đặt lịch & Phân quyền + Báo cáo Ch.1,2 (19/10 – 25/10/2026)
- **Mục tiêu tuần:** Hoàn thành trọn vẹn luồng Đặt lịch trực tuyến và Tiếp đón tại sảnh; hoàn thành Chương 1 & 2 cuốn Báo cáo.
- **Công việc chi tiết từng thành viên:**
  - **Lưu Minh Hiển:**
    * Phát triển `appointment-service` (:8082):
      - CRUD danh mục loài (`species`), hồ sơ thú cưng (`pets`).
      - Nghiệp vụ khách đặt lịch trực tuyến (`appointments`).
      - Cài đặt **Thuật toán tính toán sức chứa slot tiếp nhận động** dựa trên số Bác sĩ `ACTIVE` (gọi OpenFeign sang `auth-service`).
    * Viết cuốn Báo cáo đồ án: **Phần mở đầu (Lời cam đoan, Lời cảm ơn, Mục lục) và Chương 1 (Tổng quan đề tài & Nghiệp vụ phòng khám thú y)**.
  - **Nguyễn Đức Khởi:**
    * Hoàn thiện `auth-service` (:8081):
      - Đăng ký, đăng nhập, mã hóa BCrypt, cấp phát cặp JWT Access Token (TTL 30 phút) & Stateful Refresh Token (TTL 7 ngày) có Token Rotation.
      - Quản lý tài khoản nhân sự nội bộ, phân bổ số phòng làm việc cố định (`room_number`).
    * Phát triển API Tiếp đón tại quầy: Tiếp nhận lịch hẹn $\rightarrow$ Check-in $\rightarrow$ Khởi tạo Đợt khám (`pet_visits` ở trạng thái `WAITING`) hoặc đón tiếp khách vãng lai (Walk-in).
    * Viết cuốn Báo cáo đồ án: **Chương 2 (Cơ sở lý thuyết & Công nghệ áp dụng: Microservices, Spring Cloud, RabbitMQ, React, Docker, MySQL)**.
  - **Vũ Hồng Linh:**
    * Cắt và ghép API các màn hình chức năng:
      - Màn hình Đặt lịch khám trực tuyến (Customer Portal): Chọn thú cưng, chọn ngày, lưới khung giờ 30 phút hiển thị số chỗ còn trống, nhập triệu chứng ban đầu.
      - Màn hình Tiếp đón tại quầy (Receptionist): Danh sách lịch hẹn trong ngày, bấm nút "Check-in", form tạo khách vãng lai cấp tốc.
      - Màn hình Điều phối hàng đợi sảnh: Xem danh sách chờ khám, thao tác chọn Bác sĩ và bấm "Phân công vào phòng khám".
- **Kết quả đầu ra (Milestone 2 - Ngày 25/10/2026):**
  - Chạy thông suốt luồng: Khách đặt lịch $\rightarrow$ Lễ tân check-in $\rightarrow$ Bác sĩ được phân công tiếp nhận ca vào hàng đợi.
  - Bản thảo Word **Chương 1 và Chương 2** hoàn thành 100%.

---

### Tuần 10: Sprint 2 - Khám bệnh Lâm sàng & Cận lâm sàng 2 pha (26/10 – 01/11/2026)
- **Mục tiêu tuần:** Hoàn thành toàn bộ phân hệ chuyên môn y tế: Bác sĩ khám 2 pha, Hàng đợi Lab & CĐHA độc lập, Khóa ưu tiên.
- **Công việc chi tiết từng thành viên:**
  - **Lưu Minh Hiển:**
    * Phát triển phân hệ Bác sĩ khám lâm sàng trong `clinical-service` (:8083):
      - Bác sĩ bấm "Bắt đầu khám" GĐ 1: Ghi nhận sinh hiệu, khám thực thể, tra cứu lịch sử bệnh án.
      - Ra chỉ định dịch vụ cận lâm sàng: Chọn xét nghiệm máu, siêu âm, chụp X-quang $\rightarrow$ Hệ thống tự động đẩy vào 2 hàng đợi độc lập $\rightarrow$ Chuyển đợt khám sang `WAITING_RESULTS` $\rightarrow$ Giải phóng Bác sĩ về `AVAILABLE`.
      - Nghiệp vụ GĐ 2: Khi ca có kết quả (`RESULTS_READY`), kích hoạt **Khóa ưu tiên (Priority Lock)**, hiển thị hộp thoại nổi bật mời bệnh nhân vào phòng, tổng hợp bệnh án, chẩn đoán xác định, kê đơn thuốc và chốt ca khám.
  - **Nguyễn Đức Khởi:**
    * Phát triển phân hệ Cận lâm sàng trong `clinical-service` (:8083):
      - Hàng đợi Phòng Xét nghiệm (Lab Queue): Tiếp nhận ca, lấy mẫu máu, nhập chỉ số đo lường thực tế, **tự động đối chiếu tham chiếu loài (Chó/Mèo)**, lưu snapshot khoảng tham chiếu vào `lab_test_results`.
      - Hàng đợi Phòng Chẩn đoán hình ảnh (Imaging Queue): Tiếp nhận ca, lưu tệp ảnh chụp vào thư mục Docker Volume (`/app/uploads/imaging/`), nhập mô tả và kết luận hình thái học vào `imaging_results`.
      - Xử lý hoàn tất cận lâm sàng: Khi tất cả chỉ định `COMPLETED` $\rightarrow$ Đổi đợt khám sang `RESULTS_READY`, bắn event `ParaclinicalResultsReadyEvent` vào RabbitMQ.
  - **Vũ Hồng Linh:**
    * Cắt và ghép API các màn hình chuyên môn:
      - Màn hình Bác sĩ: Danh sách chờ khám, Màn hình khám GĐ 1, Hộp thoại ưu tiên ca tái khám, Màn hình Bệnh án tổng hợp GĐ 2.
      - Màn hình KTV Xét nghiệm: Danh sách chờ mẫu (có cờ cấp cứu đỏ nhấp nháy), Form nhập chỉ số có bôi màu cảnh báo (Vàng - Thấp, Xanh - Chuẩn, Đỏ - Cao).
      - Màn hình KTV Chẩn đoán hình ảnh: Danh sách chờ chụp, Form tải ảnh kéo thả, trình xem ảnh phóng to.
- **Kết quả đầu ra (Milestone 3 - Ngày 01/11/2026):**
  - Chạy mượt mà toàn bộ chu trình chuyên môn y tế 2 pha: Bác sĩ chỉ định $\rightarrow$ Phòng Lab/CĐHA thực hiện độc lập $\rightarrow$ Trả kết quả $\rightarrow$ Bác sĩ đón lại ca chốt chẩn đoán.

---

### Tuần 11: Sprint 3 - Viện phí, Kho dược, Realtime & Viết Báo cáo Ch.3 (02/11 – 08/11/2026)
- **Mục tiêu tuần:** Hoàn thành phân hệ Viện phí, Xuất thuốc trừ kho an toàn, Thông báo realtime và hoàn thành Chương 3 Báo cáo.
- **Công việc chi tiết từng thành viên:**
  - **Lưu Minh Hiển:**
    * Phát triển `billing-pharmacy-service` (:8084):
      - Kê đơn thuốc điện tử (kiểm tra tồn kho khả dụng hiện tại).
      - Tự động tạo bản ghi Hóa đơn viện phí (`invoices`) khi Bác sĩ chốt ca khám.
      - **Nghiệp vụ Thu tiền & Xuất thuốc:** Thực hiện cập nhật hóa đơn sang `PAID` và trừ tồn kho tự động trong **cùng 1 giao dịch `@Transactional` an toàn** trên MySQL.
      - Bắn event `VisitCompletedEvent` sang RabbitMQ để đóng đợt khám `pet_visits.status = 'COMPLETED'`.
    * Viết cuốn Báo cáo: **Chương 3 (Phân tích và Thiết kế hệ thống: WBS, Use Case, Activity, State Machine, Sequence, Class Diagram, ERD, Kiến trúc Microservices)**.
  - **Nguyễn Đức Khởi:**
    * Phát triển `notification-service` (:8085):
      - Lắng nghe RabbitMQ events: Kết nối WebSocket (STOMP) đẩy thông báo realtime tới màn hình Bác sĩ (bật chuông/huy hiệu Khóa ưu tiên) và màn hình Lễ tân (gọi số).
      - Tích hợp gửi Email (Spring Mail) thông báo mã đặt lịch cho khách hàng.
      - Nghiệp vụ cảnh báo kho: Bắn event cảnh báo khi thuốc chạm ngưỡng tồn kho tối thiểu (`min_stock_alert`).
    * Phối hợp với Hiển hoàn thiện phần Thiết kế Kiến trúc và CSDL trong **Chương 3 Báo cáo**.
  - **Vũ Hồng Linh:**
    * Cắt và ghép API các màn hình tài chính & dược:
      - Màn hình Thu ngân viện phí: Xem chi tiết hóa đơn (tiền dịch vụ + tiền thuốc), áp dụng chiết khấu, nút xác nhận thanh toán (khách trả ngoài).
      - Màn hình Cấp phát thuốc: Hiển thị đơn thuốc cần lấy, xác nhận đã xuất thuốc, in phiếu hướng dẫn sử dụng.
      - Màn hình Quản trị kho dược (Admin): Danh sách thuốc, nhập kho, kiểm kê tồn kho, cảnh báo thuốc sắp hết.
      - Tích hợp WebSocket client: Nhận chuông và popup thông báo thời gian thực.
- **Kết quả đầu ra (Milestone 4 - Ngày 08/11/2026):**
  - Hệ thống hoàn thiện 100% các tính năng nghiệp vụ từ Đầu đến Cuối.
  - Bản thảo Word **Chương 3** (chương quan trọng nhất) hoàn thành đầy đủ các biểu đồ UML và sơ đồ thiết kế.

---

### Tuần 12: Sprint 4 - Tích hợp Hệ thống, Kiểm thử E2E & Hoàn thiện Toàn bộ Báo cáo (09/11 – 15/11/2026)
- **Mục tiêu tuần:** Ghép nối toàn bộ hệ thống qua Gateway, kiểm thử toàn diện Happy Path & Ngoại lệ, hoàn thiện 100% cuốn Báo cáo Word.
- **Công việc chi tiết từng thành viên:**
  - **Cả nhóm (Hiển, Khởi, Linh):**
    * **Tích hợp toàn diện (System Integration):** Đưa toàn bộ request của Frontend đi qua cổng duy nhất `Spring Cloud Gateway (:8080)`.
    * **Kiểm thử luồng nghiệp vụ chính (Happy Path Testing):** Khách đặt lịch $\rightarrow$ Lễ tân check-in $\rightarrow$ Bác sĩ khám & chỉ định $\rightarrow$ Lab & CĐHA trả kết quả $\rightarrow$ Bác sĩ kê đơn $\rightarrow$ Thu ngân thu tiền & xuất thuốc $\rightarrow$ Hoàn tất.
    * **Kiểm thử các tình huống ngoại lệ (Edge Cases Testing):**
      - Test khách vắng mặt 3 lần tại phòng khám hoặc phòng CLS $\rightarrow$ Bấm tạm hoãn $\rightarrow$ Bấm gọi lại (Recall).
      - Test khách xin hủy dịch vụ chụp X-quang giữa chừng $\rightarrow$ Hóa đơn chỉ tính tiền xét nghiệm máu.
      - Test hết thuốc trong kho khi thanh toán $\rightarrow$ Giao dịch rollback an toàn, thông báo lỗi rõ ràng.
    * **Chuẩn bị dữ liệu mẫu (Seed Data):** Viết script SQL nạp sẵn 100 dòng dữ liệu mẫu sinh động (thuốc, dịch vụ, tài khoản bác sĩ, bệnh án mẫu) để demo mượt mà.
    * **Hoàn thiện cuốn Báo cáo đồ án:**
      - Viết **Chương 4 (Cài đặt & Thử nghiệm):** Chụp các màn hình giao diện thực tế đưa vào báo cáo kèm chú thích, bảng kết quả kiểm thử (Test Cases).
      - Viết **Chương 5 (Kết luận & Hướng phát triển):** Đánh giá ưu điểm, hạn chế và đề xuất phát triển tiếp theo.
      - Soát lỗi chính tả, căn chỉnh font chữ (Times New Roman 13), lề chuẩn (trái 3cm, phải/trên/dưới 2cm), đánh số trang, mục lục tự động.
- **Kết quả đầu ra (Milestone 5 - Ngày 15/11/2026):**
  - Toàn bộ hệ thống chạy ổn định không lỗi, khởi chạy qua 1 lệnh Docker duy nhất.
  - Cuốn Báo cáo Đồ án tốt nghiệp bằng Word hoàn chỉnh 100% từ Bìa đến Chương 5.

---

### Tuần 13: Tổng duyệt, Slide Thuyết trình, Quay Video Demo & Nộp Nghiệm thu GVHD (16/11 – 20/11/2026)
- **Mục tiêu tuần:** Hoàn thành Slide thuyết trình, video demo dự phòng, diễn tập bảo vệ thử và **nộp sản phẩm cho GVHD nghiệm thu đúng hạn 20/11/2026**.
- **Công việc chi tiết từng ngày:**
  - **Ngày 16/11 – 17/11 (Thiết kế Slide & Quay Video):**
    * Linh thiết kế bộ **Slide thuyết trình PowerPoint / Canva** ấn tượng, chuyên nghiệp (khoảng 25–30 slide): Nêu bật vấn đề thực tế, quy trình 2 pha, kiến trúc Microservices, công nghệ RabbitMQ/Docker và kết quả đạt được.
    * Khởi quay 01 video clip quay màn hình demo toàn bộ luồng nghiệp vụ dài 5–7 phút (để làm tư liệu dự phòng khi bảo vệ nếu máy tính hoặc mạng gặp sự cố).
  - **Ngày 18/11 – 19/11 (Tổng duyệt & Diễn tập bảo vệ thử - Dry-Run):**
    * Cả nhóm tổ chức diễn tập thuyết trình thử:
      - Hiển: Trình bày Mở đầu, Nghiệp vụ cốt lõi, Quy trình 2 pha và Khóa ưu tiên.
      - Khởi: Trình bày Kiến trúc Microservices, RabbitMQ, CSDL và xử lý giao dịch.
      - Linh: Trình bày Giao diện UI/UX và trực tiếp thao tác demo phần mềm trực quan.
    * Cùng nhau ôn luyện và trả lời các câu hỏi phản biện trong phần **Defense Q&A** của tài liệu kiến trúc.
  - **Ngày 20/11/2026 (NGÀY VỀ ĐÍCH - MILESTONE QUAN TRỌNG NHẤT):**
    * **Gửi file Báo cáo Word/PDF hoàn chỉnh + Slide + Video Demo cho Giảng viên hướng dẫn (GVHD).**
    * Trình diễn demo trực tiếp cho GVHD xem để xin ý kiến nhận xét và chữ ký đồng ý cho phép bảo vệ trước Hội đồng!

---

## 4. Sơ đồ Gantt Toàn khóa (24/08/2026 – 20/11/2026)

```mermaid
gantt
    title TIẾN ĐỘ TOÀN KHÓA ĐỒ ÁN TỐT NGHIỆP (24/08/2026 - 20/11/2026)
    dateFormat  YYYY-MM-DD
    axisFormat  %d/%m

    section TUẦN 1 - 7: PHÂN TÍCH & THIẾT KẾ (ĐÃ XONG)
    T1: Khảo sát, Đề tài & Phạm vi             :done, t1, 2026-08-24, 2026-08-30
    T2: Phân rã WBS & Mô tả nghiệp vụ          :done, t2, 2026-08-31, 2026-09-06
    T3: Đặc tả Yêu cầu FR & NFR                :done, t3, 2026-09-07, 2026-09-13
    T4: Đặc tả Use Case Core                   :done, t4, 2026-09-14, 2026-09-20
    T5: Sơ đồ Máy trạng thái State Machine     :done, t5, 2026-09-21, 2026-09-27
    T6: Sơ đồ Hoạt động Activity & Ngoại lệ   :done, t6, 2026-09-28, 2026-10-04
    T7: Thiết kế CSDL ERD, UI/UX & Microservices :done, t7, 2026-10-05, 2026-10-11

    section TUẦN 8: SƠ ĐỒ LỚP, TUẦN TỰ & SKELETON (12/10 - 18/10)
    Sơ đồ Lớp & Sơ đồ Tuần tự (Hiển)           :active, t8_1, 2026-10-12, 2026-10-16
    Khung Docker, Gateway, Eureka (Khởi)      :active, t8_2, 2026-10-13, 2026-10-18
    Khung Frontend React, Layout, Auth (Linh) :active, t8_3, 2026-10-14, 2026-10-18

    section TUẦN 9: SPRINT 1 - BOOKING & RECEPTION (19/10 - 25/10)
    appointment-service & Tính Slot (Hiển)    :t9_1, 2026-10-19, 2026-10-25
    auth-service & API Check-in (Khởi)        :t9_2, 2026-10-19, 2026-10-24
    UI Đặt lịch, Check-in, Hàng đợi (Linh)    :t9_3, 2026-10-20, 2026-10-25
    Viết Báo cáo Chương 1 & 2 (Nhóm)          :t9_4, 2026-10-22, 2026-10-25

    section TUẦN 10: SPRINT 2 - CORE CLINICAL (26/10 - 01/11)
    clinical-service: Bác sĩ GĐ 1 & 2 (Hiển)   :t10_1, 2026-10-26, 2026-11-01
    clinical-service: Hàng đợi Lab & CĐHA (Khởi):t10_2, 2026-10-26, 2026-10-31
    UI Phòng Bác sĩ, Form Lab & CĐHA (Linh)   :t10_3, 2026-10-27, 2026-11-01

    section TUẦN 11: SPRINT 3 - BILLING & STOCK (02/11 - 08/11)
    billing-pharmacy-service & Trừ kho (Hiển) :t11_1, 2026-11-02, 2026-11-07
    notification-service & WebSocket (Khởi)   :t11_2, 2026-11-02, 2026-11-06
    UI Thu ngân, Cấp thuốc, Kho dược (Linh)   :t11_3, 2026-11-03, 2026-11-08
    Viết Báo cáo Chương 3 (Hiển + Khởi)       :t11_4, 2026-11-04, 2026-11-08

    section TUẦN 12: SPRINT 4 - INTEGRATION & REPORT (09/11 - 15/11)
    Tích hợp Gateway & Kiểm thử E2E (Nhóm)    :t12_1, 2026-11-09, 2026-11-13
    Nạp Seed Data & Đóng gói Docker (Khởi)    :t12_2, 2026-11-11, 2026-11-14
    Viết Báo cáo Chương 4, 5 & Soát lỗi (Nhóm):t12_3, 2026-11-10, 2026-11-15

    section TUẦN 13: VỀ ĐÍCH & NGHIỆM THU GVHD (16/11 - 20/11)
    Thiết kế Slide Thuyết trình (Linh)        :t13_1, 2026-11-16, 2026-11-18
    Quay Video Clip Demo dự phòng (Khởi)      :t13_2, 2026-11-16, 2026-11-17
    Diễn tập Thuyết trình Thử (Cả nhóm)       :t13_3, 2026-11-18, 2026-11-19
    NỘP BÁO CÁO & DEMO CHO GVHD NGHIỆM THU   :milestone, m_end, 2026-11-20, 0d
```

---

## 5. Kế hoạch Quản trị Rủi ro Toàn khóa (Risk Management)

| Rủi ro tiềm ẩn | Mức độ | Biện pháp Phòng ngừa & Kế hoạch Dự phòng (Contingency Plan) |
| :--- | :---: | :--- |
| **1. Trễ tiến độ ghép nối API giữa Backend và Frontend** | **CAO** | - Ngay từ Tuần 8, Khởi và Hiển xuất bản tài liệu API Contract (Swagger / Postman Collection) có sẵn mẫu JSON Response để Linh code Frontend độc lập bằng Mock Data mà không phải đợi Backend code xong. |
| **2. Nghẽn tài nguyên máy khi chạy 5 Microservices** | **TRUNG BÌNH** | - Đã tối ưu chỉ dùng 1 container MySQL 8.0 (4 logical DB), bỏ MinIO chuyển sang Docker Volume.<br>- Trong quá trình phát triển: Thành viên code service nào chỉ cần chạy service đó trên IDE, các service phụ trợ khác chạy nền trên Docker Compose. |
| **3. Lỗi mạng hoặc demo bị trục trặc khi bảo vệ trực tiếp** | **CAO** | - Chuẩn bị sẵn 01 Video Clip quay màn hình toàn bộ kịch bản demo (có thuyết minh giọng đọc). Nếu máy chiếu hoặc mạng trường gặp sự cố, mở video demo ngay lập tức để không làm gián đoạn buổi bảo vệ. |
| **4. Báo cáo Word bị vỡ định dạng khi gộp chung bài của 3 người** | **TRUNG BÌNH** | - Tạo trước 01 file Template Word chuẩn (đã set sẵn Style: Heading 1, Heading 2, Normal, Table, Caption hình vẽ). Các thành viên viết vào đúng template đó, Trưởng nhóm Hiển phụ trách merge cuối cùng. |
| **5. Thành viên bị quá tải công việc vào tuần chót** | **TRUNG BÌNH** | - Phân bổ viết báo cáo song song ngay từ Tuần 9 (xong phần nào viết báo cáo phần đó), tuyệt đối không để dồn toàn bộ cuốn báo cáo vào tuần cuối cùng. |
