/** Report the last observed fallback, without treating a saved component node as
 * proof that its implementation or icon glyph actually rendered.
 */
export function collectRenderDiagnostics(store, rootId, iconLibraries, components?, componentIndex = {}) {
  const ids = new Set<string>();
  const visit = id => {
    if (ids.has(id)) return;
    ids.add(id);
    for (const child of store.childrenByParent.get(id) ?? []) visit(child);
  };
  if (rootId) visit(rootId);
  else for (const id of store.byId.keys()) ids.add(id);
  const diagnostics = [];
  for (const id of ids) {
    const node = store.byId.get(id);
    const component = node?.type === "component" ? components?.[node.componentName] : undefined;
    const metadata = node?.type === "component" ? componentIndex[node.componentName] : undefined;
    const unavailable = components !== undefined && typeof component !== "function" && !(component && typeof component === "object" && "$$typeof" in component);
    // Old saved pages can retain this transient flag. Prefer the current registry
    // after a dependency repair rather than repeating an obsolete fallback warning.
    const missing = components === undefined ? !!node?._componentMissing : unavailable;
    if (node?.type === "component" && (missing || metadata?.runtimeError)) diagnostics.push({
      code:"COMPONENT_RENDER_FALLBACK", elementId:id, name:node.componentName,
      message:`${node.componentName} has no loaded implementation or is using a fallback. ${metadata?.runtimeError ? `Runtime error in ${metadata.path}: ${metadata.runtimeError}. ` : ""}Wait for loading, then check its module, direct dependencies and browser-only environment; text children do not prove the component loaded.`,
    });
    if (node?.type === "icon" && !iconLibraries?.[node.library]?.icons?.[node.iconName]) diagnostics.push({
      code:"ICON_RENDER_FALLBACK", elementId:id, name:node.iconName,
      message:`${node.iconName} is unavailable in ${node.library}. Verify the library is loaded and use an exact search_icons result.`,
    });
  }
  return diagnostics;
}
