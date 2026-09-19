import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { RESULT_MAX_BYTES, RESULT_SCAN_BYTES, claudeResultConfigDir, classifyToolResultPath, readOwnedToolResult, registerClaudeResultScope, revokeAllResultScopes, revokeResultScopesForRun } from "./agentToolResultAccess";
import { configureProjectAccess, setProjectAccessMode } from "./projectAccess";

async function fixture(t) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-results-"));
  const base = await fs.realpath(temp);
  const project = path.join(base, "project");
  await fs.mkdir(project);
  const config = path.join(base, "custom 中文 config");
  const session = randomUUID();
  const root = path.join(config, "projects", "opaque.key with spaces", session, "tool-results");
  const file = path.join(root, "mcp-bingo-local_grep-123.txt");
  const ctx = { source: "in-app" as const, projectId: "p", chatTabId: "chat", chatRunId: "run" };
  const scope = { ...ctx, claudeConfigDir: config, claudeSessionId: session, workDir: project };
  configureProjectAccess({ userDataRoot: path.join(base, "app"), resolveProjectRoot: id => id === "p" ? project : null });
  const unregister = registerClaudeResultScope(scope);
  const write = async (text = "first\n中文🙂\nthird\n") => { await fs.mkdir(root, { recursive: true }); await fs.writeFile(file, text); };
  const read = (options = {}, budget = { remaining: RESULT_MAX_BYTES }) => readOwnedToolResult(ctx, file, options, budget);
  t.after(async () => { revokeAllResultScopes(); configureProjectAccess(); await fs.rm(base, { recursive: true, force: true }); });
  return { base, project, config, session, root, file, ctx, scope, unregister, write, read };
}

test("configuration uses the exact child environment and rejects ambiguous relative roots", () => {
  assert.equal(claudeResultConfigDir({ HOME: "/home/child" }), "/home/child/.claude");
  assert.equal(claudeResultConfigDir({ HOME: "/home/child", CLAUDE_CONFIG_DIR: "/custom" }), "/custom");
  assert.throws(() => claudeResultConfigDir({ CLAUDE_CONFIG_DIR: "relative" }), { code: "AGENT_RESULT_LAYOUT_UNSUPPORTED" });
});

test("late directories recover without registration changes; pagination preserves Unicode", async t => {
  const f = await fixture(t);
  await assert.rejects(f.read(), { code: "AGENT_RESULT_EXPIRED" });
  await f.write();
  const result = await f.read({ offset: 2, limit: 1 });
  assert.match(result.text, /2\t中文🙂/);
  assert.doesNotMatch(result.text, /1\tfirst/);
  assert.match(result.text, /offset=3/);
  assert.equal((await classifyToolResultPath(f.ctx, path.join(f.project, "ordinary.txt"))).kind, "ordinary");
});

test("contexts isolate projects, chats, runs and external callers", async t => {
  const f = await fixture(t); await f.write();
  for (const ctx of [undefined, { ...f.ctx, source: "external" as const }, { ...f.ctx, projectId: "other" }, { ...f.ctx, chatTabId: "other" }, { ...f.ctx, chatRunId: "other" }]) {
    await assert.rejects(readOwnedToolResult(ctx, f.file, {}, { remaining: RESULT_MAX_BYTES }), { code: "AGENT_RESULT_SCOPE_MISMATCH" });
  }
  const otherFile = f.file.replace(f.session, randomUUID());
  await assert.rejects(readOwnedToolResult(f.ctx, otherFile, {}, { remaining: RESULT_MAX_BYTES }), { code: "AGENT_RESULT_SCOPE_MISMATCH" });
});

test("read-only works, disabled and unregistered projects remain denied", async t => {
  const f = await fixture(t); await f.write();
  setProjectAccessMode("p", "read-only");
  assert.match((await f.read()).text, /first/);
  setProjectAccessMode("p", "disabled");
  await assert.rejects(f.read(), { code: "PROJECT_ACCESS_DISABLED" });
  configureProjectAccess();
  await assert.rejects(f.read(), { code: "PROJECT_ACCESS_DISABLED" });
});

test("old cleanup cannot remove a new registration; revocation invalidates completed reads", async t => {
  const f = await fixture(t); await f.write();
  const unregisterNew = registerClaudeResultScope(f.scope);
  f.unregister(); f.unregister();
  const result = await f.read();
  revokeResultScopesForRun("run");
  assert.throws(result.assertActive, { code: "AGENT_RESULT_EXPIRED" });
  await assert.rejects(f.read(), { code: "AGENT_RESULT_SCOPE_MISMATCH" });
  unregisterNew();
  registerClaudeResultScope(f.scope);
  assert.match((await f.read()).text, /first/);
});

test("file links, hard links, directory substitution and traversal cannot escape scope", async t => {
  const f = await fixture(t); await f.write();
  const other = path.join(f.project, "secret.txt"); await fs.writeFile(other, "secret");
  await fs.unlink(f.file); await fs.symlink(other, f.file);
  await assert.rejects(f.read());
  await fs.unlink(f.file); await fs.link(other, f.file);
  await assert.rejects(f.read(), { code: "AGENT_RESULT_UNSAFE_PATH" });
  await fs.unlink(f.file); await fs.mkdir(f.file);
  await assert.rejects(f.read(), { code: "AGENT_RESULT_UNSAFE_PATH" });
  const traverse = `${f.root}/../tool-results/${path.basename(f.file)}`;
  await assert.rejects(readOwnedToolResult(f.ctx, traverse, {}, { remaining: RESULT_MAX_BYTES }));
});

test("configured root symlinks work but nested result directory links do not", async t => {
  const f = await fixture(t); await f.write();
  const alias = path.join(f.base, "config-alias"); await fs.symlink(f.config, alias);
  registerClaudeResultScope({ ...f.scope, claudeConfigDir: alias });
  assert.match((await readOwnedToolResult(f.ctx, f.file.replace(f.config, alias), {}, { remaining: RESULT_MAX_BYTES })).text, /first/);
  const moved = path.join(f.base, "moved"); await fs.rename(f.root, moved); await fs.symlink(moved, f.root);
  await assert.rejects(f.read());
});

test("ambiguous session directories are rejected", async t => {
  const f = await fixture(t); await f.write();
  await fs.mkdir(path.join(f.config, "projects", "duplicate", f.session), { recursive: true });
  await assert.rejects(f.read(), { code: "AGENT_RESULT_LAYOUT_UNSUPPORTED" });
});

test("directory replacement after binding is detected", async t => {
  const f = await fixture(t); await f.write(); await f.read();
  await fs.rename(f.root, `${f.root}-old`); await f.write("replaced");
  await assert.rejects(f.read(), { code: "AGENT_RESULT_UNSAFE_PATH" });
});

test("ranges, huge lines, scan limits and shared batch budgets are bounded", async t => {
  const f = await fixture(t); await f.write("中文🙂".repeat(25000));
  const budget = { remaining: RESULT_MAX_BYTES };
  const result = await f.read({}, budget);
  assert.match(result.text, /Line incomplete/);
  assert.doesNotMatch(result.text, /�/);
  assert.ok(Buffer.byteLength(result.text) < RESULT_MAX_BYTES + 1000);
  assert.match((await f.read({}, budget)).text, /Not read: batch/);
  for (const options of [{ offset: 0 }, { offset: -1 }, { offset: 1.5 }, { limit: NaN }, { limit: 2001 }]) await assert.rejects(f.read(options), { code: "AGENT_RESULT_INVALID_RANGE" });
  await f.write("a".repeat(RESULT_SCAN_BYTES + 1));
  await assert.rejects(f.read({ offset: 2 }), { code: "AGENT_RESULT_INVALID_RANGE" });
  await f.write(""); assert.match((await f.read()).text, /empty file/);
});

test("revocation while bytes are being read discards the result", async t => {
  const f = await fixture(t); await f.write();
  const open = fs.open.bind(fs);
  t.mock.method(fs, "open", async (...args) => {
    const handle = await open(...args);
    const read = handle.read.bind(handle);
    handle.read = async (...readArgs) => {
      revokeResultScopesForRun("run");
      return read(...readArgs);
    };
    return handle;
  });
  await assert.rejects(f.read(), { code: "AGENT_RESULT_EXPIRED" });
});

test("a changed result is discarded even if its path still exists", async t => {
  const f = await fixture(t); await f.write();
  const open = fs.open.bind(fs);
  t.mock.method(fs, "open", async (...args) => {
    const handle = await open(...args);
    const read = handle.read.bind(handle);
    handle.read = async (...readArgs) => {
      const result = await read(...readArgs);
      await fs.appendFile(f.file, "changed");
      return result;
    };
    return handle;
  });
  await assert.rejects(f.read({ limit: 1 }), { code: "AGENT_RESULT_UNSAFE_PATH" });
});

test("a cancelled CLI run never starts a process or registers result access", async () => {
  const { cancelSession, runClaudeCLI } = await import("./aiChat");
  const run = randomUUID();
  cancelSession(run);
  assert.deepEqual(await runClaudeCLI("unused", "unused", run, () => {}, undefined, undefined, randomUUID(), undefined, {}, "p", "chat"), { text: "" });
});
