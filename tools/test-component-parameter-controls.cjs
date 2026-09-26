/* Source annotations -> actual inspector -> persistence/source and agent IPC.
 * All files and preferences belong to a newly created temporary project. */
const { app, BrowserWindow, webContents, ipcMain } = require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..'),output=path.join(repo,'output/component-instance-editing');
const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'bingo-parameter-controls-'))),project=path.join(directory,'project'),data=path.join(directory,'data');
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value))};
write(path.join(project,'package.json'),{name:'parameter-controls-test',type:'module',dependencies:{react:'19.2.8','react-dom':'19.2.8'}});
fs.symlinkSync(path.join(repo,'node_modules'),path.join(project,'node_modules'));
const definition=path.join(project,'src/Meter.tsx');
const source=`import type {CSSProperties} from 'react';
type Props={
 /** Fill amount.
  * @editorLabel 进度 Progress
  * @editorGroup state
  * @editorOrder 10
  * @editorMin 0
  * @editorMax 1
  * @editorStep 0.1
  */
 progress?:number;
 /** Accent color.
  * @editorLabel 强调色 Accent
  * @editorGroup appearance
  * @editorControl color
  */
 accent?:string|null;
 /** Optional visibility.
  * @editorGroup state
  * @editorOrder 5
  */
 enabled?:boolean|null;
 /**
  * @editorStep -1
  */
 broken?:number;
 label?:string;
 style?:CSSProperties;
};
const checkedAccent=(accent:string|null,label:string)=>{if(accent==='#ff00ff'||accent==='#00ff00'&&label==='Other')throw new Error('Rejected color preview');return accent};
export function Meter({progress=0.5,accent='var(--brand, #336699)',enabled,label='Meter',style}:Props){return <div data-meter data-progress={progress} data-accent={checkedAccent(accent,label)} data-enabled={String(enabled)} style={{color:accent??undefined,padding:8,...style}}>{label}</div>}`;
write(definition,source);
const call='<Meter progress={0.5} label="Meter" />';
const pageSource=`import {Meter} from './Meter'; export function Page(){return ${call}}`;
const callFile=path.join(project,'src/Page.tsx');write(callFile,pageSource);
const binding={schemaVersion:1,filePath:'src/Page.tsx',sourceHash:crypto.createHash('sha256').update(pageSource).digest('hex'),start:pageSource.indexOf(call),end:pageSource.indexOf(call)+call.length,tag:'Meter',openingSource:call,baseProps:{progress:0.5,label:'Meter'},baseStyles:{}};
const pageId=crypto.randomUUID(),pageFile=path.join(project,'.bingo/design/pages',pageId+'.json');
write(path.join(project,'.bingo/design/manifest.json'),{schemaVersion:1,documentId:crypto.randomUUID(),pages:[{id:pageId}]});
write(pageFile,{schemaVersion:1,id:pageId,name:'Parameter controls',canvas:{zoom:1,pan:{x:30,y:50},elements:[{id:'frame',type:'html',tag:'div',styles:{width:500,height:220,padding:20},children:[{id:'meter',type:'component',componentName:'Meter',props:{progress:0.5,label:'Meter'},styles:{},componentEditing:{schemaVersion:1,sourceBinding:binding}},{id:'other',type:'component',componentName:'Meter',props:{progress:0.8,enabled:false,label:'Other'},styles:{}}]}]},newClasses:[]});
write(path.join(data,'preferences.json'),{schemaVersion:1,localePreference:'zh-CN'});
write(path.join(data,'local-projects.json'),[{id:project,rootPath:project,canonicalRoot:project,name:'Parameter controls QA',addedAt:Date.now()}]);
app.commandLine.appendSwitch('user-data-dir',data);
const report={directory,checks:[],scope:'Actual Electron parameter inspector, native keyboard/pointer color gestures, source save and production agent IPC; isolated project only.'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const evaluate=(wc,code)=>{wc.setBackgroundThrottling(false);return wc.executeJavaScript(code,true)};
async function waitFor(fn,label){const start=Date.now();while(Date.now()-start<30000){const result=await fn();if(result)return result;await sleep(50)}throw Error('Timed out: '+label)}
const check=(label,value)=>{assert.ok(value,label);report.checks.push(label);console.log('PASS',label)};
require(path.join(repo,'out/main/index.js'));
const timeout=setTimeout(()=>{report.failure='Parameter controls QA timeout';write(path.join(output,'parameter-controls-report.json'),report);app.exit(1)},180000);
app.whenReady().then(async()=>{
 let editor;
 try{
  const win=await waitFor(()=>BrowserWindow.getAllWindows().find(w=>!w.isDestroyed()),'window');win.setSize(1450,980);win.show();
  await waitFor(()=>evaluate(win.webContents,'!!document.querySelector(".project-titlebar")').catch(()=>false),'shell');
  await evaluate(win.webContents,`window.api.invoke('project-tabs:open',{projectId:${JSON.stringify(project)}})`);
  editor=await waitFor(()=>webContents.getAllWebContents().find(w=>{try{return new URL(w.getURL()).searchParams.get('projectTab')===project}catch{return false}}),'editor');
  await require('./editor-test-foreground.cjs').foregroundEditor(editor);
  await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-element-id=meter] [data-meter]")'),'component');
  const key=async(keyCode,modifiers=[])=>{editor.sendInputEvent({type:'keyDown',keyCode,modifiers});if(['Space','Enter'].includes(keyCode))editor.sendInputEvent({type:'char',keyCode:keyCode==='Space'?' ':'\r',modifiers});editor.sendInputEvent({type:'keyUp',keyCode,modifiers});await sleep(120)};
  if(await evaluate(editor,'localStorage.getItem("bingo-editor-mode")!=="design"'))await key('j',['meta']);
  const select=async(id,add=false)=>{await evaluate(editor,`document.querySelector('[data-canvas-content] [data-element-id=${id}]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100,shiftKey:${add}}));true`);await sleep(180)};
  const field=name=>`[data-component-prop=${name}]`;
  const click=async selector=>{await evaluate(editor,`document.querySelector(${JSON.stringify(selector)}).click();true`);await sleep(180)};
  const focus=selector=>evaluate(editor,`document.querySelector(${JSON.stringify(selector)}).focus();true`);
  const input=async(name,value)=>{await focus(field(name)+' input:not([type=color])');await evaluate(editor,'document.activeElement.select()');await editor.insertText(value);await key('Enter')};
  const flush=async()=>{await evaluate(editor,`window.__controlsSaved=false;(()=>{const pending=[];window.dispatchEvent(new CustomEvent('bingo:prepare-project-close',{detail:{pending}}));Promise.all(pending).then(()=>window.__controlsSaved=true,error=>window.__controlsSaved=String(error))})();true`);assert.equal(await waitFor(()=>evaluate(editor,'window.__controlsSaved'),'flush'),true);return JSON.parse(fs.readFileSync(pageFile)).canvas.elements.byId};
  const undo=async()=>{await evaluate(editor,'document.activeElement.blur()');await key('z',['meta'])};
  await select('meter');await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-component-color-picker]")'),'annotated controls');
  const groups=await evaluate(editor,`[...document.querySelectorAll('[data-component-parameter-group]')].map(e=>({group:e.dataset.componentParameterGroup,fields:[...e.querySelectorAll('[data-component-prop]')].map(f=>f.dataset.componentProp)}))`);
  assert.deepEqual(groups,[{group:'appearance',fields:['accent']},{group:'state',fields:['enabled','progress']},{group:'other',fields:['broken','label']}]);
  check('Source groups and explicit ordering reach the real inspector',true);
  check('Friendly label, description and numeric constraints are visible',await evaluate(editor,`document.querySelector('[data-component-prop=progress]').textContent.includes('进度 Progress')&&document.querySelector('[data-component-prop=progress]').textContent.includes('Fill amount.')&&(()=>{const e=document.querySelector('[data-component-prop=progress] input');return e.min==='0'&&e.max==='1'&&e.step==='0.1'})()`));
  const ax=(await editor.debugger.sendCommand('Accessibility.getFullAXTree')).nodes.find(n=>!n.ignored&&n.role?.value==='spinbutton'&&n.name?.value==='进度 Progress');
  check('Assistive technology receives the description and declared range',ax?.description?.value.includes('Fill amount.')&&ax.description.value.includes('0.1'));
  check('Malformed metadata restricts only its own field and shows a diagnostic',await evaluate(editor,`document.querySelector('[data-component-prop=broken] input').disabled&&!!document.querySelector('[data-component-prop=broken] [role=alert]')&&!document.querySelector('[data-component-prop=progress] input').disabled`));
  check('Unknown boolean uses an undetermined state rather than false',await evaluate(editor,`document.querySelector('[data-component-boolean]').getAttribute('aria-checked')==='mixed'`)&&!Object.hasOwn((await flush()).meter.props,'enabled'));
  await click(field('enabled')+' [data-component-boolean-off]');
  check('Unknown boolean can be explicitly set to false', (await flush()).meter.props.enabled===false);
  await focus(field('enabled')+' [data-component-boolean]');await key('Space');
  await waitFor(async()=>(await flush()).meter.props.enabled===true,'boolean keyboard');
  check('Native keyboard toggles the boolean and retains control focus',await evaluate(editor,`document.activeElement===document.querySelector('[data-component-boolean]')`));
  await click(field('enabled')+' [data-component-reset]');
  check('Boolean reset restores absence and unknown state',!Object.hasOwn((await flush()).meter.props,'enabled')&&await evaluate(editor,`document.querySelector('[data-component-boolean]').getAttribute('aria-checked')==='mixed'`));
  await click(field('enabled')+' button[aria-label*="null"]');
  check('Explicit nullable boolean remains distinct from false', (await flush()).meter.props.enabled===null&&await evaluate(editor,`!!document.querySelector('[data-component-prop=enabled] [data-component-null-value]')&&document.querySelector('[data-component-boolean]').getAttribute('aria-checked')==='mixed'`));
  await click(field('enabled')+' [data-component-reset]');
  for(const value of ['1.1','0.15']){
   await input('progress',value);
   check('Number rejects '+value+' without changing the committed value',(await flush()).meter.props.progress===0.5&&await evaluate(editor,`!!document.querySelector('[data-component-prop=progress] [role=alert]')`));
   await key('Escape');
  }
  await input('progress','0');await waitFor(async()=>(await flush()).meter.props.progress===0,'zero');
  check('Declared minimum preserves explicit zero',(await flush()).meter.props.progress===0);
  await undo();await waitFor(async()=>(await flush()).meter.props.progress===0.5,'undo numeric');
  check('One undo restores the committed numeric value',true);
  check('Color hint preserves the original default variable string',await evaluate(editor,`document.querySelector('[data-component-prop=accent] input[type=text]').value==='var(--brand, #336699)'`)&&!Object.hasOwn((await flush()).meter.props,'accent'));
  const openColor=async()=>{await click('[data-component-color-picker]');await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-component-color-dialog]")'),'color dialog')};
  const previewColor=async value=>{await focus('[data-component-color-dialog] input');await evaluate(editor,'document.activeElement.select()');await editor.insertText(value);await key('Enter')};
  const canvasColor=()=>evaluate(editor,`document.querySelector('[data-element-id=meter] [data-meter]')?.dataset.accent`);
  await openColor();
  check('An unresolved color reference stays visible in the picker without inventing its resolved color',await evaluate(editor,`document.querySelector('[data-component-color-dialog]').textContent.includes('var(--brand, #336699)')&&document.querySelector('[data-component-color-apply]').disabled`));
  await click('[data-component-color-cancel]');
  check('Opening and cancelling the picker preserves the default variable and missing prop',!Object.hasOwn((await flush()).meter.props,'accent')&&await canvasColor()==='var(--brand, #336699)');
  await click(field('accent')+' button[aria-label*="null"]');await openColor();await previewColor('112233');await click('[data-component-color-cancel]');
  check('Cancelling a color preview restores explicit null instead of a fallback color',(await flush()).meter.props.accent===null&&await evaluate(editor,`!!document.querySelector('[data-component-prop=accent] [data-component-null-value]')`));
  await click(field('accent')+' [data-component-set-empty]');await openColor();await previewColor('112233');await click('[data-component-color-cancel]');
  check('Cancelling also preserves an explicit empty string',(await flush()).meter.props.accent==='');
  await click(field('accent')+' [data-component-reset]');
  await input('accent','var(--custom, #123456)');await waitFor(async()=>(await flush()).meter.props.accent==='var(--custom, #123456)','color variable');
  check('Color string edits preserve references and create no style override',Object.keys((await flush()).meter.styles).length===0);
  await openColor();await previewColor('112233');await waitFor(async()=>await canvasColor()==='#112233','live color preview');
  check('Color candidates preview on the real canvas without persisting',(await flush()).meter.props.accent==='var(--custom, #123456)');
  const track=await evaluate(editor,`(()=>{const r=document.querySelector('[data-component-color-dialog] .cursor-crosshair').getBoundingClientRect();return{x:Math.round(r.x+r.width*.3),y:Math.round(r.y+r.height*.4),x2:Math.round(r.x+r.width*.7),y2:Math.round(r.y+r.height*.65)}})()`);
  editor.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,x:track.x,y:track.y});await sleep(100);
  const firstDrag=await canvasColor();
  editor.sendInputEvent({type:'mouseMove',button:'left',x:track.x2,y:track.y2});await sleep(100);
  const lastDrag=await canvasColor();
  editor.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:track.x2,y:track.y2});await sleep(100);
  check('Native pointer dragging updates the live color without publishing intermediate values',firstDrag!==lastDrag&&lastDrag?.startsWith('#')&&(await flush()).meter.props.accent==='var(--custom, #123456)');
  await sleep(3200);
  check('A validated color draft stays visible without timing out during user inspection',await canvasColor()===lastDrag&&await evaluate(editor,`!document.querySelector('[data-component-preview-status=failed]')`));
  await click('[data-component-color-apply]');await waitFor(async()=>(await flush()).meter.props.accent===lastDrag,'color commit');
  check('Applying the color commits one parameter and no CSS override',Object.keys((await flush()).meter.styles).length===0);
  await undo();await waitFor(async()=>(await flush()).meter.props.accent==='var(--custom, #123456)','undo color');
  check('One undo restores the original variable string after the complete drag gesture',true);
  await openColor();await previewColor('223344');await key('Escape');
  await waitFor(()=>evaluate(editor,'!document.querySelector("[data-component-color-dialog]")'),'Escape color');
  check('Escape restores the original variable without writing the candidate',await canvasColor()==='var(--custom, #123456)'&&(await flush()).meter.props.accent==='var(--custom, #123456)');
  await openColor();await previewColor('334455');await click('[data-component-color-cancel]');
  check('Cancel also restores focus to the color trigger',await evaluate(editor,`document.activeElement===document.querySelector('[data-component-color-picker]')`)&&await canvasColor()==='var(--custom, #123456)');
  await openColor();await previewColor('334455');await key('z',['meta']);
  check('Undo while previewing cancels the gesture without undoing the preceding edit',!await evaluate(editor,`!!document.querySelector('[data-component-color-dialog]')`)&&(await flush()).meter.props.accent==='var(--custom, #123456)');
  await openColor();await previewColor('334455');
  const outside=await evaluate(editor,`(()=>{const r=document.querySelector('[data-component-prop=progress] input').getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
  editor.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...outside});editor.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...outside});await sleep(150);
  await input('progress','0.6');await waitFor(async()=>(await flush()).meter.props.progress===0.6,'unrelated numeric edit');
  check('Clicking another field cancels the color and does not commit it with that field',(await flush()).meter.props.accent==='var(--custom, #123456)'&&!await evaluate(editor,`!!document.querySelector('[data-component-color-dialog]')`));
  await undo();await waitFor(async()=>(await flush()).meter.props.progress===0.5,'unrelated edit undo');
  await openColor();await previewColor('445566');await select('other');
  await waitFor(()=>evaluate(editor,'!document.querySelector("[data-component-color-dialog]")'),'selection cancels color');
  check('Selection changes cancel the previous instance color draft',(await flush()).meter.props.accent==='var(--custom, #123456)'&&!Object.hasOwn((await flush()).other.props,'accent'));
  await select('meter');await openColor();await previewColor('ff00ff');
  await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-component-preview-status=failed]")'),'failed color');
  check('Render failure retains a repairable color draft without enabling Apply',await evaluate(editor,`document.querySelector('[data-component-color-apply]').disabled`)&&(await flush()).meter.props.accent==='var(--custom, #123456)');
  await previewColor('556677');await waitFor(async()=>await canvasColor()==='#556677','repair color');
  check('A corrected color previews successfully after a rendering failure',await evaluate(editor,`!document.querySelector('[data-component-color-apply]').disabled`));
  await click('[data-component-color-cancel]');
  await select('other',true);
  await openColor();await previewColor('00ff00');await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-component-preview-status=failed]")'),'failed multi color');
  check('One failing multi-selection color prevents all instance writes',(await flush()).meter.props.accent==='var(--custom, #123456)'&&!Object.hasOwn((await flush()).other.props,'accent'));
  await click('[data-component-color-cancel]');
  check('Different boolean values expose a mixed state without choosing false',await evaluate(editor,`document.querySelector('[data-component-boolean]').getAttribute('aria-checked')==='mixed'`));
  await input('progress','0.7');
  await waitFor(async()=>{const s=await flush();return s.meter.props.progress===0.7&&s.other.props.progress===0.7},'multi number');
  check('Same-component multiple selection applies constrained numbers atomically',(await flush()).other.props.label==='Other');
  await undo();await waitFor(async()=>{const s=await flush();return s.meter.props.progress===0.5&&s.other.props.progress===0.8},'multi undo');
  check('One undo restores each instance numeric value',true);
  await select('meter');
  const pending=new Map();ipcMain.on('canvas_tool_result',(event,payload)=>{if(event.sender.id===editor.id&&pending.has(payload.requestId)){pending.get(payload.requestId)(payload.result);pending.delete(payload.requestId)}});
  const agent=(operation,args)=>new Promise((resolve,reject)=>{const requestId=crypto.randomUUID();const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Agent timeout'))},15000);pending.set(requestId,result=>{clearTimeout(timer);resolve(result)});editor.send('canvas_tool_request',{requestId,operationId:crypto.randomUUID(),protocolVersion:1,projectId:project,operation,args})});
  const read=await agent('read_canvas',{canvas_id:pageId,element_id:'meter'});
  const claim=await agent('claim_element',{element_id:'meter',covering_hash:read._coveringReads.meter});assert.ok(!claim.isError,JSON.stringify(claim));
  const claimId=claim.content[0].text.replace('claim_id: ','');
  for(const value of [1.1,0.15]){
   const result=await agent('edit_element',{element_id:'meter',claim_id:claimId,old_string:'progress={0.5}',new_string:`progress={${value}}`});
   check('Production agent entry rejects constrained value '+value,result.isError&&(await flush()).meter.props.progress===0.5);
  }
  await agent('release_element',{claim_id:claimId});
  await key('j',['meta']);await select('meter');
  const code=()=>evaluate(editor,"document.querySelector('.cm-content')?.cmView?.view?.state.doc.toString()");
  await waitFor(async()=>(await code())?.includes('progress={0.5}'),'selection code');
  const originalCode=await code();
  const editCode=async text=>{await evaluate(editor,`(()=>{const view=document.querySelector('.cm-content').cmView.view;view.dispatch({changes:{from:0,to:view.state.doc.length,insert:${JSON.stringify(text)}}});})()`);await sleep(400)};
  await editCode(originalCode.replace('progress={0.5}','progress={0.15}'));
  await evaluate(editor,`document.querySelector('[aria-label="将 JSX 应用到画布"]').click();true`);await sleep(180);
  const codeRejected=await evaluate(editor,`document.body.innerText.includes('outside the indexed API')||document.body.innerText.includes('component API')`);
  await editCode(originalCode);
  check('Actual selection code editor rejects an off-step number',codeRejected&&(await flush()).meter.props.progress===0.5);
  await key('j',['meta']);await select('meter');
  const attempted={...(await flush()).meter,props:{...(await flush()).meter.props,progress:2}};
  const rejected=await evaluate(editor,`window.api.invoke('component-instance:save',{projectId:${JSON.stringify(project)},element:${JSON.stringify(attempted)}})`);
  check('Source backend independently rejects an out-of-range value',rejected.success===false&&fs.readFileSync(callFile,'utf8')===pageSource);
  await input('progress','0.7');await waitFor(async()=>(await flush()).meter.props.progress===0.7,'valid source number');
  await click('[data-save-component-source]');
  await waitFor(()=>fs.readFileSync(callFile,'utf8').includes('progress={0.7}'),'source save');
  const savedSource=fs.readFileSync(callFile,'utf8');
  check('Valid number and color reference save through the actual source action',savedSource.includes('var(--custom, #123456)')&&savedSource.includes('label="Meter"')&&!savedSource.includes('style='));
  await flush();await editor.reload();
  await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-element-id=meter] [data-meter]")').catch(()=>false),'reload');
  await select('meter');await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-component-color-picker]")'),'reopened controls');
  check('Reload restores the constrained number and original color reference',await evaluate(editor,`document.querySelector('[data-component-prop=progress] input').value==='0.7'&&document.querySelector('[data-component-prop=accent] input[type=text]').value==='var(--custom, #123456)'`));
  await openColor();await previewColor('778899');
  write(definition,source.replace('@editorMax 1','@editorMax 0.6').replace('@editorOrder 10','@editorOrder 1'));
  await waitFor(()=>evaluate(editor,`document.querySelector('[data-component-prop=progress] input')?.max==='0.6'`),'metadata refresh');
  check('Changed constraints preserve the old instance value and expose a diagnostic',(await flush()).meter.props.progress===0.7&&await evaluate(editor,`!!document.querySelector('[data-component-prop=progress] [role=alert]')`));
  check('Metadata refresh cancels an old-contract color draft without changing its original reference',(await flush()).meter.props.accent==='var(--custom, #123456)'&&!await evaluate(editor,`!!document.querySelector('[data-component-color-dialog]')`));
  check('Updated metadata order reaches the selected parameter group',await evaluate(editor,`document.querySelector('[data-component-parameter-group=state] [data-component-prop]').dataset.componentProp==='progress'`));
  await input('progress','0.8');
  check('New edits use refreshed constraints rather than the cached contract',(await flush()).meter.props.progress===0.7);
  await key('Escape');await input('progress','0.6');await waitFor(async()=>(await flush()).meter.props.progress===0.6,'new valid bound');
  check('A valid correction repairs a value made invalid by a metadata update',true);
  const beforeReadOnly=await flush();await openColor();await previewColor('667788');
  await evaluate(editor,`window.api.invoke('bingo:project-access-set-mode',{projectId:${JSON.stringify(project)},mode:'read-only'})`);
  await waitFor(()=>evaluate(editor,`document.querySelector('[data-component-prop=progress] input').disabled`),'read-only');
  check('Read-only mode disables number, color, boolean and recovery controls',await evaluate(editor,`[...document.querySelectorAll('[data-component-prop] input,[data-component-prop] button')].every(e=>e.disabled)`));
  check('Entering read-only cancels the active color popup and restores the committed canvas',await evaluate(editor,`!document.querySelector('[data-component-color-dialog]')`)&&await canvasColor()===beforeReadOnly.meter.props.accent);
  await click('[data-component-color-picker]');await click('[data-component-boolean-off]');
  check('Disabled color and boolean actions cannot mutate the persisted instances',JSON.stringify(await flush())===JSON.stringify(beforeReadOnly));
  await evaluate(editor,`window.api.invoke('bingo:project-access-set-mode',{projectId:${JSON.stringify(project)},mode:'edit'})`);
  await waitFor(()=>evaluate(editor,`!document.querySelector('[data-component-color-picker]').disabled`),'editable');
  check('Restoring edit mode does not submit a stale color event',JSON.stringify(await flush())===JSON.stringify(beforeReadOnly));
  const handle=await evaluate(editor,`(()=>{const root=document.querySelector('[data-electron-editor]');const r=root.lastElementChild.previousElementSibling.firstElementChild.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+80)}})()`);
  editor.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...handle});editor.sendInputEvent({type:'mouseMove',button:'left',x:handle.x+150,y:handle.y});editor.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:handle.x+150,y:handle.y});await sleep(150);
  for(const locale of ['zh-CN','en']){
   await evaluate(editor,`window.api.invoke('bingo:locale-set',{preference:${JSON.stringify(locale)}})`);await sleep(150);
   editor.setZoomFactor(1.25);await sleep(150);
   const layout=await evaluate(editor,`(()=>{const panel=document.querySelector('[data-component-parameters]');const r=panel.getBoundingClientRect();return{width:r.width,overflow:panel.scrollWidth>panel.clientWidth+1,escaped:[...panel.querySelectorAll('input,button')].filter(e=>{const b=e.getBoundingClientRect();return b.width&& (b.left<r.left-1||b.right>r.right+1)}).map(e=>e.outerHTML)}})()`);
   check(locale+': Unknown boolean, color and grouped controls fit at 250px and 125% zoom',layout.width<=250&&!layout.overflow&&!layout.escaped.length);
   check(locale+': The direct false action remains a readable single word',await evaluate(editor,`(()=>{const range=document.createRange();range.selectNodeContents(document.querySelector('[data-component-boolean-off]'));return range.getClientRects().length===1})()`));
   await openColor();
   const pickerLayout=await evaluate(editor,`(()=>{const e=document.querySelector('[data-component-color-dialog]');const r=e.getBoundingClientRect();return{rect:r.toJSON(),viewport:[innerWidth,innerHeight],scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,inputWidths:[...e.querySelectorAll('input')].map(i=>i.getBoundingClientRect().width)}})()`);
   (report.pickerLayouts??=[]).push({locale,...pickerLayout});
   check(locale+': The picker and its explicit actions fit the viewport',pickerLayout.rect.left>=0&&pickerLayout.rect.right<=pickerLayout.viewport[0]&&pickerLayout.rect.top>=0&&pickerLayout.rect.bottom<=pickerLayout.viewport[1]&&pickerLayout.scrollWidth<=pickerLayout.clientWidth+1&&pickerLayout.inputWidths.every(w=>w>=20));
   fs.writeFileSync(path.join(output,'parameter-color-'+locale+'.png'),(await editor.capturePage()).toPNG());
   await click('[data-component-color-cancel]');
   editor.setZoomFactor(1);
  }
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'parameter-controls.png'),(await editor.capturePage()).toPNG());
  report.passed=true;
 }catch(error){report.failure=error.stack;console.error(error);if(editor){report.text=await evaluate(editor,'document.body.innerText').catch(()=>null);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'parameter-controls-failure.png'),(await editor.capturePage()).toPNG())}}
 finally{clearTimeout(timeout);write(path.join(output,'parameter-controls-report.json'),report);app.exit(report.passed?0:1)}
});
