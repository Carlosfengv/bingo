/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/hooks/useIsDark.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function rootIsEditorDark() {
  if (typeof document === "undefined") return false;
  const classes = document.documentElement.classList;
  return classes.contains("editor-dark") || classes.contains("dark");
}
/** Editor-chrome dark mode (`editor-dark`). Canvas `dark:` utilities stay independent. */
function useIsDark() {
  const $ = (0, import_compiler_runtime.c)(2);
  const [dark, setDark] = (0, import_react.useState)(rootIsEditorDark);
  let t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = () => {
      const el = document.documentElement;
      const sync = () => setDark(el.classList.contains("editor-dark") || el.classList.contains("dark"));
      sync();
      const observer = new MutationObserver(sync);
      observer.observe(el, {
        attributes: true,
        attributeFilter: ["class"]
      });
      return () => observer.disconnect();
    };
    t1 = [];
    $[0] = t0;
    $[1] = t1;
  } else {
    t0 = $[0];
    t1 = $[1];
  }
  (0, import_react.useEffect)(t0, t1);
  return dark;
}

export { useIsDark };
