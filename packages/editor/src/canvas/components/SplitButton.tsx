/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/SplitButton.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger, Tooltip, TooltipContent, TooltipTrigger } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Split control shared by CanvasToolbar and ComponentEditingModeBar:
* primary action + caret menu with independent hover states.
*/
/** The filled triangle caret from the design (8×4, currentColor). */
function CaretGlyph(t0) {
  const $ = (0, import_compiler_runtime.c)(4);
  const {
    muted: t1
  } = t0;
  const muted = t1 === void 0 ? false : t1;
  let t2;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = {
      width: 8,
      height: 4,
      flexShrink: 0
    };
    $[0] = t2;
  } else t2 = $[0];
  const t3 = muted ? "text-ed-muted-foreground opacity-40" : "opacity-50";
  let t4;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = <path d="M5 6L0 0h10L5 6z" />;
    $[1] = t4;
  } else t4 = $[1];
  let t5;
  if ($[2] !== t3) {
    t5 = <svg viewBox="0 0 10 6" fill="currentColor" style={t2} className={t3}>{t4}</svg>;
    $[2] = t3;
    $[3] = t5;
  } else t5 = $[3];
  return t5;
}
/** The popover content for a dropdown, rendered from a list of item configs. */
function SplitMenu(t0) {
  const $ = (0, import_compiler_runtime.c)(7);
  const {
    items,
    minWidth
  } = t0;
  let t1;
  if ($[0] !== minWidth) {
    t1 = {
      minWidth
    };
    $[0] = minWidth;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== items) {
    t2 = items.map(_temp$61);
    $[2] = items;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== t1 || $[5] !== t2) {
    t3 = <DropdownMenuContent align="start" style={t1}>{t2}</DropdownMenuContent>;
    $[4] = t1;
    $[5] = t2;
    $[6] = t3;
  } else t3 = $[6];
  return t3;
}
function _temp$61(t0) {
  const {
    icon: Icon,
    label,
    shortcut,
    onSelect,
    separatorBefore,
    checked
  } = t0;
  return <>{separatorBefore && <DropdownMenuSeparator />}{checked === void 0 ? <DropdownMenuItem onSelect={onSelect} className="gap-2">{Icon && <Icon size={16} className="text-ed-muted-foreground" />}{<span>{label}</span>}{shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}</DropdownMenuItem> : <DropdownMenuCheckboxItem checked={checked} onSelect={onSelect}>{label}</DropdownMenuCheckboxItem>}</>;
}
function SplitButton(t0) {
  const $ = (0, import_compiler_runtime.c)(35);
  const { t } = useTranslation("editor");
  const {
    menu,
    primary,
    primaryLabel,
    active: t1,
    disabled: t2,
    onPrimary,
    items,
    minWidth,
    primarySize: t3,
    primaryVariant
  } = t0;
  const active = t1 === void 0 ? false : t1;
  const disabled = t2 === void 0 ? false : t2;
  const primarySize = t3 === void 0 ? "icon" : t3;
  const resolvedPrimaryVariant = primaryVariant ?? (primarySize === "icon" ? active ? "selected" : "ghost" : "outline");
  const t4 = primarySize === "sm" ? "h-7 rounded-[5px] px-2.5 text-xs" : "rounded-[5px]";
  let t5;
  if ($[0] !== disabled || $[1] !== onPrimary || $[2] !== primary || $[3] !== primaryLabel || $[4] !== primarySize || $[5] !== resolvedPrimaryVariant || $[6] !== t4) {
    t5 = <TooltipTrigger asChild={true}>{<Button size={primarySize} variant={resolvedPrimaryVariant} isChildText={false} aria-label={primaryLabel} onClick={onPrimary} disabled={disabled} className={t4}>{primary}</Button>}</TooltipTrigger>;
    $[0] = disabled;
    $[1] = onPrimary;
    $[2] = primary;
    $[3] = primaryLabel;
    $[4] = primarySize;
    $[5] = resolvedPrimaryVariant;
    $[6] = t4;
    $[7] = t5;
  } else t5 = $[7];
  let t6;
  if ($[8] !== primaryLabel) {
    t6 = <TooltipContent side="top">{primaryLabel}</TooltipContent>;
    $[8] = primaryLabel;
    $[9] = t6;
  } else t6 = $[9];
  let t7;
  if ($[10] !== t5 || $[11] !== t6) {
    t7 = <Tooltip>{t5}{t6}</Tooltip>;
    $[10] = t5;
    $[11] = t6;
    $[12] = t7;
  } else t7 = $[12];
  let t8;
  if ($[13] !== menu) {
    t8 = menu ?? {
      modal: false
    };
    $[13] = menu;
    $[14] = t8;
  } else t8 = $[14];
  const t9 = t("shell.moreOptionsFor", { name: primaryLabel });
  let t10;
  if ($[15] !== primarySize) {
    t10 = primarySize === "sm" ? {
      height: 28,
      width: 20
    } : void 0;
    $[15] = primarySize;
    $[16] = t10;
  } else t10 = $[16];
  let t11;
  if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
    t11 = <CaretGlyph muted={true} />;
    $[17] = t11;
  } else t11 = $[17];
  let t12;
  if ($[18] !== disabled || $[19] !== t10 || $[20] !== t9) {
    t12 = <TooltipTrigger asChild={true}>{<DropdownMenuTrigger asChild={true}>{<Button size="icon" variant="ghost" isChildText={false} disabled={disabled} aria-label={t9} className="w-4! rounded-[5px]" style={t10}>{t11}</Button>}</DropdownMenuTrigger>}</TooltipTrigger>;
    $[18] = disabled;
    $[19] = t10;
    $[20] = t9;
    $[21] = t12;
  } else t12 = $[21];
  let t13;
  if (true) {
    t13 = <TooltipContent side="top">{t("shell.more")}</TooltipContent>;
    $[22] = t13;
  } else t13 = $[22];
  let t14;
  if ($[23] !== t12) {
    t14 = <Tooltip>{t12}{t13}</Tooltip>;
    $[23] = t12;
    $[24] = t14;
  } else t14 = $[24];
  let t15;
  if ($[25] !== items || $[26] !== minWidth) {
    t15 = <SplitMenu items={items} minWidth={minWidth} />;
    $[25] = items;
    $[26] = minWidth;
    $[27] = t15;
  } else t15 = $[27];
  let t16;
  if ($[28] !== t14 || $[29] !== t15 || $[30] !== t8) {
    t16 = <DropdownMenu {...t8}>{t14}{t15}</DropdownMenu>;
    $[28] = t14;
    $[29] = t15;
    $[30] = t8;
    $[31] = t16;
  } else t16 = $[31];
  let t17;
  if ($[32] !== t16 || $[33] !== t7) {
    t17 = <div className="inline-flex items-center">{t7}{t16}</div>;
    $[32] = t16;
    $[33] = t7;
    $[34] = t17;
  } else t17 = $[34];
  return t17;
}

export { SplitButton };
