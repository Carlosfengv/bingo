/* Fault-inject project registration in an isolated Electron profile. */
const { app, BrowserWindow, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-register-fault-')));
const data = path.join(base, 'data');
const roots = ['registry-fault', 'metadata-fault', 'recovery-fault', 'ignore-fault'].map(name => path.join(base, name));
for (const root of roots) {
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: path.basename(root), type: 'module' }));
  fs.writeFileSync(path.join(root, '.gitignore'), Buffer.from('node_modules/\r\n'));
  execFileSync('git', ['init', '-q'], { cwd: root });
}
// A prior process stopped after writing a design file and before committing the registry.
const interruptedRoot = roots[2];
const interruptedDesign = path.join(interruptedRoot, '.bingo', 'design');
const interruptedManifest = Buffer.from('{"schemaVersion":1}\n');
const ignoreBefore = Buffer.from('node_modules/\r\n');
const ignoreAfter = 'node_modules/\r\n/.bingo/design/\r\n';
fs.mkdirSync(interruptedDesign, { recursive: true });
fs.writeFileSync(path.join(interruptedRoot, '.gitignore'), ignoreAfter);
fs.writeFileSync(path.join(interruptedDesign, 'manifest.json'), interruptedManifest);
fs.writeFileSync(path.join(interruptedDesign, '.write.lock'), JSON.stringify({ token: crypto.randomUUID(), pid: 2147483647, hostname: os.hostname() }));
const interruptedJournal = path.join(data, 'project-registration', `${crypto.createHash('sha256').update(interruptedRoot).digest('hex')}.json`);
fs.mkdirSync(path.dirname(interruptedJournal), { recursive: true });
fs.writeFileSync(interruptedJournal, JSON.stringify({
  root: interruptedRoot, ownerPid: 2147483647, hostname: os.hostname(), priorRegistered: false, designInitiallyAbsent: true,
  ignore: { previousBytes: ignoreBefore.toString('base64'), writtenContent: ignoreAfter },
  createdFiles: { 'manifest.json': crypto.createHash('sha256').update(interruptedManifest).digest('hex') },
}));
app.commandLine.appendSwitch('user-data-dir', data);
let chosen = roots[0];
dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [chosen] });
dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: true });
const originalRename = fs.renameSync;
let failTarget = null;
fs.renameSync = function(from, to) {
  if (failTarget && (failTarget === 'registry' && to === path.join(data, 'local-projects.json') || failTarget === 'metadata' && to.endsWith('manifest.json') || failTarget === 'ignore' && to === path.join(roots[3], '.gitignore'))) throw Error(`Injected ${failTarget} failure`);
  return originalRename.apply(this, arguments);
};
const checks = [];
const check = (name, value) => { assert.ok(value, name); checks.push(name); console.log('PASS', name); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(get, label) { const start = Date.now(); while (Date.now() - start < 30000) { const value = await get(); if (value) return value; await sleep(100); } throw Error(`Timed out: ${label}`); }
const invoke = (wc, channel, args) => wc.executeJavaScript(`window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`, true);
setTimeout(() => app.exit(1), 120000).unref();
require(path.join(repo, 'out/main/index.js'));
app.whenReady().then(async () => {
  try {
    const shell = (await waitFor(() => BrowserWindow.getAllWindows()[0], 'window')).webContents;
    await waitFor(() => shell.executeJavaScript('!!window.api?.invoke').catch(() => false), 'preload');
    check('Startup clears the interrupted registration journal', !fs.existsSync(interruptedJournal));
    check('Startup restores Git ignore bytes after a stopped process', fs.readFileSync(path.join(interruptedRoot, '.gitignore')).equals(ignoreBefore));
    check('Startup removes owned files and a dead design lock', !fs.existsSync(interruptedDesign));
    chosen = interruptedRoot;
    check('Retry after a stopped process succeeds', (await invoke(shell, 'bingo:add-project'))?.id === interruptedRoot);
    chosen = roots[0];
    failTarget = 'registry';
    check('Registry failure rejects addition', await invoke(shell, 'bingo:add-project').then(() => false, () => true));
    failTarget = null;
    check('Failed registry commit has no visible project', !(await invoke(shell, 'bingo:list-projects')).some(row => row.id === roots[0]));
    check('Registry failure restores the original Git ignore bytes', fs.readFileSync(path.join(roots[0], '.gitignore')).equals(Buffer.from('node_modules/\r\n')));
    check('Registry failure removes untouched new design data', !fs.existsSync(path.join(roots[0], '.bingo/design')));
    check('Retry after registry failure succeeds', (await invoke(shell, 'bingo:add-project'))?.id === roots[0]);

    chosen = roots[1];
    failTarget = 'metadata';
    check('Metadata failure rejects addition', await invoke(shell, 'bingo:add-project').then(() => false, () => true));
    failTarget = null;
    check('Metadata failure has no visible project', !(await invoke(shell, 'bingo:list-projects')).some(row => row.id === roots[1]));
    check('Metadata failure restores the original Git ignore bytes', fs.readFileSync(path.join(roots[1], '.gitignore')).equals(Buffer.from('node_modules/\r\n')));
    check('Metadata failure removes newly created design files', !fs.existsSync(path.join(roots[1], '.bingo/design')));
    check('Retry after metadata failure succeeds', (await invoke(shell, 'bingo:add-project'))?.id === roots[1]);
    chosen = roots[3];
    failTarget = 'ignore';
    check('Git ignore failure rejects addition', await invoke(shell, 'bingo:add-project').then(() => false, () => true));
    failTarget = null;
    check('Git ignore failure has no visible project', !(await invoke(shell, 'bingo:list-projects')).some(row => row.id === roots[3]));
    check('Git ignore failure preserves original bytes', fs.readFileSync(path.join(roots[3], '.gitignore')).equals(ignoreBefore));
    check('Git ignore failure creates no design files', !fs.existsSync(path.join(roots[3], '.bingo/design')));
    check('Retry after Git ignore failure succeeds', (await invoke(shell, 'bingo:add-project'))?.id === roots[3]);
    const report = path.join(repo, 'output/playwright/project-registration-faults/report.json');
    fs.mkdirSync(path.dirname(report), { recursive: true });
    fs.writeFileSync(report, JSON.stringify({ checks, roots }, null, 2));
    console.log(JSON.stringify({ checks: checks.length, report }));
    app.exit(0);
  } catch (error) { console.error(error.stack || error); app.exit(1); }
});
