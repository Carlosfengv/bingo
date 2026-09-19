/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: src/preload/index.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as electron from "electron";

const INVOKE_CHANNELS = new Set([
  "bingo:open-presentation",
  "project-tabs:get", "project-tabs:open", "project-tabs:activate", "project-tabs:reload", "project-tabs:home", "project-tabs:close", "project-tabs:list",
  "agent:list", "agent:models", "ai_chat", "ai_chat_cancel", "ai_chat_title", "ai-config:get", "ai-config:set", "ai-config:test",
  "claude:check-status", "claude:list-connections", "claude:list-commands", "clear_all_caches",
  "get:mcp-info", "get_app_info", "get_pending_deep_link", "get_allowed_paths", "get_system_skills",
  "bingo:add-project", "bingo:builder-connect", "bingo:builder-disconnect", "bingo:builder-rebuild",
  "bingo:cancel-project-discovery", "bingo:choose-project-folder", "bingo:configuration-apply",
  "bingo:configuration-inspect", "bingo:configuration-prepare", "bingo:design-portability-inspect",
  "bingo:design-storage-enable", "bingo:design-storage-inspect", "bingo:design-storage-use-app",
  "bingo:discover-projects", "bingo:ensure-settings-storage", "bingo:environment-inspect",
  "bingo:environment-prepare", "bingo:get-project", "bingo:list-projects", "bingo:load-module",
  "bingo:save-feedback", "bingo:project-load-report",
  "bingo:prepare-project-discovery", "bingo:project-access-get", "bingo:project-access-set-mode",
  "bingo:project-access-set-paths",
  "bingo:locale-get", "bingo:locale-set",
  "bingo:register-project", "bingo:remove-project", "bingo:rename-project", "bingo:store",
  "mcp_external_auto_approve_file_edits", "mcp_tool_approval", "save_file", "set_allowed_paths",
  "set_project_id", "set_skill_overrides", "terminal:create", "pick_folder"
]);
const SEND_CHANNELS = new Set([
  "project-tabs:status", "project-tabs:prepared",
  "canvas_operation_persistence", "canvas_tool_result", "folder_access_response", "screenshot_result", "terminal:dispose", "terminal:input", "terminal:resize"
]);
const RECEIVE_CHANNELS = new Set([
  "project-tabs:changed", "project-tabs:prepare-close", "project-tabs:resume",
  "canvas_tool_request", "clear-caches-and-reload", "deep-link-project", "design_storage_changed",
  "file_changed", "bingo:builder-event", "bingo:project-discovery-progress", "mcp_external_tool_approval_needed",
  "mcp_external_tool_approval_resolved", "project_access_changed", "screenshot_request_mcp", "settings_changed",
  "bingo:locale-changed", "ai-config:changed",
  "terminal:data", "terminal:exit"
]);
const assertAllowed = (allowed, channel) => {
  if (!allowed.has(channel)) throw new Error(`IPC channel is not available: ${channel}`);
};

var bingoAPI = {
  getPathForFile: file => electron.webUtils.getPathForFile(file),
  invoke: (channel, args) => {
    assertAllowed(INVOKE_CHANNELS, channel);
    return electron.ipcRenderer.invoke(channel, args);
  },
  send: (channel, ...args) => {
    assertAllowed(SEND_CHANNELS, channel);
    electron.ipcRenderer.send(channel, ...args);
  },
  on: (channel, callback) => {
    if (!RECEIVE_CHANNELS.has(channel) && !/^chat-stream-\d+-[a-z0-9]+$/.test(channel)) {
      throw new Error(`IPC event is not available: ${channel}`);
    }
    const listener = (_event, ...args) => callback(...args);
    electron.ipcRenderer.on(channel, listener);
    return () => {
      electron.ipcRenderer.removeListener(channel, listener);
    };
  },
  getMcpInfo: () => electron.ipcRenderer.invoke("get:mcp-info")
};
if (process.contextIsolated) try {
  electron.contextBridge.exposeInMainWorld("api", bingoAPI);
} catch (error) {
  console.error(error);
} else {
  window.api = bingoAPI;
}
