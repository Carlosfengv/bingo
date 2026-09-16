/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/sections/InspectorSection.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ClassPickerContent } from "../inputs/ClassPickerContent";
import { IconBtn } from "../primitives";
import { translateInspectorText } from "../inspectorCopy";
import { useTranslation } from "@bingo/i18n";
import { AddVariableIcon, MinusIcon, PlusIcon, Popover, PopoverContent, PopoverTrigger, cn$2 } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Shared section shell for inspector controls. The default variant is always
* expanded; the addable variant stays collapsed until its styles are set.
*/
function InspectorSection(props) {
  const $ = (0, import_compiler_runtime.c)(41);
  const { t } = useTranslation("editor");
  const [showPicker, setShowPicker] = (0, import_react.useState)(false);
  const [forceOpen, setForceOpen] = (0, import_react.useState)(false);
  const isAddable = props.variant === "addable";
  const isSet = isAddable ? props.isSet : true;
  if (isSet && forceOpen) setForceOpen(false);
  const isOpen = !isAddable || isSet || forceOpen;
  let t0;
  if ($[0] !== isAddable || $[1] !== isOpen || $[2] !== props) {
    t0 = () => {
      if (!isAddable || isOpen) return;
      props.onAdd();
      if (props.optimisticOpenOnAdd !== false) setForceOpen(true);
    };
    $[0] = isAddable;
    $[1] = isOpen;
    $[2] = props;
    $[3] = t0;
  } else t0 = $[3];
  const addSection = t0;
  let t1;
  if (true) {
    t1 = isAddable && props.classSuggestions && props.onSelectClass ? <Popover open={showPicker} onOpenChange={setShowPicker} modal={false}>{<PopoverTrigger asChild={true}>{<IconBtn label={t("styles.applyClass")} className={cn$2(!isOpen && "pointer-events-none opacity-0 group-hover/addable:pointer-events-auto group-hover/addable:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100")}>{<AddVariableIcon />}</IconBtn>}</PopoverTrigger>}{<PopoverContent align="end" className="w-64 p-0" onOpenAutoFocus={_temp$53}>{<ClassPickerContent suggestions={props.classSuggestions} cssProperty={props.cssProperty} onSelect={className => {
          props.onSelectClass?.(className);
          setShowPicker(false);
          setForceOpen(true);
        }} onClose={() => setShowPicker(false)} />}</PopoverContent>}</Popover> : null;
    $[4] = isAddable;
    $[5] = isOpen;
    $[6] = props;
    $[7] = showPicker;
    $[8] = t1;
  } else t1 = $[8];
  const classPicker = t1;
  let t2;
  if ($[9] !== props.className) {
    t2 = cn$2("min-w-0 max-w-full overflow-x-hidden border-b border-ed-divider", props.className);
    $[9] = props.className;
    $[10] = t2;
  } else t2 = $[10];
  const t3 = isAddable && !isOpen && "group/addable";
  let t4;
  if ($[11] !== t3) {
    t4 = cn$2("flex min-h-10.5 items-center justify-between px-3 py-2", t3);
    $[11] = t3;
    $[12] = t4;
  } else t4 = $[12];
  let t5;
  if ($[13] !== addSection || $[14] !== isAddable || $[15] !== isOpen) {
    t5 = event_0 => {
      if (!isAddable || isOpen) return;
      if (event_0.target.closest("button")) return;
      addSection();
    };
    $[13] = addSection;
    $[14] = isAddable;
    $[15] = isOpen;
    $[16] = t5;
  } else t5 = $[16];
  const t6 = isAddable && !isOpen ? "text-ed-muted-foreground/75 group-hover/addable:text-ed-inspector-value" : "text-ed-inspector-value";
  let t7;
  if ($[17] !== t6) {
    t7 = cn$2("flex min-w-0 items-center text-[11px] font-normal leading-6", t6);
    $[17] = t6;
    $[18] = t7;
  } else t7 = $[18];
  let t8;
  const localizedTitle = translateInspectorText(t, props.title);
  if ($[19] !== localizedTitle || $[20] !== t7) {
    t8 = <div className={t7}>{localizedTitle}</div>;
    $[19] = localizedTitle;
    $[20] = t7;
    $[21] = t8;
  } else t8 = $[21];
  let t9;
  if (true) {
    t9 = isAddable ? <div className={cn$2("flex items-center gap-1.5", !isOpen && "[&_button]:text-ed-muted-foreground/75 group-hover/addable:[&_button]:text-ed-foreground-secondary")}>{isOpen ? props.action === void 0 ? <>{classPicker}{props.onRemove && <IconBtn label={t("styles.remove")} onClick={() => {
          props.onRemove?.();
          setForceOpen(false);
        }}>{<MinusIcon />}</IconBtn>}</> : props.action : props.collapsedAction ? props.collapsedAction : <>{classPicker}{<IconBtn label={t("styles.add")} onClick={addSection}>{<PlusIcon />}</IconBtn>}</>}</div> : props.action;
    $[22] = addSection;
    $[23] = classPicker;
    $[24] = isAddable;
    $[25] = isOpen;
    $[26] = props;
    $[27] = t9;
  } else t9 = $[27];
  let t10;
  if ($[28] !== t4 || $[29] !== t5 || $[30] !== t8 || $[31] !== t9) {
    t10 = <div className={t4} onClick={t5}>{t8}{t9}</div>;
    $[28] = t4;
    $[29] = t5;
    $[30] = t8;
    $[31] = t9;
    $[32] = t10;
  } else t10 = $[32];
  let t11;
  if ($[33] !== isOpen || $[34] !== props.children || $[35] !== props.reserveActionRail) {
    t11 = isOpen && props.children && <div className={cn$2("min-w-0 max-w-full space-y-1.5 pl-3 pb-3.5", props.reserveActionRail ? "pr-[42px]" : "pr-3")}>{props.children}</div>;
    $[33] = isOpen;
    $[34] = props.children;
    $[35] = props.reserveActionRail;
    $[36] = t11;
  } else t11 = $[36];
  let t12;
  if ($[37] !== t10 || $[38] !== t11 || $[39] !== t2) {
    t12 = <div className={t2}>{t10}{t11}</div>;
    $[37] = t10;
    $[38] = t11;
    $[39] = t2;
    $[40] = t12;
  } else t12 = $[40];
  return t12;
}
function _temp$53(event) {
  return event.preventDefault();
}

export { InspectorSection };
