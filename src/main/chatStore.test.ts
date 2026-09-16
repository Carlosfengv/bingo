import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ChatStore, TAIL_MAX_BYTES, bytes, hash } from "./chatStore";

async function temporaryStore(options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-chat-store-"));
  return { root, store: new ChatStore(root, options) };
}

test("migrates more than 500 legacy messages into segments without loss", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const chatId = "legacy-chat";
  const chatDirectory = path.join(root, "chats");
  await fs.mkdir(chatDirectory, { recursive: true });
  const messages = Array.from({ length: 620 }, (_, index) => ({
    id: `old-${index}`,
    role: index % 2 ? "assistant" : "user",
    content: `message ${index}`
  }));
  await fs.writeFile(path.join(chatDirectory, `${chatId}.json`), JSON.stringify({ id: chatId, title: "Legacy", messages, createdAt: 1, updatedAt: 2 }));

  const migrated = await store.readManifest(chatId);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.nextSeq, 621);
  assert.ok(migrated.segments.length > 0);
  assert.ok(migrated.tail.length <= 100);
  assert.ok(await fs.stat(path.join(root, "chat-data", chatId, "migration-v1.json")));
  const restored = await store.readAll(chatId);
  assert.equal(restored.messages.length, 620);
  assert.equal(restored.messages[0].id, "old-0");
  assert.equal(restored.messages[619].content, "message 619");
});

test("externalizes large text and attachments while keeping a bounded tail manifest", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const large = "中文内容".repeat(12_000);
  const image = `data:image/png;base64,${Buffer.from("fake-png").toString("base64")}`;
  const chat = await store.createChat({
    id: "large-values",
    messages: [{ id: "m1", role: "user", content: large, inlineRefs: [{ id: "image", type: "image", data: image }] }]
  });
  assert.ok(bytes(chat.tail) < TAIL_MAX_BYTES);
  assert.ok(chat.tail[0].content.__bingoBodyRef);
  assert.ok(chat.tail[0].inlineRefs[0].data.__bingoAttachmentRef);
  const restored = await store.readAll(chat.id);
  assert.equal(restored.messages[0].content, large);
  assert.equal(restored.messages[0].inlineRefs[0].data, image);
});

test("rejects unsafe chat ids and refuses to delete through a symbolic link", async t => {
  const { root, store } = await temporaryStore();
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-chat-outside-"));
  t.after(() => Promise.all([
    fs.rm(root, { recursive: true, force: true }),
    fs.rm(outside, { recursive: true, force: true })
  ]));
  const marker = path.join(outside, "page.json");
  await fs.writeFile(marker, "keep");
  for (const id of [".", "..", "-leading-dash"]) {
    await assert.rejects(() => store.createChat({ id }), error => error.code === "INVALID_ID");
  }
  assert.equal(await fs.readFile(marker, "utf8"), "keep");

  await store.createChat({ id: "linked-chat" });
  await fs.mkdir(path.join(root, "chat-data"), { recursive: true });
  await fs.symlink(outside, path.join(root, "chat-data", "linked-chat"));
  await assert.rejects(() => store.deleteChat("linked-chat"), error => error.code === "UNSAFE_DELETE");
  assert.equal(await fs.readFile(marker, "utf8"), "keep");
});

test("rejects forged, escaping, and symbolic-link storage references", async t => {
  const { root, store } = await temporaryStore();
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-chat-ref-"));
  t.after(() => Promise.all([
    fs.rm(root, { recursive: true, force: true }),
    fs.rm(outside, { recursive: true, force: true })
  ]));
  const secret = "outside-test-marker";
  const secretFile = path.join(outside, "marker.txt");
  await fs.writeFile(secretFile, secret);
  const contentHash = hash(secret);

  await assert.rejects(() => store.createChat({ id: "forged-input", messages: [{
    role: "user", content: { __bingoBodyRef: { file: "../../marker.txt", contentHash, bytes: secret.length } }
  }] }), error => error.code === "INVALID_MESSAGE");

  await store.createChat({ id: "forged-disk", messages: [{ id: "message", role: "user", content: "safe" }] });
  const manifestFile = store.chatFile("forged-disk");
  const manifest = JSON.parse(await fs.readFile(manifestFile, "utf8"));
  manifest.tail[0].content = { __bingoBodyRef: { file: "../../marker.txt", contentHash, bytes: 1_000_000_000 } };
  await fs.writeFile(manifestFile, JSON.stringify(manifest));
  await assert.rejects(() => store.readChat("forged-disk"), error => error.code === "INVALID_BODY");

  await store.createChat({ id: "linked-ref", messages: [{ id: "message", role: "user", content: "safe" }] });
  const linkedManifestFile = store.chatFile("linked-ref");
  const linkedManifest = JSON.parse(await fs.readFile(linkedManifestFile, "utf8"));
  linkedManifest.tail[0].content = { __bingoBodyRef: { file: `bodies/${contentHash}.txt`, contentHash, bytes: secret.length } };
  await fs.writeFile(linkedManifestFile, JSON.stringify(linkedManifest));
  await fs.mkdir(path.join(root, "chat-data", "linked-ref", "bodies"), { recursive: true });
  await fs.symlink(secretFile, path.join(root, "chat-data", "linked-ref", "bodies", `${contentHash}.txt`));
  await assert.rejects(() => store.readChat("linked-ref"), error => error.code === "INVALID_BODY");

  await store.createChat({ id: "attachment-ref", messages: [{ id: "message", role: "user", content: "safe" }] });
  const attachmentManifestFile = store.chatFile("attachment-ref");
  const attachmentManifest = JSON.parse(await fs.readFile(attachmentManifestFile, "utf8"));
  attachmentManifest.tail[0].inlineRefs = [{ data: { __bingoAttachmentRef: {
    file: "../../marker.txt", contentHash, bytes: 1_000_000_000, mimeType: "text/plain"
  } } }];
  await fs.writeFile(attachmentManifestFile, JSON.stringify(attachmentManifest));
  await assert.rejects(() => store.readMessage("attachment-ref", "message"), error => error.code === "INVALID_ATTACHMENT");

  const segmented = await store.createChat({
    id: "segment-ref",
    messages: Array.from({ length: 180 }, (_, index) => ({ id: `segment-${index}`, role: "user", content: `message ${index}` }))
  });
  const segmentManifestFile = store.chatFile(segmented.id);
  const segmentManifest = JSON.parse(await fs.readFile(segmentManifestFile, "utf8"));
  segmentManifest.segments[0].file = "../../marker.txt";
  await fs.writeFile(segmentManifestFile, JSON.stringify(segmentManifest));
  await assert.rejects(() => store.readChat(segmented.id, { limit: 200 }), error => error.code === "INVALID_SEGMENT");
});

test("starts and finalizes an idempotent run and rejects conflicting reuse", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const input = {
    chatTabId: "tab-1",
    requestId: "request-1",
    runId: "run-1",
    payloadHash: hash("hello"),
    userMessage: { id: "user-1", role: "user", content: "hello" }
  };
  const started = await store.startRun(input);
  assert.equal(started.replay, false);
  await assert.rejects(() => store.startRun({ ...input, requestId: "request-2", runId: "run-2" }), error => error.code === "CHAT_BUSY");
  await store.checkpointRun(started.chatId, started.runId, { content: "partial" });
  await store.finalizeRun(started.chatId, started.runId, {
    content: "done",
    outcome: "completed",
    operationFacts: [{ id: "op-1", outcome: "succeeded" }]
  });
  const replay = await store.startRun(input);
  assert.deepEqual({ replay: replay.replay, status: replay.status, runId: replay.runId }, { replay: true, status: "completed", runId: "run-1" });
  await assert.rejects(() => store.startRun({ ...input, payloadHash: hash("different") }), error => error.code === "IDEMPOTENCY_CONFLICT");
  const saved = await store.readAll(started.chatId);
  assert.equal(saved.messages.length, 2);
  assert.equal(saved.messages[1].content, "done");
  assert.equal(saved.messages[1].finalized, true);
  assert.equal(saved.messages[1].operationFacts[0].outcome, "succeeded");
});

test("persists an active run as cancelled before chat lifecycle changes", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const started = await store.startRun({ chatId: "cancel-before-delete", requestId: "cancel-request", runId: "cancel-run", userMessage: { role: "user", content: "work" } });
  const cancelled = await store.cancelActiveRun(started.chatId);
  assert.ok(cancelled);
  assert.equal(await store.cancelActiveRun(started.chatId), false);
  const chat = await store.readAll(started.chatId);
  const assistant = chat.messages.find(message => message.runId === "cancel-run" && message.role === "assistant");
  assert.equal(assistant.outcome, "cancelled");
  assert.equal(assistant.finalized, true);
  await store.deleteChat(started.chatId);
  assert.equal(await store.resolveChatId(started.chatId), null);
});

test("resolves a temporary chat tab id for paged reads after the first run", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const started = await store.startRun({
    chatTabId: "local-tab-1",
    requestId: "request-alias",
    runId: "run-alias",
    userMessage: { id: "user-alias", role: "user", content: "hello" }
  });
  await store.finalizeRun(started.chatId, started.runId, { content: "done", outcome: "completed" });

  const page = await store.readChat("local-tab-1", { limit: 50 });
  assert.equal(page.id, started.chatId);
  assert.deepEqual(page.messages.map(message => message.content), ["hello", "done"]);
  const all = await store.readAll("local-tab-1");
  assert.equal(all.id, started.chatId);
});

test("recovers a run owned by a previous process as interrupted before accepting new work", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const started = await store.startRun({ chatId: "recover", chatTabId: "recover-tab", requestId: "old-request", runId: "old-run", userMessage: { role: "user", content: "old" } });
  const file = path.join(root, "chats", `${started.chatId}.json`);
  const manifest = JSON.parse(await fs.readFile(file, "utf8"));
  manifest.activeRun.processId = process.pid + 1000;
  await fs.writeFile(file, JSON.stringify(manifest, null, 2));

  const next = await store.startRun({ chatId: started.chatId, requestId: "new-request", runId: "new-run", userMessage: { role: "user", content: "new" } });
  assert.equal(next.status, "running");
  const saved = await store.readAll(started.chatId);
  assert.equal(saved.messages[1].outcome, "interrupted");
  assert.equal(saved.messages[1].finalized, true);
  const replay = await store.startRun({ chatId: started.chatId, requestId: "old-request", runId: "old-run", userMessage: { role: "user", content: "old" } });
  assert.equal(replay.status, "interrupted");
});

test("does not read sealed segment bodies when appending a normal run", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const created = await store.createChat({
    id: "segmented",
    messages: Array.from({ length: 180 }, (_, index) => ({ id: `m-${index}`, role: index % 2 ? "assistant" : "user", content: `message ${index}` }))
  });
  assert.ok(created.segments.length > 0);
  const segmentFile = path.join(root, "chat-data", created.id, created.segments[0].file);
  await fs.chmod(segmentFile, 0o000);
  const started = await store.startRun({ chatId: created.id, requestId: "new-request", runId: "new-run", userMessage: { role: "user", content: "new" } });
  assert.equal(started.status, "running");
  await fs.chmod(segmentFile, 0o600);
});

test("edits and deletes messages with optimistic revision and mutation idempotency", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const created = await store.createChat({
    id: "mutations",
    messages: Array.from({ length: 180 }, (_, index) => ({ id: `m-${index}`, role: index % 2 ? "assistant" : "user", content: `before ${index}` }))
  });
  const oldSegmentFile = created.segments[0].file;
  const edited = await store.mutateMessage(created.id, { type: "edit", messageId: "m-0", patch: { content: "after" }, mutationId: "edit-1", expectedRevision: created.revision });
  assert.equal(edited.replay, false);
  assert.equal((await store.readChat(created.id, { limit: 200 })).messages[0].content, "after");
  await assert.rejects(() => fs.stat(path.join(root, "chat-data", created.id, oldSegmentFile)), error => error.code === "ENOENT");
  const replay = await store.mutateMessage(created.id, { type: "edit", messageId: "m-0", patch: { content: "after" }, mutationId: "edit-1", expectedRevision: created.revision });
  assert.equal(replay.replay, true);
  await assert.rejects(() => store.mutateMessage(created.id, { type: "edit", messageId: "m-0", patch: { content: "different" }, mutationId: "edit-1", expectedRevision: edited.revision }), error => error.code === "IDEMPOTENCY_CONFLICT");
  await assert.rejects(() => store.mutateMessage(created.id, { type: "delete", messageId: "m-1", mutationId: "delete-stale", expectedRevision: created.revision }), error => error.code === "CONFLICT");
  const removed = await store.mutateMessage(created.id, { type: "delete", messageId: "m-1", mutationId: "delete-1", expectedRevision: edited.revision });
  assert.equal(removed.messageCount, 179);
  assert.equal((await store.readAll(created.id)).messages.some(message => message.id === "m-1"), false);
});

test("searches current-chat history in bounded resumable batches and pages large bodies", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const large = `${"甲".repeat(100_000)}needle-at-end`;
  const created = await store.createChat({ id: "search", messages: [
    { id: "early", role: "user", content: "remember cobalt" },
    { id: "large", role: "assistant", content: large }
  ] });
  const first = await store.searchHistory(created.id, { query: "needle-at-end", scanBytes: 32 * 1024 });
  assert.equal(first.complete, false);
  let page = first;
  let found = [];
  for (let index = 0; index < 20 && page.nextCursor; index += 1) {
    page = await store.searchHistory(created.id, { query: "needle-at-end", cursor: page.nextCursor, scanBytes: 32 * 1024 });
    found.push(...page.results);
    if (found.length) break;
  }
  assert.equal(found[0].messageId, "large");
  assert.ok(first.scannedBytes <= 32 * 1024);
  const exact = await store.searchHistory(created.id, { messageId: "early" });
  assert.equal(exact.results[0].message.content, "remember cobalt");
  const body = await store.searchHistory(created.id, { bodyMessageId: "large", bodyLimit: 4096 });
  assert.equal(Buffer.byteLength(body.content, "utf8") <= 4096, true);
  assert.equal(typeof body.nextOffset, "number");
  let reconstructed = body.content;
  let nextOffset = body.nextOffset;
  while (nextOffset !== null) {
    const next = await store.searchHistory(created.id, { bodyMessageId: "large", bodyOffset: nextOffset, bodyLimit: 4096 });
    assert.equal(next.content.includes("�"), false);
    reconstructed += next.content;
    nextOffset = next.nextOffset;
  }
  assert.equal(reconstructed, large);
  await assert.rejects(() => store.searchHistory(created.id, { query: "different", cursor: first.nextCursor }), error => error.code === "INVALID_CURSOR");
});

test("keeps cumulative attachment hydration within the requested page budget", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const attachment = suffix => `data:image/png;base64,${Buffer.alloc(18_000, suffix).toString("base64")}`;
  const created = await store.createChat({ id: "bounded-attachments", messages: [{
    id: "many-attachments",
    role: "user",
    content: "attachments",
    inlineRefs: [0, 1, 2, 3].map(index => ({ id: `image-${index}`, type: "image", data: attachment(index + 1) }))
  }] });
  const page = await store.readChat(created.id, { limit: 1, maxBytes: 32 * 1024 });
  const hydrated = page.messages[0].inlineRefs.filter(ref => typeof ref.data === "string");
  const deferred = page.messages[0].inlineRefs.filter(ref => ref.data?.attachmentRef);
  assert.ok(hydrated.length < 4);
  assert.ok(deferred.length > 0);
});

test("reads deferred activity text in UTF-8 pages without changing saved history", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const text = "长记录😀".repeat(10_000);
  await store.createChat({ id: "activity-body", messages: [
    { id: "answer", role: "assistant", content: "Visible answer", activity: [{ type: "thinking", text }] },
    { id: "other", role: "user", content: "Other message" }
  ] });
  const before = await fs.readFile(store.chatFile("activity-body"), "utf8");
  const message = await store.readMessage("activity-body", "answer");
  const bodyId = message.activity[0].text.bodyRef.contentHash;
  assert.equal(message.content, "Visible answer");
  let offset = 0;
  let reconstructed = "";
  do {
    const page = await store.readMessageBody("activity-body", "answer", { bodyId, offset, limit: 1024 });
    assert.ok(Buffer.byteLength(page.content) <= 1024);
    assert.ok(!page.content.includes("�"));
    reconstructed += page.content;
    offset = page.nextOffset;
  } while (offset !== null);
  assert.equal(reconstructed, text);
  await assert.rejects(() => store.readMessageBody("activity-body", "other", { bodyId }), error => error.code === "NOT_FOUND");
  await assert.rejects(() => store.readMessageBody("activity-body", "answer", { bodyId: "../../secret" }), error => error.code === "INVALID_BODY");
  await assert.rejects(() => store.readMessageBody("activity-body", "answer", { bodyId, offset: -1 }), error => error.code === "INVALID_CURSOR");
  assert.equal(await fs.readFile(store.chatFile("activity-body"), "utf8"), before);
  assert.equal((await store.readAll("activity-body")).messages[0].activity[0].text, text);
});

test("injects only pre-run history and preserves active constraints verbatim", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const created = await store.createChat({ id: "context", messages: [
    { id: "rule-source", role: "user", content: "Always use cobalt for primary actions." },
    { id: "answer", role: "assistant", content: "Understood." }
  ] });
  const pinned = await store.pinConstraint(created.id, { messageId: "rule-source", quote: "Always use cobalt for primary actions.", constraintId: "constraint-1", mutationId: "pin-1", expectedRevision: created.revision });
  const started = await store.startRun({ chatId: created.id, requestId: "context-run", runId: "context-run", userMessage: { id: "current", role: "user", content: "Make a button" } });
  const context = await store.contextMessagesBeforeRun(created.id, started.runId);
  assert.deepEqual(context.messages.map(message => message.id), ["rule-source", "answer"]);
  assert.equal(context.messages.some(message => message.id === "current"), false);
  assert.match(context.constraintText, /Always use cobalt/);
  const changed = await store.mutateMessage(created.id, { type: "edit", messageId: "rule-source", patch: { content: "Use green." }, mutationId: "edit-rule", expectedRevision: started.revision });
  assert.equal(changed.constraints[0].status, "resolved");
  assert.equal(changed.constraints[0].resolvedReason, "source-edited");
  assert.equal(pinned.constraints[0].status, "active");
});

test("commits generation-checked summaries without changing chat revision and invalidates covered edits", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const created = await store.createChat({ id: "summary", messages: Array.from({ length: 26 }, (_, index) => ({ id: `s-${index}`, role: index % 2 ? "assistant" : "user", content: `summary message ${index}` })) });
  const input = await store.prepareSummaryInput(created.id);
  assert.ok(input);
  const candidate = {
    generation: input.expectedGeneration,
    coveredThroughSeq: input.coveredThroughSeq,
    coveredPrefixHash: input.expectedPrefixHash,
    goal: [], decisions: [], completed: [], pending: [], openQuestions: [], relevantPaths: [], relevantElementIds: []
  };
  const committed = await store.commitSummary(created.id, candidate, input);
  assert.equal(committed.revision, created.revision);
  assert.equal(committed.summary.generation, 1);
  await assert.rejects(() => store.commitSummary(created.id, candidate, input), error => error.code === "STALE_GENERATION");
  const edited = await store.mutateMessage(created.id, { type: "edit", messageId: "s-0", patch: { content: "changed" }, mutationId: "summary-edit", expectedRevision: created.revision });
  assert.equal(edited.summary.valid, false);
  assert.equal(edited.summary.invalidatedReason, "source-edited");
});

test("does not commit a generated summary after the chat is archived", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const created = await store.createChat({ id: "archived-summary", messages: Array.from({ length: 26 }, (_, index) => ({ id: `archive-${index}`, role: index % 2 ? "assistant" : "user", content: `message ${index}` })) });
  const input = await store.prepareSummaryInput(created.id);
  assert.ok(input);
  const candidate = {
    generation: input.expectedGeneration,
    coveredThroughSeq: input.coveredThroughSeq,
    coveredPrefixHash: input.expectedPrefixHash,
    goal: [], decisions: [], completed: [], pending: [], openQuestions: [], relevantPaths: [], relevantElementIds: []
  };
  await store.patchMetadata(created.id, { archived: true }, created.revision);
  await assert.rejects(() => store.commitSummary(created.id, candidate, input), error => error.code === "CHAT_UNAVAILABLE");
});

test("keeps the previous manifest when a later atomic commit fails", async t => {
  let failManifest = false;
  const { root, store } = await temporaryStore({
    hooks: {
      beforeStep(step) {
        if (failManifest && step === "run-start-manifest") throw new Error("simulated disk failure");
      }
    }
  });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await store.createChat({ id: "atomic", messages: [{ role: "user", content: "saved" }] });
  const before = await fs.readFile(path.join(root, "chats", "atomic.json"), "utf8");
  failManifest = true;
  await assert.rejects(() => store.startRun({ chatId: "atomic", requestId: "r", runId: "run", userMessage: { role: "user", content: "not committed" } }), /simulated disk failure/);
  const after = await fs.readFile(path.join(root, "chats", "atomic.json"), "utf8");
  assert.equal(after, before);
  assert.equal((await store.readAll("atomic")).messages.length, 1);
});

test("rejects legacy full-message replacement for v2 chats", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await store.createChat({ id: "v2" });
  await assert.rejects(() => store.replaceMessagesLegacy("v2", []), error => error.code === "V2_FULL_REPLACE_REJECTED");
});

test("reports corrupt and unsupported manifests without overwriting them", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "chats"), { recursive: true });
  await fs.writeFile(path.join(root, "chats", "corrupt.json"), "{bad");
  await fs.writeFile(path.join(root, "chats", "future.json"), JSON.stringify({ schemaVersion: 99, id: "future" }));
  await assert.rejects(() => store.readManifest("corrupt"), error => error.code === "CORRUPT");
  await assert.rejects(() => store.readManifest("future"), error => error.code === "UNSUPPORTED_VERSION");
  assert.equal(await fs.readFile(path.join(root, "chats", "corrupt.json"), "utf8"), "{bad");
});

test("deletes the manifest, segments, bodies, attachments, and migration backup", async t => {
  const { root, store } = await temporaryStore();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const chat = await store.createChat({ id: "delete-me", messages: [{ role: "user", content: "x".repeat(40_000) }] });
  await fs.writeFile(path.join(root, "chat-data", chat.id, "migration-v1.json"), "{}");
  await store.deleteChat(chat.id);
  await assert.rejects(() => fs.stat(path.join(root, "chats", `${chat.id}.json`)), error => error.code === "ENOENT");
  await assert.rejects(() => fs.stat(path.join(root, "chat-data", chat.id)), error => error.code === "ENOENT");
});

test("resumes a deletion left after the deleting manifest was committed", async t => {
  let failDelete = true;
  const { root, store } = await temporaryStore({
    hooks: { beforeStep(step) { if (failDelete && step === "delete-data") throw new Error("simulated delete interruption"); } }
  });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await store.createChat({ id: "resume-delete", messages: [{ role: "user", content: "saved" }] });
  await assert.rejects(() => store.deleteChat("resume-delete"), /simulated delete interruption/);
  assert.equal((await store.readManifest("resume-delete")).lifecycle, "deleting");
  await assert.rejects(() => store.startRun({ chatId: "resume-delete", requestId: "late", userMessage: { role: "user", content: "late" } }), error => error.code === "CHAT_UNAVAILABLE" || error.code === "NOT_FOUND");
  failDelete = false;
  assert.deepEqual(await store.listChats({ includeArchived: true }), []);
  await assert.rejects(() => fs.stat(path.join(root, "chats", "resume-delete.json")), error => error.code === "ENOENT");
});
