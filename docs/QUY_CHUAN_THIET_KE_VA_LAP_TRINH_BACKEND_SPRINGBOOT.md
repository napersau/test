# QUY CHUẨN THIẾT KẾ VÀ LẬP TRÌNH BACKEND (JAVA 21 & SPRING BOOT 4.1.11)
## HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y (MICROSERVICES ARCHITECTURE)
### PHIÊN BẢN 2.0 (PRODUCTION-GRADE STANDARDS)

> **Tài liệu quy chuẩn kỹ thuật bắt buộc (Mandatory Engineering Standards)**  
> **Áp dụng cho:** Toàn bộ thành viên đội ngũ phát triển Backend (Lưu Minh Hiển, Nguyễn Đức Khởi, Vũ Hồng Linh).  
> **Mục tiêu:** Đồng bộ hóa 100% phong cách lập trình (Code Style), kiến trúc phân tầng, định dạng API, quản lý giao dịch CSDL, an toàn concurrency kho dược, xử lý ngoại lệ và giao tiếp phân tán liên Microservice.

---

## MỤC LỤC TỔNG QUAN

1. [Chương 1: Khung Công nghệ & Phiên bản Chuẩn (Tech Stack)](#chương-1-khung-công-nghệ--phiên-bản-chuẩn)
2. [Chương 2: Chuẩn Cấu trúc Dự án Maven & Package Thư mục](#chương-2-chuẩn-cấu-trúc-dự-án-maven--package-thư-mục)
3. [Chương 3: Quy chuẩn Đặt tên & Thiết kế RESTful API (Naming & URI Standards)](#chương-3-quy-chuẩn-đặt-tên--thiết-kế-restful-api)
4. [Chương 4: Chuẩn hóa Định dạng Phản hồi API (Unified API Envelope)](#chương-4-chuẩn-hóa-định-dạng-phản-hồi-api)
5. [Chương 5: Cơ chế Bắt lỗi & Ngoại lệ Tập trung (Global Exception Handling)](#chương-5-cơ-chế-bắt-lỗi--ngoại-lệ-tập-trung)
6. [Chương 6: Quy chuẩn DTO, Validation & Object Mapping (Lombok + MapStruct)](#chương-6-quy-chuẩn-dto-validation--object-mapping)
7. [Chương 7: Quy chuẩn Tầng Dữ liệu & Persistence (Spring Data JPA)](#chương-7-quy-chuẩn-tầng-dữ-liệu--persistence)
8. [Chương 8: Quản lý Giao dịch CSDL & An toàn Concurrency Kho Dược](#chương-8-quản-lý-giao-dịch-csdl--an-toàn-concurrency-kho-dược)
9. [Chương 9: Quy chuẩn Giao tiếp Liên Dịch vụ (OpenFeign & RabbitMQ)](#chương-9-quy-chuẩn-giao-tiếp-liên-dịch-vụ)
10. [Chương 10: Quy chuẩn Bảo mật & Phân quyền Truy cập (Security & RBAC)](#chương-10-quy-chuẩn-bảo-mật--phân-quyền-truy-cập)
11. [Chương 11: Mẫu Cấu hình Maven (pom.xml) & Mã nguồn Tham chiếu Chuẩn](#chương-11-mẫu-cấu-hình-maven-pomxml--mã-nguồn-tham-chiếu-chuẩn)

---

## CHƯƠNG 1: KHUNG CÔNG NGHỆ & PHIÊN BẢN CHUẨN

Tất cả các dịch vụ Backend bắt buộc phải chạy trên cùng một nền tảng công nghệ thống nhất, tương thích chính xác giữa Spring Boot 4.x và Spring Cloud:

| Thành phần kỹ thuật | Phiên bản chuẩn hóa | Ghi chú & Mục đích sử dụng |
| :--- | :---: | :--- |
| **Java Platform** | **Java 21 LTS** | Khuyến nghị Eclipse Temurin 21 hoặc Oracle JDK 21. Tận dụng Record Patterns, Sequenced Collections. |
| **Backend Framework** | **Spring Boot 4.1.11** | Nền tảng microservices cốt lõi, tích hợp Spring Framework 7.x và Jackson 3. |
| **Spring Cloud** | **2025.1.2 (Oakwood)** | Phiên bản Spring Cloud tương thích chính thức với dòng Spring Boot 4.x (tuyệt đối không dùng 2023.x của Boot 3). |
| **Build Tool** | **Apache Maven 3.9+** | Quản lý vòng đời build, dependencies tập trung qua Parent POM. |
| **Service Discovery** | **Spring Cloud Netflix Eureka** | Module `service-registry` (:8761). |
| **API Gateway** | **Spring Cloud Gateway** | Module `api-gateway` (:8080) - **Nền tảng Reactive (WebFlux)**. |
| **Data Persistence** | **Spring Data JPA / Hibernate** | Jakarta Persistence API (Jakarta EE). Cấu hình `open-in-view = false`. |
| **Database Engine** | **MySQL 8.0+** | Mô hình Database-per-Service: 4 logical schemas độc lập. |
| **Message Broker** | **RabbitMQ (AMQP 0-9-1)** | Topic Exchange `clinic.events` (:5672) với JSON Converter. |
| **Boilerplate Code** | **Project Lombok** | Sinh Getters, Setters, Builders tại compile-time. |
| **Object Mapper** | **MapStruct 1.5+** | Sinh code chuyển đổi Entity $\leftrightarrow$ DTO tại compile-time (chế độ cảnh báo `unmappedTargetPolicy = WARN`). |
| **Input Validation** | **Jakarta Bean Validation** | Kiểm soát tính toàn vẹn dữ liệu đầu vào (`@NotNull`, `@NotBlank`, ...). |
| **Containerization** | **Docker & Docker Compose** | Đóng gói toàn bộ hệ thống; chỉ public port của Gateway (:8080) ra ngoài. |

---

## CHƯƠNG 2: CHUẨN CẤU TRÚC DỰ ÁN MAVEN & PACKAGE THƯ MỤC

### 2.1. Cấu trúc Multi-Module Maven của Hệ thống
Mã nguồn Backend được tổ chức dưới dạng Maven Multi-Module với Parent `pom.xml` **chỉ quản lý dependencyManagement**, không ép cứng dependency Servlet MVC lên toàn bộ dự án:

```text
vetclinic-backend/
├── pom.xml                               # Parent POM: Quản lý dependencyManagement và pluginManagement
├── common-library/                       # Thư viện dùng chung (ApiResponse, ErrorCode, BaseEvent, Utils)
│   ├── pom.xml                           # KHÔNG phụ thuộc spring-boot-starter-web (để Gateway WebFlux dùng được)
│   └── src/main/java/com/vetclinic/common/
├── service-registry/                     # Eureka Service Registry (:8761)
│   ├── pom.xml
│   └── src/main/java/com/vetclinic/registry/
├── api-gateway/                          # Spring Cloud Gateway (:8080) - Dùng spring-boot-starter-webflux
│   ├── pom.xml
│   └── src/main/java/com/vetclinic/gateway/
├── auth-service/                         # Dịch vụ xác thực & người dùng (:8081) - Dùng spring-boot-starter-web
│   ├── pom.xml
│   └── src/main/java/com/vetclinic/auth/
├── appointment-service/                  # Cổng đặt lịch hẹn trực tuyến (:8082) - Dùng spring-boot-starter-web
│   ├── pom.xml
│   └── src/main/java/com/vetclinic/appointment/
├── clinical-service/                     # Dịch vụ quản lý bệnh nhân (loài, thú cưng) & khám lâm sàng 2 pha (:8083) - Dùng spring-boot-starter-web
│   ├── pom.xml
│   └── src/main/java/com/vetclinic/clinical/
├── billing-pharmacy-service/             # Dịch vụ viện phí & kho dược (:8084) - Dùng spring-boot-starter-web
│   ├── pom.xml
│   └── src/main/java/com/vetclinic/billing/
└── notification-service/                 # Dịch vụ WebSocket & email (:8085) - Dùng spring-boot-starter-web
    ├── pom.xml
    └── src/main/java/com/vetclinic/notification/
```

### 2.2. Quy tắc Component Scanning cho `common-library`
> [!IMPORTANT]
> Vì các class dùng chung (`GlobalExceptionHandler`, `FeignClientInterceptor`, `CustomFeignErrorDecoder`) nằm ở package `com.vetclinic.common`, trong khi mỗi service nằm ở `com.vetclinic.<servicename>`, nên **tất cả các Microservices bắt buộc phải khai báo:**
> ```java
> @SpringBootApplication(scanBasePackages = "com.vetclinic")
> public class ClinicalServiceApplication {
>     public static void main(String[] args) {
>         SpringApplication.run(ClinicalServiceApplication.class, args);
>     }
> }
> ```
> Nếu thiếu cấu hình `scanBasePackages = "com.vetclinic"`, Spring sẽ không quét được bộ bắt lỗi tập trung và bộ chặn Feign Client!

### 2.3. Cấu trúc Package nội bộ trong mỗi Microservice
```text
com.vetclinic.<servicename>/
├── config/                  # Cấu hình Spring (Security, OpenFeign, RabbitMQ, WebMvc, OpenAPI)
├── controller/              # Tầng Trình diễn: Tiếp nhận HTTP Requests (@RestController)
├── service/                 # Tầng Nghiệp vụ: Định nghĩa Interfaces chuyên môn
│   └── impl/                # Cài đặt cụ thể các phương thức nghiệp vụ (@Service)
├── repository/              # Tầng Truy xuất dữ liệu: Spring Data JPA Interfaces (@Repository)
├── entity/                  # Tầng Thực thể CSDL: JPA Entities (@Entity, @Table)
├── dto/                     # Tầng Truyền tải dữ liệu
│   ├── request/             # Request DTO nhận từ Client (@Valid)
│   └── response/            # Response DTO gửi về cho Client
├── mapper/                  # Chuyển đổi dữ liệu MapStruct (@Mapper)
├── client/                  # OpenFeign Interfaces gọi sang Microservice khác (@FeignClient)
├── event/                   # Event DTOs cụ thể & Producer/Consumer RabbitMQ
└── constant/                # Enum nội bộ, Hằng số nghiệp vụ riêng của service
```

---

## CHƯƠNG 3: QUY CHUẨN ĐẶT TÊN & THIẾT KẾ RESTFUL API

### 3.1. Quy chuẩn Java Code Style & Kiểu Dữ liệu Bắt buộc
- **Java Platform:** Java 21 LTS. DTOs có thể sử dụng `record` (bất biến) hoặc class thường với Lombok.
- **Tiền tệ & Số thực tài chính:** **Bắt buộc dùng `BigDecimal`** (ví dụ: `totalAmount`, `unitPrice`, `discountAmount`). Tuyệt đối cấm dùng `double` hoặc `float` gây sai số làm tròn số tiền.
- **Thời gian (Timestamp):** Dùng `Instant` cho thời điểm giao dịch (`checkedInAt`, `paidAt`, `createdAt`). Lưu trữ dạng UTC trong Database; tầng hiển thị Frontend hoặc DTO Response chuyển đổi sang múi giờ Việt Nam (`Asia/Ho_Chi_Minh` - GMT+7).
- **Hằng số & Enum:** `UPPER_SNAKE_CASE` (ví dụ: `WAITING_RESULTS`, `DISPENSED`). Khớp 100% với file `DANH_SACH_KIEU_ENUM_HE_THONG.md`.

### 3.2. Quy chuẩn Thiết kế RESTful API URIs & Prefix Thống nhất
Nhằm đồng bộ hoàn toàn giữa **Spring Cloud Gateway**, **Controller** và **OpenFeign Clients**, toàn bộ URI tuân thủ quy tắc tiền tố:

| Microservice | Prefix URI qua Gateway & Controller | Ví dụ Endpoint CRUD | Ví dụ Action Endpoint (Động từ) |
| :--- | :--- | :--- | :--- |
| **`auth-service`** | `/api/v1/auth/**` | `GET /api/v1/auth/users` | `POST /api/v1/auth/login` |
| **`appointment-service`** | `/api/v1/appointments/**` | `GET /api/v1/appointments` | `POST /api/v1/appointments/{id}/cancel` |
| **`clinical-service`** | `/api/v1/clinical/**`<br>`/api/v1/pets/**`<br>`/api/v1/species/**` | `GET /api/v1/clinical/pet-visits`<br>`GET /api/v1/pets/{id}` | `POST /api/v1/clinical/pet-visits/{id}/start-exam`<br>`POST /api/v1/clinical/pet-visits/{id}/close-visit` |
| **`billing-pharmacy-service`** | `/api/v1/billing/**`<br>`/api/v1/pharmacy/**` | `GET /api/v1/billing/invoices`<br>`GET /api/v1/pharmacy/medicines` | `POST /api/v1/billing/invoices/{id}/confirm-payment`<br>`POST /api/v1/pharmacy/prescriptions/{id}/dispense` |
| **`notification-service`** | `/api/v1/notifications/**` | `GET /api/v1/notifications` | `POST /api/v1/notifications/send-email` |

> [!NOTE]
> **Quy tắc về Action Endpoint:** Đối với các thao tác chuyển đổi trạng thái nghiệp vụ (State Transitions như: bắt đầu khám, chốt ca, xác nhận thanh toán, xuất thuốc), cho phép dùng động từ ở cuối URI nhưng **bắt buộc dùng phương thức `POST`** (không dùng `PUT`), và Controller phải xử lý kiểm tra Idempotency để chống bấm nút trùng lặp.

---

## CHƯƠNG 4: CHUẨN HÓA ĐỊNH DẠNG PHẢN HỒI API (UNIFIED API ENVELOPE)

### 4.1. Cấu trúc Lớp `ApiResponse<T>` Chuẩn mực
Bổ sung trường `errorCode` để hỗ trợ Frontend và `CustomErrorDecoder` của OpenFeign nhận diện chính xác mã lỗi nghiệp vụ:

```java
package com.vetclinic.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private int status;            // Mã HTTP Status (200, 201, 400, 403, 404, 500)
    private String errorCode;      // Mã lỗi nghiệp vụ (VD: "CLIN_1302"), null nếu thành công
    private String message;        // Thông điệp phản hồi thân thiện
    private T data;                // Dữ liệu payload nghiệp vụ
    @Builder.Default
    private Instant timestamp = Instant.now();

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .status(200)
                .message("Thao tác thành công")
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .status(200)
                .message(message)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> created(String message, T data) {
        return ApiResponse.<T>builder()
                .status(201)
                .message(message)
                .data(data)
                .build();
    }
}
```

> [!IMPORTANT]
> **Đồng bộ giữa HTTP Header Status và Body Status:**  
> Khi tạo mới thành công, Controller phải trả về `ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(...))` để mã HTTP Header thật sự là **201**, tránh tình trạng Header trả về 200 trong khi Body ghi 201.

### 4.2. Chuẩn hóa Phân trang `PageResponse<T>`
```java
package com.vetclinic.common.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    private List<T> items;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last; // Đặt tên là 'last' để khớp với JSON property chuẩn của Jackson
}
```

---

## CHƯƠNG 5: CƠ CHẾ BẮT LỖI & NGOẠI LỆ TẬP TRUNG (GLOBAL EXCEPTION HANDLING)

### 5.1. Danh mục Mã lỗi `ErrorCode` Đầy đủ
```java
package com.vetclinic.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // 1. Hệ thống chung (SYS: 1000 - 1099)
    UNCATEGORIZED_EXCEPTION("SYS_1000", "Lỗi hệ thống không xác định, vui lòng thử lại sau", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_INPUT_DATA("SYS_1001", "Dữ liệu đầu vào không hợp lệ", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED("SYS_1002", "Chưa đăng nhập hoặc token đã hết hạn", HttpStatus.UNAUTHORIZED),
    ACCESS_DENIED("SYS_1003", "Bạn không có quyền thực hiện thao tác này", HttpStatus.FORBIDDEN),
    SERVICE_UNAVAILABLE("SYS_1004", "Dịch vụ liên quan hiện không phản hồi, vui lòng thử lại sau", HttpStatus.SERVICE_UNAVAILABLE),
    OPTIMISTIC_LOCK_CONFLICT("SYS_1005", "Dữ liệu vừa được người khác cập nhật, vui lòng tải lại trang", HttpStatus.CONFLICT),

    // 2. Người dùng & Xác thực (AUTH: 1100 - 1199)
    USER_NOT_FOUND("AUTH_1101", "Không tìm thấy người dùng", HttpStatus.NOT_FOUND),
    PHONE_NUMBER_ALREADY_EXISTS("AUTH_1102", "Số điện thoại đã được đăng ký trong hệ thống", HttpStatus.CONFLICT),
    INVALID_CREDENTIALS("AUTH_1103", "Tên đăng nhập hoặc mật khẩu không chính xác", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_NOT_FOUND("AUTH_1104", "Không tìm thấy phiên Refresh Token", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_REVOKED("AUTH_1105", "Refresh Token đã bị thu hồi hoặc đã qua sử dụng (Cảnh báo bảo mật)", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_EXPIRED("AUTH_1106", "Refresh Token đã hết hạn, vui lòng đăng nhập lại", HttpStatus.UNAUTHORIZED),

    // 3. Thú cưng & Lịch hẹn (APPT: 1200 - 1299)
    PET_NOT_FOUND("APPT_1201", "Không tìm thấy hồ sơ thú cưng", HttpStatus.NOT_FOUND),
    APPOINTMENT_NOT_FOUND("APPT_1202", "Không tìm thấy lịch hẹn", HttpStatus.NOT_FOUND),
    SLOT_CAPACITY_EXCEEDED("APPT_1203", "Khung giờ khám đã kín chỗ, vui lòng chọn khung giờ khác", HttpStatus.BAD_REQUEST),
    CANNOT_CANCEL_APPOINTMENT("APPT_1204", "Chỉ được phép hủy hẹn trước giờ khám tối thiểu 2 tiếng", HttpStatus.BAD_REQUEST),

    // 4. Khám lâm sàng & Cận lâm sàng (CLIN: 1300 - 1399)
    VISIT_NOT_FOUND("CLIN_1301", "Không tìm thấy đợt khám y tế", HttpStatus.NOT_FOUND),
    DOCTOR_NOT_AVAILABLE("CLIN_1302", "Bác sĩ hiện đang bận ca khám khác", HttpStatus.CONFLICT),
    DOCTOR_PRIORITY_LOCKED("CLIN_1303", "Bác sĩ đang có ca chờ đọc kết quả cận lâm sàng, vui lòng ưu tiên gọi lại ca tái khám", HttpStatus.CONFLICT),
    PARACLINICAL_SERVICE_IN_PROGRESS("CLIN_1304", "Dịch vụ cận lâm sàng đang thực hiện, không thể hủy", HttpStatus.BAD_REQUEST),
    INVALID_STATUS_TRANSITION("CLIN_1305", "Trạng thái ca khám không hợp lệ để thực hiện thao tác này", HttpStatus.BAD_REQUEST),

    // 5. Viện phí & Kho dược (BILL/PHARM: 1400 - 1499)
    INVOICE_NOT_FOUND("BILL_1401", "Không tìm thấy hóa đơn viện phí", HttpStatus.NOT_FOUND),
    DISCOUNT_EXCEEDS_TOTAL("BILL_1402", "Số tiền chiết khấu không thể vượt quá tổng viện phí", HttpStatus.BAD_REQUEST),
    INVOICE_ALREADY_PAID("BILL_1403", "Hóa đơn này đã được thanh toán trước đó", HttpStatus.BAD_REQUEST),
    PRESCRIPTION_NOT_FOUND("PHARM_1404", "Không tìm thấy đơn thuốc của đợt khám", HttpStatus.NOT_FOUND),
    MEDICINE_NOT_FOUND("PHARM_1405", "Không tìm thấy thuốc trong danh mục kho", HttpStatus.NOT_FOUND),
    INSUFFICIENT_STOCK("PHARM_1406", "Số lượng tồn kho không đủ để xuất thuốc", HttpStatus.BAD_REQUEST),
    PRESCRIPTION_ALREADY_DISPENSED("PHARM_1407", "Đơn thuốc này đã được xuất kho trước đó", HttpStatus.CONFLICT);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(String code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
```

### 5.2. Bộ Xử lý Ngoại lệ Toàn cục `@RestControllerAdvice` (Chuẩn An ninh)
```java
package com.vetclinic.common.exception;

import com.vetclinic.common.dto.ApiResponse;
import feign.FeignException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 1. Bắt ngoại lệ nghiệp vụ do ứng dụng ném ra
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Object>> handleAppException(AppException ex) {
        ErrorCode errorCode = ex.getErrorCode();
        ApiResponse<Object> response = ApiResponse.builder()
                .status(errorCode.getHttpStatus().value())
                .errorCode(errorCode.getCode())
                .message(ex.getMessage() != null ? ex.getMessage() : errorCode.getMessage())
                .build();
        return ResponseEntity.status(errorCode.getHttpStatus()).body(response);
    }

    // 2. Bắt lỗi phân quyền Spring Security (@PreAuthorize) -> Bắt buộc trả về HTTP 403
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDeniedException(AccessDeniedException ex) {
        ErrorCode errorCode = ErrorCode.ACCESS_DENIED;
        ApiResponse<Object> response = ApiResponse.builder()
                .status(HttpStatus.FORBIDDEN.value())
                .errorCode(errorCode.getCode())
                .message(errorCode.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    // 3. Bắt lỗi Validation DTO (@Valid)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        ApiResponse<Map<String, String>> response = ApiResponse.<Map<String, String>>builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .errorCode(ErrorCode.INVALID_INPUT_DATA.getCode())
                .message("Dữ liệu đầu vào không hợp lệ")
                .data(errors)
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    // 4. Bắt lỗi định dạng JSON gửi lên bị sai cú pháp
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Object>> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        ApiResponse<Object> response = ApiResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .errorCode(ErrorCode.INVALID_INPUT_DATA.getCode())
                .message("Định dạng dữ liệu JSON không hợp lệ hoặc thiếu Body")
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    // 5. Bắt lỗi gọi liên dịch vụ Feign
    @ExceptionHandler(FeignException.class)
    public ResponseEntity<ApiResponse<Object>> handleFeignException(FeignException ex) {
        log.error("Feign client communication error: status = {}, message = {}", ex.status(), ex.getMessage());
        ApiResponse<Object> response = ApiResponse.builder()
                .status(HttpStatus.SERVICE_UNAVAILABLE.value())
                .errorCode(ErrorCode.SERVICE_UNAVAILABLE.getCode())
                .message("Không thể kết nối đến dịch vụ phụ thuộc, vui lòng thử lại sau")
                .build();
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }

    // 6. Bắt lỗi hệ thống chung không xác định (Log chi tiết ở server, ẩn stacktrace với client)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGeneralException(Exception ex) {
        log.error("Unhandled system error: ", ex);
        ApiResponse<Object> response = ApiResponse.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .errorCode(ErrorCode.UNCATEGORIZED_EXCEPTION.getCode())
                .message("Hệ thống phát sinh sự cố, quản trị viên đã ghi nhận để khắc phục")
                .build();
        return ResponseEntity.internalServerError().body(response);
    }
}
```

---

## CHƯƠNG 6: QUY CHUẨN DTO, VALIDATION & OBJECT MAPPING

### 6.1. Quy tắc Vàng: Không bao giờ Expose Entity ra ngoài API
- 100% Request gửi lên phải dùng **RequestDTO** kèm Jakarta Validation.
- 100% Dữ liệu trả về phải qua **ResponseDTO**.

### 6.2. Cấu hình MapStruct trên Java 21
Đặt `unmappedTargetPolicy = ReportingPolicy.WARN` để trình biên dịch cảnh báo nếu lập trình viên quên ánh xạ trường dữ liệu:

```java
package com.vetclinic.clinical.mapper;

import com.vetclinic.clinical.dto.request.CreatePetRequest;
import com.vetclinic.clinical.dto.response.PetResponse;
import com.vetclinic.clinical.entity.Pet;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.WARN)
public interface PetMapper {
    @Mapping(target = "speciesName", source = "species.name")
    PetResponse toResponse(Pet pet);

    Pet toEntity(CreatePetRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromRequest(CreatePetRequest request, @MappingTarget Pet pet);
}
```

---

## CHƯƠNG 7: QUY CHUẨN TẦNG DỮ LIỆU & PERSISTENCE (SPRING DATA JPA)

### 7.1. Cấu hình Bắt buộc trong `application.yml`
```yaml
spring:
  jpa:
    open-in-view: false        # TẮT Open-in-View để giải phóng connection ngay sau khi Service kết thúc
    hibernate:
      ddl-auto: validate       # Không để Hibernate tự ý sửa cấu trúc bảng trên môi trường thực tế
    properties:
      hibernate:
        format_sql: true
        jdbc:
          batch_size: 50       # Tối ưu hóa ghi hàng loạt
```

### 7.2. Kiểm soát Concurrency với `@Version`
Đối với các Entity có trạng thái thay đổi đồng thời (`PetVisit`, `Medicine`, `Invoice`), bắt buộc thêm trường `@Version` để ngăn ngừa ghi đè dữ liệu (Optimistic Locking):

```java
@Entity
@Table(name = "medicines")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity;

    @Version
    private Long version; // Khóa lạc quan chống race condition
}
```

---

## CHƯƠNG 8: QUẢN LÝ GIAO DỊCH CSDL & AN TOÀN CONCURRENCY KHO DƯỢC

### 8.1. Trừ kho Nguyên tử Tuyệt đối (Atomic SQL Update)
Để chống hiện tượng hai thu ngân cùng xuất một hộp thuốc cuối cùng dẫn đến kho bị âm, **Repository bắt buộc định nghĩa câu lệnh cập nhật có điều kiện kiểm tra tồn kho tại tầng Database:**

```java
package com.vetclinic.billing.repository;

import com.vetclinic.billing.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Long> {

    @Modifying
    @Query("UPDATE Medicine m SET m.stockQuantity = m.stockQuantity - :quantity " +
           "WHERE m.id = :id AND m.stockQuantity >= :quantity")
    int deductStockQuantity(@Param("id") Long id, @Param("quantity") int quantity);
}
```

### 8.2. Cài đặt Dịch vụ Xuất thuốc & Thu ngân Chuẩn mực
- Sắp xếp danh sách thuốc theo `medicineId` tăng dần trước khi trừ để **loại trừ nguy cơ Deadlock**.
- Tách biệt cuộc gọi mạng ra khỏi `@Transactional`.

```java
package com.vetclinic.billing.service.impl;

import com.vetclinic.billing.entity.*;
import com.vetclinic.billing.repository.*;
import com.vetclinic.common.exception.AppException;
import com.vetclinic.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PharmacyServiceImpl implements PharmacyService {

    private final MedicineRepository medicineRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final InventoryTransactionRepository inventoryRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void dispensePrescription(Long prescriptionId, Long cashierId) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new AppException(ErrorCode.PRESCRIPTION_NOT_FOUND));

        if (prescription.getStatus() == PrescriptionStatus.DISPENSED) {
            throw new AppException(ErrorCode.PRESCRIPTION_ALREADY_DISPENSED);
        }

        // Sắp xếp các dòng thuốc theo ID tăng dần để ngăn chặn Deadlock giữa 2 giao dịch đồng thời
        List<PrescriptionItem> items = prescription.getItems().stream()
                .sorted(Comparator.comparing(PrescriptionItem::getMedicineId))
                .toList();

        for (PrescriptionItem item : items) {
            // THỰC THI ATOMIC UPDATE: Nếu số dòng cập nhật == 0 nghĩa là tồn kho thực tế bị thiếu
            int updatedRows = medicineRepository.deductStockQuantity(item.getMedicineId(), item.getQuantity());
            if (updatedRows == 0) {
                Medicine med = medicineRepository.findById(item.getMedicineId())
                        .orElseThrow(() -> new AppException(ErrorCode.MEDICINE_NOT_FOUND));
                throw new AppException(ErrorCode.INSUFFICIENT_STOCK, 
                    "Thuốc [" + med.getName() + "] không đủ số lượng tồn kho khả dụng để xuất đơn!");
            }

            Medicine medicine = medicineRepository.findById(item.getMedicineId()).get();

            // Ghi nhật ký biến động kho
            InventoryTransaction logEntry = InventoryTransaction.builder()
                    .medicineId(medicine.getId())
                    .transactionType(InventoryTransactionType.EXPORT_PRESCRIPTION)
                    .quantity(item.getQuantity())
                    .balanceAfter(medicine.getStockQuantity())
                    .createdBy(cashierId)
                    .build();
            inventoryRepository.save(logEntry);
        }

        prescription.setStatus(PrescriptionStatus.DISPENSED);
        prescriptionRepository.save(prescription);

        // Phát sự kiện nội bộ để gửi RabbitMQ SAU KHI CSDL ĐÃ COMMIT THÀNH CÔNG
        eventPublisher.publishEvent(new PaymentAndDispenseCompletedEvent(prescription.getVisitId(), cashierId));
    }
}
```

---

## CHƯƠNG 9: QUY CHUẨN GIAO TIẾP LIÊN DỊCH VỤ (OPENFEIGN & RABBITMQ)

### 9.1. Giao tiếp Đồng bộ (OpenFeign)
1. **Cấu hình Timeouts Bắt buộc:** Cấm để timeout mặc định (60s). Phải đặt rõ ràng:
   ```yaml
   spring:
     cloud:
       openfeign:
         client:
           config:
             default:
               connectTimeout: 3000   # 3 giây
               readTimeout: 5000      # 5 giây
   ```
2. **Custom ErrorDecoder Chuẩn sử dụng Spring ObjectMapper:**
   ```java
   @Component
   @RequiredArgsConstructor
   public class CustomFeignErrorDecoder implements ErrorDecoder {
       private final ObjectMapper objectMapper; // Inject ObjectMapper từ Spring (đã có JavaTimeModule)

       @Override
       public Exception decode(String methodKey, Response response) {
           try {
               if (response.body() != null) {
                   ApiResponse<?> errorResponse = objectMapper.readValue(
                           response.body().asInputStream(), ApiResponse.class);
                   // Khôi phục chính xác ErrorCode từ service con trả về
                   for (ErrorCode ec : ErrorCode.values()) {
                       if (ec.getCode().equals(errorResponse.getErrorCode())) {
                           return new AppException(ec, errorResponse.getMessage());
                       }
                   }
                   return new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, errorResponse.getMessage());
               }
           } catch (IOException e) {
               return new AppException(ErrorCode.SERVICE_UNAVAILABLE);
           }
           return new AppException(ErrorCode.SERVICE_UNAVAILABLE);
       }
   }
   ```

### 9.2. Giao tiếp Bất đồng bộ (RabbitMQ) & Bắn Event Sau Commit
> [!IMPORTANT]
> **Cơ chế Bắn Event Sau Commit (`@TransactionalEventListener`):**  
> Tuyệt đối không gọi `rabbitTemplate.convertAndSend` trực tiếp bên trong method `@Transactional`. Bắt buộc phải lắng nghe sự kiện nội bộ và chỉ gửi ra RabbitMQ khi CSDL đã Commit hoàn tất 100%:

```java
@Component
@RequiredArgsConstructor
public class ClinicalEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onVisitCompleted(VisitCompletedEvent event) {
        rabbitTemplate.convertAndSend("clinic.events", "visit.completed", event);
    }
}
```

**Cấu hình Message Converter chuẩn JSON:**
```java
@Configuration
public class RabbitConfig {
    @Bean
    public MessageConverter jsonMessageConverter(ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }
}
```

**Danh mục 7 Sự kiện & Routing Keys Chuẩn hệ thống (Khớp với Tài liệu Kiến trúc; thêm `appointment.status_changed` ngày 29/10/2026 để báo chủ nuôi khi lịch được duyệt / từ chối — UC-17, FR-16):**
| Tên Event Class | Routing Key | Dịch vụ Phát (Producer) | Dịch vụ Nhận (Consumer) |
| :--- | :--- | :--- | :--- |
| `AppointmentCreatedEvent` | `appointment.created` | `appointment-service` | `notification-service` |
| `AppointmentStatusChangedEvent` | `appointment.status_changed` | `appointment-service` | `notification-service` |
| `VisitCheckedInEvent` | `visit.checked_in` | `clinical-service` | `notification-service` |
| `DoctorPriorityCallbackEvent` | `doctor.priority_callback` | `clinical-service` | `notification-service` |
| `VisitClosedToPaymentEvent` | `visit.closed_to_payment` | `clinical-service` | `billing-pharmacy-service`, `notification-service` |
| `PaymentAndDispenseCompletedEvent`| `payment.completed` | `billing-pharmacy-service` | `clinical-service`, `notification-service` |
| `LowStockEvent` | `stock.low_alert` | `billing-pharmacy-service` | `notification-service` |

---

## CHƯƠNG 10: QUY CHUẨN BẢO MẬT & PHÂN QUYỀN TRUY CẬP (SECURITY & RBAC)

### 10.1. Bảo vệ Toàn vẹn tại Spring Cloud Gateway
> [!CAUTION]
> **Quy tắc Phòng chống Giả mạo Quyền:**  
> Kẻ xấu có thể tự ý thêm Header `X-User-Role: ADMIN` vào request từ bên ngoài. Gateway bắt buộc phải **xóa toàn bộ** các Headers này trước khi giải mã JWT và gán Headers nội bộ mới:

```java
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        // 1. XÓA BỎ HEADER NỘI BỘ NẾU CLIENT NGOÀI CỐ TÌNH TRUYỀN VÀO ĐỂ GIẢ MẠO
        ServerHttpRequest.Builder requestBuilder = request.mutate()
                .headers(httpHeaders -> {
                    httpHeaders.remove("X-User-Id");
                    httpHeaders.remove("X-User-Role");
                });

        // 2. Kiểm tra Token JWT và gán Header chính thống từ Claims
        String token = extractToken(request);
        if (token != null && jwtValidator.validate(token)) {
            Claims claims = jwtValidator.getClaims(token);
            requestBuilder.header("X-User-Id", claims.get("userId", String.class));
            requestBuilder.header("X-User-Role", claims.get("role", String.class));
        }

        return chain.filter(exchange.mutate().request(requestBuilder.build()).build());
    }

    @Override
    public int getOrder() {
        return -100; // Chạy sớm nhất trước tất cả các filter khác
    }
}
```

### 10.2. Phân quyền Phương thức tại Microservices Con & HeaderAuthenticationFilter

Mỗi Microservice con không cần giải mã lại JWT, mà sử dụng một Filter bảo mật không trạng thái để đọc `X-User-Id` và `X-User-Role` do Gateway chuyển tiếp sang, sau đó nạp vào `SecurityContextHolder`:

#### 1. Lớp `HeaderAuthenticationFilter`
```java
package com.vetclinic.common.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class HeaderAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        
        String userId = request.getHeader("X-User-Id");
        String userRole = request.getHeader("X-User-Role");

        // Nếu Gateway đã xác thực và truyền Header sang
        if (userId != null && userRole != null) {
            // Spring Security quy ước quyền hạn phải có tiền tố "ROLE_"
            SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + userRole);
            
            UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(userId, null, Collections.singletonList(authority));
            
            // Nạp thông tin định danh vào Security Context để @PreAuthorize hoạt động
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}
```

#### 2. Lớp Tiện ích `SecurityUtils` (Lấy User ID hiện tại)
```java
package com.vetclinic.common.util;

import com.vetclinic.common.exception.AppException;
import com.vetclinic.common.exception.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        try {
            return Long.parseLong(authentication.getPrincipal().toString());
        } catch (NumberFormatException e) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }
}
```

#### 3. Cấu hình Spring Security `@EnableMethodSecurity`
```java
package com.vetclinic.common.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class CommonSecurityConfig {

    private final HeaderAuthenticationFilter headerAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/**", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(headerAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
```

---

### 10.3. Quy Chuẩn Quản Lý Phiên Đăng Nhập & Xoay Vòng Refresh Token (Token Rotation)

Nhằm đảm bảo an toàn cao nhất trước nguy cơ lộ lọt JWT nhưng vẫn mang lại trải nghiệm mượt mà không bắt người dùng đăng nhập lại liên tục, hệ thống áp dụng cơ chế **Stateful Refresh Token kết hợp Token Rotation**:

```text
[ React Client (Axios) ]                   [ API Gateway ]                [ auth-service ]
           │                                      │                               │
           │── 1. POST /api/v1/auth/login ───────▶│──────────────────────────────▶│
           │◀─ 2. AuthResponse (Access + Refresh)─│◀──────────────────────────────│
           │   (Access TTL: 30m, Refresh TTL: 7d) │                               │
           │                                      │                               │
           │── 3. Gọi API với Access Token ──────▶│ (Giải mã JWT & Gắn Header)    │
           │                                      │────── Forward Header ────────▶│ [Other Services]
           │                                      │                               │
           │   [Sau 30 phút - Access Token hết hạn]                               │
           │◀─ 4. Nhận mã lỗi 401 (UNAUTHORIZED)──│◀──────────────────────────────│
           │                                      │                               │
           │── 5. Axios Interceptor tự động gọi: ─│                               │
           │      POST /api/v1/auth/refresh ─────▶│──────────────────────────────▶│ (Kiểm tra DB)
           │      { refreshToken: "uuid-v4" }     │                               │ 1. revoked == false?
           │                                      │                               │ 2. expiry_date > now?
           │                                      │                               │ 3. Đánh dấu token cũ revoked!
           │                                      │                               │ 4. Lưu Refresh Token mới
           │◀─ 6. TokenRefreshResponse ───────────│◀──────────────────────────────│ 5. Cấp cặp Token mới
           │      (Cặp Access + Refresh Token mới)│                               │
           │                                      │                               │
           │── 7. Retry request ban đầu (Thành công)                              │
```

#### 1. Bảng Thông số Thời hạn & Chiến lược Token
| Loại Token | Thời hạn sống (TTL) | Nơi lưu trữ / Quản lý | Nội dung / Payload |
| :--- | :---: | :--- | :--- |
| **Access Token** | **30 phút** (1,800 giây) | Ký số JWT (HMAC-SHA256), Stateless | `userId`, `username`, `roles` (`ROLE_...`), `roomNumber`, `exp`, `iat` |
| **Refresh Token** | **7 ngày** (604,800 giây) | Chuỗi ngẫu nhiên (UUID v4), Stateful lưu bảng `refresh_tokens` trong `pet_clinic_auth_db` | Khóa ngẫu nhiên ánh xạ tới `userId`, có cờ `revoked` và `expiry_date` |

#### 2. Nguyên tắc An ninh Xoay Vòng Token (Refresh Token Rotation)
1. **Một lần dùng duy nhất (Single-Use):** Mỗi khi một Refresh Token được sử dụng để lấy Access Token mới thành công, nó **ngay lập tức bị đánh dấu là `revoked = TRUE`**. Một Refresh Token mới tinh sẽ được tạo ra thay thế.
2. **Cơ chế Phát hiện Đánh cắp Token (Theft Detection):** Nếu hệ thống nhận được yêu cầu `/refresh` với một token **đã từng bị `revoked = TRUE`**, hệ thống nhận diện khả năng cao token đã bị rò rỉ và kẻ gian đang cố tái sử dụng (Replay Attack). Ngay lập tức:
   - Thu hồi toàn bộ các Refresh Token còn lại của người dùng đó (Force Logout trên tất cả thiết bị).
   - Ném ngoại lệ `REFRESH_TOKEN_REVOKED` (HTTP 401).
3. **Thu hồi khi Đăng xuất (Logout):** Khi người dùng bấm Đăng xuất (`POST /api/v1/auth/logout`), Refresh Token gửi kèm sẽ bị đánh dấu `revoked = TRUE`.

#### 3. Danh mục Endpoints & DTOs Chuẩn
- **`POST /api/v1/auth/refresh`**:
  ```java
  public record RefreshTokenRequest(
      @NotBlank(message = "Refresh token không được để trống")
      String refreshToken
  ) {}

  public record TokenRefreshResponse(
      String accessToken,
      String refreshToken,
      String tokenType,
      long expiresIn // 1800 giây
  ) {}
  ```
- **`POST /api/v1/auth/logout`**:
  ```java
  public record LogoutRequest(
      @NotBlank(message = "Refresh token không được để trống")
      String refreshToken
  ) {}
  ```

#### 4. Mã Nguồn Tham Chiếu Xử Lý Nghiệp Vụ (`RefreshTokenServiceImpl.java`)
```java
package com.vetclinic.auth.service.impl;

import com.vetclinic.auth.entity.RefreshToken;
import com.vetclinic.auth.entity.User;
import com.vetclinic.auth.repository.RefreshTokenRepository;
import com.vetclinic.auth.repository.UserRepository;
import com.vetclinic.auth.dto.response.TokenRefreshResponse;
import com.vetclinic.common.exception.AppException;
import com.vetclinic.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public TokenRefreshResponse refresh(String tokenStr) {
        RefreshToken token = refreshTokenRepository.findByToken(tokenStr)
                .orElseThrow(() -> new AppException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

        // 1. Phát hiện xâm nhập: Token đã bị thu hồi mà vẫn cố sử dụng
        if (token.isRevoked()) {
            log.warn("CẢNH BÁO AN NINH: Phát hiện tái sử dụng Refresh Token đã thu hồi của User ID: {}. Thu hồi toàn bộ phiên!", token.getUser().getId());
            refreshTokenRepository.revokeAllUserTokens(token.getUser().getId());
            throw new AppException(ErrorCode.REFRESH_TOKEN_REVOKED);
        }

        // 2. Kiểm tra hết hạn
        if (token.getExpiryDate().isBefore(Instant.now())) {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            throw new AppException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        }

        // 3. Xoay vòng Token (Rotation): Thu hồi token cũ, cấp token mới
        token.setRevoked(true);
        refreshTokenRepository.save(token);

        User user = token.getUser();
        String newAccessToken = jwtTokenProvider.generateAccessToken(user);
        RefreshToken newRefreshToken = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiryDate(Instant.now().plus(7, ChronoUnit.DAYS))
                .revoked(false)
                .build();
        refreshTokenRepository.save(newRefreshToken);

        return new TokenRefreshResponse(newAccessToken, newRefreshToken.getToken(), "Bearer", 1800);
    }

    @Transactional
    public void logout(String tokenStr) {
        refreshTokenRepository.findByToken(tokenStr).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }
}
```

---

## CHƯƠNG 11: MẪU CẤU HÌNH MAVEN (POM.XML) & MÃ NGUỒN THAM CHIẾU CHUẨN

### 11.1. File `pom.xml` Chuẩn mực cho Java 21 & Spring Boot 4.1.11
Cấu hình tích hợp chuẩn giữa **Java 21**, **Spring Boot 4.1.11**, **Spring Cloud 2025.1.2**, **Lombok** và **MapStruct**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.vetclinic</groupId>
    <artifactId>vetclinic-parent</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>

    <name>VetClinic Parent POM</name>
    <description>Parent POM for Veterinary Clinic Management Microservices</description>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.1.11</version>
        <relativePath/>
    </parent>

    <modules>
        <module>common-library</module>
        <module>service-registry</module>
        <module>api-gateway</module>
        <module>auth-service</module>
        <module>appointment-service</module>
        <module>clinical-service</module>
        <module>billing-pharmacy-service</module>
        <module>notification-service</module>
    </modules>

    <properties>
        <java.version>21</java.version>
        <spring-cloud.version>2025.1.2</spring-cloud.version>
        <org.mapstruct.version>1.5.5.Final</org.mapstruct.version>
        <lombok-mapstruct-binding.version>0.2.0</lombok-mapstruct-binding.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${spring-cloud.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            <dependency>
                <groupId>com.vetclinic</groupId>
                <artifactId>common-library</artifactId>
                <version>${project.version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <dependencies>
        <!-- Lombok & MapStruct dùng chung cho toàn bộ dự án -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <scope>provided</scope>
        </dependency>
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct</artifactId>
            <version>${org.mapstruct.version}</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Maven Compiler Plugin hỗ trợ kết hợp Lombok và MapStruct trên Java 21 -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <configuration>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </path>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok-mapstruct-binding</artifactId>
                            <version>${lombok-mapstruct-binding.version}</version>
                        </path>
                        <path>
                            <groupId>org.mapstruct</groupId>
                            <artifactId>mapstruct-processor</artifactId>
                            <version>${org.mapstruct.version}</version>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

---

### 11.2. Mẫu Mã Nguồn Tham Chiếu Chuẩn (Gold Standard Vertical Slice)

Dưới đây là một lát cắt hoàn chỉnh (Vertical Slice) cho nghiệp vụ **Bác sĩ bắt đầu khám lâm sàng Giai đoạn 1 (UC-22)** trong `clinical-service`, làm hình mẫu chuẩn mực để toàn bộ các thành viên tham chiếu và phát triển các tính năng khác:

#### 1. Request DTO (`StartExaminationRequest.java`)
```java
package com.vetclinic.clinical.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StartExaminationRequest {

    @NotNull(message = "Cân nặng thú cưng không được để trống")
    @DecimalMin(value = "0.1", message = "Cân nặng phải lớn hơn 0.1 kg")
    @DecimalMax(value = "150.0", message = "Cân nặng không hợp lý (tối đa 150 kg)")
    private BigDecimal weightAtVisit; // Bác sĩ trực tiếp cân tại phòng khám

    @NotNull(message = "Thân nhiệt thú cưng không được để trống")
    @DecimalMin(value = "35.0", message = "Thân nhiệt đo được quá thấp (tối thiểu 35°C)")
    @DecimalMax(value = "43.0", message = "Thân nhiệt đo được quá cao (tối đa 43°C)")
    private BigDecimal temperature;   // Bác sĩ trực tiếp đo nhiệt độ trực tràng

    @Size(max = 1000, message = "Ghi chú triệu chứng lâm sàng không được vượt quá 1000 ký tự")
    private String clinicalNotes;
}
```

#### 2. Response DTO (`PetVisitResponse.java`)
```java
package com.vetclinic.clinical.dto.response;

import com.vetclinic.clinical.constant.VisitStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PetVisitResponse {
    private Long id;
    private String visitCode;
    private Long petId;
    private String petName;       // Lấy trực tiếp từ Entity Pet nội bộ trong clinical-service (< 2ms)
    private String speciesName;   // Lấy trực tiếp từ Entity Species nội bộ
    private Long doctorId;
    private String doctorName;    // Làm giàu dữ liệu qua OpenFeign gọi auth-service
    private Long receptionistId;
    private boolean emergency;
    private BigDecimal weightAtVisit;
    private BigDecimal temperature;
    private String initialSymptoms;
    private String clinicalNotes;
    private VisitStatus status;
    private Instant checkedInAt;
    private Instant startedAt;
    private Instant closedAt;
    private Instant completedAt;
}
```

#### 3. MapStruct Mapper (`PetVisitMapper.java`)
```java
package com.vetclinic.clinical.mapper;

import com.vetclinic.clinical.dto.request.StartExaminationRequest;
import com.vetclinic.clinical.dto.response.PetVisitResponse;
import com.vetclinic.clinical.entity.PetVisit;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.WARN)
public interface PetVisitMapper {

    PetVisitResponse toResponse(PetVisit entity);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateExamInfo(StartExaminationRequest request, @MappingTarget PetVisit entity);
}
```

#### 4. Spring Data JPA Repository (`PetVisitRepository.java`)
```java
package com.vetclinic.clinical.repository;

import com.vetclinic.clinical.constant.VisitStatus;
import com.vetclinic.clinical.entity.PetVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PetVisitRepository extends JpaRepository<PetVisit, Long> {

    Optional<PetVisit> findByVisitCode(String visitCode);

    // Kiểm tra xem Bác sĩ có đang bận ca khám khác không
    boolean existsByDoctorIdAndStatus(Long doctorId, VisitStatus status);

    // Truy vấn hàng đợi sảnh: ca cấp cứu lên đầu, sau đó theo thứ tự check-in FIFO
    @Query("SELECT v FROM PetVisit v WHERE v.status = :status ORDER BY v.emergency DESC, v.checkedInAt ASC")
    List<PetVisit> findQueueByStatus(@Param("status") VisitStatus status);
}
```

#### 5. OpenFeign Client Gọi auth-service (`UserClient.java`)
```java
package com.vetclinic.clinical.client;

import com.vetclinic.clinical.dto.response.UserSummaryResponse;
import com.vetclinic.common.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "auth-service", path = "/api/v1/auth/users")
public interface UserClient {

    @GetMapping("/{id}")
    ApiResponse<UserSummaryResponse> getUserById(@PathVariable("id") Long id);
}
```

#### 6. Service Interface & Implementation (`PetVisitServiceImpl.java`)
```java
package com.vetclinic.clinical.service.impl;

import com.vetclinic.clinical.client.UserClient;
import com.vetclinic.clinical.constant.VisitStatus;
import com.vetclinic.clinical.dto.request.StartExaminationRequest;
import com.vetclinic.clinical.dto.response.PetVisitResponse;
import com.vetclinic.clinical.dto.response.UserSummaryResponse;
import com.vetclinic.clinical.entity.Pet;
import com.vetclinic.clinical.entity.PetVisit;
import com.vetclinic.clinical.entity.PetVisitStatusHistory;
import com.vetclinic.clinical.mapper.PetVisitMapper;
import com.vetclinic.clinical.repository.PetRepository;
import com.vetclinic.clinical.repository.PetVisitRepository;
import com.vetclinic.clinical.repository.PetVisitStatusHistoryRepository;
import com.vetclinic.clinical.service.PetVisitService;
import com.vetclinic.common.dto.ApiResponse;
import com.vetclinic.common.exception.AppException;
import com.vetclinic.common.exception.ErrorCode;
import com.vetclinic.common.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class PetVisitServiceImpl implements PetVisitService {

    private final PetVisitRepository petVisitRepository;
    private final PetRepository petRepository;
    private final PetVisitStatusHistoryRepository statusHistoryRepository;
    private final PetVisitMapper petVisitMapper;
    private final UserClient userClient;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PetVisitResponse startExamination(Long visitId, StartExaminationRequest request) {
        // 1. Lấy ID của Bác sĩ đang thao tác từ Security Context (do HeaderAuthenticationFilter nạp)
        Long currentDoctorId = SecurityUtils.getCurrentUserId();

        // 2. Tìm đợt khám
        PetVisit visit = petVisitRepository.findById(visitId)
                .orElseThrow(() -> new AppException(ErrorCode.VISIT_NOT_FOUND));

        // 3. Kiểm tra tính hợp lệ của luồng trạng thái
        if (visit.getStatus() != VisitStatus.WAITING) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION, 
                "Chỉ có thể bắt đầu khám đối với ca đang ở trạng thái Chờ khám (WAITING)");
        }

        // 4. Kiểm tra xem Bác sĩ này có đang khám dở ca nào khác không
        if (petVisitRepository.existsByDoctorIdAndStatus(currentDoctorId, VisitStatus.IN_PROGRESS)) {
            throw new AppException(ErrorCode.DOCTOR_NOT_AVAILABLE, 
                "Bác sĩ đang có một ca khám khác chưa kết thúc!");
        }

        VisitStatus previousStatus = visit.getStatus();

        // 5. Cập nhật thông tin sinh hiệu do Bác sĩ trực tiếp đo và chuyển trạng thái
        petVisitMapper.updateExamInfo(request, visit);
        visit.setDoctorId(currentDoctorId);
        visit.setStatus(VisitStatus.IN_PROGRESS);
        visit.setStartedAt(Instant.now());

        PetVisit savedVisit = petVisitRepository.save(visit);

        // 6. Ghi bản ghi Audit Trail lưu vết lịch sử chuyển đổi trạng thái ca khám
        PetVisitStatusHistory history = PetVisitStatusHistory.builder()
                .visitId(savedVisit.getId())
                .fromStatus(previousStatus)
                .toStatus(VisitStatus.IN_PROGRESS)
                .changedByUserId(currentDoctorId)
                .notes("Bác sĩ bắt đầu khám lâm sàng Giai đoạn 1 tại phòng: " + savedVisit.getAssignedRoom())
                .createdAt(Instant.now())
                .build();
        statusHistoryRepository.save(history);

        // 7. Ánh xạ sang Response DTO
        PetVisitResponse response = petVisitMapper.toResponse(savedVisit);

        // 8. Tải thông tin thú cưng trực tiếp từ CSDL nội bộ (không tốn network I/O)
        petRepository.findById(savedVisit.getPetId()).ifPresent(pet -> {
            response.setPetName(pet.getName());
            if (pet.getSpecies() != null) {
                response.setSpeciesName(pet.getSpecies().getName());
            }
        });

        // 9. Gọi đồng bộ OpenFeign ngoài transaction để làm giàu dữ liệu họ tên Bác sĩ từ auth-service
        try {
            ApiResponse<UserSummaryResponse> doctorResponse = userClient.getUserById(currentDoctorId);
            if (doctorResponse != null && doctorResponse.getData() != null) {
                response.setDoctorName(doctorResponse.getData().getFullName());
            }
        } catch (Exception e) {
            log.warn("Không thể tải thông tin Bác sĩ từ auth-service: {}", e.getMessage());
        }

        return response;
    }
}
```

#### 7. REST Controller (`PetVisitController.java`)
```java
package com.vetclinic.clinical.controller;

import com.vetclinic.clinical.dto.request.StartExaminationRequest;
import com.vetclinic.clinical.dto.response.PetVisitResponse;
import com.vetclinic.clinical.service.PetVisitService;
import com.vetclinic.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/clinical/pet-visits")
@RequiredArgsConstructor
public class PetVisitController {

    private final PetVisitService petVisitService;

    /**
     * Bác sĩ tiếp nhận ca và bắt đầu khám lâm sàng Giai đoạn 1 (UC-22)
     */
    @PostMapping("/{id}/start-exam")
    @PreAuthorize("hasRole('VETERINARIAN')")
    public ResponseEntity<ApiResponse<PetVisitResponse>> startExamination(
            @PathVariable("id") Long id,
            @Valid @RequestBody StartExaminationRequest request) {
        
        PetVisitResponse response = petVisitService.startExamination(id, request);
        return ResponseEntity.ok(ApiResponse.success("Bác sĩ đã bắt đầu khám lâm sàng", response));
    }
}
```

### 11.3. Mẫu Triển Khai Tác Vụ Tự Động (Scheduled Task) & Audit Trail (`AppointmentNoShowScheduler.java`)

Áp dụng cho nghiệp vụ **EX-01 (Tự động đánh dấu vắng mặt No-show & giải phóng slot hẹn)** trong `appointment-service`:

```java
package com.vetclinic.appointment.scheduler;

import com.vetclinic.appointment.entity.Appointment;
import com.vetclinic.appointment.entity.AppointmentStatusHistory;
import com.vetclinic.appointment.enums.AppointmentStatus;
import com.vetclinic.appointment.repository.AppointmentRepository;
import com.vetclinic.appointment.repository.AppointmentStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AppointmentNoShowScheduler {

    private final AppointmentRepository appointmentRepository;
    private final AppointmentStatusHistoryRepository statusHistoryRepository;

    /**
     * Chạy định kỳ mỗi 15 phút để quét các lịch hẹn đã quá giờ hẹn 30 phút mà chưa Check-in.
     * Quy tắc EX-01: status == CONFIRMED && appointment_date == TODAY && end_time + 30m < NOW
     */
    @Scheduled(cron = "0 */15 7-21 * * *") // Chạy từ 7h sáng đến 21h tối hàng ngày
    @Transactional
    public void scanAndMarkNoShowAppointments() {
        LocalDate today = LocalDate.now();
        LocalTime cutoffTime = LocalTime.now().minusMinutes(30);

        List<Appointment> expiredAppointments = appointmentRepository
                .findByStatusAndAppointmentDateAndEndTimeBefore(
                        AppointmentStatus.CONFIRMED, today, cutoffTime);

        if (expiredAppointments.isEmpty()) {
            return;
        }

        log.info("Phát hiện {} lịch hẹn quá hạn tiếp đón 30 phút, tiến hành chuyển sang NO_SHOW", 
                expiredAppointments.size());

        for (Appointment appt : expiredAppointments) {
            appt.setStatus(AppointmentStatus.NO_SHOW);
            appt.setUpdatedAt(Instant.now());
            appointmentRepository.save(appt);

            // Ghi nhận Audit Trail tự động với Actor = SYSTEM (changedByUserId = null)
            AppointmentStatusHistory history = AppointmentStatusHistory.builder()
                    .appointmentId(appt.getId())
                    .fromStatus(AppointmentStatus.CONFIRMED)
                    .toStatus(AppointmentStatus.NO_SHOW)
                    .changedByUserId(null) // null = System Scheduled Actor
                    .notes("Hệ thống tự động chuyển NO_SHOW do quá thời gian hẹn 30 phút mà khách chưa đến làm thủ tục tiếp đón.")
                    .createdAt(Instant.now())
                    .build();

            statusHistoryRepository.save(history);
        }

        log.info("Đã cập nhật trạng thái NO_SHOW và ghi nhận Audit Trail thành công cho {} ca hẹn.", 
                expiredAppointments.size());
    }
}
```

---

## TỔNG KẾT & CAM KẾT TUÂN THỦ

1. **Hiệu lực thi hành:** Tài liệu Phiên bản 2.0 có giá trị áp dụng ngay từ ngày bắt đầu lập trình (Sprint 1 - Tuần 8 theo Lịch trình đồ án).
2. **Quy tắc Code Review:** Khi tạo Pull Request (PR) trên Git, mọi thành viên bắt buộc kiểm tra đối soát chéo theo danh sách 11 Chương quy chuẩn này. Bất kỳ đoạn mã nào vi phạm (ví dụ: trừ kho không nguyên tử, bắn RabbitMQ trước commit, trả Entity trực tiếp, thiếu `@PreAuthorize`) đều bị từ chối phê duyệt (Reject PR).
