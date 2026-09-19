import { app, BrowserWindow, dialog, ipcMain, Menu, WebContentsView } from "electron";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { projectEntry, resolveRegisteredProjectRoot, releaseProjectVariableCache } from "./localStore";
import { ProjectTabSessionStore } from "./projectTabSessionStore";
import { drainTerminalsForQuit } from "./terminal";
import { tNative } from "./localization";
import { adjacentProjectAfterClose, PROJECT_TITLEBAR_HEIGHT, restoreProjectWindows } from "../shared/projectTabs";
import type { ProjectTabFailure, ProjectTabStatus, SavedProjectWindow } from "../shared/projectTabs";
import { recordDiagnosticEvent } from "./diagnosticsStore";
import { findWindowForProject, projectForWebContents, registerProjectRenderer,
  unregisterProjectRenderer, windowForWebContents, windowProjectMap } from "./windowManager";

type Tab = {
  id: string; name: string; view: WebContentsView; ready: boolean; failed: boolean;
  closing: boolean; activity: Map<string, ProjectTabStatus>; failure?: ProjectTabFailure;
};
const controllers = new Map<number, ProjectWindowTabs>();
const savedWindows = new Map<string, SavedProjectWindow>();
let quitting = false;
let registered = false;
const sessionFile = () => path.join(app.getPath("userData"), "project-tabs.json");
const sessionStore = new ProjectTabSessionStore(sessionFile);

function saveSession() {
  sessionStore.set([...savedWindows.values()]);
}
export function readSavedProjectWindows() {
  let value;
  try { value = JSON.parse(fs.readFileSync(sessionFile(), "utf8")); } catch { value = []; }
  const windows = restoreProjectWindows(value, id => fs.existsSync(id) ? resolveRegisteredProjectRoot(id) : null);
  savedWindows.clear();
  for (const entry of windows) savedWindows.set(entry.id, entry);
  return windows;
}
function status(tab: Tab): ProjectTabStatus {
  const states = [...tab.activity.values()];
  if (states.includes("attention")) return "attention";
  if (tab.failed || states.includes("error")) return "error";
  if (states.includes("running")) return "running";
  return tab.ready && !states.includes("loading") ? "idle" : "loading";
}

export class ProjectWindowTabs {
  tabs: Tab[] = [];
  activeId: string | null = null;
  revision = 0;
  activityRevision = 0;
  sessionId: string;
  closingWindow = false;
  private sessionClosing = false;
  allowWindowClose = false;
  constructor(public win: BrowserWindow, private options: {
    preload: string;
    load: (contents, projectId: string) => Promise<unknown>;
    configure: (contents) => void;
    stop: (projectId: string, contentsId: number) => void;
  }, saved?: SavedProjectWindow) {
    this.sessionId = saved?.id ?? crypto.randomUUID();
    controllers.set(win.id, this);
    win.on("resize", () => this.layout());
    win.on("enter-full-screen", () => this.layout());
    win.on("leave-full-screen", () => this.layout());
    for (const event of ["show", "hide", "minimize", "restore"] as const) win.on(event, () => this.publishActivity());
    win.webContents.on("did-finish-load", () => this.publish());
    win.on("close", event => {
      if (this.allowWindowClose) return;
      event.preventDefault();
      if (this.closingWindow || quitting) return;
      this.closingWindow = true;
      void this.prepareWindowClose().then(async ok => {
        if (ok) {
          this.sessionClosing = true;
          const previous = savedWindows.get(this.sessionId);
          if (controllers.size > 1) savedWindows.delete(this.sessionId);
          saveSession();
          try { await sessionStore.flush(); }
          catch (error) {
            this.sessionClosing = false;
            if (previous) savedWindows.set(this.sessionId, previous);
            saveSession(); this.resumePreparedTabs(); ok = false;
            await this.reportSessionFailure(error);
          }
        }
        this.closingWindow = false;
        if (ok && !win.isDestroyed()) { this.allowWindowClose = true; win.close(); }
      }).catch(error => { this.closingWindow = false; console.error(error); });
    });
    win.on("closed", () => {
      controllers.delete(win.id);
      for (const tab of [...this.tabs]) this.dispose(tab);
      windowProjectMap.delete(win.id);
      // Preserve the last window for next launch; closing another window removes
      // only that window from the session. App quit keeps every window.
      if (!quitting && controllers.size > 0) { savedWindows.delete(this.sessionId); saveSession(); }
    });
    for (const id of saved?.projectIds ?? []) this.open(id, false);
    this.activate(saved?.activeId ?? null, false);
    this.publish();
  }
  snapshot() {
    return { tabs: this.tabs.map(tab => ({ id: tab.id, name: tab.name, status: status(tab), closing: tab.closing,
      ...(tab.failure ? { failure: tab.failure } : {}) })),
      activeId: this.activeId, revision: this.revision, platform: process.platform };
  }
  publish() {
    if (this.win.isDestroyed()) return;
    this.revision++;
    this.win.webContents.send("project-tabs:changed", this.snapshot());
    if (!this.sessionClosing) {
      savedWindows.set(this.sessionId, { id: this.sessionId, projectIds: this.tabs.map(tab => tab.id), activeId: this.activeId });
      saveSession();
    }
  }
  activity(id: string) {
    return { active: this.activeId === id, windowVisible: this.win.isVisible() && !this.win.isMinimized(), revision: this.activityRevision };
  }
  publishActivity(tabs = this.tabs) {
    this.activityRevision++;
    for (const tab of tabs) {
      if (!tab.failed && !tab.view.webContents.isDestroyed()) tab.view.webContents.send("project-tabs:activity-changed", this.activity(tab.id));
    }
  }
  async reportSessionFailure(error) {
    await dialog.showMessageBox(this.win, { type: "error", message: tNative("tabs.sessionSaveFailed"), detail: String(error?.message || error) });
  }
  layout() {
    if (this.win.isDestroyed()) return;
    const [width, height] = this.win.getContentSize();
    for (const tab of this.tabs) {
      tab.view.setBounds({ x: 0, y: PROJECT_TITLEBAR_HEIGHT, width, height: Math.max(0, height - PROJECT_TITLEBAR_HEIGHT) });
      tab.view.setVisible(tab.id === this.activeId && !tab.failed);
    }
  }
  activate(id: string | null, focus = true) {
    if (id !== null && !this.tabs.some(tab => tab.id === id)) return;
    const selected = this.tabs.find(tab => tab.id === id);
    if (this.activeId === id) {
      if (focus) (selected && !selected.failed ? selected.view.webContents : this.win.webContents).focus();
      return;
    }
    const previous = this.tabs.find(tab => tab.id === this.activeId);
    this.activeId = id;
    if (id) windowProjectMap.set(this.win.id, id); else windowProjectMap.delete(this.win.id);
    if (previous) previous.view.setVisible(false);
    if (selected) selected.view.setVisible(!selected.failed);
    this.publishActivity([previous, selected].filter(Boolean) as Tab[]);
    if (focus) (selected && !selected.failed ? selected.view.webContents : this.win.webContents).focus();
    this.publish();
  }
  open(requestedId: string, activate = true) {
    if (this.closingWindow || quitting) return;
    const id = resolveRegisteredProjectRoot(requestedId);
    if (!id || !fs.existsSync(id)) throw new Error(tNative("tabs.projectUnavailable"));
    const local = this.tabs.find(tab => tab.id === id);
    if (local) {
      if (activate) {
        if (local.failed) void this.reload(id);
        else this.activate(id);
      }
      return;
    }
    const existing = findWindowForProject(id);
    if (existing) {
      if (activate) { if (existing.isMinimized()) existing.restore(); existing.show(); existing.focus(); }
      return;
    }
    const view = this.createView();
    const tab: Tab = { id, name: projectEntry(id).name, view, ready: false, failed: false, closing: false, activity: new Map() };
    this.tabs.push(tab);
    this.attachView(tab, view);
    this.loadTab(tab, view);
    if (activate) this.activate(id); else { this.layout(); this.publish(); }
  }
  createView() {
    const view = new WebContentsView({ webPreferences: {
      preload: this.options.preload, sandbox: false, contextIsolation: true,
      nodeIntegration: false, webSecurity: true, webviewTag: true, backgroundThrottling: false,
    } });
    view.setBackgroundColor("#1e1e1e");
    return view;
  }
  attachView(tab: Tab, view: WebContentsView) {
    tab.view = view;
    const id = tab.id;
    registerProjectRenderer(this.win, view.webContents, id, () => this.activate(id));
    this.win.contentView.addChildView(view);
    const [width, height] = this.win.getContentSize();
    view.setBounds({ x: 0, y: PROJECT_TITLEBAR_HEIGHT, width, height: Math.max(0, height - PROJECT_TITLEBAR_HEIGHT) });
    view.setVisible(tab.id === this.activeId && !tab.failed);
    this.options.configure(view.webContents);
    view.webContents.on("before-input-event", (event, input) => this.shortcut(event, input));
    view.webContents.on("render-process-gone", (_event, details) => {
      if (tab.view !== view) return;
      this.failTab(tab, view, {
        kind: "renderer",
        reason: typeof details?.reason === "string" ? details.reason : "unknown",
        exitCode: Number.isInteger(details?.exitCode) ? details.exitCode : null,
        occurredAt: new Date().toISOString(),
      });
    });
    view.webContents.on("did-start-navigation", (_event, _url, _inPlace, mainFrame) => {
      if (!mainFrame || tab.view !== view) return;
      this.options.stop(id, view.webContents.id);
      tab.ready = false;
      tab.activity.clear();
      this.publish();
    });
    view.webContents.on("destroyed", () => {
      const wasRegistered = projectForWebContents(view.webContents) === id;
      unregisterProjectRenderer(view.webContents.id);
      if (wasRegistered) this.options.stop(id, view.webContents.id);
    });
  }
  loadTab(tab: Tab, view: WebContentsView) {
    void this.options.load(view.webContents, tab.id).catch(error => {
      if (tab.view !== view) return;
      console.error("[ProjectTabs] Could not load project view:", error);
      this.failTab(tab, view, {
        kind: "load",
        reason: "load-failed",
        exitCode: null,
        occurredAt: new Date().toISOString(),
        detail: String(error?.message || error).slice(0, 2_000),
      });
    });
  }
  failTab(tab: Tab, view: WebContentsView, failure: ProjectTabFailure) {
    if (tab.view !== view) return;
    tab.failed = true;
    tab.ready = false;
    tab.failure = failure;
    tab.activity.clear();
    this.options.stop(tab.id, view.webContents.id);
    void recordDiagnosticEvent({ level: "error", source: "project-tabs",
      eventName: failure.kind === "renderer" ? "project.renderer_gone" : "project.renderer_load_failed",
      projectId: tab.id, payload: failure });
    this.layout();
    this.publish();
  }
  async reload(id: string) {
    const tab = this.tabs.find(candidate => candidate.id === id);
    if (!tab) throw new Error(tNative("tabs.projectUnavailable"));
    if (!tab.failed) { this.activate(id); return true; }
    const previous = tab.view;
    this.disposeView(tab, previous);
    tab.ready = false;
    tab.failed = false;
    tab.failure = undefined;
    tab.activity.clear();
    const view = this.createView();
    this.attachView(tab, view);
    this.loadTab(tab, view);
    // A replacement of the active renderer still needs a fresh activity revision.
    this.layout();
    this.publishActivity([tab]);
    this.publish();
    this.activate(id);
    return true;
  }
  shortcut(event, input) {
    if (input.type !== "keyDown") return;
    if ((input.meta || input.control) && input.key.toLowerCase() === "w" && !input.shift && !input.alt) {
      event.preventDefault();
      if (this.activeId) void this.close(this.activeId); else this.win.close();
    } else if (input.control && input.key === "Tab") {
      event.preventDefault();
      const ids = [null, ...this.tabs.map(tab => tab.id)];
      this.activate(ids[(ids.indexOf(this.activeId) + (input.shift ? -1 : 1) + ids.length) % ids.length]);
    } else if ((input.meta || input.control) && input.key.toLowerCase() === "t" && !input.alt) {
      event.preventDefault(); this.activate(null);
    }
  }
  async prepare(tab: Tab) {
    if (tab.closing) return false;
    let prepared = false;
    tab.closing = true;
    this.publish();
    try {
      if ([...tab.activity.values()].some(value => value === "running" || value === "attention")) {
        const result = await dialog.showMessageBox(this.win, { type: "question", message: tNative("tabs.closeRunning", { name: tab.name }),
          detail: tNative("tabs.closeRunningDetail"), buttons: [tNative("dialog.cancel"), tNative("tabs.stopAndClose")], defaultId: 0, cancelId: 0 });
        if (result.response !== 1) return false;
        this.options.stop(tab.id, tab.view.webContents.id);
      }
      if (!tab.ready || tab.view.webContents.isDestroyed()) { prepared = true; return true; }
      const requestId = crypto.randomUUID();
      const result = await new Promise<{ ok: boolean; error?: string }>(resolve => {
        const finish = (value) => { clearTimeout(timer); ipcMain.removeListener("project-tabs:prepared", listener); resolve(value); };
        const listener = (event, response) => {
          if (event.sender.id === tab.view.webContents.id && response?.requestId === requestId) finish(response);
        };
        const timer = setTimeout(() => finish({ ok: false }), 15_000);
        ipcMain.on("project-tabs:prepared", listener);
        tab.view.webContents.send("project-tabs:prepare-close", { requestId });
      });
      if (!result.ok) {
        this.activate(tab.id);
        await dialog.showMessageBox(this.win, { type: "error", message: tNative("tabs.saveFailed"),
          detail: result.error || tNative("tabs.saveFailedDetail") });
        return false;
      }
      prepared = true;
      return true;
    } finally {
      if (!prepared) {
        tab.closing = false;
        if (!tab.view.webContents.isDestroyed()) tab.view.webContents.send("project-tabs:resume");
      }
      this.publish();
    }
  }
  async close(id: string) {
    const tab = this.tabs.find(tab => tab.id === id);
    if (!tab || !(await this.prepare(tab))) return false;
    const next = adjacentProjectAfterClose(this.tabs.map(tab => tab.id), this.activeId, id);
    this.tabs = this.tabs.filter(entry => entry !== tab);
    this.dispose(tab);
    this.activate(next);
    this.publish();
    try { await sessionStore.flush(); }
    catch (error) { await this.reportSessionFailure(error); throw error; }
    return true;
  }
  dispose(tab: Tab) {
    this.disposeView(tab, tab.view);
    releaseProjectVariableCache(tab.id);
  }
  disposeView(tab: Tab, view: WebContentsView) {
    const contentsId = view.webContents.id;
    unregisterProjectRenderer(contentsId);
    this.options.stop(tab.id, contentsId);
    if (!this.win.isDestroyed()) this.win.contentView.removeChildView(view);
    if (!view.webContents.isDestroyed()) view.webContents.close();
  }
  async prepareWindowClose() {
    for (const tab of this.tabs) if (!(await this.prepare(tab))) { this.resumePreparedTabs(); return false; }
    return true;
  }
  resumePreparedTabs() {
    for (const tab of this.tabs) {
      tab.closing = false;
      if (!tab.view.webContents.isDestroyed()) tab.view.webContents.send("project-tabs:resume");
    }
    this.publish();
  }
}

export function tabsForWindow(win) { return win ? controllers.get(win.id) : undefined; }
export async function closeProjectTabsForRemoval(projectId: string) {
  for (const controller of controllers.values()) {
    if (controller.tabs.some(tab => tab.id === projectId) && !(await controller.close(projectId))) return false;
  }
  return true;
}
export async function prepareProjectTabsForQuit() {
  if (quitting) return true;
  quitting = true;
  let prepared = false;
  try {
    for (const controller of controllers.values()) {
      if (controller.closingWindow || !(await controller.prepareWindowClose())) return false;
    }
    try { await sessionStore.flush(); }
    catch (error) {
      const controller = controllers.values().next().value;
      if (controller) await controller.reportSessionFailure(error);
      return false;
    }
    try { await drainTerminalsForQuit(); }
    catch (error) {
      const controller = controllers.values().next().value;
      if (controller) await dialog.showMessageBox(controller.win, { type: "error", message: tNative("tabs.terminalCloseFailed"), detail: String(error?.message || error) });
      return false;
    }
    for (const controller of controllers.values()) controller.allowWindowClose = true;
    prepared = true;
    return true;
  } finally {
    if (!prepared) {
      quitting = false;
      for (const open of controllers.values()) open.resumePreparedTabs();
    }
  }
}
export function registerProjectTabsIPC() {
  if (registered) return;
  registered = true;
  const controllerFor = (event, shellOnly = true) => {
    const win = windowForWebContents(event.sender);
    const controller = win && controllers.get(win.id);
    if (!controller || (shellOnly && win.webContents.id !== event.sender.id)) throw new Error("Project tab action is not available to this renderer.");
    return controller;
  };
  ipcMain.handle("project-tabs:get", event => controllerFor(event).snapshot());
  ipcMain.handle("project-tabs:activity-get", event => {
    const id = projectForWebContents(event.sender);
    if (!id) throw new Error("Only project renderers can read their activity.");
    return controllerFor(event, false).activity(id);
  });
  ipcMain.handle("project-tabs:open", (event, args) => controllerFor(event).open(args?.projectId));
  ipcMain.handle("project-tabs:activate", (event, args) => controllerFor(event).activate(args?.projectId ?? null, args?.focus !== false));
  ipcMain.handle("project-tabs:reload", (event, args) => controllerFor(event).reload(args?.projectId));
  ipcMain.handle("project-tabs:home", event => controllerFor(event, false).activate(null));
  ipcMain.handle("project-tabs:close", (event, args) => controllerFor(event).close(args?.projectId));
  ipcMain.handle("project-tabs:list", event => {
    const controller = controllerFor(event);
    Menu.buildFromTemplate([
      { label: tNative("tabs.home"), type: "checkbox", checked: controller.activeId === null, click: () => controller.activate(null) },
      ...controller.tabs.map(tab => ({ label: tab.name, type: "checkbox" as const, checked: tab.id === controller.activeId, click: () => controller.activate(tab.id) })),
    ]).popup({ window: controller.win });
  });
  ipcMain.on("project-tabs:status", (event, args) => {
    const projectId = projectForWebContents(event.sender);
    if (!projectId) return;
    const controller = controllerFor(event, false);
    const tab = controller.tabs.find(tab => tab.id === projectId);
    if (!tab) return;
    const before = JSON.stringify({ ready: tab.ready, failed: tab.failed, name: tab.name, failure: tab.failure, activity: [...tab.activity] });
    if (args?.ready === true) { tab.ready = true; tab.failed = false; tab.failure = undefined; }
    if (typeof args?.name === "string" && args.name.trim()) tab.name = args.name.slice(0, 160);
    if (typeof args?.source === "string" && ["idle", "loading", "running", "attention", "error"].includes(args?.status)) {
      if (args.status === "idle") tab.activity.delete(args.source);
      else tab.activity.set(args.source.slice(0, 160), args.status);
    }
    const after = JSON.stringify({ ready: tab.ready, failed: tab.failed, name: tab.name, failure: tab.failure, activity: [...tab.activity] });
    if (before !== after) controller.publish();
  });
}
