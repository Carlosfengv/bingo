/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/runtime/runtime.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as import_react from "react";
import * as import_react_dom from "react-dom";

/**
* Browser runtime setup for compiled project modules.
*
* React is shared via window.React + the host import map (not a registry).
*/
var VOID_ELEMENTS$2 = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
function createPatchedReact() {
  const origCE = import_react.createElement;
  const patchedCreateElement = function (type, props, ...children) {
    if (typeof type === "string" && VOID_ELEMENTS$2.has(type)) {
      const p = props ? {
        ...props
      } : props;
      if (p && p.children != null) delete p.children;
      return origCE.call(import_react, type, p);
    }
    return origCE.call(import_react, type, props, ...children);
  };
  return new Proxy(import_react, {
    get(target, prop) {
      if (prop === "createElement") return patchedCreateElement;
      return target[prop];
    }
  });
}
/**
* React's development build tracks element owners by calling `getOwner()` on the
* dispatcher the active renderer installs — a method only development builds of
* react-reconciler expose. Packages that render through their own reconciler
* (react-three-fiber, react-konva…) may use production reconciler builds, so
* the first render under a development host throws
* `dispatcher.getOwner is not a function` and the component never mounts.
* Supplying the missing dev-only method restores what production does: no owner.
*/
function ensureDispatcherOwner(seen) {
  const dispatcher = import_react.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?.A;
  if (!dispatcher || dispatcher === seen.current) return;
  seen.current = dispatcher;
  if (typeof dispatcher.getOwner !== "function") dispatcher.getOwner = () => null;
}
/**
* The jsx runtime handed to dynamically compiled packages through the host import map.
* Delegates to React's real runtime — re-implementing jsx() via createElement
* takes React 19's owner-tracking path and breaks the same reconcilers.
*/
function createInteropJsxRuntime(runtime) {
  const seen = {
    current: null
  };
  const wrap = fn => (...args) => {
    ensureDispatcherOwner(seen);
    return fn(...args);
  };
  const source = runtime;
  return {
    ...source,
    jsx: wrap(source.jsx),
    jsxs: wrap(source.jsxs),
    ...(source.jsxDEV ? {
      jsxDEV: wrap(source.jsxDEV)
    } : {})
  };
}
var WEBGL_CONTEXT_TYPES = new Set(["webgl", "webgl2", "experimental-webgl"]);
var webglCapturePatched = false;
/**
* Marks a canvas whose content is drawn with WebGL. Set at context-creation time
* because there is no non-destructive way to ask a canvas afterwards — probing
* with `getContext` either returns null or creates the context you asked about.
* Editor code reads it to tell a 3D component from a DOM one.
*/
var WEBGL_CANVAS_ATTR = "data-bingo-webgl";
/**
* Make WebGL content survive a screenshot.
*
* Every capture path rasterizes the DOM with html-to-image, which reads a canvas
* through `toDataURL()`. WebGL discards its drawing buffer once the frame is
* composited, so that read comes back fully transparent — previews and the AI's
* screenshots of a working 3D scene show nothing, which reads as broken code.
* `preserveDrawingBuffer` keeps the pixels around; the browser then copies the
* buffer each frame instead of swapping it, a cost paid by 3D content only.
*/
function patchWebglForCapture() {
  if (webglCapturePatched) return;
  webglCapturePatched = true;
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (contextType, attributes) {
    if (!WEBGL_CONTEXT_TYPES.has(contextType)) return original.apply(this, [contextType, attributes]);
    const context = original.apply(this, [contextType, {
      ...attributes,
      preserveDrawingBuffer: true
    }]);
    if (context) this.setAttribute(WEBGL_CANVAS_ATTR, "");
    return context;
  };
}
/** Initialize shared React globals for the import map. */
function initBingoRuntime() {
  const patchedReact = createPatchedReact();
  window.React = patchedReact;
  window.ReactDOM = import_react_dom;
  patchWebglForCapture();
}

export { WEBGL_CANVAS_ATTR, createInteropJsxRuntime, initBingoRuntime };
