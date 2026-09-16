/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Tabs.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { Content, List, Root as Root2$1, Trigger } from "@radix-ui/react-tabs";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var TabsListContext = import_react.createContext(null);
function Tabs(t0) {
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
    t1 = cn$2("flex flex-col", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <Root2$1 data-slot="tabs" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function TabsList(t0) {
  const $ = (0, import_compiler_runtime.c)(22);
  let className;
  let props;
  let t1;
  let t2;
  if ($[0] !== t0) {
    ({
      className,
      variant: t1,
      size: t2,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
    $[3] = t1;
    $[4] = t2;
  } else {
    className = $[1];
    props = $[2];
    t1 = $[3];
    t2 = $[4];
  }
  const variant = t1 === void 0 ? "default" : t1;
  const size = t2 === void 0 ? "default" : t2;
  let t3;
  if ($[5] !== size || $[6] !== variant) {
    t3 = {
      variant,
      size
    };
    $[5] = size;
    $[6] = variant;
    $[7] = t3;
  } else t3 = $[7];
  const t4 = variant === "default" && size === "default" && "w-fit bg-ed-tab-track text-ed-muted-foreground h-9 rounded-lg p-1";
  const t5 = variant === "default" && size === "xs" && "h-6.5 w-full rounded-[5px] bg-ed-tab-track p-0.5 text-ed-muted-foreground";
  const t6 = variant === "simple" && size === "default" && "h-auto w-fit gap-2 justify-start";
  const t7 = variant === "simple" && size === "xs" && "h-6.5 w-fit gap-1 justify-start bg-transparent p-0";
  let t8;
  if ($[8] !== className || $[9] !== t4 || $[10] !== t5 || $[11] !== t6 || $[12] !== t7) {
    t8 = cn$2("inline-flex items-center justify-center", t4, t5, t6, t7, className);
    $[8] = className;
    $[9] = t4;
    $[10] = t5;
    $[11] = t6;
    $[12] = t7;
    $[13] = t8;
  } else t8 = $[13];
  let t9;
  if ($[14] !== props || $[15] !== size || $[16] !== t8 || $[17] !== variant) {
    t9 = <List data-slot="tabs-list" data-variant={variant} data-size={size} className={t8} {...props} />;
    $[14] = props;
    $[15] = size;
    $[16] = t8;
    $[17] = variant;
    $[18] = t9;
  } else t9 = $[18];
  let t10;
  if ($[19] !== t3 || $[20] !== t9) {
    t10 = <TabsListContext.Provider value={t3}>{t9}</TabsListContext.Provider>;
    $[19] = t3;
    $[20] = t9;
    $[21] = t10;
  } else t10 = $[21];
  return t10;
}
function SimpleTabs(t0) {
  const $ = (0, import_compiler_runtime.c)(6);
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
  if ($[3] !== className || $[4] !== props) {
    t1 = <TabsList variant="simple" className={className} {...props} />;
    $[3] = className;
    $[4] = props;
    $[5] = t1;
  } else t1 = $[5];
  return t1;
}
function TabsTrigger(t0) {
  const $ = (0, import_compiler_runtime.c)(12);
  let className;
  let props;
  let style;
  if ($[0] !== t0) {
    ({
      className,
      style,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
    $[3] = style;
  } else {
    className = $[1];
    props = $[2];
    style = $[3];
  }
  const list = import_react.useContext(TabsListContext);
  const variant = list?.variant || "default";
  const size = list?.size || "default";
  let t1;
  if ($[4] !== className || $[5] !== size || $[6] !== variant) {
    t1 = cn$2("inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap disabled:pointer-events-none disabled:opacity-50", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ed-ring focus-visible:ring-offset-2", "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", variant === "default" && size === "default" && ["h-full flex-1 rounded-md border border-transparent px-3 py-1.5 text-sm", "text-ed-muted-foreground hover:text-ed-foreground", "data-[state=active]:border-ed-field-border data-[state=active]:bg-ed-tab-active data-[state=active]:text-ed-foreground data-[state=active]:shadow-ed-selected"], variant === "default" && size === "xs" && ["h-full flex-1 rounded-[5px] border border-transparent px-1 py-0 gap-1 text-[11px]", "text-ed-foreground/60 hover:text-ed-foreground", "data-[state=active]:border-ed-field-border data-[state=active]:bg-ed-tab-active data-[state=active]:text-ed-foreground data-[state=active]:shadow-ed-selected"], variant === "simple" && size === "default" && ["px-2 py-1 h-fit w-fit rounded-[5px] text-xs", "text-ed-muted-foreground hover:text-ed-foreground", "data-[state=active]:text-ed-inspector-value", "data-[state=active]:bg-ed-simple-tab-active"], variant === "simple" && size === "xs" && ["h-full flex-none rounded-[5px] px-2 font-normal text-[11px]", "text-ed-foreground-secondary hover:text-ed-foreground", "data-[state=active]:bg-ed-simple-tab-active data-[state=active]:text-ed-inspector-value"], className);
    $[4] = className;
    $[5] = size;
    $[6] = variant;
    $[7] = t1;
  } else t1 = $[7];
  let t2;
  if ($[8] !== props || $[9] !== style || $[10] !== t1) {
    t2 = <Trigger data-slot="tabs-trigger" className={t1} style={style} {...props} />;
    $[8] = props;
    $[9] = style;
    $[10] = t1;
    $[11] = t2;
  } else t2 = $[11];
  return t2;
}
function TabsContent(t0) {
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
    t1 = cn$2("flex-1 min-h-0 overflow-hidden outline-none", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <Content data-slot="tabs-content" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}

export { SimpleTabs, Tabs, TabsContent, TabsList, TabsTrigger };
