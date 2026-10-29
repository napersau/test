// Kiểm thử giao diện thật (FE -> Gateway -> các service) bằng Chrome headless qua Chrome DevTools Protocol.
// Chạy: node e2e/fe_smoke.mjs   (cần: docker compose đang chạy, `npm run build` trong fe/ đã có thư mục build/, Chrome cài sẵn)
// Kịch bản đi trọn một ca khám qua 6 vai trò: chủ nuôi đăng ký + đặt lịch -> lễ tân duyệt + tiếp nhận + phân công ->
// bác sĩ khám + chỉ định xét nghiệm và siêu âm -> KTV xét nghiệm, KTV CĐHA nhập kết quả -> bác sĩ kê đơn + chốt ca ->
// lễ tân thu tiền + phát thuốc -> chủ nuôi xem bệnh án -> admin mở các trang quản trị.
// CẢNH BÁO: tạo dữ liệu thật (tài khoản, lịch hẹn, hóa đơn). Chỉ chạy trên môi trường thử nghiệm.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const feDir = path.resolve(here, '../fe');
const WebSocket = createRequire(path.join(feDir, 'package.json'))('ws');
const API = process.env.API_URL || 'http://localhost:8080';
const FE_PORT = Number(process.env.FE_PORT || 3000);
const FE = `http://localhost:${FE_PORT}`;
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
const DEBUG_PORT = 9333;
const RUN = Date.now().toString().slice(-6);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let passed = 0; const failures = [];
const check = (name, ok, extra = '') => { if (ok) { passed += 1; console.log(`  PASS ${name}`); } else { failures.push(name); console.log(`  FAIL ${name} ${extra}`); } };
const step = (title) => console.log(`\n== ${title}`);

// ---------- API (chuẩn bị tài khoản nhân sự) ----------
async function api(method, url, body, token) {
  const response = await fetch(`${API}${url}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : {} };
}
const STAFF = {
  vet: { roleCode: 'VETERINARIAN', fullName: 'BS Smoke', phoneNumber: '0990000001', roomNumber: '951' },
  reception: { roleCode: 'RECEPTIONIST', fullName: 'Le Tan Smoke', phoneNumber: '0990000002' },
  lab: { roleCode: 'LAB_TECHNICIAN', fullName: 'KTV XN Smoke', phoneNumber: '0990000003', roomNumber: '952' },
  imaging: { roleCode: 'IMAGING_TECHNICIAN', fullName: 'KTV CDHA Smoke', phoneNumber: '0990000004', roomNumber: '953' },
};
const PASSWORD = 'Smoke@1234';
async function prepareAccounts() {
  const login = await api('POST', '/api/v1/auth/login', { username: 'admin', password: 'Admin@123' });
  const token = login.body.data.accessToken;
  for (const account of Object.values(STAFF)) {
    const created = await api('POST', '/api/v1/auth/users', { ...account, password: PASSWORD, username: account.phoneNumber }, token);
    if (created.status >= 300) {
      // đã tồn tại từ lần chạy trước: đặt lại mật khẩu và mở khóa
      const found = await api('GET', `/api/v1/auth/users?keyword=${account.phoneNumber}`, undefined, token);
      const user = found.body.data?.items?.[0];
      if (user) { await api('POST', `/api/v1/auth/users/${user.id}/reset-password`, { newPassword: PASSWORD }, token); await api('POST', `/api/v1/auth/users/${user.id}/status`, { status: 'ACTIVE' }, token); }
    }
  }
}

// ---------- máy chủ tĩnh cho bản build (nếu cổng FE chưa có ai nghe) ----------
async function ensureFrontend() {
  const alive = await fetch(FE).then(() => true).catch(() => false);
  if (alive) return null;
  const root = path.join(feDir, 'build');
  if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Chưa có fe/build — chạy `npm run build` trong fe/ trước.');
  const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
  const server = http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(new URL(req.url, FE).pathname));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(FE_PORT, resolve));
  return server;
}

// ---------- CDP ----------
class Browser {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.problems = []; this.requests = new Map();
    ws.on('message', (raw) => {
      const message = JSON.parse(raw);
      if (message.id && this.pending.has(message.id)) { const { resolve, reject } = this.pending.get(message.id); this.pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); return; }
      if (message.method === 'Runtime.exceptionThrown') this.problems.push(`exception: ${message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text}`);
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') this.problems.push(`console.error: ${message.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200)}`);
      if (message.method === 'Network.requestWillBeSent') this.requests.set(message.params.requestId, message.params.request.url);
      if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) this.problems.push(`HTTP ${message.params.response.status} ${message.params.response.url.replace(API, '')}`);
    });
  }
  send(method, params = {}) { const id = ++this.id; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async goto(route) { await this.send('Page.navigate', { url: `${FE}${route}` }); await sleep(600); await this.waitFor('document.readyState === "complete"', 15000); }
  async waitFor(expression, timeout = 12000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) { try { if (await this.eval(`Boolean(${expression})`)) return true; } catch { /* trang đang chuyển */ } await sleep(250); }
    return false;
  }
  text() { return this.eval('document.body.innerText'); }
  async hasText(text, timeout = 12000) { return this.waitFor(`document.body.innerText.includes(${JSON.stringify(text)})`, timeout); }
  async click(text, scope = 'button, a, [role="tab"]') {
    const ok = await this.waitFor(`(${findByText})(${JSON.stringify(text)}, ${JSON.stringify(scope)})`, 10000);
    if (!ok) throw new Error(`Không thấy nút/liên kết "${text}"`);
    await this.eval(`(${findByText})(${JSON.stringify(text)}, ${JSON.stringify(scope)}).click()`);
    await sleep(350);
  }
  async clickRow(rowText, buttonText) {
    const script = `(() => { const rows = [...document.querySelectorAll('tr, .ui-list > li')].filter((r) => r.innerText.includes(${JSON.stringify(rowText)}) && ![...r.querySelectorAll('tr, li')].some((c) => c.innerText.includes(${JSON.stringify(rowText)})));
      for (const row of rows) { const el = [...row.querySelectorAll('button, a')].find((x) => !x.disabled && x.textContent.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(buttonText)}); if (el) return el; } return null; })()`;
    if (!(await this.waitFor(script, 12000))) throw new Error(`Không thấy nút "${buttonText}" ở hàng chứa "${rowText}". Trang: ${(await this.text()).replace(/\s+/g, ' ').slice(0, 1200)}`);
    await this.eval(script + '.click()');
    await sleep(350);
  }
  async fill(label, value) {
    const ok = await this.waitFor(`(${findField})(${JSON.stringify(label)})`, 10000);
    if (!ok) throw new Error(`Không thấy ô nhập "${label}"`);
    // ô chọn nạp lựa chọn bất đồng bộ: thử lại tới khi có lựa chọn cần chọn
    const end = Date.now() + 10000;
    for (;;) {
      try { await this.eval(`(${setValue})((${findField})(${JSON.stringify(label)}), ${JSON.stringify(String(value))})`); break; } catch (problem) {
        if (!/Không có lựa chọn/.test(problem.message) || Date.now() > end) throw problem;
        await sleep(300);
      }
    }
    await sleep(120);
  }
  async setFiles(label, files) {
    const { root } = await this.send('DOM.getDocument');
    const { nodeIds } = await this.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'input[type=file]' });
    if (!nodeIds.length) throw new Error(`Không thấy ô chọn tệp "${label}"`);
    await this.send('DOM.setFileInputFiles', { nodeId: nodeIds[0], files });
    await sleep(300);
  }
  async reset() { await this.goto('/auth/login'); await this.eval('localStorage.clear(); sessionStorage.clear()'); }
  async login(username, password) {
    await this.reset(); await this.goto('/auth/login');
    await this.fill('Tên đăng nhập hoặc số điện thoại', username); await this.fill('Mật khẩu', password);
    await this.click('Đăng nhập', 'button[type=submit]');
    return this.waitFor('!location.pathname.startsWith("/auth/login")', 15000);
  }
}

// Các hàm chạy TRONG trang (được stringify), nên chỉ dùng DOM.
function findByText(text, scope) {
  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const root = document.querySelector('dialog[open]') || document;
  const norm = (value) => value.replace(/\s+/g, ' ').trim();
  const items = [...root.querySelectorAll(scope)].filter((el) => visible(el) && !el.disabled);
  return items.find((el) => norm(el.textContent) === text) || items.find((el) => norm(el.textContent).includes(text));
}
function findField(label) {
  const root = document.querySelector('dialog[open]') || document;
  const norm = (value) => value.replace(/\s+/g, ' ').trim();
  const byAria = [...root.querySelectorAll('input,select,textarea')].find((el) => (el.getAttribute('aria-label') || '').startsWith(label));
  if (byAria) return byAria;
  const labels = [...root.querySelectorAll('label')].filter((el) => { const head = el.querySelector(':scope > span'); return head && norm(head.textContent).startsWith(label); });
  const control = labels.length && labels[0].querySelector('input,select,textarea');
  if (control) return control;
  return [...root.querySelectorAll('input,textarea')].find((el) => (el.placeholder || '').includes(label));
}
function setValue(el, value) {
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  if (el.tagName === 'SELECT') {
    const option = [...el.options].find((o) => o.textContent.trim() === value) || [...el.options].find((o) => o.textContent.includes(value)) || [...el.options].find((o) => o.value === value);
    if (!option) throw new Error(`Không có lựa chọn "${value}"`);
    value = option.value;
  }
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function launchChrome() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fe-smoke-'));
  const child = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 40; i += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = targets.find((t) => t.type === 'page');
      if (page) { const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((resolve) => ws.on('open', resolve)); const browser = new Browser(ws); for (const domain of ['Page', 'Runtime', 'Network', 'DOM']) await browser.send(`${domain}.enable`); return { browser, child, profile }; }
    } catch { /* chờ Chrome khởi động */ }
    await sleep(500);
  }
  throw new Error('Không khởi động được Chrome');
}

function writePng() {
  // PNG 1x1 hợp lệ (magic byte đúng — backend kiểm tra nội dung tệp, không tin phần mở rộng)
  const file = path.join(os.tmpdir(), `smoke-${RUN}.png`);
  fs.writeFileSync(file, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  return file;
}

// ---------- kịch bản ----------
async function main() {
  if (!CHROME) throw new Error('Không tìm thấy Chrome; đặt CHROME_PATH.');
  await prepareAccounts();
  const server = await ensureFrontend();
  const { browser: b, child, profile } = await launchChrome();
  const owner = { name: `Chu Smoke ${RUN}`, phone: `098${RUN}1`.slice(0, 10), password: 'Owner@1234', pet: `Milo${RUN}` };
  const png = writePng();
  try {
    step('1. Chủ nuôi: đăng ký, thêm thú cưng, đặt lịch');
    await b.reset(); await b.goto('/auth/register');
    await b.fill('Họ và tên', owner.name); await b.fill('Số điện thoại', owner.phone);
    await b.fill('Mật khẩu', owner.password); await b.fill('Xác nhận mật khẩu', owner.password);
    await b.eval('document.querySelector("input[name=terms]").click()');
    await b.click('Tạo tài khoản', 'button[type=submit]');
    check('đăng ký xong và vào được cổng khách hàng', await b.waitFor('!location.pathname.startsWith("/auth/")', 15000), await b.text());
    await b.goto('/portal/pets');
    await b.click('+ Thêm thú cưng'); await b.fill('Tên thú cưng', owner.pet); await b.fill('Loài', 'Chó'); await b.click('Thêm thú cưng', 'button[type=submit]');
    check('thêm thú cưng thành công', await b.hasText(`Đã lưu hồ sơ của ${owner.pet}`), (await b.text()).slice(0, 300));
    await b.goto('/portal/booking');
    await b.fill('Thú cưng', owner.pet); await b.fill('Lý do khám', 'Bỏ ăn hai ngày');
    check('có khung giờ trống', await b.waitFor('document.querySelector(".ui-slot:not([disabled])")'));
    await b.eval('document.querySelector(".ui-slot:not([disabled])").click()');
    await b.click('Gửi yêu cầu đặt lịch', 'button[type=submit]');
    check('gửi yêu cầu đặt lịch', await b.hasText('Đã gửi yêu cầu đặt lịch'), (await b.text()).slice(0, 300));
    await b.goto('/portal/appointments');
    check('lịch hẹn ở trạng thái Chờ xác nhận', await b.hasText('Chờ xác nhận'));

    step('2. Lễ tân: duyệt lịch, tiếp nhận khách vãng lai, phân công bác sĩ');
    check('lễ tân đăng nhập', await b.login(STAFF.reception.phoneNumber, PASSWORD));
    await b.goto('/reception/appointments');
    check('thấy lịch chờ duyệt của chủ nuôi', await b.hasText(owner.name));
    await b.clickRow(owner.name, 'Xác nhận');
    check('xác nhận lịch hẹn', await b.hasText('Đã xác nhận lịch'));
    await b.goto('/reception/intake'); await b.click('Khách vãng lai', '[role=tab]');
    await b.fill('Tìm chủ nuôi', owner.phone);
    check('tìm thấy chủ nuôi theo SĐT', await b.waitFor(`[...document.querySelectorAll(".ui-list li")].some(li => li.innerText.includes(${JSON.stringify(owner.name)}))`));
    await b.click('Chọn');
    check('tự chọn thú cưng duy nhất', await b.waitFor(`document.querySelector("select.ui-input") && document.querySelector("select.ui-input").selectedOptions[0].textContent.includes(${JSON.stringify(owner.pet)})`));
    await b.fill('Triệu chứng ban đầu', 'Bỏ ăn, nôn');
    await b.click('Tiếp nhận', 'button[type=submit]');
    check('tiếp nhận thành công', await b.hasText('Đã tiếp nhận'), (await b.text()).slice(0, 300));
    await b.goto('/reception/queue');
    check('ca hiện trong hàng đợi', await b.hasText(owner.pet));
    await b.clickRow(owner.pet, 'Phân công');
    await b.fill('Bác sĩ', STAFF.vet.fullName); await b.click('Phân công', 'button[type=submit]');
    check('phân công bác sĩ', await b.hasText('Đã phân công bác sĩ'), (await b.text()).slice(0, 400));

    step('3. Bác sĩ: khám, chỉ định xét nghiệm + siêu âm');
    check('bác sĩ đăng nhập', await b.login(STAFF.vet.phoneNumber, PASSWORD));
    check('thấy ca được phân công', await b.hasText(owner.pet));
    await b.clickRow(owner.pet, 'Mở hồ sơ');
    await b.fill('Cân nặng', '12.5'); await b.fill('Thân nhiệt', '39.1'); await b.click('Bắt đầu khám', 'button[type=submit]');
    check('bắt đầu khám (giai đoạn 1)', await b.hasText('Chỉ định dịch vụ'));
    await b.eval(`[...document.querySelectorAll("label.ui-check")].find(l => l.innerText.includes("CBC")).querySelector("input").click()`);
    await b.eval(`[...document.querySelectorAll("label.ui-check")].find(l => l.innerText.includes("Siêu âm")).querySelector("input").click()`);
    await b.click('Chỉ định và chuyển sang chờ kết quả');
    check('chỉ định CLS, bác sĩ được giải phóng', await b.waitFor('location.pathname === "/vet/today"', 10000));
    check('ca chờ kết quả không còn chiếm chỗ bác sĩ', !(await b.text()).includes(owner.pet));

    step('4. KTV xét nghiệm và KTV CĐHA nhập kết quả');
    check('KTV xét nghiệm đăng nhập', await b.login(STAFF.lab.phoneNumber, PASSWORD));
    check('thấy ca CBC trong hàng đợi lab', await b.hasText(owner.pet));
    await b.clickRow(owner.pet, 'Bắt đầu');
    check('mở form nhập kết quả', await b.waitFor('location.pathname.startsWith("/lab/entry/")'));
    for (const [name, value] of [['Bạch cầu', '25'], ['Hồng cầu', '6'], ['Huyết sắc tố', '14'], ['Tiểu cầu', '300']]) await b.fill(`Giá trị ${name}`, value);
    await b.click('Lưu kết quả và hoàn tất', 'button[type=submit]');
    check('lưu kết quả xét nghiệm', await b.waitFor('location.pathname === "/lab/queue"', 10000), (await b.text()).slice(0, 300));
    check('KTV CĐHA đăng nhập', await b.login(STAFF.imaging.phoneNumber, PASSWORD));
    check('thấy ca siêu âm', await b.hasText(owner.pet));
    await b.clickRow(owner.pet, 'Bắt đầu');
    await b.fill('Mô tả', 'Gan, thận bình thường'); await b.fill('Kết luận', 'Không phát hiện bất thường');
    await b.setFiles('Tệp ảnh', [png]);
    await b.click('Lưu kết quả và hoàn tất', 'button[type=submit]');
    check('lưu kết quả CĐHA kèm ảnh', await b.waitFor('location.pathname === "/imaging/queue"', 15000), (await b.text()).slice(0, 300));

    step('5. Bác sĩ: mời tái khám, kê đơn, chốt ca');
    await b.login(STAFF.vet.phoneNumber, PASSWORD);
    check('ca đã có kết quả được ưu tiên', await b.hasText('Ca đã có kết quả — mời vào khám tiếp'));
    await b.clickRow(owner.pet, 'Mời vào khám'); await b.clickRow(owner.pet, 'Mở hồ sơ');
    check('thấy kết quả xét nghiệm có đánh giá (WBC cao)', await b.hasText('Cao') && await b.hasText('Bạch cầu'));
    await b.click('Đơn thuốc', '[role=tab]');
    await b.waitFor('document.querySelectorAll("select.ui-input option").length > 2');
    await b.fill('Thuốc', 'Clavamox'); await b.fill('Liều dùng', '1 viên/lần'); await b.fill('Tần suất', '2 lần/ngày');
    await b.click('Lưu đơn thuốc');
    check('lưu đơn thuốc', await b.hasText('Đã lưu đơn thuốc'));
    await b.click('Chốt ca', '[role=tab]'); await b.fill('Chẩn đoán', 'Viêm dạ dày ruột cấp');
    await b.click('Chốt ca và chuyển thanh toán'); await b.click('Chốt ca', 'button[type=submit]');
    check('chốt ca, về danh sách', await b.waitFor('location.pathname === "/vet/today"', 12000), (await b.text()).slice(0, 300));

    step('6. Lễ tân: thu tiền, phát thuốc');
    await b.login(STAFF.reception.phoneNumber, PASSWORD);
    await b.goto('/reception/invoices');
    check('hóa đơn chờ thanh toán đã được lập tự động', await b.hasText('Chờ thanh toán') && await b.hasText(owner.pet, 15000), (await b.text()).slice(0, 300));
    await b.clickRow(owner.pet, 'Mở');
    check('hóa đơn có dịch vụ và thuốc', await b.hasText('Xét nghiệm') && await b.hasText('Clavamox'));
    await b.click('Xác nhận thanh toán'); await b.click('Đã thu tiền', 'button[type=submit]');
    check('thanh toán thành công', await b.hasText('Đã ghi nhận thanh toán'), (await b.text()).slice(0, 300));
    await b.goto('/reception/dispense');
    check('đơn thuốc nằm trong hàng đợi phát thuốc', await b.hasText(owner.pet));
    await b.clickRow(owner.pet, 'Chi tiết'); await b.click('Phát thuốc', 'button'); await b.click('Phát thuốc', 'button[type=submit]');
    check('phát thuốc thành công', await b.hasText('Đã phát thuốc cho'), (await b.text()).slice(0, 300));

    step('7. Chủ nuôi: xem bệnh án + thông báo');
    await b.login(owner.phone, owner.password);
    await b.goto('/portal/medical-history');
    check('bệnh án hiện chẩn đoán, xét nghiệm, đơn thuốc', await b.hasText('Viêm dạ dày ruột cấp') && await b.hasText('Clavamox') && await b.hasText('Bạch cầu'), (await b.text()).slice(0, 500));
    check('ảnh siêu âm tải được', await b.waitFor('document.querySelector("img.ui-image") && document.querySelector("img.ui-image").naturalWidth > 0'));
    await b.goto('/portal/notifications');
    check('có thông báo từ phòng khám', await b.waitFor('document.querySelectorAll(".ui-list li").length > 0', 8000));
    check('chủ nuôi được báo khi lễ tân duyệt lịch (UC-17)', await b.hasText('Lịch hẹn đã được xác nhận', 8000), (await b.text()).slice(0, 400));

    step('8. Admin: các trang quản trị tải được');
    check('admin đăng nhập', await b.login('admin', 'Admin@123'));
    for (const [route, marker] of [['/admin/dashboard', 'Ca khám hôm nay'], ['/admin/users', 'Tài khoản & nhân sự'], ['/admin/visits', 'Đợt khám'], ['/admin/services', 'Khám lâm sàng tổng quát'], ['/admin/lab-config', 'Bạch cầu'], ['/admin/species', 'Chó'], ['/admin/medicines', 'Clavamox'], ['/admin/reports', 'Doanh thu thực thu']]) {
      await b.goto(route);
      check(`${route} tải được`, await b.hasText(marker, 15000) && !(await b.text()).includes('Thử lại'), (await b.text()).slice(0, 200));
    }
    await b.click('Vận hành', '[role=tab]');
    check('báo cáo vận hành', await b.hasText('Tổng số ca'));

    step('9. Phân quyền phía giao diện');
    await b.login(STAFF.lab.phoneNumber, PASSWORD);
    await b.goto('/admin/users');
    check('KTV vào trang admin bị chặn (403)', await b.hasText('Bạn không có quyền truy cập'));
    await b.reset(); await b.goto('/reception/queue');
    check('chưa đăng nhập bị chuyển về trang đăng nhập', await b.waitFor('location.pathname === "/auth/login"'));
  } finally {
    const unexpected = b.problems.filter((p) => !/HTTP 404 \/api\/v1\/pharmacy\/prescriptions\/by-visit/.test(p) && !/HTTP 401 \/api\/v1\/auth\/(login|me)/.test(p));
    console.log(`\nLỗi console/mạng phát sinh trong lúc chạy (${unexpected.length}):`); [...new Set(unexpected)].slice(0, 25).forEach((p) => console.log(`  - ${p}`));
    child.kill(); server?.close(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome còn giữ tệp */ }
  }
  console.log(`\n${passed} đạt, ${failures.length} lỗi${failures.length ? `: ${failures.join('; ')}` : ''}`);
  process.exit(failures.length ? 1 : 0);
}

export { launchChrome, STAFF, PASSWORD, sleep };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((problem) => { console.error(problem); process.exit(2); });
