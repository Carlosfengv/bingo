/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/projectScanner.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { isLikelyIconLibraryPackage } from "./settingsParser";
import { scanCssThemeModes, themeRevision } from "./theme";
import * as fs$7 from "fs";
import * as fs_promises from "fs/promises";
import * as path$31 from "path";

/**
* Project Scanner — deterministic pre-pass for "Import from Project"
*
* Reads a user's React codebase root and emits a structured ProjectMap that
* captures everything the import flow needs WITHOUT AI: stack, tokens, fonts,
* icon pack, candidate components, provider stack, path aliases.
*
* Designed to run in a few seconds even on large repos. Uses cheap operations
* only — fs walks, regex, JSON parses, and (for Tailwind v3 configs) dynamic
* import. No ts-morph, no full type resolution.
*
* Workflow: packages/compiler/skills/bingo-import-from-project/SKILL.md
*/
/** Derive a PascalCase component name from an `.astro` file path (mirrors project-builder). */
function astroComponentName(filePath) {
  const cleaned = (filePath.split("/").pop() || "Component").replace(/\.astro$/, "").replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => c ? c.toUpperCase() : "");
  const name = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /^[A-Za-z]/.test(name) ? name : `C${name}`;
}
var DEFAULT_EXCLUDES = ["node_modules", ".next", ".nuxt", "dist", "build", ".turbo", ".git", "coverage", ".cache", ".vercel", ".netlify", "out"];
async function scanProject(rootPath, options = {}) {
  const start = Date.now();
  const warnings = [];
  const opts = {
    maxFiles: options.maxFiles ?? 5e3,
    maxBytesPerFile: options.maxBytesPerFile ?? 2e5,
    excludeDirs: options.excludeDirs ?? DEFAULT_EXCLUDES
  };
  const scanRoots = await findScanRoots(rootPath, opts.excludeDirs);
  let root;
  if (options.explicitRoot && fs$7.existsSync(path$31.join(rootPath, "package.json"))) {
    root = rootPath;
  } else if (scanRoots.length === 0) {
    warnings.push(`No package.json found under ${rootPath}. Treating as a CSS-only / design-token project — stack will be 'unknown' and the importer will use the synthesis (Tier 2) path.`);
    root = rootPath;
  } else root = pickBestScanRoot(scanRoots, rootPath, warnings);
  const pkg = await readJsonSafe(path$31.join(root, "package.json"), warnings);
  const tsconfig = await mergeTsconfigs(root, warnings);
  const stack = detectStack(pkg);
  const tier = stack.styling.includes("tailwindcss") ? "tailwind" : "translated";
  const pathAliases = extractPathAliases(tsconfig, root);
  const allFiles = await walkFiles(root, opts.excludeDirs, opts.maxFiles);
  const sourceFiles = allFiles.filter(f => /\.(tsx?|jsx?|mjs|cjs|astro)$/.test(f) && !/\.(test|spec|stories)\./.test(f) && !/\.d\.ts$/.test(f) && !/\/route\.(tsx?|jsx?)$/.test(f));
  const cssFiles = allFiles.filter(f => /\.(css|scss|sass)$/.test(f));
  const tokens = await extractTokens(root, allFiles, cssFiles, stack, warnings);
  const fonts = await extractFonts(root, allFiles, cssFiles, stack, warnings);
  const iconPack = await detectIconPack(sourceFiles, opts.maxBytesPerFile);
  const components = await scanComponents(root, sourceFiles, opts.maxBytesPerFile, pathAliases, warnings);
  const providerStack = await extractProviderStack(root, sourceFiles, opts.maxBytesPerFile, warnings);
  const summary = extractSummary(pkg, allFiles, root, warnings);
  return {
    rootPath: root,
    scanDurationMs: Date.now() - start,
    tier,
    stack,
    projectName: pkg?.name ?? path$31.basename(root),
    pathAliases,
    tokens,
    fonts,
    iconPack,
    components,
    providerStack,
    summary,
    warnings
  };
}
async function findScanRoots(rootPath, excludes) {
  const found = [];
  const walk = async (dir, depth) => {
    if (depth > 4) return;
    let entries;
    try {
      entries = await fs_promises.readdir(dir, {
        withFileTypes: true
      });
    } catch {
      return;
    }
    if (entries.some(e => e.isFile() && e.name === "package.json")) found.push(dir);
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (excludes.includes(e.name)) continue;
      if (e.name.startsWith(".")) continue;
      await walk(path$31.join(dir, e.name), depth + 1);
    }
  };
  await walk(rootPath, 0);
  return found;
}
function pickBestScanRoot(roots, userPath, warnings) {
  if (roots.length === 1) return roots[0];
  const scored = roots.map(r => {
    let score = 0;
    try {
      const pkg = JSON.parse(fs$7.readFileSync(path$31.join(r, "package.json"), "utf8"));
      const deps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {})
      };
      if (deps["tailwindcss"]) score += 10;
      if (deps["@radix-ui/react-slot"]) score += 5;
      if (deps["class-variance-authority"]) score += 5;
      if (deps["next"]) score += 3;
      if (deps["vite"]) score += 2;
      if (deps["react"]) score += 1;
    } catch {}
    const depth = path$31.relative(userPath, r).split(path$31.sep).length;
    score -= depth;
    return {
      root: r,
      score
    };
  });
  scored.sort((a, b) => b.score - a.score);
  if (roots.length > 1) warnings.push(`Multiple package.json found (${roots.length}); picked ${path$31.relative(userPath, scored[0].root) || "."}`);
  return scored[0].root;
}
function detectStack(pkg) {
  const deps = {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {})
  };
  const styling = [];
  if (deps["tailwindcss"]) styling.push("tailwindcss");
  if (deps["@emotion/react"] || deps["@emotion/styled"]) styling.push("emotion");
  if (deps["styled-components"]) styling.push("styled-components");
  if (deps["@vanilla-extract/css"]) styling.push("vanilla-extract");
  if (deps["@stitches/react"]) styling.push("stitches");
  if (deps["@pandacss/dev"]) styling.push("panda");
  if (deps["@mui/material"]) styling.push("mui");
  if (deps["antd"]) styling.push("antd");
  if (deps["@chakra-ui/react"]) styling.push("chakra");
  const framework = deps["next"] ? "next" : deps["vite"] ? "vite" : deps["@remix-run/react"] ? "remix" : deps["react-scripts"] ? "cra" : "unknown";
  let tailwindVersion;
  if (deps["tailwindcss"]) {
    const major = String(deps["tailwindcss"]).match(/(\d+)/);
    if (major) tailwindVersion = Number(major[1]) >= 4 ? "4" : "3";else tailwindVersion = "3";
  }
  const hasShadcn = !!(deps["class-variance-authority"] && Object.keys(deps).some(k => k.startsWith("@radix-ui/")));
  let name = "unknown";
  if (styling.includes("tailwindcss")) name = hasShadcn ? "tailwind+shadcn" : "tailwind";else if (styling.length > 0) name = styling.join("+");
  return {
    name,
    framework,
    tailwindVersion,
    hasShadcn,
    styling
  };
}
function extractPathAliases(tsconfig, _root) {
  const aliases = {};
  const paths = tsconfig?.compilerOptions?.paths;
  if (!paths || typeof paths !== "object") return aliases;
  for (const [pattern, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets) || targets.length === 0) continue;
    const cleanPattern = pattern.replace(/\*$/, "");
    aliases[cleanPattern] = String(targets[0]).replace(/\*$/, "");
  }
  return aliases;
}
async function walkFiles(root, excludes, maxFiles) {
  const out = [];
  const stack = [root];
  while (stack.length > 0 && out.length < maxFiles) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs_promises.readdir(dir, {
        withFileTypes: true
      });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") && e.name !== ".") continue;
      if (excludes.includes(e.name)) continue;
      const full = path$31.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);else if (e.isFile()) {
        out.push(full);
        if (out.length >= maxFiles) break;
      }
    }
  }
  return out;
}
async function extractTokens(root, allFiles, cssFiles, stack, warnings) {
  const tokens = {
    semantic: {},
    scales: [],
    modes: {}
  };
  if (stack.tailwindVersion === "4" || cssFiles.length > 0) for (const cssFile of cssFiles) try {
    const content = await fs_promises.readFile(cssFile, "utf8");
    const scannedThemes = scanCssThemeModes(content, path$31.relative(root, cssFile));
    for (const [mode, values] of Object.entries(scannedThemes.modes)) {
      tokens.modes[mode] = { ...(tokens.modes[mode] ?? {}), ...values };
    }
    const themeBlocks = content.matchAll(/@theme(?:\s+inline)?\s*\{([\s\S]*?)\n\}/g);
    for (const m of themeBlocks) {
      const varMatches = m[1].matchAll(/--([\w-]+):\s*([^;]+);/g);
      for (const vm of varMatches) {
        const name = vm[1].trim();
        const value = vm[2].trim();
        if (name.startsWith("color-")) {
          const semName = name.slice(6);
          tokens.semantic[semName] = value;
        }
      }
    }
    const rootBlocks = content.matchAll(/(?::root|\.dark|\[data-theme[^\]]*\])\s*\{([\s\S]*?)\n\}/g);
    for (const m of rootBlocks) {
      const varMatches = m[1].matchAll(/--([\w-]+):\s*([^;]+);/g);
      for (const vm of varMatches) {
        const name = vm[1].trim();
        const value = vm[2].trim();
        if (!(name in tokens.semantic)) tokens.semantic[name] = value;
      }
    }
  } catch (e) {
    warnings.push(`Failed to parse CSS ${path$31.relative(root, cssFile)}: ${e.message}`);
  }
  if (stack.tailwindVersion === "3") for (const c of ["tailwind.config.ts", "tailwind.config.js", "tailwind.config.mjs", "tailwind.config.cjs"]) {
    const configPath = path$31.join(root, c);
    if (!fs$7.existsSync(configPath)) continue;
    try {
      const colorsBlock = (await fs_promises.readFile(configPath, "utf8")).match(/colors\s*:\s*\{([\s\S]*?)\n\s*\}/);
      if (colorsBlock) {
        const entries = colorsBlock[1].matchAll(/(['"]?)([\w-]+)\1\s*:\s*(['"])([^'"]+)\3/g);
        for (const e of entries) {
          const name = e[2];
          const value = e[4];
          if (!(name in tokens.semantic)) tokens.semantic[name] = value;
        }
      }
    } catch (e) {
      warnings.push(`Failed to parse ${c}: ${e.message}`);
    }
    break;
  }
  const scaleMap = new Map();
  for (const cssFile of cssFiles) try {
    const matches = (await fs_promises.readFile(cssFile, "utf8")).matchAll(/--([a-z]+)-(\d+):\s*([^;]+);/g);
    for (const m of matches) {
      const family = m[1];
      const step = Number(m[2]);
      const hex = m[3].trim();
      if (!Number.isFinite(step)) continue;
      if (!scaleMap.has(family)) scaleMap.set(family, new Map());
      scaleMap.get(family).set(step, hex);
    }
  } catch {}
  for (const [family, shadeMap] of scaleMap) {
    if (shadeMap.size < 3) continue;
    const shades = Array.from(shadeMap.entries()).sort((a, b) => a[0] - b[0]).map(([step, hex]) => ({
      step,
      hex
    }));
    tokens.scales.push({
      name: family,
      shades
    });
  }
  if (!tokens.modes.default) tokens.modes.default = { ...tokens.semantic };
  for (const [name, value] of Object.entries(tokens.modes.default)) {
    if (!(name in tokens.semantic)) tokens.semantic[name] = value;
  }
  tokens.themeRevision = themeRevision(tokens.modes);
  return tokens;
}
async function extractFonts(root, allFiles, cssFiles, _stack, _warnings) {
  const detectedFamilies = [];
  let source = "unknown";
  let display;
  let body;
  let mono;
  const layoutFiles = allFiles.filter(f => /\/(layout|_app|main|App)\.(tsx?|jsx?)$/.test(f));
  for (const file of layoutFiles) try {
    const content = await fs_promises.readFile(file, "utf8");
    if ([...content.matchAll(/from\s+['"]next\/font/g)].length > 0) source = "next/font";
    const fontDecls = content.matchAll(/(?:const|let)\s+(\w+)\s*=\s*([A-Z][\w_]*)\s*\(/g);
    for (const m of fontDecls) {
      const fontName = m[2];
      if (fontName !== "NextFont" && /^[A-Z]/.test(fontName)) detectedFamilies.push(fontName);
    }
  } catch {}
  for (const cssFile of cssFiles) try {
    const content = await fs_promises.readFile(cssFile, "utf8");
    const fontFamilies = content.matchAll(/font-family:\s*([^;}]+)/g);
    for (const m of fontFamilies) {
      const family = m[1].trim().replace(/['"]/g, "").split(",")[0].trim();
      if (family && !detectedFamilies.includes(family)) detectedFamilies.push(family);
    }
    const sansVar = content.match(/--font-sans:\s*([^;]+);/);
    const monoVar = content.match(/--font-mono:\s*([^;]+);/);
    if (sansVar) body = sansVar[1].trim().replace(/['"]/g, "");
    if (monoVar) mono = monoVar[1].trim().replace(/['"]/g, "");
    if (/@import\s+url\(['"]https:\/\/fonts\.googleapis/.test(content)) {
      if (source === "unknown") source = "google-link";
    }
    if (/@font-face\s*\{/.test(content)) {
      if (source === "unknown") source = "self-hosted";
    }
  } catch {}
  if (source === "unknown" && detectedFamilies.length > 0) source = "system";
  if (!body && detectedFamilies[0]) body = detectedFamilies[0];
  if (!display && detectedFamilies[0]) display = detectedFamilies[0];
  return {
    display,
    body,
    mono,
    source,
    detectedFamilies
  };
}
function classifyIconImportPackage(importPath) {
  if (importPath === "lucide-react") return "lucide";
  if (importPath === "@phosphor-icons/react") return "phosphor";
  if (importPath.startsWith("@heroicons/react")) return "heroicons";
  if (importPath === "@tabler/icons-react") return "tabler";
  if (importPath.startsWith("react-icons/")) return "react-icons";
  if (importPath.startsWith("@mui/icons-material")) return "mui-icons";
  return isLikelyIconLibraryPackage(importPath) ? "package" : null;
}
async function detectIconPack(sourceFiles, maxBytes) {
  const packCounts = new Map();
  const iconCounts = new Map();
  let importStatement;
  let detectedPack = "unknown";
  for (const file of sourceFiles) {
    let content;
    try {
      if ((await fs_promises.stat(file)).size > maxBytes) continue;
      content = await fs_promises.readFile(file, "utf8");
    } catch {
      continue;
    }
    const importMatches = content.matchAll(/import\s+(?:type\s+)?([^;'"]*?)\s+from\s+['"]([^'"]+)['"]/g);
    for (const m of importMatches) {
      const detected = classifyIconImportPackage(m[2]);
      if (!detected) continue;
      packCounts.set(detected, (packCounts.get(detected) ?? 0) + 1);
      if (!importStatement) importStatement = m[0].split("\n")[0];
      const clause = m[1].trim();
      const braced = clause.match(/\{([^}]*)\}/);
      if (braced) {
        const names = braced[1].split(",").map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
        for (const n of names) iconCounts.set(n, (iconCounts.get(n) ?? 0) + 1);
      } else if (!clause.startsWith("*")) {
        const def = clause.split(",")[0].trim();
        if (def) iconCounts.set(def, (iconCounts.get(def) ?? 0) + 1);
      }
    }
  }
  if (packCounts.size > 0) detectedPack = [...packCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const commonlyUsed = [...iconCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name]) => name);
  return {
    detected: detectedPack,
    importStatement,
    commonlyUsed
  };
}
async function scanComponents(root, sourceFiles, maxBytes, pathAliases, _warnings) {
  const fileEntries = new Map();
  for (const file of sourceFiles) {
    let content;
    try {
      if ((await fs_promises.stat(file)).size > maxBytes) continue;
      content = await fs_promises.readFile(file, "utf8");
    } catch {
      continue;
    }
    const isAstro = file.endsWith(".astro");
    const exports = [];
    if (isAstro) exports.push(astroComponentName(file));else {
      const defaultMatch = content.match(/export\s+default\s+(?:function\s+|class\s+|const\s+)?([A-Z][\w_]*)/);
      if (defaultMatch) exports.push(defaultMatch[1]);
      const namedMatches = content.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Z][\w_]*)/g);
      for (const m of namedMatches) exports.push(m[1]);
      const reExportMatches = content.matchAll(/export\s+\{([^}]+)\}/g);
      for (const m of reExportMatches) {
        const names = m[1].split(",").map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(n => /^[A-Z]/.test(n));
        exports.push(...names);
      }
    }
    if (exports.length === 0) continue;
    const signals = {
      cva: /\b(?:cva|tv|recipe|defineRecipe)\s*\(/.test(content) || /class-variance-authority/.test(content),
      forwardRef: /forwardRef\s*[<(]/.test(content),
      hasStory: false,
      hasTest: false
    };
    const dir = path$31.dirname(file);
    const base = path$31.basename(file).replace(/\.(tsx?|jsx?|astro)$/, "");
    if (sourceFiles.some(f => path$31.dirname(f) === dir && f.includes(`${base}.stories.`))) signals.hasStory = true;
    if (sourceFiles.some(f => path$31.dirname(f) === dir && (f.includes(`${base}.test.`) || f.includes(`${base}.spec.`)))) signals.hasTest = true;
    const rel = path$31.relative(root, file);
    const noExt = rel.replace(/\.(tsx?|jsx?|astro)$/, "").replace(/\/index$/, "");
    const importablePaths = [rel, noExt, `./${noExt}`];
    for (const [alias, target] of Object.entries(pathAliases)) {
      const cleanTarget = target.replace(/\/$/, "");
      if (noExt.startsWith(cleanTarget + "/")) {
        importablePaths.push(alias.replace(/\/$/, "") + "/" + noExt.slice(cleanTarget.length + 1));
        importablePaths.push(alias + noExt.slice(cleanTarget.length + 1));
      }
    }
    fileEntries.set(file, {
      rel,
      exports: dedupe(exports),
      signals,
      importablePaths
    });
  }
  const componentUniverse = new Set();
  for (const [, e] of fileEntries) for (const ip of e.importablePaths) componentUniverse.add(ip);
  const importFromCounts = new Map();
  const composesOthers = new Set();
  for (const file of sourceFiles) {
    let content;
    try {
      if ((await fs_promises.stat(file)).size > maxBytes) continue;
      content = await fs_promises.readFile(file, "utf8");
    } catch {
      continue;
    }
    const importMatches = content.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g);
    for (const m of importMatches) {
      const spec = m[1];
      let normalized = spec;
      if (spec.startsWith(".")) normalized = path$31.relative(root, path$31.resolve(path$31.dirname(file), spec));
      normalized = normalized.replace(/\.(tsx?|jsx?|astro)$/, "").replace(/\/index$/, "");
      importFromCounts.set(normalized, (importFromCounts.get(normalized) ?? 0) + 1);
      importFromCounts.set(spec, (importFromCounts.get(spec) ?? 0) + 1);
      if (componentUniverse.has(normalized) || componentUniverse.has(spec)) composesOthers.add(file);
    }
  }
  const all = [];
  for (const [file, e] of fileEntries) {
    let importCount = 0;
    for (const ip of e.importablePaths) importCount = Math.max(importCount, importFromCounts.get(ip) ?? 0);
    const category = categorizeComponent(e.rel, e.exports, composesOthers.has(file));
    const name = pickPrimaryName(e.exports, e.rel);
    all.push({
      path: e.rel,
      name,
      exports: e.exports,
      signals: e.signals,
      importCount,
      category
    });
  }
  return {
    primitives: all.filter(c => c.category === "primitive").sort((a, b) => b.importCount - a.importCount),
    composites: all.filter(c => c.category === "composite").sort((a, b) => b.importCount - a.importCount),
    pages: all.filter(c => c.category === "page").sort((a, b) => b.importCount - a.importCount)
  };
}
function categorizeComponent(rel, exports, composesOthers) {
  const lower = rel.toLowerCase();
  if (/\.astro$/.test(lower)) {
    if (/(?:^|\/)pages\//.test(lower)) return "page";
    if (/(?:^|\/)layouts?\//.test(lower)) return "layout";
  }
  if (/(?:^|\/)(?:pages|app|routes)\//.test(rel)) {
    if (/(?:^|\/)page\.(tsx?|jsx?)$/.test(rel) || /(?:^|\/)layout\.(tsx?|jsx?)$/.test(rel) || /(?:^|\/)route\.(tsx?|jsx?)$/.test(rel)) return "page";
  }
  if (/\/_app\.(tsx?|jsx?)$/.test(rel) || /\/main\.(tsx?|jsx?)$/.test(rel) || /\/App\.(tsx?|jsx?)$/.test(rel)) return "layout";
  if (/\/(types|constants|enums|schema|schemas)\.(tsx?|jsx?)$/.test(lower)) return "utility";
  if (exports.every(e => e.startsWith("use"))) return "utility";
  return composesOthers ? "composite" : "primitive";
}
function pickPrimaryName(exports, rel) {
  const base = path$31.basename(rel).replace(/\.(tsx?|jsx?)$/, "").replace(/\/index$/, "");
  const pascalBase = base.charAt(0).toUpperCase() + base.slice(1);
  if (exports.includes(pascalBase)) return pascalBase;
  return exports[0] ?? pascalBase;
}
async function extractProviderStack(root, sourceFiles, maxBytes, warnings) {
  const rootRelativeCandidates = ["app/layout.tsx", "app/layout.jsx", "app/layout.ts", "app/layout.js", "src/app/layout.tsx", "src/app/layout.jsx", "pages/_app.tsx", "pages/_app.jsx", "pages/_app.ts", "pages/_app.js", "src/pages/_app.tsx", "src/pages/_app.jsx", "src/App.tsx", "src/App.jsx", "app/App.tsx", "src/main.tsx", "src/main.jsx"];
  let layoutFile;
  for (const c of rootRelativeCandidates) {
    const p = path$31.join(root, c);
    if (fs$7.existsSync(p)) {
      layoutFile = c;
      break;
    }
  }
  if (!layoutFile) {
    const layoutMatches = sourceFiles.filter(f => /\/(app\/layout|pages\/_app|main|App)\.(tsx?|jsx?)$/.test(f));
    if (layoutMatches.length > 0) {
      const preferred = layoutMatches.find(f => !/mobile|test|e2e/i.test(f)) ?? layoutMatches[0];
      layoutFile = path$31.relative(root, preferred);
    }
  }
  if (!layoutFile) return {
    wrappers: []
  };
  let content;
  try {
    content = await fs_promises.readFile(path$31.join(root, layoutFile), "utf8");
  } catch (e) {
    warnings.push(`Failed to read layout ${layoutFile}: ${e.message}`);
    return {
      layoutFile,
      wrappers: []
    };
  }
  const wrapperNames = new Set();
  const providerJsx = content.matchAll(/<([A-Z][\w_]*(?:Provider|Wrapper))[\s>/]/g);
  for (const m of providerJsx) wrapperNames.add(m[1]);
  for (const w of ["ThemeProvider", "QueryClientProvider", "SessionProvider", "TooltipProvider", "SidebarProvider", "WorkspaceProvider", "AuthProvider", "StoreProvider"]) if (new RegExp(`<${w}[\\s>/]`).test(content)) wrapperNames.add(w);
  const wrappers = [];
  for (const name of wrapperNames) {
    const importMatch = content.match(new RegExp(`import\\s+(?:[^{]*?\\{[^}]*?\\b${name}\\b[^}]*?\\}|${name})\\s+from\\s+['"]([^'"]+)['"]`));
    const from = importMatch ? importMatch[1] : "unknown";
    const propsMatch = content.match(new RegExp(`<${name}\\s+([^>]*)>`));
    const props = {};
    if (propsMatch) {
      const propMatches = propsMatch[1].matchAll(/(\w+)=\{?["']([^"'}]+)["']\}?/g);
      for (const pm of propMatches) props[pm[1]] = pm[2];
    }
    wrappers.push({
      name,
      from,
      props: Object.keys(props).length > 0 ? props : void 0
    });
  }
  return {
    layoutFile,
    wrappers
  };
}
function extractSummary(pkg, allFiles, root, _warnings) {
  const summary = {};
  if (pkg?.description) summary.tagline = pkg.description;
  for (const c of ["app/layout.tsx", "app/layout.jsx", "src/app/layout.tsx", "pages/_app.tsx", "src/pages/_app.tsx"]) {
    const p = path$31.join(root, c);
    if (!fs$7.existsSync(p)) continue;
    try {
      const content = fs$7.readFileSync(p, "utf8");
      const descMatch = content.match(/description:\s*["']([^"']+)["']/);
      if (descMatch && !summary.tagline) summary.tagline = descMatch[1];
      const titleMatch = content.match(/title:\s*["']([^"']+)["']/);
      if (titleMatch && !summary.description) summary.description = titleMatch[1];
    } catch {}
    break;
  }
  if (allFiles.some(f => /\/(logo|icon)\.(png|svg|webp|jpg|jpeg)$/i.test(f))) summary.emoji = "🎨";
  return summary;
}
async function mergeTsconfigs(root, warnings) {
  const candidates = ["tsconfig.json", "tsconfig.base.json", "tsconfig.app.json"];
  let merged = null;
  for (const c of candidates) {
    const cfg = await readJsonSafe(path$31.join(root, c), warnings);
    if (!cfg) continue;
    if (!merged) merged = {
      compilerOptions: {}
    };
    if (cfg.compilerOptions?.paths) merged.compilerOptions.paths = {
      ...(merged.compilerOptions.paths ?? {}),
      ...cfg.compilerOptions.paths
    };
    for (const [k, v] of Object.entries(cfg.compilerOptions ?? {})) if (k !== "paths" && !(k in merged.compilerOptions)) merged.compilerOptions[k] = v;
  }
  return merged;
}
async function readJsonSafe(filePath, warnings) {
  let content;
  try {
    content = await fs_promises.readFile(filePath, "utf8");
  } catch (e) {
    if (e.code !== "ENOENT") warnings.push(`Failed to read ${path$31.basename(filePath)}: ${e.message}`);
    return null;
  }
  try {
    return JSON.parse(content);
  } catch {}
  try {
    const stripTrailingCommas = content.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(stripTrailingCommas);
  } catch (e) {
    warnings.push(`Failed to parse JSON ${path$31.basename(filePath)}: ${e.message}`);
    return null;
  }
}
function dedupe(arr) {
  return Array.from(new Set(arr));
}

export { scanProject };
