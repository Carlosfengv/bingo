/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/nextRootPlacement.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var DEFAULT_ROOT_ORIGIN = {
  x: 100,
  y: 100
};
var UNKNOWN_ROOT_WIDTH = 1200;
/** Park a new root to the right of existing frames. Empty canvas uses the origin. */
function nextRootPlacement(boxes) {
  if (boxes.length === 0) return {
    ...DEFAULT_ROOT_ORIGIN
  };
  let maxRight = -Infinity;
  let alignY = DEFAULT_ROOT_ORIGIN.y;
  let sawY = false;
  for (const box of boxes) {
    if (!(box.width >= 0) || !(box.height >= 0)) continue;
    maxRight = Math.max(maxRight, box.x + box.width);
    if (!sawY) {
      alignY = box.y;
      sawY = true;
    } else alignY = Math.min(alignY, box.y);
  }
  if (!Number.isFinite(maxRight)) return {
    ...DEFAULT_ROOT_ORIGIN
  };
  return {
    x: Math.round(maxRight + 240),
    y: Math.round(alignY)
  };
}
function estimateUnmeasuredRootBox(input) {
  return {
    x: typeof input.x === "number" ? input.x : DEFAULT_ROOT_ORIGIN.x,
    y: typeof input.y === "number" ? input.y : DEFAULT_ROOT_ORIGIN.y,
    width: typeof input.width === "number" && input.width > 0 ? input.width : UNKNOWN_ROOT_WIDTH,
    height: typeof input.height === "number" && input.height > 0 ? input.height : 800
  };
}

export { UNKNOWN_ROOT_WIDTH, estimateUnmeasuredRootBox, nextRootPlacement };
