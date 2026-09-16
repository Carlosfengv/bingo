/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/utils/imagePaint.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

function paintImageHashHex(paint) {
  return hashBytesToHex(paint.image?.hash) ?? hashBytesToHex(paint.imageThumbnail?.hash);
}
function hashBytesToHex(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    const hex = raw.replace(/[^a-f0-9]/gi, "").toLowerCase();
    return hex.length > 0 ? hex : null;
  }
  let bytes;
  if (raw instanceof Uint8Array) bytes = raw;else if (typeof raw !== "object") return null;else {
    const keys = Object.keys(raw).map(Number).filter(n => !Number.isNaN(n)).sort((a, b) => a - b);
    if (keys.length === 0) return null;
    bytes = new Uint8Array(keys.length);
    for (let i = 0; i < keys.length; i++) bytes[i] = raw[String(keys[i])] ?? 0;
  }
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

export { paintImageHashHex };
