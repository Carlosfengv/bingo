/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/domGeometry.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { isFlowLayoutDisplay } from "./absolutePositioning";

/** Resolve an element id to its rendered DOM node, descending through display:contents wrappers. */
function resolveElementNode(elementId) {
  const el = document.querySelector(`[data-element-id="${elementId}"]:not([data-drag-overlay] *)`) ?? document.querySelector(`[data-element-id="${elementId}"]`);
  if (!el) return null;
  let node = el;
  while (window.getComputedStyle(node).display === "contents" && node.firstElementChild) node = node.firstElementChild;
  return node instanceof HTMLElement ? node : null;
}
/** True when the rendered element's active CSS makes it a flex/grid layout parent. */
function isFlowLayoutElement(elementId) {
  const node = resolveElementNode(elementId);
  return !!node && isFlowLayoutDisplay(window.getComputedStyle(node).display);
}
/** Sum of a node's layout offsets up its offsetParent chain. */
function accumulatedOffset(node) {
  let x = 0;
  let y = 0;
  for (let cur = node; cur; cur = cur.offsetParent instanceof HTMLElement ? cur.offsetParent : null) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
  }
  return {
    x,
    y
  };
}
/** An element's rect in CANVAS space (layout px relative to the canvas content root), which is
*  what canvasPosition is expressed in. Offsets are used rather than getBoundingClientRect because
*  zoom/pan is a CSS transform on an ancestor, so rects come back scaled by the current view.
*  Differencing against the content root keeps this correct whichever ancestors are positioned.
*  Null when the element isn't rendered. */
function getCanvasSpaceRect(elementId) {
  const node = resolveElementNode(elementId);
  const content = document.querySelector("[data-canvas-content]");
  if (!node || !(content instanceof HTMLElement)) return null;
  const nodeOffset = accumulatedOffset(node);
  const contentOffset = accumulatedOffset(content);
  return {
    x: nodeOffset.x - contentOffset.x,
    y: nodeOffset.y - contentOffset.y,
    width: node.offsetWidth,
    height: node.offsetHeight
  };
}
/** Padding box (border excluded, padding included) of a DOM node, in SCREEN pixels. CSS measures
*  `absolute` offsets from this box. Computed border widths are layout px, scaled to screen px by
*  `canvasScale`. */
function paddingBoxOfNode(node, canvasScale) {
  const style = window.getComputedStyle(node);
  const r = node.getBoundingClientRect();
  const bl = (parseFloat(style.borderLeftWidth) || 0) * canvasScale;
  const bt = (parseFloat(style.borderTopWidth) || 0) * canvasScale;
  const br = (parseFloat(style.borderRightWidth) || 0) * canvasScale;
  const bb = (parseFloat(style.borderBottomWidth) || 0) * canvasScale;
  return {
    left: r.left + bl,
    top: r.top + bt,
    right: r.right - br,
    bottom: r.bottom - bb
  };
}
/** Padding box of a specific element by id — the containing block for any absolute children it owns. */
function getElementPaddingBox(elementId, canvasScale) {
  const node = resolveElementNode(elementId);
  return node ? paddingBoxOfNode(node, canvasScale) : null;
}
/** Padding box of an absolutely-positioned element's containing block (its `offsetParent`, the
*  nearest positioned ancestor) in SCREEN pixels — what makes "drag by d → moves by exactly d"
*  hold regardless of which ancestor is positioned. Returns null if it can't be resolved. */
function getAbsoluteContainingBox(elementId, canvasScale) {
  const node = resolveElementNode(elementId);
  if (!node) return null;
  const offsetParent = node.offsetParent;
  return offsetParent instanceof HTMLElement ? paddingBoxOfNode(offsetParent, canvasScale) : null;
}
/** Given an element rect and its container box (both screen px), produce a horizontal line to the
*  nearer of left/right and a vertical line to the nearer of top/bottom, each anchored at the
*  element's center on the perpendicular axis, with the gap distance. */
function computeEdgeDistances(rect, box) {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dLeft = rect.left - box.left;
  const dRight = box.right - right;
  const dTop = rect.top - box.top;
  const dBottom = box.bottom - bottom;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const xAnchor = clamp(cx, box.left, box.right);
  const yAnchor = clamp(cy, box.top, box.bottom);
  return {
    horizontal: Math.abs(dLeft) <= Math.abs(dRight) ? {
      x1: box.left,
      x2: rect.left,
      y: yAnchor,
      distance: dLeft
    } : {
      x1: right,
      x2: box.right,
      y: yAnchor,
      distance: dRight
    },
    vertical: Math.abs(dTop) <= Math.abs(dBottom) ? {
      x: xAnchor,
      y1: box.top,
      y2: rect.top,
      distance: dTop
    } : {
      x: xAnchor,
      y1: bottom,
      y2: box.bottom,
      distance: dBottom
    }
  };
}

export { computeEdgeDistances, getAbsoluteContainingBox, getCanvasSpaceRect, getElementPaddingBox, isFlowLayoutElement };
