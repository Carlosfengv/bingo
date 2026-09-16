/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/visibleElement.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/**
* An element rendered with `display: contents` has no box of its own — its
* children lay out as if the wrapper weren't there, so `getBoundingClientRect`
* / `getComputedStyle().transform` on the wrapper are meaningless for overlay
* geometry. Walk down to the first descendant that actually renders a box.
*
* Shared by the selection/hover overlay and the styles-panel rotation scrub so
* both resolve the same element; keep this the single implementation.
*
* For multi-root components (Fragment with multiple children), prefer
* `measureVisibleBounds` / `resolveObservedElements` — this helper still returns
* only the first host (needed when a single DOM node is required).
*/
function resolveVisibleElement$1(domEl) {
  let el = domEl;
  let style = window.getComputedStyle(el);
  while (style.display === "contents" && el.firstElementChild) {
    el = el.firstElementChild;
    style = window.getComputedStyle(el);
  }
  return el;
}
/** True when a display:contents chain contains a multi-child hop (Fragment roots). */
function hasMultiRootContents(domEl) {
  let el = domEl;
  let style = window.getComputedStyle(el);
  while (style.display === "contents" && el.firstElementChild) {
    if (el.childElementCount > 1) return true;
    el = el.firstElementChild;
    style = window.getComputedStyle(el);
  }
  return false;
}
/**
* Screen-space AABB of the visible box(es) under `domEl`.
* For multi-root display:contents wrappers (Fragment components), unions all
* element children so overlays cover every root — not just the first.
*/
function measureVisibleBounds(domEl) {
  let el = domEl;
  let style = window.getComputedStyle(el);
  while (style.display === "contents" && el.firstElementChild) {
    if (el.childElementCount > 1) {
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      let found = false;
      for (const child of Array.from(el.children)) {
        const r = measureVisibleBounds(child);
        if (r.width <= 0 && r.height <= 0) continue;
        found = true;
        left = Math.min(left, r.left);
        top = Math.min(top, r.top);
        right = Math.max(right, r.right);
        bottom = Math.max(bottom, r.bottom);
      }
      if (found) return new DOMRect(left, top, right - left, bottom - top);
    }
    el = el.firstElementChild;
    style = window.getComputedStyle(el);
  }
  return el.getBoundingClientRect();
}
/**
* DOM nodes to ResizeObserve for geometry of `domEl`.
* Multi-root contents wrappers: every visible descendant box.
* Otherwise: the single resolved visible element.
*/
function resolveObservedElements(domEl) {
  let el = domEl;
  let style = window.getComputedStyle(el);
  while (style.display === "contents" && el.firstElementChild) {
    if (el.childElementCount > 1) {
      const observed = [];
      for (const child of Array.from(el.children)) observed.push(...resolveObservedElements(child));
      return observed.length > 0 ? observed : [resolveVisibleElement$1(domEl)];
    }
    el = el.firstElementChild;
    style = window.getComputedStyle(el);
  }
  return [el];
}

export { hasMultiRootContents, measureVisibleBounds, resolveObservedElements, resolveVisibleElement$1 };
