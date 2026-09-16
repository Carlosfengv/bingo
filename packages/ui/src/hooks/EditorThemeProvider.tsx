/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/hooks/EditorThemeProvider.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useEditorTheme } from "./useEditorTheme";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var EditorThemeContext = (0, import_react.createContext)(null);
/** Owns the app-wide chrome theme. Mount exactly once, at the app root. */
function EditorThemeProvider(t0) {
  const $ = (0, import_compiler_runtime.c)(3);
  const {
    children
  } = t0;
  const value = useEditorTheme();
  let t1;
  if ($[0] !== children || $[1] !== value) {
    t1 = <EditorThemeContext.Provider value={value}>{children}</EditorThemeContext.Provider>;
    $[0] = children;
    $[1] = value;
    $[2] = t1;
  } else t1 = $[2];
  return t1;
}
function useEditorThemeContext() {
  const context = (0, import_react.useContext)(EditorThemeContext);
  if (!context) throw new Error("useEditorThemeContext requires an EditorThemeProvider at the app root");
  return context;
}

export { EditorThemeProvider, useEditorThemeContext };
