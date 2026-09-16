/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Badge.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { Slot as Slot$5 } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as import_compiler_runtime from "react/compiler-runtime";

var badgeVariants = cva("inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border border-transparent px-2 py-0.5 text-xs font-medium [&>svg]:pointer-events-none [&>svg]:size-3 focus-visible:border-ed-ring focus-visible:ring-ed-ring/50 focus-visible:ring-[3px] aria-invalid:border-ed-destructive aria-invalid:ring-ed-destructive/20 dark:aria-invalid:ring-ed-destructive/40", {
  variants: {
    variant: {
      default: "bg-ed-primary text-ed-primary-foreground [a&]:hover:bg-ed-primary/90",
      secondary: "bg-ed-secondary text-ed-foreground [a&]:hover:bg-ed-secondary/90",
      destructive: "bg-ed-destructive text-white focus-visible:ring-ed-destructive/20 dark:bg-ed-destructive/60 dark:focus-visible:ring-ed-destructive/40 [a&]:hover:bg-ed-destructive/90",
      outline: "border-ed-border text-ed-foreground [a&]:hover:bg-ed-accent [a&]:hover:text-ed-accent-foreground",
      warning: "bg-ed-warning/20 text-ed-warning-foreground"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});
function Badge(t0) {
  const $ = (0, import_compiler_runtime.c)(13);
  let className;
  let props;
  let t1;
  let t2;
  if ($[0] !== t0) {
    ({
      className,
      variant: t1,
      asChild: t2,
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
  const variant = t1 === void 0 ? "default" : t1;
  const Comp = (t2 === void 0 ? false : t2) ? Slot$5 : "span";
  let t3;
  if ($[5] !== className || $[6] !== variant) {
    t3 = cn$2(badgeVariants({
      variant
    }), className);
    $[5] = className;
    $[6] = variant;
    $[7] = t3;
  } else t3 = $[7];
  let t4;
  if ($[8] !== Comp || $[9] !== props || $[10] !== t3 || $[11] !== variant) {
    t4 = <Comp data-slot="badge" data-variant={variant} className={t3} {...props} />;
    $[8] = Comp;
    $[9] = props;
    $[10] = t3;
    $[11] = variant;
    $[12] = t4;
  } else t4 = $[12];
  return t4;
}

export { Badge };
