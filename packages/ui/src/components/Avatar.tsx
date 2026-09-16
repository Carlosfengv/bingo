/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Avatar.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { Fallback, Image as Image$1, Root as Root$7 } from "@radix-ui/react-avatar";
import * as import_compiler_runtime from "react/compiler-runtime";

function Avatar(t0) {
  const $ = (0, import_compiler_runtime.c)(10);
  let className;
  let props;
  let t1;
  if ($[0] !== t0) {
    ({
      className,
      size: t1,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
    $[3] = t1;
  } else {
    className = $[1];
    props = $[2];
    t1 = $[3];
  }
  const size = t1 === void 0 ? "default" : t1;
  let t2;
  if ($[4] !== className) {
    t2 = cn$2("group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6", className);
    $[4] = className;
    $[5] = t2;
  } else t2 = $[5];
  let t3;
  if ($[6] !== props || $[7] !== size || $[8] !== t2) {
    t3 = <Root$7 data-slot="avatar" data-size={size} className={t2} {...props} />;
    $[6] = props;
    $[7] = size;
    $[8] = t2;
    $[9] = t3;
  } else t3 = $[9];
  return t3;
}
function AvatarImage(t0) {
  const $ = (0, import_compiler_runtime.c)(8);
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
    t1 = cn$2("aspect-square size-full", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <Image$1 data-slot="avatar-image" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function AvatarFallback(t0) {
  const $ = (0, import_compiler_runtime.c)(8);
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
    t1 = cn$2("flex size-full items-center justify-center rounded-full bg-ed-muted text-sm text-ed-muted-foreground group-data-[size=sm]/avatar:text-xs", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <Fallback data-slot="avatar-fallback" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}

export { Avatar, AvatarFallback, AvatarImage };
