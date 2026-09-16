/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Dialog.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { Close, Content as Content$1, Description, Overlay, Portal as Portal$4, Root as Root$3, Title } from "@radix-ui/react-dialog";
import { X as X$2 } from "lucide-react";
import { useTranslation } from "@bingo/i18n";
import * as import_compiler_runtime from "react/compiler-runtime";

function Dialog(t0) {
  const $ = (0, import_compiler_runtime.c)(4);
  let props;
  if ($[0] !== t0) {
    ({
      ...props
    } = t0);
    $[0] = t0;
    $[1] = props;
  } else props = $[1];
  let t1;
  if ($[2] !== props) {
    t1 = <Root$3 data-slot="dialog" {...props} />;
    $[2] = props;
    $[3] = t1;
  } else t1 = $[3];
  return t1;
}
function DialogPortal(t0) {
  const $ = (0, import_compiler_runtime.c)(4);
  let props;
  if ($[0] !== t0) {
    ({
      ...props
    } = t0);
    $[0] = t0;
    $[1] = props;
  } else props = $[1];
  let t1;
  if ($[2] !== props) {
    t1 = <Portal$4 data-slot="dialog-portal" {...props} />;
    $[2] = props;
    $[3] = t1;
  } else t1 = $[3];
  return t1;
}
function DialogClose(t0) {
  const $ = (0, import_compiler_runtime.c)(4);
  let props;
  if ($[0] !== t0) {
    ({
      ...props
    } = t0);
    $[0] = t0;
    $[1] = props;
  } else props = $[1];
  let t1;
  if ($[2] !== props) {
    t1 = <Close data-slot="dialog-close" {...props} />;
    $[2] = props;
    $[3] = t1;
  } else t1 = $[3];
  return t1;
}
function DialogOverlay(t0) {
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
    t1 = cn$2("fixed inset-0 z-50 bg-black/50", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <Overlay data-slot="dialog-overlay" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function DialogContent({ className, children, showCloseButton = true, ...props }) {
  const { t } = useTranslation("common");
  return <DialogPortal data-slot="dialog-portal">
    <DialogOverlay />
    <Content$1
      data-slot="dialog-content"
      className={cn$2("bg-ed-popover text-ed-popover-foreground fixed top-[50%] left-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-ed-border p-6 shadow-ed-popover", className)}
      {...props}
    >
      {children}
      {showCloseButton ? <Close data-slot="dialog-close" className="ring-offset-ed-background focus:ring-ed-ring data-[state=open]:bg-ed-accent data-[state=open]:text-ed-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
        <X$2 />
        <span className="sr-only">{t("actions.close")}</span>
      </Close> : null}
    </Content$1>
  </DialogPortal>;
}
function DialogHeader(t0) {
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
    t1 = cn$2("flex flex-col gap-2 text-left", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <div data-slot="dialog-header" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function DialogFooter(t0) {
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
    t1 = cn$2("flex flex-row justify-end gap-2", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <div data-slot="dialog-footer" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function DialogTitle(t0) {
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
    t1 = cn$2("text-ed-foreground text-lg leading-none font-semibold", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <Title data-slot="dialog-title" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function DialogDescription(t0) {
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
    t1 = cn$2("text-ed-muted-foreground text-sm", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== t1) {
    t2 = <Description data-slot="dialog-description" className={t1} {...props} />;
    $[5] = props;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle };
