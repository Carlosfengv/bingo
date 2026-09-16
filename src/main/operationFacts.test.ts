import assert from "node:assert/strict";
import test from "node:test";
import { createOperationFactAccumulator, operationAction } from "./operationFacts";

test("classifies actions and keeps unknown when completion cannot be verified", () => {
  assert.equal(operationAction("run_tests"), "verify");
  assert.equal(operationAction("project_write"), "write");
  const accumulator = createOperationFactAccumulator("run");
  accumulator.record({ id: "native", source: "agent-native", toolName: "Bash", outcome: "unknown", input: { command: "test" } });
  assert.equal(accumulator.facts[0].outcome, "unknown");
});

test("deduplicates repeated events and lets verified MCP completion replace unknown", () => {
  const accumulator = createOperationFactAccumulator("run");
  accumulator.record({ id: "same", source: "agent-native", toolName: "canvas_update", outcome: "unknown", args: { element_id: "button" } });
  accumulator.record({ id: "same", source: "bingo-mcp", toolName: "canvas_update", outcome: "succeeded", args: { element_id: "button" }, resultText: "updated" });
  accumulator.record({ id: "same", source: "bingo-mcp", toolName: "canvas_update", outcome: "succeeded" });
  assert.equal(accumulator.facts.length, 1);
  assert.equal(accumulator.facts[0].outcome, "succeeded");
  assert.deepEqual(accumulator.facts[0].targets, ["button"]);
});

test("records failed MCP operations without inferring success from assistant text", () => {
  const accumulator = createOperationFactAccumulator("run");
  accumulator.record({ id: "failed", source: "bingo-mcp", toolName: "project_write", outcome: "failed", resultText: "permission denied", args: { file_path: "src/a.ts" } });
  assert.equal(accumulator.facts[0].outcome, "failed");
  assert.equal(accumulator.facts[0].resultText, "permission denied");
});
