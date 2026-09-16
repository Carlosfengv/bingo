/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/primitives.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { Button, DragVerticalIcon, PlusIcon, Tooltip, XIcon, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import { translateInspectorText } from "./inspectorCopy";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Visual primitives shared across the Styles panel — buttons, labels, shell
* containers. No closure deps; safe to import from any layer.
*/
/** Shared geometry for field-shaped inspector controls. */
var inspectorControlHeight = "h-6.5";
var inspectorControlRadius = "rounded-[5px]";
/** Human-readable fallback for CSS property names used by field tooltips. */
function styleFieldLabel(property) {
  const spaced = property.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
/** Canonical 26px inspector icon button, including Radix `asChild` triggers. */
var IconBtn = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(26);
  const { t } = useTranslation("editor");
  let active;
  let children;
  let className;
  let label;
  let props;
  let t1;
  let t2;
  let t3;
  let title;
  if ($[0] !== t0) {
    ({
      active,
      appearance: t1,
      label,
      children,
      className,
      type: t2,
      variant: t3,
      title,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = active;
    $[2] = children;
    $[3] = className;
    $[4] = label;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
    $[8] = t3;
    $[9] = title;
  } else {
    active = $[1];
    children = $[2];
    className = $[3];
    label = $[4];
    props = $[5];
    t1 = $[6];
    t2 = $[7];
    t3 = $[8];
    title = $[9];
  }
  const appearance = t1 === void 0 ? "default" : t1;
  const type = t2 === void 0 ? "button" : t2;
  const variant = t3 === void 0 ? "ghost" : t3;
  const localizedLabel = translateInspectorText(t, label);
  const t4 = translateInspectorText(t, title ?? label);
  const t5 = variant === "ghost" && appearance === "default" && "text-ed-foreground-secondary hover:bg-ed-ghost-hover hover:text-ed-foreground dark:hover:bg-ed-ghost-hover";
  const t6 = active && appearance === "default" && "bg-ed-muted text-ed-foreground hover:bg-ed-ghost-hover dark:hover:bg-ed-ghost-hover hover:text-ed-foreground hover:ring-0";
  const t7 = appearance === "inline" && "bg-transparent text-ed-foreground-secondary hover:bg-transparent dark:hover:bg-transparent active:bg-transparent hover:text-ed-foreground";
  const t8 = appearance === "inline" && active && "text-ed-foreground";
  let t9;
  if ($[10] !== className || $[11] !== t5 || $[12] !== t6 || $[13] !== t7 || $[14] !== t8) {
    t9 = cn$2("box-border p-0 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ed-ring focus-visible:ring-offset-0 [&_svg:not([class*='size-'])]:size-4", t5, t6, t7, t8, className);
    $[10] = className;
    $[11] = t5;
    $[12] = t6;
    $[13] = t7;
    $[14] = t8;
    $[15] = t9;
  } else t9 = $[15];
  const t10 = active === void 0 ? void 0 : active;
  let t11;
  if ($[16] !== children || $[17] !== localizedLabel || $[18] !== props || $[19] !== ref || $[20] !== t10 || $[21] !== t4 || $[22] !== t9 || $[23] !== type || $[24] !== variant) {
    t11 = <Button ref={ref} type={type} variant={variant} size="icon-xs" isChildText={false} title={t4} className={t9} {...props} aria-label={localizedLabel} aria-pressed={t10}>{children}</Button>;
    $[16] = children;
    $[17] = localizedLabel;
    $[18] = props;
    $[19] = ref;
    $[20] = t10;
    $[21] = t4;
    $[22] = t9;
    $[23] = type;
    $[24] = variant;
    $[25] = t11;
  } else t11 = $[25];
  return t11;
});
IconBtn.displayName = "IconBtn";
/**
* A field row that uses the section body's reserved right-side action rail.
* The negative margin reaches into the 32px reservation; the field content
* remains aligned to every row without an action while the button occupies
* the fixed 26px rail after a 6px gutter.
*/
function InspectorRailRow(t0) {
  const $ = (0, import_compiler_runtime.c)(24);
  let action;
  let actionClassName;
  let children;
  let className;
  let contentClassName;
  let props;
  if ($[0] !== t0) {
    ({
      action,
      children,
      className,
      contentClassName,
      actionClassName,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = action;
    $[2] = actionClassName;
    $[3] = children;
    $[4] = className;
    $[5] = contentClassName;
    $[6] = props;
  } else {
    action = $[1];
    actionClassName = $[2];
    children = $[3];
    className = $[4];
    contentClassName = $[5];
    props = $[6];
  }
  let t1;
  if ($[7] !== className) {
    t1 = cn$2("-mr-[32px] grid min-w-0 grid-cols-[minmax(0,1fr)_26px] gap-1.5", className);
    $[7] = className;
    $[8] = t1;
  } else t1 = $[8];
  let t2;
  if ($[9] !== contentClassName) {
    t2 = cn$2("min-w-0", contentClassName);
    $[9] = contentClassName;
    $[10] = t2;
  } else t2 = $[10];
  let t3;
  if ($[11] !== children || $[12] !== t2) {
    t3 = <div className={t2}>{children}</div>;
    $[11] = children;
    $[12] = t2;
    $[13] = t3;
  } else t3 = $[13];
  let t4;
  if ($[14] !== actionClassName) {
    t4 = cn$2("flex size-[26px] self-start items-center justify-center", actionClassName);
    $[14] = actionClassName;
    $[15] = t4;
  } else t4 = $[15];
  let t5;
  if ($[16] !== action || $[17] !== t4) {
    t5 = <div className={t4}>{action}</div>;
    $[16] = action;
    $[17] = t4;
    $[18] = t5;
  } else t5 = $[18];
  let t6;
  if ($[19] !== props || $[20] !== t1 || $[21] !== t3 || $[22] !== t5) {
    t6 = <div data-slot="inspector-rail-row" className={t1} {...props}>{t3}{t5}</div>;
    $[19] = props;
    $[20] = t1;
    $[21] = t3;
    $[22] = t5;
    $[23] = t6;
  } else t6 = $[23];
  return t6;
}
/**
* A reorderable inspector row with a compact drag handle in the section gutter.
* The row reaches across the full section while preserving the standard action
* rail, so dragging can highlight the entire row without shrinking the field by
* a full icon button.
*/
function InspectorDraggableRow(t0) {
  const $ = (0, import_compiler_runtime.c)(46);
  const { t } = useTranslation("editor");
  let action;
  let actionClassName;
  let children;
  let className;
  let contentClassName;
  let onDragHandleEnd;
  let onDragHandleStart;
  let props;
  let t1;
  let t2;
  let t3;
  if ($[0] !== t0) {
    ({
      action,
      children,
      dragging: t1,
      reorderable: t2,
      dragLabel: t3,
      contentClassName,
      actionClassName,
      onDragHandleStart,
      onDragHandleEnd,
      className,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = action;
    $[2] = actionClassName;
    $[3] = children;
    $[4] = className;
    $[5] = contentClassName;
    $[6] = onDragHandleEnd;
    $[7] = onDragHandleStart;
    $[8] = props;
    $[9] = t1;
    $[10] = t2;
    $[11] = t3;
  } else {
    action = $[1];
    actionClassName = $[2];
    children = $[3];
    className = $[4];
    contentClassName = $[5];
    onDragHandleEnd = $[6];
    onDragHandleStart = $[7];
    props = $[8];
    t1 = $[9];
    t2 = $[10];
    t3 = $[11];
  }
  const dragging = t1 === void 0 ? false : t1;
  const reorderable = t2 === void 0 ? true : t2;
  const dragLabel = translateInspectorText(t, t3 === void 0 ? "Drag to reorder" : t3);
  const t4 = dragging || void 0;
  let t5;
  if ($[12] !== className) {
    t5 = cn$2("group/draggable-row relative -ml-3 -mr-[44px] flex min-w-0 items-center px-3", "data-[dragging=true]:bg-ed-secondary", className);
    $[12] = className;
    $[13] = t5;
  } else t5 = $[13];
  const t6 = reorderable ? void 0 : false;
  const t7 = reorderable ? dragLabel : void 0;
  const t8 = !reorderable;
  const t9 = reorderable ? 0 : -1;
  const t10 = reorderable ? onDragHandleStart : void 0;
  const t11 = reorderable ? onDragHandleEnd : void 0;
  const t12 = !reorderable && "pointer-events-none invisible";
  let t13;
  if ($[14] !== t12) {
    t13 = cn$2("absolute left-0 top-0 flex h-6 w-3 cursor-grab items-center justify-center text-ed-foreground-secondary opacity-0 outline-none hover:text-ed-foreground hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing group-data-[dragging=true]/draggable-row:opacity-100 [&_svg]:size-4", t12);
    $[14] = t12;
    $[15] = t13;
  } else t13 = $[15];
  let t14;
  if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
    t14 = <DragVerticalIcon />;
    $[16] = t14;
  } else t14 = $[16];
  let t15;
  if ($[17] !== reorderable || $[18] !== t10 || $[19] !== t11 || $[20] !== t13 || $[21] !== t7 || $[22] !== t8 || $[23] !== t9) {
    t15 = <button type="button" draggable={reorderable} aria-label={t7} aria-hidden={t8} tabIndex={t9} onDragStart={t10} onDragEnd={t11} className={t13}>{t14}</button>;
    $[17] = reorderable;
    $[18] = t10;
    $[19] = t11;
    $[20] = t13;
    $[21] = t7;
    $[22] = t8;
    $[23] = t9;
    $[24] = t15;
  } else t15 = $[24];
  let t16;
  if ($[25] !== dragLabel || $[26] !== t15 || $[27] !== t6) {
    t16 = <Tooltip content={dragLabel} open={t6}>{t15}</Tooltip>;
    $[25] = dragLabel;
    $[26] = t15;
    $[27] = t6;
    $[28] = t16;
  } else t16 = $[28];
  let t17;
  if ($[29] !== contentClassName) {
    t17 = cn$2("min-w-0 flex-1", contentClassName);
    $[29] = contentClassName;
    $[30] = t17;
  } else t17 = $[30];
  let t18;
  if ($[31] !== children || $[32] !== t17) {
    t18 = <div className={t17}>{children}</div>;
    $[31] = children;
    $[32] = t17;
    $[33] = t18;
  } else t18 = $[33];
  let t19;
  if ($[34] !== actionClassName) {
    t19 = cn$2("ml-1.5 flex size-[26px] shrink-0 items-center justify-center", actionClassName);
    $[34] = actionClassName;
    $[35] = t19;
  } else t19 = $[35];
  let t20;
  if ($[36] !== action || $[37] !== t19) {
    t20 = <div className={t19}>{action}</div>;
    $[36] = action;
    $[37] = t19;
    $[38] = t20;
  } else t20 = $[38];
  let t21;
  if ($[39] !== props || $[40] !== t16 || $[41] !== t18 || $[42] !== t20 || $[43] !== t4 || $[44] !== t5) {
    t21 = <div data-slot="inspector-draggable-row" data-dragging={t4} className={t5} {...props}>{t16}{t18}{t20}</div>;
    $[39] = props;
    $[40] = t16;
    $[41] = t18;
    $[42] = t20;
    $[43] = t4;
    $[44] = t5;
    $[45] = t21;
  } else t21 = $[45];
  return t21;
}
/** Layout-section field label — slightly smaller, used above each layout input. */
function LayoutFieldLabel(t0) {
  const $ = (0, import_compiler_runtime.c)(2);
  const { t } = useTranslation("editor");
  const {
    children
  } = t0;
  let t1;
  const localizedChildren = translateInspectorText(t, children);
  if ($[0] !== localizedChildren) {
    t1 = <span className="hidden text-[10px] leading-3 font-normal text-ed-foreground-secondary">{localizedChildren}</span>;
    $[0] = children;
    $[1] = t1;
  } else t1 = $[1];
  return t1;
}
/**
* Pin inspector type. Project CSS is injected into the host document, and
* isolation cannot beat `input { font-size }` without also clobbering chrome
* `text-*` utilities (no specificity sits between an element reset and a
* class). Inline styles are the same workaround InspectorDropdown already uses.
*/
var INSPECTOR_CONTROL_TEXT_STYLE = {
  fontFamily: "var(--ed-font-sans)",
  fontSize: 11,
  letterSpacing: "normal",
  lineHeight: "16px"
};
/** Shared surface for every field-shaped control in the inspector. */
var InspectorControlShell = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(17);
  let children;
  let className;
  let props;
  let style;
  let t1;
  if ($[0] !== t0) {
    ({
      active: t1,
      children,
      className,
      style,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = children;
    $[2] = className;
    $[3] = props;
    $[4] = style;
    $[5] = t1;
  } else {
    children = $[1];
    className = $[2];
    props = $[3];
    style = $[4];
    t1 = $[5];
  }
  const t2 = (t1 === void 0 ? false : t1) || void 0;
  let t3;
  if ($[6] !== style) {
    t3 = {
      ...INSPECTOR_CONTROL_TEXT_STYLE,
      ...style
    };
    $[6] = style;
    $[7] = t3;
  } else t3 = $[7];
  let t4;
  if ($[8] !== className) {
    t4 = cn$2("group/inspector-control flex w-full min-w-0 items-center border border-ed-field-border bg-ed-field text-[11px] text-ed-inspector-value shadow-none [&_svg]:size-4", inspectorControlHeight, inspectorControlRadius, "hover:border-ed-border focus-within:!border-ed-inspector-active-border", "data-[active=true]:!border-ed-inspector-active-border", "aria-invalid:!border-ed-destructive", className);
    $[8] = className;
    $[9] = t4;
  } else t4 = $[9];
  let t5;
  if ($[10] !== children || $[11] !== props || $[12] !== ref || $[13] !== t2 || $[14] !== t3 || $[15] !== t4) {
    t5 = <div ref={ref} data-slot="inspector-control-shell" data-active={t2} style={t3} className={t4} {...props}>{children}</div>;
    $[10] = children;
    $[11] = props;
    $[12] = ref;
    $[13] = t2;
    $[14] = t3;
    $[15] = t4;
    $[16] = t5;
  } else t5 = $[16];
  return t5;
});
InspectorControlShell.displayName = "InspectorControlShell";
/** Keep a dismissed inspector menu from restoring focus to its trigger. */
function releaseInspectorControlFocus(event) {
  event.preventDefault();
  requestAnimationFrame(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
}
/** Commit an inspector input through its normal blur path when Enter is pressed. */
function blurInspectorInputOnEnter(event) {
  if (event.key === "Enter" && !event.nativeEvent.isComposing) event.currentTarget.blur();
}
var InspectorControlInput = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(27);
  const { t } = useTranslation("editor");
  let className;
  let onFocus;
  let props;
  let style;
  let t1;
  let t2;
  let title;
  let tooltip;
  if ($[0] !== t0) {
    ({
      className,
      onFocus,
      selectOnFocus: t1,
      style,
      type: t2,
      title,
      tooltip,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = onFocus;
    $[3] = props;
    $[4] = style;
    $[5] = t1;
    $[6] = t2;
    $[7] = title;
    $[8] = tooltip;
  } else {
    className = $[1];
    onFocus = $[2];
    props = $[3];
    style = $[4];
    t1 = $[5];
    t2 = $[6];
    title = $[7];
    tooltip = $[8];
  }
  const selectOnFocus = t1 === void 0 ? true : t1;
  const type = t2 === void 0 ? "text" : t2;
  const tooltipContent = translateInspectorText(t, tooltip ?? title);
  let t3;
  if ($[9] !== style) {
    t3 = {
      ...INSPECTOR_CONTROL_TEXT_STYLE,
      ...style
    };
    $[9] = style;
    $[10] = t3;
  } else t3 = $[10];
  let t4;
  if ($[11] !== className) {
    t4 = cn$2("h-full min-w-0 flex-1 border-0 bg-transparent px-1 py-0 text-[11px] text-ed-inspector-value outline-none placeholder:text-ed-muted-foreground/50 disabled:pointer-events-none disabled:opacity-50", className);
    $[11] = className;
    $[12] = t4;
  } else t4 = $[12];
  let t5;
  if ($[13] !== onFocus || $[14] !== selectOnFocus) {
    t5 = event => {
      if (selectOnFocus && !event.currentTarget.readOnly) event.currentTarget.select();
      onFocus?.(event);
    };
    $[13] = onFocus;
    $[14] = selectOnFocus;
    $[15] = t5;
  } else t5 = $[15];
  const t6 = translateInspectorText(t, props["aria-label"] ?? (typeof tooltipContent === "string" ? tooltipContent : void 0));
  let t7;
  if (true) {
    t7 = <input ref={ref} type={type} data-slot="inspector-control-input" style={t3} className={t4} onFocus={t5} {...props} placeholder={translateInspectorText(t, props.placeholder)} aria-label={t6} />;
    $[16] = props;
    $[17] = ref;
    $[18] = t3;
    $[19] = t4;
    $[20] = t5;
    $[21] = t6;
    $[22] = type;
    $[23] = t7;
  } else t7 = $[23];
  const input = t7;
  let t8;
  if ($[24] !== input || $[25] !== tooltipContent) {
    t8 = tooltipContent ? <Tooltip content={tooltipContent}>{input}</Tooltip> : input;
    $[24] = input;
    $[25] = tooltipContent;
    $[26] = t8;
  } else t8 = $[26];
  return t8;
});
InspectorControlInput.displayName = "InspectorControlInput";
var InspectorControlAction = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(22);
  const { t } = useTranslation("editor");
  let children;
  let className;
  let props;
  let style;
  let t1;
  let title;
  if ($[0] !== t0) {
    ({
      children,
      className,
      style,
      type: t1,
      title,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = children;
    $[2] = className;
    $[3] = props;
    $[4] = style;
    $[5] = t1;
    $[6] = title;
  } else {
    children = $[1];
    className = $[2];
    props = $[3];
    style = $[4];
    t1 = $[5];
    title = $[6];
  }
  const type = t1 === void 0 ? "button" : t1;
  let t2;
  if ($[7] !== style) {
    t2 = {
      ...INSPECTOR_CONTROL_TEXT_STYLE,
      ...style
    };
    $[7] = style;
    $[8] = t2;
  } else t2 = $[8];
  let t3;
  if ($[9] !== className) {
    t3 = cn$2("flex h-full shrink-0 items-center justify-center px-1 text-[11px] text-ed-inspector-chrome outline-none hover:text-ed-foreground-secondary disabled:pointer-events-none disabled:opacity-50", className);
    $[9] = className;
    $[10] = t3;
  } else t3 = $[10];
  const localizedTitle = translateInspectorText(t, title);
  const t4 = translateInspectorText(t, props["aria-label"] ?? title);
  let t5;
  if ($[11] !== children || $[12] !== props || $[13] !== ref || $[14] !== t2 || $[15] !== t3 || $[16] !== t4 || $[17] !== type) {
    t5 = <button ref={ref} type={type} data-slot="inspector-control-action" style={t2} className={t3} {...props} aria-label={t4}>{children}</button>;
    $[11] = children;
    $[12] = props;
    $[13] = ref;
    $[14] = t2;
    $[15] = t3;
    $[16] = t4;
    $[17] = type;
    $[18] = t5;
  } else t5 = $[18];
  const action = t5;
  let t6;
  if ($[19] !== action || $[20] !== localizedTitle) {
    t6 = localizedTitle ? <Tooltip content={localizedTitle}>{action}</Tooltip> : action;
    $[19] = action;
    $[20] = title;
    $[21] = t6;
  } else t6 = $[21];
  return t6;
});
InspectorControlAction.displayName = "InspectorControlAction";
/** Class-picker glyph that reveals with its containing inspector field. */
var InspectorClassPickerIndicator = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(11);
  let children;
  let className;
  let props;
  if ($[0] !== t0) {
    ({
      children,
      className,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = children;
    $[2] = className;
    $[3] = props;
  } else {
    children = $[1];
    className = $[2];
    props = $[3];
  }
  let t1;
  if ($[4] !== className) {
    t1 = cn$2("flex shrink-0 items-center opacity-0", "group-hover/inspector-control:opacity-100 group-focus-within/inspector-control:opacity-100 group-data-[active=true]/inspector-control:opacity-100", className);
    $[4] = className;
    $[5] = t1;
  } else t1 = $[5];
  let t2;
  if ($[6] !== children || $[7] !== props || $[8] !== ref || $[9] !== t1) {
    t2 = <span ref={ref} data-slot="inspector-class-picker-indicator" className={t1} {...props}>{children}</span>;
    $[6] = children;
    $[7] = props;
    $[8] = ref;
    $[9] = t1;
    $[10] = t2;
  } else t2 = $[10];
  return t2;
});
InspectorClassPickerIndicator.displayName = "InspectorClassPickerIndicator";
var InspectorScrubHandle = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(15);
  let children;
  let className;
  let props;
  let title;
  if ($[0] !== t0) {
    ({
      children,
      className,
      title,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = children;
    $[2] = className;
    $[3] = props;
    $[4] = title;
  } else {
    children = $[1];
    className = $[2];
    props = $[3];
    title = $[4];
  }
  let t1;
  if ($[5] !== className) {
    t1 = cn$2("flex shrink-0 cursor-ew-resize select-none items-center pl-1 font-normal text-ed-inspector-chrome [&_svg]:!text-ed-inspector-chrome", className);
    $[5] = className;
    $[6] = t1;
  } else t1 = $[6];
  let t2;
  if ($[7] !== children || $[8] !== props || $[9] !== ref || $[10] !== t1) {
    t2 = <span ref={ref} data-slot="inspector-scrub-handle" aria-hidden="true" className={t1} {...props}>{children}</span>;
    $[7] = children;
    $[8] = props;
    $[9] = ref;
    $[10] = t1;
    $[11] = t2;
  } else t2 = $[11];
  const handle = t2;
  let t3;
  if ($[12] !== handle || $[13] !== title) {
    t3 = title ? <Tooltip content={title}>{handle}</Tooltip> : handle;
    $[12] = handle;
    $[13] = title;
    $[14] = t3;
  } else t3 = $[14];
  return t3;
});
InspectorScrubHandle.displayName = "InspectorScrubHandle";
/** "Add" placeholder button shown when a layout sub-property (min/max) is unset. */
function LayoutAddButton(t0) {
  const $ = (0, import_compiler_runtime.c)(7);
  const { t } = useTranslation("editor");
  const {
    label,
    onClick
  } = t0;
  let t1;
  if ($[0] !== label) {
    t1 = <LayoutFieldLabel>{label}</LayoutFieldLabel>;
    $[0] = label;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if (true) {
    t2 = <Button type="button" size="xs" variant="secondary" onClick={onClick} LeftIcon={PlusIcon} className="flex flex-1 text-[12px] text-ed-foreground">{t("styles.add")}</Button>;
    $[2] = onClick;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== t1 || $[5] !== t2) {
    t3 = <div className="flex min-w-0 flex-1 flex-col gap-2">{t1}{t2}</div>;
    $[4] = t1;
    $[5] = t2;
    $[6] = t3;
  } else t3 = $[6];
  return t3;
}
/**
* Source chip — small monospace pill that shows which Tailwind class a field
* value comes from. When `isOverride` is true the chip dims + strikes through
* and shows an X to clear the inline override and restore the class value.
*/
function SourceChip(t0) {
  const $ = (0, import_compiler_runtime.c)(9);
  const { t } = useTranslation("editor");
  const {
    className: cls,
    isOverride,
    onClearOverride
  } = t0;
  const t1 = isOverride ? "bg-ed-muted/30 text-ed-muted-foreground/50 line-through" : "bg-ed-primary/10 text-ed-primary";
  let t2;
  if ($[0] !== t1) {
    t2 = cn$2("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0", t1);
    $[0] = t1;
    $[1] = t2;
  } else t2 = $[1];
  let t3;
  if (true) {
    t3 = isOverride && onClearOverride && <Tooltip content={t("styles.restoreClassValue")}>{<button type="button" aria-label={t("styles.restoreClassValue")} onClick={e => {
        e.stopPropagation();
        onClearOverride();
      }} className="hover:text-ed-foreground ml-0.5">{<XIcon width={8} height={8} />}</button>}</Tooltip>;
    $[2] = isOverride;
    $[3] = onClearOverride;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] !== cls || $[6] !== t2 || $[7] !== t3) {
    t4 = <span className={t2}>{cls}{t3}</span>;
    $[5] = cls;
    $[6] = t2;
    $[7] = t3;
    $[8] = t4;
  } else t4 = $[8];
  return t4;
}

export { INSPECTOR_CONTROL_TEXT_STYLE, IconBtn, InspectorClassPickerIndicator, InspectorControlAction, InspectorControlInput, InspectorControlShell, InspectorDraggableRow, InspectorRailRow, InspectorScrubHandle, LayoutAddButton, LayoutFieldLabel, SourceChip, blurInspectorInputOnEnter, inspectorControlHeight, inspectorControlRadius, releaseInspectorControlFocus, styleFieldLabel };
