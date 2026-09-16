/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/lib/capture/stylesheets.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* Flatten a rule list into style rules, recursing into grouping rules
* (`@media`, `@supports`, `@container`, `@layer`). This is what lets
* `hasAuthoredProp` detect responsive variants like `.md\:flex-row` — they live
* INSIDE a `CSSMediaRule`, not at the top level. `el.matches(selectorText)`
* ignores the media condition, so a match means "a class governs this property"
* regardless of the current width — exactly what we want when deciding whether
* to bake a computed value inline.
*/
function collectRules(ruleList, out) {
  for (const rule of Array.from(ruleList)) if (rule.type === 1) out.push(rule);else if (rule.cssRules) collectRules(rule.cssRules, out);
}
async function preloadSheets() {
  const rules = [];
  for (const sheet of Array.from(document.styleSheets)) try {
    collectRules(sheet.cssRules, rules);
  } catch {
    const href = sheet.href;
    if (!href) continue;
    try {
      const text = await fetch(href).then(r => r.text());
      const parsed = new CSSStyleSheet();
      await parsed.replace(text);
      collectRules(parsed.cssRules, rules);
    } catch {}
  }
  return {
    rules,
    byProp: new Map()
  };
}
function getRulesFor(prop, cache) {
  const existing = cache.byProp.get(prop);
  if (existing) return existing;
  const found = [];
  for (const rule of cache.rules) {
    const v = rule.style.getPropertyValue(prop);
    if (v) found.push({
      sel: rule.selectorText,
      val: v
    });
  }
  cache.byProp.set(prop, found);
  return found;
}
var UTILITY_SELECTOR = /^\.[^\s>+~,]+$/;
/**
* The value `prop` is given by a single-class UTILITY rule matching `el` (last
* match wins), or null. Unlike `getAuthoredValue`, descendant/tag/app selectors
* are ignored — so callers only strip baked values the canvas can reproduce.
*/
function getUtilityAuthoredValue(el, prop, cache) {
  if (!cache) return null;
  let val = null;
  for (const r of getRulesFor(prop, cache)) {
    if (!UTILITY_SELECTOR.test(r.sel)) continue;
    try {
      if (el.matches(r.sel)) val = r.val;
    } catch {}
  }
  return val;
}
/**
* Does `el` have `prop` authored anywhere — inline style, or via a CSS rule
* that matches it? Returns null if we have no stylesheet cache (can't tell).
*/
function hasAuthoredProp(el, prop, cache) {
  if (!cache) return null;
  const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const style = el.style;
  if (style && style[camel]) return true;
  const rules = getRulesFor(prop, cache);
  for (const r of rules) try {
    if (el.matches(r.sel)) return true;
  } catch {}
  return false;
}

export { getUtilityAuthoredValue, hasAuthoredProp, preloadSheets };
