import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelAllApprovals,
  cancelApprovalsForChat,
  cancelApprovalsForProject,
  requestToolApproval
} from "./mcpServer";

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
