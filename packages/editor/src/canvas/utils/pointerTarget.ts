/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/pointerTarget.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { yieldsToCoveredRoot } from "./coveredRoot";
import { getParentId, resolveTextOwner } from "@bingo/compiler";

/**
* The element a pointer landing on `hitId` should target, in topmost mode.
*
* Mirrors what a left-click selects: walk up to the shallowest element whose
* parent hands the pointer to its children, let a child covering its root hand
* it back, then resolve a text leaf to the wrapper that owns it.
*/
function resolvePointerTarget(store, hitId, interactiveParentIds, drilledParentId) {
  let targetId = hitId;
  for (let parent = getParentId(store, targetId); parent && parent !== "ROOT" && !interactiveParentIds?.has(parent); parent = getParentId(store, targetId)) targetId = parent;
  while (yieldsToCoveredRoot(store, targetId, drilledParentId)) {
    const parent = getParentId(store, targetId);
    if (!parent || parent === "ROOT") break;
    targetId = parent;
  }
  return resolveTextOwner(store, targetId);
}

export { resolvePointerTarget };
