/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Sidebar.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import { Slot as Slot$4 } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var SIDEBAR_COOKIE_NAME = "sidebar_state";
var SIDEBAR_COOKIE_MAX_AGE = 604800;
var SIDEBAR_WIDTH = "16rem";
var SIDEBAR_WIDTH_ICON = "3rem";
var SIDEBAR_KEYBOARD_SHORTCUT = "b";
var SidebarContext = import_react.createContext(null);
function useSidebar() {
  const context = import_react.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider.");
  return context;
}
function SidebarProvider(t0) {
  const $ = (0, import_compiler_runtime.c)(34);
  let children;
  let className;
  let openProp;
  let props;
  let setOpenProp;
  let style;
  let t1;
  if ($[0] !== t0) {
    ({
      defaultOpen: t1,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = children;
    $[2] = className;
    $[3] = openProp;
    $[4] = props;
    $[5] = setOpenProp;
    $[6] = style;
    $[7] = t1;
  } else {
    children = $[1];
    className = $[2];
    openProp = $[3];
    props = $[4];
    setOpenProp = $[5];
    style = $[6];
    t1 = $[7];
  }
  const defaultOpen = t1 === void 0 ? true : t1;
  const [openMobile, setOpenMobile] = import_react.useState(false);
  const [_open, _setOpen] = import_react.useState(defaultOpen);
  const open = openProp ?? _open;
  let t2;
  if ($[8] !== open || $[9] !== setOpenProp) {
    t2 = value => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) setOpenProp(openState);else _setOpen(openState);
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    };
    $[8] = open;
    $[9] = setOpenProp;
    $[10] = t2;
  } else t2 = $[10];
  const setOpen = t2;
  let t3;
  if ($[11] !== setOpen) {
    t3 = () => setOpen(_temp$78);
    $[11] = setOpen;
    $[12] = t3;
  } else t3 = $[12];
  const toggleSidebar = t3;
  let t4;
  let t5;
  if ($[13] !== toggleSidebar) {
    t4 = () => {
      const handleKeyDown = event => {
        if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          toggleSidebar();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    };
    t5 = [toggleSidebar];
    $[13] = toggleSidebar;
    $[14] = t4;
    $[15] = t5;
  } else {
    t4 = $[14];
    t5 = $[15];
  }
  import_react.useEffect(t4, t5);
  const state = open ? "expanded" : "collapsed";
  let t6;
  if ($[16] !== open || $[17] !== openMobile || $[18] !== setOpen || $[19] !== state || $[20] !== toggleSidebar) {
    t6 = {
      state,
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      toggleSidebar
    };
    $[16] = open;
    $[17] = openMobile;
    $[18] = setOpen;
    $[19] = state;
    $[20] = toggleSidebar;
    $[21] = t6;
  } else t6 = $[21];
  let t7;
  if ($[22] !== style) {
    t7 = {
      "--sidebar-width": SIDEBAR_WIDTH,
      "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
      ...style
    };
    $[22] = style;
    $[23] = t7;
  } else t7 = $[23];
  const t8 = t7;
  let t9;
  if ($[24] !== className) {
    t9 = cn$2("group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-ed-background", className);
    $[24] = className;
    $[25] = t9;
  } else t9 = $[25];
  let t10;
  if ($[26] !== children || $[27] !== props || $[28] !== t8 || $[29] !== t9) {
    t10 = <div data-slot="sidebar-wrapper" style={t8} className={t9} {...props}>{children}</div>;
    $[26] = children;
    $[27] = props;
    $[28] = t8;
    $[29] = t9;
    $[30] = t10;
  } else t10 = $[30];
  let t11;
  if ($[31] !== t10 || $[32] !== t6) {
    t11 = <SidebarContext.Provider value={t6}>{t10}</SidebarContext.Provider>;
    $[31] = t10;
    $[32] = t6;
    $[33] = t11;
  } else t11 = $[33];
  return t11;
}
function _temp$78(open_0) {
  return !open_0;
}
function Sidebar(t0) {
  const $ = (0, import_compiler_runtime.c)(34);
  let children;
  let className;
  let props;
  let t1;
  let t2;
  let t3;
  if ($[0] !== t0) {
    ({
      side: t1,
      variant: t2,
      collapsible: t3,
      className,
      children,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = children;
    $[2] = className;
    $[3] = props;
    $[4] = t1;
    $[5] = t2;
    $[6] = t3;
  } else {
    children = $[1];
    className = $[2];
    props = $[3];
    t1 = $[4];
    t2 = $[5];
    t3 = $[6];
  }
  const side = t1 === void 0 ? "left" : t1;
  const variant = t2 === void 0 ? "sidebar" : t2;
  const collapsible = t3 === void 0 ? "offcanvas" : t3;
  const {
    state
  } = useSidebar();
  if (collapsible === "none") {
    let t4;
    if ($[7] !== className) {
      t4 = cn$2("flex h-full w-(--sidebar-width) flex-col bg-ed-background text-ed-foreground", className);
      $[7] = className;
      $[8] = t4;
    } else t4 = $[8];
    let t5;
    if ($[9] !== children || $[10] !== props || $[11] !== t4) {
      t5 = <div data-slot="sidebar" className={t4} {...props}>{children}</div>;
      $[9] = children;
      $[10] = props;
      $[11] = t4;
      $[12] = t5;
    } else t5 = $[12];
    return t5;
  }
  const t4 = state === "collapsed" ? collapsible : "";
  const t5 = variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)";
  let t6;
  if ($[13] !== t5) {
    t6 = cn$2("relative w-(--sidebar-width) bg-transparent", "group-data-[collapsible=offcanvas]:w-0", "group-data-[side=right]:rotate-180", t5);
    $[13] = t5;
    $[14] = t6;
  } else t6 = $[14];
  let t7;
  if ($[15] !== t6) {
    t7 = <div data-slot="sidebar-gap" className={t6} />;
    $[15] = t6;
    $[16] = t7;
  } else t7 = $[16];
  const t8 = variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l";
  let t9;
  if ($[17] !== className || $[18] !== t8) {
    t9 = cn$2("fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex", t8, className);
    $[17] = className;
    $[18] = t8;
    $[19] = t9;
  } else t9 = $[19];
  let t10;
  if ($[20] !== children) {
    t10 = <div data-sidebar="sidebar" data-slot="sidebar-inner" className="flex size-full flex-col bg-ed-background group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-ed-border">{children}</div>;
    $[20] = children;
    $[21] = t10;
  } else t10 = $[21];
  let t11;
  if ($[22] !== props || $[23] !== side || $[24] !== t10 || $[25] !== t9) {
    t11 = <div data-slot="sidebar-container" data-side={side} className={t9} {...props}>{t10}</div>;
    $[22] = props;
    $[23] = side;
    $[24] = t10;
    $[25] = t9;
    $[26] = t11;
  } else t11 = $[26];
  let t12;
  if ($[27] !== side || $[28] !== state || $[29] !== t11 || $[30] !== t4 || $[31] !== t7 || $[32] !== variant) {
    t12 = <div className="group peer hidden text-ed-foreground md:block" data-state={state} data-collapsible={t4} data-variant={variant} data-side={side} data-slot="sidebar">{t7}{t11}</div>;
    $[27] = side;
    $[28] = state;
    $[29] = t11;
    $[30] = t4;
    $[31] = t7;
    $[32] = variant;
    $[33] = t12;
  } else t12 = $[33];
  return t12;
}
function SidebarHeader(t0) {
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
    t1 = cn$2("flex flex-col gap-2 p-2", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <div data-slot="sidebar-header" data-sidebar="header" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function SidebarFooter(t0) {
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
    t1 = cn$2("flex flex-col gap-2 p-2", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <div data-slot="sidebar-footer" data-sidebar="footer" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function SidebarContent(t0) {
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
    t1 = cn$2("no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <div data-slot="sidebar-content" data-sidebar="content" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function SidebarGroup(t0) {
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
    t1 = cn$2("relative flex w-full min-w-0 flex-col p-2", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <div data-slot="sidebar-group" data-sidebar="group" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function SidebarGroupContent(t0) {
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
    t1 = cn$2("w-full text-sm", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <div data-slot="sidebar-group-content" data-sidebar="group-content" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function SidebarMenu(t0) {
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
    t1 = cn$2("flex w-full min-w-0 flex-col gap-0", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <ul data-slot="sidebar-menu" data-sidebar="menu" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function SidebarMenuItem(t0) {
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
    t1 = cn$2("group/menu-item relative", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <li data-slot="sidebar-menu-item" data-sidebar="menu-item" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
var sidebarMenuButtonVariants = cva("peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-ed-ring outline-hidden group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-ed-accent hover:text-ed-accent-foreground focus-visible:ring-2 active:bg-ed-accent active:text-ed-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[state=open]:hover:bg-ed-accent data-[state=open]:hover:text-ed-accent-foreground data-[active=true]:bg-ed-accent data-[active=true]:font-medium data-[active=true]:text-ed-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate", {
  variants: {
    variant: {
      default: "hover:bg-ed-accent hover:text-ed-accent-foreground",
      outline: "bg-ed-background shadow-[0_0_0_1px_var(--ed-border)] hover:bg-ed-accent hover:text-ed-accent-foreground hover:shadow-[0_0_0_1px_var(--ed-accent)]"
    },
    size: {
      default: "h-8 text-sm",
      sm: "h-7 text-xs",
      lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "default"
  }
});
function SidebarMenuButton(t0) {
  const $ = (0, import_compiler_runtime.c)(28);
  let className;
  let props;
  let t1;
  let t2;
  let t3;
  let t4;
  let tooltip;
  if ($[0] !== t0) {
    ({
      asChild: t1,
      isActive: t2,
      variant: t3,
      size: t4,
      tooltip,
      className,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
    $[3] = t1;
    $[4] = t2;
    $[5] = t3;
    $[6] = t4;
    $[7] = tooltip;
  } else {
    className = $[1];
    props = $[2];
    t1 = $[3];
    t2 = $[4];
    t3 = $[5];
    t4 = $[6];
    tooltip = $[7];
  }
  const asChild = t1 === void 0 ? false : t1;
  const isActive = t2 === void 0 ? false : t2;
  const variant = t3 === void 0 ? "default" : t3;
  const size = t4 === void 0 ? "default" : t4;
  const Comp = asChild ? Slot$4 : "button";
  const {
    state
  } = useSidebar();
  let t5;
  if ($[8] !== className || $[9] !== size || $[10] !== variant) {
    t5 = cn$2(sidebarMenuButtonVariants({
      variant,
      size
    }), className);
    $[8] = className;
    $[9] = size;
    $[10] = variant;
    $[11] = t5;
  } else t5 = $[11];
  let t6;
  if ($[12] !== Comp || $[13] !== isActive || $[14] !== props || $[15] !== size || $[16] !== t5) {
    t6 = <Comp data-slot="sidebar-menu-button" data-sidebar="menu-button" data-size={size} data-active={isActive} className={t5} {...props} />;
    $[12] = Comp;
    $[13] = isActive;
    $[14] = props;
    $[15] = size;
    $[16] = t5;
    $[17] = t6;
  } else t6 = $[17];
  const button = t6;
  if (!tooltip) return button;
  if (typeof tooltip === "string") {
    let t7;
    if ($[18] !== tooltip) {
      t7 = {
        children: tooltip
      };
      $[18] = tooltip;
      $[19] = t7;
    } else t7 = $[19];
    tooltip = t7;
  }
  let t7;
  if ($[20] !== button) {
    t7 = <TooltipTrigger asChild={true}>{button}</TooltipTrigger>;
    $[20] = button;
    $[21] = t7;
  } else t7 = $[21];
  const t8 = state !== "collapsed";
  let t9;
  if ($[22] !== t8 || $[23] !== tooltip) {
    t9 = <TooltipContent side="right" align="center" hidden={t8} {...tooltip} />;
    $[22] = t8;
    $[23] = tooltip;
    $[24] = t9;
  } else t9 = $[24];
  let t10;
  if ($[25] !== t7 || $[26] !== t9) {
    t10 = <Tooltip>{t7}{t9}</Tooltip>;
    $[25] = t7;
    $[26] = t9;
    $[27] = t10;
  } else t10 = $[27];
  return t10;
}

export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider };
