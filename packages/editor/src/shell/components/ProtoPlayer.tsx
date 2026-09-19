/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ProtoPlayer.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { LOCAL_SHORTCUTS } from "../../shared/shortcuts/catalog";
import { isTypingTarget, matchesShortcut } from "../../shared/shortcuts/matchShortcut";
import { PresentationFrame, useFitToWidth, useFrameContent, useFramePager } from "./presentation";
import { ResponsivePreview } from "./ResponsivePreview";
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from "lucide-react";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var ZOOM_MIN = .1;
var ZOOM_MAX = 4;
var ZOOM_STEP = 1.25;
var CHROME_HIDE_MS = 2500;
/** True while focus sits inside the played frame — every player control
*  (nav, zoom, pan) yields to the page's own inputs and controls then. */
function contentHasFocus() {
  const active = document.activeElement;
  if (!active || active === document.body) return false;
  return !!active.closest("[data-canvas-content]");
}
/**
* Prototype player: shows ONE root frame at a time on a dark backdrop, scaled to
* fit the viewport width (never upscaled past 1:1) and centered, scrolling when
* taller. Prev/next buttons and ←/→ page through the frames; ⌘±/⌘0/⇧0 and
* Ctrl/Cmd+wheel zoom; Space-hold or middle-mouse drag pans when zoomed in.
* Chrome auto-hides after a moment of stillness and returns on toolbar hover or keypress.
* Rendered by BingoEditor in protoMode, reusing its loaded store/components/
* CSS. Content is rendered in `presentationMode` so real controls stay interactive.
*/
function FixedProtoPlayer(t0) {
  const $ = (0, import_compiler_runtime.c)(126);
  const { t } = useTranslation("editor");
  let pageName;
  let render;
  let rootIds;
  let startId;
  let store;
  if ($[0] !== t0) {
    ({
      store,
      rootIds,
      startId,
      pageName,
      ...render
    } = t0);
    $[0] = t0;
    $[1] = pageName;
    $[2] = render;
    $[3] = rootIds;
    $[4] = startId;
    $[5] = store;
  } else {
    pageName = $[1];
    render = $[2];
    rootIds = $[3];
    startId = $[4];
    store = $[5];
  }
  let t1;
  if ($[6] !== rootIds || $[7] !== startId || $[8] !== store) {
    t1 = {
      store,
      rootIds,
      startId,
      prevShortcut: LOCAL_SHORTCUTS.prototypePlayer.prev,
      nextShortcut: LOCAL_SHORTCUTS.prototypePlayer.next,
      isDisabled: contentHasFocus
    };
    $[6] = rootIds;
    $[7] = startId;
    $[8] = store;
    $[9] = t1;
  } else t1 = $[9];
  const {
    index,
    currentId,
    go
  } = useFramePager(t1);
  let t2;
  let t3;
  if ($[10] !== pageName) {
    t2 = () => {
      if (!pageName) return;
      const prev = document.title;
      document.title = `${pageName} . Bingo`;
      return () => {
        document.title = prev;
      };
    };
    t3 = [pageName];
    $[10] = pageName;
    $[11] = t2;
    $[12] = t3;
  } else {
    t2 = $[11];
    t3 = $[12];
  }
  (0, import_react.useEffect)(t2, t3);
  const [viewportW, setViewportW] = (0, import_react.useState)(_temp$15);
  let t4;
  let t5;
  if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = () => {
      const onResize = () => setViewportW(window.innerWidth);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    };
    t5 = [];
    $[13] = t4;
    $[14] = t5;
  } else {
    t4 = $[13];
    t5 = $[14];
  }
  (0, import_react.useEffect)(t4, t5);
  const surfaceRef = (0, import_react.useRef)(null);
  const frameRef = (0, import_react.useRef)(null);
  const {
    frameSize,
    fit
  } = useFitToWidth(frameRef, viewportW, currentId);
  const frameContent = useFrameContent(currentId, store, render);
  const [zoom, setZoom] = (0, import_react.useState)("fit");
  const [zoomFrameId, setZoomFrameId] = (0, import_react.useState)(currentId);
  if (currentId !== zoomFrameId) {
    setZoomFrameId(currentId);
    setZoom("fit");
  }
  const scale = zoom === "fit" ? fit : zoom;
  const pendingAnchor = (0, import_react.useRef)(null);
  let t6;
  if ($[15] !== fit || $[16] !== scale) {
    t6 = (next, clientX, clientY) => {
      const surface = surfaceRef.current;
      const frameEl = frameRef.current;
      const cur = scale;
      const target = next === "fit" ? fit : Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
      if (surface && frameEl && target !== cur) {
        const rect = surface.getBoundingClientRect();
        const px = clientX ?? rect.left + rect.width / 2;
        const py = clientY ?? rect.top + rect.height / 2;
        const fRect = frameEl.getBoundingClientRect();
        pendingAnchor.current = {
          px,
          py,
          fx: (px - fRect.left) / cur,
          fy: (py - fRect.top) / cur
        };
      }
      setZoom(next === "fit" ? "fit" : target);
    };
    $[15] = fit;
    $[16] = scale;
    $[17] = t6;
  } else t6 = $[17];
  const applyZoom = t6;
  let t7;
  if ($[18] !== applyZoom || $[19] !== scale) {
    t7 = e => {
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      applyZoom(scale * Math.exp(-dy * .002), e.clientX, e.clientY);
    };
    $[18] = applyZoom;
    $[19] = scale;
    $[20] = t7;
  } else t7 = $[20];
  const onWheelZoom = (0, import_react.useEffectEvent)(t7);
  let t8;
  if ($[21] !== applyZoom || $[22] !== scale) {
    t8 = e_0 => {
      if (isTypingTarget(e_0) || contentHasFocus()) return;
      const S = LOCAL_SHORTCUTS.prototypePlayer;
      if (matchesShortcut(e_0, S.zoomIn)) {
        e_0.preventDefault();
        applyZoom(scale * ZOOM_STEP);
      } else if (matchesShortcut(e_0, S.zoomOut)) {
        e_0.preventDefault();
        applyZoom(scale / ZOOM_STEP);
      } else if (matchesShortcut(e_0, S.zoomFitWidth)) {
        e_0.preventDefault();
        applyZoom("fit");
      } else if (matchesShortcut(e_0, S.zoomActual)) {
        e_0.preventDefault();
        applyZoom(1);
      }
    };
    $[21] = applyZoom;
    $[22] = scale;
    $[23] = t8;
  } else t8 = $[23];
  const onKeyZoom = (0, import_react.useEffectEvent)(t8);
  let t10;
  let t9;
  if ($[24] !== scale) {
    t9 = () => {
      const a = pendingAnchor.current;
      const surface_0 = surfaceRef.current;
      const frameEl_0 = frameRef.current;
      if (!a || !surface_0 || !frameEl_0) return;
      pendingAnchor.current = null;
      const fRect_0 = frameEl_0.getBoundingClientRect();
      surface_0.scrollLeft = surface_0.scrollLeft + (fRect_0.left + a.fx * scale - a.px);
      surface_0.scrollTop = surface_0.scrollTop + (fRect_0.top + a.fy * scale - a.py);
    };
    t10 = [scale];
    $[24] = scale;
    $[25] = t10;
    $[26] = t9;
  } else {
    t10 = $[25];
    t9 = $[26];
  }
  (0, import_react.useLayoutEffect)(t9, t10);
  let t11;
  if ($[27] === Symbol.for("react.memo_cache_sentinel")) {
    t11 = () => {
      const surface_1 = surfaceRef.current;
      if (surface_1) {
        surface_1.scrollLeft = 0;
        surface_1.scrollTop = 0;
      }
    };
    $[27] = t11;
  } else t11 = $[27];
  let t12;
  if ($[28] !== currentId) {
    t12 = [currentId];
    $[28] = currentId;
    $[29] = t12;
  } else t12 = $[29];
  (0, import_react.useLayoutEffect)(t11, t12);
  let t13;
  if ($[30] !== onWheelZoom) {
    t13 = () => {
      const surface_2 = surfaceRef.current;
      if (!surface_2) return;
      const onWheel = e_1 => {
        if (!e_1.ctrlKey && !e_1.metaKey) return;
        if (contentHasFocus()) return;
        e_1.preventDefault();
        onWheelZoom(e_1);
      };
      surface_2.addEventListener("wheel", onWheel, {
        passive: false
      });
      return () => surface_2.removeEventListener("wheel", onWheel);
    };
    $[30] = onWheelZoom;
    $[31] = t13;
  } else t13 = $[31];
  let t14;
  if ($[32] !== currentId) {
    t14 = [currentId];
    $[32] = currentId;
    $[33] = t14;
  } else t14 = $[33];
  (0, import_react.useEffect)(t13, t14);
  let t15;
  if ($[34] !== onKeyZoom) {
    t15 = () => {
      const onKey = e_2 => onKeyZoom(e_2);
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    };
    $[34] = onKeyZoom;
    $[35] = t15;
  } else t15 = $[35];
  let t16;
  if ($[36] === Symbol.for("react.memo_cache_sentinel")) {
    t16 = [];
    $[36] = t16;
  } else t16 = $[36];
  (0, import_react.useEffect)(t15, t16);
  let t17;
  if ($[37] === Symbol.for("react.memo_cache_sentinel")) {
    t17 = [];
    $[37] = t17;
  } else t17 = $[37];
  (0, import_react.useEffect)(_temp3$5, t17);
  const [spaceHeld, setSpaceHeld] = (0, import_react.useState)(false);
  const [panning, setPanning] = (0, import_react.useState)(false);
  let t18;
  let t19;
  if ($[38] === Symbol.for("react.memo_cache_sentinel")) {
    t18 = () => {
      const down = e_4 => {
        if (e_4.code !== "Space" || e_4.repeat) return;
        if (isTypingTarget(e_4) || contentHasFocus()) return;
        if (chromeRef.current?.contains(document.activeElement)) return;
        e_4.preventDefault();
        setSpaceHeld(true);
      };
      const up = e_5 => {
        if (e_5.code === "Space") setSpaceHeld(false);
      };
      const cancel = () => setSpaceHeld(false);
      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);
      window.addEventListener("blur", cancel);
      return () => {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
        window.removeEventListener("blur", cancel);
      };
    };
    t19 = [];
    $[38] = t18;
    $[39] = t19;
  } else {
    t18 = $[38];
    t19 = $[39];
  }
  (0, import_react.useEffect)(t18, t19);
  let t20;
  if ($[40] === Symbol.for("react.memo_cache_sentinel")) {
    t20 = (node, e_6) => {
      const surface_3 = surfaceRef.current;
      if (!surface_3) return;
      node.setPointerCapture(e_6.pointerId);
      setPanning(true);
      const sx = e_6.clientX;
      const sy = e_6.clientY;
      const sl = surface_3.scrollLeft;
      const st = surface_3.scrollTop;
      const move = ev => {
        surface_3.scrollLeft = sl - (ev.clientX - sx);
        surface_3.scrollTop = st - (ev.clientY - sy);
      };
      const end = () => {
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerup", end);
        node.removeEventListener("pointercancel", end);
        setPanning(false);
      };
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerup", end);
      node.addEventListener("pointercancel", end);
    };
    $[40] = t20;
  } else t20 = $[40];
  const beginPan = t20;
  let t21;
  if ($[41] === Symbol.for("react.memo_cache_sentinel")) {
    t21 = () => {
      const surface_4 = surfaceRef.current;
      if (!surface_4) return;
      const onPointerDown = e_7 => {
        if (e_7.button !== 1 || contentHasFocus()) return;
        e_7.preventDefault();
        e_7.stopPropagation();
        beginPan(surface_4, e_7);
      };
      surface_4.addEventListener("pointerdown", onPointerDown, {
        capture: true
      });
      return () => surface_4.removeEventListener("pointerdown", onPointerDown, {
        capture: true
      });
    };
    $[41] = t21;
  } else t21 = $[41];
  let t22;
  if ($[42] !== currentId) {
    t22 = [currentId, beginPan];
    $[42] = currentId;
    $[43] = t22;
  } else t22 = $[43];
  (0, import_react.useEffect)(t21, t22);
  const [chromeVisible, setChromeVisible] = (0, import_react.useState)(true);
  const [hintShown, setHintShown] = (0, import_react.useState)(false);
  const chromeVisibleRef = (0, import_react.useRef)(true);
  const chromeRef = (0, import_react.useRef)(null);
  const hideTimer = (0, import_react.useRef)(void 0);
  let t23;
  if ($[44] === Symbol.for("react.memo_cache_sentinel")) {
    t23 = () => {
      const tryHide = () => {
        if (chromeRef.current?.matches(":hover") || chromeRef.current?.contains(document.activeElement)) {
          hideTimer.current = setTimeout(tryHide, CHROME_HIDE_MS);
          return;
        }
        chromeVisibleRef.current = false;
        setChromeVisible(false);
        setHintShown(true);
      };
      tryHide();
    };
    $[44] = t23;
  } else t23 = $[44];
  const hideChrome = t23;
  let t24;
  if ($[45] === Symbol.for("react.memo_cache_sentinel")) {
    t24 = () => {
      if (!chromeVisibleRef.current) {
        chromeVisibleRef.current = true;
        setChromeVisible(true);
      }
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(hideChrome, CHROME_HIDE_MS);
    };
    $[45] = t24;
  } else t24 = $[45];
  const showChrome = t24;
  let t25;
  let t26;
  if ($[46] === Symbol.for("react.memo_cache_sentinel")) {
    t25 = () => {
      hideTimer.current = setTimeout(hideChrome, CHROME_HIDE_MS);
      const onKeyShow = e_8 => {
        if (isTypingTarget(e_8) || contentHasFocus()) return;
        showChrome();
      };
      window.addEventListener("keydown", onKeyShow);
      return () => {
        clearTimeout(hideTimer.current);
        window.removeEventListener("keydown", onKeyShow);
      };
    };
    t26 = [hideChrome, showChrome];
    $[46] = t25;
    $[47] = t26;
  } else {
    t25 = $[46];
    t26 = $[47];
  }
  (0, import_react.useEffect)(t25, t26);
  const [zoomDraft, setZoomDraft] = (0, import_react.useState)(null);
  const zoomBtnRef = (0, import_react.useRef)(null);
  const restoreZoomFocus = (0, import_react.useRef)(false);
  let t27;
  if ($[48] !== applyZoom || $[49] !== zoomDraft) {
    t27 = () => {
      const n = zoomDraft ? parseInt(zoomDraft, 10) : NaN;
      if (Number.isFinite(n) && n > 0) applyZoom(n / 100);
      setZoomDraft(null);
    };
    $[48] = applyZoom;
    $[49] = zoomDraft;
    $[50] = t27;
  } else t27 = $[50];
  const commitZoomDraft = t27;
  let t28;
  let t29;
  if ($[51] !== zoomDraft) {
    t28 = () => {
      if (zoomDraft === null && restoreZoomFocus.current) {
        restoreZoomFocus.current = false;
        zoomBtnRef.current?.focus();
      }
    };
    t29 = [zoomDraft];
    $[51] = zoomDraft;
    $[52] = t28;
    $[53] = t29;
  } else {
    t28 = $[52];
    t29 = $[53];
  }
  (0, import_react.useEffect)(t28, t29);
  const pct = Math.round(scale * 100);
  const chromeCls = chromeVisible ? "opacity-100" : "opacity-0";
  const hintCls = chromeVisible && !hintShown ? "opacity-100" : "opacity-0";
  if (!currentId) {
    let t30;
    if (true) {
      t30 = <p className="text-base font-medium text-ed-background">{t("preview.emptyTitle")}</p>;
      $[54] = t30;
    } else t30 = $[54];
    const t31 = pageName ? t("preview.namedEmpty", { name: pageName }) : t("preview.empty");
    let t32;
    if ($[55] !== t31) {
      t32 = <div>{t30}{<p className="mt-1 text-sm text-ed-background/60">{t31}</p>}</div>;
      $[55] = t31;
      $[56] = t32;
    } else t32 = $[56];
    let t33;
    if (true) {
      t33 = <button type="button" onClick={_temp4$6} className="rounded-md border border-ed-background/20 px-3 py-1.5 text-sm text-ed-background/80 hover:bg-ed-background/10 hover:text-ed-background">{t("common:actions.close")}</button>;
      $[57] = t33;
    } else t33 = $[57];
    let t34;
    if ($[58] !== t32) {
      t34 = <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-ed-foreground text-center">{t32}{t33}</div>;
      $[58] = t32;
      $[59] = t34;
    } else t34 = $[59];
    return t34;
  }
  let t30;
  if (true) {
    t30 = <div className="sr-only" aria-live="polite">{t("preview.zoomStatus", { percent: pct })}</div>;
    $[60] = pct;
    $[61] = t30;
  } else t30 = $[61];
  const t31 = `fixed bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center border border-ed-border bg-ed-background shadow-lg ${chromeCls}`;
  let t32;
  if ($[62] === Symbol.for("react.memo_cache_sentinel")) {
    t32 = {
      gap: 6,
      height: 52,
      paddingLeft: 6,
      paddingRight: 6,
      borderRadius: 12
    };
    $[62] = t32;
  } else t32 = $[62];
  let t33;
  if (true) {
    t33 = rootIds.length > 1 && <>{<button type="button" onClick={() => go(-1)} aria-label={t("preview.previousFrame")} className="flex size-10 items-center justify-center rounded-md text-ed-muted-foreground hover:bg-ed-accent hover:text-ed-foreground">{<ChevronLeft size={20} />}</button>}{<div className="h-6 w-px bg-ed-border" />}</>;
    $[63] = go;
    $[64] = rootIds.length;
    $[65] = t33;
  } else t33 = $[65];
  const t34 = pageName ? `${pageName} · ` : "";
  const t35 = index + 1;
  let t36;
  if ($[66] !== rootIds.length || $[67] !== t34 || $[68] !== t35) {
    t36 = <div aria-live="polite" className="px-2 text-xs font-medium tabular-nums text-ed-muted-foreground">{t34}{t35} / {rootIds.length}</div>;
    $[66] = rootIds.length;
    $[67] = t34;
    $[68] = t35;
    $[69] = t36;
  } else t36 = $[69];
  let t37;
  if (true) {
    t37 = rootIds.length > 1 && <>{<div className="h-6 w-px bg-ed-border" />}{<button type="button" onClick={() => go(1)} aria-label={t("preview.nextFrame")} className="flex size-10 items-center justify-center rounded-md text-ed-muted-foreground hover:bg-ed-accent hover:text-ed-foreground">{<ChevronRight size={20} />}</button>}</>;
    $[70] = go;
    $[71] = rootIds.length;
    $[72] = t37;
  } else t37 = $[72];
  let t38;
  if ($[73] !== t31 || $[74] !== t33 || $[75] !== t36 || $[76] !== t37) {
    t38 = <nav aria-label={t("preview.prototypeFrames")} className={t31} style={t32}>{t33}{t36}{t37}</nav>;
    $[73] = t31;
    $[74] = t33;
    $[75] = t36;
    $[76] = t37;
    $[77] = t38;
  } else t38 = $[77];
  const t39 = `fixed bottom-20 right-4 z-10 flex items-center border border-ed-border bg-ed-background shadow-lg sm:bottom-4 ${chromeCls}`;
  let t40;
  if ($[78] === Symbol.for("react.memo_cache_sentinel")) {
    t40 = {
      gap: 6,
      height: 52,
      paddingLeft: 6,
      paddingRight: 6,
      borderRadius: 12
    };
    $[78] = t40;
  } else t40 = $[78];
  let t41;
  if (true) {
    t41 = Math.round(scale * 100) !== 100 && <>{<button type="button" onClick={() => applyZoom(1)} aria-label={t("preview.zoomTo100")} className="flex size-10 items-center justify-center rounded-md text-ed-muted-foreground hover:bg-ed-accent hover:text-ed-foreground">{<RotateCcw size={15} />}</button>}{<div className="h-6 w-px bg-ed-border" />}</>;
    $[79] = applyZoom;
    $[80] = scale;
    $[81] = t41;
  } else t41 = $[81];
  let t42;
  if ($[82] !== applyZoom || $[83] !== scale) {
    t42 = () => applyZoom(scale / ZOOM_STEP);
    $[82] = applyZoom;
    $[83] = scale;
    $[84] = t42;
  } else t42 = $[84];
  const t43 = pct <= Math.round(ZOOM_MIN * 100);
  let t44;
  if ($[85] === Symbol.for("react.memo_cache_sentinel")) {
    t44 = <Minus size={16} />;
    $[85] = t44;
  } else t44 = $[85];
  let t45;
  if (true) {
    t45 = <button type="button" onClick={t42} aria-label={t("preview.zoomOut")} disabled={t43} className="flex size-10 items-center justify-center rounded-md text-ed-muted-foreground hover:bg-ed-accent hover:text-ed-foreground disabled:opacity-40 disabled:pointer-events-none">{t44}</button>;
    $[86] = t42;
    $[87] = t43;
    $[88] = t45;
  } else t45 = $[88];
  let t46;
  if ($[89] !== commitZoomDraft || $[90] !== pct || $[91] !== scale || $[92] !== zoomDraft) {
    t46 = zoomDraft !== null ? <input autoFocus={true} value={zoomDraft} onChange={e_9 => setZoomDraft(e_9.target.value.replace(/\D/g, ""))} onFocus={_temp5$3} onBlur={commitZoomDraft} onKeyDown={e_11 => {
      if (e_11.key === "Enter" && !e_11.nativeEvent.isComposing) {
        e_11.preventDefault();
        restoreZoomFocus.current = true;
        commitZoomDraft();
      } else if (e_11.key === "Escape") {
        e_11.preventDefault();
        restoreZoomFocus.current = true;
        setZoomDraft(null);
      }
    }} aria-label={t("preview.zoomPercentage")} inputMode="numeric" className="h-10 w-14 rounded-md border border-ed-border bg-transparent text-center text-xs font-medium tabular-nums text-ed-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ed-ring" /> : <button ref={zoomBtnRef} type="button" onClick={() => setZoomDraft(String(Math.round(scale * 100)))} aria-label={t("preview.editZoom", { percent: pct })} className="flex h-10 items-center rounded-md px-1.5 text-xs font-medium tabular-nums text-ed-muted-foreground hover:bg-ed-accent hover:text-ed-foreground">{pct}%</button>;
    $[89] = commitZoomDraft;
    $[90] = pct;
    $[91] = scale;
    $[92] = zoomDraft;
    $[93] = t46;
  } else t46 = $[93];
  let t47;
  if ($[94] !== applyZoom || $[95] !== scale) {
    t47 = () => applyZoom(scale * ZOOM_STEP);
    $[94] = applyZoom;
    $[95] = scale;
    $[96] = t47;
  } else t47 = $[96];
  const t48 = pct >= Math.round(400);
  let t49;
  if ($[97] === Symbol.for("react.memo_cache_sentinel")) {
    t49 = <Plus size={16} />;
    $[97] = t49;
  } else t49 = $[97];
  let t50;
  if (true) {
    t50 = <button type="button" onClick={t47} aria-label={t("preview.zoomIn")} disabled={t48} className="flex size-10 items-center justify-center rounded-md text-ed-muted-foreground hover:bg-ed-accent hover:text-ed-foreground disabled:opacity-40 disabled:pointer-events-none">{t49}</button>;
    $[98] = t47;
    $[99] = t48;
    $[100] = t50;
  } else t50 = $[100];
  let t51;
  if ($[101] !== t39 || $[102] !== t41 || $[103] !== t45 || $[104] !== t46 || $[105] !== t50) {
    t51 = <div role="toolbar" aria-label={t("preview.zoomToolbar")} className={t39} style={t40}>{t41}{t45}{t46}{t50}</div>;
    $[101] = t39;
    $[102] = t41;
    $[103] = t45;
    $[104] = t46;
    $[105] = t50;
    $[106] = t51;
  } else t51 = $[106];
  const t52 = `pointer-events-none fixed bottom-20 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-xs text-ed-muted-foreground max-sm:bottom-40 ${hintCls}`;
  let t53;
  if (true) {
    t53 = <div aria-hidden={true} className={t52}>{t("preview.panHint")}</div>;
    $[107] = t52;
    $[108] = t53;
  } else t53 = $[108];
  let t54;
  if ($[109] !== t38 || $[110] !== t51 || $[111] !== t53) {
    t54 = <div ref={chromeRef} onPointerEnter={showChrome}>{t38}{t51}{t53}</div>;
    $[109] = t38;
    $[110] = t51;
    $[111] = t53;
    $[112] = t54;
  } else t54 = $[112];
  let t55;
  if ($[113] === Symbol.for("react.memo_cache_sentinel")) {
    t55 = {
      scrollbarWidth: "none",
      alignItems: "safe center",
      justifyContent: "safe center"
    };
    $[113] = t55;
  } else t55 = $[113];
  let t56;
  if ($[114] !== frameContent || $[115] !== frameSize || $[116] !== scale) {
    t56 = <div ref={surfaceRef} data-proto-surface={true} className="flex w-screen h-screen bg-[#1e1e1e] overflow-auto" style={t55}>{<PresentationFrame frameRef={frameRef} frameSize={frameSize} fit={scale}>{frameContent}</PresentationFrame>}</div>;
    $[114] = frameContent;
    $[115] = frameSize;
    $[116] = scale;
    $[117] = t56;
  } else t56 = $[117];
  let t57;
  if ($[118] !== panning || $[119] !== spaceHeld) {
    t57 = (spaceHeld || panning) && <div className="fixed inset-0 z-[5]" style={{
      cursor: panning ? "grabbing" : "grab"
    }} onPointerDown={e_12 => {
      e_12.preventDefault();
      beginPan(e_12.currentTarget, e_12);
    }} />;
    $[118] = panning;
    $[119] = spaceHeld;
    $[120] = t57;
  } else t57 = $[120];
  let t58;
  if ($[121] !== t30 || $[122] !== t54 || $[123] !== t56 || $[124] !== t57) {
    t58 = <>{t30}{t54}{t56}{t57}</>;
    $[121] = t30;
    $[122] = t54;
    $[123] = t56;
    $[124] = t57;
    $[125] = t58;
  } else t58 = $[125];
  return t58;
}
function _temp5$3(e_10) {
  return e_10.currentTarget.select();
}
function _temp4$6() {
  return window.close();
}
function _temp3$5() {
  const onKey_0 = _temp2$8;
  window.addEventListener("keydown", onKey_0);
  return () => window.removeEventListener("keydown", onKey_0);
}
function _temp2$8(e_3) {
  if (e_3.key !== "Escape" || !contentHasFocus()) return;
  document.activeElement?.blur();
}
function _temp$15() {
  return typeof window !== "undefined" ? window.innerWidth : 1280;
}

function ProtoPlayer({ store, rootIds, startId, pageName, ...render }) {
  const { t } = useTranslation("editor");
  const [responsive, setResponsive] = import_react.useState(true);
  const { currentId, index, go } = useFramePager({
    store, rootIds, startId, prevShortcut: LOCAL_SHORTCUTS.prototypePlayer.prev,
    nextShortcut: LOCAL_SHORTCUTS.prototypePlayer.next, isDisabled: () => !responsive
  });
  const content = useFrameContent(currentId, store, render, true);
  import_react.useEffect(() => {
    document.title = `${pageName || t("preview.title")} · Bingo`;
  }, [pageName, t]);
  return <div className="h-screen w-screen overflow-hidden">
    {responsive ? (currentId ? <ResponsivePreview title={t("preview.title")} onKeyDown={event => {
      if (event.defaultPrevented || isTypingTarget(event)) return;
      if (event.key === "ArrowRight") { event.preventDefault(); go(1); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); go(-1); }
    }}>{content}</ResponsivePreview>
      : <div className="flex h-full items-center justify-center">{t("preview.empty")}</div>)
      : <FixedProtoPlayer store={store} rootIds={rootIds} startId={currentId} pageName={pageName} {...render} />}
    <nav aria-label={t("preview.prototypeFrames")} className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-ed-border bg-ed-background p-2 text-xs text-ed-foreground shadow-lg">
      {responsive && rootIds.length > 1 && <>
        <button type="button" onClick={() => go(-1)} aria-label={t("preview.previousFrame")}><ChevronLeft size={18} /></button>
        <span>{index + 1} / {rootIds.length}</span>
        <button type="button" onClick={() => go(1)} aria-label={t("preview.nextFrame")}><ChevronRight size={18} /></button>
      </>}
      <button type="button" onClick={() => setResponsive(value => !value)} aria-pressed={responsive}>
        {t(responsive ? "preview.responsive" : "preview.originalSize")}
      </button>
    </nav>
  </div>;
}

export { ProtoPlayer };
