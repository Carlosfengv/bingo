/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/layout/flexDistribution.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* The `justify-content` values that distribute flex items along the main axis
* instead of packing them. Ordered as the alignment matrix cycles through them.
*/
var FLEX_DISTRIBUTIONS = ["space-between", "space-around", "space-evenly"];
function asFlexDistribution(value) {
  return FLEX_DISTRIBUTIONS.includes(value) ? value : null;
}

export { FLEX_DISTRIBUTIONS, asFlexDistribution };
