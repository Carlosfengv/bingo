/*
 * Local compiler.
 *
 * Compiles the selected project's TSX to ESM inside the Electron main process.
 *
 * Here esbuild does the same work in-process. Each source file is bundled into a
 * self-contained ES module -- so its relative imports are resolved away and only
 * bare specifiers remain -- and handed to the renderer as a `data:` URL, which
 * `executeCompiledModule` already knows how to import.
 *
 * `react` and friends stay external on purpose: the renderer's import map
 * (src/renderer/index.html) already aliases them onto the editor's own React
 * instance, which is what keeps hooks working across the boundary.
 *
 * Payload shapes match the editor builder contract; see LocalProjectBuilderClient.
 */

import { build } from "esbuild";
import { compileProjectStyles } from "./projectStylesCompiler";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createIncident, recordDiagnosticEvent } from "./diagnosticsStore";
import {
  configureProjectBuildCache,
  deleteProjectBuildCache,
  getProjectBuildCache,
  setProjectBuildCache,
} from "./projectBuildCache";
import {
  captureProjectBuildFingerprint,
  validateProjectBuildFingerprint,
} from "./projectBuildFingerprint";
import { projectForWebContents, broadcastToEditors } from "./windowManager";

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".bingo", "dist", "build", "out", ".next", "coverage",
  "__tests__", "__mocks__",
]);
const SOURCE_EXT = [".tsx", ".ts", ".jsx", ".js"];
const CSS_EXT = [".css"];
const INVALID_PROJECT_PREFIX = "INVALID_LOCAL_PROJECT: ";

/** Tooling files are executable configuration, not renderer component entries. */
function isComponentSourceCandidate(file) {
  const name = path.basename(file);
  if (/\.d\.ts$/i.test(name)) return false;
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(name)) return false;
  if (/\.config\.[cm]?[jt]sx?$/i.test(name)) return false;
  return true;
}

function recordCompilerDiagnostic(event) {
  try {
    void Promise.resolve(recordDiagnosticEvent(event)).catch(() => {});
  } catch {}
}

// Resolved by the renderer's import map, not bundled.
const EXTERNAL = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom/client",
  "react-dom/server",
  "react-dom/server.browser",
];

/** sessionId -> active local build session */
const sessions = new Map();
/** project root -> one compile shared by all active sessions for that project */
const projectBuildPromises = new Map();
/** Increased by watcher events so a build cannot cache a mixed input generation. */
const projectInputRevisions = new Map();
/** Changed absolute paths accumulated while an active project is watched. */
const projectDirtyPaths = new Map();
/** Recent complete snapshots provide dependency graphs for incremental rebuilds. */
const lastSuccessfulBuilds = new Map();
/** One debounce timer per project prevents duplicate rebuilds from many sessions. */
const projectBuildTimers = new Map();

/**
 * The most recent component index per project.
 *
 * save-to-code needs it to work out which modules a canvas references; the
 * compiler is the only thing that knows, so it keeps the last result.
 */
const lastIndex = new Map();

/** The component index produced by the most recent compile of `root`. */
function componentIndexFor(root) {
  return lastIndex.get(root) || {};
}

function collect(root, exts) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        walk(path.join(dir, entry.name));
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        const file = path.join(dir, entry.name);
        if (exts !== SOURCE_EXT || isComponentSourceCandidate(file)) out.push(file);
      }
    }
  };
  walk(root);
  return out;
}

function validateProjectRoot(root) {
  let stat;
  try {
    stat = fs.statSync(root);
  } catch {
    throw new Error(`${INVALID_PROJECT_PREFIX}所选目录不存在或已无法访问。`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`${INVALID_PROJECT_PREFIX}请选择前端项目文件夹，而不是单个文件。`);
  }
  const packageFile = path.join(root, "package.json");
  if (!fs.existsSync(packageFile)) {
    throw new Error(
      `${INVALID_PROJECT_PREFIX}缺少 package.json。请选择 React、Vite、Next.js 等前端项目的根目录。`
    );
  }
  try {
    JSON.parse(fs.readFileSync(packageFile, "utf8"));
  } catch {
    throw new Error(`${INVALID_PROJECT_PREFIX}package.json 无法解析，请先修复其 JSON 格式。`);
  }
  const sourceFiles = collect(root, SOURCE_EXT);
  if (sourceFiles.length === 0) {
    throw new Error(
      `${INVALID_PROJECT_PREFIX}没有找到 .tsx、.ts、.jsx 或 .js 源文件。请选择包含前端组件源码的项目根目录。`
    );
  }
  return sourceFiles;
}

const toRel = (root, abs) => path.relative(root, abs).split(path.sep).join("/");

const dataUrl = (code, type) =>
  `data:${type};base64,${Buffer.from(code, "utf8").toString("base64")}`;

/** Read a JSON file with comments and trailing commas stripped (tsconfig allows both). */
function readJsonc(file) {
  try {
    const text = fs
      .readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1")
      .replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Resolve a project's path aliases the way its own tooling does.
 *
 * Real repositories import through aliases (`@/components/Card`), not relative
 * paths, so without this a component's imports do not resolve and the canvas
 * cannot render it. `baseUrl` + `paths` is read from tsconfig/jsconfig,
 * following `extends`; when there is no config, the conventions used by most
 * Vite and Next templates are assumed.
 */
function resolveExtendedConfig(configFile, request) {
  const configDir = path.dirname(configFile);
  const candidates = [];
  if (request.startsWith(".")) {
    const resolved = path.resolve(configDir, request);
    candidates.push(resolved, `${resolved}.json`, path.join(resolved, "tsconfig.json"));
  } else {
    try {
      const requireFromConfig = createRequire(path.join(configDir, "__bingo_config__.js"));
      candidates.push(requireFromConfig.resolve(request));
    } catch {}
  }
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function aliasesFromConfig(configFile, seen = new Set()) {
  const resolvedFile = path.resolve(configFile);
  if (seen.has(resolvedFile)) return {};
  seen.add(resolvedFile);
  const cfg = readJsonc(resolvedFile);
  if (!cfg) return {};
  const aliases = {};
  if (typeof cfg.extends === "string") {
    const baseFile = resolveExtendedConfig(resolvedFile, cfg.extends);
    if (baseFile) Object.assign(aliases, aliasesFromConfig(baseFile, seen));
  }
  const options = cfg.compilerOptions || {};
  const baseUrl = path.resolve(path.dirname(resolvedFile), options.baseUrl || ".");
  for (const [pattern, targets] of Object.entries(options.paths || {})) {
    const target = Array.isArray(targets) ? targets[0] : targets;
    if (typeof target !== "string") continue;
    const key = pattern.replace(/\/\*$/, "");
    if (/[*]/.test(key)) continue;
    aliases[key] = path.resolve(baseUrl, target.replace(/\/\*$/, ""));
  }
  return aliases;
}

function nearestConfig(startDir, boundary) {
  let current = path.resolve(startDir);
  const stop = path.resolve(boundary);
  while (isWithin(stop, current)) {
    for (const name of ["tsconfig.json", "jsconfig.json"]) {
      const file = path.join(current, name);
      if (fs.existsSync(file)) return file;
    }
    if (current === stop) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function pathAliases(root, configFile = null) {
  const aliases = configFile ? aliasesFromConfig(configFile) : {};
  for (const [key, dir] of [["@", "src"], ["~", "src"]]) {
    if (!(key in aliases) && fs.existsSync(path.join(root, dir))) aliases[key] = path.join(root, dir);
  }
  return aliases;
}

function tsconfigAliasPlugin(projectRoot, workspaceRoot) {
  const configCache = new Map();
  const defaultConfig = nearestConfig(projectRoot, workspaceRoot);
  return {
    name: "bingo-tsconfig-aliases",
    setup(buildApi) {
      buildApi.onResolve({ filter: /^[^./]|^@\// }, async (args) => {
        if (!args.importer || args.path.startsWith("node:")) return null;
        const importerDir = path.dirname(args.importer);
        const configFile = nearestConfig(importerDir, workspaceRoot) || defaultConfig;
        const cacheKey = configFile || projectRoot;
        let aliases = configCache.get(cacheKey);
        if (!aliases) {
          aliases = pathAliases(configFile ? path.dirname(configFile) : projectRoot, configFile);
          configCache.set(cacheKey, aliases);
        }
        const key = Object.keys(aliases)
          .sort((a, b) => b.length - a.length)
          .find((candidate) => args.path === candidate || args.path.startsWith(`${candidate}/`));
        if (!key) return null;
        const suffix = args.path === key ? "" : args.path.slice(key.length + 1);
        const target = path.join(aliases[key], suffix);
        const resolved = await buildApi.resolve(target, {
          importer: args.importer,
          kind: args.kind,
          resolveDir: importerDir,
        });
        return resolved.errors?.length ? null : resolved;
      });
    },
  };
}

function findWorkspaceRoot(projectRoot) {
  let current = path.resolve(projectRoot);
  const filesystemRoot = path.parse(current).root;
  while (current !== filesystemRoot) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return fs.realpathSync(current);
    const pkg = readJsonc(path.join(current, "package.json"));
    if (Array.isArray(pkg?.workspaces) || Array.isArray(pkg?.workspaces?.packages)) return fs.realpathSync(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return fs.realpathSync(projectRoot);
}

function isWithin(root, file) {
  const base = path.resolve(root);
  const target = path.resolve(file);
  return target === base || target.startsWith(base + path.sep);
}

function dependencyPath(inputPath, workspaceRoot) {
  // esbuild reports metafile inputs relative to `absWorkingDir`. Resolve them
  // against the workspace instead of Electron's process.cwd(), which may be the
  // packaged app directory and has no relationship to the selected project.
  const absolute = path.isAbsolute(inputPath) ? inputPath : path.resolve(workspaceRoot, inputPath);
  try {
    const canonical = fs.realpathSync(absolute);
    if (!isWithin(workspaceRoot, canonical) || canonical.includes(`${path.sep}node_modules${path.sep}`)) return null;
    return canonical;
  } catch {
    return null;
  }
}

function buildInputPath(inputPath, workspaceRoot) {
  const absolute = path.isAbsolute(inputPath) ? inputPath : path.resolve(workspaceRoot, inputPath);
  try {
    return fs.realpathSync(absolute);
  } catch {
    return null;
  }
}

/**
 * Compile every source file into its own ES module.
 *
 * One entry point per file rather than one bundle per component: the editor
 * addresses modules by path, and recompiling a changed file must only invalidate
 * that module.
 */
async function compileProject(root, controls = {}) {
  const allFiles = validateProjectRoot(root).sort();
  const workspaceRoot = findWorkspaceRoot(root);
  const previous = controls.previousBuild;
  const changedPaths = [...new Set((controls.changedPaths || []).map((file) => {
    if (file === "*") return file;
    return buildInputPath(file, workspaceRoot) || path.resolve(file);
  }))];
  const currentSourcePaths = allFiles.map((file) => toRel(root, file));
  const previousSourcePaths = (previous?.modules || []).map((module) => module.path).sort();
  const sourceSetUnchanged = currentSourcePaths.length === previousSourcePaths.length &&
    currentSourcePaths.every((file, index) => file === previousSourcePaths[index]);
  const previousInputs = new Set(Object.values(previous?.entryInputs || {}).flat().map((file) => path.resolve(file)));
  const previousCss = new Set((previous?.cssFiles || []).map((file) => buildInputPath(file, workspaceRoot) || path.resolve(file)));
  const structuralChange = changedPaths.some((file) => {
    const name = path.basename(file);
    if (/(?:^|\/)(?:package\.json|[jt]sconfig\.json|pnpm-workspace\.yaml|[^/]+\.config\.[cm]?[jt]s)$/.test(file.replace(/\\/g, "/"))) return true;
    if (name === "package-lock.json" || name === "pnpm-lock.yaml" || name === "yarn.lock" || name === "bun.lock" || name === "bun.lockb") return true;
    return !previousInputs.has(file) && !previousCss.has(file);
  });
  const incremental = Boolean(
    previous?.complete &&
    previous.entryInputs &&
    changedPaths.length > 0 &&
    sourceSetUnchanged &&
    !structuralChange
  );
  const affectedPaths = new Set();
  if (incremental) {
    for (const [entryPath, inputs] of Object.entries(previous.entryInputs)) {
      const resolvedInputs = new Set((inputs || []).map((file) => path.resolve(file)));
      if (changedPaths.some((file) => resolvedInputs.has(file))) affectedPaths.add(entryPath);
    }
    for (const file of changedPaths) {
      if (isWithin(root, file) && SOURCE_EXT.some((extension) => file.endsWith(extension))) {
        affectedPaths.add(toRel(root, file));
      }
    }
  }
  const files = incremental
    ? allFiles.filter((file) => affectedPaths.has(toRel(root, file)))
    : allFiles;
  const modules = incremental
    ? (previous.modules || []).filter((module) => !affectedPaths.has(module.path))
    : [];
  const componentIndex = incremental
    ? Object.fromEntries(Object.entries(previous.componentIndex || {}).filter(([, meta]) => !affectedPaths.has(meta.path)))
    : {};
  const entryInputs = incremental
    ? Object.fromEntries(Object.entries(previous.entryInputs || {}).filter(([entryPath]) => !affectedPaths.has(entryPath)))
    : {};
  const buildFailures = [];
  const aliasPlugin = tsconfigAliasPlugin(root, workspaceRoot);
  const dependencyFiles = new Set(allFiles.map((file) => path.resolve(file)));
  const buildInputFiles = new Set(allFiles.map((file) => path.resolve(file)));
  const assertActive = () => {
    if (controls.isCancelled?.()) {
      const error = new Error("Build cancelled");
      error.code = "BUILD_CANCELLED";
      throw error;
    }
  };

  controls.onProgress?.({ processed: 0, total: files.length, file: null, incremental });

  // Keep per-entry output and failure isolation, while allowing a small amount
  // of parallel work. Results are merged in source-path order so duplicate
  // export names remain deterministic regardless of completion order.
  const results = new Array(files.length);
  let nextFileIndex = 0;
  let processed = 0;
  const compileNext = async () => {
    while (true) {
      const fileIndex = nextFileIndex++;
      if (fileIndex >= files.length) return;
      assertActive();
      const file = files[fileIndex];
      const rel = toRel(root, file);
      try {
        const result = await build({
          entryPoints: [file],
          absWorkingDir: workspaceRoot,
          bundle: true,
          write: false,
          metafile: true,
          format: "esm",
          platform: "browser",
          target: "es2020",
          jsx: "automatic",
          external: EXTERNAL,
          plugins: [aliasPlugin],
          logLevel: "silent",
          // A CSS import inside a component becomes a separate file esbuild would
          // reference from the bundle; from a data: URL that import cannot
          // resolve, so styles are handled separately below.
          loader: { ".css": "empty", ".png": "dataurl", ".jpg": "dataurl", ".svg": "dataurl" },
        });
        assertActive();
        results[fileIndex] = { rel, result };
      } catch (error) {
        if (error?.code === "BUILD_CANCELLED") throw error;
        const message = String(error?.errors?.[0]?.text || error?.message || error);
        results[fileIndex] = { rel, failure: `${rel}: ${message}` };
      } finally {
        processed += 1;
        controls.onProgress?.({ processed, total: files.length, file: rel, incremental });
      }
    }
  };
  const concurrency = Math.min(2, files.length);
  await Promise.all(Array.from({ length: concurrency }, () => compileNext()));

  for (const entry of results) {
    if (!entry) continue;
    if (entry.failure) {
      buildFailures.push(entry.failure);
      continue;
    }
    const { rel, result } = entry;
    const inputsForEntry = [];
    for (const inputPath of Object.keys(result.metafile?.inputs || {})) {
      const buildInput = buildInputPath(inputPath, workspaceRoot);
      if (buildInput) inputsForEntry.push(buildInput);
    }
    entryInputs[rel] = [...new Set(inputsForEntry)].sort();
    const output = result.outputFiles?.[0];
    if (!output) continue;
    const meta = Object.values(result.metafile.outputs)[0] || {};
    modules.push({
      path: rel,
      codeUrl: dataUrl(output.text, "text/javascript"),
      cssImports: [],
    });
    const exportNames = Array.isArray(meta.exports) ? meta.exports : [];
    for (const exportName of exportNames) {
      if (exportName === "default") continue;
      componentIndex[exportName] = { path: rel, exportName };
    }
    if (exportNames.includes("default")) {
      const base = path.basename(rel).replace(/\.[^.]+$/, "");
      if (/^[A-Z]/.test(base)) componentIndex[base] = { path: rel, exportName: "default" };
    }
  }

  for (const input of Object.values(entryInputs).flat()) {
    buildInputFiles.add(input);
    const resolved = dependencyPath(input, workspaceRoot);
    if (resolved) dependencyFiles.add(resolved);
  }

  modules.sort((a, b) => a.path.localeCompare(b.path));

  if (Object.keys(componentIndex).length === 0) {
    const detail = buildFailures.length > 0
      ? `组件编译失败。请先安装项目依赖，并确认组件可以正常构建。首个错误：${buildFailures[0]}`
      : "没有找到可加载的组件导出。请确保至少有一个大写命名或默认导出的 React 组件。";
    throw new Error(`${INVALID_PROJECT_PREFIX}${detail}`);
  }

  // Follow actual stylesheet entries and compile their imports before injection.
  const cssFiles = new Set(collect(root, CSS_EXT).map((file) => path.resolve(file)));
  for (const dependency of dependencyFiles) {
    if (CSS_EXT.some((extension) => dependency.endsWith(extension))) cssFiles.add(dependency);
  }
  let css = "";
  let cssError = null;
  try {
    const compiledStyles = await compileProjectStyles({ root, workspaceRoot, sourceFiles: allFiles, cssFiles: [...cssFiles] });
    css = compiledStyles.css;
    for (const file of compiledStyles.dependencies) {
      buildInputFiles.add(file);
      dependencyFiles.add(file);
      if (file.endsWith(".css")) cssFiles.add(file);
    }
  } catch (error) {
    cssError = String(error?.errors?.[0]?.text || error?.message || error);
  }
  const cssUrl = css ? dataUrl(css, "text/css") : null;

  return {
    modules,
    componentIndex: Object.fromEntries(Object.entries(componentIndex).sort(([a], [b]) => a.localeCompare(b))),
    cssUrl,
    cssError,
    dependencyFiles: [...dependencyFiles],
    buildInputFiles: [...buildInputFiles],
    cssFiles: [...cssFiles],
    entryInputs,
    workspaceRoot,
    complete: buildFailures.length === 0 && !cssError,
    buildFailures,
    incremental,
    rebuiltEntries: files.map((file) => toRel(root, file)),
  };
}

/** Bundle an installed icon package for the renderer without using esm.sh. */
async function compileInstalledModule(root, specifier) {
  if (!/^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+(?:\/[a-z0-9_.-]+)*$/i.test(specifier || "")) {
    throw new Error("Invalid package specifier");
  }
  const workspaceRoot = findWorkspaceRoot(root);
  const result = await build({
    stdin: {
      contents: `export * from ${JSON.stringify(specifier)};`,
      resolveDir: root,
      sourcefile: "bingo-local-module.js",
      loader: "js",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2020",
    external: EXTERNAL,
    nodePaths: [...new Set([path.join(root, "node_modules"), path.join(workspaceRoot, "node_modules")])],
    logLevel: "silent",
  });
  const output = result.outputFiles?.[0];
  if (!output) throw new Error(`Could not bundle ${specifier}`);
  return dataUrl(output.text, "text/javascript");
}

const localBuilderSubscribers = new Set();

function broadcast(event) {
  // BrowserWindow is unavailable in the isolated Node test runtime.
  broadcastToEditors("bingo:builder-event", event);
  for (const subscriber of localBuilderSubscribers) subscriber(event);
}

function subscribeLocalBuilderEvents(subscriber) {
  localBuilderSubscribers.add(subscriber);
  return () => localBuilderSubscribers.delete(subscriber);
}

function sessionEvent(session, type, payload, buildId = session.buildId) {
  return { projectId: session.root, sessionId: session.sessionId, buildId, type, payload };
}

function sessionIsActive(session) {
  return !session.cancelled && sessions.get(session.sessionId) === session;
}

function activeSessionsForRoot(root) {
  return [...sessions.values()].filter((session) => session.root === root && sessionIsActive(session));
}

function rememberSuccessfulBuild(root, compiled) {
  lastSuccessfulBuilds.delete(root);
  lastSuccessfulBuilds.set(root, compiled);
  while (lastSuccessfulBuilds.size > 3) {
    lastSuccessfulBuilds.delete(lastSuccessfulBuilds.keys().next().value);
  }
}

function watchedChangeMatters(filename) {
  if (!filename) return true;
  const name = String(filename);
  const first = name.split(path.sep)[0];
  if (SKIP_DIRS.has(first)) return false;
  return SOURCE_EXT.concat(CSS_EXT).some((extension) => name.endsWith(extension)) ||
    /(?:^|\/)(?:package\.json|[jt]sconfig\.json|pnpm-workspace\.yaml|[^/]+\.config\.[cm]?[jt]s)$/.test(name.replace(/\\/g, "/"));
}

function scheduleSessionBuild(session, changedPath) {
  if (!sessionIsActive(session)) return;
  projectInputRevisions.set(session.root, (projectInputRevisions.get(session.root) || 0) + 1);
  let dirtyPaths = projectDirtyPaths.get(session.root);
  if (!dirtyPaths) {
    dirtyPaths = new Set();
    projectDirtyPaths.set(session.root, dirtyPaths);
  }
  dirtyPaths.add(changedPath || "*");
  // A watcher event is only a fast invalidation signal. Re-entry will still
  // verify content before using a retained snapshot.
  deleteProjectBuildCache(session.root);
  clearTimeout(projectBuildTimers.get(session.root));
  const timer = setTimeout(() => {
    if (projectBuildTimers.get(session.root) !== timer) return;
    projectBuildTimers.delete(session.root);
    for (const activeSession of activeSessionsForRoot(session.root)) {
      void runBuildQueue(activeSession, !activeSession.hasPublishedSnapshot);
    }
  }, 200);
  projectBuildTimers.set(session.root, timer);
}

function watchDirectory(session, dir, recursive) {
  const key = `${recursive ? "recursive" : "direct"}:${path.resolve(dir)}`;
  if (session.watchers.has(key) || !sessionIsActive(session)) return;
  try {
    const watcher = fs.watch(dir, { recursive }, (_type, filename) => {
      if (watchedChangeMatters(filename)) {
        scheduleSessionBuild(session, filename ? path.resolve(dir, String(filename)) : null);
      }
    });
    session.watchers.set(key, watcher);
  } catch (error) {
    console.warn(`[localCompiler] Could not watch ${dir}:`, error);
  }
}

function refreshSessionWatchers(session, compiled) {
  if (!sessionIsActive(session)) return;
  watchDirectory(session, session.root, true);
  if (compiled.workspaceRoot !== session.root) watchDirectory(session, compiled.workspaceRoot, false);
  for (const file of compiled.dependencyFiles || []) {
    if (isWithin(session.root, file)) continue;
    watchDirectory(session, path.dirname(file), false);
  }
}

async function buildAndEmit(session, initial) {
  const root = session.root;
  const buildId = ++session.buildId;
  const startedAt = Date.now();
  const operationId = `build:${session.sessionId}:${buildId}`;
  recordCompilerDiagnostic({ projectId: root, runId: session.sessionId, operationId, source: "compiler", eventName: "build.started", payload: { buildId, initial } });
  broadcast(sessionEvent(session, "modules:build_started", { initial }, buildId));
  let compiled;
  try {
    let sharedBuild = projectBuildPromises.get(root);
    if (!sharedBuild) {
      sharedBuild = (async () => {
        const inputRevision = projectInputRevisions.get(root) || 0;
        const changedPaths = [...(projectDirtyPaths.get(root) || [])];
        projectDirtyPaths.delete(root);
        const result = await compileProject(root, {
          isCancelled: () => activeSessionsForRoot(root).length === 0,
          previousBuild: lastSuccessfulBuilds.get(root),
          changedPaths,
          onProgress: (progress) => {
            for (const activeSession of activeSessionsForRoot(root)) {
              broadcast(sessionEvent(activeSession, "modules:build_progress", progress));
            }
          },
        });
        if (result.complete && (projectInputRevisions.get(root) || 0) === inputRevision) {
          const fingerprint = await captureProjectBuildFingerprint(root, result);
          if ((projectInputRevisions.get(root) || 0) === inputRevision) {
            await setProjectBuildCache(root, result, fingerprint);
            rememberSuccessfulBuild(root, result);
          }
        }
        return { result, inputRevision };
      })().finally(() => {
        if (projectBuildPromises.get(root) === sharedBuild) projectBuildPromises.delete(root);
      });
      projectBuildPromises.set(root, sharedBuild);
    }
    const completedBuild = await sharedBuild;
    compiled = completedBuild.result;
    if ((projectInputRevisions.get(root) || 0) !== completedBuild.inputRevision) {
      return false;
    }
  } catch (error) {
    if (error?.code === "BUILD_CANCELLED" || !sessionIsActive(session) || buildId !== session.buildId) {
      recordCompilerDiagnostic({ projectId: root, runId: session.sessionId, operationId, level: "info", source: "compiler", eventName: "build.cancelled", durationMs: Date.now() - startedAt, payload: { buildId } });
      broadcast(sessionEvent(session, "modules:build_cancelled", {}, buildId));
      return false;
    }
    // End the stylesheet-loading phase before surfacing the actionable project
    // requirement message in the renderer.
    if (initial) {
      broadcast(sessionEvent(session, "css:ready", { cssUrl: null }, buildId));
    }
    recordCompilerDiagnostic({ projectId: root, runId: session.sessionId, operationId, level: "error", source: "compiler", eventName: "build.failed", durationMs: Date.now() - startedAt, payload: { buildId, error } });
    const incident = await createIncident({
      kind: "error",
      category: "compile",
      severity: "error",
      projectId: root,
      runId: session.sessionId,
      operationId,
      summary: "Project build failed",
      error,
      context: { buildId, initial },
      submissionKey: `build:${session.sessionId}:${buildId}`,
    }).catch(() => null);
    broadcast(sessionEvent(session, "modules:build_failed", {
      error: String(error?.message || error),
      incidentId: incident?.incidentId,
      reportPath: incident?.reportPath,
    }, buildId));
    return false;
  }

  if (!sessionIsActive(session) || buildId !== session.buildId) return;
  refreshSessionWatchers(session, compiled);
  lastIndex.set(root, compiled.componentIndex);
  if (compiled.complete) rememberSuccessfulBuild(root, compiled);

  // Order matters: the module catalog must exist before the index that
  // references it is applied.
  broadcast(sessionEvent(session, initial ? "modules:ready" : "modules:updated", {
    modules: compiled.modules,
    replace: !initial,
  }, buildId));
  broadcast(sessionEvent(session, initial ? "components:ready" : "components:updated", {
    componentIndex: compiled.componentIndex,
    replace: !initial,
  }, buildId));
  // Re-publish styles after updates too; the renderer already deduplicates
  // identical stylesheet URLs.
  broadcast(sessionEvent(session, "css:ready", { cssUrl: compiled.cssUrl, error: compiled.cssError }, buildId));
  session.hasPublishedSnapshot = true;
  recordCompilerDiagnostic({
    projectId: root,
    runId: session.sessionId,
    operationId,
    source: "compiler",
    eventName: "build.completed",
    durationMs: Date.now() - startedAt,
    payload: {
      buildId,
      componentCount: Object.keys(compiled.componentIndex).length,
      moduleCount: compiled.modules.length,
      incremental: compiled.incremental === true,
      rebuiltEntryCount: compiled.rebuiltEntries?.length ?? compiled.modules.length,
    },
  });
  return true;
}

async function restoreCachedBuild(session) {
  const cached = await getProjectBuildCache(session.root);
  if (!cached) return false;
  const startedAt = Date.now();
  const valid = await validateProjectBuildFingerprint(session.root, cached.fingerprint).catch(() => false);
  if (!sessionIsActive(session)) return true;
  const current = await getProjectBuildCache(session.root);
  if (!valid || current !== cached) {
    await deleteProjectBuildCache(session.root, { disk: true });
    recordCompilerDiagnostic({
      projectId: session.root,
      runId: session.sessionId,
      source: "compiler",
      eventName: "cache.miss",
      durationMs: Date.now() - startedAt,
      payload: { reason: valid ? "invalidated_during_validation" : "inputs_changed" },
    });
    return false;
  }
  const compiled = cached.snapshot;
  const buildId = ++session.buildId;
  refreshSessionWatchers(session, compiled);
  lastIndex.set(session.root, compiled.componentIndex);
  rememberSuccessfulBuild(session.root, compiled);
  broadcast(sessionEvent(session, "project:status", { stage: "restoring", cacheSource: cached.source }, buildId));
  broadcast(sessionEvent(session, "modules:ready", { modules: compiled.modules, cacheSource: cached.source }, buildId));
  broadcast(sessionEvent(session, "components:ready", { componentIndex: compiled.componentIndex, cacheSource: cached.source }, buildId));
  broadcast(sessionEvent(session, "css:ready", { cssUrl: compiled.cssUrl, error: compiled.cssError, cacheSource: cached.source }, buildId));
  session.hasPublishedSnapshot = true;
  recordCompilerDiagnostic({
    projectId: session.root,
    runId: session.sessionId,
    source: "compiler",
    eventName: "cache.hit",
    durationMs: Date.now() - startedAt,
    payload: { source: cached.source, moduleCount: compiled.modules.length },
  });
  return true;
}

async function prepareSession(session) {
  broadcast(sessionEvent(session, "project:status", { stage: "checking" }));
  if (await restoreCachedBuild(session)) return;
  if (sessionIsActive(session)) await runBuildQueue(session, true);
}

async function runBuildQueue(session, initial) {
  if (!sessionIsActive(session)) return;
  if (session.running) {
    session.pending = true;
    return;
  }
  session.running = true;
  let nextInitial = initial;
  try {
    do {
      session.pending = false;
      const published = await buildAndEmit(session, nextInitial);
      if (published) nextInitial = false;
    } while (session.pending && sessionIsActive(session));
  } finally {
    session.running = false;
  }
}

export { compileProject, componentIndexFor };

async function loadLocalModule({ root, specifier }) {
  try {
    return { success: true, url: await compileInstalledModule(root, specifier) };
  } catch (error) {
    return { success: false, error: String(error?.message || error) };
  }
}

async function connectLocalBuilder({ root, sessionId }) {
  const resolvedRoot = path.resolve(root);
  const resolvedSessionId = sessionId || `legacy:${resolvedRoot}`;
  const previous = sessions.get(resolvedSessionId);
  if (previous) await disconnectLocalBuilder({ root: previous.root, sessionId: resolvedSessionId });
  const session = {
    root: resolvedRoot,
    sessionId: resolvedSessionId,
    cancelled: false,
    buildId: 0,
    running: false,
    pending: false,
    hasPublishedSnapshot: false,
    timer: null,
    watchers: new Map(),
  };
  sessions.set(resolvedSessionId, session);
  // Establish the watcher before compiling so a disconnect or an edit during
  // the first build cannot leave an untracked session behind.
  watchDirectory(session, resolvedRoot, true);
  broadcast(sessionEvent(session, "connected", {}));
  void prepareSession(session);
  return { ok: true, sessionId: resolvedSessionId };
}

async function disconnectLocalBuilder({ root, sessionId }) {
  const resolvedSessionId = sessionId || `legacy:${path.resolve(root)}`;
  const session = sessions.get(resolvedSessionId);
  if (session) {
    session.cancelled = true;
    session.buildId += 1;
    clearTimeout(session.timer);
    for (const watcher of session.watchers.values()) watcher.close();
    session.watchers.clear();
    sessions.delete(resolvedSessionId);
    const remainingSessions = [...sessions.values()].filter(candidate => candidate.root === session.root && !candidate.cancelled).length;
    if (remainingSessions === 0) {
      clearTimeout(projectBuildTimers.get(session.root));
      projectBuildTimers.delete(session.root);
      projectDirtyPaths.delete(session.root);
    }
    broadcast(sessionEvent(session, "disconnected", { remainingSessions }, session.buildId));
  }
  return { ok: true };
}

async function rebuildLocalBuilder({ root, sessionId }) {
  const resolvedRoot = path.resolve(root);
  const resolvedSessionId = sessionId || `legacy:${resolvedRoot}`;
  const session = sessions.get(resolvedSessionId);
  if (!session || session.root !== resolvedRoot || !sessionIsActive(session)) {
    return { ok: false, error: "Project builder session is not connected" };
  }
  projectInputRevisions.set(resolvedRoot, (projectInputRevisions.get(resolvedRoot) || 0) + 1);
  projectDirtyPaths.set(resolvedRoot, new Set(["*"]));
  await deleteProjectBuildCache(resolvedRoot, { disk: true });
  await Promise.all(activeSessionsForRoot(resolvedRoot).map((activeSession) =>
    runBuildQueue(activeSession, !activeSession.hasPublishedSnapshot)
  ));
  return { ok: true };
}

export function registerLocalCompiler(ipcMain, options = {}) {
  configureProjectBuildCache(options.userDataRoot);
  const builderOwners = new Map();
  const assertOwnedRoot = (event, args) => {
    const owned = projectForWebContents(event.sender);
    if (!owned || path.resolve(owned) !== path.resolve(args?.root || "")) {
      throw new Error("This window does not own the project.");
    }
  };
  ipcMain.handle("bingo:load-module", async (event, args) => {
    assertOwnedRoot(event, args);
    return loadLocalModule(args);
  });
  ipcMain.handle("bingo:project-load-report", async (event, args) => {
    assertOwnedRoot(event, args);
    const input = args?.failure ?? {};
    const bounded = value => typeof value === "string" ? value.slice(0, 16_000) : undefined;
    const context = Object.fromEntries(["stage", "code", "sessionId", "buildId", "lastEvent", "file", "processed", "total", "elapsedMs", "timestamp", "componentsReady", "stylesReady", "timedOut"]
      .map(key => [key, typeof input[key] === "string" ? bounded(input[key]) : typeof input[key] === "number" || typeof input[key] === "boolean" ? input[key] : undefined]));
    const error = bounded(input.error) || "Initial project loading timed out";
    const report = await createIncident({
      kind: "error", category: "project-load", severity: "error", projectId: path.resolve(args.root),
      runId: bounded(input.sessionId), summary: "Could not open local project", error: { message: error, code: bounded(input.code) }, context,
      submissionKey: `project-load:${input.sessionId || "none"}:${input.buildId || 0}:${input.code || "unknown"}:${error}`.slice(0, 200),
    });
    return { incidentId: report.incidentId, reportPath: report.reportPath };
  });
  ipcMain.handle("bingo:builder-connect", async (event, args) => {
    assertOwnedRoot(event, args);
    const sessionId = args.sessionId || `legacy:${path.resolve(args.root)}`;
    const previousOwner = builderOwners.get(sessionId);
    if (previousOwner && previousOwner !== event.sender.id) throw new Error("This builder session belongs to another editor.");
    builderOwners.set(sessionId, event.sender.id);
    const result = await connectLocalBuilder(args);
    const dispose = () => {
      if (builderOwners.get(sessionId) !== event.sender.id) return;
      builderOwners.delete(sessionId);
      void disconnectLocalBuilder({ root: args.root, sessionId });
    };
    if (event.sender.isDestroyed()) dispose(); else event.sender.once("destroyed", dispose);
    return result;
  });
  ipcMain.handle("bingo:builder-disconnect", async (event, args) => {
    assertOwnedRoot(event, args);
    const sessionId = args.sessionId || `legacy:${path.resolve(args.root)}`;
    if (builderOwners.get(sessionId) !== event.sender.id) return { ok: true };
    builderOwners.delete(sessionId);
    return disconnectLocalBuilder(args);
  });
  ipcMain.handle("bingo:builder-rebuild", async (event, args) => {
    assertOwnedRoot(event, args);
    const sessionId = args.sessionId || `legacy:${path.resolve(args.root)}`;
    if (builderOwners.get(sessionId) !== event.sender.id) throw new Error("This builder session belongs to another editor.");
    return rebuildLocalBuilder(args);
  });
}

export { connectLocalBuilder, disconnectLocalBuilder, loadLocalModule, rebuildLocalBuilder, subscribeLocalBuilderEvents };
