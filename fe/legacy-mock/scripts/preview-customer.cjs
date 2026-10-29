// Production browser smoke check. Each viewport gets an isolated temporary Chrome profile.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { makeCustomerRecordsFixtures } = require('../src/test/customerRecordsFixtures.js');
const buildRoot = path.resolve(__dirname, '../build');
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pawcare-customer-preview-'));
const chrome = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const candidate = path.resolve(buildRoot, '.' + pathname);
  if (candidate !== buildRoot && !candidate.startsWith(buildRoot + path.sep)) { response.writeHead(403); response.end(); return; }
  const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(buildRoot, 'index.html');
  let content = fs.readFileSync(file);
  response.setHeader('Content-Type', mime[path.extname(file)] || 'text/html; charset=utf-8');
  if (path.extname(file) === '.html') content = content.toString().replace('<head>', '<head><script>localStorage.setItem("pawcare_auth_session",JSON.stringify({id:"customer-demo",role:"CUSTOMER"}));</script>');
  response.end(content);
});
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function checkViewport(port, width) {
  const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox', '--no-first-run', '--disable-background-networking', '--remote-debugging-port=0',
    '--user-data-dir=' + path.join(outputRoot, 'chrome-' + width), '--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1', 'about:blank'], { windowsHide: true });
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Chrome startup timed out')), 15000);
      browser.on('error', (error) => { clearTimeout(timeout); reject(error); });
      browser.stderr.on('data', (data) => { const match = data.toString().match(/DevTools listening on (ws:\/\/\S+)/); if (match) { clearTimeout(timeout); resolve(match[1]); } });
    });
    socket = new WebSocket(endpoint); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0; const pending = new Map();
    socket.onmessage = (event) => { const message = JSON.parse(event.data); const task = pending.get(message.id); if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); } };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId })); });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    const evaluate = async (expression) => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const waitFor = async (selector) => { for (let index = 0; index < 100; index++) { if (await evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')')) return; await pause(100); } throw new Error('Missing element: ' + selector); };
    const changeValue = (selector, value) => evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) throw new Error('Missing input');
      const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)});
      element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    })()`);
    const uploadPhoto = async () => {
      const { root } = await send('DOM.getDocument', {}, sessionId);
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: '.customer-modal input[type=file]' }, sessionId);
      await send('DOM.setFileInputFiles', { nodeId, files: [path.resolve(__dirname, '../public/images/landing/pet-daisy.jpg')] }, sessionId);
      for (let index = 0; index < 80; index++) {
        if (await evaluate('document.querySelector(".pet-photo-editor img")?.src.startsWith("data:image/") && !document.querySelector(".pet-editor-form fieldset").disabled')) return;
        await pause(100);
      }
      throw new Error('Photo thumbnail did not become ready');
    };
    const screenshot = async (name) => { const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId); fs.writeFileSync(path.join(outputRoot, name + '-' + width + '.png'), Buffer.from(result.data, 'base64')); };
    const assertLayout = async () => {
      const metrics = await evaluate('({width: innerWidth, scrollWidth: document.documentElement.scrollWidth, header: !!document.querySelector(".site-header"), footer: !!document.querySelector(".site-footer")})');
      if (metrics.width !== width || metrics.scrollWidth > width || !metrics.header || !metrics.footer) throw new Error('Customer layout failed: ' + JSON.stringify(metrics));
    };
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 }, sessionId);
    await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/portal/pets' }, sessionId);
    await waitFor('.customer-pets-grid'); await assertLayout();
    const images = await evaluate('Promise.all([...document.querySelectorAll(".customer-pet-avatar img")].map(img => img.decode().then(() => true, () => false)))');
    if (images.some((loaded) => !loaded)) throw new Error('Demo pet image did not load');
    await screenshot('pets');
    // Account avatar must stay visible on mobile and expose the customer's pet management shortcut.
    await evaluate('document.querySelector(".account-trigger").click()'); await waitFor('.account-dropdown');
    const account = await evaluate('({left:document.querySelector(".account-dropdown").getBoundingClientRect().left,right:document.querySelector(".account-dropdown").getBoundingClientRect().right,links:[...document.querySelectorAll(".account-links a")].map(link=>link.getAttribute("href")),avatarVisible:document.querySelector(".account-trigger").getBoundingClientRect().width>0})');
    if (!account.avatarVisible || account.left < 0 || account.right > width || !account.links.includes('/portal/pets') || !account.links.includes('/portal/profile') || account.links.includes('/admin/dashboard')) throw new Error('Customer account menu failed: ' + JSON.stringify(account));
    await assertLayout(); await screenshot('account-menu');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, sessionId);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, sessionId);
    if (!await evaluate('document.activeElement.classList.contains("account-trigger") && !document.querySelector(".account-dropdown")')) throw new Error('Account menu Escape focus failed');
    if (width <= 1000) {
      await evaluate('document.querySelector(".menu-toggle").click()');
      if (!await evaluate('getComputedStyle(document.querySelector(".main-nav")).display!=="none" && document.querySelector(".nav-my-pets").getBoundingClientRect().width>0')) throw new Error('Mobile pet navigation not visible');
      await screenshot('mobile-navigation');
      await evaluate('document.querySelector(".account-trigger").click()');
      if (!await evaluate('!document.querySelector(".main-nav").classList.contains("is-open") && !!document.querySelector(".account-dropdown")')) throw new Error('Account and mobile menu overlap');
      await evaluate('document.body.dispatchEvent(new PointerEvent("pointerdown", {bubbles:true}))');
    }
    await evaluate('document.querySelector(".customer-pets-grid").scrollIntoView({block:"start",behavior:"instant"})'); await pause(100); await screenshot('pets-cards');
    await evaluate('window.scrollTo({top:0,behavior:"instant"}); document.querySelector(".pet-page-hero button").click()'); await waitFor('.customer-modal[open]');
    const dialog = await evaluate('({open:document.querySelector(".customer-modal").open,width:document.querySelector(".customer-modal").getBoundingClientRect().width,scroll:document.querySelector(".customer-modal").scrollWidth,focus:document.activeElement?.name})');
    if (!dialog.open || dialog.width > width || dialog.scroll > dialog.width || dialog.focus !== 'name') throw new Error('Pet editor failed: ' + JSON.stringify(dialog));
    await screenshot('pets-editor');
    // Exercise the real FileReader -> image decoding -> canvas thumbnail path.
    await uploadPhoto();
    const photoReady = await evaluate('document.querySelector(".pet-photo-editor img")?.src.startsWith("data:image/") && !document.querySelector(".pet-editor-form fieldset").disabled');
    if (!photoReady) throw new Error('Photo thumbnail did not become ready');
    await screenshot('pets-photo-preview');
    await evaluate('document.querySelector(".pet-editor-form").dispatchEvent(new Event("submit", {bubbles:true,cancelable:true}))');
    const validation = await evaluate('({error:document.querySelector("#pet-name-error")?.textContent,focus:document.activeElement?.name})');
    if (!validation.error || validation.focus !== 'name') throw new Error('Required field validation failed');
    // Handle the native unsaved-change confirmation; declining must keep the editor open.
    const declineDiscard = evaluate('document.querySelector(".customer-dialog-close").click(); undefined');
    await pause(100);
    await send('Page.handleJavaScriptDialog', { accept: false }, sessionId);
    await declineDiscard;
    if (!await evaluate('document.querySelector(".customer-modal")?.open')) throw new Error('Declining discard closed editor');
    const acceptDiscard = evaluate('document.querySelector(".customer-dialog-close").click(); undefined');
    await pause(100);
    await send('Page.handleJavaScriptDialog', { accept: true }, sessionId);
    await acceptDiscard;
    // Verify actual customer actions and persistence, not just editor appearance.
    await changeValue('.pet-search input', 'Không khớp hồ sơ mới');
    await changeValue('select[aria-label="Lọc loài"]', 'DOG');
    await changeValue('select[aria-label="Lọc trạng thái hồ sơ"]', 'ARCHIVED');
    await evaluate('document.querySelector(".pet-page-hero button").click()');
    await waitFor('.pet-editor-form');
    await changeValue('.pet-editor-form input[name="name"]', 'Mít kiểm thử');
    await changeValue('.pet-editor-form select[name="species"]', 'CAT');
    await changeValue('.pet-editor-form input[name="weight"]', '4.25');
    await uploadPhoto();
    await evaluate('document.querySelector(".pet-editor-form").requestSubmit()');
    await waitFor('article[aria-label="Hồ sơ Mít kiểm thử"]');
    const created = await evaluate('JSON.parse(localStorage.getItem("pawcare_pets_v1")).find(pet=>pet.name==="Mít kiểm thử")');
    if (created.ownerId !== 'customer-demo' || created.species !== 'CAT' || created.weight !== 4.25 || !created.photo.startsWith('data:image/')) throw new Error('Created pet was not stored correctly');
    await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/portal/pets/' + created.id }, sessionId);
    await waitFor('.pet-profile-facts');
    if (!await evaluate('document.querySelector("h1").textContent === "Mít kiểm thử" && document.querySelector(".pet-detail-summary img").src.startsWith("data:image/")')) throw new Error('Pet/photo did not survive reload');
    await evaluate('document.querySelector(".pet-heading-actions .primary").click()');
    await waitFor('.pet-editor-form');
    await changeValue('.pet-editor-form input[name="color"]', 'Xám bạc');
    await evaluate('document.querySelector(".pet-editor-form").requestSubmit()');
    await waitFor('.pet-alert.success');
    if (!await evaluate('JSON.parse(localStorage.getItem("pawcare_pets_v1")).find(pet=>pet.name==="Mít kiểm thử").color === "Xám bạc"')) throw new Error('Pet update failed');
    await evaluate('document.querySelector(".pet-heading-actions .secondary").click()');
    await waitFor('.pet-status-content');
    await evaluate('document.querySelector(".pet-status-content .primary").click()');
    await waitFor('.pet-alert.neutral');
    if (await evaluate('!!document.querySelector(".pet-heading-actions .primary")')) throw new Error('Archived pet remained editable');
    await screenshot('pet-archived');
    await evaluate('document.querySelector(".pet-heading-actions .secondary").click()');
    await waitFor('.pet-status-content');
    await evaluate('document.querySelector(".pet-status-content .primary").click()');
    await waitFor('.pet-heading-actions .primary');
    const restored = await evaluate('JSON.parse(localStorage.getItem("pawcare_pets_v1")).find(pet=>pet.name==="Mít kiểm thử")');
    if (restored.status !== 'ACTIVE' || restored.color !== 'Xám bạc' || restored.photo !== created.photo) throw new Error('Restore lost pet information');
    await assertLayout(); await screenshot('pet-saved');
    await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/portal/pets/pet-bo-demo' }, sessionId); await waitFor('.pet-profile-facts'); await assertLayout(); await screenshot('pet-detail');
    await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/portal/profile' }, sessionId); await waitFor('.profile-grid'); await assertLayout(); await screenshot('profile');
    // The booking creates an actual pending request; no clinical fixture is seeded in the application.
    await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/portal/booking' }, sessionId);
    await waitFor('#pet-petId'); await assertLayout(); await screenshot('booking-pet');
    await changeValue('#pet-petId', 'pet-bo-demo');
    await evaluate('document.querySelector(".care-booking-form").requestSubmit()');
    await waitFor('#pet-serviceId');
    await changeValue('#pet-serviceId', 'service-1');
    await changeValue('#pet-reason', 'Lý do kiểm tra chỉ trong trình duyệt preview');
    await evaluate('document.querySelector(".care-booking-form").requestSubmit()');
    await waitFor('#pet-date');
    const bookingDay = await evaluate('(() => { const parts = new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()); const get=t=>parts.find(p=>p.type===t).value; return new Date(Date.parse(`${get("year")}-${get("month")}-${get("day")}T00:00:00Z`)+86400000).toISOString().slice(0,10); })()');
    await changeValue('#pet-date', bookingDay); await changeValue('#pet-time', '09:00');
    await changeValue('#pet-preferredDoctorId', 'vet-demo');
    await assertLayout(); await screenshot('booking-time');
    await evaluate('document.querySelector(".care-booking-form").requestSubmit()');
    await waitFor('.care-confirm'); await assertLayout(); await screenshot('booking-review');
    await evaluate('document.querySelector(".care-confirm input").click(); document.querySelector(".care-booking-form").requestSubmit()');
    await waitFor('.care-booking-success'); await assertLayout(); await screenshot('booking-success');
    const appointment = await evaluate('JSON.parse(localStorage.getItem("pawcare_appointments_v1"))[0]');
    if (appointment.status !== 'PENDING' || appointment.ownerId !== 'customer-demo' || appointment.petId !== 'pet-bo-demo' || appointment.preferredDoctorId !== 'vet-demo' || await evaluate('localStorage.getItem("pawcare_medical_records_v1") !== null')) throw new Error('Booking created invalid request or clinical data');
    await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/portal/appointments' }, sessionId);
    await waitFor('.care-appointment-card'); await assertLayout(); await screenshot('appointments');
    await evaluate('[...document.querySelectorAll(".care-appointment-card button")].find(b=>b.textContent==="Hủy lịch").click()');
    await waitFor('#pet-cancellationReason'); await assertLayout(); await screenshot('cancel-appointment');
    await changeValue('#pet-cancellationReason', 'Hủy fixture kiểm thử');
    await evaluate('document.querySelector(".care-dialog form").requestSubmit()');
    await waitFor('.pet-alert.success');
    if (!await evaluate('JSON.parse(localStorage.getItem("pawcare_appointments_v1"))[0].status === "CANCELLED"')) throw new Error('Cancellation was not persisted');
    await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/portal/medical-history' }, sessionId);
    await waitFor('.care-empty'); await assertLayout(); await screenshot('medical-history-empty');
    // Isolated test-only clinical fixture exercises the read-only projection and populated layouts.
    await evaluate(`localStorage.setItem("pawcare_medical_records_v1",JSON.stringify([{id:"preview-record",ownerId:"customer-demo",petId:"pet-bo-demo",status:"COMPLETED",examinedAt:"2026-10-01T09:00:00+07:00",doctorName:"Bác sĩ fixture kiểm thử",diagnosis:"Nội dung chẩn đoán chỉ dùng kiểm thử giao diện",recommendations:"Dặn dò fixture, không phải tư vấn y tế",weight:6.5,followUpDate:"2026-10-12",doctorOnlyNotes:"PRIVATE_PREVIEW_NOTE",results:[{id:"result",name:"Dịch vụ fixture",result:"Nội dung kết quả kiểm thử"}],prescriptions:[{id:"rx",medicineName:"Thuốc fixture",dosage:"Liều fixture",instructions:"Hướng dẫn fixture"}]}]));window.dispatchEvent(new Event("pawcare:medical-records-changed"));`);
    await waitFor('.care-history-card'); await assertLayout(); await screenshot('medical-history');
    await evaluate('document.querySelector(".care-history-card .pet-button").click()');
    await waitFor('.care-record-grid'); await assertLayout(); await screenshot('medical-record');
    if (await evaluate('document.body.textContent.includes("PRIVATE_PREVIEW_NOTE")')) throw new Error('Private clinical note leaked');
    // The application starts with empty read-only document feeds. Populate only this isolated preview.
    for (const kind of ['vaccinations', 'invoices']) {
      await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/portal/' + kind }, sessionId);
      await waitFor('.care-empty'); await assertLayout(); await screenshot(kind + '-empty');
    }
    const today = new Date(Date.parse(bookingDay + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
    const fixture = makeCustomerRecordsFixtures(today);
    await evaluate(`localStorage.setItem("pawcare_vaccinations_v1",${JSON.stringify(JSON.stringify(fixture.vaccinations))});localStorage.setItem("pawcare_medical_records_v1",${JSON.stringify(JSON.stringify(fixture.visits))});localStorage.setItem("pawcare_invoices_v1",${JSON.stringify(JSON.stringify(fixture.invoices))});`);
    for (const kind of ['vaccinations', 'prescriptions', 'invoices']) {
      await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/portal/' + kind }, sessionId);
      await waitFor('.customer-record-card'); await assertLayout(); await screenshot(kind);
      const id = kind === 'vaccinations' ? 'vax-completed' : kind === 'prescriptions' ? 'visit-rx-fixture' : 'invoice-fixture';
      await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/portal/' + kind + '/' + id }, sessionId);
      await waitFor('.record-detail-badge'); await assertLayout(); await screenshot(kind + '-detail');
      if (await evaluate('document.body.textContent.includes("PRIVATE_FIXTURE_NOTE")')) throw new Error('Private document metadata leaked');
      if (kind === 'invoices') {
        const totals = await evaluate('({text:document.querySelector(".invoice-totals").textContent,rows:document.querySelectorAll(".invoice-table-wrap tbody tr").length})');
        if (totals.rows !== 2 || !totals.text.includes('200.000') || !totals.text.includes('150.000') || await evaluate('document.querySelector(".invoice-lines").textContent.includes("Thuốc chưa cấp")')) throw new Error('Invoice financial projection failed');
        await send('Emulation.setEmulatedMedia', { media: 'print' }, sessionId);
        if (!await evaluate('getComputedStyle(document.querySelector(".site-header")).display === "none" && getComputedStyle(document.querySelector(".customer-navigation")).display === "none" && getComputedStyle(document.querySelector(".record-no-print")).display === "none"')) throw new Error('Invoice print view retains navigation');
        const pdf = await send('Page.printToPDF', { printBackground: true, paperWidth: 8.27, paperHeight: 11.69, marginTop: 0.4, marginBottom: 0.4, marginLeft: 0.4, marginRight: 0.4 }, sessionId);
        fs.writeFileSync(path.join(outputRoot, 'invoice-' + width + '.pdf'), Buffer.from(pdf.data, 'base64'));
        await send('Emulation.setEmulatedMedia', { media: 'screen' }, sessionId);
      }
    }
    console.log('Customer vaccinations/prescriptions/invoices at ' + width + 'px: states, safe document details, eligible invoice totals, A4 print PDF and responsive layout passed.');
    console.log('Customer booking/appointments/medical history at ' + width + 'px: pending request, persistence, cancellation, clinical empty/completed states, private-note projection and no page overflow passed.');
    console.log('Customer pets/detail/profile at ' + width + 'px: create/photo/reload/edit/archive/restore, avatar/dropdown/mobile pet shortcut, header/footer, no page/dialog overflow, keyboard focus and discard guard passed.');
    await send('Browser.close');
  } finally { socket?.close(); browser.kill(); }
}

server.listen(0, '127.0.0.1', async () => {
  try { for (const width of [1280, 1024, 768, 375, 320]) await checkViewport(server.address().port, width); console.log('Screenshots: ' + outputRoot); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { server.close(); }
});
