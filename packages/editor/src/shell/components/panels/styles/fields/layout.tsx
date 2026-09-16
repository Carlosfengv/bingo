/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/fields/layout.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { opacityInputValue } from "../../../../utils/cssValue";
import { useStyleField, useStyleOps } from "../StyleOpsContext";
import { DimensionInput } from "../inputs/DimensionInput";
import { LayoutMinMaxInput } from "../inputs/LayoutMinMaxInput";
import { LayoutValueInput } from "../inputs/LayoutValueInput";
import { PositionOffsetField } from "../positioning/widgets";
import { styleFieldLabel } from "../primitives";
import { OpacityIcon, PositionBottomIcon, PositionLeftIcon, PositionRightIcon, PositionTopIcon } from "@bingo/ui";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Layout / sizing fields bound to the StyleOps context: generic length inputs,
* Width/Height (with aspect-ratio mirroring, min/max add buttons and the flex
* toggle), opacity, min/max length, and T/L/R/B position offsets.
*/
function StyleLayoutInput(t0) {
  const $ = (0, import_compiler_runtime.c)(17);
  const {
    property,
    icon,
    placeholder: t1,
    unit,
    allowedUnits,
    onChange,
    inputClassName,
    showTooltip: t2,
    modeOptions
  } = t0;
  const placeholder = t1 === void 0 ? "0" : t1;
  const showTooltip = t2 === void 0 ? true : t2;
  const f = useStyleField(property);
  const t3 = f.isMixed ? "" : f.value;
  const t4 = onChange ?? f.set;
  let t5;
  if ($[0] !== property || $[1] !== showTooltip) {
    t5 = showTooltip ? styleFieldLabel(property) : void 0;
    $[0] = property;
    $[1] = showTooltip;
    $[2] = t5;
  } else t5 = $[2];
  let t6;
  if ($[3] !== allowedUnits || $[4] !== f.addClass || $[5] !== f.isMixed || $[6] !== f.source || $[7] !== icon || $[8] !== inputClassName || $[9] !== modeOptions || $[10] !== placeholder || $[11] !== property || $[12] !== t3 || $[13] !== t4 || $[14] !== t5 || $[15] !== unit) {
    t6 = <LayoutValueInput icon={icon} value={t3} onChange={t4} placeholder={placeholder} unit={unit} allowedUnits={allowedUnits} inputClassName={inputClassName} modeOptions={modeOptions} isMixedValue={f.isMixed} {...f.source} cssProperty={property} tooltipLabel={t5} onSelectClass={f.addClass} />;
    $[3] = allowedUnits;
    $[4] = f.addClass;
    $[5] = f.isMixed;
    $[6] = f.source;
    $[7] = icon;
    $[8] = inputClassName;
    $[9] = modeOptions;
    $[10] = placeholder;
    $[11] = property;
    $[12] = t3;
    $[13] = t4;
    $[14] = t5;
    $[15] = unit;
    $[16] = t6;
  } else t6 = $[16];
  return t6;
}
/**
* DimensionInput (Width / Height) bound to the StyleOps context.
* Handles aspect-ratio mirroring, "clear flex on manual width", and flex
* sizing — all derived from the context.
*/
function StyleDimensionInput(t0) {
  const $ = (0, import_compiler_runtime.c)(19);
  const {
    label,
    property,
    aspectLocked
  } = t0;
  const ops = useStyleOps();
  const f = useStyleField(property);
  const mirror = property === "width" ? "height" : "width";
  let t1;
  if ($[0] !== aspectLocked || $[1] !== mirror || $[2] !== ops || $[3] !== property) {
    t1 = v => {
      const updates = {
        [property]: v
      };
      if (aspectLocked && ops.computed[property] && ops.computed[mirror]) {
        const ratio = parseFloat(ops.computed[mirror]) / parseFloat(ops.computed[property]);
        const numV = parseFloat(v);
        if (!isNaN(ratio) && !isNaN(numV) && v.endsWith("px")) updates[mirror] = Math.round(numV * ratio) + "px";
      }
      if (ops.has("flex")) updates.flex = void 0;
      ops.setMultiple(updates);
    };
    $[0] = aspectLocked;
    $[1] = mirror;
    $[2] = ops;
    $[3] = property;
    $[4] = t1;
  } else t1 = $[4];
  const onChange = t1;
  const t2 = f.isMixed ? "" : f.value;
  const t3 = ops.computed[property];
  const t4 = f.isMixed;
  let t5;
  if ($[5] !== ops) {
    t5 = ops.get("flex");
    $[5] = ops;
    $[6] = t5;
  } else t5 = $[6];
  let t6;
  if ($[7] !== ops || $[8] !== property) {
    t6 = v_0 => {
      if (v_0) ops.setMultiple({
        flex: v_0,
        [property]: "auto"
      });else ops.clear("flex");
    };
    $[7] = ops;
    $[8] = property;
    $[9] = t6;
  } else t6 = $[9];
  const t7 = ops.parentFlexDir === (property === "width" ? "row" : "column");
  let t8;
  if ($[10] !== f.isMixed || $[11] !== label || $[12] !== onChange || $[13] !== t2 || $[14] !== t3 || $[15] !== t5 || $[16] !== t6 || $[17] !== t7) {
    t8 = <DimensionInput label={label} value={t2} onChange={onChange} computedValue={t3} isMixedValue={t4} flexValue={t5} onFlexChange={t6} parentIsFlex={t7} />;
    $[10] = f.isMixed;
    $[11] = label;
    $[12] = onChange;
    $[13] = t2;
    $[14] = t3;
    $[15] = t5;
    $[16] = t6;
    $[17] = t7;
    $[18] = t8;
  } else t8 = $[18];
  return t8;
}
/**
* Opacity input — same shape as StyleLayoutInput but applies the
* `opacityInputValue` transform (CSS opacity is a 0–1 number; UI shows `%`).
*/
function StyleOpacityInput() {
  const $ = (0, import_compiler_runtime.c)(10);
  const f = useStyleField("opacity");
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <OpacityIcon className="text-ed-muted-foreground" />;
    $[0] = t0;
  } else t0 = $[0];
  let t1;
  if ($[1] !== f.isMixed || $[2] !== f.value) {
    t1 = f.isMixed ? "" : opacityInputValue(f.value);
    $[1] = f.isMixed;
    $[2] = f.value;
    $[3] = t1;
  } else t1 = $[3];
  let t2;
  if ($[4] !== f.addClass || $[5] !== f.isMixed || $[6] !== f.set || $[7] !== f.source || $[8] !== t1) {
    t2 = <LayoutValueInput icon={t0} value={t1} onChange={f.set} placeholder="100" unit="%" min={0} max={100} isMixedValue={f.isMixed} {...f.source} cssProperty="opacity" tooltipLabel="Opacity" onSelectClass={f.addClass} />;
    $[4] = f.addClass;
    $[5] = f.isMixed;
    $[6] = f.set;
    $[7] = f.source;
    $[8] = t1;
    $[9] = t2;
  } else t2 = $[9];
  return t2;
}
function StyleLayoutMinMaxInput(t0) {
  const $ = (0, import_compiler_runtime.c)(11);
  const {
    property,
    icon,
    placeholder
  } = t0;
  const f = useStyleField(property);
  let t1;
  if ($[0] !== property) {
    t1 = styleFieldLabel(property);
    $[0] = property;
    $[1] = t1;
  } else t1 = $[1];
  const t2 = f.isMixed ? "" : f.value;
  let t3;
  if ($[2] !== f.clear || $[3] !== f.isMixed || $[4] !== f.set || $[5] !== icon || $[6] !== placeholder || $[7] !== property || $[8] !== t1 || $[9] !== t2) {
    t3 = <LayoutMinMaxInput label={property} tooltipLabel={t1} value={t2} onChange={f.set} onClear={f.clear} placeholder={placeholder} icon={icon} isMixedValue={f.isMixed} />;
    $[2] = f.clear;
    $[3] = f.isMixed;
    $[4] = f.set;
    $[5] = icon;
    $[6] = placeholder;
    $[7] = property;
    $[8] = t1;
    $[9] = t2;
    $[10] = t3;
  } else t3 = $[10];
  return t3;
}
/** PositionOffsetField (T/L/R/B) bound to a CSS property via the StyleOps context. */
function StylePositionOffset(t0) {
  const $ = (0, import_compiler_runtime.c)(12);
  const {
    label,
    property,
    className
  } = t0;
  const f = useStyleField(property);
  let t1;
  if ($[0] !== property) {
    t1 = property === "left" ? <PositionLeftIcon /> : property === "right" ? <PositionRightIcon /> : property === "top" ? <PositionTopIcon /> : property === "bottom" ? <PositionBottomIcon /> : void 0;
    $[0] = property;
    $[1] = t1;
  } else t1 = $[1];
  const icon = t1;
  let t2;
  if ($[2] !== property) {
    t2 = styleFieldLabel(property);
    $[2] = property;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== className || $[5] !== f.explicit || $[6] !== f.isMixed || $[7] !== f.set || $[8] !== icon || $[9] !== label || $[10] !== t2) {
    t3 = <PositionOffsetField label={label} tooltipLabel={t2} icon={icon} value={f.explicit} isMixed={f.isMixed} onChange={f.set} className={className} />;
    $[4] = className;
    $[5] = f.explicit;
    $[6] = f.isMixed;
    $[7] = f.set;
    $[8] = icon;
    $[9] = label;
    $[10] = t2;
    $[11] = t3;
  } else t3 = $[11];
  return t3;
}

export { StyleDimensionInput, StyleLayoutInput, StyleLayoutMinMaxInput, StyleOpacityInput, StylePositionOffset };
