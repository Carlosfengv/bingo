/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ProjectSettingsModal/SettingRow.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { Text$4 } from "@bingo/ui";
import * as import_compiler_runtime from "react/compiler-runtime";

function SettingRow(t0) {
  const $ = (0, import_compiler_runtime.c)(22);
  const {
    Icon,
    title,
    description,
    action,
    children
  } = t0;
  let t1;
  if ($[0] !== Icon) {
    t1 = <div className="flex flex-col h-fit bg-ed-muted rounded-lg p-3">{<Icon width={16} height={16} className="text-ed-muted-foreground" />}</div>;
    $[0] = Icon;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== title) {
    t2 = <Text$4 as="div" size="xs" weight="medium">{title}</Text$4>;
    $[2] = title;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== description) {
    t3 = <Text$4 as="div" size="2xs" variant="tertiary">{description}</Text$4>;
    $[4] = description;
    $[5] = t3;
  } else t3 = $[5];
  let t4;
  if ($[6] !== t2 || $[7] !== t3) {
    t4 = <div className="flex flex-col min-w-0">{t2}{t3}</div>;
    $[6] = t2;
    $[7] = t3;
    $[8] = t4;
  } else t4 = $[8];
  let t5;
  if ($[9] !== action) {
    t5 = action && <div className="shrink-0">{action}</div>;
    $[9] = action;
    $[10] = t5;
  } else t5 = $[10];
  let t6;
  if ($[11] !== t4 || $[12] !== t5) {
    t6 = <div className="flex flex-row gap-4 items-start justify-between">{t4}{t5}</div>;
    $[11] = t4;
    $[12] = t5;
    $[13] = t6;
  } else t6 = $[13];
  let t7;
  if ($[14] !== children) {
    t7 = children && <div className="flex items-center gap-2.5">{children}</div>;
    $[14] = children;
    $[15] = t7;
  } else t7 = $[15];
  let t8;
  if ($[16] !== t6 || $[17] !== t7) {
    t8 = <div className="flex flex-col w-full gap-4 min-w-0">{t6}{t7}</div>;
    $[16] = t6;
    $[17] = t7;
    $[18] = t8;
  } else t8 = $[18];
  let t9;
  if ($[19] !== t1 || $[20] !== t8) {
    t9 = <div className="flex flex-row gap-3">{t1}{t8}</div>;
    $[19] = t1;
    $[20] = t8;
    $[21] = t9;
  } else t9 = $[21];
  return t9;
}

export { SettingRow };
