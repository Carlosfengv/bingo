/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/selection.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getParentId } from "@bingo/compiler";

/**
* Same ids, order-independent. Selection is held in a Set, so a fresh instance
* with identical contents still re-renders the whole canvas tree — nothing
* downstream is memoised on its contents. Callers compare before committing.
*/
function sameSelection(a, b) {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}
/** How long after a click a further click still continues the same sequence.
*  Past the platform double-click interval on purpose: a burst is deliberate,
*  and a gap this long already reads as a fresh gesture. */
var SEQUENCE_MS = 500;
/** How far a click may land from the last one and still continue it. Generous,
*  because a hand clicking five times in a second does not hold still — and a
*  reset here costs the user a level with no feedback that anything happened. */
var SEQUENCE_SLOP = 16;
var sequenceCount = 0;
var sequenceAt = 0;
var sequenceX = 0;
var sequenceY = 0;
/**
* Position of this click in its rapid sequence: 1 for the first, then 2, 3, 4…
* for as long as the clicks keep coming at the same spot.
*
* Counted here rather than read from `MouseEvent.detail`, which cannot express
* a long burst: Chromium stops its native counter at 3 and starts the next
* click over at 1, so every 4th click read as the beginning of a new sequence
* and the descent stalled a level short — once per three clicks, forever.
*/
function countClick(x, y, now = Date.now()) {
  sequenceCount = now - sequenceAt < SEQUENCE_MS && Math.hypot(x - sequenceX, y - sequenceY) <= SEQUENCE_SLOP ? sequenceCount + 1 : 1;
  sequenceAt = now;
  sequenceX = x;
  sequenceY = y;
  return sequenceCount;
}
/**
* Whether this click descends a level. The first click of a sequence selects;
* every click after it, while the sequence lasts, goes one level deeper — so a
* quick 5-click burst lands on the 5th element down, and clicking five times
* slowly just keeps re-selecting the same one.
*
* That makes both readings hold at once: a lone click never descends, and a
* deliberate double-click descends exactly one level (counts 1 then 2) no
* matter how many times it is repeated.
*
* Reading the count instead of listening for `dblclick` is also what lets a
* burst chain — the 3rd and 4th clicks descend on their own rather than waiting
* to be paired up.
*/
function isDescendClick(click) {
  return click.detail >= 2;
}
/**
* Click descent: the direct child of `parentId` on the clicked
* element's ancestor path, or null when there is none — the click sat on
* `parentId`'s own padding, or outside it entirely. `path` runs innermost first,
* so the deepest matching child wins and overlapping siblings resolve to the one
* actually clicked.
*/
function resolveDescendTarget(store, parentId, path) {
  for (const id of path) if (id !== parentId && getParentId(store, id) === parentId) return id;
  return null;
}

export { countClick, isDescendClick, resolveDescendTarget, sameSelection };
