/* Isolated Electron regression: an accepted canvas tool edit must reach disk. */
const { app, BrowserWindow, webContents, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-canvas-save-')));
const project = path.join(directory, 'project');
const data = path.join(directory, 'data');
const pageId = crypto.randomUUID();
const pageFile = path.join(project, '.bingo/design/pages', pageId + '.json');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
write(path.join(project, 'package.json'), { name: 'canvas-save-test', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
write(path.join(project, 'src/App.tsx'), 'export default function App(){return <div>Canvas save test</div>}');
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion: 1, documentId: crypto.randomUUID(), pages: [{ id: pageId }] });
write(pageFile, { schemaVersion: 1, id: pageId, name: 'Save test', canvas: { elements: [] }, newClasses: [] });
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'en' });
write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'Canvas save test', addedAt: Date.now() }]);
write(path.join(data, 'project-tabs.json'), []);
app.commandLine.appendSwitch('user-data-dir', data);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, code) => wc.executeJavaScript(code, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
async function waitFor(fn, label, ms = 30000) { const started = Date.now(); while (Date.now() - started < ms) { const value = await fn(); if (value) return value; await sleep(100); } throw Error('Timed out: ' + label); }
const report = { directory, pageId, events: [] };
ipcMain.on('canvas_operation_persistence', (_event, payload) => report.events.push(payload));
require(path.join(repo, 'out/main/index.js'));
const timeout = setTimeout(() => { console.error('Canvas save test timed out:', directory); app.exit(1); }, 120000);
timeout.unref();
app.whenReady().then(async () => {
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window');
    win.setSize(1500, 950); win.show(); win.webContents.closeDevTools();
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await invoke(shell, 'project-tabs:open', { projectId: project });
    const editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    editor.setBackgroundThrottling(false);
    await waitFor(() => evaluate(editor, 'document.querySelector("[data-project-canvas-ready]")?.getAttribute("data-project-canvas-ready") === "true"').catch(() => false), 'canvas ready');
    const requestId = crypto.randomUUID(), operationId = crypto.randomUUID();
    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Canvas tool result timed out')), 15000);
      const handler = (event, payload) => {
        if (event.sender.id !== editor.id || payload.requestId !== requestId) return;
        ipcMain.off('canvas_tool_result', handler); clearTimeout(timer); resolve(payload.result);
      };
      ipcMain.on('canvas_tool_result', handler);
    });
    editor.send('canvas_tool_request', { requestId, operationId, protocolVersion: 1, projectId: project,
      operation: 'add_to_canvas', args: { claim_new: true, jsx: '<section style={{ width: 320, height: 200 }}>Saved state probe</section>' } });
    report.result = await result;
    assert.equal(report.result?.structuredContent?.operation?.applied, true, JSON.stringify(report.result));
    await waitFor(() => {
      const page = JSON.parse(fs.readFileSync(pageFile, 'utf8'));
      return page.canvas.elements?.byId && Object.keys(page.canvas.elements.byId).length > 0;
    }, 'canvas auto-save', 10000);
    report.savedPage = JSON.parse(fs.readFileSync(pageFile, 'utf8'));
    assert.ok(Object.values(report.savedPage.canvas.elements.byId).some(node => node.text === 'Saved state probe'));
    console.log(JSON.stringify({ passed: true, directory, nodes: Object.keys(report.savedPage.canvas.elements.byId).length, events: report.events }, null, 2));
    app.quit();
  } catch (error) {
    report.error = String(error.stack || error);
    console.error(JSON.stringify(report, null, 2));
    app.exit(1);
  }
});
