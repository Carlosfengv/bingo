/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/figma/translator/instance.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { figGuidKey } from "../utils/node";
import { nodeId } from "openfig-core";

function collectSubtree(sceneIndex, rootId) {
  const result = new Map();
  function walk(id) {
    const node = sceneIndex.nodeById.get(id);
    if (!node) return;
    result.set(id, structuredClone(node));
    for (const child of sceneIndex.childrenByParent.get(id) ?? []) {
      const childId = nodeId(child);
      if (childId) walk(childId);
    }
  }
  walk(rootId);
  return result;
}
function guidPathKey(guids) {
  return guids.map(g => figGuidKey(g)).filter(Boolean).join("/");
}
function orderedVectorIds(subtree, symbolRootId) {
  return [...subtree.entries()].filter(([id, n]) => id !== symbolRootId && n.type === "VECTOR").sort((a, b) => {
    const pa = a[1].parentIndex?.position ?? "";
    const pb = b[1].parentIndex?.position ?? "";
    return pa < pb ? -1 : pa > pb ? 1 : 0;
  }).map(([id]) => id);
}
var PATH_SCALE = new WeakMap();
/** Scale mark for geometry-only vectors (no vectorNetworkBlob). */
function getInstancePathScale(node) {
  return PATH_SCALE.get(node);
}
/**
* Keep vector geometry aligned when a non-uniform resize bakes new `size`s.
* - Network-backed: drop baked geometry so `normalizedSize`→`size` scales paths.
* - Geometry-only: remember a path scale applied at decode time.
*/
function scaleVectorGeometry(node, scaleX, scaleY) {
  if (Math.abs(scaleX - 1) < 1e-6 && Math.abs(scaleY - 1) < 1e-6) return;
  const hasNetwork = node.vectorData?.vectorNetworkBlob !== void 0;
  const hasGeometry = (node.fillGeometry?.length ?? 0) > 0 || (node.strokeGeometry?.length ?? 0) > 0;
  if (hasNetwork && hasGeometry) {
    delete node.fillGeometry;
    delete node.strokeGeometry;
    return;
  }
  if (hasGeometry) {
    const prev = PATH_SCALE.get(node);
    PATH_SCALE.set(node, {
      x: (prev?.x ?? 1) * scaleX,
      y: (prev?.y ?? 1) * scaleY
    });
  }
}
/**
* Bake a non-uniform resize into size/translation only. Uniform visual scale is
* handled with CSS `transform: scale()` so typography, strokes, radii, etc. all
* follow for free.
*/
function scaleInstanceSubtreeLayout(subtree, symbolRootId, scaleX, scaleY) {
  if (Math.abs(scaleX - 1) < 1e-6 && Math.abs(scaleY - 1) < 1e-6) return;
  for (const [id, node] of subtree) {
    if (id === symbolRootId) continue;
    const size = node.size;
    if (size?.x !== void 0) size.x *= scaleX;
    if (size?.y !== void 0) size.y *= scaleY;
    const transform = node.transform;
    if (transform) {
      if (transform.m02 !== void 0) transform.m02 *= scaleX;
      if (transform.m12 !== void 0) transform.m12 *= scaleY;
    }
    scaleVectorGeometry(node, scaleX, scaleY);
  }
}
function overrideKeysMatch(a, b) {
  return a != null && b != null && a.sessionID === b.sessionID && a.localID === b.localID;
}
function findNodeByOverrideKey(nodes, key) {
  for (const node of nodes) if (overrideKeysMatch(node.overrideKey, key)) return node;
}
function symbolRootForNode(sceneIndex, nodeId$1) {
  let current = sceneIndex.nodeById.get(nodeId$1);
  while (current) {
    if (current.type === "SYMBOL" || current.type === "COMPONENT") return nodeId(current);
    const parentId = figGuidKey(current.parentIndex?.guid);
    if (!parentId) break;
    current = sceneIndex.nodeById.get(parentId);
  }
  return null;
}
function childPathIndices(sceneIndex, rootId, targetId) {
  const indices = [];
  let currentId = targetId;
  while (currentId && currentId !== rootId) {
    const current = sceneIndex.nodeById.get(currentId);
    if (!current) return null;
    const parentId = figGuidKey(current.parentIndex?.guid);
    if (!parentId) return null;
    const idx = (sceneIndex.childrenByParent.get(parentId) ?? []).findIndex(n => nodeId(n) === currentId);
    if (idx < 0) return null;
    indices.unshift(idx);
    currentId = parentId;
  }
  if (currentId !== rootId) return null;
  return indices;
}
function nodeAtChildPath(nodeById, childrenByParent, rootId, indices) {
  let parentId = rootId;
  for (const idx of indices) {
    const child = (childrenByParent.get(parentId) ?? [])[idx];
    if (!child) return void 0;
    const childId = nodeId(child);
    if (!childId) return void 0;
    parentId = childId;
  }
  return nodeById.get(parentId);
}
function resolveNestedOverrideTarget(ctx, targetSubtree, targetSymbolRootId, guids) {
  if (guids.length === 0) return void 0;
  const lastKey = guids[guids.length - 1];
  const refNode = findNodeByOverrideKey(ctx.sceneIndex.nodeById.values(), lastKey);
  if (!refNode) return findNodeByOverrideKey(targetSubtree.values(), lastKey);
  const refId = nodeId(refNode);
  if (!refId) return void 0;
  const refSymbolRootId = symbolRootForNode(ctx.sceneIndex, refId);
  if (!refSymbolRootId) return void 0;
  const path = childPathIndices(ctx.sceneIndex, refSymbolRootId, refId);
  if (!path) return void 0;
  return nodeAtChildPath(targetSubtree, ctx.sceneIndex.childrenByParent, targetSymbolRootId, path);
}
function expandParentFrameForText(subtree, target) {
  const parentId = figGuidKey(target.parentIndex?.guid);
  if (!parentId) return;
  const parent = subtree.get(parentId);
  if (!parent || parent.type === "TEXT") return;
  const gap = parent.stackSpacing ?? 0;
  const textChildren = [...subtree.values()].filter(node => figGuidKey(node.parentIndex?.guid) === parentId && node.type === "TEXT" && node.visible !== false);
  const parentSize = parent.size;
  if (parentSize) {
    let needed = 0;
    if (parent.stackMode === "VERTICAL") {
      for (const node of textChildren) needed += node.size?.y ?? 0;
      if (textChildren.length > 1) needed += (textChildren.length - 1) * gap;
    } else for (const node of textChildren) {
      const t = node.transform;
      const s = node.size;
      needed = Math.max(needed, (t?.m12 ?? 0) + (s?.y ?? 0));
    }
    if (needed > (parentSize.y ?? 0)) parentSize.y = needed;
  }
  if (target.textAutoResize === "WIDTH_AND_HEIGHT" && parent.stackMode === "HORIZONTAL" && parentSize && "x" in parentSize) delete parentSize.x;
}
function applyTextOverride(subtree, target, rest) {
  const prevFontSize = target.fontSize;
  const derived = target.derivedTextData;
  const prevBaselines = derived?.baselines ? structuredClone(derived.baselines) : void 0;
  Object.assign(target, rest);
  if (!("derivedTextData" in rest) && derived) {
    if (rest.textData) {
      const nextFontSize = rest.fontSize ?? prevFontSize;
      const chars = rest.textData?.characters ?? "";
      const scale = prevFontSize && nextFontSize && prevFontSize > 0 ? nextFontSize / prevFontSize : 1;
      const templateLineHeight = prevBaselines?.[0]?.lineHeight;
      const templateAscent = prevBaselines?.[0]?.lineAscent;
      delete derived.baselines;
      if (templateLineHeight !== void 0 && !chars.includes("\n") && Math.abs(scale - 1) > 1e-6) {
        const lineBox = templateLineHeight * scale;
        const ascent = templateAscent !== void 0 ? templateAscent * scale : void 0;
        derived.baselines = [{
          lineHeight: lineBox,
          ...(ascent !== void 0 ? {
            lineAscent: ascent
          } : {}),
          position: {
            x: 0,
            y: ascent ?? lineBox
          },
          lineY: 0,
          firstCharacter: 0,
          endCharacter: chars.length
        }];
        const size = target.size;
        if (size) size.y = lineBox;
      }
    }
    if (rest.fontName) delete derived.fontMetaData;
  }
  if (rest.textData && target.visible !== false) expandParentFrameForText(subtree, target);
}
function stripOverridePatch(patch) {
  const {
    guidPath: _gp,
    overriddenSymbolID: _sym,
    ...rest
  } = patch;
  return rest;
}
/**
* Component-set variant switch on a nested INSTANCE (`overriddenSymbolID`).
* Point the instance at the target variant and adopt that variant's size /
* effects so closed→open accordion swaps drop plus/minus chrome and shadows.
*/
function applyOverriddenSymbolID(target, overriddenSymbolID, ctx) {
  if (target.type !== "INSTANCE") return;
  const newSymbolId = figGuidKey(overriddenSymbolID);
  if (!newSymbolId) return;
  const newSymbol = ctx.sceneIndex.nodeById.get(newSymbolId);
  if (!newSymbol) return;
  target.symbolData = {
    ...(target.symbolData ?? {}),
    symbolID: overriddenSymbolID
  };
  if (newSymbol.size) target.size = structuredClone(newSymbol.size);
  const nextEffects = newSymbol.effects;
  if (Array.isArray(nextEffects)) target.effects = structuredClone(nextEffects);else delete target.effects;
  for (const key of ["stackMode", "stackSpacing", "stackPrimarySizing", "stackCounterSizing", "stackPrimaryAlignItems", "stackCounterAlignItems", "stackHorizontalPadding", "stackVerticalPadding", "stackPaddingRight", "stackPaddingBottom", "frameMaskDisabled", "clipsContent"]) {
    const value = newSymbol[key];
    if (value !== void 0) target[key] = structuredClone(value);else delete target[key];
  }
}
function findOverrideTarget(subtree, key) {
  return findNodeByOverrideKey(subtree.values(), key) ?? (figGuidKey(key) ? subtree.get(figGuidKey(key)) : void 0);
}
function applyCascadedOverrides(subtree, instance, pasteInstance, symbolRootId, ctx) {
  const instanceKey = instance.overrideKey;
  if (!instanceKey) return;
  const symbolData = pasteInstance.symbolData;
  const patches = [...(symbolData?.symbolOverrides ?? []), ...(symbolData?.derivedSymbolData ?? [])];
  for (const patch of patches) {
    const guids = patch.guidPath?.guids;
    if (!guids?.length || !overrideKeysMatch(guids[0], instanceKey)) continue;
    const rest = stripOverridePatch(patch);
    if (Object.keys(rest).length === 0) continue;
    let target;
    if (guids.length === 1) {
      const symbolRoot = subtree.get(symbolRootId);
      if (rest.size && symbolRoot) {
        Object.assign(symbolRoot, rest);
        continue;
      }
      target = findNodeByOverrideKey(subtree.values(), instanceKey);
    } else target = resolveNestedOverrideTarget(ctx, subtree, symbolRootId, guids.slice(1));
    if (target) applyTextOverride(subtree, target, rest);
  }
}
function applyInstanceOverrides(subtree, instance, symbolRootId, ctx) {
  const symbolData = instance.symbolData;
  const patches = [...(symbolData?.symbolOverrides ?? []), ...(symbolData?.derivedSymbolData ?? [])];
  const symbolRoot = subtree.get(symbolRootId);
  const originalRootSize = symbolRoot?.size;
  const original = {
    x: originalRootSize?.x ?? 0,
    y: originalRootSize?.y ?? 0
  };
  const vectorIds = orderedVectorIds(subtree, symbolRootId);
  const sizePatches = [];
  const fillPatches = [];
  for (const patch of patches) {
    const guids = patch.guidPath?.guids;
    if (!guids || guids.length === 0) continue;
    const overriddenSymbolID = patch.overriddenSymbolID;
    if (overriddenSymbolID && guids.length === 1) {
      const target = findOverrideTarget(subtree, guids[0]);
      if (target) applyOverriddenSymbolID(target, overriddenSymbolID, ctx);
    }
    const rest = stripOverridePatch(patch);
    let target;
    if (guids.length === 1) {
      const key = guids[0];
      target = findOverrideTarget(subtree, key);
    } else if (findNodeByOverrideKey(subtree.values(), guids[0])?.type !== "INSTANCE") target = resolveNestedOverrideTarget(ctx, subtree, symbolRootId, guids.slice(1));
    if (!target) {
      const targetId = guidPathKey(guids).split("/").pop();
      target = targetId ? subtree.get(targetId) : void 0;
    }
    if (target && Object.keys(rest).length > 0) {
      applyTextOverride(subtree, target, rest);
      continue;
    }
    if (rest.fillPaints) fillPatches.push(rest);else if (rest.size) sizePatches.push(rest);
  }
  for (const patch of sizePatches) {
    if (!symbolRoot) continue;
    const {
      size: _size,
      ...rest
    } = patch;
    if (Object.keys(rest).length > 0) Object.assign(symbolRoot, rest);
  }
  for (let i = 0; i < fillPatches.length; i++) {
    const vectorId = vectorIds[i] ?? vectorIds[vectorIds.length - 1];
    const vector = vectorId ? subtree.get(vectorId) : void 0;
    if (vector) Object.assign(vector, fillPatches[i]);
  }
  if (!symbolRoot || !original.x || !original.y) return {
    cssScale: 1,
    designSize: original
  };
  const instanceSize = instance.size;
  const uniform = symbolData?.uniformScaleFactor;
  const sx = instanceSize?.x && original.x ? instanceSize.x / original.x : 1;
  const sy = instanceSize?.y && original.y ? instanceSize.y / original.y : 1;
  const aspectUniform = Math.abs(sx - sy) < .001;
  if (typeof uniform === "number" && Number.isFinite(uniform) && Math.abs(uniform - 1) > 1e-6) return {
    cssScale: uniform,
    designSize: original
  };
  if (aspectUniform && Math.abs(sx - 1) > 1e-6) return {
    cssScale: sx,
    designSize: original
  };
  if (Math.abs(sx - 1) > 1e-6 || Math.abs(sy - 1) > 1e-6) {
    scaleInstanceSubtreeLayout(subtree, symbolRootId, sx, sy);
    if (instanceSize?.x !== void 0 && instanceSize?.y !== void 0) {
      symbolRoot.size = {
        x: instanceSize.x,
        y: instanceSize.y
      };
      return {
        cssScale: 1,
        designSize: {
          x: instanceSize.x,
          y: instanceSize.y
        }
      };
    }
  }
  return {
    cssScale: 1,
    designSize: original
  };
}
function resolveInstanceSubtree(instance, ctx) {
  const symbolData = instance.symbolData;
  const symbolId = figGuidKey(symbolData?.symbolID);
  if (!symbolId) return null;
  if (!ctx.sceneIndex.nodeById.get(symbolId)) return null;
  const nodes = collectSubtree(ctx.sceneIndex, symbolId);
  const scalePlan = applyInstanceOverrides(nodes, instance, symbolId, ctx);
  if (ctx.pasteInstance && ctx.pasteInstance !== instance) applyCascadedOverrides(nodes, instance, ctx.pasteInstance, symbolId, ctx);
  return {
    nodes,
    symbolRootId: symbolId,
    rootChildIds: getInstanceChildIds(nodes, symbolId),
    ...scalePlan
  };
}
function getInstanceChildIds(subtree, symbolRootId) {
  if (!subtree.get(symbolRootId)) return [];
  const children = [];
  for (const [id, node] of subtree) {
    if (id === symbolRootId) continue;
    if (figGuidKey(node.parentIndex?.guid) === symbolRootId) children.push(id);
  }
  children.sort((a, b) => {
    const pa = subtree.get(a)?.parentIndex?.position ?? "";
    const pb = subtree.get(b)?.parentIndex?.position ?? "";
    return pa < pb ? -1 : pa > pb ? 1 : 0;
  });
  return children;
}

export { getInstanceChildIds, getInstancePathScale, resolveInstanceSubtree };
