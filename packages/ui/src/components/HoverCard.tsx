/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/HoverCard.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { Content as Content2$1, Portal as Portal$1, Root as Root2$3, Trigger as Trigger$2 } from "@radix-ui/react-hover-card";
import * as import_compiler_runtime from "react/compiler-runtime";

function HoverCard(t0) {
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
    t1 = <Root2$3 data-slot="hover-card" {...props} />;
    $[2] = props;
    $[3] = t1;
  } else t1 = $[3];
  return t1;
}
function HoverCardTrigger(t0) {
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
    t1 = <Trigger$2 data-slot="hover-card-trigger" {...props} />;
    $[2] = props;
    $[3] = t1;
  } else t1 = $[3];
  return t1;
}
function HoverCardContent(t0) {
  const $ = (0, import_compiler_runtime.c)(12);
  let className;
  let props;
  let t1;
  let t2;
  if ($[0] !== t0) {
    ({
      className,
      align: t1,
      sideOffset: t2,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
    $[3] = t1;
    $[4] = t2;
  } else {
    className = $[1];
    props = $[2];
    t1 = $[3];
    t2 = $[4];
  }
  const align = t1 === void 0 ? "center" : t1;
  const sideOffset = t2 === void 0 ? 4 : t2;
  let t3;
  if ($[5] !== className) {
    t3 = cn$2("z-50 w-64 rounded-xl border border-ed-border bg-ed-popover text-ed-popover-foreground shadow-ed-popover outline-hidden", className);
    $[5] = className;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== align || $[8] !== props || $[9] !== sideOffset || $[10] !== t3) {
    t4 = <Portal$1 data-slot="hover-card-portal">{<Content2$1 data-slot="hover-card-content" align={align} sideOffset={sideOffset} className={t3} {...props} />}</Portal$1>;
    $[7] = align;
    $[8] = props;
    $[9] = sideOffset;
    $[10] = t3;
    $[11] = t4;
  } else t4 = $[11];
  return t4;
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
