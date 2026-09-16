/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/state/webviewEditStore.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";

/**
* Shared state for a live-webview edit session.
*
* The webview renders as a canvas element (WebviewRenderer) but its controls
* (inspect / edit / interactive / refresh) and the change list live in the
* editor's RIGHT SIDEBAR (WebviewEditPanel). Rather than thread state up and
* commands down through Canvas → renderElement → WebviewRenderer, both sides
* talk to this tiny external store. One active session at a time, which is all
* the UI supports.
*
* Flow:
*   - Panel sets `mode` / `interactive` / bumps `refreshNonce` → WebviewRenderer reacts.
*   - WebviewRenderer publishes `selection` (with its tier) and appends `changes`.
*   - Panel renders the controls, the tier badge, and the categorized change list.
*/
var initial = {
  active: false,
  activeWebviewId: null,
  mode: "none",
  interactive: false,
  refreshNonce: 0,
  captureNonce: 0,
  captureMode: "html",
  status: null,
  syncing: false,
  webviewUrl: "",
  webviewWidth: 0,
  webviewHeight: 0,
  selection: null,
  changes: []
};
var state = initial;
var listeners = new Set();
var actions = null;
function emit(next) {
  state = {
    ...state,
    ...next
  };
  listeners.forEach(l => l());
}
var webviewEditStore = {
  getState: () => state,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setActiveWebview: (id, selected) => {
    if (selected) {
      if (state.activeWebviewId === id) return {
        droppedChanges: 0
      };
      const dropped = state.changes.filter(c => !c.saved).length;
      emit({
        active: true,
        activeWebviewId: id,
        selection: null,
        changes: [],
        mode: "none",
        status: null,
        syncing: false
      });
      return {
        droppedChanges: dropped
      };
    }
    if (state.activeWebviewId === id) {
      const dropped = state.changes.filter(c => !c.saved).length;
      emit({
        active: false,
        activeWebviewId: null,
        mode: "none",
        selection: null,
        changes: []
      });
      return {
        droppedChanges: dropped
      };
    }
    return {
      droppedChanges: 0
    };
  },
  setMode: mode => emit({
    mode,
    ...(mode === "edit" ? {} : {
      selection: null
    })
  }),
  setInteractive: interactive => emit({
    interactive
  }),
  requestRefresh: () => emit({
    refreshNonce: state.refreshNonce + 1
  }),
  requestCapture: mode => emit({
    captureNonce: state.captureNonce + 1,
    captureMode: mode
  }),
  setSelection: selection => emit({
    selection
  }),
  patchSelection: patch => emit({
    selection: state.selection ? {
      ...state.selection,
      ...patch
    } : state.selection
  }),
  /** Record a change (or update the last one for the same property+element so a
  *  stepper drag collapses into a single entry rather than N rows). */
  recordChange: change => {
    const existingIdx = state.changes.findIndex(c => c.id === change.id);
    if (existingIdx >= 0) {
      const prev = state.changes[existingIdx];
      const mergedEdit = prev.edit?.kind === "style-merge" && change.edit?.kind === "style-merge" ? {
        kind: "style-merge",
        styles: {
          ...prev.edit.styles,
          ...change.edit.styles
        }
      } : change.edit;
      const next = state.changes.slice();
      next[existingIdx] = {
        ...change,
        before: prev.before,
        edit: mergedEdit
      };
      emit({
        changes: next
      });
    } else emit({
      changes: [...state.changes, change]
    });
  },
  setStatus: status => emit({
    status
  }),
  setSyncing: syncing => emit({
    syncing
  }),
  setWebviewInfo: (webviewUrl, webviewWidth, webviewHeight) => emit({
    webviewUrl,
    webviewWidth,
    webviewHeight
  }),
  clearChanges: () => emit({
    changes: []
  }),
  /** Drop already-saved changes, keep anything still pending (e.g. AI-tier). */
  clearSavedChanges: () => emit({
    changes: state.changes.filter(c => !c.saved)
  }),
  setChangeSaved: (id, saved) => emit({
    changes: state.changes.map(c => c.id === id ? {
      ...c,
      saved
    } : c)
  }),
  hasUnsaved: () => state.changes.some(c => !c.saved),
  reset: () => emit({
    ...initial
  }),
  setActions: a => {
    actions = a;
  },
  getActions: () => actions
};
function useWebviewEditState() {
  return (0, import_react.useSyncExternalStore)(webviewEditStore.subscribe, webviewEditStore.getState, webviewEditStore.getState);
}

export { useWebviewEditState, webviewEditStore };
