/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/dragFrame.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

function screenToCanvas(pt, frame) {
  return {
    x: (pt.x - frame.originX - frame.panX) / frame.scale,
    y: (pt.y - frame.originY - frame.panY) / frame.scale
  };
}
function canvasToScreen(pt, frame) {
  return {
    x: pt.x * frame.scale + frame.originX + frame.panX,
    y: pt.y * frame.scale + frame.originY + frame.panY
  };
}
function mapScreenPoint(pt, from, to) {
  if (!(from.scale > 0) || !(to.scale > 0)) return pt;
  return canvasToScreen(screenToCanvas(pt, from), to);
}
function previewZoomDrift(startRect, startPointer, startScale, liveScale) {
  if (!(startScale > 0)) return {
    x: 0,
    y: 0
  };
  const ratioChange = liveScale / startScale - 1;
  return {
    x: (startRect.left - startPointer.x) * ratioChange,
    y: (startRect.top - startPointer.y) * ratioChange
  };
}

export { mapScreenPoint, previewZoomDrift, screenToCanvas };
