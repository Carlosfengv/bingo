import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";

const EXCLUDED_DIRECTORIES = new Set(["node_modules", ".git", ".next", ".nuxt", "dist", "build", "out", "coverage", ".cache", ".turbo"]);
const COLOR_NAME = /(?:^|-)(?:color|background|foreground|surface|text|border|accent|primary|secondary|muted|card|popover|ring|fill|stroke|brand|destructive)(?:-|$)/i;
const NUMBER_NAME = /(?:^|-)(?:radius|spacing|space|gap|size|width|height|padding|margin|opacity|weight|leading|tracking|z)(?:-|$)/i;
const COLOR_VALUE = /^(?:#[\da-f]{3,8}|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\(|transparent$|currentcolor$|black$|white$)/i;
const NUMBER_VALUE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:px|rem|em|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|deg|s|ms)?$/i;
const CHANNEL_VALUE = /^[+-]?(?:\d+\.?\d*|\.\d+)%?(?:\s+[+-]?(?:\d+\.?\d*|\.\d+)%?){2}(?:\s*\/\s*[+-]?(?:\d+\.?\d*|\.\d+)%?)?$/;

function stableId(prefix: string, value: string) {
  return `${prefix}-${crypto.createHash("sha1").update(value).digest("hex").slice(0, 14)}`;
}

function walkCssFiles(root: string) {
  const files: string[] = [];
  const pending = [root];
  while (pending.length && files.length < 1000) {
    const directory = pending.pop()!;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORIES.has(entry.name) && !entry.name.startsWith(".")) pending.push(path.join(directory, entry.name));
      } else if (entry.isFile() && /\.css$/i.test(entry.name) && !/\.min\.css$/i.test(entry.name)) files.push(path.join(directory, entry.name));
    }
  }
  return files.sort();
}

function safeConfiguredFiles(root: string, manifest?: any) {
  if (manifest?.source?.kind !== "css") return [];
  const canonical = fs.realpathSync(root);
  return (manifest.source.entryFiles || []).map((file: string) => path.resolve(canonical, file)).filter((file: string) => {
    const relative = path.relative(canonical, file);
    return relative && !relative.startsWith("..") && !path.isAbsolute(relative) && fs.existsSync(file);
  });
}

function localImports(file: string, css: string) {
  const files: string[] = [];
  for (const match of css.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)) {
    if (/^(?:https?:|data:|tailwindcss$)/i.test(match[1])) continue;
    const target = path.resolve(path.dirname(file), match[1]);
    for (const candidate of [target, `${target}.css`, path.join(target, "index.css")]) if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) { files.push(candidate); break; }
  }
  return files;
}

function orderedSourceFiles(root: string, manifest?: any) {
  const configured = safeConfiguredFiles(root, manifest);
  if (!configured.length) return walkCssFiles(root);
  const output: string[] = [];
  const seen = new Set<string>();
  const visit = (file: string) => {
    const resolved = fs.realpathSync(file);
    if (seen.has(resolved)) return;
    seen.add(resolved);
    const css = fs.readFileSync(resolved, "utf8");
    for (const imported of localImports(resolved, css)) visit(imported);
    output.push(resolved);
  };
  configured.forEach(visit);
  return output;
}

function selectorMode(selector: string) {
  const data = selector.match(/\[data-theme\s*=\s*["']?([^\]"']+)["']?\]/i);
  if (data) return { id: data[1].trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-"), name: data[1].trim() };
  const themeClass = selector.match(/(?:^|[\s>+~])\.theme-([a-z0-9_-]+)/i);
  if (themeClass) return { id: themeClass[1].toLowerCase(), name: themeClass[1] };
  const classMode = selector.match(/(?:^|[\s>+~])\.(light|dark)(?=$|[\s>+~.:#[])/i);
  if (classMode) return { id: classMode[1].toLowerCase(), name: classMode[1] };
  if (/(?:^|[\s>,]):root(?:$|[\s,.:#[])/.test(selector) || /(?:^|[\s>,])html(?:$|[\s>,.:#[])/.test(selector)) return { id: "default", name: "Default" };
  return null;
}

function declarationMode(decl: any) {
  for (let node = decl.parent; node; node = node.parent) {
    if (node.type === "atrule" && node.name === "media") {
      if (/prefers-color-scheme\s*:\s*dark/i.test(node.params)) return { id: "dark", name: "Dark" };
      if (/prefers-color-scheme\s*:\s*light/i.test(node.params)) return { id: "light", name: "Light" };
    }
    if (node.type === "atrule" && node.name === "theme") return { id: "default", name: "Default" };
    if (node.type === "rule") {
      for (const selector of node.selectors || String(node.selector || "").split(",")) {
        const mode = selectorMode(selector.trim());
        if (mode) return mode;
      }
    }
  }
  return null;
}

function modeTarget(decl: any, file: string) {
  const parent = decl.parent;
  if (parent?.type === "atrule" && parent.name === "theme") return { file, kind: "atrule", name: "theme", params: parent.params || "" };
  const rule = parent?.type === "rule" ? parent : parent?.parent?.type === "rule" ? parent.parent : null;
  return rule ? { file, kind: "rule", selector: rule.selector } : null;
}

function inferType(name: string, values: string[]) {
  const direct = values.filter(value => !/^var\(/.test(value.trim()));
  if (direct.some(value => COLOR_VALUE.test(value.trim())) || COLOR_NAME.test(name) && direct.some(value => CHANNEL_VALUE.test(value.trim()))) return "color";
  if (direct.length && direct.every(value => NUMBER_VALUE.test(value.trim())) || NUMBER_NAME.test(name) && direct.every(value => NUMBER_VALUE.test(value.trim()))) return "number";
  return null;
}

function bindingTemplate(name: string, type: string, values: string[]) {
  if (type === "color" && values.some(value => CHANNEL_VALUE.test(value.trim()))) return `hsl(var(--${name}))`;
  return undefined;
}

function humanize(value: string) {
  return value.split("-").filter(Boolean).join("/");
}

export function scanProjectStyleVariables(root: string, manifest?: any) {
  const files = orderedSourceFiles(root, manifest);
  const declarations = new Map<string, any[]>();
  const modes = new Map<string, { id: string; name: string }>();
  const modeTargets = new Map<string, any[]>();
  const warnings: string[] = [];
  const revisions: Record<string, string> = {};
  for (const file of files) {
    let css: string;
    try { css = fs.readFileSync(file, "utf8"); } catch { continue; }
    if (!css.includes("--")) continue;
    revisions[path.relative(root, file)] = crypto.createHash("sha256").update(css).digest("hex");
    let ast: any;
    try { ast = postcss.parse(css, { from: file }); }
    catch (error) { warnings.push(`${path.relative(root, file)}: ${error.message}`); continue; }
    ast.walkDecls(/^--/, (decl: any) => {
      const name = decl.prop.slice(2);
      const value = decl.value.trim();
      const directAlias = value.match(/^var\(\s*--([\w-]+)\s*\)$/);
      // Tailwind @theme files sometimes register an existing token with
      // `--token: var(--token)`. It adds no variable value and must not become
      // a self-alias in the editor's dependency graph.
      if (directAlias?.[1] === name) return;
      const mode = declarationMode(decl);
      if (!mode) return;
      modes.set(mode.id, mode);
      const target = modeTarget(decl, file);
      if (target) modeTargets.set(mode.id, [...(modeTargets.get(mode.id) || []), target]);
      declarations.set(name, [...(declarations.get(name) || []), { modeId: mode.id, value, file, target }]);
    });
  }
  if (!declarations.size) return { library: { version: 1, collections: [], tokens: [] }, files: [], revisions, warnings, conflicts: [] };
  const hasDark = modes.has("dark");
  const hasLight = modes.has("light");
  if (modes.has("default")) {
    const base = modes.get("default")!;
    if (hasDark && !hasLight) { modes.delete("default"); base.id = "light"; base.name = "Light"; modes.set("light", base); }
  }
  const orderedModes = [...modes.values()].sort((a, b) => (a.id === "light" || a.id === "default" ? -1 : b.id === "light" || b.id === "default" ? 1 : a.id === "dark" ? -1 : b.id === "dark" ? 1 : a.name.localeCompare(b.name)));
  const defaultModeId = orderedModes[0].id;
  const collectionId = "project-styles";
  const conflicts: any[] = [];
  const tokens: any[] = [];
  const inferredTypes = new Map<string, string>();
  for (const [name, sourceDeclarations] of declarations) {
    const type = inferType(name, sourceDeclarations.map(item => item.value));
    if (type) inferredTypes.set(name, type);
  }
  for (let pass = 0; pass < declarations.size; pass++) {
    let changed = false;
    for (const [name, sourceDeclarations] of declarations) {
      if (inferredTypes.has(name)) continue;
      const references = sourceDeclarations.map(item => item.value.match(/^var\(\s*--([\w-]+)\s*\)$/)?.[1]);
      if (references.length && references.every(Boolean) && references.every(reference => inferredTypes.get(reference!) === inferredTypes.get(references[0]!))) {
        const type = inferredTypes.get(references[0]!);
        if (type) { inferredTypes.set(name, type); changed = true; }
      }
    }
    if (!changed) break;
  }
  for (const [name, sourceDeclarations] of declarations) {
    for (const declaration of sourceDeclarations) if (declaration.modeId === "default" && defaultModeId === "light") declaration.modeId = "light";
    const values = sourceDeclarations.map(item => item.value);
    const type = inferredTypes.get(name);
    if (!type) continue;
    const byMode = new Map<string, any[]>();
    for (const declaration of sourceDeclarations) byMode.set(declaration.modeId, [...(byMode.get(declaration.modeId) || []), declaration]);
    const base = byMode.get(defaultModeId)?.at(-1);
    if (!base) continue;
    const template = bindingTemplate(name, type, values);
    const valuesByMode: Record<string, any> = {};
    const sourceModes: Record<string, any> = {};
    let writable = true;
    for (const mode of orderedModes) {
      const matches = byMode.get(mode.id) || [];
      if (matches.length > 1) { writable = false; conflicts.push({ token: name, mode: mode.id, files: matches.map(item => path.relative(root, item.file)) }); }
      const declaration = matches.at(-1) || base;
      const alias = declaration.value.match(/^var\(\s*--([\w-]+)\s*\)$/);
      valuesByMode[mode.id] = { kind: "literal", value: declaration.value, ...(matches.length ? {} : { inheritedFromModeId: defaultModeId }) };
      sourceModes[mode.id] = matches.length ? { ...declaration, file: path.relative(root, declaration.file) } : { inherited: true };
      if (alias) valuesByMode[mode.id].aliasCssName = alias[1];
    }
    tokens.push({ id: stableId("css-token", name), name: humanize(name), type, collectionId, cssName: name, valuesByMode, ...(template ? { bindingTemplate: template } : {}), ...(type === "number" ? { sourceNumber: true } : {}), sourceRef: { kind: "css", variable: `--${name}`, modes: sourceModes, writable } });
  }
  const byCssName = new Map(tokens.map(token => [token.cssName, token]));
  for (const token of tokens) for (const value of Object.values(token.valuesByMode) as any[]) {
    if (!value.aliasCssName) continue;
    const target = byCssName.get(value.aliasCssName);
    if (target?.type === token.type) { delete value.value; delete value.aliasCssName; value.kind = "alias"; value.tokenId = target.id; }
    else delete value.aliasCssName;
  }
  const normalizedTargets: Record<string, any> = {};
  for (const mode of orderedModes) {
    const targets = (modeTargets.get(mode.id === "light" && !hasLight ? "default" : mode.id) || []).map(target => ({ ...target, file: path.relative(root, target.file) }));
    const unique = [...new Map(targets.map(target => [JSON.stringify(target), target])).values()];
    if (unique.length === 1) normalizedTargets[mode.id] = unique[0];
  }
  const collection = { id: collectionId, name: "Project styles", defaultModeId, modes: orderedModes.map(mode => ({ id: mode.id, name: mode.name[0].toUpperCase() + mode.name.slice(1) })), sourceRef: { kind: "css", files: Object.keys(revisions), modeTargets: normalizedTargets } };
  return { library: { version: 1, collections: [collection], tokens }, files: Object.keys(revisions), revisions, warnings, conflicts };
}

function valueToCss(value: any, tokens: Map<string, any>) {
  if (value.kind === "alias") {
    const target = tokens.get(value.tokenId);
    if (!target?.cssName) throw new Error("The referenced source variable no longer exists.");
    return `var(--${target.cssName})`;
  }
  return String(value.value);
}

function findContainer(ast: any, target: any) {
  let found: any = null;
  if (target?.kind === "atrule") ast.walkAtRules(target.name, (node: any) => { if (!found && String(node.params || "") === String(target.params || "")) found = node; });
  if (target?.kind === "rule") ast.walkRules((node: any) => { if (!found && node.selector === target.selector) found = node; });
  return found;
}

export function planCssVariableWrites(root: string, before: any, after: any) {
  const beforeTokens = new Map(before.tokens.map((token: any) => [token.id, token]));
  const afterTokens = new Map(after.tokens.map((token: any) => [token.id, token]));
  const files = new Map<string, { text: string; ast: any }>();
  const getFile = (relative: string) => {
    if (!files.has(relative)) {
      const absolute = path.resolve(root, relative);
      const text = fs.readFileSync(absolute, "utf8");
      files.set(relative, { text, ast: postcss.parse(text, { from: absolute }) });
    }
    return files.get(relative)!;
  };
  for (const [id, oldToken] of beforeTokens) {
    if (oldToken.sourceRef?.kind !== "css") continue;
    const token = afterTokens.get(id);
    if (!token) throw new Error("Source variables cannot be deleted here. Remove or replace them in code.");
    if (token.cssName !== oldToken.cssName || token.name !== oldToken.name || token.collectionId !== oldToken.collectionId) throw new Error("Source variable identity is controlled by project code.");
    if (!oldToken.sourceRef.writable && JSON.stringify(token.valuesByMode) !== JSON.stringify(oldToken.valuesByMode)) throw new Error("This source variable has multiple definitions and is read-only until the conflict is resolved.");
    for (const [modeId, oldValue] of Object.entries(oldToken.valuesByMode) as any) {
      const value = token.valuesByMode[modeId];
      if (JSON.stringify(value) === JSON.stringify(oldValue)) continue;
      const cssValue = valueToCss(value, afterTokens);
      const declaration = oldToken.sourceRef.modes?.[modeId];
      const collection = before.collections.find((item: any) => item.id === oldToken.collectionId);
      const target = declaration?.file ? declaration : collection?.sourceRef?.modeTargets?.[modeId];
      if (!target?.file) throw new Error(`Cannot locate a writable ${modeId} block for --${oldToken.cssName}.`);
      const file = getFile(target.file);
      const container = findContainer(file.ast, target.target || target);
      if (!container) throw new Error(`The source block for --${oldToken.cssName} changed. Reload variables.`);
      let existing: any = null;
      container.walkDecls(`--${oldToken.cssName}`, (decl: any) => { existing = decl; });
      if (existing) existing.value = cssValue;
      else container.append({ prop: `--${oldToken.cssName}`, value: cssValue });
    }
  }
  return [...files].map(([file, entry]) => ({ file, before: entry.text, after: entry.ast.toString() }));
}
