/* Isolated Electron regression for CSS class consumers of light-dark(). Run after pnpm build. */
const { app, BrowserWindow, webContents } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const qa = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-light-dark-')));
const project = path.join(qa, 'project');
const data = path.join(qa, 'data');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
write(path.join(project, 'package.json'), { name: 'light-dark-qa', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
write(path.join(project, 'src/App.tsx'), "import './tokens.css'; export default function App(){return <div>Mode QA</div>}\n");
const searchVariables = Array.from({ length: 500 }, (_, index) => `--search-color-${index}: #${index.toString(16).padStart(6, '0')};`).join(' ');
write(path.join(project, 'src/tokens.css'), `:root { color-scheme: light dark; --surface-base: light-dark(#F6F8FB, #1B1B1B); --fg-default: light-dark(#00030A, #F9F9F9); ${searchVariables} } .surface { background-color: var(--surface-base); color: var(--fg-default); }\n`);
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'zh-CN' });
write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'Light Dark QA', addedAt: Date.now() }]);
write(path.join(data, 'project-tabs.json'), []);
app.commandLine.appendSwitch('user-data-dir', data);
const elements = { schemaVersion: 2, variableModes: { 'project-styles': 'light' }, byId: {}, childrenByParent: { ROOT: ['light', 'dark'] } };
const add = (id, parent, item) => { elements.byId[id] = { id, type: 'html', tag: 'div', props: {}, ...item }; if (parent) (elements.childrenByParent[parent] ??= []).push(id); };
add('light', null, { name: 'Light board', props: { className: 'surface' }, styles: { width: 300, height: 220 }, canvasPosition: { x: 20, y: 20 } });
add('dark', null, { name: 'Dark board', props: { className: 'surface' }, styles: { width: 300, height: 220 }, theme: { version: 1, localCollectionModes: { 'project-styles': 'dark' } }, canvasPosition: { x: 350, y: 20 } });
add('child', 'dark', { name: 'Inherited child', props: { className: 'surface' }, styles: { width: 120, height: 60 } });
add('reverse', 'dark', { name: 'Light child', props: { className: 'surface' }, styles: { width: 120, height: 60 }, theme: { version: 1, localCollectionModes: { 'project-styles': 'light' } } });
const pageId = crypto.randomUUID();
const pageFile = path.join(project, '.bingo/design/pages', `${pageId}.json`);
write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion: 1, documentId: crypto.randomUUID(), pages: [{ id: pageId }] });
write(pageFile, { schemaVersion: 1, id: pageId, name: 'Mode fixture', canvas: { elements, zoom: 1, pan: { x: 30, y: 50 } }, newClasses: [] });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
async function waitFor(fn, label, timeout = 45000) { const start = Date.now(); while (Date.now() - start < timeout) { const value = await fn(); if (value) return value; await sleep(100); } throw Error(`Timed out: ${label}`); }
require(path.join(repo, 'out/main/index.js'));
setTimeout(() => { console.error('Timeout', qa); app.exit(1); }, 180000).unref();
app.whenReady().then(async () => {
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window');
    win.setSize(1400, 900); win.show();
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await invoke(shell, 'project-tabs:open', { projectId: project });
    const editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-content] [data-element-id=dark]")').catch(() => false), 'canvas');
    await waitFor(async () => (await invoke(shell, 'project-tabs:get')).tabs.every(tab => tab.status === 'idle'), 'compile');
    const computed = id => evaluate(editor, `(()=>{const node=document.querySelector('[data-canvas-content] [data-element-id="${id}"]');const style=getComputedStyle(node);return {background:style.backgroundColor,color:style.color,scheme:style.colorScheme,variable:style.getPropertyValue('--surface-base').trim()}})()`);
    await waitFor(async () => (await computed('dark')).background === 'rgb(27, 27, 27)', 'Dark CSS class');
    assert.deepEqual((await computed('light')).background, 'rgb(246, 248, 251)');
    assert.deepEqual((await computed('child')).background, 'rgb(27, 27, 27)');
    assert.deepEqual((await computed('reverse')).background, 'rgb(246, 248, 251)');
    assert.deepEqual((await computed('dark')).color, 'rgb(249, 249, 249)');
    assert.deepEqual((await computed('dark')).scheme, 'dark');
    console.log('PASS isolated Light/Dark CSS classes, inheritance and reverse child override', qa);
    write(path.join(qa, 'computed.json'), { light: await computed('light'), dark: await computed('dark'), child: await computed('child'), reverse: await computed('reverse') });
    await evaluate(editor, `document.querySelector('[title="管理变量"]').click()`);
    await waitFor(() => evaluate(editor, '!!document.querySelector("[role=dialog] table")'), 'variable manager');
    await evaluate(editor, `(()=>{
      const field=document.querySelector('[aria-label="搜索变量"]');
      if (!field) throw Error('Variable search field missing');
      window.__variableSearchSamples=[];
      field.addEventListener('input',()=>{
        const start=performance.now();
        requestAnimationFrame(()=>window.__variableSearchSamples.push({kind:'input',milliseconds:performance.now()-start}));
      });
      new MutationObserver(()=>{
        const start=performance.now();
        requestAnimationFrame(()=>window.__variableSearchSamples.push({kind:'results',milliseconds:performance.now()-window.__variableSearchStart,rows:document.querySelectorAll('[role=dialog] tbody tr').length}));
      }).observe(document.querySelector('[role=dialog] tbody'),{childList:true});
    })()`);
    for (let index = 0; index < 30; index++) {
      const term = index % 2 ? 'search' : 'zzzz-no-match';
      await evaluate(editor, `(()=>{const field=document.querySelector('[aria-label="搜索变量"]');field.focus();field.select();window.__variableSearchStart=performance.now()})()`);
      await editor.insertText(term);
      await waitFor(() => evaluate(editor, `document.querySelectorAll('[role=dialog] tbody tr').length${term === 'search' ? '>=5' : '===0'}`), `search ${index}`);
    }
    const samples = await evaluate(editor, `window.__variableSearchSamples`);
    const percentile = (values, p) => values.sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
    const inputSamples = samples.filter(sample => sample.kind === 'input').map(sample => sample.milliseconds);
    const resultSamples = samples.filter(sample => sample.kind === 'results').map(sample => sample.milliseconds);
    assert.ok(inputSamples.length >= 30 && resultSamples.length >= 29);
    const performance = { sampleCount: 30, tokens: 502, inputP95: percentile(inputSamples, .95), resultsP95: percentile(resultSamples, .95), inputSamples, resultSamples };
    write(path.join(qa, 'search-performance.json'), performance);
    console.log('SEARCH', JSON.stringify({ inputP95: performance.inputP95, resultsP95: performance.resultsP95, qa }));
    const savePerformance = await evaluate(editor, `(async()=>{
      const store=(op,args)=>window.api.invoke('bingo:store',{op,root:${JSON.stringify(project)},...args});
      let snapshot=await store('read-variable-library',{force:true});
      const frames=[];let active=true;let previous=performance.now();
      const tick=now=>{if(!active)return;frames.push(now-previous);previous=now;requestAnimationFrame(tick)};
      requestAnimationFrame(tick);
      const durations=[];
      for(let index=0;index<30;index++){
        const next=index%2?'#1B1B1B':'#222222';
        const library=structuredClone(snapshot.library);
        const token=library.tokens.find(token=>token.cssName==='surface-base');
        token.valuesByMode.dark={kind:'literal',value:next};
        const start=performance.now();
        snapshot=await store('write-variable-library',{library,expectedRevision:snapshot.revision,source:snapshot.source});
        durations.push(performance.now()-start);
        if(snapshot.library.tokens.find(token=>token.cssName==='surface-base').valuesByMode.dark.value!==next)throw Error('Saved value mismatch');
      }
      const competing=['#333333','#444444'].map(value=>{
        const library=structuredClone(snapshot.library);
        library.tokens.find(token=>token.cssName==='surface-base').valuesByMode.dark={kind:'literal',value};
        return store('write-variable-library',{library,expectedRevision:snapshot.revision,source:snapshot.source});
      });
      const outcomes=await Promise.allSettled(competing);
      if(outcomes.filter(outcome=>outcome.status==='fulfilled').length!==1 || outcomes.filter(outcome=>outcome.status==='rejected').length!==1)throw Error('Concurrent writes did not enforce revision conflict');
      active=false;
      return {saveCount:30,frames,durations,concurrentConflict:true};
    })()`);
    savePerformance.frameP95 = percentile(savePerformance.frames, .95);
    savePerformance.saveP95 = percentile(savePerformance.durations, .95);
    write(path.join(qa, 'save-performance.json'), savePerformance);
    console.log('SAVE', JSON.stringify({ frameP95: savePerformance.frameP95, saveP95: savePerformance.saveP95, qa }));
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error, qa);
    const editor = webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } });
    if (editor) console.error('Diagnostics', await evaluate(editor, `(()=>({input:(()=>{const n=document.querySelector('[aria-label="surface/base · Dark"]');return n&&{value:n.value,disabled:n.disabled}})(),alerts:[...document.querySelectorAll('[role=alert]')].map(n=>n.textContent),status:document.querySelector('[role=dialog] [role=status]')?.textContent}))()`).catch(String));
    console.error('CSS', fs.readFileSync(path.join(project, 'src/tokens.css'), 'utf8').slice(0,180));
    app.exit(1);
  }
});
