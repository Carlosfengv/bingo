/* Real Electron mainline smoke test. Run after pnpm build. All writes use a temporary project. */
const { app, BrowserWindow, webContents, dialog } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');

const repo = path.resolve(__dirname, '..');
const requestedAgent = process.env.BINGO_MAINLINE_AGENT || 'claude';
if (!['claude', 'codex', 'opencode', 'grok'].includes(requestedAgent)) throw Error(`Unsupported agent: ${requestedAgent}`);
const requestedModel = process.env.BINGO_MAINLINE_MODEL || null;
const askFirst = process.env.BINGO_MAINLINE_ASK === '1';
const askOutcome = process.env.BINGO_MAINLINE_ASK_OUTCOME || 'allow';
if (!['allow', 'reject', 'cancel'].includes(askOutcome)) throw Error(`Unsupported ask outcome: ${askOutcome}`);
const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-mainline-')));
const project = path.join(base, 'files', 'pages % # 中文');
const data = path.join(base, 'data');
let reportName = 'project-mainline';
if (requestedAgent !== 'claude') reportName += `-${requestedAgent}`;
if (askFirst) reportName += askOutcome === 'allow' ? '-ask' : `-ask-${askOutcome}`;
const output = path.join(repo, 'output/playwright', reportName);
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
write(path.join(project, 'package.json'), { name: 'bingo-mainline', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
write(path.join(project, 'src/App.tsx'), 'export default function App(){return <main>Initial</main>}\n');
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
execFileSync('git', ['init', '-q', project]);
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'en' });
write(path.join(data, 'ai-provider.json'), { agent: requestedAgent });
write(path.join(data, 'project-tabs.json'), []);
app.commandLine.appendSwitch('user-data-dir', data);
dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [project] });
dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: false });
const report = { project, checks: [], agent: null, model: requestedModel, approvalOutcome: askFirst ? askOutcome : 'auto', errors: [] };
const check = (name, condition) => { assert.ok(condition, name); report.checks.push(name); console.log('PASS', name); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(get, label, timeout = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { const result = await get(); if (result) return result; await sleep(100); }
  throw Error(`Timed out: ${label}`);
}
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const deadline = setTimeout(() => { console.error('Mainline smoke timeout', base); app.exit(1); }, 300000);
deadline.unref();
require(path.join(repo, 'out/main/index.js'));
app.whenReady().then(async () => {
  let editor;
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window');
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!window.api?.invoke').catch(() => false), 'preload');
    const added = await invoke(shell, 'bingo:add-project');
    check('Special-character project registers under its canonical path', added?.id === project);
    await invoke(shell, 'project-tabs:open', { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await waitFor(() => evaluate(editor, '!!window.api?.invoke').catch(() => false), 'editor preload');
    const store = (op, args = {}) => invoke(editor, 'bingo:store', { op, root: project, ...args });
    const first = await store('read-file-snapshot', { rel: 'src/App.tsx' });
    check('Source opens with a raw-byte hash', first?.hash?.length === 64 && first.content.includes('Initial'));
    const userText = first.content.replace('Initial', 'User edit');
    await store('write-file', { rel: 'src/App.tsx', content: userText, expectedHash: first.hash });
    check('User source edit persists', fs.readFileSync(path.join(project, 'src/App.tsx'), 'utf8') === userText);
    const pages = await store('list-canvases');
    const page = pages[0];
    check('First page opens', !!page?.id);
    const elements = { schemaVersion: 2, byId: { title: { id: 'title', type: 'text', text: 'Saved on canvas' } }, childrenByParent: { ROOT: ['title'] } };
    await store('save-canvas', { params: { id: page.id, name: 'Mainline page', elements, _expectedRevision: page._revision } });
    check('Canvas edit creates recoverable history', (await store('canvas-versions', { pageId: page.id })).length > 0);

    const catalog = await invoke(editor, 'agent:list');
    report.agent = catalog.selectedAgent;
    if (catalog.selectedAgent !== requestedAgent || !catalog.agents.some(agent => agent.agent === requestedAgent && agent.installed)) throw Error(`${requestedAgent} CLI is not installed in the isolated run`);
    const sessionId = crypto.randomUUID(), chatTabId = crypto.randomUUID(), eventChannel = `chat-stream-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const prompt = 'In the current Bingo project, use project_read on src/App.tsx, then use project_edit to replace the unique text "User edit" with "Agent edit". Do not change any other file or the canvas. If permission is denied, stop without retrying. Report the result briefly.';
    const userMessage = { id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: Date.now() };
    await evaluate(editor, `(() => { window.__mainlineEvents=[]; window.__mainlineDone=false; window.__mainlineError=null; window.__mainlineUnsubscribe=window.api.on(${JSON.stringify(eventChannel)}, event=>window.__mainlineEvents.push(event)); void window.api.invoke('ai_chat', ${JSON.stringify({ projectId: project, sessionId, eventChannel, messages: [userMessage], options: { chatTabId, userMessage, requestId: crypto.randomUUID(), chatTitle: 'Mainline smoke', autoApprove: !askFirst, ...(requestedModel ? { model: requestedModel } : {}) } })}).then(()=>window.__mainlineDone=true).catch(error=>{window.__mainlineError=error.message;window.__mainlineDone=true}); })()`);
    let offset = 0;
    const agentDeadline = Date.now() + 180000;
    while (Date.now() < agentDeadline) {
      const state = await evaluate(editor, `({events:window.__mainlineEvents.slice(${offset}),done:window.__mainlineDone,error:window.__mainlineError})`);
      offset += state.events.length;
      for (const event of state.events) {
        if (event.type === 'tool_approval') {
          report.approvals = (report.approvals || 0) + 1;
          if (askOutcome === 'cancel') {
            if (!report.cancelledOnApproval) { report.cancelledOnApproval = true; await invoke(editor, 'ai_chat_cancel', { sessionId }); }
          } else await invoke(editor, 'mcp_tool_approval', { approvalId: event.approvalId, approved: askOutcome === 'allow' });
        }
        if (event.type === 'done' || event.type === 'cancelled') report.finalEvent = event.type;
        if (event.type === 'error') report.errors.push(event.message);
      }
      if (state.done) { if (state.error) throw Error(state.error); break; }
      await sleep(500);
    }
    if (!await evaluate(editor, 'window.__mainlineDone')) { await invoke(editor, 'ai_chat_cancel', { sessionId }); throw Error('Agent timed out'); }
    await evaluate(editor, 'window.__mainlineUnsubscribe?.()');
    check(`Real ${requestedAgent} run finished without error`, report.errors.length === 0);
    if (askFirst) check('Ask first presented a live approval request', report.approvals > 0);
    if (askFirst && askOutcome === 'cancel') check('Stopped approval ends the run as cancelled', report.finalEvent === 'cancelled');
    if (askFirst && askOutcome === 'reject') check('Rejected approval returns a normal Agent reply', report.finalEvent === 'done');
    const expectAgentEdit = !askFirst || askOutcome === 'allow';
    if (expectAgentEdit) check('Agent source edit persisted', fs.readFileSync(path.join(project, 'src/App.tsx'), 'utf8').includes('Agent edit'));
    else check('Denied or cancelled approval keeps the user source edit', fs.readFileSync(path.join(project, 'src/App.tsx'), 'utf8') === userText);

    await store('create-chat', { input: { id: 'mainline-chat', messages: [userMessage, { id: crypto.randomUUID(), role: 'assistant', content: expectAgentEdit ? 'Agent edit complete' : 'Agent edit declined', timestamp: Date.now() }] } });
    await invoke(shell, 'project-tabs:close', { projectId: project });
    await invoke(shell, 'project-tabs:open', { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'reopened editor');
    const restored = await invoke(editor, 'bingo:store', { op: 'load-canvas', root: project, pageId: page.id });
    check('Reopened page restores user canvas edit', restored?.elements?.byId?.title?.text === 'Saved on canvas');
    check('Reopened project restores chat data', fs.existsSync(path.join(project, '.bingo/design/chats/mainline-chat.json')));
    check('Source and version history survive reopen', fs.readFileSync(path.join(project, 'src/App.tsx'), 'utf8').includes(expectAgentEdit ? 'Agent edit' : 'User edit') && (await invoke(editor, 'bingo:store', { op: 'file-versions', root: project, rel: 'src/App.tsx' })).length >= (expectAgentEdit ? 2 : 1));
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ checks: report.checks.length, report: path.join(output, 'report.json') }));
    app.exit(0);
  } catch (error) {
    report.error = String(error.stack || error);
    fs.mkdirSync(output, { recursive: true });
    if (editor && !editor.isDestroyed()) fs.writeFileSync(path.join(output, 'failure.png'), (await editor.capturePage()).toPNG());
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.error(report.error);
    app.exit(1);
  }
});
