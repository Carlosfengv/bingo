/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/layout/glyphs.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { AddVariableIcon, DisplayFlexColumnIcon, DisplayFlexRowIcon, FlexHBottomIcon, FlexHMiddleIcon, FlexHTopIcon, FlexVLeftIcon, FlexVMiddleIcon, FlexVRightIcon } from "@bingo/ui";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Custom SVG glyphs for the Layout / Appearance sections — bespoke icons not
* available in the icon set (hex-with-dot, padding sides, flex direction,
* alignment cells).
*
* All glyphs are pure visual primitives — no state, no event handlers.
*/
function HexDotGlyph(t0) {
  const $ = (0, import_compiler_runtime.c)(2);
  const {
    className
  } = t0;
  let t1;
  if ($[0] !== className) {
    t1 = <AddVariableIcon className={className} aria-hidden="true" />;
    $[0] = className;
    $[1] = t1;
  } else t1 = $[1];
  return t1;
}
function FlexColumnGlyph() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <DisplayFlexColumnIcon className="size-3.75" />;
    $[0] = t0;
  } else t0 = $[0];
  return t0;
}
function FlexRowGlyph() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <DisplayFlexRowIcon className="size-3.75" />;
    $[0] = t0;
  } else t0 = $[0];
  return t0;
}
function FlexWrapGlyph() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">{<path d="M5 13.5L2 10.5L5 7.5M2 10.5L10.5 10.5C11.4283 10.5 12.3185 10.1313 12.9749 9.47488C13.6313 8.8185 14 7.92826 14 7C14 6.07174 13.6313 5.18151 12.9749 4.52513C12.3185 3.86875 11.4283 3.5 10.5 3.5L2 3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />}</svg>;
    $[0] = t0;
  } else t0 = $[0];
  return t0;
}
var FLEX_H_ICONS = [FlexHTopIcon, FlexHMiddleIcon, FlexHBottomIcon];
var FLEX_V_ICONS = [FlexVLeftIcon, FlexVMiddleIcon, FlexVRightIcon];
/** Cross-axis alignment glyph selected from the current flex direction. */
function FlexAlignmentGlyph(t0) {
  const $ = (0, import_compiler_runtime.c)(2);
  const {
    direction,
    row,
    col
  } = t0;
  const Icon = direction === "row" ? FLEX_H_ICONS[row] ?? FlexHMiddleIcon : FLEX_V_ICONS[col] ?? FlexVMiddleIcon;
  let t1;
  if ($[0] !== Icon) {
    t1 = <Icon aria-hidden="true" />;
    $[0] = Icon;
    $[1] = t1;
  } else t1 = $[1];
  return t1;
}
/**
* How far the outer items pull in toward the middle, per distribution.
* Space-between sits on the dot grid; the others step inward from there.
*/
var DISTRIBUTION_INSET = {
  "space-between": 0,
  "space-around": 2,
  "space-evenly": 4
};
/**
* One item in the distributed alignment mode. Items sit across the main axis,
* so the line runs perpendicular to it: vertical bars for a row, horizontal
* bars for a column. The middle item is drawn shorter, matching the mixed-size
* items of the alignment icons. The outer items echo the CSS behaviour: on
* the dot grid for space-between, pulled in for space-around, and further in
* for space-evenly. Same 16-grid and 1px stroke as the icon set.
*/
function DistributedItemLine(t0) {
  const $ = (0, import_compiler_runtime.c)(4);
  const {
    direction,
    index,
    mode
  } = t0;
  let t1;
  if ($[0] !== index) {
    t1 = index === 1 ? [4, 12] : [2, 14];
    $[0] = index;
    $[1] = t1;
  } else t1 = $[1];
  const [start, end] = t1;
  const across = 8 - (index - 1) * DISTRIBUTION_INSET[mode];
  const d = direction === "row" ? `M${across} ${start}V${end}` : `M${start} ${across}H${end}`;
  let t2;
  if ($[2] !== d) {
    t2 = <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">{<path d={d} stroke="currentColor" strokeLinecap="round" />}</svg>;
    $[2] = d;
    $[3] = t2;
  } else t2 = $[3];
  return t2;
}
/**
* Cell glyph dispatcher — a distribution mode shows a single line, otherwise
* shows the three-rect "active alignment" indicator.
*/
function AlignmentCellGlyph(t0) {
  const $ = (0, import_compiler_runtime.c)(8);
  const {
    direction,
    row,
    col,
    distribution
  } = t0;
  if (distribution) {
    const t1 = direction === "row" ? col : row;
    let t2;
    if ($[0] !== direction || $[1] !== distribution || $[2] !== t1) {
      t2 = <DistributedItemLine direction={direction} index={t1} mode={distribution} />;
      $[0] = direction;
      $[1] = distribution;
      $[2] = t1;
      $[3] = t2;
    } else t2 = $[3];
    return t2;
  }
  let t1;
  if ($[4] !== col || $[5] !== direction || $[6] !== row) {
    t1 = <FlexAlignmentGlyph direction={direction} row={row} col={col} />;
    $[4] = col;
    $[5] = direction;
    $[6] = row;
    $[7] = t1;
  } else t1 = $[7];
  return t1;
}

export { AlignmentCellGlyph, DistributedItemLine, FlexAlignmentGlyph, FlexColumnGlyph, FlexRowGlyph, FlexWrapGlyph, HexDotGlyph };
