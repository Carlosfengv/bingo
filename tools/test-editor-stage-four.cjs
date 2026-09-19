/* Stage four: real editor persistence races, close/reopen, and draft protection. */
const { app, BrowserWindow, webContents, ipcMain } = require('electron');
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
const secondPageId = crypto.randomUUID();
const secondPageFile = path.join(project, ".bingo/design/pages", secondPageId + ".json");
write(secondPageFile,{schemaVersion:1,id:secondPageId,name:"Second page",canvas:{elements:[{id:"other",type:"html",tag:"div",styles:{width:100,height:100,backgroundColor:"red"}}]},newClasses:[]});

const pageFile = path.join(project, '.bingo/design/pages', pageId + '.json');
write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion: 1, documentId: crypto.randomUUID(), pages: [{ id: pageId }, { id: secondPageId }] });
write(pageFile, { schemaVersion: 1, id: pageId, name: 'Variable fixture', canvas: { elements, zoom: 1, pan: { x: 30, y: 50 } }, newClasses: [] });
const report = { directory: qa, checks: [], errors: [] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, script) => {wc.setBackgroundThrottling(false);return wc.executeJavaScript(script, true)};
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const check = (label, value) => { assert.ok(value, label); report.checks.push(label); console.log('PASS', label); };
async function waitFor(fn, label, timeout = 45000) { const start = Date.now(); while (Date.now() - start < timeout) { const value = await fn(); if (value) return value; await sleep(120); } throw Error('Timed out: ' + label); }
app.on('web-contents-created', (_e, wc) => wc.on('console-message', (_event, level, message) => { if (level >= 3) report.errors.push(message); }));
require(path.join(repo, 'out/main/index.js'));
setTimeout(() => { console.error('Variable QA timeout', qa); app.exit(1); }, 240000).unref();
let holdSave=null, saveEntered=false, failSave=false;
const saves=[];
app.whenReady().then(async () => {
  let editor;
  const output = path.join(repo, 'output/playwright/phase-four/regression');
  try {
    const original=await waitFor(()=>ipcMain._invokeHandlers.get('bingo:store'),'store handler');
    ipcMain.removeHandler('bingo:store');
    ipcMain.handle('bingo:store',async(event,args)=>{if(args.op==='save-canvas'){saves.push(structuredClone(args));if(holdSave){const held=holdSave;holdSave=null;saveEntered=true;await held;}if(failSave){failSave=false;throw Error('Injected disk failure');}}return original(event,args)});
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
    const installProbe = () => evaluate(editor, `(()=>{
      window.__propsFor=name=>{const node=document.querySelector('[data-canvas-content]');let fiber=node[Object.keys(node).find(key=>key.startsWith('__reactFiber'))];while(fiber.return)fiber=fiber.return;const pending=[fiber.stateNode.current];while(pending.length){const f=pending.pop();if((f.type?.name||f.type?.render?.name||f.type?.type?.name)===name)return f.memoizedProps;if(f.sibling)pending.push(f.sibling);if(f.child)pending.push(f.child)}throw Error('Missing component '+name)};
      window.__serializeCount=0;const stringify=JSON.stringify;JSON.stringify=function(value,...args){if(value?.schemaVersion===2&&value.byId)window.__serializeCount++;return stringify.call(this,value,...args)};
      window.__flush=()=>{window.__flushResult=null;const pending=[];window.dispatchEvent(new CustomEvent('bingo:prepare-project-close',{detail:{pending}}));Promise.all(pending).then(()=>window.__flushResult='ok',error=>window.__flushResult=String(error.message))};
    })()`);
    const persisted = () => JSON.parse(fs.readFileSync(pageFile,'utf8'));
    const persistedMode = () => persisted().canvas.elements.byId.a.theme.localCollectionModes['project-styles'];
    const flush = async () => {await evaluate(editor,'window.__flush()');return waitFor(()=>evaluate(editor,'window.__flushResult'),'flush result')};
    const quickMode = value => evaluate(editor, `(()=>{const n=document.querySelector('[aria-label="色彩模式"]');n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await select('a'); await mode('dark'); await mode('light'); await sleep(1800);
    await installProbe();
    const beforeBurst=saves.length;
    for(let i=0;i<15;i++){await quickMode(i%2?'light':'dark');await sleep(25)}
    check('Rapid mode changes do not serialize the document on the input path',await evaluate(editor,'window.__serializeCount===0'));
    check('Rapid mode changes do not start a write until the debounce expires',saves.length===beforeBurst);
    await waitFor(()=>persistedMode()==='dark'&&saves.length>beforeBurst,'debounced save');
    check('The burst is coalesced into one save of the latest document',saves.length===beforeBurst+1);
    report.burstSerializations=await evaluate(editor,'window.__serializeCount');
    check('Only the final snapshot is serialized',report.burstSerializations===1);

    let release;holdSave=new Promise(resolve=>release=resolve);saveEntered=false;
    await quickMode('light');await waitFor(()=>saveEntered,'slow save starts');
    await quickMode('dark');
    await evaluate(editor, `window.__propsFor('PagesPanel').onRenamePage(${JSON.stringify(pageId)},'Renamed during save')`);
    await evaluate(editor,'document.activeElement?.blur()');key('Escape');await sleep(100);
    await evaluate(editor, `window.__propsFor('PagePanel').onChangeBackground('#abcdef',undefined)`);
    await evaluate(editor,'window.__flush()');await sleep(150);
    check('Close preparation waits for an in-flight save',await evaluate(editor,'window.__flushResult===null'));
    const savedBeforeRelease=saves.length;release();
    await waitFor(()=>evaluate(editor,'window.__flushResult'),'queued saves flush');
    check('Newer content, page name and background survive the older save',persistedMode()==='dark'&&persisted().name==='Renamed during save'&&persisted().canvas.backgroundColor==='#abcdef');
    check('Writes for one page are serialized and coalesce all pending edits',saves.length===savedBeforeRelease+1);

    await select('a');await quickMode('light');failSave=true;
    check('A failed save rejects close preparation',String(await flush()).includes('Injected disk failure'));
    check('Failed data remains retryable without another edit',await flush()==='ok'&&persistedMode()==='light');
    await evaluate(editor,'document.activeElement?.blur()');key('z',['meta']);await sleep(100);
    check('Undo is flushed as the current document',await flush()==='ok'&&persistedMode()==='dark');
    key('z',['meta','shift']);await sleep(100);
    check('Redo is flushed as the current document',await flush()==='ok'&&persistedMode()==='light');

    // Drive CodeMirror itself; the fixture hook only opens a file using the
    // same Canvas callback as the normal source action.
    key('j',['meta']);await sleep(250);
    await evaluate(editor, `window.__propsFor('Canvas').onOpenFile('src/App.tsx')`);
    await waitFor(()=>evaluate(editor,"document.querySelector('.cm-content')?.cmView?.view?.state.doc.toString().includes('Variables QA')"),'source file');
    const editCode = value => evaluate(editor, `(()=>{const view=document.querySelector('.cm-content').cmView.view;view.dispatch({changes:{from:0,to:view.state.doc.length,insert:${JSON.stringify(value)}}})})()`);
    const firstCode='export default function App(){return <div>Saved first</div>}';
    const secondCode='export default function App(){return <div>Newest draft</div>}';
    // Delay the file write independently from page writes.
    const wrapped=ipcMain._invokeHandlers.get('bingo:store');let releaseFile, fileEntered=false;
    const fileGate=new Promise(resolve=>releaseFile=resolve);
    ipcMain.removeHandler('bingo:store');
    ipcMain.handle('bingo:store',async(event,args)=>{if(args.op==='write-file'&&!fileEntered){fileEntered=true;await fileGate}return wrapped(event,args)});
    await editCode(firstCode);await sleep(50);
    await evaluate(editor,"[...document.querySelectorAll('button')].find(n=>n.getAttribute('aria-label')==='保存文件').click()");
    await waitFor(()=>fileEntered,'file save starts');
    await editCode(secondCode);await sleep(50);releaseFile();
    await waitFor(()=>fs.readFileSync(path.join(project,'src/App.tsx'),'utf8')===firstCode,'first file saved');
    await sleep(250);
    check('A completed file save preserves text typed while it was in flight',await evaluate(editor,`document.querySelector('.cm-content').cmView.view.state.doc.toString()===${JSON.stringify(secondCode)}`));
    ipcMain.removeHandler('bingo:store');ipcMain.handle('bingo:store',wrapped);
    let releaseClosingFile,closingFileEntered=false;
    const closingFileGate=new Promise(resolve=>releaseClosingFile=resolve);
    ipcMain.removeHandler('bingo:store');
    ipcMain.handle('bingo:store',async(event,args)=>{if(args.op==='write-file'&&!closingFileEntered){closingFileEntered=true;await closingFileGate}return wrapped(event,args)});
    await evaluate(editor,'window.__flush()');
    await waitFor(()=>closingFileEntered,'close waits for source save');
    let finalCode='export default function App(){return <div>Typed while closing</div>}';
    await editCode(finalCode);await sleep(50);
    check('Project close keeps waiting while the source write is in flight',await evaluate(editor,'window.__flushResult===null'));
    releaseClosingFile();
    check('Project close flushes text typed during its source save',await waitFor(()=>evaluate(editor,'window.__flushResult'),'close source result')==='ok'&&fs.readFileSync(path.join(project,'src/App.tsx'),'utf8')===finalCode);
    ipcMain.removeHandler('bingo:store');ipcMain.handle('bingo:store',wrapped);

    let releaseTabFile,tabFileEntered=false;
    const tabFileGate=new Promise(resolve=>releaseTabFile=resolve);
    ipcMain.removeHandler('bingo:store');
    ipcMain.handle('bingo:store',async(event,args)=>{if(args.op==='write-file'&&!tabFileEntered){tabFileEntered=true;await tabFileGate}return wrapped(event,args)});
    await editCode('export default function App(){return <div>Closing source tab</div>}');await sleep(50);
    await evaluate(editor,'document.querySelector("[aria-label=\\"Close App.tsx\\"]").click()');
    await waitFor(()=>tabFileEntered,'source tab save');
    finalCode='export default function App(){return <div>Latest source tab text</div>}';
    await editCode(finalCode);await sleep(50);
    check('Source tab stays open until its save completes',await evaluate(editor,'!!document.querySelector("[aria-label=\\"Close App.tsx\\"]")'));
    releaseTabFile();
    await waitFor(()=>evaluate(editor,'!document.querySelector("[aria-label=\\"Close App.tsx\\"]")'),'source tab closed');
    check('Source tab close preserves text typed during its save',fs.readFileSync(path.join(project,'src/App.tsx'),'utf8')===finalCode);
    ipcMain.removeHandler('bingo:store');ipcMain.handle('bingo:store',wrapped);
    await select('a-node-3');await sleep(150);
    await editCode('<div');await sleep(50);
    check('An invalid unapplied JSX draft blocks closing instead of being lost',String(await flush()).includes('未应用'));
    await evaluate(editor,`document.querySelector('[aria-label="重置更改"]').click()`);await sleep(50);
    check('Resetting the JSX draft permits closing',await flush()==='ok');

    // A stale JSX timer cannot apply after the selection changes; its draft
    // remains available when returning to that exact page and element.
    const pendingJsx='<div data-stale-preview="yes" style={{width:99,height:20}} />';
    await editCode(pendingJsx);await sleep(30);await select('a');await sleep(350);
    check('A delayed JSX preview cannot land on a newer selection',await evaluate(editor,'!document.querySelector("[data-stale-preview]")'));
    await select('a-node-3');await sleep(80);
    check('Changing selection retains its unapplied draft',await evaluate(editor,`document.querySelector('.cm-content').cmView.view.state.doc.toString()===${JSON.stringify(pendingJsx)}`));
    // Change the real document while the draft remains open. Applying it must
    // not silently replace those newer changes.
    await quickMode('dark');await sleep(50);
    await evaluate(editor,`document.querySelector('[aria-label="将 JSX 应用到画布"]').click()`);
    check('A draft based on an older document is rejected',await evaluate(editor,'document.body.innerText.includes("编辑草稿期间画布已发生变化")&&!document.querySelector("[data-stale-preview]")'));
    await evaluate(editor,`document.querySelector('[aria-label="重置更改"]').click()`);await sleep(50);

    const beforeLoadHandler=ipcMain._invokeHandlers.get('bingo:store');let releaseLoad,loadEntered=false;
    const loadGate=new Promise(resolve=>releaseLoad=resolve);
    ipcMain.removeHandler('bingo:store');ipcMain.handle('bingo:store',async(event,args)=>{if(args.op==='load-canvas'&&args.pageId===secondPageId&&!loadEntered){loadEntered=true;await loadGate}return beforeLoadHandler(event,args)});
    await evaluate(editor,`void window.__propsFor('PagesPanel').onSelectPage(${JSON.stringify(secondPageId)})`);
    await waitFor(()=>loadEntered,'second page loading');
    await evaluate(editor,`void window.__propsFor('PagesPanel').onSelectPage(${JSON.stringify(pageId)})`);
    releaseLoad();await sleep(200);
    check('A slow page load cannot replace the page selected later',await evaluate(editor,`window.__propsFor('PagesPanel').activePageId===${JSON.stringify(pageId)}&&!window.__propsFor('PagesPanel').isPageLoading`));
    await evaluate(editor,`window.__propsFor('PagesPanel').onSelectPage(${JSON.stringify(secondPageId)})`);await sleep(120);
    await evaluate(editor,`window.__propsFor('Canvas').onAddElement({id:'added-on-second',type:'html',tag:'div',styles:{width:30,height:30}})`);await sleep(50);
    await evaluate(editor,`window.__propsFor('PagesPanel').onSelectPage(${JSON.stringify(pageId)})`);await sleep(100);
    check('Switching pages before debounce still flushes the inactive page',await flush()==='ok'&&!!JSON.parse(fs.readFileSync(secondPageFile,'utf8')).canvas.elements.byId['added-on-second']);
    ipcMain.removeHandler('bingo:store');ipcMain.handle('bingo:store',beforeLoadHandler);
    await select('a');await quickMode('dark');
    // Close before the debounce; this must flush without relying on idle time.
    await invoke(shell,'project-tabs:close',{projectId:project});
    await waitFor(()=>!webContents.getAllWebContents().some(w=>!w.isDestroyed()&&w.getURL().includes('projectTab=')),'project closed');
    check('Immediate project close saves the latest mode',persistedMode()==='dark');
    await invoke(shell,'project-tabs:open',{projectId:project});
    editor=await waitFor(()=>webContents.getAllWebContents().find(w=>{try{return new URL(w.getURL()).searchParams.get('projectTab')===project}catch{return false}}),'reopened editor');
    await require('./editor-test-foreground.cjs').foregroundEditor(editor);
    await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-canvas-content] [data-element-id=a]")').catch(()=>false),'reopened canvas');
    await waitFor(()=>evaluate(editor,'(()=>{const canvas=document.querySelector("[data-canvas-content]");return canvas&&canvas.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})})()'),'reopened canvas visible');
    await evaluate(editor,'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    check('Reopening restores the last saved color',await color('a')==='rgb(17, 24, 39)');
    check('Reopening retains page metadata and source content',persisted().name==='Renamed during save'&&persisted().canvas.backgroundColor==='#abcdef'&&fs.readFileSync(path.join(project,'src/App.tsx'),'utf8')===finalCode);
    report.unexpectedErrors=[...new Set(report.errors)].filter(message=>!/fonts\.gstatic\.com|Request Autofill\.|Failed to parse JSX: SyntaxError: Unexpected token \(1:35\)/.test(message));
    check('No unexpected renderer errors',report.unexpectedErrors.length===0);
    report.done=true;report.saveCount=saves.length;
    write(path.join(output,'report.json'),report);
    fs.writeFileSync(path.join(output,'editor.png'),(await editor.capturePage()).toPNG());
    console.log(JSON.stringify({checks:report.checks.length,evidence:output}));app.exit(0);
  }catch(error){console.error(error.stack);report.failure=String(error.stack);write(path.join(output,'report.json'),report);app.exit(1)}
});
