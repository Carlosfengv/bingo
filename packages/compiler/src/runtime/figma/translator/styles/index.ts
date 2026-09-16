/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/translator/styles/index.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { mapEffectStyles } from "./effect";
import { getParentNode, isAbsoluteStackChild, isAutoLayoutFrame, mapAutoLayoutChildStyles, mapContainerLayoutStyles, mapFirstStackChildTopRadiusStyles, mapTransformStyles } from "./layout";
import { mapFillAndStrokeStyles } from "./paint";
import { applyTextAutoResize, mapTextStyles } from "./text";

function nodeStylesToCss(node, nodeId, ctx, opts) {
  const opacity = node.opacity;
  const parent = getParentNode(node, ctx);
  const inAutoLayoutParent = parent ? isAutoLayoutFrame(parent) : false;
  const absoluteInAutoLayout = isAbsoluteStackChild(node);
  const styles = {
    ...(inAutoLayoutParent && parent && !absoluteInAutoLayout ? mapAutoLayoutChildStyles(node, nodeId, ctx) : mapTransformStyles(node, nodeId, ctx)),
    ...mapEffectStyles(node, nodeId, ctx)
  };
  if (opacity !== void 0 && opacity < 1) styles.opacity = opacity;
  if (opts?.container) {
    Object.assign(styles, mapContainerLayoutStyles(node, nodeId, ctx));
    Object.assign(styles, mapFillAndStrokeStyles(node, nodeId, ctx));
    if (parent) {
      const topRadius = mapFirstStackChildTopRadiusStyles(node, nodeId, ctx);
      if (topRadius.borderRadius && !styles.borderRadius) styles.borderRadius = topRadius.borderRadius;
    }
    if (opts.asCanvasRoot) styles.position = "relative";else if (!absoluteInAutoLayout && inAutoLayoutParent) styles.position = "relative";
  }
  if (opts?.asCanvasRoot) {
    delete styles.left;
    delete styles.top;
    delete styles.right;
    delete styles.bottom;
  }
  if (node.type === "TEXT") {
    Object.assign(styles, mapTextStyles(node, nodeId, ctx));
    applyTextAutoResize(node, styles);
  }
  if (node.type === "LINE") {
    const size = node.size;
    styles.height = 1;
    styles.width = size?.x ?? 1;
  }
  return styles;
}

export { nodeStylesToCss };
