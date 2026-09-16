/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/state/aiWriteTarget.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var target = null;
function getAiWriteTarget() {
  return target;
}
function publishAiWriteTarget(next) {
  if (target?.chatId === next?.chatId && target?.path === next?.path) return;
  target = next;
}

export { getAiWriteTarget, publishAiWriteTarget };
