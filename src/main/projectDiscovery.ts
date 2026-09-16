import crypto from "node:crypto";
import fs from "node:fs";
import * as fsp from "node:fs/promises";
import path from "node:path";

import { glob } from "tinyglobby";
import { parse as parseYaml } from "yaml";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".bingo",
  ".next",
  ".nuxt",
  ".turbo",
  "dist",
  "build",
  "out",
  "coverage",
  ".cache",
]);
const FALLBACK_CONTAINERS = new Set(["apps", "packages", "libs", "frontend", "web", "client"]);
const WORKSPACE_MARKERS = ["nx.json", "turbo.json", "lerna.json", "rush.json"];
const SUPPORTED_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"]);
const UNSUPPORTED_COMPONENT_EXTENSIONS = new Set([".astro", ".vue", ".svelte"]);
const STYLE_EXTENSIONS = new Set([".css", ".scss", ".sass", ".less"]);
const PROJECT_SOURCE_DIRS = new Set(["src", "app", "components", "pages"]);

class DiscoveryCancelledError extends Error {
  constructor() {
    super("Project discovery was cancelled");
    this.name = "DiscoveryCancelledError";
  }
}

function throwIfCancelled(signal) {
  if (signal?.aborted) throw new DiscoveryCancelledError();
}

function diagnostic(code, severity, message, extra = {}) {
  return { code, severity, message, ...extra };
}

async function fileExists(file) {
  try {
    return (await fsp.stat(file)).isFile();
  } catch {
    return false;
  }
}

async function readJson(file) {
  try {
    return { value: JSON.parse(await fsp.readFile(file, "utf8")), error: null };
  } catch (error) {
    return { value: null, error };
  }
}

function packageWorkspacePatterns(pkg) {
  if (Array.isArray(pkg?.workspaces)) return pkg.workspaces.filter((value) => typeof value === "string");
  if (Array.isArray(pkg?.workspaces?.packages)) {
    return pkg.workspaces.packages.filter((value) => typeof value === "string");
  }
  return [];
}

function normalizeWorkspacePattern(patternValue) {
  let pattern = String(patternValue || "").trim().replace(/\\/g, "/");
  const negative = pattern.startsWith("!");
  if (negative) pattern = pattern.slice(1);
  pattern = pattern.replace(/^\.\//, "").replace(/\/+$/, "");
  if (!pattern) return null;
  return `${negative ? "!" : ""}${pattern}/package.json`;
}

async function readWorkspaceDeclaration(root) {
  const diagnostics = [];
  const pnpmFile = path.join(root, "pnpm-workspace.yaml");
  const packageFile = path.join(root, "package.json");
  let pnpmPatterns = [];
  let packagePatterns = [];

  if (await fileExists(pnpmFile)) {
    try {
      const parsed = parseYaml(await fsp.readFile(pnpmFile, "utf8"));
      if (!Array.isArray(parsed?.packages)) throw new Error("Missing packages array");
      pnpmPatterns = parsed.packages.filter((value) => typeof value === "string");
    } catch (error) {
      diagnostics.push(diagnostic(
        "invalid_pnpm_workspace",
        "warning",
        `Could not parse pnpm-workspace.yaml: ${String(error?.message || error)}`,
        { relativePath: "pnpm-workspace.yaml", action: "repair_config" }
      ));
    }
  }

  if (await fileExists(packageFile)) {
    const parsed = await readJson(packageFile);
    if (parsed.value) packagePatterns = packageWorkspacePatterns(parsed.value);
    else diagnostics.push(diagnostic(
      "invalid_root_package_json",
      "warning",
      "The workspace package.json could not be parsed.",
      { relativePath: "package.json", action: "repair_config" }
    ));
  }

  if (pnpmPatterns.length > 0 && packagePatterns.length > 0) {
    const a = [...new Set(pnpmPatterns)].sort().join("\n");
    const b = [...new Set(packagePatterns)].sort().join("\n");
    if (a !== b) diagnostics.push(diagnostic(
      "workspace_declarations_differ",
      "warning",
      "pnpm-workspace.yaml and package.json declare different workspace members. pnpm-workspace.yaml was used."
    ));
  }

  return {
    patterns: pnpmPatterns.length > 0 ? pnpmPatterns : packagePatterns,
    source: pnpmPatterns.length > 0 ? "pnpm" : packagePatterns.length > 0 ? "package-json" : null,
    diagnostics,
  };
}

async function hasWorkspaceMarker(root) {
  for (const marker of WORKSPACE_MARKERS) {
    if (await fileExists(path.join(root, marker))) return true;
  }
  return false;
}

async function expandWorkspaceMembers(root, patterns, signal) {
  throwIfCancelled(signal);
  const globs = patterns.map(normalizeWorkspacePattern).filter(Boolean);
  if (globs.length === 0) return [];
  const packageFiles = await glob(globs, {
    cwd: root,
    absolute: true,
    onlyFiles: true,
    dot: false,
    followSymbolicLinks: false,
    ignore: [...SKIP_DIRS].map((name) => `**/${name}/**`),
  });
  throwIfCancelled(signal);
  return packageFiles.map((file) => path.dirname(file));
}

async function fallbackPackageRoots(root, options) {
  const {
    signal,
    onProgress,
    maxDepth = 4,
    maxDirectories = 10_000,
    deadline = Date.now() + 15_000,
  } = options;
  const roots = [];
  const queue = [{ dir: root, depth: 0, priority: 0 }];
  let scannedDirectoryCount = 0;
  let partialReason = null;

  while (queue.length > 0) {
    throwIfCancelled(signal);
    if (scannedDirectoryCount >= maxDirectories) {
      partialReason = `Stopped after checking ${maxDirectories} directories.`;
      break;
    }
    if (Date.now() > deadline) {
      partialReason = "Stopped after the 15 second discovery limit.";
      break;
    }

    const current = queue.shift();
    scannedDirectoryCount += 1;
    if (scannedDirectoryCount % 25 === 0 || scannedDirectoryCount === 1) {
      onProgress?.({
        stage: "finding-projects",
        scannedDirectoryCount,
        candidateCount: roots.length,
      });
      await new Promise((resolve) => setImmediate(resolve));
    }

    let entries;
    try {
      entries = await fsp.readdir(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }
    if (entries.some((entry) => entry.isFile() && entry.name === "package.json")) roots.push(current.dir);
    if (current.depth >= maxDepth) continue;

    const children = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
      const priority = current.depth === 0 && FALLBACK_CONTAINERS.has(entry.name) ? -1 : current.priority + 1;
      children.push({ dir: path.join(current.dir, entry.name), depth: current.depth + 1, priority });
    }
    children.sort((a, b) => a.priority - b.priority || a.dir.localeCompare(b.dir));
    queue.push(...children);
  }

  return { roots, scannedDirectoryCount, partialReason };
}

async function inspectSourceEvidence(root, signal, options = {}) {
  const queue = [{ dir: root, depth: 0 }];
  let visitedDirectories = 0;
  let visitedFiles = 0;
  let hasSupportedSource = false;
  let hasReactSource = false;
  let hasLikelyComponent = false;
  let hasComponentDirectory = false;
  let hasUnsupportedComponents = false;
  let hasCssModules = false;
  let hasPreprocessor = false;

  while (queue.length > 0 && visitedDirectories < 120 && visitedFiles < 240) {
    throwIfCancelled(signal);
    const current = queue.shift();
    visitedDirectories += 1;
    let entries;
    try {
      entries = await fsp.readdir(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name) || current.depth >= 4) continue;
        // A workspace aggregator is only a candidate when it has its own
        // conventional source tree. Do not accidentally treat components from
        // storybook/, examples/, ci/, or a nested member as root-owned source.
        if (options.skipWorkspaceContainers && current.depth === 0 && !PROJECT_SOURCE_DIRS.has(entry.name)) continue;
        if (entry.name === "components") hasComponentDirectory = true;
        queue.push({ dir: path.join(current.dir, entry.name), depth: current.depth + 1 });
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (UNSUPPORTED_COMPONENT_EXTENSIONS.has(extension)) hasUnsupportedComponents = true;
      if (entry.name.includes(".module.") && STYLE_EXTENSIONS.has(extension)) hasCssModules = true;
      if ([".scss", ".sass", ".less"].includes(extension)) hasPreprocessor = true;
      if (!SUPPORTED_EXTENSIONS.has(extension)) continue;
      if (/\.(?:test|spec|stories)\.[^.]+$/i.test(entry.name) || entry.name.endsWith(".d.ts")) continue;
      hasSupportedSource = true;
      visitedFiles += 1;
      if (!hasReactSource || !hasLikelyComponent) {
        try {
          const contents = await fsp.readFile(path.join(current.dir, entry.name), "utf8");
          const sample = contents.slice(0, 32_000);
          const importsReact = /(?:from\s+["']react["']|react\/jsx-runtime|React\.)/.test(sample);
          const containsJsx = /(?:return|=>)\s*\(?\s*<[A-Za-z][A-Za-z0-9.]*(?:\s|\/?>)/.test(sample);
          hasReactSource ||= importsReact || containsJsx;
          hasLikelyComponent ||= (extension === ".tsx" || extension === ".jsx" || importsReact) &&
            containsJsx && /(?:export\s+(?:default\s+)?function\s+[A-Z]|export\s+(?:const|class)\s+[A-Z]|export\s+default\s+\(?)/.test(sample);
        } catch {}
      }
    }
  }

  return {
    hasSupportedSource,
    hasReactSource,
    hasLikelyComponent,
    hasComponentDirectory,
    hasUnsupportedComponents,
    hasCssModules,
    hasPreprocessor,
  };
}

function dependencyMap(pkg) {
  return {
    ...(pkg?.dependencies || {}),
    ...(pkg?.devDependencies || {}),
    ...(pkg?.peerDependencies || {}),
  };
}

function detectFramework(pkg, root) {
  const deps = dependencyMap(pkg);
  if (deps.next || fs.existsSync(path.join(root, "next.config.js")) || fs.existsSync(path.join(root, "next.config.mjs"))) return "next";
  if (deps["@remix-run/react"]) return "remix";
  if (deps.astro || fs.existsSync(path.join(root, "astro.config.mjs"))) return "astro";
  if (deps.vite || fs.existsSync(path.join(root, "vite.config.ts")) || fs.existsSync(path.join(root, "vite.config.js"))) return "vite";
  if (deps["react-scripts"]) return "cra";
  return "unknown";
}

function detectStyling(pkg) {
  const deps = dependencyMap(pkg);
  const styling = [];
  if (deps.tailwindcss) styling.push("Tailwind CSS");
  if (deps["styled-components"]) styling.push("styled-components");
  if (deps["@emotion/react"] || deps["@emotion/styled"]) styling.push("Emotion");
  if (deps["@vanilla-extract/css"]) styling.push("vanilla-extract");
  if (deps["@mui/material"]) styling.push("MUI");
  if (deps.antd) styling.push("Ant Design");
  if (deps["@chakra-ui/react"]) styling.push("Chakra UI");
  return styling;
}

function packageManagerFor(workspaceRoot) {
  if (fs.existsSync(path.join(workspaceRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(workspaceRoot, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(workspaceRoot, "bun.lock")) || fs.existsSync(path.join(workspaceRoot, "bun.lockb"))) return "bun";
  if (fs.existsSync(path.join(workspaceRoot, "package-lock.json"))) return "npm";
  return "unknown";
}

async function inspectCandidate(projectRoot, context) {
  const { selectedRoot, workspaceRoot, packageManager, signal } = context;
  throwIfCancelled(signal);
  const packageFile = path.join(projectRoot, "package.json");
  const parsed = await readJson(packageFile);
  const relativePath = path.relative(selectedRoot, projectRoot).split(path.sep).join("/") || ".";
  let canonicalRoot;
  try {
    canonicalRoot = await fsp.realpath(projectRoot);
  } catch {
    return null;
  }

  if (!parsed.value) {
    return {
      candidateId: crypto.createHash("sha1").update(canonicalRoot).digest("hex").slice(0, 16),
      projectRoot,
      canonicalRoot,
      workspaceRoot,
      relativePath,
      name: path.basename(projectRoot),
      kind: "unknown",
      framework: "unknown",
      styling: [],
      packageManager,
      compatibility: "needs_attention",
      canOpen: false,
      recommended: false,
      score: -100,
      reasons: ["package.json could not be parsed"],
      diagnostics: [diagnostic("invalid_package_json", "error", "package.json could not be parsed.", {
        relativePath: path.posix.join(relativePath, "package.json"),
        action: "repair_config",
      })],
    };
  }

  const pkg = parsed.value;
  const evidence = await inspectSourceEvidence(projectRoot, signal, {
    skipWorkspaceContainers: projectRoot === workspaceRoot,
  });
  const deps = dependencyMap(pkg);
  const framework = detectFramework(pkg, projectRoot);
  const hasReactDependency = Boolean(deps.react || deps["preact/compat"] || deps.preact);
  const isComponentPackage = evidence.hasLikelyComponent || hasReactDependency && evidence.hasComponentDirectory;
  const runScripts = [pkg.scripts?.dev, pkg.scripts?.start, pkg.scripts?.serve, pkg.scripts?.preview].filter(Boolean).join(" ");
  const hasLibraryEntry = Boolean(pkg.exports || pkg.main || pkg.module || pkg.types || pkg.typings);
  const applicationPath = relativePath === "." || /(?:^|\/)(?:apps?|web|client)(?:\/|$)/.test(relativePath);
  const application = ["next", "remix", "astro", "cra"].includes(framework) ||
    framework === "vite" && !hasLibraryEntry && (applicationPath || /\bvite(?:\s|$)/.test(runScripts));
  const isFrontendCandidate = application || isComponentPackage || evidence.hasUnsupportedComponents;
  if (!isFrontendCandidate) return null;

  const kind = application ? "application" : isComponentPackage ? "component-library" : "unknown";
  const diagnostics = [];
  const reasons = [];
  let canOpen = evidence.hasSupportedSource && (application || isComponentPackage) && (hasReactDependency || evidence.hasReactSource);
  let compatibility = canOpen ? "eligible" : "unsupported";

  if (evidence.hasSupportedSource) reasons.push("JavaScript or TypeScript component sources found");
  if (hasReactDependency) reasons.push("React dependency found");
  if (framework !== "unknown") reasons.push(`${framework} project detected`);

  if (!evidence.hasSupportedSource && evidence.hasUnsupportedComponents) {
    diagnostics.push(diagnostic(
      "unsupported_native_components",
      "error",
      "This project only contains native component files that the local compiler does not support yet."
    ));
    reasons.push("No supported React JavaScript or TypeScript source was found");
  } else if (!evidence.hasSupportedSource) {
    diagnostics.push(diagnostic(
      "no_supported_source",
      "error",
      "No .tsx, .ts, .jsx or .js source files were found.",
      { action: "choose_folder" }
    ));
  }

  if (canOpen && (evidence.hasCssModules || evidence.hasPreprocessor)) {
    compatibility = "needs_attention";
    diagnostics.push(diagnostic(
      "partial_style_support",
      "warning",
      "Some project styles may be incomplete because CSS Modules or stylesheet preprocessors were detected."
    ));
  }

  const score = (canOpen ? 100 : 0) + (application ? 30 : kind === "component-library" ? 20 : 0) +
    (evidence.hasReactSource ? 15 : 0) + (hasReactDependency ? 10 : 0) - relativePath.split("/").length;

  return {
    candidateId: crypto.createHash("sha1").update(canonicalRoot).digest("hex").slice(0, 16),
    projectRoot,
    canonicalRoot,
    workspaceRoot,
    relativePath,
    name: typeof pkg.name === "string" && pkg.name.trim() ? pkg.name : path.basename(projectRoot),
    kind,
    framework,
    styling: detectStyling(pkg),
    packageManager,
    compatibility,
    canOpen,
    recommended: false,
    score,
    reasons,
    diagnostics,
  };
}

async function discoverProjectCandidates(selectedRoot, options = {}) {
  const { signal, onProgress, requestId = crypto.randomUUID(), explicitRoot = false } = options;
  const diagnostics = [];
  const startedAt = Date.now();
  let canonicalSelectedRoot;

  try {
    canonicalSelectedRoot = await fsp.realpath(path.resolve(selectedRoot));
    if (!(await fsp.stat(canonicalSelectedRoot)).isDirectory()) throw new Error("The selected path is not a directory.");
  } catch (error) {
    return {
      requestId,
      selectedRoot: path.resolve(selectedRoot),
      status: "failed",
      candidates: [],
      scannedDirectoryCount: 0,
      elapsedMs: Date.now() - startedAt,
      diagnostics: [diagnostic("unreadable_directory", "error", String(error?.message || error), { action: "choose_folder" })],
    };
  }

  try {
    throwIfCancelled(signal);
    onProgress?.({ stage: "reading-workspace", scannedDirectoryCount: 0, candidateCount: 0 });
    const declaration = await readWorkspaceDeclaration(canonicalSelectedRoot);
    diagnostics.push(...declaration.diagnostics);
    const marker = await hasWorkspaceMarker(canonicalSelectedRoot);
    const isDeclaredWorkspace = declaration.patterns.length > 0;
    let roots = [];
    let scannedDirectoryCount = 0;
    let partialReason = null;
    let usedFallbackScan = false;

    if (explicitRoot) {
      roots = await fileExists(path.join(canonicalSelectedRoot, "package.json")) ? [canonicalSelectedRoot] : [];
      scannedDirectoryCount = 1;
    } else if (isDeclaredWorkspace) {
      roots = await expandWorkspaceMembers(canonicalSelectedRoot, declaration.patterns, signal);
      scannedDirectoryCount = roots.length;
      // A workspace root can also be an application, but it must have its own
      // source evidence; inspectCandidate decides whether it belongs in the list.
      if (await fileExists(path.join(canonicalSelectedRoot, "package.json"))) roots.unshift(canonicalSelectedRoot);
    } else {
      const selectedHasPackage = await fileExists(path.join(canonicalSelectedRoot, "package.json"));
      if (selectedHasPackage && !marker) {
        roots = [canonicalSelectedRoot];
        scannedDirectoryCount = 1;
      } else {
        usedFallbackScan = true;
        const fallback = await fallbackPackageRoots(canonicalSelectedRoot, {
          signal,
          onProgress,
          deadline: startedAt + 15_000,
        });
        roots = fallback.roots;
        scannedDirectoryCount = fallback.scannedDirectoryCount;
        partialReason = fallback.partialReason;
      }
    }

    throwIfCancelled(signal);
    const canonicalRoots = new Map();
    for (const root of roots) {
      try {
        const canonical = await fsp.realpath(root);
        if (canonical !== canonicalSelectedRoot && !canonical.startsWith(canonicalSelectedRoot + path.sep)) {
          diagnostics.push(diagnostic("workspace_member_outside_root", "warning", `Skipped a workspace member outside the selected folder: ${root}`));
          continue;
        }
        canonicalRoots.set(canonical, canonical);
      } catch {}
    }

    if (canonicalRoots.size > 100) {
      diagnostics.push(diagnostic("candidate_limit", "warning", "Only the first 100 workspace candidates were inspected."));
      partialReason ||= "The workspace contains more than 100 package directories.";
    }

    const workspaceRoot = !explicitRoot && (isDeclaredWorkspace || marker || usedFallbackScan || canonicalRoots.size > 1) ? canonicalSelectedRoot : undefined;
    const packageManager = packageManagerFor(workspaceRoot || canonicalSelectedRoot);
    const candidates = [];
    const rootsToInspect = [...canonicalRoots.values()].slice(0, 100);
    for (let index = 0; index < rootsToInspect.length; index += 1) {
      throwIfCancelled(signal);
      onProgress?.({
        stage: "checking-projects",
        scannedDirectoryCount,
        candidateCount: candidates.length,
        checkedCandidateCount: index,
        totalCandidateCount: rootsToInspect.length,
      });
      const candidate = await inspectCandidate(rootsToInspect[index], {
        selectedRoot: canonicalSelectedRoot,
        workspaceRoot,
        packageManager,
        signal,
      });
      if (candidate) candidates.push(candidate);
    }

    candidates.sort((a, b) => b.score - a.score || a.relativePath.localeCompare(b.relativePath));
    const recommended = candidates.find((candidate) => candidate.canOpen);
    if (recommended) recommended.recommended = true;
    if (partialReason) diagnostics.push(diagnostic("partial_discovery", "warning", partialReason, { action: "choose_folder" }));

    onProgress?.({
      stage: "complete",
      scannedDirectoryCount,
      candidateCount: candidates.length,
      checkedCandidateCount: rootsToInspect.length,
      totalCandidateCount: rootsToInspect.length,
    });
    return {
      requestId,
      selectedRoot: canonicalSelectedRoot,
      workspaceRoot,
      status: partialReason || declaration.diagnostics.some((item) => item.severity === "warning") ? "partial" : "complete",
      candidates,
      scannedDirectoryCount,
      elapsedMs: Date.now() - startedAt,
      diagnostics,
    };
  } catch (error) {
    if (error instanceof DiscoveryCancelledError) {
      return {
        requestId,
        selectedRoot: canonicalSelectedRoot,
        status: "cancelled",
        candidates: [],
        scannedDirectoryCount: 0,
        elapsedMs: Date.now() - startedAt,
        diagnostics: [],
      };
    }
    return {
      requestId,
      selectedRoot: canonicalSelectedRoot,
      status: "failed",
      candidates: [],
      scannedDirectoryCount: 0,
      elapsedMs: Date.now() - startedAt,
      diagnostics: [diagnostic("discovery_failed", "error", String(error?.message || error), { action: "retry" })],
    };
  }
}

export { DiscoveryCancelledError, discoverProjectCandidates };
