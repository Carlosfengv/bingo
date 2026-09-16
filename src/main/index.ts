/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: src/main/index.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cancelAllSessions, cancelSession, cancelSessionsForProject, generateChatTitle, getClaudeStatus, handleChat } from "./aiChat";
import { resolvedUserDataPath } from "./appDataPath";
import { listClaudeConnections, listClaudeSlashCommands } from "./claudeContext";
import { abandonClaimsForProject, cancelApprovalsForProject, checkMcpHealth, ensureMcpServerReady, getMcpUrl, getSystemSkills, isExistingPathAllowed, mcpEvents, orphanCanvasOperationsForWebContents, resolveApproval, resolveFolderAccess, setExternalMcpAutoApproveFileEdits, setProjectAllowedPaths, setSkillOverrides, startMcpServer, stopMcpServer } from "./mcpServer";
import { getAllowedLocalPaths, validatePromptFolders, withPromptFolders } from "./promptFolders";
import { getProjectAllowedPaths } from "./projectAccess";
import { registerDebugBridge } from "./debugBridge";
import { handleDevToolsShortcut } from "./devToolsShortcut";
import { registerAiConfig } from "./aiConfig";
import { registerLocalCompiler } from "./localCompiler";
import { initializeLocalization, refreshSystemLocale, tNative } from "./localization";
import { saveFileLocally } from "./localSaveToCode";
import { chatStoreForRoot, registerLocalStore, resolveRegisteredProjectRoot } from "./localStore";
import { ChatRunPersistence, runPersistedChat } from "./chatRunPersistence";
import { disposeTerminalsForWindow, disposeTerminalsForRenderer, registerTerminalIPC } from "./terminal";
import { windowProjectMap, projectForWebContents, windowForWebContents, broadcastToEditors } from "./windowManager";
import { ProjectWindowTabs, registerProjectTabsIPC, readSavedProjectWindows, tabsForWindow, prepareProjectTabsForQuit, closeProjectTabsForRemoval } from "./projectTabs";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { MergeValidationError, applySourceEdit, resolveElementInSource } from "@bingo/compiler";
import * as crypto$1 from "crypto";
import * as electron from "electron";
import * as fs from "fs";
import * as path from "path";

process.on("uncaughtException", error => {
  console.error("[Electron] Uncaught exception:", error);
});
process.on("unhandledRejection", reason => {
  console.error("[Electron] Unhandled rejection:", reason);
});
function setupWebviewCookieShim(guestSession) {
  guestSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders;
    if (!headers) {
      callback({});
      return;
    }
    const setCookieKey = Object.keys(headers).find(k => k.toLowerCase() === "set-cookie");
    if (!setCookieKey) {
      callback({
        responseHeaders: headers
      });
      return;
    }
    const cookies = headers[setCookieKey];
    if (!cookies || !Array.isArray(cookies)) {
      callback({
        responseHeaders: headers
      });
      return;
    }
    headers[setCookieKey] = cookies.map(cookie => {
      let next = cookie;
      next = next.replace(/;\s*SameSite=(Lax|Strict|None)/gi, "");
      if (!/;\s*Secure/i.test(next)) next += "; Secure";
      next += "; SameSite=None";
      return next;
    });
    callback({
      responseHeaders: headers
    });
  });
}
function isEditorWebContents(contents) {
  return contents?.getType() === "window" || !!projectForWebContents(contents);
}
function mediaTypesOf(details) {
  return details?.mediaTypes ?? [];
}
function wantsCamera(permission, details) {
  if (permission === "camera") return true;
  if (permission !== "media") return false;
  const types = mediaTypesOf(details);
  return types.length === 0 || types.includes("video");
}
async function ensureMacCameraAccess() {
  if (process.platform !== "darwin") return true;
  const status = electron.systemPreferences.getMediaAccessStatus("camera");
  if (status === "granted") return true;
  if (status === "denied" || status === "restricted") return false;
  return electron.systemPreferences.askForMediaAccess("camera");
}
function setupMediaPermissions() {
  const ses = electron.session.defaultSession;
  ses.setPermissionCheckHandler((webContents, permission, _origin, details) => {
    if (permission !== "media" && permission !== "camera" && permission !== "microphone") return false;
    if (webContents && !isEditorWebContents(webContents)) return false;
    return wantsCamera(permission, details);
  });
  ses.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
    if (permission !== "media" && permission !== "camera" && permission !== "microphone") {
      callback(false);
      return;
    }
    if (!isEditorWebContents(webContents) || !wantsCamera(permission, details)) {
      callback(false);
      return;
    }
    callback(await ensureMacCameraAccess());
  });
}
var windows = new Set();
/** Chat session ids are private capabilities owned by the renderer that created them. */
var aiSessionOwners = new Map();
/** Maps BrowserWindow id → projectId to open on load (for deep links into new windows) */
/** Get the focused window, or fall back to the most recently created one */
function getFocusedWindow() {
  return electron.BrowserWindow.getFocusedWindow() ?? [...windows].pop() ?? null;
}
function windowOwnsProject(event, projectId) {
  return typeof projectId === "string" && projectForWebContents(event.sender) === projectId;
}
function openExternalHttp(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "http:" || url.protocol === "https:") void electron.shell.openExternal(url.href);
  } catch {}
}
function isRendererNavigation(rawUrl) {
  const rendererUrl = process.env["ELECTRON_RENDERER_URL"];
  if (!is.dev || !rendererUrl) return false;
  try { return new URL(rawUrl).origin === new URL(rendererUrl).origin; }
  catch { return false; }
}
function registerIPC() {
  mcpEvents.on("canvas_operation_late_confirmed", event => {
    const projectRoot = resolveRegisteredProjectRoot(event.projectId);
    if (!projectRoot || !event.chatTabId || !event.operation?.operationId) return;
    chatStoreForRoot(projectRoot).correctOperationFact(event.chatTabId, {
      operationId: event.operation.operationId,
      name: event.operation.toolName,
      state: event.operation.state,
      applied: event.operation.applied,
      resolvedCanvasId: event.operation.resolvedCanvasId ?? null,
      createdElementIds: event.operation.createdElementIds ?? [],
      error: event.error
    }).catch(error => console.error("[IPC] Could not persist late canvas result:", error));
  });
  electron.ipcMain.handle("get:mcp-info", async () => {
    await ensureMcpServerReady();
    return {
      url: getMcpUrl(),
      healthy: await checkMcpHealth()
    };
  });
  electron.ipcMain.handle("get_app_info", () => {
    const rawName = electron.app.getName();
    return {
      name: rawName.startsWith("@") ? "Bingo" : rawName,
      version: electron.app.getVersion(),
      isDevBuild: is.dev
    };
  });
  electron.ipcMain.handle("clear_all_caches", async () => {
    await electron.session.defaultSession.clearCache();
    await electron.session.defaultSession.clearStorageData({
      storages: ["cachestorage"]
    });
    return {
      success: true
    };
  });
  electron.ipcMain.handle("set_project_id", (event, args) => {
    // Editors cannot change their own ownership; legacy shell callers can open tabs.
    const win = windowForWebContents(event.sender);
    if (!win || win.webContents.id !== event.sender.id) throw new Error("Only the window shell can open projects.");
    const tabs = tabsForWindow(win);
    if (args?.projectId) tabs?.open(args.projectId); else tabs?.activate(null);
  });
  const authorizeSourcePath = async (event, filePath) => {
    const projectId = projectForWebContents(event.sender);
    if (projectId && (await isExistingPathAllowed(filePath, projectId))) return (0, path.resolve)(filePath);
    return null;
  };
  electron.ipcMain.handle("edit_source", async (event, args) => {
    const absPath = await authorizeSourcePath(event, args.filePath);
    if (!absPath) return {
      ok: false,
      reason: "not-allowed",
      detail: args.filePath
    };
    let source;
    try {
      source = await fs.promises.readFile(absPath, "utf8");
    } catch (e) {
      return {
        ok: false,
        reason: "read-error",
        detail: String(e?.message || e)
      };
    }
    const result = applySourceEdit(source, {
      line: args.line,
      column: args.column,
      tag: args.tag,
      className: args.className
    }, args.edit);
    if (!result.ok) {
      const lines = source.split("\n");
      const nearbyJsxLines = [];
      for (let i = Math.max(0, args.line - 5); i < Math.min(lines.length, args.line + 4); i++) if (/<[A-Za-z]/.test(lines[i])) nearbyJsxLines.push(i + 1);
      return {
        ...result,
        v: "edit2",
        requestedLine: args.line,
        lineText: (lines[args.line - 1] ?? "").trim().slice(0, 120),
        nearbyJsxLines
      };
    }
    try {
      await fs.promises.writeFile(absPath, result.source, "utf8");
    } catch (e) {
      return {
        ok: false,
        reason: "write-error",
        detail: String(e?.message || e)
      };
    }
    return {
      ok: true,
      before: result.before,
      after: result.after
    };
  });
  electron.ipcMain.handle("read_source", async (event, args) => {
    const absPath = await authorizeSourcePath(event, args.filePath);
    if (!absPath) return {
      ok: false,
      reason: "not-allowed",
      detail: args.filePath
    };
    try {
      return {
        ok: true,
        content: await fs.promises.readFile(absPath, "utf8")
      };
    } catch (e) {
      return {
        ok: false,
        reason: "read-error",
        detail: String(e?.message || e)
      };
    }
  });
  electron.ipcMain.handle("resolve_element", async (event, args) => {
    const absPath = await authorizeSourcePath(event, args.filePath);
    if (!absPath) return {
      ok: false,
      reason: "not-allowed",
      detail: args.filePath
    };
    let source;
    try {
      source = await fs.promises.readFile(absPath, "utf8");
    } catch (e) {
      return {
        ok: false,
        reason: "read-error",
        detail: String(e?.message || e)
      };
    }
    const loc = resolveElementInSource(source, {
      tag: args.tag,
      className: args.className,
      text: args.text ?? void 0
    });
    if (!loc) return {
      ok: false,
      reason: "not-found",
      detail: `<${args.tag}> in ${args.filePath}`
    };
    return {
      ok: true,
      filePath: args.filePath,
      line: loc.line,
      column: loc.column
    };
  });
  electron.ipcMain.handle("get_allowed_paths", event => {
    const projectId = projectForWebContents(event.sender);
    if (!projectId) return {
      paths: []
    };
    return {
      paths: getProjectAllowedPaths(projectId)
    };
  });
  electron.ipcMain.handle("set_allowed_paths", (event, args) => {
    if (!args?.projectId || !windowOwnsProject(event, args.projectId)) throw new Error("This window does not own the project.");
    const paths = Array.isArray(args.paths) ? args.paths : [];
    setProjectAllowedPaths(args.projectId, paths);
  });
  electron.ipcMain.handle("get_system_skills", async () => {
    return (await getSystemSkills()).map(({
      name,
      description,
      files
    }) => ({
      name,
      description,
      files
    }));
  });
  electron.ipcMain.handle("set_skill_overrides", (_event, args) => {
    setSkillOverrides(!!args?.enabled, args?.overrides && typeof args.overrides === "object" ? args.overrides : {}, typeof args?.gen === "number" ? args.gen : void 0);
  });
  electron.ipcMain.handle("pick_folder", async (event, args) => {
    const win = windowForWebContents(event.sender);
    if (!win) return {
      path: null
    };
    const result = await electron.dialog.showOpenDialog(win, {
      properties: ["openDirectory", "createDirectory"],
      title: args?.title || tNative("dialog.chooseAdditionalFolder")
    });
    if (result.canceled || result.filePaths.length === 0) return {
      path: null
    };
    return {
      path: result.filePaths[0]
    };
  });
  electron.ipcMain.handle("save_file", async (event, args) => {
    try {
      const { projectId, options } = args;
      if (!windowOwnsProject(event, projectId)) return { success: false, error: "This window does not own the project." };
      return await saveFileLocally(projectId, options);
    } catch (error) {
      console.error("[IPC] save_file error:", error);
      if (error instanceof MergeValidationError) return {
        success: false,
        error: "The AI couldn't apply this edit to the component. Try again, or undo and make a smaller change."
      };
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  electron.ipcMain.handle("ai_chat_title", (_, input) => generateChatTitle(input));
  electron.ipcMain.handle("ai_chat", async (event, args) => {
    const {
      projectId,
      messages,
      options,
      eventChannel
    } = args;
    if (!windowOwnsProject(event, projectId)) throw new Error("This window does not own the project.");
    if (typeof eventChannel !== "string" || !/^chat-stream-\d+-[a-z0-9]+$/.test(eventChannel)) {
      throw new Error("Invalid chat event channel.");
    }
    const senderContents = event.sender;
    const sessionId = typeof args.sessionId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(args.sessionId) ? args.sessionId : crypto$1.randomUUID();
    const existingOwner = aiSessionOwners.get(sessionId);
    if (existingOwner !== void 0 && existingOwner.webContentsId !== senderContents.id) throw new Error("This chat session belongs to another window.");
    const sessionState = existingOwner ?? { webContentsId: senderContents.id, projectId, cancelled: false };
    aiSessionOwners.set(sessionId, sessionState);
    console.log(`[IPC] ai_chat: projectId=${projectId}, messages=${messages?.length}, channel=${eventChannel}`);
    const emitToRenderer = evt => {
      if (senderContents.isDestroyed()) return;
      try {
        if (!senderContents.mainFrame || senderContents.mainFrame.detached) return;
        senderContents.send(eventChannel, evt);
      }
      catch (error) { console.warn("[IPC] Could not deliver chat event because its project page is unavailable:", error?.message || error); }
    };
    try {
      const folders = await validatePromptFolders(options?.promptFolders);
      const chatTabId = options?.chatTabId;
      if (typeof chatTabId !== "string" || !chatTabId) throw new Error("An active chat is required.");
      const requestId = typeof options?.requestId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(options.requestId) ? options.requestId : sessionId;
      const userMessage = options?.userMessage;
      if (!userMessage || userMessage.role !== "user" || typeof userMessage.id !== "string") throw new Error("A stable user message is required.");
      const projectRoot = resolveRegisteredProjectRoot(projectId);
      if (!projectRoot) throw new Error("This project is not registered with Bingo.");
      const chatStore = chatStoreForRoot(projectRoot);
      const started = await chatStore.startRun({
        chatId: chatTabId,
        chatTabId,
        requestId,
        userMessage,
        title: typeof options?.chatTitle === "string" ? options.chatTitle : void 0
      });
      emitToRenderer({
        type: "run_started",
        ...started,
        chatTabId
      });
      if (started.replay) {
        emitToRenderer(started.status === "running" ? {
          type: "error",
          message: "This request is already running. Its existing run was not started again."
        } : { type: "done", replay: true });
        return;
      }
      const persistedRun = new ChatRunPersistence(chatStore, started, emitToRenderer);
      const execution = await runPersistedChat(persistedRun, () => withPromptFolders(projectId, chatTabId, folders, () => handleChat({
          projectId,
          messages,
          options,
          emit: evt => persistedRun.accept(evt),
          sessionId,
          localPaths: getAllowedLocalPaths(projectId, chatTabId)
        })), () => sessionState.cancelled);
      if (execution.executionError) console.error("[IPC] ai_chat runtime error:", execution.executionError);
    } catch (error) {
      console.error("[IPC] ai_chat error:", error);
      emitToRenderer({
        type: "error",
        error: String(error)
      });
    } finally {
      if (aiSessionOwners.get(sessionId) === sessionState) aiSessionOwners.delete(sessionId);
    }
    return {
      success: true
    };
  });
  electron.ipcMain.handle("ai_chat_cancel", (event, args) => {
    const state = typeof args?.sessionId === "string" ? aiSessionOwners.get(args.sessionId) : null;
    if (state?.webContentsId === event.sender.id) {
      state.cancelled = true;
      cancelSession(args.sessionId);
    }
    return {
      success: true
    };
  });
  electron.ipcMain.handle("claude:check-status", () => getClaudeStatus());
  electron.ipcMain.handle("claude:list-connections", (_, args) => listClaudeConnections(typeof args?.cwd === "string" ? args.cwd : void 0));
  electron.ipcMain.handle("claude:list-commands", (_, args) => listClaudeSlashCommands(typeof args?.cwd === "string" ? args.cwd : void 0));
  electron.ipcMain.handle("mcp_tool_approval", (_, args) => {
    const {
      approvalId,
      approved
    } = args;
    resolveApproval(approvalId, approved);
    return {
      success: true
    };
  });
  electron.ipcMain.handle("folder_access_response", (_, args) => {
    const {
      requestId,
      granted,
      path: path$33
    } = args ?? {};
    if (typeof requestId !== "string") return {
      success: false
    };
    resolveFolderAccess(requestId, !!granted, typeof path$33 === "string" ? path$33 : void 0);
    return {
      success: true
    };
  });
  electron.ipcMain.handle("mcp_external_auto_approve_file_edits", (_, args) => {
    const {
      projectId,
      enabled
    } = args;
    if (typeof projectId === "string") setExternalMcpAutoApproveFileEdits(projectId, !!enabled);
    return {
      success: true
    };
  });
  registerTerminalIPC();
  registerLocalStore({
    prepareProjectRemoval: async projectId => {
      // Chat runs retain persistence objects until finalization. Do not delete
      // their files while a run can still checkpoint or finish in the background.
      const assertIdle = () => {
        if ([...aiSessionOwners.values()].some(state => state.projectId === projectId)) {
          throw new Error(tNative("dialog.removeProjectBusy"));
        }
      };
      assertIdle();
      if (!(await closeProjectTabsForRemoval(projectId))) return false;
      assertIdle();
      return true;
    },
  });
  registerLocalCompiler(electron.ipcMain);
  registerDebugBridge();
  registerAiConfig(electron.ipcMain);
}
/** A window owns the shared titlebar and independently retained project views. */
function createWindow(savedTabs = undefined) {
  const existing = electron.BrowserWindow.getFocusedWindow();
  let x;
  let y;
  if (existing) {
    const [ex, ey] = existing.getPosition();
    x = ex + 30;
    y = ey + 30;
  }
  const win = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    ...(x !== void 0 && y !== void 0 ? {
      x,
      y
    } : {}),
    show: false,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: {
      x: 12,
      y: 13
    },
    webPreferences: {
      preload: (0, path.join)(__dirname, "../preload/index.js"),
      sandbox: false,
      webSecurity: true,
      webviewTag: true,
      // The shell stays responsive while project views cover its content area.
      backgroundThrottling: false
    }
  });
  windows.add(win);
  const tabs = new ProjectWindowTabs(win, {
    preload: (0, path.join)(__dirname, "../preload/index.js"),
    load: (contents, projectId) => {
      if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        const url = new URL(process.env["ELECTRON_RENDERER_URL"]);
        url.searchParams.set("projectTab", projectId);
        return contents.loadURL(url.href);
      }
      return contents.loadFile((0, path.join)(__dirname, "../renderer/index.html"), { query: { projectTab: projectId } });
    },
    configure: contents => {
      contents.on("will-navigate", (event, url) => {
        if (isRendererNavigation(url)) return;
        event.preventDefault();
      });
      contents.setWindowOpenHandler(details => { openExternalHttp(details.url); return { action: "deny" }; });
      contents.on("before-input-event", (event, input) => handleDevToolsShortcut(event, input, contents));
      contents.on("console-message", (_event, level, message, line, sourceId) => {
        if (level >= 2) console.error(`[ProjectRenderer] ${message} (${sourceId}:${line})`);
      });
    },
    stop: (projectId, contentsId) => {
      for (const state of aiSessionOwners.values()) if (state.projectId === projectId) state.cancelled = true;
      cancelSessionsForProject(projectId);
      cancelApprovalsForProject(projectId);
      orphanCanvasOperationsForWebContents(contentsId);
      abandonClaimsForProject(projectId);
      disposeTerminalsForRenderer(contentsId);
    },
  }, savedTabs);
  win.webContents.on("before-input-event", (event, input) => tabs.shortcut(event, input));
  win.on("closed", () => {
    windows.delete(win);
    windowProjectMap.delete(win.id);
    disposeTerminalsForWindow(win.id);
  });
  win.webContents.on("did-start-navigation", (_e, _url, _isInPlace, isMainFrame) => {
    if (!isMainFrame) return;
    // Reloading the shell leaves project renderers and their tasks intact.
  });
  let devToolsAutoOpened = false;
  win.on("ready-to-show", () => {
    if (win.isDestroyed()) return;
    win.show();
    if (is.dev && !devToolsAutoOpened) {
      devToolsAutoOpened = true;
      win.webContents.openDevTools({ mode: "detach" });
    }
  });
  win.webContents.on("before-input-event", (event, input) => {
    if (win.isDestroyed()) return;
    if (handleDevToolsShortcut(event, input, win.webContents)) return;
    if (input.meta && input.alt && input.key.toLowerCase() === "i") win.webContents.toggleDevTools();
    if (input.meta && !input.shift && input.key.toLowerCase() === "r") win.webContents.reload();
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (isRendererNavigation(url)) return;
    event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(details => {
    openExternalHttp(details.url);
    return {
      action: "deny"
    };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) win.loadURL(process.env["ELECTRON_RENDERER_URL"]);else win.loadFile((0, path.join)(__dirname, "../renderer/index.html"));
  return win;
}
function setupMenu() {
  const isMac = process.platform === "darwin";
  const template = [...(isMac ? [{
    label: electron.app.name,
    submenu: [{
      role: "about",
      label: tNative("menu.about")
    }, {
      type: "separator"
    }, {
      role: "services",
      label: tNative("menu.services")
    }, {
      type: "separator"
    }, {
      role: "hide",
      label: tNative("menu.hide")
    }, {
      role: "hideOthers",
      label: tNative("menu.hideOthers")
    }, {
      role: "unhide",
      label: tNative("menu.showAll")
    }, {
      type: "separator"
    }, {
      role: "quit",
      label: tNative("menu.quit")
    }]
  }] : []), {
    label: tNative("menu.file"),
    submenu: [{
      label: tNative("menu.newWindow"),
      accelerator: "CmdOrCtrl+Shift+N",
      click: () => createWindow()
    }, {
      label: tNative("tabs.newTab"),
      accelerator: "CmdOrCtrl+T",
      click: () => tabsForWindow(getFocusedWindow())?.activate(null)
    }, {
      label: tNative("tabs.closeTab"),
      accelerator: "CmdOrCtrl+W",
      click: () => {
        const win = getFocusedWindow();
        const tabs = tabsForWindow(win);
        if (tabs?.activeId) void tabs.close(tabs.activeId); else win?.close();
      }
    }, {
      type: "separator"
    }, isMac ? {
      role: "close",
      accelerator: "CmdOrCtrl+Shift+W",
      label: tNative("menu.closeWindow")
    } : {
      role: "quit",
      label: tNative("menu.quit")
    }]
  }, {
    label: tNative("menu.edit"),
    submenu: [{ role: "undo", label: tNative("menu.undo") },
      { role: "redo", label: tNative("menu.redo") },
      { type: "separator" },
      { role: "cut", label: tNative("menu.cut") },
      { role: "copy", label: tNative("menu.copy") },
      { role: "paste", label: tNative("menu.paste") },
      ...(isMac ? [{ role: "pasteAndMatchStyle", label: tNative("menu.pasteAndMatchStyle") }] : []),
      { role: "delete", label: tNative("menu.delete") },
      { role: "selectAll", label: tNative("menu.selectAll") }]
  }, {
    label: tNative("menu.view"),
    submenu: [{
      role: "reload",
      label: tNative("menu.reload")
    }, {
      role: "forceReload",
      label: tNative("menu.forceReload"),
      accelerator: "CmdOrCtrl+Alt+R"
    }, {
      role: "toggleDevTools",
      label: tNative("menu.toggleDevTools"),
      accelerator: "F12"
    }, {
      type: "separator"
    }, {
      role: "resetZoom",
      label: tNative("menu.resetZoom"),
      accelerator: "CmdOrCtrl+Alt+0"
    }, {
      role: "zoomIn",
      label: tNative("menu.zoomIn"),
      accelerator: "CmdOrCtrl+Alt+Plus"
    }, {
      role: "zoomOut",
      label: tNative("menu.zoomOut"),
      accelerator: "CmdOrCtrl+Alt+-"
    }, {
      type: "separator"
    }, {
      role: "togglefullscreen",
      label: tNative("menu.toggleFullScreen")
    }]
  }, {
    label: tNative("menu.window"),
    submenu: [{ role: "minimize", label: tNative("menu.minimize") },
      { role: "close", label: tNative("menu.closeWindow"), accelerator: "CmdOrCtrl+Shift+W" },
      ...(isMac ? [{ type: "separator" }, { role: "front", label: tNative("menu.bringAllToFront") }] : [])]
  }];
  electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(template));
}
async function launchExtensionBackgroundWorkers() {
  const ses = electron.session.defaultSession;
  await Promise.all(ses.getAllExtensions().map(async extension => {
    const manifest = extension.manifest;
    if (manifest.manifest_version === 3 && manifest.background?.service_worker) try {
      await ses.serviceWorkers.startWorkerForScope(extension.url);
    } catch (err) {
      console.warn("[DevTools] Failed to start extension worker:", err);
    }
  }));
}
async function installReactDevTools() {
  if (!is.dev) return;
  try {
    const {
      installExtension,
      REACT_DEVELOPER_TOOLS
    } = await import("electron-devtools-installer");
    const ext = await installExtension(REACT_DEVELOPER_TOOLS, {
      loadExtensionOptions: {
        allowFileAccess: true
      }
    });
    console.log(`[DevTools] Installed ${ext.name}`);
    await launchExtensionBackgroundWorkers();
  } catch (err) {
    console.error("[DevTools] Failed to install React DevTools:", err);
  }
}
// Keep production and development data under Bingo-owned roots. An explicit
// command-line directory is used by isolated integration tests.
const requestedUserDataRoot = electron.app.commandLine.getSwitchValue("user-data-dir").trim();
electron.app.setPath("userData", resolvedUserDataPath(electron.app.getPath("appData"), is.dev, requestedUserDataRoot));
if (process.platform === "linux") {
  const isKde = (process.env["XDG_CURRENT_DESKTOP"] || "").toLowerCase().includes("kde");
  electron.app.commandLine.appendSwitch("password-store", isKde ? "kwallet6" : "gnome-libsecret");
}
const hasSingleInstanceLock = electron.app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) electron.app.quit();
electron.app.on("second-instance", () => {
  const win = getFocusedWindow();
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
electron.app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) return;
  console.log(`[Electron] Process started. PID: ${process.pid}`);
  electronApp.setAppUserModelId(is.dev ? "com.bingo.desktop.dev" : "com.bingo.desktop");
  if (is.dev && process.platform === "darwin") electron.app.dock?.setIcon((0, path.join)(__dirname, "../../build/icon.png"));
  await installReactDevTools();
  electron.app.on("browser-window-created", (_, window) => {
    window.webContents.on("console-message", (_e, level, message, line, sourceId) => {
      if (level >= 2) console.error(`[Renderer] ${message}  (${sourceId}:${line})`);
    });
    optimizer.watchWindowShortcuts(window);
  });
  electron.app.on("web-contents-created", (_event, contents) => {
    if (contents.getType() !== "webview") return;
    setupWebviewCookieShim(contents.session);
    contents.setWindowOpenHandler(details => {
      openExternalHttp(details.url);
      return {
        action: "deny"
      };
    });
    contents.on("did-fail-load", (_e, code, desc, validatedURL) => {
      console.error(`[Webview] load failed ${code} ${desc} — ${validatedURL}`);
    });
  });
  electron.app.on("certificate-error", (event, _webContents, url, _error, _cert, callback) => {
    try {
      const {
        hostname
      } = new URL(url);
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
        event.preventDefault();
        callback(true);
        return;
      }
    } catch {}
    callback(false);
  });
  setupMediaPermissions();
  await initializeLocalization({ onLocaleChanged: setupMenu });
  await startMcpServer().catch(err => console.error("[MCP] Failed to start:", err));
  mcpEvents.on("file_changed", event => {
    broadcastToEditors("file_changed", event);
  });
  mcpEvents.on("settings_changed", event => {
    broadcastToEditors("settings_changed", event);
  });
  registerIPC();
  registerProjectTabsIPC();
  setupMenu();
  const savedWindows = readSavedProjectWindows();
  if (savedWindows.length) for (const saved of savedWindows) createWindow(saved);
  else createWindow();
  electron.app.on("activate", () => {
    void refreshSystemLocale();
    if (windows.size === 0) {
      const saved = readSavedProjectWindows();
      if (saved.length) for (const entry of saved) createWindow(entry);
      else createWindow();
    }
  });
});
let quitPrepared = false;
let quitPreparing = false;
electron.app.on("before-quit", event => {
  if (!quitPrepared) {
    event.preventDefault();
    if (!quitPreparing) {
      quitPreparing = true;
      void prepareProjectTabsForQuit().then(ok => {
        quitPreparing = false;
        if (ok) { quitPrepared = true; electron.app.quit(); }
      }).catch(error => { quitPreparing = false; console.error(error); });
    }
    return;
  }
  cancelAllSessions();
  stopMcpServer();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
