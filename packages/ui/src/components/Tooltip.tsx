/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Tooltip.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { Content as Content2$6, Portal as Portal$5, Provider, Root as Root3$1, Trigger as Trigger$6 } from "@radix-ui/react-tooltip";
import * as import_compiler_runtime from "react/compiler-runtime";

function TooltipProvider(t0) {
  const $ = (0, import_compiler_runtime.c)(8);
  let props;
  let t1;
  let t2;
  if ($[0] !== t0) {
    ({
      delayDuration: t1,
      skipDelayDuration: t2,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = props;
    $[2] = t1;
    $[3] = t2;
  } else {
    props = $[1];
    t1 = $[2];
    t2 = $[3];
  }
  const delayDuration = t1 === void 0 ? 1e3 : t1;
  const skipDelayDuration = t2 === void 0 ? 300 : t2;
  let t3;
  if ($[4] !== delayDuration || $[5] !== props || $[6] !== skipDelayDuration) {
    t3 = <Provider data-slot="tooltip-provider" delayDuration={delayDuration} skipDelayDuration={skipDelayDuration} {...props} />;
    $[4] = delayDuration;
    $[5] = props;
    $[6] = skipDelayDuration;
    $[7] = t3;
  } else t3 = $[7];
  return t3;
}
function Tooltip(t0) {
  const $ = (0, import_compiler_runtime.c)(17);
  let children;
  let content;
  let contentProps;
  let props;
  if ($[0] !== t0) {
    ({
      content,
      contentProps,
      children,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = children;
    $[2] = content;
    $[3] = contentProps;
    $[4] = props;
  } else {
    children = $[1];
    content = $[2];
    contentProps = $[3];
    props = $[4];
  }
  if (content === void 0) {
    let t1;
    if ($[5] !== children || $[6] !== props) {
      t1 = <Root3$1 data-slot="tooltip" {...props}>{children}</Root3$1>;
      $[5] = children;
      $[6] = props;
      $[7] = t1;
    } else t1 = $[7];
    return t1;
  }
  let t1;
  if ($[8] !== children) {
    t1 = <TooltipTrigger asChild={true}>{children}</TooltipTrigger>;
    $[8] = children;
    $[9] = t1;
  } else t1 = $[9];
  let t2;
  if ($[10] !== content || $[11] !== contentProps) {
    t2 = <TooltipContent {...contentProps}>{content}</TooltipContent>;
    $[10] = content;
    $[11] = contentProps;
    $[12] = t2;
  } else t2 = $[12];
  let t3;
  if ($[13] !== props || $[14] !== t1 || $[15] !== t2) {
    t3 = <Root3$1 data-slot="tooltip" {...props}>{t1}{t2}</Root3$1>;
    $[13] = props;
    $[14] = t1;
    $[15] = t2;
    $[16] = t3;
  } else t3 = $[16];
  return t3;
}
function TooltipTrigger(t0) {
  const $ = (0, import_compiler_runtime.c)(4);
  let props;
  if ($[0] !== t0) {
    ({
      ...props
    } = t0);
    $[0] = t0;
    $[1] = props;
  } else props = $[1];
  let t1;
  if ($[2] !== props) {
    t1 = <Trigger$6 data-slot="tooltip-trigger" {...props} />;
    $[2] = props;
    $[3] = t1;
  } else t1 = $[3];
  return t1;
}
function TooltipContent(t0) {
  const $ = (0, import_compiler_runtime.c)(14);
  let children;
  let className;
  let props;
  let t1;
  let t2;
  if ($[0] !== t0) {
    ({
      className,
      side: t1,
      sideOffset: t2,
      children,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = children;
    $[2] = className;
    $[3] = props;
    $[4] = t1;
    $[5] = t2;
  } else {
    children = $[1];
    className = $[2];
    props = $[3];
    t1 = $[4];
    t2 = $[5];
  }
  const side = t1 === void 0 ? "bottom" : t1;
  const sideOffset = t2 === void 0 ? 4 : t2;
  let t3;
  if ($[6] !== className) {
    t3 = cn$2("bg-ed-tooltip text-ed-tooltip-foreground border border-ed-tooltip-border z-50 w-fit max-w-64 rounded px-2 py-1 text-[11px] leading-3 text-balance", className);
    $[6] = className;
    $[7] = t3;
  } else t3 = $[7];
  let t4;
  if ($[8] !== children || $[9] !== props || $[10] !== side || $[11] !== sideOffset || $[12] !== t3) {
    t4 = <Portal$5>{<Content2$6 data-slot="tooltip-content" side={side} sideOffset={sideOffset} className={t3} {...props}>{children}</Content2$6>}</Portal$5>;
    $[8] = children;
    $[9] = props;
    $[10] = side;
    $[11] = sideOffset;
    $[12] = t3;
    $[13] = t4;
  } else t4 = $[13];
  return t4;
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
