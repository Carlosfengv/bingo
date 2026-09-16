/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/lib/utils.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

var twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["ed-chat"]
    }
  }
});
function cn$2(...inputs) {
  return twMerge(clsx(inputs));
}

export { cn$2 };
