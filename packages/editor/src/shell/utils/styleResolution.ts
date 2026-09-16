/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/styleResolution.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { parseTailwindClass } from "../../shared/utils/tailwindScale";
import { getClassIndex } from "./classIndex";
import { getCascadeBatch } from "./computedStyles";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Style resolution engine.
* Determines where a CSS property's value comes from (inline, class, computed).
*/
var DESIGN_PROPERTIES = ["display", "flexDirection", "flexWrap", "alignItems", "justifyContent", "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginRight", "marginBottom", "marginLeft", "gap", "rowGap", "columnGap", "position", "top", "right", "bottom", "left", "zIndex", "backgroundColor", "borderWidth", "borderColor", "borderStyle", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle", "borderRadius", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius", "color", "fontSize", "fontWeight", "textAlign", "lineHeight", "opacity", "overflow", "overflowX", "overflowY", "visibility", "flex", "flexGrow", "flexShrink", "flexBasis", "boxShadow", "outlineWidth", "outlineColor", "outlineStyle", "outlineOffset", "filter", "backdropFilter", "WebkitBackdropFilter"];
var INLINE_SHORTHAND = {
  paddingTop: {
    shorthand: "padding",
    side: 0
  },
  paddingRight: {
    shorthand: "padding",
    side: 1
  },
  paddingBottom: {
    shorthand: "padding",
    side: 2
  },
  paddingLeft: {
    shorthand: "padding",
    side: 3
  },
  marginTop: {
    shorthand: "margin",
    side: 0
  },
  marginRight: {
    shorthand: "margin",
    side: 1
  },
  marginBottom: {
    shorthand: "margin",
    side: 2
  },
  marginLeft: {
    shorthand: "margin",
    side: 3
  },
  borderTopLeftRadius: {
    shorthand: "borderRadius",
    side: 0
  },
  borderTopRightRadius: {
    shorthand: "borderRadius",
    side: 1
  },
  borderBottomRightRadius: {
    shorthand: "borderRadius",
    side: 2
  },
  borderBottomLeftRadius: {
    shorthand: "borderRadius",
    side: 3
  }
};
/**
* Expand a 1-4 value box shorthand to its four corners/sides.
* Returns the value at `side` (0=top, 1=right, 2=bottom, 3=left), or null if
* the shorthand contains anything fancier (functions, calc, etc).
*/
function expandBoxShorthand(shorthand, side) {
  const trimmed = String(shorthand).trim();
  if (!trimmed) return null;
  if (/[(),/]/.test(trimmed)) return null;
  const parts = trimmed.split(/\s+/);
  switch (parts.length) {
    case 1:
      return parts[0];
    case 2:
      return parts[side % 2];
    case 3:
      return [parts[0], parts[1], parts[2], parts[1]][side];
    case 4:
      return parts[side];
    default:
      return null;
  }
}
function inlineShorthandValue(styles, prop) {
  if (prop === "rowGap" || prop === "columnGap") {
    const gap = styles.gap;
    if (gap === void 0 || gap === "") return null;
    const parts = String(gap).trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return prop === "rowGap" ? parts[0] : parts[1];
    return null;
  }
  const entry = INLINE_SHORTHAND[prop];
  if (!entry) return null;
  const v = styles[entry.shorthand];
  if (v === void 0 || v === "") return null;
  return expandBoxShorthand(String(v), entry.side);
}
var RELATED = {
  paddingTop: ["paddingBlock", "padding"],
  paddingBottom: ["paddingBlock", "padding"],
  paddingLeft: ["paddingInline", "padding"],
  paddingRight: ["paddingInline", "padding"],
  marginTop: ["marginBlock", "margin"],
  marginBottom: ["marginBlock", "margin"],
  marginLeft: ["marginInline", "margin"],
  marginRight: ["marginInline", "margin"],
  borderRadius: ["borderStartStartRadius", "borderStartEndRadius", "borderEndStartRadius", "borderEndEndRadius"],
  borderTopLeftRadius: ["borderStartStartRadius", "borderRadius"],
  borderTopRightRadius: ["borderStartEndRadius", "borderRadius"],
  borderBottomLeftRadius: ["borderEndStartRadius", "borderRadius"],
  borderBottomRightRadius: ["borderEndEndRadius", "borderRadius"],
  rowGap: ["gap"],
  columnGap: ["gap"]
};
/** Look up a property in the cascade map, checking related/shorthand keys too. */
function cascadeLookup(map, prop) {
  if (!map) return void 0;
  let entry = map.get(prop);
  if (!entry && RELATED[prop]) for (const related of RELATED[prop]) {
    entry = map.get(related);
    if (entry) break;
  }
  return entry;
}
function getActualDomElement(elementId) {
  const elements = document.querySelectorAll(`[data-element-id="${elementId}"]`);
  if (elements.length === 0) return null;
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.getAttribute("role") !== "button" && el.getAttribute("aria-roledescription") !== "draggable") return el;
  }
  return elements[elements.length - 1];
}
var EMPTY_CLASS_INDEX = [];
var EMPTY_PENDING = new Set();
function subscribeProjectCss(onStoreChange) {
  window.addEventListener("bingo-css-updated", onStoreChange);
  return () => window.removeEventListener("bingo-css-updated", onStoreChange);
}
function getProjectClassIndex() {
  return getClassIndex(document);
}
function getServerClassIndex() {
  return EMPTY_CLASS_INDEX;
}
function buildClassCascade(selectedElementId, className, index) {
  if (!selectedElementId) return {
    cascadeMap: null,
    cascadeByClass: null,
    pendingClasses: EMPTY_PENDING
  };
  const classes = className ? className.split(/\s+/).filter(Boolean) : [];
  if (classes.length === 0) return {
    cascadeMap: null,
    cascadeByClass: null,
    pendingClasses: EMPTY_PENDING
  };
  const {
    map,
    byClass
  } = getCascadeBatch(classes, index);
  const pending = new Set();
  for (const cls of classes) {
    if (byClass.has(cls)) continue;
    const parsed = parseTailwindClass(cls);
    if (!parsed) continue;
    pending.add(cls);
    const classProps = [];
    for (const [prop, value] of Object.entries(parsed)) {
      const alreadyOwned = map.has(prop);
      if (!alreadyOwned) map.set(prop, {
        className: cls,
        value
      });
      classProps.push({
        prop,
        value,
        overridden: alreadyOwned
      });
    }
    byClass.set(cls, classProps);
  }
  return {
    cascadeMap: map,
    cascadeByClass: byClass,
    pendingClasses: pending
  };
}
function usePropertyResolution(selectedElementId, elementStyles, isMultiSelect, className) {
  const $ = (0, import_compiler_runtime.c)(35);
  const classIndex = (0, import_react.useSyncExternalStore)(subscribeProjectCss, getProjectClassIndex, getServerClassIndex);
  let t0;
  if ($[0] !== classIndex || $[1] !== className || $[2] !== selectedElementId) {
    t0 = buildClassCascade(selectedElementId, className, classIndex);
    $[0] = classIndex;
    $[1] = className;
    $[2] = selectedElementId;
    $[3] = t0;
  } else t0 = $[3];
  const {
    cascadeMap,
    cascadeByClass,
    pendingClasses
  } = t0;
  let t1;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = {};
    $[4] = t1;
  } else t1 = $[4];
  const [computed, setComputed] = (0, import_react.useState)(t1);
  let t2;
  if ($[5] !== computed || $[6] !== selectedElementId) {
    t2 = selectedElementId ? computed : {};
    $[5] = computed;
    $[6] = selectedElementId;
    $[7] = t2;
  } else t2 = $[7];
  const computedStyles = t2;
  let t3;
  if ($[8] !== elementStyles) {
    t3 = JSON.stringify(elementStyles || {});
    $[8] = elementStyles;
    $[9] = t3;
  } else t3 = $[9];
  const stylesJson = t3;
  let t4;
  if ($[10] !== selectedElementId) {
    t4 = () => {
      if (!selectedElementId) return;
      const rafId = requestAnimationFrame(() => {
        const el = getActualDomElement(selectedElementId);
        if (!el) {
          const editable = document.querySelector("[data-canvas-content] .ProseMirror");
          const color = editable ? window.getComputedStyle(editable).color : "";
          if (color) setComputed(prev => ({
            ...prev,
            color
          }));
          return;
        }
        const cs = window.getComputedStyle(el);
        const comp = {};
        for (const prop of DESIGN_PROPERTIES) comp[prop] = cs[prop] ?? "";
        setComputed(comp);
      });
      return () => cancelAnimationFrame(rafId);
    };
    $[10] = selectedElementId;
    $[11] = t4;
  } else t4 = $[11];
  let t5;
  if ($[12] !== classIndex || $[13] !== className || $[14] !== isMultiSelect || $[15] !== selectedElementId || $[16] !== stylesJson) {
    t5 = [selectedElementId, stylesJson, isMultiSelect, className, classIndex];
    $[12] = classIndex;
    $[13] = className;
    $[14] = isMultiSelect;
    $[15] = selectedElementId;
    $[16] = stylesJson;
    $[17] = t5;
  } else t5 = $[17];
  (0, import_react.useEffect)(t4, t5);
  let t6;
  if ($[18] !== elementStyles) {
    t6 = elementStyles || {};
    $[18] = elementStyles;
    $[19] = t6;
  } else t6 = $[19];
  const styles = t6;
  let t7;
  if ($[20] !== cascadeMap || $[21] !== computedStyles || $[22] !== styles) {
    t7 = prop_0 => {
      const inlineValue = styles[prop_0];
      const hasInline = inlineValue !== void 0 && inlineValue !== "";
      const cascadeSource = cascadeLookup(cascadeMap, prop_0);
      if (hasInline) return {
        value: String(inlineValue),
        source: "inline",
        isOverride: !!cascadeSource,
        sourceClass: cascadeSource?.className
      };
      const fromShorthand = inlineShorthandValue(styles, prop_0);
      if (fromShorthand) return {
        value: fromShorthand,
        source: "inline",
        isOverride: !!cascadeSource,
        sourceClass: cascadeSource?.className
      };
      if (cascadeSource) return {
        value: cascadeSource.value,
        source: "class",
        sourceClass: cascadeSource.className
      };
      const computedValue = computedStyles[prop_0];
      if (computedValue) return {
        value: computedValue,
        source: "computed"
      };
      return {
        value: "",
        source: "unset"
      };
    };
    $[20] = cascadeMap;
    $[21] = computedStyles;
    $[22] = styles;
    $[23] = t7;
  } else t7 = $[23];
  const resolve = t7;
  let t8;
  if ($[24] !== cascadeMap || $[25] !== computedStyles || $[26] !== styles) {
    t8 = prop_1 => {
      const inlineValue_0 = styles[prop_1];
      if (inlineValue_0 !== void 0 && inlineValue_0 !== "") return String(inlineValue_0);
      const fromShorthand_0 = inlineShorthandValue(styles, prop_1);
      if (fromShorthand_0) return fromShorthand_0;
      if (computedStyles[prop_1]) return computedStyles[prop_1];
      const cascadeSource_0 = cascadeLookup(cascadeMap, prop_1);
      if (cascadeSource_0) return cascadeSource_0.value;
      return "";
    };
    $[24] = cascadeMap;
    $[25] = computedStyles;
    $[26] = styles;
    $[27] = t8;
  } else t8 = $[27];
  const get = t8;
  let t9;
  if ($[28] !== cascadeByClass || $[29] !== cascadeMap || $[30] !== computedStyles || $[31] !== get || $[32] !== pendingClasses || $[33] !== resolve) {
    t9 = {
      resolve,
      get,
      computed: computedStyles,
      cascadeMap,
      cascadeByClass,
      pendingClasses
    };
    $[28] = cascadeByClass;
    $[29] = cascadeMap;
    $[30] = computedStyles;
    $[31] = get;
    $[32] = pendingClasses;
    $[33] = resolve;
    $[34] = t9;
  } else t9 = $[34];
  return t9;
}

export { usePropertyResolution };
