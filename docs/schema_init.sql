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


-- ==============================================================================
-- PHẦN 5: DỮ LIỆU DEMO (24 BẢNG, MỖI BẢNG >= 5 DÒNG) - PHỤC VỤ TRÌNH DIỄN HỆ THỐNG
-- ==============================================================================
-- Mục đích: mỗi chức năng / use case đều có sẵn dữ liệu để bấm thử ngay sau `docker compose up`.
-- - Mật khẩu: admin = Admin@123; MỌI tài khoản demo khác = Demo@1234 (xem bảng tài khoản ở cuối phần này).
-- - Mốc thời gian TƯƠNG ĐỐI so với lúc khởi tạo CSDL ("hôm nay" theo giờ Việt Nam), nên hãy `docker compose down -v` rồi
--   `up` NGAY TRƯỚC buổi demo để lịch hẹn hôm nay / ngày mai còn hiệu lực.
-- - ID các bảng đều gán tường minh vì dữ liệu tham chiếu chéo giữa 4 database (không có khóa ngoại vật lý).
-- - Ảnh CĐHA mẫu nằm ở docs/demo-images/, được docker-compose gắn vào clinical-service tại /app/uploads/imaging/seed.
-- - Muốn CSDL "sạch" chỉ có admin + danh mục: xóa toàn bộ PHẦN 5 này (hoặc chạy e2e/reset_data.sh sau khi đã dựng DB).
-- - e2e/reset_data.sh xóa dữ liệu nghiệp vụ demo; chạy `docker compose down -v && docker compose up -d` để có lại.
-- ------------------------------------------------------------------------------
-- BẢNG TÀI KHOẢN DEMO (tên đăng nhập = số điện thoại)
--   admin        Admin@123  ADMIN                 Quản trị viên hệ thống
--   0910000001   Demo@1234  RECEPTIONIST          Nguyễn Thị Lan (lễ tân / thu ngân)
--   0910000008   Demo@1234  RECEPTIONIST          Ngô Thanh Tâm (lễ tân)
--   0910000002   Demo@1234  VETERINARIAN P01      BS. Trần Văn An    (đang khám 1 ca, BUSY)
--   0910000003   Demo@1234  VETERINARIAN P02      BS. Lê Thị Bình    (có ca đã đủ kết quả: Khóa ưu tiên tái khám)
--   0910000006   Demo@1234  VETERINARIAN P03      BS. Phạm Quốc Cường (đang khám ca mở lại, BUSY)
--   0910000007   Demo@1234  VETERINARIAN P04      BS. Đặng Thu Hương (rảnh, dùng để demo phân công)
--   0910000009   Demo@1234  VETERINARIAN P05      BS. Võ Minh Tuấn   (INACTIVE: đã nghỉ việc)
--   0910000004   Demo@1234  LAB_TECHNICIAN XN01   KTV. Phạm Văn Xuân
--   0910000005   Demo@1234  IMAGING_TECHNICIAN CDHA01  KTV. Hoàng Thị Hà
--   0920000001..0920000005  Demo@1234  PET_OWNER (chủ nuôi, ACTIVE);  0920000006 = PET_OWNER bị LOCKED
-- ==============================================================================
SET time_zone = '+00:00';
SET @today = DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR);          -- "hôm nay" theo giờ phòng khám (UTC+7)
SET @d0    = TIMESTAMP(@today) - INTERVAL 7 HOUR;              -- thời điểm 00:00 giờ VN hôm nay (đã quy về UTC)
SET @now   = NOW();
SET @floor = @d0 + INTERVAL 1 MINUTE;                          -- chặn mốc "hôm nay" tụt sang hôm qua nếu dựng DB lúc rạng sáng

-- Thời điểm check-in của 20 đợt khám: 8 ca quá khứ (theo ngày, giờ VN) + 12 ca hôm nay (tính lùi từ bây giờ)
SET @c1  = @d0 - INTERVAL 12 DAY + INTERVAL '9:05'  HOUR_MINUTE;
SET @c2  = @d0 - INTERVAL 9 DAY  + INTERVAL '8:40'  HOUR_MINUTE;
SET @c3  = @d0 - INTERVAL 7 DAY  + INTERVAL '10:20' HOUR_MINUTE;
SET @c4  = @d0 - INTERVAL 5 DAY  + INTERVAL '14:05' HOUR_MINUTE;
SET @c5  = @d0 - INTERVAL 3 DAY  + INTERVAL '15:10' HOUR_MINUTE;
SET @c6  = @d0 - INTERVAL 2 DAY  + INTERVAL '10:05' HOUR_MINUTE;
SET @c7  = @d0 - INTERVAL 1 DAY  + INTERVAL '9:30'  HOUR_MINUTE;
SET @c8  = @d0 - INTERVAL 1 DAY  + INTERVAL '14:00' HOUR_MINUTE;
SET @c9  = GREATEST(@now - INTERVAL 240 MINUTE, @floor);
SET @c10 = GREATEST(@now - INTERVAL 150 MINUTE, @floor);
SET @c11 = GREATEST(@now - INTERVAL 200 MINUTE, @floor);
SET @c12 = GREATEST(@now - INTERVAL 60  MINUTE, @floor);
SET @c13 = GREATEST(@now - INTERVAL 210 MINUTE, @floor);
SET @c14 = GREATEST(@now - INTERVAL 180 MINUTE, @floor);
SET @c15 = GREATEST(@now - INTERVAL 120 MINUTE, @floor);
SET @c16 = GREATEST(@now - INTERVAL 130 MINUTE, @floor);
SET @c17 = GREATEST(@now - INTERVAL 12  MINUTE, @floor);
SET @c18 = GREATEST(@now - INTERVAL 45  MINUTE, @floor);
SET @c19 = GREATEST(@now - INTERVAL 30  MINUTE, @floor);
SET @c20 = GREATEST(@now - INTERVAL 20  MINUTE, @floor);

-- ------------------------------------------------------------------------------
-- 5.1. AUTH-SERVICE: users (16), refresh_tokens (6)   [roles đã có 6 dòng]
--      role_id: 1 ADMIN, 2 VETERINARIAN, 3 RECEPTIONIST, 4 LAB_TECHNICIAN, 5 IMAGING_TECHNICIAN, 6 PET_OWNER
-- ------------------------------------------------------------------------------
USE pet_clinic_auth_db;

INSERT INTO users (id, role_id, username, password_hash, full_name, phone_number, email, address, room_number, status, created_at) VALUES
(2,  3, '0910000001', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'Nguyễn Thị Lan',      '0910000001', 'lan.letan@vetclinic.com',     'Quầy lễ tân tầng 1',        NULL,     'ACTIVE',   @d0 - INTERVAL 120 DAY),
(3,  2, '0910000002', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'BS. Trần Văn An',     '0910000002', 'an.tran@vetclinic.com',       NULL,                        'P01',    'ACTIVE',   @d0 - INTERVAL 120 DAY),
(4,  2, '0910000003', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'BS. Lê Thị Bình',     '0910000003', 'binh.le@vetclinic.com',       NULL,                        'P02',    'ACTIVE',   @d0 - INTERVAL 118 DAY),
(5,  4, '0910000004', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'KTV. Phạm Văn Xuân',  '0910000004', 'xuan.pham@vetclinic.com',     NULL,                        'XN01',   'ACTIVE',   @d0 - INTERVAL 118 DAY),
(6,  5, '0910000005', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'KTV. Hoàng Thị Hà',   '0910000005', 'ha.hoang@vetclinic.com',      NULL,                        'CDHA01', 'ACTIVE',   @d0 - INTERVAL 115 DAY),
(7,  2, '0910000006', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'BS. Phạm Quốc Cường', '0910000006', 'cuong.pham@vetclinic.com',    NULL,                        'P03',    'ACTIVE',   @d0 - INTERVAL 100 DAY),
(8,  2, '0910000007', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'BS. Đặng Thu Hương',  '0910000007', 'huong.dang@vetclinic.com',    NULL,                        'P04',    'ACTIVE',   @d0 - INTERVAL 90 DAY),
(9,  3, '0910000008', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'Ngô Thanh Tâm',       '0910000008', 'tam.ngo@vetclinic.com',       'Quầy lễ tân tầng 1',        NULL,     'ACTIVE',   @d0 - INTERVAL 80 DAY),
(10, 2, '0910000009', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'BS. Võ Minh Tuấn',    '0910000009', 'tuan.vo@vetclinic.com',       NULL,                        'P05',    'INACTIVE', @d0 - INTERVAL 200 DAY),
(11, 6, '0920000001', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'Đỗ Minh Quân',        '0920000001', 'quan.do@example.com',         '12 Lê Lợi, Quận 1, TP.HCM',          NULL, 'ACTIVE', @d0 - INTERVAL 60 DAY),
(12, 6, '0920000002', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'Vũ Thu Trang',        '0920000002', 'trang.vu@example.com',        '45 Nguyễn Trãi, Quận 5, TP.HCM',     NULL, 'ACTIVE', @d0 - INTERVAL 55 DAY),
(13, 6, '0920000003', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'Nguyễn Hoàng Nam',    '0920000003', 'nam.nguyen@example.com',      '78 Cách Mạng Tháng 8, Quận 3',       NULL, 'ACTIVE', @d0 - INTERVAL 40 DAY),
(14, 6, '0920000004', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'Trần Thị Mai',        '0920000004', 'mai.tran@example.com',        '9 Phan Xích Long, Phú Nhuận',        NULL, 'ACTIVE', @d0 - INTERVAL 30 DAY),
(15, 6, '0920000005', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'Lê Văn Hùng',         '0920000005', 'hung.le@example.com',         '101 Điện Biên Phủ, Bình Thạnh',      NULL, 'ACTIVE', @d0 - INTERVAL 20 DAY),
(16, 6, '0920000006', '$2a$12$UYQ1GVQcqxY9IzVqvwHwye.lh4dMxHHxFI34yvMQbGGlH0hILhjFW', 'Phạm Ngọc Anh',       '0920000006', 'anh.pham@example.com',        '23 Hoàng Văn Thụ, Tân Bình',         NULL, 'LOCKED', @d0 - INTERVAL 10 DAY);

-- Phiên đăng nhập mẫu (token là UUID ngẫu nhiên: có phiên còn hạn, đã thu hồi, đã hết hạn)
INSERT INTO refresh_tokens (user_id, token, expiry_date, revoked, created_at) VALUES
(1,  UUID(), @now + INTERVAL 7 DAY,   FALSE, @now),
(2,  UUID(), @now + INTERVAL 6 DAY,   FALSE, @now - INTERVAL 1 DAY),
(3,  UUID(), @now - INTERVAL 1 DAY,   FALSE, @now - INTERVAL 8 DAY),
(11, UUID(), @now + INTERVAL 5 DAY,   TRUE,  @now - INTERVAL 2 DAY),
(12, UUID(), @now + INTERVAL 4 DAY,   TRUE,  @now - INTERVAL 3 DAY),
(4,  UUID(), @now + INTERVAL 3 DAY,   FALSE, @now - INTERVAL 4 DAY);


-- ------------------------------------------------------------------------------
-- 5.2. APPOINTMENT-SERVICE: appointments (17), appointment_status_histories (~33)
--      Lịch quá khứ đã gắn với ca khám; hôm nay: 2 lịch đã check-in + 2 lịch CONFIRMED (khung chiều) để demo check-in;
--      ngày mai trở đi: 4 lịch PENDING (hàng chờ duyệt UC-17) và 2 lịch CONFIRMED.
-- ------------------------------------------------------------------------------
USE pet_clinic_appointment_db;

INSERT INTO appointments (id, appointment_code, pet_id, owner_id, appointment_date, start_time, end_time, reason, booking_channel, status,
                          cancel_reason, confirmed_by, confirmed_at, cancelled_by, cancelled_at, created_at) VALUES
(1,  'TMP-1',  1,  11, @today - INTERVAL 12 DAY, '09:00:00', '09:30:00', 'Tiêm phòng 7 bệnh định kỳ hằng năm',        'ONLINE', 'CHECKED_IN', NULL, 2, @d0 - INTERVAL 14 DAY + INTERVAL '10:40' HOUR_MINUTE, NULL, NULL, @d0 - INTERVAL 14 DAY + INTERVAL '10:12' HOUR_MINUTE),
(2,  'TMP-2',  2,  11, @today - INTERVAL 9 DAY,  '08:30:00', '09:00:00', 'Mèo bỏ ăn, nôn 2 ngày nay',                  'ONLINE', 'CHECKED_IN', NULL, 2, @d0 - INTERVAL 9 DAY + INTERVAL '8:00' HOUR_MINUTE,   NULL, NULL, @d0 - INTERVAL 9 DAY + INTERVAL '7:50' HOUR_MINUTE),
(3,  'TMP-3',  5,  13, @today - INTERVAL 5 DAY,  '14:00:00', '14:30:00', 'Chó bị què chân sau',                        'PHONE',  'CHECKED_IN', NULL, 2, @d0 - INTERVAL 5 DAY + INTERVAL '11:00' HOUR_MINUTE,  NULL, NULL, @d0 - INTERVAL 5 DAY + INTERVAL '11:00' HOUR_MINUTE),
(4,  'TMP-4',  6,  13, @today - INTERVAL 2 DAY,  '10:00:00', '10:30:00', 'Tiêm phòng 4 bệnh cho mèo',                   'ONLINE', 'CHECKED_IN', NULL, 9, @d0 - INTERVAL 3 DAY + INTERVAL '21:00' HOUR_MINUTE,  NULL, NULL, @d0 - INTERVAL 3 DAY + INTERVAL '20:15' HOUR_MINUTE),
(5,  'TMP-5',  4,  12, @today - INTERVAL 4 DAY,  '15:00:00', '15:30:00', 'Khám tổng quát cho mèo Ba Tư',               'ONLINE', 'CANCELLED',  'Chủ nuôi báo bận đột xuất', 2, @d0 - INTERVAL 6 DAY + INTERVAL '20:00' HOUR_MINUTE, 12, @d0 - INTERVAL 4 DAY + INTERVAL '8:00' HOUR_MINUTE, @d0 - INTERVAL 6 DAY + INTERVAL '19:30' HOUR_MINUTE),
(6,  'TMP-6',  9,  15, @today - INTERVAL 6 DAY,  '09:30:00', '10:00:00', 'Khám chó con bị tiêu chảy',                  'PHONE',  'NO_SHOW',    NULL, 2, @d0 - INTERVAL 7 DAY + INTERVAL '14:00' HOUR_MINUTE, NULL, NULL, @d0 - INTERVAL 7 DAY + INTERVAL '14:00' HOUR_MINUTE),
(7,  'TMP-7',  13, 12, @today - INTERVAL 3 DAY,  '11:00:00', '11:30:00', 'Tẩy giun định kỳ cho mèo',                    'ONLINE', 'CANCELLED',  'Phòng khám đổi lịch bảo trì thiết bị, xin lỗi quý khách', NULL, NULL, 2, @d0 - INTERVAL 3 DAY + INTERVAL '8:30' HOUR_MINUTE, @d0 - INTERVAL 5 DAY + INTERVAL '9:10' HOUR_MINUTE),
(8,  'TMP-8',  1,  11, @today,                   '09:00:00', '09:30:00', 'Tái khám sau tiêm phòng',                     'ONLINE', 'CHECKED_IN', NULL, 2, @d0 - INTERVAL 2 DAY + INTERVAL '21:20' HOUR_MINUTE,  NULL, NULL, @d0 - INTERVAL 2 DAY + INTERVAL '21:00' HOUR_MINUTE),
(9,  'TMP-9',  14, 14, @today,                   '08:30:00', '09:00:00', 'Chó nôn, ho kéo dài 3 ngày',                  'PHONE',  'CHECKED_IN', NULL, 9, @d0 - INTERVAL 1 DAY + INTERVAL '16:30' HOUR_MINUTE,  NULL, NULL, @d0 - INTERVAL 1 DAY + INTERVAL '16:30' HOUR_MINUTE),
(10, 'TMP-10', 9,  15, @today,                   '16:30:00', '17:00:00', 'Khám tổng quát chó Corgi',                    'PHONE',  'CONFIRMED',  NULL, 2, @d0 - INTERVAL 1 DAY + INTERVAL '17:00' HOUR_MINUTE,  NULL, NULL, @d0 - INTERVAL 1 DAY + INTERVAL '17:00' HOUR_MINUTE),
(11, 'TMP-11', 13, 12, @today,                   '16:00:00', '16:30:00', 'Tiêm phòng cho mèo Xiêm',                     'ONLINE', 'CONFIRMED',  NULL, 2, @d0 - INTERVAL 2 DAY + INTERVAL '9:15' HOUR_MINUTE,   NULL, NULL, @d0 - INTERVAL 2 DAY + INTERVAL '8:45' HOUR_MINUTE),
(12, 'TMP-12', 16, 15, @today + INTERVAL 1 DAY,  '09:00:00', '09:30:00', 'Kiểm tra sức khỏe vẹt Cockatiel',             'ONLINE', 'PENDING',    NULL, NULL, NULL, NULL, NULL, @now - INTERVAL 5 HOUR),
(13, 'TMP-13', 12, 11, @today + INTERVAL 1 DAY,  '09:00:00', '09:30:00', 'Khám da, chó ngứa gãi nhiều',                'ONLINE', 'PENDING',    NULL, NULL, NULL, NULL, NULL, @now - INTERVAL 3 HOUR),
(14, 'TMP-14', 3,  12, @today + INTERVAL 3 DAY,  '14:30:00', '15:00:00', 'Tái khám sau siêu âm ổ bụng',                'ONLINE', 'PENDING',    NULL, NULL, NULL, NULL, NULL, @now - INTERVAL 1 DAY),
(15, 'TMP-15', 7,  14, @today + INTERVAL 2 DAY,  '15:00:00', '15:30:00', 'Tái khám sau xét nghiệm máu',                'PHONE',  'CONFIRMED',  NULL, 2, @d0 - INTERVAL 1 DAY + INTERVAL '10:00' HOUR_MINUTE,  NULL, NULL, @d0 - INTERVAL 1 DAY + INTERVAL '10:00' HOUR_MINUTE),
(16, 'TMP-16', 11, 13, @today + INTERVAL 1 DAY,  '13:30:00', '14:00:00', 'Cắt móng và khám thỏ',                        'PHONE',  'CONFIRMED',  NULL, 9, @d0 - INTERVAL 1 DAY + INTERVAL '11:30' HOUR_MINUTE,  NULL, NULL, @d0 - INTERVAL 1 DAY + INTERVAL '11:30' HOUR_MINUTE),
(17, 'TMP-17', 2,  11, @today + INTERVAL 4 DAY,  '10:00:00', '10:30:00', 'Tái khám viêm ruột',                          'ONLINE', 'PENDING',    NULL, NULL, NULL, NULL, NULL, @now - INTERVAL 30 MINUTE);

-- Mã lịch hẹn = APT-<ngày tạo yyyyMMdd>-<id 5 chữ số> (đúng quy tắc của appointment-service)
UPDATE appointments SET appointment_code = CONCAT('APT-', DATE_FORMAT(created_at + INTERVAL 7 HOUR, '%Y%m%d'), '-', LPAD(id, 5, '0')), updated_at = created_at;

-- Audit trail: 1) lúc tạo  2) lễ tân duyệt  3) check-in  4) hủy  5) vắng mặt do hệ thống quét  6) một lần đổi giờ
INSERT INTO appointment_status_histories (appointment_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, NULL, IF(booking_channel = 'ONLINE', 'PENDING', 'CONFIRMED'), IF(booking_channel = 'ONLINE', owner_id, confirmed_by),
       IF(booking_channel = 'ONLINE', 'Chủ nuôi đặt lịch trực tuyến', 'Lễ tân đặt lịch thay khách'), created_at
FROM appointments;
INSERT INTO appointment_status_histories (appointment_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'PENDING', 'CONFIRMED', confirmed_by, 'Lễ tân duyệt lịch hẹn', confirmed_at
FROM appointments WHERE booking_channel = 'ONLINE' AND confirmed_by IS NOT NULL;
INSERT INTO appointment_status_histories (appointment_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'CONFIRMED', 'CHECKED_IN', confirmed_by, 'Khách đến, lễ tân check-in (hệ thống đồng bộ từ đợt khám)',
       TIMESTAMP(appointment_date, start_time) - INTERVAL 7 HOUR + INTERVAL 5 MINUTE
FROM appointments WHERE status = 'CHECKED_IN';
INSERT INTO appointment_status_histories (appointment_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, IF(confirmed_by IS NULL, 'PENDING', 'CONFIRMED'), 'CANCELLED', cancelled_by, cancel_reason, cancelled_at
FROM appointments WHERE status = 'CANCELLED';
INSERT INTO appointment_status_histories (appointment_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'CONFIRMED', 'NO_SHOW', NULL, 'Hệ thống tự động ghi nhận vắng mặt (quá giờ kết thúc khung + 30 phút)',
       TIMESTAMP(appointment_date, end_time) - INTERVAL 7 HOUR + INTERVAL 30 MINUTE
FROM appointments WHERE status = 'NO_SHOW';
INSERT INTO appointment_status_histories (appointment_id, from_status, to_status, changed_by_user_id, notes, created_at) VALUES
(15, 'CONFIRMED', 'CONFIRMED', 2, 'Đổi lịch từ 14:30 sang 15:00 theo đề nghị của chủ nuôi', @d0 - INTERVAL 1 DAY + INTERVAL '15:20' HOUR_MINUTE);


-- ------------------------------------------------------------------------------
-- 5.3. CLINICAL-SERVICE
-- ------------------------------------------------------------------------------
USE pet_clinic_clinical_db;

-- species: thêm 3 loài (DOG=1, CAT=2 đã có)
INSERT INTO species (id, code, name, description) VALUES
(3, 'RABBIT',  'Thỏ',            'Loài thỏ cảnh (Oryctolagus cuniculus)'),
(4, 'HAMSTER', 'Chuột Hamster',  'Các giống hamster nuôi làm cảnh'),
(5, 'BIRD',    'Chim cảnh',      'Vẹt, chim yến phụng và các loài chim cảnh khác');

-- services: thêm 7 dịch vụ để đủ 9 nhóm; IMG_CT là dịch vụ đã ngừng cung cấp (is_active = FALSE)
INSERT INTO services (id, code, name, category, price, description, is_active) VALUES
(8,  'FLEA',        'Điều trị ve, bọ chét ngoài da',      'EXTERNAL_PARASITE',  90000.00,  'Nhỏ gáy, tắm thuốc và vệ sinh ổ ghẻ, ve, bọ chét', TRUE),
(9,  'INJ_FLUID',   'Tiêm truyền dịch',                    'INJECTION_INFUSION', 80000.00,  'Truyền dịch bù nước, điện giải tại phòng khám',      TRUE),
(10, 'SURG_SPAY',   'Phẫu thuật triệt sản',                'SURGERY',            800000.00, 'Triệt sản chó mèo, gồm gây mê và theo dõi hậu phẫu', TRUE),
(11, 'PROC_DENTAL', 'Cạo vôi răng',                        'PROCEDURE',          300000.00, 'Cạo vôi răng siêu âm, đánh bóng',                     TRUE),
(12, 'LAB_BIOCHEM', 'Xét nghiệm sinh hóa máu cơ bản',      'LABORATORY',         350000.00, 'Men gan ALT, Creatinine, Glucose, BUN',               TRUE),
(13, 'VAC_RABIES',  'Tiêm phòng bệnh dại',                 'VACCINATION',        120000.00, 'Vaccine dại, nhắc lại hằng năm',                      TRUE),
(14, 'IMG_CT',      'Chụp CT (tạm ngừng cung cấp)',        'IMAGING',            1500000.00,'Dịch vụ chờ nâng cấp thiết bị',                       FALSE);

-- lab_test_items: thêm 4 chỉ số sinh hóa
INSERT INTO lab_test_items (id, code, name, unit, description) VALUES
(5, 'ALT',  'Men gan ALT (Alanine aminotransferase)', 'U/L',   'Đánh giá tổn thương tế bào gan'),
(6, 'CREA', 'Creatinine',                              'mg/dL', 'Đánh giá chức năng thận'),
(7, 'GLU',  'Đường huyết (Glucose)',                   'mg/dL', 'Đường huyết lúc đói'),
(8, 'BUN',  'Urê máu (BUN)',                           'mg/dL', 'Đánh giá chuyển hóa đạm và chức năng thận');

-- Khoảng tham chiếu cho chỉ số mới (chó = species 1, mèo = species 2)
INSERT INTO lab_test_reference_ranges (lab_test_item_id, species_id, min_value, max_value) VALUES
(5, 1, 10.00, 125.00), (5, 2, 12.00, 130.00),
(6, 1, 0.50, 1.80),    (6, 2, 0.80, 2.40),
(7, 1, 74.00, 143.00), (7, 2, 71.00, 148.00),
(8, 1, 7.00, 27.00),   (8, 2, 16.00, 36.00);

-- Dịch vụ LAB_BIOCHEM gồm 4 chỉ số sinh hóa (LAB_CBC đã gắn 4 chỉ số huyết học ở trên)
INSERT INTO service_lab_test_items (service_id, lab_test_item_id)
SELECT s.id, l.id FROM services s JOIN lab_test_items l ON l.code IN ('ALT', 'CREA', 'GLU', 'BUN') WHERE s.code = 'LAB_BIOCHEM';

-- pets (16): chủ nuôi 11..15 (chủ 16 bị khóa vẫn có 1 thú cưng)
INSERT INTO pets (id, owner_id, species_id, pet_code, name, breed, gender, date_of_birth, color, weight, is_neutered, identifying_characteristics, notes, created_at) VALUES
(1,  11, 1, CONCAT('PET-', YEAR(@today), '-00001'), 'Lucky', 'Golden Retriever',  'MALE',    @today - INTERVAL 4 YEAR, 'Vàng',          28.50, TRUE,  'Vết đen nhỏ ở tai trái',            'Dị ứng hải sản',                  @d0 - INTERVAL 60 DAY),
(2,  11, 2, CONCAT('PET-', YEAR(@today), '-00002'), 'Mimi',  'Mèo Anh lông ngắn', 'FEMALE',  @today - INTERVAL 2 YEAR, 'Xám xanh',      4.20,  FALSE, 'Mắt vàng, đuôi ngắn',               NULL,                              @d0 - INTERVAL 60 DAY),
(3,  12, 1, CONCAT('PET-', YEAR(@today), '-00003'), 'Bông',  'Poodle',            'FEMALE',  @today - INTERVAL 3 YEAR, 'Trắng',         5.00,  TRUE,  'Lông xoăn, cắt tỉa kiểu teddy',     'Hay sợ tiếng ồn',                 @d0 - INTERVAL 55 DAY),
(4,  12, 2, CONCAT('PET-', YEAR(@today), '-00004'), 'Kitty', 'Mèo Ba Tư',         'FEMALE',  @today - INTERVAL 1 YEAR, 'Kem',           3.80,  FALSE, 'Lông dài, mặt tẹt',                 'Dễ chảy nước mắt',                @d0 - INTERVAL 55 DAY),
(5,  13, 1, CONCAT('PET-', YEAR(@today), '-00005'), 'Rex',   'Becgie Đức',        'MALE',    @today - INTERVAL 5 YEAR, 'Đen vàng',      32.00, FALSE, 'Có gắn chip định danh',             'Tính cách hiếu động',             @d0 - INTERVAL 40 DAY),
(6,  13, 2, CONCAT('PET-', YEAR(@today), '-00006'), 'Miu',   'Mèo tam thể',       'FEMALE',  @today - INTERVAL 6 YEAR, 'Tam thể',       3.50,  TRUE,  'Đốm cam trên mũi',                  NULL,                              @d0 - INTERVAL 40 DAY),
(7,  14, 1, CONCAT('PET-', YEAR(@today), '-00007'), 'Mực',   'Chó Phú Quốc',      'MALE',    @today - INTERVAL 2 YEAR, 'Đen',           22.00, FALSE, 'Có xoáy lông trên lưng',            NULL,                              @d0 - INTERVAL 30 DAY),
(8,  14, 2, CONCAT('PET-', YEAR(@today), '-00008'), 'Tom',   'Mèo mướp',          'MALE',    @today - INTERVAL 3 YEAR, 'Vằn xám',       4.60,  TRUE,  'Sẹo ở tai phải',                    NULL,                              @d0 - INTERVAL 30 DAY),
(9,  15, 1, CONCAT('PET-', YEAR(@today), '-00009'), 'Bơ',    'Corgi',             'MALE',    @today - INTERVAL 1 YEAR, 'Vàng trắng',    11.00, FALSE, 'Chân ngắn, đuôi cộc',               'Đang tiêm phòng đợt 2',           @d0 - INTERVAL 20 DAY),
(10, 15, 4, CONCAT('PET-', YEAR(@today), '-00010'), 'Nhím',  'Hamster Winter White', 'UNKNOWN', @today - INTERVAL 1 YEAR, 'Xám',        0.15,  FALSE, NULL,                                NULL,                              @d0 - INTERVAL 20 DAY),
(11, 13, 3, CONCAT('PET-', YEAR(@today), '-00011'), 'Cốm',   'Thỏ Hà Lan',        'FEMALE',  @today - INTERVAL 1 YEAR, 'Trắng nâu',     2.10,  FALSE, NULL,                                'Ăn cỏ khô và rau xanh',           @d0 - INTERVAL 15 DAY),
(12, 11, 1, CONCAT('PET-', YEAR(@today), '-00012'), 'Xoài',  'Husky',             'FEMALE',  @today - INTERVAL 2 YEAR, 'Xám trắng',     20.50, TRUE,  'Mắt hai màu',                       NULL,                              @d0 - INTERVAL 14 DAY),
(13, 12, 2, CONCAT('PET-', YEAR(@today), '-00013'), 'Bống',  'Mèo Xiêm',          'MALE',    @today - INTERVAL 4 YEAR, 'Kem nâu',       4.40,  TRUE,  NULL,                                NULL,                              @d0 - INTERVAL 12 DAY),
(14, 14, 1, CONCAT('PET-', YEAR(@today), '-00014'), 'Gấu',   'Samoyed',           'MALE',    @today - INTERVAL 3 YEAR, 'Trắng',         18.00, FALSE, NULL,                                NULL,                              @d0 - INTERVAL 10 DAY),
(15, 16, 1, CONCAT('PET-', YEAR(@today), '-00015'), 'Cún',   'Chó cỏ',            'UNKNOWN', @today - INTERVAL 2 YEAR, 'Vàng',          9.00,  FALSE, NULL,                                NULL,                              @d0 - INTERVAL 8 DAY),
(16, 15, 5, CONCAT('PET-', YEAR(@today), '-00016'), 'Chip',  'Vẹt Cockatiel',     'UNKNOWN', @today - INTERVAL 2 YEAR, 'Xám mào vàng',  0.09,  FALSE, 'Mào vàng, má cam',                  NULL,                              @d0 - INTERVAL 5 DAY);

-- pet_visits (20): 8 ca quá khứ + 12 ca hôm nay phủ đủ 7 trạng thái của máy trạng thái SM-01
--  V1..V6 COMPLETED | V7 CANCELLED | V8 COMPLETED (khách bỏ về, EX-11) | V9,V10,V11 WAITING_PAYMENT | V12 IN_PROGRESS
--  V13 RESULTS_READY (Khóa ưu tiên của BS2) | V14 IN_PROGRESS (ca đã mở lại, T12) | V15,V16 WAITING_RESULTS
--  V17 WAITING cấp cứu | V18 WAITING có hẹn đúng giờ | V19 WAITING vãng lai | V20 WAITING có hẹn nhưng đến trễ
INSERT INTO pet_visits (id, visit_code, pet_id, appointment_id, doctor_id, receptionist_id, assigned_room, is_emergency, weight_at_visit, temperature,
                        initial_symptoms, clinical_notes, diagnosis, treatment_plan, doctor_advice, status, cancel_reason,
                        checked_in_at, started_at, closed_at, completed_at, scheduled_at, callback_postponed_at) VALUES
(1,  CONCAT('VIS-', YEAR(@today), '-00001'), 1,  1,    3,    2, 'P01', FALSE, 28.40, 38.5, 'Tiêm phòng định kỳ hằng năm',
     'Thể trạng tốt, tim phổi bình thường, niêm mạc hồng', 'Khỏe mạnh, đủ điều kiện tiêm phòng', 'Tiêm vaccine 7 bệnh mũi nhắc lại',
     'Theo dõi sốt hoặc sưng tại chỗ tiêm trong 48 giờ; nhắc vaccine lại sau 12 tháng', 'COMPLETED', NULL,
     @c1, @c1 + INTERVAL 10 MINUTE, @c1 + INTERVAL 35 MINUTE, @c1 + INTERVAL 47 MINUTE, @d0 - INTERVAL 12 DAY + INTERVAL '9:00' HOUR_MINUTE, NULL),
(2,  CONCAT('VIS-', YEAR(@today), '-00002'), 2,  2,    4,    9, 'P02', FALSE, 4.10, 39.4, 'Bỏ ăn, nôn nhiều lần 2 ngày',
     'Mất nước nhẹ, đau bụng khi sờ nắn, bạch cầu tăng', 'Viêm ruột cấp do nhiễm khuẩn', 'Kháng sinh Amoxicillin-Clavulanate 7 ngày, truyền dịch bù nước',
     'Cho ăn pate mềm, chia nhiều bữa nhỏ; tái khám sau 7 ngày hoặc ngay khi nôn trở lại', 'COMPLETED', NULL,
     @c2, @c2 + INTERVAL 10 MINUTE, @c2 + INTERVAL 110 MINUTE, @c2 + INTERVAL 122 MINUTE, @d0 - INTERVAL 9 DAY + INTERVAL '8:30' HOUR_MINUTE, NULL),
(3,  CONCAT('VIS-', YEAR(@today), '-00003'), 3,  NULL, 7,    2, 'P03', FALSE, 5.00, 38.8, 'Bụng chướng, nôn sau khi ăn',
     'Đau vùng thượng vị, không sờ thấy khối', 'Viêm dạ dày; siêu âm không thấy tắc ruột', 'Ăn chế độ nhẹ, chia nhỏ bữa, theo dõi 3 ngày',
     'Nếu nôn kéo dài trên 24 giờ cần quay lại ngay', 'COMPLETED', NULL,
     @c3, @c3 + INTERVAL 10 MINUTE, @c3 + INTERVAL 75 MINUTE, @c3 + INTERVAL 88 MINUTE, NULL, NULL),
(4,  CONCAT('VIS-', YEAR(@today), '-00004'), 5,  3,    3,    2, 'P01', FALSE, 32.00, 38.7, 'Què chân sau sau khi chạy nhảy',
     'Đau khi duỗi khớp háng, không sưng nóng, tiểu cầu hơi thấp', 'Căng cơ chân sau, X-quang không thấy gãy xương',
     'Nghỉ ngơi, hạn chế vận động 2 tuần, thuốc giảm đau chống viêm', 'Không cho chạy nhảy; tái khám nếu còn què sau 10 ngày', 'COMPLETED', NULL,
     @c4, @c4 + INTERVAL 10 MINUTE, @c4 + INTERVAL 105 MINUTE, @c4 + INTERVAL 118 MINUTE, @d0 - INTERVAL 5 DAY + INTERVAL '14:00' HOUR_MINUTE, NULL),
(5,  CONCAT('VIS-', YEAR(@today), '-00005'), 7,  NULL, 4,    9, 'P02', FALSE, 22.00, 38.5, 'Tẩy giun định kỳ',
     'Thể trạng tốt, bụng mềm', 'Tẩy giun định kỳ, chưa phát hiện biểu hiện nhiễm nặng', 'Uống Drontal Plus 2 viên, lặp lại sau 3 tuần',
     'Vệ sinh chỗ nằm, thu gom phân hằng ngày', 'COMPLETED', NULL,
     @c5, @c5 + INTERVAL 10 MINUTE, @c5 + INTERVAL 35 MINUTE, @c5 + INTERVAL 45 MINUTE, NULL, NULL),
(6,  CONCAT('VIS-', YEAR(@today), '-00006'), 6,  4,    7,    9, 'P03', FALSE, 3.50, 38.4, 'Tiêm phòng 4 bệnh',
     'Mèo khỏe, đã triệt sản', 'Khỏe mạnh', 'Tiêm vaccine Purevax RCP', 'Cho nghỉ ngơi, theo dõi chỗ tiêm trong 24 giờ', 'COMPLETED', NULL,
     @c6, @c6 + INTERVAL 10 MINUTE, @c6 + INTERVAL 40 MINUTE, @c6 + INTERVAL 52 MINUTE, @d0 - INTERVAL 2 DAY + INTERVAL '10:00' HOUR_MINUTE, NULL),
(7,  CONCAT('VIS-', YEAR(@today), '-00007'), 9,  NULL, NULL, 2, NULL, FALSE, NULL, NULL, 'Chó con tiêu chảy',
     NULL, NULL, NULL, NULL, 'CANCELLED', 'Chủ nuôi xin về vì chờ lâu, sẽ đặt lịch lại',
     @c7, NULL, NULL, NULL, NULL, NULL),
(8,  CONCAT('VIS-', YEAR(@today), '-00008'), 8,  NULL, 4,    2, 'P02', FALSE, 4.60, 39.0, 'Mèo ủ rũ, sốt nhẹ',
     'Niêm mạc nhợt nhạt, cần khám tiếp sau khi có kết quả', 'Chưa kết luận: khách bỏ về khi vừa có kết quả xét nghiệm', NULL, NULL, 'COMPLETED', NULL,
     @c8, @c8 + INTERVAL 10 MINUTE, @c8 + INTERVAL 95 MINUTE, @c8 + INTERVAL 95 MINUTE, NULL, NULL),
(9,  CONCAT('VIS-', YEAR(@today), '-00009'), 4,  NULL, 7,    2, 'P03', FALSE, 3.80, 39.1, 'Hắt hơi, chảy mũi, bỏ ăn',
     'Mắt có ghèn, hạch dưới hàm sưng', 'Viêm đường hô hấp trên (nghi herpes mèo)', 'Kháng sinh 10 ngày, bù nước điện giải',
     'Giữ ấm, vệ sinh mắt mũi bằng nước muối; tái khám sau 10 ngày', 'WAITING_PAYMENT', NULL,
     @c9, @c9 + INTERVAL 10 MINUTE, @c9 + INTERVAL 95 MINUTE, NULL, NULL, NULL),
(10, CONCAT('VIS-', YEAR(@today), '-00010'), 10, NULL, 3,    9, 'P01', FALSE, 0.15, 37.8, 'Cắt móng, kiểm tra răng hamster',
     'Răng cửa mòn đều, không có dấu hiệu bệnh', 'Khỏe mạnh', 'Không cần điều trị', 'Bổ sung rau xanh và đồ gặm cho mòn răng', 'WAITING_PAYMENT', NULL,
     @c10, @c10 + INTERVAL 10 MINUTE, @c10 + INTERVAL 30 MINUTE, NULL, NULL, NULL),
(11, CONCAT('VIS-', YEAR(@today), '-00011'), 11, NULL, 4,    2, 'P02', FALSE, 2.10, 38.9, 'Phân mềm, nghi nhiễm giun',
     'Bụng mềm, lông xơ xác', 'Nhiễm giun đường ruột nhẹ', 'Tẩy giun, bổ sung vitamin B', 'Vệ sinh chuồng hằng ngày, tái khám sau 3 tuần', 'WAITING_PAYMENT', NULL,
     @c11, @c11 + INTERVAL 10 MINUTE, @c11 + INTERVAL 35 MINUTE, NULL, NULL, NULL),
(12, CONCAT('VIS-', YEAR(@today), '-00012'), 5,  NULL, 3,    2, 'P01', FALSE, 32.40, 38.6, 'Ngứa gãi nhiều, rụng lông quanh tai',
     'Da đỏ, nhìn thấy ve và bọ chét', NULL, NULL, NULL, 'IN_PROGRESS', NULL,
     @c12, @c12 + INTERVAL 10 MINUTE, NULL, NULL, NULL, NULL),
(13, CONCAT('VIS-', YEAR(@today), '-00013'), 6,  NULL, 4,    9, 'P02', FALSE, 3.50, 39.6, 'Nôn, sụt cân, uống nhiều nước',
     'Mất nước nhẹ, bụng căng', NULL, NULL, NULL, 'RESULTS_READY', NULL,
     @c13, @c13 + INTERVAL 10 MINUTE, NULL, NULL, NULL, NULL),
(14, CONCAT('VIS-', YEAR(@today), '-00014'), 8,  NULL, 7,    2, 'P03', FALSE, 4.55, 38.9, 'Ho, chảy nước mũi',
     'Phổi có ran nhẹ', 'Viêm phế quản nhẹ', 'Theo dõi tại nhà, bổ sung kháng sinh (đang bổ sung đơn thuốc sau khi mở lại ca)', NULL, 'IN_PROGRESS', NULL,
     @c14, @c14 + INTERVAL 10 MINUTE, NULL, NULL, NULL, NULL),
(15, CONCAT('VIS-', YEAR(@today), '-00015'), 3,  NULL, 8,    9, 'P04', FALSE, 5.10, 39.2, 'Sụt cân, bụng to dần',
     'Bụng căng, nghi dịch ổ bụng', NULL, NULL, NULL, 'WAITING_RESULTS', NULL,
     @c15, @c15 + INTERVAL 10 MINUTE, NULL, NULL, NULL, NULL),
(16, CONCAT('VIS-', YEAR(@today), '-00016'), 7,  NULL, 8,    2, 'P04', FALSE, 22.30, 40.1, 'Què chân trước, sốt cao',
     'Khớp cổ chân sưng nóng', NULL, NULL, NULL, 'WAITING_RESULTS', NULL,
     @c16, @c16 + INTERVAL 10 MINUTE, NULL, NULL, NULL, NULL),
(17, CONCAT('VIS-', YEAR(@today), '-00017'), 2,  NULL, NULL, 9, NULL,  TRUE,  NULL, NULL, 'Co giật, sùi bọt mép, nghi ngộ độc',
     NULL, NULL, NULL, NULL, 'WAITING', NULL, @c17, NULL, NULL, NULL, NULL, NULL),
(18, CONCAT('VIS-', YEAR(@today), '-00018'), 1,  8,    NULL, 2, NULL,  FALSE, NULL, NULL, 'Tái khám sau tiêm phòng',
     NULL, NULL, NULL, NULL, 'WAITING', NULL, @c18, NULL, NULL, NULL, @d0 + INTERVAL '9:00' HOUR_MINUTE, NULL),
(19, CONCAT('VIS-', YEAR(@today), '-00019'), 12, NULL, NULL, 9, NULL,  FALSE, NULL, NULL, 'Ngứa gãi, da đỏ vùng bụng',
     NULL, NULL, NULL, NULL, 'WAITING', NULL, @c19, NULL, NULL, NULL, NULL, NULL),
(20, CONCAT('VIS-', YEAR(@today), '-00020'), 14, 9,    NULL, 2, NULL,  FALSE, NULL, NULL, 'Nôn, ho kéo dài 3 ngày',
     NULL, NULL, NULL, NULL, 'WAITING', NULL, @c20, NULL, NULL, NULL, NULL, NULL);

-- pet_visit_status_histories: toàn bộ vòng đời của từng ca (người đổi bắt buộc khác NULL)
INSERT INTO pet_visit_status_histories (visit_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, NULL, 'WAITING', receptionist_id,
       CASE WHEN is_emergency THEN 'Check-in ca cấp cứu'
            WHEN appointment_id IS NULL THEN 'Check-in khách vãng lai'
            WHEN scheduled_at IS NULL THEN 'Check-in theo lịch hẹn, đến trễ quá khung giờ nên xếp như khách vãng lai'
            ELSE 'Check-in theo lịch hẹn, đúng khung giờ' END, checked_in_at
FROM pet_visits;
INSERT INTO pet_visit_status_histories (visit_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'WAITING', 'IN_PROGRESS', doctor_id, 'Bác sĩ bắt đầu khám', started_at FROM pet_visits WHERE started_at IS NOT NULL;
INSERT INTO pet_visit_status_histories (visit_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'IN_PROGRESS', 'WAITING_RESULTS', doctor_id, 'Chỉ định cận lâm sàng, bác sĩ được giải phóng', started_at + INTERVAL 20 MINUTE
FROM pet_visits WHERE id IN (2, 3, 4, 8, 9, 13, 15, 16);
INSERT INTO pet_visit_status_histories (visit_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'WAITING_RESULTS', 'RESULTS_READY', IF(id = 8, 5, 6), 'Đã đủ kết quả cận lâm sàng, gọi bác sĩ tái khám', started_at + INTERVAL 65 MINUTE
FROM pet_visits WHERE id IN (2, 3, 4, 8, 9, 13);
INSERT INTO pet_visit_status_histories (visit_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'RESULTS_READY', 'IN_PROGRESS', doctor_id, 'Bác sĩ mời bệnh nhân vào tái khám', started_at + INTERVAL 75 MINUTE
FROM pet_visits WHERE id IN (2, 3, 4, 9);
INSERT INTO pet_visit_status_histories (visit_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'IN_PROGRESS', 'WAITING_PAYMENT', doctor_id, 'Bác sĩ chốt ca, chuyển thanh toán', closed_at
FROM pet_visits WHERE id IN (1, 2, 3, 4, 5, 6, 9, 10, 11);
INSERT INTO pet_visit_status_histories (visit_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'WAITING_PAYMENT', 'COMPLETED', 2, 'Thanh toán và phát thuốc hoàn tất', completed_at FROM pet_visits WHERE id IN (1, 2, 3, 4, 5, 6);
INSERT INTO pet_visit_status_histories (visit_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'RESULTS_READY', 'COMPLETED', 2, 'Khách bỏ về khi có kết quả (EX-11), hóa đơn ghi nợ', completed_at FROM pet_visits WHERE id = 8;
INSERT INTO pet_visit_status_histories (visit_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'WAITING', 'CANCELLED', 2, cancel_reason, checked_in_at + INTERVAL 25 MINUTE FROM pet_visits WHERE id = 7;
INSERT INTO pet_visit_status_histories (visit_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'IN_PROGRESS', 'WAITING_PAYMENT', doctor_id, 'Bác sĩ chốt ca, chuyển thanh toán', started_at + INTERVAL 30 MINUTE FROM pet_visits WHERE id = 14;
INSERT INTO pet_visit_status_histories (visit_id, from_status, to_status, changed_by_user_id, notes, created_at)
SELECT id, 'WAITING_PAYMENT', 'IN_PROGRESS', 1, 'Mở lại đợt khám (T12): bác sĩ cần bổ sung đơn thuốc, hóa đơn PENDING đã được hủy', started_at + INTERVAL 50 MINUTE
FROM pet_visits WHERE id = 14;

-- visit_service_details (36): service_id 1 EXAM_GEN, 2 VAC_7B, 3 VAC_4B, 4 DEWORM, 5 LAB_CBC, 6 IMG_US_AB, 7 IMG_XRAY,
--                             8 FLEA, 9 INJ_FLUID, 12 LAB_BIOCHEM. Đơn giá là snapshot lúc chỉ định.
INSERT INTO visit_service_details (id, visit_id, service_id, unit_price, quantity, subtotal, status, notes) VALUES
(1,  1,  1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(2,  1,  2, 150000.00, 1, 150000.00, 'COMPLETED',   'Tiêm mũi nhắc vaccine 7 bệnh'),
(3,  2,  1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(4,  2,  5, 250000.00, 1, 250000.00, 'COMPLETED',   'Nghi nhiễm khuẩn tiêu hóa'),
(5,  2,  9,  80000.00, 1,  80000.00, 'COMPLETED',   'Truyền dịch bù nước'),
(6,  2,  6, 200000.00, 1, 200000.00, 'COMPLETED',   'Kiểm tra quai ruột'),
(7,  3,  1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(8,  3,  6, 200000.00, 1, 200000.00, 'COMPLETED',   'Loại trừ tắc ruột'),
(9,  4,  1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(10, 4,  7, 180000.00, 1, 180000.00, 'COMPLETED',   'Chụp khớp háng 1 tư thế'),
(11, 4,  5, 250000.00, 1, 250000.00, 'COMPLETED',   NULL),
(12, 5,  1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(13, 5,  4,  50000.00, 1,  50000.00, 'COMPLETED',   NULL),
(14, 6,  1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(15, 6,  3, 150000.00, 1, 150000.00, 'COMPLETED',   NULL),
(16, 8,  1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(17, 8,  5, 250000.00, 1, 250000.00, 'COMPLETED',   'Niêm mạc nhợt nhạt'),
(18, 9,  1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(19, 9,  5, 250000.00, 1, 250000.00, 'COMPLETED',   NULL),
(20, 9,  7, 180000.00, 1, 180000.00, 'COMPLETED',   'Chụp ngực thẳng, đánh giá phổi'),
(21, 10, 1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(22, 11, 1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(23, 11, 4,  50000.00, 1,  50000.00, 'COMPLETED',   NULL),
(24, 12, 1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(25, 12, 8,  90000.00, 1,  90000.00, 'COMPLETED',   'Nhỏ gáy và tắm thuốc diệt ve'),
(26, 13, 1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(27, 13, 5, 250000.00, 1, 250000.00, 'COMPLETED',   NULL),
(28, 13, 6, 200000.00, 1, 200000.00, 'COMPLETED',   'Siêu âm tìm nguyên nhân nôn, sụt cân'),
(29, 13, 7, 180000.00, 1, 180000.00, 'CANCELLED',   'Chủ nuôi từ chối chụp X-quang'),
(30, 14, 1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(31, 15, 1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(32, 15, 5, 250000.00, 1, 250000.00, 'PENDING',     'Ưu tiên: nghi thiếu máu'),
(33, 15, 6, 200000.00, 1, 200000.00, 'PENDING',     'Nghi dịch ổ bụng'),
(34, 16, 1, 100000.00, 1, 100000.00, 'COMPLETED',   'Khám lâm sàng tổng quát (tự thêm khi bắt đầu khám)'),
(35, 16, 12, 350000.00, 1, 350000.00, 'PENDING',    'Đánh giá chức năng gan, thận'),
(36, 16, 7, 180000.00, 1, 180000.00, 'IN_PROGRESS', 'Chụp khớp cổ chân trước');
UPDATE visit_service_details d JOIN pet_visits v ON v.id = d.visit_id SET d.created_at = v.started_at + INTERVAL 5 MINUTE;

-- visit_service_detail_histories: ORDERED -> (START_PROCESSING) -> COMPLETED / CANCELLED / POSTPONED / RECALL
INSERT INTO visit_service_detail_histories (visit_service_detail_id, from_status, to_status, action, changed_by_user_id, reason, created_at)
SELECT d.id, NULL, 'PENDING', 'ORDERED', v.doctor_id, NULL, v.started_at + INTERVAL 5 MINUTE
FROM visit_service_details d JOIN pet_visits v ON v.id = d.visit_id;
INSERT INTO visit_service_detail_histories (visit_service_detail_id, from_status, to_status, action, changed_by_user_id, reason, created_at)
SELECT d.id, 'PENDING', 'COMPLETED', 'COMPLETED', v.doctor_id, NULL, v.started_at + INTERVAL 6 MINUTE
FROM visit_service_details d JOIN pet_visits v ON v.id = d.visit_id JOIN services s ON s.id = d.service_id
WHERE d.status = 'COMPLETED' AND s.category NOT IN ('LABORATORY', 'IMAGING');
INSERT INTO visit_service_detail_histories (visit_service_detail_id, from_status, to_status, action, changed_by_user_id, reason, created_at)
SELECT d.id, 'PENDING', 'IN_PROGRESS', 'START_PROCESSING', IF(s.category = 'LABORATORY', 5, 6), NULL, v.started_at + INTERVAL 30 MINUTE
FROM visit_service_details d JOIN pet_visits v ON v.id = d.visit_id JOIN services s ON s.id = d.service_id
WHERE d.status IN ('COMPLETED', 'IN_PROGRESS') AND s.category IN ('LABORATORY', 'IMAGING');
INSERT INTO visit_service_detail_histories (visit_service_detail_id, from_status, to_status, action, changed_by_user_id, reason, created_at)
SELECT d.id, 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', IF(s.category = 'LABORATORY', 5, 6), NULL, v.started_at + INTERVAL 55 MINUTE
FROM visit_service_details d JOIN pet_visits v ON v.id = d.visit_id JOIN services s ON s.id = d.service_id
WHERE d.status = 'COMPLETED' AND s.category IN ('LABORATORY', 'IMAGING');
INSERT INTO visit_service_detail_histories (visit_service_detail_id, from_status, to_status, action, changed_by_user_id, reason, created_at)
SELECT 29, 'PENDING', 'CANCELLED', 'CANCELLED', doctor_id, 'Chủ nuôi từ chối chụp X-quang', started_at + INTERVAL 25 MINUTE FROM pet_visits WHERE id = 13;
INSERT INTO visit_service_detail_histories (visit_service_detail_id, from_status, to_status, action, changed_by_user_id, reason, created_at)
SELECT 35, 'PENDING', 'PENDING', 'POSTPONED', 5, 'Mẫu máu đầu bị tan huyết, chờ lấy mẫu mới', started_at + INTERVAL 35 MINUTE FROM pet_visits WHERE id = 16;
INSERT INTO visit_service_detail_histories (visit_service_detail_id, from_status, to_status, action, changed_by_user_id, reason, created_at)
SELECT 32, 'PENDING', 'PENDING', 'RECALL', 5, 'Ưu tiên làm tiếp theo theo yêu cầu bác sĩ', started_at + INTERVAL 40 MINUTE FROM pet_visits WHERE id = 15;

-- lab_test_results (20 = 5 phiếu CBC x 4 chỉ số). Chỉ số: 1 WBC, 2 RBC, 3 HGB, 4 PLT.
-- Mèo (Mimi, Tom, Kitty, Miu) so với khoảng của MÈO; chó (Rex) so với khoảng của CHÓ; snapshot khoảng lưu cùng kết quả.
INSERT INTO lab_test_results (visit_service_detail_id, lab_test_item_id, result_value, min_value_snapshot, max_value_snapshot, evaluation, performed_by, notes) VALUES
(4,  1, 22.40, 5.50, 19.50, 'HIGH',   5, 'Bạch cầu tăng, nghi nhiễm khuẩn'),
(4,  2, 7.20,  5.00, 10.00, 'NORMAL', 5, NULL),
(4,  3, 11.00, 8.00, 15.00, 'NORMAL', 5, NULL),
(4,  4, 410.00, 300.00, 700.00, 'NORMAL', 5, NULL),
(11, 1, 14.20, 6.00, 17.00, 'NORMAL', 5, NULL),
(11, 2, 6.90,  5.50, 8.50,  'NORMAL', 5, NULL),
(11, 3, 15.10, 12.00, 18.00, 'NORMAL', 5, NULL),
(11, 4, 180.00, 200.00, 500.00, 'LOW', 5, 'Tiểu cầu hơi thấp, theo dõi'),
(17, 1, 9.80,  5.50, 19.50, 'NORMAL', 5, NULL),
(17, 2, 4.60,  5.00, 10.00, 'LOW',    5, 'Thiếu máu nhẹ'),
(17, 3, 7.40,  8.00, 15.00, 'LOW',    5, 'Huyết sắc tố thấp'),
(17, 4, 350.00, 300.00, 700.00, 'NORMAL', 5, NULL),
(19, 1, 12.00, 5.50, 19.50, 'NORMAL', 5, NULL),
(19, 2, 6.10,  5.00, 10.00, 'NORMAL', 5, NULL),
(19, 3, 12.20, 8.00, 15.00, 'NORMAL', 5, NULL),
(19, 4, 280.00, 300.00, 700.00, 'LOW', 5, 'Tiểu cầu hơi thấp'),
(27, 1, 25.10, 5.50, 19.50, 'HIGH',   5, 'Bạch cầu tăng cao, nghi viêm hoặc nhiễm trùng'),
(27, 2, 5.80,  5.00, 10.00, 'NORMAL', 5, NULL),
(27, 3, 9.50,  8.00, 15.00, 'NORMAL', 5, NULL),
(27, 4, 720.00, 300.00, 700.00, 'HIGH', 5, 'Tiểu cầu tăng nhẹ');
UPDATE lab_test_results r JOIN visit_service_details d ON d.id = r.visit_service_detail_id JOIN pet_visits v ON v.id = d.visit_id
SET r.created_at = v.started_at + INTERVAL 55 MINUTE;

-- imaging_results (5) + imaging_attachments (5): ảnh mô phỏng nằm ở docs/demo-images/, gắn vào /app/uploads/imaging/seed
INSERT INTO imaging_results (id, visit_service_detail_id, description, conclusion, performed_by) VALUES
(1, 6,  'Quai ruột non giãn nhẹ chứa ít dịch, thành ruột dày 3 mm. Gan, thận, lách cấu trúc bình thường.', 'Viêm ruột, không thấy dị vật gây tắc', 6),
(2, 8,  'Dạ dày co bóp tốt, thành dạ dày hơi dày. Không thấy dị vật hay khối bất thường. Các cơ quan còn lại bình thường.', 'Viêm dạ dày nhẹ, loại trừ tắc ruột', 6),
(3, 10, 'Khớp háng hai bên cân đối, không thấy đường gãy, khe khớp bình thường. Mô mềm quanh khớp không sưng.', 'Không gãy xương; nghi căng cơ mô mềm', 6),
(4, 20, 'Trường phổi sáng, tăng đậm nhẹ quanh phế quản, bóng tim bình thường.', 'Hình ảnh viêm phế quản nhẹ', 6),
(5, 28, 'Ruột non có nhiều hơi, thành ruột dày không đều ở đoạn hồi tràng, hạch mạc treo hơi to.', 'Nghi viêm ruột mạn, cần đối chiếu xét nghiệm', 6);
UPDATE imaging_results r JOIN visit_service_details d ON d.id = r.visit_service_detail_id JOIN pet_visits v ON v.id = d.visit_id
SET r.performed_at = v.started_at + INTERVAL 50 MINUTE;
INSERT INTO imaging_attachments (imaging_result_id, file_url, file_name, file_size, content_type) VALUES
(1, 'seed/usg-mimi.png',  'usg-mimi.png',  73272, 'image/png'),
(2, 'seed/usg-bong.png',  'usg-bong.png',  73161, 'image/png'),
(3, 'seed/xq-rex.png',    'xq-rex.png',    53464, 'image/png'),
(4, 'seed/xq-kitty.png',  'xq-kitty.png',  53210, 'image/png'),
(5, 'seed/usg-miu.png',   'usg-miu.png',   71837, 'image/png');


-- ==============================================================================
-- 5.4. BILLING-PHARMACY-SERVICE
-- ==============================================================================
USE pet_clinic_billing_pharmacy_db;

-- medicines: thêm 5 thuốc (id 5..9) và cập nhật tồn kho 4 thuốc có sẵn cho khớp nhật ký kho bên dưới.
--   MED_ORS tồn 8 <= ngưỡng 10 (cảnh báo sắp hết); MED_METRO đã ngừng kinh doanh.
INSERT INTO medicines (id, code, name, active_ingredient, dosage_form, unit, sale_price, stock_quantity, min_stock_alert, is_active) VALUES
(5, 'MED_MELOX',  'Meloxicam 1.5mg/ml',                    'Meloxicam',              'Dung dịch uống',      'Chai', 120000.00, 29,  5,  TRUE),
(6, 'MED_FRONTL', 'Frontline Plus (nhỏ gáy ve, bọ chét)',  'Fipronil, S-methoprene', 'Dung dịch nhỏ gáy',   'Ống',  95000.00,  80,  10, TRUE),
(7, 'MED_VITB',   'Vitamin B Complex',                     'Vitamin B1, B6, B12',    'Viên nén',            'Viên', 3000.00,   500, 50, TRUE),
(8, 'MED_ORS',    'Oresol bù nước điện giải',              'Natri, kali, glucose',   'Gói bột',             'Gói',  5000.00,   8,   10, TRUE),
(9, 'MED_METRO',  'Metronidazole 250mg (ngừng kinh doanh)','Metronidazole',          'Viên nén',            'Viên', 4000.00,   0,   5,  FALSE);
UPDATE medicines SET stock_quantity = 220 WHERE id = 1;
UPDATE medicines SET stock_quantity = 59  WHERE id = 2;
UPDATE medicines SET stock_quantity = 44  WHERE id = 3;
UPDATE medicines SET stock_quantity = 108 WHERE id = 4;

-- prescriptions (9): 5 DISPENSED (ca đã hoàn tất), 3 PRESCRIBED (chờ thanh toán / chờ phát), 1 CANCELLED (khách xin toa mua ngoài)
INSERT INTO prescriptions (id, visit_id, doctor_notes, status, dispensed_by, dispensed_at, created_at) VALUES
(1, 1, 'Tiêm vaccine tại phòng khám',                   'DISPENSED',  2, @c1 + INTERVAL 47 MINUTE,  @c1 + INTERVAL 32 MINUTE),
(2, 2, 'Uống sau ăn, đủ liệu trình 7 ngày',             'DISPENSED',  2, @c2 + INTERVAL 122 MINUTE, @c2 + INTERVAL 107 MINUTE),
(3, 4, 'Giảm đau chống viêm 5 ngày, nghỉ ngơi',         'DISPENSED',  2, @c4 + INTERVAL 118 MINUTE, @c4 + INTERVAL 102 MINUTE),
(4, 5, 'Tẩy giun, lặp lại sau 3 tuần',                  'DISPENSED',  2, @c5 + INTERVAL 45 MINUTE,  @c5 + INTERVAL 32 MINUTE),
(5, 6, 'Vaccine 4 bệnh cho mèo',                        'DISPENSED',  2, @c6 + INTERVAL 52 MINUTE,  @c6 + INTERVAL 37 MINUTE),
(6, 9, 'Kháng sinh 10 ngày và bù nước, tái khám sau 10 ngày', 'PRESCRIBED', NULL, NULL,              @c9 + INTERVAL 92 MINUTE),
(7, 11, 'Bổ sung vitamin B sau tẩy giun',               'PRESCRIBED', NULL, NULL,                    @c11 + INTERVAL 32 MINUTE),
(8, 14, 'Kháng sinh 3 ngày (đơn lập lại sau khi mở ca)', 'PRESCRIBED', NULL, NULL,                   @c14 + INTERVAL 55 MINUTE),
(9, 8, 'Kháng sinh 4 ngày; khách xin toa để mua thuốc ngoài', 'CANCELLED', NULL, NULL,               @c8 + INTERVAL 85 MINUTE);

INSERT INTO prescription_items (prescription_id, medicine_id, quantity, unit_price, subtotal, dosage, frequency, duration_days, instructions) VALUES
(1, 2, 1,  180000.00, 180000.00, '1 liều',  'Tiêm 1 lần',   1, 'Tiêm dưới da tại phòng khám'),
(2, 1, 14, 15000.00,  210000.00, '1 viên',  '2 lần/ngày',   7, 'Uống sau ăn, nghiền nhỏ trộn vào pate'),
(3, 1, 10, 15000.00,  150000.00, '1 viên',  '2 lần/ngày',   5, 'Uống sau ăn'),
(3, 5, 1,  120000.00, 120000.00, '0,5 ml',  '1 lần/ngày',   5, 'Trộn vào thức ăn, dùng sau ăn'),
(4, 4, 2,  45000.00,  90000.00,  '1 viên',  'Một lần',      1, 'Cho uống lúc đói; lặp lại sau 3 tuần'),
(5, 3, 1,  190000.00, 190000.00, '1 liều',  'Tiêm 1 lần',   1, 'Tiêm dưới da tại phòng khám'),
(6, 1, 10, 15000.00,  150000.00, '1 viên',  '2 lần/ngày',   5, 'Uống sau ăn'),
(6, 8, 5,  5000.00,   25000.00,  '1 gói',   '2 lần/ngày',   3, 'Pha 100 ml nước ấm, cho uống từ từ'),
(7, 7, 10, 3000.00,   30000.00,  '1 viên',  '1 lần/ngày',   10, 'Nghiền nhỏ trộn vào rau'),
(8, 1, 6,  15000.00,  90000.00,  '1 viên',  '2 lần/ngày',   3, 'Uống sau ăn'),
(9, 1, 8,  15000.00,  120000.00, '1 viên',  '2 lần/ngày',   4, 'Uống sau ăn');

-- inventory_transactions (18): nhập kho ban đầu, xuất theo đơn đã phát, cân chỉnh (hao hụt, hết hạn, thu hồi).
-- Cột quantity luôn dương với IMPORT / EXPORT_PRESCRIPTION; riêng ADJUSTMENT mang dấu. Số dư cuối khớp medicines.stock_quantity.
INSERT INTO inventory_transactions (medicine_id, transaction_type, quantity, balance_after, reference_id, notes, created_by, created_at) VALUES
(1, 'IMPORT',             250, 250, NULL, 'Nhập lô đầu kỳ',                              1, @d0 - INTERVAL 30 DAY + INTERVAL '9:00' HOUR_MINUTE),
(2, 'IMPORT',             60,  60,  NULL, 'Nhập lô đầu kỳ',                              1, @d0 - INTERVAL 30 DAY + INTERVAL '9:05' HOUR_MINUTE),
(3, 'IMPORT',             45,  45,  NULL, 'Nhập lô đầu kỳ',                              1, @d0 - INTERVAL 30 DAY + INTERVAL '9:10' HOUR_MINUTE),
(4, 'IMPORT',             110, 110, NULL, 'Nhập lô đầu kỳ',                              1, @d0 - INTERVAL 30 DAY + INTERVAL '9:15' HOUR_MINUTE),
(5, 'IMPORT',             30,  30,  NULL, 'Nhập lô đầu kỳ',                              1, @d0 - INTERVAL 30 DAY + INTERVAL '9:20' HOUR_MINUTE),
(6, 'IMPORT',             60,  60,  NULL, 'Nhập lô đầu kỳ',                              1, @d0 - INTERVAL 30 DAY + INTERVAL '9:25' HOUR_MINUTE),
(7, 'IMPORT',             500, 500, NULL, 'Nhập lô đầu kỳ',                              1, @d0 - INTERVAL 30 DAY + INTERVAL '9:30' HOUR_MINUTE),
(8, 'IMPORT',             40,  40,  NULL, 'Nhập lô đầu kỳ',                              1, @d0 - INTERVAL 30 DAY + INTERVAL '9:35' HOUR_MINUTE),
(9, 'IMPORT',             20,  20,  NULL, 'Nhập lô đầu kỳ',                              1, @d0 - INTERVAL 30 DAY + INTERVAL '9:40' HOUR_MINUTE),
(2, 'EXPORT_PRESCRIPTION', 1,  59,  1,    'Xuất thuốc theo đơn của ca 1',                2, @c1 + INTERVAL 47 MINUTE),
(1, 'EXPORT_PRESCRIPTION', 14, 236, 2,    'Xuất thuốc theo đơn của ca 2',                2, @c2 + INTERVAL 122 MINUTE),
(6, 'IMPORT',             20,  80,  NULL, 'Nhập bổ sung Frontline',                      1, @d0 - INTERVAL 8 DAY + INTERVAL '10:00' HOUR_MINUTE),
(1, 'EXPORT_PRESCRIPTION', 10, 226, 3,    'Xuất thuốc theo đơn của ca 4',                2, @c4 + INTERVAL 118 MINUTE),
(5, 'EXPORT_PRESCRIPTION', 1,  29,  3,    'Xuất thuốc theo đơn của ca 4',                2, @c4 + INTERVAL 118 MINUTE),
(8, 'ADJUSTMENT',         -32, 8,   NULL, 'Hết hạn sử dụng, hủy 32 gói',                 1, @d0 - INTERVAL 4 DAY + INTERVAL '16:00' HOUR_MINUTE),
(4, 'EXPORT_PRESCRIPTION', 2,  108, 4,    'Xuất thuốc theo đơn của ca 5',                2, @c5 + INTERVAL 45 MINUTE),
(1, 'ADJUSTMENT',         -6,  220, NULL, 'Hao hụt kiểm kê kho cuối tuần',               1, @d0 - INTERVAL 3 DAY + INTERVAL '17:00' HOUR_MINUTE),
(3, 'EXPORT_PRESCRIPTION', 1,  44,  5,    'Xuất thuốc theo đơn của ca 6',                2, @c6 + INTERVAL 52 MINUTE),
(9, 'ADJUSTMENT',         -20, 0,   NULL, 'Ngừng kinh doanh, thu hồi toàn bộ lô',        1, @d0 - INTERVAL 6 DAY + INTERVAL '11:00' HOUR_MINUTE);

-- invoices (11): 7 PAID (6 đã hoàn tất + 1 chờ phát thuốc), 3 PENDING (chờ thu ngân, trong đó 1 khoản ghi nợ), 1 CANCELLED (ca được mở lại).
-- VAT 0%: final_amount = total_service_amount + total_medicine_amount - discount_amount.
INSERT INTO invoices (id, invoice_code, visit_id, prescription_id, cashier_id, total_service_amount, total_medicine_amount, total_vat_amount,
                      discount_amount, final_amount, payment_status, paid_at, notes, created_at, updated_at) VALUES
(1,  CONCAT('INV-', YEAR(@today), '-00001'), 1,  1,    2,    250000.00, 180000.00, 0.00, 0.00,     430000.00, 'PAID',      @c1 + INTERVAL 47 MINUTE,  NULL,                                               @c1 + INTERVAL 36 MINUTE,  @c1 + INTERVAL 47 MINUTE),
(2,  CONCAT('INV-', YEAR(@today), '-00002'), 2,  2,    2,    630000.00, 210000.00, 0.00, 0.00,     840000.00, 'PAID',      @c2 + INTERVAL 122 MINUTE, NULL,                                               @c2 + INTERVAL 111 MINUTE, @c2 + INTERVAL 122 MINUTE),
(3,  CONCAT('INV-', YEAR(@today), '-00003'), 3,  NULL, 2,    300000.00, 0.00,      0.00, 20000.00, 280000.00, 'PAID',      @c3 + INTERVAL 88 MINUTE,  'Chiết khấu khách hàng thân thiết',                @c3 + INTERVAL 76 MINUTE,  @c3 + INTERVAL 88 MINUTE),
(4,  CONCAT('INV-', YEAR(@today), '-00004'), 4,  3,    2,    530000.00, 270000.00, 0.00, 0.00,     800000.00, 'PAID',      @c4 + INTERVAL 118 MINUTE, NULL,                                               @c4 + INTERVAL 106 MINUTE, @c4 + INTERVAL 118 MINUTE),
(5,  CONCAT('INV-', YEAR(@today), '-00005'), 5,  4,    2,    150000.00, 90000.00,  0.00, 0.00,     240000.00, 'PAID',      @c5 + INTERVAL 45 MINUTE,  NULL,                                               @c5 + INTERVAL 36 MINUTE,  @c5 + INTERVAL 45 MINUTE),
(6,  CONCAT('INV-', YEAR(@today), '-00006'), 6,  5,    2,    250000.00, 190000.00, 0.00, 0.00,     440000.00, 'PAID',      @c6 + INTERVAL 52 MINUTE,  NULL,                                               @c6 + INTERVAL 41 MINUTE,  @c6 + INTERVAL 52 MINUTE),
(7,  CONCAT('INV-', YEAR(@today), '-00007'), 8,  NULL, NULL, 350000.00, 0.00,      0.00, 0.00,     350000.00, 'PENDING',   NULL,                      'Khách bỏ về trước khi thanh toán, ghi nợ',         @c8 + INTERVAL 96 MINUTE,  @c8 + INTERVAL 96 MINUTE),
(8,  CONCAT('INV-', YEAR(@today), '-00008'), 9,  6,    NULL, 530000.00, 175000.00, 0.00, 0.00,     705000.00, 'PENDING',   NULL,                      NULL,                                               @c9 + INTERVAL 96 MINUTE,  @c9 + INTERVAL 96 MINUTE),
(9,  CONCAT('INV-', YEAR(@today), '-00009'), 10, NULL, NULL, 100000.00, 0.00,      0.00, 0.00,     100000.00, 'PENDING',   NULL,                      NULL,                                               @c10 + INTERVAL 31 MINUTE, @c10 + INTERVAL 31 MINUTE),
(10, CONCAT('INV-', YEAR(@today), '-00010'), 11, 7,    2,    150000.00, 30000.00,  0.00, 0.00,     180000.00, 'PAID',      @c11 + INTERVAL 50 MINUTE, NULL,                                               @c11 + INTERVAL 36 MINUTE, @c11 + INTERVAL 50 MINUTE),
(11, CONCAT('INV-', YEAR(@today), '-00011'), 14, NULL, NULL, 100000.00, 90000.00,  0.00, 0.00,     190000.00, 'CANCELLED', NULL,                      'Hủy để mở lại đợt khám: bác sĩ cần bổ sung đơn thuốc', @c14 + INTERVAL 41 MINUTE, @c14 + INTERVAL 50 MINUTE);

-- invoice_items (35): item_type SERVICE -> reference_id = services.id, MEDICINE -> medicines.id; tên và đơn giá là snapshot.
INSERT INTO invoice_items (invoice_id, item_type, reference_id, item_name, quantity, unit_price, vat_rate, vat_amount, subtotal) VALUES
(1,  'SERVICE',  1,  'Khám lâm sàng tổng quát',                   1,  100000.00, 0.00, 0.00, 100000.00),
(1,  'SERVICE',  2,  'Tiêm phòng Vaccine 7 bệnh (Chó)',           1,  150000.00, 0.00, 0.00, 150000.00),
(1,  'MEDICINE', 2,  'Vaccine Vanguard Plus 5/L (7 bệnh)',        1,  180000.00, 0.00, 0.00, 180000.00),
(2,  'SERVICE',  1,  'Khám lâm sàng tổng quát',                   1,  100000.00, 0.00, 0.00, 100000.00),
(2,  'SERVICE',  5,  'Xét nghiệm tổng phân tích tế bào máu (CBC)', 1, 250000.00, 0.00, 0.00, 250000.00),
(2,  'SERVICE',  9,  'Tiêm truyền dịch',                          1,  80000.00,  0.00, 0.00, 80000.00),
(2,  'SERVICE',  6,  'Siêu âm ổ bụng tổng quát',                  1,  200000.00, 0.00, 0.00, 200000.00),
(2,  'MEDICINE', 1,  'Clavamox 250mg',                            14, 15000.00,  0.00, 0.00, 210000.00),
(3,  'SERVICE',  1,  'Khám lâm sàng tổng quát',                   1,  100000.00, 0.00, 0.00, 100000.00),
(3,  'SERVICE',  6,  'Siêu âm ổ bụng tổng quát',                  1,  200000.00, 0.00, 0.00, 200000.00),
(4,  'SERVICE',  1,  'Khám lâm sàng tổng quát',                   1,  100000.00, 0.00, 0.00, 100000.00),
(4,  'SERVICE',  7,  'Chụp X-quang kỹ thuật số (1 tư thế)',       1,  180000.00, 0.00, 0.00, 180000.00),
(4,  'SERVICE',  5,  'Xét nghiệm tổng phân tích tế bào máu (CBC)', 1, 250000.00, 0.00, 0.00, 250000.00),
(4,  'MEDICINE', 1,  'Clavamox 250mg',                            10, 15000.00,  0.00, 0.00, 150000.00),
(4,  'MEDICINE', 5,  'Meloxicam 1.5mg/ml',                        1,  120000.00, 0.00, 0.00, 120000.00),
(5,  'SERVICE',  1,  'Khám lâm sàng tổng quát',                   1,  100000.00, 0.00, 0.00, 100000.00),
(5,  'SERVICE',  4,  'Dịch vụ tẩy giun đường ruột',               1,  50000.00,  0.00, 0.00, 50000.00),
(5,  'MEDICINE', 4,  'Drontal Plus tẩy giun cho chó',             2,  45000.00,  0.00, 0.00, 90000.00),
(6,  'SERVICE',  1,  'Khám lâm sàng tổng quát',                   1,  100000.00, 0.00, 0.00, 100000.00),
(6,  'SERVICE',  3,  'Tiêm phòng Vaccine 4 bệnh (Mèo)',           1,  150000.00, 0.00, 0.00, 150000.00),
(6,  'MEDICINE', 3,  'Vaccine Purevax RCP (Mèo)',                 1,  190000.00, 0.00, 0.00, 190000.00),
(7,  'SERVICE',  1,  'Khám lâm sàng tổng quát',                   1,  100000.00, 0.00, 0.00, 100000.00),
(7,  'SERVICE',  5,  'Xét nghiệm tổng phân tích tế bào máu (CBC)', 1, 250000.00, 0.00, 0.00, 250000.00),
(8,  'SERVICE',  1,  'Khám lâm sàng tổng quát',                   1,  100000.00, 0.00, 0.00, 100000.00),
(8,  'SERVICE',  5,  'Xét nghiệm tổng phân tích tế bào máu (CBC)', 1, 250000.00, 0.00, 0.00, 250000.00),
(8,  'SERVICE',  7,  'Chụp X-quang kỹ thuật số (1 tư thế)',       1,  180000.00, 0.00, 0.00, 180000.00),
(8,  'MEDICINE', 1,  'Clavamox 250mg',                            10, 15000.00,  0.00, 0.00, 150000.00),
(8,  'MEDICINE', 8,  'Oresol bù nước điện giải',                  5,  5000.00,   0.00, 0.00, 25000.00),
(9,  'SERVICE',  1,  'Khám lâm sàng tổng quát',                   1,  100000.00, 0.00, 0.00, 100000.00),
(10, 'SERVICE',  1,  'Khám lâm sàng tổng quát',                   1,  100000.00, 0.00, 0.00, 100000.00),
(10, 'SERVICE',  4,  'Dịch vụ tẩy giun đường ruột',               1,  50000.00,  0.00, 0.00, 50000.00),
(10, 'MEDICINE', 7,  'Vitamin B Complex',                         10, 3000.00,   0.00, 0.00, 30000.00),
(11, 'SERVICE',  1,  'Khám lâm sàng tổng quát',                   1,  100000.00, 0.00, 0.00, 100000.00),
(11, 'MEDICINE', 1,  'Clavamox 250mg',                            6,  15000.00,  0.00, 0.00, 90000.00);

-- Trả session về múi giờ mặc định
SET time_zone = SYSTEM;
