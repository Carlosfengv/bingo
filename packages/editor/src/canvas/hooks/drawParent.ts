/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/hooks/drawParent.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { isContainedWithin } from "../utils/renderElement";

/**
* Tags that CANNOT host a drawn child: text runs (rendered as `span`) and
* void/media/leaf elements. Used only as a fallback when no store-backed
* predicate is wired — see {@link findContainerAt}.
*/
var LEAF_TAGS = new Set(["SPAN", "IMG", "INPUT", "TEXTAREA", "SELECT", "OPTION", "BR", "HR", "VIDEO", "AUDIO", "CANVAS", "IFRAME", "EMBED", "OBJECT", "SVG"]);
/**
* Geometry-based parent lookup: the nearest host element under the given screen
* point that can actually accept the drawn child. Walks up past elements that
* can't host it — so drawing over an `<img>`/void/leaf lands the new element as
* a sibling in the nearest real container (overlaying it), instead of being
* rejected at insert time and repelled to the canvas origin. The draw overlay is
* pointer-events:none, so elementFromPoint reports the canvas content beneath
* it. Returns null over empty canvas → caller drops at root.
*
* Prefers the store's structural rule (`canHost`, matching the insert-time
* guard so the two can't diverge); falls back to a DOM-tag check when unwired.
*/
function findContainerAt(clientX, clientY, child, canHost, mustEnclose) {
  let node = document.elementFromPoint(clientX, clientY);
  while (node) {
    const ided = node.closest("[data-element-id]");
    if (!ided) return null;
    const id = ided.getAttribute("data-element-id");
    if ((canHost && id ? canHost(id, child) : !LEAF_TAGS.has(ided.tagName)) && (!mustEnclose || enclosesRect(ided, mustEnclose))) return ided;
    node = ided.parentElement;
  }
  return null;
}
function enclosesRect(host, rect) {
  const r = host.getBoundingClientRect();
  return isContainedWithin(rect, {
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height
  });
}

export { findContainerAt };
