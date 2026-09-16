/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/useSelectionJsxEditor.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getById, getRootIds, parseJSX, preserveMatchingSubtreeIds, storeSubtreeToLegacyNested } from "@bingo/compiler";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

var PREVIEW_DEBOUNCE_MS = 300;
/**
* Editable Selection-tab JSX (LUN-79 part 1). Owns the draft/dirty/error/preview
* state machine for editing the selected element's JSX snippet: valid JSX
* live-previews on the canvas (debounced, ephemeral) and committing replaces the
* subtree in the store while preserving element identity.
*/
function useSelectionJsxEditor(t0) {
  const $ = (0, import_compiler_runtime.c)(39);
  const {
    selectedElementId,
    selectedElementSnippet,
    store,
    iconLibraries,
    components,
    onPreviewElement,
    onClearPreview,
    onReplaceElement
  } = t0;
  const [draft, setDraft] = (0, import_react.useState)(selectedElementSnippet);
  const [dirty, setDirty] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [previewUnapplied, setPreviewUnapplied] = (0, import_react.useState)(false);
  const previewTimerRef = (0, import_react.useRef)(null);
  const [seededId, setSeededId] = (0, import_react.useState)(selectedElementId);
  const [seededSnippet, setSeededSnippet] = (0, import_react.useState)(selectedElementSnippet);
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    };
    $[0] = t1;
  } else t1 = $[0];
  const cancelPreviewTimer = t1;
  if (seededId !== selectedElementId || !dirty && selectedElementSnippet !== seededSnippet) {
    setSeededId(selectedElementId);
    setSeededSnippet(selectedElementSnippet);
    setDraft(selectedElementSnippet);
    setDirty(false);
    setError(null);
    setPreviewUnapplied(false);
  }
  const prevSelectedIdRef = (0, import_react.useRef)(selectedElementId);
  let t2;
  let t3;
  if ($[1] !== onClearPreview || $[2] !== selectedElementId) {
    t2 = () => {
      if (prevSelectedIdRef.current === selectedElementId) return;
      prevSelectedIdRef.current = selectedElementId;
      cancelPreviewTimer();
      onClearPreview?.();
    };
    t3 = [selectedElementId, onClearPreview];
    $[1] = onClearPreview;
    $[2] = selectedElementId;
    $[3] = t2;
    $[4] = t3;
  } else {
    t2 = $[3];
    t3 = $[4];
  }
  (0, import_react.useEffect)(t2, t3);
  let t4;
  let t5;
  if ($[5] !== onClearPreview) {
    t4 = () => () => {
      cancelPreviewTimer();
      onClearPreview?.();
    };
    t5 = [onClearPreview];
    $[5] = onClearPreview;
    $[6] = t4;
    $[7] = t5;
  } else {
    t4 = $[6];
    t5 = $[7];
  }
  (0, import_react.useEffect)(t4, t5);
  let t6;
  if ($[8] !== components || $[9] !== iconLibraries || $[10] !== selectedElementId || $[11] !== store) {
    t6 = jsx => {
      if (!selectedElementId) return {
        error: "No element selected"
      };
      try {
        const parsed = parseJSX(jsx, iconLibraries, components, void 0, {
          forceNewIds: true
        });
        const roots = getRootIds(parsed);
        if (roots.length === 0) return {
          error: "No element found in JSX"
        };
        const previousRoot = storeSubtreeToLegacyNested(store, selectedElementId);
        const parsedRoots = roots.map(id => storeSubtreeToLegacyNested(parsed, id));
        const built = buildSelectionRootFromParsed(previousRoot, selectedElementId, parsedRoots);
        if ("error" in built) return built;
        const element = built.element;
        const original = getById(store, selectedElementId);
        if (original) {
          if (original.canvasPosition) element.canvasPosition = {
            ...original.canvasPosition
          };
          const originalSourceInfo = original.sourceInfo;
          if (originalSourceInfo) element.sourceInfo = originalSourceInfo;
        }
        return {
          element
        };
      } catch (t7) {
        const err = t7;
        if (err instanceof Error) return {
          error: err.message
        };
        return {
          error: String(err)
        };
      }
    };
    $[8] = components;
    $[9] = iconLibraries;
    $[10] = selectedElementId;
    $[11] = store;
    $[12] = t6;
  } else t6 = $[12];
  const buildElementFromDraft = t6;
  let t7;
  if ($[13] !== buildElementFromDraft || $[14] !== onPreviewElement || $[15] !== selectedElementId) {
    t7 = jsx_0 => {
      cancelPreviewTimer();
      previewTimerRef.current = setTimeout(() => {
        const {
          element: element_0
        } = buildElementFromDraft(jsx_0);
        if (element_0 && selectedElementId) {
          setPreviewUnapplied(false);
          onPreviewElement?.(selectedElementId, element_0);
        } else setPreviewUnapplied(true);
      }, PREVIEW_DEBOUNCE_MS);
    };
    $[13] = buildElementFromDraft;
    $[14] = onPreviewElement;
    $[15] = selectedElementId;
    $[16] = t7;
  } else t7 = $[16];
  const schedulePreview = t7;
  let t8;
  if ($[17] !== onClearPreview || $[18] !== schedulePreview || $[19] !== selectedElementSnippet) {
    t8 = value => {
      setDraft(value);
      const nextDirty = value !== selectedElementSnippet;
      setDirty(nextDirty);
      setError(null);
      if (!nextDirty) {
        cancelPreviewTimer();
        setPreviewUnapplied(false);
        onClearPreview?.();
        return;
      }
      schedulePreview(value);
    };
    $[17] = onClearPreview;
    $[18] = schedulePreview;
    $[19] = selectedElementSnippet;
    $[20] = t8;
  } else t8 = $[20];
  const onChange = t8;
  let t9;
  if ($[21] !== onClearPreview || $[22] !== selectedElementSnippet) {
    t9 = () => {
      cancelPreviewTimer();
      setDraft(selectedElementSnippet);
      setDirty(false);
      setError(null);
      setPreviewUnapplied(false);
      onClearPreview?.();
    };
    $[21] = onClearPreview;
    $[22] = selectedElementSnippet;
    $[23] = t9;
  } else t9 = $[23];
  const reset = t9;
  let t10;
  if ($[24] !== buildElementFromDraft || $[25] !== dirty || $[26] !== draft || $[27] !== onClearPreview || $[28] !== onReplaceElement || $[29] !== selectedElementId) {
    t10 = () => {
      if (!dirty || !selectedElementId) return;
      cancelPreviewTimer();
      const {
        element: element_1,
        error: buildError
      } = buildElementFromDraft(draft);
      if (!element_1) {
        setError(buildError ?? "Invalid JSX");
        return;
      }
      onReplaceElement?.(selectedElementId, element_1);
      onClearPreview?.();
      setDirty(false);
      setError(null);
      setPreviewUnapplied(false);
    };
    $[24] = buildElementFromDraft;
    $[25] = dirty;
    $[26] = draft;
    $[27] = onClearPreview;
    $[28] = onReplaceElement;
    $[29] = selectedElementId;
    $[30] = t10;
  } else t10 = $[30];
  const apply = t10;
  let t11;
  if ($[31] !== apply || $[32] !== dirty || $[33] !== draft || $[34] !== error || $[35] !== onChange || $[36] !== previewUnapplied || $[37] !== reset) {
    t11 = {
      draft,
      dirty,
      error,
      previewUnapplied,
      onChange,
      reset,
      apply
    };
    $[31] = apply;
    $[32] = dirty;
    $[33] = draft;
    $[34] = error;
    $[35] = onChange;
    $[36] = previewUnapplied;
    $[37] = reset;
    $[38] = t11;
  } else t11 = $[38];
  return t11;
}
/**
* Re-wrap Selection-tab drafts under a capture host when needed, then reuse
* stable ids. Pure helper so capture ↔ Fragment round-trips are unit-tested.
*/
function buildSelectionRootFromParsed(previousRoot, selectedElementId, parsedRoots) {
  if (parsedRoots.length === 0) return {
    error: "No element found in JSX"
  };
  const previousCapture = previousRoot.type === "capture" ? previousRoot : null;
  let parsedRoot;
  if (parsedRoots.length === 1) {
    parsedRoot = parsedRoots[0];
    if (previousCapture && parsedRoot.id !== selectedElementId) parsedRoot = {
      ...previousCapture,
      children: [parsedRoot]
    };
  } else if (previousCapture) parsedRoot = {
    ...previousCapture,
    children: parsedRoots
  };else return {
    error: "Selection must have a single root element"
  };
  return {
    element: preserveMatchingSubtreeIds(previousRoot, parsedRoot)
  };
}

export { useSelectionJsxEditor };
