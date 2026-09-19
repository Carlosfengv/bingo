/* Isolated Electron benchmark. Build first; no AI requests or user-project writes.
 * --tabs=3 --nodes=300 --samples=100 --warmup=20 --rounds=3
 * --mode=ipc|mouse|keyboard --trace --empty-canvas --output=/absolute/report.json
 * --build-dir=/absolute/out-snapshot (optional frozen build)
 * Frame timings are shell proxies, NOT target compositor presentation times.
 */
const { app, BrowserWindow, webContents, ipcMain, contentTracing, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const { performance, monitorEventLoopDelay } = require('node:perf_hooks');
const arg = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? fallback;
if (process.argv.includes('--help')) { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]); app.exit(0); }
const number = (name, fallback, min, max) => { const n = Number(arg(name, fallback)); if (!Number.isInteger(n) || n < min || n > max) throw Error(`Invalid --${name}`); return n; };
const count = number('tabs', 3, 2, 10), nodes = number('nodes', 300, 1, 5000);
const samples = number('samples', 100, 1, 1000), warmup = number('warmup', 20, 0, 100), rounds = number('rounds', 3, 1, 10);
const mode = arg('mode', 'ipc');
const canvasFixture = !process.argv.includes('--empty-canvas');
if (!['ipc', 'mouse', 'keyboard'].includes(mode)) throw Error('Invalid mode');
const root = path.resolve(__dirname, '..');
const buildDir = path.resolve(arg('build-dir', path.join(root, 'out')));
const qa = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-tabs-benchmark-')));
const data = path.join(qa, 'data'); fs.mkdirSync(data);
app.commandLine.appendSwitch('user-data-dir', data);
const projectIds = Array.from({ length: count }, (_, i) => path.join(qa, `project-${i}`));
for (const [i, dir] of projectIds.entries()) {
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: `bench-${i}`, type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } }));
  fs.writeFileSync(path.join(dir, 'src', 'App.tsx'), `import React from 'react';export default function App(){return <main style={{width:800,display:'grid',gridTemplateColumns:'repeat(10,1fr)'}}>${Array.from({length:nodes}, (_,n)=>`<div style={{padding:4,background:'${i%2?'#cde':'#edc'}'}}>Cell ${n}</div>`).join('')}</main>}`);
  fs.writeFileSync(path.join(dir, 'src', 'tokens.css'), `:root{${Array.from({length:100},(_,n)=>`--color-${n}:#${(n+100).toString(16).padStart(6,'0')};`).join('')}}`);
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
  if (canvasFixture) {
    const crypto = require('node:crypto'), pageId = crypto.randomUUID();
    const design = path.join(dir, '.bingo/design');fs.mkdirSync(path.join(design,'pages'),{recursive:true});
    const byId = { frame:{id:'frame',type:'html',tag:'main',name:'Benchmark frame',styles:{width:800,display:'grid',gridTemplateColumns:'repeat(10, 1fr)',gap:4},canvasPosition:{x:0,y:0}} };
    const children=[];
    for(let n=1;n<nodes;n++){const id=`cell-${n}`;children.push(id);byId[id]={id,type:'html',tag:'div',name:`Cell ${n}`,styles:{height:24,backgroundColor:i%2?'#cde':'#edc'}};}
    fs.writeFileSync(path.join(design,'manifest.json'),JSON.stringify({schemaVersion:1,documentId:crypto.randomUUID(),pages:[{id:pageId}]}));
    fs.writeFileSync(path.join(design,'pages',pageId+'.json'),JSON.stringify({schemaVersion:1,id:pageId,name:'Benchmark',canvas:{elements:{schemaVersion:2,byId,childrenByParent:{ROOT:['frame'],frame:children}}},newClasses:[]}));
  }
}
fs.writeFileSync(path.join(data, 'local-projects.json'), JSON.stringify(projectIds.map(id => ({id, rootPath:id, canonicalRoot:id, name:path.basename(id), addedAt:Date.now()}))));
fs.writeFileSync(path.join(data, 'project-tabs.json'), '[]');
const output = path.resolve(arg('output', path.join(qa, 'report.json')));
const report = { qa, mode, count, nodes, canvasFixture, samples, warmup, rounds: [], errors: [], note:'shellTwoFramesMs is not target presentation time' };
const counters = { cssReads:0, directoryReads:0, workerVariableReads:0, cliProbes:0, sessionWrites:0, asyncSessionWrites:0 };
const writeFileAsync = fs.promises.writeFile;
fs.promises.writeFile = function(file, ...args) {
  if (String(file).includes('project-tabs.json')) counters.asyncSessionWrites++;
  return writeFileAsync.call(this, file, ...args);
};
const workerPrototype = require('node:worker_threads').Worker.prototype;
const postMessage = workerPrototype.postMessage;
workerPrototype.postMessage = function(message, ...rest) {
  if (message?.root?.startsWith(qa) && Object.hasOwn(message, 'manifest')) counters.workerVariableReads++;
  return postMessage.call(this, message, ...rest);
};
let timings = [];
const handle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel, fn) => handle(channel, (event, ...args) => {
  const start = performance.now(); const value = fn(event, ...args);
  const record = { channel, op:args[0]?.op, syncMs:performance.now()-start };
  timings.push(record);
  return value;
});
for (const method of ['readFileSync', 'readdirSync', 'writeFileSync']) {
  const original = fs[method];
  fs[method] = function(...args) {
    const file = String(args[0]);
    if (method === 'readFileSync' && file.endsWith('.css') && file.startsWith(qa)) counters.cssReads++;
    if (method === 'readdirSync' && file.startsWith(qa)) counters.directoryReads++;
    if (method === 'writeFileSync' && file.includes('project-tabs.json')) counters.sessionWrites++;
    return original.apply(this, args);
  };
}
const execFile = cp.execFile;
cp.execFile = function(file, args, ...rest) {
  if (Array.isArray(args) && (args.includes('--version') || args.includes('command -v claude'))) counters.cliProbes++;
  return execFile.call(this, file, args, ...rest);
};
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
async function waitFor(fn, label, timeout=90000) { const start=Date.now(); while(Date.now()-start<timeout) { try { const v=await fn(); if(v)return v; } catch {} await sleep(100); } throw Error(`Timeout: ${label}`); }
const stats = values => { const v=[...values].sort((a,b)=>a-b); return {n:v.length,median:v[Math.floor(v.length/2)],p95:v[Math.ceil(v.length*.95)-1],max:v.at(-1)}; };
const save = () => { fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)); };
app.on('web-contents-created', (_e,wc)=>wc.on('render-process-gone',(_e,details)=>report.errors.push(details)));
app.once('will-quit',()=>{report.normalQuit=true;save();console.log(`BENCHMARK_REPORT ${output}`);});
require(path.join(buildDir,'main/index.js'));
const timeout=setTimeout(()=>{report.errors.push('Global timeout');save();app.exit(1);},600000);timeout.unref();
app.whenReady().then(async()=>{
  let tracing=false;
  try {
    const win=await waitFor(()=>BrowserWindow.getAllWindows()[0],'window'); const shell=win.webContents;
    await waitFor(()=>evaluate(shell,`!!document.querySelector('.project-titlebar')`),'shell');
    shell.closeDevTools();win.setSize(1400,900);win.show();win.focus();
    report.phase='opening projects';save();
    for(const id of projectIds) await invoke(shell,'project-tabs:open',{projectId:id});
    await waitFor(async()=>(await invoke(shell,'project-tabs:get')).tabs.every(t=>t.status==='idle'),'ready');
    if(canvasFixture) for(const id of projectIds) {
      report.phase=`preparing canvas ${path.basename(id)}`;save();
      const wc=webContents.getAllWebContents().find(w=>new URL(w.getURL()||'about:blank').searchParams.get('projectTab')===id);
      await invoke(shell,'project-tabs:activate',{projectId:id});
      await waitFor(()=>evaluate(wc,`document.querySelectorAll('[data-element-id]').length>=${nodes}`),'canvas fixture mounted');
      await waitFor(()=>evaluate(wc,`document.querySelector('[data-project-canvas-ready]')?.getAttribute('data-project-canvas-ready')==='true'`),'canvas ready');
    }
    await sleep(2000);
    const display=screen.getDisplayMatching(win.getBounds());
    report.environment={electron:process.versions.electron,node:process.versions.node,platform:process.platform,arch:process.arch,os:os.release(),display:{scaleFactor:display.scaleFactor,frequency:display.displayFrequency},window:win.getContentSize(),buildDir,buildMtime:fs.statSync(path.join(buildDir,'main/index.js')).mtime.toISOString(),revision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirty:!!cp.execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()};
    if(process.argv.includes('--trace')) { await contentTracing.startRecording({included_categories:['devtools.timeline','blink.user_timing','cc','viz','benchmark','toplevel']});tracing=true; }
    let serial=0;
    async function switchOnce() {
      const state=await invoke(shell,'project-tabs:get');
      const index=(projectIds.indexOf(state.activeId)+1)%count;
      const id=projectIds[index], token=++serial;
      // Install before input; results are measured entirely in the shell clock.
      await evaluate(shell,`window.__tabBench=null;window.__tabBenchStart=performance.now();performance.mark('tab-switch-${token}');window.__tabBenchOff=window.api.on('project-tabs:changed',s=>{if(s.activeId!==${JSON.stringify(id)})return;window.__tabBenchOff();const changedMs=performance.now()-window.__tabBenchStart;requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__tabBench={changedMs,shellTwoFramesMs:performance.now()-window.__tabBenchStart};}));});void 0;`);
      if(mode==='ipc') await invoke(shell,'project-tabs:activate',{projectId:id});
      else if(mode==='mouse') {
        const rect=await evaluate(shell,`(()=>{const e=document.querySelectorAll('[role=tab]')[${index}];e.scrollIntoView({block:'nearest',inline:'nearest'});const r=e.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
        shell.sendInputEvent({type:'mouseDown',...rect,button:'left',clickCount:1});shell.sendInputEvent({type:'mouseUp',...rect,button:'left',clickCount:1});
      } else {
        const current=webContents.getAllWebContents().find(w=>w.getURL().includes(`projectTab=${encodeURIComponent(state.activeId)}`)) || shell;
        const key=()=>{current.sendInputEvent({type:'keyDown',keyCode:'Tab',modifiers:['control']});current.sendInputEvent({type:'keyUp',keyCode:'Tab',modifiers:['control']});};
        key();if(index===0) { await sleep(20);key(); } // Ctrl+Tab includes Home.
      }
      const result=await waitFor(()=>evaluate(shell,'window.__tabBench'),'switch',10000);
      await sleep(30);return result;
    }
    report.phase='warmup';save();
    for(let i=0;i<warmup;i++) await switchOnce();
    for(let round=0;round<rounds;round++) {
      const before={...counters};timings=[];
      const delay=monitorEventLoopDelay({resolution:10});delay.enable();
      const results=[];for(let i=0;i<samples;i++)results.push(await switchOnce());
      delay.disable();
      const requests={};for(const t of timings){const key=t.op||t.channel;requests[key]=(requests[key]||0)+1;}
      report.rounds.push({round:round+1,changedMs:stats(results.map(r=>r.changedMs)),shellTwoFramesMs:stats(results.map(r=>r.shellTwoFramesMs)),activateSyncMs:stats(timings.filter(t=>t.channel==='project-tabs:activate').map(t=>t.syncMs)),requests,counters:Object.fromEntries(Object.keys(counters).map(k=>[k,counters[k]-before[k]])),eventLoopDelayP95Ms:delay.percentile(95)/1e6,results});save();
    }
    report.metrics=app.getAppMetrics();
    if(tracing){report.trace=await contentTracing.stopRecording(path.join(path.dirname(output),path.basename(output,'.json')+'.trace.json'));tracing=false;}
    report.phase='quitting';report.completed=true;save();app.quit();
  } catch(error) {
    report.errors.push(String(error.stack||error));if(tracing)await contentTracing.stopRecording();save();console.error(error);app.exit(1);
  }
});
