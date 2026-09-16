/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/utils/color.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

function rgbaToCss(color, opacity = 1) {
  if (!color) return void 0;
  return `rgba(${Math.round((color.r ?? 0) * 255)}, ${Math.round((color.g ?? 0) * 255)}, ${Math.round((color.b ?? 0) * 255)}, ${(color.a ?? 1) * opacity})`;
}

export { rgbaToCss };
