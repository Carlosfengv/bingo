/* Real-project skill/renderer verification. Runs only in an isolated source copy/profile.
 * pnpm build && pnpm exec electron tools/test-storageui-skills.cjs /path/to/storageui
 * BINGO_STORAGEUI_FIXTURE=/previous/fixture reuses an import for a focused rerun.
 */
const { app, BrowserWindow, webContents } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { foregroundEditor } = require('./editor-test-foreground.cjs');
const repo = path.resolve(__dirname, '..');
const original = path.resolve(process.argv[2] || '/Users/carlos/Downloads/storageui');
const qa = fs.realpathSync(process.env.BINGO_STORAGEUI_FIXTURE || fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-storageui-')));
const source = path.join(qa, 'source'), project = path.join(qa, 'project'), data = path.join(qa, 'data');
const output = path.join(repo, 'output/qa/storageui-skills', path.basename(qa));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2)); };
const sourceFiles = ['AGENTS.md', 'package.json', 'tsconfig.json', 'postcss.config.mjs', 'app/globals.css', 'app/shadcn-tailwind.css', 'lib/utils.ts', 'lib/config/site.ts', 'components/foundations/icons.tsx', ...['button', 'badge', 'card', 'input', 'tabs', 'separator', 'spinner'].map(name => `components/ui/${name}.tsx`)];
if (!process.env.BINGO_STORAGEUI_FIXTURE) {
  for (const file of sourceFiles) write(path.join(source, file), fs.readFileSync(path.join(original, file), 'utf8'));
  for (const root of [source, project]) { fs.mkdirSync(root, { recursive: true }); fs.symlinkSync(path.join(original, 'node_modules'), path.join(root, 'node_modules')); }
  write(path.join(project, 'package.json'), { name: 'storageui-skill-test', private: true, type: 'module' });
  write(path.join(project, 'Welcome.tsx'), 'export function Welcome(){return <div>StorageUI skill test</div>}');
  write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'en' });
  write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'StorageUI skill test', addedAt: Date.now() }]);
  write(path.join(data, 'project-tabs.json'), []);
}
// Reused macOS temp fixtures may have been seeded via /var rather than /private/var.
// The app's local registry keys must match the canonical project id used below.
write(path.join(data, 'local-projects.json'), [{id:project,rootPath:project,canonicalRoot:project,name:'StorageUI skill test',addedAt:Date.now()}]);
fs.mkdirSync(output, { recursive: true });
app.commandLine.appendSwitch('user-data-dir', data);
const report = { fixture: qa, original, sourceFiles, phases: [], checks: [], findings: [], screenshots: [], passed: false };
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceHashes = Object.fromEntries(sourceFiles.map(file => [file, hash(path.join(original, file))]));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
async function waitFor(fn, label, timeout = 60000) { const started = Date.now(); while (Date.now() - started < timeout) { const value = await fn(); if (value) return value; await sleep(200); } throw Error(`Timed out: ${label}`); }
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); console.log('PASS', name); };
const pages = () => {
  const dir = path.join(project, '.bingo/design/pages');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(file => file.endsWith('.json')).map(file => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))) : [];
};
const checkpoint = () => write(path.join(output, 'report.json'), report);
// Other workspace tasks may rebuild out/ while a long agent test is running.
// Keep this run's main, preload and renderer from one completed build together.
const runtime = path.join(qa, `runtime-${Date.now()}`);
fs.cpSync(path.join(repo,'out'),runtime,{recursive:true});
fs.symlinkSync(path.join(repo,'node_modules'),path.join(runtime,'node_modules'));
if (!fs.existsSync(path.join(qa,'build'))) fs.symlinkSync(path.join(repo,'build'),path.join(qa,'build'));
require(path.join(runtime, 'main/index.js'));
const timer = setTimeout(() => { report.failure = 'Integration timeout'; checkpoint(); app.exit(1); }, 25 * 60000).unref();
app.whenReady().then(async () => {
  let editor, shell;
  const chatTabId = crypto.randomUUID();
  async function capture(name) {
    const file = path.join(output, name + '.png');
    fs.writeFileSync(file, (await editor.capturePage()).toPNG()); report.screenshots.push(file); checkpoint();
  }
  const history = [];
  async function runChat(name, prompt) {
    const phase = { name, prompt, events: [], startedAt: new Date().toISOString() }; report.phases.push(phase); checkpoint();
    const eventChannel = `chat-stream-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const sessionId = crypto.randomUUID(), userMessage = { id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: Date.now() };
    history.push(userMessage);
    await evaluate(editor, `(() => { window.__skillEvents=[]; window.__skillDone=false; window.__skillError=null; window.__skillUnsubscribe=window.api.on(${JSON.stringify(eventChannel)}, event=>window.__skillEvents.push(event)); void window.api.invoke('ai_chat', ${JSON.stringify({ projectId: project, sessionId, eventChannel, messages: history, options: { chatTabId, userMessage, requestId: crypto.randomUUID(), chatTitle: 'StorageUI skill verification', autoApprove: true, promptFolders: [source] } })}).then(()=>window.__skillDone=true).catch(error=>{window.__skillError=error.message;window.__skillDone=true}); })()`);
    let offset = 0;
    const deadline = Date.now() + 12 * 60000;
    while (Date.now() < deadline) {
      const state = await evaluate(editor, `({events:window.__skillEvents.slice(${offset}),done:window.__skillDone,error:window.__skillError})`);
      offset += state.events.length;
      for (const event of state.events) {
        if (event.type === 'tool_approval') await invoke(editor, 'mcp_tool_approval', { approvalId: event.approvalId, approved: true });
        if (event.type === 'folder_access_needed') throw Error(`Unexpected folder request: ${event.path}`);
        if (event.type === 'screenshot_captured' && event.dataUrl?.startsWith('data:image/')) {
          const file = path.join(output, `${name}-agent-${report.screenshots.length}.png`);
          fs.writeFileSync(file, Buffer.from(event.dataUrl.split(',')[1], 'base64')); report.screenshots.push(file);
          delete event.dataUrl; event.savedImage = file;
        }
        // Keep tool evidence, not private model reasoning or token-by-token traces.
        if (event.type.startsWith('thinking')) continue;
        phase.events.push(event);
        fs.appendFileSync(path.join(output, 'events.ndjson'), JSON.stringify({ phase: name, ...event }) + '\n');
        if (['tool_activity', 'error', 'done', 'debug'].includes(event.type)) console.log(name, event.type, event.name || event.message || event.error || '');
      }
      if (state.done) { if (state.error) throw Error(state.error); break; }
      await sleep(1000);
    }
    const done = await evaluate(editor, 'window.__skillDone');
    await evaluate(editor, 'window.__skillUnsubscribe?.()');
    if (!done) { await invoke(editor, 'ai_chat_cancel', { sessionId }); throw Error(`Agent phase timed out: ${name}`); }
    phase.finishedAt = new Date().toISOString();
    const errors = phase.events.filter(event => event.type === 'error');
    if (errors.length) throw Error(`${name}: ${JSON.stringify(errors)}`);
    const text = phase.events.filter(event => event.type === 'text').map(event => event.text || '').join('') || phase.events.filter(event => event.type === 'text_delta').map(event => event.text || event.delta || '').join('');
    if (text) history.push({ id: crypto.randomUUID(), role: 'assistant', content: text });
    await capture(name); checkpoint();
  }
  async function protocolChecks() {
    const info = await invoke(editor, 'get:mcp-info');
    let sid, requestId = 0;
    async function rpc(method, params) {
      const response = await fetch(info.url, {method:'POST', headers:{'content-type':'application/json', ...(sid ? {'mcp-session-id':sid} : {})}, body:JSON.stringify({jsonrpc:'2.0',id:++requestId,method,params})});
      sid = response.headers.get('mcp-session-id') || sid;
      const body = await response.json();
      if (body.error) throw Error(JSON.stringify(body.error));
      return body.result;
    }
    const call = (name,args={}) => rpc('tools/call',{name,arguments:args});
    const text = result => result.content?.filter(item=>item.type==='text').map(item=>item.text).join('\n') || '';
    const ok = result => {assert.ok(!result.isError,text(result));return result;};
    await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'storageui-regression',version:'1'}});
    ok(await call('project_pick',{project_id:project}));
    await invoke(editor,'mcp_external_auto_approve_file_edits',{projectId:project,enabled:true});
    ok(await call('read_skill',{name:'bingo-design'}));
    if (!fs.existsSync(path.join(project,'tsconfig.json'))) {
      const failed = await waitFor(async()=>{const result=ok(await call('search_components',{query:'Badge'}));return /BUILD FAILURES/.test(text(result)) ? result : false;},'visible alias failure');
      check('Component search exposes actual alias-resolution failures', /Could not resolve.*@\/lib\/utils/.test(text(failed)));
      const config=JSON.parse(fs.readFileSync(path.join(source,'tsconfig.json'),'utf8'));
      ok(await call('project_write',{file_path:'tsconfig.json',content:JSON.stringify({compilerOptions:{jsx:'react-jsx',paths:config.compilerOptions.paths}},null,2)}));
    }
    const catalog = await waitFor(async()=>{const result=ok(await call('search_components',{query:'Badge'}));return /success/.test(text(result)) ? result : false;},'compiled Badge metadata');
    check('MCP discovers live compiled component variants without a chat snapshot', /success/.test(text(catalog)) && /warning/.test(text(catalog)));
    const newPage = ok(await call('canvas_create_page',{name:`Protocol QA ${Date.now()}`}));
    const canvasId = text(newPage).match(/\(id ([^)]+)\)/)[1];
    const scaffold = ok(await call('canvas_create_import_scaffold',{title:'StorageUI protocol verification'}));
    const ids = JSON.parse(text(scaffold).match(/\{\n[\s\S]*?\n\}/)[0]);
    check('Import scaffold creates a usable claim without a preceding read', !!ids.claim_id && Object.keys(ids.sections).length === 5);
    const args = {parent_id:ids.sections.components,claim_id:ids.claim_id};
    const rejected = await call('canvas_add',{...args,jsx:'<Badge variant="ghost">INVALID_VARIANT_SENTINEL</Badge>'});
    report.rejectedVariant=rejected;
    check('Real renderer rejects an unsupported StorageUI Badge variant', rejected.isError && /INVALID_COMPONENT_VARIANT|outside the indexed API/.test(JSON.stringify(rejected)));
    const warning = ok(await call('canvas_add',{...args,jsx:'<span className="inline-flex rounded-full bg-green-500 px-2">Raw pill diagnostic</span>'}));
    check('Hand-styled status pill produces component and token diagnostics', /POSSIBLE_COMPONENT_SUBSTITUTE/.test(text(warning)) && /PRIMITIVE_DESIGN_VALUE/.test(text(warning)));
    ok(await call('canvas_add',{...args,jsx:'<Card><CardHeader><CardTitle>Token binding test</CardTitle></CardHeader><CardContent><Badge variant="success">Healthy</Badge><Button variant="outline">Upload</Button><Tabs defaultValue="all"><TabsList><TabsTab value="all">All files</TabsTab><TabsTab value="recent">Recent</TabsTab></TabsList><TabsPanel value="all">File contents</TabsPanel></Tabs></CardContent></Card>'}));
    const readback = ok(await call('canvas_read',{canvas_id:canvasId,element_id:ids.root_id}));
    check('Rejected variant leaves no partial node in the canvas', !text(readback).includes('INVALID_VARIANT_SENTINEL'));
    await waitFor(()=>evaluate(editor,`!!document.querySelector('[data-canvas-content] [data-slot="card"]')`),'rendered card');
    await waitFor(()=>evaluate(editor,`!!document.querySelector('[data-canvas-content] [data-slot="tabs-tab"]')`),'real Tabs rendering');
    check('Real Tabs and compound children render through CommonJS dependencies', true);
    report.tokenBinding = await evaluate(editor,`(() => { const el=document.querySelector('[data-canvas-content] [data-slot="card"]'); const old=el.getAttribute('style');const snapshot=()=>({background:getComputedStyle(el).backgroundColor,radius:getComputedStyle(el).borderTopLeftRadius}); const before=snapshot();el.style.setProperty('--card','rgb(17, 34, 51)');el.style.setProperty('--radius','20px');const after=snapshot();if(old===null)el.removeAttribute('style');else el.setAttribute('style',old);return {before,after};})()`);
    check('Real Card background and radius respond to source design variables', report.tokenBinding.before.background!==report.tokenBinding.after.background && report.tokenBinding.before.radius!==report.tokenBinding.after.radius);
    const probeName=`RenderProbe${Date.now()}`;
    const probeFile=`components/${probeName}.tsx`;
    await call('project_read',{file_path:probeFile});
    ok(await call('project_write',{file_path:probeFile,content:`const label = process.env.NEXT_PUBLIC_APP_URL ?? "Ready"; export function ${probeName}(){return <span data-slot="${probeName}">{label}</span>}`}));
    await waitFor(async()=>text(ok(await call('search_components',{query:probeName}))).includes(`${probeName} (`),'compiled runtime probe');
    ok(await call('canvas_add',{...args,jsx:`<${probeName} />`}));
    await waitFor(async()=>{const message=text(ok(await call('canvas_read',{canvas_id:canvasId,element_id:ids.root_id})));return new RegExp(`COMPONENT_RENDER_FALLBACK.*${probeName}`).test(message)&&message.includes('process is not defined');},'specific runtime fallback diagnostic');
    check('Canvas readback exposes runtime failure even after successful compilation',true);
    ok(await call('project_edit',{file_path:probeFile,old_string:'process.env.NEXT_PUBLIC_APP_URL ?? "Ready"',new_string:'"Ready"'}));
    await waitFor(async()=>{
      report.runtimeRecoveryDiagnostics=ok(await call('canvas_read',{canvas_id:canvasId,element_id:ids.root_id})).structuredContent?.renderDiagnostics;
      return evaluate(editor,`!!document.querySelector('[data-canvas-content] [data-slot="${probeName}"]')`);
    },'recovered runtime probe');
    check('Source repair restores rendering and clears the fallback diagnostic',!text(ok(await call('canvas_read',{canvas_id:canvasId,element_id:ids.root_id}))).includes('COMPONENT_RENDER_FALLBACK'));
    const beforeCopy=ok(await call('canvas_read',{canvas_id:canvasId,element_id:ids.root_id})).content[0].text;
    ok(await call('canvas_edit',{element_id:ids.root_id,claim_id:ids.claim_id,old_string:'Token binding test',new_string:'Token binding verified'}));
    const afterCopy=ok(await call('canvas_read',{canvas_id:canvasId,element_id:ids.root_id})).content[0].text;
    check('A copy-only edit preserves every component id, variant and style',afterCopy===beforeCopy.replace('Token binding test','Token binding verified'));
    const leaf=await waitFor(()=>Object.values(pages().find(page=>page.id===canvasId).canvas.elements.byId).find(node=>node.type==='text'&&node.text==='Token binding verified'),'persisted text leaf');
    ok(await call('canvas_edit',{element_id:leaf.id,claim_id:ids.claim_id,old_string:'Token binding verified',new_string:'Text leaf verified'}));
    const afterLeaf=ok(await call('canvas_read',{canvas_id:canvasId,element_id:ids.root_id})).content[0].text;
    check('Direct text-leaf edits preserve the component tree without adding wrappers',afterLeaf===afterCopy.replace('Token binding verified','Text leaf verified'));
    const shot = ok(await call('take_screenshot',{element_id:ids.sections.components}));
    for (const block of shot.content || []) if (block.type === 'image') {
      const file=path.join(output,'protocol-components.png');
      fs.writeFileSync(file,Buffer.from(block.data,'base64'));report.screenshots.push(file);
    }
    ok(await call('canvas_release',{element_id:ids.root_id,claim_id:ids.claim_id}));
    check('Scaffold can be populated, verified and released through the real MCP protocol', true);
    await capture('protocol');
  }
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(win => !win.isDestroyed()), 'window');
    win.setSize(1800, 1100); win.show(); shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await invoke(shell, 'project-tabs:open', { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await foregroundEditor(editor);
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-content]")').catch(() => false), 'canvas');
    report.agent = await invoke(editor, 'agent:list');
    console.log('FIXTURE', qa, 'AGENT', report.agent.selectedAgent); checkpoint();
    if (process.env.BINGO_STORAGEUI_PROTOCOL_ONLY) {
      await protocolChecks();
      check('Original StorageUI sources were not modified', sourceFiles.every(file => hash(path.join(original,file))===sourceHashes[file]));
      report.passed=true;
      return;
    }
    if (process.env.BINGO_STORAGEUI_REPAIR_ONLY || process.env.BINGO_STORAGEUI_COPY_ONLY) {
      const page=pages().find(item=>item.name==='Storage Overview');
      assert.ok(page,'Existing overview required for repair test');
      const before=page.canvas.elements;
      await evaluate(editor,`(() => {const label=[...document.querySelectorAll('div,span,button')].find(el=>el.children.length===0&&el.textContent.trim()==='Storage Overview');if(!label)throw Error('Page label not found');label.click();})()`);
      await waitFor(()=>evaluate(editor,`document.querySelector('[data-canvas-content]')?.innerText.includes('合同草案.pdf')`),'active overview');
      await runChat(process.env.BINGO_STORAGEUI_COPY_ONLY?'copy':'repair',process.env.BINGO_STORAGEUI_COPY_ONLY?'只把当前 Storage Overview 页里的“合同草案.pdf”改为“合同定稿.pdf”，保留组件结构、其他内容和样式。':'当前 Storage Overview 页的部分组件只显示文字，真实外观没有加载。请按 bingo-design 检查 canvas_read 的渲染告警，修复导入依赖，使 Card、Badge、Button、Input、Tabs 真正渲染。然后仅把“合同草案.pdf”改为“合同定稿.pdf”。保留画布组件结构、其他内容和样式。');
      const after=await waitFor(()=>{
        const elements=pages().find(item=>item.id===page.id).canvas.elements;
        return JSON.stringify(elements).includes('合同定稿.pdf')&&!JSON.stringify(elements).includes('合同草案.pdf')?elements:false;
      },'persisted filename edit');
      const clean=value=>JSON.parse(JSON.stringify(value,(key,value)=>key==='_componentMissing'?undefined:value));
      assert.deepEqual(clean(after),JSON.parse(JSON.stringify(clean(before)).replaceAll('合同草案.pdf','合同定稿.pdf')),'Agent copy edit must preserve the complete canvas structure');
      check('Agent repair preserves canvas structure and changes only the requested copy',true);
      report.rendered=await evaluate(editor,`(() => {const root=document.querySelector('[data-canvas-content]');return {slots:[...root.querySelectorAll('[data-slot]')].map(el=>el.getAttribute('data-slot')),text:root.innerText}})()`);
      check('Real Card, Badge, Button, Input and Tabs render after the agent edit',['card','badge','button','input','tabs-tab'].every(slot=>report.rendered.slots.includes(slot)));
      check('Requested final filename is visible',report.rendered.text.includes('合同定稿.pdf'));
      check('Agent repaired dependencies without replacing source component implementations',['button','badge','card','input','tabs','separator'].every(name=>hash(path.join(project,`components/ui/${name}.tsx`))===hash(path.join(source,`components/ui/${name}.tsx`))));
      check('Original StorageUI sources were not modified',sourceFiles.every(file=>hash(path.join(original,file))===sourceHashes[file]));
      report.passed=true;
      return;
    }
    if (!process.env.BINGO_STORAGEUI_FIXTURE) await runChat('import', `请从附件目录 ${source} 导入 StorageUI 的基础设计系统到当前 Bingo 项目。测试范围为 Button、Badge、Card、Input、Tabs、Separator 六组组件及必需的直接依赖，保留源 CSS、组件 API 和设计变量。按导入流程创建 Design System 展示页；不用导入其他业务组件，也不用复刻原业务页面。依赖已安装，无需安装包。`);
    const imported = ['button', 'badge', 'card', 'input', 'tabs', 'separator'].filter(name => fs.existsSync(path.join(project, `components/ui/${name}.tsx`)));
    check('All six requested component families were imported', imported.length === 6);
    report.sourceFidelity = imported.map(name => ({ name, exact: hash(path.join(source, `components/ui/${name}.tsx`)) === hash(path.join(project, `components/ui/${name}.tsx`)) }));
    check('Imported component implementations are byte-identical to source', report.sourceFidelity.every(item=>item.exact));
    check('Valid animation CSS package import is preserved', fs.readFileSync(path.join(project,'app/globals.css'),'utf8').includes('@import "tw-animate-css"'));
    const priorPageIds=new Set(pages().map(page=>page.id));
    const overviewName=pages().some(page=>page.name==='Storage Overview')?`Storage Overview QA ${Date.now()}`:'Storage Overview';
    await runChat('design', `请用刚导入的设计系统，在新的 ${overviewName} 画布页设计一个静态文件管理概览。包含存储用量卡、全部文件/最近文件两个筛选标签页、搜索输入、上传按钮，以及至少三条文件记录和成功/警告状态标签。其中一条文件名是“合同草案.pdf”。保持 StorageUI 风格。另为 Badge 添加可拖拽的默认、成功、警告三种 composition。`);
    const page = await waitFor(() => pages().find(page => page.name === overviewName&&!priorPageIds.has(page.id)), 'saved overview');
    const before = page.canvas.elements;
    report.overviewPageId = page.id;
    report.componentUsage = Object.values(before.byId || {}).filter(node => node.type === 'component').map(node => ({ id: node.id, component: node.componentName, props: node.props }));
    for (const name of ['Card', 'Badge', 'Button', 'Input', 'Tabs']) check(`Overview references real ${name}`, report.componentUsage.some(node => node.component === name));
    check('Tabs use source-supported tab children (including exported aliases)', report.componentUsage.some(node => ['TabsTab', 'TabsTrigger'].includes(node.component)));
    check('Badge compositions were authored', fs.existsSync(path.join(project, 'components/ui/badge.compositions.tsx')));
    report.compositions=JSON.parse(require('node:child_process').execFileSync(process.execPath, ['--import','tsx',path.join(repo,'tools/check-storageui-compositions.ts'),project], {cwd:repo,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},encoding:'utf8'}));
    check('Badge compositions parse into real variants with fresh instance ids', report.compositions.passed);
    report.rendered = await evaluate(editor, `(() => {const root=document.querySelector('[data-canvas-content]');return {slots: [...root.querySelectorAll('[data-slot]')].map(el=>el.getAttribute('data-slot')), text:root.innerText, errors:[...root.querySelectorAll('[data-component-error]')].map(el=>el.innerText)}})()`);
    check('Real card, badge, button and tabs render on the canvas', ['card', 'badge', 'button', 'tabs-tab'].every(slot => report.rendered.slots.includes(slot)));
    check('Requested file copy rendered', report.rendered.text.includes('合同草案.pdf'));
    await runChat('edit', `只把刚才 ${overviewName} 页里的“合同草案.pdf”改成“合同定稿.pdf”，不要修改其他内容或样式。`);
    const after = pages().find(item => item.id === page.id).canvas.elements;
    const expected = JSON.parse(JSON.stringify(before).replaceAll('合同草案.pdf', '合同定稿.pdf'));
    check('Surgical copy edit preserves component identities, styles and other content', JSON.stringify(after) === JSON.stringify(expected));
    check('Original StorageUI sources were not modified', sourceFiles.every(file => hash(path.join(original, file)) === sourceHashes[file]));
    report.passed = true;
  } catch (error) {
    report.failure = String(error.stack || error); console.error(report.failure);
    if (editor && !editor.isDestroyed()) { report.visibleText = await evaluate(editor, 'document.body.innerText.slice(0,7000)').catch(() => ''); await capture('failure').catch(() => {}); }
  } finally {
    clearTimeout(timer); checkpoint(); console.log('REPORT', path.join(output, 'report.json')); app.exit(report.passed ? 0 : 1);
  }
});
