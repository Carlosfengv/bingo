/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/unitValue.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/** Shared parsing and serialization for inspector values with CSS length units. */
var INSPECTOR_LENGTH_UNITS = ["px", "%", "em", "rem", "ch"];
var AUTO_LENGTH_PROPERTIES = new Set(["width", "height", "minWidth", "minHeight", "inlineSize", "blockSize", "minInlineSize", "minBlockSize", "top", "right", "bottom", "left", "inset", "insetBlock", "insetBlockStart", "insetBlockEnd", "insetInline", "insetInlineStart", "insetInlineEnd", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "marginBlock", "marginBlockStart", "marginBlockEnd", "marginInline", "marginInlineStart", "marginInlineEnd", "flexBasis"]);
/** Whether the CSS property accepts `auto` as a length-like value. */
function inspectorPropertySupportsAuto(property) {
  return property ? AUTO_LENGTH_PROPERTIES.has(property) : false;
}
var UNIT_VALUE_RE = new RegExp(`^(-?(?:\\d+\\.?\\d*|\\.\\d+))([a-z%]*)$`, "i");
function isInspectorLengthUnit(value) {
  return INSPECTOR_LENGTH_UNITS.includes(value.toLowerCase());
}
function parseInspectorUnitValue(value) {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return {
    kind: "empty"
  };
  if (raw.toLowerCase() === "auto") return {
    kind: "auto"
  };
  const match = raw.match(UNIT_VALUE_RE);
  if (!match) return {
    kind: "unsupported",
    raw
  };
  const unit = match[2].toLowerCase();
  if (unit && !isInspectorLengthUnit(unit)) return {
    kind: "unsupported",
    raw,
    numberText: match[1]
  };
  return {
    kind: "number",
    numberText: match[1],
    unit
  };
}
/** The editable text omits a supported saved unit because the adjacent trigger owns it. */
function getInspectorUnitInputValue(value) {
  const parsed = parseInspectorUnitValue(value);
  if (parsed.kind === "empty") return "";
  if (parsed.kind === "auto") return "Auto";
  if (parsed.kind === "number") return parsed.numberText;
  return parsed.raw;
}
function getInspectorUnitSelection(value) {
  const parsed = parseInspectorUnitValue(value);
  if (parsed.kind === "auto") return "auto";
  if (parsed.kind === "number" && parsed.unit) return parsed.unit;
  return null;
}
/** Validate an edited draft. Bare numbers inherit the active unit, then fall back to px. */
function commitInspectorUnitValue(draft, fallbackUnit = "px", constraints = {}) {
  const parsed = parseInspectorUnitValue(draft);
  if (parsed.kind === "empty") return {
    valid: true,
    cssValue: "",
    inputValue: "",
    unit: null
  };
  if (parsed.kind === "auto") {
    if (constraints.allowAuto === false) return {
      valid: false,
      message: "Use px, %, em, rem, or ch"
    };
    return {
      valid: true,
      cssValue: "auto",
      inputValue: "Auto",
      unit: null
    };
  }
  if (parsed.kind !== "number") return {
    valid: false,
    message: "Use px, %, em, rem, ch, or Auto"
  };
  const unit = parsed.unit || fallbackUnit;
  let numericValue = Number(parsed.numberText);
  if (!Number.isFinite(numericValue)) return {
    valid: false,
    message: "Enter a valid number"
  };
  if (constraints.min !== void 0) numericValue = Math.max(constraints.min, numericValue);
  if (constraints.max !== void 0) numericValue = Math.min(constraints.max, numericValue);
  const inputValue = numericValue === Number(parsed.numberText) && !parsed.numberText.endsWith(".") ? parsed.numberText : String(numericValue);
  return {
    valid: true,
    cssValue: `${inputValue}${unit}`,
    inputValue,
    unit
  };
}
/** Recover a numeric draft even when its typed suffix is unsupported. */
function getInspectorUnitNumericValue(...values) {
  for (const value of values) {
    const parsed = parseInspectorUnitValue(value);
    const numberText = parsed.kind === "number" || parsed.kind === "unsupported" ? parsed.numberText : void 0;
    if (numberText !== void 0) {
      const numericValue = Number(numberText);
      if (Number.isFinite(numericValue)) return numericValue;
    }
  }
  return null;
}

export { INSPECTOR_LENGTH_UNITS, commitInspectorUnitValue, getInspectorUnitInputValue, getInspectorUnitNumericValue, getInspectorUnitSelection, inspectorPropertySupportsAuto, parseInspectorUnitValue };
