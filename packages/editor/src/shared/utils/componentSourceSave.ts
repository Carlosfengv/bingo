/** A source save updates bookkeeping, never rewrites newer canvas edits. */
export function applyComponentSourceSave(store, result) {
  if (!store?.byId) return store;
  let byId;
  for (const [id, element] of store.byId) {
    const binding = element.componentEditing?.sourceBinding;
    if (!binding || binding.filePath !== result.filePath || binding.sourceHash !== result.previousHash) continue;
    const savedCall = binding.start === result.sourceBinding.start && binding.end === result.oldEnd;
    const start = binding.start >= result.oldEnd ? binding.start + result.delta : binding.start;
    const end = binding.end >= result.oldEnd ? binding.end + result.delta : binding.end;
    const nextBinding = savedCall ? result.sourceBinding : { ...binding, start, end, openingSource: result.code.slice(start, end), sourceHash: result.sourceBinding.sourceHash };
    byId ??= new Map(store.byId);
    byId.set(id, { ...element, componentEditing: { ...element.componentEditing, sourceBinding: nextBinding } });
  }
  return byId ? { ...store, byId } : store;
}

/** Undoing a style edit must not roll back the recorded version of a saved file. */
export function preserveSavedSourceBinding(element, editing) {
  const sourceBinding = element?.componentEditing?.sourceBinding;
  return sourceBinding ? { ...editing, schemaVersion: 1, sourceBinding } : editing;
}
