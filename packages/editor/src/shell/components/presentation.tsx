import { useVariableRenderStore } from "../../shared/theme/VariableContext";
/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/presentation.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { renderElement } from "../../canvas/utils/renderElement";
import { isTypingTarget, matchesShortcut } from "../../shared/shortcuts/matchShortcut";
import { getParentId } from "@bingo/compiler";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function rootFrameIndex(store, rootIds, startId) {
  if (!startId) return 0;
  const rootSet = new Set(rootIds);
  let cur = startId;
  while (cur) {
    if (rootSet.has(cur)) return Math.max(0, rootIds.indexOf(cur));
    const p = getParentId(store, cur);
    cur = p === "ROOT" || p == null ? null : p;
  }
  return 0;
}
/**
* Paging state shared by both presentation surfaces: resolve the launch element
* to its root frame, track the current index, and wire ←/→ (or the given local
* shortcuts) to step through frames — skipping keystrokes aimed at text inputs.
*/
function useFramePager(t0) {
  const $ = (0, import_compiler_runtime.c)(25);
  const {
    store,
    rootIds,
    startId,
    prevShortcut,
    nextShortcut,
    isDisabled
  } = t0;
  let t1;
  if ($[0] !== rootIds || $[1] !== startId || $[2] !== store) {
    t1 = rootFrameIndex(store, rootIds, startId);
    $[0] = rootIds;
    $[1] = startId;
    $[2] = store;
    $[3] = t1;
  } else t1 = $[3];
  const startIndex = t1;
  const [index, setIndex] = (0, import_react.useState)(startIndex);
  let t2;
  let t3;
  if ($[4] !== startIndex) {
    t2 = () => {
      setIndex(startIndex);
    };
    t3 = [startIndex];
    $[4] = startIndex;
    $[5] = t2;
    $[6] = t3;
  } else {
    t2 = $[5];
    t3 = $[6];
  }
  (0, import_react.useEffect)(t2, t3);
  let t4;
  if ($[7] !== rootIds.length) {
    t4 = delta => {
      setIndex(i => rootIds.length ? (i + delta + rootIds.length) % rootIds.length : 0);
    };
    $[7] = rootIds.length;
    $[8] = t4;
  } else t4 = $[8];
  const go = t4;
  let t5;
  if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = i_0 => setIndex(i_0);
    $[9] = t5;
  } else t5 = $[9];
  const goTo = t5;
  let t6;
  if ($[10] !== isDisabled) {
    t6 = () => isDisabled?.() ?? false;
    $[10] = isDisabled;
    $[11] = t6;
  } else t6 = $[11];
  const disabled = (0, import_react.useEffectEvent)(t6);
  let t7;
  if ($[12] !== disabled || $[13] !== go || $[14] !== nextShortcut || $[15] !== prevShortcut) {
    t7 = () => {
      const onKey = e => {
        if (isTypingTarget(e) || disabled()) return;
        if (matchesShortcut(e, nextShortcut)) {
          e.preventDefault();
          go(1);
        } else if (matchesShortcut(e, prevShortcut)) {
          e.preventDefault();
          go(-1);
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    };
    $[12] = disabled;
    $[13] = go;
    $[14] = nextShortcut;
    $[15] = prevShortcut;
    $[16] = t7;
  } else t7 = $[16];
  let t8;
  if ($[17] !== go || $[18] !== nextShortcut || $[19] !== prevShortcut) {
    t8 = [go, prevShortcut, nextShortcut];
    $[17] = go;
    $[18] = nextShortcut;
    $[19] = prevShortcut;
    $[20] = t8;
  } else t8 = $[20];
  (0, import_react.useEffect)(t7, t8);
  const t9 = rootIds[index];
  let t10;
  if ($[21] !== go || $[22] !== index || $[23] !== t9) {
    t10 = {
      index,
      currentId: t9,
      go,
      goTo
    };
    $[21] = go;
    $[22] = index;
    $[23] = t9;
    $[24] = t10;
  } else t10 = $[24];
  return t10;
}
/**
* Render one frame in presentation mode (no editor wrappers, iframes live).
* Walks the frame tree via renderElement — expensive, so this stays memoized.
*/
function useFrameContent(currentId, store, render) {
  store = useVariableRenderStore(store);
  const $ = (0, import_compiler_runtime.c)(7);
  const {
    components,
    componentIndex,
    iconLibraries,
    assetResolver
  } = render;
  let t0;
  if ($[0] !== assetResolver || $[1] !== componentIndex || $[2] !== components || $[3] !== currentId || $[4] !== iconLibraries || $[5] !== store) {
    t0 = currentId ? renderElement(currentId, store, {
      components,
      componentIndex,
      iconLibraries,
      assetResolver,
      presentationMode: true,
      selectionMode: "deepest",
      isFrameRoot: true
    }) : null;
    $[0] = assetResolver;
    $[1] = componentIndex;
    $[2] = components;
    $[3] = currentId;
    $[4] = iconLibraries;
    $[5] = store;
    $[6] = t0;
  } else t0 = $[6];
  return t0;
}
/**
* Measure the frame's real rendered box (offsetWidth/Height — pre-transform, so
* accurate under the scale() below) and derive a fit-to-WIDTH factor against the
* container: never upscale past 1:1, and let tall frames scroll instead of being
* crushed to fit the height. Reading the layout box beats element.styles.width/
* height, which misses sizes coming from a class, inheritance, or another prop.
* `frameSizeRef` mirrors the size for imperative (per-pointermove) consumers.
*/
function useFitToWidth(ref, containerWidth, resetKey) {
  const $ = (0, import_compiler_runtime.c)(8);
  const [frameSize, setFrameSize] = (0, import_react.useState)(null);
  const frameSizeRef = (0, import_react.useRef)(null);
  let t0;
  if ($[0] !== ref) {
    t0 = () => {
      const node = ref.current;
      if (!node) return;
      const measure = () => {
        const s = {
          w: node.offsetWidth,
          h: node.offsetHeight
        };
        frameSizeRef.current = s;
        setFrameSize(s);
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(node);
      return () => ro.disconnect();
    };
    $[0] = ref;
    $[1] = t0;
  } else t0 = $[1];
  let t1;
  if ($[2] !== ref || $[3] !== resetKey) {
    t1 = [ref, resetKey];
    $[2] = ref;
    $[3] = resetKey;
    $[4] = t1;
  } else t1 = $[4];
  (0, import_react.useLayoutEffect)(t0, t1);
  const fit = frameSize ? Math.min(containerWidth / frameSize.w, 1) : 1;
  let t2;
  if ($[5] !== fit || $[6] !== frameSize) {
    t2 = {
      frameSize,
      frameSizeRef,
      fit
    };
    $[5] = fit;
    $[6] = frameSize;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
/**
* The scaled frame box. The sizer takes the *scaled* footprint (overflow hidden)
* so the flex parent lays out and scrolls against the painted size — transform:
* scale() alone leaves the layout box at natural size, overflowing when the frame
* is wider than the container. Top-left origin keeps the two aligned.
*/
function PresentationFrame(t0) {
  const $ = (0, import_compiler_runtime.c)(13);
  const {
    frameRef,
    sizerRef,
    frameSize,
    fit,
    children
  } = t0;
  let t1;
  if ($[0] !== fit || $[1] !== frameSize) {
    t1 = frameSize ? {
      width: frameSize.w * fit,
      height: frameSize.h * fit,
      flexShrink: 0,
      overflow: "hidden"
    } : void 0;
    $[0] = fit;
    $[1] = frameSize;
    $[2] = t1;
  } else t1 = $[2];
  const t2 = `scale(${fit})`;
  let t3;
  if ($[3] !== t2) {
    t3 = {
      display: "inline-block",
      width: "max-content",
      transform: t2,
      transformOrigin: "top left"
    };
    $[3] = t2;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] !== children || $[6] !== frameRef || $[7] !== t3) {
    t4 = <div ref={frameRef} data-canvas-content={true} style={t3}>{children}</div>;
    $[5] = children;
    $[6] = frameRef;
    $[7] = t3;
    $[8] = t4;
  } else t4 = $[8];
  let t5;
  if ($[9] !== sizerRef || $[10] !== t1 || $[11] !== t4) {
    t5 = <div ref={sizerRef} style={t1}>{t4}</div>;
    $[9] = sizerRef;
    $[10] = t1;
    $[11] = t4;
    $[12] = t5;
  } else t5 = $[12];
  return t5;
}

export { PresentationFrame, useFitToWidth, useFrameContent, useFramePager };
