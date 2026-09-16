/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/typography.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

var STANDARD_FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
var FONT_WEIGHT_NAMES = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Normal",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
  1e3: "Extra Black"
};
/** Convert CSS font-weight keywords and numeric values to a number. */
function parseFontWeight(value) {
  if (value === "normal") return 400;
  if (value === "bold") return 700;
  const weight = typeof value === "number" ? value : Number(value);
  return Number.isFinite(weight) && weight >= 1 && weight <= 1e3 ? weight : void 0;
}
/** Label used by the font-weight dropdown. */
function formatFontWeight(weight) {
  const name = FONT_WEIGHT_NAMES[weight];
  return name ? `${weight} - ${name}` : String(weight);
}
function normalizeFamilyName(family) {
  return family.replace(/_/g, " ").trim().toLowerCase();
}
function expandWeightValue(value) {
  const parts = value.trim().split(/\s+/).map(Number);
  if (parts.some(part => !Number.isFinite(part))) return [];
  if (parts.length === 1) {
    const weight = parseFontWeight(parts[0]);
    return weight === void 0 ? [] : [weight];
  }
  const [start, end] = parts;
  if (start > end) return [];
  const weights = STANDARD_FONT_WEIGHTS.filter(weight => weight >= start && weight <= end);
  if (end >= 1e3) weights.push(1e3);
  return weights;
}
/**
* Return the weights configured for a local font. Undefined means the family
* is not a configured local font, so the caller can try another font source.
*/
function getLocalFontWeights(family, style, fonts) {
  if (!fonts || !family) return void 0;
  const localFont = fonts.local.find(font => normalizeFamilyName(font.name) === normalizeFamilyName(family));
  if (!localFont) return void 0;
  const styleFiles = localFont.files.filter(file => file.style.toLowerCase() === style.toLowerCase());
  const files = styleFiles.length > 0 ? styleFiles : localFont.files;
  return [...new Set(files.flatMap(file => expandWeightValue(file.weight)))].sort((a, b) => a - b);
}
/** Keep the standard menu order while including any nonstandard loaded weight. */
function getFontWeightMenuValues(availableWeights, currentWeight) {
  return [... new Set([...STANDARD_FONT_WEIGHTS, ...(availableWeights ?? []), ...(currentWeight === void 0 ? [] : [currentWeight])])].sort((a, b) => a - b);
}
/** True when the CSS font-weight value renders as bold (>=600 or `bold`). */
function isBoldFontWeight(value) {
  if (value === "bold" || value === "700") return true;
  if (typeof value === "number") return value >= 600;
  if (typeof value === "string") {
    const n = Number(value);
    if (!Number.isNaN(n)) return n >= 600;
  }
  return false;
}
/**
* Resolve a CSS font-family value to a friendly display name — handles
* `var(--font-*)` lookups against the project's ParsedFonts and falls back
* to the first family name in a comma-separated list.
*/
function getFontDisplayName(value, fonts) {
  if (!value) return "";
  if (value.startsWith("var(")) {
    const varName = value.slice(4, value.indexOf(")"));
    if (fonts) {
      for (const f of fonts.google) if (f.variable === varName) return f.name.replace(/_/g, " ");
      for (const f of fonts.local) if (f.variable === varName) return f.name;
    }
    return varName.replace("--font-", "");
  }
  return value.split(",")[0].replace(/['"]/g, "").trim();
}

export { formatFontWeight, getFontDisplayName, getFontWeightMenuValues, getLocalFontWeights, isBoldFontWeight, parseFontWeight };
