// Production preview: temporary Chrome profiles only; never uses the user's browser data.
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { makeCustomerRecordsFixtures } = require('../src/test/customerRecordsFixtures');
const root = path.resolve(__dirname, '../build');
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pawcare-vet-preview-'));
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const candidate = path.resolve(root, '.' + pathname);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(file)] || 'text/html; charset=utf-8');
  const data = fs.readFileSync(file);
  res.end(path.extname(file) === '.html' ? data.toString().replace('<head>', '<head><script>localStorage.setItem("pawcare_auth_session",JSON.stringify({id:"vet-demo",role:"VETERINARIAN"}));</script>') : data);
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
    await navigate('/vet/today'); await evalJS('document.fonts.ready'); await shot('today-empty-light');
    if (!(await evalJS(`document.body.textContent.includes('Chưa có ca chờ hoặc đang khám')`))) throw new Error('Expected empty desk');
    await navigate('/vet/health-history'); await shot('health-index-empty-light');
    const stamp = new Date().toISOString();
    const appointment = { id:'preview-vet', code:'APT-VET-PREVIEW', ownerId:'customer-demo',petId:'pet-bella-demo',petName:'Bella',serviceId:'service-1',serviceName:'Khám tổng quát',estimatedPrice:150000,reason:'Lý do kiểm thử trình duyệt',startsAt:stamp,checkedInAt:stamp,confirmedAt:stamp,assignedDoctorId:'vet-demo',assignedDoctorName:'Trần Minh Khang',roomId:'room-demo-1',roomName:'Phòng khám 01 (demo)',priority:'PRIORITY',source:'WALK_IN',status:'CHECKED_IN',version:1,createdAt:stamp,updatedAt:stamp };
    const other = {...appointment,id:'other-vet',code:'APT-OTHER',petId:'pet-bo-demo',petName:'Bô',assignedDoctorId:'vet-two',roomId:'room-demo-2'};
    await evalJS(`localStorage.setItem('pawcare_appointments_v1',${JSON.stringify(JSON.stringify([appointment,other]))});window.dispatchEvent(new Event('pawcare:appointments-changed'));`); await pause(); await shot('today-queue-light');
    if (await evalJS(`document.body.textContent.includes('APT-OTHER')`)) throw new Error('Other veterinarian appointment leaked');
    await navigate('/vet/appointments'); await shot('appointments-light'); await click('Chi tiết'); await shot('appointment-detail'); await evalJS(`document.querySelector('dialog button[aria-label="Đóng hộp thoại"]').click()`);
    await navigate('/vet/records'); await shot('records-empty-light'); await click('Lập hồ sơ khám mới'); await shot('create-record-dialog');
    await click('Đối chiếu lượt khám'); await until(`document.body.textContent.includes('Chọn lượt còn đủ điều kiện')`);
    await fill('#vet-record-appointment','preview-vet'); await click('Đối chiếu lượt khám'); await until('location.pathname==="/vet/records/preview-vet"');
    await shot('before-start'); await click('Lập hồ sơ và bắt đầu khám'); await shot('start-dialog');
    await evalJS(`document.querySelector('dialog input[type=checkbox]').click()`); await click('Xác nhận bắt đầu khám'); await until('!!document.querySelector("#exam-symptoms")');
    if (!(await evalJS(`JSON.parse(localStorage.getItem('pawcare_appointments_v1')).find(item=>item.id==='preview-vet').status==='IN_PROGRESS'`))) throw new Error('Start transition failed');
    await fill('#exam-symptoms','Triệu chứng kiểm thử'); await fill('#exam-weight','6.5'); await fill('#exam-examination','Quan sát kiểm thử'); await shot('clinical-light');
    await send('Page.navigate',{url:`http://127.0.0.1:${port}/vet/examinations/preview-vet`},sessionId); await until(`!![...document.querySelectorAll('button')].find(node=>node.textContent==='Khôi phục bản nháp')`); await shot('local-draft-recovery'); await click('Khôi phục bản nháp');
    if (!(await evalJS(`document.querySelector('#exam-symptoms').value==='Triệu chứng kiểm thử'`))) throw new Error('Local draft was lost');
    await click('Lưu nháp hồ sơ'); await until(`document.body.textContent.includes('Đã lưu nháp hồ sơ khám')`);
    await navigate('/vet/prescriptions'); await shot('prescription-record-picker');
    if(!(await evalJS(`document.querySelectorAll('.vet-record-card').length===1`)))throw new Error('Prescription assigned-only selector failed');
    await navigate('/vet/prescriptions/preview-vet'); await shot('prescription-empty'); await click('Thêm thuốc'); await click('Lưu đơn thuốc');
    if(!(await evalJS(`document.activeElement===document.querySelector('#plan-0-medicineId')`)))throw new Error('Prescription invalid field focus failed');
    await fill('#plan-0-medicineId','medicine-1'); await fill('#plan-0-dosage','Liều do bác sĩ nhập - dữ liệu kiểm thử'); await fill('#plan-0-frequency','Tần suất kiểm thử'); await fill('#plan-0-duration','Thời gian kiểm thử'); await fill('#plan-0-quantity','2'); await fill('#plan-0-instructions','Hướng dẫn kiểm thử, không tư vấn');
    await evalJS(`document.querySelector('.vet-plan-row').scrollIntoView()`); await shot('prescription-form-light');
    const inventoryBefore = await evalJS(`localStorage.getItem('pawcare_medicines_v1')`);
    await click('Lưu đơn thuốc'); await shot('prescription-confirm'); await evalJS(`document.querySelector('dialog input[type=checkbox]').click()`); await click('Xác nhận lưu'); await until(`document.body.textContent.includes('Đã lưu đơn thuốc vào hồ sơ')`);
    if((await evalJS(`localStorage.getItem('pawcare_medicines_v1')`))!==inventoryBefore)throw new Error('Prescribing changed inventory');
    await evalJS(`document.querySelector('.admin-theme-toggle').click();document.querySelector('.vet-plan-row').scrollIntoView()`); await pause(); await shot('prescription-form-dark'); await evalJS(`document.querySelector('.admin-theme-toggle').click()`);
    await navigate('/vet/service-orders'); await shot('service-order-record-picker'); await navigate('/vet/service-orders/preview-vet'); await click('Thêm dịch vụ'); await fill('#plan-0-serviceId','service-2'); await fill('#plan-0-quantity','2'); await fill('#plan-0-notes','Ghi chú chỉ định kiểm thử');
    await evalJS(`document.querySelector('.vet-plan-row').scrollIntoView()`); await shot('service-order-form-light'); await click('Lưu chỉ định'); await shot('service-order-confirm'); await evalJS(`document.querySelector('dialog input[type=checkbox]').click()`); await click('Xác nhận lưu'); await until(`document.body.textContent.includes('Đã lưu chỉ định')`);
    if(!(await evalJS(`JSON.parse(localStorage.getItem('pawcare_medical_records_v1'))[0].serviceOrders[0].status==='ORDERED' && JSON.parse(localStorage.getItem('pawcare_medical_records_v1'))[0].billableItems.length===0`)))throw new Error('Order incorrectly completed/billed');
    await evalJS(`document.querySelector('.admin-theme-toggle').click();document.querySelector('.vet-plan-row').scrollIntoView()`); await pause(); await shot('service-order-form-dark'); await evalJS(`document.querySelector('.admin-theme-toggle').click()`);
    await navigate('/vet/records'); await shot('records-draft-light');
    if(!(await evalJS(`document.querySelectorAll('.vet-record-card').length===1 && document.querySelector('.vet-record-code').textContent.startsWith('MR-') && document.querySelector('.admin-page-title button').disabled`)))throw new Error('Duplicate record or missing code');
    await navigate('/vet/diagnoses'); await shot('diagnoses-empty-content-light'); await click('Ghi triệu chứng & chẩn đoán'); await until('!!document.querySelector(".vet-diagnosis-guide")');
    await evalJS('document.querySelector(".admin-theme-toggle").click()'); await pause(); await shot('clinical-dark'); await click('Ghi nhận chẩn đoán');
    if(!(await evalJS(`document.activeElement===document.querySelector('#exam-diagnosis')`)))throw new Error('Diagnosis quick action focus failed');
    await fill('#exam-diagnosis','Chẩn đoán kiểm thử'); await fill('#exam-treatmentPlan','Kế hoạch kiểm thử'); await fill('#exam-recommendations','Dặn dò kiểm thử'); await fill('#exam-doctorOnlyNotes','PRIVATE_BROWSER_VET'); await shot('conclusion-dark');
    await click('Lưu nháp hồ sơ'); await until(`document.body.textContent.includes('Đã lưu nháp hồ sơ khám')`);
    await navigate('/vet/diagnoses'); await shot('diagnoses-draft-dark');
    if(!(await evalJS(`document.body.textContent.includes('Chẩn đoán đang soạn') && !document.body.textContent.includes('PRIVATE_BROWSER_VET')`)))throw new Error('Draft diagnosis state or private list payload failed');
    await click('Ghi triệu chứng & chẩn đoán'); await until('!!document.querySelector(".vet-diagnosis-guide")'); await click('Ghi nhận chẩn đoán');
    await click('Hoàn tất khám'); await shot('complete-dialog-dark'); await evalJS(`document.querySelector('dialog input[type=checkbox]').click()`); await click('Xác nhận hoàn tất khám'); await until(`document.body.textContent.includes('Hồ sơ đã hoàn tất · Chỉ đọc')`); await shot('completed-dark');
    if (!(await evalJS(`document.querySelector('#exam-diagnosis').matches(':disabled') && JSON.parse(localStorage.getItem('pawcare_medical_records_v1'))[0].billableItems[0].unitPrice===150000`))) throw new Error('Completion/read-only/charge snapshot failed');
    const today = await evalJS(`new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())`);
    const historyFixtures = makeCustomerRecordsFixtures(today);
    const vaccinationFixtures = historyFixtures.vaccinations.map(item=>({...item,petId:'pet-bella-demo'}));
    await evalJS(`(() => { const rows=JSON.parse(localStorage.getItem('pawcare_medical_records_v1')); const current=rows[0]; const older=[1,2].map((offset)=>({...current,id:'preview-health-old-'+offset,appointmentId:undefined,doctorId:'vet-two',doctorName:'Bác sĩ lịch sử kiểm thử',examinedAt:new Date(Date.now()-offset*86400000*10).toISOString(),weight:offset===1?6.8:7.2,prescriptions:[],serviceOrders:[],results:offset===1?[{id:'historical-result',name:'Kết quả lịch sử kiểm thử',result:'Nội dung kết quả kiểm thử'}]:[],doctorOnlyNotes:'PRIVATE_OTHER_HISTORY'}));localStorage.setItem('pawcare_medical_records_v1',JSON.stringify([...rows,...older]));localStorage.setItem('pawcare_vaccinations_v1',${JSON.stringify(JSON.stringify(vaccinationFixtures))});})()`);
    await navigate('/vet/health-history'); await shot('health-index-dark');
    if(!(await evalJS(`document.querySelectorAll('.vet-record-card').length===1`)))throw new Error('Health pet assignment scope failed');
    await click('Xem lịch sử sức khỏe'); await until('!!document.querySelector(".vet-health-timeline")'); await shot('health-timeline-dark');
    if(!(await evalJS(`!!document.querySelector('.vet-health-chart') && !document.body.textContent.includes('PRIVATE_OTHER_HISTORY') && !document.body.textContent.includes('PRIVATE_BROWSER_VET')`)))throw new Error('Health weight graph/privacy failed');
    const healthTab = async (label) => { await evalJS(`[...document.querySelectorAll('nav[aria-label="Loại sự kiện sức khỏe"] button')].find(node=>node.textContent.startsWith(${JSON.stringify(label)})).click()`);await pause(); };
    await healthTab('Đơn thuốc'); await click('Xem chi tiết Đơn thuốc theo lần khám'); await shot('health-prescription-dialog');
    if(!(await evalJS(`document.querySelector('dialog').textContent.includes('Amoxicillin 250 mg')`)))throw new Error('Health prescription detail failed');
    await evalJS(`document.querySelector('dialog button[aria-label="Đóng hộp thoại"]').click()`); await healthTab('Tiêm phòng'); await shot('health-vaccines-dark');
    if(!(await evalJS(`document.body.textContent.includes('Quá ngày dự kiến') && document.body.textContent.includes('Đã tiêm')`)))throw new Error('Health vaccination states failed');
    await healthTab('Kết quả'); await click('Xem chi tiết Kết quả lịch sử kiểm thử'); await shot('health-result-dialog'); await evalJS(`document.querySelector('dialog button[aria-label="Đóng hộp thoại"]').click()`);
    await fill('input[aria-label="Tìm lịch sử sức khỏe"]','no-match-health'); await shot('health-filter-empty'); await click('Xóa bộ lọc');
    await fill('input[aria-label="Lịch sử sức khỏe từ ngày"]','2026-10-04'); await fill('input[aria-label="Lịch sử sức khỏe đến ngày"]','2026-10-01'); await shot('health-invalid-range');
    if(!(await evalJS(`document.body.textContent.includes('Khoảng ngày không hợp lệ')`)))throw new Error('Health date range validation failed');
    await click('Xóa bộ lọc'); await evalJS(`document.querySelector('.admin-theme-toggle').click();document.querySelector('.vet-health-grid').scrollIntoView({behavior:'instant'})`); await pause(); await shot('health-timeline-light');
    await evalJS(`document.querySelector('.vet-health-weight').scrollIntoView({behavior:'instant'})`); await pause(); await shot('health-weight-light'); await evalJS(`document.querySelector('.admin-theme-toggle').click()`);
    await navigate('/vet/prescriptions/preview-vet'); await shot('prescription-completed'); if(!(await evalJS(`document.querySelector('#plan-0-dosage').matches(':disabled') && ![...document.querySelectorAll('button')].some(node=>node.textContent.trim()==='Lưu đơn thuốc')`)))throw new Error('Prescription read-only failed');
    await navigate('/vet/service-orders/preview-vet'); await shot('service-order-completed'); if(!(await evalJS(`document.querySelector('#plan-0-quantity').matches(':disabled')`)))throw new Error('Order read-only failed');
    await navigate('/vet/records'); await shot('records-completed-dark'); await navigate('/vet/diagnoses'); await shot('diagnoses-completed-dark');
    if(!(await evalJS(`document.body.textContent.includes('Chẩn đoán đã chốt')`)))throw new Error('Final diagnosis state missing');
    await fill('input[aria-label="Tìm triệu chứng và chẩn đoán"]','no-match-browser'); await shot('diagnoses-filter-empty'); await click('Xóa bộ lọc');
    await click('Xem triệu chứng & chẩn đoán'); await until('!!document.querySelector(".vet-diagnosis-guide")'); await click('Xem chẩn đoán');
    if(!(await evalJS(`document.querySelector('#exam-diagnosis').matches(':disabled')`)))throw new Error('Read-only diagnosis route failed');
    await navigate('/vet/appointments'); await shot('appointments-completed-dark');
    if(width<1280){await evalJS('document.querySelector(".admin-menu-button").click()');await pause();await shot('mobile-menu');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);await pause();if(!(await evalJS('document.activeElement===document.querySelector(".admin-menu-button")')))throw new Error('Escape focus failed');}
    await send('Page.navigate',{url:`http://127.0.0.1:${port}/`},sessionId);await until('!!document.querySelector(".account-trigger")');await evalJS('document.querySelector(".account-trigger").click()');await pause();await shot('header-dropdown');
    if(!(await evalJS(`document.querySelectorAll('.account-dropdown a[href^="/vet/"]').length===7`)))throw new Error('Vet header links missing');
    await evalJS(`localStorage.setItem('pawcare_auth_session',JSON.stringify({id:'customer-demo',role:'CUSTOMER'}));window.dispatchEvent(new Event('pawcare:users-changed'));`); await pause();
    // SPA navigation keeps the switched session; full HTML requests intentionally restore the vet preview actor.
    await evalJS(`history.pushState({},'', '/portal/medical-history');window.dispatchEvent(new PopStateEvent('popstate'));`); await until(`!![...document.querySelectorAll('h2')].find(node=>node.textContent.includes('Chẩn đoán kiểm thử')) || document.body.textContent.includes('Chẩn đoán kiểm thử')`);await shot('customer-history');
    if(await evalJS(`document.body.textContent.includes('PRIVATE_BROWSER_VET')`))throw new Error('Private clinical notes leaked');
    await evalJS(`history.pushState({},'', '/portal/prescriptions');window.dispatchEvent(new PopStateEvent('popstate'));`);await until(`document.body.textContent.includes('Amoxicillin 250 mg')`);await shot('customer-prescription');
    if(exceptions.length)throw new Error('Browser exceptions: '+exceptions.join(', '));
    console.log(`Vet ${width}px: health pet scope/timeline/tabs/Rx/result detail/vaccine states/weight graph/date search/privacy; existing clinical and prescription/order regression; themes, focus and overflow passed.`);
    await send('Browser.close');
  } finally { socket?.close(); browser.kill(); }
}
server.listen(0,'127.0.0.1',async()=>{try{for(const width of process.argv.includes('--quick')?[375,1280]:[320,375,768,1024,1280])await check(width,server.address().port);console.log('Artifacts: '+outputDir);}catch(error){console.error(error);process.exitCode=1;}finally{server.close();}});
