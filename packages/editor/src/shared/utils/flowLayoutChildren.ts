/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/flowLayoutChildren.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { isFlowLayoutDisplay, positionStylesForParent } from "../../canvas/utils/absolutePositioning";
import { applyOperationsToStore, createSetStylesOperation } from "./operations";
import { getById, getChildren$2 } from "@bingo/compiler";

/**
* When a frame's display changes to flex/grid, move its direct absolute
* children back into flow. Other position modes are intentional and remain
* untouched. Returned operations are appended to the initiating history batch.
*/
function normalizeFlowLayoutChildrenOps(storeAfter, operations) {
  const extra = [];
  let cursor = storeAfter;
  for (const operation of operations) {
    if (operation.type !== "set_styles") continue;
    const oldDisplay = operation.oldStyles?.display;
    const newDisplay = operation.newStyles.display;
    if (oldDisplay === newDisplay || !isFlowLayoutDisplay(String(newDisplay ?? ""))) continue;
    for (const childId of getChildren$2(cursor, operation.elementId)) {
      const child = getById(cursor, childId);
      if (child?.styles?.position !== "absolute") continue;
      const nextStyles = positionStylesForParent(child.styles, true);
      const styleOperation = createSetStylesOperation(cursor, childId, nextStyles);
      if (!styleOperation) continue;
      extra.push(styleOperation);
      cursor = applyOperationsToStore(cursor, [styleOperation]);
    }
  }
  return extra;
}

export { normalizeFlowLayoutChildrenOps };
