/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/InspectorToggleGroup.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ToggleGroup, ToggleGroupItem, Tooltip, TooltipContent, TooltipTrigger, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import { translateInspectorText } from "./inspectorCopy";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Inspector-specific single-select toggle group. Interaction and accessibility
* come from the shared design-system primitive; this wrapper owns the compact
* inspector presentation and the separators between inactive items.
*/
function InspectorToggleGroup(t0) {
  const $ = (0, import_compiler_runtime.c)(22);
  const { t } = useTranslation("editor");
  let className;
  let itemClassName;
  let onValueChange;
  let options;
  let props;
  let value;
  if ($[0] !== t0) {
    ({
      value,
      onValueChange,
      options,
      className,
      itemClassName,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = itemClassName;
    $[3] = onValueChange;
    $[4] = options;
    $[5] = props;
    $[6] = value;
  } else {
    className = $[1];
    itemClassName = $[2];
    onValueChange = $[3];
    options = $[4];
    props = $[5];
    value = $[6];
  }
  let t1;
  if ($[7] !== onValueChange) {
    t1 = nextValue => {
      if (nextValue) onValueChange(nextValue);
    };
    $[7] = onValueChange;
    $[8] = t1;
  } else t1 = $[8];
  let t2;
  if ($[9] !== className) {
    t2 = cn$2("w-full gap-0 bg-ed-tab-track p-0.5 text-ed-inspector-chrome", className);
    $[9] = className;
    $[10] = t2;
  } else t2 = $[10];
  let t3;
  if (true) {
    let t4;
    if (true) {
      t4 = option => {
        const localizedLabel = translateInspectorText(t, option.label);
        const localizedTooltip = translateInspectorText(t, option.tooltip);
        const item = <ToggleGroupItem key={option.value} value={option.value} aria-label={localizedLabel} disabled={option.disabled} className={cn$2("min-w-0 flex-1 px-1 py-0 font-normal text-ed-inspector-chrome", "data-[state=on]:border data-[state=on]:border-ed-field-border data-[state=on]:bg-ed-tab-active data-[state=on]:text-ed-foreground data-[state=on]:shadow-none", itemClassName, option.className)}>{option.content ?? localizedLabel}</ToggleGroupItem>;
        return localizedTooltip ? <Tooltip key={option.value}>{<TooltipTrigger asChild={true}>{<span className="flex h-full min-w-0 flex-1">{item}</span>}</TooltipTrigger>}{<TooltipContent side="top" sideOffset={4}>{localizedTooltip}</TooltipContent>}</Tooltip> : item;
      };
      $[14] = itemClassName;
      $[15] = t4;
    } else t4 = $[15];
    t3 = options.map(t4);
    $[11] = itemClassName;
    $[12] = options;
    $[13] = t3;
  } else t3 = $[13];
  let t4;
  if ($[16] !== props || $[17] !== t1 || $[18] !== t2 || $[19] !== t3 || $[20] !== value) {
    t4 = <ToggleGroup type="single" size="sm" value={value} onValueChange={t1} className={t2} {...props} aria-label={translateInspectorText(t, props["aria-label"])}>{t3}</ToggleGroup>;
    $[16] = props;
    $[17] = t1;
    $[18] = t2;
    $[19] = t3;
    $[20] = value;
    $[21] = t4;
  } else t4 = $[21];
  return t4;
}

export { InspectorToggleGroup };
