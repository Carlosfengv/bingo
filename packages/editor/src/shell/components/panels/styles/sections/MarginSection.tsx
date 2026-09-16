/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/sections/MarginSection.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { MARGIN_KEYS } from "../../../../constants";
import { useClassesForProperty } from "../../../../hooks/useClassSuggestions";
import { useStyleOps } from "../StyleOpsContext";
import { LinkSidesButton, LinkedSidesGrid } from "../layout/controls";
import { InspectorRailRow, LayoutFieldLabel } from "../primitives";
import { InspectorSection } from "./InspectorSection";
import { MarginHorizontalIcon, MarginVerticalIcon } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Margin section — four-sides margin grid with a link/separate toggle, plus
* the class-suggestion affordance in the addable inspector-section header.
*/
function MarginSection() {
  const $ = (0, import_compiler_runtime.c)(29);
  const {
    hasAny,
    clear,
    setMultiple,
    addClass
  } = useStyleOps();
  const marginSuggestions = useClassesForProperty("margin");
  const [linked, setLinked] = (0, import_react.useState)(true);
  let t0;
  if ($[0] !== hasAny) {
    t0 = hasAny(...MARGIN_KEYS);
    $[0] = hasAny;
    $[1] = t0;
  } else t0 = $[1];
  let t1;
  if ($[2] !== setMultiple) {
    t1 = () => setMultiple({
      marginTop: "0px",
      marginRight: "0px",
      marginBottom: "0px",
      marginLeft: "0px"
    });
    $[2] = setMultiple;
    $[3] = t1;
  } else t1 = $[3];
  let t2;
  if ($[4] !== clear) {
    t2 = () => clear(...MARGIN_KEYS);
    $[4] = clear;
    $[5] = t2;
  } else t2 = $[5];
  let t3;
  if ($[6] !== addClass || $[7] !== clear) {
    t3 = cls => {
      addClass(cls);
      clear(...MARGIN_KEYS);
    };
    $[6] = addClass;
    $[7] = clear;
    $[8] = t3;
  } else t3 = $[8];
  let t4;
  if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = <LayoutFieldLabel>Margin</LayoutFieldLabel>;
    $[9] = t4;
  } else t4 = $[9];
  let t5;
  if ($[10] !== linked) {
    t5 = () => setLinked(!linked);
    $[10] = linked;
    $[11] = t5;
  } else t5 = $[11];
  let t6;
  if ($[12] !== linked || $[13] !== t5) {
    t6 = <LinkSidesButton kind="margin" linked={linked} onToggle={t5} />;
    $[12] = linked;
    $[13] = t5;
    $[14] = t6;
  } else t6 = $[14];
  let t7;
  let t8;
  if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = <MarginHorizontalIcon className="text-ed-muted-foreground" />;
    t8 = <MarginVerticalIcon className="text-ed-muted-foreground" />;
    $[15] = t7;
    $[16] = t8;
  } else {
    t7 = $[15];
    t8 = $[16];
  }
  let t9;
  if ($[17] !== linked) {
    t9 = <div className="grid min-w-0 grid-cols-2 gap-2">{<LinkedSidesGrid prefix="margin" linked={linked} showTooltips={false} linkedHorizontalIcon={t7} linkedVerticalIcon={t8} />}</div>;
    $[17] = linked;
    $[18] = t9;
  } else t9 = $[18];
  let t10;
  if ($[19] !== t6 || $[20] !== t9) {
    t10 = <div className="flex flex-col gap-2">{t4}{<InspectorRailRow action={t6}>{t9}</InspectorRailRow>}</div>;
    $[19] = t6;
    $[20] = t9;
    $[21] = t10;
  } else t10 = $[21];
  let t11;
  if ($[22] !== marginSuggestions || $[23] !== t0 || $[24] !== t1 || $[25] !== t10 || $[26] !== t2 || $[27] !== t3) {
    t11 = <InspectorSection reserveActionRail={true} variant="addable" title="Margin" isSet={t0} onAdd={t1} onRemove={t2} classSuggestions={marginSuggestions} cssProperty="margin" onSelectClass={t3}>{t10}</InspectorSection>;
    $[22] = marginSuggestions;
    $[23] = t0;
    $[24] = t1;
    $[25] = t10;
    $[26] = t2;
    $[27] = t3;
    $[28] = t11;
  } else t11 = $[28];
  return t11;
}

export { MarginSection };
