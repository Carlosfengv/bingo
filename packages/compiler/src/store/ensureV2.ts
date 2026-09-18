/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/store/ensureV2.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { sanitizeElementProps } from "./sanitize";
import { ROOT } from "./types";

function emptyMutableStore() {
  return {
    byId: new Map(),
    childrenByParent: new Map([[ROOT, []]]),
    parentByChild: new Map()
  };
}
function emptyStore() {
  return emptyMutableStore();
}
function ensureV2(raw) {
  if (raw === null || raw === void 0) return emptyStore();
  if (typeof raw !== "object") throw new Error(`ensureV2: expected object/array, got ${typeof raw}`);
  const obj = raw;
  if (obj["schemaVersion"] === 2 && typeof obj["byId"] === "object" && obj["byId"] !== null && typeof obj["childrenByParent"] === "object" && obj["childrenByParent"] !== null) return wireToStore(obj);
  if (Array.isArray(raw)) return storeFromNested(raw);
  if (Array.isArray(obj["elements"])) return storeFromNested(obj["elements"]);
  throw new Error("ensureV2: unrecognized canvas data shape");
}
function storeFromNested(nested) {
  const internal = emptyMutableStore();
  const visit = (raw, parent) => {
    if (!raw || typeof raw !== "object") throw new Error("storeFromNested: non-object element in tree");
    const node = raw;
    const id = node["id"];
    if (typeof id !== "string" || id.length === 0) throw new Error("storeFromNested: element missing id");
    if (internal.byId.has(id)) throw new Error(`storeFromNested: duplicate id "${id}"`);
    if (node["type"] === "text") {
      registerElement(internal, {
        ...node
      }, parent);
      return;
    }
    const {
      children,
      ...rest
    } = node;
    registerElement(internal, rest, parent);
    if (Array.isArray(children)) for (const child of children) visit(child, id);
  };
  for (const root of nested) visit(root, ROOT);
  return internal;
}
function wireToStore(wire) {
  const internal = emptyMutableStore();
  if (wire.variableModes && typeof wire.variableModes === "object" && !Array.isArray(wire.variableModes)) {
    internal.variableModes = Object.fromEntries(Object.entries(wire.variableModes).filter(([key, value]) => key && typeof value === "string" && value));
  }
  for (const [id, element] of Object.entries(wire.byId)) internal.byId.set(id, sanitizeLoadedElement(element));
  internal.childrenByParent.set(ROOT, []);
  for (const [parent, ids] of Object.entries(wire.childrenByParent)) {
    if (!Array.isArray(ids)) throw new Error(`wireToStore: childrenByParent[${parent}] is not an array`);
    internal.childrenByParent.set(parent, [...ids]);
    for (const childId of ids) {
      if (internal.parentByChild.has(childId)) throw new Error(`wireToStore: id "${childId}" appears under multiple parents`);
      internal.parentByChild.set(childId, parent);
    }
  }
  for (const id of internal.byId.keys()) if (!internal.parentByChild.has(id)) throw new Error(`wireToStore: id "${id}" in byId has no parent slot`);
  return internal;
}
function sanitizeLoadedElement(element) {
  if (element.type === "text") return element;
  const props = sanitizeElementProps(element.props);
  if (props === element.props) return element;
  return {
    ...element,
    props
  };
}
function appendChild(internal, parent, id) {
  const list = internal.childrenByParent.get(parent);
  if (list) list.push(id);else internal.childrenByParent.set(parent, [id]);
}
function registerElement(store, element, parentId) {
  if (store.byId.has(element.id)) throw new Error(`registerElement: duplicate element id "${element.id}"`);
  const sanitized = sanitizeLoadedElement(element);
  store.byId.set(element.id, sanitized);
  store.parentByChild.set(element.id, parentId);
  appendChild(store, parentId, element.id);
}

export { emptyMutableStore, emptyStore, ensureV2, registerElement, storeFromNested };
