#!/usr/bin/env bash
# Đưa dữ liệu nghiệp vụ về trạng thái sạch (dùng cho kịch bản e2e): chỉ còn tài khoản admin và dữ liệu mẫu GỐC (2 loài, 7 dịch vụ,
# 4 thuốc, 4 chỉ số xét nghiệm kèm khoảng tham chiếu, cấu hình CBC). XÓA CẢ DỮ LIỆU DEMO của schema_init.sql PHẦN 5:
# muốn có lại dữ liệu demo thì chạy `docker compose down -v && docker compose up -d`. Không động tới schema nên không cần `docker compose down -v`.
cd "$(dirname "$0")/.." || exit 1
set -a; source .env; set +a

docker compose exec -T mysql-server sh -c 'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD"' <<'SQL'
-- billing-pharmacy
DELETE FROM pet_clinic_billing_pharmacy_db.inventory_transactions;
DELETE FROM pet_clinic_billing_pharmacy_db.invoice_items;
DELETE FROM pet_clinic_billing_pharmacy_db.invoices;
DELETE FROM pet_clinic_billing_pharmacy_db.prescription_items;
DELETE FROM pet_clinic_billing_pharmacy_db.prescriptions;
DELETE FROM pet_clinic_billing_pharmacy_db.medicines WHERE code NOT IN ('MED_AMOX','MED_VANG_7B','MED_PURE_4B','MED_DRON_DOG');
UPDATE pet_clinic_billing_pharmacy_db.medicines SET is_active = TRUE,
  stock_quantity = CASE code WHEN 'MED_AMOX' THEN 200 WHEN 'MED_VANG_7B' THEN 50 WHEN 'MED_PURE_4B' THEN 40 ELSE 100 END,
  sale_price = CASE code WHEN 'MED_AMOX' THEN 15000 WHEN 'MED_VANG_7B' THEN 180000 WHEN 'MED_PURE_4B' THEN 190000 ELSE 45000 END;
ALTER TABLE pet_clinic_billing_pharmacy_db.invoices AUTO_INCREMENT = 1;
ALTER TABLE pet_clinic_billing_pharmacy_db.prescriptions AUTO_INCREMENT = 1;
ALTER TABLE pet_clinic_billing_pharmacy_db.inventory_transactions AUTO_INCREMENT = 1;
-- clinical
DELETE FROM pet_clinic_clinical_db.imaging_attachments;
DELETE FROM pet_clinic_clinical_db.imaging_results;
DELETE FROM pet_clinic_clinical_db.lab_test_results;
DELETE FROM pet_clinic_clinical_db.visit_service_detail_histories;
DELETE FROM pet_clinic_clinical_db.visit_service_details;
DELETE FROM pet_clinic_clinical_db.pet_visit_status_histories;
DELETE FROM pet_clinic_clinical_db.pet_visits;
DELETE FROM pet_clinic_clinical_db.pets;
DELETE FROM pet_clinic_clinical_db.service_lab_test_items;
DELETE FROM pet_clinic_clinical_db.lab_test_reference_ranges WHERE lab_test_item_id > 4;
DELETE FROM pet_clinic_clinical_db.lab_test_items WHERE id > 4;
DELETE FROM pet_clinic_clinical_db.services WHERE id > 7;
DELETE FROM pet_clinic_clinical_db.species WHERE id > 2;
INSERT INTO pet_clinic_clinical_db.service_lab_test_items (service_id, lab_test_item_id)
  SELECT s.id, l.id FROM pet_clinic_clinical_db.services s JOIN pet_clinic_clinical_db.lab_test_items l
  ON l.code IN ('WBC','RBC','HGB','PLT') WHERE s.code = 'LAB_CBC';
UPDATE pet_clinic_clinical_db.lab_test_reference_ranges SET min_value = 6.00, max_value = 17.00 WHERE lab_test_item_id = 1 AND species_id = 1;
UPDATE pet_clinic_clinical_db.lab_test_reference_ranges SET min_value = 5.50, max_value = 19.50 WHERE lab_test_item_id = 1 AND species_id = 2;
UPDATE pet_clinic_clinical_db.services SET price = 250000.00 WHERE code = 'LAB_CBC';
ALTER TABLE pet_clinic_clinical_db.lab_test_items AUTO_INCREMENT = 5;
ALTER TABLE pet_clinic_clinical_db.services AUTO_INCREMENT = 8;
ALTER TABLE pet_clinic_clinical_db.species AUTO_INCREMENT = 3;
ALTER TABLE pet_clinic_clinical_db.pets AUTO_INCREMENT = 1;
ALTER TABLE pet_clinic_clinical_db.pet_visits AUTO_INCREMENT = 1;
-- appointment + auth
DELETE FROM pet_clinic_appointment_db.appointment_status_histories;
DELETE FROM pet_clinic_appointment_db.appointments;
DELETE FROM pet_clinic_auth_db.refresh_tokens;
DELETE FROM pet_clinic_auth_db.users WHERE id > 1;
ALTER TABLE pet_clinic_auth_db.users AUTO_INCREMENT = 2;
SQL

# Xóa thư mục ảnh CĐHA và nội dung các hàng đợi lỗi (DLQ)
docker compose exec -T clinical-service sh -c 'find /app/uploads/imaging -mindepth 1 -maxdepth 1 ! -name seed -exec rm -rf {} +'
for q in billing-pharmacy-service.visit.closed_to_payment clinical-service.payment.completed appointment-service.visit.checked_in \
         notification-service.appointment.created notification-service.visit.checked_in notification-service.doctor.priority_callback \
         notification-service.visit.closed_to_payment notification-service.payment.completed notification-service.stock.low_alert; do
  docker compose exec -T api-gateway sh -c "curl -s -o /dev/null -u '$RABBITMQ_USERNAME:$RABBITMQ_PASSWORD' -X DELETE http://rabbitmq-broker:15672/api/queues/%2F/$q.dlq/contents"
done
echo "Đã đưa dữ liệu về trạng thái sạch (chỉ còn tài khoản admin)."
