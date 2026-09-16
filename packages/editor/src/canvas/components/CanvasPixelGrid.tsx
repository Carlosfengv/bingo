/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/CanvasPixelGrid.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getPixelGridEnabled, subscribePixelGridEnabled } from "../../shared/state/canvasDisplayPreferences";
import { getCamera, subscribeCamera } from "../../shell/utils/chatShortcuts";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var PIXEL_GRID_MIN_SCALE = 5;
/** Viewport-sized grid: one cell per canvas pixel, one physical pixel per line. */
function CanvasPixelGrid() {
  const $ = (0, import_compiler_runtime.c)(3);
  const gridRef = (0, import_react.useRef)(null);
  let t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      const grid = gridRef.current;
      if (!grid) return;
      const update = t2 => {
        const {
          scale,
          positionX,
          positionY
        } = t2;
        const visible = scale >= PIXEL_GRID_MIN_SCALE && getPixelGridEnabled();
        grid.style.display = visible ? "block" : "none";
        if (!visible) return;
        grid.style.setProperty("--pixel-grid-line-width", `${1 / (window.devicePixelRatio || 1)}px`);
        grid.style.backgroundSize = `${scale}px ${scale}px`;
        grid.style.backgroundPosition = `${positionX % scale}px ${positionY % scale}px`;
      };
      update(getCamera());
      const unsubscribeCamera = subscribeCamera(update);
      const unsubscribePreference = subscribePixelGridEnabled(() => update(getCamera()));
      return () => {
        unsubscribeCamera();
        unsubscribePreference();
      };
    };
    t1 = [];
    $[0] = t0;
    $[1] = t1;
  } else {
    t0 = $[0];
    t1 = $[1];
  }
  (0, import_react.useLayoutEffect)(t0, t1);
  let t2;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <div ref={gridRef} data-canvas-pixel-grid="" aria-hidden="true" className="pointer-events-none absolute inset-0" style={{
      display: "none",
      zIndex: 1,
      backgroundImage: "linear-gradient(to right, var(--ed-canvas-pixel-grid) var(--pixel-grid-line-width), transparent 0), linear-gradient(to bottom, var(--ed-canvas-pixel-grid) var(--pixel-grid-line-width), transparent 0)"
    }} />;
    $[2] = t2;
  } else t2 = $[2];
  return t2;
}

export { CanvasPixelGrid };
