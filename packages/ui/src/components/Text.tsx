/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/Text.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import * as import_react from "react";

var variantClasses = {
  primary: "text-ed-inspector-value",
  secondary: "text-ed-foreground-secondary",
  tertiary: "text-ed-muted-foreground",
  accent: "text-ed-accent-foreground",
  white: "text-white",
  danger: "text-ed-destructive",
  success: "text-green-600 dark:text-green-400",
  selection: "text-selection"
};
var sizeClasses = {
  "3xs": "text-[11px] leading-4 tracking-[-0.01em]",
  "2xs": "text-xs leading-4 tracking-[-0.01em]",
  xs: "text-[13px] leading-5 tracking-[-0.01em]",
  sm: "text-sm leading-5 tracking-[-0.01em]",
  md: "text-base leading-6 tracking-[-0.02em]",
  lg: "text-lg leading-7 tracking-[-0.02em]",
  xl: "text-xl leading-7 tracking-[-0.02em]",
  "2xl": "text-2xl leading-8 tracking-[-0.02em]"
};
var weightClasses = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  black: "font-black"
};
/**
* @example
* <Text variant={'error'} size={'lg'} weight={'medium'} />
*/
var Text$4 = import_react.forwardRef(({
  as,
  className,
  style,
  variant = "primary",
  size = "md",
  weight = "regular",
  ...props
}, ref) => {
  return (0, import_react.createElement)(as ?? "span", {
    ref,
    className: cn$2("p-0 m-0", variantClasses[variant], sizeClasses[size], weightClasses[weight], className),
    style,
    ...props
  }, props.children);
});
Text$4.displayName = "Text";
typeof window !== "undefined" && window.document && window.document.createElement;
function composeEventHandlers(originalEventHandler, ourEventHandler, {
  checkForDefaultPrevented = true
} = {}) {
  return function handleEvent(event) {
    originalEventHandler?.(event);
    if (checkForDefaultPrevented === false || !event.defaultPrevented) return ourEventHandler?.(event);
  };
}

export { Text$4 };
