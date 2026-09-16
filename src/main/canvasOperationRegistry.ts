/*
 * In-memory coordination for renderer-owned canvas writes.
 *
 * A transport timeout is deliberately not a terminal execution state. Entries
 * remain queryable so a late, authenticated renderer response can confirm the
 * original operation without executing it a second time.
 */
import { CANVAS_OPERATION_ERROR_CODES, CANVAS_OPERATION_PROTOCOL_VERSION } from "@bingo/compiler";

const DEFAULT_MAX_FINISHED = 1_000;
const DEFAULT_RETENTION_MS = 30 * 60 * 1_000;
const DEFAULT_MAX_IN_FLIGHT = 100;

function canvasOperationKey(projectId, operationId) {
  return `${projectId}\u0000${operationId}`;
}

function clonePublicEntry(entry) {
  return {
    protocolVersion: CANVAS_OPERATION_PROTOCOL_VERSION,
    operationId: entry.operationId,
    requestId: entry.requestId,
    projectId: entry.projectId,
    chatTabId: entry.chatTabId ?? null,
    toolName: entry.toolName,
    requestedCanvasId: entry.requestedCanvasId ?? null,
    resolvedCanvasId: entry.resolvedCanvasId ?? null,
    state: entry.state,
    observation: entry.observation,
    stateVersion: entry.stateVersion,
    applied: entry.applied,
    createdElementIds: entry.createdElementIds ?? [],
    parentElementId: entry.parentElementId ?? null,
    claimId: entry.claimId ?? null,
    claimNew: entry.claimNew === true,
    committedRevision: entry.committedRevision ?? null,
    persistenceState: entry.persistenceState ?? null,
    errorCode: entry.errorCode ?? null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    durationMs: entry.durationMs ?? null
  };
}

function unconfirmedResult(entry) {
  const operation = clonePublicEntry(entry);
  return {
    isError: true,
    content: [{
      type: "text",
      text: `Canvas result is not yet confirmed. Do not repeat the write; query canvas_operation_status with operation_id ${entry.operationId}.`
    }],
    structuredContent: {
      operation: {
        ...operation,
        errorCode: CANVAS_OPERATION_ERROR_CODES.RESULT_UNCONFIRMED,
        applied: null
      }
    }
  };
}

class CanvasOperationRegistry {
  constructor(options = {}) {
    this.now = options.now ?? (() => Date.now());
    this.maxFinished = options.maxFinished ?? DEFAULT_MAX_FINISHED;
    this.retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
    this.maxInFlight = options.maxInFlight ?? DEFAULT_MAX_IN_FLIGHT;
    this.entries = new Map();
    this.requests = new Map();
  }

  prune() {
    const cutoff = this.now() - this.retentionMs;
    const finished = [];
    for (const [key, entry] of this.entries) {
      if (entry.state === "committed" || entry.state === "rejected" || entry.state === "cancelled" || entry.state === "orphaned") {
        if (entry.updatedAt < cutoff) {
          this.entries.delete(key);
          this.requests.delete(entry.requestId);
        } else finished.push([key, entry]);
      }
    }
    finished.sort((a, b) => b[1].updatedAt - a[1].updatedAt);
    for (const [key, entry] of finished.slice(this.maxFinished)) {
      this.entries.delete(key);
      this.requests.delete(entry.requestId);
    }
  }

  begin(input) {
    this.prune();
    const key = canvasOperationKey(input.projectId, input.operationId);
    const existing = this.entries.get(key);
    if (existing) {
      if (existing.sourceKey !== input.sourceKey || existing.payloadHash !== input.payloadHash) return {
        kind: "conflict",
        entry: clonePublicEntry(existing)
      };
      return {
        kind: "existing",
        entry: clonePublicEntry(existing),
        result: existing.result
      };
    }
    let inFlight = 0;
    for (const entry of this.entries.values()) {
      if (entry.projectId === input.projectId && !entry.result && entry.state !== "orphaned") inFlight += 1;
    }
    if (inFlight >= this.maxInFlight) return { kind: "capacity" };
    const now = this.now();
    const entry = {
      ...input,
      state: "queued",
      observation: "waiting",
      stateVersion: 1,
      applied: null,
      result: null,
      waiters: new Set(),
      createdAt: now,
      updatedAt: now
    };
    this.entries.set(key, entry);
    this.requests.set(input.requestId, key);
    return { kind: "created", entry: clonePublicEntry(entry) };
  }

  markSent(projectId, operationId) {
    const entry = this.entries.get(canvasOperationKey(projectId, operationId));
    if (!entry || entry.result) return null;
    entry.state = "preparing";
    entry.stateVersion += 1;
    entry.updatedAt = this.now();
    return clonePublicEntry(entry);
  }

  markUnconfirmed(projectId, operationId) {
    const entry = this.entries.get(canvasOperationKey(projectId, operationId));
    if (!entry || entry.result) return entry ? clonePublicEntry(entry) : null;
    if (entry.observation !== "unconfirmed") {
      entry.observation = "unconfirmed";
      entry.stateVersion += 1;
      entry.updatedAt = this.now();
    }
    return clonePublicEntry(entry);
  }

  orphanWebContents(webContentsId) {
    const orphaned = [];
    for (const entry of this.entries.values()) {
      if (entry.targetWebContentsId !== webContentsId || entry.result) continue;
      entry.targetWebContentsId = null;
      entry.state = "orphaned";
      entry.observation = "unconfirmed";
      entry.applied = null;
      entry.errorCode = CANVAS_OPERATION_ERROR_CODES.RESULT_UNCONFIRMED;
      entry.stateVersion += 1;
      entry.updatedAt = this.now();
      entry.durationMs = entry.updatedAt - entry.createdAt;
      entry.result = unconfirmedResult(entry);
      for (const resolve of entry.waiters) resolve(entry.result);
      entry.waiters.clear();
      orphaned.push(clonePublicEntry(entry));
    }
    this.prune();
    return orphaned;
  }

  confirmByRequest(requestId, senderWebContentsId, response) {
    const key = this.requests.get(requestId);
    const entry = key ? this.entries.get(key) : null;
    if (!entry || entry.targetWebContentsId !== senderWebContentsId) return { kind: "ignored" };
    if (entry.result) return { kind: "duplicate", entry: clonePublicEntry(entry) };
    const wasUnconfirmed = entry.observation === "unconfirmed";
    const operation = response?.result?.structuredContent?.operation;
    entry.resolvedCanvasId = operation?.resolvedCanvasId ?? null;
    entry.createdElementIds = Array.isArray(operation?.createdElementIds) ? operation.createdElementIds : [];
    entry.parentElementId = operation?.parentElementId ?? entry.parentElementId ?? null;
    entry.committedRevision = operation?.committedRevision ?? null;
    entry.persistenceState = operation?.persistenceState ?? null;
    entry.applied = operation?.applied ?? !response?.result?.isError;
    entry.errorCode = operation?.errorCode ?? (response?.result?.isError ? "CANVAS_OPERATION_REJECTED" : null);
    entry.state = entry.applied === true ? "committed" : entry.applied === false ? "rejected" : "rejected";
    entry.observation = "confirmed";
    entry.stateVersion += 1;
    entry.updatedAt = this.now();
    entry.durationMs = entry.updatedAt - entry.createdAt;
    const publicOperation = clonePublicEntry(entry);
    entry.result = {
      ...response.result,
      structuredContent: {
        ...(response.result?.structuredContent ?? {}),
        operation: {
          ...publicOperation,
          ...(operation ?? {}),
          operationId: entry.operationId,
          projectId: entry.projectId,
          requestedCanvasId: entry.requestedCanvasId ?? null,
          state: entry.state,
          observation: "confirmed",
          stateVersion: entry.stateVersion,
          applied: entry.applied,
          errorCode: entry.errorCode
        }
      }
    };
    for (const resolve of entry.waiters) resolve(entry.result);
    entry.waiters.clear();
    return { kind: "confirmed", entry: clonePublicEntry(entry), result: entry.result, wasUnconfirmed, displayArgs: entry.displayArgs };
  }

  markPersistence(projectId, operationId, senderWebContentsId, update) {
    const entry = this.entries.get(canvasOperationKey(projectId, operationId));
    if (!entry || entry.targetWebContentsId !== senderWebContentsId || entry.applied !== true) return { kind: "ignored" };
    if (update?.resolvedCanvasId !== entry.resolvedCanvasId) return { kind: "ignored" };
    if (typeof update?.committedRevision === "number" && typeof entry.committedRevision === "number" && update.committedRevision < entry.committedRevision) {
      return { kind: "ignored" };
    }
    const persistenceState = update?.persistenceState;
    if (persistenceState !== "saved" && persistenceState !== "failed") return { kind: "ignored" };
    if (entry.persistenceState === persistenceState) return { kind: "duplicate", entry: clonePublicEntry(entry) };
    entry.persistenceState = persistenceState;
    entry.stateVersion += 1;
    entry.updatedAt = this.now();
    if (entry.result?.structuredContent?.operation) {
      entry.result.structuredContent.operation = {
        ...entry.result.structuredContent.operation,
        ...clonePublicEntry(entry),
      };
    }
    return { kind: "updated", entry: clonePublicEntry(entry), result: entry.result };
  }

  async wait(projectId, operationId, timeoutMs) {
    const entry = this.entries.get(canvasOperationKey(projectId, operationId));
    if (!entry) return null;
    if (entry.result) return entry.result;
    return new Promise(resolve => {
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        entry.waiters.delete(finish);
        resolve(result);
      };
      const timer = setTimeout(() => {
        this.markUnconfirmed(projectId, operationId);
        finish(unconfirmedResult(entry));
      }, timeoutMs);
      entry.waiters.add(finish);
    });
  }

  status(projectId, operationId, sourceKey) {
    this.prune();
    const entry = this.entries.get(canvasOperationKey(projectId, operationId));
    if (!entry || entry.sourceKey !== sourceKey) return null;
    return {
      entry: clonePublicEntry(entry),
      result: entry.result
    };
  }
}

export { CanvasOperationRegistry, unconfirmedResult };
