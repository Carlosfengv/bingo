/* Cold startup and warm inspector/preview timing on a large, isolated canvas.
 * Run alone after the functional tests so another Electron UI cannot steal focus. */
const { app, BrowserWindow, webContents } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
require('tsx/cjs');
const { ensureV2 } = require('../packages/compiler/src/store/ensureV2.ts');
const { toWire } = require('../packages/compiler/src/store/wire.ts');
const repo = path.resolve(__dirname, '..');
const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-component-performance-')));
const project = path.join(directory, 'project'), data = path.join(directory, 'data');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
write(path.join(project, 'package.json'), { name: 'component-performance-test', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
const source = `import type {CSSProperties} from 'react';
export function DenseCard({density='compact',label='Card',style}:{density?:'compact'|'roomy';label?:string;style?:CSSProperties}) {
 return <section data-dense-card data-density={density} style={{padding:density==='roomy'?16:8,border:'1px solid #aaa',...style}}>
  <h3>{label}</h3><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:density==='roomy'?8:4}}>
   {Array.from({length:40},(_,index)=><div key={index} data-dense-row style={{display:'flex',justifyContent:'space-between'}}><span>Row {index+1}</span><strong>{index*7}</strong></div>)}
  </div>
 </section>
}`;
write(path.join(project, 'src/DenseCard.tsx'), source);
write(path.join(project, 'src/App.tsx'), `import {DenseCard} from './DenseCard';export default function App(){return <DenseCard/>}`);
const fixture = ensureV2([{ id: 'performance-frame', type: 'html', tag: 'div', styles: { width: 1100, height: 800, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, overflow: 'auto' }, canvasPosition: { x: 20, y: 20 }, children: Array.from({ length: 80 }, (_, index) => ({ id: `card-${index}`, type: 'component', componentName: 'DenseCard', props: { label: `Card ${index}` }, styles: {} })) }]);
const pageId = crypto.randomUUID(), pageFile = path.join(project, '.bingo/design/pages', pageId + '.json');
write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion: 1, documentId: crypto.randomUUID(), pages: [{ id: pageId }] });
write(pageFile, { schemaVersion: 1, id: pageId, name: 'Large canvas', canvas: { zoom: 1, pan: { x: 30, y: 50 }, elements: toWire(fixture) }, newClasses: [] });
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'zh-CN' });
write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'Component performance QA', addedAt: Date.now() }]);
app.commandLine.appendSwitch('user-data-dir', data);
const report = { directory, checks: [], environment: { platform: process.platform, release: os.release(), arch: process.arch, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, memoryGB: os.totalmem() / 1024 ** 3, electron: process.versions.electron, chrome: process.versions.chrome }, workload: { instances: 80, rowsPerInstance: 40, totalRows: 3200 }, cold: { samples: 1, cache: 'new project and profile; includes first compilation and rendering, excludes application shell boot' } };
const evaluate = (wc, code) => { wc.setBackgroundThrottling(false); return wc.executeJavaScript(code, true); };
const waitFor = async (fn, label) => { const start = Date.now(); while (Date.now() - start < 60000) { const result = await fn(); if (result) return result; await new Promise(resolve => setTimeout(resolve, 50)); } throw Error('Timed out: ' + label); };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); console.log('PASS', name); };
require(path.join(repo, 'out/main/index.js'));
const timeout = setTimeout(() => { console.error('Performance test timeout'); app.exit(1); }, 180000);
app.whenReady().then(async () => {
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(win => !win.isDestroyed()), 'shell window'); win.setSize(1500, 980); win.show();
    await waitFor(() => evaluate(win.webContents, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    const started = performance.now();
    await evaluate(win.webContents, `window.api.invoke('project-tabs:open',{projectId:${JSON.stringify(project)}})`);
    const editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await require('./editor-test-foreground.cjs').foregroundEditor(editor);
    await waitFor(() => evaluate(editor, 'document.querySelectorAll("[data-canvas-content] [data-dense-row]").length===3200').catch(() => false), 'complete large canvas');
    report.cold.renderMs = performance.now() - started;
    if (await evaluate(editor, 'localStorage.getItem("bingo-editor-mode")!=="design"')) {
      editor.sendInputEvent({ type: 'keyDown', keyCode: 'j', modifiers: ['meta'] }); editor.sendInputEvent({ type: 'keyUp', keyCode: 'j', modifiers: ['meta'] });
    }
    const selected = performance.now();
    await evaluate(editor, `document.querySelector('[data-canvas-content] [data-element-id=card-0]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}))`);
    await waitFor(() => evaluate(editor, `!!document.querySelector('[data-component-prop=density] select')`), 'first inspector');
    report.cold.firstSelectionMs = performance.now() - selected;
    report.cold.readyMs = performance.now() - started;
    report.workload.domElements = await evaluate(editor, `document.querySelectorAll('[data-canvas-content] *').length`);
    report.warm = await evaluate(editor, `(async()=>{
      const preview=[],selection=[];
      const wait=fn=>new Promise((resolve,reject)=>{const start=performance.now();const poll=()=>{if(fn())resolve();else if(performance.now()-start>5000)reject(Error('Interaction timeout'));else requestAnimationFrame(poll)};requestAnimationFrame(poll)});
      for(let i=0;i<30;i++){
        const density=i%2?'compact':'roomy';const field=document.querySelector('[data-component-prop=density] select');
        const started=performance.now();field.value=[...field.options].find(option=>option.textContent===density).value;field.dispatchEvent(new Event('change',{bubbles:true}));
        await wait(()=>document.querySelector('[data-element-id=card-0] [data-dense-card]').dataset.density===density);
        preview.push(performance.now()-started);
      }
      for(let i=0;i<30;i++){
        const index=i%2?0:1;const started=performance.now();
        document.querySelector('[data-canvas-content] [data-element-id=card-'+index+']').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}));
        await wait(()=>document.querySelector('[data-component-prop=label] input')?.value==='Card '+index);
        selection.push(performance.now()-started);
      }
      const stats=values=>{values.sort((a,b)=>a-b);return {samples:values.length,p50:values[Math.ceil(values.length*0.5)-1],p95:values[Math.ceil(values.length*0.95)-1],max:values.at(-1),values}};
      return {cache:'warm',preview:stats(preview),selection:stats(selection)};
    })()`);
    check('All 80 complex instances and 3200 rows remain mounted during measurements', await evaluate(editor, 'document.querySelectorAll("[data-canvas-content] [data-dense-row]").length===3200'));
    check('Cached parameter selection P95 stays below 100ms on the large canvas', report.warm.selection.p95 <= 100);
    check('Complex preview timings include the actual component render and are recorded separately', report.warm.preview.samples === 30 && report.warm.preview.values.every(Number.isFinite));
    await evaluate(editor, `document.querySelector('[data-component-prop=density] button').click()`);
    await waitFor(() => evaluate(editor, `document.querySelector('[data-component-prop=density]').textContent.includes('默认')`), 'restored parameter default');
    await evaluate(editor, `(()=>{const pending=[];window.dispatchEvent(new CustomEvent('bingo:prepare-project-close',{detail:{pending}}));return Promise.all(pending)})()`);
    const saved = ensureV2(JSON.parse(fs.readFileSync(pageFile, 'utf8')).canvas.elements);
    for (let index = 0; index < 80; index++) {
      assert.deepEqual(saved.byId.get('card-' + index).props, fixture.byId.get('card-' + index).props);
      assert.deepEqual(saved.byId.get('card-' + index).styles, fixture.byId.get('card-' + index).styles);
    }
    check('Resetting the measured parameter preserves all instance values and component source', fs.readFileSync(path.join(project, 'src/DenseCard.tsx'), 'utf8') === source);
    report.passed = true;
    console.log(JSON.stringify({ cold: report.cold, previewP95: report.warm.preview.p95, selectionP95: report.warm.selection.p95 }));
  } catch (error) { report.failure = error.stack; console.error(error); }
  finally { clearTimeout(timeout); const file = path.join(repo, 'output/component-instance-editing/performance-report.json'); write(file, report); app.exit(report.passed ? 0 : 1); }
});
