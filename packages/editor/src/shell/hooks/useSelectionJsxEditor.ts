import { getById, getRootIds, parseJSX, preserveMatchingSubtreeIds, storeSubtreeToLegacyNested } from "@bingo/compiler";
import { useTranslation } from "@bingo/i18n";
import * as React from "react";

const PREVIEW_DEBOUNCE_MS = 300;

/** Keep an unapplied draft local. A preview or commit belongs to the page,
 * selection and document snapshot against which that draft was started. */
function useSelectionJsxEditor({ documentId, active = true, selectedElementId, selectedElementSnippet,
  store, iconLibraries, components, onPreviewElement, onClearPreview, onReplaceElement }) {
  const { t } = useTranslation("editor");
  const [draft, setDraft] = React.useState(selectedElementSnippet);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [previewUnapplied, setPreviewUnapplied] = React.useState(false);
  const [seed, setSeed] = React.useState({ documentId, id: selectedElementId, snippet: selectedElementSnippet });
  const baseStore = React.useRef(store);
  const timer = React.useRef(null);
  const generation = React.useRef(0);
  const latest = React.useRef(null);
  const drafts = React.useRef(new Map());
  const draftKey = JSON.stringify([documentId, selectedElementId]);
  const cancel = React.useCallback(() => {
    generation.current++;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  if (seed.documentId !== documentId || seed.id !== selectedElementId || !dirty && seed.snippet !== selectedElementSnippet) {
    const retained = drafts.current.get(draftKey);
    setSeed({ documentId, id: selectedElementId, snippet: selectedElementSnippet });
    setDraft(retained?.text ?? selectedElementSnippet); setDirty(!!retained); setError(null); setPreviewUnapplied(false);
    baseStore.current = retained?.store ?? store;
  }
  React.useLayoutEffect(() => {
    latest.current = { active, documentId, selectedElementId, store, onPreviewElement, onClearPreview, onReplaceElement };
  });
  React.useLayoutEffect(() => {
    cancel();
    onClearPreview?.();
    if (dirty && baseStore.current !== store) {
      setError(t("bottomBar.draftConflict")); setPreviewUnapplied(true);
    }
  }, [documentId, selectedElementId, store, active, components, iconLibraries]);
  React.useEffect(() => () => { cancel(); latest.current?.onClearPreview?.(); }, [cancel]);
  const build = jsx => {
    if (!selectedElementId || !getById(store, selectedElementId)) return { error: "No element selected" };
    try {
      const parsed = parseJSX(jsx, iconLibraries, components, undefined, { forceNewIds: true });
      const roots = getRootIds(parsed);
      const previous = storeSubtreeToLegacyNested(store, selectedElementId);
      const built = buildSelectionRootFromParsed(previous, selectedElementId, roots.map(id => storeSubtreeToLegacyNested(parsed, id)));
      if ("error" in built) return built;
      const original = getById(store, selectedElementId);
      if (original.canvasPosition) built.element.canvasPosition = { ...original.canvasPosition };
      if (original.sourceInfo) built.element.sourceInfo = original.sourceInfo;
      return built;
    } catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
  };
  const onChange = value => {
    cancel();
    if (!dirty) baseStore.current = store;
    setDraft(value);
    const changed = value !== selectedElementSnippet;
    if (changed) drafts.current.set(draftKey, { text: value, store: baseStore.current });
    else drafts.current.delete(draftKey);
    setDirty(changed); setError(null);
    if (!changed) { setPreviewUnapplied(false); latest.current?.onClearPreview?.(); return; }
    if (baseStore.current !== store) { setError(t("bottomBar.draftConflict")); return; }
    const version = generation.current;
    timer.current = setTimeout(() => {
      timer.current = null;
      const current = latest.current;
      if (generation.current !== version || !current.active || current.documentId !== documentId
        || current.selectedElementId !== selectedElementId || current.store !== store) return;
      const result = build(value);
      setPreviewUnapplied(!result.element);
      if (result.element) current.onPreviewElement?.(selectedElementId, result.element);
    }, PREVIEW_DEBOUNCE_MS);
  };
  const reset = () => {
    cancel(); baseStore.current = store;
    drafts.current.delete(draftKey);
    setDraft(selectedElementSnippet); setDirty(false); setError(null); setPreviewUnapplied(false);
    latest.current?.onClearPreview?.();
  };
  const apply = () => {
    if (!dirty || !selectedElementId) return;
    cancel();
    if (baseStore.current !== latest.current.store) { setError(t("bottomBar.draftConflict")); return; }
    const result = build(draft);
    if (!result.element) { setError(result.error ?? "Invalid JSX"); return; }
    latest.current.onReplaceElement?.(selectedElementId, result.element);
    latest.current.onClearPreview?.();
    drafts.current.delete(draftKey);
    setDirty(false); setError(null); setPreviewUnapplied(false);
  };
  const pendingKey = drafts.current.keys().next().value;
  return { draft, dirty, error, previewUnapplied, onChange, reset, apply,
    pendingDraft: pendingKey ? JSON.parse(pendingKey) : null };
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
