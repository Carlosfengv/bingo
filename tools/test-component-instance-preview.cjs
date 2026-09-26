/* Run after the component editing fixture passes:
 * pnpm exec electron tools/test-component-instance-preview.cjs
 * Reuses only that fixture's isolated project/profile. Opens the actual preview
 * UI and web transport, then runs generated files without the editor runtime.
 */
const { app, BrowserWindow, webContents, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
require('tsx/cjs');
const { generateCompleteFile } = require('../packages/compiler/src/codegen/generateCompleteFile.ts');
const { ensureV2 } = require('../packages/compiler/src/store/ensureV2.ts');
const { extractComponentMetadata } = require('../src/main/componentPropMetadata.ts');
const repo = path.resolve(__dirname, '..');
const output = path.join(repo, 'output/component-instance-editing');
const previous = JSON.parse(fs.readFileSync(path.join(output, 'report.json'), 'utf8'));
assert.equal(previous.passed, true);
const directory = fs.realpathSync(previous.directory);
assert.equal(path.dirname(directory), fs.realpathSync(os.tmpdir()));
assert.ok(path.basename(directory).startsWith('bingo-component-editing-'));
const project = path.join(directory, 'project');
assert.equal(JSON.parse(fs.readFileSync(path.join(project, 'package.json'))).name, 'component-editing-test');
const manifest = JSON.parse(fs.readFileSync(path.join(project, '.bingo/design/manifest.json')));
const pageId = manifest.pages[0].id;
const pageFile = path.join(project, '.bingo/design/pages', `${pageId}.json`);
const page = JSON.parse(fs.readFileSync(pageFile));
const originalStore = page.canvas.elements;
// Keep one untouched legacy dual-source instance: the editing fixture has
// intentionally consolidated its original legacy example by this point.
if (!originalStore.byId['preview-legacy']) {
  originalStore.byId['preview-legacy'] = { id: 'preview-legacy', type: 'component', componentName: 'Button', props: { label: 'Unedited legacy', style: { borderRadius: '20px', color: '#fde047' } }, styles: { borderRadius: '8px', fontSize: '15px' } };
  originalStore.childrenByParent['source-frame'].push('preview-legacy');
  fs.writeFileSync(pageFile, JSON.stringify(page));
}
const groups = [
  { root: 'frame', ids: ['button-a', 'button-b', 'opaque'] },
  { root: 'source-frame', ids: ['legacy-static', 'preview-legacy', 'default-style', 'default-style-empty', 'default-style-null', 'contract-a', 'scan-only'] },
  { root: 'nested-frame', ids: ['host-a', 'host-b'] },
];
const ids = groups.flatMap(group => group.ids);
const report = { directory, comparisonScope: 'Component arguments, content, explicit style declarations, and their computed values; global unstyled defaults and inherited stylesheet differences are not asserted.', checks: [], errors: [], canvas: {}, floating: {}, browser: {}, standalone: {} };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, code) => { wc.setBackgroundThrottling(false); return wc.executeJavaScript(code, true); };
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const check = (label, value) => { assert.ok(value, label); report.checks.push(label); console.log('PASS', label); };
async function waitFor(fn, label) { const start = Date.now(); while (Date.now() - start < 45000) { const value = await fn(); if (value) return value; await sleep(100); } throw Error('Timed out: ' + label); }
// Only properties authored by the component/instance are compared across the
// independent browser's native stylesheet and the editor's global reset.
function inspect(scope) {
  const node = scope?.matches('button,[data-required],span') ? scope : scope?.querySelector('button,[data-required],span');
  if (!node) return null;
  const properties = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'backgroundColor', 'color', 'fontSize'];
  const style = node.ownerDocument.defaultView.getComputedStyle(node);
  return { tag: node.localName, text: node.textContent, disabled: node.disabled ?? null,
    attributes: Object.fromEntries(['data-size', 'data-count', 'data-required', 'data-flag', 'data-nullable', 'data-amount', 'data-mode'].map(name => [name, node.getAttribute(name)])),
    declarations: Object.fromEntries(properties.map(name => [name, node.style[name]])),
    computed: Object.fromEntries(properties.filter(name => node.style[name] || name.includes('Radius')).map(name => [name, style[name]])),
    hostTone: scope?.querySelector('[data-host-tone]')?.getAttribute('data-host-tone') ?? null,
  };
}
const inspectCode = inspect.toString();
const frameDocument = 'document.querySelector("iframe[data-responsive-preview]")?.contentDocument';
const snapshot = (wc, doc, id, standalone = false) => evaluate(wc, `(${inspectCode})(${doc}?.querySelector(${JSON.stringify(standalone ? `#case-${id}` : `[data-element-id="${id}"]`)}))`);
let openedUrl;
// Keep the user's external browser untouched, but exercise the real launch IPC
// and local presentation server in a window with no Electron preload.
shell.openExternal = async url => { openedUrl = url; };
app.commandLine.appendSwitch('user-data-dir', path.join(directory, 'data'));
app.on('web-contents-created', (_event, wc) => wc.on('console-message', (_e, level, message) => { if (level >= 3) report.errors.push(message); }));
require(path.join(repo, 'out/main/index.js'));
const timer = setTimeout(() => { report.failure = 'Component preview QA timeout'; fs.writeFileSync(path.join(output, 'preview-report.json'), JSON.stringify(report, null, 2)); app.exit(1); }, 180000);
app.whenReady().then(async () => {
  let editor, browser, standalone;
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(window => !window.isDestroyed()), 'window');
    win.setSize(1500, 980); win.show();
    await waitFor(() => evaluate(win.webContents, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await invoke(win.webContents, 'project-tabs:open', { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await require('./editor-test-foreground.cjs').foregroundEditor(editor);
    for (const id of ids) report.canvas[id] = await waitFor(() => snapshot(editor, 'document.querySelector("[data-canvas-viewport]")', id).catch(() => null), `canvas ${id}`);
    check('The matrix includes explicit false, numeric zero and distinct empty style arguments', report.canvas['button-a'].disabled === false && report.canvas['contract-a'].attributes['data-amount'] === '0' && report.canvas['default-style'].computed.borderTopLeftRadius === '23px' && report.canvas['default-style-empty'].computed.borderTopLeftRadius === '0px' && report.canvas['default-style-null'].computed.borderTopLeftRadius === '0px');
    check('Untouched legacy dual-source styles retain the original root precedence', report.canvas['preview-legacy'].computed.borderTopLeftRadius === '20px' && report.canvas['preview-legacy'].computed.fontSize === '15px');
    const choosePreview = async label => {
      await evaluate(editor, `document.querySelector('button[aria-label=预览]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}))`);
      await waitFor(() => evaluate(editor, '!!document.querySelector("[role=menu]")'), 'preview menu');
      await evaluate(editor, `Array.from(document.querySelectorAll('[role=menuitem]')).find(item=>item.textContent.includes(${JSON.stringify(label)})).click()`);
    };
    await evaluate(editor, `document.querySelector('[data-canvas-viewport] [data-element-id=frame]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}))`);
    await choosePreview('窗口预览');
    for (let index = 0; index < groups.length; index++) {
      const group = groups[index];
      if (index) await evaluate(editor, 'document.querySelector("[role=dialog][aria-label=预览] [aria-label=下一帧]").click()');
      for (const id of group.ids) {
        report.floating[id] = await waitFor(() => snapshot(editor, frameDocument, id).catch(() => null), `floating ${id}`);
        assert.deepEqual(report.floating[id], report.canvas[id], `floating preview ${id}`);
      }
      check(`Floating preview preserves component parameters and overrides in ${group.root}`, true);
    }
    await evaluate(editor, 'document.querySelector("[role=dialog][aria-label=预览] [aria-label=重新开始]").click()');
    await waitFor(() => snapshot(editor, frameDocument, 'button-a').catch(() => null), 'restart first frame');
    await evaluate(editor, 'document.querySelector("[aria-label=在浏览器中预览]").click()');
    await waitFor(() => openedUrl, 'browser launch');
    check('Preview launch retains the current page and frame', new URL(openedUrl).searchParams.get('page') === pageId && new URL(openedUrl).searchParams.get('element') === 'frame');
    browser = new BrowserWindow({ width: 1200, height: 850, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    await browser.loadURL(openedUrl);
    const bw = browser.webContents;
    for (let index = 0; index < groups.length; index++) {
      const group = groups[index];
      if (index) await evaluate(bw, 'document.querySelector("[aria-label=下一帧]").click()');
      for (const id of group.ids) {
        report.browser[id] = await waitFor(() => snapshot(bw, frameDocument, id).catch(() => null), `browser ${id}`);
        assert.deepEqual(report.browser[id], report.canvas[id], `browser preview ${id}`);
      }
      check(`Browser presentation preserves component parameters and overrides in ${group.root}`, true);
    }
    check('Browser presentation uses the web transport without Electron preload', await evaluate(bw, '!window.api.getPathForFile'));
    fs.writeFileSync(path.join(output, 'component-browser-preview.png'), (await bw.capturePage()).toPNG());
    await evaluate(bw, `document.querySelector('nav button[aria-pressed]').click()`);
    await waitFor(() => evaluate(bw, '!!document.querySelector("[data-proto-surface]")'), 'original canvas presentation');
    for (const id of groups[2].ids) assert.deepEqual(await snapshot(bw, 'document', id), report.canvas[id], `original canvas presentation ${id}`);
    check('Original canvas presentation preserves nested component arguments and overrides', true);

    const componentIndex = {};
    for (const file of ['Button.tsx', 'ScanOnly.tsx']) {
      const metadata = extractComponentMetadata(fs.readFileSync(path.join(project, 'src', file), 'utf8'));
      for (const [name, info] of Object.entries(metadata)) componentIndex[name] = { path: `src/${file}`, exportName: name, ...info };
    }
    const exportDirectory = path.join(project, '.bingo/preview-qa');
    fs.mkdirSync(exportDirectory, { recursive: true });
    const imports = [], children = [];
    report.exportedFiles = [];
    ids.forEach((id, index) => {
      const name = `Case${index}`;
      const targetFilePath = `.bingo/preview-qa/${name}.tsx`;
      const code = generateCompleteFile({ componentName: name, store: ensureV2(originalStore), rootId: id, componentIndex, targetFilePath, includeReactImport: true });
      fs.writeFileSync(path.join(project, targetFilePath), code);
      report.exportedFiles.push(targetFilePath);
      imports.push(`import {${name}} from './${name}';`);
      children.push(`<div id="case-${id}"><${name}/></div>`);
    });
    const bundle = await require('esbuild').build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';${imports.join('\n')}createRoot(document.getElementById('root')).render(<>${children.join('')}</>);`, resolveDir: exportDirectory, loader: 'tsx' }, bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
    standalone = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: true } });
    await standalone.loadURL('data:text/html,<!doctype html><div id="root"></div>');
    await evaluate(standalone.webContents, bundle.outputFiles[0].text);
    for (const id of ids) {
      report.standalone[id] = await waitFor(() => snapshot(standalone.webContents, 'document', id, true).catch(() => null), `standalone ${id}`);
      assert.deepEqual(report.standalone[id], report.canvas[id], `standalone generated code ${id}`);
      check(`Standalone generated code preserves the component contract for ${id}`, true);
    }
    check('Standalone component exports have no editor wrappers or runtime bridge', await evaluate(standalone.webContents, '!window.api && !document.querySelector("[data-component-root-host],[data-canvas-content]")'));
    fs.writeFileSync(path.join(output, 'component-standalone-preview.png'), (await standalone.webContents.capturePage()).toPNG());
    const finalStore = JSON.parse(fs.readFileSync(pageFile)).canvas.elements;
    for (const id of ids) assert.deepEqual(finalStore.byId[id], originalStore.byId[id]);
    check('Preview and export leave the persisted component instances unchanged', true);
    report.passed = true;
  } catch (error) {
    report.failure = error.stack || String(error); console.error(report.failure);
    if (editor && !editor.isDestroyed()) fs.writeFileSync(path.join(output, 'component-preview-failure.png'), (await editor.capturePage()).toPNG());
  } finally {
    clearTimeout(timer);
    fs.writeFileSync(path.join(output, 'preview-report.json'), JSON.stringify(report, null, 2));
    browser?.destroy(); standalone?.destroy();
    console.log('Preview report', path.join(output, 'preview-report.json'));
    app.exit(report.passed ? 0 : 1);
  }
});
