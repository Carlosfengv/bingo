/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/store/commentedStyles.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Editor-only sidecar for style declarations that are temporarily disabled.
*
* The value lives in a CSS custom property so it round-trips through the
* existing style operation and persistence paths without affecting rendering.
* Code generation strips the sidecar and emits the entries as block comments.
*/
var COMMENTED_STYLES_KEY = "--bingo-commented-styles";
function isCommentedStyleEntry(value) {
  if (!value || typeof value !== "object") return false;
  const entry = value;
  return (entry.group === "shadow" || entry.group === "filter") && Number.isInteger(entry.index) && entry.index >= 0 && (entry.property === "boxShadow" || entry.property === "filter" || entry.property === "backdropFilter") && typeof entry.value === "string";
}
function parseCommentedStyles(value) {
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return Array.isArray(parsed) ? parsed.filter(isCommentedStyleEntry) : [];
  } catch {
    return [];
  }
}
function serializeCommentedStyles(entries) {
  return encodeURIComponent(JSON.stringify(entries));
}
function splitCommentedStyles(styles) {
  if (!styles) return {
    styles: {},
    commented: []
  };
  const next = {
    ...styles
  };
  const commented = parseCommentedStyles(next[COMMENTED_STYLES_KEY]);
  delete next[COMMENTED_STYLES_KEY];
  return {
    styles: next,
    commented
  };
}
/** Serialize one entry as a plain commented-out style declaration. */
function commentedStyleComment(entry) {
  const value = JSON.stringify(entry.value).replace(/\*\//g, "*\\/");
  return `${JSON.stringify(entry.property)}: ${value},`;
}
function parseCommentedStyleComment(value, index = Number.MAX_SAFE_INTEGER) {
  const match = value.match(/^\s*("(?:\\.|[^"\\])+")\s*:\s*(.+),\s*$/s);
  if (!match) return null;
  try {
    const property = JSON.parse(match[1]);
    const styleValue = JSON.parse(match[2]);
    if (typeof property !== "string" || typeof styleValue !== "string") return null;
    const group = property === "boxShadow" ? "shadow" : property === "backdropFilter" ? "filter" : property === "filter" && /^\s*drop-shadow\(/i.test(styleValue) ? "shadow" : property === "filter" && /^\s*(?:blur|brightness|contrast|grayscale|hue-rotate|invert|saturate|sepia)\(/i.test(styleValue) ? "filter" : null;
    if (!group) return null;
    const parsed = {
      group,
      index,
      property,
      value: styleValue
    };
    return isCommentedStyleEntry(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export { COMMENTED_STYLES_KEY, commentedStyleComment, parseCommentedStyleComment, parseCommentedStyles, serializeCommentedStyles, splitCommentedStyles };
