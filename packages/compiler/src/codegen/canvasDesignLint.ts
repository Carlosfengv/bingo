import { parse, parseExpression } from "@babel/parser";
import { findComponentCandidates } from "./componentSemantics";
import type { ComponentCatalog } from "./componentSemantics";
import { canResetComponentProp, componentPropControl, componentStyleSupport, isPublicComponentProp, validateComponentProp } from "../store/componentEditing";

export type DesignDiagnostic = {
  code: string;
  severity: "error" | "warning";
  element: string;
  elementId?: string;
  property: string;
  value: string;
  message: string;
};

const APPEARANCE_PROPERTIES = /^(?:color|background(?:Color)?|border(?:Color|Width|Style|Radius|Top.*|Bottom.*|Left.*|Right.*)?|boxShadow|font(?:Size|Family|Weight|Style)?|lineHeight|letterSpacing|padding(?:Top|Bottom|Left|Right|Inline|Block)?|gap|rowGap|columnGap|margin(?:Top|Bottom|Left|Right|Inline|Block)?)$/;

function attributeValue(attribute: any) {
  if (attribute?.type === "JSXAttribute" && attribute.value === null) return true;
  const value = attribute?.value?.type === "JSXExpressionContainer" ? attribute.value.expression : attribute?.value;
  if (value?.type === "NullLiteral") return null;
  if (value?.type === "UnaryExpression" && ["-", "+"].includes(value.operator) && value.argument.type === "NumericLiteral") return value.operator === "-" ? -value.argument.value : value.argument.value;
  if (value?.type === "TemplateLiteral" && value.expressions.length === 0) return value.quasis[0].value.cooked;
  // These shapes are statically incompatible with primitive controls. Their
  // contents are never evaluated; runtime expressions remain source bindings.
  if (["ObjectExpression", "ArrayExpression", "ArrowFunctionExpression", "FunctionExpression", "JSXElement", "JSXFragment", "BigIntLiteral", "RegExpLiteral"].includes(value?.type)) return {};
  return value && ["StringLiteral", "NumericLiteral", "BooleanLiteral"].includes(value.type) ? value.value : undefined;
}

function classBase(token: string) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i++) {
    if (token[i] === "[" || token[i] === "(") depth++;
    else if (token[i] === "]" || token[i] === ")") depth--;
    else if (token[i] === ":" && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!|!$/g, "");
}

function appearanceClass(token: string) {
  const value = classBase(token);
  if (/^(?:text-(?:left|right|center|justify|start|end|ellipsis|clip|wrap|nowrap|balance|pretty)|bg-(?:clip|origin)-.*)$/.test(value)) return false;
  return /^(?:bg-|text-|font-|leading-|tracking-|rounded(?:-|$)|border(?:-|$)|shadow(?:-|$)|p[xytrblse]?-[\w[(])/.test(value);
}

function collectDiagnostics(jsx: string, catalog: ComponentCatalog): DesignDiagnostic[] {
  let root: any;
  try { root = parseExpression(`<>${jsx}</>`, { plugins: ["jsx", "typescript"] }); }
  catch {
    // The selection editor accepts complete generated TSX files as well as
    // snippets. Inspect their JSX without executing imports or expressions.
    try { root = parse(jsx, { sourceType: "module", plugins: ["jsx", "typescript"] }); }
    catch { return []; } // Syntax/recovery errors belong to the canvas parser.
  }
  const diagnostics: DesignDiagnostic[] = [];
  function visit(node: any) {
    if (!node || typeof node !== "object") return;
    if (node.type === "JSXElement") {
      const opening = node.openingElement;
      const name = opening.name.type === "JSXIdentifier" ? opening.name.name : null;
      if (name) {
        const attrs = Object.fromEntries(opening.attributes.filter((attr: any) => attr.type === "JSXAttribute" && attr.name.type === "JSXIdentifier").map((attr: any) => [attr.name.name, attr]));
        const id = attributeValue(attrs["data-element-id"]);
        const add = (code: string, severity: "error" | "warning", property: string, value: string, message: string) => diagnostics.push({ code, severity, element: name, ...(typeof id === "string" ? { elementId: id } : {}), property, value, message });
        const component = catalog[name];
        if (component) {
          for (const [prop, descriptor] of Object.entries(component.props ?? {})) {
            if (!isPublicComponentProp(prop)) continue;
            const value = attributeValue(attrs[prop]);
            const specification = { ...descriptor, type: descriptor.type ?? "unknown" };
            if (!attrs[prop] && !opening.attributes.some(attr => attr.type === "JSXSpreadAttribute") && !canResetComponentProp(specification)) {
              add("MISSING_COMPONENT_PROP", "error", prop, "missing", `<${name}> requires ${prop}. Provide a value supported by its component API.`);
            }
            if (value !== undefined && componentPropControl(specification).kind !== "readonly" && !validateComponentProp(specification, value)) {
              add(["variant", "size", "tone"].includes(prop) ? "INVALID_COMPONENT_VARIANT" : "INVALID_COMPONENT_PROP", "error", prop, String(value), `<${name}> ${prop}=${JSON.stringify(value)} is outside the indexed API (${specification.type}). Read ${component.path ?? "the component source"} and use a supported value; refresh the index if stale.`);
            }
          }
          if (attrs.style) {
            const expression = attrs.style.value?.expression;
            const boundStyle = expression && expression.type !== "NullLiteral" && (expression.type !== "ObjectExpression" || expression.properties.some(property => {
              if (property.type !== "ObjectProperty" || property.computed) return true;
              const value = attributeValue({ value: { type: "JSXExpressionContainer", expression: property.value } });
              return value !== null && typeof value !== "string" && typeof value !== "number";
            }));
            const supportsStyle = componentStyleSupport({ type: "component", props: { asChild: attrs.asChild ? attributeValue(attrs.asChild) ?? true : component.props?.asChild?.default }, styles: {}, sourceExpressions: { ...(opening.attributes.some(attr => attr.type === "JSXSpreadAttribute") ? { spread: ["binding"] } : {}), ...(boundStyle ? { props: { style: "binding" } } : {}) } }, component);
            if (!supportsStyle) {
              // Ignore formatting/locations when comparing a preserved legacy
              // declaration with the replacement JSX.
              const value = JSON.stringify(attrs.style.value, (key, item) => ["start", "end", "loc", "extra", "leadingComments", "trailingComments", "innerComments"].includes(key) ? undefined : item);
              add("UNSUPPORTED_COMPONENT_STYLE", "error", "style", value, `<${name}> has no verified root style target for this configuration. Keep existing styles unchanged or adapt ${component.path ?? "the component source"} before adding overrides.`);
            }
          }
        }
        const className = attributeValue(attrs.className);
        const classes = typeof className === "string" ? className.split(/\s+/).filter(Boolean) : [];
        if (component) {
          const overrides = classes.filter(appearanceClass);
          if (overrides.length) add("COMPONENT_APPEARANCE_OVERRIDE", "warning", "className", overrides.join(" "), `<${name}> overrides appearance with ${overrides.join(" ")}. Prefer its supported variant/slot API; retain only source-supported customization or a requested restyle.`);
        } else if (/^[a-z]/.test(name)) {
          const primitive = classes.filter(token => {
            const base = classBase(token);
            if (/var\(|\(--/.test(base)) return false;
            return /^(?:bg|text|border|ring|fill|stroke)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)(?:\/.*)?$/.test(base)
              || /^(?:bg|text|border|rounded|shadow|font|leading|tracking|p[xytrblse]?|m[xytrblse]?|gap)-\[/.test(base);
          });
          if (primitive.length) add("PRIMITIVE_DESIGN_VALUE", "warning", "className", primitive.join(" "), `<${name}> uses palette/arbitrary classes ${primitive.join(" ")}. Prefer source semantic tokens for UI roles; keep source palette samples or exact values only when appropriate to this task.`);
        }
        const style = (attrs.style as any)?.value?.expression;
        if (style?.type === "ObjectExpression") for (const property of style.properties) {
          if (property.type !== "ObjectProperty" || property.computed) continue;
          const key = property.key.name ?? property.key.value;
          if (typeof key !== "string" || !APPEARANCE_PROPERTIES.test(key)) continue;
          const value = property.value;
          if (!["StringLiteral", "NumericLiteral"].includes(value.type)) continue;
          if (component) add("COMPONENT_APPEARANCE_OVERRIDE", "warning", `style.${key}`, String(value.value), `<${name}> sets ${key} inline. Check its source customization API instead of bypassing component appearance.`);
          else if (value.value !== 0 && !/var\(|^(?:inherit|initial|unset|revert|none|auto|transparent|currentColor)$/i.test(String(value.value))) {
            add("LITERAL_DESIGN_VALUE", "warning", `style.${key}`, String(value.value), `<${name}> uses literal ${key}: ${value.value}. Check the project's semantic token/scale and preserve its binding, or record why this exact value is required.`);
          }
        }
        if (["div", "span", "button", "input", "select", "textarea"].includes(name)) {
          const role = attributeValue(attrs.role);
          const slot = attributeValue(attrs["data-slot"]);
          const bases = classes.map(classBase);
          const looksLikePill = bases.includes("inline-flex") && bases.includes("rounded-full") && bases.some(value => value.startsWith("bg-")) && bases.some(value => /^p[xy]?\-/.test(value));
          const inputType = attributeValue(attrs.type);
          const nativeControl = ["button", "select", "textarea"].includes(name) ? name
            : name === "input" && (inputType === undefined || ["text", "email", "password", "search", "tel", "url", "number"].includes(String(inputType))) ? "input" : null;
          const noun = nativeControl ?? (typeof role === "string" && ["button", "tab", "tablist", "combobox", "dialog"].includes(role) ? role
            : typeof slot === "string" && ["badge", "card", "tabs", "button", "input"].includes(slot) ? slot
            : looksLikePill ? "badge" : null);
          const candidates = noun ? findComponentCandidates(catalog, noun).slice(0, 4) : [];
          if (candidates.length) add("POSSIBLE_COMPONENT_SUBSTITUTE", "warning", "semantic-role", noun!, `<${name}> may be implementing ${noun}. Inspect ${candidates.map(([candidate, info]) => `${candidate} (${info.path ?? "source"})`).join(", ")} before hand-styling. This is a suggestion; ordinary layout/text is allowed.`);
        }
      }
    }
    // Include JSX inside static prop expressions, but never evaluate source code.
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end", "comments", "tokens"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(child => { if (child?.type) visit(child); });
      else if (value && typeof value === "object" && "type" in value) visit(value);
    }
  }
  visit(root);
  return diagnostics;
}

/** For edits, compare issue identities/values so unrelated legacy styling is left alone. */
export function lintCanvasDesign(jsx: string, catalog: ComponentCatalog, beforeJsx?: string): DesignDiagnostic[] {
  const after = collectDiagnostics(jsx, catalog);
  if (beforeJsx === undefined) return after;
  const key = (issue: DesignDiagnostic) => JSON.stringify([issue.code, issue.elementId ?? "", issue.element, issue.property, issue.value]);
  const existing = new Map<string, number>();
  for (const issue of collectDiagnostics(beforeJsx, catalog)) existing.set(key(issue), (existing.get(key(issue)) ?? 0) + 1);
  return after.filter(issue => {
    const count = existing.get(key(issue)) ?? 0;
    if (count === 0) return true;
    existing.set(key(issue), count - 1);
    return false;
  });
}
