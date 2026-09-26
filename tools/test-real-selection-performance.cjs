/* Usage: BINGO_SELECTION_FIXTURE=/path/to/page.json pnpm exec electron tools/test-real-selection-performance.cjs
 * Runs a saved page in an isolated project/profile and reports selection timings.
 */
const { app, BrowserWindow, webContents } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const repo = path.resolve(__dirname, '..');
const source = process.env.BINGO_SELECTION_FIXTURE;
if (!source) throw Error('BINGO_SELECTION_FIXTURE is required');
const page = JSON.parse(fs.readFileSync(source, 'utf8'));
const byId = page.canvas.elements.byId;
const children = page.canvas.elements.childrenByParent;
const root = children.ROOT?.[0];
const section = children[root]?.find(id => byId[id]?.tag === 'section') ?? children[root]?.[0];
if (!root || !section) throw Error('Fixture needs a root and child');
const qa = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-real-selection-')));
const project = path.join(qa, 'project');
const data = path.join(qa, 'data');
const pageId = crypto.randomUUID();
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
write(path.join(project, 'package.json'), { name: 'selection-fixture', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
write(path.join(project, 'src/App.tsx'), 'export default function App(){return <div>Selection QA</div>}');
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion: 1, documentId: crypto.randomUUID(), pages: [{ id: pageId }] });
write(path.join(project, '.bingo/design/pages', pageId + '.json'), { ...page, id: pageId, name: 'Selection fixture' });
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'zh-CN' });
write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'Selection fixture', addedAt: Date.now() }]);
write(path.join(data, 'project-tabs.json'), []);
app.commandLine.appendSwitch('user-data-dir', data);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
async function waitFor(fn, label, timeout = 45000) { const start = Date.now(); while (Date.now() - start < timeout) { const value = await fn(); if (value) return value; await sleep(100); } throw Error('Timed out: ' + label); }
require(path.join(repo, 'out/main/index.js'));
const timeout = setTimeout(() => { console.error('Timed out:', qa); app.exit(1); }, 150000);
timeout.unref();
app.whenReady().then(async () => {
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window');
    win.setSize(1600, 1000); win.show(); win.webContents.closeDevTools();
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await evaluate(shell, `window.api.invoke('project-tabs:open', ${JSON.stringify({ projectId: project })})`);
    const editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await waitFor(() => evaluate(editor, `!!document.querySelector('[data-layer-id=${JSON.stringify(root)}]')`).catch(() => false), 'layers');
    await sleep(2000);
    const result = { fixtureNodes: Object.keys(byId).length, root, section, samples: {} };
    await evaluate(editor, `document.querySelector('[data-canvas-performance] button').click()`);
    for (const [mode, count] of [['design', 5], ['dev', 5]]) {
      const currentMode = await evaluate(editor, `localStorage.getItem('bingo-editor-mode')`);
      if (currentMode !== mode) {
        editor.focus();
        editor.sendInputEvent({ type: 'keyDown', keyCode: 'j', modifiers: ['meta'] });
        editor.sendInputEvent({ type: 'keyUp', keyCode: 'j', modifiers: ['meta'] });
      }
      await sleep(300);
      result.samples[mode] = [];
      for (let i = 0; i < count; i++) {
        const id = i % 2 ? section : root;
        const measurement = await evaluate(editor, `new Promise(resolve => {
          const id = ${JSON.stringify(id)};
          const el = document.querySelector('[data-layer-id="' + CSS.escape(id) + '"]');
          if (!el) throw Error('Layer missing: ' + id);
          const started = performance.now();
          const observer = new PerformanceObserver(list => { for (const item of list.getEntries()) longTasks.push(item.duration); });
          const longTasks = [];
          observer.observe({ entryTypes: ['longtask'] });
          el.click();
          const handler = performance.now() - started;
          requestAnimationFrame(() => requestAnimationFrame(() => {
            observer.disconnect();
            resolve({ id, handler, twoFrames: performance.now() - started, longTasks,
              selected: [...document.querySelectorAll('[data-selection-overlay-id]')].map(node => node.getAttribute('data-selection-overlay-id')),
              codeLength: document.querySelector('.cm-content')?.textContent.length ?? 0 });
          }));
        })`);
        result.samples[mode].push(measurement);
        await sleep(200);
        measurement.afterCodeLength = await evaluate(editor, `document.querySelector('.cm-content')?.textContent.length ?? 0`);
        assert.deepEqual(measurement.selected, [id], `Layer click should select ${id}`);
        if (mode === 'dev') assert.ok(measurement.afterCodeLength > 100, 'Selection JSX should load after canvas paint');
      }
      result.samples[mode + 'Metrics'] = await evaluate(editor, `Object.fromEntries([...document.querySelectorAll('[data-canvas-performance] tbody tr')].map(row=>{const cells=[...row.children].map(c=>c.textContent);return [cells[0],{last:cells[1],p95:cells[2],count:Number(cells[3])}]}))`);
    }
    console.log(JSON.stringify(result, null, 2));
    app.quit();
  } catch (error) { console.error(qa, error); app.exit(1); }
});
