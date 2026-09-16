/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/ui/src/components/InputGroup.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cn$2 } from "../lib/utils";
import { Tooltip } from "./Tooltip";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var inputGroupSizeClasses = {
  default: "h-9 rounded-[5px] border border-ed-field-border bg-ed-field shadow-ed-control",
  xs: "h-6.5 rounded-[5px] border border-ed-field-border bg-ed-field shadow-none"
};
var InputGroupContext = import_react.createContext("default");
var InputGroup = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(15);
  let className;
  let props;
  let t1;
  if ($[0] !== t0) {
    ({
      className,
      size: t1,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
    $[3] = t1;
  } else {
    className = $[1];
    props = $[2];
    t1 = $[3];
  }
  const size = t1 === void 0 ? "default" : t1;
  const t2 = inputGroupSizeClasses[size];
  let t3;
  if ($[4] !== className || $[5] !== t2) {
    t3 = cn$2("flex w-full min-w-0 items-center gap-1", "focus-within:ring-[3px] focus-within:ring-ed-ring/50", t2, className);
    $[4] = className;
    $[5] = t2;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== props || $[8] !== ref || $[9] !== size || $[10] !== t3) {
    t4 = <div ref={ref} data-slot="input-group" data-size={size} className={t3} {...props} />;
    $[7] = props;
    $[8] = ref;
    $[9] = size;
    $[10] = t3;
    $[11] = t4;
  } else t4 = $[11];
  let t5;
  if ($[12] !== size || $[13] !== t4) {
    t5 = <InputGroupContext.Provider value={size}>{t4}</InputGroupContext.Provider>;
    $[12] = size;
    $[13] = t4;
    $[14] = t5;
  } else t5 = $[14];
  return t5;
});
InputGroup.displayName = "InputGroup";
var inputGroupAddonStartClasses = {
  default: "pl-3 text-sm",
  xs: "pl-1 text-[11px]"
};
var inputGroupAddonEndClasses = {
  default: "order-last pr-3 text-sm",
  xs: "order-last pr-1 text-[11px]"
};
var InputGroupAddon = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(12);
  let className;
  let props;
  let t1;
  if ($[0] !== t0) {
    ({
      className,
      align: t1,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
    $[3] = t1;
  } else {
    className = $[1];
    props = $[2];
    t1 = $[3];
  }
  const align = t1 === void 0 ? "inline-start" : t1;
  const size = import_react.useContext(InputGroupContext);
  const t2 = align === "inline-end" ? inputGroupAddonEndClasses[size] : inputGroupAddonStartClasses[size];
  let t3;
  if ($[4] !== className || $[5] !== t2) {
    t3 = cn$2("flex shrink-0 items-center justify-center text-ed-muted-foreground [&_svg:not([class*='size-'])]:size-[1em]", t2, className);
    $[4] = className;
    $[5] = t2;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== align || $[8] !== props || $[9] !== ref || $[10] !== t3) {
    t4 = <div ref={ref} data-slot="input-group-addon" data-align={align} className={t3} {...props} />;
    $[7] = align;
    $[8] = props;
    $[9] = ref;
    $[10] = t3;
    $[11] = t4;
  } else t4 = $[11];
  return t4;
});
InputGroupAddon.displayName = "InputGroupAddon";
var InputGroupText = import_react.forwardRef((t0, ref) => {
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
    t1 = cn$2("flex items-center text-[9px] leading-none text-ed-muted-foreground [&_svg]:pointer-events-none", className);
    $[3] = className;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== props || $[6] !== ref || $[7] !== t1) {
    t2 = <span ref={ref} data-slot="input-group-text" className={t1} {...props} />;
    $[5] = props;
    $[6] = ref;
    $[7] = t1;
    $[8] = t2;
  } else t2 = $[8];
  return t2;
});
InputGroupText.displayName = "InputGroupText";
var inputGroupInputSizeClasses = {
  default: "px-3 py-1 text-sm",
  xs: "px-1 py-0 text-[11px] placeholder:text-ed-muted-foreground/50"
};
var InputGroupInput = import_react.forwardRef((t0, ref) => {
  const $ = (0, import_compiler_runtime.c)(19);
  let className;
  let props;
  let tooltip;
  let tooltipProps;
  let type;
  if ($[0] !== t0) {
    ({
      className,
      type,
      tooltip,
      tooltipProps,
      ...props
    } = t0);
    $[0] = t0;
    $[1] = className;
    $[2] = props;
    $[3] = tooltip;
    $[4] = tooltipProps;
    $[5] = type;
  } else {
    className = $[1];
    props = $[2];
    tooltip = $[3];
    tooltipProps = $[4];
    type = $[5];
  }
  const t1 = inputGroupInputSizeClasses[import_react.useContext(InputGroupContext)];
  let t2;
  if ($[6] !== className || $[7] !== t1) {
    t2 = cn$2("min-w-0 flex-1 self-stretch bg-transparent text-ed-foreground placeholder:text-ed-muted-foreground outline-none border-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50", t1, className);
    $[6] = className;
    $[7] = t1;
    $[8] = t2;
  } else t2 = $[8];
  const t3 = props["aria-label"] ?? (typeof tooltip === "string" ? tooltip : void 0);
  let t4;
  if ($[9] !== props || $[10] !== ref || $[11] !== t2 || $[12] !== t3 || $[13] !== type) {
    t4 = <input ref={ref} type={type} data-slot="input-group-input" className={t2} {...props} aria-label={t3} />;
    $[9] = props;
    $[10] = ref;
    $[11] = t2;
    $[12] = t3;
    $[13] = type;
    $[14] = t4;
  } else t4 = $[14];
  const input = t4;
  let t5;
  if ($[15] !== input || $[16] !== tooltip || $[17] !== tooltipProps) {
    t5 = tooltip ? <Tooltip content={tooltip} contentProps={tooltipProps}>{input}</Tooltip> : input;
    $[15] = input;
    $[16] = tooltip;
    $[17] = tooltipProps;
    $[18] = t5;
  } else t5 = $[18];
  return t5;
});
InputGroupInput.displayName = "InputGroupInput";

export { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText };
