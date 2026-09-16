/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/computedStyles.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* CSS cascade utilities for the styles panel.
* Provides class → CSS declaration mapping from the stylesheet index.
*/
/**
* Convert camelCase to kebab-case
*/
function camelToKebab(str) {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}
/**
* Convert kebab-case to camelCase
*/
function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
}
function getCascadeBatch(classes, classIndex) {
  const map = new Map();
  const byClass = new Map();
  const indexMap = new Map();
  for (const entry of classIndex) {
    const list = indexMap.get(entry.className) || [];
    list.push({
      declarations: entry.declarations,
      variant: entry.variant
    });
    indexMap.set(entry.className, list);
  }
  const propOwner = new Map();
  for (const cls of classes) {
    const entries = indexMap.get(cls);
    if (!entries) continue;
    const classProps = [];
    for (const {
      declarations,
      variant
    } of entries) for (const [prop, value] of Object.entries(declarations)) {
      const key = variant ? `${variant}:${prop}` : prop;
      map.set(key, {
        className: cls,
        value,
        variant
      });
      classProps.push({
        prop,
        value,
        variant,
        overridden: false
      });
      if (!variant) {
        const prevOwner = propOwner.get(prop);
        if (prevOwner && prevOwner !== cls) {
          const prevEntries = byClass.get(prevOwner);
          if (prevEntries) {
            const prevEntry = prevEntries.find(e => e.prop === prop && !e.variant);
            if (prevEntry) prevEntry.overridden = true;
          }
        }
        propOwner.set(prop, cls);
      }
    }
    if (classProps.length > 0) {
      const existing = byClass.get(cls) || [];
      byClass.set(cls, [...existing, ...classProps]);
    }
  }
  return {
    map,
    byClass
  };
}

export { camelToKebab, getCascadeBatch, kebabToCamel };
