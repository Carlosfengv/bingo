/* Native Electron integration test. Run after pnpm build:
 * pnpm exec electron tools/test-project-tabs.cjs
 * Uses temporary projects and an isolated application data directory. No AI
 * requests are sent. Native confirmations are stubbed to test cancel/failure.
 */
const { app, BrowserWindow, webContents, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const qa = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'bingo-project-tabs-test-'));
const data = path.join(qa, 'data');
app.commandLine.appendSwitch('user-data-dir', data);
fs.mkdirSync(data, { recursive: true });
const projectIds = ['marketing', 'components', 'mobile'].map(name => path.join(fs.realpathSync(qa), name));
const names = ['营销官网', '组件库', '移动端'];
for (let index = 0; index < projectIds.length; index++) {
  const dir = projectIds[index];
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({name: path.basename(dir), version:'1.0.0',type:'module',dependencies:{react:'19.2.8','react-dom':'19.2.8'}}));
  fs.writeFileSync(path.join(dir, 'src', 'App.tsx'), `import React from 'react'; export default function App(){return <main style={{padding:48,background:'${['#e9eef5','#f5e9eb','#e8f0eb'][index]}',color:'#20252e',width:640,height:400}}><h1>${names[index]}</h1><p>Project tab isolation test</p></main>}`);
  if (!fs.existsSync(path.join(dir, 'node_modules'))) fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
}
fs.writeFileSync(path.join(data, 'local-projects.json'), JSON.stringify(projectIds.map((id,index)=>({id,rootPath:id,canonicalRoot:id,name:names[index],addedAt:Date.now()}))));
fs.writeFileSync(path.join(data,'preferences.json'), JSON.stringify({schemaVersion:1,localePreference:'zh-CN'}));
// Keep test runs isolated and deterministic. The test below verifies re-open state separately.
fs.writeFileSync(path.join(data,'project-tabs.json'),'[]');
const report = { checks: [], screenshots: [], errors: [] };
const deadline = setTimeout(() => { console.error('Project tabs test timed out'); app.exit(1); }, 180_000);
deadline.unref();
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function waitFor(fn, label, timeout=30000) {
  const start=Date.now();
  while(Date.now()-start<timeout){const result=await fn();if(result)return result;await sleep(150);}
  throw new Error('Timed out: '+label);
}
const evaluate=(wc,script)=>wc.executeJavaScript(script,true);
const invoke=(wc,channel,args)=>evaluate(wc,`window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const check=(label,condition)=>{assert.ok(condition,label);report.checks.push(label);fs.writeFileSync(path.join(qa,'report.json'),JSON.stringify(report,null,2));};
const targets=()=>webContents.getAllWebContents().filter(wc=>wc.getURL().includes('projectTab='));
const getProject=id=>targets().find(wc=>new URL(wc.getURL()).searchParams.get('projectTab')===id);
app.on('web-contents-created',(_event,wc)=>wc.on('console-message',(_e,level,message)=>{if(level>=3 && !report.errors.includes(message))report.errors.push(message);}));
let nextDialogResponse=0;
dialog.showMessageBox=async(_win,options)=>{report.checks.push('dialog: '+options.message);return {response:nextDialogResponse,checkboxChecked:false};};
require(path.join(root,'out/main/index.js'));
app.whenReady().then(async()=>{
  try {
    const win=await waitFor(()=>BrowserWindow.getAllWindows().find(w=>!w.isDestroyed()),'window');
    const shell=win.webContents;
    await waitFor(()=>evaluate(shell,`!!document.querySelector('.project-titlebar')`).catch(()=>false),'titlebar');
    win.setSize(1400,900);win.show();shell.closeDevTools();
    await evaluate(shell,`localStorage.setItem('bingo-editor-theme','dark');window.dispatchEvent(new StorageEvent('storage',{key:'bingo-editor-theme'}))`);
    let state=await invoke(shell,'project-tabs:get');
    check('Home starts with no projects',state.tabs.length===0&&state.activeId===null);
    for(const id of projectIds)await invoke(shell,'project-tabs:open',{projectId:id});
    state=await invoke(shell,'project-tabs:get');
    await waitFor(()=>targets().length===3,'project renderers loaded');
    check('Three projects open as separate tabs',state.tabs.length===3&&targets().length===3);
    await waitFor(async()=>{const s=await invoke(shell,'project-tabs:get');return s.tabs.every(t=>t.status==='idle');},'project editors ready',90000);
    const first=getProject(projectIds[0]);const second=getProject(projectIds[1]);const third=getProject(projectIds[2]);
    check('Every editor has its own document',new Set([first.id,second.id,third.id]).size===3);
    for (const [name,contents] of [['shell',shell],['project',first]]) {
      let prevented=false;
      contents.emit('will-navigate',{preventDefault:()=>{prevented=true;}},'https://example.invalid/');
      check(`External navigation cannot retain the privileged ${name} preload`,prevented);
    }
    await evaluate(first,`window.__tabSentinel={draft:'keep this draft',count:0};window.__tabTimer=setInterval(()=>window.__tabSentinel.count++,50);`);
    await invoke(shell,'project-tabs:activate',{projectId:projectIds[0]});
    await invoke(shell,'project-tabs:activate',{projectId:projectIds[1]});
    await waitFor(async()=>await evaluate(first,'window.__tabSentinel.count')>2,'background timer continues',10_000);
    check('Background work continues while another project is active',(await evaluate(first,'window.__tabSentinel.count'))>2);
    check('Project globals do not leak into another editor',await evaluate(second,'window.__tabSentinel === undefined'));
    await invoke(shell,'project-tabs:home');
    check('Home preserves all open editors',(await invoke(shell,'project-tabs:get')).tabs.length===3&&targets().length===3);
    await invoke(shell,'project-tabs:open',{projectId:projectIds[0]});
    check('Reopening an existing project activates it without duplication',(await invoke(shell,'project-tabs:get')).tabs.length===3);
    check('Switching restores the same live editor and draft',await evaluate(first,`window.__tabSentinel.draft==='keep this draft'`));
    const denied=await evaluate(second,`window.api.invoke('bingo:store',{op:'list-canvases',root:${JSON.stringify(projectIds[0])}}).then(()=>false,()=>true)`);
    check('Cross-project storage access is rejected',denied);
    check('Shell cannot read the active project store',await evaluate(shell,`window.api.invoke('bingo:store',{op:'list-canvases',root:${JSON.stringify(projectIds[0])}}).then(()=>false,()=>true)`));
    check('Project renderer cannot open arbitrary sibling tabs',await evaluate(first,`window.api.invoke('project-tabs:open',{projectId:${JSON.stringify(projectIds[1])}}).then(()=>false,()=>true)`));
    const builderId = require('node:crypto').randomUUID();
    await invoke(first,'bingo:builder-connect',{root:projectIds[0],sessionId:builderId});
    check('A sibling cannot replace another project compiler session',await evaluate(second,`window.api.invoke('bingo:builder-connect',{root:${JSON.stringify(projectIds[1])},sessionId:${JSON.stringify(builderId)}}).then(()=>false,()=>true)`));
    await invoke(second,'bingo:builder-disconnect',{root:projectIds[1],sessionId:builderId});
    check('A sibling cannot disconnect another project compiler session',(await invoke(first,'bingo:builder-rebuild',{root:projectIds[0],sessionId:builderId})).ok);
    await invoke(first,'bingo:builder-disconnect',{root:projectIds[0],sessionId:builderId});
    await evaluate(second,`window.api.send('project-tabs:status',{source:'qa-task',status:'running'})`);
    await evaluate(third,`window.api.send('project-tabs:status',{source:'qa-task',status:'attention'})`);
    await sleep(300);
    check('Background running and approval states reach the titlebar',(await evaluate(shell,'document.querySelector(".project-titlebar").innerText')).includes('待确认'));
    fs.writeFileSync(path.join(qa,'titlebar-desktop.png'),(await shell.capturePage()).toPNG());
    fs.writeFileSync(path.join(qa,'editor-desktop.png'),(await first.capturePage()).toPNG());
    report.screenshots.push('titlebar-desktop.png','editor-desktop.png');
    win.setSize(680,700);await sleep(700);
    await waitFor(()=>evaluate(shell,`!!document.querySelector('.project-titlebar-list')`),'tab overflow entry',10_000);
    report.layout=await evaluate(shell,`({width:innerWidth,strip:document.querySelector('.project-titlebar-tabs').clientWidth,scroll:document.querySelector('.project-titlebar-tabs').scrollWidth,root:document.documentElement.scrollWidth})`);
    fs.writeFileSync(path.join(qa,'report.json'),JSON.stringify(report,null,2));
    check('Narrow window exposes the tab list',await evaluate(shell,`!!document.querySelector('.project-titlebar-list')`));
    check('Narrow titlebar has no viewport overflow',await evaluate(shell,`document.querySelector('.project-titlebar').scrollWidth<=innerWidth`));
    fs.writeFileSync(path.join(qa,'titlebar-narrow.png'),(await shell.capturePage()).toPNG());
    await invoke(shell,'project-tabs:activate',{projectId:projectIds[1]});
    nextDialogResponse=0;
    await invoke(shell,'project-tabs:close',{projectId:projectIds[1]});
    check('Canceling the running-task close keeps the tab',(await invoke(shell,'project-tabs:get')).tabs.length===3);
    await evaluate(second,`window.api.send('project-tabs:status',{source:'qa-task',status:'idle'})`);
    await evaluate(third,`window.api.send('project-tabs:status',{source:'qa-task',status:'idle'})`);
    // Force a failed save and verify close is fail-closed, then retry successfully.
    await evaluate(second,`window.__failClose=e=>e.detail.pending.push(Promise.reject(new Error('Test save failure')));window.addEventListener('bingo:prepare-project-close',window.__failClose)`);
    await invoke(shell,'project-tabs:close',{projectId:projectIds[1]});
    check('Failed saving keeps the editor and tab open',(await invoke(shell,'project-tabs:get')).tabs.length===3&&!second.isDestroyed());
    await evaluate(second,`window.removeEventListener('bingo:prepare-project-close',window.__failClose)`);
    await invoke(shell,'project-tabs:activate',{projectId:projectIds[0]});
    await invoke(shell,'project-tabs:close',{projectId:projectIds[1]});
    state=await invoke(shell,'project-tabs:get');
    check('Closing a background tab preserves active project',state.tabs.length===2&&state.activeId===projectIds[0]);
    check('Closing destroys only that project renderer',second.isDestroyed()&&!first.isDestroyed()&&!third.isDestroyed());
    const saved=JSON.parse(fs.readFileSync(path.join(data,'project-tabs.json'),'utf8'));
    check('Open tabs and selected project are persisted',saved[0].projectIds.length===2&&saved[0].activeId===projectIds[0]);
    await invoke(shell,'project-tabs:close',{projectId:projectIds[0]});
    await invoke(shell,'project-tabs:close',{projectId:projectIds[2]});
    state=await invoke(shell,'project-tabs:get');
    check('Closing the final project returns Home without closing the window',state.tabs.length===0&&state.activeId===null&&!win.isDestroyed());
    win.setSize(1400,900);
    for(const id of projectIds)await invoke(shell,'project-tabs:open',{projectId:id});
    await waitFor(async()=>{const s=await invoke(shell,'project-tabs:get');return s.tabs.every(t=>t.status==='idle');},'reopened projects ready',90000);
    await invoke(shell,'project-tabs:activate',{projectId:projectIds[0]});
    const editorA=getProject(projectIds[0]);
    const editorB=getProject(projectIds[1]);
    await evaluate(editorA,`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='助手')?.click()`);
    await sleep(200);
    await evaluate(editorA,`(()=>{const c=document.querySelector('[contenteditable=true][role=combobox]');c.focus();c.textContent='切换标签后保留草稿';c.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:c.textContent}));})()`);
    await invoke(shell,'project-tabs:activate',{projectId:projectIds[1]});
    await invoke(shell,'project-tabs:activate',{projectId:projectIds[0]});
    check('Actual composer draft is preserved',await evaluate(editorA,`document.querySelector('[contenteditable=true][role=combobox]').textContent==='切换标签后保留草稿'`));
    editorA.sendInputEvent({type:'keyDown',keyCode:'Tab',modifiers:['control']});editorA.sendInputEvent({type:'keyUp',keyCode:'Tab',modifiers:['control']});
    await sleep(150);
    check('Ctrl+Tab switches from inside a project editor',(await invoke(shell,'project-tabs:get')).activeId===projectIds[1]);
    await invoke(shell,'project-tabs:activate',{projectId:projectIds[0]});
    await evaluate(editorA,`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='页面')?.click()`);
    const pages=await invoke(editorA,'bingo:store',{op:'list-canvases',root:projectIds[0]});
    const before=await invoke(editorA,'bingo:store',{op:'load-canvas',root:projectIds[0],pageId:pages[0].id});
    await evaluate(editorA,`document.querySelector('[data-layer-id="el-app-root"]').click();document.activeElement?.blur()`);
    editorA.focus();editorA.sendInputEvent({type:'keyDown',keyCode:'Right'});editorA.sendInputEvent({type:'keyUp',keyCode:'Right'});
    await sleep(50);
    await invoke(shell,'project-tabs:activate',{projectId:projectIds[1]});
    await invoke(shell,'project-tabs:activate',{projectId:projectIds[0]});
    check('Canvas selection is preserved',await evaluate(editorA,`document.querySelector('[data-layer-id="el-app-root"]').className.includes('bg-ed-layer-active')`));
    await invoke(shell,'project-tabs:close',{projectId:projectIds[0]});
    await invoke(shell,'project-tabs:open',{projectId:projectIds[0]});
    await waitFor(async()=>{const s=await invoke(shell,'project-tabs:get');return s.tabs.find(t=>t.id===projectIds[0])?.status==='idle'},'saved project reopened',90000);
    const after=await invoke(getProject(projectIds[0]),'bingo:store',{op:'load-canvas',root:projectIds[0],pageId:pages[0].id});
    check('Closing before autosave flushes the actual edit',after.elements.byId['el-app-root'].canvasPosition.x===(before.elements.byId['el-app-root'].canvasPosition?.x||0)+1);
    await evaluate(shell,`localStorage.setItem('bingo-editor-theme','light');window.dispatchEvent(new StorageEvent('storage',{key:'bingo-editor-theme'}))`);
    await sleep(150);
    check('Light theme propagates to project views',await evaluate(editorB,`!document.documentElement.classList.contains('editor-dark')`));
    fs.writeFileSync(path.join(qa,'titlebar-light.png'),(await shell.capturePage({x:0,y:0,width:1400,height:40})).toPNG());
    await invoke(shell,'bingo:locale-set',{preference:'en'});await sleep(100);
    check('Language change propagates to project views',await evaluate(editorB,`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Pages')`));
    await invoke(shell,'bingo:locale-set',{preference:'zh-CN'});
    await evaluate(shell,`localStorage.setItem('bingo-editor-theme','dark');window.dispatchEvent(new StorageEvent('storage',{key:'bingo-editor-theme'}))`);
    check('No new renderer errors',report.errors.filter(message=>!message.includes('fonts.gstatic.com')).length===0);
    report.done=true;
    fs.writeFileSync(path.join(qa,'report.json'),JSON.stringify(report,null,2));
    fs.writeFileSync(path.join(qa,'ready'),'ready');
    console.log(`[ProjectTabs QA] ${report.checks.length} checks passed. Evidence: ${qa}`);
    app.quit();
  } catch(error){report.failure=String(error.stack||error);fs.writeFileSync(path.join(qa,'report.json'),JSON.stringify(report,null,2));console.error(error);app.exit(1);}
});
