/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/utils/captureComponentInstance.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { regenerateTreeIds } from "../../shared/utils/elementCloning";
import { generatePrefixedId } from "../../shared/utils/idUtils";
import { runCapture } from "../lib/capture/runCapture";
import { WEBGL_CANVAS_ATTR, getById, getParentId, getRootIds, storeSubtreeToLegacyNested } from "@bingo/compiler";

/**
* Freeze a live canvas component instance into editable Store layers IN PLACE.
*
* No CapturedPage shell, no chrome, no Changes sidebar — the component is
* replaced by a `type:'capture'` node whose children are the current DOM tree
* so editing feels inline.
*
* Edit sessions persist on the capture element (`original` + `sourceInfo`)
* so Cancel survives canvas reloads / tab refreshes.
*/
/** In-memory mirror of persisted sessions (Cancel restore + mode bar). */
var sessions = new Map();
function getComponentEditSession(containerId) {
  return sessions.get(containerId);
}
function stashComponentEditSession(session) {
  sessions.set(session.containerId, session);
}
function clearComponentEditSession(containerId) {
  sessions.delete(containerId);
}
function isComponentEditRoot(el) {
  return !!el && el.type === "capture";
}
/**
* True when the instance draws through WebGL rather than the DOM.
*
* Capture freezes an instance by walking its DOM and fiber tree, which assumes
* the visuals live in elements. A react-three-fiber component's whole subtree is
* `<div><canvas/></div>` — its meshes, lights and materials are three.js objects
* with no DOM — so capturing it tears down the live renderer and produces layers
* that cannot rebuild the scene. Refuse edit mode for these instead (LUN-133).
* The attribute is stamped by the runtime when a WebGL context is created.
*/
function rendersThroughWebgl(elementId) {
  if (typeof document === "undefined") return false;
  return !!document.querySelector(`[data-element-id="${CSS.escape(elementId)}"]`)?.querySelector(`canvas[${WEBGL_CANVAS_ATTR}]`);
}
/** True when this element is an edit root or nested inside one. */
function isInsideComponentEdit(store, elementId) {
  return !!findEditRootId$1(store, elementId);
}
function findEditRootId$1(store, elementId) {
  let id = elementId;
  while (id && id !== "ROOT") {
    if (isComponentEditRoot(getById(store, id))) return id;
    id = getParentId(store, id);
  }
  return null;
}
/** Build a session handle from a capture edit-root element. */
function editSessionFromElement(el) {
  if (!isComponentEditRoot(el)) return null;
  const capture = el;
  const original = capture.original;
  if (!original || original.type !== "component" || !original.componentName) return null;
  return {
    containerId: el.id,
    original,
    sourceInfo: capture.sourceInfo
  };
}
/**
* Scan a store for capture edit roots (post-reload hydration).
*/
function findEditSessionsInStore(store) {
  const out = [];
  const visit = id => {
    const el = getById(store, id);
    if (!el) return;
    const session = editSessionFromElement(el);
    if (session) out.push(session);
    const kids = store.childrenByParent.get(id) ?? [];
    for (const kid of kids) visit(kid);
  };
  for (const id of getRootIds(store)) visit(id);
  return out;
}
/**
* Count Fragment-style roots under a host: element children plus non-whitespace
* text nodes. Whitespace-only text (JSX newlines) is ignored so a single visual
* host isn't treated as multi-root.
*/
function countCaptureContentRoots(childNodes) {
  let count = 0;
  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i];
    if (child.nodeType === 1) count++;else if (child.nodeType === 3 && (child.textContent || "").trim()) count++;
  }
  return count;
}
/**
* Resolve where to run capture for a canvas component instance.
* Bingo wrappers use display:contents. Single-host instances resolve to
* the first real box; Fragment multi-root instances keep the contents node and
* capture with includeRoot:false so every sibling root is walked (including
* non-whitespace text siblings, not just element children).
*/
function resolveInstanceCaptureTarget(elementId) {
  const wrapper = document.querySelector(`[data-element-id="${CSS.escape(elementId)}"]`);
  if (!wrapper) return null;
  let el = wrapper;
  let style = window.getComputedStyle(el);
  if (style.display !== "contents") return {
    root: wrapper,
    includeRoot: true
  };
  while (style.display === "contents") {
    const contentRoots = countCaptureContentRoots(el.childNodes);
    if (contentRoots > 1) return {
      root: el,
      includeRoot: false
    };
    if (!el.firstElementChild) {
      if (contentRoots > 0) return {
        root: el,
        includeRoot: false
      };
      break;
    }
    el = el.firstElementChild;
    style = window.getComputedStyle(el);
  }
  return {
    root: el,
    includeRoot: true
  };
}
/**
* Capture the live DOM and return a Store tree to replace the instance with.
* Visually matches what was on screen — no outer edit chrome.
*/
async function captureComponentInstance(opts) {
  const original = storeSubtreeToLegacyNested(opts.store, opts.elementId);
  if (original.type !== "component") return {
    error: "Not a component instance"
  };
  const target = resolveInstanceCaptureTarget(opts.elementId);
  if (!target) return {
    error: "Could not find component DOM on canvas"
  };
  const {
    root,
    includeRoot
  } = target;
  const registry = opts.knownComponents instanceof Set ? opts.knownComponents : new Set(opts.knownComponents);
  const result = await runCapture({
    rootElement: root,
    includeRoot,
    withFiber: true,
    withComputedStyles: false,
    withStyleHeuristics: false,
    knownComponents: new Set([...registry].filter(name => name !== opts.componentName))
  });
  if ("error" in result && result.error) return {
    error: String(result.error)
  };
  if (!("elements" in result) || !result.elements?.length) return {
    error: "Capture produced no elements"
  };
  const frozenElements = stripSourceInfoFromTree(stripEditedComponentUpgrade(result.elements, opts.componentName).map(el => stripRootUpgradeStamps(el, opts.componentName)));
  const capture = {
    elements: frozenElements,
    componentCount: result.componentCount,
    elementCount: result.elementCount,
    projectRoot: result.projectRoot ?? null
  };
  return {
    replacement: regenerateTreeIds(buildInlineReplacement(frozenElements, opts.filePath, structuredClone(original), original.canvasPosition)),
    capture
  };
}
/**
* Always wrap in a capture node so Layers/selection treat the edit session as
* one drillable root — the contents host is editor chrome, not authored UI.
*/
function buildInlineReplacement(frozenElements, filePath, original, canvasPosition) {
  return {
    id: generatePrefixedId("capture"),
    type: "capture",
    sourceInfo: {
      componentName: original.componentName,
      filePath,
      lineNumber: 0
    },
    original,
    children: frozenElements,
    ...(canvasPosition ? {
      canvasPosition
    } : {})
  };
}
/** Component-edit trees do not use AST save — drop fiber sourceInfo noise. */
function stripSourceInfoFromTree(elements) {
  const visit = el => {
    const anyEl = el;
    const {
      sourceInfo: _drop,
      ...rest
    } = anyEl;
    const children = Array.isArray(anyEl.children) ? anyEl.children.map(visit) : void 0;
    return children ? {
      ...rest,
      children
    } : rest;
  };
  return elements.map(visit);
}
/** Remove stamps that would re-upgrade the capture root into the edited component. */
function stripRootUpgradeStamps(el, editedName) {
  if (el.type !== "html") return el;
  const html = el;
  const props = html.props ? {
    ...html.props
  } : void 0;
  if (!props) return el;
  let changed = false;
  if (props["data-component"] === editedName) {
    delete props["data-component"];
    changed = true;
  }
  if (props["data-bingo-component"] === editedName) {
    delete props["data-bingo-component"];
    changed = true;
  }
  if (props["data-slot"] === editedName.toLowerCase()) {
    delete props["data-slot"];
    changed = true;
  }
  return changed ? {
    ...html,
    props
  } : el;
}
/**
* Keep nested registry components (Button, etc.) upgradable, but never
* re-hydrate the component being edited as a live instance.
*/
function stripEditedComponentUpgrade(elements, editedName) {
  const visit = el => {
    const anyEl = el;
    const children = Array.isArray(anyEl.children) ? anyEl.children.map(visit) : void 0;
    if (anyEl.type === "component" && anyEl.componentName === editedName) return {
      id: anyEl.id,
      type: "html",
      tag: "div",
      props: {
        ...(anyEl.props || {})
      },
      styles: anyEl.styles,
      children
    };
    if (anyEl.capturedComponent?.name === editedName) {
      const {
        capturedComponent: _cc,
        name: _dropName,
        ...rest
      } = anyEl;
      const props = rest.props ? {
        ...rest.props
      } : {};
      if (props["data-component"] === editedName) delete props["data-component"];
      return children ? {
        ...rest,
        props,
        children
      } : {
        ...rest,
        props
      };
    }
    return children ? {
      ...anyEl,
      children
    } : anyEl;
  };
  return elements.map(visit);
}

export { captureComponentInstance, clearComponentEditSession, editSessionFromElement, findEditRootId$1, findEditSessionsInStore, getComponentEditSession, isComponentEditRoot, isInsideComponentEdit, rendersThroughWebgl, stashComponentEditSession };
