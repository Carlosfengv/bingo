/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/paste.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { emptyMutableStore } from "../../store/ensureV2";
import { storeSubtreeToLegacyNested } from "../../store/legacy";
import { ROOT } from "../../store/types";
import { parseFigmaClipboardHtml } from "./parser/clipboard";
import { convertFigmaNode } from "./translator/toStore";
import { uniqueFigmaImageHashes } from "./types";
import { figGuidKey } from "./utils/node";
import { nodeId } from "openfig-core";

function buildSceneIndex(parsed) {
  const nodeById = parsed.doc.nodeMap;
  const childrenByParent = new Map();
  for (const [parentId, children] of parsed.doc.childrenMap) childrenByParent.set(parentId, [...children]);
  for (const [, siblings] of childrenByParent) siblings.sort((a, b) => {
    const pa = a.parentIndex?.position ?? "";
    const pb = b.parentIndex?.position ?? "";
    return pa < pb ? -1 : pa > pb ? 1 : 0;
  });
  const regions = parsed.message.clipboardSelectionRegions;
  const fromRegions = [];
  if (Array.isArray(regions)) for (const region of regions) for (const node of region.nodes ?? []) {
    const id = figGuidKey(node);
    if (id && nodeById.has(id)) fromRegions.push(id);
  }
  let pasteRootIds = [];
  if (fromRegions.length > 0) pasteRootIds = fromRegions;else {
    const pageKey = figGuidKey(parsed.message.pastePageId);
    if (pageKey) {
      const ids = (childrenByParent.get(pageKey) ?? []).map(n => nodeId(n)).filter(id => id !== null && nodeById.has(id));
      if (ids.length > 0) pasteRootIds = ids;
    }
  }
  return {
    nodeById,
    childrenByParent,
    pasteRootIds
  };
}
function figmaNodeChangesToStore(parsed, options) {
  const sceneIndex = buildSceneIndex(parsed);
  const warnings = [];
  const skipped = [];
  const pendingImagePatches = [];
  const store = emptyMutableStore();
  const ctx = {
    parsed,
    sceneIndex,
    warnings,
    skipped,
    pendingImagePatches,
    options: {
      skipHidden: options?.skipHidden ?? true,
      ...(options?.resolveImageUrl ? {
        resolveImageUrl: options.resolveImageUrl
      } : {}),
      ...(options?.skipImageHashes ? {
        skipImageHashes: options.skipImageHashes
      } : {}),
      ...(options?.deferImages ? {
        deferImages: options.deferImages
      } : {})
    }
  };
  const roots = [];
  const rootOrigins = new Map();
  const recordRoot = (origin, elementId) => {
    if (!elementId) return;
    roots.push(elementId);
    rootOrigins.set(elementId, origin);
  };
  const originOf = node => {
    const transform = node?.transform;
    return {
      x: transform?.m02 ?? 0,
      y: transform?.m12 ?? 0
    };
  };
  for (const figmaRootId of sceneIndex.pasteRootIds) {
    const node = sceneIndex.nodeById.get(figmaRootId);
    if (!node) continue;
    recordRoot(originOf(node), convertFigmaNode(store, ROOT, node, figmaRootId, ctx, {
      asCanvasRoot: true
    }));
  }
  if (roots.length === 0 && sceneIndex.pasteRootIds.length === 0) {
    for (const [figmaId, node] of sceneIndex.nodeById) if (node.type === "FRAME" && node.parentIndex?.guid?.sessionID === 0) recordRoot(originOf(node), convertFigmaNode(store, ROOT, node, figmaId, ctx, {
      asCanvasRoot: true
    }));
  }
  return {
    store,
    roots,
    rootOrigins,
    warnings,
    skipped,
    pendingImagePatches
  };
}
function importedToPasteElements(imported) {
  let elements = imported.roots.map(id => storeSubtreeToLegacyNested(imported.store, id));
  if (elements.length > 1) {
    const origins = elements.map(el => imported.rootOrigins.get(el.id) ?? {
      x: 0,
      y: 0
    });
    const minX = Math.min(...origins.map(o => o.x));
    const minY = Math.min(...origins.map(o => o.y));
    elements = elements.map((el, i) => ({
      ...el,
      canvasPosition: {
        x: origins[i].x - minX,
        y: origins[i].y - minY
      }
    }));
  }
  return elements;
}
function convertFigmaClipboardHtmlSync(html) {
  const parsed = parseFigmaClipboardHtml(html);
  if (!parsed) return null;
  const imported = figmaNodeChangesToStore(parsed, {
    deferImages: true
  });
  if (imported.roots.length === 0) return null;
  const pendingImagePatches = imported.pendingImagePatches;
  return {
    elements: importedToPasteElements(imported),
    parsed,
    pendingImagePatches,
    imageHashes: uniqueFigmaImageHashes(pendingImagePatches)
  };
}

export { convertFigmaClipboardHtmlSync };
