/* Real selection-code round trips in an isolated project/profile. Run after build:
 * pnpm exec electron tools/test-selection-variables.cjs */
const { app, BrowserWindow, webContents } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { foregroundEditor } = require('./editor-test-foreground.cjs');
const repo = path.resolve(__dirname, '..');
const qa = fs.realpathSync(fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'bingo-selection-variables-')));
const project = path.join(qa, 'project'), data = path.join(qa, 'data');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
write(path.join(project, 'package.json'), { name: 'selection-variables-test', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
write(path.join(project, 'src/components/ui/sidebar.tsx'), 'export function SidebarGroupLabel({children,...props}) {return <div {...props}>{children}</div>}');
write(path.join(project, 'src/App.tsx'), "import './styles.css'; import {SidebarGroupLabel} from './components/ui/sidebar'; export default function App(){return <SidebarGroupLabel>Selection test</SidebarGroupLabel>}");
write(path.join(project, 'src/styles.css'), ':root { --foreground: #222222; --unused: #123456; } .dark { --foreground: #eeeeee; --unused: #654321; }');
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'zh-CN' });
write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'Selection variables QA', addedAt: Date.now() }]);
write(path.join(data, 'project-tabs.json'), []);
app.commandLine.appendSwitch('user-data-dir', data);
const tokenId = `css-token-${crypto.createHash('sha1').update('foreground').digest('hex').slice(0, 14)}`;
const theme = { version: 1, localCollectionModes: { 'project-styles': 'light' }, bindings: [{ target: 'style', property: 'color', tokenId }] };
const elements = { schemaVersion: 2, byId: {
  page: { id: 'page', name: 'Page', type: 'html', tag: 'div', styles: { width: 500, height: 300, padding: 24, backgroundColor: '#444444', color: 'var(--foreground)' }, theme: { version: 1, localCollectionModes: { 'project-styles': 'dark' } }, canvasPosition: { x: 30, y: 30 } },
  label: { id: 'label', name: 'Inherited label', type: 'component', componentName: 'SidebarGroupLabel' },
  text: { id: 'text', type: 'text', text: 'Original label' },
  bound: { id: 'bound', name: 'Bound label', type: 'component', componentName: 'SidebarGroupLabel', styles: { color: 'var(--foreground)' }, theme },
  boundText: { id: 'boundText', type: 'text', text: 'Bound text' },
}, childrenByParent: { ROOT: ['page'], page: ['label', 'bound'], label: ['text'], bound: ['boundText'] } };
const pageId = crypto.randomUUID();
const pageFile = path.join(project, '.bingo/design/pages', `${pageId}.json`);
write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion: 1, documentId: crypto.randomUUID(), pages: [{ id: pageId }] });
write(pageFile, { schemaVersion: 1, id: pageId, name: 'Selection fixture', canvas: { elements, zoom: 1, pan: { x: 30, y: 50 } }, newClasses: [] });
const saved = () => JSON.parse(fs.readFileSync(pageFile, 'utf8')).canvas.elements;
const report = { directory: qa, checks: [] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); console.log('PASS', name); };
async function waitFor(fn, label, timeout = 45000) { const start = Date.now(); while (Date.now() - start < timeout) { if (await fn()) return; await sleep(120); } throw Error('Timed out: ' + label); }
require(path.join(repo, 'out/main/index.js'));
setTimeout(() => { console.error('Selection QA timeout', qa); app.exit(1); }, 180000).unref();
app.whenReady().then(async () => {
  let editor;
  try {
    let win;
    await waitFor(() => (win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed())), 'window');
    win.setSize(1500, 950); win.show();
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await invoke(shell, 'project-tabs:open', { projectId: project });
    await waitFor(() => (editor = webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } })), 'editor');
    await foregroundEditor(editor);
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-content] [data-element-id=label]")').catch(() => false), 'fixture');
    await waitFor(async () => (await invoke(shell, 'project-tabs:get')).tabs.every(tab => tab.status === 'idle'), 'compilation');
    const key = (keyCode, modifiers = []) => { editor.focus(); editor.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); editor.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); };
    if (await evaluate(editor, '(localStorage.getItem("bingo-editor-mode")||"dev")!=="dev"')) { key('j', ['meta']); await sleep(300); }
    const select = async id => { await evaluate(editor, `document.querySelector('[data-canvas-content] [data-element-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}))`); await sleep(250); };
    const readCode = () => evaluate(editor, "document.querySelector('.cm-content')?.cmView?.view?.state.doc.toString()");
    const editCode = code => evaluate(editor, `(()=>{const view=document.querySelector('.cm-content').cmView.view;view.dispatch({changes:{from:0,to:view.state.doc.length,insert:${JSON.stringify(code)}}})})()`);
    const apply = () => evaluate(editor, `document.querySelector('[aria-label="将 JSX 应用到画布"]').click()`);
    await select('label');
    await waitFor(async () => (await readCode())?.includes('Original label'), 'selection editor');
    const code = await readCode();
    check('Component reference excludes runtime variables and internal theme metadata', code.includes('<SidebarGroupLabel>') && !/data-bingo-variables|--foreground|--unused/.test(code));
    await editCode(code.replace('Original label', 'Edited label')); await sleep(400);
    check('Preview updates the label', await evaluate(editor, `document.querySelector('[data-canvas-content] [data-element-id=label]').textContent.includes('Edited label')`));
    await apply();
    await waitFor(() => Object.values(saved().byId).some(node => node.text === 'Edited label'), 'saved edit');
    check('Applying text keeps inherited theme and writes no generated styles', !saved().byId.label.theme && !saved().byId.label.styles);
    await select('bound');
    await waitFor(async () => (await readCode())?.includes('Bound text'), 'bound editor');
    const boundCode = await readCode();
    check('Authored variable reference is visible without its declarations', boundCode.includes('var(--foreground)') && !boundCode.includes('"--foreground"') && !boundCode.includes('data-bingo-variables'));
    await editCode(boundCode.replace('Bound text', 'Bound edited')); await apply();
    await waitFor(() => Object.values(saved().byId).some(node => node.text === 'Bound edited'), 'saved binding edit');
    check('Text editing preserves local mode and binding metadata', JSON.stringify(saved().byId.bound.theme) === JSON.stringify(theme));
    await editCode((await readCode()).replace('var(--foreground)', 'red')); await apply();
    await waitFor(() => saved().byId.bound.styles.color === 'red', 'fixed color save');
    check('Fixed colors detach stale bindings but preserve local mode', saved().byId.bound.theme.bindings.length === 0 && saved().byId.bound.theme.localCollectionModes['project-styles'] === 'light');
    await evaluate(editor, 'document.activeElement?.blur()'); key('z', ['meta']);
    await waitFor(() => saved().byId.bound.styles.color === 'var(--foreground)', 'undo binding');
    check('Undo restores the variable binding', saved().byId.bound.theme.bindings[0].tokenId === tokenId);
    await select('label');
    await editor.capturePage().then(image => fs.writeFileSync(path.join(qa, 'selection-code.png'), image.toPNG()));
    editor.reload();
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-content] [data-element-id=bound]")').catch(() => false), 'reload');
    check('Reload retains clean nodes and authored bindings', !saved().byId.label.styles && saved().byId.bound.theme.bindings[0].tokenId === tokenId);
    write(path.join(qa, 'report.json'), report); console.log(JSON.stringify(report)); app.exit(0);
  } catch (error) {
    report.failure = String(error.stack || error); console.error(report.failure);
    if (editor && !editor.isDestroyed()) {
      report.text = await evaluate(editor, 'document.body.innerText').catch(() => '');
      await editor.capturePage().then(image => fs.writeFileSync(path.join(qa, 'failure.png'), image.toPNG())).catch(() => {});
    }
    write(path.join(qa, 'report.json'), report); console.log(qa); app.exit(1);
  }
});
