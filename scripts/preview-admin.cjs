// Local visual smoke check against the production build.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '../build');
const previewDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pawcare-admin-preview-'));
const chrome = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const candidate = path.resolve(root, '.' + pathname);
  if (!candidate.startsWith(root + path.sep) && candidate !== root) { res.writeHead(403); res.end(); return; }
  const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(file)] || 'text/html; charset=utf-8');
  let data = fs.readFileSync(file);
  if (path.extname(file) === '.html') {
    data = data.toString().replace('<head>', '<head><script>localStorage.setItem("pawcare_auth_session",JSON.stringify({id:"admin-default",role:"ADMIN"}));</script>');
  }
  res.end(data);
});

async function screenshot(port, width, height, section) {
  const prefix = section + '-' + width;
  const output = path.join(previewDir, prefix + '.png');
  const browser = spawn(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-gpu-sandbox',
    '--no-first-run', '--disable-background-networking', '--remote-debugging-port=0',
    '--user-data-dir=' + path.join(previewDir, 'chrome-' + prefix),
    '--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1,MAP fonts.gstatic.com 127.0.0.1',
    'about:blank',
  ], { windowsHide: true });
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Browser startup timed out')), 15000);
      browser.on('error', reject);
      browser.stderr.on('data', (data) => {
        const match = data.toString().match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      });
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0;
    const pending = new Map();
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const request = pending.get(message.id);
      if (request) { pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); }
    };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 }, sessionId);
    await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/admin/' + section }, sessionId);
    let metrics;
    for (let attempt = 0; attempt < 80; attempt++) {
      const { result } = await send('Runtime.evaluate', { expression: 'JSON.stringify({ ready: !!document.querySelector(".admin-users-table, .admin-role-distribution, .admin-activity-page .insights-health-grid"), width: innerWidth, scrollWidth: document.documentElement.scrollWidth })', returnByValue: true }, sessionId);
      metrics = result.value ? JSON.parse(result.value) : {};
      if (metrics.ready) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!metrics.ready || metrics.width !== width || metrics.scrollWidth > width) throw new Error('Layout failed at ' + width + 'px: ' + JSON.stringify(metrics));
    const { result: fonts } = await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => [...document.fonts].some(font => font.family === "Outfit" && font.status === "loaded"))', awaitPromise: true, returnByValue: true }, sessionId);
    if (!fonts.value) throw new Error('Local Outfit font did not load');
    if (section === 'activity') {
      // Isolated browser test fixture, never seeded by the application itself.
      await send('Runtime.evaluate', { expression: 'localStorage.setItem("pawcare_audit_v1", JSON.stringify([{id:"preview-event",createdAt:new Date().toISOString(),actorId:"admin-default",actorName:"Quản trị viên PawCare",actorRole:"ADMIN",module:"SERVICES",action:"SERVICE_UPDATE",targetId:"service-1",targetName:"DV001 · Khám tổng quát",fields:["price"]}])); window.dispatchEvent(new Event("pawcare:audit-changed"));' }, sessionId);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    await send('Runtime.evaluate', { expression: 'window.scrollTo({top: 400, behavior: "instant"})' }, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const { result: stickyHeader } = await send('Runtime.evaluate', { expression: 'JSON.stringify({position: getComputedStyle(document.querySelector(".admin-topbar")).position, top: document.querySelector(".admin-topbar").getBoundingClientRect().top})', returnByValue: true }, sessionId);
    const headerMetrics = JSON.parse(stickyHeader.value);
    if (headerMetrics.position !== 'sticky' || Math.abs(headerMetrics.top) > 1) throw new Error('Sticky header failed: ' + stickyHeader.value);
    await send('Runtime.evaluate', { expression: 'window.scrollTo({top: 0, behavior: "instant"})' }, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
    fs.writeFileSync(output, Buffer.from(result.data, 'base64'));
    console.log('Rendered ' + section + ' at ' + width + 'px without page overflow: ' + output);
    await send('Runtime.evaluate', { expression: 'document.querySelector(".admin-theme-toggle").click()' }, sessionId);
    const { result: light } = await send('Runtime.evaluate', { expression: 'JSON.stringify({theme: document.querySelector(".admin-shell").dataset.theme, background: getComputedStyle(document.querySelector(".admin-shell")).backgroundColor, overflow: document.documentElement.scrollWidth > innerWidth, stored: localStorage.getItem("pawcare_admin_theme_v1")})', returnByValue: true }, sessionId);
    const lightMetrics = JSON.parse(light.value);
    if (lightMetrics.theme !== 'light' || lightMetrics.stored !== 'light' || lightMetrics.background !== 'rgb(249, 250, 251)' || lightMetrics.overflow) throw new Error('Light theme failed: ' + light.value);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const lightShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
    fs.writeFileSync(path.join(previewDir, prefix + '-light.png'), Buffer.from(lightShot.data, 'base64'));
    await send('Runtime.evaluate', { expression: 'document.querySelector(".admin-theme-toggle").click()' }, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (width < 1280) {
      await send('Runtime.evaluate', { expression: 'document.querySelector(".admin-menu-button").click()' }, sessionId);
      const { result: menu } = await send('Runtime.evaluate', { expression: 'JSON.stringify({visible: getComputedStyle(document.querySelector(".admin-sidebar")).display !== "none", overflow: document.documentElement.scrollWidth > innerWidth})', returnByValue: true }, sessionId);
      const menuMetrics = JSON.parse(menu.value);
      if (!menuMetrics.visible || menuMetrics.overflow) throw new Error('Mobile menu failed: ' + menu.value);
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, sessionId);
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, sessionId);
    }
    if (section === 'reports') {
      for (const [label, selector] of [['chart', '.insights-chart, .insights-chart-empty'], ['inventory', '.insights-inventory-table']]) {
        await send('Runtime.evaluate', { expression: 'document.querySelector(' + JSON.stringify(selector) + ').scrollIntoView({block:"start",behavior:"instant"})' }, sessionId);
        await new Promise((resolve) => setTimeout(resolve, 100));
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
        fs.writeFileSync(path.join(previewDir, prefix + '-' + label + '.png'), Buffer.from(shot.data, 'base64'));
      }
    }
    if (['dashboard', 'reports'].includes(section)) { await send('Browser.close'); return; }
    const openDialog = section === 'activity' ? '[...document.querySelectorAll("button")].find(button => button.getAttribute("aria-label")?.startsWith("Chi tiết ")).click()' : 'document.querySelector(".admin-page-title button").click()';
    await send('Runtime.evaluate', { expression: openDialog }, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const { result: dialog } = await send('Runtime.evaluate', { expression: 'JSON.stringify({ open: document.querySelector(".admin-modal")?.open, width: document.querySelector(".admin-modal")?.getBoundingClientRect().width, focusInside: document.querySelector(".admin-modal")?.contains(document.activeElement), background: getComputedStyle(document.querySelector(".admin-modal")).backgroundColor })', returnByValue: true }, sessionId);
    const dialogMetrics = JSON.parse(dialog.value);
    if (!dialogMetrics.open || dialogMetrics.width > width || !dialogMetrics.focusInside || dialogMetrics.background !== 'rgb(23, 31, 46)') throw new Error('Dialog failed at ' + width + 'px: ' + dialog.value);
    console.log('Dialog opens with keyboard focus at ' + width + 'px');
    const editorShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
    fs.writeFileSync(path.join(previewDir, prefix + '-editor.png'), Buffer.from(editorShot.data, 'base64'));
    await send('Runtime.evaluate', { expression: 'document.querySelector(".admin-modal > header button").click()' }, sessionId);
    await send('Runtime.evaluate', { expression: 'document.querySelector(".admin-theme-toggle").click()' }, sessionId);
    await send('Runtime.evaluate', { expression: openDialog }, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const { result: lightDialog } = await send('Runtime.evaluate', { expression: 'JSON.stringify({open: document.querySelector(".admin-modal")?.open, background: getComputedStyle(document.querySelector(".admin-modal")).backgroundColor})', returnByValue: true }, sessionId);
    const lightDialogMetrics = JSON.parse(lightDialog.value);
    if (!lightDialogMetrics.open || lightDialogMetrics.background !== 'rgb(255, 255, 255)') throw new Error('Light dialog failed: ' + lightDialog.value);
    const lightEditorShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
    fs.writeFileSync(path.join(previewDir, prefix + '-editor-light.png'), Buffer.from(lightEditorShot.data, 'base64'));
    await send('Runtime.evaluate', { expression: 'document.querySelector(".admin-modal > header button").click()' }, sessionId);
    await send('Runtime.evaluate', { expression: 'document.querySelector(".admin-theme-toggle").click()' }, sessionId);
    await send('Runtime.evaluate', { expression: openDialog }, sessionId);
    if (section === 'medicines') {
      await send('Runtime.evaluate', { expression: 'document.querySelector(".admin-modal > header button").click()' }, sessionId);
      await send('Runtime.evaluate', { expression: '[...document.querySelectorAll("button")].find(button => button.getAttribute("aria-label")?.startsWith("Lô hàng ")).click()' }, sessionId);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const { result: batch } = await send('Runtime.evaluate', { expression: 'JSON.stringify({open: document.querySelector(".catalog-batch-modal")?.open, width: document.querySelector(".catalog-batch-modal")?.getBoundingClientRect().width, scrollWidth: document.querySelector(".catalog-batch-modal")?.scrollWidth, focusInside: document.querySelector(".catalog-batch-modal")?.contains(document.activeElement)})', returnByValue: true }, sessionId);
      const batchMetrics = JSON.parse(batch.value);
      if (!batchMetrics.open || batchMetrics.width > width || batchMetrics.scrollWidth > batchMetrics.width || !batchMetrics.focusInside) throw new Error('Batch dialog failed: ' + JSON.stringify(batchMetrics));
      const batchShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
      const batchOutput = path.join(previewDir, prefix + '-batches.png');
      fs.writeFileSync(batchOutput, Buffer.from(batchShot.data, 'base64'));
      console.log('Batch dialog has no overflow and receives focus: ' + batchOutput);
    }
    await send('Browser.close');
  } finally {
    socket?.close();
    browser.kill();
  }
}

server.listen(0, '127.0.0.1', async () => {
  try {
    const sections = process.argv.slice(2);
    for (const section of sections.length ? sections : ['users']) {
      if (!['dashboard', 'users', 'services', 'medicines', 'activity', 'reports'].includes(section)) throw new Error('Unknown admin section: ' + section);
      await screenshot(server.address().port, 1280, 1000, section);
      await screenshot(server.address().port, 768, 1000, section);
      await screenshot(server.address().port, 375, 1000, section);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { server.close(); }
});
