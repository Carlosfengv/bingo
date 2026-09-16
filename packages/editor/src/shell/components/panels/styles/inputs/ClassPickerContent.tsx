/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/ClassPickerContent.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getAllTailwindColors } from "../../../../../shared/utils/tailwindScale";
import { useTranslation } from "@bingo/i18n";
import { InspectorControlInput, InspectorControlShell } from "../primitives";
import { PlusIcon, ScrollArea, cn$2 } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Reusable class picker popover — search + arrow keys + enter to select.
* Shown from the section-header chip-icon and from individual fields'
* suggestion dropdowns. Splits results into Design System (var-based),
* Project (concrete), and the full Tailwind palette.
*/
function ClassPickerContent(t0) {
  const $ = (0, import_compiler_runtime.c)(42);
  const { t } = useTranslation("editor");
  const {
    suggestions,
    cssProperty,
    onSelect,
    sourceClass,
    onClose,
    tailwindOptions
  } = t0;
  const [search, setSearch] = (0, import_react.useState)("");
  const [selectedIdx, setSelectedIdx] = (0, import_react.useState)(0);
  let T0;
  let allItems;
  let t1;
  let t2;
  let t3;
  let t4;
  let t5;
  if (true) {
    const valid = suggestions.filter(_temp$54);
    const resolved = (!search ? valid : valid.filter(s_0 => s_0.className.toLowerCase().includes(search.toLowerCase()))).map(_temp2$41);
    const designSystem = [];
    const project = [];
    for (const s_2 of resolved) if (s_2.rawValue) designSystem.push(s_2);else project.push(s_2);
    let t6;
    if ($[15] !== cssProperty) {
      t6 = cssProperty && ["color", "backgroundColor", "borderColor"].includes(cssProperty);
      $[15] = cssProperty;
      $[16] = t6;
    } else t6 = $[16];
    const isColor = t6;
    let t7;
    if ($[17] !== isColor || $[18] !== tailwindOptions) {
      t7 = isColor || tailwindOptions?.some(_temp3$26);
      $[17] = isColor;
      $[18] = tailwindOptions;
      $[19] = t7;
    } else t7 = $[19];
    const hasColorSwatches = t7;
    const allTwOptions = tailwindOptions ?? (isColor && cssProperty ? getAllTailwindColors(cssProperty) : []);
    const twOptions = !allTwOptions.length ? [] : !search ? allTwOptions : allTwOptions.filter(s_3 => s_3.className.toLowerCase().includes(search.toLowerCase()));
    const hasTwSection = twOptions.length > 0;
    allItems = [];
    for (const s_4 of designSystem) allItems.push({
      ...s_4,
      section: "designSystem"
    });
    for (const s_5 of project) allItems.push({
      ...s_5,
      section: "project"
    });
    if (hasTwSection) {
      const projectNames = new Set(resolved.map(_temp4$20));
      for (const s_7 of twOptions) if (!projectNames.has(s_7.className)) allItems.push({
        className: s_7.className,
        value: s_7.value,
        resolvedValue: s_7.value,
        section: "tailwind"
      });
    }
    let t8;
    if ($[20] === Symbol.for("react.memo_cache_sentinel")) {
      t8 = e => {
        setSearch(e.target.value);
        setSelectedIdx(0);
      };
      $[20] = t8;
    } else t8 = $[20];
    const t9 = <InspectorControlShell>{<InspectorControlInput value={search} onChange={t8} onKeyDown={e_0 => {
        if (e_0.nativeEvent.isComposing || e_0.keyCode === 229) return;
        if (e_0.key === "ArrowDown") {
          e_0.preventDefault();
          setSelectedIdx(i => Math.min(i + 1, allItems.length - 1));
        } else if (e_0.key === "ArrowUp") {
          e_0.preventDefault();
          setSelectedIdx(_temp5$17);
        } else if (e_0.key === "Enter") {
          e_0.preventDefault();
          if (allItems.length > 0) {
            onSelect(allItems[selectedIdx]?.className);
            onClose();
          } else if (search.trim()) {
            onSelect(search.trim());
            onClose();
          }
        } else if (e_0.key === "Escape") onClose();
      }} placeholder={isColor ? t("styles.searchColors") : t("styles.searchClasses")} autoFocus={true} className="px-2" />}</InspectorControlShell>;
    if ($[21] !== t9) {
      t5 = <div className="p-1.5 border-b border-ed-border">{t9}</div>;
      $[21] = t9;
      $[22] = t5;
    } else t5 = $[22];
    T0 = ScrollArea;
    t1 = "max-h-75 p-1";
    t2 = designSystem.length > 0 && (() => <>{<div className="px-2 py-1 text-[10px] text-ed-foreground uppercase tracking-wider">{t("styles.designSystem")}</div>}{designSystem.map((s_8, i_1) => <button key={`ds-${s_8.className}`} onClick={() => {
        onSelect(s_8.className);
        onClose();
      }} className={cn$2("w-full flex items-center gap-2 px-2 py-1.5 text-[12px] rounded hover:bg-ed-muted text-left", sourceClass === s_8.className && "bg-ed-primary/5", 0 + i_1 === selectedIdx && "bg-ed-muted")}>{hasColorSwatches && <div className="w-4 h-4 rounded border border-ed-border/30 shrink-0" style={{
          backgroundColor: s_8.resolvedValue
        }} />}{<span className="font-mono text-ed-foreground truncate flex-1">{s_8.className}</span>}{!hasColorSwatches && <span className="text-ed-muted-foreground shrink-0 text-[10px] max-w-[50%] truncate text-right">{s_8.resolvedValue}</span>}</button>)}</>)();
    t3 = project.length > 0 && (() => {
      const baseIdx_0 = designSystem.length;
      return <>{designSystem.length > 0 && <div className="mx-1 my-1 border-t border-ed-border" />}{<div className="px-2 py-1 text-[10px] text-ed-foreground uppercase tracking-wider">{t("styles.project")}</div>}{project.map((s_9, i_2) => <button key={`p-${s_9.className}`} onClick={() => {
          onSelect(s_9.className);
          onClose();
        }} className={cn$2("w-full flex items-center gap-2 px-2 py-1.5 text-[12px] rounded hover:bg-ed-muted text-left", sourceClass === s_9.className && "bg-ed-primary/5", baseIdx_0 + i_2 === selectedIdx && "bg-ed-muted")}>{hasColorSwatches && <div className="w-4 h-4 rounded border border-ed-border/30 shrink-0" style={{
            backgroundColor: s_9.resolvedValue
          }} />}{<span className="font-mono text-ed-foreground truncate flex-1">{s_9.className}</span>}{!hasColorSwatches && <span className="text-ed-muted-foreground shrink-0 text-[10px] max-w-[50%] truncate text-right">{s_9.resolvedValue}</span>}</button>)}</>;
    })();
    t4 = hasTwSection && twOptions.length > 0 && <>{(designSystem.length > 0 || project.length > 0) && <div className="mx-1 my-1 border-t border-ed-border" />}{<div className="px-2 py-1 text-[10px] text-ed-foreground uppercase tracking-wider">Tailwind</div>}{(() => {
        const projectNames_0 = new Set(resolved.map(_temp6$15));
        return twOptions.filter(s_10 => !projectNames_0.has(s_10.className)).map((s_11, i_3) => {
          const currentIdx = resolved.length + i_3;
          return <button key={`tw-${s_11.className}`} onMouseDown={_temp7$11} onClick={() => {
            onSelect(s_11.className);
            onClose();
          }} className={cn$2("w-full flex items-center gap-2 px-2 py-1 text-[12px] rounded hover:bg-ed-muted text-left", currentIdx === selectedIdx && "bg-ed-muted")}>{hasColorSwatches && <div className="w-3.5 h-3.5 rounded border border-ed-border/30 shrink-0" style={{
              backgroundColor: s_11.value
            }} />}{<span className="font-mono text-ed-foreground truncate flex-1">{s_11.className}</span>}{!hasColorSwatches && <span className="text-ed-muted-foreground shrink-0 text-[10px] max-w-[50%] truncate text-right">{s_11.value}</span>}</button>;
        });
      })()}</>;
    $[0] = cssProperty;
    $[1] = onClose;
    $[2] = onSelect;
    $[3] = search;
    $[4] = selectedIdx;
    $[5] = sourceClass;
    $[6] = suggestions;
    $[7] = tailwindOptions;
    $[8] = T0;
    $[9] = allItems;
    $[10] = t1;
    $[11] = t2;
    $[12] = t3;
    $[13] = t4;
    $[14] = t5;
  } else {
    T0 = $[8];
    allItems = $[9];
    t1 = $[10];
    t2 = $[11];
    t3 = $[12];
    t4 = $[13];
    t5 = $[14];
  }
  let t6;
  if (true) {
    t6 = allItems.length === 0 && search.trim() && <button onClick={() => {
      onSelect(search.trim());
      onClose();
    }} className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] rounded hover:bg-ed-muted text-left">{<PlusIcon className="text-ed-foreground-secondary" />}{<span className="font-mono text-ed-foreground">{t("styles.addCustomClass", { name: search.trim() })}</span>}</button>;
    $[23] = allItems.length;
    $[24] = onClose;
    $[25] = onSelect;
    $[26] = search;
    $[27] = t6;
  } else t6 = $[27];
  let t7;
  if (true) {
    t7 = allItems.length === 0 && !search.trim() && <div className="px-2 py-2 text-[12px] text-ed-muted-foreground text-center">{t("styles.noMatches")}</div>;
    $[28] = allItems.length;
    $[29] = search;
    $[30] = t7;
  } else t7 = $[30];
  let t8;
  if ($[31] !== T0 || $[32] !== t1 || $[33] !== t2 || $[34] !== t3 || $[35] !== t4 || $[36] !== t6 || $[37] !== t7) {
    t8 = <T0 viewportClassName={t1}>{t2}{t3}{t4}{t6}{t7}</T0>;
    $[31] = T0;
    $[32] = t1;
    $[33] = t2;
    $[34] = t3;
    $[35] = t4;
    $[36] = t6;
    $[37] = t7;
    $[38] = t8;
  } else t8 = $[38];
  let t9;
  if ($[39] !== t5 || $[40] !== t8) {
    t9 = <>{t5}{t8}</>;
    $[39] = t5;
    $[40] = t8;
    $[41] = t9;
  } else t9 = $[41];
  return t9;
}
function _temp7$11(e_1) {
  return e_1.preventDefault();
}
function _temp6$15(r) {
  return r.className;
}
function _temp5$17(i_0) {
  return Math.max(i_0 - 1, 0);
}
function _temp4$20(s_6) {
  return s_6.className;
}
function _temp3$26(t) {
  return /^#[0-9a-f]{6}$/i.test(t.value);
}
function _temp2$41(s_1) {
  return {
    ...s_1,
    resolvedValue: s_1.value
  };
}
function _temp$54(s) {
  return s.className && s.className.length > 0;
}

export { ClassPickerContent };
