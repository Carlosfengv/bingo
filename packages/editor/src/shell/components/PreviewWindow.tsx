/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/PreviewWindow.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { LOCAL_SHORTCUTS } from "../../shared/shortcuts/catalog";
import { PresentationFrame, useFitToWidth, useFrameContent, useFramePager } from "./presentation";
import { ArrowUpRight, ChevronLeft, ChevronRight, RotateCcw, X as X$2 } from "lucide-react";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var MIN_W = 280;
var MIN_H = 160;
/**
* Shift+Space preview: a small, draggable, resizable floating window (dark title bar with
* prev/next, restart, pop-out, close) showing one root frame fit-to-width. Rendered over
* the editor by BingoEditor; reuses the loaded store/components/CSS. The full-screen
* present lives in ProtoPlayer (the /proto route).
*/
function PreviewWindow(t0) {
  const $ = (0, import_compiler_runtime.c)(85);
  const { t } = useTranslation("editor");
  let onClose;
  let onPopOut;
  let render;
  let rootIds;
  let startId;
  let store;
  if ($[0] !== t0) {
    ({
      store,
      rootIds,
      startId,
      onClose,
      onPopOut,
      ...render
    } = t0);
    $[0] = t0;
    $[1] = onClose;
    $[2] = onPopOut;
    $[3] = render;
    $[4] = rootIds;
    $[5] = startId;
    $[6] = store;
  } else {
    onClose = $[1];
    onPopOut = $[2];
    render = $[3];
    rootIds = $[4];
    startId = $[5];
    store = $[6];
  }
  let t1;
  if ($[7] !== rootIds || $[8] !== startId || $[9] !== store) {
    t1 = {
      store,
      rootIds,
      startId,
      prevShortcut: LOCAL_SHORTCUTS.previewWindow.prev,
      nextShortcut: LOCAL_SHORTCUTS.previewWindow.next
    };
    $[7] = rootIds;
    $[8] = startId;
    $[9] = store;
    $[10] = t1;
  } else t1 = $[10];
  const {
    index,
    currentId,
    go,
    goTo
  } = useFramePager(t1);
  let t2;
  if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = {
      w: 686,
      h: 427
    };
    $[11] = t2;
  } else t2 = $[11];
  const [size, setSize] = (0, import_react.useState)(t2);
  let t3;
  if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = {
      x: 96,
      y: 96
    };
    $[12] = t3;
  } else t3 = $[12];
  const [pos, setPos] = (0, import_react.useState)(t3);
  let t4;
  if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = {
      x: 96,
      y: 96
    };
    $[13] = t4;
  } else t4 = $[13];
  const posRef = (0, import_react.useRef)(t4);
  const winRef = (0, import_react.useRef)(null);
  const bodyRef = (0, import_react.useRef)(null);
  const sizerRef = (0, import_react.useRef)(null);
  const frameScaleRef = (0, import_react.useRef)(null);
  const {
    frameSize,
    frameSizeRef,
    fit
  } = useFitToWidth(frameScaleRef, size.w, currentId);
  const frameContent = useFrameContent(currentId, store, render);
  let t5;
  let t6;
  if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = () => {
      winRef.current?.focus();
    };
    t6 = [];
    $[14] = t5;
    $[15] = t6;
  } else {
    t5 = $[14];
    t6 = $[15];
  }
  (0, import_react.useEffect)(t5, t6);
  let t7;
  if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = e => {
      if (e.target.closest("button")) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = posRef.current.x;
      const origY = posRef.current.y;
      const move = ev => {
        const x = origX + (ev.clientX - startX);
        const y = origY + (ev.clientY - startY);
        posRef.current = {
          x,
          y
        };
        const node = winRef.current;
        if (node) {
          node.style.left = `${x}px`;
          node.style.top = `${y}px`;
        }
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", cleanup);
        window.removeEventListener("pointercancel", cleanup);
        setPos(posRef.current);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", cleanup);
      window.addEventListener("pointercancel", cleanup);
    };
    $[16] = t7;
  } else t7 = $[16];
  const onTitleDown = t7;
  let t8;
  if ($[17] !== frameSizeRef || $[18] !== size.h || $[19] !== size.w) {
    t8 = (e_0, dirs) => {
      e_0.preventDefault();
      e_0.stopPropagation();
      const startX_0 = e_0.clientX;
      const startY_0 = e_0.clientY;
      const origW = size.w;
      const origH = size.h;
      const origX_0 = posRef.current.x;
      const origY_0 = posRef.current.y;
      const calc = ev_0 => {
        const dx = ev_0.clientX - startX_0;
        const dy = ev_0.clientY - startY_0;
        let newW = origW;
        let newH = origH;
        let newX = origX_0;
        if (dirs.e) newW = Math.max(MIN_W, origW + dx);
        if (dirs.w) {
          newW = Math.max(MIN_W, origW - dx);
          newX = origX_0 + (origW - newW);
        }
        if (dirs.s) newH = Math.max(MIN_H, origH + dy);
        return {
          newW,
          newH,
          newX
        };
      };
      const move_0 = ev_1 => {
        const {
          newW: newW_0,
          newH: newH_0,
          newX: newX_0
        } = calc(ev_1);
        if (dirs.w) posRef.current = {
          x: newX_0,
          y: origY_0
        };
        const win = winRef.current;
        if (win) {
          win.style.width = `${newW_0}px`;
          win.style.left = `${newX_0}px`;
        }
        const body = bodyRef.current;
        if (body) {
          body.style.width = `${newW_0}px`;
          body.style.height = `${newH_0}px`;
        }
        const fs = frameSizeRef.current;
        const f = fs ? Math.min(newW_0 / fs.w, 1) : 1;
        const sizer = sizerRef.current;
        if (sizer && fs) {
          sizer.style.width = `${fs.w * f}px`;
          sizer.style.height = `${fs.h * f}px`;
        }
        const scale = frameScaleRef.current;
        if (scale) scale.style.transform = `scale(${f})`;
      };
      const up = ev_2 => {
        const {
          newW: newW_1,
          newH: newH_1,
          newX: newX_1
        } = calc(ev_2);
        setSize({
          w: newW_1,
          h: newH_1
        });
        if (dirs.w) {
          posRef.current = {
            x: newX_1,
            y: origY_0
          };
          setPos({
            x: newX_1,
            y: origY_0
          });
        }
        cleanup_0();
      };
      const cleanup_0 = () => {
        window.removeEventListener("pointermove", move_0);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cleanup_0);
      };
      window.addEventListener("pointermove", move_0);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cleanup_0);
    };
    $[17] = frameSizeRef;
    $[18] = size.h;
    $[19] = size.w;
    $[20] = t8;
  } else t8 = $[20];
  const startResize = t8;
  let t9;
  if ($[21] !== pos.x || $[22] !== pos.y || $[23] !== size.w) {
    t9 = {
      left: pos.x,
      top: pos.y,
      width: size.w
    };
    $[21] = pos.x;
    $[22] = pos.y;
    $[23] = size.w;
    $[24] = t9;
  } else t9 = $[24];
  let t10;
  if ($[25] !== go) {
    t10 = () => go(-1);
    $[25] = go;
    $[26] = t10;
  } else t10 = $[26];
  let t11;
  if ($[27] === Symbol.for("react.memo_cache_sentinel")) {
    t11 = <ChevronLeft size={16} />;
    $[27] = t11;
  } else t11 = $[27];
  let t12;
  if (true) {
    t12 = <button type="button" className="flex size-7 items-center justify-center rounded text-ed-background/70 hover:bg-ed-background/10 hover:text-ed-background" onClick={t10} aria-label={t("preview.previousFrame")}>{t11}</button>;
    $[28] = t10;
    $[29] = t12;
  } else t12 = $[29];
  let t13;
  if ($[30] !== go) {
    t13 = () => go(1);
    $[30] = go;
    $[31] = t13;
  } else t13 = $[31];
  let t14;
  if ($[32] === Symbol.for("react.memo_cache_sentinel")) {
    t14 = <ChevronRight size={16} />;
    $[32] = t14;
  } else t14 = $[32];
  let t15;
  if (true) {
    t15 = <button type="button" className="flex size-7 items-center justify-center rounded text-ed-background/70 hover:bg-ed-background/10 hover:text-ed-background" onClick={t13} aria-label={t("preview.nextFrame")}>{t14}</button>;
    $[33] = t13;
    $[34] = t15;
  } else t15 = $[34];
  let t16;
  if ($[35] !== goTo) {
    t16 = () => goTo(0);
    $[35] = goTo;
    $[36] = t16;
  } else t16 = $[36];
  let t17;
  if ($[37] === Symbol.for("react.memo_cache_sentinel")) {
    t17 = <RotateCcw size={15} />;
    $[37] = t17;
  } else t17 = $[37];
  let t18;
  if (true) {
    t18 = <button type="button" className="flex size-7 items-center justify-center rounded text-ed-background/70 hover:bg-ed-background/10 hover:text-ed-background" onClick={t16} aria-label={t("preview.restart")}>{t17}</button>;
    $[38] = t16;
    $[39] = t18;
  } else t18 = $[39];
  const t19 = index + 1;
  let t20;
  if ($[40] !== rootIds.length || $[41] !== t19) {
    t20 = <div className="px-1.5 text-[11px] font-medium tabular-nums text-ed-background/70">{t19} / {rootIds.length}</div>;
    $[40] = rootIds.length;
    $[41] = t19;
    $[42] = t20;
  } else t20 = $[42];
  let t21;
  if ($[43] === Symbol.for("react.memo_cache_sentinel")) {
    t21 = <div className="flex-1" />;
    $[43] = t21;
  } else t21 = $[43];
  let t22;
  if (true) {
    t22 = onPopOut && <button type="button" className="flex size-7 items-center justify-center rounded text-ed-background/70 hover:bg-ed-background/10 hover:text-ed-background" onClick={onPopOut} aria-label={t("preview.openFull")}>{<ArrowUpRight size={16} />}</button>;
    $[44] = onPopOut;
    $[45] = t22;
  } else t22 = $[45];
  let t23;
  if ($[46] === Symbol.for("react.memo_cache_sentinel")) {
    t23 = <X$2 size={16} />;
    $[46] = t23;
  } else t23 = $[46];
  let t24;
  if (true) {
    t24 = <button type="button" className="flex size-7 items-center justify-center rounded text-ed-background/70 hover:bg-ed-background/10 hover:text-ed-background" onClick={onClose} aria-label={t("preview.close")}>{t23}</button>;
    $[47] = onClose;
    $[48] = t24;
  } else t24 = $[48];
  let t25;
  if ($[49] !== t12 || $[50] !== t15 || $[51] !== t18 || $[52] !== t20 || $[53] !== t22 || $[54] !== t24) {
    t25 = <div onPointerDown={onTitleDown} className="flex h-9 items-center gap-0.5 bg-ed-foreground px-1.5 cursor-grab">{t12}{t15}{t18}{t20}{t21}{t22}{t24}</div>;
    $[49] = t12;
    $[50] = t15;
    $[51] = t18;
    $[52] = t20;
    $[53] = t22;
    $[54] = t24;
    $[55] = t25;
  } else t25 = $[55];
  let t26;
  if ($[56] !== size.h || $[57] !== size.w) {
    t26 = {
      width: size.w,
      height: size.h,
      scrollbarWidth: "none",
      alignItems: "safe center"
    };
    $[56] = size.h;
    $[57] = size.w;
    $[58] = t26;
  } else t26 = $[58];
  let t27;
  if ($[59] !== fit || $[60] !== frameContent || $[61] !== frameSize) {
    t27 = <PresentationFrame frameRef={frameScaleRef} sizerRef={sizerRef} frameSize={frameSize} fit={fit}>{frameContent}</PresentationFrame>;
    $[59] = fit;
    $[60] = frameContent;
    $[61] = frameSize;
    $[62] = t27;
  } else t27 = $[62];
  let t28;
  if ($[63] !== t26 || $[64] !== t27) {
    t28 = <div ref={bodyRef} className="flex justify-center overflow-auto bg-[#1e1e1e]" style={t26}>{t27}</div>;
    $[63] = t26;
    $[64] = t27;
    $[65] = t28;
  } else t28 = $[65];
  let t29;
  if ($[66] !== startResize) {
    t29 = <div className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize" onPointerDown={e_1 => startResize(e_1, {
      e: true
    })} />;
    $[66] = startResize;
    $[67] = t29;
  } else t29 = $[67];
  let t30;
  if ($[68] !== startResize) {
    t30 = <div className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize" onPointerDown={e_2 => startResize(e_2, {
      w: true
    })} />;
    $[68] = startResize;
    $[69] = t30;
  } else t30 = $[69];
  let t31;
  if ($[70] !== startResize) {
    t31 = <div className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize" onPointerDown={e_3 => startResize(e_3, {
      s: true
    })} />;
    $[70] = startResize;
    $[71] = t31;
  } else t31 = $[71];
  let t32;
  if ($[72] !== startResize) {
    t32 = <div className="absolute bottom-0 right-0 z-10 size-3 cursor-nwse-resize" onPointerDown={e_4 => startResize(e_4, {
      e: true,
      s: true
    })} />;
    $[72] = startResize;
    $[73] = t32;
  } else t32 = $[73];
  let t33;
  if ($[74] !== startResize) {
    t33 = <div className="absolute bottom-0 left-0 z-10 size-3 cursor-nesw-resize" onPointerDown={e_5 => startResize(e_5, {
      w: true,
      s: true
    })} />;
    $[74] = startResize;
    $[75] = t33;
  } else t33 = $[75];
  let t34;
  if (true) {
    t34 = <div ref={winRef} role="dialog" aria-label={t("preview.title")} tabIndex={-1} className="fixed z-[100] overflow-hidden rounded-[10px] bg-ed-background shadow-2xl" style={t9}>{t25}{t28}{t29}{t30}{t31}{t32}{t33}</div>;
    $[76] = t25;
    $[77] = t28;
    $[78] = t29;
    $[79] = t30;
    $[80] = t31;
    $[81] = t32;
    $[82] = t33;
    $[83] = t9;
    $[84] = t34;
  } else t34 = $[84];
  return t34;
}

export { PreviewWindow };
