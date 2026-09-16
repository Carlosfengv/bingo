import assert from "node:assert/strict";
import test from "node:test";
import { emptyStore, getRootIds } from "@bingo/compiler";
import { createInsertOperation } from "../../packages/editor/src/shared/utils/operations";
import { CanvasRevisionConflictError, appendCanvasCandidateOperation, commitCanvasCandidate, createCanvasCommitCandidate } from "../../packages/editor/src/shell/hooks/canvasOperationCommit";

function nestedTree(nodeCount) {
  return {
    id: "el-root",
    type: "html",
    tag: "div",
    props: {},
    styles: {},
    children: Array.from({ length: nodeCount - 1 }, (_, index) => ({
      id: `el-child-${index}`,
      type: "text",
      text: String(index)
    }))
  };
}

for (const nodeCount of [20, 200, 1_000]) test(`a ${nodeCount}-node formal insertion publishes exactly once and does not need rAF`, () => {
    const initial = emptyStore();
    const candidate = createCanvasCommitCandidate(initial);
    appendCanvasCandidateOperation(candidate, createInsertOperation(nestedTree(nodeCount), null, 0));
    let publishCount = 0;
    let historyCount = 0;
    globalThis.requestAnimationFrame = () => {
      throw new Error("formal commit must not wait for paint");
    };
    const next = commitCanvasCandidate(candidate, initial, prepared => {
      publishCount += 1;
      historyCount += prepared.operations.length;
    });
    assert.equal(next.byId.size, nodeCount);
    assert.deepEqual(getRootIds(next), ["el-root"]);
    assert.equal(publishCount, 1);
    assert.equal(historyCount, 1);
    delete globalThis.requestAnimationFrame;
  });

test("a stale candidate is rejected before publication", () => {
  const initial = emptyStore();
  const candidate = createCanvasCommitCandidate(initial);
  appendCanvasCandidateOperation(candidate, createInsertOperation(nestedTree(20), null, 0));
  let published = false;
  assert.throws(() => commitCanvasCandidate(candidate, emptyStore(), () => {
    published = true;
  }), CanvasRevisionConflictError);
  assert.equal(published, false);
  assert.equal(initial.byId.size, 0);
});
