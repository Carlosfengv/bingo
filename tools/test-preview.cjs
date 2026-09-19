/* Real Electron + browser preview integration, isolated project/profile. Run after pnpm build. */
const { app, BrowserWindow, webContents, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const qa = fs.realpathSync(fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'bingo-preview-')));
const data = path.join(qa, 'data'), project = path.join(qa, 'preview 项目');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
write(path.join(project, 'package.json'), { name: 'preview-test', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
write(path.join(project, 'src/App.tsx'), 'import {useState} from "react"; export default function App(){const [n,setN]=useState(0);return <div><button data-preview-counter onClick={()=>setN(n+1)}>Count {n}</button><img data-component-image src="/logo.svg" width="40" height="40"/></div>}');
write(path.join(project, 'src/style.css'), '.preview-layout {display:grid;grid-template-columns:1fr 1fr;gap:16px} @media(max-width:500px){.preview-layout{grid-template-columns:1fr}}');
write(path.join(project, 'public/logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="red"/></svg>');
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'zh-CN' });
write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'Preview QA', addedAt: Date.now() }]);
write(path.join(data, 'project-tabs.json'), []);
app.commandLine.appendSwitch('user-data-dir', data);
const elements = { schemaVersion: 2, byId: {
  board: {id:'board',type:'html',tag:'main',name:'Responsive board',props:{},styles:{width:1000,height:700,padding:24,backgroundColor:'#ffffff'}},
  grid: {id:'grid',type:'html',tag:'section',props:{className:'preview-layout'},styles:{}},
  one: {id:'one',type:'html',tag:'div',props:{},styles:{backgroundColor:'#ddeeff',height:120}},
  two: {id:'two',type:'html',tag:'div',props:{},styles:{backgroundColor:'#ffeedd',height:120}},
  img: {id:'img',type:'html',tag:'img',props:{src:'/logo.svg'},styles:{width:40,height:40}},
  component: {id:'component',type:'component',componentName:'App',props:{},styles:{}},
  second: {id:'second',type:'html',tag:'main',name:'Second board',props:{},styles:{width:1000,height:700,backgroundColor:'#d1fae5'}},
}, childrenByParent:{ROOT:['board','second'],board:['grid','img','component'],grid:['one','two']} };
const pageId = crypto.randomUUID();
write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion:1,documentId:crypto.randomUUID(),pages:[{id:pageId}] });
write(path.join(project, '.bingo/design/pages',pageId+'.json'), {schemaVersion:1,id:pageId,name:'Preview fixture',canvas:{elements,zoom:1,pan:{x:30,y:50}},newClasses:[]});
const report={qa,checks:[],errors:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const evaluate=(wc,s)=>wc.executeJavaScript(s,true);
const invoke=(wc,c,a)=>evaluate(wc,`window.api.invoke(${JSON.stringify(c)},${JSON.stringify(a)})`);
const check=(label,value)=>{assert.ok(value,label);report.checks.push(label);console.log('PASS',label)};
async function waitFor(fn,label,timeout=60000){const start=Date.now();while(Date.now()-start<timeout){const value=await fn();if(value)return value;await sleep(150)}throw Error('Timed out: '+label)}
let openedUrl;
shell.openExternal=async url=>{openedUrl=url};
app.on('web-contents-created',(_e,wc)=>wc.on('console-message',(_event,level,message)=>{if(level>=3)report.errors.push(message)}));
require(path.join(repo,'out/main/index.js'));
setTimeout(()=>{console.error('Preview QA timeout',qa,report);app.exit(1)},180000).unref();
app.whenReady().then(async()=>{
 let editor,browser;
 try {
  const win=await waitFor(()=>BrowserWindow.getAllWindows().find(w=>!w.isDestroyed()),'window');win.setSize(1400,1000);
  await waitFor(()=>evaluate(win.webContents,'!!document.querySelector(".project-titlebar")').catch(()=>false),'shell');
  await invoke(win.webContents,'project-tabs:open',{projectId:project});
  editor=await waitFor(()=>webContents.getAllWebContents().find(wc=>{try{return new URL(wc.getURL()).searchParams.get('projectTab')===project}catch{return false}}),'editor');
  await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-element-id=board]")').catch(()=>false),'board');
  const choosePreview = async label => {
    await evaluate(editor, `document.querySelector('button[aria-label=预览]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}))`);
    await waitFor(() => evaluate(editor, `!!document.querySelector('[role=menu]')`), 'preview menu');
    await evaluate(editor, `[...document.querySelectorAll('[role=menuitem]')].find(item=>item.textContent.includes(${JSON.stringify(label)})).click()`);
  };
  await choosePreview('窗口预览');
  const frameDoc='document.querySelector("iframe[data-responsive-preview]")?.contentDocument';
  await waitFor(()=>evaluate(editor,`!!${frameDoc}?.querySelector('[data-element-id=grid]')`).catch(()=>false),'floating content');
  check('Floating preview opens',true);
  const width=await evaluate(editor,`${frameDoc}.documentElement.clientWidth`);
  check('Root reflows to the preview viewport',await evaluate(editor,`Math.abs(${frameDoc}.querySelector('[data-element-id=board]').getBoundingClientRect().width-${width})<2`));
  const columns=wc=>evaluate(wc,`getComputedStyle(${frameDoc}.querySelector('[data-element-id=grid]')).gridTemplateColumns.split(' ').length`);
  check('Wide preview uses desktop breakpoint',await columns(editor)===2);
  const box=await evaluate(editor,`(()=>{const r=document.querySelector('[data-preview-resize=e]').getBoundingClientRect();return {x:Math.round(r.x+3),y:Math.round(r.y+80)}})()`);
  editor.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...box});
  editor.sendInputEvent({type:'mouseMove',x:box.x-300,y:box.y});
  editor.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:box.x-300,y:box.y});
  await waitFor(async()=>await columns(editor)===1,'mobile breakpoint');
  check('Resizing floating window triggers CSS mobile breakpoint',true);
  await evaluate(editor,'document.querySelector("[aria-label=下一帧]").click()');
  await waitFor(()=>evaluate(editor,`!!${frameDoc}.querySelector('[data-element-id=second]')`),'next frame');
  await evaluate(editor,'document.querySelector("[aria-label=在浏览器中预览]").click()');
  await waitFor(()=>openedUrl,'browser launch');
  check('Browser launch retains selected page and current frame',new URL(openedUrl).searchParams.get('page')===pageId&&new URL(openedUrl).searchParams.get('element')==='second');
  browser=new BrowserWindow({width:1200,height:800,show:false,webPreferences:{contextIsolation:true,nodeIntegration:false}});
  await browser.loadURL(openedUrl);
  const bw=browser.webContents;
  await waitFor(()=>evaluate(bw,`!!${frameDoc}?.querySelector('[data-element-id=second]')`).catch(()=>false),'web preview content');
  check('Browser preview runs without Electron preload',await evaluate(bw,'!window.api.getPathForFile'));
  await evaluate(bw,'document.querySelector("[aria-label=上一帧]").click()');
  await waitFor(()=>evaluate(bw,`!!${frameDoc}.querySelector('[data-element-id=grid]')`),'web first frame');
  check('Browser desktop breakpoint',await columns(bw)===2);
  browser.setContentSize(390,720);
  await waitFor(async()=>await columns(bw)===1,'browser mobile breakpoint');
  check('Browser resizing reflows content',true);
  await waitFor(()=>evaluate(bw,`${frameDoc}.querySelector('img').naturalWidth===40`),'public asset');
  check('Browser loads project public images',true);
  await waitFor(()=>evaluate(bw,`${frameDoc}.querySelector('[data-preview-counter]')?.textContent==='Count 0'`),'compiled component');
  await evaluate(bw,`${frameDoc}.querySelector('[data-preview-counter]').click()`);
  await waitFor(()=>evaluate(bw,`${frameDoc}.querySelector('[data-preview-counter]')?.textContent==='Count 1'`),'component interaction');
  check('Compiled React components stay interactive',true);
  await waitFor(()=>evaluate(bw,`${frameDoc}.querySelector('[data-component-image]')?.naturalWidth===40`),'component public image',5000);
  check('Compiled component public URLs resolve in browser',true);
  await evaluate(bw,`document.querySelector('nav button[aria-pressed]').click()`);
  await waitFor(()=>evaluate(bw,`!!document.querySelector('[data-proto-surface]')`),'original canvas mode');
  await evaluate(bw,`document.querySelector('nav button[aria-pressed]').click()`);
  await waitFor(()=>evaluate(bw,`!!${frameDoc}?.querySelector('[data-element-id=board]')`),'responsive mode restored');
  check('Original canvas view remains available',true);
  await evaluate(editor,`${frameDoc}.querySelector('[data-element-id=second]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await waitFor(()=>evaluate(editor,`!document.querySelector('[role=dialog][aria-label=预览]')`),'escape closes focused preview');
  check('Escape closes preview while its content has focus',true);
  const previousUrl = openedUrl;
  await choosePreview('网页预览');
  await waitFor(() => openedUrl !== previousUrl, 'web preview menu action');
  check('Preview dropdown opens the browser preview', true);
  await choosePreview('窗口预览');

  check('Browser blocks canvas writes',await evaluate(bw,`window.api.invoke('bingo:store',{op:'save-canvas',root:${JSON.stringify(project)},params:{id:${JSON.stringify(pageId)}}}).then(()=>false,()=>true)`));
  const url=new URL(openedUrl);
  check('Unauthenticated bridge is rejected',(await fetch(url.origin+'/__luna/invoke',{method:'POST',body:'{}'})).status===403);
  check('Cross-project access is rejected',await evaluate(bw,`window.api.invoke('bingo:store',{op:'list-canvases',root:'/tmp'}).then(()=>false,()=>true)`));
  await bw.reload();
  await waitFor(()=>evaluate(bw,`!!${frameDoc}?.querySelector('[data-element-id=second]')`).catch(()=>false),'browser refresh');
  check('Browser refresh reconnects and renders',true);
  fs.writeFileSync(path.join(qa,'browser-mobile.png'),(await bw.capturePage()).toPNG());
  fs.writeFileSync(path.join(qa,'floating.png'),(await editor.capturePage()).toPNG());
  console.log(JSON.stringify({qa,checks:report.checks,errors:report.errors.filter(x=>!x.includes('font')&&!x.includes('Autofill'))},null,2));fs.writeFileSync(path.join(qa,'report.json'),JSON.stringify(report,null,2));app.exit(0);
 }catch(error){report.failure=String(error.stack||error);console.error(report);fs.writeFileSync(path.join(qa,'report.json'),JSON.stringify(report,null,2));if(browser)console.error(await evaluate(browser.webContents,'document.body.innerText').catch(()=>''));app.exit(1)}
});
