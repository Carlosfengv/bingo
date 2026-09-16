/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/coveredRoot.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getCanvasSpaceRect } from "./domGeometry";
import { getParentId } from "@bingo/compiler";

var COVER_EPSILON = 1;
var coverCache = new WeakMap();
/** True when `child` leaves no pixel of `parent` exposed. Pure — unit-tested. */
function rectCovers(child, parent) {
  return child.x <= parent.x + COVER_EPSILON && child.y <= parent.y + COVER_EPSILON && child.x + child.width >= parent.x + parent.width - COVER_EPSILON && child.y + child.height >= parent.y + parent.height - COVER_EPSILON;
}
/** Reads layout, so DOM-only. */
function coversParent(childId, parentId) {
  const child = getCanvasSpaceRect(childId);
  const parent = getCanvasSpaceRect(parentId);
  if (!child || !parent) return false;
  return rectCovers(child, parent);
}
/**
* True when `elementId` should let its click/hover bubble to its parent root
* instead of taking it. Only direct children of an un-drilled top-level root
* qualify, so the cheap store checks run first and geometry is measured only
* for the handful of elements that can actually be ambiguous.
*/
function yieldsToCoveredRoot(store, elementId, drilledParentId) {
  const parentId = getParentId(store, elementId);
  if (!parentId || parentId === "ROOT") return false;
  if (getParentId(store, parentId) !== "ROOT") return false;
  if (parentId === drilledParentId) return false;
  let cached = coverCache.get(store);
  if (!cached) {
    cached = new Map();
    coverCache.set(store, cached);
  }
  const hit = cached.get(elementId);
  if (hit !== void 0) return hit;
  const covers = coversParent(elementId, parentId);
  cached.set(elementId, covers);
  return covers;
}

export { yieldsToCoveredRoot };
