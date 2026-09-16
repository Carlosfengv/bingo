/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/DimensionInput.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getInspectorUnitNumericValue } from "../../../../utils/unitValue";
import { InspectorControlInput, InspectorControlShell, InspectorScrubHandle, blurInspectorInputOnEnter } from "../primitives";
import { UnitMenu } from "./UnitMenu";
import { useInspectorScrub } from "./useInspectorScrub";
import { useUnitValue } from "./useUnitValue";
import { translateInspectorText } from "../inspectorCopy";
import { useTranslation } from "@bingo/i18n";
import { cn$2 } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* DimensionInput — the Width/Height control. Click the value to type a length;
* the unit trigger switches CSS units and intrinsic/flex sizing modes.
*/
function DimensionInput(t0) {
  const $ = (0, import_compiler_runtime.c)(62);
  const { t } = useTranslation("editor");
  const {
    label,
    value,
    onChange,
    computedValue,
    isMixedValue: t1,
    flexValue,
    onFlexChange,
    parentIsFlex,
    fixedPixels: t2,
    disabled: t3,
    ariaLabel,
    min: t4
  } = t0;
  const isMixedValue = t1 === void 0 ? false : t1;
  const fixedPixels = t2 === void 0 ? false : t2;
  const disabled = t3 === void 0 ? false : t3;
  const min = t4 === void 0 ? 0 : t4;
  const [editing, setEditing] = (0, import_react.useState)(false);
  const [unitMenuOpen, setUnitMenuOpen] = (0, import_react.useState)(false);
  const inputRef = (0, import_react.useRef)(null);
  let t5;
  if ($[0] !== computedValue) {
    t5 = getInspectorUnitNumericValue(computedValue) ?? 100;
    $[0] = computedValue;
    $[1] = t5;
  } else t5 = $[1];
  const fallbackNumericValue = t5;
  let t6;
  if ($[2] !== fixedPixels) {
    t6 = fixedPixels ? ["px"] : void 0;
    $[2] = fixedPixels;
    $[3] = t6;
  } else t6 = $[3];
  let t7;
  if ($[4] !== fixedPixels) {
    t7 = fixedPixels ? [] : ["fit-content"];
    $[4] = fixedPixels;
    $[5] = t7;
  } else t7 = $[5];
  const t8 = !fixedPixels;
  let t9;
  if ($[6] !== fallbackNumericValue || $[7] !== isMixedValue || $[8] !== min || $[9] !== onChange || $[10] !== t6 || $[11] !== t7 || $[12] !== t8 || $[13] !== value) {
    t9 = {
      value,
      onChange,
      isMixedValue,
      min,
      fallbackNumericValue,
      allowedUnits: t6,
      acceptedKeywords: t7,
      allowAuto: t8
    };
    $[6] = fallbackNumericValue;
    $[7] = isMixedValue;
    $[8] = min;
    $[9] = onChange;
    $[10] = t6;
    $[11] = t7;
    $[12] = t8;
    $[13] = value;
    $[14] = t9;
  } else t9 = $[14];
  const unitValue = useUnitValue(t9);
  const isFlexFill = parentIsFlex && (flexValue === "1" || flexValue === "1 1 0%" || flexValue === "1 1 auto");
  let t10;
  if ($[15] !== value) {
    t10 = typeof value === "string" && value.endsWith("%");
    $[15] = value;
    $[16] = t10;
  } else t10 = $[16];
  const isPercent = t10;
  let t11;
  if ($[17] !== isFlexFill || $[18] !== isMixedValue || $[19] !== isPercent || $[20] !== value) {
    t11 = () => {
      if (isMixedValue) return "mixed";
      if (isFlexFill) return "fill";
      if (value === "fit-content") return "hug";
      if (value === "auto" || value === "") return "auto";
      if (isPercent) return "percent";
      return "fixed";
    };
    $[17] = isFlexFill;
    $[18] = isMixedValue;
    $[19] = isPercent;
    $[20] = value;
    $[21] = t11;
  } else t11 = $[21];
  const mode = t11();
  let t12;
  if ($[22] !== fixedPixels || $[23] !== onChange || $[24] !== onFlexChange || $[25] !== parentIsFlex || $[26] !== unitValue) {
    t12 = () => {
      const trimmed = unitValue.draft.trim().toLowerCase();
      if (!fixedPixels && (trimmed === "hug" || trimmed === "fit-content")) onChange("fit-content");else if (!fixedPixels && trimmed === "fill" && parentIsFlex && onFlexChange) onFlexChange("1");else unitValue.commit();
      setEditing(false);
    };
    $[22] = fixedPixels;
    $[23] = onChange;
    $[24] = onFlexChange;
    $[25] = parentIsFlex;
    $[26] = unitValue;
    $[27] = t12;
  } else t12 = $[27];
  const save = t12;
  let t13;
  if ($[28] === Symbol.for("react.memo_cache_sentinel")) {
    t13 = () => {
      setEditing(true);
      setTimeout(() => inputRef.current?.select(), 0);
    };
    $[28] = t13;
  } else t13 = $[28];
  const startEditing = t13;
  let t14;
  if ($[29] !== onChange) {
    t14 = () => onChange("fit-content");
    $[29] = onChange;
    $[30] = t14;
  } else t14 = $[30];
  const setHug = t14;
  let t15;
  if ($[31] !== onFlexChange) {
    t15 = () => onFlexChange?.("1");
    $[31] = onFlexChange;
    $[32] = t15;
  } else t15 = $[32];
  const setFill = t15;
  const displayedValue = isMixedValue ? "-" : mode === "auto" ? t("styles.auto") : mode === "hug" ? t("styles.hug") : mode === "fill" ? t("styles.fill") : unitValue.draft;
  const translatedAriaLabel = translateInspectorText(t, ariaLabel);
  const {
    scrubRef,
    isScrubbing
  } = useInspectorScrub(unitValue.scrubValue, unitValue.applyScrub);
  const t16 = editing || isScrubbing || unitMenuOpen;
  const t17 = unitValue.isInvalid || void 0;
  const t18 = disabled ? void 0 : scrubRef;
  let t19;
  if ($[33] !== label) {
    t19 = <span className="flex size-4 items-center justify-center">{label}</span>;
    $[33] = label;
    $[34] = t19;
  } else t19 = $[34];
  let t20;
  if ($[35] !== t18 || $[36] !== t19) {
    t20 = <InspectorScrubHandle ref={t18} aria-hidden={void 0} className="pl-1 font-normal">{t19}</InspectorScrubHandle>;
    $[35] = t18;
    $[36] = t19;
    $[37] = t20;
  } else t20 = $[37];
  let t21;
  if (true) {
    t21 = editing || unitValue.isInvalid ? <div className="flex h-full min-w-0 flex-1 items-center overflow-hidden">{<div className="relative flex h-full min-w-0 flex-1 items-center">{<InspectorControlInput ref={inputRef} aria-label={translatedAriaLabel} disabled={disabled} value={unitValue.showMixed ? "" : unitValue.draft} onChange={event => {
          setEditing(true);
          unitValue.setDraft(event.target.value);
        }} onBlur={save} onKeyDown={e => {
          blurInspectorInputOnEnter(e);
          if (e.key === "Escape") {
            setEditing(false);
            unitValue.reset();
          }
        }} placeholder={isMixedValue ? "-" : t("styles.auto")} aria-invalid={unitValue.isInvalid || void 0} title={unitValue.errorMessage} autoFocus={true} className="px-1" />}</div>}</div> : <button type="button" onClick={startEditing} aria-label={translatedAriaLabel} disabled={disabled} className={cn$2("h-full min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-1 text-left", "text-ed-inspector-value")}>{displayedValue}</button>;
    $[38] = translatedAriaLabel;
    $[39] = disabled;
    $[40] = displayedValue;
    $[41] = editing;
    $[42] = isMixedValue;
    $[43] = save;
    $[44] = unitValue;
    $[45] = t21;
  } else t21 = $[45];
  let t22;
  if (true) {
    t22 = !fixedPixels && <UnitMenu value={mode === "auto" ? "auto" : mode === "hug" || mode === "fill" ? null : unitValue.selectedUnit} onValueChange={unitValue.selectUnit} label={translatedAriaLabel} showTooltip={false} onOpenChange={setUnitMenuOpen} allowAuto={!fixedPixels} units={fixedPixels ? ["px"] : void 0} selectedMode={mode === "hug" || mode === "fill" ? mode : void 0} modeOptions={fixedPixels ? [] : [{
      value: "hug",
      label: t("styles.hug")
    }, {
      value: "fill",
      label: t("styles.fill"),
      disabled: !onFlexChange || !parentIsFlex
    }]} onModeChange={nextMode => {
      if (nextMode === "hug") setHug();
      if (nextMode === "fill" && parentIsFlex) setFill();
    }} />;
    $[46] = fixedPixels;
    $[47] = label;
    $[48] = mode;
    $[49] = onFlexChange;
    $[50] = parentIsFlex;
    $[51] = setFill;
    $[52] = setHug;
    $[53] = unitValue.selectUnit;
    $[54] = unitValue.selectedUnit;
    $[55] = t22;
  } else t22 = $[55];
  let t23;
  if ($[56] !== t16 || $[57] !== t17 || $[58] !== t20 || $[59] !== t21 || $[60] !== t22) {
    t23 = <div className="min-w-0 overflow-hidden">{<div className="min-w-0">{<InspectorControlShell active={t16} aria-invalid={t17} className="group/dim w-full">{t20}{t21}{t22}</InspectorControlShell>}</div>}</div>;
    $[56] = t16;
    $[57] = t17;
    $[58] = t20;
    $[59] = t21;
    $[60] = t22;
    $[61] = t23;
  } else t23 = $[61];
  return t23;
}

export { DimensionInput };
