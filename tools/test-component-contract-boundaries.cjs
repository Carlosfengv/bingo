/* Final clause audit: actual inspector, source save and persisted data, isolated project. */
const {app,BrowserWindow,webContents,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..'),output=path.join(repo,'output/component-instance-editing');
const directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'bingo-contract-boundaries-'))),project=path.join(directory,'project'),data=path.join(directory,'data');
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value))};
write(path.join(project,'package.json'),{name:'contract-boundaries',type:'module',dependencies:{react:'19.2.8','react-dom':'19.2.8'}});
fs.symlinkSync(path.join(repo,'node_modules'),path.join(project,'node_modules'));
const source=`import type {CSSProperties,ReactNode} from 'react';
export function Choice({choice='alpha',amount=0,style,children}:{choice?:'alpha'|'beta'|'gamma'|'delta'|'epsilon'|'zeta'|'eta'|'theta'|'iota'|'kappa'|12|'12';amount?:number;style?:CSSProperties;children?:ReactNode}) {return <div data-choice={choice} data-amount={amount} style={style}>{children}</div>}
export function ClassOnly({className,label='Class only'}:{className?:string;label?:string}) {return <button data-class-only className={className}>{label}</button>}`;
write(path.join(project,'src/Controls.tsx'),source);
const call='<ClassOnly label="Original" className="old" />',pageSource=`import {ClassOnly} from './Controls';export function Page(){return ${call}}`,callFile=path.join(project,'src/Page.tsx');
write(callFile,pageSource);
const sourceBinding={schemaVersion:1,filePath:'src/Page.tsx',sourceHash:crypto.createHash('sha256').update(pageSource).digest('hex'),start:pageSource.indexOf(call),end:pageSource.indexOf(call)+call.length,tag:'ClassOnly',openingSource:call,baseProps:{label:'Original',className:'old'},baseStyles:{}};
const pageId=crypto.randomUUID(),pageFile=path.join(project,'.bingo/design/pages',pageId+'.json');
const identity={sourcePath:'src/Controls.tsx',exportName:'Choice'};
const styleRecord=origin=>({color:{target:'root',scope:'base',origin,rootTag:'div'}});
write(path.join(project,'.bingo/design/manifest.json'),{schemaVersion:1,documentId:crypto.randomUUID(),pages:[{id:pageId}]});
write(pageFile,{schemaVersion:1,id:pageId,name:'Contract boundaries',canvas:{zoom:1,pan:{x:30,y:50},elements:[{id:'frame',type:'html',tag:'div',styles:{width:500,height:300,padding:24},children:[
 {id:'choice',type:'component',componentName:'Choice',props:{choice:'alpha'},styles:{color:'red'},componentEditing:{schemaVersion:1,identity,styleRecords:styleRecord('source')},children:[{id:'choice-text',type:'text',text:'Editable content'}]},
 {id:'other',type:'component',componentName:'Choice',props:{choice:'beta'},styles:{color:'red'},componentEditing:{schemaVersion:1,identity,styleRecords:styleRecord('editor')},children:[{id:'other-text',type:'text',text:'Other'}]},
 {id:'mismatched',type:'component',componentName:'Choice',props:{choice:'gamma'},styles:{color:'red'},componentEditing:{schemaVersion:1,identity:{...identity,sourcePath:'src/Previous.tsx'},styleRecords:styleRecord('editor')},children:[{id:'mismatch-text',type:'text',text:'Unmatched origin'}]},
 {id:'class-only',type:'component',componentName:'ClassOnly',props:{label:'Original',className:'old'},styles:{},componentEditing:{schemaVersion:1,sourceBinding}}
]}]},newClasses:[]});
write(path.join(data,'preferences.json'),{schemaVersion:1,localePreference:'zh-CN'});
write(path.join(data,'local-projects.json'),[{id:project,rootPath:project,canonicalRoot:project,name:'Contract boundaries QA',addedAt:Date.now()}]);
app.commandLine.appendSwitch('user-data-dir',data);
const report={directory,checks:[],scope:'Actual Electron inspector and production agent IPC, exact source writes and persisted data. Independent temporary project.'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const evaluate=(wc,code)=>{wc.setBackgroundThrottling(false);return wc.executeJavaScript(code,true)};
async function waitFor(fn,label){const start=Date.now();while(Date.now()-start<30000){const result=await fn();if(result)return result;await sleep(50)}throw Error('Timed out: '+label)}
const check=(label,value)=>{assert.ok(value,label);report.checks.push(label);console.log('PASS',label)};
require(path.join(repo,'out/main/index.js'));
const timeout=setTimeout(()=>{report.failure='Contract boundaries timeout';write(path.join(output,'contract-boundaries-report.json'),report);app.exit(1)},150000);
app.whenReady().then(async()=>{
 let editor;
 try{
  const win=await waitFor(()=>BrowserWindow.getAllWindows().find(w=>!w.isDestroyed()),'window');win.setSize(1450,980);win.show();
  await waitFor(()=>evaluate(win.webContents,'!!document.querySelector(".project-titlebar")').catch(()=>false),'shell');
  await evaluate(win.webContents,`window.api.invoke('project-tabs:open',{projectId:${JSON.stringify(project)}})`);
  editor=await waitFor(()=>webContents.getAllWebContents().find(w=>{try{return new URL(w.getURL()).searchParams.get('projectTab')===project}catch{return false}}),'editor');
  await require('./editor-test-foreground.cjs').foregroundEditor(editor);
  await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-element-id=choice] [data-choice]")'),'component');
  const key=async(keyCode,modifiers=[])=>{editor.sendInputEvent({type:'keyDown',keyCode,modifiers});if(['Space','Enter'].includes(keyCode))editor.sendInputEvent({type:'char',keyCode:keyCode==='Space'?' ':'\r',modifiers});editor.sendInputEvent({type:'keyUp',keyCode,modifiers});await sleep(120)};
  if(await evaluate(editor,'localStorage.getItem("bingo-editor-mode")!=="design"'))await key('j',['meta']);
  const select=async(id,add=false)=>{await evaluate(editor,`document.querySelector('[data-canvas-content] [data-element-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100,shiftKey:${add}}));true`);await sleep(180)};
  const click=async selector=>{await evaluate(editor,`document.querySelector(${JSON.stringify(selector)}).click();true`);await sleep(180)};
  const input=async(selector,value)=>{await evaluate(editor,`document.querySelector(${JSON.stringify(selector)}).focus();document.activeElement.select();true`);await editor.insertText(value)};
  const flush=async()=>{await evaluate(editor,`window.__auditSaved=false;(()=>{const pending=[];window.dispatchEvent(new CustomEvent('bingo:prepare-project-close',{detail:{pending}}));Promise.all(pending).then(()=>window.__auditSaved=true,error=>window.__auditSaved=String(error))})();true`);assert.equal(await waitFor(()=>evaluate(editor,'window.__auditSaved'),'flush'),true);return JSON.parse(fs.readFileSync(pageFile)).canvas.elements.byId};
  const undo=async()=>{await evaluate(editor,'document.activeElement.blur()');await key('z',['meta'])};
  await select('choice');await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-component-option-search]")'),'enumeration');
  const baseline=await flush();
  await input('[data-component-option-search]','kappa');
  check('Long enumeration search filters labels without changing the current value',await evaluate(editor,`[...document.querySelector('[data-component-prop=choice] select').options].map(o=>o.textContent).join('|').includes('kappa')&&document.querySelector('[data-component-prop=choice] select').options.length===3`)&&(await flush()).choice.props.choice==='alpha');
  await input('[data-component-option-search]','not-found');
  check('No-match search explains that the current value is preserved',await evaluate(editor,`document.querySelector('[data-component-prop=choice]').textContent.includes('没有匹配选项')`)&&(await flush()).choice.props.choice==='alpha');
  await key('Escape');
  check('Escape restores all enum options without creating an edit',await evaluate(editor,`document.querySelector('[data-component-option-search]').value===''&&document.querySelector('[data-component-prop=choice] select').options.length===13`));
  await input('[data-component-option-search]','12');
  await evaluate(editor,`(()=>{const s=document.querySelector('[data-component-prop=choice] select');s.value='10';s.dispatchEvent(new Event('change',{bubbles:true}))})();true`);
  await waitFor(async()=>(await flush()).choice.props.choice===12,'numeric literal');
  check('Filtered option indices preserve a numeric literal rather than its string label',typeof (await flush()).choice.props.choice==='number');
  await undo();await waitFor(async()=>(await flush()).choice.props.choice==='alpha','enum undo');
  await input('[data-component-prop=amount] input','-');
  check('Incomplete number remains a draft without a persisted value',!Object.hasOwn((await flush()).choice.props,'amount'));
  await editor.insertText('.');await editor.insertText('5');await key('Enter');
  await waitFor(async()=>(await flush()).choice.props.amount===-0.5,'negative decimal');
  check('Completing a negative decimal commits the exact unrestricted number',true);
  await undo();await waitFor(async()=>!Object.hasOwn((await flush()).choice.props,'amount'),'numeric undo');
  await select('other',true);
  check('Equal multi-selection style values retain their distinct origins',await evaluate(editor,`document.querySelector('[data-style-override=color]').textContent.includes('多个来源')`));
  await select('mismatched');
  check('Same-name source mismatch visibly restricts parameter writes',await evaluate(editor,`!!document.querySelector('[data-component-identity-mismatch]')&&document.querySelector('[data-component-prop=choice] select').disabled`));
  check('Unavailable override count is separate from the total and does not apply the old style',await evaluate(editor,`document.querySelector('[data-component-inactive-count]').textContent.includes('1')&&document.querySelector('[data-component-overrides]').textContent.includes('1 项属性')&&document.querySelector('[data-element-id=mismatched] [data-choice]').style.color===''`));
  await select('choice',true);
  check('A mixed-identity batch is blocked even when both display names match',await evaluate(editor,`document.querySelector('[data-component-prop=choice] select').disabled`));
  const pending=new Map();ipcMain.on('canvas_tool_result',(event,payload)=>{if(event.sender.id===editor.id&&pending.has(payload.requestId)){pending.get(payload.requestId)(payload.result);pending.delete(payload.requestId)}});
  const agent=(operation,args)=>new Promise((resolve,reject)=>{const requestId=crypto.randomUUID();const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Agent timeout'))},15000);pending.set(requestId,result=>{clearTimeout(timer);resolve(result)});editor.send('canvas_tool_request',{requestId,operationId:crypto.randomUUID(),protocolVersion:1,projectId:project,operation,args})});
  const read=await agent('read_canvas',{canvas_id:pageId,element_id:'mismatched'});
  const claimed=await agent('claim_element',{element_id:'mismatched',covering_hash:read._coveringReads.mismatched});assert.ok(!claimed.isError,JSON.stringify(claimed));
  const claimId=claimed.content[0].text.replace('claim_id: ','');
  const result=await agent('edit_element',{element_id:'mismatched',claim_id:claimId,old_string:'choice="gamma"',new_string:'choice="delta"'});
  check('Production agent entry rejects a recorded source identity mismatch',result.isError&&result.content[0].text.includes('identity changed'));
  await agent('release_element',{claim_id:claimId});
  assert.deepEqual((await flush()).mismatched,baseline.mismatched);
  await select('choice');await select('choice-text');
  check('An independently selected child identifies its owning component',await evaluate(editor,`document.querySelector('[data-component-owner]')?.textContent.includes('Choice')&&!document.querySelector('[data-component-parameters]')`));
  if(!await evaluate(editor,`!!document.querySelector('[data-canvas-content] [contenteditable=true]')`)) await evaluate(editor,`document.querySelector('[data-element-id="choice-text"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));true`);
  await waitFor(()=>evaluate(editor,`!!document.querySelector('[data-canvas-content] [contenteditable=true]')`),'plain text editor');
  await evaluate(editor,`document.querySelector('[data-canvas-content] [contenteditable=true]').focus();true`);await key('a',['meta']);await editor.insertText('Updated child');await key('Escape');
  await waitFor(async()=>(await flush())['choice-text'].text?.includes('Updated child'),'child content');
  check('Existing text editor updates pure children without creating a parent parameter or override',JSON.stringify((await flush()).choice)===JSON.stringify(baseline.choice));
  await undo();await waitFor(async()=>(await flush())['choice-text'].text==='Editable content','child undo');
  await select('class-only');
  check('Class-only component keeps visual style controls restricted',await evaluate(editor,`document.querySelector('[role=tabpanel][data-state=active] fieldset').disabled`));
  await evaluate(editor,`[...document.querySelectorAll('.editor-panel-header [role=tab]')].find(e=>e.textContent==='代码').focus();true`);await key('Space');
  const classInput=await evaluate(editor,`(()=>{const e=[...document.querySelectorAll('[role=tabpanel][data-state=active] input')].find(e=>e.placeholder&&!e.matches(':disabled'));if(e){e.dataset.auditClassInput='true';return e.placeholder}})()`);
  assert.ok(classInput,'class input');
  await input('[data-audit-class-input]','custom-audit');await key('Enter');
  await waitFor(async()=>(await flush())['class-only'].props.className.includes('custom-audit'),'class commit');
  check('Verified className-only forwarding retains the existing class editor',await evaluate(editor,`document.querySelector('[data-class-only]').classList.contains('custom-audit')`)&&Object.keys((await flush())['class-only'].styles).length===0);
  await evaluate(editor,`[...document.querySelectorAll('.editor-panel-header [role=tab]')].find(e=>e.textContent==='样式').focus();true`);await key('Space');
  await click('[data-save-component-source]');await waitFor(()=>fs.readFileSync(callFile,'utf8').includes('custom-audit'),'class source');
  check('Static class-only edit saves through the explicit source action',!fs.readFileSync(callFile,'utf8').includes('style=')&&fs.readFileSync(path.join(project,'src/Controls.tsx'),'utf8')===source);
  await flush();await editor.reload();await waitFor(()=>evaluate(editor,`!!document.querySelector('[data-class-only].custom-audit')`).catch(()=>false),'reopen');
  await select('mismatched');
  check('Reopening preserves mismatch diagnostics, original identity and suspended values',await evaluate(editor,`!!document.querySelector('[data-component-identity-mismatch]')`)&&JSON.stringify((await flush()).mismatched)===JSON.stringify(baseline.mismatched));
  fs.writeFileSync(path.join(output,'contract-boundaries.png'),(await editor.capturePage()).toPNG());
  report.passed=true;
 }catch(error){report.failure=error.stack;console.error(error);if(editor){report.text=await evaluate(editor,'document.body.innerText');fs.writeFileSync(path.join(output,'contract-boundaries-failure.png'),(await editor.capturePage()).toPNG())}}
 finally{clearTimeout(timeout);write(path.join(output,'contract-boundaries-report.json'),report);app.exit(report.passed?0:1)}
});
