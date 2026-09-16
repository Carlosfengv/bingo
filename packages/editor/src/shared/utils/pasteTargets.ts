/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/pasteTargets.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { canAcceptChild, getById } from "@bingo/compiler";

/**
* Containers that a paste should fan out into.
*
* With more than one container selected, pasting drops a copy into each of them
* rather than picking one target. Returns an empty list when the selection isn't
* a clean set of containers, leaving the caller's single-target path in charge.
*/
function resolveMultiPasteTargets(store, selectedElementIds, elementsToPaste) {
  if (selectedElementIds.size < 2 || elementsToPaste.length === 0) return [];
  const sourceIds = new Set(elementsToPaste.map(el => el.id));
  const targets = [];
  for (const id of selectedElementIds) {
    if (sourceIds.has(id)) return [];
    const target = getById(store, id);
    if (!target) return [];
    if (!elementsToPaste.every(el => canAcceptChild(target, el))) return [];
    targets.push(id);
  }
  return targets;
}
/**
* Split a multi-element clipboard into per-source groups and hand one group to each
* target container.
*
* Elements copied from the same container stay together, and group *i* lands in target
* *i*. With more targets than groups the groups repeat, so pasting a two-container copy
* into three containers fills the third from the first group. With more groups than
* targets the last target takes everything left over, so nothing is dropped. A copy that
* came from a single container therefore goes into every target whole.
*/
function groupElementsByTarget(elements, sources, targets) {
  const byTarget = new Map();
  if (targets.length === 0 || elements.length === 0) return byTarget;
  const groups = [];
  if (!sources || sources.length !== elements.length) groups.push([...elements]);else {
    const order = [];
    const bySource = new Map();
    elements.forEach((el, i) => {
      const key = sources[i];
      const existing = bySource.get(key);
      if (existing) existing.push(el);else {
        bySource.set(key, [el]);
        order.push(key);
      }
    });
    for (const key of order) groups.push(bySource.get(key));
  }
  targets.forEach((target, i) => {
    const isLast = i === targets.length - 1;
    byTarget.set(target, isLast && groups.length > targets.length ? groups.slice(i).flat() : groups[i % groups.length]);
  });
  return byTarget;
}

export { groupElementsByTarget, resolveMultiPasteTargets };
