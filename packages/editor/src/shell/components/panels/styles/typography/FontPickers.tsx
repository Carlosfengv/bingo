/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/typography/FontPickers.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { __vitePreload as __bingo_vitePreload } from "../../../../../../../../src/renderer/vite-preload-helper";
import { ensureFontPreviews, ensureFontsLoaded } from "../../../../utils/fontLoader";
import { formatFontWeight, getFontDisplayName, getFontWeightMenuValues, getLocalFontWeights, parseFontWeight } from "../../../../utils/typography";
import { InspectorDropdown } from "../inputs/parts/InspectorDropdown";
import { IconBtn, InspectorControlAction, InspectorControlInput, InspectorControlShell } from "../primitives";
import { CaretDownIcon, CheckIcon, FontIcon, FontWeightIcon, Popover, PopoverContent, PopoverTrigger, ScrollArea, SearchIcon, Tabs, TabsContent, TabsList, TabsTrigger, XIcon, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import { translateInspectorText } from "../inspectorCopy";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as import_react from "react";

/**
* Font family + weight pickers for the Typography section.
*
* FontFamilyPicker — popover with a Custom tab (search + Recent + curated web
* fonts applied as an inline font-family) and a Libraries tab (searchable
* Tailwind font utility classes — font-sans/serif/mono plus a font-<name> per
* configured project font — applied as a className). FontWeightPicker — popover
* listing the weights a family offers (passed in by the caller), at weight.
*/
var HEADER_H = 22;
var FONT_H = 28;
var LIST_H = 320;
function FontWeightPicker({
  family,
  value,
  fontStyle,
  fonts,
  isMixed,
  onChange
}) {
  const currentWeight = isMixed ? void 0 : parseFontWeight(value);
  const localWeights = getLocalFontWeights(family, fontStyle || "normal", fonts);
  const [catalogResult, setCatalogResult] = (0, import_react.useState)();
  const loadGoogleWeights = open => {
    if (!open || localWeights !== void 0 || catalogResult?.family === family) return;
    const requestedFamily = family;
    __bingo_vitePreload(async () => {
      const {
        GOOGLE_FONTS
      } = await import("@bingo/compiler");
      return {
        GOOGLE_FONTS
      };
    }, [], import.meta.url).then(({
      GOOGLE_FONTS
    }) => {
      const match = GOOGLE_FONTS.find(font => font.family.toLowerCase() === requestedFamily.toLowerCase());
      setCatalogResult({
        family: requestedFamily,
        weights: match?.weights
      });
    }).catch(() => setCatalogResult({
      family: requestedFamily
    }));
  };
  const availableWeights = localWeights ?? (catalogResult?.family === family ? catalogResult.weights : void 0);
  const menuWeights = getFontWeightMenuValues(availableWeights, currentWeight);
  const availableSet = availableWeights === void 0 ? void 0 : new Set(availableWeights);
  return <InspectorDropdown label="Font weight" value={<span className="flex min-w-0 items-center gap-1.5">{<FontWeightIcon className="shrink-0 text-ed-inspector-chrome" />}{<span className="min-w-0 truncate">{isMixed ? "-" : formatFontWeight(currentWeight ?? 400)}</span>}</span>} className="w-full" onOpenChange={loadGoogleWeights} selectedValue={String(currentWeight ?? 400)} isMixed={isMixed} options={menuWeights.map(weight => {
    const isAvailable = availableSet === void 0 || availableSet.has(weight) || weight === currentWeight;
    return {
      value: String(weight),
      label: formatFontWeight(weight),
      disabled: !isAvailable
    };
  })} onValueChange={onChange} />;
}
function FontFamilyPicker({
  value,
  onChange,
  onSelectClass,
  activeClass,
  fonts,
  inheritedFamily,
  isMixed
}) {
  "use no memo";

  const { t } = useTranslation("editor");
  const [open, setOpen] = (0, import_react.useState)(false);
  const triggerRef = (0, import_react.useRef)(null);
  const [search, setSearch] = (0, import_react.useState)("");
  const [libSearch, setLibSearch] = (0, import_react.useState)("");
  const [recent, setRecent] = (0, import_react.useState)(() => {
    try {
      return JSON.parse(localStorage.getItem("bingo-recent-fonts") ?? "[]");
    } catch {
      return [];
    }
  });
  const [catalog, setCatalog] = (0, import_react.useState)([]);
  const [catalogStatus, setCatalogStatus] = (0, import_react.useState)("idle");
  const displayName = isMixed ? "-" : getFontDisplayName(value, fonts);
  (0, import_react.useEffect)(() => {
    if (!open || catalogStatus === "loading" || catalogStatus === "ready") return;
    setCatalogStatus("loading");
    __bingo_vitePreload(() => import("@bingo/compiler").then(m => {
      setCatalog(m.GOOGLE_FONTS);
      setCatalogStatus("ready");
    }), [], import.meta.url).catch(() => setCatalogStatus("error"));
  }, [open, catalogStatus]);
  const addToRecent = name => {
    const next = [name, ...recent.filter(n => n !== name)].slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem("bingo-recent-fonts", JSON.stringify(next));
    } catch {}
  };
  const handleSelectFont = fontName => {
    addToRecent(fontName);
    ensureFontsLoaded([fontName]);
    onChange(`"${fontName}"`);
    setOpen(false);
    setSearch("");
  };
  const handleSelectClass = (cls, previewName) => {
    if (previewName) ensureFontsLoaded([previewName]);
    onSelectClass?.(cls);
    setOpen(false);
  };
  const rows = (0, import_react.useMemo)(() => {
    const q = search.trim().toLowerCase();
    const matches = q ? catalog.filter(f => f.family.toLowerCase().includes(q)) : catalog;
    const out = [];
    if (!q && recent.length > 0) {
      out.push({
        kind: "header",
        label: "Recent"
      });
      for (const name_0 of recent) out.push({
        kind: "font",
        name: name_0
      });
    }
    out.push({
      kind: "header",
      label: "All Fonts"
    });
    for (const f_0 of matches) out.push({
      kind: "font",
      name: f_0.family
    });
    return out;
  }, [catalog, recent, search]);
  const scrollRef = (0, import_react.useRef)(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: i => rows[i].kind === "header" ? HEADER_H : FONT_H,
    overscan: 8
  });
  (0, import_react.useEffect)(() => {
    if (!open || catalogStatus !== "ready") return;
    const raf = requestAnimationFrame(() => rowVirtualizer.measure());
    return () => cancelAnimationFrame(raf);
  }, [open, catalogStatus, rowVirtualizer]);
  const virtualItems = rowVirtualizer.getVirtualItems();
  (0, import_react.useEffect)(() => {
    const names = [];
    for (const vi of virtualItems) {
      const row = rows[vi.index];
      if (row?.kind === "font") names.push(row.name);
    }
    if (names.length) ensureFontPreviews(names);
  }, [virtualItems, rows]);
  const libraryFonts = fonts ? [...fonts.google.filter(f_1 => f_1.variable).map(f_2 => ({
    name: f_2.name.replace(/_/g, " "),
    variable: f_2.variable
  })), ...fonts.local.map(f_3 => ({
    name: f_3.name,
    variable: f_3.variable
  }))] : [];
  const fontClasses = (() => {
    const base = [{
      cls: "font-sans",
      label: "Sans",
      preview: "ui-sans-serif, system-ui, sans-serif"
    }, {
      cls: "font-serif",
      label: "Serif",
      preview: "ui-serif, Georgia, serif"
    }, {
      cls: "font-mono",
      label: "Mono",
      preview: "ui-monospace, monospace"
    }];
    const project = libraryFonts.map(({
      name: name_1,
      variable
    }) => ({
      cls: variable.replace(/^--/, ""),
      label: name_1,
      preview: `${name_1}, system-ui, sans-serif`
    }));
    const seen = new Set();
    return [...base, ...project].filter(c => seen.has(c.cls) ? false : (seen.add(c.cls), true));
  })();
  const filteredClasses = libSearch ? fontClasses.filter(c_0 => c_0.cls.toLowerCase().includes(libSearch.toLowerCase()) || c_0.label.toLowerCase().includes(libSearch.toLowerCase())) : fontClasses;
  return <Popover open={open} onOpenChange={o => {
    setOpen(o);
    if (!o) {
      setSearch("");
      setLibSearch("");
    }
  }}>{<InspectorControlShell active={open}>{<PopoverTrigger asChild={true}>{<InspectorControlAction ref={triggerRef} title="Font family" className="min-w-0 flex-1 justify-between gap-1 px-1 font-normal text-ed-inspector-value">{<FontIcon className="shrink-0 text-ed-inspector-chrome" />}{<span className={cn$2("min-w-0 flex-1 truncate text-left", !displayName && "text-ed-muted-foreground/50 font-normal")}>{displayName || inheritedFamily || "Inter"}</span>}{<CaretDownIcon className="shrink-0 text-ed-inspector-chrome" />}</InspectorControlAction>}</PopoverTrigger>}</InspectorControlShell>}{<PopoverContent align="center" side="left" sideOffset={20} className="w-60 p-1 overflow-hidden flex flex-col" style={{
      maxHeight: 460
    }} onOpenAutoFocus={e => e.preventDefault()} onCloseAutoFocus={e_0 => {
      e_0.preventDefault();
      triggerRef.current?.blur();
    }}>{<Tabs defaultValue="custom" className="flex flex-col gap-1.5 min-h-0" style={{
        flex: 1
      }}>{<div className="flex items-center gap-1">{<TabsList size="xs" className="w-min">{<TabsTrigger value="custom" className="w-max">{t("styles.custom")}</TabsTrigger>}{<TabsTrigger value="libraries" className="w-max">{t("styles.libraries")}</TabsTrigger>}</TabsList>}{<div className="flex items-center gap-0.5 ml-auto">{<IconBtn label="Close font picker" onClick={() => setOpen(false)}>{<XIcon />}</IconBtn>}</div>}</div>}{<TabsContent value="custom" className="flex flex-col gap-3 m-0 min-h-0" style={{
          flex: 1
        }}>{<InspectorControlShell>{<span className="flex shrink-0 items-center pl-1 text-ed-foreground-secondary">{<SearchIcon className="text-ed-foreground-secondary" />}</span>}{<InspectorControlInput placeholder="Search fonts..." value={search} onChange={e_1 => setSearch(e_1.target.value)} />}</InspectorControlShell>}{<ScrollArea viewportRef={scrollRef} style={{
            height: LIST_H
          }}>{catalogStatus === "error" ? <div className="px-1.5 py-2 text-[12px] text-ed-muted-foreground">{t("styles.fontLoadFailed")}</div> : catalog.length === 0 ? <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-ed-muted-foreground">{<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}{t("styles.loadingFonts")}</div> : rows.length === 1 ? <div className="px-1.5 py-2 text-[12px] text-ed-muted-foreground">{t("styles.noFontsMatch", { search })}</div> : <div style={{
              height: rowVirtualizer.getTotalSize(),
              position: "relative"
            }}>{virtualItems.map(vi_0 => {
                const row_0 = rows[vi_0.index];
                const common = {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: vi_0.size,
                  transform: `translateY(${vi_0.start}px)`
                };
                if (row_0.kind === "header") return <span key={vi_0.key} className="flex items-end px-1.5 pb-1 text-[10px] font-semibold uppercase text-ed-foreground" style={{
                  ...common,
                  letterSpacing: "0.05em"
                }}>{translateInspectorText(t, row_0.label)}</span>;
                const isActive = getFontDisplayName(value, fonts) === row_0.name;
                return <button key={vi_0.key} type="button" onClick={() => handleSelectFont(row_0.name)} style={common} className={cn$2("flex items-center justify-between rounded-[5px] px-1.5 text-left", isActive ? "bg-ed-accent text-ed-accent-foreground" : "hover:bg-ed-accent/50")}>{<span className="truncate text-[12px]" style={{
                    fontFamily: `"${row_0.name}", sans-serif`
                  }}>{row_0.name}</span>}{isActive && <CheckIcon className="shrink-0" />}</button>;
              })}</div>}</ScrollArea>}</TabsContent>}{<TabsContent value="libraries" className="flex flex-col gap-3 m-0 min-h-0" style={{
          flex: 1
        }}>{<InspectorControlShell>{<span className="flex shrink-0 items-center pl-1 text-ed-foreground-secondary">{<SearchIcon className="text-ed-foreground-secondary" />}</span>}{<InspectorControlInput placeholder="Search classes..." value={libSearch} onChange={e_2 => setLibSearch(e_2.target.value)} />}</InspectorControlShell>}{<ScrollArea className="min-h-0" style={{
            flex: 1
          }}>{<div className="flex flex-col gap-px">{filteredClasses.map(({
                cls: cls_0,
                label,
                preview
              }) => {
                const isActive_0 = activeClass === cls_0;
                return <button key={cls_0} type="button" onClick={() => handleSelectClass(cls_0, label)} className={cn$2("flex w-full items-center justify-between rounded-[5px] px-1.5 py-[5px] text-left", isActive_0 ? "bg-ed-accent text-ed-accent-foreground" : "hover:bg-ed-accent/50")}>{<div className="flex flex-col gap-0.5">{<span className="text-[12px] font-medium" style={{
                      fontFamily: preview
                    }}>{translateInspectorText(t, label)}</span>}{<span className="font-mono text-[10px] text-ed-muted-foreground">{cls_0}</span>}</div>}{isActive_0 && <CheckIcon />}</button>;
              })}</div>}</ScrollArea>}</TabsContent>}</Tabs>}</PopoverContent>}</Popover>;
}

export { FontFamilyPicker, FontWeightPicker };
