import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  compileProject,
  connectLocalBuilder,
  disconnectLocalBuilder,
  loadLocalModule,
  rebuildLocalBuilder,
  subscribeLocalBuilderEvents,
} from "./localCompiler";
import { clearProjectBuildCache, configureProjectBuildCache } from "./projectBuildCache";

async function waitForEvent(events, predicate, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const event = events.find(predicate);
    if (event) return event;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`Timed out waiting for builder event. Received: ${events.map((event) => event.type).join(", ")}`);
}

async function createWorkspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-compiler-"));
  const files = {
    "package.json": JSON.stringify({ name: "fixture", private: true, workspaces: ["apps/*", "packages/*"] }),
    "tsconfig.json": JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@shared/*": ["packages/shared/src/*"] } } }),
    "apps/web/package.json": JSON.stringify({ name: "web", dependencies: { react: "^19.0.0" } }),
    "apps/web/tsconfig.json": JSON.stringify({ extends: "../../tsconfig.json", compilerOptions: { jsx: "react-jsx" } }),
    "apps/web/src/Card.tsx": "import { Thing } from '@shared/Thing'; export function Card() { return <Thing />; }",
    "packages/shared/package.json": JSON.stringify({ name: "@fixture/shared", peerDependencies: { react: "^19.0.0" } }),
    "packages/shared/src/Thing.tsx": "import './shared.css'; export function Thing() { return <span className='shared'>Shared</span>; }",
    "packages/shared/src/shared.css": ".shared { color: rgb(12, 34, 56); }",
  };
  for (const [relativePath, contents] of Object.entries(files)) {
    const file = path.join(root, relativePath);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, contents);
  }
  return root;
}

test("installed project modules cannot be silently supplied by Bingo's own dependencies", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-module-boundary-"));
  try {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "fixture" }));
    const result = await loadLocalModule({ root, specifier: "@phosphor-icons/react" });
    assert.equal(result.success, false);
    assert.match(result.error, /resolve|Could not/i);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("compiles a child project through inherited workspace aliases and records shared dependencies", async () => {
  const workspace = await createWorkspace();
  try {
    const projectRoot = path.join(workspace, "apps/web");
    const result = await compileProject(projectRoot);
    const canonicalWorkspace = await fs.realpath(workspace);
    assert.ok(result.componentIndex.Card);
    assert.equal(result.workspaceRoot, canonicalWorkspace);
    assert.ok(
      result.dependencyFiles.includes(path.join(canonicalWorkspace, "packages/shared/src/Thing.tsx")),
      `shared component missing from ${JSON.stringify(result.dependencyFiles)}`
    );
    assert.ok(
      result.dependencyFiles.includes(path.join(canonicalWorkspace, "packages/shared/src/shared.css")),
      `shared stylesheet missing from ${JSON.stringify(result.dependencyFiles)}`
    );
    assert.ok(result.cssUrl);
    const css = Buffer.from(result.cssUrl.split(",")[1], "base64").toString("utf8");
    assert.match(css, /rgb\(12, 34, 56\)/);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

test("stylesheet compile errors reach the UI without publishing raw CSS or hiding usable components", async () => {
  const workspace = await createWorkspace();
  try {
    const root = path.join(workspace, "apps/web");
    await fs.writeFile(path.join(workspace, "packages/shared/src/shared.css"), '@import "./missing.css";');
    const result = await compileProject(root);
    assert.ok(result.componentIndex.Card);
    assert.equal(result.complete, false);
    assert.equal(result.cssUrl, null);
    assert.match(result.cssError, /missing\.css/);
  } finally { await fs.rm(workspace, { recursive: true, force: true }); }
});

test("ignores tooling configuration and test files when compiling component entries", async () => {
  const workspace = await createWorkspace();
  const projectRoot = path.join(workspace, "apps/web");
  try {
    await fs.writeFile(
      path.join(projectRoot, "eslint.config.js"),
      "import parser from '@missing/eslint-parser'; export default [{ languageOptions: { parser } }];"
    );
    await fs.writeFile(
      path.join(projectRoot, "src/Card.test.tsx"),
      "import testOnly from '@missing/test-helper'; export const TestOnly = testOnly;"
    );

    const result = await compileProject(projectRoot);

    assert.equal(result.complete, true);
    assert.deepEqual(result.rebuiltEntries, ["src/Card.tsx"]);
    assert.equal(result.componentIndex.TestOnly, undefined);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

test("stops before compiling files when its session is cancelled", async () => {
  const workspace = await createWorkspace();
  try {
    await assert.rejects(
      () => compileProject(path.join(workspace, "apps/web"), { isCancelled: () => true }),
      (error) => error?.code === "BUILD_CANCELLED"
    );
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

test("disconnecting one session suppresses its stale results without stopping another session", async () => {
  const workspace = await createWorkspace();
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents((event) => events.push(event));
  const root = path.join(workspace, "apps/web");
  try {
    await connectLocalBuilder({ root, sessionId: "cancelled-session" });
    await connectLocalBuilder({ root, sessionId: "active-session" });
    await disconnectLocalBuilder({ root, sessionId: "cancelled-session" });

    await waitForEvent(
      events,
      (event) => event.sessionId === "active-session" && event.type === "modules:ready"
    );

    assert.equal(
      events.some((event) => event.sessionId === "cancelled-session" && event.type === "modules:ready"),
      false
    );
    assert.equal(
      events.some((event) => event.sessionId === "active-session" && event.type === "modules:ready"),
      true
    );
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId: "cancelled-session" });
    await disconnectLocalBuilder({ root, sessionId: "active-session" });
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

test("reuses a verified in-memory build when reopening an unchanged project", async () => {
  clearProjectBuildCache();
  const workspace = await createWorkspace();
  const root = path.join(workspace, "apps/web");
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents((event) => events.push(event));
  try {
    await connectLocalBuilder({ root, sessionId: "first-open" });
    await waitForEvent(events, (event) => event.sessionId === "first-open" && event.type === "components:ready");
    await disconnectLocalBuilder({ root, sessionId: "first-open" });

    const reopenedAt = events.length;
    await connectLocalBuilder({ root, sessionId: "second-open" });
    const ready = await waitForEvent(
      events,
      (event) => event.sessionId === "second-open" && event.type === "components:ready"
    );
    const reopenEvents = events.slice(reopenedAt).filter((event) => event.sessionId === "second-open");
    assert.equal(reopenEvents.some((event) => event.type === "modules:build_started"), false);
    assert.equal(ready.payload.cacheSource, "memory");
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId: "first-open" });
    await disconnectLocalBuilder({ root, sessionId: "second-open" });
    await fs.rm(workspace, { recursive: true, force: true });
    clearProjectBuildCache();
  }
});

test("content changes invalidate the cache even when file size and mtime are preserved", async () => {
  clearProjectBuildCache();
  const workspace = await createWorkspace();
  const root = path.join(workspace, "apps/web");
  const sourceFile = path.join(root, "src/Card.tsx");
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents((event) => events.push(event));
  try {
    await connectLocalBuilder({ root, sessionId: "before-change" });
    await waitForEvent(events, (event) => event.sessionId === "before-change" && event.type === "components:ready");
    await disconnectLocalBuilder({ root, sessionId: "before-change" });

    const [original, stat] = await Promise.all([fs.readFile(sourceFile, "utf8"), fs.stat(sourceFile)]);
    const changed = original.replace("Card", "Dard");
    assert.equal(changed.length, original.length);
    await fs.writeFile(sourceFile, changed);
    await fs.utimes(sourceFile, stat.atime, stat.mtime);

    const reopenedAt = events.length;
    await connectLocalBuilder({ root, sessionId: "after-change" });
    const ready = await waitForEvent(
      events,
      (event) => event.sessionId === "after-change" && event.type === "components:ready"
    );
    const reopenEvents = events.slice(reopenedAt).filter((event) => event.sessionId === "after-change");
    assert.equal(reopenEvents.some((event) => event.type === "modules:build_started"), true);
    assert.ok(ready.payload.componentIndex.Dard);
    assert.equal(ready.payload.cacheSource, undefined);
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId: "before-change" });
    await disconnectLocalBuilder({ root, sessionId: "after-change" });
    await fs.rm(workspace, { recursive: true, force: true });
    clearProjectBuildCache();
  }
});

test("restores a verified build from disk after the in-memory cache is cleared", async () => {
  const userDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-compiler-cache-"));
  const workspace = await createWorkspace();
  const root = path.join(workspace, "apps/web");
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents((event) => events.push(event));
  configureProjectBuildCache(userDataRoot);
  await clearProjectBuildCache({ disk: true });
  try {
    await connectLocalBuilder({ root, sessionId: "disk-first-open" });
    await waitForEvent(events, (event) => event.sessionId === "disk-first-open" && event.type === "components:ready");
    await disconnectLocalBuilder({ root, sessionId: "disk-first-open" });
    await clearProjectBuildCache();

    const reopenedAt = events.length;
    await connectLocalBuilder({ root, sessionId: "disk-second-open" });
    const ready = await waitForEvent(
      events,
      (event) => event.sessionId === "disk-second-open" && event.type === "components:ready"
    );
    const reopenEvents = events.slice(reopenedAt).filter((event) => event.sessionId === "disk-second-open");
    assert.equal(reopenEvents.some((event) => event.type === "modules:build_started"), false);
    assert.equal(ready.payload.cacheSource, "disk");
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId: "disk-first-open" });
    await disconnectLocalBuilder({ root, sessionId: "disk-second-open" });
    await clearProjectBuildCache({ disk: true });
    configureProjectBuildCache(null);
    await fs.rm(workspace, { recursive: true, force: true });
    await fs.rm(userDataRoot, { recursive: true, force: true });
  }
});

test("incremental rebuild recompiles entries affected by a shared dependency", async () => {
  const workspace = await createWorkspace();
  try {
    const root = path.join(workspace, "apps/web");
    const sharedFile = path.join(workspace, "packages/shared/src/Thing.tsx");
    const first = await compileProject(root);
    await fs.writeFile(sharedFile, "import './shared.css'; export function Thing() { return <strong className='shared'>Changed</strong>; }");

    const updated = await compileProject(root, {
      previousBuild: first,
      changedPaths: [sharedFile],
    });
    assert.equal(updated.incremental, true);
    assert.deepEqual(updated.rebuiltEntries, ["src/Card.tsx"]);
    assert.notEqual(updated.modules[0].codeUrl, first.modules[0].codeUrl);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

test("incremental rebuild removes exports that no longer exist", async () => {
  const workspace = await createWorkspace();
  try {
    const root = path.join(workspace, "apps/web");
    const sourceFile = path.join(root, "src/Card.tsx");
    const first = await compileProject(root);
    const source = await fs.readFile(sourceFile, "utf8");
    await fs.writeFile(sourceFile, source.replace("Card", "Dard"));

    const updated = await compileProject(root, {
      previousBuild: first,
      changedPaths: [sourceFile],
    });
    assert.equal(updated.incremental, true);
    assert.equal(updated.componentIndex.Card, undefined);
    assert.ok(updated.componentIndex.Dard);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

test("an unimported CSS change refreshes styles without compiling JavaScript entries", async () => {
  const workspace = await createWorkspace();
  try {
    const root = path.join(workspace, "apps/web");
    const cssFile = path.join(root, "src/global.css");
    await fs.writeFile(cssFile, ".global { color: red; }");
    const first = await compileProject(root);
    await fs.writeFile(cssFile, ".global { color: blue; }");

    const updated = await compileProject(root, {
      previousBuild: first,
      changedPaths: [cssFile],
    });
    assert.equal(updated.incremental, true);
    assert.deepEqual(updated.rebuiltEntries, []);
    assert.deepEqual(updated.modules, first.modules);
    assert.notEqual(updated.cssUrl, first.cssUrl);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

test("adding a source entry falls back to a complete rebuild", async () => {
  const workspace = await createWorkspace();
  try {
    const root = path.join(workspace, "apps/web");
    const addedFile = path.join(root, "src/Added.tsx");
    const first = await compileProject(root);
    await fs.writeFile(addedFile, "export function Added() { return <div>Added</div>; }");

    const updated = await compileProject(root, {
      previousBuild: first,
      changedPaths: [addedFile],
    });
    assert.equal(updated.incremental, false);
    assert.ok(updated.componentIndex.Added);
    assert.deepEqual(updated.rebuiltEntries, ["src/Added.tsx", "src/Card.tsx"]);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

test("an active session publishes one-entry incremental snapshots for shared changes", async () => {
  clearProjectBuildCache();
  const workspace = await createWorkspace();
  const root = path.join(workspace, "apps/web");
  const sharedFile = path.join(workspace, "packages/shared/src/Thing.tsx");
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents((event) => events.push(event));
  try {
    await connectLocalBuilder({ root, sessionId: "incremental-session" });
    await waitForEvent(events, (event) => event.sessionId === "incremental-session" && event.type === "components:ready");
    const changedAt = events.length;
    await fs.writeFile(sharedFile, "import './shared.css'; export function Thing() { return <em className='shared'>Updated</em>; }");

    const updated = await waitForEvent(
      events,
      (event) => event.sessionId === "incremental-session" && event.type === "components:updated"
    );
    const updateEvents = events.slice(changedAt).filter((event) => event.sessionId === "incremental-session");
    assert.equal(updated.payload.replace, true);
    assert.ok(updated.payload.componentIndex.Card);
    assert.ok(updateEvents.some((event) =>
      event.type === "modules:build_progress" && event.payload.incremental === true && event.payload.total === 1
    ));
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(
      events.slice(changedAt).filter((event) => event.sessionId === "incremental-session" && event.type === "components:updated").length,
      1
    );
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId: "incremental-session" });
    await fs.rm(workspace, { recursive: true, force: true });
    clearProjectBuildCache();
  }
});

test("an explicit rebuild bypasses a valid cache and runs a complete build", async () => {
  clearProjectBuildCache();
  const workspace = await createWorkspace();
  const root = path.join(workspace, "apps/web");
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents((event) => events.push(event));
  try {
    await connectLocalBuilder({ root, sessionId: "force-session" });
    await waitForEvent(events, (event) => event.sessionId === "force-session" && event.type === "components:ready");
    const rebuiltAt = events.length;
    const result = await rebuildLocalBuilder({ root, sessionId: "force-session" });
    assert.equal(result.ok, true);
    const rebuildEvents = events.slice(rebuiltAt).filter((event) => event.sessionId === "force-session");
    assert.ok(rebuildEvents.some((event) => event.type === "modules:build_started"));
    assert.ok(rebuildEvents.some((event) =>
      event.type === "modules:build_progress" && event.payload.incremental === false
    ));
    assert.ok(rebuildEvents.some((event) => event.type === "components:updated" && event.payload.replace === true));
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId: "force-session" });
    await fs.rm(workspace, { recursive: true, force: true });
    clearProjectBuildCache();
  }
});
