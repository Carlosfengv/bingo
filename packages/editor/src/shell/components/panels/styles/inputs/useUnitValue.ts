/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/useUnitValue.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { commitInspectorUnitValue, getInspectorUnitInputValue, getInspectorUnitNumericValue, getInspectorUnitSelection, parseInspectorUnitValue } from "../../../../utils/unitValue";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function localizedUnitInputValue(value, autoLabel) {
  return parseInspectorUnitValue(value).kind === "auto" ? autoLabel : getInspectorUnitInputValue(value);
}
function useUnitValue(t0) {
  const $ = (0, import_compiler_runtime.c)(78);
  const { t } = useTranslation("editor");
  const autoLabel = t("styles.auto");
  const {
    value,
    onChange,
    isMixedValue: t1,
    defaultUnit: t2,
    min,
    max,
    fallbackNumericValue,
    strictUnits: t3,
    acceptedKeywords: t4,
    allowedUnits,
    preserveUnitless: t5,
    allowAuto: t6
  } = t0;
  const isMixedValue = t1 === void 0 ? false : t1;
  const defaultUnit = t2 === void 0 ? "px" : t2;
  const strictUnits = t3 === void 0 ? true : t3;
  let t7;
  if ($[0] !== t4) {
    t7 = t4 === void 0 ? [] : t4;
    $[0] = t4;
    $[1] = t7;
  } else t7 = $[1];
  const acceptedKeywords = t7;
  const preserveUnitless = t5 === void 0 ? false : t5;
  const allowAuto = t6 === void 0 ? false : t6;
  let t8;
  if ($[2] !== value) {
    t8 = parseInspectorUnitValue(value);
    $[2] = value;
    $[3] = t8;
  } else t8 = $[3];
  const initialParsed = t8;
  let t9;
  if ($[4] !== isMixedValue || $[5] !== value) {
    t9 = isMixedValue ? "" : localizedUnitInputValue(value, autoLabel);
    $[4] = isMixedValue;
    $[5] = value;
    $[6] = t9;
  } else t9 = $[6];
  const [draft, setDraftState] = import_react.useState(t9);
  const [activeUnit, setActiveUnit] = import_react.useState(initialParsed.kind === "number" ? initialParsed.unit || (preserveUnitless ? "" : defaultUnit) : null);
  const [isDirty, setIsDirty] = import_react.useState(false);
  const [isInvalid, setIsInvalid] = import_react.useState(false);
  const [showMixed, setShowMixed] = import_react.useState(isMixedValue);
  let t10;
  const resetKey = `${autoLabel}\u0000${defaultUnit}`;
  if ($[7] !== resetKey || $[8] !== isMixedValue || $[9] !== preserveUnitless || $[10] !== value) {
    t10 = () => {
      const parsed = parseInspectorUnitValue(value);
      setDraftState(isMixedValue ? "" : localizedUnitInputValue(value, autoLabel));
      setActiveUnit(parsed.kind === "number" ? parsed.unit || (preserveUnitless ? "" : defaultUnit) : null);
      setIsDirty(false);
      setIsInvalid(false);
      setShowMixed(isMixedValue);
    };
    $[7] = resetKey;
    $[8] = isMixedValue;
    $[9] = preserveUnitless;
    $[10] = value;
    $[11] = t10;
  } else t10 = $[11];
  const reset = t10;
  let t11;
  let t12;
  if ($[12] !== reset) {
    t11 = () => reset();
    t12 = [reset];
    $[12] = reset;
    $[13] = t11;
    $[14] = t12;
  } else {
    t11 = $[13];
    t12 = $[14];
  }
  import_react.useEffect(t11, t12);
  let t13;
  if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
    t13 = next => {
      setDraftState(next);
      setIsDirty(true);
      setIsInvalid(false);
      setShowMixed(false);
    };
    $[15] = t13;
  } else t13 = $[15];
  const setDraft = t13;
  let t14;
  const localizedDraftKey = `${autoLabel}\u0000${draft}`;
  if ($[16] !== acceptedKeywords || $[17] !== activeUnit || $[18] !== allowAuto || $[19] !== allowedUnits || $[20] !== defaultUnit || $[21] !== localizedDraftKey || $[22] !== isDirty || $[23] !== max || $[24] !== min || $[25] !== onChange || $[26] !== showMixed || $[27] !== strictUnits) {
    t14 = () => {
      if (draft === "" && showMixed || !isDirty) return true;
      const normalizedDraft = draft.trim().toLocaleLowerCase() === autoLabel.toLocaleLowerCase() ? "auto" : draft;
      if (!strictUnits) {
        const nextValue = normalizedDraft.trim();
        setDraftState(nextValue);
        setActiveUnit(null);
        setIsDirty(false);
        setIsInvalid(false);
        onChange(nextValue);
        return true;
      }
      const normalizedKeyword = normalizedDraft.trim().toLowerCase();
      if (acceptedKeywords.includes(normalizedKeyword)) {
        setDraftState(normalizedKeyword);
        setActiveUnit(null);
        setIsDirty(false);
        setIsInvalid(false);
        onChange(normalizedKeyword);
        return true;
      }
      const result = commitInspectorUnitValue(normalizedDraft, activeUnit ?? defaultUnit, {
        min,
        max,
        allowAuto
      });
      if (!result.valid) {
        setIsInvalid(true);
        return false;
      }
      if (result.unit && allowedUnits && !allowedUnits.includes(result.unit)) {
        setIsInvalid(true);
        return false;
      }
      setDraftState(result.inputValue);
      setActiveUnit(result.unit);
      setIsDirty(false);
      setIsInvalid(false);
      onChange(result.cssValue);
      return true;
    };
    $[16] = acceptedKeywords;
    $[17] = activeUnit;
    $[18] = allowAuto;
    $[19] = allowedUnits;
    $[20] = defaultUnit;
    $[21] = localizedDraftKey;
    $[22] = isDirty;
    $[23] = max;
    $[24] = min;
    $[25] = onChange;
    $[26] = showMixed;
    $[27] = strictUnits;
    $[28] = t14;
  } else t14 = $[28];
  const commit = t14;
  let t15;
  if ($[29] !== allowAuto || $[30] !== localizedDraftKey || $[31] !== fallbackNumericValue || $[32] !== max || $[33] !== min || $[34] !== onChange || $[35] !== value) {
    t15 = selection => {
      if (selection === "auto") {
        if (!allowAuto) {
          setIsInvalid(true);
          return;
        }
        setDraftState(autoLabel);
        setActiveUnit(null);
        setIsDirty(false);
        setIsInvalid(false);
        setShowMixed(false);
        onChange("auto");
        return;
      }
      let numericValue = getInspectorUnitNumericValue(draft, value) ?? fallbackNumericValue ?? 0;
      if (min !== void 0) numericValue = Math.max(min, numericValue);
      if (max !== void 0) numericValue = Math.min(max, numericValue);
      const nextDraft = String(numericValue);
      setDraftState(nextDraft);
      setActiveUnit(selection);
      setIsDirty(false);
      setIsInvalid(false);
      setShowMixed(false);
      onChange(`${nextDraft}${selection}`);
    };
    $[29] = allowAuto;
    $[30] = localizedDraftKey;
    $[31] = fallbackNumericValue;
    $[32] = max;
    $[33] = min;
    $[34] = onChange;
    $[35] = value;
    $[36] = t15;
  } else t15 = $[36];
  const selectUnit = t15;
  let t16;
  if ($[37] !== draft || $[38] !== fallbackNumericValue || $[39] !== value) {
    t16 = () => getInspectorUnitNumericValue(value, draft) ?? fallbackNumericValue ?? 0;
    $[37] = draft;
    $[38] = fallbackNumericValue;
    $[39] = value;
    $[40] = t16;
  } else t16 = $[40];
  const scrubValue = t16;
  let t17;
  if ($[41] !== activeUnit || $[42] !== defaultUnit || $[43] !== max || $[44] !== min || $[45] !== onChange || $[46] !== preserveUnitless || $[47] !== value) {
    t17 = next_0 => {
      let numericValue_0 = next_0;
      if (min !== void 0) numericValue_0 = Math.max(min, numericValue_0);
      if (max !== void 0) numericValue_0 = Math.min(max, numericValue_0);
      const nextDraft_0 = String(numericValue_0);
      const parsedValue = parseInspectorUnitValue(value);
      const unit = parsedValue.kind === "number" ? parsedValue.unit || (preserveUnitless ? "" : defaultUnit) : activeUnit ?? defaultUnit;
      setDraftState(nextDraft_0);
      setActiveUnit(unit);
      setIsDirty(false);
      setIsInvalid(false);
      setShowMixed(false);
      onChange(`${nextDraft_0}${unit}`);
    };
    $[41] = activeUnit;
    $[42] = defaultUnit;
    $[43] = max;
    $[44] = min;
    $[45] = onChange;
    $[46] = preserveUnitless;
    $[47] = value;
    $[48] = t17;
  } else t17 = $[48];
  const applyScrub = t17;
  let t18;
  if ($[49] !== activeUnit || $[50] !== localizedDraftKey || $[51] !== value) {
    t18 = draft.trim().toLocaleLowerCase() === autoLabel.toLocaleLowerCase() || draft.trim().toLowerCase() === "auto" ? "auto" : activeUnit || getInspectorUnitSelection(value);
    $[49] = activeUnit;
    $[50] = localizedDraftKey;
    $[51] = value;
    $[52] = t18;
  } else t18 = $[52];
  const selectedUnit = t18;
  let t19;
  let t20;
  let t21;
  let t22;
  let t23;
  let t24;
  if ($[53] !== allowAuto || $[54] !== allowedUnits || $[55] !== localizedDraftKey || $[56] !== isDirty || $[57] !== isInvalid || $[58] !== showMixed) {
    const supportedValueDescription = [...(allowedUnits ?? ["px", "%", "em", "rem", "ch"]), ...(allowAuto ? [autoLabel] : [])];
    t19 = draft;
    t20 = setDraft;
    t21 = showMixed;
    t22 = isDirty;
    t23 = isInvalid;
    t24 = isInvalid ? t("styles.supportedValuesHint", { values: supportedValueDescription.join(", ") }) : void 0;
    $[53] = allowAuto;
    $[54] = allowedUnits;
    $[55] = localizedDraftKey;
    $[56] = isDirty;
    $[57] = isInvalid;
    $[58] = showMixed;
    $[59] = t19;
    $[60] = t20;
    $[61] = t21;
    $[62] = t22;
    $[63] = t23;
    $[64] = t24;
  } else {
    t19 = $[59];
    t20 = $[60];
    t21 = $[61];
    t22 = $[62];
    t23 = $[63];
    t24 = $[64];
  }
  let t25;
  if ($[65] !== applyScrub || $[66] !== commit || $[67] !== reset || $[68] !== scrubValue || $[69] !== selectUnit || $[70] !== selectedUnit || $[71] !== t19 || $[72] !== t20 || $[73] !== t21 || $[74] !== t22 || $[75] !== t23 || $[76] !== t24) {
    t25 = {
      draft: t19,
      setDraft: t20,
      showMixed: t21,
      isDirty: t22,
      isInvalid: t23,
      errorMessage: t24,
      selectedUnit,
      commit,
      reset,
      selectUnit,
      scrubValue,
      applyScrub
    };
    $[65] = applyScrub;
    $[66] = commit;
    $[67] = reset;
    $[68] = scrubValue;
    $[69] = selectUnit;
    $[70] = selectedUnit;
    $[71] = t19;
    $[72] = t20;
    $[73] = t21;
    $[74] = t22;
    $[75] = t23;
    $[76] = t24;
    $[77] = t25;
  } else t25 = $[77];
  return t25;
}

export { useUnitValue };
