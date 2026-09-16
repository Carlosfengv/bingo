/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/shortcuts/matchShortcut.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

function matchesCombo(e, combo) {
  if (combo.code !== void 0 && e.code !== combo.code) return false;
  if (combo.key !== void 0 && e.key.toLowerCase() !== combo.key.toLowerCase()) return false;
  if (combo.cmdOrCtrl !== void 0 && (e.metaKey || e.ctrlKey) !== combo.cmdOrCtrl) return false;
  if (combo.ctrl !== void 0 && e.ctrlKey !== combo.ctrl) return false;
  if (combo.meta !== void 0 && e.metaKey !== combo.meta) return false;
  if (combo.alt !== void 0 && e.altKey !== combo.alt) return false;
  if (combo.shift !== void 0 && e.shiftKey !== combo.shift) return false;
  return true;
}
/** True if the event matches any of the shortcut's key combos. */
function matchesShortcut(e, meta) {
  return meta.keys.some(combo => matchesCombo(e, combo));
}
/** True if the event's target is a text input — the shared guard most
*  shortcut handlers use to avoid firing while the user is typing. Also
*  covers <select> (arrows change options), textbox/combobox roles, and
*  in-flight IME composition. Not applied automatically by the dispatcher:
*  shortcuts that must win over typing (e.g. the JSX-copy shortcut) opt
*  out by simply not calling this. */
function isTypingTarget(e) {
  if (e.isComposing) return true;
  const target = e.target;
  if (!target) return false;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable) return true;
  const role = target.getAttribute?.("role");
  return role === "textbox" || role === "combobox";
}
/** True when focus is inside the BottomBar / History CodeMirror host.
*  Cmd+F should stay find-in-file there instead of jumping to layer search. */
function isCodeEditorTarget(e) {
  return !!e.target?.closest?.(".bingo-code-editor");
}

export { isCodeEditorTarget, isTypingTarget, matchesShortcut };
