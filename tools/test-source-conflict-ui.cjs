/* BrowserWindow source conflict flow on an isolated project. Run after pnpm build. */
const { app, BrowserWindow, webContents, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-source-conflict-')));
const project = path.join(base, 'project'), data = path.join(base, 'data');
const output = path.join(repo, 'output/playwright/source-conflict');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
write(path.join(project, 'package.json'), { name: 'source-conflict', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
const file = path.join(project, 'src/App.tsx');
write(file, 'export default function App(){return <main>Original</main>}\n');
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'en' });
write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'Source conflict', addedAt: Date.now() }]);
write(path.join(data, 'project-tabs.json'), []);
app.commandLine.appendSwitch('user-data-dir', data);
dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: false });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(get, label, timeout = 45000) { const start = Date.now(); while (Date.now() - start < timeout) { const value = await get(); if (value) return value; await sleep(100); } throw Error(`Timed out: ${label}`); }
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const checks = [];
const check = (name, value) => { assert.ok(value, name); checks.push(name); console.log('PASS', name); };
setTimeout(() => app.exit(1), 120000).unref();
require(path.join(repo, 'out/main/index.js'));
app.whenReady().then(async () => {
  let editor;
  try {
    const shell = (await waitFor(() => BrowserWindow.getAllWindows().find(win => !win.isDestroyed()), 'window')).webContents;
    await waitFor(() => evaluate(shell, '!!window.api?.invoke').catch(() => false), 'shell preload');
    await invoke(shell, 'project-tabs:open', { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-content]")').catch(() => false), 'canvas');
    await require('./editor-test-foreground.cjs').foregroundEditor(editor);
    await evaluate(editor, `(() => {
      const node=document.querySelector('[data-canvas-content]');let fiber=node[Object.keys(node).find(key=>key.startsWith('__reactFiber'))];while(fiber.return)fiber=fiber.return;const pending=[fiber.stateNode.current];while(pending.length){const f=pending.pop();if((f.type?.name||f.type?.render?.name||f.type?.type?.name)==='Canvas'){f.memoizedProps.onOpenFile('src/App.tsx');return}if(f.sibling)pending.push(f.sibling);if(f.child)pending.push(f.child)}throw Error('Canvas not found');
    })()`);
    await waitFor(() => evaluate(editor, `document.querySelector('.cm-content')?.cmView?.view?.state.doc.toString().includes('Original')`), 'source editor');
    const draft = 'export default function App(){return <main>My draft</main>}\n';
    await evaluate(editor, `(()=>{const view=document.querySelector('.cm-content').cmView.view;view.dispatch({changes:{from:0,to:view.state.doc.length,insert:${JSON.stringify(draft)}}})})()`);
    const disk = 'export default function App(){return <main>Disk edit</main>}\n';
    write(file, disk);
    await evaluate(editor, `document.querySelector('[aria-label="Save file"]').click()`);
    await waitFor(() => evaluate(editor, `document.body.innerText.includes('View disk version')`), 'conflict panel');
    check('Stale editor draft cannot overwrite disk', fs.readFileSync(file, 'utf8') === disk);
    check('Draft stays open after conflict', await evaluate(editor, `document.querySelector('.cm-content').cmView.view.state.doc.toString()===${JSON.stringify(draft)}`));
    check('Closing with a source conflict is blocked', await invoke(shell, 'project-tabs:close', { projectId: project }) === false);
    check('Blocked close keeps the project tab and draft', (await invoke(shell, 'project-tabs:get')).tabs.some(tab => tab.id === project)
      && await evaluate(editor, `document.querySelector('.cm-content').cmView.view.state.doc.toString()===${JSON.stringify(draft)}`));
    await evaluate(editor, `[...document.querySelectorAll('button')].find(button=>button.textContent==='View disk version').click()`);
    check('Disk version is available for comparison', await evaluate(editor, `document.body.innerText.includes('Disk edit')`));
    await evaluate(editor, `[...document.querySelectorAll('button')].find(button=>button.textContent.includes('I merged the changes')).click()`);
    const merged = 'export default function App(){return <main>Disk edit and My draft</main>}\n';
    await evaluate(editor, `(()=>{const view=document.querySelector('.cm-content').cmView.view;view.dispatch({changes:{from:0,to:view.state.doc.length,insert:${JSON.stringify(merged)}}})})()`);
    await evaluate(editor, `document.querySelector('[aria-label="Save file"]').click()`);
    await waitFor(() => fs.readFileSync(file, 'utf8') === merged, 'merged source save');
    check('Explicit manual merge retries against the new disk hash', true);
    const disposable = path.join(project, 'src/disposable.ts');
    const store = (op, args = {}) => invoke(editor, 'bingo:store', { op, root: project, ...args });
    await store('write-file', { rel: 'src/disposable.ts', content: 'before', createOnly: true });
    const opened = await store('read-file-snapshot', { rel: 'src/disposable.ts' });
    write(disposable, 'changed outside');
    check('Stale delete is rejected', await store('delete-file', { rel: 'src/disposable.ts', expectedHash: opened.hash }).then(() => false, () => true));
    check('Stale delete keeps the newer file', fs.readFileSync(disposable, 'utf8') === 'changed outside');
    const latest = await store('read-file-snapshot', { rel: 'src/disposable.ts' });
    await store('delete-file', { rel: 'src/disposable.ts', expectedHash: latest.hash });
    check('Delete with the current hash succeeds', !fs.existsSync(disposable));
    const restoreFile = path.join(project, 'src/restore.ts');
    await store('write-file', { rel: 'src/restore.ts', content: 'first version\n', createOnly: true });
    const first = await store('read-file-snapshot', { rel: 'src/restore.ts' });
    await store('write-file', { rel: 'src/restore.ts', content: 'second version\n', expectedHash: first.hash });
    const versions = await store('file-versions', { rel: 'src/restore.ts' });
    write(path.join(project, 'private.json'), { content: 'should not become source history' });
    check('History IDs cannot traverse outside the version directory', await store('file-version-content', {
      rel: 'src/restore.ts', versionId: '../../../../private',
    }) === null);
    check('Canvas history IDs cannot traverse outside the version directory', await store('canvas-version', {
      pageId: '11111111-1111-4111-8111-111111111111', versionId: '../../../../private',
    }) === null);
    check('Draft history IDs cannot traverse outside the version directory', await store('draft-version', {
      componentName: 'App', versionId: '../../../../private',
    }) === null);
    check('Canvas history rejects a path-like page ID', await store('canvas-versions', {
      pageId: '../../../../private',
    }).then(() => false, () => true));
    const second = await store('read-file-snapshot', { rel: 'src/restore.ts' });
    write(restoreFile, 'agent edit\n');
    check('History restore requires an opening hash', await store('restore-file-version', { rel: 'src/restore.ts', versionId: versions[0].id }).then(() => false, () => true));
    check('Stale history restore is rejected', await store('restore-file-version', { rel: 'src/restore.ts', versionId: versions[0].id, expectedHash: second.hash }).then(() => false, () => true));
    check('Rejected history restore keeps agent edit', fs.readFileSync(restoreFile, 'utf8') === 'agent edit\n');
    const current = await store('read-file-snapshot', { rel: 'src/restore.ts' });
    await store('restore-file-version', { rel: 'src/restore.ts', versionId: versions[0].id, expectedHash: current.hash });
    check('History restore with current hash succeeds', fs.readFileSync(restoreFile, 'utf8') === 'first version\n');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ project, checks }, null, 2));
    console.log(JSON.stringify({ checks: checks.length, report: path.join(output, 'report.json') }));
    app.exit(0);
  } catch (error) {
    fs.mkdirSync(output, { recursive: true });
    if (editor && !editor.isDestroyed()) fs.writeFileSync(path.join(output, 'failure.png'), (await editor.capturePage()).toPNG());
    console.error(error.stack || error);
    app.exit(1);
  }
});
