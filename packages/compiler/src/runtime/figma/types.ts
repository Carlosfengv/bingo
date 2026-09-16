/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/types.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

function uniqueFigmaImageHashes(pending) {
  const seen = new Set();
  const hashes = [];
  for (const {
    imageHash
  } of pending) {
    if (seen.has(imageHash)) continue;
    seen.add(imageHash);
    hashes.push(imageHash);
  }
  return hashes;
}

export { uniqueFigmaImageHashes };
