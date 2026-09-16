/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/fontLoader.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getFontDisplayName } from "./typography";

/** Collect unique primary font-family names from a nested element tree. */
function collectFontFamilies(nodes) {
  const families = new Set();
  const walk = el => {
    const family = el.styles?.fontFamily;
    if (typeof family === "string") {
      const primary = getFontDisplayName(family);
      if (primary) families.add(primary);
    }
    if (Array.isArray(el.children)) for (const child of el.children) walk(child);
  };
  for (const el of nodes) walk(el);
  return [...families];
}
var SYSTEM_FONTS = new Set(["Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Verdana", "Tahoma", "Trebuchet MS", "SF Pro", "system-ui", "sans-serif", "serif", "monospace"]);
var requested = new Set();
var linkEl = null;
/**
* Ensure the given font families are loaded. New families accumulate into one
* stylesheet link; system fonts and already-requested families are ignored.
*/
function ensureFontsLoaded(families) {
  if (typeof document === "undefined") return;
  let added = false;
  for (const raw of families) {
    const name = raw?.trim();
    if (!name || SYSTEM_FONTS.has(name) || requested.has(name)) continue;
    requested.add(name);
    added = true;
  }
  if (!added) return;
  const href = `https://fonts.googleapis.com/css2?${[...requested].map(f => `family=${encodeURIComponent(f).replace(/%20/g, "+")}`).join("&")}&display=swap`;
  if (!linkEl) {
    linkEl = document.createElement("link");
    linkEl.rel = "stylesheet";
    linkEl.id = "bingo-font-preview";
    document.head.appendChild(linkEl);
  }
  linkEl.href = href;
}
var CHUNK_SIZE = 40;
var previewRequested = new Set();
var previewChunks = [];
var previewCount = 0;
/** Lazily load regular-weight faces for font-picker preview rows. Bounded URLs. */
function ensureFontPreviews(families) {
  if (typeof document === "undefined") return;
  for (const raw of families) {
    const name = raw?.trim();
    if (!name || SYSTEM_FONTS.has(name) || previewRequested.has(name)) continue;
    previewRequested.add(name);
    if (!previewChunks.length || previewCount >= CHUNK_SIZE) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset.bingoFontPreviewChunk = String(previewChunks.length);
      document.head.appendChild(link);
      previewChunks.push(link);
      previewCount = 0;
    }
    previewCount++;
  }
  const last = previewChunks[previewChunks.length - 1];
  if (!last) return;
  const start = (previewChunks.length - 1) * CHUNK_SIZE;
  last.href = `https://fonts.googleapis.com/css2?${[...previewRequested].slice(start, start + CHUNK_SIZE).map(f => `family=${encodeURIComponent(f).replace(/%20/g, "+")}`).join("&")}&display=swap`;
}

export { collectFontFamilies, ensureFontPreviews, ensureFontsLoaded };
