/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/AssetsPanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { setCompositionDragData, setElementDragData } from "../../../shared/utils/clipboard";
import { generatePrefixedId } from "../../../shared/utils/idUtils";
import { PanelEmptyState } from "./PanelEmptyState";
import { PanelSearchInput } from "./PanelSearchInput";
import { CompositionPreview, collectCompositionPreviewNames, getCompositionParseContext, getCompositionParseSignature, parseCompositionImports, parseCompositionRootsByExport } from "./compositionDrag";
import { buildCompositionTemplates, componentDisplayName, getCompositionPathForBase, isCompositionFile, parseCompositionFile } from "@bingo/compiler";
import { appI18n, useTranslation } from "@bingo/i18n";
import { Button, CaretLeftIcon, CaretRightIcon, FolderIcon, InfoIcon$1, ScrollArea, SparkleIcon, Text$4, Tooltip, TooltipContent, TooltipTrigger } from "@bingo/ui";
import { DiamondsFourIcon as r$6 } from "@phosphor-icons/react/dist/icons/DiamondsFour";
import { ShapesIcon as o$7 } from "@phosphor-icons/react/dist/icons/Shapes";
import { SquaresFourIcon as r$3 } from "@phosphor-icons/react/dist/icons/SquaresFour";
import * as import_react from "react";
import * as import_jsx_runtime from "react/jsx-runtime";

var ASSETS_TREE_ICON_SIZE_PX = 14;
var ASSETS_TREE_GAP_PX = 6;
var DETAIL_EDGE_PADDING_PX = 16;
var DETAIL_CONTENT_INDENT_PX = 40;
var COMPOSITION_FRAME_PADDING$1 = 4;
var COMPOSITION_GENERATION_TIMEOUT_MS = 12e4;
var COMPOSITION_READ_RETRY_MS = 500;
var COMPOSITION_READ_MAX_ATTEMPTS = 40;
var FIRST_EXPORT = "first";
var EMPTY_COMPONENT_INDEX$1 = {};
var EMPTY_COMPONENTS$1 = {};
var EMPTY_ICON_LIBRARIES$1 = {};
var assetsLabelClass = "text-[13px] leading-5 tracking-[-0.01em] font-medium text-ed-foreground";
var assetsMutedLabelClass = "text-[13px] leading-5 tracking-[-0.01em] font-medium text-ed-muted-foreground";
/**
* Invent a conservative preview/drop value for one prop from scanner metadata.
* Returns undefined when we cannot invent a meaningful serializable value.
*/
function inventPropValue(propName, propInfo) {
  const propType = String(propInfo?.type || propInfo || "");
  if (propInfo?.example !== void 0) return propInfo.example;
  if (propInfo?.default !== void 0) return propInfo.default;
  if (/\[\](?:\s*\|\s*undefined)?$/.test(propType) || /^(?:Readonly)?Array\s*</.test(propType) || /^readonly\s+[^|]+\[\]/.test(propType)) return [];
  if (/^(?:Record|Partial|Required|Pick|Omit)\s*</.test(propType) || /^\s*\{/.test(propType)) return {};
  if (propType.includes("=>") || propType.includes("() =>") || propType.includes("ComponentType") || propType.includes("Element") || propType.includes("CSSProperties") || propType.includes("ReactNode") || propType.includes("ReactElement")) return;
  if (propType.includes("|") && (propType.includes("\"") || propType.includes("'"))) return propType.split("|").map(value => value.trim().replace(/['"]/g, "")).find(value => value !== "undefined" && value !== "null" && value.length > 0);
  if (propType.includes("string")) return propName;
  if (propType.includes("number")) return 0;
  if (propType.includes("boolean")) return false;
}
/**
* Create conservative values for required props when a raw component is added
* from Assets. Complex values cannot be meaningfully invented without a
* composition, but arrays/objects should still be initialized so the component
* does not immediately crash while the user edits them in the Props panel.
*/
function buildRequiredComponentProps(props) {
  const defaultProps = {};
  let hasChildrenProp = false;
  for (const [propName, propInfo] of Object.entries(props ?? {})) {
    if (propName === "children") {
      hasChildrenProp = true;
      continue;
    }
    if (!propInfo?.required) continue;
    const value = inventPropValue(propName, propInfo);
    if (value !== void 0) defaultProps[propName] = value;
  }
  return {
    props: defaultProps,
    hasChildrenProp
  };
}
/**
* Fill inventable props for a standalone preview (e.g. version history).
* Unlike Assets drop, also fills optional primitives/unions so the component
* is visible — empty optional title/label props are a common blank-preview cause.
*/
function buildPreviewComponentProps(props) {
  const defaultProps = {};
  let hasChildrenProp = false;
  for (const [propName, propInfo] of Object.entries(props ?? {})) {
    if (propName === "children") {
      hasChildrenProp = true;
      continue;
    }
    const value = inventPropValue(propName, propInfo);
    if (value !== void 0) defaultProps[propName] = value;
  }
  if (hasChildrenProp && defaultProps.children === void 0) defaultProps.children = appI18n.t("editor:assetsPanel.previewContent");
  return {
    props: defaultProps,
    hasChildrenProp
  };
}
function isComplexRequiredProp(propName, propInfo) {
  if (!propInfo?.required) return false;
  if (propName === "children") return true;
  const propType = String(propInfo?.type || propInfo);
  return /\[\]|(?:Readonly)?Array\s*</.test(propType) || /^(?:Record|Partial|Required|Pick|Omit)\s*</.test(propType) || /^\s*\{/.test(propType) || propType.includes("ReactNode") || propType.includes("ReactElement") || propType.includes("ComponentType") || propType.includes("=>");
}
/**
* A deliberately conservative hint, not a placement rule. Files with a
* component family or required structured content are difficult to use as a
* single raw node and benefit from a ready-made composition.
*/
function shouldSuggestComposition(componentNames, componentIndex) {
  if (componentNames.length >= 3) return true;
  return componentNames.some(componentName => Object.entries(componentIndex[componentName]?.props ?? {}).some(([propName, propInfo]) => isComplexRequiredProp(propName, propInfo)));
}
/** Return the first insertable static JSX export from a composition sidecar. */
function getFirstCompositionJsx(content) {
  const {
    exportNames,
    jsxByExport
  } = parseCompositionFile(content);
  const templates = buildCompositionTemplates(exportNames);
  for (const template of templates) {
    const jsx = jsxByExport.get(template.exportName);
    if (jsx) return jsx;
  }
  return null;
}
function buildComponentFileEntries(componentIndex) {
  const files = new Map();
  for (const [componentName, info] of Object.entries(componentIndex)) {
    if (isCompositionFile(info.path)) continue;
    let entry = files.get(info.path);
    if (!entry) {
      const fileName = info.path.split("/").pop() ?? info.path;
      entry = {
        path: info.path,
        fileName,
        components: []
      };
      files.set(info.path, entry);
    }
    entry.components.push(componentName);
  }
  for (const entry of files.values()) entry.components.sort((a, b) => a.localeCompare(b));
  return Array.from(files.values()).sort((a, b) => a.path.localeCompare(b.path));
}
function fileMatchesSearch(entry, query) {
  if (entry.path.toLowerCase().includes(query)) return true;
  if (entry.fileName.toLowerCase().includes(query)) return true;
  return entry.components.some(name => name.toLowerCase().includes(query));
}
function buildAssetsTree(entries) {
  const root = {
    name: "components",
    type: "folder",
    path: "components",
    children: []
  };
  for (const entry of entries) {
    const parts = entry.path.split("/");
    const startIdx = parts[0] === "components" ? 1 : 0;
    let current = root;
    for (let i = startIdx; i < parts.length - 1; i++) {
      const folderName = parts[i];
      const folderPath = parts.slice(0, i + 1).join("/");
      let folder = current.children?.find(child => child.type === "folder" && child.name === folderName);
      if (!folder) {
        folder = {
          name: folderName,
          type: "folder",
          path: folderPath,
          children: []
        };
        current.children = current.children ?? [];
        current.children.push(folder);
      }
      current = folder;
    }
    current.children = current.children ?? [];
    current.children.push({
      name: parts[parts.length - 1],
      type: "file",
      path: entry.path
    });
  }
  return root;
}
function treeNodeMatchesSearch(node, query, fileEntries) {
  if (node.type === "file") {
    const entry = fileEntries.find(e => e.path === node.path);
    return entry ? fileMatchesSearch(entry, query) : node.name.toLowerCase().includes(query);
  }
  return !!node.children?.some(child => treeNodeMatchesSearch(child, query, fileEntries));
}
/** 16px base + 12px per depth → 16 / 28 / 40 … */
function assetsIndentStyle(depth) {
  return {
    paddingLeft: 16 + depth * 12
  };
}
/** Composition file preview aligns with the folder icon in the parent row. */
function assetsCompositionFileIndentStyle(depth) {
  return {
    paddingLeft: 16 + (depth - 1) * 12 + ASSETS_TREE_ICON_SIZE_PX + ASSETS_TREE_GAP_PX
  };
}
function detailContentIndentStyle() {
  return {
    paddingLeft: DETAIL_CONTENT_INDENT_PX
  };
}
function compositionItemStyle() {
  return {
    paddingLeft: DETAIL_CONTENT_INDENT_PX,
    paddingRight: DETAIL_EDGE_PADDING_PX
  };
}
var AssetsPanel = ({
  onAddElement,
  onPasteCompositionJsx,
  readCompositionFile,
  compositionSourceId = "",
  onEditComponent,
  componentIndex = EMPTY_COMPONENT_INDEX$1,
  components = EMPTY_COMPONENTS$1,
  iconLibraries = EMPTY_ICON_LIBRARIES$1,
  allIconLibraries,
  readOnly = false,
  onAskAI,
  onAskAIForComposition,
  compositionRefreshKey = 0,
  onEnsureComponentNames
}) => {
  const { t } = useTranslation("editor");
  const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
  const [selectedFilePath, setSelectedFilePath] = (0, import_react.useState)(null);
  const [expandedPaths, setExpandedPaths] = (0, import_react.useState)({
    components: true
  });
  const [pendingCompositionInsert, setPendingCompositionInsert] = (0, import_react.useState)(null);
  const pendingCompositionInsertRef = (0, import_react.useRef)(null);
  const compositionReadRef = (0, import_react.useRef)(null);
  const pendingCompositionTimeoutRef = (0, import_react.useRef)(null);
  const componentClickTimerRef = (0, import_react.useRef)(null);
  const compositionPath = selectedFilePath && readCompositionFile ? getCompositionPathForBase(selectedFilePath) : null;
  const [loadedComposition, setLoadedComposition] = (0, import_react.useState)({
    path: null,
    sourceId: "",
    content: null,
    refreshKey: 0
  });
  const compositionIsCurrent = loadedComposition.path === compositionPath && loadedComposition.sourceId === compositionSourceId && loadedComposition.refreshKey === compositionRefreshKey;
  const compositionContent = compositionIsCurrent ? loadedComposition.content : null;
  const compositionLoading = compositionPath !== null && !compositionIsCurrent;
  const fileEntries = (0, import_react.useMemo)(() => buildComponentFileEntries(componentIndex), [componentIndex]);
  const assetsTree = (0, import_react.useMemo)(() => buildAssetsTree(fileEntries), [fileEntries]);
  const componentCount = Object.keys(componentIndex).length;
  const searchLower = searchQuery.trim().toLowerCase();
  const togglePath = path => {
    setExpandedPaths(prev => ({
      ...prev,
      [path]: !(prev[path] ?? true)
    }));
  };
  const selectedFile = selectedFilePath ? fileEntries.find(entry => entry.path === selectedFilePath) ?? null : null;
  const filteredFiles = searchLower ? fileEntries.filter(entry => fileMatchesSearch(entry, searchLower)) : fileEntries;
  const {
    compositionTemplates,
    compositionJsxByExport
  } = (0, import_react.useMemo)(() => {
    if (!compositionContent) return {
      compositionTemplates: [],
      compositionJsxByExport: void 0
    };
    const {
      exportNames,
      jsxByExport
    } = parseCompositionFile(compositionContent);
    return {
      compositionTemplates: buildCompositionTemplates(exportNames),
      compositionJsxByExport: jsxByExport
    };
  }, [compositionContent]);
  const compositionImports = (0, import_react.useMemo)(() => parseCompositionImports(compositionContent), [compositionContent]);
  const compositionParseContext = (0, import_react.useMemo)(() => getCompositionParseContext(compositionImports, iconLibraries, componentIndex, allIconLibraries), [compositionImports, iconLibraries, componentIndex, allIconLibraries]);
  const compositionParseSignature = (0, import_react.useMemo)(() => getCompositionParseSignature(compositionJsxByExport?.values() ?? [], compositionParseContext), [compositionJsxByExport, compositionParseContext]);
  const compositionRootsByExport = (0, import_react.useMemo)(() => compositionJsxByExport ? parseCompositionRootsByExport(compositionJsxByExport, compositionParseContext) : void 0, [compositionJsxByExport, compositionParseSignature]);
  (0, import_react.useEffect)(() => {
    if (!selectedFile || !onEnsureComponentNames) return;
    onEnsureComponentNames(collectCompositionPreviewNames(selectedFile.components, compositionJsxByExport?.values() ?? []));
  }, [selectedFile, compositionJsxByExport, onEnsureComponentNames]);
  const loadComposition = (0, import_react.useEffectEvent)(async (path, sourceId, refreshKey) => {
    if (!readCompositionFile) return;
    const key = `${sourceId}:${path}:${refreshKey}`;
    if (compositionReadRef.current?.key !== key) compositionReadRef.current = {
      key,
      promise: readCompositionFile(path)
    };
    return {
      path,
      sourceId,
      content: await compositionReadRef.current.promise,
      refreshKey
    };
  });
  (0, import_react.useEffect)(() => {
    if (!compositionPath) return;
    const path = compositionPath;
    const sourceId = compositionSourceId;
    const refreshKey = compositionRefreshKey;
    let cancelled = false;
    loadComposition(path, sourceId, refreshKey).then(loaded => {
      if (cancelled || !loaded) return;
      setLoadedComposition(loaded);
    }).catch(() => {
      if (cancelled) return;
      setLoadedComposition({
        path,
        sourceId,
        content: null,
        refreshKey
      });
    });
    return () => {
      cancelled = true;
    };
  }, [compositionPath, compositionSourceId, compositionRefreshKey]);
  const insertPendingComposition = (0, import_react.useEffectEvent)(async (pending, cancelled) => {
    if (!readCompositionFile || !onPasteCompositionJsx) return false;
    const content = await readCompositionFile(pending.compositionFilePath);
    if (cancelled() || pendingCompositionInsertRef.current !== pending) return false;
    const jsx = getFirstCompositionJsx(content);
    if (!jsx) return false;
    pendingCompositionInsertRef.current = null;
    setPendingCompositionInsert(null);
    if (pendingCompositionTimeoutRef.current) {
      clearTimeout(pendingCompositionTimeoutRef.current);
      pendingCompositionTimeoutRef.current = null;
    }
    onPasteCompositionJsx(jsx, parseCompositionRootsByExport(new Map([[FIRST_EXPORT, jsx]]), getCompositionParseContext(parseCompositionImports(content), iconLibraries, componentIndex, allIconLibraries)).get(FIRST_EXPORT));
    return true;
  });
  (0, import_react.useEffect)(() => {
    const pending = pendingCompositionInsertRef.current;
    if (!pending || compositionRefreshKey === pending.refreshKeyAtRequest) return;
    let cancelled = false;
    let retryTimer = null;
    let attempts = 0;
    const tryInsert = async () => {
      attempts += 1;
      try {
        if (await insertPendingComposition(pending, () => cancelled)) return;
      } catch {}
      if (!cancelled && attempts < COMPOSITION_READ_MAX_ATTEMPTS) retryTimer = setTimeout(() => {
        tryInsert();
      }, COMPOSITION_READ_RETRY_MS);
    };
    tryInsert();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [compositionRefreshKey]);
  (0, import_react.useEffect)(() => () => {
    if (pendingCompositionTimeoutRef.current) clearTimeout(pendingCompositionTimeoutRef.current);
  }, []);
  const handleCreateComposition = entry => {
    if (!onAskAIForComposition || !readCompositionFile || !onPasteCompositionJsx || readOnly) return;
    const pending = {
      componentFilePath: entry.path,
      compositionFilePath: getCompositionPathForBase(entry.path),
      refreshKeyAtRequest: compositionRefreshKey
    };
    if (pendingCompositionTimeoutRef.current) clearTimeout(pendingCompositionTimeoutRef.current);
    pendingCompositionInsertRef.current = pending;
    setPendingCompositionInsert(pending);
    pendingCompositionTimeoutRef.current = setTimeout(() => {
      if (pendingCompositionInsertRef.current !== pending) return;
      pendingCompositionInsertRef.current = null;
      pendingCompositionTimeoutRef.current = null;
      setPendingCompositionInsert(null);
    }, COMPOSITION_GENERATION_TIMEOUT_MS);
    onAskAIForComposition({
      componentFilePath: entry.path,
      compositionFilePath: pending.compositionFilePath,
      componentNames: entry.components
    });
  };
  const createComponentElement = componentName => {
    const componentInfo = componentIndex[componentName];
    const {
      props: defaultProps,
      hasChildrenProp
    } = buildRequiredComponentProps(componentInfo?.props);
    const defaultChildren = hasChildrenProp ? [] : void 0;
    return {
      id: generatePrefixedId("component"),
      type: "component",
      componentName,
      props: defaultProps,
      styles: {},
      children: defaultChildren
    };
  };
  const handleComponentDragStart = (e, componentName) => {
    if (readOnly) return;
    setElementDragData(e, createComponentElement(componentName));
  };
  const handleComponentClick = (componentName, filePath, e) => {
    if (componentClickTimerRef.current) {
      clearTimeout(componentClickTimerRef.current);
      componentClickTimerRef.current = null;
    }
    if (e.detail === 1) {
      if (readOnly) return;
      componentClickTimerRef.current = setTimeout(() => {
        onAddElement(createComponentElement(componentName));
        componentClickTimerRef.current = null;
      }, 250);
    } else if (e.detail === 2) onEditComponent?.(componentName, filePath);
  };
  const handleCompositionDragStart = (e, exportName) => {
    const jsx = compositionJsxByExport?.get(exportName);
    if (!jsx) return;
    setCompositionDragData(e, jsx, compositionRootsByExport?.get(exportName));
  };
  const handleCompositionClick = (e, exportName) => {
    const jsx = compositionJsxByExport?.get(exportName);
    if (!jsx) return;
    e.stopPropagation();
    onPasteCompositionJsx?.(jsx, compositionRootsByExport?.get(exportName));
  };
  const renderCompositionPreviewFrame = (exportName, className = "") => {
    const jsx = compositionJsxByExport?.get(exportName) ?? null;
    return <div className={`w-full shrink-0 rounded border border-ed-border overflow-hidden ${className}`} style={{
      height: 70,
      padding: COMPOSITION_FRAME_PADDING$1,
      backgroundColor: "var(--background, #fff)"
    }}>{<CompositionPreview jsx={jsx} components={components} parseContext={compositionParseContext} frameHeight={62} />}</div>;
  };
  const renderCompositionTemplate = template => {
    const canInsert = !!onPasteCompositionJsx && !readOnly;
    return <button key={template.exportName} type="button" draggable={canInsert} onDragStart={e => canInsert && handleCompositionDragStart(e, template.exportName)} onClick={e => canInsert && handleCompositionClick(e, template.exportName)} style={compositionItemStyle()} className={`w-full min-w-0 max-w-full text-left flex flex-col gap-2 ${canInsert ? "cursor-grab active:cursor-grabbing" : ""}`}>{renderCompositionPreviewFrame(template.exportName, canInsert ? "hover:border-ed-ring" : "")}{<span className={`${assetsLabelClass} truncate`}>{template.name}</span>}</button>;
  };
  const renderFileDetail = entry => {
    const showCompositions = compositionLoading || compositionTemplates.length > 0 && !!compositionPath;
    const showCompositionDivider = !compositionLoading && compositionTemplates.length > 0 && !!compositionPath;
    const showCompositionSuggestion = !compositionLoading && compositionTemplates.length === 0 && shouldSuggestComposition(entry.components, componentIndex);
    const isCreatingComposition = pendingCompositionInsert?.componentFilePath === entry.path;
    return <ScrollArea className="flex-1 bg-ed-background">{<button type="button" onClick={() => setSelectedFilePath(null)} className="py-2 px-4 flex items-center gap-2 min-w-0 shrink-0 w-full text-left hover:bg-ed-accent" aria-label={t("assetsPanel.backToFiles")}>{<CaretLeftIcon width={16} height={16} className="shrink-0 text-ed-muted-foreground" />}{<FolderIcon width={14} height={14} className="text-ed-muted-foreground shrink-0" />}{<span className={`${assetsLabelClass} truncate`}>{entry.path}</span>}</button>}{showCompositionSuggestion && <div className="mx-4 mt-3 rounded-xl border border-ed-border bg-ed-background p-3 shadow-md/4">{<div className="flex items-start gap-2.5">{<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-ed-border bg-ed-background text-ed-muted-foreground shadow-sm">{<InfoIcon$1 width={13} height={13} />}</div>}{<div className="min-w-0 flex-1">{<div className={assetsLabelClass}>{t("assetsPanel.compositionRecommended")}</div>}{<p className="mt-0.5 text-xs text-ed-muted-foreground">{t("assetsPanel.compositionDescription")}</p>}{!readOnly && onAskAIForComposition && readCompositionFile && onPasteCompositionJsx && <Button type="button" size="xs" variant="outline" LeftIcon={SparkleIcon} loading={isCreatingComposition} disabled={isCreatingComposition} className="mt-3" onClick={() => handleCreateComposition(entry)}>{isCreatingComposition ? t("assetsPanel.creatingComposition") : t("assetsPanel.createWithAssistant")}</Button>}{isCreatingComposition && <p className="mt-1.5 text-[11px] leading-4 text-ed-muted-foreground">{t("assetsPanel.compositionPending")}</p>}</div>}</div>}</div>}{showCompositions && <div className="flex flex-col gap-5 pt-2 pb-4">{compositionLoading && compositionTemplates.length === 0 ? <span className={assetsMutedLabelClass} style={detailContentIndentStyle()}>{t("assetsPanel.loadingTemplates")}</span> : compositionTemplates.map(template => renderCompositionTemplate(template))}</div>}{entry.components.length > 0 && <div className={`flex flex-col gap-2 pt-4 pb-4 ${showCompositionDivider ? "border-t border-ed-border" : ""}`}>{<span className={`${assetsMutedLabelClass} px-4`}>{t("assetsPanel.components")}</span>}{entry.components.map(componentName => {
          const displayName = componentDisplayName(componentName);
          const row = <div key={componentName} draggable={!readOnly} onDragStart={e => handleComponentDragStart(e, componentName)} onClick={e => handleComponentClick(componentName, entry.path, e)} className={`relative py-1.5 pr-4 flex items-center gap-1.5 hover:bg-ed-accent rounded-md ${!readOnly && "cursor-grab active:cursor-grabbing"}`} style={detailContentIndentStyle()}>{(0, import_jsx_runtime.jsx)(r$6, {
              size: 14,
              weight: "fill",
              className: "text-purple-500 shrink-0"
            })}{<span className={`${assetsLabelClass} flex-1 min-w-0 truncate`}>{displayName}</span>}{<div data-panel-drag-preview={true} aria-hidden={true} className="absolute left-0 top-0 flex items-center gap-1.5 opacity-0 pointer-events-none whitespace-nowrap">{(0, import_jsx_runtime.jsx)(r$6, {
                size: 14,
                weight: "fill",
                className: "text-purple-500 shrink-0"
              })}{<span className={assetsLabelClass}>{displayName}</span>}</div>}</div>;
          if (readOnly) return <Tooltip key={componentName}>{<TooltipTrigger asChild={true}>{row}</TooltipTrigger>}{<TooltipContent side="right">{t("assetsPanel.openComponentHint")}</TooltipContent>}</Tooltip>;
          return row;
        })}</div>}</ScrollArea>;
  };
  const renderAssetsTree = (node, depth = 0) => {
    if (node.type === "folder" && !node.children?.length) return null;
    if (searchLower && !treeNodeMatchesSearch(node, searchLower, fileEntries)) return null;
    if (node.type === "folder") {
      const isExpanded = expandedPaths[node.path] ?? true;
      return <div key={node.path}>{<button type="button" onClick={() => togglePath(node.path)} className="w-full py-1.5 pr-4 hover:bg-ed-accent flex items-center gap-1.5 text-left" style={assetsIndentStyle(depth)}>{<CaretRightIcon width={14} height={14} className={`text-ed-muted-foreground shrink-0 ${isExpanded ? "rotate-90" : ""}`} />}{<FolderIcon width={14} height={14} className="text-ed-muted-foreground shrink-0" />}{<span className={`${assetsLabelClass} truncate`}>{node.name}</span>}</button>}{isExpanded && node.children?.map(child => renderAssetsTree(child, depth + 1))}</div>;
    }
    return <button key={node.path} type="button" onClick={() => setSelectedFilePath(node.path)} className="w-full px-4 py-1.5 hover:bg-ed-accent flex items-center gap-1.5 text-left" style={assetsCompositionFileIndentStyle(depth)}>{(0, import_jsx_runtime.jsx)(r$3, {
        size: 14,
        weight: "bold",
        className: "text-ed-muted-foreground shrink-0"
      })}{<span className={`${assetsLabelClass} flex-1 min-w-0 truncate`}>{node.name}</span>}{<CaretRightIcon width={14} height={14} className="text-ed-muted-foreground shrink-0" />}</button>;
  };
  const renderFileList = () => <ScrollArea className="flex-1 bg-ed-background">{renderAssetsTree(assetsTree)}</ScrollArea>;
  return <div className="w-full flex flex-col flex-1 overflow-hidden pt-1">{readOnly && <div className="px-4 pb-2 bg-ed-muted/50 border-b border-ed-border">{<Text$4 size="xs" variant="secondary">{t("assetsPanel.viewOnly")}</Text$4>}</div>}{componentCount > 0 && !selectedFile && <div className="px-3 pb-2 border-b border-ed-border">{<div className="flex items-center gap-1.5">{<PanelSearchInput className="relative flex-1" value={searchQuery} onChange={setSearchQuery} placeholder={t("assetsPanel.searchComponents")} />}</div>}</div>}{<div className="flex-1 overflow-hidden flex flex-col">{componentCount === 0 ? <PanelEmptyState icon={(0, import_jsx_runtime.jsx)(o$7, {
        size: 24,
        className: "text-ed-muted-foreground"
      })} title={t("assetsPanel.emptyTitle")} description={t("assetsPanel.emptyDescription")} actions={!readOnly && onAskAI ? <Button variant="secondary" size="sm" onClick={onAskAI} className="w-full">{t("assetsPanel.askAssistant")}</Button> : void 0} /> : selectedFile ? renderFileDetail(selectedFile) : filteredFiles.length === 0 ? <div className="flex flex-col items-center justify-center px-4 py-12 text-center">{<Text$4 size="sm" variant="secondary">{t("assetsPanel.noMatches")}</Text$4>}</div> : renderFileList()}</div>}</div>;
};

export { AssetsPanel, buildPreviewComponentProps, buildRequiredComponentProps, inventPropValue };
