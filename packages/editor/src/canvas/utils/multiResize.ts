/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/multiResize.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Apply the dragged element's pixel delta to a companion in a multi-selection.
*
* Same delta rather than same final size, so elements that started at different
* sizes keep their difference. Each companion anchors on the edge opposite the
* handle, so a west drag moves its left edge and an east drag leaves it put.
*/
function companionGeometry(start, handle, deltaWidth, deltaHeight) {
  const width = Math.max(1, start.width + deltaWidth);
  const height = Math.max(1, start.height + deltaHeight);
  const grownX = width - start.width;
  const grownY = height - start.height;
  return {
    width,
    height,
    left: handle.includes("w") ? start.left - grownX : start.left,
    top: handle.includes("n") ? start.top - grownY : start.top
  };
}

export { companionGeometry };
