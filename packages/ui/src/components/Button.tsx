/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Button.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { SpinnerIcon } from "../icons";
import { cn$2 } from "../lib/utils";
import { Text$4 } from "./Text";
import { Tooltip } from "./Tooltip";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var buttonVariants = {
  default: "bg-ed-primary text-ed-primary-foreground hover:bg-ed-primary/90",
  destructive: "bg-ed-destructive text-white hover:bg-ed-destructive/90 focus-visible:ring-ed-destructive dark:bg-ed-destructive/60",
  outline: "border border-ed-field-border bg-ed-field text-ed-foreground shadow-ed-control",
  secondary: "bg-ed-secondary text-ed-foreground hover:bg-ed-secondary/80",
  ghost: "text-ed-inspector-value hover:bg-ed-ghost-hover hover:text-ed-accent-foreground",
  link: "text-ed-primary underline-offset-4 hover:underline",
  selected: "bg-ed-selected text-ed-selected-foreground hover:bg-ed-selected hover:text-ed-selected-foreground",
  toolbarSelected: "bg-ed-toolbar-active text-ed-toolbar-active-foreground hover:bg-ed-toolbar-active hover:text-ed-toolbar-active-foreground"
};
var sizes = {
  default: "h-9 px-4 py-2 has-[>svg]:px-3",
  sm: "h-8 rounded-[5px] gap-1.5 px-3 has-[>svg]:px-2.5",
  xs: "h-6.5 gap-1 rounded-[5px] px-2 text-[11px] font-normal has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
  text: "",
  icon: "size-9",
  "icon-sm": "size-8",
  "icon-xs": "size-6.5 rounded-[5px] [&_svg:not([class*='size-'])]:size-3",
  "icon-2xs": "size-5 rounded-[5px] [&_svg:not([class*='size-'])]:size-2.5",
  "icon-3xs": "",
  "icon-lg": "size-10",
  lg: "h-10 rounded-[5px] px-6 has-[>svg]:px-4"
};
var textSizes = {
  default: {
    size: "sm",
    weight: "medium"
  },
  sm: {
    size: "xs",
    weight: "medium"
  },
  xs: {
    size: "3xs",
    weight: "regular"
  },
  text: {
    size: "sm",
    weight: "medium"
  },
  icon: {
    size: "sm",
    weight: "medium"
  },
  "icon-sm": {
    size: "xs",
    weight: "medium"
  },
  "icon-xs": {
    size: "2xs",
    weight: "medium"
  },
  "icon-2xs": {
    size: "3xs",
    weight: "medium"
  },
  "icon-3xs": {
    size: "3xs",
    weight: "medium"
  },
  "icon-lg": {
    size: "sm",
    weight: "medium"
  },
  lg: {
    size: "sm",
    weight: "medium"
  }
};
var iconSizes = {
  default: 16,
  sm: 14,
  xs: 12,
  text: 16,
  icon: 20,
  "icon-sm": 16,
  "icon-xs": 12,
  "icon-2xs": 10,
  "icon-3xs": 10,
  "icon-lg": 24,
  lg: 16
};
var Button = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(57);
  let LeftIcon;
  let RightIcon;
  let className;
  let leftIconClassName;
  let leftIconProps;
  let leftIconSize;
  let loading;
  let props;
  let rightIconClassName;
  let rightIconProps;
  let rightIconSize;
  let size;
  let t1;
  let title;
  let tooltip;
  let tooltipProps;
  let variant;
  if ($[0] !== t0) {
    ({
      className,
      variant,
      size,
      LeftIcon,
      leftIconClassName,
      leftIconSize,
      RightIcon,
      rightIconClassName,
      rightIconSize,
      loading,
      leftIconProps,
      rightIconProps,
      isChildText: t1,
      tooltip,
      tooltipProps,
      title,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = LeftIcon;
    $[2] = RightIcon;
    $[3] = className;
    $[4] = leftIconClassName;
    $[5] = leftIconProps;
    $[6] = leftIconSize;
    $[7] = loading;
    $[8] = props;
    $[9] = rightIconClassName;
    $[10] = rightIconProps;
    $[11] = rightIconSize;
    $[12] = size;
    $[13] = t1;
    $[14] = title;
    $[15] = tooltip;
    $[16] = tooltipProps;
    $[17] = variant;
  } else {
    LeftIcon = $[1];
    RightIcon = $[2];
    className = $[3];
    leftIconClassName = $[4];
    leftIconProps = $[5];
    leftIconSize = $[6];
    loading = $[7];
    props = $[8];
    rightIconClassName = $[9];
    rightIconProps = $[10];
    rightIconSize = $[11];
    size = $[12];
    t1 = $[13];
    title = $[14];
    tooltip = $[15];
    tooltipProps = $[16];
    variant = $[17];
  }
  const isChildText = t1 === void 0 ? true : t1;
  const tooltipContent = tooltip ?? title;
  const accessibleLabel = props["aria-label"] ?? (typeof tooltipContent === "string" ? tooltipContent : void 0);
  const t2 = variant || "default";
  const t3 = size || "default";
  const t4 = buttonVariants[variant || "default"];
  const t5 = sizes[size || "default"];
  let t6;
  if ($[18] !== className || $[19] !== t4 || $[20] !== t5) {
    t6 = cn$2("inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[5px] text-sm font-medium outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:ring-2 focus-visible:ring-ed-ring focus-visible:ring-offset-2 focus-visible:ring-offset-ed-background aria-invalid:border-ed-destructive aria-invalid:ring-ed-destructive/20 dark:aria-invalid:ring-ed-destructive/40", t4, t5, className);
    $[18] = className;
    $[19] = t4;
    $[20] = t5;
    $[21] = t6;
  } else t6 = $[21];
  const t7 = loading || props.disabled;
  let t8;
  if ($[22] !== LeftIcon || $[23] !== leftIconClassName || $[24] !== leftIconProps || $[25] !== leftIconSize || $[26] !== loading || $[27] !== size) {
    t8 = LeftIcon && !loading && <LeftIcon width={leftIconSize || iconSizes[size || "default"]} height={leftIconSize || iconSizes[size || "default"]} className={cn$2("shrink-0", leftIconClassName)} {...leftIconProps} />;
    $[22] = LeftIcon;
    $[23] = leftIconClassName;
    $[24] = leftIconProps;
    $[25] = leftIconSize;
    $[26] = loading;
    $[27] = size;
    $[28] = t8;
  } else t8 = $[28];
  let t9;
  if ($[29] !== loading) {
    t9 = loading && <SpinnerIcon className="animate-spin" width={16} height={16} />;
    $[29] = loading;
    $[30] = t9;
  } else t9 = $[30];
  let t10;
  if ($[31] !== isChildText || $[32] !== props.children || $[33] !== size) {
    t10 = props.children && isChildText ? <Text$4 size={textSizes[size || "default"].size} weight={textSizes[size || "default"].weight} className="text-inherit">{props.children}</Text$4> : props.children;
    $[31] = isChildText;
    $[32] = props.children;
    $[33] = size;
    $[34] = t10;
  } else t10 = $[34];
  let t11;
  if ($[35] !== RightIcon || $[36] !== rightIconClassName || $[37] !== rightIconProps || $[38] !== rightIconSize || $[39] !== size) {
    t11 = RightIcon && <RightIcon width={rightIconSize || iconSizes[size || "default"]} height={rightIconSize || iconSizes[size || "default"]} className={cn$2("shrink-0", rightIconClassName)} {...rightIconProps} />;
    $[35] = RightIcon;
    $[36] = rightIconClassName;
    $[37] = rightIconProps;
    $[38] = rightIconSize;
    $[39] = size;
    $[40] = t11;
  } else t11 = $[40];
  let t12;
  if ($[41] !== accessibleLabel || $[42] !== props || $[43] !== ref || $[44] !== t10 || $[45] !== t11 || $[46] !== t2 || $[47] !== t3 || $[48] !== t6 || $[49] !== t7 || $[50] !== t8 || $[51] !== t9) {
    t12 = <button data-slot="button" data-variant={t2} data-size={t3} className={t6} ref={ref} {...props} aria-label={accessibleLabel} disabled={t7}>{t8}{t9}{t10}{t11}</button>;
    $[41] = accessibleLabel;
    $[42] = props;
    $[43] = ref;
    $[44] = t10;
    $[45] = t11;
    $[46] = t2;
    $[47] = t3;
    $[48] = t6;
    $[49] = t7;
    $[50] = t8;
    $[51] = t9;
    $[52] = t12;
  } else t12 = $[52];
  const button = t12;
  let t13;
  if ($[53] !== button || $[54] !== tooltipContent || $[55] !== tooltipProps) {
    t13 = tooltipContent ? <Tooltip content={tooltipContent} contentProps={tooltipProps}>{button}</Tooltip> : button;
    $[53] = button;
    $[54] = tooltipContent;
    $[55] = tooltipProps;
    $[56] = t13;
  } else t13 = $[56];
  return t13;
});
Button.displayName = "Button";

export { Button };
