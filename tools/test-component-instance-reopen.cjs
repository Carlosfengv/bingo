/* Run after test-component-instance-editing.cjs:
 * node tools/test-component-instance-reopen.cjs
 * Two real Electron processes exercise normal quit (including pending saves)
 * and restart against that test's isolated profile and project.
 */
const electron = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const output = path.join(repo, 'output/component-instance-editing');

if (typeof electron === 'string') {
  const previous = JSON.parse(fs.readFileSync(path.join(output, 'report.json'), 'utf8'));
  assert.equal(previous.passed, true, 'The component UI fixture must pass first');
  const directory = previous.directory;
  for (const phase of ['write', 'read']) {
    const result = require('node:child_process').spawnSync(electron, [__filename, phase, directory], { stdio: 'inherit', timeout: 120000 });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `Electron ${phase} phase exited successfully`);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, `restart-${phase}.json`), 'utf8')).passed, true);
  }
  const phases = ['write', 'read'].map(phase => JSON.parse(fs.readFileSync(path.join(directory, `restart-${phase}.json`), 'utf8')));
  assert.notEqual(phases[0].pid, phases[1].pid);
  fs.writeFileSync(path.join(output, 'restart-report.json'), JSON.stringify({ passed: true, directory, checks: phases.flatMap(phase => phase.checks), phases }, null, 2));
  console.log('PASS Separate desktop processes saved and reopened component instances');
} else {
  const { app, BrowserWindow, webContents } = electron;
  const [phase, inputDirectory] = process.argv.slice(2);
  assert.ok(['write', 'read'].includes(phase));
  const directory = fs.realpathSync(inputDirectory);
  assert.equal(path.dirname(directory), fs.realpathSync(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('bingo-component-editing-'));
  const project = path.join(directory, 'project');
  assert.equal(JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8')).name, 'component-editing-test');
  const manifest = JSON.parse(fs.readFileSync(path.join(project, '.bingo/design/manifest.json'), 'utf8'));
  const pageFile = path.join(project, '.bingo/design/pages', manifest.pages[0].id + '.json');
  const saved = () => JSON.parse(fs.readFileSync(pageFile, 'utf8')).canvas.elements.byId;
  const reportFile = path.join(directory, `restart-${phase}.json`);
  const report = { phase, pid: process.pid, checks: [], errors: [] };
  const persistReport = () => fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  const check = (label, value) => { assert.ok(value, label); report.checks.push(label); console.log('PASS', label); };
  const evaluate = (wc, script) => { wc.setBackgroundThrottling(false); return wc.executeJavaScript(script, true); };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const waitFor = async (fn, label) => {
    const start = Date.now();
    while (Date.now() - start < 45000) { if (await fn()) return; await sleep(80); }
    throw Error('Timed out: ' + label);
  };
  app.commandLine.appendSwitch('user-data-dir', path.join(directory, 'data'));
  app.on('web-contents-created', (_event, wc) => wc.on('console-message', (_e, level, message) => { if (level >= 3) report.errors.push(message); }));
  require(path.join(repo, 'out/main/index.js'));
  const timer = setTimeout(() => { report.failure = 'Normal application shutdown timed out'; persistReport(); app.exit(1); }, 90000);
  let readyToQuit = false;
  app.on('will-quit', () => {
    if (!readyToQuit) return;
    try {
      if (phase === 'write') {
        const elements = saved();
        const button = elements['button-a'];
        check('Normal quit flushes the last committed parameter before destroying the editor', button.props.label === report.label);
        check('Normal quit preserves numeric and false parameters, styles and their origin', button.props.count === 42 && button.props.disabled === false && button.styles.borderRadius === '37px' && button.componentEditing.styleRecords.borderRadius.origin === 'editor');
        report.components = Object.fromEntries(Object.entries(elements).filter(([, element]) => element.type === 'component'));
      }
      report.passed = true;
      clearTimeout(timer);
      persistReport();
    } catch (error) { report.failure = error.stack; persistReport(); app.exit(1); }
  });
  app.whenReady().then(async () => {
    try {
      let win;
      await waitFor(() => (win = BrowserWindow.getAllWindows().find(candidate => !candidate.isDestroyed())), 'window');
      win.setSize(1500, 980); win.show();
      await waitFor(() => evaluate(win.webContents, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
      await evaluate(win.webContents, `window.api.invoke('project-tabs:open',{projectId:${JSON.stringify(project)}})`);
      let editor;
      await waitFor(() => (editor = webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } })), 'project editor');
      await require('./editor-test-foreground.cjs').foregroundEditor(editor);
      await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-content] [data-element-id=button-a] button")').catch(() => false), 'component render');
      await evaluate(editor, `document.querySelector('[data-canvas-content] [data-element-id="button-a"]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}))`);
      await waitFor(() => evaluate(editor, '!!document.querySelector("[data-component-prop=count] input")'), 'parameters');
      const input = async (selector, value) => {
        await evaluate(editor, `(()=>{const input=document.querySelector(${JSON.stringify(selector)});input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
        await sleep(50);
        await evaluate(editor, `document.querySelector(${JSON.stringify(selector)}).blur()`);
      };
      if (phase === 'write') {
        await input('[data-component-prop=count] input', '42');
        await waitFor(() => evaluate(editor, 'document.querySelector("[data-element-id=button-a] button").dataset.count === "42"'), 'count commit');
        await input('input[aria-label="Border Radius"]', '37');
        await waitFor(() => evaluate(editor, 'getComputedStyle(document.querySelector("[data-element-id=button-a] button")).borderRadius === "37px"'), 'radius commit');
        report.label = 'Restart ' + Date.now();
        await input('[data-component-prop=label] input', report.label);
        await waitFor(() => evaluate(editor, `document.querySelector('[data-element-id=button-a] button').textContent === ${JSON.stringify(report.label)} && !document.querySelector('[data-component-preview-status]')`), 'label commit');
        check('The last visible parameter change is still pending when quit starts', saved()['button-a'].props.label !== report.label);
      } else {
        const previous = JSON.parse(fs.readFileSync(path.join(directory, 'restart-write.json'), 'utf8'));
        check('The reopened desktop is a different process', previous.pid !== process.pid);
        const components = Object.fromEntries(Object.entries(saved()).filter(([, element]) => element.type === 'component'));
        assert.deepEqual(components, previous.components);
        check('Restart preserves every component instance, including copied data and legacy sources', true);
        check('Restart renders the saved parameters and styles', await evaluate(editor, `(()=>{const button=document.querySelector('[data-element-id=button-a] button');return button.textContent===${JSON.stringify(previous.label)}&&button.dataset.count==='42'&&!button.disabled&&getComputedStyle(button).borderRadius==='37px'})()`));
        check('Restart retains legacy overrides and absence versus explicit empty style defaults', await evaluate(editor, `getComputedStyle(document.querySelector('[data-element-id=legacy-static] button')).borderRadius==='25px'&&getComputedStyle(document.querySelector('[data-element-id=default-style] button')).borderRadius==='23px'&&getComputedStyle(document.querySelector('[data-element-id=default-style-empty] button')).borderRadius!=='23px'`));
        check('Restart shows the persisted override in the inspector', await evaluate(editor, `document.querySelector('[data-style-override="borderRadius"]').textContent.includes('37px')`));
      }
      readyToQuit = true;
      app.quit();
    } catch (error) { report.failure = error.stack; persistReport(); console.error(error); app.exit(1); }
  });
}
