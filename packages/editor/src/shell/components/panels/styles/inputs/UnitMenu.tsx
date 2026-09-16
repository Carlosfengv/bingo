/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/UnitMenu.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { INSPECTOR_LENGTH_UNITS } from "../../../../utils/unitValue";
import { releaseInspectorControlFocus } from "../primitives";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue, Tooltip, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import { translateInspectorText } from "../inspectorCopy";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function unitLabel(value, selectedMode) {
  if (selectedMode || !value || value === "auto") return "–";
  return value;
}
function menuUnitLabel(value) {
  return value === "auto" ? "Auto" : value;
}
function UnitMenu(t0) {
  const $ = (0, import_compiler_runtime.c)(42);
  const { t } = useTranslation("editor");
  const {
    value,
    onValueChange,
    label: t1,
    className,
    onOpenChange,
    allowAuto: t2,
    units: t3,
    modeOptions: t4,
    selectedMode,
    onModeChange,
    showTooltip: t5
  } = t0;
  const label = t1 === void 0 ? "Value" : t1;
  const allowAuto = t2 === void 0 ? false : t2;
  const units = t3 === void 0 ? INSPECTOR_LENGTH_UNITS : t3;
  let t6;
  if ($[0] !== t4) {
    t6 = t4 === void 0 ? [] : t4;
    $[0] = t4;
    $[1] = t6;
  } else t6 = $[1];
  const modeOptions = t6;
  const showTooltip = t5 === void 0 ? true : t5;
  const triggerRef = import_react.useRef(null);
  const selectedValue = selectedMode ?? value ?? "auto";
  const hasModeOptions = allowAuto || modeOptions.length > 0;
  const isUnitlessMode = !value || value === "auto" || Boolean(selectedMode);
  let t7;
  if ($[2] !== modeOptions || $[3] !== onModeChange || $[4] !== onValueChange) {
    t7 = nextValue => {
      if (modeOptions.some(option => option.value === nextValue)) {
        onModeChange?.(nextValue);
        return;
      }
      onValueChange(nextValue);
    };
    $[2] = modeOptions;
    $[3] = onModeChange;
    $[4] = onValueChange;
    $[5] = t7;
  } else t7 = $[5];
  const localizedLabel = translateInspectorText(t, label);
  const t8 = t("styles.unitPicker", { label: localizedLabel });
  const t9 = showTooltip ? void 0 : false;
  const t10 = t("styles.currentUnit", { label: localizedLabel, unit: selectedMode ?? value ?? t("styles.unset") });
  const t11 = isUnitlessMode ? "opacity-0 group-hover/inspector-control:opacity-100 group-focus-within/inspector-control:opacity-100 group-data-[active=true]/inspector-control:opacity-100 [&>span]:invisible [&>span]:absolute [&>span]:right-1.5 [&>span]:top-1/2 [&>span]:-translate-y-1/2 [&>svg]:size-3.5 [&>svg]:opacity-100" : "[&>svg]:hidden";
  let t12;
  if ($[6] !== className || $[7] !== t11) {
    t12 = cn$2("relative h-full w-auto min-w-6 gap-0 rounded-none border-0 bg-transparent px-1.5 py-0 text-[11px] font-normal tabular-nums text-ed-inspector-chrome shadow-none before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-ed-field-border before:opacity-0 before:content-[''] group-hover/inspector-control:before:opacity-100 group-focus-within/inspector-control:before:bg-ed-inspector-active-border group-focus-within/inspector-control:before:opacity-100 group-data-[active=true]/inspector-control:before:bg-ed-inspector-active-border group-data-[active=true]/inspector-control:before:opacity-100 group-aria-invalid/inspector-control:before:bg-ed-destructive hover:text-ed-foreground-secondary focus:text-ed-foreground-secondary focus:ring-0 data-[state=open]:text-ed-foreground-secondary", t11, className);
    $[6] = className;
    $[7] = t11;
    $[8] = t12;
  } else t12 = $[8];
  let t13;
  if ($[9] !== selectedMode || $[10] !== value) {
    t13 = unitLabel(value, selectedMode);
    $[9] = selectedMode;
    $[10] = value;
    $[11] = t13;
  } else t13 = $[11];
  let t14;
  if ($[12] !== t13) {
    t14 = <SelectValue>{t13}</SelectValue>;
    $[12] = t13;
    $[13] = t14;
  } else t14 = $[13];
  let t15;
  if ($[14] !== t10 || $[15] !== t12 || $[16] !== t14) {
    t15 = <SelectTrigger ref={triggerRef} aria-label={t10} className={t12}>{t14}</SelectTrigger>;
    $[14] = t10;
    $[15] = t12;
    $[16] = t14;
    $[17] = t15;
  } else t15 = $[17];
  let t16;
  if ($[18] !== t15 || $[19] !== t8 || $[20] !== t9) {
    t16 = <Tooltip content={t8} open={t9}>{t15}</Tooltip>;
    $[18] = t15;
    $[19] = t8;
    $[20] = t9;
    $[21] = t16;
  } else t16 = $[21];
  let t17;
  if ($[22] === Symbol.for("react.memo_cache_sentinel")) {
    t17 = event => {
      releaseInspectorControlFocus(event);
      triggerRef.current?.blur();
    };
    $[22] = t17;
  } else t17 = $[22];
  let t18;
  if ($[23] !== units) {
    t18 = units.map(_temp$49);
    $[23] = units;
    $[24] = t18;
  } else t18 = $[24];
  let t19;
  if ($[25] !== hasModeOptions) {
    t19 = hasModeOptions && <SelectSeparator />;
    $[25] = hasModeOptions;
    $[26] = t19;
  } else t19 = $[26];
  let t20;
  if (true) {
    t20 = allowAuto && <SelectItem value="auto" className="justify-start gap-1.5 [&>span:first-child]:ml-0">{t("styles.auto")}</SelectItem>;
    $[27] = allowAuto;
    $[28] = t20;
  } else t20 = $[28];
  let t21;
  if (true) {
    t21 = modeOptions.map(option => <SelectItem key={option.value} value={option.value} disabled={option.disabled} className="justify-start gap-1.5 [&>span:first-child]:ml-0">{translateInspectorText(t, option.label)}</SelectItem>);
    $[29] = modeOptions;
    $[30] = t21;
  } else t21 = $[30];
  let t22;
  if ($[31] !== t18 || $[32] !== t19 || $[33] !== t20 || $[34] !== t21) {
    t22 = <SelectContent position="item-aligned" className="w-max min-w-0" onCloseAutoFocus={t17}>{t18}{t19}{t20}{t21}</SelectContent>;
    $[31] = t18;
    $[32] = t19;
    $[33] = t20;
    $[34] = t21;
    $[35] = t22;
  } else t22 = $[35];
  let t23;
  if ($[36] !== onOpenChange || $[37] !== selectedValue || $[38] !== t16 || $[39] !== t22 || $[40] !== t7) {
    t23 = <Select value={selectedValue} onValueChange={t7} onOpenChange={onOpenChange}>{t16}{t22}</Select>;
    $[36] = onOpenChange;
    $[37] = selectedValue;
    $[38] = t16;
    $[39] = t22;
    $[40] = t7;
    $[41] = t23;
  } else t23 = $[41];
  return t23;
}
function _temp2$37(option_1) {
  return <SelectItem key={option_1.value} value={option_1.value} disabled={option_1.disabled} className="justify-start gap-1.5 [&>span:first-child]:ml-0">{option_1.label}</SelectItem>;
}
function _temp$49(option_0) {
  return <SelectItem key={option_0} value={option_0} className="justify-start gap-1.5 [&>span:first-child]:ml-0">{menuUnitLabel(option_0)}</SelectItem>;
}

export { UnitMenu };
