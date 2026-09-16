/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/followAiCamera.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { getById, getParentId } from "@bingo/compiler";

/** True when no ancestor of `elementId` is also locked. */
function isOutermostLock(store, elementId, lockedIds) {
  let parent = getParentId(store, elementId);
  while (parent && parent !== "ROOT") {
    if (lockedIds.has(parent)) return false;
    parent = getParentId(store, parent);
  }
  return true;
}
function componentNameFromFilePath(path) {
  const base = path.split(/[/\\]/).pop();
  if (!base) return null;
  const name = base.replace(/\.(tsx|jsx|ts|js)$/i, "");
  if (!name || name === "index") return null;
  return name;
}
/** Names that a write to `path` may refresh on the canvas. */
function componentNamesForWritePath(path, index) {
  const names = new Set();
  const fromFile = componentNameFromFilePath(path);
  if (fromFile) names.add(fromFile);
  if (!index) return [...names];
  const normalized = path.replace(/\\/g, "/");
  for (const [name, meta] of Object.entries(index)) {
    const metaPath = (meta.path ?? "").replace(/\\/g, "/");
    if (!metaPath) continue;
    if (normalized === metaPath || normalized.endsWith(`/${metaPath}`) || metaPath.endsWith(`/${normalized}`) || normalized.endsWith(metaPath)) names.add(name);
  }
  return [...names];
}
/** Live component names on a canvas, sorted. Changes when inserts add a new binding. */
function liveCanvasComponentNames(store) {
  const names = [];
  for (const [id, el] of store.byId) {
    if (id === "ROOT") continue;
    if (el.type === "component") names.push(el.componentName);
    if (el.type === "capture" && el.original?.componentName) names.push(el.original.componentName);
  }
  names.sort();
  return names;
}
/** Canvas instances of the given component names. */
function instanceIdsForComponentNames(store, names) {
  const wanted = names instanceof Set ? names : new Set(names);
  if (wanted.size === 0) return [];
  const ids = [];
  for (const [id, element] of store.byId) {
    if (id === "ROOT") continue;
    if (element.type === "component" && wanted.has(element.componentName)) ids.push(id);
  }
  return ids;
}
/** Outermost claimed nodes owned by one chat — the follow target. */
function outermostOwnedLockIds(store, owners, chatTabId) {
  const lockedIds = new Set();
  for (const [elementId, owner] of owners) if (owner === chatTabId && getById(store, elementId)) lockedIds.add(elementId);
  const ids = [];
  for (const id of lockedIds) if (isOutermostLock(store, id, lockedIds)) ids.push(id);
  return ids;
}
var DRAW_PREVIEW_PREFIX = "el-draw-";
/** Outermost streaming preview nodes (`el-draw-*`) currently on the canvas. */
function streamingPreviewIds(store) {
  const previewIds = new Set();
  for (const id of store.byId.keys()) if (id !== "ROOT" && id.startsWith(DRAW_PREVIEW_PREFIX)) previewIds.add(id);
  const ids = [];
  for (const id of previewIds) if (isOutermostLock(store, id, previewIds)) ids.push(id);
  return ids;
}
/**
* What the camera should follow right now. Live draw previews win so follow
* goes to where the AI started drawing, not a union of older claims.
*/
function followTargetIds(store, owners, chatTabId) {
  const previews = streamingPreviewIds(store);
  if (previews.length > 0) return previews;
  return outermostOwnedLockIds(store, owners, chatTabId);
}
var MEASURED_MIN$1 = 8;
/**
* Prefer a laid-out box; if the node is still a 0×0 shell, use canvasPosition
* so follow can pan to a new root before children stream in.
*/
function followRectForTarget(input) {
  const {
    measured
  } = input;
  if (measured && measured.width >= MEASURED_MIN$1 && measured.height >= MEASURED_MIN$1) return measured;
  if (typeof input.canvasX === "number" && typeof input.canvasY === "number") {
    const width = typeof input.styleWidth === "number" && input.styleWidth > 0 ? input.styleWidth : measured && measured.width > 0 ? measured.width : 1200;
    const height = typeof input.styleHeight === "number" && input.styleHeight > 0 ? input.styleHeight : measured && measured.height > 0 ? measured.height : 800;
    return {
      x: input.canvasX,
      y: input.canvasY,
      width,
      height
    };
  }
  return measured;
}
function unionFollowRects(rects) {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}
/** Center and fit the current work using the canvas's 10–500% zoom limits. */
function cameraToFitFollowRect(rect, viewport, camera, padding = 60) {
  if (![rect.x, rect.y, rect.width, rect.height, viewport.width, viewport.height].every(Number.isFinite)) return null;
  if (viewport.width < 8 || viewport.height < 8 || rect.width < 0 || rect.height < 0 || rect.width === 0 && rect.height === 0) return null;
  const insetX = Math.min(typeof padding === "number" ? padding : padding.x, viewport.width / 4);
  const insetY = Math.min(typeof padding === "number" ? padding : padding.y, viewport.height / 4);
  const scale = Math.max(.1, Math.min(5, (viewport.width - insetX * 2) / Math.max(1, rect.width), (viewport.height - insetY * 2) / Math.max(1, rect.height)));
  const next = {
    scale,
    positionX: viewport.width / 2 - (rect.x + rect.width / 2) * scale,
    positionY: viewport.height / 2 - (rect.y + rect.height / 2) * scale
  };
  if (Math.abs(next.scale - camera.scale) < .001 && Math.abs(next.positionX - camera.positionX) < 2 && Math.abs(next.positionY - camera.positionY) < 2) return null;
  return next;
}

export { cameraToFitFollowRect, componentNamesForWritePath, followRectForTarget, followTargetIds, instanceIdsForComponentNames, isOutermostLock, liveCanvasComponentNames, unionFollowRects };
