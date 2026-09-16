/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Sonner.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useIsDark } from "../hooks/useIsDark";
import { CircleCheck, Info as Info$1, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";
import * as import_compiler_runtime from "react/compiler-runtime";
import { Toaster as Toaster$1 } from "sonner";

var Toaster = t0 => {
  const $ = (0, import_compiler_runtime.c)(8);
  let props;
  let theme;
  if ($[0] !== t0) {
    ({
      theme,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = props;
    $[2] = theme;
  } else {
    props = $[1];
    theme = $[2];
  }
  const isDark = useIsDark();
  const t1 = theme ?? (isDark ? "dark" : "light");
  let t2;
  let t3;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = {
      success: <CircleCheck className="size-4" />,
      info: <Info$1 className="size-4" />,
      warning: <TriangleAlert className="size-4" />,
      error: <OctagonX className="size-4" />,
      loading: <LoaderCircle className="size-4 animate-spin" />
    };
    t3 = {
      "--normal-bg": "var(--ed-popover)",
      "--normal-text": "var(--ed-popover-foreground)",
      "--normal-border": "var(--ed-border)",
      "--border-radius": "var(--radius)"
    };
    $[3] = t2;
    $[4] = t3;
  } else {
    t2 = $[3];
    t3 = $[4];
  }
  let t4;
  if ($[5] !== props || $[6] !== t1) {
    t4 = <Toaster$1 theme={t1} className="toaster group" icons={t2} style={t3} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t4;
  } else t4 = $[7];
  return t4;
};

export { Toaster };
