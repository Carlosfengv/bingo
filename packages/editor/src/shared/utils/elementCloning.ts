/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/elementCloning.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { generatePrefixedId } from "./idUtils";

/** Element types that can carry nested `children` in the legacy/clipboard
*  shape this function operates on. Text nodes carry rich-text inline runs
*  in `children` (also FEElement-typed). Icon and webview are leaves. */
function hasNestedChildren$2(el) {
  return el.type !== "icon" && el.type !== "webview";
}
/**
* Assign fresh ids to every node in a nested tree (keeps sourceInfo / props).
* Use when a capture/resolve pipeline may have duplicated ids — storeFromNested
* rejects duplicates and replace/insert would throw.
*/
function regenerateTreeIds(element) {
  const root = structuredClone(element);
  const seen = new Set();
  const visit = node => {
    let nextId = generatePrefixedId(node.type);
    while (seen.has(nextId)) nextId = generatePrefixedId(node.type);
    seen.add(nextId);
    node.id = nextId;
    if (node.type === "text") {
      const runs = node.children;
      if (Array.isArray(runs)) {
        for (const run of runs) if (run && typeof run === "object" && "type" in run) visit(run);
      }
      return;
    }
    if (!hasNestedChildren$2(node)) return;
    const kids = node.children;
    if (Array.isArray(kids)) for (const kid of kids) visit(kid);
  };
  visit(root);
  return root;
}
/**
* Clone an element subtree (legacy nested) with fresh IDs at every node.
* Optionally offset canvasPosition (for paste/duplicate placement).
*
* Clears `sourceInfo` so linked `.map()` editing does not treat the clone as
* the same JSX template instance as the original (duplicate → independent).
*/
function cloneElementWithNewIds(element, offsetPosition = {
  x: 20,
  y: 20
}) {
  const el = structuredClone(element);
  const newId = generatePrefixedId(el.type);
  delete el.sourceInfo;
  if (!hasNestedChildren$2(el)) return {
    ...el,
    id: newId
  };
  const kids = el.children;
  return {
    ...el,
    id: newId,
    children: kids && kids.length > 0 ? kids.map(child => cloneElementWithNewIds(child, offsetPosition)) : void 0,
    canvasPosition: el.canvasPosition ? {
      x: el.canvasPosition.x + offsetPosition.x,
      y: el.canvasPosition.y + offsetPosition.y
    } : void 0
  };
}

export { cloneElementWithNewIds, regenerateTreeIds };
