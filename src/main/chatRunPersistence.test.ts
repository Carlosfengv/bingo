import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ChatRunPersistence, runPersistedChat } from "./chatRunPersistence";
import { ChatStore } from "./chatStore";
import { ChatPersistence } from "../../packages/editor/src/shell/utils/chatPersistence";
import { getDisplayToolResults } from "../../packages/editor/src/shell/utils/chatToolResults";

test("main-v2 chat UI changes never use full message replacement", async () => {
  let replacements = 0;
  const persistence = new ChatPersistence({
    chatPersistenceMode: "main-v2",
    updateChatMessages: async () => {
      replacements += 1;
    }
  });
  const tab = {
    id: "local-chat",
    title: null,
    messages: [{ id: "user-1", role: "user", content: "hello" }]
  };
  await persistence.save(tab);
  assert.equal(replacements, 0);
});

test("main process checkpoints and finalizes the same assistant message", async () => {
  const checkpoints = [];
  const finalized = [];
  const emitted = [];
  const store = {
    checkpointRun: async (chatId, runId, patch) => checkpoints.push({ chatId, runId, patch }),
    finalizeRun: async (chatId, runId, result) => {
      finalized.push({ chatId, runId, result });
      return { revision: 3 };
    }
  };
  const run = new ChatRunPersistence(store, {
    chatId: "chat-1",
    runId: "run-1",
    assistantMessageId: "assistant-1"
  }, event => emitted.push(event), {
    checkpointTextBytes: 1,
    checkpointIntervalMs: 60_000
  });
  run.accept({ type: "text", content: "saved text" });
  run.accept({
    type: "mcp_tool_result",
    name: "canvas_add",
    success: false,
    operation: {
      operationId: "op-1",
      state: "preparing",
      applied: null,
      observation: "unconfirmed"
    }
  });
  run.accept({
    type: "mcp_tool_result",
    name: "canvas_add",
    success: true,
    operation: {
      operationId: "op-1",
      state: "committed",
      applied: true,
      resolvedCanvasId: "canvas-actual",
      createdElementIds: ["el-1"]
    }
  });
  await run.finish();
  assert.ok(checkpoints.length >= 1);
  assert.equal(finalized.length, 1);
  assert.equal(finalized[0].result.content, "saved text");
  assert.equal(finalized[0].result.operationFacts[0].operationId, "op-1");
  assert.equal(finalized[0].result.operationFacts.length, 1);
  assert.equal(finalized[0].result.toolResults.length, 1);
  assert.equal(finalized[0].result.toolResults[0].type, "add_jsx");
  assert.equal(finalized[0].result.toolResults[0].payload.success, true);
  assert.equal(finalized[0].result.toolResults[0].payload.operationId, "op-1");
  assert.deepEqual(finalized[0].result.toolResults[0].createdElementIds, ["el-1"]);
  assert.equal(finalized[0].result.operationFacts[0].applied, true);
  assert.equal(finalized[0].result.operationFacts[0].resolvedCanvasId, "canvas-actual");
  assert.equal(emitted.find(event => event.type === "run_saved").assistantMessageId, "assistant-1");
  assert.equal(emitted.at(-1).type, "done");
});

test("a run is recoverable with the same message ids from a fresh chat store", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-chat-run-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = new ChatStore(directory);
  const started = await store.startRun({
    chatTabId: "local-tab-1",
    requestId: "request-1",
    userMessage: { id: "user-1", role: "user", content: "Build it" }
  });
  const run = new ChatRunPersistence(store, started, () => {});
  run.accept({ type: "text", content: "Done" });
  run.accept({
    type: "mcp_tool_result",
    name: "canvas_add",
    success: false,
    operation: { operationId: "late-op", state: "preparing", applied: null }
  });
  await run.finish();

  const reopened = new ChatStore(directory);
  assert.equal(await reopened.correctOperationFact("local-tab-1", {
    operationId: "late-op",
    name: "canvas_add",
    state: "committed",
    applied: true,
    resolvedCanvasId: "canvas-1",
    createdElementIds: ["el-1"],
    error: null
  }), true);
  const chat = await reopened.readChat(started.chatId, { limit: 20 });
  assert.deepEqual(chat.messages.map(message => [message.id, message.role, message.content]), [
    ["user-1", "user", "Build it"],
    [started.assistantMessageId, "assistant", "Done"]
  ]);
  assert.equal(chat.messages[1].operationFacts[0].state, "committed");
  assert.equal(chat.messages[1].operationFacts[0].applied, true);
  const display = getDisplayToolResults(chat.messages[1].toolResults, () => null);
  assert.equal(display.length, 1);
  assert.equal(display[0].payload.success, true);
  assert.equal(display[0].payload.error, null);
  assert.deepEqual(display[0].createdElementIds, ["el-1"]);
});

test("a preparation failure is finalized as errored and does not leave the chat busy", async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-chat-preparation-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = new ChatStore(directory);
  const started = await store.startRun({
    chatId: "preparation", requestId: "request-1", runId: "run-1",
    userMessage: { id: "user-1", role: "user", content: "Build it" }
  });
  const emitted = [];
  const run = new ChatRunPersistence(store, started, event => emitted.push(event));
  const execution = await runPersistedChat(run, async () => { throw new Error("agent discovery failed"); });
  assert.match(String(execution.executionError), /agent discovery failed/);
  const saved = await store.readManifest(started.chatId);
  assert.equal(saved.activeRun, undefined);
  assert.equal(saved.tail.find(message => message.runId === started.runId && message.role === "assistant").outcome, "errored");
  assert.equal(emitted.at(-1).type, "error");
  const next = await store.startRun({ chatId: started.chatId, requestId: "request-2", runId: "run-2", userMessage: { role: "user", content: "Retry" } });
  assert.equal(next.status, "running");
});

test("a failed final persistence remains retryable", async () => {
  let attempts = 0;
  const run = new ChatRunPersistence({
    checkpointRun: async () => {},
    finalizeRun: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("disk unavailable");
      return { revision: 2 };
    }
  }, { chatId: "retry", runId: "retry-run", assistantMessageId: "assistant" }, () => {});
  await assert.rejects(() => run.finish(), /disk unavailable/);
  assert.equal(run.finalized, false);
  await run.finish();
  assert.equal(attempts, 2);
  assert.equal(run.finalized, true);
});

test("unrecoverable display results retain original journal evidence", async () => {
  let saved;
  const run = new ChatRunPersistence({
    checkpointRun: async () => {},
    finalizeRun: async (_chatId, _runId, result) => { saved = result; return { revision: 1 }; }
  }, { chatId: "chat-unknown", runId: "run-unknown", assistantMessageId: "assistant" }, () => {});
  run.accept({ type: "mcp_tool_result", name: "canvas_add", args: { parent_id: "original-parent" },
    operation: { operationId: "original-operation", applied: null } });
  await run.finish();
  assert.equal(saved.toolResults[0].recoveryIssue, "CHAT_TOOL_OUTCOME_UNKNOWN");
  assert.equal(saved.toolResults[0].args.parent_id, "original-parent");
  assert.equal(saved.toolResults[0].operation.operationId, "original-operation");
  assert.equal(saved.toolResults[0].operation.applied, null);
});

test("a cancelled runtime event cannot be finalized as completed", async () => {
  let saved;
  const emitted = [];
  const run = new ChatRunPersistence({
    checkpointRun: async () => {},
    finalizeRun: async (_chatId, _runId, result) => { saved = result; return { revision: 2 }; }
  }, { chatId: "chat-cancelled", runId: "run-cancelled", assistantMessageId: "assistant" }, event => emitted.push(event));
  run.accept({ type: "text", content: "Partial work" });
  run.accept({ type: "cancelled" });
  await run.finish();
  assert.equal(saved.outcome, "cancelled");
  assert.equal(emitted.at(-1).type, "cancelled");
});
