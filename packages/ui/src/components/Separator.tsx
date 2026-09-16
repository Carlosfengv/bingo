/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Separator.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { Root as Root$4 } from "@radix-ui/react-separator";
import * as import_compiler_runtime from "react/compiler-runtime";

function Separator$2(t0) {
  const $ = (0, import_compiler_runtime.c)(12);
  let className;
  let props;
  let t1;
  let t2;
  if ($[0] !== t0) {
    ({
      className,
      orientation: t1,
      decorative: t2,
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
  const orientation = t1 === void 0 ? "horizontal" : t1;
  const decorative = t2 === void 0 ? true : t2;
  let t3;
  if ($[5] !== className) {
    t3 = cn$2("bg-ed-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px", className);
    $[5] = className;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== decorative || $[8] !== orientation || $[9] !== props || $[10] !== t3) {
    t4 = <Root$4 data-slot="separator" decorative={decorative} orientation={orientation} className={t3} {...props} />;
    $[7] = decorative;
    $[8] = orientation;
    $[9] = props;
    $[10] = t3;
    $[11] = t4;
  } else t4 = $[11];
  return t4;
}

export { Separator$2 };
