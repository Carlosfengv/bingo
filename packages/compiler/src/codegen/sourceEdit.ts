/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/sourceEdit.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_lib$2 from "@babel/parser";
import traverse from "@babel/traverse";
import * as import_lib$3 from "@babel/types";

/**
* Deterministic source edits for in-place editing of a running app.
*
* Given a source file, a JSX location (from React Fiber `_debugSource` /
* capture `sourceInfo` = { filePath, lineNumber, columnNumber }), and a
* requested change, surgically rewrite the EXACT literal at that call site —
* no AI, no reformatting. We splice the original text using babel node offsets
* so everything outside the edited span is byte-for-byte preserved.
*
* This is intentionally NOT the capture/codegen path. It only handles the
* deterministic "tier 1" case: the value is a literal right at the call site
* (e.g. `className="px-5 py-2"`). When the value is dynamic (a `cn(...)` call,
* a template literal, a prop, or styling that lives in the component's own
* definition / a cva variant), we DO NOT guess — we return `ok: false` with a
* reason so the caller can fall back to definition-resolution or AI. That
* boundary is the whole point: precise where we can be, honest where we can't.
*/
function parseSource(source) {
  return (0, import_lib$2.parse)(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
    errorRecovery: true
  });
}
/**
* Find the JSX element at the given location. `sourceInfo` points at the
* opening tag; we match against the OPENING element's span (start line, or any
* line it covers when the tag is multi-line — `<a\n  className=...\n>`), so a
* coordinate landing on an attribute line still resolves to the element. Both
* the className and text edits go through this, so they behave identically.
*/
/** Find a JSX element by exact className-literal fingerprint (+ optional tag).
*  Robust against wrong line numbers. Returns null if zero or 2+ matches (so an
*  ambiguous fingerprint falls back to line matching rather than editing the
*  wrong element). */
function findByFingerprint(ast, tag, className) {
  const matches = [];
  traverse(ast, {
    JSXElement(path) {
      const open = path.node.openingElement;
      if (tag && import_lib$3.isJSXIdentifier(open.name) && open.name.name !== tag) return;
      const attr = getClassNameAttr(open);
      if (attr && attr.value && import_lib$3.isStringLiteral(attr.value) && attr.value.value === className) matches.push(path.node);
    }
  });
  return matches.length === 1 ? matches[0] : null;
}
/** Find a JSX element by tag + exact text content. For elements with no
*  className (e.g. `<dt>All properties</dt>`). Unique match only. */
function findByText(ast, tag, text) {
  const matches = [];
  traverse(ast, {
    JSXElement(path) {
      const open = path.node.openingElement;
      if (tag && import_lib$3.isJSXIdentifier(open.name) && open.name.name !== tag) return;
      const textNodes = path.node.children.filter(c => import_lib$3.isJSXText(c) && c.value.trim() !== "");
      if (textNodes.length === 1 && textNodes[0].value.trim() === text) matches.push(path.node);
    }
  });
  return matches.length === 1 ? matches[0] : null;
}
/**
* THE single source resolver. Given a file's source and an element fingerprint
* (tag + className + text — all captured reliably from the live DOM), find the
* element's real location by SEARCHING the source, not by trusting browser line
* numbers (which are wrong without the build-time plugin). className is the
* strongest key; text is the fallback for class-less elements. Returns null on
* zero or ambiguous matches so the caller can degrade gracefully.
*/
function resolveElementInSource(source, fp) {
  let ast;
  try {
    ast = parseSource(source);
  } catch {
    return null;
  }
  const loc = el => {
    const l = el.openingElement.loc;
    return {
      line: l.start.line,
      column: l.start.column
    };
  };
  if (fp.className && fp.className.trim()) {
    const el = findByFingerprint(ast, fp.tag, fp.className);
    if (el) return loc(el);
  }
  if (fp.text && fp.text.trim()) {
    const el = findByText(ast, fp.tag, fp.text.trim());
    if (el) return loc(el);
  }
  return null;
}
function findJsxElementAt(ast, at) {
  if (at.className) {
    const byFp = findByFingerprint(ast, at.tag, at.className);
    if (byFp) return byFp;
  }
  const exact = [];
  const covering = [];
  traverse(ast, {
    JSXElement(path) {
      const loc = path.node.openingElement.loc;
      if (!loc) return;
      if (loc.start.line === at.line) exact.push(path.node);else if (loc.start.line <= at.line && loc.end.line >= at.line) covering.push(path.node);
    }
  });
  const candidates = exact.length ? exact : covering;
  if (candidates.length === 0) return null;
  const col = e => e.openingElement.loc.start.column;
  const line = e => e.openingElement.loc.start.line;
  if (candidates.length === 1 || at.column == null) return candidates.reduce((best, n) => line(n) > line(best) ? n : best);
  return candidates.reduce((best, node) => Math.abs(col(node) - at.column) < Math.abs(col(best) - at.column) ? node : best);
}
function getClassNameAttr(el) {
  for (const attr of el.attributes) if (import_lib$3.isJSXAttribute(attr) && import_lib$3.isJSXIdentifier(attr.name) && (attr.name.name === "className" || attr.name.name === "class")) return attr;
  return null;
}
/** The utility core of a Tailwind token, ignoring `md:`/`hover:`/`dark:` etc. */
function tokenCore(token) {
  const i = token.lastIndexOf(":");
  return i === -1 ? token : token.slice(i + 1);
}
function spliceRange(source, start, end, replacement) {
  return source.slice(0, start) + replacement + source.slice(end);
}
function editClassNameToken(source, el, family, value) {
  const attr = getClassNameAttr(el);
  const newToken = `${family}-${value}`;
  if (!attr || attr.value == null) {
    const insertAt = el.name.end;
    return {
      ok: true,
      source: spliceRange(source, insertAt, insertAt, ` className="${newToken}"`),
      before: "",
      after: newToken
    };
  }
  if (!import_lib$3.isStringLiteral(attr.value)) return {
    ok: false,
    reason: "not-literal",
    detail: "className is not a string literal at the call site"
  };
  const lit = attr.value;
  const original = lit.value;
  const tokens = original.split(/\s+/).filter(Boolean);
  let replaced = false;
  const next = tokens.map(tok => {
    if (!replaced && tokenCore(tok).startsWith(`${family}-`)) {
      replaced = true;
      return tok.slice(0, tok.length - tokenCore(tok).length) + newToken;
    }
    return tok;
  });
  if (!replaced) next.push(newToken);
  const after = next.join(" ");
  const start = lit.start;
  const end = lit.end;
  const quote = source[start];
  return {
    ok: true,
    source: spliceRange(source, start, end, `${quote}${after}${quote}`),
    before: original,
    after
  };
}
function applySourceEdit(source, at, edit) {
  let ast;
  try {
    ast = parseSource(source);
  } catch (e) {
    return {
      ok: false,
      reason: "parse-error",
      detail: String(e?.message || e)
    };
  }
  if (edit.kind === "className-token") {
    const jsx = findJsxElementAt(ast, at);
    if (!jsx) return {
      ok: false,
      reason: "no-element"
    };
    return editClassNameToken(source, jsx.openingElement, edit.family, edit.value);
  }
  if (edit.kind === "style-merge") {
    const jsx = findJsxElementAt(ast, at);
    if (!jsx) return {
      ok: false,
      reason: "no-element"
    };
    const el = jsx.openingElement;
    const styleAttr = el.attributes.find(a => import_lib$3.isJSXAttribute(a) && import_lib$3.isJSXIdentifier(a.name) && a.name.name === "style");
    const newEntries = Object.entries(edit.styles);
    if (!newEntries.length) return {
      ok: false,
      reason: "unsupported",
      detail: "no styles"
    };
    if (!styleAttr || styleAttr.value == null) {
      const insertAt = el.name.end;
      const objStr = newEntries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ");
      return {
        ok: true,
        source: spliceRange(source, insertAt, insertAt, ` style={{ ${objStr} }}`),
        before: "",
        after: objStr
      };
    }
    if (!import_lib$3.isJSXExpressionContainer(styleAttr.value) || !import_lib$3.isObjectExpression(styleAttr.value.expression)) return {
      ok: false,
      reason: "not-literal",
      detail: "style is not an inline object literal"
    };
    const objExpr = styleAttr.value.expression;
    const newByKey = new Map(newEntries.map(([k, v]) => [k, JSON.stringify(v)]));
    const used = new Set();
    const parts = [];
    for (const prop of objExpr.properties) {
      if (import_lib$3.isObjectProperty(prop) && !prop.computed && (import_lib$3.isIdentifier(prop.key) || import_lib$3.isStringLiteral(prop.key))) {
        const key = import_lib$3.isIdentifier(prop.key) ? prop.key.name : String(prop.key.value);
        if (newByKey.has(key)) {
          const keySrc = source.slice(prop.key.start, prop.key.end);
          parts.push(`${keySrc}: ${newByKey.get(key)}`);
          used.add(key);
          continue;
        }
      }
      parts.push(source.slice(prop.start, prop.end));
    }
    for (const [k, v] of newEntries) if (!used.has(k)) parts.push(`${k}: ${JSON.stringify(v)}`);
    const objStr = parts.join(", ");
    const start = objExpr.start;
    const end = objExpr.end;
    return {
      ok: true,
      source: spliceRange(source, start, end, `{ ${objStr} }`),
      before: "",
      after: objStr
    };
  }
  if (edit.kind === "className-set") {
    const jsx = findJsxElementAt(ast, at);
    if (!jsx) return {
      ok: false,
      reason: "no-element"
    };
    const el = jsx.openingElement;
    const attr = getClassNameAttr(el);
    if (!attr || attr.value == null) {
      const insertAt = el.name.end;
      return {
        ok: true,
        source: spliceRange(source, insertAt, insertAt, ` className="${edit.value}"`),
        before: "",
        after: edit.value
      };
    }
    if (!import_lib$3.isStringLiteral(attr.value)) return {
      ok: false,
      reason: "not-literal",
      detail: "className is not a string literal at the call site"
    };
    const lit = attr.value;
    const start = lit.start;
    const end = lit.end;
    const quote = source[start];
    return {
      ok: true,
      source: spliceRange(source, start, end, `${quote}${edit.value}${quote}`),
      before: lit.value,
      after: edit.value
    };
  }
  if (edit.kind === "text") {
    const el = findJsxElementAt(ast, at);
    if (!el) return {
      ok: false,
      reason: "no-element"
    };
    const children = el.children;
    const textNodes = children.filter(c => import_lib$3.isJSXText(c) && c.value.trim() !== "");
    if (children.filter(c => !(import_lib$3.isJSXText(c) && c.value.trim() === "") && !import_lib$3.isJSXText(c)).length > 0 || textNodes.length !== 1) return {
      ok: false,
      reason: "not-literal",
      detail: "element does not contain a single plain-text child"
    };
    const node = textNodes[0];
    const start = node.start;
    const end = node.end;
    const raw = node.value;
    const lead = raw.match(/^\s*/)?.[0] ?? "";
    const trail = raw.match(/\s*$/)?.[0] ?? "";
    return {
      ok: true,
      source: spliceRange(source, start, end, `${lead}${edit.value}${trail}`),
      before: raw.trim(),
      after: edit.value
    };
  }
  return {
    ok: false,
    reason: "unsupported"
  };
}

export { applySourceEdit, resolveElementInSource };
