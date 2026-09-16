/* Native recovery test. Run after pnpm build:
 * pnpm exec electron tools/test-project-tab-recovery.cjs
 * Uses one temporary project and isolated application data. No AI request is sent.
 */
const { app, BrowserWindow, webContents, dialog } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const qa = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-project-recovery-test-')));
const data = path.join(qa, 'data');
const projectId = path.join(qa, 'project');
fs.mkdirSync(path.join(projectId, 'src'), { recursive: true });
fs.mkdirSync(data, { recursive: true });
fs.writeFileSync(path.join(projectId, 'package.json'), JSON.stringify({
  name: 'recovery-test', version: '1.0.0', type: 'module',
  dependencies: { react: '19.2.8', 'react-dom': '19.2.8' }
}));
fs.writeFileSync(path.join(projectId, 'src', 'App.tsx'), "import React from 'react'; export default function App(){return <main>Recovery test</main>}");
fs.symlinkSync(path.join(root, 'node_modules'), path.join(projectId, 'node_modules'));
fs.writeFileSync(path.join(data, 'local-projects.json'), JSON.stringify([{
  id: projectId, rootPath: projectId, canonicalRoot: projectId, name: 'recovery-test', addedAt: Date.now()
}]));
fs.writeFileSync(path.join(data, 'project-tabs.json'), '[]');
fs.writeFileSync(path.join(data, 'preferences.json'), JSON.stringify({ schemaVersion: 1, localePreference: 'en' }));
app.commandLine.appendSwitch('user-data-dir', data);

const deadline = setTimeout(() => { console.error('Project recovery test timed out'); app.exit(1); }, 120_000);
deadline.unref();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(fn, label, timeout = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await fn();
    if (value) return value;
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}
const evaluate = (contents, source) => contents.executeJavaScript(source, true);
const invoke = (contents, channel, args) => evaluate(contents, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const projectContents = () => webContents.getAllWebContents().find(contents => {
  try { return new URL(contents.getURL()).searchParams.get('projectTab') === projectId; }
  catch { return false; }
});
let dialogCount = 0;
dialog.showMessageBox = async () => { dialogCount += 1; return { response: 0, checkboxChecked: false }; };

require(path.join(root, 'out/main/index.js'));
app.whenReady().then(async () => {
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(candidate => !candidate.isDestroyed()), 'window');
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, "!!document.querySelector('.project-titlebar')").catch(() => false), 'titlebar');
    shell.closeDevTools();
    const skills = await invoke(shell, 'get_system_skills');
    assert.ok(skills.some(skill => skill.name === 'bingo-design'));
    assert.ok(skills.some(skill => skill.name === 'bingo-import-from-project'));
    await invoke(shell, 'project-tabs:open', { projectId });
    await waitFor(async () => (await invoke(shell, 'project-tabs:get')).tabs[0]?.status === 'idle', 'project ready', 90_000);

    const first = projectContents();
    assert.ok(first);
    await evaluate(first, "window.api.send('project-tabs:status',{source:'test-task',status:'running'})");
    await sleep(100);
    first.forcefullyCrashRenderer();
    const failed = await waitFor(async () => {
      const state = await invoke(shell, 'project-tabs:get');
      return state.tabs[0]?.failure ? state.tabs[0] : null;
    }, 'failure state');
    assert.equal(failed.status, 'error');
    assert.equal(failed.failure.kind, 'renderer');
    assert.ok(failed.failure.reason);
    assert.ok(await evaluate(shell, "!!document.querySelector('.project-window-failure')"));

    await invoke(shell, 'project-tabs:reload', { projectId });
    const second = await waitFor(() => {
      const current = projectContents();
      return current && current.id !== first.id ? current : null;
    }, 'replacement renderer');
    await waitFor(async () => (await invoke(shell, 'project-tabs:get')).tabs[0]?.status === 'idle', 'replacement ready', 90_000);
    assert.equal((await invoke(shell, 'project-tabs:get')).tabs[0].failure, undefined);

    await evaluate(second, "window.api.send('project-tabs:status',{source:'test-task',status:'running'})");
    await sleep(100);
    second.forcefullyCrashRenderer();
    await waitFor(async () => (await invoke(shell, 'project-tabs:get')).tabs[0]?.failure, 'second failure');
    const dialogsBeforeClose = dialogCount;
    await invoke(shell, 'project-tabs:close', { projectId });
    const finalState = await invoke(shell, 'project-tabs:get');
    assert.equal(finalState.tabs.length, 0);
    assert.equal(dialogCount, dialogsBeforeClose);

    console.log('[Project recovery QA] crash details, safe reload, and stale-task cleanup passed');
    fs.rmSync(qa, { recursive: true, force: true });
    app.quit();
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
