/* Stage-one performance invariants and editing regressions, in an isolated project.
 * Run: pnpm build && pnpm exec electron tools/test-editor-stage-one.cjs
 */
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
const tokenId = name => `css-token-${crypto.createHash('sha1').update(name).digest('hex').slice(0, 14)}`;
const cssFile = path.join(project, 'src/tokens.css');
write(cssFile, `@theme { --color-surface-page: var(--surface-page); --space-padding: var(--space-padding); }
:root { --surface-page: #FFFFFF; --text-primary: #111827; --space-padding: 24px; }
.dark { --surface-page: #111827; --text-primary: #F9FAFB; --space-padding: 24px; }
[data-theme="ocean"] { --surface-page: #06293B; --text-primary: #E7F7FF; }
`);
const binding = (property, tokenId) => ({ target: 'style', property, tokenId });
const elements = { schemaVersion: 2, variableModes: { 'project-styles': 'light' }, byId: {}, childrenByParent: { ROOT: ['a', 'b'] } };
function add(id, parent, element) { elements.byId[id] = { id, ...element }; if (parent) (elements.childrenByParent[parent] ??= []).push(id); }
for (const [index, id] of ['a', 'b'].entries()) {
  add(id, null, { type: 'html', tag: 'div', name: id === 'a' ? 'Light board' : 'Dark board', props: {}, styles: { width: 360, height: 330, position: 'relative', backgroundColor: 'var(--surface-page)', color: 'var(--text-primary)', padding: 'var(--space-padding)', borderRadius: 16 }, theme: { version: 1, bindings: [binding('backgroundColor', tokenId('surface-page')), binding('color', tokenId('text-primary')), binding('padding', tokenId('space-padding'))], localCollectionModes: index ? { 'project-styles': 'dark' } : {} }, canvasPosition: { x: 20 + index * 410, y: 25 } });
  add(id + '-title', id, { type: 'html', tag: 'h2', styles: { fontSize: 26, fontWeight: 600, marginBottom: 20 }, props: {} });
  add(id + '-text', id + '-title', { type: 'text', text: index ? 'Dark workspace' : 'Light workspace' });
}
add('card', 'a', { type: 'html', tag: 'div', name: 'Ocean card', props: {}, styles: { backgroundColor: 'var(--surface-page)', color: 'var(--text-primary)', padding: 24, borderRadius: 10 }, theme: { version: 1, bindings: [binding('backgroundColor', tokenId('surface-page')), binding('color', tokenId('text-primary'))], localCollectionModes: { 'project-styles': 'ocean' } } });
add('card-text', 'card', { type: 'text', text: 'This card keeps its Ocean mode.' });

const extraCount = Number(process.env.PERF_NODES || 5000);
for (const root of ['a','b']) {
  for (let i=0;i<extraCount/2;i++) add(root+'-node-'+i, root, {type:'html',tag:'div',name:'Cell '+i,props:{},styles:{position:'absolute',left:(i%30)*10,top:130+Math.floor(i/30)*8,width:6,height:6,backgroundColor:'var(--surface-page)',color:'var(--text-primary)'}});
}

const moreTokens=Array.from({length:203},(_,i)=>'--bench-'+i+': #123456;').join('');
fs.appendFileSync(cssFile,'\n:root {'+moreTokens+'}\n.dark {'+moreTokens.replaceAll('#123456','#abcdef')+'}');
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
  const output = path.join(repo, 'output/playwright/phase-one/regression');
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window');
    win.setSize(1600, 1000); win.show();
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await invoke(shell, 'project-tabs:open', { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(w => { try { return new URL(w.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-content] [data-element-id=b]")').catch(() => false), 'fixture');
    await waitFor(async () => (await invoke(shell, 'project-tabs:get')).tabs.every(t => t.status === 'idle'), 'compilation');
    editor.focus();
    const key = (keyCode, modifiers = []) => { editor.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); editor.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); };
    const select = async id => { await evaluate(editor, `document.querySelector('[data-canvas-content] [data-element-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}))`); await sleep(200); };
    const toggleCode = async () => {
      const before = await evaluate(editor, 'localStorage.getItem("bingo-editor-mode")||"dev"');
      await evaluate(editor, 'document.activeElement?.blur()'); key('j', ['meta']);
      await waitFor(() => evaluate(editor, `localStorage.getItem('bingo-editor-mode')!==${JSON.stringify(before)}`), 'code mode toggle', 3000);
      await sleep(250);
    };
    if (await evaluate(editor, '(localStorage.getItem("bingo-editor-mode")||"dev")!=="dev"')) await toggleCode();
    await select('a-node-0');
    await waitFor(() => evaluate(editor, '!!document.querySelector(".cm-content")?.cmView?.view'), 'CodeMirror');
    await evaluate(editor, `void(window.__retainedView=document.querySelector('.cm-content').cmView.view)`);
    await toggleCode();
    const button = label => evaluate(editor, `[...document.querySelectorAll('[data-canvas-performance] button')].find(n=>n.textContent.includes(${JSON.stringify(label)})).click()`);
    await button('画布性能');
    const counts = () => evaluate(editor, `Object.fromEntries([...document.querySelectorAll('[data-canvas-performance] tbody tr')].map(r=>[r.firstElementChild.textContent,Number(r.lastElementChild.textContent)]))`);
    await select('a-node-1'); await select('a-node-0'); await sleep(500);
    await evaluate(editor, `(() => {
      const p=window.__stageOneProbe={rect:0,styles:0,observe:0,dispatch:0,active:true};
      const rect=Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect=function(){if(p.active&&this.closest('[data-layer-list]'))p.rect++;return rect.call(this)};
      const style=window.getComputedStyle;
      window.getComputedStyle=function(node,...args){if(p.active&&node.closest?.('[data-layer-list]'))p.styles++;return style.call(this,node,...args)};
      const observe=ResizeObserver.prototype.observe;
      ResizeObserver.prototype.observe=function(node,...args){if(p.active&&node.closest?.('[data-layer-list]'))p.observe++;return observe.call(this,node,...args)};
      const view=window.__retainedView,dispatch=view.dispatch;
      view.dispatch=function(...args){if(p.active)p.dispatch++;return dispatch.apply(this,args)};
    })()`);
    for (let i = 0; i < 6; i++) await select(i % 2 ? 'a-node-0' : 'a-node-1');
    report.selectionProbe = await evaluate(editor, `(()=>{window.__stageOneProbe.active=false;return window.__stageOneProbe})()`);
    check('Stable viewport selection performs no layer layout reads', report.selectionProbe.rect === 0 && report.selectionProbe.styles === 0);
    check('Selection does not recreate layer size observers', report.selectionProbe.observe === 0);
    check('Hidden code editor receives no transactions', report.selectionProbe.dispatch === 0);
    await button('重置'); await sleep(200);
    for (let i = 0; i < 3; i++) await select('a-node-0');
    report.repeatedSelection = await counts();
    check('Repeated selection performs no canvas or code recomputation', Object.values(report.repeatedSelection).every(n => n === 0));
    await toggleCode();
    check('Reopening retains the original editor instance', await evaluate(editor, `document.querySelector('.cm-content').cmView.view===window.__retainedView`));
    await evaluate(editor, `document.querySelector('.cm-content').focus()`); key('a', ['meta']); await editor.insertText('<div'); await sleep(120);
    await toggleCode(); await toggleCode();
    check('Unfinished draft survives hiding', await evaluate(editor, `window.__retainedView.state.doc.toString().trim()==='<div'`));
    await evaluate(editor, `document.querySelector('.cm-content').focus()`); key('z', ['meta']); await sleep(200);
    check('Code undo history survives hiding', await evaluate(editor, `window.__retainedView.state.doc.toString().includes('NewComponent')`));
    await toggleCode(); await select('b-node-7'); await toggleCode();
    check('Reopening refreshes the latest selection', await evaluate(editor, `window.__retainedView.state.doc.toString().includes('"left": 70') && document.querySelector('[data-selection-overlay-id="b-node-7"]')!==null`));
    await toggleCode(); await select('a');
    const mode = async value => { await evaluate(editor, `(()=>{const n=document.querySelector('[aria-label="色彩模式"]');n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(250); };
    await mode('dark'); await button('重置'); await sleep(200);
    for (let i = 0; i < 3; i++) await mode('dark');
    report.repeatedMode = await counts();
    check('Repeated mode assignment performs no recomputation', Object.values(report.repeatedMode).every(n => n === 0));
    await evaluate(editor, 'document.activeElement?.blur()'); key('z', ['meta']); await sleep(350);
    check('No-op mode assignments do not pollute undo history', await evaluate(editor, `getComputedStyle(document.querySelector('[data-canvas-content] [data-element-id=a]')).backgroundColor==='rgb(255, 255, 255)'`));
    await evaluate(editor, `document.querySelector('[title="管理变量"]').click()`);
    await waitFor(() => evaluate(editor, '!!document.querySelector("[role=dialog] table")'), 'variable manager');
    const setInput = (selector, value) => evaluate(editor, `(()=>{const n=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,${JSON.stringify(value)});n.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    const searchSelector = '[role=dialog] input[placeholder]';
    await setInput(searchSelector, 'surface/page'); await sleep(200); key('Escape'); await sleep(200);
    check('Closed manager unmounts variable table', await evaluate(editor, '!document.querySelector("[role=dialog] table")'));
    await evaluate(editor, `document.querySelector('[title="管理变量"]').click()`); await sleep(200);
    check('Manager search survives closing and reopening', await evaluate(editor, `document.querySelector(${JSON.stringify(searchSelector)}).value==='surface/page'`));
    key('Escape'); await sleep(200);
    await select('a-node-1');
    const width = () => evaluate(editor, `parseFloat(document.querySelector('[data-layer-list]').style.minWidth)||0`);
    const originalWidth = await width();
    const rename = async text => { key('F2'); await waitFor(() => evaluate(editor, 'document.activeElement?.matches("[data-layer-list] input")'), 'rename input'); key('a', ['meta']); await editor.insertText(text); key('Enter'); await sleep(300); };
    const longName = 'Long layer label '.repeat(18);
    await rename(longName);
    const expandedWidth = await width();
    check('Long renamed labels expand horizontal scroll width', expandedWidth > originalWidth + 100);
    await rename('Short');
    check('Short renamed labels release excess scroll width', await width() < expandedWidth - 100);
    await select('a');
    const toggleBranch = () => evaluate(editor, `document.querySelector('[data-layer-id="a"] button').click()`);
    await toggleBranch(); await sleep(200);
    check('Collapsing a branch removes its descendant rows', await evaluate(editor, `!document.querySelector('[data-layer-id="a-node-0"]')`));
    await toggleBranch(); await sleep(200);
    check('Expanding restores descendant rows and current names', await evaluate(editor, `document.querySelector('[data-layer-id="a-node-1"] [data-layer-label]')?.textContent==='Short'`));
    key('f', ['meta']);
    await waitFor(() => evaluate(editor, `document.activeElement?.matches('input[placeholder]')`), 'layer search focus', 3000);
    await editor.insertText('Short'); await sleep(250);
    check('Layer search indexes the renamed label', await evaluate(editor, `document.querySelectorAll('[data-layer-id]').length===1 && !!document.querySelector('[data-layer-id="a-node-1"]')`));
    key('Escape'); await evaluate(editor, 'document.activeElement?.blur()'); await sleep(200);
    const lastId = 'b-node-' + (extraCount / 2 - 1);
    await select(lastId);
    await waitFor(() => evaluate(editor, `!!document.querySelector('[data-layer-id="${lastId}"]')`), 'virtualized selection reveal');
    check('Offscreen selected layer is revealed in the virtualized list', await evaluate(editor, `(()=>{const row=document.querySelector('[data-layer-id="${lastId}"]'),r=row.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight})()`));
    report.unexpectedErrors = [...new Set(report.errors)].filter(message => !/fonts\.gstatic\.com|Request Autofill\.|Failed to parse JSX: SyntaxError: Unexpected token/.test(message));
    check('No unexpected renderer errors', report.unexpectedErrors.length === 0);
    report.nodes = Object.keys(elements.byId).length;
    report.done = true;
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'editor.png'), (await editor.capturePage()).toPNG());
    write(path.join(output, 'report.json'), report);
    console.log(JSON.stringify({ evidence: output, checks: report.checks.length, selectionProbe: report.selectionProbe }));
    app.exit(0);
  } catch (error) {
    fs.mkdirSync(output, { recursive: true });
    if (editor) { fs.writeFileSync(path.join(output, 'failure.png'), (await editor.capturePage()).toPNG()); report.body = await evaluate(editor, 'document.body.innerText'); }
    report.failure = String(error.stack || error); write(path.join(output, 'report.json'), report);
    console.error(qa, report.failure); app.exit(1);
  }
});
