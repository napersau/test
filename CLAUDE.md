# CLAUDE.md — Hệ thống Quản lý Phòng khám Thú y (VetClinic, Đồ án tốt nghiệp)

Đồ án gồm Spring Boot microservices, React (Create React App, chạy cổng 3000) và MySQL/RabbitMQ chạy bằng Docker Compose. Hạn nộp GVHD: **20/11/2026**.
Nhóm: Lưu Minh Hiển (trưởng nhóm, BE), Nguyễn Đức Khởi (BE + DevOps), Vũ Hồng Linh (FE).

> Trạng thái (29/10/2026): đã dựng khung backend `vetclinic-backend/` (8 module) và `docker-compose.yml`; **cả 5 service nghiệp vụ (auth, appointment, clinical, billing-pharmacy, notification) đã hoàn thiện**; các vòng sự kiện giữa chúng đã đóng và kiểm chứng end-to-end (kịch bản nằm ở `e2e/`). Còn chờ nhóm quyết: VAT thực tế (§8). **Frontend `fe/` đã nối API thật** cho cả 6 vai trò (xem mục Frontend ở §3); kịch bản `e2e/fe_smoke.mjs` (50 bước) chạy trọn một ca khám trên Chrome thật.
> File này đã gom lại các quy tắc bắt buộc trong tài liệu, và **chốt luôn cách xử lý những chỗ tài liệu mâu thuẫn hoặc sẽ làm hệ thống chạy không ổn định**. Khi tài liệu và file này khác nhau, làm theo file này rồi báo cho người dùng biết.

---

## 1. Nguồn tài liệu chuẩn (thứ tự ưu tiên khi mâu thuẫn)

1. `docs/schema_init.sql`: DDL thật (24 bảng) cộng với các sửa đổi ở §5.1 bên dưới
2. `docs/THIET_KE_CO_SO_DU_LIEU_ERD.md`, `docs/DANH_SACH_KIEU_ENUM_HE_THONG.md` (13 enum)
3. `docs/QUY_CHUAN_THIET_KE_VA_LAP_TRINH_BACKEND_SPRINGBOOT.md` (quy chuẩn code v2.0, bắt buộc)
4. `docs/THIET_KE_KIEN_TRUC_MICROSERVICES.md`
5. `docs/THIET_KE_SO_DO_TRANG_THAI_STATE_MACHINE.md`, `docs/TONG_HOP_NGOAI_LE_VA_XU_LY_HE_THONG.md` (EX-01..16)
6. `docs/DAC_TA_USE_CASE_CORE.md`, `docs/YEU_CAU_CHUC_NANG_VA_PHI_CHUC_NANG.md`, `docs/THIET_KE_SO_DO_HOAT_DONG_ACTIVITY.md`, `docs/TAI_LIEU_MO_TA_NGHIEP_VU_PHONG_KHAM_THU_Y.md`
7. `docs/KE_HOACH_*.md`, `docs/BANG_TONG_HOP_*.md`: chỉ dùng để biết tiến độ và người phụ trách, **không** dùng để quyết định kỹ thuật (một số chỗ đã lỗi thời, ví dụ còn để `pets` ở appointment-service, còn dùng tên `VisitCompletedEvent`)

`docs/Docs/*.docx` là **bản cũ**, dùng để đóng quyển báo cáo (ERD trong đó chỉ có 18 bảng). Không lấy chúng làm căn cứ để code.

Các liên kết `file:///c:/Users/Admin/...` trong các file md bị hỏng. Hãy tìm file cùng tên trong `docs/`.

---

## 2. Tech stack (phiên bản đã kiểm chứng)

| Thành phần | Phiên bản dùng | Ghi chú |
|---|---|---|
| Java | 21 (Temurin) | |
| Spring Boot | **4.1.1** (nhóm chốt) | Quy chuẩn ghi `4.1.11`: phiên bản này không tồn tại. Tài liệu kiến trúc ghi "3.3.x" là thông tin cũ. |
| Spring Cloud | **2025.1.3 (Oakwood)** (nhóm chốt) | Train 2025.1.2+ mới hỗ trợ Boot 4.1 |
| JWT | jjwt 0.12.6 + `jjwt-gson` | Dùng gson để không kéo Jackson 2 vào cạnh Jackson 3 |
| MySQL | 8.0 | 1 container, 4 database logic |
| RabbitMQ | 3.12-management | |
| Lombok + MapStruct | MapStruct 1.6.x, `lombok-mapstruct-binding` 0.2.0 | Thứ tự annotation processor: lombok → binding → mapstruct-processor |
| Frontend | React 19 + Create React App (`react-scripts` 5), react-router 6, CSS thuần; gọi API bằng `fetch` (không dùng Axios), WebSocket STOMP tự viết | Thư mục `fe/`, cổng **3000**. Đã chốt không dùng Vite/Tailwind/AntD vì giao diện nhóm đã có sẵn ở CRA + CSS riêng |

**Lưu ý khi dùng Boot 4 / Spring Cloud 2025.1 (khác với Boot 3, các đoạn code mẫu trong quy chuẩn chưa cập nhật):**
- Boot 4 dùng **Jackson 3**: package của `ObjectMapper`/`JsonMapper` là `tools.jackson.databind`. Riêng annotation như `@JsonInclude` vẫn nằm ở `com.fasterxml.jackson.annotation`. Với RabbitMQ, dùng message converter Jackson 3 của Spring AMQP 4 (`JacksonJsonMessageConverter`) thay cho `Jackson2JsonMessageConverter`. Nhớ kiểm tra tên class trong bản đang dùng.
- Gateway: dùng starter `spring-cloud-starter-gateway-server-webflux`. Property nằm dưới prefix `spring.cloud.gateway.server.webflux.*`.
- Nếu đoạn code mẫu trong `docs/` không compile được, sửa theo API hiện hành rồi ghi chú lại. Không hạ phiên bản xuống Boot 3.

---

## 3. Kiến trúc & cổng

| Module | Port | Database | Package gốc |
|---|---|---|---|
| `service-registry` (Eureka) | 8761 | – | `com.vetclinic.registry` |
| `api-gateway` (WebFlux) | 8080 | – | `com.vetclinic.gateway` |
| `auth-service` | 8081 | `pet_clinic_auth_db` (roles, users, refresh_tokens) | `com.vetclinic.auth` |
| `appointment-service` | 8082 | `pet_clinic_appointment_db` (appointments, appointment_status_histories) | `com.vetclinic.appointment` |
| `clinical-service` | 8083 | `pet_clinic_clinical_db` (13 bảng: species, **pets**, services, lab_*, **service_lab_test_items**, pet_visits, visit_service_details, imaging_*, *_histories) | `com.vetclinic.clinical` |
| `billing-pharmacy-service` | 8084 | `pet_clinic_billing_pharmacy_db` (medicines, prescriptions, prescription_items, inventory_transactions, invoices, invoice_items) | `com.vetclinic.billing` |
| `notification-service` | 8085 | – (WebSocket STOMP + Mail) | `com.vetclinic.notification` |
| `common-library` | – | – | `com.vetclinic.common` |

Cấu trúc thư mục: `vetclinic-backend/` (Maven multi-module, parent là `spring-boot-starter-parent`; một `Dockerfile` dùng chung với `--build-arg MODULE=<module>`), `fe/` (React; `fe/Dockerfile` build tĩnh + nginx; `fe/legacy-mock/` là bản cũ dùng localStorage, **không build, chỉ để tham khảo**), `docker-compose.yml` + `docker-compose.dev.yml` + `.env` ở thư mục gốc.

Thành phần dùng chung đã có trong `common-library` (dùng lại, không viết lại): `ApiResponse`/`PageResponse`, `ErrorCode`/`AppException` + 3 advice bắt lỗi, `CommonSecurityConfig` + `HeaderAuthenticationFilter` + `SecurityUtils`, `RoleCode`, Feign (`FeignClientInterceptor` chuyển tiếp header, `CustomFeignErrorDecoder`), sự kiện (`EventRouting`, 7 record event, `RabbitCommonConfig.durableQueueWithDlq(...)`, `DomainEventRabbitPublisher`).
- **Phát event:** trong method `@Transactional` chỉ gọi `applicationEventPublisher.publishEvent(new XxxEvent(...))`. `DomainEventRabbitPublisher` tự gửi sang RabbitMQ sau khi commit. Không gọi `rabbitTemplate` trực tiếp.
- **Endpoint public riêng của service:** khai báo trong `vetclinic.security.public-paths` (yml). Ở Gateway thì khai báo trong `vetclinic.gateway.public-paths`.
- **Gọi Feign nội bộ khi không có người dùng** (consumer RabbitMQ, scheduler): gọi endpoint `/internal/**`. Các path này được permitAll trong service nhưng Gateway không định tuyến, nên client bên ngoài không gọi tới được.

**auth-service (đã hoàn thành, 28 unit test + kiểm thử end-to-end qua Gateway):**

| Endpoint | Quyền | Ghi chú |
|---|---|---|
| `POST /api/v1/auth/login` · `/refresh` · `/logout` | public | Access Token 30m (JWT HS256, claim `userId` là **chuỗi**, `role` là code thô), Refresh Token 7d (UUID, dùng 1 lần) |
| `GET/PUT /api/v1/auth/me` · `POST /change-password` | đã đăng nhập | Đổi mật khẩu thu hồi mọi Refresh Token |
| `GET/POST /api/v1/auth/users` | ADMIN, RECEPTIONIST | Lễ tân: tìm bị **ép lọc PET_OWNER**, tạo chỉ được PET_OWNER. `username` bỏ trống = SĐT |
| `GET /users/doctors` · `GET /users/{id}` | ADMIN, RECEPTIONIST (+ nhân sự y tế cho `{id}`) | |
| `PUT /users/{id}` · `POST /users/{id}/status` | ADMIN | Số phòng (`roomNumber`) là duy nhất; khóa/ngừng tài khoản thu hồi mọi Refresh Token; không tự khóa chính mình |
| `GET /internal/auth/doctors/active-count` · `/doctors` · `/users/{id}` · `/users?ids=1,2` | không cần header | Cho Feign của appointment (sức chứa slot) và clinical (tên bác sĩ, chủ nuôi). Trả `ApiResponse<...>` |

- Phản hồi đăng nhập sai luôn là `AUTH_1103` dù sai tên hay sai mật khẩu; trạng thái khóa chỉ lộ sau khi mật khẩu đúng. Sai 5 lần liên tiếp (theo username, trong bộ nhớ) thì `AUTH_1112` (429) trong 15 phút.
- **Frontend phải xếp hàng các lời gọi `/refresh`** (một lần tại một thời điểm). Hai request đồng thời cùng token sẽ bị coi là đánh cắp và đăng xuất mọi thiết bị.
- Mật khẩu: 8-72 ký tự, có chữ và số. BCrypt strength 12.
- **Tài khoản bổ sung:**

| Endpoint | Quyền | Ghi chú |
|---|---|---|
| `POST /api/v1/auth/register` | public (Gateway + service đều cho qua) | Chủ nuôi tự đăng ký: **luôn là `PET_OWNER`**, `ACTIVE`, tên đăng nhập = SĐT. Body không có trường vai trò / tên đăng nhập (gửi thừa cũng bị bỏ qua). Trùng SĐT → `AUTH_1102` |
| `POST /users/{id}/role` | ADMIN | Đổi giữa các vai trò **nhân sự** (5 vai trò); không đổi vai trò của chính mình (`AUTH_1114`), không đổi từ/sang `PET_OWNER`. Số phòng bị xóa nếu vai trò mới không có phòng cố định. **Thu hồi mọi Refresh Token** (Access Token cũ còn mang vai trò cũ tối đa 30 phút) |
| `POST /users/{id}/reset-password` | ADMIN (mọi tài khoản), RECEPTIONIST (chỉ chủ nuôi) | Cách xử lý "quên mật khẩu" tại quầy: người có quyền đặt mật khẩu tạm, người dùng đổi lại bằng `change-password`. Thu hồi mọi Refresh Token. Không tự đặt lại của chính mình |

- Chưa có: quên mật khẩu tự phục vụ qua email (cần token đặt lại; hiện dùng `reset-password` ở quầy). Tự đăng ký chưa có xác minh SĐT/email và chưa giới hạn tần suất.

**appointment-service (đã hoàn thành, 51 unit test + 85 kiểm tra end-to-end qua Gateway):**

| Endpoint | Quyền | Ghi chú |
|---|---|---|
| `GET /api/v1/appointments/slots?date=` | đã đăng nhập | 14 khung: `capacity` (= số bác sĩ ACTIVE, gọi `auth-service /internal/auth/doctors/active-count`), `booked`, `remaining`, `available`, `past` |
| `POST /api/v1/appointments` | PET_OWNER, RECEPTIONIST | Chủ nuôi (UC-14): `ownerId`/`bookingChannel` trong body **bị bỏ qua**, luôn là chính mình, ONLINE, `PENDING`. Lễ tân (UC-16): bắt buộc `ownerId` (phải là PET_OWNER đang ACTIVE, kiểm tra qua auth) và `bookingChannel` PHONE/WALK_IN, `CONFIRMED` ngay. Không có trường bác sĩ (BR-04) |
| `GET /api/v1/appointments` · `/{id}` | PET_OWNER (chỉ của mình), RECEPTIONIST, ADMIN | Lọc `ownerId, petId, code, fromDate, toDate, status`. Hàng chờ duyệt UC-17: `status=PENDING&sortBy=createdAt&ascending=true`. Lịch của người khác trả `APPT_1202` (404) để không lộ sự tồn tại |
| `POST /{id}/confirm` · `/cancel` · `/reschedule` · `/no-show` | xem code | `cancel` bắt buộc `reason` và dùng cho cả "từ chối" của lễ tân. Chủ nuôi chỉ hủy/đổi được trước giờ hẹn ≥ 2 giờ (`APPT_1204`); lễ tân không bị giới hạn này. Đổi lịch giữ nguyên trạng thái |
| `GET /{id}/history` | RECEPTIONIST, ADMIN | Audit trail. Đổi lịch ghi `from = to` kèm chi tiết ở `notes`; `changedByUserId = null` là hệ thống |
| `GET /internal/appointments/{id}` | không cần header | Cho clinical-service kiểm tra lịch hẹn phải đang `CONFIRMED` trước khi check-in |

- **Sức chứa** = `COUNT(bác sĩ ACTIVE)` lấy lúc đặt (không lưu cố định): khóa/mở khóa bác sĩ làm đổi sức chứa ngay. Chưa có bác sĩ nào ACTIVE thì mọi khung kín (`APPT_1203`). Lịch `PENDING`, `CONFIRMED`, `CHECKED_IN` đều chiếm chỗ; `CANCELLED`, `NO_SHOW` trả chỗ.
- Mỗi lần đặt/đổi lấy 2 khóa: theo (ngày, giờ) và theo (thú cưng, ngày), nên một thú cưng không thể có 2 lịch trong ngày (`APPT_1207`) dù gửi song song nhiều khung giờ.
- Mã lịch hẹn `APT-yyyyMMdd-NNNNN` (ngày tạo + id), luôn duy nhất, không cần thử lại khi trùng.
- **Tự quét NO_SHOW (EX-01):** mỗi 15 phút (7h-21h giờ VN), `CONFIRMED` quá giờ **kết thúc** khung + 30 phút. Quét theo (ngày, giờ) nên bù được lịch của các ngày trước; mỗi lịch một transaction; bỏ qua lịch vừa check-in. Chỉ `CONFIRMED` bị quét, `PENDING` quá hạn không tự đổi trạng thái. Đổi lịch quét bằng biến môi trường `BOOKING_NO_SHOW_CRON` (dùng khi muốn thử nhanh).
- **Hợp đồng với clinical-service (đã làm xong, đã kiểm chứng end-to-end):** (1) khi check-in khách có hẹn, clinical gọi `GET /internal/appointments/{id}` rồi tạo `pet_visits`, sau commit phát `VisitCheckedInEvent`; appointment tự chuyển lịch sang `CHECKED_IN` qua queue `appointment-service.visit.checked_in` (idempotent, có DLQ). (2) clinical cung cấp `GET /internal/clinical/pets/{id}` → `ApiResponse<{id, ownerId, name}>` (404 + `PET_NOT_FOUND` nếu không có). **`BOOKING_VERIFY_PET` mặc định là `true`**: đặt lịch bằng thú cưng không tồn tại hoặc của chủ khác trả `APPT_1201`. Chỉ đặt `false` khi cần chạy appointment-service riêng không có clinical.
- **Tên trong danh sách:** `GET /appointments` và `/{id}` trả thêm `petName`, `ownerName`, `ownerPhone` (`AppointmentEnricher`: MỘT lời gọi theo lô sang clinical `GET /internal/clinical/pets?ids=` và MỘT sang auth `GET /internal/auth/users?ids=`, ở tầng controller, ngoài transaction; service kia sập thì các trường này là null chứ không lỗi).
- **Tự hủy lịch `PENDING` quá hạn:** quét theo (ngày, giờ) lúc phút 5/20/35/50 từ 7h-21h giờ VN (`BOOKING_PENDING_EXPIRY_CRON`, thử nhanh bằng `*/5 * * * * *`): lịch `PENDING` đã qua giờ **kết thúc** khung mà chưa ai duyệt → `CANCELLED`, lý do "Quá giờ hẹn mà phòng khám chưa xác nhận", người hủy/người đổi trạng thái = null (hệ thống). Trả suất sức chứa. Lịch đã `CONFIRMED` không bị đụng tới (đó là việc của quét NO_SHOW).
- **`GET /api/v1/appointments/reports/summary?fromDate&toDate`** (ADMIN, FR-70): số lịch theo trạng thái và kênh đặt, `noShowRate = NO_SHOW / (CHECKED_IN + NO_SHOW)`, `cancellationRate = CANCELLED / tổng` (0..1). Mặc định 30 ngày gần nhất, tối đa 366 ngày.
- Email xác nhận lịch hẹn do notification-service gửi (xem mục đó).
**clinical-service (đã hoàn thiện, 102 unit test + 171 kiểm tra end-to-end qua Gateway):**

| Endpoint | Quyền | Ghi chú |
|---|---|---|
| `GET /api/v1/species` · `POST/PUT` | đã đăng nhập / ADMIN | Loại thú cưng. Trùng mã → `CLIN_1318` |
| `POST/GET/PUT /api/v1/pets`, `GET /pets/{id}`, `/pets/{id}/visits` | PET_OWNER (chỉ của mình), RECEPTIONIST, ADMIN | Chủ nuôi: `ownerId` trong body bị bỏ qua, luôn là chính mình. Lễ tân bắt buộc `ownerId` (phải là PET_OWNER). Không đổi được loại sau khi tạo. Hồ sơ của người khác trả `APPT_1201` (404). Mã `PET-yyyy-NNNNN` |
| `GET/POST/PUT /api/v1/clinical/services` · `GET /lab-test-items` | đã đăng nhập / ADMIN | Danh mục dịch vụ + chỉ số xét nghiệm kèm khoảng tham chiếu theo loài |
| `POST /api/v1/clinical/pet-visits/check-in` | RECEPTIONIST | Gửi `petId` (khách vãng lai) hoặc `appointmentId` (lịch phải `CONFIRMED` và đúng ngày hôm nay). `emergency`, `quantity` bỏ trống được. Đã có đợt khám đang mở hoặc lịch đã dùng → `CLIN_1306` |
| `GET /pet-visits` | RECEPTIONIST, VETERINARIAN, ADMIN | Danh sách đợt khám phân trang, mới nhất trước. Lọc `status`, `date` (ngày check-in **giờ VN**), `doctorId`, `petId`, `keyword` (mã ca). `size` tối đa 100. FE dùng cho bảng điều phối và trang đợt khám của Admin |
| `GET /pet-visits/queue` · `/{id}` · `/{id}/history` | RECEPTIONIST, ADMIN, nhân sự y tế (`{id}` thêm chủ nuôi: chỉ của mình) | Hàng đợi 3 bậc: cấp cứu → có hẹn **đúng khung giờ** (theo giờ hẹn) → vãng lai và khách hẹn đến trễ (FIFO theo giờ check-in); `scheduledAt` ≠ null là ca có hẹn đúng giờ |
| `POST /pet-visits/{id}/assign` | RECEPTIONIST | Bác sĩ BUSY → `CLIN_1302`; bác sĩ đang bị khóa ưu tiên tái khám → `CLIN_1303`. Khóa tên `vetclinic:doctor:<id>` |
| `GET /api/v1/clinical/doctors/status` · `/doctors/me/visits` | RECEPTIONIST, ADMIN / VETERINARIAN | Bảng điều phối bác sĩ (tính động, không lưu) |
| `POST /pet-visits/{id}/start-exam` · `/services` · `/call-back` · `/postpone-callback` · `/close-visit` | VETERINARIAN (đúng bác sĩ được giao, sai → `CLIN_1308`) | `start-exam` tự thêm phí `EXAM_GEN`. Chỉ định CLS đưa ca sang `WAITING_RESULTS` và **giải phóng bác sĩ ngay**. `close-visit` bắt buộc `diagnosis` (`CLIN_1312`), khóa hồ sơ |
| `POST /pet-visits/{id}/abandon` · `/cancel` | RECEPTIONIST (+ADMIN) | `abandon` = EX-11 (ca `RESULTS_READY` → `COMPLETED`, vẫn phát `visit.closed_to_payment`). `cancel` bắt buộc `reason` |
| `GET /lab-queue` · `/imaging-queue` · `POST /service-details/{id}/start·postpone·recall·cancel` | LAB_TECHNICIAN / IMAGING_TECHNICIAN đúng phòng của mình | Hàng đợi có `queueState` (`NEXT_IN_LINE`, `POSTPONED`, ...) và `otherRoomStatus` (thú cưng đang ở phòng kia, EX-09) |
| `POST /service-details/{id}/lab-results` · `/imaging-result` (multipart `description`, `conclusion`, `files`) · `GET /imaging-attachments/{id}/file` | LAB_TECHNICIAN / IMAGING_TECHNICIAN / người xem được hồ sơ | Lab: đánh giá `HIGH/LOW/NORMAL` theo khoảng tham chiếu **của loài**, chụp snapshot khoảng vào bản ghi. Ảnh: kiểm tra magic-byte JPEG/PNG/DICOM (không tin `Content-Type`), tên đĩa là UUID, tối đa 20MB |
| `GET /internal/clinical/pets/{id}` · `/pets?ids=` · `/internal/clinical/visits/{id}` · `/visits?ids=` · `/visits/{id}/billable-services` | không cần header | Cho appointment (kiểm tra thú cưng) và billing (tóm tắt đợt khám; dịch vụ tính tiền: chỉ dòng `COMPLETED`, đơn giá đã chốt lúc chỉ định) |

- **Máy trạng thái SM-01** (`VisitStatus.canTransitionTo`): `WAITING → IN_PROGRESS|CANCELLED`; `IN_PROGRESS → WAITING_RESULTS|WAITING_PAYMENT|CANCELLED`; `WAITING_RESULTS → RESULTS_READY|CANCELLED`; `RESULTS_READY → IN_PROGRESS|COMPLETED`; `WAITING_PAYMENT → COMPLETED`. Mọi lần đổi ghi `pet_visit_status_histories` trong cùng transaction.
- **Trạng thái bác sĩ (tính động):** BUSY nếu có ca `IN_PROGRESS` **hoặc** ca `WAITING` đã giao; BUSY thắng khóa ưu tiên. `AVAILABLE_PRIORITY_CALLBACK` nếu có ca `RESULTS_READY` và `callback_postponed_at IS NULL`. Ngược lại `AVAILABLE`.
- **EX-10 đã chốt (không còn là câu hỏi mở):** thêm cột `pet_visits.callback_postponed_at TIMESTAMP NULL` (đã có trong `schema_init.sql` và ERD). `postpone-callback` ghi giá trị, `call-back` (RECALL) xóa giá trị.
- **Chuyển `WAITING_RESULTS → RESULTS_READY` khi hai kỹ thuật viên hoàn tất hai dịch vụ cuối cùng cùng lúc:** transaction chạy `READ_COMMITTED`; khóa dòng `pet_visits` (`findByIdForUpdate`) **trước**, rồi mới đếm các dòng LABORATORY/IMAGING còn `PENDING`/`IN_PROGRESS`. Nếu đếm trước khi khóa thì cả hai cùng thấy dòng kia chưa xong và ca kẹt ở `WAITING_RESULTS` mãi. Đã kiểm chứng 5/5 vòng chạy song song.
- **Khóa tên dùng chung:** `NamedLockService` (common-library) là bản tổng quát của `SlotLockService` (cùng nguyên tắc: kết nối riêng, nhả sau commit, sắp tên khi lấy nhiều khóa, lỗi `SYS_1008 RESOURCE_BUSY`). Dùng cho `vetclinic:visit-pet:<id>` (chặn check-in trùng) và `vetclinic:doctor:<id>`.
- **Request DTO không dùng kiểu nguyên thủy cho trường tùy chọn.** Jackson 3 mặc định từ chối thiếu `boolean`/`int` (400 `SYS_1001`); dùng `Boolean`/`Integer` rồi xử lý null. (Đã gặp thật với `CheckInRequest.emergency`.)
- **Sự kiện:** phát `VisitCheckedInEvent`, `DoctorPriorityCallbackEvent` (khi sang `RESULTS_READY`), `VisitClosedToPaymentEvent`; nhận `payment.completed` qua queue `clinical-service.payment.completed` (idempotent: chỉ chuyển nếu visit đang `WAITING_PAYMENT`; visit không tồn tại → DLQ sau 3 lần thử).
- **Hàng đợi 3 bậc (nghiệp vụ §8.4, §9):** cột `pet_visits.scheduled_at` = giờ bắt đầu khung hẹn, chỉ được gán khi khách có hẹn check-in **chưa quá hết khung giờ** (đến sớm vẫn tính đúng giờ; `QueueSchedule`). Đến trễ quá khung → null, xếp như khách vãng lai (lịch sử ghi "đến trễ"). Sắp xếp: `emergency DESC, scheduled_at IS NULL, scheduled_at, checked_in_at, id`.
- **Dịch vụ xét nghiệm gồm chỉ số nào (câu hỏi mở #2 đã chốt):** bảng `service_lab_test_items(service_id, lab_test_item_id)`. Dịch vụ **chưa cấu hình dòng nào = gồm mọi chỉ số** (tương thích ngược). `GET /service-details/{id}/lab-form` (LAB_TECHNICIAN, VETERINARIAN) trả chỉ các chỉ số của dịch vụ kèm khoảng tham chiếu **của loài thú cưng**; nhập chỉ số ngoài dịch vụ → `CLIN_1319`.
- **CRUD Admin danh mục xét nghiệm (UC-05, UC-06):** `POST /api/v1/clinical/lab-test-items` (kèm `ranges` theo loài, min < max), `PUT /lab-test-items/{id}` (mã bất biến), `PUT /lab-test-items/{id}/ranges/{speciesId}` (thêm/sửa khoảng; **kết quả cũ giữ snapshot khoảng cũ**), `GET/PUT /services/{id}/lab-test-items` (chỉ dịch vụ `LABORATORY`; PUT thay toàn bộ, rỗng = mọi chỉ số). Chỉ số không xóa (đã có kết quả tham chiếu).
- **Bệnh án trọn đời (UC-38, UC-39, FR-67, FR-68):** `GET /api/v1/pets/{id}/medical-history?page&size` (PET_OWNER, RECEPTIONIST, VETERINARIAN, ADMIN): timeline mới nhất trước; mỗi mục = đợt khám đầy đủ (chẩn đoán, dịch vụ, kết quả xét nghiệm có đánh giá, ảnh CĐHA) + `doctorName` + `prescription` (lấy qua Feign từ billing `GET /internal/billing/prescriptions?visitIds=`, đơn chưa hủy, kèm liều dùng/hướng dẫn). **Chủ nuôi chỉ thấy thú cưng của mình và chỉ các đợt `COMPLETED`**; của người khác → `APPT_1201`. Billing/auth sập thì `prescription`/`doctorName` là null, bệnh án vẫn trả.
- **Mở lại đợt khám (T12, câu hỏi mở #4 đã chốt):** `POST /pet-visits/{id}/reopen` `{reason}` — **chỉ ADMIN** ("người có thẩm quyền"). Chỉ khi ca `WAITING_PAYMENT` (chưa thu tiền) và bác sĩ phụ trách **không BUSY**: kiểm tra bác sĩ → Feign billing hủy hóa đơn `PENDING` (đã `PAID` → `BILL_1403`) → `WAITING_PAYMENT → IN_PROGRESS`, bỏ khóa hồ sơ, xóa `closed_at`, ghi lịch sử kèm lý do. Bác sĩ sửa đơn thuốc / thêm dịch vụ rồi `close-visit` lại: billing **dựng lại đúng hóa đơn cũ** (cùng id, cùng mã) với nội dung mới. Ca `COMPLETED` không mở lại được (`CLIN_1305`). Nếu sập giữa chừng (hóa đơn đã hủy, ca còn `WAITING_PAYMENT`) thì gọi lại `reopen` (billing idempotent) hoặc lễ tân `POST /billing/invoices/from-visit/{visitId}`.
- **`GET /api/v1/clinical/reports/operations?fromDate&toDate`** (ADMIN, FR-70): tổng ca, theo trạng thái, hoàn tất, hủy, cấp cứu, **ca thường vs ca có cận lâm sàng** (có ít nhất một chỉ định Lab/CĐHA chưa hủy), số ca và số ca hoàn tất của từng bác sĩ (kèm tên). Theo ngày check-in giờ VN.
- **Chưa làm / sai lệch có chủ ý:** (1) lịch sử thay đổi trạng thái dịch vụ CLS vẫn chỉ xem qua API chi tiết ca; (2) chưa có API Admin để xóa chỉ số / khoảng tham chiếu (cố ý: ràng buộc toàn vẹn với kết quả cũ).

**billing-pharmacy-service (đã hoàn thiện, 68 unit test + 151 kiểm tra end-to-end qua Gateway):**

| Endpoint | Quyền | Ghi chú |
|---|---|---|
| `GET /api/v1/pharmacy/medicines` · `/{id}` | VETERINARIAN, RECEPTIONIST, ADMIN | Lọc `keyword` (mã/tên/hoạt chất), `active`, `lowStock`. Vai trò khác Admin **bị ép chỉ thấy thuốc đang kinh doanh** |
| `POST/PUT /medicines` · `POST /{id}/import` · `/{id}/adjust` · `GET /{id}/transactions` | ADMIN | `import` quantity > 0; `adjust` delta ≠ 0 (âm = hao hụt) và bắt buộc `reason`; làm tồn kho âm → `PHARM_1412`. Mã thuốc bất biến, tồn kho chỉ đổi qua import/adjust/xuất thuốc. Ngừng kinh doanh = `active:false` (không xóa cứng) |
| `POST /api/v1/pharmacy/prescriptions` · `PUT /{id}` | VETERINARIAN (đúng bác sĩ của ca, ca đang `IN_PROGRESS`) | **Gọi TRƯỚC `close-visit`.** Chốt đơn giá hiện tại, chặn kê vượt tồn kho (`PHARM_1406`) nhưng **không trừ kho**. Sửa = thay toàn bộ dòng thuốc. Sau khi ca đã chốt hoặc đã có hóa đơn → `PHARM_1409`. Đợt khám đã có đơn → `PHARM_1408` (đơn đã `CANCELLED` thì POST dùng lại đúng dòng cũ vì `visit_id` UNIQUE) |
| `GET /prescriptions` · `/{id}` · `/by-visit/{visitId}` | RECEPTIONIST, VETERINARIAN, ADMIN (+PET_OWNER cho 2 endpoint sau: chỉ đơn chưa hủy của thú cưng mình, người khác trả `PHARM_1404`) | `?awaitingDispense=true` = hàng đợi phát thuốc của quầy (đơn `PRESCRIBED` có hóa đơn `PAID`, cũ nhất trước) |
| `POST /prescriptions/{id}/cancel` | VETERINARIAN (ca còn `IN_PROGRESS`, chưa có hóa đơn), RECEPTIONIST/ADMIN (hóa đơn còn `PENDING`) | Lễ tân hủy = khách xin toa mua ngoài: gỡ dòng thuốc khỏi hóa đơn, tính lại tổng, chiết khấu bị kéo về mức trần mới. Hóa đơn đã `PAID` → `BILL_1403` |
| `POST /prescriptions/{id}/dispense` | RECEPTIONIST, ADMIN | UC-36. Chỉ khi hóa đơn `PAID` (`BILL_1413`) và đơn `PRESCRIBED` (`PHARM_1407` nếu đã xuất). Trừ kho nguyên tử theo thứ tự `medicine_id`, một thuốc thiếu thì **rollback toàn bộ** (`PHARM_1406`). Xong thì phát `payment.completed` |
| `GET /api/v1/billing/invoices` · `/{id}` · `/by-visit/{visitId}` | RECEPTIONIST, ADMIN | Lọc `status, code, visitId, fromDate, toDate, ascending`. Hàng chờ thu ngân: `status=PENDING&ascending=true`. Kèm `visitCode`, `petName`, `ownerId` (lấy từ clinical, thiếu thì null chứ không lỗi) |
| `PUT /invoices/{id}/discount` | RECEPTIONIST, ADMIN | Chiết khấu ≤ tổng viện phí đã gồm VAT (bằng nhau được, vượt → `BILL_1402`, EX-14). Chỉ hóa đơn `PENDING` |
| `POST /invoices/{id}/confirm-payment` | RECEPTIONIST, ADMIN | `PENDING → PAID`, ghi `cashier_id` + `paid_at`. **Không có đơn thuốc chưa phát → phát `payment.completed` ngay** (ca `COMPLETED`); còn đơn → chờ `dispense` (BR-28). Thanh toán lần 2 → `BILL_1403` |
| `POST /invoices/from-visit/{visitId}` | RECEPTIONIST, ADMIN | **Đường cứu hộ** khi sự kiện chốt ca vào DLQ: lập hóa đơn cho ca `WAITING_PAYMENT` (hoặc `COMPLETED` do khách bỏ về). Idempotent. Ca chưa chốt → `BILL_1415` |

- **Luồng chuẩn:** bác sĩ `POST /prescriptions` → `close-visit` (clinical) → clinical phát `visit.closed_to_payment` → billing tự lập hóa đơn `PENDING` (dịch vụ: Feign `GET /internal/clinical/visits/{id}/billable-services`, chỉ dòng `COMPLETED`; thuốc: từ đơn `PRESCRIBED`, bỏ đơn đã hủy) → thu ngân `discount` (tùy chọn) → `confirm-payment` → `dispense` → `payment.completed` → clinical chuyển `WAITING_PAYMENT → COMPLETED`, lịch sử ghi `changed_by_user_id` = thu ngân.
- **Khóa tên `vetclinic:visit-billing:<visitId>`** (`BillingLocks.visit`) bao mọi thao tác "kiểm tra rồi ghi" giữa đơn thuốc và hóa đơn của cùng một ca: lưu/sửa/hủy đơn và lập hóa đơn. Nhờ vậy đơn không thể lọt vào sau khi hóa đơn đã lập (và ngược lại). Khóa dòng: `findByIdForUpdate` cho hóa đơn (thanh toán, chiết khấu) và đơn thuốc (xuất, hủy) → 6 request thanh toán/xuất song song chỉ đúng 1 thành công. Thứ tự khóa: đơn thuốc → hóa đơn (hủy), hóa đơn → đọc đơn không khóa (thanh toán), đơn → đọc hóa đơn không khóa (xuất): không có chu trình.
- **Tồn kho chỉ đổi bằng `UPDATE ... WHERE stock_quantity >= :qty`** (`MedicineRepository.deductStock/addStock`). **Cố ý không `clearAutomatically`** (nó tách rời đơn thuốc đang xử lý khỏi persistence context): nơi gọi `EntityManager.refresh(medicine)` để đọc tồn kho thật. `Medicine` có `@DynamicUpdate` để Admin sửa tên/giá không ghi đè số tồn vừa đổi. Không bao giờ gán `stockQuantity` rồi `save()`.
- **Nhật ký kho `inventory_transactions.quantity`:** `IMPORT` và `EXPORT_PRESCRIPTION` luôn dương (chiều do loại giao dịch quyết định, đúng mẫu quy chuẩn), riêng `ADJUSTMENT` mang dấu. `reference_id` = id đơn thuốc khi xuất. Tồn kho `<= min_stock_alert` sau khi xuất hoặc cân chỉnh giảm → phát `stock.low_alert` (mỗi lần, không chỉ lần vượt ngưỡng; notification tự lọc trùng).
- **Mã hóa đơn `INV-yyyy-NNNNN`** (năm theo giờ phòng khám + id, luôn duy nhất; chèn mã tạm `TMP-<uuid>` rồi đổi ngay trong cùng transaction). VAT: `vetclinic.billing.vat.service-rate` / `medicine-rate` (mặc định 0, phải nằm trong [0,1)); mọi phép tính tiền ở `InvoiceCalculator`.
- **Thêm vào clinical:** `GET /internal/clinical/visits/{id}` và `GET /internal/clinical/visits?ids=1,2` → `{id, visitCode, status, petId, petName, ownerId, doctorId}` (billing dùng để kiểm tra quyền kê đơn, quyền xem của chủ nuôi, làm giàu danh sách).
- **Hủy hóa đơn (SM-05):** `POST /invoices/{id}/cancel` `{reason}` (RECEPTIONIST, ADMIN): `PENDING → CANCELLED`, ghi lý do vào `notes`, gỡ liên kết đơn thuốc; đã `PAID` → `BILL_1403`. Hóa đơn `CANCELLED` không thanh toán / chiết khấu được (`BILL_1414`). Hóa đơn đã hủy **được dựng lại** (cùng id/mã, nội dung mới, chiết khấu về 0) khi: lễ tân `from-visit`, hoặc sự kiện `visit.closed_to_payment` **xảy ra SAU lúc hủy** (`event.occurredAt > invoice.updatedAt`) — sự kiện chốt ca cũ bị giao lại không làm sống lại hóa đơn đã hủy. Đơn thuốc chỉ bị khóa bởi hóa đơn **còn hiệu lực** (`hasActiveInvoice`: PENDING/PAID), nên sau khi mở lại đợt khám bác sĩ sửa được đơn.
- **Endpoint nội bộ:** `POST /internal/billing/invoices/by-visit/{visitId}/cancel-for-reopen` (clinical gọi khi mở lại ca; idempotent) và `GET /internal/billing/prescriptions?visitIds=` (cho bệnh án trọn đời).
- **`GET /api/v1/billing/reports/revenue?fromDate&toDate&groupBy=DAY|WEEK|MONTH|QUARTER`** (ADMIN, FR-69): doanh thu chỉ tính hóa đơn `PAID` theo **ngày thu tiền giờ VN**, phân rã dịch vụ / thuốc / VAT / chiết khấu / thực thu, kỳ trống vẫn có dòng (biểu đồ liên tục), `byStatus` (số hóa đơn và tiền theo trạng thái cho hóa đơn lập trong kỳ; `PENDING` = công nợ). Mặc định 30 ngày, tối đa 366 ngày.
- **Chưa làm / sai lệch có chủ ý:** (1) chưa có in phiếu tạm tính / hóa đơn (FE tự in từ bảng kê); (2) kiểm tra tồn kho lúc kê đơn là kiểm tra mềm (không giữ chỗ), nên vẫn có thể thiếu hàng lúc xuất (EX-15 xử lý bằng rollback); (3) tỉ lệ VAT thực tế vẫn chờ nhóm chốt (§8 mục 3); (4) hoàn tiền sau khi đã thu chưa có (hóa đơn `PAID` không hủy, không mở lại ca).

**notification-service (đã hoàn thiện, 32 unit test + 68 kiểm tra end-to-end qua Gateway bằng client STOMP thật):**

| Thành phần | Chi tiết |
|---|---|
| Kết nối | `ws://<gateway>:8080/ws` (WebSocket thuần, không SockJS). Gateway cho `/ws/**` đi qua; **JWT được kiểm tra trong frame `CONNECT`** (`StompAuthChannelInterceptor`): header `Authorization: Bearer <accessToken>` hoặc header `token`. Sai/hết hạn/thiếu → frame `ERROR` và đóng kết nối. Không hỗ trợ `?token=` trên URL (lộ token trong log). `X-User-Id`/`X-User-Role` trong CONNECT bị bỏ qua |
| Kênh được phép `SUBSCRIBE` | `/user/queue/notifications` (riêng từng người, Principal name = userId) và `/topic/role/<ROLE CỦA CHÍNH MÌNH>`. Kênh vai trò khác hoặc kênh lạ → `ERROR` + đóng. **`SEND` bị cấm hoàn toàn**: client chỉ nhận |
| `GET /api/v1/notifications?limit=` | Mọi người đã đăng nhập: thông báo gần nhất (riêng + chung của vai trò), mới nhất trước. Dùng khi vừa đăng nhập / kết nối lại. **Lưu trong bộ nhớ** (50 mỗi người/vai trò, mất khi restart, chỉ đúng với 1 instance); phiên kết nối lại KHÔNG được đẩy lại thông báo cũ |
| `POST /api/v1/notifications/send-email` | ADMIN. `{to, subject, content}` |
| Payload | `{id, type, severity (INFO/WARNING/CRITICAL), title, body, data{...id để điều hướng}, createdAt}` |

| Sự kiện | Người nhận | Nội dung |
|---|---|---|
| `appointment.created` | Lễ tân (chỉ lịch `PENDING`), chủ nuôi (riêng) + **email xác nhận** cho chủ nuôi | Mã lịch, giờ hẹn, trạng thái |
| `appointment.status_changed` | **Chỉ chủ nuôi** (riêng, loại `APPOINTMENT_UPDATED`) + email nếu có | Duyệt (INFO), từ chối/hủy kèm **lý do** (WARNING), dời giờ (INFO), vắng mặt (WARNING). Phát cả khi hệ thống tự hủy lịch PENDING quá hạn / tự quét NO_SHOW |
| `visit.checked_in` | Lễ tân; thêm toàn bộ bác sĩ nếu **cấp cứu** (CRITICAL); chủ nuôi (riêng) | Mã ca, tên thú cưng |
| `doctor.priority_callback` | **Đúng bác sĩ phụ trách** (CRITICAL, `data.action=INVITE_PATIENT`, kèm số phòng); lễ tân (WARNING); chủ nuôi | UC-30 popup + huy hiệu Khóa ưu tiên |
| `visit.closed_to_payment` | Lễ tân (`abandoned` → WARNING "ghi nợ") | Ca chờ thanh toán |
| `payment.completed` | Lễ tân; chủ nuôi (riêng) + **email xác nhận thanh toán** | Ca hoàn tất |
| `stock.low_alert` | ADMIN (CRITICAL) | Tên thuốc, tồn, ngưỡng |

- **Bất biến:** mỗi (sự kiện, kênh) chỉ chạy thành công **một lần** (`ProcessedEvents`, theo `eventId`, đánh dấu SAU khi xong): giao lại sự kiện hoặc thử lại sau khi email lỗi không làm người dùng nhận trùng thông báo trong ứng dụng. Lỗi SMTP / auth-service sập khi cần email → ném lỗi → RabbitMQ thử 3 lần → DLQ `notification-service.<routing-key>.dlq`. Làm giàu nội dung (tên thú cưng, số phòng) lỗi thì bỏ qua, thông báo vẫn đi với nội dung rút gọn.
- Lấy email chủ nuôi qua `GET /internal/auth/users/{id}`; tên thú cưng / chủ nuôi qua `GET /internal/clinical/visits/{id}`. Chủ nuôi không có email thì chỉ bỏ thư, thông báo trong ứng dụng vẫn đi.
- Cần biến môi trường `JWT_SECRET` (đã thêm vào `docker-compose.yml`). Email gửi qua Mailpit (`http://localhost:8025` khi chạy file dev).
- Giới hạn: phiên WebSocket đã mở không bị cắt khi Access Token hết hạn (30 phút); khi chạy nhiều instance phải thay broker in-memory bằng relay RabbitMQ STOMP.

**Frontend (`fe/`, nối API thật cho 6 vai trò; build sạch, 22 test đơn vị + 50 bước smoke trên Chrome):**

- **Cấu hình kết nối:** `src/config.js` đọc `REACT_APP_API_URL` (Gateway) và suy ra `ws://.../ws`. Mọi lời gọi đi qua `src/api/client.js`; `src/api/endpoints.js` là danh sách hàm cho từng endpoint (không chứa nghiệp vụ). Tên trường giữ nguyên như backend; id trong URL là chuỗi.
- **Phiên đăng nhập** (`api/session.js`): Access/Refresh Token + hồ sơ ở localStorage ("Ghi nhớ đăng nhập") hoặc sessionStorage. Gặp 401 thì **refresh đúng một lần dùng chung** cho mọi request đang chờ (`refreshAccessToken` single-flight — hai refresh đồng thời với cùng token bị backend coi là đánh cắp và đăng xuất mọi thiết bị). Refresh hỏng thì xóa phiên, phát sự kiện `vetclinic:session-expired`, giao diện quay về đăng nhập. Đăng xuất xóa phiên cục bộ trước rồi mới gọi `/logout`.
- **Thông báo thời gian thực:** `api/stomp.js` là client STOMP 1.2 tối thiểu trên WebSocket thuần (không SockJS), gửi JWT trong khung `CONNECT`, chỉ `SUBSCRIBE` `/user/queue/notifications` và `/topic/role/<vai trò của chính mình>`, tự nối lại có độ trễ tăng dần. `contexts/NotificationContext.js` nạp `GET /notifications` rồi nhận sự kiện mới; trang có thể gọi `useNotificationEvents([...loại], callback)` để làm mới khi có sự kiện (bảng điều phối, hàng đợi hóa đơn, ca của bác sĩ), cộng thêm `usePolling` 15–30 giây phòng khi mất kết nối. "Đã đọc" chỉ lưu ở trình duyệt.
- **Phân quyền:** `RequireRole` theo mã vai trò của backend (`PET_OWNER`, `RECEPTIONIST`, `VETERINARIAN`, `LAB_TECHNICIAN`, `IMAGING_TECHNICIAN`, `ADMIN`). Đây chỉ là lớp tiện lợi — quyền thật nằm ở backend (`@PreAuthorize`). Menu mỗi vai trò ở `constants/navigation.js`, khung chung `layouts/StaffLayout.js`, cổng chủ nuôi `layouts/CustomerLayout.js`.
- **Bộ giao diện dùng chung:** `components/ui` (PageHead, Panel, Table, Pager, FormDialog…), `hooks/useAsync` (tải dữ liệu, bỏ qua kết quả của lần gọi cũ), `hooks/useAction` (thao tác ghi, **chặn bấm đúp**), `lib/format.js` (tiền VND, ngày giờ theo **giờ VN**; `LocalDate/LocalTime` không đi qua `Date` để khỏi lệch múi giờ), `lib/labels.js` (nhãn + màu cho enum). `toLocaleString('vi-VN')` xuất "giờ trước ngày" nên `formatDateTime` ghép từng phần để luôn ra `dd/MM/yyyy HH:mm` — đừng đổi lại.
- **Luồng giao diện cần nhớ:** bác sĩ phải **lưu đơn thuốc trước khi chốt ca**; chỉ định Lab/CĐHA đưa ca sang `WAITING_RESULTS` và bác sĩ rời trang ca (ca đó **không** có trong `/doctors/me/visits` cho tới khi `RESULTS_READY`); KTV phải bấm "Bắt đầu" rồi mới nhập kết quả; lễ tân tạo tài khoản chủ nuôi bằng mật khẩu tạm hiển thị **một lần**; ảnh CĐHA tải qua API có `Authorization` (blob) chứ không nhúng `<img src>` trực tiếp; mở lại đợt khám (T12) chỉ có ở trang "Đợt khám" của Admin.
- **Đã bỏ khỏi giao diện (ngoài phạm vi backend/đồ án):** lịch tiêm phòng, lô thuốc (batch), phương thức thanh toán / QR, hoàn tiền, nhật ký hoạt động hệ thống, trang "nhân sự và sức chứa" riêng (sức chứa tính từ số bác sĩ ACTIVE), đăng nhập mạng xã hội, dữ liệu demo trong localStorage.
- **Chưa có:** quên mật khẩu tự phục vụ (xử lý tại quầy qua "Đặt lại mật khẩu"); chủ nuôi chưa xem được **hóa đơn** của mình (backend chưa có `GET /billing/invoices` cho `PET_OWNER`; đơn thuốc nằm trong Lịch sử khám bệnh); chưa có test giao diện cho từng trang (đã có smoke end-to-end thay thế).

Package bên trong mỗi service: `config, controller, service(+impl), repository, entity, dto/request, dto/response, mapper, client, event, constant`. Scheduler đặt ở `scheduler/`.

URI prefix (Gateway, Controller và Feign phải khớp nhau): `/api/v1/auth/**` · `/api/v1/appointments/**` · `/api/v1/clinical/**`, `/api/v1/pets/**`, `/api/v1/species/**` · `/api/v1/billing/**`, `/api/v1/pharmacy/**` · `/api/v1/notifications/**`, `/ws/**`.

---

## 4. Lệnh chạy

> Cập nhật mục này mỗi khi `docker-compose.yml` hoặc `pom.xml` thay đổi.

**Kiểm thử end-to-end** (`e2e/`, chi tiết ở `e2e/README.md`): `bash e2e/run_all.sh` chạy appointment (85), clinical (171), billing (151), notification (68); `e2e/features.py` (138) cần appointment-service chạy với `BOOKING_PENDING_EXPIRY_CRON='*/5 * * * * *'`. **Mỗi kịch bản xóa dữ liệu nghiệp vụ**, chỉ chạy trên môi trường thử nghiệm. Unit test backend: `cd vetclinic-backend && mvn clean install` (288 test). **Giao diện:** `cd fe && npm test` (22 test: lớp API, STOMP, định dạng) và `node e2e/fe_smoke.mjs` (50 bước trên Chrome thật qua Gateway; cần stack đang chạy, `fe/build` đã build hoặc `docker compose up -d frontend`; cũng xóa/để lại dữ liệu nghiệp vụ như các kịch bản khác, nên `bash e2e/reset_data.sh` trước mỗi lần chạy lại).

Lần đầu: `cp .env.example .env` rồi điền `JWT_SECRET` (`openssl rand -hex 32`). File `.env` không được commit.

```bash
docker compose up -d --build               # Chạy toàn bộ hệ thống (NFR-08: 1 lệnh). Chỉ public :8080
docker compose ps                          # Mọi service phải "healthy"
docker compose down -v                     # RESET DB: bắt buộc mỗi khi sửa schema_init.sql (script chỉ chạy khi volume còn trống)

# Dev: chạy hạ tầng trong Docker (mở port 3306/5672/15672/8761/8025), service đang code chạy trong IDE
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mysql-server rabbitmq-broker mailpit service-registry

# Maven: máy đang để JAVA_HOME = JDK 17, nên phải trỏ sang JDK 21 trước (enforcer sẽ chặn nếu sai)
export JAVA_HOME="C:/Program Files/Java/jdk-21.0.6"        # PowerShell: $env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.6"
cd vetclinic-backend && mvn -q clean install -DskipTests     # Build toàn bộ
mvn -pl clinical-service spring-boot:run                     # Chạy 1 service (sau khi đã install). Cần env JWT_SECRET cho gateway/auth
mvn -pl billing-pharmacy-service test -Dtest=PharmacyServiceImplTest  # Chạy 1 test
```
**Nếu test/chạy trên máy báo `ClassFormatError: Invalid method Code length 0` hoặc Mockito báo "could not instrument":** file `.class` trong `target/` của máy đã bị hỏng (constructor do Lombok sinh ra bị rỗng). Gặp thật một lần với `ApiResponse`/`PageResponse`; mã nguồn không sai, Docker biên dịch từ nguồn nên không bị. Chưa xác định nguyên nhân (nghi trình biên dịch tự động của IDE ghi đè vào `target/`). Chữa: `mvn clean install` lại; build sạch 3/3 lần đều đúng. Luôn dùng `clean` sau khi IDE vừa tự build.
Gateway: http://localhost:8080 · Khi chạy với file dev: RabbitMQ UI http://localhost:15672 · Eureka http://localhost:8761 · Mailpit http://localhost:8025
Tài khoản seed: `admin` / `Admin@123`. **Dữ liệu demo:** `docs/schema_init.sql` PHẦN 5 nạp thêm 15 tài khoản (mật khẩu chung `Demo@1234`; lễ tân `0910000001`, bác sĩ `0910000002/3/6/7`, KTV xét nghiệm `0910000004`, KTV CĐHA `0910000005`, chủ nuôi `0920000001..5`, bác sĩ nghỉ việc `0910000009`, chủ nuôi bị khóa `0920000006`) và dữ liệu cho cả 24 bảng (16 thú cưng, 17 lịch hẹn, 20 đợt khám đủ 7 trạng thái, 11 hóa đơn...). Mốc thời gian tính **tương đối lúc dựng DB**, nên `docker compose down -v && up -d` ngay trước buổi demo. Ảnh CĐHA mẫu ở `docs/demo-images/` (gắn vào clinical-service tại `/app/uploads/imaging/seed`). Bản đồ dữ liệu → use case và bảng tài khoản: `docs/KICH_BAN_KIEM_THU_USE_CASE.md` §1.2 và §1.5. `e2e/reset_data.sh` (và mọi kịch bản e2e) xóa dữ liệu demo, chỉ giữ danh mục gốc.

**Giao diện (`fe/`):** `cd fe && npm install && npm start` (cổng 3000, đọc `fe/.env`: `REACT_APP_API_URL=http://localhost:8080`); `npm run build` (phải "Compiled successfully", không cảnh báo lint). Chạy bằng Docker: `docker compose up -d --build frontend` → http://localhost:3000 (nginx, có SPA fallback; địa chỉ Gateway được nhúng lúc build qua `PUBLIC_API_URL`, mặc định `http://localhost:8080`). Origin của FE phải nằm trong `CORS_ALLOWED_ORIGINS` của Gateway (mặc định đã có 3000 và 5173); đổi biến này thì phải **recreate** container gateway.

---

## 5. Quyết định đã chốt để hệ thống chạy ổn định (đọc trước khi code)

### 5.1. Sửa schema (các mục 1, 2, 5 đã áp dụng vào `schema_init.sql` và ERD.md ngày 28/10/2026)
1. ✅ Đã thêm `version BIGINT NOT NULL DEFAULT 0` vào `pet_visits`, `medicines`, `invoices`. Entity tương ứng **bắt buộc** có field `@Version private Long version;`.
2. ✅ `invoices.cashier_id` cho phép NULL. Hóa đơn `PENDING` được tạo tự động từ event lúc chưa có thu ngân; gán `cashier_id` khi `confirm-payment`.
3. `pet_visit_status_histories.changed_by_user_id` **giữ NOT NULL**. Vì vậy mọi event dẫn tới chuyển trạng thái phải mang theo `actorUserId` (ví dụ `cashierId`). Khi consumer ghi history thì lấy id từ event. Trong `appointment_status_histories`, `NULL` nghĩa là SYSTEM (scheduler).
4. `schema_init.sql` không idempotent (MySQL 8 không hỗ trợ `CREATE INDEX IF NOT EXISTS`). Chỉ mount vào `/docker-entrypoint-initdb.d/`. Muốn chạy lại thì `docker compose down -v`.
5. ✅ Hash BCrypt cũ của admin đã được kiểm chứng là **không khớp** `Admin@123`, và đã được thay bằng hash mới sinh bởi `BCryptPasswordEncoder(12)`. auth-service phải dùng `BCryptPasswordEncoder` (strength 12) để mật khẩu khớp.
6. Seed đang hard-code `role_id = 1` cho ADMIN và `species_id` 1/2, tức là phụ thuộc thứ tự INSERT. Không đổi thứ tự các câu INSERT.
7. ✅ **Bảng mã seed:** client `mysql` trong entrypoint Docker không dùng UTF-8, làm mọi tiếng Việt trong seed bị mã hóa 2 lần ("Quản" → "Quáº£n"). Đã thêm `SET NAMES utf8mb4;` ở đầu `schema_init.sql`. Giữ nguyên dòng này. Khi kiểm tra dữ liệu bằng CLI nhớ thêm `mysql --default-character-set=utf8mb4`, nếu không output cũng bị vỡ dấu dù dữ liệu đúng.
8. ✅ **`pet_visits.scheduled_at TIMESTAMP NULL`** (hàng đợi 3 bậc) và **bảng `service_lab_test_items`** (dịch vụ xét nghiệm gồm chỉ số nào; seed gắn `LAB_CBC` với WBC, RBC, HGB, PLT). Đã có trong `schema_init.sql` và ERD (24 bảng).
9. ✅ **Dữ liệu demo (PHẦN 5 của `schema_init.sql`):** chỉ có INSERT, không đổi DDL. ID gán tường minh vì tham chiếu chéo giữa 4 database không có khóa ngoại vật lý. Giữ nhất quán khi sửa: tổng hóa đơn = Σ dòng, tồn kho = số dư cuối của nhật ký kho, đánh giá xét nghiệm khớp snapshot khoảng theo loài, mỗi thú cưng tối đa 1 đợt khám đang mở. Danh mục demo thêm (loài id>2, dịch vụ id>7, thuốc id>4, chỉ số id>4) bị `reset_data.sh` gỡ để e2e đếm đúng.

### 5.2. Ranh giới transaction liên service (tài liệu UC/AD mô tả "1 giao dịch" nhưng thực tế các bảng nằm ở 2 database khác nhau)
Không có transaction nào được phép ghi vào database của service khác. Thay vào đó dùng **local transaction, rồi publish event sau commit, consumer xử lý idempotent**:
- **Check-in có lịch hẹn (UC-19):** clinical gọi Feign `GET appointment` để kiểm tra lịch hẹn đang `CONFIRMED`. Sau đó tạo `pet_visits` trong local tx (`appointment_id UNIQUE` chặn check-in 2 lần). Sau commit, publish `visit.checked_in`. **appointment-service consume event này** để chuyển lịch hẹn sang `CHECKED_IN` và ghi history. Nếu đã là `CHECKED_IN` thì bỏ qua.
- **Thanh toán & xuất thuốc (UC-35/36):** tách làm 2 action theo đúng use case. `confirm-payment` chuyển hóa đơn sang `PAID`, còn `dispense` trừ kho và chuyển đơn sang `DISPENSED`. Mỗi action là một `@Transactional` riêng trong billing. **Billing không chạm vào `pet_visits`.** Khi ca khám xong hẳn (đã PAID và đơn đã DISPENSED, hoặc không có đơn thuốc) thì publish `payment.completed`. clinical consume để chuyển visit sang `COMPLETED` và đặt `completed_at`. Bước này idempotent: chỉ chuyển nếu visit đang `WAITING_PAYMENT`.
- **Chốt ca (close-visit):** đơn thuốc nằm ở billing, nên FE gọi `POST /api/v1/pharmacy/prescriptions` trước, sau đó mới gọi `POST /api/v1/clinical/pet-visits/{id}/close-visit`. Khi clinical publish `visit.closed_to_payment`, billing tạo hóa đơn `PENDING`. Tiền dịch vụ lấy qua Feign từ clinical (chỉ lấy dòng `COMPLETED`, bỏ `CANCELLED`). Tiền thuốc lấy từ đơn thuốc trong DB của billing. Bước tạo hóa đơn idempotent nhờ `invoices.visit_id UNIQUE`.
- EX-11 (khách bỏ về khi ca đang `RESULTS_READY`): visit chuyển thẳng sang `COMPLETED`, đồng thời vẫn publish `visit.closed_to_payment` để billing tạo hóa đơn nợ `PENDING`. Billing phải chấp nhận trường hợp hóa đơn PENDING thuộc một visit đã COMPLETED.

### 5.3. RabbitMQ: một danh mục duy nhất
Exchange kiểu topic **`clinic.events`** (tài liệu kiến trúc ghi `clinic.exchange`, đó là tên cũ). Tên event lấy theo quy chuẩn:

| Event | Routing key | Producer → Consumer |
|---|---|---|
| `AppointmentCreatedEvent` | `appointment.created` | appointment → notification |
| `AppointmentStatusChangedEvent` | `appointment.status_changed` | appointment → notification (báo chủ nuôi khi **lễ tân/hệ thống** duyệt, từ chối, dời giờ, ghi nhận vắng mặt; hành động của chính chủ nuôi không phát) |
| `VisitCheckedInEvent` | `visit.checked_in` | clinical → notification, **appointment** |
| `DoctorPriorityCallbackEvent` (= "ParaclinicalResultsReady") | `doctor.priority_callback` | clinical → notification |
| `VisitClosedToPaymentEvent` | `visit.closed_to_payment` | clinical → billing, notification |
| `PaymentAndDispenseCompletedEvent` (= "VisitCompletedEvent" trong kế hoạch) | `payment.completed` | billing → clinical, notification |
| `LowStockEvent` | `stock.low_alert` | billing → notification |

- Mỗi consumer có queue riêng theo mẫu `<service>.<routing-key>`, durable, gắn **DLQ**. Retry có giới hạn (3 lần), không requeue vô hạn.
- Payload là record DTO nằm trong `common-library` (`com.vetclinic.common.event`), luôn chứa `eventId`, `occurredAt` (Instant) và `actorUserId`.
- **Chỉ publish trong `@TransactionalEventListener(phase = AFTER_COMMIT)`.** Không bao giờ gọi `rabbitTemplate` ngay trong method `@Transactional`.
- Consumer phải idempotent: kiểm tra trạng thái hiện tại trước khi chuyển. Nhận lại cùng một event thì không có tác dụng gì.

### 5.4. `common-library` không được làm sập Gateway
Gateway chạy WebFlux, các service còn lại chạy Servlet. Mọi service đều đặt `scanBasePackages = "com.vetclinic"`, nên:
- Các bean servlet trong common (`GlobalExceptionHandler`, `HeaderAuthenticationFilter`, `CommonSecurityConfig`) phải gắn `@ConditionalOnWebApplication(type = SERVLET)`. Bean dùng Feign (`CustomFeignErrorDecoder`, `FeignClientInterceptor`, handler `FeignException`) gắn `@ConditionalOnClass(name = "feign.Feign")`. Các dependency web/security/feign trong `common-library/pom.xml` khai báo `<optional>true</optional>`.
- Service-registry không cần security chung: không scan `com.vetclinic.common`, hoặc dùng điều kiện như trên.
- `HeaderAuthenticationFilter` **không** khai báo bằng `@Component`. Nếu lỡ khai báo thì phải thêm `FilterRegistrationBean` với `setEnabled(false)`, vì Boot tự đăng ký mọi bean Filter vào servlet chain và filter sẽ chạy 2 lần. Chỉ add vào `SecurityFilterChain`.

### 5.5. Bảo mật
- Gateway: **xóa `X-User-Id`/`X-User-Role` có sẵn trong request** trước khi đọc JWT. Token sai hoặc hết hạn thì trả **401 ngay tại Gateway**. Có whitelist cho các route public: `POST /api/v1/auth/login`, `/refresh`, `/register` (nếu có), `/actuator/health`.
- Docker: **chỉ publish port 8080**. Các service con tin header từ Gateway, nên nếu mở port của chúng ra ngoài thì ai cũng giả mạo được quyền. Port hạ tầng cho dev chỉ mở trong `docker-compose.dev.yml` (cố ý không đặt tên `override` để không tự nạp khi demo).
- CORS chỉ cấu hình ở Gateway. Cấu hình thêm ở service con sẽ sinh header trùng và trình duyệt chặn.
- WebSocket: Gateway route `/ws/**` tới `lb:ws://notification-service`. Trình duyệt không gắn được header cho WebSocket, nên gửi JWT trong STOMP `CONNECT` header (`Authorization: Bearer ...` hoặc `token`) và xác thực ở notification-service (không dùng query `?token=` vì lộ token trong log).
- `@PreAuthorize("hasRole('...')")` trên mọi endpoint nghiệp vụ. Gateway đặt claim `role` là code thô (`VETERINARIAN`); filter tự thêm tiền tố `ROLE_`.
- JWT: HS256, secret lấy từ biến môi trường `JWT_SECRET` (≥ 32 byte), dùng chung cho auth-service và gateway. Không commit secret.

### 5.6. Thời gian & múi giờ
- **JVM của mọi service có CSDL phải chạy múi giờ UTC** (không phải Asia/Ho_Chi_Minh): `TZ=UTC` + `-Duser.timezone=UTC` trong Docker, và `TimeZones.forceUtcDefault()` ở dòng đầu `main()` (chạy từ IDE trên máy giờ VN cũng không lệch). JDBC URL giữ `connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true`, `hibernate.jdbc.time_zone: UTC`. **Đã đo thực tế, đừng đổi lại:** Hibernate gửi `Instant` dưới dạng giờ UTC nên phiên JDBC bắt buộc là UTC; còn `LocalTime` bị đổi qua `java.sql.Time` theo múi giờ mặc định của JVM. JVM ở giờ VN + phiên UTC làm `09:00` bị ghi thành `01:00` vào DB (VN là +8:00 vào ngày 1970-01-01 mà Java dùng cho `Time`); API vẫn "đúng" vì đọc ra đảo ngược đối xứng nên rất khó phát hiện, nhưng `SELECT` trực tiếp và mọi môi trường khác múi giờ sẽ sai. Thử đặt phiên JDBC là giờ VN thì giờ hẹn đúng nhưng `created_at` lại lệch 7 giờ, nên chỉ có JVM = UTC là đúng cho cả hai.
- Giờ phòng khám luôn tính **tường minh**, không bao giờ qua múi giờ mặc định: dùng bean `Clock` (`Clock.system(ZoneId.of("Asia/Ho_Chi_Minh"))`, xem `BookingConfig`) cho "hôm nay / bây giờ", và `@Scheduled(..., zone = "Asia/Ho_Chi_Minh")`. Không dùng `LocalDate.now()` / `LocalDateTime.now()` trần.
- `appointment_date`/`start_time`/`end_time` là giờ địa phương VN (`LocalDate`/`LocalTime`), lưu nguyên giá trị (09:00 → `09:00:00`).
- Khung giờ: 14 slot, mỗi slot 30 phút. Sáng: 08:00, 08:30, … 11:00. Chiều: 13:30, 14:00, … 16:30. Đặt cấu hình trong `application.yml`, không hard-code rải rác.

### 5.7. Concurrency
- **Trừ kho:** dùng `UPDATE ... WHERE stock_quantity >= :qty` như quy chuẩn §8.1, kèm `@Modifying(clearAutomatically = true, flushAutomatically = true)`. Nếu thiếu `clear` thì `findById` sau đó trả entity cũ trong persistence context và `balance_after` bị sai. Sắp xếp các dòng thuốc theo `medicineId` trước khi trừ. Sau khi trừ, nếu `stock <= min_stock_alert` thì publish `LowStockEvent` (AFTER_COMMIT).
- **Mẫu khóa "kiểm tra rồi ghi" dùng chung: `SlotLockService` (appointment-service).** `GET_LOCK` của MySQL gắn với *kết nối*, không gắn với transaction. Nếu nhả khóa trước khi commit, người sau đếm chưa thấy dòng vừa chèn và vẫn vượt sức chứa. Vì vậy: lấy khóa trên **một kết nối riêng** (`DriverManager`, không lấy từ pool), chạy `TransactionTemplate` bên trong, và **chỉ đóng kết nối sau khi commit** (đóng kết nối là MySQL tự nhả khóa nên không thể rò khóa, và không làm cạn pool). Lấy nhiều khóa thì sắp theo tên để không chờ vòng tròn. Đúng cả khi chạy nhiều instance, không cần thêm bảng. Phương thức gọi khóa **không được** đánh dấu `@Transactional`. Đã kiểm chứng: 8 request song song vào khung sức chứa 2 → đúng 2 thành công; sau test không còn khóa nào rò (`performance_schema.metadata_locks`, `OBJECT_TYPE='USER LEVEL LOCK'`).
- **Phân công bác sĩ (UC-21, FR-25):** công thức trạng thái bác sĩ trong tài liệu bỏ sót các ca `WAITING` đã gán `doctor_id`, nên 2 lễ tân có thể cùng gán cho 1 bác sĩ. Quy tắc: bác sĩ được coi là **BUSY** nếu có ca `IN_PROGRESS` **hoặc** có ca `WAITING` đã gán cho mình. Kiểm tra và gán trong khóa tên `vetclinic:doctor:<id>` theo đúng mẫu `SlotLockService` ở trên (copy mẫu, đừng tự gọi `GET_LOCK` trong transaction). `start-exam` vẫn kiểm tra `existsByDoctorIdAndStatus(IN_PROGRESS)`.
- **Chuyển trạng thái không có cột `version`** (vd. `appointments`): lấy dòng bằng `@Lock(PESSIMISTIC_WRITE)` (`findByIdForUpdate`) rồi kiểm tra lại trạng thái, để confirm/cancel/check-in/no-show xảy ra cùng lúc không ghi đè nhau. Lỗi khóa dòng/deadlock của DB được `PersistenceExceptionHandler` đổi thành 409 `SYS_1005`.
- Mọi action endpoint (`POST /{id}/start-exam`, `close-visit`, `confirm-payment`, `dispense`, ...) đều kiểm tra trạng thái nguồn và dùng `@Version`. Bấm 2 lần thì lần sau trả lỗi nghiệp vụ, không được tạo bản ghi trùng.

### 5.8. Quy tắc nghiệp vụ còn thiếu trong tài liệu (đã chốt mặc định)
- Khi `start-exam`, tự thêm 1 dòng `visit_service_details` cho `EXAM_GEN` (giá snapshot, trạng thái `COMPLETED`). Các dịch vụ làm tại phòng bác sĩ (VACCINATION, DEWORMING, INJECTION_INFUSION, PROCEDURE, ...) được tạo thẳng với trạng thái `COMPLETED`.
- Hàng đợi Lab chỉ lọc category `LABORATORY`, hàng đợi CĐHA chỉ lọc `IMAGING`. Điều kiện chuyển `RESULTS_READY` **chỉ xét các dòng LABORATORY/IMAGING**: không còn dòng nào `PENDING`/`IN_PROGRESS`.
- Trạng thái con `POSTPONED`/`NEXT_IN_LINE` của dịch vụ CLS không có cột riêng. Suy ra từ `action` mới nhất trong `visit_service_detail_histories` (`POSTPONED` → tab hoãn, `RECALL` → ghim ưu tiên kế tiếp).
- Chưa có tỉ lệ VAT. Đặt vào cấu hình `billing.vat.service-rate` và `billing.vat.medicine-rate`, mặc định `0.00`. Tính bằng `BigDecimal`, làm tròn `HALF_UP` 2 chữ số thập phân. `final_amount = Σsubtotal + Σvat - discount`, với điều kiện `discount ≤ Σsubtotal + Σvat` (EX-14).
- Code sinh mã (`APT-`, `VIS-`, `PET-`, `INV-`) phải dựa vào ràng buộc UNIQUE của DB và retry khi trùng. Không sinh bằng `count + 1`.

### 5.9. Lỗi trong code mẫu của quy chuẩn (đừng chép nguyên)
- `PetVisitServiceImpl.startExamination` gọi Feign **bên trong** `@Transactional`, trái với quy tắc của chính tài liệu. Phải tách: transaction lo phần ghi DB, phần làm giàu dữ liệu qua Feign đặt ở method ngoài transaction (hoặc ở controller hay facade).
- `AppointmentNoShowScheduler` dùng `LocalDate.now()` không truyền zone. Sửa theo §5.6.
- Mã `PET_NOT_FOUND = "APPT_1201"` dù `pets` giờ thuộc clinical. **Giữ nguyên mã chuỗi** vì FE đã tham chiếu. Mã lỗi mới thì thêm vào cuối nhóm tương ứng, không đánh số lại.
- `Medicine` có `@Version`, nhưng bulk UPDATE không tăng version. Đây là chủ ý: an toàn được đảm bảo bởi điều kiện `WHERE` của câu UPDATE.
- `RefreshTokenServiceImpl.refresh` mẫu: ném `AppException` (RuntimeException) bên trong `@Transactional` sẽ **rollback luôn lệnh "thu hồi toàn bộ phiên"** vừa chạy, nên phát hiện đánh cắp token hoá ra vô tác dụng. Bản thật dùng `@Transactional(noRollbackFor = AppException.class)` và thu hồi bằng câu UPDATE nguyên tử (`revokeIfActive`). Mẫu "chặn lỗi rồi ném exception nhưng vẫn phải ghi DB" ở chỗ khác cũng phải xử lý như vậy.
- Spring Security 7 từ chối mật khẩu BCrypt dài hơn 72 byte bằng exception: luôn kiểm tra độ dài byte (`AccountRules.exceedsBcryptLimit`) trước khi gọi `matches`/`encode`.
- Đừng để `userId` trong JWT là số: jjwt-gson có thể parse thành `5.0`, và `SecurityUtils.getCurrentUserId()` sẽ ném 401. Luôn ký claim dạng chuỗi.

### 5.10. Docker Compose
- **Gateway khởi động sau cùng** (`depends_on` toàn bộ service nghiệp vụ `service_healthy`) và Eureka tắt `use-read-only-response-cache`. Nếu không, Eureka giữ cache đọc 30 giây nên Gateway "healthy" mà chưa thấy service nào: request đầu tiên sau `up` trả 503 "No servers available". Đừng bỏ hai cấu hình này.
- `depends_on` với `condition: service_healthy`. Có healthcheck cho mysql (`mysqladmin ping`), rabbitmq (`rabbitmq-diagnostics ping`), eureka và các service (`/actuator/health`). Cách này tránh tình trạng "lần đầu up bị lỗi, up lại thì chạy".
- 7 JVM chạy cùng một máy: đặt `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=75` và `mem_limit` khoảng 384–512m cho mỗi service.
- Eureka: đặt `eureka.instance.prefer-ip-address=true`. Không chạy lẫn service trong IDE với service trong Docker mà không cấu hình hostname, vì Gateway sẽ không resolve được địa chỉ.
- Ảnh CĐHA lưu ở volume `/app/uploads/imaging/` gắn vào clinical-service. Cấu hình `spring.servlet.multipart.max-file-size` (ví dụ 20MB) và chỉ chấp nhận `image/jpeg`, `image/png`, `application/dicom`. Tên file lưu trên đĩa là UUID; tên gốc lưu vào `file_name`.

---

## 6. Quy chuẩn code bắt buộc (tóm tắt, chi tiết xem QUY_CHUAN)

- `@SpringBootApplication(scanBasePackages = "com.vetclinic")` ở mọi service.
- Không trả Entity ra API. Request DTO luôn có `@Valid`, response trả DTO, ánh xạ bằng MapStruct (`componentModel = "spring"`, `unmappedTargetPolicy = WARN`).
- Tiền tệ dùng `BigDecimal` (cấm `double`/`float`). Mốc thời gian giao dịch dùng `Instant`. Enum dùng `@Enumerated(EnumType.STRING)`, tên hằng **khớp 100%** với ENUM trong MySQL. Nếu `validate` báo lệch kiểu cột ENUM thì dùng `@JdbcTypeCode(SqlTypes.ENUM)` hoặc `columnDefinition`. Không đổi sang VARCHAR.
- `spring.jpa.open-in-view: false`, `ddl-auto: validate` (không bao giờ dùng `update`/`create`). Mọi thay đổi schema đi qua `schema_init.sql`.
- Phản hồi luôn có dạng `ApiResponse<T>` (`status`, `errorCode`, `message`, `data`, `timestamp`), phân trang dùng `PageResponse<T>`. Khi tạo mới thì HTTP header phải là 201: `ResponseEntity.status(CREATED)`.
- Lỗi nghiệp vụ: `throw new AppException(ErrorCode.X[, message])`. Không trả stacktrace cho client.
- Chuyển trạng thái dùng `POST /{id}/<action>`, không dùng `PUT`. **Mỗi lần đổi trạng thái phải ghi bảng history tương ứng trong cùng transaction.**
- Feign: `connectTimeout 3000`, `readTimeout 5000`, có `CustomFeignErrorDecoder`, và không gọi Feign trong `@Transactional`.
- Hồ sơ đã chốt (từ `WAITING_PAYMENT` trở đi) bị khóa: không cho sửa diagnosis, dịch vụ hay đơn thuốc.
- Không xóa cứng dữ liệu master đã từng phát sinh giao dịch (services, medicines, species): chuyển `is_active = false`.

---

## 7. Cách làm việc trong repo

- Trước khi code một use case, đọc mục tương ứng trong UC/State Machine/EX, rồi đối chiếu với §5 ở trên.
- Sửa schema hoặc enum thì cập nhật **cùng lúc** `schema_init.sql`, `THIET_KE_CO_SO_DU_LIEU_ERD.md` và `DANH_SACH_KIEU_ENUM_HE_THONG.md`, sau đó `docker compose down -v` rồi up lại.
- Thêm event mới thì cập nhật bảng ở §5.3 và tài liệu kiến trúc.
- Git: `main` / `develop` / `feature/<service>-<uc>`. PR vào `develop` phải tự rà theo 11 chương của quy chuẩn (trừ kho có nguyên tử không, event có bắn sau commit không, có trả Entity ra API không, có thiếu `@PreAuthorize` không).
- Test tối thiểu cho các luồng dễ lỗi: trừ kho khi không đủ hàng thì rollback (EX-15), xuất thuốc 2 lần (EX-16), slot hết chỗ khi đặt đồng thời, chuyển `RESULTS_READY` khi hủy 1 trong 2 dịch vụ (EX-08), refresh token bị dùng lại.
- Ngôn ngữ: message lỗi và UI viết tiếng Việt có dấu; tên code, commit và log kỹ thuật viết tiếng Anh.

---

## 8. Câu hỏi mở (cần nhóm quyết, KHÔNG tự ý làm)

1. ~~**EX-10 (bác sĩ "Tạm hoãn" ca tái khám)**~~ — **đã chốt và làm** (cột `pet_visits.callback_postponed_at`, xem mục clinical-service ở §3).
2. ~~**`lab_test_items` chưa gắn với `services`**~~ — **đã chốt và làm** theo đề xuất (bảng `service_lab_test_items`, xem mục clinical-service ở §3).
3. Tỉ lệ VAT thực tế cho dịch vụ và thuốc (§5.8).
4. ~~**Quy trình "mở lại Visit"**~~ — **đã chốt và làm** (Admin mở lại ca `WAITING_PAYMENT` chưa thu tiền, hủy hóa đơn `PENDING`, T12 trong SM-01; xem mục clinical-service ở §3). Cần nhóm xác nhận: chỉ Admin được mở lại (tài liệu chỉ ghi "người có thẩm quyền"); chưa có luồng hoàn tiền cho hóa đơn đã `PAID`.
5. FR-01 ghi Admin chỉ gán 3 vai trò nội bộ, trong khi hệ thống có 6 vai trò. Hiện đang hiểu là Admin gán được 5 vai trò nhân sự; `PET_OWNER` do lễ tân hoặc khách tự đăng ký.
