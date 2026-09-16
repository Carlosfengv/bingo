/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/parts/InspectorDropdown.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { INSPECTOR_CONTROL_TEXT_STYLE, InspectorControlShell } from "../../primitives";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue, Tooltip, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import { translateInspectorText } from "../../inspectorCopy";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var MENU_ALIGNMENT_OFFSET = 4;
/** Standard inspector select whose selected item opens over the trigger. */
function InspectorDropdown(t0) {
  const $ = (0, import_compiler_runtime.c)(54);
  const { t } = useTranslation("editor");
  const {
    label,
    value,
    selectedValue,
    options,
    onValueChange,
    isMixed: t1,
    hasIcon: t2,
    className,
    triggerClassName,
    contentClassName,
    onOpenChange,
    disabled: t3
  } = t0;
  const isMixed = t1 === void 0 ? false : t1;
  const hasIcon = t2 === void 0 ? true : t2;
  const disabled = t3 === void 0 ? false : t3;
  const [open, setOpen] = import_react.useState(false);
  let t4;
  if ($[0] !== options || $[1] !== selectedValue) {
    let t5;
    if ($[3] !== selectedValue) {
      t5 = option => option.value === selectedValue;
      $[3] = selectedValue;
      $[4] = t5;
    } else t5 = $[4];
    t4 = options.some(t5);
    $[0] = options;
    $[1] = selectedValue;
    $[2] = t4;
  } else t4 = $[2];
  const hasSelection = t4;
  const [triggerWidth, setTriggerWidth] = import_react.useState();
  const [horizontalOffset, setHorizontalOffset] = import_react.useState(0);
  const [positioned, setPositioned] = import_react.useState(false);
  const shellRef = import_react.useRef(null);
  const triggerRef = import_react.useRef(null);
  const contentRef = import_react.useRef(null);
  const localizedLabel = translateInspectorText(t, label);
  const localizedValue = translateInspectorText(t, value);
  const optionGroups = options.map(option => ({
    ...option,
    label: translateInspectorText(t, option.label),
    group: translateInspectorText(t, option.group)
  })).reduce(_temp$45, []);
  let t5;
  if ($[5] !== hasSelection || $[6] !== open) {
    t5 = () => {
      if (!open || !hasSelection) return;
      const frame = requestAnimationFrame(() => {
        const shell = shellRef.current?.getBoundingClientRect();
        const content = contentRef.current?.getBoundingClientRect();
        if (shell && content) {
          setHorizontalOffset(shell.left - content.left - MENU_ALIGNMENT_OFFSET);
          setPositioned(true);
        }
      });
      return () => cancelAnimationFrame(frame);
    };
    $[5] = hasSelection;
    $[6] = open;
    $[7] = t5;
  } else t5 = $[7];
  let t6;
  if ($[8] !== hasSelection || $[9] !== open || $[10] !== triggerWidth) {
    t6 = [open, hasSelection, triggerWidth];
    $[8] = hasSelection;
    $[9] = open;
    $[10] = triggerWidth;
    $[11] = t6;
  } else t6 = $[11];
  import_react.useLayoutEffect(t5, t6);
  const T0 = Select;
  let t7;
  if ($[12] !== onOpenChange) {
    t7 = nextOpen => {
      if (nextOpen) {
        setHorizontalOffset(0);
        setPositioned(false);
        setTriggerWidth(shellRef.current?.getBoundingClientRect().width);
      }
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);
    };
    $[12] = onOpenChange;
    $[13] = t7;
  } else t7 = $[13];
  const t8 = !hasIcon && "pl-2";
  let t9;
  if ($[14] !== t8 || $[15] !== triggerClassName) {
    t9 = cn$2("h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-1 py-0 pr-1.5 text-[11px] font-normal text-ed-inspector-value shadow-none focus:ring-0 [&>svg]:size-3 [&>svg]:shrink-0 [&>svg]:text-ed-inspector-chrome [&>svg]:opacity-100", t8, triggerClassName);
    $[14] = t8;
    $[15] = triggerClassName;
    $[16] = t9;
  } else t9 = $[16];
  let t10;
  if (true) {
    t10 = <SelectValue asChild={true} placeholder={<span className="min-w-0 truncate text-left">{localizedValue}</span>}>{<span className="min-w-0 truncate text-left">{localizedValue}</span>}</SelectValue>;
    $[17] = value;
    $[18] = t10;
  } else t10 = $[18];
  let t11;
  if (true) {
    t11 = <SelectTrigger ref={triggerRef} aria-label={localizedLabel} size="xs" style={INSPECTOR_CONTROL_TEXT_STYLE} className={t9}>{t10}</SelectTrigger>;
    $[19] = label;
    $[20] = t10;
    $[21] = t9;
    $[22] = t11;
  } else t11 = $[22];
  let t12;
  if (true) {
    t12 = <Tooltip content={localizedLabel}>{t11}</Tooltip>;
    $[23] = label;
    $[24] = t11;
    $[25] = t12;
  } else t12 = $[25];
  let t13;
  if ($[26] !== className || $[27] !== open || $[28] !== t12) {
    t13 = <InspectorControlShell ref={shellRef} active={open} className={className}>{t12}</InspectorControlShell>;
    $[26] = className;
    $[27] = open;
    $[28] = t12;
    $[29] = t13;
  } else t13 = $[29];
  const T1 = SelectContent;
  const t14 = hasSelection ? "item-aligned" : "popper";
  const t15 = triggerWidth === void 0 ? void 0 : triggerWidth + (hasSelection ? MENU_ALIGNMENT_OFFSET : 0);
  const t16 = hasSelection ? horizontalOffset : 0;
  const t17 = positioned || !hasSelection ? "visible" : "hidden";
  let t18;
  if ($[30] !== t15 || $[31] !== t16 || $[32] !== t17) {
    t18 = {
      ...INSPECTOR_CONTROL_TEXT_STYLE,
      minWidth: t15,
      marginLeft: t16,
      visibility: t17
    };
    $[30] = t15;
    $[31] = t16;
    $[32] = t17;
    $[33] = t18;
  } else t18 = $[33];
  const t19 = isMixed && "[&_[role=option]>span:first-child]:invisible";
  let t20;
  if ($[34] !== contentClassName || $[35] !== t19) {
    t20 = cn$2("w-max min-w-0", t19, contentClassName);
    $[34] = contentClassName;
    $[35] = t19;
    $[36] = t20;
  } else t20 = $[36];
  let t21;
  if ($[37] === Symbol.for("react.memo_cache_sentinel")) {
    t21 = event => {
      event.preventDefault();
      triggerRef.current?.blur();
    };
    $[37] = t21;
  } else t21 = $[37];
  const t22 = optionGroups.map(_temp3$22);
  let t23;
  if ($[38] !== T1 || $[39] !== t14 || $[40] !== t18 || $[41] !== t20 || $[42] !== t21 || $[43] !== t22) {
    t23 = <T1 ref={contentRef} position={t14} style={t18} className={t20} onCloseAutoFocus={t21}>{t22}</T1>;
    $[38] = T1;
    $[39] = t14;
    $[40] = t18;
    $[41] = t20;
    $[42] = t21;
    $[43] = t22;
    $[44] = t23;
  } else t23 = $[44];
  let t24;
  if ($[45] !== T0 || $[46] !== disabled || $[47] !== onValueChange || $[48] !== open || $[49] !== selectedValue || $[50] !== t13 || $[51] !== t23 || $[52] !== t7) {
    t24 = <T0 value={selectedValue} onValueChange={onValueChange} disabled={disabled} open={open} onOpenChange={t7}>{t13}{t23}</T0>;
    $[45] = T0;
    $[46] = disabled;
    $[47] = onValueChange;
    $[48] = open;
    $[49] = selectedValue;
    $[50] = t13;
    $[51] = t23;
    $[52] = t7;
    $[53] = t24;
  } else t24 = $[53];
  return t24;
}
function _temp3$22(group, groupIndex) {
  return <>{groupIndex > 0 && <SelectSeparator />}{<SelectGroup>{group.label && <SelectLabel className="px-1.5 py-1 text-[10px] font-normal text-ed-foreground-secondary">{group.label}</SelectLabel>}{group.options.map(_temp2$35)}</SelectGroup>}</>;
}
function _temp2$35(option_1) {
  return <SelectItem key={option_1.value} value={option_1.value} disabled={option_1.disabled} className="justify-start gap-1.5 whitespace-nowrap px-1 [&>span:first-child]:ml-0 [&>span:first-child]:size-4">{option_1.label}</SelectItem>;
}
function _temp$45(groups, option_0) {
  const previous = groups[groups.length - 1];
  if (previous && previous.label === option_0.group) previous.options.push(option_0);else groups.push({
    label: option_0.group,
    options: [option_0]
  });
  return groups;
}

export { InspectorDropdown };
