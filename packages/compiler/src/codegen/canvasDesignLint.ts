import { parseExpression } from "@babel/parser";
import { findComponentCandidates } from "./componentSemantics";
import type { ComponentCatalog } from "./componentSemantics";

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
  const value = attribute?.value?.type === "JSXExpressionContainer" ? attribute.value.expression : attribute?.value;
  return value && ["StringLiteral", "NumericLiteral", "BooleanLiteral"].includes(value.type) ? value.value : undefined;
}

function literalOptions(type: string | undefined) {
  if (typeof type !== "string" || !type) return null;
  const parts = type.split("|").map(part => part.trim());
  // Open types, intersections and inferred expressions cannot support a hard rejection.
  if (!parts.every(part => /^(?:"[^"\\]*"|'[^'\\]*'|undefined|null)$/.test(part))) return null;
  return parts.filter(part => part !== "undefined" && part !== "null").map(part => part.slice(1, -1));
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
  catch { return []; } // Syntax/recovery errors belong to the canvas parser.
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
          for (const prop of ["variant", "size", "tone"]) {
            const value = attributeValue(attrs[prop]);
            const options = literalOptions(component.props?.[prop]?.type);
            if (typeof value === "string" && options?.length && !options.includes(value)) {
              add("INVALID_COMPONENT_VARIANT", "error", prop, value, `<${name}> ${prop}=${JSON.stringify(value)} is outside the indexed API (${options.map(option => JSON.stringify(option)).join(" | ")}). Read ${component.path ?? "the component source"} and use a supported value; refresh the index if stale.`);
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
