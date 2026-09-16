/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/EditorStatusBar.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_compiler_runtime from "react/compiler-runtime";

var KIND_STYLE = {
  hint: {
    card: "border-amber-400/30 bg-amber-400/[0.07]",
    dot: "bg-amber-400",
    text: "text-amber-700 dark:text-amber-300"
  },
  error: {
    card: "border-red-500/25 bg-red-500/[0.06]",
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-300"
  },
  success: {
    card: "border-emerald-500/25 bg-emerald-500/[0.06]",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300"
  }
};
var LOCATOR_RE = /\s*\((\d+):(\d+)\)\s*$/;
/**
* Diagnostic strip under the editor toolbar: a single inset, softly-tinted card
* with a state dot. The full message is shown (wrapping, all lines) — no
* truncation. A trailing line:col on a single-line message becomes a mono chip.
*/
function EditorStatusBar(t0) {
  const $ = (0, import_compiler_runtime.c)(21);
  const {
    status
  } = t0;
  const {
    kind,
    message
  } = status;
  const {
    card,
    dot,
    text
  } = KIND_STYLE[kind];
  let t1;
  if ($[0] !== message) {
    t1 = message.includes("\n");
    $[0] = message;
    $[1] = t1;
  } else t1 = $[1];
  const singleLine = !t1;
  let t2;
  if ($[2] !== message || $[3] !== singleLine) {
    t2 = singleLine ? message.match(LOCATOR_RE) : null;
    $[2] = message;
    $[3] = singleLine;
    $[4] = t2;
  } else t2 = $[4];
  const locatorMatch = t2;
  const locator = locatorMatch ? `${locatorMatch[1]}:${locatorMatch[2]}` : null;
  let t3;
  if ($[5] !== locatorMatch || $[6] !== message) {
    t3 = locatorMatch ? message.slice(0, message.length - locatorMatch[0].length).trim() : message;
    $[5] = locatorMatch;
    $[6] = message;
    $[7] = t3;
  } else t3 = $[7];
  const body = t3;
  const t4 = kind === "error" ? "alert" : "status";
  const t5 = `flex items-start gap-2 rounded-md border px-2.5 py-1.5 ${card}`;
  const t6 = `mt-[5px] size-1.5 shrink-0 rounded-full ${dot}`;
  let t7;
  if ($[8] !== t6) {
    t7 = <span className={t6} aria-hidden={true} />;
    $[8] = t6;
    $[9] = t7;
  } else t7 = $[9];
  const t8 = `min-w-0 flex-1 whitespace-pre-wrap break-words text-xs leading-snug ${text}`;
  let t9;
  if ($[10] !== body || $[11] !== t8) {
    t9 = <p className={t8}>{body}</p>;
    $[10] = body;
    $[11] = t8;
    $[12] = t9;
  } else t9 = $[12];
  let t10;
  if ($[13] !== locator) {
    t10 = locator && <code className="mt-0.5 shrink-0 rounded bg-ed-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-ed-muted-foreground">{locator}</code>;
    $[13] = locator;
    $[14] = t10;
  } else t10 = $[14];
  let t11;
  if ($[15] !== t10 || $[16] !== t4 || $[17] !== t5 || $[18] !== t7 || $[19] !== t9) {
    t11 = <div className="px-3 py-2">{<div role={t4} className={t5}>{t7}{t9}{t10}</div>}</div>;
    $[15] = t10;
    $[16] = t4;
    $[17] = t5;
    $[18] = t7;
    $[19] = t9;
    $[20] = t11;
  } else t11 = $[20];
  return t11;
}

export { EditorStatusBar };
