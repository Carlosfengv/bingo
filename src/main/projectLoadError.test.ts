import assert from "node:assert/strict";
import test from "node:test";
import { LocalProjectBuilderClient } from "../../packages/workspace/src/services/LocalProjectBuilderClient";
import { createProjectLoadFailure, updateProjectLoadProgress } from "../../packages/workspace/src/utils/projectLoadError";

test("build failure keeps its diagnostic id and original error for late subscribers", () => {
  const client = new LocalProjectBuilderClient();
  client.projectId = "/project";
  const failure = { type: "modules:build_failed", sessionId: "session", buildId: 4,
    payload: { error: "Cannot resolve ./Card.tsx", incidentId: "inc-existing", reportPath: "/diagnostics/report.json" } };
  client.emit(failure);
  const replayed = [];
  client.on(event => replayed.push(event), "/project");
  assert.equal(replayed.at(-1), failure);
  const progress = updateProjectLoadProgress({}, failure);
  const report = createProjectLoadFailure({ projectId: "/project", progress, loading: true, cssLoaded: false, timedOut: true, startedAt: 0, now: 20000 });
  assert.equal(report.error, "Cannot resolve ./Card.tsx");
  assert.equal(report.incidentId, "inc-existing");
  assert.equal(report.sessionId, "session");
  assert.equal(report.buildId, 4);
  assert.equal(report.code, "PROJECT_BUILD_FAILED");
});

test("timeout report identifies the last file and distinguishes CSS from build waiting", () => {
  const progress = updateProjectLoadProgress({}, { type: "modules:build_progress", sessionId: "session", buildId: 2,
    payload: { processed: 5, total: 100, file: "src/很长的组件.tsx" } });
  const options = { projectId: "/项目", progress, cssLoaded: false, timedOut: true, startedAt: 100, now: 20100 };
  const build = createProjectLoadFailure({ ...options, loading: true });
  assert.equal(build.stage, "building");
  assert.equal(build.file, "src/很长的组件.tsx");
  assert.equal(build.elapsedMs, 20000);
  assert.equal(build.error, null);
  assert.equal(build.code, "PROJECT_LOAD_TIMEOUT");
  assert.equal(createProjectLoadFailure({ ...options, loading: false }).stage, "styles");
});

test("new build and successful cache restore clear stale failure metadata", () => {
  const previous = { error: "old failure", incidentId: "old-id", reportPath: "old-path", file: "old-file" };
  for (const type of ["modules:build_started", "modules:ready"]) {
    const next = updateProjectLoadProgress(previous, { type, payload: {} });
    assert.equal(next.error, null);
    assert.equal(next.incidentId, null);
    assert.equal(next.reportPath, null);
  }
  const client = new LocalProjectBuilderClient();
  client.projectId = "/project";
  client.emit({ type: "connection:failed", payload: { error: "old failure" } });
  client.emit({ type: "modules:build_started", payload: {} });
  const events = [];
  client.on(event => events.push(event), "/project");
  assert.equal(events.some(event => event.type === "connection:failed"), false);
});

test("connection rejection is emitted with context instead of only reaching the console", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { api: { on: () => () => {}, invoke: async () => { throw new Error("EACCES: cannot open project"); } } };
  const client = new LocalProjectBuilderClient();
  try {
    await assert.rejects(client.connect("/project"), /EACCES/);
    assert.equal(client.lastFailure.type, "connection:failed");
    assert.equal(client.lastFailure.projectId, "/project");
    assert.equal(client.lastFailure.payload.error, "EACCES: cannot open project");
    assert.equal(client.isConnected("/project"), false);
  } finally { client.disconnect(); globalThis.window = previousWindow; }
});

test("a stale connection cannot mark another project connected or replace its failure", async () => {
  const previousWindow = globalThis.window;
  let resolveOld;
  globalThis.window = { api: { on: () => () => {}, invoke: (channel, args) => channel === "bingo:builder-connect" && args.root === "/old"
    ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ ok: true }) } };
  const client = new LocalProjectBuilderClient();
  try {
    const oldConnection = client.connect("/old");
    client.disconnect();
    resolveOld({ ok: true });
    await oldConnection;
    assert.equal(client.isConnected(), false);
    assert.equal(client.lastFailure, null);
  } finally { client.disconnect(); globalThis.window = previousWindow; }
});
