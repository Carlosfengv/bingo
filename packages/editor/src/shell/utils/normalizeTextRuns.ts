/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/normalizeTextRuns.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getById, getParentId } from "@bingo/compiler";

/**
* Text-run normalization — strip run styles that merely duplicate inherited
* typography and collapse fully-redundant runs back to plain text, so editing
* text removes the duplicate `<span style="fontWeight:400">` noise that just
* repeats the owning element's own values.
*/
var INHERITABLE_TYPOGRAPHY_KEYS = ["color", "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "textAlign", "textTransform"];
var normalizeStyleVal = v => typeof v === "number" ? String(v) : String(v ?? "").trim().replace(/px$/, "");
var computeInheritedBaseline = (store, leafId) => {
  const baseline = {};
  let curr = leafId;
  while (curr && curr !== "ROOT") {
    const s = getById(store, curr)?.styles ?? {};
    for (const k of INHERITABLE_TYPOGRAPHY_KEYS) if (!(k in baseline) && s[k] !== void 0) baseline[k] = s[k];
    curr = getParentId(store, curr);
  }
  return baseline;
};
var isPlainRun = r => (!r.styles || Object.keys(r.styles).length === 0) && !r.className;
/** Strip inherited-redundant typography from each run, merge consecutive plain
*  runs, and collapse to plain text when nothing remains styled. */
var normalizeTextRuns = (store, leafId, content) => {
  if (!content.children?.length) return content;
  const baseline = computeInheritedBaseline(store, leafId);
  const cleaned = content.children.map(run => {
    const styles = {
      ...(run.styles ?? {})
    };
    for (const k of INHERITABLE_TYPOGRAPHY_KEYS) if (k in styles && normalizeStyleVal(styles[k]) === normalizeStyleVal(baseline[k])) delete styles[k];
    return {
      ...run,
      styles: Object.keys(styles).length ? styles : void 0
    };
  });
  const merged = [];
  for (const run of cleaned) {
    const prev = merged[merged.length - 1];
    if (prev && isPlainRun(prev) && isPlainRun(run)) prev.text = (prev.text ?? "") + (run.text ?? "");else merged.push(run);
  }
  if (merged.every(isPlainRun)) return {
    text: merged.map(r => r.text ?? "").join("")
  };
  return {
    children: merged
  };
};

export { normalizeTextRuns };
