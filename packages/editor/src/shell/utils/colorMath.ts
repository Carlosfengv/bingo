/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/colorMath.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var clamp$1 = (n, min, max) => Math.min(max, Math.max(min, n));
var hex2 = n => clamp$1(Math.round(n), 0, 255).toString(16).padStart(2, "0");
var _normCtx;
function getNormCtx() {
  if (typeof document === "undefined") return null;
  if (_normCtx === void 0) _normCtx = document.createElement("canvas").getContext("2d", {
    willReadFrequently: true
  });
  return _normCtx;
}
function normalizeColor$1(s) {
  const ctx = getNormCtx();
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillStyle = s;
  const a = ctx.fillStyle;
  ctx.fillStyle = "#fff";
  ctx.fillStyle = s;
  if (a !== ctx.fillStyle) return null;
  try {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, bl, al] = ctx.getImageData(0, 0, 1, 1).data;
    return al === 255 ? `rgb(${r}, ${g}, ${bl})` : `rgba(${r}, ${g}, ${bl}, ${+(al / 255).toFixed(3)})`;
  } catch {
    return a;
  }
}
/**
* Parse a CSS color to RGBA, or null if unrecognized. Handles hex (3/6/8) and
* rgb/rgba directly; any other valid CSS color (named, hsl, oklch, color-mix, …)
* is normalized to hex/rgb via a canvas first.
*/
function parseColorToRgba(css) {
  const s = (css || "").trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) return {
    r: parseInt(s[1] + s[1], 16),
    g: parseInt(s[2] + s[2], 16),
    b: parseInt(s[3] + s[3], 16),
    a: 1
  };
  if (/^#[0-9a-f]{6}$/.test(s)) return {
    r: parseInt(s.slice(1, 3), 16),
    g: parseInt(s.slice(3, 5), 16),
    b: parseInt(s.slice(5, 7), 16),
    a: 1
  };
  if (/^#[0-9a-f]{8}$/.test(s)) return {
    r: parseInt(s.slice(1, 3), 16),
    g: parseInt(s.slice(3, 5), 16),
    b: parseInt(s.slice(5, 7), 16),
    a: parseInt(s.slice(7, 9), 16) / 255
  };
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (p.length >= 3) return {
      r: p[0],
      g: p[1],
      b: p[2],
      a: p[3] === void 0 ? 1 : p[3]
    };
  }
  const norm = normalizeColor$1(s);
  if (norm && norm !== s) return parseColorToRgba(norm);
  return null;
}
/**
* Convert any CSS color to a hex string (`#RRGGBB`, or `#RRGGBBAA` when
* translucent). Returns the input unchanged if it can't be parsed.
*/
function colorToHex(css) {
  const rgba = parseColorToRgba(css);
  if (!rgba) return css;
  const base = `#${hex2(rgba.r)}${hex2(rgba.g)}${hex2(rgba.b)}`;
  return rgba.a < 1 ? `${base}${hex2(rgba.a * 255)}` : base;
}
/** Strict `#rrggbb` (alpha dropped) for the native `<input type="color">`, which accepts nothing else. */
function colorToHex6(css) {
  const rgba = parseColorToRgba(css);
  return rgba ? toHex6(rgba.r, rgba.g, rgba.b) : "#000000";
}
function rgbaToHsva({
  r,
  g,
  b,
  a
}) {
  const rr = r / 255,
    gg = g / 255,
    bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const d = max - Math.min(rr, gg, bb);
  let h = 0;
  if (d) {
    if (max === rr) h = 60 * ((gg - bb) / d % 6);else if (max === gg) h = 60 * ((bb - rr) / d + 2);else h = 60 * ((rr - gg) / d + 4);
  }
  if (h < 0) h += 360;
  return {
    h,
    s: max === 0 ? 0 : d / max * 100,
    v: max * 100,
    a
  };
}
function hsvaToRgba({
  h,
  s,
  v,
  a
}) {
  const ss = s / 100;
  const vv = v / 100;
  const c = vv * ss;
  const hh = (h % 360 + 360) % 360 / 60;
  const x = c * (1 - Math.abs(hh % 2 - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hh < 1) [r, g] = [c, x];else if (hh < 2) [r, g] = [x, c];else if (hh < 3) [g, b] = [c, x];else if (hh < 4) [g, b] = [x, c];else if (hh < 5) [r, b] = [x, c];else [r, b] = [c, x];
  const m = vv - c;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a
  };
}
/** Serialize HSVA to hex — `#RRGGBB`, or `#RRGGBBAA` when translucent. */
function hsvaToHex(hsva) {
  const {
    r,
    g,
    b,
    a
  } = hsvaToRgba(hsva);
  const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return a < 1 ? base + hex2(a * 255) : base;
}
/** Parse any CSS color into HSVA (defaults to opaque black on failure). */
function colorToHsva(css) {
  const rgba = parseColorToRgba(css);
  return rgba ? rgbaToHsva(rgba) : {
    h: 0,
    s: 0,
    v: 0,
    a: 1
  };
}
/** True when two CSS colors resolve to the same RGBA (rounded). */
function sameColor(a, b) {
  const x = parseColorToRgba(a);
  const y = parseColorToRgba(b);
  if (!x || !y) return a === b;
  return x.r === y.r && x.g === y.g && x.b === y.b && Math.round(x.a * 255) === Math.round(y.a * 255);
}
/** `#RRGGBB`-style hue for the SV-square's right edge (full-sat/value of `h`). */
function hueHex(h) {
  return hsvaToHex({
    h,
    s: 100,
    v: 100,
    a: 1
  });
}
/** RGB (0-255) → HSL with h 0-360, s/l 0-100 (all rounded). */
function rgbaToHsl({
  r,
  g,
  b
}) {
  const rr = r / 255,
    gg = g / 255,
    bb = b / 255;
  const max = Math.max(rr, gg, bb),
    min = Math.min(rr, gg, bb),
    d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) {
    if (max === rr) h = 60 * ((gg - bb) / d % 6);else if (max === gg) h = 60 * ((bb - rr) / d + 2);else h = 60 * ((rr - gg) / d + 4);
  }
  if (h < 0) h += 360;
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}
/** HSL (h 0-360, s/l 0-100) → RGB (0-255, rounded). */
function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (h % 360 + 360) % 360 / 60;
  const x = c * (1 - Math.abs(hh % 2 - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hh < 1) [r, g] = [c, x];else if (hh < 2) [r, g] = [x, c];else if (hh < 3) [g, b] = [c, x];else if (hh < 4) [g, b] = [x, c];else if (hh < 5) [r, b] = [x, c];else [r, b] = [c, x];
  const m = l - c / 2;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}
/**
* Parse a hex (#rgb/#rgba/#rrggbb/#rrggbbaa, shorthand expanded) or rgb()/rgba()
* string to components. `a` is exact (alpha byte / 255 for hex). `hasAlpha` is
* true only when the input explicitly carried an alpha channel. Pure — no DOM.
* Returns null for anything else.
*/
function parseColorParts(css) {
  const s = (css || "").trim();
  const hex = s.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    const hadAlpha = h.length === 4 || h.length === 8;
    if (h.length === 3 || h.length === 4) h = h.split("").map(c => c + c).join("");
    if (h.length === 6) h += "ff";
    if (h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16) / 255,
      hasAlpha: hadAlpha
    };
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(/[,\s/]+/).map(x => parseFloat(x)).filter(n => !isNaN(n));
    if (p.length >= 3) return {
      r: p[0],
      g: p[1],
      b: p[2],
      a: p.length >= 4 ? p[3] : 1,
      hasAlpha: p.length >= 4
    };
  }
  return null;
}
/**
* Convert a CONCRETE CSS color (hsl/oklch/named/color-mix; resolve var() first)
* to ColorParts via the shared 1×1 canvas readback — getComputedStyle returns
* oklch() as-is, which the hex/rgb parser can't read. Null for non-colors.
*/
function canvasColorToParts(css) {
  const s = (css || "").trim();
  if (!s) return null;
  const ctx = getNormCtx();
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillStyle = s;
  const first = ctx.fillStyle;
  ctx.fillStyle = "#fff";
  ctx.fillStyle = s;
  if (ctx.fillStyle !== first) return null;
  try {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, aByte] = ctx.getImageData(0, 0, 1, 1).data;
    const a = aByte / 255;
    return {
      r,
      g,
      b,
      a,
      hasAlpha: a < 1
    };
  } catch {
    return null;
  }
}
/**
* Resolve ANY CSS color (hex, rgb/rgba, hsl, named, oklch, color-mix, var()) to
* components, or null if the browser doesn't accept it as a color value (e.g. a
* class name). Hex/rgb are parsed directly (exact alpha); everything else is
* resolved against `cssProperty` via the browser, then parsed.
*/
function colorToParts(css, cssProperty) {
  const direct = parseColorParts(css);
  if (direct) return direct;
  const s = (css || "").trim();
  if (!s) return null;
  if (typeof document === "undefined") return null;
  const kebab = (cssProperty || "background-color").replace(/([A-Z])/g, "-$1").toLowerCase();
  try {
    const temp = document.createElement("div");
    temp.style.setProperty(kebab, s);
    if (temp.style.getPropertyValue(kebab) === "") return null;
    document.body.appendChild(temp);
    const computed = window.getComputedStyle(temp).getPropertyValue(kebab);
    document.body.removeChild(temp);
    return parseColorParts(computed) ?? canvasColorToParts(computed);
  } catch {
    return null;
  }
}
/** 6-digit `#rrggbb` (lowercase, alpha dropped) from rgb components. */
function toHex6(r, g, b) {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}
/** Apply an alpha (0-100%) to a resolved hex or rgb/rgba color → `#rrggbb` (opaque) or `#rrggbbaa`. */
function setAlphaOn(resolved, pct) {
  const s = (resolved || "").trim();
  let r, g, b;
  const hexMatch = s.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6,8})$/i);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length < 6) h = h.split("").map(c => c + c).join("");
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    const m = s.match(/[\d.]+/g);
    if (!m || m.length < 3) return resolved;
    [r, g, b] = m.map(Number);
  }
  const a = clamp$1(pct, 0, 100) / 100;
  if (a >= 1) return toHex6(r, g, b);
  return `${toHex6(r, g, b)}${hex2(a * 255)}`;
}
/** 6-digit uppercase hex of a color's RGB (no `#`, alpha dropped). */
function rgbHex6(color) {
  const c = parseColorToRgba(color);
  return c ? `${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`.toUpperCase() : "000000";
}
/** Alpha of a color as 0-100. */
function alphaPct(color) {
  const c = parseColorToRgba(color);
  return c ? Math.round(c.a * 100) : 100;
}
/** Build a `#rrggbb`/`#rrggbbaa` color from a 6-digit RGB string + an alpha percentage. */
function buildColor(rgbHex, aPct) {
  const clean = rgbHex.replace(/[^0-9a-f]/gi, "").slice(0, 6).padEnd(6, "0");
  const a = clamp$1(aPct, 0, 100) / 100;
  return a >= 1 ? `#${clean}` : `#${clean}${hex2(a * 255)}`;
}

export { alphaPct, buildColor, canvasColorToParts, clamp$1, colorToHex, colorToHex6, colorToHsva, colorToParts, hslToRgb, hsvaToHex, hsvaToRgba, hueHex, parseColorParts, parseColorToRgba, rgbHex6, rgbaToHsl, rgbaToHsva, sameColor, setAlphaOn, toHex6 };
