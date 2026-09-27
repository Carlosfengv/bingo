/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/pointerTarget.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { yieldsToCoveredRoot } from "./coveredRoot";
import { resolveNearestDivTarget } from "./selection";
import { getParentId, resolveTextOwner } from "@bingo/compiler";

/**
 * The element a pointer landing on `hitId` should target.
 *
* Prefer the nearest authored div, as normal canvas clicks and hover do. When
* there is no div, retain the existing entered-branch and covered-root rules.
*/
function resolvePointerTarget(store, hitId, interactiveParentIds, drilledParentId) {
  const path = [];
  for (let id = hitId; id && id !== "ROOT"; id = getParentId(store, id)) path.push(id);
  const preferredDiv = resolveNearestDivTarget(store, path);
  if (preferredDiv) return preferredDiv;
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
