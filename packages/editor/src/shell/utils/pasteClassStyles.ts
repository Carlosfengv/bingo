/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/pasteClassStyles.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getClassIndex } from "./classIndex";

/**
* Computed-style noise that leaks in from newer engines — CSS gap decorations,
* multicol rule metrics, writing-mode extras. Capture's SKIP list predates
* these, so they land on every captured node. Never authored; always safe to drop.
*/
var JUNK_STYLE_PROPS = new Set(["columnFill", "flexLineCount", "ruleOverlap", "transformBox", "textOrientation", "columnRuleWidth", "columnRuleColor", "columnRuleStyle", "rowRuleWidth", "rowRuleColor", "rowRuleStyle", "boxSizing", "outlineWidth", "outlineColor", "outlineStyle", "borderCollapse"]);
/** className → the properties it sets, base state only. Variants can't stand in
* for a base value (`hover:bg-red` only paints on hover), so they're excluded. */
function buildClassPropertyMap(doc) {
  const map = new Map();
  for (const entry of getClassIndex(doc)) {
    if (entry.variant) continue;
    const props = Object.keys(entry.declarations);
    if (props.length > 0) map.set(entry.className, props);
  }
  return map;
}
var classTokens = className => typeof className === "string" ? className.split(/\s+/).filter(Boolean) : [];
/** Whether any of a node's classes resolve to base-state declarations here. */
function hasResolvingClass(className, classProps) {
  return classTokens(className).some(t => classProps.has(t));
}
/** Union of the properties a node's resolving classes set. */
function classProvidedProps(className, classProps) {
  const provided = new Set();
  for (const token of classTokens(className)) {
    const props = classProps.get(token);
    if (props) for (const p of props) provided.add(p);
  }
  return provided;
}
/**
* Compute a node's styles after cleaning. Returns `changed: false` (and the
* original ref) when nothing would be removed, so callers can skip a no-op op.
* `next` is undefined once every property is gone.
*/
function computeCleanedStyles(styles, className, classProps, mode) {
  const provided = classProvidedProps(className, classProps);
  const nodeHasClass = provided.size > 0;
  const kept = {};
  for (const prop of Object.keys(styles)) {
    if (JUNK_STYLE_PROPS.has(prop)) continue;
    if (mode === "all" && nodeHasClass) continue;
    if (mode === "class" && provided.has(prop)) continue;
    kept[prop] = styles[prop];
  }
  const keptCount = Object.keys(kept).length;
  const changed = keptCount !== Object.keys(styles).length;
  return {
    next: keptCount > 0 ? kept : void 0,
    changed
  };
}
/**
* Does any node in this tree carry a class that resolves in the project? Drives
* whether the post-paste prompt appears. Operates on the nested capture tree
* (pre-insert); the apply step walks the flat store instead.
*/
function pasteHasResolvingClasses(root, doc) {
  const classProps = buildClassPropertyMap(doc);
  if (classProps.size === 0) return false;
  const visit = el => {
    if (hasResolvingClass(el.props?.className, classProps)) return true;
    const children = el.children;
    return Array.isArray(children) && children.some(visit);
  };
  return visit(root);
}

export { buildClassPropertyMap, computeCleanedStyles, pasteHasResolvingClasses };
