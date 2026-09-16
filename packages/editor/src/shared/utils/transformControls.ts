/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/transformControls.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

function tokenizeTransform(value) {
  if (!value || value === "none") return [];
  const tokens = [];
  const re = /(\w+)\(([^)]*)\)/g;
  let match;
  while (match = re.exec(value)) tokens.push({
    name: match[1],
    args: match[2],
    raw: match[0]
  });
  return tokens;
}
function splitArgs(args) {
  return args.includes(",") ? args.split(",").map(part => part.trim()) : args.trim().split(/\s+/).filter(Boolean);
}
function parseAngleDeg(args) {
  const match = args.trim().match(/^(-?(?:\d+\.?\d*|\.\d+))(deg|rad|grad|turn)?$/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  switch ((match[2] || "deg").toLowerCase()) {
    case "rad":
      return value * 180 / Math.PI;
    case "grad":
      return value * .9;
    case "turn":
      return value * 360;
    default:
      return value;
  }
}
function canonicalFlip(token) {
  const args = splitArgs(token.args).map(part => Number(part));
  if (args.some(n => !Number.isFinite(n))) return null;
  if (token.name === "scaleX" && args.length === 1 && Math.abs(args[0]) === 1) return {
    flipX: args[0] < 0,
    flipY: false
  };
  if (token.name === "scaleY" && args.length === 1 && Math.abs(args[0]) === 1) return {
    flipX: false,
    flipY: args[0] < 0
  };
  if (token.name === "scale" && args.length >= 1 && args.length <= 2) {
    const sx = args[0];
    const sy = args.length === 2 ? args[1] : sx;
    if (Math.abs(sx) === 1 && Math.abs(sy) === 1) return {
      flipX: sx < 0,
      flipY: sy < 0
    };
  }
  return null;
}
function formatNumber$1(value) {
  return String(+value.toFixed(2));
}
function flipToken(flipX, flipY) {
  if (!flipX && !flipY) return null;
  if (flipX && flipY) return {
    name: "scale",
    args: "-1, -1",
    raw: "scale(-1, -1)"
  };
  if (flipX) return {
    name: "scaleX",
    args: "-1",
    raw: "scaleX(-1)"
  };
  return {
    name: "scaleY",
    args: "-1",
    raw: "scaleY(-1)"
  };
}
function stringifyTokens(tokens) {
  return tokens.map(token => token.raw).join(" ");
}
function parseTransformControls(value) {
  const tokens = tokenizeTransform(value);
  let rotate = 0;
  let rotateIndex = null;
  let flipX = false;
  let flipY = false;
  const flipIndices = [];
  tokens.forEach((token, index) => {
    if (rotateIndex === null && (token.name === "rotate" || token.name === "rotateZ")) {
      const angle = parseAngleDeg(token.args);
      if (angle !== null) {
        rotate = angle;
        rotateIndex = index;
      }
    }
    const flip = canonicalFlip(token);
    if (flip) {
      flipIndices.push(index);
      if (flip.flipX) flipX = !flipX;
      if (flip.flipY) flipY = !flipY;
    }
  });
  return {
    tokens,
    rotate,
    rotateIndex,
    flipX,
    flipY,
    flipIndices
  };
}
function withTransformRotation(parsed, degrees) {
  const tokens = parsed.tokens.map(token => ({
    ...token
  }));
  const normalized = Number.isFinite(degrees) ? degrees : 0;
  if (parsed.rotateIndex !== null) {
    if (normalized === 0) tokens.splice(parsed.rotateIndex, 1);else {
      const old = tokens[parsed.rotateIndex];
      tokens[parsed.rotateIndex] = {
        name: old.name,
        args: `${formatNumber$1(normalized)}deg`,
        raw: `${old.name}(${formatNumber$1(normalized)}deg)`
      };
    }
  } else if (normalized !== 0) tokens.push({
    name: "rotate",
    args: `${formatNumber$1(normalized)}deg`,
    raw: `rotate(${formatNumber$1(normalized)}deg)`
  });
  return stringifyTokens(tokens);
}
function affineOf(transform) {
  if (!transform || transform === "none") return [1, 0, 0, 1];
  const m = transform.match(/^matrix\(([^)]+)\)$/);
  if (!m) return [1, 0, 0, 1];
  const p = m[1].split(",").map(s => parseFloat(s.trim()));
  if (p.length < 4 || p.some(n => Number.isNaN(n))) return [1, 0, 0, 1];
  return [p[0], p[1], p[2], p[3]];
}
function topEdgeOfRotatedBox(centerX, centerY, width, height, transform) {
  const [a, b, c, d] = affineOf(transform);
  const hw = width / 2;
  const hh = height / 2;
  const corners = [{
    x: -hw,
    y: -hh
  }, {
    x: hw,
    y: -hh
  }, {
    x: hw,
    y: hh
  }, {
    x: -hw,
    y: hh
  }].map(l => ({
    x: a * l.x + c * l.y + centerX,
    y: b * l.x + d * l.y + centerY
  }));
  const edges = [[corners[0], corners[1]], [corners[1], corners[2]], [corners[2], corners[3]], [corners[3], corners[0]]];
  let best = edges[0];
  let bestMidY = (best[0].y + best[1].y) / 2;
  for (let i = 1; i < edges.length; i++) {
    const midY = (edges[i][0].y + edges[i][1].y) / 2;
    if (midY < bestMidY) {
      best = edges[i];
      bestMidY = midY;
    }
  }
  const anchor = best[0].x <= best[1].x ? best[0] : best[1];
  const other = best[0].x <= best[1].x ? best[1] : best[0];
  return {
    x: anchor.x,
    y: anchor.y,
    angleDeg: Math.atan2(other.y - anchor.y, other.x - anchor.x) * 180 / Math.PI
  };
}
function withTransformFlips(parsed, flipX, flipY) {
  const tokens = parsed.tokens.map(token => ({
    ...token
  }));
  const insertionIndex = parsed.flipIndices.length > 0 ? parsed.flipIndices[0] : parsed.rotateIndex ?? tokens.length;
  for (let i = parsed.flipIndices.length - 1; i >= 0; i--) tokens.splice(parsed.flipIndices[i], 1);
  const nextFlip = flipToken(flipX, flipY);
  if (nextFlip) tokens.splice(insertionIndex, 0, nextFlip);
  return stringifyTokens(tokens);
}

export { parseTransformControls, topEdgeOfRotatedBox, withTransformFlips, withTransformRotation };
