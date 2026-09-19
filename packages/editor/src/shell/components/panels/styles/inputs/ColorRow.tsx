import { VariableBindingControl } from "../../../../../shared/theme/VariableControls";
import { useVariableEditor, useResolvedVariableStyle } from "../../../../../shared/theme/VariableContext";
/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/ColorRow.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useAssetResolver } from "../../../../../shared/contexts/AssetContext";
import { useColorPickerSession } from "../../../../../shared/utils/useScrub";
import { useClassSuggestions } from "../../../../hooks/useClassSuggestions";
import { useMixedLocalValue } from "../../../../hooks/useMixedLocalValue";
import { canvasColorToParts, colorToHex6, colorToParts, parseColorParts, setAlphaOn, toHex6 } from "../../../../utils/colorMath";
import { parseFill } from "../../../../utils/fillValue";
import { InspectorControlAction, InspectorControlInput, InspectorControlShell, InspectorScrubHandle, SourceChip, blurInspectorInputOnEnter, inspectorControlHeight, inspectorControlRadius } from "../primitives";
import { translateInspectorText } from "../inspectorCopy";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { ActiveClassChip, ActiveClassUnlinkAction } from "./parts/ActiveClassChip";
import { useInspectorScrub } from "./useInspectorScrub";
import { Popover, PopoverAnchor, PopoverTrigger, Text$4, Tooltip, useIsDark } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function resolveCssColor(raw, cssProperty) {
  if (!raw) return "#000000";
  if (raw.startsWith("#") || raw.startsWith("rgb")) return raw;
  try {
    const temp = document.createElement("div");
    const kebab = cssProperty ? cssProperty.replace(/([A-Z])/g, "-$1").toLowerCase() : "background-color";
    temp.style.cssText = `position:absolute;visibility:hidden;${kebab}:${raw}`;
    document.body.appendChild(temp);
    const result = window.getComputedStyle(temp)[cssProperty || "backgroundColor"] || "";
    document.body.removeChild(temp);
    return result || "#000000";
  } catch {
    return "#000000";
  }
}
function useColorValue(value, localValue, cssProperty) {
  const $ = (0, import_compiler_runtime.c)(17);
  useIsDark();
  const t0 = useResolvedVariableStyle(cssProperty, value || localValue);
  let t1;
  if ($[0] !== cssProperty || $[1] !== t0) {
    t1 = resolveCssColor(t0, cssProperty);
    $[0] = cssProperty;
    $[1] = t0;
    $[2] = t1;
  } else t1 = $[2];
  const resolvedColor = t1;
  let alphaLabel;
  let alphaPct;
  let displayHex;
  let t2;
  if ($[3] !== resolvedColor || $[4] !== value) {
    const colorParts = parseColorParts(resolvedColor) ?? canvasColorToParts(resolvedColor);
    displayHex = colorParts ? toHex6(colorParts.r, colorParts.g, colorParts.b) : "#000000";
    alphaPct = colorParts ? colorParts.a * 100 : 100;
    let t3;
    if ($[9] !== alphaPct) {
      t3 = Math.round(alphaPct);
      $[9] = alphaPct;
      $[10] = t3;
    } else t3 = $[10];
    alphaLabel = String(t3);
    t2 = colorParts ? setAlphaOn(displayHex, alphaPct) : value || "";
    $[3] = resolvedColor;
    $[4] = value;
    $[5] = alphaLabel;
    $[6] = alphaPct;
    $[7] = displayHex;
    $[8] = t2;
  } else {
    alphaLabel = $[5];
    alphaPct = $[6];
    displayHex = $[7];
    t2 = $[8];
  }
  const canonical = t2;
  let t3;
  if ($[11] !== alphaLabel || $[12] !== alphaPct || $[13] !== canonical || $[14] !== displayHex || $[15] !== resolvedColor) {
    t3 = {
      resolvedColor,
      displayHex,
      alphaPct,
      alphaLabel,
      canonical
    };
    $[11] = alphaLabel;
    $[12] = alphaPct;
    $[13] = canonical;
    $[14] = displayHex;
    $[15] = resolvedColor;
    $[16] = t3;
  } else t3 = $[16];
  return t3;
}
function FillPicker(t0) {
  const $ = (0, import_compiler_runtime.c)(15);
  const {
    value,
    resolvedSolid,
    onChange,
    allowedKinds,
    suggestions,
    cssProperty,
    sourceClass,
    onSelectClass,
    onClose,
    defaultTab,
    imageConfig,
    onChangeImageConfig
  } = t0;
  let t1;
  if ($[0] !== onSelectClass) {
    t1 = onSelectClass ? cls => onSelectClass(cls) : void 0;
    $[0] = onSelectClass;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== allowedKinds || $[3] !== cssProperty || $[4] !== defaultTab || $[5] !== imageConfig || $[6] !== onChange || $[7] !== onChangeImageConfig || $[8] !== onClose || $[9] !== resolvedSolid || $[10] !== sourceClass || $[11] !== suggestions || $[12] !== t1 || $[13] !== value) {
    t2 = <ColorPickerPopover width="w-64" value={value} resolvedSolid={resolvedSolid} onChange={onChange} allowedKinds={allowedKinds} suggestions={suggestions} cssProperty={cssProperty} sourceClass={sourceClass} onSelectClass={t1} onClose={onClose} defaultTab={defaultTab} imageConfig={imageConfig} onChangeImageConfig={onChangeImageConfig} />;
    $[2] = allowedKinds;
    $[3] = cssProperty;
    $[4] = defaultTab;
    $[5] = imageConfig;
    $[6] = onChange;
    $[7] = onChangeImageConfig;
    $[8] = onClose;
    $[9] = resolvedSolid;
    $[10] = sourceClass;
    $[11] = suggestions;
    $[12] = t1;
    $[13] = value;
    $[14] = t2;
  } else t2 = $[14];
  return t2;
}
function ClassSwatch(t0) {
  const $ = (0, import_compiler_runtime.c)(2);
  const {
    resolvedColor
  } = t0;
  let t1;
  if ($[0] !== resolvedColor) {
    t1 = <span className="flex h-full w-6 shrink-0 items-center justify-center">{<span className="size-4 shrink-0 rounded-xs border border-ed-field-border" style={{
        backgroundColor: resolvedColor
      }} />}</span>;
    $[0] = resolvedColor;
    $[1] = t1;
  } else t1 = $[1];
  return t1;
}
function ClassSourceRow(t0) {
  const $ = (0, import_compiler_runtime.c)(16);
  const {
    label,
    ariaLabel,
    showTooltip,
    interactive,
    open,
    onOpenChange,
    resolvedColor,
    resolvedValue,
    sourceClass,
    isPending,
    onClear,
    picker
  } = t0;
  let t1;
  if ($[0] !== ariaLabel || $[1] !== interactive || $[2] !== isPending || $[3] !== onClear || $[4] !== onOpenChange || $[5] !== open || $[6] !== picker || $[7] !== resolvedColor || $[8] !== resolvedValue || $[9] !== showTooltip || $[10] !== sourceClass) {
    t1 = <div className="flex items-center gap-2">{interactive ? <Popover open={open} onOpenChange={onOpenChange} modal={false}>{<PopoverAnchor asChild={true}>{<InspectorControlShell active={open}>{<PopoverTrigger asChild={true}>{<InspectorControlAction className="min-w-0 flex-1 justify-start p-0">{<ClassSwatch resolvedColor={resolvedColor} />}{<ActiveClassChip sourceClass={sourceClass} fieldTooltip={showTooltip ? ariaLabel : void 0} value={resolvedValue} isPending={isPending} />}</InspectorControlAction>}</PopoverTrigger>}{onClear && <ActiveClassUnlinkAction onClear={onClear} />}</InspectorControlShell>}</PopoverAnchor>}{picker}</Popover> : <InspectorControlShell>{<ClassSwatch resolvedColor={resolvedColor} />}{<ActiveClassChip sourceClass={sourceClass} fieldTooltip={showTooltip ? ariaLabel : void 0} value={resolvedValue} isPending={isPending} />}{onClear && <ActiveClassUnlinkAction onClear={onClear} />}</InspectorControlShell>}</div>;
    $[0] = ariaLabel;
    $[1] = interactive;
    $[2] = isPending;
    $[3] = onClear;
    $[4] = onOpenChange;
    $[5] = open;
    $[6] = picker;
    $[7] = resolvedColor;
    $[8] = resolvedValue;
    $[9] = showTooltip;
    $[10] = sourceClass;
    $[11] = t1;
  } else t1 = $[11];
  let t2;
  if ($[12] !== ariaLabel || $[13] !== label || $[14] !== t1) {
    t2 = <div role="group" aria-label={ariaLabel} className="flex min-w-0 flex-1 flex-col gap-1">{label}{t1}</div>;
    $[12] = ariaLabel;
    $[13] = label;
    $[14] = t1;
    $[15] = t2;
  } else t2 = $[15];
  return t2;
}
function HexAlphaInputs(t0) {
  const $ = (0, import_compiler_runtime.c)(46);
  const { t } = useTranslation("editor");
  const {
    label,
    showTooltip,
    displayHex,
    alphaLabel,
    showMixed,
    onShowMixed,
    onCommitHex,
    onCommitAlpha
  } = t0;
  const [hexDraft, setHexDraft] = import_react.useState(null);
  const [alphaDraft, setAlphaDraft] = import_react.useState(null);
  let t1;
  if ($[0] !== alphaDraft || $[1] !== alphaLabel) {
    t1 = () => parseFloat(alphaDraft ?? alphaLabel) || 0;
    $[0] = alphaDraft;
    $[1] = alphaLabel;
    $[2] = t1;
  } else t1 = $[2];
  let t2;
  if ($[3] !== onCommitAlpha) {
    t2 = next => {
      const clamped = Math.max(0, Math.min(100, next));
      setAlphaDraft(String(clamped));
      onCommitAlpha(clamped);
    };
    $[3] = onCommitAlpha;
    $[4] = t2;
  } else t2 = $[4];
  let t3;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = {
      min: 0,
      max: 100,
      onEnd: () => setAlphaDraft(null)
    };
    $[5] = t3;
  } else t3 = $[5];
  const {
    scrubRef
  } = useInspectorScrub(t1, t2, t3);
  const t4 = showTooltip ? label : void 0;
  const t5 = hexDraft ?? (showMixed ? "" : displayHex);
  let t6;
  if ($[6] !== displayHex || $[7] !== showMixed) {
    t6 = () => setHexDraft(showMixed ? "" : displayHex);
    $[6] = displayHex;
    $[7] = showMixed;
    $[8] = t6;
  } else t6 = $[8];
  let t7;
  if ($[9] !== onShowMixed) {
    t7 = e => {
      setHexDraft(e.target.value);
      onShowMixed(false);
    };
    $[9] = onShowMixed;
    $[10] = t7;
  } else t7 = $[10];
  let t8;
  if ($[11] !== hexDraft || $[12] !== onCommitHex) {
    t8 = () => {
      if (hexDraft !== null) {
        onCommitHex(hexDraft);
        setHexDraft(null);
      }
    };
    $[11] = hexDraft;
    $[12] = onCommitHex;
    $[13] = t8;
  } else t8 = $[13];
  const t9 = showMixed ? "-" : "#000000";
  let t10;
  if ($[14] !== t4 || $[15] !== t5 || $[16] !== t6 || $[17] !== t7 || $[18] !== t8 || $[19] !== t9) {
    t10 = <InspectorControlInput tooltip={t4} value={t5} onFocus={t6} onChange={t7} onBlur={t8} onKeyDown={blurInspectorInputOnEnter} placeholder={t9} className="px-1 uppercase" />;
    $[14] = t4;
    $[15] = t5;
    $[16] = t6;
    $[17] = t7;
    $[18] = t8;
    $[19] = t9;
    $[20] = t10;
  } else t10 = $[20];
  const t11 = showTooltip ? t("styles.colorOpacity", { color: label }) : void 0;
  const t12 = alphaDraft ?? (showMixed ? "" : alphaLabel);
  let t13;
  if ($[21] !== alphaLabel || $[22] !== showMixed) {
    t13 = event => {
      const input = event.currentTarget;
      setAlphaDraft(showMixed ? "" : alphaLabel);
      requestAnimationFrame(() => input.select());
    };
    $[21] = alphaLabel;
    $[22] = showMixed;
    $[23] = t13;
  } else t13 = $[23];
  let t14;
  if ($[24] !== onShowMixed) {
    t14 = e_0 => {
      onShowMixed(false);
      setAlphaDraft(e_0.target.value.replace(/\D/g, "").slice(0, 3));
    };
    $[24] = onShowMixed;
    $[25] = t14;
  } else t14 = $[25];
  let t15;
  if ($[26] !== alphaDraft || $[27] !== onCommitAlpha || $[28] !== showMixed) {
    t15 = () => {
      if (alphaDraft !== null && !(showMixed && alphaDraft === "")) onCommitAlpha(Math.round(Math.max(0, Math.min(100, parseFloat(alphaDraft) || 0))));
      setAlphaDraft(null);
    };
    $[26] = alphaDraft;
    $[27] = onCommitAlpha;
    $[28] = showMixed;
    $[29] = t15;
  } else t15 = $[29];
  const t16 = showMixed ? "-" : "100";
  let t17;
  if ($[30] !== t11 || $[31] !== t12 || $[32] !== t13 || $[33] !== t14 || $[34] !== t15 || $[35] !== t16) {
    t17 = <InspectorControlInput tooltip={t11} inputMode="decimal" value={t12} onFocus={t13} onChange={t14} onBlur={t15} onKeyDown={blurInspectorInputOnEnter} aria-label={t("styles.opacityPercent")} placeholder={t16} className="pl-1.5 pr-0.5 text-right text-ed-inspector-value" />;
    $[30] = t11;
    $[31] = t12;
    $[32] = t13;
    $[33] = t14;
    $[34] = t15;
    $[35] = t16;
    $[36] = t17;
  } else t17 = $[36];
  const t18 = showTooltip ? t("styles.dragAdjustOpacity") : void 0;
  let t19;
  if ($[37] !== scrubRef || $[38] !== t18) {
    t19 = <InspectorScrubHandle ref={scrubRef} aria-hidden={void 0} title={t18} className="pl-0.5 pr-1.5 font-normal text-ed-inspector-chrome">%</InspectorScrubHandle>;
    $[37] = scrubRef;
    $[38] = t18;
    $[39] = t19;
  } else t19 = $[39];
  let t20;
  if ($[40] !== t17 || $[41] !== t19) {
    t20 = <span className="flex h-full w-[60px] shrink-0">{t17}{t19}</span>;
    $[40] = t17;
    $[41] = t19;
    $[42] = t20;
  } else t20 = $[42];
  let t21;
  if ($[43] !== t10 || $[44] !== t20) {
    t21 = <>{t10}{t20}</>;
    $[43] = t10;
    $[44] = t20;
    $[45] = t21;
  } else t21 = $[45];
  return t21;
}
function NativeColorInput(t0) {
  const $ = (0, import_compiler_runtime.c)(29);
  const {
    label,
    showTooltip,
    resolvedColor,
    localValue,
    showMixed,
    onLocalChange,
    onCommit,
    onPick,
    onEndSession
  } = t0;
  const t1 = showTooltip ? void 0 : false;
  let t2;
  if ($[0] !== resolvedColor) {
    t2 = <div className="h-full w-full" style={{
      backgroundColor: resolvedColor
    }} />;
    $[0] = resolvedColor;
    $[1] = t2;
  } else t2 = $[1];
  let t3;
  if ($[2] !== localValue) {
    t3 = colorToHex6(localValue);
    $[2] = localValue;
    $[3] = t3;
  } else t3 = $[3];
  let t4;
  if ($[4] !== onPick) {
    t4 = e => onPick(e.target.value);
    $[4] = onPick;
    $[5] = t4;
  } else t4 = $[5];
  let t5;
  if ($[6] !== label || $[7] !== onEndSession || $[8] !== t3 || $[9] !== t4) {
    t5 = <input type="color" aria-label={label} value={t3} onChange={t4} onBlur={onEndSession} className="absolute inset-0 opacity-0 w-full h-full" />;
    $[6] = label;
    $[7] = onEndSession;
    $[8] = t3;
    $[9] = t4;
    $[10] = t5;
  } else t5 = $[10];
  let t6;
  if ($[11] !== t2 || $[12] !== t5) {
    t6 = <label className={`relative w-7 shrink-0 overflow-hidden border border-ed-field-border ${inspectorControlHeight} ${inspectorControlRadius}`}>{t2}{t5}</label>;
    $[11] = t2;
    $[12] = t5;
    $[13] = t6;
  } else t6 = $[13];
  let t7;
  if ($[14] !== label || $[15] !== t1 || $[16] !== t6) {
    t7 = <Tooltip content={label} open={t1}>{t6}</Tooltip>;
    $[14] = label;
    $[15] = t1;
    $[16] = t6;
    $[17] = t7;
  } else t7 = $[17];
  const t8 = showTooltip ? label : void 0;
  const t9 = showMixed ? "" : localValue;
  let t10;
  if ($[18] !== onLocalChange) {
    t10 = e_0 => onLocalChange(e_0.target.value);
    $[18] = onLocalChange;
    $[19] = t10;
  } else t10 = $[19];
  const t11 = showMixed ? "-" : "";
  let t12;
  if ($[20] !== onCommit || $[21] !== t10 || $[22] !== t11 || $[23] !== t8 || $[24] !== t9) {
    t12 = <InspectorControlShell className="flex-1">{<InspectorControlInput tooltip={t8} value={t9} onChange={t10} onBlur={onCommit} onKeyDown={blurInspectorInputOnEnter} placeholder={t11} className="px-2" />}</InspectorControlShell>;
    $[20] = onCommit;
    $[21] = t10;
    $[22] = t11;
    $[23] = t8;
    $[24] = t9;
    $[25] = t12;
  } else t12 = $[25];
  let t13;
  if ($[26] !== t12 || $[27] !== t7) {
    t13 = <>{t7}{t12}</>;
    $[26] = t12;
    $[27] = t7;
    $[28] = t13;
  } else t13 = $[28];
  return t13;
}
function FillRow(t0) {
  const $ = (0, import_compiler_runtime.c)(26);
  const { t } = useTranslation("editor");
  const {
    label,
    ariaLabel,
    showTooltip,
    editable,
    open,
    onOpenChange,
    onOpenPicker,
    swatchStyle,
    fillKind,
    fillLabel,
    displayHex,
    alphaLabel,
    showMixed,
    onShowMixed,
    onCommitHex,
    onCommitAlpha,
    endAddon,
    picker,
    fallback,
    override
  } = t0;
  let t1;
  if (true) {
    t1 = editable ? <Popover open={open} onOpenChange={onOpenChange} modal={false}>{<PopoverAnchor asChild={true}>{<InspectorControlShell active={open}>{<InspectorControlAction aria-label={t("styles.openColorPicker")} title={showTooltip ? ariaLabel : void 0} onClick={onOpenPicker} className="w-6 p-0">{<span className="size-4 shrink-0 rounded-xs border border-ed-field-border" style={swatchStyle} />}</InspectorControlAction>}{fillKind === "solid" ? <HexAlphaInputs label={ariaLabel} showTooltip={showTooltip} displayHex={displayHex} alphaLabel={alphaLabel} showMixed={showMixed} onShowMixed={onShowMixed} onCommitHex={onCommitHex} onCommitAlpha={onCommitAlpha} /> : <InspectorControlAction title={showTooltip ? ariaLabel : void 0} onClick={onOpenPicker} className="min-w-0 flex-1 justify-start px-1 text-left text-ed-inspector-value">{fillLabel}</InspectorControlAction>}{endAddon && <span className="flex h-full shrink-0 items-center border-l border-ed-background px-2 group-hover/inspector-control:border-ed-border group-focus-within/inspector-control:!border-ed-inspector-active-border group-data-[active=true]/inspector-control:!border-ed-inspector-active-border">{endAddon}</span>}</InspectorControlShell>}</PopoverAnchor>}{picker}</Popover> : fallback;
    $[0] = alphaLabel;
    $[1] = ariaLabel;
    $[2] = displayHex;
    $[3] = editable;
    $[4] = endAddon;
    $[5] = fallback;
    $[6] = fillKind;
    $[7] = fillLabel;
    $[8] = onCommitAlpha;
    $[9] = onCommitHex;
    $[10] = onOpenChange;
    $[11] = onOpenPicker;
    $[12] = onShowMixed;
    $[13] = open;
    $[14] = picker;
    $[15] = showMixed;
    $[16] = showTooltip;
    $[17] = swatchStyle;
    $[18] = t1;
  } else t1 = $[18];
  let t2;
  if ($[19] !== t1) {
    t2 = <div className="flex items-center gap-2">{t1}</div>;
    $[19] = t1;
    $[20] = t2;
  } else t2 = $[20];
  let t3;
  if ($[21] !== ariaLabel || $[22] !== label || $[23] !== override || $[24] !== t2) {
    t3 = <div role="group" aria-label={ariaLabel} className="flex min-w-0 flex-1 flex-col gap-1">{label}{t2}{override}</div>;
    $[21] = ariaLabel;
    $[22] = label;
    $[23] = override;
    $[24] = t2;
    $[25] = t3;
  } else t3 = $[25];
  return t3;
}
function ColorRow(t0) {
  const variableEditor = useVariableEditor();
  const variableBound = variableEditor?.ids.some(id => variableEditor.bindingFor(id, t0.cssProperty));
  const $ = (0, import_compiler_runtime.c)(117);
  const { t } = useTranslation("editor");
  const {
    label: rawLabel,
    hideLabel: t1,
    showTooltip: t2,
    value,
    onChange,
    isMixedValue: t3,
    source,
    sourceClass,
    isPending: t4,
    onClearOverride,
    cssProperty,
    onSelectClass,
    allowedFillKinds,
    onChangeFill,
    imageConfig,
    onChangeImageConfig,
    endAddon,
    defaultPickerTab: t5,
    open: controlledOpen,
    onOpenChange
  } = t0;
  const label = translateInspectorText(t, rawLabel);
  const hideLabel = t1 === void 0 ? false : t1;
  const showTooltip = t2 === void 0 ? true : t2;
  const isMixedValue = t3 === void 0 ? false : t3;
  const isPending = t4 === void 0 ? false : t4;
  const defaultPickerTab = t5 === void 0 ? "custom" : t5;
  const {
    localValue,
    setLocalValue,
    showMixed,
    setShowMixed
  } = useMixedLocalValue(value, isMixedValue);
  const resolveAsset = useAssetResolver();
  const {
    showSuggestions,
    setShowSuggestions,
    allSuggestions
  } = useClassSuggestions(cssProperty, onSelectClass);
  const open = controlledOpen ?? showSuggestions;
  let t6;
  if ($[0] !== onOpenChange || $[1] !== setShowSuggestions) {
    t6 = o => onOpenChange ? onOpenChange(o) : setShowSuggestions(o);
    $[0] = onOpenChange;
    $[1] = setShowSuggestions;
    $[2] = t6;
  } else t6 = $[2];
  const setOpen = t6;
  const onPopoverOpenChange = o_0 => {
    setOpen(o_0);
    if (!o_0) endColorSession();
  };
  const [openTab, setOpenTab] = import_react.useState(defaultPickerTab);
  let t7;
  if ($[3] !== setOpen) {
    t7 = tab => {
      setOpenTab(tab);
      setOpen(true);
    };
    $[3] = setOpen;
    $[4] = t7;
  } else t7 = $[4];
  const openWith = t7;
  let t8;
  if ($[5] !== onChange || $[6] !== setLocalValue || $[7] !== setShowMixed) {
    t8 = next => {
      setLocalValue(next);
      setShowMixed(false);
      onChange(next);
    };
    $[5] = onChange;
    $[6] = setLocalValue;
    $[7] = setShowMixed;
    $[8] = t8;
  } else t8 = $[8];
  const {
    onPickerChange: handlePickerChange,
    endSession: t9
  } = useColorPickerSession(t8);
  const endColorSession = t9;
  let t10;
  if ($[9] !== allowedFillKinds) {
    t10 = allowedFillKinds ?? ["solid"];
    $[9] = allowedFillKinds;
    $[10] = t10;
  } else t10 = $[10];
  const fillKinds = t10;
  let t11;
  if ($[11] !== handlePickerChange || $[12] !== onChangeFill) {
    t11 = (next_0, kind) => {
      if (onChangeFill) onChangeFill(next_0, kind);else handlePickerChange(next_0);
    };
    $[11] = handlePickerChange;
    $[12] = onChangeFill;
    $[13] = t11;
  } else t11 = $[13];
  const applyFill = t11;
  const {
    resolvedColor,
    displayHex,
    alphaPct,
    alphaLabel,
    canonical
  } = useColorValue(value, localValue, cssProperty);
  let commitAlpha;
  let commitHex;
  let fill;
  let fillLabel;
  let t12;
  if ($[14] !== alphaPct || $[15] !== applyFill || $[16] !== canonical || $[17] !== cssProperty || $[18] !== displayHex || $[19] !== onChange || $[20] !== resolveAsset || $[21] !== resolvedColor || $[22] !== value) {
    fill = parseFill(value || resolvedColor);
    fillLabel = fill.kind === "gradient" ? `${fill.type[0].toUpperCase()}${fill.type.slice(1)} Gradient` : fill.kind === "image" ? "Image" : "Color";
    let t13;
    if ($[28] !== alphaPct || $[29] !== applyFill || $[30] !== canonical || $[31] !== cssProperty || $[32] !== displayHex || $[33] !== onChange) {
      t13 = typed => {
        const t = typed.trim();
        const parts = colorToParts(t, cssProperty);
        if (!parts) {
          if (t && t.toLowerCase() !== displayHex.toLowerCase()) onChange(t);
          return;
        }
        const pct = parts.hasAlpha ? parts.a * 100 : alphaPct;
        const next_1 = setAlphaOn(toHex6(parts.r, parts.g, parts.b), pct);
        if (next_1.toLowerCase() !== canonical.toLowerCase()) applyFill(next_1, "solid");
      };
      $[28] = alphaPct;
      $[29] = applyFill;
      $[30] = canonical;
      $[31] = cssProperty;
      $[32] = displayHex;
      $[33] = onChange;
      $[34] = t13;
    } else t13 = $[34];
    commitHex = t13;
    let t14;
    if ($[35] !== applyFill || $[36] !== canonical || $[37] !== displayHex) {
      t14 = pct_0 => {
        const next_2 = setAlphaOn(displayHex, Math.round(pct_0));
        if (next_2.toLowerCase() !== canonical.toLowerCase()) applyFill(next_2, "solid");
      };
      $[35] = applyFill;
      $[36] = canonical;
      $[37] = displayHex;
      $[38] = t14;
    } else t14 = $[38];
    commitAlpha = t14;
    t12 = fill.kind === "gradient" ? {
      background: value
    } : fill.kind === "image" ? {
      backgroundImage: `url("${resolveAsset(fill.url)}")`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    } : {
      backgroundColor: resolvedColor
    };
    $[14] = alphaPct;
    $[15] = applyFill;
    $[16] = canonical;
    $[17] = cssProperty;
    $[18] = displayHex;
    $[19] = onChange;
    $[20] = resolveAsset;
    $[21] = resolvedColor;
    $[22] = value;
    $[23] = commitAlpha;
    $[24] = commitHex;
    $[25] = fill;
    $[26] = fillLabel;
    $[27] = t12;
  } else {
    commitAlpha = $[23];
    commitHex = $[24];
    fill = $[25];
    fillLabel = $[26];
    t12 = $[27];
  }
  const swatchStyle = t12;
  let t13;
  if ($[39] !== allSuggestions || $[40] !== applyFill || $[41] !== cssProperty || $[42] !== fillKinds || $[43] !== imageConfig || $[44] !== onChangeImageConfig || $[45] !== onSelectClass || $[46] !== resolvedColor || $[47] !== setOpen || $[48] !== sourceClass || $[49] !== value) {
    t13 = defaultTab => <FillPicker value={value} resolvedSolid={resolvedColor} onChange={applyFill} allowedKinds={fillKinds} suggestions={allSuggestions} cssProperty={cssProperty} sourceClass={sourceClass} onSelectClass={onSelectClass} onClose={() => setOpen(false)} defaultTab={defaultTab} imageConfig={imageConfig} onChangeImageConfig={onChangeImageConfig} />;
    $[39] = allSuggestions;
    $[40] = applyFill;
    $[41] = cssProperty;
    $[42] = fillKinds;
    $[43] = imageConfig;
    $[44] = onChangeImageConfig;
    $[45] = onSelectClass;
    $[46] = resolvedColor;
    $[47] = setOpen;
    $[48] = sourceClass;
    $[49] = value;
    $[50] = t13;
  } else t13 = $[50];
  const picker = t13;
  let t14;
  if ($[51] !== hideLabel || $[52] !== label) {
    t14 = !hideLabel && <Text$4 size="3xs" weight="medium" variant="primary">{label}</Text$4>;
    $[51] = hideLabel;
    $[52] = label;
    $[53] = t14;
  } else t14 = $[53];
  const rowLabel = t14;
  if (sourceClass && source === "class") {
    const t15 = !!(cssProperty && onSelectClass);
    let t16;
    if ($[54] !== picker) {
      t16 = picker("libraries");
      $[54] = picker;
      $[55] = t16;
    } else t16 = $[55];
    let t17;
    if ($[56] !== displayHex || $[57] !== isPending || $[58] !== label || $[59] !== onClearOverride || $[60] !== onPopoverOpenChange || $[61] !== open || $[62] !== resolvedColor || $[63] !== rowLabel || $[64] !== showTooltip || $[65] !== sourceClass || $[66] !== t15 || $[67] !== t16) {
      t17 = <ClassSourceRow label={rowLabel} ariaLabel={label} showTooltip={showTooltip} interactive={t15} open={open} onOpenChange={onPopoverOpenChange} resolvedColor={resolvedColor} resolvedValue={displayHex} sourceClass={sourceClass} isPending={isPending} onClear={onClearOverride} picker={t16} />;
      $[56] = displayHex;
      $[57] = isPending;
      $[58] = label;
      $[59] = onClearOverride;
      $[60] = onPopoverOpenChange;
      $[61] = open;
      $[62] = resolvedColor;
      $[63] = rowLabel;
      $[64] = showTooltip;
      $[65] = sourceClass;
      $[66] = t15;
      $[67] = t16;
      $[68] = t17;
    } else t17 = $[68];
    return t17;
  }
  const t15 = !!cssProperty;
  let t16;
  if ($[69] !== defaultPickerTab || $[70] !== openWith) {
    t16 = () => openWith(defaultPickerTab);
    $[69] = defaultPickerTab;
    $[70] = openWith;
    $[71] = t16;
  } else t16 = $[71];
  const t17 = fill.kind;
  let t18;
  if ($[72] !== openTab || $[73] !== picker) {
    t18 = picker(openTab);
    $[72] = openTab;
    $[73] = picker;
    $[74] = t18;
  } else t18 = $[74];
  let t19;
  if ($[75] !== setLocalValue || $[76] !== setShowMixed) {
    t19 = v => {
      setLocalValue(v);
      setShowMixed(false);
    };
    $[75] = setLocalValue;
    $[76] = setShowMixed;
    $[77] = t19;
  } else t19 = $[77];
  let t20;
  if ($[78] !== localValue || $[79] !== onChange || $[80] !== showMixed) {
    t20 = () => {
      if (!showMixed || localValue) onChange(localValue);
    };
    $[78] = localValue;
    $[79] = onChange;
    $[80] = showMixed;
    $[81] = t20;
  } else t20 = $[81];
  let t21;
  if ($[82] !== endColorSession || $[83] !== handlePickerChange || $[84] !== label || $[85] !== localValue || $[86] !== resolvedColor || $[87] !== showMixed || $[88] !== showTooltip || $[89] !== t19 || $[90] !== t20) {
    t21 = <NativeColorInput label={label} showTooltip={showTooltip} resolvedColor={resolvedColor} localValue={localValue} showMixed={showMixed} onLocalChange={t19} onCommit={t20} onPick={handlePickerChange} onEndSession={endColorSession} />;
    $[82] = endColorSession;
    $[83] = handlePickerChange;
    $[84] = label;
    $[85] = localValue;
    $[86] = resolvedColor;
    $[87] = showMixed;
    $[88] = showTooltip;
    $[89] = t19;
    $[90] = t20;
    $[91] = t21;
  } else t21 = $[91];
  let t22;
  if ($[92] !== onClearOverride || $[93] !== source || $[94] !== sourceClass) {
    t22 = sourceClass && source === "inline" ? <div className="flex items-center gap-1">{<SourceChip className={sourceClass} isOverride={true} onClearOverride={onClearOverride} />}</div> : null;
    $[92] = onClearOverride;
    $[93] = source;
    $[94] = sourceClass;
    $[95] = t22;
  } else t22 = $[95];
  let t23;
  if ($[96] !== alphaLabel || $[97] !== commitAlpha || $[98] !== commitHex || $[99] !== displayHex || $[100] !== endAddon || $[101] !== fill.kind || $[102] !== fillLabel || $[103] !== label || $[104] !== onPopoverOpenChange || $[105] !== open || $[106] !== rowLabel || $[107] !== setShowMixed || $[108] !== showMixed || $[109] !== showTooltip || $[110] !== swatchStyle || $[111] !== t15 || $[112] !== t16 || $[113] !== t18 || $[114] !== t21 || $[115] !== t22) {
    t23 = <FillRow label={rowLabel} ariaLabel={label} showTooltip={showTooltip} editable={t15} open={open} onOpenChange={onPopoverOpenChange} onOpenPicker={t16} swatchStyle={swatchStyle} fillKind={t17} fillLabel={fillLabel} displayHex={displayHex} alphaLabel={alphaLabel} showMixed={showMixed} onShowMixed={setShowMixed} onCommitHex={commitHex} onCommitAlpha={commitAlpha} endAddon={endAddon} picker={t18} fallback={t21} override={t22} />;
    $[96] = alphaLabel;
    $[97] = commitAlpha;
    $[98] = commitHex;
    $[99] = displayHex;
    $[100] = endAddon;
    $[101] = fill.kind;
    $[102] = fillLabel;
    $[103] = label;
    $[104] = onPopoverOpenChange;
    $[105] = open;
    $[106] = rowLabel;
    $[107] = setShowMixed;
    $[108] = showMixed;
    $[109] = showTooltip;
    $[110] = swatchStyle;
    $[111] = t15;
    $[112] = t16;
    $[113] = t18;
    $[114] = t21;
    $[115] = t22;
    $[116] = t23;
  } else t23 = $[116];
  return variableBound ? <div className="flex min-w-0 items-center gap-2">{rowLabel && <span className="text-xs text-ed-foreground-secondary">{rowLabel}</span>}<VariableBindingControl property={cssProperty} /></div> : <div className="flex min-w-0 items-center gap-1"><div className="min-w-0 flex-1">{t23}</div><VariableBindingControl property={cssProperty} compact /></div>;
}

export { ColorRow };
