/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/parts/ActiveClassChip.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { InspectorControlAction } from "../../primitives";
import { SpinnerIcon, Tooltip, UnlinkIcon, cn$2 } from "@bingo/ui";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Shared content for a field driven by a Tailwind class. The class name is the
* resting label; the resolved value and unlink action appear when the field is
* hovered.
*/
function ActiveClassUnlinkAction(t0) {
  const $ = (0, import_compiler_runtime.c)(10);
  const {
    onClear,
    title: t1,
    clearStopsPropagation: t2,
    className
  } = t0;
  const title = t1 === void 0 ? "Remove class" : t1;
  const clearStopsPropagation = t2 === void 0 ? true : t2;
  let t3;
  if ($[0] !== clearStopsPropagation || $[1] !== onClear) {
    t3 = event => {
      if (clearStopsPropagation) event.stopPropagation();
      onClear();
    };
    $[0] = clearStopsPropagation;
    $[1] = onClear;
    $[2] = t3;
  } else t3 = $[2];
  let t4;
  if ($[3] !== className) {
    t4 = cn$2("pointer-events-none w-0 overflow-hidden px-0 opacity-0", "group-hover/inspector-control:pointer-events-auto group-hover/inspector-control:w-6 group-hover/inspector-control:px-1 group-hover/inspector-control:opacity-100", className);
    $[3] = className;
    $[4] = t4;
  } else t4 = $[4];
  let t5;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = <UnlinkIcon className="size-3" />;
    $[5] = t5;
  } else t5 = $[5];
  let t6;
  if ($[6] !== t3 || $[7] !== t4 || $[8] !== title) {
    t6 = <InspectorControlAction aria-label={title} title={title} onClick={t3} className={t4}>{t5}</InspectorControlAction>;
    $[6] = t3;
    $[7] = t4;
    $[8] = title;
    $[9] = t6;
  } else t6 = $[9];
  return t6;
}
function ActiveClassChip(t0) {
  const $ = (0, import_compiler_runtime.c)(19);
  const {
    sourceClass,
    fieldTooltip,
    value,
    isPending: t1,
    onClear,
    clearTitle,
    clearStopsPropagation: t2,
    className
  } = t0;
  const isPending = t1 === void 0 ? false : t1;
  const clearStopsPropagation = t2 === void 0 ? true : t2;
  let t3;
  if ($[0] !== className) {
    t3 = cn$2("flex min-w-0 flex-1 items-center gap-1 px-1 text-left text-[11px] font-normal text-ed-inspector-value", className);
    $[0] = className;
    $[1] = t3;
  } else t3 = $[1];
  let t4;
  if ($[2] !== isPending) {
    t4 = isPending && <SpinnerIcon className="size-3 shrink-0 animate-spin text-ed-foreground-secondary" />;
    $[2] = isPending;
    $[3] = t4;
  } else t4 = $[3];
  let t5;
  if ($[4] !== fieldTooltip || $[5] !== sourceClass) {
    t5 = fieldTooltip ? <Tooltip content={fieldTooltip}>{<span className="min-w-0 flex-1 truncate">{<span className="inline-block max-w-full truncate rounded-[4px] bg-ed-primary/[7%] px-1 align-middle">{sourceClass}</span>}</span>}</Tooltip> : <span className="min-w-0 flex-1 truncate">{<span className="inline-block max-w-full truncate rounded-[4px] bg-ed-primary/[7%] px-1 align-middle">{sourceClass}</span>}</span>;
    $[4] = fieldTooltip;
    $[5] = sourceClass;
    $[6] = t5;
  } else t5 = $[6];
  let t6;
  if ($[7] !== value) {
    t6 = value !== void 0 && <span className={cn$2("max-w-0 shrink-0 overflow-hidden whitespace-nowrap text-right text-ed-foreground opacity-0", "group-hover/inspector-control:max-w-[45%] group-hover/inspector-control:opacity-100")}>{value}</span>;
    $[7] = value;
    $[8] = t6;
  } else t6 = $[8];
  let t7;
  if ($[9] !== clearStopsPropagation || $[10] !== clearTitle || $[11] !== onClear) {
    t7 = onClear && <ActiveClassUnlinkAction onClear={onClear} title={clearTitle} clearStopsPropagation={clearStopsPropagation} />;
    $[9] = clearStopsPropagation;
    $[10] = clearTitle;
    $[11] = onClear;
    $[12] = t7;
  } else t7 = $[12];
  let t8;
  if ($[13] !== t3 || $[14] !== t4 || $[15] !== t5 || $[16] !== t6 || $[17] !== t7) {
    t8 = <span className={t3}>{t4}{t5}{t6}{t7}</span>;
    $[13] = t3;
    $[14] = t4;
    $[15] = t5;
    $[16] = t6;
    $[17] = t7;
    $[18] = t8;
  } else t8 = $[18];
  return t8;
}

export { ActiveClassChip, ActiveClassUnlinkAction };
