-- ==============================================================================
-- HỆ THỐNG QUẢN LÝ PHÒNG KHÁM THÚ Y - DATABASE INITIALIZATION SCRIPT (DDL & SEED)
-- MÔ HÌNH KIẾN TRÚC: MICROSERVICES (DATABASE-PER-SERVICE PATTERN)
-- ==============================================================================
-- Hệ thống phân rã thành 4 Cơ sở dữ liệu logic (Logical Schemas) tương ứng với 4 Bounded Contexts:
-- 1. pet_clinic_auth_db            : auth-service (:8081) - Tài khoản, phân quyền, nhân sự (3 bảng)
-- 2. pet_clinic_appointment_db     : appointment-service (:8082) - Đặt lịch hẹn & Audit Trail lịch hẹn (2 bảng)
-- 3. pet_clinic_clinical_db        : clinical-service (:8083) - Quản lý bệnh nhân (loài, thú cưng), khám lâm sàng 2 pha,
--                                    chỉ định & kết quả CLS, lưu vết lịch sử khám (Audit Trail) (13 bảng)
-- 4. pet_clinic_billing_pharmacy_db: billing-pharmacy-service (:8084) - Đơn thuốc, hóa đơn viện phí đa dòng,
--                                    bóc tách thuế VAT & doanh thu, nhật ký kho dược (6 bảng)
-- TỔNG CỘNG: 24 BẢNG
--
-- NGUYÊN TẮC TOÀN VẸN DỮ LIỆU LIÊN DỊCH VỤ (INTER-SERVICE DATA INTEGRITY):
-- - Các bảng cùng Service duy trì ràng buộc Khóa ngoại vật lý (FOREIGN KEY).
-- - Các liên kết chéo Service được lưu dưới dạng Khóa ngoại logic (BIGINT) kèm B-Tree Index.
-- - Tính toàn vẹn liên Service được kiểm soát qua OpenFeign REST API và sự kiện RabbitMQ.
-- ==============================================================================

-- BẮT BUỘC dòng này: client `mysql` trong entrypoint của Docker không tự dùng UTF-8, thiếu nó thì mọi chuỗi tiếng Việt
-- trong dữ liệu seed bị mã hóa 2 lần (vd. "Quản" lưu thành "Quáº£n").
SET NAMES utf8mb4;

-- ==============================================================================
-- PHẦN 1: PET_CLINIC_AUTH_DB (AUTH-SERVICE :8081)
-- ==============================================================================
CREATE DATABASE IF NOT EXISTS pet_clinic_auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pet_clinic_auth_db;

-- 1. BẢNG ROLES (VAI TRÒ NGƯỜI DÙNG)
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code ENUM('ADMIN', 'VETERINARIAN', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'IMAGING_TECHNICIAN', 'PET_OWNER') NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL
);

-- 2. BẢNG USERS (TÀI KHOẢN NGƯỜI DÙNG, NHÂN SỰ & KHÁCH HÀNG)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(150) NULL,
    address VARCHAR(255) NULL,
    room_number VARCHAR(20) NULL, -- Số phòng làm việc cố định của Bác sĩ / KTV (VD: 'P01', 'P02')
    status ENUM('ACTIVE', 'INACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role_id);

-- 3. BẢNG REFRESH_TOKENS (QUẢN LÝ PHIÊN ĐĂNG NHẬP VÀ XOAY VÒNG TOKEN)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Dữ liệu ban đầu cho auth-service
INSERT INTO roles (code, name, description) VALUES
('ADMIN', 'Quản trị viên', 'Toàn quyền cấu hình hệ thống, quản lý danh mục và xem báo cáo'),
('VETERINARIAN', 'Bác sĩ thú y khám chính', 'Khám lâm sàng, chỉ định xét nghiệm, chẩn đoán xác định và kê đơn'),
('RECEPTIONIST', 'Lễ tân / Thu ngân', 'Tiếp đón, phân công bác sĩ, thu ngân và xuất thuốc'),
('LAB_TECHNICIAN', 'Bác sĩ / KTV Xét nghiệm', 'Tiếp nhận mẫu bệnh phẩm, phân tích huyết học/sinh hóa và nhập chỉ số kết quả'),
('IMAGING_TECHNICIAN', 'Bác sĩ / KTV Chẩn đoán hình ảnh', 'Thực hiện siêu âm, chụp X-quang, tải tệp ảnh và kết luận hình thái học'),
('PET_OWNER', 'Chủ thú cưng', 'Đặt lịch trực tuyến, theo dõi hồ sơ bệnh án và đơn thuốc');

-- Tài khoản Admin mặc định (mật khẩu: Admin@123)
-- Hash sinh bằng BCryptPasswordEncoder(12) của spring-security-crypto 7.1.1 và đã kiểm tra matches("Admin@123") = true
INSERT INTO users (role_id, username, password_hash, full_name, phone_number, email, status) VALUES
(1, 'admin', '$2a$12$AOnPlWYNzcOJ6wE/AhTsQe7.DJhsqPAHJ5xX1VEqHUz7yPZcUq.ge', 'Quản trị viên hệ thống', '0901234567', 'admin@vetclinic.com', 'ACTIVE');


-- ==============================================================================
-- PHẦN 2: PET_CLINIC_APPOINTMENT_DB (APPOINTMENT-SERVICE :8082)
-- ==============================================================================
-- Service chuyên biệt cho Cổng đặt lịch trực tuyến & tiếp nhận hẹn trước từ khách hàng (Customer-Facing).
-- Toàn bộ thông tin hồ sơ thú cưng và loài đã được chuyển về clinical-service để đảm bảo tính tự chủ cho bệnh án lâm sàng.
CREATE DATABASE IF NOT EXISTS pet_clinic_appointment_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pet_clinic_appointment_db;

-- 4. BẢNG APPOINTMENTS (LỊCH HẸN KHÁM TIỀN TRẠM)
CREATE TABLE IF NOT EXISTS appointments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_code VARCHAR(50) NOT NULL UNIQUE,
    pet_id BIGINT NOT NULL,   -- Logical FK: tham chiếu sang pet_clinic_clinical_db.pets(id)
    owner_id BIGINT NOT NULL, -- Logical FK: tham chiếu sang pet_clinic_auth_db.users(id)
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT NOT NULL,
    booking_channel ENUM('ONLINE', 'PHONE', 'WALK_IN') NOT NULL DEFAULT 'ONLINE',
    status ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING',
    cancel_reason TEXT NULL,
    confirmed_by BIGINT NULL, -- Logical FK: Lễ tân duyệt hẹn
    confirmed_at TIMESTAMP NULL,
    cancelled_by BIGINT NULL, -- Logical FK: Người thao tác hủy hẹn
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_appointments_date_status ON appointments(appointment_date, status);
CREATE INDEX idx_appointments_owner ON appointments(owner_id);
CREATE INDEX idx_appointments_pet ON appointments(pet_id);

-- 5. BẢNG APPOINTMENT_STATUS_HISTORIES (AUDIT TRAIL VÒNG ĐỜI LỊCH HẸN)
CREATE TABLE IF NOT EXISTS appointment_status_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT NOT NULL,
    from_status ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW') NULL,
    to_status ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW') NOT NULL,
    changed_by_user_id BIGINT NULL, -- Logical FK: tham chiếu sang pet_clinic_auth_db.users(id), NULL nếu tự động quét NO_SHOW
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ash_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);
CREATE INDEX idx_ash_appointment ON appointment_status_histories(appointment_id);



-- ==============================================================================
-- PHẦN 3: PET_CLINIC_CLINICAL_DB (CLINICAL-SERVICE :8083)
-- ==============================================================================
-- Service lõi quản lý Bệnh nhân (Loài, Thú cưng), Quy trình khám lâm sàng 2 pha,
-- Chỉ định CLS, Kết quả xét nghiệm/hình ảnh và Lưu vết lịch sử chuyển đổi trạng thái (Audit Trail).
CREATE DATABASE IF NOT EXISTS pet_clinic_clinical_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pet_clinic_clinical_db;

-- 6. BẢNG SPECIES (DANH MỤC LOÀI THÚ CƯNG - MASTER DATA)
CREATE TABLE IF NOT EXISTS species (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL
);

-- 7. BẢNG PETS (HỒ SƠ BỆNH NHÂN THÚ CƯNG)
CREATE TABLE IF NOT EXISTS pets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_id BIGINT NOT NULL, -- Logical FK: tham chiếu sang pet_clinic_auth_db.users(id)
    species_id BIGINT NOT NULL,
    pet_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    breed VARCHAR(100) NULL,
    gender ENUM('MALE', 'FEMALE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    date_of_birth DATE NULL,
    color VARCHAR(100) NULL,
    weight DECIMAL(5, 2) NULL, -- Cân nặng ban đầu/gần nhất (Thông tin tĩnh)
    is_neutered BOOLEAN NOT NULL DEFAULT FALSE,
    identifying_characteristics TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pets_species FOREIGN KEY (species_id) REFERENCES species(id)
);
CREATE INDEX idx_pets_owner ON pets(owner_id);
CREATE INDEX idx_pets_code ON pets(pet_code);
CREATE INDEX idx_pets_species ON pets(species_id);

-- 8. BẢNG SERVICES (DANH MỤC DỊCH VỤ KỸ THUẬT & KHÁM BỆNH - MASTER DATA)
CREATE TABLE IF NOT EXISTS services (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category ENUM('EXAMINATION', 'VACCINATION', 'DEWORMING', 'EXTERNAL_PARASITE', 'INJECTION_INFUSION', 'LABORATORY', 'IMAGING', 'SURGERY', 'PROCEDURE') NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 9. BẢNG LAB_TEST_ITEMS (DANH MỤC CHỈ SỐ XÉT NGHIỆM - MASTER DATA)
CREATE TABLE IF NOT EXISTS lab_test_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    description VARCHAR(255) NULL
);

-- 10. BẢNG LAB_TEST_REFERENCE_RANGES (KHOẢNG THAM CHIẾU SINH LÝ THEO LOÀI - MASTER DATA)
CREATE TABLE IF NOT EXISTS lab_test_reference_ranges (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lab_test_item_id BIGINT NOT NULL,
    species_id BIGINT NOT NULL, -- KHÓA NGOẠI VẬT LÝ NỘI BỘ (cùng DB)
    min_value DECIMAL(8, 2) NOT NULL,
    max_value DECIMAL(8, 2) NOT NULL,
    CONSTRAINT fk_ltrr_item FOREIGN KEY (lab_test_item_id) REFERENCES lab_test_items(id),
    CONSTRAINT fk_ltrr_species FOREIGN KEY (species_id) REFERENCES species(id),
    CONSTRAINT uq_ltrr_item_species UNIQUE (lab_test_item_id, species_id)
);
CREATE INDEX idx_ltrr_species ON lab_test_reference_ranges(species_id);

-- 10b. BẢNG SERVICE_LAB_TEST_ITEMS (DỊCH VỤ XÉT NGHIỆM GỒM NHỮNG CHỈ SỐ NÀO - MASTER DATA)
-- Dịch vụ LABORATORY nào không có dòng nào ở đây thì form nhập kết quả hiển thị toàn bộ chỉ số (tương thích ngược).
CREATE TABLE IF NOT EXISTS service_lab_test_items (
    service_id BIGINT NOT NULL,
    lab_test_item_id BIGINT NOT NULL,
    PRIMARY KEY (service_id, lab_test_item_id),
    CONSTRAINT fk_slti_service FOREIGN KEY (service_id) REFERENCES services(id),
    CONSTRAINT fk_slti_item FOREIGN KEY (lab_test_item_id) REFERENCES lab_test_items(id)
);

-- 11. BẢNG PET_VISITS (ĐỢT KHÁM Y TẾ NGOẠI TRÚ - 2 PHA)
CREATE TABLE IF NOT EXISTS pet_visits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_code VARCHAR(50) NOT NULL UNIQUE,
    pet_id BIGINT NOT NULL, -- KHÓA NGOẠI VẬT LÝ NỘI BỘ (cùng DB)
    appointment_id BIGINT NULL UNIQUE, -- Logical FK: tham chiếu sang pet_clinic_appointment_db.appointments(id)
    doctor_id BIGINT NULL, -- Logical FK: tham chiếu sang pet_clinic_auth_db.users(id)
    receptionist_id BIGINT NOT NULL, -- Logical FK: tham chiếu sang pet_clinic_auth_db.users(id)
    assigned_room VARCHAR(20) NULL,
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE, -- Cờ ưu tiên ca cấp cứu trong hàng đợi
    weight_at_visit DECIMAL(5, 2) NULL, -- Snapshot cân nặng đo thực tế tại thời điểm khám (Thông tin biến động)
    temperature DECIMAL(4, 1) NULL,     -- Thân nhiệt trực tràng đo tại thời điểm khám
    initial_symptoms TEXT NULL,
    clinical_notes TEXT NULL,
    diagnosis TEXT NULL,
    treatment_plan TEXT NULL,
    doctor_advice TEXT NULL,
    status ENUM('WAITING', 'IN_PROGRESS', 'WAITING_RESULTS', 'RESULTS_READY', 'WAITING_PAYMENT', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
    cancel_reason TEXT NULL,
    checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    scheduled_at TIMESTAMP NULL, -- Giờ bắt đầu khung hẹn khi khách có hẹn check-in ĐÚNG khung giờ (ưu tiên 2 của hàng đợi); NULL = vãng lai hoặc đến trễ quá khung giờ (ưu tiên 3)
    callback_postponed_at TIMESTAMP NULL, -- EX-10: Bác sĩ tạm hoãn ca tái khám (RESULTS_READY) vì khách vắng; NULL = đang chờ gọi, có giá trị = không tính vào Khóa ưu tiên
    version BIGINT NOT NULL DEFAULT 0, -- Optimistic Locking (@Version) chống ghi đè đồng thời
    CONSTRAINT fk_visits_pet FOREIGN KEY (pet_id) REFERENCES pets(id)
);
CREATE INDEX idx_visits_pet ON pet_visits(pet_id);
CREATE INDEX idx_visits_status ON pet_visits(status);
CREATE INDEX idx_visits_doctor_status ON pet_visits(doctor_id, status);
CREATE INDEX idx_visits_queue ON pet_visits(status, is_emergency, checked_in_at);

-- 12. BẢNG PET_VISIT_STATUS_HISTORIES (AUDIT TRAIL VÒNG ĐỜI CA KHÁM)
CREATE TABLE IF NOT EXISTS pet_visit_status_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT NOT NULL,
    from_status ENUM('WAITING', 'IN_PROGRESS', 'WAITING_RESULTS', 'RESULTS_READY', 'WAITING_PAYMENT', 'COMPLETED', 'CANCELLED') NULL,
    to_status ENUM('WAITING', 'IN_PROGRESS', 'WAITING_RESULTS', 'RESULTS_READY', 'WAITING_PAYMENT', 'COMPLETED', 'CANCELLED') NOT NULL,
    changed_by_user_id BIGINT NOT NULL, -- Logical FK: tham chiếu sang pet_clinic_auth_db.users(id)
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pvsh_visit FOREIGN KEY (visit_id) REFERENCES pet_visits(id) ON DELETE CASCADE
);
CREATE INDEX idx_pvsh_visit ON pet_visit_status_histories(visit_id);

-- 13. BẢNG VISIT_SERVICE_DETAILS (CHI TIẾT CHỈ ĐỊNH DỊCH VỤ KỸ THUẬT)
CREATE TABLE IF NOT EXISTS visit_service_details (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT NOT NULL,
    service_id BIGINT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL, -- Snapshot đơn giá tại thời điểm chỉ định
    quantity INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(12, 2) NOT NULL,
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vsd_visit FOREIGN KEY (visit_id) REFERENCES pet_visits(id),
    CONSTRAINT fk_vsd_service FOREIGN KEY (service_id) REFERENCES services(id)
);
CREATE INDEX idx_vsd_visit ON visit_service_details(visit_id);
CREATE INDEX idx_vsd_status ON visit_service_details(status);

-- 14. BẢNG VISIT_SERVICE_DETAIL_HISTORIES (AUDIT TRAIL TIẾN ĐỘ DỊCH VỤ KỸ THUẬT)
CREATE TABLE IF NOT EXISTS visit_service_detail_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_service_detail_id BIGINT NOT NULL,
    from_status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NULL,
    to_status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'ORDERED', 'START_PROCESSING', 'COMPLETED', 'CANCELLED', 'POSTPONED', 'RECALL'
    changed_by_user_id BIGINT NOT NULL, -- Logical FK: Bác sĩ hoặc KTV thao tác
    reason TEXT NULL, -- Ghi chú hoặc lý do hoãn/hủy dịch vụ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vsdh_vsd FOREIGN KEY (visit_service_detail_id) REFERENCES visit_service_details(id) ON DELETE CASCADE
);
CREATE INDEX idx_vsdh_detail ON visit_service_detail_histories(visit_service_detail_id);

-- 15. BẢNG LAB_TEST_RESULTS (KẾT QUẢ XÉT NGHIỆM HUYẾT HỌC / SINH HÓA)
CREATE TABLE IF NOT EXISTS lab_test_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_service_detail_id BIGINT NOT NULL,
    lab_test_item_id BIGINT NOT NULL,
    result_value DECIMAL(8, 2) NOT NULL,
    min_value_snapshot DECIMAL(8, 2) NOT NULL, -- Snapshot tham chiếu ngưỡng dưới
    max_value_snapshot DECIMAL(8, 2) NOT NULL, -- Snapshot tham chiếu ngưỡng trên
    evaluation ENUM('LOW', 'NORMAL', 'HIGH') NOT NULL,
    performed_by BIGINT NOT NULL, -- Logical FK: tham chiếu sang pet_clinic_auth_db.users(id) - LAB_TECHNICIAN
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ltr_vsd FOREIGN KEY (visit_service_detail_id) REFERENCES visit_service_details(id),
    CONSTRAINT fk_ltr_item FOREIGN KEY (lab_test_item_id) REFERENCES lab_test_items(id)
);
CREATE INDEX idx_ltr_vsd ON lab_test_results(visit_service_detail_id);
CREATE INDEX idx_ltr_performer ON lab_test_results(performed_by);

-- 16. BẢNG IMAGING_RESULTS (KẾT QUẢ CHẨN ĐOÁN HÌNH ẢNH: X-QUANG / SIÊU ÂM)
CREATE TABLE IF NOT EXISTS imaging_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_service_detail_id BIGINT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    conclusion TEXT NOT NULL,
    performed_by BIGINT NOT NULL, -- Logical FK: tham chiếu sang pet_clinic_auth_db.users(id) - IMAGING_TECHNICIAN
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ir_vsd FOREIGN KEY (visit_service_detail_id) REFERENCES visit_service_details(id)
);
CREATE INDEX idx_ir_performer ON imaging_results(performed_by);

-- 17. BẢNG IMAGING_ATTACHMENTS (HÌNH ẢNH ĐÍNH KÈM CHẨN ĐOÁN)
CREATE TABLE IF NOT EXISTS imaging_attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    imaging_result_id BIGINT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NULL,
    content_type VARCHAR(50) NULL,
    CONSTRAINT fk_ia_result FOREIGN KEY (imaging_result_id) REFERENCES imaging_results(id)
);

-- Dữ liệu ban đầu cho clinical-service
INSERT INTO species (code, name, description) VALUES
('DOG', 'Chó', 'Loài chó (Canis lupus familiaris)'),
('CAT', 'Mèo', 'Loài mèo (Felis catus)');

INSERT INTO services (code, name, category, price, description, is_active) VALUES
('EXAM_GEN', 'Khám lâm sàng tổng quát', 'EXAMINATION', 100000.00, 'Khám tổng thể, kiểm tra thân nhiệt, cân nặng và triệu chứng', TRUE),
('VAC_7B', 'Tiêm phòng Vaccine 7 bệnh (Chó)', 'VACCINATION', 150000.00, 'Công tiêm phòng vaccine phòng 7 bệnh truyền nhiễm', TRUE),
('VAC_4B', 'Tiêm phòng Vaccine 4 bệnh (Mèo)', 'VACCINATION', 150000.00, 'Công tiêm phòng vaccine cho mèo', TRUE),
('DEWORM', 'Dịch vụ tẩy giun đường ruột', 'DEWORMING', 50000.00, 'Công kiểm tra và hỗ trợ cho uống thuốc tẩy giun', TRUE),
('LAB_CBC', 'Xét nghiệm tổng phân tích tế bào máu (CBC)', 'LABORATORY', 250000.00, 'Xét nghiệm 18-24 chỉ số tế bào máu tự động', TRUE),
('IMG_US_AB', 'Siêu âm ổ bụng tổng quát', 'IMAGING', 200000.00, 'Siêu âm màu kiểm tra các cơ quan nội tạng ổ bụng', TRUE),
('IMG_XRAY', 'Chụp X-quang kỹ thuật số (1 tư thế)', 'IMAGING', 180000.00, 'Chụp X-quang tim phổi / xương khớp', TRUE);

INSERT INTO lab_test_items (code, name, unit, description) VALUES
('WBC', 'Bạch cầu (White Blood Cells)', '10^9/L', 'Số lượng bạch cầu tổng số'),
('RBC', 'Hồng cầu (Red Blood Cells)', '10^12/L', 'Số lượng hồng cầu tổng số'),
('HGB', 'Huyết sắc tố (Hemoglobin)', 'g/dL', 'Nồng độ huyết sắc tố'),
('PLT', 'Tiểu cầu (Platelets)', '10^9/L', 'Số lượng tiểu cầu');

-- Gắn chỉ số vào dịch vụ xét nghiệm CBC
INSERT INTO service_lab_test_items (service_id, lab_test_item_id)
SELECT s.id, l.id FROM services s JOIN lab_test_items l ON l.code IN ('WBC', 'RBC', 'HGB', 'PLT') WHERE s.code = 'LAB_CBC';

-- Cho Chó (species_id = 1)
INSERT INTO lab_test_reference_ranges (lab_test_item_id, species_id, min_value, max_value) VALUES
(1, 1, 6.00, 17.00),
(2, 1, 5.50, 8.50),
(3, 1, 12.00, 18.00),
(4, 1, 200.00, 500.00);

-- Cho Mèo (species_id = 2)
INSERT INTO lab_test_reference_ranges (lab_test_item_id, species_id, min_value, max_value) VALUES
(1, 2, 5.50, 19.50),
(2, 2, 5.00, 10.00),
(3, 2, 8.00, 15.00),
(4, 2, 300.00, 700.00);


-- ==============================================================================
-- PHẦN 4: PET_CLINIC_BILLING_PHARMACY_DB (BILLING-PHARMACY-SERVICE :8084)
-- ==============================================================================
-- Quản lý Danh mục thuốc, Đơn thuốc điện tử, Nhật ký kho thuốc (Audit Log),
-- và Hóa đơn viện phí đa dòng (Master-Detail) bóc tách rõ doanh thu dịch vụ, thuốc và thuế VAT.
CREATE DATABASE IF NOT EXISTS pet_clinic_billing_pharmacy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pet_clinic_billing_pharmacy_db;

-- 18. BẢNG MEDICINES (DANH MỤC THUỐC & TỒN KHO - MASTER DATA)
CREATE TABLE IF NOT EXISTS medicines (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    active_ingredient VARCHAR(150) NULL,
    dosage_form VARCHAR(50) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    sale_price DECIMAL(12, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_stock_alert INT NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 0 -- Optimistic Locking (@Version)
);

-- 19. BẢNG PRESCRIPTIONS (ĐƠN THUỐC ĐIỆN TỬ)
CREATE TABLE IF NOT EXISTS prescriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT NOT NULL UNIQUE, -- Logical FK: tham chiếu sang pet_clinic_clinical_db.pet_visits(id)
    doctor_notes TEXT NULL,
    status ENUM('PRESCRIBED', 'DISPENSED', 'CANCELLED') NOT NULL DEFAULT 'PRESCRIBED',
    dispensed_by BIGINT NULL, -- Logical FK: tham chiếu sang pet_clinic_auth_db.users(id) - Dược sĩ/Lễ tân phát thuốc
    dispensed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_prescriptions_visit ON prescriptions(visit_id);

-- 20. BẢNG PRESCRIPTION_ITEMS (CHI TIẾT THUỐC TRONG ĐƠN)
CREATE TABLE IF NOT EXISTS prescription_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prescription_id BIGINT NOT NULL,
    medicine_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL, -- Snapshot đơn giá tại thời điểm kê đơn
    subtotal DECIMAL(12, 2) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration_days INT NOT NULL,
    instructions TEXT NULL,
    CONSTRAINT fk_pi_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    CONSTRAINT fk_pi_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id)
);

-- 21. BẢNG INVENTORY_TRANSACTIONS (NHẬT KÝ BIẾN ĐỘNG KHO THUỐC - AUDIT LOG KHO)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    medicine_id BIGINT NOT NULL,
    transaction_type ENUM('IMPORT', 'EXPORT_PRESCRIPTION', 'ADJUSTMENT') NOT NULL,
    quantity INT NOT NULL,
    balance_after INT NOT NULL,
    reference_id BIGINT NULL,
    notes VARCHAR(255) NULL,
    created_by BIGINT NOT NULL, -- Logical FK: tham chiếu sang pet_clinic_auth_db.users(id)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_it_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id)
);
CREATE INDEX idx_it_med_date ON inventory_transactions(medicine_id, created_at);
CREATE INDEX idx_it_creator ON inventory_transactions(created_by);

-- 22. BẢNG INVOICES (HÓA ĐƠN THANH TOÁN VIỆN PHÍ TỔNG HỢP)
CREATE TABLE IF NOT EXISTS invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_code VARCHAR(50) NOT NULL UNIQUE,
    visit_id BIGINT NOT NULL UNIQUE, -- Logical FK: tham chiếu sang pet_clinic_clinical_db.pet_visits(id)
    prescription_id BIGINT NULL UNIQUE, -- KHÓA NGOẠI VẬT LÝ NỘI BỘ (cùng DB) liên kết trực tiếp với đơn thuốc
    cashier_id BIGINT NULL,          -- Logical FK: tham chiếu sang pet_clinic_auth_db.users(id); NULL khi hóa đơn PENDING tự tạo từ event, gán lúc confirm-payment
    total_service_amount DECIMAL(12, 2) NOT NULL, -- Tổng tiền dịch vụ kỹ thuật/khám lâm sàng
    total_medicine_amount DECIMAL(12, 2) NOT NULL, -- Tổng tiền thuốc
    total_vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- Tổng thuế GTGT tính từ các dòng chi tiết
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    final_amount DECIMAL(12, 2) NOT NULL, -- Tổng thanh toán cuối cùng (đã gồm VAT và chiết khấu)
    payment_status ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    paid_at TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0, -- Optimistic Locking (@Version)
    CONSTRAINT fk_invoices_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL
);
CREATE INDEX idx_invoices_visit ON invoices(visit_id);
CREATE INDEX idx_invoices_cashier ON invoices(cashier_id);
CREATE INDEX idx_invoices_status ON invoices(payment_status);

-- 23. BẢNG INVOICE_ITEMS (CHI TIẾT DÒNG HÓA ĐƠN - MASTER-DETAIL BÓC TÁCH DOANH THU & THUẾ VAT)
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    item_type ENUM('SERVICE', 'MEDICINE') NOT NULL, -- Phân loại doanh thu: Dịch vụ kỹ thuật vs Thuốc dược phẩm
    reference_id BIGINT NOT NULL, -- ID dịch vụ (services.id) hoặc ID thuốc (medicines.id)
    item_name VARCHAR(150) NOT NULL, -- Snapshot tên dịch vụ hoặc tên thuốc tại thời điểm xuất hóa đơn
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL, -- Snapshot đơn giá
    vat_rate DECIMAL(4, 2) NOT NULL DEFAULT 0.00, -- Thuế suất VAT (0.00: 0%, 0.05: 5%, 0.10: 10%)
    vat_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- Tiền thuế VAT cho dòng này (= subtotal * vat_rate)
    subtotal DECIMAL(12, 2) NOT NULL, -- Thành tiền trước thuế (= quantity * unit_price)
    CONSTRAINT fk_ii_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE INDEX idx_ii_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_ii_type ON invoice_items(item_type);

-- Dữ liệu ban đầu cho billing-pharmacy-service
INSERT INTO medicines (code, name, active_ingredient, dosage_form, unit, sale_price, stock_quantity, min_stock_alert, is_active) VALUES
('MED_AMOX', 'Clavamox 250mg', 'Amoxicillin + Clavulanate', 'Viên nén', 'Viên', 15000.00, 200, 20, TRUE),
('MED_VANG_7B', 'Vaccine Vanguard Plus 5/L (7 bệnh)', 'Attenuated Virus', 'Lọ tiêm', 'Lọ', 180000.00, 50, 10, TRUE),
('MED_PURE_4B', 'Vaccine Purevax RCP (Mèo)', 'Attenuated Virus', 'Lọ tiêm', 'Lọ', 190000.00, 40, 10, TRUE),
('MED_DRON_DOG', 'Drontal Plus tẩy giun cho chó', 'Febantel, Pyrantel, Praziquantel', 'Viên nén', 'Viên', 45000.00, 100, 15, TRUE);
