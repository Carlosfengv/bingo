/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/transformMatrix.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var IDENTITY_LINEAR = {
  a: 1,
  b: 0,
  c: 0,
  d: 1
};
/** Linear part of a CSS transform string. `none` / empty → identity. */
function linearFromTransform(t) {
  if (!t || t === "none") return IDENTITY_LINEAR;
  const m = new DOMMatrix(t);
  return {
    a: m.a,
    b: m.b,
    c: m.c,
    d: m.d
  };
}
/** DOMMatrix cannot resolve percentage translations. Linear-only consumers
* can discard translations, including nested calc()/var() arguments. */
function transformLinearMatrix(transform) {
  let linear = transform ?? "";
  const translation = /\btranslate(?:[XYZ]|3d)?\(/gi;
  let match;
  while (match = translation.exec(linear)) {
    let end = translation.lastIndex,
      depth = 1;
    while (end < linear.length && depth) {
      if (linear[end] === "(") depth++;
      if (linear[end] === ")") depth--;
      end++;
    }
    linear = linear.slice(0, match.index) + linear.slice(end);
    translation.lastIndex = match.index;
  }
  return new DOMMatrix(linear.trim() === "none" ? "" : linear);
}
/** Change in parent-space translation per pixel of local width/height change. */
function relativeTranslationMatrix(transform) {
  const result = {
    a: 0,
    b: 0,
    c: 0,
    d: 0
  };
  if (!transform) return result;
  for (const match of transform.matchAll(/\btranslate\(\s*([\d.e+-]+)%,\s*([\d.e+-]+)%\s*\)/g)) {
    const prefix = transformLinearMatrix(transform.slice(0, match.index));
    const x = Number(match[1]) / 100,
      y = Number(match[2]) / 100;
    result.a += prefix.a * x;
    result.b += prefix.b * x;
    result.c += prefix.c * y;
    result.d += prefix.d * y;
  }
  return result;
}
/** Inverse of a 2D linear matrix; identity if (near-)singular. */
function invertLinear(m) {
  const det = m.a * m.d - m.b * m.c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-8) return IDENTITY_LINEAR;
  return {
    a: m.d / det,
    b: -m.b / det,
    c: -m.c / det,
    d: m.a / det
  };
}
/** Matrix product a·b (linear parts only). */
function multiplyLinear(a, b) {
  return {
    a: a.a * b.a + a.c * b.b,
    b: a.b * b.a + a.d * b.b,
    c: a.a * b.c + a.c * b.d,
    d: a.b * b.c + a.d * b.d
  };
}
function accumulatedLinearTransform(el, cache) {
  const cached = cache?.get(el);
  if (cached) return cached;
  const chain = [];
  let acc = IDENTITY_LINEAR;
  let cur = el;
  while (cur) {
    if (cur.classList?.contains("react-transform-component")) break;
    const hit = cache?.get(cur);
    if (hit) {
      acc = hit;
      break;
    }
    chain.push(cur);
    cur = cur.parentElement;
  }
  for (let i = chain.length - 1; i >= 0; i--) {
    const node = chain[i];
    const own = linearFromTransform(window.getComputedStyle(node).transform);
    if (own !== IDENTITY_LINEAR) acc = multiplyLinear(acc, own);
    cache?.set(node, acc);
  }
  return acc;
}
/** `accumulatedLinearTransform` as an inline-style string (`none` if identity). */
function accumulatedLinearTransformString(el, cache) {
  const m = accumulatedLinearTransform(el, cache);
  if (m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1) return "none";
  return `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, 0, 0)`;
}

export { IDENTITY_LINEAR, accumulatedLinearTransform, accumulatedLinearTransformString, invertLinear, linearFromTransform, multiplyLinear, relativeTranslationMatrix, transformLinearMatrix };
