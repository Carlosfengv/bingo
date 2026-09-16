/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/assets/BingoLogo.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_compiler_runtime from "react/compiler-runtime";

/** Solid Bingo mark. Fill follows `currentColor` — black on light chrome. */
function BingoLogo(props) {
  const $ = (0, import_compiler_runtime.c)(3);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <><circle cx="67.5" cy="67.5" r="58" fill="none" stroke="currentColor" strokeWidth="8" /><path d="M44 28h27c18 0 29 8.5 29 23 0 9-4.5 16-12.5 20 9.5 3.5 15 11 15 21.5 0 16.5-12.5 26.5-32.5 26.5H44V28Zm15 13v24h10.5c9.5 0 15-4.5 15-12s-5.5-12-15-12H59Zm0 36.5V106h11.5c11 0 16.5-5 16.5-14.5 0-9.5-6-14-17.5-14H59Z" fill="currentColor" /></>;
    $[0] = t0;
  } else t0 = $[0];
  let t1;
  if ($[1] !== props) {
    t1 = <svg viewBox="0 0 135 135" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden={true} {...props}>{t0}</svg>;
    $[1] = props;
    $[2] = t1;
  } else t1 = $[2];
  return t1;
}

export { BingoLogo };
