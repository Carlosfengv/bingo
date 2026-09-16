/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/utils/node.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

function figGuidKey(guid) {
  if (!guid || typeof guid.sessionID !== "number" || typeof guid.localID !== "number") return null;
  return `${guid.sessionID}:${guid.localID}`;
}

export { figGuidKey };
