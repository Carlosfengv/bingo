/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/effects.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { EFFECT_DEFS } from "../constants";

/**
* Effects classification — bucket Tailwind utility classes into the
* Effects section's editable subtypes (size, color, blur, etc.).
*/
/** Map a Tailwind class to its Effects subtype (size, color, blur…) or null. */
function classifyEffect(cls) {
  for (const def of EFFECT_DEFS) if (def.prefix.test(cls)) return def.type;
  return null;
}

export { classifyEffect };
