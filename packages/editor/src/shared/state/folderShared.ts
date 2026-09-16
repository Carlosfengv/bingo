/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/state/folderShared.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* "The user just picked a folder for the AI." Settings publishes it; the chat
* panel settles its parked folder-access prompt on it. Keyed on the pick, not
* on the allowed-path list changing: re-picking a folder that is already
* shared is a no-op mutation but still an answer.
*/
var EVENT = "bingo-folder-shared";
function publishFolderShared(path) {
  window.dispatchEvent(new CustomEvent(EVENT, {
    detail: {
      path
    }
  }));
}
function subscribeFolderShared(listener) {
  const handler = event => listener(event.detail.path);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export { publishFolderShared, subscribeFolderShared };
