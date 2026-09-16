/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/workspace/src/hooks/useComponents.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { componentLoader } from "../services/ComponentLoader";
import { projectBuilderClient } from "../services/ProjectBuilderClient";
import * as import_react from "react";

/**
* useComponents - Web version (project-builder)
*
* Build artifacts (modules, component index, CSS) arrive from the local builder.
* Component props arrive via components:ready when distMeta already has a
* scanned props cache. When no cache exists, props scan starts on first
* component selection via POST /components/scan; props then stream via
* components:updated until components:scan_complete / components:scan_failed.
* A cached scan response clears scanLoading without a new builder event.
*
* After a file save, the API syncs to project-builder and the server pushes
* modules:updated / components:updated — the client applies those events here.
*/
function readyState(components, componentIndex, scanLoading) {
  return {
    initialized: true,
    loading: false,
    scanLoading,
    error: null,
    components,
    componentIndex
  };
}
function sourcePathsFromPatch(patch) {
  return [...new Set(Object.values(patch).map(entry => entry.path).filter(path => /\.(tsx?|jsx?)$/.test(path)))];
}
/** Latest modules:updated payload per path, held until first paint finishes. */
function mergePendingModuleUpdates(pending, modules) {
  for (const mod of modules) if (mod?.path) pending.set(mod.path, mod);
}
function takePendingModuleUpdates(pending) {
  const list = [...pending.values()];
  pending.clear();
  return list;
}
function useComponents(projectPath, options = {}) {
  const [state, setState] = (0, import_react.useState)({
    initialized: false,
    loading: true,
    scanLoading: false,
    error: null,
    components: {},
    componentIndex: {},
    registryRevision: 0
  });
  const projectPathRef = (0, import_react.useRef)(projectPath);
  const pendingScanComponentRef = (0, import_react.useRef)(null);
  const registryRef = (0, import_react.useRef)(state);
  const onSourceFilesUpdatedRef = (0, import_react.useRef)(options.onSourceFilesUpdated);
  (0, import_react.useLayoutEffect)(() => {
    projectPathRef.current = projectPath;
    registryRef.current = state;
    onSourceFilesUpdatedRef.current = options.onSourceFilesUpdated;
  });
  const notifySourceFilesUpdated = (0, import_react.useCallback)(paths => {
    if (paths.length === 0) return;
    onSourceFilesUpdatedRef.current?.(paths);
  }, []);
  const waitForComponent = (componentKey, timeoutMs = 15e3) => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const {
          components,
          componentIndex
        } = registryRef.current;
        if (components[componentKey] && componentIndex[componentKey]) {
          resolve();
          return;
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for component "${componentKey}"`));
          return;
        }
        requestAnimationFrame(check);
      };
      check();
    });
  };
  const applyRegistryUpdate = (0, import_react.useCallback)((components_0, componentIndex_0, scanLoading, options_0) => {
    setState(prev => {
      const mergedComponents = {
        ...prev.components
      };
      for (const [key, comp] of Object.entries(components_0)) if (comp) mergedComponents[key] = comp;
      const nextRevision = options_0?.bumpRevision === false ? prev.registryRevision : prev.registryRevision + 1;
      return {
        ...readyState(mergedComponents, {
          ...prev.componentIndex,
          ...componentIndex_0
        }, scanLoading ?? prev.scanLoading),
        registryRevision: nextRevision
      };
    });
  }, []);
  const refreshComponentPaths = (0, import_react.useCallback)(async paths_0 => {
    const sourcePaths = [...new Set(paths_0.filter(path => /\.(tsx?|jsx?)$/.test(path)))];
    if (!sourcePaths.length || !projectPathRef.current) return;
    const baseline = new Map(sourcePaths.map(path_0 => [path_0, componentLoader.getModuleCodeUrl(path_0)]));
    const deadline = Date.now() + 2500;
    while (Date.now() < deadline) {
      if (sourcePaths.some(path_1 => {
        const url = componentLoader.getModuleCodeUrl(path_1);
        return url && url !== baseline.get(path_1);
      })) break;
      await new Promise(resolve_0 => setTimeout(resolve_0, 200));
    }
    const result = await componentLoader.reloadIndexedModules(sourcePaths);
    if (!result || projectPathRef.current === null) return;
    applyRegistryUpdate(result.components, result.componentIndex);
  }, [applyRegistryUpdate]);
  const ensureComponentNames = (0, import_react.useCallback)(async names => {
    if (!projectPathRef.current) return;
    const result_0 = await componentLoader.ensureModulesForNames(names);
    if (!result_0 || projectPathRef.current === null) return;
    applyRegistryUpdate(result_0.components, result_0.componentIndex);
  }, [applyRegistryUpdate]);
  const patchComponentsUpdated = (0, import_react.useCallback)(patch => {
    notifySourceFilesUpdated(sourcePathsFromPatch(patch));
    const propsOnly = Object.values(patch).every(entry => entry.props !== void 0);
    componentLoader.patchComponentIndexAndLoad(patch).then(({
      components: components_1,
      componentIndex: componentIndex_1
    }) => {
      if (projectPathRef.current === null) return;
      let scanLoading_0;
      const pending = pendingScanComponentRef.current;
      if (pending && patch[pending]) {
        pendingScanComponentRef.current = null;
        scanLoading_0 = false;
      }
      applyRegistryUpdate(components_1, componentIndex_1, scanLoading_0, {
        bumpRevision: !propsOnly
      });
    });
  }, [notifySourceFilesUpdated, applyRegistryUpdate]);
  const requestPropsScan = async componentKey_0 => {
    const projectId = projectPathRef.current;
    if (!projectId) return;
    pendingScanComponentRef.current = componentKey_0;
    setState(prev_0 => prev_0.scanLoading ? prev_0 : {
      ...prev_0,
      scanLoading: true
    });
    try {
      const {
        status
      } = await projectBuilderClient.scanComponents({
        componentKey: componentKey_0
      });
      if (projectPathRef.current !== projectId) return;
      if (status === "cached") {
        pendingScanComponentRef.current = null;
        setState(prev_2 => ({
          ...prev_2,
          scanLoading: false
        }));
      }
    } catch (error) {
      if (projectPathRef.current !== projectId) return;
      pendingScanComponentRef.current = null;
      setState(prev_1 => ({
        ...prev_1,
        scanLoading: false,
        error: String(error)
      }));
    }
  };
  (0, import_react.useEffect)(() => {
    if (!projectPath) {
      pendingScanComponentRef.current = null;
      setState(prev_3 => ({
        ...prev_3,
        components: {},
        componentIndex: {}
      }));
      return;
    }
    let cancelled = false;
    let modulesCached = false;
    let firstPaintDone = false;
    const pendingModuleUpdates = new Map();
    setState(prev_4 => ({
      ...prev_4,
      loading: true,
      error: null,
      initialized: false,
      components: {},
      componentIndex: {}
    }));
    componentLoader.setProject(projectPath);
    const onEvent = event => {
      if (cancelled) return;
      if (event.type === "modules:ready") {
        const modules = event.payload.modules;
        componentLoader.cacheModules(Array.isArray(modules) ? modules : []);
        modulesCached = true;
        return;
      }
      if (event.type === "modules:updated") {
        const modules_0 = event.payload.modules ?? [];
        const moduleList = Array.isArray(modules_0) ? modules_0 : [];
        componentLoader.cacheModules(moduleList);
        notifySourceFilesUpdated(moduleList.map(mod => mod.path).filter(path_2 => /\.(tsx?|jsx?)$/.test(path_2)));
        if (!firstPaintDone && !registryRef.current.initialized) {
          mergePendingModuleUpdates(pendingModuleUpdates, moduleList);
          return;
        }
        componentLoader.reloadUpdatedModules(moduleList).then(result_1 => {
          if (cancelled || !result_1 || projectPathRef.current === null) return;
          applyRegistryUpdate(result_1.components, result_1.componentIndex, false);
        });
        return;
      }
      if (event.type === "components:ready") {
        const nextIndex = event.payload.componentIndex ?? {};
        if (Object.keys(nextIndex).length === 0) {
          firstPaintDone = true;
          setState(prev_5 => ({
            ...readyState(prev_5.components, prev_5.componentIndex, false),
            registryRevision: prev_5.registryRevision
          }));
          return;
        }
        const bootstrap = () => {
          if (cancelled) return;
          componentLoader.loadModulesForIndex(nextIndex).then(result_2 => {
            if (cancelled) return;
            let scanLoading_1;
            const pending_0 = pendingScanComponentRef.current;
            if (pending_0 && nextIndex[pending_0]?.props !== void 0) {
              pendingScanComponentRef.current = null;
              scanLoading_1 = false;
            }
            applyRegistryUpdate(result_2.components, result_2.componentIndex, scanLoading_1);
            firstPaintDone = true;
            const queuedModules = takePendingModuleUpdates(pendingModuleUpdates);
            if (queuedModules.length === 0) return;
            componentLoader.reloadUpdatedModules(queuedModules).then(update => {
              if (cancelled || !update || projectPathRef.current === null) return;
              applyRegistryUpdate(update.components, update.componentIndex, false);
            });
          }).catch(cause => {
            if (cancelled) return;
            setState(previous => ({ ...previous, loading: false, error: String(cause?.message || cause) }));
          });
        };
        if (modulesCached) bootstrap();else queueMicrotask(bootstrap);
        return;
      }
      if (event.type === "components:updated") {
        const payload_0 = event.payload;
        patchComponentsUpdated(payload_0.componentIndex);
        return;
      }
      if (event.type === "components:scan_complete") {
        pendingScanComponentRef.current = null;
        setState(prev_6 => ({
          ...prev_6,
          scanLoading: false
        }));
        return;
      }
      if (event.type === "components:scan_failed") {
        const payload_1 = event.payload;
        console.warn("[useComponents] components:scan_failed", payload_1);
        pendingScanComponentRef.current = null;
        setState(prev_7 => ({
          ...prev_7,
          scanLoading: false,
          error: payload_1.error ?? prev_7.error
        }));
        return;
      }
      if (event.type === "modules:build_started") {
        setState(prev => ({ ...prev, loading: !prev.initialized, error: null }));
        return;
      }
      if (event.type === "modules:build_failed" || event.type === "connection:failed") {
        const payload_2 = event.payload;
        console.warn("[useComponents] modules:build_failed", payload_2);
        setState(prev_8 => ({
          ...prev_8,
          loading: false,
          scanLoading: false,
          error: payload_2.error ?? prev_8.error
        }));
      }
    };
    const unsub = projectBuilderClient.on(onEvent, projectPath);
    componentLoader.initRuntime().catch(err => {
      console.warn("[useComponents] Runtime init failed:", err);
      if (!cancelled) setState(previous => ({ ...previous, loading: false, error: String(err?.message || err) }));
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [projectPath, patchComponentsUpdated, notifySourceFilesUpdated, applyRegistryUpdate]);
  const reload = (0, import_react.useCallback)(async () => {
    const projectId_0 = projectPathRef.current;
    if (!projectId_0) return;
    setState(prev_9 => ({
      ...prev_9,
      loading: true
    }));
    try {
      await projectBuilderClient.connect(projectId_0);
      if (projectPathRef.current !== projectId_0) return;
    } catch (error_0) {
      if (projectPathRef.current !== projectId_0) return;
      setState(prev_10 => ({
        ...prev_10,
        loading: false,
        error: String(error_0)
      }));
    }
  }, []);
  const reconnect = (0, import_react.useCallback)(async () => {
    const projectId_1 = projectPathRef.current;
    if (!projectId_1) return;
    setState(prev_11 => ({
      ...prev_11,
      loading: true,
      error: null
    }));
    try {
      await projectBuilderClient.reconnect(projectId_1);
      if (projectPathRef.current !== projectId_1) return;
    } catch (error_1) {
      if (projectPathRef.current !== projectId_1) return;
      setState(prev_12 => ({
        ...prev_12,
        loading: false,
        error: String(error_1)
      }));
    }
  }, []);
  return {
    initialized: state.initialized,
    loading: state.loading,
    scanLoading: state.scanLoading,
    error: state.error,
    components: state.components,
    componentIndex: state.componentIndex,
    registryRevision: state.registryRevision,
    reload,
    reconnect,
    requestPropsScan,
    waitForComponent,
    refreshComponentPaths,
    ensureComponentNames
  };
}

export { useComponents };
