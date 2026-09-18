/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/operations.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { cloneElementWithNewIds, regenerateTreeIds } from "./elementCloning";
import { removeScalePivot, scaleResetCanvasOffset } from "./scalePivot";
import { getTransformScales, hasScaleAnchorTransform } from "./scaleTransform";
import { applyOps } from "../../../../compiler/src/store/apply";
import { ensureV2 } from "../../../../compiler/src/store/ensureV2";
import { getById, getChildren$2, getIndex, getParentId, getRootIds } from "../../../../compiler/src/store/read";
import { storeSubtreeToLegacyNested } from "../../../../compiler/src/store/legacy";

/**
* Apply a single editor operation to a flat Store.
*/
function applyOperationToStore(store, op) {
  switch (op.type) {
    case "set_variable_modes":
      return applyOps(store, [{ type: "set_variable_modes", modes: op.newModes }]);
    case "set_theme":
      return applyOps(store, [{ type: "set_theme", id: op.elementId, theme: op.newTheme }]);
    case "insert":
      return applyOps(store, createStoreInsertOps(store, op.element, op.parentId, op.index));
    case "remove":
      return applyOps(store, [{
        type: "remove",
        id: op.elementId
      }]);
    case "move":
      return applyOps(store, [{
        type: "move",
        id: op.elementId,
        toParentId: toStoreParent(op.toParentId),
        toIndex: op.toIndex
      }]);
    case "set_position":
      return applyOps(store, [{
        type: "set_position",
        id: op.elementId,
        position: op.newPosition
      }]);
    case "set_styles":
      return applyOps(store, [{
        type: "set_styles",
        id: op.elementId,
        styles: op.newStyles,
        scaleAnchorTransform: op.newScaleAnchorTransform,
        scalePivot: op.newScalePivot,
        canvasPosition: op.newCanvasPosition
      }, ...(op.oldTheme !== undefined || op.newTheme !== undefined ? [{ type: "set_theme", id: op.elementId, theme: op.newTheme }] : [])]);
    case "set_props":
      return applyOps(store, [{
        type: "set_props",
        id: op.elementId,
        props: op.newProps
      }]);
    case "set_name":
      return applyOps(store, [{
        type: "set_name",
        id: op.elementId,
        name: op.newName
      }]);
    case "set_text":
      return applyOps(store, [op.newChildren !== void 0 ? {
        type: "set_text",
        id: op.elementId,
        children: op.newChildren
      } : {
        type: "set_text",
        id: op.elementId,
        text: op.newText
      }]);
    case "replace":
      {
        const withoutOld = applyOps(store, [{
          type: "remove",
          id: op.oldElement.id
        }]);
        return applyOps(withoutOld, createStoreInsertOps(withoutOld, op.newElement, op.parentId, op.index));
      }
  }
}
/**
* Apply multiple editor operations to a flat Store.
*/
function applyOperationsToStore(store, ops) {
  return ops.reduce((next, op) => applyOperationToStore(next, op), store);
}
function toStoreParent(parentId) {
  return parentId ?? "ROOT";
}
function createStoreInsertOps(store, element, parentId, index) {
  let insertElement = store.byId.has(element.id) ? cloneElementWithNewIds(element, {
    x: 0,
    y: 0
  }) : element;
  let subtree;
  try {
    subtree = ensureV2([insertElement]);
  } catch (err) {
    if (!(err instanceof Error ? err.message : String(err)).includes("duplicate id")) throw err;
    insertElement = regenerateTreeIds(insertElement);
    subtree = ensureV2([insertElement]);
    syncElementTree(element, insertElement);
  }
  const ops = [];
  const pushSubtree = (id, targetParent, targetIndex) => {
    const flatElement = getById(subtree, id);
    if (!flatElement) throw new Error(`createStoreInsertOps: missing subtree element "${id}"`);
    ops.push({
      type: "insert",
      element: flatElement,
      parentId: targetParent,
      index: targetIndex
    });
    getChildren$2(subtree, id).forEach((childId, childIndex) => {
      pushSubtree(childId, id, childIndex);
    });
  };
  getRootIds(subtree).forEach((rootId, rootOffset) => {
    pushSubtree(rootId, toStoreParent(parentId), index + rootOffset);
  });
  return ops;
}
/** Overwrite `target` in place with a deep clone of `source` (same object ref). */
function syncElementTree(target, source) {
  const clone = structuredClone(source);
  const dst = target;
  for (const key of Object.keys(dst)) delete dst[key];
  Object.assign(dst, clone);
}
/**
* Create the inverse of an operation (for undo).
*/
function invertOperation(op) {
  switch (op.type) {
    case "set_variable_modes":
      return { ...op, oldModes: op.newModes, newModes: op.oldModes };
    case "set_theme":
      return { ...op, oldTheme: op.newTheme, newTheme: op.oldTheme };
    case "insert":
      return {
        type: "remove",
        elementId: op.element.id,
        element: op.element,
        parentId: op.parentId,
        index: op.index
      };
    case "remove":
      return {
        type: "insert",
        element: op.element,
        parentId: op.parentId,
        index: op.index
      };
    case "move":
      return {
        type: "move",
        elementId: op.elementId,
        fromParentId: op.toParentId,
        toParentId: op.fromParentId,
        fromIndex: op.toIndex,
        toIndex: op.fromIndex
      };
    case "set_position":
      return {
        type: "set_position",
        elementId: op.elementId,
        oldPosition: op.newPosition,
        newPosition: op.oldPosition || {
          x: 0,
          y: 0
        }
      };
    case "set_styles":
      return {
        type: "set_styles",
        elementId: op.elementId,
        oldStyles: op.newStyles,
        newStyles: op.oldStyles || {},
        oldTheme: op.newTheme,
        newTheme: op.oldTheme,
        oldScaleAnchorTransform: op.newScaleAnchorTransform,
        newScaleAnchorTransform: op.oldScaleAnchorTransform,
        oldScalePivot: op.newScalePivot,
        newScalePivot: op.oldScalePivot,
        oldCanvasPosition: op.newCanvasPosition,
        newCanvasPosition: op.oldCanvasPosition
      };
    case "set_props":
      return {
        type: "set_props",
        elementId: op.elementId,
        oldProps: op.newProps,
        newProps: op.oldProps || {}
      };
    case "set_name":
      return {
        type: "set_name",
        elementId: op.elementId,
        oldName: op.newName,
        newName: op.oldName
      };
    case "set_text":
      return {
        type: "set_text",
        elementId: op.elementId,
        oldText: op.newText,
        oldChildren: op.newChildren,
        newText: op.oldText,
        newChildren: op.oldChildren
      };
    case "replace":
      return {
        type: "replace",
        oldElement: op.newElement,
        newElement: op.oldElement,
        parentId: op.parentId,
        index: op.index
      };
    default:
      return op;
  }
}
/**
* Invert a batch of operations (reverse order and invert each).
*/
function invertOperations(ops) {
  return ops.map(invertOperation).reverse();
}
/**
* Create an insert operation for adding an element.
*/
function createInsertOperation(element, parentId, index) {
  return {
    type: "insert",
    element: structuredClone(element),
    parentId,
    index
  };
}
/**
* Create a remove operation by finding the element's current location in the
* Store. The captured `element` carries its full subtree (rebuilt via
* storeSubtreeToLegacyNested) so undo can re-insert children.
*/
function createRemoveOperation(store, elementId) {
  if (!getById(store, elementId)) return null;
  const parentKey = getParentId(store, elementId);
  const index = getIndex(store, elementId);
  return {
    type: "remove",
    elementId,
    element: structuredClone(storeSubtreeToLegacyNested(store, elementId)),
    parentId: parentKey === "ROOT" || parentKey === null ? null : parentKey,
    index
  };
}
/**
* Create a move operation.
*/
function createMoveOperation(store, elementId, toParentId, toIndex) {
  if (!getById(store, elementId)) return null;
  const fromParentKey = getParentId(store, elementId);
  const fromIndex = getIndex(store, elementId);
  if (fromIndex === -1) return null;
  return {
    type: "move",
    elementId,
    fromParentId: fromParentKey === "ROOT" || fromParentKey === null ? null : fromParentKey,
    toParentId,
    fromIndex,
    toIndex
  };
}
/**
* Create a set_position operation.
*/
function createSetPositionOperation(store, elementId, newPosition) {
  const element = getById(store, elementId);
  if (!element) return null;
  return {
    type: "set_position",
    elementId,
    oldPosition: element.canvasPosition ? {
      ...element.canvasPosition
    } : void 0,
    newPosition
  };
}
/**
* Create a set_styles operation.
*/
function createSetStylesOperation(store, elementId, newStyles, scaleAnchorTransform, scalePivot) {
  const element = getById(store, elementId);
  if (!element) return null;
  const nextScales = getTransformScales(newStyles.transform);
  const oldScales = getTransformScales(element.styles?.transform);
  const removesScale = scalePivot === void 0 && (element.scalePivot || element.scaleAnchorTransform || Math.abs(oldScales.x - 1) > 1e-6 || Math.abs(oldScales.y - 1) > 1e-6) && newStyles.transform !== element.styles?.transform && Math.abs(nextScales.x - 1) < 1e-6 && Math.abs(nextScales.y - 1) < 1e-6;
  let canvasPosition;
  if (removesScale) {
    const parent = getParentId(store, elementId);
    const isRoot = !parent || parent === "ROOT";
    newStyles = removeScalePivot(newStyles, elementId, {
      pivot: element.scalePivot,
      isRoot
    });
    if (isRoot) {
      const delta = scaleResetCanvasOffset(newStyles, elementId);
      if (Math.abs(delta.x) > 1e-6 || Math.abs(delta.y) > 1e-6) canvasPosition = {
        x: (element.canvasPosition?.x ?? 20) + delta.x,
        y: (element.canvasPosition?.y ?? 20) + delta.y
      };
    }
  }
  const nextPivot = removesScale ? null : scalePivot;
  const nextAnchor = scaleAnchorTransform !== void 0 ? scaleAnchorTransform : element.scaleAnchorTransform && !hasScaleAnchorTransform(newStyles.transform ?? "", element.scaleAnchorTransform) ? null : void 0;
  return {
    type: "set_styles",
    elementId,
    oldStyles: element.styles ? {
      ...element.styles
    } : void 0,
    ...(element.theme?.bindings?.some(binding => binding.target === "style" && newStyles[binding.property] !== element.styles?.[binding.property]) ? {
      oldTheme: element.theme,
      newTheme: { ...element.theme, bindings: element.theme.bindings.filter(binding => binding.target !== "style" || newStyles[binding.property] === element.styles?.[binding.property]) }
    } : {}),
    newStyles,
    ...(canvasPosition ? {
      oldCanvasPosition: element.canvasPosition ?? null,
      newCanvasPosition: canvasPosition
    } : {}),
    ...(nextPivot !== void 0 ? {
      oldScalePivot: element.scalePivot ?? null,
      newScalePivot: nextPivot
    } : {}),
    ...(nextAnchor !== void 0 ? {
      oldScaleAnchorTransform: element.scaleAnchorTransform ?? null,
      newScaleAnchorTransform: nextAnchor
    } : {})
  };
}
/**
* Create a set_props operation.
*/
function createSetPropsOperation(store, elementId, newProps) {
  const element = getById(store, elementId);
  if (!element) return null;
  if (element.type === "text") return null;
  const oldProps = element.type === "icon" ? element.props : element.props;
  return {
    type: "set_props",
    elementId,
    oldProps: oldProps ? {
      ...oldProps
    } : void 0,
    newProps
  };
}
/**
* Create a set_name operation (rename a layer). Pass an empty/undefined name to clear it.
*/
function createSetNameOperation(store, elementId, newName) {
  const element = getById(store, elementId);
  if (!element) return null;
  const normalized = newName && newName.trim() ? newName : void 0;
  if (normalized === element.name) return null;
  return {
    type: "set_name",
    elementId,
    oldName: element.name,
    newName: normalized
  };
}
/**
* Create a set_text operation. Pass either `text` (flat) or `children` (rich
* runs); one of them must be set.
*/
function createSetTextOperation(store, elementId, content) {
  const element = getById(store, elementId);
  if (!element || element.type !== "text") return null;
  return {
    type: "set_text",
    elementId,
    oldText: element.text,
    oldChildren: element.children,
    newText: content.children !== void 0 ? void 0 : content.text ?? "",
    newChildren: content.children
  };
}
/**
* Create a replace operation. The captured `oldElement` carries its full
* subtree so undo can restore children.
*/
function createReplaceOperation(store, oldElementId, newElement) {
  if (!getById(store, oldElementId)) return null;
  const parentKey = getParentId(store, oldElementId);
  const index = getIndex(store, oldElementId);
  return {
    type: "replace",
    oldElement: structuredClone(storeSubtreeToLegacyNested(store, oldElementId)),
    newElement: structuredClone(newElement),
    parentId: parentKey === "ROOT" || parentKey === null ? null : parentKey,
    index
  };
}

export { applyOperationsToStore, createInsertOperation, createMoveOperation, createRemoveOperation, createReplaceOperation, createSetNameOperation, createSetPositionOperation, createSetPropsOperation, createSetStylesOperation, createSetTextOperation, invertOperations };
