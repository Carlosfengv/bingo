import { VariableBindingControl } from "../../../../../shared/theme/VariableControls";
import { useVariableEditor } from "../../../../../shared/theme/VariableContext";
/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/InlineInput.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useClassSuggestions } from "../../../../hooks/useClassSuggestions";
import { displayValue } from "../../../../utils/cssValue";
import { inspectorPropertySupportsAuto } from "../../../../utils/unitValue";
import { InspectorClassPickerIndicator, InspectorControlAction, InspectorControlInput, InspectorControlShell, InspectorScrubHandle, blurInspectorInputOnEnter } from "../primitives";
import { UnitMenu } from "./UnitMenu";
import { ActiveClassChip, ActiveClassUnlinkAction } from "./parts/ActiveClassChip";
import { ClassPickerPopover } from "./parts/ClassPickerPopover";
import { useInspectorScrub } from "./useInspectorScrub";
import { useUnitValue } from "./useUnitValue";
import { AddVariableIcon, Popover, PopoverAnchor, PopoverTrigger, Tooltip, XIcon, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* InlineInput — labelled text input with an optional unit suffix, scrub-on-
* label-drag, and a Tailwind-class suggestion popover. Renders one of four
* states: active class chip, inline override (class struck through),
* normal-with-suggestions, or plain input.
*/
function InlineInput(t0) {
  const variableEditor = useVariableEditor();
  const variableBound = variableEditor?.ids.some(id => variableEditor.bindingFor(id, t0.cssProperty));
  const $ = (0, import_compiler_runtime.c)(73);
  const { t } = useTranslation("editor");
  const {
    label,
    icon,
    value,
    onChange,
    isSet: t1,
    unit: t2,
    showUnit: t3,
    unitPicker: t4,
    preserveUnitless: t5,
    min,
    placeholder: t6,
    className,
    isMixedValue: t7,
    source,
    sourceClass,
    isPending: t8,
    onClearOverride,
    cssProperty,
    tooltipLabel,
    onSelectClass
  } = t0;
  const isSet = t1 === void 0 ? false : t1;
  const unit = t2 === void 0 ? "px" : t2;
  const showUnit = t3 === void 0 ? true : t3;
  const unitPicker = t4 === void 0 ? showUnit : t4;
  const preserveUnitless = t5 === void 0 ? false : t5;
  const placeholder = t6 === void 0 ? "Auto" : t6;
  const isMixedValue = t7 === void 0 ? false : t7;
  const isPending = t8 === void 0 ? false : t8;
  const {
    showSuggestions,
    setShowSuggestions,
    hasSuggestions,
    allSuggestions
  } = useClassSuggestions(cssProperty, onSelectClass);
  const [unitMenuOpen, setUnitMenuOpen] = import_react.useState(false);
  let t9;
  if ($[0] !== cssProperty) {
    t9 = inspectorPropertySupportsAuto(cssProperty);
    $[0] = cssProperty;
    $[1] = t9;
  } else t9 = $[1];
  const allowAuto = t9;
  const t10 = unitPicker || showUnit ? unit : "";
  const t11 = unitPicker || showUnit;
  let t12;
  if ($[2] !== allowAuto || $[3] !== isMixedValue || $[4] !== min || $[5] !== onChange || $[6] !== preserveUnitless || $[7] !== t10 || $[8] !== t11 || $[9] !== value) {
    t12 = {
      value,
      onChange,
      isMixedValue,
      defaultUnit: t10,
      min,
      strictUnits: t11,
      preserveUnitless,
      allowAuto
    };
    $[2] = allowAuto;
    $[3] = isMixedValue;
    $[4] = min;
    $[5] = onChange;
    $[6] = preserveUnitless;
    $[7] = t10;
    $[8] = t11;
    $[9] = value;
    $[10] = t12;
  } else t12 = $[10];
  const unitValue = useUnitValue(t12);
  let t13;
  if ($[11] !== unitValue) {
    t13 = e => {
      unitValue.setDraft(e.target.value);
    };
    $[11] = unitValue;
    $[12] = t13;
  } else t13 = $[12];
  const handleChange = t13;
  let t14;
  if ($[13] !== min) {
    t14 = {
      min
    };
    $[13] = min;
    $[14] = t14;
  } else t14 = $[14];
  const {
    scrubRef,
    isScrubbing
  } = useInspectorScrub(unitValue.scrubValue, unitValue.applyScrub, t14);
  let t15;
  if ($[15] !== showUnit || $[16] !== unit || $[17] !== unitPicker || $[18] !== unitValue.draft || $[19] !== unitValue.showMixed) {
    t15 = !unitPicker && showUnit && unitValue.draft && !unitValue.showMixed && /^-?[\d.]+$/.test(unitValue.draft) ? <span className="text-[11px] text-ed-foreground-secondary">{unit}</span> : null;
    $[15] = showUnit;
    $[16] = unit;
    $[17] = unitPicker;
    $[18] = unitValue.draft;
    $[19] = unitValue.showMixed;
    $[20] = t15;
  } else t15 = $[20];
  const unitBadge = t15;
  let t16;
  if ($[21] !== allowAuto || $[22] !== cssProperty || $[23] !== unitPicker || $[24] !== unitValue.selectUnit || $[25] !== unitValue.selectedUnit) {
    t16 = unitPicker ? <UnitMenu value={unitValue.selectedUnit} onValueChange={unitValue.selectUnit} label={cssProperty ?? "Value"} onOpenChange={setUnitMenuOpen} allowAuto={allowAuto} /> : null;
    $[21] = allowAuto;
    $[22] = cssProperty;
    $[23] = unitPicker;
    $[24] = unitValue.selectUnit;
    $[25] = unitValue.selectedUnit;
    $[26] = t16;
  } else t16 = $[26];
  const unitMenu = t16;
  let t17;
  if ($[27] !== icon || $[28] !== isPending || $[29] !== sourceClass || $[30] !== tooltipLabel || $[31] !== value) {
    t17 = sourceClass ? <ActiveClassChip sourceClass={sourceClass} fieldTooltip={tooltipLabel} value={displayValue(value)} isPending={isPending} className={icon ? "pl-1.5" : void 0} /> : null;
    $[27] = icon;
    $[28] = isPending;
    $[29] = sourceClass;
    $[30] = tooltipLabel;
    $[31] = value;
    $[32] = t17;
  } else t17 = $[32];
  const activeClassChip = t17;
  let t18;
  if ($[33] !== onClearOverride) {
    t18 = onClearOverride ? <ActiveClassUnlinkAction onClear={onClearOverride} /> : null;
    $[33] = onClearOverride;
    $[34] = t18;
  } else t18 = $[34];
  const clearClassAction = t18;
  let t19;
  if ($[35] !== icon || $[36] !== label || $[37] !== scrubRef) {
    t19 = icon ? <InspectorScrubHandle ref={!label ? scrubRef : void 0}>{icon}</InspectorScrubHandle> : null;
    $[35] = icon;
    $[36] = label;
    $[37] = scrubRef;
    $[38] = t19;
  } else t19 = $[38];
  const leadingIcon = t19;
  let t20;
  if ($[39] !== className) {
    t20 = cn$2("relative flex items-center gap-1.5 min-w-0", className);
    $[39] = className;
    $[40] = t20;
  } else t20 = $[40];
  let t21;
  if ($[41] !== label || $[42] !== scrubRef) {
    t21 = label && <InspectorScrubHandle ref={scrubRef} aria-hidden={void 0} className="pl-0 text-[12px] text-ed-foreground">{label}</InspectorScrubHandle>;
    $[41] = label;
    $[42] = scrubRef;
    $[43] = t21;
  } else t21 = $[43];
  let t22;
  if (true) {
    t22 = <div className="group/input relative flex-1 min-w-0">{sourceClass && source === "class" ? hasSuggestions ? <Popover open={showSuggestions} onOpenChange={setShowSuggestions} modal={false}>{<PopoverAnchor asChild={true}>{<InspectorControlShell active={isScrubbing || showSuggestions} className={!icon ? "pl-1" : void 0}>{leadingIcon}{<PopoverTrigger asChild={true}>{<InspectorControlAction className="min-w-0 flex-1 justify-start p-0">{activeClassChip}</InspectorControlAction>}</PopoverTrigger>}{clearClassAction}</InspectorControlShell>}</PopoverAnchor>}{<ClassPickerPopover suggestions={allSuggestions} cssProperty={cssProperty} sourceClass={sourceClass} onSelect={cls => onSelectClass?.(cls)} onClose={() => setShowSuggestions(false)} />}</Popover> : <InspectorControlShell active={isScrubbing} className={!icon ? "pl-1" : void 0}>{leadingIcon}{activeClassChip}{clearClassAction}</InspectorControlShell> : sourceClass && source === "inline" ? <InspectorControlShell active={isScrubbing || unitMenuOpen} aria-invalid={unitValue.isInvalid || void 0} className="relative">{leadingIcon}{<InspectorControlInput value={unitValue.showMixed ? "" : unitValue.draft} onChange={handleChange} onBlur={() => {
          unitValue.commit();
          setTimeout(() => setShowSuggestions(false), 150);
        }} onKeyDown={blurInspectorInputOnEnter} placeholder={unitValue.showMixed ? "-" : placeholder} aria-invalid={unitValue.isInvalid || void 0} tooltip={unitValue.errorMessage ?? tooltipLabel} className={cn$2("w-full text-left", icon ? "pl-1.5" : "pl-2", "pr-24")} />}{unitMenu}{<span className={cn$2("absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5", unitPicker ? "right-7" : "right-1")}>{<span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-ed-muted/50 text-ed-muted-foreground line-through truncate max-w-20">{sourceClass}</span>}{onClearOverride && <Tooltip content={t("styles.restoreClassValue")}>{<button type="button" aria-label={t("styles.restoreClassValue")} onClick={onClearOverride} className="text-ed-foreground-secondary hover:text-ed-foreground">{<XIcon className="size-3.75" />}</button>}</Tooltip>}</span>}</InspectorControlShell> : hasSuggestions ? <Popover open={showSuggestions} onOpenChange={setShowSuggestions} modal={false}>{<PopoverAnchor asChild={true}>{<InspectorControlShell active={isScrubbing || showSuggestions || unitMenuOpen} aria-invalid={unitValue.isInvalid || void 0}>{leadingIcon}{<InspectorControlInput value={unitValue.showMixed ? "" : unitValue.draft} onChange={handleChange} onBlur={unitValue.commit} onKeyDown={blurInspectorInputOnEnter} placeholder={unitValue.showMixed ? "-" : placeholder} aria-invalid={unitValue.isInvalid || void 0} tooltip={unitValue.errorMessage ?? tooltipLabel} className={cn$2(icon ? "pl-1.5" : "pl-2", "pr-1")} />}{<PopoverTrigger asChild={true}>{<InspectorControlAction aria-label="Apply class" className="ml-auto px-1.5 text-ed-foreground-secondary">{<InspectorClassPickerIndicator>{<AddVariableIcon />}</InspectorClassPickerIndicator>}</InspectorControlAction>}</PopoverTrigger>}{unitMenu ?? unitBadge}</InspectorControlShell>}</PopoverAnchor>}{<ClassPickerPopover suggestions={allSuggestions} cssProperty={cssProperty} sourceClass={sourceClass} onSelect={cls_0 => onSelectClass?.(cls_0)} onClose={() => setShowSuggestions(false)} />}</Popover> : <InspectorControlShell active={isScrubbing || unitMenuOpen} aria-invalid={unitValue.isInvalid || void 0} className={cn$2("relative", isSet && "ring-1 ring-ed-foreground/20")}>{leadingIcon}{<InspectorControlInput value={unitValue.showMixed ? "" : unitValue.draft} onChange={handleChange} onBlur={unitValue.commit} onKeyDown={blurInspectorInputOnEnter} placeholder={unitValue.showMixed ? "-" : placeholder} aria-invalid={unitValue.isInvalid || void 0} tooltip={unitValue.errorMessage ?? tooltipLabel} className={cn$2("w-full text-left", icon ? "pl-1.5" : "pl-2", "pr-6")} />}{unitMenu}{unitBadge && !unitPicker && <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[11px] text-ed-foreground-secondary">{unit}</span>}</InspectorControlShell>}</div>;
    $[44] = activeClassChip;
    $[45] = allSuggestions;
    $[46] = clearClassAction;
    $[47] = cssProperty;
    $[48] = handleChange;
    $[49] = hasSuggestions;
    $[50] = icon;
    $[51] = isScrubbing;
    $[52] = isSet;
    $[53] = leadingIcon;
    $[54] = onClearOverride;
    $[55] = onSelectClass;
    $[56] = placeholder;
    $[57] = setShowSuggestions;
    $[58] = showSuggestions;
    $[59] = source;
    $[60] = sourceClass;
    $[61] = tooltipLabel;
    $[62] = unit;
    $[63] = unitBadge;
    $[64] = unitMenu;
    $[65] = unitMenuOpen;
    $[66] = unitPicker;
    $[67] = unitValue;
    $[68] = t22;
  } else t22 = $[68];
  let t23;
  if ($[69] !== t20 || $[70] !== t21 || $[71] !== t22) {
    t23 = <div className={t20}>{t21}{t22}</div>;
    $[69] = t20;
    $[70] = t21;
    $[71] = t22;
    $[72] = t23;
  } else t23 = $[72];
  return variableBound ? <div className="flex min-w-0 items-center gap-1">{label && <span className="text-xs text-ed-muted-foreground">{label}</span>}<VariableBindingControl property={cssProperty} /></div> : <div className="flex min-w-0 items-center gap-1"><div className="min-w-0 flex-1">{t23}</div><VariableBindingControl property={cssProperty} compact /></div>;
}

export { InlineInput };
