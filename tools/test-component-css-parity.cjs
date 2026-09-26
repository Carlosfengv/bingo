/* Compare the real canvas/floating preview with generated React code under the
 * same compiled project CSS. Uses only a newly created fixture and profile. */
const { app, BrowserWindow, webContents, shell } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict');
require('tsx/cjs');
const { ensureV2 } = require('../packages/compiler/src/store/ensureV2.ts');
const { toWire } = require('../packages/compiler/src/store/wire.ts');
const { generateCompleteFile } = require('../packages/compiler/src/codegen/generateCompleteFile.ts');
const { extractComponentMetadata } = require('../src/main/componentPropMetadata.ts');
const repo = path.resolve(__dirname,'..'), directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'bingo-component-css-')));
const project = path.join(directory,'project'), data = path.join(directory,'data'), output = path.join(repo,'output/component-instance-editing');
const write = (file,value) => { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)); };
write(path.join(project,'package.json'),{name:'component-css-parity-test',type:'module',dependencies:{react:'19.2.8','react-dom':'19.2.8'}});
fs.symlinkSync(path.join(repo,'node_modules'),path.join(project,'node_modules'));
const source = `import type {CSSProperties} from 'react';
export function CssProbe({variant='plain',label='Probe',style}:{variant?:'plain'|'soft';label?:string;style?:CSSProperties}) {
 return <section data-probe="root" className="probe" style={style}>
  <h2 data-probe="heading">{label}</h2><button data-probe="button">Native button</button>
  <p data-probe="paragraph">Project text <em>with emphasis</em></p>
  <ul data-probe="list"><li>First item</li><li>Second item</li></ul>
  <input data-probe="input" defaultValue="Native input" />
  <div data-probe="variant" className={'flex shadow-md rounded-lg tone-'+variant}>Variant content</div>
  <span data-probe="token" style={{color:'var(--foreground, rgb(73, 52, 31))'}}>Missing project token</span>
 </section>;
}`;
write(path.join(project,'src/CssProbe.tsx'),source);
write(path.join(project,'src/styles.css'),`:root {--probe-accent:rgb(31,65,99)}
body {font-family:Georgia,serif;font-size:18px;line-height:1.4;color:rgb(24,39,55)}
.probe {width:420px;padding:16px;border:1px solid rgb(90,90,90);background:white}
.tone-soft {color:var(--probe-accent);background:rgb(225,234,242);padding:3px 7px}
button {cursor:pointer}`);
write(path.join(project,'src/App.tsx'),`import './styles.css';import {CssProbe} from './CssProbe';export default function App(){return <CssProbe/>}`);
const pageId=crypto.randomUUID(),pageFile=path.join(project,'.bingo/design/pages',pageId+'.json');
const fixture=ensureV2([{id:'css-frame',type:'html',tag:'div',styles:{width:560,height:520,backgroundColor:'#ffffff'},canvasPosition:{x:20,y:20},children:[{id:'css-probe',type:'component',componentName:'CssProbe',props:{variant:'soft',label:'Project CSS probe'},styles:{borderRadius:'12px'}}]}]);
write(path.join(project,'.bingo/design/manifest.json'),{schemaVersion:1,documentId:crypto.randomUUID(),pages:[{id:pageId}]});
write(pageFile,{schemaVersion:1,id:pageId,name:'CSS parity',canvas:{zoom:1,pan:{x:30,y:50},elements:toWire(fixture)},newClasses:[]});
write(path.join(data,'preferences.json'),{schemaVersion:1,localePreference:'zh-CN'});
write(path.join(data,'local-projects.json'),[{id:project,rootPath:project,canonicalRoot:project,name:'CSS parity QA',addedAt:Date.now()}]);
app.commandLine.appendSwitch('user-data-dir',data);
const report={directory,checks:[],differences:[],snapshots:{},scope:'Full native defaults, inherited project CSS, stylesheet refresh and viewport changes, with identical compiled project CSS in the independent generated page.'};
const evaluate=(wc,code)=>{wc.setBackgroundThrottling(false);return wc.executeJavaScript(code,true)};
const waitFor=async(fn,label)=>{const start=Date.now();while(Date.now()-start<30000){const result=await fn();if(result)return result;await new Promise(resolve=>setTimeout(resolve,75))}throw Error('Timed out: '+label)};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);console.log('PASS',name)};
function snapshot(doc) {
 const properties=['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','color','backgroundColor','display','boxSizing','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','borderTopWidth','borderTopStyle','borderTopColor','borderTopLeftRadius','listStyleType','appearance','verticalAlign','boxShadow'];
 return Object.fromEntries([...doc.querySelectorAll('[data-probe]')].map(node=>{const style=doc.defaultView.getComputedStyle(node),rect=node.getBoundingClientRect();return [node.getAttribute('data-probe'),{text:node.textContent,styles:Object.fromEntries(properties.map(key=>[key,style[key]])),width:rect.width,height:rect.height}]}));
}
const inspect=snapshot.toString();
let openedUrl;
shell.openExternal=async url=>{openedUrl=url};
require(path.join(repo,'out/main/index.js'));
const timeout=setTimeout(()=>{report.failure='CSS parity timeout';write(path.join(output,'css-parity-report.json'),report);app.exit(1)},120000);
app.whenReady().then(async()=>{
 let editor,standalone,browser;
 try {
  const win=await waitFor(()=>BrowserWindow.getAllWindows().find(w=>!w.isDestroyed()),'window');win.setSize(1500,980);win.show();
  await waitFor(()=>evaluate(win.webContents,'!!document.querySelector(".project-titlebar")').catch(()=>false),'shell');
  await evaluate(win.webContents,`window.api.invoke('project-tabs:open',{projectId:${JSON.stringify(project)}})`);
  editor=await waitFor(()=>webContents.getAllWebContents().find(w=>{try{return new URL(w.getURL()).searchParams.get('projectTab')===project}catch{return false}}),'editor');
  await require('./editor-test-foreground.cjs').foregroundEditor(editor);
  await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-canvas-content] [data-probe=heading]")'),'probe');
  await waitFor(()=>evaluate(editor,'!!document.querySelector("#bingo-project-compiled-css")?.sheet'),'compiled CSS');
  await waitFor(()=>evaluate(editor,'document.querySelector("#bingo-project-inherited-style")?.dataset.ready==="true"'),'project inherited styles');
  const cssUrl=await evaluate(editor,`document.querySelector('#bingo-project-compiled-css').href`);
  assert.ok(cssUrl.startsWith('data:text/css;base64,'),'Fixture compiler supplies the project CSS as a data URL');
  const css=Buffer.from(cssUrl.slice(cssUrl.indexOf(',')+1),'base64').toString('utf8');
  report.compiledCssHash=crypto.createHash('sha256').update(css).digest('hex');
  write(path.join(directory,'compiled-project.css'),css);
  report.snapshots.canvas=await evaluate(editor,`(${inspect})(document)`);
  await evaluate(editor,`document.querySelector('[data-canvas-content] [data-element-id=css-frame]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}));document.querySelector('button[aria-label=预览]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}))`);
  await waitFor(()=>evaluate(editor,'!!document.querySelector("[role=menu]")'),'preview menu');
  await evaluate(editor,`Array.from(document.querySelectorAll('[role=menuitem]')).find(item=>item.textContent.includes('窗口预览')).click()`);
  await waitFor(()=>evaluate(editor,'!!document.querySelector("iframe[data-responsive-preview]")?.contentDocument?.querySelector("[data-probe=heading]")'),'floating preview');
  await waitFor(()=>evaluate(editor,'document.querySelector("iframe[data-responsive-preview]")?.contentDocument?.querySelector("#bingo-project-inherited-style")?.dataset.ready==="true"'),'floating inherited styles');
  report.snapshots.floating=await evaluate(editor,`(${inspect})(document.querySelector('iframe[data-responsive-preview]').contentDocument)`);
  await evaluate(editor,`document.querySelector('[aria-label=在浏览器中预览]').click()`);
  await waitFor(()=>openedUrl,'actual browser preview URL');
  browser=new BrowserWindow({width:1200,height:850,show:false,webPreferences:{contextIsolation:true,nodeIntegration:false}});
  await browser.loadURL(openedUrl);
  await waitFor(()=>evaluate(browser.webContents,`(()=>{const doc=document.querySelector('iframe[data-responsive-preview]')?.contentDocument;return !!doc?.querySelector('[data-probe=heading]')&&doc.querySelector('#bingo-project-inherited-style')?.dataset.ready==='true'})()`).catch(()=>false),'browser presentation inherited styles');
  report.snapshots.browser=await evaluate(browser.webContents,`(${inspect})(document.querySelector('iframe[data-responsive-preview]').contentDocument)`);
  check('Browser presentation loads the real preview URL without Electron preload',await evaluate(browser.webContents,'!window.api.getPathForFile'));
  const targetFilePath='.bingo/css-parity/Generated.tsx';
  const generated=generateCompleteFile({componentName:'Generated',store:fixture,rootId:'css-frame',componentIndex:{CssProbe:{path:'src/CssProbe.tsx',exportName:'CssProbe',...extractComponentMetadata(source).CssProbe}},targetFilePath,includeReactImport:true});
  write(path.join(project,targetFilePath),generated);
  const bundle=await require('esbuild').build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {Generated} from './Generated';createRoot(document.getElementById('root')).render(<Generated/>);`,resolveDir:path.dirname(path.join(project,targetFilePath)),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
  standalone=new BrowserWindow({width:1500,height:980,show:false,webPreferences:{contextIsolation:true,sandbox:true}});
  await standalone.loadURL('data:text/html,<!doctype html><div id="root"></div>');
  await evaluate(standalone.webContents,`(()=>{const style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.head.appendChild(style)})()`);
  await evaluate(standalone.webContents,bundle.outputFiles[0].text);
  await waitFor(()=>evaluate(standalone.webContents,'!!document.querySelector("[data-probe=heading]")'),'standalone generated component');
  report.snapshots.standalone=await evaluate(standalone.webContents,`(${inspect})(document)`);
  check('Independent generated page uses the exact compiled project CSS',await evaluate(standalone.webContents,`document.querySelector('style').textContent===${JSON.stringify(css)}&&!window.api`));
  check('Both runtime surfaces contain the complete component probe',Object.keys(report.snapshots.canvas).length===8&&Object.keys(report.snapshots.standalone).length===8);
  for(const surface of ['canvas','floating','browser']) for(const [node,expected] of Object.entries(report.snapshots.standalone)) {
   const actual=report.snapshots[surface][node];
   for(const [property,value] of Object.entries(expected.styles)) if(actual?.styles[property]!==value) report.differences.push({surface,node,property,expected:value,actual:actual?.styles[property]});
   for(const property of ['width','height']) if(Math.abs(actual?.[property]-expected[property])>0.5) report.differences.push({surface,node,property,expected:expected[property],actual:actual?.[property]});
  }
  write(path.join(directory,'editor.png'),(await editor.capturePage()).toPNG());write(path.join(directory,'standalone.png'),(await standalone.webContents.capturePage()).toPNG());
  assert.deepEqual(toWire(ensureV2(JSON.parse(fs.readFileSync(pageFile)).canvas.elements)),toWire(fixture));check('Visual comparison leaves every instance and override unchanged',true);
  check('Canvas, floating and browser preview match native defaults and inherited project CSS',report.differences.length===0);
  check('Editor utility classes and missing project tokens do not leak into components',report.snapshots.canvas.variant.styles.display==='block'&&report.snapshots.canvas.token.styles.color==='rgb(73, 52, 31)');
  check('Editor chrome retains its own typography and spacing',await evaluate(editor,`(()=>{const root=document.querySelector('#bingo-root');const tab=document.querySelector('button[aria-label=预览]');return getComputedStyle(root).fontFamily.includes('Inter')&&tab.getBoundingClientRect().height>=24&&getComputedStyle(document.documentElement).getPropertyValue('--ed-background').trim().length>0})()`));
  check('Style measurement uses only one empty document and no duplicate business components',await evaluate(editor,`(()=>{const frames=document.querySelectorAll('iframe[data-project-style-baseline]');return frames.length===1&&!frames[0].contentDocument.querySelector('[data-probe]')&&frames[0].contentDocument.body.children.length===2})()`));
  const nextCss=fs.readFileSync(path.join(project,'src/styles.css'),'utf8')+'\nbody {font-family:Courier,monospace;font-size:20px;line-height:1.6;color:rgb(56,45,34)}\n@media(max-width:700px){body{font-size:22px;color:rgb(34,56,78)}}';
  write(path.join(project,'src/styles.css'),nextCss);
  const updatedUrl=await waitFor(async()=>{const href=await evaluate(editor,`document.querySelector('#bingo-project-compiled-css').href`);return href!==cssUrl&&href},'rebuilt project stylesheet');
  await waitFor(()=>evaluate(editor,`getComputedStyle(document.querySelector('[data-probe=root]')).fontFamily==='Courier, monospace'&&document.querySelector('#bingo-project-inherited-style').dataset.ready==='true'`),'updated inherited styles');
  await waitFor(()=>evaluate(editor,`(()=>{const doc=document.querySelector('iframe[data-responsive-preview]').contentDocument;return doc.defaultView.getComputedStyle(doc.querySelector('[data-probe=root]')).fontFamily==='Courier, monospace'&&doc.querySelector('#bingo-project-inherited-style').dataset.ready==='true'})()`),'updated floating styles');
  await waitFor(()=>evaluate(browser.webContents,`(()=>{const doc=document.querySelector('iframe[data-responsive-preview]').contentDocument;return doc.defaultView.getComputedStyle(doc.querySelector('[data-probe=root]')).fontFamily==='Courier, monospace'&&doc.querySelector('#bingo-project-inherited-style').dataset.ready==='true'})()`),'updated browser styles');
  const updatedCss=Buffer.from(updatedUrl.slice(updatedUrl.indexOf(',')+1),'base64').toString('utf8');
  await evaluate(standalone.webContents,`document.querySelector('style').textContent=${JSON.stringify(updatedCss)}`);
  report.refreshed={};
  for (const surface of ['canvas','floating','browser']) {
   const surfaceWC=surface==='browser'?browser.webContents:editor;
   const prefix=surface==='canvas'?'document':`document.querySelector('iframe[data-responsive-preview]').contentDocument`;
   const dimensions=await evaluate(surfaceWC,`(()=>{const doc=${prefix};return [doc.defaultView.innerWidth,doc.defaultView.innerHeight]})()`);
   standalone.setContentSize(...dimensions);
   await evaluate(standalone.webContents,'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
   const actual=await evaluate(surfaceWC,`(${inspect})(${prefix})`),expected=await evaluate(standalone.webContents,`(${inspect})(document)`);
   report.refreshed[surface]={dimensions,actual,expected};
   assert.deepEqual(actual,expected,`${surface} follows refreshed CSS at its own viewport`);
   check(`${surface} follows refreshed CSS and media queries at its own viewport`,true);
  }
  await evaluate(editor,`document.querySelector('iframe[data-responsive-preview]').style.width='480px'`);
  await waitFor(()=>evaluate(editor,`(()=>{const doc=document.querySelector('iframe[data-responsive-preview]').contentDocument;return doc.defaultView.innerWidth===480&&doc.querySelector('#bingo-project-inherited-style').dataset.ready==='true'&&doc.defaultView.getComputedStyle(doc.querySelector('[data-probe=root]')).fontSize==='22px'})()`),'preview viewport baseline refresh');
  standalone.setContentSize(480,600);
  await evaluate(standalone.webContents,'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  assert.deepEqual(await evaluate(editor,`(${inspect})(document.querySelector('iframe[data-responsive-preview]').contentDocument)`),await evaluate(standalone.webContents,`(${inspect})(document)`));
  check('Changing the preview viewport recomputes project inheritance without changing instance styles',true);
  write(path.join(project,'src/styles.css'),'@import "tailwindcss";\n'+nextCss);
  const tailwindUrl=await waitFor(async()=>{const href=await evaluate(editor,`document.querySelector('#bingo-project-compiled-css').href`);return href!==updatedUrl&&href},'compiled Tailwind project stylesheet');
  await waitFor(()=>evaluate(editor,`getComputedStyle(document.querySelector('[data-probe=variant]')).display==='flex'&&document.querySelector('#bingo-project-inherited-style').dataset.ready==='true'`),'project Tailwind utilities');
  await waitFor(()=>evaluate(editor,`(()=>{const doc=document.querySelector('iframe[data-responsive-preview]').contentDocument;return doc.defaultView.getComputedStyle(doc.querySelector('[data-probe=variant]')).display==='flex'&&doc.querySelector('#bingo-project-inherited-style').dataset.ready==='true'})()`),'floating Tailwind styles');
  await waitFor(()=>evaluate(browser.webContents,`(()=>{const doc=document.querySelector('iframe[data-responsive-preview]').contentDocument;return doc.defaultView.getComputedStyle(doc.querySelector('[data-probe=variant]')).display==='flex'&&doc.querySelector('#bingo-project-inherited-style').dataset.ready==='true'})()`),'browser Tailwind styles');
  const tailwindCss=Buffer.from(tailwindUrl.slice(tailwindUrl.indexOf(',')+1),'base64').toString('utf8');
  write(path.join(directory,'compiled-tailwind.css'),tailwindCss);
  await evaluate(standalone.webContents,`document.querySelector('style').textContent=${JSON.stringify(tailwindCss)}`);
  report.tailwind={};
  for(const surface of ['canvas','floating','browser']){
   const surfaceWC=surface==='browser'?browser.webContents:editor;
   const prefix=surface==='canvas'?'document':`document.querySelector('iframe[data-responsive-preview]').contentDocument`;
   const dimensions=await evaluate(surfaceWC,`(()=>{const doc=${prefix};return [doc.defaultView.innerWidth,doc.defaultView.innerHeight]})()`);
   standalone.setContentSize(...dimensions);
   await evaluate(standalone.webContents,'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
   const actual=await evaluate(surfaceWC,`(${inspect})(${prefix})`),expected=await evaluate(standalone.webContents,`(${inspect})(document)`);
   report.tailwind[surface]={dimensions,actual,expected};
   assert.deepEqual(actual,expected,`${surface} matches the project's own Tailwind reset and utilities`);
   check(`${surface} matches the project's own Tailwind reset, tokens and shadow composition`,true);
  }
  assert.deepEqual(toWire(ensureV2(JSON.parse(fs.readFileSync(pageFile)).canvas.elements)),toWire(fixture));
  report.passed=true;
 }catch(error){report.failure=error.stack;console.error(error)}
 finally{clearTimeout(timeout);standalone?.destroy();browser?.destroy();write(path.join(output,'css-parity-report.json'),report);console.log('CSS parity report',report.differences.length,'differences',directory);app.exit(report.passed?0:1)}
});
