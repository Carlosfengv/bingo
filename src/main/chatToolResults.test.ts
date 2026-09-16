import assert from "node:assert/strict";
import test from "node:test";
import { getDisplayToolResults, normalizeToolResult } from "../../packages/editor/src/shell/utils/chatToolResults";
import { toolFailureReport } from "../../packages/editor/src/shell/utils/chatToolFailure";

const noElement = () => null;
test("reopening a journal transcript accepts top-level tool outcomes without payload", () => {
  const journal = JSON.parse(JSON.stringify([
    { type: "canvas_add", success: false, error: "Invalid JSX", args: { parent_id: "parent" }, operation: { operationId: "op-1", applied: false, observation: "confirmed" } },
    { type: "canvas_add", success: true, operation: { createdElementIds: ["new-child"], resolvedCanvasId: "canvas-1", applied: true } },
    { type: "project_edit", success: true, args: { file_path: "src/Button.tsx" } },
  ]));
  const results = getDisplayToolResults(journal, noElement);
  const failure = results.find(result => result.payload.error);
  assert.equal(failure.type, "add_jsx");
  assert.match(toolFailureReport(failure, "chat-1"), /Invalid JSX/);
  assert.match(toolFailureReport(failure, "chat-1"), /Operation: op-1/);
  assert.equal(results.find(result => result.payload.path)?.type, "Edit");
  assert.deepEqual(results.find(result => result.payload.applied === true).createdElementIds, ["new-child"]);
  assert.equal(journal[0].payload, undefined, "reading does not rewrite stored history");
});

test("existing renderer results keep failures and file deduplication", () => {
  const existing = { type: "Write", payload: { path: "src/a.ts", success: true } };
  assert.equal(normalizeToolResult(existing), existing);
  const failure = { type: "Write", payload: { path: "src/a.ts", error: "denied", success: false } };
  const results = getDisplayToolResults([existing, existing, failure], noElement);
  assert.equal(results.length, 2);
  assert.equal(results[1], failure);
});

test("missing or malformed historical details do not crash the transcript", () => {
  const results = getDisplayToolResults([null, false, {}, { type: "Read" }, { type: "canvas_add", payload: null }], noElement);
  assert.equal(results.length, 5);
  assert.ok(results.every(result => result.payload && result.payload.success !== true));
  assert.ok(results.every(result => result.recoveryIssue));
  assert.deepEqual(getDisplayToolResults(null, noElement), []);
});


test("invalid display fields stay visible as unknown results instead of breaking valid neighbors", () => {
  const valid = { type: "Edit", payload: { path: "src/ok.ts", success: true } };
  for (const malformed of [
    { type: "Edit", payload: { path: {}, success: true } },
    { type: "add_jsx", payload: { success: true }, createdElementIds: 42 },
    { type: "Edit", payload: { success: "false" } },
    { type: "add_jsx", payload: {} },
  ]) {
    const results = getDisplayToolResults([malformed, valid], noElement);
    assert.equal(results.length, 2);
    assert.ok(results.includes(valid));
    assert.equal(results.filter(result => result.recoveryIssue).length, 1);
    assert.equal(results.find(result => result.recoveryIssue).payload.success, undefined);
  }
});

test("normalization is idempotent and does not alter stored records", () => {
  const original = { type: "canvas_add", success: true, operation: { createdElementIds: ["child"], applied: true } };
  const snapshot = JSON.stringify(original);
  const normalized = normalizeToolResult(original);
  assert.deepEqual(normalizeToolResult(normalized), normalized);
  assert.equal(JSON.stringify(original), snapshot);
  const unknown = normalizeToolResult({ type: "canvas_add" });
  assert.deepEqual(normalizeToolResult(unknown), unknown);
});
