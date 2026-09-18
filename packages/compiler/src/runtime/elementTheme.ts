import { validateThemeLibrary } from "./theme";
import { variableExpression } from "./variables";

function bindingError(code, message) {
  return Object.assign(new Error(message), { code });
}

function validateElementThemeMetadata(input) {
  if (input == null) return undefined;
  if (typeof input !== "object" || Array.isArray(input) || input.version !== 1) throw bindingError("THEME_BINDING_INVALID", "Element theme metadata must use version 1.");
  const bindings = [];
  const seen = new Set();
  for (const binding of Array.isArray(input.bindings) ? input.bindings : []) {
    if (!binding || (binding.target !== "style" && binding.target !== "prop") || typeof binding.property !== "string" || !binding.property || typeof binding.tokenId !== "string" || !binding.tokenId) {
      throw bindingError("THEME_BINDING_INVALID", "Element theme binding is invalid.");
    }
    const key = `${binding.target}:${binding.property}`;
    if (seen.has(key)) throw bindingError("THEME_BINDING_DUPLICATE", `Duplicate element theme binding: ${key}`);
    seen.add(key);
    if (binding.alpha !== undefined && (typeof binding.alpha !== "number" || !Number.isFinite(binding.alpha) || binding.alpha < 0 || binding.alpha > 1)) throw bindingError("THEME_BINDING_INVALID", "Binding opacity must be between 0 and 1.");
    bindings.push({ target: binding.target, property: binding.property, tokenId: binding.tokenId, ...(binding.alpha !== undefined ? { alpha: binding.alpha } : {}) });
  }
  if (input.localCollectionModes != null && (typeof input.localCollectionModes !== "object" || Array.isArray(input.localCollectionModes))) throw bindingError("THEME_BINDING_INVALID", "Local collection modes must be a map.");
  const localCollectionModes = Object.create(null);
  for (const [collectionId, modeId] of Object.entries(input.localCollectionModes || {})) {
    if (!collectionId || typeof modeId !== "string" || !modeId) throw bindingError("THEME_BINDING_INVALID", "Local collection mode is invalid.");
    localCollectionModes[collectionId] = modeId;
  }
  return {
    version: 1,
    ...(bindings.length ? { bindings } : {}),
    ...(Object.keys(localCollectionModes).length ? { localCollectionModes } : {})
  };
}

function applyElementThemeBinding(element, bindingInput, libraryInput) {
  const library = validateThemeLibrary(libraryInput);
  const binding = validateElementThemeMetadata({ version: 1, bindings: [bindingInput] }).bindings[0];
  const token = library.tokens.find(item => item.id === binding.tokenId);
  if (!token) throw bindingError("THEME_TOKEN_UNKNOWN", `Theme token does not exist: ${binding.tokenId}`);
  const current = validateElementThemeMetadata(element.theme) || { version: 1 };
  const bindings = (current.bindings || []).filter(item => item.target !== binding.target || item.property !== binding.property);
  bindings.push(binding);
  const next = { ...element, theme: { ...current, bindings } };
  if (binding.target === "style") {
    if (!token.cssName) throw bindingError("THEME_BINDING_UNSUPPORTED", `Theme token has no CSS name: ${binding.tokenId}`);
    next.styles = { ...(element.styles || {}), [binding.property]: `var(--${token.cssName})` };
  }
  return next;
}

function validateElementThemeBindings(store, libraryInput) {
  const library = validateThemeLibrary(libraryInput);
  const tokens = new Map(library.tokens.map(token => [token.id, token]));
  const collections = new Map(library.collections.map(collection => [collection.id, collection]));
  const diagnostics = [];
  for (const [elementId, element] of store.byId || []) {
    let metadata;
    try { metadata = validateElementThemeMetadata(element.theme); }
    catch (error) {
      diagnostics.push({ code: error.code || "THEME_BINDING_INVALID", elementId, message: error.message });
      continue;
    }
    if (!metadata) continue;
    for (const binding of metadata.bindings || []) {
      const token = tokens.get(binding.tokenId);
      if (!token) {
        diagnostics.push({ code: "THEME_TOKEN_UNKNOWN", elementId, property: binding.property, tokenId: binding.tokenId, message: `Theme token does not exist: ${binding.tokenId}` });
        continue;
      }
      if (binding.target === "style" && element.styles?.[binding.property] !== `var(--${token.cssName})` && element.styles?.[binding.property] !== variableExpression(token, binding.property, binding.alpha)) {
        diagnostics.push({ code: "THEME_BINDING_VALUE_MISMATCH", elementId, property: binding.property, tokenId: binding.tokenId, message: `Style ${binding.property} no longer uses ${binding.tokenId}.` });
      }
    }
    for (const [collectionId, modeId] of Object.entries(metadata.localCollectionModes || {})) {
      const collection = collections.get(collectionId);
      if (!collection || !(collection.modes || []).some(mode => mode.id === modeId)) {
        diagnostics.push({ code: "THEME_LOCAL_MODE_UNKNOWN", elementId, collectionId, modeId, message: `Local mode does not exist: ${collectionId}/${modeId}` });
      }
    }
  }
  return diagnostics;
}

export { applyElementThemeBinding, validateElementThemeBindings, validateElementThemeMetadata };
