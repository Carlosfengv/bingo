/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/state/canvasDisplayPreferences.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var PIXEL_GRID_KEY = "bingo:canvas:pixel-grid";
var pixelGridEnabled;
var listeners$2 = new Set();
function getPixelGridEnabled() {
  if (pixelGridEnabled !== void 0) return pixelGridEnabled;
  if (typeof window === "undefined") return true;
  try {
    pixelGridEnabled = localStorage.getItem(PIXEL_GRID_KEY) !== "false";
  } catch {
    pixelGridEnabled = true;
  }
  return pixelGridEnabled;
}
function setPixelGridEnabled(enabled) {
  pixelGridEnabled = enabled;
  try {
    localStorage.setItem(PIXEL_GRID_KEY, String(enabled));
  } catch {}
  for (const listener of listeners$2) listener();
}
function onStorage(event) {
  if (event.key !== PIXEL_GRID_KEY && event.key !== null) return;
  pixelGridEnabled = void 0;
  for (const listener of listeners$2) listener();
}
function subscribePixelGridEnabled(listener) {
  if (listeners$2.size === 0) window.addEventListener("storage", onStorage);
  listeners$2.add(listener);
  return () => {
    listeners$2.delete(listener);
    if (listeners$2.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export { getPixelGridEnabled, setPixelGridEnabled, subscribePixelGridEnabled };
