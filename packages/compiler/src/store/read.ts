/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/store/read.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { collectDescendantIds } from "./apply";

function getById(store, id) {
  return store.byId.get(id);
}
function getParentId(store, id) {
  return store.parentByChild.get(id) ?? null;
}
function getChildren$2(store, parent) {
  return store.childrenByParent.get(parent) ?? EMPTY$2;
}
function getRootIds(store) {
  return store.childrenByParent.get("ROOT") ?? EMPTY$2;
}
function getIndex(store, id) {
  const parent = store.parentByChild.get(id);
  if (parent === void 0) return -1;
  const siblings = store.childrenByParent.get(parent);
  if (!siblings) return -1;
  return siblings.indexOf(id);
}
function getDescendantIds(store, id) {
  return collectDescendantIds(store.childrenByParent, id);
}
function isDescendant(store, ancestorId, descendantId) {
  let current = store.parentByChild.get(descendantId);
  while (current !== void 0 && current !== "ROOT") {
    if (current === ancestorId) return true;
    current = store.parentByChild.get(current);
  }
  return false;
}
var TEXT_LIKE_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "span", "a", "button", "label", "li", "blockquote"]);
function isTextLikeOwner(store, id) {
  const el = store.byId.get(id);
  if (!el || el.type !== "html" || !TEXT_LIKE_TAGS.has(el.tag)) return false;
  const children = store.childrenByParent.get(id);
  if (!children || children.length !== 1) return false;
  return store.byId.get(children[0])?.type === "text";
}
function resolveTextOwner(store, id) {
  if (store.byId.get(id)?.type !== "text") return id;
  const parent = store.parentByChild.get(id);
  if (!parent || parent === "ROOT") return id;
  return isTextLikeOwner(store, parent) ? parent : id;
}
function isTextOwner(store, id) {
  return store.byId.get(id)?.type === "text" || isTextLikeOwner(store, id);
}
function walk(store, rootKey, visit) {
  const recurse = (parent, depth) => {
    const children = store.childrenByParent.get(parent);
    if (!children) return;
    for (const childId of children) {
      visit(childId, depth);
      recurse(childId, depth + 1);
    }
  };
  recurse(rootKey, 0);
}
var EMPTY$2 = Object.freeze([]);
function getChildren(store, parent) {
  return store.childrenByParent.get(parent) ?? EMPTY$1;
}
var EMPTY$1 = Object.freeze([]);

export { getById, getChildren$2, getDescendantIds, getIndex, getParentId, getRootIds, isDescendant, isTextLikeOwner, isTextOwner, resolveTextOwner, walk };
