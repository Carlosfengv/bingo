/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/iconUtils.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Utilities for working with icon libraries
*/
/**
* Extract valid icon component names from an icon library object.
* Filters out non-component exports (contexts, utilities, types).
*/
function extractIconNames(icons, explicitNames) {
  if (!icons || typeof icons !== "object") return [];
  if (explicitNames && explicitNames.length > 0) return explicitNames.filter(name => {
    const value = icons[name];
    return typeof value === "function" || typeof value === "object" && value !== null && "$$typeof" in value;
  });
  const names = Object.entries(icons).filter(([name, value]) => isIconComponent(name, value)).map(([name]) => name).sort();
  const nameSet = new Set(names);
  return names.filter(name => {
    if (name.endsWith("Icon") && nameSet.has(name.slice(0, -4))) return false;
    return true;
  });
}
/**
* Determine if an export is likely an icon component.
*/
function isIconComponent(name, value) {
  if (!(typeof value === "function" || typeof value === "object" && value !== null && "$$typeof" in value)) return false;
  if ([/^Lucide/, /Context$/, /Provider$/, /Consumer$/, /^use[A-Z]/, /^create[A-Z]/, /^with[A-Z]/, /^default$/i, /^Icon$/, /^IconBase$/, /^__/, /^SSR/].some(pattern => pattern.test(name))) return false;
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) return false;
  return true;
}
/**
* Search icons by query (fuzzy match on name).
*/
function searchIcons(iconNames, query) {
  if (!iconNames || !Array.isArray(iconNames)) return [];
  if (!query || !query.trim()) return iconNames;
  const lowerQuery = query.toLowerCase();
  const prefixMatches = [];
  const includesMatches = [];
  for (const name of iconNames) {
    if (typeof name !== "string") continue;
    const lowerName = name.toLowerCase();
    if (lowerName.startsWith(lowerQuery)) prefixMatches.push(name);else if (lowerName.includes(lowerQuery)) includesMatches.push(name);
  }
  return [...prefixMatches, ...includesMatches];
}

export { extractIconNames, searchIcons };
