const THEME_ID_RE = /^[a-z0-9][a-z0-9_-]*$/;
const RESERVED_THEME_IDS = new Set(["system"]);

class ThemeValidationError extends Error {
  code;
  details;

  constructor(code, message, details = {}) {
    super(message);
    this.name = "ThemeValidationError";
    this.code = code;
    this.details = details;
  }
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function assertPlainObject(value, field) {
  if (!isPlainObject(value)) throw new ThemeValidationError("THEME_CONFIG_INVALID", `${field} must be an object.`, { field });
  return value;
}

function assertThemeId(value, field = "themeId") {
  if (typeof value !== "string" || !THEME_ID_RE.test(value) || RESERVED_THEME_IDS.has(value)) {
    throw new ThemeValidationError("THEME_ID_INVALID", `${field} must be a stable lowercase ID and cannot be "system".`, { field, value });
  }
  return value;
}

function normalizeCollectionModes(value, field) {
  assertPlainObject(value, field);
  const result = {};
  for (const [collectionId, modeId] of Object.entries(value)) {
    if (!collectionId.trim() || typeof modeId !== "string" || !modeId.trim()) {
      throw new ThemeValidationError("THEME_CONFIG_INVALID", `${field} must map non-empty collection IDs to mode IDs.`, { field });
    }
    result[collectionId] = modeId;
  }
  return result;
}

function validateThemeManifest(input) {
  const value = assertPlainObject(input, "prototypeTheme");
  if (value.version !== 1) throw new ThemeValidationError("THEME_VERSION_UNSUPPORTED", `Unsupported theme manifest version: ${String(value.version)}`, { version: value.version });
  if (!Array.isArray(value.themes) || value.themes.length === 0) {
    throw new ThemeValidationError("THEME_CONFIG_INVALID", "prototypeTheme.themes must contain at least one theme.", { field: "themes" });
  }
  const seen = new Set();
  const themes = value.themes.map((theme, index) => {
    assertPlainObject(theme, `themes[${index}]`);
    const id = assertThemeId(theme.id, `themes[${index}].id`);
    if (seen.has(id)) throw new ThemeValidationError("THEME_ID_DUPLICATE", `Duplicate theme ID: ${id}`, { themeId: id });
    seen.add(id);
    if (typeof theme.label !== "string" || !theme.label.trim()) throw new ThemeValidationError("THEME_CONFIG_INVALID", `themes[${index}].label must be non-empty.`, { field: `themes[${index}].label` });
    if (theme.colorScheme !== "light" && theme.colorScheme !== "dark") throw new ThemeValidationError("THEME_CONFIG_INVALID", `themes[${index}].colorScheme must be light or dark.`, { field: `themes[${index}].colorScheme` });
    return {
      id,
      label: theme.label.trim(),
      colorScheme: theme.colorScheme,
      collectionModes: normalizeCollectionModes(theme.collectionModes ?? {}, `themes[${index}].collectionModes`),
      ...(theme.extendsThemeId == null ? {} : { extendsThemeId: assertThemeId(theme.extendsThemeId, `themes[${index}].extendsThemeId`) })
    };
  });
  const defaultThemeId = assertThemeId(value.defaultThemeId, "defaultThemeId");
  if (!seen.has(defaultThemeId)) throw new ThemeValidationError("THEME_ID_UNKNOWN", `Default theme does not exist: ${defaultThemeId}`, { themeId: defaultThemeId });
  for (const theme of themes) if (theme.extendsThemeId && !seen.has(theme.extendsThemeId)) {
    throw new ThemeValidationError("THEME_ID_UNKNOWN", `Theme ${theme.id} extends missing theme ${theme.extendsThemeId}.`, { themeId: theme.id, extendsThemeId: theme.extendsThemeId });
  }
  for (const theme of themes) {
    const visiting = new Set();
    let current = theme;
    while (current?.extendsThemeId) {
      if (visiting.has(current.id)) throw new ThemeValidationError("THEME_INHERITANCE_CYCLE", `Theme inheritance contains a cycle at ${current.id}.`, { themeId: current.id });
      visiting.add(current.id);
      current = themes.find(candidate => candidate.id === current.extendsThemeId);
    }
  }
  let systemMapping;
  if (value.systemMapping != null) {
    const mapping = assertPlainObject(value.systemMapping, "systemMapping");
    systemMapping = {
      light: assertThemeId(mapping.light, "systemMapping.light"),
      dark: assertThemeId(mapping.dark, "systemMapping.dark")
    };
    for (const id of Object.values(systemMapping)) if (!seen.has(id)) throw new ThemeValidationError("THEME_ID_UNKNOWN", `System mapping refers to missing theme ${id}.`, { themeId: id });
  }
  const source = assertPlainObject(value.source, "source");
  if (source.kind !== "css" && source.kind !== "tokens") throw new ThemeValidationError("THEME_CONFIG_INVALID", "source.kind must be css or tokens.", { field: "source.kind" });
  const normalizedSource = source.kind === "css" ? {
    kind: "css",
    entryFiles: Array.isArray(source.entryFiles) ? source.entryFiles.filter(item => typeof item === "string" && item.trim()).map(item => item.trim()) : []
  } : {
    kind: "tokens",
    file: typeof source.file === "string" ? source.file.trim() : ""
  };
  if (source.kind === "tokens" && !normalizedSource.file) throw new ThemeValidationError("THEME_CONFIG_INVALID", "Token theme source requires a file.", { field: "source.file" });
  const adapter = assertPlainObject(value.adapter ?? { kind: "scoped-css" }, "adapter");
  if (adapter.kind !== "scoped-css" && adapter.kind !== "project-adapter") throw new ThemeValidationError("THEME_CONFIG_INVALID", "adapter.kind must be scoped-css or project-adapter.", { field: "adapter.kind" });
  if (adapter.kind === "project-adapter" && (typeof adapter.module !== "string" || !adapter.module.trim())) throw new ThemeValidationError("THEME_CONFIG_INVALID", "Project adapter requires a module path.", { field: "adapter.module" });
  return {
    version: 1,
    source: normalizedSource,
    defaultThemeId,
    themes,
    ...(systemMapping ? { systemMapping } : {}),
    adapter: adapter.kind === "scoped-css" ? { kind: "scoped-css" } : { kind: "project-adapter", module: adapter.module.trim() }
  };
}

function themeById(manifest, themeId) {
  return manifest.themes.find(theme => theme.id === themeId) ?? null;
}

function normalizeThemeSelection(selection) {
  if (selection?.kind === "system") return { kind: "system" };
  if (selection?.kind === "theme" && typeof selection.themeId === "string") return { kind: "theme", themeId: selection.themeId };
  if (typeof selection === "string") return selection === "system" ? { kind: "system" } : { kind: "theme", themeId: selection };
  return null;
}

function isValidSelection(manifest, selection) {
  const normalized = normalizeThemeSelection(selection);
  if (!normalized) return false;
  if (normalized.kind === "system") return !!manifest.systemMapping;
  return !!themeById(manifest, normalized.themeId);
}

function resolveThemeSelection(manifestInput, options: any = {}) {
  const manifest = validateThemeManifest(manifestInput);
  if (options.urlSelection != null) {
    const urlSelection = normalizeThemeSelection(options.urlSelection);
    if (!urlSelection || !isValidSelection(manifest, urlSelection)) {
      const selection = { kind: "theme", themeId: manifest.defaultThemeId };
      return { selection, resolvedThemeId: manifest.defaultThemeId, theme: themeById(manifest, manifest.defaultThemeId), invalidUrlSelection: true };
    }
  }
  const candidates = [options.urlSelection, options.inheritedSelection, options.rememberedSelection];
  let selection = candidates.map(normalizeThemeSelection).find(candidate => candidate && isValidSelection(manifest, candidate));
  if (!selection) selection = { kind: "theme", themeId: manifest.defaultThemeId };
  const resolvedThemeId = selection.kind === "system" ? manifest.systemMapping[options.prefersDark ? "dark" : "light"] : selection.themeId;
  return { selection, resolvedThemeId, theme: themeById(manifest, resolvedThemeId) };
}

function validateThemeLibrary(input) {
  const value = assertPlainObject(input, "themeLibrary");
  if (value.version !== 1) throw new ThemeValidationError("THEME_VERSION_UNSUPPORTED", `Unsupported theme library version: ${String(value.version)}`);
  const collections = Array.isArray(value.collections) ? value.collections : [];
  const tokens = Array.isArray(value.tokens) ? value.tokens : [];
  const collectionIds = new Set();
  for (const collection of collections) {
    assertPlainObject(collection, "collection");
    if (typeof collection.id !== "string" || !collection.id || collectionIds.has(collection.id)) throw new ThemeValidationError("THEME_CONFIG_INVALID", `Invalid or duplicate collection ID: ${String(collection.id)}`);
    collectionIds.add(collection.id);
    const modeIds = new Set((collection.modes ?? []).map(mode => mode?.id));
    if (!modeIds.has(collection.defaultModeId)) throw new ThemeValidationError("THEME_CONFIG_INVALID", `Collection ${collection.id} has an invalid default mode.`);
  }
  const tokenIds = new Set();
  for (const token of tokens) {
    assertPlainObject(token, "token");
    if (typeof token.id !== "string" || !token.id || tokenIds.has(token.id)) throw new ThemeValidationError("THEME_CONFIG_INVALID", `Invalid or duplicate token ID: ${String(token.id)}`);
    if (!collectionIds.has(token.collectionId)) throw new ThemeValidationError("THEME_CONFIG_INVALID", `Token ${token.id} refers to missing collection ${token.collectionId}.`);
    tokenIds.add(token.id);
  }
  for (const tokenId of Array.isArray(value.requiredTokenIds) ? value.requiredTokenIds : []) {
    if (!tokenIds.has(tokenId)) throw new ThemeValidationError("THEME_TOKEN_UNKNOWN", `Required token does not exist: ${tokenId}`, { tokenId });
  }
  return value;
}

function resolveThemeTokens(manifestInput, libraryInput, themeId, localCollectionModes = {}) {
  const manifest = validateThemeManifest(manifestInput);
  const library = validateThemeLibrary(libraryInput);
  if (!themeById(manifest, themeId)) throw new ThemeValidationError("THEME_ID_UNKNOWN", `Theme does not exist: ${themeId}`, { themeId });
  const collections = new Map<string, any>(library.collections.map(collection => [collection.id, collection]));
  const tokens = new Map<string, any>(library.tokens.map(token => [token.id, token]));
  const cache = new Map();
  const visiting = new Set();
  const modeFor = (collectionId, activeThemeId) => {
    if (localCollectionModes[collectionId]) return localCollectionModes[collectionId];
    const activeTheme = themeById(manifest, activeThemeId);
    if (activeTheme?.collectionModes?.[collectionId]) return activeTheme.collectionModes[collectionId];
    return collections.get(collectionId)?.defaultModeId;
  };
  const readToken = (tokenId, activeThemeId = themeId) => {
    const cacheKey = `${activeThemeId}:${tokenId}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    if (visiting.has(cacheKey)) throw new ThemeValidationError("THEME_ALIAS_CYCLE", `Token alias contains a cycle at ${tokenId}.`, { tokenId, themeId: activeThemeId });
    const token = tokens.get(tokenId);
    if (!token) throw new ThemeValidationError("THEME_TOKEN_UNKNOWN", `Token does not exist: ${tokenId}`, { tokenId });
    visiting.add(cacheKey);
    const modeId = modeFor(token.collectionId, activeThemeId);
    let raw = token.valuesByMode?.[modeId];
    const activeTheme = themeById(manifest, activeThemeId);
    if (raw == null && activeTheme?.extendsThemeId) raw = { kind: "inherit-theme", themeId: activeTheme.extendsThemeId };
    let value;
    if (raw?.kind === "inherit-theme") value = readToken(tokenId, raw.themeId);
    else if (raw?.kind === "alias") value = readToken(raw.tokenId, activeThemeId);
    else if (raw?.kind === "literal") value = raw.value;
    else throw new ThemeValidationError("THEME_INCOMPLETE", `Token ${tokenId} has no value for mode ${String(modeId)}.`, { tokenId, modeId, themeId: activeThemeId });
    visiting.delete(cacheKey);
    cache.set(cacheKey, value);
    return value;
  };
  const values = {};
  const diagnostics = [];
  for (const token of library.tokens) {
    try { values[token.id] = readToken(token.id); }
    catch (error) { diagnostics.push({ code: error.code ?? "THEME_RESOLVE_FAILED", tokenId: token.id, message: error.message }); }
  }
  const required = new Set(Array.isArray(library.requiredTokenIds) ? library.requiredTokenIds : []);
  const ready = diagnostics.every(diagnostic => !required.has(diagnostic.tokenId));
  return { themeId, values, diagnostics, ready };
}

function cssEscape(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, character => `\\${character.codePointAt(0).toString(16)} `);
}

function cssValue(value) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && !/[;{}]/.test(value)) return value;
  if (typeof value === "boolean") return value ? "1" : "0";
  throw new ThemeValidationError("THEME_TYPE_MISMATCH", `Value cannot be emitted as CSS: ${String(value)}`);
}

function emitScopedThemeCss(manifestInput, libraryInput, options: any = {}) {
  const manifest = validateThemeManifest(manifestInput);
  const library = validateThemeLibrary(libraryInput);
  const rootSelector = options.rootSelector ?? "[data-prototype-root]";
  const blocks = [];
  for (const theme of manifest.themes) {
    const resolved = resolveThemeTokens(manifest, library, theme.id);
    if (!resolved.ready && options.includeIncomplete !== true) continue;
    const declarations = [`color-scheme: ${theme.colorScheme};`];
    for (const token of library.tokens) {
      if (!token.cssName || !(token.id in resolved.values)) continue;
      declarations.push(`--${cssEscape(token.cssName)}: ${cssValue(resolved.values[token.id])};`);
    }
    blocks.push(`${rootSelector}[data-theme="${cssEscape(theme.id)}"] {\n  ${declarations.join("\n  ")}\n}`);
  }
  return blocks.join("\n");
}

function selectorThemeId(selector) {
  const dataMatch = selector.match(/\[data-theme\s*=\s*["']([^"']+)["']\]/i);
  if (dataMatch) return dataMatch[1].trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const classMatch = selector.match(/(?:^|[\s>+~])\.(light|dark)(?=$|[\s>+~.:#[])/i);
  if (classMatch) return classMatch[1].toLowerCase();
  if (/(?:^|[\s>,]):root(?:$|[\s,.:#[])/.test(selector) || /(?:^|[\s>,])html(?:$|[\s>,.:#[])/.test(selector)) return "default";
  return null;
}

function scanCssThemeModes(css, source = "unknown.css") {
  const modes = {};
  const sources = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let rule;
  while ((rule = ruleRe.exec(css))) {
    if (rule[1].trim().startsWith("@")) continue;
    const declarations = {};
    for (const match of rule[2].matchAll(/--([\w-]+)\s*:\s*([^;{}]+)\s*;?/g)) declarations[match[1]] = match[2].trim();
    if (Object.keys(declarations).length === 0) continue;
    for (const selector of rule[1].split(",")) {
      const themeId = selectorThemeId(selector.trim());
      if (!themeId) continue;
      modes[themeId] = { ...(modes[themeId] ?? {}), ...declarations };
      sources.push({ source, selector: selector.trim(), themeId, variables: Object.keys(declarations) });
    }
  }
  return { modes, sources };
}

function themeRevision(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `theme-v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export {
  ThemeValidationError,
  emitScopedThemeCss,
  isValidSelection,
  normalizeThemeSelection,
  resolveThemeSelection,
  resolveThemeTokens,
  scanCssThemeModes,
  themeRevision,
  validateThemeLibrary,
  validateThemeManifest
};
