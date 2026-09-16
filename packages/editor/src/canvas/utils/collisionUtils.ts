/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/collisionUtils.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getCamera } from "../../shell/utils/chatShortcuts";
import { accumulatedLinearTransform, invertLinear } from "./transformMatrix";

/**
* Check if element A is fully inside element B
*/
function isFullyInside(rectA, rectB) {
  return rectA.left >= rectB.left && rectA.right <= rectB.right && rectA.top >= rectB.top && rectA.bottom <= rectB.bottom;
}
/**
* Check if element A is completely outside element B
*/
function isCompletelyOutside(rectA, rectB) {
  return rectA.right < rectB.left || rectA.left > rectB.right || rectA.bottom < rectB.top || rectA.top > rectB.bottom;
}
/**
* Topmost canvas element at a screen point, ignoring the DragOverlay.
*
* The overlay renders a copy of the dragged element carrying the SAME
* data-element-id, and the `pointerEvents: 'none'` that is meant to keep it out
* of hit tests only *inherits*. A component whose own markup sets
* `pointer-events` inline outranks it — a WebGL/shader wrapper does exactly
* that — so the copy becomes hit-testable and sits over the canvas. Hit tests
* then land on the copy, the walk-up climbs overlay ancestors that carry no
* element id, and nesting or flex-drop silently never fires.
*
* Skipping the overlay by structure instead of by CSS cannot be defeated by
* whatever a project's components declare. Same rule getElementRect already
* applies when it filters the overlay copy out of its measurements.
*/
function canvasElementFromPoint(clientX, clientY) {
  for (const el of document.elementsFromPoint(clientX, clientY)) if (!el.closest("[data-drag-overlay]")) return el;
  return null;
}
/**
* Get element's bounding rect by its data-element-id
* For elements with display:contents (like component wrappers),
* returns the rect of the first visible child instead.
*/
function getElementRect$1(elementId) {
  const all = document.querySelectorAll(`[data-element-id="${elementId}"]`);
  if (all.length === 0) return null;
  const onCanvas = Array.from(all).filter(el => !el.closest("[data-drag-overlay]"));
  const elements = onCanvas.length > 0 ? onCanvas : Array.from(all);
  if (elements.length > 1) {
    const outerRect = elements[0].getBoundingClientRect();
    const innerRect = elements[elements.length - 1].getBoundingClientRect();
    return new DOMRect(innerRect.left, innerRect.top, outerRect.width, outerRect.height);
  }
  let el = elements[0];
  let style = window.getComputedStyle(el);
  while (style.display === "contents" && el.firstElementChild) {
    el = el.firstElementChild;
    style = window.getComputedStyle(el);
  }
  return el.getBoundingClientRect();
}
/**
* Get canvas viewport bounding rect — the element whose top-left is the screen
* origin of the transformed canvas content (before pan/zoom is applied).
*/
function getCanvasRect() {
  const viewport = document.querySelector("[data-canvas-viewport]");
  return viewport ? viewport.getBoundingClientRect() : null;
}
/**
* Resolve a data-element-id through display:contents wrappers to the first
* element that actually produces a box. Returns null if not in DOM.
*/
function resolveVisibleDomEl(elementId) {
  const el = document.querySelector(`[data-element-id="${elementId}"]`);
  if (!el) return null;
  let node = el;
  let style = window.getComputedStyle(node);
  while (style.display === "contents" && node.firstElementChild) {
    node = node.firstElementChild;
    style = window.getComputedStyle(node);
  }
  return node;
}
/** Read the element's computed margins in CSS pixels. Resolves through display:contents wrappers. */
function getElementComputedMargins(elementId) {
  const node = resolveVisibleDomEl(elementId);
  if (!node) return {
    marginLeft: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0
  };
  const style = window.getComputedStyle(node);
  return {
    marginLeft: parseFloat(style.marginLeft) || 0,
    marginTop: parseFloat(style.marginTop) || 0,
    marginRight: parseFloat(style.marginRight) || 0,
    marginBottom: parseFloat(style.marginBottom) || 0
  };
}
function createFlexSlotCache() {
  return {
    nodeById: new Map(),
    parent: new Map(),
    layout: new Map(),
    touched: new Map(),
    activeParentId: null,
    lastAppliedSlotKey: null
  };
}
function cachedResolveVisibleDomEl(id, cache) {
  if (!cache) return resolveVisibleDomEl(id);
  const hit = cache.nodeById.get(id);
  if (hit !== void 0) return hit;
  const node = resolveVisibleDomEl(id);
  cache.nodeById.set(id, node);
  return node;
}
/**
* Cheap "is this point in the flex parent's cross-axis range?" check. Used by
* useDndCanvas's priority-1 (in-parent reorder) gate — caller passes the
* DRAGGED element's center (not the cursor) so a user grabbing an edge of a
* tall element doesn't slip out of the in-parent path as the cursor wanders
* off cross-axis. Reuses FlexSlotCache for node resolution + style reads;
* getBoundingClientRect is fresh each call because canvas pan shifts the
* parent's screen rect.
*/
function isPointerWithinFlexParentCrossAxis(parentId, x, y, cache) {
  const parentDom = cachedResolveVisibleDomEl(parentId, cache);
  if (!parentDom) return false;
  const pstyle = cachedParentStyle(parentId, parentDom, cache);
  if (!pstyle) return false;
  const r = parentDom.getBoundingClientRect();
  return pstyle.isRow ? y >= r.top && y <= r.bottom && x >= r.left && x <= r.right : x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
function cachedParentStyle(parentId, parentDom, cache) {
  if (cache) {
    const hit = cache.parent.get(parentId);
    if (hit !== void 0) return hit;
  }
  const s = window.getComputedStyle(parentDom);
  if (!s.display.includes("flex")) {
    if (cache) cache.parent.set(parentId, null);
    return null;
  }
  const direction = s.flexDirection || "row";
  const linear = accumulatedLinearTransform(parentDom);
  const info = {
    isRow: direction === "row" || direction === "row-reverse",
    reversed: direction === "row-reverse" || direction === "column-reverse",
    alignItems: s.alignItems || "stretch",
    scaleX: Math.hypot(linear.a, linear.b),
    scaleY: Math.hypot(linear.c, linear.d),
    padL: parseFloat(s.paddingLeft) || 0,
    padR: parseFloat(s.paddingRight) || 0,
    padT: parseFloat(s.paddingTop) || 0,
    padB: parseFloat(s.paddingBottom) || 0,
    bordL: parseFloat(s.borderLeftWidth) || 0,
    bordR: parseFloat(s.borderRightWidth) || 0,
    bordT: parseFloat(s.borderTopWidth) || 0,
    bordB: parseFloat(s.borderBottomWidth) || 0
  };
  if (cache) cache.parent.set(parentId, info);
  return info;
}
/**
* Compute a flex drop slot for a dragged element given a potential parent.
*
* Reads the parent's computed display/flex-direction. If not a flex container,
* returns null (caller falls back to the default "inside" nesting behavior).
*
* Algorithm:
*   - Enumerate children in DOM order, excluding `excludeIds` (dragged + its descendants).
*   - Compute each child's main-axis midpoint.
*   - Flip the slot when the DRAGGED element's midpoint (not the cursor) crosses a
*     sibling's midpoint. Using the cursor made the slot lag by up to the dragged's
*     size: if the user grabbed an edge of a tall element, they'd need to drag the
*     full height past a sibling before the slot flipped.
*   - Build an indicator rect sized to the dragged element, positioned at the slot's
*     main-axis gap start (= prev sibling main-end, or container content start for index 0),
*     aligned on the cross axis per the container's align-items.
*/
function getFlexDropSlot(params) {
  const {
    parentId,
    allSiblingIds,
    childIds,
    draggedLeft,
    draggedTop,
    draggedWidth,
    draggedHeight,
    cache
  } = params;
  const parentDom = cachedResolveVisibleDomEl(parentId, cache);
  if (!parentDom) return null;
  const pstyle = cachedParentStyle(parentId, parentDom, cache);
  if (!pstyle) return null;
  const {
    isRow,
    reversed,
    alignItems
  } = pstyle;
  const parentRect = parentDom.getBoundingClientRect();
  const zoom = getCamera().scale;
  const scaleX = pstyle.scaleX * zoom,
    scaleY = pstyle.scaleY * zoom;
  const contentLeft = parentRect.left + (pstyle.bordL + pstyle.padL) * scaleX;
  const contentTop = parentRect.top + (pstyle.bordT + pstyle.padT) * scaleY;
  const contentRight = parentRect.right - (pstyle.bordR + pstyle.padR) * scaleX;
  const contentBottom = parentRect.bottom - (pstyle.bordB + pstyle.padB) * scaleY;
  const snap = cache ? captureFlexLayout(parentId, allSiblingIds, cache) : null;
  const childRects = [];
  for (const childId of childIds) if (snap && snap.origMainPos.has(childId) && snap.sizes.has(childId)) {
    const mainStart = snap.origMainPos.get(childId) ?? 0;
    const mainSize = snap.sizes.get(childId) ?? 0;
    childRects.push({
      id: childId,
      mainStart,
      mainEnd: mainStart + mainSize
    });
  } else {
    const dom = cachedResolveVisibleDomEl(childId, cache);
    if (!dom) continue;
    const r = dom.getBoundingClientRect();
    const mainStart = isRow ? r.left : r.top;
    const mainSize = isRow ? r.width : r.height;
    childRects.push({
      id: childId,
      mainStart,
      mainEnd: mainStart + mainSize
    });
  }
  childRects.sort((a, b) => a.mainStart - b.mainStart);
  if (childRects.length === 0) {
    const maxW = Math.max(0, contentRight - contentLeft);
    const maxH = Math.max(0, contentBottom - contentTop);
    return {
      targetId: parentId,
      position: "inside",
      indicatorRect: {
        left: contentLeft,
        top: contentTop,
        width: Math.min(draggedWidth, maxW || draggedWidth),
        height: Math.min(draggedHeight, maxH || draggedHeight)
      }
    };
  }
  const draggedMainStart = isRow ? draggedLeft : draggedTop;
  const draggedMainSize = isRow ? draggedWidth : draggedHeight;
  const draggedMainMid = draggedMainStart + draggedMainSize / 2;
  let slotIndex = childRects.length;
  for (let i = 0; i < childRects.length; i++) {
    const c = childRects[i];
    if (draggedMainMid < (c.mainStart + c.mainEnd) / 2) {
      slotIndex = i;
      break;
    }
  }
  const prevChild = slotIndex > 0 ? childRects[slotIndex - 1] : null;
  const nextChild = slotIndex < childRects.length ? childRects[slotIndex] : null;
  let targetId;
  let position;
  if (nextChild) {
    targetId = nextChild.id;
    position = "before";
  } else if (prevChild) {
    targetId = prevChild.id;
    position = "after";
  } else return null;
  const mainStart = prevChild ? prevChild.mainEnd : isRow ? contentLeft : contentTop;
  let crossStart;
  let crossSize;
  const contentCrossStart = isRow ? contentTop : contentLeft;
  const contentCrossEnd = isRow ? contentBottom : contentRight;
  const contentCross = contentCrossEnd - contentCrossStart;
  const draggedCross = isRow ? draggedHeight : draggedWidth;
  if (alignItems === "stretch") {
    crossStart = contentCrossStart;
    crossSize = contentCross > 0 ? contentCross : draggedCross;
  } else if (alignItems === "center") {
    crossStart = contentCrossStart + (contentCross - draggedCross) / 2;
    crossSize = draggedCross;
  } else if (alignItems === "flex-end" || alignItems === "end") {
    crossStart = contentCrossEnd - draggedCross;
    crossSize = draggedCross;
  } else {
    crossStart = contentCrossStart;
    crossSize = draggedCross;
  }
  const indicatorRect = isRow ? {
    left: mainStart,
    top: crossStart,
    width: draggedMainSize,
    height: crossSize
  } : {
    left: crossStart,
    top: mainStart,
    width: crossSize,
    height: draggedMainSize
  };
  if (reversed) position = position === "before" ? "after" : "before";
  return {
    targetId,
    position,
    indicatorRect
  };
}
/**
* Capture sibling sizes + gap once per flex parent per drag. Called lazily by
* applyFlexReorderPreview — idempotent across frames.
*/
function captureFlexLayout(parentId, allSiblingIds, cache) {
  const hit = cache.layout.get(parentId);
  if (hit !== void 0) return hit;
  const parentDom = cachedResolveVisibleDomEl(parentId, cache);
  if (!parentDom) {
    cache.layout.set(parentId, null);
    return null;
  }
  const pstyle = cachedParentStyle(parentId, parentDom, cache);
  if (!pstyle) {
    cache.layout.set(parentId, null);
    return null;
  }
  const cs = window.getComputedStyle(parentDom);
  const gapRaw = pstyle.isRow ? cs.columnGap : cs.rowGap;
  let gap = parseFloat(gapRaw);
  if (isNaN(gap)) gap = parseFloat(cs.gap) || 0;
  const sizes = new Map();
  const origMainPos = new Map();
  const presentIds = [];
  for (const id of allSiblingIds) {
    const dom = cachedResolveVisibleDomEl(id, cache);
    if (!dom) continue;
    const r = dom.getBoundingClientRect();
    sizes.set(id, pstyle.isRow ? r.width : r.height);
    origMainPos.set(id, pstyle.isRow ? r.left : r.top);
    presentIds.push(id);
  }
  const snap = {
    isRow: pstyle.isRow,
    gap: gap * (pstyle.isRow ? pstyle.scaleX : pstyle.scaleY) * getCamera().scale,
    siblingIds: presentIds,
    sizes,
    origMainPos
  };
  cache.layout.set(parentId, snap);
  return snap;
}
/**
* Apply CSS transforms to the flex parent's non-dragged children so they shift
* to reflect the drop order defined by `slot`, animated via `transition:
* transform`. Dragged items stay `visibility:hidden` in their original slots —
* the gap revealed by siblings shifting around them IS the drop preview.
*
* - Siblings shift to make room. Browser composites the transforms on GPU.
* - Only siblings whose delta changed get a new write; already-correct transforms
*   are skipped so active transitions aren't interrupted unnecessarily.
* - On parent switch (cross-container drag), old parent's transforms are cleared
*   before the new parent's transforms are applied.
*/
function applyFlexReorderPreview(params) {
  const {
    parentId,
    draggedId,
    draggedIds,
    draggedWidth,
    draggedHeight,
    allSiblingIds,
    slot,
    cache
  } = params;
  const canvasScale = params.canvasScale && params.canvasScale !== 0 ? params.canvasScale : 1;
  if (cache.activeParentId && cache.activeParentId !== parentId) clearFlexReorderPreview(cache);
  cache.activeParentId = parentId;
  const slotKey = `${parentId}|${draggedId}|${slot.targetId}|${slot.position}`;
  if (cache.lastAppliedSlotKey === slotKey) return;
  cache.lastAppliedSlotKey = slotKey;
  const snap = captureFlexLayout(parentId, allSiblingIds, cache);
  if (!snap) return;
  const draggedMainSize = snap.isRow ? draggedWidth : draggedHeight;
  const isInternalReorder = snap.siblingIds.some(id => draggedIds.has(id));
  const sortedIds = [...snap.siblingIds].sort((a, b) => (snap.origMainPos.get(a) ?? 0) - (snap.origMainPos.get(b) ?? 0));
  const withoutDragged = sortedIds.filter(id => !draggedIds.has(id));
  let insertIdx;
  if (slot.position === "inside") insertIdx = withoutDragged.length;else {
    const targetIdx = withoutDragged.indexOf(slot.targetId);
    if (targetIdx < 0) return;
    insertIdx = slot.position === "before" ? targetIdx : targetIdx + 1;
  }
  const newPos = new Map();
  if (isInternalReorder) {
    const sortedDragged = sortedIds.filter(id => draggedIds.has(id));
    const newVisualOrder = [...withoutDragged.slice(0, insertIdx), ...sortedDragged, ...withoutDragged.slice(insertIdx)];
    const origGaps = [];
    for (let i = 0; i < sortedIds.length - 1; i++) {
      const prev = sortedIds[i];
      const next = sortedIds[i + 1];
      const prevEnd = (snap.origMainPos.get(prev) ?? 0) + (snap.sizes.get(prev) ?? 0);
      const nextStart = snap.origMainPos.get(next) ?? 0;
      origGaps.push(nextStart - prevEnd);
    }
    let cursor = snap.origMainPos.get(sortedIds[0]) ?? 0;
    for (let i = 0; i < newVisualOrder.length; i++) {
      const id = newVisualOrder[i];
      newPos.set(id, cursor);
      cursor += snap.sizes.get(id) ?? 0;
      if (i < newVisualOrder.length - 1) cursor += origGaps[i] ?? 0;
    }
  } else {
    const shift = draggedMainSize + snap.gap;
    for (let i = 0; i < sortedIds.length; i++) {
      const id = sortedIds[i];
      const orig = snap.origMainPos.get(id) ?? 0;
      newPos.set(id, i >= insertIdx ? orig + shift : orig);
    }
  }
  for (const id of snap.siblingIds) {
    if (draggedIds.has(id)) continue;
    const dom = cachedResolveVisibleDomEl(id, cache);
    if (!(dom instanceof HTMLElement || dom instanceof SVGElement)) continue;
    const screenDelta = (newPos.get(id) ?? 0) - (snap.origMainPos.get(id) ?? 0);
    let original = cache.touched.get(dom);
    if (!original) {
      original = {
        transform: dom.style.transform,
        transformPriority: dom.style.getPropertyPriority("transform"),
        transition: dom.style.transition,
        transitionPriority: dom.style.getPropertyPriority("transition"),
        computedTransform: getComputedStyle(dom).transform,
        parentInverse: invertLinear(accumulatedLinearTransform(dom.parentElement))
      };
      cache.touched.set(dom, original);
      dom.style.setProperty("transition", "transform 150ms ease", "important");
    }
    const dx = snap.isRow ? screenDelta / canvasScale : 0;
    const dy = snap.isRow ? 0 : screenDelta / canvasScale;
    const m = original.parentInverse;
    const x = m.a * dx + m.c * dy,
      y = m.b * dx + m.d * dy;
    const base = original.computedTransform === "none" ? "" : original.computedTransform;
    const next = screenDelta === 0 ? base : `translate3d(${x}px, ${y}px, 0) ${base}`.trim();
    if (dom.style.transform !== next) dom.style.setProperty("transform", next, "important");
  }
}
/**
* Remove inline transform/transition written by applyFlexReorderPreview.
* Sets `transition: none` before restoring the original `transform` so the removal is instant —
* after a tree reorder the old transforms correspond to stale DOM positions and
* animating them would cause a visible jump to the wrong spot. Since the pre-drop
* visual already matches the post-drop DOM layout (that's the whole point of the
* preview), an instant clear leaves the scene visually unchanged.
*
* Batched in three passes with a single forced reflow between passes, rather
* than one reflow per sibling.
*/
function clearFlexReorderPreview(cache) {
  if (cache.touched.size > 0) {
    for (const [node, original] of cache.touched) {
      node.style.setProperty("transition", "none", "important");
      node.style.setProperty("transform", original.transform, original.transformPriority);
    }
    const first = cache.touched.keys().next().value;
    if (first) first.getBoundingClientRect();
    for (const [node, original] of cache.touched) node.style.setProperty("transition", original.transition, original.transitionPriority);
    cache.touched.clear();
  }
  cache.activeParentId = null;
  cache.lastAppliedSlotKey = null;
}

export { applyFlexReorderPreview, canvasElementFromPoint, clearFlexReorderPreview, createFlexSlotCache, getCanvasRect, getElementComputedMargins, getElementRect$1, getFlexDropSlot, isCompletelyOutside, isFullyInside, isPointerWithinFlexParentCrossAxis };
