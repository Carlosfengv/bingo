/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/SegmentedIconButton.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { Button } from "./Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var SegmentedIconButtonGroup = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(9);
  let className;
  let props;
  if ($[0] !== t0) {
    ({
      className,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
  } else {
    className = $[1];
    props = $[2];
  }
  let t1;
  if ($[3] !== className) {
    t1 = cn$2("flex h-[26px] w-fit items-stretch gap-0.5 overflow-hidden rounded-[5px] bg-ed-muted p-0.5", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== ref || $[7] !== t1) {
    t2 = <div ref={ref} role="group" data-slot="segmented-icon-button-group" className={t1} {...props} />;
    $[5] = props;
    $[6] = ref;
    $[7] = t1;
    $[8] = t2;
  } else t2 = $[8];
  return t2;
});
SegmentedIconButtonGroup.displayName = "SegmentedIconButtonGroup";
var SegmentedIconButton = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(28);
  let active;
  let children;
  let className;
  let label;
  let props;
  let t1;
  let title;
  let tooltip;
  if ($[0] !== t0) {
    ({
      active,
      label,
      tooltip,
      className,
      children,
      type: t1,
      title,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = active;
    $[2] = children;
    $[3] = className;
    $[4] = label;
    $[5] = props;
    $[6] = t1;
    $[7] = title;
    $[8] = tooltip;
  } else {
    active = $[1];
    children = $[2];
    className = $[3];
    label = $[4];
    props = $[5];
    t1 = $[6];
    title = $[7];
    tooltip = $[8];
  }
  const type = t1 === void 0 ? "button" : t1;
  const t2 = title ?? label;
  const t3 = active === void 0 ? void 0 : active;
  const t4 = active && "bg-ed-tab-active text-ed-foreground shadow-ed-selected hover:bg-ed-tab-active hover:text-ed-foreground";
  let t5;
  if ($[9] !== className || $[10] !== t4) {
    t5 = cn$2("h-full min-w-[22px] flex-1 rounded-[5px] p-0 text-ed-inspector-chrome shadow-none", "hover:bg-ed-tab-active/70 hover:text-ed-foreground", "focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ed-ring focus-visible:ring-offset-0", t4, className);
    $[9] = className;
    $[10] = t4;
    $[11] = t5;
  } else t5 = $[11];
  let t6;
  if ($[12] !== children || $[13] !== label || $[14] !== props || $[15] !== ref || $[16] !== t2 || $[17] !== t3 || $[18] !== t5 || $[19] !== type) {
    t6 = <Button ref={ref} type={type} variant="ghost" size="icon-xs" isChildText={false} data-slot="segmented-icon-button" title={t2} aria-label={label} aria-pressed={t3} className={t5} {...props}>{children}</Button>;
    $[12] = children;
    $[13] = label;
    $[14] = props;
    $[15] = ref;
    $[16] = t2;
    $[17] = t3;
    $[18] = t5;
    $[19] = type;
    $[20] = t6;
  } else t6 = $[20];
  const button = t6;
  if (!tooltip) return button;
  let t7;
  if ($[21] !== button) {
    t7 = <TooltipTrigger asChild={true}>{button}</TooltipTrigger>;
    $[21] = button;
    $[22] = t7;
  } else t7 = $[22];
  let t8;
  if ($[23] !== tooltip) {
    t8 = <TooltipContent>{tooltip}</TooltipContent>;
    $[23] = tooltip;
    $[24] = t8;
  } else t8 = $[24];
  let t9;
  if ($[25] !== t7 || $[26] !== t8) {
    t9 = <Tooltip>{t7}{t8}</Tooltip>;
    $[25] = t7;
    $[26] = t8;
    $[27] = t9;
  } else t9 = $[27];
  return t9;
});
SegmentedIconButton.displayName = "SegmentedIconButton";

export { SegmentedIconButton, SegmentedIconButtonGroup };
