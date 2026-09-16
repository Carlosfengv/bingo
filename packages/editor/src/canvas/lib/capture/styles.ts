/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/lib/capture/styles.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { OUT_OF_FLOW_STYLE_KEYS } from "../../utils/absolutePositioning";
import { BLOCK_TAGS, CSS_DEFAULTS$1, INHERITED_PROPS, REPLACED, SKIP_DEFAULT_VALUES, SKIP_PROPS } from "./constants";
import { getUtilityAuthoredValue, hasAuthoredProp } from "./stylesheets";

/**
* Computed-style extraction for captured elements.
*
* Mirrors chrome-extension/content.js getStyles() with:
* - `CSS_DEFAULTS` drop (skip values matching browser default)
* - `INHERITED_PROPS` drop (skip values matching parent's computed value)
* - border / padding / margin shorthand collapse
* - border color/style when width is 0
* - outline color/style when width is 0
*
* Keeps `collapseBorder`, `collapsePadding`, `collapseMargin` exposed so
* callers (or tests) can reuse them.
*/
var kebabToCamel$2 = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
/**
* Extract a curated subset of computed styles as a camelCase style object.
* Returns undefined if no non-default values survive.
*/
function getStyles(el, opts = {}) {
  const cs = opts.cs ?? window.getComputedStyle(el);
  const s = {};
  let n = 0;
  for (let i = 0; i < cs.length; i++) {
    const kp = cs[i];
    if (kp.startsWith("--") || kp.startsWith("-")) continue;
    const cp = kebabToCamel$2(kp);
    if (SKIP_PROPS.has(cp)) continue;
    const v = cs.getPropertyValue(kp);
    if (!v) continue;
    const d = CSS_DEFAULTS$1[cp];
    if (d !== void 0 && v === d) continue;
    if (d === void 0 && SKIP_DEFAULT_VALUES.has(v)) continue;
    if ((cp === "borderTopStyle" || cp === "borderRightStyle" || cp === "borderBottomStyle" || cp === "borderLeftStyle") && cs.getPropertyValue(kp.replace("style", "width")) === "0px") continue;
    if ((cp === "borderTopColor" || cp === "borderRightColor" || cp === "borderBottomColor" || cp === "borderLeftColor") && cs.getPropertyValue(kp.replace("color", "width")) === "0px") continue;
    if ((cp === "outlineStyle" || cp === "outlineColor") && cs.outlineWidth === "0px") continue;
    if (opts.parentCS && INHERITED_PROPS.has(cp) && opts.parentCS.getPropertyValue(kp) === v) continue;
    s[cp] = v;
    n++;
  }
  if (n === 0) return void 0;
  collapseBorder(s);
  collapsePadding(s);
  collapseMargin(s);
  return Object.keys(s).length > 0 ? s : void 0;
}
function collapseBorder(s) {
  const sides = ["Top", "Right", "Bottom", "Left"];
  const ws = sides.map(d => s[`border${d}Width`]);
  const ss = sides.map(d => s[`border${d}Style`]);
  const cs = sides.map(d => s[`border${d}Color`]);
  if (ws.every(Boolean) && ws.every(v => v === ws[0]) && ss.every(Boolean) && ss.every(v => v === ss[0]) && cs.every(Boolean) && cs.every(v => v === cs[0])) {
    for (const d of sides) {
      delete s[`border${d}Width`];
      delete s[`border${d}Style`];
      delete s[`border${d}Color`];
    }
    s.border = `${ws[0]} ${ss[0]} ${cs[0]}`;
  }
  const radiusKeys = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"];
  const rs = radiusKeys.map(k => s[k]);
  if (rs.every(Boolean) && rs.every(v => v === rs[0])) {
    for (const k of radiusKeys) delete s[k];
    s.borderRadius = rs[0];
  }
}
function collapsePadding(s) {
  const t = s.paddingTop,
    r = s.paddingRight,
    b = s.paddingBottom,
    l = s.paddingLeft;
  if (t && r && b && l) {
    delete s.paddingTop;
    delete s.paddingRight;
    delete s.paddingBottom;
    delete s.paddingLeft;
    if (t === r && r === b && b === l) s.padding = t;else if (t === b && r === l) s.padding = `${t} ${r}`;else s.padding = `${t} ${r} ${b} ${l}`;
  }
}
function collapseMargin(s) {
  const t = s.marginTop,
    r = s.marginRight,
    b = s.marginBottom,
    l = s.marginLeft;
  if (t && r && b && l) {
    delete s.marginTop;
    delete s.marginRight;
    delete s.marginBottom;
    delete s.marginLeft;
    if (t === r && r === b && b === l) s.margin = t;else if (t === b && r === l) s.margin = `${t} ${r}`;else s.margin = `${t} ${r} ${b} ${l}`;
  }
}
/**
* Apply chrome-extension-style fidelity heuristics that clean up common
* getComputedStyle artifacts.
*
* Mutates `styles` in place.
*
*  - `display:block` on default block tags (drop; it's the default)
*  - `display:inline` on span/a (drop; it's the default)
*  - `position:relative` with all zero offsets AND no absolute children (drop)
*  - `boxSizing: content-box` (drop; default)
*  - In flex-row: add `whiteSpace:nowrap` to text-only children
*  - In flex-row: replace huge unauthored px margins with `auto`
*    (needs stylesheet cache)
*/
function applyStyleHeuristics(styles, tagLower, ctx) {
  if (!styles) return;
  if (styles.display === "block" && BLOCK_TAGS.has(tagLower)) delete styles.display;
  if (styles.display === "inline" && (tagLower === "span" || tagLower === "a")) delete styles.display;
  if (styles.position === "relative") {
    const t = styles.top,
      r = styles.right,
      b = styles.bottom,
      l = styles.left;
    const isZero = v => !v || v === "0px" || v === "auto";
    if (isZero(t) && isZero(r) && isZero(b) && isZero(l)) {
      let hasAbsChild = false;
      const root = ctx.element.shadowRoot ?? ctx.element;
      for (const c of Array.from(root.children)) if (window.getComputedStyle(c).position === "absolute") {
        hasAbsChild = true;
        break;
      }
      if (!hasAbsChild) {
        delete styles.position;
        delete styles.top;
        delete styles.right;
        delete styles.bottom;
        delete styles.left;
      }
    }
  }
  if (styles.boxSizing === "content-box") delete styles.boxSizing;
  if (ctx.parentFlexDir === "row" || ctx.parentFlexDir === "row-reverse") {
    if (ctx.childNodes.length > 0 && Array.from(ctx.childNodes).every(c => c.nodeType === Node.TEXT_NODE) && !styles.whiteSpace) styles.whiteSpace = "nowrap";
  }
  if ((ctx.parentFlexDir === "row" || ctx.parentFlexDir === "row-reverse") && ctx.sheetCache) {
    if (styles.marginLeft && typeof styles.marginLeft === "string" && styles.marginLeft.endsWith("px") && parseFloat(styles.marginLeft) > 50 && !hasAuthoredProp(ctx.element, "margin-left", ctx.sheetCache) && !hasAuthoredProp(ctx.element, "margin", ctx.sheetCache)) styles.marginLeft = "auto";
    if (styles.marginRight && typeof styles.marginRight === "string" && styles.marginRight.endsWith("px") && parseFloat(styles.marginRight) > 50 && !hasAuthoredProp(ctx.element, "margin-right", ctx.sheetCache) && !hasAuthoredProp(ctx.element, "margin", ctx.sheetCache)) styles.marginRight = "auto";
  }
}
/**
* Strip width/height that are actually `auto` / `fit-content` keywords —
* `getComputedStyle` always resolves these to pixels, which is incorrect for
* re-rendering on a different viewport.
*
* Uses `computedStyleMap()` (CSS Typed OM) when available, falls back to
* always-drop-height heuristic otherwise.
*/
function stripKeywordSizes(el, tagUpper, styles, parentFlexDir, sheetCache) {
  if (!styles || REPLACED.has(tagUpper)) return;
  const authoredW = sheetCache ? hasAuthoredProp(el, "width", sheetCache) : null;
  const authoredH = sheetCache ? hasAuthoredProp(el, "height", sheetCache) : null;
  const typedOM = el.computedStyleMap;
  if (typeof typedOM === "function") try {
    const map = typedOM.call(el);
    const w = map.get("width");
    const h = map.get("height");
    if (typeof globalThis.CSSKeywordValue !== "undefined") {
      const K = globalThis.CSSKeywordValue;
      if (h instanceof K) {
        if (h.value === "auto") delete styles.height;else styles.height = h.value;
      } else if (authoredH === false) delete styles.height;
      if (w instanceof K) {
        if (w.value === "auto") delete styles.width;else styles.width = w.value;
      }
    }
    return;
  } catch {}
  if (authoredH !== true) delete styles.height;
  if (authoredW !== true && (parentFlexDir === "column" || parentFlexDir === "column-reverse")) delete styles.width;
}
/**
* Drop baked layout values when a CSS class already governs them, so responsive
* utilities (`flex-col md:flex-row`, `hidden md:flex`, `md:grid-cols-2`) stay in
* charge instead of being frozen by the desktop-resolved computed value.
*
* Only safe when the authoring rule will ALSO exist in the canvas (Tailwind
* utilities + globals.css are regenerated there). `hasAuthoredProp` returns
* null when there's no sheet cache (e.g. webview/iframe with no preload) — we
* treat that as "can't tell, keep baking" so non-localhost captures are
* unaffected. Pairs (camelCase style key, CSS property name):
*/
var AUTHORED_SWITCH_PROPS = [["display", "display"], ["flexDirection", "flex-direction"], ["flexWrap", "flex-wrap"], ["gridTemplateColumns", "grid-template-columns"], ["gridTemplateRows", "grid-template-rows"]];
var AUTHORED_DIM_PROPS = [["width", "width"], ["minWidth", "min-width"], ["maxWidth", "max-width"], ["height", "height"], ["minHeight", "min-height"], ["maxHeight", "max-height"], ["flexBasis", "flex-basis"]];
var RELATIVE_VALUE = /(?:vw|vh|vmin|vmax|dvh|dvw|svh|svw|lvh|lvw|%)\b|^(?:auto|fit-content|min-content|max-content|stretch)$/;
function stripAuthoredLayout(el, styles, inlineStyles, sheetCache) {
  if (!styles || !sheetCache) return;
  const pinned = key => inlineStyles && inlineStyles[key] !== void 0;
  for (const [key, prop] of AUTHORED_SWITCH_PROPS) if (styles[key] !== void 0 && !pinned(key) && getUtilityAuthoredValue(el, prop, sheetCache) !== null) delete styles[key];
  for (const [key, prop] of AUTHORED_DIM_PROPS) {
    if (styles[key] === void 0 || pinned(key)) continue;
    const authored = getUtilityAuthoredValue(el, prop, sheetCache);
    if (authored && RELATIVE_VALUE.test(authored)) delete styles[key];
  }
}
/** Parse inline `style="..."` into camelCase properties with numeric px collapse. */
function extractInlineStyles(el) {
  const styleAttr = el.getAttribute("style");
  if (!styleAttr) return void 0;
  const styles = {};
  for (const part of styleAttr.split(";")) {
    const i = part.indexOf(":");
    if (i === -1) continue;
    const prop = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (!prop || !value) continue;
    const camel = kebabToCamel$2(prop);
    const num = parseFloat(value);
    if (!isNaN(num) && value === String(num) + "px") styles[camel] = num;else styles[camel] = value;
  }
  return Object.keys(styles).length > 0 ? styles : void 0;
}
/**
* Strip positioning that's meaningless once the element is placed on the 2D
* canvas:
*   - `position: fixed` at ANY depth — it pins to the viewport, which doesn't
*     exist on a canvas.
*   - `position: absolute` only at the capture ROOT — the root is positioned
*     by canvasPosition, so a root absolute would fight that. Nested absolutes
*     are kept: they position relative to a captured ancestor and are valid.
*
* Also drops the now-inert physical offsets so they don't linger as noise.
*/
function stripCanvasInvalidPosition(styles, isRoot) {
  const pos = styles.position;
  if (pos === "fixed" || isRoot && pos === "absolute") for (const key of OUT_OF_FLOW_STYLE_KEYS) delete styles[key];
}
/**
* @license bippy
*
* Copyright (c) Aiden Bai
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var t$2 = `bippy-0.5.39`;
var n$1 = Object.defineProperty;
var r$2 = Object.prototype.hasOwnProperty;
var i$3 = () => {};
var a$2 = e => {
  try {
    Function.prototype.toString.call(e).indexOf(`^_^`) > -1 && setTimeout(() => {
      throw Error(`React is running in production mode, but dead code elimination has not been applied. Read how to correctly configure React for production: https://reactjs.org/link/perf-use-production-build`);
    });
  } catch {}
};
var o$2 = (e = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) => !!(e && `getFiberRoots` in e);
var s$2 = !1;
var c$3;
var l$2 = (e = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) => s$2 ? !0 : (e && typeof e.inject == `function` && (c$3 = e.inject.toString()), !!c$3?.includes(`(injected)`));
var u$2 = new Set();
var d$2 = new Set();
var f$2 = e => {
  let r = new Map(),
    o = 0,
    s = {
      _instrumentationIsActive: !1,
      _instrumentationSource: t$2,
      checkDCE: a$2,
      hasUnsupportedRendererAttached: !1,
      inject(e) {
        let t = ++o;
        return r.set(t, e), d$2.add(e), s._instrumentationIsActive || (s._instrumentationIsActive = !0, u$2.forEach(e => e())), t;
      },
      on: i$3,
      onCommitFiberRoot: i$3,
      onCommitFiberUnmount: i$3,
      onPostCommitFiberRoot: i$3,
      renderers: r,
      supportsFiber: !0,
      supportsFlight: !0
    };
  try {
    n$1(globalThis, `__REACT_DEVTOOLS_GLOBAL_HOOK__`, {
      configurable: !0,
      enumerable: !0,
      get() {
        return s;
      },
      set(t) {
        if (t && typeof t == `object`) {
          let n = s.renderers;
          s = t, n.size > 0 && (n.forEach((e, n) => {
            d$2.add(e), t.renderers.set(n, e);
          }), p$2(e));
        }
      }
    });
    let t = window.hasOwnProperty,
      r = !1;
    n$1(window, `hasOwnProperty`, {
      configurable: !0,
      value: function (...e) {
        try {
          if (!r && e[0] === `__REACT_DEVTOOLS_GLOBAL_HOOK__`) return globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = void 0, r = !0, -0;
        } catch {}
        return t.apply(this, e);
      },
      writable: !0
    });
  } catch {
    p$2(e);
  }
  return s;
};
var p$2 = e => {
  e && u$2.add(e);
  try {
    let n = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!n) return;
    if (!n._instrumentationSource) {
      n.checkDCE = a$2, n.supportsFiber = !0, n.supportsFlight = !0, n.hasUnsupportedRendererAttached = !1, n._instrumentationSource = t$2, n._instrumentationIsActive = !1;
      let e = o$2(n);
      if (e || (n.on = i$3), n.renderers.size) {
        n._instrumentationIsActive = !0, u$2.forEach(e => e());
        return;
      }
      let r = n.inject,
        c = l$2(n);
      c && !e && (s$2 = !0, n.inject({
        scheduleRefresh() {}
      }) && (n._instrumentationIsActive = !0)), n.inject = e => {
        let t = r(e);
        return d$2.add(e), c && n.renderers.set(t, e), n._instrumentationIsActive = !0, u$2.forEach(e => e()), t;
      };
    }
    (n.renderers.size || n._instrumentationIsActive || l$2()) && e?.();
  } catch {}
};
var m$2 = () => r$2.call(globalThis, `__REACT_DEVTOOLS_GLOBAL_HOOK__`);
var h$3 = e => m$2() ? (p$2(e), globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__) : f$2(e);
var g$2 = () => !!(typeof window < `u` && (window.document?.createElement || window.navigator?.product === `ReactNative`));
var _$2 = () => {
  try {
    g$2() && h$3();
  } catch {}
};

export { applyStyleHeuristics, extractInlineStyles, getStyles, stripAuthoredLayout, stripCanvasInvalidPosition, stripKeywordSizes };
