/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/LayoutMinMaxInput.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { inspectorPropertySupportsAuto } from "../../../../utils/unitValue";
import { IconBtn, InspectorControlInput, InspectorControlShell, InspectorScrubHandle, LayoutFieldLabel, blurInspectorInputOnEnter } from "../primitives";
import { UnitMenu } from "./UnitMenu";
import { useInspectorScrub } from "./useInspectorScrub";
import { useUnitValue } from "./useUnitValue";
import { XIcon } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* LayoutMinMaxInput — labelled length input for the standalone Min/Max Width &
* Height rows. Tracks a dirty flag so it only writes back edited values, and
* shows the resolved unit suffix as a trailing badge.
*/
function LayoutMinMaxInput(t0) {
  const $ = (0, import_compiler_runtime.c)(42);
  const {
    label,
    tooltipLabel,
    value,
    onChange,
    onClear,
    placeholder: t1,
    icon,
    isMixedValue: t2
  } = t0;
  const placeholder = t1 === void 0 ? "0" : t1;
  const isMixedValue = t2 === void 0 ? false : t2;
  const [unitMenuOpen, setUnitMenuOpen] = import_react.useState(false);
  let t3;
  if ($[0] !== label) {
    t3 = inspectorPropertySupportsAuto(label);
    $[0] = label;
    $[1] = t3;
  } else t3 = $[1];
  const allowAuto = t3;
  const t4 = value ?? "";
  let t5;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = ["none"];
    $[2] = t5;
  } else t5 = $[2];
  let t6;
  if ($[3] !== allowAuto || $[4] !== isMixedValue || $[5] !== onChange || $[6] !== t4) {
    t6 = {
      value: t4,
      onChange,
      isMixedValue,
      acceptedKeywords: t5,
      allowAuto
    };
    $[3] = allowAuto;
    $[4] = isMixedValue;
    $[5] = onChange;
    $[6] = t4;
    $[7] = t6;
  } else t6 = $[7];
  const unitValue = useUnitValue(t6);
  const {
    scrubRef,
    isScrubbing
  } = useInspectorScrub(unitValue.scrubValue, unitValue.applyScrub);
  let t7;
  if ($[8] !== label) {
    t7 = <LayoutFieldLabel>{label}</LayoutFieldLabel>;
    $[8] = label;
    $[9] = t7;
  } else t7 = $[9];
  const t8 = isScrubbing || unitMenuOpen;
  const t9 = unitValue.isInvalid || void 0;
  let t10;
  if ($[10] !== icon || $[11] !== scrubRef) {
    t10 = <InspectorScrubHandle ref={scrubRef} className="pl-2">{icon}</InspectorScrubHandle>;
    $[10] = icon;
    $[11] = scrubRef;
    $[12] = t10;
  } else t10 = $[12];
  const t11 = unitValue.showMixed ? "" : unitValue.draft;
  let t12;
  if ($[13] !== unitValue) {
    t12 = event => unitValue.setDraft(event.target.value);
    $[13] = unitValue;
    $[14] = t12;
  } else t12 = $[14];
  const t13 = unitValue.showMixed ? "-" : placeholder;
  const t14 = unitValue.isInvalid || void 0;
  const t15 = unitValue.errorMessage ?? tooltipLabel;
  let t16;
  if ($[15] !== t11 || $[16] !== t12 || $[17] !== t13 || $[18] !== t14 || $[19] !== t15 || $[20] !== unitValue.commit) {
    t16 = <InspectorControlInput value={t11} onChange={t12} onBlur={unitValue.commit} onKeyDown={blurInspectorInputOnEnter} placeholder={t13} aria-invalid={t14} tooltip={t15} className="px-1" />;
    $[15] = t11;
    $[16] = t12;
    $[17] = t13;
    $[18] = t14;
    $[19] = t15;
    $[20] = unitValue.commit;
    $[21] = t16;
  } else t16 = $[21];
  let t17;
  if ($[22] !== allowAuto || $[23] !== label || $[24] !== unitValue.selectUnit || $[25] !== unitValue.selectedUnit) {
    t17 = <UnitMenu value={unitValue.selectedUnit} onValueChange={unitValue.selectUnit} label={label} onOpenChange={setUnitMenuOpen} allowAuto={allowAuto} />;
    $[22] = allowAuto;
    $[23] = label;
    $[24] = unitValue.selectUnit;
    $[25] = unitValue.selectedUnit;
    $[26] = t17;
  } else t17 = $[26];
  let t18;
  if ($[27] !== t10 || $[28] !== t16 || $[29] !== t17 || $[30] !== t8 || $[31] !== t9) {
    t18 = <InspectorControlShell active={t8} aria-invalid={t9} className="flex-1">{t10}{t16}{t17}</InspectorControlShell>;
    $[27] = t10;
    $[28] = t16;
    $[29] = t17;
    $[30] = t8;
    $[31] = t9;
    $[32] = t18;
  } else t18 = $[32];
  let t19;
  if ($[33] !== label || $[34] !== onClear) {
    t19 = onClear && <IconBtn label={`Remove ${label}`} className="shrink-0" onClick={e => {
      e.preventDefault();
      e.stopPropagation();
      onClear();
    }}>{<XIcon className="size-3.75" />}</IconBtn>;
    $[33] = label;
    $[34] = onClear;
    $[35] = t19;
  } else t19 = $[35];
  let t20;
  if ($[36] !== t18 || $[37] !== t19) {
    t20 = <div className="flex min-w-0 items-center gap-2">{t18}{t19}</div>;
    $[36] = t18;
    $[37] = t19;
    $[38] = t20;
  } else t20 = $[38];
  let t21;
  if ($[39] !== t20 || $[40] !== t7) {
    t21 = <div className="flex min-w-0 flex-1 flex-col gap-2">{t7}{t20}</div>;
    $[39] = t20;
    $[40] = t7;
    $[41] = t21;
  } else t21 = $[41];
  return t21;
}

export { LayoutMinMaxInput };
