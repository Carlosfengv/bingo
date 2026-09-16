/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/parseJSX.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { COMMENTED_STYLES_KEY, parseCommentedStyleComment, serializeCommentedStyles } from "../store/commentedStyles";
import { storeFromNested } from "../store/ensureV2";
import { sanitizeElementProps } from "../store/sanitize";
import * as import_lib from "@babel/parser";
import * as import_lib$3 from "@babel/types";

var idCounter = 0;
function generateId() {
  return `el-${Date.now()}-${idCounter++}-${Math.random().toString(36).slice(2, 6)}`;
}
/** Tags whose default rendering is inline; foldable into a rich-text run. */
var INLINE_FOLDABLE_TAGS = new Set(["span"]);
/** CSS style properties that are purely typographic (text marks). */
var TYPOGRAPHIC_STYLE_PROPS = new Set(["color", "font", "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant", "fontStretch", "fontFeatureSettings", "fontVariationSettings", "letterSpacing", "wordSpacing", "lineHeight", "textAlign", "textTransform", "textDecoration", "textDecorationLine", "textDecorationColor", "textDecorationStyle", "textDecorationThickness", "textUnderlineOffset", "textShadow", "textIndent", "textOverflow", "whiteSpace", "verticalAlign"]);
function stylesAreTypographicOnly(styles) {
  if (!styles) return true;
  return Object.keys(styles).every(k => TYPOGRAPHIC_STYLE_PROPS.has(k));
}
/** Standalone Tailwind class words (no value suffix) that are typographic. */
var TYPOGRAPHIC_CLASS_WORDS = new Set(["italic", "not-italic", "underline", "overline", "line-through", "no-underline", "uppercase", "lowercase", "capitalize", "normal-case", "truncate", "antialiased", "subpixel-antialiased", "tabular-nums", "oldstyle-nums", "lining-nums", "proportional-nums", "slashed-zero", "underline-offset"]);
/** Tailwind class prefixes (with a `-value` suffix) that are typographic.
*  `text-*` covers size, color and alignment; all are text properties. */
var TYPOGRAPHIC_CLASS_PREFIXES = ["text-", "font-", "tracking-", "leading-", "decoration-"];
function isTypographicClass(token) {
  const base = (token.split(":").pop() ?? token).replace(/^-/, "");
  if (!base) return true;
  if (TYPOGRAPHIC_CLASS_WORDS.has(base)) return true;
  return TYPOGRAPHIC_CLASS_PREFIXES.some(p => base.startsWith(p));
}
/** True when every class is typographic. Unknown classes count as non-typographic
*  (box-like), so we err toward keeping the span its own selectable element. */
function classNameIsTypographicOnly(className) {
  if (!className) return true;
  if (typeof className !== "string") return false;
  return className.split(/\s+/).filter(Boolean).every(isTypographicClass);
}
/** A flex/grid parent lays its children out as items (gap, justify-content,
*  align-items), so folding multiple children into one text node collapses the
*  layout — e.g. two typographic spans in a `justify-between` row would merge
*  into one node and stop spreading. Such children are layout items, not prose,
*  so don't fold them. */
function isFlexOrGridContainer(styles, className) {
  const display = styles?.display;
  if (display === "flex" || display === "inline-flex" || display === "grid" || display === "inline-grid") return true;
  if (typeof className !== "string") return false;
  return className.split(/\s+/).some(token => {
    const base = token.split(":").pop() ?? token;
    return base === "flex" || base === "inline-flex" || base === "grid" || base === "inline-grid";
  });
}
/** Convert a parsed element into a TextLeafNode run if it qualifies as a
*  styled inline run. A run can carry inline `style` and/or `className`; any
*  other prop (id, onClick, data-*, etc.) disqualifies the element from being
*  treated as a text run.
*
*  Recurses through nested foldable inline tags so that JSX like
*  `<span style={{color}}><span style={{fontWeight}}>foo</span></span>`
*  flattens to a single run with both styles merged. Without this, nested
*  styled spans break the parent's fold (one non-plain-text child rejects all
*  children) and the user's mixed styles disappear on round-trip. */
function asTextRun(el) {
  if (el.type === "text") return {
    id: el.id,
    type: "text",
    tag: "span",
    ...(el.text !== void 0 ? {
      text: el.text
    } : {}),
    ...(el.styles && Object.keys(el.styles).length > 0 ? {
      styles: el.styles
    } : {}),
    ...(el.className ? {
      className: el.className
    } : {})
  };
  if (el.type !== "html") return null;
  if (!INLINE_FOLDABLE_TAGS.has(el.tag)) return null;
  if (!el.id.startsWith("el-")) return null;
  if (!classNameIsTypographicOnly(el.props?.className) || !stylesAreTypographicOnly(el.styles)) return null;
  let className;
  if (el.props) {
    const keys = Object.keys(el.props);
    for (const k of keys) if (k === "className") className = String(el.props.className ?? "") || void 0;else return null;
  }
  if (!el.children || el.children.length !== 1) return null;
  const innerRun = asTextRun(el.children[0]);
  if (!innerRun) return null;
  const mergedStyles = {
    ...(el.styles ?? {}),
    ...(innerRun.styles ?? {})
  };
  const mergedClass = [className, innerRun.className].filter(Boolean).join(" ").trim() || void 0;
  return {
    id: el.id,
    type: "text",
    tag: "span",
    ...(innerRun.text !== void 0 ? {
      text: innerRun.text
    } : {}),
    ...(Object.keys(mergedStyles).length > 0 ? {
      styles: mergedStyles
    } : {}),
    ...(mergedClass ? {
      className: mergedClass
    } : {})
  };
}
/** When a parent's children are entirely text + foldable styled inline runs
*  AND at least one run carries styles, collapse them into a rich-text element.
*  - Multi-run case: `Hello <span style={{color:'red'}}>world</span>` ->
*    one rich text element with two runs.
*  - Single-run case: `<span className="text-red-500">world</span>` ->
*    a flat text element carrying the className/styles directly. */
function tryFoldInlineChildren(children) {
  if (children.length === 0) return null;
  const runs = [];
  for (const child of children) {
    const run = asTextRun(child);
    if (!run) return null;
    runs.push(run);
  }
  if (!runs.some(r => r.styles && Object.keys(r.styles).length > 0 || !!r.className)) return null;
  if (runs.length === 1) return [runs[0]];
  return [{
    id: generateId(),
    type: "text",
    tag: "span",
    children: runs
  }];
}
/**
* Parse JSX code into FEElement tree
* @param code - JSX code string to parse
* @param iconLibraries - Optional icon library configurations to detect icon elements
* @param components - Optional components map to prioritize over icons
* @param defaultIconLibrary - Default icon library name for data-icon syntax (e.g., "@phosphor-icons/react" or "lucide-react")
*/
function parseJSX(code, iconLibraries, components, defaultIconLibrary, options) {
  const normalizedCode = code.trim().replace(/;+\s*$/, "");
  const prefix = normalizedCode.startsWith("<") ? "function Component() { return (" : "";
  const wrappedCode = prefix ? `${prefix}${normalizedCode}) }` : normalizedCode;
  try {
    const ast = (0, import_lib.parse)(wrappedCode, {
      sourceType: "module",
      plugins: ["jsx", "typescript"]
    });
    const jsxElements = [];
    if (options?.rejectUnsupported) validateRecoveryContent(ast);
    const forceNewIds = options?.forceNewIds ?? false;
    const walk = node => {
      if (import_lib$3.isJSXElement(node)) {
        const element = parseJSXElement(node, iconLibraries, components, defaultIconLibrary, forceNewIds);
        if (element) jsxElements.push(element);
        return;
      }
      if (import_lib$3.isJSXFragment(node)) {
        const children = node.children.flatMap(child => parseJSXChild(child, iconLibraries, components, defaultIconLibrary, forceNewIds)).filter(el => el !== null);
        jsxElements.push(...children);
        return;
      }
      for (const key in node) {
        const child = node[key];
        if (child && typeof child === "object") {
          if (Array.isArray(child)) child.forEach(walk);else walk(child);
        }
      }
    };
    walk(ast);
    return storeFromNested(jsxElements);
  } catch (error) {
    if (!options?.silent) console.error("Failed to parse JSX:", error);
    const wrapped = new Error(`Invalid JSX: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    wrapped.code = error.code || "INVALID_JSX";
    wrapped.reasonCode = error.reasonCode;
    const location = error.loc ?? error.location;
    if (location) wrapped.location = { line: location.line, column: Math.max(0, location.column - (location.line === 1 ? prefix.length : 0)) };
    throw wrapped;
  }
}
/** A syntax repair must not silently drop expressions the static canvas cannot represent. */
function validateRecoveryContent(node, parent) {
  if (!node || typeof node !== "object") return;
  const supportedStatic = expression => {
    if (!expression) return false;
    if (import_lib$3.isObjectExpression(expression)) return expression.properties.every(prop =>
      import_lib$3.isObjectProperty(prop) && !prop.computed &&
      (import_lib$3.isIdentifier(prop.key) || import_lib$3.isStringLiteral(prop.key)) && supportedStatic(prop.value));
    if (import_lib$3.isArrayExpression(expression)) return expression.elements.every(supportedStatic);
    if (import_lib$3.isTSAsExpression(expression) || import_lib$3.isTSTypeAssertion(expression) || import_lib$3.isTSSatisfiesExpression(expression) || import_lib$3.isParenthesizedExpression(expression)) return supportedStatic(expression.expression);
    return parseStaticExpression(expression) !== undefined;
  };
  let unsupported = import_lib$3.isJSXSpreadChild(node) || import_lib$3.isJSXSpreadAttribute(node);
  if (import_lib$3.isJSXExpressionContainer(node)) {
    const expression = node.expression;
    unsupported = !import_lib$3.isJSXEmptyExpression(expression) && (import_lib$3.isJSXAttribute(parent)
      ? !supportedStatic(expression)
      : !import_lib$3.isStringLiteral(expression) && !import_lib$3.isNumericLiteral(expression));
  }
  if (unsupported) {
    const error = new Error("Automatic JSX recovery cannot preserve this dynamic content. Use static JSX or a project component.");
    error.code = "UNSUPPORTED_JSX_CONTENT";
    error.loc = node.loc?.start;
    throw error;
  }
  for (const key of import_lib$3.VISITOR_KEYS[node.type] ?? []) {
    const value = node[key];
    if (Array.isArray(value)) value.forEach(child => validateRecoveryContent(child, node));
    else validateRecoveryContent(value, node);
  }
}
var SVG_TAG_BY_LOWER = new Map(["animateMotion", "animateTransform", "clipPath", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence", "foreignObject", "glyphRef", "linearGradient", "radialGradient", "textPath"].map(t => [t.toLowerCase(), t]));
/**
* An uppercase-first tag is parsed as a component, so everything reaching here is
* an intrinsic. HTML names arrive lowercase; any other casing belongs to a
* case-sensitive intrinsic — SVG's camelCase elements, or a third-party
* reconciler's (react-three-fiber's `boxGeometry`, which its catalogue looks up
* verbatim). Lowercasing those loses the element on both render and save-to-code.
*/
function normalizeHtmlTag(tagName) {
  return SVG_TAG_BY_LOWER.get(tagName.toLowerCase()) ?? tagName;
}
var kebabToCamel$1 = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
function normalizeSvgPropKeys(props) {
  if (!props) return props;
  let changed = false;
  const next = {};
  for (const [key, value] of Object.entries(props)) if (key.includes("-") && !key.startsWith("data-") && !key.startsWith("aria-")) {
    next[kebabToCamel$1(key)] = value;
    changed = true;
  } else next[key] = value;
  return changed ? next : props;
}
function parseJSXElement(node, iconLibraries, components, defaultIconLibrary, forceNewIds = false, inSvg = false) {
  const openingElement = node.openingElement;
  const tagName = getTagName(openingElement.name);
  if (!tagName) return null;
  const isComponent = /^[A-Z]/.test(tagName);
  const {
    styles,
    props: rawProps
  } = parseAttributes$1(openingElement.attributes);
  let props = rawProps;
  const isSvgElement = inSvg || tagName.toLowerCase() === "svg";
  const dataElementId = !forceNewIds && props ? props["data-element-id"] ?? props.dataElementId : void 0;
  const explicitDomId = forceNewIds ? void 0 : props?.id;
  const explicitId = (typeof dataElementId === "string" && dataElementId ? dataElementId : void 0) ?? (!isSvgElement && typeof explicitDomId === "string" && explicitDomId ? explicitDomId : void 0);
  if (props?.id && !isSvgElement) delete props.id;
  props = sanitizeElementProps(props);
  if (isSvgElement) props = normalizeSvgPropKeys(props);
  const elementId = explicitId || generateId();
  if (props && props["data-icon"] && tagName === "i") {
    const iconName = props["data-icon"];
    delete props["data-icon"];
    const explicitLibrary = props["data-icon-library"];
    if (explicitLibrary) delete props["data-icon-library"];
    if (!props.size) props.size = 24;
    return {
      id: elementId,
      type: "icon",
      library: explicitLibrary || defaultIconLibrary || "lucide-react",
      iconName,
      props: Object.keys(props).length > 0 ? props : {},
      styles: styles && Object.keys(styles).length > 0 ? styles : void 0
    };
  }
  const rawChildren = node.children.flatMap(child => parseJSXChild(child, iconLibraries, components, defaultIconLibrary, forceNewIds, isSvgElement)).filter(el => el !== null);
  const children = isFlexOrGridContainer(styles, props?.className) ? rawChildren : tryFoldInlineChildren(rawChildren) ?? rawChildren;
  if (isComponent) {
    if (!(components && tagName in components) && iconLibraries) {
      for (const [libraryName, config] of Object.entries(iconLibraries)) if (config.icons[tagName]) {
        const iconProps = props || {};
        if (!iconProps.size) iconProps.size = 24;
        return {
          id: elementId,
          type: "icon",
          library: libraryName,
          iconName: config.iconAliases?.[tagName] ?? tagName,
          props: iconProps,
          styles
        };
      }
    }
    return {
      id: elementId,
      type: "component",
      componentName: tagName,
      props,
      styles,
      children: children.length > 0 ? children : void 0
    };
  } else return {
    id: elementId,
    type: "html",
    tag: normalizeHtmlTag(tagName),
    props,
    styles,
    children: children.length > 0 ? children : void 0
  };
}
function parseJSXChild(child, iconLibraries, components, defaultIconLibrary, forceNewIds = false, inSvg = false) {
  if (import_lib$3.isJSXElement(child)) return parseJSXElement(child, iconLibraries, components, defaultIconLibrary, forceNewIds, inSvg);
  if (import_lib$3.isJSXText(child)) {
    const trimmed = child.value.replace(/\s*\n\s*/g, " ").trim();
    if (!trimmed) return null;
    const leadingWs = child.value.match(/^\s*/)?.[0] ?? "";
    const trailingWs = child.value.match(/\s*$/)?.[0] ?? "";
    const hasLeadingSpace = leadingWs.length > 0 && !leadingWs.includes("\n");
    const hasTrailingSpace = trailingWs.length > 0 && !trailingWs.includes("\n");
    const preserved = (hasLeadingSpace ? " " : "") + trimmed + (hasTrailingSpace ? " " : "");
    return {
      id: generateId(),
      type: "text",
      tag: "span",
      text: preserved
    };
  }
  if (import_lib$3.isJSXExpressionContainer(child)) {
    const expr = child.expression;
    if (import_lib$3.isStringLiteral(expr)) return {
      id: generateId(),
      type: "text",
      tag: "span",
      text: expr.value
    };
    if (import_lib$3.isNumericLiteral(expr)) return {
      id: generateId(),
      type: "text",
      tag: "span",
      text: String(expr.value)
    };
    return null;
  }
  if (import_lib$3.isJSXFragment(child)) return child.children.flatMap(node => parseJSXChild(node, iconLibraries, components, defaultIconLibrary, forceNewIds, inSvg)).filter(el => el !== null);
  return null;
}
function getTagName(name) {
  if (import_lib$3.isJSXIdentifier(name)) return name.name;
  if (import_lib$3.isJSXMemberExpression(name)) {
    const parts = [];
    let current = name;
    while (import_lib$3.isJSXMemberExpression(current)) {
      if (import_lib$3.isJSXIdentifier(current.property)) parts.unshift(current.property.name);
      current = current.object;
    }
    if (import_lib$3.isJSXIdentifier(current)) parts.unshift(current.name);
    return parts.join(".");
  }
  return null;
}
function parseAttributes$1(attributes) {
  const styles = {};
  const props = {};
  for (const attr of attributes) {
    if (import_lib$3.isJSXAttribute(attr)) {
      const name = import_lib$3.isJSXIdentifier(attr.name) ? attr.name.name : null;
      if (!name) continue;
      const value = parseAttributeValue(attr.value);
      if (name === "style" && typeof value === "object") Object.assign(styles, value);else if (name !== "style") props[name] = value;
    }
    if (import_lib$3.isJSXSpreadAttribute(attr)) continue;
  }
  return {
    styles: Object.keys(styles).length > 0 ? styles : void 0,
    props: Object.keys(props).length > 0 ? props : void 0
  };
}
function parseStaticExpression(expression) {
  if (!expression || import_lib$3.isSpreadElement(expression)) return void 0;
  if (import_lib$3.isTSAsExpression(expression) || import_lib$3.isTSTypeAssertion(expression) || import_lib$3.isTSSatisfiesExpression(expression)) return parseStaticExpression(expression.expression);
  if (import_lib$3.isParenthesizedExpression(expression)) return parseStaticExpression(expression.expression);
  if (import_lib$3.isStringLiteral(expression)) return expression.value;
  if (import_lib$3.isNumericLiteral(expression)) return expression.value;
  if (import_lib$3.isBooleanLiteral(expression)) return expression.value;
  if (import_lib$3.isNullLiteral(expression)) return null;
  if (import_lib$3.isTemplateLiteral(expression) && expression.expressions.length === 0) return expression.quasis[0]?.value.cooked ?? expression.quasis[0]?.value.raw ?? "";
  if (import_lib$3.isUnaryExpression(expression) && expression.operator === "-" && import_lib$3.isNumericLiteral(expression.argument)) return -expression.argument.value;
  if (import_lib$3.isNewExpression(expression) && import_lib$3.isIdentifier(expression.callee, {
    name: "Date"
  })) {
    if (expression.arguments.length !== 1) return void 0;
    const argument = expression.arguments[0];
    if (!import_lib$3.isStringLiteral(argument) && !import_lib$3.isNumericLiteral(argument)) return void 0;
    const date = new Date(argument.value);
    if (Number.isNaN(date.getTime())) return void 0;
    return import_lib$3.isStringLiteral(argument) ? argument.value : date.toISOString();
  }
  if (import_lib$3.isArrayExpression(expression)) return expression.elements.map(element => parseStaticExpression(element)).filter(value => value !== void 0);
  if (import_lib$3.isObjectExpression(expression)) return parseObjectExpression(expression);
}
function parseObjectExpression(expression) {
  const obj = {};
  for (const prop of expression.properties) if (import_lib$3.isObjectProperty(prop)) {
    let key = null;
    if (import_lib$3.isIdentifier(prop.key)) key = prop.key.name;else if (import_lib$3.isStringLiteral(prop.key)) key = prop.key.value;
    if (key) {
      const parsed = parseStaticExpression(prop.value);
      if (parsed !== void 0) obj[key] = parsed;
    }
  }
  const commented = [...(expression.innerComments ?? []), ...expression.properties.flatMap(property => [...(property.leadingComments ?? []), ...(property.trailingComments ?? [])])].map((comment, index) => parseCommentedStyleComment(comment.value, 1e6 + index)).filter(entry => entry !== null);
  if (commented.length > 0) obj[COMMENTED_STYLES_KEY] = serializeCommentedStyles(commented);
  return obj;
}
function parseAttributeValue(value) {
  if (!value) return true;
  if (import_lib$3.isStringLiteral(value)) return value.value;
  if (import_lib$3.isJSXExpressionContainer(value)) {
    if (import_lib$3.isJSXEmptyExpression(value.expression)) return void 0;
    return parseStaticExpression(value.expression);
  }
}
new Map(["animateMotion", "animateTransform", "clipPath", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence", "foreignObject", "glyphRef", "linearGradient", "radialGradient", "textPath"].map(t => [t.toLowerCase(), t]));

export { parseJSX };
