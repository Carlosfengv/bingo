/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/canvasPayload.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ensureV2, getRootIds } from "@bingo/compiler";

/**
* Read either a legacy nested FEElement[] payload or a StoreWireV2 wire envelope
* and return nested FEElement[]. Lets this client read canvases written by a
* newer client that emits the v2 wire format.
*
* Saves on this client still write legacy nested arrays — the bridge is read-only.
*/
function readCanvasElements(payload) {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  return storeToNested(ensureV2(payload));
}
function storeToNested(store) {
  const build = id => {
    const el = store.byId.get(id);
    if (!el) throw new Error(`readCanvasElements: missing element "${id}"`);
    const childIds = store.childrenByParent.get(id) ?? [];
    if (childIds.length === 0 || !hasNestedChildren(el)) return {
      ...el
    };
    return {
      ...el,
      children: childIds.map(build)
    };
  };
  return getRootIds(store).map(build);
}
function hasNestedChildren(element) {
  return element.type !== "text" && element.type !== "icon" && element.type !== "webview";
}

export { readCanvasElements };
