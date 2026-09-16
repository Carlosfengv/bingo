/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: src/main/promptFolders.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as node_fs_promises from "node:fs/promises";
import * as node_path from "node:path";
import { getProjectAccessContext } from "./projectAccess";

var promptFolders = new Map();
var keyFor = (projectId, chatTabId) => JSON.stringify([projectId, chatTabId]);
/** Reject stale paths and files instead of silently starting a task without its folder. */
async function validatePromptFolders(value) {
  if (value === void 0) return [];
  if (!Array.isArray(value) || value.some(path => typeof path !== "string" || !(0, node_path.isAbsolute)(path))) throw new Error("Attached folders must have absolute local paths.");
  const paths = [...new Set(value.map(path => (0, node_path.resolve)(path)))];
  await Promise.all(paths.map(async path => {
    if (!(await (0, node_fs_promises.stat)(path).catch(() => null))?.isDirectory()) throw new Error(`Attached folder is unavailable: ${path}`);
  }));
  return paths;
}
/** Grants belong to one running request, isolated from other chats and saved settings. */
function registerPromptFolders(projectId, chatTabId, paths) {
  const key = keyFor(projectId, chatTabId);
  const grant = {
    paths: [...paths]
  };
  promptFolders.set(key, grant);
  return () => {
    if (promptFolders.get(key) === grant) promptFolders.delete(key);
  };
}
function getPromptFolders(projectId, chatTabId) {
  return chatTabId ? [...(promptFolders.get(keyFor(projectId, chatTabId))?.paths ?? [])] : [];
}
/** The same live scope supplies chat prompts, CLI directories, and MCP tools. */
function getAllowedLocalPaths(projectId, chatTabId) {
  const context = getProjectAccessContext(projectId);
  if (context.mode === "disabled") return [];
  return [...new Set([...context.allowedPaths, ...getPromptFolders(projectId, chatTabId)])];
}
/** Always revoke temporary access, including when the task fails or is cancelled. */
async function withPromptFolders(projectId, chatTabId, paths, run) {
  const clear = registerPromptFolders(projectId, chatTabId, paths);
  try {
    return await run();
  } finally {
    clear();
  }
}

export { getAllowedLocalPaths, getPromptFolders, validatePromptFolders, withPromptFolders };
