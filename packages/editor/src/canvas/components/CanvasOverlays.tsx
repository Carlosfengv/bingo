/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/CanvasOverlays.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { publishHover } from "../../shared/state/hoverChannel";
import { parseTransformControls, topEdgeOfRotatedBox, withTransformRotation } from "../../shared/utils/transformControls";
import { hasMultiRootContents, measureVisibleBounds, resolveObservedElements, resolveVisibleElement$1 } from "../../shared/utils/visibleElement";
import { getCamera } from "../../shell/utils/chatShortcuts";
import { isInsideComponentEdit } from "../utils/captureComponentInstance";
import { isOutermostLock } from "../utils/followAiCamera";
import { accumulatedLinearTransformString, transformLinearMatrix } from "../utils/transformMatrix";
import { getById, getParentId, getRootIds, isTextOwner } from "@bingo/compiler";
import { Text$4, Tooltip, TooltipContent, TooltipTrigger, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import { CursorClick as m$6 } from "@phosphor-icons/react/dist/icons/CursorClick";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import * as import_jsx_runtime from "react/jsx-runtime";

/** At or below this zoom, root name labels are hidden (the roots stay clickable). */
var ROOT_LABEL_MIN_SCALE = .15;
function paintViewOf(overlayMode) {
  return overlayMode ? getCamera() : {
    scale: 1,
    positionX: 0,
    positionY: 0
  };
}
var ROTATE_CORNER_BASE = {
  nw: 270,
  ne: 0,
  se: 90,
  sw: 180
};
var rotateDrag = null;
function writeRotateDrag(next) {
  rotateDrag = next;
}
var rotateMoveListener = null;
var rotateEndListener = null;
function canvasOutlineClass(opts) {
  if (opts.isEdit) return "outline-ed-canvas-component-edit";
  if (opts.isMissingComponent) return "outline-ed-canvas-missing";
  if (opts.isComponent) return "outline-ed-canvas-component";
  return "outline-ed-canvas-selection";
}
function canvasLabelClass(opts) {
  if (opts.isEdit) return "text-ed-canvas-component-edit";
  if (opts.isMissingComponent) return "text-ed-canvas-missing";
  if (opts.isComponent) return "text-ed-canvas-component";
  return "text-ed-canvas-selection";
}
function canvasOutlineColor(opts) {
  if (opts.isEdit) return "var(--ed-canvas-component-edit)";
  if (opts.isMissingComponent) return "var(--ed-canvas-missing)";
  if (opts.isComponent) return "var(--ed-canvas-component)";
  return "var(--ed-canvas-selection)";
}
var RESIZE_NWSE_INNER = `<g fill="none" transform="translate(9 9)"><path d="m4.257 7.087 4.072 4.068-2.829 2.828 8.473-.013.013-8.47-2.841 2.842-4.075-4.068-1.414-1.415 2.844-2.842h-8.486v8.484l2.829-2.827z" fill="#fff"/><path d="m5.317 6.733 4.427 4.424-1.828 1.828 5.056-.016.014-5.054-1.842 1.841-4.428-4.422-2.474-2.475 1.844-1.843h-5.073v5.071l1.83-1.828z" fill="#000"/></g>`;
var RESIZE_NESW_INNER = `<g fill="none" transform="translate(9 9)"><path d="m9.743 7.087-4.072 4.068 2.829 2.828-8.473-.013-.013-8.47 2.841 2.842 4.075-4.068 1.414-1.415-2.844-2.842h8.486v8.484l-2.83-2.827z" fill="#fff"/><path d="m8.683 6.733-4.427 4.424 1.828 1.828-5.056-.016-.014-5.054 1.842 1.841 4.428-4.422 2.474-2.475-1.844-1.843h5.073v5.071l-1.83-1.828z" fill="#000"/></g>`;
var ROTATE_INNER = "<g transform=\"translate(16 16) scale(0.25) translate(-50 -50)\"><path fill=\"none\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-miterlimit=\"10\" vector-effect=\"non-scaling-stroke\" d=\"m77.1 90.3 13.9-21.8h-12.1c0.1-17.9-10.2-36.5-27.3-43.1-4.8-2.4-10.6-4.5-19.9-4.5v-11.8l-22.2 14.2 21.9 14.3 0.2-11.8c20.3 0 38.3 14.7 42.7 33.6 0.5 2.8 0.7 6 0.7 9.1h-13l14.4 21.8h0.7z\"/><path fill=\"#010202\" d=\"m76.7 90.3 13.9-21.9h-11.8c0.2-17.8-10.2-36.4-27.2-43-4.8-2.4-10.6-4.2-20.2-4.2v-12.1l-21.9 14.2 21.6 14.2 0.1-12.1c20.4 0 38.4 14.4 42.7 34 0.5 2.8 0.7 5.9 0.7 8.8h-12.6l14.3 22.1h0.4z\"/></g>";
var cursorCache = new Map();
function buildRotatedCursor(inner, rotationDeg, fallback = "alias", matrix = null) {
  const q = (Math.round(rotationDeg) % 360 + 360) % 360;
  const key = `${inner}:${q}:${fallback}:${matrix ? matrix.map(n => +n.toFixed(3)).join(",") : ""}`;
  const cached = cursorCache.get(key);
  if (cached) return cached;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">${matrix ? `<g transform="translate(16 16) matrix(${matrix[0]} ${matrix[1]} ${matrix[2]} ${matrix[3]} 0 0) translate(-16 -16)">` : ""}<g transform="rotate(${q} 16 16)">${inner}</g>${matrix ? "</g>" : ""}</svg>`;
  const url = `url("data:image/svg+xml;base64,${typeof btoa === "function" ? btoa(svg) : ""}") 16 16, ${fallback}`;
  cursorCache.set(key, url);
  return url;
}
function angleFromTransformString(t) {
  if (!t || t === "none") return 0;
  const m = t.match(/^matrix\(([^)]+)\)$/);
  if (!m) return 0;
  const p = m[1].split(",").map(s => parseFloat(s.trim()));
  if (p.length < 4 || Number.isNaN(p[0]) || Number.isNaN(p[1])) return 0;
  return Math.atan2(p[1], p[0]) * 180 / Math.PI;
}
function parseLinearMatrix(t) {
  const id = {
    a: 1,
    b: 0,
    c: 0,
    d: 1
  };
  if (!t || t === "none") return id;
  const m = t.match(/^matrix\(([^)]+)\)$/);
  if (!m) return id;
  const p = m[1].split(",").map(s => parseFloat(s.trim()));
  if (p.length < 4 || p.slice(0, 4).some(n => Number.isNaN(n))) return id;
  return {
    a: p[0],
    b: p[1],
    c: p[2],
    d: p[3]
  };
}
function isReflectedTransform(t) {
  const m = parseLinearMatrix(t);
  return m.a * m.d - m.b * m.c < 0;
}
var ROTATE_CURSOR_FALLBACK = "alias";
var RESIZE_CURSOR_FALLBACK_NWSE = "nwse-resize";
var RESIZE_CURSOR_FALLBACK_NESW = "nesw-resize";
var RESIZE_CURSOR_FALLBACK_EW = "ew-resize";
var RESIZE_CURSOR_FALLBACK_NS = "ns-resize";
var toCanvasX = (x, v) => (x - v.originX - v.positionX) / v.scale;
var toCanvasY = (y, v) => (y - v.originY - v.positionY) / v.scale;
/**
* Live view for a measurement pass, or null while the origin has no box yet.
*
* The transform is read off the DOM rather than taken from React state or the
* pan library's own state. Everything else here is a DOM read, and unprojecting
* a DOM rect with a transform captured at a different instant bakes a permanent
* error into the stored canvas-space geom — permanent because canvas space is
* never recomputed on a view change. `at` is only the fallback for the
* no-pan/zoom case, where there is no transform component to read.
*/
function readMeasureView(at, originEl) {
  if (!originEl) return null;
  const o = originEl.getBoundingClientRect();
  const component = document.querySelector(".react-transform-component");
  const live = component ? new DOMMatrix(getComputedStyle(component).transform) : null;
  return {
    scale: live?.a ?? at?.scale ?? 1,
    positionX: live?.e ?? at?.positionX ?? 0,
    positionY: live?.f ?? at?.positionY ?? 0,
    originX: o.left,
    originY: o.top
  };
}
/**
* Canvas-space geom → the overlay container's own pixels at `at`.
*
* Geoms are stored in canvas space (layout px, relative to the canvas content
* at identity pan/zoom) precisely so a pan or a zoom cannot invalidate them —
* the view only enters here, at paint.
*/
function projectGeom(g, at) {
  const s = at.scale;
  const m = parseLinearMatrix(g.transform);
  const x = Math.hypot(m.a, m.b) || 1;
  const y = Math.hypot(m.c, m.d) || 1;
  return {
    centerX: g.centerX * s + at.positionX,
    centerY: g.centerY * s + at.positionY,
    width: g.width * s * x,
    height: g.height * s * y,
    transform: g.transform === "none" ? "none" : `matrix(${m.a / x}, ${m.b / x}, ${m.c / y}, ${m.d / y}, 0, 0)`
  };
}
function topEdge(geom) {
  const e = topEdgeOfRotatedBox(geom.centerX, geom.centerY, geom.width, geom.height, geom.transform);
  return {
    anchor: {
      x: e.x,
      y: e.y
    },
    angleDeg: e.angleDeg
  };
}
/** Canvas-space slack: layout rounding leaves hairline gaps between two edges
*  that are meant to be flush. */
var LABEL_ANCHOR_EPSILON = 1;
/** One label line, in screen px — labels sharing an anchor stack by this much. */
var LABEL_STACK_STEP = 18;
/**
* True when two elements would anchor their name labels at the same point.
* Every label hangs off its element's top edge, so a child flush with its
* parent's top stacks the two labels into one unreadable string. Compared in
* canvas space, so the answer does not change with pan or zoom.
*/
function labelAnchorsCoincide(a, b) {
  const p = topEdge(a).anchor;
  const q = topEdge(b).anchor;
  return Math.abs(p.x - q.x) <= LABEL_ANCHOR_EPSILON && Math.abs(p.y - q.y) <= LABEL_ANCHOR_EPSILON;
}
function readRotatedGeom(el, view, walkCache) {
  const aabb = el.getBoundingClientRect();
  const centerX = toCanvasX(aabb.left + aabb.width / 2, view);
  const centerY = toCanvasY(aabb.top + aabb.height / 2, view);
  const aabbWidth = aabb.width / view.scale;
  const aabbHeight = aabb.height / view.scale;
  const accumulated = accumulatedLinearTransformString(el, walkCache);
  if (accumulated === "none") return {
    centerX,
    centerY,
    width: aabbWidth,
    height: aabbHeight,
    transform: "none"
  };
  const html = el;
  return {
    centerX,
    centerY,
    width: html.offsetWidth || aabbWidth,
    height: html.offsetHeight || aabbHeight,
    transform: accumulated
  };
}
/**
* A box's rect plus the canvas transform it was measured at, serialised onto the
* node. Lets the per-frame sync re-project it from the live transform without
* re-measuring, re-rendering, or reading back styles it wrote itself.
*/
function overlayBaseAttr(rect, at) {
  return `${rect.left},${rect.top},${rect.width},${rect.height},${at.scale},${at.positionX},${at.positionY}`;
}
function readElementGeom(source, view, walkCache) {
  function geomFromAabb(aabb) {
    const left = toCanvasX(aabb.left, view);
    const top = toCanvasY(aabb.top, view);
    const width = aabb.width / view.scale;
    const height = aabb.height / view.scale;
    return {
      centerX: left + width / 2,
      centerY: top + height / 2,
      width,
      height,
      transform: "none"
    };
  }
  if (!(source instanceof Element)) {
    if (source.observed.length > 1) {
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      let found = false;
      for (const o of source.observed) {
        const r = o.getBoundingClientRect();
        if (r.width <= 0 && r.height <= 0) continue;
        found = true;
        left = Math.min(left, r.left);
        top = Math.min(top, r.top);
        right = Math.max(right, r.right);
        bottom = Math.max(bottom, r.bottom);
      }
      return geomFromAabb(found ? new DOMRect(left, top, right - left, bottom - top) : new DOMRect(0, 0, 0, 0));
    }
    return readRotatedGeom(source.resolved, view, walkCache);
  }
  if (hasMultiRootContents(source)) return geomFromAabb(measureVisibleBounds(source));
  return readRotatedGeom(resolveVisibleElement$1(source), view, walkCache);
}
/**
* HoverOverlay — self-contained component that manages its own hover state.
* Receives hover updates via a ref-based setter, so the parent (Canvas) never re-renders on hover.
*/
function HoverOverlay(t0) {
  const $ = (0, import_compiler_runtime.c)(41);
  const { t } = useTranslation("editor");
  const {
    hoverSetterRef,
    store,
    selectedElementIds,
    transform,
    canvasRef,
    onSelectElement,
    onHoverElement,
    readOnly,
    geomByIdRef
  } = t0;
  const isReadOnly = readOnly ?? false;
  const [hoverElementId, setHoverElementId] = (0, import_react.useState)(null);
  const [measuredHover, setMeasuredHover] = (0, import_react.useState)(null);
  let t1;
  let t2;
  if ($[0] !== hoverSetterRef) {
    t1 = () => {
      hoverSetterRef.current = id => {
        setHoverElementId(id);
      };
      return () => {
        hoverSetterRef.current = null;
        publishHover(null, "canvas");
      };
    };
    t2 = [hoverSetterRef];
    $[0] = hoverSetterRef;
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  (0, import_react.useEffect)(t1, t2);
  const overlayMode = !!transform;
  const hoverIsActive = !!hoverElementId && !selectedElementIds.has(hoverElementId);
  let t3;
  let t4;
  if ($[3] !== canvasRef || $[4] !== hoverElementId || $[5] !== overlayMode || $[6] !== selectedElementIds) {
    t3 = () => {
      if (!hoverElementId || selectedElementIds.has(hoverElementId)) return;
      const domEl = document.querySelector(`[data-element-id="${hoverElementId}"]`);
      if (!domEl) return;
      const measure = () => {
        const view = readMeasureView(getCamera(), overlayMode ? document.querySelector("[data-overlay-container]") : canvasRef?.current ?? null);
        if (!view) return;
        setMeasuredHover({
          id: hoverElementId,
          geom: readElementGeom(domEl, view)
        });
      };
      measure();
      let raf = null;
      const schedule = () => {
        if (raf !== null) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          measure();
        });
      };
      const observer = new ResizeObserver(schedule);
      observer.observe(resolveVisibleElement$1(domEl));
      const container = document.querySelector("[data-overlay-container]");
      if (container) observer.observe(container);
      return () => {
        if (raf !== null) cancelAnimationFrame(raf);
        observer.disconnect();
      };
    };
    t4 = [hoverElementId, selectedElementIds, resolveVisibleElement$1, canvasRef, overlayMode];
    $[3] = canvasRef;
    $[4] = hoverElementId;
    $[5] = overlayMode;
    $[6] = selectedElementIds;
    $[7] = t3;
    $[8] = t4;
  } else {
    t3 = $[7];
    t4 = $[8];
  }
  (0, import_react.useLayoutEffect)(t3, t4);
  const hoverGeom = hoverIsActive && measuredHover?.id === hoverElementId ? measuredHover.geom : null;
  let t5;
  let t6;
  if ($[9] !== geomByIdRef || $[10] !== hoverElementId || $[11] !== measuredHover || $[12] !== store) {
    t5 = () => {
      if (!hoverElementId) return;
      const geom = measuredHover?.id === hoverElementId ? measuredHover.geom : null;
      const hidden = [];
      for (const rootId of getRootIds(store)) {
        const rootGeom = geomByIdRef?.current?.get(rootId);
        if (!(rootId === hoverElementId || !!geom && !!rootGeom && labelAnchorsCoincide(rootGeom, geom))) continue;
        const el = document.querySelector(`[data-root-label-id="${CSS.escape(rootId)}"]`);
        if (!el) continue;
        hidden.push({
          el,
          prev: el.style.visibility
        });
        el.style.visibility = "hidden";
      }
      if (hidden.length === 0) return;
      return () => {
        for (const h of hidden) h.el.style.visibility = h.prev;
      };
    };
    t6 = [hoverElementId, measuredHover, store, geomByIdRef];
    $[9] = geomByIdRef;
    $[10] = hoverElementId;
    $[11] = measuredHover;
    $[12] = store;
    $[13] = t5;
    $[14] = t6;
  } else {
    t5 = $[13];
    t6 = $[14];
  }
  (0, import_react.useEffect)(t5, t6);
  let t7;
  let t8;
  if ($[15] !== hoverElementId || $[16] !== selectedElementIds) {
    t7 = () => {
      if (!hoverElementId || !selectedElementIds.has(hoverElementId)) return;
      const box = document.querySelector(`[data-selection-overlay-id="${CSS.escape(hoverElementId)}"]`);
      if (!box) return;
      const prev = box.style.outlineWidth;
      box.style.outlineWidth = "2px";
      return () => {
        box.style.outlineWidth = prev;
      };
    };
    t8 = [hoverElementId, selectedElementIds];
    $[15] = hoverElementId;
    $[16] = selectedElementIds;
    $[17] = t7;
    $[18] = t8;
  } else {
    t7 = $[17];
    t8 = $[18];
  }
  (0, import_react.useEffect)(t7, t8);
  let t10;
  let t9;
  if ($[19] !== hoverElementId || $[20] !== selectedElementIds || $[21] !== store) {
    t9 = () => {
      if (!hoverElementId || selectedElementIds.has(hoverElementId)) return;
      if (!isTextOwner(store, hoverElementId)) return;
      const domEl_0 = document.querySelector(`[data-element-id="${hoverElementId}"]`);
      if (!domEl_0) return;
      const prev_0 = {
        line: domEl_0.style.textDecorationLine,
        color: domEl_0.style.textDecorationColor,
        thickness: domEl_0.style.textDecorationThickness
      };
      domEl_0.style.textDecorationLine = "underline";
      domEl_0.style.textDecorationColor = "var(--ed-canvas-selection)";
      domEl_0.style.textDecorationThickness = "2px";
      return () => {
        domEl_0.style.textDecorationLine = prev_0.line;
        domEl_0.style.textDecorationColor = prev_0.color;
        domEl_0.style.textDecorationThickness = prev_0.thickness;
      };
    };
    t10 = [hoverElementId, selectedElementIds, store];
    $[19] = hoverElementId;
    $[20] = selectedElementIds;
    $[21] = store;
    $[22] = t10;
    $[23] = t9;
  } else {
    t10 = $[22];
    t9 = $[23];
  }
  (0, import_react.useEffect)(t9, t10);
  if (!hoverElementId || selectedElementIds.has(hoverElementId) || !hoverGeom) return null;
  let t11;
  let t12;
  if (true) {
    t12 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const hoveredElement = getById(store, hoverElementId);
      if (!hoveredElement) {
        t12 = null;
        break bb0;
      }
      const view_0 = paintViewOf(overlayMode);
      const paintGeom = projectGeom(hoverGeom, view_0);
      const relativeRect = {
        left: paintGeom.centerX - paintGeom.width / 2,
        top: paintGeom.centerY - paintGeom.height / 2,
        width: paintGeom.width,
        height: paintGeom.height
      };
      const isComponent = hoveredElement?.type === "component" || !!(hoveredElement?.type === "html" && hoveredElement?.props?.["data-component"]);
      const isMissingComponent = isComponent && (hoveredElement?.type === "html" ? true : !!hoveredElement?._componentMissing);
      const hoverTone = {
        isEdit: isInsideComponentEdit(store, hoverElementId),
        isMissingComponent,
        isComponent
      };
      let t13;
      if ($[35] !== hoverElementId || $[36] !== store) {
        t13 = getParentId(store, hoverElementId) === "ROOT" && getCamera().scale <= .15;
        $[35] = hoverElementId;
        $[36] = store;
        $[37] = t13;
      } else t13 = $[37];
      const hideRootHoverLabel = t13;
      let t14;
      if ($[38] !== hoverElementId || $[39] !== store) {
        t14 = isTextOwner(store, hoverElementId);
        $[38] = hoverElementId;
        $[39] = store;
        $[40] = t14;
      } else t14 = $[40];
      const isText = t14;
      const labelText = hoveredElement?.name?.trim() || (hoveredElement?.type === "html" ? hoveredElement?.props?.["data-component"] || hoveredElement?.tag : hoveredElement?.type === "icon" ? hoveredElement?.iconName : hoveredElement?.type === "component" ? hoveredElement?.componentName : hoveredElement?.type === "capture" ? hoveredElement.original.componentName : hoveredElement?.type === "text" ? t("canvas.textNode") : t("canvas.element"));
      const renamedTag = hoveredElement?.type === "html" && hoveredElement.name?.trim() && hoveredElement.name.trim() !== hoveredElement.tag ? hoveredElement.tag : null;
      const childRects = [];
      const hoveredChildIds = hoveredElement ? store.childrenByParent.get(hoveredElement.id) ?? [] : [];
      if (hoveredElement && !isText && hoveredChildIds.length > 0) {
        const childView = readMeasureView(getCamera(), transform ? document.querySelector("[data-overlay-container]") : document.querySelector("[data-canvas-content]"));
        const childWalkCache = new Map();
        for (const childId of childView ? hoveredChildIds : []) {
          const childDom = document.querySelector(`[data-element-id="${childId}"]`);
          if (childDom) {
            const childGeom = projectGeom(readRotatedGeom(resolveVisibleElement$1(childDom), childView, childWalkCache), view_0);
            childRects.push({
              id: childId,
              rect: {
                left: childGeom.centerX - childGeom.width / 2,
                top: childGeom.centerY - childGeom.height / 2,
                width: childGeom.width,
                height: childGeom.height
              },
              transform: childGeom.transform
            });
          }
        }
      }
      t11 = <>{!isText && <div data-hover-outline-id={hoverElementId} data-ov-base={overlayBaseAttr(relativeRect, view_0)} className={cn$2("absolute pointer-events-none outline outline-[2px]", canvasOutlineClass(hoverTone))} style={{
          left: relativeRect.left,
          top: relativeRect.top,
          width: relativeRect.width,
          height: relativeRect.height,
          transform: paintGeom.transform === "none" ? void 0 : paintGeom.transform,
          transformOrigin: "center center"
        }} />}{!isText && (() => {
          const edge = topEdge(paintGeom);
          return <div data-hover-label-id={hoverElementId} data-overlay-interactive="" data-ov-base={overlayBaseAttr({
            left: edge.anchor.x,
            top: edge.anchor.y,
            width: 0,
            height: 0
          }, view_0)} style={{
            position: "absolute",
            left: edge.anchor.x,
            top: edge.anchor.y,
            width: 0,
            height: 0,
            transformOrigin: "0 0",
            transform: `rotate(${edge.angleDeg}deg)`
          }}>{<div className={cn$2("absolute flex items-center gap-1 select-none whitespace-nowrap", !isReadOnly && "pointer-events-auto")} style={{
              left: 0,
              bottom: 1,
              opacity: hideRootHoverLabel ? 0 : 1
            }} onClick={onSelectElement ? e => {
              e.stopPropagation();
              onSelectElement(hoverElementId, e.shiftKey);
            } : void 0} onMouseDown={!isReadOnly && onSelectElement ? e_0 => {
              if (e_0.button !== 0) return;
              e_0.preventDefault();
              if (!selectedElementIds.has(hoverElementId)) onSelectElement(hoverElementId, e_0.shiftKey);
              const domEl_1 = document.querySelector(`[data-element-id="${hoverElementId}"]`);
              if (domEl_1) {
                const pointerEvent = new PointerEvent("pointerdown", {
                  bubbles: true,
                  cancelable: true,
                  clientX: e_0.clientX,
                  clientY: e_0.clientY,
                  pointerId: 1,
                  pointerType: "mouse",
                  isPrimary: true,
                  button: 0,
                  buttons: 1
                });
                domEl_1.dispatchEvent(pointerEvent);
              }
            } : void 0} onMouseEnter={onHoverElement ? () => onHoverElement(hoverElementId) : void 0}>{renamedTag && <span className="px-1 py-px rounded text-[10px] font-medium leading-none bg-ed-selected text-ed-selected-foreground">{renamedTag}</span>}{<Text$4 size="xs" className={cn$2(canvasLabelClass(hoverTone))}>{labelText}</Text$4>}</div>}</div>;
        })()}{childRects.map(t15 => {
          const {
            id: id_0,
            rect,
            transform: childTransform
          } = t15;
          return <div key={`hover-child-${id_0}`} className="absolute pointer-events-none" data-hover-child-id={id_0} data-ov-base={overlayBaseAttr(rect, view_0)} style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            outline: "1px dashed",
            outlineColor: canvasOutlineColor(hoverTone),
            outlineOffset: "-1px",
            transform: childTransform === "none" ? void 0 : childTransform,
            transformOrigin: "center center"
          }} />;
        })}</>;
    }
    $[24] = hoverElementId;
    $[25] = hoverGeom;
    $[26] = isReadOnly;
    $[27] = onHoverElement;
    $[28] = onSelectElement;
    $[29] = overlayMode;
    $[30] = selectedElementIds;
    $[31] = store;
    $[32] = transform;
    $[33] = t11;
    $[34] = t12;
  } else {
    t11 = $[33];
    t12 = $[34];
  }
  if (t12 !== Symbol.for("react.early_return_sentinel")) return t12;
  return t11;
}
function SelectionOverlay({
  store,
  selectedElementIds,
  overlayMode,
  noInteract,
  geomByIdRef,
  geomVersion,
  resizePreviewRectRef,
  handleResizeStart,
  onSelectElement,
  onUpdateElementStyles,
  onUpdateElementProps
}) {
  const { t } = useTranslation("editor");
  const prevBodyCursorRef = (0, import_react.useRef)(null);
  const lastSetCursorRef = (0, import_react.useRef)("");
  const rotateRafRef = (0, import_react.useRef)(null);
  const lastRotateEventRef = (0, import_react.useRef)(null);
  const setBodyCursor = cursor => {
    if (prevBodyCursorRef.current === null) prevBodyCursorRef.current = document.body.style.cursor;
    if (lastSetCursorRef.current === cursor) return;
    lastSetCursorRef.current = cursor;
    document.body.style.cursor = cursor;
  };
  const restoreBodyCursor = () => {
    if (prevBodyCursorRef.current !== null) {
      document.body.style.cursor = prevBodyCursorRef.current;
      prevBodyCursorRef.current = null;
      lastSetCursorRef.current = "";
    }
  };
  (0, import_react.useEffect)(() => {
    const els = [];
    for (const id of selectedElementIds) {
      if (!isTextOwner(store, id)) continue;
      const el = document.querySelector(`[data-element-id="${id}"]`);
      if (!el) continue;
      els.push({
        el,
        prev: {
          line: el.style.textDecorationLine,
          color: el.style.textDecorationColor,
          thickness: el.style.textDecorationThickness
        }
      });
      el.style.textDecorationLine = "underline";
      el.style.textDecorationColor = "var(--ed-canvas-selection)";
      el.style.textDecorationThickness = "1px";
    }
    if (els.length === 0) return;
    return () => {
      for (const {
        el: el_0,
        prev
      } of els) {
        el_0.style.textDecorationLine = prev.line;
        el_0.style.textDecorationColor = prev.color;
        el_0.style.textDecorationThickness = prev.thickness;
      }
    };
  }, [selectedElementIds, store]);
  const applyRotateFromLastEvent = () => {
    rotateRafRef.current = null;
    const drag = rotateDrag;
    const e = lastRotateEventRef.current;
    if (!drag || !e) return;
    const angle = Math.atan2(e.clientY - drag.centerY, e.clientX - drag.centerX);
    let next = drag.startRotation + (angle - drag.startPointerAngle) * 180 / Math.PI;
    if (e.shiftKey) next = Math.round(next / 15) * 15;else next = +next.toFixed(2);
    next = ((next + 180) % 360 + 360) % 360 - 180;
    if (!e.shiftKey) next = +next.toFixed(2);
    const composed = withTransformRotation(drag.transformParts, next);
    writeRotateDrag({
      ...drag,
      latestTransform: composed
    });
    drag.domElement.style.transform = composed || "";
    setBodyCursor(buildRotatedCursor(ROTATE_INNER, drag.cornerBaseDeg + next, ROTATE_CURSOR_FALLBACK));
    const newOwn = transformLinearMatrix(composed);
    const newAcc = drag.ancestorMatrix.multiply(newOwn);
    const newTransform = newAcc.a === 1 && newAcc.b === 0 && newAcc.c === 0 && newAcc.d === 1 ? "none" : `matrix(${newAcc.a}, ${newAcc.b}, ${newAcc.c}, ${newAcc.d}, 0, 0)`;
    const old = geomByIdRef.current.get(drag.id);
    if (old) {
      const rect = drag.domElement.getBoundingClientRect();
      const zoom = getCamera().scale || 1;
      const painted = projectGeom({
        ...old,
        transform: newTransform,
        centerX: drag.startGeomCenter.x + (rect.x + rect.width / 2 - drag.startScreenCenter.x) / zoom,
        centerY: drag.startGeomCenter.y + (rect.y + rect.height / 2 - drag.startScreenCenter.y) / zoom
      }, paintViewOf(overlayMode));
      if (drag.overlayElement) Object.assign(drag.overlayElement.style, {
        left: `${painted.centerX - painted.width / 2}px`,
        top: `${painted.centerY - painted.height / 2}px`,
        width: `${painted.width}px`,
        height: `${painted.height}px`,
        transform: painted.transform === "none" ? "" : painted.transform
      });
      if (drag.labelElement) {
        const edge = topEdge(painted);
        drag.labelElement.style.left = `${edge.anchor.x}px`;
        drag.labelElement.style.top = `${edge.anchor.y}px`;
        drag.labelElement.style.transform = `rotate(${edge.angleDeg}deg)`;
      }
    }
  };
  const handleRotateMove = e_0 => {
    if (!rotateDrag) return;
    lastRotateEventRef.current = {
      clientX: e_0.clientX,
      clientY: e_0.clientY,
      shiftKey: e_0.shiftKey
    };
    if (rotateRafRef.current !== null) return;
    rotateRafRef.current = requestAnimationFrame(applyRotateFromLastEvent);
  };
  const handleRotateEnd = () => {
    if (rotateRafRef.current !== null) {
      cancelAnimationFrame(rotateRafRef.current);
      rotateRafRef.current = null;
    }
    if (rotateDrag && lastRotateEventRef.current) applyRotateFromLastEvent();
    const drag_0 = rotateDrag;
    if (drag_0 && drag_0.latestTransform !== drag_0.baseTransform) {
      const newStyles = {
        ...drag_0.baseStyles
      };
      if (drag_0.latestTransform) newStyles.transform = drag_0.latestTransform;else delete newStyles.transform;
      onUpdateElementStyles?.(drag_0.id, newStyles);
    }
    writeRotateDrag(null);
    lastRotateEventRef.current = null;
    restoreBodyCursor();
    if (rotateMoveListener) {
      window.removeEventListener("pointermove", rotateMoveListener);
      rotateMoveListener = null;
    }
    if (rotateEndListener) {
      window.removeEventListener("pointerup", rotateEndListener);
      rotateEndListener = null;
    }
  };
  const commitRotateOnUnmount = (0, import_react.useEffectEvent)(() => {
    if (!rotateDrag) return;
    handleRotateEnd();
  });
  (0, import_react.useEffect)(() => {
    return () => commitRotateOnUnmount();
  }, []);
  const handleRotateStart = (e_1, elementId, corner) => {
    if (noInteract) return;
    e_1.preventDefault();
    e_1.stopPropagation();
    const element = getById(store, elementId);
    if (!element) return;
    const geom = geomByIdRef.current.get(elementId);
    if (!geom) return;
    const styles = element.styles || {};
    const parsed = parseTransformControls(styles.transform);
    const rawDomElement = document.querySelector(`[data-element-id="${elementId}"]`);
    if (!rawDomElement) return;
    const domElement = resolveVisibleElement$1(rawDomElement);
    const rect_0 = domElement.getBoundingClientRect();
    const startScreenCenter = {
      x: rect_0.x + rect_0.width / 2,
      y: rect_0.y + rect_0.height / 2
    };
    const cornerBaseDeg = ROTATE_CORNER_BASE[corner];
    const oldOwnMatrix = transformLinearMatrix(getComputedStyle(domElement).transform);
    const oldAccMatrix = geom.transform && geom.transform !== "none" ? new DOMMatrix(geom.transform) : new DOMMatrix();
    const ancestorMatrix = oldAccMatrix.multiply(oldOwnMatrix.inverse());
    const [ox, oy] = getComputedStyle(domElement).transformOrigin.split(" ").map(parseFloat);
    const dx = ox - domElement.offsetWidth / 2,
      dy = oy - domElement.offsetHeight / 2;
    const zoom_0 = getCamera().scale || 1;
    const centerX = startScreenCenter.x + (oldAccMatrix.a * dx + oldAccMatrix.c * dy) * zoom_0;
    const centerY = startScreenCenter.y + (oldAccMatrix.b * dx + oldAccMatrix.d * dy) * zoom_0;
    writeRotateDrag({
      id: elementId,
      centerX,
      centerY,
      startPointerAngle: Math.atan2(e_1.clientY - centerY, e_1.clientX - centerX),
      startScreenCenter,
      startGeomCenter: {
        x: geom.centerX,
        y: geom.centerY
      },
      startRotation: parsed.rotate,
      transformParts: parsed,
      baseStyles: styles,
      baseTransform: styles.transform || "",
      latestTransform: styles.transform || "",
      domElement,
      overlayElement: document.querySelector(`[data-selection-overlay-id="${CSS.escape(elementId)}"]`),
      labelElement: document.querySelector(`[data-selection-label-id="${CSS.escape(elementId)}"]`),
      cornerBaseDeg,
      ancestorMatrix
    });
    setBodyCursor(buildRotatedCursor(ROTATE_INNER, cornerBaseDeg + parsed.rotate, ROTATE_CURSOR_FALLBACK));
    rotateMoveListener = handleRotateMove;
    rotateEndListener = handleRotateEnd;
    window.addEventListener("pointermove", handleRotateMove);
    window.addEventListener("pointerup", handleRotateEnd);
  };
  const beginResizeBodyCursor = cursor_0 => {
    setBodyCursor(cursor_0);
    const clear = () => {
      restoreBodyCursor();
      window.removeEventListener("mouseup", clear);
    };
    window.addEventListener("mouseup", clear);
  };
  const handleLabelMouseDown = (e_2, elementId_0) => {
    if (noInteract) return;
    if (e_2.button !== 0) return;
    e_2.preventDefault();
    if (!selectedElementIds.has(elementId_0)) onSelectElement?.(elementId_0, e_2.shiftKey);
    const domEl = document.querySelector(`[data-element-id="${elementId_0}"]`);
    if (domEl) {
      const pointerEvent = new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        clientX: e_2.clientX,
        clientY: e_2.clientY,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        button: 0,
        buttons: 1
      });
      domEl.dispatchEvent(pointerEvent);
    }
  };
  if (selectedElementIds.size === 0) return null;
  const livePreview = resizePreviewRectRef?.current;
  const selectionRects = new Map();
  for (const id_0 of selectedElementIds) {
    const geom_0 = geomByIdRef.current.get(id_0);
    if (geom_0) selectionRects.set(id_0, geom_0);
  }
  const paintView = paintViewOf(overlayMode);
  const overlays = [];
  const isSingleSelection = selectedElementIds.size === 1;
  for (const selectedElementId of selectedElementIds) {
    const selectedElement = getById(store, selectedElementId);
    if (!selectedElement) continue;
    const stored = selectionRects.get(selectedElementId);
    if (!stored) continue;
    const geom_1 = projectGeom(stored, paintView);
    const isLivePreview = !!livePreview && livePreview.id === selectedElementId;
    const relativeRect = isLivePreview ? {
      left: livePreview.left,
      top: livePreview.top,
      width: livePreview.width,
      height: livePreview.height
    } : {
      left: geom_1.centerX - geom_1.width / 2,
      top: geom_1.centerY - geom_1.height / 2,
      width: geom_1.width,
      height: geom_1.height
    };
    const isComponent = selectedElement.type === "component" || !!(selectedElement.type === "html" && selectedElement?.props?.["data-component"]);
    const isMissingComponent = isComponent && (selectedElement.type === "html" ? true : !!selectedElement?._componentMissing);
    const selTone = {
      isEdit: isInsideComponentEdit(store, selectedElementId),
      isMissingComponent,
      isComponent
    };
    const isText = isTextOwner(store, selectedElementId);
    overlays.push(<div key={selectedElementId} data-selection-overlay-id={selectedElementId} data-ov-base={overlayBaseAttr(relativeRect, paintView)} data-overlay-interactive="" className={cn$2("absolute pointer-events-none outline-[1px]", canvasOutlineClass(selTone))} style={{
      left: relativeRect.left,
      top: relativeRect.top,
      width: relativeRect.width,
      height: relativeRect.height,
      transform: geom_1.transform === "none" ? void 0 : geom_1.transform,
      transformOrigin: "center center"
    }}>{(() => {
        const screenAngle = angleFromTransformString(geom_1.transform);
        const reflected = isReflectedTransform(geom_1.transform);
        const m = parseLinearMatrix(geom_1.transform);
        const lenX = Math.hypot(m.a, m.b) || 1,
          lenY = Math.hypot(m.c, m.d) || 1;
        const normM = [m.a / lenX, m.b / lenX, m.c / lenY, m.d / lenY];
        const rotateCursor = corner_0 => buildRotatedCursor(ROTATE_INNER, ROTATE_CORNER_BASE[corner_0], ROTATE_CURSOR_FALLBACK, normM);
        const resizeCursor = diag => {
          return (reflected ? diag === "nwse" ? "nesw" : "nwse" : diag) === "nwse" ? buildRotatedCursor(RESIZE_NWSE_INNER, screenAngle, RESIZE_CURSOR_FALLBACK_NWSE) : buildRotatedCursor(RESIZE_NESW_INNER, screenAngle, RESIZE_CURSOR_FALLBACK_NESW);
        };
        const edgeCursor = axis => axis === "ew" ? buildRotatedCursor(RESIZE_NWSE_INNER, screenAngle - 45, RESIZE_CURSOR_FALLBACK_EW) : buildRotatedCursor(RESIZE_NWSE_INNER, screenAngle + 45, RESIZE_CURSOR_FALLBACK_NS);
        return <>{!noInteract && <>{<div className="absolute pointer-events-auto" style={{
              left: -18,
              top: -18,
              width: 14,
              height: 14,
              cursor: rotateCursor("nw")
            }} data-rotate-handle="nw" onPointerDown={e_3 => handleRotateStart(e_3, selectedElementId, "nw")} />}{<div className="absolute pointer-events-auto" style={{
              right: -18,
              top: -18,
              width: 14,
              height: 14,
              cursor: rotateCursor("ne")
            }} data-rotate-handle="ne" onPointerDown={e_4 => handleRotateStart(e_4, selectedElementId, "ne")} />}{<div className="absolute pointer-events-auto" style={{
              left: -18,
              bottom: -18,
              width: 14,
              height: 14,
              cursor: rotateCursor("sw")
            }} data-rotate-handle="sw" onPointerDown={e_5 => handleRotateStart(e_5, selectedElementId, "sw")} />}{<div className="absolute pointer-events-auto" style={{
              right: -18,
              bottom: -18,
              width: 14,
              height: 14,
              cursor: rotateCursor("se")
            }} data-rotate-handle="se" onPointerDown={e_6 => handleRotateStart(e_6, selectedElementId, "se")} />}</>}{<div className={cn$2("absolute", !noInteract && "pointer-events-auto")} style={{
            left: 6,
            right: 6,
            top: -3,
            height: 6,
            cursor: edgeCursor("ns")
          }} data-resize-handle="n" onMouseDown={e_7 => {
            beginResizeBodyCursor(edgeCursor("ns"));
            handleResizeStart(e_7, selectedElementId, "n", selectedElement);
          }} />}{<div className={cn$2("absolute", !noInteract && "pointer-events-auto")} style={{
            left: 6,
            right: 6,
            bottom: -3,
            height: 6,
            cursor: edgeCursor("ns")
          }} data-resize-handle="s" onMouseDown={e_8 => {
            beginResizeBodyCursor(edgeCursor("ns"));
            handleResizeStart(e_8, selectedElementId, "s", selectedElement);
          }} />}{<div className={cn$2("absolute", !noInteract && "pointer-events-auto")} style={{
            top: 6,
            bottom: 6,
            left: -3,
            width: 6,
            cursor: edgeCursor("ew")
          }} data-resize-handle="w" onMouseDown={e_9 => {
            beginResizeBodyCursor(edgeCursor("ew"));
            handleResizeStart(e_9, selectedElementId, "w", selectedElement);
          }} />}{<div className={cn$2("absolute", !noInteract && "pointer-events-auto")} style={{
            top: 6,
            bottom: 6,
            right: -3,
            width: 6,
            cursor: edgeCursor("ew")
          }} data-resize-handle="e" onMouseDown={e_10 => {
            beginResizeBodyCursor(edgeCursor("ew"));
            handleResizeStart(e_10, selectedElementId, "e", selectedElement);
          }} />}{<div className={cn$2("absolute w-2 h-2 flex items-center justify-center", !noInteract && "pointer-events-auto")} style={{
            left: -4,
            top: -4,
            cursor: resizeCursor("nwse")
          }} data-resize-handle="nw" onMouseDown={e_11 => {
            beginResizeBodyCursor(resizeCursor("nwse"));
            handleResizeStart(e_11, selectedElementId, "nw", selectedElement);
          }}>{<div className="size-1.5 rounded-[1px] border bg-white" style={{
              borderColor: canvasOutlineColor(selTone)
            }} />}</div>}{<div className={cn$2("absolute w-2 h-2 flex items-center justify-center", !noInteract && "pointer-events-auto")} style={{
            right: -4,
            top: -4,
            cursor: resizeCursor("nesw")
          }} data-resize-handle="ne" onMouseDown={e_12 => {
            beginResizeBodyCursor(resizeCursor("nesw"));
            handleResizeStart(e_12, selectedElementId, "ne", selectedElement);
          }}>{<div className="size-1.5 rounded-[1px] border bg-white" style={{
              borderColor: canvasOutlineColor(selTone)
            }} />}</div>}{<div className={cn$2("absolute w-2 h-2 flex items-center justify-center", !noInteract && "pointer-events-auto")} style={{
            left: -4,
            bottom: -4,
            cursor: resizeCursor("nesw")
          }} data-resize-handle="sw" onMouseDown={e_13 => {
            beginResizeBodyCursor(resizeCursor("nesw"));
            handleResizeStart(e_13, selectedElementId, "sw", selectedElement);
          }}>{<div className="size-1.5 rounded-[1px] border bg-white" style={{
              borderColor: canvasOutlineColor(selTone)
            }} />}</div>}{<div className={cn$2("absolute w-2 h-2 flex items-center justify-center", !noInteract && "pointer-events-auto")} style={{
            right: -4,
            bottom: -4,
            cursor: resizeCursor("nwse")
          }} data-resize-handle="se" onMouseDown={e_14 => {
            beginResizeBodyCursor(resizeCursor("nwse"));
            handleResizeStart(e_14, selectedElementId, "se", selectedElement);
          }}>{<div className="size-1.5 rounded-[1px] border bg-white" style={{
              borderColor: canvasOutlineColor(selTone)
            }} />}</div>}</>;
      })()}</div>);
    if (isSingleSelection && !isText) {
      const edge_0 = isLivePreview ? (() => {
        const e_15 = topEdgeOfRotatedBox(livePreview.left + livePreview.width / 2, livePreview.top + livePreview.height / 2, livePreview.width, livePreview.height, geom_1.transform);
        return {
          anchor: {
            x: e_15.x,
            y: e_15.y
          },
          angleDeg: e_15.angleDeg
        };
      })() : topEdge(geom_1);
      const renamedTag = selectedElement.type === "html" && selectedElement.name?.trim() && selectedElement.name.trim() !== selectedElement.tag ? selectedElement.tag : null;
      const labelText = selectedElement.name?.trim() || (selectedElement.type === "html" ? selectedElement?.props?.["data-component"] || selectedElement.tag : selectedElement.type === "icon" ? selectedElement.iconName : selectedElement.type === "component" ? selectedElement.componentName : selectedElement.type === "capture" ? selectedElement.original.componentName : selectedElement.type === "text" ? t("canvas.textNode") : t("canvas.element"));
      overlays.push(<div key={`label-${selectedElementId}`} data-selection-label-id={selectedElementId} data-overlay-interactive="" data-ov-base={overlayBaseAttr({
        left: edge_0.anchor.x,
        top: edge_0.anchor.y,
        width: 0,
        height: 0
      }, paintView)} style={{
        position: "absolute",
        left: edge_0.anchor.x,
        top: edge_0.anchor.y,
        width: 0,
        height: 0,
        transformOrigin: "0 0",
        transform: `rotate(${edge_0.angleDeg}deg)`
      }}>{<div className={cn$2("absolute flex items-center gap-1 select-none whitespace-nowrap", !noInteract && "pointer-events-auto")} style={{
          left: 0,
          bottom: 1
        }} onMouseDown={e_16 => handleLabelMouseDown(e_16, selectedElementId)}>{renamedTag && <span className="px-1 py-px rounded text-[10px] font-medium leading-none bg-ed-selected text-ed-selected-foreground">{renamedTag}</span>}{<Text$4 size="xs" className={cn$2(canvasLabelClass(selTone))}>{labelText}</Text$4>}{selectedElement.type === "html" && selectedElement.tag === "iframe" && !noInteract && <Tooltip>{<TooltipTrigger asChild={true}>{<button className={cn$2("flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium", selectedElement.props?.["data-interaction-enabled"] !== "true" ? "bg-ed-muted text-ed-muted-foreground hover:bg-ed-accent" : "bg-ed-canvas-selection text-white hover:bg-ed-canvas-selection/90")} onClick={e_17 => {
                e_17.stopPropagation();
                e_17.preventDefault();
                const currentEnabled = selectedElement.props?.["data-interaction-enabled"] === "true";
                onUpdateElementProps?.(selectedElementId, {
                  "data-interaction-enabled": currentEnabled ? "false" : "true"
                });
              }} onMouseDown={e_18 => e_18.stopPropagation()}>{(0, import_jsx_runtime.jsx)(m$6, {
                  size: 10,
                  weight: "bold"
                })}</button>}</TooltipTrigger>}{<TooltipContent side="top">{t(selectedElement.props?.["data-interaction-enabled"] !== "true" ? "canvas.interactionDisabled" : "canvas.interactionEnabled")}</TooltipContent>}</Tooltip>}</div>}</div>);
    }
  }
  if (isSingleSelection) {
    const selectedId = Array.from(selectedElementIds)[0];
    const parentKey = getParentId(store, selectedId);
    const parentId = parentKey === "ROOT" || parentKey === null ? null : parentKey;
    if (parentId) {
      const storedParent = geomByIdRef.current.get(parentId);
      const parentGeom = storedParent ? projectGeom(storedParent, paintView) : null;
      const parentIsComponent = getById(store, parentId)?.type === "component";
      const parentIsEdit = isInsideComponentEdit(store, parentId);
      if (parentGeom) {
        const parentRect = {
          left: parentGeom.centerX - parentGeom.width / 2,
          top: parentGeom.centerY - parentGeom.height / 2,
          width: parentGeom.width,
          height: parentGeom.height
        };
        overlays.push(<div key={`parent-${parentId}`} className="absolute pointer-events-none" data-parent-outline-id={parentId} data-ov-base={overlayBaseAttr(parentRect, paintView)} style={{
          ...parentRect,
          outline: "1px dashed",
          outlineColor: canvasOutlineColor({
            isEdit: parentIsEdit,
            isMissingComponent: false,
            isComponent: !!parentIsComponent
          }),
          outlineOffset: "-1px",
          transform: parentGeom.transform === "none" ? void 0 : parentGeom.transform,
          transformOrigin: "center center"
        }} />);
      }
    }
  }
  return <>{overlays}</>;
}
function RootLabel(t0) {
  const $ = (0, import_compiler_runtime.c)(36);
  const {
    rootId,
    geom,
    overlayMode,
    hideLabel,
    labelText,
    noInteract,
    isSelected,
    stackIndex,
    onSelectElement,
    onHoverElement
  } = t0;
  let edge;
  let t1;
  let t2;
  if ($[0] !== geom || $[1] !== overlayMode) {
    const paintView = paintViewOf(overlayMode);
    edge = topEdge(projectGeom(geom, paintView));
    t1 = "";
    t2 = overlayBaseAttr({
      left: edge.anchor.x,
      top: edge.anchor.y,
      width: 0,
      height: 0
    }, paintView);
    $[0] = geom;
    $[1] = overlayMode;
    $[2] = edge;
    $[3] = t1;
    $[4] = t2;
  } else {
    edge = $[2];
    t1 = $[3];
    t2 = $[4];
  }
  const t3 = `rotate(${edge.angleDeg}deg)`;
  let t4;
  if ($[5] !== edge.anchor.x || $[6] !== edge.anchor.y || $[7] !== t3) {
    t4 = {
      position: "absolute",
      left: edge.anchor.x,
      top: edge.anchor.y,
      width: 0,
      height: 0,
      transformOrigin: "0 0",
      transform: t3
    };
    $[5] = edge.anchor.x;
    $[6] = edge.anchor.y;
    $[7] = t3;
    $[8] = t4;
  } else t4 = $[8];
  const t5 = !noInteract && "pointer-events-auto cursor-default";
  let t6;
  if ($[9] !== t5) {
    t6 = cn$2("absolute flex items-center gap-1 select-none whitespace-nowrap", t5);
    $[9] = t5;
    $[10] = t6;
  } else t6 = $[10];
  const t7 = 1 + stackIndex * LABEL_STACK_STEP;
  const t8 = hideLabel ? 0 : 1;
  let t9;
  if ($[11] !== t7 || $[12] !== t8) {
    t9 = {
      left: 0,
      bottom: t7,
      opacity: t8
    };
    $[11] = t7;
    $[12] = t8;
    $[13] = t9;
  } else t9 = $[13];
  let t10;
  if ($[14] !== isSelected || $[15] !== noInteract || $[16] !== onSelectElement || $[17] !== rootId) {
    t10 = e => {
      if (noInteract) return;
      if (e.button !== 0) return;
      e.preventDefault();
      if (!isSelected) onSelectElement?.(rootId, e.shiftKey);
      const domEl = document.querySelector(`[data-element-id="${rootId}"]`);
      if (domEl) {
        const pointerEvent = new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          clientX: e.clientX,
          clientY: e.clientY,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          buttons: 1
        });
        domEl.dispatchEvent(pointerEvent);
      }
    };
    $[14] = isSelected;
    $[15] = noInteract;
    $[16] = onSelectElement;
    $[17] = rootId;
    $[18] = t10;
  } else t10 = $[18];
  let t11;
  if ($[19] !== onHoverElement || $[20] !== rootId) {
    t11 = onHoverElement ? () => onHoverElement(rootId) : void 0;
    $[19] = onHoverElement;
    $[20] = rootId;
    $[21] = t11;
  } else t11 = $[21];
  let t12;
  if ($[22] !== labelText) {
    t12 = <Text$4 size="xs" className="text-ed-muted-foreground">{labelText}</Text$4>;
    $[22] = labelText;
    $[23] = t12;
  } else t12 = $[23];
  let t13;
  if ($[24] !== rootId || $[25] !== t10 || $[26] !== t11 || $[27] !== t12 || $[28] !== t6 || $[29] !== t9) {
    t13 = <div data-root-label-id={rootId} className={t6} style={t9} onMouseDown={t10} onMouseEnter={t11}>{t12}</div>;
    $[24] = rootId;
    $[25] = t10;
    $[26] = t11;
    $[27] = t12;
    $[28] = t6;
    $[29] = t9;
    $[30] = t13;
  } else t13 = $[30];
  let t14;
  if ($[31] !== t1 || $[32] !== t13 || $[33] !== t2 || $[34] !== t4) {
    t14 = <div data-overlay-interactive={t1} data-ov-base={t2} style={t4}>{t13}</div>;
    $[31] = t1;
    $[32] = t13;
    $[33] = t2;
    $[34] = t4;
    $[35] = t14;
  } else t14 = $[35];
  return t14;
}
/**
* Always-on name label above every top-level root (LUN-96).
*
* Own component so hover (HoverOverlay) and geom-version bumps in Canvas do
* not rebuild every label — the compiler can skip this tree when its props
* are unchanged. Hidden while the root IS the single selection (the richer
* selection label renders in its place) and, imperatively, while it's hovered.
*/
function RootLabels({
  store,
  selectedElementIds,
  isResizing,
  overlayMode,
  noInteract,
  geomByIdRef,
  geomVersion,
  onSelectElement,
  onHoverElement
}) {
  const { t } = useTranslation("editor");
  if (isResizing) return null;
  const hideLabel = getCamera().scale <= ROOT_LABEL_MIN_SCALE;
  const isSingleSelection = selectedElementIds.size === 1;
  const selectedId = isSingleSelection ? Array.from(selectedElementIds)[0] : null;
  const selectionGeom = selectedId ? geomByIdRef.current.get(selectedId) ?? null : null;
  const labels = [];
  const placed = [];
  for (const rootId of getRootIds(store)) {
    if (isTextOwner(store, rootId)) continue;
    if (isSingleSelection && selectedElementIds.has(rootId)) continue;
    const stored = geomByIdRef.current.get(rootId);
    if (!stored) continue;
    if (selectionGeom && labelAnchorsCoincide(stored, selectionGeom)) continue;
    const element = getById(store, rootId);
    if (!element) continue;
    const labelText = element.name?.trim() || (element.type === "html" ? element?.props?.["data-component"] || element.tag : element.type === "icon" ? element.iconName : element.type === "component" ? element.componentName : t("canvas.element"));
    const stackIndex = placed.filter(g => labelAnchorsCoincide(g, stored)).length;
    placed.push(stored);
    labels.push(<RootLabel key={rootId} stackIndex={stackIndex} rootId={rootId} geom={stored} overlayMode={overlayMode} hideLabel={hideLabel} labelText={labelText} noInteract={noInteract} isSelected={selectedElementIds.has(rootId)} onSelectElement={onSelectElement} onHoverElement={onHoverElement} />);
  }
  return <>{labels}</>;
}
/** Canvas-space AABB of a locked element — pan/zoom cannot invalidate it. */
function measureLockBox(elementId) {
  const overlayEl = document.querySelector("[data-overlay-container]");
  const domEl = document.querySelector(`[data-element-id="${CSS.escape(elementId)}"]`);
  if (!overlayEl || !domEl) return null;
  const origin = overlayEl.getBoundingClientRect();
  const rect = measureVisibleBounds(domEl);
  if (rect.width <= 0 && rect.height <= 0) return null;
  const {
    scale,
    positionX,
    positionY
  } = getCamera();
  return {
    left: (rect.left - origin.left - positionX) / scale,
    top: (rect.top - origin.top - positionY) / scale,
    width: rect.width / scale,
    height: rect.height / scale
  };
}
function projectLockBox(box, at) {
  return {
    left: box.left * at.scale + at.positionX,
    top: box.top * at.scale + at.positionY,
    width: box.width * at.scale,
    height: box.height * at.scale
  };
}
function lockOverlayBox(elementId, geomById, view) {
  const stored = geomById?.get(elementId);
  if (stored && (stored.width > 0 || stored.height > 0)) {
    const geom = projectGeom(stored, view);
    return {
      box: {
        left: geom.centerX - geom.width / 2,
        top: geom.centerY - geom.height / 2,
        width: geom.width,
        height: geom.height
      },
      transform: geom.transform
    };
  }
  const fallback = measureLockBox(elementId);
  if (!fallback) return null;
  return {
    box: projectLockBox(fallback, view),
    transform: "none"
  };
}
/**
* Claim overlays sit outside the pan/zoom CSS transform (same layer as selection).
* Measured in canvas space so a view change cannot stale them; `data-ov-base` lets
* `syncOverlayToLiveTransform` re-project on every camera tick without a React render.
*
* Size comes from the observer-backed geom store. `geomVersion` forces a re-read
* when a claimed node resizes — streaming children into a shell used to leave
* the box stuck at the last React-render measurement until a later store/lock
* update. Fall back to a live DOM read if the node is not tracked yet.
*
* Only the outermost locked node per subtree is drawn. Nested claims used to
* stack fills and badges on every child; the lock still applies to descendants,
* but the indicator is one rim + one chip.
*/
var HALFTONE_CELLS = [{
  x: 2,
  y: 2,
  delay: 0
}, {
  x: 6,
  y: 2,
  delay: .12
}, {
  x: 10,
  y: 2,
  delay: .24
}, {
  x: 2,
  y: 6,
  delay: .12
}, {
  x: 6,
  y: 6,
  delay: .24
}, {
  x: 10,
  y: 6,
  delay: .36
}, {
  x: 2,
  y: 10,
  delay: .24
}, {
  x: 6,
  y: 10,
  delay: .36
}, {
  x: 10,
  y: 10,
  delay: .48
}];
/** Chat colors are saturated; mix them toward a chrome token so the rim reads as UI, not content. */
function claimTone(color, chroma, toward = "var(--ed-muted-foreground)") {
  return `color-mix(in oklab, ${color} ${chroma}%, ${toward} ${100 - chroma}%)`;
}
/** The chip is a scrim over arbitrary user content, so it stays dark in both themes. */
var CLAIM_CHIP_BACKGROUND = "rgba(12, 14, 16, 0.62)";
var CLAIM_CHIP_FOREGROUND = "rgba(248, 250, 252, 0.88)";
function AiLockOverlays({
  elementLocks,
  store,
  geomByIdRef,
  geomVersion
}) {
  const { t } = useTranslation("editor");
  if (elementLocks.size === 0) return null;
  const view = getCamera();
  const lockedIds = new Set(elementLocks.keys());
  const overlays = [];
  for (const [elementId, color] of elementLocks) {
    if (!isOutermostLock(store, elementId, lockedIds)) continue;
    const measured = lockOverlayBox(elementId, geomByIdRef.current, view);
    if (!measured) continue;
    const {
      box,
      transform
    } = measured;
    const rim = claimTone(color, 32);
    const sweep = claimTone(color, 46, "var(--ed-border)");
    const sheen = claimTone(color, 28, "var(--ed-card)");
    overlays.push(<Tooltip key={`lock-${elementId}`} content={t("shell.beingEditedByAssistant")}>{<div data-ai-lock-id={elementId} data-ov-base={overlayBaseAttr(box, view)} aria-label={t("shell.beingEditedByAssistant")} style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        boxSizing: "border-box",
        overflow: "hidden",
        borderRadius: 4,
        pointerEvents: "none",
        zIndex: 50,
        transform: transform === "none" ? void 0 : transform,
        transformOrigin: "center center"
      }}>{<div aria-hidden={true} style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none"
        }}>{<div style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(105deg, transparent 28%, ${sheen} 50%, transparent 72%)`,
            opacity: .22,
            animation: "bingo-claim-shimmer 1.7s ease-in-out infinite",
            willChange: "transform"
          }} />}</div>}{<div style={{
          position: "absolute",
          inset: 0,
          borderRadius: 4,
          boxShadow: `inset 0 0 0 1px ${rim}`,
          pointerEvents: "auto",
          cursor: "not-allowed"
        }} />}{<div style={{
          position: "absolute",
          top: 5,
          right: 5,
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: 18,
          padding: "0 7px 0 6px",
          borderRadius: 3,
          background: CLAIM_CHIP_BACKGROUND,
          boxShadow: `inset 0 0 0 1px ${rim}`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          pointerEvents: "auto",
          cursor: "not-allowed"
        }}>{<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden={true}>{HALFTONE_CELLS.map(({
              x,
              y,
              delay
            }) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.05" fill={sweep} style={{
              animation: `bingo-halftone-cell 1.8s ease-in-out ${delay}s infinite`
            }} />)}</svg>}{<span style={{
            fontSize: 9,
            fontWeight: 500,
            color: CLAIM_CHIP_FOREGROUND,
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}>AI</span>}</div>}</div>}</Tooltip>);
  }
  return <>{<style>{`
        @keyframes bingo-halftone-cell {
          0%, 100% { opacity: 0.22; }
          50% { opacity: 0.95; }
        }
        @keyframes bingo-claim-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>}{overlays}</>;
}
function useOverlayGeoms(t0) {
  const $ = (0, import_compiler_runtime.c)(57);
  const {
    canvasRef,
    store,
    selectedElementIds,
    componentsRevision,
    isDragging,
    isResizing
  } = t0;
  const dragActive = isDragging ?? false;
  const resizeActive = isResizing ?? false;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = new Map();
    $[0] = t1;
  } else t1 = $[0];
  const elementByIdRef = (0, import_react.useRef)(t1);
  let t2;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = new Map();
    $[1] = t2;
  } else t2 = $[1];
  const geomByIdRef = (0, import_react.useRef)(t2);
  const [geomVersion, setGeomVersion] = (0, import_react.useState)(0);
  const geomRafRef = (0, import_react.useRef)(null);
  let t3;
  if ($[2] !== canvasRef) {
    t3 = () => readMeasureView(getCamera(), document.querySelector("[data-overlay-container]") ?? canvasRef?.current ?? null);
    $[2] = canvasRef;
    $[3] = t3;
  } else t3 = $[3];
  const currentMeasureView = t3;
  let t4;
  if ($[4] !== resizeActive) {
    t4 = () => resizeActive;
    $[4] = resizeActive;
    $[5] = t4;
  } else t4 = $[5];
  const isResizingNow = (0, import_react.useEffectEvent)(t4);
  const recomputeAllGeomsRef = (0, import_react.useRef)(_temp$69);
  const geomRecomputePendingRef = (0, import_react.useRef)(false);
  let t5;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = t6 => {
      if (t6 === void 0 ? false : t6) geomRecomputePendingRef.current = true;
      if (geomRafRef.current !== null) return;
      geomRafRef.current = requestAnimationFrame(() => {
        geomRafRef.current = null;
        if (geomRecomputePendingRef.current) {
          geomRecomputePendingRef.current = false;
          recomputeAllGeomsRef.current();
        }
        setGeomVersion(_temp2$49);
      });
    };
    $[6] = t5;
  } else t5 = $[6];
  const scheduleGeomBump = t5;
  const resizeObserverRef = (0, import_react.useRef)(null);
  let t6;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = new Map();
    $[7] = t6;
  } else t6 = $[7];
  const idByResolvedRef = (0, import_react.useRef)(t6);
  let t7;
  if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = tracked => {
      const ro = resizeObserverRef.current;
      const idByResolved = idByResolvedRef.current;
      for (const o of tracked.observed) {
        if (ro) ro.unobserve(o);
        idByResolved.delete(o);
      }
    };
    $[8] = t7;
  } else t7 = $[8];
  const unobserveTracked = t7;
  let t8;
  if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = id => {
      const tracked_0 = elementByIdRef.current.get(id);
      if (!tracked_0) return null;
      if (!tracked_0.element.isConnected) {
        unobserveTracked(tracked_0);
        elementByIdRef.current.delete(id);
        geomByIdRef.current.delete(id);
        return null;
      }
      const resolved = resolveVisibleElement$1(tracked_0.element);
      const observed = resolveObservedElements(tracked_0.element);
      const observedChanged = observed.length !== tracked_0.observed.length || observed.some((el, i) => el !== tracked_0.observed[i]);
      if (resolved !== tracked_0.resolved || observedChanged) {
        unobserveTracked(tracked_0);
        tracked_0.resolved = resolved;
        tracked_0.observed = observed;
        const ro_0 = resizeObserverRef.current;
        const idByResolved_0 = idByResolvedRef.current;
        for (const o_0 of observed) {
          idByResolved_0.set(o_0, id);
          if (ro_0) ro_0.observe(o_0);
        }
      }
      return resolved;
    };
    $[9] = t8;
  } else t8 = $[9];
  const syncResolved = t8;
  let t9;
  if ($[10] !== currentMeasureView) {
    t9 = () => {
      const view = currentMeasureView();
      if (!view) return;
      const walkCache = new Map();
      for (const id_0 of Array.from(elementByIdRef.current.keys())) {
        if (!elementByIdRef.current.has(id_0)) continue;
        if (!syncResolved(id_0)) continue;
        const live = elementByIdRef.current.get(id_0);
        if (!live) continue;
        geomByIdRef.current.set(id_0, readElementGeom(live, view, walkCache));
      }
    };
    $[10] = currentMeasureView;
    $[11] = t9;
  } else t9 = $[11];
  const recomputeAllGeoms = t9;
  let t10;
  if ($[12] !== recomputeAllGeoms) {
    t10 = () => {
      recomputeAllGeomsRef.current = recomputeAllGeoms;
    };
    $[12] = recomputeAllGeoms;
    $[13] = t10;
  } else t10 = $[13];
  (0, import_react.useLayoutEffect)(t10);
  let t11;
  if ($[14] !== canvasRef || $[15] !== currentMeasureView || $[16] !== isResizingNow) {
    t11 = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const trackedElements = elementByIdRef.current;
      const geoms = geomByIdRef.current;
      const idByResolved_1 = idByResolvedRef.current;
      idByResolved_1.clear();
      const overlayContainer = document.querySelector("[data-overlay-container]");
      const resizeObserver = new ResizeObserver(entries => {
        if (isResizingNow()) return;
        const view_0 = currentMeasureView();
        if (!view_0) return;
        let changed = false;
        for (const entry of entries) {
          if (entry.target === canvas || entry.target === overlayContainer) {
            scheduleGeomBump(true);
            continue;
          }
          const id_1 = idByResolved_1.get(entry.target);
          if (!id_1) continue;
          const tracked_1 = elementByIdRef.current.get(id_1);
          if (!tracked_1) continue;
          if (!entry.target.isConnected || !tracked_1.observed.includes(entry.target)) {
            if (!syncResolved(id_1)) continue;
            const next = elementByIdRef.current.get(id_1);
            if (!next) continue;
            geomByIdRef.current.set(id_1, readElementGeom(next, view_0));
            changed = true;
            continue;
          }
          geomByIdRef.current.set(id_1, readElementGeom(tracked_1, view_0));
          changed = true;
        }
        if (changed) scheduleGeomBump();
      });
      resizeObserverRef.current = resizeObserver;
      const untrack = id_2 => {
        const tracked_2 = elementByIdRef.current.get(id_2);
        if (!tracked_2) return;
        unobserveTracked(tracked_2);
        elementByIdRef.current.delete(id_2);
        geomByIdRef.current.delete(id_2);
      };
      const track = element => {
        const id_3 = element.getAttribute("data-element-id");
        if (!id_3) return;
        const existing = elementByIdRef.current.get(id_3);
        if (existing) {
          if (existing.element === element || existing.element.contains(element)) return;
          untrack(id_3);
        }
        const resolved_1 = resolveVisibleElement$1(element);
        const observed_0 = resolveObservedElements(element);
        const tracked_3 = {
          element,
          resolved: resolved_1,
          observed: observed_0
        };
        elementByIdRef.current.set(id_3, tracked_3);
        for (const o_1 of observed_0) {
          idByResolved_1.set(o_1, id_3);
          resizeObserver.observe(o_1);
        }
        const oneView = currentMeasureView();
        if (oneView) geomByIdRef.current.set(id_3, readElementGeom(tracked_3, oneView));
      };
      const untrackIfCurrent = (id_4, el_0) => {
        const tracked_4 = elementByIdRef.current.get(id_4);
        if (tracked_4 && tracked_4.element === el_0) untrack(id_4);
      };
      const refreshClosestTracked = node => {
        let cur = node;
        while (cur && cur !== canvas) {
          const id_5 = cur.getAttribute?.("data-element-id");
          if (id_5 && elementByIdRef.current.has(id_5)) {
            if (!syncResolved(id_5)) return false;
            const tracked_5 = elementByIdRef.current.get(id_5);
            if (!tracked_5) return false;
            const oneView_0 = currentMeasureView();
            if (oneView_0) geomByIdRef.current.set(id_5, readElementGeom(tracked_5, oneView_0));
            return true;
          }
          cur = cur.parentElement;
        }
        return false;
      };
      for (const el_1 of canvas.querySelectorAll("[data-element-id]")) track(el_1);
      resizeObserver.observe(canvas);
      if (overlayContainer) resizeObserver.observe(overlayContainer);
      scheduleGeomBump();
      const mutationObserver = new MutationObserver(mutations => {
        let dirty = false;
        for (const m of mutations) {
          for (const node_0 of m.addedNodes) {
            if (node_0.nodeType !== 1) continue;
            const el_2 = node_0;
            if (el_2.hasAttribute?.("data-element-id")) {
              track(el_2);
              dirty = true;
            }
            const descendants = el_2.querySelectorAll?.("[data-element-id]");
            if (descendants) for (const child of descendants) {
              track(child);
              dirty = true;
            }
            if (refreshClosestTracked(el_2.parentElement)) dirty = true;
          }
          for (const node_1 of m.removedNodes) {
            if (node_1.nodeType !== 1) continue;
            const el_3 = node_1;
            if (el_3.hasAttribute?.("data-element-id")) {
              const id_6 = el_3.getAttribute("data-element-id");
              if (id_6) {
                untrackIfCurrent(id_6, el_3);
                dirty = true;
              }
            }
            const descendants_0 = el_3.querySelectorAll?.("[data-element-id]");
            if (descendants_0) for (const child_0 of descendants_0) {
              const id_7 = child_0.getAttribute("data-element-id");
              if (id_7) {
                untrackIfCurrent(id_7, child_0);
                dirty = true;
              }
            }
            if (refreshClosestTracked(m.target)) dirty = true;
          }
        }
        if (dirty) scheduleGeomBump();
      });
      mutationObserver.observe(canvas, {
        childList: true,
        subtree: true
      });
      const onWinResize = () => scheduleGeomBump(true);
      window.addEventListener("resize", onWinResize);
      const onScroll = e => {
        const target = e.target;
        if (!target) return;
        if (target === document || target instanceof Node && (target.contains(canvas) || canvas.contains(target))) scheduleGeomBump(true);
      };
      document.addEventListener("scroll", onScroll, {
        capture: true,
        passive: true
      });
      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
        window.removeEventListener("resize", onWinResize);
        document.removeEventListener("scroll", onScroll, {
          capture: true
        });
        resizeObserverRef.current = null;
        trackedElements.clear();
        geoms.clear();
        idByResolved_1.clear();
      };
    };
    $[14] = canvasRef;
    $[15] = currentMeasureView;
    $[16] = isResizingNow;
    $[17] = t11;
  } else t11 = $[17];
  let t12;
  if ($[18] !== canvasRef || $[19] !== currentMeasureView) {
    t12 = [canvasRef, resolveVisibleElement$1, scheduleGeomBump, syncResolved, unobserveTracked, currentMeasureView];
    $[18] = canvasRef;
    $[19] = currentMeasureView;
    $[20] = t12;
  } else t12 = $[20];
  (0, import_react.useEffect)(t11, t12);
  let t13;
  if ($[21] !== currentMeasureView || $[22] !== dragActive || $[23] !== resizeActive || $[24] !== selectedElementIds) {
    t13 = () => {
      if (dragActive || rotateDrag || resizeActive || selectedElementIds.size === 0) return;
      const view_1 = currentMeasureView();
      if (!view_1) return;
      const walkCache_0 = new Map();
      let changed_0 = false;
      for (const id_8 of selectedElementIds) {
        if (!syncResolved(id_8)) continue;
        const tracked_6 = elementByIdRef.current.get(id_8);
        if (!tracked_6) continue;
        const next_0 = readElementGeom(tracked_6, view_1, walkCache_0);
        const previous = geomByIdRef.current.get(id_8);
        if (previous && previous.centerX === next_0.centerX && previous.centerY === next_0.centerY && previous.width === next_0.width && previous.height === next_0.height && previous.transform === next_0.transform) continue;
        geomByIdRef.current.set(id_8, next_0);
        changed_0 = true;
      }
      if (changed_0) setGeomVersion(_temp3$33);
    };
    $[21] = currentMeasureView;
    $[22] = dragActive;
    $[23] = resizeActive;
    $[24] = selectedElementIds;
    $[25] = t13;
  } else t13 = $[25];
  let t14;
  if ($[26] !== componentsRevision || $[27] !== currentMeasureView || $[28] !== dragActive || $[29] !== resizeActive || $[30] !== selectedElementIds || $[31] !== store) {
    t14 = [store, componentsRevision, selectedElementIds, dragActive, resizeActive, currentMeasureView, syncResolved];
    $[26] = componentsRevision;
    $[27] = currentMeasureView;
    $[28] = dragActive;
    $[29] = resizeActive;
    $[30] = selectedElementIds;
    $[31] = store;
    $[32] = t14;
  } else t14 = $[32];
  (0, import_react.useLayoutEffect)(t13, t14);
  let t15;
  if ($[33] !== dragActive || $[34] !== recomputeAllGeoms || $[35] !== resizeActive) {
    t15 = () => {
      if (dragActive) return;
      if (rotateDrag) return;
      if (resizeActive) return;
      if (geomRafRef.current !== null) cancelAnimationFrame(geomRafRef.current);
      geomRafRef.current = requestAnimationFrame(() => {
        geomRafRef.current = null;
        recomputeAllGeoms();
        setGeomVersion(_temp4$27);
      });
      return () => {
        if (geomRafRef.current !== null) {
          cancelAnimationFrame(geomRafRef.current);
          geomRafRef.current = null;
        }
      };
    };
    $[33] = dragActive;
    $[34] = recomputeAllGeoms;
    $[35] = resizeActive;
    $[36] = t15;
  } else t15 = $[36];
  let t16;
  if ($[37] !== componentsRevision || $[38] !== dragActive || $[39] !== recomputeAllGeoms || $[40] !== resizeActive || $[41] !== store) {
    t16 = [store, componentsRevision, dragActive, resizeActive, recomputeAllGeoms];
    $[37] = componentsRevision;
    $[38] = dragActive;
    $[39] = recomputeAllGeoms;
    $[40] = resizeActive;
    $[41] = store;
    $[42] = t16;
  } else t16 = $[42];
  (0, import_react.useEffect)(t15, t16);
  const prevDraggingRef = (0, import_react.useRef)(dragActive);
  let t17;
  let t18;
  if ($[43] !== dragActive || $[44] !== recomputeAllGeoms) {
    t17 = () => {
      if (prevDraggingRef.current && !dragActive) requestAnimationFrame(() => {
        recomputeAllGeoms();
        setGeomVersion(_temp5$22);
      });
      prevDraggingRef.current = dragActive;
    };
    t18 = [dragActive, recomputeAllGeoms];
    $[43] = dragActive;
    $[44] = recomputeAllGeoms;
    $[45] = t17;
    $[46] = t18;
  } else {
    t17 = $[45];
    t18 = $[46];
  }
  (0, import_react.useEffect)(t17, t18);
  const prevResizingRef = (0, import_react.useRef)(resizeActive);
  let t19;
  let t20;
  if ($[47] !== recomputeAllGeoms || $[48] !== resizeActive) {
    t19 = () => {
      if (prevResizingRef.current && !resizeActive) {
        recomputeAllGeoms();
        setGeomVersion(_temp6$19);
      }
      prevResizingRef.current = resizeActive;
    };
    t20 = [resizeActive, recomputeAllGeoms];
    $[47] = recomputeAllGeoms;
    $[48] = resizeActive;
    $[49] = t19;
    $[50] = t20;
  } else {
    t19 = $[49];
    t20 = $[50];
  }
  (0, import_react.useLayoutEffect)(t19, t20);
  let t21;
  let t22;
  if ($[51] !== currentMeasureView || $[52] !== selectedElementIds) {
    t21 = () => {
      if (selectedElementIds.size === 0) return;
      let changed_1 = false;
      for (const id_9 of selectedElementIds) {
        if (!syncResolved(id_9)) continue;
        const tracked_7 = elementByIdRef.current.get(id_9);
        if (!tracked_7) continue;
        const oneView_1 = currentMeasureView();
        if (oneView_1) geomByIdRef.current.set(id_9, readElementGeom(tracked_7, oneView_1));
        changed_1 = true;
      }
      if (changed_1) scheduleGeomBump();
    };
    t22 = [selectedElementIds, syncResolved, scheduleGeomBump, currentMeasureView];
    $[51] = currentMeasureView;
    $[52] = selectedElementIds;
    $[53] = t21;
    $[54] = t22;
  } else {
    t21 = $[53];
    t22 = $[54];
  }
  (0, import_react.useEffect)(t21, t22);
  let t23;
  if ($[55] !== geomVersion) {
    t23 = {
      geomByIdRef,
      geomVersion
    };
    $[55] = geomVersion;
    $[56] = t23;
  } else t23 = $[56];
  return t23;
}
function _temp6$19(v_3) {
  return v_3 + 1;
}
function _temp5$22(v_2) {
  return v_2 + 1;
}
function _temp4$27(v_1) {
  return v_1 + 1;
}
function _temp3$33(v_0) {
  return v_0 + 1;
}
function _temp2$49(v) {
  return v + 1;
}
function _temp$69() {}

export { AiLockOverlays, HoverOverlay, ROOT_LABEL_MIN_SCALE, RootLabels, SelectionOverlay, useOverlayGeoms };
