import assert from "node:assert/strict";
import test from "node:test";

import { getCanvasRecoveryReport, getCreatedCanvasElementIds } from "./canvasToolResult";

test("canvas result helpers preserve ids and a bounded valid recovery report", () => {
  const result = {
    content: [{ type: "text", text: "Added 2 element(s).\n- el-first\n- el-second" }],
    structuredContent: {
      recovery: {
        schemaVersion: 1,
        status: "recovered",
        stage: "validate",
        attempts: [{
          ruleId: "jsx.wrap-adjacent-roots",
          ruleVersion: 1,
          outcome: "recovered",
          summary: "wrapped",
          durationMs: 2
        }]
      }
    }
  };

  assert.deepEqual(getCreatedCanvasElementIds("canvas_add", result), ["el-first", "el-second"]);
  assert.deepEqual(getCanvasRecoveryReport(result), result.structuredContent.recovery);
});
test("invalid recovery metadata is not propagated", () => {
  assert.equal(getCanvasRecoveryReport({ structuredContent: { recovery: { schemaVersion: 99 } } }), undefined);
  assert.equal(getCanvasRecoveryReport({ structuredContent: { recovery: { schemaVersion: 1, status: "maybe", stage: "parse", attempts: [] } } }), undefined);
});
