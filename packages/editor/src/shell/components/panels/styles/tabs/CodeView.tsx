/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/tabs/CodeView.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { usePropertyResolution } from "../../../../utils/styleResolution";
import { InspectorSection } from "../sections/InspectorSection";
import { CSSTab } from "./CSSTab";
import { ClassesTab } from "./ClassesTab";
import { getDescendantIds } from "@bingo/compiler";
import { useTranslation } from "@bingo/i18n";
import { Tooltip, TooltipContent, TooltipTrigger } from "@bingo/ui";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Code view — the "Code" tab of the styles panel. Stacks the raw-CSS editor
* (CSSTab, wrapped in a CSS section with a Clear action) above the Tailwind
* Classes section.
*/
function CodeView(t0) {
  const $ = (0, import_compiler_runtime.c)(41);
  const { t } = useTranslation("editor");
  const {
    element,
    selectedElementId,
    selectedElements,
    store,
    onUpdateElementStyles,
    onUpdateElementProps,
    onUpdateMultipleElementsStyles,
    onUpdateMultipleElementsProps,
    readOnly
  } = t0;
  const isMultiSelect = selectedElements && selectedElements.length > 1;
  const elementClassName = element?.props?.className;
  const resolution = usePropertyResolution(selectedElementId, element?.styles, !!isMultiSelect, elementClassName);
  let selectedIds;
  let subtreeIds;
  if ($[0] !== isMultiSelect || $[1] !== selectedElementId || $[2] !== selectedElements || $[3] !== store) {
    selectedIds = isMultiSelect && selectedElements ? selectedElements.map(_temp$50) : selectedElementId ? [selectedElementId] : [];
    subtreeIds = new Set();
    for (const id of selectedIds) {
      subtreeIds.add(id);
      for (const descendant of getDescendantIds(store, id)) subtreeIds.add(descendant);
    }
    $[0] = isMultiSelect;
    $[1] = selectedElementId;
    $[2] = selectedElements;
    $[3] = store;
    $[4] = selectedIds;
    $[5] = subtreeIds;
  } else {
    selectedIds = $[4];
    subtreeIds = $[5];
  }
  const hasDescendants = subtreeIds.size > selectedIds.length;
  let t1;
  if ($[6] !== onUpdateElementStyles || $[7] !== onUpdateMultipleElementsStyles || $[8] !== readOnly || $[9] !== selectedElementId) {
    t1 = ids => {
      if (readOnly) return;
      if (onUpdateMultipleElementsStyles) onUpdateMultipleElementsStyles(ids, _temp2$38);else onUpdateElementStyles(selectedElementId, {});
    };
    $[6] = onUpdateElementStyles;
    $[7] = onUpdateMultipleElementsStyles;
    $[8] = readOnly;
    $[9] = selectedElementId;
    $[10] = t1;
  } else t1 = $[10];
  const clearStyles = t1;
  if (!element && !isMultiSelect) {
    let t2;
    if (true) {
      t2 = <p className="p-3 text-[12px] text-ed-muted-foreground">{t("styles.noElement")}</p>;
      $[11] = t2;
    } else t2 = $[11];
    return t2;
  }
  let t2;
  if (true) {
    t2 = !readOnly && <div className="flex items-center gap-2">{hasDescendants && onUpdateMultipleElementsStyles && <Tooltip>{<TooltipTrigger asChild={true}>{<button type="button" onClick={() => clearStyles(subtreeIds)} className="text-[12px] text-ed-muted-foreground hover:text-ed-foreground">{t("styles.clearAll")}</button>}</TooltipTrigger>}{<TooltipContent side="top">{t("styles.clearNestedCss")}</TooltipContent>}</Tooltip>}{<Tooltip>{<TooltipTrigger asChild={true}>{<button type="button" onClick={() => clearStyles(new Set(selectedIds))} className="text-[12px] text-ed-muted-foreground hover:text-ed-foreground">{t("styles.clear")}</button>}</TooltipTrigger>}{<TooltipContent side="top">{isMultiSelect ? t("styles.clearSelectedCss") : t("styles.clearElementCss")}</TooltipContent>}</Tooltip>}</div>;
    $[12] = clearStyles;
    $[13] = hasDescendants;
    $[14] = isMultiSelect;
    $[15] = onUpdateMultipleElementsStyles;
    $[16] = readOnly;
    $[17] = selectedIds;
    $[18] = subtreeIds;
    $[19] = t2;
  } else t2 = $[19];
  let t3;
  if ($[20] !== element || $[21] !== onUpdateElementStyles || $[22] !== onUpdateMultipleElementsStyles || $[23] !== readOnly || $[24] !== resolution.cascadeByClass || $[25] !== selectedElementId || $[26] !== selectedElements) {
    t3 = <CSSTab element={element} selectedElementId={selectedElementId} selectedElements={selectedElements} onUpdateElementStyles={onUpdateElementStyles} onUpdateMultipleElementsStyles={onUpdateMultipleElementsStyles} readOnly={readOnly} cascadeByClass={resolution.cascadeByClass} />;
    $[20] = element;
    $[21] = onUpdateElementStyles;
    $[22] = onUpdateMultipleElementsStyles;
    $[23] = readOnly;
    $[24] = resolution.cascadeByClass;
    $[25] = selectedElementId;
    $[26] = selectedElements;
    $[27] = t3;
  } else t3 = $[27];
  let t4;
  if ($[28] !== t2 || $[29] !== t3) {
    t4 = <InspectorSection title="CSS" action={t2}>{t3}</InspectorSection>;
    $[28] = t2;
    $[29] = t3;
    $[30] = t4;
  } else t4 = $[30];
  let t5;
  if ($[31] !== element || $[32] !== onUpdateElementProps || $[33] !== onUpdateMultipleElementsProps || $[34] !== readOnly || $[35] !== selectedElementId || $[36] !== selectedElements) {
    t5 = <ClassesTab element={element} selectedElementId={selectedElementId} selectedElements={selectedElements} onUpdateElementProps={onUpdateElementProps} onUpdateMultipleElementsProps={onUpdateMultipleElementsProps} readOnly={readOnly} />;
    $[31] = element;
    $[32] = onUpdateElementProps;
    $[33] = onUpdateMultipleElementsProps;
    $[34] = readOnly;
    $[35] = selectedElementId;
    $[36] = selectedElements;
    $[37] = t5;
  } else t5 = $[37];
  let t6;
  if ($[38] !== t4 || $[39] !== t5) {
    t6 = <div>{t4}{t5}</div>;
    $[38] = t4;
    $[39] = t5;
    $[40] = t6;
  } else t6 = $[40];
  return t6;
}
function _temp2$38() {
  return {};
}
function _temp$50(el) {
  return el.id;
}

export { CodeView };
