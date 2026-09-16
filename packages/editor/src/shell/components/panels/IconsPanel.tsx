/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/IconsPanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { generatePrefixedId } from "../../../shared/utils/idUtils";
import { useTranslation } from "@bingo/i18n";
import { extractIconNames, searchIcons } from "../../utils/iconUtils";
import { PanelEmptyState } from "./PanelEmptyState";
import { PanelSearchInput } from "./PanelSearchInput";
import { Button, InputGroup, InputGroupAddon, InputGroupInput, PackageIcon, ScrollArea, SearchIcon, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SettingsIcon, Text$4, XIcon, cn$2 } from "@bingo/ui";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as import_react from "react";

var GRID_COLUMNS = 4;
var ICON_CELL_SIZE = 88;
function IconsPanel({
  iconLibraries,
  onOpenIconSettings,
  onAskAI,
  onAddElement,
  readOnly = false,
  variant = "default",
  searchValue
}) {
  "use no memo";

  const { t } = useTranslation("editor");
  const [searchQuery, setSearchQuery] = (0, import_react.useState)(searchValue ?? "");
  const [selectedLibrary, setSelectedLibrary] = (0, import_react.useState)(() => Object.keys(iconLibraries)[0] || "");
  const parentRef = (0, import_react.useRef)(null);
  const searchInputRef = (0, import_react.useRef)(null);
  const sidebarV2 = variant === "sidebar-v2";
  const iconCellSize = sidebarV2 ? 76 : ICON_CELL_SIZE;
  (0, import_react.useEffect)(() => {
    if (searchValue !== void 0) setSearchQuery(searchValue);
  }, [searchValue]);
  (0, import_react.useEffect)(() => {
    if (!sidebarV2) return;
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [sidebarV2]);
  (0, import_react.useEffect)(() => {
    const activeKeys = Object.keys(iconLibraries);
    if (activeKeys.length > 0 && !iconLibraries[selectedLibrary]) setSelectedLibrary(activeKeys[0]);
  }, [iconLibraries, selectedLibrary]);
  const libraryConfig = iconLibraries[selectedLibrary];
  const filteredIcons = searchIcons(libraryConfig ? extractIconNames(libraryConfig.icons, libraryConfig.iconNames) : [], searchQuery);
  const virtualizer = useVirtualizer({
    count: Math.ceil(filteredIcons.length / GRID_COLUMNS),
    getScrollElement: () => parentRef.current,
    estimateSize: () => iconCellSize,
    overscan: 5
  });
  const createIconElement = iconName => ({
    id: generatePrefixedId("icon"),
    type: "icon",
    library: selectedLibrary,
    iconName,
    props: {
      ...libraryConfig?.defaultProps
    },
    styles: {}
  });
  const handleIconClick = iconName_0 => {
    onAddElement(createIconElement(iconName_0));
  };
  if (!(Object.keys(iconLibraries).length > 0)) return <ScrollArea className="flex-1">{<PanelEmptyState icon={<PackageIcon width={24} height={24} className="text-ed-muted-foreground" />} title={t("panels.setupIconLibrary")} description={t("panels.setupIconLibraryDescription")} actions={!readOnly && (onOpenIconSettings || onAskAI) ? <>{onOpenIconSettings && <Button variant="outline" size="xs" onClick={onOpenIconSettings} className="w-full">{t("panels.setupIcons")}</Button>}{onAskAI && <Button variant="secondary" size="xs" onClick={onAskAI} className="w-full">{t("panels.askAssistant")}</Button>}</> : void 0} />}</ScrollArea>;
  const hasSettings = !!onOpenIconSettings;
  return <div className={cn$2("w-full flex flex-col flex-1 overflow-hidden", sidebarV2 ? "pt-0" : "pt-1")}>{readOnly && <div className="px-4 py-2 bg-ed-muted/50 border-b border-ed-border">{<Text$4 size="xs" variant="tertiary">{t("panels.viewOnlyIcons")}</Text$4>}</div>}{sidebarV2 ? <div className={cn$2("flex shrink-0 items-center gap-2 p-3", readOnly && "pointer-events-none opacity-50")}>{<InputGroup size="xs" className="flex-1 shadow-none focus-within:ring-0!">{<InputGroupAddon align="inline-start">{<SearchIcon width={16} height={16} className="size-4 text-ed-foreground-secondary" />}</InputGroupAddon>}{<InputGroupInput ref={searchInputRef} value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onKeyDown={event_0 => {
          if (event_0.nativeEvent.isComposing || event_0.keyCode === 229) return;
          if (event_0.key === "Escape") setSearchQuery("");
        }} placeholder={t("panels.find")} aria-label={t("panels.findIcons")} />}</InputGroup>}{searchQuery.trim() && <Button type="button" size="icon-xs" variant="ghost" isChildText={false} className="shrink-0 text-ed-foreground-secondary hover:text-ed-foreground" onClick={() => setSearchQuery("")} aria-label={t("panels.clearIconSearch")} title={t("panels.clearSearch")}>{<XIcon />}</Button>}</div> : <div className={`px-3 pb-2 border-b border-ed-border space-y-2 ${readOnly ? "opacity-50 pointer-events-none" : ""}`}>{<div className="flex items-center gap-2">{Object.keys(iconLibraries).length > 1 ? <Select value={selectedLibrary} onValueChange={setSelectedLibrary}>{<SelectTrigger className="flex-1">{<SelectValue placeholder={t("panels.selectLibrary")} />}</SelectTrigger>}{<SelectContent>{Object.entries(iconLibraries).map(([key, config]) => <SelectItem key={key} value={key}>{config.displayName || key}</SelectItem>)}</SelectContent>}</Select> : <Text$4 size="xs" variant="secondary" className="flex-1">{iconLibraries[Object.keys(iconLibraries)[0]]?.displayName || Object.keys(iconLibraries)[0]}</Text$4>}{hasSettings && <Button variant="ghost" size="icon-sm" title={t("panels.openIconSettings")} onClick={onOpenIconSettings} isChildText={false}>{<SettingsIcon width={16} height={16} />}</Button>}</div>}{<PanelSearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t("panels.searchIcons")} />}{<Text$4 size="xs" variant="tertiary">{t("panels.iconCount", { count: filteredIcons.length })}</Text$4>}</div>}{<ScrollArea viewportRef={parentRef} className={cn$2("flex-1", sidebarV2 && "pt-1", readOnly && "pointer-events-none opacity-50")}>{filteredIcons.length === 0 ? <div className="p-4 text-center">{<Text$4 size={sidebarV2 ? "3xs" : "sm"} variant="tertiary">{searchQuery ? t("panels.noIconsFound") : t("panels.noIconsAvailable")}</Text$4>}</div> : <div style={{
        height: virtualizer.getTotalSize(),
        width: "100%",
        position: "relative"
      }}>{virtualizer.getVirtualItems().map(virtualRow => {
          const startIndex = virtualRow.index * GRID_COLUMNS;
          const rowIcons = filteredIcons.slice(startIndex, startIndex + GRID_COLUMNS);
          return <div key={virtualRow.key} style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: iconCellSize,
            transform: `translateY(${virtualRow.start}px)`,
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
            gap: sidebarV2 ? 4 : void 0,
            paddingLeft: sidebarV2 ? 12 : void 0,
            paddingRight: sidebarV2 ? 12 : void 0
          }}>{rowIcons.map(iconName_1 => {
              const IconComponent = libraryConfig?.icons?.[iconName_1];
              if (!IconComponent) return null;
              return <Button key={iconName_1} variant="ghost" size="text" onClick={() => handleIconClick(iconName_1)} className={cn$2("flex w-full min-w-0 flex-col items-center justify-start overflow-hidden rounded", sidebarV2 ? "h-[72px] gap-1.5 p-2 text-[11px] font-normal text-ed-foreground-secondary hover:bg-ed-accent hover:text-ed-foreground" : "h-full p-2 hover:bg-ed-accent")} title={iconName_1} isChildText={false}>{<div className={cn$2("flex w-full items-center justify-center overflow-hidden", sidebarV2 ? "h-6" : "h-9")}>{<IconComponent size={24} width={24} height={24} className="max-h-6 max-w-6 shrink-0" {...libraryConfig?.defaultProps} />}</div>}{sidebarV2 ? <span className="w-full max-w-full truncate text-center">{iconName_1}</span> : <Text$4 size="3xs" weight="regular" variant="tertiary" className="mt-1 w-full max-w-full truncate text-center">{iconName_1}</Text$4>}</Button>;
            })}</div>;
        })}</div>}</ScrollArea>}</div>;
}

export { IconsPanel };
