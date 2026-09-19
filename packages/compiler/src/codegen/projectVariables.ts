import { getChildren$2, getRootIds } from "../store/read";
import { resolveCollectionModes, variableDeclarationsForModes } from "../runtime/variables";

/** Project CSS supplies source variables. Materialize managed tokens at the
 * output boundary and mode deltas at explicit local boundaries only. Never
 * apply the renderer's blanket component/portal bridge to source code. */
export function prepareProjectVariableStore(store, options) {
  const library = options.variableLibrary;
  if (!library.tokens.length) return store;
  const byId = new Map(store.byId);
  const pageModes = options.variablePageModes ?? store.variableModes ?? {};
  const defaults = Object.fromEntries(library.collections.map(collection => [collection.id, collection.defaultModeId]));
  const defaultDeclarations = variableDeclarationsForModes(library, defaults);
  const managedNames = new Set(library.tokens.filter(token => token.sourceRef?.kind !== "css").map(token => `--${token.cssName}`));
  const visit = (id, inherited, outputRoot) => {
    const element = store.byId.get(id);
    if (!element) return;
    const modes = resolveCollectionModes(store, id, library, pageModes).modes;
    const declarations = variableDeclarationsForModes(library, modes);
    // Captures emit a fragment, so their exported children carry the boundary.
    const emitsElement = element.type !== "capture";
    const hasLocalMode = Object.keys(element.theme?.localCollectionModes ?? {}).length > 0;
    if (emitsElement && (outputRoot || hasLocalMode)) {
      const delta = Object.fromEntries(Object.entries(declarations).filter(([name, value]) =>
        value !== inherited[name] || outputRoot && managedNames.has(name)));
      if (Object.keys(delta).length) byId.set(id, { ...element, styles: { ...delta, ...element.styles } });
    }
    const exported = byId.get(id);
    const ownDeclarations = Object.fromEntries(Object.entries(exported.styles ?? {}).filter(([name]) => name.startsWith("--")));
    const nextInherited = emitsElement ? { ...inherited, ...ownDeclarations } : inherited;
    for (const child of getChildren$2(store, id)) visit(child, nextInherited, outputRoot && !emitsElement || !emitsElement && hasLocalMode);
  };
  for (const id of options.rootId != null ? [options.rootId] : getRootIds(store)) visit(id, defaultDeclarations, true);
  return { ...store, byId };
}
