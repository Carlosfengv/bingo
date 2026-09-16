/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/AssetsSidebarTabV2.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { setCompositionDragData, setElementDragData } from "../../../shared/utils/clipboard";
import { generatePrefixedId } from "../../../shared/utils/idUtils";
import { createElementFromTag, htmlTags } from "../../utils/htmlTagsData";
import { extractIconNames, searchIcons } from "../../utils/iconUtils";
import { SidebarSectionHeader } from "../SidebarSectionHeader";
import { buildRequiredComponentProps } from "./AssetsPanel";
import { IconsPanel } from "./IconsPanel";
import { CompositionPreview, collectCompositionPreviewNames, getCompositionParseContext, getCompositionParseSignature, parseCompositionImports, parseCompositionRootsByExport } from "./compositionDrag";
import { IconBtn } from "./styles/primitives";
import { buildCompositionTemplates, componentDisplayName, getCompositionPathForBase, parseCompositionFile } from "@bingo/compiler";
import { Button, CaretDownIcon, CaretLeftIcon, CaretRightIcon, CodeIcon, DesktopIcon, DeviceMobileIcon, DeviceTabletIcon, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, FileCodeIcon, FilePlusIcon, FolderIcon, GlobeIcon, InputGroup, InputGroupAddon, InputGroupInput, PackageIcon, PaletteIcon, PlusIcon, ScrollArea, SearchIcon, SparkleIcon, Text$4, TextTIcon, Tooltip, TooltipContent, TooltipTrigger, XIcon, cn$2 } from "@bingo/ui";
import { DiamondsFour as i$4 } from "@phosphor-icons/react/dist/icons/DiamondsFour";
import * as import_react from "react";
import { useTranslation } from "@bingo/i18n";
import * as import_compiler_runtime from "react/compiler-runtime";
import * as import_jsx_runtime from "react/jsx-runtime";

var INDENT_STEP = 20;
var INDENT_BASE = 0;
var indentOf = depth => depth * INDENT_STEP + INDENT_BASE;
var ASSET_ICON_PX = 14;
var ICON_SEARCH_PREVIEW = 16;
var COMPOSITION_FRAME_PADDING = 4;
var EMPTY_COMPONENT_INDEX = {};
var EMPTY_COMPONENTS = {};
var EMPTY_ICON_LIBRARIES = {};
var htmlTagIcon = () => <CodeIcon width={ASSET_ICON_PX} height={ASSET_ICON_PX} className="text-ed-muted-foreground" />;
var htmlTextIcon = () => <TextTIcon width={ASSET_ICON_PX} height={ASSET_ICON_PX} className="text-ed-muted-foreground" />;
var kitIcon = (Icon, className) => <Icon width={ASSET_ICON_PX} height={ASSET_ICON_PX} className={className} />;
var HTML_GROUPS = [{
  id: "typography",
  label: "Typography",
  categories: ["text"]
}, {
  id: "media",
  label: "Media",
  categories: ["media"]
}, {
  id: "forms",
  label: "Forms",
  categories: ["form"]
}, {
  id: "layout",
  label: "Layout",
  categories: ["layout", "semantic"]
}];
var WEBVIEW_SIZE_GROUPS = [{
  id: "mobile",
  label: "Mobile",
  Icon: DeviceMobileIcon,
  sizes: [{
    name: "iPhone SE",
    width: 375,
    height: 667
  }, {
    name: "iPhone",
    width: 390,
    height: 844
  }, {
    name: "iPhone Pro Max",
    width: 430,
    height: 932
  }, {
    name: "Pixel",
    width: 412,
    height: 915
  }]
}, {
  id: "tablet",
  label: "Tablet",
  Icon: DeviceTabletIcon,
  sizes: [{
    name: "iPad mini",
    width: 768,
    height: 1024
  }, {
    name: "iPad",
    width: 834,
    height: 1112
  }, {
    name: "iPad Pro",
    width: 1024,
    height: 1366
  }]
}, {
  id: "desktop",
  label: "Desktop",
  Icon: DesktopIcon,
  sizes: [{
    name: "Laptop",
    width: 1280,
    height: 800
  }, {
    name: "Desktop",
    width: 1440,
    height: 900
  }, {
    name: "MacBook Pro 14\"",
    width: 1512,
    height: 982
  }, {
    name: "Full HD",
    width: 1920,
    height: 1080
  }, {
    name: "2K",
    width: 2560,
    height: 1440
  }]
}];
var DEFAULT_WEBVIEW_SIZE = {
  width: 1280,
  height: 800
};
function webviewSizeSearchText(size) {
  return `${size.name} ${size.width} ${size.height} ${size.width}x${size.height}`;
}
function createWebviewElement(src, viewportWidth, viewportHeight) {
  return {
    id: generatePrefixedId("webview"),
    type: "webview",
    src,
    viewportWidth,
    viewportHeight
  };
}
function compactComponentFiles(componentIndex) {
  const byPath = new Map();
  for (const [componentName, info] of Object.entries(componentIndex)) {
    if (!info.path || /\.compositions?\.[jt]sx?$/.test(info.path)) continue;
    const entry = byPath.get(info.path) ?? {
      path: info.path,
      name: info.path.split("/").pop()?.replace(/\.[^.]+$/, "") || info.path,
      components: []
    };
    entry.components.push(componentName);
    byPath.set(info.path, entry);
  }
  return [...byPath.values()].map(entry => ({
    ...entry,
    components: entry.components.sort((a, b) => a.localeCompare(b))
  })).sort((a, b) => a.path.localeCompare(b.path));
}
function buildComponentTree(componentIndex) {
  const roots = [];
  for (const file of compactComponentFiles(componentIndex)) {
    const parts = file.path.split("/");
    const pathParts = parts[0] === "components" ? parts.slice(1) : parts;
    let siblings = roots;
    let currentPath = parts[0] === "components" ? "components" : "";
    for (const folderName of pathParts.slice(0, -1)) {
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      let folder = siblings.find(node => node.type === "folder" && node.path === currentPath);
      if (!folder) {
        folder = {
          type: "folder",
          name: folderName,
          path: currentPath,
          children: []
        };
        siblings.push(folder);
      }
      siblings = folder.children;
    }
    siblings.push({
      type: "file",
      name: file.name,
      path: file.path,
      file
    });
  }
  const sortNodes = nodes => nodes.map(node => node.children ? {
    ...node,
    children: sortNodes(node.children)
  } : node).sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return sortNodes(roots);
}
function filterComponentTree(nodes, query) {
  if (!query) return nodes;
  return nodes.flatMap(node => {
    const selfMatches = [node.name, node.path, ...(node.file?.components ?? [])].some(value => value.toLowerCase().includes(query));
    if (node.type === "file") return selfMatches ? [node] : [];
    if (selfMatches) return [node];
    const children = filterComponentTree(node.children ?? [], query);
    return children.length ? [{
      ...node,
      children
    }] : [];
  });
}
function TreeRow(t0) {
  const $ = (0, import_compiler_runtime.c)(48);
  const { t } = useTranslation("editor");
  const {
    depth,
    expanded,
    onToggle,
    icon,
    label,
    trailing,
    onTrailingClick,
    draggable,
    onDragStart,
    onClick,
    onDoubleClick
  } = t0;
  const expandable = expanded !== void 0;
  const split = !!onTrailingClick;
  const t1 = split ? "gap-1" : "min-w-full w-max gap-1.5 rounded-[5px] hover:bg-ed-accent";
  const t2 = draggable && "cursor-grab active:cursor-grabbing";
  let t3;
  if ($[0] !== t1 || $[1] !== t2) {
    t3 = cn$2("relative flex h-6.5 w-full min-w-0 items-center py-0 pr-1 group", t1, t2);
    $[0] = t1;
    $[1] = t2;
    $[2] = t3;
  } else t3 = $[2];
  let t4;
  if ($[3] !== depth) {
    t4 = indentOf(depth);
    $[3] = depth;
    $[4] = t4;
  } else t4 = $[4];
  let t5;
  if ($[5] !== t4) {
    t5 = {
      paddingLeft: t4
    };
    $[5] = t4;
    $[6] = t5;
  } else t5 = $[6];
  const t6 = split ? void 0 : "button";
  const t7 = split ? void 0 : 0;
  const t8 = split ? void 0 : onClick;
  let t9;
  if ($[7] !== onClick || $[8] !== split) {
    t9 = split ? void 0 : event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onClick?.(event);
    };
    $[7] = onClick;
    $[8] = split;
    $[9] = t9;
  } else t9 = $[9];
  const t10 = split ? 0 : void 0;
  const t11 = split && "h-full flex-1 group-hover:bg-ed-accent";
  let t12;
  if ($[10] !== t11) {
    t12 = cn$2("flex min-w-0 items-center gap-1.5 rounded-[5px]", t11);
    $[10] = t11;
    $[11] = t12;
  } else t12 = $[11];
  const t13 = split ? onClick : void 0;
  let t14;
  if ($[12] !== onClick || $[13] !== split) {
    t14 = split ? event_0 => {
      if (event_0.key !== "Enter" && event_0.key !== " ") return;
      event_0.preventDefault();
      onClick?.(event_0);
    } : void 0;
    $[12] = onClick;
    $[13] = split;
    $[14] = t14;
  } else t14 = $[14];
  let t15;
  if (true) {
    t15 = expandable && <Button type="button" variant="ghost" size="icon-3xs" isChildText={false} aria-label={t(expanded ? "assetsSidebar.collapse" : "assetsSidebar.expand")} className="group/caret size-4 rounded-[5px] hover:bg-transparent" onClick={event_1 => {
      event_1.stopPropagation();
      onToggle?.();
    }}>{expanded ? <CaretDownIcon className="size-2 text-ed-muted-foreground group-hover/caret:text-ed-foreground" /> : <CaretRightIcon className="size-2 text-ed-muted-foreground group-hover/caret:text-ed-foreground" />}</Button>;
    $[15] = expandable;
    $[16] = expanded;
    $[17] = onToggle;
    $[18] = t15;
  } else t15 = $[18];
  let t16;
  if ($[19] !== t15) {
    t16 = <div className="flex w-4 shrink-0 items-center justify-center">{t15}</div>;
    $[19] = t15;
    $[20] = t16;
  } else t16 = $[20];
  let t17;
  if ($[21] !== icon) {
    t17 = <div className="flex size-3.5 shrink-0 items-center justify-center [&_svg]:size-3.5">{icon}</div>;
    $[21] = icon;
    $[22] = t17;
  } else t17 = $[22];
  let t18;
  if ($[23] !== label) {
    t18 = <Text$4 size="3xs" variant="primary" className="shrink-0 select-none whitespace-nowrap text-left">{label}</Text$4>;
    $[23] = label;
    $[24] = t18;
  } else t18 = $[24];
  let t19;
  if ($[25] !== t10 || $[26] !== t12 || $[27] !== t13 || $[28] !== t14 || $[29] !== t16 || $[30] !== t17 || $[31] !== t18) {
    t19 = <div role="button" tabIndex={t10} className={t12} onClick={t13} onKeyDown={t14}>{t16}{t17}{t18}</div>;
    $[25] = t10;
    $[26] = t12;
    $[27] = t13;
    $[28] = t14;
    $[29] = t16;
    $[30] = t17;
    $[31] = t18;
    $[32] = t19;
  } else t19 = $[32];
  let t20;
  if ($[33] !== onTrailingClick || $[34] !== trailing) {
    t20 = trailing && <span role={onTrailingClick ? "button" : void 0} tabIndex={onTrailingClick ? 0 : void 0} className={cn$2("ml-auto flex h-full shrink-0 items-center justify-end gap-1 text-ed-muted-foreground", onTrailingClick ? "rounded-[5px] px-1.5 group-hover:bg-ed-accent group-hover:text-ed-foreground" : "pr-1")} onClick={onTrailingClick ? event_2 => {
      event_2.stopPropagation();
      onTrailingClick(event_2);
    } : void 0}>{trailing}</span>;
    $[33] = onTrailingClick;
    $[34] = trailing;
    $[35] = t20;
  } else t20 = $[35];
  let t21;
  if ($[36] !== draggable || $[37] !== onDoubleClick || $[38] !== onDragStart || $[39] !== t19 || $[40] !== t20 || $[41] !== t3 || $[42] !== t5 || $[43] !== t6 || $[44] !== t7 || $[45] !== t8 || $[46] !== t9) {
    t21 = <div className={t3} style={t5} role={t6} tabIndex={t7} draggable={draggable} onDragStart={onDragStart} onClick={t8} onDoubleClick={onDoubleClick} onKeyDown={t9}>{t19}{t20}</div>;
    $[36] = draggable;
    $[37] = onDoubleClick;
    $[38] = onDragStart;
    $[39] = t19;
    $[40] = t20;
    $[41] = t3;
    $[42] = t5;
    $[43] = t6;
    $[44] = t7;
    $[45] = t8;
    $[46] = t9;
    $[47] = t21;
  } else t21 = $[47];
  return t21;
}
function AssetAddButton(t0) {
  const $ = (0, import_compiler_runtime.c)(4);
  const {
    label,
    onClick
  } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = <PlusIcon />;
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== label || $[2] !== onClick) {
    t2 = <IconBtn label={label} onClick={onClick}>{t1}</IconBtn>;
    $[1] = label;
    $[2] = onClick;
    $[3] = t2;
  } else t2 = $[3];
  return t2;
}
/** Consolidated Assets tab for the feature-flagged left sidebar. */
var AssetsSidebarTabV2 = (0, import_react.forwardRef)(function AssetsSidebarTabV2({
  onAddElement,
  componentIndex = EMPTY_COMPONENT_INDEX,
  components = EMPTY_COMPONENTS,
  iconLibraries = EMPTY_ICON_LIBRARIES,
  allIconLibraries,
  onEditComponent,
  onCreateComponentFile,
  onAddShadcnComponents,
  onImportDesignSystem,
  onOpenIconSettings,
  onAskAIForIconLibrary,
  onPasteCompositionJsx,
  readCompositionFile,
  compositionSourceId = "",
  compositionRefreshKey = 0,
  readOnly = false,
  isElectron = false,
  onEnsureComponentNames
}, ref) {
  const { t } = useTranslation("editor");
  const [expandedSections, setExpandedSections] = (0, import_react.useState)({
    html: false,
    components: true,
    icons: true,
    webview: false
  });
  const [webviewUrl, setWebviewUrl] = (0, import_react.useState)("http://localhost:3000");
  const [expandedHtmlGroups, setExpandedHtmlGroups] = (0, import_react.useState)({});
  const [expandedWebviewGroups, setExpandedWebviewGroups] = (0, import_react.useState)({});
  const [expandedComponentPaths, setExpandedComponentPaths] = (0, import_react.useState)({});
  const [selectedIconLibrary, setSelectedIconLibrary] = (0, import_react.useState)(null);
  const [expandedIconLibraries, setExpandedIconLibraries] = (0, import_react.useState)({});
  const [selectedComponentFile, setSelectedComponentFile] = (0, import_react.useState)(null);
  const [compositionContent, setCompositionContent] = (0, import_react.useState)(null);
  const [compositionLoading, setCompositionLoading] = (0, import_react.useState)(false);
  const compositionReadRef = (0, import_react.useRef)(null);
  const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
  const searchInputRef = (0, import_react.useRef)(null);
  const focusSearch = () => {
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };
  (0, import_react.useImperativeHandle)(ref, () => ({
    openSearch: () => {
      setSelectedComponentFile(null);
      setSelectedIconLibrary(null);
      setExpandedSections(current => ({
        ...current,
        html: true
      }));
      focusSearch();
    }
  }), []);
  const componentTree = (0, import_react.useMemo)(() => buildComponentTree(componentIndex), [componentIndex]);
  const searchTerm = searchQuery.trim().toLowerCase();
  const searching = !!searchTerm;
  const htmlOpen = searching || expandedSections.html;
  const componentsOpen = searching || expandedSections.components;
  const iconsOpen = searching || expandedSections.icons;
  const webviewOpen = searching || expandedSections.webview;
  const webviewHasResults = (0, import_react.useMemo)(() => {
    if (!searchTerm) return true;
    if (["live preview", "webview", "localhost", "embed", "preview"].some(value => value.includes(searchTerm))) return true;
    return WEBVIEW_SIZE_GROUPS.some(group => group.label.toLowerCase().includes(searchTerm) || group.sizes.some(size => webviewSizeSearchText(size).toLowerCase().includes(searchTerm)));
  }, [searchTerm]);
  const htmlHasResults = (0, import_react.useMemo)(() => {
    if (!searchTerm) return true;
    if (`text ${t("panels.text")}`.toLowerCase().includes(searchTerm)) return true;
    return htmlTags.some(tag => `${tag.title} ${t(`htmlTags.${tag.tag}.title`)} ${t(`htmlTags.${tag.tag}.description`)} ${tag.tag}`.toLowerCase().includes(searchTerm)) || HTML_GROUPS.some(group => `${group.label} ${t(`assetsSidebar.groups.${group.id}`)}`.toLowerCase().includes(searchTerm));
  }, [searchTerm, t]);
  const iconLibraryResults = (0, import_react.useMemo)(() => Object.entries(iconLibraries).flatMap(([library, config]) => {
    const names = extractIconNames(config.icons, config.iconNames);
    const matches = searchTerm ? searchIcons(names, searchTerm) : [];
    const libraryMatches = !searchTerm || `${config.displayName ?? ""} ${library}`.toLowerCase().includes(searchTerm);
    if (searchTerm && !libraryMatches && matches.length === 0) return [];
    return [{
      library,
      config,
      names,
      matches,
      libraryMatches
    }];
  }), [iconLibraries, searchTerm]);
  const filteredComponentTree = (0, import_react.useMemo)(() => filterComponentTree(componentTree, searchTerm), [componentTree, searchTerm]);
  const {
    compositionTemplates,
    compositionJsxByExport
  } = (0, import_react.useMemo)(() => {
    if (!compositionContent) return {
      compositionTemplates: [],
      compositionJsxByExport: new Map()
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
  const compositionParseSignature = (0, import_react.useMemo)(() => getCompositionParseSignature(compositionJsxByExport.values(), compositionParseContext), [compositionJsxByExport, compositionParseContext]);
  const compositionRootsByExport = (0, import_react.useMemo)(() => parseCompositionRootsByExport(compositionJsxByExport, compositionParseContext), [compositionJsxByExport, compositionParseSignature]);
  (0, import_react.useEffect)(() => {
    if (selectedComponentFile || selectedIconLibrary) return;
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [selectedComponentFile, selectedIconLibrary]);
  const loadComposition = (0, import_react.useEffectEvent)(async (path, sourceId, refreshKey) => {
    if (!readCompositionFile) return null;
    const key = `${sourceId}:${path}:${refreshKey}`;
    if (compositionReadRef.current?.key !== key) compositionReadRef.current = {
      key,
      promise: readCompositionFile(path)
    };
    return compositionReadRef.current.promise;
  });
  const ensureComponentNames = (0, import_react.useEffectEvent)(names => {
    onEnsureComponentNames?.(names);
  });
  const canReadComposition = !!readCompositionFile;
  (0, import_react.useEffect)(() => {
    if (!selectedComponentFile || !canReadComposition) {
      setCompositionContent(null);
      setCompositionLoading(false);
      return;
    }
    const selectedFile = selectedComponentFile;
    ensureComponentNames(selectedFile.components);
    let cancelled = false;
    setCompositionLoading(true);
    loadComposition(getCompositionPathForBase(selectedFile.path), compositionSourceId, compositionRefreshKey).then(content => {
      if (cancelled) return;
      setCompositionContent(content ?? null);
      if (!content) return;
      const {
        jsxByExport
      } = parseCompositionFile(content);
      ensureComponentNames(collectCompositionPreviewNames(selectedFile.components, jsxByExport.values()));
    }).catch(() => {
      if (!cancelled) setCompositionContent(null);
    }).finally(() => {
      if (!cancelled) setCompositionLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedComponentFile, canReadComposition, compositionSourceId, compositionRefreshKey]);
  const toggleSection = section => {
    setExpandedSections(current => ({
      ...current,
      [section]: !current[section]
    }));
  };
  const createTextElement = () => ({
    id: generatePrefixedId("text"),
    type: "text",
    tag: "span",
    text: t("panels.text"),
    styles: {}
  });
  const createIconElement = (library, iconName) => {
    const config = iconLibraries[library];
    return {
      id: generatePrefixedId("icon"),
      type: "icon",
      library,
      iconName,
      props: {
        ...config?.defaultProps
      },
      styles: {}
    };
  };
  const createComponentElement = componentName => {
    const info = componentIndex[componentName];
    const {
      props,
      hasChildrenProp
    } = buildRequiredComponentProps(info?.props);
    return {
      id: generatePrefixedId("component"),
      type: "component",
      componentName,
      props,
      styles: {},
      children: hasChildrenProp ? [] : void 0
    };
  };
  const addOrDrag = (createElement, event) => {
    if (readOnly) return;
    const element = createElement();
    if (event) setElementDragData(event, element);else onAddElement(element);
  };
  const addWebviewAt = (width, height, event) => {
    const url = webviewUrl.trim();
    if (!url || !isElectron) return;
    addOrDrag(() => createWebviewElement(url, width, height), event);
  };
  const htmlTagSearchText = tag => `${tag.title} ${t(`htmlTags.${tag.tag}.title`)} ${t(`htmlTags.${tag.tag}.description`)} ${tag.tag}`.toLowerCase();
  const renderHtmlTag = (tag, depth) => <TreeRow key={tag.tag} depth={depth} icon={htmlTagIcon()} label={t(`htmlTags.${tag.tag}.title`)} trailing={<Text$4 size="3xs" variant="tertiary" className="font-mono">{tag.tag}</Text$4>} draggable={!readOnly} onDragStart={event => addOrDrag(() => createElementFromTag(tag), event)} onClick={() => addOrDrag(() => createElementFromTag(tag))} />;
  const renderComponentNode = (node, depth = 0) => {
    const expanded = searchTerm ? true : expandedComponentPaths[node.path] ?? false;
    const toggle = () => setExpandedComponentPaths(current => ({
      ...current,
      [node.path]: !expanded
    }));
    if (node.type === "folder") return <div key={node.path} className="relative flex flex-col">{<TreeRow depth={depth} expanded={expanded} onToggle={toggle} icon={kitIcon(FolderIcon, "text-ed-canvas-component")} label={node.name} onClick={toggle} />}{expanded && node.children?.map(child => renderComponentNode(child, depth + 1))}</div>;
    return <div key={node.path} className="relative flex flex-col">{<TreeRow depth={depth} icon={(0, import_jsx_runtime.jsx)(i$4, {
        size: ASSET_ICON_PX,
        weight: "regular",
        className: "text-ed-canvas-component"
      })} label={node.path.split("/").pop()} trailing={<CaretRightIcon className="size-2 text-ed-muted-foreground" />} onClick={() => node.file && setSelectedComponentFile(node.file)} />}</div>;
  };
  if (selectedComponentFile) {
    const primaryComponentName = selectedComponentFile.components[0];
    return <div className="flex h-full min-h-0 flex-col overflow-hidden">{<div className="flex shrink-0 items-center gap-1 px-3 py-2">{<IconBtn label={t("assetsSidebar.backToComponents")} onClick={() => setSelectedComponentFile(null)}>{<CaretLeftIcon width={16} height={16} />}</IconBtn>}{<Text$4 size="3xs" variant="primary" className="min-w-0 flex-1 truncate text-left leading-6 text-ed-inspector-value">{selectedComponentFile.path.split("/").pop()}</Text$4>}{onEditComponent && primaryComponentName && <IconBtn label={t("propsPanel.openComponentFile")} onClick={() => onEditComponent(primaryComponentName, selectedComponentFile.path)}>{<FileCodeIcon width={ASSET_ICON_PX} height={ASSET_ICON_PX} className="text-ed-canvas-component" />}</IconBtn>}</div>}{<ScrollArea horizontal={true} className="min-h-0 flex-1" viewportClassName="overscroll-x-contain px-3 py-1">{compositionLoading && <Text$4 size="3xs" variant="secondary" className="px-2 py-1">{t("assetsSidebar.loadingCompositions")}</Text$4>}{!compositionLoading && compositionTemplates.length > 0 && <div className="mb-1 flex w-full flex-col">{<Text$4 size="3xs" variant="secondary" className="px-2 py-1">{t("assetsSidebar.compositions")}</Text$4>}{compositionTemplates.map(template => {
            const jsx = compositionJsxByExport.get(template.exportName);
            const canInsert = !!jsx && !!onPasteCompositionJsx && !readOnly;
            return <button key={template.exportName} type="button" draggable={canInsert} onDragStart={event => canInsert && jsx && setCompositionDragData(event, jsx, compositionRootsByExport.get(template.exportName))} onClick={() => canInsert && jsx && onPasteCompositionJsx?.(jsx, compositionRootsByExport.get(template.exportName))} className={cn$2("flex w-full min-w-0 flex-col gap-1 px-1 py-1.5 text-left", canInsert && "cursor-grab active:cursor-grabbing")}>{<div className={cn$2("w-full shrink-0 overflow-hidden rounded border border-ed-border", canInsert && "hover:border-ed-ring")} style={{
                height: 70,
                padding: COMPOSITION_FRAME_PADDING,
                backgroundColor: "var(--background, #fff)"
              }}>{<CompositionPreview jsx={jsx ?? null} components={components} parseContext={compositionParseContext} frameHeight={62} />}</div>}{<Text$4 size="3xs" variant="primary" className="truncate select-none">{template.name}</Text$4>}</button>;
          })}</div>}{<div className="flex min-w-full w-max flex-col">{<Text$4 size="3xs" variant="secondary" className="px-2 py-1">{t("assetsPanel.components")}</Text$4>}{selectedComponentFile.components.map(componentName => <TreeRow key={componentName} depth={0} icon={(0, import_jsx_runtime.jsx)(i$4, {
            size: ASSET_ICON_PX,
            weight: "regular",
            className: "text-ed-canvas-component"
          })} label={componentDisplayName(componentName)} draggable={!readOnly} onDragStart={event => addOrDrag(() => createComponentElement(componentName), event)} onClick={() => addOrDrag(() => createComponentElement(componentName))} onDoubleClick={() => onEditComponent?.(componentName, selectedComponentFile.path)} />)}</div>}</ScrollArea>}</div>;
  }
  if (selectedIconLibrary && iconLibraries[selectedIconLibrary]) return <div className="flex h-full min-h-0 flex-col overflow-hidden">{<div className="flex shrink-0 items-center gap-1 px-3 py-2">{<IconBtn label={t("assetsSidebar.backToAssets")} onClick={() => setSelectedIconLibrary(null)}>{<CaretLeftIcon width={16} height={16} />}</IconBtn>}{<Text$4 size="3xs" variant="primary" className="min-w-0 flex-1 truncate text-left leading-6 text-ed-inspector-value">{iconLibraries[selectedIconLibrary].displayName || selectedIconLibrary}</Text$4>}</div>}{<IconsPanel iconLibraries={{
      [selectedIconLibrary]: iconLibraries[selectedIconLibrary]
    }} onAskAI={onAskAIForIconLibrary} onAddElement={onAddElement} readOnly={readOnly} variant="sidebar-v2" searchValue={searchQuery} />}</div>;
  const divTag = htmlTags.find(tag => tag.tag === "div");
  const livePreviewUrlField = <InputGroup size="xs">{<InputGroupAddon align="inline-start">{<GlobeIcon width={16} height={16} className="size-4 text-ed-foreground-secondary" />}</InputGroupAddon>}{<InputGroupInput value={webviewUrl} onChange={event => setWebviewUrl(event.target.value)} onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.key !== "Enter") return;
      addWebviewAt(DEFAULT_WEBVIEW_SIZE.width, DEFAULT_WEBVIEW_SIZE.height);
    }} placeholder="http://localhost:3000" aria-label={t("assetsSidebar.previewUrl")} disabled={!isElectron || readOnly} />}</InputGroup>;
  return <div className="flex h-full min-h-0 flex-col">{<div className="flex shrink-0 flex-row items-center justify-start gap-2 p-3">{<InputGroup size="xs" className="flex-1 shadow-none focus-within:ring-0!">{<InputGroupAddon align="inline-start">{<SearchIcon width={16} height={16} className="size-4 text-ed-foreground-secondary" />}</InputGroupAddon>}{<InputGroupInput ref={searchInputRef} value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onKeyDown={event => {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.key === "Escape") setSearchQuery("");
        }} placeholder={t("assetsSidebar.find")} aria-label={t("assetsSidebar.findAssets")} />}</InputGroup>}{searchTerm && <Button type="button" size="icon-xs" variant="ghost" isChildText={false} className="shrink-0 text-ed-foreground-secondary hover:text-ed-foreground" onClick={() => setSearchQuery("")} aria-label={t("assetsSidebar.clearSearch")} title={t("panels.clearSearch")}>{<XIcon width={16} height={16} />}</Button>}</div>}{<ScrollArea horizontal={true} className="min-h-0 flex-1" viewportClassName="overscroll-x-contain">{<section className="flex flex-col">{<SidebarSectionHeader title={t("assetsSidebar.html")} expanded={htmlOpen} onToggle={() => toggleSection("html")} />}{htmlOpen && <div className="relative min-w-full w-max flex flex-col px-3 pt-1 pb-2">{searching && !htmlHasResults && <Text$4 size="3xs" variant="tertiary" className="px-1.5 py-1">{t("assetsSidebar.noResults")}</Text$4>}{divTag && (!searchTerm || htmlTagSearchText(divTag).includes(searchTerm)) && renderHtmlTag(divTag, 0)}{(!searchTerm || `text ${t("panels.text")}`.toLowerCase().includes(searchTerm)) && <TreeRow depth={0} icon={htmlTextIcon()} label={t("panels.text")} trailing={<Text$4 size="3xs" variant="tertiary" className="font-mono">text</Text$4>} draggable={!readOnly} onDragStart={event => addOrDrag(createTextElement, event)} onClick={() => addOrDrag(createTextElement)} />}{HTML_GROUPS.map(group => {
            const tags = htmlTags.filter(tag => tag.tag !== "div" && group.categories.includes(tag.category));
            const visibleTags = searchTerm ? tags.filter(tag => htmlTagSearchText(tag).includes(searchTerm)) : tags;
            const localizedGroupLabel = t(`assetsSidebar.groups.${group.id}`);
            const groupMatches = `${group.label} ${localizedGroupLabel}`.toLowerCase().includes(searchTerm);
            if (searchTerm && !groupMatches && visibleTags.length === 0) return null;
            const expanded = searchTerm ? true : expandedHtmlGroups[group.id] ?? false;
            const toggle = () => setExpandedHtmlGroups(current => ({
              ...current,
              [group.id]: !expanded
            }));
            return <div key={group.id} className="relative flex flex-col">{<TreeRow depth={0} expanded={expanded} onToggle={toggle} icon={kitIcon(FolderIcon, "text-ed-muted-foreground")} label={localizedGroupLabel} trailing={<Text$4 size="3xs" variant="tertiary">{tags.length}</Text$4>} onClick={toggle} />}{expanded && (groupMatches ? tags : visibleTags).map(tag => renderHtmlTag(tag, 1))}</div>;
          })}</div>}</section>}{<section className="flex flex-col border-t border-ed-border">{<SidebarSectionHeader title={t("assetsPanel.components")} expanded={componentsOpen} onToggle={() => toggleSection("components")} actions={!readOnly && (onCreateComponentFile || onAddShadcnComponents || onImportDesignSystem) ? <DropdownMenu>{<DropdownMenuTrigger asChild={true}>{<IconBtn label={t("assetsSidebar.addComponent")}>{<PlusIcon />}</IconBtn>}</DropdownMenuTrigger>}{<DropdownMenuContent align="end" sideOffset={4}>{onCreateComponentFile && <DropdownMenuItem onSelect={onCreateComponentFile}>{<FilePlusIcon width={16} height={16} className="text-ed-muted-foreground" />}{t("assetsSidebar.newComponent")}</DropdownMenuItem>}{onAddShadcnComponents && componentTree.length === 0 && <DropdownMenuItem onSelect={onAddShadcnComponents}>{<PackageIcon width={16} height={16} className="text-ed-muted-foreground" />}{t("assetsSidebar.addShadcn")}</DropdownMenuItem>}{onImportDesignSystem && <DropdownMenuItem onSelect={onImportDesignSystem}>{<PaletteIcon width={16} height={16} className="text-ed-muted-foreground" />}{t("assetsSidebar.importDesignSystem")}</DropdownMenuItem>}</DropdownMenuContent>}</DropdownMenu> : void 0} />}{componentsOpen && <div className="relative min-w-full w-max flex flex-col px-3 pt-1 pb-2">{filteredComponentTree.length > 0 ? filteredComponentTree.map(node => renderComponentNode(node)) : searching ? <Text$4 size="3xs" variant="tertiary" className="px-1.5 py-1">{t("assetsSidebar.noResults")}</Text$4> : (onAddShadcnComponents || onImportDesignSystem) && !readOnly ? <>{onAddShadcnComponents && <TreeRow depth={0} icon={<PackageIcon width={ASSET_ICON_PX} height={ASSET_ICON_PX} className="text-ed-muted-foreground" />} label={t("assetsSidebar.addShadcn")} onClick={onAddShadcnComponents} />}{onImportDesignSystem && <TreeRow depth={0} icon={<PaletteIcon width={ASSET_ICON_PX} height={ASSET_ICON_PX} className="text-ed-muted-foreground" />} label={t("assetsSidebar.importDesignSystem")} onClick={onImportDesignSystem} />}</> : <Text$4 size="3xs" variant="tertiary" className="px-1.5 py-1">{t("assetsSidebar.noComponents")}</Text$4>}</div>}</section>}{<section className="flex flex-col border-t border-ed-border">{<SidebarSectionHeader title={t("assetsSidebar.icons")} expanded={iconsOpen} onToggle={() => toggleSection("icons")} actions={!readOnly && onOpenIconSettings ? <AssetAddButton label={t("assetsSidebar.addIcons")} onClick={onOpenIconSettings} /> : void 0} />}{iconsOpen && <div className="relative min-w-full w-max flex flex-col px-3 pt-1 pb-2">{iconLibraryResults.map(({
            library,
            config,
            names,
            matches
          }) => {
            const libraryOpen = searching ? expandedIconLibraries[library] ?? true : false;
            const preview = searching && libraryOpen ? matches.slice(0, ICON_SEARCH_PREVIEW) : [];
            const remaining = searching && libraryOpen ? Math.max(0, matches.length - preview.length) : 0;
            const count = searching ? matches.length : names.length;
            const toggleLibrary = () => setExpandedIconLibraries(current => ({
              ...current,
              [library]: !(current[library] ?? true)
            }));
            const openLibrary = () => setSelectedIconLibrary(library);
            return <div key={library} className="relative flex flex-col">{<TreeRow depth={0} expanded={searching ? libraryOpen : void 0} onToggle={searching ? toggleLibrary : void 0} icon={<SparkleIcon width={ASSET_ICON_PX} height={ASSET_ICON_PX} className="text-ed-canvas-component" />} label={config.displayName || library} trailing={<>{<Text$4 size="3xs" variant="tertiary">{count.toLocaleString()}</Text$4>}{<CaretRightIcon className="size-2 text-ed-muted-foreground" />}</>} onTrailingClick={searching ? openLibrary : void 0} onClick={searching ? toggleLibrary : openLibrary} />}{preview.map(iconName => {
                const Icon = config.icons?.[iconName];
                return <TreeRow key={`${library}-${iconName}`} depth={1} icon={Icon ? <Icon width={ASSET_ICON_PX} height={ASSET_ICON_PX} className="text-ed-canvas-component" /> : <SparkleIcon width={ASSET_ICON_PX} height={ASSET_ICON_PX} className="text-ed-canvas-component" />} label={iconName} draggable={!readOnly} onDragStart={event => addOrDrag(() => createIconElement(library, iconName), event)} onClick={() => addOrDrag(() => createIconElement(library, iconName))} />;
              })}{remaining > 0 && <TreeRow depth={1} icon={<SparkleIcon width={ASSET_ICON_PX} height={ASSET_ICON_PX} className="text-ed-canvas-component" />} label={t("assetsSidebar.more", { count: remaining })} trailing={<CaretRightIcon className="size-2 text-ed-muted-foreground" />} onClick={() => setSelectedIconLibrary(library)} />}</div>;
          })}{searching && iconLibraryResults.length === 0 && Object.keys(iconLibraries).length > 0 && <Text$4 size="3xs" variant="tertiary" className="px-1.5 py-1">{t("assetsSidebar.noResults")}</Text$4>}{!searching && Object.keys(iconLibraries).length === 0 && <TreeRow depth={0} icon={<SparkleIcon width={ASSET_ICON_PX} height={ASSET_ICON_PX} className="text-ed-muted-foreground" />} label={t("assetsSidebar.setupIcons")} onClick={() => (onOpenIconSettings ?? onAskAIForIconLibrary)?.()} />}</div>}</section>}{(!searching || webviewHasResults) && <section className="flex flex-col border-t border-ed-border">{<SidebarSectionHeader title={t("panels.livePreview")} expanded={webviewOpen} onToggle={() => toggleSection("webview")} />}{webviewOpen && <div className={cn$2("flex flex-col px-3 pt-1 pb-2", !isElectron && "opacity-50")}>{isElectron ? <div className="mb-1">{livePreviewUrlField}</div> : <Tooltip>{<TooltipTrigger asChild={true}>{<div className="mb-1">{livePreviewUrlField}</div>}</TooltipTrigger>}{<TooltipContent side="right">{t("assetsSidebar.desktopOnly")}</TooltipContent>}</Tooltip>}{<div className="relative min-w-full w-max flex flex-col">{WEBVIEW_SIZE_GROUPS.map(group => {
              const visibleSizes = searchTerm ? group.sizes.filter(size => webviewSizeSearchText(size).toLowerCase().includes(searchTerm)) : group.sizes;
              const localizedGroupLabel = t(`assetsSidebar.groups.${group.id}`);
              const groupMatches = `${group.label} ${localizedGroupLabel}`.toLowerCase().includes(searchTerm);
              if (searchTerm && !groupMatches && visibleSizes.length === 0) return null;
              const expanded = searchTerm ? true : expandedWebviewGroups[group.id] ?? true;
              const toggle = () => setExpandedWebviewGroups(current => ({
                ...current,
                [group.id]: !expanded
              }));
              const sizes = groupMatches && searchTerm ? group.sizes : visibleSizes;
              const GroupIcon = group.Icon;
              return <div key={group.id} className="relative flex flex-col">{<TreeRow depth={0} expanded={expanded} onToggle={toggle} icon={kitIcon(FolderIcon, "text-ed-muted-foreground")} label={localizedGroupLabel} trailing={<Text$4 size="3xs" variant="tertiary">{group.sizes.length}</Text$4>} onClick={toggle} />}{expanded && sizes.map(size => <TreeRow key={size.name} depth={1} icon={kitIcon(GroupIcon, "text-ed-muted-foreground")} label={size.name} trailing={<Text$4 size="3xs" variant="tertiary" className="font-mono">{size.width} × {size.height}</Text$4>} draggable={isElectron && !readOnly} onDragStart={isElectron ? event => addWebviewAt(size.width, size.height, event) : void 0} onClick={isElectron ? () => addWebviewAt(size.width, size.height) : void 0} />)}</div>;
            })}</div>}</div>}</section>}</ScrollArea>}</div>;
});

export { AssetsSidebarTabV2 };
