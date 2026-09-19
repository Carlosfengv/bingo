import * as React from "react";
import { emptyVariableLibrary, bindElementVariable, detachElementVariable, findElementVariableBinding, isPaintOnlyVariableModeChange, resolveCollectionModes, resolveVariableValues, setElementVariableMode, sameCollectionModes, prepareVariableStore, validateVariableLibrary, literalForProperty, variableModesSignature } from "../../../../compiler/src/runtime/variables";
import { createSetStylesOperation } from "../utils/operations";
import { measureCanvasWork } from "../../canvas/lib/canvasPerformance";
import { readCssVariableUsage } from "../../canvas/utils/cssVariableUsage";
import { collectVariableConsumers, createVariableConsumerResolver } from "../../../../compiler/src/runtime/variableConsumers";
import { variableModeChangedRootIds } from "../../../../compiler/src/runtime/variables";

export const VariableLibraryContext = React.createContext<any>(null);
const VariableSnapshotContext = React.createContext<any>(null);
export const VariableEditorContext = React.createContext<any>(null);
export const useVariables = () => React.useContext(VariableLibraryContext);
export const useVariableSnapshot = () => React.useContext(VariableSnapshotContext);
export const useVariableEditor = () => React.useContext(VariableEditorContext);

export function useResolvedVariableStyle(property, fallback) {
  const variables = useVariableSnapshot();
  const editor = useVariableEditor();
  if (!editor?.ids.length || !variables) return fallback;
  const element = editor.store.byId.get(editor.ids[0]);
  const binding = findElementVariableBinding(element, variables.library, property);
  const token = variables.library.tokens.find(token => token.id === binding?.tokenId);
  const value = token && editor.resolve(element.id).values[token.id];
  return value === undefined || !token ? fallback : literalForProperty(value, token, property, binding.alpha);
}

export function VariableLibraryProvider({ projectPath, children }) {
  const [snapshot, setSnapshot] = React.useState<any>({ library: emptyVariableLibrary(), revision: "missing", defaultModes: {} });
  const [status, setStatus] = React.useState("loading");
  const [error, setError] = React.useState("");
  const [managerOpen, setManagerOpen] = React.useState(false);
  const [focusTokenId, setFocusTokenId] = React.useState<string | null>(null);
  const snapshotRef = React.useRef(snapshot);
  const busy = React.useRef(false);
  const reading = React.useRef(false);
  const reloadQueued = React.useRef(false);
  const reloadTimer = React.useRef<number | null>(null);
  const generation = React.useRef(0);
  const undo = React.useRef<any[]>([]);
  const redo = React.useRef<any[]>([]);
  const [, refreshHistory] = React.useState(0);
  const root = projectPath || (typeof window !== "undefined" ? window["__bingoProjectPath"] : null);
  const invoke = React.useCallback((op, args = {}) => {
    if (!root || !window.api?.invoke) return Promise.reject(new Error("Open a project to edit variables."));
    return window.api.invoke("bingo:store", { op, root, ...args });
  }, [root]);
  const accept = React.useCallback(next => {
    const previous = snapshotRef.current;
    if (previous.defaultModes && next.defaultModes && sameCollectionModes(previous.defaultModes, next.defaultModes)) {
      next = { ...next, defaultModes: previous.defaultModes };
    }
    // Reloads often return fresh metadata objects for an unchanged revision.
    // Preserve the snapshot so focus/save notifications do not invalidate consumers.
    if (previous.library === next.library
      && JSON.stringify({ ...previous, library: null }) === JSON.stringify({ ...next, library: null })) return;
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);
  const reload = React.useCallback(async () => {
    if (busy.current || reading.current) { reloadQueued.current = true; return; }
    reading.current = true;
    const request = ++generation.current;
    try {
      let next = await invoke("read-variable-library");
      if (request !== generation.current || busy.current) return;
      if (!next?.library) throw new Error("Could not read project variables.");
      if (snapshotRef.current.revision !== next.revision) { undo.current = []; redo.current = []; }
      else next = { ...next, library: snapshotRef.current.library };
      accept(next); setError(""); setStatus("ready");
    } catch (error) { if (request === generation.current) { setError(error.message); setStatus("error"); } }
    finally {
      reading.current = false;
      if (reloadQueued.current && !busy.current) {
        reloadQueued.current = false;
        window.setTimeout(() => void reload(), 0);
      }
    }
  }, [invoke, accept]);
  const scheduleReload = React.useCallback(() => {
    if (reloadTimer.current !== null) window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => { reloadTimer.current = null; void reload(); }, 75);
  }, [reload]);
  React.useEffect(() => {
    void reload();
    const offFile = window.api?.on?.("file_changed", event => {
      const changed = String(event?.filePath || "").replace(/\\/g, "/").replace(/^\.\//, "");
      const watched = snapshotRef.current.watchedFiles || [snapshotRef.current.source];
      if (String(event?.projectId) === String(root) && watched.some(file => changed === String(file || "").replace(/\\/g, "/").replace(/^\.\//, "") || changed.endsWith(`/${String(file || "").replace(/\\/g, "/").replace(/^\.\//, "")}`))) scheduleReload();
    });
    const offSettings = window.api?.on?.("settings_changed", event => { if (String(event?.projectId) === String(root)) scheduleReload(); });
    const offDesign = window.api?.on?.("design_storage_changed", event => { if (String(event?.projectId) === String(root)) scheduleReload(); });
    const focus = () => { if (!busy.current) void reload(); };
    window.addEventListener("focus", focus);
    return () => {
      generation.current++;
      if (reloadTimer.current !== null) window.clearTimeout(reloadTimer.current);
      offFile?.(); offSettings?.(); offDesign?.(); window.removeEventListener("focus", focus);
    };
  }, [reload, scheduleReload, root]);
  const write = React.useCallback(async (library, historyAction = "edit") => {
    if (busy.current || !snapshotRef.current.source) return false;
    if (historyAction === "edit" && JSON.stringify(library) === JSON.stringify(snapshotRef.current.library)) return true;
    try { validateVariableLibrary(library); } catch (error) { setError(error.message); return false; }
    busy.current = true; generation.current++;
    const before = snapshotRef.current;
    accept({ ...before, library }); setStatus("saving"); setError("");
    try {
      const next = await invoke("write-variable-library", { library, expectedRevision: before.revision, source: before.source });
      accept(next);
      if (historyAction === "edit") { undo.current.push(before.library); if (undo.current.length > 50) undo.current.shift(); redo.current = []; }
      if (historyAction === "undo") { undo.current.pop(); redo.current.push(before.library); }
      if (historyAction === "redo") { redo.current.pop(); undo.current.push(before.library); }
      setStatus("ready"); refreshHistory(value => value + 1); return true;
    } catch (error) { accept(before); setStatus("error"); setError(error.message); return false; }
    finally {
      busy.current = false;
      if (reloadQueued.current) {
        reloadQueued.current = false;
        scheduleReload();
      }
    }
  }, [accept, invoke, scheduleReload]);
  const value = React.useMemo(() => ({
    ...snapshot, status, error, reload, managerOpen, focusTokenId,
    openManager: (tokenId = null) => { setFocusTokenId(tokenId); setManagerOpen(true); },
    closeManager: () => setManagerOpen(false),
    edit: (transform) => write(transform(structuredClone(snapshotRef.current.library))),
    undo: () => undo.current.length ? write(undo.current.at(-1), "undo") : Promise.resolve(false),
    redo: () => redo.current.length ? write(redo.current.at(-1), "redo") : Promise.resolve(false),
    canUndo: undo.current.length > 0, canRedo: redo.current.length > 0,
  }), [snapshot, status, error, reload, managerOpen, focusTokenId, write]);
  const renderSnapshot = React.useMemo(() => ({ library: snapshot.library, defaultModes: snapshot.defaultModes }), [snapshot.library, snapshot.defaultModes]);
  return <VariableLibraryContext.Provider value={value}><VariableSnapshotContext.Provider value={renderSnapshot}>{children}</VariableSnapshotContext.Provider></VariableLibraryContext.Provider>;
}

export function VariableEditorProvider({ store, selectedIds, onCommit, readOnly, children }) {
  const variables = useVariableSnapshot();
  const ids = React.useMemo(() => Array.from(selectedIds || []) as string[], [selectedIds]);
  const pageModes = store.variableModes ?? variables?.defaultModes ?? {};
  const resolvedById = React.useMemo(() => new Map<string | null, any>(), [store, variables?.library, pageModes]);
  const resolveModes = React.useCallback((id: string | null) => resolveCollectionModes(store, id, variables.library, pageModes), [store, variables.library, pageModes]);
  const resolve = React.useCallback((id: string | null) => {
    const cached = resolvedById.get(id);
    if (cached) return cached;
    const resolved = resolveCollectionModes(store, id, variables.library, pageModes);
    const value = { ...resolved, ...resolveVariableValues(variables.library, resolved.modes) };
    resolvedById.set(id, value);
    return value;
  }, [store, variables.library, pageModes, resolvedById]);
  const changeElements = React.useCallback((transform) => {
    if (readOnly) return;
    onCommit(current => ids.flatMap(id => {
      const old = current.byId.get(id); if (!old) return [];
      const next = transform(old, current);
      if (old === next || JSON.stringify(old) === JSON.stringify(next)) return [];
      const ops: any[] = [];
      if (next.styles !== old.styles) ops.push(createSetStylesOperation(current, id, next.styles));
      ops.push({ type: "set_theme", elementId: id, oldTheme: old.theme, newTheme: next.theme });
      return ops.filter(Boolean);
    }));
  }, [readOnly, onCommit, ids]);
  const value = React.useMemo(() => ({
    store, ids, readOnly, pageModes, resolve, resolveModes,
    bindingFor: (id, property) => findElementVariableBinding(store.byId.get(id), variables.library, property),
    setMode: (collectionId, modeId, page = false) => {
      if (readOnly) return;
      if (!page) return changeElements(element => setElementVariableMode(element, variables.library, collectionId, modeId));
      onCommit(current => {
        const modes = { ...(current.variableModes ?? variables.defaultModes) };
        if (modeId === null) delete modes[collectionId]; else modes[collectionId] = modeId;
        if (current.variableModes && sameCollectionModes(current.variableModes, modes)) return [];
        if (!current.variableModes && modeId === null && !Object.hasOwn(variables.defaultModes || {}, collectionId)) return [];
        return [{ type: "set_variable_modes", oldModes: current.variableModes, newModes: modes }];
      });
    },
    bind: (property, tokenId, alpha = 1) => changeElements(element => bindElementVariable(element, variables.library, property, tokenId, alpha)),
    detach: property => changeElements((element, current) => {
      const { modes } = resolveCollectionModes(current, element.id, variables.library, current.variableModes ?? variables.defaultModes);
      return detachElementVariable(element, variables.library, property, resolveVariableValues(variables.library, modes).values);
    }),
  }), [store, ids, readOnly, pageModes, resolve, resolveModes, variables.library, variables.defaultModes, onCommit, changeElements]);
  return <VariableEditorContext.Provider value={value}>{children}</VariableEditorContext.Provider>;
}

const renderCache = new WeakMap<object, { library: object; variants: Map<string, any> }>();
const emptyCollectionModes = {};
export function useVariableGeometryVersion(store, componentsRevision = 0, components = emptyCollectionModes, componentIndex = emptyCollectionModes) {
  const variables = useVariableSnapshot();
  const pendingRoots = React.useRef<Set<string> | null>(null);
  const takeRoots = React.useCallback(() => {
    const roots = pendingRoots.current;
    pendingRoots.current = new Set();
    return roots ?? undefined;
  }, []);
  const defaultModes = variables?.defaultModes ?? emptyCollectionModes;
  const [cssRevision, setCssRevision] = React.useState(0);
  const [fontRevision, setFontRevision] = React.useState(0);
  React.useEffect(() => {
    const cssUpdated = () => setCssRevision(value => value + 1);
    const fontsUpdated = (event: FontFaceSetLoadEvent) => {
      if (event.fontfaces.some(font => font.status === "loaded")) setFontRevision(value => value + 1);
    };
    window.addEventListener("bingo-css-updated", cssUpdated);
    document.fonts?.addEventListener("loadingdone", fontsUpdated);
    return () => {
      window.removeEventListener("bingo-css-updated", cssUpdated);
      document.fonts?.removeEventListener("loadingdone", fontsUpdated);
    };
  }, []);
  const state = React.useRef<{ store: any; library: any; defaultModes: any; version: number; componentsRevision: number; components: any; componentIndex: any; sheets: string[]; cssRevision: number; fontRevision: number } | null>(null);
  const cssUsageRef = React.useRef<ReturnType<typeof readCssVariableUsage> | undefined>(undefined);
  if (!state.current) {
    cssUsageRef.current = readCssVariableUsage(document);
    state.current = { store, library: variables?.library, defaultModes, componentsRevision, components, componentIndex, cssRevision, fontRevision, sheets: cssUsageRef.current.sheets, version: 0 };
  }
  else if (state.current.store !== store || state.current.library !== variables?.library || state.current.defaultModes !== defaultModes || state.current.componentsRevision !== componentsRevision || state.current.components !== components || state.current.componentIndex !== componentIndex || state.current.cssRevision !== cssRevision || state.current.fontRevision !== fontRevision) {
    const usage = readCssVariableUsage(document);
    cssUsageRef.current = usage;
    const stylesUnchanged = usage.complete && state.current.sheets.length === usage.sheets.length
      && usage.sheets.every((text, index) => text === state.current!.sheets[index]);
    const runtimeUpdated = state.current.componentsRevision !== componentsRevision || state.current.components !== components || state.current.componentIndex !== componentIndex;
    const hasChangedRuntime = runtimeUpdated && [...store.byId.values()].some((element: any) =>
      ["capture", "webview"].includes(element.type) || element.props?.["data-component"] === "CapturedPage"
      || element.type === "component" && (state.current!.components[element.componentName] !== components[element.componentName]
        || JSON.stringify(state.current!.componentIndex[element.componentName]) !== JSON.stringify(componentIndex[element.componentName])));
    const libraryUnchanged = state.current.library === variables?.library && state.current.defaultModes === defaultModes;
    const paintOnly = stylesUnchanged && !hasChangedRuntime && libraryUnchanged && state.current.fontRevision === fontRevision && (state.current.store === store
      || variables?.library?.tokens.length && isPaintOnlyVariableModeChange(state.current.store, store, variables.library,
        state.current.store.variableModes ?? defaultModes, store.variableModes ?? defaultModes, () => usage));
    if (!paintOnly) {
      const roots = stylesUnchanged && !hasChangedRuntime && libraryUnchanged && state.current.fontRevision === fontRevision
        && variables?.library && collectVariableConsumers(store, variables.library, usage)
        ? variableModeChangedRootIds(state.current.store, store, state.current.store.variableModes ?? defaultModes, store.variableModes ?? defaultModes)
        : undefined;
      if (!roots) pendingRoots.current = null;
      else if (pendingRoots.current) for (const root of roots) pendingRoots.current.add(root);
    }
    state.current = { store, library: variables?.library, defaultModes, componentsRevision, components, componentIndex, cssRevision, fontRevision, sheets: usage.sheets, version: state.current.version + (paintOnly ? 0 : 1) };
  }
  const version = state.current.version;
  const styles = cssUsageRef.current;
  return React.useMemo(() => ({ version, takeRoots, styles }), [version, takeRoots, styles]);
}
export function useVariableRenderStore(store, restrictToConsumers = false, styleUsage?: ReturnType<typeof readCssVariableUsage>) {
  const variables = useVariableSnapshot();
  const resolveConsumers = React.useMemo(createVariableConsumerResolver, []);
  const [cssRevision, refreshCss] = React.useReducer(value => value + 1, 0);
  React.useEffect(() => {
    if (!restrictToConsumers || styleUsage) return;
    window.addEventListener("bingo-css-updated", refreshCss);
    return () => window.removeEventListener("bingo-css-updated", refreshCss);
  }, [restrictToConsumers, !!styleUsage]);
  const usedCssNames = React.useMemo(() => restrictToConsumers && variables?.library.tokens.length
    ? resolveConsumers(store, variables.library, styleUsage ?? readCssVariableUsage(document)) : undefined,
  [store, variables?.library, restrictToConsumers, cssRevision, styleUsage, resolveConsumers]);
  if (!variables?.library.tokens.length) return store;
  const modes = store.variableModes ?? variables.defaultModes;
  const signature = variableModesSignature(variables.library, modes) + (usedCssNames ? `:used:${JSON.stringify([...usedCssNames].sort())}` : ":all");
  let cached = renderCache.get(store);
  if (cached?.library !== variables.library) {
    cached = { library: variables.library, variants: new Map() };
    renderCache.set(store, cached);
  }
  if (cached.variants.has(signature)) return cached.variants.get(signature);
  const prepared = measureCanvasWork("variables", () => prepareVariableStore(store, variables.library, modes, undefined, usedCssNames));
  // Canvas and preview deliberately use different declaration sets. Keep both
  // identities, with a bound for transient CSS edits/default-mode combinations.
  if (cached.variants.size >= 4) cached.variants.delete(cached.variants.keys().next().value!);
  cached.variants.set(signature, prepared);
  return prepared;
}
