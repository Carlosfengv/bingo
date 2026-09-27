/* Browser regression for project CSS replacement, failure and out-of-order loads. */
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const esbuild = require('esbuild');

const repo = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-css-race-'));
app.commandLine.appendSwitch('user-data-dir', path.join(profile, 'profile'));
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><div id="probe" class="text-fg-default">Text</div>'); return; }
  response.setHeader('Content-Type', 'text/css');
  if (pathname === '/fail') { response.writeHead(404); response.end(); return; }
  const color = pathname === '/slow' ? '#ff0000' : pathname === '/new' ? '#f9f9f9' : '#00030a';
  const css = `:root{--fg-default:light-dark(#00030a,#f9f9f9)}.text-fg-default{color:${color}}`;
  if (pathname === '/slow') setTimeout(() => response.end(css), 350);
  else response.end(css);
});
const timeout = setTimeout(() => { console.error('Stylesheet race timeout'); app.exit(1); }, 30000);
app.whenReady().then(async () => {
  let win;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const bundle = await esbuild.build({
      entryPoints: [path.join(repo, 'packages/workspace/src/services/projectStylesheet.ts')],
      bundle: true, write: false, format: 'iife', globalName: 'stylesheetApi', platform: 'browser',
      plugins: [{ name: 'baseline-stub', setup(build) {
        build.onResolve({ filter: /^@bingo\/editor$/ }, () => ({ path: 'baseline', namespace: 'stub' }));
        build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: 'export async function refreshProjectStyleBaseline() {} export function cleanupProjectStyleBaseline() {}',
          loader: 'js',
        }));
      } }],
    });
    win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    const run = script => win.webContents.executeJavaScript(script, true);
    const waitColor = color => run(`new Promise((resolve, reject) => {
      const started = performance.now();
      const tick = () => {
        const actual = getComputedStyle(document.querySelector('#probe')).color;
        if (actual === ${JSON.stringify(color)}) resolve(actual);
        else if (performance.now() - started > 2000) reject(Error('Expected ${color}, got ' + actual));
        else requestAnimationFrame(tick);
      };
      tick();
    })`);
    await win.loadURL(`${base}/`);
    await run(bundle.outputFiles[0].text);
    await run(`stylesheetApi.loadProjectStylesheet('project', '${base}/initial')`);
    await waitColor('rgb(0, 3, 10)');

    await run(`void (window.slowLoad = stylesheetApi.loadProjectStylesheet('project', '${base}/slow'))`);
    await run(`stylesheetApi.loadProjectStylesheet('project', '${base}/new')`);
    await run('slowLoad');
    await waitColor('rgb(249, 249, 249)');
    assert.equal(await run(`document.querySelector('#bingo-project-compiled-css').href`), `${base}/new`);

    const failed = await run(`stylesheetApi.loadProjectStylesheet('project', '${base}/fail').then(() => false, () => true)`);
    assert.equal(failed, true);
    assert.equal(await run(`getComputedStyle(document.querySelector('#probe')).color`), 'rgb(249, 249, 249)');
    assert.equal(await run(`document.querySelector('#bingo-project-compiled-css').href`), `${base}/new`);
    assert.equal(await run(`document.querySelectorAll('#bingo-project-compiled-css').length`), 1);

    await run(`stylesheetApi.loadProjectStylesheet('project', '${base}/initial')`);
    await waitColor('rgb(0, 3, 10)');
    await run(`stylesheetApi.cleanupProjectStylesheet('project')`);
    assert.equal(await run(`document.querySelector('#bingo-project-compiled-css')`), null);
    console.log('PASS project stylesheet latest request, failure rollback and cleanup');
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error);
    app.exit(1);
  } finally {
    clearTimeout(timeout);
    win?.destroy();
    server.closeAllConnections();
    server.close();
  }
});
