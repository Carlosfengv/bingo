/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/hooks/useEditorTheme.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var STORAGE_KEY$1 = "bingo-editor-theme";
var SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";
/** Chrome-only. Do not use Tailwind's `.dark` — that would flip canvas `dark:` utilities. */
var EDITOR_DARK_CLASS = "editor-dark";
function readStoredEditorTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY$1);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}
function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia(SYSTEM_DARK_QUERY).matches;
}
function applyEditorTheme(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = theme === "dark" || theme === "system" && systemPrefersDark();
  root.classList.toggle(EDITOR_DARK_CLASS, dark);
  root.classList.remove("dark");
}
/**
* Persists the app chrome theme and syncs `editor-dark` on `<html>`.
* Own it once per app via EditorThemeProvider — a second mounted instance
* would fight over the class on unmount.
*/
function useEditorTheme() {
  const $ = (0, import_compiler_runtime.c)(7);
  const [theme, setThemeState] = (0, import_react.useState)(readStoredEditorTheme);
  (0, import_react.useEffect)(() => {
    const sync = event => {
      if (event.key === STORAGE_KEY$1) setThemeState(readStoredEditorTheme());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  let t0;
  let t1;
  if ($[0] !== theme) {
    t0 = () => {
      applyEditorTheme(theme);
      if (theme !== "system" || typeof window === "undefined") return;
      const systemTheme = window.matchMedia(SYSTEM_DARK_QUERY);
      const syncSystemTheme = _temp$77;
      systemTheme.addEventListener("change", syncSystemTheme);
      return () => systemTheme.removeEventListener("change", syncSystemTheme);
    };
    t1 = [theme];
    $[0] = theme;
    $[1] = t0;
    $[2] = t1;
  } else {
    t0 = $[1];
    t1 = $[2];
  }
  (0, import_react.useEffect)(t0, t1);
  let t2;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = [];
    $[3] = t2;
  } else t2 = $[3];
  (0, import_react.useEffect)(_temp3$38, t2);
  let t3;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = next => {
      try {
        localStorage.setItem(STORAGE_KEY$1, next);
      } catch {}
      setThemeState(next);
    };
    $[4] = t3;
  } else t3 = $[4];
  const setTheme = t3;
  let t4;
  if ($[5] !== theme) {
    t4 = {
      theme,
      setTheme
    };
    $[5] = theme;
    $[6] = t4;
  } else t4 = $[6];
  return t4;
}
function _temp3$38() {
  return _temp2$56;
}
function _temp2$56() {
  document.documentElement.classList.remove(EDITOR_DARK_CLASS, "dark");
}
function _temp$77() {
  return applyEditorTheme("system");
}

export { useEditorTheme };
