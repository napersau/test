#!/usr/bin/env bash
# Kiểm thử end-to-end clinical-service qua API Gateway (toàn hành trình + ngoại lệ + đồng thời), tự đối chiếu PASS/FAIL
export PYTHONIOENCODING=utf-8
cd "$(dirname "$0")/.." || exit 1
set -a; source .env; set +a

G=http://localhost:8080
J='Content-Type: application/json'
SCR="$(pwd -W 2>/dev/null || pwd)/e2e/.tmp"
mkdir -p "$SCR"; TMP="$SCR/cl"; mkdir -p "$TMP"
TODAY=$(date +%F); TOMORROW=$(date -d "+1 day" +%F)

PASS=0; FAIL=0
check() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"; else FAIL=$((FAIL+1)); echo "  [FAIL] $1 -> mong doi '$2', nhan '$3'"; fi; }
jget() { python -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1"; }
post() { if [ -n "$3" ]; then curl -s -X POST "$G$1" -H "$J" -H "Authorization: Bearer $3" -d "$2"; else curl -s -X POST "$G$1" -H "$J" -d "$2"; fi; }
put() { curl -s -X PUT "$G$1" -H "$J" -H "Authorization: Bearer $3" -d "$2"; }
getauth() { curl -s "$G$1" -H "Authorization: Bearer $2"; }
sql() { docker compose exec -T mysql-server sh -c 'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" -N' <<< "$1" 2>/dev/null; }
login() { post /api/v1/auth/login "{\"username\":\"$1\",\"password\":\"$2\"}" | jget "['data']['accessToken']"; }
code() { jget ".get('errorCode')"; }

V=/api/v1/clinical/pet-visits
mkuser() { post /api/v1/auth/users "$1" "$ADMIN" | jget "['data']['id']"; }
mkpet() { post /api/v1/pets "{\"ownerId\":$2,\"speciesId\":${3:-1},\"name\":\"$4\"}" "$1" | jget "['data']['id']"; }
checkin() { post $V/check-in "{\"petId\":$1,\"emergency\":${2:-false},\"initialSymptoms\":\"Bo an\"}" "$REC" | jget "['data']['id']"; }
assign() { post $V/$1/assign "{\"doctorId\":$2}" "$REC"; }
startexam() { post $V/$1/start-exam '{"weightAtVisit":12.5,"temperature":38.6,"clinicalNotes":"Tinh tao"}' "$2"; }
vstatus() { getauth $V/$1 "$REC" | jget "['data']['status']"; }
detail_id() { getauth $V/$1 "$REC" | python -c "import sys,json; d=json.load(sys.stdin)['data']['services']; print([s for s in d if s['serviceCode']=='$2'][0]['id'])"; }
detail_field() { getauth $V/$1 "$REC" | python -c "import sys,json; d=json.load(sys.stdin)['data']['services']; print([s for s in d if s['serviceCode']=='$2'][0]['$3'])"; }
order() { # visit token codes...
  local visit=$1 tok=$2; shift 2; local items=""
  for c in "$@"; do items="$items{\"serviceId\":$(sid $c),\"quantity\":1},"; done
  post $V/$visit/services "{\"services\":[${items%,}]}" "$tok"
}
sid() { eval "echo \$SID_$1"; }
labres() { post /api/v1/clinical/service-details/$1/lab-results "$2" "$LAB"; }
img_upload() { # detailId file [description]
  curl -s -X POST "$G/api/v1/clinical/service-details/$1/imaging-result" -H "Authorization: Bearer $IMG" \
    -F "description=${3:-Hinh anh binh thuong}" -F "conclusion=Khong thay ton thuong" -F "files=@$2;type=${4:-image/jpeg}"
}
rabbit_publish() { # routing_key payload_json
  python - "$1" "$2" <<'PYE' | docker compose exec -T api-gateway sh -c "curl -s -u '$RABBITMQ_USERNAME:$RABBITMQ_PASSWORD' -H 'content-type: application/json' -X POST http://rabbitmq-broker:15672/api/exchanges/%2F/clinic.events/publish --data-binary @-"
import json, sys
print(json.dumps({"properties": {"content_type": "application/json"}, "routing_key": sys.argv[1], "payload": sys.argv[2], "payload_encoding": "string"}))
PYE
}
wait_status() { # visitId expected maxSeconds
  for i in $(seq 1 $(( ${3:-10} * 2 ))); do [ "$(vstatus $1)" = "$2" ] && return 0; sleep 0.5; done; return 1
}

echo "== Don du lieu thu nghiem cu =="
sql "DELETE FROM pet_clinic_clinical_db.imaging_attachments; DELETE FROM pet_clinic_clinical_db.imaging_results; DELETE FROM pet_clinic_clinical_db.lab_test_results; DELETE FROM pet_clinic_clinical_db.visit_service_detail_histories; DELETE FROM pet_clinic_clinical_db.visit_service_details; DELETE FROM pet_clinic_clinical_db.pet_visit_status_histories; DELETE FROM pet_clinic_clinical_db.pet_visits; DELETE FROM pet_clinic_clinical_db.pets; DELETE FROM pet_clinic_appointment_db.appointment_status_histories; DELETE FROM pet_clinic_appointment_db.appointments; DELETE FROM pet_clinic_auth_db.refresh_tokens; DELETE FROM pet_clinic_auth_db.users WHERE id > 1; ALTER TABLE pet_clinic_clinical_db.pets AUTO_INCREMENT = 1; ALTER TABLE pet_clinic_clinical_db.pet_visits AUTO_INCREMENT = 1; ALTER TABLE pet_clinic_auth_db.users AUTO_INCREMENT = 2; UPDATE pet_clinic_clinical_db.services SET price = 250000.00 WHERE code='LAB_CBC';"
for q in appointment-service.visit.checked_in.dlq clinical-service.payment.completed.dlq; do
  docker compose exec -T api-gateway sh -c "curl -s -o /dev/null -u '$RABBITMQ_USERNAME:$RABBITMQ_PASSWORD' -X DELETE http://rabbitmq-broker:15672/api/queues/%2F/$q/contents"; done

docker compose exec -T clinical-service sh -c 'rm -rf /app/uploads/imaging/*'
ADMIN=$(login admin 'Admin@123')
echo "== Chuan bi tai khoan =="
mkuser '{"username":"letan1","password":"LeTan@123","fullName":"Le Tan 1","phoneNumber":"0933333333","roleCode":"RECEPTIONIST"}' >/dev/null
DA=$(mkuser '{"username":"bs.a","password":"BacSi@123","fullName":"BS A","phoneNumber":"0911111111","roomNumber":"P01","roleCode":"VETERINARIAN"}')
DB=$(mkuser '{"username":"bs.b","password":"BacSi@123","fullName":"BS B","phoneNumber":"0922222222","roomNumber":"P02","roleCode":"VETERINARIAN"}')
mkuser '{"username":"kt.lab","password":"KyThuat@1","fullName":"KTV Lab","phoneNumber":"0955555551","roomNumber":"LAB01","roleCode":"LAB_TECHNICIAN"}' >/dev/null
mkuser '{"username":"kt.cdha","password":"KyThuat@1","fullName":"KTV CDHA","phoneNumber":"0955555552","roomNumber":"XQ01","roleCode":"IMAGING_TECHNICIAN"}' >/dev/null
REC=$(login letan1 'LeTan@123'); TA=$(login bs.a 'BacSi@123'); TB=$(login bs.b 'BacSi@123'); LAB=$(login kt.lab 'KyThuat@1'); IMG=$(login kt.cdha 'KyThuat@1')
O1=$(post /api/v1/auth/users '{"password":"ChuNuoi@1","fullName":"Chu Nuoi 1","phoneNumber":"0944444441","roleCode":"PET_OWNER"}' "$REC" | jget "['data']['id']")
O2=$(post /api/v1/auth/users '{"password":"ChuNuoi@1","fullName":"Chu Nuoi 2","phoneNumber":"0944444442","roleCode":"PET_OWNER"}' "$REC" | jget "['data']['id']")
T1=$(login 0944444441 'ChuNuoi@1'); T2=$(login 0944444442 'ChuNuoi@1')
RECID=$(sql "SELECT id FROM pet_clinic_auth_db.users WHERE username='letan1'")
SVCS=$(getauth /api/v1/clinical/services "$REC")
for c in EXAM_GEN VAC_7B LAB_CBC IMG_US_AB IMG_XRAY DEWORM; do
  eval "SID_$c=$(echo "$SVCS" | python -c "import sys,json; print([s['id'] for s in json.load(sys.stdin)['data'] if s['code']=='$c'][0])")"
done
echo "   bac si: $DA $DB | chu nuoi: $O1 $O2 | dich vu: CBC=$SID_LAB_CBC US=$SID_IMG_US_AB"
# Ảnh thật (chữ ký JPEG / PNG) và tệp giả mạo để thử tải ảnh
python - <<PYE
open("$TMP/ok.jpg","wb").write(bytes([0xFF,0xD8,0xFF,0xE0,0,0x10])+b"JFIF\x00"+b"\x01"*64+bytes([0xFF,0xD9]))
open("$TMP/ok.png","wb").write(bytes([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A])+b"\x00"*64)
open("$TMP/fake.jpg","wb").write(b"<script>alert(1)</script> day khong phai anh")
PYE

echo; echo "== A. DANH MUC VA HO SO THU CUNG =="
check "loai thu cung co DOG, CAT" "2" "$(getauth /api/v1/species "$T1" | jget "['data'].__len__()")"
check "danh muc dich vu chi gom dich vu dang dung" "True" "$(echo "$SVCS" | python -c "import sys,json; print(all(s['active'] for s in json.load(sys.stdin)['data']))")"
check "xet nghiem co khoang tham chieu cua ca Cho va Meo" "2" "$(getauth /api/v1/clinical/lab-test-items "$TA" | jget "['data'][0]['ranges'].__len__()")"
R=$(post /api/v1/pets '{"ownerId":999,"speciesId":1,"name":"Lu","breed":"Poodle","gender":"MALE","weight":5.5,"neutered":true}' "$T1")
PET1=$(echo "$R" | jget "['data']['id']")
check "chu nuoi them thu cung -> 201" "201" "$(echo "$R" | jget "['status']")"
check "ownerId lay tu token, khong tin body" "$O1" "$(echo "$R" | jget "['data']['ownerId']")"
check "ma ho so PET-yyyy-NNNNN" "1" "$(echo "$R" | jget "['data']['petCode']" | grep -c -E '^PET-[0-9]{4}-[0-9]{5}$')"
check "le tan them ho so ho -> 201" "201" "$(post /api/v1/pets "{\"ownerId\":$O2,\"speciesId\":2,\"name\":\"Mimi\"}" "$REC" | jget "['status']")"
check "le tan khong gui ownerId -> SYS_1001" "SYS_1001" "$(post /api/v1/pets '{"speciesId":1,"name":"X"}' "$REC" | code)"
check "ownerId la bac si -> SYS_1001" "SYS_1001" "$(post /api/v1/pets "{\"ownerId\":$DA,\"speciesId\":1,\"name\":\"X\"}" "$REC" | code)"
check "loai khong ton tai -> CLIN_1315" "CLIN_1315" "$(post /api/v1/pets '{"speciesId":999,"name":"X"}' "$T1" | code)"
check "can nang bang 0 -> SYS_1001" "SYS_1001" "$(post /api/v1/pets '{"speciesId":1,"name":"X","weight":0}' "$T1" | code)"
check "ngay sinh o tuong lai -> SYS_1001" "SYS_1001" "$(post /api/v1/pets "{\"speciesId\":1,\"name\":\"X\",\"dateOfBirth\":\"$TOMORROW\"}" "$T1" | code)"
check "chu nuoi 2 khong xem duoc thu cung cua chu nuoi 1 -> APPT_1201" "APPT_1201" "$(getauth /api/v1/pets/$PET1 "$T2" | code)"
check "chu nuoi 2 chi thay thu cung cua minh" "1" "$(getauth /api/v1/pets "$T2" | jget "['data']['totalElements']")"
check "chu nuoi 2 khong sua duoc thu cung nguoi khac -> APPT_1201" "APPT_1201" "$(put /api/v1/pets/$PET1 '{"name":"Hack"}' "$T2" | code)"
check "chu nuoi 1 cap nhat ten + gioi tinh" "Lu Lu" "$(put /api/v1/pets/$PET1 '{"name":" Lu Lu ","gender":"FEMALE"}' "$T1" | jget "['data']['name']")"
check "khong doi duoc loai (truong speciesId bi bo qua)" "Chó" "$(put /api/v1/pets/$PET1 '{"speciesId":2}' "$T1" | jget "['data']['speciesName']")"
check "tim theo tu khoa" "1" "$(getauth "/api/v1/pets?keyword=lu%20lu" "$REC" | jget "['data']['totalElements']")"
check "tim voi ky tu % khong thanh ky tu dai dien" "0" "$(getauth "/api/v1/pets?keyword=%25" "$REC" | jget "['data']['totalElements']")"
check "thuoc tinh sai kieu (ownerId=abc) -> SYS_1001 chu khong phai 500" "SYS_1001" "$(getauth "/api/v1/pets?ownerId=abc" "$REC" | code)"
check "endpoint noi bo tra ve thu cung (trong mang Docker)" "$O1" "$(docker compose exec -T api-gateway curl -s http://clinical-service:8083/internal/clinical/pets/$PET1 | jget "['data']['ownerId']")"
check "thu cung khong ton tai (noi bo) -> APPT_1201" "APPT_1201" "$(docker compose exec -T api-gateway curl -s http://clinical-service:8083/internal/clinical/pets/99999 | code)"
check "Admin them loai trung ma -> CLIN_1318" "CLIN_1318" "$(post /api/v1/species '{"code":"dog","name":"Cho 2"}' "$ADMIN" | code)"
check "Admin them dich vu moi -> 201" "201" "$(post /api/v1/clinical/services "{\"code\":\"SPA$RANDOM\",\"name\":\"Tam spa\",\"category\":\"PROCEDURE\",\"price\":120000}" "$ADMIN" | jget "['status']")"
check "Le tan khong them duoc dich vu -> 403" "SYS_1003" "$(post /api/v1/clinical/services '{"code":"X","name":"X","category":"PROCEDURE","price":1}' "$REC" | code)"
check "dich vu gia am -> SYS_1001" "SYS_1001" "$(post /api/v1/clinical/services '{"code":"NEG","name":"X","category":"PROCEDURE","price":-5}' "$ADMIN" | code)"

echo; echo "== B. DAT LICH KIEM TRA THU CUNG (verify-pet bat) =="
D1=$(date -d "+1 day" +%F)
check "dat lich bang thu cung cua nguoi khac -> APPT_1201" "APPT_1201" "$(post /api/v1/appointments "{\"petId\":$PET1,\"appointmentDate\":\"$D1\",\"startTime\":\"09:00\",\"reason\":\"Kham\"}" "$T2" | code)"
check "dat lich bang thu cung khong ton tai -> APPT_1201" "APPT_1201" "$(post /api/v1/appointments "{\"petId\":999999,\"appointmentDate\":\"$D1\",\"startTime\":\"09:00\",\"reason\":\"Kham\"}" "$T1" | code)"
R=$(post /api/v1/appointments "{\"petId\":$PET1,\"appointmentDate\":\"$D1\",\"startTime\":\"09:00\",\"reason\":\"Kham\"}" "$T1")
check "dat lich bang thu cung cua minh -> 201" "201" "$(echo "$R" | jget "['status']")"
APT_TOMORROW=$(echo "$R" | jget "['data']['id']")
post /api/v1/appointments/$APT_TOMORROW/confirm '{}' "$REC" >/dev/null

echo; echo "== C. TIEP NHAN (UC-19) VA HANG DOI (UC-20) =="
PA=$(mkpet "$REC" $O1 1 "Thu A"); PB=$(mkpet "$REC" $O1 1 "Thu B"); PC=$(mkpet "$REC" $O1 1 "Thu C cap cuu")
R=$(post $V/check-in "{\"petId\":$PA,\"initialSymptoms\":\"Bo an\"}" "$REC"); VA=$(echo "$R" | jget "['data']['id']")
check "tiep nhan khach vang lai -> 201 WAITING" "WAITING" "$(echo "$R" | jget "['data']['status']")"
check "ma dot kham VIS-yyyy-NNNNN" "1" "$(echo "$R" | jget "['data']['visitCode']" | grep -c -E '^VIS-[0-9]{4}-[0-9]{5}$')"
check "tiep nhan lai thu cung dang kham -> CLIN_1306" "CLIN_1306" "$(post $V/check-in "{\"petId\":$PA}" "$REC" | code)"
check "chu nuoi khong duoc tiep nhan -> 403" "SYS_1003" "$(post $V/check-in "{\"petId\":$PA}" "$T1" | code)"
check "thieu thu cung va lich hen -> SYS_1001" "SYS_1001" "$(post $V/check-in '{}' "$REC" | code)"
check "thu cung khong ton tai -> APPT_1201" "APPT_1201" "$(post $V/check-in '{"petId":999999}' "$REC" | code)"
check "lich hen NGAY MAI (da xac nhan) -> CLIN_1307" "CLIN_1307" "$(post $V/check-in "{\"appointmentId\":$APT_TOMORROW}" "$REC" | code)"
check "lich hen khong ton tai -> APPT_1202" "APPT_1202" "$(post $V/check-in '{"appointmentId":999999}' "$REC" | code)"
sql "INSERT INTO pet_clinic_appointment_db.appointments (appointment_code, pet_id, owner_id, appointment_date, start_time, end_time, reason, booking_channel, status) VALUES ('APT-E2E-TODAY', $PB, $O1, '$TODAY', '09:00:00', '09:30:00', 'Kham dinh ky', 'PHONE', 'CONFIRMED'), ('APT-E2E-PEND', $PC, $O1, '$TODAY', '09:00:00', '09:30:00', 'Chua duyet', 'ONLINE', 'PENDING');"
APT_TODAY=$(sql "SELECT id FROM pet_clinic_appointment_db.appointments WHERE appointment_code='APT-E2E-TODAY'")
APT_PEND=$(sql "SELECT id FROM pet_clinic_appointment_db.appointments WHERE appointment_code='APT-E2E-PEND'")
check "lich hen chua duoc duyet (PENDING) -> CLIN_1307" "CLIN_1307" "$(post $V/check-in "{\"appointmentId\":$APT_PEND}" "$REC" | code)"
check "lich hen cua thu cung khac -> SYS_1001" "SYS_1001" "$(post $V/check-in "{\"appointmentId\":$APT_TODAY,\"petId\":$PA}" "$REC" | code)"
R=$(post $V/check-in "{\"appointmentId\":$APT_TODAY}" "$REC"); VB=$(echo "$R" | jget "['data']['id']")
check "tiep nhan khach co hen (chi gui appointmentId) -> 201" "201" "$(echo "$R" | jget "['status']")"
check "lay thu cung tu lich hen" "$PB" "$(echo "$R" | jget "['data']['petId']")"
check "trieu chung lay tu ly do dat lich" "Kham dinh ky" "$(echo "$R" | jget "['data']['initialSymptoms']")"
echo "   cho appointment-service nhan VisitCheckedInEvent..."
for i in $(seq 1 20); do [ "$(getauth /api/v1/appointments/$APT_TODAY "$REC" | jget "['data']['status']")" = "CHECKED_IN" ] && break; sleep 0.5; done
check "DONG VONG: lich hen CONFIRMED -> CHECKED_IN qua RabbitMQ" "CHECKED_IN" "$(getauth /api/v1/appointments/$APT_TODAY "$REC" | jget "['data']['status']")"
check "lich su lich hen ghi ma dot kham va nguoi tiep nhan" "1" "$(getauth /api/v1/appointments/$APT_TODAY/history "$REC" | jget "['data'][-1]['notes']" | grep -c 'VIS-')"
check "tiep nhan lai cung lich hen -> CLIN_1306" "CLIN_1306" "$(post $V/check-in "{\"appointmentId\":$APT_TODAY}" "$REC" | code)"
VC=$(post $V/check-in "{\"petId\":$PC,\"emergency\":true,\"initialSymptoms\":\"Co giat\"}" "$REC" | jget "['data']['id']")
check "hang doi: ca cap cuu len dau, con lai theo thu tu check-in" "$VC $VA $VB" "$(getauth $V/queue "$REC" | python -c "import sys,json; print(' '.join(str(v['id']) for v in json.load(sys.stdin)['data']))")"
check "bac si xem duoc hang doi, chu nuoi khong -> 403" "SYS_1003" "$(getauth $V/queue "$T1" | code)"

echo; echo "== D. PHAN CONG BAC SI (UC-21) VA KHOA UU TIEN =="
check "bang dieu phoi: ca 2 bac si deu AVAILABLE" "AVAILABLE AVAILABLE" "$(getauth /api/v1/clinical/doctors/status "$REC" | python -c "import sys,json; print(' '.join(d['status'] for d in json.load(sys.stdin)['data']))")"
R=$(assign $VA $DA)
check "phan cong ca A cho BS A -> phong P01" "P01" "$(echo "$R" | jget "['data']['assignedRoom']")"
check "ca van la WAITING sau khi phan cong" "WAITING" "$(echo "$R" | jget "['data']['status']")"
check "BS A gio la BUSY (da duoc giao ca cho)" "BUSY" "$(getauth /api/v1/clinical/doctors/status "$REC" | python -c "import sys,json; print([d['status'] for d in json.load(sys.stdin)['data'] if d['doctorId']==$DA][0])")"
check "giao them ca cho BS A dang ban -> CLIN_1302" "CLIN_1302" "$(assign $VB $DA | code)"
check "giao ca cho nguoi khong phai bac si -> CLIN_1316" "CLIN_1316" "$(assign $VB $O1 | code)"
check "giao lai cung bac si -> SYS_1001" "SYS_1001" "$(assign $VA $DA | code)"
check "bac si khong duoc phan cong ca -> 403" "SYS_1003" "$(post $V/$VB/assign "{\"doctorId\":$DB}" "$TA" | code)"

# Đồng thời: 4 ca chờ cùng được giao cho BS B bởi 4 request song song -> chỉ 1 thành công
XP=(); XV=()
for i in 1 2 3 4; do p=$(mkpet "$REC" $O2 1 "Dong thoi $i"); XP+=($p); XV+=($(checkin $p)); done
rm -f "$TMP"/as_*.txt
for v in "${XV[@]}"; do ( assign $v $DB | python -c "import sys,json; d=json.load(sys.stdin); print(d['status'], d.get('errorCode') or '')" > "$TMP/as_$v.txt" ) & done
wait
echo "   4 yeu cau phan cong song song cung mot bac si:"; cat "$TMP"/as_*.txt | sort | uniq -c | sed 's/^/     /'
check "dung 1 phan cong thanh cong, 3 bi CLIN_1302" "1 3" "$(cat "$TMP"/as_*.txt | grep -c '^200') $(cat "$TMP"/as_*.txt | grep -c 'CLIN_1302')"
check "DB: BS B chi duoc giao dung 1 ca dang cho" "1" "$(sql "SELECT COUNT(*) FROM pet_clinic_clinical_db.pet_visits WHERE doctor_id=$DB AND status='WAITING'")"
for v in "${XV[@]}"; do post $V/$v/cancel '{"reason":"Don dep sau thu nghiem dong thoi"}' "$REC" >/dev/null; done
check "sau khi huy cac ca thu, BS B ranh tro lai" "AVAILABLE" "$(getauth /api/v1/clinical/doctors/status "$REC" | python -c "import sys,json; print([d['status'] for d in json.load(sys.stdin)['data'] if d['doctorId']==$DB][0])")"
check "huy khong co ly do -> SYS_1001" "SYS_1001" "$(post $V/${XV[0]}/cancel '{}' "$REC" | code)"
check "huy ca da huy -> CLIN_1305" "CLIN_1305" "$(post $V/${XV[0]}/cancel '{"reason":"x"}' "$REC" | code)"

echo; echo "== E. KHAM GIAI DOAN 1 (UC-22, UC-23) =="
check "BS B khong bat dau duoc ca giao cho BS A -> CLIN_1308" "CLIN_1308" "$(startexam $VA $TB | code)"
check "can nang bang 0 -> SYS_1001" "SYS_1001" "$(post $V/$VA/start-exam '{"weightAtVisit":0,"temperature":38}' "$TA" | code)"
check "than nhiet 50 do -> SYS_1001" "SYS_1001" "$(post $V/$VA/start-exam '{"weightAtVisit":10,"temperature":50}' "$TA" | code)"
R=$(startexam $VA $TA)
check "BS A bat dau kham -> IN_PROGRESS" "IN_PROGRESS" "$(echo "$R" | jget "['data']['status']")"
check "ghi nhan can nang + than nhiet do bac si do" "12.5 38.6" "$(echo "$R" | jget "['data']['weightAtVisit']") $(echo "$R" | jget "['data']['temperature']")"
check "tu dong them phi kham EXAM_GEN da hoan tat" "COMPLETED" "$(detail_field $VA EXAM_GEN status)"
check "bat dau kham lan 2 -> CLIN_1305" "CLIN_1305" "$(startexam $VA $TA | code)"
check "chua dat chi dinh thi bac si van BUSY" "BUSY" "$(getauth /api/v1/clinical/doctors/status "$REC" | python -c "import sys,json; print([d['status'] for d in json.load(sys.stdin)['data'] if d['doctorId']==$DA][0])")"
check "chi dinh dich vu khong ton tai -> CLIN_1309" "CLIN_1309" "$(post $V/$VA/services '{"services":[{"serviceId":99999,"quantity":1}]}' "$TA" | code)"
check "chi dinh rong -> SYS_1001" "SYS_1001" "$(post $V/$VA/services '{"services":[]}' "$TA" | code)"
check "BS khac khong chi dinh duoc -> CLIN_1308" "CLIN_1308" "$(order $VA "$TB" LAB_CBC | code)"
R=$(order $VA "$TA" LAB_CBC IMG_US_AB VAC_7B)
check "chi dinh Lab + CDHA + tiem phong -> WAITING_RESULTS" "WAITING_RESULTS" "$(echo "$R" | jget "['data']['status']")"
check "xet nghiem cho thuc hien (PENDING)" "PENDING" "$(detail_field $VA LAB_CBC status)"
check "tiem phong lam tai phong kham nen COMPLETED ngay" "COMPLETED" "$(detail_field $VA VAC_7B status)"
check "snapshot don gia CBC = 250000" "250000.0" "$(detail_field $VA LAB_CBC unitPrice)"
check "DON GIAI PHONG: BS A ranh ngay sau khi chi dinh CLS" "AVAILABLE" "$(getauth /api/v1/clinical/doctors/status "$REC" | python -c "import sys,json; print([d['status'] for d in json.load(sys.stdin)['data'] if d['doctorId']==$DA][0])")"
put /api/v1/clinical/services/$SID_LAB_CBC '{"price":300000}' "$ADMIN" >/dev/null
check "Admin doi gia CBC, don gia da chot cua ca dang kham KHONG doi (BR-25)" "250000.0" "$(detail_field $VA LAB_CBC unitPrice)"
check "chi dinh them dich vu cho ca khong IN_PROGRESS -> CLIN_1305" "CLIN_1305" "$(order $VA "$TA" DEWORM | code)"
check "BS A nhan duoc ca moi ngay (B) vi da duoc giai phong" "200" "$(assign $VB $DA | jget "['status']")"

echo; echo "== F. HANG DOI CAN LAM SANG (UC-25, UC-26, EX-06..EX-09) =="
# ca cap cuu C: phan cong BS B, kham, chi dinh CBC -> phai len dau hang doi Lab
assign $VC $DB >/dev/null; startexam $VC $TB >/dev/null; order $VC "$TB" LAB_CBC >/dev/null
LAB_A=$(detail_id $VA LAB_CBC); IMG_A=$(detail_id $VA IMG_US_AB); LAB_C=$(detail_id $VC LAB_CBC)
check "hang doi Lab: ca cap cuu len dau" "$LAB_C $LAB_A" "$(getauth /api/v1/clinical/lab-queue "$LAB" | python -c "import sys,json; print(' '.join(str(i['serviceDetailId']) for i in json.load(sys.stdin)['data']))")"
check "hang doi CDHA chi co chi dinh sieu am" "$IMG_A" "$(getauth /api/v1/clinical/imaging-queue "$IMG" | python -c "import sys,json; print(' '.join(str(i['serviceDetailId']) for i in json.load(sys.stdin)['data']))")"
check "chu nuoi khong xem duoc hang doi -> 403" "SYS_1003" "$(getauth /api/v1/clinical/lab-queue "$T1" | code)"
check "KTV CDHA khong bat dau duoc chi dinh cua phong Lab -> 403" "SYS_1003" "$(post /api/v1/clinical/service-details/$LAB_A/start '{}' "$IMG" | code)"
check "KTV Lab bat dau lay mau -> IN_PROGRESS" "IN_PROGRESS" "$(post /api/v1/clinical/service-details/$LAB_A/start '{}' "$LAB" | jget "['data']['status']")"
check "bat dau lan 2 -> CLIN_1311" "CLIN_1311" "$(post /api/v1/clinical/service-details/$LAB_A/start '{}' "$LAB" | code)"
check "ca dang thuc hien len dau hang doi Lab" "IN_PROGRESS" "$(getauth /api/v1/clinical/lab-queue "$LAB" | jget "['data'][0]['queueState']")"
check "huy hieu lien phong: CDHA thay 'dang lay mau o phong Lab'" "LAB_IN_PROGRESS" "$(getauth /api/v1/clinical/imaging-queue "$IMG" | jget "['data'][0]['otherRoomStatus']")"
check "CDHA tam hoan do thu cung dang o phong Lab (EX-09)" "200" "$(post /api/v1/clinical/service-details/$IMG_A/postpone '{"reason":"Dang lay mau"}' "$IMG" | jget "['status']")"
check "chi dinh van PENDING, sang tab tam hoan" "PENDING POSTPONED" "$(getauth /api/v1/clinical/imaging-queue "$IMG" | python -c "import sys,json; i=json.load(sys.stdin)['data'][0]; print(i['status'], i['queueState'])")"
check "dang tam hoan thi khong bat dau duoc -> CLIN_1311" "CLIN_1311" "$(post /api/v1/clinical/service-details/$IMG_A/start '{}' "$IMG" | code)"
check "tam hoan lan 2 -> CLIN_1311" "CLIN_1311" "$(post /api/v1/clinical/service-details/$IMG_A/postpone '{}' "$IMG" | code)"
post /api/v1/clinical/service-details/$IMG_A/recall '{}' "$IMG" >/dev/null
check "khach quay lai: ghim 'uu tien ke tiep' (EX-07)" "NEXT_IN_LINE" "$(getauth /api/v1/clinical/imaging-queue "$IMG" | jget "['data'][0]['queueState']")"
check "goi lai khi khong tam hoan -> CLIN_1311" "CLIN_1311" "$(post /api/v1/clinical/service-details/$IMG_A/recall '{}' "$IMG" | code)"

echo; echo "== G. KET QUA XET NGHIEM THEO LOAI (BR-23, BR-24) =="
WBC=1; PLT=4
check "nhap ket qua khi chua bat dau (chi dinh khac) -> CLIN_1311" "CLIN_1311" "$(labres $LAB_C "{\"items\":[{\"labTestItemId\":$WBC,\"value\":10}]}" | code)"
check "chi so khong ton tai -> CLIN_1317" "CLIN_1317" "$(labres $LAB_A '{"items":[{"labTestItemId":99999,"value":10}]}' | code)"
check "nhap trung mot chi so -> SYS_1001" "SYS_1001" "$(labres $LAB_A "{\"items\":[{\"labTestItemId\":$WBC,\"value\":1},{\"labTestItemId\":$WBC,\"value\":2}]}" | code)"
check "danh sach chi so rong -> SYS_1001" "SYS_1001" "$(labres $LAB_A '{"items":[]}' | code)"
check "gia tri am -> SYS_1001" "SYS_1001" "$(labres $LAB_A "{\"items\":[{\"labTestItemId\":$WBC,\"value\":-1}]}" | code)"
check "KTV CDHA khong nhap duoc ket qua Lab -> 403" "SYS_1003" "$(post /api/v1/clinical/service-details/$LAB_A/lab-results "{\"items\":[{\"labTestItemId\":$WBC,\"value\":10}]}" "$IMG" | code)"
R=$(labres $LAB_A "{\"items\":[{\"labTestItemId\":$WBC,\"value\":21.00},{\"labTestItemId\":$PLT,\"value\":150.00,\"notes\":\"Tieu cau thap\"}]}")
check "luu ket qua xet nghiem -> chi dinh COMPLETED" "COMPLETED" "$(echo "$R" | jget "['data']['status']")"
LABS=$(getauth $V/$VA "$REC")
check "Cho: WBC 21 > 17 -> HIGH" "HIGH" "$(echo "$LABS" | python -c "import sys,json; print([l['evaluation'] for l in json.load(sys.stdin)['data']['labResults'] if l['code']=='WBC'][0])")"
check "Cho: PLT 150 < 200 -> LOW" "LOW" "$(echo "$LABS" | python -c "import sys,json; print([l['evaluation'] for l in json.load(sys.stdin)['data']['labResults'] if l['code']=='PLT'][0])")"
check "snapshot khoang tham chieu cua loai Cho (6.00 - 17.00)" "6.0 17.0" "$(echo "$LABS" | python -c "import sys,json; l=[l for l in json.load(sys.stdin)['data']['labResults'] if l['code']=='WBC'][0]; print(l['minValue'], l['maxValue'])")"
check "DB: snapshot luu dung 6.00 / 17.00" "6.00 17.00" "$(sql "SELECT CONCAT(min_value_snapshot,' ',max_value_snapshot) FROM pet_clinic_clinical_db.lab_test_results r JOIN pet_clinic_clinical_db.lab_test_items i ON i.id=r.lab_test_item_id WHERE i.code='WBC' LIMIT 1")"
check "con chi dinh sieu am nen ca van WAITING_RESULTS" "WAITING_RESULTS" "$(vstatus $VA)"
check "ket qua nhap xong khong sua lai duoc -> CLIN_1311" "CLIN_1311" "$(labres $LAB_A "{\"items\":[{\"labTestItemId\":$WBC,\"value\":10}]}" | code)"

echo; echo "== H. KET QUA CHAN DOAN HINH ANH + TAI ANH (UC-26) =="
check "bat dau sieu am -> IN_PROGRESS" "IN_PROGRESS" "$(post /api/v1/clinical/service-details/$IMG_A/start '{}' "$IMG" | jget "['data']['status']")"
check "khong dinh kem anh -> CLIN_1314" "CLIN_1314" "$(curl -s -X POST "$G/api/v1/clinical/service-details/$IMG_A/imaging-result" -H "Authorization: Bearer $IMG" -F "description=Mo ta" -F "conclusion=Ket luan" | code)"
check "tep gia mao (noi dung van ban, khai bao image/jpeg) -> CLIN_1314" "CLIN_1314" "$(img_upload $IMG_A "$TMP/fake.jpg" | code)"
check "loai tep khong cho phep -> CLIN_1314" "CLIN_1314" "$(img_upload $IMG_A "$TMP/ok.jpg" "Mo ta" "application/pdf" | code)"
check "thieu mo ta -> SYS_1001" "SYS_1001" "$(curl -s -X POST "$G/api/v1/clinical/service-details/$IMG_A/imaging-result" -H "Authorization: Bearer $IMG" -F "conclusion=KL" -F "files=@$TMP/ok.jpg;type=image/jpeg" | code)"
check "bac si khong tai duoc ket qua CDHA -> 403" "SYS_1003" "$(curl -s -X POST "$G/api/v1/clinical/service-details/$IMG_A/imaging-result" -H "Authorization: Bearer $TA" -F "description=a" -F "conclusion=b" -F "files=@$TMP/ok.jpg;type=image/jpeg" | code)"
check "chua co tep nao duoc luu sau cac lan that bai" "0" "$(docker compose exec -T clinical-service sh -c 'find /app/uploads/imaging -type f 2>/dev/null | wc -l' | tr -d '[:space:]')"
R=$(curl -s -X POST "$G/api/v1/clinical/service-details/$IMG_A/imaging-result" -H "Authorization: Bearer $IMG" -F "description=Gan to nhe" -F "conclusion=Nghi viem gan" -F "files=@$TMP/ok.jpg;type=image/jpeg" -F "files=@$TMP/ok.png;type=image/png")
check "luu ket qua CDHA kem 2 anh -> COMPLETED" "COMPLETED" "$(echo "$R" | jget "['data']['status']")"
check "DA CO DU KET QUA: ca A chuyen sang RESULTS_READY" "RESULTS_READY" "$(vstatus $VA)"
check "2 tep anh nam tren dia (Docker volume)" "2" "$(docker compose exec -T clinical-service sh -c 'find /app/uploads/imaging -type f | wc -l' | tr -d '[:space:]')"
DET=$(getauth $V/$VA "$T1")
check "chu nuoi 1 xem duoc benh an: co 2 anh dinh kem" "2" "$(echo "$DET" | jget "['data']['imagingResults'][0]['attachments'].__len__()")"
ATT=$(echo "$DET" | jget "['data']['imagingResults'][0]['attachments'][0]['id']")
curl -s -D "$TMP/h.txt" -o "$TMP/dl.bin" "$G/api/v1/clinical/imaging-attachments/$ATT/file" -H "Authorization: Bearer $T1"
check "tai anh: HTTP 200 dung Content-Type" "200 image/jpeg" "$(head -1 "$TMP/h.txt" | awk '{print $2}') $(grep -i '^content-type' "$TMP/h.txt" | awk '{print $2}' | tr -d '\r')"
check "tai anh: noi dung giong tep da tai len" "$(md5sum "$TMP/ok.jpg" | cut -d' ' -f1)" "$(md5sum "$TMP/dl.bin" | cut -d' ' -f1)"
check "chu nuoi 2 khong tai duoc anh cua nguoi khac -> 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' "$G/api/v1/clinical/imaging-attachments/$ATT/file" -H "Authorization: Bearer $T2")"
check "chu nuoi 2 khong xem duoc benh an nguoi khac -> CLIN_1301" "CLIN_1301" "$(getauth $V/$VA "$T2" | code)"
check "benh an trong doi tuong thu cung (UC-38): chu nuoi 1 thay dot kham" "1" "$(getauth /api/v1/pets/$PA/visits "$T1" | jget "['data'].__len__()")"

echo; echo "== I. KHOA UU TIEN BAC SI (EX-05) VA TAI KHAM GIAI DOAN 2 (UC-30) =="
check "BS A con ca B dang cho (da giao) + ca co ket qua -> BUSY thang uu tien" "BUSY" "$(getauth /api/v1/clinical/doctors/status "$REC" | python -c "import sys,json; print([d['status'] for d in json.load(sys.stdin)['data'] if d['doctorId']==$DA][0])")"
VB_STATE=$(vstatus $VB)
# ca B da duoc giao cho BS A tu truoc (WAITING) nen BS A van la BUSY; huy phan cong bang cach huy ca B de thu khoa uu tien
post $V/$VB/cancel '{"reason":"Nhuong cho thu nghiem khoa uu tien"}' "$REC" >/dev/null
check "sau khi huy ca B: BS A o trang thai uu tien tai kham" "AVAILABLE_PRIORITY_CALLBACK" "$(getauth /api/v1/clinical/doctors/status "$REC" | python -c "import sys,json; print([d['status'] for d in json.load(sys.stdin)['data'] if d['doctorId']==$DA][0])")"
PD=$(mkpet "$REC" $O2 1 "Thu D"); VD=$(checkin $PD)
check "KHOA UU TIEN: Le tan giao ca moi cho BS A -> CLIN_1303" "CLIN_1303" "$(assign $VD $DA | code)"
check "BS B van nhan duoc ca moi? (BS B dang co ca cap cuu cho ket qua nen van ban/uu tien)" "True" "$(assign $VD $DB | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('errorCode') in ('CLIN_1302','CLIN_1303') or d['status']==200)")"
post $V/$VD/cancel '{"reason":"Don dep sau thu khoa uu tien"}' "$REC" >/dev/null
check "danh sach ca cua BS A co ca tai kham" "RESULTS_READY" "$(getauth /api/v1/clinical/doctors/me/visits "$TA" | jget "['data'][0]['status']")"
check "BS B khong goi lai duoc ca cua BS A -> CLIN_1308" "CLIN_1308" "$(post $V/$VA/call-back '{}' "$TB" | code)"
R=$(post $V/$VA/postpone-callback '{}' "$TA")
check "EX-10: BS A tam hoan vi khach vang -> van RESULTS_READY, danh dau hoan" "RESULTS_READY true" "$(echo "$R" | jget "['data']['status']") $(echo "$R" | python -c "import sys,json; print(str(json.load(sys.stdin)['data']['callbackPostponed']).lower())")"
check "tam hoan giai phong khoa uu tien: BS A tro lai AVAILABLE" "AVAILABLE" "$(getauth /api/v1/clinical/doctors/status "$REC" | python -c "import sys,json; print([d['status'] for d in json.load(sys.stdin)['data'] if d['doctorId']==$DA][0])")"
check "tam hoan lan 2 -> CLIN_1305" "CLIN_1305" "$(post $V/$VA/postpone-callback '{}' "$TA" | code)"
check "DB: callback_postponed_at da co gia tri" "1" "$(sql "SELECT callback_postponed_at IS NOT NULL FROM pet_clinic_clinical_db.pet_visits WHERE id=$VA")"
R=$(post $V/$VA/call-back '{}' "$TA")
check "Recall: khach quay lai, BS A moi vao GD2 -> IN_PROGRESS" "IN_PROGRESS" "$(echo "$R" | jget "['data']['status']")"
check "Recall xoa dau tam hoan" "False" "$(echo "$R" | jget "['data']['callbackPostponed']")"
check "goi vao lan 2 -> CLIN_1305" "CLIN_1305" "$(post $V/$VA/call-back '{}' "$TA" | code)"

echo; echo "== J. CHOT CA (UC-33, EX-12), KHOA HO SO, THANH TOAN =="
check "chot ca khi chua co chan doan -> CLIN_1312" "CLIN_1312" "$(post $V/$VA/close-visit '{"treatmentPlan":"x"}' "$TA" | code)"
check "chot ca voi chan doan toan khoang trang -> CLIN_1312" "CLIN_1312" "$(post $V/$VA/close-visit '{"diagnosis":"   "}' "$TA" | code)"
check "BS khac chot ca -> CLIN_1308" "CLIN_1308" "$(post $V/$VA/close-visit '{"diagnosis":"x"}' "$TB" | code)"
R=$(post $V/$VA/close-visit '{"diagnosis":"Viem gan cap","treatmentPlan":"Truyen dich 3 ngay","doctorAdvice":"An chao loang"}' "$TA")
check "chot ca -> WAITING_PAYMENT" "WAITING_PAYMENT" "$(echo "$R" | jget "['data']['status']")"
check "ho so bi khoa (locked)" "True" "$(echo "$R" | jget "['data']['locked']")"
check "sau khi khoa: chi dinh them dich vu -> CLIN_1305" "CLIN_1305" "$(order $VA "$TA" DEWORM | code)"
check "sau khi khoa: chot lai -> CLIN_1305" "CLIN_1305" "$(post $V/$VA/close-visit '{"diagnosis":"Sua chan doan"}' "$TA" | code)"
check "sau khi khoa: huy ca -> CLIN_1305" "CLIN_1305" "$(post $V/$VA/cancel '{"reason":"x"}' "$REC" | code)"
check "sau khi chot, BS A ranh tro lai" "AVAILABLE" "$(getauth /api/v1/clinical/doctors/status "$REC" | python -c "import sys,json; print([d['status'] for d in json.load(sys.stdin)['data'] if d['doctorId']==$DA][0])")"
BILL=$(docker compose exec -T api-gateway curl -s http://clinical-service:8083/internal/clinical/visits/$VA/billable-services)
check "dich vu tinh tien (noi bo): EXAM, VAC, CBC, US" "EXAM_GEN IMG_US_AB LAB_CBC VAC_7B" "$(echo "$BILL" | python -c "import sys,json; print(' '.join(sorted(l['code'] for l in json.load(sys.stdin)['data'])))")"
check "tong tien dich vu = 100000 + 150000 + 250000 + 200000 (gia da chot)" "700000.0" "$(echo "$BILL" | python -c "import sys,json; print(sum(l['subtotal'] for l in json.load(sys.stdin)['data']))")"
echo "   phat PaymentAndDispenseCompletedEvent (billing-pharmacy-service se phat that khi lam xong)..."
rabbit_publish payment.completed "{\"eventId\":\"$(python -c 'import uuid;print(uuid.uuid4())')\",\"occurredAt\":\"2026-10-28T14:00:00Z\",\"actorUserId\":$RECID,\"visitId\":$VA,\"invoiceId\":1,\"prescriptionId\":null}" >/dev/null
check "DONG VONG: nhan su kien thanh toan -> COMPLETED" "0" "$(wait_status $VA COMPLETED 10; echo $?)"
check "completed_at da duoc ghi" "1" "$(sql "SELECT completed_at IS NOT NULL FROM pet_clinic_clinical_db.pet_visits WHERE id=$VA")"
rabbit_publish payment.completed "{\"eventId\":\"$(python -c 'import uuid;print(uuid.uuid4())')\",\"occurredAt\":\"2026-10-28T14:00:00Z\",\"actorUserId\":$RECID,\"visitId\":$VA,\"invoiceId\":1,\"prescriptionId\":null}" >/dev/null
sleep 2
check "su kien thanh toan nhan trung: khong them dong lich su" "1" "$(sql "SELECT COUNT(*) FROM pet_clinic_clinical_db.pet_visit_status_histories WHERE visit_id=$VA AND to_status='COMPLETED'")"
check "lich su ca A theo dung thu tu may trang thai" "WAITING>WAITING>IN_PROGRESS>WAITING_RESULTS>RESULTS_READY>RESULTS_READY>IN_PROGRESS>WAITING_PAYMENT>COMPLETED" "$(getauth $V/$VA/history "$REC" | python -c "import sys,json; h=json.load(sys.stdin)['data']; print('>'.join(x['toStatus'] for x in h))")"
check "su kien thanh toan cho ca khong ton tai: vao DLQ" "True" "$(rabbit_publish payment.completed '{"eventId":"'$(python -c 'import uuid;print(uuid.uuid4())')'","occurredAt":"2026-10-28T14:00:00Z","actorUserId":1,"visitId":999999,"invoiceId":1,"prescriptionId":null}' >/dev/null; sleep 14; docker compose exec -T api-gateway sh -c "curl -s -u '$RABBITMQ_USERNAME:$RABBITMQ_PASSWORD' http://rabbitmq-broker:15672/api/queues/%2F/clinical-service.payment.completed.dlq" | python -c "import sys,json; print(json.load(sys.stdin).get('messages',0) >= 1)")"

echo; echo "== K. KHACH BO VE (EX-11) VA HUY MOT PHAN CAN LAM SANG (EX-08) =="
PE=$(mkpet "$REC" $O1 1 "Thu E"); VE=$(checkin $PE); assign $VE $DA >/dev/null; startexam $VE $TA >/dev/null; order $VE "$TA" LAB_CBC >/dev/null
LAB_E=$(detail_id $VE LAB_CBC)
post /api/v1/clinical/service-details/$LAB_E/start '{}' "$LAB" >/dev/null
labres $LAB_E "{\"items\":[{\"labTestItemId\":$WBC,\"value\":10}]}" >/dev/null
check "xet nghiem xong, khong con CLS khac -> RESULTS_READY" "RESULTS_READY" "$(vstatus $VE)"
check "chu nuoi khong duoc dong ca -> 403" "SYS_1003" "$(post $V/$VE/abandon '{}' "$T1" | code)"
check "BS khac khong dong ca cua BS A -> CLIN_1308" "CLIN_1308" "$(post $V/$VE/abandon '{}' "$TB" | code)"
R=$(post $V/$VE/abandon '{}' "$REC")
check "EX-11: khach bo ve, Le tan dong ca -> COMPLETED (ghi no)" "COMPLETED" "$(echo "$R" | jget "['data']['status']")"
check "ket qua da lam van duoc luu vao benh an" "1" "$(echo "$R" | jget "['data']['labResults'].__len__()")"
check "dong ca lan 2 -> CLIN_1305" "CLIN_1305" "$(post $V/$VE/abandon '{}' "$REC" | code)"

PF=$(mkpet "$REC" $O1 1 "Thu F"); VF=$(checkin $PF); assign $VF $DA >/dev/null; startexam $VF $TA >/dev/null; order $VF "$TA" LAB_CBC IMG_US_AB >/dev/null
LAB_F=$(detail_id $VF LAB_CBC); IMG_F=$(detail_id $VF IMG_US_AB)
post /api/v1/clinical/service-details/$LAB_F/start '{}' "$LAB" >/dev/null
labres $LAB_F "{\"items\":[{\"labTestItemId\":$WBC,\"value\":10}]}" >/dev/null
check "cancel chi dinh khong co ly do -> SYS_1001" "SYS_1001" "$(post /api/v1/clinical/service-details/$IMG_F/cancel '{}' "$IMG" | code)"
check "KTV Lab khong huy duoc chi dinh cua phong CDHA -> 403" "SYS_1003" "$(post /api/v1/clinical/service-details/$IMG_F/cancel '{"reason":"x"}' "$LAB" | code)"
check "EX-08: khach xin huy sieu am -> CANCELLED" "CANCELLED" "$(post /api/v1/clinical/service-details/$IMG_F/cancel '{"reason":"Thu cung qua hung du"}' "$IMG" | jget "['data']['status']")"
check "con CBC da xong nen ca chuyen RESULTS_READY" "RESULTS_READY" "$(vstatus $VF)"
BILLF=$(docker compose exec -T api-gateway curl -s http://clinical-service:8083/internal/clinical/visits/$VF/billable-services)
check "hoa don KHONG tinh tien sieu am da huy" "EXAM_GEN LAB_CBC" "$(echo "$BILLF" | python -c "import sys,json; print(' '.join(sorted(l['code'] for l in json.load(sys.stdin)['data'])))")"
check "huy chi dinh da huy -> CLIN_1311" "CLIN_1311" "$(post /api/v1/clinical/service-details/$IMG_F/cancel '{"reason":"x"}' "$IMG" | code)"

PG=$(mkpet "$REC" $O1 1 "Thu G"); VG=$(checkin $PG); assign $VG $DB >/dev/null
check "huy ca dang CHO O SANH (EX-03) -> CANCELLED" "CANCELLED" "$(post $V/$VG/cancel '{"reason":"Khach xin ve"}' "$REC" | jget "['data']['status']")"
check "thu cung do co the tiep nhan lai sau khi huy" "201" "$(post $V/check-in "{\"petId\":$PG}" "$REC" | jget "['status']")"

echo; echo "== L. DONG THOI: 2 KTV CUNG HOAN TAT 2 DICH VU CUOI CUA MOT CA (5 vong) =="
OKRACE=0
for round in 1 2 3 4 5; do
  p=$(mkpet "$REC" $O2 1 "Race $round"); v=$(checkin $p)
  assign $v $DB >/dev/null; startexam $v $TB >/dev/null; order $v "$TB" LAB_CBC IMG_US_AB >/dev/null
  ld=$(detail_id $v LAB_CBC); idd=$(detail_id $v IMG_US_AB)
  post /api/v1/clinical/service-details/$ld/start '{}' "$LAB" >/dev/null
  post /api/v1/clinical/service-details/$idd/start '{}' "$IMG" >/dev/null
  ( labres $ld "{\"items\":[{\"labTestItemId\":$WBC,\"value\":10}]}" > "$TMP/r1_$round.txt" ) &
  ( img_upload $idd "$TMP/ok.jpg" > "$TMP/r2_$round.txt" ) &
  wait
  st=$(vstatus $v)
  transitions=$(sql "SELECT COUNT(*) FROM pet_clinic_clinical_db.pet_visit_status_histories WHERE visit_id=$v AND from_status='WAITING_RESULTS' AND to_status='RESULTS_READY'")
  [ "$st" = "RESULTS_READY" ] && [ "$transitions" = "1" ] && OKRACE=$((OKRACE+1)) || echo "   vong $round: status=$st, so lan chuyen=$transitions"
  # mời vào và chốt ca để bác sĩ rảnh cho vòng sau
  post $V/$v/call-back '{}' "$TB" >/dev/null; post $V/$v/close-visit '{"diagnosis":"Race test"}' "$TB" >/dev/null
done
check "5/5 vong: ca luon sang RESULTS_READY dung 1 lan (khong ket o WAITING_RESULTS)" "5" "$OKRACE"

echo; echo "== M. BAO MAT VA RO KHOA =="
check "qua Gateway /internal/** -> 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' $G/internal/clinical/pets/$PA -H "Authorization: Bearer $REC")"
check "khong con khoa MySQL (GET_LOCK) nao bi ro" "0" "$(sql "SELECT COUNT(*) FROM performance_schema.metadata_locks WHERE OBJECT_TYPE='USER LEVEL LOCK'")"
check "khong co dot kham nao ket o WAITING_RESULTS" "0" "$(sql "SELECT COUNT(*) FROM pet_clinic_clinical_db.pet_visits WHERE status='WAITING_RESULTS' AND id NOT IN ($VC)")"
check "moi lan doi trang thai deu co dong lich su (khong dot kham nao thieu)" "0" "$(sql "SELECT COUNT(*) FROM pet_clinic_clinical_db.pet_visits v WHERE NOT EXISTS (SELECT 1 FROM pet_clinic_clinical_db.pet_visit_status_histories h WHERE h.visit_id=v.id AND h.to_status=v.status)")"
LOGS=$(docker compose logs --no-color --since 15m clinical-service 2>&1 | grep -E " ERROR " | grep -v -E "Optimistic|CLIN_" | cut -c1-200 | head -5)
check "log clinical-service khong co ERROR bat thuong" "" "$LOGS"

echo; echo "============================================"
echo "   KET QUA: $PASS dat, $FAIL khong dat"
echo "============================================"
