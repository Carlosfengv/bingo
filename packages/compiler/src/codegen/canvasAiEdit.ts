/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/canvasAiEdit.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

function hasNestedChildren$1(element) {
  return "children" in element;
}
/** Whether `next` can inherit `previous`'s id — same type and same tag/component/icon. */
function canReuseElementId(previous, next) {
  if (previous.type !== next.type) return false;
  switch (previous.type) {
    case "html":
      return next.type === "html" && previous.tag === next.tag;
    case "component":
      return next.type === "component" && previous.componentName === next.componentName;
    case "capture":
      return next.type === "capture" && previous.original.componentName === next.original.componentName;
    case "icon":
      return next.type === "icon" && previous.iconName === next.iconName && previous.library === next.library;
    case "text":
      return next.type === "text";
    case "webview":
      return next.type === "webview";
  }
}
/**
* Walk a parsed subtree and re-apply the previous tree's ids where structure
* still matches (by position + type). Newly added/changed nodes keep their
* parsed ids (or reminted ids).
*/
function preserveMatchingSubtreeIds(previous, next) {
  const withStableId = {
    ...next,
    id: previous.id
  };
  if (!hasNestedChildren$1(previous) || !hasNestedChildren$1(withStableId)) return withStableId;
  const nextChildren = withStableId.children?.map((child, index) => {
    const previousChild = previous.children?.[index];
    return previousChild && canReuseElementId(previousChild, child) ? preserveMatchingSubtreeIds(previousChild, child) : child;
  });
  return {
    ...withStableId,
    children: nextChildren
  };
}
/** Collect all element ids in a nested FEElement tree (pre-order). */
function collectNestedIds(el) {
  const ids = [el.id];
  if (hasNestedChildren$1(el) && el.children) for (const child of el.children) ids.push(...collectNestedIds(child));
  return ids;
}
var remintCounter = 0;
function mintTempId() {
  remintCounter += 1;
  return `el-ai-${Date.now().toString(36)}-${remintCounter}`;
}
/**
* Normalize a parsed update subtree:
* - Reject duplicate ids in the payload
* - Reject ids that exist in the store but outside the claimed subtree (foreign)
* - Remint ids that are not in the claimed subtree and not in the store (model-invented)
* - Then preserveMatchingSubtreeIds for positional fallback
*/
function normalizeUpdateSubtree(previous, parsed, claimedSubtreeIds, allStoreIds) {
  const originalIds = collectNestedIds(parsed);
  const dupCheck = new Set();
  for (const id of originalIds) {
    if (dupCheck.has(id)) return {
      element: parsed,
      error: `Duplicate data-element-id "${id}" in update JSX.`,
      reminted: 0
    };
    dupCheck.add(id);
  }
  function findForeignInOriginal(el) {
    if (!claimedSubtreeIds.has(el.id) && allStoreIds.has(el.id)) return el.id;
    if (hasNestedChildren$1(el) && el.children) for (const c of el.children) {
      const f = findForeignInOriginal(c);
      if (f) return f;
    }
    return null;
  }
  const foreignId = findForeignInOriginal(parsed);
  if (foreignId) return {
    element: parsed,
    error: `data-element-id "${foreignId}" belongs to an element outside the claimed subtree. Only reuse ids from the element you claimed (or omit them to mint new ones).`,
    reminted: 0
  };
  let reminted = 0;
  function keepClaimedRemintRest(el) {
    let id = el.id;
    if (!claimedSubtreeIds.has(id)) {
      id = mintTempId();
      reminted += 1;
    }
    const next = {
      ...el,
      id
    };
    if (hasNestedChildren$1(el) && el.children) next.children = el.children.map(keepClaimedRemintRest);
    return next;
  }
  const preserved = preserveMatchingSubtreeIds(previous, keepClaimedRemintRest(parsed));
  preserved.id = previous.id;
  return {
    element: preserved,
    reminted
  };
}
function summarizeSubtreeChange(previous, next) {
  const prevIds = new Set(collectNestedIds(previous));
  const nextIds = new Set(collectNestedIds(next));
  let preserved = 0;
  let added = 0;
  for (const id of nextIds) if (prevIds.has(id)) preserved += 1;else added += 1;
  let removed = 0;
  for (const id of prevIds) if (!nextIds.has(id)) removed += 1;
  return {
    nodes_preserved: preserved,
    nodes_added: added,
    nodes_removed: removed
  };
}
/** Apply old→new string edit with local_edit uniqueness semantics. */
function applyJsxStringEdit(content, oldString, newString, replaceAll) {
  if (oldString === newString) return {
    error: "old_string and new_string are identical — nothing to change"
  };
  if (!content.includes(oldString)) {
    const legacyId = oldString.match(/\bid=(['"])([^'"]+)\1/);
    if (legacyId) {
      const canonicalOld = oldString.replace(/\bid=(['"])([^'"]+)\1/, "data-element-id=$1$2$1");
      if (content.includes(canonicalOld)) {
        const at = content.indexOf(canonicalOld);
        return {
          error: "Use data-element-id for canvas identity; the id attribute is a DOM attribute.",
          code: "EDIT_MATCH_ID_ATTRIBUTE_MISMATCH",
          stage: "match",
          commitState: "not_started",
          details: {
            elementId: legacyId[2],
            currentExcerpt: content.slice(Math.max(0, at - 80), at + canonicalOld.length + 80),
          },
        };
      }
    }
    return {
      error: "old_string not found in element JSX. Read/claim the element first and use the exact text including whitespace/indentation."
    };
  }
  if (replaceAll) {
    const parts = content.split(oldString);
    const count = parts.length - 1;
    return {
      content: parts.join(newString),
      replacements: count
    };
  }
  const firstIdx = content.indexOf(oldString);
  const secondIdx = content.indexOf(oldString, firstIdx + 1);
  if (secondIdx !== -1) return {
    error: `old_string is not unique in element JSX (found at lines ${content.slice(0, firstIdx).split("\n").length} and ${content.slice(0, secondIdx).split("\n").length}). Include more surrounding context to make it unique, or use replace_all to replace all occurrences.`
  };
  return {
    content: content.replace(oldString, newString),
    replacements: 1
  };
}
/** Map raw HTML tags to preferred project component names. */
var RAW_CONTROL_TO_COMPONENT = {
  button: "Button",
  input: "Input",
  select: "Select",
  textarea: "Textarea"
};
var RAW_TAG_RE = /<\s*(button|input|select|textarea)\b/g;
function formatPropSummary(props) {
  if (!props || Object.keys(props).length === 0) return "";
  const parts = [];
  for (const [name, info] of Object.entries(props).slice(0, 12)) {
    let s = `${name}: ${info.type ?? "unknown"}`;
    if (info.required) s += " (required)";
    if (info.example !== void 0) s += ` e.g. ${JSON.stringify(info.example)}`;
    parts.push(s);
  }
  return parts.join("; ");
}
/**
* Strip quoted strings / JSX text expressions so prose like
* `{"Click the <button> below"}` does not trip RAW_TAG_RE.
*/
function stripJsxStringLiterals(jsx) {
  return jsx.replace(/\{(\s*)(["'`])(?:\\.|(?!\2)[\s\S])*\2(\s*)\}/g, "{$1$2$2$3}").replace(/(["'`])(?:\\.|(?!\1)[\s\S])*\1/g, "\"\"");
}
function countRawControlTags(jsx) {
  const counts = new Map();
  const re = new RegExp(RAW_TAG_RE.source, "g");
  let m;
  while ((m = re.exec(jsx)) !== null) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  return counts;
}
function lintErrorForTags(tags, componentIndex) {
  for (const tag of tags) {
    const preferred = RAW_CONTROL_TO_COMPONENT[tag];
    if (!preferred) continue;
    const entry = Object.entries(componentIndex).find(([name]) => name.toLowerCase() === preferred.toLowerCase());
    if (!entry) continue;
    const [, info] = entry;
    const propSummary = formatPropSummary(info.props);
    return {
      message: `Raw <${tag}> is not allowed — this project has ${entry[0]} (${info.path}).` + (propSummary ? ` Props: ${propSummary}` : "") + ` Use <${entry[0]} …> instead.`
    };
  }
  return null;
}
/**
* Reject raw form controls when the project exports the matching component.
*/
function lintRawHtmlControls(jsx, componentIndex) {
  const found = countRawControlTags(stripJsxStringLiterals(jsx));
  if (found.size === 0) return null;
  return lintErrorForTags(found.keys(), componentIndex);
}
/**
* Like lintRawHtmlControls, but only fails on tags whose count increased
* from `beforeJsx` → `afterJsx`. Used by canvas_edit so pre-existing raw
* controls elsewhere in the subtree do not block unrelated surgical edits.
*/
function lintNewlyIntroducedRawHtmlControls(beforeJsx, afterJsx, componentIndex) {
  const before = countRawControlTags(stripJsxStringLiterals(beforeJsx));
  const after = countRawControlTags(stripJsxStringLiterals(afterJsx));
  const introduced = [];
  for (const [tag, count] of after) if (count > (before.get(tag) ?? 0)) introduced.push(tag);
  if (introduced.length === 0) return null;
  return lintErrorForTags(introduced, componentIndex);
}
/** Match pattern against an element's own JSX string (not full page). */
function matchElementGrep(elementId, jsx, pattern, snippetRadius = 60) {
  const m = pattern.exec(jsx);
  if (!m || m.index === void 0) return null;
  const start = Math.max(0, m.index - snippetRadius);
  const end = Math.min(jsx.length, m.index + m[0].length + snippetRadius);
  let snippet = jsx.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = "…" + snippet;
  if (end < jsx.length) snippet = snippet + "…";
  return {
    element_id: elementId,
    snippet
  };
}
/**
* Simple canvas query: space-separated tag/component names (descendant combinator).
* Examples: "table", "tr", "tbody tr", "th", "Button"
*/
function elementMatchesQueryLeaf(el, leaf) {
  const q = leaf.trim();
  if (!q) return false;
  if (el.type === "html" && el.tag) return el.tag.toLowerCase() === q.toLowerCase();
  if (el.type === "component" && el.componentName) return el.componentName.toLowerCase() === q.toLowerCase();
  if (el.type === "icon" && q.toLowerCase() === "i") return true;
  return false;
}
/**
* True when `chain` (root → candidate, inclusive) matches a space-separated
* descendant selector. The last selector part must match the candidate itself;
* earlier parts must appear in order among its ancestors.
*/
function ancestorChainMatchesQuery(chain, selectorParts) {
  const parts = selectorParts.map(p => p.trim()).filter(Boolean);
  if (parts.length === 0 || chain.length === 0) return false;
  const self = chain[chain.length - 1];
  if (!elementMatchesQueryLeaf(self, parts[parts.length - 1])) return false;
  if (parts.length === 1) return true;
  let partIdx = 0;
  const ancestors = chain.slice(0, -1);
  for (const el of ancestors) if (elementMatchesQueryLeaf(el, parts[partIdx])) {
    partIdx += 1;
    if (partIdx === parts.length - 1) return true;
  }
  return false;
}
/** Format search_components lines with types / required / examples. */
function formatComponentSearchLine(name, path, props) {
  if (!props || Object.keys(props).length === 0) return `  ${name} (${path})`;
  const parts = [];
  let usageHint = "";
  for (const [propName, raw] of Object.entries(props)) {
    const type = typeof raw === "object" && raw && "type" in raw ? String(raw.type) : "unknown";
    const required = typeof raw === "object" && raw && "required" in raw ? !!raw.required : false;
    const example = typeof raw === "object" && raw && "example" in raw ? raw.example : void 0;
    let s = `${propName}: ${type}`;
    if (required) s += "*";
    if (example !== void 0) s += `=${JSON.stringify(example)}`;
    parts.push(s);
    if ((propName === "variant" || propName === "size") && type.includes("|") && !usageHint) {
      const literals = [...type.matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]);
      if (literals.length > 0 && propName === "variant") usageHint = ` e.g. <${name} variant="${literals[0]}">…</${name}>`;else if (literals.length > 0 && propName === "size" && !usageHint) usageHint = ` e.g. <${name} size="${literals[0]}">…</${name}>`;
    }
  }
  return `  ${name} (${path}) — ${parts.join(", ")}${usageHint}`;
}

export { ancestorChainMatchesQuery, applyJsxStringEdit, formatComponentSearchLine, lintNewlyIntroducedRawHtmlControls, lintRawHtmlControls, matchElementGrep, normalizeUpdateSubtree, preserveMatchingSubtreeIds, summarizeSubtreeChange };
