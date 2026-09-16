#!/usr/bin/env node
/**
 * Rebuild a readable source tree from the verbatim region bodies in _raw/.
 *
 * Two reconstructions happen here, both driven by the build output itself:
 *
 *  1. Imports. The bundle has no `import` statements: rolldown inlines every
 *     module and rewrites cross-module references to either an interop binding
 *     (`import_react.useState`) or a bare hoisted binding (`DropdownMenuContent`).
 *     We map those back to specifiers using the require_* definition table and a
 *     global symbol table built from the recovered modules.
 *
 *  2. JSX. The build compiled every element to `(0, import_jsx_runtime.jsx)(...)`
 *     / `jsxs` / `jsxDEV` calls. A Babel plugin folds those back into JSX syntax.
 *
 * React Compiler memoization (`const $ = (0, import_compiler_runtime.c)(N)`) is
 * deliberately left intact: it is a semantic transform, and un-applying it would
 * mean rewriting control flow rather than undoing a syntax lowering.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const CURRENT_WORKSPACE_SCOPE = "@bingo/";
const LEGACY_WORKSPACE_SCOPE = "@bingo/";
const isWorkspaceSpecifier = (specifier) =>
  specifier.startsWith(CURRENT_WORKSPACE_SCOPE) || specifier.startsWith(LEGACY_WORKSPACE_SCOPE);
const optionValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const RAW_SOURCE = path.resolve(optionValue("--raw") || path.join(ROOT, "_raw"));
const RAW_WORK = fs.mkdtempSync(path.join(os.tmpdir(), "bingo-rebuild-"));
const RAW = path.join(RAW_WORK, "raw");
fs.cpSync(RAW_SOURCE, RAW, { recursive: true });
process.once("exit", () => fs.rmSync(RAW_WORK, { recursive: true, force: true }));
// Dependency-region discovery needs an explicitly supplied unpacked build.
const APP_OUT = optionValue("--app-out");
const DISCOVER = process.argv.includes("--discover");
const SPILLS_FILE = path.join(HERE, "spills.json");
const OUTPUT_OPTION = optionValue("--output");
const OUT = path.resolve(OUTPUT_OPTION || path.join(ROOT, "recovered-source"));
if (OUT === ROOT || OUT === RAW_SOURCE || OUT.startsWith(RAW_SOURCE + path.sep)) {
  throw new Error("Recovery output must be a separate directory outside the source and _raw trees.");
}
if (DISCOVER && !APP_OUT) throw new Error("--discover requires --app-out <unpacked-build-directory>.");
function outputPath(relativePath) {
  const candidate = path.resolve(OUT, relativePath);
  if (candidate !== OUT && !candidate.startsWith(OUT + path.sep)) {
    throw new Error(`Refusing recovery path outside output directory: ${relativePath}`);
  }
  return candidate;
}
/**
 * Recovery metadata follows the maintained workspace layout, while the immutable
 * bundle evidence still contains the package's historical `cloud` directory.
 */
function rawInputPath(relativePath) {
  const current = path.join(RAW, relativePath);
  if (fs.existsSync(current)) return current;
  const legacyRelative = relativePath
    .replace(/^packages\/workspace\//, "packages/cloud/")
    .replace(/src\/renderer\/src\/backends\/ElectronBackend\.ts$/, "src/renderer/src/backends/ElectronCloudBackend.ts");
  return path.join(RAW, legacyRelative);
}
const require_ = createRequire(import.meta.url);
const parser = require_("@babel/parser");
const traverseMod = require_("@babel/traverse");
const generateMod = require_("@babel/generator");
const t = require_("@babel/types");

const traverse = traverseMod.default || traverseMod;
const generate = generateMod.default || generateMod;

const index = JSON.parse(fs.readFileSync(path.join(HERE, "modules.json"), "utf8"));

// ---------------------------------------------------------------------------
// specifiers
// ---------------------------------------------------------------------------

/** Build-output directories: anything inside them is an internal entry file,
 *  not a public subpath, so the specifier collapses to the package root. */
const INTERNAL_SUBPATH =
  /^(?:index|(?:dist|es|esm|lib|build|cjs|src|modern|out|umd)(?:\/|$))/;

/** Can this specifier be resolved from the repo root? */
function resolvable(spec) {
  try {
    require_.resolve(spec, { paths: [ROOT] });
    return true;
  } catch {
    return false;
  }
}

// pnpm keeps each workspace package's dependencies un-hoisted, so a package
// imported only by packages/workspace is not resolvable from the repo root.
const pkgDirCache = new Map();
let pnpmDirs = null;
function findPackageDir(pkg) {
  if (pkgDirCache.has(pkg)) return pkgDirCache.get(pkg);
  const bases = [path.join(ROOT, "node_modules", pkg)];
  try {
    for (const d of fs.readdirSync(path.join(ROOT, "packages"))) {
      bases.push(path.join(ROOT, "packages", d, "node_modules", pkg));
    }
  } catch {}
  // Transitive deps live only in the pnpm store, not next to their consumer.
  if (!pnpmDirs) {
    pnpmDirs = [];
    try {
      const store = path.join(ROOT, "node_modules", ".pnpm");
      for (const d of fs.readdirSync(store)) pnpmDirs.push(path.join(store, d, "node_modules"));
    } catch {}
  }
  for (const d of pnpmDirs) bases.push(path.join(d, pkg));
  const found =
    bases.find((b) => fs.existsSync(path.join(b, "package.json"))) || null;
  pkgDirCache.set(pkg, found);
  return found;
}

/**
 * Ask a package's `exports` map which public specifier points at a file.
 *
 * Internal files are not importable: `hono/dist/client/client.js` is reached
 * through `hono/client`, and `zod/v4/core/regexes.js` through `zod/v4/core`.
 * An exact target match wins; otherwise the longest export whose target is a
 * directory containing the file wins.
 */
function specifierFromExports(pkg, sub) {
  const dir = findPackageDir(pkg);
  if (!dir) return null;
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }
  const ex = manifest.exports;
  if (!ex || typeof ex !== "object") return null;
  const want = `./${sub}`;
  const asSpec = (key) => (key === "." ? pkg : pkg + key.slice(1));

  // Export targets nest: `"./core": { import: { types, default } }`. Collect
  // every string leaf rather than assuming one level of conditions.
  const collect = (v) =>
    typeof v === "string"
      ? [v]
      : v && typeof v === "object"
        ? Object.values(v).flatMap(collect)
        : [];

  let bestKey = null;
  let bestLen = -1;
  let wildcardKey = null;
  let wildcardLen = -1;
  for (const [key, value] of Object.entries(ex)) {
    // Only dotted keys are subpaths; the top level may instead hold conditions
    // (`{"import": "./dist/index.js"}`), where "import" is not a subpath.
    if (!key.startsWith(".")) continue;
    for (const target of collect(value)) {
      if (target === want) return asSpec(key);
      const targetDir = target.replace(/\/[^/]*$/, "");
      if (
        want.startsWith(`${targetDir}/`) &&
        targetDir.length > bestLen &&
        /\.(mjs|cjs|js)$/.test(target)
      ) {
        bestLen = targetDir.length;
        bestKey = key;
      }
      // `"./*": "./dist/esm/*"` style exports map a whole tree.
      const kStar = key.indexOf("*");
      const tStar = target.indexOf("*");
      if (kStar !== -1 && tStar !== -1) {
        const kPre = key.slice(0, kStar);
        const tPre = target.slice(0, tStar);
        const tSuf = target.slice(tStar + 1);
        if (
          want.startsWith(tPre) &&
          want.endsWith(tSuf) &&
          want.length >= tPre.length + tSuf.length
        ) {
          const mid = want.slice(tPre.length, want.length - tSuf.length);
          const file = path.join(findPackageDir(pkg) || "", tPre + mid + tSuf);
          // A wildcard that lands on a real file is a precise mapping
          // (@modelcontextprotocol/sdk's `"./*"` reaches client/sse.js), so it
          // beats a directory-prefix match.
          if (fs.existsSync(file) && tPre.length > wildcardLen) {
            wildcardLen = tPre.length;
            wildcardKey = kPre + mid;
          }
        }
      }
    }
  }
  // A wildcard that resolves to a real file is the most precise answer.
  if (wildcardKey) return pkg + "/" + wildcardKey.slice(2);
  return bestKey ? asSpec(bestKey) : null;
}

/** Is `name` declared at all in this source, exported or not? */
function nameAppearsDeclared(src, name) {
  return new RegExp(`\\b(?:function|class|var|let|const)\\s+${name}\\b`).test(src);
}

function fileDeclaresName(pkg, sub, name) {
  const dir = findPackageDir(pkg);
  if (!dir) return false;
  try {
    return nameAppearsDeclared(fs.readFileSync(path.join(dir, sub), "utf8"), name);
  } catch {
    return false;
  }
}

function fileExportsName(pkg, sub, name) {
  const dir = findPackageDir(pkg);
  if (!dir) return false;
  let src;
  try {
    src = fs.readFileSync(path.join(dir, sub), "utf8");
  } catch {
    return false;
  }
  return nameAppearsExported(src, name);
}

function nameAppearsExported(src, name) {
  return new RegExp(
    `\\b(?:export\\s+(?:async\\s+)?(?:function|class|const|let|var)\\s+${name}\\b` +
      `|export\\s*\\{[^}]*\\b${name}\\b` +
      `|exports\\.${name}\\s*=|module\\.exports\\s*=\\s*\\{[^}]*\\b${name}\\b)`
  ).test(src);
}

/** The file a bare `import x from "<pkg>"` lands on. */
function rootEntryFile(pkg) {
  const dir = findPackageDir(pkg);
  if (!dir) return null;
  try {
    const pj = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    let target = null;
    const ex = pj.exports;
    if (ex && typeof ex === "object") {
      const collect = (v) =>
        typeof v === "string"
          ? [v]
          : v && typeof v === "object"
            ? Object.values(v).flatMap(collect)
            : [];
      const leaves = collect(ex["."] ?? ex).filter((t) => /\.(mjs|cjs|js)$/.test(t));
      target = leaves[0] || null;
    } else {
      target = pj.module || pj.main || null;
    }
    return target ? path.join(dir, target) : null;
  } catch {
    return null;
  }
}

/**
 * True when `name` is reachable from the specifier an import actually uses.
 *
 * This is the test that separates a real spill from a false alarm: `hc` is not
 * declared in hono's dist/client/client.js, but `hono/client` re-exports it, so
 * the import is fine. `index_default` is reachable from nothing, because it
 * belongs to a module that was inlined without a region header.
 */
/**
 * Find the export key of `pkg` that actually exports `name`.
 *
 * A package can declare a symbol in one file and expose it under a key that
 * points somewhere else: better-auth declares `adminClient` in
 * `dist/plugins/admin/client.mjs`, while `better-auth/plugins/admin` resolves to
 * the server entry. The only reliable answer is to ask each key.
 */
/**
 * Find an installed package that exports `name`.
 *
 * A region can hold several modules at once -- the prosemirror-history region
 * also contains a handful of @tiptap/extension-* modules -- so a name declared
 * there may really belong to a different package than the region's own path
 * suggests. Asking the installed packages is the only reliable answer.
 */
let storePackageDirs = null;
function storePackages() {
  if (storePackageDirs) return storePackageDirs;
  const found = new Map();
  const add = (dir) => {
    try {
      const pj = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
      if (pj.name && !found.has(pj.name)) found.set(pj.name, dir);
    } catch {}
  };
  const store = path.join(ROOT, "node_modules", ".pnpm");
  try {
    for (const entry of fs.readdirSync(store)) {
      const base = path.join(store, entry, "node_modules");
      let names;
      try { names = fs.readdirSync(base); } catch { continue; }
      for (const n of names) {
        if (n.startsWith("@")) {
          try { for (const sub of fs.readdirSync(path.join(base, n))) add(path.join(base, n, sub)); } catch {}
        } else if (n !== ".bin") {
          add(path.join(base, n));
        }
      }
    }
  } catch {}
  storePackageDirs = found;
  return found;
}

/**
 * Find an installed package whose entry file itself declares `name`.
 *
 * `@tiptap/starter-kit` declares `var index_default` in `dist/index.js`, which
 * is exactly the code a region spilled: the module had no region of its own, so
 * slicing it out by hand is both unnecessary and wrong. The package is the
 * right source.
 */
/** Normalised lines, for matching a spilled region against package files. */
function lineSet(text) {
  return new Set(
    text.split("\n").map((l) => l.trim()).filter((l) => l.length > 12)
  );
}

/**
 * Which installed package is this spilled code actually copied from?
 *
 * Many packages in one family declare the same helper name -- every
 * `@tiptap/extension-*` file declares `index_default` -- so the name alone picks
 * the wrong one. Comparing the spilled text against each candidate's entry file
 * identifies the real source: the region was inlined from it verbatim.
 */
const matchCache = new Map();
function packageMatchingText(text) {
  const key = text.slice(0, 200);
  if (matchCache.has(key)) return matchCache.get(key);
  const want = lineSet(text);
  if (want.size < 5) return null;
  let best = null;
  let bestScore = 0;
  for (const [pkg, dir] of storePackages()) {
    let entry = null;
    try {
      const pj = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
      const ex = pj.exports;
      const collect = (v) =>
        typeof v === "string" ? [v]
          : v && typeof v === "object" ? Object.values(v).flatMap(collect) : [];
      const leaves = (ex && typeof ex === "object")
        ? collect(ex["."] ?? ex)
        : [pj.module, pj.main].filter(Boolean);
      entry = leaves.find((t) => /\.(mjs|cjs|js)$/.test(t)) || null;
    } catch {}
    if (!entry) continue;
    let src;
    try { src = fs.readFileSync(path.join(dir, entry), "utf8"); } catch { continue; }
    const have = lineSet(src);
    if (!have.size) continue;
    let hit = 0;
    for (const l of want) if (have.has(l)) hit++;
    const score = hit / want.size;
    if (score > bestScore) { bestScore = score; best = pkg; }
  }
  const result = bestScore >= 0.5 ? best : null;
  matchCache.set(key, result);
  return result;
}

/**
 * Spilled modules whose real package cannot be inferred automatically.
 *
 * `index_default` is declared by every `@tiptap/extension-*` file AND by
 * `@tiptap/starter-kit`, so the name alone picks the wrong one, and reformatting
 * between the bundle and the package file defeats text matching. The spilled
 * body says `Extension.create({ name: "starterKit", ... })`, which is
 * `@tiptap/starter-kit` verbatim -- verified by reading both.
 */
const SPILL_REDIRECTS = {
  index_default: "@tiptap/starter-kit",
};

const declaredByCache = new Map();
function storePackageDeclaring(name) {
  if (declaredByCache.has(name)) return declaredByCache.get(name);
  let result = null;
  for (const [pkg, dir] of storePackages()) {
    let entry = null;
    try {
      const pj = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
      const ex = pj.exports;
      const collect = (v) =>
        typeof v === "string"
          ? [v]
          : v && typeof v === "object"
            ? Object.values(v).flatMap(collect)
            : [];
      const leaves = (ex && typeof ex === "object")
        ? collect(ex["."] ?? ex)
        : [pj.module, pj.main].filter(Boolean);
      entry = leaves.find((t) => /\.(mjs|cjs|js)$/.test(t)) || null;
    } catch {}
    if (!entry) continue;
    try {
      if (nameAppearsDeclared(fs.readFileSync(path.join(dir, entry), "utf8"), name)) {
        result = pkg;
        break;
      }
    } catch {}
  }
  declaredByCache.set(name, result);
  return result;
}

const ghostSpecCache = new Map();
function specifierForGhostName(name, preferPkg) {
  const cached = ghostSpecCache.get(name);
  if (cached !== undefined) return cached;
  let result = null;
  for (const pkg of storePackages().keys()) {
    if (pkg === preferPkg) continue;
    if (specExportsName(pkg, name)) { result = pkg; break; }
  }
  ghostSpecCache.set(name, result);
  return result;
}

function specifierExportingName(pkg, name) {
  const dir = findPackageDir(pkg);
  if (!dir) return null;
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }
  const ex = manifest.exports;
  if (!ex || typeof ex !== "object") return null;
  for (const key of Object.keys(ex)) {
    if (!key.startsWith(".") || key.includes("*")) continue;
    const spec = key === "." ? pkg : pkg + key.slice(1);
    if (specExportsName(spec, name)) return spec;
  }
  return null;
}

const specExportsCache = new Map();
function specExportsNameCached(spec, name) {
  const key = `${spec}\0${name}`;
  if (specExportsCache.has(key)) return specExportsCache.get(key);
  const v = specExportsName(spec, name);
  specExportsCache.set(key, v);
  return v;
}

function specExportsName(spec, name) {
  const file = entryFileForSpec(spec);
  return file ? fileTreeExportsName(file, name, 0) : false;
}

function specParts(spec) {
  const parts = spec.split("/");
  const scoped = spec.startsWith("@");
  return {
    pkg: scoped ? parts.slice(0, 2).join("/") : parts[0],
    sub: (scoped ? parts.slice(2) : parts.slice(1)).join("/"),
  };
}

/** Resolve a specifier to the file it loads, via the package's exports map. */
function entryFileForSpec(spec) {
  const { pkg, sub } = specParts(spec);
  const dir = findPackageDir(pkg);
  if (!dir) return null;
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }
  const pick = (v) => {
    const leaves = typeof v === "string"
      ? [v]
      : v && typeof v === "object"
        ? Object.values(v).flatMap(pick)
        : [];
    return leaves;
  };
  const ex = manifest.exports;
  let target = null;
  if (typeof ex === "string") {
    // `"exports": "./index.js"` -- the whole package is one entry.
    target = sub ? null : ex;
  } else if (ex && typeof ex === "object") {
    const key = sub ? `./${sub}` : ".";
    let value = ex[key];
    if (value === undefined) {
      // Wildcards: `"./icons/*": "./dist/icons/*.js"`.
      for (const [k, v] of Object.entries(ex)) {
        const star = k.indexOf("*");
        if (star === -1 || !ex || !`./${sub}`.startsWith(k.slice(0, star))) continue;
        const mid = `./${sub}`.slice(k.slice(0, star).length);
        value = Object.fromEntries(
          Object.entries(typeof v === "string" ? { d: v } : v).map(([kk, vv]) => [
            kk,
            typeof vv === "string" ? vv.replace("*", mid) : vv,
          ])
        );
        break;
      }
    }
    const leaves = pick(value ?? {}).filter((t) => /\.(mjs|cjs|js)$/.test(t));
    target = leaves[0] ?? null;
  } else {
    target = sub ? null : manifest.module || manifest.main || null;
  }
  if (!target) return null;
  const file = path.join(dir, target);
  if (fs.existsSync(file)) return file;
  for (const ext of [".js", ".mjs", ".cjs"]) {
    if (fs.existsSync(file + ext)) return file + ext;
  }
  return null;
}

function fileTreeExportsName(file, name, depth) {
  if (depth > 4) return false;
  let src;
  try {
    src = fs.readFileSync(file, "utf8");
  } catch {
    return false;
  }
  if (nameAppearsExported(src, name)) return true;
  const dir = path.dirname(file);
  for (const m of src.matchAll(/export\s*(?:\*|\{[^}]*\})\s*from\s*["']([^"']+)["']/g)) {
    if (!m[1].startsWith(".")) continue;
    const base = path.resolve(dir, m[1]);
    for (const cand of [base, `${base}.js`, `${base}.mjs`, path.join(base, "index.js")]) {
      if (fs.existsSync(cand) && fileTreeExportsName(cand, name, depth + 1)) return true;
    }
  }
  return false;
}

/**
 * True when `name` reaches the package through its own entry point.
 *
 * Icons look like ghosts -- `X` is not declared in lucide's createLucideIcon.js
 * -- but the package root re-exports them, so the emitted import is fine.
 */
function reachableFromPackage(pkg, name) {
  return specExportsName(pkg, name);
}

/** Split a dependency region path into its package and package-relative file. */
function regionParts(p) {
  const m = p.match(/node_modules\/\.pnpm\/[^/]+\/node_modules\/(.+)$/);
  const rest = m ? m[1] : (p.match(/node_modules\/(.+)$/) || [])[1];
  if (!rest) return null;
  const parts = rest.split("/");
  const scoped = parts[0].startsWith("@");
  return {
    pkg: scoped ? parts.slice(0, 2).join("/") : parts[0],
    sub: (scoped ? parts.slice(2) : parts.slice(1)).join("/"),
  };
}

function specifierForNodeModules(p) {
  const parsed = regionParts(p);
  if (!parsed) return null;
  const { pkg, sub } = parsed;
  const bare = sub.replace(/\.(mjs|cjs|js|jsx|tsx?|json)$/, "");
  if (pkg === "react" && bare.includes("compiler-runtime")) return "react/compiler-runtime";

  const viaExports = specifierFromExports(pkg, sub);
  if (viaExports) return viaExports;

  // A public subpath sometimes lives under the build directory -- `hono/client`
  // ships as dist/client/index.js -- so try the subpath before assuming the
  // build directory means "internal entry".
  const underBuild = bare.match(/^(?:dist|esm?|lib|build)\/(.+)$/);
  if (underBuild && underBuild[1].endsWith("/index")) {
    const candidate = `${pkg}/${underBuild[1].replace(/\/index$/, "")}`;
    if (resolvable(candidate)) return candidate;
  }
  if (!bare || INTERNAL_SUBPATH.test(bare)) return pkg;
  return `${pkg}/${bare.replace(/\/index$/, "")}`;
}

function specifierForAppPath(regionPath, fromRegionPath, packageOf) {
  const clean = (p) =>
    p.replace(/^\.\.\/\.\.\//, "").replace(/^\.\//, "");
  const to = clean(regionPath);
  const from = clean(fromRegionPath);
  const toPkg = packageOf(to);
  const fromPkg = packageOf(from);
  if (toPkg && fromPkg && toPkg === fromPkg) {
    let rel = path.posix.relative(path.posix.dirname(from), to);
    if (!rel.startsWith(".")) rel = `./${rel}`;
    return rel.replace(/\.(tsx?|jsx?)$/, "");
  }
  if (toPkg) return `${CURRENT_WORKSPACE_SCOPE}${toPkg}`;
  let rel = path.posix.relative(path.posix.dirname(from), to);
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel.replace(/\.(tsx?|jsx?)$/, "");
}

function cleanPath(p) {
  return p.replace(/^\.\.\/\.\.\//, "").replace(/^\.\//, "");
}

function packageOf(p) {
  const m = cleanPath(p).match(/^packages\/([^/]+)\//);
  return m ? m[1] : null;
}

/**
 * Which part of the monorepo a file belongs to.
 *
 * `src/main`, `src/preload` and `src/renderer` are separate processes that never
 * import each other, so two files sharing the area `null` is not evidence that
 * they are related. Names like `getApiUrl` and `getWebUrl` genuinely exist in
 * both the historical workspace package and the main process.
 */
function areaOf(p) {
  const c = cleanPath(p);
  const pkg = c.match(/^packages\/([^/]+)\//);
  if (pkg) return `pkg:${pkg[1]}`;
  const src = c.match(/^src\/([^/]+)\//);
  if (src) return `src:${src[1]}`;
  return null;
}

function specifierForDep(depRegionPath, fromRegionPath) {
  if (!depRegionPath) return null;
  if (depRegionPath.includes("node_modules")) {
    return specifierForNodeModules(depRegionPath);
  }
  return specifierForAppPath(depRegionPath, fromRegionPath, packageOf);
}

// ---------------------------------------------------------------------------
// symbol table: top-level name -> module that defines it
// ---------------------------------------------------------------------------

const DECL = /^(?:var|let|const|function|class|async function)\s+([A-Za-z_$][\w$]*)/;
const symbolOwner = new Map(); // name -> [regionPath, ...]

function indexDeclarations(file, regionPath) {
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = DECL.exec(line);
    if (m) {
      if (!symbolOwner.has(m[1])) symbolOwner.set(m[1], []);
      symbolOwner.get(m[1]).push(regionPath);
    }
  }
}

/**
 * Build the global name -> module table every resolution pass reads.
 *
 * Called twice: once up front, and again after spilled modules are registered.
 * Both callers must go through here -- rebuilding from `_raw` alone silently
 * drops declarations that exist only in another bundle's tree-shaken variant
 * (`getComponentImportMappings` lives only in main's copy of generateImports).
 */
function buildSymbolTable() {
  for (const mod of index.modules) {
    indexDeclarations(rawInputPath(mod.output), mod.region_path);
    // A declaration that only one bundle kept still belongs to that module, so
    // the tree-shaken variants have to contribute to the symbol table too.
    const merged = (index.merged || {})[mod.output];
    if (merged) {
      for (const v of merged.variants) {
        const alt = path.join(ROOT, "_alt", v.bundle, mod.output);
        if (fs.existsSync(alt)) indexDeclarations(alt, mod.region_path);
      }
    }
  }
}

buildSymbolTable();

// Names that came from an inlined node_modules module rather than app source.
const depSymbol = new Map(Object.entries(index.dep_symbols || {}));

// Node / Electron builtins, recovered from the bundle preamble.
const externals = new Map(Object.entries(index.externals || {}));

// Vite asset modules export their URL as the default. The binding keeps the
// generated name (`logoText_default` for logoText.png), so map it back to the
// file and re-emit it as a relative import, which is what the author wrote.
const assetDefault = new Map();
for (const rel of Object.keys(index.assets || {})) {
  const base = path.basename(rel).replace(/\.[^.]+$/, "");
  assetDefault.set(`${base}_default`, rel);
}

/**
 * Recover the name a package actually exports.
 *
 * rolldown renames an imported binding when another module in the bundle
 * already uses that name, in three shapes: `Image$1`, `inflateRaw_1` and
 * `Item2`. `$N` and `_N` are explicit markers and always come off. A bare
 * trailing digit is ambiguous -- `Item2` is a renamed `Item`, but `sha256` is
 * just `sha256` -- so it is only stripped for component-style names.
 *
 * When the result is still a minified stub like `s`, the filename is the only
 * remaining clue: a package that ships one component per file
 * (`@phosphor-icons/react/dist/defs/CheckCircle.es.js`) names the file after
 * the export.
 */
const ENTRY_BASENAMES = new Set([
  "index", "main", "module", "utils", "defaultAttributes", "Icon",
  "createLucideIcon",
]);

/**
 * Map a dependency file's local binding names to its public export names.
 *
 * Minified ESM builds export like `export { fe as ActivityComponentTag }`, so
 * the name the bundle inlines (`fe`) is not importable. Reading the real file
 * gives the translation. Cached because the same file is consulted repeatedly.
 */
const exportAliasCache = new Map();
/**
 * The alias map of the file a specifier resolves to.
 *
 * This is where a rename actually lives: lowlight's entry says
 * `export { grammars as common } from './lib/common.js'`, so code that inlined
 * the internal `grammars` must import `common`. The region file's own map would
 * just say `grammars -> grammars`.
 */
const specAliasCache = new Map();
function specAliasFor(spec) {
  if (specAliasCache.has(spec)) return specAliasCache.get(spec);
  const file = entryFileForSpec(spec);
  let map = null;
  if (file) {
    try {
      // Follow `export {default} from "./lib/index.js"` one level: the entry
      // often only forwards, and the real binding name lives in the target.
      let src = fs.readFileSync(file, "utf8");
      const forward = src.match(/export\s*\{\s*default\s*\}\s*from\s*["']([^"']+)["']/);
      if (forward && forward[1].startsWith(".")) {
        const base = path.resolve(path.dirname(file), forward[1]);
        for (const cand of [base, `${base}.js`, path.join(base, "index.js")]) {
          try { src = fs.readFileSync(cand, "utf8"); break; } catch {}
        }
      }
      map = new Map();
      for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
        for (const part of m[1].split(",")) {
          const bits = part.trim().split(/\s+as\s+/);
          if (bits.length === 2) map.set(bits[0].trim(), bits[1].trim());
          else if (bits[0]) map.set(bits[0].trim(), bits[0].trim());
        }
      }
      // `export default ReactCodeMirror` — the binding is the module's default.
      // Only when the file does NOT also export that name: `clsx` ships both
      // `export function clsx` and `export default clsx`, and the named form is
      // what callers import.
      const def =
        src.match(/export\s+default\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/) ||
        src.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;/);
      if (def && !new RegExp(`export\\s+(?:async\\s+)?(?:function|class|const|let|var)\\s+${def[1]}\\b`).test(src)) {
        map.set(def[1], "default");
      }
      if (!map.size) map = null;
    } catch {
      map = null;
    }
  }
  specAliasCache.set(spec, map);
  return map;
}

/** Region-file aliases first; the entry's renames take precedence over them. */
function aliasFor(spec, depRegionPath) {
  const region = exportAliasFor(depRegionPath);
  const entry = specAliasFor(spec);
  if (!region && !entry) return null;
  return new Map([...(region || []), ...(entry || [])]);
}

function exportAliasFor(depRegionPath) {
  if (!depRegionPath) return null;
  if (exportAliasCache.has(depRegionPath)) return exportAliasCache.get(depRegionPath);
  let map = null;
  const parsed = regionParts(depRegionPath);
  const dir = parsed ? findPackageDir(parsed.pkg) : null;
  if (dir && parsed) {
    try {
      const src = fs.readFileSync(path.join(dir, parsed.sub), "utf8");
      map = new Map();
      for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
        for (const part of m[1].split(",")) {
          const bits = part.trim().split(/\s+as\s+/);
          if (bits.length === 2) map.set(bits[0].trim(), bits[1].trim());
          else if (bits[0]) map.set(bits[0].trim(), bits[0].trim());
        }
      }
      // `export default ReactCodeMirror` — the binding is the module's default.
      // Only when the file does NOT also export that name: `clsx` ships both
      // `export function clsx` and `export default clsx`, and the named form is
      // what callers import.
      const def =
        src.match(/export\s+default\s+(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)/) ||
        src.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;/);
      if (def && !new RegExp(`export\\s+(?:async\\s+)?(?:function|class|const|let|var)\\s+${def[1]}\\b`).test(src)) {
        map.set(def[1], "default");
      }
      if (!map.size) map = null;
    } catch {
      map = null;
    }
  }
  exportAliasCache.set(depRegionPath, map);
  return map;
}

function publicExportName(local, depRegionPath, aliasMap) {
  // rolldown's collision rename has to come off before anything else: the
  // package's own export map is keyed by its original local names.
  let name = local.replace(/\$\d+$/, "").replace(/_\d+$/, "");
  if (/^[A-Z]/.test(name)) name = name.replace(/\d+$/, "");

  // Minified builds rename on export (`export { Z as getFiberFromNode }`), so
  // the file's own map is authoritative when it has an entry.
  if (aliasMap) {
    if (aliasMap.has(name)) return aliasMap.get(name);
    if (aliasMap.has(local)) return aliasMap.get(local);
  }

  if (name.length <= 2 && depRegionPath) {
    const base = path
      .basename(depRegionPath)
      .replace(/\.[^.]+$/, "")
      .replace(/\.es$/, "");
    if (/^[A-Z][A-Za-z0-9]*$/.test(base) && !ENTRY_BASENAMES.has(base)) {
      return base;
    }
  }
  return name;
}

function relativeAssetSpecifier(to, from) {
  let r = path.posix.relative(path.posix.dirname(cleanPath(from)), cleanPath(to));
  if (!r.startsWith(".")) r = `./${r}`;
  return r;
}

// An interop binding is declared at its first use site, so a module that uses
// `import_react` may not be the module whose region carries the declaration.
// all_aliases is the bundle-wide scan, which is the authoritative table.
const globalAlias = new Map(Object.entries(index.all_aliases || {}));
for (const m of Object.values(index.aliases || {})) {
  for (const [alias, reqFn] of Object.entries(m)) {
    if (!globalAlias.has(alias)) globalAlias.set(alias, reqFn);
  }
}

// ---------------------------------------------------------------------------
// JSX reconstruction
// ---------------------------------------------------------------------------

// Only the jsx-runtime factories have the (tag, props) shape. `createElement`
// takes children as extra arguments, so folding it with the same rule would
// silently drop them -- leave it alone.
const JSX_FNS = new Set(["jsx", "jsxs", "jsxDEV"]);
const JSX_HOST = /^[a-z]/;

function jsxNameFromString(str) {
  // "div", "my-tag", "svg:path"
  if (str.includes(":")) {
    const [a, b] = str.split(":");
    return t.jsxNamespacedName(t.jsxIdentifier(a), t.jsxIdentifier(b));
  }
  if (str.includes(".")) {
    const parts = str.split(".");
    let node = t.jsxIdentifier(parts[0]);
    for (const p of parts.slice(1)) node = t.jsxMemberExpression(node, t.jsxIdentifier(p));
    return node;
  }
  return t.jsxIdentifier(str);
}

function tagToJsx(node) {
  if (t.isStringLiteral(node)) return jsxNameFromString(node.value);
  if (t.isIdentifier(node)) return t.jsxIdentifier(node.name);
  if (t.isMemberExpression(node) && !node.computed) {
    const obj = tagToJsx(node.object);
    const prop = t.jsxIdentifier(node.property.name);
    if (t.isJSXIdentifier(obj)) return t.jsxMemberExpression(obj, prop);
    return t.jsxMemberExpression(obj, prop);
  }
  return null;
}

function isFragment(node) {
  return (
    t.isMemberExpression(node) &&
    t.isIdentifier(node.property, { name: "Fragment" })
  );
}

function attrName(key) {
  if (t.isIdentifier(key)) return t.jsxIdentifier(key.name);
  if (t.isStringLiteral(key)) return jsxNameFromString(key.value);
  return null;
}

function buildJsx(tagNode, propsNode, keyNode, t2) {
  let openingName;
  let attrs = [];
  let children = [];

  if (isFragment(tagNode)) {
    openingName = null; // <>
  } else {
    openingName = tagToJsx(tagNode);
    if (!openingName) return null;
  }

  // The jsx-runtime factories take the key as a third argument, not inside the
  // props object. Dropping it would silently break every list.
  if (keyNode && !t.isNullLiteral(keyNode) && !t.isIdentifier(keyNode, { name: "undefined" })) {
    attrs.push(
      t.jsxAttribute(
        t.jsxIdentifier("key"),
        t.isStringLiteral(keyNode)
          ? t.stringLiteral(keyNode.value)
          : t.jsxExpressionContainer(keyNode)
      )
    );
  }

  if (t.isObjectExpression(propsNode)) {
    for (const prop of propsNode.properties) {
      if (t.isSpreadElement(prop)) {
        attrs.push(t.jsxSpreadAttribute(prop.argument));
        continue;
      }
      if (!t.isObjectProperty(prop) && !t.isObjectMethod(prop)) {
        attrs.push(t.jsxSpreadAttribute(t.identifier("props")));
        continue;
      }
      const keyNode = prop.key;
      const isChildren = t.isIdentifier(keyNode, { name: "children" }) ||
        t.isStringLiteral(keyNode, { value: "children" });
      const value = prop.value;
      if (isChildren && !t.isObjectMethod(prop)) {
        const kids = t.isArrayExpression(value) ? value.elements : [value];
        for (const kid of kids) {
          if (!kid) continue;
          if (t.isStringLiteral(kid)) {
            // Raw JSX text cannot contain < > { } unescaped, and the generator
            // will not escape them for us -- keep such text as an expression.
            if (/[{}<>]/.test(kid.value)) {
              children.push(t.jsxExpressionContainer(t.stringLiteral(kid.value)));
            } else if (kid.value) {
              children.push(t.jsxText(kid.value));
            }
          } else {
            children.push(t.jsxExpressionContainer(kid));
          }
        }
        continue;
      }
      const name = attrName(keyNode);
      if (!name) {
        attrs.push(t.jsxSpreadAttribute(t.identifier("props")));
        continue;
      }
      if (t.isObjectMethod(prop)) {
        attrs.push(
          t.jsxAttribute(
            name,
            t.jsxExpressionContainer(
              t.arrowFunctionExpression(prop.params, prop.body, prop.generator)
            )
          )
        );
      } else if (t.isStringLiteral(value)) {
        attrs.push(t.jsxAttribute(name, t.stringLiteral(value.value)));
      } else {
        attrs.push(t.jsxAttribute(name, t.jsxExpressionContainer(value)));
      }
    }
  } else if (propsNode) {
    attrs.push(t.jsxSpreadAttribute(propsNode));
  }

  const selfClosing = children.length === 0;

  if (!openingName) {
    return t.jsxFragment(t.jsxOpeningFragment(), t.jsxClosingFragment(), children);
  }

  const opening = t.jsxOpeningElement(openingName, attrs, selfClosing);
  const closing = selfClosing ? null : t.jsxClosingElement(openingName);
  return t.jsxElement(opening, closing, children, selfClosing);
}

function jsxPlugin() {
  return {
    name: "restore-jsx",
    visitor: {
      CallExpression(p) {
        let callee = p.node.callee;
        if (t.isSequenceExpression(callee)) {
          callee = callee.expressions[callee.expressions.length - 1];
        }
        if (
          !t.isMemberExpression(callee) ||
          !t.isIdentifier(callee.object) ||
          !/^import_(jsx|react)/.test(callee.object.name)
        ) {
          return;
        }
        const fn = callee.property.name;
        if (!JSX_FNS.has(fn)) return;
        const args = p.node.arguments;
        if (!args.length) return;
        const el = buildJsx(args[0], args[1], t);
        if (!el) return;
        p.replaceWith(el);
      },
    },
  };
}

// ---------------------------------------------------------------------------
// globals we should never treat as module imports
// ---------------------------------------------------------------------------

const GLOBALS = new Set([
  "window", "document", "navigator", "location", "history", "localStorage",
  "sessionStorage", "indexedDB", "console", "fetch", "Headers", "Request",
  "Response", "AbortController", "AbortSignal", "URL", "URLSearchParams",
  "Blob", "File", "FileReader", "FormData", "TextEncoder", "TextDecoder",
  "WebSocket", "EventSource", "Worker", "MessageChannel", "MessagePort",
  "performance", "crypto", "atob", "btoa", "structuredClone", "queueMicrotask",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame", "requestIdleCallback",
  "cancelIdleCallback", "matchMedia", "getComputedStyle", "alert", "confirm",
  "prompt", "MutationObserver", "ResizeObserver", "IntersectionObserver",
  "CustomEvent", "Event", "KeyboardEvent", "MouseEvent", "PointerEvent",
  "DragEvent", "WheelEvent", "ClipboardEvent", "FocusEvent", "InputEvent",
  "HTMLElement", "HTMLDivElement", "HTMLInputElement", "HTMLTextAreaElement",
  "HTMLCanvasElement", "HTMLImageElement", "HTMLVideoElement", "HTMLAudioElement",
  "HTMLAnchorElement", "HTMLButtonElement", "HTMLFormElement", "HTMLSelectElement",
  "SVGElement", "SVGSVGElement", "Element", "Node", "NodeList", "DocumentFragment",
  "Image", "Audio", "Path2D", "OffscreenCanvas", "ImageData", "DOMParser",
  "XMLSerializer", "Range", "Selection", "ClipboardItem", "DOMRect", "DOMRectReadOnly",
  "process", "global", "globalThis", "Buffer", "require", "module", "exports",
  "React", "ReactDOM", "Symbol", "Object", "Array", "String", "Number", "Boolean",
  "Math", "JSON", "Date", "RegExp", "Error", "TypeError", "RangeError", "SyntaxError",
  "Promise", "Map", "Set", "WeakMap", "WeakSet", "Proxy", "Reflect", "Intl",
  "ArrayBuffer", "SharedArrayBuffer", "DataView", "Uint8Array", "Int16Array",
  "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array",
  "BigInt", "BigInt64Array", "BigUint64Array", "Function", "eval", "isNaN",
  "isFinite", "parseInt", "parseFloat", "encodeURIComponent", "decodeURIComponent",
  "encodeURI", "decodeURI", "escape", "unescape", "Infinity", "NaN", "undefined",
  "arguments", "this", "super", "Iterator", "AsyncIterator", "WeakRef",
  "FinalizationRegistry", "AggregateError", "EvalError", "ReferenceError",
  "URIError", "InternalError", "arguments", "ErrorEvent", "PromiseRejectionEvent",
  "PopStateEvent", "StorageEvent", "BeforeUnloadEvent", "CompositionEvent",
  "TouchEvent", "PointerEvent", "AnimationEvent", "TransitionEvent",
  "CSSStyleDeclaration", "CSSRule", "CSSStyleSheet", "FontFace", "FontFaceSet",
  "Notification", "GeolocationPosition", "GeolocationPositionError", "screen",
  "frames", "parent", "top", "self", "origin", "name", "close", "open", "focus",
  "blur", "print", "scroll", "scrollTo", "scrollBy", "addEventListener",
  "removeEventListener", "dispatchEvent", "postMessage", "innerWidth", "innerHeight",
  "devicePixelRatio", "getSelection", "createImageBitmap", "reportError",
  "__dirname", "__filename", "CSS", "CSSStyleValue", "DOMMatrix", "DOMMatrixReadOnly",
  "DOMPoint", "DOMQuad", "DOMException", "NodeFilter", "HTMLLinkElement",
  "HTMLStyleElement", "HTMLScriptElement", "HTMLTemplateElement", "HTMLSlotElement",
  "HTMLIFrameElement", "HTMLParagraphElement", "HTMLSpanElement", "HTMLHeadingElement",
  "HTMLLabelElement", "HTMLOptionElement", "HTMLTableElement", "MediaQueryList",
  "MediaQueryListEvent", "CSSStyleRule", "SpeechSynthesisUtterance", "IDBKeyRange",
  "IDBDatabase", "IDBTransaction", "IDBObjectStore", "IDBRequest", "WebGLRenderingContext",
  "WebGL2RenderingContext", "GPUDevice", "caches", "clients", "registration",
  "BroadcastChannel", "CloseEvent", "ErrorEvent2", "PageTransitionEvent",
  "Animation", "KeyframeEffect", "CustomElementRegistry", "ShadowRoot", "Attr",
  "Comment", "Text", "CharacterData", "ProcessingInstruction", "XMLHttpRequest",
  "DataTransfer", "DataTransferItem", "DataTransferItemList",
  "StaticRange", "Highlight", "HighlightRegistry", "ViewTransition", "CookieStore",
]);

// ---------------------------------------------------------------------------
// main pass
// ---------------------------------------------------------------------------

// CJS default-interop rebindings: name -> require function. These were default
// imports in the original, so they must not become namespace imports.
const globalDefaults = new Map();
for (const m of Object.values(index.defaults || {})) {
  for (const [name, reqFn] of Object.entries(m)) {
    if (!globalDefaults.has(name)) globalDefaults.set(name, reqFn);
  }
}

const stats = { files: 0, jsxRestored: 0, importsAdded: 0, unresolved: new Map(), ghosts: new Map() };
const ambiguous = new Map();
const allImports = {};

function moduleBundle(output) {
  const mod = index.modules.find((m) => m.output === output);
  return mod ? mod.bundle : null;
}

function regionPathFor(output) {
  const mod = index.modules.find((m) => m.output === output);
  return mod ? mod.region_path : null;
}

function parse(file) {
  const code = fs.readFileSync(file, "utf8");
  return parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
    errorRecovery: true,
  });
}

function parseCode(code) {
  return parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
    errorRecovery: true,
  });
}

// ---------------------------------------------------------------------------
// union merge of tree-shaken variants
// ---------------------------------------------------------------------------

/** Top-level names a statement binds. */
function declNames(node) {
  if (t.isVariableDeclaration(node)) {
    const names = [];
    for (const d of node.declarations) {
      names.push(...Object.keys(t.getBindingIdentifiers(d.id)));
    }
    return names;
  }
  if (t.isFunctionDeclaration(node) || t.isClassDeclaration(node)) {
    return node.id ? [node.id.name] : [];
  }
  return [];
}

/** Statements of a parsed module as [key, source text] pairs. */
function statementsOf(ast, code) {
  const out = [];
  for (const node of ast.program.body) {
    let start = node.start;
    const lead = node.leadingComments && node.leadingComments[0];
    if (lead && lead.start < start) start = lead.start;
    const text = code.slice(start, node.end);
    const names = declNames(node);
    const key = names.length
      ? "decl:" + [...new Set(names)].sort().join("|")
      : "text:" + text.replace(/\s+/g, " ").trim();
    out.push([key, text]);
  }
  return out;
}

/**
 * Reconstruct one module from every bundle that shipped a copy.
 *
 * rolldown tree-shakes each entry point independently, so the same source file
 * can appear as a 74-line region in the renderer and a 22-line one in main —
 * and neither is necessarily complete on its own. Since tree-shaking only ever
 * *removes* code, the union of the variants' top-level statements is the
 * closest thing to the original module available. Names, not text, decide
 * identity: the same function differs cosmetically between bundles.
 */
function moduleSource(output) {
  const base = fs.readFileSync(rawInputPath(output), "utf8");
  const merged = (index.merged || {})[output];
  if (!merged) return base;

  let baseAst;
  try {
    baseAst = parseCode(base);
  } catch {
    return base;
  }
  const kept = statementsOf(baseAst, base);
  const seen = new Set(kept.map(([k]) => k));
  let added = 0;

  for (const v of merged.variants) {
    const altFile = path.join(ROOT, "_alt", v.bundle, output);
    if (!fs.existsSync(altFile)) continue;
    const code = fs.readFileSync(altFile, "utf8");
    let ast;
    try {
      ast = parseCode(code);
    } catch {
      continue;
    }
    for (const [key, text] of statementsOf(ast, code)) {
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push([key, text]);
      added++;
    }
  }
  merged.keptFromSmallerVariants = added;
  return kept.map(([, text]) => text).join("\n");
}

// Register previously discovered spills as ordinary modules, so they are
// reconstructed and imported exactly like everything else.
const redirectSpec = new Map();

if (fs.existsSync(SPILLS_FILE)) {
  for (const s of JSON.parse(fs.readFileSync(SPILLS_FILE, "utf8"))) {
    if (s.defunct) continue;
    const dest = path.join(RAW, s.name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, s.src + "\n");
    if (s.redirect) {
      for (const n of s.names) redirectSpec.set(n, s.redirect);
      continue;
    }
    index.modules.push({
      bundle: "spill",
      region_path: s.name,
      output: s.name,
      lines: s.src.split("\n").length,
      declarations: [...s.src.matchAll(/^(?:var|let|const|function|class|async function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]),
      imports: [],
      inlined_deps: [],
    });
  }
  // The symbol table is built from index.modules, so it has to be rebuilt now
  // that spills are part of it.
  symbolOwner.clear();
  buildSymbolTable();
}

const files = index.modules.map((m) => m.output);
const records = [];

for (const output of files) {
  const regionPath = regionPathFor(output);
  // Interop bindings are looked up per region first, then per bundle: a var
  // declared in a sibling region of the same bundle is visible here, but the
  // same name in another bundle is a different package entirely.
  const aliases = index.aliases[regionPath] || {};
  const bundleAliases = (index.bundle_aliases || {})[moduleBundle(output)] || {};
  const code = moduleSource(output);
  let ast;
  try {
    ast = parseCode(code);
  } catch (err) {
    stats.unresolved.set(output, `parse failed: ${err.message}`);
    continue;
  }

  // 1. Restore JSX first so the scope pass sees final identifier usage.
  let jsxCount = 0;
  const restore = (p) => {
    let callee = p.node.callee;
    if (t.isSequenceExpression(callee)) {
      callee = callee.expressions[callee.expressions.length - 1];
    }
    if (
      !t.isMemberExpression(callee) ||
      !t.isIdentifier(callee.object) ||
      !/^import_(jsx|react)/.test(callee.object.name) ||
      !JSX_FNS.has(callee.property.name) ||
      !p.node.arguments.length
    ) {
      return;
    }
    // A lowercase identifier tag cannot be written as JSX: React reads a
    // lowercase tag as a host element. rolldown renames colliding component
    // bindings to things like `n$15`, so leave those as calls -- the JSX
    // meaning would silently change from component to <n$15> DOM node.
    const tag = p.node.arguments[0];
    if (t.isIdentifier(tag) && /^[a-z]/.test(tag.name)) return;
    const el = buildJsx(tag, p.node.arguments[1], p.node.arguments[2], t);
    if (!el) return;
    // The bundler's `/* @__PURE__ */` annotation marked the call site; with the
    // call gone it is just noise on every element.
    const lead = (p.node.leadingComments || []).filter(
      (c) => !c.value.includes("@__PURE__")
    );
    el.leadingComments = lead.length ? lead : null;
    p.replaceWith(el);
    jsxCount++;
  };
  try {
    traverse(ast, { CallExpression: restore });
  } catch (err) {
    stats.unresolved.set(output, `jsx pass: ${err.message}`);
  }
  if (jsxCount) stats.jsxRestored++;

  // 2. Find free identifiers that must come from another module. Use babel's
  // ReferencedIdentifier virtual type: a plain Identifier visitor misses
  // JSXIdentifier, which is how every restored component tag appears.
  const free = new Set();
  try {
    traverse(ast, {
      Program(p) {
        p.traverse({
          ReferencedIdentifier(ip) {
            const name = ip.node.name;
            if (ip.scope.hasBinding(name)) return;
            if (GLOBALS.has(name)) return;
            free.add(name);
          },
        });
        p.stop();
      },
    });
  } catch (err) {
    stats.unresolved.set(output, `scope pass: ${err.message}`);
  }

  const specs = new Map(); // specifier -> { ns:Set, named:Set, default:Set }
  const namedOrigin = new Map(); // imported name -> module that defines it
  const externalOrigin = new Map(); // imported name -> dependency region path

  // Vite injects its own `__vitePreload` into any module with a dynamic import,
  // so binding the recovered helper under that exact name would be a duplicate
  // declaration. Bind it as an alias and rename the references to match.
  const LOCAL_PRELOAD = "__lg_vitePreload";
  if (free.delete("__vitePreload")) {
    traverse(ast, {
      Identifier(p) {
        if (p.node.name === "__vitePreload" && p.isReferencedIdentifier()) {
          p.node.name = LOCAL_PRELOAD;
        }
      },
    });
    const helper = index.modules.find(
      (m) => m.output === "src/renderer/vite-preload-helper.ts"
    );
    const helperSpec = specifierForDep(
      helper ? helper.region_path : "src/renderer/vite-preload-helper.ts",
      regionPath
    );
    if (helperSpec) {
      if (!specs.has(helperSpec)) {
        specs.set(helperSpec, { ns: new Set(), named: new Set(), default: new Set() });
      }
      specs.get(helperSpec).named.add(`__vitePreload as ${LOCAL_PRELOAD}`);
      // The alias hides the real name from the export inference, so record it
      // explicitly or the helper would never mark `__vitePreload` public.
      if (helper) namedOrigin.set("__vitePreload", helper.region_path);
    }
  }
  const add = (spec, kind, name) => {
    if (!spec) return;
    if (!specs.has(spec)) {
      specs.set(spec, { ns: new Set(), named: new Set(), default: new Set() });
    }
    specs.get(spec)[kind].add(name);
  };

  const depCandidates = (name) => {
    const c = depSymbol.get(name);
    if (!c) return [];
    return Array.isArray(c) ? c : [c];
  };

  // A name declared in more than one bundled package cannot be resolved from
  // the symbol table alone -- `is`, `path` and `fs` each appear in hundreds of
  // them. Defer those until the rest of the file is resolved, then prefer a
  // package this file already imports.
  const deferred = [...free].filter((n) => depCandidates(n).length > 1);
  const deferredSet = new Set(deferred);

  const resolveName = (name, fromDeferred) => {
    if (deferredSet.has(name) && !fromDeferred) return;
    // A spilled region that turned out to be an installed package's file.
    if (redirectSpec.has(name)) {
      add(redirectSpec.get(name), name.endsWith("_default") ? "default" : "named", name);
      return;
    }
    // A Vite asset default export.
    if (assetDefault.has(name)) {
      add(relativeAssetSpecifier(assetDefault.get(name), regionPath), "default", name);
      return;
    }
    // A default-interop rebinding of a dependency.
    if (globalDefaults.has(name)) {
      const reqFn = globalDefaults.get(name);
      const dep = index.require_defs[reqFn] ?? index.require_defs[globalAlias.get(reqFn)];
      const spec = specifierForDep(dep, regionPath);
      if (spec) add(spec, "default", name);
      else stats.unresolved.set(`${output}:${name}`, `default interop ${reqFn} unresolved`);
      return;
    }
    // interop alias, e.g. import_react -> require_react -> .../react/index.js
    if (aliases[name] || bundleAliases[name] || globalAlias.has(name) || /^import_/.test(name)) {
      const raw = aliases[name] ?? bundleAliases[name] ?? globalAlias.get(name);
      const reqFns = Array.isArray(raw) ? raw : raw ? [raw] : [];
      let dep = null;
      if (reqFns.length === 1) {
        dep = index.require_defs[reqFns[0]];
      } else if (reqFns.length > 1) {
        // A wrapper spanning several internal modules: the package is whichever
        // one most of them belong to, not whichever came first.
        const counts = new Map();
        for (const rf of reqFns) {
          const p = index.require_defs[rf];
          const s = p ? specifierForNodeModules(p) : null;
          if (!s) continue;
          const e = counts.get(s) || { n: 0, path: p };
          e.n++;
          counts.set(s, e);
        }
        let best = null;
        for (const e of counts.values()) if (!best || e.n > best.n) best = e;
        dep = best ? best.path : null;
      }
      const spec = specifierForDep(dep, regionPath);
      if (spec) add(spec, "ns", name);
      else if (!GLOBALS.has(name)) {
        stats.unresolved.set(`${output}:${name}`, `alias ${reqFns.join(",")} unresolved`);
      }
      return;
    }
    const owners = symbolOwner.get(name);
    if (owners && owners.length) {
      const uniq = [...new Set(owners)];
      const mine = areaOf(regionPath);
      const sameArea = uniq.filter((u) => areaOf(u) === mine);
      let pool = sameArea.length ? sameArea : uniq;
      if (!sameArea.length && mine && mine.startsWith("src:")) {
        // A renderer or preload file can never import the main process (or each
        // other), so drop owners from any other src/ process before choosing.
        const crossProcess = pool.filter((u) => {
          const a = areaOf(u);
          return !(a && a.startsWith("src:"));
        });
        if (crossProcess.length) pool = crossProcess;
      }
      if (pool.length > 1) ambiguous.set(`${output}:${name}`, pool.length);
      const owner = pool[0];
      const spec = specifierForDep(owner, regionPath);
      if (spec) {
        add(spec, "named", name);
        // Keep the raw region path: it is the key space the module records use.
        namedOrigin.set(name, owner);
      }
      return;
    }
    // Node / Electron builtins outrank the dependency table: `path` and `fs`
    // are declared in hundreds of bundled packages as well, and first-wins
    // would import one of those instead of the runtime module.
    const ext = externals.get(name);
    if (ext) {
      add(ext, "ns", name);
      return;
    }
    const cands = depCandidates(name);
    if (cands.length) {
      const withSpec = cands
        .map((c) => ({ c, s: specifierForNodeModules(c) }))
        .filter((x) => x.s);
      if (!withSpec.length) return;
      let pick = withSpec[0];
      if (withSpec.length > 1) {
        ambiguous.set(`${output}:${name}`, withSpec.length);
        // Score rather than trust one signal. `nanoid` is exported by both the
        // nanoid package and zod's internals; `hc` is declared but not exported
        // by hono's root entry. A candidate whose package is named after the
        // symbol, or whose file really exports it, wins.
        const known = new Set(specs.keys());
        const isSubpath = (s) =>
          s.split("/").length > (s.startsWith("@") ? 2 : 1);
        const score = (x) => {
          const parts = regionParts(x.c);
          let s = 0;
          if (parts && parts.pkg === name) s += 4;
          if (parts && fileExportsName(parts.pkg, parts.sub, name)) s += 2;
          if (isSubpath(x.s)) s += 1;
          if (known.has(x.s)) s += 1;
          return s;
        };
        pick = withSpec.reduce((a, b) => (score(b) > score(a) ? b : a));
      }
      // rolldown names a default import `<entry>_default`; emitting it as a
      // named import would ask for an export that does not exist.
      // The path-derived specifier can point at a file that does not export
      // this name; fall back to whichever export key does.
      let spec = pick.s;
      const owner = regionParts(pick.c);
      if (owner) {
        const pub = publicExportName(name, pick.c, aliasFor(spec, pick.c));
        // A default export is not a named one, so `specExportsName` always
        // fails for it -- running the fallbacks would replace a correct
        // specifier with an arbitrary package that declares the same binding.
        if (pub !== "default" && !specExportsNameCached(spec, pub)) {
          const better =
            specifierExportingName(owner.pkg, pub) ||
            storePackageDeclaring(pub) ||
            // Declared in this region but actually exported by another package
            // that got inlined alongside it.
            specifierForGhostName(pub, owner.pkg);
          if (better) spec = better;
        }
      }
      add(spec, name.endsWith("_default") ? "default" : "named", name);
      if (!name.endsWith("_default")) externalOrigin.set(name, pick.c);
      // A name the package does not actually export came from code rolldown
      // inlined without a region header, so it has no file in this tree.
      {
        const parts = regionParts(pick.c);
        const alias = aliasFor(pick.s, pick.c);
        // Compare the name that will actually be emitted: for a minified
        // dependency that is the public name, not the inlined local one.
        const pub = publicExportName(name, pick.c, alias);
        const known =
          (alias && (alias.has(name) || alias.has(pub))) ||
          (parts && fileExportsName(parts.pkg, parts.sub, pub)) ||
          reachableFromPackage(parts.pkg, pub) ||
          specExportsName(pick.s, pub);
        if (!known) stats.ghosts.set(`${output}:${name}`, { region: pick.c, spec: pick.s });
      }
      return;
    }
    if (!GLOBALS.has(name) && /^[A-Za-z_$]/.test(name)) {
      stats.unresolved.set(`${output}:${name}`, "no owner in bundle");
    }
  };

  for (const name of free) resolveName(name, false);
  for (const name of deferred) resolveName(name, true);

  // 3. Import statements are built in the write pass, once every file has been
  // analysed and the real export list of each package is known.
  const externalSpecs = [...specs.keys()]
    .filter((s) => !s.startsWith(".") && !isWorkspaceSpecifier(s))
    .map((s) => s.split("/").slice(0, s.startsWith("@") ? 2 : 1).join("/"));
  allImports[output] = {
    region_path: regionPath,
    specifiers: [...specs.keys()].sort(),
    packages: [...new Set(externalSpecs)].sort(),
  };

  let body;
  try {
    body = generate(
      ast,
      { comments: true, retainLines: false, jsescOption: { minimal: true } },
      code
    ).code;
  } catch (err) {
    stats.unresolved.set(output, `generate: ${err.message}`);
    continue;
  }

  // The build strips `export` keywords, so which bindings are public has to be
  // inferred from who imports them. Writing is deferred until every module has
  // been analysed, because a module's exports are determined by its *importers*.
  records.push({
    output,
    regionPath,
    body,
    specs,
    externalOrigin,
    namedOrigin,
    // Read declared names off the final AST, not the per-bundle metadata: a
    // declaration present only in another bundle's tree-shaken variant still
    // belongs to this module and still has to be exportable.
    declared: new Set(ast.program.body.flatMap(declNames)),
  });
  stats.importsAdded += 1;
}

// ---------------------------------------------------------------------------
// exports and package barrels
// ---------------------------------------------------------------------------

/** output path -> the set of its top-level names that other modules import. */
const outputsByRegion = new Map();
for (const rec of records) outputsByRegion.set(rec.regionPath, rec.output);

const exportsByOutput = new Map();
for (const rec of records) {
  for (const [name, owner] of rec.namedOrigin) {
    const ownerOutput = outputsByRegion.get(owner);
    if (!ownerOutput) continue;
    if (!exportsByOutput.has(ownerOutput)) exportsByOutput.set(ownerOutput, new Set());
    exportsByOutput.get(ownerOutput).add(name);
  }
}

for (const rec of records) {
  const exported = exportsByOutput.get(rec.output);
  if (!exported || !exported.size) continue;
  const ok = [...exported].filter((n) => rec.declared.has(n)).sort();
  if (!ok.length) continue;
  rec.body += `\n\nexport { ${ok.join(", ")} };`;
}

// The four workspace barrel files were tree-shaken away: a module that only
// re-exports produces no code, so rolldown emitted no region for it. Every
// cross-package import in the tree resolves to one, so rebuild them from the
// symbols those imports actually name.
const barrels = new Map(); // package -> Map(name -> cleaned owner path)
for (const rec of records) {
  for (const [name, owner] of rec.namedOrigin) {
    const cleanOwner = cleanPath(owner);
    const pkg = packageOf(cleanOwner);
    if (!pkg) continue;
    if (!barrels.has(pkg)) barrels.set(pkg, new Map());
    barrels.get(pkg).set(name, cleanOwner);
  }
}

// A handful of modules shell out to Node (claudeMerge spawns the `claude`
// binary, projectScanner reads the filesystem). The main process needs them;
// the browser build cannot even load them. Emitting a second barrel without
// them keeps the renderer out of Node-only code, which is exactly how the
// shipped renderer bundle ends up without claudeMerge.
const NODE_BUILTINS = new Set([
  "assert", "buffer", "child_process", "crypto", "dns", "events", "fs",
  "fs/promises", "http", "http2", "https", "net", "os", "path", "perf_hooks",
  "process", "querystring", "readline", "stream", "timers", "tls", "tty",
  "url", "util", "v8", "worker_threads", "zlib",
]);

const isNodeOnly = (rec) =>
  [...rec.specs.keys()].some(
    (s) => s.startsWith("node:") || NODE_BUILTINS.has(s.split("/")[0])
  );

let barrelCount = 0;
for (const [pkg, names] of barrels) {
  const byModule = new Map();
  for (const [name, owner] of names) {
    if (!byModule.has(owner)) byModule.set(owner, []);
    byModule.get(owner).push(name);
  }
  const barrelDir = `packages/${pkg}/src`;
  const linesFor = (keep) => {
    const lines = [];
    for (const [owner, list] of [...byModule.entries()].sort()) {
      const target = outputsByRegion.get(owner) || owner;
      const rec = records.find((r) => r.output === target);
      if (!keep(target, rec)) continue;
      let rel = path.posix.relative(barrelDir, owner).replace(/\.(tsx?|jsx?)$/, "");
      if (!rel.startsWith(".")) rel = `./${rel}`;
      lines.push(`export { ${list.sort().join(", ")} } from ${JSON.stringify(rel)};`);
    }
    return lines;
  };

  const header = [
    "/*",
    " * Reconstructed barrel: the original was tree-shaken out of the bundle,",
    " * since a module that only re-exports emits no code. Rebuilt from the",
    " * symbols the rest of the tree imports from this package. See RECOVERY.md.",
    " */",
  ];

  for (const [file, keep] of [
    ["index.ts", () => true],
    ["index.browser.ts", (target, rec) => !rec || !isNodeOnly(rec)],
  ]) {
    const body = linesFor(keep);
    if (file === "index.browser.ts" && !body.length) continue;
    const extra =
      file === "index.browser.ts"
        ? ["/* Browser entry: omits modules that cannot load without Node. */"]
        : [];
    const dest = outputPath(path.join(barrelDir, file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, [...header, ...extra, ...body].join("\n") + "\n");
    barrelCount++;
  }
}

for (const rec of records) {
  const outFile = outputPath(rec.output);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const banner = [
    "/*",
    ` * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.`,
    ` * Original module: ${rec.regionPath}`,
    " *",
    " * The build erased TypeScript types, lowered JSX, and ran React Compiler, so",
    " * this is build output with the build's own rewrites undone -- not the",
    " * author's original file. See luna/RECOVERY.md.",
    " */",
    "",
  ].join("\n");

  const decls = [];
  for (const [spec, { ns, named, default: def }] of [...rec.specs.entries()].sort()) {
    const isExternal = !spec.startsWith(".") && !isWorkspaceSpecifier(spec);
    for (const n of [...def].sort()) {
      decls.push(`import ${n} from ${JSON.stringify(spec)};`);
    }
    for (const n of [...ns].sort()) {
      decls.push(`import * as ${n} from ${JSON.stringify(spec)};`);
    }
    if (named.size) {
      const parts = [...named].sort().map((n) => {
        if (!isExternal) return n;
        const real = publicExportName(n, rec.externalOrigin.get(n), aliasFor(spec, rec.externalOrigin.get(n)));
        return real === n ? n : `${real} as ${n}`;
      });
      decls.push(`import { ${parts.join(", ")} } from ${JSON.stringify(spec)};`);
    }
  }

  // Vite's code splitting rewrote dynamic imports to emitted chunk filenames
  // (`import("./es-fzqryS3e.js")`). Point them back at the module or package
  // the chunk actually contains.
  const chunkMap = index.chunks || {};
  const rewrittenBody = rec.body.replace(
    /import\(\s*(["'])\.\/([\w.-]+\.js)\1\s*\)/g,
    (whole, _q, file) => {
      const target = chunkMap[file];
      if (!target) return whole;
      const spec = target.startsWith("../../") || target.startsWith("src/")
        ? specifierForDep(target, rec.regionPath)
        : target;
      return `import(${JSON.stringify(spec)})`;
    }
  );

  fs.writeFileSync(
    outFile,
    (banner +
      decls.join("\n") +
      (decls.length ? "\n\n" : "\n") +
      rewrittenBody +
      "\n"
    ).replace(/\/\* @__PURE__ \*\/\s*/g, "")
  );
  stats.files++;
  stats.importsAdded += decls.length;
}

// ---------------------------------------------------------------------------
// inlined-without-a-header modules
// ---------------------------------------------------------------------------

/**
 * Some modules never got a `//#region` header, so their code sits at the end of
 * the *previous* region and belongs to a package that does not contain it.
 * `index_default` (a TipTap StarterKit extension) is the clearest example: the
 * bundle has its source, but inside the prosemirror-history region.
 *
 * This slices such a module back out and returns it as source, so the next
 * rebuild can treat it as a module of its own.
 */
function extractSpill(regionPath, names) {
  const span = (index.dep_lines || {})[regionPath];
  if (!span) return null;
  const [file, start, end] = span;
  let lines;
  try {
    lines = fs.readFileSync(path.join(APP_OUT, file), "utf8").split("\n");
  } catch {
    return null;
  }
  const body = lines.slice(start, end);
  let from = -1;
  for (let i = 0; i < body.length && from < 0; i++) {
    const m = /^(?:var|let|const|function|class|async function)\s+([A-Za-z_$][\w$]*)/.exec(body[i]);
    if (m && names.has(m[1])) from = i;
  }
  if (from < 0) return null;
  const src = body.slice(from).join("\n").trimEnd();
  return src.trim() ? src : null;
}

const spillName = (regionPath) =>
  "recovered/" +
  regionPath
    .replace(/^\.\.\/\.\.\/node_modules\/\.pnpm\/[^/]+\/node_modules\//, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/\.[a-z]+$/, "") +
  "-spill.ts";

if (DISCOVER) {
  // Keyed by name: a later discovery of the same region starts further back and
  // supersedes the earlier, narrower slice.
  const byName = new Map();
  const redirectSpec = new Map();

if (fs.existsSync(SPILLS_FILE)) {
    for (const s of JSON.parse(fs.readFileSync(SPILLS_FILE, "utf8"))) {
      byName.set(s.name, s);
    }
  }
  const raw = [...byName.values()];
  const already = new Set(raw.filter((s) => !s.defunct).map((s) => s.name));
  const byRegion = new Map();
  for (const [key, g] of stats.ghosts) {
    const name = key.slice(key.indexOf(":") + 1);
    if (already.has(name)) continue;
    // A name the region's OWN package file declares is not a spill. Slicing
    // from it would cut off everything earlier in the module -- locals like
    // `_excluded` and the helper imports they need -- and those would then be
    // re-resolved as imports from elsewhere.
    const owner = regionParts(g.region);
    if (
      owner &&
      (fileDeclaresName(owner.pkg, owner.sub, name) ||
        specExportsNameCached(g.spec, name))
    ) {
      continue;
    }
    if (!byRegion.has(g.region)) byRegion.set(g.region, new Set());
    byRegion.get(g.region).add(name);
  }
  let added = 0;
  for (const [region, names] of byRegion) {
    const src = extractSpill(region, names);
    if (!src) continue;
    const name = spillName(region);
    const overridden = [...names].map((n) => SPILL_REDIRECTS[n]).find(Boolean);
    if (overridden) {
      byName.set(name, { name, region, names: [...names], redirect: overridden });
      added++;
      continue;
    }
    // If this text is verbatim an installed package's entry file, the region
    // was inlined from that package -- import from it instead of re-creating it.
    const matched = packageMatchingText(src);
    if (matched) {
      byName.set(name, { name, region, names: [...names], redirect: matched });
      added++;
      continue;
    }
    const prev = byName.get(name);
    if (prev && prev.src === src) continue;
    byName.set(name, { name, region, names: [...names], src });
    added++;
  }
  const out = [...byName.values()];
  fs.writeFileSync(SPILLS_FILE, JSON.stringify(out, null, 1));
  console.log(`discovered ${added} spilled modules (${out.length} total)`);
  process.exit(0);
}

const report = {
  files: stats.files,
  barrelsRebuilt: barrelCount,
  filesWithJsxRestored: stats.jsxRestored,
  importStatements: stats.importsAdded,
  ambiguousSymbols: Object.fromEntries(ambiguous),
  unresolved: Object.fromEntries(stats.unresolved),
  unresolvedCount: stats.unresolved.size,
  ghostSymbols: Object.fromEntries(stats.ghosts),
  ghostCount: stats.ghosts.size,
};
// An isolated validation run must not rewrite the checked-in recovery evidence.
if (!OUTPUT_OPTION) {
  fs.writeFileSync(path.join(HERE, "rebuild-report.json"), JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(HERE, "imports.json"), JSON.stringify(allImports, null, 1));
}

console.log(`rebuilt ${report.files} files (+${barrelCount} barrels)`);
console.log(`  JSX restored in:   ${report.filesWithJsxRestored}`);
console.log(`  import statements: ${report.importStatements}`);
console.log(`  ambiguous symbols: ${Object.keys(report.ambiguousSymbols).length}`);
console.log(`  unresolved refs:   ${report.unresolvedCount}`);
console.log(`  ghost symbols:     ${report.ghostCount}`);
