/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/fields/typography.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useClassSuggestions } from "../../../../hooks/useClassSuggestions";
import { formatLetterSpacing, letterSpacingInputToCss, parseLetterSpacing } from "../../../../utils/cssValue";
import { useStyleField } from "../StyleOpsContext";
import { ActiveClassChip, ActiveClassUnlinkAction } from "../inputs/parts/ActiveClassChip";
import { ClassPickerPopover } from "../inputs/parts/ClassPickerPopover";
import { OverrideChip } from "../inputs/parts/OverrideChip";
import { useInspectorScrub } from "../inputs/useInspectorScrub";
import { InspectorClassPickerIndicator, InspectorControlAction, InspectorControlInput, InspectorControlShell, InspectorScrubHandle, blurInspectorInputOnEnter } from "../primitives";
import { AddVariableIcon, Popover, PopoverAnchor, PopoverTrigger } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Bespoke letter-spacing field bound to the StyleOps context. The ordinary
* typography values use the shared InlineInput; this stays custom for its
* percent/em conversion behavior.
*/
/**
* Letter-spacing control bound to the StyleOps context. Behaves like the
* reference tool: the unit is typed inline (the field shows "5%" / "2px"), a
* bare number is percent-of-font-size (stored as `em`), and the value is
* drag-scrubbable via the leading icon. Typed `px` is kept literal; any other
* unit falls back to `%`. The trailing caret opens the Tailwind class picker
* (tracking-*), mirroring the Margin/Padding inputs — when a class drives the
* property it shows the class chip instead. (Conversions live in cssValue.ts.)
*/
function StyleLetterSpacingInput(t0) {
  const $ = (0, import_compiler_runtime.c)(61);
  const {
    icon
  } = t0;
  const f = useStyleField("letterSpacing");
  let t1;
  if ($[0] !== f.explicit || $[1] !== f.isMixed) {
    t1 = f.isMixed ? {
      num: null,
      unit: "%"
    } : parseLetterSpacing(f.explicit);
    $[0] = f.explicit;
    $[1] = f.isMixed;
    $[2] = t1;
  } else t1 = $[2];
  const parsed = t1;
  const [draft, setDraft] = import_react.useState(null);
  const display = draft !== null ? draft : parsed.num === null ? "" : `${parsed.num}${parsed.unit}`;
  const {
    source,
    sourceClass,
    isPending,
    onClearOverride
  } = f.source;
  let t2;
  if ($[3] !== f) {
    t2 = raw => {
      const css = letterSpacingInputToCss(raw);
      setDraft(null);
      if (css !== null) f.set(css);
    };
    $[3] = f;
    $[4] = t2;
  } else t2 = $[4];
  const commit = t2;
  let t3;
  if ($[5] !== f.explicit) {
    t3 = () => parseLetterSpacing(f.explicit).num ?? 0;
    $[5] = f.explicit;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== f) {
    t4 = next => f.set(formatLetterSpacing(next, parseLetterSpacing(f.explicit).unit));
    $[7] = f;
    $[8] = t4;
  } else t4 = $[8];
  const t5 = parsed.unit === "px" ? 2 : 1;
  let t6;
  if ($[9] !== t5) {
    t6 = {
      precision: t5
    };
    $[9] = t5;
    $[10] = t6;
  } else t6 = $[10];
  const {
    scrubRef,
    isScrubbing
  } = useInspectorScrub(t3, t4, t6);
  const {
    showSuggestions,
    setShowSuggestions,
    allSuggestions
  } = useClassSuggestions("letterSpacing", f.addClass);
  let t7;
  if ($[11] !== setShowSuggestions) {
    t7 = () => setShowSuggestions(false);
    $[11] = setShowSuggestions;
    $[12] = t7;
  } else t7 = $[12];
  let t8;
  if ($[13] !== allSuggestions || $[14] !== f.addClass || $[15] !== sourceClass || $[16] !== t7) {
    t8 = <ClassPickerPopover suggestions={allSuggestions} cssProperty="letterSpacing" sourceClass={sourceClass} onSelect={f.addClass} onClose={t7} />;
    $[13] = allSuggestions;
    $[14] = f.addClass;
    $[15] = sourceClass;
    $[16] = t7;
    $[17] = t8;
  } else t8 = $[17];
  const picker = t8;
  let t9;
  if ($[18] !== icon || $[19] !== scrubRef) {
    t9 = icon ? <InspectorScrubHandle ref={scrubRef}>{icon}</InspectorScrubHandle> : null;
    $[18] = icon;
    $[19] = scrubRef;
    $[20] = t9;
  } else t9 = $[20];
  const iconHandle = t9;
  if (sourceClass && source === "class") {
    let t10;
    if ($[21] !== f.value) {
      t10 = parseLetterSpacing(f.value);
      $[21] = f.value;
      $[22] = t10;
    } else t10 = $[22];
    const resolved = t10;
    const chipValue = resolved.num === null ? "" : `${resolved.num}${resolved.unit}`;
    const t11 = isScrubbing || showSuggestions;
    let t12;
    if ($[23] !== chipValue || $[24] !== isPending || $[25] !== sourceClass) {
      t12 = <PopoverTrigger asChild={true}>{<InspectorControlAction className="min-w-0 flex-1 justify-start p-0">{<ActiveClassChip sourceClass={sourceClass} fieldTooltip="Letter spacing" value={chipValue} isPending={isPending} />}</InspectorControlAction>}</PopoverTrigger>;
      $[23] = chipValue;
      $[24] = isPending;
      $[25] = sourceClass;
      $[26] = t12;
    } else t12 = $[26];
    let t13;
    if ($[27] !== onClearOverride) {
      t13 = onClearOverride && <ActiveClassUnlinkAction onClear={onClearOverride} />;
      $[27] = onClearOverride;
      $[28] = t13;
    } else t13 = $[28];
    let t14;
    if ($[29] !== iconHandle || $[30] !== t11 || $[31] !== t12 || $[32] !== t13) {
      t14 = <PopoverAnchor asChild={true}>{<InspectorControlShell active={t11}>{iconHandle}{t12}{t13}</InspectorControlShell>}</PopoverAnchor>;
      $[29] = iconHandle;
      $[30] = t11;
      $[31] = t12;
      $[32] = t13;
      $[33] = t14;
    } else t14 = $[33];
    let t15;
    if ($[34] !== picker || $[35] !== setShowSuggestions || $[36] !== showSuggestions || $[37] !== t14) {
      t15 = <Popover open={showSuggestions} onOpenChange={setShowSuggestions} modal={false}>{t14}{picker}</Popover>;
      $[34] = picker;
      $[35] = setShowSuggestions;
      $[36] = showSuggestions;
      $[37] = t14;
      $[38] = t15;
    } else t15 = $[38];
    return t15;
  }
  const t10 = isScrubbing || showSuggestions;
  const t11 = f.isMixed && draft === null ? "" : display;
  let t12;
  if ($[39] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = e => setDraft(e.target.value);
    $[39] = t12;
  } else t12 = $[39];
  let t13;
  if ($[40] !== commit || $[41] !== draft) {
    t13 = () => {
      if (draft !== null) commit(draft);
    };
    $[40] = commit;
    $[41] = draft;
    $[42] = t13;
  } else t13 = $[42];
  const t14 = f.isMixed ? "-" : "0";
  let t15;
  if ($[43] !== t11 || $[44] !== t13 || $[45] !== t14) {
    t15 = <InspectorControlInput tooltip="Letter spacing" value={t11} onChange={t12} onBlur={t13} onKeyDown={blurInspectorInputOnEnter} placeholder={t14} />;
    $[43] = t11;
    $[44] = t13;
    $[45] = t14;
    $[46] = t15;
  } else t15 = $[46];
  let t16;
  if ($[47] !== onClearOverride || $[48] !== source || $[49] !== sourceClass) {
    t16 = sourceClass && source === "inline" ? <OverrideChip sourceClass={sourceClass} onClearOverride={onClearOverride} className="max-w-15" /> : <PopoverTrigger asChild={true}>{<InspectorControlAction title="Apply class" aria-label="Letter-spacing Tailwind classes">{<InspectorClassPickerIndicator>{<AddVariableIcon />}</InspectorClassPickerIndicator>}</InspectorControlAction>}</PopoverTrigger>;
    $[47] = onClearOverride;
    $[48] = source;
    $[49] = sourceClass;
    $[50] = t16;
  } else t16 = $[50];
  let t17;
  if ($[51] !== iconHandle || $[52] !== t10 || $[53] !== t15 || $[54] !== t16) {
    t17 = <PopoverAnchor asChild={true}>{<InspectorControlShell active={t10}>{iconHandle}{t15}{t16}</InspectorControlShell>}</PopoverAnchor>;
    $[51] = iconHandle;
    $[52] = t10;
    $[53] = t15;
    $[54] = t16;
    $[55] = t17;
  } else t17 = $[55];
  let t18;
  if ($[56] !== picker || $[57] !== setShowSuggestions || $[58] !== showSuggestions || $[59] !== t17) {
    t18 = <Popover open={showSuggestions} onOpenChange={setShowSuggestions} modal={false}>{t17}{picker}</Popover>;
    $[56] = picker;
    $[57] = setShowSuggestions;
    $[58] = showSuggestions;
    $[59] = t17;
    $[60] = t18;
  } else t18 = $[60];
  return t18;
}

export { StyleLetterSpacingInput };
