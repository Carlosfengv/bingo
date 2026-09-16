/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/StylesPanelTabs.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useActiveTool } from "../../../shared/contexts/ActiveToolContext";
import { CodeView } from "./styles/tabs/CodeView";
import { DesignTab } from "./styles/tabs/DesignTab";
import { getById } from "@bingo/compiler";
import { useTranslation } from "@bingo/i18n";
import { ScrollArea, SimpleTabs, Tabs, TabsContent, TabsTrigger } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var EMPTY_SELECTED_IDS$1 = new Set();
function StylesPanelTabs(t0) {
  const $ = (0, import_compiler_runtime.c)(61);
  const { t } = useTranslation("editor");
  const {
    selectedElementId,
    selectedElementIds: t1,
    store,
    onUpdateElementStyles,
    onUpdateElementProps,
    onUpdateMultipleElementsProps,
    onUpdateMultipleElementsStyles,
    onUpdateElementPositions,
    onToggleTextFormat,
    textSelectionState,
    readOnly: t2,
    fonts,
    propsPanel,
    header,
    headerActions
  } = t0;
  const selectedElementIds = t1 === void 0 ? EMPTY_SELECTED_IDS$1 : t1;
  const readOnly = t2 === void 0 ? false : t2;
  const {
    scaleFocusVersion
  } = useActiveTool();
  const [view, setView] = (0, import_react.useState)("design");
  const [previousScaleFocus, setPreviousScaleFocus] = (0, import_react.useState)(scaleFocusVersion);
  if (previousScaleFocus !== scaleFocusVersion) {
    setPreviousScaleFocus(scaleFocusVersion);
    setView("design");
  }
  let t3;
  if ($[0] !== selectedElementId || $[1] !== store) {
    t3 = selectedElementId ? getById(store, selectedElementId) ?? null : null;
    $[0] = selectedElementId;
    $[1] = store;
    $[2] = t3;
  } else t3 = $[2];
  const element = t3;
  const isMultiSelect = selectedElementIds.size > 1;
  let t4;
  let t5;
  if ($[3] !== propsPanel || $[4] !== view) {
    t4 = () => {
      if (!propsPanel && view === "props") setView("design");
    };
    t5 = [propsPanel, view];
    $[3] = propsPanel;
    $[4] = view;
    $[5] = t4;
    $[6] = t5;
  } else {
    t4 = $[5];
    t5 = $[6];
  }
  import_react.useEffect(t4, t5);
  let selectedElements;
  if ($[7] !== isMultiSelect || $[8] !== selectedElementIds || $[9] !== store) {
    selectedElements = isMultiSelect ? [] : void 0;
    if (selectedElements) for (const id of selectedElementIds) {
      const el = getById(store, id);
      if (el) selectedElements.push(el);
    }
    $[7] = isMultiSelect;
    $[8] = selectedElementIds;
    $[9] = store;
    $[10] = selectedElements;
  } else selectedElements = $[10];
  if (!selectedElementId && !isMultiSelect) {
    let t6;
    if (true) {
      t6 = <div className="h-full flex flex-col overflow-hidden" data-text-edit-safe="true">{<div className="flex-1 flex items-center justify-center p-4">{<p className="text-[12px] text-ed-muted-foreground text-center">{t("panels.selectElement")}</p>}</div>}</div>;
      $[11] = t6;
    } else t6 = $[11];
    return t6;
  }
  let t6;
  if ($[12] !== selectedElementId || $[13] !== selectedElementIds) {
    t6 = selectedElementId || Array.from(selectedElementIds)[0];
    $[12] = selectedElementId;
    $[13] = selectedElementIds;
    $[14] = t6;
  } else t6 = $[14];
  const effectiveId = t6;
  let t7;
  if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = value => setView(value);
    $[15] = t7;
  } else t7 = $[15];
  let t8;
  if (true) {
    t8 = <TabsTrigger value="design">{t("panels.styles")}</TabsTrigger>;
    $[16] = t8;
  } else t8 = $[16];
  let t9;
  if (true) {
    t9 = propsPanel && <TabsTrigger value="props">{t("panels.props")}</TabsTrigger>;
    $[17] = propsPanel;
    $[18] = t9;
  } else t9 = $[18];
  let t10;
  if (true) {
    t10 = <TabsTrigger value="code">{t("panels.code")}</TabsTrigger>;
    $[19] = t10;
  } else t10 = $[19];
  let t11;
  if ($[20] !== t9) {
    t11 = <SimpleTabs size="xs" className="w-fit shrink-0">{t8}{t9}{t10}</SimpleTabs>;
    $[20] = t9;
    $[21] = t11;
  } else t11 = $[21];
  let t12;
  if ($[22] !== headerActions || $[23] !== t11) {
    t12 = <div className="editor-panel-header z-10 flex min-w-0 shrink-0 items-center justify-between gap-1 border-b border-ed-divider bg-ed-background p-3">{t11}{headerActions}</div>;
    $[22] = headerActions;
    $[23] = t11;
    $[24] = t12;
  } else t12 = $[24];
  let t13;
  if ($[25] !== effectiveId || $[26] !== element || $[27] !== fonts || $[28] !== onToggleTextFormat || $[29] !== onUpdateElementPositions || $[30] !== onUpdateElementProps || $[31] !== onUpdateElementStyles || $[32] !== onUpdateMultipleElementsProps || $[33] !== onUpdateMultipleElementsStyles || $[34] !== readOnly || $[35] !== selectedElements || $[36] !== store || $[37] !== textSelectionState) {
    t13 = <DesignTab element={element} selectedElementId={effectiveId} selectedElements={selectedElements} store={store} onUpdateElementStyles={onUpdateElementStyles} onUpdateElementProps={onUpdateElementProps} onUpdateMultipleElementsStyles={onUpdateMultipleElementsStyles} onUpdateElementPositions={onUpdateElementPositions} onUpdateMultipleElementsProps={onUpdateMultipleElementsProps} onToggleTextFormat={onToggleTextFormat} textSelectionState={textSelectionState} readOnly={readOnly} fonts={fonts} />;
    $[25] = effectiveId;
    $[26] = element;
    $[27] = fonts;
    $[28] = onToggleTextFormat;
    $[29] = onUpdateElementPositions;
    $[30] = onUpdateElementProps;
    $[31] = onUpdateElementStyles;
    $[32] = onUpdateMultipleElementsProps;
    $[33] = onUpdateMultipleElementsStyles;
    $[34] = readOnly;
    $[35] = selectedElements;
    $[36] = store;
    $[37] = textSelectionState;
    $[38] = t13;
  } else t13 = $[38];
  let t14;
  if ($[39] === Symbol.for("react.memo_cache_sentinel")) {
    t14 = <div aria-hidden="true" className="h-[200px] shrink-0" />;
    $[39] = t14;
  } else t14 = $[39];
  let t15;
  if ($[40] !== t13) {
    t15 = <TabsContent value="design" className="w-full min-w-0 max-w-full overflow-hidden">{<ScrollArea className="h-full">{t13}{t14}</ScrollArea>}</TabsContent>;
    $[40] = t13;
    $[41] = t15;
  } else t15 = $[41];
  let t16;
  if ($[42] !== propsPanel) {
    t16 = propsPanel && <TabsContent value="props" className="w-full min-w-0 max-w-full overflow-hidden">{<ScrollArea className="h-full">{propsPanel}{<div aria-hidden="true" className="h-[200px] shrink-0" />}</ScrollArea>}</TabsContent>;
    $[42] = propsPanel;
    $[43] = t16;
  } else t16 = $[43];
  let t17;
  if ($[44] !== effectiveId || $[45] !== element || $[46] !== onUpdateElementProps || $[47] !== onUpdateElementStyles || $[48] !== onUpdateMultipleElementsProps || $[49] !== onUpdateMultipleElementsStyles || $[50] !== readOnly || $[51] !== selectedElements || $[52] !== store) {
    t17 = <TabsContent value="code" className="overflow-auto">{<CodeView element={element} selectedElementId={effectiveId} selectedElements={selectedElements} store={store} onUpdateElementStyles={onUpdateElementStyles} onUpdateElementProps={onUpdateElementProps} onUpdateMultipleElementsStyles={onUpdateMultipleElementsStyles} onUpdateMultipleElementsProps={onUpdateMultipleElementsProps} readOnly={readOnly} />}</TabsContent>;
    $[44] = effectiveId;
    $[45] = element;
    $[46] = onUpdateElementProps;
    $[47] = onUpdateElementStyles;
    $[48] = onUpdateMultipleElementsProps;
    $[49] = onUpdateMultipleElementsStyles;
    $[50] = readOnly;
    $[51] = selectedElements;
    $[52] = store;
    $[53] = t17;
  } else t17 = $[53];
  let t18;
  if ($[54] !== header || $[55] !== t12 || $[56] !== t15 || $[57] !== t16 || $[58] !== t17 || $[59] !== view) {
    t18 = <Tabs value={view} onValueChange={t7} className="min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden flex flex-col" data-text-edit-safe="true">{t12}{header}{t15}{t16}{t17}</Tabs>;
    $[54] = header;
    $[55] = t12;
    $[56] = t15;
    $[57] = t16;
    $[58] = t17;
    $[59] = view;
    $[60] = t18;
  } else t18 = $[60];
  return t18;
}

export { StylesPanelTabs };
