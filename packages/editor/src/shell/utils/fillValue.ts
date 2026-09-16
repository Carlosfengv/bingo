/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/fillValue.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/** Split on top-level commas only (ignore commas inside parentheses). */
function splitTopLevel$1(s) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth++;else if (c === ")") depth--;else if (c === "," && depth === 0) {
      out.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(s.slice(start).trim());
  return out.filter(Boolean);
}
/** Parse the leading angle of a linear-gradient (`45deg`, `to right`, …) → degrees. */
function parseAngle(token) {
  const t = token.trim().toLowerCase();
  const deg = t.match(/^(-?[\d.]+)deg$/);
  if (deg) return (parseFloat(deg[1]) % 360 + 360) % 360;
  const dir = {
    "to top": 0,
    "to right": 90,
    "to bottom": 180,
    "to left": 270,
    "to top right": 45,
    "to bottom right": 135,
    "to bottom left": 225,
    "to top left": 315
  };
  return t in dir ? dir[t] : null;
}
/** Split a `color pos%` stop into its color and position (position optional). */
function parseStop(token, index, count) {
  const m = token.match(/\s([\d.]+)%\s*$/);
  if (m) return {
    color: token.slice(0, m.index).trim(),
    pos: parseFloat(m[1])
  };
  return {
    color: token.trim(),
    pos: count > 1 ? index / (count - 1) * 100 : 0
  };
}
/** A leading token that's a gradient configuration (shape/position/`from`), not a stop. */
function isConfigToken(token) {
  return /^(circle|ellipse|closest-|farthest-|from\s|at\s)/i.test(token.trim());
}
/** Parse a CSS background/color value into a {@link Fill}. */
function parseFill(css) {
  const s = (css || "").trim();
  const linear = s.match(/^(?:repeating-)?linear-gradient\((.*)\)$/is);
  if (linear) {
    const parts = splitTopLevel$1(linear[1]);
    let angle = 180;
    if (parts.length && parseAngle(parts[0]) !== null) angle = parseAngle(parts.shift());
    const stops = parts.map((p, i) => parseStop(p, i, parts.length));
    if (stops.length >= 2) return {
      kind: "gradient",
      type: "linear",
      angle,
      stops
    };
  }
  const radial = s.match(/^(?:repeating-)?radial-gradient\((.*)\)$/is);
  if (radial) {
    const parts = splitTopLevel$1(radial[1]);
    if (parts.length && isConfigToken(parts[0])) parts.shift();
    const stops = parts.map((p, i) => parseStop(p, i, parts.length));
    if (stops.length >= 2) return {
      kind: "gradient",
      type: "radial",
      angle: 90,
      stops
    };
  }
  const conic = s.match(/^(?:repeating-)?conic-gradient\((.*)\)$/is);
  if (conic) {
    const parts = splitTopLevel$1(conic[1]);
    let angle = 0;
    if (parts.length && isConfigToken(parts[0])) {
      const m = parts.shift().match(/from\s+(-?[\d.]+)deg/i);
      if (m) angle = (parseFloat(m[1]) % 360 + 360) % 360;
    }
    const stops = parts.map((p, i) => parseStop(p, i, parts.length));
    if (stops.length >= 2) return {
      kind: "gradient",
      type: "angular",
      angle,
      stops
    };
  }
  const img = s.match(/^url\((['"]?)(.*?)\1\)$/is);
  if (img) return {
    kind: "image",
    url: img[2]
  };
  return {
    kind: "solid",
    color: s
  };
}
/** Serialize a {@link Fill} back to a CSS value. */
function serializeFill(fill) {
  if (fill.kind === "solid") return fill.color;
  if (fill.kind === "image") return `url("${fill.url}")`;
  const stops = fill.stops.slice().sort((a, b) => a.pos - b.pos).map(s => `${s.color} ${Math.round(s.pos)}%`).join(", ");
  if (fill.type === "radial") return `radial-gradient(circle, ${stops})`;
  if (fill.type === "angular") return `conic-gradient(from ${Math.round(fill.angle)}deg, ${stops})`;
  return `linear-gradient(${Math.round(fill.angle)}deg, ${stops})`;
}
/** True for `transparent`, `rgba(…, 0)`, or an 8-digit hex ending in `00`. */
function isTransparentColor(c) {
  const s = (c ?? "").toLowerCase().trim();
  return s === "transparent" || /rgba\([^)]*,\s*0(\.0+)?\s*\)/.test(s) || /^#[0-9a-f]{6}00$/.test(s);
}
/** A sensible default gradient seeded from a solid color → white. */
function defaultGradient(seed) {
  return {
    kind: "gradient",
    type: "linear",
    angle: 90,
    stops: [{
      color: seed && parseFill(seed).kind === "solid" && !isTransparentColor(seed) ? seed : "#000000",
      pos: 0
    }, {
      color: "#ffffff",
      pos: 100
    }]
  };
}

export { defaultGradient, isTransparentColor, parseFill, serializeFill, splitTopLevel$1 };
