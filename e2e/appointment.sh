#!/usr/bin/env bash
# Kiểm thử end-to-end appointment-service qua API Gateway (có tự đối chiếu PASS/FAIL)
export PYTHONIOENCODING=utf-8
cd "$(dirname "$0")/.." || exit 1
set -a; source .env; set +a

G=http://localhost:8080
J='Content-Type: application/json'
TMP="$(pwd -W 2>/dev/null || pwd)/e2e/.tmp/par"
mkdir -p "$TMP"
TOMORROW=$(date -d "+1 day" +%F); D2=$(date -d "+2 days" +%F); D3=$(date -d "+3 days" +%F); D4=$(date -d "+4 days" +%F)
YESTERDAY=$(date -d "-1 day" +%F); FAR=$(date -d "+90 days" +%F)

PASS=0; FAIL=0
check() { # mô tả, mong đợi, thực tế
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"; else FAIL=$((FAIL+1)); echo "  [FAIL] $1 -> mong doi '$2', nhan '$3'"; fi
}
jget() { python -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1"; }
post() { # path body token
  if [ -n "$3" ]; then curl -s -X POST "$G$1" -H "$J" -H "Authorization: Bearer $3" -d "$2"
  else curl -s -X POST "$G$1" -H "$J" -d "$2"; fi
}
getauth() { curl -s "$G$1" -H "Authorization: Bearer $2"; }
sql() { docker compose exec -T mysql-server sh -c 'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" -N' <<< "$1" 2>/dev/null; }
login() { post /api/v1/auth/login "{\"username\":\"$1\",\"password\":\"$2\"}" | jget "['data']['accessToken']"; }
book() { # token petId date time [ownerId channel]
  local body="{\"petId\":$2,\"appointmentDate\":\"$3\",\"startTime\":\"$4\",\"reason\":\"Kham tong quat\""
  [ -n "$5" ] && body="$body,\"ownerId\":$5"
  [ -n "$6" ] && body="$body,\"bookingChannel\":\"$6\""
  post /api/v1/appointments "$body}" "$1"
}
slot() { # token date HH:MM:SS field
  getauth "/api/v1/appointments/slots?date=$2" "$1" | python -c "import sys,json; d=json.load(sys.stdin)['data']; s=[x for x in d if x['startTime']=='$3'][0]; print(s['$4'])"
}

echo "== Don du lieu thu nghiem cu =="
sql "DELETE FROM pet_clinic_appointment_db.appointment_status_histories; DELETE FROM pet_clinic_appointment_db.appointments; ALTER TABLE pet_clinic_appointment_db.appointments AUTO_INCREMENT = 1; DELETE FROM pet_clinic_auth_db.refresh_tokens; DELETE FROM pet_clinic_auth_db.users WHERE id > 1; ALTER TABLE pet_clinic_auth_db.users AUTO_INCREMENT = 2;"

# DLQ là hàng đợi bền vững: dọn tin của các lần chạy trước để phép đếm ở mục J chính xác
docker compose exec -T api-gateway sh -c "curl -s -o /dev/null -u '$RABBITMQ_USERNAME:$RABBITMQ_PASSWORD' -X DELETE http://rabbitmq-broker:15672/api/queues/%2F/appointment-service.visit.checked_in.dlq/contents"
ADMIN=$(login admin 'Admin@123')
echo "== Chuan bi tai khoan =="
post /api/v1/auth/users '{"username":"letan1","password":"LeTan@123","fullName":"Le Tan 1","phoneNumber":"0933333333","roleCode":"RECEPTIONIST"}' "$ADMIN" >/dev/null
REC=$(login letan1 'LeTan@123')
RECID=$(sql "SELECT id FROM pet_clinic_auth_db.users WHERE username='letan1'")
O1=$(post /api/v1/auth/users '{"password":"ChuNuoi@1","fullName":"Chu Nuoi 1","phoneNumber":"0944444441","roleCode":"PET_OWNER"}' "$REC" | jget "['data']['id']")
O2=$(post /api/v1/auth/users '{"password":"ChuNuoi@1","fullName":"Chu Nuoi 2","phoneNumber":"0944444442","roleCode":"PET_OWNER"}' "$REC" | jget "['data']['id']")
O3=$(post /api/v1/auth/users '{"password":"ChuNuoi@1","fullName":"Chu Nuoi 3","phoneNumber":"0944444443","roleCode":"PET_OWNER"}' "$REC" | jget "['data']['id']")
T1=$(login 0944444441 'ChuNuoi@1'); T2=$(login 0944444442 'ChuNuoi@1'); T3=$(login 0944444443 'ChuNuoi@1')
# verify-pet dang BAT: thu cung phai ton tai trong clinical-service va thuoc dung chu nuoi => tao ho so that
sql "DELETE FROM pet_clinic_clinical_db.pets WHERE id >= 100;"
PETVALUES=""
addpet() { PETVALUES="$PETVALUES,($1,$2,1,'PET-E2E-$1','E2E $1')"; }
for p in 101 102 401; do addpet $p $O1; done
for p in 107 402; do addpet $p $O2; done
for p in 103 104 106 201 202 203 204 205 206 207 208 301; do addpet $p $O3; done
sql "INSERT INTO pet_clinic_clinical_db.pets (id, owner_id, species_id, pet_code, name) VALUES ${PETVALUES:1};"
echo "   chu nuoi: $O1 $O2 $O3, le tan token ok: $([ -n "$REC" ] && echo yes)"

echo; echo "== A. CHUA CO BAC SI NAO ACTIVE (suc chua = 0) =="
check "slots: capacity = 0" "0" "$(slot "$T1" "$TOMORROW" 09:00:00 capacity)"
check "slots: moi khung deu khong available" "False" "$(slot "$T1" "$TOMORROW" 09:00:00 available)"
R=$(book "$T1" 101 "$TOMORROW" 09:00)
check "dat lich khi chua co bac si -> APPT_1203" "APPT_1203" "$(echo "$R" | jget ".get('errorCode')")"

echo; echo "== B. TAO 2 BAC SI -> SUC CHUA = 2 =="
D1ID=$(post /api/v1/auth/users '{"username":"bs.a","password":"BacSi@123","fullName":"BS A","phoneNumber":"0911111111","roomNumber":"P01","roleCode":"VETERINARIAN"}' "$ADMIN" | jget "['data']['id']")
D2ID=$(post /api/v1/auth/users '{"username":"bs.b","password":"BacSi@123","fullName":"BS B","phoneNumber":"0922222222","roomNumber":"P02","roleCode":"VETERINARIAN"}' "$ADMIN" | jget "['data']['id']")
check "slots: capacity = 2 (so bac si ACTIVE, goi auth-service)" "2" "$(slot "$T1" "$TOMORROW" 09:00:00 capacity)"
check "slots: du 14 khung" "14" "$(getauth "/api/v1/appointments/slots?date=$TOMORROW" "$T1" | jget "['data'].__len__()")"
check "slots: khong dang nhap -> 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' "$G/api/v1/appointments/slots?date=$TOMORROW")"
check "slots: ngay qua khu -> SYS_1001" "SYS_1001" "$(getauth "/api/v1/appointments/slots?date=$YESTERDAY" "$T1" | jget ".get('errorCode')")"

echo; echo "== C. DAT LICH (chu nuoi) =="
R=$(book "$T1" 101 "$TOMORROW" 09:00 999 PHONE)   # body gian lan: ownerId 999, kenh PHONE
check "chu nuoi dat lich -> 201" "201" "$(echo "$R" | jget "['status']")"
check "KIEM TRA THU CUNG: dat bang thu cung cua chu nuoi khac -> APPT_1201" "APPT_1201" "$(book "$T1" 107 "$D2" 09:00 | jget ".get('errorCode')")"
check "KIEM TRA THU CUNG: thu cung khong ton tai -> APPT_1201" "APPT_1201" "$(book "$T1" 999999 "$D2" 09:00 | jget ".get('errorCode')")"
check "KIEM TRA THU CUNG: le tan chon chu nuoi khong phai chu thu cung -> APPT_1201" "APPT_1201" "$(book "$REC" 107 "$D2" 09:00 "$O1" PHONE | jget ".get('errorCode')")"
check "trang thai PENDING" "PENDING" "$(echo "$R" | jget "['data']['status']")"
check "kenh bi ep thanh ONLINE" "ONLINE" "$(echo "$R" | jget "['data']['bookingChannel']")"
check "ownerId lay tu token, khong tin body" "$O1" "$(echo "$R" | jget "['data']['ownerId']")"
check "gio ket thuc = 09:30:00" "09:30:00" "$(echo "$R" | jget "['data']['endTime']")"
APPT1=$(echo "$R" | jget "['data']['id']")
echo "   ma lich hen: $(echo "$R" | jget "['data']['appointmentCode']")"
check "ma lich hen dung dinh dang APT-yyyyMMdd-NNNNN" "1" "$(echo "$R" | jget "['data']['appointmentCode']" | grep -c -E '^APT-[0-9]{8}-[0-9]{5}$')"
check "slot 09:00 booked = 1" "1" "$(slot "$T1" "$TOMORROW" 09:00:00 booked)"
check "slot 09:00 remaining = 1" "1" "$(slot "$T1" "$TOMORROW" 09:00:00 remaining)"
check "cung thu cung, cung ngay, khung khac -> APPT_1207" "APPT_1207" "$(book "$T1" 101 "$TOMORROW" 10:00 | jget ".get('errorCode')")"
check "khung gio khong chuan 09:15 -> APPT_1208" "APPT_1208" "$(book "$T1" 102 "$TOMORROW" 09:15 | jget ".get('errorCode')")"
check "khung gio nghi trua 12:30 -> APPT_1208" "APPT_1208" "$(book "$T1" 102 "$TOMORROW" 12:30 | jget ".get('errorCode')")"
check "ngay qua khu -> SYS_1001" "SYS_1001" "$(book "$T1" 102 "$YESTERDAY" 09:00 | jget ".get('errorCode')")"
check "qua 60 ngay -> SYS_1001" "SYS_1001" "$(book "$T1" 102 "$FAR" 09:00 | jget ".get('errorCode')")"
check "thieu ly do kham -> SYS_1001" "SYS_1001" "$(post /api/v1/appointments "{\"petId\":102,\"appointmentDate\":\"$TOMORROW\",\"startTime\":\"09:00\"}" "$T1" | jget ".get('errorCode')")"
R2=$(book "$T2" 107 "$TOMORROW" 09:00); APPT2=$(echo "$R2" | jget "['data']['id']")
check "chu nuoi 2 dat khung 09:00 (cho thu 2) -> 201" "201" "$(echo "$R2" | jget "['status']")"
check "slot 09:00 day: remaining = 0" "0" "$(slot "$T1" "$TOMORROW" 09:00:00 remaining)"
check "slot 09:00 day: available = False" "False" "$(slot "$T1" "$TOMORROW" 09:00:00 available)"
check "chu nuoi 3 dat khung da day -> APPT_1203" "APPT_1203" "$(book "$T3" 103 "$TOMORROW" 09:00 | jget ".get('errorCode')")"

echo; echo "== D. LE TAN DAT HO (UC-16) VA DUYET (UC-17) =="
R=$(book "$REC" 103 "$TOMORROW" 10:00 "$O3" PHONE); APPT3=$(echo "$R" | jget "['data']['id']")
check "le tan dat qua dien thoai -> CONFIRMED ngay" "CONFIRMED" "$(echo "$R" | jget "['data']['status']")"
check "co nguoi duyet confirmedBy" "True" "$(echo "$R" | jget "['data']['confirmedBy'] is not None")"
check "kenh PHONE" "PHONE" "$(echo "$R" | jget "['data']['bookingChannel']")"
check "le tan khong gui ownerId -> SYS_1001" "SYS_1001" "$(book "$REC" 104 "$TOMORROW" 10:30 "" PHONE | jget ".get('errorCode')")"
check "le tan dung kenh ONLINE -> SYS_1001" "SYS_1001" "$(book "$REC" 104 "$TOMORROW" 10:30 "$O3" ONLINE | jget ".get('errorCode')")"
check "le tan chon ownerId la bac si -> SYS_1001" "SYS_1001" "$(book "$REC" 104 "$TOMORROW" 10:30 "$D1ID" PHONE | jget ".get('errorCode')")"
check "le tan chon ownerId khong ton tai -> AUTH_1101" "AUTH_1101" "$(book "$REC" 104 "$TOMORROW" 10:30 99999 PHONE | jget ".get('errorCode')")"
PEND=$(getauth "/api/v1/appointments?status=PENDING&sortBy=createdAt&ascending=true" "$REC")
check "hang cho duyet: 2 lich PENDING" "2" "$(echo "$PEND" | jget "['data']['totalElements']")"
check "hang cho duyet sap theo thoi gian gui tang dan" "$APPT1" "$(echo "$PEND" | jget "['data']['items'][0]['id']")"
check "le tan duyet lich 1 -> CONFIRMED" "CONFIRMED" "$(post /api/v1/appointments/$APPT1/confirm '{}' "$REC" | jget "['data']['status']")"
check "duyet lan 2 -> APPT_1206" "APPT_1206" "$(post /api/v1/appointments/$APPT1/confirm '{}' "$REC" | jget ".get('errorCode')")"
check "chu nuoi khong duoc duyet -> 403" "SYS_1003" "$(post /api/v1/appointments/$APPT2/confirm '{}' "$T2" | jget ".get('errorCode')")"
check "bac si khong duoc dat lich -> 403" "SYS_1003" "$(book "$(login bs.a 'BacSi@123')" 105 "$TOMORROW" 14:00 | jget ".get('errorCode')")"

echo; echo "== E. PHAN QUYEN DU LIEU =="
check "chu nuoi 2 xem lich cua chu nuoi 1 -> 404" "APPT_1202" "$(getauth /api/v1/appointments/$APPT1 "$T2" | jget ".get('errorCode')")"
check "danh sach cua chu nuoi 2 chi co lich cua minh" "1" "$(getauth "/api/v1/appointments?ownerId=$O1" "$T2" | jget "['data']['totalElements']")"
check "chu nuoi 2 huy lich cua nguoi khac -> 404" "APPT_1202" "$(post /api/v1/appointments/$APPT1/cancel '{"reason":"x"}' "$T2" | jget ".get('errorCode')")"
check "chu nuoi khong xem duoc lich su -> 403" "SYS_1003" "$(getauth /api/v1/appointments/$APPT1/history "$T1" | jget ".get('errorCode')")"
check "tim theo ma lich hen" "1" "$(getauth "/api/v1/appointments?code=$(getauth /api/v1/appointments/$APPT1 "$REC" | jget "['data']['appointmentCode']")" "$REC" | jget "['data']['totalElements']")"

echo; echo "== F. HUY VA DOI LICH (UC-15) =="
check "huy khong co ly do -> SYS_1001" "SYS_1001" "$(post /api/v1/appointments/$APPT2/cancel '{}' "$T2" | jget ".get('errorCode')")"
R=$(post /api/v1/appointments/$APPT2/cancel '{"reason":"Thu cung da khoi"}' "$T2")
check "chu nuoi 2 tu huy lich -> CANCELLED" "CANCELLED" "$(echo "$R" | jget "['data']['status']")"
check "lich da huy duoc luu ly do" "Thu cung da khoi" "$(echo "$R" | jget "['data']['cancelReason']")"
check "suat da duoc tra: slot 09:00 booked = 1" "1" "$(slot "$T1" "$TOMORROW" 09:00:00 booked)"
check "huy lai lich da huy -> APPT_1206" "APPT_1206" "$(post /api/v1/appointments/$APPT2/cancel '{"reason":"x"}' "$T2" | jget ".get('errorCode')")"
check "chu nuoi 3 dat duoc khung 09:00 vua co nguoi huy" "201" "$(book "$T3" 106 "$TOMORROW" 09:00 | jget "['status']")"
book "$REC" 104 "$TOMORROW" 10:00 "$O3" PHONE >/dev/null   # lam day khung 10:00 (2/2)
check "doi sang khung da day -> APPT_1203" "APPT_1203" "$(post /api/v1/appointments/$APPT1/reschedule "{\"newDate\":\"$TOMORROW\",\"newStartTime\":\"10:00\"}" "$T1" | jget ".get('errorCode')")"
check "doi sang chinh khung hien tai -> SYS_1001" "SYS_1001" "$(post /api/v1/appointments/$APPT1/reschedule "{\"newDate\":\"$TOMORROW\",\"newStartTime\":\"09:00\"}" "$T1" | jget ".get('errorCode')")"
check "doi sang gio khong chuan -> APPT_1208" "APPT_1208" "$(post /api/v1/appointments/$APPT1/reschedule "{\"newDate\":\"$TOMORROW\",\"newStartTime\":\"09:10\"}" "$T1" | jget ".get('errorCode')")"
R=$(post /api/v1/appointments/$APPT1/reschedule "{\"newDate\":\"$D2\",\"newStartTime\":\"14:30\",\"reason\":\"Doi lich cong viec\"}" "$T1")
check "doi lich sang ngay/khung con trong -> 200" "200" "$(echo "$R" | jget "['status']")"
check "doi lich giu nguyen trang thai CONFIRMED" "CONFIRMED" "$(echo "$R" | jget "['data']['status']")"
check "ngay moi" "$D2" "$(echo "$R" | jget "['data']['appointmentDate']")"
check "khung cu 09:00 duoc tra lai (con lai 1 lich cua chu nuoi 3)" "1" "$(slot "$T1" "$TOMORROW" 09:00:00 booked)"
HIST=$(getauth /api/v1/appointments/$APPT1/history "$REC")
check "lich su co 3 dong (tao, duyet, doi lich)" "3" "$(echo "$HIST" | jget "['data'].__len__()")"
echo "   ghi chu doi lich: $(echo "$HIST" | jget "['data'][2]['notes']")"

echo; echo "== G. DONG THOI (khoa khung gio) =="
rm -f "$TMP"/par_*.txt
for pet in 201 202 203 204 205 206 207 208; do
  ( book "$REC" $pet "$D4" 11:00 "$O3" PHONE | python -c "import sys,json; d=json.load(sys.stdin); print(d['status'], d.get('errorCode') or '')" > "$TMP/par_$pet.txt" ) &
done
wait
echo "   8 yeu cau song song vao khung co suc chua 2:"; cat "$TMP"/par_*.txt | sort | uniq -c | sed 's/^/     /'
check "dung 2 yeu cau thanh cong (201)" "2" "$(cat "$TMP"/par_*.txt | grep -c '^201')"
check "6 yeu cau con lai bi APPT_1203" "6" "$(cat "$TMP"/par_*.txt | grep -c 'APPT_1203')"
check "DB: dung 2 lich o khung 11:00" "2" "$(sql "SELECT COUNT(*) FROM pet_clinic_appointment_db.appointments WHERE appointment_date='$D4' AND start_time='11:00:00'")"

rm -f "$TMP"/par_*.txt
for t in 08:00 08:30 09:00 09:30 10:00 10:30; do
  ( book "$REC" 301 "$D4" $t "$O3" PHONE | python -c "import sys,json; d=json.load(sys.stdin); print(d['status'], d.get('errorCode') or '')" > "$TMP/par_$t.txt" ) &
done
wait
echo "   6 yeu cau song song cua CUNG MOT thu cung o 6 khung khac nhau:"; cat "$TMP"/par_*.txt | sort | uniq -c | sed 's/^/     /'
check "chi 1 lich hen cho thu cung 301 trong ngay" "1" "$(sql "SELECT COUNT(*) FROM pet_clinic_appointment_db.appointments WHERE pet_id=301 AND appointment_date='$D4'")"

echo; echo "== H. SUC CHUA THAY DOI THEO SO BAC SI ACTIVE =="
sql "SELECT 1" >/dev/null
check "ngay moi: capacity = 2" "2" "$(slot "$T1" "$D3" 09:00:00 capacity)"
post /api/v1/auth/users/$D2ID/status '{"status":"LOCKED"}' "$ADMIN" >/dev/null
check "khoa 1 bac si -> capacity = 1" "1" "$(slot "$T1" "$D3" 09:00:00 capacity)"
check "dat lich 1 (con 1 cho) -> 201" "201" "$(book "$T1" 401 "$D3" 09:00 | jget "['status']")"
check "dat lich 2 cung khung -> APPT_1203 (chi con 1 bac si)" "APPT_1203" "$(book "$T2" 402 "$D3" 09:00 | jget ".get('errorCode')")"
post /api/v1/auth/users/$D2ID/status '{"status":"ACTIVE"}' "$ADMIN" >/dev/null
check "mo khoa bac si -> capacity = 2 tro lai" "2" "$(slot "$T1" "$D3" 09:00:00 capacity)"
check "dat lich 2 cung khung gio duoc -> 201" "201" "$(book "$T2" 402 "$D3" 09:00 | jget "['status']")"

echo; echo "== I. VANG MAT (EX-01) =="
sql "INSERT INTO pet_clinic_appointment_db.appointments (appointment_code, pet_id, owner_id, appointment_date, start_time, end_time, reason, booking_channel, status) VALUES ('APT-OLD-0001', 501, $O1, '$YESTERDAY', '09:00:00', '09:30:00', 'Test no-show', 'PHONE', 'CONFIRMED');"
OLD=$(sql "SELECT id FROM pet_clinic_appointment_db.appointments WHERE appointment_code='APT-OLD-0001'")
check "chua toi gio (lich ngay mai) -> APPT_1206" "APPT_1206" "$(post /api/v1/appointments/$APPT3/no-show '{}' "$REC" | jget ".get('errorCode')")"
check "chu nuoi khong duoc danh dau vang mat -> 403" "SYS_1003" "$(post /api/v1/appointments/$OLD/no-show '{}' "$T1" | jget ".get('errorCode')")"
R=$(post /api/v1/appointments/$OLD/no-show '{}' "$REC")
check "le tan danh dau vang mat lich da qua han -> NO_SHOW" "NO_SHOW" "$(echo "$R" | jget "['data']['status']")"
check "khong huy duoc lich da NO_SHOW -> APPT_1206" "APPT_1206" "$(post /api/v1/appointments/$OLD/cancel '{"reason":"x"}' "$REC" | jget ".get('errorCode')")"

echo; echo "== J. CHECK-IN QUA RABBITMQ (clinical-service phat VisitCheckedInEvent) =="
publish() { # appointmentId|null
  python - "$1" "$RECID" <<'PY' | docker compose exec -T api-gateway sh -c "curl -s -u '$RABBITMQ_USERNAME:$RABBITMQ_PASSWORD' -H 'content-type: application/json' -X POST http://rabbitmq-broker:15672/api/exchanges/%2F/clinic.events/publish --data-binary @-"
import json, sys, uuid
aid = None if sys.argv[1] == "null" else int(sys.argv[1])
event = {"eventId": str(uuid.uuid4()), "occurredAt": "2026-10-28T14:00:00Z", "actorUserId": int(sys.argv[2]),
         "visitId": 1, "visitCode": "VIS-TEST-0001", "petId": 101, "appointmentId": aid, "emergency": False}
print(json.dumps({"properties": {"content_type": "application/json"}, "routing_key": "visit.checked_in",
                  "payload": json.dumps(event), "payload_encoding": "string"}))
PY
}
echo "   publish: $(publish $APPT3)"
sleep 3
check "lich hen CONFIRMED -> CHECKED_IN nho su kien" "CHECKED_IN" "$(getauth /api/v1/appointments/$APPT3 "$REC" | jget "['data']['status']")"
H=$(getauth /api/v1/appointments/$APPT3/history "$REC")
check "lich su ghi nguoi tiep nhan va ma dot kham" "1" "$(echo "$H" | jget "['data'][-1]['notes']" | grep -c 'VIS-TEST-0001')"
N1=$(echo "$H" | jget "['data'].__len__()")
publish $APPT3 >/dev/null; publish null >/dev/null
sleep 3
check "nhan trung su kien + su kien khach vang lai: khong them dong lich su" "$N1" "$(getauth /api/v1/appointments/$APPT3/history "$REC" | jget "['data'].__len__()")"
check "slot van tinh lich CHECKED_IN la dang chiem cho" "True" "$(getauth "/api/v1/appointments/slots?date=$TOMORROW" "$T1" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print([x for x in d if x['startTime']=='10:00:00'][0]['booked']>=1)")"
publish 999999 >/dev/null
echo "   cho retry (3 lan) roi vao DLQ ..."; sleep 14
DLQ=$(docker compose exec -T api-gateway sh -c "curl -s -u '$RABBITMQ_USERNAME:$RABBITMQ_PASSWORD' http://rabbitmq-broker:15672/api/queues/%2F/appointment-service.visit.checked_in.dlq" | jget ".get('messages')")
check "su kien cho lich hen khong ton tai nam trong DLQ" "1" "$DLQ"

echo; echo "== K. ENDPOINT NOI BO VA RO KHOA =="
check "qua Gateway /internal/** -> 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' $G/internal/appointments/$APPT1 -H "Authorization: Bearer $REC")"
IN=$(docker compose exec -T api-gateway curl -s http://appointment-service:8082/internal/appointments/$APPT1)
check "trong mang Docker, khong can header: tra ve lich hen" "$APPT1" "$(echo "$IN" | jget "['data']['id']")"
check "lich hen khong ton tai -> APPT_1202" "APPT_1202" "$(docker compose exec -T api-gateway curl -s http://appointment-service:8082/internal/appointments/424242 | jget ".get('errorCode')")"
check "khong con khoa MySQL (GET_LOCK) nao bi ro" "0" "$(sql "SELECT COUNT(*) FROM performance_schema.metadata_locks WHERE OBJECT_TYPE='USER LEVEL LOCK'")"
check "gio hen luu dung 09:00:00 (khong lech mui gio)" "09:00:00" "$(sql "SELECT start_time FROM pet_clinic_appointment_db.appointments WHERE id=$APPT2")"
check "ngay hen luu dung" "$TOMORROW" "$(sql "SELECT appointment_date FROM pet_clinic_appointment_db.appointments WHERE id=$APPT2")"

echo; echo "============================================"
echo "   KET QUA: $PASS dat, $FAIL khong dat"
echo "============================================"
