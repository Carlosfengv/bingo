/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/SidebarSectionHeader.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { CaretDownIcon, CaretRightIcon, Text$4, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Matches compact inspector controls: 26px tall, 11px type, 5px radius. */
var SIDEBAR_LIST_ROW_CLASS = "h-6.5 justify-start gap-2 rounded-[5px] px-1.5 text-[11px] font-normal text-ed-foreground-secondary hover:text-ed-foreground [&_svg]:size-4";
var SIDEBAR_LIST_ROW_ACTIVE_CLASS = "data-[active=true]:bg-ed-accent data-[active=true]:text-ed-foreground";
/**
* Left-sidebar section title + action rail, matching the Styles header:
* 11px / leading-6 title, 26px icon buttons, and 12px horizontal insets.
*/
function SidebarSectionHeader(t0) {
  const $ = (0, import_compiler_runtime.c)(39);
  const { t } = useTranslation("common");
  const {
    title,
    icon,
    expanded,
    onToggle,
    actions,
    leadingAction,
    className,
    alignWithLayerRows: t1,
    showScrollBorder: t2,
    titleClassName
  } = t0;
  const alignWithLayerRows = t1 === void 0 ? false : t1;
  const showScrollBorder = t2 === void 0 ? false : t2;
  const toggleable = !!onToggle;
  const ChevronIcon = expanded ? CaretDownIcon : CaretRightIcon;
  const t3 = showScrollBorder ? "" : void 0;
  const t4 = toggleable ? "button" : void 0;
  const t5 = toggleable ? 0 : void 0;
  const t6 = alignWithLayerRows && "pl-2 pr-1";
  let t7;
  if ($[0] !== className || $[1] !== t6) {
    t7 = cn$2("relative flex h-10 shrink-0 items-center justify-between px-3 outline-none focus-visible:ring-2 focus-visible:ring-ed-ring", "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-transparent data-[scroll-border]:after:bg-ed-border", t6, className);
    $[0] = className;
    $[1] = t6;
    $[2] = t7;
  } else t7 = $[2];
  let t8;
  if ($[3] !== onToggle) {
    t8 = event => {
      if (!onToggle) return;
      if (event.target !== event.currentTarget) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onToggle();
    };
    $[3] = onToggle;
    $[4] = t8;
  } else t8 = $[4];
  const t9 = toggleable ? expanded : void 0;
  const t10 = toggleable ? t(expanded ? "actions.collapse" : "actions.expand", { name: title }) : void 0;
  const t11 = leadingAction || alignWithLayerRows ? "gap-1" : "gap-1.5";
  let t12;
  if ($[5] !== t11) {
    t12 = cn$2("flex h-6 min-w-0 items-center", t11);
    $[5] = t11;
    $[6] = t12;
  } else t12 = $[6];
  let t13;
  if ($[7] !== leadingAction) {
    t13 = leadingAction && <span className="flex shrink-0 items-center" onClick={_temp$29}>{leadingAction}</span>;
    $[7] = leadingAction;
    $[8] = t13;
  } else t13 = $[8];
  let t14;
  if ($[9] !== ChevronIcon || $[10] !== alignWithLayerRows || $[11] !== toggleable) {
    t14 = toggleable && <span className="flex size-4 shrink-0 items-center justify-center text-ed-foreground-secondary">{<ChevronIcon className={alignWithLayerRows ? "size-2.5 translate-x-0.5" : "size-2"} />}</span>;
    $[9] = ChevronIcon;
    $[10] = alignWithLayerRows;
    $[11] = toggleable;
    $[12] = t14;
  } else t14 = $[12];
  let t15;
  if ($[13] !== icon) {
    t15 = icon && <span className="flex size-4 shrink-0 items-center justify-center text-ed-foreground-secondary [&_svg]:size-4">{icon}</span>;
    $[13] = icon;
    $[14] = t15;
  } else t15 = $[14];
  let t16;
  if ($[15] !== titleClassName) {
    t16 = cn$2("min-w-0 truncate leading-6", titleClassName);
    $[15] = titleClassName;
    $[16] = t16;
  } else t16 = $[16];
  let t17;
  if ($[17] !== t16 || $[18] !== title) {
    t17 = <Text$4 size="3xs" variant="secondary" className={t16}>{title}</Text$4>;
    $[17] = t16;
    $[18] = title;
    $[19] = t17;
  } else t17 = $[19];
  let t18;
  if ($[20] !== t12 || $[21] !== t13 || $[22] !== t14 || $[23] !== t15 || $[24] !== t17) {
    t18 = <div className={t12}>{t13}{t14}{t15}{t17}</div>;
    $[20] = t12;
    $[21] = t13;
    $[22] = t14;
    $[23] = t15;
    $[24] = t17;
    $[25] = t18;
  } else t18 = $[25];
  let t19;
  if ($[26] !== actions) {
    t19 = actions && <div className="flex shrink-0 items-center gap-1.5" onClick={_temp2$21}>{actions}</div>;
    $[26] = actions;
    $[27] = t19;
  } else t19 = $[27];
  let t20;
  if ($[28] !== onToggle || $[29] !== t10 || $[30] !== t18 || $[31] !== t19 || $[32] !== t3 || $[33] !== t4 || $[34] !== t5 || $[35] !== t7 || $[36] !== t8 || $[37] !== t9) {
    t20 = <div data-scroll-border={t3} role={t4} tabIndex={t5} className={t7} onClick={onToggle} onKeyDown={t8} aria-expanded={t9} aria-label={t10}>{t18}{t19}</div>;
    $[28] = onToggle;
    $[29] = t10;
    $[30] = t18;
    $[31] = t19;
    $[32] = t3;
    $[33] = t4;
    $[34] = t5;
    $[35] = t7;
    $[36] = t8;
    $[37] = t9;
    $[38] = t20;
  } else t20 = $[38];
  return t20;
}
function _temp2$21(event_1) {
  return event_1.stopPropagation();
}
function _temp$29(event_0) {
  return event_0.stopPropagation();
}

export { SIDEBAR_LIST_ROW_ACTIVE_CLASS, SIDEBAR_LIST_ROW_CLASS, SidebarSectionHeader };
