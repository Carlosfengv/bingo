import { componentStyleGroup, expandComponentStyleGroup } from "./componentStyleProperties";

/** Shared component editing semantics. Values live only in props/styles. */
export type ComponentProp = {
  type: string;
  required?: boolean;
  default?: string | number | boolean | null;
  label?: string;
  description?: string;
  control?: "color";
  min?: number;
  max?: number;
  step?: number;
  group?: "appearance" | "state" | "content" | "other";
  order?: number;
  metadataError?: string;
};
export type PropValue = string | number | boolean | null;
export type PropControl = { kind: "enum" | "boolean" | "number" | "string" | "color" | "readonly"; options?: PropValue[]; nullable: boolean };
export const hasOwn = (value: object | undefined, key: string) => !!value && Object.prototype.hasOwnProperty.call(value, key);
export const isPublicComponentProp = (name: string) => !["style", "className", "children", "ref", "key", "data-element-id", "dataElementId"].includes(name);

function unionParts(type: string): string[] {
  let quote = "", escaped = false, start = 0;
  const parts: string[] = [];
  for (let i = 0; i < type.length; i++) {
    const char = type[i];
    if (escaped) { escaped = false; continue; }
    if (quote && char === "\\") { escaped = true; continue; }
    if (quote) { if (char === quote) quote = ""; }
    else if (char === '"' || char === "'") quote = char;
    else if (char === "|") { parts.push(type.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(type.slice(start).trim());
  return parts;
}

function literal(part: string): PropValue | undefined {
  if (part === "true" || part === "false") return part === "true";
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(part)) return Number(part);
  if (part.startsWith('"')) { try { const value = JSON.parse(part); return typeof value === "string" ? value : undefined; } catch { return undefined; } }
  if (/^'(?:[^'\\]|\\.)*'$/.test(part)) {
    try { return JSON.parse('"' + part.slice(1, -1).replace(/\\'|"/g, value => value === "\\'" ? "'" : '\\"') + '"'); } catch { return undefined; }
  }
  return undefined;
}

/** Validate descriptors at every entry point, including cached or external data. */
export function componentPropMetadataError(prop: ComponentProp): string | undefined {
  if (prop.metadataError) return prop.metadataError;
  const parts = unionParts(prop.type || "unknown").filter(part => !["undefined", "null"].includes(part));
  if (prop.control !== undefined && (prop.control !== "color" || parts.length !== 1 || parts[0] !== "string")) return "Unsupported control for this parameter type";
  if (prop.label !== undefined && (typeof prop.label !== "string" || !prop.label.trim())) return "Invalid parameter label";
  if (prop.group !== undefined && !["appearance", "state", "content", "other"].includes(prop.group)) return "Invalid parameter group";
  if (prop.order !== undefined && !Number.isFinite(prop.order)) return "Invalid parameter order";
  for (const key of ["min", "max", "step"] as const) {
    if (prop[key] !== undefined && (!Number.isFinite(prop[key]) || parts.length !== 1 || parts[0] !== "number")) return `Invalid parameter ${key}`;
  }
  if (prop.step !== undefined && prop.step <= 0) return "Parameter step must be positive";
  if (prop.min !== undefined && prop.max !== undefined && prop.min > prop.max) return "Parameter minimum exceeds maximum";
  return undefined;
}

export function componentPropControl(prop: ComponentProp): PropControl {
  const all = unionParts(prop.type || "unknown");
  const nullable = all.includes("null");
  if (componentPropMetadataError(prop)) return { kind: "readonly", nullable };
  const parts = all.filter(part => !["undefined", "null"].includes(part));
  if (prop.control === "color" && parts.length === 1 && parts[0] === "string") return { kind: "color", nullable };
  if (parts.length === 1 && ["string", "boolean", "number"].includes(parts[0])) return { kind: parts[0] as PropControl["kind"], nullable };
  const options = parts.map(literal);
  if (parts.length && options.every(value => value !== undefined)) return { kind: "enum", options: nullable ? [...options as PropValue[], null] : options as PropValue[], nullable };
  return { kind: "readonly", nullable };
}

export function validateComponentProp(prop: ComponentProp, value: unknown): boolean {
  const control = componentPropControl(prop);
  if (control.kind === "readonly") return false;
  if (value === null) return control.nullable;
  if (control.kind === "enum") return control.options!.some(option => Object.is(option, value));
  if (control.kind === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return false;
    if (prop.min !== undefined && value < prop.min || prop.max !== undefined && value > prop.max) return false;
    if (prop.step !== undefined) {
      const steps = (value - (prop.min ?? 0)) / prop.step;
      if (!Number.isFinite(steps) || Math.abs(steps - Math.round(steps)) > Number.EPSILON * 8 * Math.max(1, Math.abs(steps))) return false;
    }
    return true;
  }
  if (control.kind === "color") return typeof value === "string";
  if (control.kind === "boolean" || control.kind === "string") return typeof value === control.kind;
  return false;
}

export function parseComponentPropInput(prop: ComponentProp, text: string): PropValue {
  const control = componentPropControl(prop);
  const value = control.kind === "number" ? (text.trim() === "" ? NaN : Number(text)) : control.kind === "boolean" ? (text === "true" ? true : text === "false" ? false : undefined) : text;
  if (!validateComponentProp(prop, value)) throw new Error("Invalid component parameter value");
  return value as PropValue;
}

export function canResetComponentProp(prop: ComponentProp): boolean {
  return !prop.required || hasOwn(prop, "default");
}

export function updateComponentProp(props: Record<string, unknown> | undefined, name: string, prop: ComponentProp, change: { value: PropValue } | { reset: true }) {
  if (!isPublicComponentProp(name)) throw new Error("This parameter has a dedicated editor");
  if (componentPropControl(prop).kind === "readonly") throw new Error("This parameter has no supported parameter control");
  const next = { ...props };
  if ("reset" in change) {
    if (!canResetComponentProp(prop)) throw new Error("Required parameter has no known default");
    delete next[name];
  } else {
    if (!validateComponentProp(prop, change.value)) throw new Error("Invalid component parameter value");
    next[name] = change.value;
  }
  return next;
}

export function componentPropState(elements: Array<{ props?: Record<string, unknown> }>, name: string, prop: ComponentProp) {
  const states = elements.map(element => {
    const explicit = hasOwn(element.props, name);
    return { explicit, value: explicit ? element.props![name] : prop.default, known: explicit || hasOwn(prop, "default") };
  });
  const first = states[0] ?? { explicit: false, known: false, value: undefined };
  return { ...first, mixed: states.some(state => state.explicit !== first.explicit || !Object.is(state.value, first.value)), anyExplicit: states.some(state => state.explicit) };
}

// Mirrors the existing canvas renderer's explicit outer box. These properties
// must not be advertised or reset as component-root appearance overrides.
const OUTER_BOX_STYLES = new Set(["position", "top", "right", "bottom", "left", "inset", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight", "transform", "transformOrigin", "zIndex"]);
export function componentStyleTarget(styles: Record<string, unknown>, property: string): "root" | "outer" {
  return ["absolute", "fixed"].includes(String(styles?.position)) && OUTER_BOX_STYLES.has(property) ? "outer" : "root";
}

export function componentLegacyStyleState(element: any): "none" | "mergeable" | "separate" | "invalid" {
  if (element?.type !== "component" || !hasOwn(element.props, "style") || element.props.style === undefined) return "none";
  const style = element.props.style;
  if (element.sourceExpressions?.props?.style || element.sourceExpressions?.spread) return "invalid";
  if (style === null) return ["absolute", "fixed"].includes(element.styles?.position) ? "separate" : "mergeable";
  if (typeof style !== "object" || Array.isArray(style) || ![Object.prototype, null].includes(Object.getPrototypeOf(style))) return "invalid";
  // In these old records props.style belongs to the component root while styles
  // can belong to an outer box. Moving position/size across them changes layout.
  if ([element.styles?.position, style.position].some(position => position === "absolute" || position === "fixed")) return "separate";
  return "mergeable";
}

/** Read-only projection. Loading/selecting old documents must never migrate them. */
export function componentEditableElement(element: any) {
  if (componentLegacyStyleState(element) !== "mergeable") return element;
  const { style, ...props } = element.props;
  const styleRecords = { ...element.componentEditing?.styleRecords };
  for (const property of Object.keys(style ?? {})) styleRecords[property] = { target: "root", scope: "base", origin: "legacy" };
  return { ...element, props, styles: { ...element.styles, ...style }, componentEditing: { ...element.componentEditing, schemaVersion: 1, styleRecords } };
}

/** An explicit empty argument can suppress defaults despite having no CSS fields. */
export function componentEmptyStyleArgument(element: any): "empty" | "null" | undefined {
  if (componentLegacyStyleState(element) !== "mergeable") return undefined;
  if (Object.keys(componentEditableElement(element).styles).length) return undefined;
  return element.props.style === null ? "null" : "empty";
}

/** Absence must reach the component as undefined so its own style default runs. */
export function componentStyleArgument(element: any, styles: Record<string, unknown>, declarations?: Record<string, string>) {
  const legacy = element.props?.style;
  if (!Object.keys(styles ?? {}).length && legacy === null) return null;
  const explicit = legacy && typeof legacy === "object" && !Array.isArray(legacy) && [Object.prototype, null].includes(Object.getPrototypeOf(legacy));
  // Scope declarations may bridge an existing nonempty style argument to a
  // portal, but must not create one or change explicit empty/null arguments.
  if (Object.keys(styles ?? {}).length) return declarations ? { ...declarations, ...styles } : styles;
  return explicit ? styles : undefined;
}

export function componentStyleSupport(element: any, info: any): boolean {
  const asChild = hasOwn(element.props, "asChild") ? element.props.asChild : info?.props?.asChild?.default;
  return componentIdentityMatches(element, info) && info?.editing?.rootStyle === "supported" && !["separate", "invalid"].includes(componentLegacyStyleState(element)) && !asChild && !element.sourceExpressions?.props?.asChild && !element.sourceExpressions?.props?.style && !element.sourceExpressions?.spread;
}

/** Legacy instances without a recorded identity use the current project index.
 * A recorded identity must never be silently rebound by a same-name export. */
export function componentIdentityMatches(element: any, info: any): boolean {
  const identity = element?.componentEditing?.identity;
  return !identity || !!info?.path && identity.sourcePath === info.path && identity.exportName === (info.exportName ?? element.componentName);
}

export function componentClassSupport(element: any, info: any): boolean {
  const asChild = hasOwn(element.props, "asChild") ? element.props.asChild : info?.props?.asChild?.default;
  return componentIdentityMatches(element, info) && info?.editing?.rootClassName === "supported" && !asChild && !element.sourceExpressions?.props?.asChild && !element.sourceExpressions?.props?.className && !element.sourceExpressions?.spread;
}

export function nextComponentStyleRecords(element: any, styles: Record<string, unknown>, info?: any) {
  if (element.type !== "component") return undefined;
  const records = {};
  for (const [property, value] of Object.entries(styles ?? {})) {
    if (property.startsWith("__") || value === undefined || value === null || value === "") continue;
    const group = componentStyleGroup(property);
    if (group && hasOwn(element.styles, group) && !hasOwn(styles, group)) {
      const normalized = expandComponentStyleGroup(element.styles, group);
      if (!hasOwn(normalized, group) && Object.is(normalized[property], value)) {
        const sourceKey = Object.keys(element.styles).filter(key => key === property || key === group).at(-1)!;
        records[property] = element.componentEditing?.styleRecords?.[sourceKey] ?? { target: componentStyleTarget(element.styles, property), scope: "base", origin: "legacy" };
        continue;
      }
    }
    const previous = element.componentEditing?.styleRecords?.[property];
    const changed = !hasOwn(element.styles, property) || !Object.is(element.styles[property], value);
    if (changed && info && !componentIdentityMatches(element, info) && componentStyleTarget(styles, property) === "root") throw new Error("The component identity changed. Review its source before editing this instance.");
    const rootTag = info?.editing?.rootTag ?? previous?.rootTag;
    records[property] = changed ? { target: componentStyleTarget(styles, property), scope: "base", origin: "editor", ...(rootTag ? { rootTag } : {}) } : previous ?? { target: componentStyleTarget(element.styles, property), scope: "base", origin: "legacy" };
  }
  return { ...element.componentEditing, schemaVersion: 1, ...(!element.componentEditing?.identity && info?.path ? { identity: { sourcePath: info.path, exportName: info.exportName ?? element.componentName } } : {}), styleRecords: records };
}

export function componentStyleOverrides(element: any, info: any) {
  element = componentEditableElement(element);
  return Object.entries(element.styles ?? {}).filter(([property, value]) => !property.startsWith("__") && value !== undefined && value !== null && value !== "" && componentStyleTarget(element.styles, property) === "root").map(([property, value]) => {
    const record = element.componentEditing?.styleRecords?.[property];
    const active = componentStyleSupport(element, info) && (!record?.rootTag || record.rootTag === info?.editing?.rootTag);
    return { property, value, origin: record?.origin ?? "legacy", active };
  });
}

export function componentRenderStyles(element: any, info: any) {
  if (element.type !== "component" || !element.componentEditing?.styleRecords) return element.styles;
  const styles = { ...element.styles };
  for (const entry of componentStyleOverrides(element, info)) {
    // Preserve historical rendering until a record has a verified root contract.
    const record = element.componentEditing.styleRecords[entry.property];
    if (record?.rootTag && !entry.active) delete styles[entry.property];
  }
  return styles;
}
