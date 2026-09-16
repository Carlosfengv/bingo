/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/PanelEmptyState.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { Text$4 } from "@bingo/ui";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Shared empty state for the left-rail panels (Assets, Icons, ...). Top-aligned
* with consistent padding so every panel's empty state looks identical — keep
* new panels on this component rather than re-implementing the layout.
*/
function PanelEmptyState(t0) {
  const $ = (0, import_compiler_runtime.c)(17);
  const {
    icon,
    title,
    description,
    actions
  } = t0;
  let t1;
  if ($[0] !== icon) {
    t1 = <div className="flex rounded-lg border border-ed-border bg-ed-background p-3 shadow-lg/4">{icon}</div>;
    $[0] = icon;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== title) {
    t2 = <Text$4 size="3xs" weight="medium">{title}</Text$4>;
    $[2] = title;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== description) {
    t3 = <Text$4 variant="tertiary" size="3xs" className="text-center">{description}</Text$4>;
    $[4] = description;
    $[5] = t3;
  } else t3 = $[5];
  let t4;
  if ($[6] !== t2 || $[7] !== t3) {
    t4 = <div className="flex flex-col items-center gap-1">{t2}{t3}</div>;
    $[6] = t2;
    $[7] = t3;
    $[8] = t4;
  } else t4 = $[8];
  let t5;
  if ($[9] !== t1 || $[10] !== t4) {
    t5 = <div className="flex flex-col items-center gap-4">{t1}{t4}</div>;
    $[9] = t1;
    $[10] = t4;
    $[11] = t5;
  } else t5 = $[11];
  let t6;
  if ($[12] !== actions) {
    t6 = actions && <div className="flex w-full flex-col gap-2">{actions}</div>;
    $[12] = actions;
    $[13] = t6;
  } else t6 = $[13];
  let t7;
  if ($[14] !== t5 || $[15] !== t6) {
    t7 = <div className="flex flex-col items-center gap-8 px-4 py-12 text-center">{t5}{t6}</div>;
    $[14] = t5;
    $[15] = t6;
    $[16] = t7;
  } else t7 = $[16];
  return t7;
}

export { PanelEmptyState };
