/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/classIndex.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { camelToKebab, kebabToCamel } from "./computedStyles";

/**
* Index of all CSS class selectors in the project's stylesheets.
* Powers both the class input autocomplete and Design tab value dropdowns.
* Reads from actual compiled CSS — picks up Tailwind + project customizations automatically.
*/
var _cachedIndex = null;
var _cacheKey = "";
/** Per-property results cache — invalidated together with _cachedIndex */
var _propertyCache = new Map();
var _propertyCacheBuilt = false;
/** CSS custom property values from :root — e.g. { '--spacing-4': '1rem' } */
var _cssVarMap = new Map();
var _cssVarMapKey = "";
var _cssVarMapBuilt = false;
function getProjectStylesheetFingerprint(doc) {
  const el = doc.getElementById("bingo-project-compiled-css");
  if (el instanceof HTMLLinkElement) return el.href;
  if (el instanceof HTMLStyleElement) return String(el.textContent?.length ?? 0);
  return "";
}
function getCacheKey(doc) {
  return `${doc.styleSheets.length}:${getProjectStylesheetFingerprint(doc)}`;
}
/**
* Build a map of all CSS custom property values defined on :root.
* Used to resolve var(--x) without DOM thrashing.
*/
function buildCssVarMap(doc) {
  const isDarkMode = doc.documentElement?.classList?.contains("dark") ?? false;
  const key = getCacheKey(doc) + `:${isDarkMode}`;
  if (_cssVarMapBuilt && _cssVarMapKey === key) return _cssVarMap;
  const vars = new Map();
  for (let i = 0; i < doc.styleSheets.length; i++) try {
    const sheet = doc.styleSheets[i];
    if (!sheet.cssRules) continue;
    collectVarValues(sheet.cssRules, vars, isDarkMode);
  } catch {}
  _cssVarMap = vars;
  _cssVarMapKey = key;
  _cssVarMapBuilt = true;
  return vars;
}
function collectVarValues(rules, vars, isDarkMode) {
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if ("selectorText" in rule && "style" in rule) {
      const sel = rule.selectorText;
      if (sel === ".dark") {
        if (!isDarkMode) continue;
      } else if (sel !== ":root" && sel !== ":root, :host" && sel !== "*" && sel !== "*, ::before, ::after" && sel !== "::backdrop") continue;
      const style = rule.style;
      for (let j = 0; j < style.length; j++) {
        const prop = style[j];
        if (prop.startsWith("--")) vars.set(prop, style.getPropertyValue(prop).trim());
      }
    }
    if ("cssRules" in rule) collectVarValues(rule.cssRules, vars, isDarkMode);
  }
}
/** Resolve var(--x) references inside any value, including inside calc(). */
function resolveVarFromMap(value, varMap, seen) {
  if (!value.includes("var(")) return value;
  const visiting = seen || new Set();
  return value.replace(/var\((--[\w-]+)(?:,\s*([^)]+))?\)/g, (_match, varName, fallback) => {
    if (visiting.has(varName)) return _match;
    visiting.add(varName);
    const val = varMap.get(varName);
    if (val) return resolveVarFromMap(val, varMap, visiting);
    if (fallback) return resolveVarFromMap(fallback.trim(), varMap, visiting);
    return _match;
  });
}
/**
* Evaluate simple calc() expressions to a final value.
* Handles: calc(<number><unit> * <number>), calc(<number><unit> / <number>),
*          calc(<number><unit> + <number><unit>), calc(<number><unit> - <number><unit>)
* Returns the original string if the expression is too complex.
*/
function evaluateCalc(value) {
  if (!value.includes("calc(")) return value;
  let result = value;
  let prev = "";
  while (result !== prev && result.includes("calc(")) {
    prev = result;
    result = result.replace(/calc\(([^()]+)\)/g, (_match, expr) => {
      const trimmed = expr.trim();
      if (trimmed.includes("var(")) return _match;
      const singleMatch = trimmed.match(/^(-?[\d.]+)([\w%]*)$/);
      if (singleMatch) return singleMatch[1] + singleMatch[2];
      const mulMatch = trimmed.match(/^(-?[\d.]+)([\w%]*)\s*\*\s*(-?[\d.]+)([\w%]*)$/);
      if (mulMatch) {
        const [, a, unitA, b, unitB] = mulMatch;
        const unit = unitA || unitB;
        return roundNum(parseFloat(a) * parseFloat(b)) + unit;
      }
      const divMatch = trimmed.match(/^(-?[\d.]+)([\w%]*)\s*\/\s*(-?[\d.]+)([\w%]*)$/);
      if (divMatch) {
        const divisor = parseFloat(divMatch[3]);
        if (divisor === 0) return _match;
        return roundNum(parseFloat(divMatch[1]) / divisor) + divMatch[2];
      }
      const addMatch = trimmed.match(/^(-?[\d.]+)([\w%]*)\s*\+\s*(-?[\d.]+)([\w%]*)$/);
      if (addMatch && addMatch[2] === addMatch[4]) return roundNum(parseFloat(addMatch[1]) + parseFloat(addMatch[3])) + addMatch[2];
      const subMatch = trimmed.match(/^(-?[\d.]+)([\w%]*)\s*-\s*(-?[\d.]+)([\w%]*)$/);
      if (subMatch && subMatch[2] === subMatch[4]) return roundNum(parseFloat(subMatch[1]) - parseFloat(subMatch[3])) + subMatch[2];
      return _match;
    });
  }
  return result;
}
function roundNum(n) {
  return parseFloat(n.toFixed(4)).toString();
}
/**
* Generation observed by React via useSyncExternalStore. Incremented on
* `bingo-css-updated` so class-suggestion hooks re-render when the
* project stylesheet loads or recompiles — independent of whether getClassIndex
* has been called yet this frame.
*/
var _cssGeneration = 0;
var _cssListeners = new Set();
function emitCssGeneration() {
  _cssGeneration++;
  for (const listener of _cssListeners) listener();
}
function subscribeClassIndex(onStoreChange) {
  _cssListeners.add(onStoreChange);
  return () => {
    _cssListeners.delete(onStoreChange);
  };
}
function getClassIndexGeneration() {
  return _cssGeneration;
}
if (typeof window !== "undefined") window.addEventListener("bingo-css-updated", emitCssGeneration);
/**
* Monotonically increasing version — bumped whenever the class index is rebuilt.
* Components can use this as a useMemo dependency to react to CSS recompilation.
*/
var _classIndexVersion = 0;
/**
* Build an index of all class selectors → their CSS declarations.
* Cached until stylesheet count or bingo-css-updated event.
*/
function getClassIndex(doc) {
  const key = getCacheKey(doc);
  if (_cachedIndex && _cacheKey === key) return _cachedIndex;
  _propertyCache.clear();
  _propertyCacheBuilt = false;
  _classIndexVersion++;
  const entries = [];
  const seen = new Map();
  function processRules(ruleList) {
    for (let i = 0; i < ruleList.length; i++) {
      const rule = ruleList[i];
      if ("selectorText" in rule && rule.style) processStyleRule(rule);
      if ("cssRules" in rule) processRules(rule.cssRules);
    }
  }
  function parseCssText(cssText) {
    const declarations = {};
    if (!cssText) return declarations;
    const parts = cssText.split(";");
    for (const part of parts) {
      const colonIdx = part.indexOf(":");
      if (colonIdx === -1) continue;
      const kebabProp = part.slice(0, colonIdx).trim();
      if (!kebabProp) continue;
      if (kebabProp.startsWith("--") && !kebabProp.startsWith("--tw-")) continue;
      const value = part.slice(colonIdx + 1).trim();
      if (value) declarations[kebabToCamel(kebabProp)] = value;
    }
    return declarations;
  }
  function processStyleRule(rule) {
    if (!rule.selectorText) return;
    const declarations = parseCssText(rule.style?.cssText || "");
    if (Object.keys(declarations).length === 0 && "cssRules" in rule && rule.cssRules?.length > 0) {
      const collectNested = ruleList => {
        for (let i = 0; i < ruleList.length; i++) {
          const nested = ruleList[i];
          if (nested && nested.style) {
            const nestedDecls = parseCssText(nested.style.cssText || "");
            Object.assign(declarations, nestedDecls);
          }
          if (nested && "cssRules" in nested) collectNested(nested.cssRules);
        }
      };
      collectNested(rule.cssRules);
      const variantMatch = (rule.cssRules[0]?.selectorText || "").match(/&:(hover|focus|active|focus-within|focus-visible)/);
      if (variantMatch && Object.keys(declarations).length > 0) {
        const variant = variantMatch[1];
        addClassEntry(rule.selectorText, declarations, variant);
        return;
      }
    }
    if (Object.keys(declarations).length === 0) return;
    addClassEntry(rule.selectorText, declarations);
  }
  function addClassEntry(selectorText, declarations, forcedVariant) {
    const selectors = selectorText.split(",").map(s => s.trim());
    for (const sel of selectors) {
      if (!sel.includes(".")) continue;
      if (/[\s>+~]/.test(sel.replace(/\\./g, ""))) continue;
      const classMatch = sel.match(/\.((?:\\.|[^:{\s()>+~])+)/);
      if (!classMatch) continue;
      const rawClass = classMatch[1].replace(/\\(.)/g, "$1");
      const variant = forcedVariant || (() => {
        const pseudoMatch = sel.match(/:(?!:)(hover|focus|active|focus-within|focus-visible|disabled|visited|placeholder|checked|required|invalid|empty)/);
        return pseudoMatch ? pseudoMatch[1] : void 0;
      })();
      const key = variant ? `${variant}:${rawClass}` : rawClass;
      if (seen.has(key)) continue;
      const entry = {
        className: rawClass,
        declarations: {
          ...declarations
        },
        variant
      };
      seen.set(key, entry);
      entries.push(entry);
    }
  }
  for (let i = 0; i < doc.styleSheets.length; i++) try {
    const sheet = doc.styleSheets[i];
    if (!sheet.cssRules) continue;
    processRules(sheet.cssRules);
  } catch {}
  _cachedIndex = entries;
  _cacheKey = key;
  return entries;
}
/**
* Whether a utility class appears in the compiled project stylesheet index.
*/
function isClassInCompiledStyles(doc, className) {
  return getClassIndex(doc).some(entry => entry.className === className);
}
/**
* Check if a class name is a simple utility class (not a complex selector).
* Filters out group-hover:, data-*, sonner-loader[...], etc.
*/
function isSimpleUtilityClass(className) {
  if (className.includes(":")) return false;
  if (className.includes("[") && !className.startsWith("[")) return false;
  if (className.includes("]") && !className.endsWith("]")) return false;
  if (className.includes("data-")) return false;
  if (className.startsWith("group-")) return false;
  if (className.startsWith("peer-")) return false;
  if (className === "sr-only" || className === "not-sr-only") return false;
  if (/^[A-Z]/.test(className)) return false;
  if (className.length > 40) return false;
  return true;
}
/**
* Search classes by prefix. Returns matches sorted by relevance.
* Shows resolved CSS values alongside class names.
*/
function searchClasses(doc, query, limit = 20) {
  const index = getClassIndex(doc);
  const q = query.toLowerCase();
  const results = [];
  for (const entry of index) {
    if (entry.variant) continue;
    if (!isSimpleUtilityClass(entry.className)) continue;
    const name = entry.className.toLowerCase();
    if (!name.includes(q)) continue;
    const summary = Object.entries(entry.declarations).slice(0, 2).map(([k, v]) => `${camelToKebab(k)}: ${v}`).join("; ");
    const score = name.startsWith(q) ? 0 : 1;
    results.push({
      className: entry.className,
      summary,
      score
    });
  }
  return results.sort((a, b) => a.score - b.score || a.className.localeCompare(b.className)).slice(0, limit);
}
/**
* Get all classes that set a specific CSS property.
* Used by Design tab dropdowns (Step 6).
*/
var RELATED_PROPERTIES = {
  padding: ["paddingBlock", "paddingInline", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
  paddingTop: ["paddingBlock", "padding"],
  paddingBottom: ["paddingBlock", "padding"],
  paddingLeft: ["paddingInline", "padding"],
  paddingRight: ["paddingInline", "padding"],
  margin: ["marginBlock", "marginInline", "marginTop", "marginRight", "marginBottom", "marginLeft"],
  marginTop: ["marginBlock", "margin"],
  marginBottom: ["marginBlock", "margin"],
  marginLeft: ["marginInline", "margin"],
  marginRight: ["marginInline", "margin"],
  borderRadius: ["borderStartStartRadius", "borderStartEndRadius", "borderEndStartRadius", "borderEndEndRadius"],
  borderTopLeftRadius: ["borderStartStartRadius", "borderRadius"],
  borderTopRightRadius: ["borderStartEndRadius", "borderRadius"],
  borderBottomLeftRadius: ["borderEndStartRadius", "borderRadius"],
  borderBottomRightRadius: ["borderEndEndRadius", "borderRadius"],
  borderWidth: [],
  borderTopWidth: [],
  borderRightWidth: [],
  borderBottomWidth: [],
  borderLeftWidth: [],
  borderColor: [],
  borderTopColor: [],
  borderRightColor: [],
  borderBottomColor: [],
  borderLeftColor: [],
  borderStyle: [],
  borderTopStyle: [],
  borderRightStyle: [],
  borderBottomStyle: [],
  borderLeftStyle: [],
  rowGap: ["gap"],
  columnGap: ["gap"],
  top: ["inset", "insetBlock"],
  right: ["inset", "insetInline"],
  bottom: ["inset", "insetBlock"],
  left: ["inset", "insetInline"],
  zIndex: []
};
/**
* Resolve a CSS value like "var(--spacing-4)" to its computed value (e.g. "1rem").
* Uses the cached variable map — no DOM operations.
*/
function resolveVarValue(doc, value) {
  if (!value.includes("var(") && !value.includes("calc(")) return remToPx(value);
  const varsResolved = resolveVarFromMap(value, buildCssVarMap(doc));
  if (varsResolved.includes("var(")) {
    let fallback = varsResolved;
    try {
      const rootStyle = getComputedStyle(doc.documentElement);
      fallback = fallback.replace(/var\((--[\w-]+)\)/g, (m, varName) => {
        return rootStyle.getPropertyValue(varName).trim() || m;
      });
    } catch {}
    if (fallback !== varsResolved) return evaluateCalc(remToPx(fallback));
  }
  return evaluateCalc(remToPx(varsResolved));
}
/** Convert rem values to px (1rem = 16px). */
function remToPx(value) {
  return value.replace(/(-?[\d.]+)rem/g, (_match, num) => {
    return roundNum(parseFloat(num) * 16) + "px";
  });
}
/**
* Collect custom property names defined in :root rules (the project's design tokens).
* These come from globals.css / styles.css — e.g. --background, --destructive, --primary.
* With @theme inline, Tailwind inlines var(--background) directly into utility classes,
* so we match against these :root property names to identify design system classes.
*/
var _dsTokens = null;
var _dsTokensCacheKey = "";
function getDesignSystemTokens(doc) {
  const key = getCacheKey(doc);
  if (_dsTokens && _dsTokensCacheKey === key) return _dsTokens;
  const tokens = new Set();
  for (let i = 0; i < doc.styleSheets.length; i++) try {
    const sheet = doc.styleSheets[i];
    if (!sheet.cssRules) continue;
    collectRootTokens(sheet.cssRules, tokens);
  } catch {}
  _dsTokens = tokens;
  _dsTokensCacheKey = key;
  return tokens;
}
function collectRootTokens(rules, tokens) {
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if ("selectorText" in rule && "style" in rule) {
      const sel = rule.selectorText;
      if (sel === ":root" || sel === ".dark" || sel === ":root, :host") {
        const style = rule.style;
        for (let j = 0; j < style.length; j++) {
          const prop = style[j];
          if (prop.startsWith("--") && !prop.startsWith("--tw-") && !prop.startsWith("--font-") && !prop.startsWith("--color-") && !prop.startsWith("--spacing") && !prop.startsWith("--text-") && !prop.startsWith("--tracking-") && !prop.startsWith("--leading-") && !prop.startsWith("--radius-") && !prop.startsWith("--animate-") && !prop.startsWith("--blur-") && !prop.startsWith("--default-") && !prop.startsWith("--container-") && !prop.startsWith("--font-weight-") && !prop.startsWith("--ed-")) tokens.add(prop);
        }
      }
    }
    if ("cssRules" in rule) collectRootTokens(rule.cssRules, tokens);
  }
}
var DECLARATION_TO_QUERIES = (() => {
  const map = new Map();
  for (const queryProp of Object.keys(RELATED_PROPERTIES)) {
    if (!map.has(queryProp)) map.set(queryProp, []);
    map.get(queryProp).push(queryProp);
  }
  for (const [queryProp, relatedProps] of Object.entries(RELATED_PROPERTIES)) for (const declProp of relatedProps) {
    if (!map.has(declProp)) map.set(declProp, []);
    const list = map.get(declProp);
    if (!list.includes(queryProp)) list.push(queryProp);
  }
  return map;
})();
/**
* Build the full per-property cache in one pass over the class index.
* Called lazily on first getClassesForProperty() after cache invalidation.
*/
function buildPropertyCache(doc) {
  const index = getClassIndex(doc);
  const dsTokens = getDesignSystemTokens(doc);
  const buckets = new Map();
  const seenPerBucket = new Map();
  for (const entry of index) {
    if (entry.variant) continue;
    if (!isSimpleUtilityClass(entry.className)) continue;
    for (const declProp of Object.keys(entry.declarations)) {
      const queryProps = DECLARATION_TO_QUERIES.get(declProp) || [declProp];
      for (const queryProp of queryProps) {
        if (!seenPerBucket.has(queryProp)) seenPerBucket.set(queryProp, new Set());
        const seen = seenPerBucket.get(queryProp);
        if (seen.has(entry.className)) continue;
        seen.add(entry.className);
        const value = entry.declarations[declProp];
        if (!value) continue;
        const displayValue = resolveVarValue(doc, value);
        const num = parseFloat(displayValue);
        const varMatch = value.match(/var\((--[\w-]+)/);
        const rawValue = varMatch && dsTokens.has(varMatch[1]) ? value : void 0;
        if (!buckets.has(queryProp)) buckets.set(queryProp, []);
        buckets.get(queryProp).push({
          className: entry.className,
          value: displayValue,
          rawValue,
          sortNum: isNaN(num) ? 9999 : num
        });
      }
    }
  }
  for (const [queryProp, results] of buckets) {
    const sorted = results.sort((a, b) => {
      const scopeA = getScopePriority(a.className);
      const scopeB = getScopePriority(b.className);
      if (scopeA !== scopeB) return scopeA - scopeB;
      return Math.abs(a.sortNum) - Math.abs(b.sortNum) || a.className.localeCompare(b.className);
    }).map(({
      className,
      value,
      rawValue
    }) => ({
      className,
      value,
      ...(rawValue ? {
        rawValue
      } : {})
    }));
    _propertyCache.set(queryProp, sorted);
  }
}
function getScopePriority(cls) {
  const isNeg = cls.startsWith("-");
  const base = isNeg ? cls.slice(1) : cls;
  if (/^[pmwh]-/.test(base) || /^(border|rounded|gap|opacity|z)-/.test(base)) return isNeg ? 2 : 0;
  if (/^[pm][xy]-/.test(base)) return isNeg ? 3 : 1;
  return isNeg ? 5 : 4;
}
function getClassesForProperty(doc, cssProperty, _indexGeneration) {
  if (!_propertyCacheBuilt) {
    buildPropertyCache(doc);
    _propertyCacheBuilt = true;
  }
  return _propertyCache.get(cssProperty) || [];
}

export { getClassIndex, getClassIndexGeneration, getClassesForProperty, isClassInCompiledStyles, searchClasses, subscribeClassIndex };
