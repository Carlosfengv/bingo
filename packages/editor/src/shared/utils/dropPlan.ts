/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/dropPlan.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { applyOperationsToStore, createMoveOperation } from "./operations";
import { ROOT, canAcceptChild, getById, getChildren$2, getParentId, getRootIds, isDescendant, walk } from "@bingo/compiler";

/** Resolve a drop slot (target row + position) to the parent and index a move lands at. */
function resolveDropTarget(store, targetId, position) {
  if (targetId === null) return {
    parentId: null,
    index: 0
  };
  if (position === "inside") return {
    parentId: targetId,
    index: getChildren$2(store, targetId).length
  };
  const parentKey = getParentId(store, targetId);
  const parentId = parentKey === "ROOT" || parentKey === null ? null : parentKey;
  const index = (parentId === null ? getRootIds(store) : getChildren$2(store, parentId)).indexOf(targetId);
  return {
    parentId,
    index: position === "before" ? index : index + 1
  };
}
/** True when `id` sits inside any of `ids`, so it moves with them rather than beside them. */
function hasAncestorIn(store, id, ids) {
  for (let parent = getParentId(store, id); parent && parent !== "ROOT"; parent = getParentId(store, parent)) if (ids.has(parent)) return true;
  return false;
}
/**
* Last-child walk from `id` toward root. `[id, parent, grandparent, …]` as long
* as each node is the last sibling of its parent — the gaps under a last child
* are the same Y, and only indent distinguishes them.
*/
function lastChildChain(store, id) {
  const chain = [id];
  let current = id;
  while (true) {
    const parent = getParentId(store, current);
    if (!parent || parent === "ROOT") break;
    const siblings = getChildren$2(store, parent);
    if (siblings[siblings.length - 1] !== current) break;
    chain.push(parent);
    current = parent;
  }
  return chain;
}
/** Stay in a 2-way split until the pointer clearly crosses the other half. */
function stickySplit(yRatio, stickyBand, low, high) {
  if (stickyBand === low) return yRatio < .48 ? low : high;
  if (stickyBand === high) return yRatio < .38 ? low : high;
  return yRatio < .4 ? low : high;
}
/** Unarmed container: top/bottom gaps with wide hysteresis so a downward
*  entry doesn't pin the line to the top for the rest of the drag. */
function unarmedSplit(yRatio, stickyBand) {
  if (stickyBand === "before") return yRatio < .72 ? "before" : "after";
  if (stickyBand === "after") return yRatio < .28 ? "before" : "after";
  return yRatio < .5 ? "before" : "after";
}
/** Empty container, armed: top / nest / bottom, with hysteresis so the line doesn't chatter. */
function stickyTriple(yRatio, stickyBand) {
  if (stickyBand === "before") return yRatio < .38 ? "before" : yRatio > .78 ? "after" : "inside";
  if (stickyBand === "after") return yRatio > .62 ? "after" : yRatio < .22 ? "before" : "inside";
  if (stickyBand === "inside") {
    if (yRatio < .2) return "before";
    if (yRatio > .8) return "after";
    return "inside";
  }
  return yRatio < .22 ? "before" : yRatio > .78 ? "after" : "inside";
}
function siblingIds(store, id) {
  const parent = getParentId(store, id);
  return !parent || parent === "ROOT" ? getRootIds(store) : getChildren$2(store, parent);
}
function previousSiblingId(store, id) {
  const siblings = siblingIds(store, id);
  const index = siblings.indexOf(id);
  return index > 0 ? siblings[index - 1] : null;
}
function nextSiblingId(store, id) {
  const siblings = siblingIds(store, id);
  const index = siblings.indexOf(id);
  return index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
}
function dropIntent(hoveredId, band, targetId, position, outdent = 0) {
  return {
    targetId,
    position,
    sticky: {
      hoveredId,
      band,
      outdent,
      targetId,
      position
    }
  };
}
/** How many indent steps left of this row's column. Defaults to 0 (same depth). */
function outdentSteps(depth, xInRow, indentBase, indentStep, stickyOutdent) {
  const exact = (depth * indentStep + indentBase - xInRow) / indentStep;
  if (stickyOutdent !== null && exact < stickyOutdent + .6 && exact > stickyOutdent - .6) return stickyOutdent;
  return Math.max(0, Math.floor(exact + .05));
}
function resolveBeforeGap(store, hit, stepsLeft) {
  const parent = getParentId(store, hit.hoveredId);
  const prev = previousSiblingId(store, hit.hoveredId);
  if (prev) return dropIntent(hit.hoveredId, "before", prev, "after");
  if (parent && parent !== "ROOT" && stepsLeft >= 1) return dropIntent(hit.hoveredId, "before", parent, "after", stepsLeft);
  return dropIntent(hit.hoveredId, "before", hit.hoveredId, "before");
}
function resolveAfterGap(store, hit, stepsLeft) {
  const chain = lastChildChain(store, hit.hoveredId).filter(id => {
    if (!hit.dragIds) return true;
    return !hit.dragIds.has(id) && !hasAncestorIn(store, id, hit.dragIds);
  });
  const steps = Math.min(stepsLeft, Math.max(0, chain.length - 1));
  return dropIntent(hit.hoveredId, "after", chain[steps] ?? hit.hoveredId, "after", steps);
}
/** Gap under an expanded header. Never `after` the wrap — that is the subtree bottom. */
function firstChildGap(store, hit) {
  const first = getChildren$2(store, hit.hoveredId)[0];
  return first ? dropIntent(hit.hoveredId, "after", first, "before") : dropIntent(hit.hoveredId, "after", hit.hoveredId, "after");
}
/**
* Crossing onto this row: keep the shared gap with the row we just left until
* the pointer is clearly through it. Stops nest → skip-a-sibling → back.
*/
function holdIncomingGap(store, hit, sticky) {
  if (!sticky || sticky.hoveredId === hit.hoveredId) return null;
  const prev = previousSiblingId(store, hit.hoveredId);
  if (prev && sticky.hoveredId === prev && hit.yRatio < .65) return dropIntent(hit.hoveredId, "before", prev, "after");
  const parent = getParentId(store, hit.hoveredId);
  if (parent && parent !== "ROOT" && sticky.hoveredId === parent && sticky.position === "inside" && getChildren$2(store, parent)[0] === hit.hoveredId && hit.yRatio < .65) return dropIntent(hit.hoveredId, "before", hit.hoveredId, "before");
  const next = nextSiblingId(store, hit.hoveredId);
  if (next && sticky.hoveredId === next && hit.yRatio > .35) return hit.expanded ? firstChildGap(store, hit) : dropIntent(hit.hoveredId, "after", hit.hoveredId, "after");
  return null;
}
/**
* Pointer → drop slot for the layers tree.
*
* Adjacent visible rows share one gap: "before B" is "after A". Nest is a
* dwell on a container (allowInside); until then the row is only those gaps.
*
*   leaf / unarmed container:  top → before, bottom → after
*   armed empty container:     top → before, middle → inside, bottom → after
*   armed expanded header:     top → before, rest → inside
*   after a last child + left: after that ancestor (below the nest)
*
* An expanded header never resolves to `after` itself — that paints at the
* wrap bottom (below the last child). That slot is last-child + outdent only.
*/
function resolveLayerTreeDrop(store, hit) {
  const sticky = hit.sticky;
  const sameHover = sticky?.hoveredId === hit.hoveredId;
  const stickyBand = sameHover ? sticky.band : void 0;
  const stickyOutdent = sameHover ? sticky.outdent : null;
  const stepsLeft = outdentSteps(hit.depth, hit.xInRow, hit.indentBase, hit.indentStep, stickyOutdent);
  const nestOk = hit.canHaveChildren && hit.allowInside !== false;
  if (hit.canHaveChildren && !nestOk) {
    const held = holdIncomingGap(store, hit, sticky);
    if (held) return held;
    if (unarmedSplit(hit.yRatio, stickyBand) === "before") return resolveBeforeGap(store, hit, stepsLeft);
    return hit.expanded ? firstChildGap(store, hit) : resolveAfterGap(store, hit, stepsLeft);
  }
  const held = !nestOk ? holdIncomingGap(store, hit, sticky) : null;
  if (held) return held;
  const band = !hit.canHaveChildren ? stickySplit(hit.yRatio, stickyBand, "before", "after") : hit.expanded ? stickySplit(hit.yRatio, stickyBand, "before", "inside") : stickyTriple(hit.yRatio, stickyBand);
  if (band === "before") return resolveBeforeGap(store, hit, stepsLeft);
  if (band === "inside") return dropIntent(hit.hoveredId, band, hit.hoveredId, "inside");
  if (hit.expanded) return firstChildGap(store, hit);
  return resolveAfterGap(store, hit, stepsLeft);
}
/** Store order is paint order, so a dropped group has to keep it. */
function sortByTreeOrder(store, ids) {
  const wanted = new Set(ids);
  const rank = new Map();
  walk(store, ROOT, id => {
    if (wanted.has(id)) rank.set(id, rank.size);
  });
  return [...ids].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
}
/** A parent can take the element only if it accepts the type and doesn't live inside it. */
function canDropInto(store, id, parentId) {
  if (parentId === null) return true;
  if (parentId === id || isDescendant(store, id, parentId)) return false;
  const parent = getById(store, parentId);
  const element = getById(store, id);
  return !!parent && !!element && canAcceptChild(parent, element);
}
/**
* `mutateMove` detaches before it attaches, so within one parent every later
* index has already shifted down by one. A slot resolved against the pre-move
* sibling list therefore overshoots by one when the row travels forward.
*/
function adjustForDetach(index, store, id, toParentId) {
  const fromKey = getParentId(store, id);
  if ((fromKey === "ROOT" || fromKey === null ? null : fromKey) !== toParentId) return index;
  return (toParentId === null ? getRootIds(store) : getChildren$2(store, toParentId)).indexOf(id) < index ? index - 1 : index;
}
/**
* Build the moves that land a dragged selection at one drop slot, in tree order.
* Each move is planned against the previous one's result so replayed indices stay valid.
*/
function planDropMoves(store, draggedIds, targetId, position) {
  if (targetId !== null && (draggedIds.has(targetId) || hasAncestorIn(store, targetId, draggedIds))) return [];
  const topmost = [...draggedIds].filter(id => !hasAncestorIn(store, id, draggedIds));
  const ops = [];
  let cursor = store;
  let slotId = targetId;
  let slotPosition = position;
  for (const id of sortByTreeOrder(store, topmost)) {
    const {
      parentId,
      index
    } = resolveDropTarget(cursor, slotId, slotPosition);
    if (!canDropInto(cursor, id, parentId)) continue;
    const move = createMoveOperation(cursor, id, parentId, adjustForDetach(index, cursor, id, parentId));
    if (!move) continue;
    ops.push(move);
    cursor = applyOperationsToStore(cursor, [move]);
    slotId = id;
    slotPosition = "after";
  }
  return ops;
}

export { hasAncestorIn, planDropMoves, resolveDropTarget, resolveLayerTreeDrop };
