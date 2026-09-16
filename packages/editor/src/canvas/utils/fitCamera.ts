/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/fitCamera.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { MIN_CANVAS_SCALE } from "./zoom";

var MIN_VIEWPORT = 8;
function resolvePadding(padding) {
  return typeof padding === "number" ? {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding
  } : padding;
}
/**
* Scale and centre so `rect` fills the viewport with padding around it.
*
* Padding may be per-edge: floating chrome (the canvas toolbar) overlaps the
* viewport, so padding to the raw viewport edge would tuck content underneath
* it. Content is centred in the padded box, not the viewport, so an asymmetric
* inset actually shifts the result.
*
* Scale is capped at 1:1, so content smaller than the viewport is centred at
* actual size rather than magnified.
*/
function cameraToFitRect(rect, viewport, options = {}) {
  const {
    padding = 32,
    minScale = MIN_CANVAS_SCALE,
    maxScale = 1
  } = options;
  if (viewport.width < MIN_VIEWPORT || viewport.height < MIN_VIEWPORT) return null;
  if (!(rect.width > 0) || !(rect.height > 0)) return null;
  const pad = resolvePadding(padding);
  const usableWidth = viewport.width - pad.left - pad.right;
  const usableHeight = viewport.height - pad.top - pad.bottom;
  const boxLeft = usableWidth > 0 ? pad.left : 0;
  const boxTop = usableHeight > 0 ? pad.top : 0;
  const boxWidth = usableWidth > 0 ? usableWidth : viewport.width;
  const boxHeight = usableHeight > 0 ? usableHeight : viewport.height;
  const raw = Math.min(boxWidth / rect.width, boxHeight / rect.height);
  const scale = Math.min(Math.max(raw, minScale), maxScale);
  return {
    scale,
    positionX: boxLeft + boxWidth / 2 - (rect.x + rect.width / 2) * scale,
    positionY: boxTop + boxHeight / 2 - (rect.y + rect.height / 2) * scale
  };
}

export { cameraToFitRect };
