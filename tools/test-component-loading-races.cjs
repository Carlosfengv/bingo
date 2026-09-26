/* Deterministic browser integration of the production hook, loader and builder
 * client. Only the Electron transport is simulated to control reply ordering.
 * Does not open or write a user's project. */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-component-loading-'));
const output = path.join(repo, 'output/component-instance-editing/loading-races-report.json');
app.setPath('userData', path.join(directory, 'profile'));
const report = { directory, scope: 'Real React hook, loader and builder client with controlled transport replies; not an end-to-end project compiler test.', checks: [], errors: [] };
const source = `
import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useComponents} from './packages/workspace/src/hooks/useComponents';
import {componentLoader} from './packages/workspace/src/services/ComponentLoader';
import {projectBuilderClient as client} from './packages/workspace/src/services/ProjectBuilderClient';
const gates={}, listeners=new Set(), connections={};
const gate=name=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return gates[name]={promise,resolve,reject}};
window.__qa={gates,gate,connections,reloads:[],frames:[],storeWrites:[],cssPending:null,scanPending:null};
window.api={on:(_channel,handler)=>{listeners.add(handler);return()=>listeners.delete(handler)},invoke:async(channel,args)=>{
  if(channel==='bingo:builder-connect'){connections[args.root]=args.sessionId;return {ok:true}}
  if(channel==='bingo:builder-disconnect')return {ok:true};
  if(channel==='bingo:builder-rebuild'){if(window.__qa.scanPending)return gates[window.__qa.scanPending].promise;return {ok:true}}
  if(channel==='bingo:store'){
    if(args.op==='list-canvases')return window.__qa.canvasPending?gates[window.__qa.canvasPending].promise:[{id:'page',canvas:{elements:[{type:'component',componentName:'App'}]}}];
    if(args.op==='read-file')return window.__qa.cssPending&&args.root==='A'?gates[window.__qa.cssPending].promise:'.current {color:blue}';
    window.__qa.storeWrites.push(args);throw Error('Unexpected store mutation');
  }
  throw Error('Unexpected transport request '+channel);
}};
window.__qa.emit=(project,type,payload)=>{for(const handler of listeners)handler({projectId:project,sessionId:connections[project],type,payload})};
const reload=componentLoader.reloadIndexedModules.bind(componentLoader);
componentLoader.reloadIndexedModules=async paths=>{window.__qa.reloads.push({project:componentLoader._projectId,paths});return reload(paths)};
function Harness(){
  const [project,setProject]=useState('A');
  const state=useComponents(project);
  window.__qa.state=state;
  useEffect(()=>{client.connect(project);return()=>client.disconnect()},[project]);
  useEffect(()=>{window.__qa.frames.push({project,ready:state.initialized,props:state.componentIndex.App?.props,text:state.components.App?.()})},[project,state.componentIndex,state.components]);
  const Current=state.components.App;
  return <><button id="project-a" onClick={()=>setProject('A')}>A</button><button id="project-b" onClick={()=>setProject('B')}>B</button>
  <div id="project">{project}</div><div id="rendered">{Current?<Current/>:'Loading'}</div><pre id="contract">{JSON.stringify(state.componentIndex)}</pre>
  <div id="error">{state.error}</div><div id="scan">{String(state.scanLoading)}</div></>;
}
createRoot(document.getElementById('root')).render(<Harness/>);
`;
const compiledModule = (text, gate) => ({ path: 'App.tsx', codeUrl: `data:text/javascript;base64,${Buffer.from(`${gate ? `window.__qa.started=${JSON.stringify(gate)};await window.__qa.gates[${JSON.stringify(gate)}].promise;` : ''}export default function App(){return ${JSON.stringify(text)}}`).toString('base64')}` });
const contract = name => ({ App: { path: 'App.tsx', exportName: 'default', props: { [name]: { type: 'string' } } } });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(fn, label) { const start = Date.now(); while (Date.now() - start < 15000) { if (await fn()) return; await sleep(20); } throw Error('Timed out: ' + label); }
let win;
const evaluate = code => win.webContents.executeJavaScript(code, true);
const check = (label, value) => { assert.ok(value, label); report.checks.push(label); console.log('PASS', label); };
const send = (project, type, payload) => evaluate(`window.__qa.emit(${JSON.stringify(project)},${JSON.stringify(type)},${JSON.stringify(payload)});true`);
async function load(project, text, field, gate, updated = false, css = false) {
  const mod = compiledModule(text, gate); if (css) mod.cssImports = ['./theme.css'];
  await send(project, updated ? 'modules:updated' : 'modules:ready', { modules: [mod] });
  await send(project, updated ? 'components:updated' : 'components:ready', { componentIndex: contract(field), replace: true });
}
async function switchTo(project) {
  await evaluate(`document.querySelector('#project-${project.toLowerCase()}').click();true`);
  await waitFor(() => evaluate(`document.querySelector('#project').textContent===${JSON.stringify(project)} && window.__qa.connections[${JSON.stringify(project)}] && !window.__qa.state.initialized`), 'project switch ' + project);
}
async function visible(text, field) {
  await waitFor(() => evaluate(`document.querySelector('#rendered').textContent===${JSON.stringify(text)} && !!window.__qa.state.componentIndex.App?.props?.[${JSON.stringify(field)}]`), text + ' and contract');
}
app.whenReady().then(async () => {
  try {
    const built = await require('esbuild').build({ stdin: { contents: source, resolveDir: repo, loader: 'tsx' }, bundle: true, write: false, format: 'esm', platform: 'browser', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'runtime-barrel', setup(build) {
      build.onResolve({ filter: /^@bingo\/compiler$/ }, () => ({ path: 'runtime', namespace: 'qa-runtime' }));
      build.onLoad({ filter: /.*/, namespace: 'qa-runtime' }, () => ({ resolveDir: repo, contents: `export {ComponentCompiler} from './packages/compiler/src/runtime/ComponentCompiler';export {executeCompiledModule} from './packages/compiler/src/runtime/executeModule';export {stripUnresolvableCssImports} from './packages/compiler/src/runtime/projectCss';` }));
    } }] });
    fs.writeFileSync(path.join(directory, 'harness.js'), built.outputFiles[0].text);
    fs.writeFileSync(path.join(directory, 'index.html'), '<div id="root"></div><script type="module" src="./harness.js"></script>');
    win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false } });
    win.webContents.on('console-message', (_e, level, message) => { if (level >= 2) report.errors.push(message); });
    await win.loadFile(path.join(directory, 'index.html'));
    await waitFor(() => evaluate('!!window.__qa?.connections.A'), 'initial connection');
    await evaluate("window.__qa.gate('initial');true");
    await load('A', 'Obsolete initial', 'obsolete', 'initial');
    await waitFor(() => evaluate("window.__qa.started==='initial'"), 'delayed initial import');
    await switchTo('B');
    await load('B', 'Current B', 'currentB'); await visible('Current B', 'currentB');
    await evaluate("window.__qa.gates.initial.resolve();true"); await sleep(100);
    check('An old initial module cannot replace the next project implementation or parameter contract', await evaluate("document.querySelector('#rendered').textContent==='Current B'&&!window.__qa.state.componentIndex.App.props.obsolete"));

    await evaluate("window.__qa.refreshDone=false;window.__qa.state.refreshComponentPaths(['OnlyInB.tsx']).then(()=>window.__qa.refreshDone=true);window.__qa.waitResult='pending';window.__qa.state.waitForComponent('Missing').then(()=>window.__qa.waitResult='resolved',()=>window.__qa.waitResult='cancelled');true");
    await switchTo('A'); await load('A', 'Returned A', 'returnedA'); await visible('Returned A', 'returnedA');
    await waitFor(() => evaluate("window.__qa.refreshDone && window.__qa.waitResult==='cancelled'"), 'old manual requests cancelled');
    check('A delayed file refresh and component wait stop at the project boundary', await evaluate("!window.__qa.reloads.some(x=>x.project==='A'&&x.paths.includes('OnlyInB.tsx'))"));

    await evaluate("window.__qa.gate('scan');window.__qa.scanPending='scan';window.__qa.state.requestPropsScan('App');true");
    await waitFor(() => evaluate('window.__qa.state.scanLoading'), 'scan started');
    await switchTo('B'); await load('B', 'B after scan', 'afterScan'); await visible('B after scan', 'afterScan');
    await evaluate("window.__qa.scanPending=null;window.__qa.gates.scan.resolve({ok:false,error:'Old scan failed'});true"); await sleep(100);
    check('A late scan failure does not change the next project loading state or error', await evaluate("!window.__qa.state.scanLoading&&!window.__qa.state.error&&document.querySelector('#rendered').textContent==='B after scan'"));

    await evaluate("window.__qa.gate('older');true");
    await load('B', 'Older update', 'older', 'older', true);
    await waitFor(() => evaluate("window.__qa.started==='older'"), 'older update started');
    await load('B', 'Newest update', 'newest', undefined, true); await visible('Newest update', 'newest');
    await evaluate("window.__qa.gates.older.resolve();true"); await sleep(100);
    check('Rapid complete updates retain the latest implementation and API after the older import finishes', await evaluate("document.querySelector('#rendered').textContent==='Newest update'&&!!window.__qa.state.componentIndex.App.props.newest&&!window.__qa.state.componentIndex.App.props.older"));

    await evaluate("window.__qa.gate('return');true");
    await load('B', 'Previous B session', 'previousSession', 'return', true);
    await waitFor(() => evaluate("window.__qa.started==='return'"), 'previous session started');
    await switchTo('A'); await load('A', 'Intermediate A', 'intermediate'); await visible('Intermediate A', 'intermediate');
    await switchTo('B'); await load('B', 'Reopened B', 'reopened'); await visible('Reopened B', 'reopened');
    await evaluate("window.__qa.gates.return.resolve();true"); await sleep(100);
    check('Leaving and returning to the same project does not revive its previous session result', await evaluate("document.querySelector('#rendered').textContent==='Reopened B'&&!window.__qa.state.componentIndex.App.props.previousSession"));

    await switchTo('A'); await evaluate("window.__qa.gate('css');window.__qa.cssPending='css';true");
    await load('A', 'Old CSS project', 'oldCss', undefined, false, true);
    await switchTo('B'); await load('B', 'Current CSS project', 'currentCss', undefined, false, true); await visible('Current CSS project', 'currentCss');
    await evaluate("window.__qa.gates.css.resolve('.obsolete {color:red}');true"); await sleep(100);
    check('A late project stylesheet cannot overwrite the current project stylesheet or component', await evaluate("document.querySelectorAll('#bingo-module-css-theme_css').length===1&&document.querySelector('#bingo-module-css-theme_css').textContent==='.current {color:blue}'&&document.querySelector('#rendered').textContent==='Current CSS project'"));
    await switchTo('A');
    await evaluate("window.__qa.gate('canvas');window.__qa.canvasPending='canvas';true");
    await load('A', 'Initial lookup pending', 'initialLookup');
    await load('A', 'Updated before first paint', 'firstPaintUpdate', undefined, true);
    await evaluate("window.__qa.canvasPending=null;window.__qa.gates.canvas.resolve([{id:'page',canvas:{elements:[{type:'component',componentName:'App'}]}}]);true");
    await visible('Updated before first paint', 'firstPaintUpdate');
    check('A source update during the initial canvas lookup still produces the latest first paint', await evaluate("!window.__qa.state.loading&&!window.__qa.state.componentIndex.App.props.initialLookup"));
    await evaluate("window.__qa.gate('revisionCss');window.__qa.cssPending='revisionCss';true");
    await load('A', 'Superseded stylesheet revision', 'supersededCss', undefined, true, true);
    await load('A', 'Latest after slow stylesheet', 'latestAfterCss', undefined, true);
    await visible('Latest after slow stylesheet', 'latestAfterCss');
    await evaluate("window.__qa.gates.revisionCss.resolve('.obsolete {color:red}');true"); await sleep(100);
    check('A stylesheet-delayed old revision cannot restart its JS import after a newer revision is visible', await evaluate("document.querySelector('#rendered').textContent==='Latest after slow stylesheet'&&!!window.__qa.state.componentIndex.App.props.latestAfterCss"));
    check('Loading, scanning and project switching never write instance data', await evaluate('window.__qa.storeWrites.length===0'));
    report.frames = await evaluate('window.__qa.frames');
    const projectForText = { 'Returned A': 'A', 'Intermediate A': 'A', 'Updated before first paint': 'A', 'Latest after slow stylesheet': 'A', 'Current B': 'B', 'B after scan': 'B', 'Newest update': 'B', 'Reopened B': 'B', 'Current CSS project': 'B' };
    check('Every published ready render belongs to its current project, including the first frame after a switch', report.frames.every(frame => !frame.ready || projectForText[frame.text] === frame.project));
    report.passed = true;
  } catch (error) { report.failure = error.stack; report.snapshot = await evaluate('({text:document.body.innerText,index:window.__qa?.state?.componentIndex,error:window.__qa?.state?.error})').catch(() => null); console.error(error); }
  finally { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2)); win?.destroy(); app.exit(report.passed ? 0 : 1); }
});
