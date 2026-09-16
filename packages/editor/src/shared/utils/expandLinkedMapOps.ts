/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/expandLinkedMapOps.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { isComponentEditRoot } from "../../canvas/utils/captureComponentInstance";
import { createSetPropsOperation, createSetStylesOperation, createSetTextOperation } from "./operations";
import { getById, getParentId, walk } from "@bingo/compiler";

/** Same attr as packages/compiler stampMapHosts — keep string literal in sync. */
var BINGO_MAP_ATTR = "data-bingo-map";
function isEmptyRecord(a) {
  return !a || Object.keys(a).length === 0;
}
function shallowEqualRecords(a, b) {
  if (a === b) return true;
  if (isEmptyRecord(a) && isEmptyRecord(b)) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!(k in b)) return false;
    if (a[k] !== b[k]) {
      if (typeof a[k] === "object" && a[k] !== null && typeof b[k] === "object" && b[k] !== null) try {
        if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
      } catch {
        return false;
      } else return false;
    }
  }
  return true;
}
/**
* Stable "this is the same JSX template" fingerprint.
* Chat AI bubbles share className; user bubbles differ → only same branch links.
*
* Empty className is allowed: `data-bingo-map` already scopes to one JSX host slot,
* so bare mapped wrappers (e.g. DivButton rows) still fan out. Without a map
* stamp, siblingIdsByMapAndTemplate returns [] anyway.
*/
function templateSignature(el) {
  if (!el) return null;
  if (el.type === "component") {
    const c = el;
    const cn = typeof c.props?.className === "string" ? c.props.className.trim() : "";
    return `component:${c.componentName}:${cn}`;
  }
  if (el.type === "html") {
    const h = el;
    const cn = typeof h.props?.className === "string" ? h.props.className.trim() : "";
    return `html:${h.tag}:${cn}`;
  }
  return null;
}
function templateSignatureWithProps(el, props) {
  if (!el) return null;
  if (el.type === "component") {
    const c = el;
    const cn = typeof props?.className === "string" ? props.className.trim() : "";
    return `component:${c.componentName}:${cn}`;
  }
  if (el.type === "html") {
    const h = el;
    const cn = typeof props?.className === "string" ? props.className.trim() : "";
    return `html:${h.tag}:${cn}`;
  }
  return null;
}
function mapIdFromProps(props) {
  const v = props?.[BINGO_MAP_ATTR];
  return typeof v === "string" && v.length > 0 ? v : null;
}
function mapIdOf(el) {
  if (!el || el.type === "text" || el.type === "icon" || el.type === "webview") return null;
  return mapIdFromProps(el.props);
}
function findEditRootId(store, id) {
  let cursor = id;
  while (cursor) {
    const el = getById(store, cursor);
    if (el && isComponentEditRoot(el)) return cursor;
    const parent = getParentId(store, cursor);
    cursor = parent === "ROOT" || parent === null ? null : parent;
  }
  return null;
}
/**
* Same `.map()` (data-bingo-map) + same visual branch (template signature).
* `sig` / `mapId` must be *pre-edit* when className changed.
*/
function siblingIdsByMapAndTemplate(store, elementId, mapId, sig) {
  if (!mapId || !sig) return [];
  const frameId = findEditRootId(store, elementId);
  if (!frameId) return [];
  const ids = [];
  walk(store, frameId, id => {
    if (id === elementId) return;
    const el = getById(store, id);
    if (mapIdOf(el) !== mapId) return;
    if (templateSignature(el) !== sig) return;
    ids.push(id);
  });
  return ids;
}
/** Preserve compile stamps if a props replace dropped them. */
function propsWithPreservedMapStamp(newProps, oldProps) {
  const oldMap = mapIdFromProps(oldProps);
  if (!oldMap || mapIdFromProps(newProps)) return newProps;
  return {
    ...newProps,
    [BINGO_MAP_ATTR]: oldMap
  };
}
/**
* Returns EXTRA ops to apply after the primary batch (same contract as
* normalizeFlexShrinkOps). Primary ops are already applied to storeAfter.
*/
function expandLinkedMapOps(storeAfter, ops) {
  const extra = [];
  const seen = new Set();
  for (const op of ops) {
    if (op.type !== "set_styles" && op.type !== "set_props" && op.type !== "set_text") continue;
    const elementId = op.elementId;
    const primaryKey = `${op.type}:${elementId}`;
    if (seen.has(primaryKey)) continue;
    seen.add(primaryKey);
    const target = getById(storeAfter, elementId);
    const preEditSig = op.type === "set_props" ? templateSignatureWithProps(target, op.oldProps) : templateSignature(target);
    const siblings = siblingIdsByMapAndTemplate(storeAfter, elementId, op.type === "set_props" ? mapIdFromProps(op.oldProps) ?? mapIdOf(target) : mapIdOf(target), preEditSig);
    if (siblings.length === 0) continue;
    if (op.type === "set_styles") for (const sid of siblings) {
      if (seen.has(`set_styles:${sid}`)) continue;
      seen.add(`set_styles:${sid}`);
      const sib = getById(storeAfter, sid);
      if (!sib || sib.type === "text" || sib.type === "icon" || sib.type === "webview") continue;
      if (!shallowEqualRecords(sib.styles, op.oldStyles)) continue;
      const siblingOp = createSetStylesOperation(storeAfter, sid, op.newStyles);
      if (siblingOp) extra.push(siblingOp);
    } else if (op.type === "set_props") {
      const newProps = propsWithPreservedMapStamp(op.newProps, op.oldProps);
      for (const sid of siblings) {
        if (seen.has(`set_props:${sid}`)) continue;
        seen.add(`set_props:${sid}`);
        const sib = getById(storeAfter, sid);
        if (!sib || sib.type === "text") continue;
        if (!shallowEqualRecords(sib.props, op.oldProps)) continue;
        const siblingOp = createSetPropsOperation(storeAfter, sid, newProps);
        if (siblingOp) extra.push(siblingOp);
      }
    } else if (op.type === "set_text") {
      const oldText = op.oldText ?? "";
      const newContent = op.newChildren !== void 0 ? {
        children: op.newChildren
      } : {
        text: op.newText ?? ""
      };
      for (const sid of siblings) {
        if (seen.has(`set_text:${sid}`)) continue;
        seen.add(`set_text:${sid}`);
        const sib = getById(storeAfter, sid);
        if (!sib || sib.type !== "text") continue;
        if ((sib.text ?? "") !== oldText) continue;
        const sibHasRich = !!(sib.children && sib.children.length > 0);
        const opHasRich = op.newChildren !== void 0 || !!(op.oldChildren && op.oldChildren.length > 0);
        if (sibHasRich || opHasRich) {
          if (!op.oldChildren || JSON.stringify(sib.children) !== JSON.stringify(op.oldChildren)) continue;
        }
        const siblingOp = createSetTextOperation(storeAfter, sid, newContent);
        if (siblingOp) extra.push(siblingOp);
      }
    }
  }
  return extra;
}

export { expandLinkedMapOps };
