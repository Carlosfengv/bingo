/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/generateJSX.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { commentedStyleComment, splitCommentedStyles } from "../store/commentedStyles";
import { getById, getChildren$2, getRootIds } from "../store/read";
import { isTransientUploadProp } from "../store/sanitize";
import { normalizeReactAttrs } from "./htmlAttrCasing";
import { storeFromNested } from "../store/ensureV2";

/** Marker embedded in budget truncation stubs — canvas_update hard-rejects if present. */
var BINGO_TRUNCATED_MARKER = "bingo:truncated";
/** Max chars for canvas_read(element_id) JSX returned to MCP clients. */
var CANVAS_JSX_MAX_CHARS = 2e4;
function jsxContainsTruncationStub(jsx) {
  return jsx.includes(BINGO_TRUNCATED_MARKER);
}
function elementTagLabel(element) {
  switch (element.type) {
    case "html":
      return element.tag || "div";
    case "component":
      return element.componentName || "Component";
    case "icon":
      return element.iconName || "icon";
    case "text":
      return "text";
    case "capture":
      return "capture";
    case "webview":
      return "webview";
  }
}
function truncationStubBody(id, tag) {
  return `{/* ${BINGO_TRUNCATED_MARKER} id="${id}" tag="${tag}" */}`;
}
function truncationStub(id, element, indent) {
  return `${"  ".repeat(indent)}${truncationStubBody(id, elementTagLabel(element))}`;
}
/** Matches the render-time check in the editor's renderElement. */
function looksLikeAssetPath$1(v) {
  return v.includes(".bingo-assets/") || v.startsWith("/assets/") || v.startsWith("/public/");
}
function resolveStyleValue(value, assetResolver) {
  if (!assetResolver || typeof value !== "string" || !value.includes("url(")) return value;
  return value.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, path) => looksLikeAssetPath$1(path) ? `url(${quote}${assetResolver(path)}${quote})` : match);
}
/**
* Generate JSX code from a flat Store
*/
function generateJSX(store, indent = 0, options = {}) {
  return (options.rootId != null ? [options.rootId] : getRootIds(store)).map(id => generateElement(store, id, indent, options)).join("\n");
}
function generateElement(store, id, indent, options) {
  const element = getById(store, id);
  if (!element) return "";
  if (options.stubbedIds?.has(id)) return truncationStub(id, element, indent);
  const spaces = "  ".repeat(indent);
  if (element.type === "text") {
    const inner = element.children && element.children.length > 0 ? element.children.map(emitInlineRun).join("") : emitText(element.text || "");
    const hasOuterStyles = element.styles && Object.keys(element.styles).length > 0;
    const hasOuterClass = !!element.className;
    if (hasOuterStyles || hasOuterClass) {
      let attrs = generateAttributes(id, element.styles, {}, options);
      if (hasOuterClass) attrs += ` className="${escapeAttribute(element.className)}"`;
      return `${spaces}<span${attrs}>${inner}</span>`;
    }
    return `${spaces}${inner}`;
  }
  if (element.type === "html") {
    const children = getChildren$2(store, element.id);
    const attrs = generateAttributes(id, element.styles, element.props || {}, options);
    const opening = `${spaces}<${element.tag}${attrs}>`;
    if (children.length === 0) return `${opening}</${element.tag}>`;
    return `${opening}\n${children.map(childId => generateElement(store, childId, indent + 1, options)).join("\n")}\n${spaces}</${element.tag}>`;
  }
  if (element.type === "capture") {
    const children = getChildren$2(store, element.id);
    if (children.length === 0) return `${spaces}<></>`;
    if (children.length === 1) return generateElement(store, children[0], indent, options);
    return `${spaces}<>\n${children.map(childId => generateElement(store, childId, indent + 1, options)).join("\n")}\n${spaces}</>`;
  }
  if (element.type === "component") {
    if (options.iconSyntax === "canvas" && !options.componentIndex?.[element.componentName]) {
      for (const [library, config] of Object.entries(options.iconLibraries ?? {})) {
        if (config?.icons?.[element.componentName]) {
          const attrs = generateAttributes(id, element.styles, element.props || {}, options);
          return `${spaces}<i data-icon="${escapeAttribute(element.componentName)}" data-icon-library="${escapeAttribute(library)}"${attrs} />`;
        }
      }
    }
    const attrs = generateAttributes(id, element.styles, element.props || {}, options);
    const opening = `${spaces}<${element.componentName}${attrs}`;
    const children = getChildren$2(store, element.id);
    if (children.length === 0) return `${opening} />`;
    return `${opening}>\n${children.map(childId => generateElement(store, childId, indent + 1, options)).join("\n")}\n${spaces}</${element.componentName}>`;
  }
  if (element.type === "icon") {
    const attrs = generateAttributes(id, element.styles, element.props || {}, options);
    if (options.iconSyntax === "canvas") {
      return `${spaces}<i data-icon="${escapeAttribute(element.iconName)}" data-icon-library="${escapeAttribute(element.library || "lucide-react")}"${attrs} />`;
    }
    if (element.library === "@hugeicons/core-free-icons") {
      const iconExport = element.iconName.endsWith("Icon") ? element.iconName : `${element.iconName}Icon`;
      return `${spaces}<HugeiconsIcon icon={${iconExport}}${attrs} />`;
    }
    return `${spaces}<${element.iconName}${attrs} />`;
  }
  return "";
}
function generateAttributes(elementId, styles, props, options) {
  let attrs = "";
  if (options?.includeDataElementId === true && elementId != null) attrs += ` data-element-id="${elementId}"`;
  if (styles) {
    const {
      styles: renderStyles,
      commented
    } = splitCommentedStyles(styles);
    const cssEntries = Object.entries(renderStyles).map(([key, value]) => [key, resolveStyleValue(value, options?.assetResolver)]);
    if (cssEntries.length === 1 && commented.length === 0) {
      const styleObj = Object.fromEntries(cssEntries);
      attrs += ` style={${JSON.stringify(styleObj)}}`;
    } else if (cssEntries.length > 1 && commented.length === 0) {
      const formattedStyles = cssEntries.map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(",\n");
      attrs += ` style={{\n${formattedStyles}\n  }}`;
    } else if (commented.length > 0) {
      const lines = [...cssEntries.map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)},`), ...commented.map(entry => `    /* ${commentedStyleComment(entry)} */`)];
      attrs += ` style={{\n${lines.join("\n")}\n  }}`;
    }
  }
  const normalizedProps = normalizeReactAttrs(props);
  if (normalizedProps) Object.entries(normalizedProps).forEach(([key, value]) => {
    if (key === "style") return;
    if (key === "data-element-id" || key === "dataElementId") return;
    if (isTransientUploadProp(key)) return;
    if (key === "data-bingo-component" || key === "data-bingo-map") return;
    if (value === void 0) return;
    if (typeof value === "string") {
      const resolved = options?.assetResolver && looksLikeAssetPath$1(value) ? options.assetResolver(value) : value;
      attrs += ` ${key}="${escapeAttribute(resolved)}"`;
    } else if (typeof value === "boolean") {
      if (value) attrs += ` ${key}`;
    } else attrs += ` ${key}={${JSON.stringify(value)}}`;
  });
  return attrs;
}
function emitInlineRun(run) {
  const text = emitText(run.text ?? "");
  const styles = run.styles;
  const className = run.className;
  const hasStyles = styles && Object.keys(styles).length > 0;
  const hasClass = !!className;
  if (!hasStyles && !hasClass) return text;
  let attrs = "";
  if (hasStyles) attrs += generateAttributes(void 0, styles);
  if (hasClass) attrs += ` className="${escapeAttribute(className)}"`;
  return `<span${attrs}>${text}</span>`;
}
function emitText(text) {
  if (!text) return "";
  return /[<>{}]/.test(text) || /&[#a-zA-Z0-9]+;/.test(text) ? `{${JSON.stringify(text)}}` : text;
}
function escapeAttribute(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
/** FNV-1a 64-bit hex — pure JS so renderer + Node tests share one digest. */
function hashStringFnv1a64(input) {
  let h = 14695981039346656037n;
  const prime = 1099511628211n;
  for (let i = 0; i < input.length; i++) {
    h ^= BigInt(input.charCodeAt(i));
    h = h * prime & 18446744073709551615n;
  }
  return h.toString(16).padStart(16, "0");
}
function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const obj = value;
  return `{${Object.keys(obj).sort().map(k => `${JSON.stringify(k)}:${stableJson(obj[k])}`).join(",")}}`;
}
function stablePropsJson(props) {
  if (!props) return "";
  return stableJson(Object.fromEntries(Object.entries(props).filter(([k]) => !isTransientUploadProp(k))));
}
/** Content fingerprint for one node (no children) — used by covering-read hashes. */
function elementFingerprint(el) {
  const styles = el.styles ? stableJson(el.styles) : "";
  const name = el.name ?? "";
  switch (el.type) {
    case "html":
      return `html\0${el.id}\0${el.tag}\0${stablePropsJson(el.props)}\0${styles}\0${name}`;
    case "component":
      return `component\0${el.id}\0${el.componentName}\0${stablePropsJson(el.props)}\0${styles}\0${name}`;
    case "text":
      {
        const runs = el.children ? stableJson(el.children) : "";
        return `text\0${el.id}\0${el.text ?? ""}\0${runs}\0${el.className ?? ""}\0${styles}\0${name}`;
      }
    case "icon":
      return `icon\0${el.id}\0${el.library}\0${el.iconName}\0${stablePropsJson(el.props)}\0${styles}\0${name}`;
    case "webview":
      return `webview\0${el.id}\0${el.src}\0${styles}\0${name}`;
    case "capture":
      return `capture\0${el.id}\0${el.original.componentName}\0${styles}\0${name}`;
    default:
      return `unknown\0${el.id}`;
  }
}
/** Bottom-up hash walk; optionally records every descendant hash into `out`. */
function hashSubtreeWalk(store, id, out) {
  const el = getById(store, id);
  if (!el) {
    const empty = hashStringFnv1a64("");
    out?.set(id, empty);
    return empty;
  }
  const childHashes = getChildren$2(store, id).map(childId => hashSubtreeWalk(store, childId, out));
  const h = hashStringFnv1a64([elementFingerprint(el), ...childHashes].join("\n"));
  out?.set(id, h);
  return h;
}
/**
* Bottom-up subtree hashes for `rootId` and every descendant.
* O(subtree) — sibling edits change that sibling's hash (and ancestors) only.
*/
function hashAllElementSubtreesFrom(store, rootId) {
  const out = new Map();
  if (getById(store, rootId)) hashSubtreeWalk(store, rootId, out);
  return out;
}
/** Hash of one element's full subtree (never from truncated JSX). */
function hashElementSubtreeFrom(store, rootId) {
  if (!getById(store, rootId)) return hashStringFnv1a64("");
  return hashSubtreeWalk(store, rootId);
}
function stubCommentLen(id, store) {
  const el = getById(store, id);
  return truncationStubBody(id, el ? elementTagLabel(el) : "unknown").length;
}
/** Deepest-first, last-sibling-first node ids under `rootId` (or all store roots). */
function rankNodesDeepestFirst(store, rootId) {
  const ranked = [];
  let order = 0;
  const visit = (id, depth) => {
    if (!getById(store, id)) return;
    ranked.push({
      id,
      depth,
      order: order++
    });
    for (const childId of getChildren$2(store, id)) visit(childId, depth + 1);
  };
  const starts = rootId != null ? [rootId] : getRootIds(store);
  for (const id of starts) visit(id, 0);
  ranked.sort((a, b) => b.depth - a.depth || b.order - a.order);
  return ranked.map(n => n.id);
}
/**
* Preferred stub targets from a deepest-first ranking: nodes with children,
* plus text leaves longer than a stub.
*/
function stubCandidatesFromRanked(store, ranked) {
  const candidates = [];
  for (const id of ranked) {
    const el = getById(store, id);
    if (!el) continue;
    if (getChildren$2(store, id).length > 0) {
      candidates.push(id);
      continue;
    }
    if (el.type === "text") {
      if ((el.children ? el.children.reduce((n, r) => n + (r.text?.length ?? 0), 0) : el.text?.length ?? 0) > stubCommentLen(id, store)) candidates.push(id);
    }
  }
  return candidates;
}
/**
* Return full JSX when under budget; otherwise stub deepest nodes (last in
* document order) until under maxChars. Uses binary search over candidates so
* large trees need O(log n) full regenerations instead of O(n²) worth-checks.
*/
function generateJSXWithinBudget(store, options = {
  includeDataElementId: true
}, maxChars = CANVAS_JSX_MAX_CHARS) {
  const baseOptions = {
    ...options,
    stubbedIds: void 0
  };
  const full = generateJSX(store, 0, baseOptions);
  if (full.length <= maxChars) return {
    jsx: full,
    truncated: false
  };
  const ranked = rankNodesDeepestFirst(store, options.rootId);
  const candidates = stubCandidatesFromRanked(store, ranked);
  let lo = 0;
  let hi = candidates.length;
  let bestFit;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const jsx = generateJSX(store, 0, {
      ...baseOptions,
      stubbedIds: new Set(candidates.slice(0, mid))
    });
    if (jsx.length <= maxChars) {
      hi = mid;
      bestFit = jsx;
    } else lo = mid + 1;
  }
  const stubbed = new Set(candidates.slice(0, lo));
  let bestJsx = bestFit ?? generateJSX(store, 0, {
    ...baseOptions,
    stubbedIds: stubbed
  });
  if (bestJsx.length > maxChars) for (const id of ranked) {
    if (stubbed.has(id)) continue;
    stubbed.add(id);
    const jsx = generateJSX(store, 0, {
      ...baseOptions,
      stubbedIds: stubbed
    });
    if (jsx.length >= bestJsx.length) {
      stubbed.delete(id);
      continue;
    }
    bestJsx = jsx;
    if (bestJsx.length <= maxChars) break;
  }
  return {
    jsx: bestJsx,
    truncated: true
  };
}
function generateCanvasJSXFromNested(nested, options = {}) {
  const store = storeFromNested([nested]);
  const rootId = nested.id;
  const stubbedIds = new Set();
  const maxDepth = Number.isFinite(options.maxDepth) ? Math.max(0, options.maxDepth) : Infinity;
  const visit = (id, depth) => {
    if (depth > maxDepth) {
      stubbedIds.add(id);
      return;
    }
    for (const childId of getChildren$2(store, id)) visit(childId, depth + 1);
  };
  visit(rootId, 0);
  return {
    formatVersion: "canvas-jsx-v1",
    jsx: generateJSX(store, 0, {
      includeDataElementId: true,
      iconSyntax: "canvas",
      rootId,
      stubbedIds,
    }),
    truncated: stubbedIds.size > 0,
    stubbedElementIds: [...stubbedIds],
  };
}
function hashFullyVisibleElementSubtreesFrom(store, rootId, stubbedElementIds = []) {
  const hashes = hashAllElementSubtreesFrom(store, rootId);
  const excluded = new Set();
  for (const stubbedId of stubbedElementIds) {
    const descendants = [stubbedId];
    while (descendants.length > 0) {
      const descendant = descendants.pop();
      excluded.add(descendant);
      descendants.push(...getChildren$2(store, descendant));
    }
    let current = stubbedId;
    while (current && current !== "ROOT") {
      excluded.add(current);
      current = store.parentByChild.get(current);
    }
  }
  for (const id of excluded) hashes.delete(id);
  return hashes;
}
/** Matches the render-time check in the editor's renderElement. */
function looksLikeAssetPath(v) {
  return v.includes(".bingo-assets/") || v.startsWith("/assets/") || v.startsWith("/public/");
}

export { generateCanvasJSXFromNested, generateJSX, generateJSXWithinBudget, hashAllElementSubtreesFrom, hashElementSubtreeFrom, hashFullyVisibleElementSubtreesFrom, jsxContainsTruncationStub };
