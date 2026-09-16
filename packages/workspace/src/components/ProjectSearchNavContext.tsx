/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/workspace/src/components/ProjectSearchNavContext.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var Context = (0, import_react.createContext)(null);
function ProjectSearchNavProvider(t0) {
  const $ = (0, import_compiler_runtime.c)(3);
  const {
    value,
    children
  } = t0;
  let t1;
  if ($[0] !== children || $[1] !== value) {
    t1 = <Context.Provider value={value}>{children}</Context.Provider>;
    $[0] = children;
    $[1] = value;
    $[2] = t1;
  } else t1 = $[2];
  return t1;
}
/** Null outside a `ProjectsPage` — the sidebar renders standalone in places. */
function useProjectSearchNav() {
  return (0, import_react.useContext)(Context);
}

export { ProjectSearchNavProvider, useProjectSearchNav };
