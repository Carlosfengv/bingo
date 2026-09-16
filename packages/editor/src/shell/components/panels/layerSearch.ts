/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/layerSearch.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ROOT, getById, getParentId, walk } from "@bingo/compiler";

/**
* Human-readable label for a layer row. A user-assigned `name` always wins;
* otherwise it's derived from the element (component name, tag, text content,
* icon name, or webview URL). Text layers show their content, never just "Text"
* unless empty.
*/
function getElementLabel(element) {
  if (element.name && element.name.trim()) return element.name;
  if (element.type === "component") return element.componentName || "Component";
  if (element.type === "capture") return element.original?.componentName || "Capture";
  if (element.type === "html") {
    const componentName = element.props?.["data-component"];
    if (componentName) return componentName;
    return element.tag || "Element";
  }
  if (element.type === "text") {
    const flatten = node => node.text ?? (node.children ?? []).map(flatten).join("");
    return flatten(element).trim() || "Text";
  }
  if (element.type === "icon") return element.iconName || "Icon";
  if (element.type === "webview") try {
    const url = new URL(element.src);
    return url.pathname !== "/" ? url.pathname : element.src;
  } catch {
    return element.src;
  }
  return "Element";
}
var lowerLabelCache = new WeakMap();
function lowerLabelOf(element) {
  const hit = lowerLabelCache.get(element);
  if (hit !== void 0) return hit;
  const lower = getElementLabel(element).toLowerCase();
  lowerLabelCache.set(element, lower);
  return lower;
}
var PREFIX_HISTORY = 8;
/**
* A per-panel search index. Holds two caches that make repeated queries over a
* large tree cheap; both key off object identity, so neither can go stale:
*
*  - the flat id list for a store version, rebuilt only when the store changes;
*  - candidate sets for recent queries, reused when the new query extends one.
*
* The second relies on substring matching being monotone under extension: a
* label without "abc" cannot contain "abcd", so an extended query only ever
* needs to filter the previous result set. Typing an n-character query costs one
* full scan plus n-1 scans over a collapsing candidate set.
*/
function createLayerSearchIndex() {
  let indexedStore = null;
  let allIds = [];
  let runs = [];
  const reindex = store => {
    if (indexedStore === store) return allIds;
    const ids = [];
    walk(store, ROOT, id => ids.push(id));
    indexedStore = store;
    allIds = ids;
    runs = [];
    return ids;
  };
  const reuse = (query, limit) => {
    for (const run of runs) {
      if (run.query !== query) continue;
      if (run.ids.length > limit) return {
        query,
        ids: run.ids.slice(0, limit),
        truncated: true
      };
      if (run.ids.length === limit) return run;
      return run.truncated ? null : run;
    }
    return null;
  };
  const matchIds = (store, query, limit) => {
    const everything = reindex(store);
    const cached = reuse(query, limit);
    if (cached) return cached;
    let candidates = everything;
    let longest = -1;
    for (const run of runs) if (!run.truncated && query.startsWith(run.query) && run.query.length > longest) {
      candidates = run.ids;
      longest = run.query.length;
    }
    const ids = [];
    let truncated = false;
    for (const id of candidates) {
      const element = getById(store, id);
      if (!element || !lowerLabelOf(element).includes(query)) continue;
      if (ids.length >= limit) {
        truncated = true;
        break;
      }
      ids.push(id);
    }
    const run = {
      query,
      ids,
      truncated
    };
    runs.push(run);
    if (runs.length > PREFIX_HISTORY) runs.shift();
    return run;
  };
  return {
    search(store, query, limit = 300) {
      const q = query.trim().toLowerCase();
      if (!q) return null;
      const run = matchIds(store, q, limit);
      return {
        matches: run.ids,
        truncated: run.truncated
      };
    }
  };
}
/**
* Rows to render for a set of matches: each match, preceded by the direct parent
* of a text match so a bare string of content reads in context of the layer
* holding it. The text indents under that parent — flush rows would read as
* siblings rather than as the pair they are.
*
* A parent is emitted once, ahead of its first matching child, and never twice
* when it is itself a match. Counts stay keyed on matches, not rows.
*/
function withTextParents(store, matches) {
  const rows = [];
  const emitted = new Set();
  for (const id of matches) {
    let depth = 0;
    if (getById(store, id)?.type === "text") {
      const parent = getParentId(store, id);
      if (parent && parent !== "ROOT") {
        if (!emitted.has(parent)) {
          rows.push({
            id: parent,
            depth: 0
          });
          emitted.add(parent);
        }
        depth = 1;
      }
    }
    if (emitted.has(id)) continue;
    rows.push({
      id,
      depth
    });
    emitted.add(id);
  }
  return rows;
}
/**
* Split a label into alternating plain and matched runs so a row can emphasise
* what the query hit. Case-insensitive, every occurrence; an empty query (or no
* hit) yields the label as a single plain run.
*/
function splitLabelMatches(label, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [{
    text: label,
    match: false
  }];
  const haystack = label.toLowerCase();
  const segments = [];
  let cursor = 0;
  for (let at = haystack.indexOf(q); at !== -1; at = haystack.indexOf(q, cursor)) {
    if (at > cursor) segments.push({
      text: label.slice(cursor, at),
      match: false
    });
    segments.push({
      text: label.slice(at, at + q.length),
      match: true
    });
    cursor = at + q.length;
  }
  if (segments.length === 0) return [{
    text: label,
    match: false
  }];
  if (cursor < label.length) segments.push({
    text: label.slice(cursor),
    match: false
  });
  return segments;
}

export { createLayerSearchIndex, getElementLabel, splitLabelMatches, withTextParents };
