/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/contexts/ActiveToolContext.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var INSERT_TOOLS = ["frame", "stack-h", "stack-v", "grid", "image", "video", "text", "html"];
/** True for armed insert tools — the ones that draw/click an element then revert. */
function isInsertTool(tool) {
  return INSERT_TOOLS.includes(tool);
}
var ActiveToolContext = (0, import_react.createContext)({
  activeTool: "move",
  setActiveTool: () => {},
  scaleFocusVersion: 0,
  scaleAspectLocked: true,
  setScaleAspectLocked: () => {}
});
function ActiveToolProvider(t0) {
  const $ = (0, import_compiler_runtime.c)(8);
  const {
    children
  } = t0;
  const [activeTool, updateActiveTool] = (0, import_react.useState)("move");
  const [scaleAspectLocked, setScaleAspectLocked] = (0, import_react.useState)(true);
  const [scaleFocusVersion, setScaleFocusVersion] = (0, import_react.useState)(0);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = tool => {
      updateActiveTool(tool);
      if (tool === "scale") setScaleFocusVersion(_temp$62);
    };
    $[0] = t1;
  } else t1 = $[0];
  const setActiveTool = t1;
  let t2;
  if ($[1] !== activeTool || $[2] !== scaleAspectLocked || $[3] !== scaleFocusVersion) {
    t2 = {
      activeTool,
      setActiveTool,
      scaleFocusVersion,
      scaleAspectLocked,
      setScaleAspectLocked
    };
    $[1] = activeTool;
    $[2] = scaleAspectLocked;
    $[3] = scaleFocusVersion;
    $[4] = t2;
  } else t2 = $[4];
  const value = t2;
  let t3;
  if ($[5] !== children || $[6] !== value) {
    t3 = <ActiveToolContext.Provider value={value}>{children}</ActiveToolContext.Provider>;
    $[5] = children;
    $[6] = value;
    $[7] = t3;
  } else t3 = $[7];
  return t3;
}
function _temp$62(version) {
  return version + 1;
}
function useActiveTool() {
  return (0, import_react.useContext)(ActiveToolContext);
}

export { ActiveToolProvider, isInsertTool, useActiveTool };
