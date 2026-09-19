import { validateThemeLibrary } from "./theme";

export type VariableMode = { id: string; name?: string; label?: string };
export type VariableCollection = { id: string; name?: string; defaultModeId: string; modes: VariableMode[] };
export type VariableToken = { id: string; name?: string; description?: string; collectionId: string; type: string; cssName?: string; scopes?: string[]; bindingTemplate?: string; sourceNumber?: boolean; sourceRef?: any; valuesByMode: Record<string, { kind: string; value?: any; tokenId?: string; inheritedFromModeId?: string }> };
export type VariableLibrary = { version: number; collections: VariableCollection[]; tokens: VariableToken[]; requiredTokenIds?: string[]; assets?: any[] };
export type CollectionModes = Record<string, string>;

export const emptyVariableLibrary = (): VariableLibrary => ({ version: 1, collections: [], tokens: [], requiredTokenIds: [], assets: [] });
const COLOR_PROPERTIES = new Set(["color", "backgroundColor", "borderColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outlineColor", "fill", "stroke", "textDecorationColor"]);
const NUMBER_PROPERTIES = new Set(["width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight", "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "gap", "rowGap", "columnGap", "borderRadius", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius", "borderWidth", "outlineWidth", "fontSize", "letterSpacing", "lineHeight", "opacity", "flexGrow", "flexShrink", "fontWeight", "zIndex"]);
const UNITLESS_PROPERTIES = new Set(["opacity", "flexGrow", "flexShrink", "fontWeight", "zIndex", "lineHeight"]);
const RESOLUTION_CACHE_LIMIT = 64;
type VariableLibraryIndex = {
  tokenById: Map<string, VariableToken>;
  collectionById: Map<string, VariableCollection>;
  collectionOrder: string[];
  cssNames: Set<string>;
  expressionsByProperty: Map<string, Map<string, { tokenId: string; alpha?: number }>>;
  resolvedByModes: Map<string, ReturnType<typeof resolveVariableValuesUncached>>;
  declarationsByModes: Map<string, Record<string, string>>;
  preparedElements: WeakMap<object, WeakMap<object, any>>;
};
const libraryIndexes = new WeakMap<object, VariableLibraryIndex>();

function libraryIndex(library: VariableLibrary): VariableLibraryIndex {
  const cached = libraryIndexes.get(library as object);
  if (cached) return cached;
  const index: VariableLibraryIndex = {
    tokenById: new Map(library.tokens.map(token => [token.id, token])),
    collectionById: new Map(library.collections.map(collection => [collection.id, collection])),
    collectionOrder: library.collections.map(collection => collection.id),
    cssNames: new Set(library.tokens.flatMap(token => token.cssName ? [token.cssName] : [])),
    expressionsByProperty: new Map(),
    resolvedByModes: new Map(),
    declarationsByModes: new Map(),
    preparedElements: new WeakMap(),
  };
  libraryIndexes.set(library as object, index);
  return index;
}

export function variableModesSignature(library: VariableLibrary, modes: CollectionModes) {
  return libraryIndex(library).collectionOrder.map(id => `${JSON.stringify(id)}:${JSON.stringify(modes[id] || "")}`).join("|");
}

function cacheSet<K, V>(cache: Map<K, V>, key: K, value: V) {
  if (cache.size >= RESOLUTION_CACHE_LIMIT && !cache.has(key)) cache.delete(cache.keys().next().value!);
  cache.set(key, value);
  return value;
}

export function variableError(code: string, message: string) { return Object.assign(new Error(message), { code }); }
export function variableTypeForProperty(property: string) { return COLOR_PROPERTIES.has(property) ? "color" : NUMBER_PROPERTIES.has(property) ? "number" : null; }
export function canBindVariable(token: VariableToken, property: string) {
  return token.type === variableTypeForProperty(property) && !!token.cssName && (!token.scopes?.length || token.scopes.includes("all") || token.scopes.includes(property));
}
export function variableExpression(token: VariableToken, property: string, alpha = 1) {
  if (!token.cssName || !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(token.cssName)) throw variableError("VARIABLE_CSS_NAME", "Invalid variable CSS name.");
  const expression = `var(--${token.cssName})`;
  const bound = token.bindingTemplate ? token.bindingTemplate.replace(/\$variable/g, expression).replace(`var(--${token.cssName})`, expression) : expression;
  if (token.type === "number" && !token.sourceNumber && !UNITLESS_PROPERTIES.has(property)) return `calc(${bound} * 1px)`;
  if (token.type === "color" && alpha !== 1) return `color-mix(in srgb, ${bound} ${Math.round(alpha * 10000) / 100}%, transparent)`;
  return bound;
}
export function findElementVariableBinding(element: any, library: VariableLibrary, property: string) {
  const explicit = element?.theme?.bindings?.find(binding => binding.target === "style" && binding.property === property);
  if (explicit) return explicit;
  const style = element?.styles?.[property];
  if (typeof style !== "string" || !style.includes("var(--")) return undefined;
  const normalized = style.trim().replace(/\s+/g, " ");
  const index = libraryIndex(library);
  let expressions = index.expressionsByProperty.get(property);
  if (!expressions) {
    expressions = new Map();
    for (const token of library.tokens) {
      if (!canBindVariable(token, property)) continue;
      expressions.set(variableExpression(token, property).trim().replace(/\s+/g, " "), { tokenId: token.id });
    }
    index.expressionsByProperty.set(property, expressions);
  }
  const direct = expressions.get(normalized);
  if (direct) return { target: "style", property, tokenId: direct.tokenId, inferred: true };
  if (variableTypeForProperty(property) !== "color") return undefined;
  for (const [expression, binding] of expressions) {
    const prefix = `color-mix(in srgb, ${expression} `;
    const suffix = "%, transparent)";
    if (!normalized.startsWith(prefix) || !normalized.endsWith(suffix)) continue;
    const percent = Number(normalized.slice(prefix.length, -suffix.length));
    if (Number.isFinite(percent) && percent >= 0 && percent <= 100) return { target: "style", property, tokenId: binding.tokenId, alpha: percent / 100, inferred: true };
  }
  return undefined;
}
export function literalForProperty(value: any, token: VariableToken, property: string, alpha = 1) {
  if (token.type === "number") return token.sourceNumber || UNITLESS_PROPERTIES.has(property) ? value : `${value}px`;
  const literal = token.bindingTemplate ? token.bindingTemplate.replace(/var\(--[^)]+\)/, String(value)).replace(/\$variable/g, String(value)) : value;
  return token.type === "color" && alpha !== 1 ? `color-mix(in srgb, ${literal} ${alpha * 100}%, transparent)` : literal;
}

/** Validate edits strictly, while retaining legacy fields that the library reader understands. */
export function validateVariableLibrary(input: any): VariableLibrary {
  const library = validateThemeLibrary(input) as VariableLibrary;
  const cssNames = new Set<string>();
  for (const collection of library.collections) {
    const modes = new Set<string>();
    for (const mode of collection.modes) {
      if (!mode.id || modes.has(mode.id)) throw variableError("VARIABLE_MODE_INVALID", "Mode IDs must be unique within their collection.");
      modes.add(mode.id);
    }
  }
  const tokens = new Map(library.tokens.map(token => [token.id, token]));
  for (const token of library.tokens) {
    if (!["color", "number", "string", "boolean"].includes(token.type)) throw variableError("VARIABLE_TYPE", `Unsupported variable type: ${token.type}`);
    if (token.cssName) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(token.cssName) || cssNames.has(token.cssName)) throw variableError("VARIABLE_CSS_NAME", `Duplicate or invalid CSS name: ${token.cssName}`);
      cssNames.add(token.cssName);
    }
    const collection = library.collections.find(item => item.id === token.collectionId)!;
    for (const mode of collection.modes) {
      const value = token.valuesByMode?.[mode.id];
      if (!value) throw variableError("VARIABLE_VALUE_MISSING", `${token.name || token.id}: missing ${mode.name || mode.id}`);
      if (value.kind === "alias") {
        const target = tokens.get(value.tokenId!);
        if (!target || target.type !== token.type) throw variableError("VARIABLE_ALIAS_INVALID", "Aliases must reference an existing variable of the same type.");
      } else if (value.kind === "literal") {
        if (token.type === "number" && (token.sourceNumber ? typeof value.value !== "string" || !/^[^;{}<>]+$/.test(value.value.trim()) : typeof value.value !== "number" || !Number.isFinite(value.value))) throw variableError("VARIABLE_VALUE_INVALID", "Enter a finite number or CSS dimension.");
        if (token.type === "boolean" && typeof value.value !== "boolean") throw variableError("VARIABLE_VALUE_INVALID", "Enter a boolean value.");
        if (["color", "string"].includes(token.type) && typeof value.value !== "string") throw variableError("VARIABLE_VALUE_INVALID", "Enter a text value.");
        if (token.type === "color" && (!value.value.trim() || /[;{}<>]/.test(value.value))) throw variableError("VARIABLE_VALUE_INVALID", "Enter a valid CSS color.");
      } else throw variableError("VARIABLE_VALUE_INVALID", "Expected a value or variable alias.");
    }
  }
  // Only follow mode combinations that can coexist at a consumer.
  // Opposite-mode aliases in one collection need not form a real cycle.
  const visited = new Set<string>();
  const active = new Set<string>();
  const visit = (id: string, selected: CollectionModes = {}) => {
    if (active.has(id)) throw variableError("VARIABLE_ALIAS_CYCLE", "Variable aliases cannot form a cycle.");
    const key = `${id}:${JSON.stringify(Object.entries(selected).sort())}`;
    if (visited.has(key)) return;
    active.add(id);
    const token = tokens.get(id)!;
    const modes = selected[token.collectionId] ? [selected[token.collectionId]] : library.collections.find(collection => collection.id === token.collectionId)!.modes.map(mode => mode.id);
    for (const mode of modes) {
      const value = token.valuesByMode[mode];
      if (value.kind === "alias") visit(value.tokenId!, { ...selected, [token.collectionId]: mode });
    }
    active.delete(id); visited.add(key);
  };
  library.tokens.forEach(token => visit(token.id));
  return library;
}

/** Resolve independently for each collection, retaining the source for inspector explanations. */
export function resolveCollectionModes(store: any, elementId: string | null, library: VariableLibrary, pageModes: CollectionModes = store?.variableModes || {}) {
  const modes: CollectionModes = {};
  const sources: Record<string, string | null> = {};
  for (const collection of library.collections) {
    let id = elementId;
    const seen = new Set<string>();
    while (id && id !== "ROOT" && !seen.has(id)) {
      seen.add(id);
      const candidate = store.byId.get(id)?.theme?.localCollectionModes?.[collection.id];
      if (collection.modes.some(mode => mode.id === candidate)) { modes[collection.id] = candidate; sources[collection.id] = id; break; }
      id = store.parentByChild.get(id);
    }
    if (!modes[collection.id]) {
      const candidate = pageModes[collection.id];
      modes[collection.id] = collection.modes.some(mode => mode.id === candidate) ? candidate : collection.defaultModeId;
      sources[collection.id] = candidate === modes[collection.id] ? "PAGE" : null;
    }
  }
  return { modes, sources };
}

export function resolveVariableValues(library: VariableLibrary, modes: CollectionModes) {
  const tokens = new Map(library.tokens.map(token => [token.id, token]));
  const values: Record<string, any> = {};
  const visiting = new Set<string>();
  const diagnostics: { tokenId: string; message: string }[] = [];
  const resolve = (id: string): any => {
    if (Object.prototype.hasOwnProperty.call(values, id)) return values[id];
    if (visiting.has(id)) throw variableError("VARIABLE_ALIAS_CYCLE", `Circular alias: ${id}`);
    const token = tokens.get(id);
    if (!token) throw variableError("VARIABLE_MISSING", `Missing variable: ${id}`);
    const collection = library.collections.find(item => item.id === token.collectionId);
    const value = token.valuesByMode?.[modes[token.collectionId] || collection?.defaultModeId || ""];
    if (!value) throw variableError("VARIABLE_VALUE_MISSING", `Missing mode value: ${token.name || id}`);
    visiting.add(id);
    try {
      const result = value.kind === "alias" ? resolve(value.tokenId!) : value.kind === "literal" ? value.value : undefined;
      if (result === undefined) throw variableError("VARIABLE_VALUE_INVALID", `Unresolved value: ${token.name || id}`);
      values[id] = result; return result;
    } finally { visiting.delete(id); }
  };
  library.tokens.forEach(token => { try { resolve(token.id); } catch (error) { diagnostics.push({ tokenId: token.id, message: error.message }); } });
  return { values, diagnostics };
}

export function variableDeclarations(library: VariableLibrary, values: Record<string, any>) {
  const styles: Record<string, string> = {};
  for (const token of library.tokens) {
    const value = values[token.id];
    if (!token.cssName || value === undefined || !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(token.cssName)) continue;
    if (typeof value === "string" && /[;{}<>]/.test(value)) continue;
    styles[`--${token.cssName}`] = String(value);
  }
  return styles;
}

export function setElementVariableMode(element: any, library: VariableLibrary, collectionId: string, modeId: string | null) {
  const collection = library.collections.find(item => item.id === collectionId);
  if (!collection || (modeId !== null && !collection.modes.some(mode => mode.id === modeId))) throw variableError("VARIABLE_MODE_INVALID", "This mode is no longer available.");
  const localCollectionModes = { ...element.theme?.localCollectionModes };
  if (modeId === null) delete localCollectionModes[collectionId]; else localCollectionModes[collectionId] = modeId;
  return { ...element, theme: { ...element.theme, version: 1, localCollectionModes } };
}
export function bindElementVariable(element: any, library: VariableLibrary, property: string, tokenId: string, alpha = 1) {
  const token = library.tokens.find(item => item.id === tokenId);
  if (!token || !canBindVariable(token, property)) throw variableError("VARIABLE_BINDING_TYPE", "This variable cannot be applied to this property.");
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) throw variableError("VARIABLE_ALPHA", "Opacity must be between 0 and 100%.");
  const bindings = (element.theme?.bindings || []).filter(binding => binding.target !== "style" || binding.property !== property);
  bindings.push({ target: "style", property, tokenId, ...(alpha !== 1 ? { alpha } : {}) });
  return { ...element, theme: { ...element.theme, version: 1, bindings }, styles: { ...element.styles, [property]: variableExpression(token, property, alpha) } };
}
export function detachElementVariable(element: any, library: VariableLibrary, property: string, values: Record<string, any>) {
  const binding = findElementVariableBinding(element, library, property);
  if (!binding) return element;
  const token = library.tokens.find(item => item.id === binding?.tokenId);
  if (!binding || !token || values[token.id] === undefined) throw variableError("VARIABLE_UNRESOLVED", "Resolve this variable before detaching it.");
  const bindings = (element.theme?.bindings || []).filter(item => item.target !== "style" || item.property !== property);
  return { ...element, theme: element.theme ? { ...element.theme, bindings } : element.theme, styles: { ...element.styles, [property]: literalForProperty(values[token.id], token, property, binding.alpha) } };
}

/** Render-only copy; persisted designs retain variable references, never resolved colors. */
export function prepareVariableStore(store: any, library: VariableLibrary, pageModes: CollectionModes = store.variableModes || {}) {
  if (!library.tokens.length) return store;
  const byId = new Map(store.byId);
  const cache = new Map<string, ReturnType<typeof resolveVariableValues>>();
  for (const [id, element] of store.byId) {
    const { modes } = resolveCollectionModes(store, id, library, pageModes);
    const signature = JSON.stringify(modes);
    if (!cache.has(signature)) cache.set(signature, resolveVariableValues(library, modes));
    const resolved = cache.get(signature)!;
    // Declaring at consumer nodes also covers components that forward style into portals.
    const declarations = variableDeclarations(library, resolved.values);
    const styles = { ...element.styles, ...declarations };
    for (const binding of element.theme?.bindings || []) {
      const token = library.tokens.find(item => item.id === binding.tokenId);
      if (binding.target === "style" && token && canBindVariable(token, binding.property)) styles[binding.property] = variableExpression(token, binding.property, binding.alpha);
    }
    byId.set(id, { ...element, styles });
  }
  return { ...store, byId };
}
