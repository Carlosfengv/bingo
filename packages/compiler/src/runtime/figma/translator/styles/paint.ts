/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/translator/styles/paint.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { rgbaToCss } from "../../utils/color";
import { paintImageHashHex } from "../../utils/imagePaint";
import { mapCornerRadiusStyles } from "./layout";
import { extractRenderableGradientFill, resolveGradientGeometry } from "openfig-core";

function resolveFigmaImagePaint(paint, fileKey, ctx) {
  const hashHex = paintImageHashHex(paint);
  if (!hashHex) return null;
  if (ctx.options.skipImageHashes?.has(hashHex)) return null;
  const hook = ctx.options.resolveImageUrl;
  if (!hook) return null;
  const url = hook({
    hashHex,
    fileKey
  }) ?? null;
  if (!url) return null;
  return {
    hashHex,
    url
  };
}
function isIdentityImageTransform(transform) {
  if (!transform) return true;
  return Math.abs((transform.m00 ?? 1) - 1) < 1e-6 && Math.abs((transform.m11 ?? 1) - 1) < 1e-6 && Math.abs(transform.m01 ?? 0) < 1e-6 && Math.abs(transform.m10 ?? 0) < 1e-6 && Math.abs(transform.m02 ?? 0) < 1e-6 && Math.abs(transform.m12 ?? 0) < 1e-6;
}
/** Map Figma imageTransform (CROP / plugin API) to CSS background sizing. */
function imageTransformToBackgroundStyles(transform) {
  const m00 = transform.m00 ?? 1;
  const m01 = transform.m01 ?? 0;
  const m02 = transform.m02 ?? 0;
  const m10 = transform.m10 ?? 0;
  const m11 = transform.m11 ?? 1;
  const m12 = transform.m12 ?? 0;
  const scaleX = Math.hypot(m00, m10) || 1;
  const scaleY = Math.hypot(m01, m11) || 1;
  const widthPercent = 100 / scaleX;
  const heightPercent = 100 / scaleY;
  const posX = -m02 / scaleX * 100;
  const posY = -m12 / scaleY * 100;
  return {
    backgroundSize: `${widthPercent}% ${heightPercent}%`,
    backgroundPosition: `${posX}% ${posY}%`,
    backgroundRepeat: "no-repeat"
  };
}
/**
* Kiwi clipboard uses STRETCH for cropped image fills. The transform maps
* container→image; the selected region is stretched to fill the layer.
*/
function stretchImageTransformToBackgroundStyles(transform) {
  const m00 = transform.m00 ?? 1;
  const m11 = transform.m11 ?? 1;
  const m02 = transform.m02 ?? 0;
  const m12 = transform.m12 ?? 0;
  const widthPercent = 100 / m00;
  const heightPercent = 100 / m11;
  const posX = widthPercent === 100 ? 0 : m02 * widthPercent * 100 / (widthPercent - 100);
  const posY = heightPercent === 100 ? 0 : m12 * heightPercent * 100 / (heightPercent - 100);
  return {
    backgroundSize: `${widthPercent}% ${heightPercent}%`,
    backgroundPosition: `${posX}% ${posY}%`,
    backgroundRepeat: "no-repeat"
  };
}
function mapImagePaintLayoutStyles(paint) {
  const mode = paint.imageScaleMode ?? "FILL";
  const transform = paint.transform;
  if (mode === "TILE") {
    const factor = paint.scale ?? 1;
    const imgW = paint.originalImageWidth;
    const imgH = paint.originalImageHeight;
    if (imgW && imgH) return {
      backgroundSize: `${imgW * factor}px ${imgH * factor}px`,
      backgroundRepeat: "repeat",
      backgroundPosition: "top left"
    };
    return {
      backgroundSize: "auto",
      backgroundRepeat: "repeat",
      backgroundPosition: "top left"
    };
  }
  if (mode === "FIT") return {
    backgroundSize: "contain",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat"
  };
  if (transform && !isIdentityImageTransform(transform)) {
    if (mode === "STRETCH") return stretchImageTransformToBackgroundStyles(transform);
    return imageTransformToBackgroundStyles(transform);
  }
  if (mode === "STRETCH" || mode === "FILL") return {
    backgroundSize: "100% 100%",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat"
  };
  return {
    backgroundSize: "100% 100%",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat"
  };
}
/** Map Figma image paint opacity and paintFilter to CSS filter/opacity. */
function mapImagePaintAdjustmentStyles(paint) {
  const styles = {};
  if (paint.opacity !== void 0 && paint.opacity < 1) styles.opacity = paint.opacity;
  const pf = paint.paintFilter;
  if (!pf) return styles;
  const filters = [];
  const vibrance = pf.vibrance ?? 0;
  const tint = pf.tint ?? 0;
  if (vibrance < -.2 || tint < -.3) filters.push("grayscale(1)");
  const exposure = pf.exposure ?? 0;
  if (exposure !== 0) filters.push(`brightness(${Math.max(.15, 1 + exposure * .5)})`);
  const contrast = pf.contrast ?? 0;
  if (contrast !== 0) filters.push(`contrast(${1 + contrast})`);
  if (filters.length > 0) styles.filter = filters.join(" ");
  return styles;
}
function mapSingleImagePaintStyles(paint, fileKey, ctx) {
  const resolved = resolveFigmaImagePaint(paint, fileKey, ctx);
  if (!resolved) return null;
  return {
    backgroundImage: `url("${resolved.url}")`,
    ...mapImagePaintLayoutStyles(paint),
    ...mapImagePaintAdjustmentStyles(paint)
  };
}
function mapGradientPaintToCss(paint, width, height) {
  const fill = extractRenderableGradientFill([paint]);
  if (!fill) return null;
  const geom = resolveGradientGeometry(fill, width > 0 ? width : 1, height > 0 ? height : 1);
  if (!geom) return null;
  const stopCss = fill.stops.map(stop => {
    const pos = (stop.position * 100).toFixed(2);
    const color = rgbaToCss(stop.color, fill.opacity);
    return color ? `${color} ${pos}%` : null;
  }).filter(value => Boolean(value)).join(", ");
  if (!stopCss) return null;
  if (geom.type === "linear") {
    const dx = geom.end.x - geom.start.x;
    const dy = geom.end.y - geom.start.y;
    return `linear-gradient(${Math.round(Math.atan2(dx, -dy) * 180 / Math.PI)}deg, ${stopCss})`;
  }
  return `radial-gradient(ellipse ${geom.radiusX * 2}px ${geom.radiusY * 2}px at ${geom.center.x}px ${geom.center.y}px, ${stopCss})`;
}
function resolveSolidPaint(paint, nodeId, ctx) {
  if (!paint || paint.visible === false) return void 0;
  if (paint.type === "IMAGE") return;
  if (paint.type !== "SOLID" && paint.type !== void 0) return;
  const color = paint.color;
  if (color && (color.r !== void 0 || color.g !== void 0 || color.b !== void 0)) return rgbaToCss(color, paint.opacity ?? 1);
  if ("colorVar" in paint && paint.colorVar) ctx.warnings.push({
    code: "ALIAS_ONLY_PAINT",
    nodeId
  });
}
function recordLayeredImagePending(nodeId, imageHash, ctx) {
  if (!imageHash || !ctx.options.deferImages) return;
  if (ctx.pendingImagePatches.some(p => p.figmaNodeId === nodeId && p.kind === "layered")) return;
  ctx.pendingImagePatches.push({
    figmaNodeId: nodeId,
    imageHash,
    kind: "layered"
  });
}
function mapImageFillStyles(node, nodeId, ctx) {
  const imagePaint = node.fillPaints?.find(p => p.type === "IMAGE" && p.visible !== false);
  if (!imagePaint) return null;
  const styles = mapSingleImagePaintStyles(imagePaint, ctx.parsed.meta.fileKey, ctx);
  if (styles) return styles;
  const hashHex = paintImageHashHex(imagePaint);
  if (ctx.options.deferImages && hashHex) {
    ctx.pendingImagePatches.push({
      figmaNodeId: nodeId,
      imageHash: hashHex,
      kind: "fill"
    });
    return {
      ...mapImagePaintLayoutStyles(imagePaint),
      ...mapImagePaintAdjustmentStyles(imagePaint)
    };
  }
  ctx.skipped.push({
    code: "IMAGE_FILL_SKIPPED",
    nodeId,
    ...(hashHex ? {
      imageHash: hashHex
    } : {})
  });
  return null;
}
function mapLayeredFillPaintStyles(paints, nodeId, ctx, width = 0, height = 0) {
  const visible = (paints ?? []).filter(paint => paint.visible !== false);
  if (visible.length === 0) return null;
  if (!(visible.length > 1 || visible.some(paint => paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL"))) return null;
  const layers = [];
  const sizes = [];
  const positions = [];
  const repeats = [];
  let bottomSolid;
  for (const paint of [...visible].reverse()) {
    if (paint.type === "GRADIENT_LINEAR" || paint.type === "GRADIENT_RADIAL") {
      const gradient = mapGradientPaintToCss(paint, width, height);
      if (!gradient) continue;
      layers.push(gradient);
      sizes.push("100% 100%");
      positions.push("center");
      repeats.push("no-repeat");
      continue;
    }
    if (paint.type === "IMAGE") {
      const imageStyles = mapSingleImagePaintStyles(paint, ctx.parsed.meta.fileKey, ctx);
      if (!imageStyles?.backgroundImage) {
        if (ctx.options.deferImages) recordLayeredImagePending(nodeId, paintImageHashHex(paint), ctx);
        continue;
      }
      layers.push(String(imageStyles.backgroundImage));
      sizes.push(String(imageStyles.backgroundSize ?? "100% 100%"));
      positions.push(String(imageStyles.backgroundPosition ?? "center"));
      repeats.push(String(imageStyles.backgroundRepeat ?? "no-repeat"));
      continue;
    }
    if (paint.type === "SOLID") {
      const fill = resolveSolidPaint(paint, nodeId, ctx);
      if (fill) bottomSolid = fill;
    }
  }
  if (layers.length === 0) return bottomSolid ? {
    backgroundColor: bottomSolid
  } : null;
  const styles = {
    backgroundImage: layers.join(", "),
    backgroundSize: sizes.join(", "),
    backgroundPosition: positions.join(", "),
    backgroundRepeat: repeats.join(", ")
  };
  if (bottomSolid) styles.backgroundColor = bottomSolid;
  return styles;
}
function makePatchContext(parsed, imageUrls) {
  return {
    parsed,
    sceneIndex: {
      nodeById: parsed.doc.nodeMap,
      childrenByParent: new Map(),
      pasteRootIds: []
    },
    warnings: [],
    skipped: [],
    pendingImagePatches: [],
    options: {
      skipHidden: true,
      resolveImageUrl: ({
        hashHex
      }) => imageUrls.get(hashHex) ?? null
    }
  };
}
function buildFigmaImageStylePatches(parsed, pending, imageUrls) {
  const ctx = makePatchContext(parsed, imageUrls);
  const patches = [];
  for (const entry of pending) {
    if (!imageUrls.has(entry.imageHash)) continue;
    const node = parsed.doc.nodeMap.get(entry.figmaNodeId);
    if (!node) continue;
    let stylePatch = null;
    if (entry.kind === "mask") {
      const imageFill = mapImageFillStyles(node, entry.figmaNodeId, ctx);
      if (imageFill?.backgroundImage) stylePatch = {
        maskImage: imageFill.backgroundImage,
        WebkitMaskImage: imageFill.backgroundImage,
        maskSize: imageFill.backgroundSize ?? "100% 100%",
        WebkitMaskSize: imageFill.backgroundSize ?? "100% 100%",
        maskRepeat: imageFill.backgroundRepeat ?? "no-repeat",
        WebkitMaskRepeat: imageFill.backgroundRepeat ?? "no-repeat",
        maskPosition: imageFill.backgroundPosition ?? "center",
        WebkitMaskPosition: imageFill.backgroundPosition ?? "center"
      };
    } else if (entry.kind === "layered") {
      const size = node.size;
      stylePatch = mapLayeredFillPaintStyles(node.fillPaints, entry.figmaNodeId, ctx, size?.x ?? 0, size?.y ?? 0);
    } else {
      const fillStyles = mapImageFillStyles(node, entry.figmaNodeId, ctx);
      if (fillStyles?.backgroundImage) stylePatch = {
        ...fillStyles,
        backgroundColor: "transparent"
      };
    }
    if (!stylePatch) continue;
    patches.push({
      figmaNodeId: entry.figmaNodeId,
      stylePatch
    });
  }
  return patches;
}
function sideStrokeWeight(node, side) {
  const independent = node.borderStrokeWeightsIndependent === true;
  const sideWeight = node[`border${side}Weight`];
  if (independent) return typeof sideWeight === "number" && sideWeight > 0 ? sideWeight : 0;
  if (typeof sideWeight === "number" && sideWeight > 0) return sideWeight;
  const strokeWeight = node.strokeWeight;
  return typeof strokeWeight === "number" && strokeWeight > 0 ? strokeWeight : 0;
}
/** Map Figma stroke paints to CSS border / per-side border* styles. */
function mapStrokeBorderStyles(node, strokeColor) {
  const top = sideStrokeWeight(node, "Top");
  const right = sideStrokeWeight(node, "Right");
  const bottom = sideStrokeWeight(node, "Bottom");
  const left = sideStrokeWeight(node, "Left");
  if (top <= 0 && right <= 0 && bottom <= 0 && left <= 0) return {};
  if (top === right && right === bottom && bottom === left) return {
    border: `${top}px solid ${strokeColor}`
  };
  const styles = {};
  if (top > 0) styles.borderTop = `${top}px solid ${strokeColor}`;
  if (right > 0) styles.borderRight = `${right}px solid ${strokeColor}`;
  if (bottom > 0) styles.borderBottom = `${bottom}px solid ${strokeColor}`;
  if (left > 0) styles.borderLeft = `${left}px solid ${strokeColor}`;
  return styles;
}
function mapFillAndStrokeStyles(node, nodeId, ctx) {
  const styles = {};
  const fillPaints = node.fillPaints;
  const size = node.size;
  const layeredFill = mapLayeredFillPaintStyles(fillPaints, nodeId, ctx, size?.x ?? 0, size?.y ?? 0);
  if (layeredFill) Object.assign(styles, layeredFill);else {
    const imageFill = mapImageFillStyles(node, nodeId, ctx);
    if (imageFill) Object.assign(styles, imageFill);
    const solidFill = fillPaints?.find(p => p.type === "SOLID" && p.visible !== false);
    const fill = resolveSolidPaint(solidFill, nodeId, ctx);
    if (fill && !imageFill) styles.backgroundColor = fill;
  }
  const visibleStrokes = (node.strokePaints ?? []).filter(p => p.visible !== false);
  const solidStroke = visibleStrokes.find(p => p.type === "SOLID");
  const gradientStroke = visibleStrokes.find(p => p.type === "GRADIENT_LINEAR");
  const strokeColor = resolveSolidPaint(solidStroke, nodeId, ctx) ?? (gradientStroke ? rgbaToCss(gradientStroke.stops?.[0]?.color, gradientStroke.opacity ?? 1) : void 0);
  if (strokeColor) Object.assign(styles, mapStrokeBorderStyles(node, strokeColor));
  const radius = mapCornerRadiusStyles(node, nodeId, ctx);
  if (radius.borderRadius) styles.borderRadius = radius.borderRadius;
  return styles;
}

export { buildFigmaImageStylePatches, mapFillAndStrokeStyles, mapImageFillStyles, resolveSolidPaint };
