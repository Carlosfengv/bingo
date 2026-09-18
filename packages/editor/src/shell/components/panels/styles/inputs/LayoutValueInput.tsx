/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/LayoutValueInput.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useClassSuggestions } from "../../../../hooks/useClassSuggestions";
import { VariableField } from "../../../../../shared/theme/VariableControls";
import { displayValue } from "../../../../utils/cssValue";
import { inspectorPropertySupportsAuto } from "../../../../utils/unitValue";
import { HexDotGlyph } from "../layout/glyphs";
import { InspectorClassPickerIndicator, InspectorControlAction, InspectorControlInput, InspectorControlShell, InspectorScrubHandle, blurInspectorInputOnEnter } from "../primitives";
import { UnitMenu } from "./UnitMenu";
import { ActiveClassChip, ActiveClassUnlinkAction } from "./parts/ActiveClassChip";
import { ClassPickerPopover } from "./parts/ClassPickerPopover";
import { OverrideChip } from "./parts/OverrideChip";
import { useInspectorScrub } from "./useInspectorScrub";
import { useUnitValue } from "./useUnitValue";
import { Popover, PopoverAnchor, PopoverTrigger, SpinnerIcon, cn$2 } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* LayoutValueInput — the muted-shell numeric input used throughout the Layout
* and Appearance sections (padding, gap, opacity, radius, z-index…). Leading
* scrub icon, optional unit suffix, min/max clamping, and a Tailwind-class
* suggestion affordance (HexDot glyph) on the trailing edge.
*/
function LayoutValueInput(props) {
  return <VariableField property={props.cssProperty}><LayoutValueInputControl {...props} /></VariableField>;
}
function LayoutValueInputControl(t0) {
  const $ = (0, import_compiler_runtime.c)(153);
  const {
    icon,
    value,
    onChange,
    placeholder: t1,
    unit: t2,
    suffix,
    inlineSuffix: t3,
    unitPicker: unitPickerProp,
    allowedUnits,
    min,
    max,
    scrubStep,
    scrubPrecision,
    disabled: t4,
    ariaLabel,
    isMixedValue: t5,
    source,
    sourceClass,
    isPending: t6,
    onClearOverride,
    cssProperty,
    tooltipLabel,
    onSelectClass,
    inputClassName,
    modeOptions: t7
  } = t0;
  const placeholder = t1 === void 0 ? "0" : t1;
  const unit = t2 === void 0 ? "px" : t2;
  const inlineSuffix = t3 === void 0 ? false : t3;
  const disabled = t4 === void 0 ? false : t4;
  const isMixedValue = t5 === void 0 ? false : t5;
  const isPending = t6 === void 0 ? false : t6;
  let t8;
  if ($[0] !== t7) {
    t8 = t7 === void 0 ? [] : t7;
    $[0] = t7;
    $[1] = t8;
  } else t8 = $[1];
  const modeOptions = t8;
  const unitPicker = unitPickerProp ?? unit === "px";
  const [unitMenuOpen, setUnitMenuOpen] = import_react.useState(false);
  const [isInputFocused, setIsInputFocused] = import_react.useState(false);
  let t9;
  if ($[2] !== cssProperty) {
    t9 = inspectorPropertySupportsAuto(cssProperty);
    $[2] = cssProperty;
    $[3] = t9;
  } else t9 = $[3];
  const allowAuto = t9;
  let t10;
  if ($[4] !== allowedUnits || $[5] !== unit || $[6] !== unitPicker) {
    t10 = unitPicker ? allowedUnits : unit ? [unit] : [];
    $[4] = allowedUnits;
    $[5] = unit;
    $[6] = unitPicker;
    $[7] = t10;
  } else t10 = $[7];
  let t11;
  if ($[8] !== modeOptions) {
    t11 = modeOptions.map(_temp$47);
    $[8] = modeOptions;
    $[9] = t11;
  } else t11 = $[9];
  let t12;
  if ($[10] !== allowAuto || $[11] !== isMixedValue || $[12] !== max || $[13] !== min || $[14] !== onChange || $[15] !== t10 || $[16] !== t11 || $[17] !== unit || $[18] !== value) {
    t12 = {
      value,
      onChange,
      isMixedValue,
      defaultUnit: unit,
      min,
      max,
      allowedUnits: t10,
      allowAuto,
      acceptedKeywords: t11
    };
    $[10] = allowAuto;
    $[11] = isMixedValue;
    $[12] = max;
    $[13] = min;
    $[14] = onChange;
    $[15] = t10;
    $[16] = t11;
    $[17] = unit;
    $[18] = value;
    $[19] = t12;
  } else t12 = $[19];
  const unitValue = useUnitValue(t12);
  const {
    showSuggestions,
    setShowSuggestions,
    hasSuggestions,
    allSuggestions
  } = useClassSuggestions(cssProperty, onSelectClass);
  const displayedSuffix = suffix ?? unit;
  const inlineFixedSuffix = !unitPicker && (unit === "%" || inlineSuffix && !!suffix);
  let t13;
  if ($[20] !== inlineFixedSuffix || $[21] !== isInputFocused || $[22] !== unitValue.draft || $[23] !== unitValue.isInvalid || $[24] !== unitValue.showMixed) {
    t13 = inlineFixedSuffix && !isInputFocused && !unitValue.isInvalid && !unitValue.showMixed && unitValue.draft !== "" && unitValue.draft.toLowerCase() !== "auto";
    $[20] = inlineFixedSuffix;
    $[21] = isInputFocused;
    $[22] = unitValue.draft;
    $[23] = unitValue.isInvalid;
    $[24] = unitValue.showMixed;
    $[25] = t13;
  } else t13 = $[25];
  const showInlineFixedSuffix = t13;
  let t14;
  if ($[26] !== modeOptions || $[27] !== unitValue.draft) {
    let t15;
    if ($[29] !== unitValue.draft) {
      t15 = option_0 => option_0.value === unitValue.draft.trim().toLowerCase();
      $[29] = unitValue.draft;
      $[30] = t15;
    } else t15 = $[30];
    t14 = modeOptions.find(t15);
    $[26] = modeOptions;
    $[27] = unitValue.draft;
    $[28] = t14;
  } else t14 = $[28];
  const activeMode = t14;
  const idleModeLabel = isInputFocused ? void 0 : activeMode?.label;
  let t15;
  if ($[31] !== displayedSuffix || $[32] !== inlineFixedSuffix || $[33] !== unitPicker || $[34] !== unitValue.draft || $[35] !== unitValue.isInvalid || $[36] !== unitValue.showMixed) {
    t15 = !unitPicker && !inlineFixedSuffix && displayedSuffix && !unitValue.isInvalid && !unitValue.showMixed && unitValue.draft !== "" && unitValue.draft.toLowerCase() !== "auto";
    $[31] = displayedSuffix;
    $[32] = inlineFixedSuffix;
    $[33] = unitPicker;
    $[34] = unitValue.draft;
    $[35] = unitValue.isInvalid;
    $[36] = unitValue.showMixed;
    $[37] = t15;
  } else t15 = $[37];
  const unitSuffix = t15;
  const inputPaddingClass = unitSuffix ? "pl-1 pr-0" : "px-1";
  let t16;
  if ($[38] !== displayedSuffix || $[39] !== unitSuffix) {
    t16 = unitSuffix ? <span className="flex shrink-0 items-center pr-1.5 text-[11px] font-normal text-ed-inspector-chrome">{displayedSuffix}</span> : null;
    $[38] = displayedSuffix;
    $[39] = unitSuffix;
    $[40] = t16;
  } else t16 = $[40];
  const unitSuffixElement = t16;
  let t17;
  if ($[41] !== inputClassName || $[42] !== inputPaddingClass) {
    t17 = cn$2(inputPaddingClass, "truncate", inputClassName);
    $[41] = inputClassName;
    $[42] = inputPaddingClass;
    $[43] = t17;
  } else t17 = $[43];
  const resolvedInputClassName = t17;
  let t18;
  if ($[44] !== ariaLabel || $[45] !== disabled || $[46] !== displayedSuffix || $[47] !== idleModeLabel || $[48] !== inlineFixedSuffix || $[49] !== placeholder || $[50] !== resolvedInputClassName || $[51] !== showInlineFixedSuffix || $[52] !== tooltipLabel || $[53] !== unitValue) {
    t18 = () => <InspectorControlInput value={unitValue.showMixed ? "" : showInlineFixedSuffix ? `${unitValue.draft}${displayedSuffix}` : idleModeLabel ?? unitValue.draft} selectOnFocus={!inlineFixedSuffix && !idleModeLabel} onChange={event => unitValue.setDraft(event.target.value)} onFocus={event_0 => {
      setIsInputFocused(true);
      if (inlineFixedSuffix || idleModeLabel) {
        const input = event_0.currentTarget;
        requestAnimationFrame(() => input.select());
      }
    }} onBlur={() => {
      setIsInputFocused(false);
      unitValue.commit();
    }} onKeyDown={blurInspectorInputOnEnter} placeholder={unitValue.showMixed ? "-" : placeholder} disabled={disabled} aria-label={ariaLabel} aria-invalid={unitValue.isInvalid || void 0} tooltip={unitValue.errorMessage ?? tooltipLabel} className={resolvedInputClassName} />;
    $[44] = ariaLabel;
    $[45] = disabled;
    $[46] = displayedSuffix;
    $[47] = idleModeLabel;
    $[48] = inlineFixedSuffix;
    $[49] = placeholder;
    $[50] = resolvedInputClassName;
    $[51] = showInlineFixedSuffix;
    $[52] = tooltipLabel;
    $[53] = unitValue;
    $[54] = t18;
  } else t18 = $[54];
  const renderInput = t18;
  let t19;
  if ($[55] !== activeMode?.value || $[56] !== allowAuto || $[57] !== allowedUnits || $[58] !== cssProperty || $[59] !== modeOptions || $[60] !== onChange || $[61] !== tooltipLabel || $[62] !== unitPicker || $[63] !== unitValue.selectUnit || $[64] !== unitValue.selectedUnit) {
    t19 = unitPicker && <UnitMenu value={unitValue.selectedUnit} onValueChange={unitValue.selectUnit} label={cssProperty ?? "Value"} onOpenChange={setUnitMenuOpen} allowAuto={allowAuto} units={allowedUnits} modeOptions={modeOptions} selectedMode={activeMode?.value} onModeChange={onChange} showTooltip={Boolean(tooltipLabel)} />;
    $[55] = activeMode?.value;
    $[56] = allowAuto;
    $[57] = allowedUnits;
    $[58] = cssProperty;
    $[59] = modeOptions;
    $[60] = onChange;
    $[61] = tooltipLabel;
    $[62] = unitPicker;
    $[63] = unitValue.selectUnit;
    $[64] = unitValue.selectedUnit;
    $[65] = t19;
  } else t19 = $[65];
  let t20;
  if ($[66] !== t19 || $[67] !== unitSuffixElement) {
    t20 = <>{unitSuffixElement}{t19}</>;
    $[66] = t19;
    $[67] = unitSuffixElement;
    $[68] = t20;
  } else t20 = $[68];
  const unitControl = t20;
  let t21;
  if ($[69] !== scrubPrecision || $[70] !== scrubStep) {
    t21 = {
      step: scrubStep,
      precision: scrubPrecision
    };
    $[69] = scrubPrecision;
    $[70] = scrubStep;
    $[71] = t21;
  } else t21 = $[71];
  const {
    scrubRef,
    isScrubbing
  } = useInspectorScrub(unitValue.scrubValue, unitValue.applyScrub, t21);
  const t22 = disabled ? void 0 : scrubRef;
  let t23;
  if ($[72] !== icon || $[73] !== t22) {
    t23 = <InspectorScrubHandle ref={t22}>{icon}</InspectorScrubHandle>;
    $[72] = icon;
    $[73] = t22;
    $[74] = t23;
  } else t23 = $[74];
  let t24;
  if ($[75] !== renderInput) {
    t24 = renderInput();
    $[75] = renderInput;
    $[76] = t24;
  } else t24 = $[76];
  let t25;
  if ($[77] !== hasSuggestions || $[78] !== isPending || $[79] !== onClearOverride || $[80] !== source || $[81] !== sourceClass) {
    t25 = sourceClass && source === "inline" ? <OverrideChip sourceClass={sourceClass} onClearOverride={onClearOverride} className="max-w-13.5" /> : hasSuggestions ? <PopoverTrigger asChild={true}>{<InspectorControlAction aria-label="Apply class" className="w-0 overflow-hidden px-0 text-ed-inspector-chrome group-hover/inspector-control:w-6 group-hover/inspector-control:px-1 group-focus-within/inspector-control:w-6 group-focus-within/inspector-control:px-1 group-data-[active=true]/inspector-control:w-6 group-data-[active=true]/inspector-control:px-1" title="Apply class">{isPending ? <SpinnerIcon className="animate-spin" /> : <InspectorClassPickerIndicator>{<HexDotGlyph />}</InspectorClassPickerIndicator>}</InspectorControlAction>}</PopoverTrigger> : null;
    $[77] = hasSuggestions;
    $[78] = isPending;
    $[79] = onClearOverride;
    $[80] = source;
    $[81] = sourceClass;
    $[82] = t25;
  } else t25 = $[82];
  let t26;
  if ($[83] !== t23 || $[84] !== t24 || $[85] !== t25 || $[86] !== unitControl) {
    t26 = <>{t23}{t24}{t25}{unitControl}</>;
    $[83] = t23;
    $[84] = t24;
    $[85] = t25;
    $[86] = unitControl;
    $[87] = t26;
  } else t26 = $[87];
  const inputControl = t26;
  if (sourceClass && source === "class") {
    let t27;
    if ($[88] !== value) {
      t27 = displayValue(value);
      $[88] = value;
      $[89] = t27;
    } else t27 = $[89];
    let t28;
    if ($[90] !== isPending || $[91] !== sourceClass || $[92] !== t27 || $[93] !== tooltipLabel) {
      t28 = <ActiveClassChip sourceClass={sourceClass} fieldTooltip={tooltipLabel} value={t27} isPending={isPending} />;
      $[90] = isPending;
      $[91] = sourceClass;
      $[92] = t27;
      $[93] = tooltipLabel;
      $[94] = t28;
    } else t28 = $[94];
    const classChip = t28;
    let t29;
    if ($[95] !== onClearOverride) {
      t29 = onClearOverride ? <ActiveClassUnlinkAction onClear={onClearOverride} /> : null;
      $[95] = onClearOverride;
      $[96] = t29;
    } else t29 = $[96];
    const clearAction = t29;
    if (!hasSuggestions) {
      const t30 = isScrubbing || unitMenuOpen;
      const t31 = disabled ? void 0 : scrubRef;
      let t32;
      if ($[97] !== icon || $[98] !== t31) {
        t32 = <InspectorScrubHandle ref={t31}>{icon}</InspectorScrubHandle>;
        $[97] = icon;
        $[98] = t31;
        $[99] = t32;
      } else t32 = $[99];
      let t33;
      if ($[100] !== classChip || $[101] !== clearAction || $[102] !== t30 || $[103] !== t32) {
        t33 = <InspectorControlShell active={t30}>{t32}{classChip}{clearAction}</InspectorControlShell>;
        $[100] = classChip;
        $[101] = clearAction;
        $[102] = t30;
        $[103] = t32;
        $[104] = t33;
      } else t33 = $[104];
      return t33;
    }
    const t30 = isScrubbing || showSuggestions || unitMenuOpen;
    const t31 = disabled ? void 0 : scrubRef;
    let t32;
    if ($[105] !== icon || $[106] !== t31) {
      t32 = <InspectorScrubHandle ref={t31}>{icon}</InspectorScrubHandle>;
      $[105] = icon;
      $[106] = t31;
      $[107] = t32;
    } else t32 = $[107];
    let t33;
    if ($[108] !== classChip) {
      t33 = <PopoverTrigger asChild={true}>{<InspectorControlAction className="min-w-0 flex-1 justify-start p-0">{classChip}</InspectorControlAction>}</PopoverTrigger>;
      $[108] = classChip;
      $[109] = t33;
    } else t33 = $[109];
    let t34;
    if ($[110] !== clearAction || $[111] !== t30 || $[112] !== t32 || $[113] !== t33) {
      t34 = <PopoverAnchor asChild={true}>{<InspectorControlShell active={t30}>{t32}{t33}{clearAction}</InspectorControlShell>}</PopoverAnchor>;
      $[110] = clearAction;
      $[111] = t30;
      $[112] = t32;
      $[113] = t33;
      $[114] = t34;
    } else t34 = $[114];
    let t35;
    if ($[115] !== onSelectClass) {
      t35 = cls => onSelectClass?.(cls);
      $[115] = onSelectClass;
      $[116] = t35;
    } else t35 = $[116];
    let t36;
    if ($[117] !== setShowSuggestions) {
      t36 = () => setShowSuggestions(false);
      $[117] = setShowSuggestions;
      $[118] = t36;
    } else t36 = $[118];
    let t37;
    if ($[119] !== allSuggestions || $[120] !== cssProperty || $[121] !== sourceClass || $[122] !== t35 || $[123] !== t36) {
      t37 = <ClassPickerPopover suggestions={allSuggestions} cssProperty={cssProperty} sourceClass={sourceClass} onSelect={t35} onClose={t36} />;
      $[119] = allSuggestions;
      $[120] = cssProperty;
      $[121] = sourceClass;
      $[122] = t35;
      $[123] = t36;
      $[124] = t37;
    } else t37 = $[124];
    let t38;
    if ($[125] !== setShowSuggestions || $[126] !== showSuggestions || $[127] !== t34 || $[128] !== t37) {
      t38 = <Popover open={showSuggestions} onOpenChange={setShowSuggestions} modal={false}>{t34}{t37}</Popover>;
      $[125] = setShowSuggestions;
      $[126] = showSuggestions;
      $[127] = t34;
      $[128] = t37;
      $[129] = t38;
    } else t38 = $[129];
    return t38;
  }
  if (hasSuggestions) {
    const t27 = isScrubbing || showSuggestions || unitMenuOpen;
    const t28 = unitValue.isInvalid || void 0;
    let t29;
    if ($[130] !== inputControl || $[131] !== t27 || $[132] !== t28) {
      t29 = <InspectorControlShell active={t27} aria-invalid={t28}>{inputControl}</InspectorControlShell>;
      $[130] = inputControl;
      $[131] = t27;
      $[132] = t28;
      $[133] = t29;
    } else t29 = $[133];
    let t30;
    if ($[134] !== onSelectClass) {
      t30 = cls_0 => onSelectClass?.(cls_0);
      $[134] = onSelectClass;
      $[135] = t30;
    } else t30 = $[135];
    let t31;
    if ($[136] !== setShowSuggestions) {
      t31 = () => setShowSuggestions(false);
      $[136] = setShowSuggestions;
      $[137] = t31;
    } else t31 = $[137];
    let t32;
    if ($[138] !== allSuggestions || $[139] !== cssProperty || $[140] !== sourceClass || $[141] !== t30 || $[142] !== t31) {
      t32 = <ClassPickerPopover suggestions={allSuggestions} cssProperty={cssProperty} sourceClass={sourceClass} onSelect={t30} onClose={t31} />;
      $[138] = allSuggestions;
      $[139] = cssProperty;
      $[140] = sourceClass;
      $[141] = t30;
      $[142] = t31;
      $[143] = t32;
    } else t32 = $[143];
    let t33;
    if ($[144] !== setShowSuggestions || $[145] !== showSuggestions || $[146] !== t29 || $[147] !== t32) {
      t33 = <Popover open={showSuggestions} onOpenChange={setShowSuggestions} modal={false}>{t29}{t32}</Popover>;
      $[144] = setShowSuggestions;
      $[145] = showSuggestions;
      $[146] = t29;
      $[147] = t32;
      $[148] = t33;
    } else t33 = $[148];
    return t33;
  }
  const t27 = isScrubbing || unitMenuOpen;
  const t28 = unitValue.isInvalid || void 0;
  let t29;
  if ($[149] !== inputControl || $[150] !== t27 || $[151] !== t28) {
    t29 = <InspectorControlShell active={t27} aria-invalid={t28}>{inputControl}</InspectorControlShell>;
    $[149] = inputControl;
    $[150] = t27;
    $[151] = t28;
    $[152] = t29;
  } else t29 = $[152];
  return t29;
}
function _temp$47(option) {
  return option.value;
}

export { LayoutValueInput };
