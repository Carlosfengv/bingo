/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/hooks/useDndCanvas.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { resolveDropTarget } from "../../shared/utils/dropPlan";
import { applyOperationsToStore, createMoveOperation, createSetStylesOperation } from "../../shared/utils/operations";
import { getCamera, sameCamera, subscribeCamera } from "../../shell/utils/chatShortcuts";
import { computeAbsoluteOffsetStyles, isRelativeFlowPosition, positionStylesForParent } from "../utils/absolutePositioning";
import { applyFlexReorderPreview, canvasElementFromPoint, clearFlexReorderPreview, createFlexSlotCache, getCanvasRect, getElementComputedMargins, getElementRect$1, getFlexDropSlot, isCompletelyOutside, isPointerWithinFlexParentCrossAxis } from "../utils/collisionUtils";
import { getAbsoluteContainingBox, getElementPaddingBox, isFlowLayoutElement } from "../utils/domGeometry";
import { mapScreenPoint, screenToCanvas } from "../utils/dragFrame";
import { readDragPreviewGeometry } from "../utils/dragPreviewGeometry";
import { movesDeeper, resolveNestTarget, shouldReturnToFlow } from "../utils/nestTarget";
import { NO_SNAP_MEMORY, collectSnapLines, computeSnap, computeSpacing, visibleSnapRects } from "../utils/snapping";
import { getById, getChildren$2, getIndex, getParentId, getRootIds, isDescendant } from "@bingo/compiler";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function gapsEqual(a, b) {
  return a.length === b.length && a.every((g, i) => g.axis === b[i].axis && g.gap === b[i].gap && g.start === b[i].start && g.end === b[i].end && g.pos === b[i].pos);
}
/** Stable empty references for the `draggedIds` / `activeElements` memos —
*  returning fresh collections each render broke React.memo on Canvas and
*  re-rendered the whole element tree on every drag-move event. Treat as read-only. */
var EMPTY_DRAGGED_IDS = new Set();
var EMPTY_ACTIVE_ELEMENTS = [];
/** Walk up from the element under the pointer to find the nearest flex container
*  registered with a data-element-id, skipping any excluded ids (dragged self / descendants).
*  Relies on the DragOverlay being pointer-events: none (dnd-kit default) and the dragged
*  element being visibility: hidden — both are already true — so elementFromPoint returns
*  what the user would actually drop on.
*
*  Uses a WeakMap cache of "is flex?" per DOM node to avoid repeated getComputedStyle
*  calls on the same ancestors across successive pointer moves. The cache is scoped to
*  a single drag (caller resets it). */
function findFlexDropContainer(pointerX, pointerY, excludeIds, isFlexCache) {
  const top = canvasElementFromPoint(pointerX, pointerY);
  if (!top) return null;
  let node = top;
  while (node) {
    if (node instanceof HTMLElement || node instanceof SVGElement) {
      const id = node.getAttribute("data-element-id");
      if (id && !excludeIds.has(id)) {
        let isFlex = isFlexCache.get(node);
        if (isFlex === void 0) {
          isFlex = window.getComputedStyle(node).display.includes("flex");
          isFlexCache.set(node, isFlex);
        }
        if (isFlex) return id;
      }
    }
    node = node.parentElement;
  }
  return null;
}
/** Extract clientX/clientY from any pointer-like event (mouse, pointer, touch). */
function getPointerCoords(e) {
  if (e && "clientX" in e && typeof e.clientX === "number") {
    const me = e;
    return {
      x: me.clientX,
      y: me.clientY
    };
  }
  if (e && "touches" in e) {
    const t = e.touches[0] || e.changedTouches?.[0];
    if (t) return {
      x: t.clientX,
      y: t.clientY
    };
  }
  return null;
}
/** Container ids under a point, deepest first — the DOM half of nest targeting.
*  Which of them is a legal target is decided by resolveNestTarget (pure, tested).
*  Reads through canvasElementFromPoint, not document.elementFromPoint: the drag
*  overlay renders a copy of the dragged element under the cursor and would
*  otherwise be the top hit. We do not use dnd-kit's `event.over` either — the
*  display:contents DraggableElement wrappers measure width:0, poisoning its
*  collision rects to NaN so `over` never resolves. */
function candidateIdsUnderPoint(x, y) {
  const ids = [];
  for (let node = canvasElementFromPoint(x, y); node; node = node.parentElement) if (node instanceof HTMLElement || node instanceof SVGElement) {
    const id = node.getAttribute("data-element-id");
    if (id) ids.push(id);
  }
  return ids;
}
/** True for a length the author set outright. An auto/percentage/missing value is
*  derived from the parent, so it is the only kind that needs locking on detach. */
function hasExplicitLength(value) {
  if (typeof value === "number") return true;
  return typeof value === "string" && /^-?\d*\.?\d+(px|rem|em|ch|vh|vw|pt)$/.test(value.trim());
}
/** The measured size is a screen rect divided by the camera scale, so at a fractional
*  zoom it round-trips to noise (360 became 359.9999785962981px in a real file).
*  Snap to whole pixels within a hair, else keep two decimals. */
function roundDetachLength(value) {
  const whole = Math.round(value);
  return Math.abs(value - whole) < .01 ? whole : Math.round(value * 100) / 100;
}
/** Style overrides applied to detached elements: lock visual size (width/height in canvas-space px)
*  for the axes the layout was deciding. An axis the author sized explicitly is left alone —
*  overwriting `width: 360px` with a re-measured 359.9999785962981px loses the authored value
*  and dirties the file for nothing.
*  Margin is intentionally preserved — canvas_pos is shifted by -margin to compensate. */
var DETACH_STYLE_OVERRIDES = (widthCanvas, heightCanvas, styles) => ({
  ...(hasExplicitLength(styles?.width) ? {} : {
    width: `${roundDetachLength(widthCanvas)}px`
  }),
  ...(hasExplicitLength(styles?.height) ? {} : {
    height: `${roundDetachLength(heightCanvas)}px`
  })
});
/** Explicitly return a child to flow, clearing any offsets from an absolute parent. */
function createFlowPositionOperation(store, elementId) {
  const element = getById(store, elementId);
  if (!element || isRelativeFlowPosition(element.styles)) return null;
  return createSetStylesOperation(store, elementId, positionStylesForParent(element.styles, true));
}
/**
* Find the nearest selected ancestor of an element (or the element itself if selected)
*/
function findSelectedAncestor(store, elementId, selectedIds) {
  if (selectedIds.has(elementId)) return elementId;
  let cursor = elementId;
  while (cursor) {
    const parentKey = getParentId(store, cursor);
    if (!parentKey || parentKey === "ROOT") return null;
    if (selectedIds.has(parentKey)) return parentKey;
    cursor = parentKey;
  }
  return null;
}
/** Compute (parentId, index) for a target+position drop slot. */
function isDescendantInStore(store, parentId, childId) {
  return isDescendant(store, parentId, childId);
}
/** Selection if the lead is part of a multi-select, otherwise just the lead. */
function getDraggedIds(draggedId, selectedIds) {
  if (selectedIds.has(draggedId) && selectedIds.size > 1) return selectedIds;
  return new Set([draggedId]);
}
function getCurrentFrame() {
  const canvasRect = getCanvasRect();
  const {
    scale,
    positionX,
    positionY
  } = getCamera();
  if (!canvasRect || !(scale > 0)) return null;
  return {
    scale,
    panX: positionX,
    panY: positionY,
    originX: canvasRect.left,
    originY: canvasRect.top
  };
}
function useDndCanvas(t0) {
  const $ = (0, import_compiler_runtime.c)(131);
  const {
    store,
    setStore,
    onSelectElement,
    onDragElement,
    selectedElementIds: t1,
    hoverElementIdRef,
    onPushOperations,
    onStartAltDrag,
    onAltDragAborted,
    altKeyDownRef: altKeyDownRefProp,
    zoomGestureAtRef: zoomGestureAtRefProp
  } = t0;
  const selectedElementIds = t1 === void 0 ? EMPTY_DRAGGED_IDS : t1;
  const [activeId, setActiveId] = (0, import_react.useState)(null);
  const [overId, setOverId] = (0, import_react.useState)(null);
  const [shouldDetach, setShouldDetach] = (0, import_react.useState)(false);
  const [dropSlot, setDropSlot] = (0, import_react.useState)(null);
  let t2;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = createFlexSlotCache();
    $[0] = t2;
  } else t2 = $[0];
  const flexCacheRef = (0, import_react.useRef)(t2);
  let t3;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = new WeakMap();
    $[1] = t3;
  } else t3 = $[1];
  const isFlexCacheRef = (0, import_react.useRef)(t3);
  let t4;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = next => {
      setDropSlot(prev => {
        if (prev === next) return prev;
        if (!prev || !next) return next;
        if (prev.targetId !== next.targetId || prev.position !== next.position) return next;
        const a = prev.indicatorRect;
        const b = next.indicatorRect;
        if (a.left !== b.left || a.top !== b.top || a.width !== b.width || a.height !== b.height) return next;
        return prev;
      });
    };
    $[2] = t4;
  } else t4 = $[2];
  const commitDropSlot = t4;
  const pointerStartRef = (0, import_react.useRef)(null);
  const pointerCurrentRef = (0, import_react.useRef)(null);
  const altKeyDownRef = altKeyDownRefProp;
  const dragStartFrameRef = (0, import_react.useRef)(null);
  let t5;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = pt => {
      const start = dragStartFrameRef.current;
      const now = getCurrentFrame();
      return start && now ? mapScreenPoint(pt, now, start) : pt;
    };
    $[3] = t5;
  } else t5 = $[3];
  const toDragStartFrame = t5;
  let t6;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = pt_0 => {
      const start_0 = dragStartFrameRef.current;
      const now_0 = getCurrentFrame();
      return start_0 && now_0 ? mapScreenPoint(pt_0, start_0, now_0) : pt_0;
    };
    $[4] = t6;
  } else t6 = $[4];
  const fromDragStartFrame = t6;
  let t7;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = () => dragStartFrameRef.current?.scale ?? getCamera().scale;
    $[5] = t7;
  } else t7 = $[5];
  const getDragStartScale = t7;
  let t8;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = rect => {
      const topLeft = fromDragStartFrame({
        x: rect.left,
        y: rect.top
      });
      const ratio = getCamera().scale / getDragStartScale();
      return {
        left: topLeft.x,
        top: topLeft.y,
        width: rect.width * ratio,
        height: rect.height * ratio
      };
    };
    $[6] = t8;
  } else t8 = $[6];
  const toLiveRect = t8;
  let t9;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t9 = rect_0 => {
      const live = toLiveRect(rect_0);
      return {
        ...live,
        right: live.left + live.width,
        bottom: live.top + live.height
      };
    };
    $[7] = t9;
  } else t9 = $[7];
  const toLiveHitRect = t9;
  let t10;
  if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
    t10 = fallback => {
      if (pointerStartRef.current && pointerCurrentRef.current) {
        const current = toDragStartFrame(pointerCurrentRef.current);
        return {
          x: current.x - pointerStartRef.current.x,
          y: current.y - pointerStartRef.current.y
        };
      }
      return fallback;
    };
    $[8] = t10;
  } else t10 = $[8];
  const getPointerDeltaScreen = t10;
  let t11;
  if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
    t11 = {
      x: 0,
      y: 0
    };
    $[9] = t11;
  } else t11 = $[9];
  const [dragOverlayOffset, setDragOverlayOffset] = (0, import_react.useState)(t11);
  const [dragStartAnchor, setDragStartAnchor] = (0, import_react.useState)(null);
  if (!activeId && dragStartAnchor !== null) setDragStartAnchor(null);
  const snapTargetsRef = (0, import_react.useRef)(null);
  let t12;
  if ($[10] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = {
      x: 0,
      y: 0
    };
    $[10] = t12;
  } else t12 = $[10];
  const snapCorrectionRef = (0, import_react.useRef)(t12);
  const lastMovePointerRef = (0, import_react.useRef)(null);
  const handledMoveRef = (0, import_react.useRef)(null);
  const groupStartRectRef = (0, import_react.useRef)(null);
  const snapSiblingRectsRef = (0, import_react.useRef)(null);
  const snapSourceRef = (0, import_react.useRef)(null);
  const snapCameraRef = (0, import_react.useRef)(null);
  const snapMemoryRef = (0, import_react.useRef)(NO_SNAP_MEMORY);
  const altCloneIdsRef = (0, import_react.useRef)(null);
  const altToggleSettleRef = (0, import_react.useRef)(false);
  const altPreCloneRef = (0, import_react.useRef)(null);
  let getLastMoveDeltaScreen;
  let getSnappedCanvasDelta;
  if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
    getSnappedCanvasDelta = () => ({
      x: (getLastMoveDeltaScreen().x + snapCorrectionRef.current.x) / getDragStartScale(),
      y: (getLastMoveDeltaScreen().y + snapCorrectionRef.current.y) / getDragStartScale()
    });
    getLastMoveDeltaScreen = () => {
      const pointer = lastMovePointerRef.current;
      const start_1 = pointerStartRef.current;
      if (!pointer || !start_1) return {
        x: 0,
        y: 0
      };
      const mapped = toDragStartFrame(pointer);
      return {
        x: mapped.x - start_1.x,
        y: mapped.y - start_1.y
      };
    };
    $[11] = getLastMoveDeltaScreen;
    $[12] = getSnappedCanvasDelta;
  } else {
    getLastMoveDeltaScreen = $[11];
    getSnappedCanvasDelta = $[12];
  }
  const lastZoomAtRef = (0, import_react.useRef)(0);
  let t13;
  let t14;
  if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
    t13 = () => {
      let lastScale = getCamera().scale;
      return subscribeCamera(c => {
        if (c.scale === lastScale) return;
        lastScale = c.scale;
        lastZoomAtRef.current = performance.now();
      });
    };
    t14 = [];
    $[13] = t13;
    $[14] = t14;
  } else {
    t13 = $[13];
    t14 = $[14];
  }
  (0, import_react.useEffect)(t13, t14);
  const internalZoomGestureAtRef = (0, import_react.useRef)(0);
  const zoomGestureAtRef = zoomGestureAtRefProp ?? internalZoomGestureAtRef;
  const disableSnapKeyDownRef = (0, import_react.useRef)(false);
  let t15;
  if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
    t15 = {
      x: 0,
      y: 0
    };
    $[15] = t15;
  } else t15 = $[15];
  const [snapOffset, setSnapOffset] = (0, import_react.useState)(t15);
  let t16;
  if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
    t16 = [];
    $[16] = t16;
  } else t16 = $[16];
  const [snapGuides, setSnapGuides] = (0, import_react.useState)(t16);
  let t17;
  if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
    t17 = [];
    $[17] = t17;
  } else t17 = $[17];
  const [spacingMeasures, setSpacingMeasures] = (0, import_react.useState)(t17);
  let t18;
  if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
    t18 = [];
    $[18] = t18;
  } else t18 = $[18];
  const [spacingGuides, setSpacingGuides] = (0, import_react.useState)(t18);
  const [dragPreviewRect, setDragPreviewRect] = (0, import_react.useState)(null);
  let t19;
  if ($[19] === Symbol.for("react.memo_cache_sentinel")) {
    t19 = next_0 => {
      setDragPreviewRect(prev_0 => {
        if (prev_0 === next_0) return prev_0;
        if (!prev_0 || !next_0) return next_0;
        if (prev_0.left === next_0.left && prev_0.top === next_0.top && prev_0.width === next_0.width && prev_0.height === next_0.height) return prev_0;
        return next_0;
      });
    };
    $[19] = t19;
  } else t19 = $[19];
  const commitDragPreviewRect = t19;
  let t20;
  if ($[20] === Symbol.for("react.memo_cache_sentinel")) {
    t20 = (offset, guides) => {
      snapCorrectionRef.current = offset;
      setSnapOffset(prev_1 => prev_1.x === offset.x && prev_1.y === offset.y ? prev_1 : offset);
      setSnapGuides(prev_2 => {
        if (prev_2.length === guides.length && prev_2.every((g, i) => g.axis === guides[i].axis && g.pos === guides[i].pos && g.spanStart === guides[i].spanStart && g.spanEnd === guides[i].spanEnd)) return prev_2;
        return guides;
      });
    };
    $[20] = t20;
  } else t20 = $[20];
  const commitSnap = t20;
  let t21;
  if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
    t21 = (measures, guides_0) => {
      setSpacingMeasures(prev_3 => gapsEqual(prev_3, measures) ? prev_3 : measures);
      setSpacingGuides(prev_4 => gapsEqual(prev_4, guides_0) ? prev_4 : guides_0);
    };
    $[21] = t21;
  } else t21 = $[21];
  const commitSpacing = t21;
  let t22;
  if ($[22] === Symbol.for("react.memo_cache_sentinel")) {
    t22 = () => {
      snapMemoryRef.current = NO_SNAP_MEMORY;
      commitSnap({
        x: 0,
        y: 0
      }, []);
      commitDragPreviewRect(null);
      commitSpacing([], []);
    };
    $[22] = t22;
  } else t22 = $[22];
  const clearSnap = t22;
  let t23;
  if ($[23] === Symbol.for("react.memo_cache_sentinel")) {
    t23 = new Map();
    $[23] = t23;
  } else t23 = $[23];
  const dragStartStateRef = (0, import_react.useRef)(t23);
  let t24;
  if ($[24] === Symbol.for("react.memo_cache_sentinel")) {
    t24 = new Map();
    $[24] = t24;
  } else t24 = $[24];
  const [dragStartRects, setDragStartRects] = (0, import_react.useState)(t24);
  if (!activeId && dragStartRects.size > 0) setDragStartRects(new Map());
  let t25;
  if ($[25] !== onStartAltDrag) {
    t25 = (draggedIds, leadId, rects) => {
      if (!onStartAltDrag) return null;
      const canvasRect = getCanvasRect();
      const elementsToClone = [];
      for (const id of draggedIds) {
        const originalState = dragStartStateRef.current.get(id);
        if (!originalState) continue;
        let canvasPos;
        let lockSize = null;
        if (originalState.parentId !== null && originalState.rect && canvasRect) {
          const {
            scale,
            positionX,
            positionY
          } = getCamera();
          canvasPos = {
            x: (originalState.rect.left - canvasRect.left - positionX) / scale,
            y: (originalState.rect.top - canvasRect.top - positionY) / scale
          };
          lockSize = {
            width: originalState.rect.width / scale,
            height: originalState.rect.height / scale
          };
        } else canvasPos = originalState.position ?? null;
        elementsToClone.push({
          originalId: id,
          canvasPos,
          lockSize
        });
      }
      const cloneIds = onStartAltDrag(elementsToClone);
      if (!cloneIds || cloneIds.length !== elementsToClone.length) return null;
      altPreCloneRef.current = {
        ids: new Set(draggedIds),
        lead: leadId,
        states: new Map(dragStartStateRef.current),
        rects: new Map(rects)
      };
      altCloneIdsRef.current = new Set(cloneIds);
      for (let i_0 = 0; i_0 < elementsToClone.length; i_0++) {
        const {
          originalId,
          canvasPos: canvasPos_0
        } = elementsToClone[i_0];
        const cloneId = cloneIds[i_0];
        const originalState_0 = dragStartStateRef.current.get(originalId);
        if (originalState_0) {
          dragStartStateRef.current.set(cloneId, {
            ...originalState_0,
            parentId: null,
            position: canvasPos_0 ?? void 0,
            marginLeft: 0,
            marginTop: 0
          });
          dragStartStateRef.current.delete(originalId);
        }
        const rect_1 = rects.get(originalId);
        if (rect_1) {
          rects.set(cloneId, rect_1);
          rects.delete(originalId);
        }
      }
      const leadIdx = elementsToClone.findIndex(e => e.originalId === leadId);
      return cloneIds[leadIdx >= 0 ? leadIdx : 0] ?? null;
    };
    $[25] = onStartAltDrag;
    $[26] = t25;
  } else t25 = $[26];
  const createAltClones = t25;
  let t26;
  if ($[27] === Symbol.for("react.memo_cache_sentinel")) {
    t26 = () => {
      const source = snapSourceRef.current;
      if (!source) return;
      const camera = getCamera();
      if (snapCameraRef.current && sameCamera(snapCameraRef.current, camera)) return;
      snapCameraRef.current = camera;
      const live_0 = getCanvasRect();
      const start_2 = dragStartFrameRef.current;
      let viewport;
      if (live_0) {
        const now_1 = {
          scale: camera.scale,
          panX: camera.positionX,
          panY: camera.positionY,
          originX: live_0.left,
          originY: live_0.top
        };
        const tl = start_2 ? mapScreenPoint({
          x: live_0.left,
          y: live_0.top
        }, now_1, start_2) : {
          x: live_0.left,
          y: live_0.top
        };
        const br = start_2 ? mapScreenPoint({
          x: live_0.right,
          y: live_0.bottom
        }, now_1, start_2) : {
          x: live_0.right,
          y: live_0.bottom
        };
        viewport = {
          left: tl.x,
          top: tl.y,
          right: br.x,
          bottom: br.y
        };
      }
      const visible = viewport ? visibleSnapRects(source.rects, viewport) : source.rects;
      snapTargetsRef.current = collectSnapLines(visible, source.box, viewport);
      snapSiblingRectsRef.current = visible;
    };
    $[27] = t26;
  } else t26 = $[27];
  const refreshSnapVisibility = t26;
  let t27;
  if ($[28] !== store) {
    t27 = (draggedIds_0, rects_0, alsoExclude) => {
      const altCloneIds = altCloneIdsRef.current;
      snapTargetsRef.current = null;
      groupStartRectRef.current = null;
      snapSiblingRectsRef.current = null;
      snapSourceRef.current = null;
      snapCameraRef.current = null;
      snapMemoryRef.current = NO_SNAP_MEMORY;
      let commonParentId = altCloneIds ? null : void 0;
      let sameParent = true;
      if (!altCloneIds) for (const id_0 of draggedIds_0) {
        const pk = getParentId(store, id_0);
        const pid = pk === "ROOT" || pk === null ? null : pk;
        if (commonParentId === void 0) commonParentId = pid;else if (commonParentId !== pid) {
          sameParent = false;
          break;
        }
      }
      if (!sameParent) return;
      const parentId = commonParentId ?? null;
      const movingIds = altCloneIds ?? draggedIds_0;
      const siblingIds = (parentId === null ? getRootIds(store) : getChildren$2(store, parentId)).filter(id_1 => !movingIds.has(id_1) && !alsoExclude?.has(id_1));
      const targets = [];
      for (const sid of siblingIds) {
        const r = getElementRect$1(sid);
        if (r) targets.push({
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height
        });
      }
      const box = parentId ? getElementPaddingBox(parentId, getCamera().scale) ?? void 0 : void 0;
      snapSourceRef.current = {
        rects: targets,
        box
      };
      refreshSnapVisibility();
      if (draggedIds_0.size > 1) {
        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;
        for (const r_0 of rects_0.values()) {
          left = Math.min(left, r_0.left);
          top = Math.min(top, r_0.top);
          right = Math.max(right, r_0.left + r_0.width);
          bottom = Math.max(bottom, r_0.top + r_0.height);
        }
        if (left !== Infinity) groupStartRectRef.current = {
          left,
          top,
          width: right - left,
          height: bottom - top
        };
      }
    };
    $[28] = store;
    $[29] = t27;
  } else t27 = $[29];
  const collectSnapTargets = t27;
  let t28;
  if ($[30] !== altKeyDownRef || $[31] !== collectSnapTargets || $[32] !== createAltClones || $[33] !== hoverElementIdRef || $[34] !== onSelectElement || $[35] !== selectedElementIds || $[36] !== store) {
    t28 = event => {
      const clickedElementId = event.active.id;
      let effectiveId = clickedElementId;
      const activator = event.activatorEvent;
      dragStartFrameRef.current = getCurrentFrame();
      const initialPointer = getPointerCoords(activator);
      if (initialPointer) {
        pointerStartRef.current = initialPointer;
        pointerCurrentRef.current = initialPointer;
        const frame = dragStartFrameRef.current;
        if (frame) setDragStartAnchor({
          pointerX: initialPointer.x,
          pointerY: initialPointer.y,
          frame
        });
      }
      const activatorAlt = "altKey" in activator && activator.altKey;
      const isAlt = (altKeyDownRef?.current ?? false) || activatorAlt;
      const activatorMeta = "metaKey" in activator && activator.metaKey || "ctrlKey" in activator && activator.ctrlKey;
      disableSnapKeyDownRef.current = !!activatorMeta;
      if (isAlt) {
        const cursorElement = hoverElementIdRef?.current ?? clickedElementId;
        effectiveId = findSelectedAncestor(store, cursorElement, selectedElementIds) ?? cursorElement;
      } else {
        const selectedAncestor_0 = findSelectedAncestor(store, clickedElementId, selectedElementIds);
        if (selectedAncestor_0 && selectedAncestor_0 !== clickedElementId) effectiveId = selectedAncestor_0;else if (hoverElementIdRef?.current && hoverElementIdRef.current !== clickedElementId) effectiveId = hoverElementIdRef.current;
      }
      setShouldDetach(false);
      setDropSlot(null);
      flexCacheRef.current = createFlexSlotCache();
      isFlexCacheRef.current = new WeakMap();
      if (effectiveId !== clickedElementId) {
        const clickedRect = getElementRect$1(clickedElementId);
        const effectiveRect = getElementRect$1(effectiveId);
        if (clickedRect && effectiveRect) setDragOverlayOffset({
          x: effectiveRect.left - clickedRect.left,
          y: effectiveRect.top - clickedRect.top
        });else setDragOverlayOffset({
          x: 0,
          y: 0
        });
      } else setDragOverlayOffset({
        x: 0,
        y: 0
      });
      dragStartStateRef.current.clear();
      const draggedIds_1 = getDraggedIds(effectiveId, selectedElementIds);
      const rectsSnapshot = new Map();
      for (const id_2 of draggedIds_1) {
        const el = getById(store, id_2);
        if (el) {
          const parentKey = getParentId(store, id_2);
          const parentId_0 = parentKey === "ROOT" || parentKey === null ? null : parentKey;
          const index = getIndex(store, id_2);
          const domRect = getElementRect$1(id_2);
          const rect_2 = domRect ? {
            left: domRect.left,
            top: domRect.top,
            width: domRect.width,
            height: domRect.height
          } : null;
          const elementStyles = el.styles ? {
            ...el.styles
          } : void 0;
          const {
            marginLeft,
            marginTop,
            marginRight,
            marginBottom
          } = getElementComputedMargins(id_2);
          dragStartStateRef.current.set(id_2, {
            position: el.canvasPosition ? {
              ...el.canvasPosition
            } : void 0,
            parentId: parentId_0,
            index: index >= 0 ? index : 0,
            rect: rect_2,
            styles: elementStyles,
            marginLeft,
            marginTop,
            marginRight,
            marginBottom
          });
          if (rect_2) rectsSnapshot.set(id_2, {
            ...rect_2,
            preview: readDragPreviewGeometry(id_2)
          });
        }
      }
      altCloneIdsRef.current = null;
      altPreCloneRef.current = null;
      if (isAlt) {
        const leadClone = createAltClones(draggedIds_1, effectiveId, rectsSnapshot);
        if (leadClone) effectiveId = leadClone;
      }
      lastMovePointerRef.current = null;
      clearSnap();
      collectSnapTargets(draggedIds_1, rectsSnapshot);
      setDragStartRects(rectsSnapshot);
      setActiveId(effectiveId);
      if (!isAlt && onSelectElement && !selectedElementIds.has(effectiveId)) onSelectElement(effectiveId);
    };
    $[30] = altKeyDownRef;
    $[31] = collectSnapTargets;
    $[32] = createAltClones;
    $[33] = hoverElementIdRef;
    $[34] = onSelectElement;
    $[35] = selectedElementIds;
    $[36] = store;
    $[37] = t28;
  } else t28 = $[37];
  const handleDragStart = t28;
  let t29;
  if ($[38] !== activeId || $[39] !== dropSlot || $[40] !== onAltDragAborted || $[41] !== onDragElement || $[42] !== onPushOperations || $[43] !== overId || $[44] !== selectedElementIds || $[45] !== setStore || $[46] !== shouldDetach || $[47] !== store) {
    t29 = event_0 => {
      const {
        delta
      } = event_0;
      if (!delta || !activeId) {
        onAltDragAborted?.();
        setActiveId(null);
        setOverId(null);
        setDragOverlayOffset({
          x: 0,
          y: 0
        });
        snapTargetsRef.current = null;
        clearSnap();
        return;
      }
      const draggedId = activeId;
      const draggedIds_2 = getDraggedIds(draggedId, selectedElementIds);
      const isMultiDrag = draggedIds_2.size > 1;
      const movedScreen = getPointerDeltaScreen(delta);
      const canvasDelta = {
        x: movedScreen.x / getDragStartScale(),
        y: movedScreen.y / getDragStartScale()
      };
      if (isMultiDrag) {
        if (dropSlot) {
          const sortedDraggedIds = [...draggedIds_2].sort((a_0, b_0) => {
            const ra = dragStartStateRef.current.get(a_0)?.rect;
            const rb = dragStartStateRef.current.get(b_0)?.rect;
            if (!ra || !rb) return 0;
            if (ra.top !== rb.top) return ra.top - rb.top;
            return ra.left - rb.left;
          });
          const reorderOps = [];
          let cursor = store;
          let targetId = dropSlot.targetId;
          let position = dropSlot.position;
          for (const id_3 of sortedDraggedIds) {
            const target = resolveDropTarget(cursor, targetId, position);
            const fromKey = getParentId(cursor, id_3);
            const fromParentId = fromKey === "ROOT" || fromKey === null ? null : fromKey;
            const flowStyleOp = target.parentId && shouldReturnToFlow({
              targetIsFlowLayout: isFlowLayoutElement(target.parentId),
              draggedPosition: getById(cursor, id_3)?.styles?.position,
              movedDeeper: movesDeeper(cursor, fromParentId, target.parentId)
            }) ? createFlowPositionOperation(cursor, id_3) : null;
            if (flowStyleOp) {
              reorderOps.push(flowStyleOp);
              cursor = applyOperationsToStore(cursor, [flowStyleOp]);
            }
            const moveOp = createMoveOperation(cursor, id_3, target.parentId, target.index);
            if (!moveOp) continue;
            reorderOps.push(moveOp);
            cursor = applyOperationsToStore(cursor, [moveOp]);
            targetId = id_3;
            position = "after";
          }
          if (reorderOps.length > 0) {
            setStore(cursor);
            onPushOperations?.(reorderOps);
          }
          setActiveId(null);
          setOverId(null);
          setDropSlot(null);
          setShouldDetach(false);
          setDragOverlayOffset({
            x: 0,
            y: 0
          });
          dragStartStateRef.current.clear();
          return;
        }
        if (Math.abs(canvasDelta.x) < 1 && Math.abs(canvasDelta.y) < 1) {
          onAltDragAborted?.();
          setActiveId(null);
          setOverId(null);
          setShouldDetach(false);
          setDragOverlayOffset({
            x: 0,
            y: 0
          });
          dragStartStateRef.current.clear();
          snapTargetsRef.current = null;
          clearSnap();
          return;
        }
        const startFrame = dragStartFrameRef.current;
        const pointerDeltaCanvas = getSnappedCanvasDelta();
        const newPositions = new Map();
        for (const id_4 of draggedIds_2) {
          const state = dragStartStateRef.current.get(id_4);
          if (!state || !startFrame || !state.rect) continue;
          const start_3 = screenToCanvas({
            x: state.rect.left,
            y: state.rect.top
          }, startFrame);
          const marginX = state.parentId !== null ? state.marginLeft : 0;
          const marginY = state.parentId !== null ? state.marginTop : 0;
          newPositions.set(id_4, {
            x: start_3.x + pointerDeltaCanvas.x - marginX,
            y: start_3.y + pointerDeltaCanvas.y - marginY
          });
        }
        const ops = [];
        let cursor_0 = store;
        for (const id_5 of draggedIds_2) {
          const state_0 = dragStartStateRef.current.get(id_5);
          if (!state_0 || state_0.parentId === null) continue;
          const newPos = newPositions.get(id_5);
          const widthCanvas = state_0.rect ? state_0.rect.width / getDragStartScale() : void 0;
          const heightCanvas = state_0.rect ? state_0.rect.height / getDragStartScale() : void 0;
          const newStyles = positionStylesForParent({
            ...(state_0.styles || {}),
            ...(widthCanvas != null && heightCanvas != null ? DETACH_STYLE_OVERRIDES(widthCanvas, heightCanvas, state_0.styles) : {})
          }, false);
          delete newStyles.left;
          delete newStyles.top;
          delete newStyles.right;
          delete newStyles.bottom;
          delete newStyles.inset;
          const elementOps = [{
            type: "set_styles",
            elementId: id_5,
            oldStyles: state_0.styles,
            newStyles
          }, {
            type: "move",
            elementId: id_5,
            fromParentId: state_0.parentId,
            toParentId: null,
            fromIndex: state_0.index,
            toIndex: getRootIds(cursor_0).length
          }];
          if (newPos) elementOps.push({
            type: "set_position",
            elementId: id_5,
            oldPosition: state_0.position ? {
              ...state_0.position
            } : void 0,
            newPosition: newPos
          });
          ops.push(...elementOps);
          cursor_0 = applyOperationsToStore(cursor_0, elementOps);
        }
        for (const id_6 of draggedIds_2) {
          const state_1 = dragStartStateRef.current.get(id_6);
          if (!state_1 || state_1.parentId !== null) continue;
          const newPos_0 = newPositions.get(id_6);
          const oldPos = state_1.position || {
            x: 0,
            y: 0
          };
          if (newPos_0) {
            const op = {
              type: "set_position",
              elementId: id_6,
              oldPosition: {
                x: oldPos.x,
                y: oldPos.y
              },
              newPosition: newPos_0
            };
            ops.push(op);
            cursor_0 = applyOperationsToStore(cursor_0, [op]);
          }
        }
        if (ops.length > 0) {
          setStore(cursor_0);
          onPushOperations?.(ops);
        }
        setActiveId(null);
        setOverId(null);
        setShouldDetach(false);
        setDragOverlayOffset({
          x: 0,
          y: 0
        });
        dragStartStateRef.current.clear();
        snapTargetsRef.current = null;
        clearSnap();
        return;
      }
      const currentParentKey = getParentId(store, draggedId);
      const currentParentId = currentParentKey === "ROOT" || currentParentKey === null ? null : currentParentKey;
      const draggedPosition = getById(store, draggedId)?.styles?.position;
      const isAbsolutePositioned = draggedPosition === "absolute";
      if (dropSlot && onDragElement) onDragElement(draggedId, dropSlot.targetId, dropSlot.position);else if (overId) {
        const startState = dragStartStateRef.current.get(draggedId);
        const parentBox = getElementPaddingBox(overId, getCamera().scale);
        if (shouldReturnToFlow({
          targetIsFlowLayout: isFlowLayoutElement(overId),
          draggedPosition,
          movedDeeper: movesDeeper(store, currentParentId, overId)
        })) {
          const ops_0 = [];
          let cursor_1 = store;
          const styleOp = createFlowPositionOperation(cursor_1, draggedId);
          if (styleOp) {
            ops_0.push(styleOp);
            cursor_1 = applyOperationsToStore(cursor_1, [styleOp]);
          }
          const moveOp_0 = createMoveOperation(cursor_1, draggedId, overId, getChildren$2(cursor_1, overId).length);
          if (moveOp_0) {
            ops_0.push(moveOp_0);
            cursor_1 = applyOperationsToStore(cursor_1, [moveOp_0]);
          }
          if (ops_0.length > 0) {
            setStore(cursor_1);
            onPushOperations?.(ops_0);
          }
        } else if (startState?.rect && parentBox) {
          const pointerDeltaScreen = getPointerDeltaScreen(delta);
          const startScale = getDragStartScale();
          const canvasDeltaPointer = {
            x: pointerDeltaScreen.x / startScale,
            y: pointerDeltaScreen.y / startScale
          };
          const newStyles_0 = computeAbsoluteOffsetStyles({
            startStyles: positionStylesForParent(startState.styles, false),
            startRect: toLiveRect(startState.rect),
            containingBox: parentBox,
            margins: {
              marginLeft: startState.marginLeft,
              marginTop: startState.marginTop,
              marginRight: startState.marginRight,
              marginBottom: startState.marginBottom
            },
            canvasDelta: canvasDeltaPointer,
            canvasScale: getCamera().scale,
            autoPin: true
          });
          const ops_1 = [];
          const parentEl = getById(store, overId);
          const parentPos = parentEl?.styles?.position;
          if (parentEl && parentPos !== "relative" && parentPos !== "absolute" && parentPos !== "fixed") {
            const parentStyleOp = createSetStylesOperation(store, overId, {
              ...(parentEl.styles || {}),
              position: "relative"
            });
            if (parentStyleOp) ops_1.push(parentStyleOp);
          }
          const selfStyleOp = createSetStylesOperation(store, draggedId, newStyles_0);
          if (selfStyleOp) ops_1.push(selfStyleOp);
          const moveOp_1 = createMoveOperation(store, draggedId, overId, getChildren$2(store, overId).length);
          if (moveOp_1) ops_1.push(moveOp_1);
          if (ops_1.length > 0) {
            setStore(applyOperationsToStore(store, ops_1));
            onPushOperations?.(ops_1);
          }
        } else if (onDragElement) onDragElement(draggedId, overId, "inside");
      } else if (shouldDetach) {
        const startState_0 = dragStartStateRef.current.get(draggedId);
        const startFrame_0 = dragStartFrameRef.current;
        const startRect = startState_0?.rect ?? null;
        if (!startState_0 || startState_0.parentId === null || !startRect || !startFrame_0) {} else {
          const pointerDeltaScreen_0 = getPointerDeltaScreen(delta);
          const marginX_0 = startState_0.marginLeft;
          const marginY_0 = startState_0.marginTop;
          const start_4 = screenToCanvas({
            x: startRect.left,
            y: startRect.top
          }, startFrame_0);
          const newPosition = {
            x: start_4.x + pointerDeltaScreen_0.x / startFrame_0.scale - marginX_0,
            y: start_4.y + pointerDeltaScreen_0.y / startFrame_0.scale - marginY_0
          };
          const widthCanvas_0 = startRect.width / startFrame_0.scale;
          const heightCanvas_0 = startRect.height / startFrame_0.scale;
          const newStyles_1 = positionStylesForParent({
            ...(startState_0.styles || {}),
            ...DETACH_STYLE_OVERRIDES(widthCanvas_0, heightCanvas_0, startState_0.styles)
          }, false);
          delete newStyles_1.left;
          delete newStyles_1.top;
          delete newStyles_1.right;
          delete newStyles_1.bottom;
          delete newStyles_1.inset;
          const detachOps = [{
            type: "set_styles",
            elementId: draggedId,
            oldStyles: startState_0.styles,
            newStyles: newStyles_1
          }, {
            type: "move",
            elementId: draggedId,
            fromParentId: startState_0.parentId,
            toParentId: null,
            fromIndex: startState_0.index,
            toIndex: getRootIds(store).length
          }, {
            type: "set_position",
            elementId: draggedId,
            oldPosition: startState_0.position ? {
              ...startState_0.position
            } : void 0,
            newPosition
          }];
          const nextStore = applyOperationsToStore(store, detachOps);
          setStore(nextStore);
          onPushOperations?.(detachOps);
        }
      } else if (!currentParentId) {
        const startState_1 = dragStartStateRef.current.get(draggedId);
        if (Math.abs(canvasDelta.x) < 1 && Math.abs(canvasDelta.y) < 1) {
          onAltDragAborted?.();
          setActiveId(null);
          setOverId(null);
          setShouldDetach(false);
          setDragOverlayOffset({
            x: 0,
            y: 0
          });
          dragStartStateRef.current.clear();
          snapTargetsRef.current = null;
          clearSnap();
          return;
        }
        const draggedEl = getById(store, draggedId);
        if (draggedEl) {
          const pointerCanvasDelta = getSnappedCanvasDelta();
          const newPos_1 = {
            x: (draggedEl.canvasPosition?.x || 0) + pointerCanvasDelta.x,
            y: (draggedEl.canvasPosition?.y || 0) + pointerCanvasDelta.y
          };
          const oldPos_0 = startState_1?.position || draggedEl.canvasPosition || {
            x: 0,
            y: 0
          };
          if (Math.abs(oldPos_0.x - newPos_1.x) > .1 || Math.abs(oldPos_0.y - newPos_1.y) > .1) {
            const op_0 = {
              type: "set_position",
              elementId: draggedId,
              oldPosition: {
                x: oldPos_0.x,
                y: oldPos_0.y
              },
              newPosition: newPos_1
            };
            setStore(applyOperationsToStore(store, [op_0]));
            onPushOperations?.([op_0]);
          }
        }
      } else if (currentParentId && isAbsolutePositioned) {
        const startState_2 = dragStartStateRef.current.get(draggedId);
        const startRect_0 = startState_2?.rect ?? null;
        const containingBox = getAbsoluteContainingBox(draggedId, getCamera().scale);
        if (startState_2 && startRect_0 && containingBox && (Math.abs(canvasDelta.x) >= 1 || Math.abs(canvasDelta.y) >= 1)) {
          const canvasDeltaPointer_0 = getSnappedCanvasDelta();
          const newStyles_2 = computeAbsoluteOffsetStyles({
            startStyles: startState_2.styles || {},
            startRect: toLiveRect(startRect_0),
            containingBox,
            margins: {
              marginLeft: startState_2.marginLeft,
              marginTop: startState_2.marginTop,
              marginRight: startState_2.marginRight,
              marginBottom: startState_2.marginBottom
            },
            canvasDelta: canvasDeltaPointer_0,
            canvasScale: getCamera().scale,
            autoPin: true
          });
          const op_1 = createSetStylesOperation(store, draggedId, newStyles_2);
          if (op_1) {
            setStore(applyOperationsToStore(store, [op_1]));
            onPushOperations?.([op_1]);
          }
        }
      }
      onAltDragAborted?.();
      setActiveId(null);
      setOverId(null);
      setDropSlot(null);
      setShouldDetach(false);
      setDragOverlayOffset({
        x: 0,
        y: 0
      });
      dragStartStateRef.current.clear();
      snapTargetsRef.current = null;
      clearSnap();
    };
    $[38] = activeId;
    $[39] = dropSlot;
    $[40] = onAltDragAborted;
    $[41] = onDragElement;
    $[42] = onPushOperations;
    $[43] = overId;
    $[44] = selectedElementIds;
    $[45] = setStore;
    $[46] = shouldDetach;
    $[47] = store;
    $[48] = t29;
  } else t29 = $[48];
  const handleDragEnd = t29;
  let t30;
  if ($[49] !== activeId || $[50] !== collectSnapTargets || $[51] !== createAltClones || $[52] !== dragStartRects || $[53] !== onAltDragAborted || $[54] !== onStartAltDrag || $[55] !== selectedElementIds) {
    t30 = altDown => {
      if (!activeId) return false;
      if (altDown && !altCloneIdsRef.current && onStartAltDrag) {
        const promotingIds = getDraggedIds(activeId, selectedElementIds);
        const rects_1 = new Map(dragStartRects);
        const leadClone_0 = createAltClones(promotingIds, activeId, rects_1);
        if (!leadClone_0) return false;
        setDragStartRects(rects_1);
        collectSnapTargets(promotingIds, rects_1);
        clearSnap();
        setActiveId(leadClone_0);
        altToggleSettleRef.current = true;
        return true;
      }
      const preClone = altPreCloneRef.current;
      if (!altDown && altCloneIdsRef.current && preClone) {
        const staleClones = altCloneIdsRef.current;
        onAltDragAborted?.([...preClone.ids]);
        dragStartStateRef.current = new Map(preClone.states);
        altCloneIdsRef.current = null;
        altPreCloneRef.current = null;
        setDragStartRects(preClone.rects);
        collectSnapTargets(preClone.ids, preClone.rects, staleClones);
        clearSnap();
        setActiveId(preClone.lead);
        altToggleSettleRef.current = true;
        return true;
      }
      return false;
    };
    $[49] = activeId;
    $[50] = collectSnapTargets;
    $[51] = createAltClones;
    $[52] = dragStartRects;
    $[53] = onAltDragAborted;
    $[54] = onStartAltDrag;
    $[55] = selectedElementIds;
    $[56] = t30;
  } else t30 = $[56];
  const applyAltToggle = t30;
  const onAltToggle = (0, import_react.useEffectEvent)(applyAltToggle);
  let t31;
  if ($[57] !== activeId || $[58] !== altKeyDownRef || $[59] !== onAltToggle) {
    t31 = () => {
      if (!activeId) return;
      const onAltKey = e_0 => {
        if (e_0.key !== "Alt") return;
        if (altKeyDownRef) altKeyDownRef.current = e_0.altKey;
        onAltToggle(e_0.altKey);
      };
      window.addEventListener("keydown", onAltKey, true);
      window.addEventListener("keyup", onAltKey, true);
      return () => {
        window.removeEventListener("keydown", onAltKey, true);
        window.removeEventListener("keyup", onAltKey, true);
      };
    };
    $[57] = activeId;
    $[58] = altKeyDownRef;
    $[59] = onAltToggle;
    $[60] = t31;
  } else t31 = $[60];
  let t32;
  if ($[61] !== activeId || $[62] !== altKeyDownRef) {
    t32 = [activeId, altKeyDownRef];
    $[61] = activeId;
    $[62] = altKeyDownRef;
    $[63] = t32;
  } else t32 = $[63];
  (0, import_react.useLayoutEffect)(t31, t32);
  let t33;
  if ($[64] !== selectedElementIds || $[65] !== store) {
    t33 = (activeId_0, pointerDeltaScreen_1) => {
      const currentParentKey_0 = getParentId(store, activeId_0);
      const currentParentId_0 = currentParentKey_0 === "ROOT" || currentParentKey_0 === null ? null : currentParentKey_0;
      const activeStartRect = dragStartStateRef.current.get(activeId_0)?.rect ?? getElementRect$1(activeId_0);
      let detachIntent = false;
      if (currentParentId_0) {
        const parentRect = getElementRect$1(currentParentId_0);
        if (activeStartRect && parentRect) {
          const currentRect = {
            left: activeStartRect.left + pointerDeltaScreen_1.x,
            right: activeStartRect.left + activeStartRect.width + pointerDeltaScreen_1.x,
            top: activeStartRect.top + pointerDeltaScreen_1.y,
            bottom: activeStartRect.top + activeStartRect.height + pointerDeltaScreen_1.y,
            width: activeStartRect.width,
            height: activeStartRect.height
          };
          detachIntent = isCompletelyOutside(toLiveHitRect(currentRect), parentRect);
        }
      }
      const pointer_0 = pointerCurrentRef.current;
      const draggedIdsNow = getDraggedIds(activeId_0, selectedElementIds);
      const excludeIds = new Set(draggedIdsNow);
      const draggedPosition_0 = getById(store, activeId_0)?.styles?.position;
      const isOutOfFlow = draggedPosition_0 === "absolute" || draggedPosition_0 === "fixed";
      let slotSet = false;
      if (pointer_0 && activeStartRect && !isOutOfFlow) {
        const draggedCenterX = activeStartRect.left + activeStartRect.width / 2 + pointerDeltaScreen_1.x;
        const draggedCenterY = activeStartRect.top + activeStartRect.height / 2 + pointerDeltaScreen_1.y;
        let flexParentId = null;
        if (currentParentId_0 && isPointerWithinFlexParentCrossAxis(currentParentId_0, draggedCenterX, draggedCenterY, flexCacheRef.current)) flexParentId = currentParentId_0;
        if (!flexParentId) flexParentId = findFlexDropContainer(pointer_0.x, pointer_0.y, excludeIds, isFlexCacheRef.current);
        if (flexParentId && flexParentId !== activeId_0 && !isDescendantInStore(store, activeId_0, flexParentId)) {
          const allChildIds = [...getChildren$2(store, flexParentId)].filter(id_7 => {
            const pos = getById(store, id_7)?.styles?.position;
            return pos !== "absolute" && pos !== "fixed";
          });
          const slotChildIds = allChildIds.filter(id_8 => !excludeIds.has(id_8));
          const slot = getFlexDropSlot({
            parentId: flexParentId,
            allSiblingIds: allChildIds,
            childIds: slotChildIds,
            draggedLeft: activeStartRect.left + pointerDeltaScreen_1.x,
            draggedTop: activeStartRect.top + pointerDeltaScreen_1.y,
            draggedWidth: activeStartRect.width,
            draggedHeight: activeStartRect.height,
            cache: flexCacheRef.current
          });
          if (slot) {
            commitDropSlot(slot);
            setOverId(flexParentId);
            applyFlexReorderPreview({
              parentId: flexParentId,
              draggedId: activeId_0,
              draggedIds: draggedIdsNow,
              draggedWidth: activeStartRect.width,
              draggedHeight: activeStartRect.height,
              allSiblingIds: allChildIds,
              slot,
              cache: flexCacheRef.current,
              canvasScale: getCamera().scale
            });
            slotSet = true;
          }
        }
      }
      if (slotSet) {
        setShouldDetach(false);
        clearSnap();
        return;
      }
      commitDropSlot(null);
      clearFlexReorderPreview(flexCacheRef.current);
      setShouldDetach(detachIntent);
      if (!activeStartRect) {
        setOverId(null);
        clearSnap();
        return;
      }
      const previewRect = {
        left: activeStartRect.left + pointerDeltaScreen_1.x,
        right: activeStartRect.left + activeStartRect.width + pointerDeltaScreen_1.x,
        top: activeStartRect.top + pointerDeltaScreen_1.y,
        bottom: activeStartRect.top + activeStartRect.height + pointerDeltaScreen_1.y,
        width: activeStartRect.width,
        height: activeStartRect.height
      };
      const draggedHitRect = toLiveHitRect(previewRect);
      const nestTarget = resolveNestTarget({
        store,
        draggedId: activeId_0,
        currentParentId: currentParentId_0,
        hasLeftParent: detachIntent,
        candidateIds: candidateIdsUnderPoint(draggedHitRect.left + draggedHitRect.width / 2, draggedHitRect.top + draggedHitRect.height / 2),
        excludeIds: new Set(draggedIdsNow),
        draggedRect: draggedHitRect,
        getRect: getElementRect$1
      });
      setOverId(nestTarget);
      const canFreeMove = !nestTarget && !detachIntent;
      let snapDx = 0;
      let snapDy = 0;
      if (snapTargetsRef.current && canFreeMove && !disableSnapKeyDownRef.current) {
        refreshSnapVisibility();
        const group = draggedIdsNow.size > 1 ? groupStartRectRef.current : null;
        const snapPreview = group ? {
          left: group.left + pointerDeltaScreen_1.x,
          top: group.top + pointerDeltaScreen_1.y,
          width: group.width,
          height: group.height
        } : {
          left: previewRect.left,
          top: previewRect.top,
          width: previewRect.width,
          height: previewRect.height
        };
        const snap = computeSnap(snapPreview, snapTargetsRef.current, void 0, snapMemoryRef.current);
        snapMemoryRef.current = snap.memory;
        snapDx = snap.dx;
        snapDy = snap.dy;
        const guides_1 = [...snap.guidesV.map(_temp$58), ...snap.guidesH.map(_temp2$45)];
        let spMeasures = [];
        let spGuides = [];
        if (!group && snapSiblingRectsRef.current) {
          const sp = computeSpacing({
            left: snapPreview.left + snapDx,
            top: snapPreview.top + snapDy,
            width: snapPreview.width,
            height: snapPreview.height
          }, snapSiblingRectsRef.current);
          if (snapDx === 0) snapDx = snapDx + sp.dx;
          if (snapDy === 0) snapDy = snapDy + sp.dy;
          spMeasures = sp.measures;
          spGuides = sp.guides;
        }
        commitSnap({
          x: snapDx,
          y: snapDy
        }, guides_1);
        commitSpacing(spMeasures, spGuides);
      } else clearSnap();
      if (canFreeMove && currentParentId_0 && getById(store, activeId_0)?.styles?.position === "absolute") commitDragPreviewRect({
        left: previewRect.left + snapDx,
        top: previewRect.top + snapDy,
        width: previewRect.width,
        height: previewRect.height
      });else commitDragPreviewRect(null);
    };
    $[64] = selectedElementIds;
    $[65] = store;
    $[66] = t33;
  } else t33 = $[66];
  const updateDragPreview = t33;
  let t34;
  if ($[67] !== activeId || $[68] !== altKeyDownRef || $[69] !== applyAltToggle || $[70] !== updateDragPreview) {
    t34 = event_1 => {
      const {
        delta: delta_0
      } = event_1;
      if (!activeId || !delta_0) {
        setOverId(null);
        commitDropSlot(null);
        clearSnap();
        return;
      }
      const pointer_1 = pointerCurrentRef.current;
      const camera_0 = getCamera();
      const handled = handledMoveRef.current;
      if (pointer_1 && handled && handled.pointer === pointer_1 && handled.camera === camera_0) return;
      handledMoveRef.current = pointer_1 ? {
        pointer: pointer_1,
        camera: camera_0
      } : null;
      const pointerDeltaScreen_2 = getPointerDeltaScreen(delta_0);
      lastMovePointerRef.current = pointerCurrentRef.current;
      if (applyAltToggle(altKeyDownRef?.current ?? false)) return;
      updateDragPreview(activeId, pointerDeltaScreen_2);
    };
    $[67] = activeId;
    $[68] = altKeyDownRef;
    $[69] = applyAltToggle;
    $[70] = updateDragPreview;
    $[71] = t34;
  } else t34 = $[71];
  const handleDragMove = t34;
  let t35;
  if ($[72] !== handleDragMove) {
    t35 = () => handleDragMove({
      delta: {
        x: 0,
        y: 0
      }
    });
    $[72] = handleDragMove;
    $[73] = t35;
  } else t35 = $[73];
  const runDragMoveNow = (0, import_react.useEffectEvent)(t35);
  let t36;
  if ($[74] !== updateDragPreview) {
    t36 = id_9 => {
      updateDragPreview(id_9, getLastMoveDeltaScreen());
    };
    $[74] = updateDragPreview;
    $[75] = t36;
  } else t36 = $[75];
  const replayLastDragPreview = (0, import_react.useEffectEvent)(t36);
  let t37;
  if ($[76] !== activeId || $[77] !== replayLastDragPreview) {
    t37 = () => {
      if (!activeId || !altToggleSettleRef.current) return;
      altToggleSettleRef.current = false;
      replayLastDragPreview(activeId);
    };
    $[76] = activeId;
    $[77] = replayLastDragPreview;
    $[78] = t37;
  } else t37 = $[78];
  let t38;
  if ($[79] !== activeId || $[80] !== store) {
    t38 = [activeId, store];
    $[79] = activeId;
    $[80] = store;
    $[81] = t38;
  } else t38 = $[81];
  (0, import_react.useLayoutEffect)(t37, t38);
  let t39;
  if ($[82] !== onAltDragAborted) {
    t39 = () => {
      onAltDragAborted?.();
      setActiveId(null);
      setOverId(null);
      setDropSlot(null);
      setShouldDetach(false);
      setDragOverlayOffset({
        x: 0,
        y: 0
      });
      dragStartStateRef.current.clear();
      snapTargetsRef.current = null;
      altCloneIdsRef.current = null;
      altPreCloneRef.current = null;
      clearSnap();
    };
    $[82] = onAltDragAborted;
    $[83] = t39;
  } else t39 = $[83];
  const handleDragCancel = t39;
  let t40;
  if ($[84] !== activeId || $[85] !== store) {
    t40 = activeId ? getById(store, activeId) ?? null : null;
    $[84] = activeId;
    $[85] = store;
    $[86] = t40;
  } else t40 = $[86];
  const activeElement = t40;
  let t41;
  if ($[87] !== activeId || $[88] !== selectedElementIds) {
    t41 = activeId ? getDraggedIds(activeId, selectedElementIds) : EMPTY_DRAGGED_IDS;
    $[87] = activeId;
    $[88] = selectedElementIds;
    $[89] = t41;
  } else t41 = $[89];
  const draggedIds_3 = t41;
  let activeElements;
  if ($[90] !== activeId || $[91] !== draggedIds_3 || $[92] !== store) {
    activeElements = !activeId ? EMPTY_ACTIVE_ELEMENTS : [];
    if (activeId) for (const id_10 of draggedIds_3) {
      const el_0 = getById(store, id_10);
      if (el_0) activeElements.push(el_0);
    }
    $[90] = activeId;
    $[91] = draggedIds_3;
    $[92] = store;
    $[93] = activeElements;
  } else activeElements = $[93];
  let t42;
  let t43;
  if ($[94] !== activeId) {
    t42 = () => {
      if (activeId) return;
      dragStartFrameRef.current = null;
      clearFlexReorderPreview(flexCacheRef.current);
    };
    t43 = [activeId];
    $[94] = activeId;
    $[95] = t42;
    $[96] = t43;
  } else {
    t42 = $[95];
    t43 = $[96];
  }
  (0, import_react.useLayoutEffect)(t42, t43);
  let t44;
  if ($[97] !== activeId || $[98] !== runDragMoveNow || $[99] !== zoomGestureAtRef) {
    t44 = () => {
      if (!activeId) {
        pointerStartRef.current = null;
        pointerCurrentRef.current = null;
        handledMoveRef.current = null;
        return;
      }
      const onMove = e_1 => {
        const p = getPointerCoords(e_1);
        if (p) pointerCurrentRef.current = p;
        if ("metaKey" in e_1) {
          const held = e_1.metaKey || e_1.ctrlKey;
          const lastZoomAt = Math.max(lastZoomAtRef.current, zoomGestureAtRef.current);
          disableSnapKeyDownRef.current = held && performance.now() - lastZoomAt > 400;
        }
        if (p && (e_1.type === "pointermove" || e_1.type === "touchmove")) runDragMoveNow();
      };
      const opts = {
        passive: true,
        capture: true
      };
      window.addEventListener("pointermove", onMove, opts);
      window.addEventListener("pointerup", onMove, opts);
      window.addEventListener("touchmove", onMove, opts);
      window.addEventListener("touchend", onMove, opts);
      return () => {
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", onMove, true);
        window.removeEventListener("touchmove", onMove, true);
        window.removeEventListener("touchend", onMove, true);
      };
    };
    $[97] = activeId;
    $[98] = runDragMoveNow;
    $[99] = zoomGestureAtRef;
    $[100] = t44;
  } else t44 = $[100];
  let t45;
  if ($[101] !== activeId || $[102] !== zoomGestureAtRef) {
    t45 = [activeId, zoomGestureAtRef];
    $[101] = activeId;
    $[102] = zoomGestureAtRef;
    $[103] = t45;
  } else t45 = $[103];
  (0, import_react.useLayoutEffect)(t44, t45);
  let t46;
  if ($[104] !== activeId || $[105] !== draggedIds_3) {
    t46 = activeId ? Array.from(draggedIds_3).sort().join(",") : "";
    $[104] = activeId;
    $[105] = draggedIds_3;
    $[106] = t46;
  } else t46 = $[106];
  const draggedIdsKey = t46;
  let t47;
  let t48;
  if ($[107] !== draggedIdsKey) {
    t47 = () => {
      if (!draggedIdsKey) return;
      const ids = draggedIdsKey.split(",");
      const touched = [];
      for (const id_11 of ids) {
        const el_1 = document.querySelector(`[data-element-id="${id_11}"]`);
        if (el_1) {
          el_1.style.visibility = "hidden";
          el_1.style.pointerEvents = "none";
          touched.push(el_1);
        }
      }
      return () => {
        for (const el_2 of touched) {
          el_2.style.visibility = "";
          el_2.style.pointerEvents = "";
        }
      };
    };
    t48 = [draggedIdsKey];
    $[107] = draggedIdsKey;
    $[108] = t47;
    $[109] = t48;
  } else {
    t47 = $[108];
    t48 = $[109];
  }
  (0, import_react.useLayoutEffect)(t47, t48);
  const t49 = !!activeId;
  let t50;
  if ($[110] !== activeElement || $[111] !== activeElements || $[112] !== activeId || $[113] !== dragOverlayOffset || $[114] !== dragPreviewRect || $[115] !== dragStartAnchor || $[116] !== dragStartRects || $[117] !== draggedIds_3 || $[118] !== dropSlot || $[119] !== handleDragCancel || $[120] !== handleDragEnd || $[121] !== handleDragMove || $[122] !== handleDragStart || $[123] !== overId || $[124] !== snapGuides || $[125] !== snapOffset || $[126] !== spacingGuides || $[127] !== spacingMeasures || $[128] !== t49 || $[129] !== zoomGestureAtRef) {
    t50 = {
      activeId,
      activeElement,
      activeElements,
      draggedIds: draggedIds_3,
      overId,
      dropSlot,
      isDragging: t49,
      dragOverlayOffset,
      zoomGestureAtRef,
      dragStartAnchor,
      dragStartRects,
      snapOffset,
      snapGuides,
      spacingMeasures,
      spacingGuides,
      dragPreviewRect,
      handleDragStart,
      handleDragMove,
      handleDragEnd,
      handleDragCancel
    };
    $[110] = activeElement;
    $[111] = activeElements;
    $[112] = activeId;
    $[113] = dragOverlayOffset;
    $[114] = dragPreviewRect;
    $[115] = dragStartAnchor;
    $[116] = dragStartRects;
    $[117] = draggedIds_3;
    $[118] = dropSlot;
    $[119] = handleDragCancel;
    $[120] = handleDragEnd;
    $[121] = handleDragMove;
    $[122] = handleDragStart;
    $[123] = overId;
    $[124] = snapGuides;
    $[125] = snapOffset;
    $[126] = spacingGuides;
    $[127] = spacingMeasures;
    $[128] = t49;
    $[129] = zoomGestureAtRef;
    $[130] = t50;
  } else t50 = $[130];
  return t50;
}
function _temp2$45(l_0) {
  return {
    axis: "h",
    pos: l_0.pos,
    spanStart: l_0.spanStart,
    spanEnd: l_0.spanEnd
  };
}
function _temp$58(l) {
  return {
    axis: "v",
    pos: l.pos,
    spanStart: l.spanStart,
    spanEnd: l.spanEnd
  };
}

export { useDndCanvas };
