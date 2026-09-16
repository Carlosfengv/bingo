/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/scalePivot.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { accumulatedLinearTransform, invertLinear } from "../../canvas/utils/transformMatrix";
import { getCamera } from "../../shell/utils/chatShortcuts";
import { resolveVisibleElement$1 } from "./visibleElement";

var properties$2 = ["transformOrigin", "position", "left", "right", "top", "bottom"];
function offset(value, delta) {
  if (!value || value === "auto") return delta;
  if (typeof value === "number") return value + delta;
  if (/^-?[\d.]+px$/.test(value)) return `${parseFloat(value) + delta}px`;
  return `calc(${value} ${delta < 0 ? "-" : "+"} ${Math.abs(delta)}px)`;
}
function withPositionOffset(current, computedPosition, delta) {
  const styles = {
    ...current
  };
  const {
    x,
    y
  } = delta;
  if (Math.abs(x) > 1e-6 || Math.abs(y) > 1e-6) {
    if (computedPosition === "static") styles.position = "relative";
    if (Math.abs(x) > 1e-6) {
      if ((!styles.left || styles.left === "auto") && styles.right && styles.right !== "auto") styles.right = offset(styles.right, -x);else styles.left = offset(styles.left, x);
    }
    if (Math.abs(y) > 1e-6) {
      if ((!styles.top || styles.top === "auto") && styles.bottom && styles.bottom !== "auto") styles.bottom = offset(styles.bottom, -y);else styles.top = offset(styles.top, y);
    }
  }
  return styles;
}
function restoreOwnedStyles(styles, pivot, keys) {
  const restored = {
    ...styles
  };
  if (pivot) for (const key of keys) {
    if (restored[key] !== pivot.applied[key]) continue;
    const original = pivot.original[key];
    if (original === void 0) delete restored[key];else restored[key] = original;
  }
  return restored;
}
/** Flow children anchor to their layout box. Free objects and grouped selections
* compensate for pivot changes to preserve their shared visual anchor. */
function applyScalePivot(current, previous, computedPosition, scaled, preservePosition = true) {
  const styles = {
    ...(preservePosition ? withPositionOffset(current, computedPosition, scaled.positionDelta) : restoreOwnedStyles(current, previous, properties$2.filter(key => key !== "transformOrigin"))),
    transform: scaled.transform,
    transformOrigin: scaled.transformOrigin
  };
  const original = {},
    applied = {};
  for (const key of properties$2) {
    original[key] = previous && previous.applied[key] === current[key] ? previous.original[key] : current[key];
    applied[key] = styles[key];
  }
  return {
    styles,
    pivot: {
      original,
      applied
    }
  };
}
function scaleNode(elementId) {
  const raw = typeof document === "undefined" ? null : document.querySelector(`[data-canvas-content] [data-element-id="${CSS.escape(elementId)}"]`) ?? document.querySelector(`[data-element-id="${CSS.escape(elementId)}"]`);
  return raw ? resolveVisibleElement$1(raw) : null;
}
function measureResetOffset(node, next, canvasSpace = false) {
  const before = node.getBoundingClientRect();
  const parent = node.parentElement;
  const inverseParent = invertLinear(parent ? accumulatedLinearTransform(parent) : {
    a: 1,
    b: 0,
    c: 0,
    d: 1
  });
  const zoom = node.closest(".react-transform-component") ? getCamera().scale || 1 : 1;
  const original = node.style.cssText;
  let dx = 0,
    dy = 0;
  try {
    node.style.setProperty("transition", "none", "important");
    for (const key of ["transform", ...properties$2]) {
      const value = next[key];
      node.style[key] = typeof value === "number" ? `${value}px` : value ?? "";
    }
    const after = node.getBoundingClientRect();
    dx = (before.left - after.left) / zoom;
    dy = (before.top - after.top) / zoom;
  } finally {
    node.style.cssText = original;
  }
  return canvasSpace ? {
    x: dx,
    y: dy
  } : {
    x: inverseParent.a * dx + inverseParent.c * dy,
    y: inverseParent.b * dx + inverseParent.d * dy
  };
}
/** Root placement belongs to canvas coordinates, not exported CSS offsets. */
function scaleResetCanvasOffset(styles, elementId) {
  const node = scaleNode(elementId);
  return node ? measureResetOffset(node, styles, true) : {
    x: 0,
    y: 0
  };
}
/** Restore scale-owned CSS. Root frames preserve their upper-left through a
* separate canvas position update; positioned children still use CSS placement. */
function removeScalePivot(styles, elementId, options = {}) {
  const next = restoreOwnedStyles(styles, options.pivot, properties$2);
  if (options.isRoot) return next;
  const node = scaleNode(elementId);
  if (!node) return next;
  const position = getComputedStyle(node).position;
  if (position !== "absolute" && position !== "fixed") return next;
  return withPositionOffset(next, position, measureResetOffset(node, next));
}

export { applyScalePivot, removeScalePivot, scaleResetCanvasOffset };
