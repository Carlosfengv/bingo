/* Run after pnpm build: pnpm exec electron tools/test-hugeicons-project.cjs /path/to/project
 * Copies a saved Hugeicons page and its project sources into an isolated fixture.
 * The original project and application profile are never written.
 */
const { app, BrowserWindow, webContents } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createRequire } = require("node:module");
const repo = path.resolve(__dirname, "..");
const source = path.resolve(process.argv[2]);
const qa = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "bingo-hugeicons-")));
const project = path.join(qa, "project"), data = path.join(qa, "data");
const output = path.join(repo, "output/playwright/hugeicons");
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value, null, 2));
};
for (const name of ["package.json", "tsconfig.json", "postcss.config.mjs", "styles.css", "src", "public"]) {
  if (fs.existsSync(path.join(source, name))) fs.cpSync(path.join(source, name), path.join(project, name), { recursive: true });
}
fs.symlinkSync(path.join(source, "node_modules"), path.join(project, "node_modules"));
const pagesPath = path.join(source, ".bingo/design/pages");
const page = fs.readdirSync(pagesPath).filter(name => name.endsWith(".json"))
  .map(name => JSON.parse(fs.readFileSync(path.join(pagesPath, name), "utf8")))
  .find(page => Object.values(page.canvas?.elements?.byId || {}).some(element => element.library === "@hugeicons/core-free-icons"));
assert.ok(page, "Project has a saved Hugeicons page");
const expectedIcons = Object.values(page.canvas.elements.byId).filter(element => element.type === "icon" && element.library === "@hugeicons/core-free-icons");
write(path.join(project, ".bingo/design/manifest.json"), { schemaVersion: 1, documentId: require("node:crypto").randomUUID(), pages: [{ id: page.id }] });
write(path.join(project, ".bingo/design/pages", page.id + ".json"), page);
for (const name of ["variables.json", "project.json", "data-storage.json"]) {
  const file = path.join(source, ".bingo/design", name);
  if (fs.existsSync(file)) fs.copyFileSync(file, path.join(project, ".bingo/design", name));
}
write(path.join(data, "preferences.json"), { schemaVersion: 1, localePreference: "en" });
write(path.join(data, "local-projects.json"), [{ id: project, rootPath: project, canonicalRoot: project, name: "Hugeicons QA", addedAt: Date.now() }]);
write(path.join(data, "project-tabs.json"), []);
app.commandLine.appendSwitch("user-data-dir", data);
const report = { directory: qa, source, checks: [], icons: [] };
const check = (label, value) => { assert.ok(value, label); report.checks.push(label); console.log("PASS", label); };
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`);
async function waitFor(fn, label) {
  const start = Date.now();
  while (Date.now() - start < 90_000) {
    const value = await fn();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out: ${label}`);
}
setTimeout(() => { console.error("Hugeicons QA timeout", qa); app.exit(1); }, 240_000).unref();
require(process.env.BINGO_APP_ENTRY || path.join(repo, "out/main/index.js"));
app.whenReady().then(async () => {
  let editor;
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows()[0], "window");
    win.setSize(1800, 1100);
    await waitFor(() => evaluate(win.webContents, "!!window.api?.invoke").catch(() => false), "preload");
    await invoke(win.webContents, "project-tabs:open", { projectId: project });
    editor = await waitFor(() => webContents.getAllWebContents().find(wc => {
      try { return new URL(wc.getURL()).searchParams.get("projectTab") === project; } catch { return false; }
    }), "editor");
    const settings = await invoke(editor, "bingo:store", { op: "read-settings", root: project });
    check("Hugeicons is automatically enabled", settings.effectiveIconLibraries.includes("@hugeicons/core-free-icons"));
    const iconIds = expectedIcons.map(icon => icon.id);
    await waitFor(() => evaluate(editor, `(${JSON.stringify(iconIds)}).every(id => document.querySelector('[data-canvas-content] [data-element-id="'+id+'"] svg'))`).catch(() => false), "all saved icons rendered as SVG");
    const manifest = createRequire(path.join(source, "package.json")).resolve("@hugeicons/core-free-icons/package.json");
    const esmEntry = JSON.parse(fs.readFileSync(manifest, "utf8")).module;
    const definitions = await import(require("node:url").pathToFileURL(path.resolve(path.dirname(manifest), esmEntry)).href);
    for (const icon of expectedIcons) {
      const svg = await evaluate(editor, `(() => {
        const svg = document.querySelector('[data-canvas-content] [data-element-id="${icon.id}"] svg');
        const rect = svg.getBoundingClientRect();
        return { paths: [...svg.querySelectorAll('path')].map(p => p.getAttribute('d')), width: rect.width, height: rect.height, size: svg.getAttribute('width') };
      })()`);
      assert.ok(svg.width > 0 && svg.height > 0, `${icon.iconName} has visible dimensions`);
      assert.deepEqual(svg.paths, definitions[icon.iconName].filter(([tag]) => tag === "path").map(([, props]) => props.d));
      assert.equal(Number(svg.size), Number(icon.props.size || 24));
      report.icons.push({ name: icon.iconName, ...svg });
    }
    check(`All ${expectedIcons.length} saved icons match the installed Hugeicons SVG paths and sizes`, true);
    check("No icon load error is visible", await evaluate(editor, "!document.body.innerText.includes('Some project icon libraries could not be loaded')"));
    await evaluate(editor, `(() => { const tab = [...document.querySelectorAll('[role="tab"],button')].find(el => el.offsetParent && el.textContent.trim() === 'Assets'); if (!tab) throw Error('Assets tab missing'); tab.click(); })()`);
    await waitFor(() => evaluate(editor, "document.body.innerText.includes('Hugeicons')"), "Hugeicons in asset library");
    check("Hugeicons appears in the Assets panel", true);
    await evaluate(editor, "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
    fs.mkdirSync(output, { recursive: true });
    report.screenshot = path.join(output, "editor.png");
    fs.writeFileSync(report.screenshot, (await editor.capturePage()).toPNG());
    write(path.join(output, "report.json"), report);
    console.log(JSON.stringify({ directory: qa, screenshot: report.screenshot, checks: report.checks }, null, 2));
    app.exit(0);
  } catch (error) {
    report.error = String(error.stack || error);
    if (editor && !editor.isDestroyed()) {
      report.body = await evaluate(editor, "document.body.innerText.slice(0,5000)").catch(() => "");
      fs.mkdirSync(output, { recursive: true });
      fs.writeFileSync(path.join(output, "failure.png"), (await editor.capturePage()).toPNG());
    }
    write(path.join(output, "report.json"), report);
    console.error(report);
    app.exit(1);
  }
});
