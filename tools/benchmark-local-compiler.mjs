import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import compilerModule from "../src/main/localCompiler.ts";
import cacheModule from "../src/main/projectBuildCache.ts";

const {
  connectLocalBuilder,
  disconnectLocalBuilder,
  subscribeLocalBuilderEvents,
} = compilerModule;
const {
  clearProjectBuildCache,
  configureProjectBuildCache,
} = cacheModule;

const sourceCount = Math.max(1, Number.parseInt(process.argv[2] || "295", 10));
const benchmarkRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-compiler-benchmark-"));
const projectRoot = path.join(benchmarkRoot, "project");
const userDataRoot = path.join(benchmarkRoot, "user-data");
const sourceRoot = path.join(projectRoot, "src");
const events = [];
const unsubscribe = subscribeLocalBuilderEvents((event) => events.push(event));

async function waitFor(sessionId, type, cursor, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const event = events.slice(cursor).find((candidate) => candidate.sessionId === sessionId && candidate.type === type);
    if (event) return event;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for ${type} in ${sessionId}`);
}

async function measureOpen(sessionId) {
  const cursor = events.length;
  const startedAt = performance.now();
  await connectLocalBuilder({ root: projectRoot, sessionId });
  const ready = await waitFor(sessionId, "components:ready", cursor);
  const durationMs = performance.now() - startedAt;
  const sessionEvents = events.slice(cursor).filter((event) => event.sessionId === sessionId);
  await disconnectLocalBuilder({ root: projectRoot, sessionId });
  return {
    durationMs: Math.round(durationMs * 10) / 10,
    cacheSource: ready.payload.cacheSource || null,
    compiled: sessionEvents.some((event) => event.type === "modules:build_started"),
  };
}

try {
  await fs.mkdir(sourceRoot, { recursive: true });
  await fs.writeFile(path.join(projectRoot, "package.json"), JSON.stringify({ name: "benchmark", private: true }));
  await Promise.all(Array.from({ length: sourceCount }, (_, index) => {
    const name = `Component${String(index).padStart(4, "0")}`;
    return fs.writeFile(path.join(sourceRoot, `${name}.tsx`), `export function ${name}() { return <div>${index}</div>; }`);
  }));
  configureProjectBuildCache(userDataRoot);
  await clearProjectBuildCache({ disk: true });

  const cold = await measureOpen("benchmark-cold");
  const memory = await measureOpen("benchmark-memory");
  await clearProjectBuildCache();
  const disk = await measureOpen("benchmark-disk");

  const incrementalOpenCursor = events.length;
  await connectLocalBuilder({ root: projectRoot, sessionId: "benchmark-incremental" });
  await waitFor("benchmark-incremental", "components:ready", incrementalOpenCursor);
  const cursor = events.length;
  const startedAt = performance.now();
  await fs.writeFile(path.join(sourceRoot, "Component0000.tsx"), "export function Component0000() { return <strong>updated</strong>; }");
  await waitFor("benchmark-incremental", "components:updated", cursor);
  const incrementalEvents = events.slice(cursor).filter((event) => event.sessionId === "benchmark-incremental");
  const incrementalProgress = incrementalEvents.find((event) => event.type === "modules:build_progress");
  const incremental = {
    durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    entries: incrementalProgress?.payload?.total ?? null,
  };
  await disconnectLocalBuilder({ root: projectRoot, sessionId: "benchmark-incremental" });

  process.stdout.write(`${JSON.stringify({ sourceCount, cold, memory, disk, incremental }, null, 2)}\n`);
} finally {
  unsubscribe();
  await clearProjectBuildCache({ disk: true });
  configureProjectBuildCache(null);
  await fs.rm(benchmarkRoot, { recursive: true, force: true });
}
