/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/lib/canvasPreview.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { __vitePreload as __bingo_vitePreload } from "../../../../../src/renderer/vite-preload-helper";

/**
* Captures the project's first page as a PNG for the dashboard preview.
*
* Deliberately one page rather than the whole canvas: canvases are laid out
* freely, so their overall bounds have arbitrary aspect (a row of artboards can
* be 12000x900), which scales down to an illegible sliver in a preview card.
* The first page in document order stands in for the project — its position on
* the canvas is irrelevant, so we pick by order, not by where it happens to sit.
*/
/**
* Longest edge of the captured image. Dashboard cards use a
* `minmax(320px, 1fr)` grid, so they stretch well past 320px — up to ~640px
* CSS in a 2-column layout. 1280 keeps that crisp on a 2x retina display.
* (Pages smaller than this capture at native size — see the scale cap below.)
*/
var MAX_EDGE = 1280;
/** A broken asset shouldn't cost us the whole preview — render a gap instead. */
var TRANSPARENT_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
/**
* The first page's rendered content — what proto/preview mode shows.
*
* Roots render in store order, so the first `[data-canvas-root-id]` in document
* order is the first page. Its wrapper is only editor scaffolding (an absolutely
* positioned shell around a zero-size helper); the first `[data-element-id]`
* inside is the actual rendered element tree, so capturing that gives a clean
* preview-mode image rather than the canvas wrapper.
*/
function findPreviewTarget(content) {
  const firstRoot = content.querySelector("[data-canvas-root-id]");
  if (!firstRoot) return null;
  return firstRoot.querySelector("[data-element-id]") ?? firstRoot;
}
async function captureCanvasPreview() {
  const content = document.querySelector("[data-canvas-content]");
  if (!content) return null;
  const target = findPreviewTarget(content);
  if (!target) return null;
  const width = target.offsetWidth;
  const height = target.offsetHeight;
  if (width < 1 || height < 1) return null;
  const {
    toPng
  } = await __bingo_vitePreload(async () => {
    const {
      toPng
    } = await import("html-to-image");
    return {
      toPng
    };
  }, [], import.meta.url);
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const restoreImages = await inlineAssetImages(target);
  try {
    return await toPng(target, {
      width,
      height,
      canvasWidth: Math.max(1, Math.round(width * scale)),
      canvasHeight: Math.max(1, Math.round(height * scale)),
      filter: node => !node?.hasAttribute?.("data-overlay-container"),
      includeQueryParams: true,
      imagePlaceholder: TRANSPARENT_PIXEL
    });
  } finally {
    restoreImages();
  }
}
/**
* Inline project asset images as data URLs before capture.
*
* html-to-image embeds each <img> by `fetch`-ing its src — but asset URLs are
* `/assets/by-path` which 302-redirects to R2, and that cross-origin redirect
* fails the CORS fetch, so images come out blank. Fetch the `inline=1` variant
* (served straight from the API, with CORS) into a data URL and swap it in for
* the capture, then restore the originals. Returns the restore fn.
*/
async function inlineAssetImages(root) {
  const imgs = Array.from(root.querySelectorAll("img"));
  const originals = imgs.map(img => [img, img.getAttribute("src")]);
  await Promise.all(imgs.map(async img => {
    const src = img.getAttribute("src");
    if (!src || !src.includes("/assets/by-path")) return;
    const inlineUrl = src.includes("inline=") ? src : `${src}${src.includes("?") ? "&" : "?"}inline=1`;
    try {
      const res = await fetch(inlineUrl);
      if (!res.ok) return;
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      img.setAttribute("src", dataUrl);
    } catch {}
  }));
  return () => {
    for (const [img, src] of originals) if (src !== null) img.setAttribute("src", src);
  };
}

export { captureCanvasPreview };
