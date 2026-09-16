/* pnpm exec electron tools/test-chat-recovery.cjs [project-data-directory] [compiled-css]
 * Real React components, local backend and paged store; isolated data only.
 * Optional existing history is copied before reading; no assistant is invoked.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const qa = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'bingo-chat-recovery-'));
app.setPath('userData', path.join(qa, 'profile'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = { directory: qa, checks: [] };
const check = (name, result) => { assert.ok(result, name); report.checks.push(name); };
const deadline = setTimeout(() => app.exit(1), 120000); deadline.unref();
app.whenReady().then(async () => {
  try {
    await esbuild.build({ entryPoints: [path.join(root, 'src/main/chatStore.ts')], outfile: path.join(qa, 'store.cjs'), bundle: true, platform: 'node', format: 'cjs' });
    const { ChatStore } = require(path.join(qa, 'store.cjs'));
    const store = new ChatStore(path.join(qa, 'store'));
    const longText = '长记录开头\n' + '中文内容😀'.repeat(9000) + '\n长记录结尾';
    await store.createChat({ id: 'fixture', messages: [{ id: 'message', role: 'assistant', content: '回复正文仍然可见', activity: [{ type: 'thinking', text: longText }] }] });
    const before = fs.readFileSync(store.chatFile('fixture'), 'utf8');
    let failNext = false, delayNext = false, bodyCalls = 0, messageCalls = 0;
    ipcMain.handle('bingo:store', async (_event, args) => {
      const selected = args.root === 'copied' ? copiedStore : store;
      if (args.op === 'get-chat-message-body') {
        bodyCalls++;
        if (failNext) { failNext = false; throw new Error('Temporary read failure'); }
        if (delayNext) { delayNext = false; await pause(250); }
        return selected.readMessageBody(args.chatId, args.messageId, args.opts);
      }
      if (args.op === 'get-chat-message') { messageCalls++; return selected.readMessage(args.chatId, args.messageId); }
      throw new Error('Unexpected operation: ' + args.op);
    });
    fs.writeFileSync(path.join(qa, 'preload.cjs'), `const{contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('api',{invoke:(channel,args)=>ipcRenderer.invoke(channel,args)});`);
    const source = `import React from 'react';import{createRoot}from'react-dom/client';import{initializeI18n}from'@bingo/i18n';import{emptyStore}from'@bingo/compiler';import{BackendProvider}from'${root}/packages/editor/src/backends/BackendContext.tsx';import{ChatTranscript}from'${root}/packages/editor/src/shell/components/ChatPanel.tsx';import{createLocalBackend}from'${root}/packages/workspace/src/backends/LocalBackend.ts';import{loadProjectStylesheet}from'${root}/packages/workspace/src/services/projectStylesheet.ts';window.loadProjectStylesheet=loadProjectStylesheet;let mount;window.renderChat=async(messages,chatId='fixture',project='fixture')=>{await initializeI18n('zh-CN');mount??=createRoot(document.getElementById('app'));mount.render(<BackendProvider backend={createLocalBackend(project)}><ChatTranscript messages={messages} store={emptyStore()} variant="sidebar-v2" activeChatId={chatId}/></BackendProvider>);};`;
    await esbuild.build({ stdin: { contents: source, resolveDir: root, loader: 'tsx' }, outfile: path.join(qa, 'ui.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', logLevel: 'error', loader: { '.ts': 'tsx', '.svg': 'dataurl', '.png': 'dataurl', '.woff2': 'dataurl' }, define: { 'process.env.NODE_ENV': '"production"', 'process.env.BABEL_8_BREAKING': 'false', 'process.env.BABEL_TYPES_8_BREAKING': 'false' }, alias: Object.fromEntries(['ui', 'editor', 'i18n', 'compiler', 'workspace'].map(name => ['@bingo/' + name, root + '/packages/' + name + '/src/index.browser.ts'])), plugins: [{ name: 'test-exports', setup(build) { build.onLoad({ filter: /\/ChatPanel\.tsx$/ }, args => ({ contents: fs.readFileSync(args.path, 'utf8') + '\nexport {ChatTranscript};', loader: 'tsx' })); } }] });
    fs.writeFileSync(path.join(qa, 'index.html'), `<!doctype html><html class="editor-dark"><head><link rel="stylesheet" href="file://${root}/src/renderer/src/index.css"></head><body><div id="app" style="width:310px;padding:12px"></div><div data-canvas-content id="canvas-probe">Canvas</div><script src="ui.js"></script></body></html>`);
    const win = new BrowserWindow({ show: false, width: 500, height: 900, webPreferences: { preload: path.join(qa, 'preload.cjs'), contextIsolation: true } });
    await win.loadFile(path.join(qa, 'index.html'));
    const js = source => win.webContents.executeJavaScript(source, true);
    const render = async (messages, id = 'fixture', project = 'fixture') => { await js(`renderChat(${JSON.stringify(messages)},${JSON.stringify(id)},${JSON.stringify(project)})`); await pause(80); };
    const has = text => js(`document.body.innerText.includes(${JSON.stringify(text)})`);
    const click = async text => { check('Button available: ' + text, await js(`(()=>{const b=[...document.querySelectorAll('#app button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)return false;b.click();return true;})()`)); await pause(100); };
    const message = await store.readMessage('fixture', 'message');
    await render([message]);
    check('Deferred activity keeps the reply visible', await has('回复正文仍然可见'));
    check('No render recovery card for valid deferred text', !await has('这部分聊天内容暂时无法显示'));
    await js(`document.querySelector('#app button').click()`); await pause(80);
    check('Long record is expandable', await has('展开内容'));
    failNext = true;
    await click('展开内容');
    check('Read failure is local and retryable', await has('内容暂时加载失败') || await has('查看排查详情'));
    await click('重新加载内容');
    check('Retry reads the saved text', await has('长记录开头'));
    while (await has('继续加载')) await click('继续加载');
    check('Every UTF-8 page remains available', await has('长记录结尾'));
    check('Deferred content required multiple bounded reads', bodyCalls > 2);
    const malformed = { ...message, activity: [null, { type: 'text', text: 'Partial activity' }] };
    await render([malformed]);
    check('Activity failure preserves the reply body', await has('回复正文仍然可见'));
    await click('重新加载内容');
    check('Recovery reloads the stored message', messageCalls === 1 && !await has('这部分聊天内容暂时无法显示'));
    await js(`document.querySelector('#app button').click()`); await pause(80);
    delayNext = true;
    await click('展开内容');
    await render([{ id: 'new', role: 'assistant', content: '另一个聊天' }], 'other');
    await pause(300);
    check('Late read cannot replace another chat', await has('另一个聊天') && !await has('长记录开头'));
    await render([malformed]);
    const css = 'data:text/css;base64,' + Buffer.from('@layer base {body {color: black}} :root {--foreground: rgb(1, 2, 3)}').toString('base64');
    await js(`loadProjectStylesheet('fixture',${JSON.stringify(css)})`);
    const color = await js(`({notice:getComputedStyle(document.querySelector('[role="status"]')).color,body:getComputedStyle(document.body).color,canvas:getComputedStyle(document.getElementById('canvas-probe')).color})`);
    check('Dark recovery text is readable with project CSS', color.notice === 'rgb(222, 222, 222)' && color.body === color.notice);
    fs.writeFileSync(path.join(qa, 'dark-recovery.png'), (await win.capturePage()).toPNG());
    check('Canvas keeps the project text color', color.canvas === 'rgb(1, 2, 3)');
    await js(`document.documentElement.classList.remove('editor-dark')`);
    check('Light recovery text follows the editor theme', await js(`getComputedStyle(document.querySelector('[role="status"]')).color===getComputedStyle(document.body).color`));
    check('Saved history is unchanged', fs.readFileSync(store.chatFile('fixture'), 'utf8') === before);
    let copiedStore;
    if (process.argv[2]) {
      await js(`document.documentElement.classList.add('editor-dark')`);
      if (process.argv[3]) {
        const projectCss = 'data:text/css;base64,' + fs.readFileSync(process.argv[3]).toString('base64');
        await js(`loadProjectStylesheet('copied',${JSON.stringify(projectCss)})`);
        check('Real project CSS preserves the editor foreground', await js(`getComputedStyle(document.body).color==='rgb(222, 222, 222)'`));
      }
      const target = path.join(qa, 'copied'); fs.mkdirSync(target);
      for (const folder of ['chats', 'chat-data']) fs.cpSync(path.join(process.argv[2], folder), path.join(target, folder), { recursive: true });
      copiedStore = new ChatStore(target);
      const chats = await copiedStore.listChats({ includeArchived: true });
      for (const chat of chats) {
        const page = await copiedStore.readChat(chat.id);
        await render(page.messages, chat.id, 'copied');
        check('Copied history renders: ' + chat.id, !await has('这部分聊天内容暂时无法显示'));
        // Expand collapsed saved activity groups before checking deferred bodies.
        await js(`for(const button of [...document.querySelectorAll('#app button')])if(/^(已工作|已完成)/.test(button.textContent.trim()))button.click()`); await pause(100);
        if (await has('展开内容')) { await click('展开内容'); check('Copied history body loads', !await has('CHAT_BODY_LOAD_FAILED')); }
        fs.writeFileSync(path.join(qa, 'copied-history.png'), (await win.capturePage()).toPNG());
      }
    }
    fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2)); app.exit(0);
  } catch (error) { fs.writeFileSync(path.join(qa, 'report.json'), JSON.stringify({ ...report, error: String(error.stack) }, null, 2)); console.error(error, qa); app.exit(1); }
});
