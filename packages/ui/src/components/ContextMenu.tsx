/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/ContextMenu.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { CaretRight as s$10 } from "@phosphor-icons/react/dist/icons/CaretRight";
import { Check as n$15 } from "@phosphor-icons/react/dist/icons/Check";
import { Circle as s$7 } from "@phosphor-icons/react/dist/icons/Circle";
import { CheckboxItem as CheckboxItem2, Content as Content2$2, Item as Item2$1, ItemIndicator as ItemIndicator2, Label as Label2, Portal as Portal2, RadioItem as RadioItem2, Root as Root2$4, Separator as Separator2, SubContent as SubContent2, SubTrigger as SubTrigger2, Trigger as Trigger$3 } from "@radix-ui/react-context-menu";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import * as import_jsx_runtime from "react/jsx-runtime";

var ContextMenu$1 = Root2$4;
var ContextMenuTrigger = Trigger$3;
var ContextMenuSubTrigger = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(14);
  let children;
  let className;
  let inset;
  let props;
  if ($[0] !== t0) {
    ({
      className,
      inset,
      children,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = children;
    $[2] = className;
    $[3] = inset;
    $[4] = props;
  } else {
    children = $[1];
    className = $[2];
    inset = $[3];
    props = $[4];
  }
  const t1 = inset && "pl-7";
  let t2;
  if ($[5] !== className || $[6] !== t1) {
    t2 = cn$2("flex h-6.5 cursor-default select-none items-center rounded px-1.5 py-0 text-[11px] outline-none", "focus:bg-ed-accent focus:text-ed-accent-foreground", "data-[state=open]:bg-ed-accent data-[state=open]:text-ed-accent-foreground", t1, className);
    $[5] = className;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  let t3;
  if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = (0, import_jsx_runtime.jsx)(s$10, {
      size: 14,
      className: "ml-auto"
    });
    $[8] = t3;
  } else t3 = $[8];
  let t4;
  if ($[9] !== children || $[10] !== props || $[11] !== ref || $[12] !== t2) {
    t4 = <SubTrigger2 ref={ref} data-slot="menu-item" className={t2} {...props}>{children}{t3}</SubTrigger2>;
    $[9] = children;
    $[10] = props;
    $[11] = ref;
    $[12] = t2;
    $[13] = t4;
  } else t4 = $[13];
  return t4;
});
ContextMenuSubTrigger.displayName = SubTrigger2.displayName;
var ContextMenuSubContent = import_react.forwardRef((t0, ref) => {
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
    t1 = cn$2("z-50 min-w-[8rem] overflow-hidden rounded-md border border-ed-menu-border bg-ed-menu p-1 text-ed-popover-foreground shadow-ed-popover [&_[data-slot=menu-item]+[data-slot=menu-item]]:mt-0.5", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== ref || $[7] !== t1) {
    t2 = <SubContent2 ref={ref} className={t1} {...props} />;
    $[5] = props;
    $[6] = ref;
    $[7] = t1;
    $[8] = t2;
  } else t2 = $[8];
  return t2;
});
ContextMenuSubContent.displayName = SubContent2.displayName;
var ContextMenuContent = import_react.forwardRef((t0, ref) => {
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
    t1 = cn$2("z-50 min-w-[8rem] overflow-hidden rounded-md border border-ed-menu-border bg-ed-menu p-1 text-ed-popover-foreground shadow-ed-popover [&_[data-slot=menu-item]+[data-slot=menu-item]]:mt-0.5", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== ref || $[7] !== t1) {
    t2 = <Portal2>{<Content2$2 ref={ref} className={t1} {...props} />}</Portal2>;
    $[5] = props;
    $[6] = ref;
    $[7] = t1;
    $[8] = t2;
  } else t2 = $[8];
  return t2;
});
ContextMenuContent.displayName = Content2$2.displayName;
var ContextMenuItem = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(11);
  let className;
  let inset;
  let props;
  if ($[0] !== t0) {
    ({
      className,
      inset,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = inset;
    $[3] = props;
  } else {
    className = $[1];
    inset = $[2];
    props = $[3];
  }
  const t1 = inset && "pl-7";
  let t2;
  if ($[4] !== className || $[5] !== t1) {
    t2 = cn$2("relative flex h-6.5 cursor-default select-none items-center rounded px-1.5 py-0 text-[11px] outline-none", "focus:bg-ed-accent focus:text-ed-accent-foreground", "data-[disabled]:pointer-events-none data-[disabled]:opacity-50", t1, className);
    $[4] = className;
    $[5] = t1;
    $[6] = t2;
  } else t2 = $[6];
  let t3;
  if ($[7] !== props || $[8] !== ref || $[9] !== t2) {
    t3 = <Item2$1 ref={ref} data-slot="menu-item" className={t2} {...props} />;
    $[7] = props;
    $[8] = ref;
    $[9] = t2;
    $[10] = t3;
  } else t3 = $[10];
  return t3;
});
ContextMenuItem.displayName = Item2$1.displayName;
var ContextMenuCheckboxItem = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(14);
  let checked;
  let children;
  let className;
  let props;
  if ($[0] !== t0) {
    ({
      className,
      children,
      checked,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = checked;
    $[2] = children;
    $[3] = className;
    $[4] = props;
  } else {
    checked = $[1];
    children = $[2];
    className = $[3];
    props = $[4];
  }
  let t1;
  if ($[5] !== className) {
    t1 = cn$2("relative flex h-6.5 cursor-default select-none items-center rounded py-0 pl-7 pr-1.5 text-[11px] outline-none", "focus:bg-ed-accent focus:text-ed-accent-foreground", "data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className);
    $[5] = className;
    $[6] = t1;
  } else t1 = $[6];
  let t2;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <span className="absolute left-1.5 flex h-3.5 w-3.5 items-center justify-center">{<ItemIndicator2>{(0, import_jsx_runtime.jsx)(n$15, {
          size: 14,
          weight: "bold"
        })}</ItemIndicator2>}</span>;
    $[7] = t2;
  } else t2 = $[7];
  let t3;
  if ($[8] !== checked || $[9] !== children || $[10] !== props || $[11] !== ref || $[12] !== t1) {
    t3 = <CheckboxItem2 ref={ref} data-slot="menu-item" className={t1} checked={checked} {...props}>{t2}{children}</CheckboxItem2>;
    $[8] = checked;
    $[9] = children;
    $[10] = props;
    $[11] = ref;
    $[12] = t1;
    $[13] = t3;
  } else t3 = $[13];
  return t3;
});
ContextMenuCheckboxItem.displayName = CheckboxItem2.displayName;
var ContextMenuRadioItem = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(12);
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
    t1 = cn$2("relative flex h-6.5 cursor-default select-none items-center rounded py-0 pl-7 pr-1.5 text-[11px] outline-none", "focus:bg-ed-accent focus:text-ed-accent-foreground", "data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className);
    $[4] = className;
    $[5] = t1;
  } else t1 = $[5];
  let t2;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <span className="absolute left-1.5 flex h-3.5 w-3.5 items-center justify-center">{<ItemIndicator2>{(0, import_jsx_runtime.jsx)(s$7, {
          size: 8,
          weight: "fill"
        })}</ItemIndicator2>}</span>;
    $[6] = t2;
  } else t2 = $[6];
  let t3;
  if ($[7] !== children || $[8] !== props || $[9] !== ref || $[10] !== t1) {
    t3 = <RadioItem2 ref={ref} data-slot="menu-item" className={t1} {...props}>{t2}{children}</RadioItem2>;
    $[7] = children;
    $[8] = props;
    $[9] = ref;
    $[10] = t1;
    $[11] = t3;
  } else t3 = $[11];
  return t3;
});
ContextMenuRadioItem.displayName = RadioItem2.displayName;
var ContextMenuLabel = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(11);
  let className;
  let inset;
  let props;
  if ($[0] !== t0) {
    ({
      className,
      inset,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = inset;
    $[3] = props;
  } else {
    className = $[1];
    inset = $[2];
    props = $[3];
  }
  const t1 = inset && "pl-8";
  let t2;
  if ($[4] !== className || $[5] !== t1) {
    t2 = cn$2("px-2 py-1.5 text-sm font-semibold text-ed-foreground", t1, className);
    $[4] = className;
    $[5] = t1;
    $[6] = t2;
  } else t2 = $[6];
  let t3;
  if ($[7] !== props || $[8] !== ref || $[9] !== t2) {
    t3 = <Label2 ref={ref} className={t2} {...props} />;
    $[7] = props;
    $[8] = ref;
    $[9] = t2;
    $[10] = t3;
  } else t3 = $[10];
  return t3;
});
ContextMenuLabel.displayName = Label2.displayName;
var ContextMenuSeparator = import_react.forwardRef((t0, ref) => {
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
    t2 = <Separator2 ref={ref} className={t1} {...props} />;
    $[5] = props;
    $[6] = ref;
    $[7] = t1;
    $[8] = t2;
  } else t2 = $[8];
  return t2;
});
ContextMenuSeparator.displayName = Separator2.displayName;
var ContextMenuShortcut = t0 => {
  const $ = (0, import_compiler_runtime.c)(8);
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
    t1 = cn$2("ml-auto text-xs tracking-widest text-ed-muted-foreground", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <span className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export { ContextMenu$1, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger };
