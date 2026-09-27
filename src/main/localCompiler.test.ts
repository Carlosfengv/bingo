import assert from "node:assert/strict";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  compileProject,
  componentIndexFor,
  connectLocalBuilder,
  disconnectLocalBuilder,
  loadLocalModule,
  rebuildLocalBuilder,
  notifyLocalSourceWrite,
  subscribeLocalBuilderEvents,
  waitForProjectBuildCache,
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

test("compiled component indexes carry current prop metadata across rebuilds", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-prop-index-"));
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents(event => events.push(event));
  try {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "fixture" }));
    const file = path.join(root, "Badge.tsx");
    await fs.writeFile(file, `export function Badge(p: {variant?: 'default' | 'success'}) {return <span/>}`);
    await connectLocalBuilder({root, sessionId: "prop-metadata"});
    await waitForEvent(events, event => event.sessionId === "prop-metadata" && event.type === "components:ready");
    assert.equal(componentIndexFor(root).Badge.props.variant.type, "'default' | 'success'");
    await fs.writeFile(file, `export function Badge(p: {variant?: 'default' | 'warning'}) {return <span/>}`);
    await rebuildLocalBuilder({root, sessionId: "prop-metadata"});
    await waitForEvent(events, event => event.sessionId === "prop-metadata" && event.type === "components:updated" && event.payload.componentIndex.Badge?.props.variant.type === "'default' | 'warning'");
    assert.equal(componentIndexFor(root).Badge.props.variant.type, "'default' | 'warning'");
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({root, sessionId: "prop-metadata"});
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("CommonJS React dependencies share the browser ESM runtime without dynamic require", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-react-require-"));
  try {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({name:"fixture"}));
    await fs.writeFile(path.join(root, "legacy.cjs"), 'module.exports = require("react");');
    await fs.writeFile(path.join(root, "Probe.tsx"), 'import legacy from "./legacy.cjs"; import * as React from "react"; export function Probe(){return legacy === React.default;}');
    const compiled = await compileProject(root);
    const module = compiled.modules.find(item => item.path === "Probe.tsx");
    const code = await (await fetch(module.codeUrl)).text();
    assert.doesNotMatch(code, /__require\("react"\)/);
    const stub = `data:text/javascript,${encodeURIComponent('const shared = {}; export default shared;')}`;
    const browserCode = code.replaceAll('from "react"', `from ${JSON.stringify(stub)}`);
    const exports = await import(`data:text/javascript;base64,${Buffer.from(browserCode).toString("base64")}`);
    assert.equal(exports.Probe(), true);
  } finally {
    await fs.rm(root, {recursive:true, force:true});
  }
});

test("router-dependent entries carry their own preview provider without exposing it as a component", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-router-preview-"));
  try {
    const packageRoot = path.join(root, "node_modules/react-router-dom");
    await fs.mkdir(packageRoot, { recursive: true });
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "fixture" }));
    await fs.writeFile(path.join(packageRoot, "package.json"), JSON.stringify({ name: "react-router-dom", type: "module", main: "index.js" }));
    await fs.writeFile(path.join(packageRoot, "index.js"), "export function MemoryRouter(){ return 'router'; } export function useInRouterContext(){ return false; } export function useNavigate(){ return 'navigate'; } export function BrowserRouter(){ return 'browser'; }");
    await fs.writeFile(path.join(root, "App.tsx"), "import { useNavigate } from 'react-router-dom'; export default function App(){ return useNavigate(); }");
    await fs.writeFile(path.join(root, "Root.tsx"), "import { BrowserRouter } from 'react-router-dom'; export default function Root(){ return BrowserRouter(); }");
    const compiled = await compileProject(root);
    const appModule = compiled.modules.find(module => module.path === "App.tsx");
    const appCode = await (await fetch(appModule.codeUrl)).text();
    const appExports = await import(`data:text/javascript;base64,${Buffer.from(appCode).toString("base64")}`);
    assert.equal(appExports.default(), "navigate");
    assert.equal(appExports.__bingoMemoryRouter(), "router");
    assert.equal(appExports.__bingoInRouterContext(), false);
    assert.equal(compiled.componentIndex.__bingoMemoryRouter, undefined);
    const rootModule = compiled.modules.find(module => module.path === "Root.tsx");
    const rootCode = await (await fetch(rootModule.codeUrl)).text();
    const rootExports = await import(`data:text/javascript;base64,${Buffer.from(rootCode).toString("base64")}`);
    assert.equal(rootExports.__bingoMemoryRouter, undefined);
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
    await fs.mkdir(path.join(projectRoot, "src/tests"), { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, "src/tests/Fixture.tsx"),
      "import './fixture.css'; export function TestOnly() { return <div className='test-fixture-style' />; }"
    );
    await fs.writeFile(
      path.join(projectRoot, "src/tests/fixture.css"),
      ".test-fixture-style { font-family: test-fixture-font; }"
    );

    const result = await compileProject(projectRoot);

    assert.equal(result.complete, true);
    assert.deepEqual(result.rebuiltEntries, ["src/Card.tsx"]);
    assert.equal(result.componentIndex.TestOnly, undefined);
    const css = Buffer.from(result.cssUrl.split(",")[1], "base64").toString("utf8");
    assert.doesNotMatch(css, /test-fixture-style|test-fixture-font/);
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
    await waitForProjectBuildCache(root);
    await disconnectLocalBuilder({ root, sessionId: "disk-first-open" });
    await clearProjectBuildCache();

    const reopenedAt = events.length;
    await Promise.all([
      connectLocalBuilder({ root, sessionId: "disk-second-open" }),
      connectLocalBuilder({ root, sessionId: "disk-third-open" }),
    ]);
    const ready = await waitForEvent(
      events,
      (event) => event.sessionId === "disk-second-open" && event.type === "components:ready"
    );
    const otherReady = await waitForEvent(
      events,
      (event) => event.sessionId === "disk-third-open" && event.type === "components:ready"
    );
    const reopenEvents = events.slice(reopenedAt).filter((event) => event.sessionId === "disk-second-open");
    assert.equal(reopenEvents.some((event) => event.type === "modules:build_started"), false);
    assert.equal(ready.payload.cacheSource, "disk");
    assert.equal(otherReady.payload.cacheSource, "disk");
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId: "disk-first-open" });
    await disconnectLocalBuilder({ root, sessionId: "disk-second-open" });
    await disconnectLocalBuilder({ root, sessionId: "disk-third-open" });
    await clearProjectBuildCache({ disk: true });
    configureProjectBuildCache(null);
    await fs.rm(workspace, { recursive: true, force: true });
    await fs.rm(userDataRoot, { recursive: true, force: true });
  }
});

test("restores usable modules from a partial disk build and retries only failed entries", async () => {
  const userDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-partial-cache-"));
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-partial-project-"));
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents(event => events.push(event));
  configureProjectBuildCache(userDataRoot);
  await clearProjectBuildCache({ disk: true });
  try {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "partial" }));
    await fs.mkdir(path.join(root, "node_modules"));
    await fs.writeFile(path.join(root, "Card.tsx"), "export function Card() { return <div>card</div>; }");
    await fs.writeFile(path.join(root, "Badge.tsx"), "import { label } from 'missing-label'; export function Badge() { return <div>{label}</div>; }");
    await connectLocalBuilder({ root, sessionId: "partial-first" });
    const first = await waitForEvent(events, event => event.sessionId === "partial-first" && event.type === "components:ready");
    assert.ok(first.payload.componentIndex.Card);
    assert.equal(first.payload.componentIndex.Badge, undefined);
    await waitForProjectBuildCache(root);
    await disconnectLocalBuilder({ root, sessionId: "partial-first" });
    await clearProjectBuildCache();

    const reopenedAt = events.length;
    await connectLocalBuilder({ root, sessionId: "partial-second" });
    const cached = await waitForEvent(events, event => event.sessionId === "partial-second" && event.type === "components:ready");
    assert.equal(cached.payload.cacheSource, "disk");
    assert.ok(cached.payload.componentIndex.Card);
    await waitForEvent(events, event => event.sessionId === "partial-second" && event.type === "components:updated");
    const progress = events.slice(reopenedAt).find(event => event.sessionId === "partial-second" && event.type === "modules:build_progress");
    assert.equal(progress?.payload.total, 1);
    await waitForProjectBuildCache(root);
    await disconnectLocalBuilder({ root, sessionId: "partial-second" });
    await clearProjectBuildCache();

    const packageRoot = path.join(root, "node_modules/missing-label");
    await fs.mkdir(packageRoot, { recursive: true });
    await fs.writeFile(path.join(packageRoot, "package.json"), JSON.stringify({ name: "missing-label", main: "index.js" }));
    await fs.writeFile(path.join(packageRoot, "index.js"), "export const label = 'ready';");
    const installedAt = events.length;
    await connectLocalBuilder({ root, sessionId: "partial-installed" });
    const rebuilt = await waitForEvent(events, event => event.sessionId === "partial-installed" && event.type === "components:ready" && event.payload.componentIndex.Badge);
    assert.ok(rebuilt.payload.componentIndex.Card);
    const installedProgress = events.slice(installedAt).find(event => event.sessionId === "partial-installed" && event.type === "modules:build_progress");
    assert.equal(installedProgress?.payload.total, 2);
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId: "partial-first" });
    await disconnectLocalBuilder({ root, sessionId: "partial-second" });
    await disconnectLocalBuilder({ root, sessionId: "partial-installed" });
    await waitForProjectBuildCache(root);
    await clearProjectBuildCache({ disk: true });
    configureProjectBuildCache(null);
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(userDataRoot, { recursive: true, force: true });
  }
});

test("a changed shared dependency rebuilds only its disk-cached importers", async () => {
  const userDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-disk-incremental-"));
  const workspace = await createWorkspace();
  const root = path.join(workspace, "apps/web");
  const sharedFile = path.join(workspace, "packages/shared/src/Thing.tsx");
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents(event => events.push(event));
  configureProjectBuildCache(userDataRoot);
  await clearProjectBuildCache({ disk: true });
  try {
    await fs.writeFile(path.join(root, "src/Badge.tsx"), "export function Badge() { return <span>badge</span>; }");
    await connectLocalBuilder({ root, sessionId: "incremental-first" });
    const first = await waitForEvent(events, event => event.sessionId === "incremental-first" && event.type === "modules:ready");
    await waitForProjectBuildCache(root);
    await disconnectLocalBuilder({ root, sessionId: "incremental-first" });
    await clearProjectBuildCache();

    await fs.writeFile(sharedFile, "import './shared.css'; export function Thing() { return <strong className='shared'>changed</strong>; }");
    const cursor = events.length;
    await connectLocalBuilder({ root, sessionId: "incremental-second" });
    const ready = await waitForEvent(events, event => event.sessionId === "incremental-second" && event.type === "modules:ready");
    const progress = events.slice(cursor).find(event => event.sessionId === "incremental-second" && event.type === "modules:build_progress");
    assert.equal(progress?.payload.incremental, true);
    assert.equal(progress?.payload.total, 1);
    assert.equal(ready.payload.cacheSource, undefined);
    const before = Object.fromEntries(first.payload.modules.map(module => [module.path, module.codeUrl]));
    const after = Object.fromEntries(ready.payload.modules.map(module => [module.path, module.codeUrl]));
    assert.equal(after["src/Badge.tsx"], before["src/Badge.tsx"]);
    assert.notEqual(after["src/Card.tsx"], before["src/Card.tsx"]);
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId: "incremental-first" });
    await disconnectLocalBuilder({ root, sessionId: "incremental-second" });
    await waitForProjectBuildCache(root);
    await clearProjectBuildCache({ disk: true });
    configureProjectBuildCache(null);
    await fs.rm(workspace, { recursive: true, force: true });
    await fs.rm(userDataRoot, { recursive: true, force: true });
  }
});

test("a changed project package manifest invalidates every disk-cached entry", async () => {
  const userDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-disk-config-"));
  const workspace = await createWorkspace();
  const root = path.join(workspace, "apps/web");
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents(event => events.push(event));
  configureProjectBuildCache(userDataRoot);
  await clearProjectBuildCache({ disk: true });
  try {
    await fs.writeFile(path.join(root, "src/Badge.tsx"), "export function Badge() { return <span>badge</span>; }");
    await connectLocalBuilder({ root, sessionId: "config-first" });
    await waitForEvent(events, event => event.sessionId === "config-first" && event.type === "components:ready");
    await waitForProjectBuildCache(root);
    await disconnectLocalBuilder({ root, sessionId: "config-first" });
    await clearProjectBuildCache();

    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "web", dependencies: { react: "^19.0.0" }, description: "changed" }));
    const cursor = events.length;
    await connectLocalBuilder({ root, sessionId: "config-second" });
    await waitForEvent(events, event => event.sessionId === "config-second" && event.type === "components:ready");
    const progress = events.slice(cursor).find(event => event.sessionId === "config-second" && event.type === "modules:build_progress");
    assert.equal(progress?.payload.incremental, false);
    assert.equal(progress?.payload.total, 2);
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId: "config-first" });
    await disconnectLocalBuilder({ root, sessionId: "config-second" });
    await waitForProjectBuildCache(root);
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

test("app-owned source writes refresh component metadata without an OS watch event", async context => {
  clearProjectBuildCache();
  context.mock.method(fsSync, "watch", () => ({ close() {} }));
  const workspace = await createWorkspace();
  const root = path.join(workspace, "apps/web");
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents(event => events.push(event));
  try {
    await connectLocalBuilder({ root, sessionId: "explicit-source-write" });
    await waitForEvent(events, event => event.sessionId === "explicit-source-write" && event.type === "components:ready");
    await fs.writeFile(path.join(root, "src/Card.tsx"), `export function Card({ label = 'Updated by app' }: {label?: string}) { return <button>{label}</button>; }`);
    notifyLocalSourceWrite(root, "src/Card.tsx");
    const updated = await waitForEvent(events, event => event.sessionId === "explicit-source-write" && event.type === "components:updated");
    assert.equal(updated.payload.componentIndex.Card.props.label.default, "Updated by app");
    assert.equal(componentIndexFor(root).Card.props.label.default, "Updated by app");
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId: "explicit-source-write" });
    await fs.rm(workspace, { recursive: true, force: true });
    clearProjectBuildCache();
  }
});

test("shared workspace edits reconcile when native directory watchers miss the event", async context => {
  clearProjectBuildCache();
  context.mock.method(fsSync, "watch", () => ({ close() {} }));
  const workspace = await createWorkspace();
  const root = path.join(workspace, "apps/web");
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents(event => events.push(event));
  try {
    await connectLocalBuilder({ root, sessionId: "shared-poll-fallback" });
    await waitForEvent(events, event => event.sessionId === "shared-poll-fallback" && event.type === "components:ready");
    await fs.writeFile(path.join(workspace, "packages/shared/src/Thing.tsx"), "import './shared.css'; export function Thing() { return <em>Polled shared change</em>; }");
    await waitForEvent(events, event => event.sessionId === "shared-poll-fallback" && event.type === "components:updated");
    const progress = events.filter(event => event.sessionId === "shared-poll-fallback" && event.type === "modules:build_progress");
    assert.ok(progress.some(event => event.payload.incremental === true && event.payload.total === 1));
    const modules = events.find(event => event.sessionId === "shared-poll-fallback" && event.type === "modules:updated").payload.modules;
    const sources = await Promise.all(modules.map(async module => (await fetch(module.codeUrl)).text()));
    assert.ok(sources.some(source => source.includes("Polled shared change")));
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId: "shared-poll-fallback" });
    await fs.rm(workspace, { recursive: true, force: true });
    clearProjectBuildCache();
  }
});

test("shared input reconciliation does not rebuild an already observed native edit", async context => {
  clearProjectBuildCache();
  const callbacks = new Map();
  context.mock.method(fsSync, "watch", (directory, _options, callback) => {
    callbacks.set(fsSync.realpathSync(directory), callback);
    return { close() {} };
  });
  const workspace = await createWorkspace();
  const root = path.join(workspace, "apps/web");
  const sharedFile = path.join(workspace, "packages/shared/src/Thing.tsx");
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents(event => events.push(event));
  const sessionId = "shared-native-dedup";
  try {
    await connectLocalBuilder({ root, sessionId });
    await waitForEvent(events, event => event.sessionId === sessionId && event.type === "components:ready");
    await fs.writeFile(sharedFile, "export function Thing() { return <em>Native shared change</em>; }");
    callbacks.get(fsSync.realpathSync(path.dirname(sharedFile)))("change", path.basename(sharedFile));
    await waitForEvent(events, event => event.sessionId === sessionId && event.type === "components:updated");
    // Cross two reconciliation ticks plus the build debounce window.
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.equal(events.filter(event => event.sessionId === sessionId && event.type === "components:updated").length, 1);
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId });
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

test("rebuild callers wait for overlapping builds and receive dependency failures until repaired", async () => {
  clearProjectBuildCache();
  const workspace = await createWorkspace();
  const root = path.join(workspace, "apps/web");
  const sessionId = "rebuild-failure";
  const events = [];
  const unsubscribe = subscribeLocalBuilderEvents(event => events.push(event));
  try {
    await connectLocalBuilder({ root, sessionId });
    await waitForEvent(events, event => event.sessionId === sessionId && event.type === "components:ready");
    await fs.writeFile(path.join(workspace, "packages/shared/src/Thing.tsx"), "export const broken = ;");
    const results = await Promise.all([
      rebuildLocalBuilder({ root, sessionId }),
      rebuildLocalBuilder({ root, sessionId }),
    ]);
    for (const result of results) {
      assert.equal(result.ok, false, "a completed request must report the actual failed build");
      assert.match(result.error, /Thing|Unexpected|build/i);
    }
    await fs.writeFile(path.join(root, "src/Safe.tsx"), "export function Safe() { return <span>Unaffected</span>; }");
    const partial = await rebuildLocalBuilder({ root, sessionId });
    assert.equal(partial.ok, false, "publishing unaffected components does not make a partial build successful");
    assert.match(partial.error, /Card|Unexpected/i);
    assert.ok(componentIndexFor(root).Safe);
    assert.equal(componentIndexFor(root).Card, undefined);
    await fs.writeFile(path.join(workspace, "packages/shared/src/Thing.tsx"), "export function Thing() { return <span>Repaired</span>; }");
    assert.equal((await rebuildLocalBuilder({ root, sessionId })).ok, true);
    assert.ok(componentIndexFor(root).Card);
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId });
    await fs.rm(workspace, { recursive: true, force: true });
    clearProjectBuildCache();
  }
});

test("new canvas pages trigger an active stylesheet rebuild without recompiling components", async () => {
  clearProjectBuildCache();
  const workspace = await createWorkspace();
  const root = path.join(workspace, "apps/web");
  const events = [];
  const sessionId = "canvas-style-session";
  const unsubscribe = subscribeLocalBuilderEvents(event => events.push(event));
  try {
    await connectLocalBuilder({ root, sessionId });
    await waitForEvent(events, event => event.sessionId === sessionId && event.type === "components:ready");
    const changedAt = events.length;
    const page = path.join(root, ".bingo/design/pages/page.json");
    await fs.mkdir(path.dirname(page), { recursive: true });
    await fs.writeFile(page, '{"elements":[{"props":{"className":"gap-16 p-12"}}]}');
    await waitForEvent(events, event => events.indexOf(event) >= changedAt && event.sessionId === sessionId && event.type === "components:updated");
    const updates = events.slice(changedAt).filter(event => event.sessionId === sessionId);
    assert.ok(updates.some(event => event.type === "css:ready" && !event.payload.error));
    assert.ok(updates.some(event => event.type === "modules:build_progress" && event.payload.incremental === true && event.payload.total === 0), JSON.stringify(updates.filter(event => event.type === "modules:build_progress")));
  } finally {
    unsubscribe();
    await disconnectLocalBuilder({ root, sessionId });
    await fs.rm(workspace, { recursive: true, force: true });
    clearProjectBuildCache();
  }
});
