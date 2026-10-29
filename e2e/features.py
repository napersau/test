"""E2E cac chuc nang bo sung qua Gateway: tai khoan, danh muc xet nghiem, hang doi 3 bac, benh an tron doi, bao cao,
lich hen (ten + het han PENDING), huy hoa don + mo lai dot kham.
Yeu cau: appointment-service chay voi BOOKING_PENDING_EXPIRY_CRON='*/5 * * * * *' de thu quet PENDING nhanh."""
import json, os, subprocess, sys, time, urllib.request, urllib.error

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
ENV = {}
for line in open(".env", encoding="utf-8"):
    if "=" in line and not line.startswith("#"):
        k, v = line.strip().split("=", 1)
        ENV[k] = v
G = "http://localhost:8080"
PASS = FAIL = 0
SKIP = 0


def check(name, expected, actual):
    global PASS, FAIL
    if expected == actual:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name} -> mong doi {expected!r}, nhan {actual!r}")


def skip(name, why):
    global SKIP
    SKIP += 1
    print(f"  [SKIP] {name} ({why})")


def http(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else (b"{}" if method in ("POST", "PUT") else None)
    req = urllib.request.Request(G + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return json.loads(raw)
        except Exception:
            return {"status": e.code, "errorCode": None, "raw": raw}


def code(resp):
    return resp.get("errorCode")


def data(resp):
    return resp.get("data")


def sql(q):
    out = subprocess.run(["docker", "compose", "exec", "-T", "mysql-server", "sh", "-c",
                          'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" -N'],
                         input=q, capture_output=True, text=True, encoding="utf-8")
    return out.stdout.strip()


def rmq(method, path, body=None):
    cmd = f"curl -s -u '{ENV['RABBITMQ_USERNAME']}:{ENV['RABBITMQ_PASSWORD']}' -H 'content-type: application/json' -X {method} http://rabbitmq-broker:15672/api{path}"
    if body is not None:
        cmd += " --data-binary @-"
    out = subprocess.run(["docker", "compose", "exec", "-T", "api-gateway", "sh", "-c", cmd],
                         input=json.dumps(body) if body is not None else None, capture_output=True, text=True, encoding="utf-8")
    try:
        return json.loads(out.stdout) if out.stdout.strip() else {}
    except Exception:
        return {}


def login(username, password):
    return http("POST", "/api/v1/auth/login", {"username": username, "password": password})["data"]["accessToken"]


def wait_for(predicate, timeout=20, step=0.5):
    end = time.time() + timeout
    while time.time() < end:
        try:
            if predicate():
                return True
        except Exception:
            pass
        time.sleep(step)
    return False


BDB, CDB, ADB = "pet_clinic_billing_pharmacy_db", "pet_clinic_clinical_db", "pet_clinic_appointment_db"
V = "/api/v1/clinical/pet-visits"

print("== Don du lieu thu nghiem cu ==")
subprocess.run(["bash", os.path.join(os.path.dirname(os.path.abspath(__file__)), "reset_data.sh")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
sql(f"DELETE FROM {BDB}.inventory_transactions; DELETE FROM {BDB}.invoice_items; DELETE FROM {BDB}.invoices; DELETE FROM {BDB}.prescription_items; DELETE FROM {BDB}.prescriptions;"
    f"UPDATE {BDB}.medicines SET stock_quantity=200 WHERE code='MED_AMOX';"
    f"DELETE FROM {CDB}.imaging_attachments; DELETE FROM {CDB}.imaging_results; DELETE FROM {CDB}.lab_test_results; DELETE FROM {CDB}.visit_service_detail_histories; DELETE FROM {CDB}.visit_service_details; DELETE FROM {CDB}.pet_visit_status_histories; DELETE FROM {CDB}.pet_visits; DELETE FROM {CDB}.pets;"
    f"DELETE FROM {ADB}.appointment_status_histories; DELETE FROM {ADB}.appointments; DELETE FROM pet_clinic_auth_db.refresh_tokens; DELETE FROM pet_clinic_auth_db.users WHERE id > 1;"
    f"DELETE FROM {CDB}.service_lab_test_items; DELETE FROM {CDB}.lab_test_reference_ranges WHERE lab_test_item_id > 4; DELETE FROM {CDB}.lab_test_items WHERE id > 4;"
    f"INSERT INTO {CDB}.service_lab_test_items (service_id, lab_test_item_id) SELECT s.id, l.id FROM {CDB}.services s JOIN {CDB}.lab_test_items l ON l.code IN ('WBC','RBC','HGB','PLT') WHERE s.code='LAB_CBC';"
    f"ALTER TABLE {CDB}.lab_test_items AUTO_INCREMENT=5;"
    f"ALTER TABLE {CDB}.pets AUTO_INCREMENT=1; ALTER TABLE {CDB}.pet_visits AUTO_INCREMENT=1; ALTER TABLE pet_clinic_auth_db.users AUTO_INCREMENT=2;")
for q in ["billing-pharmacy-service.visit.closed_to_payment.dlq", "clinical-service.payment.completed.dlq", "appointment-service.visit.checked_in.dlq",
          "notification-service.appointment.created.dlq"]:
    rmq("DELETE", f"/queues/%2F/{q}/contents")

admin = login("admin", "Admin@123")


def mkuser(body, token=None):
    return http("POST", "/api/v1/auth/users", body, token or admin)["data"]["id"]


print("== Chuan bi tai khoan ==")
mkuser({"username": "letan1", "password": "LeTan@123", "fullName": "Le Tan 1", "phoneNumber": "0933333333", "roleCode": "RECEPTIONIST"})
DA = mkuser({"username": "bs.a", "password": "BacSi@123", "fullName": "BS A", "phoneNumber": "0911111111", "roomNumber": "P01", "roleCode": "VETERINARIAN"})
DB = mkuser({"username": "bs.b", "password": "BacSi@123", "fullName": "BS B", "phoneNumber": "0922222222", "roomNumber": "P02", "roleCode": "VETERINARIAN"})
mkuser({"username": "kt.lab", "password": "KyThuat@1", "fullName": "KTV Lab", "phoneNumber": "0955555551", "roomNumber": "LAB01", "roleCode": "LAB_TECHNICIAN"})
rec = login("letan1", "LeTan@123"); TA = login("bs.a", "BacSi@123"); TB = login("bs.b", "BacSi@123"); lab = login("kt.lab", "KyThuat@1")
O1 = http("POST", "/api/v1/auth/users", {"password": "ChuNuoi@1", "fullName": "Nguyen Van A", "phoneNumber": "0944444441", "email": "chunuoi1@example.com", "roleCode": "PET_OWNER"}, rec)["data"]["id"]
O2 = http("POST", "/api/v1/auth/users", {"password": "ChuNuoi@1", "fullName": "Tran Thi B", "phoneNumber": "0944444442", "roleCode": "PET_OWNER"}, rec)["data"]["id"]
t1 = login("0944444441", "ChuNuoi@1"); t2 = login("0944444442", "ChuNuoi@1")
RECID = int(sql("SELECT id FROM pet_clinic_auth_db.users WHERE username='letan1'"))
AMOX = http("GET", "/api/v1/pharmacy/medicines?keyword=MED_AMOX", None, admin)["data"]["items"][0]["id"]
svcs = http("GET", "/api/v1/clinical/services", None, rec)["data"]
SID = {s["code"]: s["id"] for s in svcs}
species = {s["code"]: s["id"] for s in http("GET", "/api/v1/species", None, rec)["data"]}
DOG, CAT = species["DOG"], species["CAT"]


def mkpet(owner, name, sp=None):
    return http("POST", "/api/v1/pets", {"ownerId": owner, "speciesId": sp or DOG, "name": name}, rec)["data"]["id"]


def checkin(pet, emergency=False, appointment=None):
    body = {"emergency": emergency, "initialSymptoms": "Bo an"}
    body.update({"appointmentId": appointment} if appointment else {"petId": pet})
    return http("POST", f"{V}/check-in", body, rec)


def vstat(vid):
    return http("GET", f"{V}/{vid}", None, rec)["data"]["status"]


def start_exam(vid, doc_id, token):
    http("POST", f"{V}/{vid}/assign", {"doctorId": doc_id}, rec)
    return http("POST", f"{V}/{vid}/start-exam", {"weightAtVisit": 12.5, "temperature": 38.6, "clinicalNotes": "x"}, token)


def rx_body(vid, qty):
    return {"visitId": vid, "doctorNotes": "Cho an nhe", "items": [{"medicineId": AMOX, "quantity": qty, "dosage": "1 vien", "frequency": "2 lan/ngay", "durationDays": 5}]}


def invoice_of(vid, status=None, timeout=20):
    holder = {}

    def ok():
        r = http("GET", f"/api/v1/billing/invoices/by-visit/{vid}", None, rec)
        if r.get("data") and (status is None or r["data"]["paymentStatus"] == status):
            holder["inv"] = r["data"]
            return True
        return False

    wait_for(ok, timeout)
    return holder.get("inv")


print(f"   bac si={DA},{DB} chu nuoi={O1},{O2}")

# ============================================================================================================
print("\n== A. TAI KHOAN: TU DANG KY, DOI VAI TRO, DAT LAI MAT KHAU ==")
reg = http("POST", "/api/v1/auth/register", {"password": "ChuNuoi@1", "fullName": "Khach Tu Dang Ky", "phoneNumber": "0966666661",
                                              "email": "tdk@example.com", "roleCode": "ADMIN", "username": "hacker"})
check("tu dang ky khong can token -> 201", 201, reg["status"])
check("luon la PET_OWNER du body co gui roleCode=ADMIN", "PET_OWNER", reg["data"]["role"])
check("ten dang nhap la so dien thoai (khong nhan 'hacker')", "0966666661", reg["data"]["username"])
tdk_login = http("POST", "/api/v1/auth/login", {"username": "0966666661", "password": "ChuNuoi@1"})
check("dang nhap duoc ngay bang SDT", True, tdk_login["status"] == 200)
check("trung SDT -> AUTH_1102", "AUTH_1102", code(http("POST", "/api/v1/auth/register", {"password": "ChuNuoi@1", "fullName": "X", "phoneNumber": "0966666661"})))
check("mat khau yeu -> SYS_1001", "SYS_1001", code(http("POST", "/api/v1/auth/register", {"password": "abc", "fullName": "X", "phoneNumber": "0966666662"})))
check("SDT sai dinh dang -> SYS_1001", "SYS_1001", code(http("POST", "/api/v1/auth/register", {"password": "ChuNuoi@1", "fullName": "X", "phoneNumber": "12345"})))
check("thieu ho ten -> SYS_1001", "SYS_1001", code(http("POST", "/api/v1/auth/register", {"password": "ChuNuoi@1", "phoneNumber": "0966666663"})))

NV = mkuser({"username": "nv1", "password": "NhanVien@1", "fullName": "Nhan Vien 1", "phoneNumber": "0977777771", "roleCode": "RECEPTIONIST"})
nv_login = http("POST", "/api/v1/auth/login", {"username": "nv1", "password": "NhanVien@1"})["data"]
r = http("POST", f"/api/v1/auth/users/{NV}/role", {"roleCode": "VETERINARIAN"}, admin)
check("admin doi le tan thanh bac si", "VETERINARIAN", data(r)["role"])
check("phien cu bi thu hoi: refresh token cu khong dung duoc nua", True,
      http("POST", "/api/v1/auth/refresh", {"refreshToken": nv_login["refreshToken"]}).get("status") == 401)
check("dang nhap lai mang vai tro moi", "VETERINARIAN", http("GET", "/api/v1/auth/me", None, login("nv1", "NhanVien@1"))["data"]["role"])
check("doi vai tro cua chinh minh -> AUTH_1114", "AUTH_1114", code(http("POST", "/api/v1/auth/users/1/role", {"roleCode": "RECEPTIONIST"}, admin)))
check("doi sang cung vai tro -> SYS_1001", "SYS_1001", code(http("POST", f"/api/v1/auth/users/{NV}/role", {"roleCode": "VETERINARIAN"}, admin)))
check("chu nuoi -> nhan su bi chan -> SYS_1001", "SYS_1001", code(http("POST", f"/api/v1/auth/users/{O1}/role", {"roleCode": "VETERINARIAN"}, admin)))
check("nhan su -> chu nuoi bi chan -> SYS_1001", "SYS_1001", code(http("POST", f"/api/v1/auth/users/{NV}/role", {"roleCode": "PET_OWNER"}, admin)))
check("le tan khong doi duoc vai tro -> 403", "SYS_1003", code(http("POST", f"/api/v1/auth/users/{NV}/role", {"roleCode": "ADMIN"}, rec)))
check("bac si khong co phong: doi sang le tan van giu du lieu sach", True,
      http("POST", f"/api/v1/auth/users/{DB}/role", {"roleCode": "RECEPTIONIST"}, admin)["data"]["roomNumber"] is None)
http("POST", f"/api/v1/auth/users/{DB}/role", {"roleCode": "VETERINARIAN"}, admin)   # tra lai
http("PUT", f"/api/v1/auth/users/{DB}", {"roomNumber": "P02"}, admin)
TB = login("bs.b", "BacSi@123")

tdk_id = reg["data"]["id"]
check("le tan dat lai mat khau cho chu nuoi -> 200", 200, http("POST", f"/api/v1/auth/users/{tdk_id}/reset-password", {"newPassword": "MoiMatKhau@2"}, rec)["status"])
check("mat khau cu khong dung duoc nua", "AUTH_1103", code(http("POST", "/api/v1/auth/login", {"username": "0966666661", "password": "ChuNuoi@1"})))
check("mat khau moi dung duoc", 200, http("POST", "/api/v1/auth/login", {"username": "0966666661", "password": "MoiMatKhau@2"})["status"])
check("phien cu cua chu nuoi bi thu hoi", True, http("POST", "/api/v1/auth/refresh", {"refreshToken": tdk_login["data"]["refreshToken"]}).get("status") == 401)
check("le tan khong dat lai mat khau cua bac si -> 403", "SYS_1003", code(http("POST", f"/api/v1/auth/users/{DA}/reset-password", {"newPassword": "MoiMatKhau@2"}, rec)))
check("le tan khong tu dat lai cua minh -> AUTH_1114", "AUTH_1114", code(http("POST", f"/api/v1/auth/users/{RECID}/reset-password", {"newPassword": "MoiMatKhau@2"}, rec)))
check("admin dat lai cho bac si -> 200", 200, http("POST", f"/api/v1/auth/users/{NV}/reset-password", {"newPassword": "NhanVien@22"}, admin)["status"])
check("mat khau moi qua yeu -> SYS_1001", "SYS_1001", code(http("POST", f"/api/v1/auth/users/{NV}/reset-password", {"newPassword": "abc"}, admin)))
check("chu nuoi khong dat lai duoc -> 403", "SYS_1003", code(http("POST", f"/api/v1/auth/users/{O2}/reset-password", {"newPassword": "MoiMatKhau@2"}, t1)))

# ============================================================================================================
print("\n== B. HANG DOI SANH 3 BAC (cap cuu > co hen dung gio > vang lai) ==")
pets = {n: mkpet(O1, n) for n in ["W1", "W2", "W3", "W4", "W5"]}
v1 = checkin(pets["W1"])["data"]["id"]
time.sleep(1)
v2 = checkin(pets["W2"], emergency=True)["data"]["id"]
time.sleep(1)
v3 = checkin(pets["W3"])["data"]["id"]
v4 = checkin(pets["W4"])["data"]["id"]
v5 = checkin(pets["W5"])["data"]["id"]
sql(f"UPDATE {CDB}.pet_visits SET scheduled_at = NOW() + INTERVAL 1 HOUR WHERE id = {v4}; UPDATE {CDB}.pet_visits SET scheduled_at = NOW() + INTERVAL 30 MINUTE WHERE id = {v3};")
queue = [x["id"] for x in http("GET", f"{V}/queue", None, rec)["data"]]
check("thu tu: cap cuu, roi co hen theo gio hen, roi vang lai theo gio check-in", [v2, v3, v4, v1, v5], queue)
check("API tra scheduledAt cho ca co hen", True, http("GET", f"{V}/{v3}", None, rec)["data"]["scheduledAt"] is not None)
check("ca vang lai khong co scheduledAt", None, http("GET", f"{V}/{v1}", None, rec)["data"]["scheduledAt"])

# Thu cho that: dat lich hom nay vao khung chua qua gio roi check-in
today = time.strftime("%Y-%m-%d")
slots = http("GET", f"/api/v1/appointments/slots?date={today}", None, rec)["data"]
open_slot = next((s for s in slots if not s["past"] and s["available"]), None)
if open_slot:
    apet = mkpet(O2, "Hen")
    appt = http("POST", "/api/v1/appointments", {"ownerId": O2, "petId": apet, "appointmentDate": today, "startTime": open_slot["startTime"],
                                                 "reason": "Kham dinh ky", "bookingChannel": "PHONE"}, rec)
    ci = checkin(None, appointment=appt["data"]["id"])
    check("check-in khach co hen chua qua khung gio -> co scheduledAt", True, ci["data"]["scheduledAt"] is not None)
    q2 = [x["id"] for x in http("GET", f"{V}/queue", None, rec)["data"]]
    check("khach co hen dung gio xep truoc moi khach vang lai", True, q2.index(ci["data"]["id"]) < q2.index(v1))
    check("...nhung sau ca cap cuu", True, q2.index(v2) < q2.index(ci["data"]["id"]))
    http("POST", f"{V}/{ci['data']['id']}/cancel", {"reason": "don dep"}, rec)
else:
    skip("check-in co hen that", "khong con khung gio nao chua qua trong ngay hom nay")
for v in (v1, v2, v3, v4, v5):
    http("POST", f"{V}/{v}/cancel", {"reason": "don dep"}, rec)
check("don hang doi xong", [], [x["id"] for x in http("GET", f"{V}/queue", None, rec)["data"]])

# ============================================================================================================
print("\n== C. DANH MUC XET NGHIEM: CHI SO, KHOANG THAM CHIEU, CHI SO CUA DICH VU ==")
items = {i["code"]: i for i in http("GET", "/api/v1/clinical/lab-test-items", None, rec)["data"]}
r = http("POST", "/api/v1/clinical/lab-test-items", {"code": " hct ", "name": "Hematocrit", "unit": "%", "description": "Ty le hong cau",
                                                     "ranges": [{"speciesId": DOG, "minValue": 37, "maxValue": 55}, {"speciesId": CAT, "minValue": 30, "maxValue": 45}]}, admin)
check("admin them chi so HCT kem khoang theo loai -> 201", 201, r["status"])
HCT = r["data"]["id"]
check("ma duoc chuan hoa chu hoa, co 2 khoang tham chieu", ("HCT", 2), (r["data"]["code"], len(r["data"]["ranges"])))
check("trung ma -> CLIN_1318", "CLIN_1318", code(http("POST", "/api/v1/clinical/lab-test-items", {"code": "WBC", "name": "x", "unit": "x"}, admin)))
check("khoang min >= max -> SYS_1001", "SYS_1001", code(http("POST", "/api/v1/clinical/lab-test-items", {"code": "BAD", "name": "x", "unit": "x",
      "ranges": [{"speciesId": DOG, "minValue": 10, "maxValue": 10}]}, admin)))
check("loai khong ton tai -> CLIN_1315", "CLIN_1315", code(http("POST", "/api/v1/clinical/lab-test-items", {"code": "BAD2", "name": "x", "unit": "x",
      "ranges": [{"speciesId": 999, "minValue": 1, "maxValue": 2}]}, admin)))
check("khong co chi so BAD nao duoc tao do loi", False, any(i["code"] in ("BAD", "BAD2") for i in http("GET", "/api/v1/clinical/lab-test-items", None, rec)["data"]))
check("bac si khong them duoc chi so -> 403", "SYS_1003", code(http("POST", "/api/v1/clinical/lab-test-items", {"code": "X1", "name": "x", "unit": "x"}, TA)))
check("sua ten chi so (ma bat bien)", ("HCT", "Hematocrit (HCT)"),
      tuple(http("PUT", f"/api/v1/clinical/lab-test-items/{HCT}", {"name": "Hematocrit (HCT)", "unit": "%"}, admin)["data"][k] for k in ("code", "name")))
check("chi so khong ton tai -> CLIN_1317", "CLIN_1317", code(http("PUT", "/api/v1/clinical/lab-test-items/9999", {"name": "x", "unit": "x"}, admin)))
check("sua khoang tham chieu cua cho", "35 55", " ".join(str(int(x)) for x in next(
    (r_["minValue"], r_["maxValue"]) for r_ in http("PUT", f"/api/v1/clinical/lab-test-items/{HCT}/ranges/{DOG}", {"minValue": 35, "maxValue": 55}, admin)["data"]["ranges"] if r_["speciesCode"] == "DOG")))
check("khoang sai (min>max) -> SYS_1001", "SYS_1001", code(http("PUT", f"/api/v1/clinical/lab-test-items/{HCT}/ranges/{DOG}", {"minValue": 60, "maxValue": 50}, admin)))
check("sua khong tao them dong khoang thu hai", 1, int(sql(f"SELECT COUNT(*) FROM {CDB}.lab_test_reference_ranges WHERE lab_test_item_id={HCT} AND species_id={DOG}")))

CBC = SID["LAB_CBC"]
check("DV CBC mac dinh gom 4 chi so (seed)", 4, len(http("GET", f"/api/v1/clinical/services/{CBC}/lab-test-items", None, rec)["data"]))
r = http("PUT", f"/api/v1/clinical/services/{CBC}/lab-test-items", {"labTestItemIds": [items["WBC"]["id"], HCT]}, admin)
check("admin dat CBC chi con WBC va HCT", ["HCT", "WBC"], [i["code"] for i in r["data"]])
check("dich vu khong phai xet nghiem -> SYS_1001", "SYS_1001", code(http("PUT", f"/api/v1/clinical/services/{SID['EXAM_GEN']}/lab-test-items", {"labTestItemIds": [HCT]}, admin)))
check("chi so khong ton tai -> CLIN_1317", "CLIN_1317", code(http("PUT", f"/api/v1/clinical/services/{CBC}/lab-test-items", {"labTestItemIds": [HCT, 9999]}, admin)))
check("cau hinh khong doi khi bi tu choi", 2, len(http("GET", f"/api/v1/clinical/services/{CBC}/lab-test-items", None, rec)["data"]))

# ============================================================================================================
print("\n== D. HANH TRINH DAY DU TREN CA CUA MEO (xet nghiem -> ke don -> thanh toan -> phat thuoc) ==")
MIU = mkpet(O1, "Miu", CAT)
VM = checkin(MIU)["data"]["id"]
start_exam(VM, DA, TA)
http("POST", f"{V}/{VM}/services", {"services": [{"serviceId": CBC, "quantity": 1}]}, TA)
detail = next(x["serviceDetailId"] for x in http("GET", "/api/v1/clinical/lab-queue", None, lab)["data"] if x["visitId"] == VM)
http("POST", f"/api/v1/clinical/service-details/{detail}/start", {}, lab)
form = http("GET", f"/api/v1/clinical/service-details/{detail}/lab-form", None, lab)["data"]
check("form xet nghiem chi hien chi so cua dich vu (HCT, WBC)", ["HCT", "WBC"], [i["code"] for i in form])
hct_form = next(i for i in form if i["code"] == "HCT")
check("khoang tham chieu hien dung loai Meo (30-45)", [(30.0, 45.0)], [(r_["minValue"], r_["maxValue"]) for r_ in hct_form["ranges"]])
check("chi 1 khoang (cua loai thu cung nay)", 1, len(hct_form["ranges"]))
check("KTV CDHA/Chu nuoi khong xem form -> 403", "SYS_1003", code(http("GET", f"/api/v1/clinical/service-details/{detail}/lab-form", None, t1)))
check("nhap chi so khong thuoc dich vu (PLT) -> CLIN_1319", "CLIN_1319", code(http("POST", f"/api/v1/clinical/service-details/{detail}/lab-results",
      {"items": [{"labTestItemId": items["PLT"]["id"], "value": 300}]}, lab)))
res = http("POST", f"/api/v1/clinical/service-details/{detail}/lab-results", {"items": [{"labTestItemId": HCT, "value": 50}, {"labTestItemId": items["WBC"]["id"], "value": 10}]}, lab)
check("nhap dung chi so cua dich vu -> 200", 200, res["status"])
check("ca sang RESULTS_READY", True, wait_for(lambda: vstat(VM) == "RESULTS_READY"))
http("PUT", f"/api/v1/clinical/lab-test-items/{HCT}/ranges/{CAT}", {"minValue": 20, "maxValue": 60}, admin)   # Admin doi khoang SAU khi da co ket qua
detail_visit = http("GET", f"{V}/{VM}", None, rec)["data"]
hct_res = next(x for x in detail_visit["labResults"] if x["code"] == "HCT")
check("doi khoang tham chieu KHONG doi ket qua cu: van HIGH theo snapshot 30-45", ("HIGH", 30.0, 45.0),
      (hct_res["evaluation"], hct_res["minValue"], hct_res["maxValue"]))

http("POST", f"{V}/{VM}/call-back", {}, TA)
RX = http("POST", "/api/v1/pharmacy/prescriptions", rx_body(VM, 4), TA)["data"]["id"]
http("POST", f"{V}/{VM}/close-visit", {"diagnosis": "Thieu mau nhe", "treatmentPlan": "Bo sung sat", "doctorAdvice": "An du chat"}, TA)
inv = invoice_of(VM)
http("POST", f"/api/v1/billing/invoices/{inv['id']}/confirm-payment", {}, rec)
http("POST", f"/api/v1/pharmacy/prescriptions/{RX}/dispense", {}, rec)
check("ca hoan tat", True, wait_for(lambda: vstat(VM) == "COMPLETED"))

# ============================================================================================================
print("\n== E. BENH AN TRON DOI (UC-38, UC-39) ==")
VM2 = checkin(MIU)["data"]["id"]    # ca moi dang cho (WAITING) cua cung thu cung
hist = http("GET", f"/api/v1/pets/{MIU}/medical-history", None, rec)
check("le tan thay ca 2 dot kham (ca hoan tat va ca dang cho)", 2, hist["data"]["totalElements"])
done = next(e for e in hist["data"]["items"] if e["visit"]["status"] == "COMPLETED")
check("moi nhat truoc (ca dang cho dung dau)", VM2, hist["data"]["items"][0]["visit"]["id"])
check("co chan doan, ten bac si, so phong", ("Thieu mau nhe", "BS A", "P01"), (done["visit"]["diagnosis"], done["doctorName"], done["visit"]["assignedRoom"]))
check("co dich vu da chi dinh va ket qua xet nghiem co danh gia", True,
      any(s["serviceCode"] == "LAB_CBC" for s in done["visit"]["services"]) and any(x["evaluation"] == "HIGH" for x in done["visit"]["labResults"]))
check("co don thuoc da cap phat kem huong dan dung", ("DISPENSED", "1 vien", "2 lan/ngay", 5),
      (done["prescription"]["status"], done["prescription"]["items"][0]["dosage"], done["prescription"]["items"][0]["frequency"], done["prescription"]["items"][0]["durationDays"]))
check("ten thuoc va hoat chat trong don", "Clavamox 250mg", done["prescription"]["items"][0]["medicineName"])
check("chu nuoi chi thay cac dot da hoan tat", [VM], [e["visit"]["id"] for e in http("GET", f"/api/v1/pets/{MIU}/medical-history", None, t1)["data"]["items"]])
check("chu nuoi khac khong xem duoc -> APPT_1201", "APPT_1201", code(http("GET", f"/api/v1/pets/{MIU}/medical-history", None, t2)))
check("bac si xem duoc toan bo", 2, http("GET", f"/api/v1/pets/{MIU}/medical-history", None, TB)["data"]["totalElements"])
check("phan trang size=1", (1, 2), (len(http("GET", f"/api/v1/pets/{MIU}/medical-history?size=1", None, rec)["data"]["items"]),
                                  http("GET", f"/api/v1/pets/{MIU}/medical-history?size=1", None, rec)["data"]["totalPages"]))
check("thu cung khong ton tai -> APPT_1201", "APPT_1201", code(http("GET", "/api/v1/pets/99999/medical-history", None, rec)))
check("khong token -> 401", 401, http("GET", f"/api/v1/pets/{MIU}/medical-history").get("status"))
http("POST", f"{V}/{VM2}/cancel", {"reason": "don dep"}, rec)

# ============================================================================================================
print("\n== F. BAO CAO (FR-69, FR-70) ==")
rev = http("GET", "/api/v1/billing/reports/revenue", None, admin)
check("bao cao doanh thu cua admin -> 200", 200, rev["status"])
check("co hoa don da thu, thuoc 60000 (4 x 15000)", (1, 60000.0), (rev["data"]["totals"]["invoiceCount"], rev["data"]["totals"]["medicineAmount"]))
check("final = dich vu + thuoc + VAT - giam gia", True, abs(rev["data"]["totals"]["finalAmount"] - (rev["data"]["totals"]["serviceAmount"] + rev["data"]["totals"]["medicineAmount"]
                                                              + rev["data"]["totals"]["vatAmount"] - rev["data"]["totals"]["discountAmount"])) < 0.005)
check("mac dinh 30 ngay, nhom theo ngay", (30, "DAY"), (len(rev["data"]["periods"]), rev["data"]["groupBy"]))
check("tong cac ky bang tong chung", True, abs(sum(p["finalAmount"] for p in rev["data"]["periods"]) - rev["data"]["totals"]["finalAmount"]) < 0.005)
check("co thong ke theo trang thai hoa don", True, set(rev["data"]["byStatus"]) == {"PENDING", "PAID", "CANCELLED"} and rev["data"]["byStatus"]["PAID"]["invoiceCount"] == 1)
check("theo thang -> 1 hoac 2 ky", True, len(http("GET", "/api/v1/billing/reports/revenue?groupBy=MONTH", None, admin)["data"]["periods"]) in (1, 2))
check("theo quy -> nhan Q", True, "-Q" in http("GET", "/api/v1/billing/reports/revenue?groupBy=QUARTER", None, admin)["data"]["periods"][-1]["label"])
check("khoang dao nguoc -> SYS_1001", "SYS_1001", code(http("GET", "/api/v1/billing/reports/revenue?fromDate=2026-11-05&toDate=2026-11-01", None, admin)))
check("khoang qua 366 ngay -> SYS_1001", "SYS_1001", code(http("GET", "/api/v1/billing/reports/revenue?fromDate=2025-01-01&toDate=2026-12-31", None, admin)))
check("le tan khong xem duoc bao cao -> 403", "SYS_1003", code(http("GET", "/api/v1/billing/reports/revenue", None, rec)))
ops = http("GET", "/api/v1/clinical/reports/operations", None, admin)["data"]
check("van hanh: tong ca, hoan tat, huy", True, ops["totalVisits"] >= 8 and ops["completedVisits"] == 1 and ops["cancelledVisits"] >= 5)
check("ca cap cuu = 1; ca co can lam sang = 1", (1, 1), (ops["emergencyVisits"], ops["paraclinicalVisits"]))
check("ca thuong + ca co CLS = tong", ops["totalVisits"], ops["routineVisits"] + ops["paraclinicalVisits"])
check("so ca cua BS A kem ten", True, any(d["doctorId"] == DA and d["doctorName"] == "BS A" and d["completedVisits"] == 1 for d in ops["doctors"]))
check("van hanh: le tan khong xem -> 403", "SYS_1003", code(http("GET", "/api/v1/clinical/reports/operations", None, rec)))
ap = http("GET", "/api/v1/appointments/reports/summary", None, admin)["data"]
check("bao cao lich hen co du trang thai va kenh", True, set(ap["byStatus"]) == {"PENDING", "CONFIRMED", "CHECKED_IN", "CANCELLED", "NO_SHOW"} and "PHONE" in ap["byChannel"])
check("lich hen: tong, ti le trong khoang 0..1", True, ap["totalAppointments"] >= 0 and 0 <= ap["noShowRate"] <= 1 and 0 <= ap["cancellationRate"] <= 1)
check("lich hen: khoang dao nguoc -> SYS_1001", "SYS_1001", code(http("GET", "/api/v1/appointments/reports/summary?fromDate=2026-11-05&toDate=2026-11-01", None, admin)))
check("lich hen: le tan khong xem -> 403", "SYS_1003", code(http("GET", "/api/v1/appointments/reports/summary", None, rec)))

# ============================================================================================================
print("\n== G. LICH HEN: HIEN TEN, TU HUY PENDING QUA HAN ==")
tomorrow = time.strftime("%Y-%m-%d", time.localtime(time.time() + 86400))
APET = mkpet(O1, "Lu")
pend = http("POST", "/api/v1/appointments", {"petId": APET, "appointmentDate": tomorrow, "startTime": "10:00", "reason": "Kham tong quat"}, t1)["data"]
listing = http("GET", "/api/v1/appointments?status=PENDING", None, rec)["data"]["items"]
row = next(x for x in listing if x["id"] == pend["id"])
check("danh sach lich hen kem ten thu cung, chu nuoi, SDT", ("Lu", "Nguyen Van A", "0944444441"), (row["petName"], row["ownerName"], row["ownerPhone"]))
check("chi tiet lich hen cung kem ten", "Lu", http("GET", f"/api/v1/appointments/{pend['id']}", None, rec)["data"]["petName"])
check("chu nuoi xem danh sach cua minh cung kem ten", "Lu", http("GET", "/api/v1/appointments", None, t1)["data"]["items"][0]["petName"])

confirmed = http("POST", "/api/v1/appointments", {"ownerId": O1, "petId": mkpet(O1, "Mun"), "appointmentDate": tomorrow, "startTime": "11:00",
                                                  "reason": "Tiem phong", "bookingChannel": "PHONE"}, rec)["data"]
# Dua 2 lich vao QUA KHU bang SQL de buoc tien trinh quet xu ly (cron thu nhanh moi 5 giay)
yesterday = time.strftime("%Y-%m-%d", time.localtime(time.time() - 86400))
sql(f"UPDATE {ADB}.appointments SET appointment_date='{yesterday}' WHERE id IN ({pend['id']}, {confirmed['id']});")
check("lich PENDING qua han tu bi huy", True, wait_for(lambda: http("GET", f"/api/v1/appointments/{pend['id']}", None, rec)["data"]["status"] == "CANCELLED", 45))
exp = http("GET", f"/api/v1/appointments/{pend['id']}", None, rec)["data"]
check("ly do he thong, khong co nguoi huy", ("Quá giờ hẹn mà phòng khám chưa xác nhận", None), (exp["cancelReason"], exp["cancelledBy"]))
hist_rows = http("GET", f"/api/v1/appointments/{pend['id']}/history", None, rec)["data"]
check("lich su ghi PENDING -> CANCELLED bang he thong (nguoi doi = null)", ("PENDING", "CANCELLED", None),
      (hist_rows[-1]["fromStatus"], hist_rows[-1]["toStatus"], hist_rows[-1]["changedByUserId"]))
check("lich CONFIRMED khong bi quet nham thanh CANCELLED", True, http("GET", f"/api/v1/appointments/{confirmed['id']}", None, rec)["data"]["status"] != "CANCELLED")
check("suat da duoc tra: dat lai dung khung 10:00 ngay mai duoc", 201, http("POST", "/api/v1/appointments", {"petId": mkpet(O2, "Lai"), "appointmentDate": tomorrow, "startTime": "10:00", "reason": "x"}, t2)["status"])

# ============================================================================================================
print("\n== H. HUY HOA DON VA MO LAI DOT KHAM (SM-05, T12) ==")
REX = mkpet(O1, "Rex")
VR = checkin(REX)["data"]["id"]
start_exam(VR, DB, TB)
RXR = http("POST", "/api/v1/pharmacy/prescriptions", rx_body(VR, 2), TB)["data"]["id"]
http("POST", f"{V}/{VR}/close-visit", {"diagnosis": "Viem da"}, TB)
inv1 = invoice_of(VR, "PENDING")
check("hoa don PENDING duoc lap khi chot ca", "PENDING", inv1["paymentStatus"])
check("don thuoc dang bi khoa sau khi chot", "PHARM_1409", code(http("PUT", f"/api/v1/pharmacy/prescriptions/{RXR}", rx_body(VR, 3), TB)))

check("le tan khong mo lai duoc dot kham -> 403", "SYS_1003", code(http("POST", f"{V}/{VR}/reopen", {"reason": "Sua don"}, rec)))
check("bac si khong tu mo lai duoc -> 403", "SYS_1003", code(http("POST", f"{V}/{VR}/reopen", {"reason": "Sua don"}, TB)))
check("mo lai thieu ly do -> SYS_1001", "SYS_1001", code(http("POST", f"{V}/{VR}/reopen", {}, admin)))
check("mo lai ca khong ton tai -> CLIN_1301", "CLIN_1301", code(http("POST", f"{V}/9999/reopen", {"reason": "x"}, admin)))
re = http("POST", f"{V}/{VR}/reopen", {"reason": "Bac si nhap sai lieu thuoc"}, admin)
check("Admin mo lai dot khám -> IN_PROGRESS", ("IN_PROGRESS", False), (re["data"]["status"], re["data"]["locked"]))
hist = http("GET", f"{V}/{VR}/history", None, admin)["data"]
check("lich su ghi WAITING_PAYMENT -> IN_PROGRESS boi Admin, kem ly do", ("WAITING_PAYMENT", "IN_PROGRESS", 1, True),
      (hist[-1]["fromStatus"], hist[-1]["toStatus"], hist[-1]["changedByUserId"], "sai lieu thuoc" in hist[-1]["notes"]))
check("hoa don cu bi huy, co ghi chu", ("CANCELLED", True), (invoice_of(VR, "CANCELLED")["paymentStatus"], "mở lại" in (invoice_of(VR, "CANCELLED")["notes"] or "")))
check("don thuoc mo khoa: sua duoc 3 vien", 3, http("PUT", f"/api/v1/pharmacy/prescriptions/{RXR}", rx_body(VR, 3), TB)["data"]["items"][0]["quantity"])
check("them dich vu tiem phong trong phong kham", 200, http("POST", f"{V}/{VR}/services", {"services": [{"serviceId": SID["VAC_7B"], "quantity": 1}]}, TB)["status"])
check("mo lai ca da IN_PROGRESS -> CLIN_1305", "CLIN_1305", code(http("POST", f"{V}/{VR}/reopen", {"reason": "x"}, admin)))

# Sự kien chot ca CU bi giao lai khong duoc lam song lai hoa don da huy
rmq("POST", "/exchanges/%2F/clinic.events/publish", {"properties": {"content_type": "application/json"}, "routing_key": "visit.closed_to_payment",
    "payload": json.dumps({"eventId": "00000000-0000-0000-0000-000000000001", "occurredAt": "2020-01-01T00:00:00Z", "actorUserId": DB, "visitId": VR,
                           "visitCode": "X", "petId": REX, "doctorId": DB, "abandoned": False}), "payload_encoding": "string"})
time.sleep(3)
check("su kien chot ca cu bi giao lai KHONG hoi sinh hoa don da huy", "CANCELLED", http("GET", f"/api/v1/billing/invoices/by-visit/{VR}", None, rec)["data"]["paymentStatus"])

http("POST", f"{V}/{VR}/close-visit", {"diagnosis": "Viem da (da sua don)"}, TB)
inv2 = invoice_of(VR, "PENDING")
check("chot lai -> hoa don duoc dung lai: cung ma, cung id", (inv1["id"], inv1["invoiceCode"]), (inv2["id"], inv2["invoiceCode"]))
check("noi dung moi: thuoc 45000 (3 vien) + co dong tiem phong", (45000.0, True),
      (inv2["totalMedicineAmount"], any(i["itemName"] and "Vaccine" in i["itemName"] for i in inv2["items"])))
check("chiet khau cu khong mang sang, chua co thu ngan", (0.0, None), (inv2["discountAmount"], inv2["cashierId"]))
check("don thuoc lien ket lai voi hoa don", RXR, inv2["prescriptionId"])
check("khong tao them dong hoa don nao (visit_id UNIQUE)", 1, int(sql(f"SELECT COUNT(*) FROM {BDB}.invoices WHERE visit_id={VR}")))

http("POST", f"/api/v1/billing/invoices/{inv2['id']}/confirm-payment", {}, rec)
check("da thu tien: mo lai bi tu choi -> BILL_1403", "BILL_1403", code(http("POST", f"{V}/{VR}/reopen", {"reason": "Dieu chinh"}, admin)))
check("...va ca van WAITING_PAYMENT, hoa don van PAID", ("WAITING_PAYMENT", "PAID"), (vstat(VR), http("GET", f"/api/v1/billing/invoices/by-visit/{VR}", None, rec)["data"]["paymentStatus"]))
check("hoa don da thu khong huy duoc -> BILL_1403", "BILL_1403", code(http("POST", f"/api/v1/billing/invoices/{inv2['id']}/cancel", {"reason": "x"}, rec)))
http("POST", f"/api/v1/pharmacy/prescriptions/{RXR}/dispense", {}, rec)
check("phat thuoc xong -> COMPLETED", True, wait_for(lambda: vstat(VR) == "COMPLETED"))
check("ca da hoan tat khong mo lai duoc -> CLIN_1305", "CLIN_1305", code(http("POST", f"{V}/{VR}/reopen", {"reason": "x"}, admin)))

# Bac si dang ban
SAM = mkpet(O1, "Sam")
VS = checkin(SAM)["data"]["id"]
start_exam(VS, DB, TB)
http("POST", f"{V}/{VS}/close-visit", {"diagnosis": "Kham thuong"}, TB)
inv_s = invoice_of(VS, "PENDING")
BUSY = checkin(mkpet(O1, "Bun"))["data"]["id"]
start_exam(BUSY, DB, TB)
check("bac si dang kham ca khac -> khong mo lai duoc -> CLIN_1302", "CLIN_1302", code(http("POST", f"{V}/{VS}/reopen", {"reason": "Dieu chinh"}, admin)))
check("...va hoa don KHONG bi huy (kiem tra bac si truoc khi huy)", "PENDING", http("GET", f"/api/v1/billing/invoices/by-visit/{VS}", None, rec)["data"]["paymentStatus"])
http("POST", f"{V}/{BUSY}/cancel", {"reason": "don dep"}, TB)

# Huy hoa don doc lap + lap lai bang from-visit
check("huy hoa don thieu ly do -> SYS_1001", "SYS_1001", code(http("POST", f"/api/v1/billing/invoices/{inv_s['id']}/cancel", {}, rec)))
c = http("POST", f"/api/v1/billing/invoices/{inv_s['id']}/cancel", {"reason": "Nhap nham dich vu"}, rec)
check("le tan huy hoa don PENDING co ly do", ("CANCELLED", True), (c["data"]["paymentStatus"], "Nhap nham dich vu" in c["data"]["notes"]))
check("thanh toan hoa don da huy -> BILL_1414", "BILL_1414", code(http("POST", f"/api/v1/billing/invoices/{inv_s['id']}/confirm-payment", {}, rec)))
check("chiet khau hoa don da huy -> BILL_1414", "BILL_1414", code(http("PUT", f"/api/v1/billing/invoices/{inv_s['id']}/discount", {"discountAmount": 0}, rec)))
back = http("POST", f"/api/v1/billing/invoices/from-visit/{VS}", {}, rec)
check("lap lai bang from-visit -> PENDING, giu id va ma", ("PENDING", inv_s["id"], inv_s["invoiceCode"]),
      (back["data"]["paymentStatus"], back["data"]["id"], back["data"]["invoiceCode"]))
check("thanh toan duoc hoa don vua dung lai", "PAID", http("POST", f"/api/v1/billing/invoices/{inv_s['id']}/confirm-payment", {}, rec)["data"]["paymentStatus"])
check("ca khong don thuoc hoan tat ngay", True, wait_for(lambda: vstat(VS) == "COMPLETED"))

# ============================================================================================================
print("\n== I. RO KHOA ==")
check("khong con khoa MySQL (GET_LOCK) nao bi ro", "0", sql("SELECT COUNT(*) FROM performance_schema.metadata_locks WHERE OBJECT_TYPE='USER LEVEL LOCK'"))
dlq = sum(rmq("GET", f"/queues/%2F/{q}").get("messages", 0) for q in ["billing-pharmacy-service.visit.closed_to_payment.dlq",
          "clinical-service.payment.completed.dlq", "appointment-service.visit.checked_in.dlq"])
check("khong co su kien nao vao DLQ", 0, dlq)
check("khong co ton kho am", "0", sql(f"SELECT COUNT(*) FROM {BDB}.medicines WHERE stock_quantity < 0"))
for svc in ("billing-pharmacy-service", "clinical-service", "appointment-service", "auth-service"):
    logs = subprocess.run(["docker", "compose", "logs", "--no-color", "--since", "30m", svc], capture_output=True, text=True, encoding="utf-8").stdout
    bad = [l[:170] for l in logs.splitlines() if " ERROR " in l and "Optimistic" not in l and "DiscoveryClient" not in l]
    check(f"log {svc} khong co ERROR bat thuong", [], bad[:3])

print("\n============================================")
print(f"   KET QUA: {PASS} dat, {FAIL} khong dat, {SKIP} bo qua")
print("============================================")
