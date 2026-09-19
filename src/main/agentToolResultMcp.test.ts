import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { registerClaudeResultScope, revokeAllResultScopes } from "./agentToolResultAccess";
import { configureProjectAccess, getProjectExtraPaths, setProjectAccessMode } from "./projectAccess";
import { getAllowedLocalPaths } from "./promptFolders";
import { registerProjectRenderer, unregisterProjectRenderer } from "./windowManager";
import { getMcpChatUrl, handleLocalRead, handleLocalReadBatch, handleLocalWrite, mcpEvents, registerMcpChatSession, resolveApproval, resolveFolderAccess, startMcpServer, stopMcpServer } from "./mcpServer";

test("real HTTP MCP keeps internal results run-scoped without changing ordinary folder grants", async t => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-result-mcp-"));
  const base = await fs.realpath(temporary);
  const project = path.join(base, "project"); await fs.mkdir(project);
  const config = path.join(base, "config");
  const claudeSessionId = randomUUID();
  const resultRoot = path.join(config, "projects", "project-key", claudeSessionId, "tool-results");
  await fs.mkdir(resultRoot, { recursive: true });
  const file = path.join(resultRoot, "mcp-bingo-local_grep-123.txt");
  await fs.writeFile(file, "line one\n中文 result\n".repeat(8000));
  const ordinary = path.join(project, "normal.txt"); await fs.writeFile(ordinary, "ordinary");
  const outside = path.join(base, "outside.txt"); await fs.writeFile(outside, "external");
  configureProjectAccess({ userDataRoot: path.join(base, "app"), resolveProjectRoot: id => id === "p" ? project : null });
  const prompts = [], approvals = [];
  const onPrompt = event => { prompts.push(event); resolveFolderAccess(event.requestId, false); };
  const onApproval = event => { approvals.push(event); resolveApproval(event.approvalId, false); };
  mcpEvents.on("local_access_needed", onPrompt);
  mcpEvents.on("tool_approval_needed", onApproval);
  registerProjectRenderer({ isDestroyed: () => false }, { id: 987654, isDestroyed: () => false }, "p", () => {});
  const unregister = registerMcpChatSession("p", "chat", "run");
  const unregisterOther = registerMcpChatSession("p", "chat", "other-run");
  const unregisterSecondChat = registerMcpChatSession("p", "chat-2", "run-2");
  registerClaudeResultScope({ projectId: "p", chatTabId: "chat", chatRunId: "run", claudeSessionId, claudeConfigDir: config, workDir: project });
  t.after(async () => {
    unregister(); unregisterOther(); unregisterSecondChat();
    revokeAllResultScopes(); stopMcpServer(); unregisterProjectRenderer(987654);
    mcpEvents.off("local_access_needed", onPrompt); mcpEvents.off("tool_approval_needed", onApproval);
    configureProjectAccess(); await fs.rm(base, { recursive: true, force: true });
  });
  await startMcpServer();
  const url = getMcpChatUrl("p", "chat", "run");
  const call = async (name, args, target = url) => {
    const response = await fetch(target, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }) });
    return { status: response.status, ...(await response.json()) };
  };

  const read = await call("local_read", { file_path: file, offset: 2, limit: 1 });
  assert.equal(read.result.isError, undefined);
  assert.match(read.result.content[0].text, /2\t中文 result/);
  const mixed = await call("local_read_batch", { file_paths: [file, ordinary], limit: 1 });
  assert.equal(mixed.result.isError, undefined);
  assert.match(mixed.result.content[0].text, /ordinary/);
  assert.deepEqual(getProjectExtraPaths("p"), []);
  assert.deepEqual(getAllowedLocalPaths("p", "chat"), [project]);
  const folders = await call("local_folders", {});
  assert.doesNotMatch(folders.result.content[0].text, /tool-results/);

  for (const target of [getMcpChatUrl("p", "chat", "other-run"), getMcpChatUrl("p", "chat-2", "run-2")]) {
    assert.equal((await call("local_read", { file_path: file, chatRunId: "run" }, target)).result.reason, "AGENT_RESULT_SCOPE_MISMATCH");
  }
  const wrong = file.replace(claudeSessionId, randomUUID());
  assert.equal((await call("local_read_batch", { file_paths: [outside, wrong] })).result.reason, "AGENT_RESULT_SCOPE_MISMATCH");
  assert.equal((await call("local_read_batch", { file_paths: [outside, file], limit: 0 })).result.reason, "AGENT_RESULT_INVALID_RANGE");
  const ctx = { source: "in-app", projectId: "p", chatTabId: "chat", chatRunId: "run" };
  assert.equal((await handleLocalRead("p", { file_path: file }, "chat")).reason, "AGENT_RESULT_SCOPE_MISMATCH");
  assert.equal((await handleLocalWrite("p", { file_path: file, content: "overwrite" }, "chat")).reason, "AGENT_RESULT_READ_ONLY");
  for (const [name, args] of [
    ["local_write", { file_path: file, content: "overwrite" }],
    ["local_edit", { file_path: file, old_string: "one", new_string: "two" }],
    ["project_copy_file", { files: [{ local_path: file, project_path: "cache.txt" }] }],
    ["project_copy_asset", { local_path: file, project_path: "cache.txt" }],
    ["local_glob", { pattern: `${resultRoot}/*` }],
    ["local_grep", { pattern: "line", glob: `${resultRoot}/*` }]
  ]) assert.equal((await call(name, args)).result.isError, true, name);
  assert.equal(prompts.length, 0);
  assert.equal(approvals.length, 0, "internal writes are rejected before approval");
  assert.match(await fs.readFile(file, "utf8"), /^line one/);

  setProjectAccessMode("p", "read-only");
  assert.equal((await call("local_read", { file_path: file, limit: 1 })).result.isError, undefined);
  setProjectAccessMode("p", "disabled");
  assert.equal((await call("local_read", { file_path: file })).result.reason, "PROJECT_ACCESS_DISABLED");
  assert.equal(prompts.length, 0);
  setProjectAccessMode("p", "edit");

  assert.equal((await call("local_read", { file_path: outside })).result.isError, true);
  assert.equal(prompts.length, 1, "ordinary external paths still prompt");
  // Revoke while a mixed batch waits on the ordinary folder gate.
  mcpEvents.off("local_access_needed", onPrompt);
  const revokeDuringPrompt = event => { unregister(); resolveFolderAccess(event.requestId, true, base); };
  mcpEvents.on("local_access_needed", revokeDuringPrompt);
  try {
    const cancelled = await handleLocalReadBatch("p", { file_paths: [file, outside] }, "chat", undefined, ctx);
    assert.equal(cancelled.isError, true);
    assert.doesNotMatch(cancelled.content[0].text, /中文 result/);
  } finally { mcpEvents.off("local_access_needed", revokeDuringPrompt); }
  assert.equal((await call("local_read", { file_path: file })).status, 409, "old request URL is invalidated");
});
