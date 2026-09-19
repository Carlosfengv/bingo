/* Stage-two performance invariants and editing regressions, in an isolated project.
 * Run: pnpm build && pnpm exec electron tools/test-canvas-cache-components.cjs
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

const extraCount = Number(process.env.PERF_NODES || 0);
for (const root of ['a','b']) {
  for (let i=0;i<extraCount/2;i++) add(root+'-node-'+i, root, {type:'html',tag:'div',name:'Cell '+i,props:{},styles:{position:'absolute',left:(i%30)*10,top:130+Math.floor(i/30)*8,width:6,height:6,backgroundColor:'var(--surface-page)',color:'var(--text-primary)'}});
}

const moreTokens=Array.from({length:203},(_,i)=>'--bench-'+i+': #123456;').join('');
fs.appendFileSync(cssFile,'\n:root {'+moreTokens+'}\n.dark {'+moreTokens.replaceAll('#123456','#abcdef')+'}');
add('a-flow', 'a', { type: 'html', tag: 'div', props: {}, styles: { width: 60, height: 'var(--space-padding)', backgroundColor: 'var(--surface-page)' } });
add('a-following', 'a', { type: 'html', tag: 'div', props: {}, styles: { width: 60, height: 20, backgroundColor: 'var(--surface-page)' } });
add('b-input', 'b', { type: 'html', tag: 'input', props: { defaultValue: 'Keep me' }, styles: { width: 80, height: 20 } });
const componentFile = path.join(project, 'src/Probe.tsx');
const componentSource = `import * as React from 'react';
export function Stateful() { const [count,setCount]=React.useState(0); return <button data-stateful onClick={()=>setCount(count+1)} style={{height:40,color:'var(--text-primary)'}}>Clicks {count}</button> }
export function Slot({asChild,children,...props}) { return asChild ? React.cloneElement(React.Children.only(children), {...props,'data-slot-probe':'yes'}) : <div {...props}>{children}</div> }
`;
write(componentFile, componentSource);
add('stateful', 'b', { type: 'component', componentName: 'Stateful', props: {}, styles: {} });
add('slot', 'a', { type: 'component', componentName: 'Slot', props: {asChild:true}, styles: {color:'var(--text-primary)'} });
add('slot-child', 'slot', { type: 'html', tag: 'span', props: {title:'slot child'}, styles: {} });
add('slot-text', 'slot-child', { type: 'text', text:'Slot content' });
add('svg', 'a', { type: 'html', tag: 'svg', props: {viewBox:'0 0 10 10'}, styles: {width:20,height:20} });
add('circle', 'svg', { type: 'html', tag: 'circle', props: {cx:5,cy:5,r:4}, styles: {fill:'var(--text-primary)'} });
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
  const output = path.join(repo, 'output/playwright/phase-two/components');
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window');
    win.setSize(1600,1000);win.show();
    const shell=win.webContents;
    await waitFor(()=>evaluate(shell,'!!document.querySelector(".project-titlebar")').catch(()=>false),'shell');
    await invoke(shell,'project-tabs:open',{projectId:project});
    editor=await waitFor(()=>webContents.getAllWebContents().find(w=>{try{return new URL(w.getURL()).searchParams.get('projectTab')===project}catch{return false}}),'editor');
    await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-stateful]")').catch(()=>false),'compiled stateful component');
    await waitFor(async()=>(await invoke(shell,'project-tabs:get')).tabs.every(t=>t.status==='idle'),'compilation');
    await sleep(1500);
    const select = async id => { await evaluate(editor, `document.querySelector('[data-canvas-content] [data-element-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}))`);await sleep(180); };
    const mode = async value => { await evaluate(editor, `(()=>{const n=document.querySelector('[aria-label="色彩模式"]');n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}))})()`);await sleep(250); };
    check('asChild receives the actual HTML child type',await evaluate(editor,`document.querySelector('[data-slot-probe]')?.tagName==='SPAN' && document.querySelector('[data-slot-probe]').textContent==='Slot content'`));
    check('SVG descendants retain their namespace',await evaluate(editor,`document.querySelector('[data-element-id="circle"]').namespaceURI==='http://www.w3.org/2000/svg'`));
    await evaluate(editor,`(()=>{document.querySelector('[data-stateful]').click();window.__stateful=document.querySelector('[data-stateful]');window.__svg=document.querySelector('[data-element-id="svg"]');})()`);
    await waitFor(()=>evaluate(editor,`document.querySelector('[data-stateful]').textContent==='Clicks 1'`),'local component state');
    await select('a'); await mode('dark');
    check('An unrelated scope edit retains component state and DOM identity',await evaluate(editor,`document.querySelector('[data-stateful]')===window.__stateful&&document.querySelector('[data-stateful]').textContent==='Clicks 1'`));
    check('A cached SVG inherits new scope colors',await evaluate(editor,`document.querySelector('[data-element-id="svg"]')===window.__svg&&getComputedStyle(document.querySelector('[data-element-id="circle"]')).fill==='rgb(249, 250, 251)'`));
    await select('b'); await mode('light');
    check('Updating the component scope preserves its internal state',await evaluate(editor,`document.querySelector('[data-stateful]').textContent==='Clicks 1'&&getComputedStyle(document.querySelector('[data-stateful]')).color==='rgb(17, 24, 39)'`));
    await select('a');await mode('light');
    check('asChild remains intact after cached scope updates',await evaluate(editor,`document.querySelector('[data-slot-probe]')?.tagName==='SPAN'&&getComputedStyle(document.querySelector('[data-slot-probe]')).color==='rgb(17, 24, 39)'`));
    await select('stateful');
    fs.writeFileSync(componentFile,componentSource.replace('Clicks','Updated').replace('height:40','height:80'));
    await waitFor(()=>evaluate(editor,`document.querySelector('[data-stateful]')?.textContent.startsWith('Updated')`),'component hot reload');
    await sleep(500);
    check('Component revisions replace the cached runtime result',await evaluate(editor,`document.querySelector('[data-stateful]').getBoundingClientRect().height===80`));
    check('Component runtime size changes refresh selection geometry',await evaluate(editor,`(()=>{const a=document.querySelector('[data-stateful]').getBoundingClientRect(),b=document.querySelector('[data-selection-overlay-id="stateful"]').getBoundingClientRect();return Math.abs(a.top-b.top)<2&&Math.abs(a.height-b.height)<2})()`));
    report.unexpectedErrors=[...new Set(report.errors)].filter(message=>!/fonts\.gstatic\.com|Request Autofill\./.test(message));
    check('No unexpected renderer errors',report.unexpectedErrors.length===0);
    report.done=true;fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'editor.png'),(await editor.capturePage()).toPNG());write(path.join(output,'report.json'),report);
    console.log(JSON.stringify({evidence:output,checks:report.checks.length}));app.exit(0);
  }catch(error){fs.mkdirSync(output,{recursive:true});if(editor){fs.writeFileSync(path.join(output,'failure.png'),(await editor.capturePage()).toPNG());report.body=await evaluate(editor,'document.body.innerText');}report.failure=String(error.stack||error);write(path.join(output,'report.json'),report);console.error(report.failure);app.exit(1)}
});
