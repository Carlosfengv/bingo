import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ProjectMemoryStore } from "./projectMemory";

async function temporaryStore(options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-memory-"));
  return { root, store: new ProjectMemoryStore(root, options) };
}

test("keeps proposals as candidates and requires verified authorization for active memories", async t => {
  const { root, store } = await temporaryStore({ evidenceResolver: async authorization => authorization.messageId === "allowed" && authorization.quote === "Remember cobalt" });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const proposal = await store.upsert({ expectedRevision: 0, mutationId: "p1", item: { text: "Maybe use cobalt", status: "active", authorization: { kind: "proposal" }, origin: "agent-proposed" } });
  assert.equal(proposal.item.status, "candidate");
  await assert.rejects(() => store.upsert({ expectedRevision: 1, mutationId: "bad", item: { text: "Use red", status: "active", authorization: { kind: "explicit-message", messageId: "wrong", quote: "Remember red" }, evidence: [] } }), error => error.code === "INVALID_AUTHORIZATION");
  const active = await store.upsert({ expectedRevision: 1, mutationId: "good", item: { text: "Use cobalt", strength: "must", status: "active", origin: "user-explicit", authorization: { kind: "explicit-message", messageId: "allowed", quote: "Remember cobalt" }, evidence: [{ kind: "message", messageId: "allowed" }] } });
  assert.equal(active.item.status, "active");
  await assert.rejects(() => store.upsert({ expectedRevision: active.revision, mutationId: "agent-overwrite", item: { id: active.item.id, text: "Ignore cobalt", authorization: { kind: "proposal" }, origin: "agent-proposed" } }), error => error.code === "INVALID_AUTHORIZATION");
});

test("selects scoped must before prefer and reports must budget overflow", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let revision = 0;
  for (const item of [
    { id: "project", text: `Use accessible contrast. ${"A".repeat(600)}`, strength: "must", scope: { kind: "project" } },
    { id: "path", text: "Cards under src/admin use compact spacing", strength: "prefer", scope: { kind: "paths", paths: ["src/admin"] } },
    { id: "other", text: "Marketing pages use generous spacing", strength: "prefer", scope: { kind: "paths", paths: ["src/marketing"] } }
  ]) {
    const saved = await store.upsert({ expectedRevision: revision, mutationId: `save-${item.id}`, item: { ...item, status: "active", origin: "user-edited", authorization: { kind: "user-action", actionId: `action-${item.id}` } } });
    revision = saved.revision;
  }
  const selected = await store.selectForContext({ paths: ["src/admin/Page.tsx"], currentRequest: "card", maxBytes: 2048 });
  assert.deepEqual(selected.selectedIds, ["project", "path"]);
  await assert.rejects(() => store.selectForContext({ paths: ["src/admin/Page.tsx"], maxBytes: 10 }), /budget/);
});

test("handles conflicts, supersession, undo, deletion revocation, and stale revisions", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const first = await store.upsert({ expectedRevision: 0, mutationId: "one", item: { id: "one", text: "Use blue", status: "active", authorization: { kind: "user-action", actionId: "a1" } } });
  const conflict = await store.upsert({ expectedRevision: first.revision, mutationId: "two", item: { id: "two", text: "Use red", status: "active", conflictsWith: ["one"], authorization: { kind: "user-action", actionId: "a2" } } });
  assert.equal(conflict.item.status, "candidate");
  const replacement = await store.upsert({ expectedRevision: conflict.revision, mutationId: "three", item: { id: "three", text: "Use green", status: "active", supersedes: ["one"], authorization: { kind: "user-action", actionId: "a3" } } });
  assert.equal((await store.get("one")).item.status, "superseded");
  const undone = await store.undo({ expectedRevision: replacement.revision, actionId: "undo-three" });
  assert.equal(undone.items.find(item => item.id === "one").status, "active");
  const deleted = await store.delete({ id: "one", expectedRevision: undone.revision, mutationId: "delete-one" });
  assert.equal((await store.read()).revokedSourceIds.includes("action:a1"), true);
  await assert.rejects(() => store.upsert({ expectedRevision: deleted.revision, mutationId: "reuse", item: { text: "Use blue", status: "active", authorization: { kind: "user-action", actionId: "a1" } } }), error => error.code === "REVOKED_SOURCE");
  await assert.rejects(() => store.upsert({ expectedRevision: 0, mutationId: "stale", item: { text: "stale", authorization: { kind: "proposal" } } }), error => error.code === "CONFLICT");
});

test("rejects escaping path scopes and binds list cursors to revision", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await assert.rejects(() => store.upsert({ expectedRevision: 0, mutationId: "escape", item: { text: "bad", scope: { kind: "paths", paths: ["../outside"] }, authorization: { kind: "proposal" } } }), error => error.code === "INVALID_SCOPE");
  const one = await store.upsert({ expectedRevision: 0, mutationId: "one", item: { text: "one", authorization: { kind: "proposal" } } });
  const page = await store.list({ limit: 1 });
  await store.upsert({ expectedRevision: one.revision, mutationId: "two", item: { text: "two", authorization: { kind: "proposal" } } });
  if (page.nextCursor) await assert.rejects(() => store.list({ cursor: page.nextCursor }), error => error.code === "INVALID_CURSOR");
});

test("marks applicable source-dependent memory stale when its source changes", async t => {
  const { root, store } = await temporaryStore({ dependencyResolver: async sourcePath => sourcePath === "src/button.tsx" ? "new-hash" : null });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await store.upsert({ expectedRevision: 0, mutationId: "dep", item: { id: "dep", text: "Button radius follows source", status: "active", scope: { kind: "paths", paths: ["src"] }, dependencies: [{ path: "src/button.tsx", contentHash: "old-hash" }], authorization: { kind: "user-action", actionId: "dep-action" } } });
  const selected = await store.selectForContext({ paths: ["src/page.tsx"] });
  assert.deepEqual(selected.selectedIds, []);
  assert.equal((await store.get("dep")).item.status, "stale");
});

test("deleting a source chat removes its memories unless the user explicitly preserves them", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const saved = await store.upsert({ expectedRevision: 0, mutationId: "source", item: { id: "source-memory", text: "Source rule", status: "active", authorization: { kind: "user-action", actionId: "source-action" }, evidence: [{ kind: "message", chatId: "chat-one", messageId: "m1", seq: 1, excerpt: "Source" }] } });
  const removed = await store.handleChatDeletion("chat-one");
  assert.equal(removed.affected, 1);
  assert.equal((await store.list()).items.length, 0);
  const again = await store.upsert({ expectedRevision: removed.revision, mutationId: "source-two", item: { id: "source-memory-two", text: "Another source rule", status: "active", authorization: { kind: "user-action", actionId: "source-action-two" }, evidence: [{ kind: "message", chatId: "chat-two", messageId: "m2", seq: 1, excerpt: "Another" }] } });
  const preserved = await store.handleChatDeletion("chat-two", { preserve: true, actionId: "preserve-action" });
  assert.equal(preserved.preserved, true);
  assert.equal((await store.get("source-memory-two")).item.authorization.actionId, "preserve-action");
  assert.ok(saved.item);
  assert.ok(again.item);
});
