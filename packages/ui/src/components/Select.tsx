/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Select.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { CaretDown as s$12 } from "@phosphor-icons/react/dist/icons/CaretDown";
import { CaretUp as s$9 } from "@phosphor-icons/react/dist/icons/CaretUp";
import { Check as n$15 } from "@phosphor-icons/react/dist/icons/Check";
import { Content as Content2$3, Group, Icon, Item as Item$1, ItemIndicator, ItemText, Label, Portal as Portal$2, Root as Root2$5, ScrollDownButton, ScrollUpButton, Separator, Trigger as Trigger$4, Value, Viewport as Viewport$2 } from "@radix-ui/react-select";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import * as import_jsx_runtime from "react/jsx-runtime";

var Select = Root2$5;
var SelectGroup = Group;
var SelectValue = Value;
var selectTriggerSizeClasses = {
  default: "h-9 rounded-[5px] border border-ed-field-border bg-ed-field px-3 py-2 text-sm shadow-ed-control",
  xs: "h-6.5 rounded-[5px] border border-ed-field-border bg-ed-field px-2 text-[11px] shadow-none data-[placeholder]:text-ed-muted-foreground/70"
};
var SelectTrigger = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(19);
  let children;
  let className;
  let props;
  let t1;
  if ($[0] !== t0) {
    ({
      className,
      children,
      size: t1,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = children;
    $[2] = className;
    $[3] = props;
    $[4] = t1;
  } else {
    children = $[1];
    className = $[2];
    props = $[3];
    t1 = $[4];
  }
  const size = t1 === void 0 ? "default" : t1;
  const t2 = selectTriggerSizeClasses[size];
  let t3;
  if ($[5] !== className || $[6] !== t2) {
    t3 = cn$2("flex w-full items-center justify-between gap-2", "placeholder:text-ed-muted-foreground", "focus:outline-none focus:ring-2 focus:ring-ed-ring", "disabled:cursor-not-allowed disabled:opacity-50", "[&>span]:line-clamp-1", t2, className);
    $[5] = className;
    $[6] = t2;
    $[7] = t3;
  } else t3 = $[7];
  const t4 = size === "xs" ? "h-3 w-3" : "h-4 w-4";
  let t5;
  if ($[8] !== t4) {
    t5 = cn$2("opacity-50", t4);
    $[8] = t4;
    $[9] = t5;
  } else t5 = $[9];
  let t6;
  if ($[10] !== t5) {
    t6 = <Icon asChild={true}>{(0, import_jsx_runtime.jsx)(s$12, {
        className: t5
      })}</Icon>;
    $[10] = t5;
    $[11] = t6;
  } else t6 = $[11];
  let t7;
  if ($[12] !== children || $[13] !== props || $[14] !== ref || $[15] !== size || $[16] !== t3 || $[17] !== t6) {
    t7 = <Trigger$4 ref={ref} data-size={size} className={t3} {...props}>{children}{t6}</Trigger$4>;
    $[12] = children;
    $[13] = props;
    $[14] = ref;
    $[15] = size;
    $[16] = t3;
    $[17] = t6;
    $[18] = t7;
  } else t7 = $[18];
  return t7;
});
SelectTrigger.displayName = Trigger$4.displayName;
var SelectScrollUpButton = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(10);
  let className;
  let props;
  if ($[0] !== t0) {
    ({
      className,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
  } else {
    className = $[1];
    props = $[2];
  }
  let t1;
  if ($[3] !== className) {
    t1 = cn$2("flex cursor-default items-center justify-center py-1", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = (0, import_jsx_runtime.jsx)(s$9, {
      className: "h-4 w-4"
    });
    $[5] = t2;
  } else t2 = $[5];
  let t3;
  if ($[6] !== props || $[7] !== ref || $[8] !== t1) {
    t3 = <ScrollUpButton ref={ref} className={t1} {...props}>{t2}</ScrollUpButton>;
    $[6] = props;
    $[7] = ref;
    $[8] = t1;
    $[9] = t3;
  } else t3 = $[9];
  return t3;
});
SelectScrollUpButton.displayName = ScrollUpButton.displayName;
var SelectScrollDownButton = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(10);
  let className;
  let props;
  if ($[0] !== t0) {
    ({
      className,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
  } else {
    className = $[1];
    props = $[2];
  }
  let t1;
  if ($[3] !== className) {
    t1 = cn$2("flex cursor-default items-center justify-center py-1", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = (0, import_jsx_runtime.jsx)(s$12, {
      className: "h-4 w-4"
    });
    $[5] = t2;
  } else t2 = $[5];
  let t3;
  if ($[6] !== props || $[7] !== ref || $[8] !== t1) {
    t3 = <ScrollDownButton ref={ref} className={t1} {...props}>{t2}</ScrollDownButton>;
    $[6] = props;
    $[7] = ref;
    $[8] = t1;
    $[9] = t3;
  } else t3 = $[9];
  return t3;
});
SelectScrollDownButton.displayName = ScrollDownButton.displayName;
var SelectContent = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(21);
  let children;
  let className;
  let props;
  let t1;
  if ($[0] !== t0) {
    ({
      className,
      children,
      position: t1,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = children;
    $[2] = className;
    $[3] = props;
    $[4] = t1;
  } else {
    children = $[1];
    className = $[2];
    props = $[3];
    t1 = $[4];
  }
  const position = t1 === void 0 ? "popper" : t1;
  const t2 = position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1";
  let t3;
  if ($[5] !== className || $[6] !== t2) {
    t3 = cn$2("relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-ed-menu-border bg-ed-menu text-ed-popover-foreground shadow-ed-popover [&_[data-slot=menu-item]+[data-slot=menu-item]]:mt-0.5", t2, className);
    $[5] = className;
    $[6] = t2;
    $[7] = t3;
  } else t3 = $[7];
  let t4;
  if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = <SelectScrollUpButton />;
    $[8] = t4;
  } else t4 = $[8];
  const t5 = position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]";
  let t6;
  if ($[9] !== t5) {
    t6 = cn$2("p-1", t5);
    $[9] = t5;
    $[10] = t6;
  } else t6 = $[10];
  let t7;
  if ($[11] !== children || $[12] !== t6) {
    t7 = <Viewport$2 className={t6}>{children}</Viewport$2>;
    $[11] = children;
    $[12] = t6;
    $[13] = t7;
  } else t7 = $[13];
  let t8;
  if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = <SelectScrollDownButton />;
    $[14] = t8;
  } else t8 = $[14];
  let t9;
  if ($[15] !== position || $[16] !== props || $[17] !== ref || $[18] !== t3 || $[19] !== t7) {
    t9 = <Portal$2>{<Content2$3 ref={ref} className={t3} position={position} {...props}>{t4}{t7}{t8}</Content2$3>}</Portal$2>;
    $[15] = position;
    $[16] = props;
    $[17] = ref;
    $[18] = t3;
    $[19] = t7;
    $[20] = t9;
  } else t9 = $[20];
  return t9;
});
SelectContent.displayName = Content2$3.displayName;
var SelectLabel = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(9);
  let className;
  let props;
  if ($[0] !== t0) {
    ({
      className,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
  } else {
    className = $[1];
    props = $[2];
  }
  let t1;
  if ($[3] !== className) {
    t1 = cn$2("px-2 py-1.5 text-sm font-semibold", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== ref || $[7] !== t1) {
    t2 = <Label ref={ref} className={t1} {...props} />;
    $[5] = props;
    $[6] = ref;
    $[7] = t1;
    $[8] = t2;
  } else t2 = $[8];
  return t2;
});
SelectLabel.displayName = Label.displayName;
var SelectItem = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(14);
  let children;
  let className;
  let props;
  if ($[0] !== t0) {
    ({
      className,
      children,
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
    t1 = cn$2("relative flex h-6.5 w-full cursor-default select-none items-center justify-between rounded px-1.5 py-0 text-[11px] outline-none", "focus:bg-ed-accent focus:text-ed-accent-foreground", "data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className);
    $[4] = className;
    $[5] = t1;
  } else t1 = $[5];
  let t2;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <span className="ml-4 flex h-3.5 w-3.5 shrink-0 items-center justify-center">{<ItemIndicator>{(0, import_jsx_runtime.jsx)(n$15, {
          className: "h-4 w-4"
        })}</ItemIndicator>}</span>;
    $[6] = t2;
  } else t2 = $[6];
  let t3;
  if ($[7] !== children) {
    t3 = <ItemText>{children}</ItemText>;
    $[7] = children;
    $[8] = t3;
  } else t3 = $[8];
  let t4;
  if ($[9] !== props || $[10] !== ref || $[11] !== t1 || $[12] !== t3) {
    t4 = <Item$1 ref={ref} data-slot="menu-item" className={t1} {...props}>{t2}{t3}</Item$1>;
    $[9] = props;
    $[10] = ref;
    $[11] = t1;
    $[12] = t3;
    $[13] = t4;
  } else t4 = $[13];
  return t4;
});
SelectItem.displayName = Item$1.displayName;
var SelectSeparator = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(9);
  let className;
  let props;
  if ($[0] !== t0) {
    ({
      className,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
  } else {
    className = $[1];
    props = $[2];
  }
  let t1;
  if ($[3] !== className) {
    t1 = cn$2("mx-1.5 my-[6px] h-px bg-ed-menu-border", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== ref || $[7] !== t1) {
    t2 = <Separator ref={ref} className={t1} {...props} />;
    $[5] = props;
    $[6] = ref;
    $[7] = t1;
    $[8] = t2;
  } else t2 = $[8];
  return t2;
});
SelectSeparator.displayName = Separator.displayName;

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue };
