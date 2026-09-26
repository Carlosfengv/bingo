/* Browser lifecycle regression for the production CSS-only inheritance bridge.
 * No user projects, app profile or business components are loaded. */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const http = require('node:http'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-style-baseline-'));
app.commandLine.appendSwitch('user-data-dir', path.join(directory, 'data'));
const report = { directory, checks: [], requests: {} };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); console.log('PASS', name); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = http.createServer((request, response) => {
  report.requests[request.url] = (report.requests[request.url] || 0) + 1;
  response.setHeader('Content-Type', 'text/css');
  if (request.url === '/fail') { response.writeHead(404); response.end(); return; }
  const css = request.url === '/old' ? 'body {color:rgb(200,0,0)}'
    : request.url === '/semantic' ? ':root{color-scheme:light dark;--project-foreground:light-dark(#00030a,#f9f9f9);--project-surface:light-dark(#f6f8fb,#1b1b1b)}body{color:var(--project-foreground)}'
    : 'body {color:rgb(0,90,40);font-size:21px;line-height:1.3}';
  if (request.url === '/old' || request.url === '/pending') setTimeout(() => response.end(css), 500);
  else response.end(css);
});
const timeout = setTimeout(() => { console.error('Style baseline timeout'); app.exit(1); }, 60000);
app.whenReady().then(async () => {
  let win;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const bundle = await require('esbuild').build({ entryPoints: [path.join(repo, 'packages/editor/src/shared/utils/projectStyleBaseline.ts')], bundle: true, write: false, format: 'iife', globalName: 'baselineApi', platform: 'browser' });
    win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    const run = code => win.webContents.executeJavaScript(code, true);
    await win.loadURL('data:text/html,<!doctype html><style>@layer bingo-project-baseline;body{font:25px Arial;color:purple;--editor-only:red}</style><div data-canvas-content><span id="probe">Project</span></div>');
    await run(bundle.outputFiles[0].text);
    await run('baselineApi.refreshProjectStyleBaseline()');
    check('An empty project inherits native defaults without editor tokens', await run(`(()=>{const s=getComputedStyle(document.querySelector('#probe'));return s.fontSize==='16px'&&s.color==='rgb(0, 0, 0)'&&s.getPropertyValue('--editor-only')===''})()`));
    await run(`new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href='data:text/css,:root%7B--late-editor:red%7D';link.onload=()=>resolve();document.head.append(link)})`);
    check('Late editor stylesheet tokens are isolated even after the project baseline is ready',await run(`getComputedStyle(document.querySelector('#probe')).getPropertyValue('--late-editor')===''`));
    await run(`window.projectLink=document.createElement('link');projectLink.rel='stylesheet';projectLink.id='bingo-project-compiled-css';projectLink.href=${JSON.stringify(base + '/old')};document.head.append(projectLink);window.oldRefresh=baselineApi.refreshProjectStyleBaseline();void 0`);
    await sleep(50);
    check('The old stylesheet is still in flight when the new request starts',report.requests['/old']>0&&await run(`document.querySelector('#bingo-project-inherited-style').dataset.ready==='false'`));
    await run(`projectLink.href=${JSON.stringify(base + '/new')};baselineApi.refreshProjectStyleBaseline()`);
    await run('oldRefresh');
    await sleep(600);
    check('A superseded stylesheet cannot publish stale inherited styles', await run(`getComputedStyle(document.querySelector('#probe')).color==='rgb(0, 90, 40)'&&getComputedStyle(document.querySelector('#probe')).fontSize==='21px'`));
    check('A unitless project line height remains proportional in descendants', await run(`(()=>{const h=document.createElement('span');h.style.fontSize='42px';document.querySelector('[data-canvas-content]').append(h);return Math.abs(parseFloat(getComputedStyle(h).lineHeight)-54.6)<0.1})()`));
    check('A failed stylesheet is reported rather than marked ready', await run(`(async()=>{projectLink.href=${JSON.stringify(base + '/fail')};try{await baselineApi.refreshProjectStyleBaseline();return false}catch{return document.querySelector('#bingo-project-inherited-style').dataset.ready==='false'}})()`));
    await sleep(100);
    const failures = report.requests['/fail'];
    await sleep(250);
    check('Failure feedback does not create an automatic retry loop', report.requests['/fail'] === failures);
    await run(`baselineApi.refreshProjectStyleBaseline().catch(()=>{})`);
    check('An explicit retry reloads a failed stylesheet', report.requests['/fail'] > failures);
    await run(`projectLink.href=${JSON.stringify(base + '/new')};baselineApi.refreshProjectStyleBaseline()`);
    check('A corrected stylesheet clears the failure and restores readiness', await run(`document.querySelector('#bingo-project-inherited-style').dataset.ready==='true'&&!document.querySelector('#bingo-project-inherited-style').dataset.error`));
    await run(`document.documentElement.style.colorScheme='dark';document.querySelector('[data-canvas-content]').style.colorScheme='light';projectLink.href=${JSON.stringify(base + '/semantic')};baselineApi.refreshProjectStyleBaseline()`);
    check('A light canvas inherits light semantic text even when the editor and OS use dark colors', await run(`(()=>{const e=document.querySelector('#probe'),s=getComputedStyle(e);return s.color==='rgb(0, 3, 10)'&&s.colorScheme==='light'})()`));
    await run(`document.querySelector('[data-canvas-content]').style.colorScheme='dark';baselineApi.refreshProjectStyleBaseline()`);
    check('Changing the canvas color scheme refreshes inherited semantic text', await run(`getComputedStyle(document.querySelector('#probe')).color==='rgb(249, 249, 249)'`));
    await run(`projectLink.href=${JSON.stringify(base + '/pending')};window.pendingRefresh=baselineApi.refreshProjectStyleBaseline();baselineApi.cleanupProjectStyleBaseline();pendingRefresh`);
    check('Cleanup settles pending work and removes both measurement and baseline nodes', await run(`!document.querySelector('iframe[data-project-style-baseline]')&&!document.querySelector('#bingo-project-inherited-style')`));
    await sleep(600);
    check('Late stylesheet events cannot recreate a disposed baseline', await run(`!document.querySelector('#bingo-project-inherited-style')`));
    report.passed = true;
  } catch (error) { report.failure = error.stack; console.error(error); }
  finally {
    clearTimeout(timeout);
    win?.destroy();
    server.closeAllConnections();
    server.close();
    const output = path.join(repo, 'output/component-instance-editing/style-baseline-report.json');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    app.exit(report.passed ? 0 : 1);
  }
});
