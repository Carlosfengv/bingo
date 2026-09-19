import * as React from "react";
import { emptyVariableLibrary, bindElementVariable, detachElementVariable, findElementVariableBinding, resolveCollectionModes, resolveVariableValues, setElementVariableMode, prepareVariableStore, validateVariableLibrary, literalForProperty } from "../../../../compiler/src/runtime/variables";
import { createSetStylesOperation } from "../utils/operations";

export const VariableLibraryContext = React.createContext<any>(null);
export const VariableEditorContext = React.createContext<any>(null);
export const useVariables = () => React.useContext(VariableLibraryContext);
export const useVariableEditor = () => React.useContext(VariableEditorContext);

export function useResolvedVariableStyle(property, fallback) {
  const variables = useVariables();
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
  const accept = React.useCallback(next => { snapshotRef.current = next; setSnapshot(next); }, []);
  const reload = React.useCallback(async () => {
    if (busy.current || reading.current) { reloadQueued.current = true; return; }
    reading.current = true;
    const request = ++generation.current;
    try {
      let next = await invoke("read-variable-library");
      if (request !== generation.current || busy.current) return;
      if (!next?.library) throw new Error("Could not read project variables.");
      if (snapshotRef.current.revision !== next.revision) { undo.current = []; redo.current = []; }
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
  return <VariableLibraryContext.Provider value={value}>{children}</VariableLibraryContext.Provider>;
}

export function VariableEditorProvider({ store, selectedIds, onCommit, readOnly, children }) {
  const variables = useVariables();
  const ids = Array.from(selectedIds || []) as string[];
  const pageModes = store.variableModes ?? variables?.defaultModes ?? {};
  const resolve = (id: string | null) => {
    const resolved = resolveCollectionModes(store, id, variables.library, pageModes);
    return { ...resolved, ...resolveVariableValues(variables.library, resolved.modes) };
  };
  const changeElements = (transform) => {
    if (readOnly) return;
    onCommit(current => ids.flatMap(id => {
      const old = current.byId.get(id); if (!old) return [];
      const next = transform(old, current);
      if (JSON.stringify(old) === JSON.stringify(next)) return [];
      const ops: any[] = [];
      if (next.styles !== old.styles) ops.push(createSetStylesOperation(current, id, next.styles));
      ops.push({ type: "set_theme", elementId: id, oldTheme: old.theme, newTheme: next.theme });
      return ops.filter(Boolean);
    }));
  };
  const value = {
    store, ids, readOnly, pageModes, resolve,
    resolveModes: id => resolveCollectionModes(store, id, variables.library, pageModes),
    bindingFor: (id, property) => findElementVariableBinding(store.byId.get(id), variables.library, property),
    setMode: (collectionId, modeId, page = false) => {
      if (readOnly) return;
      if (!page) return changeElements(element => setElementVariableMode(element, variables.library, collectionId, modeId));
      onCommit(current => {
        const modes = { ...(current.variableModes ?? variables.defaultModes) };
        if (modeId === null) delete modes[collectionId]; else modes[collectionId] = modeId;
        return [{ type: "set_variable_modes", oldModes: current.variableModes, newModes: modes }];
      });
    },
    bind: (property, tokenId, alpha = 1) => changeElements(element => bindElementVariable(element, variables.library, property, tokenId, alpha)),
    detach: property => changeElements((element, current) => {
      const { modes } = resolveCollectionModes(current, element.id, variables.library, current.variableModes ?? variables.defaultModes);
      return detachElementVariable(element, variables.library, property, resolveVariableValues(variables.library, modes).values);
    }),
  };
  return <VariableEditorContext.Provider value={value}>{children}</VariableEditorContext.Provider>;
}

const renderCache = new WeakMap<object, { library: object; signature: string; store: any }>();
export function useVariableRenderStore(store) {
  const variables = useVariables();
  if (!variables?.library.tokens.length) return store;
  const modes = store.variableModes ?? variables.defaultModes;
  const signature = JSON.stringify(modes);
  const cached = renderCache.get(store);
  if (cached?.library === variables.library && cached.signature === signature) return cached.store;
  const prepared = prepareVariableStore(store, variables.library, modes);
  renderCache.set(store, { library: variables.library, signature, store: prepared });
  return prepared;
}
