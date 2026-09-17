/* Run after pnpm build: pnpm exec electron tools/test-icon-auto-discovery.cjs
 * Verifies npm icon discovery and loading with temporary project/app data.
 * No AI request is sent and no existing project is modified.
 */
const { app, BrowserWindow, webContents } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const qa = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "bingo-icon-discovery-test-")));
const project = path.join(qa, "project");
const data = path.join(qa, "data");
fs.mkdirSync(path.join(project, "src"), { recursive: true });
fs.mkdirSync(data, { recursive: true });
fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({
  name: "icon-discovery-fixture",
  private: true,
  dependencies: {
    react: "19.2.8",
    "react-dom": "19.2.8",
    "@phosphor-icons/react": "2.1.10",
  },
}));
fs.writeFileSync(path.join(project, "src", "Card.tsx"), [
  'import { Airplane } from "@phosphor-icons/react";',
  "export function Card(){return <div><Airplane size={20}/>Ready</div>}",
].join("\n"));
fs.symlinkSync(path.join(root, "node_modules"), path.join(project, "node_modules"));
fs.writeFileSync(path.join(data, "local-projects.json"), JSON.stringify([
  { id: project, rootPath: project, canonicalRoot: project, name: "Icon discovery", addedAt: Date.now() },
]));
fs.writeFileSync(path.join(data, "preferences.json"), JSON.stringify({ schemaVersion: 1, localePreference: "en" }));
fs.writeFileSync(path.join(data, "project-tabs.json"), "[]");
app.commandLine.appendSwitch("user-data-dir", data);

const report = { checks: [], directory: qa };
const check = (label, condition) => {
  assert.ok(condition, label);
  report.checks.push(label);
  fs.writeFileSync(path.join(qa, "report.json"), JSON.stringify(report, null, 2));
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(get, label, timeout = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const result = await get();
    if (result) return result;
    await sleep(100);
  }
  throw new Error(`Timed out: ${label}`);
}
const invoke = (wc, channel, args) => wc.executeJavaScript(
  `window.api.invoke(${JSON.stringify(channel)},${JSON.stringify(args)})`,
  true,
);
async function clickVisibleText(wc, selector, label) {
  const point = await wc.executeJavaScript(`(() => {
    const element = Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(candidate => candidate.offsetParent && candidate.textContent.trim() === ${JSON.stringify(label)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
  })()`, true);
  if (!point) return false;
  wc.sendInputEvent({ type: "mouseDown", x: point.x, y: point.y, button: "left", clickCount: 1 });
  wc.sendInputEvent({ type: "mouseUp", x: point.x, y: point.y, button: "left", clickCount: 1 });
  return true;
}

const deadline = setTimeout(() => app.exit(1), 150_000);
deadline.unref();
require(path.join(root, "out/main/index.js"));

app.whenReady().then(async () => {
  try {
    const win = await waitFor(() => BrowserWindow.getAllWindows()[0], "application window");
    await waitFor(() => win.webContents.executeJavaScript("!!window.api?.invoke").catch(() => false), "shell preload");
    await invoke(win.webContents, "project-tabs:open", { projectId: project });
    const editor = await waitFor(
      () => webContents.getAllWebContents().find(contents => contents.getURL().includes("projectTab=")),
      "project editor",
    );
    await waitFor(async () => {
      const state = await invoke(win.webContents, "project-tabs:get");
      return state.tabs.find(tab => tab.id === project)?.status === "idle";
    }, "project ready");

    const settings = await invoke(editor, "bingo:store", { op: "read-settings", root: project });
    check("New project keeps configuration storage unselected", settings._configuration.initializationRequired === true);
    check("Manifest icon package is auto-discovered", settings._iconDiscovery.automatic.includes("@phosphor-icons/react"));
    check("Auto-discovered package is effectively enabled", settings.effectiveIconLibraries.includes("@phosphor-icons/react"));
    check("Auto discovery does not create .bingo/config.json", !fs.existsSync(path.join(project, ".bingo", "config.json")));

    const moduleResult = await invoke(editor, "bingo:load-module", { root: project, specifier: "@phosphor-icons/react" });
    check("The discovered package resolves through the project module loader", moduleResult.success === true && moduleResult.url.startsWith("data:"));
    const exportNames = await editor.executeJavaScript(`import(${JSON.stringify(moduleResult.url)}).then(module => Object.keys(module))`, true);
    check("The renderer executes the discovered module and sees React icon exports", exportNames.includes("Airplane"));
    check("Loading the library still does not create configuration", !fs.existsSync(path.join(project, ".bingo", "config.json")));

    check("The desktop editor exposes the Assets panel", await clickVisibleText(editor, '[role="tab"],button', "Assets"));
    await waitFor(() => editor.executeJavaScript(`document.body.innerText.includes('HTML') && document.body.innerText.includes('Icons')`).catch(() => false), "Assets panel", 20_000);
    await waitFor(
      () => editor.executeJavaScript(`document.body.innerText.includes('Phosphor')`).catch(() => false),
      "auto-discovered icon library in Assets panel",
      90_000,
    );
    check("The auto-discovered library appears in the icon panel", true);

    check("The project menu opens from the desktop editor", await clickVisibleText(editor, "button", "Icon discovery"));
    await waitFor(() => editor.executeJavaScript(`Array.from(document.querySelectorAll('[role="menuitem"]')).some(element => element.offsetParent && element.textContent.includes('Project settings'))`).catch(() => false), "project settings menu");
    check("The project settings action is available", await clickVisibleText(editor, '[role="menuitem"]', "Project settings"));
    await waitFor(() => editor.executeJavaScript(`Array.from(document.querySelectorAll('div,span,p,h1,h2,h3')).some(element => element.offsetParent && element.textContent.trim() === 'Configuration storage')`).catch(() => false), "configuration storage settings");
    check("Project settings exposes configuration storage for manual preferences", true);

    fs.writeFileSync(path.join(qa, "editor.png"), (await editor.capturePage()).toPNG());
    report.screenshot = path.join(qa, "editor.png");
    fs.writeFileSync(path.join(qa, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    app.exit(0);
  } catch (error) {
    const editor = webContents.getAllWebContents().find(contents => contents.getURL().includes("projectTab="));
    if (editor && !editor.isDestroyed()) {
      report.visibleButtons = await editor.executeJavaScript(`Array.from(document.querySelectorAll('button')).filter(button=>button.offsetParent).map(button=>button.textContent.trim()).filter(Boolean).slice(0,100)`).catch(() => []);
      report.assetsButtons = await editor.executeJavaScript(`Array.from(document.querySelectorAll('button')).filter(button => button.textContent.trim() === 'Assets').map(button => ({ visible: !!button.offsetParent, disabled: button.disabled, html: button.outerHTML.slice(0,1000) }))`).catch(() => []);
      report.bodyText = await editor.executeJavaScript(`document.body.innerText.slice(0,4000)`).catch(() => "");
      report.failureScreenshot = path.join(qa, "failure.png");
      fs.writeFileSync(report.failureScreenshot, (await editor.capturePage()).toPNG());
    }
    report.error = String(error?.stack || error);
    fs.writeFileSync(path.join(qa, "report.json"), JSON.stringify(report, null, 2));
    console.error(error);
    app.exit(1);
  }
});
