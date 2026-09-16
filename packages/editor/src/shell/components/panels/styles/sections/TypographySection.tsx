/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/sections/TypographySection.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { TYPOGRAPHY_KEYS } from "../../../../constants";
import { isTypographyClass } from "../../../../utils/tailwindClasses";
import { getFontDisplayName } from "../../../../utils/typography";
import { useStyleField, useStyleOps } from "../StyleOpsContext";
import { StyleColorInput } from "../fields/color";
import { StyleInlineInput, StyleSectionField, StyleSectionRow, StyleToggleGroupField } from "../fields/controls";
import { StyleLetterSpacingInput } from "../fields/typography";
import { IconBtn, InspectorRailRow } from "../primitives";
import { FontFamilyPicker, FontWeightPicker } from "../typography/FontPickers";
import { TextFormatRow } from "../typography/TextFormatRow";
import { InspectorSection } from "./InspectorSection";
import { isTextOwner } from "@bingo/compiler";
import { AlignTextBottomIcon, AlignTextMiddleIcon, AlignTextTopIcon, FontSizeIcon, LetterSpacingIcon$1, LineHeightIcon, OverflowSettingsIcon, Popover, PopoverContent, PopoverTrigger, TextAlignCenterIcon, TextAlignLeftIcon, TextAlignRightIcon } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Typography section — color, font family + weight, size, line-height, letter-
* spacing, alignment (text + vertical), and the B/I/U/S format popover. The
* small context-bound helpers (FontFamilyField, TextFormatPopover, the
* alignment option sets) live here since the section is their only consumer.
*/
function LetterSpacingIcon() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <LetterSpacingIcon$1 className="text-ed-muted-foreground" />;
    $[0] = t0;
  } else t0 = $[0];
  return t0;
}
var GENERIC_FAMILIES = new Set(["sans-serif", "serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded", "-apple-system"]);
/**
* Turn a computed `font-family` value into a friendly family name for the picker
* placeholder, or undefined if there's nothing meaningful to show. Handles
* next/font's hashed names (`__Open_Sans_e8ce7c` → "Open Sans") and skips bare
* CSS generics.
*/
function prettyInheritedFamily(computed) {
  const first = computed.split(",")[0]?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!first) return void 0;
  const nextFont = first.match(/^__(.+?)(?:_Fallback)?_[0-9a-z]{6,}$/i);
  if (nextFont) return nextFont[1].replace(/_/g, " ");
  if (GENERIC_FAMILIES.has(first.toLowerCase())) return void 0;
  return first;
}
/** Font family picker bound to `fontFamily` via the StyleOps context. */
function FontFamilyField() {
  const $ = (0, import_compiler_runtime.c)(12);
  const f = useStyleField("fontFamily");
  const {
    fonts,
    selectedElementId
  } = useStyleOps();
  const hasExplicit = f.isMixed || !!f.explicit;
  const [measuredFamily, setMeasuredFamily] = (0, import_react.useState)();
  let t0;
  let t1;
  if ($[0] !== hasExplicit || $[1] !== selectedElementId) {
    t0 = () => {
      if (hasExplicit || !selectedElementId) return;
      const el = document.querySelector(`[data-element-id="${selectedElementId}"]`);
      const computed = el ? getComputedStyle(el).fontFamily : "";
      setMeasuredFamily(prettyInheritedFamily(computed));
    };
    t1 = [hasExplicit, selectedElementId];
    $[0] = hasExplicit;
    $[1] = selectedElementId;
    $[2] = t0;
    $[3] = t1;
  } else {
    t0 = $[2];
    t1 = $[3];
  }
  (0, import_react.useLayoutEffect)(t0, t1);
  const inheritedFamily = hasExplicit || !selectedElementId ? void 0 : measuredFamily;
  const t2 = f.isMixed ? "" : f.explicit;
  const t3 = f.source.source === "class" ? f.source.sourceClass : void 0;
  let t4;
  if ($[4] !== f.addClass || $[5] !== f.isMixed || $[6] !== f.set || $[7] !== fonts || $[8] !== inheritedFamily || $[9] !== t2 || $[10] !== t3) {
    t4 = <FontFamilyPicker value={t2} onChange={f.set} onSelectClass={f.addClass} activeClass={t3} fonts={fonts} inheritedFamily={inheritedFamily} isMixed={f.isMixed} />;
    $[4] = f.addClass;
    $[5] = f.isMixed;
    $[6] = f.set;
    $[7] = fonts;
    $[8] = inheritedFamily;
    $[9] = t2;
    $[10] = t3;
    $[11] = t4;
  } else t4 = $[11];
  return t4;
}
/** Font weight dropdown bound to the current element's effective font family. */
function FontWeightField() {
  const $ = (0, import_compiler_runtime.c)(15);
  const weight = useStyleField("fontWeight");
  const family = useStyleField("fontFamily");
  const fontStyle = useStyleField("fontStyle");
  const {
    fonts,
    selectedElementId
  } = useStyleOps();
  let t0;
  if ($[0] !== family.value || $[1] !== fonts) {
    t0 = prettyInheritedFamily(getFontDisplayName(family.value, fonts));
    $[0] = family.value;
    $[1] = fonts;
    $[2] = t0;
  } else t0 = $[2];
  const configuredFamily = t0;
  const [measuredFamily, setMeasuredFamily] = (0, import_react.useState)();
  let t1;
  if ($[3] !== selectedElementId) {
    t1 = () => {
      if (!selectedElementId) return;
      const element = document.querySelector(`[data-element-id="${selectedElementId}"]`);
      setMeasuredFamily(prettyInheritedFamily(element ? getComputedStyle(element).fontFamily : ""));
    };
    $[3] = selectedElementId;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== family.value || $[6] !== selectedElementId) {
    t2 = [family.value, selectedElementId];
    $[5] = family.value;
    $[6] = selectedElementId;
    $[7] = t2;
  } else t2 = $[7];
  (0, import_react.useLayoutEffect)(t1, t2);
  const t3 = configuredFamily ?? (selectedElementId ? measuredFamily : void 0) ?? "";
  const t4 = fontStyle.value || "normal";
  let t5;
  if ($[8] !== fonts || $[9] !== t3 || $[10] !== t4 || $[11] !== weight.isMixed || $[12] !== weight.set || $[13] !== weight.value) {
    t5 = <FontWeightPicker family={t3} value={weight.value} fontStyle={t4} fonts={fonts} isMixed={weight.isMixed} onChange={weight.set} />;
    $[8] = fonts;
    $[9] = t3;
    $[10] = t4;
    $[11] = weight.isMixed;
    $[12] = weight.set;
    $[13] = weight.value;
    $[14] = t5;
  } else t5 = $[14];
  return t5;
}
/** Faders affordance that opens the text-format toggles (B/I/U/S). */
function TextFormatPopover() {
  const $ = (0, import_compiler_runtime.c)(15);
  const {
    get,
    selectedElementId,
    onToggleTextFormat
  } = useStyleOps();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <PopoverTrigger asChild={true}>{<IconBtn label="Text formatting" className="ml-auto">{<OverflowSettingsIcon />}</IconBtn>}</PopoverTrigger>;
    $[0] = t0;
  } else t0 = $[0];
  let t1;
  if ($[1] !== get) {
    t1 = get("fontWeight");
    $[1] = get;
    $[2] = t1;
  } else t1 = $[2];
  let t2;
  if ($[3] !== get) {
    t2 = get("fontStyle");
    $[3] = get;
    $[4] = t2;
  } else t2 = $[4];
  let t3;
  if ($[5] !== get) {
    t3 = get("textDecoration");
    $[5] = get;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== onToggleTextFormat || $[8] !== selectedElementId) {
    t4 = format => onToggleTextFormat?.(selectedElementId, format);
    $[7] = onToggleTextFormat;
    $[8] = selectedElementId;
    $[9] = t4;
  } else t4 = $[9];
  let t5;
  if ($[10] !== t1 || $[11] !== t2 || $[12] !== t3 || $[13] !== t4) {
    t5 = <Popover>{t0}{<PopoverContent align="end" className="w-auto p-2" onOpenAutoFocus={_temp$36}>{<TextFormatRow fontWeight={t1} fontStyle={t2} textDecoration={t3} onToggle={t4} />}</PopoverContent>}</Popover>;
    $[10] = t1;
    $[11] = t2;
    $[12] = t3;
    $[13] = t4;
    $[14] = t5;
  } else t5 = $[14];
  return t5;
}
function _temp$36(e) {
  return e.preventDefault();
}
var TEXT_ALIGN_OPTIONS = [{
  value: "left",
  label: "Align left",
  icon: <TextAlignLeftIcon />
}, {
  value: "center",
  label: "Align center",
  icon: <TextAlignCenterIcon />
}, {
  value: "right",
  label: "Align right",
  icon: <TextAlignRightIcon />
}];
var VERTICAL_ALIGN_OPTIONS = [{
  value: "flex-start",
  label: "Align top",
  icon: <AlignTextTopIcon />
}, {
  value: "center",
  label: "Align middle",
  icon: <AlignTextMiddleIcon />
}, {
  value: "flex-end",
  label: "Align bottom",
  icon: <AlignTextBottomIcon />
}];
function TypographySection() {
  const $ = (0, import_compiler_runtime.c)(22);
  const {
    hasAny,
    clear,
    removeClass,
    elementClassName,
    store,
    selectedElementId
  } = useStyleOps();
  let t0;
  if ($[0] !== selectedElementId || $[1] !== store) {
    t0 = isTextOwner(store, selectedElementId);
    $[0] = selectedElementId;
    $[1] = store;
    $[2] = t0;
  } else t0 = $[2];
  const isTextContext = t0;
  let t1;
  if ($[3] !== hasAny || $[4] !== isTextContext) {
    t1 = hasAny(...TYPOGRAPHY_KEYS) || isTextContext;
    $[3] = hasAny;
    $[4] = isTextContext;
    $[5] = t1;
  } else t1 = $[5];
  const t2 = isTextContext ? null : void 0;
  let t3;
  if ($[6] !== clear || $[7] !== elementClassName || $[8] !== removeClass) {
    t3 = () => {
      clear(...TYPOGRAPHY_KEYS, "fontStyle", "textDecoration", "backgroundImage", "backgroundClip", "WebkitBackgroundClip", "WebkitTextFillColor");
      const toRemove = (elementClassName ?? "").split(/\s+/).filter(Boolean).filter(isTypographyClass);
      if (toRemove.length) removeClass(toRemove);
    };
    $[6] = clear;
    $[7] = elementClassName;
    $[8] = removeClass;
    $[9] = t3;
  } else t3 = $[9];
  let t4;
  if ($[10] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = <StyleColorInput property="color" label="Color" hideLabel={true} />;
    $[10] = t4;
  } else t4 = $[10];
  let t5;
  if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = <StyleSectionField label="Font">{<FontFamilyField />}</StyleSectionField>;
    $[11] = t5;
  } else t5 = $[11];
  let t6;
  if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = <StyleSectionField label="Weight">{<FontWeightField />}</StyleSectionField>;
    $[12] = t6;
  } else t6 = $[12];
  let t7;
  if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = <StyleSectionRow>{t6}{<StyleSectionField label="Size">{<StyleInlineInput property="fontSize" icon={<FontSizeIcon className="text-ed-muted-foreground" />} unit="px" min={0} />}</StyleSectionField>}</StyleSectionRow>;
    $[13] = t7;
  } else t7 = $[13];
  let t8;
  if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = <StyleSectionField label="Line height">{<StyleInlineInput property="lineHeight" icon={<LineHeightIcon className="size-3.75 text-ed-muted-foreground" />} showUnit={false} unitPicker={true} preserveUnitless={true} min={0} className="[&_input]:capitalize" />}</StyleSectionField>;
    $[14] = t8;
  } else t8 = $[14];
  let t9;
  if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
    t9 = <StyleSectionRow>{t8}{<StyleSectionField label="Letter spacing">{<StyleLetterSpacingInput icon={<LetterSpacingIcon />} />}</StyleSectionField>}</StyleSectionRow>;
    $[15] = t9;
  } else t9 = $[15];
  let t10;
  if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
    t10 = <TextFormatPopover />;
    $[16] = t10;
  } else t10 = $[16];
  let t11;
  if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
    t11 = <div className="flex flex-col gap-2">{t4}{t5}{t7}{t9}{<StyleSectionField label="Alignment">{<InspectorRailRow action={t10}>{<div className="flex min-w-0 items-center gap-2">{<StyleToggleGroupField property="textAlign" label="Text alignment" defaultValue="left" options={TEXT_ALIGN_OPTIONS} />}{<StyleToggleGroupField property="alignItems" label="Vertical alignment" defaultValue="flex-start" options={VERTICAL_ALIGN_OPTIONS} />}</div>}</InspectorRailRow>}</StyleSectionField>}</div>;
    $[17] = t11;
  } else t11 = $[17];
  let t12;
  if ($[18] !== t1 || $[19] !== t2 || $[20] !== t3) {
    t12 = <InspectorSection reserveActionRail={true} variant="addable" title="Typography" isSet={t1} action={t2} onAdd={_temp2$28} onRemove={t3}>{t11}</InspectorSection>;
    $[18] = t1;
    $[19] = t2;
    $[20] = t3;
    $[21] = t12;
  } else t12 = $[21];
  return t12;
}
function _temp2$28() {}

export { TypographySection };
