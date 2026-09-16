/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/state/hoverChannel.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var hoveredId = null;
var listeners$1 = new Set();
/** No-ops when the id is unchanged, so callers can publish per pointer move. */
function publishHover(id, source) {
  if (hoveredId === id) return;
  hoveredId = id;
  for (const listener of listeners$1) listener(id, source);
}
function subscribeHover(listener) {
  listeners$1.add(listener);
  return () => {
    listeners$1.delete(listener);
  };
}

export { publishHover, subscribeHover };
