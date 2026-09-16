/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/compositionDrag.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ElementErrorBoundary } from "../../../canvas/components/ErrorBoundary";
import { renderElement } from "../../../canvas/utils/renderElement";
import { useAssetResolver } from "../../../shared/contexts/AssetContext";
import { buildParseContextFromImports, getRootIds, normalizeIconLibrarySpecifier, parseCompositionJsx, parseCompositionJsxToNestedRoots } from "@bingo/compiler";
import { ImageIcon } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var EMPTY_IMPORTS = {
  iconNames: new Set(),
  aliasesBySpecifier: new Map()
};
var UPPERCASE_JSX_TAG_RE = /<\s*([A-Z][A-Za-z0-9_$]*)\b/g;
function uppercaseJsxTagNames(jsx) {
  return [...jsx.matchAll(UPPERCASE_JSX_TAG_RE)].map(match => match[1]);
}
/** Babel-parse a sidecar's imports. Memoize on the source string — this is the
*  only expensive step, and everything downstream is object spreads. */
function parseCompositionImports(compositionSource) {
  if (!compositionSource) return EMPTY_IMPORTS;
  let importContext;
  try {
    importContext = buildParseContextFromImports(compositionSource);
  } catch {
    return EMPTY_IMPORTS;
  }
  const iconNames = new Set();
  const aliasesBySpecifier = new Map();
  for (const [specifier, config] of Object.entries(importContext.iconLibraries)) {
    for (const localName of Object.keys(config.icons ?? {})) iconNames.add(localName);
    if (config.iconAliases && Object.keys(config.iconAliases).length > 0) aliasesBySpecifier.set(specifier, config.iconAliases);
  }
  return {
    iconNames,
    aliasesBySpecifier
  };
}
/**
* Build the registries used to parse one composition sidecar.
*
* Two things go wrong when the editor's raw registries are used as-is, and both
* bite shadcn projects specifically:
*
* 1. parseJSX gives local components precedence over icons, so a project that
*    exports `components/ui/calendar.tsx` renders a full month grid wherever the
*    composition meant lucide's `<Calendar />`. shadcn collides on Calendar,
*    Command, Table, Sidebar and Badge. The file's own imports say which name
*    means the icon, so drop those names from the component index.
* 2. shadcn writes `import { Calendar as CalendarIcon }`. The icon registry is
*    keyed by the library's real exports, so the tag `CalendarIcon` matches
*    nothing and lands as an unresolved component that renders as nothing.
*    Alias the local name onto the real icon, and record it in `iconAliases` so
*    parseJSX still persists the canonical export name.
*/
function getCompositionParseContext(imports, iconLibraries, componentIndex, allIconLibraries) {
  const merged = {
    ...allIconLibraries,
    ...iconLibraries
  };
  if (imports.iconNames.size === 0) return {
    iconLibraries: merged,
    componentIndex
  };
  const nextIconLibraries = {
    ...merged
  };
  for (const [specifier, aliases] of imports.aliasesBySpecifier) {
    const installedName = Object.keys(nextIconLibraries).find(libraryName => normalizeIconLibrarySpecifier(libraryName) === specifier);
    if (!installedName) continue;
    const installed = nextIconLibraries[installedName];
    const aliasedIcons = {};
    const iconAliases = {};
    for (const [localName, importedName] of Object.entries(aliases)) {
      const icon = installed.icons?.[importedName];
      if (!icon) continue;
      aliasedIcons[localName] = icon;
      iconAliases[localName] = importedName;
    }
    if (Object.keys(iconAliases).length === 0) continue;
    nextIconLibraries[installedName] = {
      ...installed,
      icons: {
        ...installed.icons,
        ...aliasedIcons
      },
      iconAliases: {
        ...installed.iconAliases,
        ...iconAliases
      }
    };
  }
  const hasIcon = name => Object.values(nextIconLibraries).some(config => !!config.icons?.[name]);
  let nextComponentIndex = componentIndex;
  const shadowed = Object.keys(componentIndex).filter(name => imports.iconNames.has(name) && hasIcon(name));
  if (shadowed.length > 0) {
    nextComponentIndex = {
      ...componentIndex
    };
    for (const name of shadowed) delete nextComponentIndex[name];
  }
  return {
    iconLibraries: nextIconLibraries,
    componentIndex: nextComponentIndex
  };
}
/**
* Describe only the registry state that can change how composition JSX parses.
*
* The editor rebuilds `componentIndex` / `iconLibraries` object identities during
* ordinary canvas renders. Using those identities as a memo key reparses every
* export on every render — and because composition parsing forces new element
* ids, that also remounts each preview and flashes it blank. What actually
* affects the parse is only whether each uppercase tag resolves to a local
* component, to an icon (which library, under which canonical name), or to
* nothing at all.
*/
function getCompositionParseSignature(jsxValues, {
  iconLibraries,
  componentIndex
}) {
  const tagNames = new Set();
  for (const jsx of jsxValues) for (const tagName of uppercaseJsxTagNames(jsx)) tagNames.add(tagName);
  return Array.from(tagNames).sort().map(tagName => {
    if (tagName in componentIndex) return `${tagName}:component`;
    for (const [libraryName, config] of Object.entries(iconLibraries)) {
      if (!config.icons?.[tagName]) continue;
      return `${tagName}:icon:${libraryName}:${config.iconAliases?.[tagName] ?? tagName}`;
    }
    return `${tagName}:unknown`;
  }).join("|");
}
/** Component names the Assets panel must have loaded to render a sidecar. */
function collectCompositionPreviewNames(fileComponents, jsxValues) {
  const names = new Set(fileComponents);
  for (const jsx of jsxValues) for (const tagName of uppercaseJsxTagNames(jsx)) names.add(tagName);
  return [...names];
}
/** Parse composition exports into canvas-ready roots so drag/drop can use the
*  native multi-element payload instead of reparsing JSX on drop. */
function parseCompositionRootsByExport(jsxByExport, context) {
  const rootsByExport = new Map();
  for (const [exportName, jsx] of jsxByExport) try {
    const roots = parseCompositionJsxToNestedRoots(jsx, context.iconLibraries, context.componentIndex);
    if (roots.length > 0) rootsByExport.set(exportName, roots);
  } catch {}
  return rootsByExport;
}
var EMPTY_COMPONENTS$2 = {};
var EMPTY_PARSE_CONTEXT = {
  iconLibraries: {},
  componentIndex: {}
};
var NO_JSX = [];
function PreviewFallback() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <div className="flex items-center justify-center w-full h-full min-h-[40px] bg-ed-muted/40">{<ImageIcon width={14} height={14} className="text-ed-muted-foreground/60" />}</div>;
    $[0] = t0;
  } else t0 = $[0];
  return t0;
}
function parseCompositionStore(jsx, {
  iconLibraries,
  componentIndex
}) {
  if (!jsx?.trim()) return null;
  try {
    return parseCompositionJsx(jsx, iconLibraries, componentIndex, {
      forceNewIds: true
    });
  } catch {
    return null;
  }
}
function buildPreviewComponents(components, resolvedIconLibraries) {
  const merged = {
    ...components
  };
  for (const config of Object.values(resolvedIconLibraries)) {
    if (!config.icons || typeof config.icons !== "object") continue;
    for (const [name, iconComponent] of Object.entries(config.icons)) {
      if (name in merged) continue;
      if (!/^[A-Z]/.test(name)) continue;
      if (name === "Icon" || name === "IconBase" || name.startsWith("__")) continue;
      if (typeof iconComponent === "function" || typeof iconComponent === "object" && iconComponent !== null && "$$typeof" in iconComponent) merged[name] = iconComponent;
    }
  }
  return merged;
}
var CompositionPreview = import_react.memo(function CompositionPreview({
  jsx,
  components = EMPTY_COMPONENTS$2,
  parseContext = EMPTY_PARSE_CONTEXT,
  frameHeight = 70
}) {
  const assetResolver = useAssetResolver();
  const frameRef = (0, import_react.useRef)(null);
  const contentRef = (0, import_react.useRef)(null);
  const [contentHeight, setContentHeight] = (0, import_react.useState)(1);
  const [frameWidth, setFrameWidth] = (0, import_react.useState)(0);
  const scale = !frameWidth || !contentHeight ? 1 : Math.min(frameWidth / 400, frameHeight / contentHeight, 1);
  const parseSignature = (0, import_react.useMemo)(() => getCompositionParseSignature(jsx ? [jsx] : NO_JSX, parseContext), [jsx, parseContext]);
  const previewComponents = (0, import_react.useMemo)(() => buildPreviewComponents(components, parseContext.iconLibraries), [components, parseSignature]);
  const store = (0, import_react.useMemo)(() => parseCompositionStore(jsx, parseContext), [jsx, parseSignature]);
  const rootIds = store ? getRootIds(store) : [];
  const measureContent = (0, import_react.useCallback)(() => {
    const content = contentRef.current;
    if (!content) return;
    const nextHeight = Math.max(content.scrollHeight, 1);
    setContentHeight(prev => {
      if (nextHeight <= 1 && prev > 1) return prev;
      return prev === nextHeight ? prev : nextHeight;
    });
  }, []);
  (0, import_react.useLayoutEffect)(() => {
    const frameEl = frameRef.current;
    if (!frameEl) return;
    const updateFrameWidth = () => {
      setFrameWidth(frameEl.clientWidth);
    };
    updateFrameWidth();
    const frameObserver = new ResizeObserver(updateFrameWidth);
    frameObserver.observe(frameEl);
    return () => frameObserver.disconnect();
  }, []);
  (0, import_react.useLayoutEffect)(() => {
    const content = contentRef.current;
    if (!content) return;
    measureContent();
    const contentObserver = new ResizeObserver(measureContent);
    contentObserver.observe(content);
    return () => contentObserver.disconnect();
  }, [measureContent, jsx, rootIds.length]);
  if (!jsx || !store || rootIds.length === 0) return <div ref={frameRef} data-panel-drag-preview={true} className="w-full overflow-hidden flex items-center justify-center pointer-events-none" style={{
    height: frameHeight
  }}>{<PreviewFallback />}</div>;
  const renderOptions = {
    isDragPreview: true,
    components: previewComponents,
    componentIndex: parseContext.componentIndex,
    iconLibraries: parseContext.iconLibraries,
    assetResolver
  };
  const scaledWidth = 400 * scale;
  const scaledHeight = contentHeight * scale;
  return <div ref={frameRef} data-panel-drag-preview={true} className="w-full overflow-hidden flex items-center justify-center pointer-events-none" style={{
    height: frameHeight
  }}>{<div style={{
      width: scaledWidth,
      height: scaledHeight,
      overflow: "hidden"
    }}>{<div style={{
        width: 400,
        height: contentHeight,
        transform: `scale(${scale})`,
        transformOrigin: "top left"
      }}>{<div ref={contentRef} data-canvas-content={true} style={{
          width: 400,
          backgroundColor: "var(--background, #fff)"
        }}>{<ElementErrorBoundary fallback={<PreviewFallback />}>{rootIds.map(id => renderElement(id, store, renderOptions))}</ElementErrorBoundary>}</div>}</div>}</div>}</div>;
});

export { CompositionPreview, collectCompositionPreviewNames, getCompositionParseContext, getCompositionParseSignature, parseCompositionImports, parseCompositionRootsByExport };
