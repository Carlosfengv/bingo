/* Run after pnpm build: pnpm exec electron tools/test-project-preparation.cjs
 * Exercises the real preparation button, IPC authorization and Bun workspace
 * installation using local-only dependencies and isolated application data.
 */
const { app, BrowserWindow, webContents, dialog } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const qa = fs.realpathSync(fs.mkdtempSync(path.join(require("node:os").tmpdir(), "bingo-preparation-test-")));
const workspace = path.join(qa, "workspace");
const project = path.join(workspace, "apps/web");
const data = path.join(qa, "data");
const write = (name, text) => { fs.mkdirSync(path.dirname(name), { recursive: true }); fs.writeFileSync(name, text); };
write(path.join(workspace, "package.json"), JSON.stringify({ name: "fixture-workspace", private: true, packageManager: "bun@1.3.13", workspaces: { packages: ["apps/*", "packages/*"] } }));
write(path.join(workspace, "packages/shared/package.json"), JSON.stringify({ name: "@fixture/shared", version: "1.0.0", main: "index.js" }));
write(path.join(workspace, "packages/shared/index.js"), 'export const label = "Workspace is ready";');
write(path.join(project, "package.json"), JSON.stringify({ name: "web", dependencies: { "@fixture/shared": "workspace:*" } }));
write(path.join(project, "src/Card.tsx"), 'import {label} from "@fixture/shared"; import "./index.css"; export function Card(){return <div className="card">{label}</div>;}');
write(path.join(project, "src/index.css"), '@import "./base.css"; .card { padding: 16px; }');
write(path.join(project, "src/base.css"), '.card { color: rgb(12, 34, 56); }');
write(path.join(data, "local-projects.json"), JSON.stringify([{ id: project, rootPath: project, canonicalRoot: project, workspaceRoot: workspace, name: "web", addedAt: Date.now() }]));
write(path.join(data, "preferences.json"), JSON.stringify({ schemaVersion: 1, localePreference: "zh-CN" }));
write(path.join(data, "project-tabs.json"), "[]");
app.commandLine.appendSwitch("user-data-dir", data);
dialog.showMessageBox = async () => ({ response: 0, checkboxChecked: false });
const report = { checks: [], directory: qa };
const check = (name, condition) => { assert.ok(condition, name); report.checks.push(name); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(get, name) {
  const started = Date.now();
  while (Date.now() - started < 45_000) { const result = await get(); if (result) return result; await sleep(100); }
  throw new Error(`Timed out: ${name}`);
}
const invoke = (wc, channel, args) => wc.executeJavaScript(`window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`, true);
const deadline = setTimeout(() => app.exit(1), 120_000);
deadline.unref();
require(path.join(root, "out/main/index.js"));
app.whenReady().then(async () => {
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows()[0], "application window");
    await waitFor(() => win.webContents.executeJavaScript("!!window.api?.invoke").catch(() => false), "preload");
    await invoke(win.webContents, "project-tabs:open", { projectId: project });
    const editor = await waitFor(() => webContents.getAllWebContents().find(wc => wc.getURL().includes("projectTab=")), "project tab");
    await waitFor(() => editor.executeJavaScript('document.body.innerText.includes("准备工作区")').catch(() => false), "workspace preparation prompt");
    check("The workspace installation scope is visible before clicking", await editor.executeJavaScript(`document.body.innerText.includes(${JSON.stringify(workspace)})`));
    const before = await invoke(editor, "bingo:project-access-get", { projectId: project });
    check("Workspace is not generally authorized", !before.extraRoots?.includes(workspace));
    check("Unconfirmed preparation is rejected", await editor.executeJavaScript(`window.api.invoke('bingo:environment-prepare',{root:${JSON.stringify(project)}}).then(()=>false,e=>e.message.includes('needs access'))`));
    await editor.executeJavaScript(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='准备工作区').click()`, true);
    await waitFor(() => fs.existsSync(path.join(project, "node_modules/@fixture/shared")) || fs.existsSync(path.join(workspace, "node_modules/@fixture/shared")), "real Bun installation");
    await waitFor(() => editor.executeJavaScript('!!document.getElementById("bingo-project-compiled-css")?.sheet'), "compiled stylesheet applied");
    await waitFor(() => editor.executeJavaScript('!document.body.innerText.includes("正在准备项目") && !document.body.innerText.includes("这个项目还需要准备一些资源")'), "automatic continuation");
    const style = await editor.executeJavaScript(`(() => {const el=document.createElement('div');el.className='card';document.body.append(el);const style=getComputedStyle(el);const value={color:style.color,padding:style.padding};el.remove();return value;})()`);
    check("Nested CSS imports apply after preparation", style.color === "rgb(12, 34, 56)" && style.padding === "16px");
    const after = await invoke(editor, "bingo:project-access-get", { projectId: project });
    check("Preparation did not expand editor/agent folder access", JSON.stringify(after.extraRoots) === JSON.stringify(before.extraRoots));
    check("Dependency inspection is ready", (await invoke(editor, "bingo:environment-inspect", { root: project })).status === "ready");
    write(path.join(qa, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    app.exit(0);
  } catch (error) {
    console.error(error);
    write(path.join(qa, "report.json"), JSON.stringify({ ...report, error: String(error) }, null, 2));
    app.exit(1);
  }
});
