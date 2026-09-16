/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/scaleTransform.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var number$2 = value => String(Number(value.toFixed(6)));
var scaleToken = /\b(scale|scaleX|scaleY)\(\s*([\d.e+-]+)(?:[\s,]+([\d.e+-]+))?\s*\)/gi;
/** Local axis magnitudes; reflections retain their signs in the original transform. */
function getTransformScales(transform = "") {
  let x = 1,
    y = 1;
  for (const match of transform.matchAll(scaleToken)) {
    const first = Math.abs(Number(match[2]));
    const second = match[3] === void 0 ? first : Math.abs(Number(match[3]));
    if (!Number.isFinite(first) || !Number.isFinite(second)) continue;
    if (match[1] !== "scaleY") x *= first;
    if (match[1] !== "scaleX") y *= second;
  }
  const matrix = transform.match(/matrix\(([^)]+)\)/);
  if (matrix) {
    const values = matrix[1].split(",").map(Number);
    if (values.length === 6) {
      x *= Math.hypot(values[0], values[1]);
      y *= Math.hypot(values[2], values[3]);
    }
  }
  return {
    x,
    y
  };
}
/** Remove scale magnitudes directly. Appending a rounded reciprocal can leave
* a matrix slightly scaled, preventing scale/pivot metadata from being cleared. */
function removeTransformScale(transform = "") {
  if (transform === "none") return "";
  return transform.replace(scaleToken, (token, name, first, second) => {
    const x = Number(first),
      y = Number(second ?? first);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return token;
    if (name.toLowerCase() === "scalex") return x < 0 ? "scaleX(-1)" : "";
    if (name.toLowerCase() === "scaley") return x < 0 ? "scaleY(-1)" : "";
    if (x >= 0 && y >= 0) return "";
    return x === y ? `scale(${x < 0 ? -1 : 1})` : `scale(${x < 0 ? -1 : 1}, ${y < 0 ? -1 : 1})`;
  }).replace(/matrix\(([^)]+)\)/gi, (token, values) => {
    const parts = values.split(",").map(Number);
    if (parts.length !== 6 || parts.some(value => !Number.isFinite(value))) return token;
    const [a, b, c, d, e, f] = parts;
    const x = Math.hypot(a, b),
      y = Math.hypot(c, d);
    if (x === 0 || y === 0) return token;
    return `matrix(${[...[a / x, b / x, c / y, d / y].map(number$2), number$2(e), number$2(f)].join(", ")})`;
  }).trim().replace(/\s+/g, " ");
}
/** Append local axis scales without reordering rotation, translation, or flips. */
function multiplyTransformScale(transform, factorX, factorY = factorX) {
  const base = !transform || transform === "none" ? "" : transform.trim();
  if (![factorX, factorY].every(f => Number.isFinite(f) && f > 0) || factorX === 1 && factorY === 1) return base;
  const trailing = base.match(/\s*scale\(\s*([\d.e+-]+)(?:[\s,]+([\d.e+-]+))?\s*\)$/i);
  let prefix = base;
  if (trailing && Number(trailing[1]) > 0 && Number(trailing[2] ?? trailing[1]) > 0) {
    prefix = base.slice(0, trailing.index).trim();
    factorX *= Number(trailing[1]);
    factorY *= Number(trailing[2] ?? trailing[1]);
  }
  const x = number$2(factorX),
    y = number$2(factorY);
  return `${prefix} scale(${x === y ? x : `${x}, ${y}`})`.trim();
}
/** Project a corner drag onto its diagonal; edge handles drive their own axis. */
function scaleFactorForDrag(width, height, handle, dx, dy, symmetric = false) {
  const x = handle.includes("e") ? width : handle.includes("w") ? -width : 0;
  const y = handle.includes("s") ? height : handle.includes("n") ? -height : 0;
  const lengthSquared = x * x + y * y;
  if (!lengthSquared) return 1;
  return Math.max(.01, 1 + (dx * x + dy * y) * (symmetric ? 2 : 1) / lengthSquared);
}
/** Remove only tool-owned translations, from last to first to preserve authored duplicates. */
function removeScaleAnchorTransform(transform, anchor) {
  const tokens = typeof anchor === "string" ? [anchor] : anchor ?? [];
  for (const token of [...tokens].reverse()) {
    const index = transform.lastIndexOf(token);
    if (index >= 0) transform = transform.slice(0, index) + transform.slice(index + token.length);
  }
  return transform.trim().replace(/\s+/g, " ");
}
function hasScaleAnchorTransform(transform, anchor) {
  const tokens = typeof anchor === "string" ? [anchor] : anchor;
  for (const token of [...tokens].reverse()) {
    const index = transform.lastIndexOf(token);
    if (index < 0) return false;
    transform = transform.slice(0, index) + transform.slice(index + token.length);
  }
  return true;
}
/** Scale around the opposite handle using CSS's native percentage pivot. */
function scaleTransformAtHandle(transform, factor, width, height, handle, linear, origin, symmetric = false, factorY = factor) {
  return scaleTransformAtPoint(transform, factor, linear, origin, {
    x: symmetric || !/[ew]/.test(handle) ? width / 2 : handle.includes("w") ? width : 0,
    y: symmetric || !/[ns]/.test(handle) ? height / 2 : handle.includes("n") ? height : 0
  }, {
    width,
    height
  }, factorY);
}
function scaleTransformAtPoint(transform, factor, linear, origin, anchor, size, factorY = factor) {
  const dx = anchor.x - origin.x,
    dy = anchor.y - origin.y;
  return {
    transform: multiplyTransformScale(transform, factor, factorY),
    transformOrigin: `${number$2(anchor.x / size.width * 100)}% ${number$2(anchor.y / size.height * 100)}%`,
    positionDelta: {
      x: (linear.a - 1) * dx + linear.c * dy || 0,
      y: linear.b * dx + (linear.d - 1) * dy || 0
    }
  };
}

export { getTransformScales, hasScaleAnchorTransform, multiplyTransformScale, removeScaleAnchorTransform, removeTransformScale, scaleFactorForDrag, scaleTransformAtHandle, scaleTransformAtPoint };
