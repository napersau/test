// Browser QA uses the real seed button/login forms in isolated Chrome profiles only.
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../build');
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Run npm run build and wait for success before browser preview.');
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pawcare-demo-preview-'));
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const candidate = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (candidate !== root && !candidate.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(file)] || 'text/html; charset=utf-8'); res.end(fs.readFileSync(file));
});
const pause = () => new Promise((resolve) => setTimeout(resolve, 120));
async function check(width, port) {
  const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--remote-debugging-port=0', '--user-data-dir=' + path.join(outputDir, 'chrome-' + width), '--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1', 'about:blank'], { windowsHide: true });
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Chrome startup timeout')), 15000);
      browser.on('error', reject); browser.stderr.on('data', (data) => { const match = data.toString().match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
    });
    socket = new WebSocket(endpoint); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0; const pending = new Map(); const exceptions = [];
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data); if (msg.method === 'Runtime.exceptionThrown') exceptions.push(msg.params.exceptionDetails.text);
      const request = pending.get(msg.id); if (request) { pending.delete(msg.id); msg.error ? request.reject(new Error(msg.error.message)) : request.resolve(msg.result); }
    };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId })); });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const evalJS = async (expression) => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
    const until = async (expression) => { for (let attempt = 0; attempt < 80; attempt++) { if (await evalJS(expression)) return; await pause(); } throw new Error('Timeout: ' + expression + '\n' + await evalJS('JSON.stringify({url:location.href,state:document.readyState,body:document.body.innerText,scripts:[...document.scripts].map(node=>node.src)})') + '\nRuntime: ' + exceptions.join('; ')); };
    const click = async (text) => { await evalJS(`[...document.querySelectorAll('button,a')].find(node=>node.textContent.trim()===${JSON.stringify(text)}).click()`); await pause(); };
    const fill = async (selector, value) => { await evalJS(`(()=>{ const node=document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,${JSON.stringify(value)}); node.dispatchEvent(new Event('input',{bubbles:true})); })()`); };
    const navigate = async (route) => { await send('Page.navigate', { url: `http://127.0.0.1:${port}${route}` }, sessionId); await until('!!document.querySelector("h1")'); await pause(); await evalJS('document.fonts.ready'); };
    const shot = async (label) => {
      const metrics = await evalJS(`({width:innerWidth,page:document.documentElement.scrollWidth,dialog:document.querySelector('dialog[open]')?[document.querySelector('dialog[open]').getBoundingClientRect().width,document.querySelector('dialog[open]').scrollWidth,document.querySelector('dialog[open]').contains(document.activeElement)]:null})`);
      if (metrics.page > width || (metrics.dialog && (metrics.dialog[0] > width || metrics.dialog[1] > metrics.dialog[0] + 1 || !metrics.dialog[2]))) throw new Error('Overflow/focus: ' + JSON.stringify(metrics));
      if (await evalJS(`!![...document.querySelectorAll('.care-report-section .admin-stat strong')].find(node=>node.scrollWidth>node.clientWidth+1)`)) throw new Error('Report money clipped at ' + label);
      if (await evalJS(`!![...document.querySelectorAll('[role=alert]')].find(node=>node.textContent.includes('không hợp lệ')||node.textContent.includes('Không thể tải'))`)) throw new Error('Source error at ' + label);
      const png = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
      fs.writeFileSync(path.join(outputDir, `${width}-${label}.png`), Buffer.from(png.data, 'base64'));
    };
    const login = async (email) => {
      await navigate('/auth/login'); await fill('#login-email', email); await fill('#login-password', '123456');
      await evalJS('document.querySelector(".auth-form").requestSubmit()'); await until('location.pathname!=="/auth/login"'); await pause();
    };
    await send('Runtime.enable', {}, sessionId); await send('Page.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 }, sessionId);
    await login('admin@admin'); await navigate('/admin/dashboard');
    await evalJS('if(document.querySelector(".admin-shell").dataset.theme==="dark")document.querySelector(".admin-theme-toggle").click()'); await pause();
    if (await evalJS('!!localStorage.getItem("pawcare_demo_dataset_v1")')) throw new Error('Unexpected automatic seed');
    await click('Nạp dữ liệu demo'); await shot('seed-confirm-light');
    await evalJS('document.querySelector(".demo-confirm-check input").click()'); await click('Xác nhận nạp demo');
    await until('!!document.querySelector(".demo-account-grid")'); await evalJS('document.querySelector(".demo-data-panel").scrollIntoView({behavior:"instant"})'); await shot('seed-complete-light');
    const counts = await evalJS('JSON.parse(localStorage.getItem("pawcare_demo_dataset_v1")).counts');
    if (counts.pets !== 12 || counts.visits !== 15 || counts.appointments !== 25) throw new Error('Wrong fixture counts');
    await click('Bổ sung dữ liệu demo V2'); await shot('v2-confirm');
    await evalJS('document.querySelector(".demo-confirm-check input").click()'); await click('Xác nhận nạp demo');
    await until('JSON.parse(localStorage.getItem("pawcare_demo_dataset_v1")).revision===2'); await pause();
    const extended = await evalJS('JSON.parse(localStorage.getItem("pawcare_demo_dataset_v1")).counts');
    if (extended.appointments !== 31 || extended.visits !== 21 || extended.invoices !== 16 || extended.staff !== 6) throw new Error('Wrong V2 counts');
    const original = await evalJS('localStorage.getItem("pawcare_appointments_v1")'); await navigate('/admin/dashboard');
    if ((await evalJS('localStorage.getItem("pawcare_appointments_v1")')) !== original) throw new Error('Reload re-seeded data');
    await evalJS('document.querySelector(".admin-theme-toggle").click();document.querySelector(".demo-data-panel").scrollIntoView({behavior:"instant"})'); await shot('seed-complete-dark');
    await evalJS('document.querySelector(".admin-theme-toggle").click()');
    for (const route of ['staff', 'users?role=VETERINARIAN', 'users?role=RECEPTIONIST', 'services', 'medicines', 'activity', 'reports']) { await navigate('/admin/' + route); await shot('admin-' + route.replace(/[^a-z0-9]/gi, '-')); }
    await until('!!document.querySelector(".care-report-section")'); await evalJS('document.querySelector(".care-report-section").scrollIntoView({behavior:"instant"})'); await shot('admin-care-report-light');
    await evalJS('document.querySelector(".admin-theme-toggle").click()'); await shot('admin-care-report-dark');
    await login('demo.customer@pawcare.vn');
    for (const route of ['profile', 'pets', 'booking', 'appointments', 'medical-history', 'vaccinations', 'prescriptions', 'invoices', 'notifications']) { await navigate('/portal/' + route); await shot('customer-' + route); }
    if (await evalJS('document.body.textContent.includes("GHI_CHU_NOI_BO")')) throw new Error('Private note leaked');
    await evalJS('document.querySelector(".notification-list").scrollIntoView({behavior:"instant"})'); await shot('notification-list');
    await evalJS('document.querySelector(".notification-card-actions button").click()'); await until('document.body.textContent.includes("Đã đánh dấu thông báo đã đọc")');
    await evalJS('document.querySelector(".notification-card-actions a").click()'); await pause(); await shot('notification-deep-link');
    await login('demo.reception@pawcare.vn');
    for (const route of ['customers', 'pets', 'intake', 'appointments', 'invoices']) { await navigate('/reception/' + route); await shot('reception-' + route); }
    await login('demo.vet@pawcare.vn');
    for (const route of ['today', 'appointments', 'records', 'diagnoses', 'prescriptions', 'service-orders', 'health-history']) { await navigate('/vet/' + route); await shot('vet-' + route); }
    await navigate('/vet/health-history/demo-v1-pet-1'); await until('!!document.querySelector(".vet-health-chart")');
    await evalJS('document.querySelector(".vet-health-chart").scrollIntoView({behavior:"instant"})'); await shot('vet-weight-history');
    const active = await evalJS('JSON.parse(localStorage.getItem("pawcare_appointments_v1")).find(item=>item.status==="IN_PROGRESS"&&item.assignedDoctorId==="demo-v1-vet-1").id');
    for (const route of ['records', 'diagnoses', 'prescriptions', 'service-orders']) { await navigate('/vet/' + route + '/' + active); await shot('vet-active-' + route); }
    if (exceptions.length) throw new Error('Runtime exceptions: ' + exceptions.join('; '));
    console.log(width + 'px: PASS — explicit V1/V2 seed/idempotence, staff/care reports, 4-role pages, notifications/read/deep-link, clinical forms, weight history, themes/overflow/focus');
  } finally { socket?.close(); browser.kill(); }
}
server.listen(0, '127.0.0.1', async () => {
  try { for (const width of [375, 768, 1280]) await check(width, server.address().port); console.log('Screenshots: ' + outputDir); }
  catch (error) { console.error(error); process.exitCode = 1; }
  finally { server.close(); }
});
