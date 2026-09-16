/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shared/utils/flexShrink.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { applyOperationsToStore, createSetStylesOperation } from "./operations";
import { getById, getChildren$2, getDescendantIds, getParentId } from "@bingo/compiler";

function isFlexDisplay(styles) {
  const display = styles?.display;
  return display === "flex" || display === "inline-flex";
}
function isFlexParent(store, parentId) {
  return parentId != null && parentId !== "ROOT" && isFlexDisplay(getById(store, parentId)?.styles);
}
function normalizeFlexShrinkOps(storeAfter, ops) {
  const extra = [];
  let cur = storeAfter;
  const commit = op => {
    if (!op) return;
    extra.push(op);
    cur = applyOperationsToStore(cur, [op]);
  };
  const addShrink = id => {
    const el = getById(cur, id);
    if (!el || !isFlexParent(cur, getParentId(cur, id))) return;
    const styles = el.styles ?? {};
    if (styles.flex !== void 0 || styles.flexShrink !== void 0) return;
    commit(createSetStylesOperation(cur, id, {
      ...styles,
      flexShrink: 0
    }));
  };
  const removeShrink = id => {
    const styles = getById(cur, id)?.styles;
    if (!styles || styles.flexShrink !== 0 && styles.flexShrink !== "0") return;
    const rest = {
      ...styles
    };
    delete rest.flexShrink;
    commit(createSetStylesOperation(cur, id, rest));
  };
  for (const op of ops) switch (op.type) {
    case "insert":
      addShrink(op.element.id);
      for (const descendant of getDescendantIds(cur, op.element.id)) addShrink(descendant);
      break;
    case "move":
      addShrink(op.elementId);
      break;
    case "replace":
      addShrink(op.newElement.id);
      break;
    case "set_styles":
      {
        const wasFlex = isFlexDisplay(op.oldStyles);
        const nowFlex = isFlexDisplay(op.newStyles);
        if (nowFlex && !wasFlex) for (const child of getChildren$2(cur, op.elementId)) addShrink(child);else if (wasFlex && !nowFlex) for (const child of getChildren$2(cur, op.elementId)) removeShrink(child);
        break;
      }
  }
  return extra;
}

export { normalizeFlexShrinkOps };
