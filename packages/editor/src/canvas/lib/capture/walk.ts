/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/lib/capture/walk.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getAttrs$2 } from "./attrs";
import { PASSTHROUGH_TAGS, SKIP_TAGS$1, VOID_ELEMENTS$1 } from "./constants";
import { authoredChildrenKind, detectIconName, extractComponentProps, findAncestorCompositeByName, findContainingComponent, findImmediateComposite, findOwningComponent, getComponentName, getFiber, isLiveSafeComponent, pickKnownComponentName, registryNameFromDataSlot, registryNameFromBingoAttr, resolveAsChildOwner, stripPropSynthesizedChildren } from "./fiber";
import { applyStyleHeuristics, extractInlineStyles, getStyles, stripAuthoredLayout, stripCanvasInvalidPosition, stripKeywordSizes } from "./styles";
import { captureSvg } from "./svg";

/**
* DOM walker — converts a DOM subtree into captured nodes.
*
* Branches per element into:
*   - component: when fiber is present and componentName is in knownComponents
*   - svg:       when we hit an <svg> root (inline as outerHTML)
*   - html:      everything else, with computed styles for visual fidelity
*
* Carries a per-walk context so callers don't have to thread every flag
* through each recursion.
*/
function createIdGen() {
  let idCounter = 0;
  return () => `capture-${++idCounter}-${Math.random().toString(36).slice(2, 10)}`;
}
var RESPONSIVE_DISPLAY_CLASS = /(?:^|\s|:)(?:sm|md|lg|xl|2xl|max-sm|max-md|max-lg|max-xl):(?:hidden|block|inline|inline-block|flex|inline-flex|grid|inline-grid|table|table-cell|table-row|contents|flow-root)(?:\s|$)/;
function hasResponsiveDisplayClass(el) {
  const cls = el.getAttribute?.("class");
  return typeof cls === "string" && RESPONSIVE_DISPLAY_CLASS.test(cls);
}
function isInlineFlowSibling(n) {
  if (!n) return false;
  if (n.nodeType === Node.TEXT_NODE) return !!n.textContent && !!n.textContent.trim();
  if (n.nodeType === Node.ELEMENT_NODE) {
    const d = window.getComputedStyle(n).display;
    return d.startsWith("inline") || d === "contents";
  }
  return false;
}
/** Recurse over `parent.childNodes`, producing a flat list of captured nodes. */
function walkChildren(parent, depth, parentCS, parentFlexDir, ctx) {
  const out = [];
  const cn = (parent.shadowRoot ?? parent).childNodes;
  let allText = cn.length > 0;
  let joined = "";
  for (let i = 0; i < cn.length; i++) {
    const c = cn[i];
    if (c.nodeType !== Node.TEXT_NODE) {
      allText = false;
      break;
    }
    joined += c.textContent || "";
  }
  if (allText) {
    const trimmed = joined.trim();
    if (trimmed) {
      const parentFiber = ctx.withFiber ? getFiber(parent) : null;
      const parentComp = parentFiber ? findContainingComponent(parentFiber) : null;
      const node = {
        id: ctx.nextId(),
        type: "text",
        tag: "span",
        text: trimmed
      };
      if (parentFiber) node._fiber = parentFiber;
      if (parentComp) {
        const compName = getComponentName(parentComp);
        if (compName) node._compNameHint = compName;
      }
      out.push(node);
    }
    return out;
  }
  for (let i = 0; i < cn.length; i++) {
    const node = cn[i];
    const captured = walkNode(node, depth, parentCS, parentFlexDir, ctx);
    if (captured) out.push(captured);
  }
  return out;
}
/** Convert a single DOM node into a captured node. */
function walkNode(node, depth, parentCS, parentFlexDir, ctx) {
  if (depth > ctx.maxDepth) return null;
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.textContent || "";
    if (!raw.trim()) {
      if (!isInlineFlowSibling(node.previousSibling) || !isInlineFlowSibling(node.nextSibling)) return null;
      const pf = node.parentElement && ctx.withFiber ? getFiber(node.parentElement) : null;
      const spaceNode = {
        id: ctx.nextId(),
        type: "text",
        tag: "span",
        text: " "
      };
      if (pf) spaceNode._fiber = pf;
      return spaceNode;
    }
    const parentFiber = node.parentElement && ctx.withFiber ? getFiber(node.parentElement) : null;
    const parentComp = parentFiber ? findContainingComponent(parentFiber) : null;
    const result = {
      id: ctx.nextId(),
      type: "text",
      tag: "span",
      text: raw
    };
    if (parentFiber) result._fiber = parentFiber;
    if (parentComp) {
      const compName = getComponentName(parentComp);
      if (compName) result._compNameHint = compName;
    }
    return result;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node;
  const tagUpper = el.tagName.toUpperCase();
  if (SKIP_TAGS$1.has(tagUpper)) return null;
  if (ctx.skipSelector) try {
    if (el.matches(ctx.skipSelector)) return null;
  } catch {}
  if (el.id === "devtools-indicator") return null;
  if (el.closest && el.closest("#devtools-indicator")) return null;
  if (el.hasAttribute?.("data-nextjs-toast")) return null;
  if (el.hasAttribute?.("data-next-badge-root")) return null;
  if (el.hasAttribute?.("data-nextjs-dialog-overlay")) return null;
  if (el.hasAttribute?.("data-nextjs-scroll-focus-boundary")) return null;
  if (tagUpper.startsWith("NEXTJS-")) return null;
  const cs = window.getComputedStyle(el);
  if (cs.visibility === "hidden") return null;
  if (cs.display === "none" && !hasResponsiveDisplayClass(el)) return null;
  if (PASSTHROUGH_TAGS.has(tagUpper)) {
    const children = walkChildren(el, depth, parentCS, parentFlexDir, ctx);
    return children.length === 1 ? children[0] : null;
  }
  const isSvg = typeof SVGElement !== "undefined" && el instanceof SVGElement;
  if (isSvg && tagUpper === "SVG") {
    const wrapperStyles = ctx.withComputedStyles ? getStyles(el, {
      parentCS,
      sheetCache: ctx.sheetCache,
      cs
    }) : void 0;
    let iconName = null;
    if (ctx.withFiber) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.width <= 64 && rect.height > 0 && rect.height <= 64) iconName = detectIconName(el, getFiber(el));
    }
    return captureSvg(el, {
      parentCS,
      makeId: ctx.nextId,
      svgWrapperStyles: wrapperStyles,
      iconName
    });
  }
  if (isSvg) return null;
  const isVoid = VOID_ELEMENTS$1.has(tagUpper);
  const tagLower = el.tagName.toLowerCase();
  const hostFiber = ctx.withFiber ? getFiber(el) : null;
  const owningFiber = hostFiber ? resolveAsChildOwner(findOwningComponent(hostFiber)) : null;
  const owningName = owningFiber ? getComponentName(owningFiber) : null;
  const componentFiber = hostFiber ? resolveAsChildOwner(findContainingComponent(hostFiber)) : null;
  const fiberComponentName = componentFiber ? getComponentName(componentFiber) : null;
  const bingoName = registryNameFromBingoAttr(el.getAttribute("data-bingo-component"), ctx.knownComponents);
  const slotName = registryNameFromDataSlot(el.getAttribute("data-slot"), ctx.knownComponents);
  const componentName = pickKnownComponentName([bingoName, owningName, slotName, fiberComponentName], ctx.knownComponents);
  const emitFiber = (componentName ? findAncestorCompositeByName(hostFiber, componentName) : null) || (componentName && owningName === componentName ? owningFiber : null) || (componentName && fiberComponentName === componentName ? componentFiber : null) || null;
  const immediateComposite = hostFiber ? findImmediateComposite(hostFiber) : null;
  if (immediateComposite) {
    const stack = immediateComposite._debugStack?.stack;
    if (stack && stack.includes("next-devtools")) return null;
  }
  const childFlexDir = flexDirOf(cs);
  const isFirstEncounter = ctx.withFiber && componentName !== null && (emitFiber !== null || slotName !== null) && (emitFiber !== null && !ctx.emittedComponentFibers.has(emitFiber) && !(emitFiber.alternate && ctx.emittedComponentFibers.has(emitFiber.alternate)) || emitFiber === null && slotName !== null && componentName === slotName);
  let shouldEmitAsComponent = false;
  if (isFirstEncounter && componentName) shouldEmitAsComponent = ctx.knownComponents !== null && ctx.knownComponents.has(componentName);
  if (shouldEmitAsComponent && componentName) {
    if (emitFiber) {
      ctx.emittedComponentFibers.add(emitFiber);
      if (emitFiber.alternate) ctx.emittedComponentFibers.add(emitFiber.alternate);
    }
    const props = emitFiber ? extractComponentProps(emitFiber.memoizedProps) : void 0;
    let children;
    if (!isVoid && emitFiber) {
      const authored = authoredChildrenKind(emitFiber.memoizedProps?.children);
      if (authored.kind === "empty") children = void 0;else if (authored.kind === "text") children = authored.texts.map(text => ({
        id: ctx.nextId(),
        type: "text",
        tag: "span",
        text
      }));else children = stripPropSynthesizedChildren(walkChildren(el, depth + 1, cs, childFlexDir, ctx), props);
    } else if (!isVoid) children = stripPropSynthesizedChildren(walkChildren(el, depth + 1, cs, childFlexDir, ctx), props);
    const result = {
      id: ctx.nextId(),
      type: "component",
      componentName,
      props,
      children: children && children.length > 0 ? children : void 0
    };
    if (emitFiber) result._fiber = emitFiber;
    return result;
  }
  let attrs = getAttrs$2(el);
  const annotateName = pickKnownComponentName([bingoName, owningName, slotName], ctx.knownComponents);
  const shouldAnnotate = !!annotateName && (bingoName !== null || owningFiber !== null || slotName !== null && annotateName === slotName);
  if (shouldAnnotate && annotateName) {
    if (!attrs) attrs = {};
    attrs["data-component"] = annotateName;
  }
  const inlineStyles = extractInlineStyles(el);
  const computedStyles = ctx.withComputedStyles ? getStyles(el, {
    parentCS,
    sheetCache: ctx.sheetCache,
    cs
  }) : void 0;
  let styles;
  if (computedStyles || inlineStyles) styles = {
    ...(computedStyles || {}),
    ...(inlineStyles || {})
  };
  const children = isVoid ? void 0 : walkChildren(el, depth + 1, cs, childFlexDir, ctx);
  if (styles && ctx.withStyleHeuristics) applyStyleHeuristics(styles, tagLower, {
    parentFlexDir,
    childNodes: (el.shadowRoot ?? el).childNodes,
    element: el,
    sheetCache: ctx.sheetCache
  });
  if (styles && ctx.withComputedStyles) {
    stripKeywordSizes(el, tagUpper, styles, parentFlexDir, ctx.sheetCache);
    stripAuthoredLayout(el, styles, inlineStyles, ctx.sheetCache);
  }
  if (styles) stripCanvasInvalidPosition(styles, depth === 0);
  const result = {
    id: ctx.nextId(),
    type: "html",
    tag: tagLower,
    props: attrs,
    styles: styles && Object.keys(styles).length > 0 ? styles : void 0,
    children: children && children.length > 0 ? children : void 0
  };
  if (shouldAnnotate && annotateName) {
    const propsFiber = emitFiber || (owningName === annotateName ? owningFiber : null) || findAncestorCompositeByName(hostFiber, annotateName);
    result.capturedComponent = {
      name: annotateName,
      props: propsFiber ? extractComponentProps(propsFiber.memoizedProps) : void 0,
      liveSafe: propsFiber ? isLiveSafeComponent(propsFiber) : false
    };
  }
  if (hostFiber) result._fiber = hostFiber;
  if (componentFiber) {
    const compName = getComponentName(componentFiber);
    if (compName) result._compNameHint = compName;
  }
  return result;
}
/** Helper: flex-direction of an element, or undefined when not flex. */
function flexDirOf(cs) {
  if (cs.display === "flex" || cs.display === "inline-flex") return cs.flexDirection;
}

export { createIdGen, walkChildren, walkNode };
