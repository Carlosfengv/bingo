/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/workspace/src/services/ComponentLoader.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { invokeLocalStore } from "../localApi";
import { projectAssetUrl } from "../utils/projectAssetUrl";
import { ComponentCompiler, executeCompiledModule, stripUnresolvableCssImports } from "@bingo/compiler";
import * as React from "react";

/**
* Runtime host for modules compiled by the local Electron main process.
*/
/**
* The compiler constructs absolute paths like `${projectRoot}/components/Button.tsx`.
* We use a virtual root prefix so we can strip it to get relative paths for API calls.
* The actual project ID (UUID) is stored separately.
*/
var VIRTUAL_ROOT_PREFIX = "/project/";
var WebComponentLoader = class extends ComponentCompiler {
  constructor() {
    let projectIdRef = null;
    super({
      onProjectRootChanged: root => {
        if (root.startsWith(VIRTUAL_ROOT_PREFIX)) projectIdRef = root.slice(9);else projectIdRef = root;
        window.__BINGO_RESOLVE_ASSET__ = url => {
          if ((url.startsWith("/") || url.startsWith("bingo-asset:")) && projectIdRef) return projectAssetUrl(projectIdRef, url);
          return url;
        };
      }
    });
    this._projectId = null;
    this.projectGeneration = 0;
    this.indexRequestVersion = 0;
    this.indexLoad = null;
    this.initialIndexPending = false;
    this.moduleRegistry = new Map();
    this.moduleErrors = new Map();
    this.moduleCatalog = new Map();
    this.routerWrappers = new Map();
    this.loadedModuleUrls = new Map();
    this.requestedModulePaths = new Set();
    this.requestedComponentNames = new Set();
    this.failedModuleUrls = new Map();
    this.moduleImports = new Map();
    this.lastComponentIndex = null;
    this.canvasNamesInflight = null;
    this.injectedCssPaths = new Set();
    this._components = null;
    this._componentIndex = null;
  }
  /** Set the project ID and create a virtual root for the compiler */
  setProject(projectId) {
    this.projectGeneration++;
    this.indexRequestVersion++;
    this.indexLoad = null;
    this.initialIndexPending = false;
    this._projectId = projectId;
    const virtualRoot = `${VIRTUAL_ROOT_PREFIX}${projectId}`;
    super.setProjectRoot(virtualRoot);
    this.moduleRegistry.clear();
    this.moduleErrors.clear();
    this.moduleCatalog.clear();
    this.routerWrappers.clear();
    this.loadedModuleUrls.clear();
    this.requestedModulePaths.clear();
    this.requestedComponentNames.clear();
    this.failedModuleUrls.clear();
    this.moduleImports.clear();
    this.lastComponentIndex = null;
    this.canvasNamesInflight = null;
    this.injectedCssPaths.clear();
    this._components = null;
    this._componentIndex = null;
    if (typeof document !== "undefined") document.querySelectorAll("[id^=\"bingo-module-css-\"]").forEach(el => el.remove());
  }
  getModuleCodeUrl(path) {
    return this.moduleCatalog.get(path)?.codeUrl;
  }
  /** Store local module refs without importing every project file. */
  cacheModules(modules) {
    for (const mod of modules) {
      if (!mod?.path) continue;
      this.moduleCatalog.set(mod.path, mod);
    }
    this.prefetchCanvasComponentNames();
  }
  /** Overlap GET /pages with the rest of SSE so first paint does not wait on it. */
  prefetchCanvasComponentNames() {
    if (!this._projectId || this.canvasNamesInflight) return;
    this.canvasNamesInflight = this.fetchActivePageComponentNames();
  }
  pathsForIndex(index) {
    return [...new Set(Object.values(index).map(meta => meta.path).filter(Boolean))];
  }
  /**
  * Load modules needed to paint the current canvases, then bind the index.
  * The full project index can be hundreds of files; first paint only needs
  * the components actually on a page.
  */
  async loadModulesForIndex(index) {
    const generation = this.projectGeneration;
    const version = ++this.indexRequestVersion;
    this.initialIndexPending = true;
    this.lastComponentIndex = index;
    this.indexLoad = (async () => {
      const allPaths = this.pathsForIndex(index);
      const canvasPaths = await this.pathsUsedOnCanvas(index);
      if (generation !== this.projectGeneration || version !== this.indexRequestVersion) return;
      const firstPaths = canvasPaths.kind === "components" ? canvasPaths.paths : canvasPaths.kind === "html-only" ? [] : allPaths;
      await this.importModulesAtPaths(firstPaths);
    })();
    await this.indexLoad;
    if (generation !== this.projectGeneration || version !== this.indexRequestVersion) return null;
    this.initialIndexPending = false;
    return this.applyComponentIndex(this.lastComponentIndex ?? index);
  }
  async waitForCurrentIndex(generation) {
    // A canvas request may finish while a newer contract's modules are loading.
    // Do not publish that contract paired with the preceding implementation.
    let pending;
    do {
      if (generation !== this.projectGeneration) return false;
      pending = this.indexLoad;
      await pending;
      if (generation !== this.projectGeneration) return false;
    } while (pending !== this.indexLoad);
    return true;
  }
  /**
  * Import still-unbound modules for named components (live canvas, Assets
  * composition previews). No-op when every named path is already bound.
  */
  async ensureModulesForNames(names) {
    const generation = this.projectGeneration;
    for (const name of names) this.requestedComponentNames.add(name);
    const index = this.lastComponentIndex ?? this._componentIndex;
    if (!index) return null;
    const pathsNeedingImport = [...new Set([...names].map(name => index[name]?.path).filter(path => !!path))].filter(path => this.needsModuleImport(path));
    if (pathsNeedingImport.length === 0) return null;
    await this.importModulesAtPaths(pathsNeedingImport);
    if (!await this.waitForCurrentIndex(generation)) return null;
    // A definition update may arrive while an existing canvas import is pending.
    // Rebind the loaded functions against the current contract, not its snapshot.
    return this.applyComponentIndex(this.lastComponentIndex ?? index);
  }
  /** Re-bind components after modules:updated using the latest index (including patches). */
  async reloadIndexedModules(paths) {
    const generation = this.projectGeneration;
    const index = this.lastComponentIndex ?? this._componentIndex;
    if (!index) return null;
    const targetPaths = paths ?? this.pathsForIndex(index);
    await this.importModulesAtPaths(targetPaths);
    if (!await this.waitForCurrentIndex(generation)) return null;
    return this.applyComponentIndex(this.lastComponentIndex ?? index);
  }
  /** Import modules from a local modules:updated payload, then re-bind the registry. */
  async reloadUpdatedModules(modules) {
    const generation = this.projectGeneration;
    const list = Array.isArray(modules) ? modules : [];
    this.cacheModules(list);
    // Build updates contain the entire catalog, including CSS-only rebuilds
    // after saving a drawing. Preserve lazy loading for unused components.
    await this.importModules(list.filter(mod => this.requestedModulePaths.has(mod.path)));
    if (!await this.waitForCurrentIndex(generation)) return null;
    const index = this.lastComponentIndex ?? this._componentIndex;
    if (!index) return null;
    return this.applyComponentIndex(index);
  }
  async importModulesAtPaths(paths) {
    for (const path of paths) this.requestedModulePaths.add(path);
    const mods = paths.map(path => this.moduleCatalog.get(path)).filter(mod => !!mod);
    await this.importModules(mods);
  }
  needsModuleImport(path) {
    const mod = this.moduleCatalog.get(path);
    if (!mod?.codeUrl || mod.error) return false;
    if (this.failedModuleUrls.get(path) === mod.codeUrl) return false;
    return this.loadedModuleUrls.get(path) !== mod.codeUrl;
  }
  async importModules(modules) {
    const generation = this.projectGeneration;
    const list = Array.isArray(modules) ? modules : [];
    if (list.length === 0) return;
    await this.loadCssFromModules(list);
    if (generation !== this.projectGeneration) return;
    await this.importModulesFromUrls(list);
  }
  /** Fetch and inject sidecar CSS listed on each module (`import "./x.css"`). */
  async loadCssFromModules(modules) {
    const projectId = this._projectId;
    const generation = this.projectGeneration;
    const isCurrent = () => generation === this.projectGeneration;
    if (!projectId || typeof document === "undefined") return;
    const jobs = [];
    for (const mod of modules) {
      if (!mod.cssImports?.length) continue;
      for (const specifier of mod.cssImports) {
        const resolved = resolveCssImportPath(mod.path, specifier);
        if (!resolved) continue;
        if (this.injectedCssPaths.has(resolved)) continue;
        this.injectedCssPaths.add(resolved);
        jobs.push(injectCssImport(projectId, resolved, isCurrent).catch(err => {
          if (!isCurrent()) return;
          this.injectedCssPaths.delete(resolved);
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`[ComponentLoader] CSS import failed for ${resolved}: ${message}`);
        }));
      }
    }
    if (jobs.length === 0) return;
    await Promise.all(jobs);
    if (!isCurrent()) return;
    window.dispatchEvent(new CustomEvent("bingo-css-updated"));
  }
  async pathsUsedOnCanvas(index) {
    this.prefetchCanvasComponentNames();
    try {
      const scan = await (this.canvasNamesInflight ?? this.fetchActivePageComponentNames());
      const paths = [...new Set(scan.names.map(name => index[name]?.path).filter(path => !!path))];
      if (paths.length > 0) return {
        kind: "components",
        paths
      };
      if (scan.parsed) return {
        kind: "html-only",
        paths: []
      };
      return {
        kind: "unknown",
        paths: []
      };
    } catch {
      return {
        kind: "unknown",
        paths: []
      };
    }
  }
  async fetchActivePageComponentNames() {
    const projectId = this._projectId;
    if (!projectId) return {
      names: [],
      parsed: false
    };
    const pages = await invokeLocalStore("list-canvases", projectId);
    const activeScan = scanCanvasUsage(pickActivePage(pages) ?? pages);
    if (activeScan.names.length > 0 || !Array.isArray(pages)) return activeScan;
    const allScan = scanCanvasUsage(pages);
    if (allScan.names.length > 0) return allScan;
    return activeScan;
  }
  async importModulesFromUrls(list) {
    await Promise.all(list.map(async mod => {
      const isCurrentRevision = () => !this.moduleCatalog.has(mod.path) || this.moduleCatalog.get(mod.path).codeUrl === mod.codeUrl;
      // An earlier stylesheet fetch may finish after a newer JS revision has
      // already loaded. It must not start a fresh import of the old artifact.
      if (!isCurrentRevision()) return;
      if (mod.error || !mod.codeUrl) {
        const message = mod.error ?? "Missing compiled module URL";
        this.moduleErrors.set(mod.path, message);
        return;
      }
      const loadedUrl = this.loadedModuleUrls.get(mod.path);
      if (this.moduleRegistry.has(mod.path) && !this.moduleErrors.has(mod.path) && loadedUrl === mod.codeUrl) return;
      if (this.failedModuleUrls.get(mod.path) === mod.codeUrl) return;
      const existing = this.moduleImports.get(mod.path);
      if (existing?.url === mod.codeUrl) return existing.promise;
      const attempt = { url: mod.codeUrl, promise: null };
      this.moduleImports.set(mod.path, attempt);
      attempt.promise = (async () => {
        try {
          const exports = await executeCompiledModule(mod.codeUrl);
          if (this.moduleImports.get(mod.path) !== attempt || !isCurrentRevision()) return;
          this.moduleRegistry.set(mod.path, exports);
          this.loadedModuleUrls.set(mod.path, mod.codeUrl);
          this.moduleErrors.delete(mod.path);
          this.failedModuleUrls.delete(mod.path);
        } catch (err) {
          if (this.moduleImports.get(mod.path) !== attempt || !isCurrentRevision()) return;
          this.failedModuleUrls.set(mod.path, mod.codeUrl);
          const message = err instanceof Error ? err.message : String(err);
          if (this.moduleRegistry.has(mod.path)) console.warn(`[ComponentLoader] Reload failed for ${mod.path}, keeping previous module: ${message}`);else {
            this.moduleErrors.set(mod.path, message);
            console.warn(`[ComponentLoader] Skipping ${mod.path}: ${message}`);
          }
        } finally {
          if (this.moduleImports.get(mod.path) === attempt) this.moduleImports.delete(mod.path);
        }
      })();
      await attempt.promise;
    }));
  }
  applyComponentIndex(index) {
    const prevComponents = this._components ?? {};
    const componentIndex = {};
    for (const [key, meta] of Object.entries(index)) componentIndex[key] = {
      path: meta.path,
      exportName: meta.exportName,
      ...(meta.editing ? { editing: meta.editing } : {}),
      ...(this.moduleErrors.has(meta.path) ? { runtimeError: this.moduleErrors.get(meta.path) } : {}),
      ...(meta.props ? {
        props: meta.props
      } : {}),
      ...(meta.inspectsChildren ? {
        inspectsChildren: true
      } : {})
    };
    const components = {
      ...prevComponents
    };
    for (const [key, meta] of Object.entries(componentIndex)) {
      const ex = this.moduleRegistry.get(meta.path);
      const comp = meta.exportName === "default" ? ex?.default : ex?.[meta.exportName] ?? ex?.default;
      if (!comp || !(typeof comp === "function" || typeof comp === "object" && comp !== null && "$$typeof" in comp)) continue;
      const Router = ex?.__bingoMemoryRouter;
      const inRouterContext = ex?.__bingoInRouterContext;
      if (typeof Router !== "function" || typeof inRouterContext !== "function") {
        components[key] = comp;
        continue;
      }
      const cached = this.routerWrappers.get(key);
      if (cached?.component === comp && cached.Router === Router) {
        components[key] = cached.wrapped;
        continue;
      }
      const wrapped = props => inRouterContext()
        ? React.createElement(comp, props)
        : React.createElement(Router, { initialEntries: ["/"] }, React.createElement(comp, props));
      wrapped.displayName = `CanvasRouter(${key})`;
      this.routerWrappers.set(key, { component: comp, Router, wrapped });
      components[key] = wrapped;
    }
    this._components = components;
    this._componentIndex = componentIndex;
    this.lastComponentIndex = componentIndex;
    return {
      components: {
        ...components
      },
      componentIndex: {
        ...componentIndex
      }
    };
  }
  /** Merge an index patch and re-bind component functions from the module registry. */
  patchComponentIndex(patch) {
    const prev = this._componentIndex ?? this.lastComponentIndex ?? {};
    const prevComponents = this._components ?? {};
    const componentIndex = {
      ...prev
    };
    const components = {
      ...prevComponents
    };
    for (const [key, incoming] of Object.entries(patch)) {
      const previous = prev[key];
      // A display name can be reused by a different source/export. Only
      // partial updates of the same identity may inherit scanned metadata.
      const identityChanged = (incoming.path && incoming.path !== previous?.path) || (incoming.exportName && incoming.exportName !== previous?.exportName);
      const existing = identityChanged ? undefined : previous;
      if (identityChanged) delete components[key];
      componentIndex[key] = {
        path: incoming.path || previous?.path || "",
        exportName: incoming.exportName || previous?.exportName || key,
        ...(incoming.editing !== undefined ? { editing: incoming.editing } : existing?.editing ? { editing: existing.editing } : {}),
        ...(this.moduleErrors.has(incoming.path || previous?.path) ? { runtimeError: this.moduleErrors.get(incoming.path || previous?.path) } : {}),
        ...(existing?.props ? {
          props: existing.props
        } : {}),
        ...(incoming.props ? {
          props: incoming.props
        } : {}),
        ...((incoming.inspectsChildren ?? existing?.inspectsChildren) ? {
          inspectsChildren: true
        } : {})
      };
      const meta = componentIndex[key];
      const ex = this.moduleRegistry.get(meta.path);
      const comp = meta.exportName === "default" ? ex?.default : ex?.[meta.exportName] ?? ex?.default;
      if (comp && (typeof comp === "function" || typeof comp === "object" && comp !== null && "$$typeof" in comp)) components[key] = comp;
    }
    this._components = components;
    this._componentIndex = componentIndex;
    this.lastComponentIndex = componentIndex;
    return {
      components: {
        ...components
      },
      componentIndex: {
        ...componentIndex
      }
    };
  }
  /**
  * Apply a components:updated patch, importing modules only when not yet bound.
  * Props-only patches must not force-reimport — that races with modules:updated
  * and can evict working bindings when the reload fails.
  */
  async patchComponentIndexAndLoad(patch, { replace = false } = {}) {
    const generation = this.projectGeneration;
    const version = ++this.indexRequestVersion;
    // Rebind a moved component that is already in use, but do not eagerly
    // import every missing entry merely because the full index was republished.
    const pathsInUse = new Set(this.requestedModulePaths);
    for (const [name, meta] of Object.entries(patch)) {
      if (this._components?.[name] || this.requestedComponentNames.has(name)) {
        const modulePath = meta.path ?? this.lastComponentIndex?.[name]?.path;
        if (modulePath) {
          pathsInUse.add(modulePath);
          this.requestedModulePaths.add(modulePath);
        }
      }
    }
    // Stage incoming contracts in event order so partial patches compose even
    // when their imports finish out of order. Only the newest load is published.
    if (replace) this.applyComponentIndex(patch);
    else this.patchComponentIndex(patch);
    this.indexLoad = (async () => {
      // A rebuild can arrive before the first canvas lookup has identified any
      // requested modules. The winning index must complete that first paint.
      if (this.initialIndexPending) {
        const canvas = await this.pathsUsedOnCanvas(this.lastComponentIndex);
        if (generation !== this.projectGeneration || version !== this.indexRequestVersion) return;
        const initialPaths = canvas.kind === "components" ? canvas.paths : canvas.kind === "html-only" ? [] : this.pathsForIndex(this.lastComponentIndex);
        for (const modulePath of initialPaths) pathsInUse.add(modulePath);
      }
      const pathsNeedingImport = this.pathsForIndex(this.lastComponentIndex).filter(path => pathsInUse.has(path) && this.needsModuleImport(path));
      await this.importModulesAtPaths(pathsNeedingImport);
    })();
    await this.indexLoad;
    if (generation !== this.projectGeneration || version !== this.indexRequestVersion) return null;
    this.initialIndexPending = false;
    return this.applyComponentIndex(this.lastComponentIndex);
  }
};
function cssDomId(cssPath) {
  return `bingo-module-css-${cssPath.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}
/** Resolve a CSS import specifier against the importing module path. */
function resolveCssImportPath(modulePath, specifier) {
  const spec = specifier.trim().replace(/\\/g, "/");
  if (!spec) return null;
  if (/^https?:\/\//i.test(spec)) return null;
  if (spec.startsWith("@/")) return spec.slice(2);
  if (!spec.startsWith(".")) return spec.replace(/^\//, "");
  const fromDir = modulePath.replace(/\\/g, "/").split("/").slice(0, -1);
  for (const part of spec.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      if (fromDir.length === 0) return null;
      fromDir.pop();
      continue;
    }
    fromDir.push(part);
  }
  return fromDir.join("/");
}
async function injectCssImport(projectId, cssPath, isCurrent) {
  const id = cssDomId(cssPath);
  const existing = document.getElementById(id);
  const content = await invokeLocalStore("read-file", projectId, { rel: cssPath });
  if (content == null || !isCurrent()) return;
  const style = existing ?? document.createElement("style");
  style.id = id;
  style.textContent = stripUnresolvableCssImports(content);
  if (!existing) document.head.appendChild(style);
}
var KNOWN_CANVAS_ELEMENT_TYPES = new Set(["html", "text", "component", "capture", "icon", "webview", "button", "tag", "single"]);
function pickActivePage(pages) {
  if (!Array.isArray(pages) || pages.length === 0) return pages;
  let savedId = null;
  try {
    savedId = localStorage.getItem("bingo-active-page");
  } catch {
    savedId = null;
  }
  if (savedId) {
    const match = pages.find(page => page && typeof page === "object" && page.id === savedId);
    if (match) return match;
  }
  return pages[0];
}
function scanCanvasUsage(value) {
  const names = new Set();
  let parsed = false;
  const visit = node => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node !== "object") return;
    const record = node;
    if (typeof record.type === "string" && KNOWN_CANVAS_ELEMENT_TYPES.has(record.type)) parsed = true;
    if (typeof record.componentName === "string") names.add(record.componentName);
    const captured = record.capturedComponent;
    if (captured && typeof captured === "object") {
      const capturedName = captured.name;
      if (typeof capturedName === "string") names.add(capturedName);
    }
    const props = record.props;
    if (props && typeof props === "object") {
      const recordProps = props;
      const bingoName = recordProps["data-bingo-component"];
      const dataComponent = recordProps["data-component"];
      if (typeof bingoName === "string") names.add(bingoName);
      if (typeof dataComponent === "string") names.add(dataComponent);
    }
    if (record.type === "capture" && record.original && typeof record.original === "object") {
      const original = record.original;
      if (typeof original.componentName === "string") names.add(original.componentName);
    }
    if (record.byId && typeof record.byId === "object") {
      parsed = true;
      visit(record.byId instanceof Map ? [...record.byId.values()] : Object.values(record.byId));
    }
    visit(record.elements);
    visit(record.children);
    visit(record.canvas);
    visit(record.original);
  };
  visit(value);
  return {
    names: [...names],
    parsed
  };
}
var componentLoader = new WebComponentLoader();

export { componentLoader };
