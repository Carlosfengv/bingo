import assert from "node:assert/strict";
import test from "node:test";
import { createVersionedSaveQueue } from "./versionedSaveQueue";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test("rapid edits prepare only the latest snapshot and duplicate snapshots do nothing", async () => {
  const saved: number[] = [];
  const q = createVersionedSaveQueue<number>({ delayMs: 60_000, equal: Object.is, save: async (_, value) => { saved.push(value); } });
  for (let i = 0; i < 100; i++) q.update("a", i);
  assert.deepEqual(saved, []);
  await q.flush();
  q.update("a", 99);
  await q.flush();
  assert.deepEqual(saved, [99]);
  assert.equal(q.hasPending(), false);
  q.dispose();
});

test("slow writes serialize and cannot acknowledge newer edits; flush includes new pages", async () => {
  const gate = deferred();
  const saved: string[] = [];
  const q = createVersionedSaveQueue<string>({ delayMs: 60_000, equal: Object.is, save: async (key, value) => {
    saved.push(key + value);
    if (value === "1") await gate.promise;
  } });
  q.update("a", "1");
  const flush = q.flush();
  await Promise.resolve();
  q.update("a", "2"); q.update("a", "3"); q.update("b", "4");
  assert.equal(q.isCurrent("a", 1), false);
  assert.deepEqual(saved, ["a1"]);
  gate.resolve();
  await flush;
  assert.deepEqual(saved, ["a1", "a3", "b4"]);
  assert.equal(q.hasPending(), false);
  q.dispose();
});

test("failed snapshots remain pending and a later flush retries", async () => {
  let fail = true;
  const q = createVersionedSaveQueue<number>({ delayMs: 60_000, equal: Object.is, save: async () => { if (fail) throw Error("disk failed"); } });
  q.update("a", 1);
  await assert.rejects(q.flush(), /disk failed/);
  assert.equal(q.hasPending(), true);
  fail = false;
  await q.flush();
  assert.equal(q.hasPending(), false);
  q.dispose();
});

test("deleting a page cancels queued revisions and waits for its in-flight write", async () => {
  const gate = deferred();
  const saved: number[] = [];
  const q = createVersionedSaveQueue<number>({ delayMs: 60_000, equal: Object.is, save: async (_, value) => { saved.push(value); await gate.promise; } });
  q.update("a", 1);
  const flush = q.flush(); await Promise.resolve();
  q.update("a", 2);
  let removed = false;
  const remove = q.remove("a").then(() => { removed = true; });
  await Promise.resolve(); assert.equal(removed, false);
  gate.resolve(); await remove; await flush;
  assert.deepEqual(saved, [1]);
  assert.equal(q.hasPending(), false);
  q.dispose();
});

test("disposing cancels scheduled writes and drops queued revisions", async () => {
  let saves = 0;
  const q = createVersionedSaveQueue<number>({ delayMs: 1, equal: Object.is, save: async () => { saves++; } });
  q.update("a", 1); q.dispose();
  await new Promise(resolve => setTimeout(resolve, 10));
  await q.flush();
  assert.equal(saves, 0);
});

test("a removed and reopened document cannot reuse an obsolete task version", async () => {
  let firstVersion = 0;
  const q = createVersionedSaveQueue<number>({ delayMs: 60_000, equal: Object.is,
    save: async (_, _value, version) => { firstVersion ||= version; } });
  q.update("a", 1); await q.flush();
  await q.remove("a"); q.update("a", 2);
  assert.equal(q.isCurrent("a", firstVersion), false);
  await q.flush(); q.dispose();
});

test("concurrent flush calls join one write instead of duplicating it", async () => {
  const gate = deferred(); let calls = 0;
  const q = createVersionedSaveQueue<number>({ delayMs: 60_000, equal: Object.is,
    save: async () => { calls++; await gate.promise; } });
  q.update("a", 1);
  const a = q.flush(), b = q.flush();
  await Promise.resolve(); assert.equal(calls, 1);
  gate.resolve(); await Promise.all([a, b]); q.dispose();
});
