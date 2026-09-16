/* Run after pnpm build: pnpm exec electron tools/test-design-storage.cjs
 * Uses isolated app data and temporary projects; no AI requests are sent.
 */
const { app, BrowserWindow, webContents, dialog } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const repo = path.resolve(__dirname, "..");
const temp = fs.realpathSync(fs.mkdtempSync(path.join(require("node:os").tmpdir(), "bingo-design-ui-")));
const data = path.join(temp, "data");
const output = path.join(repo, "output/playwright/design-storage");
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value)); };
const projects = ["shared", "ignored"].map((name, index) => {
  const project = path.join(temp, name);
  write(path.join(project, "package.json"), { name, type: "module", dependencies: { react: "19.2.8", "react-dom": "19.2.8" } });
  const componentName = index === 0 ? "App" : "ActiveThemeProvider";
  write(path.join(project, `src/${componentName}.tsx`), `import React from "react"; export default function ${componentName}(){return <main>Design storage test</main>}`);
  fs.symlinkSync(path.join(repo, "node_modules"), path.join(project, "node_modules"));
  execFileSync("git", ["init", "-q"], { cwd: project });
  return project;
});
write(path.join(data, "preferences.json"), { schemaVersion: 1, localePreference: "zh-CN" });
write(path.join(data, "project-tabs.json"), []);
app.commandLine.appendSwitch("user-data-dir", data);
let chosen = projects[0];
dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [chosen] });
dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: false });
const report = { checks: [], screenshots: [] };
const check = (label, value) => { assert.ok(value, label); report.checks.push(label); };
const evaluate = (wc, script) => wc.executeJavaScript(script, true);
const invoke = (wc, channel, args) => evaluate(wc, `window.api.invoke(${JSON.stringify(channel)}, ${JSON.stringify(args)})`);
async function waitFor(fn, label) {
  const start = Date.now();
  while (Date.now() - start < 45000) {
    const value = await fn();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${label}`);
}
async function clickText(wc, label) {
  return evaluate(wc, `(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)}); if (!button) throw Error('Missing button'); button.click(); })()`);
}
const timeout = setTimeout(() => app.exit(1), 120000);
timeout.unref();
require(path.join(repo, "out/main/index.js"));
app.whenReady().then(async () => {
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows()[0], "window");
    win.setSize(1280, 900);
    const shell = win.webContents;
    await waitFor(() => evaluate(shell, "document.body.innerText.includes('打开文件夹')").catch(() => false), "home");
    for (const [index, project] of projects.entries()) {
      chosen = project;
      await invoke(shell, "project-tabs:home");
      await clickText(shell, "打开文件夹");
      await waitFor(() => evaluate(shell, "!!document.querySelector('input[type=checkbox][aria-describedby=design-git-help]')"), "Git checkbox for single project");
      check(`Project ${index + 1}: unchecked by default`, await evaluate(shell, "!document.querySelector('input[type=checkbox][aria-describedby=design-git-help]').checked"));
      check(`Project ${index + 1}: no project data before confirmation`, !fs.existsSync(path.join(project, ".bingo")));
      if (index === 1) await evaluate(shell, "document.querySelector('input[type=checkbox][aria-describedby=design-git-help]').click()");
      await evaluate(shell, "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      await new Promise(resolve => setTimeout(resolve, 300));
      fs.mkdirSync(output, { recursive: true });
      const screenshot = path.join(output, index === 0 ? "git-shared.png" : "git-ignored.png");
      fs.writeFileSync(screenshot, (await win.capturePage()).toPNG());
      report.screenshots.push(screenshot);
      await clickText(shell, "打开项目");
      await waitFor(() => fs.existsSync(path.join(project, ".bingo/design/data-storage.json")), "project data");
      const editor = await waitFor(() => webContents.getAllWebContents().find(wc => {
        try { return new URL(wc.getURL()).searchParams.get("projectTab") === project; } catch { return false; }
      }), "editor");
      await waitFor(() => evaluate(editor, "!!window.api?.invoke").catch(() => false), "editor preload");
      const store = (op, args = {}) => invoke(editor, "bingo:store", { root: project, op, ...args });
      const initialPages = await store("list-canvases");
      check(`Project ${index + 1}: first page has no unsolicited layers`, initialPages.length === 1 && Object.keys(initialPages[0].canvas.elements.byId).length === 0 && initialPages[0].canvas.elements.childrenByParent.ROOT.length === 0);
      const repeatedPages = await store("list-canvases");
      check(`Project ${index + 1}: reopening keeps the same blank page`, repeatedPages.length === 1 && repeatedPages[0].id === initialPages[0].id && Object.keys(repeatedPages[0].canvas.elements.byId).length === 0);
      const savedInitialPage = JSON.parse(fs.readFileSync(path.join(project, `.bingo/design/pages/${initialPages[0].id}.json`), "utf8"));
      check(`Project ${index + 1}: empty layers are persisted`, Object.keys(savedInitialPage.canvas.elements.byId).length === 0);
      const page = await store("create-page", { params: { name: "Portable prototype", zoom: 1.25, pan: { x: 40, y: 50 }, elements: { schemaVersion: 2, byId: {}, childrenByParent: { ROOT: [] } } } });
      await store("save-canvas", { params: { id: page.id, name: "Changed", _expectedRevision: page._revision } });
      const versions = await store("canvas-versions", { pageId: page.id });
      check(`Project ${index + 1}: history saved in project`, versions.length === 1 && fs.existsSync(path.join(project, `.bingo/design/canvases/${page.id}.versions`)));
      await store("restore-canvas-version", { pageId: page.id, versionId: versions[0].id });
      const loaded = await store("load-canvas", { pageId: page.id });
      check(`Project ${index + 1}: camera restored`, loaded.zoom === 1.25 && loaded.pan.x === 40);
      const componentName = index === 0 ? "App" : "ActiveThemeProvider";
      const manualElements = { schemaVersion: 2, byId: { "user-component": { id: "user-component", type: "component", componentName, props: {}, styles: { position: "absolute", left: 80, top: 80 } } }, childrenByParent: { ROOT: ["user-component"] } };
      await store("save-canvas", { params: { id: page.id, elements: manualElements } });
      const afterInsert = await store("list-canvases");
      check(`Project ${index + 1}: user-inserted ${componentName} survives reopening`, afterInsert.find(item => item.id === page.id).canvas.elements.byId["user-component"].componentName === componentName);
      await store("save-canvas", { params: { id: page.id, elements: { schemaVersion: 2, byId: {}, childrenByParent: { ROOT: [] } } } });
      const afterClear = await store("list-canvases");
      check(`Project ${index + 1}: clearing layers does not recreate a component`, Object.keys(afterClear.find(item => item.id === page.id).canvas.elements.byId).length === 0);
      await store("create-chat", { input: { id: "test-chat", messages: [{ role: "user", content: "Remember this prototype" }] } });
      check(`Project ${index + 1}: chat saved in project`, fs.existsSync(path.join(project, ".bingo/design/chats/test-chat.json")));
      const uploaded = await store("upload-asset", { filename: "test.png", dataBase64: Buffer.from("test asset").toString("base64") });
      check(`Project ${index + 1}: asset reference is portable`, uploaded.url.startsWith("bingo-asset:") && fs.existsSync(path.join(project, ".bingo/design/assets", uploaded.url.slice(12))));
      if (index === 0) {
        check("Unchecked leaves gitignore unchanged", !fs.existsSync(path.join(project, ".gitignore")));
        execFileSync("git", ["add", ".bingo/design"], { cwd: project });
        check("Design data can be staged", execFileSync("git", ["ls-files", ".bingo/design/chats/test-chat.json"], { cwd: project }).length > 0);
      } else {
        execFileSync("git", ["check-ignore", "-q", ".bingo/design/chats/test-chat.json"], { cwd: project });
        check("Checked ignores all design data", fs.readFileSync(path.join(project, ".gitignore"), "utf8").includes("/.bingo/design/"));
      }
    }
    await invoke(shell, "project-tabs:home");
    const registry = () => JSON.parse(fs.readFileSync(path.join(data, "local-projects.json"), "utf8"));
    const removeCheckbox = "document.querySelector('input[type=checkbox][aria-describedby=remove-design-data-help]')";
    const openRemoval = async name => {
      await evaluate(shell, `document.querySelector('button[aria-label="从项目列表中移除 ${name}"]').click()`);
      await waitFor(() => evaluate(shell, `!!${removeCheckbox}`), "removal checkbox");
    };
    const editorFor = project => webContents.getAllWebContents().find(wc => {
      try { return new URL(wc.getURL()).searchParams.get("projectTab") === project; } catch { return false; }
    });
    check("An editor cannot remove another project", await invoke(editorFor(projects[1]), "bingo:remove-project", { projectId: projects[0], deleteDesignData: true }).then(() => false, () => true));
    await openRemoval("shared");
    check("Removal keeps data by default", await evaluate(shell, `!${removeCheckbox}.checked`));
    await evaluate(shell, `${removeCheckbox}.click()`);
    await clickText(shell, "取消");
    check("Cancelling removal keeps registry and files", registry().some(row => row.id === projects[0]) && fs.existsSync(path.join(projects[0], ".bingo/design/chats/test-chat.json")));
    await openRemoval("shared");
    check("Reopening removal resets the checkbox", await evaluate(shell, `!${removeCheckbox}.checked`));
    await clickText(shell, "移除项目");
    await waitFor(() => !registry().some(row => row.id === projects[0]), "remove without deleting");
    check("Unchecked removal keeps design files", fs.existsSync(path.join(projects[0], ".bingo/design/chats/test-chat.json")));
    check("Removal closes the open project tab", !(await invoke(shell, "project-tabs:get")).tabs.some(tab => tab.id === projects[0]));
    await waitFor(() => evaluate(shell, `!${removeCheckbox}`), "removal dialog closed");

    const ignored = projects[1];
    const legacyKey = require("node:crypto").createHash("sha256").update(ignored).digest("hex").slice(0, 32);
    const legacy = path.join(data, "local-project-data", legacyKey);
    write(path.join(legacy, "chats/old-chat.json"), { id: "old-chat", messages: [] });
    write(path.join(ignored, ".bingo/config.json"), { schemaVersion: 1, iconLibraries: [] });
    const oldGitignore = fs.readFileSync(path.join(ignored, ".gitignore"), "utf8");
    const ignoredEditor = editorFor(ignored);
    await evaluate(ignoredEditor, "window.api.send('project-tabs:status',{source:'removal-test',status:'running'})");
    await waitFor(async () => (await invoke(shell, "project-tabs:get")).tabs.find(tab => tab.id === ignored)?.status === "running", "running task status");
    await openRemoval("ignored");
    await evaluate(shell, `${removeCheckbox}.click()`);
    await clickText(shell, "移除并删除数据");
    // The native running-task prompt is stubbed to Cancel.
    await waitFor(() => evaluate(shell, "[...document.querySelectorAll('button')].some(b => b.textContent.trim() === '移除并删除数据' && !b.disabled)"), "cancelled tab closure");
    check("Cancelling task closure preserves the project and data", registry().some(row => row.id === ignored) && fs.existsSync(path.join(ignored, ".bingo/design/chats/test-chat.json")));
    await evaluate(ignoredEditor, "window.api.send('project-tabs:status',{source:'removal-test',status:'idle'})");
    await waitFor(async () => (await invoke(shell, "project-tabs:get")).tabs.find(tab => tab.id === ignored)?.status !== "running", "idle project");
    await evaluate(shell, "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
    await new Promise(resolve => setTimeout(resolve, 250));
    const removalScreenshot = path.join(output, "remove-with-data.png");
    fs.writeFileSync(removalScreenshot, (await win.capturePage()).toPNG());
    report.screenshots.push(removalScreenshot);
    const outsideAssets = path.join(temp, "outside-assets");
    fs.mkdirSync(outsideAssets);
    fs.symlinkSync(outsideAssets, path.join(legacy, "assets"));
    await clickText(shell, "移除并删除数据");
    await waitFor(() => evaluate(shell, "!!document.querySelector('[role=alert]')"), "deletion failure displayed");
    check("Failed deletion keeps the project registered and data intact", registry().some(row => row.id === ignored) && fs.existsSync(path.join(legacy, "chats/old-chat.json")));
    fs.unlinkSync(path.join(legacy, "assets"));
    await clickText(shell, "移除并删除数据");
    await waitFor(() => !registry().some(row => row.id === ignored), "remove with data");
    check("Checked removal deletes project and legacy design data", !fs.existsSync(path.join(ignored, ".bingo/design")) && !fs.existsSync(path.join(legacy, "chats")));
    check("Checked removal preserves source, configuration and Git rules", fs.existsSync(path.join(ignored, "src/ActiveThemeProvider.tsx")) && fs.existsSync(path.join(ignored, ".bingo/config.json")) && fs.readFileSync(path.join(ignored, ".gitignore"), "utf8") === oldGitignore);
    await waitFor(() => evaluate(shell, `!${removeCheckbox}`), "deletion dialog closed");
    chosen = ignored;
    await clickText(shell, "打开文件夹");
    await waitFor(() => evaluate(shell, "!!document.querySelector('input[type=checkbox][aria-describedby=design-git-help]')"), "re-add project");
    await clickText(shell, "打开项目");
    const reopened = await waitFor(() => editorFor(ignored), "reopened editor");
    await waitFor(() => evaluate(reopened, "!!window.api?.invoke").catch(() => false), "reopened preload");
    const chats = await invoke(reopened, "bingo:store", { root: ignored, op: "list-chats" });
    check("Re-adding a deleted project does not restore old chats", Array.isArray(chats) && chats.length === 0);
    write(path.join(output, "report.json"), report);
    console.log(JSON.stringify(report, null, 2));
    app.exit(0);
  } catch (error) {
    write(path.join(output, "report.json"), { ...report, error: String(error) });
    console.error(error);
    app.exit(1);
  }
});
