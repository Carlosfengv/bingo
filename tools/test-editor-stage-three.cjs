/* Stage-two performance invariants and editing regressions, in an isolated project.
 * Run: pnpm build && pnpm exec electron tools/test-editor-stage-two.cjs
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
add('a-flow', 'a', { type: 'html', tag: 'div', props: {}, styles: { width: 60, height: 'var(--space-padding)', backgroundColor: 'var(--surface-page)' } });
add('a-following', 'a', { type: 'html', tag: 'div', props: {}, styles: { width: 60, height: 20, backgroundColor: 'var(--surface-page)' } });
add('b-input', 'b', { type: 'html', tag: 'input', props: { defaultValue: 'Keep me' }, styles: { width: 80, height: 20 } });
const pageId = crypto.randomUUID();

const pageFile = path.join(project, '.bingo/design/pages', pageId + '.json');
write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion: 1, documentId: crypto.randomUUID(), pages: [{ id: pageId }] });
write(pageFile, { schemaVersion: 1, id: pageId, name: 'Variable fixture', canvas: { elements, zoom: 1, pan: { x: 30, y: 50 } }, newClasses: [] });
const report = { directory: qa, checks: [], errors: [] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, script) => {wc.setBackgroundThrottling(false);return wc.executeJavaScript(script, true)};
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const check = (label, value) => { assert.ok(value, label); report.checks.push(label); console.log('PASS', label); };
async function waitFor(fn, label, timeout = 45000) { const start = Date.now(); while (Date.now() - start < timeout) { const value = await fn(); if (value) return value; await sleep(120); } throw Error('Timed out: ' + label); }
app.on('web-contents-created', (_e, wc) => wc.on('console-message', (_event, level, message) => { if (level >= 3) report.errors.push(message); }));
require(path.join(repo, 'out/main/index.js'));
setTimeout(() => { console.error('Variable QA timeout', qa); app.exit(1); }, 180000).unref();
app.whenReady().then(async () => {
  let editor;
  const output = path.join(repo, 'output/playwright/phase-three/regression');
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window');
    win.setSize(1600, 1000); win.show();
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await invoke(shell, 'project-tabs:open', { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(w => { try { return new URL(w.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await require('./editor-test-foreground.cjs').foregroundEditor(editor);
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-content] [data-element-id=b]")').catch(() => false), 'fixture');
    await waitFor(async () => (await invoke(shell, 'project-tabs:get')).tabs.every(t => t.status === 'idle'), 'compilation');
    const key = (keyCode, modifiers = []) => { editor.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); editor.sendInputEvent({ type: 'keyUp', keyCode, modifiers }); };
    if (await evaluate(editor, 'localStorage.getItem("bingo-editor-mode")!=="design"')) key('j', ['meta']);
    await sleep(800);
    const select = async id => { await evaluate(editor, `document.querySelector('[data-canvas-content] [data-element-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}))`); await sleep(180); };
    const button = label => evaluate(editor, `[...document.querySelectorAll('[data-canvas-performance] button')].find(n=>n.textContent.includes(${JSON.stringify(label)})).click()`);
    await button('画布性能');
    const counts = async () => { await sleep(550); return evaluate(editor, `Object.fromEntries([...document.querySelectorAll('[data-canvas-performance] tbody tr')].map(r=>[r.firstElementChild.textContent,Number(r.lastElementChild.textContent)]))`); };
    const reset = async () => { await sleep(200); await button('重置'); await sleep(100); };
    const mode = async value => { await evaluate(editor, `(()=>{const n=document.querySelector('[aria-label="色彩模式"]');n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(250); };
    const color = id => evaluate(editor, `getComputedStyle(document.querySelector('[data-canvas-content] [data-element-id="${id}"]')).backgroundColor`);
    // Let the first design persistence / generated stylesheet build settle;
    // the measured mode operations then run against an unchanged stylesheet.
    await select('a'); await mode('dark'); await mode('light'); await sleep(2000);
    await waitFor(async () => (await invoke(shell, 'project-tabs:get')).tabs.every(t => t.status === 'idle'), 'initial design compilation');
    await reset();
    for (let i = 0; i < 6; i++) await select(i % 2 ? 'a' : 'card');
    report.nested = await counts();
    check('Nested selection builds zero visual nodes', report.nested['节点构建'] === 0 && report.nested['根元素树构建'] === 0);
    await evaluate(editor, `(()=>{window.__unmodifiedRoot=document.querySelector('[data-canvas-content] [data-element-id="b"]');window.__child=document.querySelector('[data-canvas-content] [data-element-id="a-node-3"]');document.querySelector('[data-element-id="b-input"]').value='Unsaved local input'})()`);
    await reset();
    await evaluate(editor, `(()=>{window.__scrollStyleWrites=0;window.__scrollStyleObserver=new MutationObserver(records=>{for(const record of records)if(record.target.nodeName==='STYLE'&&record.target.textContent.includes('[data-radix-scroll-area-viewport]'))window.__scrollStyleWrites++});window.__scrollStyleObserver.observe(document.documentElement,{subtree:true,childList:true,characterData:true})})()`);
    for (let i = 0; i < 6; i++) await mode(i % 2 ? 'light' : 'dark');
    check('Mode changes do not rewrite unchanged scroll-area stylesheets', await evaluate(editor, `(()=>{window.__scrollStyleObserver.disconnect();return window.__scrollStyleWrites===0})()`));
    report.colorMode = await counts();
    check('Color mode updates exactly one scope node per operation', report.colorMode['节点构建'] === 6 && report.colorMode['根元素树构建'] === 6);
    check('CSS source colors do not trigger full geometry refresh', report.colorMode['元素盒测量'] <= 12);
    check('Unused library tokens are omitted from native canvas scopes', await evaluate(editor, `!document.querySelector('[data-canvas-content] [data-element-id="a"]').style.getPropertyValue('--bench-0')`));
    await evaluate(editor, `(()=>{const style=document.createElement('style');style.id='new-consumer';style.textContent='[data-element-id="a"] {outline-color:var(--bench-0)}';document.head.append(style);window.dispatchEvent(new Event('bingo-css-updated'))})()`);
    await sleep(300);
    check('Applied CSS consumers restore previously unused scope declarations', await evaluate(editor, `!!document.querySelector('[data-canvas-content] [data-element-id="a"]').style.getPropertyValue('--bench-0')`));
    await evaluate(editor, `document.querySelector('#new-consumer').remove();window.dispatchEvent(new Event('bingo-css-updated'))`);
    await sleep(300);
    check('Removing a CSS consumer releases its declaration again', await evaluate(editor, `!document.querySelector('[data-canvas-content] [data-element-id="a"]').style.getPropertyValue('--bench-0')`));
    check('Unchanged root and child retain DOM identity and local input state', await evaluate(editor, `document.querySelector('[data-canvas-content] [data-element-id="b"]')===window.__unmodifiedRoot && document.querySelector('[data-canvas-content] [data-element-id="a-node-3"]')===window.__child && document.querySelector('[data-element-id="b-input"]').value==='Unsaved local input'`));
    check('Nested override survives ancestor mode changes', await color('card') === 'rgb(6, 41, 59)');
    await select('card'); await reset(); await mode('dark');
    report.nestedScope = await counts();
    check('Nested mode rebuilds only its node and ancestor path', report.nestedScope['节点构建'] === 2 && report.nestedScope['根元素树构建'] === 1);
    check('Nested mode changes only that scope', await color('card') === 'rgb(17, 24, 39)' && await color('a') === 'rgb(255, 255, 255)');
    await select('a-node-3');
    await evaluate(editor, 'document.activeElement?.blur()'); key('Backspace');
    await waitFor(() => evaluate(editor, `!document.querySelector('[data-canvas-content] [data-element-id="a-node-3"]')`), 'delete child');
    check('Deleting invalidates the parent subtree', true);
    key('z', ['meta']);
    await waitFor(() => evaluate(editor, `!!document.querySelector('[data-canvas-content] [data-element-id="a-node-3"]')`), 'undo deletion');
    check('Undo deletion restores the current child', true);
    await select('a');
    await evaluate(editor, `(()=>{const style=document.createElement('style');style.id='stage-two-css';style.textContent='[data-element-id="a"] {color:var(--surface-page)}';document.head.append(style)})()`);
    // An arbitrary stylesheet edit gets one conservative refresh. Subsequent
    // color changes may use the proof derived from the new stylesheet.
    await mode('dark'); await mode('light');
    await reset(); await mode('dark');
    check('A loaded paint-only CSS rule retains the fast path', (await counts())['元素盒测量'] <= 2);
    await evaluate(editor, `document.querySelector('#stage-two-css').sheet.insertRule('[data-element-id="a"] { --through-css:var(--surface-page); width:var(--through-css) }',1)`);
    await reset(); await mode('light');
    report.cssomLayout = await counts();
    check('CSSOM insertion of an indirect layout consumer invalidates cached safety', report.cssomLayout['元素盒测量'] >= Object.keys(elements.byId).length);
    await evaluate(editor, `document.querySelector('#stage-two-css').sheet.deleteRule(1)`);
    await mode('dark'); await mode('light');
    await reset(); await mode('dark');
    check('Removing the CSSOM layout consumer restores the proven paint path', (await counts())['元素盒测量'] <= 2);
    await evaluate(editor, `document.querySelector('#stage-two-css').remove()`);
    await mode('light');
    // Real layout change: different padding and a flow child height, with an
    // unchanged following sibling whose position still needs fresh geometry.
    fs.writeFileSync(cssFile, fs.readFileSync(cssFile, 'utf8').replace('.dark { --surface-page: #111827; --text-primary: #F9FAFB; --space-padding: 24px;', '.dark { --surface-page: #111827; --text-primary: #F9FAFB; --space-padding: 12px;'));
    await waitFor(async () => JSON.stringify(await invoke(editor, 'bingo:store', { op: 'read-variable-library', root: project })).includes('12px'), 'layout token file reload');
    await sleep(800);
    const top = () => evaluate(editor, `document.querySelector('[data-canvas-content] [data-element-id="a-following"]').getBoundingClientRect().top`);
    const beforeTop = await top();
    await reset(); await mode('dark');
    report.layoutMode = await counts();
    check('A numeric mode change measures its root and flow siblings without scanning the other board', report.layoutMode['元素盒测量'] >= 2500 && report.layoutMode['元素盒测量'] < 3000);
    check('Flow sibling position follows changed padding and child height', Math.abs(await top() - beforeTop) > 10);
    await select('a-following');
    check('Selection overlay matches the moved flow sibling', await evaluate(editor, `(()=>{const a=document.querySelector('[data-canvas-content] [data-element-id="a-following"]').getBoundingClientRect(),b=document.querySelector('[data-selection-overlay-id="a-following"]').getBoundingClientRect();return Math.abs(a.left-b.left)<2&&Math.abs(a.top-b.top)<2&&Math.abs(a.width-b.width)<2&&Math.abs(a.height-b.height)<2})()`));
    await evaluate(editor, `(()=>{const style=document.createElement('style');style.textContent='[data-element-id="a-following"] { transform:translateY(17px) }';document.head.append(style);window.dispatchEvent(new Event('bingo-css-updated'))})()`);
    await sleep(300);
    check('An applied CSS update refreshes positions even without a size change', await evaluate(editor, `(()=>{const a=document.querySelector('[data-canvas-content] [data-element-id="a-following"]').getBoundingClientRect(),b=document.querySelector('[data-selection-overlay-id="a-following"]').getBoundingClientRect();return Math.abs(a.top-b.top)<2})()`));
    await reset(); await evaluate(editor, `window.dispatchEvent(new Event('bingo-css-updated'))`);
    report.repeatedCss = await counts();
    check('Repeated identical CSS notifications do not rebuild or remeasure the canvas', report.repeatedCss['节点构建'] === 0 && report.repeatedCss['元素盒测量'] === 0);
    report.unexpectedErrors = [...new Set(report.errors)].filter(message => !/fonts\.gstatic\.com|Request Autofill\./.test(message));
    check('No unexpected renderer errors', report.unexpectedErrors.length === 0);
    report.nodes = Object.keys(elements.byId).length; report.done = true;
    fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(output, 'editor.png'), (await editor.capturePage()).toPNG());
    write(path.join(output, 'report.json'), report);
    console.log(JSON.stringify({ evidence: output, checks: report.checks.length, colorMode: report.colorMode })); app.exit(0);
  } catch (error) {
    fs.mkdirSync(output, { recursive: true });
    console.error(error.stack);if(editor){try{fs.writeFileSync(path.join(output,'failure.png'),(await editor.capturePage()).toPNG())}catch{} report.body=await evaluate(editor,'document.body.innerText');}
    report.failure = String(error.stack || error); write(path.join(output, 'report.json'), report); console.error(qa, report.failure); app.exit(1);
  }
});
