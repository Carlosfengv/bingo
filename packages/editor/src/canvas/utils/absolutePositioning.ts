/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/absolutePositioning.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/** The style keys that take an element out of flow. Removing all of them returns it to flow. */
var OUT_OF_FLOW_STYLE_KEYS = ["position", "top", "right", "bottom", "left", "inset"];
/** Flex and grid parents lay their children out in flow, including inline variants. */
function isFlowLayoutDisplay(display) {
  return display === "flex" || display === "inline-flex" || display === "grid" || display === "inline-grid";
}
/**
* New freeform/root objects are absolute. Children of flex/grid parents are
* explicitly relative and cannot retain offsets from an earlier absolute
* parent, otherwise they remain displaced even after re-entering flow.
*/
function positionStylesForParent(styles, flowParent) {
  const next = {
    ...(styles || {}),
    position: flowParent ? "relative" : "absolute"
  };
  if (flowParent) {
    delete next.top;
    delete next.right;
    delete next.bottom;
    delete next.left;
    delete next.inset;
  }
  return next;
}
/** Whether a child already has the normalized positioning required by a flex/grid parent. */
function isRelativeFlowPosition(styles) {
  return styles?.position === "relative" && styles.top === void 0 && styles.right === void 0 && styles.bottom === void 0 && styles.left === void 0 && styles.inset === void 0;
}
/**
* Compute new absolute offset styles (`top`/`left`/`right`/`bottom`) after dragging an
* absolutely-positioned element by `canvasDelta` (in canvas/layout px).
*
* Which edges are written = which edges are currently pinned (present in `startStyles`),
* defaulting to top+left when an axis has neither — this mirrors the StylesPanel pin model
* and Framer's behavior. A right/bottom-pinned edge stores distance FROM that edge, so moving
* the element that way DECREASES its value. Offsets are normalized to integer px, computed from
* measured geometry, so the result is robust to `%`/`auto`/unset start values.
*
* `startRect` is the element's border-box (screen px) at drag start; `containingBox` is the
* padding box of its containing block (screen px); both are divided by `canvasScale` to layout px.
* `margins` are the element's computed margins (layout px) — subtracted so the written offset
* round-trips for a zero-delta drag even when the element has margins.
*/
function computeAbsoluteOffsetStyles(args) {
  const {
    startStyles: s,
    startRect,
    containingBox: box,
    margins,
    canvasDelta,
    canvasScale,
    autoPin = false
  } = args;
  const startLeft = (startRect.left - box.left) / canvasScale - margins.marginLeft;
  const startTop = (startRect.top - box.top) / canvasScale - margins.marginTop;
  const startRight = (box.right - (startRect.left + startRect.width)) / canvasScale - margins.marginRight;
  const startBottom = (box.bottom - (startRect.top + startRect.height)) / canvasScale - margins.marginBottom;
  const hasL = s.left != null,
    hasR = s.right != null;
  const hasT = s.top != null,
    hasB = s.bottom != null;
  const next = {
    ...s
  };
  const px = n => `${Math.round(n)}px`;
  const newLeft = startLeft + canvasDelta.x;
  const newRight = startRight - canvasDelta.x;
  const newTop = startTop + canvasDelta.y;
  const newBottom = startBottom - canvasDelta.y;
  if (hasL && hasR) {
    next.left = px(newLeft);
    next.right = px(newRight);
  } else if (autoPin) {
    if (newRight < newLeft) {
      next.right = px(newRight);
      next.left = void 0;
    } else {
      next.left = px(newLeft);
      next.right = void 0;
    }
  } else if (hasR) next.right = px(newRight);else next.left = px(newLeft);
  if (hasT && hasB) {
    next.top = px(newTop);
    next.bottom = px(newBottom);
  } else if (autoPin) {
    if (newBottom < newTop) {
      next.bottom = px(newBottom);
      next.top = void 0;
    } else {
      next.top = px(newTop);
      next.bottom = void 0;
    }
  } else if (hasB) next.bottom = px(newBottom);else next.top = px(newTop);
  return next;
}

export { OUT_OF_FLOW_STYLE_KEYS, computeAbsoluteOffsetStyles, isFlowLayoutDisplay, isRelativeFlowPosition, positionStylesForParent };
