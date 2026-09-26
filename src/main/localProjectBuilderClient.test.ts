import assert from "node:assert/strict";
import test from "node:test";
import { LocalProjectBuilderClient } from "../../packages/workspace/src/services/LocalProjectBuilderClient";

test("local parameter scans rebuild metadata and report completion even without scan events", async () => {
  const client = new LocalProjectBuilderClient();
  client.projectId = "/project";
  client.sessionId = "session";
  const calls: unknown[] = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { api: {
    invoke: async (...args: unknown[]) => { calls.push(args); return { ok: true }; },
  } } });
  try {
    assert.deepEqual(await client.scanComponents({ componentKey: "MemoComponent", projectId: "/project" }), { success: true, status: "rebuilt" });
    assert.deepEqual(await client.scanComponents({ forceRescan: true }), { success: true, status: "rebuilt" });
    assert.deepEqual(calls, Array(2).fill(["bingo:builder-rebuild", { root: "/project", sessionId: "session" }]));
    assert.deepEqual(await client.scanComponents(), { success: true, status: "cached" });
    assert.equal(calls.length, 2);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("unconnected and wrong-project scans fail before invoking another project's builder", async () => {
  const client = new LocalProjectBuilderClient();
  await assert.rejects(client.scanComponents({ componentKey: "Button" }), /not connected/);
  client.projectId = "/other";
  client.sessionId = "other-session";
  await assert.rejects(client.scanComponents({ componentKey: "Button", projectId: "/project" }), /not connected/);
});

test("a rejected local rebuild is not reported as a successful parameter scan", async () => {
  const client = new LocalProjectBuilderClient();
  client.projectId = "/project";
  client.sessionId = "session";
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { api: {
    invoke: async () => ({ ok: false, error: "Session closed during rebuild" }),
  } } });
  try {
    await assert.rejects(client.scanComponents({ componentKey: "Button" }), /Session closed during rebuild/);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
