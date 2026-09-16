/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/multiSelect.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { MIXED } from "../types";

/**
* Get a merged value from multiple elements. Returns the common value if all
* elements have the same value, or `MIXED` if values differ.
*/
function getMergedValue(elements, getter) {
  let value = void 0;
  let first = true;
  for (const el of elements) {
    const v = getter(el);
    if (first) {
      value = v;
      first = false;
    } else if (value !== v) {
      if (typeof value === "object" && typeof v === "object") {
        if (JSON.stringify(value) !== JSON.stringify(v)) return MIXED;
      } else return MIXED;
    }
  }
  return value;
}
/** True when `value` is the MIXED sentinel. */
function isMixed(value) {
  return value === MIXED;
}

export { getMergedValue, isMixed };
