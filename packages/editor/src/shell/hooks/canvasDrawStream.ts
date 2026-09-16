/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/hooks/canvasDrawStream.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { applyOperationsToStore, createInsertOperation, createRemoveOperation, createReplaceOperation } from "../../shared/utils/operations";
import { getById } from "@bingo/compiler";
import * as import_react_dom from "react-dom";

var STREAM_MIN_CHILDREN = 2;
var STREAM_MIN_NODES = 6;
function sanitizeDrawStreamId(streamId) {
  return streamId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "draw";
}
function countNestedNodes(element) {
  const children = element.children;
  if (!Array.isArray(children) || children.length === 0) return 1;
  return 1 + children.reduce((sum, child) => sum + countNestedNodes(child), 0);
}
function nextPaint() {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
function shouldStreamNested(element) {
  return (element.children?.length ?? 0) >= STREAM_MIN_CHILDREN && countNestedNodes(element) >= STREAM_MIN_NODES;
}
async function insertNestedWithPaint(store, nested, parentId, index, publish) {
  const children = (nested.children ?? []).filter(child => !!child && typeof child === "object" && "type" in child);
  if (!shouldStreamNested(nested)) {
    const next = applyOperationsToStore(store, [createInsertOperation(nested, parentId, index)]);
    (0, import_react_dom.flushSync)(() => publish(next));
    return next;
  }
  let next = applyOperationsToStore(store, [createInsertOperation({
    ...nested,
    children: void 0
  }, parentId, index)]);
  (0, import_react_dom.flushSync)(() => publish(next));
  await nextPaint();
  let childIndex = 0;
  for (const child of children) {
    next = await insertNestedWithPaint(next, child, nested.id, childIndex, publish);
    childIndex += 1;
  }
  return next;
}
function dropPreviewRoots(store, previews, tabId) {
  const removed = [];
  let next = store;
  for (const preview of previews) {
    if (preview.tabId !== tabId) continue;
    if (!getById(next, preview.rootId)) continue;
    const op = createRemoveOperation(next, preview.rootId);
    if (!op) continue;
    next = applyOperationsToStore(next, [op]);
    removed.push(preview);
  }
  return {
    store: next,
    removed
  };
}
function replacePreviewRoot(store, preview, nested) {
  const previous = getById(store, preview.rootId);
  if (!previous) return null;
  nested.id = preview.rootId;
  if (previous.canvasPosition && !nested.canvasPosition) nested.canvasPosition = previous.canvasPosition;
  const op = createReplaceOperation(store, preview.rootId, nested);
  if (!op) return null;
  return applyOperationsToStore(store, [op]);
}
function preserveResolvedStreamingIcons(previousStore, incoming, iconLibraries) {
  if (!incoming || incoming.type !== "icon" || !incoming.id) return incoming;
  const previous = getById(previousStore, incoming.id);
  if (!previous || previous.type !== "icon") return incoming;
  const incomingRegistry = iconLibraries?.[incoming.library]?.icons;
  if (incomingRegistry?.[incoming.iconName]) return incoming;
  const previousRegistry = iconLibraries?.[previous.library]?.icons;
  if (!previousRegistry?.[previous.iconName]) return incoming;
  incoming.library = previous.library;
  incoming.iconName = previous.iconName;
  return incoming;
}

export { dropPreviewRoots, insertNestedWithPaint, preserveResolvedStreamingIcons, replacePreviewRoot, sanitizeDrawStreamId };
