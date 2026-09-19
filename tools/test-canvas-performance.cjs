/* Run after pnpm build: pnpm exec electron tools/test-canvas-performance.cjs
 * Real input in an isolated project/profile; no user data or AI requests.
 */
const { app, BrowserWindow, webContents, clipboard } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const qa = fs.realpathSync(fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'bingo-canvas-perf-')));
const data = path.join(qa, 'data');
const project = path.join(qa, 'project');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
write(path.join(project, 'package.json'), { name: 'canvas-performance-test', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
write(path.join(project, 'src/App.tsx'), 'export default function App(){return <div>Canvas QA</div>}');
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'zh-CN' });
write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'Canvas performance QA', addedAt: Date.now() }]);
write(path.join(data, 'project-tabs.json'), []);
app.commandLine.appendSwitch('user-data-dir', data);
const report = { checks: [], errors: [] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const check = (label, value) => { assert.ok(value, label); report.checks.push(label); };
async function waitFor(fn, label, timeout = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { const value = await fn(); if (value) return value; await sleep(100); }
  throw Error('Timed out: ' + label);
}
const elements = { schemaVersion: 2, byId: {}, childrenByParent: { ROOT: ['a', 'b'] } };
function add(id, parent, el) { elements.byId[id] = { id, ...el }; if (parent) (elements.childrenByParent[parent] ??= []).push(id); }
for (const [index, id] of ['a', 'b'].entries()) {
  add(id, null, { type: 'html', tag: 'div', name: id.toUpperCase(), props: {}, styles: { position: 'relative', width: 400, height: 360, backgroundColor: index ? '#dae8e0' : '#dee5f0', borderRadius: 12 }, canvasPosition: { x: 20 + index * 440, y: 30 } });
  add(id + '-card', id, { type: 'html', tag: 'div', props: {}, styles: { position: 'absolute', left: 40, top: 40, width: 300, height: 85, backgroundColor: '#f8f7f3', padding: 16 } });
  add(id + '-inner', id + '-card', { type: 'html', tag: 'div', props: {}, styles: { padding: 8 } });
  add(id + '-text', id + '-inner', { type: 'text', text: 'Selection performance ' + id });
  for (let i = 0; i < 300; i++) add(id + '-dot-' + i, id, { type: 'html', tag: 'div', props: {}, styles: { position: 'absolute', left: 20 + i % 30 * 12, top: 160 + Math.floor(i / 30) * 15, width: 8, height: 8, backgroundColor: index ? '#6d9684' : '#738daa' } });
}
const pageId = require('node:crypto').randomUUID();
write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion: 1, documentId: require('node:crypto').randomUUID(), pages: [{ id: pageId }] });
write(path.join(project, '.bingo/design/pages', pageId + '.json'), { schemaVersion: 1, id: pageId, name: 'Performance fixture', canvas: { elements, zoom: 1, pan: { x: 30, y: 50 } }, newClasses: [] });
app.on('web-contents-created' , (_e, wc) => wc.on('console-message', (_event, level, message) => { if (level >= 3) report.errors.push(message); }));
require(path.join(repo, 'out/main/index.js'));
const timeout = setTimeout(() => { console.error('Canvas QA timed out:', qa); app.exit(1); }, 150000);
timeout.unref();
app.whenReady().then(async () => {
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window');
    win.setSize(1600, 1000); win.show(); win.webContents.closeDevTools();
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await invoke(shell, 'project-tabs:open', { projectId: project });
    const editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-viewport]")').catch(() => false), 'canvas');
    await evaluate(editor, 'localStorage.setItem("bingo-editor-mode","design")');
    // Use the actual mode shortcut to collapse the initially mounted bottom pane.
    editor.focus();
    editor.sendInputEvent({ type: 'keyDown', keyCode: 'j', modifiers: ['meta'] });
    editor.sendInputEvent({ type: 'keyUp', keyCode: 'j', modifiers: ['meta'] });
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-root-id=a]")').catch(() => false), 'fixture');
    await waitFor(async () => (await invoke(shell, 'project-tabs:get')).tabs.every(tab => tab.status === 'idle'), 'project compilation');
    editor.closeDevTools();
    await sleep(2500);
    editor.sendInputEvent({ type: 'keyDown', keyCode: '1', modifiers: ['meta'] });
    editor.sendInputEvent({ type: 'keyUp', keyCode: '1', modifiers: ['meta'] });
    await sleep(700);
    const toolbarButton = label => evaluate(editor, `(()=>{const b=[...document.querySelectorAll('[data-canvas-performance] button')].find(b=>b.textContent.includes(${JSON.stringify(label)}));if(!b)throw Error('Missing performance button');b.click()})()`);
    const selected = () => evaluate(editor, 'Array.from(document.querySelectorAll("[data-selection-overlay-id]"),n=>n.dataset.selectionOverlayId).sort()');
    const metrics = () => evaluate(editor, `Object.fromEntries([...document.querySelectorAll('[data-canvas-performance] tbody tr')].map(row=>{const cells=[...row.children].map(c=>c.textContent);return [cells[0],{last:cells[1],p95:cells[2],count:Number(cells[3])}]}))`);
    async function point(id, padding = false) {
      return evaluate(editor, `(()=>{const r=document.querySelector('[data-canvas-content] [data-element-id="${id}"]').getBoundingClientRect();return {x:Math.round(r.left+${padding ? '12' : 'r.width/2'}),y:Math.round(r.top+${padding ? 'r.height-12' : 'r.height/2'})}})()`);
    }
    async function click(id, options = {}) {
      const p = await point(id, options.padding);
      editor.focus();
      editor.sendInputEvent({ type: 'mouseMove', ...p });
      editor.sendInputEvent({ type: 'mouseDown', ...p, button: 'left', clickCount: options.count ?? 1, modifiers: options.shift ? ['shift'] : [] });
      editor.sendInputEvent({ type: 'mouseUp', ...p, button: 'left', clickCount: options.count ?? 1, modifiers: options.shift ? ['shift'] : [] });
      await sleep(80);
    }
    await toolbarButton('画布性能');
    await sleep(100);
    report.beforeClick = await evaluate(editor, `({rect:[...document.querySelectorAll('[data-canvas-root-id]')].map(n=>({id:n.dataset.canvasRootId,rect:n.getBoundingClientRect().toJSON()})),toolbar:document.querySelector('[data-canvas-performance]').getBoundingClientRect().toJSON()})`);
    await click('a', { padding: true });
    check('Native click selects root A', (await selected()).join() === 'a');
    await click('b', { padding: true });
    check('Native click selects root B', (await selected()).join() === 'b');
    // Compilation can finish before initial saves, thumbnail capture and
    // camera settling. Measure steady selection only after that work stops.
    let previousCounts = '', stableSince = Date.now();
    await waitFor(async () => {
      const counts = JSON.stringify(Object.entries(await metrics()).map(([name, sample]) => [name, sample.count]));
      if (counts !== previousCounts) { previousCounts = counts; stableSince = Date.now(); }
      return Date.now() - stableSince >= 2000;
    }, 'initial canvas work settles');
    await toolbarButton('重置');
    for (let i = 0; i < 12; i++) await click(i % 2 ? 'b' : 'a', { padding: true });
    await sleep(550);
    report.metrics = await metrics();
    check('Selection timing samples are collected', report.metrics['选中框提交'].count >= 12);
    check('Ordinary selection does not rebuild root trees', report.metrics['根元素树构建'].count === 0);
    check('Collapsed code pane generates no JSX', report.metrics['选中 JSX 生成'].count === 0);
    const beforeIdle = JSON.stringify(report.metrics);
    await sleep(650);
    report.idleMetrics = await metrics();
    check('Toolbar refresh does not render or remeasure canvas', JSON.stringify(report.idleMetrics) === beforeIdle);
    // capturePage can trigger visibility/layout work; keep it outside the
    // interval whose only expected activity is the toolbar's polling timer.
    fs.writeFileSync(path.join(qa, 'selection-benchmark.png'), (await editor.capturePage()).toPNG());
    await click('a', { padding: true, shift: true });
    check('Shift selection retains both roots', (await selected()).join() === 'a,b');
    await click('a-text');
    check('Nested click selects direct child', (await selected()).join() === 'a-card');
    await click('a-text', { count: 2 });
    check('Double click descends to inner text owner', (await selected()).join() === 'a-inner');
    await click('a-text', { count: 3 });
    check('Further descent opens text editing', await evaluate(editor, '!!document.querySelector("[data-canvas-content] [contenteditable=true]")'));
    editor.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); editor.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
    await sleep(150);
    await click('b', { padding: true });
    const drag = await point('b', true);
    editor.sendInputEvent({ type: 'mouseDown', ...drag, button: 'left', clickCount: 1 });
    editor.sendInputEvent({ type: 'mouseMove', x: drag.x + 12, y: drag.y + 12, movementX: 12, movementY: 12 });
    await sleep(100);
    editor.sendInputEvent({ type: 'mouseMove', x: drag.x + 40, y: drag.y + 30, movementX: 28, movementY: 18 });
    await sleep(100);
    editor.sendInputEvent({ type: 'mouseUp', x: drag.x + 40, y: drag.y + 30, button: 'left', clickCount: 1 });
    await sleep(200);
    const afterDrag = await point('b', true);
    check('Dragging still moves selected root', Math.abs(afterDrag.x - drag.x) > 10);
    await toolbarButton('复制');
    const exported = await waitFor(() => { try { const value = JSON.parse(clipboard.readText()); return value.metrics ? value : null; } catch { return null; } }, 'copied metrics', 3000);
    check('Copy exports numeric diagnostics', exported.nodeCount === 608 && exported.metrics.selection.count > 0);
    fs.writeFileSync(path.join(qa, 'toolbar.png'), (await editor.capturePage()).toPNG());
    await toolbarButton('画布性能');
    check('Toolbar can stop collection', await evaluate(editor, 'document.querySelector("[data-canvas-performance] button").getAttribute("aria-expanded")==="false"'));
    // Hidden-pane copy must generate current code on demand.
    const key = (keyCode, modifiers = []) => {
      editor.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
      editor.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
    };
    await evaluate(editor, 'document.activeElement?.blur()');
    key('c', ['meta', 'shift']);
    await waitFor(() => clipboard.readText().includes('export function NewComponent'), 'hidden selection copy', 3000);
    check('Hidden code pane copies the current selection on demand', clipboard.readText().includes('Selection performance b'));
    key('j', ['meta']);
    await waitFor(() => evaluate(editor, '!!document.querySelector(".cm-content")?.textContent.includes("NewComponent")'), 'visible selection code');
    check('Opening the code pane generates current JSX', true);
    await evaluate(editor, 'document.querySelector(".cm-content").focus()');
    key('a', ['meta']);
    await editor.insertText('<div');
    await sleep(100);
    await evaluate(editor, 'document.activeElement?.blur()');
    key('j', ['meta']);
    await sleep(120);
    check('Code pane collapses', await evaluate(editor, 'localStorage.getItem("bingo-editor-mode")==="design"'));
    key('j', ['meta']);
    await sleep(150);
    check('Code pane reopens', await evaluate(editor, 'localStorage.getItem("bingo-editor-mode")==="dev"'));
    check('An unfinished JSX draft survives collapsing and reopening the pane', await evaluate(editor, 'document.querySelector(".cm-content").textContent.trim()==="<div"'));
    await evaluate(editor, 'document.querySelector("button[aria-label=重置更改]").click()');
    await sleep(150);
    await waitFor(() => evaluate(editor, 'document.querySelector(".cm-content").textContent.includes("NewComponent")'), 'reset selection JSX', 3000);
    check('Reset restores JSX for the selected element', true);
    await invoke(shell, 'bingo:locale-set', { preference: 'en' });
    await waitFor(() => evaluate(editor, 'document.querySelector("[data-canvas-performance]").textContent.includes("Canvas performance")'), 'English labels');
    check('Performance toolbar follows the editor language', true);
    await evaluate(shell, `localStorage.setItem('bingo-editor-theme','light');window.dispatchEvent(new StorageEvent('storage',{key:'bingo-editor-theme'}))`);
    await toolbarButton('Canvas performance');
    await sleep(250);
    fs.writeFileSync(path.join(qa, 'toolbar-light.png'), (await editor.capturePage()).toPNG());
    report.unexpectedErrors = [...new Set(report.errors)].filter(message => !/fonts\.gstatic\.com|Request Autofill\.|Failed to parse JSX: SyntaxError: Unexpected token/.test(message));
    check('No unexpected renderer errors', report.unexpectedErrors.length === 0);
    report.done = true;
    fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2));
    const output = path.join(repo, 'output/playwright/canvas-performance');
    fs.mkdirSync(output, { recursive: true });
    for (const file of ['report.json', 'selection-benchmark.png', 'toolbar.png', 'toolbar-light.png']) fs.copyFileSync(path.join(qa, file), path.join(output, file));
    console.log(JSON.stringify({ evidence: output, checks: report.checks.length, metrics: report.metrics, unexpectedErrors: report.unexpectedErrors }, null, 2));
    app.quit();
  } catch (error) {
    const wc = webContents.getAllWebContents().find(wc => wc.getURL().includes('projectTab='));
    if (wc) { fs.writeFileSync(path.join(qa, 'failure.png'), (await wc.capturePage()).toPNG()); report.body = await evaluate(wc, 'document.body.innerText'); report.mode = await evaluate(wc, 'localStorage.getItem("bingo-editor-mode")'); }
    report.failure = String(error.stack || error);
    fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2));
    console.error(qa, report.failure, report.metrics);
    app.exit(1);
  }
});
