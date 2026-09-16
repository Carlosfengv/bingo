/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/hooks/useCanvasMarquee.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { LOCAL_SHORTCUTS } from "../../shared/shortcuts/catalog";
import { matchesShortcut } from "../../shared/shortcuts/matchShortcut";
import { publishHover } from "../../shared/state/hoverChannel";
import { getChildren$2, getRootIds } from "@bingo/compiler";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function recursiveMarqueeHitTest(ids, allRects, childrenMap, minX, minY, maxX, maxY, hits) {
  for (const id of ids) {
    const rect = allRects.get(id);
    if (!rect) continue;
    if (rect.right < minX || rect.left > maxX || rect.bottom < minY || rect.top > maxY) continue;
    if (rect.left >= minX && rect.right <= maxX && rect.top >= minY && rect.bottom <= maxY) {
      hits.add(id);
      continue;
    }
    const children = childrenMap.get(id);
    if (children && children.length > 0) recursiveMarqueeHitTest(children, allRects, childrenMap, minX, minY, maxX, maxY, hits);else hits.add(id);
  }
}
function useCanvasMarquee(t0) {
  const $ = (0, import_compiler_runtime.c)(8);
  const {
    onSelectElements
  } = t0;
  let t1;
  if ($[0] !== onSelectElements) {
    t1 = ids => {
      onSelectElements?.(ids);
    };
    $[0] = onSelectElements;
    $[1] = t1;
  } else t1 = $[1];
  const selectElements = (0, import_react.useEffectEvent)(t1);
  const marqueeRef = (0, import_react.useRef)(null);
  const marqueeOverlayRef = (0, import_react.useRef)(null);
  const marqueeHoverContainerRef = (0, import_react.useRef)(null);
  const [marqueeMounted, setMarqueeMounted] = (0, import_react.useState)(false);
  const suppressClickRef = (0, import_react.useRef)(false);
  const handleMarqueePointerMoveRef = (0, import_react.useRef)(_temp$57);
  const handleMarqueePointerUpRef = (0, import_react.useRef)(_temp2$44);
  const handleMarqueeKeydownRef = (0, import_react.useRef)(_temp3$29);
  const marqueeCleanupRef = (0, import_react.useRef)(_temp4$23);
  let t2;
  if ($[2] !== selectElements) {
    t2 = () => {
      const cleanup = () => {
        window.removeEventListener("pointermove", handleMarqueePointerMoveRef.current);
        window.removeEventListener("pointerup", handleMarqueePointerUpRef.current);
        window.removeEventListener("pointercancel", handleMarqueePointerUpRef.current);
        window.removeEventListener("keydown", handleMarqueeKeydownRef.current);
      };
      marqueeCleanupRef.current = cleanup;
      handleMarqueePointerMoveRef.current = e => {
        const m = marqueeRef.current;
        if (!m || e.pointerId !== m.pointerId) return;
        const dx = e.clientX - m.startClient.x;
        const dy = e.clientY - m.startClient.y;
        if (!m.active) {
          if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
          m.active = true;
          setMarqueeMounted(true);
          publishHover(null, "canvas");
        }
        const minX = Math.min(m.startClient.x, e.clientX);
        const minY = Math.min(m.startClient.y, e.clientY);
        const maxX = Math.max(m.startClient.x, e.clientX);
        const maxY = Math.max(m.startClient.y, e.clientY);
        const overlay = marqueeOverlayRef.current;
        if (overlay) {
          overlay.style.left = `${minX - m.viewportRect.left}px`;
          overlay.style.top = `${minY - m.viewportRect.top}px`;
          overlay.style.width = `${maxX - minX}px`;
          overlay.style.height = `${maxY - minY}px`;
        }
        const newHits = new Set();
        if (e.metaKey || e.ctrlKey) recursiveMarqueeHitTest(m.rootIds, m.allRects, m.childrenMap, minX, minY, maxX, maxY, newHits);else {
          let anyLevel1Contained = false;
          for (const rect of m.level1Rects.values()) if (rect.left >= minX && rect.right <= maxX && rect.top >= minY && rect.bottom <= maxY) {
            anyLevel1Contained = true;
            break;
          }
          const testRects = anyLevel1Contained || m.level2Rects.size === 0 ? m.level1Rects : m.level2Rects;
          for (const [id, rect_0] of testRects) if (!(rect_0.right < minX || rect_0.left > maxX || rect_0.bottom < minY || rect_0.top > maxY)) newHits.add(id);
        }
        const finalHits = e.shiftKey ? new Set([...m.baseSelection, ...newHits]) : newHits;
        const container = marqueeHoverContainerRef.current;
        if (container) {
          for (const [id_0, div] of m.hoverOutlines) if (!finalHits.has(id_0)) {
            div.remove();
            m.hoverOutlines.delete(id_0);
          }
          for (const id_1 of finalHits) {
            if (m.hoverOutlines.has(id_1)) continue;
            const rect_1 = m.allRects.get(id_1);
            if (!rect_1) continue;
            const div_0 = document.createElement("div");
            div_0.style.cssText = `position:absolute;left:${rect_1.left - m.viewportRect.left}px;top:${rect_1.top - m.viewportRect.top}px;width:${rect_1.width}px;height:${rect_1.height}px;outline:1px solid var(--ed-canvas-selection);pointer-events:none;`;
            container.appendChild(div_0);
            m.hoverOutlines.set(id_1, div_0);
          }
        }
        m.lastHits = finalHits;
      };
      const armSuppressClick = () => {
        suppressClickRef.current = true;
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      };
      handleMarqueePointerUpRef.current = e_0 => {
        const m_0 = marqueeRef.current;
        if (!m_0 || e_0.pointerId !== m_0.pointerId) return;
        const wasActive = m_0.active;
        for (const div_1 of m_0.hoverOutlines.values()) div_1.remove();
        m_0.hoverOutlines.clear();
        if (wasActive) {
          selectElements([...m_0.lastHits]);
          armSuppressClick();
        }
        marqueeRef.current = null;
        setMarqueeMounted(false);
        cleanup();
      };
      handleMarqueeKeydownRef.current = e_1 => {
        if (!matchesShortcut(e_1, LOCAL_SHORTCUTS.canvas.cancelMarquee)) return;
        const m_1 = marqueeRef.current;
        if (!m_1) return;
        e_1.preventDefault();
        for (const div_2 of m_1.hoverOutlines.values()) div_2.remove();
        m_1.hoverOutlines.clear();
        if (m_1.active) {
          selectElements([...m_1.baseSelection]);
          armSuppressClick();
        }
        marqueeRef.current = null;
        setMarqueeMounted(false);
        cleanup();
      };
      return cleanup;
    };
    $[2] = selectElements;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = [];
    $[4] = t3;
  } else t3 = $[4];
  (0, import_react.useEffect)(t2, t3);
  let t4;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = (e_2, t5) => {
      const {
        store,
        canvasEl,
        viewportRect,
        selectedElementIds
      } = t5;
      const rootIds = getRootIds(store);
      const allRects = new Map();
      const childrenMap = new Map();
      canvasEl?.querySelectorAll("[data-element-id]").forEach(el => {
        const id_2 = el.getAttribute("data-element-id");
        if (!id_2) return;
        let rect_2 = el.getBoundingClientRect();
        if (rect_2.width === 0 && rect_2.height === 0) {
          const child = el.firstElementChild;
          if (child) rect_2 = child.getBoundingClientRect();
        }
        if (rect_2.width > 0 || rect_2.height > 0) allRects.set(id_2, rect_2);
      });
      for (const id_3 of allRects.keys()) {
        const children = getChildren$2(store, id_3);
        if (children.length > 0) childrenMap.set(id_3, children);
      }
      const level1Rects = new Map();
      const level2Rects = new Map();
      for (const id_4 of rootIds) {
        const r = allRects.get(id_4);
        if (r) level1Rects.set(id_4, r);
        const children_0 = childrenMap.get(id_4);
        if (!children_0 || children_0.length === 0) {
          if (r) level2Rects.set(id_4, r);
        } else for (const childId of children_0) {
          const cr = allRects.get(childId);
          if (cr) level2Rects.set(childId, cr);
        }
      }
      marqueeCleanupRef.current();
      marqueeRef.current = {
        startClient: {
          x: e_2.clientX,
          y: e_2.clientY
        },
        baseSelection: new Set(selectedElementIds),
        level1Rects,
        level2Rects,
        allRects,
        childrenMap,
        rootIds,
        viewportRect,
        active: false,
        lastHits: new Set(),
        pointerId: e_2.pointerId,
        hoverOutlines: new Map()
      };
      window.addEventListener("pointermove", handleMarqueePointerMoveRef.current);
      window.addEventListener("pointerup", handleMarqueePointerUpRef.current);
      window.addEventListener("pointercancel", handleMarqueePointerUpRef.current);
      window.addEventListener("keydown", handleMarqueeKeydownRef.current);
    };
    $[5] = t4;
  } else t4 = $[5];
  const startMarquee = t4;
  let t5;
  if ($[6] !== marqueeMounted) {
    t5 = {
      marqueeRef,
      marqueeOverlayRef,
      marqueeHoverContainerRef,
      marqueeMounted,
      suppressClickRef,
      startMarquee
    };
    $[6] = marqueeMounted;
    $[7] = t5;
  } else t5 = $[7];
  return t5;
}
function _temp4$23() {}
function _temp3$29() {}
function _temp2$44() {}
function _temp$57() {}

export { useCanvasMarquee };
