/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/store/apply.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { canAcceptChild, hasChildren$1 } from "./types";

function applyOps(store, ops) {
  if (ops.length === 0) return store;
  const next = ops.some(affectsTree) ? cloneFull(store) : cloneSettersOnly(store);
  for (const op of ops) mutate(next, op);
  return next;
}
function affectsTree(op) {
  return op.type === "insert" || op.type === "remove" || op.type === "move";
}
function cloneSettersOnly(store) {
  return {
    byId: new Map(store.byId),
    childrenByParent: store.childrenByParent,
    parentByChild: store.parentByChild
  };
}
function cloneFull(store) {
  return {
    byId: new Map(store.byId),
    childrenByParent: new Map(store.childrenByParent),
    parentByChild: new Map(store.parentByChild)
  };
}
function mutate(s, op) {
  switch (op.type) {
    case "insert":
      return mutateInsert(s, op);
    case "remove":
      return mutateRemove(s, op);
    case "move":
      return mutateMove(s, op);
    case "set_position":
      return mutateUpdateField(s, op.id, el => ({
        ...el,
        canvasPosition: op.position
      }));
    case "set_styles":
      return mutateUpdateField(s, op.id, el => ({
        ...el,
        styles: op.styles,
        ...(op.scaleAnchorTransform !== void 0 ? {
          scaleAnchorTransform: op.scaleAnchorTransform ?? void 0
        } : {}),
        ...(op.scalePivot !== void 0 ? {
          scalePivot: op.scalePivot ?? void 0
        } : {}),
        ...(op.canvasPosition !== void 0 ? {
          canvasPosition: op.canvasPosition ?? void 0
        } : {})
      }));
    case "set_props":
      return mutateSetProps(s, op);
    case "set_text":
      return mutateSetText(s, op);
    case "set_name":
      return mutateUpdateField(s, op.id, el => ({
        ...el,
        name: op.name
      }));
    case "replace":
      return mutateReplace(s, op);
  }
}
function mutateInsert(s, op) {
  const {
    element,
    parentId,
    index
  } = op;
  if (s.byId.has(element.id)) throw new Error(`applyOp insert: id "${element.id}" already exists`);
  if (parentId !== "ROOT") {
    const parent = s.byId.get(parentId);
    if (!parent) throw new Error(`applyOp insert: parent "${parentId}" not found`);
    if (!hasChildren$1(parent)) throw new Error(`applyOp insert: parent "${parentId}" of type ${parent.type} cannot have children`);
    if (!canAcceptChild(parent, element)) throw new Error(`applyOp insert: parent "${parentId}" (tag ${parent.tag}) cannot accept a child of type ${element.type} (tag ${element.tag})`);
  }
  attachToParent(s, element.id, parentId, index);
  s.byId.set(element.id, element);
}
function mutateRemove(s, op) {
  const {
    id
  } = op;
  const parent = s.parentByChild.get(id);
  if (parent === void 0) throw new Error(`applyOp remove: id "${id}" not found`);
  for (const dId of collectDescendantIds(s.childrenByParent, id)) {
    s.byId.delete(dId);
    s.parentByChild.delete(dId);
    s.childrenByParent.delete(dId);
  }
  s.byId.delete(id);
  s.parentByChild.delete(id);
  s.childrenByParent.delete(id);
  detachFromParent(s, id, parent);
}
function mutateMove(s, op) {
  const {
    id,
    toParentId,
    toIndex
  } = op;
  const fromParent = s.parentByChild.get(id);
  if (fromParent === void 0) throw new Error(`applyOp move: id "${id}" not found`);
  if (toParentId !== "ROOT") {
    if (toParentId === id) throw new Error(`applyOp move: cannot move "${id}" under itself`);
    let cursor = toParentId;
    while (cursor !== void 0 && cursor !== "ROOT") {
      if (cursor === id) throw new Error(`applyOp move: cannot move "${id}" under its own descendant`);
      cursor = s.parentByChild.get(cursor);
    }
    const newParent = s.byId.get(toParentId);
    if (!newParent) throw new Error(`applyOp move: target parent "${toParentId}" not found`);
    if (!hasChildren$1(newParent)) throw new Error(`applyOp move: parent "${toParentId}" of type ${newParent.type} cannot have children`);
    const movedElement = s.byId.get(id);
    if (movedElement && !canAcceptChild(newParent, movedElement)) throw new Error(`applyOp move: parent "${toParentId}" (tag ${newParent.tag}) cannot accept a child of tag ${movedElement.tag}`);
  }
  detachFromParent(s, id, fromParent);
  attachToParent(s, id, toParentId, toIndex);
}
function mutateUpdateField(s, id, update) {
  const el = s.byId.get(id);
  if (!el) throw new Error(`applyOp update: id "${id}" not found`);
  s.byId.set(id, update(el));
}
function mutateSetProps(s, op) {
  const el = s.byId.get(op.id);
  if (!el) throw new Error(`applyOp set_props: id "${op.id}" not found`);
  if (el.type !== "html" && el.type !== "component" && el.type !== "icon") throw new Error(`applyOp set_props: type ${el.type} does not carry props`);
  s.byId.set(op.id, {
    ...el,
    props: op.props
  });
}
function mutateSetText(s, op) {
  const el = s.byId.get(op.id);
  if (!el) throw new Error(`applyOp set_text: id "${op.id}" not found`);
  if (el.type !== "text") throw new Error(`applyOp set_text: id "${op.id}" is not a text element`);
  const next = {
    ...el
  };
  if (op.children !== void 0) {
    next.children = op.children;
    delete next.text;
  } else {
    next.text = op.text ?? "";
    delete next.children;
  }
  s.byId.set(op.id, next);
}
function mutateReplace(s, op) {
  const {
    id,
    element
  } = op;
  if (!s.byId.has(id)) throw new Error(`applyOp replace: id "${id}" not found`);
  if (element.id !== id) throw new Error(`applyOp replace: replacement element id "${element.id}" does not match target "${id}"`);
  s.byId.set(id, element);
}
function attachToParent(s, id, parent, index) {
  const existing = s.childrenByParent.get(parent);
  const next = existing ? [...existing] : [];
  const safeIndex = clamp$2(index, 0, next.length);
  next.splice(safeIndex, 0, id);
  s.childrenByParent.set(parent, next);
  s.parentByChild.set(id, parent);
}
function detachFromParent(s, id, parent) {
  const existing = s.childrenByParent.get(parent);
  if (!existing) return;
  const idx = existing.indexOf(id);
  if (idx < 0) return;
  const next = [...existing];
  next.splice(idx, 1);
  s.childrenByParent.set(parent, next);
}
function collectDescendantIds(childrenByParent, id) {
  const out = [];
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current !== id) out.push(current);
    const children = childrenByParent.get(current);
    if (!children) continue;
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
  }
  return out;
}
function clamp$2(n, lo, hi) {
  if (!Number.isFinite(n)) return hi;
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

export { applyOps, collectDescendantIds };
