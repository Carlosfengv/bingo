import * as electron from "electron";

/** Active project per native window. Ownership belongs to the project renderer. */
const windowProjectMap = new Map();
const projectRenderers = new Map();

function usableWebContents(webContents) {
  try {
    return !webContents.isDestroyed() && (!webContents.mainFrame || !webContents.mainFrame.detached);
  } catch {
    return false;
  }
}

function registerProjectRenderer(win, webContents, projectId, activate) {
  projectRenderers.set(webContents.id, { win, webContents, projectId, activate });
}
function unregisterProjectRenderer(webContentsId) {
  projectRenderers.delete(webContentsId);
}
function projectForWebContents(contents) {
  // Background renderers keep their own permissions. The shell never inherits
  // permission to read or write whichever project happens to be active.
  return projectRenderers.get(contents?.id)?.projectId ?? null;
}
function windowForWebContents(contents) {
  return projectRenderers.get(contents?.id)?.win ?? electron.BrowserWindow?.fromWebContents(contents) ?? null;
}
/** Project-scoped target compatible with the existing MCP routing interface. */
function findWindowForProject(projectId) {
  for (const entry of projectRenderers.values()) {
    const { win, webContents } = entry;
    if (entry.projectId !== projectId || win.isDestroyed() || !usableWebContents(webContents)) continue;
    return {
      id: win.id, webContents,
      isDestroyed: () => win.isDestroyed() || webContents.isDestroyed(),
      isMinimized: () => win.isMinimized(),
      restore: () => win.restore(),
      show: () => win.show(),
      focus: () => { entry.activate(); win.focus(); webContents.focus(); },
    };
  }
  return null;
}
function getOpenProjectIds() {
  return [...new Set([...projectRenderers.values()]
    .filter(({ win, webContents }) => !win.isDestroyed() && usableWebContents(webContents))
    .map(entry => entry.projectId))];
}
function getFocusedProjectId() {
  const win = electron.BrowserWindow?.getFocusedWindow();
  return win && !win.isDestroyed() ? windowProjectMap.get(win.id) ?? null : null;
}
function broadcastToEditors(channel, payload) {
  if (typeof payload?.projectId === "string") {
    for (const entry of projectRenderers.values()) {
      if (entry.projectId === payload.projectId && usableWebContents(entry.webContents)) entry.webContents.send(channel, payload);
    }
    return;
  }
  const contents = new Set([
    ...(electron.BrowserWindow?.getAllWindows?.() ?? []).filter(win => !win.isDestroyed()).map(win => win.webContents),
    ...[...projectRenderers.values()].map(entry => entry.webContents),
  ]);
  for (const target of contents) if (usableWebContents(target)) target.send(channel, payload);
}
export { windowProjectMap, registerProjectRenderer, unregisterProjectRenderer,
  projectForWebContents, windowForWebContents, findWindowForProject,
  getOpenProjectIds, getFocusedProjectId, broadcastToEditors };
