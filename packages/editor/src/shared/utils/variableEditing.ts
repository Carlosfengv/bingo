import { componentEditableElement } from "../../../../compiler/src/store/componentEditing";
import { createSetStylesOperation } from "./operations";

/** Variable bindings are instance style edits; mode selection alone is not. */
export function createVariableElementOperations(store, ids, transform, componentIndex = {}, editStyles = false) {
  return ids.flatMap(id => {
    const old = store.byId.get(id);
    if (!old) return [];
    const editable = editStyles ? componentEditableElement(old) : old;
    const next = transform(editable, store);
    if (next === editable || JSON.stringify(next) === JSON.stringify(old)) return [];
    const ops: any[] = [];
    if (next.styles !== old.styles) ops.push(createSetStylesOperation(store, id, next.styles, undefined, undefined, componentIndex[old.componentName], editStyles));
    if (next.theme !== old.theme) ops.push({ type: "set_theme", elementId: id, oldTheme: old.theme, newTheme: next.theme });
    return ops.filter(Boolean);
  });
}
