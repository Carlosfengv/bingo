/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/sections/RadiusSection.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { RADIUS_KEYS } from "../../../../constants";
import { useClassesForProperty } from "../../../../hooks/useClassSuggestions";
import { useStyleOps } from "../StyleOpsContext";
import { StyleLayoutInput } from "../fields/layout";
import { IconBtn, InspectorRailRow } from "../primitives";
import { InspectorSection } from "./InspectorSection";
import { RadiusIcon, RadiusLowerLeftIcon, RadiusLowerRightIcon, RadiusUpperLeftIcon, RadiusUpperRightIcon } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Radius section — a linked corner-radius field that can expand into four
* independently editable corners.
*/
function RadiusSection(t0) {
  const $ = (0, import_compiler_runtime.c)(32);
  let t1;
  if ($[0] !== t0) {
    t1 = t0 === void 0 ? {} : t0;
    $[0] = t0;
    $[1] = t1;
  } else t1 = $[1];
  const {
    className
  } = t1;
  const [linked, setLinked] = import_react.useState(true);
  const {
    hasAny,
    clear,
    setMultiple,
    addClass
  } = useStyleOps();
  const radiusSuggestions = useClassesForProperty("borderRadius");
  let t2;
  if ($[2] !== hasAny) {
    t2 = hasAny(...RADIUS_KEYS);
    $[2] = hasAny;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== setMultiple) {
    t3 = () => setMultiple({
      borderRadius: "0px"
    });
    $[4] = setMultiple;
    $[5] = t3;
  } else t3 = $[5];
  let t4;
  if ($[6] !== clear) {
    t4 = () => clear(...RADIUS_KEYS);
    $[6] = clear;
    $[7] = t4;
  } else t4 = $[7];
  let t5;
  if ($[8] !== addClass || $[9] !== clear) {
    t5 = className_0 => {
      addClass(className_0);
      clear(...RADIUS_KEYS);
    };
    $[8] = addClass;
    $[9] = clear;
    $[10] = t5;
  } else t5 = $[10];
  const t6 = linked ? "Separate corners" : "Link corners";
  const t7 = !linked;
  let t8;
  if ($[11] !== linked) {
    t8 = () => setLinked(!linked);
    $[11] = linked;
    $[12] = t8;
  } else t8 = $[12];
  let t9;
  if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
    t9 = <RadiusIcon />;
    $[13] = t9;
  } else t9 = $[13];
  let t10;
  if ($[14] !== t6 || $[15] !== t7 || $[16] !== t8) {
    t10 = <IconBtn label={t6} active={t7} onClick={t8}>{t9}</IconBtn>;
    $[14] = t6;
    $[15] = t7;
    $[16] = t8;
    $[17] = t10;
  } else t10 = $[17];
  let t11;
  if ($[18] !== linked || $[19] !== setMultiple) {
    t11 = <div className="min-w-0">{linked ? <StyleLayoutInput property="borderRadius" showTooltip={false} icon={<RadiusIcon className="text-ed-muted-foreground" />} onChange={value => setMultiple({
        borderRadius: value,
        borderTopLeftRadius: void 0,
        borderTopRightRadius: void 0,
        borderBottomLeftRadius: void 0,
        borderBottomRightRadius: void 0
      })} /> : <div className="grid min-w-0 grid-cols-2 gap-2">{<StyleLayoutInput property="borderTopLeftRadius" showTooltip={false} icon={<RadiusUpperLeftIcon />} />}{<StyleLayoutInput property="borderTopRightRadius" showTooltip={false} icon={<RadiusUpperRightIcon />} />}{<StyleLayoutInput property="borderBottomLeftRadius" showTooltip={false} icon={<RadiusLowerLeftIcon />} />}{<StyleLayoutInput property="borderBottomRightRadius" showTooltip={false} icon={<RadiusLowerRightIcon />} />}</div>}</div>;
    $[18] = linked;
    $[19] = setMultiple;
    $[20] = t11;
  } else t11 = $[20];
  let t12;
  if ($[21] !== t10 || $[22] !== t11) {
    t12 = <InspectorRailRow action={t10}>{t11}</InspectorRailRow>;
    $[21] = t10;
    $[22] = t11;
    $[23] = t12;
  } else t12 = $[23];
  let t13;
  if ($[24] !== className || $[25] !== radiusSuggestions || $[26] !== t12 || $[27] !== t2 || $[28] !== t3 || $[29] !== t4 || $[30] !== t5) {
    t13 = <InspectorSection reserveActionRail={true} variant="addable" title="Radius" className={className} isSet={t2} onAdd={t3} onRemove={t4} classSuggestions={radiusSuggestions} cssProperty="borderRadius" onSelectClass={t5}>{t12}</InspectorSection>;
    $[24] = className;
    $[25] = radiusSuggestions;
    $[26] = t12;
    $[27] = t2;
    $[28] = t3;
    $[29] = t4;
    $[30] = t5;
    $[31] = t13;
  } else t13 = $[31];
  return t13;
}

export { RadiusSection };
