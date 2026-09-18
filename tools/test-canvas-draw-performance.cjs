/* Run after pnpm build: pnpm exec electron tools/test-canvas-draw-performance.cjs
 * Real input in an isolated project/profile; no user data or AI requests.
 */
const { app, BrowserWindow, webContents } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const qa = fs.realpathSync(fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'bingo-draw-perf-')));
const data = path.join(qa, 'data');
const project = path.join(qa, 'project');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
if (process.env.TEST_PROJECT_SOURCE) {
  const source = fs.realpathSync(process.env.TEST_PROJECT_SOURCE);
  fs.mkdirSync(project, { recursive: true });
  require('node:child_process').execFileSync('rsync', ['-a', '--exclude=node_modules', '--exclude=.git', '--exclude=.bingo', '--exclude=dist', '--exclude=.next', source + '/', project + '/']);
  fs.symlinkSync(path.join(source, 'node_modules'), path.join(project, 'node_modules'));
  const pageId = require('node:crypto').randomUUID();
  write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion: 1, documentId: require('node:crypto').randomUUID(), pages: [{ id: pageId }] });
  write(path.join(project, '.bingo/design/pages', pageId + '.json'), { schemaVersion: 1, id: pageId, name: 'Crash reproduction', canvas: { elements: { schemaVersion: 2, byId: { 'el-app-root': { id: 'el-app-root', type: 'component', componentName: 'App', props: {}, styles: { position: 'absolute', left: 80, top: 80 }, _componentMissing: true } }, childrenByParent: { ROOT: ['el-app-root'] } }, zoom: .25, pan: { x: 0, y: 0 } }, newClasses: [] });
} else {
  write(path.join(project, 'package.json'), { name: 'canvas-performance-test', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
  write(path.join(project, 'src/App.tsx'), 'export default function App(){return <div>Canvas QA</div>}');
  fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
}
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'zh-CN' });
write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'Canvas performance QA', addedAt: Date.now() }]);
write(path.join(data, 'project-tabs.json'), []);
app.commandLine.appendSwitch('user-data-dir', data);
const report = { checks: [], errors: [] };
app.whenReady().then(() => {
  setInterval(() => fs.appendFileSync(path.join(qa, "memory.jsonl"), JSON.stringify({ time: Date.now(), processes: app.getAppMetrics().map(m => ({ pid: m.pid, type: m.type, memory: m.memory, cpu: m.cpu.percentCPUUsage })) }) + "\n"), 500).unref();
});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const check = (label, value) => { assert.ok(value, label); report.checks.push(label); };
async function waitFor(fn, label, timeout = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { const value = await fn(); if (value) return value; await sleep(100); }
  throw Error('Timed out: ' + label);
}

app.on('web-contents-created', (_e, wc) => {
  wc.on('console-message', (_event, level, message) => {
    if (level >= 2 && report.errors.length < 80) report.errors.push(message.slice(0, 2000));
  });
  wc.on('render-process-gone', (_event, details) => { report.crash = details; write(path.join(qa, 'report.json'), report); console.error('CRASH', qa, details); app.exit(1); });
});
require(path.join(repo, 'out/main/index.js'));
setTimeout(() => { write(path.join(qa, 'report.json'), report); console.error('TIMEOUT', qa, report.errors.slice(-6)); app.exit(1); }, 180000).unref();
app.whenReady().then(async () => {
  let editor;
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window');
    win.setSize(1400, 950); win.show();
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await invoke(shell, 'project-tabs:open', { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-viewport]")').catch(() => false), 'canvas');
    await waitFor(async () => (await invoke(shell, 'project-tabs:get')).tabs.every(tab => tab.status === 'idle'), 'project compilation');
    editor.closeDevTools(); shell.closeDevTools(); await sleep(800);
    const key = (keyCode, modifiers = []) => { editor.focus(); editor.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); editor.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); };
    if (process.env.TEST_DESIGN_MODE === '1') { key('j', ['meta']); await sleep(200); }
    const rect = await evaluate(editor, 'document.querySelector("[data-canvas-viewport]").getBoundingClientRect().toJSON()');
    key('f');
    const start = { x: Math.round(rect.x + rect.width * .45), y: Math.round(rect.y + rect.height * .45) };
    editor.sendInputEvent({ type: 'mouseMove', ...start });
    editor.sendInputEvent({ type: 'mouseDown', ...start, button: 'left', clickCount: 1 });
    editor.sendInputEvent({ type: 'mouseMove', x: start.x + 150, y: start.y + 100, movementX: 150, movementY: 100 });
    await sleep(100);
    editor.sendInputEvent({ type: 'mouseUp', x: start.x + 150, y: start.y + 100, button: 'left', clickCount: 1 });
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-content] [data-element-id^=html-]")'), 'drawn div');
    check('Draw creates a selected div', await evaluate(editor, 'document.querySelectorAll("[data-selection-overlay-id]").length === 1'));
    await sleep(300);
    const button = await evaluate(editor, 'document.querySelector("[data-canvas-performance] button").getBoundingClientRect().toJSON()');
    const p = { x: Math.round(button.x + button.width / 2), y: Math.round(button.y + button.height / 2) };
    editor.sendInputEvent({ type: 'mouseMove', ...p });
    editor.sendInputEvent({ type: 'mouseDown', ...p, button: 'left', clickCount: 1 });
    editor.sendInputEvent({ type: 'mouseUp', ...p, button: 'left', clickCount: 1 });
    check('Native click opens performance panel', await waitFor(() => evaluate(editor, 'document.querySelector("[data-canvas-performance] button").ariaExpanded === "true"'), 'performance panel'));
    report.memory = [];
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      report.memory.push(app.getAppMetrics().filter(metric => metric.type === 'Tab').map(metric => ({ pid: metric.pid, memory: metric.memory, cpu: metric.cpu.percentCPUUsage })));
      await evaluate(editor, 'document.querySelector("[data-canvas-performance]").textContent');
      if (report.errors.some(message => /Maximum update depth|Too many re-renders/.test(message))) throw Error('React update loop detected');
    }
    check('Drawn canvas remains responsive with diagnostics open', true);
    for (let i = 0; i < 12; i++) {
      await evaluate(editor, 'document.querySelector("[data-canvas-performance] button").click()');
      await sleep(80);
    }
    check('Repeated panel toggles remain responsive', await evaluate(editor, 'document.querySelector("[data-canvas-performance] button").ariaExpanded === "true"'));
    const runtime = require('esbuild').buildSync({ entryPoints: [path.join(repo, 'packages/compiler/src/runtime/executeModule.ts')], bundle: true, write: false, format: 'iife', globalName: 'moduleImportQA', logLevel: 'silent' }).outputFiles[0].text;
    report.imports = await evaluate(editor, runtime + `;(async () => {
      const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
      const created = [], revoked = [];
      URL.createObjectURL = blob => { const url = create.call(URL, blob); created.push(url); return url; };
      URL.revokeObjectURL = url => { revoked.push(url); revoke.call(URL, url); };
      try {
        const source = 'export const identity = {}; /*' + 'x'.repeat(2000000) + '*/';
        const url = 'data:text/javascript;base64,' + btoa(source);
        const [first, second] = await Promise.all([moduleImportQA.executeCompiledModule(url), moduleImportQA.executeCompiledModule(url)]);
        const third = await moduleImportQA.executeCompiledModule(url);
        let error;
        const bad = 'data:text/javascript;base64,' + btoa('throw new Error("Fixture failure"); /*' + 'x'.repeat(2000000) + '*/');
        try { await moduleImportQA.executeCompiledModule(bad); } catch (cause) { error = cause.message; }
        try { await moduleImportQA.executeCompiledModule(bad); } catch {}
        return { sameIdentity: first.identity === second.identity && first.identity === third.identity,
          created, revoked, error };
      } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; }
    })()`);
    check('Large inline modules use short blob URLs and preserve module identity', report.imports.sameIdentity && report.imports.created.length === 2 && report.imports.created.every(url => url.startsWith('blob:') && url.length < 100));
    check('Successful and failed imports release their blob URLs', JSON.stringify(report.imports.created) === JSON.stringify(report.imports.revoked));
    check('Large failed imports produce bounded useful errors', report.imports.error.includes('Fixture failure') && report.imports.error.length < 1500);
    const editorPid = editor.getOSProcessId();
    const memorySamples = fs.readFileSync(path.join(qa, 'memory.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    report.peakRendererMB = Math.max(...memorySamples.flatMap(sample => sample.processes.filter(p => p.pid === editorPid).map(p => p.memory.workingSetSize / 1024)));
    check('Renderer stays below 2 GB during drawing and rebuild', report.peakRendererMB < 2048);
    fs.writeFileSync(path.join(qa, 'performance-panel.png'), (await editor.capturePage()).toPNG());
    report.body = await evaluate(editor, 'document.body.innerText');
    write(path.join(qa, 'report.json'), report);
    console.log(JSON.stringify({ evidence: qa, checks: report.checks, errors: [...new Set(report.errors)] }, null, 2));
    app.quit();
  } catch (error) {
    report.failure = String(error.stack || error); write(path.join(qa, 'report.json'), report);
    console.error(qa, report.failure, report.errors.slice(-5)); app.exit(1);
  }
});
