import assert from "node:assert/strict";
import test from "node:test";

import { parseJSX } from "../../packages/compiler/src/codegen/parseJSX";
import { getChildren$2, getRootIds } from "../../packages/compiler/src/store/read";
import { storeSubtreeToLegacyNested } from "../../packages/compiler/src/store/legacy";
import { applyOperationsToStore, createInsertOperation, invertOperations } from "../../packages/editor/src/shared/utils/operations";

test("a multi-root insert batch applies, undoes, and redoes as one complete operation array", () => {
  const base = parseJSX('<main data-element-id="parent" />', {}, {});
  const parsed = parseJSX("<><div data-order={1} /><span data-order={2} /></>", {}, {});
  const operations = getRootIds(parsed).map((id, index) => createInsertOperation(
    storeSubtreeToLegacyNested(parsed, id),
    "parent",
    index
  ));

  const applied = applyOperationsToStore(base, operations);
  assert.equal(getChildren$2(applied, "parent").length, 2);

  const undone = applyOperationsToStore(applied, invertOperations(operations));
  assert.deepEqual(getChildren$2(undone, "parent"), []);

  const redone = applyOperationsToStore(undone, operations);
  assert.equal(getChildren$2(redone, "parent").length, 2);
  assert.equal(new Set(getChildren$2(redone, "parent")).size, 2);
});
