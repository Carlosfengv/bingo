/* Actual Electron panel, native keyboard input, and isolated project files. */
const { app, BrowserWindow, webContents } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..'), output = path.join(repo, 'output/component-instance-editing');
const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-component-usability-')));
const project = path.join(directory, 'project'), data = path.join(directory, 'data');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2)); };
const longName = 'appearanceWithAnIntentionallyLongPublicParameterName';
const longValue = 'secondary-with-an-intentionally-long-option-value-辅助说明';
write(path.join(project, 'package.json'), { name: 'component-usability-test', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
write(path.join(project, 'src/UsabilityButton.tsx'), `import type {CSSProperties} from 'react';
export function UsabilityButton({variant='primary', enabled=false, count=1, label='Original', ${longName}='primary', style}: {
  variant?: 'primary'|'secondary'; enabled?: boolean; count?: number; label?: string;
  ${longName}?: 'primary'|'${longValue}'; style?: CSSProperties;
}) { return <button data-variant={variant} data-enabled={enabled} data-count={count} style={{backgroundColor:variant==='primary'?'#2563eb':'#e2e8f0',color:variant==='primary'?'white':'#172554',border:0,padding:'8px 16px',...style}}>{label}</button> }
`);
const pageId = crypto.randomUUID(), pageFile = path.join(project, '.bingo/design/pages', pageId + '.json');
write(path.join(project, '.bingo/design/manifest.json'), {schemaVersion:1,documentId:crypto.randomUUID(),pages:[{id:pageId}]});
write(pageFile, {schemaVersion:1,id:pageId,name:'Usability',canvas:{zoom:1,pan:{x:30,y:50},elements:[{id:'frame',type:'html',tag:'div',styles:{width:500,height:240,padding:24},children:[{id:'sample',type:'component',componentName:'UsabilityButton',props:{variant:'primary',label:'Original'},styles:{backgroundColor:'#ef4444',borderRadius:'12px'}}]}]},newClasses:[]});
write(path.join(data, 'preferences.json'), {schemaVersion:1,localePreference:'zh-CN'});
write(path.join(data, 'local-projects.json'), [{id:project,rootPath:project,canonicalRoot:project,name:'Component usability QA',addedAt:Date.now()}]);
app.commandLine.appendSwitch('user-data-dir', data);
const report = {directory,scope:'Actual Electron keyboard and inspector geometry; accessibility tree inspection, not a screen-reader speech test.',checks:[],errors:[]};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, code) => {wc.setBackgroundThrottling(false);return wc.executeJavaScript(code,true)};
async function waitFor(fn,label) {const started=Date.now();while(Date.now()-started<30000){const value=await fn();if(value)return value;await sleep(40)}throw Error('Timed out: '+label)}
const check = (label,value) => {assert.ok(value,label);report.checks.push(label);console.log('PASS',label)};
require(path.join(repo, 'out/main/index.js'));
const timer=setTimeout(()=>{report.failure='Usability QA timed out';write(path.join(output,'usability-report.json'),report);app.exit(1)},180000);
app.whenReady().then(async()=>{
 let editor;
 try{
  const win=await waitFor(()=>BrowserWindow.getAllWindows().find(w=>!w.isDestroyed()),'window');win.setSize(1400,960);win.show();
  await waitFor(()=>evaluate(win.webContents,'!!document.querySelector(".project-titlebar")').catch(()=>false),'shell');
  await evaluate(win.webContents,`window.api.invoke('project-tabs:open',{projectId:${JSON.stringify(project)}})`);
  editor=await waitFor(()=>webContents.getAllWebContents().find(w=>{try{return new URL(w.getURL()).searchParams.get('projectTab')===project}catch{return false}}),'editor');
  await require('./editor-test-foreground.cjs').foregroundEditor(editor);
  await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-element-id=sample] button")'),'component');
  const key=async(keyCode,modifiers=[])=>{editor.sendInputEvent({type:'keyDown',keyCode,modifiers});if(keyCode==='Enter'||keyCode==='Space')editor.sendInputEvent({type:'char',keyCode:keyCode==='Enter'?'\r':' ',modifiers});editor.sendInputEvent({type:'keyUp',keyCode,modifiers});await sleep(100)};
  if(await evaluate(editor,'localStorage.getItem("bingo-editor-mode")!=="design"'))await key('j',['meta']);
  await evaluate(editor,`document.querySelector('[data-canvas-content] [data-element-id=sample]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}));true`);
  await waitFor(()=>evaluate(editor,'!!document.querySelector("[data-component-prop=variant] select")'),'parameters');
  const focus=selector=>evaluate(editor,`document.querySelector(${JSON.stringify(selector)}).focus();true`);
  const prop=name=>`[data-component-prop="${name}"]`;
  const persisted=()=>JSON.parse(fs.readFileSync(pageFile)).canvas.elements.byId.sample;
  const flush=async()=>{await evaluate(editor,`window.__usabilitySaved=false;(()=>{const pending=[];window.dispatchEvent(new CustomEvent('bingo:prepare-project-close',{detail:{pending}}));Promise.all(pending).then(()=>window.__usabilitySaved=true,error=>window.__usabilitySaved=String(error))})();true`);assert.equal(await waitFor(()=>evaluate(editor,'window.__usabilitySaved'),'flush'),true);return persisted()};
  await flush();const baseline=persisted();
  const chooseKeyboard=async(name,last=true)=>{await focus(prop(name)+' select');editor.sendInputEvent({type:'char',keyCode:last?'s':'p'});await sleep(150);};
  await evaluate(editor,`window.__keyEvents=[];document.addEventListener('keydown',e=>window.__keyEvents.push({key:e.key,target:e.target.tagName,field:e.target.closest('[data-component-prop]')?.dataset.componentProp}),true)`);
  await chooseKeyboard('variant');
  await waitFor(async()=>(await flush()).props.variant==='secondary','keyboard variant');
  check('A native keyboard variant choice updates the component',await evaluate(editor,'document.querySelector("[data-element-id=sample] button").dataset.variant==="secondary"'));
  check('The selected parameter keeps keyboard focus after its preview commits',await evaluate(editor,'document.activeElement===document.querySelector("[data-component-prop=variant] select")'));
  await key('Tab');
  check('Tab continues to the same parameter reset instead of leaving the inspector',await evaluate(editor,'document.activeElement===document.querySelector("[data-component-prop=variant] button")'));
  check('Background override survives variant switching while other variant styles update',await evaluate(editor,`(()=>{const s=getComputedStyle(document.querySelector('[data-element-id=sample] button'));return s.backgroundColor==='rgb(239, 68, 68)'&&s.color==='rgb(23, 37, 84)'})()`));
  check('Without declared parameter-to-style mapping the panel reports an override with unverified effect',await evaluate(editor,`document.querySelector('[data-style-override=backgroundColor]').textContent.includes('效果未验证')`));
  await focus('[data-style-override=backgroundColor] button');await key('Enter');
  await waitFor(async()=>!Object.hasOwn((await flush()).styles,'backgroundColor'),'background reset');
  check('Keyboard reset follows the current variant and retains unrelated overrides',await evaluate(editor,`(()=>{const s=getComputedStyle(document.querySelector('[data-element-id=sample] button'));return s.backgroundColor==='rgb(226, 232, 240)'&&s.borderRadius==='12px'})()`));
  check('Removing an override moves focus to the next available reset control',await evaluate(editor,`document.activeElement===document.querySelector('[data-style-override=borderRadius] button')`));
  await evaluate(editor,'document.activeElement.blur()');await key('z',['meta']);
  await waitFor(async()=>(await flush()).styles.backgroundColor==='#ef4444','background undo');
  check('Undo restores the complete background declaration and its source without reverting the variant',JSON.stringify(persisted().styles)===JSON.stringify(baseline.styles)&&persisted().props.variant==='secondary'&&JSON.stringify(persisted().componentEditing)===JSON.stringify(baseline.componentEditing));
  await focus(prop('variant')+' button');await key('Enter');
  await waitFor(async()=>!Object.hasOwn((await flush()).props,'variant'),'parameter reset');
  check('Keyboard parameter reset follows its default and returns focus to its control',await evaluate(editor,'document.activeElement===document.querySelector("[data-component-prop=variant] select")&&document.querySelector("[data-element-id=sample] button").dataset.variant==="primary"'));
  await key('Tab');await key('Space');
  await waitFor(async()=>Object.hasOwn((await flush()).props,'variant'),'pin default');
  check('The default can be explicitly pinned with the keyboard without canvas panning',persisted().props.variant==='primary');
  const handle=await evaluate(editor,`(()=>{const root=document.querySelector('[data-electron-editor]');const r=root.lastElementChild.previousElementSibling.firstElementChild.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+80)}})()`);
  editor.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...handle});
  editor.sendInputEvent({type:'mouseMove',button:'left',x:handle.x+150,y:handle.y});
  editor.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:handle.x+150,y:handle.y});await sleep(150);
  check('The actual inspector drag handle reaches its 250px minimum width',await evaluate(editor,'document.querySelector("[data-electron-editor]").lastElementChild.getBoundingClientRect().width===250'));
  report.layouts=[];
  for(const locale of ['zh-CN','en']){
    await evaluate(editor,`window.api.invoke('bingo:locale-set',{preference:${JSON.stringify(locale)}})`);
    await waitFor(()=>evaluate(editor,`document.querySelector('[data-component-parameters] h3').textContent===${JSON.stringify(locale==='en'?'Component parameters':'组件参数')}`),'locale '+locale);
    const labelValue=locale==='en'?'A long component label with editable content':'用于检查窄面板显示和键盘提交的组件文案';
    await focus(prop('label')+' input');await evaluate(editor,'document.activeElement.select()');await editor.insertText(labelValue);await key('Enter');
    await waitFor(async()=>(await flush()).props.label===labelValue,'text commit '+locale);
    check(locale+': Enter commits text and retains focus for continued keyboard editing',await evaluate(editor,`document.activeElement===document.querySelector('[data-component-prop=label] input')`));
    await evaluate(editor,'document.activeElement.select()');await editor.insertText('Cancelled draft');await key('Escape');
    check(locale+': Escape cancels a draft without changing the committed value',await evaluate(editor,`document.querySelector('[data-component-prop=label] input').value===${JSON.stringify(labelValue)}`)&&(await flush()).props.label===labelValue);
    await key('Tab');
    check(locale+': Tab reaches the named text reset with a visible focus indicator',await evaluate(editor,`(()=>{const e=document.activeElement;const s=getComputedStyle(e);return e===document.querySelector('[data-component-prop=label] button')&&e.matches(':focus-visible')&&(s.outlineStyle!=='none'&&s.outlineWidth!=='0px'||s.boxShadow!=='none')})()`));
    await key('Enter');
    await waitFor(async()=>!Object.hasOwn((await flush()).props,'label'),'text reset '+locale);
    check(locale+': Reset preserves selection and focuses the same parameter',await evaluate(editor,`document.activeElement===document.querySelector('[data-component-prop=label] input')&&document.querySelector('[data-element-id=sample] button').textContent==='Original'`));
    await chooseKeyboard(longName);
    await waitFor(async()=>(await flush()).props[longName]===longValue,'long option '+locale);
    const ax=(await editor.debugger.sendCommand('Accessibility.getFullAXTree')).nodes.find(node=>!node.ignored&&node.role?.value==='combobox'&&node.name?.value===longName);
    check(locale+': Long option and API name remain available to assistive technology',ax?.value?.value===longValue&&await evaluate(editor,`document.querySelector(${JSON.stringify(prop(longName)+' select')}).title===${JSON.stringify(longValue)}`));
    for(const zoom of [1,1.25]){
      editor.setZoomFactor(zoom);await sleep(150);
      const layout=await evaluate(editor,`(()=>{const panel=document.querySelector('[data-component-parameters]');const rect=panel.getBoundingClientRect();const controls=[...panel.querySelectorAll('input,select,button')].filter(e=>e.getClientRects().length);return{width:rect.width,overflow:panel.scrollWidth>panel.clientWidth+1,escaped:controls.filter(e=>{const r=e.getBoundingClientRect();return r.left<rect.left-1||r.right>rect.right+1||r.width<1}).map(e=>e.outerHTML),longLabelTitle:document.querySelector(${JSON.stringify(prop(longName)+' label')}).title}})()`);
      report.layouts.push({locale,zoom,...layout});
      check(locale+': Parameter controls fit the minimum panel width at '+zoom+' zoom',layout.width<=250&&!layout.overflow&&!layout.escaped.length&&layout.longLabelTitle.includes(longName));
      await evaluate(editor,`document.querySelector('[data-component-parameters]').scrollIntoView({block:'start'});true`);
      fs.writeFileSync(path.join(output,'component-panel-'+locale+'-'+zoom+'.png'),(await editor.capturePage()).toPNG());
    }
    editor.setZoomFactor(1);
  }
  await focus(prop('label')+' input');await evaluate(editor,'document.activeElement.select()');await editor.insertText('Committed on Tab');await key('Tab');
  await waitFor(async()=>(await flush()).props.label==='Committed on Tab','Tab text commit');
  check('Tab commits the text draft and keeps focus inside that field',await evaluate(editor,`document.activeElement===document.querySelector('[data-component-prop=label] button')`));
  await focus(prop('enabled')+' [data-component-boolean]');await key('Space');
  await waitFor(async()=>(await flush()).props.enabled===true,'keyboard boolean');
  check('Boolean selection keeps a boolean value and keyboard focus',await evaluate(editor,`document.activeElement===document.querySelector('[data-component-prop=enabled] [data-component-boolean]')&&document.querySelector('[data-element-id=sample] button').dataset.enabled==='true'`));
  await focus(prop('count')+' input');await evaluate(editor,'document.activeElement.select()');await editor.insertText('0');await key('Enter');
  await waitFor(async()=>(await flush()).props.count===0,'keyboard number');
  check('Keyboard numeric input preserves explicit zero and focus',await evaluate(editor,`document.activeElement===document.querySelector('[data-component-prop=count] input')`));
  const expected=await evaluate(editor,`[...document.querySelectorAll('[data-component-parameters] input:not(:disabled),[data-component-parameters] select:not(:disabled),[data-component-parameters] button:not(:disabled)')].filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,name:e.getAttribute('aria-label')||e.textContent}))`);
  const traversal=[];await focus('[data-component-parameters] button');
  for(let i=0;i<expected.length+2;i++){
    const current=await evaluate(editor,`(()=>{const e=document.activeElement;return e.closest('[data-component-parameters]')?{tag:e.tagName,name:e.getAttribute('aria-label')||e.textContent}:null})()`);
    if(!current)break;traversal.push(current);await key('Tab');
  }
  assert.deepEqual(traversal,expected);report.keyboardTraversal=traversal;
  check('Every enabled parameter and adaptation action is reachable in forward Tab order',true);
  const reverse=[];
  for(let i=0;i<expected.length;i++){await key('Tab',['shift']);reverse.push(await evaluate(editor,`(()=>{const e=document.activeElement;return{tag:e.tagName,name:e.getAttribute('aria-label')||e.textContent}})()`))}
  assert.deepEqual(reverse,[...expected].reverse());
  check('Shift-Tab returns through the complete parameter panel without a focus trap',true);
  report.passed=true;
 }catch(error){report.failure=error.stack;console.error(error);if(editor){report.keyEvents=await evaluate(editor,'window.__keyEvents');report.text=await evaluate(editor,'document.body.innerText');fs.writeFileSync(path.join(output,'usability-failure.png'),(await editor.capturePage()).toPNG())}}
 finally{clearTimeout(timer);write(path.join(output,'usability-report.json'),report);app.exit(report.passed?0:1)}
});
