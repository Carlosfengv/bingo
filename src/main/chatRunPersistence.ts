import { normalizeToolResult } from "../../packages/editor/src/shell/utils/chatToolResults";
/* Main-process owner for one v2 chat run's incremental persistence. */
const CHECKPOINT_INTERVAL_MS = 1_000;
const CHECKPOINT_TEXT_BYTES = 16 * 1024;

class ChatRunPersistence {
  constructor(store, started, emit, options = {}) {
    this.store = store;
    this.started = started;
    this.emit = emit;
    this.now = options.now ?? (() => Date.now());
    this.checkpointIntervalMs = options.checkpointIntervalMs ?? CHECKPOINT_INTERVAL_MS;
    this.checkpointTextBytes = options.checkpointTextBytes ?? CHECKPOINT_TEXT_BYTES;
    this.content = "";
    this.activity = [];
    this.toolResults = [];
    this.operationFacts = [];
    this.outcome = "completed";
    this.startedAt = this.now();
    this.lastCheckpointBytes = 0;
    this.lastCheckpointAt = this.startedAt;
    this.timer = null;
    this.queue = Promise.resolve();
    this.persistenceError = null;
    this.finalized = false;
    this.terminalEvent = null;
  }

  patch() {
    return {
      content: this.content,
      ...(this.activity.length ? { activity: this.activity } : {}),
      ...(this.toolResults.length ? { toolResults: this.toolResults } : {}),
      ...(this.operationFacts.length ? { operationFacts: this.operationFacts } : {}),
      workDurationMs: Math.max(0, this.now() - this.startedAt)
    };
  }

  reportPersistenceError(error) {
    this.persistenceError = error;
    this.emit({
      type: "persistence_error",
      message: error instanceof Error ? error.message : String(error)
    });
  }

  enqueueCheckpoint() {
    if (this.finalized) return this.queue;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const patch = this.patch();
    this.lastCheckpointBytes = Buffer.byteLength(this.content);
    this.lastCheckpointAt = this.now();
    this.queue = this.queue.then(() => this.store.checkpointRun(this.started.chatId, this.started.runId, patch)).catch(error => {
      this.reportPersistenceError(error);
    });
    return this.queue;
  }

  scheduleCheckpoint() {
    if (this.finalized) return;
    const bytesSince = Buffer.byteLength(this.content) - this.lastCheckpointBytes;
    const elapsed = this.now() - this.lastCheckpointAt;
    if (bytesSince >= this.checkpointTextBytes || elapsed >= this.checkpointIntervalMs) {
      this.enqueueCheckpoint();
      return;
    }
    if (!this.timer) this.timer = setTimeout(() => {
      this.timer = null;
      this.enqueueCheckpoint();
    }, this.checkpointIntervalMs - elapsed);
  }

  accept(event) {
    if (event.type === "text") {
      this.content += event.content ?? "";
      this.activity.push({ type: "text", text: event.content ?? "" });
      this.scheduleCheckpoint();
    } else if (event.type === "thinking") {
      this.activity.push({ type: "thinking", text: event.content ?? "" });
      this.scheduleCheckpoint();
    } else if (event.type === "tool_activity") {
      this.activity.push({ type: "tool", name: event.name, input: event.input });
      this.scheduleCheckpoint();
    } else if (event.type === "mcp_tool_result") {
      const fact = {
        operationId: event.operation?.operationId ?? null,
        name: event.name,
        state: event.operation?.state ?? (event.success ? "committed" : "rejected"),
        applied: event.operation && Object.prototype.hasOwnProperty.call(event.operation, "applied") ? event.operation.applied : !!event.success,
        resolvedCanvasId: event.operation?.resolvedCanvasId ?? null,
        createdElementIds: event.operation?.createdElementIds ?? event.createdElementIds ?? [],
        error: event.error ?? null
      };
      const priorFactIndex = fact.operationId ? this.operationFacts.findIndex(candidate => candidate.operationId === fact.operationId) : -1;
      if (priorFactIndex >= 0) this.operationFacts[priorFactIndex] = fact;else this.operationFacts.push(fact);
      const rawToolResult = {
        type: event.name,
        success: event.success,
        args: event.args,
        operation: event.operation,
        createdElementIds: event.createdElementIds,
        error: event.error
      };
      const normalized = normalizeToolResult(rawToolResult);
      // Keep original evidence even when the display adapter cannot recover it.
      const toolResult = normalized.recoveryIssue ? { ...rawToolResult, payload: {}, recoveryIssue: normalized.recoveryIssue } : normalized;
      if (priorFactIndex >= 0) this.toolResults[priorFactIndex] = toolResult;else this.toolResults.push(toolResult);
      this.scheduleCheckpoint();
    } else if (event.type === "error") {
      this.outcome = "errored";
      this.terminalEvent = event;
      return;
    } else if (event.type === "cancelled") {
      this.outcome = "cancelled";
      this.terminalEvent = event;
      return;
    } else if (event.type === "done") {
      this.terminalEvent = event;
      return;
    }
    this.emit(event);
  }

  async finish(outcome = this.outcome) {
    if (this.finalized) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.queue;
    try {
      const result = await this.store.finalizeRun(this.started.chatId, this.started.runId, {
        ...this.patch(),
        outcome
      });
      this.finalized = true;
      this.emit({
        type: "run_saved",
        chatId: this.started.chatId,
        runId: this.started.runId,
        assistantMessageId: this.started.assistantMessageId,
        revision: result.revision
      });
      if (this.terminalEvent) this.emit(this.terminalEvent);else this.emit({ type: outcome === "cancelled" ? "cancelled" : "done" });
      return result;
    } catch (error) {
      this.reportPersistenceError(error);
      throw error;
    }
  }
}

async function runPersistedChat(run, execute, isCancelled = () => false) {
  let executionError = null;
  try {
    await execute();
  } catch (error) {
    executionError = error;
    run.accept(isCancelled() ? { type: "cancelled" } : {
      type: "error",
      message: error instanceof Error ? error.message : String(error),
      error: String(error)
    });
  }
  const result = await run.finish(isCancelled() ? "cancelled" : run.outcome);
  return { result, executionError };
}

export { ChatRunPersistence, runPersistedChat };
