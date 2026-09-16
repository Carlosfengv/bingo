/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/rootBoxes.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getCanvasSpaceRect } from "../../canvas/utils/domGeometry";
import { estimateUnmeasuredRootBox } from "./nextRootPlacement";
import { getById, getRootIds } from "@bingo/compiler";

/**
* Canvas-space boxes for top-level frames. Prefers the laid-out box and falls
* back to `canvasPosition` + `styles`, because `styles.width` is often a CSS
* string or absent entirely.
*
* Shared by new-root placement and by fit-to-content on canvas open.
*/
/** Below this a root is still a hollow shell, not a laid-out box. */
var MEASURED_MIN = 8;
function isDrawPreviewId(id) {
  return id.startsWith("el-draw-");
}
function rootOccupancyBox(store, id) {
  if (isDrawPreviewId(id)) return null;
  const measured = getCanvasSpaceRect(id);
  if (measured && measured.width >= MEASURED_MIN && measured.height >= MEASURED_MIN) return measured;
  const el = getById(store, id);
  if (!el) return null;
  const width = typeof el.styles?.width === "number" ? el.styles.width : void 0;
  const height = typeof el.styles?.height === "number" ? el.styles.height : void 0;
  return estimateUnmeasuredRootBox({
    x: el.canvasPosition?.x,
    y: el.canvasPosition?.y,
    width,
    height
  });
}
function occupiedRootBoxes(store) {
  const boxes = [];
  for (const id of getRootIds(store)) {
    const box = rootOccupancyBox(store, id);
    if (box) boxes.push(box);
  }
  return boxes;
}
/**
* A root whose box is still a stub and whose image has not loaded will jump to
* the image's intrinsic size, so fitting now would leave it off-screen.
*
* Only stub-sized roots are checked: an image that loads late without changing
* an already-valid box cannot move the bounds, and waiting on it costs ~600ms
* for nothing. Font reflow is deliberately not checked here — it shows up as a
* bounds change, which the caller's stability window already catches, whereas
* `document.fonts.status` oscillates back to "loading" as new faces load.
*/
function rootContentSettled() {
  if (typeof document === "undefined") return true;
  const roots = document.querySelectorAll("[data-canvas-root-id]");
  for (const root of roots) {
    if (root.offsetWidth >= MEASURED_MIN && root.offsetHeight >= MEASURED_MIN) continue;
    for (const image of root.querySelectorAll("img")) if (!image.complete) return false;
  }
  return true;
}
/**
* Union of laid-out root boxes, straight from the DOM — no store needed, so
* callers outside React's render cycle can use it. Null while any root is
* still a stub, which is the caller's signal to keep waiting.
*/
function measuredRootBounds() {
  if (typeof document === "undefined") return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let seen = 0;
  for (const root of document.querySelectorAll("[data-canvas-root-id]")) {
    const id = root.getAttribute("data-canvas-root-id");
    if (!id || isDrawPreviewId(id)) continue;
    const box = getCanvasSpaceRect(id);
    if (!box || box.width < MEASURED_MIN || box.height < MEASURED_MIN) return null;
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
    seen += 1;
  }
  if (seen === 0) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export { isDrawPreviewId, measuredRootBounds, occupiedRootBoxes, rootContentSettled, rootOccupancyBox };
