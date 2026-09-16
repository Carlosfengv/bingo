/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/parser/vector.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/** Parse editable vector network from VECTOR.vectorData.vectorNetworkBlob. */
function parseVectorNetworkBlob(bytes) {
  if (!bytes || bytes.length < 12) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 0;
  const vertexCount = view.getUint32(pos, true);
  pos += 4;
  const segmentCount = view.getUint32(pos, true);
  pos += 4;
  const regionCount = view.getUint32(pos, true);
  pos += 4;
  if (vertexCount === 0 || segmentCount === 0) return null;
  const vertices = [];
  for (let i = 0; i < vertexCount; i++) {
    if (pos + 12 > bytes.length) return null;
    const styleID = view.getUint32(pos, true);
    pos += 4;
    const x = view.getFloat32(pos, true);
    pos += 4;
    const y = view.getFloat32(pos, true);
    pos += 4;
    vertices.push({
      styleID,
      x,
      y
    });
  }
  const segments = [];
  for (let i = 0; i < segmentCount; i++) {
    if (pos + 28 > bytes.length) return null;
    const styleID = view.getUint32(pos, true);
    pos += 4;
    const start = view.getUint32(pos, true);
    pos += 4;
    const tsx = view.getFloat32(pos, true);
    pos += 4;
    const tsy = view.getFloat32(pos, true);
    pos += 4;
    const end = view.getUint32(pos, true);
    pos += 4;
    const tex = view.getFloat32(pos, true);
    pos += 4;
    const tey = view.getFloat32(pos, true);
    pos += 4;
    if (start >= vertexCount || end >= vertexCount) return null;
    segments.push({
      styleID,
      start,
      end,
      tsx,
      tsy,
      tex,
      tey
    });
  }
  const regions = [];
  for (let r = 0; r < regionCount; r++) {
    if (pos + 8 > bytes.length) break;
    const packed = view.getUint32(pos, true);
    pos += 4;
    const windingRule = (packed & 1) === 0 ? "ODD" : "NONZERO";
    const styleID = packed >>> 1;
    const loopCount = view.getUint32(pos, true);
    pos += 4;
    const loops = [];
    for (let l = 0; l < loopCount; l++) {
      if (pos + 4 > bytes.length) break;
      const segIdxCount = view.getUint32(pos, true);
      pos += 4;
      const loop = [];
      for (let s = 0; s < segIdxCount; s++) {
        if (pos + 4 > bytes.length) break;
        loop.push(view.getUint32(pos, true));
        pos += 4;
      }
      if (loop.length > 0) loops.push(loop);
    }
    if (loops.length > 0) regions.push({
      styleID,
      windingRule,
      loops
    });
  }
  return {
    vertices,
    segments,
    regions
  };
}
/** Scale vector network from normalizedSize space into node size space. */
function scaleVectorNetwork(network, normalizedSize, size) {
  const sx = normalizedSize?.x && size?.x && normalizedSize.x !== 0 ? size.x / normalizedSize.x : 1;
  const sy = normalizedSize?.y && size?.y && normalizedSize.y !== 0 ? size.y / normalizedSize.y : 1;
  if (sx === 1 && sy === 1) return network;
  return {
    vertices: network.vertices.map(v => ({
      ...v,
      x: v.x * sx,
      y: v.y * sy
    })),
    segments: network.segments.map(s => ({
      ...s,
      tsx: s.tsx * sx,
      tsy: s.tsy * sy,
      tex: s.tex * sx,
      tey: s.tey * sy
    })),
    regions: network.regions
  };
}
var KAPPA = .5522847498;
var TANGENT_EPS = .001;
/** Skip fillet on acute corners (e.g. speech-bubble tail tips). */
var MIN_FILLET_ANGLE = Math.PI / 4;
function resolveVertexCornerRadius(styleID, options) {
  const nodeR = options.nodeCornerRadius ?? 0;
  const table = options.styleOverrideTable;
  if (table) {
    const entry = table.find(e => e.styleID === styleID);
    if (entry?.cornerRadius !== void 0) return entry.cornerRadius;
  }
  if (styleID === 0) return nodeR;
  if (nodeR > 0) return nodeR;
  return 0;
}
function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
function sub(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y
  };
}
function add(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y
  };
}
function scale(v, s) {
  return {
    x: v.x * s,
    y: v.y * s
  };
}
function normalize(v) {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-9) return {
    x: 0,
    y: 0
  };
  return {
    x: v.x / len,
    y: v.y / len
  };
}
function fmt(n) {
  return n.toFixed(2);
}
function isStraight(seg) {
  return Math.abs(seg.tsx) < TANGENT_EPS && Math.abs(seg.tsy) < TANGENT_EPS && Math.abs(seg.tex) < TANGENT_EPS && Math.abs(seg.tey) < TANGENT_EPS;
}
function vertexPoint(network, index) {
  const v = network.vertices[index];
  return {
    x: v.x,
    y: v.y
  };
}
function interiorAngle(prev, corner, next) {
  const v1 = normalize(sub(prev, corner));
  const v2 = normalize(sub(next, corner));
  const dot = Math.max(-1, Math.min(1, v1.x * v2.x + v1.y * v2.y));
  return Math.acos(dot);
}
function buildDirectedLoop(loop, network) {
  if (loop.length === 0) return null;
  const edges = [];
  const firstSeg = network.segments[loop[0]];
  if (!firstSeg) return null;
  edges.push({
    from: firstSeg.start,
    to: firstSeg.end,
    seg: firstSeg,
    reversed: false
  });
  for (let i = 1; i < loop.length; i++) {
    const seg = network.segments[loop[i]];
    if (!seg) return null;
    const prevEnd = edges[edges.length - 1].to;
    if (seg.start === prevEnd) edges.push({
      from: seg.start,
      to: seg.end,
      seg,
      reversed: false
    });else if (seg.end === prevEnd) edges.push({
      from: seg.end,
      to: seg.start,
      seg,
      reversed: true
    });else return null;
  }
  if (edges[edges.length - 1].to !== edges[0].from) return null;
  return edges;
}
function segmentCurveTo(edge, network, parts) {
  const seg = edge.seg;
  const v0 = vertexPoint(network, edge.from);
  const v1 = vertexPoint(network, edge.to);
  if (!isStraight(seg)) {
    if (edge.reversed) parts.push(`C ${fmt(v1.x + seg.tex)} ${fmt(v1.y + seg.tey)} ${fmt(v0.x + seg.tsx)} ${fmt(v0.y + seg.tsy)} ${fmt(v0.x)} ${fmt(v0.y)}`);else parts.push(`C ${fmt(v0.x + seg.tsx)} ${fmt(v0.y + seg.tsy)} ${fmt(v1.x + seg.tex)} ${fmt(v1.y + seg.tey)} ${fmt(v1.x)} ${fmt(v1.y)}`);
    return;
  }
  parts.push(`L ${fmt(v1.x)} ${fmt(v1.y)}`);
}
function filletCorner(prev, corner, next, radius) {
  const inDir = normalize(sub(corner, prev));
  const outDir = normalize(sub(next, corner));
  const inLen = dist(prev, corner);
  const outLen = dist(corner, next);
  const r = Math.min(radius, inLen / 2, outLen / 2);
  if (r <= 0) return null;
  const start = add(corner, scale(inDir, -r));
  const end = add(corner, scale(outDir, r));
  return {
    start,
    end,
    c1: add(start, scale(inDir, r * KAPPA)),
    c2: add(end, scale(outDir, -r * KAPPA))
  };
}
/**
* Convert one closed loop of segment indices to an SVG subpath with corner rounding.
*/
function loopToSvgPath(loop, network, options) {
  const edges = buildDirectedLoop(loop, network);
  if (!edges || edges.length === 0) return null;
  const n = edges.length;
  const points = edges.map(e => vertexPoint(network, e.from));
  const vertexIndices = edges.map(e => e.from);
  const plans = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const corner = points[i];
    const next = points[(i + 1) % n];
    const prevEdge = edges[(i - 1 + n) % n];
    const edge = edges[i];
    const requestedR = resolveVertexCornerRadius(network.vertices[vertexIndices[i]]?.styleID ?? 0, options);
    const angle = interiorAngle(prev, corner, next);
    if (!isStraight(edge.seg) || !isStraight(prevEdge.seg)) {
      plans.push({
        entry: corner,
        exit: corner,
        arc: null
      });
      continue;
    }
    const fillet = requestedR > 0 && angle >= MIN_FILLET_ANGLE ? filletCorner(prev, corner, next, requestedR) : null;
    if (fillet) plans.push({
      entry: fillet.start,
      exit: fillet.end,
      arc: {
        c1: fillet.c1,
        c2: fillet.c2,
        end: fillet.end
      }
    });else plans.push({
      entry: corner,
      exit: corner,
      arc: null
    });
  }
  const parts = [];
  parts.push(`M ${fmt(plans[0].entry.x)} ${fmt(plans[0].entry.y)}`);
  for (let i = 0; i < n; i++) {
    const plan = plans[i];
    const edge = edges[i];
    if (!isStraight(edge.seg)) {
      segmentCurveTo(edge, network, parts);
      continue;
    }
    if (plan.arc) parts.push(`C ${fmt(plan.arc.c1.x)} ${fmt(plan.arc.c1.y)} ${fmt(plan.arc.c2.x)} ${fmt(plan.arc.c2.y)} ${fmt(plan.arc.end.x)} ${fmt(plan.arc.end.y)}`);
    const nextEntry = plans[(i + 1) % n].entry;
    if (dist(plan.arc ? plan.arc.end : plan.exit, nextEntry) > .01) parts.push(`L ${fmt(nextEntry.x)} ${fmt(nextEntry.y)}`);
  }
  parts.push("Z");
  return parts.join(" ");
}
function parsedVectorNetworkToPaths(network, options = {}) {
  const results = [];
  if (network.regions.length > 0) {
    for (const region of network.regions) {
      const subpaths = [];
      for (const loop of region.loops) {
        const d = loopToSvgPath(loop, network, options);
        if (d) subpaths.push(d);
      }
      if (subpaths.length > 0) results.push({
        d: subpaths.join(" "),
        windingRule: region.windingRule
      });
    }
    return results;
  }
  if (network.segments.length > 0) {
    const d = loopToSvgPath(network.segments.map((_, i) => i), network, options);
    if (d) results.push({
      d,
      windingRule: "NONZERO"
    });
  }
  return results;
}
function parseAndScaleVectorNetwork(bytes, input) {
  const parsed = parseVectorNetworkBlob(bytes);
  if (!parsed) return null;
  return scaleVectorNetwork(parsed, input?.normalizedSize, input?.size);
}
function vectorNetworkBlobToPaths(bytes, input) {
  const network = parseAndScaleVectorNetwork(bytes, input);
  if (!network) return [];
  return parsedVectorNetworkToPaths(network, {
    nodeCornerRadius: input?.nodeCornerRadius,
    styleOverrideTable: input?.styleOverrideTable
  });
}

export { vectorNetworkBlobToPaths };
