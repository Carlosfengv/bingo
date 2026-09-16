/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/translator/vector.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { vectorNetworkBlobToPaths } from "../parser/vector";
import { rgbaToCss } from "../utils/color";
import { figGuidKey } from "../utils/node";
import { getInstancePathScale } from "./instance";
import { nodeStylesToCss } from "./styles/index";
import { resolveSolidPaint } from "./styles/paint";
import { getBlobBytes, resolveVectorNodePaths, transformSvgPathData } from "openfig-core";

/**
* Figma vector node → Bingo SVG element conversion.
*/
/**
* Apply Figma's linear transform in SVG user space (about local 0,0).
* Axis-aligned flips stay in-box via the usual width/height translation.
* General rotations use the raw matrix with overflow:visible on the outer
* <svg> so rotated geometry is not clipped by the viewBox.
*/
function internalSvgLinearTransform(transform, viewW, viewH) {
  const m00 = transform?.m00 ?? 1;
  const m01 = transform?.m01 ?? 0;
  const m10 = transform?.m10 ?? 0;
  const m11 = transform?.m11 ?? 1;
  if (Math.abs(m00 - 1) < 1e-6 && Math.abs(m11 - 1) < 1e-6 && Math.abs(m01) < 1e-6 && Math.abs(m10) < 1e-6) return void 0;
  if (Math.abs(m01) < 1e-6 && Math.abs(m10) < 1e-6) {
    if (m00 < 0 && m11 > 0) return `matrix(-1 0 0 1 ${viewW} 0)`;
    if (m11 < 0 && m00 > 0) return `matrix(1 0 0 -1 0 ${viewH})`;
    if (m00 < 0 && m11 < 0) return `matrix(-1 0 0 -1 ${viewW} ${viewH})`;
    return;
  }
  return `matrix(${m00} ${m10} ${m01} ${m11} 0 0)`;
}
/** True when the linear part is a non-axis-aligned CSS/SVG matrix rotation. */
function hasCssRotationTransform(transform) {
  const m00 = transform?.m00 ?? 1;
  const m01 = transform?.m01 ?? 0;
  const m10 = transform?.m10 ?? 0;
  const m11 = transform?.m11 ?? 1;
  if (Math.abs(m00 - 1) < 1e-6 && Math.abs(m11 - 1) < 1e-6 && Math.abs(m01) < 1e-6 && Math.abs(m10) < 1e-6) return false;
  return !(Math.abs(m01) < 1e-6 && Math.abs(m10) < 1e-6);
}
function windingRuleToFillRule(rule) {
  return rule === "ODD" || rule === "EVENODD" ? "evenodd" : "nonzero";
}
function mapPathStroke(node, nodeId, ctx) {
  const solidStroke = node.strokePaints?.find(p => p.type === "SOLID" && p.visible !== false);
  const stroke = resolveSolidPaint(solidStroke, nodeId, ctx);
  const strokeWeight = node.strokeWeight;
  const cap = node.strokeCap;
  const join = node.strokeJoin;
  return {
    stroke: stroke ?? "none",
    strokeWidth: strokeWeight ?? 0,
    strokeLinecap: cap === "ROUND" ? "round" : cap === "SQUARE" ? "square" : "butt",
    strokeLinejoin: join === "ROUND" ? "round" : join === "BEVEL" ? "bevel" : "miter"
  };
}
function createSvgDropShadowDefs(node, filterId, layoutW, layoutH) {
  const effects = node.effects?.filter(e => e.visible !== false && e.type === "DROP_SHADOW");
  if (!effects?.length) return null;
  const filter = {
    id: crypto.randomUUID(),
    type: "html",
    tag: "filter",
    props: {
      id: filterId,
      x: -16,
      y: -16,
      width: layoutW + 32,
      height: layoutH + 32,
      filterUnits: "userSpaceOnUse",
      colorInterpolationFilters: "sRGB"
    }
  };
  const feChildren = effects.map(effect => ({
    id: crypto.randomUUID(),
    type: "html",
    tag: "feDropShadow",
    props: {
      dx: effect.offset?.x ?? 0,
      dy: effect.offset?.y ?? 0,
      stdDeviation: effect.radius ?? 0,
      floodColor: rgbaToCss(effect.color, effect.opacity ?? 1) ?? "rgba(0,0,0,0.25)"
    }
  }));
  return {
    defs: {
      id: crypto.randomUUID(),
      type: "html",
      tag: "defs"
    },
    filter,
    feChildren
  };
}
function maxStrokeOverflow(paths) {
  let max = 0;
  for (const p of paths) {
    const w = p.strokeProps.strokeWidth;
    if (typeof w === "number" && w > 0 && p.strokeProps.stroke && p.strokeProps.stroke !== "none") max = Math.max(max, w / 2);
  }
  return max;
}
function appendBooleanPathParts(node, nodeId, ctx, dParts, offsetX = 0, offsetY = 0) {
  const paths = extractVectorPaths(node, nodeId, ctx);
  const transform = node.transform;
  const tx = (transform?.m02 ?? 0) + offsetX;
  const ty = (transform?.m12 ?? 0) + offsetY;
  const fillPaths = paths.filter(p => p.fill && p.fill !== "none");
  const usePaths = fillPaths.length > 0 ? fillPaths : paths;
  for (const path of usePaths) dParts.push(translateSvgPath(path.d, tx, ty));
}
/** UNION operand inside XOR: repeated stamp geometry is unioned with nonzero, not toggled with evenodd. */
function flattenUnionXorOperand(node, nodeId, ctx, offsetX = 0, offsetY = 0) {
  const children = ctx.sceneIndex.childrenByParent.get(nodeId) ?? [];
  const entries = [];
  const fingerprintCounts = new Map();
  for (const child of children) {
    if (child.type !== "VECTOR") continue;
    const childId = figGuidKey(child.guid);
    if (!childId) continue;
    const paths = extractVectorPaths(child, childId, ctx);
    const transform = child.transform;
    const tx = (transform?.m02 ?? 0) + offsetX;
    const ty = (transform?.m12 ?? 0) + offsetY;
    const fillPaths = paths.filter(p => p.fill && p.fill !== "none");
    const usePaths = fillPaths.length > 0 ? fillPaths : paths;
    for (const path of usePaths) {
      const fingerprint = path.d.trim();
      fingerprintCounts.set(fingerprint, (fingerprintCounts.get(fingerprint) ?? 0) + 1);
      entries.push({
        fingerprint,
        translated: translateSvgPath(path.d, tx, ty)
      });
    }
  }
  const operandParts = [];
  const overlayParts = [];
  for (const entry of entries) if ((fingerprintCounts.get(entry.fingerprint) ?? 0) > 1) overlayParts.push(entry.translated);else operandParts.push(entry.translated);
  return {
    operandParts,
    overlayParts
  };
}
function flattenBooleanPaths(node, nodeId, ctx, offsetX = 0, offsetY = 0) {
  const booleanOp = node.booleanOperation ?? "UNION";
  const children = ctx.sceneIndex.childrenByParent.get(nodeId) ?? [];
  if (booleanOp === "UNION") {
    const result = [];
    for (const child of children) {
      const childId = figGuidKey(child.guid);
      if (!childId) continue;
      if (child.type === "VECTOR") {
        const dParts = [];
        appendBooleanPathParts(child, childId, ctx, dParts, offsetX, offsetY);
        if (dParts.length > 0) result.push({
          d: dParts.join(" "),
          fill: void 0,
          fillRule: "nonzero",
          strokeProps: {}
        });
      } else if (child.type === "BOOLEAN_OPERATION") {
        const childTransform = child.transform;
        result.push(...flattenBooleanPaths(child, childId, ctx, offsetX + (childTransform?.m02 ?? 0), offsetY + (childTransform?.m12 ?? 0)));
      }
    }
    return result;
  }
  const dParts = [];
  const xorOverlayParts = booleanOp === "XOR" ? [] : void 0;
  for (const child of children) {
    const childId = figGuidKey(child.guid);
    if (!childId) continue;
    if (child.type === "VECTOR") appendBooleanPathParts(child, childId, ctx, dParts, offsetX, offsetY);else if (child.type === "BOOLEAN_OPERATION") {
      const childTransform = child.transform;
      const childOffsetX = offsetX + (childTransform?.m02 ?? 0);
      const childOffsetY = offsetY + (childTransform?.m12 ?? 0);
      const childOp = child.booleanOperation ?? "UNION";
      if (booleanOp === "XOR" && childOp === "UNION") {
        const {
          operandParts,
          overlayParts
        } = flattenUnionXorOperand(child, childId, ctx, childOffsetX, childOffsetY);
        dParts.push(...operandParts);
        xorOverlayParts?.push(...overlayParts);
      } else for (const nested of flattenBooleanPaths(child, childId, ctx, childOffsetX, childOffsetY)) dParts.push(nested.d);
    }
  }
  if (dParts.length === 0 && !xorOverlayParts?.length) return [];
  const fillRule = booleanOp === "EXCLUDE" || booleanOp === "SUBTRACT" || booleanOp === "XOR" ? "evenodd" : "nonzero";
  const result = [];
  if (dParts.length > 0) result.push({
    d: dParts.join(" "),
    fill: void 0,
    fillRule,
    strokeProps: {}
  });
  if (xorOverlayParts) for (const d of xorOverlayParts) result.push({
    d,
    fill: void 0,
    fillRule: "nonzero",
    strokeProps: {}
  });
  return result;
}
function extractLocalVectorClipPathD(node, nodeId, ctx) {
  const paths = extractVectorPaths(node, nodeId, ctx);
  const fillPaths = paths.filter(p => p.fill && p.fill !== "none");
  const usePaths = fillPaths.length > 0 ? fillPaths : paths;
  if (usePaths.length === 0) return null;
  return usePaths.map(p => p.d).join(" ");
}
/**
* Local-space clip path for a vector node that owns its own CSS box
* (left/top already applied). Do not map through node.transform — that would
* double-apply translation and push oval image fills outside the element.
*/
function extractLocalClipPathD(node, nodeId, ctx) {
  return extractLocalVectorClipPathD(node, nodeId, ctx);
}
function extractMaskClipPathD(node, nodeId, ctx) {
  const local = extractLocalVectorClipPathD(node, nodeId, ctx);
  if (!local) return null;
  return applyFigTransformToSvgPath(local, node.transform);
}
/**
* Apply Figma's affine transform to absolute SVG path commands (M/L/C/Q/Z).
* Used for CSS clip-path masks that live in parent coordinates.
*/
function applyFigTransformToSvgPath(d, transform) {
  const m00 = transform?.m00 ?? 1;
  const m01 = transform?.m01 ?? 0;
  const m02 = transform?.m02 ?? 0;
  const m10 = transform?.m10 ?? 0;
  const m11 = transform?.m11 ?? 1;
  const m12 = transform?.m12 ?? 0;
  if (Math.abs(m00 - 1) < 1e-6 && Math.abs(m11 - 1) < 1e-6 && Math.abs(m01) < 1e-6 && Math.abs(m10) < 1e-6 && Math.abs(m02) < 1e-6 && Math.abs(m12) < 1e-6) return d;
  const map = (x, y) => [m00 * x + m01 * y + m02, m10 * x + m11 * y + m12];
  const fmt = n => {
    return n.toFixed(4).replace(/\.?0+$/, "");
  };
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g);
  if (!tokens) return d;
  const out = [];
  let cmd = "";
  let args = [];
  const flush = () => {
    if (!cmd) return;
    const c = cmd;
    if (c === "Z" || c === "z") out.push("Z");else if (c === "M" || c === "L") for (let i = 0; i + 1 < args.length; i += 2) {
      const [x, y] = map(args[i], args[i + 1]);
      out.push(`${i === 0 ? c : c === "M" ? "L" : c} ${fmt(x)} ${fmt(y)}`);
    } else if (c === "C") for (let i = 0; i + 5 < args.length; i += 6) {
      const [x1, y1] = map(args[i], args[i + 1]);
      const [x2, y2] = map(args[i + 2], args[i + 3]);
      const [x, y] = map(args[i + 4], args[i + 5]);
      out.push(`C ${fmt(x1)} ${fmt(y1)} ${fmt(x2)} ${fmt(y2)} ${fmt(x)} ${fmt(y)}`);
    } else if (c === "Q") for (let i = 0; i + 3 < args.length; i += 4) {
      const [x1, y1] = map(args[i], args[i + 1]);
      const [x, y] = map(args[i + 2], args[i + 3]);
      out.push(`Q ${fmt(x1)} ${fmt(y1)} ${fmt(x)} ${fmt(y)}`);
    } else out.push(c, ...args.map(fmt));
    cmd = "";
    args = [];
  };
  for (const t of tokens) if (/^[MmLlHhVvCcSsQqTtAaZz]$/.test(t)) {
    flush();
    cmd = t;
  } else args.push(parseFloat(t));
  flush();
  return out.join(" ");
}
function resolveFillForStyleID(node, nodeId, ctx, styleID, vectorData) {
  const sid = styleID ?? 0;
  const nodeFillPaints = node.fillPaints;
  const table = vectorData?.styleOverrideTable;
  if (sid !== 0 && table) {
    const override = table.find(e => e.styleID === sid);
    if (override) {
      if (override.fillPaints && override.fillPaints.length === 0) return void 0;
      const overrideFill = resolveSolidPaint(override.fillPaints?.find(p => p.type === "SOLID" && p.visible !== false), nodeId, ctx);
      if (overrideFill) return overrideFill;
    }
  }
  return resolveSolidPaint(nodeFillPaints?.find(p => p.type === "SOLID" && p.visible !== false), nodeId, ctx);
}
function warnMissingGeometryBlobs(node, nodeId, ctx) {
  const entries = [...(node.fillGeometry ?? []), ...(node.strokeGeometry ?? [])];
  for (const entry of entries) {
    if (typeof entry.commandsBlob !== "number") continue;
    if (!getBlobBytes(ctx.parsed.doc, entry.commandsBlob)) ctx.warnings.push({
      code: "MISSING_BLOB",
      nodeId,
      blobIndex: entry.commandsBlob
    });
  }
}
function vectorNetworkToPaths(node, nodeId, ctx) {
  const vectorData = node.vectorData;
  if (vectorData?.vectorNetworkBlob === void 0) return [];
  const bytes = getBlobBytes(ctx.parsed.doc, vectorData.vectorNetworkBlob);
  if (!bytes) {
    ctx.warnings.push({
      code: "MISSING_BLOB",
      nodeId,
      blobIndex: vectorData.vectorNetworkBlob
    });
    return [];
  }
  const size = node.size;
  const loopPaths = vectorNetworkBlobToPaths(bytes, {
    normalizedSize: vectorData.normalizedSize,
    size,
    nodeCornerRadius: node.cornerRadius,
    styleOverrideTable: vectorData.styleOverrideTable
  });
  const defaultFill = resolveFillForStyleID(node, nodeId, ctx, 0, vectorData);
  return loopPaths.map(lp => ({
    d: lp.d,
    fill: defaultFill ?? "none",
    fillRule: windingRuleToFillRule(lp.windingRule),
    strokeProps: mapPathStroke(node, nodeId, ctx)
  }));
}
function translateSvgPath(d, tx, ty) {
  if (tx === 0 && ty === 0) return d;
  return transformSvgPathData(d, {
    translateX: tx,
    translateY: ty
  });
}
function scaleGeometryPath(d, mark) {
  if (!mark) return d;
  if (Math.abs(mark.x - 1) < 1e-6 && Math.abs(mark.y - 1) < 1e-6) return d;
  return transformSvgPathData(d, {
    scaleX: mark.x,
    scaleY: mark.y
  });
}
function extractVectorPaths(node, nodeId, ctx) {
  const vectorData = node.vectorData;
  warnMissingGeometryBlobs(node, nodeId, ctx);
  const resolved = resolveVectorNodePaths(ctx.parsed.doc, node);
  const pathScale = getInstancePathScale(node);
  const paths = [];
  for (const geom of resolved.fill) paths.push({
    d: scaleGeometryPath(geom.svgPath, pathScale),
    fill: resolveFillForStyleID(node, nodeId, ctx, geom.styleID, vectorData) ?? "currentColor",
    fillRule: windingRuleToFillRule(geom.windingRule),
    strokeProps: {}
  });
  for (const geom of resolved.stroke) paths.push({
    d: scaleGeometryPath(geom.svgPath, pathScale),
    fill: "none",
    fillRule: windingRuleToFillRule(geom.windingRule),
    strokeProps: mapPathStroke(node, nodeId, ctx)
  });
  if (paths.length === 0) paths.push(...vectorNetworkToPaths(node, nodeId, ctx));
  return paths;
}
function linearTransformBounds(width, height, m00, m01, m10, m11) {
  const corners = [[0, 0], [width, 0], [width, height], [0, height]];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of corners) {
    const px = m00 * x + m01 * y;
    const py = m10 * x + m11 * y;
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  }
  return {
    minX,
    minY,
    maxX,
    maxY
  };
}
function buildSvgFromPaths(node, nodeId, ctx, paths, styleOpts) {
  if (paths.length === 0) return null;
  const size = node.size;
  const width = size?.x ?? 0;
  const height = size?.y ?? 0;
  const viewW = width;
  const viewH = height;
  const strokeOverflow = maxStrokeOverflow(paths);
  const rotated = hasCssRotationTransform(node.transform);
  const strokePad = rotated ? 0 : strokeOverflow;
  const m00 = node.transform?.m00 ?? 1;
  const m01 = node.transform?.m01 ?? 0;
  const m10 = node.transform?.m10 ?? 0;
  const m11 = node.transform?.m11 ?? 1;
  let vbX = -strokePad;
  let vbY = -strokePad;
  let vbW = viewW + strokePad * 2;
  let vbH = viewH + strokePad * 2;
  if (rotated) {
    const b = linearTransformBounds(viewW, viewH, m00, m01, m10, m11);
    vbX = b.minX;
    vbY = b.minY;
    vbW = Math.max(b.maxX - b.minX, .001);
    vbH = Math.max(b.maxY - b.minY, .001);
  }
  const layoutW = vbW;
  const layoutH = vbH;
  const svgId = crypto.randomUUID();
  const svgStyles = nodeStylesToCss(node, nodeId, ctx, {
    asCanvasRoot: styleOpts?.asCanvasRoot
  });
  if (strokeOverflow > 0) svgStyles.overflow = "visible";
  const filterId = `figma-shadow-${svgId}`;
  const shadowDefs = createSvgDropShadowDefs(node, filterId, layoutW, layoutH);
  if (shadowDefs) {
    delete svgStyles.boxShadow;
    delete svgStyles.filter;
  }
  const flipTransform = internalSvgLinearTransform(node.transform, viewW, viewH);
  if (flipTransform) {
    delete svgStyles.transform;
    delete svgStyles.transformOrigin;
  }
  const svgElement = {
    id: svgId,
    type: "html",
    tag: "svg",
    props: {
      width: layoutW,
      height: layoutH,
      viewBox: `${vbX} ${vbY} ${vbW} ${vbH}`,
      xmlns: "http://www.w3.org/2000/svg"
    },
    styles: svgStyles
  };
  svgStyles.width = layoutW;
  svgStyles.height = layoutH;
  if (svgStyles.position === "absolute") {
    if (rotated) {
      if (typeof svgStyles.left === "number") svgStyles.left += vbX;
      if (typeof svgStyles.top === "number") svgStyles.top += vbY;
    } else if (strokePad > 0) {
      if (typeof svgStyles.left === "number") svgStyles.left -= strokePad;
      if (typeof svgStyles.top === "number") svgStyles.top -= strokePad;
    }
  }
  return {
    svgElement,
    pathElements: paths.map(p => ({
      id: crypto.randomUUID(),
      type: "html",
      tag: "path",
      props: {
        d: p.d,
        fill: p.fill,
        fillRule: p.fillRule,
        ...(shadowDefs ? {
          filter: `url(#${filterId})`
        } : {}),
        ...p.strokeProps
      }
    })),
    flipGroup: flipTransform ? {
      id: crypto.randomUUID(),
      type: "html",
      tag: "g",
      props: {
        transform: flipTransform
      }
    } : void 0,
    shadowFilter: shadowDefs ?? void 0
  };
}
function convertVectorNode(node, nodeId, ctx, styleOpts) {
  return buildSvgFromPaths(node, nodeId, ctx, extractVectorPaths(node, nodeId, ctx), styleOpts);
}
/**
* Figma ellipse angles: 0 at +x, increasing clockwise (screen y-down).
* `innerRadius` is 0..1 relative to the outer radii.
*/
function figmaEllipseArcPathD(width, height, startingAngle, endingAngle, innerRadius) {
  const cx = width / 2;
  const cy = height / 2;
  const rx = Math.max(width / 2, 0);
  const ry = Math.max(height / 2, 0);
  if (rx === 0 || ry === 0) return "";
  let sweep = endingAngle - startingAngle;
  while (sweep <= 0) sweep += Math.PI * 2;
  while (sweep > Math.PI * 2) sweep -= Math.PI * 2;
  const fullCircle = Math.abs(sweep - Math.PI * 2) < 1e-4;
  const at = (angle, scale) => ({
    x: cx + rx * scale * Math.cos(angle),
    y: cy + ry * scale * Math.sin(angle)
  });
  const clampInner = Math.min(Math.max(innerRadius, 0), 1);
  if (clampInner <= 1e-6) {
    if (fullCircle) {
      const p0 = at(0, 1);
      const p1 = at(Math.PI, 1);
      return `M ${p0.x} ${p0.y} A ${rx} ${ry} 0 1 1 ${p1.x} ${p1.y} A ${rx} ${ry} 0 1 1 ${p0.x} ${p0.y} Z`;
    }
    const start = at(startingAngle, 1);
    const end = at(endingAngle, 1);
    const large = sweep > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${rx} ${ry} 0 ${large} 1 ${end.x} ${end.y} Z`;
  }
  const irx = rx * clampInner;
  const iry = ry * clampInner;
  if (fullCircle) {
    const o0 = at(0, 1);
    const o1 = at(Math.PI, 1);
    const i0 = at(0, clampInner);
    const i1 = at(Math.PI, clampInner);
    return [`M ${o0.x} ${o0.y}`, `A ${rx} ${ry} 0 1 1 ${o1.x} ${o1.y}`, `A ${rx} ${ry} 0 1 1 ${o0.x} ${o0.y}`, `M ${i0.x} ${i0.y}`, `A ${irx} ${iry} 0 1 0 ${i1.x} ${i1.y}`, `A ${irx} ${iry} 0 1 0 ${i0.x} ${i0.y}`, `Z`].join(" ");
  }
  const os = at(startingAngle, 1);
  const oe = at(endingAngle, 1);
  const ie = at(endingAngle, clampInner);
  const is = at(startingAngle, clampInner);
  const large = sweep > Math.PI ? 1 : 0;
  return [`M ${os.x} ${os.y}`, `A ${rx} ${ry} 0 ${large} 1 ${oe.x} ${oe.y}`, `L ${ie.x} ${ie.y}`, `A ${irx} ${iry} 0 ${large} 0 ${is.x} ${is.y}`, `Z`].join(" ");
}
function convertEllipseNode(node, nodeId, ctx, styleOpts) {
  const size = node.size;
  const width = size?.x ?? 0;
  const height = size?.y ?? 0;
  if (width <= 0 || height <= 0) return null;
  const arc = node.arcData;
  const startingAngle = arc?.startingAngle ?? 0;
  const endingAngle = arc?.endingAngle ?? Math.PI * 2;
  const innerRadius = arc?.innerRadius ?? 0;
  const d = figmaEllipseArcPathD(width, height, startingAngle, endingAngle, innerRadius);
  if (!d) return null;
  const solidFill = node.fillPaints?.find(p => p.type === "SOLID" && p.visible !== false);
  return buildSvgFromPaths(node, nodeId, ctx, [{
    d,
    fill: resolveSolidPaint(solidFill, nodeId, ctx) ?? "none",
    fillRule: innerRadius > 1e-6 ? "evenodd" : "nonzero",
    strokeProps: mapPathStroke(node, nodeId, ctx)
  }], styleOpts);
}
function convertBooleanOperationNode(node, nodeId, ctx, styleOpts) {
  const flatPaths = flattenBooleanPaths(node, nodeId, ctx);
  if (flatPaths.length === 0) return null;
  const fillPaints = node.fillPaints;
  const parentFill = resolveSolidPaint(fillPaints?.find(p => p.type === "SOLID" && p.visible !== false), nodeId, ctx);
  return buildSvgFromPaths(node, nodeId, ctx, flatPaths.map(p => ({
    ...p,
    fill: parentFill ?? "currentColor"
  })), styleOpts);
}

export { convertBooleanOperationNode, convertEllipseNode, convertVectorNode, extractLocalClipPathD, extractMaskClipPathD };
