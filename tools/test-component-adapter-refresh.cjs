/* Actual definition write, compiler failure and UI retry; fresh isolated project. */
const { app, BrowserWindow, webContents } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-adapter-refresh-')));
const project = path.join(directory, 'project'), data = path.join(directory, 'data');
const output = path.join(repo, 'output/component-instance-editing');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
write(path.join(project, 'package.json'), { name: 'adapter-refresh-test', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
const file = path.join(project, 'src/RefreshProbe.tsx'), dependency = path.join(project, 'src/helper.ts');
write(dependency, "export const text = 'Ready';");
write(file, `import type { CSSProperties } from 'react'; import { text } from './helper';
export function RefreshProbe({ label = text, style }: { label?: string; style?: CSSProperties }) {
  return <button style={{padding: '8px 16px', borderRadius: '4px 8px', ...style}}>{label}</button>;
}`);
const pageId = require('node:crypto').randomUUID();
const pageFile = path.join(project, '.bingo/design/pages', `${pageId}.json`);
write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion: 1, documentId: require('node:crypto').randomUUID(), pages: [{ id: pageId }] });
write(pageFile, { schemaVersion: 1, id: pageId, name: 'Refresh', canvas: { zoom: 1, pan: { x: 30, y: 50 }, elements: [{ id: 'frame', type: 'html', tag: 'div', styles: { width: 500, height: 250, padding: 24, display: 'flex', gap: 24 }, children: [
  { id: 'probe-a', type: 'component', componentName: 'RefreshProbe', props: {}, styles: { borderRadius: '12px' } },
  { id: 'probe-b', type: 'component', componentName: 'RefreshProbe', props: { label: 'Other' }, styles: {} },
] }] }, newClasses: [] });
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'zh-CN' });
write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'Adapter refresh QA', addedAt: Date.now() }]);
const report = { directory, scope: 'Real Electron editor and project compiler; isolated dependency syntax failure after reviewing a valid adaptation.', checks: [], errors: [] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, code) => { wc.setBackgroundThrottling(false); return wc.executeJavaScript(code, true); };
const check = (label, value) => { assert.ok(value, label); report.checks.push(label); console.log('PASS', label); };
async function waitFor(fn, label) { const start = Date.now(); while (Date.now() - start < 30000) { const value = await fn(); if (value) return value; await sleep(60); } throw Error('Timed out: ' + label); }
app.commandLine.appendSwitch('user-data-dir', data);
app.on('web-contents-created', (_event, wc) => wc.on('console-message', (_e, level, message) => { if (level >= 3) report.errors.push(message); }));
require(path.join(repo, 'out/main/index.js'));
const timer = setTimeout(() => { report.failure = 'QA timeout'; write(path.join(output, 'adapter-refresh-report.json'), report); app.exit(1); }, 150000);
app.whenReady().then(async () => {
  let editor;
  try {
    const shell = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'shell');
    shell.setSize(1500, 980); shell.show();
    await waitFor(() => evaluate(shell.webContents, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell UI');
    await evaluate(shell.webContents, `window.api.invoke('project-tabs:open',{projectId:${JSON.stringify(project)}})`);
    editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await require('./editor-test-foreground.cjs').foregroundEditor(editor);
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-viewport] [data-element-id=probe-a] button")'), 'component');
    if (await evaluate(editor, 'localStorage.getItem("bingo-editor-mode")!=="design"')) {
      editor.sendInputEvent({ type: 'keyDown', keyCode: 'j', modifiers: ['meta'] });
      editor.sendInputEvent({ type: 'keyUp', keyCode: 'j', modifiers: ['meta'] });
    }
    const select = async id => { await evaluate(editor, `document.querySelector('[data-canvas-viewport] [data-element-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}));true`); await sleep(100); };
    const click = selector => evaluate(editor, `document.querySelector(${JSON.stringify(selector)}).click();true`);
    const flush = async () => {
      await evaluate(editor, `window.__refreshSaved=false;(()=>{const pending=[];window.dispatchEvent(new CustomEvent('bingo:prepare-project-close',{detail:{pending}}));Promise.all(pending).then(()=>window.__refreshSaved=true)})();true`);
      await waitFor(() => evaluate(editor, 'window.__refreshSaved'), 'save flush');
      return JSON.parse(fs.readFileSync(pageFile)).canvas.elements;
    };
    await select('probe-a');
    const baseline = await flush();
    for (const kind of ['style', 'theme']) {
      await waitFor(() => evaluate(editor, `!!document.querySelector('[data-review-${kind}-adapter]')`), kind + ' review');
      const originalSource = fs.readFileSync(file, 'utf8');
      await click(`[data-review-${kind}-adapter]`);
      await waitFor(() => evaluate(editor, `!!document.querySelector('[data-apply-${kind}-adapter]')`), kind + ' proposal');
      check(kind + ': review does not write component source', fs.readFileSync(file, 'utf8') === originalSource);
      write(dependency, 'export const text = ;');
      await click(`[data-apply-${kind}-adapter]`);
      await waitFor(() => evaluate(editor, `!!document.querySelector('[data-component-adapter-kind="${kind}"][data-component-adapter-state="failed"]')`), kind + ' saved but refresh failed');
      const savedSource = fs.readFileSync(file, 'utf8');
      const failed = `[data-component-adapter-kind="${kind}"][data-component-adapter-state="failed"]`;
      check(kind + ': successful source write is distinguished from failed refresh', savedSource !== originalSource && await evaluate(editor, `document.querySelector('${failed}').textContent.includes('源码已保存') && !!document.querySelector('${failed} [role=alert]') && !document.querySelector('[data-component-${kind}-adapted]')`));
      const mtime = fs.statSync(file).mtimeMs;
      await click(`${failed} [data-component-adapter-open-source]`);
      await waitFor(() => evaluate(editor, `Array.from(document.querySelectorAll('.cm-content')).some(n=>n.textContent.includes('function RefreshProbe'))`), kind + ' saved source editor');
      check(kind + ': refresh failure provides a working source editor entry without another write', fs.statSync(file).mtimeMs === mtime);
      await click(`${failed} [data-component-adapter-retry]`);
      await waitFor(() => evaluate(editor, `!!document.querySelector('${failed}')`), kind + ' retry failure');
      check(kind + ': retry rebuilds without repeating the applied source write', fs.readFileSync(file, 'utf8') === savedSource && fs.statSync(file).mtimeMs === mtime);
      await select('probe-b');
      check(kind + ': saved failure remains visible when another instance is selected', await evaluate(editor, `!!document.querySelector('${failed}') && !document.querySelector('[data-apply-${kind}-adapter]')`));
      await select('probe-a');
      fs.writeFileSync(path.join(output, `adapter-${kind}-refresh-failed.png`), (await editor.capturePage()).toPNG());
      write(dependency, "export const text = 'Repaired';");
      await click(`${failed} [data-component-adapter-retry]`);
      await waitFor(() => evaluate(editor, `!!document.querySelector('[data-component-${kind}-adapted]') && document.querySelector('[data-element-id=probe-a] button')?.textContent==='Repaired'`), kind + ' repaired implementation and contract');
      check(kind + ': fixing dependency and retrying enables the updated implementation and contract', fs.readFileSync(file, 'utf8') === savedSource && fs.statSync(file).mtimeMs === mtime);
      assert.deepEqual(await flush(), baseline);
      check(kind + ': adaptation, failures and retries preserve all instance data', true);
    }
    report.passed = true;
  } catch (error) { report.failure = error.stack; console.error(error); if (editor) fs.writeFileSync(path.join(output, 'adapter-refresh-failure.png'), (await editor.capturePage()).toPNG()); }
  finally { clearTimeout(timer); write(path.join(output, 'adapter-refresh-report.json'), report); app.exit(report.passed ? 0 : 1); }
});
