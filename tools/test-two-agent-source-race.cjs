/* Two real Claude CLI chats race on one source snapshot in an isolated project. Run after pnpm build. */
const { app, BrowserWindow, webContents, dialog } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const repo = path.resolve(__dirname, '..');
const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-agent-race-')));
const project = path.join(base, 'project');
const data = path.join(base, 'data');
const output = path.join(repo, 'output/playwright/two-agent-source-race');
const source = path.join(project, 'src/App.tsx');
const put = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
put(path.join(project, 'package.json'), { name: 'bingo-agent-race', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8' } });
put(source, 'export default function App(){return <main>Initial</main>}\n');
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(project, 'node_modules'));
put(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'en' });
put(path.join(data, 'ai-provider.json'), { agent: 'claude' });
put(path.join(data, 'project-tabs.json'), []);
app.commandLine.appendSwitch('user-data-dir', data);
dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [project] });
dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: false });

const report = { project, checks: [], approvals: {}, results: {}, errors: [] };
const check = (name, condition) => { assert.ok(condition, name); report.checks.push(name); console.log('PASS', name); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(get, label, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { const value = await get(); if (value) return value; await sleep(100); }
  throw Error(`Timed out: ${label}`);
}
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
const deadline = setTimeout(() => { console.error('Agent race timeout', base); app.exit(1); }, 300000);
deadline.unref();
require(path.join(repo, 'out/main/index.js'));

app.whenReady().then(async () => {
  let editor;
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window');
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!window.api?.invoke').catch(() => false), 'preload');
    check('Project registers', (await invoke(shell, 'bingo:add-project'))?.id === project);
    await invoke(shell, 'project-tabs:open', { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await waitFor(() => evaluate(editor, '!!window.api?.invoke').catch(() => false), 'editor preload');
    const catalog = await invoke(editor, 'agent:list');
    check('Real Claude CLI is selected', catalog.selectedAgent === 'claude' && catalog.agents.some(a => a.agent === 'claude' && a.installed));

    const startChat = async label => {
      const sessionId = crypto.randomUUID(), chatTabId = crypto.randomUUID();
      const eventChannel = `chat-stream-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const prompt = `Use project_read to read src/App.tsx, then project_write to replace the exact text Initial with Agent ${label}. Pass the expected_hash from that read. Do not use project_edit, local tools or shell. Do not reread or retry if the write conflicts. Report the result briefly.`;
      const userMessage = { id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: Date.now() };
      await evaluate(editor, `(() => { window.__agentRace ??= {}; const state={events:[],done:false,error:null}; window.__agentRace[${JSON.stringify(label)}]=state; state.unsubscribe=window.api.on(${JSON.stringify(eventChannel)},event=>state.events.push(event)); void window.api.invoke('ai_chat',${JSON.stringify({ projectId: project, sessionId, eventChannel, messages: [userMessage], options: { chatTabId, userMessage, requestId: crypto.randomUUID(), chatTitle: `Agent race ${label}`, autoApprove: false } })}).then(()=>state.done=true).catch(error=>{state.error=error.message;state.done=true}); })()`);
      return { label, sessionId };
    };
    const agents = [await startChat('A'), await startChat('B')];
    const pending = await waitFor(async () => {
      const state = await evaluate(editor, `Object.fromEntries(['A','B'].map(label=>[label,{done:window.__agentRace[label].done,error:window.__agentRace[label].error,approvals:window.__agentRace[label].events.filter(e=>e.type==='tool_approval').map(e=>({approvalId:e.approvalId,toolName:e.toolName,args:e.args}))}]))`);
      for (const agent of agents) if (state[agent.label].done && !state[agent.label].approvals.some(a => a.toolName === 'project_write')) throw Error(`Agent ${agent.label} ended before requesting project_write: ${state[agent.label].error || 'no request'}`);
      return agents.every(agent => state[agent.label].approvals.some(a => a.toolName === 'project_write')) ? state : null;
    }, 'both agents awaiting project_write approval', 150000);
    for (const agent of agents) {
      const approval = pending[agent.label].approvals.find(a => a.toolName === 'project_write');
      report.approvals[agent.label] = {
        approvalId: approval.approvalId,
        toolName: approval.toolName,
        file_path: approval.args?.file_path,
        expected_hash: approval.args?.expected_hash,
      };
      check(`Agent ${agent.label} carries an opening hash`, typeof approval.args?.expected_hash === 'string' && approval.args.expected_hash.length === 64);
    }
    check('Both agents read the same snapshot', report.approvals.A.expected_hash === report.approvals.B.expected_hash);

    await invoke(editor, 'mcp_tool_approval', { approvalId: report.approvals.A.approvalId, approved: true });
    await waitFor(() => fs.readFileSync(source, 'utf8').includes('Agent A'), 'Agent A source write');
    await invoke(editor, 'mcp_tool_approval', { approvalId: report.approvals.B.approvalId, approved: true });
    await waitFor(async () => (await evaluate(editor, `window.__agentRace.A.done && window.__agentRace.B.done`)), 'both agent runs finish', 120000);
    const outcome = await evaluate(editor, `Object.fromEntries(['A','B'].map(label=>[label,{error:window.__agentRace[label].error,results:window.__agentRace[label].events.filter(e=>e.type==='mcp_tool_result'&&e.name==='project_write').map(e=>({success:e.success,error:e.error,reason:e.reason})),final:window.__agentRace[label].events.filter(e=>e.type==='done'||e.type==='error').map(e=>e.type)}]))`);
    report.results = outcome;
    check('First Agent write succeeds', outcome.A.results.some(r => r.success === true));
    check('Second Agent receives a source conflict', outcome.B.results.some(r => r.success === false && r.reason === 'SOURCE_CONFLICT'));
    check('Conflicting Agent cannot overwrite the first', fs.readFileSync(source, 'utf8').includes('Agent A') && !fs.readFileSync(source, 'utf8').includes('Agent B'));
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ checks: report.checks.length, report: path.join(output, 'report.json') }));
    app.exit(0);
  } catch (error) {
    report.error = String(error.stack || error);
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.error(report.error);
    app.exit(1);
  }
});
