/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/CanvasLayout.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useEditorMode } from "../../shared/contexts/EditorModeContext";
import { useGlobalShortcut } from "../../shared/shortcuts/useGlobalShortcut";
import * as import_react from "react";
import { Panel, PanelGroup as PanelGroup$1, PanelResizeHandle } from "react-resizable-panels";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Sidebars: fixed pixel widths, drag-resizable within [min, max],
*  unaffected by window resizes. */
var SIDEBAR_MIN_PX = {
  left: 300,
  right: 250
};
var SIDEBAR_DEFAULT_PX = 300;
var SIDEBAR_MAX_PX = 500;
var SIDEBAR_WIDTH_KEYS = {
  left: "bingo:sidebar-width:left",
  right: "bingo:sidebar-width:right"
};
function clampSidebarWidth(side, width) {
  return Math.min(SIDEBAR_MAX_PX, Math.max(SIDEBAR_MIN_PX[side], width));
}
function loadSidebarWidth(side) {
  try {
    const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_KEYS[side]));
    if (Number.isFinite(stored) && stored > 0) return clampSidebarWidth(side, stored);
  } catch {}
  return SIDEBAR_DEFAULT_PX;
}
function saveSidebarWidth(side, width) {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_KEYS[side], String(width));
  } catch {}
}
/** Drag handle and visible separator between a sidebar and the canvas. Pointer
*  capture keeps the drag alive over iframes/webviews. */
function SidebarResizeHandle(t0) {
  const $ = (0, import_compiler_runtime.c)(13);
  const {
    side,
    width,
    onResize,
    onResizeEnd
  } = t0;
  const dragRef = (0, import_react.useRef)(null);
  let t1;
  if ($[0] !== width) {
    t1 = e => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startWidth: width
      };
    };
    $[0] = width;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== onResize || $[3] !== side) {
    t2 = e_0 => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = side === "left" ? e_0.clientX - drag.startX : drag.startX - e_0.clientX;
      onResize(clampSidebarWidth(side, drag.startWidth + delta));
    };
    $[2] = onResize;
    $[3] = side;
    $[4] = t2;
  } else t2 = $[4];
  let t3;
  let t4;
  if ($[5] !== onResizeEnd) {
    t3 = e_1 => {
      if (!dragRef.current) return;
      dragRef.current = null;
      e_1.currentTarget.releasePointerCapture(e_1.pointerId);
      onResizeEnd();
    };
    t4 = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      onResizeEnd();
    };
    $[5] = onResizeEnd;
    $[6] = t3;
    $[7] = t4;
  } else {
    t3 = $[6];
    t4 = $[7];
  }
  let t5;
  if ($[8] !== t1 || $[9] !== t2 || $[10] !== t3 || $[11] !== t4) {
    t5 = <div className="relative w-px shrink-0 bg-ed-border">{<div className="absolute inset-y-0 -left-1 -right-1 z-10 cursor-col-resize" onPointerDown={t1} onPointerMove={t2} onPointerUp={t3} onPointerCancel={t4} />}</div>;
    $[8] = t1;
    $[9] = t2;
    $[10] = t3;
    $[11] = t4;
    $[12] = t5;
  } else t5 = $[12];
  return t5;
}
function CanvasLayout(t0) {
  const $ = (0, import_compiler_runtime.c)(60);
  const {
    leftChildren,
    rightChildren,
    bottomChildren,
    isElectron = false,
    chromeHidden: t1,
    bottomBarRevealSignal: t2,
    children
  } = t0;
  const chromeHidden = t1 === void 0 ? false : t1;
  const bottomBarRevealSignal = t2 === void 0 ? 0 : t2;
  const {
    mode,
    setMode
  } = useEditorMode();
  const showBottom = mode === "dev";
  const bottomPanelRef = (0, import_react.useRef)(null);
  const [leftWidth, setLeftWidth] = (0, import_react.useState)(_temp$70);
  const [rightWidth, setRightWidth] = (0, import_react.useState)(_temp2$50);
  let t3;
  let t4;
  if ($[0] !== showBottom) {
    t3 = () => {
      const panel = bottomPanelRef.current;
      if (!panel) return;
      if (showBottom) {
        if (panel.isCollapsed()) panel.expand();
      } else if (panel.isExpanded()) panel.collapse();
    };
    t4 = [showBottom];
    $[0] = showBottom;
    $[1] = t3;
    $[2] = t4;
  } else {
    t3 = $[1];
    t4 = $[2];
  }
  (0, import_react.useLayoutEffect)(t3, t4);
  const lastRevealRef = (0, import_react.useRef)(bottomBarRevealSignal);
  let t5;
  let t6;
  if ($[3] !== bottomBarRevealSignal || $[4] !== mode || $[5] !== setMode) {
    t5 = () => {
      if (bottomBarRevealSignal === lastRevealRef.current) return;
      lastRevealRef.current = bottomBarRevealSignal;
      if (mode !== "dev") setMode("dev");
      const panel_0 = bottomPanelRef.current;
      if (panel_0?.isCollapsed()) panel_0.expand();
    };
    t6 = [bottomBarRevealSignal, mode, setMode];
    $[3] = bottomBarRevealSignal;
    $[4] = mode;
    $[5] = setMode;
    $[6] = t5;
    $[7] = t6;
  } else {
    t5 = $[6];
    t6 = $[7];
  }
  (0, import_react.useLayoutEffect)(t5, t6);
  let t7;
  if ($[8] !== setMode) {
    t7 = e => {
      e.preventDefault();
      const panel_1 = bottomPanelRef.current;
      if (!panel_1) return;
      if (panel_1.isCollapsed()) {
        setMode("dev");
        panel_1.expand();
      } else {
        setMode("design");
        panel_1.collapse();
      }
    };
    $[8] = setMode;
    $[9] = t7;
  } else t7 = $[9];
  useGlobalShortcut("toggleBottomBar", t7);
  let t8;
  if ($[10] !== mode || $[11] !== setMode) {
    t8 = () => {
      if (mode !== "design") setMode("design");
    };
    $[10] = mode;
    $[11] = setMode;
    $[12] = t8;
  } else t8 = $[12];
  const handlePanelCollapse = t8;
  let t9;
  if ($[13] !== mode || $[14] !== setMode) {
    t9 = () => {
      if (mode !== "dev") setMode("dev");
    };
    $[13] = mode;
    $[14] = setMode;
    $[15] = t9;
  } else t9 = $[15];
  const handlePanelExpand = t9;
  if (chromeHidden) {
    let t10;
    if ($[16] !== children) {
      t10 = <div className="h-full w-full overflow-hidden bg-ed-canvas-background">{<div className="relative h-full overflow-hidden">{children}</div>}</div>;
      $[16] = children;
      $[17] = t10;
    } else t10 = $[17];
    return t10;
  }
  let t10;
  if ($[18] !== leftWidth) {
    t10 = {
      width: leftWidth
    };
    $[18] = leftWidth;
    $[19] = t10;
  } else t10 = $[19];
  let t11;
  if ($[20] !== leftChildren || $[21] !== t10) {
    t11 = <div style={t10} className="h-full shrink-0 overflow-hidden bg-ed-background">{leftChildren}</div>;
    $[20] = leftChildren;
    $[21] = t10;
    $[22] = t11;
  } else t11 = $[22];
  let t12;
  if ($[23] !== leftWidth) {
    t12 = () => saveSidebarWidth("left", leftWidth);
    $[23] = leftWidth;
    $[24] = t12;
  } else t12 = $[24];
  let t13;
  if ($[25] !== leftWidth || $[26] !== t12) {
    t13 = <SidebarResizeHandle side="left" width={leftWidth} onResize={setLeftWidth} onResizeEnd={t12} />;
    $[25] = leftWidth;
    $[26] = t12;
    $[27] = t13;
  } else t13 = $[27];
  let t14;
  if ($[28] !== children) {
    t14 = <Panel defaultSize={70} minSize={30} className="bg-ed-background">{<div className="relative h-full overflow-hidden bg-ed-canvas-background">{children}</div>}</Panel>;
    $[28] = children;
    $[29] = t14;
  } else t14 = $[29];
  const t15 = !showBottom;
  const t16 = `h-px ${showBottom ? "bg-ed-border" : "bg-transparent"}`;
  let t17;
  if ($[30] !== t15 || $[31] !== t16) {
    t17 = <PanelResizeHandle disabled={t15} className={t16} />;
    $[30] = t15;
    $[31] = t16;
    $[32] = t17;
  } else t17 = $[32];
  let t18;
  if ($[33] !== bottomChildren) {
    t18 = <div className="h-full w-full bg-ed-background overflow-hidden">{bottomChildren}</div>;
    $[33] = bottomChildren;
    $[34] = t18;
  } else t18 = $[34];
  let t19;
  if ($[35] !== handlePanelCollapse || $[36] !== handlePanelExpand || $[37] !== t18) {
    t19 = <Panel ref={bottomPanelRef} defaultSize={30} minSize={15} maxSize={70} collapsible={true} collapsedSize={0} onCollapse={handlePanelCollapse} onExpand={handlePanelExpand}>{t18}</Panel>;
    $[35] = handlePanelCollapse;
    $[36] = handlePanelExpand;
    $[37] = t18;
    $[38] = t19;
  } else t19 = $[38];
  let t20;
  if ($[39] !== t14 || $[40] !== t17 || $[41] !== t19) {
    t20 = <div className="flex h-full min-w-0 flex-1 flex-col"><div className="electron-canvas-titlebar" aria-hidden="true" />{<PanelGroup$1 direction="vertical" className="min-h-0 flex-1">{t14}{t17}{t19}</PanelGroup$1>}</div>;
    $[39] = t14;
    $[40] = t17;
    $[41] = t19;
    $[42] = t20;
  } else t20 = $[42];
  let t21;
  if ($[43] !== rightWidth) {
    t21 = () => saveSidebarWidth("right", rightWidth);
    $[43] = rightWidth;
    $[44] = t21;
  } else t21 = $[44];
  let t22;
  if ($[45] !== rightWidth || $[46] !== t21) {
    t22 = <SidebarResizeHandle side="right" width={rightWidth} onResize={setRightWidth} onResizeEnd={t21} />;
    $[45] = rightWidth;
    $[46] = t21;
    $[47] = t22;
  } else t22 = $[47];
  let t23;
  if ($[48] !== rightWidth) {
    t23 = {
      width: rightWidth
    };
    $[48] = rightWidth;
    $[49] = t23;
  } else t23 = $[49];
  let t24;
  if ($[50] !== rightChildren || $[51] !== t23) {
    t24 = <div style={t23} className="h-full shrink-0 bg-ed-background">{rightChildren}</div>;
    $[50] = rightChildren;
    $[51] = t23;
    $[52] = t24;
  } else t24 = $[52];
  let t25;
  if ($[53] !== t11 || $[54] !== t13 || $[55] !== t20 || $[56] !== t22 || $[57] !== t24 || $[59] !== isElectron) {
    t25 = <div data-electron-editor={isElectron ? "true" : undefined} className="flex h-full w-full overflow-hidden bg-ed-background">{t11}{t13}{t20}{t22}{t24}</div>;
    $[53] = t11;
    $[54] = t13;
    $[55] = t20;
    $[56] = t22;
    $[57] = t24;
    $[58] = t25;
    $[59] = isElectron;
  } else t25 = $[58];
  return t25;
}
function _temp2$50() {
  return loadSidebarWidth("right");
}
function _temp$70() {
  return loadSidebarWidth("left");
}

export { CanvasLayout };
