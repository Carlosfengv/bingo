/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/useHistory.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { applyOperationsToStore, invertOperations } from "../../shared/utils/operations";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function isHumanCanvasCommit(direction, source = "user") {
  return (direction === "do" || direction === "redo") && source !== "ai";
}
/**
* If every op in `curr` matches an op already in `prev` by (type, elementId)
* AND is one of the coalescable types, return a merged batch where each
* matching prev op keeps its original `old*` and gets `new*` from curr.
* If anything in `curr` is unmatched or non-coalescable, return null — the
* caller should push the unrelated batch as a new history entry instead of
* letting it pollute the scrub op's undo entry.
*/
var COALESCABLE = new Set(["set_props", "set_styles", "set_position"]);
function mergeScrubOps(prev, curr) {
  const result = [...prev];
  for (const c of curr) {
    if (!COALESCABLE.has(c.type)) return null;
    const idx = result.findIndex(p => p.type === c.type && p.elementId === c.elementId);
    if (idx < 0) return null;
    const p = result[idx];
    if (c.type === "set_props" && p.type === "set_props") result[idx] = {
      ...p,
      newProps: c.newProps
    };else if (c.type === "set_styles" && p.type === "set_styles") result[idx] = {
      ...p,
      newStyles: c.newStyles
    };else if (c.type === "set_position" && p.type === "set_position") result[idx] = {
      ...p,
      newPosition: c.newPosition
    };
  }
  return result;
}
/**
* Hook for managing per-tab history.
* Each tab has its own undo/redo stack.
*/
function useTabHistory(t0) {
  const $ = (0, import_compiler_runtime.c)(24);
  let t1;
  if ($[0] !== t0) {
    t1 = t0 === void 0 ? {} : t0;
    $[0] = t0;
    $[1] = t1;
  } else t1 = $[1];
  const {
    maxHistory: t2,
    onHistoryChange,
    onOperation,
    normalizeOps
  } = t1;
  const maxHistory = t2 === void 0 ? 50 : t2;
  const onHistoryChangeRef = (0, import_react.useRef)(onHistoryChange);
  const onOperationRef = (0, import_react.useRef)(onOperation);
  const normalizeOpsRef = (0, import_react.useRef)(normalizeOps);
  let t3;
  if ($[2] !== normalizeOps || $[3] !== onHistoryChange || $[4] !== onOperation) {
    t3 = () => {
      onHistoryChangeRef.current = onHistoryChange;
      onOperationRef.current = onOperation;
      normalizeOpsRef.current = normalizeOps;
    };
    $[2] = normalizeOps;
    $[3] = onHistoryChange;
    $[4] = onOperation;
    $[5] = t3;
  } else t3 = $[5];
  (0, import_react.useLayoutEffect)(t3);
  let t4;
  if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = new Map();
    $[6] = t4;
  } else t4 = $[6];
  const tabHistoriesRef = (0, import_react.useRef)(t4);
  const scrubRef = (0, import_react.useRef)(null);
  let t5;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = tabId => {
      scrubRef.current = {
        tabId,
        entryIndex: -1
      };
    };
    $[7] = t5;
  } else t5 = $[7];
  const beginScrub = t5;
  let t6;
  if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
    t6 = () => {
      scrubRef.current = null;
    };
    $[8] = t6;
  } else t6 = $[8];
  const endScrub = t6;
  let t7;
  if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = tabId_0 => {
      if (!tabHistoriesRef.current.has(tabId_0)) tabHistoriesRef.current.set(tabId_0, {
        undoStack: [],
        redoStack: []
      });
      return tabHistoriesRef.current.get(tabId_0);
    };
    $[9] = t7;
  } else t7 = $[9];
  const getOrCreateHistory = t7;
  let t8;
  if ($[10] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = tabId_1 => {
      const history = getOrCreateHistory(tabId_1);
      onHistoryChangeRef.current?.(history.undoStack.length > 0, history.redoStack.length > 0);
    };
    $[10] = t8;
  } else t8 = $[10];
  const notifyChange = t8;
  let t9;
  if ($[11] !== maxHistory) {
    t9 = (tabId_2, store, ops, t10) => {
      const source = t10 === void 0 ? "user" : t10;
      const opsArray = Array.isArray(ops) ? ops : [ops];
      if (opsArray.length === 0) return store;
      const history_0 = getOrCreateHistory(tabId_2);
      let newStore = applyOperationsToStore(store, opsArray);
      const extraOps = normalizeOpsRef.current?.(newStore, opsArray) ?? [];
      const entryOps = extraOps.length > 0 ? [...opsArray, ...extraOps] : opsArray;
      if (extraOps.length > 0) newStore = applyOperationsToStore(newStore, extraOps);
      const scrub = scrubRef.current;
      let merged = null;
      if (scrub && scrub.tabId === tabId_2 && scrub.entryIndex >= 0 && scrub.entryIndex < history_0.undoStack.length) merged = mergeScrubOps(history_0.undoStack[scrub.entryIndex], entryOps);
      if (merged) history_0.undoStack[scrub.entryIndex] = merged;else {
        history_0.undoStack.push(entryOps);
        if (scrub && scrub.tabId === tabId_2 && scrub.entryIndex < 0) scrub.entryIndex = history_0.undoStack.length - 1;
        if (history_0.undoStack.length > maxHistory) {
          history_0.undoStack.shift();
          if (scrub && scrub.entryIndex >= 0) scrub.entryIndex = scrub.entryIndex - 1;
        }
      }
      history_0.redoStack = [];
      notifyChange(tabId_2);
      onOperationRef.current?.(entryOps, newStore, "do", tabId_2, source);
      return newStore;
    };
    $[11] = maxHistory;
    $[12] = t9;
  } else t9 = $[12];
  const pushOperation = t9;
  let t10;
  if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
    t10 = (tabId_3, store_0) => {
      const history_1 = getOrCreateHistory(tabId_3);
      if (history_1.undoStack.length === 0) return store_0;
      const lastOps = history_1.undoStack.pop();
      const newStore_0 = applyOperationsToStore(store_0, invertOperations(lastOps));
      history_1.redoStack.push(lastOps);
      notifyChange(tabId_3);
      onOperationRef.current?.(lastOps, newStore_0, "undo", tabId_3);
      return newStore_0;
    };
    $[13] = t10;
  } else t10 = $[13];
  const undo = t10;
  let t11;
  if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
    t11 = (tabId_4, store_1) => {
      const history_2 = getOrCreateHistory(tabId_4);
      if (history_2.redoStack.length === 0) return store_1;
      const lastOps_0 = history_2.redoStack.pop();
      const newStore_1 = applyOperationsToStore(store_1, lastOps_0);
      history_2.undoStack.push(lastOps_0);
      notifyChange(tabId_4);
      onOperationRef.current?.(lastOps_0, newStore_1, "redo", tabId_4);
      return newStore_1;
    };
    $[14] = t11;
  } else t11 = $[14];
  const redo = t11;
  let t12;
  if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = tabId_5 => getOrCreateHistory(tabId_5).undoStack.length > 0;
    $[15] = t12;
  } else t12 = $[15];
  const canUndo = t12;
  let t13;
  if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
    t13 = tabId_6 => getOrCreateHistory(tabId_6).redoStack.length > 0;
    $[16] = t13;
  } else t13 = $[16];
  const canRedo = t13;
  let t14;
  if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
    t14 = tabId_7 => {
      tabHistoriesRef.current.delete(tabId_7);
      notifyChange(tabId_7);
    };
    $[17] = t14;
  } else t14 = $[17];
  const clearHistory = t14;
  let t15;
  if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
    t15 = () => {
      tabHistoriesRef.current.clear();
    };
    $[18] = t15;
  } else t15 = $[18];
  const clearAllHistory = t15;
  let t16;
  if ($[19] !== maxHistory) {
    t16 = (tabId_8, ops_0, postOpStore, t17) => {
      const source_0 = t17 === void 0 ? "user" : t17;
      const opsArray_0 = Array.isArray(ops_0) ? ops_0 : [ops_0];
      if (opsArray_0.length === 0) return;
      const history_3 = getOrCreateHistory(tabId_8);
      const scrub_0 = scrubRef.current;
      let merged_0 = null;
      if (scrub_0 && scrub_0.tabId === tabId_8 && scrub_0.entryIndex >= 0 && scrub_0.entryIndex < history_3.undoStack.length) merged_0 = mergeScrubOps(history_3.undoStack[scrub_0.entryIndex], opsArray_0);
      if (merged_0) history_3.undoStack[scrub_0.entryIndex] = merged_0;else {
        history_3.undoStack.push(opsArray_0);
        if (scrub_0 && scrub_0.tabId === tabId_8 && scrub_0.entryIndex < 0) scrub_0.entryIndex = history_3.undoStack.length - 1;
        if (history_3.undoStack.length > maxHistory) {
          history_3.undoStack.shift();
          if (scrub_0 && scrub_0.entryIndex >= 0) scrub_0.entryIndex = scrub_0.entryIndex - 1;
        }
      }
      history_3.redoStack = [];
      notifyChange(tabId_8);
      onOperationRef.current?.(opsArray_0, postOpStore, "do", tabId_8, source_0);
    };
    $[19] = maxHistory;
    $[20] = t16;
  } else t16 = $[20];
  const recordOperations = t16;
  let t17;
  if ($[21] !== pushOperation || $[22] !== recordOperations) {
    t17 = {
      pushOperation,
      recordOperations,
      undo,
      redo,
      canUndo,
      canRedo,
      clearHistory,
      clearAllHistory,
      beginScrub,
      endScrub
    };
    $[21] = pushOperation;
    $[22] = recordOperations;
    $[23] = t17;
  } else t17 = $[23];
  return t17;
}

export { isHumanCanvasCommit, useTabHistory };
