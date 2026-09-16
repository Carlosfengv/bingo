import assert from "node:assert/strict";
import test from "node:test";
import { CanvasOperationRegistry } from "./canvasOperationRegistry";

function input(overrides = {}) {
  return {
    operationId: "op-1",
    requestId: "req-1",
    projectId: "project-1",
    chatTabId: "chat-1",
    toolName: "add_to_canvas",
    requestedCanvasId: "canvas-1",
    parentElementId: null,
    sourceKey: "chat:chat-1",
    payloadHash: "hash-1",
    targetWebContentsId: 42,
    ...overrides
  };
}

test("a transport timeout stays unconfirmed and a late result becomes committed", async () => {
  const registry = new CanvasOperationRegistry();
  assert.equal(registry.begin(input()).kind, "created");
  registry.markSent("project-1", "op-1");

  const timedOut = await registry.wait("project-1", "op-1", 1);
  assert.equal(timedOut.structuredContent.operation.errorCode, "CANVAS_RESULT_UNCONFIRMED");
  assert.equal(timedOut.structuredContent.operation.applied, null);
  assert.equal(registry.status("project-1", "op-1", "chat:chat-1").entry.observation, "unconfirmed");

  const confirmed = registry.confirmByRequest("req-1", 42, {
    result: {
      content: [{ type: "text", text: "Added 1 element(s). Element IDs:\n- el-new" }],
      structuredContent: {
        operation: {
          applied: true,
          resolvedCanvasId: "canvas-actual",
          createdElementIds: ["el-new"]
        }
      }
    }
  });
  assert.equal(confirmed.kind, "confirmed");
  const status = registry.status("project-1", "op-1", "chat:chat-1");
  assert.equal(status.entry.state, "committed");
  assert.equal(status.entry.observation, "confirmed");
  assert.equal(status.entry.resolvedCanvasId, "canvas-actual");
  assert.deepEqual(status.entry.createdElementIds, ["el-new"]);
});

test("same operation and payload replays but a changed payload conflicts", () => {
  const registry = new CanvasOperationRegistry();
  assert.equal(registry.begin(input()).kind, "created");
  assert.equal(registry.begin(input({ requestId: "req-retry" })).kind, "existing");
  assert.equal(registry.begin(input({ requestId: "req-conflict", payloadHash: "other" })).kind, "conflict");
  assert.equal(registry.begin(input({ requestId: "req-other", sourceKey: "chat:other" })).kind, "conflict");
});

test("renderer responses are accepted only from the target webContents", () => {
  const registry = new CanvasOperationRegistry();
  registry.begin(input());
  assert.equal(registry.confirmByRequest("req-1", 7, { result: {} }).kind, "ignored");
  assert.equal(registry.status("project-1", "op-1", "chat:chat-1").entry.state, "queued");
  assert.equal(registry.confirmByRequest("req-1", 42, {
    result: {
      isError: true,
      content: [{ type: "text", text: "rejected" }],
      structuredContent: { operation: { applied: false, errorCode: "CANVAS_REVISION_CONFLICT" } }
    }
  }).kind, "confirmed");
  assert.equal(registry.status("project-1", "op-1", "chat:chat-1").entry.state, "rejected");
});

test("unresolved entries are never evicted to make room", () => {
  const registry = new CanvasOperationRegistry({ maxInFlight: 1, maxFinished: 0 });
  registry.begin(input());
  assert.equal(registry.begin(input({ operationId: "op-2", requestId: "req-2" })).kind, "capacity");
  registry.confirmByRequest("req-1", 42, { result: { content: [] } });
  assert.equal(registry.begin(input({ operationId: "op-2", requestId: "req-2" })).kind, "created");
});

test("renderer teardown preserves unknown evidence while releasing per-project capacity", () => {
  const registry = new CanvasOperationRegistry({ maxInFlight: 1, maxFinished: 10 });
  registry.begin(input());
  assert.equal(registry.begin(input({ projectId: "project-2", operationId: "other-project", requestId: "other-request" })).kind, "created");
  assert.equal(registry.begin(input({ operationId: "op-2", requestId: "req-2" })).kind, "capacity");

  const orphaned = registry.orphanWebContents(42);
  assert.equal(orphaned.length, 2);
  const status = registry.status("project-1", "op-1", "chat:chat-1");
  assert.equal(status.entry.state, "orphaned");
  assert.equal(status.entry.applied, null);
  assert.equal(status.result.structuredContent.operation.errorCode, "CANVAS_RESULT_UNCONFIRMED");
  assert.equal(registry.confirmByRequest("req-1", 42, { result: { content: [] } }).kind, "ignored");
  assert.equal(registry.begin(input()).result.structuredContent.operation.state, "orphaned");
  assert.equal(registry.begin(input({ operationId: "op-2", requestId: "req-2" })).kind, "created");
});

test("only the owning renderer can confirm canvas persistence", () => {
  const registry = new CanvasOperationRegistry();
  registry.begin(input());
  registry.confirmByRequest("req-1", 42, {
    result: {
      content: [],
      structuredContent: {
        operation: {
          applied: true,
          resolvedCanvasId: "canvas-1",
          committedRevision: 3,
          persistenceState: "pending",
        },
      },
    },
  });

  assert.equal(registry.markPersistence("project-1", "op-1", 7, {
    resolvedCanvasId: "canvas-1",
    committedRevision: 3,
    persistenceState: "saved",
  }).kind, "ignored");
  assert.equal(registry.markPersistence("project-1", "op-1", 42, {
    resolvedCanvasId: "canvas-other",
    committedRevision: 3,
    persistenceState: "saved",
  }).kind, "ignored");
  const saved = registry.markPersistence("project-1", "op-1", 42, {
    resolvedCanvasId: "canvas-1",
    committedRevision: 3,
    persistenceState: "saved",
  });
  assert.equal(saved.kind, "updated");
  assert.equal(saved.result.structuredContent.operation.persistenceState, "saved");
  assert.equal(saved.result.structuredContent.operation.stateVersion, saved.entry.stateVersion);
  assert.equal(registry.status("project-1", "op-1", "chat:chat-1").entry.persistenceState, "saved");
});
