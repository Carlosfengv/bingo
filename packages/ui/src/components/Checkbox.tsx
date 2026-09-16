/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Checkbox.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { Check as n$15 } from "@phosphor-icons/react/dist/icons/Check";
import { Root as Checkbox$1, Indicator as CheckboxIndicator } from "@radix-ui/react-checkbox";
import * as import_compiler_runtime from "react/compiler-runtime";
import * as import_jsx_runtime from "react/jsx-runtime";

function Checkbox(t0) {
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
    t1 = cn$2("peer border-ed-input bg-ed-card data-[state=checked]:bg-ed-primary data-[state=checked]:text-ed-primary-foreground data-[state=checked]:border-ed-primary focus-visible:border-ed-ring focus-visible:ring-ed-ring/50 size-3.5 shrink-0 rounded-[3px] border shadow-ed-control outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-ed-input/30", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <CheckboxIndicator data-slot="checkbox-indicator" className="grid place-content-center text-current">{(0, import_jsx_runtime.jsx)(n$15, {
        className: "size-2.5",
        weight: "bold"
      })}</CheckboxIndicator>;
    $[5] = t2;
  } else t2 = $[5];
  let t3;
  if ($[6] !== props || $[7] !== t1) {
    t3 = <Checkbox$1 data-slot="checkbox" className={t1} {...props}>{t2}</Checkbox$1>;
    $[6] = props;
    $[7] = t1;
    $[8] = t3;
  } else t3 = $[8];
  return t3;
}

export { Checkbox };
