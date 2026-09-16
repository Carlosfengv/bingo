/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/translator/styles/layout.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { figGuidKey } from "../../utils/node";

function mapStackAlign(value) {
  if (!value) return void 0;
  return {
    MIN: "flex-start",
    MAX: "flex-end",
    CENTER: "center",
    SPACE_BETWEEN: "space-between",
    SPACE_EVENLY: "space-evenly",
    BASELINE: "baseline",
    STRETCH: "stretch"
  }[value];
}
function isAutoLayoutFrame(node) {
  const mode = node.stackMode;
  return mode === "HORIZONTAL" || mode === "VERTICAL";
}
/** Auto-layout children with absolute positioning ignore flex flow (background layers, overlays). */
function isAbsoluteStackChild(node) {
  return node.stackPositioning === "ABSOLUTE";
}
function getParentNode(node, ctx) {
  const parentId = figGuidKey(node.parentIndex?.guid);
  if (!parentId) return void 0;
  return ctx.instanceSubtree?.nodes.get(parentId) ?? ctx.sceneIndex.nodeById.get(parentId);
}
function mapStackPadding(node) {
  const left = node.stackHorizontalPadding;
  const top = node.stackVerticalPadding;
  const right = node.stackPaddingRight;
  const bottom = node.stackPaddingBottom;
  if (left === void 0 && top === void 0 && right === void 0 && bottom === void 0) return;
  return `${top ?? 0}px ${right ?? 0}px ${bottom ?? 0}px ${left ?? 0}px`;
}
function mapMatrixEffectStyles(transform) {
  const m00 = transform?.m00 ?? 1;
  const m01 = transform?.m01 ?? 0;
  const m10 = transform?.m10 ?? 0;
  const m11 = transform?.m11 ?? 1;
  const styles = {};
  const isIdentity = Math.abs(m00 - 1) < 1e-6 && Math.abs(m11 - 1) < 1e-6 && Math.abs(m01) < 1e-6 && Math.abs(m10) < 1e-6;
  const isAxisAligned = Math.abs(m01) < 1e-6 && Math.abs(m10) < 1e-6;
  if (!isIdentity && isAxisAligned && m00 < 0 && m11 > 0) {
    styles.transform = "scaleX(-1)";
    styles.transformOrigin = "100% 0%";
  } else if (!isIdentity && isAxisAligned && m11 < 0 && m00 > 0) {
    styles.transform = "scaleY(-1)";
    styles.transformOrigin = "0% 100%";
  } else if (!isIdentity && isAxisAligned && m00 < 0 && m11 < 0) {
    styles.transform = "scale(-1)";
    styles.transformOrigin = "100% 100%";
  } else if (!isIdentity) {
    styles.transform = `matrix(${m00}, ${m10}, ${m01}, ${m11}, 0, 0)`;
    styles.transformOrigin = "0 0";
  }
  return styles;
}
function isStackPrimaryFixed(node) {
  return node.stackPrimarySizing === "FIXED";
}
function isResizeToFitSizing(value) {
  return value === "RESIZE_TO_FIT" || value === "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE" || value === "AUTO";
}
/**
* True hug: omit the CSS size so the frame sizes to content.
* `RESIZE_TO_FIT_WITH_IMPLICIT_SIZE` still carries Figma's measured size — keep it
* unless an override cleared that axis (e.g. longer badge text).
*/
function shouldOmitHugSize(value) {
  return value === "RESIZE_TO_FIT" || value === "AUTO";
}
/** Cross-axis uses content height/width (Figma hug). */
function shouldHugCrossAxis(node) {
  const stackMode = node.stackMode;
  if (stackMode === "HORIZONTAL") return isResizeToFitSizing(node.stackCounterSizing);
  if (stackMode === "VERTICAL") return isResizeToFitSizing(node.stackPrimarySizing);
  return false;
}
function shouldOmitCrossAxisSize(node) {
  const stackMode = node.stackMode;
  if (stackMode === "HORIZONTAL") return shouldOmitHugSize(node.stackCounterSizing);
  if (stackMode === "VERTICAL") return shouldOmitHugSize(node.stackPrimarySizing);
  return false;
}
function parentUsesNonStartCounterAlign(parent) {
  const counterAlign = parent.stackCounterAlignItems;
  return counterAlign !== void 0 && counterAlign !== "MIN" && counterAlign !== "STRETCH";
}
function mapAutoLayoutChildStyles(node, _nodeId, ctx) {
  const parent = getParentNode(node, ctx);
  if (!parent) return {};
  const size = node.size;
  const transform = node.transform;
  const styles = {
    ...mapMatrixEffectStyles(transform)
  };
  const parentStack = parent.stackMode;
  const primaryFixed = isStackPrimaryFixed(node);
  if (size?.x !== void 0) {
    if (node.stackMode === "VERTICAL" && shouldHugCrossAxis(node) && shouldOmitCrossAxisSize(node)) {
      styles.flexShrink = 0;
      if (parentStack === "HORIZONTAL" && !parentUsesNonStartCounterAlign(parent)) styles.alignSelf = "flex-start";
    } else {
      styles.width = size.x;
      if (!node.stackChildPrimaryGrow) {
        if (primaryFixed && parentStack === "HORIZONTAL") styles.flex = `0 0 ${size.x}px`;else styles.flexShrink = 0;
      }
    }
  }
  if (size?.y !== void 0) {
    if (node.stackMode === "HORIZONTAL" && shouldHugCrossAxis(node) && shouldOmitCrossAxisSize(node)) {
      styles.flexShrink = 0;
      if (parentStack === "VERTICAL" && !parentUsesNonStartCounterAlign(parent)) styles.alignSelf = "flex-start";
    } else {
      styles.height = size.y;
      if (!node.stackChildPrimaryGrow && primaryFixed && parentStack === "VERTICAL") styles.flex = `0 0 ${size.y}px`;
    }
  }
  const alignSelf = mapStackAlign(node.stackChildAlignSelf);
  if (alignSelf) {
    const crossAxisFixed = parentStack === "VERTICAL" ? size?.x !== void 0 : parentStack === "HORIZONTAL" ? size?.y !== void 0 : false;
    if (!(alignSelf === "stretch" && crossAxisFixed && !node.stackChildPrimaryGrow)) styles.alignSelf = alignSelf;
  }
  if (node.stackChildPrimaryGrow) {
    const parentPrimaryAlign = parent.stackPrimaryAlignItems;
    if (parentStack === "HORIZONTAL" && parentPrimaryAlign === "CENTER" && size?.x !== void 0) styles.flex = `0 0 ${size.x}px`;else {
      styles.flexGrow = 1;
      styles.flexShrink = 1;
      styles.minWidth = 0;
      styles.minHeight = 0;
    }
  }
  return styles;
}
function mapTransformStyles(node, _nodeId, _ctx) {
  const transform = node.transform;
  const size = node.size;
  const m00 = transform?.m00 ?? 1;
  const m01 = transform?.m01 ?? 0;
  const m10 = transform?.m10 ?? 0;
  const m11 = transform?.m11 ?? 1;
  const isAxisAligned = Math.abs(m01) < 1e-6 && Math.abs(m10) < 1e-6;
  let left = transform?.m02 ?? 0;
  let top = transform?.m12 ?? 0;
  if (isAxisAligned) {
    if (m00 < 0 && size?.x !== void 0) left -= size.x;
    if (m11 < 0 && size?.y !== void 0) top -= size.y;
  }
  const styles = {
    position: "absolute",
    left,
    top,
    ...mapMatrixEffectStyles(transform)
  };
  if (size?.x !== void 0) styles.width = size.x;
  if (size?.y !== void 0) styles.height = size.y;
  return styles;
}
function hasVisiblePaints(paints) {
  return (paints ?? []).some(p => p.visible !== false);
}
/** GROUP nodes are stored as FRAME in clipboard; resizeToFit + no visible paints marks them. */
function isGroupOriginatedFrame(node) {
  if (node.type !== "FRAME") return false;
  if (node.resizeToFit !== true) return false;
  if (hasVisiblePaints(node.fillPaints)) return false;
  if (hasVisiblePaints(node.strokePaints)) return false;
  if (hasVisiblePaints(node.backgroundPaints)) return false;
  return true;
}
/**
* Kiwi clipboard: `frameMaskDisabled: true` turns clip off; false/undefined keeps clip on.
* `clipsContent` wins when set. Group-originated frames (ex-groups) do not clip.
*/
function figmaFrameClipsContent(node) {
  if (node.clipsContent === true) return true;
  if (node.clipsContent === false) return false;
  if (node.frameMaskDisabled === true) return false;
  if (isGroupOriginatedFrame(node)) return false;
  return true;
}
function mapContainerLayoutStyles(node, nodeId, ctx) {
  const styles = {};
  const stackMode = node.stackMode;
  if (stackMode === "HORIZONTAL" || stackMode === "VERTICAL") {
    styles.display = "flex";
    styles.flexDirection = stackMode === "HORIZONTAL" ? "row" : "column";
    const primaryAlignRaw = node.stackPrimaryAlignItems;
    const spacing = node.stackSpacing;
    if (spacing !== void 0 && !(primaryAlignRaw === "SPACE_BETWEEN" || primaryAlignRaw === "SPACE_EVENLY" || primaryAlignRaw === "SPACE_AROUND")) styles.gap = spacing;
    const padding = mapStackPadding(node);
    if (padding) styles.padding = padding;
    let primaryAlign = mapStackAlign(primaryAlignRaw);
    if (stackMode === "VERTICAL" && primaryAlignRaw === "SPACE_EVENLY") primaryAlign = "space-between";
    const counterAlign = mapStackAlign(node.stackCounterAlignItems);
    if (primaryAlign) styles.justifyContent = primaryAlign;
    if (counterAlign) styles.alignItems = counterAlign;else styles.alignItems = "flex-start";
  }
  if (figmaFrameClipsContent(node)) {
    if (!(ctx.sceneIndex.childrenByParent.get(nodeId) ?? []).some(child => child.isMask === true || child.mask === true || !!child.maskType)) styles.overflow = "hidden";
  }
  return styles;
}
function mapCornerRadiusStyles(node, _nodeId, _ctx) {
  const uniform = node.cornerRadius;
  if (uniform !== void 0 && uniform > 0) return {
    borderRadius: `${uniform}px`
  };
  const tl = node.rectangleTopLeftCornerRadius;
  const tr = node.rectangleTopRightCornerRadius;
  const br = node.rectangleBottomRightCornerRadius;
  const bl = node.rectangleBottomLeftCornerRadius;
  if (tl !== void 0 || tr !== void 0 || br !== void 0 || bl !== void 0) return {
    borderRadius: `${tl ?? 0}px ${tr ?? 0}px ${br ?? 0}px ${bl ?? 0}px`
  };
  return {};
}
/** First row in a vertical auto-layout card inherits the parent's top corner radii. */
function mapFirstStackChildTopRadiusStyles(node, _nodeId, ctx) {
  const parent = getParentNode(node, ctx);
  if (!parent) return {};
  if (parent.stackMode !== "VERTICAL") return {};
  const parentFigmaId = figGuidKey(node.parentIndex?.guid);
  if (!parentFigmaId) return {};
  if ((ctx.sceneIndex.childrenByParent.get(parentFigmaId) ?? [])[0] !== node) return {};
  if (Object.keys(mapCornerRadiusStyles(node, "", ctx)).length > 0) return {};
  const uniform = parent.cornerRadius;
  const tl = parent.rectangleTopLeftCornerRadius ?? uniform;
  const tr = parent.rectangleTopRightCornerRadius ?? uniform;
  if (!tl && !tr) return {};
  return {
    borderRadius: `${tl ?? 0}px ${tr ?? 0}px 0 0`
  };
}

export { getParentNode, isAbsoluteStackChild, isAutoLayoutFrame, mapAutoLayoutChildStyles, mapContainerLayoutStyles, mapCornerRadiusStyles, mapFirstStackChildTopRadiusStyles, mapTransformStyles };
