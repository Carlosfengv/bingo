type Store = {
  byId: ReadonlyMap<string, any>;
  childrenByParent: ReadonlyMap<string, readonly string[]>;
  parentByChild: ReadonlyMap<string, string>;
};

/** One cache per canvas. Cache React results, never DOM or component instances. */
export function createCanvasRenderCache() {
  let previousStore: Store | undefined;
  let previousOptions: Record<string, any> | undefined;
  const nodes = new Map<string, Map<string, unknown>>();
  const resourceKeys = new Set(["components", "componentIndex", "componentsRevision", "iconLibraries", "assetResolver"]);
  const componentVersions = new Map<string, { implementation: unknown; metadata: string; revision: number }>();
  let nextComponentRevision = 0;
  let clearedPaths = new WeakMap<Store, Set<string>>();
  const clearPath = (id: string, store: Store) => {
    let seen = clearedPaths.get(store);
    if (!seen) clearedPaths.set(store, seen = new Set());
    while (id && id !== "ROOT" && !seen.has(id)) {
      seen.add(id);
      nodes.delete(id);
      id = store.parentByChild.get(id)!;
    }
  };
  return {
    prepare(store: Store, options: Record<string, any>) {
      clearedPaths = new WeakMap();
      const previous = previousStore;
      const oldOptions = previousOptions;
      // Interactive parent changes affect only their immediate drag wrappers.
      const changedKeys = oldOptions ? [...new Set([...Object.keys(oldOptions), ...Object.keys(options)])]
        .filter(key => key !== "interactiveParentIds" && oldOptions[key] !== options[key]) : [];
      const changedOptions = !oldOptions || changedKeys.some(key => !resourceKeys.has(key));
      const changedComponents = new Set<string>();
      if (previous !== store || changedKeys.some(key => key.startsWith("component"))) {
        const used = new Set<string>();
        for (const element of store.byId.values()) if (element.type === "component" && !used.has(element.componentName)) {
          const name = element.componentName;
          used.add(name);
          const implementation = options.components?.[name];
          const metadata = JSON.stringify(options.componentIndex?.[name] ?? null);
          const old = componentVersions.get(name);
          if (!old || old.implementation !== implementation || old.metadata !== metadata) {
            componentVersions.set(name, { implementation, metadata, revision: ++nextComponentRevision });
            changedComponents.add(name);
          }
        }
        for (const name of componentVersions.keys()) if (!used.has(name)) componentVersions.delete(name);
      }
      if (!previous || changedOptions || options.editingTextId && previous !== store) nodes.clear();
      else {
        if (changedKeys.length) for (const [id, element] of store.byId) {
          const componentChanged = changedKeys.some(key => key.startsWith("component"));
          const hasAssets = ["img", "video", "source", "iframe"].includes(element.tag)
            || Object.values(element.styles || {}).some(value => typeof value === "string" && value.includes("url("));
          if (element.type === "component" && (changedComponents.has(element.componentName) || changedKeys.includes("assetResolver"))
            || element.props?.["data-component"] === "CapturedPage"
            || componentChanged && element.type === "capture"
            || changedKeys.includes("iconLibraries") && element.type === "icon"
            || changedKeys.includes("assetResolver") && (hasAssets || element.type === "webview")) clearPath(id, store);
        }
        if (previous !== store) {
          for (const [id, element] of store.byId) {
            if (element !== previous.byId.get(id)
              || store.childrenByParent.get(id) !== previous.childrenByParent.get(id)
              || store.parentByChild.get(id) !== previous.parentByChild.get(id)
              // Captures can consult the whole store internally.
              || element.props?.["data-component"] === "CapturedPage") {
              clearPath(id, previous);
              clearPath(id, store);
            }
          }
          for (const id of previous.byId.keys()) if (!store.byId.has(id)) clearPath(id, previous);
        }
        const oldParents: ReadonlySet<string> = oldOptions.interactiveParentIds ?? new Set();
        const newParents: ReadonlySet<string> = options.interactiveParentIds ?? new Set();
        if (oldParents !== newParents) for (const id of new Set([...oldParents, ...newParents])) {
          if (oldParents.has(id) === newParents.has(id)) continue;
          for (const child of store.childrenByParent.get(id) ?? []) clearPath(child, store);
        }
      }
      previousStore = store;
      previousOptions = options;
    },
    componentRevision(name: string) { return componentVersions.get(name)?.revision ?? 0; },
    render<T>(id: string, options: Record<string, any>, build: () => T): T {
      // Components using asChild / inspecting child.type must still receive
      // their actual React elements, not a new memo-wrapper component.
      const context = JSON.stringify([options._currentParentId ?? null, !!options.isSVGContext,
        !!options.isFrameRoot, !!options.isAsChildSlotTarget, !!options.isChildIntrospectionTarget]);
      let variants = nodes.get(id);
      if (variants?.has(context)) return variants.get(context) as T;
      const value = build();
      if (!variants) nodes.set(id, variants = new Map());
      variants.set(context, value);
      return value;
    },
  };
}
