/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Popover.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { Anchor as Anchor2, Content as Content2, Portal, Root as Root2$2, Trigger as Trigger$1 } from "@radix-ui/react-popover";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var Popover = Root2$2;
var PopoverTrigger = Trigger$1;
var PopoverAnchor = Anchor2;
var PopoverContent = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(15);
  let className;
  let props;
  let t1;
  let t2;
  let t3;
  if ($[0] !== t0) {
    ({
      className,
      align: t1,
      sideOffset: t2,
      variant: t3,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
    $[3] = t1;
    $[4] = t2;
    $[5] = t3;
  } else {
    className = $[1];
    props = $[2];
    t1 = $[3];
    t2 = $[4];
    t3 = $[5];
  }
  const align = t1 === void 0 ? "start" : t1;
  const sideOffset = t2 === void 0 ? 4 : t2;
  const t4 = (t3 === void 0 ? "default" : t3) === "menu" ? "border-ed-menu-border bg-ed-menu p-1 text-[11px]" : "bg-ed-popover border-ed-border";
  let t5;
  if ($[6] !== className || $[7] !== t4) {
    t5 = cn$2("text-ed-popover-foreground z-50 rounded-md border shadow-ed-popover outline-none", t4, className);
    $[6] = className;
    $[7] = t4;
    $[8] = t5;
  } else t5 = $[8];
  let t6;
  if ($[9] !== align || $[10] !== props || $[11] !== ref || $[12] !== sideOffset || $[13] !== t5) {
    t6 = <Portal>{<Content2 ref={ref} align={align} sideOffset={sideOffset} className={t5} {...props} />}</Portal>;
    $[9] = align;
    $[10] = props;
    $[11] = ref;
    $[12] = sideOffset;
    $[13] = t5;
    $[14] = t6;
  } else t6 = $[14];
  return t6;
});
PopoverContent.displayName = Content2.displayName;

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
