/* Reviewed theme adaptation, actual preview and standalone generated code.
 * Run after the component editing fixture; uses only its isolated project.
 */
const { app, BrowserWindow, webContents, shell } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
require('tsx/cjs');
const { generateCompleteFile } = require('../packages/compiler/src/codegen/generateCompleteFile.ts');
const { ensureV2 } = require('../packages/compiler/src/store/ensureV2.ts');
const { extractComponentMetadata } = require('../src/main/componentPropMetadata.ts');
const repo = path.resolve(__dirname, '..'), output = path.join(repo, 'output/component-instance-editing');
const previous = JSON.parse(fs.readFileSync(path.join(output, 'report.json')));
assert.equal(previous.passed, true);
const directory = fs.realpathSync(previous.directory), project = path.join(directory, 'project');
assert.equal(path.dirname(directory), fs.realpathSync(os.tmpdir()));
assert.ok(path.basename(directory).startsWith('bingo-component-editing-'));
assert.equal(JSON.parse(fs.readFileSync(path.join(project, 'package.json'))).name, 'component-editing-test');
const sourceFile = path.join(project, 'src/ThemeDefaults.tsx');
const source = `import { Children, isValidElement } from 'react'; import type { CSSProperties, ReactNode } from 'react'; import './adapter-theme.css';
export function ThemeDefaults({ label = 'Themed defaults', style = { borderRadius: 23, padding: 9, backgroundColor: 'var(--adapter-surface)' } }: { label?: string; style?: CSSProperties | null }) {
  return <button data-adapter-kind={style === null ? 'null' : Object.keys(style).length ? 'nonempty' : 'empty'} style={style}>{label}</button>;
}
export function ThemeHost({ asChild = true, children }: { asChild?: boolean; children?: ReactNode }) {
  const child = Children.only(children);
  if (!isValidElement(child) || child.type !== ThemeDefaults) throw new Error('ThemeHost needs the original ThemeDefaults element');
  return <article data-theme-host>{child}</article>;
}`;
fs.writeFileSync(sourceFile, source);
fs.writeFileSync(path.join(project, 'src/adapter-theme.css'), ':root { --adapter-surface: #ffffff; }\n.dark { --adapter-surface: #123456; }\n');
const manifest = JSON.parse(fs.readFileSync(path.join(project, '.bingo/design/manifest.json')));
const pageFile = path.join(project, '.bingo/design/pages', `${manifest.pages[0].id}.json`);
const page = JSON.parse(fs.readFileSync(pageFile)), store = page.canvas.elements;
const ids = ['adapter-default', 'adapter-empty', 'adapter-null', 'adapter-override'];
store.byId['adapter-frame'] = { id: 'adapter-frame', type: 'html', tag: 'div', styles: { width: 700, height: 180, display: 'flex', gap: 16, padding: 16 }, canvasPosition: { x: 600, y: 420 } };
store.childrenByParent['adapter-frame'] = [...ids];
for (const [index, id] of ids.entries()) {
  store.byId[id] = { id, type: 'component', componentName: 'ThemeDefaults', props: index === 1 ? { style: {} } : index === 2 ? { style: null } : {}, styles: index === 3 ? { borderRadius: '12px' } : {}, theme: { version: 1, localCollectionModes: { 'project-styles': 'dark' } } };
  store.childrenByParent[id] = [];
}
store.byId['adapter-root'] = { ...store.byId['adapter-default'], id: 'adapter-root', canvasPosition: { x: 800, y: 650 } };
store.childrenByParent['adapter-root'] = [];
store.byId['adapter-nested-host'] = { id: 'adapter-nested-host', type: 'component', componentName: 'ThemeHost', props: {}, styles: {} };
store.byId['adapter-nested-child'] = { ...store.byId['adapter-default'], id: 'adapter-nested-child' };
store.childrenByParent['adapter-nested-host'] = ['adapter-nested-child'];
store.childrenByParent['adapter-nested-child'] = [];
store.childrenByParent['adapter-frame'].push('adapter-nested-host');
for (const id of ['adapter-frame', 'adapter-root']) if (!store.childrenByParent.ROOT.includes(id)) store.childrenByParent.ROOT.push(id);
fs.writeFileSync(pageFile, JSON.stringify(page));
const report = { directory, checks: [], errors: [], snapshots: {} };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, script) => { wc.setBackgroundThrottling(false); return wc.executeJavaScript(script, true); };
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const check = (label, value) => { assert.ok(value, label); report.checks.push(label); console.log('PASS', label); };
async function waitFor(fn, label) { const start = Date.now(); while (Date.now() - start < 45000) { const value = await fn(); if (value) return value; await sleep(100); } throw Error('Timed out: ' + label); }
let openedUrl;
shell.openExternal = async url => { openedUrl = url; };
app.commandLine.appendSwitch('user-data-dir', path.join(directory, 'data'));
app.on('web-contents-created', (_event, wc) => wc.on('console-message', (_e, level, message) => { if (level >= 3) report.errors.push(message); }));
require(path.join(repo, 'out/main/index.js'));
const timer = setTimeout(() => { report.failure = 'Theme adapter QA timeout'; fs.writeFileSync(path.join(output, 'theme-adapter-report.json'), JSON.stringify(report, null, 2)); app.exit(1); }, 180000);
app.whenReady().then(async () => {
  let editor, standalone, browser;
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window'); win.setSize(1500, 980); win.show();
    await waitFor(() => evaluate(win.webContents, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await invoke(win.webContents, 'project-tabs:open', { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await require('./editor-test-foreground.cjs').foregroundEditor(editor);
    await evaluate(editor, `window.__themeAdapterBuilds=[];window.api.on('bingo:builder-event',e=>{if(e.type.startsWith('components:'))window.__themeAdapterBuilds.push({type:e.type,metadata:e.payload?.componentIndex?.ThemeDefaults})});true`);
    const select = async id => { await evaluate(editor, `document.querySelector('[data-canvas-viewport] [data-element-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}))`); await sleep(150); };
    const click = async selector => { await evaluate(editor, `document.querySelector(${JSON.stringify(selector)}).click()`); await sleep(150); };
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-element-id=adapter-default] button")'), 'adapter component');
    await select('adapter-default');
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-review-theme-adapter]")'), 'theme review entry');
    await click('[data-review-theme-adapter]');
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-component-theme-adapter] pre")'), 'proposal');
    check('Theme adaptation is explicitly reviewed before any source write', fs.readFileSync(sourceFile, 'utf8') === source && await evaluate(editor, `document.querySelector('[data-component-theme-adapter] pre').textContent.includes('themeVariables') && document.querySelector('[data-component-theme-adapter] [role=region]').textContent.includes('影响它的所有实例')`));
    await click('[data-component-theme-adapter] [role=region] button:last-child');
    check('Cancelling theme adaptation leaves the definition and instances unchanged', fs.readFileSync(sourceFile, 'utf8') === source);
    const proposal = await invoke(editor, 'component-style:adapt', { projectId: project, componentName: 'ThemeDefaults', kind: 'theme', mode: 'preview' });
    assert.equal(proposal.success, true);
    const wrongKind = await invoke(editor, 'component-style:adapt', { projectId: project, componentName: 'ThemeDefaults', kind: 'theme', mode: 'apply', reviewed: { ...proposal, kind: 'style' } });
    check('Applying a different adaptation than the reviewed kind is rejected', !wrongKind.success && fs.readFileSync(sourceFile, 'utf8') === source);
    await click('[data-review-theme-adapter]');
    await click('[data-apply-theme-adapter]');
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-component-theme-adapted]")'), 'applied metadata');
    check('Applied theme support keeps the implementation input out of ordinary parameter controls', !await evaluate(editor, '!!document.querySelector("[data-component-prop=themeVariables]")'));
    const snapshot = async (wc, selector) => evaluate(wc, `(()=>{const n=${selector};if(!n)return null;const s=getComputedStyle(n);return {kind:n.dataset.adapterKind,text:n.textContent,radius:s.borderTopLeftRadius,padding:n.style.padding,surface:s.getPropertyValue('--adapter-surface').trim(),background:n.style.backgroundColor ? s.backgroundColor : null}})()`);
    for (const id of [...ids, 'adapter-root', 'adapter-nested-host']) report.snapshots[id] = await snapshot(editor, `document.querySelector('[data-canvas-viewport] [data-element-id="${id}"] button')`);
    check('Adapted canvas preserves style defaults, empty, null and explicit overrides under a local theme', report.snapshots['adapter-default'].radius === '23px' && report.snapshots['adapter-default'].padding === '9px' && report.snapshots['adapter-default'].background === 'rgb(18, 52, 86)' && report.snapshots['adapter-empty'].kind === 'empty' && report.snapshots['adapter-null'].kind === 'null' && report.snapshots['adapter-override'].radius === '12px');
    check('Unwrapped child theme input preserves the original element type and style default', report.snapshots['adapter-nested-host'].radius === '23px' && report.snapshots['adapter-nested-host'].background === 'rgb(18, 52, 86)' && await evaluate(editor, `document.querySelector('[data-canvas-viewport] [data-element-id="adapter-nested-host"] article').firstElementChild.localName==='button'`));
    await evaluate(editor, `(()=>{const n=document.querySelector('[data-component-prop=label] input');n.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'Changed theme label');n.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    await sleep(100); await evaluate(editor, 'document.activeElement.blur()');
    await waitFor(() => evaluate(editor, `document.querySelector('[data-element-id="adapter-default"] button').textContent==='Changed theme label' && !document.querySelector('[data-component-preview]')`), 'adapted parameter commit');
    const changed = await snapshot(editor, `document.querySelector('[data-canvas-viewport] [data-element-id="adapter-default"] button')`);
    check('Normal parameter edits keep the independent theme and component default styles', changed.radius === '23px' && changed.background === 'rgb(18, 52, 86)');
    editor.sendInputEvent({ type: 'keyDown', keyCode: 'z', modifiers: ['meta'] }); editor.sendInputEvent({ type: 'keyUp', keyCode: 'z', modifiers: ['meta'] });
    await waitFor(() => evaluate(editor, `document.querySelector('[data-element-id="adapter-default"] button').textContent==='Themed defaults'`), 'undo parameter edit');
    const library = (await invoke(editor, 'bingo:store', { op: 'read-variable-library', root: project })).library;
    const componentIndex = Object.fromEntries(Object.entries(extractComponentMetadata(fs.readFileSync(sourceFile, 'utf8'))).map(([name, info]) => [name, { ...info, path: 'src/ThemeDefaults.tsx', exportName: name }]));
    const outputDirectory = path.join(project, '.bingo/theme-adapter-qa'); fs.mkdirSync(outputDirectory, { recursive: true });
    const imports = [], cases = [];
    const exportIds = [...ids, 'adapter-nested-host'];
    for (const [index, id] of exportIds.entries()) {
      const name = `ThemedCase${index}`, targetFilePath = `.bingo/theme-adapter-qa/${name}.tsx`;
      const code = generateCompleteFile({ componentName: name, store: ensureV2(store), rootId: id, componentIndex, variableLibrary: library, targetFilePath, includeReactImport: true });
      assert.match(code, /themeVariables=/);
      if (id === 'adapter-default') assert.doesNotMatch(code, / style=/);
      fs.writeFileSync(path.join(project, targetFilePath), code);
      imports.push(`import {${name}} from './${name}';`); cases.push(`<div id="${id}"><${name}/></div>`);
    }
    const bundle = await require('esbuild').build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';${imports.join('\n')}createRoot(document.getElementById('root')).render(<>${cases.join('')}</>);`, resolveDir: outputDirectory, loader: 'tsx' }, outfile: path.join(outputDirectory, 'bundle.js'), bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
    standalone = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: true } });
    await standalone.loadURL('data:text/html,<div id="root"></div>');
    for (const file of bundle.outputFiles.filter(file => file.path.endsWith('.css'))) await evaluate(standalone.webContents, `(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(file.text)};document.head.append(s)})()`);
    await evaluate(standalone.webContents, bundle.outputFiles.find(file => file.path.endsWith('.js')).text);
    for (const id of exportIds) {
      const actual = await waitFor(() => snapshot(standalone.webContents, `document.querySelector('#${id} button')`), `standalone ${id}`);
      assert.deepEqual(actual, report.snapshots[id]);
      check(`Standalone themed export preserves the actual component contract for ${id}`, true);
    }
    check('Generated themed exports require no editor runtime or additional component root', await evaluate(standalone.webContents, '!window.api && !document.querySelector("[data-component-root-host]") && document.querySelectorAll("#root > div > button").length===4'));
    await select('adapter-root');
    await evaluate(editor, `document.querySelector('button[aria-label=预览]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}))`);
    await waitFor(() => evaluate(editor, '!!document.querySelector("[role=menu]")'), 'preview menu');
    await evaluate(editor, `Array.from(document.querySelectorAll('[role=menuitem]')).find(n=>n.textContent.includes('窗口预览')).click()`);
    const previewButton = `document.querySelector('[role=dialog][aria-label=预览] iframe')?.contentDocument?.querySelector('[data-element-id=adapter-root] button')`;
    const floating = await waitFor(() => snapshot(editor, previewButton).catch(() => null), 'root responsive preview');
    assert.deepEqual(floating, report.snapshots['adapter-root']);
    check('Responsive root-component preview preserves its default style argument and local theme', true);
    await evaluate(editor, 'document.querySelector("[aria-label=在浏览器中预览]").click()');
    await waitFor(() => openedUrl, 'web preview URL');
    browser = new BrowserWindow({ width: 1200, height: 850, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    await browser.loadURL(openedUrl);
    const web = await waitFor(() => snapshot(browser.webContents, `document.querySelector('iframe')?.contentDocument?.querySelector('[data-element-id=adapter-root] button')`).catch(() => null), 'web root preview');
    assert.deepEqual(web, report.snapshots['adapter-root']);
    check('Web root-component preview preserves the same default and theme', true);
    await evaluate(editor, `(()=>{window.__themeAdapterSaved=false;const pending=[];window.dispatchEvent(new CustomEvent('bingo:prepare-project-close',{detail:{pending}}));Promise.all(pending).then(()=>window.__themeAdapterSaved=true)})()`);
    await waitFor(() => evaluate(editor, 'window.__themeAdapterSaved'), 'save instances');
    const saved = JSON.parse(fs.readFileSync(pageFile)).canvas.elements;
    for (const id of [...ids, 'adapter-root', 'adapter-nested-host', 'adapter-nested-child']) assert.deepEqual(saved.byId[id], store.byId[id]);
    check('Theme runtime values never become authored component parameters or overrides', true);
    fs.writeFileSync(path.join(output, 'component-theme-adapter.png'), (await editor.capturePage()).toPNG());
    report.passed = true;
  } catch (error) {
    report.failure = error.stack || String(error); console.error(report.failure);
    if (editor && !editor.isDestroyed()) report.builds = await evaluate(editor, 'window.__themeAdapterBuilds').catch(() => null);
    if (editor && !editor.isDestroyed()) fs.writeFileSync(path.join(output, 'component-theme-adapter-failure.png'), (await editor.capturePage()).toPNG());
  } finally {
    clearTimeout(timer); browser?.destroy(); standalone?.destroy();
    fs.writeFileSync(path.join(output, 'theme-adapter-report.json'), JSON.stringify(report, null, 2)); app.exit(report.passed ? 0 : 1);
  }
});
