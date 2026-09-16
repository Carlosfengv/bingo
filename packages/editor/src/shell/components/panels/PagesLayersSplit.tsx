/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/PagesLayersSplit.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getPagesPanelSizes } from "./PagePanel";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var STORAGE_KEY = "left-sidebar-v2-pages-height-px-v1";
function readPreferredHeight() {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 40 ? value : null;
  } catch {
    return null;
  }
}
/** Pixel-sized Pages pane. Only an explicit resize replaces content fitting. */
function PagesLayersSplit(t0) {
  const $ = (0, import_compiler_runtime.c)(30);
  const { t } = useTranslation("editor");
  const {
    pages,
    layers,
    pageCount,
    expanded,
    onExpandedChange
  } = t0;
  const pagesId = (0, import_react.useId)();
  const [container, setContainer] = (0, import_react.useState)(null);
  const [sidebarHeight, setSidebarHeight] = (0, import_react.useState)(0);
  const [preferredHeight, setPreferredHeight] = (0, import_react.useState)(readPreferredHeight);
  const drag = (0, import_react.useRef)(null);
  const sizes = getPagesPanelSizes(pageCount, sidebarHeight, preferredHeight);
  const height = expanded ? sizes.height : 40;
  let t1;
  let t2;
  if ($[0] !== container) {
    t1 = () => {
      if (!container) return;
      const update = () => setSidebarHeight(container.clientHeight);
      const observer = new ResizeObserver(update);
      observer.observe(container);
      return () => observer.disconnect();
    };
    t2 = [container];
    $[0] = container;
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  (0, import_react.useLayoutEffect)(t1, t2);
  let t3;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = value => {
      setPreferredHeight(value);
      try {
        if (value === null) localStorage.removeItem(STORAGE_KEY);else localStorage.setItem(STORAGE_KEY, String(value));
      } catch {}
    };
    $[3] = t3;
  } else t3 = $[3];
  const rememberHeight = t3;
  const resize = requestedHeight => {
    if (requestedHeight < (40 + sizes.minHeight) / 2) {
      onExpandedChange(false);
      return;
    }
    onExpandedChange(true);
    rememberHeight(Math.max(sizes.minHeight, Math.min(requestedHeight, sizes.maxHeight)));
  };
  const t4 = "separator";
  const t5 = t("pages.resize");
  const t6 = t("pages.resizeHint");
  const t7 = "horizontal";
  const t8 = 40;
  const t9 = Math.round(sizes.maxHeight);
  const t10 = Math.round(height);
  let t11;
  if ($[4] !== height) {
    t11 = event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        pointerId: event.pointerId,
        y: event.clientY,
        height,
        moved: false
      };
    };
    $[4] = height;
    $[5] = t11;
  } else t11 = $[5];
  let t12;
  if ($[6] !== resize) {
    t12 = event_0 => {
      const start = drag.current;
      if (!start || start.pointerId !== event_0.pointerId) return;
      if (!start.moved && event_0.clientY === start.y) return;
      start.moved = true;
      resize(start.height + event_0.clientY - start.y);
    };
    $[6] = resize;
    $[7] = t12;
  } else t12 = $[7];
  let t13;
  let t14;
  if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
    t13 = event_1 => {
      drag.current = null;
      event_1.currentTarget.releasePointerCapture(event_1.pointerId);
    };
    t14 = () => {
      drag.current = null;
    };
    $[8] = t13;
    $[9] = t14;
  } else {
    t13 = $[8];
    t14 = $[9];
  }
  let t15;
  if ($[10] !== expanded || $[11] !== height || $[12] !== onExpandedChange || $[13] !== resize || $[14] !== sizes) {
    t15 = event_2 => {
      const step = event_2.shiftKey ? 28 : 10;
      bb65: switch (event_2.key) {
        case "ArrowUp":
          resize(height - step);
          break bb65;
        case "ArrowDown":
          resize(height + step);
          break bb65;
        case "Home":
          onExpandedChange(false);
          break bb65;
        case "End":
          resize(sizes.maxHeight);
          break bb65;
        case "Enter":
          onExpandedChange(!expanded);
          break bb65;
        default:
          return;
      }
      event_2.preventDefault();
    };
    $[10] = expanded;
    $[11] = height;
    $[12] = onExpandedChange;
    $[13] = resize;
    $[14] = sizes;
    $[15] = t15;
  } else t15 = $[15];
  let t16;
  if ($[16] !== onExpandedChange || $[17] !== rememberHeight) {
    t16 = () => {
      rememberHeight(null);
      onExpandedChange(true);
    };
    $[16] = onExpandedChange;
    $[17] = rememberHeight;
    $[18] = t16;
  } else t16 = $[18];
  let t17;
  if ($[19] !== pagesId || $[20] !== t10 || $[21] !== t11 || $[22] !== t12 || $[23] !== t15 || $[24] !== t16 || $[25] !== t8 || $[26] !== t9) {
    t17 = <div role={t4} aria-label={t5} title={t6} aria-orientation={t7} aria-controls={pagesId} aria-valuemin={t8} aria-valuemax={t9} aria-valuenow={t10} tabIndex={0} className="relative z-20 h-px shrink-0 touch-none cursor-row-resize bg-transparent outline-none focus-visible:outline-1 focus-visible:outline-ed-border before:absolute before:inset-x-0 before:-inset-y-1" onPointerDown={t11} onPointerMove={t12} onPointerUp={t13} onLostPointerCapture={t14} onKeyDown={t15} onDoubleClick={t16} />;
    $[19] = pagesId;
    $[20] = t10;
    $[21] = t11;
    $[22] = t12;
    $[23] = t15;
    $[24] = t16;
    $[25] = t8;
    $[26] = t9;
    $[27] = t17;
  } else t17 = $[27];
  let t18;
  if ($[28] !== layers) {
    t18 = <div className="min-h-0 flex-1 overflow-hidden">{layers}</div>;
    $[28] = layers;
    $[29] = t18;
  } else t18 = $[29];
  return <div ref={setContainer} className="flex h-full min-h-0 flex-col" data-pages-layers-split="">{<div id={pagesId} className="min-h-0 shrink-0 overflow-hidden" style={{
      height
    }} data-pages-pane="">{pages}</div>}{t17}{t18}</div>;
}

export { PagesLayersSplit };
