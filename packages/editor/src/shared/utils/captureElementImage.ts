/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/captureElementImage.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { __vitePreload as __bingo_vitePreload } from "../../../../../src/renderer/vite-preload-helper";

/**
* Element → PNG capture shared by the AI chat and MCP screenshot paths.
*
* Screenshots are for visual review, so width drives legibility and the scale
* must be uniform — clamping width and height independently stretches the image
* (html-to-image draws the source into the whole canvas) and flattens tall pages.
*/
/** Cap on output width; a full-width desktop page still fits comfortably under it. */
var MAX_WIDTH = 2400;
/** html-to-image rasterizes from the DOM, so upscaling adds real detail — but only up to a point. */
var MAX_UPSCALE = 2;
/** Ceiling on canvas area — bounds raster cost and encoded size for very tall pages. */
var MAX_PIXELS = 6e6;
/** Uniform scale that fits an element into the capture budget without distorting it. */
function captureScale(width, height) {
  return Math.min(MAX_UPSCALE, MAX_WIDTH / width, Math.sqrt(MAX_PIXELS / (width * height)));
}
/**
* Component identity lives on a display:contents wrapper so it does not alter
* project layout. That wrapper has no box of its own; measuring/rasterizing it
* produces a fallback-sized bitmap with the real component offset and clipped.
* Resolve through single-host component wrappers to the element that paints.
*/
function resolveCaptureElement(el) {
  let current = el;
  const seen = new Set();
  while (!seen.has(current)) {
    seen.add(current);
    const view = current.ownerDocument.defaultView;
    if (!view || view.getComputedStyle(current).display !== "contents") break;
    const children = Array.from(current.children).filter(child => child instanceof view.HTMLElement);
    if (children.length !== 1) break;
    current = children[0];
  }
  return current;
}
/** Rasterize an element to a PNG data URL, preserving its aspect ratio. */
async function captureElementImage(el, options = {}) {
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
  const target = resolveCaptureElement(el);
  const width = target.scrollWidth || target.offsetWidth || 200;
  const height = target.scrollHeight || target.offsetHeight || 200;
  const scale = captureScale(width, height);
  const capture = toPng(target, {
    width,
    height,
    canvasWidth: Math.max(1, Math.round(width * scale)),
    canvasHeight: Math.max(1, Math.round(height * scale)),
    pixelRatio: 1,
    filter: node => !node?.hasAttribute?.("data-overlay-container"),
    includeQueryParams: true
  });
  if (!options.timeoutMs) return capture;
  let timeout;
  try {
    return await Promise.race([capture, new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`html-to-image timed out after ${options.timeoutMs}ms`)), options.timeoutMs);
    })]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export { captureElementImage, resolveCaptureElement };
