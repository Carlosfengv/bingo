import { validateThemeLibrary } from "./theme";
import { cssVariablesAffectOnlyPaint, type VariableStyleUsage } from "./variableGeometry";

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

function resolveVariableValuesUncached(library: VariableLibrary, modes: CollectionModes) {
  const index = libraryIndex(library);
  const values: Record<string, any> = {};
  const visiting = new Set<string>();
  const diagnostics: { tokenId: string; message: string }[] = [];
  const resolve = (id: string): any => {
    if (Object.prototype.hasOwnProperty.call(values, id)) return values[id];
    if (visiting.has(id)) throw variableError("VARIABLE_ALIAS_CYCLE", `Circular alias: ${id}`);
    const token = index.tokenById.get(id);
    if (!token) throw variableError("VARIABLE_MISSING", `Missing variable: ${id}`);
    const collection = index.collectionById.get(token.collectionId);
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

export function resolveVariableValues(library: VariableLibrary, modes: CollectionModes) {
  const index = libraryIndex(library);
  const signature = variableModesSignature(library, modes);
  return index.resolvedByModes.get(signature) || cacheSet(index.resolvedByModes, signature, resolveVariableValuesUncached(library, modes));
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

export function variableDeclarationsForModes(library: VariableLibrary, modes: CollectionModes, usedCssNames?: ReadonlySet<string>) {
  const index = libraryIndex(library);
  const signature = variableModesSignature(library, modes) + (usedCssNames ? `:used:${JSON.stringify([...usedCssNames].sort())}` : ":all");
  const cached = index.declarationsByModes.get(signature);
  if (cached) return cached;
  const declarations = variableDeclarations(library, resolveVariableValues(library, modes).values);
  if (usedCssNames) for (const property of Object.keys(declarations)) if (!usedCssNames.has(property.slice(2))) delete declarations[property];
  return cacheSet(index.declarationsByModes, signature, declarations);
}

function onlyLocalModesChanged(before: any, after: any) {
  if (!before || !after) return false;
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (key === "theme") continue;
    if (before[key] !== after[key]) return false;
  }
  const beforeTheme = before.theme || {};
  const afterTheme = after.theme || {};
  for (const key of new Set([...Object.keys(beforeTheme), ...Object.keys(afterTheme)])) {
    if (key === "localCollectionModes" || key === "version") continue;
    if (beforeTheme[key] !== afterTheme[key]) return false;
  }
  return JSON.stringify(beforeTheme.localCollectionModes || {}) !== JSON.stringify(afterTheme.localCollectionModes || {});
}

/** Independent canvas roots affected by a mode-only edit; other edits are unknown. */
export function variableModeChangedRootIds(before: any, after: any, beforePageModes: CollectionModes, afterPageModes: CollectionModes): Set<string> | undefined {
  if (!before || before.childrenByParent !== after.childrenByParent || before.parentByChild !== after.parentByChild || before.byId.size !== after.byId.size) return;
  const roots = new Set<string>();
  if (!sameCollectionModes(beforePageModes, afterPageModes)) {
    for (const [id, parent] of after.parentByChild) if (parent === "ROOT") roots.add(id);
  }
  for (const [id, element] of after.byId) {
    if (before.byId.get(id) === element) continue;
    if (!onlyLocalModesChanged(before.byId.get(id), element)) return;
    let root = id;
    const visited = new Set<string>();
    while (after.parentByChild.get(root) !== "ROOT") {
      if (visited.has(root)) return;
      visited.add(root);
      root = after.parentByChild.get(root);
      if (!root) return;
    }
    roots.add(root);
  }
  return roots;
}

/** True only when skipping a full geometry refresh is demonstrably safe. */
export function isPaintOnlyVariableModeChange(before: any, after: any, library: VariableLibrary, beforePageModes: CollectionModes = before?.variableModes || {}, afterPageModes: CollectionModes = after?.variableModes || {}, readStyleUsage?: () => VariableStyleUsage) {
  if (!before || !after || before === after || before.childrenByParent !== after.childrenByParent || before.parentByChild !== after.parentByChild || before.byId.size !== after.byId.size) return false;
  const modePairs: Array<[CollectionModes, CollectionModes]> = [];
  const pageChanged = JSON.stringify(beforePageModes) !== JSON.stringify(afterPageModes);
  if (pageChanged) {
    for (const [id] of after.byId) if (after.parentByChild.get(id) === "ROOT") {
      modePairs.push([
        resolveCollectionModes(before, id, library, beforePageModes).modes,
        resolveCollectionModes(after, id, library, afterPageModes).modes,
      ]);
    }
  }
  for (const [id, element] of after.byId) {
    const previous = before.byId.get(id);
    if (previous === element) continue;
    if (!onlyLocalModesChanged(previous, element)) return false;
    modePairs.push([
      resolveCollectionModes(before, id, library, beforePageModes).modes,
      resolveCollectionModes(after, id, library, afterPageModes).modes,
    ]);
  }
  if (!modePairs.length) return false;
  // Nested overrides can combine collections differently from their root,
  // including cross-collection aliases. Prove safety in every such scope.
  for (const [id, element] of after.byId) if (Object.keys(element.theme?.localCollectionModes || {}).length) {
    modePairs.push([resolveCollectionModes(before, id, library, beforePageModes).modes,
      resolveCollectionModes(after, id, library, afterPageModes).modes]);
  }
  const changedTokens = new Set<string>();
  for (const [beforeModes, afterModes] of modePairs) {
    const beforeResolved = resolveVariableValues(library, beforeModes);
    const afterResolved = resolveVariableValues(library, afterModes);
    if (beforeResolved.diagnostics.length || afterResolved.diagnostics.length) return false;
    for (const token of library.tokens) if (!Object.is(beforeResolved.values[token.id], afterResolved.values[token.id])) changedTokens.add(token.id);
  }
  if (!changedTokens.size) return true;
  const index = libraryIndex(library);
  const changedCssNames = new Set<string>();
  for (const id of changedTokens) {
    const token = index.tokenById.get(id);
    if (!token || token.type !== "color" || token.sourceRef && !readStyleUsage) return false;
    if (token.cssName) changedCssNames.add(token.cssName);
  }
  const declarations: VariableStyleUsage["declarations"] = [];
  const seenDeclarations = new Set<string>();
  const addDeclaration = (property: string, value: string) => {
    const key = `${property}\0${value}`;
    if (!seenDeclarations.has(key)) { seenDeclarations.add(key); declarations.push({ property, value }); }
  };
  for (const element of after.byId.values()) {
    if (["component", "capture", "webview"].includes(element.type) || element.props?.["data-component"] === "CapturedPage"
      || !readStyleUsage && typeof element.props?.className === "string" && element.props.className.trim()) return false;
    for (const styles of [element.styles, element.props?.style]) {
      for (const [property, value] of Object.entries(styles || {})) {
        if (typeof value === "string" && (/var\(/i.test(value) || value.includes("\\") && value.includes("--"))) addDeclaration(property, value);
      }
    }
    for (const [property, value] of Object.entries(element.props || {})) {
      if (typeof value === "string" && (/var\(/i.test(value) || value.includes("\\") && value.includes("--"))) addDeclaration(property, value);
    }
    for (const binding of element.theme?.bindings || []) {
      const token = index.tokenById.get(binding.tokenId);
      if (binding.target === "style" && token && canBindVariable(token, binding.property)) {
        addDeclaration(binding.property, variableExpression(token, binding.property, binding.alpha));
      }
    }
  }
  for (const token of library.tokens) for (const value of Object.values(token.valuesByMode)) {
    if (token.cssName && typeof value.value === "string" && (/var\(/i.test(value.value) || value.value.includes("\\") && value.value.includes("--"))) addDeclaration(`--${token.cssName}`, value.value);
  }
  const usage = readStyleUsage?.() ?? { complete: true, declarations: [], conditions: [] };
  return cssVariablesAffectOnlyPaint(changedCssNames, { ...usage, declarations: [...usage.declarations, ...declarations] });
}

export function setElementVariableMode(element: any, library: VariableLibrary, collectionId: string, modeId: string | null) {
  const collection = library.collections.find(item => item.id === collectionId);
  if (!collection || (modeId !== null && !collection.modes.some(mode => mode.id === modeId))) throw variableError("VARIABLE_MODE_INVALID", "This mode is no longer available.");
  const previous = element.theme?.localCollectionModes;
  if (modeId === null ? !Object.hasOwn(previous || {}, collectionId) : previous?.[collectionId] === modeId) return element;
  const localCollectionModes = { ...element.theme?.localCollectionModes };
  if (modeId === null) delete localCollectionModes[collectionId]; else localCollectionModes[collectionId] = modeId;
  return { ...element, theme: { ...element.theme, version: 1, localCollectionModes } };
}

export function sameCollectionModes(before: CollectionModes, after: CollectionModes) {
  if (before === after) return true;
  const keys = Object.keys(before);
  return keys.length === Object.keys(after).length && keys.every(key => Object.hasOwn(after, key) && before[key] === after[key]);
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
const noDeclarations = {};
export function prepareVariableStore(store: any, library: VariableLibrary, pageModes: CollectionModes = store.variableModes || {}, additionalScopeRoots?: ReadonlySet<string>, usedCssNames?: ReadonlySet<string>) {
  if (!library.tokens.length) return store;
  const byId = new Map(store.byId);
  const index = libraryIndex(library);
  for (const [id, element] of store.byId) {
    const localModes = element.theme?.localCollectionModes;
    const isRoot = store.parentByChild.get(id) === "ROOT";
    const isComponentBridge = element.type === "component" || element.props?.["data-component"] === "CapturedPage";
    const hasOwnLibraryDeclaration = Object.keys(element.styles || {}).some(property => property.startsWith("--") && index.cssNames.has(property.slice(2)));
    const isScopeBoundary = isRoot || additionalScopeRoots?.has(id) || !!localModes && Object.keys(localModes).length > 0 || isComponentBridge || hasOwnLibraryDeclaration;
    let declarations = noDeclarations;
    if (isScopeBoundary) {
      const { modes } = resolveCollectionModes(store, id, library, pageModes);
      declarations = variableDeclarationsForModes(library, modes, usedCssNames);
    }
    let variants = index.preparedElements.get(element);
    const cached = variants?.get(declarations);
    if (cached) { if (cached !== element) byId.set(id, cached); continue; }
    let styles = isScopeBoundary ? { ...element.styles, ...declarations } : element.styles;
    for (const binding of element.theme?.bindings || []) {
      const token = index.tokenById.get(binding.tokenId);
      if (binding.target !== "style" || !token || !canBindVariable(token, binding.property)) continue;
      const expression = variableExpression(token, binding.property, binding.alpha);
      if (styles?.[binding.property] === expression) continue;
      if (styles === element.styles) styles = { ...styles };
      styles[binding.property] = expression;
    }
    const prepared = styles !== element.styles ? { ...element, styles } : element;
    if (!variants) index.preparedElements.set(element, variants = new WeakMap());
    variants.set(declarations, prepared);
    if (prepared !== element) byId.set(id, prepared);
  }
  return { ...store, byId };
}
