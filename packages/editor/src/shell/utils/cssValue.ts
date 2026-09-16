/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/cssValue.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* CSS value parsing helpers — resolve `var()` references, strip units,
* and convert between display and internal representations.
*/
/**
* Resolve a CSS value: if it's a `var(--name)` reference, look up the computed
* value on `:root`; otherwise return the input string as-is.
*/
function resolveValue(val) {
  if (val === void 0 || val === null) return "";
  const str = String(val);
  if (!str) return "";
  if (str.startsWith("var(")) {
    try {
      const varName = str.slice(4, str.indexOf(")"));
      const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (resolved) return resolved;
    } catch {}
    return "";
  }
  return str;
}
/**
* For chip display: resolve the value and convert rem to px (relative to root
* font-size for readability), preserving the displayed unit.
*/
function displayValue(val) {
  const str = resolveValue(val);
  if (!str || str === "auto" || str === "none" || str === "normal") return str;
  const remMatch = str.match(/^(-?[\d.]+)rem$/);
  if (remMatch) {
    const remVal = parseFloat(remMatch[1]);
    let rootFontSize = 16;
    try {
      rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    } catch {}
    return `${Math.round(remVal * rootFontSize)}px`;
  }
  return str;
}
/**
* Display the CSS opacity value as a percentage when it's a 0–1 number.
* Pass-through for explicit `%` values or non-numeric inputs.
*/
function opacityInputValue(val) {
  const str = resolveValue(val).trim();
  if (!str || str === "auto" || str === "none" || str === "normal") return str;
  if (str.endsWith("%")) return str;
  const n = Number(str);
  if (Number.isFinite(n) && n >= 0 && n <= 1) return `${Math.round(n * 100)}%`;
  return str;
}
function round(n, precision) {
  const f = 10 ** precision;
  return Math.round(n * f) / f;
}
/**
* Parse a stored CSS `letter-spacing` value into a display {num, unit}. CSS has
* no percentage unit for letter-spacing, so a "% of font size" value is stored
* as `em` (0.05em ⇆ 5%) and surfaced here as `%`; `px` is shown as-is. Empty,
* `normal`, or unparseable values yield `num: null`.
*/
function parseLetterSpacing(val) {
  const str = resolveValue(val).trim();
  if (!str || str === "normal") return {
    num: null,
    unit: "%"
  };
  const m = str.match(/^(-?[\d.]+)\s*([a-z%]*)$/i);
  if (!m) return {
    num: null,
    unit: "%"
  };
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return {
    num: null,
    unit: "%"
  };
  const u = m[2].toLowerCase();
  if (u === "px") return {
    num: round(n, 2),
    unit: "px"
  };
  if (u === "em") return {
    num: round(n * 100, 2),
    unit: "%"
  };
  return {
    num: round(n, 2),
    unit: "%"
  };
}
/** Build a CSS `letter-spacing` string from a display number + unit. */
function formatLetterSpacing(num, unit) {
  if (unit === "px") return `${round(num, 3)}px`;
  return `${round(num / 100, 4)}em`;
}
/**
* Parse a free-typed letter-spacing entry into a CSS value. `""` → clear,
* `normal` → `normal`, unparseable → `null` (ignore). Only `px` is taken
* literally; bare numbers, `%`, and any other unit are treated as `%`.
*/
function letterSpacingInputToCss(input) {
  const s = input.trim();
  if (s === "") return "";
  if (s === "normal") return "normal";
  const m = s.match(/^(-?[\d.]+)\s*([a-z%]*)$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return null;
  return formatLetterSpacing(n, m[2].toLowerCase() === "px" ? "px" : "%");
}

export { displayValue, formatLetterSpacing, letterSpacingInputToCss, opacityInputValue, parseLetterSpacing };
