/* Actual editor interaction checks, restricted to the isolated component fixture. */
const { app, BrowserWindow, webContents } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..'), output = path.join(repo, 'output/component-instance-editing');
const prior = JSON.parse(fs.readFileSync(path.join(output, 'report.json')));
assert.equal(prior.passed, true);
const directory = fs.realpathSync(prior.directory), project = path.join(directory, 'project');
assert.equal(path.dirname(directory), fs.realpathSync(os.tmpdir()));
assert.ok(path.basename(directory).startsWith('bingo-component-editing-'));
assert.equal(JSON.parse(fs.readFileSync(path.join(project, 'package.json'))).name, 'component-editing-test');
const manifest = JSON.parse(fs.readFileSync(path.join(project, '.bingo/design/manifest.json')));
const pageFile = path.join(project, '.bingo/design/pages', `${manifest.pages[0].id}.json`);
const read = () => JSON.parse(fs.readFileSync(pageFile)).canvas.elements.byId;
const original = read();
const report = { directory, originalInstances: Object.fromEntries(['button-a','button-b'].map(id => [id,original[id]])), checks: [], errors: [] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, code) => { wc.setBackgroundThrottling(false); return wc.executeJavaScript(code, true); };
async function waitFor(fn, label) { const start = Date.now(); while (Date.now() - start < 30000) { if (await fn()) return; await sleep(30); } throw Error('Timed out: ' + label); }
const check = (label, value) => { assert.ok(value, label); report.checks.push(label); console.log('PASS', label); };
app.commandLine.appendSwitch('user-data-dir', path.join(directory, 'data'));
require(path.join(repo, 'out/main/index.js'));
app.whenReady().then(async () => {
  let editor;
  try {
    let win;
    await waitFor(() => win = BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'shell window');
    await waitFor(() => evaluate(win.webContents, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await evaluate(win.webContents, `window.api.invoke('project-tabs:open',{projectId:${JSON.stringify(project)}})`);
    await waitFor(() => editor = webContents.getAllWebContents().find(w => { try { return new URL(w.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'project editor');
    await require('./editor-test-foreground.cjs').foregroundEditor(editor);
    await waitFor(() => evaluate(editor, '!!document.querySelector("[data-canvas-viewport] [data-element-id=button-a] button")').catch(() => false), 'canvas');
    const frame = () => evaluate(editor, 'new Promise(resolve=>requestAnimationFrame(()=>resolve(true)))');
    const select = async id => { await evaluate(editor, `document.querySelector('[data-canvas-viewport] [data-element-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:100}));true`); await frame(); };
    const key = (keyCode, modifiers = []) => { editor.sendInputEvent({type:'keyDown',keyCode,modifiers}); editor.sendInputEvent({type:'keyUp',keyCode,modifiers}); };
    const flush = async () => {
      await evaluate(editor, `window.__interactionSaved=false;(()=>{const pending=[];window.dispatchEvent(new CustomEvent('bingo:prepare-project-close',{detail:{pending}}));Promise.all(pending).then(()=>window.__interactionSaved=true)})();true`);
      await waitFor(() => evaluate(editor, 'window.__interactionSaved'), 'save flush'); return read();
    };
    await select('button-a');
    for (let i = 0; i < 12; i++) {
      await evaluate(editor, `(()=>{const input=document.querySelector('[data-component-prop=label] input');input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Discard rapid draft ${i}');input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
      await frame(); await select(i % 2 ? 'button-a' : 'button-b');
    }
    let saved = await flush();
    check('Rapid selection changes discard unsubmitted parameter drafts without cross-instance writes', ['button-a','button-b'].every(id => JSON.stringify(saved[id].props) === JSON.stringify(original[id].props)));
    await select('button-a');
    const field = 'input[aria-label="Border Radius"]';
    await waitFor(() => evaluate(editor, `!!document.querySelector(${JSON.stringify(field)})`), 'radius field');
    await evaluate(editor, `(()=>{const input=document.querySelector(${JSON.stringify(field)});input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'20px');input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    await frame(); await evaluate(editor, 'document.activeElement.blur()'); await frame();
    await waitFor(async () => (await flush())['button-a'].styles.borderRadius === '20px', 'numeric scrub baseline');
    const baseline = await flush();
    const start = async () => { await evaluate(editor, `document.querySelector(${JSON.stringify(field)}).closest('[data-slot=inspector-control-shell]').querySelector('[data-slot=inspector-scrub-handle]').dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,clientX:100}));true`); await frame(); };
    const move = async x => { await evaluate(editor, `document.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,buttons:1,clientX:${x}}));true`); await frame(); };
    const stop = async () => { await evaluate(editor, `document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:0}));true`); await frame(); };
    await start(); await move(105); await move(112); await move(118); await stop();
    saved = await flush();
    check('Continuous style scrubbing updates only the original component and records its override', saved['button-a'].styles.borderRadius === '38px' && JSON.stringify(saved['button-b']) === JSON.stringify(baseline['button-b']) && saved['button-a'].componentEditing.styleRecords.borderRadius.origin === 'editor');
    key('z',['meta']); await frame(); saved = await flush();
    check('One undo restores the complete pre-scrub component including override metadata', JSON.stringify(saved['button-a']) === JSON.stringify(baseline['button-a']));
    key('z',['meta','shift']); await frame(); saved = await flush();
    check('One redo reapplies the final scrub value rather than an intermediate movement', saved['button-a'].styles.borderRadius === '38px');
    key('z',['meta']); await frame();
    await start(); await move(104); await select('button-b'); await move(125); await stop();
    saved = await flush();
    check('Changing selection ends the original style gesture before later movement reaches another instance', saved['button-a'].styles.borderRadius === '24px' && JSON.stringify(saved['button-b']) === JSON.stringify(baseline['button-b']));
    key('z',['meta']); await frame(); saved = await flush();
    check('A selection-ended gesture remains one undo operation for its original component', JSON.stringify(saved['button-a']) === JSON.stringify(baseline['button-a']) && JSON.stringify(saved['button-b']) === JSON.stringify(baseline['button-b']));
    key('z',['meta']); await frame(); saved = await flush();
    check('Interaction verification leaves the persisted component parameters and overrides unchanged', ['button-a','button-b'].every(id => JSON.stringify(saved[id]) === JSON.stringify(original[id])));
    report.passed = true;
  } catch(error) { report.failure = error.stack; console.error(error); if(editor)fs.writeFileSync(path.join(output,'interaction-failure.png'),(await editor.capturePage()).toPNG()); }
  finally { fs.writeFileSync(path.join(output,'interaction-report.json'),JSON.stringify(report,null,2)); app.exit(report.passed?0:1); }
});
