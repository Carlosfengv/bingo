/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/StyleOpsContext.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Style operations context — every Styles-panel section consumes this instead
* of receiving `get/set/clear/has/sourceProps/...` as props.
*
* `DesignTab` builds the ops object once (read/write a property, source info,
* class management, computed values), and section components consume it via
* `useStyleOps()` or the per-field `useStyleField(property)` hook so every
* input row collapses to one line instead of repeating ten-line wiring.
*/
var StyleOpsContext = import_react.createContext(null);
function useStyleOps() {
  const ops = import_react.useContext(StyleOpsContext);
  if (!ops) throw new Error("useStyleOps must be used within a StyleOpsContext.Provider");
  return ops;
}
/**
* Per-property hook that wraps the StyleOps context for a single CSS property.
* Collapses the repeated wiring (value/onChange/isMixed/source/addClass) into
* a single object per field.
*/
function useStyleField(property) {
  const $ = (0, import_compiler_runtime.c)(36);
  const ops = useStyleOps();
  let t0;
  if ($[0] !== ops || $[1] !== property) {
    t0 = ops.get(property);
    $[0] = ops;
    $[1] = property;
    $[2] = t0;
  } else t0 = $[2];
  const value = t0;
  let t1;
  if ($[3] !== ops || $[4] !== property) {
    t1 = ops.getIsMixed(property);
    $[3] = ops;
    $[4] = property;
    $[5] = t1;
  } else t1 = $[5];
  const isMixed = t1;
  let t2;
  if ($[6] !== ops || $[7] !== property) {
    t2 = ops.getExplicit(property);
    $[6] = ops;
    $[7] = property;
    $[8] = t2;
  } else t2 = $[8];
  const t3 = ops.computed[property] ?? "";
  let t4;
  if ($[9] !== ops || $[10] !== property) {
    t4 = ops.has(property);
    $[9] = ops;
    $[10] = property;
    $[11] = t4;
  } else t4 = $[11];
  let t5;
  if ($[12] !== ops || $[13] !== property) {
    t5 = ops.sourceProps(property);
    $[12] = ops;
    $[13] = property;
    $[14] = t5;
  } else t5 = $[14];
  let t6;
  let t7;
  let t8;
  if ($[15] !== ops || $[16] !== property) {
    t6 = v => ops.set(property, v);
    t7 = () => ops.clear(property);
    t8 = cls => ops.addClassForProperty(cls, property);
    $[15] = ops;
    $[16] = property;
    $[17] = t6;
    $[18] = t7;
    $[19] = t8;
  } else {
    t6 = $[17];
    t7 = $[18];
    t8 = $[19];
  }
  let t10;
  let t9;
  if ($[20] !== isMixed || $[21] !== value) {
    t9 = target => !isMixed && value === target;
    t10 = (...t11) => {
      return !isMixed && t11.includes(value);
    };
    $[20] = isMixed;
    $[21] = value;
    $[22] = t10;
    $[23] = t9;
  } else {
    t10 = $[22];
    t9 = $[23];
  }
  let t11;
  if ($[24] !== isMixed || $[25] !== t10 || $[26] !== t2 || $[27] !== t3 || $[28] !== t4 || $[29] !== t5 || $[30] !== t6 || $[31] !== t7 || $[32] !== t8 || $[33] !== t9 || $[34] !== value) {
    t11 = {
      value,
      explicit: t2,
      isMixed,
      computed: t3,
      isSet: t4,
      source: t5,
      set: t6,
      clear: t7,
      addClass: t8,
      equals: t9,
      in: t10
    };
    $[24] = isMixed;
    $[25] = t10;
    $[26] = t2;
    $[27] = t3;
    $[28] = t4;
    $[29] = t5;
    $[30] = t6;
    $[31] = t7;
    $[32] = t8;
    $[33] = t9;
    $[34] = value;
    $[35] = t11;
  } else t11 = $[35];
  return t11;
}

export { StyleOpsContext, useStyleField, useStyleOps };
