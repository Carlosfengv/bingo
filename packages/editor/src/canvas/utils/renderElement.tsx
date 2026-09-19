/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/renderElement.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { measureVisibleBounds } from "../../shared/utils/visibleElement";
import { measureCanvasWork } from "../lib/canvasPerformance";
import { CapturedPageRenderer } from "../components/CapturedPageRenderer";
import { DraggableElement } from "../components/DraggableElement";
import { ElementErrorBoundary } from "../components/ErrorBoundary";
import { MediaWithFallback } from "../components/MediaWithFallback";
import { TextEditor } from "../components/TextEditor";
import { WebviewRenderer } from "../components/WebviewRenderer";
import { yieldsToCoveredRoot } from "./coveredRoot";
import { countClick } from "./selection";
import { coerceClassName, getById, getChildren$2, getParentId, isPlainObject$2, resolveTextOwner, sanitizeDomRenderProps } from "@bingo/compiler";
import { appI18n } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Wraps a live-rendered captured component with an EMPTY-render safety net.
* After mount, it checks whether the live render produced any visible DOM — a
* data component that lost its runtime data re-renders to nothing (no crash, so
* the error boundary never fires). If nothing visible came out, swap to the
* `frozen` capture. Paired with ElementErrorBoundary (crash case), this means a
* captured component can never blank the canvas: worst case is accurate frozen
* pixels. Only applied to capture upgrades (`frozenFallback`), never authored
* components — an authored component that legitimately renders empty stays empty.
*/
function LiveOrFrozen(t0) {
  const $ = (0, import_compiler_runtime.c)(7);
  const {
    live,
    frozen
  } = t0;
  const hostRef = (0, import_react.useRef)(null);
  const [useFrozen, setUseFrozen] = (0, import_react.useState)(false);
  let t1;
  let t2;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => {
      const node = hostRef.current;
      if (!node) return;
      const r = measureVisibleBounds(node);
      if (!(r.width > 0 && r.height > 0)) setUseFrozen(true);
    };
    t2 = [];
    $[0] = t1;
    $[1] = t2;
  } else {
    t1 = $[0];
    t2 = $[1];
  }
  (0, import_react.useLayoutEffect)(t1, t2);
  if (useFrozen) {
    let t3;
    if ($[2] !== frozen) {
      t3 = <>{frozen}</>;
      $[2] = frozen;
      $[3] = t3;
    } else t3 = $[3];
    return t3;
  }
  let t3;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = {
      display: "contents"
    };
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] !== live) {
    t4 = <div ref={hostRef} style={t3}>{live}</div>;
    $[5] = live;
    $[6] = t4;
  } else t4 = $[6];
  return t4;
}
var crashedElementRenders = new Map();
var lastGoodComponents = new Map();
/** Element ids already reported as unrenderable — one console line each, not one per render. */
var warnedRenderFailures = new Set();
var MAX_CRASHED_ELEMENT_RENDERS = 500;
var MAX_LAST_GOOD_COMPONENTS = 500;
function isRenderableComponent(value) {
  return typeof value === "function" || typeof value === "object" && value !== null && "$$typeof" in value;
}
function rememberCrashedElementRender(elementId, render) {
  if (!crashedElementRenders.has(elementId) && crashedElementRenders.size >= MAX_CRASHED_ELEMENT_RENDERS) {
    const oldestElementId = crashedElementRenders.keys().next().value;
    if (oldestElementId) crashedElementRenders.delete(oldestElementId);
  }
  crashedElementRenders.set(elementId, render);
}
function rememberLastGoodComponent(elementId, name, component) {
  if (!lastGoodComponents.has(elementId) && lastGoodComponents.size >= MAX_LAST_GOOD_COMPONENTS) {
    const oldestElementId = lastGoodComponents.keys().next().value;
    if (oldestElementId) lastGoodComponents.delete(oldestElementId);
  }
  lastGoodComponents.set(elementId, {
    name,
    component
  });
}
function commitLastGoodComponent(elementId, name, component) {
  queueMicrotask(() => {
    if (crashedElementRenders.get(elementId)?.component === component) return;
    rememberLastGoodComponent(elementId, name, component);
  });
}
var DEFAULT_DEV_SERVER_URL = typeof process !== "undefined" && {}.NEXT_PUBLIC_BINGO_DEV_SERVER || "http://localhost:4001";
function resolveAssetSrc(props, assetResolver) {
  if (props.src && assetResolver) props.src = assetResolver(props.src);
}
function looksLikeAssetPath(v) {
  return v.includes(".bingo-assets/") || v.startsWith("/assets/") || v.startsWith("/public/");
}
function resolveCssUrlAssets(value, assetResolver) {
  return value.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, path) => looksLikeAssetPath(path) ? `url(${quote}${assetResolver(path)}${quote})` : match);
}
function resolveStyleAssets(style, assetResolver) {
  if (!style || !assetResolver) return style;
  const s = style;
  const fixBi = typeof s.backgroundImage === "string" && s.backgroundImage.includes("url(");
  const fixBg = typeof s.background === "string" && s.background.includes("url(");
  if (!fixBi && !fixBg) return style;
  const next = {
    ...s
  };
  if (fixBi) next.backgroundImage = resolveCssUrlAssets(s.backgroundImage, assetResolver);
  if (fixBg) next.background = resolveCssUrlAssets(s.background, assetResolver);
  return next;
}
/**
* Determines if an element is interactive (should stop event propagation and handle clicks/hovers).
* Extracted for testability.
*/
function isElementInteractive(selectionMode, _currentParentId, interactiveParentIds) {
  if (selectionMode === "deepest") return true;
  if (_currentParentId === null) return true;
  if (interactiveParentIds && interactiveParentIds.has(_currentParentId)) return true;
  return false;
}
/** Walk up from `leafId` to the nearest ancestor that paints its text with a
*  gradient (background-clip:text), returning that element's styles — or
*  undefined. Walks all ancestors (not just the direct parent) so an imported /
*  captured clip on a grandparent still carries onto the in-place editor. */
function ownerWithTextGradient(store, leafId) {
  let curr = getParentId(store, leafId);
  while (curr && curr !== "ROOT") {
    const styles = getById(store, curr)?.styles;
    if (styles && (styles.backgroundClip === "text" || styles.WebkitBackgroundClip === "text")) return styles;
    curr = getParentId(store, curr);
  }
}
/**
* Render an FEElement subtree from the flat Store.
*
* `idOrElement` is normally an element id — looked up via getById and recursion
* walks getChildren(store, id). The drag overlay path passes a synthesized
* FEElement directly (with visual-sized styles overriding the Store version);
* recursion still walks the Store via the element's id, so children come from
* the canonical state.
*/
var BOX_STYLE_KEYS = ["position", "top", "right", "bottom", "left", "inset", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight", "transform", "transformOrigin", "zIndex"];
/** True for positioning that takes an element out of flow, so its box must live on a real wrapper. */
function isOutOfFlow(position) {
  return position === "absolute" || position === "fixed";
}
/** Offsets that only mean something once an element is positioned. */
var OFFSET_STYLE_KEYS = ["top", "right", "bottom", "left", "inset"];
/**
* A frame root in presentation mode *is* the frame: the preview measures its
* layout box to size and scale the page. Out-of-flow positioning leaves that
* box empty, so the root paints into a 0x0 clip and vanishes (LUN-304). Put it
* back in flow as `relative` — still an anchor for absolute children — and drop
* the offsets so the measured box and the painted box stay identical.
*/
function normalizeFrameRootStyles(styles) {
  if (!isOutOfFlow(styles?.position)) return styles;
  const next = {
    ...styles,
    position: "relative"
  };
  for (const key of OFFSET_STYLE_KEYS) delete next[key];
  return next;
}
/**
* Split styles into the box (position + size, moves to the wrapper) and the
* paint (everything else, stays on the element).
*/
function splitBoxStyles(styles) {
  const box = {};
  const paint = {
    ...styles
  };
  for (const key of BOX_STYLE_KEYS) {
    if (styles?.[key] === void 0) continue;
    box[key] = styles[key];
    delete paint[key];
  }
  return {
    box,
    paint
  };
}
function asStyleObject(value) {
  return isPlainObject$2(value) ? value : void 0;
}
function domTag(tag) {
  return typeof tag === "string" && tag.length > 0 ? tag : "div";
}
function renderElement(idOrElement, store, options = {}) {
  try {
    if (options.renderCache && typeof idOrElement === "string") {
      return options.renderCache.render(idOrElement, options, () => {
        const build = () => measureCanvasWork("renderNode", () => renderElementOrThrow(idOrElement, store, options));
        return options._currentParentId == null ? measureCanvasWork("tree", build) : build();
      });
    }
    return renderElementOrThrow(idOrElement, store, options);
  } catch (error) {
    const id = typeof idOrElement === "string" ? idOrElement : idOrElement?.id;
    if (id && !warnedRenderFailures.has(id)) {
      warnedRenderFailures.add(id);
      console.warn("[renderElement]", id, error);
    }
    return null;
  }
}
function renderElementOrThrow(idOrElement, store, options = {}) {
  let element = typeof idOrElement === "string" ? getById(store, idOrElement) : idOrElement;
  if (!element) return null;
  if (options.isFrameRoot) {
    options = {
      ...options,
      isFrameRoot: false
    };
    const styles = options.responsivePreview ? {
      ...normalizeFrameRootStyles(element.styles),
      width: "100%", minWidth: 0, maxWidth: "none", height: "auto", minHeight: "100vh", maxHeight: "none"
    } : normalizeFrameRootStyles(element.styles);
    if (styles !== element.styles) element = {
      ...element,
      styles
    };
  }
  const isChildIntrospectionTarget = options.isChildIntrospectionTarget === true;
  if (isChildIntrospectionTarget) options = {
    ...options,
    isChildIntrospectionTarget: false
  };
  const {
    isDragPreview = false,
    presentationMode = false,
    selectionMode = "deepest",
    isSVGContext = false,
    devServerUrl = DEFAULT_DEV_SERVER_URL,
    assetResolver
  } = options;
  const {
    interactiveParentIds,
    _currentParentId = null
  } = options;
  const liveSelectionMode = () => options.selectionModeRef?.current ?? selectionMode;
  const wrapInteractive = isElementInteractive("topmost", _currentParentId, interactiveParentIds);
  const takesPointer = () => {
    const mode = liveSelectionMode();
    return isElementInteractive(mode, _currentParentId, options.interactiveParentIdsRef?.current ?? interactiveParentIds) && !(mode !== "deepest" && yieldsToCoveredRoot(options.liveStoreRef?.current ?? store, element.id, options.drilledParentIdRef ? options.drilledParentIdRef.current : options.drilledParentId));
  };
  const isSVGElement = element.type === "html" && element.tag === "svg";
  const childSVGContext = isSVGContext || isSVGElement;
  const isTopLevelSvg = isSVGElement && !isSVGContext;
  const commonProps = {
    "data-element-id": element.id,
    onClick: options.onSelectElement ? e => {
      if (!takesPointer()) return;
      e.stopPropagation();
      const path = [];
      for (let node = e.target; node; node = node.parentElement) {
        const id = node.getAttribute?.("data-element-id");
        if (id) path.push(id);
      }
      options.onSelectElement(resolveTextOwner(options.liveStoreRef?.current ?? store, element.id), e.shiftKey, {
        x: e.clientX,
        y: e.clientY,
        detail: countClick(e.clientX, e.clientY),
        path
      });
    } : void 0,
    onMouseOver: options.onHoverElement ? e => {
      const interactive = takesPointer();
      if (interactive && (element.type !== "text" || liveSelectionMode() === "deepest")) e.stopPropagation();
      if (interactive) options.onHoverElement(resolveTextOwner(options.liveStoreRef?.current ?? store, element.id));
    } : void 0,
    onMouseLeave: options.onHoverElement ? e => {
      const interactive = takesPointer();
      if (interactive && (element.type !== "text" || liveSelectionMode() === "deepest")) e.stopPropagation();
      if (interactive) options.onHoverElement(null);
    } : void 0
  };
  let content = <div>{appI18n.t("editor:shell.defaultContent")}</div>;
  let wrapperBoxStyle;
  const renderSlot = () => {
    return null;
  };
  if (element.type === "html") {
    if (element.props?.["data-component"] === "CapturedPage" && !isDragPreview) return <CapturedPageRenderer key={element.id} element={element} store={store} options={options} />;
    const isVoidElement = ["img", "input", "br", "hr", "area", "base", "col", "embed", "link", "meta", "param", "source", "track", "wbr"].includes(element.tag);
    const isTextarea = element.tag === "textarea";
    const childIds = getChildren$2(store, element.id);
    const hasChildren = childIds.length > 0;
    const needsResetOverride = element.tag === "img" || element.tag === "video";
    const className = typeof element.props?.className === "string" ? element.props.className : "";
    const hasMaxWidthClass = /\bmax-w-/.test(className);
    const hasMaxWidthInline = element.styles?.maxWidth !== void 0;
    let elementStyle = needsResetOverride && !hasMaxWidthClass && !hasMaxWidthInline ? {
      maxWidth: "none",
      ...element.styles
    } : element.styles;
    const wrappedReplaced = (needsResetOverride || isTopLevelSvg) && !isDragPreview && !presentationMode && !(isSVGContext && !isSVGElement) && !options.isAsChildSlotTarget && !isChildIntrospectionTarget;
    if (wrappedReplaced && (element.styles?.width !== void 0 || element.styles?.height !== void 0)) elementStyle = {
      ...elementStyle,
      ...(element.styles?.width !== void 0 ? {
        width: "100%"
      } : null),
      ...(element.styles?.height !== void 0 ? {
        height: "100%"
      } : null)
    };
    if (wrappedReplaced) {
      const {
        box,
        paint
      } = splitBoxStyles(element.styles);
      if (element.styles?.width !== void 0) paint.width = "100%";
      if (element.styles?.height !== void 0) paint.height = "100%";
      if (needsResetOverride && !hasMaxWidthClass && !hasMaxWidthInline) paint.maxWidth = "none";
      wrapperBoxStyle = box;
      elementStyle = paint;
    }
    elementStyle = resolveStyleAssets(elementStyle, assetResolver);
    const isIframe = element.tag === "iframe";
    const iframeInteractionEnabled = presentationMode || element.props?.["data-interaction-enabled"] === "true";
    if (element.tag === "img" || element.tag === "video") {
      const elementProps = sanitizeDomRenderProps(element.props);
      resolveAssetSrc(elementProps, assetResolver);
      const mediaChildren = element.tag === "video" && hasChildren ? childIds.map(childId => renderElement(childId, store, {
        ...options,
        isSVGContext: childSVGContext,
        _currentParentId: element.id
      })) : void 0;
      content = (0, import_react.createElement)(MediaWithFallback, {
        tag: element.tag,
        elementProps,
        style: elementStyle,
        commonProps,
        children: mediaChildren,
        onCommitSource: options.onSetMediaSource ? src => options.onSetMediaSource(element.id, src) : void 0
      });
    } else if (isVoidElement || isTextarea) {
      const elementProps = sanitizeDomRenderProps(element.props);
      if (element.tag === "source") resolveAssetSrc(elementProps, assetResolver);
      content = (0, import_react.createElement)(domTag(element.tag), {
        ...elementProps,
        style: elementStyle,
        ...commonProps,
        draggable: false
      });
    } else if (isIframe) {
      const elementProps = {
        ...sanitizeDomRenderProps(element.props)
      };
      const useProxy = elementProps["data-use-proxy"] === "true" || elementProps["data-use-proxy"] === true;
      const scale = parseFloat(String(elementProps["data-scale"] ?? "")) || 1;
      delete elementProps["data-interaction-enabled"];
      delete elementProps["data-use-proxy"];
      delete elementProps["data-scale"];
      let iframeSrc = elementProps.src;
      if (useProxy && iframeSrc && iframeSrc !== "about:blank") iframeSrc = `${devServerUrl}/proxy?url=${encodeURIComponent(iframeSrc)}`;
      const containerWidth = elementStyle?.width;
      const containerHeight = elementStyle?.height;
      const iframeWidth = scale !== 1 ? `${100 / scale}%` : "100%";
      const iframeHeight = scale !== 1 ? `${100 / scale}%` : "100%";
      const iframeBox = isOutOfFlow(elementStyle?.position) ? splitBoxStyles(elementStyle).box : null;
      content = (0, import_react.createElement)("div", {
        style: {
          position: "relative",
          display: "inline-block",
          width: containerWidth,
          height: containerHeight,
          overflow: "hidden",
          ...iframeBox
        },
        ...commonProps
      }, (0, import_react.createElement)(domTag(element.tag), {
        ...elementProps,
        src: iframeSrc,
        style: {
          ...(iframeBox ? splitBoxStyles(elementStyle).paint : elementStyle),
          width: iframeWidth,
          height: iframeHeight,
          transform: scale !== 1 ? `scale(${scale})` : void 0,
          transformOrigin: "top left",
          border: "none"
        },
        draggable: false
      }), !iframeInteractionEnabled && (0, import_react.createElement)("div", {
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "transparent",
          cursor: "default"
        },
        "data-iframe-overlay": "true"
      }));
    } else {
      const elementProps = sanitizeDomRenderProps(element.props);
      content = (0, import_react.createElement)(domTag(element.tag), {
        ...elementProps,
        style: elementStyle,
        ...commonProps
      }, hasChildren ? childIds.map(childId => renderElement(childId, store, {
        ...options,
        isSVGContext: childSVGContext,
        _currentParentId: element.id
      })) : void 0);
    }
  } else if (element.type === "text") {
    if (options.editingTextId === element.id) {
      const bounds = options.editingTextBounds;
      const gradientStyles = ownerWithTextGradient(store, element.id);
      const inheritedPaint = gradientStyles ? {
        backgroundImage: gradientStyles.backgroundImage,
        backgroundClip: gradientStyles.backgroundClip,
        WebkitBackgroundClip: gradientStyles.WebkitBackgroundClip,
        WebkitTextFillColor: gradientStyles.WebkitTextFillColor,
        color: gradientStyles.color
      } : void 0;
      return (0, import_react.createElement)(TextEditor, {
        key: element.id,
        initialNode: element,
        minHeight: bounds?.height,
        inheritedPaint,
        onCommit: content => {
          options.onEditText?.(element.id, content);
          options.onStopEditText?.();
        },
        onActivate: options.onActivateTextEditor,
        onDeactivate: options.onDeactivateTextEditor,
        onSelectionChange: options.onTextSelectionChange
      });
    }
    const richChildren = element.children;
    const inner = richChildren && richChildren.length > 0 ? richChildren.map(run => {
      if (!(run.styles && Object.keys(run.styles).length > 0) && !run.className) return (0, import_react.createElement)(import_react.Fragment, {
        key: run.id
      }, run.text ?? "");
      return (0, import_react.createElement)("span", {
        key: run.id,
        style: run.styles,
        className: run.className
      }, run.text ?? "");
    }) : element.text ?? "";
    const textHasSize = element.styles?.width != null || element.styles?.height != null;
    const isAutoWidthText = element.canvasPosition != null && !textHasSize;
    const textStyle = {
      ...(textHasSize || isAutoWidthText ? {
        display: "inline-block"
      } : {}),
      ...element.styles,
      whiteSpace: isAutoWidthText ? "pre" : element.styles?.whiteSpace ?? "pre-wrap",
      userSelect: "none"
    };
    content = (0, import_react.createElement)("span", {
      key: element.id,
      style: textStyle,
      ...commonProps,
      "data-text-element": "true",
      onDoubleClick: e => {
        const ownerId = resolveTextOwner(options.liveStoreRef?.current ?? store, element.id);
        if (!((options.selectedElementIdsRef?.current ?? options.selectedElementIds)?.has(ownerId) ?? false)) return;
        e.stopPropagation();
        if (options.onStartEditText) {
          const rect = e.currentTarget.getBoundingClientRect();
          options.onStartEditText(element.id, {
            width: 0,
            height: rect.height
          });
        }
      }
    }, inner);
  } else if (element.type === "capture") {
    const captureChildren = getChildren$2(store, element.id).map(childId => renderElement(childId, store, {
      ...options,
      isSVGContext: childSVGContext,
      _currentParentId: element.id
    }));
    content = (0, import_react.createElement)("div", {
      style: {
        display: "contents"
      },
      ...commonProps
    }, captureChildren);
  } else if (element.type === "component") {
    const componentElement = element;
    const componentRevision = options.renderCache?.componentRevision(element.componentName) ?? options.componentsRevision ?? 0;
    const componentInfo = options.componentIndex?.[element.componentName];
    const hasChildrenProp = componentInfo?.props?.children !== void 0;
    const componentChildIds = getChildren$2(store, element.id);
    const hasChildren = componentChildIds.length > 0;
    let Component = options.components?.[element.componentName];
    let renderSignature;
    try {
      renderSignature = JSON.stringify({
        props: element.props ?? null,
        styles: element.styles ?? null,
        children: componentChildIds,
        inspectsChildren: componentInfo?.inspectsChildren === true,
        revision: componentRevision
      });
    } catch {
      renderSignature = `${componentChildIds.join(",")}:${componentInfo?.inspectsChildren === true}:${componentRevision}`;
    }
    const crashedRender = crashedElementRenders.get(element.id);
    const componentStillCrashed = !!crashedRender && crashedRender.component === Component && crashedRender.signature === renderSignature;
    if (crashedRender && !componentStillCrashed) crashedElementRenders.delete(element.id);
    const lastGood = lastGoodComponents.get(element.id);
    const lastGoodComponent = lastGood?.name === element.componentName && isRenderableComponent(lastGood.component) ? lastGood.component : null;
    if (isRenderableComponent(Component) && !componentStillCrashed) commitLastGoodComponent(element.id, element.componentName, Component);else if (lastGoodComponent) Component = lastGoodComponent;
    if (!isRenderableComponent(Component) || componentStillCrashed && !lastGoodComponent) {
      const fallbackChildren = componentChildIds.map(childId => renderElement(childId, store, {
        ...options,
        isSVGContext: childSVGContext,
        _currentParentId: element.id
      }));
      if (!element.id.startsWith("el-draw-")) element._componentMissing = true;else if (element._componentMissing) delete element._componentMissing;
      content = (0, import_react.createElement)("div", {
        style: {
          ...element.styles
        },
        ...commonProps
      }, fallbackChildren);
    } else {
      if (element._componentMissing) delete element._componentMissing;
      const componentMountKey = `${element.id}:r${componentRevision}`;
      const componentPositioned = isOutOfFlow(element.styles?.position);
      const {
        box,
        paint
      } = splitBoxStyles(element.styles);
      const componentStyle = resolveStyleAssets(componentPositioned ? {
        ...asStyleObject(paint),
        ...(element.styles?.width !== void 0 ? {
          width: "100%"
        } : null),
        ...(element.styles?.height !== void 0 ? {
          height: "100%"
        } : null),
        ...asStyleObject(element.props?.style)
      } : {
        ...asStyleObject(element.styles),
        ...asStyleObject(element.props?.style)
      }, assetResolver);
      const wrapperStyle = componentPositioned ? box : {
        display: "contents"
      };
      const filteredProps = {};
      if (element.props) for (const [key, value] of Object.entries(element.props)) {
        if (key === "children") continue;
        if (key === "className") {
          const className = coerceClassName(value);
          if (className !== void 0) filteredProps.className = className;
          continue;
        }
        if (key === "style") {
          const style = asStyleObject(value);
          if (style) filteredProps.style = style;
          continue;
        }
        if (value !== void 0) filteredProps[key] = assetResolver && typeof value === "string" && looksLikeAssetPath(value) ? assetResolver(value) : value;
      }
      const isAsChildChild = options.isAsChildSlotTarget && element.type === "component";
      const isChildIntrospectionChild = isChildIntrospectionTarget && element.type === "component";
      let parentHasAsChild = filteredProps.asChild === true;
      const parentInspectsChildren = componentInfo?.inspectsChildren === true;
      if (options.isDragPreview && parentHasAsChild) filteredProps.asChild = false;
      if (parentHasAsChild) {
        const onlyChild = componentChildIds.length === 1 ? getById(store, componentChildIds[0]) : void 0;
        if (!(!!onlyChild && (onlyChild.type === "html" || onlyChild.type === "component"))) {
          filteredProps.asChild = false;
          parentHasAsChild = false;
        }
      }
      const renderedChildren = hasChildrenProp && !hasChildren ? renderSlot() : componentChildIds.map(childId => renderElement(childId, store, {
        ...options,
        isSVGContext: childSVGContext,
        isDragPreview,
        isAsChildSlotTarget: parentHasAsChild,
        isChildIntrospectionTarget: parentInspectsChildren,
        _currentParentId: element.id
      }));
      if (isAsChildChild || isChildIntrospectionChild) {
        const asChildProps = {
          ...filteredProps,
          key: componentMountKey,
          style: componentStyle,
          ...commonProps
        };
        return Array.isArray(renderedChildren) && renderedChildren.length === 0 ? (0, import_react.createElement)(Component, asChildProps) : (0, import_react.createElement)(Component, asChildProps, renderedChildren);
      }
      const childrenToPass = parentHasAsChild && renderedChildren && renderedChildren.length === 1 ? renderedChildren[0] : renderedChildren;
      const componentInner = (0, import_react.createElement)(ElementErrorBoundary, {
        key: componentMountKey,
        resetKey: componentMountKey,
        elementId: element.id,
        elementName: element.componentName,
        elementProps: filteredProps,
        silent: element.id.startsWith("el-draw-"),
        onFixWithAI: options.onFixWithAI,
        onCrash: () => rememberCrashedElementRender(element.id, {
          component: Component,
          signature: renderSignature
        })
      }, Array.isArray(childrenToPass) && childrenToPass.length === 0 ? (0, import_react.createElement)(Component, {
        ...filteredProps,
        key: componentMountKey,
        style: componentStyle
      }) : (0, import_react.createElement)(Component, {
        ...filteredProps,
        key: componentMountKey,
        style: componentStyle
      }, childrenToPass));
      content = (0, import_react.createElement)("div", {
        style: wrapperStyle,
        ...commonProps
      }, componentElement.frozenFallback ? (0, import_react.createElement)(LiveOrFrozen, {
        live: componentInner,
        frozen: renderedChildren
      }) : componentInner);
    }
  } else if (element.type === "icon") {
    const IconComponent = options.iconLibraries?.[element.library]?.icons[element.iconName];
    if (!IconComponent || typeof IconComponent !== "function" && !(typeof IconComponent === "object" && IconComponent !== null && "$$typeof" in IconComponent)) content = (0, import_react.createElement)("div", {
      style: {
        ...element.styles,
        width: Number(element.props?.size) || 16,
        height: Number(element.props?.size) || 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px dashed #f59e0b",
        borderRadius: "2px",
        backgroundColor: "#fef3c7",
        color: "#92400e",
        fontSize: "10px"
      },
      title: appI18n.t("editor:shell.iconNotFound", { name: element.iconName, library: element.library }),
      ...commonProps
    }, "?");else {
      const iconProps = {
        ...element.props
      };
      if (typeof iconProps.size === "string") {
        const num = Number(iconProps.size);
        if (!isNaN(num)) iconProps.size = num;
      }
      const hasNumericSize = typeof iconProps.size === "number";
      if (iconProps.size === void 0 && iconProps.width === void 0 && iconProps.height === void 0) {
        iconProps.width = 24;
        iconProps.height = 24;
      }
      if (hasNumericSize) {
        if (iconProps.width === void 0) iconProps.width = iconProps.size;
        if (iconProps.height === void 0) iconProps.height = iconProps.size;
      }
      const iconClassName = iconProps.className;
      if (iconProps.className) delete iconProps.className;
      const iconCssStyles = element.styles || {};
      content = (0, import_react.createElement)("span", {
        style: {
          display: "inline-flex",
          ...iconCssStyles
        },
        ...(iconClassName ? {
          className: iconClassName
        } : {}),
        ...commonProps
      }, (0, import_react.createElement)(IconComponent, iconProps));
    }
  } else if (element.type === "webview") return <WebviewRenderer key={element.id} element={element} options={options} />;
  const isTableElement = element.type === "html" && ["thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col", "caption"].includes(element.tag);
  const needsInlineBlock = element.type === "html" && (["img", "video"].includes(element.tag) || isTopLevelSvg);
  const wrapperDisplay = needsInlineBlock ? "inline-block" : "contents";
  if (options.isAsChildSlotTarget || isChildIntrospectionTarget) return content;
  if (isDragPreview || presentationMode || isSVGContext && !isSVGElement || isTableElement || !wrapInteractive && !needsInlineBlock) return <>{content}</>;
  return <DraggableElement key={element.id} id={element.id} display={wrapperDisplay} width={needsInlineBlock ? element.styles?.width : void 0} height={needsInlineBlock ? element.styles?.height : void 0} boxStyle={wrapperBoxStyle} dragDisabled={!!options.editingTextId} onClick={commonProps.onClick} onMouseOver={commonProps.onMouseOver} onMouseLeave={commonProps.onMouseLeave}>{content}</DraggableElement>;
}
/**
* Strict containment, not intersection. Partial overlap keeps "draw a container
* as an overlay" usable, and is the line LUN-106 drew for the drag-nest path.
*/
function isContainedWithin(child, frame, tolerance = 1) {
  return child.left >= frame.left - tolerance && child.top >= frame.top - tolerance && child.left + child.width <= frame.left + frame.width + tolerance && child.top + child.height <= frame.top + frame.height + tolerance;
}
/**
* Pick the enclosed candidates and measure each from the drawn rect's top-left.
* Margins are subtracted because an absolute offset positions the margin box.
* A zero-area layer (an empty <ol>, say) still has a position and is still
* adopted — pinning it preserves that exactly. Store order in, store order out.
*/
function collectAdoptedChildren(frameRect, candidates, scale) {
  if (scale <= 0) return [];
  const adopted = [];
  for (const c of candidates) {
    if (!isContainedWithin(c.rect, frameRect)) continue;
    adopted.push({
      id: c.id,
      left: Math.round((c.rect.left - frameRect.left) / scale - c.marginLeft),
      top: Math.round((c.rect.top - frameRect.top) / scale - c.marginTop),
      width: Math.round(c.rect.width / scale),
      height: Math.round(c.rect.height / scale)
    });
  }
  return adopted;
}
/** Layers within this many layout px of each other share a row/column. */
var SAME_TRACK_PX = 1;
/**
* A frame keeps store order — its children are absolute, so DOM order is paint
* order. Everything else takes visual order: a row stack reads left to right, a
* column stack and a grid read top to bottom (a grid auto-places row by row).
*/
function orderAdoptedChildren(children, layout) {
  if (layout === "absolute") return [...children];
  const topFirst = layout !== "row";
  const storeOrder = new Map(children.map((c, i) => [c.id, i]));
  return [...children].sort((a, b) => {
    const primary = topFirst ? a.top - b.top : a.left - b.left;
    if (Math.abs(primary) > SAME_TRACK_PX) return primary;
    const cross = topFirst ? a.left - b.left : a.top - b.top;
    if (Math.abs(cross) > SAME_TRACK_PX) return cross;
    return (storeOrder.get(a.id) ?? 0) - (storeOrder.get(b.id) ?? 0);
  });
}
/**
* How many columns a grid drawn over these layers should have: the number that
* shared the topmost row. Keeps a 3-wide arrangement 3-wide instead of
* reflowing it into the tool's default two columns.
*/
function countGridColumns$1(children, fallback = 2) {
  if (children.length === 0) return fallback;
  const rowTolerance = Math.max(SAME_TRACK_PX, Math.min(...children.map(c => c.height)) / 2);
  const firstRowTop = Math.min(...children.map(c => c.top));
  const inFirstRow = children.filter(c => c.top - firstRowTop <= rowTolerance);
  return Math.max(1, inFirstRow.length);
}

export { collectAdoptedChildren, countGridColumns$1, isContainedWithin, orderAdoptedChildren, renderElement };
