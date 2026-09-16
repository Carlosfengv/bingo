/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/useMixedLocalValue.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Local editable value mirrored from `value`, with a "mixed" flag for multi-
* select. `transform` maps the incoming value into its editable form (e.g.
* stripUnit); defaults to identity. Re-syncs whenever value / isMixedValue
* change — same dependency set as the hand-written effects it replaces.
*/
function identity(value) {
  return value;
}
function useMixedLocalValue(value, isMixedValue, t0) {
  const $ = (0, import_compiler_runtime.c)(10);
  const transform = t0 === void 0 ? identity : t0;
  let t1;
  if ($[0] !== isMixedValue || $[1] !== transform || $[2] !== value) {
    t1 = isMixedValue ? "" : transform(value);
    $[0] = isMixedValue;
    $[1] = transform;
    $[2] = value;
    $[3] = t1;
  } else t1 = $[3];
  const [localValue, setLocalValue] = (0, import_react.useState)(t1);
  const [showMixed, setShowMixed] = (0, import_react.useState)(isMixedValue);
  let t2;
  if ($[4] !== isMixedValue || $[5] !== value) {
    t2 = {
      value,
      isMixedValue
    };
    $[4] = isMixedValue;
    $[5] = value;
    $[6] = t2;
  } else t2 = $[6];
  const [synced, setSynced] = (0, import_react.useState)(t2);
  if (value !== synced.value || isMixedValue !== synced.isMixedValue) {
    setSynced({
      value,
      isMixedValue
    });
    if (isMixedValue) {
      setLocalValue("");
      setShowMixed(true);
    } else {
      setLocalValue(transform(value));
      setShowMixed(false);
    }
  }
  let t3;
  if ($[7] !== localValue || $[8] !== showMixed) {
    t3 = {
      localValue,
      setLocalValue,
      showMixed,
      setShowMixed
    };
    $[7] = localValue;
    $[8] = showMixed;
    $[9] = t3;
  } else t3 = $[9];
  return t3;
}

export { useMixedLocalValue };
