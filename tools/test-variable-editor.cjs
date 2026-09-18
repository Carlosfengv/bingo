/* Real editor integration, isolated project and app profile. Run after pnpm build. */
const { app, BrowserWindow, webContents } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const qa = fs.realpathSync(fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'bingo-variables-')));
const data = path.join(qa, 'data'), project = path.join(qa, 'project');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
write(path.join(project, 'package.json'), { name: 'variable-editor-test', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
write(path.join(project, 'src/App.tsx'), 'export default function App(){return <div>Variables QA</div>}');
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'zh-CN' });
write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'Variable editor QA', addedAt: Date.now() }]);
write(path.join(data, 'project-tabs.json'), []);
app.commandLine.appendSwitch('user-data-dir', data);
const library = {
  version: 1, collections: [{ id: 'colors', name: 'Colors', defaultModeId: 'light', modes: [{ id: 'light', name: 'Light' }, { id: 'dark', name: 'Dark' }, { id: 'ocean', name: 'Ocean' }] }, { id: 'density', name: 'Density', defaultModeId: 'comfortable', modes: [{ id: 'comfortable', name: 'Comfortable' }, { id: 'compact', name: 'Compact' }] }],
  tokens: [{ id: 'bg', name: 'surface/page', type: 'color', collectionId: 'colors', cssName: 'surface-page', valuesByMode: { light: { kind: 'literal', value: '#FFFFFF' }, dark: { kind: 'literal', value: '#111827' }, ocean: { kind: 'literal', value: '#06293B' } } }, { id: 'text', name: 'text/primary', type: 'color', collectionId: 'colors', cssName: 'text-primary', valuesByMode: { light: { kind: 'literal', value: '#111827' }, dark: { kind: 'literal', value: '#F9FAFB' }, ocean: { kind: 'literal', value: '#E7F7FF' } } }, { id: 'space', name: 'space/padding', type: 'number', collectionId: 'density', cssName: 'space-padding', valuesByMode: { comfortable: { kind: 'literal', value: 24 }, compact: { kind: 'literal', value: 12 } } }],
};
write(path.join(project, '.bingo/design/variables.json'), library);
const binding = (property, tokenId) => ({ target: 'style', property, tokenId });
const elements = { schemaVersion: 2, variableModes: { colors: 'light' }, byId: {}, childrenByParent: { ROOT: ['a', 'b'] } };
function add(id, parent, element) { elements.byId[id] = { id, ...element }; if (parent) (elements.childrenByParent[parent] ??= []).push(id); }
for (const [index, id] of ['a', 'b'].entries()) {
  add(id, null, { type: 'html', tag: 'div', name: id === 'a' ? 'Light board' : 'Dark board', props: {}, styles: { width: 360, height: 330, position: 'relative', backgroundColor: 'var(--surface-page)', color: 'var(--text-primary)', padding: 'calc(var(--space-padding) * 1px)', borderRadius: 16 }, theme: { version: 1, bindings: [binding('backgroundColor', 'bg'), binding('color', 'text'), binding('padding', 'space')], localCollectionModes: index ? { colors: 'dark' } : {} }, canvasPosition: { x: 20 + index * 410, y: 25 } });
  add(id + '-title', id, { type: 'html', tag: 'h2', styles: { fontSize: 26, fontWeight: 600, marginBottom: 20 }, props: {} });
  add(id + '-text', id + '-title', { type: 'text', text: index ? 'Dark workspace' : 'Light workspace' });
}
add('card', 'a', { type: 'html', tag: 'div', name: 'Ocean card', props: {}, styles: { backgroundColor: 'var(--surface-page)', color: 'var(--text-primary)', padding: 24, borderRadius: 10 }, theme: { version: 1, bindings: [binding('backgroundColor', 'bg'), binding('color', 'text')], localCollectionModes: { colors: 'ocean' } } });
add('card-text', 'card', { type: 'text', text: 'This card keeps its Ocean mode.' });
const pageId = crypto.randomUUID();
const pageFile = path.join(project, '.bingo/design/pages', pageId + '.json');
write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion: 1, documentId: crypto.randomUUID(), pages: [{ id: pageId }] });
write(pageFile, { schemaVersion: 1, id: pageId, name: 'Variable fixture', canvas: { elements, zoom: 1, pan: { x: 30, y: 50 } }, newClasses: [] });
const report = { directory: qa, checks: [], errors: [] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const check = (label, value) => { assert.ok(value, label); report.checks.push(label); console.log('PASS', label); };
async function waitFor(fn, label, timeout = 45000) { const start = Date.now(); while (Date.now() - start < timeout) { const value = await fn(); if (value) return value; await sleep(120); } throw Error('Timed out: ' + label); }
app.on('web-contents-created', (_e, wc) => wc.on('console-message', (_event, level, message) => { if (level >= 3) report.errors.push(message); }));
require(path.join(repo, 'out/main/index.js'));
setTimeout(() => { console.error('Variable QA timeout', qa); app.exit(1); }, 180000).unref();
app.whenReady().then(async () => {
  let editor;
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window');
    win.setSize(1600, 1000); win.show();
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await invoke(shell, 'project-tabs:open', { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-content] [data-element-id=b]")').catch(() => false), 'fixture');
    await waitFor(async () => (await invoke(shell, 'project-tabs:get')).tabs.every(tab => tab.status === 'idle'), 'compilation');
    const key = (keyCode, modifiers = []) => { editor.focus(); editor.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); editor.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); };
    key('j', ['meta']); await sleep(200); key('1', ['meta']);
    const color = id => evaluate(editor, `getComputedStyle(document.querySelector('[data-canvas-content] [data-element-id="${id}"]')).backgroundColor`);
    await waitFor(async () => (await color('b')) === 'rgb(17, 24, 39)', 'dark render');
    check('Light and Dark boards render independently', await color('a') === 'rgb(255, 255, 255)' && await color('b') === 'rgb(17, 24, 39)');
    check('Nested Ocean override renders correctly', await color('card') === 'rgb(6, 41, 59)');
    await evaluate(editor, `document.querySelector('[title="管理变量"]').click()`);
    await waitFor(() => evaluate(editor, '!!document.querySelector("[role=dialog] table")'), 'variable manager');
    check('Formal editor opens the variable manager', true);
    await sleep(300);
    fs.writeFileSync(path.join(qa, 'variable-manager.png'), (await editor.capturePage()).toPNG());
    await evaluate(editor, `(()=>{const input=document.querySelector('[aria-label="surface/page · Dark"]');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;input.focus();set.call(input,'#243447');input.dispatchEvent(new Event('input',{bubbles:true}));input.blur()})()`);
    await waitFor(async () => (await color('b')) === 'rgb(36, 52, 71)', 'edited dark value');
    check('Editing Dark changes only Dark consumers', await color('a') === 'rgb(255, 255, 255)' && await color('card') === 'rgb(6, 41, 59)');
    await waitFor(() => JSON.parse(fs.readFileSync(path.join(project, '.bingo/design/variables.json'), 'utf8')).tokens[0].valuesByMode.dark.value === '#243447', 'variable save');
    await evaluate(editor, `document.querySelector('[role=dialog] [aria-label="撤销"]').click()`);
    await waitFor(async () => (await color('b')) === 'rgb(17, 24, 39)', 'variable undo');
    check('Variable edit undo updates consumers and saved definitions', true);
    key('Escape'); await sleep(200);
    await evaluate(editor, `(()=>{const n=[...document.querySelectorAll('[data-layer-label]')].find(n=>n.textContent.includes('Dark board'));n.dispatchEvent(new MouseEvent('click',{bubbles:true}))})()`);
    await waitFor(() => evaluate(editor, `!!document.querySelector('[aria-label="变量模式 · Colors"]')`), 'layer modes');
    await evaluate(editor, `(()=>{const n=document.querySelector('[aria-label="变量模式 · Colors"]');n.value='ocean';n.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await waitFor(async () => (await color('b')) === 'rgb(6, 41, 59)', 'local mode change');
    check('Appearance changes the selected board mode', await color('a') === 'rgb(255, 255, 255)');
    key('z', ['meta']);
    await waitFor(async () => (await color('b')) === 'rgb(17, 24, 39)', 'mode undo');
    check('Canvas undo restores the explicit mode', true);
    await evaluate(editor, `document.querySelector('[data-variable-property="backgroundColor"]').click()`);
    await waitFor(() => evaluate(editor, `!!document.querySelector('[role="listbox"] [role="option"]')`), 'binding picker');
    check('Variable picker previews the selected Dark value', await evaluate(editor, `document.querySelector('[role="listbox"]').innerText.includes('#111827')`));
    await evaluate(editor, `[...document.querySelectorAll('[role="listbox"] [role="option"]')].find(n=>n.textContent.includes('text/primary')).click()`);
    await waitFor(async () => await color('b') === 'rgb(249, 250, 251)', 'replace binding');
    check('Replacing a binding updates only the selected property', await color('a') === 'rgb(255, 255, 255)');
    await evaluate(editor, `document.querySelector('[data-variable-property="backgroundColor"]').click()`);
    await evaluate(editor, `[...document.querySelectorAll('button')].find(n=>n.textContent==='解除变量绑定').click()`);
    await waitFor(() => evaluate(editor, `document.querySelector('[data-variable-property="backgroundColor"]').textContent.trim()===''`), 'detach chip');
    check('Detaching preserves the resolved appearance', await color('b') === 'rgb(249, 250, 251)');
    key('z', ['meta']); await sleep(150); key('z', ['meta']);
    await waitFor(async () => await color('b') === 'rgb(17, 24, 39)', 'binding undo');
    check('Undo restores original variable bindings', true);
    await evaluate(editor, `document.querySelector('[data-variable-property="borderRadius"]').click()`);
    await waitFor(() => evaluate(editor, `!!document.querySelector('[role="listbox"] [role="option"]')`), 'number picker');
    check('Number picker excludes color variables', await evaluate(editor, `document.querySelector('[role="listbox"]').innerText.includes('space/padding') && !document.querySelector('[role="listbox"]').innerText.includes('surface/page')`));
    await evaluate(editor, `document.querySelector('[role="listbox"] [role="option"]').click()`);
    await waitFor(() => evaluate(editor, `getComputedStyle(document.querySelector('[data-canvas-content] [data-element-id="b"]')).borderRadius==='24px'`), 'numeric binding units');
    check('Number binding resolves to the correct CSS length', true);
    key('z', ['meta']);
    await sleep(150);
    key('Space', ['shift']);
    await waitFor(() => evaluate(editor, `!!document.querySelector('[role="dialog"] [data-canvas-content]')`), 'floating preview');
    check('Floating preview preserves the selected Dark board', await evaluate(editor, `getComputedStyle(document.querySelector('[role="dialog"] [data-element-id="b"]')).backgroundColor==='rgb(17, 24, 39)'`));
    key('Escape'); await sleep(150);
    fs.writeFileSync(path.join(qa, 'variable-inspector.png'), (await editor.capturePage()).toPNG());
    key('Escape');
    await waitFor(() => evaluate(editor, `!document.querySelector('[data-variable-property="backgroundColor"]') && !!document.querySelector('[aria-label="变量模式 · Colors"]')`), 'page inspector');
    await evaluate(editor, `(()=>{const n=document.querySelector('[aria-label="变量模式 · Colors"]');n.value='dark';n.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await waitFor(async () => await color('a') === 'rgb(17, 24, 39)', 'page inheritance');
    check('Page mode changes Auto boards and preserves nested overrides', await color('card') === 'rgb(6, 41, 59)');
    await evaluate(editor, `(()=>{const n=document.querySelector('[aria-label="变量模式 · Density"]');n.value='compact';n.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await waitFor(() => evaluate(editor, `getComputedStyle(document.querySelector('[data-canvas-content] [data-element-id="b"]')).padding==='12px'`), 'density inheritance');
    check('Density inherits independently of explicit Colors', await color('b') === 'rgb(17, 24, 39)');
    key('z', ['meta']); await sleep(150); key('z', ['meta']);
    await waitFor(async () => await color('a') === 'rgb(255, 255, 255)', 'page undo');
    await waitFor(() => { const saved = JSON.parse(fs.readFileSync(pageFile, 'utf8')).canvas.elements; return saved.variableModes?.colors === 'light' && saved.byId.b.theme.bindings.some(binding => binding.property === 'backgroundColor' && binding.tokenId === 'bg'); }, 'page and binding persistence');
    editor.reload();
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-content] [data-element-id=b]")').catch(() => false), 'reload');
    await waitFor(async () => (await color('b')) === 'rgb(17, 24, 39)', 'reload variables');
    check('Reload preserves page modes, bindings and local overrides', await color('card') === 'rgb(6, 41, 59)');
    const external = JSON.parse(fs.readFileSync(path.join(project, '.bingo/design/variables.json'), 'utf8'));
    external.tokens[0].valuesByMode.dark.value = '#223344';
    write(path.join(project, '.bingo/design/variables.json'), external);
    await waitFor(async () => await color('b') === 'rgb(34, 51, 68)', 'external variable update');
    check('External variable edits refresh the active canvas', await color('a') === 'rgb(255, 255, 255)');
    // Existing thumbnail capture tries to embed hosted fonts that the app CSP blocks.
    // Keep these in the report, but separate them from variable-workflow failures.
    const environmentWarning = message => message.startsWith('Request Autofill.') || (message.includes('https://fonts.gstatic.com/') && (message.startsWith('Connecting to') || message.startsWith('Fetch API cannot load')));
    report.environmentWarnings = report.errors.filter(environmentWarning);
    const rendererErrors = report.errors.filter(message => !environmentWarning(message));
    check('No renderer errors during the variable workflow', rendererErrors.length === 0);
    console.log(JSON.stringify(report, null, 2)); write(path.join(qa, 'report.json'), report); app.exit(0);
  } catch (error) {
    report.failure = String(error.stack || error); console.error(report.failure);
    if (editor && !editor.isDestroyed()) { fs.writeFileSync(path.join(qa, 'failure.png'), (await editor.capturePage()).toPNG()); report.text = await evaluate(editor, 'document.body.innerText').catch(() => ''); }
    write(path.join(qa, 'report.json'), report); console.log(qa); app.exit(1);
  }
});
