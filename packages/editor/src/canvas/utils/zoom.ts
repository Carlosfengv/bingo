/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/zoom.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var MIN_CANVAS_SCALE = .02;
var CANVAS_ZOOM_STEP = 1.1;
/** Wheel / pinch zoom sensitivity. Matches the original `1 - deltaY * 0.01` gain. */
var WHEEL_ZOOM_SENSITIVITY = .01;
/** A reversible zoom curve for trackpad pinch / Ctrl+wheel. */
function zoomScaleForWheel(scale, deltaY) {
  return clampCanvasScale(scale * Math.exp(-deltaY * WHEEL_ZOOM_SENSITIVITY));
}
function clampCanvasScale(scale) {
  return Math.max(MIN_CANVAS_SCALE, Math.min(256, scale));
}
/** Keep the canvas point at the viewport's center fixed when changing scale. */
function zoomAtCenter(camera, scale, width, height) {
  const nextScale = clampCanvasScale(scale);
  const ratio = nextScale / camera.scale;
  return {
    scale: nextScale,
    positionX: width / 2 - (width / 2 - camera.positionX) * ratio,
    positionY: height / 2 - (height / 2 - camera.positionY) * ratio
  };
}
/** Fit rendered canvas bounds with room for labels and the floating toolbar. */
function cameraToFit(rects, width, height) {
  const visible = rects.filter(rect => [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0);
  if (!visible.length || width <= 0 || height <= 0) return null;
  const left = Math.min(...visible.map(rect => rect.x));
  const top = Math.min(...visible.map(rect => rect.y));
  const right = Math.max(...visible.map(rect => rect.x + rect.width));
  const bottom = Math.max(...visible.map(rect => rect.y + rect.height));
  const scale = clampCanvasScale(Math.min(Math.max(1, width - 128) / (right - left), Math.max(1, height - 128) / (bottom - top)));
  return {
    scale,
    positionX: width / 2 - (left + right) / 2 * scale,
    positionY: height / 2 - (top + bottom) / 2 * scale
  };
}

export { CANVAS_ZOOM_STEP, MIN_CANVAS_SCALE, cameraToFit, clampCanvasScale, zoomAtCenter, zoomScaleForWheel };
