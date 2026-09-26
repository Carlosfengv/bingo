/* Real selection-code editor and agent canvas IPC entry; isolated project only.
 * This tests the production renderer handler, not MCP authentication/model output. */
const { app, BrowserWindow, webContents, ipcMain } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..'), directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-component-entries-')));
const project = path.join(directory, 'project'), data = path.join(directory, 'data'), output = path.join(repo, 'output/component-instance-editing');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
write(path.join(project, 'package.json'), {name:'component-entries-test',type:'module',dependencies:{react:'19.2.8','react-dom':'19.2.8'}});
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
const sourceFile = path.join(project, 'src/EntryButton.tsx');
write(sourceFile, `import {useLayoutEffect} from 'react';
import type {CSSProperties,ReactNode} from 'react';
let pendingWait:Promise<void>|null=null;
const never=new Promise(()=>{});
const checkedCount=(value:number)=>{
 if(value===-1)throw new Error('Entry render rejected count');
 if(value===-3&&!(window as any).__entryAllowPending){
  if(!pendingWait)pendingWait=new Promise(resolve=>{(window as any).__entryResume=()=>{(window as any).__entryAllowPending=true;pendingWait=null;resolve()}});
  throw pendingWait;
 }
 if(value===-4)throw never;
 return value;
};
const requiredChild=(children:ReactNode)=>{if(!children)throw new Error('Entry requires a child');return children};
export function RequiredChild({children}:{children?:ReactNode}){return <div>{requiredChild(children)}</div>}
export function EntryButton({variant='primary', count=0, label='Original', requiredText, style}: {variant?: 'primary'|'secondary'; count?: number; label?: string; requiredText: string; style?: CSSProperties}) {
  useLayoutEffect(()=>{if(count===-2)throw new Error('Entry layout rejected count')},[count]);
  return <button data-variant={variant} data-count={checkedCount(count)} style={{padding:'8px 16px', ...style}}>{label}</button>;
}
export function Opaque({label='Opaque'}: {label?: string}) {return <span>{label}</span>}
export function Complex({label='Complex',options={size:1},items=['one'],opaque}: {label?:string;options?:{size:number};items?:string[];opaque?:unknown}) {
 return <span data-options={JSON.stringify(options)} data-items={JSON.stringify(items)}>{label}</span>;
}`);
const pageId = crypto.randomUUID(), pageFile = path.join(project, '.bingo/design/pages', pageId + '.json');
write(path.join(project, '.bingo/design/manifest.json'), {schemaVersion:1,documentId:crypto.randomUUID(),pages:[{id:pageId}]});
write(pageFile, {schemaVersion:1,id:pageId,name:'Entry validation',canvas:{zoom:1,pan:{x:30,y:50},elements:[{id:'frame',type:'html',tag:'div',styles:{width:500,height:250,padding:24,display:'flex',gap:24},children:[
  {id:'entry-a',type:'component',componentName:'EntryButton',props:{variant:'primary',count:0,label:'Original',requiredText:'Required'},styles:{borderRadius:'12px'}},
  {id:'opaque',type:'component',componentName:'Opaque',props:{label:'Opaque'},styles:{}},
  {id:'complex-entry',type:'component',componentName:'Complex',props:{label:'Complex',options:{size:1},items:['one'],opaque:'Keep'},styles:{}},
  {id:'bound-entry',type:'component',componentName:'EntryButton',props:{label:'Bound original',requiredText:'Required'},styles:{},sourceExpressions:{props:{count:'count={runtimeCount}'},spread:false,attributes:[{name:'label'},{name:'requiredText'},{name:'count',code:'count={runtimeCount}'}]}},
  {id:'required-host',type:'component',componentName:'RequiredChild',props:{},styles:{},children:[{id:'required-child',type:'html',tag:'span',props:{},styles:{},children:[{id:'required-text',type:'text',text:'Required child'}]}]},
  {id:'reorder-group',type:'html',tag:'div',styles:{display:'flex',gap:8},children:['left','right'].map(side=>({
   id:'reorder-'+side,type:'component',componentName:'EntryButton',props:{key:side,label:side,requiredText:'Required'},styles:{borderRadius:'12px'},
   componentEditing:{schemaVersion:1,identity:{sourcePath:'src/EntryButton.tsx',exportName:'EntryButton'},styleRecords:{borderRadius:{target:'root',scope:'base',origin:side==='left'?'source':'editor',rootTag:'button'}}},
  }))},
]}]},newClasses:[]});
write(path.join(data,'preferences.json'),{schemaVersion:1,localePreference:'zh-CN'});
write(path.join(data,'local-projects.json'),[{id:project,rootPath:project,canonicalRoot:project,name:'Entry validation QA',addedAt:Date.now()}]);
app.commandLine.appendSwitch('user-data-dir',data);
const report={directory,scope:'Actual selection code UI and production agent renderer IPC; not an MCP authentication or model test.',checks:[],errors:[]};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const evaluate=(wc,code)=>{wc.setBackgroundThrottling(false);return wc.executeJavaScript(code,true)};
const invoke=(wc,channel,args)=>evaluate(wc,`window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const check=(label,value)=>{assert.ok(value,label);report.checks.push(label);console.log('PASS',label)};
async function waitFor(fn,label){const start=Date.now();while(Date.now()-start<30000){const value=await fn();if(value)return value;await sleep(50)}throw Error('Timed out: '+label)}
require(path.join(repo,'out/main/index.js'));
const timeout=setTimeout(()=>{report.failure='Entry QA timeout';write(path.join(output,'editing-entries-report.json'),report);app.exit(1)},180000);
app.whenReady().then(async()=>{
 let editor;
 try{
  const win=await waitFor(()=>BrowserWindow.getAllWindows().find(w=>!w.isDestroyed()),'shell');win.setSize(1500,980);win.show();
  await waitFor(()=>evaluate(win.webContents,'!!document.querySelector(".project-titlebar")').catch(()=>false),'shell UI');
  await invoke(win.webContents,'project-tabs:open',{projectId:project});
  editor=await waitFor(()=>webContents.getAllWebContents().find(wc=>{try{return new URL(wc.getURL()).searchParams.get('projectTab')===project}catch{return false}}),'editor');
  await require('./editor-test-foreground.cjs').foregroundEditor(editor);
  await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-element-id=entry-a] button")'),'component');
  const key=(code,modifiers=[])=>{editor.focus();editor.sendInputEvent({type:'keyDown',keyCode:code,modifiers});editor.sendInputEvent({type:'keyUp',keyCode:code,modifiers})};
  if(await evaluate(editor,'(localStorage.getItem("bingo-editor-mode")||"dev")!=="dev"'))key('j',['meta']);
  const select=async id=>{await evaluate(editor,`document.querySelector('[data-canvas-content] [data-element-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}));true`);await sleep(150)};
  const code=()=>evaluate(editor,"document.querySelector('.cm-content')?.cmView?.view?.state.doc.toString()");
  const edit=async text=>{await evaluate(editor,`(() => { const v = document.querySelector('.cm-content').cmView.view; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(text)} } }); })()`);await sleep(400)};
  const apply=()=>evaluate(editor,`document.querySelector('[aria-label="将 JSX 应用到画布"]').click();true`);
  const persisted=()=>JSON.parse(fs.readFileSync(pageFile)).canvas.elements.byId;
  const flush=async()=>{await evaluate(editor,`window.__entriesSaved=false;(()=>{const pending=[];window.dispatchEvent(new CustomEvent('bingo:prepare-project-close',{detail:{pending}}));Promise.all(pending).then(()=>window.__entriesSaved=true,error=>window.__entriesSaved=String(error))})();true`);const result=await waitFor(()=>evaluate(editor,'window.__entriesSaved'),'flush');assert.equal(result,true);return persisted()};
  await select('entry-a');await waitFor(async()=>(await code())?.includes('EntryButton'),'selection code');
  const originalCode=await code(),baseline=await flush();
  report.originalInstances=baseline;
  for(const [name,next,fragment] of [
   ['invalid variant',originalCode.replace('variant="primary"','variant="missing"'),'outside the indexed API'],
   ['wrong number type',originalCode.replace('count={0}','count="12"'),'outside the indexed API'],
   ['missing required parameter',originalCode.replace(/\srequiredText="Required"/,''),'requires requiredText'],
   ['nonprimitive string',originalCode.replace('label="Original"','label={{}}'),'outside the indexed API'],
  ]){
   assert.notEqual(next,originalCode,name+' fixture changed');await edit(next);await apply();
   check('Code entry rejects '+name+' with visible feedback',await evaluate(editor,`document.body.innerText.includes(${JSON.stringify(fragment)}) && document.querySelector('[data-element-id=entry-a] button')?.textContent==='Original'`));
   assert.deepEqual(persisted(),baseline);
  }
  for(const [count,message] of [[-1,'Entry render rejected count'],[-2,'Entry layout rejected count']]){
   await edit(originalCode.replace('count={0}',`count={${count}}`));await apply();
   await waitFor(()=>evaluate(editor,`document.body.innerText.includes(${JSON.stringify(message)})`),'code runtime rejection');
   await sleep(150);
   check('Code runtime rejection preserves the committed instance: '+message,JSON.stringify(persisted()['entry-a'])===JSON.stringify(baseline['entry-a'])&&await evaluate(editor,`document.querySelector('[data-element-id=entry-a] button')?.dataset.count==='0'`));
  }
  await edit(originalCode.replace('label="Original"','label="Code edit"'));await apply();
  await waitFor(async()=>(await flush())['entry-a'].props.label==='Code edit','valid code commit');
  check('Corrected code commits supported parameters without changing other instance values',(await flush())['entry-a'].props.count===0);
  await evaluate(editor,'document.activeElement.blur()');key('z',['meta']);await waitFor(async()=>(await flush())['entry-a'].props.label==='Original','code undo');
  check('One undo restores the code edit; rejected drafts create no history entries',true);
  await waitFor(async()=>(await code())?.includes('Original'),'code after undo');
  await edit((await code()).replace('12px','18px'));await apply();
  await waitFor(async()=>(await flush())['entry-a'].styles.borderRadius==='18px','code style');
  let state=await flush();
  check('Code style edits record editor provenance and the verified root contract',state['entry-a'].componentEditing.styleRecords.borderRadius.origin==='editor'&&state['entry-a'].componentEditing.styleRecords.borderRadius.rootTag==='button');
  await evaluate(editor,'document.activeElement.blur()');key('z',['meta']);await waitFor(async()=>(await flush())['entry-a'].styles.borderRadius==='12px','style undo');
  await select('opaque');await waitFor(async()=>(await code())?.includes('<Opaque'),'opaque code');
  const opaqueCode=await code();await edit(opaqueCode.replace('<Opaque','<Opaque style={{width: 123}}'));await apply();
  check('Code entry rejects unsupported root styles',await evaluate(editor,`document.body.innerText.includes('no verified root style target')`));
  assert.deepEqual(persisted().opaque,baseline.opaque);
  await edit(opaqueCode);await select('entry-a');
  const pending=new Map();ipcMain.on('canvas_tool_result',(event,payload)=>{if(event.sender.id===editor.id&&pending.has(payload.requestId)){pending.get(payload.requestId)(payload.result);pending.delete(payload.requestId)}});
  const agent=(operation,args,operationId=crypto.randomUUID())=>new Promise((resolve,reject)=>{const requestId=crypto.randomUUID();const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Agent IPC timeout '+operation))},15000);pending.set(requestId,result=>{clearTimeout(timer);resolve(result)});editor.send('canvas_tool_request',{requestId,operationId,protocolVersion:1,projectId:project,operation,args})});
  const claim=async id=>{const read=await agent('read_canvas',{canvas_id:pageId,element_id:id});const result=await agent('claim_element',{element_id:id,covering_hash:read._coveringReads[id]});assert.ok(!result.isError,JSON.stringify(result));return result.content[0].text.replace('claim_id: ','')};
  let claimId=await claim('entry-a');
  let result=await agent('edit_element',{element_id:'entry-a',claim_id:claimId,old_string:'variant="primary"',new_string:'variant="missing"'});
  check('Agent entry rejects the same invalid variant and reports no commit',result.isError&&result.structuredContent.operation.applied===false&&result.structuredContent.designDiagnostics.some(d=>d.code==='INVALID_COMPONENT_VARIANT'));
  assert.deepEqual((await flush())['entry-a'],baseline['entry-a']);
  for(const [count,message] of [[-1,'Entry render rejected count'],[-2,'Entry layout rejected count']]){
   result=await agent('edit_element',{element_id:'entry-a',claim_id:claimId,old_string:'count={0}',new_string:`count={${count}}`});
   check('Agent runtime rejection reports no applied operation: '+message,result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes(message));
   assert.deepEqual((await flush())['entry-a'],baseline['entry-a']);
   check('Agent failure restores the last successful component and persisted data: '+count,await evaluate(editor,`document.querySelector('[data-element-id=entry-a] button')?.dataset.count==='0'`));
  }
  result=await agent('update_element',{element_id:'entry-a',claim_id:claimId,jsx:'<EntryButton requiredText="Required" count={-1} />'});
  check('Whole-component replacement uses the same runtime validation',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('Entry render rejected count'));
  assert.deepEqual(await flush(),baseline);
  result=await agent('add_to_canvas',{canvas_id:pageId,jsx:'<EntryButton requiredText="Added" count={-1} />'});
  check('Adding a new top-level component rejects a runtime failure before publication',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('Entry render rejected count'));
  assert.deepEqual(await flush(),baseline);
  const hostClaim=await claim('required-host');
  result=await agent('delete_element',{element_id:'required-child',claim_id:hostClaim});
  check('Deleting a child validates the affected component parent and preserves it on failure',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('Entry requires a child'));
  assert.deepEqual(await flush(),baseline);await agent('release_element',{claim_id:hostClaim});
  result=await agent('edit_element',{element_id:'entry-a',claim_id:claimId,old_string:'count={0}',new_string:'count={-4}'});
  check('A suspended component times out without an applied operation',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('PREVIEW_TIMEOUT'));
  assert.deepEqual(await flush(),baseline);
  await evaluate(editor,'window.__entryAllowPending=false;window.__entryResume=undefined');
  const releasedEdit=agent('edit_element',{element_id:'entry-a',claim_id:claimId,old_string:'count={0}',new_string:'count={-3}'});
  await waitFor(()=>evaluate(editor,'typeof window.__entryResume==="function"'),'suspended edit');
  await agent('release_element',{claim_id:claimId});await evaluate(editor,'window.__entryResume()');
  result=await releasedEdit;
  check('A released claim prevents publication after an asynchronous preview succeeds',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('claim changed'));
  assert.deepEqual(await flush(),baseline);claimId=await claim('entry-a');
  await evaluate(editor,'window.__entryAllowPending=false;window.__entryResume=undefined');
  const sharedOperationId=crypto.randomUUID(),sameEdit={element_id:'entry-a',claim_id:claimId,old_string:'count={0}',new_string:'count={-3}'};
  const duplicateA=agent('edit_element',sameEdit,sharedOperationId);
  await waitFor(()=>evaluate(editor,'typeof window.__entryResume==="function"'),'deduplicated preview');
  const duplicateB=agent('edit_element',sameEdit,sharedOperationId);await sleep(80);await evaluate(editor,'window.__entryResume()');
  const duplicateResults=await Promise.all([duplicateA,duplicateB]);
  check('Repeated operation IDs share one pending preview and one successful result',duplicateResults.every(r=>!r.isError&&r.structuredContent.operation.applied)&&JSON.stringify(duplicateResults[0])===JSON.stringify(duplicateResults[1]));
  await evaluate(editor,'document.activeElement.blur()');key('z',['meta']);await waitFor(async()=>(await flush())['entry-a'].props.count===0,'deduplicated undo');
  assert.deepEqual(await flush(),baseline);
  check('One undo restores a deduplicated asynchronous operation exactly',true);
  result=await agent('edit_element',{element_id:'entry-a',claim_id:claimId,old_string:'label="Original"',new_string:'label="Agent edit"'});
  check('Agent entry accepts a supported parameter update',!result.isError&&result.structuredContent.operation.applied===true);
  await waitFor(async()=>(await flush())['entry-a'].props.label==='Agent edit','agent commit');
  await agent('release_element',{claim_id:claimId});
  await evaluate(editor,'document.activeElement.blur()');key('z',['meta']);await waitFor(async()=>(await flush())['entry-a'].props.label==='Original','agent undo');
  check('Agent parameter edits use the normal canvas undo history',true);
  const styleClaim=await claim('entry-a');
  result=await agent('edit_element',{element_id:'entry-a',claim_id:styleClaim,old_string:'12px',new_string:'20px'});
  assert.ok(!result.isError,JSON.stringify(result));
  await waitFor(async()=>(await flush())['entry-a'].styles.borderRadius==='20px','agent style commit');
  state=await flush();
  check('Agent style edits record the same provenance and root contract as code edits',state['entry-a'].componentEditing.styleRecords.borderRadius.origin==='editor'&&state['entry-a'].componentEditing.styleRecords.borderRadius.rootTag==='button');
  await agent('release_element',{claim_id:styleClaim});
  await evaluate(editor,'document.activeElement.blur()');key('z',['meta']);await waitFor(async()=>(await flush())['entry-a'].styles.borderRadius==='12px','agent style undo');
  check('One undo restores the agent style edit including its metadata',JSON.stringify((await flush())['entry-a'])===JSON.stringify(baseline['entry-a']));
  const opaqueClaim=await claim('opaque');
  result=await agent('edit_element',{element_id:'opaque',claim_id:opaqueClaim,old_string:'<Opaque',new_string:'<Opaque style={{width: 123}}'});
  check('Agent entry rejects unsupported styles with the shared capability diagnostic',result.isError&&result.structuredContent.designDiagnostics.some(d=>d.code==='UNSUPPORTED_COMPONENT_STYLE'));
  await agent('release_element',{claim_id:opaqueClaim});
  const frameClaim=await claim('frame');
  result=await agent('insert_element',{parent_id:'frame',claim_id:frameClaim,jsx:'<EntryButton requiredText="Added" variant="missing" />'});
  check('Agent insertion uses the same parameter validation as updates',result.isError&&result.structuredContent.operation.applied===false);
  result=await agent('insert_element',{parent_id:'frame',claim_id:frameClaim,jsx:'<EntryButton requiredText="Added" count={-1} /><EntryButton requiredText="Other" />'});
  check('A runtime failure rejects an entire multi-component insertion',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('Entry render rejected count'));
  assert.deepEqual(await flush(),baseline);
  result=await agent('insert_element',{parent_id:'frame',claim_id:frameClaim,jsx:'<EntryButton requiredText="Added" style={{borderRadius:"24px"}} />'});
  assert.ok(!result.isError,JSON.stringify(result));
  const addedId=result.structuredContent.operation.createdElementIds[0];
  await waitFor(async()=>(await flush())[addedId],'agent insert');
  const added=(await flush())[addedId];
  check('New agent components record authored styles with a verified root target',added.componentEditing.styleRecords.borderRadius.origin==='editor'&&added.componentEditing.styleRecords.borderRadius.rootTag==='button');
  await agent('release_element',{claim_id:frameClaim});
  await evaluate(editor,'document.activeElement.blur()');key('z',['meta']);await waitFor(async()=>!(await flush())[addedId],'insert undo');
  const inactiveClaim=await claim('entry-a');
  result=await agent('create_page',{name:'Another page'});assert.ok(!result.isError,JSON.stringify(result));
  await waitFor(()=>evaluate(editor,'!document.querySelector("[data-element-id=entry-a]")'),'another active page');
  result=await agent('edit_element',{element_id:'entry-a',claim_id:inactiveClaim,old_string:'label="Original"',new_string:'label="Validated after page activation"'});
  check('An inactive-page component is validated on its real page before commit',!result.isError&&result.structuredContent.operation.applied===true&&await evaluate(editor,`document.querySelector('[data-element-id=entry-a] button')?.textContent==='Validated after page activation'`));
  await agent('release_element',{claim_id:inactiveClaim});
  await evaluate(editor,'document.activeElement.blur()');key('z',['meta']);await waitFor(async()=>(await flush())['entry-a'].props.label==='Original','inactive-page undo');
  assert.deepEqual(await flush(),baseline);
  check('Cross-page preview commits into the correct page and undo restores its original data',true);
  await select('entry-a');
  const proposal=await invoke(editor,'component-style:adapt',{projectId:project,componentName:'EntryButton',kind:'style',mode:'preview'});assert.equal(proposal.success,true);
  const source=fs.readFileSync(sourceFile,'utf8');
  await waitFor(async()=>(await code())?.includes('label="Original"'),'code before read-only');
  await edit((await code()).replace('label="Original"','label="Unapplied code draft"'));
  const accessClaim=await claim('entry-a');
  await evaluate(editor,'window.__entryAllowPending=false;window.__entryResume=undefined');
  const accessPending=agent('edit_element',{element_id:'entry-a',claim_id:accessClaim,old_string:'count={0}',new_string:'count={-3}'});
  await waitFor(()=>evaluate(editor,'typeof window.__entryResume==="function"'),'pending access change');
  await invoke(editor,'bingo:project-access-set-mode',{projectId:project,mode:'read-only'});
  await waitFor(()=>evaluate(editor,'document.querySelector("[data-component-prop=label] input")?.disabled'),'read-only UI');
  check('Read-only mode disables selection JSX editing and apply',await evaluate(editor,`document.querySelector('.cm-content').getAttribute('contenteditable')==='false' && document.querySelector('[aria-label="将 JSX 应用到画布"]').disabled`));
  check('Becoming read-only clears the code preview and disables both adaptation controls',await evaluate(editor,`document.querySelector('[data-element-id=entry-a] button').textContent==='Original' && ['style','theme'].every(kind=>document.querySelector('[data-review-'+kind+'-adapter]')?.disabled)`));
  result=await accessPending;await evaluate(editor,'window.__entryResume()');await sleep(150);
  assert.deepEqual(persisted(),baseline);
  check('A read-only transition rejects an in-flight preview and ignores its late success',result.isError&&result.structuredContent.operation.applied===false&&await evaluate(editor,`document.querySelector('[data-element-id=entry-a] button')?.dataset.count==='0'`));
  result=await agent('edit_element',{element_id:'entry-a',claim_id:claimId,old_string:'Original',new_string:'Forbidden'});
  check('Read-only agent requests are rejected before any canvas mutation',result.isError&&result.content[0].text.includes('read-only')&&result.structuredContent.operation.applied===false);
  result=await invoke(editor,'component-style:adapt',{projectId:project,componentName:'EntryButton',kind:'style',mode:'apply',reviewed:proposal});
  check('The adaptation backend rejects source writes while read-only',result.success===false&&fs.readFileSync(sourceFile,'utf8')===source);
  await assert.rejects(invoke(editor,'bingo:store',{op:'write-file',root:project,rel:'src/EntryButton.tsx',content:'// forbidden'}),/read-only/);
  check('The source editor file-write backend enforces current read-only access',fs.readFileSync(sourceFile,'utf8')===source);
  await invoke(editor,'bingo:project-access-set-mode',{projectId:project,mode:'edit'});
  await waitFor(()=>evaluate(editor,'document.querySelector("[data-component-prop=label] input")?.disabled===false'),'editing restored');
  await agent('release_element',{claim_id:accessClaim});
  await edit(originalCode);
  assert.deepEqual(await flush(),baseline);
  check('The complete entry verification restores all instance data and leaves source unchanged',fs.readFileSync(sourceFile,'utf8')===source);
  const childOrder=()=>JSON.parse(fs.readFileSync(pageFile)).canvas.elements.childrenByParent['reorder-group'];
  const undoStructure=async()=>{
   await evaluate(editor,'document.activeElement?.blur()');key('z',['meta']);
   await waitFor(async()=>{const saved=await flush();return saved['reorder-left'].props.label==='left'&&saved['reorder-right'].props.label==='right'&&childOrder().join(',')==='reorder-left,reorder-right'},'structural undo');
   assert.deepEqual(await flush(),baseline);
  };
  const jsxButton=(side,ids=true,keyed=true,label=side)=>`<EntryButton ${ids?`data-element-id="reorder-${side}"`:''} ${keyed?`key="${side}"`:''} label="${label}" requiredText="Required" style={{borderRadius:"12px"}} />`;
  await select('reorder-group');await waitFor(async()=>(await code())?.includes('key="left"'),'group code');
  await edit(`<div style={{display:"flex",gap:8}}>${jsxButton('right',false,true,'Right edited')}${jsxButton('left',false,true,'Left edited')}</div>`);await apply();
  await waitFor(async()=>(await flush())['reorder-left'].props.label==='Left edited','keyed code reorder');
  state=await flush();
  check('Code reordering with React keys keeps each instance and its override provenance',childOrder().join(',')==='reorder-right,reorder-left'&&state['reorder-left'].componentEditing.styleRecords.borderRadius.origin==='source'&&state['reorder-right'].componentEditing.styleRecords.borderRadius.origin==='editor');
  await undoStructure();check('One undo restores keyed code structure and all instance data',true);
  const structuralClaim=await claim('reorder-group');
  result=await agent('update_element',{element_id:'reorder-group',claim_id:structuralClaim,jsx:`<div data-element-id="reorder-group" style={{display:"flex",gap:8}}>${jsxButton('right',true,true,'Right edited')}${jsxButton('left',true,true,'Left edited')}</div>`});
  assert.ok(!result.isError,JSON.stringify(result));state=await flush();
  check('Agent reordering respects explicit IDs instead of replacing them by sibling position',childOrder().join(',')==='reorder-right,reorder-left'&&state['reorder-left'].props.label==='Left edited'&&state['reorder-right'].props.label==='Right edited');
  assert.deepEqual(state['reorder-left'].componentEditing,baseline['reorder-left'].componentEditing);assert.deepEqual(state['reorder-right'].componentEditing,baseline['reorder-right'].componentEditing);
  check('Agent reordering preserves each instance override record exactly',true);
  await undoStructure();check('One undo restores agent structure and provenance atomically',true);
  result=await agent('update_element',{element_id:'reorder-group',claim_id:structuralClaim,jsx:`<div data-element-id="reorder-group" style={{display:"flex",gap:8}}>${jsxButton('left',false,false,'Changed A')}${jsxButton('right',false,false,'Changed B')}</div>`});
  check('An ambiguous structural edit is rejected with an identity hint and no partial write',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('Cannot safely match'));
  assert.deepEqual(await flush(),baseline);
  result=await agent('update_element',{element_id:'reorder-group',claim_id:structuralClaim,jsx:`<div data-element-id="reorder-group" style={{display:"flex",gap:8}}>${jsxButton('right')}<section>${jsxButton('left',true,true,'Moved')}</section>${jsxButton('left',false,false,'Copy')}</div>`});
  assert.ok(!result.isError,JSON.stringify(result));state=await flush();
  const copy=Object.values(state).find(node=>node.props?.label==='Copy');
  check('Moving a component under a new wrapper keeps its ID and authored override origin',state['reorder-left'].props.label==='Moved'&&state['reorder-left'].componentEditing.styleRecords.borderRadius.origin==='source');
  check('A new similar sibling receives a fresh ID and editor provenance',copy&&copy.id!=='reorder-left'&&copy.componentEditing.styleRecords.borderRadius.origin==='editor'&&!copy.componentEditing.sourceBinding);
  await undoStructure();await agent('release_element',{claim_id:structuralClaim});
  assert.deepEqual(await flush(),baseline);check('Structural entry checks restore every original instance and leave source unchanged',fs.readFileSync(sourceFile,'utf8')===source);
  await select('entry-a');await waitFor(async()=>(await code())?.includes('count={0}'),'code before dynamic binding');
  await edit(originalCode.replace('count={0}','count={runtimeCount}'));await apply();
  await waitFor(()=>evaluate(editor,`document.body.innerText.includes('Cannot change the source binding')`),'code binding rejection');
  assert.deepEqual(persisted(),baseline);
  check('Code entry rejects an unevaluated parameter binding and preserves the current value',await evaluate(editor,`document.querySelector('[data-element-id=entry-a] button').dataset.count==='0'`));
  await edit(originalCode);
  assert.deepEqual(await flush(),baseline);
  const bindingClaim=await claim('entry-a');
  result=await agent('edit_element',{element_id:'entry-a',claim_id:bindingClaim,old_string:'count={0}',new_string:'count={runtimeCount}'});
  check('Agent edit rejects the same unevaluated binding without publishing an operation',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('source binding'));
  await agent('release_element',{claim_id:bindingClaim});
  result=await agent('add_to_canvas',{canvas_id:pageId,jsx:'<EntryButton requiredText="Added" count={runtimeCount} />'});
  check('Agent insertion cannot report success for a parameter expression that the canvas does not execute',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('source binding'));
  assert.deepEqual(await flush(),baseline);
  await select('bound-entry');await waitFor(async()=>(await code())?.includes('runtimeCount'),'existing bound code');
  const boundCode=await code();
  check('An existing dynamic parameter remains visible as a disabled inspector field',await evaluate(editor,`(()=>{const input=document.querySelector('[data-component-prop=count] input');return input.disabled&&input.type==='text'&&input.value==='count={runtimeCount}'})()`));
  await edit(boundCode.replace('Bound original','Bound changed'));await apply();
  await waitFor(async()=>(await flush())['bound-entry'].props.label==='Bound changed','unrelated bound code edit');
  assert.deepEqual((await flush())['bound-entry'].sourceExpressions,baseline['bound-entry'].sourceExpressions);
  check('Code changes to an unrelated static parameter preserve the existing source binding',true);
  await evaluate(editor,'document.activeElement?.blur()');key('z',['meta']);await waitFor(async()=>(await flush())['bound-entry'].props.label==='Bound original','bound code undo');
  const existingBindingClaim=await claim('bound-entry');
  result=await agent('edit_element',{element_id:'bound-entry',claim_id:existingBindingClaim,old_string:'count={runtimeCount}',new_string:'count={1}'});
  check('An agent cannot replace an existing source binding with a static snapshot',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('source binding'));
  result=await agent('edit_element',{element_id:'bound-entry',claim_id:existingBindingClaim,old_string:'Bound original',new_string:'Bound agent changed'});
  assert.ok(!result.isError,JSON.stringify(result));
  check('An agent can change an unrelated static parameter while preserving the binding',(await flush())['bound-entry'].sourceExpressions.props.count==='count={runtimeCount}');
  await agent('release_element',{claim_id:existingBindingClaim});await evaluate(editor,'document.activeElement?.blur()');key('z',['meta']);await waitFor(async()=>(await flush())['bound-entry'].props.label==='Bound original','bound agent undo');
  assert.deepEqual(await flush(),baseline);check('Binding entry verification leaves all original instance data intact',true);
  await select('complex-entry');await waitFor(async()=>(await code())?.includes('<Complex'),'complex code');
  const complexCode=await code();
  check('Complex parameters are read-only and expose their serialized values',await evaluate(editor,`['options','items','opaque'].every(name=>document.querySelector('[data-component-prop="'+name+'"] input').disabled)&&document.querySelector('[data-component-prop=options] input').value==='{"size":1}'&&document.querySelector('[data-component-prop=items] input').value==='["one"]'`));
  const complexJsx='<Complex label="Complex" options={{size:1}} items={["one"]} opaque="Keep" />';
  for(const [name,jsx] of [['object',complexJsx.replace('size:1','size:2')],['array',complexJsx.replace('["one"]','["two"]')],['unknown',complexJsx.replace('opaque="Keep"','opaque="Changed"')],['undeclared',complexJsx.replace('<Complex','<Complex extra="New"')],['remove object',complexJsx.replace(' options={{size:1}}','')]]) {
   await edit(jsx);await apply();await waitFor(()=>evaluate(editor,`document.body.innerText.includes('no supported parameter control')`),'complex rejection '+name);
   assert.deepEqual(persisted(),baseline);check('Code rejects an unsupported parameter edit: '+name,true);
  }
  await edit(complexJsx.replace('label="Complex"','label="Complex edited"'));await apply();await waitFor(async()=>(await flush())['complex-entry'].props.label==='Complex edited','static edit beside complex values');
  state=await flush();assert.deepEqual(state['complex-entry'].props.options,{size:1});assert.deepEqual(state['complex-entry'].props.items,['one']);assert.equal(state['complex-entry'].props.opaque,'Keep');
  check('Supported code edits preserve existing complex and unknown values',true);
  await evaluate(editor,'document.activeElement?.blur()');key('z',['meta']);await waitFor(async()=>(await flush())['complex-entry'].props.label==='Complex','complex code undo');
  const complexClaim=await claim('complex-entry');
  result=await agent('update_element',{element_id:'complex-entry',claim_id:complexClaim,jsx:complexJsx.replace('size:1','size:2')});
  check('Agent replacement obeys the same complex parameter restriction',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('no supported parameter control'));
  result=await agent('edit_element',{element_id:'complex-entry',claim_id:complexClaim,old_string:'opaque="Keep"',new_string:'opaque="Changed"'});
  check('Agent edits cannot bypass unknown-type restrictions',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('no supported parameter control'));
  result=await agent('edit_element',{element_id:'complex-entry',claim_id:complexClaim,old_string:'label="Complex"',new_string:'label="Agent complex edit"'});assert.ok(!result.isError,JSON.stringify(result));
  state=await flush();assert.deepEqual({...state['complex-entry'].props,label:'Complex'},baseline['complex-entry'].props);check('Agent static parameter edits retain complex values unchanged',true);
  await agent('release_element',{claim_id:complexClaim});await evaluate(editor,'document.activeElement?.blur()');key('z',['meta']);await waitFor(async()=>(await flush())['complex-entry'].props.label==='Complex','complex agent undo');
  result=await agent('add_to_canvas',{canvas_id:pageId,jsx:complexJsx});
  check('New instances cannot introduce unsupported complex parameter values',result.isError&&result.structuredContent.operation.applied===false&&result.content[0].text.includes('no supported parameter control'));
  result=await agent('add_to_canvas',{canvas_id:pageId,jsx:'<Complex />'});assert.ok(!result.isError,JSON.stringify(result));
  const defaultComplex=result.structuredContent.operation.createdElementIds[0];
  check('New instances can follow component defaults without materializing complex parameters',!(await flush())[defaultComplex].props?.options);
  await evaluate(editor,'document.activeElement?.blur()');key('z',['meta']);await waitFor(async()=>!(await flush())[defaultComplex],'complex defaults undo');
  assert.deepEqual(await flush(),baseline);check('Complex parameter checks restore all instances and preserve component source',fs.readFileSync(sourceFile,'utf8')===source);
  report.passed=true;
 }catch(error){report.failure=error.stack;console.error(error);if(editor){report.text=await evaluate(editor,'document.body.innerText');fs.writeFileSync(path.join(output,'editing-entries-failure.png'),(await editor.capturePage()).toPNG())}}
 finally{clearTimeout(timeout);write(path.join(output,'editing-entries-report.json'),report);app.exit(report.passed?0:1)}
});
