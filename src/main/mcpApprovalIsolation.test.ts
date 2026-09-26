import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelAllApprovals,
  cancelApprovalsForChat,
  cancelApprovalsForProject,
  clearChatCancelled,
  markChatCancelled,
  requestToolApproval
} from "./mcpServer";
import { mcpEvents, resolveApproval } from "./mcpServer";

test("approval cleanup is isolated by project and chat, including external requests", async t => {
  t.after(() => cancelAllApprovals());
  const settled = new Set<string>();
  const pending = (name, projectId, chatTabId, source = "internal") => {
    const promise = requestToolApproval(projectId, "project_write", { file_path: `${name}.tsx` }, {
      source, chatTabId, sessionId: source === "external" ? `session-${name}` : null
    });
    promise.then(() => settled.add(name));
    return promise;
  };
  const a1 = pending("a1", "project-a", "chat-1");
  const a2 = pending("a2", "project-a", "chat-2");
  const b1 = pending("b1", "project-b", "chat-1");
  const external = pending("external", "project-a", undefined, "external");

  cancelApprovalsForChat("project-a", "chat-1");
  assert.equal((await a1).reason, "cancelled");
  await Promise.resolve();
  assert.deepEqual([...settled], ["a1"]);

  cancelApprovalsForProject("project-a");
  assert.equal((await a2).reason, "cancelled");
  assert.equal((await external).reason, "cancelled");
  await Promise.resolve();
  assert.equal(settled.has("b1"), false);

  cancelAllApprovals();
  assert.equal((await b1).reason, "cancelled");
});

test("approval decisions allow once, reject, timeout and cancel without pending requests", async t => {
  t.after(() => cancelAllApprovals());
  const approvals: string[] = [];
  const onNeeded = event => approvals.push(event.approvalId);
  mcpEvents.on("tool_approval_needed", onNeeded);
  t.after(() => mcpEvents.off("tool_approval_needed", onNeeded));

  const allowed = requestToolApproval("project-a", "project_edit", {}, { chatTabId: "chat-a" });
  resolveApproval(approvals.pop(), true);
  assert.equal((await allowed).approved, true);

  const denied = requestToolApproval("project-a", "project_edit", {}, { chatTabId: "chat-a" });
  resolveApproval(approvals.pop(), false);
  assert.deepEqual(await denied, { approved: false, reason: "rejected" });

  const timedOut = requestToolApproval("project-a", "project_edit", {}, { chatTabId: "chat-a", timeoutMs: 5 });
  const timeoutId = approvals.pop();
  assert.deepEqual(await timedOut, { approved: false, reason: "timeout" });
  resolveApproval(timeoutId, true);

  const cancelled = requestToolApproval("project-a", "project_edit", {}, { chatTabId: "chat-a" });
  const cancelledId = approvals.pop();
  cancelApprovalsForChat("project-a", "chat-a");
  assert.deepEqual(await cancelled, { approved: false, reason: "cancelled" });
  resolveApproval(cancelledId, true);
});

test("a stopped chat cannot create another approval while its agent is exiting", async t => {
  t.after(() => { clearChatCancelled("project-late", "chat-late"); cancelAllApprovals(); });
  const approvals: string[] = [];
  const onNeeded = event => approvals.push(event.approvalId);
  mcpEvents.on("tool_approval_needed", onNeeded);
  t.after(() => mcpEvents.off("tool_approval_needed", onNeeded));
  markChatCancelled("project-late", "chat-late");
  assert.deepEqual(await requestToolApproval("project-late", "project_write", {}, { chatTabId: "chat-late" }),
    { approved: false, reason: "cancelled" });
  assert.deepEqual(approvals, []);
});
