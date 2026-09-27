/* Copies page 4 and its CSS into a temporary project. Never writes the source project. */
const { app, BrowserWindow, webContents } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const source = process.env.BINGO_PAGE4_SOURCE || '/Users/carlos/Downloads/zeron-ui';
const sourcePage = path.join(source, '.bingo/design/pages/e611035f-4380-4dca-baf8-c6061401faef.json');
const sourceCss = path.join(source, 'app/globals.css');
const page = JSON.parse(fs.readFileSync(sourcePage, 'utf8'));
const originalCss = fs.readFileSync(sourceCss, 'utf8');
const prebuiltCss = process.env.BINGO_PAGE4_CSS ? fs.readFileSync(process.env.BINGO_PAGE4_CSS, 'utf8') : null;
const fullCopy = process.env.BINGO_PAGE4_FULL_COPY === '1';
const cssValue = name => {
  const match = originalCss.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw Error(`Missing --${name} in source CSS`);
  return match[1].trim();
};
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const original = { page: hash(JSON.stringify(page)), css: hash(originalCss) };
const qa = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-page4-')));
const project = path.join(qa, 'project');
const data = path.join(qa, 'data');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)); };
if (fullCopy) {
  for (const directory of ['app', 'docs', 'packages', 'scripts', 'public']) fs.cpSync(path.join(source, directory), path.join(project, directory), { recursive: true });
  for (const file of ['package.json', 'pnpm-workspace.yaml', 'tsconfig.json', 'postcss.config.mjs', 'next.config.ts']) {
    const from = path.join(source, file);
    if (fs.existsSync(from)) write(path.join(project, file), fs.readFileSync(from));
  }
} else {
  write(path.join(project, 'package.json'), { name: 'page4-isolated-qa', type: 'module', dependencies: { react: '19.2.8', 'react-dom': '19.2.8', tailwindcss: '^4.1.18', 'tw-animate-css': '^1.4.0' } });
  write(path.join(project, 'src/App.tsx'), "import '../app/globals.css'; export default function App(){return <div>Page 4 QA</div>}\n");
  write(path.join(qa, 'source-globals.css'), originalCss);
  write(path.join(project, 'app/globals.css'), prebuiltCss || `:root { color-scheme: light dark; --surface-base: ${cssValue('surface-base')}; --fg-default: ${cssValue('fg-default')}; --surface-floating: ${cssValue('surface-floating')}; }
.bg-surface-base { background-color: var(--surface-base); }
.bg-surface-floating { background-color: var(--surface-floating); }
.text-fg-default { color: var(--fg-default); }
`);
}
fs.symlinkSync(path.join(source, 'node_modules'), path.join(project, 'node_modules'));
write(path.join(project, `.bingo/design/pages/${page.id}.json`), page);
write(path.join(project, '.bingo/design/manifest.json'), { schemaVersion: 1, documentId: crypto.randomUUID(), pages: [{ id: page.id }] });
write(path.join(data, 'preferences.json'), { schemaVersion: 1, localePreference: 'zh-CN' });
write(path.join(data, 'local-projects.json'), [{ id: project, rootPath: project, canonicalRoot: project, name: 'Page 4 isolated QA', addedAt: Date.now() }]);
write(path.join(data, 'project-tabs.json'), []);
app.commandLine.appendSwitch('user-data-dir', data);
const roots = page.canvas.elements.childrenByParent.ROOT;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
async function waitFor(fn, label, timeout = 45000) { const start = Date.now(); while (Date.now() - start < timeout) { const value = await fn(); if (value) return value; await sleep(100); } throw Error(`Timed out: ${label}`); }
require(path.join(repo, 'out/main/index.js'));
setTimeout(() => { console.error('Timeout', qa); app.exit(1); }, fullCopy ? 300000 : 180000).unref();
app.whenReady().then(async () => {
  let editor;
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows().find(w => !w.isDestroyed()), 'window');
    win.setSize(1600, 1000); win.show();
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, '!!document.querySelector(".project-titlebar")').catch(() => false), 'shell');
    await invoke(shell, 'project-tabs:open', { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(wc => { try { return new URL(wc.getURL()).searchParams.get('projectTab') === project; } catch { return false; } }), 'editor');
    await waitFor(() => evaluate(editor, `!!document.querySelector('[data-canvas-content] [data-element-id="${roots[2]}"]')`).catch(() => false), 'page 4', fullCopy ? 240000 : 45000);
    await waitFor(async () => (await invoke(shell, 'project-tabs:get')).tabs.every(tab => tab.status === 'idle'), 'compile');
    const computed = id => evaluate(editor, `(()=>{const node=document.querySelector('[data-canvas-content] [data-element-id="${id}"]');const style=getComputedStyle(node);return {background:style.backgroundColor,color:style.color,textFill:style.webkitTextFillColor,scheme:style.colorScheme,variable:style.getPropertyValue('--surface-base').trim(),foreground:style.getPropertyValue('--fg-default').trim(),inline:node.getAttribute('style')}})()`);
    await waitFor(async () => (await computed(roots[2])).background === 'rgb(27, 27, 27)', 'third board Dark');
    const values = await Promise.all(roots.map(computed));
    const heading = await computed('el-1790437261795-88-cu49');
    const headingText = await computed('el-1790437261795-89-vn11');
    console.log('HEADING', JSON.stringify({ heading, headingText }));
    assert.equal(values[0].background, 'rgb(246, 248, 251)');
    assert.equal(values[1].background, page.canvas.elements.byId[roots[1]].theme?.localCollectionModes?.['project-styles'] === 'dark' ? 'rgb(27, 27, 27)' : 'rgb(246, 248, 251)');
    assert.equal(values[2].background, 'rgb(27, 27, 27)');
    assert.equal(values[2].scheme, 'dark');
    const expectedHeadingColor = page.canvas.elements.byId[roots[1]].theme?.localCollectionModes?.['project-styles'] === 'dark' ? 'rgb(249, 249, 249)' : 'rgb(0, 3, 10)';
    assert.equal(heading.color, expectedHeadingColor);
    assert.equal(headingText.color, expectedHeadingColor);
    assert.equal(heading.textFill, expectedHeadingColor);
    assert.equal(headingText.textFill, expectedHeadingColor);
    const modeSwitchMs = [];
    for (let index = 0; index < 30; index++) {
      const mode = index % 2 ? 'light' : 'dark';
      const expected = mode === 'dark' ? 'rgb(27, 27, 27)' : 'rgb(246, 248, 251)';
      const elapsed = await evaluate(editor, `new Promise((resolve,reject)=>{
        const picker=document.querySelector('[aria-label="色彩模式"]');
        const node=document.querySelector('[data-canvas-content] [data-element-id="${roots[0]}"]');
        if (!picker || !node) return reject(Error('Page mode picker or root missing'));
        const start=performance.now();
        picker.value='${mode}';picker.dispatchEvent(new Event('change',{bubbles:true}));
        const tick=()=>{if(getComputedStyle(node).backgroundColor==='${expected}') requestAnimationFrame(()=>resolve(performance.now()-start));else if(performance.now()-start>5000) reject(Error('Mode paint timeout'));else requestAnimationFrame(tick)};
        requestAnimationFrame(tick);
      })`);
      modeSwitchMs.push(elapsed);
    }
    await evaluate(editor, `document.querySelector('[data-canvas-content] [data-element-id="${roots[1]}"]').click()`);
    await waitFor(() => evaluate(editor, `document.querySelector('[aria-label="色彩模式"]')?.value === 'dark'`), 'selected Dark board');
    const headingModes = [];
    for (const [mode, background, foreground] of [
      ['light', 'rgb(246, 248, 251)', 'rgb(0, 3, 10)'],
      ['dark', 'rgb(27, 27, 27)', 'rgb(249, 249, 249)'],
      ['', 'rgb(246, 248, 251)', 'rgb(0, 3, 10)'],
      ['dark', 'rgb(27, 27, 27)', 'rgb(249, 249, 249)'],
    ]) {
      const result = await evaluate(editor, `new Promise((resolve,reject)=>{
        const picker=document.querySelector('[aria-label="色彩模式"]');
        const root=document.querySelector('[data-canvas-content] [data-element-id="${roots[1]}"]');
        const heading=document.querySelector('[data-canvas-content] [data-element-id="el-1790437261795-88-cu49"]');
        const text=document.querySelector('[data-canvas-content] [data-element-id="el-1790437261795-89-vn11"]');
        if (!picker || !root || !heading || !text) return reject(Error('Mode control or title missing'));
        picker.value=${JSON.stringify(mode)};picker.dispatchEvent(new Event('change',{bubbles:true}));
        const started=performance.now();
        const tick=()=>{
          const rootStyle=getComputedStyle(root),headingStyle=getComputedStyle(heading),textStyle=getComputedStyle(text);
          if(rootStyle.backgroundColor===${JSON.stringify(background)} && headingStyle.color===${JSON.stringify(foreground)} && textStyle.color===${JSON.stringify(foreground)} && headingStyle.webkitTextFillColor===${JSON.stringify(foreground)} && textStyle.webkitTextFillColor===${JSON.stringify(foreground)})
            requestAnimationFrame(()=>resolve({mode:${JSON.stringify(mode)},background:rootStyle.backgroundColor,heading:headingStyle.color,text:textStyle.color,textFill:headingStyle.webkitTextFillColor,scheme:rootStyle.colorScheme}));
          else if(performance.now()-started>5000) reject(Error('Title mode paint timeout: '+JSON.stringify({root:rootStyle.backgroundColor,heading:headingStyle.color,text:textStyle.color,textFill:headingStyle.webkitTextFillColor,scheme:rootStyle.colorScheme})));
          else requestAnimationFrame(tick);
        };requestAnimationFrame(tick);
      })`);
      assert.equal(result.scheme, mode === 'dark' ? 'dark' : 'light');
      assert.equal((await computed(roots[0])).background, 'rgb(246, 248, 251)');
      headingModes.push(result);
    }
    const sorted = [...modeSwitchMs].sort((a,b)=>a-b);
    const modeP95 = sorted[Math.ceil(sorted.length*.95)-1];
    write(path.join(qa, 'report.json'), { source, original, roots, values, heading, headingText, headingModes, modeSwitchMs, modeP95 });
    assert.equal(hash(fs.readFileSync(sourceCss, 'utf8')), original.css);
    assert.equal(hash(JSON.stringify(JSON.parse(fs.readFileSync(sourcePage, 'utf8')))), original.page);
    console.log('PASS isolated Page 4 computed background, heading and descendant colors', qa, JSON.stringify({ backgrounds: values.map(value => value.background), heading: heading.color, headingText: headingText.color, headingModes, modeP95 }));
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error, qa);
    if (editor) {
      const diagnostics = await evaluate(editor, `(()=>({roots:${JSON.stringify(roots)}.map(id=>{const node=document.querySelector('[data-canvas-content] [data-element-id="'+id+'"]');const style=node&&getComputedStyle(node);return {id,className:node?.className,background:style?.backgroundColor,scheme:style?.colorScheme,variable:style?.getPropertyValue('--surface-base')}}),stylesheets:[...document.styleSheets].length,text:document.body.innerText.slice(0,1000)}))()`).catch(error => ({ error: String(error) }));
      write(path.join(qa, 'diagnostics.json'), diagnostics);
      console.error('Diagnostics', JSON.stringify(diagnostics).slice(0,2000));
    }
    if (editor) await editor.capturePage().then(image => write(path.join(qa, 'failure.png'), image.toPNG())).catch(() => {});
    app.exit(1);
  }
});
