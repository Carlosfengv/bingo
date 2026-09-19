/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: src/main/mcpServer.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { localApiFetch } from "./localApiFetch";
import { getCreatedCanvasElementIds } from "./canvasToolResult";
import { CanvasOperationRegistry } from "./canvasOperationRegistry";
import { toPngBase64 } from "./captureImage";
import { recordDiagnosticEvent } from "./diagnosticsStore";
import { getAllowedLocalPaths } from "./promptFolders";
import { AgentResultError, RESULT_MAX_BYTES, agentResultErrorResult, classifyToolResultPath, isAgentToolResultPath, readOwnedToolResult, revokeAllResultScopes, revokeResultScopesForRun, validateResultRange } from "./agentToolResultAccess";
import { getProjectAccessContext, getProjectAllowedPaths, grantProjectPath, setProjectAllowedPaths } from "./projectAccess";
import { findWindowForProject, getFocusedProjectId, getOpenProjectIds } from "./windowManager";
import { CANVAS_OPERATION_PROTOCOL_VERSION, buildMcpServerInstructions, ensureV2, extractPartialCanvasDrawArgs, extractPartialMcpToolName, formatComponentSearchLine, getRootIds, hashAllElementSubtreesFrom, inspectLocalCopyBuffer, isCanvasDrawToolName, isLoadableIconLibrary, jsxContainsTruncationStub, loadSystemSkills, normalizeProjectCopyFileArgs, scanProject } from "@bingo/compiler";
import { systemSkillsPath } from "./systemSkillsPath";
import { collectProjectTheme, formatProjectThemeSummary } from "./projectThemeSummary";
import { extractComponentPropMetadata } from "./componentPropMetadata";
import { componentIndexFor, buildIssuesFor } from "./localCompiler";
import { findComponentCandidates } from "@bingo/compiler";
import * as child_process from "child_process";
import * as crypto$1 from "crypto";
import * as electron from "electron";
import * as events from "events";
import * as fs_promises from "fs/promises";
import * as http from "http";
import * as path from "path";
import * as util from "util";

/**
* Local HTTP MCP server for project file access.
*
* Runs inside the Electron main process on a random port (127.0.0.1 only).
* Claude CLI (and other MCP clients like Cursor) connect via:
*   External: { "type": "http", "url": "http://127.0.0.1:PORT/mcp" } + project_list / project_pick
*   In-app chat: http://127.0.0.1:PORT/mcp/PROJECT_ID (project bound from URL)
*
* All file operations proxy to the Bingo API using the auth cookie
* from the main process — no credentials written to disk.
*/
var execFileAsync$3 = (0, util.promisify)(child_process.execFile);
var server$1 = null;
var mcpPort = 0;
var mcpStartPromise = null;
var mcpMaintenanceTimer = null;
/** Emits tool activity events so the chat UI can show real-time MCP tool calls */
var mcpEvents = new events.EventEmitter();
/** claim_id → metadata (for lock routing, chat UI association, and TTL) */
var CLAIM_LOCK_TTL_MS = 3e5;
var CLAIM_LOCK_PURGE_INTERVAL_MS = 3e4;
var claimRegistry = new Map();
/**
* Claim IDs removed from claimRegistry that may still hold renderer overlay locks.
* Survives interval GC so the next canvas_claim can pass unlock_claim_ids even after
* the registry entries are gone.
*/
var pendingRendererUnlocks = new Map();
/** Active Bingo chat panel sessions per project (for MCP event routing). */
var activeChatTabSessions = new Map();
var canvasOperationRegistry = new CanvasOperationRegistry();
var CANVAS_WRITE_OPERATIONS = new Set(["add_to_canvas", "update_element", "edit_element", "insert_element", "delete_element"]);
var CANVAS_PUBLIC_TOOL_NAMES = {
  add_to_canvas: "canvas_add",
  update_element: "canvas_update",
  edit_element: "canvas_edit",
  insert_element: "canvas_insert",
  delete_element: "canvas_delete"
};
var CANVAS_PUBLIC_WRITE_TOOLS = new Set(Object.values(CANVAS_PUBLIC_TOOL_NAMES));
var CANVAS_WRITE_WAIT_MS = 6e4;
var canvasResultListenerInstalled = false;

function orphanCanvasOperationsForWebContents(webContentsId) {
  const orphaned = canvasOperationRegistry.orphanWebContents(webContentsId);
  for (const entry of orphaned) {
    recordDiagnosticEvent({
      source: "mcpServer",
      eventName: "canvas.operation.renderer_orphaned",
      level: "warn",
      projectId: entry.projectId,
      operationId: entry.operationId,
      durationMs: entry.durationMs,
      payload: { requestId: entry.requestId, toolName: entry.toolName }
    });
  }
  return orphaned;
}

function ensureCanvasResultListener() {
  if (canvasResultListenerInstalled) return;
  canvasResultListenerInstalled = true;
  electron.ipcMain.on("canvas_operation_persistence", (event, update) => {
    if (!update || typeof update.projectId !== "string" || typeof update.operationId !== "string") return;
    const persistence = canvasOperationRegistry.markPersistence(update.projectId, update.operationId, event.sender.id, update);
    if (persistence.kind !== "updated") return;
    recordDiagnosticEvent({
      source: "mcpServer",
      eventName: `canvas.persistence.${persistence.entry.persistenceState}`,
      level: persistence.entry.persistenceState === "saved" ? "info" : "warn",
      projectId: persistence.entry.projectId,
      operationId: persistence.entry.operationId,
      payload: {
        resolvedCanvasId: persistence.entry.resolvedCanvasId,
        committedRevision: persistence.entry.committedRevision,
        stateVersion: persistence.entry.stateVersion,
      },
    });
  });
  electron.ipcMain.on("canvas_tool_result", (event, response) => {
    if (!response || typeof response.requestId !== "string") return;
    const confirmation = canvasOperationRegistry.confirmByRequest(response.requestId, event.sender.id, response);
    if (confirmation.kind !== "confirmed") return;
    const recovery = confirmation.result?.structuredContent?.recovery;
    if (recovery?.schemaVersion === 1 && Array.isArray(recovery.attempts)) {
      for (const attempt of recovery.attempts.slice(0, 1)) {
        if (attempt?.ruleId !== "jsx.wrap-adjacent-roots" || attempt.ruleVersion !== 1) continue;
        const recovered = recovery.status === "recovered" && confirmation.entry.applied === true;
        const details = {
          source: "mcpServer", projectId: confirmation.entry.projectId, operationId: confirmation.entry.operationId,
          payload: { ruleId: attempt.ruleId, ruleVersion: attempt.ruleVersion, stage: recovery.stage, outcome: recovered ? "recovered" : "failed" }
        };
        recordDiagnosticEvent({ ...details, eventName: "recovery.attempted" });
        recordDiagnosticEvent({ ...details, eventName: recovered ? "recovery.succeeded" : "recovery.failed", level: recovered ? "info" : "warn" });
      }
    }
    recordDiagnosticEvent({
      source: "mcpServer",
      eventName: "canvas.operation.result_confirmed",
      projectId: confirmation.entry.projectId,
      operationId: confirmation.entry.operationId,
      durationMs: confirmation.entry.durationMs,
      payload: {
        requestId: confirmation.entry.requestId,
        toolName: confirmation.entry.toolName,
        resolvedCanvasId: confirmation.entry.resolvedCanvasId,
        state: confirmation.entry.state,
        stateVersion: confirmation.entry.stateVersion,
        applied: confirmation.entry.applied
      }
    });
    recordDiagnosticEvent({
      source: "mcpServer",
      eventName: confirmation.entry.applied === true ? "canvas.operation.committed" : "canvas.operation.rejected",
      level: confirmation.entry.applied === true ? "info" : "warn",
      projectId: confirmation.entry.projectId,
      operationId: confirmation.entry.operationId,
      durationMs: confirmation.entry.durationMs,
      payload: {
        requestId: confirmation.entry.requestId,
        toolName: confirmation.entry.toolName,
        resolvedCanvasId: confirmation.entry.resolvedCanvasId,
        createdElementCount: confirmation.entry.createdElementIds.length,
        errorCode: confirmation.entry.errorCode
      }
    });
    if (confirmation.wasUnconfirmed) mcpEvents.emit("tool_result", {
      projectId: confirmation.entry.projectId,
      chatTabId: confirmation.entry.chatTabId,
      name: confirmation.entry.toolName,
      args: confirmation.displayArgs,
      success: confirmation.entry.applied === true,
      error: confirmation.entry.applied === true ? void 0 : confirmation.result?.content?.find(block => block.type === "text")?.text,
      createdElementIds: confirmation.entry.createdElementIds,
      operation: confirmation.result?.structuredContent?.operation,
      lateConfirmation: true
    });
    if (confirmation.wasUnconfirmed && confirmation.entry.chatTabId) mcpEvents.emit("canvas_operation_late_confirmed", {
      projectId: confirmation.entry.projectId,
      chatTabId: confirmation.entry.chatTabId,
      operation: confirmation.result?.structuredContent?.operation,
      error: confirmation.entry.applied === true ? null : confirmation.result?.content?.find(block => block.type === "text")?.text ?? null
    });
    if (confirmation.entry.claimNew && confirmation.entry.applied === true && confirmation.entry.claimId && confirmation.entry.createdElementIds[0]) {
      registerClaim(confirmation.entry.claimId, {
        projectId: confirmation.entry.projectId,
        chatTabId: confirmation.entry.chatTabId,
        elementId: confirmation.entry.createdElementIds[0]
      });
      markClaimMutated(confirmation.entry.claimId);
    }
  });
}
var activeChatRuns = new Map();
function chatRunSetKey(projectId, chatTabId) {
  return `${projectId}:${chatTabId}`;
}
function isActiveChatRun(projectId, chatTabId, chatRunId) {
  return !!chatRunId && activeChatRuns.get(chatRunSetKey(projectId, chatTabId))?.has(chatRunId) === true;
}
/** Register one Bingo chat run for MCP event routing and canvas lock UI. */
function registerMcpChatSession(projectId, chatTabId, chatRunId) {
  if (!chatRunId) throw new Error("registerMcpChatSession requires a chat run id");
  let sessions = activeChatTabSessions.get(projectId);
  if (!sessions) {
    sessions = new Set();
    activeChatTabSessions.set(projectId, sessions);
  }
  sessions.add(chatTabId);
  const runKey = chatRunSetKey(projectId, chatTabId);
  let runs = activeChatRuns.get(runKey);
  if (!runs) {
    runs = new Set();
    activeChatRuns.set(runKey, runs);
  }
  runs.add(chatRunId);
  let registered = true;
  return () => {
    if (!registered) return;
    registered = false;
    revokeResultScopesForRun(chatRunId);
    runs.delete(chatRunId);
    clearReaderKeyedState(designSkillRunKey(projectId, chatTabId, chatRunId));
    if (runs.size > 0) return;
    if (activeChatRuns.get(runKey) !== runs) return;
    activeChatRuns.delete(runKey);
    sessions.delete(chatTabId);
    if (sessions.size === 0) activeChatTabSessions.delete(projectId);
    clearReaderKeyedState(designSkillChatKey(projectId, chatTabId));
  };
}
/** Per-claim screenshot verify state (mutations require a post-edit screenshot before release). */
var claimVerifyState = new Map();
function registerClaim(claimId, meta) {
  claimRegistry.set(claimId, {
    ...meta,
    expiresAt: Date.now() + CLAIM_LOCK_TTL_MS
  });
  claimVerifyState.set(claimId, {
    mutated: false,
    verified: false,
    rootElementId: meta.elementId
  });
}
/** Push a live claim's idle deadline out. Called on every op that names it. */
function touchClaim(claimId) {
  const meta = claimRegistry.get(claimId);
  if (meta) meta.expiresAt = Date.now() + CLAIM_LOCK_TTL_MS;
}
function markClaimMutated(claimId) {
  if (!claimId) return;
  const state = claimVerifyState.get(claimId) ?? {
    mutated: false,
    verified: false
  };
  state.mutated = true;
  state.verified = false;
  claimVerifyState.set(claimId, state);
}
function markClaimsVerified(claimIds) {
  for (const claimId of claimIds) {
    const state = claimVerifyState.get(claimId);
    if (state?.mutated) {
      state.verified = true;
      claimVerifyState.set(claimId, state);
    }
  }
}
function clearClaimVerify(claimId) {
  claimVerifyState.delete(claimId);
  claimRegistry.delete(claimId);
}
function notePendingRendererUnlock(projectId, claimId) {
  let set = pendingRendererUnlocks.get(projectId);
  if (!set) {
    set = new Set();
    pendingRendererUnlocks.set(projectId, set);
  }
  set.add(claimId);
}
function drainPendingRendererUnlocks(projectId) {
  const set = pendingRendererUnlocks.get(projectId);
  if (!set || set.size === 0) return [];
  const ids = [...set];
  pendingRendererUnlocks.delete(projectId);
  return ids;
}
function forgetPendingRendererUnlocks(projectId, claimIds) {
  const set = pendingRendererUnlocks.get(projectId);
  if (!set) return;
  for (const claimId of claimIds) set.delete(claimId);
  if (set.size === 0) pendingRendererUnlocks.delete(projectId);
}
/** Drop verify/registry state when a claim is abandoned (TTL, release, chat stream end). */
function abandonClaims(claimIds) {
  for (const claimId of claimIds) {
    if (typeof claimId !== "string" || !claimId) continue;
    const meta = claimRegistry.get(claimId);
    if (meta) notePendingRendererUnlock(meta.projectId, claimId);
    clearClaimVerify(claimId);
  }
}
/** Best-effort: clear renderer overlay locks for abandoned claim_ids. */
function notifyRendererUnlockClaims(projectId, claimIds) {
  if (claimIds.length === 0) return Promise.resolve();
  return sendCanvasOperation(projectId, "unlock_claims", {
    claim_ids: claimIds
  }).then(result => {
    if (!result?.isError) forgetPendingRendererUnlocks(projectId, claimIds);
  });
}
/** Abandon registry claims for an in-app chat tab. Renderer onStreamEnd clears overlay locks. */
function abandonClaimsForChatTab(projectId, chatTabId) {
  const abandoned = [];
  for (const [claimId, meta] of claimRegistry) if (meta.projectId === projectId && meta.chatTabId === chatTabId) abandoned.push(claimId);
  abandonClaims(abandoned);
}
/** Drop every live claim on a project and return the ids so the overlay can unlock. */
function abandonClaimsForProject(projectId) {
  const abandoned = [];
  for (const [claimId, meta] of claimRegistry) if (meta.projectId === projectId) abandoned.push(claimId);
  abandonClaims(abandoned);
  return abandoned;
}
function expiredOrUnknownClaimResult(claimId) {
  return {
    isError: true,
    content: [{
      type: "text",
      text: `claim_id ${claimId} is expired or unknown. Call canvas_claim again.`
    }]
  };
}
/**
* Re-send unlock notices the renderer never acknowledged. `notifyRendererUnlockClaims`
* only clears an id once the IPC round-trip succeeds; without this retry a single
* dropped message left the overlay claimed forever, since the ids were otherwise only
* drained by the *next* canvas_claim — which a finished agent never makes.
*/
function retryPendingRendererUnlocks() {
  for (const [projectId, ids] of [...pendingRendererUnlocks]) {
    if (!resolveProjectWindow(projectId)) {
      pendingRendererUnlocks.delete(projectId);
      continue;
    }
    if (ids.size > 0) notifyRendererUnlockClaims(projectId, [...ids]);
  }
}
/** Drop expired claims from the registry. Optionally scoped to one project. Returns abandoned ids. */
function takeExpiredClaims(projectId) {
  const now = Date.now();
  const expiredByProject = new Map();
  for (const [claimId, meta] of claimRegistry) {
    if (projectId !== void 0 && meta.projectId !== projectId) continue;
    if (meta.expiresAt <= now) {
      let list = expiredByProject.get(meta.projectId);
      if (!list) {
        list = [];
        expiredByProject.set(meta.projectId, list);
      }
      list.push(claimId);
    }
  }
  const expired = [];
  for (const ids of expiredByProject.values()) {
    abandonClaims(ids);
    expired.push(...ids);
  }
  return expired;
}
/** Return an error if claim_id is missing from the registry or past TTL. */
function assertLiveClaim(projectId, claimId) {
  const meta = claimRegistry.get(claimId);
  if (!meta || meta.projectId !== projectId) return expiredOrUnknownClaimResult(claimId);
  if (meta.expiresAt <= Date.now()) {
    abandonClaims([claimId]);
    notifyRendererUnlockClaims(projectId, [claimId]);
    return expiredOrUnknownClaimResult(claimId);
  }
  touchClaim(claimId);
  return null;
}
async function claimHasLocks(projectId, claimId) {
  try {
    const text = (await sendCanvasOperation(projectId, "claim_has_locks", {
      claim_id: claimId
    }))?.content?.find(c => c.type === "text")?.text || "{}";
    return !!JSON.parse(text).has_locks;
  } catch {
    return false;
  }
}
async function resolveClaimsCoveringElement(projectId, elementId) {
  if (!elementId) return [];
  try {
    const text = (await sendCanvasOperation(projectId, "claims_covering_element", {
      element_id: elementId
    }))?.content?.find(c => c.type === "text")?.text || "{}";
    const parsed = JSON.parse(text);
    return Array.isArray(parsed.claim_ids) ? parsed.claim_ids.filter(x => typeof x === "string") : [];
  } catch {
    const ids = [];
    for (const [claimId, meta] of claimRegistry) if (meta.projectId === projectId && meta.elementId === elementId) ids.push(claimId);
    return ids;
  }
}
function parseClaimIdFromResult(result) {
  return (result?.content?.find(c => c.type === "text")?.text || "").match(/^claim_id:\s*(\S+)/m)?.[1];
}
function resolveChatTabId(projectId, claimId) {
  if (claimId) {
    const claim = claimRegistry.get(claimId);
    if (claim?.projectId === projectId && claim.chatTabId) return claim.chatTabId;
  }
  const sessions = activeChatTabSessions.get(projectId);
  if (sessions?.size === 1) return [...sessions][0];
}
function withChatTabId(args, chatTabId) {
  const claimId = typeof args.claim_id === "string" ? args.claim_id : void 0;
  const resolvedChatTabId = chatTabId ?? (claimId ? claimRegistry.get(claimId)?.chatTabId : void 0);
  return resolvedChatTabId ? {
    ...args,
    chat_tab_id: resolvedChatTabId
  } : args;
}
function withCanvasOperationSource(args, sessionId) {
  return sessionId ? {
    ...args,
    __mcp_session_id: sessionId
  } : args;
}
var DESIGN_SKILL_NAME = "bingo-design";
var DESIGN_SKILL_REQUIRED_TOOLS = new Set(["canvas_add", "canvas_update", "canvas_edit", "canvas_insert", "canvas_create_import_scaffold"]);
var DESIGN_SKILL_REQUIRED_MSG = `Design skill not loaded. Before canvas_add/canvas_update/canvas_edit/canvas_insert/canvas_create_import_scaffold, call read_skill with name "${DESIGN_SKILL_NAME}" and follow it (including the screenshot-critique loop).`;
/** Keys that have successfully loaded bingo-design this session (MCP session or chat tab). */
var designSkillLoadedKeys = new Set();
function designSkillSessionKey(sessionId) {
  return `s:${sessionId}`;
}
function designSkillChatKey(projectId, chatTabId) {
  return `c:${projectId}:${chatTabId}`;
}
function designSkillRunKey(projectId, chatTabId, chatRunId) {
  return `r:${projectId}:${chatTabId}:${chatRunId}`;
}
function markDesignSkillLoaded(opts) {
  if (opts.sessionId) designSkillLoadedKeys.add(designSkillSessionKey(opts.sessionId));
  if (opts.projectId && opts.chatTabId && opts.chatRunId) designSkillLoadedKeys.add(designSkillRunKey(opts.projectId, opts.chatTabId, opts.chatRunId));
  else if (opts.projectId && opts.chatTabId) designSkillLoadedKeys.add(designSkillChatKey(opts.projectId, opts.chatTabId));
}
function hasDesignSkillLoaded(opts) {
  if (opts.sessionId && designSkillLoadedKeys.has(designSkillSessionKey(opts.sessionId))) return true;
  if (opts.projectId && opts.chatTabId && opts.chatRunId) return designSkillLoadedKeys.has(designSkillRunKey(opts.projectId, opts.chatTabId, opts.chatRunId));
  if (opts.projectId && opts.chatTabId && designSkillLoadedKeys.has(designSkillChatKey(opts.projectId, opts.chatTabId))) return true;
  if (opts.projectId && !opts.chatTabId) {
    const sole = resolveChatTabId(opts.projectId);
    if (sole && designSkillLoadedKeys.has(designSkillChatKey(opts.projectId, sole))) return true;
  }
  return false;
}
function clearReaderKeyedState(readerKey) {
  designSkillLoadedKeys.delete(readerKey);
  coveringReadsByReader.delete(readerKey);
}
function isDesignSkillRead(toolName, toolArgs) {
  return toolName === "read_skill" && toolArgs?.name === DESIGN_SKILL_NAME;
}
/** readerKey (`c:project:chatTab` or `s:sessionId`) → elementId → subtree hash */
var coveringReadsByReader = new Map();
/**
* Covering-read identity. Prefer MCP session when present (external clients).
* Otherwise use chatTabId — callers must pass explicit `?chatTab=` only, never
* sole-tab inference (that remkeys external sessions onto an in-app tab).
*/
function readerKeyFor(opts) {
  if (opts.sessionId) return designSkillSessionKey(opts.sessionId);
  if (opts.chatTabId) return designSkillChatKey(opts.projectId, opts.chatTabId);
}
function recordCoveringRead(readerKey, elementId, subtreeHash) {
  let map = coveringReadsByReader.get(readerKey);
  if (!map) {
    map = new Map();
    coveringReadsByReader.set(readerKey, map);
  }
  map.set(elementId, subtreeHash);
}
/**
* Seed covering-read hashes for in-app @-attached elements so claim works
* without a redundant canvas_read of ids already in chat context.
*/
function seedCoveringReadsFromAttachedElements(projectId, chatTabId, attachedElements) {
  if (!attachedElements.length) return;
  const readerKey = designSkillChatKey(projectId, chatTabId);
  for (const raw of attachedElements) {
    if (!raw || typeof raw !== "object") continue;
    try {
      const store = ensureV2([raw]);
      for (const rootId of getRootIds(store)) for (const [elementId, subtreeHash] of hashAllElementSubtreesFrom(store, rootId)) recordCoveringRead(readerKey, elementId, subtreeHash);
    } catch {}
  }
}
var MCP_SESSION_HEADER = "mcp-session-id";
var mcpSessions = new Map();
/** Drop idle external MCP sessions (and their covering reads) after this TTL. */
var MCP_SESSION_TTL_MS = 216e5;
/** Active GET /mcp SSE streams per session (Streamable HTTP — Claude Code opens this after initialize). */
var mcpSseStreams = new Map();
function touchMcpSession(sessionId) {
  const session = mcpSessions.get(sessionId);
  if (session) session.lastActiveAt = Date.now();
}
function destroyMcpSession(sessionId) {
  mcpSessions.delete(sessionId);
  clearReaderKeyedState(designSkillSessionKey(sessionId));
  const streams = mcpSseStreams.get(sessionId);
  if (!streams) return;
  mcpSseStreams.delete(sessionId);
  for (const res of streams) try {
    if (!res.writableEnded) res.end();
  } catch {}
}
function pruneStaleMcpSessions() {
  const now = Date.now();
  for (const [id, session] of mcpSessions) if (now - session.lastActiveAt > MCP_SESSION_TTL_MS) destroyMcpSession(id);
}
function readMcpSessionHeader(req) {
  const raw = req.headers[MCP_SESSION_HEADER];
  return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : void 0;
}
function clientAcceptsEventStream(req) {
  return String(req.headers.accept ?? "").includes("text/event-stream");
}
function formatMcpSseEvent(data) {
  return `event: message\ndata: ${JSON.stringify(data)}\n\n`;
}
function handleMcpGetStream(req, res, url) {
  const legacyMatch = url.pathname.match(/^\/mcp\/([^/]+)$/);
  if (!(url.pathname === "/mcp" || url.pathname === "/mcp/") && !legacyMatch) {
    res.writeHead(404);
    res.end();
    return;
  }
  if (legacyMatch) {
    res.writeHead(405, {
      Allow: "POST"
    });
    res.end();
    return;
  }
  const sessionId = readMcpSessionHeader(req);
  if (!sessionId || !mcpSessions.has(sessionId)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Mcp-Session-Id": sessionId
  });
  let streams = mcpSseStreams.get(sessionId);
  if (!streams) {
    streams = new Set();
    mcpSseStreams.set(sessionId, streams);
  }
  streams.add(res);
  res.write(": connected\n\n");
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(": ping\n\n");
  }, 15e3);
  const cleanup = () => {
    clearInterval(heartbeat);
    if (!streams.has(res)) return;
    streams.delete(res);
    if (streams.size === 0) {
      mcpSseStreams.delete(sessionId);
      destroyMcpSession(sessionId);
    }
  };
  req.on("close", cleanup);
  res.on("close", cleanup);
}
/**
* External /mcp clients (Cursor, the CLI) arrive without a project. With a
* single project open there is nothing to disambiguate, so bind to it and save
* the client a project_list + project_pick round trip. With several open the
* choice is genuinely the user's — stay unbound and let NO_PROJECT_SELECTED_MSG
* send the client through project_pick. In-app chats use /mcp/:projectId and
* never reach here.
*/
function ensureSessionBound(sessionId) {
  if (resolveSessionProjectId(sessionId)) return;
  const openIds = getOpenProjectIds();
  if (openIds.length === 1) setSessionProject(sessionId, openIds[0]);
}
function createMcpSession() {
  pruneStaleMcpSessions();
  const sessionId = (0, crypto$1.randomUUID)();
  const now = Date.now();
  mcpSessions.set(sessionId, {
    lastActiveAt: now
  });
  return sessionId;
}
function setSessionProject(sessionId, projectId) {
  const session = mcpSessions.get(sessionId);
  if (session) session.projectId = projectId;
}
function resolveSessionProjectId(sessionId) {
  return mcpSessions.get(sessionId)?.projectId;
}
/** Stale unknown session IDs → 404 so clients re-initialize; missing header → new session. */
function resolveMcpSessionForRequest(sessionId, rpcId) {
  if (sessionId && !mcpSessions.has(sessionId)) return {
    status: 404,
    body: {
      jsonrpc: "2.0",
      id: rpcId,
      error: {
        code: -32001,
        message: "Session not found"
      }
    }
  };
  return {
    sessionId: sessionId && mcpSessions.has(sessionId) ? sessionId : createMcpSession()
  };
}
async function fetchProjectName(projectId) {
  try {
    const res = await apiFetch$1(`/projects/${projectId}`);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (typeof data.name === "string" && data.name.trim()) return data.name.trim();
    }
  } catch {}
  return projectId.slice(0, 8);
}
async function formatClosedProjectError(projectId) {
  return `Project "${await fetchProjectName(projectId)}" is no longer open in Bingo. Call project_list and project_pick again.`;
}
var TOOLS_WITHOUT_BOUND_PROJECT = new Set(["project_list", "project_pick", "list_skills", "read_skill"]);
var NO_PROJECT_SELECTED_MSG = "No project selected. Call project_list, then project_pick with the project the user wants to work on.";
var builtInSkillsPromise = null;
var skillOverridesEnabled = false;
var skillOverrides = {};
function extractSkillDescription(skillMd) {
  const frontmatter = skillMd.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) return void 0;
  return frontmatter[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
}
async function loadAvailableSkills() {
  if (!builtInSkillsPromise) builtInSkillsPromise = (async () => {
    const electronApp = electron.app;
    const skillsRoot = systemSkillsPath({
      packaged: !!electronApp?.isPackaged,
      resourcesPath: process.resourcesPath || process.cwd(),
      appPath: electronApp?.getAppPath?.() || process.cwd()
    });
    const loaded = await loadSystemSkills(skillsRoot);
    if (loaded.length === 0) console.error(`[skills] No built-in skills found at ${skillsRoot}`);
    return loaded.map(skill => ({
      ...skill,
      source: "built-in",
      description: extractSkillDescription(skill.files.find(f => f.path === "SKILL.md")?.content ?? "")
    }));
  })();
  return builtInSkillsPromise;
}
/** Built-in skills from disk (no localStorage overrides). Used by the Skills UI. */
async function getSystemSkills() {
  return loadAvailableSkills();
}
/** Inject the effective design skill into one in-app chat run before tools are available. */
async function prepareInAppDesignSkill(projectId, chatTabId, chatRunId) {
  if (!isActiveChatRun(projectId, chatTabId, chatRunId)) {
    const error = new Error("Cannot load the design skill for an inactive chat run");
    error.code = "DESIGN_SKILL_UNAVAILABLE";
    throw error;
  }
  const skill = applySkillOverrides(await loadAvailableSkills()).find(candidate => candidate.name === DESIGN_SKILL_NAME);
  if (!skill) {
    const error = new Error(`Required design skill is unavailable: ${DESIGN_SKILL_NAME}`);
    error.code = "DESIGN_SKILL_UNAVAILABLE";
    throw error;
  }
  const files = Array.isArray(skill.files) ? skill.files.filter(file => typeof file?.content === "string") : [];
  const main = files.find(file => file.path === "SKILL.md");
  if (!main?.content?.trim()) {
    const error = new Error(`Required design skill has no readable SKILL.md: ${DESIGN_SKILL_NAME}`);
    error.code = "DESIGN_SKILL_UNAVAILABLE";
    throw error;
  }
  markDesignSkillLoaded({ projectId, chatTabId, chatRunId });
  return [
    `## Loaded Bingo skill: ${DESIGN_SKILL_NAME}`,
    "The Bingo host loaded this skill for the current run. Follow it for every canvas mutation.",
    ...files.map(file => `\n### ${file.path}\n${file.content}`),
  ].join("\n");
}
/** Sync skill overrides from the renderer (localStorage is source of truth). */
var skillOverrideApplyGen = 0;
function setSkillOverrides(enabled, overrides, gen) {
  if (typeof gen === "number") {
    if (gen < skillOverrideApplyGen) return;
    skillOverrideApplyGen = gen;
  }
  skillOverridesEnabled = !!enabled;
  const incoming = overrides && typeof overrides === "object" ? overrides : {};
  skillOverrides = Object.fromEntries(Object.entries(incoming).filter(([, entry]) => entry?.active === true && Array.isArray(entry.files) && entry.files.length > 0));
}
function applySkillOverrides(skills) {
  if (!skillOverridesEnabled) return skills;
  return skills.map(skill => {
    const override = skillOverrides[skill.name];
    if (!override?.files?.length) return skill;
    const files = override.files.map(f => ({
      path: f.path,
      content: f.content
    }));
    return {
      ...skill,
      files,
      description: extractSkillDescription(files.find(f => f.path === "SKILL.md")?.content ?? "") ?? skill.description
    };
  });
}
async function handleListSkills(_projectId, _args) {
  const skills = applySkillOverrides(await loadAvailableSkills());
  return {
    content: [{
      type: "text",
      text: JSON.stringify(skills.map(({
        name,
        source,
        description
      }) => ({
        name,
        source,
        description
      })), null, 2)
    }]
  };
}
async function handleReadSkill(_projectId, args) {
  const name = args.name;
  if (!name || typeof name !== "string") return {
    isError: true,
    content: [{
      type: "text",
      text: "name is required"
    }]
  };
  const skill = applySkillOverrides(await loadAvailableSkills()).find(candidate => candidate.name === name);
  if (!skill) return {
    isError: true,
    content: [{
      type: "text",
      text: `Skill not found: ${name}`
    }]
  };
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        name: skill.name,
        source: skill.source,
        description: skill.description,
        files: skill.files
      }, null, 2)
    }]
  };
}
var DESTRUCTIVE_TOOLS = new Set(["project_write", "project_write_batch", "project_edit", "project_delete", "project_copy_asset", "project_copy_file", "local_write", "local_edit", "set_icon_library"]);
var EXTERNAL_AUTO_APPROVABLE_TOOLS = new Set(["project_write", "project_write_batch", "project_edit", "project_copy_file"]);
var EXTERNAL_FILE_EDIT_TOOLS = new Set(["project_write", "project_write_batch", "project_edit", "project_copy_file"]);
var EXTERNAL_FILE_EDIT_APPROVAL_NOTE = "External MCP clients: this file edit may pause for Bingo in-app approval. If the call waits, tell the user to approve it in the Bingo project window, or choose \"Allow edits this session\" there.";
var pendingApprovals = new Map();
var externalAutoApproveFileEditsProjects = new Set();
var APPROVAL_TIMEOUT_MS = 12e4;
function setExternalMcpAutoApproveFileEdits(projectId, enabled) {
  if (enabled) externalAutoApproveFileEditsProjects.add(projectId);else externalAutoApproveFileEditsProjects.delete(projectId);
}
function notifyProjectApprovalResolved(projectId, approvalId) {
  findWindowForProject(projectId)?.webContents.send("mcp_external_tool_approval_resolved", {
    approvalId,
    projectId
  });
}
function getApprovalNotificationTarget(args) {
  if (args?.file_path) return String(args.file_path);
  if (Array.isArray(args?.files)) {
    const first = args.files[0]?.file_path || args.files[0]?.project_path;
    if (first) return args.files.length === 1 ? String(first) : `${first} +${args.files.length - 1} more`;
    return `${args.files.length} files`;
  }
  if (args?.project_path) return String(args.project_path);
  return "project files";
}
function focusProjectWindow(projectId) {
  const win = findWindowForProject(projectId);
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}
function showExternalApprovalNotification(projectId, args) {
  if (!electron.Notification?.isSupported?.()) return;
  const notification = new electron.Notification({
    title: "Bingo approval needed",
    body: `External agent wants to edit ${getApprovalNotificationTarget(args)}`,
    silent: false
  });
  notification.on("click", () => focusProjectWindow(projectId));
  notification.show();
}
/** Called from IPC when user approves or rejects a tool call */
function resolveApproval(approvalId, approved) {
  const pending = pendingApprovals.get(approvalId);
  if (!pending) return;
  if (pending.timeout) clearTimeout(pending.timeout);
  pendingApprovals.delete(approvalId);
  notifyProjectApprovalResolved(pending.projectId, approvalId);
  pending.resolve({
    approved,
    reason: approved ? void 0 : "rejected"
  });
}
function cancelToolApprovals(predicate) {
  for (const [id, pending] of pendingApprovals) {
    if (!predicate(pending)) continue;
    if (pending.timeout) clearTimeout(pending.timeout);
    pending.resolve({
      approved: false,
      reason: "cancelled"
    });
    notifyProjectApprovalResolved(pending.projectId, id);
    pendingApprovals.delete(id);
  }
}
/** Cancel only prompts owned by one in-app chat. */
function cancelApprovalsForChat(projectId, chatTabId) {
  cancelToolApprovals(pending => pending.projectId === projectId && pending.chatTabId === chatTabId);
  cancelFolderGrants(grant => grant.projectId === projectId && grant.chatTabId === chatTabId);
}
/** Project renderer teardown invalidates both in-app and external prompts for that project. */
function cancelApprovalsForProject(projectId) {
  cancelToolApprovals(pending => pending.projectId === projectId);
  cancelFolderGrants(grant => grant.projectId === projectId);
}
/** Global cleanup is reserved for application shutdown. */
function cancelAllApprovals() {
  cancelToolApprovals(() => true);
  cancelFolderGrants(() => true);
}
var cancelledChats = new Set();
function chatCancelKey(projectId, chatTabId) {
  return chatTabId ? `${projectId}:${chatTabId}` : projectId;
}
/** Stop in-flight canvas/MCP work for this chat. New sends clear the flag. */
function markChatCancelled(projectId, chatTabId) {
  cancelCanvasDrawPreview(projectId);
  sendCanvasOperation(projectId, "preview_drop", {
    chat_tab_id: chatTabId
  }).catch(() => {});
  cancelledChats.add(chatCancelKey(projectId, chatTabId));
  cancelApprovalsForChat(projectId, chatTabId);
}
function clearChatCancelled(projectId, chatTabId) {
  cancelledChats.delete(chatCancelKey(projectId, chatTabId));
}
function isChatCancelled(projectId, chatTabId) {
  if (chatTabId && cancelledChats.has(`${projectId}:${chatTabId}`)) return true;
  return cancelledChats.has(projectId);
}
async function requestToolApproval(projectId, toolName, args, options) {
  const approvalId = (0, crypto$1.randomUUID)();
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      pendingApprovals.delete(approvalId);
      notifyProjectApprovalResolved(projectId, approvalId);
      resolve({
        approved: false,
        reason: "timeout"
      });
    }, APPROVAL_TIMEOUT_MS);
    pendingApprovals.set(approvalId, {
      resolve,
      toolName,
      args,
      projectId,
      chatTabId: options?.chatTabId,
      source: options?.source ?? "internal",
      sessionId: options?.sessionId ?? null,
      timeout
    });
    const event = {
      approvalId,
      projectId,
      chatTabId: options?.chatTabId,
      toolName,
      args,
      origin: options?.origin ?? "bingo"
    };
    if (options?.source === "external") {
      findWindowForProject(projectId)?.webContents.send("mcp_external_tool_approval_needed", event);
      showExternalApprovalNotification(projectId, args);
    } else mcpEvents.emit("tool_approval_needed", event);
  });
}
/** Tool the Claude CLI is pointed at with --permission-prompt-tool. */
var PERMISSION_PROMPT_TOOL = "approve";
/**
* Claude Code's permission prompt for the in-app chat: whatever the permission
* mode could not decide on its own lands here, and the user answers it in the
* chat's approval card. Returns the CLI's expected payload as a JSON string.
*/
async function handleApprove(projectId, args, chatTabId) {
  const toolName = typeof args?.tool_name === "string" && args.tool_name ? args.tool_name : "unknown tool";
  const input = args?.input && typeof args.input === "object" ? args.input : {};
  const decision = await requestToolApproval(projectId, toolName, input, {
    source: "internal",
    origin: "cli",
    chatTabId
  });
  const payload = decision.approved ? {
    behavior: "allow",
    updatedInput: input
  } : {
    behavior: "deny",
    message: decision.reason === "timeout" ? "No answer from the user within 2 minutes. Do not retry; ask the user how to proceed." : decision.reason === "cancelled" ? "The chat was stopped." : "The user declined this action in Bingo. Do not retry it; ask how to proceed."
  };
  return {
    content: [{
      type: "text",
      text: JSON.stringify(payload)
    }]
  };
}
function apiFetch$1(path$39, init) {
  return Promise.resolve(localApiFetch(path$39, init)).then(res => {
    if (!res) throw new Error(`[MCP] No local handler for ${path$39}`);
    return res;
  });
}
/** Parse a failed local operation response so the model sees the real error, not just a status code. */
async function mcpResultFromFailedResponse(res, fallback) {
  const raw = await res.text().catch(() => "");
  let error;
  let reason;
  if (raw) try {
    const body = JSON.parse(raw);
    if (typeof body.error === "string" && body.error.trim()) error = body.error;
    if (typeof body.reason === "string" && body.reason.trim()) reason = body.reason;
  } catch {
    const trimmed = raw.trim();
    if (trimmed) error = trimmed.slice(0, 400);
  }
  return {
    isError: true,
    content: [{
      type: "text",
      text: error || fallback
    }],
    ...(reason ? {
      reason
    } : {})
  };
}
function mcpResultText(result) {
  const text = result?.content?.find(c => c.type === "text")?.text;
  return typeof text === "string" && text.length > 0 ? text : void 0;
}
var metadataCache = new Map();
var CACHE_TTL = 3e4;
async function getFileMetadata(projectId) {
  const cached = metadataCache.get(projectId);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.files;
  const res = await apiFetch$1(`/projects/${projectId}/files`);
  if (!res.ok) throw new Error(`Failed to list files: ${res.status}`);
  const files = await res.json();
  metadataCache.set(projectId, {
    files,
    time: Date.now()
  });
  return files;
}
function invalidateCache(projectId) {
  metadataCache.delete(projectId);
}
function globToRegex(pattern) {
  let regex = "^";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === "*" && pattern[i + 1] === "*") {
      if (pattern[i + 2] === "/") {
        regex += "(?:.+/)?";
        i += 3;
      } else {
        regex += ".*";
        i += 2;
      }
    } else if (c === "*") {
      regex += "[^/]*";
      i++;
    } else if (c === "?") {
      regex += "[^/]";
      i++;
    } else if (".()[]{}+^$|\\".includes(c)) {
      regex += "\\" + c;
      i++;
    } else {
      regex += c;
      i++;
    }
  }
  return new RegExp(regex + "$");
}
var IGNORE_GLOBS = ["!node_modules", "!.git", "!dist", "!build", "!out", "!.next", "!.turbo", "!.cache", "!coverage", "!.DS_Store"];
var resolvedRgPath;
async function findRipgrep() {
  if (resolvedRgPath !== void 0) return resolvedRgPath;
  try {
    const {
      rgPath
    } = require("@vscode/ripgrep");
    if (rgPath) {
      const unpackedPath = rgPath.includes("app.asar") ? rgPath.replace("app.asar", "app.asar.unpacked") : rgPath;
      try {
        if ((await (0, fs_promises.stat)(unpackedPath)).isFile()) {
          resolvedRgPath = unpackedPath;
          console.log(`[MCP] ripgrep (bundled): ${unpackedPath}`);
          return unpackedPath;
        }
      } catch {}
    }
  } catch {}
  const candidates = process.platform === "win32" ? [] : ["/opt/homebrew/bin/rg", "/usr/local/bin/rg", "/usr/bin/rg", "/opt/local/bin/rg"];
  for (const p of candidates) try {
    if ((await (0, fs_promises.stat)(p)).isFile()) {
      resolvedRgPath = p;
      console.log(`[MCP] ripgrep (system): ${p}`);
      return p;
    }
  } catch {}
  try {
    const {
      stdout
    } = await execFileAsync$3(process.env.SHELL || "/bin/sh", ["-lc", "which rg"], {
      timeout: 3e3
    });
    const found = stdout.trim().split("\n").pop()?.trim();
    if (found && !found.includes("not found")) try {
      if ((await (0, fs_promises.stat)(found)).isFile()) {
        resolvedRgPath = found;
        console.log(`[MCP] ripgrep (PATH): ${found}`);
        return found;
      }
    } catch {}
  } catch {}
  resolvedRgPath = null;
  console.warn("[MCP] ripgrep not found — using JS fallback for local_glob/local_grep (slower, less accurate)");
  return null;
}
/** Resolve an absolute glob pattern to (searchRoots, relativePattern). */
function resolveGlobScope(pattern, allowed) {
  if (pattern.startsWith("/")) for (const dir of allowed) {
    const resolvedDir = (0, path.resolve)(dir);
    if (pattern === resolvedDir || pattern.startsWith(resolvedDir + "/")) return {
      roots: [resolvedDir],
      pattern: pattern.slice(resolvedDir.length + 1) || "**/*"
    };
  }
  return {
    roots: allowed,
    pattern
  };
}
/** Try to read a project file, return content or null */
async function tryReadProjectFile(projectId, filePath) {
  try {
    const res = await apiFetch$1(`/projects/${projectId}/files/by-path?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) return null;
    return (await res.json()).content || null;
  } catch {
    return null;
  }
}
/** Preserve source scopes/imports and report discovery gaps instead of inventing utilities. */
async function getProjectThemeSummary(projectId) {
  try {
    const filePaths = (await getFileMetadata(projectId)).map(f => f.path);
    return formatProjectThemeSummary(await collectProjectTheme(filePaths, file => tryReadProjectFile(projectId, file)));
  } catch (err) {
    console.warn("[MCP] Theme discovery failed:", err);
    return "Project theme discovery failed. Inspect source CSS and configuration before styling; this is not evidence of an empty theme.";
  }
}
var DEFAULT_READ_LIMIT = 2e3;
/** Slice file content into numbered lines with offset/limit pagination */
function sliceLines(content, filePath, offset, limit) {
  const allLines = content.split("\n");
  const totalLines = allLines.length;
  const start = Math.max(0, (offset ?? 1) - 1);
  const max = limit ?? DEFAULT_READ_LIMIT;
  const numbered = allLines.slice(start, start + max).map((line, i) => `${start + i + 1}\t${line}`).join("\n");
  return `${`File: ${filePath} (${totalLines} lines total)`}\n${numbered}${start + max < totalLines ? `\n... (${totalLines - start - max} more lines, use offset/limit to read more)` : ""}`;
}
async function handleRead(projectId, args) {
  const filePath = args.file_path;
  if (!filePath) return {
    isError: true,
    content: [{
      type: "text",
      text: "file_path is required"
    }]
  };
  const res = await apiFetch$1(`/projects/${projectId}/files/by-path?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) return {
    isError: true,
    content: [{
      type: "text",
      text: `File not found: ${filePath}`
    }]
  };
  const file = await res.json();
  if (!file.content) return {
    content: [{
      type: "text",
      text: "(empty file)"
    }]
  };
  return {
    content: [{
      type: "text",
      text: sliceLines(file.content, filePath, args.offset, args.limit)
    }]
  };
}
async function handleGlob(projectId, args) {
  const pattern = args.pattern || "*";
  const files = await getFileMetadata(projectId);
  const re = globToRegex(pattern);
  const matches = files.filter(f => re.test(f.path)).map(f => f.path).sort();
  if (matches.length === 0) return {
    content: [{
      type: "text",
      text: `No files matching: ${pattern}`
    }]
  };
  return {
    content: [{
      type: "text",
      text: matches.join("\n")
    }]
  };
}
async function handleGrep(projectId, args) {
  const pattern = args.pattern;
  if (!pattern) return {
    isError: true,
    content: [{
      type: "text",
      text: "pattern is required"
    }]
  };
  let filePaths = (await getFileMetadata(projectId)).map(f => f.path);
  if (args.glob) {
    const re = globToRegex(args.glob);
    filePaths = filePaths.filter(p => re.test(p));
  }
  const regex = new RegExp(pattern, args.case_insensitive ? "gi" : "g");
  const outputMode = args.output_mode || "content";
  const headLimit = args.head_limit ?? 250;
  const contextBefore = args.context_before ?? args.context ?? 0;
  const contextAfter = args.context_after ?? args.context ?? 0;
  const results = [];
  const BATCH_SIZE = 16;
  const MAX_FILES = 2e3;
  const searchList = filePaths.slice(0, MAX_FILES);
  for (let b = 0; b < searchList.length; b += BATCH_SIZE) {
    if (headLimit > 0 && results.length >= headLimit) break;
    const batch = searchList.slice(b, b + BATCH_SIZE);
    const contents = await Promise.all(batch.map(async fp => {
      try {
        const res = await apiFetch$1(`/projects/${projectId}/files/by-path?path=${encodeURIComponent(fp)}`);
        if (!res.ok) return null;
        const file = await res.json();
        return file.content ? {
          fp,
          content: file.content
        } : null;
      } catch {
        return null;
      }
    }));
    for (const item of contents) {
      if (!item) continue;
      if (headLimit > 0 && results.length >= headLimit) break;
      const {
        fp,
        content
      } = item;
      const lines = content.split("\n");
      const matchedLineNums = new Set();
      for (let i = 0; i < lines.length; i++) if (regex.test(lines[i])) {
        matchedLineNums.add(i);
        regex.lastIndex = 0;
      }
      if (matchedLineNums.size === 0) continue;
      if (outputMode === "files_with_matches") results.push(fp);else if (outputMode === "count") results.push(`${fp}:${matchedLineNums.size}`);else {
        const linesToShow = new Set();
        for (const lineNum of matchedLineNums) for (let c = Math.max(0, lineNum - contextBefore); c <= Math.min(lines.length - 1, lineNum + contextAfter); c++) linesToShow.add(c);
        const sortedLines = [...linesToShow].sort((a, b) => a - b);
        let lastLine = -2;
        for (const lineNum of sortedLines) {
          if (headLimit > 0 && results.length >= headLimit) break;
          if (lineNum > lastLine + 1 && lastLine >= 0) results.push("--");
          const prefix = matchedLineNums.has(lineNum) ? ":" : "-";
          results.push(`${fp}:${lineNum + 1}${prefix} ${lines[lineNum]}`);
          lastLine = lineNum;
        }
      }
    }
  }
  if (results.length === 0) return {
    content: [{
      type: "text",
      text: `No matches for: ${pattern}`
    }]
  };
  const truncNote = filePaths.length > MAX_FILES ? `\n... (searched first ${MAX_FILES} of ${filePaths.length} files — narrow with glob to search more)` : "";
  return {
    content: [{
      type: "text",
      text: results.join("\n") + truncNote
    }]
  };
}
/** Fix common AI mistakes in component file JSX before saving */
function fixComponentJSX(filePath, content) {
  if (!/\.(tsx|jsx)$/.test(filePath)) return content;
  return content.replace(/\s*style=\{\{\s*"className"\s*:\s*"([^"]*)"\s*\}\}/g, " className=\"$1\"");
}
/**
* Keep MCP component discovery useful during the same chat turn that creates a
* component. The renderer receives the authoritative project-builder index via
* SSE, but the MCP process otherwise keeps the snapshot captured when chat
* started. This intentionally covers common source exports only; the builder
* remains authoritative for compilation and complex re-export resolution.
*/
function mergeWrittenComponentsIntoIndex(projectId, files) {
  const next = {
    ...(projectComponentIndex.get(projectId) ?? {})
  };
  for (const file of files) {
    if (!/\.(tsx|jsx)$/.test(file.path)) continue;
    for (const [name, entry] of Object.entries(next)) if (entry.path === file.path) {
      delete next[name];
    }
    const found = new Map();
    for (const match of file.content.matchAll(/\bexport\s+(?:declare\s+)?(?:const|let|var|function|class)\s+([A-Z][A-Za-z0-9_$]*)/g)) found.set(match[1], match[1]);
    for (const match of file.content.matchAll(/\bexport\s*\{([^}]+)\}(?!\s*from\b)/g)) for (const rawPart of match[1].split(",")) {
      const part = rawPart.trim().replace(/^type\s+/, "");
      const exportedName = /^(\w+)\s+as\s+(\w+)$/.exec(part)?.[2] ?? part;
      if (/^[A-Z][A-Za-z0-9_$]*$/.test(exportedName)) found.set(exportedName, exportedName);
    }
    const namedDefault = /\bexport\s+default\s+(?:function|class)\s+([A-Z][A-Za-z0-9_$]*)/.exec(file.content);
    const identifierDefault = /\bexport\s+default\s+([A-Z][A-Za-z0-9_$]*)\s*;?/.exec(file.content);
    const defaultName = namedDefault?.[1] ?? identifierDefault?.[1];
    if (defaultName) found.set(defaultName, "default");
    const metadata = extractComponentPropMetadata(file.content);
    for (const [name, exportName] of found) {
      const props = metadata[exportName];
      next[name] = props ? {
        path: file.path,
        exportName,
        props
      } : {
        path: file.path,
        exportName
      };
    }
  }
  projectComponentIndex.set(projectId, next);
}
async function handleWrite(projectId, args) {
  const filePath = args.file_path;
  let content = args.content;
  if (!filePath || content === void 0) return {
    isError: true,
    content: [{
      type: "text",
      text: "file_path and content are required"
    }]
  };
  content = fixComponentJSX(filePath, content);
  const getRes = await apiFetch$1(`/projects/${projectId}/files/by-path?path=${encodeURIComponent(filePath)}`);
  if (getRes.ok) {
    const patchRes = await apiFetch$1(`/projects/${projectId}/files/${(await getRes.json()).id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content
      })
    });
    if (!patchRes.ok) return mcpResultFromFailedResponse(patchRes, `Failed to write ${filePath} (${patchRes.status})`);
    invalidateCache(projectId);
    mergeWrittenComponentsIntoIndex(projectId, [{
      path: filePath,
      content
    }]);
    mcpEvents.emit("file_changed", {
      projectId,
      filePath,
      content
    });
    return {
      content: [{
        type: "text",
        text: `Updated: ${filePath}`
      }]
    };
  } else {
    const ext = filePath.split(".").pop() || "";
    const createRes = await apiFetch$1(`/projects/${projectId}/files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        path: filePath,
        fileType: {
          tsx: "tsx",
          ts: "ts",
          jsx: "jsx",
          js: "js",
          css: "css",
          json: "json"
        }[ext] || "other",
        content
      })
    });
    if (!createRes.ok) return mcpResultFromFailedResponse(createRes, `Failed to create ${filePath} (${createRes.status})`);
    invalidateCache(projectId);
    mergeWrittenComponentsIntoIndex(projectId, [{
      path: filePath,
      content
    }]);
    mcpEvents.emit("file_changed", {
      projectId,
      filePath,
      content,
      isNew: true
    });
    return {
      content: [{
        type: "text",
        text: `Created: ${filePath}`
      }]
    };
  }
}
async function handleWriteBatch(projectId, args) {
  if (!Array.isArray(args.files) || args.files.length === 0) return {
    isError: true,
    content: [{
      type: "text",
      text: "files array is required (1-500 entries)"
    }]
  };
  if (args.files.length > 500) return {
    isError: true,
    content: [{
      type: "text",
      text: `Too many files (${args.files.length}). Max 500 per batch — split into multiple calls.`
    }]
  };
  const typeMap = {
    tsx: "tsx",
    ts: "ts",
    jsx: "jsx",
    js: "js",
    css: "css",
    json: "json"
  };
  const filesPayload = [];
  for (const f of args.files) {
    if (!f?.file_path || f?.content === void 0) return {
      isError: true,
      content: [{
        type: "text",
        text: "each file needs file_path and content"
      }]
    };
    const ext = String(f.file_path).split(".").pop() || "";
    filesPayload.push({
      path: f.file_path,
      content: fixComponentJSX(f.file_path, f.content),
      fileType: typeMap[ext] || "other"
    });
  }
  const existingRes = await apiFetch$1(`/projects/${projectId}/files`);
  if (!existingRes.ok) return {
    isError: true,
    content: [{
      type: "text",
      text: `Failed to inspect existing files before batch write: ${existingRes.status}`
    }]
  };
  const existingFiles = await existingRes.json();
  const existingPaths = new Set(existingFiles.map(f => f.path).filter(Boolean));
  const skippedExisting = filesPayload.filter(f => existingPaths.has(f.path));
  const newFiles = filesPayload.filter(f => !existingPaths.has(f.path));
  if (newFiles.length > 0) {
    const res = await apiFetch$1(`/import/files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        projectId,
        files: newFiles
      })
    });
    if (!res.ok) return mcpResultFromFailedResponse(res, `Batch write failed (${res.status})`);
    invalidateCache(projectId);
    mergeWrittenComponentsIntoIndex(projectId, newFiles);
    for (const f of newFiles) mcpEvents.emit("file_changed", {
      projectId,
      filePath: f.path,
      content: f.content,
      isNew: true
    });
  }
  const parts = [`Batch wrote ${newFiles.length} new file${newFiles.length === 1 ? "" : "s"}`];
  if (newFiles.length > 0) parts.push(newFiles.map(f => f.path).join(", "));
  if (skippedExisting.length > 0) parts.push(`Skipped ${skippedExisting.length} existing file${skippedExisting.length === 1 ? "" : "s"} (use project_write/project_edit to update): ${skippedExisting.map(f => f.path).join(", ")}`);
  return {
    content: [{
      type: "text",
      text: parts.join(". ")
    }]
  };
}
async function handleEdit(projectId, args) {
  const filePath = args.file_path;
  const oldText = args.old_string;
  const newText = args.new_string;
  if (!filePath || oldText === void 0 || newText === void 0) return {
    isError: true,
    content: [{
      type: "text",
      text: "file_path, old_string, and new_string are required"
    }]
  };
  if (oldText === newText) return {
    isError: true,
    content: [{
      type: "text",
      text: "old_string and new_string are identical — nothing to change"
    }]
  };
  const getRes = await apiFetch$1(`/projects/${projectId}/files/by-path?path=${encodeURIComponent(filePath)}`);
  if (!getRes.ok) return {
    isError: true,
    content: [{
      type: "text",
      text: `File not found: ${filePath}`
    }]
  };
  const file = await getRes.json();
  if (!file.content || !file.content.includes(oldText)) return {
    isError: true,
    content: [{
      type: "text",
      text: `old_string not found in ${filePath}. Make sure you read the file first and use the exact text including whitespace/indentation.`
    }]
  };
  let updated;
  if (args.replace_all) {
    const parts = file.content.split(oldText);
    const count = parts.length - 1;
    updated = fixComponentJSX(filePath, parts.join(newText));
    const patchRes = await apiFetch$1(`/projects/${projectId}/files/${file.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: updated
      })
    });
    if (!patchRes.ok) return mcpResultFromFailedResponse(patchRes, `Failed to save ${filePath} (${patchRes.status})`);
    invalidateCache(projectId);
    mcpEvents.emit("file_changed", {
      projectId,
      filePath,
      content: updated
    });
    return {
      content: [{
        type: "text",
        text: `Edited: ${filePath} (replaced ${count} occurrences)`
      }]
    };
  }
  const firstIdx = file.content.indexOf(oldText);
  const secondIdx = file.content.indexOf(oldText, firstIdx + 1);
  if (secondIdx !== -1) return {
    isError: true,
    content: [{
      type: "text",
      text: `old_string is not unique in ${filePath} (found at lines ${file.content.slice(0, firstIdx).split("\n").length} and ${file.content.slice(0, secondIdx).split("\n").length}). Include more surrounding context to make it unique, or use replace_all to replace all occurrences.`
    }]
  };
  updated = fixComponentJSX(filePath, file.content.replace(oldText, newText));
  const patchRes = await apiFetch$1(`/projects/${projectId}/files/${file.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: updated
    })
  });
  if (!patchRes.ok) return mcpResultFromFailedResponse(patchRes, `Failed to save ${filePath} (${patchRes.status})`);
  invalidateCache(projectId);
  mcpEvents.emit("file_changed", {
    projectId,
    filePath,
    content: updated
  });
  return {
    content: [{
      type: "text",
      text: `Edited: ${filePath}`
    }]
  };
}
async function handleDelete(projectId, args) {
  const filePath = args.file_path;
  if (!filePath) return {
    isError: true,
    content: [{
      type: "text",
      text: "file_path is required"
    }]
  };
  const getRes = await apiFetch$1(`/projects/${projectId}/files/by-path?path=${encodeURIComponent(filePath)}`);
  if (!getRes.ok) return {
    isError: true,
    content: [{
      type: "text",
      text: `File not found: ${filePath}`
    }]
  };
  const delRes = await apiFetch$1(`/projects/${projectId}/files/${(await getRes.json()).id}`, {
    method: "DELETE"
  });
  if (!delRes.ok) return {
    isError: true,
    content: [{
      type: "text",
      text: `Failed to delete: ${delRes.status}`
    }]
  };
  invalidateCache(projectId);
  return {
    content: [{
      type: "text",
      text: `Deleted: ${filePath}`
    }]
  };
}
var pendingFolderGrants = new Map();
var FOLDER_GRANT_TIMEOUT_MS = 3e5;
/**
* Called from IPC when the user answers the chat's folder-access prompt.
* `path` is added to the project's allowed list here, in the main process,
* before resolving the pending request, so the re-check in `ensureLocalAccess`
* sees the persisted grant without waiting for the renderer's settings mutation.
*
 * Answering resolves the pending grants for the same project and chat. A shared
 * folder may satisfy parallel calls in that chat, while other chats keep their
 * own independent prompt lifecycle. Each caller still re-checks its own path.
*/
function resolveFolderAccess(requestId, granted, path$40) {
  const pending = pendingFolderGrants.get(requestId);
  if (!pending) return;
  const { projectId, chatTabId } = pending;
  if (granted && path$40) {
    granted = grantProjectPath(projectId, path$40);
  }
  for (const [id, grant] of [...pendingFolderGrants]) {
    if (grant.projectId !== projectId || grant.chatTabId !== chatTabId) continue;
    clearTimeout(grant.timeout);
    pendingFolderGrants.delete(id);
    grant.resolve({
      granted,
      reason: granted ? void 0 : "declined"
    });
  }
}
function cancelFolderGrants(predicate) {
  for (const [id, grant] of pendingFolderGrants) {
    if (!predicate(grant)) continue;
    clearTimeout(grant.timeout);
    grant.resolve({
      granted: false,
      reason: "cancelled"
    });
    pendingFolderGrants.delete(id);
  }
}
function requestFolderAccess(projectId, filePath, chatTabId) {
  const requestId = (0, crypto$1.randomUUID)();
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      pendingFolderGrants.delete(requestId);
      resolve({
        granted: false,
        reason: "timeout"
      });
    }, FOLDER_GRANT_TIMEOUT_MS);
    pendingFolderGrants.set(requestId, {
      resolve,
      projectId,
      chatTabId,
      timeout
    });
    mcpEvents.emit("local_access_needed", {
      projectId,
      chatTabId,
      requestId,
      path: filePath
    });
  });
}
/**
* Is the path inside a shared folder, ignoring whether it exists yet?
* Lexical check plus realpath of the nearest EXISTING ancestor, so a
* symlinked ancestor can't smuggle the target out. This only decides whether
* to PROMPT: `isExistingPathAllowed` / `isWritePathAllowed` return false for a
* missing file too, and a typo'd path inside a folder the user already shared
* must surface as not-found, not as a folder-access prompt.
*/
async function isPathInSharedFolder(filePath, projectId, chatTabId) {
  if (!isPathLexicallyAllowed(filePath, projectId, chatTabId)) return false;
  const roots = await getAllowedRealRoots(projectId, chatTabId);
  let probe = (0, path.resolve)(filePath);
  for (;;) try {
    return isWithinRealRoots(await (0, fs_promises.realpath)(probe), roots);
  } catch {
    const parent = (0, path.dirname)(probe);
    if (parent === probe) return false;
    probe = parent;
  }
}
/** The per-call deny once a path has passed the shared-folder gate. */
function denyPath(filePath) {
  return {
    isError: true,
    content: [{
      type: "text",
      text: `Cannot access ${filePath}: it does not exist, or it resolves outside the shared folders.`
    }]
  };
}
/**
* Gate a local-filesystem tool call on the user having shared the folder.
* Returns null when the path is inside a shared folder (or one gets shared),
* otherwise the MCP error result to return verbatim. Without `filePath` the
* question is just "is any folder shared?" (glob / grep / local_folders).
*
* When the folder isn't shared this BLOCKS the tool call while the chat shows
* a grant prompt, the same shape as `requestToolApproval`. Blocking is the whole
* point: returning "access denied" immediately let the model narrate the
* refusal and carry on guessing, instead of waiting for the user to answer.
* The check runs again after a grant because the user may pick a different
* folder than the one that was asked for. Callers still run their own
* existence / symlink check afterwards.
*/
async function ensureLocalAccess(projectId, filePath, chatTabId) {
  if (await isAgentToolResultPath(filePath)) return agentResultErrorResult(new AgentResultError("AGENT_RESULT_OPERATION_UNSUPPORTED", "Use local_read to read the current run's result; this operation cannot access internal results."));
  const access = getProjectAccessContext(projectId);
  if (access.projectRoot && access.mode === "disabled") return {
    isError: true,
    content: [{ type: "text", text: "Project file access is disabled. Ask the user to enable it in project settings before continuing. Do not request another folder." }]
  };
  const check = () => filePath ? isPathInSharedFolder(filePath, projectId, chatTabId) : getAllowedLocalPaths(projectId, chatTabId).length > 0;
  if (await check()) return null;
  const target = filePath ? `\`${filePath}\`` : "a folder on the local filesystem";
  if (mcpEvents.listenerCount("local_access_needed") === 0) return {
    isError: true,
    content: [{
      type: "text",
      text: `Access denied: ${target} is not in a folder shared with Bingo. Ask the user to add it from the + menu in the Bingo chat, then retry.`
    }]
  };
  const decision = await requestFolderAccess(projectId, filePath, chatTabId);
  if (decision.granted && (await check())) return null;
  return {
    isError: true,
    content: [{
      type: "text",
      text: decision.granted ? `The user shared a folder, but ${target} is still outside it. Stop and ask them which folder holds the files you need. Do not retry other paths.` : decision.reason === "timeout" ? `Still waiting on the user to share ${target}. Stop here and ask them to grant folder access when they're ready. Do not retry.` : `The user declined access to ${target}. Stop and ask them how they'd like to proceed. Do not retry this or any other local path.`
    }]
  };
}
var projectComponentIndex = new Map();
function setProjectComponentIndex(projectId, index) {
  projectComponentIndex.set(projectId, index);
}
/** Validate a lexical path before touching disk. Realpath checks below handle symlink escapes. */
function isPathLexicallyAllowed(filePath, projectId, chatTabId) {
  const allowed = getAllowedLocalPaths(projectId, chatTabId);
  if (allowed.length === 0) return false;
  const resolved = (0, path.resolve)(filePath);
  return allowed.some(dir => resolved.startsWith((0, path.resolve)(dir) + "/") || resolved === (0, path.resolve)(dir));
}
async function getAllowedRealRoots(projectId, chatTabId) {
  const allowed = getAllowedLocalPaths(projectId, chatTabId);
  const roots = [];
  for (const dir of allowed) try {
    roots.push(await (0, fs_promises.realpath)(dir));
  } catch {}
  return roots;
}
function isWithinRealRoots(realPath, roots) {
  return roots.some(root => realPath === root || realPath.startsWith(root + "/"));
}
/** Validate an existing path after resolving symlinks. */
async function isExistingPathAllowed(filePath, projectId, chatTabId) {
  if (!isPathLexicallyAllowed(filePath, projectId, chatTabId)) return false;
  try {
    const [target, roots] = await Promise.all([(0, fs_promises.realpath)(filePath), getAllowedRealRoots(projectId, chatTabId)]);
    return isWithinRealRoots(target, roots);
  } catch {
    return false;
  }
}
/** Validate a write destination. Existing files use their target realpath; new files use parent dir realpath. */
async function isWritePathAllowed(filePath, projectId, chatTabId) {
  if (getProjectAccessContext(projectId).mode !== "edit") return false;
  if (!isPathLexicallyAllowed(filePath, projectId, chatTabId)) return false;
  const roots = await getAllowedRealRoots(projectId, chatTabId);
  try {
    return isWithinRealRoots(await (0, fs_promises.realpath)(filePath), roots);
  } catch {
    try {
      return isWithinRealRoots(await (0, fs_promises.realpath)((0, path.dirname)(filePath)), roots);
    } catch {
      return false;
    }
  }
}
/** Recursively list files in a directory (respecting gitignore-like patterns). Fallback only — prefer ripgrep. */
async function walkDir(dir, base, results, maxFiles = 5e4) {
  if (results.length >= maxFiles) return;
  const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "out", ".cache", ".turbo", "coverage", "target", "__pycache__"]);
  let entries;
  try {
    entries = await (0, fs_promises.readdir)(dir, {
      withFileTypes: true
    });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (results.length >= maxFiles) return;
    const fullPath = (0, path.join)(dir, entry.name);
    const relPath = (0, path.relative)(base, fullPath);
    if (entry.isSymbolicLink()) continue;else if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      await walkDir(fullPath, base, results, maxFiles);
    } else results.push(relPath);
  }
}
function logResultAccess(ctx, decision, reason?, bytesRead = 0) {
  void recordDiagnosticEvent({ source: "mcpServer", eventName: "agent_result_access", projectId: ctx?.projectId,
    chatId: ctx?.chatTabId, runId: ctx?.chatRunId, level: decision === "read" ? "info" : "warn",
    payload: { decision, reason, bytesRead } });
}
export async function handleLocalRead(_projectId, args, chatTabId, _sessionId?, toolContext?) {
  const filePath = args.file_path;
  if (typeof filePath !== "string" || !path.isAbsolute(filePath)) return {
    isError: true,
    content: [{
      type: "text",
      text: "file_path must be an absolute path"
    }]
  };
  try {
    if ((await classifyToolResultPath(toolContext, filePath)).kind === "owned") {
      const budget = { remaining: RESULT_MAX_BYTES };
      const result = await readOwnedToolResult(toolContext, filePath, args, budget);
      result.assertActive();
      logResultAccess(toolContext, "read", undefined, RESULT_MAX_BYTES - budget.remaining);
      return { content: [{ type: "text", text: result.text }] };
    }
  } catch (error) {
    const result = agentResultErrorResult(error);
    logResultAccess(toolContext, "denied", result.reason);
    return result;
  }
  const denied = await ensureLocalAccess(_projectId, filePath, chatTabId);
  if (denied) return denied;
  if (!(await isExistingPathAllowed(filePath, _projectId, chatTabId))) return denyPath(filePath);
  try {
    const content = await (0, fs_promises.readFile)(filePath, "utf-8");
    if (!content) return {
      content: [{
        type: "text",
        text: "(empty file)"
      }]
    };
    return {
      content: [{
        type: "text",
        text: sliceLines(content, filePath, args.offset, args.limit)
      }]
    };
  } catch (err) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Failed to read: ${err.message}`
      }]
    };
  }
}
export async function handleLocalReadBatch(_projectId, args, chatTabId, _sessionId?, toolContext?) {
  const filePaths = args.file_paths;
  if (!Array.isArray(filePaths) || filePaths.length === 0) return {
    isError: true,
    content: [{
      type: "text",
      text: "file_paths is required (1-10 absolute paths)"
    }]
  };
  if (filePaths.length > 10) return {
    isError: true,
    content: [{
      type: "text",
      text: `Too many files (${filePaths.length}). Max 10 per batch.`
    }]
  };
  if (filePaths.some(filePath => typeof filePath !== "string" || !path.isAbsolute(filePath))) return {
    isError: true,
    content: [{
      type: "text",
      text: "every file_paths entry must be a non-empty absolute path"
    }]
  };
  let classified;
  try {
    classified = await Promise.all(filePaths.map(file => classifyToolResultPath(toolContext, file)));
    if (classified.some(item => item.kind === "owned")) validateResultRange(args);
  } catch (error) {
    const result = agentResultErrorResult(error);
    logResultAccess(toolContext, "denied", result.reason);
    return result;
  }
  for (const [index, filePath] of filePaths.entries()) {
    if (classified[index].kind === "owned") continue;
    const denied = await ensureLocalAccess(_projectId, filePath, chatTabId);
    if (denied) return denied;
  }
  const deniedIndex = (await Promise.all(filePaths.map((filePath, index) => classified[index].kind === "owned" || isExistingPathAllowed(filePath, _projectId, chatTabId)))).findIndex(isAllowed => !isAllowed);
  if (deniedIndex !== -1) return denyPath(filePaths[deniedIndex]);
  const budget = { remaining: RESULT_MAX_BYTES };
  const internalReads = [];
  const texts = [];
  try {
    for (const [index, filePath] of filePaths.entries()) {
      if (classified[index].kind === "owned") {
        const result = await readOwnedToolResult(toolContext, filePath, args, budget);
        internalReads.push(result);
        texts.push(result.text);
      } else {
        try {
          const content = await (0, fs_promises.readFile)(filePath, "utf-8");
          texts.push(content ? sliceLines(content, filePath, args.offset, args.limit) : `File: ${filePath}\n(empty file)`);
        } catch (error) { texts.push(`File: ${filePath}\n[read failed: ${error.message}]`); }
      }
    }
    for (const result of internalReads) result.assertActive();
    if (internalReads.length) logResultAccess(toolContext, "read", undefined, RESULT_MAX_BYTES - budget.remaining);
  } catch (error) {
    const result = agentResultErrorResult(error);
    logResultAccess(toolContext, "denied", result.reason);
    return result;
  }
  return {
    content: [{
      type: "text",
      text: texts.join("\n\n")
    }]
  };
}
export async function handleLocalWrite(_projectId, args, chatTabId) {
  const internalDenied = await rejectInternalResultOperation("local_write", args);
  if (internalDenied) return internalDenied;
  const filePath = args.file_path;
  const content = args.content;
  if (!filePath || content === void 0) return {
    isError: true,
    content: [{
      type: "text",
      text: "file_path and content are required"
    }]
  };
  const denied = await ensureLocalAccess(_projectId, filePath, chatTabId);
  if (denied) return denied;
  if (!(await isWritePathAllowed(filePath, _projectId, chatTabId))) return denyPath(filePath);
  try {
    await (0, fs_promises.mkdir)((0, path.dirname)(filePath), {
      recursive: true
    });
    await (0, fs_promises.writeFile)(filePath, content, "utf-8");
    return {
      content: [{
        type: "text",
        text: `Written: ${filePath}`
      }]
    };
  } catch (err) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Failed to write: ${err.message}`
      }]
    };
  }
}
async function handleLocalEdit(_projectId, args, chatTabId) {
  const internalDenied = await rejectInternalResultOperation("local_edit", args);
  if (internalDenied) return internalDenied;
  const filePath = args.file_path;
  const oldText = args.old_string;
  const newText = args.new_string;
  if (!filePath || oldText === void 0 || newText === void 0) return {
    isError: true,
    content: [{
      type: "text",
      text: "file_path, old_string, and new_string are required"
    }]
  };
  if (oldText === newText) return {
    isError: true,
    content: [{
      type: "text",
      text: "old_string and new_string are identical — nothing to change"
    }]
  };
  const denied = await ensureLocalAccess(_projectId, filePath, chatTabId);
  if (denied) return denied;
  if (!(await isWritePathAllowed(filePath, _projectId, chatTabId))) return denyPath(filePath);
  try {
    const content = await (0, fs_promises.readFile)(filePath, "utf-8");
    if (!content.includes(oldText)) return {
      isError: true,
      content: [{
        type: "text",
        text: `old_string not found in ${filePath}. Make sure you read the file first and use the exact text including whitespace/indentation.`
      }]
    };
    if (args.replace_all) {
      const parts = content.split(oldText);
      const count = parts.length - 1;
      await (0, fs_promises.writeFile)(filePath, parts.join(newText), "utf-8");
      return {
        content: [{
          type: "text",
          text: `Edited: ${filePath} (replaced ${count} occurrences)`
        }]
      };
    }
    const firstIdx = content.indexOf(oldText);
    const secondIdx = content.indexOf(oldText, firstIdx + 1);
    if (secondIdx !== -1) return {
      isError: true,
      content: [{
        type: "text",
        text: `old_string is not unique in ${filePath} (found at lines ${content.slice(0, firstIdx).split("\n").length} and ${content.slice(0, secondIdx).split("\n").length}). Include more surrounding context to make it unique, or use replace_all to replace all occurrences.`
      }]
    };
    await (0, fs_promises.writeFile)(filePath, content.replace(oldText, newText), "utf-8");
    return {
      content: [{
        type: "text",
        text: `Edited: ${filePath}`
      }]
    };
  } catch (err) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Failed to edit: ${err.message}`
      }]
    };
  }
}
export async function handleLocalFolders(_projectId, _args, chatTabId) {
  const noFolders = await ensureLocalAccess(_projectId, void 0, chatTabId);
  if (noFolders) return noFolders;
  return {
    content: [{
      type: "text",
      text: `Folders you can ${getProjectAccessContext(_projectId).mode === "read-only" ? "read (read-only)" : "read and write"}:\n${getAllowedLocalPaths(_projectId, chatTabId).map(dir => `- ${dir}`).join("\n")}`
    }]
  };
}
async function handleLocalGlob(_projectId, args, chatTabId) {
  const internalDenied = await rejectInternalResultOperation("local_glob", args);
  if (internalDenied) return internalDenied;
  const pattern = args.pattern || "**/*";
  const headLimit = args.head_limit ?? 500;
  const noFolders = await ensureLocalAccess(_projectId, void 0, chatTabId);
  if (noFolders) return noFolders;
  const scope = resolveGlobScope(pattern, getAllowedLocalPaths(_projectId, chatTabId));
  const rgPath = await findRipgrep();
  if (rgPath) try {
    const rgArgs = ["--files", "--hidden", "--no-messages"];
    for (const g of IGNORE_GLOBS) rgArgs.push("-g", g);
    rgArgs.push("-g", scope.pattern);
    rgArgs.push(...scope.roots);
    const {
      stdout
    } = await execFileAsync$3(rgPath, rgArgs, {
      maxBuffer: 52428800
    });
    const matches = stdout.split("\n").filter(Boolean).sort();
    if (matches.length === 0) return {
      content: [{
        type: "text",
        text: `No files matching: ${pattern}`
      }]
    };
    const truncated = headLimit > 0 && matches.length > headLimit;
    const shown = truncated ? matches.slice(0, headLimit) : matches;
    const truncNote = truncated ? `\n... (${matches.length - headLimit} more files, use head_limit to see more)` : "";
    return {
      content: [{
        type: "text",
        text: shown.join("\n") + truncNote
      }]
    };
  } catch (err) {
    if (err.code === 1) return {
      content: [{
        type: "text",
        text: `No files matching: ${pattern}`
      }]
    };
    console.warn("[MCP] ripgrep glob failed, falling back to JS walker:", err.message);
  }
  const re = globToRegex(pattern);
  const allMatches = [];
  for (const dir of scope.roots) {
    const files = [];
    await walkDir(dir, dir, files);
    for (const f of files) {
      const absPath = (0, path.join)(dir, f);
      if (re.test(f) || re.test(absPath)) allMatches.push(absPath);
    }
  }
  allMatches.sort();
  if (allMatches.length === 0) return {
    content: [{
      type: "text",
      text: `No files matching: ${pattern}`
    }]
  };
  const truncated = headLimit > 0 && allMatches.length > headLimit;
  const shown = truncated ? allMatches.slice(0, headLimit) : allMatches;
  const truncNote = truncated ? `\n... (${allMatches.length - headLimit} more files, use head_limit to see more)` : "";
  return {
    content: [{
      type: "text",
      text: shown.join("\n") + truncNote
    }]
  };
}
async function handleLocalGrep(_projectId, args, chatTabId) {
  const internalDenied = await rejectInternalResultOperation("local_grep", args);
  if (internalDenied) return internalDenied;
  const pattern = args.pattern;
  if (!pattern) return {
    isError: true,
    content: [{
      type: "text",
      text: "pattern is required"
    }]
  };
  const noFolders = await ensureLocalAccess(_projectId, void 0, chatTabId);
  if (noFolders) return noFolders;
  const allowed = getAllowedLocalPaths(_projectId, chatTabId);
  const outputMode = args.output_mode || "content";
  const headLimit = args.head_limit ?? 250;
  const contextBefore = args.context_before ?? args.context ?? 0;
  const contextAfter = args.context_after ?? args.context ?? 0;
  const rgPath = await findRipgrep();
  if (rgPath) try {
    const rgArgs = ["--hidden", "--no-messages"];
    for (const g of IGNORE_GLOBS) rgArgs.push("-g", g);
    if (args.case_insensitive) rgArgs.push("-i");
    if (args.glob) rgArgs.push("-g", args.glob);
    if (outputMode === "files_with_matches") rgArgs.push("-l");else if (outputMode === "count") rgArgs.push("-c");else {
      rgArgs.push("-n");
      if (contextBefore > 0) rgArgs.push("-B", String(contextBefore));
      if (contextAfter > 0) rgArgs.push("-A", String(contextAfter));
    }
    rgArgs.push("-e", pattern);
    rgArgs.push(...allowed);
    const {
      stdout
    } = await execFileAsync$3(rgPath, rgArgs, {
      maxBuffer: 52428800
    });
    const lines = stdout.split("\n").filter(Boolean);
    if (lines.length === 0) return {
      content: [{
        type: "text",
        text: `No matches for: ${pattern}`
      }]
    };
    const truncated = headLimit > 0 && lines.length > headLimit;
    const shown = truncated ? lines.slice(0, headLimit) : lines;
    const truncNote = truncated ? `\n... (${lines.length - headLimit} more results, use head_limit to see more)` : "";
    return {
      content: [{
        type: "text",
        text: shown.join("\n") + truncNote
      }]
    };
  } catch (err) {
    if (err.code === 1) return {
      content: [{
        type: "text",
        text: `No matches for: ${pattern}`
      }]
    };
    console.warn("[MCP] ripgrep grep failed, falling back to JS walker:", err.message);
  }
  const TEXT_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md", ".mdx", ".html", ".yml", ".yaml", ".toml", ".txt", ".env", ".sh"]);
  const regex = new RegExp(pattern, args.case_insensitive ? "gi" : "g");
  const results = [];
  for (const dir of allowed) {
    const files = [];
    await walkDir(dir, dir, files);
    if (args.glob) {
      const filterRe = globToRegex(args.glob);
      files.splice(0, files.length, ...files.filter(f => filterRe.test(f) || filterRe.test((0, path.join)(dir, f))));
    }
    for (const f of files) {
      if (headLimit > 0 && results.length >= headLimit) break;
      const ext = "." + f.split(".").pop();
      if (!TEXT_EXTS.has(ext)) continue;
      const absPath = (0, path.join)(dir, f);
      try {
        const fileLines = (await (0, fs_promises.readFile)(absPath, "utf-8")).split("\n");
        const matchedLineNums = new Set();
        for (let i = 0; i < fileLines.length; i++) if (regex.test(fileLines[i])) {
          matchedLineNums.add(i);
          regex.lastIndex = 0;
        }
        if (matchedLineNums.size === 0) continue;
        if (outputMode === "files_with_matches") results.push(absPath);else if (outputMode === "count") results.push(`${absPath}:${matchedLineNums.size}`);else {
          const linesToShow = new Set();
          for (const lineNum of matchedLineNums) for (let c = Math.max(0, lineNum - contextBefore); c <= Math.min(fileLines.length - 1, lineNum + contextAfter); c++) linesToShow.add(c);
          const sortedLines = [...linesToShow].sort((a, b) => a - b);
          let lastLine = -2;
          for (const lineNum of sortedLines) {
            if (headLimit > 0 && results.length >= headLimit) break;
            if (lineNum > lastLine + 1 && lastLine >= 0) results.push("--");
            const prefix = matchedLineNums.has(lineNum) ? ":" : "-";
            results.push(`${absPath}:${lineNum + 1}${prefix} ${fileLines[lineNum]}`);
            lastLine = lineNum;
          }
        }
      } catch {}
    }
  }
  if (results.length === 0) return {
    content: [{
      type: "text",
      text: `No matches for: ${pattern}`
    }]
  };
  return {
    content: [{
      type: "text",
      text: results.join("\n")
    }]
  };
}
async function handleSearchComponents(projectId, args) {
  const index = currentComponentIndex(projectId);
  const buildIssues = componentBuildIssueSummary(projectId);
  if (!index || Object.keys(index).length === 0) return {
    content: [{
      type: "text",
      text: buildIssues + "No indexed components are available. This is not proof that the source has no components. Inspect actual project source directories (including ui/), exports and registration state with targeted project_glob/project_read before writing substitutes."
    }]
  };
  const query = (args.query || "").toLowerCase().trim();
  const matched = findComponentCandidates(index, query);
  if (matched.length === 0) return {
    content: [{
      type: "text",
      text: buildIssues + `No indexed candidates for "${args.query}". Try source synonyms and targeted project_glob/project_grep; check registration before concluding that a component is absent.`
    }]
  };
  const grouped = new Map();
  for (const [name, info] of matched) {
    const dir = info.path.split("/").slice(0, -1).join("/") || ".";
    const line = formatComponentSearchLine(name, info.path, info.props);
    if (!grouped.has(dir)) grouped.set(dir, []);
    grouped.get(dir).push(line);
  }
  const lines = [`${matched.length} component candidates${query ? ` for "${args.query}"` : ""}. Name/synonym matches do not prove API compatibility; read source props and existing compositions before use.\n`];
  for (const [dir, items] of grouped) {
    lines.push(`${dir}/`);
    lines.push(...items);
  }
  return {
    content: [{
      type: "text",
      text: buildIssues + lines.join("\n")
    }]
  };
}
function currentComponentIndex(projectId) {
  // Local imports/rebuilds change the catalog during a chat. Read the compiler's
  // current snapshot, including an empty one, rather than reviving deleted exports
  // from the index captured when the chat started.
  return path.isAbsolute(projectId) ? componentIndexFor(projectId) : projectComponentIndex.get(projectId) ?? {};
}
function componentBuildIssueSummary(projectId) {
  const issues = path.isAbsolute(projectId) ? buildIssuesFor(projectId) : [];
  return issues.length ? `BUILD FAILURES (${issues.length}):\n${issues.slice(0, 12).map(issue => String(issue).slice(0, 500)).join("\n")}\nFix dependency/alias/CSS resolution before substituting components.\n\n` : "";
}
async function handleGetTheme(projectId, _args) {
  const summary = await getProjectThemeSummary(projectId);
  if (!summary) return {
    content: [{
      type: "text",
      text: "No project theme found (looked for app/globals.css and common alternatives). Prefer Tailwind theme classes once tokens exist."
    }]
  };
  return {
    content: [{
      type: "text",
      text: summary
    }]
  };
}
function textFromToolResult(result) {
  if (!Array.isArray(result?.content)) return "";
  return result.content.filter(block => block?.type === "text" && typeof block.text === "string").map(block => block.text).join("\n");
}
/** Keep a project name with braces or angle brackets from breaking the scaffold JSX. */
function escapeJsxText(text) {
  return text.replace(/[{}<>]/g, " ").replace(/\s+/g, " ").trim();
}
function createdElementIdsFromResult(result) {
  return getCreatedCanvasElementIds("canvas_add", result) ?? [];
}
async function handleGetDesignContext(projectId, _args) {
  const [theme, pagesResult] = await Promise.all([getProjectThemeSummary(projectId), handleCanvasList(projectId, {})]);
  const index = currentComponentIndex(projectId);
  const componentEntries = Object.entries(index);
  const shownComponents = componentEntries.slice(0, 80).map(([name, info]) => formatComponentSearchLine(name, info.path, info.props));
  const componentSummary = shownComponents.length > 0 ? `${shownComponents.length}/${componentEntries.length} indexed components shown (source coverage not guaranteed). Inspect source/compositions for semantic purpose, compound children and API details:\n${shownComponents.join("\n")}${componentEntries.length > shownComponents.length ? `\n... (${componentEntries.length - shownComponents.length} more; use targeted search_components)` : ""}` : "Component index empty or unavailable. Inspect source directories and registration state; this does not establish an empty project.";
  const pages = textFromToolResult(pagesResult) || "Canvas page information unavailable.";
  return {
    content: [{
      type: "text",
      text: [`THEME\n${theme || "No project theme yet. If this is an import, write the source tokens into app/globals.css first, then style the canvas with the utilities they generate — do not build a parallel inline-style system."}`, `COMPONENTS\n${componentBuildIssueSummary(projectId)}${componentSummary}`, `CANVAS\n${pages}`].join("\n\n")
    }]
  };
}
var lastUnreachableNotice = new Map();
var UNREACHABLE_NOTICE_INTERVAL_MS = 6e4;
/**
* An external agent can work for many minutes before the user looks at the
* app again. If its canvas edits are going nowhere, say so on the first
* failure rather than letting them come back to an untouched canvas.
*/
function notifyCanvasUnreachable(projectId, projectName) {
  if (!electron.Notification.isSupported()) return;
  const last = lastUnreachableNotice.get(projectId) ?? 0;
  if (Date.now() - last < UNREACHABLE_NOTICE_INTERVAL_MS) return;
  lastUnreachableNotice.set(projectId, Date.now());
  const notification = new electron.Notification({
    title: "Bingo canvas unreachable",
    body: `An agent tried to edit "${projectName}" but its window is not open. No changes were applied.`,
    silent: false
  });
  notification.on("click", () => focusProjectWindow(projectId));
  notification.show();
}
/**
* Say which project could not be reached and how to recover. Canvas work used
* to fall back to `BrowserWindow.getAllWindows()[0]`, which silently applied
* edits to whichever project happened to be in the first window; failing is
* correct, but the failure has to reach both the agent and the user.
*/
async function noWindowError(projectId, action) {
  const name = await fetchProjectName(projectId);
  notifyCanvasUnreachable(projectId, name);
  return {
    isError: true,
    content: [{
      type: "text",
      text: getOpenProjectIds().includes(projectId) ? `Cannot ${action}: project "${name}" is open but its window is not responding. Focus that window in Bingo and retry.` : `Cannot ${action}: project "${name}" is not open in Bingo. Stop and tell the user — do not retry this or any further canvas call until they reopen it.`
    }]
  };
}
/**
* The window registered for this project, or — when exactly one project is
* open — that one. A single open project is unambiguous, so this recovers from
* an id-format mismatch in the window registry without ever guessing between
* projects. Cross-project writes stay impossible: the renderer compares the
* request's projectId against its own canvas and rejects a mismatch.
*/
function resolveProjectWindow(projectId) {
  const registered = findWindowForProject(projectId);
  if (registered && !registered.webContents.isDestroyed()) return registered;
  const openIds = getOpenProjectIds();
  if (openIds.length !== 1) return null;
  const only = findWindowForProject(openIds[0]);
  return only && !only.webContents.isDestroyed() ? only : null;
}

function stableCanvasValue(value) {
  if (Array.isArray(value)) return value.map(stableCanvasValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().filter(key => !key.startsWith("__") && key !== "operation_id").map(key => [key, stableCanvasValue(value[key])]));
}

function canvasPayloadHash(operation, args) {
  return (0, crypto$1.createHash)("sha256").update(JSON.stringify({
    operation,
    args: stableCanvasValue(args)
  })).digest("hex");
}

function canvasSourceKey(projectId, args) {
  if (typeof args?.__mcp_session_id === "string" && args.__mcp_session_id) return `session:${args.__mcp_session_id}`;
  if (typeof args?.chat_tab_id === "string" && args.chat_tab_id) return `chat:${args.chat_tab_id}`;
  return `project:${projectId}`;
}

function canvasOperationError(errorCode, text, operationId, applied = false) {
  return {
    isError: true,
    content: [{ type: "text", text }],
    structuredContent: {
      operation: {
        protocolVersion: CANVAS_OPERATION_PROTOCOL_VERSION,
        operationId,
        errorCode,
        applied
      }
    }
  };
}

function rendererCanvasArgs(args) {
  return Object.fromEntries(Object.entries(args ?? {}).filter(([key]) => !key.startsWith("__") && key !== "operation_id"));
}
/** Send a canvas operation to the renderer and wait for the result */
async function sendCanvasOperation(projectId, operation, args) {
  if (isChatCancelled(projectId, typeof args?.chat_tab_id === "string" ? args.chat_tab_id : void 0)) return {
    isError: true,
    content: [{
      type: "text",
      text: "Stopped"
    }]
  };
  const target = resolveProjectWindow(projectId);
  if (!target) return noWindowError(projectId, `apply ${operation}`);
  if (CANVAS_WRITE_OPERATIONS.has(operation)) {
    ensureCanvasResultListener();
    const suppliedOperationId = typeof args?.operation_id === "string" ? args.operation_id.trim() : "";
    if (suppliedOperationId && !/^[A-Za-z0-9_-]{1,128}$/.test(suppliedOperationId)) return canvasOperationError("CANVAS_INVALID_OPERATION_ID", "operation_id must contain 1-128 letters, numbers, underscores, or hyphens.", suppliedOperationId);
    const operationId = suppliedOperationId || (0, crypto$1.randomUUID)();
    const requestId = (0, crypto$1.randomUUID)();
    const begin = canvasOperationRegistry.begin({
      operationId,
      requestId,
      projectId,
      chatTabId: typeof args?.chat_tab_id === "string" ? args.chat_tab_id : null,
      toolName: CANVAS_PUBLIC_TOOL_NAMES[operation] ?? operation,
      requestedCanvasId: typeof args?.canvas_id === "string" ? args.canvas_id : null,
      parentElementId: typeof args?.parent_id === "string" ? args.parent_id : null,
      claimId: typeof args?.claim_id === "string" ? args.claim_id : null,
      claimNew: args?.__claim_new === true,
      sourceKey: canvasSourceKey(projectId, args),
      payloadHash: canvasPayloadHash(operation, args),
      targetWebContentsId: target.webContents.id,
      displayArgs: Object.fromEntries(Object.entries(rendererCanvasArgs(args)).filter(([key]) => key !== "jsx" && key !== "old_string" && key !== "new_string"))
    });
    if (begin.kind === "conflict") return canvasOperationError("CANVAS_IDEMPOTENCY_CONFLICT", `operation_id ${operationId} was already used with different parameters or by a different session.`, operationId);
    if (begin.kind === "capacity") return canvasOperationError("CANVAS_OPERATION_CAPACITY", "Too many unresolved canvas operations. Check their status before starting another write.", operationId);
    if (begin.kind === "existing") {
      if (begin.result) return begin.result;
      return canvasOperationRegistry.wait(projectId, operationId, CANVAS_WRITE_WAIT_MS);
    }
    recordDiagnosticEvent({
      source: "mcpServer",
      eventName: "canvas.operation.requested",
      projectId,
      operationId,
      payload: {
        requestId,
        toolName: operation,
        requestedCanvasId: begin.entry.requestedCanvasId,
        inputBytes: Buffer.byteLength(JSON.stringify(rendererCanvasArgs(args)))
      }
    });
    canvasOperationRegistry.markSent(projectId, operationId);
    target.webContents.send("canvas_tool_request", {
      protocolVersion: CANVAS_OPERATION_PROTOCOL_VERSION,
      operationId,
      requestId,
      projectId,
      operation,
      args: rendererCanvasArgs(args)
    });
    const result = await canvasOperationRegistry.wait(projectId, operationId, CANVAS_WRITE_WAIT_MS);
    if (result?.structuredContent?.operation?.errorCode === "CANVAS_RESULT_UNCONFIRMED") recordDiagnosticEvent({
      source: "mcpServer",
      eventName: "canvas.operation.result_unconfirmed",
      level: "warn",
      projectId,
      operationId,
      durationMs: CANVAS_WRITE_WAIT_MS,
      payload: { requestId, toolName: operation }
    });
    return result;
  }
  return new Promise(resolve => {
    const requestId = (0, crypto$1.randomUUID)();
    const timeout = setTimeout(() => {
      electron.ipcMain.removeListener("canvas_tool_result", handler);
      resolve({
        isError: true,
        content: [{
          type: "text",
          text: "Canvas operation timed out (10s)"
        }]
      });
    }, 1e4);
    const handler = (_, response) => {
      if (response.requestId === requestId) {
        clearTimeout(timeout);
        electron.ipcMain.removeListener("canvas_tool_result", handler);
        resolve(response.result);
      }
    };
    electron.ipcMain.on("canvas_tool_result", handler);
    target.webContents.send("canvas_tool_request", {
      requestId,
      projectId,
      operation,
      args
    });
  });
}
var DRAW_PREVIEW_MIN_JSX = 24;
var drawPreviewTimers = new Map();
/** Paint incomplete canvas JSX while the tool arguments are still streaming in. */
function enqueueCanvasDrawPreview(projectId, args) {
  if (isChatCancelled(projectId, args.chat_tab_id)) return;
  const jsx = args.jsx;
  if (!jsx || jsx.trim().length < DRAW_PREVIEW_MIN_JSX) return;
  if (args.element_id && !args.parent_id && !args.before_id && !args.after_id) return;
  const key = `${projectId}:${args.stream_id ?? args.chat_tab_id ?? "default"}`;
  const pending = drawPreviewTimers.get(key);
  if (pending) clearTimeout(pending);
  drawPreviewTimers.set(key, setTimeout(() => {
    drawPreviewTimers.delete(key);
    sendCanvasOperation(projectId, "preview_draw", {
      jsx,
      stream_id: args.stream_id ?? args.chat_tab_id ?? "default",
      parent_id: args.parent_id,
      before_id: args.before_id,
      after_id: args.after_id,
      chat_tab_id: args.chat_tab_id,
      issued_at: Date.now()
    }).catch(() => {});
  }, 48));
}
function cancelCanvasDrawPreview(projectId, streamId) {
  const match = streamId ? `${projectId}:${streamId}` : `${projectId}:`;
  for (const [key, timer] of drawPreviewTimers) if (key === match || key.startsWith(match)) {
    clearTimeout(timer);
    drawPreviewTimers.delete(key);
  }
}
function maybePreviewPartialMcpBody(projectId, body, chatTabId) {
  if (!projectId) return;
  if (!isCanvasDrawToolName(extractPartialMcpToolName(body))) return;
  enqueueCanvasDrawPreview(projectId, {
    ...extractPartialCanvasDrawArgs(body),
    stream_id: chatTabId ?? "mcp",
    chat_tab_id: chatTabId
  });
}
async function handleScreenshot(projectId, args) {
  const win = resolveProjectWindow(projectId);
  if (!win) return noWindowError(projectId, "take a screenshot");
  const requestId = (0, crypto$1.randomUUID)();
  const elementId = args.element_id;
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      electron.ipcMain.removeListener("screenshot_result", handler);
      resolve({
        isError: true,
        content: [{
          type: "text",
          text: "Screenshot renderer did not respond within 12s"
        }]
      });
    }, 12e3);
    const handler = async (_, response) => {
      if (response.requestId === requestId) {
        clearTimeout(timeout);
        electron.ipcMain.removeListener("screenshot_result", handler);
        if (!response.dataUrl && response.nativeCaptureRect) try {
          const image = await win.webContents.capturePage(response.nativeCaptureRect);
          if (!image.isEmpty()) {
            const pngBase64 = toPngBase64(image);
            const dataUrl = `data:image/png;base64,${pngBase64}`;
            mcpEvents.emit("screenshot_captured", {
              projectId,
              dataUrl,
              elementId
            });
            markClaimsVerified(await resolveClaimsCoveringElement(projectId, elementId));
            resolve({
              content: [{
                type: "image",
                data: pngBase64,
                mimeType: "image/png"
              }, {
                type: "text",
                text: "Screenshot captured with Electron fallback"
              }]
            });
            return;
          }
        } catch (err) {
          console.warn("[MCP Screenshot] native capture failed:", err);
        }
        if (!response.dataUrl && response.iframeUrl) {
          try {
            const {
              width,
              height
            } = response.iframeSize || {
              width: 1200,
              height: 800
            };
            const offscreen = new electron.BrowserWindow({
              width: width || 1200,
              height: height || 800,
              show: false,
              webPreferences: {
                offscreen: true
              }
            });
            try {
              await offscreen.loadURL(response.iframeUrl);
              await new Promise(r => setTimeout(r, 1500));
              const fullHeight = await offscreen.webContents.executeJavaScript("Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)");
              if (fullHeight > (height || 800)) {
                offscreen.setSize(width || 1200, Math.min(fullHeight, 16e3));
                await new Promise(r => setTimeout(r, 500));
              }
              const pngBase64 = toPngBase64(await offscreen.webContents.capturePage());
              const dataUrl = `data:image/png;base64,${pngBase64}`;
              mcpEvents.emit("screenshot_captured", {
                projectId,
                dataUrl,
                elementId
              });
              markClaimsVerified(await resolveClaimsCoveringElement(projectId, elementId));
              resolve({
                content: [{
                  type: "image",
                  data: pngBase64,
                  mimeType: "image/png"
                }, {
                  type: "text",
                  text: `Screenshot of ${response.iframeUrl}`
                }]
              });
            } finally {
              offscreen.destroy();
            }
            return;
          } catch (err) {
            console.warn("[MCP Screenshot] iframe URL capture failed:", err);
          }
          resolve({
            isError: true,
            content: [{
              type: "text",
              text: "Screenshot capture failed — could not load iframe URL"
            }]
          });
          return;
        }
        if (!response.dataUrl) {
          if (!args.__render_retry) {
            setTimeout(() => {
              handleScreenshot(projectId, {
                ...args,
                __render_retry: true
              }).then(resolve).catch(err => resolve({
                isError: true,
                content: [{
                  type: "text",
                  text: `Screenshot capture failed on render retry: ${err?.message || err}`
                }]
              }));
            }, 250);
            return;
          }
          resolve({
            isError: true,
            content: [{
              type: "text",
              text: `Screenshot capture failed — element may not be visible${response.captureError ? ` (${response.captureError})` : ""}`
            }]
          });
          return;
        }
        const match = response.dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (match) {
          mcpEvents.emit("screenshot_captured", {
            projectId,
            dataUrl: response.dataUrl,
            elementId
          });
          markClaimsVerified(await resolveClaimsCoveringElement(projectId, elementId));
          resolve({
            content: [{
              type: "image",
              data: match[2],
              mimeType: match[1]
            }, {
              type: "text",
              text: "Screenshot captured"
            }]
          });
        } else resolve({
          content: [{
            type: "text",
            text: "Screenshot captured but encoding failed"
          }]
        });
      }
    };
    electron.ipcMain.on("screenshot_result", handler);
    win.webContents.send("screenshot_request_mcp", {
      requestId,
      elementId
    });
  });
}
async function handleSearchIcons(projectId, args) {
  if (!args.query) return {
    isError: true,
    content: [{
      type: "text",
      text: "query is required"
    }]
  };
  return sendCanvasOperation(projectId, "search_icons", {
    query: args.query
  });
}
function requestedIconLibraries(args) {
  const raw = args?.library ?? args?.libraries;
  return Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
}
async function iconLibraryRequestIsNoop(projectId, args) {
  try {
    const requested = requestedIconLibraries(args);
    if (requested.length === 0) return false;
    const settingsRes = await apiFetch$1(`/projects/${projectId}/settings`);
    if (!settingsRes.ok) return false;
    const settings = await settingsRes.json().catch(() => ({}));
    const enabled = Array.isArray(settings.effectiveIconLibraries) ? settings.effectiveIconLibraries : settings.iconLibraries;
    return Array.isArray(enabled) && requested.every(library => enabled.includes(library));
  } catch {
    return false;
  }
}
async function handleGetIconLibraries(projectId) {
  const settingsRes = await apiFetch$1(`/projects/${projectId}/settings`);
  if (!settingsRes.ok) return {
    isError: true,
    content: [{ type: "text", text: `Failed to inspect icon libraries: ${settingsRes.status}` }],
    structuredContent: { code: "ICON_LIBRARY_INSPECTION_FAILED", status: settingsRes.status }
  };
  const settings = await settingsRes.json().catch(() => ({}));
  const result = {
    effectiveIconLibraries: settings.effectiveIconLibraries ?? settings.iconLibraries ?? [],
    iconLibraries: settings.iconLibraries ?? [],
    iconLibraryPolicy: settings.iconLibraryPolicy ?? { mode: "auto", disabledLibraries: [] },
    discovery: settings._iconDiscovery ?? null,
    configuration: settings._configuration ?? null,
  };
  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }],
    structuredContent: result
  };
}
async function handleSetIconLibrary(projectId, args) {
  const requestedLibs = requestedIconLibraries(args);
  if (requestedLibs.length === 0) return {
    isError: true,
    content: [{
      type: "text",
      text: "library is required. Pass an npm package name or subpath import, e.g. lucide-react or @scope/icons-react."
    }],
    structuredContent: { code: "ICON_LIBRARY_REQUIRED" }
  };
  const invalid = requestedLibs.filter(l => !isLoadableIconLibrary(l));
  if (invalid.length > 0) return {
    isError: true,
    content: [{
      type: "text",
      text: `Invalid icon library package specifier: ${invalid.join(", ")}. Use an npm package name or subpath import.`
    }],
    structuredContent: { code: "ICON_LIBRARY_INVALID", libraries: invalid }
  };
  const settingsRes = await apiFetch$1(`/projects/${projectId}/settings`);
  const settings = settingsRes.ok ? await settingsRes.json().catch(() => ({})) : {};
  const effectiveLibs = Array.isArray(settings.effectiveIconLibraries) ? settings.effectiveIconLibraries : settings.iconLibraries;
  if (Array.isArray(effectiveLibs) && requestedLibs.every(library => effectiveLibs.includes(library))) return {
    content: [{
      type: "text",
      text: `Icon libraries already included in the effective project list: ${requestedLibs.join(", ")}. No configuration was changed.`
    }],
    structuredContent: { code: "ICON_LIBRARY_ALREADY_EFFECTIVE", changed: false, libraries: requestedLibs }
  };
  if (settings?._configuration?.initializationRequired) return {
    isError: true,
    content: [{
      type: "text",
      text: "Project configuration storage has not been chosen. Stop and ask the user to open Project Settings → Configuration Storage and choose where to save it, then continue this import. Do not retry set_icon_library until that choice is saved."
    }],
    structuredContent: {
      code: "CONFIG_INITIALIZATION_REQUIRED",
      recoveryAction: "OPEN_PROJECT_SETTINGS_CONFIGURATION_STORAGE",
      libraries: requestedLibs
    }
  };
  const res = await apiFetch$1(`/projects/${projectId}/settings/icon-libraries`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      additions: requestedLibs
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Failed to set icon library: ${res.status} ${errText.slice(0, 200)}`
      }],
      structuredContent: { code: "ICON_LIBRARY_UPDATE_FAILED", status: res.status, libraries: requestedLibs }
    };
  }
  mcpEvents.emit("settings_changed", {
    projectId,
    key: "iconLibraries"
  });
  const updatedRes = await apiFetch$1(`/projects/${projectId}/settings`);
  const updated = updatedRes.ok ? await updatedRes.json().catch(() => ({})) : {};
  const effectiveIconLibraries = Array.isArray(updated.effectiveIconLibraries)
    ? updated.effectiveIconLibraries
    : Array.isArray(updated.iconLibraries) ? updated.iconLibraries : requestedLibs;
  return {
    content: [{
      type: "text",
      text: `Icon libraries enabled: ${requestedLibs.join(", ")}. Use <i data-icon="X" data-icon-library="${requestedLibs[0]}" /> in canvas JSX.`
    }],
    structuredContent: { code: "ICON_LIBRARY_ENABLED", changed: true, libraries: requestedLibs, effectiveIconLibraries }
  };
}
var ASSET_MIME_BY_EXT = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp4: "video/mp4",
  webm: "video/webm"
};
var MAX_ASSET_BYTES = 1e7;
async function handleProjectCopyAsset(projectId, args, chatTabId) {
  const localPath = args.local_path;
  const projectPath = args.project_path;
  if (!localPath || !projectPath) return {
    isError: true,
    content: [{
      type: "text",
      text: "local_path and project_path are required"
    }]
  };
  const denied = await ensureLocalAccess(projectId, localPath, chatTabId);
  if (denied) return denied;
  if (!(await isExistingPathAllowed(localPath, projectId, chatTabId))) return denyPath(localPath);
  let buffer;
  try {
    buffer = await (0, fs_promises.readFile)(localPath);
  } catch (err) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Failed to read ${localPath}: ${err.message}`
      }]
    };
  }
  if (buffer.length > MAX_ASSET_BYTES) return {
    isError: true,
    content: [{
      type: "text",
      text: `Asset too large: ${buffer.length} bytes (max ${MAX_ASSET_BYTES}). Compress or scale the image first.`
    }]
  };
  const mimeType = ASSET_MIME_BY_EXT[(localPath.split(".").pop() || "").toLowerCase()] || "application/octet-stream";
  const res = await apiFetch$1(`/import/assets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      projectId,
      assets: [{
        path: projectPath,
        data: buffer.toString("base64"),
        mimeType,
        size: buffer.length
      }]
    })
  });
  if (!res.ok) return mcpResultFromFailedResponse(res, `Upload failed (${res.status})`);
  const result = await res.json().catch(() => ({
    uploaded: 0,
    failed: [projectPath]
  }));
  if (result.failed && result.failed.length > 0) return {
    isError: true,
    content: [{
      type: "text",
      text: `Server rejected asset: ${result.failed.join(", ")}`
    }]
  };
  invalidateCache(projectId);
  return {
    content: [{
      type: "text",
      text: `Copied ${localPath} → ${projectPath} (${buffer.length} bytes, ${mimeType})`
    }]
  };
}
async function handleProjectCopyFile(projectId, args, chatTabId) {
  const parsed = normalizeProjectCopyFileArgs(args);
  if (!parsed.ok) return {
    isError: true,
    content: [{
      type: "text",
      text: parsed.error
    }]
  };
  const payloads = [];
  for (const pair of parsed.files) {
    const denied = await ensureLocalAccess(projectId, pair.local_path, chatTabId);
    if (denied) return denied;
    if (!(await isExistingPathAllowed(pair.local_path, projectId, chatTabId))) return denyPath(pair.local_path);
    let buffer;
    try {
      buffer = await (0, fs_promises.readFile)(pair.local_path);
    } catch (err) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Failed to read ${pair.local_path}: ${err.message}`
        }]
      };
    }
    const inspected = inspectLocalCopyBuffer(pair.project_path, buffer);
    if (!inspected.ok) return {
      isError: true,
      content: [{
        type: "text",
        text: inspected.error
      }]
    };
    payloads.push({
      ...pair,
      content: inspected.content
    });
  }
  const copied = [];
  for (const file of payloads) {
    const result = await handleWrite(projectId, {
      file_path: file.project_path,
      content: file.content
    });
    if (result?.isError) return result;
    copied.push(`${file.local_path} → ${file.project_path}`);
  }
  return {
    content: [{
      type: "text",
      text: `Copied ${copied.length} file${copied.length === 1 ? "" : "s"} (bytes stayed on the machine; the model did not re-type them):\n${copied.join("\n")}`
    }]
  };
}
async function handleCanvasList(projectId, _args) {
  return sendCanvasOperation(projectId, "list_pages", {});
}
async function handleCanvasCreatePage(projectId, args) {
  if (!args.name || typeof args.name !== "string") return {
    isError: true,
    content: [{
      type: "text",
      text: "name is required"
    }]
  };
  return sendCanvasOperation(projectId, "create_page", {
    name: args.name
  });
}
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function handleCanvasRead(projectId, args, chatTabId, sessionId) {
  if (!args.canvas_id) return {
    isError: true,
    content: [{
      type: "text",
      text: "canvas_id is required"
    }]
  };
  if (!UUID_RE.test(args.canvas_id)) return {
    isError: true,
    content: [{
      type: "text",
      text: `canvas_id '${args.canvas_id}' is not a valid UUID. Call canvas_list first to get the real IDs (they look like 'a1b2c3d4-e5f6-...').`
    }]
  };
  const readerKey = readerKeyFor({
    projectId,
    chatTabId,
    sessionId
  });
  const result = await sendCanvasOperation(projectId, "read_canvas", args);
  const hashes = result?._coveringReads;
  if (!result?.isError && readerKey && hashes && typeof hashes === "object" && !Array.isArray(hashes)) {
    for (const [elementId, subtreeHash] of Object.entries(hashes)) if (typeof subtreeHash === "string") recordCoveringRead(readerKey, elementId, subtreeHash);
  }
  if (result && "_coveringReads" in result) {
    const {
      _coveringReads: _,
      ...rest
    } = result;
    return rest;
  }
  return result;
}
async function handleCanvasAdd(projectId, args, chatTabId, sessionId) {
  cancelCanvasDrawPreview(projectId);
  if (!args.jsx) return {
    isError: true,
    content: [{
      type: "text",
      text: "jsx is required"
    }]
  };
  if (args.claim_new && (args.parent_id || args.claim_id)) return {
    isError: true,
    content: [{
      type: "text",
      text: "claim_new is only valid for an unclaimed root insertion; do not combine it with parent_id or claim_id."
    }]
  };
  if (args.parent_id && !args.claim_id) return {
    isError: true,
    content: [{
      type: "text",
      text: "claim_id is required when adding to a parent. Call canvas_claim on the parent element first."
    }]
  };
  if (args.claim_id) {
    const claimErr = assertLiveClaim(projectId, args.claim_id);
    if (claimErr) return claimErr;
  }
  const {
    claim_new: claimNew,
    ...canvasArgs
  } = args;
  const logicalOperationId = typeof canvasArgs.operation_id === "string" && canvasArgs.operation_id.trim() ? canvasArgs.operation_id.trim() : (0, crypto$1.randomUUID)();
  const autoClaimId = claimNew ? `claim-${(0, crypto$1.createHash)("sha256").update(logicalOperationId).digest("hex").slice(0, 32)}` : null;
  const operationArgs = {
    ...canvasArgs,
    operation_id: logicalOperationId,
    ...(autoClaimId ? {
      claim_id: autoClaimId,
      __claim_new: true
    } : {})
  };
  const enriched = withCanvasOperationSource(withChatTabId(operationArgs, chatTabId), sessionId);
  if (canvasArgs.canvas_id && !UUID_RE.test(canvasArgs.canvas_id)) return canvasOperationError("CANVAS_INVALID_TARGET", `canvas_id must be a valid canvas page UUID; received ${canvasArgs.canvas_id}. No canvas changes were applied.`, typeof canvasArgs.operation_id === "string" ? canvasArgs.operation_id : "");
  let result = await sendCanvasOperation(projectId, "add_to_canvas", enriched);
  if (!result?.isError && args.claim_id) markClaimMutated(args.claim_id);
  if (!result?.isError && claimNew && autoClaimId && !args.parent_id && !args.claim_id) {
    const rootId = createdElementIdsFromResult(result)[0];
    if (rootId) {
      return {
        ...result,
        content: [...(result.content ?? []), {
          type: "text",
          text: `claim_id: ${autoClaimId}`
        }],
        structuredContent: {
          ...(result.structuredContent ?? {}),
          operation: {
            ...(result.structuredContent?.operation ?? {}),
            claimId: autoClaimId
          }
        }
      };
    }
  }
  return result;
}
/**
* The import reference page's skeleton is fixed: a design-system column beside a
* page-recreation column, with the token/component sections in a known order.
* Building it here instead of describing it in the skill means the widths cannot
* drift, the empty columns cannot collapse to 0px, and the caller gets element
* ids as data rather than scraping them out of prose.
*/
var IMPORT_SCAFFOLD_SECTIONS = [{
  key: "colors",
  heading: "Color tokens",
  note: "every semantic colour token, each swatch drawn with the utility it documents"
}, {
  key: "typography",
  heading: "Typography",
  note: "the type scale in the source fonts"
}, {
  key: "spacing",
  heading: "Radius, spacing & motion",
  note: "radii, gutters, and transition tokens"
}, {
  key: "icons",
  heading: "Icons",
  note: "a representative set from the source icon pack"
}, {
  key: "components",
  heading: "Components",
  note: "one subsection per component you actually imported, by its real exported name"
}];
async function handleCreateImportScaffold(projectId, args, chatTabId, sessionId) {
  const title = typeof args.title === "string" && args.title.trim() ? args.title.trim() : null;
  if (!title) return {
    isError: true,
    content: [{
      type: "text",
      text: "title is required (the source project name)"
    }]
  };
  const tagline = typeof args.tagline === "string" ? args.tagline.trim() : "";
  const addOne = async (jsx, parentId, claimId) => {
    const addArgs = {
      jsx
    };
    if (parentId) addArgs.parent_id = parentId;
    if (claimId) addArgs.claim_id = claimId;
    const result = await sendCanvasOperation(projectId, "add_to_canvas", withCanvasOperationSource(withChatTabId(addArgs, chatTabId), sessionId));
    if (result?.isError) throw new Error(textFromToolResult(result) || "canvas add failed");
    const id = createdElementIdsFromResult(result)[0];
    if (!id) throw new Error("canvas add returned no element id");
    return id;
  };
  try {
    const rootId = await addOne("<div className=\"flex gap-16 p-12 bg-background text-foreground\"></div>");
    const claimResult = await handleCanvasClaim(projectId, {
      element_id: rootId
    }, chatTabId);
    if (claimResult?.isError) return {
      isError: true,
      content: [{
        type: "text",
        text: `Scaffold root was added (${rootId}) but could not be claimed: ${textFromToolResult(claimResult)}`
      }]
    };
    const claimId = parseClaimIdFromResult(claimResult);
    if (claimId) markClaimMutated(claimId);
    const designColumnId = await addOne("<div data-section=\"design-system\" className=\"flex flex-col gap-12 w-[1200px] min-h-[3200px]\"></div>", rootId, claimId);
    const pageColumnId = await addOne("<div data-section=\"page-recreation\" className=\"flex flex-col gap-8 w-[1400px] min-h-[3200px]\"></div>", rootId, claimId);
    await addOne(tagline ? `<header className="flex flex-col gap-2"><h1 className="text-4xl font-semibold">${escapeJsxText(title)}</h1><p className="text-base opacity-70">${escapeJsxText(tagline)}</p></header>` : `<header className="flex flex-col gap-2"><h1 className="text-4xl font-semibold">${escapeJsxText(title)}</h1></header>`, designColumnId, claimId);
    const sections = {};
    for (const section of IMPORT_SCAFFOLD_SECTIONS) sections[section.key] = await addOne(`<section data-section="${section.key}" className="flex flex-col gap-4"><h2 className="text-2xl font-semibold">${escapeJsxText(section.heading)}</h2></section>`, designColumnId, claimId);
    const fillOrder = IMPORT_SCAFFOLD_SECTIONS.map(section => `  ${section.key} (${sections[section.key]}) — ${section.note}`).join("\n");
    return {
      content: [{
        type: "text",
        text: ["Import scaffold created and claimed. Add into these ids with canvas_add(parent_id, claim_id);", "do not add another root element and do not position sections with margins.", "", JSON.stringify({
          claim_id: claimId,
          root_id: rootId,
          design_system_column_id: designColumnId,
          page_column_id: pageColumnId,
          sections
        }, null, 2), "", "Fill the design-system column in this order, one canvas_add per section:", fillOrder, "", `Then recreate one real source page inside ${pageColumnId}.`].join("\n")
      }]
    };
  } catch (err) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Failed to create import scaffold: ${err?.message || err}`
      }]
    };
  }
}
async function handleCanvasUpdate(projectId, args, chatTabId, sessionId) {
  cancelCanvasDrawPreview(projectId);
  if (!args.element_id || !args.jsx) return {
    isError: true,
    content: [{
      type: "text",
      text: "element_id and jsx are required"
    }]
  };
  if (!args.claim_id) return {
    isError: true,
    content: [{
      type: "text",
      text: "claim_id is required. Call canvas_claim on this element first."
    }]
  };
  const claimErr = assertLiveClaim(projectId, args.claim_id);
  if (claimErr) return claimErr;
  if (typeof args.jsx === "string" && jsxContainsTruncationStub(args.jsx)) return {
    isError: true,
    content: [{
      type: "text",
      text: "jsx contains bingo:truncated stubs from a truncated canvas_read. Drill with canvas_read on stub ids (or claim a smaller root) and send complete JSX without truncation stubs."
    }]
  };
  const result = await sendCanvasOperation(projectId, "update_element", withCanvasOperationSource(withChatTabId(args, chatTabId), sessionId));
  if (!result?.isError) markClaimMutated(args.claim_id);
  return result;
}
async function handleCanvasEdit(projectId, args, chatTabId, sessionId) {
  cancelCanvasDrawPreview(projectId);
  if (!args.element_id || args.old_string === void 0 || args.new_string === void 0) return {
    isError: true,
    content: [{
      type: "text",
      text: "element_id, old_string, and new_string are required"
    }]
  };
  if (!args.claim_id) return {
    isError: true,
    content: [{
      type: "text",
      text: "claim_id is required. Call canvas_claim on this element (or an ancestor) first."
    }]
  };
  const claimErr = assertLiveClaim(projectId, args.claim_id);
  if (claimErr) return claimErr;
  const result = await sendCanvasOperation(projectId, "edit_element", withCanvasOperationSource(withChatTabId(args, chatTabId), sessionId));
  if (!result?.isError) markClaimMutated(args.claim_id);
  return result;
}
async function handleCanvasInsert(projectId, args, chatTabId, sessionId) {
  cancelCanvasDrawPreview(projectId);
  if (!args.jsx) return {
    isError: true,
    content: [{
      type: "text",
      text: "jsx is required"
    }]
  };
  if (!args.claim_id) return {
    isError: true,
    content: [{
      type: "text",
      text: "claim_id is required. Call canvas_claim on the parent (or an ancestor) first."
    }]
  };
  const claimErr = assertLiveClaim(projectId, args.claim_id);
  if (claimErr) return claimErr;
  if ([args.before_id, args.after_id, args.parent_id].filter(x => typeof x === "string" && x).length !== 1) return {
    isError: true,
    content: [{
      type: "text",
      text: "Provide exactly one of before_id, after_id, or parent_id."
    }]
  };
  const result = await sendCanvasOperation(projectId, "insert_element", withCanvasOperationSource(withChatTabId(args, chatTabId), sessionId));
  if (!result?.isError) markClaimMutated(args.claim_id);
  return result;
}
async function handleCanvasGrep(projectId, args) {
  if (!args.pattern) return {
    isError: true,
    content: [{
      type: "text",
      text: "pattern is required"
    }]
  };
  return sendCanvasOperation(projectId, "grep_canvas", args);
}
async function handleCanvasQuery(projectId, args) {
  if (!args.selector) return {
    isError: true,
    content: [{
      type: "text",
      text: "selector is required (e.g. \"table\", \"tbody tr\", \"th\")"
    }]
  };
  return sendCanvasOperation(projectId, "query_canvas", args);
}
async function handleCanvasDelete(projectId, args, chatTabId, sessionId) {
  if (!args.element_id) return {
    isError: true,
    content: [{
      type: "text",
      text: "element_id is required"
    }]
  };
  if (!args.claim_id) return {
    isError: true,
    content: [{
      type: "text",
      text: "claim_id is required. Call canvas_claim on this element first."
    }]
  };
  const claimErr = assertLiveClaim(projectId, args.claim_id);
  if (claimErr) return claimErr;
  const result = await sendCanvasOperation(projectId, "delete_element", withCanvasOperationSource(withChatTabId(args, chatTabId), sessionId));
  if (!result?.isError) {
    const verify = claimVerifyState.get(args.claim_id);
    if (verify?.rootElementId && verify.rootElementId === args.element_id) {
      verify.mutated = true;
      verify.verified = true;
      claimVerifyState.set(args.claim_id, verify);
    } else markClaimMutated(args.claim_id);
  }
  return result;
}
async function handleCanvasOperationStatus(projectId, args, chatTabId, sessionId) {
  const operationId = typeof args.operation_id === "string" ? args.operation_id.trim() : "";
  if (!operationId) return canvasOperationError("CANVAS_OPERATION_ID_REQUIRED", "operation_id is required", operationId);
  const sourceKey = sessionId ? `session:${sessionId}` : chatTabId ? `chat:${chatTabId}` : `project:${projectId}`;
  const status = canvasOperationRegistry.status(projectId, operationId, sourceKey);
  if (!status) return canvasOperationError("CANVAS_OPERATION_UNKNOWN", `No operation ${operationId} is available to this session. It may be unknown or expired. Do not automatically replay an unknown write.`, operationId, null);
  if (status.entry.state === "committed" && status.entry.claimId) markClaimMutated(status.entry.claimId);
  return {
    content: [{
      type: "text",
      text: JSON.stringify(status.entry, null, 2)
    }],
    structuredContent: {
      operation: status.entry
    }
  };
}
async function handleCanvasClaim(projectId, args, chatTabId, sessionId) {
  if (!args.element_id) return {
    isError: true,
    content: [{
      type: "text",
      text: "element_id is required"
    }]
  };
  const readerKey = readerKeyFor({
    projectId,
    chatTabId,
    sessionId
  });
  if (!readerKey) return {
    isError: true,
    content: [{
      type: "text",
      text: "Cannot identify chat/session for covering-read check. Reconnect MCP or claim from an in-app chat tab."
    }]
  };
  const coveringHash = coveringReadsByReader.get(readerKey)?.get(args.element_id);
  if (!coveringHash) return {
    isError: true,
    content: [{
      type: "text",
      text: `Cannot claim ${args.element_id}: no covering canvas_read. Call canvas_read with this element_id (or an ancestor) first, then canvas_claim.`
    }]
  };
  takeExpiredClaims(projectId);
  const unlockedClaimIds = drainPendingRendererUnlocks(projectId);
  const claimArgs = {
    element_id: args.element_id,
    covering_hash: coveringHash
  };
  if (unlockedClaimIds.length > 0) claimArgs.unlock_claim_ids = unlockedClaimIds;
  const result = await sendCanvasOperation(projectId, "claim_element", withChatTabId(claimArgs, chatTabId));
  if (result?.isError) {
    for (const id of unlockedClaimIds) notePendingRendererUnlock(projectId, id);
    return result;
  }
  const claimId = parseClaimIdFromResult(result);
  if (claimId) registerClaim(claimId, {
    projectId,
    chatTabId,
    elementId: args.element_id
  });
  return result;
}
async function handleCanvasRelease(projectId, args, chatTabId) {
  if (!args.element_id) return {
    isError: true,
    content: [{
      type: "text",
      text: "element_id is required"
    }]
  };
  if (!args.claim_id) return {
    isError: true,
    content: [{
      type: "text",
      text: "claim_id is required. Use the claim_id returned by canvas_claim."
    }]
  };
  const meta = claimRegistry.get(args.claim_id);
  if (!meta || meta.projectId !== projectId || meta.expiresAt <= Date.now()) {
    abandonClaims([args.claim_id]);
    await sendCanvasOperation(projectId, "release_element", withChatTabId(args, chatTabId));
    forgetPendingRendererUnlocks(projectId, [args.claim_id]);
    return {
      content: [{
        type: "text",
        text: `No locks held for claim_id ${args.claim_id}`
      }]
    };
  }
  const verify = claimVerifyState.get(args.claim_id);
  if (verify?.mutated && !verify.verified) {
    if (await claimHasLocks(projectId, args.claim_id)) return {
      isError: true,
      content: [{
        type: "text",
        text: `Cannot release claim_id ${args.claim_id}: you mutated the canvas under this claim but have not taken a verifying screenshot since. Call take_screenshot on the claimed element (or a descendant), then canvas_release.`
      }]
    };
    clearClaimVerify(args.claim_id);
    return {
      content: [{
        type: "text",
        text: `No locks held for claim_id ${args.claim_id}`
      }]
    };
  }
  const result = await sendCanvasOperation(projectId, "release_element", withChatTabId(args, chatTabId));
  if (!result?.isError) clearClaimVerify(args.claim_id);
  return result;
}
async function handleProjectList() {
  const openIds = getOpenProjectIds();
  if (openIds.length === 0) return {
    isError: true,
    content: [{
      type: "text",
      text: "Open a project in Bingo first"
    }]
  };
  const focusedId = getFocusedProjectId();
  const projects = await Promise.all(openIds.map(async id => ({
    id,
    name: await fetchProjectName(id)
  })));
  projects.sort((a, b) => {
    if (a.id === focusedId) return -1;
    if (b.id === focusedId) return 1;
    return a.name.localeCompare(b.name);
  });
  return {
    content: [{
      type: "text",
      text: projects.map(p => {
        const focused = p.id === focusedId ? " (focused)" : "";
        return `- name: ${p.name}, id: ${p.id}${focused}`;
      }).join("\n")
    }]
  };
}
async function handleProjectPick(sessionId, args) {
  const projectId = args.project_id;
  if (!projectId || typeof projectId !== "string") return {
    isError: true,
    content: [{
      type: "text",
      text: "project_id is required"
    }]
  };
  const openIds = getOpenProjectIds();
  if (openIds.length === 0) return {
    isError: true,
    content: [{
      type: "text",
      text: "Open a project in Bingo first"
    }]
  };
  if (!openIds.includes(projectId)) return {
    isError: true,
    content: [{
      type: "text",
      text: `Project "${projectId}" is not open. Open projects:\n${(await Promise.all(openIds.map(async id => `- ${await fetchProjectName(id)}, id: ${id}`))).join("\n")}`
    }]
  };
  setSessionProject(sessionId, projectId);
  return {
    content: [{
      type: "text",
      text: `Working on: ${await fetchProjectName(projectId)} (${projectId})`
    }]
  };
}
var TOOLS = [{
  name: "project_list",
  description: "List projects currently open in Bingo. Returns one line per project with name and id. Call this first when no project is bound, or when the user asks to switch projects. If exactly one project is open, call project_pick with its id immediately without asking the user.",
  inputSchema: {
    type: "object",
    properties: {}
  }
}, {
  name: "project_pick",
  description: "Bind this MCP session to a project that is open in Bingo. Required before other project/canvas/local tools (except list_skills/read_skill). Call again with a different project_id only when the user explicitly asks to switch projects.",
  inputSchema: {
    type: "object",
    properties: {
      project_id: {
        type: "string",
        description: "Project id from project_list (the value after \"id: \")"
      }
    },
    required: ["project_id"]
  }
}, {
  name: "project_read",
  description: "Read a file from the project with line numbers. Supports offset/limit for reading specific sections of large files. Always read before editing.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Relative file path (e.g. components/Button.tsx)"
      },
      offset: {
        type: "number",
        description: "Start reading from this line number (1-based). Default: 1"
      },
      limit: {
        type: "number",
        description: "Number of lines to read. Default: 2000. Use smaller values for large files."
      }
    },
    required: ["file_path"]
  }
}, {
  name: "project_glob",
  description: "Find files matching a glob pattern. Returns matching file paths.",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Glob pattern (e.g. **/*.tsx, components/*)"
      }
    },
    required: ["pattern"]
  }
}, {
  name: "project_grep",
  description: "Search file contents for a regex pattern. Returns matching lines with file paths and line numbers. Supports context lines around matches.",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Regex pattern to search for"
      },
      glob: {
        type: "string",
        description: "Optional glob to filter which files to search"
      },
      case_insensitive: {
        type: "boolean",
        description: "Case insensitive search"
      },
      output_mode: {
        type: "string",
        enum: ["content", "files_with_matches", "count"],
        description: "Output mode: \"content\" shows matching lines (default), \"files_with_matches\" shows only file paths, \"count\" shows match counts per file"
      },
      context: {
        type: "number",
        description: "Number of lines to show before AND after each match"
      },
      context_before: {
        type: "number",
        description: "Number of lines to show before each match"
      },
      context_after: {
        type: "number",
        description: "Number of lines to show after each match"
      },
      head_limit: {
        type: "number",
        description: "Limit output to first N lines/entries. Default: 250"
      }
    },
    required: ["pattern"]
  }
}, {
  name: "project_write",
  description: "Write content to a file. Creates the file if it does not exist, or overwrites if it does. Use this for normal file creation and updates, including ordinary two-file changes. project_write_batch is reserved for bulk import workflows that create many new files at once.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Relative file path"
      },
      content: {
        type: "string",
        description: "Full file content to write"
      }
    },
    required: ["file_path", "content"]
  }
}, {
  name: "project_write_batch",
  description: "Bulk import helper for creating many NEW files in one call. Use this for Bingo import workflows/codebase imports, not ordinary small edits or two-file component copies. Up to 500 files per call. Files must NOT already exist (this tool only creates, does not overwrite — use project_write or project_edit for updates).",
  inputSchema: {
    type: "object",
    properties: {
      files: {
        type: "array",
        description: "Array of files to create",
        items: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Relative file path (e.g. components/Button.tsx)"
            },
            content: {
              type: "string",
              description: "Full file content"
            }
          },
          required: ["file_path", "content"]
        },
        minItems: 1,
        maxItems: 500
      }
    },
    required: ["files"]
  }
}, {
  name: "project_edit",
  description: "Edit a file by replacing a specific string. The old_string must be unique in the file (or use replace_all). ALWAYS read the file first before editing to get the exact text.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Relative file path"
      },
      old_string: {
        type: "string",
        description: "Exact text to find and replace (must match exactly including whitespace/indentation)"
      },
      new_string: {
        type: "string",
        description: "Text to replace it with (must be different from old_string)"
      },
      replace_all: {
        type: "boolean",
        description: "Replace all occurrences instead of requiring uniqueness. Default: false"
      }
    },
    required: ["file_path", "old_string", "new_string"]
  }
}, {
  name: "project_delete",
  description: "Delete a file from the project.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Relative file path to delete"
      }
    },
    required: ["file_path"]
  }
}, {
  name: "approve",
  description: "Permission prompt handler for the in-app chat. Claude Code calls this itself when a tool needs the user's consent; never call it directly.",
  inputSchema: {
    type: "object",
    properties: {
      tool_name: {
        type: "string"
      },
      input: {
        type: "object",
        additionalProperties: true
      },
      tool_use_id: {
        type: "string"
      }
    },
    required: ["tool_name"]
  }
}, {
  name: "list_skills",
  description: "List Bingo-owned workflow skills available in this project context. Use this to discover app workflows such as import-from-project without relying on Claude-global skills.",
  inputSchema: {
    type: "object",
    properties: {}
  }
}, {
  name: "read_skill",
  description: `Read a Bingo-owned workflow skill by exact name. Returns SKILL.md plus any bundled reference files. For ANY design work (new UI, restyle, polish, empty states, forms, dashboards), you MUST call this with name "${DESIGN_SKILL_NAME}" BEFORE the first canvas_add / canvas_update / canvas_edit / canvas_insert — those tools error until you do.`,
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Exact skill name from list_skills"
      }
    },
    required: ["name"]
  }
}, {
  name: "take_screenshot",
  description: "Capture a screenshot of a canvas element. Returns the image as base64 PNG. The screenshot is also displayed to the user in chat.",
  inputSchema: {
    type: "object",
    properties: {
      element_id: {
        type: "string",
        description: "Element ID to screenshot (optional, captures full canvas if omitted)"
      },
      claim_id: {
        type: "string",
        description: "claim_id from canvas_claim (associates screenshot with your edit session)"
      }
    }
  }
}, {
  name: "search_icons",
  description: "Search the icon library for icons matching a query. Returns icon names.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (e.g. \"calendar\", \"email\", \"settings\")"
      }
    },
    required: ["query"]
  }
}, {
  name: "search_components",
  description: "Search indexed project components by name/path and common semantic synonyms (e.g. badge/pill/chip, input/text field). Returns candidates, paths and known props. Confirm API compatibility from source/compositions. An empty index or search miss does not prove source absence; inspect source directories and registration. Call with no query to list indexed components.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Optional search query to filter by component name or path (e.g. \"button\", \"table\", \"ui/\")"
      }
    },
    required: []
  }
}, {
  name: "canvas_list",
  description: "List canvas pages (names, IDs, loaded/active) plus each page's existing top-level frames and their canvas boxes. Call when you need page IDs or frame positions, or after creating a page. canvas_add writes to the active page and auto-places new roots to the right of those frames.",
  inputSchema: {
    type: "object",
    properties: {}
  }
}, {
  name: "canvas_create_page",
  description: "Create a new, empty canvas page and make it the active canvas. Returns the new page id. Use this before bulk canvas work (e.g. an import) so you build on a dedicated page instead of clobbering whatever page the user currently has open. Subsequent canvas_add calls target the newly created page. Call canvas_claim before canvas manipulation.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name for the new page, e.g. \"Design System\""
      }
    },
    required: ["name"]
  }
}, {
  name: "canvas_read",
  description: "Read elements from a canvas page. Returns the JSX structure of the canvas or a specific element. Oversized trees may include bingo:truncated stubs — canvas_read those ids if needed.",
  inputSchema: {
    type: "object",
    properties: {
      canvas_id: {
        type: "string",
        description: "Canvas page ID to read from"
      },
      element_id: {
        type: "string",
        description: "Optional: read a specific element instead of the whole canvas"
      }
    },
    required: ["canvas_id"]
  }
}, {
  name: "canvas_claim",
  description: "Claim an element for editing. This locks it so other agents cannot modify it while you work. You MUST claim before editing. You must have already seen the element tree before claiming. Returns a claim_id — pass claim_id to canvas_update, canvas_edit, canvas_insert, canvas_delete, canvas_add, and canvas_release. Locks expire after 5 minutes; re-claim if you still need them.",
  inputSchema: {
    type: "object",
    properties: {
      element_id: {
        type: "string",
        description: "Element ID to claim"
      }
    },
    required: ["element_id"]
  }
}, {
  name: "canvas_release",
  description: "Release a claimed element using the claim_id from canvas_claim. Call this when you are done editing. If you mutated the canvas under this claim, you MUST take_screenshot the claimed element (or a descendant) after the last mutation — otherwise release errors. You must canvas_claim again before further edits.",
  inputSchema: {
    type: "object",
    properties: {
      element_id: {
        type: "string",
        description: "Element ID to release"
      },
      claim_id: {
        type: "string",
        description: "claim_id returned by canvas_claim for this element"
      }
    },
    required: ["element_id", "claim_id"]
  }
}, {
  name: "canvas_operation_status",
  description: "Query a canvas write after an unconfirmed result. Reuse the operation_id returned by the original call. Unknown or expired operations are never replayed automatically.",
  inputSchema: {
    type: "object",
    properties: {
      operation_id: {
        type: "string",
        description: "Stable operation ID returned by canvas_add, canvas_update, canvas_edit, canvas_insert, or canvas_delete."
      }
    },
    required: ["operation_id"]
  }
}, {
  name: "canvas_add",
  description: "Add new elements to the active/open canvas page as one atomic formal commit and one Undo unit. Creates new elements from JSX. REQUIRES read_skill(\"bingo-design\") earlier in this session — otherwise this tool returns an error. Do not ask the user to choose a non-active existing page; canvas_add cannot write there. If the user wants a different existing page, ask them to open it first. To work on a fresh page, call canvas_create_page; it creates and activates the new page. When claim_id is provided, new elements are automatically claimed (locked) under it. For a new ROOT shell, set claim_new=true to add and claim it in this one call; the result includes the claim_id for subsequent child insertions and release.\n\nIf a write result is unconfirmed, do not repeat it: call canvas_operation_status with the returned operation_id. Reuse operation_id only for the exact same logical write.\n\nclaim_id: optional for ROOT insertions (no parent_id). Required when parent_id is set — obtain via canvas_claim on the parent or claim_new on the root insertion.\n\nFor NEW nodes, omit data-element-id (Bingo mints ids). Raw <button>/<input>/<select>/<textarea> are rejected when the project has Button/Input/Select/Textarea.\n\nPositioning: when adding to ROOT (no parent_id), omit `x` / `y` unless you have an exact coordinate. The editor measures existing frames and parks the new section to their right so it does not stack on the user's work. canvas_list reports those frames. To change existing work, canvas_read + claim it — do not add a parallel root on top. NEVER use CSS `marginLeft` or `position: absolute` in JSX to position a root section — those are ignored by the canvas. When adding to a parent (parent_id set), `x` / `y` are ignored — children follow the parent's flex/grid layout.",
  inputSchema: {
    type: "object",
    properties: {
      canvas_id: {
        type: "string",
        description: "Optional active canvas page ID. If provided, it must be the currently active/open canvas page."
      },
      parent_id: {
        type: "string",
        description: "Parent element ID to add inside (optional, adds to root if omitted)"
      },
      jsx: {
        type: "string",
        description: "JSX code for the new element(s). Wrap multiple siblings in a Fragment: <><section>...</section><section>...</section></>."
      },
      x: {
        type: "number",
        description: "Optional X position in canvas pixels for ROOT insertions only. Ignored when parent_id is set. Omit this unless you have a specific coordinate — the editor measures existing frames and parks the new root to their right. Do not pass 100/100 (or any overlap) when the page already has work on it."
      },
      y: {
        type: "number",
        description: "Optional Y position in canvas pixels for ROOT insertions only. Ignored when parent_id is set. Omit with x so auto-placement can align to existing frames."
      },
      claim_id: {
        type: "string",
        description: "claim_id from canvas_claim on the parent. Required when parent_id is set; optional for root insertions (locks new elements when provided)."
      },
      claim_new: {
        type: "boolean",
        description: "For a new root shell, add and immediately claim the created root in this call. Returns the claim_id. Do not combine with parent_id or claim_id."
      },
      operation_id: {
        type: "string",
        description: "Optional stable idempotency key. Reuse only to recover the same write after an unconfirmed result."
      }
    },
    required: ["jsx"]
  }
}, {
  name: "canvas_update",
  description: "Replace an existing element's full JSX. REQUIRES read_skill(\"bingo-design\"). Prefer canvas_edit / canvas_insert for surgical changes. You MUST canvas_claim first. You MAY include data-element-id from canvas_read to preserve child identity — same id = same node; unknown ids are reminted; foreign/duplicate ids error. Raw <button>/<input>/<select>/<textarea> rejected when project components exist.",
  inputSchema: {
    type: "object",
    properties: {
      element_id: {
        type: "string",
        description: "Element ID to update"
      },
      jsx: {
        type: "string",
        description: "New JSX code for the element"
      },
      claim_id: {
        type: "string",
        description: "claim_id covering this element or an ancestor"
      },
      operation_id: {
        type: "string",
        description: "Optional stable idempotency key. Reuse only for the same write after an unconfirmed result."
      }
    },
    required: ["element_id", "jsx", "claim_id"]
  }
}, {
  name: "canvas_edit",
  description: "Surgically edit an element by string replace on its JSX (like local_edit / project_edit). REQUIRES read_skill(\"bingo-design\"). Prefer this over canvas_update for additive changes (e.g. insert a column cell). old_string must be unique unless replace_all. Claim the element or an ancestor first. Preserves identity for untouched nodes.",
  inputSchema: {
    type: "object",
    properties: {
      element_id: {
        type: "string",
        description: "Element whose JSX to edit"
      },
      old_string: {
        type: "string",
        description: "Exact text to find (must match including whitespace)"
      },
      new_string: {
        type: "string",
        description: "Replacement text"
      },
      replace_all: {
        type: "boolean",
        description: "Replace all occurrences. Default false (requires unique old_string)."
      },
      claim_id: {
        type: "string",
        description: "claim_id covering this element or an ancestor"
      },
      operation_id: {
        type: "string",
        description: "Optional stable idempotency key. Reuse only for the same write after an unconfirmed result."
      }
    },
    required: ["element_id", "old_string", "new_string", "claim_id"]
  }
}, {
  name: "canvas_insert",
  description: "Insert new JSX as a sibling or child without rewriting the parent. REQUIRES read_skill(\"bingo-design\"). Provide exactly one of before_id, after_id, or parent_id. New nodes always get fresh ids. Claim the parent (or an ancestor) first. Cannot insert at the canvas root — use canvas_add for new top-level sections.",
  inputSchema: {
    type: "object",
    properties: {
      jsx: {
        type: "string",
        description: "JSX for the new element(s). Wrap multiple siblings in a Fragment: <>...</>."
      },
      before_id: {
        type: "string",
        description: "Insert as previous sibling of this element"
      },
      after_id: {
        type: "string",
        description: "Insert as next sibling of this element"
      },
      parent_id: {
        type: "string",
        description: "Insert as child of this element (append, or at index)"
      },
      index: {
        type: "number",
        description: "Optional child index when using parent_id (default: append)"
      },
      claim_id: {
        type: "string",
        description: "claim_id covering the parent or an ancestor"
      },
      operation_id: {
        type: "string",
        description: "Optional stable idempotency key. Reuse only for the same write after an unconfirmed result."
      }
    },
    required: ["jsx", "claim_id"]
  }
}, {
  name: "canvas_grep",
  description: "Search canvas element JSX for a regex pattern. Returns matching element ids with short snippets. Use after a screenshot to find anchors (e.g. \"Category\") without reading a huge tree.",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Regex pattern to search for"
      },
      root_id: {
        type: "string",
        description: "Optional: limit search to this element subtree"
      },
      canvas_id: {
        type: "string",
        description: "Optional canvas page ID (defaults to active)"
      },
      case_insensitive: {
        type: "boolean",
        description: "Case insensitive search"
      }
    },
    required: ["pattern"]
  }
}, {
  name: "canvas_query",
  description: "Find canvas elements by simple tag/component selector (descendant combinator). Examples: \"table\", \"th\", \"tbody tr\", \"Button\". Returns matching element ids.",
  inputSchema: {
    type: "object",
    properties: {
      selector: {
        type: "string",
        description: "Space-separated tag or component names, e.g. \"tbody tr\""
      },
      root_id: {
        type: "string",
        description: "Optional: limit query to this element subtree"
      },
      canvas_id: {
        type: "string",
        description: "Optional canvas page ID (defaults to active)"
      }
    },
    required: ["selector"]
  }
}, {
  name: "canvas_delete",
  description: "Delete an element from the canvas. You MUST claim this element (or an ancestor) first and pass that claim_id.",
  inputSchema: {
    type: "object",
    properties: {
      element_id: {
        type: "string",
        description: "Element ID to delete"
      },
      claim_id: {
        type: "string",
        description: "claim_id covering this element or an ancestor"
      },
      operation_id: {
        type: "string",
        description: "Optional stable idempotency key. Reuse only for the same write after an unconfirmed result."
      }
    },
    required: ["element_id", "claim_id"]
  }
}, {
  name: "get_theme",
  description: "Return the project theme summary extracted from globals.css (CSS variables for colors, radius, etc.). Call this when deriving the visual language — prefer theme Tailwind classes (bg-primary, text-muted-foreground) over hardcoded colors.",
  inputSchema: {
    type: "object",
    properties: {}
  }
}, {
  name: "canvas_create_import_scaffold",
  description: "Create the design-system import reference page in one call. REQUIRES read_skill(\"bingo-design\") earlier in this session. It creates a claimed root holding a design-system column (header + colour, typography, spacing, icon and component sections, in that order) beside an empty page-recreation column. Returns the claim_id and every element id as JSON. Use this instead of hand-building the layout with canvas_add.",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Source project name, used as the page heading"
      },
      tagline: {
        type: "string",
        description: "Optional one-line description of the design system"
      }
    },
    required: ["title"]
  }
}, {
  name: "get_design_context",
  description: "Gather the project theme, registered component catalog, and active canvas-page summary in one call. Use once at the start of a design task instead of separate get_theme, unfiltered search_components, and canvas_list calls.",
  inputSchema: {
    type: "object",
    properties: {}
  }
}, {
  name: "local_read",
  description: "Read a file from the user's local filesystem with line numbers. Use ABSOLUTE paths and offset/limit for sections. Also reads this active in-app run's own internal tool results (read-only, default 200 lines, maximum 2000 lines, 32 KiB response budget). Always read before editing ordinary files.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Absolute file path (e.g. /Users/name/code/repo/src/index.ts)"
      },
      offset: {
        type: "number",
        description: "Start reading from this line number (1-based). Default: 1"
      },
      limit: {
        type: "number",
        description: "Number of lines to read. Default: 2000 for ordinary files; 200 for internal tool results (maximum 2000). Use smaller values for large files."
      }
    },
    required: ["file_path"]
  }
}, {
  name: "local_read_batch",
  description: "Read 1-10 text files from the user's local filesystem in one call. Also reads this active in-app run's own internal tool results, with a shared 32 KiB response budget, default 200 lines per result, maximum 2000. Returns each file under an absolute-path heading.",
  inputSchema: {
    type: "object",
    properties: {
      file_paths: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Absolute file paths to read (1-10)"
      },
      offset: {
        type: "number",
        description: "Optional shared start line (1-based). Default: 1"
      },
      limit: {
        type: "number",
        description: "Optional shared line limit per file. Default: 2000"
      }
    },
    required: ["file_paths"]
  }
}, {
  name: "local_write",
  description: "Write content to a file on the user's local filesystem. Creates the file and parent directories if they don't exist. Use ABSOLUTE paths. Only works within allowed directories.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Absolute file path"
      },
      content: {
        type: "string",
        description: "Full file content to write"
      }
    },
    required: ["file_path", "content"]
  }
}, {
  name: "local_edit",
  description: "Edit a file on the user's local filesystem by replacing a specific string. The old_string must be unique in the file (or use replace_all). ALWAYS read the file first before editing to get the exact text. Use ABSOLUTE paths.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Absolute file path"
      },
      old_string: {
        type: "string",
        description: "Exact text to find and replace (must match exactly including whitespace/indentation)"
      },
      new_string: {
        type: "string",
        description: "Text to replace it with (must be different from old_string)"
      },
      replace_all: {
        type: "boolean",
        description: "Replace all occurrences instead of requiring uniqueness. Default: false"
      }
    },
    required: ["file_path", "old_string", "new_string"]
  }
}, {
  name: "local_folders",
  description: "List the current project's accessible local folders and access mode. Use folders already listed in the current request directly; call this when the list is unknown or needs refreshing. An opened local project is included automatically. If no folders are available, this may ask the user to share one and wait for their answer.",
  inputSchema: {
    type: "object",
    properties: {}
  }
}, {
  name: "local_glob",
  description: "Find files matching a glob pattern on the user's local filesystem. Searches within all allowed directories. Returns absolute file paths.",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Glob pattern (e.g. **/*.tsx, src/components/*)"
      },
      head_limit: {
        type: "number",
        description: "Limit output to first N files. Default: 500"
      }
    },
    required: ["pattern"]
  }
}, {
  name: "local_grep",
  description: "Search file contents on the user's local filesystem for a regex pattern. Returns matching lines with file paths and line numbers. Supports context lines around matches.",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Regex pattern to search for"
      },
      glob: {
        type: "string",
        description: "Optional glob to filter which files to search"
      },
      case_insensitive: {
        type: "boolean",
        description: "Case insensitive search"
      },
      output_mode: {
        type: "string",
        enum: ["content", "files_with_matches", "count"],
        description: "Output mode: \"content\" shows matching lines (default), \"files_with_matches\" shows only file paths, \"count\" shows match counts per file"
      },
      context: {
        type: "number",
        description: "Number of lines to show before AND after each match"
      },
      context_before: {
        type: "number",
        description: "Number of lines to show before each match"
      },
      context_after: {
        type: "number",
        description: "Number of lines to show after each match"
      },
      head_limit: {
        type: "number",
        description: "Limit output to first N lines/entries. Default: 250"
      }
    },
    required: ["pattern"]
  }
}, {
  name: "project_copy_asset",
  description: `Copy a binary asset (image, font, icon, video) from the user's local filesystem into the project's asset storage so JSX can reference it. Use this whenever recreated canvas JSX references a local asset — <img src="/hero.jpg">, <Image src="/logo.svg">, CSS background-image: url('/bg.webp'), etc. — BEFORE writing the canvas_add that references it. Without this call, the JSX renders with a broken image (the path 404s).

Typical flow: read the source page with local_read, identify each <img>/Image/url() reference, resolve the path relative to the project's public/ or assets/ folder, then call this tool with the absolute local path and the project-relative destination. Keep the project_path consistent with what the JSX expects (e.g. JSX src="/hero.jpg" → project_path "public/hero.jpg" so the same URL resolves).

Supported formats: png, jpg, jpeg, gif, webp, avif, svg, ico, woff, woff2, ttf, otf, mp4, webm. Max 10MB per asset — compress or scale large hero images before copying.`,
  inputSchema: {
    type: "object",
    properties: {
      local_path: {
        type: "string",
        description: "Absolute path to the source file on the user's filesystem (must be within allowed paths)"
      },
      project_path: {
        type: "string",
        description: "Relative path in the project where the asset should land (e.g. \"public/hero.jpg\"). Match the path the JSX expects."
      }
    },
    required: ["local_path", "project_path"]
  }
}, {
  name: "project_copy_file",
  description: `Copy a local text file (or several) into the Bingo project without sending the file through the model. Use this when the user wants a local .ts/.tsx/.css/.json file in the project as-is — "copy this component", "port these files", "bring LiquidMenu over". Do NOT local_read + project_write the same bytes; that is slow. After the copy, project_edit only the lines that must change (imports, mocks). Images/fonts/video still use project_copy_asset.

Pass local_path + project_path for one file, or files[] (up to 50) for a batch. local_path is absolute and must be in an allowed directory. project_path is project-relative (e.g. components/LiquidMenu.tsx). Overwrites if the destination already exists.`,
  inputSchema: {
    type: "object",
    properties: {
      local_path: {
        type: "string",
        description: "Absolute path of the source text file on the user's machine"
      },
      project_path: {
        type: "string",
        description: "Relative destination in the Bingo project, e.g. components/LiquidMenu.tsx"
      },
      files: {
        type: "array",
        description: "Batch of copies. Prefer this over many single calls when porting a small module graph.",
        items: {
          type: "object",
          properties: {
            local_path: {
              type: "string",
              description: "Absolute source path"
            },
            project_path: {
              type: "string",
              description: "Relative project destination"
            }
          },
          required: ["local_path", "project_path"]
        }
      }
    }
  }
}, {
  name: "set_icon_library",
  description: `Ensure an installed icon library is enabled for this project so canvas JSX with <i data-icon="X" data-icon-library="Y" /> renders. Libraries detected from package.json and source imports are available without saving configuration; calling this tool for one of those libraries is a read-only no-op. A manual preference is saved only when needed. For Heroicons, use a subpath such as '@heroicons/react/24/outline'. Pass a single library name or an array.`,
  inputSchema: {
    type: "object",
    properties: {
      library: {
        oneOf: [{
          type: "string",
          description: "Icon library package to enable for this project, e.g. lucide-react, @heroicons/react/24/outline, @tabler/icons-react, react-icons/fa, or @scope/icons-react."
        }, {
          type: "array",
          items: {
            type: "string"
          },
          description: "Multiple icon library packages (rare — usually pick one)."
        }]
      }
    },
    required: ["library"]
  }
}, {
  name: "get_icon_libraries",
  description: "Inspect icon libraries discovered from this project's npm dependencies and source imports, including the effective enabled list, manual preferences, discovery evidence, and configuration state. This tool is read-only.",
  inputSchema: { type: "object", properties: {} }
}, {
  name: "scan_project",
  description: "Run a deterministic pre-pass on a local React codebase to extract a structured project map: stack (framework + Tailwind/styling system), tier routing (tailwind/translated), tokens (CSS vars + color scales), fonts, icon pack, candidate components ranked by import frequency, and provider stack. Returns compact JSON (top components per category truncated, totalCounts retained). Use this BEFORE importing components — one cheap call (~50-300ms even on huge monorepos) replaces minutes of grepping.",
  inputSchema: {
    type: "object",
    properties: {
      root_path: {
        type: "string",
        description: "Absolute path to the user's project root (the folder they want to import from)"
      },
      top_n: {
        type: "number",
        description: "Max components per category (primitives/composites/pages) to include. Default 25. Increase if you need to see more candidates."
      }
    },
    required: ["root_path"]
  }
}];
function getToolsForClient(source) {
  if (source === "internal") return TOOLS;
  return TOOLS.filter(tool => tool.name !== PERMISSION_PROMPT_TOOL).map(tool => {
    if (!EXTERNAL_FILE_EDIT_TOOLS.has(tool.name)) return tool;
    return {
      ...tool,
      description: `${tool.description} ${EXTERNAL_FILE_EDIT_APPROVAL_NOTE}`
    };
  });
}
var TOOL_HANDLERS = {
  project_read: handleRead,
  project_glob: handleGlob,
  project_grep: handleGrep,
  project_write: handleWrite,
  project_write_batch: handleWriteBatch,
  project_edit: handleEdit,
  project_delete: handleDelete,
  list_skills: handleListSkills,
  read_skill: handleReadSkill,
  project_copy_asset: handleProjectCopyAsset,
  project_copy_file: handleProjectCopyFile,
  take_screenshot: handleScreenshot,
  search_icons: handleSearchIcons,
  get_icon_libraries: handleGetIconLibraries,
  set_icon_library: handleSetIconLibrary,
  search_components: handleSearchComponents,
  get_theme: handleGetTheme,
  get_design_context: handleGetDesignContext,
  canvas_list: handleCanvasList,
  canvas_create_page: handleCanvasCreatePage,
  canvas_read: handleCanvasRead,
  canvas_operation_status: handleCanvasOperationStatus,
  canvas_add: handleCanvasAdd,
  canvas_create_import_scaffold: handleCreateImportScaffold,
  canvas_update: handleCanvasUpdate,
  canvas_edit: handleCanvasEdit,
  canvas_insert: handleCanvasInsert,
  canvas_grep: handleCanvasGrep,
  canvas_query: handleCanvasQuery,
  canvas_delete: handleCanvasDelete,
  canvas_claim: handleCanvasClaim,
  canvas_release: handleCanvasRelease,
  local_read: handleLocalRead,
  local_read_batch: handleLocalReadBatch,
  local_write: handleLocalWrite,
  local_edit: handleLocalEdit,
  local_folders: handleLocalFolders,
  local_glob: handleLocalGlob,
  local_grep: handleLocalGrep,
  scan_project: handleScanProject
};
async function handleScanProject(_projectId, args, chatTabId) {
  if (!args.root_path) return {
    isError: true,
    content: [{
      type: "text",
      text: "root_path is required (absolute path to the project root)"
    }]
  };
  if (typeof args.root_path !== "string" || !args.root_path.startsWith("/")) return {
    isError: true,
    content: [{
      type: "text",
      text: `root_path must be an absolute path, got: ${args.root_path}`
    }]
  };
  const denied = await ensureLocalAccess(_projectId, args.root_path, chatTabId);
  if (denied) return denied;
  if (!(await isExistingPathAllowed(args.root_path, _projectId, chatTabId))) return denyPath(args.root_path);
  const topN = typeof args.top_n === "number" && args.top_n > 0 ? Math.floor(args.top_n) : 25;
  try {
    const map = await scanProject(args.root_path);
    const compact = {
      ...map,
      components: {
        primitives: map.components.primitives.slice(0, topN),
        composites: map.components.composites.slice(0, topN),
        pages: map.components.pages.slice(0, topN),
        totalCounts: {
          primitives: map.components.primitives.length,
          composites: map.components.composites.length,
          pages: map.components.pages.length,
          truncated: map.components.primitives.length > topN || map.components.composites.length > topN || map.components.pages.length > topN,
          topN
        }
      },
      warnings: map.warnings.slice(0, 10),
      warningsTruncated: map.warnings.length > 10 ? map.warnings.length - 10 : 0
    };
    return {
      content: [{
        type: "text",
        text: JSON.stringify(compact, null, 2)
      }]
    };
  } catch (e) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `scan_project failed: ${e.message}`
      }]
    };
  }
}
async function rejectInternalResultOperation(toolName, args) {
  if (!["local_write", "local_edit", "local_glob", "local_grep", "project_copy_file", "project_copy_asset", "scan_project"].includes(toolName)) return null;
  const candidates = [args.file_path, args.local_path, args.root_path, args.path, args.glob,
    ...(toolName === "local_glob" ? [args.pattern] : []),
    ...(Array.isArray(args.files) ? args.files.map(file => file?.local_path) : [])];
  for (const file of candidates) if (await isAgentToolResultPath(file)) {
    const code = ["local_write", "local_edit"].includes(toolName) ? "AGENT_RESULT_READ_ONLY" : "AGENT_RESULT_OPERATION_UNSUPPORTED";
    return agentResultErrorResult(new AgentResultError(code, "Internal results support current-run reads only. Narrow the original query if needed."));
  }
  return null;
}
async function handleMcpRequest(sessionId, msg, options) {
  const {
    id,
    method,
    params
  } = msg;
  const legacyProjectId = options?.legacyProjectId;
  const legacyChatTabId = options?.legacyChatTabId;
  const legacyChatRunId = options?.legacyChatRunId;
  switch (method) {
    case "initialize":
      {
        if (legacyProjectId) {
          const themeSummary = await getProjectThemeSummary(legacyProjectId);
          const base = buildMcpServerInstructions({
            sessionPrebound: true
          });
          return {
            status: 200,
            body: {
              jsonrpc: "2.0",
              id,
              result: {
                protocolVersion: "2024-11-05",
                capabilities: {
                  tools: {}
                },
                serverInfo: {
                  name: "bingo",
                  version: "1.0.0"
                },
                instructions: themeSummary ? `${base}\n\n${themeSummary}` : base
              }
            }
          };
        }
        let sid = sessionId && mcpSessions.has(sessionId) ? sessionId : createMcpSession();
        ensureSessionBound(sid);
        const sessionPrebound = !!resolveSessionProjectId(sid);
        const boundProjectId = resolveSessionProjectId(sid);
        const themeSummary = boundProjectId ? await getProjectThemeSummary(boundProjectId) : "";
        const base = buildMcpServerInstructions({
          sessionPrebound
        });
        return {
          status: 200,
          sessionId: sid,
          body: {
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: "bingo",
                version: "1.0.0"
              },
              instructions: themeSummary ? `${base}\n\n${themeSummary}` : base
            }
          }
        };
      }
    case "notifications/initialized":
      if (legacyProjectId) return {
        status: 202
      };
      return {
        status: 202,
        sessionId
      };
    case "tools/list":
      if (legacyProjectId) return {
        status: 200,
        body: {
          jsonrpc: "2.0",
          id,
          result: {
            tools: getToolsForClient("internal")
          }
        }
      };
      if (!sessionId || !mcpSessions.has(sessionId)) return {
        status: 400,
        body: {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32e3,
            message: "Mcp-Session-Id required"
          }
        }
      };
      ensureSessionBound(sessionId);
      return {
        status: 200,
        sessionId,
        body: {
          jsonrpc: "2.0",
          id,
          result: {
            tools: getToolsForClient("external")
          }
        }
      };
    case "tools/call":
      {
        if (!legacyProjectId) {
          if (!sessionId || !mcpSessions.has(sessionId)) return {
            status: 400,
            body: {
              jsonrpc: "2.0",
              id,
              error: {
                code: -32e3,
                message: "Mcp-Session-Id required"
              }
            }
          };
          ensureSessionBound(sessionId);
          touchMcpSession(sessionId);
        }
        const toolName = params?.name;
        let toolArgs = params?.arguments || {};
        if (CANVAS_PUBLIC_WRITE_TOOLS.has(toolName) && !(typeof toolArgs.operation_id === "string" && toolArgs.operation_id.trim())) toolArgs = {
          ...toolArgs,
          operation_id: (0, crypto$1.randomUUID)()
        };
        if (toolName === "approve") {
          if (!legacyProjectId) return {
            status: 200,
            sessionId,
            body: {
              jsonrpc: "2.0",
              id,
              result: {
                isError: true,
                content: [{
                  type: "text",
                  text: `${PERMISSION_PROMPT_TOOL} is only available to the Bingo in-app chat`
                }]
              }
            }
          };
          return {
            status: 200,
            sessionId,
            body: {
              jsonrpc: "2.0",
              id,
              result: await handleApprove(legacyProjectId, toolArgs, legacyChatTabId)
            }
          };
        }
        if (TOOLS_WITHOUT_BOUND_PROJECT.has(toolName)) try {
          let result;
          if (toolName === "project_list") result = await handleProjectList();else if (toolName === "project_pick") {
            if (!sessionId) return {
              status: 200,
              sessionId,
              body: {
                jsonrpc: "2.0",
                id,
                result: {
                  isError: true,
                  content: [{
                    type: "text",
                    text: "project_pick requires an MCP session"
                  }]
                }
              }
            };
            result = await handleProjectPick(sessionId, toolArgs);
          } else {
            const skillHandler = TOOL_HANDLERS[toolName];
            if (!skillHandler) return {
              status: 200,
              sessionId,
              body: {
                jsonrpc: "2.0",
                id,
                result: {
                  isError: true,
                  content: [{
                    type: "text",
                    text: `Unknown tool: ${toolName}`
                  }]
                }
              }
            };
            result = await skillHandler("", toolArgs);
            if (!result?.isError && isDesignSkillRead(toolName, toolArgs)) markDesignSkillLoaded({
              sessionId,
              projectId: legacyProjectId,
              chatTabId: legacyChatTabId ?? (legacyProjectId ? resolveChatTabId(legacyProjectId) : void 0),
              chatRunId: legacyChatRunId
            });
          }
          return {
            status: 200,
            sessionId,
            body: {
              jsonrpc: "2.0",
              id,
              result
            }
          };
        } catch (err) {
          return {
            status: 200,
            sessionId,
            body: {
              jsonrpc: "2.0",
              id,
              result: {
                isError: true,
                content: [{
                  type: "text",
                  text: `Error: ${err.message}`
                }]
              }
            }
          };
        }
        const handler = TOOL_HANDLERS[toolName];
        if (!handler) return {
          status: 200,
          sessionId,
          body: {
            jsonrpc: "2.0",
            id,
            result: {
              isError: true,
              content: [{
                type: "text",
                text: `Unknown tool: ${toolName}`
              }]
            }
          }
        };
        const projectId = legacyProjectId ?? (sessionId && resolveSessionProjectId(sessionId));
        if (!projectId) return {
          status: 200,
          sessionId,
          body: {
            jsonrpc: "2.0",
            id,
            result: {
              isError: true,
              content: [{
                type: "text",
                text: NO_PROJECT_SELECTED_MSG
              }]
            }
          }
        };
        if (!getOpenProjectIds().includes(projectId)) return {
          status: 200,
          sessionId,
          body: {
            jsonrpc: "2.0",
            id,
            result: {
              isError: true,
              content: [{
                type: "text",
                text: await formatClosedProjectError(projectId)
              }]
            }
          }
        };
        mcpEvents.emit("tool_call", {
          projectId,
          chatTabId: legacyChatTabId,
          name: toolName,
          input: toolArgs,
          operationId: CANVAS_PUBLIC_WRITE_TOOLS.has(toolName) ? toolArgs.operation_id : void 0
        });
        if (DESIGN_SKILL_REQUIRED_TOOLS.has(toolName)) {
          const claimId = typeof toolArgs.claim_id === "string" ? toolArgs.claim_id : void 0;
          if (!hasDesignSkillLoaded({
            sessionId,
            projectId,
            chatTabId: legacyChatTabId ?? resolveChatTabId(projectId, claimId) ?? resolveChatTabId(projectId),
            chatRunId: legacyChatRunId
          })) {
            mcpEvents.emit("tool_result", {
              projectId,
              chatTabId: legacyChatTabId,
              name: toolName,
              args: toolArgs,
              error: DESIGN_SKILL_REQUIRED_MSG,
              success: false
            });
            return {
              status: 200,
              sessionId,
              body: {
                jsonrpc: "2.0",
                id,
                result: {
                  isError: true,
                  content: [{
                    type: "text",
                    text: DESIGN_SKILL_REQUIRED_MSG
                  }]
                }
              }
            };
          }
        }
        const internalDenied = await rejectInternalResultOperation(toolName, toolArgs);
        if (internalDenied) return { status: 200, sessionId, body: { jsonrpc: "2.0", id, result: internalDenied } };
        const destructiveCall = DESTRUCTIVE_TOOLS.has(toolName) && !(toolName === "set_icon_library" && await iconLibraryRequestIsNoop(projectId, toolArgs));
        if (destructiveCall) {
          const decision = !legacyProjectId && externalAutoApproveFileEditsProjects.has(projectId) && EXTERNAL_AUTO_APPROVABLE_TOOLS.has(toolName) ? {
            approved: true
          } : await requestToolApproval(projectId, toolName, toolArgs, {
            source: legacyProjectId ? "internal" : "external",
            chatTabId: legacyChatTabId,
            sessionId
          });
          if (!decision.approved) {
            const message = decision.reason === "timeout" ? `Timed out waiting for Bingo approval for ${toolName}. Open the project window or use Auto-approve in the approval bar.` : `User rejected ${toolName} operation on ${toolArgs.file_path || "file"}`;
            mcpEvents.emit("tool_result", {
              projectId,
              chatTabId: legacyChatTabId,
              name: toolName,
              args: toolArgs,
              error: message,
              success: false
            });
            return {
              status: 200,
              sessionId,
              body: {
                jsonrpc: "2.0",
                id,
                result: {
                  isError: true,
                  content: [{
                    type: "text",
                    text: message
                  }]
                }
              }
            };
          }
        }
        try {
          const toolContext = { source: legacyProjectId ? "in-app" : "external", projectId, chatTabId: legacyChatTabId, chatRunId: legacyProjectId ? legacyChatRunId : undefined };
          const result = await handler(projectId, toolArgs, legacyChatTabId, sessionId, toolContext);
          if (DESTRUCTIVE_TOOLS.has(toolName) || toolName.startsWith("canvas_") || toolName === "take_screenshot") {
            const createdElementIds = getCreatedCanvasElementIds(toolName, result);
            const errorText = result?.isError ? mcpResultText(result) : void 0;
            const reason = typeof result?.reason === "string" ? result.reason : void 0;
            mcpEvents.emit("tool_result", {
              projectId,
              chatTabId: legacyChatTabId,
              name: toolName,
              args: toolArgs,
              success: !result?.isError,
              error: errorText,
              createdElementIds,
              operation: result?.structuredContent?.operation,
              reason
            });
          }
          return {
            status: 200,
            sessionId,
            body: {
              jsonrpc: "2.0",
              id,
              result
            }
          };
        } catch (err) {
          if (DESTRUCTIVE_TOOLS.has(toolName) || toolName.startsWith("canvas_")) mcpEvents.emit("tool_result", {
            projectId,
            chatTabId: legacyChatTabId,
            name: toolName,
            args: toolArgs,
            error: err.message,
            success: false
          });
          return {
            status: 200,
            sessionId,
            body: {
              jsonrpc: "2.0",
              id,
              result: {
                isError: true,
                content: [{
                  type: "text",
                  text: `Error: ${err.message}`
                }]
              }
            }
          };
        }
      }
    default:
      if (legacyProjectId) {
        if (id !== void 0) return {
          status: 200,
          body: {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`
            }
          }
        };
        return {
          status: 202
        };
      }
      const defaultSession = resolveMcpSessionForRequest(sessionId, id);
      if ("status" in defaultSession) {
        if (id !== void 0) return defaultSession;
        return {
          status: defaultSession.status
        };
      }
      if (id !== void 0) return {
        status: 200,
        sessionId: defaultSession.sessionId,
        body: {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        }
      };
      return {
        status: 202,
        sessionId: defaultSession.sessionId
      };
  }
}
async function startMcpServer() {
  if (server$1?.listening && mcpPort > 0) return mcpPort;
  if (mcpStartPromise) return mcpStartPromise;
  mcpStartPromise = new Promise((resolve, reject) => {
    server$1 = (0, http.createServer)(async (req, res) => {
      const host = String(req.headers.host || "");
      const hostName = host.startsWith("[") ? host.slice(1, host.indexOf("]")) : host.split(":")[0];
      const loopbackNames = new Set(["127.0.0.1", "localhost", "::1"]);
      let originAllowed = true;
      if (req.headers.origin) try {
        originAllowed = loopbackNames.has(new URL(String(req.headers.origin)).hostname);
      } catch {
        originAllowed = false;
      }
      if (!loopbackNames.has(hostName) || !originAllowed) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Loopback MCP requests only" }));
        return;
      }
      if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "application/json"
        });
        res.end(JSON.stringify({
          status: "ok",
          open_project_count: getOpenProjectIds().length
        }));
        return;
      }
      const url = req.url ? new URL(req.url, "http://127.0.0.1") : null;
      const legacyMatch = url?.pathname.match(/^\/mcp\/([^/]+)$/);
      const isSessionRoute = url?.pathname === "/mcp" || url?.pathname === "/mcp/";
      if (url && req.method === "GET" && (isSessionRoute || legacyMatch)) {
        handleMcpGetStream(req, res, url);
        return;
      }
      if (url && req.method === "DELETE" && isSessionRoute) {
        const sessionId = readMcpSessionHeader(req);
        if (!sessionId || !mcpSessions.has(sessionId)) {
          res.writeHead(404);
          res.end();
          return;
        }
        destroyMcpSession(sessionId);
        res.writeHead(204);
        res.end();
        return;
      }
      if (!url || req.method !== "POST") {
        res.writeHead(404);
        res.end();
        return;
      }
      if (!isSessionRoute && !legacyMatch) {
        res.writeHead(404);
        res.end();
        return;
      }
      const legacyProjectId = legacyMatch ? decodeURIComponent(legacyMatch[1]) : void 0;
      const legacyChatTabId = url.searchParams.get("chatTab") || void 0;
      const legacyChatRunId = url.searchParams.get("chatRun") || void 0;
      const sessionId = readMcpSessionHeader(req);
      if (legacyProjectId && !legacyChatTabId) {
        res.writeHead(400, {
          "Content-Type": "application/json"
        });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: "In-app MCP requires ?chatTab=<chatTabId> on /mcp/<projectId>"
          }
        }));
        return;
      }
      if (legacyProjectId && !isActiveChatRun(legacyProjectId, legacyChatTabId, legacyChatRunId)) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32010, message: "This in-app chat run is no longer active." }
        }));
        return;
      }
      const MAX_MCP_BODY_BYTES = 8 * 1024 * 1024;
      const declaredLength = Number(req.headers["content-length"] || 0);
      if (Number.isFinite(declaredLength) && declaredLength > MAX_MCP_BODY_BYTES) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "MCP request body exceeds 8 MB" }));
        req.resume();
        return;
      }
      let body = "";
      let bodyBytes = 0;
      const boundProjectId = legacyProjectId ?? (sessionId ? resolveSessionProjectId(sessionId) : void 0);
      for await (const chunk of req) {
        bodyBytes += typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
        if (bodyBytes > MAX_MCP_BODY_BYTES) {
          res.writeHead(413, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "MCP request body exceeds 8 MB" }));
          return;
        }
        body += typeof chunk === "string" ? chunk : chunk.toString("utf8");
        maybePreviewPartialMcpBody(boundProjectId, body, legacyChatTabId);
      }
      try {
        const parsed = JSON.parse(body);
        const {
          method,
          params
        } = parsed;
        if (method === "tools/call") {
          const toolArgs = params?.arguments || {};
          const detail = toolArgs.file_path || toolArgs.pattern || toolArgs.path || "";
          console.log(`[MCP] ${params?.name}${detail ? ` → ${detail}` : ""}`);
        } else if (method !== "notifications/initialized") console.log(`[MCP] ${method}`);
        const result = await handleMcpRequest(legacyProjectId ? void 0 : sessionId, parsed, {
          legacyProjectId,
          legacyChatTabId,
          legacyChatRunId
        });
        const responseHeaders = {};
        if (result.sessionId && !legacyProjectId) responseHeaders["Mcp-Session-Id"] = result.sessionId;
        const useSseResponse = !!(result.body && clientAcceptsEventStream(req));
        if (useSseResponse) {
          responseHeaders["Content-Type"] = "text/event-stream";
          responseHeaders["Cache-Control"] = "no-cache";
        } else responseHeaders["Content-Type"] = "application/json";
        const responseBodyStr = result.body ? useSseResponse ? formatMcpSseEvent(result.body) : JSON.stringify(result.body) : "";
        if (result.body) {
          res.writeHead(result.status, responseHeaders);
          res.end(responseBodyStr);
        } else {
          res.writeHead(result.status, responseHeaders);
          res.end();
        }
      } catch (err) {
        console.error(`[MCP] Error:`, err);
        res.writeHead(400, {
          "Content-Type": "application/json"
        });
        res.end(JSON.stringify({
          error: String(err)
        }));
      }
    });
    server$1.once("error", err => {
      console.error(`[MCP] Server error:`, err);
      server$1 = null;
      mcpPort = 0;
      mcpStartPromise = null;
      reject(err);
    });
    // Always let the OS pick a free loopback port. Fixed ports collide with an
    // installed copy of Bingo (or another development window), which makes
    // chat appear available but leaves every project tool disconnected.
    server$1.listen(0, "127.0.0.1", () => {
      const addr = server$1.address();
      mcpPort = typeof addr === "object" && addr ? addr.port : 0;
      console.log(`[MCP] Server listening on http://127.0.0.1:${mcpPort}`);
      mcpMaintenanceTimer ??= setInterval(() => {
        takeExpiredClaims();
        retryPendingRendererUnlocks();
      }, CLAIM_LOCK_PURGE_INTERVAL_MS);
      resolve(mcpPort);
    });
  });
  return mcpStartPromise;
}
/** Wait for the dynamically allocated endpoint before exposing it to a client. */
async function ensureMcpServerReady() {
  const port = await startMcpServer();
  if (!port) throw new Error("MCP server did not allocate a port");
  return port;
}
/** Stop the loopback server and its maintenance timer during app shutdown/tests. */
function stopMcpServer() {
  revokeAllResultScopes();
  cancelAllApprovals();
  if (mcpMaintenanceTimer) {
    clearInterval(mcpMaintenanceTimer);
    mcpMaintenanceTimer = null;
  }
  const current = server$1;
  server$1 = null;
  mcpPort = 0;
  mcpStartPromise = null;
  if (current?.listening) current.close();
}
/** MCP URL for in-app AI chat — project id in path (pre-bound, no project_list/pick). */
function getMcpChatUrl(projectId, chatTabId, chatRunId) {
  if (!chatTabId || !chatRunId) throw new Error("getMcpChatUrl requires chatTabId and chatRunId for in-app MCP");
  if (!mcpPort) throw new Error("MCP server is not ready");
  return `http://127.0.0.1:${mcpPort}/mcp/${encodeURIComponent(projectId)}?chatTab=${encodeURIComponent(chatTabId)}&chatRun=${encodeURIComponent(chatRunId)}`;
}
/** MCP URL for external clients (Cursor, etc.) — use project_list / project_pick to bind. */
function getMcpUrl() {
  if (!mcpPort) throw new Error("MCP server is not ready");
  return `http://127.0.0.1:${mcpPort}/mcp`;
}
/** Check if the MCP server is running and healthy */
async function checkMcpHealth() {
  if (!mcpPort) return false;
  try {
    return (await fetch(`http://127.0.0.1:${mcpPort}/health`, {
      signal: AbortSignal.timeout(2e3)
    })).ok;
  } catch {
    return false;
  }
}

export { PERMISSION_PROMPT_TOOL, TOOLS_WITHOUT_BOUND_PROJECT, abandonClaimsForChatTab, abandonClaimsForProject, cancelAllApprovals, cancelApprovalsForChat, cancelApprovalsForProject, checkMcpHealth, clearChatCancelled, enqueueCanvasDrawPreview, ensureMcpServerReady, getMcpChatUrl, getMcpUrl, getProjectAllowedPaths, getProjectThemeSummary, getSystemSkills, isExistingPathAllowed, markChatCancelled, mcpEvents, orphanCanvasOperationsForWebContents, prepareInAppDesignSkill, registerMcpChatSession, requestToolApproval, resolveApproval, resolveFolderAccess, seedCoveringReadsFromAttachedElements, setExternalMcpAutoApproveFileEdits, setProjectAllowedPaths, setProjectComponentIndex, setSkillOverrides, startMcpServer, stopMcpServer };
