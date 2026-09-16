/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/reorderSelection.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getById, getChildren$2, getParentId, getRootIds } from "@bingo/compiler";

function parentIdOf(store, id) {
  const key = getParentId(store, id);
  return key === "ROOT" || key === null ? null : key;
}
function flexDirectionOf(store, parentId) {
  if (!parentId) return "column";
  const parent = getById(store, parentId);
  return (parent && "styles" in parent ? parent.styles?.flexDirection : void 0) === "row" ? "row" : "column";
}
/** Arrow keys only reorder along the parent's own flow axis. */
function offsetFor(direction, key) {
  if (direction === "column") {
    if (key === "ArrowUp") return -1;
    if (key === "ArrowDown") return 1;
  } else {
    if (key === "ArrowLeft") return -1;
    if (key === "ArrowRight") return 1;
  }
  return null;
}
/**
* Order the selection for an arrow-key reorder.
*
* Every selected element shifts one slot inside its *own* parent, so a selection
* spanning several containers stays in lockstep. Siblings sharing a parent are
* emitted trailing-edge first, so shifting one doesn't displace the next.
*/
function planSelectionReorder(store, selectedElementIds, key) {
  const byParent = new Map();
  for (const id of selectedElementIds) {
    if (!getById(store, id)) continue;
    const parentId = parentIdOf(store, id);
    const offset = offsetFor(flexDirectionOf(store, parentId), key);
    if (offset === null) continue;
    const index = (parentId === null ? getRootIds(store) : getChildren$2(store, parentId)).indexOf(id);
    if (index === -1) continue;
    const group = byParent.get(parentId) ?? [];
    group.push({
      step: {
        id,
        parentId,
        offset
      },
      index
    });
    byParent.set(parentId, group);
  }
  const steps = [];
  for (const group of byParent.values()) {
    group.sort((a, b) => a.step.offset === 1 ? b.index - a.index : a.index - b.index);
    for (const entry of group) steps.push(entry.step);
  }
  return steps;
}

export { planSelectionReorder };
