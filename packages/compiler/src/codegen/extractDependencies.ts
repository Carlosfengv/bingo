/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/extractDependencies.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getById, walk } from "../store/read";
import { ROOT } from "../store/types";

/**
* Extract unique component names from FEElement tree
*/
function extractComponentDependencies(store) {
  const components = new Set();
  walk(store, ROOT, id => {
    const element = getById(store, id);
    if (!element) return;
    if (element.type === "component") components.add(element.componentName);
  });
  return components;
}
/**
* Extract icon dependencies from element tree
* Returns a Map of library -> Set of icon names
*/
function extractIconDependencies(store) {
  const iconsByLibrary = new Map();
  walk(store, ROOT, id => {
    const element = getById(store, id);
    if (!element) return;
    if (element.type === "icon") {
      if (!iconsByLibrary.has(element.library)) iconsByLibrary.set(element.library, new Set());
      iconsByLibrary.get(element.library).add(element.iconName);
    }
  });
  return iconsByLibrary;
}

export { extractComponentDependencies, extractIconDependencies };
