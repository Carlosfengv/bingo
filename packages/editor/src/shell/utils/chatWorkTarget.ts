/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/chatWorkTarget.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { componentNamesForWritePath, instanceIdsForComponentNames } from "../../canvas/utils/followAiCamera";
import { getById, getParentId } from "@bingo/compiler";

/** Show the complete top-level frame containing each edited node. */
function outermostChatWorkIds(store, elementIds) {
  const roots = new Set();
  for (const id of elementIds) {
    if (id === "ROOT" || !getById(store, id)) continue;
    let root = id;
    let parent = getParentId(store, root);
    while (parent && parent !== "ROOT") {
      root = parent;
      parent = getParentId(store, root);
    }
    roots.add(root);
  }
  return [...roots];
}
function chatWorkTargets(results) {
  return results.flatMap(result => {
    if (result.payload?.error || result.payload?.success === false || !["add_jsx", "update_jsx", "replace_with_component", "Write", "Edit"].includes(result.type)) return [];
    const elementIds = [...new Set([...(result.createdElementIds ?? []), result.createdElementId, result.payload?.elementId].filter(id => typeof id === "string" && id.length > 0))];
    const {
      componentName,
      path,
      canvasId
    } = result.payload ?? {};
    return elementIds.length || componentName || path ? [{
      elementIds,
      componentName,
      path,
      canvasId
    }] : [];
  });
}
/** Find the most recent surviving canvas work, including instances of edited files. */
function lastChatWorkTarget(messages, tabs, componentIndex) {
  for (let m = messages.length - 1; m >= 0; m--) {
    const message = messages[m];
    if (message.role !== "assistant") continue;
    const targets = message.workTargets ?? chatWorkTargets(message.toolResults ?? []);
    for (let t = targets.length - 1; t >= 0; t--) {
      const target = targets[t];
      for (const tab of tabs) {
        const elementIds = target.elementIds.filter(id => !!getById(tab.store, id));
        if (elementIds.length) return {
          tabId: tab.id,
          elementIds
        };
      }
      const unloadedTab = target.canvasId && tabs.find(tab => (tab.canvasId === target.canvasId || tab.id === target.canvasId) && tab.loaded === false);
      if (unloadedTab && target.elementIds.length) return {
        tabId: unloadedTab.id,
        elementIds: target.elementIds
      };
      if (target.elementIds.length) continue;
      const names = target.componentName ? [target.componentName] : target.path ? componentNamesForWritePath(target.path, componentIndex) : [];
      for (const tab of tabs) {
        const elementIds = instanceIdsForComponentNames(tab.store, names);
        if (elementIds.length) return {
          tabId: tab.id,
          elementIds
        };
      }
    }
  }
  return null;
}

export { chatWorkTargets, lastChatWorkTarget, outermostChatWorkIds };
