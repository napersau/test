"""Kiem thu end-to-end notification-service qua API Gateway: client STOMP/WebSocket that + RabbitMQ + email (Mailpit)."""
import asyncio, json, os, subprocess, sys, time, uuid, urllib.request, urllib.error
import websockets

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
ENV = {}
for line in open(".env", encoding="utf-8"):
    if "=" in line and not line.startswith("#"):
        k, v = line.strip().split("=", 1)
        ENV[k] = v

G = "http://localhost:8080"
WS = "ws://localhost:8080/ws"
PASS = FAIL = 0
STARTED = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())  # lich su nam trong bo nho nen bo qua thong bao cua lan chay truoc


def check(name, expected, actual):
    global PASS, FAIL
    if expected == actual:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name} -> mong doi {expected!r}, nhan {actual!r}")


def http(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else (b"{}" if method == "POST" else None)
    req = urllib.request.Request(G + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return json.loads(raw)
        except Exception:
            return {"status": e.code, "errorCode": None, "raw": raw}


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


def publish(routing_key, payload):
    return rmq("POST", "/exchanges/%2F/clinic.events/publish", {
        "properties": {"content_type": "application/json"}, "routing_key": routing_key,
        "payload": json.dumps(payload), "payload_encoding": "string"})


def mailpit_messages():
    out = subprocess.run(["docker", "compose", "exec", "-T", "api-gateway", "curl", "-s", "http://mailpit:8025/api/v1/messages?limit=100"],
                         capture_output=True, text=True, encoding="utf-8")
    return json.loads(out.stdout).get("messages", [])


def mailpit_body(mid):
    out = subprocess.run(["docker", "compose", "exec", "-T", "api-gateway", "curl", "-s", f"http://mailpit:8025/api/v1/message/{mid}"],
                         capture_output=True, text=True, encoding="utf-8")
    return json.loads(out.stdout)


def login(username, password):
    return http("POST", "/api/v1/auth/login", {"username": username, "password": password})["data"]["accessToken"]


class Stomp:
    """STOMP 1.2 toi thieu qua WebSocket; gom moi frame MESSAGE / ERROR vao danh sach."""

    def __init__(self):
        self.ws = None
        self.messages = []
        self.errors = []
        self.closed = False
        self._task = None

    async def connect(self, headers):
        self.ws = await websockets.connect(WS)
        h = "".join(f"{k}:{v}\n" for k, v in headers.items())
        await self.ws.send(f"CONNECT\naccept-version:1.2\nhost:localhost\nheart-beat:0,0\n{h}\n\0")
        first = await asyncio.wait_for(self.ws.recv(), 10)
        frame = self._parse(first)
        if frame and frame[0] == "CONNECTED":
            self._task = asyncio.create_task(self._reader())
            return True
        if frame:
            self.errors.append(frame)
        self.closed = True
        return False

    @staticmethod
    def _parse(raw):
        raw = raw.lstrip("\n")
        if not raw.strip("\0"):
            return None
        head, _, body = raw.partition("\n\n")
        lines = head.split("\n")
        headers = dict(l.split(":", 1) for l in lines[1:] if ":" in l)
        return lines[0], headers, body.rstrip("\0")

    async def _reader(self):
        try:
            async for raw in self.ws:
                for part in raw.split("\0"):
                    frame = self._parse(part) if part.strip() else None
                    if not frame:
                        continue
                    if frame[0] == "MESSAGE":
                        self.messages.append(json.loads(frame[2]))
                    elif frame[0] == "ERROR":
                        self.errors.append(frame)
        except Exception:
            pass
        self.closed = True

    async def subscribe(self, destination, sub_id):
        await self.ws.send(f"SUBSCRIBE\nid:{sub_id}\ndestination:{destination}\n\n\0")

    async def send_frame(self, destination, body="{}"):
        await self.ws.send(f"SEND\ndestination:{destination}\ncontent-type:application/json\n\n{body}\0")

    async def close(self):
        try:
            await self.ws.close()
        except Exception:
            pass

    def titles(self):
        return [m["title"] for m in self.messages]

    def types(self):
        return [m["type"] for m in self.messages]


async def settle(seconds=2.0):
    await asyncio.sleep(seconds)


async def wait_for(predicate, timeout=15):
    end = time.time() + timeout
    while time.time() < end:
        if predicate():
            return True
        await asyncio.sleep(0.4)
    return False


async def main():
    BDB, CDB = "pet_clinic_billing_pharmacy_db", "pet_clinic_clinical_db"
    print("== Don du lieu thu nghiem cu ==")
    subprocess.run(["bash", os.path.join(os.path.dirname(os.path.abspath(__file__)), "reset_data.sh")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    sql(f"DELETE FROM {BDB}.inventory_transactions; DELETE FROM {BDB}.invoice_items; DELETE FROM {BDB}.invoices; DELETE FROM {BDB}.prescription_items; DELETE FROM {BDB}.prescriptions;"
        f"DELETE FROM {CDB}.imaging_attachments; DELETE FROM {CDB}.imaging_results; DELETE FROM {CDB}.lab_test_results; DELETE FROM {CDB}.visit_service_detail_histories; DELETE FROM {CDB}.visit_service_details; DELETE FROM {CDB}.pet_visit_status_histories; DELETE FROM {CDB}.pet_visits; DELETE FROM {CDB}.pets;"
        "DELETE FROM pet_clinic_appointment_db.appointment_status_histories; DELETE FROM pet_clinic_appointment_db.appointments; DELETE FROM pet_clinic_auth_db.refresh_tokens; DELETE FROM pet_clinic_auth_db.users WHERE id > 1;"
        f"ALTER TABLE {CDB}.pets AUTO_INCREMENT=1; ALTER TABLE {CDB}.pet_visits AUTO_INCREMENT=1; ALTER TABLE pet_clinic_auth_db.users AUTO_INCREMENT=2;"
        f"UPDATE {BDB}.medicines SET stock_quantity=200 WHERE code='MED_AMOX';")
    for q in ["notification-service.appointment.created.dlq", "notification-service.visit.checked_in.dlq", "notification-service.doctor.priority_callback.dlq",
              "notification-service.visit.closed_to_payment.dlq", "notification-service.payment.completed.dlq", "notification-service.stock.low_alert.dlq",
              "billing-pharmacy-service.visit.closed_to_payment.dlq", "clinical-service.payment.completed.dlq", "appointment-service.visit.checked_in.dlq"]:
        rmq("DELETE", f"/queues/%2F/{q}/contents")
    subprocess.run(["docker", "compose", "exec", "-T", "api-gateway", "curl", "-s", "-X", "DELETE", "http://mailpit:8025/api/v1/messages"], capture_output=True)

    admin = login("admin", "Admin@123")

    def mkuser(body):
        return http("POST", "/api/v1/auth/users", body, admin)["data"]["id"]

    print("== Chuan bi tai khoan ==")
    mkuser({"username": "letan1", "password": "LeTan@123", "fullName": "Le Tan 1", "phoneNumber": "0933333333", "roleCode": "RECEPTIONIST"})
    DOC = mkuser({"username": "bs.a", "password": "BacSi@123", "fullName": "BS Lan", "phoneNumber": "0911111111", "roomNumber": "P01", "roleCode": "VETERINARIAN"})
    mkuser({"username": "kt.lab", "password": "KyThuat@1", "fullName": "KTV Lab", "phoneNumber": "0955555551", "roomNumber": "LAB01", "roleCode": "LAB_TECHNICIAN"})
    rec = login("letan1", "LeTan@123"); doc = login("bs.a", "BacSi@123"); lab = login("kt.lab", "KyThuat@1")
    OWN = http("POST", "/api/v1/auth/users", {"password": "ChuNuoi@1", "fullName": "Nguyen Van A", "phoneNumber": "0944444441",
                                               "email": "chunuoi1@example.com", "roleCode": "PET_OWNER"}, rec)["data"]["id"]
    OWN2 = http("POST", "/api/v1/auth/users", {"password": "ChuNuoi@1", "fullName": "Tran Thi B", "phoneNumber": "0944444442",
                                                "email": "chunuoi2@example.com", "roleCode": "PET_OWNER"}, rec)["data"]["id"]
    own = login("0944444441", "ChuNuoi@1"); own2 = login("0944444442", "ChuNuoi@1")
    pet = http("POST", "/api/v1/pets", {"ownerId": OWN, "speciesId": 1, "name": "Lu"}, rec)["data"]["id"]
    print(f"   bac si={DOC} chu nuoi={OWN},{OWN2} thu cung={pet}")

    print("\n== A. XAC THUC KET NOI STOMP ==")
    anon = Stomp()
    check("CONNECT khong co token bi tu choi", False, await anon.connect({}))
    check("...va nhan frame ERROR", True, len(anon.errors) > 0 and anon.errors[0][0] == "ERROR")
    bad = Stomp()
    check("CONNECT voi token gia bi tu choi", False, await bad.connect({"Authorization": "Bearer " + rec[:-3] + "abc"}))
    bad2 = Stomp()
    check("CONNECT voi chuoi rac bi tu choi", False, await bad2.connect({"Authorization": "Bearer abc.def.ghi"}))
    forged = Stomp()
    check("khong gia mao duoc vai tro bang header X-User-Role trong CONNECT", False, await forged.connect({"X-User-Id": "1", "X-User-Role": "ADMIN"}))

    S_rec, S_doc, S_own, S_own2, S_admin = Stomp(), Stomp(), Stomp(), Stomp(), Stomp()
    check("le tan ket noi hop le", True, await S_rec.connect({"Authorization": "Bearer " + rec}))
    check("bac si ket noi hop le", True, await S_doc.connect({"Authorization": "Bearer " + doc}))
    check("chu nuoi ket noi hop le", True, await S_own.connect({"token": own}))
    check("chu nuoi 2 ket noi hop le", True, await S_own2.connect({"Authorization": "Bearer " + own2}))
    check("admin ket noi hop le", True, await S_admin.connect({"Authorization": "Bearer " + admin}))
    await S_rec.subscribe("/user/queue/notifications", "r1"); await S_rec.subscribe("/topic/role/RECEPTIONIST", "r2")
    await S_doc.subscribe("/user/queue/notifications", "d1"); await S_doc.subscribe("/topic/role/VETERINARIAN", "d2")
    await S_own.subscribe("/user/queue/notifications", "o1")
    await S_own2.subscribe("/user/queue/notifications", "p1")
    await S_admin.subscribe("/user/queue/notifications", "a1"); await S_admin.subscribe("/topic/role/ADMIN", "a2")
    await settle(1)

    evil = Stomp(); await evil.connect({"Authorization": "Bearer " + own})
    await evil.subscribe("/topic/role/ADMIN", "x1"); await settle(1.5)
    check("chu nuoi dang ky kenh ADMIN bi tu choi (ERROR + dong ket noi)", True, len(evil.errors) > 0 and evil.closed)
    evil2 = Stomp(); await evil2.connect({"Authorization": "Bearer " + rec})
    await evil2.subscribe("/topic/role/ADMIN", "x1"); await settle(1.5)
    check("le tan dang ky kenh ADMIN cung bi tu choi", True, len(evil2.errors) > 0 and evil2.closed)
    evil3 = Stomp(); await evil3.connect({"Authorization": "Bearer " + admin})
    await evil3.send_frame("/topic/role/RECEPTIONIST", '{"title":"gia mao"}'); await settle(1.5)
    check("client khong gui duoc du lieu len kenh (ke ca admin)", True, len(evil3.errors) > 0 and evil3.closed)
    check("khong co thong bao gia mao nao toi le tan", True, all(m.get("title") != "gia mao" for m in S_rec.messages))

    print("\n== B. LICH HEN (appointment.created) ==")
    tomorrow = time.strftime("%Y-%m-%d", time.localtime(time.time() + 86400))
    booked = http("POST", "/api/v1/appointments", {"petId": pet, "appointmentDate": tomorrow, "startTime": "09:00", "reason": "Kham tong quat"}, own)
    APT_CODE = booked["data"]["appointmentCode"]
    check("chu nuoi dat lich online -> 201", 201, booked["status"])
    check("le tan nhan thong bao 'Lich hen moi cho duyet'", True, await wait_for(lambda: "Lịch hẹn mới chờ duyệt" in S_rec.titles()))
    check("chu nuoi nhan thong bao rieng 'Da ghi nhan lich hen'", True, await wait_for(lambda: "Đã ghi nhận lịch hẹn" in S_own.titles()))
    m = next((x for x in S_rec.messages if x["type"] == "APPOINTMENT_CREATED"), {})
    check("thong bao mang ma lich va appointmentId de dieu huong", True, APT_CODE in m.get("body", "") and m.get("data", {}).get("appointmentCode") == APT_CODE)
    check("thong bao co id, severity, thoi gian ISO", True, bool(m.get("id")) and m.get("severity") == "INFO" and "T" in str(m.get("createdAt")))
    check("chu nuoi KHAC khong nhan thong bao nao", [], S_own2.messages)
    check("bac si khong nhan thong bao lich hen", [], [x for x in S_doc.messages if x["type"] == "APPOINTMENT_CREATED"])
    check("email xac nhan toi dung chu nuoi", True, await wait_for(lambda: any(APT_CODE in x["Subject"] for x in mailpit_messages())))
    mail = next((x for x in mailpit_messages() if APT_CODE in x["Subject"]), None)
    check("email gui toi chunuoi1@example.com", ["chunuoi1@example.com"], [t["Address"] for t in (mail or {}).get("To", [])])
    full = mailpit_body(mail["ID"]) if mail else {}
    check("noi dung email co ten, gio hen, trang thai cho xac nhan (tieng Viet khong vo dau)", True,
          all(s in full.get("Text", "") for s in ["Nguyen Van A", "09:30".replace("09:30", "09:00"), "Đang chờ phòng khám xác nhận"]))
    check("email co ma lich hen", True, APT_CODE in full.get("Text", ""))

    # Lich le tan dat thang (CONFIRMED): khong bao cho le tan, van bao chu nuoi
    before = len(S_rec.messages)
    booked2 = http("POST", "/api/v1/appointments", {"ownerId": OWN2, "petId": http("POST", "/api/v1/pets", {"ownerId": OWN2, "speciesId": 1, "name": "Mun"}, rec)["data"]["id"],
                                                    "appointmentDate": tomorrow, "startTime": "10:00", "reason": "Tiem phong", "bookingChannel": "PHONE"}, rec)
    check("le tan dat ho khach -> CONFIRMED", "CONFIRMED", booked2["data"]["status"])
    check("chu nuoi 2 nhan 'Lich hen da duoc xac nhan'", True, await wait_for(lambda: "Lịch hẹn đã được xác nhận" in S_own2.titles()))
    check("le tan khong bi bao ve lich do chinh minh dat", before, len(S_rec.messages))

    print("\n== C. TIEP NHAN CAP CUU (visit.checked_in) ==")
    checkin = http("POST", "/api/v1/clinical/pet-visits/check-in", {"petId": pet, "emergency": True, "initialSymptoms": "Kho tho"}, rec)
    VID = checkin["data"]["id"]; VCODE = checkin["data"]["visitCode"]
    check("le tan nhan canh bao CAP CUU muc CRITICAL", True, await wait_for(lambda: any(x["type"] == "VISIT_CHECKED_IN" and x["severity"] == "CRITICAL" for x in S_rec.messages)))
    check("bac si cung nhan canh bao ca cap cuu", True, await wait_for(lambda: any(x["type"] == "VISIT_CHECKED_IN" and x["severity"] == "CRITICAL" for x in S_doc.messages)))
    check("thong bao ghi ten thu cuong lay tu clinical", True, any("Lu" in x["body"] and VCODE in x["body"] for x in S_rec.messages if x["type"] == "VISIT_CHECKED_IN"))
    check("chu nuoi nhan 'Da tiep nhan thu cung'", True, await wait_for(lambda: "Đã tiếp nhận thú cưng" in S_own.titles()))

    print("\n== D. KHOA UU TIEN (doctor.priority_callback) ==")
    http("POST", f"/api/v1/clinical/pet-visits/{VID}/assign", {"doctorId": DOC}, rec)
    http("POST", f"/api/v1/clinical/pet-visits/{VID}/start-exam", {"weightAtVisit": 12.5, "temperature": 38.6, "clinicalNotes": "x"}, doc)
    svcs = http("GET", "/api/v1/clinical/services", None, rec)["data"]
    cbc = next(s["id"] for s in svcs if s["code"] == "LAB_CBC")
    http("POST", f"/api/v1/clinical/pet-visits/{VID}/services", {"services": [{"serviceId": cbc, "quantity": 1}]}, doc)
    queue = http("GET", "/api/v1/clinical/lab-queue", None, lab)["data"]
    detail = queue[0]["serviceDetailId"]
    http("POST", f"/api/v1/clinical/service-details/{detail}/start", {}, lab)
    item = http("GET", "/api/v1/clinical/lab-test-items", None, doc)["data"][0]["id"]
    done = http("POST", f"/api/v1/clinical/service-details/{detail}/lab-results", {"items": [{"labTestItemId": item, "value": 10}]}, lab)
    check("KTV Lab nhap ket qua thanh cong", 200, done["status"])
    check("DUNG bac si phu trach nhan popup CRITICAL (huy hieu Khoa uu tien)", True, await wait_for(lambda: any(x["type"] == "PRIORITY_CALLBACK" and x["severity"] == "CRITICAL" for x in S_doc.messages)))
    popup = next((x for x in S_doc.messages if x["type"] == "PRIORITY_CALLBACK"), {})
    check("popup ghi ten thu cung, ma ca va so phong P01", True, all(s in popup.get("body", "") for s in ["Lu", VCODE, "phòng P01"]))
    check("popup co action INVITE_PATIENT va doctorId", ("INVITE_PATIENT", DOC), (popup.get("data", {}).get("action"), popup.get("data", {}).get("doctorId")))
    check("le tan duoc bao bac si dang bi khoa uu tien", True, await wait_for(lambda: any(x["type"] == "PRIORITY_CALLBACK" and x["severity"] == "WARNING" and "BS Lan" in x["body"] for x in S_rec.messages)))
    check("chu nuoi duoc bao da co ket qua, quay lai phong P01", True, await wait_for(lambda: any(x["type"] == "PRIORITY_CALLBACK" and "P01" in x["body"] for x in S_own.messages)))
    check("chu nuoi 2 khong nhan gi ve ca cua nguoi khac", [], [x for x in S_own2.messages if x["type"] in ("PRIORITY_CALLBACK", "VISIT_CHECKED_IN")])

    print("\n== E. CHOT CA -> THANH TOAN -> HOAN TAT ==")
    http("POST", f"/api/v1/clinical/pet-visits/{VID}/call-back", {}, doc)
    closed = http("POST", f"/api/v1/clinical/pet-visits/{VID}/close-visit", {"diagnosis": "Viem da di ung"}, doc)
    check("bac si chot ca", 200, closed["status"])
    check("le tan nhan 'Co ca cho thanh toan'", True, await wait_for(lambda: "Có ca chờ thanh toán" in S_rec.titles()))
    inv = None
    for _ in range(30):
        r = http("GET", f"/api/v1/billing/invoices/by-visit/{VID}", None, rec)
        if r.get("data"):
            inv = r["data"]; break
        time.sleep(0.5)
    paid = http("POST", f"/api/v1/billing/invoices/{inv['id']}/confirm-payment", {}, rec)
    check("thu ngan xac nhan thanh toan", "PAID", paid["data"]["paymentStatus"])
    check("le tan nhan 'Ca kham da hoan tat'", True, await wait_for(lambda: "Ca khám đã hoàn tất" in S_rec.titles()))
    check("chu nuoi nhan 'Thanh toan hoan tat'", True, await wait_for(lambda: "Thanh toán hoàn tất" in S_own.titles()))
    check("chu nuoi nhan email xac nhan thanh toan", True, await wait_for(lambda: any(VCODE in x["Subject"] and "thanh toán" in x["Subject"] for x in mailpit_messages())))
    pay_mail = next((x for x in mailpit_messages() if VCODE in x["Subject"]), None)
    check("email thanh toan toi chunuoi1@example.com", ["chunuoi1@example.com"], [t["Address"] for t in (pay_mail or {}).get("To", [])])

    print("\n== F. TON KHO THAP (stock.low_alert) ==")
    amox = sql(f"SELECT id FROM pet_clinic_billing_pharmacy_db.medicines WHERE code='MED_AMOX'")
    http("POST", f"/api/v1/pharmacy/medicines/{amox}/adjust", {"delta": -185, "reason": "Kiem ke hao hut"}, admin)
    check("admin nhan canh bao do CRITICAL", True, await wait_for(lambda: any(x["type"] == "LOW_STOCK" and x["severity"] == "CRITICAL" for x in S_admin.messages)))
    low = next((x for x in S_admin.messages if x["type"] == "LOW_STOCK"), {})
    check("canh bao ghi ten thuoc, ton con 15, nguong 20", True, all(s in low.get("body", "") for s in ["MED_AMOX", "chỉ còn 15", "ngưỡng cảnh báo 20"]))
    check("le tan / bac si KHONG nhan canh bao kho", [], [x for x in S_rec.messages + S_doc.messages if x["type"] == "LOW_STOCK"])
    # Chong trung: cung eventId gui 2 lan -> chi 1 thong bao
    n0 = len([x for x in S_admin.messages if x["type"] == "LOW_STOCK"])
    ev = {"eventId": str(uuid.uuid4()), "occurredAt": "2026-10-28T14:00:00Z", "actorUserId": 1, "medicineId": 99, "medicineCode": "MED_DUP",
          "medicineName": "Thuoc trung", "stockQuantity": 1, "minStockAlert": 10}
    publish("stock.low_alert", ev); publish("stock.low_alert", ev)
    await wait_for(lambda: len([x for x in S_admin.messages if x["type"] == "LOW_STOCK"]) > n0, 10); await settle(2)
    check("giao lai cung su kien 2 lan: admin chi nhan 1 thong bao", n0 + 1, len([x for x in S_admin.messages if x["type"] == "LOW_STOCK"]))

    print("\n== G. LICH SU / KET NOI LAI ==")
    mine = [m for m in http("GET", "/api/v1/notifications?limit=100", None, own)["data"] if m["createdAt"] >= STARTED]
    check("chu nuoi lay lai du 4 thong bao rieng qua REST (lich hen, tiep nhan, co ket qua, thanh toan)", ["APPOINTMENT_CREATED", "PRIORITY_CALLBACK", "VISIT_CHECKED_IN", "VISIT_COMPLETED"], sorted(m["type"] for m in mine))
    check("sap xep moi nhat truoc", True, [m["createdAt"] for m in mine] == sorted((m["createdAt"] for m in mine), reverse=True))
    check("chi gom thong bao cua chinh minh (khong co LOW_STOCK)", [], [m for m in mine if m["type"] == "LOW_STOCK"])
    check("chu nuoi 2 chi thay thong bao cua minh", True, all(m["type"] == "APPOINTMENT_CREATED" for m in http("GET", "/api/v1/notifications", None, own2)["data"] if m["createdAt"] >= STARTED))
    check("admin thay canh bao kho trong lich su", True, any(m["type"] == "LOW_STOCK" for m in http("GET", "/api/v1/notifications", None, admin)["data"]))
    check("limit duoc ton trong", 2, len(http("GET", "/api/v1/notifications?limit=2", None, own)["data"]))
    check("khong token -> 401", 401, http("GET", "/api/v1/notifications")["status"])
    # Ket noi lai: kenh rieng chi gui cho phien dang mo, nen phien moi khong nhan lai thong bao cu
    S_own_new = Stomp(); await S_own_new.connect({"Authorization": "Bearer " + own}); await S_own_new.subscribe("/user/queue/notifications", "n1"); await settle(1.5)
    check("phien ket noi lai khong bi day lai thong bao cu (lay qua REST)", [], S_own_new.messages)

    print("\n== H. GUI EMAIL THU CONG ==")
    ok = http("POST", "/api/v1/notifications/send-email", {"to": "tuychon@example.com", "subject": "Thong bao thu cong", "content": "Xin chao tu VetClinic"}, admin)
    check("admin gui email -> 200", 200, ok["status"])
    check("email co trong Mailpit", True, await wait_for(lambda: any("Thong bao thu cong" in x["Subject"] for x in mailpit_messages())))
    check("le tan khong gui duoc email thu cong -> 403", "SYS_1003", http("POST", "/api/v1/notifications/send-email", {"to": "a@b.com", "subject": "x", "content": "y"}, rec).get("errorCode"))
    check("dia chi email sai -> SYS_1001", "SYS_1001", http("POST", "/api/v1/notifications/send-email", {"to": "khong-phai-email", "subject": "x", "content": "y"}, admin).get("errorCode"))
    check("thieu noi dung -> SYS_1001", "SYS_1001", http("POST", "/api/v1/notifications/send-email", {"to": "a@b.com", "subject": "x"}, admin).get("errorCode"))

    print("\n== I. LOI HA TANG: THU LAI + DLQ ==")
    n_rec = len([x for x in S_rec.messages if x["title"] == "Lịch hẹn mới chờ duyệt"])
    ghost = {"eventId": str(uuid.uuid4()), "occurredAt": "2026-10-28T14:00:00Z", "actorUserId": 1, "appointmentId": 9999, "appointmentCode": "APT-GHOST",
             "ownerId": 999999, "petId": 1, "appointmentDate": "2026-12-01", "startTime": "09:00:00", "status": "PENDING"}
    publish("appointment.created", ghost)
    dlq = 0
    for _ in range(40):
        dlq = rmq("GET", "/queues/%2F/notification-service.appointment.created.dlq").get("messages", 0)
        if dlq == 1: break
        time.sleep(1)
    check("su kien khong gui duoc email (chu nuoi khong ton tai) vao DLQ sau 3 lan thu", 1, dlq)
    await settle(1)
    check("nhung thong bao trong ung dung chi di DUNG 1 lan du bi thu lai 3 lan", n_rec + 1, len([x for x in S_rec.messages if x["title"] == "Lịch hẹn mới chờ duyệt"]))
    rmq("DELETE", "/queues/%2F/notification-service.appointment.created.dlq/contents")
    rmq("DELETE", "/queues/%2F/notification-service.stock.low_alert.dlq/contents")

    print("\n== J. RO KHOA ==")
    for s in (S_rec, S_doc, S_own, S_own2, S_admin, S_own_new):
        await s.close()
    other_dlq = sum(rmq("GET", f"/queues/%2F/notification-service.{k}.dlq").get("messages", 0) for k in
                    ["visit.checked_in", "doctor.priority_callback", "visit.closed_to_payment", "payment.completed", "stock.low_alert"])
    check("khong su kien that nao bi vao DLQ cua notification", 0, other_dlq)
    check("billing/clinical/appointment cung khong co DLQ", 0, sum(rmq("GET", f"/queues/%2F/{q}").get("messages", 0) for q in
          ["billing-pharmacy-service.visit.closed_to_payment.dlq", "clinical-service.payment.completed.dlq", "appointment-service.visit.checked_in.dlq"]))
    logs = subprocess.run(["docker", "compose", "logs", "--no-color", "--since", "20m", "notification-service"], capture_output=True, text=True, encoding="utf-8").stdout
    bad_lines = [l[:160] for l in logs.splitlines() if " ERROR " in l and "999999" not in l and "Retries exhausted" not in l and "Execution of Rabbit" not in l
                 and "StompSubProtocolHandler" not in l and "DiscoveryClient" not in l and "USER_1101" not in l and "AUTH_1101" not in l and "Listener" not in l]
    check("log notification-service khong co ERROR bat thuong", [], bad_lines[:3])

    print("\n============================================")
    print(f"   KET QUA: {PASS} dat, {FAIL} khong dat")
    print("============================================")


asyncio.run(main())
