import assert from "node:assert/strict";
import test from "node:test";
import { toolFailureReport } from "../../packages/editor/src/shell/utils/chatToolFailure";

test("canvas failure reports distinguish parent, created ids and resolved target", () => {
  const report = toolFailureReport({
    type: "add_jsx",
    createdElementIds: [],
    payload: {
      toolName: "canvas_add",
      operationId: "op-1",
      parentElementId: "el-parent",
      requestedCanvasId: "canvas-requested",
      canvasId: "canvas-resolved",
      applied: null,
      observation: "unconfirmed",
      error: "Result not confirmed"
    }
  }, "chat-1");
  assert.match(report, /Parent Element: el-parent/);
  assert.match(report, /Requested Canvas: canvas-requested/);
  assert.match(report, /Resolved Canvas: canvas-resolved/);
  assert.match(report, /Applied: unknown/);
  assert.doesNotMatch(report, /^Element: el-parent$/m);
});
