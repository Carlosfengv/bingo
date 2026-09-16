import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "@bingo/i18n";
import { Button, InputGroup, InputGroupAddon, InputGroupInput, SearchIcon, Text$4, XIcon } from "@bingo/ui";
import { LayersPanel } from "./LayersPanel";
import { PagesLayersSplit } from "./PagesLayersSplit";
import { PagesPanel } from "./PagesPanel";

/** Pages-tab composition for the v2 left sidebar. */
const PagesSidebarTabV2 = forwardRef(function PagesSidebarTabV2({ pageProps, layerProps }, ref) {
  const { t } = useTranslation("editor");
  const localSearchInputRef = useRef(null);
  const [pagesExpanded, setPagesExpanded] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = layerProps.searchInputRef ?? localSearchInputRef;

  useImperativeHandle(ref, () => ({
    openSearch: () => {
      setSearchMode(true);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }), [searchInputRef]);

  useEffect(() => {
    if (!searchMode) return;
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [searchMode, searchInputRef]);

  const closeSearch = () => {
    setSearchQuery("");
    setSearchMode(false);
  };

  if (searchMode) {
    return <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-row items-center justify-start gap-2 p-3">
        <InputGroup size="xs" className="flex-1 shadow-none focus-within:ring-0!">
          <InputGroupAddon align="inline-start"><SearchIcon width={16} height={16} className="size-4 text-ed-foreground-secondary" /></InputGroupAddon>
          <InputGroupInput
            ref={searchInputRef}
            aria-label={t("pages.findLayers")}
            placeholder={t("pages.findPlaceholder")}
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            onKeyDown={event => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
              if (event.key === "Escape") closeSearch();
            }}
          />
        </InputGroup>
        <Button type="button" size="icon-xs" variant="ghost" isChildText={false} className="shrink-0 text-ed-foreground-secondary hover:text-ed-foreground" onClick={closeSearch} aria-label={t("pages.closeSearch")} title={t("pages.closeSearch")}><XIcon /></Button>
      </div>
      {searchQuery.trim()
        ? <div className="min-h-0 flex-1"><LayersPanel {...layerProps} headerVariant="hidden" searchValue={searchQuery} onSearchValueChange={setSearchQuery} /></div>
        : <div className="flex min-h-0 flex-1 items-center justify-center px-4"><Text$4 size="3xs" variant="secondary">{t("pages.searchLayers")}</Text$4></div>}
    </div>;
  }

  const pages = <PagesPanel {...pageProps} variant="sidebar-v2" expanded={pagesExpanded} onExpandedChange={setPagesExpanded} onSearchClick={() => setSearchMode(true)} />;
  const layers = <LayersPanel {...layerProps} headerVariant="sidebar-v2" />;
  return <PagesLayersSplit pageCount={pageProps.pages.length} expanded={pagesExpanded} onExpandedChange={setPagesExpanded} pages={pages} layers={layers} />;
});

export { PagesSidebarTabV2 };
