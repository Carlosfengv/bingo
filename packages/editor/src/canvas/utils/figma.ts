/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/figma.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { applyOperationsToStore, createSetStylesOperation } from "../../shared/utils/operations";
import { getById, getChildren$2 } from "@bingo/compiler";

function indexFigmaNodeIdsInStore(store, rootIds) {
  const map = new Map();
  const walk = id => {
    const el = getById(store, id);
    if (!el) return;
    if (el.type === "html") {
      const figmaNodeId = el.props?.["data-figma-node-id"];
      if (typeof figmaNodeId === "string") map.set(figmaNodeId, id);
    }
    for (const childId of getChildren$2(store, id)) walk(childId);
  };
  for (const rootId of rootIds) walk(rootId);
  return map;
}
function applyFigmaImagePatchesToStore(store, rootIds, patches) {
  let next = store;
  const nodeIndex = indexFigmaNodeIdsInStore(next, rootIds);
  for (const {
    figmaNodeId,
    stylePatch
  } of patches) {
    const elementId = nodeIndex.get(figmaNodeId);
    if (!elementId) continue;
    const el = getById(next, elementId);
    if (!el || el.type !== "html") continue;
    const merged = {
      ...(el.styles ?? {}),
      ...stylePatch
    };
    if (stylePatch.backgroundImage) delete merged.backgroundColor;
    if (stylePatch.maskImage || stylePatch.WebkitMaskImage) delete merged.backgroundColor;
    const op = createSetStylesOperation(next, elementId, merged);
    if (op) next = applyOperationsToStore(next, [op]);
  }
  return next;
}

export { applyFigmaImagePatchesToStore };
