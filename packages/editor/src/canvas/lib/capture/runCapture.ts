/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/lib/capture/runCapture.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { detectProjectRoot, resolveSourceInfoBatch } from "./fiber";
import { preloadSheets } from "./stylesheets";
import { createIdGen, walkChildren, walkNode } from "./walk";
import { hasDebugStack as Se$1 } from "bippy/source";

async function runCapture(options = {}) {
  const maxDepth = options.maxDepth ?? 30;
  const withFiber = options.withFiber ?? false;
  const withComputedStyles = options.withComputedStyles ?? true;
  const withStyleHeuristics = options.withStyleHeuristics ?? withComputedStyles;
  const withStylesheetPreload = options.withStylesheetPreload ?? false;
  const includeRoot = options.includeRoot ?? false;
  let root = options.rootElement ?? null;
  if (!root && options.selector) root = document.querySelector(options.selector);
  if (!root) root = document.body;
  if (!root) return {
    error: "no_body"
  };
  let knownComponents = null;
  if (options.knownComponents !== void 0) knownComponents = options.knownComponents instanceof Set ? options.knownComponents : new Set(options.knownComponents);
  const sheetCache = withStylesheetPreload ? await preloadSheets() : null;
  const ctx = {
    maxDepth,
    withFiber,
    knownComponents,
    withComputedStyles,
    withStyleHeuristics,
    sheetCache,
    skipSelector: options.skipSelector,
    nextId: createIdGen(),
    emittedComponentFibers: new WeakSet()
  };
  const rootCS = window.getComputedStyle(root);
  const rootFlex = rootCS.display === "flex" || rootCS.display === "inline-flex" ? rootCS.flexDirection : void 0;
  let elements;
  if (includeRoot && root !== document.body) {
    const captured = walkNode(root, 0, null, void 0, ctx);
    if (!captured) return {
      error: "no_elements"
    };
    elements = [captured];
  } else elements = walkChildren(root, 0, rootCS, rootFlex, ctx);
  if (elements.length === 0) return {
    error: "no_elements"
  };
  let projectRoot = null;
  if (withFiber) {
    const sampleFiber = pickSampleFiber(elements);
    const [_, detected] = await Promise.all([resolveSourceInfoBatch(elements), detectProjectRoot(sampleFiber)]);
    projectRoot = detected;
  }
  if (options.canvasPosition) {
    const {
      x,
      y: startY
    } = options.canvasPosition;
    let y = startY;
    const rootChildren = Array.from(root.children);
    for (let i = 0; i < elements.length; i++) {
      const e = elements[i];
      if (!e) continue;
      e.canvasPosition = {
        x,
        y
      };
      const rect = rootChildren[i]?.getBoundingClientRect?.();
      y += (rect?.height ?? 200) + 40;
    }
  }
  let componentCount = 0;
  let elementCount = 0;
  const count = els => {
    for (const el of els) {
      elementCount++;
      if (el.type === "component") componentCount++;
      if (el.children) count(el.children);
    }
  };
  count(elements);
  return {
    elements,
    componentCount,
    elementCount,
    projectRoot
  };
}
/**
* Walk captured elements and return a fiber whose `_debugStack` is set.
* detectProjectRoot needs the stack to extract a Next chunk-URL frame; if
* we hand it a fiber without one, detection bails immediately. The first
* fiber we encounter (root captured element's host) often lacks _debugStack
* because it's rendered by Next/React internals — but fibers deeper in the
* tree typically have it. Falls back to any fiber if none has _debugStack.
*/
function pickSampleFiber(elements) {
  let firstAny = null;
  const visit = nodes => {
    for (const el of nodes) {
      const fiber = el._fiber;
      if (fiber) {
        if (!firstAny) firstAny = fiber;
        if (Se$1(fiber)) return fiber;
        if (fiber.alternate && Se$1(fiber.alternate)) return fiber.alternate;
      }
      const kids = el.children;
      if (kids) {
        const found = visit(kids);
        if (found) return found;
      }
    }
    return null;
  };
  return visit(elements) || firstAny;
}

export { runCapture };
