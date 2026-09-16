/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/translator/toStore.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { registerElement } from "../../../store/ensureV2";
import { paintImageHashHex } from "../utils/imagePaint";
import { figGuidKey } from "../utils/node";
import { getInstanceChildIds, resolveInstanceSubtree } from "./instance";
import { nodeStylesToCss } from "./styles/index";
import { mapImageFillStyles } from "./styles/paint";
import { figmaTextContent } from "./styles/text";
import { convertBooleanOperationNode, convertEllipseNode, convertVectorNode, extractLocalClipPathD, extractMaskClipPathD } from "./vector";
import { nodeId } from "openfig-core";

var INTERNAL_ONLY_CANVAS_SESSION = 20003008;
var STRUCTURAL_TYPES = new Set(["DOCUMENT", "CANVAS", "VARIABLE_SET", "VARIABLE"]);
function isConvertibleNode(node, ctx, virtualSubtree) {
  if (node.phase !== void 0 && node.phase !== "CREATED") return false;
  if (node.type !== void 0 && STRUCTURAL_TYPES.has(node.type)) return false;
  if (ctx.options.skipHidden && node.visible === false) return false;
  if (node.guid?.sessionID === INTERNAL_ONLY_CANVAS_SESSION && !virtualSubtree) return false;
  return true;
}
function isFigmaMaskNode(node) {
  if (node.isMask === true) return true;
  if (node.mask === true) return true;
  return !!node.maskType;
}
function withFigmaNodeId(el, figmaNodeId) {
  return {
    ...el,
    props: {
      ...el.props,
      "data-figma-node-id": figmaNodeId
    }
  };
}
function withFigmaNodeIdIfPending(el, figmaNodeId, ctx) {
  if (!ctx.pendingImagePatches.some(p => p.figmaNodeId === figmaNodeId)) return el;
  return withFigmaNodeId(el, figmaNodeId);
}
function resolveImageMaskStyles(node, nodeId, ctx) {
  const imagePaint = node.fillPaints?.find(p => p.type === "IMAGE" && p.visible !== false);
  if (!imagePaint) return null;
  if (ctx.options.deferImages) {
    const hashHex = paintImageHashHex(imagePaint);
    if (!(hashHex && ctx.options.resolveImageUrl ? ctx.options.resolveImageUrl({
      hashHex,
      fileKey: ctx.parsed.meta.fileKey
    }) ?? null : null)) {
      if (hashHex) ctx.pendingImagePatches.push({
        figmaNodeId: nodeId,
        imageHash: hashHex,
        kind: "mask"
      });
      return null;
    }
  }
  const imageFill = mapImageFillStyles(node, nodeId, ctx);
  if (!imageFill?.backgroundImage) return null;
  return {
    maskImage: imageFill.backgroundImage,
    WebkitMaskImage: imageFill.backgroundImage,
    maskSize: imageFill.backgroundSize ?? "100% 100%",
    WebkitMaskSize: imageFill.backgroundSize ?? "100% 100%",
    maskRepeat: imageFill.backgroundRepeat ?? "no-repeat",
    WebkitMaskRepeat: imageFill.backgroundRepeat ?? "no-repeat",
    maskPosition: imageFill.backgroundPosition ?? "center",
    WebkitMaskPosition: imageFill.backgroundPosition ?? "center"
  };
}
function handleMaskNode(node, nodeId, ctx) {
  if (node.isMask !== true && node.mask !== true) return false;
  ctx.skipped.push({
    code: "MASK_SKIPPED",
    nodeId,
    maskType: node.type ?? "UNKNOWN"
  });
  return true;
}
function styleOptsForCss(styleOpts, extra) {
  const asCanvasRoot = styleOpts?.asCanvasRoot;
  const container = extra?.container;
  if (asCanvasRoot === void 0 && container === void 0) return void 0;
  return {
    ...(container !== void 0 ? {
      container
    } : {}),
    ...(asCanvasRoot !== void 0 ? {
      asCanvasRoot
    } : {})
  };
}
function convertTextNode(node, nodeId, ctx, styleOpts) {
  return {
    id: crypto.randomUUID(),
    type: "text",
    tag: "span",
    text: figmaTextContent(node),
    styles: nodeStylesToCss(node, nodeId, ctx, styleOptsForCss(styleOpts))
  };
}
function convertContainerNode(node, nodeId, ctx, styleOpts) {
  return withFigmaNodeIdIfPending({
    id: crypto.randomUUID(),
    type: "html",
    tag: "div",
    styles: nodeStylesToCss(node, nodeId, ctx, styleOptsForCss(styleOpts, {
      container: true
    }))
  }, nodeId, ctx);
}
function convertImageFillNode(node, nodeId, ctx, styleOpts) {
  const styles = nodeStylesToCss(node, nodeId, ctx, styleOptsForCss(styleOpts, {
    container: true
  }));
  if (node.type === "VECTOR") {
    const clipD = extractLocalClipPathD(node, nodeId, ctx);
    if (clipD) {
      styles.clipPath = `path('${clipD}')`;
      styles.overflow = "hidden";
    }
  } else if (styles.borderRadius || node.fillPaints?.some(p => p.type === "IMAGE" && p.visible !== false)) styles.overflow = "hidden";
  return withFigmaNodeIdIfPending({
    id: crypto.randomUUID(),
    type: "html",
    tag: "div",
    styles
  }, nodeId, ctx);
}
function convertRectangleNode(node, nodeId, ctx, styleOpts) {
  if (node.fillPaints?.some(p => p.type === "IMAGE" && p.visible !== false)) return convertImageFillNode(node, nodeId, ctx, styleOpts);
  return convertContainerNode(node, nodeId, ctx, styleOpts);
}
function convertFigmaChildren(store, parentId, parentNodeId, ctx, instanceSubtree) {
  const createdIds = [];
  const virtualSubtree = instanceSubtree?.nodes;
  const childList = virtualSubtree ? (parentNodeId === instanceSubtree?.symbolRootId ? instanceSubtree.rootChildIds : getInstanceChildIds(virtualSubtree, parentNodeId)).map(id => virtualSubtree.get(id)).filter(Boolean) : ctx.sceneIndex.childrenByParent.get(parentNodeId) ?? [];
  let index = 0;
  while (index < childList.length) {
    const child = childList[index];
    const childId = nodeId(child);
    if (!childId) {
      index++;
      continue;
    }
    if (isFigmaMaskNode(child)) {
      const maskNodes = [];
      while (index < childList.length) {
        const maskChild = childList[index];
        const maskId = nodeId(maskChild);
        if (!maskId || !isFigmaMaskNode(maskChild)) break;
        maskNodes.push({
          node: maskChild,
          id: maskId
        });
        index++;
      }
      const clipParts = [];
      let imageMaskStyles = null;
      let deferredMaskNodeId;
      for (const {
        node,
        id
      } of maskNodes) {
        const d = extractMaskClipPathD(node, id, ctx);
        if (d) clipParts.push(d);
        const maskStyles = resolveImageMaskStyles(node, id, ctx);
        if (maskStyles) imageMaskStyles = maskStyles;else if (ctx.pendingImagePatches.some(p => p.figmaNodeId === id && p.kind === "mask")) deferredMaskNodeId = id;
        ctx.skipped.push({
          code: "MASK_SKIPPED",
          nodeId: id,
          maskType: node.maskType ?? "ALPHA"
        });
      }
      const frameSize = ctx.sceneIndex.nodeById.get(parentNodeId)?.size;
      let wrapper = {
        id: crypto.randomUUID(),
        type: "html",
        tag: "div",
        styles: {
          position: "absolute",
          left: 0,
          top: 0,
          width: frameSize?.x ?? "100%",
          height: frameSize?.y ?? "100%",
          overflow: imageMaskStyles || deferredMaskNodeId || clipParts.length > 0 ? "hidden" : "visible",
          ...(clipParts.length > 0 ? {
            clipPath: `path('${clipParts.join(" ")}')`
          } : {}),
          ...(imageMaskStyles ?? {})
        }
      };
      if (deferredMaskNodeId) wrapper = withFigmaNodeId(wrapper, deferredMaskNodeId);
      registerElement(store, wrapper, parentId);
      createdIds.push(wrapper.id);
      while (index < childList.length && !isFigmaMaskNode(childList[index])) {
        const content = childList[index];
        const contentId = nodeId(content);
        if (contentId) convertFigmaNode(store, wrapper.id, content, contentId, ctx, instanceSubtree ? {
          instanceSubtree
        } : void 0);
        index++;
      }
      continue;
    }
    const id = convertFigmaNode(store, parentId, child, childId, ctx, instanceSubtree ? {
      instanceSubtree
    } : void 0);
    if (id) createdIds.push(id);
    index++;
  }
  return createdIds;
}
function registerVectorInStore(store, parentId, result) {
  registerElement(store, result.svgElement, parentId);
  if (result.shadowFilter) {
    const {
      defs,
      filter,
      feChildren
    } = result.shadowFilter;
    registerElement(store, defs, result.svgElement.id);
    registerElement(store, filter, defs.id);
    for (const fe of feChildren) registerElement(store, fe, filter.id);
  }
  const pathParent = result.flipGroup?.id ?? result.svgElement.id;
  if (result.flipGroup) registerElement(store, result.flipGroup, result.svgElement.id);
  for (const path of result.pathElements) registerElement(store, path, pathParent);
  return result.svgElement.id;
}
function convertFigmaNode(store, parentId, node, nodeId, ctx, opts) {
  const instanceSubtree = opts?.instanceSubtree;
  const virtualSubtree = instanceSubtree?.nodes;
  const styleOpts = opts?.asCanvasRoot ?? false ? {
    asCanvasRoot: true
  } : void 0;
  if (!isConvertibleNode(node, ctx, virtualSubtree)) return null;
  const type = node.type ?? "UNKNOWN";
  if (handleMaskNode(node, nodeId, ctx)) {
    convertFigmaChildren(store, parentId, nodeId, ctx, instanceSubtree);
    return null;
  }
  if (type === "INSTANCE") {
    const symbolData = node.symbolData;
    const symbolId = figGuidKey(symbolData?.symbolID);
    const resolved = resolveInstanceSubtree(node, ctx);
    if (!symbolId || !resolved) {
      ctx.warnings.push({
        code: "MISSING_SYMBOL",
        nodeId,
        symbolId: symbolId ?? "unknown"
      });
      return null;
    }
    const wrapper = convertContainerNode(node, nodeId, ctx, styleOpts);
    registerElement(store, wrapper, parentId);
    let childrenParentId = wrapper.id;
    const {
      cssScale,
      designSize
    } = resolved;
    if (Math.abs(cssScale - 1) > 1e-6 && designSize.x > 0 && designSize.y > 0) {
      const scaleLayer = {
        id: crypto.randomUUID(),
        type: "html",
        tag: "div",
        styles: {
          position: "absolute",
          left: 0,
          top: 0,
          width: designSize.x,
          height: designSize.y,
          transform: `scale(${cssScale})`,
          transformOrigin: "0 0"
        }
      };
      registerElement(store, scaleLayer, wrapper.id);
      childrenParentId = scaleLayer.id;
    }
    const prevPasteInstance = ctx.pasteInstance;
    const prevInstanceSubtree = ctx.instanceSubtree;
    ctx.pasteInstance = node;
    ctx.instanceSubtree = resolved;
    convertFigmaChildren(store, childrenParentId, symbolId, ctx, resolved);
    if (prevPasteInstance) ctx.pasteInstance = prevPasteInstance;else delete ctx.pasteInstance;
    if (prevInstanceSubtree) ctx.instanceSubtree = prevInstanceSubtree;else delete ctx.instanceSubtree;
    return wrapper.id;
  }
  if (type === "VECTOR") {
    if (node.fillPaints?.some(p => p.type === "IMAGE" && p.visible !== false)) {
      const el = convertImageFillNode(node, nodeId, ctx, styleOpts);
      registerElement(store, el, parentId);
      return el.id;
    }
    const result = convertVectorNode(node, nodeId, ctx, styleOpts);
    if (!result) return null;
    return registerVectorInStore(store, parentId, result);
  }
  if (type === "BOOLEAN_OPERATION") {
    const result = convertBooleanOperationNode(node, nodeId, ctx, styleOpts);
    if (!result) return null;
    return registerVectorInStore(store, parentId, result);
  }
  if (type === "TEXT") {
    const el = convertTextNode(node, nodeId, ctx, styleOpts);
    registerElement(store, el, parentId);
    return el.id;
  }
  if (type === "FRAME" || type === "GROUP" || type === "SYMBOL" || type === "COMPONENT" || type === "SECTION") {
    const el = convertContainerNode(node, nodeId, ctx, styleOpts);
    registerElement(store, el, parentId);
    convertFigmaChildren(store, el.id, nodeId, ctx, instanceSubtree);
    return el.id;
  }
  if (type === "RECTANGLE" || type === "ROUNDED_RECTANGLE") {
    const el = convertRectangleNode(node, nodeId, ctx, styleOpts);
    registerElement(store, el, parentId);
    return el.id;
  }
  if (type === "ELLIPSE") {
    const result = convertEllipseNode(node, nodeId, ctx, styleOpts);
    if (!result) return null;
    return registerVectorInStore(store, parentId, result);
  }
  if (type === "LINE") {
    const el = {
      id: crypto.randomUUID(),
      type: "html",
      tag: "div",
      styles: nodeStylesToCss(node, nodeId, ctx, styleOptsForCss(styleOpts, {
        container: true
      }))
    };
    registerElement(store, el, parentId);
    return el.id;
  }
  ctx.warnings.push({
    code: "UNSUPPORTED_NODE_TYPE",
    nodeId,
    figmaType: type
  });
  return null;
}

export { convertFigmaNode };
