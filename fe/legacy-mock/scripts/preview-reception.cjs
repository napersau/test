// Production preview: temporary Chrome profiles only; never uses the user's browser data.
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../build');
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pawcare-reception-preview-'));
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const workflowOnly = process.argv.includes('--workflow');
const { makeCustomerRecordsFixtures } = require('../src/test/customerRecordsFixtures');
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const candidate = path.resolve(root, '.' + pathname);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(file)] || 'text/html; charset=utf-8');
  const data = fs.readFileSync(file);
  res.end(path.extname(file) === '.html' ? data.toString().replace('<head>', '<head><script>localStorage.setItem("pawcare_auth_session",JSON.stringify({id:"reception-demo",role:"RECEPTIONIST"}));</script>') : data);
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
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0; const pending = new Map(); const exceptions = [];
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') exceptions.push(msg.params.exceptionDetails.text);
      const request = pending.get(msg.id); if (request) { pending.delete(msg.id); msg.error ? request.reject(new Error(msg.error.message)) : request.resolve(msg.result); }
    };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId })); });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const evalJS = async (expression) => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; };
    const until = async (expression) => { for (let attempt = 0; attempt < 80; attempt++) { if (await evalJS(expression)) return; await pause(); } throw new Error('Timeout: ' + expression + '\n' + await evalJS('JSON.stringify({url:location.href,appointments:localStorage.getItem("pawcare_appointments_v1"),body:document.body.innerText})')); };
    const click = async (text) => { await evalJS(`[...document.querySelectorAll('button, a')].find(node => node.textContent.trim() === ${JSON.stringify(text)}).click()`); await pause(); };
    const fill = async (selector, value) => { await evalJS(`(() => { const node=document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(node.tagName==='SELECT' ? HTMLSelectElement.prototype : node.tagName==='TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,'value').set.call(node,${JSON.stringify(value)}); node.dispatchEvent(new Event('input',{bubbles:true})); node.dispatchEvent(new Event('change',{bubbles:true})); })()`); await pause(); };
    const shot = async (label) => {
      const overflow = await evalJS(`JSON.stringify({width:innerWidth,page:document.documentElement.scrollWidth,dialog:document.querySelector('dialog[open]') ? [document.querySelector('dialog[open]').getBoundingClientRect().width,document.querySelector('dialog[open]').scrollWidth,document.querySelector('dialog[open]').contains(document.activeElement)] : null})`);
      const metrics = JSON.parse(overflow);
      if (metrics.page > width || (metrics.dialog && (metrics.dialog[0] > width || metrics.dialog[1] > metrics.dialog[0] + 1 || !metrics.dialog[2]))) throw new Error('Overflow or focus: ' + overflow);
      const png = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
      fs.writeFileSync(path.join(outputDir, `${width}-${label}.png`), Buffer.from(png.data, 'base64'));
    };
    const navigate = async (route) => { await send('Page.navigate', { url: `http://127.0.0.1:${port}${route}` }, sessionId); await until('!!document.querySelector(".reception-shell") && !document.querySelector(".admin-loading")'); };
    await send('Runtime.enable', {}, sessionId);
    await send('Page.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 }, sessionId);
    if (workflowOnly) {
      const stamp = '2026-10-03T00:00:00.000Z';
      const appointment = { id: 'preview-online', code: 'APT-PREVIEW', ownerId: 'customer-demo', petId: 'pet-bo-demo', petName: 'Bô', serviceId: 'service-1', serviceName: 'Khám tổng quát', estimatedPrice: 150000, reason: 'Lý do fixture kiểm thử', startsAt: '2026-10-03T08:00:00+07:00', status: 'PENDING', source: 'ONLINE', preferredDoctorId: '', preferredDoctorName: '', cancellationReason: '', createdAt: stamp, updatedAt: stamp, version: 1 };
      await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const NativeDate=Date; const now=${Date.parse(stamp)}; window.Date=new Proxy(NativeDate,{construct(target,args){return Reflect.construct(target,args.length?args:[now]);},apply(){return new NativeDate(now).toString();},get(target,key){return key==='now'?()=>now:Reflect.get(target,key);}}); if(!localStorage.getItem('preview_workflow_initialized')){localStorage.setItem('pawcare_appointments_v1',${JSON.stringify(JSON.stringify([appointment]))});localStorage.setItem('preview_workflow_initialized','1');} })();` }, sessionId);
      await navigate('/reception/intake'); await evalJS('document.fonts.ready'); await shot('intake-light');
      await evalJS(`[...document.querySelectorAll('.intake-tabs button')].find(node=>node.textContent.startsWith('Yêu cầu online')).click()`); await pause();
      await until(`!!document.querySelector('button[aria-label="Xác nhận APT-PREVIEW"]')`);
      await evalJS(`document.querySelector('button[aria-label="Xác nhận APT-PREVIEW"]').click()`); await pause(); await shot('confirm-editor');
      await fill('#intake-assignedDoctorId', 'vet-demo'); await fill('#intake-roomId', 'room-demo-1');
      const ack = async () => { await evalJS(`document.querySelector('dialog input[name="acknowledged"]').click()`); await pause(); };
      await ack(); await click('Xác nhận lịch khám'); await until('!document.querySelector("dialog[open]")');
      await evalJS(`document.querySelector('button[aria-label="Tiếp nhận APT-PREVIEW"]').click()`); await pause(); await shot('check-in-editor');
      await ack(); await click('Xác nhận tiếp nhận'); await until('!document.querySelector("dialog[open]")');
      if (!(await evalJS(`JSON.parse(localStorage.getItem('pawcare_appointments_v1'))[0].status==='CHECKED_IN'`))) throw new Error('Check-in transition failed');
      await click('Tiếp nhận khách trực tiếp'); await fill('#intake-ownerId', 'customer-demo'); await fill('#intake-petId', 'pet-bella-demo'); await fill('#intake-serviceId', 'service-1'); await fill('#intake-reason', 'Khách trực tiếp fixture'); await fill('#intake-assignedDoctorId', 'vet-two'); await fill('#intake-roomId', 'room-demo-2'); await fill('#intake-priority', 'PRIORITY'); await ack(); await shot('walk-in-editor'); await click('Xác nhận tiếp nhận'); await until('!document.querySelector("dialog[open]")'); await shot('queue-light');
      if (!(await evalJS(`document.querySelector('tbody tr').textContent.includes('Bella')`))) throw new Error('Queue priority failed');
      await evalJS('document.querySelector(".admin-theme-toggle").click()'); await pause(); await shot('queue-dark');
      await navigate('/reception/appointments'); await shot('appointments-dark'); await click('Tạo lịch hẹn');
      await fill('#intake-ownerId', 'customer-demo'); await fill('#intake-petId', 'pet-bo-demo'); await fill('#intake-serviceId', 'service-1'); await fill('#intake-reason', 'Lịch tại quầy fixture'); await fill('#intake-assignedDoctorId', 'vet-demo'); await fill('#intake-roomId', 'room-demo-1'); await ack(); await shot('scheduled-editor-dark'); await click('Lưu và xác nhận lịch'); await until('!document.querySelector("dialog[open]")');
      const scheduledCode = await evalJS(`JSON.parse(localStorage.getItem('pawcare_appointments_v1')).find(item=>item.reason==='Lịch tại quầy fixture').code`);
      await evalJS(`document.querySelector('button[aria-label="Sửa ${scheduledCode}"]').click()`); await pause(); await fill('#intake-time', '10:00'); await ack(); await click('Lưu và xác nhận lịch'); await until('!document.querySelector("dialog[open]")');
      await evalJS(`document.querySelector('button[aria-label="Hủy ${scheduledCode}"]').click()`); await pause(); await fill('#staff-close-reason', 'Khách đổi kế hoạch fixture'); await shot('cancel-dialog'); await click('Xác nhận thao tác'); await until('!document.querySelector("dialog[open]")');
      if (!(await evalJS(`JSON.parse(localStorage.getItem('pawcare_appointments_v1')).find(item=>item.code===${JSON.stringify(scheduledCode)}).status==='CANCELLED'`))) throw new Error('Schedule cancellation failed');
      await navigate('/reception/invoices'); await shot('billing-empty');
      const fixture = makeCustomerRecordsFixtures('2026-10-03'); const sourceVisit = { ...fixture.visits[0], billableItems: fixture.invoices[0].items };
      await evalJS(`localStorage.setItem('pawcare_medical_records_v1',${JSON.stringify(JSON.stringify([sourceVisit]))});window.dispatchEvent(new Event('pawcare:medical-records-changed'));`); await pause(); await shot('billing-source');
      await evalJS(`document.querySelector('button[aria-label="Lập hóa đơn visit-rx-fixture"]').click()`); await pause(); await shot('invoice-issue-dialog'); await click('Xác nhận lập hóa đơn'); await until('!!document.querySelector(".staff-invoice-page") && !document.querySelector("dialog[open]")'); await shot('invoice-dark');
      if (await evalJS(`document.body.textContent.includes('PRIVATE_FIXTURE_NOTE') || document.querySelector('.staff-invoice-page').textContent.includes('Thuốc chưa cấp')`)) throw new Error('Unsafe or unfulfilled charge displayed');
      await click('Ghi nhận thanh toán'); await fill('#payment-amount', '200001'); await ack(); await click('Lưu thanh toán demo'); await until('!!document.querySelector("dialog [role=alert]")');
      if (!(await evalJS(`document.querySelector('dialog [role=alert]').textContent.includes('vượt')`))) throw new Error('Overpayment not rejected');
      await fill('#payment-amount', '50000'); await shot('payment-dialog-dark'); await click('Lưu thanh toán demo'); await until('!document.querySelector("dialog[open]")');
      await evalJS('document.querySelector(".admin-theme-toggle").click()'); await pause(); await shot('invoice-partial-light');
      await click('Ghi nhận thanh toán'); await ack(); await shot('payment-dialog-light'); await click('Lưu thanh toán demo'); await until('!document.querySelector("dialog[open]")'); await shot('invoice-paid');
      const invoiceId = await evalJS(`JSON.parse(localStorage.getItem('pawcare_invoices_v1'))[0].id`);
      await navigate('/reception/invoices/' + invoiceId);
      if (!(await evalJS(`JSON.parse(localStorage.getItem('pawcare_invoices_v1'))[0].payments.reduce((sum,item)=>sum+item.amount,0)===200000 && document.querySelector('.staff-invoice-page .reception-badge').textContent==='Đã thanh toán'`))) throw new Error('Payment persistence failed');
      await send('Emulation.setEmulatedMedia', { media: 'print' }, sessionId);
      if (!(await evalJS(`getComputedStyle(document.querySelector('.admin-topbar')).display==='none' && getComputedStyle(document.querySelector('.admin-sidebar')).display==='none'`))) throw new Error('Print navigation not hidden');
      const pdf = await send('Page.printToPDF', { printBackground: true, paperWidth: 8.2677, paperHeight: 11.6929, marginTop: .4, marginBottom: .4, marginLeft: .4, marginRight: .4 }, sessionId);
      fs.writeFileSync(path.join(outputDir, `${width}-invoice-A4.pdf`), Buffer.from(pdf.data, 'base64'));
      await send('Emulation.setEmulatedMedia', { media: '' }, sessionId);
      if (exceptions.length) throw new Error('Browser exceptions: ' + exceptions.join(', '));
      console.log(`Workflow ${width}px: online confirm/check-in, walk-in/priority queue, schedule/edit/cancel, issue/partial/full payments/reload, overpayment guard, themes/focus/overflow and A4 PDF passed.`);
      await send('Browser.close'); return;
    }
    await navigate('/reception/customers');
    await evalJS('document.fonts.ready');
    if (!(await evalJS('[...document.fonts].some(font=>font.family==="Outfit" && font.status==="loaded")'))) throw new Error('Outfit did not load');
    await shot('customers-light');
    await click('Thêm khách hàng'); await shot('customer-editor');
    await fill('#customer-fullName', 'Khách kiểm thử Chrome'); await fill('#customer-phone', '0902345678');
    await click('Lưu khách hàng'); await until('!!document.querySelector("dialog [role=alert]")');
    if (!(await evalJS('document.querySelector("dialog [role=alert]").textContent.includes("trùng")'))) throw new Error('Duplicate phone not rejected');
    await fill('#customer-phone', '0911223344'); await fill('#customer-address', 'Địa chỉ kiểm thử');
    await click('Lưu khách hàng'); await until('!document.querySelector("dialog[open]")');
    const ownerId = await evalJS('JSON.parse(localStorage.getItem("pawcare_customer_profiles_v1")).find(item=>item.phone==="0911223344").id');
    await navigate('/reception/customers/' + ownerId); await shot('customer-detail-empty');
    await click('Thêm thú cưng'); await shot('pet-editor-light');
    await fill('#pet-name', 'Mít kiểm thử'); await fill('#pet-species', 'CAT'); await fill('#pet-weight', '4.25');
    await click('Lưu thú cưng'); await until('!document.querySelector("dialog[open]")');
    const petId = await evalJS('JSON.parse(localStorage.getItem("pawcare_pets_v1")).find(item=>item.name==="Mít kiểm thử").id');
    await navigate('/reception/pets/' + petId); await shot('pet-detail-light');
    if (!(await evalJS(`JSON.parse(localStorage.getItem('pawcare_pets_v1')).find(item=>item.id===${JSON.stringify(petId)}).ownerId===${JSON.stringify(ownerId)}`))) throw new Error('Wrong owner');
    await click('Chỉnh sửa hồ sơ'); await fill('#pet-color', 'Xám bạc'); await click('Lưu thay đổi'); await until('!document.querySelector("dialog[open]")');
    await click('Lưu trữ hồ sơ'); await shot('archive-dialog'); await click('Xác nhận lưu trữ'); await until('!document.querySelector("dialog[open]")');
    await click('Khôi phục hồ sơ'); await click('Xác nhận khôi phục'); await until('!document.querySelector("dialog[open]")');
    await navigate('/reception/pets/' + petId);
    const record = JSON.parse(await evalJS(`JSON.stringify(JSON.parse(localStorage.getItem('pawcare_pets_v1')).find(item=>item.id===${JSON.stringify(petId)}))`));
    if (record.color !== 'Xám bạc' || record.status !== 'ACTIVE' || record.weight !== 4.25) throw new Error('Persistence failed');
    await evalJS('document.querySelector(".admin-theme-toggle").click()'); await pause(); await shot('pet-detail-dark');
    await click('Chỉnh sửa hồ sơ'); await shot('pet-editor-dark'); await click('Hủy');
    await navigate('/reception/pets'); await shot('pets-dark');
    await evalJS('document.querySelector(".admin-theme-toggle").click()'); await pause(); await shot('pets-light');
    if (width < 1280) { await evalJS('document.querySelector(".admin-menu-button").click()'); await pause(); await shot('mobile-menu'); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, sessionId); await pause(); if (!(await evalJS('document.activeElement===document.querySelector(".admin-menu-button") && !document.querySelector(".admin-sidebar.is-open")'))) throw new Error('Menu Escape focus failed'); }
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/` }, sessionId); await until('!!document.querySelector(".account-trigger")');
    await evalJS('document.querySelector(".account-trigger").click()'); await pause();
    if (!(await evalJS(`document.querySelectorAll('.account-dropdown a[href^="/reception/"]').length===5`))) throw new Error('Header receptionist links missing');
    await shot('header-dropdown');
    if (exceptions.length) throw new Error('Browser exceptions: ' + exceptions.join(', '));
    console.log(`Reception ${width}px: CRUD, duplicate validation, owner link, reload, archive/restore, themes, header and overflow passed.`);
    await send('Browser.close');
  } finally { socket?.close(); browser.kill(); }
}
server.listen(0, '127.0.0.1', async () => {
  try { for (const width of [320, 375, 768, 1024, 1280]) await check(width, server.address().port); console.log('Artifacts: ' + outputDir); }
  catch (error) { console.error(error); process.exitCode = 1; }
  finally { server.close(); }
});
