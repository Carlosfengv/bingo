/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/dragPreviewGeometry.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { resolveVisibleElement$1 } from "../../shared/utils/visibleElement";
import { accumulatedLinearTransform } from "./transformMatrix";

/** Freeze layout size and visual axes before moving an element out of its parent. */
function readDragPreviewGeometry(id) {
  const raw = Array.from(document.querySelectorAll(`[data-element-id="${CSS.escape(id)}"]`)).find(node => !node.closest("[data-drag-overlay]"));
  if (!raw) return;
  const node = resolveVisibleElement$1(raw);
  const computed = getComputedStyle(node);
  const m = accumulatedLinearTransform(node);
  if (computed.transform === "none" && m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1) return;
  const width = node.offsetWidth,
    height = node.offsetHeight;
  if (!width || !height) return;
  const x = -(Math.min(0, m.a * width) + Math.min(0, m.c * height));
  const y = -(Math.min(0, m.b * width) + Math.min(0, m.d * height));
  return {
    width,
    height,
    transform: `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${x}, ${y})`
  };
}
/** Render outside the original layout without applying its visual size twice. */
function withDragPreviewSize(el, r, startScale) {
  if (el.type === "capture") return el;
  if (!r) return el;
  const w = r.preview?.width ?? r.width / startScale;
  const h = r.preview?.height ?? r.height / startScale;
  const pos = el.styles?.position;
  const resetOffsets = pos === "absolute" || pos === "fixed" || pos === "relative" ? {
    position: "relative",
    top: "auto",
    left: "auto",
    right: "auto",
    bottom: "auto",
    inset: "auto"
  } : null;
  return {
    ...el,
    styles: {
      ...(el.styles || {}),
      width: `${w}px`,
      height: `${h}px`,
      ...(r.preview ? {
        boxSizing: "border-box",
        transform: r.preview.transform,
        transformOrigin: "0 0"
      } : {}),
      margin: 0,
      marginLeft: 0,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
      ...(resetOffsets || {})
    }
  };
}
function dragPreviewBoxSize(rect, scale) {
  return rect?.preview ? {
    width: rect.width / scale,
    height: rect.height / scale
  } : void 0;
}

export { dragPreviewBoxSize, readDragPreviewGeometry, withDragPreviewSize };
