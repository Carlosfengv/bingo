/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/codeEditorTheme.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { EditorView as EditorView$1 } from "@codemirror/view";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Explicit mono stack — avoid `ui-monospace` alone (can track UI chrome on some OS). */
var CODE_EDITOR_FONT_FAMILY = "\"ui-monospace\", \"SFMono-Regular\", \"Menlo\", \"Consolas\", monospace";
var STYLE_ID = "bingo-code-editor-font";
/**
* Ensure monospace wins over app-shell Inter and runtime-injected project CSS
* (`* { font-family … }`), which is appended to `document.head` after our bundle.
* Re-appends the style at end of `<head>` so it stays last.
*/
function ensureCodeEditorFontStyles() {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
  }
  el.textContent = `
.bingo-code-editor,
.bingo-code-editor .cm-editor,
.bingo-code-editor .cm-scroller,
.bingo-code-editor .cm-content,
.bingo-code-editor .cm-line,
.bingo-code-editor .cm-gutters,
.bingo-code-editor .cm-gutterElement,
.bingo-code-editor * {
  font-family: ${CODE_EDITOR_FONT_FAMILY} !important;
}
.bingo-code-editor,
.bingo-code-editor .cm-editor,
.bingo-code-editor .cm-scroller {
  background-color: var(--ed-background) !important;
  color: var(--ed-foreground);
}
.bingo-code-editor .cm-gutters {
  background-color: var(--ed-background) !important;
  color: var(--ed-muted-foreground);
  border: none !important;
}
.bingo-code-editor .cm-scroller {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.bingo-code-editor .cm-scroller:hover {
  scrollbar-color: color-mix(in oklab, var(--ed-foreground) 25%, transparent) transparent;
}
.bingo-code-editor .cm-scroller::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.bingo-code-editor .cm-scroller::-webkit-scrollbar-track {
  background: transparent;
}
.bingo-code-editor .cm-scroller::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.bingo-code-editor .cm-scroller:hover::-webkit-scrollbar-thumb {
  background-color: color-mix(in oklab, var(--ed-foreground) 25%, transparent);
}
.bingo-code-editor .cm-scroller::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in oklab, var(--ed-foreground) 40%, transparent);
}
`.trim();
  document.head.appendChild(el);
}
/** Call from BottomBar / History so the late style tag is installed. */
function useCodeEditorFontStyles() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [];
    $[0] = t0;
  } else t0 = $[0];
  (0, import_react.useLayoutEffect)(_temp2$7, t0);
}
/**
* CodeMirror chrome for BottomBar / History (12px monospace).
* `!important` on content/lines fights sans resets; pair with
* `useCodeEditorFontStyles` + `CODE_EDITOR_CLASS`.
*/
function _temp2$7() {
  ensureCodeEditorFontStyles();
  window.addEventListener("bingo-css-updated", ensureCodeEditorFontStyles);
  return _temp$14;
}
function _temp$14() {
  return window.removeEventListener("bingo-css-updated", ensureCodeEditorFontStyles);
}
var CODE_EDITOR_THEME = EditorView$1.theme({
  "&": {
    fontSize: "12px",
    fontFamily: `${CODE_EDITOR_FONT_FAMILY} !important`,
    backgroundColor: "var(--ed-background)",
    color: "var(--ed-foreground)"
  },
  ".cm-content": {
    padding: "8px 0",
    lineHeight: "1.7",
    fontFamily: `${CODE_EDITOR_FONT_FAMILY} !important`,
    caretColor: "var(--ed-foreground)"
  },
  ".cm-line": {
    padding: "0 14px",
    fontFamily: `${CODE_EDITOR_FONT_FAMILY} !important`
  },
  ".cm-gutters": {
    backgroundColor: "var(--ed-background)",
    color: "var(--ed-muted-foreground)",
    border: "none",
    fontFamily: `${CODE_EDITOR_FONT_FAMILY} !important`
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 6px 0 12px",
    minWidth: "24px"
  },
  ".cm-scroller": {
    fontFamily: `${CODE_EDITOR_FONT_FAMILY} !important`,
    backgroundColor: "var(--ed-background)"
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "var(--ed-selected)"
  }
});
/** Class on the CodeMirror host — pairs with ensureCodeEditorFontStyles(). */
var CODE_EDITOR_CLASS = "bingo-code-editor";

export { CODE_EDITOR_CLASS, CODE_EDITOR_THEME, useCodeEditorFontStyles };
