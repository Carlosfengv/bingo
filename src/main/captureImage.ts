/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: src/main/captureImage.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Downscale an offscreen page capture for review and encode it as base64 PNG.
*
* Mirrors the shared capture budget (see @bingo/editor/lib):
* width drives legibility, so a tall page keeps its proportions and grows taller
* instead of being squashed into a fixed box.
*/
var MAX_WIDTH = 2400;
var MAX_PIXELS = 6e6;
function toPngBase64(image) {
  const {
    width,
    height
  } = image.getSize();
  const scale = Math.min(1, MAX_WIDTH / width, Math.sqrt(MAX_PIXELS / (width * height)));
  return (scale < 1 ? image.resize({
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  }) : image).toPNG().toString("base64");
}

export { toPngBase64 };
