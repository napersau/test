#!/usr/bin/env bash
# Kiem thu end-to-end billing-pharmacy-service qua API Gateway (toan hanh trinh + ngoai le + dong thoi), tu doi chieu PASS/FAIL
export PYTHONIOENCODING=utf-8
cd "$(dirname "$0")/.." || exit 1
set -a; source .env; set +a

G=http://localhost:8080
J='Content-Type: application/json'
SCR="$(pwd -W 2>/dev/null || pwd)/e2e/.tmp"
mkdir -p "$SCR"; TMP="$SCR/bl"; mkdir -p "$TMP"

PASS=0; FAIL=0
check() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"; else FAIL=$((FAIL+1)); echo "  [FAIL] $1 -> mong doi '$2', nhan '$3'"; fi; }
jget() { python -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1"; }
post() { if [ -n "$3" ]; then curl -s -X POST "$G$1" -H "$J" -H "Authorization: Bearer $3" -d "$2"; else curl -s -X POST "$G$1" -H "$J" -d "$2"; fi; }
put() { curl -s -X PUT "$G$1" -H "$J" -H "Authorization: Bearer $3" -d "$2"; }
getauth() { curl -s "$G$1" -H "Authorization: Bearer $2"; }
sql() { docker compose exec -T mysql-server sh -c 'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" -N' <<< "$1" 2>/dev/null; }
login() { post /api/v1/auth/login "{\"username\":\"$1\",\"password\":\"$2\"}" | jget "['data']['accessToken']"; }
code() { jget ".get('errorCode')"; }
rmq() { # method path [json]
  if [ -n "$3" ]; then docker compose exec -T api-gateway sh -c "curl -s -u '$RABBITMQ_USERNAME:$RABBITMQ_PASSWORD' -H 'content-type: application/json' -X $1 http://rabbitmq-broker:15672/api$2 --data-binary @-" <<< "$3"
  else docker compose exec -T api-gateway sh -c "curl -s -u '$RABBITMQ_USERNAME:$RABBITMQ_PASSWORD' -X $1 http://rabbitmq-broker:15672/api$2"; fi
}
rabbit_publish() { # routing_key payload_json
  python - "$1" "$2" <<'PYE' | docker compose exec -T api-gateway sh -c "curl -s -u '$RABBITMQ_USERNAME:$RABBITMQ_PASSWORD' -H 'content-type: application/json' -X POST http://rabbitmq-broker:15672/api/exchanges/%2F/clinic.events/publish --data-binary @-"
import json, sys
print(json.dumps({"properties": {"content_type": "application/json"}, "routing_key": sys.argv[1], "payload": sys.argv[2], "payload_encoding": "string"}))
PYE
}

BDB=pet_clinic_billing_pharmacy_db
CDB=pet_clinic_clinical_db
V=/api/v1/clinical/pet-visits
P=/api/v1/pharmacy/prescriptions
M=/api/v1/pharmacy/medicines
B=/api/v1/billing/invoices

mkuser() { post /api/v1/auth/users "$1" "$ADMIN" | jget "['data']['id']"; }
mkpet() { post /api/v1/pets "{\"ownerId\":$2,\"speciesId\":${3:-1},\"name\":\"$4\"}" "$1" | jget "['data']['id']"; }
checkin() { post $V/check-in "{\"petId\":$1,\"emergency\":false,\"initialSymptoms\":\"Bo an\"}" "$REC" | jget "['data']['id']"; }
assign() { post $V/$1/assign "{\"doctorId\":$2}" "$REC"; }
startexam() { post $V/$1/start-exam '{"weightAtVisit":12.5,"temperature":38.6,"clinicalNotes":"Tinh tao"}' "$2"; }
vstat() { getauth $V/$1 "$REC" | jget "['data']['status']"; }
wait_visit() { for i in $(seq 1 $(( ${3:-12} * 2 ))); do [ "$(vstat $1)" = "$2" ] && return 0; sleep 0.5; done; return 1; }
wait_invoice() { for i in $(seq 1 30); do local id; id=$(getauth $B/by-visit/$1 "$REC" | jget ".get('data',{}).get('id')" 2>/dev/null); case "$id" in ''|None) sleep 0.5;; *) echo "$id"; return 0;; esac; done; echo ""; return 1; }
open_visit() { # tokenVar doctorId label -> VID
  local pet; pet=$(mkpet "$REC" $O1 1 "$3"); VID=$(checkin $pet); assign $VID $2 >/dev/null; startexam $VID "${!1}" >/dev/null
}
rx() { # visitId id:qty ...
  python - "$@" <<'PYE'
import json, sys
print(json.dumps({"visitId": int(sys.argv[1]), "doctorNotes": "Cho an nhe", "items": [
    {"medicineId": int(a.split(':')[0]), "quantity": int(a.split(':')[1]), "dosage": "1 vien", "frequency": "2 lan/ngay", "durationDays": 5} for a in sys.argv[2:]]}))
PYE
}
stock() { sql "SELECT stock_quantity FROM $BDB.medicines WHERE code='$1'"; }
par() { # n url token -> so luong 200 trong $OK200
  rm -f "$TMP"/par_*; local i
  for i in $(seq 1 $1); do curl -s -o "$TMP/par_$i.json" -w '%{http_code}\n' -X POST "$G$2" -H "$J" -H "Authorization: Bearer $3" -d '{}' > "$TMP/par_$i.code" & done; wait
  OK200=$(cat "$TMP"/par_*.code | grep -c '^200$'); NOT200=$(cat "$TMP"/par_*.code | grep -vc '^200$')
}
closev() { post $V/$1/close-visit '{"diagnosis":"Viem da di ung"}' "$2"; }

echo "== Don du lieu thu nghiem cu =="
sql "DELETE FROM $BDB.inventory_transactions; DELETE FROM $BDB.invoice_items; DELETE FROM $BDB.invoices; DELETE FROM $BDB.prescription_items; DELETE FROM $BDB.prescriptions; DELETE FROM $BDB.medicines WHERE code NOT IN ('MED_AMOX','MED_VANG_7B','MED_PURE_4B','MED_DRON_DOG'); UPDATE $BDB.medicines SET is_active=TRUE, stock_quantity = CASE code WHEN 'MED_AMOX' THEN 200 WHEN 'MED_VANG_7B' THEN 50 WHEN 'MED_PURE_4B' THEN 40 ELSE 100 END, sale_price = CASE code WHEN 'MED_AMOX' THEN 15000 WHEN 'MED_VANG_7B' THEN 180000 WHEN 'MED_PURE_4B' THEN 190000 ELSE 45000 END;
DELETE FROM $CDB.imaging_attachments; DELETE FROM $CDB.imaging_results; DELETE FROM $CDB.lab_test_results; DELETE FROM $CDB.visit_service_detail_histories; DELETE FROM $CDB.visit_service_details; DELETE FROM $CDB.pet_visit_status_histories; DELETE FROM $CDB.pet_visits; DELETE FROM $CDB.pets; DELETE FROM pet_clinic_appointment_db.appointment_status_histories; DELETE FROM pet_clinic_appointment_db.appointments; DELETE FROM pet_clinic_auth_db.refresh_tokens; DELETE FROM pet_clinic_auth_db.users WHERE id > 1; ALTER TABLE $CDB.pets AUTO_INCREMENT = 1; ALTER TABLE $CDB.pet_visits AUTO_INCREMENT = 1; ALTER TABLE pet_clinic_auth_db.users AUTO_INCREMENT = 2;"
for q in billing-pharmacy-service.visit.closed_to_payment.dlq clinical-service.payment.completed.dlq appointment-service.visit.checked_in.dlq; do rmq DELETE "/queues/%2F/$q/contents" >/dev/null; done
rmq DELETE /queues/%2F/e2e.lowstock >/dev/null
rmq PUT /queues/%2F/e2e.lowstock '{"durable":false,"auto_delete":false}' >/dev/null
rmq POST /bindings/%2F/e/clinic.events/q/e2e.lowstock '{"routing_key":"stock.low_alert"}' >/dev/null

ADMIN=$(login admin 'Admin@123')
echo "== Chuan bi tai khoan =="
mkuser '{"username":"letan1","password":"LeTan@123","fullName":"Le Tan 1","phoneNumber":"0933333333","roleCode":"RECEPTIONIST"}' >/dev/null
DA=$(mkuser '{"username":"bs.a","password":"BacSi@123","fullName":"BS A","phoneNumber":"0911111111","roomNumber":"P01","roleCode":"VETERINARIAN"}')
DB=$(mkuser '{"username":"bs.b","password":"BacSi@123","fullName":"BS B","phoneNumber":"0922222222","roomNumber":"P02","roleCode":"VETERINARIAN"}')
DC=$(mkuser '{"username":"bs.c","password":"BacSi@123","fullName":"BS C","phoneNumber":"0911111113","roomNumber":"P03","roleCode":"VETERINARIAN"}')
DD=$(mkuser '{"username":"bs.d","password":"BacSi@123","fullName":"BS D","phoneNumber":"0911111114","roomNumber":"P04","roleCode":"VETERINARIAN"}')
REC=$(login letan1 'LeTan@123'); TA=$(login bs.a 'BacSi@123'); TB=$(login bs.b 'BacSi@123'); TC=$(login bs.c 'BacSi@123'); TD=$(login bs.d 'BacSi@123')
O1=$(post /api/v1/auth/users '{"password":"ChuNuoi@1","fullName":"Chu Nuoi 1","phoneNumber":"0944444441","roleCode":"PET_OWNER"}' "$REC" | jget "['data']['id']")
O2=$(post /api/v1/auth/users '{"password":"ChuNuoi@1","fullName":"Chu Nuoi 2","phoneNumber":"0944444442","roleCode":"PET_OWNER"}' "$REC" | jget "['data']['id']")
T1=$(login 0944444441 'ChuNuoi@1'); T2=$(login 0944444442 'ChuNuoi@1')
RECID=$(sql "SELECT id FROM pet_clinic_auth_db.users WHERE username='letan1'")
SVCS=$(getauth /api/v1/clinical/services "$REC")
SID_VAC=$(echo "$SVCS" | python -c "import sys,json; print([s['id'] for s in json.load(sys.stdin)['data'] if s['code']=='VAC_7B'][0])")
AMOX=$(sql "SELECT id FROM $BDB.medicines WHERE code='MED_AMOX'"); DRON=$(sql "SELECT id FROM $BDB.medicines WHERE code='MED_DRON_DOG'"); VANG=$(sql "SELECT id FROM $BDB.medicines WHERE code='MED_VANG_7B'")
echo "   bac si: $DA $DB $DC $DD | chu nuoi: $O1 $O2 | thuoc: AMOX=$AMOX DRON=$DRON VANG=$VANG"

echo; echo "== A. DANH MUC THUOC VA KHO (UC-37) =="
check "bac si tra cuu danh muc: 4 thuoc seed" "4" "$(getauth "$M" "$TA" | jget "['data']['totalElements']")"
check "tim theo tu khoa 'vaccine' -> 2 thuoc" "2" "$(getauth "$M?keyword=vaccine" "$TA" | jget "['data']['totalElements']")"
check "chu nuoi khong xem duoc danh muc -> 403" "SYS_1003" "$(getauth "$M" "$T1" | code)"
check "bac si khong them duoc thuoc -> 403" "SYS_1003" "$(post "$M" '{"code":"X","name":"X","dosageForm":"Vien","unit":"Vien","salePrice":1000}' "$TA" | code)"
R=$(post "$M" '{"code":" med_e2e ","name":"Thuoc thu nghiem","activeIngredient":"Paracetamol","dosageForm":"Vien nen","unit":"Vien","salePrice":2500,"initialStock":30,"minStockAlert":10}' "$ADMIN")
check "Admin them thuoc -> 201" "201" "$(echo "$R" | jget "['status']")"
check "ma thuoc duoc chuan hoa chu hoa" "MED_E2E" "$(echo "$R" | jget "['data']['code']")"
E2E=$(echo "$R" | jget "['data']['id']")
check "ton kho ban dau 30" "30" "$(echo "$R" | jget "['data']['stockQuantity']")"
check "trung ma thuoc -> PHARM_1411" "PHARM_1411" "$(post "$M" '{"code":"MED_E2E","name":"Trung","dosageForm":"Vien","unit":"Vien","salePrice":1000}' "$ADMIN" | code)"
check "gia am -> SYS_1001" "SYS_1001" "$(post "$M" '{"code":"NEG","name":"Am","dosageForm":"Vien","unit":"Vien","salePrice":-5}' "$ADMIN" | code)"
check "nhap kho +20 -> ton 50" "50" "$(post $M/$E2E/import '{"quantity":20,"notes":"Nhap lo thang 10"}' "$ADMIN" | jget "['data']['stockQuantity']")"
check "nhap kho so luong 0 -> SYS_1001" "SYS_1001" "$(post $M/$E2E/import '{"quantity":0}' "$ADMIN" | code)"
R=$(post $M/$E2E/adjust '{"delta":-45,"reason":"Kiem ke phat hien het han"}' "$ADMIN")
check "can chinh -45 -> ton 5" "5" "$(echo "$R" | jget "['data']['stockQuantity']")"
check "ton 5 <= nguong 10 -> lowStock" "True" "$(echo "$R" | jget "['data']['lowStock']")"
check "can chinh lam ton am -> PHARM_1412" "PHARM_1412" "$(post $M/$E2E/adjust '{"delta":-100,"reason":"Mat"}' "$ADMIN" | code)"
check "ton kho khong doi khi bi tu choi" "5" "$(sql "SELECT stock_quantity FROM $BDB.medicines WHERE id=$E2E")"
check "can chinh 0 -> SYS_1001" "SYS_1001" "$(post $M/$E2E/adjust '{"delta":0,"reason":"Khong doi"}' "$ADMIN" | code)"
check "can chinh thieu ly do -> SYS_1001" "SYS_1001" "$(post $M/$E2E/adjust '{"delta":3}' "$ADMIN" | code)"
check "bac si khong nhap kho duoc -> 403" "SYS_1003" "$(post $M/$E2E/import '{"quantity":5}' "$TA" | code)"
check "le tan khong xem nhat ky kho -> 403" "SYS_1003" "$(getauth $M/$E2E/transactions "$REC" | code)"
R=$(getauth $M/$E2E/transactions "$ADMIN")
check "nhat ky kho co 3 giao dich" "3" "$(echo "$R" | jget "['data']['totalElements']")"
check "giao dich moi nhat: ADJUSTMENT -45, ton sau 5" "ADJUSTMENT -45 5" "$(echo "$R" | python -c "import sys,json; t=json.load(sys.stdin)['data']['items'][0]; print(t['transactionType'], t['quantity'], t['balanceAfter'])")"
check "loc thuoc sap het hang co MED_E2E" "True" "$(getauth "$M?lowStock=true" "$ADMIN" | python -c "import sys,json; print('MED_E2E' in [m['code'] for m in json.load(sys.stdin)['data']['items']])")"
R=$(put $M/$E2E '{"name":"Thuoc thu nghiem 2","dosageForm":"Vien nen","unit":"Vien","salePrice":3000,"active":false}' "$ADMIN")
check "Admin sua gia + ngung kinh doanh" "3000.0 False" "$(echo "$R" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['salePrice'], d['active'])")"
check "sua danh muc khong lam doi ton kho" "5" "$(echo "$R" | jget "['data']['stockQuantity']")"
check "bac si khong thay thuoc da ngung -> PHARM_1405" "PHARM_1405" "$(getauth $M/$E2E "$TA" | code)"
check "danh sach bac si khong con thuoc ngung" "4" "$(getauth "$M" "$TA" | jget "['data']['totalElements']")"
check "Admin van thay thuoc da ngung" "False" "$(getauth $M/$E2E "$ADMIN" | jget "['data']['active']")"
open_visit TA $DA XNgung
check "bac si khong ke duoc thuoc da ngung -> PHARM_1405" "PHARM_1405" "$(post $P "$(rx $VID $E2E:1)" "$TA" | code)"
post $V/$VID/cancel '{"reason":"don dep"}' "$TA" >/dev/null

echo; echo "== B. TOAN HANH TRINH: KE DON -> CHOT CA -> HOA DON -> THANH TOAN -> XUAT THUOC =="
open_visit TA $DA Mimi; VB=$VID
check "ca dang IN_PROGRESS" "IN_PROGRESS" "$(vstat $VB)"
check "dich vu tiem phong lam tai phong bac si" "200" "$(post $V/$VB/services "{\"services\":[{\"serviceId\":$SID_VAC,\"quantity\":1}]}" "$TA" | jget "['status']")"
check "bac si khac ke don -> CLIN_1308" "CLIN_1308" "$(post $P "$(rx $VB $AMOX:1)" "$TB" | code)"
check "le tan khong ke don -> 403" "SYS_1003" "$(post $P "$(rx $VB $AMOX:1)" "$REC" | code)"
check "ke vuot ton kho -> PHARM_1406 (EX-13)" "PHARM_1406" "$(post $P "$(rx $VB $AMOX:500)" "$TA" | code)"
check "cung mot thuoc 2 dong -> SYS_1001" "SYS_1001" "$(post $P "$(rx $VB $AMOX:1 $AMOX:2)" "$TA" | code)"
check "thuoc khong ton tai -> PHARM_1405" "PHARM_1405" "$(post $P "$(rx $VB 99999:1)" "$TA" | code)"
check "don rong -> SYS_1001" "SYS_1001" "$(post $P "{\"visitId\":$VB,\"items\":[]}" "$TA" | code)"
check "ke don khong co visitId -> SYS_1001" "SYS_1001" "$(post $P '{"items":[{"medicineId":1,"quantity":1,"dosage":"a","frequency":"b","durationDays":1}]}' "$TA" | code)"
R=$(post $P "$(rx $VB $AMOX:10 $DRON:2)" "$TA")
check "ke don hop le -> 201" "201" "$(echo "$R" | jget "['status']")"
RXB=$(echo "$R" | jget "['data']['id']")
check "don PRESCRIBED, tong 240000" "PRESCRIBED 240000.0" "$(echo "$R" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['status'], d['totalAmount'])")"
check "don chot don gia hien tai (15000, 45000)" "15000.0 45000.0" "$(echo "$R" | python -c "import sys,json; i=json.load(sys.stdin)['data']['items']; print(i[0]['unitPrice'], i[1]['unitPrice'])")"
check "ke don CHUA tru kho (BR-29)" "200 100" "$(stock MED_AMOX) $(stock MED_DRON_DOG)"
check "ke don lan 2 cho cung dot kham -> PHARM_1408" "PHARM_1408" "$(post $P "$(rx $VB $AMOX:1)" "$TA" | code)"
check "sua don: giam AMOX con 8 -> tong 210000" "210000.0" "$(put $P/$RXB "$(rx $VB $AMOX:8 $DRON:2)" "$TA" | jget "['data']['totalAmount']")"
check "sua don lai AMOX 10 -> tong 240000" "240000.0" "$(put $P/$RXB "$(rx $VB $AMOX:10 $DRON:2)" "$TA" | jget "['data']['totalAmount']")"
check "doi gia thuoc sau khi ke KHONG doi don da ke (snapshot)" "15000.0" "$(put $M/$AMOX '{"name":"Clavamox 250mg","dosageForm":"Vien nen","unit":"Vien","salePrice":16000}' "$ADMIN" >/dev/null; getauth $P/$RXB "$TA" | jget "['data']['items'][0]['unitPrice']")"
put $M/$AMOX '{"name":"Clavamox 250mg","dosageForm":"Vien nen","unit":"Vien","salePrice":15000}' "$ADMIN" >/dev/null
check "chu nuoi xem don thuoc cua thu cung minh" "Mimi" "$(getauth $P/by-visit/$VB "$T1" | jget "['data']['petName']")"
check "chu nuoi khac khong xem duoc -> PHARM_1404" "PHARM_1404" "$(getauth $P/by-visit/$VB "$T2" | code)"
check "le tan loc don theo dot kham" "1" "$(getauth "$P?visitId=$VB" "$REC" | jget "['data']['totalElements']")"
check "CHUA co hoa don khi ca chua chot" "BILL_1401" "$(getauth $B/by-visit/$VB "$REC" | code)"
check "bac si chot ca" "200" "$(closev $VB "$TA" | jget "['status']")"
check "ca sang WAITING_PAYMENT" "WAITING_PAYMENT" "$(vstat $VB)"
IVB=$(wait_invoice $VB)
check "hoa don PENDING duoc tu lap tu su kien chot ca" "True" "$([ -n "$IVB" ] && echo True || echo False)"
INV=$(getauth $B/$IVB "$REC")
check "hoa don: PENDING, chua co thu ngan, gan voi don thuoc" "PENDING None $RXB" "$(echo "$INV" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['paymentStatus'], d['cashierId'], d['prescriptionId'])")"
check "ma hoa don dang INV-yyyy-NNNNN" "True" "$(echo "$INV" | python -c "import re,sys,json; print(bool(re.fullmatch(r'INV-2026-\d{5}', json.load(sys.stdin)['data']['invoiceCode'])))")"
check "hoa don co 2 dong dich vu + 2 dong thuoc" "2 2" "$(echo "$INV" | python -c "import sys,json; i=json.load(sys.stdin)['data']['items']; print(len([x for x in i if x['itemType']=='SERVICE']), len([x for x in i if x['itemType']=='MEDICINE']))")"
check "tien thuoc 240000, tien dich vu khop CSDL clinical" "240000.0 True" "$(echo "$INV" | python -c "
import sys,json
d=json.load(sys.stdin)['data']
print(d['totalMedicineAmount'], abs(d['totalServiceAmount'] - $(sql "SELECT SUM(subtotal) FROM $CDB.visit_service_details WHERE visit_id=$VB AND status='COMPLETED'")) < 0.005)")"
check "final = dich vu + thuoc + VAT - giam gia" "True" "$(echo "$INV" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(abs(d['finalAmount'] - (d['totalServiceAmount']+d['totalMedicineAmount']+d['totalVatAmount']-d['discountAmount']))<0.005)")"
check "hoa don co ten benh nhan lay tu clinical" "Mimi" "$(echo "$INV" | jget "['data']['petName']")"
GROSS=$(echo "$INV" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(int(d['totalServiceAmount']+d['totalMedicineAmount']+d['totalVatAmount']))")
check "sau chot ca: sua don -> PHARM_1409" "PHARM_1409" "$(put $P/$RXB "$(rx $VB $AMOX:1)" "$TA" | code)"
check "sau chot ca: ke don moi -> PHARM_1409" "PHARM_1409" "$(post $P "$(rx $VB $AMOX:1)" "$TA" | code)"
check "sau chot ca: bac si huy don -> PHARM_1409" "PHARM_1409" "$(post $P/$RXB/cancel '' "$TA" | code)"
check "danh sach cho thanh toan co hoa don nay" "True" "$(getauth "$B?status=PENDING&ascending=true" "$REC" | python -c "import sys,json; print($IVB in [i['id'] for i in json.load(sys.stdin)['data']['items']])")"
check "tim hoa don theo ma" "$IVB" "$(getauth "$B?code=$(echo "$INV" | jget "['data']['invoiceCode']")" "$REC" | jget "['data']['items'][0]['id']")"
check "loc hoa don PAID khong co hoa don nay" "False" "$(getauth "$B?status=PAID" "$REC" | python -c "import sys,json; print($IVB in [i['id'] for i in json.load(sys.stdin)['data']['items']])")"
check "xuat thuoc khi chua thanh toan -> BILL_1413" "BILL_1413" "$(post $P/$RXB/dispense '' "$REC" | code)"
check "giam gia vuot tong vien phi -> BILL_1402 (EX-14)" "BILL_1402" "$(put $B/$IVB/discount "{\"discountAmount\":$((GROSS+1))}" "$REC" | code)"
check "giam gia am -> SYS_1001" "SYS_1001" "$(put $B/$IVB/discount '{"discountAmount":-1}' "$REC" | code)"
check "chu nuoi khong chinh duoc giam gia -> 403" "SYS_1003" "$(put $B/$IVB/discount '{"discountAmount":1}' "$T1" | code)"
R=$(put $B/$IVB/discount '{"discountAmount":20000,"notes":"Khach than thiet"}' "$REC")
check "giam gia 20000 -> final = tong - 20000" "$((GROSS-20000)).0" "$(echo "$R" | jget "['data']['finalAmount']")"
check "bac si khong xac nhan thanh toan duoc -> 403" "SYS_1003" "$(post $B/$IVB/confirm-payment '' "$TA" | code)"
R=$(post $B/$IVB/confirm-payment '' "$REC")
check "thu ngan xac nhan thanh toan" "PAID $RECID" "$(echo "$R" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['paymentStatus'], d['cashierId'])")"
check "co thoi diem thu tien" "True" "$(echo "$R" | python -c "import sys,json; print(json.load(sys.stdin)['data']['paidAt'] is not None)")"
sleep 3
check "con don thuoc chua phat -> ca van WAITING_PAYMENT (BR-28)" "WAITING_PAYMENT" "$(vstat $VB)"
check "thanh toan lan 2 -> BILL_1403" "BILL_1403" "$(post $B/$IVB/confirm-payment '' "$REC" | code)"
check "sua giam gia sau khi da tra -> BILL_1403" "BILL_1403" "$(put $B/$IVB/discount '{"discountAmount":0}' "$REC" | code)"
check "don thuoc hien trang thai hoa don PAID" "PAID" "$(getauth $P/$RXB "$REC" | jget "['data']['invoiceStatus']")"
check "danh sach cho phat thuoc co don nay" "True" "$(getauth "$P?awaitingDispense=true" "$REC" | python -c "import sys,json; print($RXB in [i['id'] for i in json.load(sys.stdin)['data']['items']])")"
check "bac si khong xuat thuoc duoc -> 403" "SYS_1003" "$(post $P/$RXB/dispense '' "$TA" | code)"
R=$(post $P/$RXB/dispense '' "$REC")
check "xuat thuoc -> DISPENSED" "DISPENSED $RECID" "$(echo "$R" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['status'], d['dispensedBy'])")"
check "ton kho bi tru dung: AMOX 190, DRON 98" "190 98" "$(stock MED_AMOX) $(stock MED_DRON_DOG)"
check "nhat ky kho: 2 giao dich EXPORT_PRESCRIPTION tham chieu don" "2" "$(sql "SELECT COUNT(*) FROM $BDB.inventory_transactions WHERE transaction_type='EXPORT_PRESCRIPTION' AND reference_id=$RXB")"
check "nhat ky ghi dung ton sau khi xuat (190, 98)" "98 190" "$(sql "SELECT GROUP_CONCAT(balance_after ORDER BY medicine_id DESC SEPARATOR ' ') FROM $BDB.inventory_transactions WHERE reference_id=$RXB")"
check "xuat xong -> ca khám COMPLETED (qua su kien payment.completed)" "True" "$(wait_visit $VB COMPLETED 15 && echo True || echo False)"
check "lich su ghi dung thu ngan lam nguoi chuyen COMPLETED" "$RECID" "$(sql "SELECT changed_by_user_id FROM $CDB.pet_visit_status_histories WHERE visit_id=$VB AND to_status='COMPLETED'")"
check "xuat thuoc lan 2 -> PHARM_1407 (EX-16)" "PHARM_1407" "$(post $P/$RXB/dispense '' "$REC" | code)"
check "xuat lan 2 khong tru kho them" "190 98" "$(stock MED_AMOX) $(stock MED_DRON_DOG)"
check "don da xuat khong con trong danh sach cho phat" "False" "$(getauth "$P?awaitingDispense=true" "$REC" | python -c "import sys,json; print($RXB in [i['id'] for i in json.load(sys.stdin)['data']['items']])")"
check "hoa don khong ton tai -> BILL_1401" "BILL_1401" "$(getauth $B/999999 "$REC" | code)"

echo; echo "== C. CA KHONG KE DON: THANH TOAN XONG LA HOAN TAT =="
open_visit TB $DB Bobby; VC=$VID
closev $VC "$TB" >/dev/null
IVC=$(wait_invoice $VC)
INV=$(getauth $B/$IVC "$REC")
check "hoa don chi co dong dich vu, khong co thuoc" "None 0.0" "$(echo "$INV" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['prescriptionId'], d['totalMedicineAmount'])")"
check "xac nhan thanh toan" "PAID" "$(post $B/$IVC/confirm-payment '' "$REC" | jget "['data']['paymentStatus']")"
check "khong co don thuoc -> ca COMPLETED ngay" "True" "$(wait_visit $VC COMPLETED 15 && echo True || echo False)"

echo; echo "== D. HUY DON THUOC =="
open_visit TC $DC Kiki; VD=$VID
R=$(post $P "$(rx $VD $AMOX:3)" "$TC"); RXD=$(echo "$R" | jget "['data']['id']")
check "bac si huy don khi con dang kham" "CANCELLED" "$(post $P/$RXD/cancel '' "$TC" | jget "['data']['status']")"
check "huy don khong bien dong kho" "190" "$(stock MED_AMOX)"
check "chu nuoi khong thay don da huy" "PHARM_1404" "$(getauth $P/by-visit/$VD "$T1" | code)"
check "huy don lan 2 -> PHARM_1410" "PHARM_1410" "$(post $P/$RXD/cancel '' "$TC" | code)"
R=$(post $P "$(rx $VD $DRON:1)" "$TC")
check "ke lai sau khi huy dung lai chinh don cu (visit_id UNIQUE)" "201 $RXD PRESCRIBED" "$(echo "$R" | python -c "import sys,json; d=json.load(sys.stdin); print(d['status'], d['data']['id'], d['data']['status'])")"
check "don duoc dung lai chi con thuoc moi" "1" "$(echo "$R" | jget "['data']['items'].__len__()")"
post $P/$RXD/cancel '' "$TC" >/dev/null
closev $VD "$TC" >/dev/null
IVD=$(wait_invoice $VD)
check "don da huy khong vao hoa don" "None 0.0" "$(getauth $B/$IVD "$REC" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['prescriptionId'], d['totalMedicineAmount'])")"
post $B/$IVD/confirm-payment '' "$REC" >/dev/null
wait_visit $VD COMPLETED 15 >/dev/null

# Khach xin toa mua ngoai: thu ngan huy don khi hoa don con PENDING
open_visit TD $DD Coco; VE=$VID
R=$(post $P "$(rx $VE $AMOX:5 $VANG:1)" "$TD"); RXE=$(echo "$R" | jget "['data']['id']")
closev $VE "$TD" >/dev/null
IVE=$(wait_invoice $VE)
SVC=$(getauth $B/$IVE "$REC" | python -c "import sys,json; print(int(json.load(sys.stdin)['data']['totalServiceAmount']))")
check "hoa don co tien thuoc 255000" "255000.0" "$(getauth $B/$IVE "$REC" | jget "['data']['totalMedicineAmount']")"
put $B/$IVE/discount "{\"discountAmount\":$((SVC+100000))}" "$REC" >/dev/null
check "bac si khong huy duoc don khi ca da chot" "PHARM_1409" "$(post $P/$RXE/cancel '' "$TD" | code)"
check "chu nuoi khong huy don -> 403" "SYS_1003" "$(post $P/$RXE/cancel '' "$T1" | code)"
R=$(post $P/$RXE/cancel '' "$REC")
check "thu ngan huy don (khach mua ngoai) -> CANCELLED" "CANCELLED" "$(echo "$R" | jget "['data']['status']")"
INV=$(getauth $B/$IVE "$REC")
check "hoa don bo het dong thuoc, mat lien ket don" "0 None 0.0" "$(echo "$INV" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(len([x for x in d['items'] if x['itemType']=='MEDICINE']), d['prescriptionId'], d['totalMedicineAmount'])")"
check "giam gia bi keo ve dung muc tran moi, final = 0" "$SVC.0 0.0" "$(echo "$INV" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['discountAmount'], d['finalAmount'])")"
check "thanh toan hoa don sau khi bo thuoc" "PAID" "$(post $B/$IVE/confirm-payment '' "$REC" | jget "['data']['paymentStatus']")"
check "khong con thuoc de phat -> ca COMPLETED ngay" "True" "$(wait_visit $VE COMPLETED 15 && echo True || echo False)"
check "huy don khong biến dong kho" "190" "$(stock MED_AMOX)"

echo; echo "== E. THIEU KHO TAI THOI DIEM XUAT (EX-15): ROLLBACK TOAN BO =="
RACE=$(post "$M" '{"code":"MED_RACE","name":"Thuoc race","dosageForm":"Vien","unit":"Vien","salePrice":10000,"initialStock":5,"minStockAlert":1}' "$ADMIN" | jget "['data']['id']")
open_visit TA $DA Mun; VF=$VID
R=$(post $P "$(rx $VF $AMOX:3 $RACE:5)" "$TA"); RXF=$(echo "$R" | jget "['data']['id']")
check "ke 3 AMOX + 5 RACE (RACE ton dung 5) -> 201" "201" "$(echo "$R" | jget "['status']")"
closev $VF "$TA" >/dev/null
IVF=$(wait_invoice $VF)
post $B/$IVF/confirm-payment '' "$REC" >/dev/null
check "thu ngan khong huy duoc don sau khi da tra tien -> BILL_1403" "BILL_1403" "$(post $P/$RXF/cancel '' "$REC" | code)"
post $M/$RACE/adjust '{"delta":-3,"reason":"Ca cap cuu khac lay thuoc"}' "$ADMIN" >/dev/null
check "RACE con 2" "2" "$(stock MED_RACE)"
check "xuat thuoc khi RACE thieu -> PHARM_1406" "PHARM_1406" "$(post $P/$RXF/dispense '' "$REC" | code)"
check "ROLLBACK: AMOX (xu ly truoc) van 190, khong bi tru" "190 2" "$(stock MED_AMOX) $(stock MED_RACE)"
check "ROLLBACK: khong co dong nhat ky kho nao cho don nay" "0" "$(sql "SELECT COUNT(*) FROM $BDB.inventory_transactions WHERE reference_id=$RXF")"
check "don van PRESCRIBED, ca van WAITING_PAYMENT" "PRESCRIBED WAITING_PAYMENT" "$(sql "SELECT status FROM $BDB.prescriptions WHERE id=$RXF") $(vstat $VF)"
post $M/$RACE/import '{"quantity":10,"notes":"Bo sung"}' "$ADMIN" >/dev/null
check "bo sung kho roi xuat lai -> DISPENSED" "DISPENSED" "$(post $P/$RXF/dispense '' "$REC" | jget "['data']['status']")"
check "ton kho: AMOX 187, RACE 7" "187 7" "$(stock MED_AMOX) $(stock MED_RACE)"
check "ca COMPLETED" "True" "$(wait_visit $VF COMPLETED 15 && echo True || echo False)"

echo; echo "== F. DONG THOI =="
open_visit TB $DB Race1; VG=$VID
closev $VG "$TB" >/dev/null
IVG=$(wait_invoice $VG)
par 6 $B/$IVG/confirm-payment "$REC"
check "6 yeu cau thanh toan song song: dung 1 thanh cong" "1 5" "$OK200 $NOT200"
check "cac yeu cau con lai deu BILL_1403" "5" "$(cat "$TMP"/par_*.json | grep -o 'BILL_1403' | wc -l | tr -d ' ')"
wait_visit $VG COMPLETED 15 >/dev/null
check "chi 1 lan chuyen COMPLETED trong lich su" "1" "$(sql "SELECT COUNT(*) FROM $CDB.pet_visit_status_histories WHERE visit_id=$VG AND to_status='COMPLETED'")"

open_visit TC $DC Race2; VH=$VID
R=$(post $P "$(rx $VH $AMOX:2)" "$TC"); RXH=$(echo "$R" | jget "['data']['id']")
closev $VH "$TC" >/dev/null
IVH=$(wait_invoice $VH)
post $B/$IVH/confirm-payment '' "$REC" >/dev/null
BEFORE=$(stock MED_AMOX)
par 6 $P/$RXH/dispense "$REC"
check "6 yeu cau xuat thuoc song song: dung 1 thanh cong" "1 5" "$OK200 $NOT200"
check "cac yeu cau con lai deu PHARM_1407" "5" "$(cat "$TMP"/par_*.json | grep -o 'PHARM_1407' | wc -l | tr -d ' ')"
check "ton kho chi bi tru 1 lan (2 vien)" "$((BEFORE-2))" "$(stock MED_AMOX)"
check "chi 1 dong nhat ky xuat kho" "1" "$(sql "SELECT COUNT(*) FROM $BDB.inventory_transactions WHERE reference_id=$RXH")"
wait_visit $VH COMPLETED 15 >/dev/null

# Hai don cung tranh nhau 5 vien cuoi cung
post $M/$RACE/adjust "{\"delta\":-2,\"reason\":\"Dua ve 5\"}" "$ADMIN" >/dev/null
check "RACE dung 5 vien" "5" "$(stock MED_RACE)"
open_visit TA $DA Tranh1; VI=$VID; open_visit TD $DD Tranh2; VJ=$VID
RXI=$(post $P "$(rx $VI $RACE:5)" "$TA" | jget "['data']['id']"); RXJ=$(post $P "$(rx $VJ $RACE:5)" "$TD" | jget "['data']['id']")
check "ca hai don deu ke duoc luc kho con 5 (kiem tra mem)" "True" "$([ -n "$RXI" ] && [ -n "$RXJ" ] && echo True || echo False)"
closev $VI "$TA" >/dev/null; closev $VJ "$TD" >/dev/null
IVI=$(wait_invoice $VI); IVJ=$(wait_invoice $VJ)
post $B/$IVI/confirm-payment '' "$REC" >/dev/null; post $B/$IVJ/confirm-payment '' "$REC" >/dev/null
rm -f "$TMP"/par_*
curl -s -o "$TMP/par_1.json" -w '%{http_code}\n' -X POST "$G$P/$RXI/dispense" -H "$J" -H "Authorization: Bearer $REC" -d '{}' > "$TMP/par_1.code" &
curl -s -o "$TMP/par_2.json" -w '%{http_code}\n' -X POST "$G$P/$RXJ/dispense" -H "$J" -H "Authorization: Bearer $REC" -d '{}' > "$TMP/par_2.code" &
wait
check "2 don tranh 5 vien cuoi: dung 1 thanh cong, 1 bi PHARM_1406" "1 1" "$(cat "$TMP"/par_*.code | grep -c '^200$') $(cat "$TMP"/par_*.json | grep -o 'PHARM_1406' | wc -l | tr -d ' ')"
check "ton kho ve 0, khong bao gio am" "0" "$(stock MED_RACE)"
check "don thua cuoc van PRESCRIBED" "1" "$(sql "SELECT COUNT(*) FROM $BDB.prescriptions WHERE id IN ($RXI,$RXJ) AND status='PRESCRIBED'")"
check "don thang cuoc DISPENSED" "1" "$(sql "SELECT COUNT(*) FROM $BDB.prescriptions WHERE id IN ($RXI,$RXJ) AND status='DISPENSED'")"

echo; echo "== G. CUU HO VA IDEMPOTENT =="
open_visit TB $DB Chua; VK=$VID
check "lap hoa don cho ca chua chot -> BILL_1415" "BILL_1415" "$(post $B/from-visit/$VK '' "$REC" | code)"
post $V/$VK/cancel '{"reason":"don dep"}' "$TB" >/dev/null
# Mo phong mat su kien: xoa hoa don cua ca C (da COMPLETED) roi lap lai bang endpoint cuu ho
sql "DELETE FROM $BDB.invoice_items WHERE invoice_id=$IVC; DELETE FROM $BDB.invoices WHERE id=$IVC;"
check "mat hoa don -> khong tim thay" "BILL_1401" "$(getauth $B/by-visit/$VC "$REC" | code)"
R=$(post $B/from-visit/$VC '' "$REC")
IVC2=$(echo "$R" | jget "['data']['id']")
check "lap hoa don cuu ho -> PENDING co dong dich vu" "PENDING True" "$(echo "$R" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['paymentStatus'], len(d['items'])>0)")"
check "goi lai khong tao them hoa don (idempotent)" "$IVC2" "$(post $B/from-visit/$VC '' "$REC" | jget "['data']['id']")"
EVT="{\"eventId\":\"$(python -c 'import uuid;print(uuid.uuid4())')\",\"occurredAt\":\"2026-10-28T14:00:00Z\",\"actorUserId\":$RECID,\"visitId\":$VB,\"visitCode\":\"X\",\"petId\":1,\"doctorId\":$DA,\"abandoned\":false}"
rabbit_publish visit.closed_to_payment "$EVT" >/dev/null; rabbit_publish visit.closed_to_payment "$EVT" >/dev/null
sleep 3
check "nhan lai su kien chot ca 2 lan: van dung 1 hoa don cho ca" "1" "$(sql "SELECT COUNT(*) FROM $BDB.invoices WHERE visit_id=$VB")"
check "hoa don cu khong bi ghi de (van PAID)" "PAID" "$(getauth $B/$IVB "$REC" | jget "['data']['paymentStatus']")"
BAD="{\"eventId\":\"$(python -c 'import uuid;print(uuid.uuid4())')\",\"occurredAt\":\"2026-10-28T14:00:00Z\",\"actorUserId\":$RECID,\"visitId\":999999,\"visitCode\":\"X\",\"petId\":1,\"doctorId\":$DA,\"abandoned\":false}"
rabbit_publish visit.closed_to_payment "$BAD" >/dev/null
DLQ=0; for i in $(seq 1 30); do DLQ=$(rmq GET "/queues/%2F/billing-pharmacy-service.visit.closed_to_payment.dlq" | python -c "import sys,json; print(json.load(sys.stdin).get('messages',0))"); [ "$DLQ" = "1" ] && break; sleep 1; done
check "su kien cho dot kham khong ton tai -> vao DLQ sau khi thu lai" "1" "$DLQ"
rmq DELETE "/queues/%2F/billing-pharmacy-service.visit.closed_to_payment.dlq/contents" >/dev/null

echo; echo "== H. CANH BAO TON KHO THAP (stock.low_alert) =="
MSGS=$(rmq POST /queues/%2F/e2e.lowstock/get '{"count":50,"ackmode":"ack_requeue_false","encoding":"auto"}')
check "co canh bao cho MED_E2E (can chinh giam) " "True" "$(echo "$MSGS" | python -c "import sys,json; print(any('MED_E2E' in m['payload'] for m in json.load(sys.stdin)))")"
check "co canh bao cho MED_RACE (xuat thuoc ve 0)" "True" "$(echo "$MSGS" | python -c "import sys,json; print(any('MED_RACE' in m['payload'] for m in json.load(sys.stdin)))")"
check "khong co canh bao thua cho AMOX (ton kho cao)" "False" "$(echo "$MSGS" | python -c "import sys,json; print(any('MED_AMOX' in m['payload'] for m in json.load(sys.stdin)))")"
rmq DELETE /queues/%2F/e2e.lowstock >/dev/null

echo; echo "== I. BAO MAT VA RO KHOA =="
check "khong token -> 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' $G$B)"
check "chu nuoi khong xem danh sach hoa don -> 403" "SYS_1003" "$(getauth $B "$T1" | code)"
check "bac si khong xem danh sach hoa don -> 403" "SYS_1003" "$(getauth $B "$TA" | code)"
check "qua Gateway /internal/** -> 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' $G/internal/clinical/visits/1 -H "Authorization: Bearer $REC")"
check "khong con khoa MySQL (GET_LOCK) nao bi ro" "0" "$(sql "SELECT COUNT(*) FROM performance_schema.metadata_locks WHERE OBJECT_TYPE='USER LEVEL LOCK'")"
check "khong co ton kho am" "0" "$(sql "SELECT COUNT(*) FROM $BDB.medicines WHERE stock_quantity < 0")"
check "moi hoa don PAID co thu ngan va thoi diem thu" "0" "$(sql "SELECT COUNT(*) FROM $BDB.invoices WHERE payment_status='PAID' AND (cashier_id IS NULL OR paid_at IS NULL)")"
check "moi hoa don: final = dich vu + thuoc + VAT - giam gia" "0" "$(sql "SELECT COUNT(*) FROM $BDB.invoices WHERE ABS(final_amount - (total_service_amount + total_medicine_amount + total_vat_amount - discount_amount)) > 0.005")"
check "tong dong hoa don khop tong hoa don" "0" "$(sql "SELECT COUNT(*) FROM $BDB.invoices i WHERE ABS(i.total_service_amount - COALESCE((SELECT SUM(subtotal) FROM $BDB.invoice_items x WHERE x.invoice_id=i.id AND x.item_type='SERVICE'),0)) > 0.005 OR ABS(i.total_medicine_amount - COALESCE((SELECT SUM(subtotal) FROM $BDB.invoice_items x WHERE x.invoice_id=i.id AND x.item_type='MEDICINE'),0)) > 0.005")"
check "moi don DISPENSED deu co nguoi phat + thoi diem" "0" "$(sql "SELECT COUNT(*) FROM $BDB.prescriptions WHERE status='DISPENSED' AND (dispensed_by IS NULL OR dispensed_at IS NULL)")"
LOGS=$(docker compose logs --no-color --since 20m billing-pharmacy-service 2>&1 | grep -E " ERROR " | grep -v -E "Optimistic|BILL_|PHARM_|CLIN_|999999|VISIT_NOT_FOUND|Retries exhausted|Listener|AmqpRejectAndDontRequeue|Execution of Rabbit" | cut -c1-200 | head -5)
check "log billing-pharmacy-service khong co ERROR bat thuong" "" "$LOGS"

echo; echo "============================================"
echo "   KET QUA: $PASS dat, $FAIL khong dat"
echo "============================================"
