/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/effectValues.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var FILTER_DEFINITIONS = [{
  kind: "blur",
  label: "Blur",
  min: 0,
  step: 1,
  defaultAmount: 10,
  unit: "px"
}, {
  kind: "brightness",
  label: "Brightness",
  min: 0,
  step: 1,
  defaultAmount: 120,
  unit: "%"
}, {
  kind: "contrast",
  label: "Contrast",
  min: 0,
  step: 1,
  defaultAmount: 120,
  unit: "%"
}, {
  kind: "grayscale",
  label: "Grayscale",
  min: 0,
  max: 100,
  step: 1,
  defaultAmount: 100,
  unit: "%"
}, {
  kind: "hue-rotate",
  label: "Hue rotation",
  min: 0,
  wrapAt: 360,
  step: 1,
  defaultAmount: 90,
  unit: "deg"
}, {
  kind: "invert",
  label: "Invert",
  min: 0,
  max: 100,
  step: 1,
  defaultAmount: 100,
  unit: "%"
}, {
  kind: "saturate",
  label: "Saturate",
  min: 0,
  max: 200,
  step: 1,
  defaultAmount: 150,
  unit: "%"
}, {
  kind: "sepia",
  label: "Sepia",
  min: 0,
  max: 100,
  step: 1,
  defaultAmount: 100,
  unit: "%"
}];
var FILTER_KINDS = new Set(FILTER_DEFINITIONS.map(definition => definition.kind));
function splitTopLevel(value, separator = ",") {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;else if (char === ")") depth = Math.max(0, depth - 1);else if (char === separator && depth === 0) {
      const part = value.slice(start, index).trim();
      if (part) parts.push(part);
      start = index + 1;
    }
  }
  const last = value.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}
function splitWhitespace(value) {
  const parts = [];
  let depth = 0;
  let start = 0;
  const push = end => {
    const part = value.slice(start, end).trim();
    if (part) parts.push(part);
  };
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;else if (char === ")") depth = Math.max(0, depth - 1);else if (/\s/.test(char) && depth === 0) {
      push(index);
      start = index + 1;
    }
  }
  push(value.length);
  return parts;
}
function parseShadowParts(value, kind) {
  const tokens = splitWhitespace(value).filter(token => token.toLowerCase() !== "inset");
  const lengths = [];
  const colors = [];
  for (const token of tokens) if (/^-?(?:\d*\.)?\d+(?:[a-z%]+)?$/i.test(token)) lengths.push(token);else colors.push(token);
  return {
    kind,
    x: lengths[0] ?? "0px",
    y: lengths[1] ?? "0px",
    blur: lengths[2] ?? "0px",
    spread: kind === "drop" ? "0px" : lengths[3] ?? "0px",
    color: colors.join(" ") || "rgb(0 0 0 / 0.15)"
  };
}
function parseCssFunctions(value) {
  const functions = [];
  let index = 0;
  while (index < value.length) {
    while (/\s/.test(value[index] ?? "")) index += 1;
    const nameStart = index;
    while (/[a-z-]/i.test(value[index] ?? "")) index += 1;
    const name = value.slice(nameStart, index).toLowerCase();
    if (!name || value[index] !== "(") {
      index += 1;
      continue;
    }
    index += 1;
    const valueStart = index;
    let depth = 1;
    while (index < value.length && depth > 0) {
      if (value[index] === "(") depth += 1;else if (value[index] === ")") depth -= 1;
      index += 1;
    }
    if (depth === 0) functions.push({
      name,
      value: value.slice(valueStart, index - 1).trim()
    });
  }
  return functions;
}
function parseShadowValues(boxShadow, filter) {
  const boxValues = boxShadow && boxShadow !== "none" ? splitTopLevel(boxShadow).map(value => parseShadowParts(value, /(?:^|\s)inset(?:\s|$)/i.test(value) ? "inner" : "box")) : [];
  const dropValues = parseCssFunctions(filter).filter(fn => fn.name === "drop-shadow").map(fn => parseShadowParts(fn.value, "drop"));
  return [...boxValues, ...dropValues];
}
function serializeShadowValue(shadow) {
  const parts = [shadow.x, shadow.y, shadow.blur];
  if (shadow.kind !== "drop") parts.push(shadow.spread);
  parts.push(shadow.color);
  if (shadow.kind === "inner") parts.unshift("inset");
  const value = parts.join(" ");
  return shadow.kind === "drop" ? `drop-shadow(${value})` : value;
}
function serializeBoxShadows(shadows) {
  return shadows.filter(shadow => shadow.kind !== "drop").map(serializeShadowValue).join(", ");
}
function replaceFilterFunctions(current, ownedNames, replacements) {
  return [...parseCssFunctions(current).filter(fn => !ownedNames.has(fn.name)).map(fn => `${fn.name}(${fn.value})`), ...replacements].join(" ");
}
function definitionFor(kind) {
  return FILTER_DEFINITIONS.find(definition => definition.kind === kind);
}
function normalizeFilterAmount(kind, amount) {
  const definition = definitionFor(kind);
  if (definition.wrapAt !== void 0) return (amount % definition.wrapAt + definition.wrapAt) % definition.wrapAt;
  return Math.min(definition.max ?? Number.POSITIVE_INFINITY, Math.max(definition.min, amount));
}
function parseAmount(kind, value) {
  const definition = definitionFor(kind);
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return definition.defaultAmount;
  if (definition.unit === "%" && !value.trim().endsWith("%")) return number * 100;
  return number;
}
function parseFilterValues(filter, backdropFilter) {
  const parse = (value, scope) => parseCssFunctions(value).filter(fn => FILTER_KINDS.has(fn.name)).map(fn => ({
    scope,
    kind: fn.name,
    amount: parseAmount(fn.name, fn.value)
  }));
  return [...parse(filter, "layer"), ...parse(backdropFilter, "backdrop")];
}
function serializeFilterValue(filter) {
  const definition = definitionFor(filter.kind);
  return `${filter.kind}(${filter.amount}${definition.unit})`;
}
function serializeFilters(filters, scope) {
  return filters.filter(filter => filter.scope === scope).map(serializeFilterValue);
}

export { FILTER_DEFINITIONS, FILTER_KINDS, normalizeFilterAmount, parseFilterValues, parseShadowValues, replaceFilterFunctions, serializeBoxShadows, serializeFilterValue, serializeFilters, serializeShadowValue };
