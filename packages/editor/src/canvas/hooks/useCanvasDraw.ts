/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/hooks/useCanvasDraw.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { LOCAL_SHORTCUTS } from "../../shared/shortcuts/catalog";
import { matchesShortcut } from "../../shared/shortcuts/matchShortcut";
import { DEFAULT_TOOL_SIZE, createToolElement, isDrawableTool } from "../../shared/utils/toolElements";
import { isFlowLayoutDisplay, positionStylesForParent } from "../utils/absolutePositioning";
import { countGridColumns$1, orderAdoptedChildren } from "../utils/renderElement";
import { findContainerAt } from "./drawParent";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Tools that swallow what they are drawn over, and how they hold it.
* Frame pins its children in place; the stacks pull them into flow along their
* own axis. Every other drawable tool just draws an overlay.
*/
var ADOPTION_LAYOUT = {
  frame: "absolute",
  "stack-h": "row",
  "stack-v": "column",
  grid: "grid"
};
/** Below this screen-pixel movement a draw is treated as a click (default size). */
var CLICK_THRESHOLD = 4;
/** Screen-space rect for a drag-to-draw gesture; Shift locks it to a square anchored at the start corner. */
function computeDrawRect(start, current, shiftHeld) {
  const rawW = Math.abs(current.x - start.x);
  const rawH = Math.abs(current.y - start.y);
  const width = shiftHeld ? Math.max(rawW, rawH) : rawW;
  const height = shiftHeld ? Math.max(rawW, rawH) : rawH;
  return {
    originX: current.x >= start.x ? start.x : start.x - width,
    originY: current.y >= start.y ? start.y : start.y - height,
    width,
    height
  };
}
/** Nests a drawn element into the host under the drag start (or canvas root). */
function placeDrawnElement(args) {
  const {
    el,
    origin,
    drawStartClient,
    drawnRect,
    canvasRect,
    scale,
    tool,
    onAddElement,
    canHostChild,
    collectAdoptions
  } = args;
  const layout = ADOPTION_LAYOUT[tool];
  const framingRect = layout ? drawnRect : null;
  const container = findContainerAt(drawStartClient.x, drawStartClient.y, el, canHostChild, framingRect ?? void 0);
  const parentId = container?.getAttribute("data-element-id") || null;
  const adopt = framingRect && layout ? toAdoption(collectAdoptions?.(framingRect, parentId, scale), layout) : void 0;
  if (adopt?.layout === "grid") el.styles = {
    ...el.styles,
    gridTemplateColumns: `repeat(${countGridColumns$1(adopt.children)}, 1fr)`
  };
  if (!container) {
    el.canvasPosition = {
      x: Math.round((origin.x - canvasRect.left) / scale),
      y: Math.round((origin.y - canvasRect.top) / scale)
    };
    onAddElement?.(el, {
      atRoot: true,
      adopt
    });
    return;
  }
  const cs = getComputedStyle(container);
  const flowParent = isFlowLayoutDisplay(cs.display);
  el.styles = positionStylesForParent(el.styles, flowParent);
  if (!flowParent) {
    const prect = container.getBoundingClientRect();
    el.styles = {
      ...el.styles,
      left: Math.round((origin.x - prect.left) / scale - parseFloat(cs.borderLeftWidth || "0")),
      top: Math.round((origin.y - prect.top) / scale - parseFloat(cs.borderTopWidth || "0"))
    };
  }
  onAddElement?.(el, {
    parentId: parentId || void 0,
    adopt
  });
}
function toAdoption(children, layout) {
  if (!children || children.length === 0) return void 0;
  return {
    layout,
    children: orderAdoptedChildren(children, layout)
  };
}
function useCanvasDraw(t0) {
  const $ = (0, import_compiler_runtime.c)(23);
  const {
    canvasRef,
    viewportRef,
    transformRef,
    onAddElement,
    setActiveTool,
    onSelectElement,
    suppressNextClick,
    canHostChild,
    collectAdoptions
  } = t0;
  const sessionRef = (0, import_react.useRef)(null);
  const overlayRef = (0, import_react.useRef)(null);
  const badgeRef = (0, import_react.useRef)(null);
  const [mounted, setMounted] = (0, import_react.useState)(false);
  const rafRef = (0, import_react.useRef)(null);
  const moveRef = (0, import_react.useRef)(_temp$59);
  const upRef = (0, import_react.useRef)(_temp2$46);
  const keyRef = (0, import_react.useRef)(_temp3$30);
  const keyUpRef = (0, import_react.useRef)(_temp4$24);
  let t1;
  if ($[0] !== canHostChild || $[1] !== canvasRef || $[2] !== collectAdoptions || $[3] !== onAddElement || $[4] !== onSelectElement || $[5] !== setActiveTool || $[6] !== suppressNextClick || $[7] !== transformRef) {
    t1 = (e, d) => {
      suppressNextClick?.();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const scale = transformRef.current?.instance?.transformState?.scale ?? 1;
        const isClick = Math.abs(e.clientX - d.startClient.x) < CLICK_THRESHOLD && Math.abs(e.clientY - d.startClient.y) < CLICK_THRESHOLD;
        const rect = computeDrawRect(d.startClient, {
          x: e.clientX,
          y: e.clientY
        }, d.shiftHeld);
        const origin = isClick ? d.startClient : {
          x: rect.originX,
          y: rect.originY
        };
        const defaultSize = DEFAULT_TOOL_SIZE[d.tool] ?? {
          width: 200,
          height: 100
        };
        const width = isClick ? defaultSize.width : rect.width / scale;
        const height = isClick ? defaultSize.height : rect.height / scale;
        const el = createToolElement(d.tool, {
          width,
          height
        });
        if (el) {
          placeDrawnElement({
            el,
            origin,
            drawStartClient: d.startClient,
            drawnRect: isClick ? null : {
              left: rect.originX,
              top: rect.originY,
              width: rect.width,
              height: rect.height
            },
            canvasRect,
            scale,
            tool: d.tool,
            onAddElement,
            canHostChild,
            collectAdoptions
          });
          onSelectElement?.(el.id);
        }
      }
      setActiveTool("move");
    };
    $[0] = canHostChild;
    $[1] = canvasRef;
    $[2] = collectAdoptions;
    $[3] = onAddElement;
    $[4] = onSelectElement;
    $[5] = setActiveTool;
    $[6] = suppressNextClick;
    $[7] = transformRef;
    $[8] = t1;
  } else t1 = $[8];
  const finishDraw = (0, import_react.useEffectEvent)(t1);
  let t2;
  if ($[9] !== setActiveTool) {
    t2 = () => {
      setActiveTool("move");
    };
    $[9] = setActiveTool;
    $[10] = t2;
  } else t2 = $[10];
  const cancelDraw = (0, import_react.useEffectEvent)(t2);
  let t3;
  if ($[11] !== cancelDraw || $[12] !== finishDraw || $[13] !== transformRef) {
    t3 = () => {
      const cleanup = () => {
        window.removeEventListener("pointermove", moveRef.current);
        window.removeEventListener("pointerup", upRef.current);
        window.removeEventListener("pointercancel", upRef.current);
        window.removeEventListener("keydown", keyRef.current);
        window.removeEventListener("keyup", keyUpRef.current);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
      const endSession = () => {
        cleanup();
        sessionRef.current = null;
        setMounted(false);
      };
      const scheduleApplyPreview = () => {
        if (rafRef.current === null) rafRef.current = requestAnimationFrame(applyPreview);
      };
      const applyPreview = () => {
        rafRef.current = null;
        const d_0 = sessionRef.current;
        const ov = overlayRef.current;
        if (!d_0 || !ov) return;
        const {
          originX: left,
          originY: top,
          width: w,
          height: h
        } = computeDrawRect({
          x: d_0.startClient.x - d_0.viewportRect.left,
          y: d_0.startClient.y - d_0.viewportRect.top
        }, {
          x: d_0.latestEvent.clientX - d_0.viewportRect.left,
          y: d_0.latestEvent.clientY - d_0.viewportRect.top
        }, d_0.shiftHeld);
        ov.style.left = `${left}px`;
        ov.style.top = `${top}px`;
        ov.style.width = `${w}px`;
        ov.style.height = `${h}px`;
        const badge = badgeRef.current;
        if (badge) {
          const scale_0 = transformRef.current?.instance?.transformState?.scale ?? 1;
          const shown = w > 1 || h > 1;
          badge.style.display = shown ? "block" : "none";
          if (shown) badge.textContent = `${Math.round(w / scale_0)} × ${Math.round(h / scale_0)}`;
        }
      };
      moveRef.current = e_0 => {
        const d_1 = sessionRef.current;
        if (!d_1 || e_0.pointerId !== d_1.pointerId) return;
        d_1.latestEvent = e_0;
        scheduleApplyPreview();
      };
      upRef.current = e_1 => {
        const d_2 = sessionRef.current;
        if (!d_2) return;
        endSession();
        finishDraw(e_1, d_2);
      };
      keyRef.current = e_2 => {
        if (e_2.key === "Shift") {
          if (sessionRef.current) sessionRef.current.shiftHeld = true;
          scheduleApplyPreview();
          return;
        }
        if (!matchesShortcut(e_2, LOCAL_SHORTCUTS.canvas.cancelDraw)) return;
        endSession();
        cancelDraw();
      };
      keyUpRef.current = e_3 => {
        if (e_3.key !== "Shift") return;
        if (sessionRef.current) sessionRef.current.shiftHeld = false;
        scheduleApplyPreview();
      };
      return cleanup;
    };
    $[11] = cancelDraw;
    $[12] = finishDraw;
    $[13] = transformRef;
    $[14] = t3;
  } else t3 = $[14];
  let t4;
  if ($[15] !== canvasRef || $[16] !== transformRef) {
    t4 = [canvasRef, transformRef];
    $[15] = canvasRef;
    $[16] = transformRef;
    $[17] = t4;
  } else t4 = $[17];
  (0, import_react.useEffect)(t3, t4);
  let t5;
  if ($[18] !== viewportRef) {
    t5 = (e_4, tool) => {
      if (!isDrawableTool(tool)) return;
      const viewport = viewportRef.current;
      if (!viewport) return;
      sessionRef.current = {
        startClient: {
          x: e_4.clientX,
          y: e_4.clientY
        },
        viewportRect: viewport.getBoundingClientRect(),
        pointerId: e_4.pointerId,
        tool,
        latestEvent: e_4.nativeEvent,
        shiftHeld: e_4.shiftKey
      };
      setMounted(true);
      window.addEventListener("pointermove", moveRef.current);
      window.addEventListener("pointerup", upRef.current);
      window.addEventListener("pointercancel", upRef.current);
      window.addEventListener("keydown", keyRef.current);
      window.addEventListener("keyup", keyUpRef.current);
    };
    $[18] = viewportRef;
    $[19] = t5;
  } else t5 = $[19];
  const startDraw = t5;
  let t6;
  if ($[20] !== mounted || $[21] !== startDraw) {
    t6 = {
      drawMounted: mounted,
      drawOverlayRef: overlayRef,
      drawBadgeRef: badgeRef,
      startDraw
    };
    $[20] = mounted;
    $[21] = startDraw;
    $[22] = t6;
  } else t6 = $[22];
  return t6;
}
function _temp4$24() {}
function _temp3$30() {}
function _temp2$46() {}
function _temp$59() {}

export { useCanvasDraw };
