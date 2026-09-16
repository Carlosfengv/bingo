/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/canvas/components/TextEditor.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { generatePrefixedId } from "../../shared/utils/idUtils";
import { getTailwindCategory, smartMergeClasses } from "../../shared/utils/tailwindScale";
import { Extension } from "@tiptap/core";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import index_default from "@tiptap/starter-kit";
import { TextSelection } from "prosemirror-state";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

function styleAttr(cssProp, jsKey) {
  return {
    default: null,
    parseHTML: el => el.style.getPropertyValue(cssProp) || null,
    renderHTML: attrs => attrs[jsKey] ? {
      style: `${cssProp}: ${attrs[jsKey]}`
    } : {}
  };
}
var StyledText = TextStyle.extend({
  addAttributes() {
    return {
      color: styleAttr("color", "color"),
      fontWeight: styleAttr("font-weight", "fontWeight"),
      fontStyle: styleAttr("font-style", "fontStyle"),
      fontSize: styleAttr("font-size", "fontSize"),
      fontFamily: styleAttr("font-family", "fontFamily"),
      textDecoration: styleAttr("text-decoration", "textDecoration"),
      letterSpacing: styleAttr("letter-spacing", "letterSpacing"),
      backgroundImage: styleAttr("background-image", "backgroundImage"),
      backgroundClip: styleAttr("background-clip", "backgroundClip"),
      WebkitBackgroundClip: styleAttr("-webkit-background-clip", "WebkitBackgroundClip"),
      WebkitTextFillColor: styleAttr("-webkit-text-fill-color", "WebkitTextFillColor"),
      class: {
        default: null,
        parseHTML: el => el.getAttribute("class"),
        renderHTML: attrs => attrs.class ? {
          class: attrs.class
        } : {}
      }
    };
  }
});
var TIPTAP_TEXT_STYLE_KEYS = ["color", "fontWeight", "fontStyle", "fontSize", "fontFamily", "textDecoration", "letterSpacing", "backgroundImage", "backgroundClip", "WebkitBackgroundClip", "WebkitTextFillColor"];
function isBoldFontWeight$1(v) {
  if (v === "bold" || v === "700") return true;
  if (typeof v === "number") return v >= 600;
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n >= 600;
  }
  return false;
}
/** Build TipTap inline content for a single TextLeafNode run. Splits text on
*  `\n` so line breaks become real `hardBreak` nodes (matches what the editor
*  produces for soft Enter / Shift+Enter). */
function runToInlineContent(run) {
  const text = run.text ?? "";
  if (!text) return [];
  const rest = {
    ...(run.styles ?? {})
  };
  let useBold = false;
  let useItalic = false;
  let useUnderline = false;
  let useStrike = false;
  if (isBoldFontWeight$1(rest.fontWeight)) {
    useBold = true;
    delete rest.fontWeight;
  }
  if (rest.fontStyle === "italic") {
    useItalic = true;
    delete rest.fontStyle;
  }
  const td = String(rest.textDecoration ?? "").trim();
  if (td) {
    const parts = td.split(/\s+/).filter(Boolean);
    const remaining = [];
    for (const p of parts) if (p === "underline") useUnderline = true;else if (p === "line-through") useStrike = true;else remaining.push(p);
    if (remaining.length) rest.textDecoration = remaining.join(" ");else delete rest.textDecoration;
  }
  const styleAttrs = {};
  for (const key of TIPTAP_TEXT_STYLE_KEYS) if (rest[key] !== void 0 && rest[key] !== null && rest[key] !== "") styleAttrs[key] = rest[key];
  if (run.className) styleAttrs.class = run.className;
  const marks = [];
  if (Object.keys(styleAttrs).length > 0) marks.push({
    type: "textStyle",
    attrs: styleAttrs
  });
  if (useBold) marks.push({
    type: "bold"
  });
  if (useItalic) marks.push({
    type: "italic"
  });
  if (useUnderline) marks.push({
    type: "underline"
  });
  if (useStrike) marks.push({
    type: "strike"
  });
  const segments = text.split("\n");
  const out = [];
  for (let i = 0; i < segments.length; i++) {
    if (i > 0) out.push({
      type: "hardBreak"
    });
    if (segments[i] === "") continue;
    out.push({
      type: "text",
      text: segments[i],
      marks: marks.length ? marks : void 0
    });
  }
  return out;
}
function nodeToTipTapDoc(initialNode) {
  const runs = initialNode.children?.length ? initialNode.children : [{
    text: initialNode.text ?? "",
    styles: initialNode.styles,
    className: initialNode.className
  }];
  const content = [];
  for (const run of runs) for (const inline of runToInlineContent(run)) content.push(inline);
  return {
    type: "doc",
    content: [{
      type: "paragraph",
      content: content.length ? content : void 0
    }]
  };
}
/** Walk the TipTap document into a CommitContent (flat text or rich runs).
*  Marks become a TextLeafNode.styles + className per run. */
function serializeToContent(editor) {
  const runs = [];
  let plainText = "";
  let anyStyled = false;
  let firstParagraph = true;
  editor.state.doc.descendants(node => {
    if (node.type.name === "paragraph") {
      if (!firstParagraph) {
        plainText += "\n";
        runs.push({
          id: generatePrefixedId("text"),
          type: "text",
          tag: "span",
          text: "\n"
        });
      }
      firstParagraph = false;
      return true;
    }
    if (node.type.name === "hardBreak") {
      plainText += "\n";
      runs.push({
        id: generatePrefixedId("text"),
        type: "text",
        tag: "span",
        text: "\n"
      });
      return false;
    }
    if (node.type.name === "text") {
      const text = node.text ?? "";
      const {
        styles,
        className
      } = marksToStylesAndClass(node.marks);
      const hasStyles = Object.keys(styles).length > 0;
      const hasClass = !!className;
      if (hasStyles || hasClass) anyStyled = true;
      plainText += text;
      runs.push({
        id: generatePrefixedId("text"),
        type: "text",
        tag: "span",
        text,
        ...(hasStyles ? {
          styles
        } : {}),
        ...(hasClass ? {
          className
        } : {})
      });
      return false;
    }
    return true;
  });
  if (!anyStyled) return {
    text: plainText
  };
  return {
    children: runs
  };
}
function marksToStylesAndClass(marks) {
  const styles = {};
  let className;
  let underline = false;
  let strike = false;
  for (const mark of marks) {
    const name = mark.type.name;
    if (name === "bold") styles.fontWeight = 700;else if (name === "italic") styles.fontStyle = "italic";else if (name === "underline") underline = true;else if (name === "strike") strike = true;else if (name === "textStyle") for (const [k, v] of Object.entries(mark.attrs)) {
      if (v == null || v === "") continue;
      if (k === "class") className = String(v);else styles[k] = v;
    }
  }
  if (underline || strike) {
    const decorations = [];
    if (underline) decorations.push("underline");
    if (strike) decorations.push("line-through");
    const existing = String(styles.textDecoration ?? "").split(/\s+/).filter(Boolean);
    for (const d of decorations) if (!existing.includes(d)) existing.push(d);
    styles.textDecoration = existing.join(" ");
  }
  return {
    styles,
    className
  };
}
/** True when a non-empty selection spans the ENTIRE editable text — the
*  "select all" case (Cmd+A, drag-all, double-click auto-select-all). A
*  collapsed caret is never full.
*
*  Fast path: the editable normally holds a SINGLE paragraph (headings/lists are
*  disabled, Enter → hardBreak), whose text spans pos 1 to `content.size - 1`,
*  so full reduces to an O(1) bounds check — this runs on every selection tick
*  (continuous drag-select). Only when a paste produced more than one top-level
*  block (so text may not start at pos 1) do we fall back to the O(nodes) walk
*  over actual text-node positions. */
function isFullSelection(editor) {
  const {
    from,
    to,
    empty
  } = editor.state.selection;
  if (empty) return false;
  const doc = editor.state.doc;
  if (doc.childCount <= 1) return from <= 1 && to >= doc.content.size - 1;
  let min = Infinity;
  let max = -Infinity;
  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    min = Math.min(min, pos);
    max = Math.max(max, pos + node.nodeSize);
    return false;
  });
  return min !== Infinity && from <= min && to >= max;
}
function computeSelectionState(editor) {
  const {
    from,
    to,
    empty
  } = editor.state.selection;
  if (empty) {
    const {
      styles,
      className
    } = marksToStylesAndClass(editor.state.storedMarks ?? editor.state.selection.$from.marks());
    if (Object.keys(styles).length === 0 && !className) return null;
    return {
      styles,
      className,
      isMixed: {},
      isClassNameMixed: false,
      isFull: false
    };
  }
  const styleValuesByKey = {};
  const stylePresentInAll = {};
  const classSets = [];
  let formatBold = {
    has: false,
    all: true
  };
  let formatItalic = {
    has: false,
    all: true
  };
  let formatUnderline = {
    has: false,
    all: true
  };
  let formatStrike = {
    has: false,
    all: true
  };
  let textNodeCount = 0;
  editor.state.doc.nodesBetween(from, to, node => {
    if (!node.isText) return true;
    textNodeCount++;
    const seenKeys = new Set();
    let nodeBold = false;
    let nodeItalic = false;
    let nodeUnderline = false;
    let nodeStrike = false;
    let nodeClass;
    for (const mark of node.marks) {
      const name = mark.type.name;
      if (name === "bold") nodeBold = true;else if (name === "italic") nodeItalic = true;else if (name === "underline") nodeUnderline = true;else if (name === "strike") nodeStrike = true;else if (name === "textStyle") for (const [k, v] of Object.entries(mark.attrs)) {
        if (v == null || v === "") continue;
        if (k === "class") {
          nodeClass = String(v);
          continue;
        }
        if (!styleValuesByKey[k]) styleValuesByKey[k] = new Set();
        styleValuesByKey[k].add(String(v));
        seenKeys.add(k);
      }
    }
    classSets.push(new Set((nodeClass ?? "").split(/\s+/).filter(Boolean)));
    if (nodeBold) formatBold.has = true;else formatBold.all = false;
    if (nodeItalic) formatItalic.has = true;else formatItalic.all = false;
    if (nodeUnderline) formatUnderline.has = true;else formatUnderline.all = false;
    if (nodeStrike) formatStrike.has = true;else formatStrike.all = false;
    for (const key of Object.keys(styleValuesByKey)) if (!seenKeys.has(key)) stylePresentInAll[key] = false;else if (stylePresentInAll[key] === void 0) stylePresentInAll[key] = true;
    return false;
  });
  if (textNodeCount === 0) return null;
  const styles = {};
  const isMixed = {};
  if (formatBold.has && formatBold.all) styles.fontWeight = 700;else if (formatBold.has) isMixed.fontWeight = true;
  if (formatItalic.has && formatItalic.all) styles.fontStyle = "italic";else if (formatItalic.has) isMixed.fontStyle = true;
  if (formatUnderline.has || formatStrike.has) {
    const decorations = [];
    if (formatUnderline.has && formatUnderline.all) decorations.push("underline");
    if (formatStrike.has && formatStrike.all) decorations.push("line-through");
    if (decorations.length) styles.textDecoration = decorations.join(" ");
    if (formatUnderline.has && !formatUnderline.all || formatStrike.has && !formatStrike.all) isMixed.textDecoration = true;
  }
  for (const [k, vs] of Object.entries(styleValuesByKey)) if (vs.size === 1 && stylePresentInAll[k] !== false) styles[k] = [...vs][0];else isMixed[k] = true;
  let className;
  let isClassNameMixed = false;
  if (classSets.length > 0) {
    const intersection = [...classSets[0]].filter(c => classSets.every(s => s.has(c)));
    if (intersection.length) className = intersection.join(" ");
    const union = new Set();
    classSets.forEach(s => s.forEach(c => union.add(c)));
    if (union.size !== intersection.length) isClassNameMixed = true;
  }
  return {
    styles,
    className,
    isMixed,
    isClassNameMixed,
    isFull: isFullSelection(editor)
  };
}
function makeKeysExtension() {
  return Extension.create({
    name: "bingoEditorKeys",
    addKeyboardShortcuts() {
      const leave = () => {
        this.editor.view.dom.blur();
        return true;
      };
      return {
        Enter: () => this.editor.commands.setHardBreak(),
        "Mod-Enter": leave,
        Escape: leave
      };
    }
  });
}
function collapseBeforeDragSelect(view, event) {
  if (event.button !== 0 || event.shiftKey) return;
  if (event.detail > 1) return;
  const {
    from,
    to
  } = view.state.selection;
  if (from === to) return;
  const hit = view.posAtCoords({
    left: event.clientX,
    top: event.clientY
  });
  if (!hit || hit.pos < from || hit.pos > to) return;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, hit.pos)));
}
function isBlurIntoSafeZone(next, containerRef) {
  if (!next || !(next instanceof Node)) return false;
  if (containerRef.current && containerRef.current.contains(next)) return true;
  const el = next instanceof Element ? next : next.parentElement;
  if (!el) return false;
  if (el.closest("[data-text-edit-safe]")) return true;
  if (el.closest("[data-radix-popper-content-wrapper]")) return true;
  if (el.closest("[data-radix-portal]")) return true;
  return false;
}
var PLACEMENT_STYLE_KEYS = new Set(["margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "alignSelf", "justifySelf", "order", "position", "top", "right", "bottom", "left", "inset", "transform", "zIndex", "flex", "flexGrow", "flexShrink", "flexBasis", "gridArea", "gridColumn", "gridRow"]);
var CSS_UNITLESS_PROPS = new Set(["lineHeight", "fontWeight", "opacity", "zIndex", "order", "zoom", "flex", "flexGrow", "flexShrink", "fontSizeAdjust", "columnCount", "fillOpacity", "strokeOpacity", "aspectRatio", "tabSize"]);
function TextEditor(t0) {
  const $ = (0, import_compiler_runtime.c)(49);
  const {
    initialNode,
    minHeight,
    inheritedPaint,
    onCommit,
    onActivate,
    onDeactivate,
    onSelectionChange
  } = t0;
  const containerRef = (0, import_react.useRef)(null);
  let t1;
  if ($[0] !== initialNode) {
    t1 = () => nodeToTipTapDoc(initialNode);
    $[0] = initialNode;
    $[1] = t1;
  } else t1 = $[1];
  const [initialDoc] = (0, import_react.useState)(t1);
  const committedRef = (0, import_react.useRef)(false);
  const onCommitRef = (0, import_react.useRef)(onCommit);
  const onActivateRef = (0, import_react.useRef)(onActivate);
  const onDeactivateRef = (0, import_react.useRef)(onDeactivate);
  const onSelectionChangeRef = (0, import_react.useRef)(onSelectionChange);
  let t2;
  if ($[2] !== onActivate || $[3] !== onCommit || $[4] !== onDeactivate || $[5] !== onSelectionChange) {
    t2 = () => {
      onCommitRef.current = onCommit;
      onActivateRef.current = onActivate;
      onDeactivateRef.current = onDeactivate;
      onSelectionChangeRef.current = onSelectionChange;
    };
    $[2] = onActivate;
    $[3] = onCommit;
    $[4] = onDeactivate;
    $[5] = onSelectionChange;
    $[6] = t2;
  } else t2 = $[6];
  (0, import_react.useLayoutEffect)(t2);
  const lastRangeRef = (0, import_react.useRef)(null);
  const lastSelectionStateRef = (0, import_react.useRef)(null);
  const pointerDownInSafeZoneRef = (0, import_react.useRef)(false);
  let t3;
  let t4;
  if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = () => {
      const handlePointerDown = event => {
        pointerDownInSafeZoneRef.current = isBlurIntoSafeZone(event.target, containerRef);
        window.setTimeout(() => {
          pointerDownInSafeZoneRef.current = false;
        }, 0);
      };
      document.addEventListener("pointerdown", handlePointerDown, true);
      return () => document.removeEventListener("pointerdown", handlePointerDown, true);
    };
    t4 = [];
    $[7] = t3;
    $[8] = t4;
  } else {
    t3 = $[7];
    t4 = $[8];
  }
  (0, import_react.useEffect)(t3, t4);
  let t5;
  if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = editor => {
      const {
        from,
        to,
        empty
      } = editor.state.selection;
      const focused = editor.view.hasFocus();
      if (!empty) {
        lastRangeRef.current = {
          from,
          to
        };
        const state = computeSelectionState(editor);
        lastSelectionStateRef.current = state;
        onSelectionChangeRef.current?.(state);
        return;
      }
      if (focused) {
        lastRangeRef.current = null;
        const state_0 = computeSelectionState(editor);
        lastSelectionStateRef.current = state_0;
        onSelectionChangeRef.current?.(state_0);
        return;
      }
    };
    $[9] = t5;
  } else t5 = $[9];
  const handleSelectionMaybeChanged = t5;
  const autoWidth = initialNode.canvasPosition != null && initialNode.styles?.width == null && initialNode.styles?.height == null;
  const t6 = autoWidth ? "max-content" : "fit-content";
  const t7 = autoWidth ? "none" : "100%";
  const t8 = String(initialNode.styles?.lineHeight ?? "inherit");
  const t9 = autoWidth ? "pre" : "pre-wrap";
  let t10;
  if ($[10] !== inheritedPaint || $[11] !== initialNode.styles || $[12] !== minHeight || $[13] !== t6 || $[14] !== t7 || $[15] !== t8 || $[16] !== t9) {
    const editableCss = {
      "border": "none",
      "outline": "2px solid var(--ed-canvas-selection)",
      "background": "transparent",
      "cursor": "text",
      "font": "inherit",
      "padding": "0",
      "margin": "0",
      "width": t6,
      "max-width": t7,
      "box-sizing": "border-box",
      "display": "block",
      "line-height": t8,
      "white-space": t9,
      "overflow-wrap": "break-word"
    };
    if (minHeight) editableCss["min-height"] = `${minHeight}px`;
    if (initialNode.styles) for (const [k, v] of Object.entries(initialNode.styles)) {
      if (v === void 0 || v === null || v === "") continue;
      if (PLACEMENT_STYLE_KEYS.has(k)) continue;
      const cssKey = k.replace(/[A-Z]/g, _temp$64);
      editableCss[cssKey] = typeof v === "number" && !CSS_UNITLESS_PROPS.has(k) ? `${v}px` : String(v);
    }
    if (inheritedPaint) {
      for (const [k_0, v_0] of Object.entries(inheritedPaint)) {
        if (v_0 === void 0 || v_0 === null || v_0 === "") continue;
        if (initialNode.styles && initialNode.styles[k_0] != null) continue;
        const cssKey_0 = k_0.replace(/[A-Z]/g, _temp2$47);
        editableCss[cssKey_0] = String(v_0);
      }
      let t11;
      if ($[18] !== inheritedPaint.backgroundImage) {
        t11 = String(inheritedPaint.backgroundImage ?? "").match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/)?.[0];
        $[18] = inheritedPaint.backgroundImage;
        $[19] = t11;
      } else t11 = $[19];
      editableCss["caret-color"] = t11 || "var(--ed-canvas-selection)";
    }
    t10 = Object.entries(editableCss).map(_temp3$31);
    $[10] = inheritedPaint;
    $[11] = initialNode.styles;
    $[12] = minHeight;
    $[13] = t6;
    $[14] = t7;
    $[15] = t8;
    $[16] = t9;
    $[17] = t10;
  } else t10 = $[17];
  const editableStyleString = t10.join("; ");
  const t11 = autoWidth ? "none" : "100%";
  let wrapperStyle;
  if ($[20] !== initialNode.styles || $[21] !== t11) {
    wrapperStyle = {
      display: "inline-block",
      maxWidth: t11,
      verticalAlign: "top",
      boxSizing: "border-box"
    };
    if (initialNode.styles) for (const k_2 of PLACEMENT_STYLE_KEYS) {
      const v_2 = initialNode.styles[k_2];
      if (v_2 === void 0 || v_2 === null || v_2 === "") continue;
      wrapperStyle[k_2] = v_2;
    }
    $[20] = initialNode.styles;
    $[21] = t11;
    $[22] = wrapperStyle;
  } else wrapperStyle = $[22];
  const [keysExtension] = (0, import_react.useState)(_temp4$25);
  let t12;
  if ($[23] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = index_default.configure({
      heading: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false
    });
    $[23] = t12;
  } else t12 = $[23];
  let t13;
  if ($[24] !== keysExtension) {
    t13 = [t12, Underline, StyledText, keysExtension];
    $[24] = keysExtension;
    $[25] = t13;
  } else t13 = $[25];
  let t14;
  if ($[26] !== editableStyleString) {
    t14 = {
      spellcheck: "false",
      style: editableStyleString
    };
    $[26] = editableStyleString;
    $[27] = t14;
  } else t14 = $[27];
  let t15;
  if ($[28] === Symbol.for("react.memo_cache_sentinel")) {
    t15 = {
      mousedown: _temp7$13
    };
    $[28] = t15;
  } else t15 = $[28];
  let t16;
  if ($[29] !== t14) {
    t16 = {
      attributes: t14,
      handleKeyDown: _temp5$20,
      handleClick: _temp6$17,
      handleDOMEvents: t15
    };
    $[29] = t14;
    $[30] = t16;
  } else t16 = $[30];
  let t17;
  let t18;
  let t19;
  if ($[31] === Symbol.for("react.memo_cache_sentinel")) {
    t17 = t20 => {
      const {
        editor: editor_0
      } = t20;
      handleSelectionMaybeChanged(editor_0);
    };
    t18 = t21 => {
      const {
        editor: editor_1
      } = t21;
      handleSelectionMaybeChanged(editor_1);
    };
    t19 = t22 => {
      const {
        editor: editor_2,
        event: event_3
      } = t22;
      if (committedRef.current) return;
      const next = event_3.relatedTarget;
      if (isBlurIntoSafeZone(next, containerRef) || pointerDownInSafeZoneRef.current) return;
      committedRef.current = true;
      onCommitRef.current(serializeToContent(editor_2));
    };
    $[31] = t17;
    $[32] = t18;
    $[33] = t19;
  } else {
    t17 = $[31];
    t18 = $[32];
    t19 = $[33];
  }
  let t20;
  if ($[34] !== initialDoc || $[35] !== t13 || $[36] !== t16) {
    t20 = {
      extensions: t13,
      content: initialDoc,
      autofocus: "all",
      editorProps: t16,
      onSelectionUpdate: t17,
      onUpdate: t18,
      onBlur: t19
    };
    $[34] = initialDoc;
    $[35] = t13;
    $[36] = t16;
    $[37] = t20;
  } else t20 = $[37];
  const editor_3 = useEditor(t20);
  let t21;
  let t22;
  if ($[38] !== editor_3) {
    t21 = () => {
      if (!editor_3) return;
      const ensureRangeSelection = () => {
        if (!editor_3.state.selection.empty) return true;
        const stash = lastRangeRef.current;
        if (!stash) return false;
        const docSize = editor_3.state.doc.content.size;
        const from_0 = Math.max(0, Math.min(stash.from, docSize));
        const to_0 = Math.max(0, Math.min(stash.to, docSize));
        if (from_0 === to_0) return false;
        editor_3.commands.setTextSelection({
          from: from_0,
          to: to_0
        });
        return !editor_3.state.selection.empty;
      };
      const hasCaretTextStyle = () => {
        return (editor_3.state.storedMarks ?? editor_3.state.selection.$from.marks()).some(_temp8$9);
      };
      const prepareStyleTarget = () => {
        if (ensureRangeSelection()) return true;
        return hasCaretTextStyle();
      };
      onActivateRef.current?.({
        hasTextStyleTarget: () => {
          const empty_0 = editor_3.state.selection.empty;
          if (!empty_0 ? isFullSelection(editor_3) : !!lastSelectionStateRef.current?.isFull) return false;
          return !empty_0 || lastRangeRef.current !== null || hasCaretTextStyle();
        },
        applyStyles: styles => {
          if (!prepareStyleTarget()) return;
          const keepFocus = editor_3.view.hasFocus();
          const startChain = () => keepFocus ? editor_3.chain().focus() : editor_3.chain();
          const attrs = {};
          let useBold = false;
          let useItalic = false;
          let useUnderline = false;
          let useStrike = false;
          let setUnderline = false;
          let setStrike = false;
          const rest = {
            ...styles
          };
          if (rest.fontWeight !== void 0) {
            if (rest.fontWeight === null || rest.fontWeight === "") {
              attrs.fontWeight = null;
              startChain().unsetMark("bold").run();
            } else if (isBoldFontWeight$1(rest.fontWeight)) useBold = true;else {
              attrs.fontWeight = rest.fontWeight;
              startChain().unsetMark("bold").run();
            }
            delete rest.fontWeight;
          }
          if (rest.fontStyle !== void 0) {
            if (rest.fontStyle === null || rest.fontStyle === "") {
              attrs.fontStyle = null;
              startChain().unsetMark("italic").run();
            } else if (rest.fontStyle === "italic") useItalic = true;else {
              attrs.fontStyle = rest.fontStyle;
              startChain().unsetMark("italic").run();
            }
            delete rest.fontStyle;
          }
          if (rest.textDecoration !== void 0) {
            const value = rest.textDecoration;
            if (value === null || value === "") {
              startChain().unsetMark("underline").unsetMark("strike").run();
              attrs.textDecoration = null;
            } else {
              const parts = String(value).split(/\s+/).filter(Boolean);
              if (parts.includes("underline")) {
                useUnderline = true;
                setUnderline = true;
              }
              if (parts.includes("line-through")) {
                useStrike = true;
                setStrike = true;
              }
              const remaining = parts.filter(_temp9$8);
              if (!setUnderline) startChain().unsetMark("underline").run();
              if (!setStrike) startChain().unsetMark("strike").run();
              attrs.textDecoration = remaining.length ? remaining.join(" ") : null;
            }
            delete rest.textDecoration;
          }
          for (const [k_3, v_3] of Object.entries(rest)) attrs[k_3] = v_3 == null || v_3 === "" ? null : v_3;
          if (typeof attrs.color === "string" && attrs.color !== "") editor_3.commands.command(_temp1$7);
          const chain = startChain();
          if (editor_3.state.selection.empty && hasCaretTextStyle()) chain.extendMarkRange("textStyle");
          if (Object.keys(attrs).length > 0) chain.setMark("textStyle", attrs);
          if (useBold) chain.setMark("bold");
          if (useItalic) chain.setMark("italic");
          if (useUnderline) chain.setMark("underline");
          if (useStrike) chain.setMark("strike");
          chain.run();
        },
        toggleFormat: format => {
          if (!prepareStyleTarget()) return;
          const chain_0 = editor_3.chain().focus();
          if (editor_3.state.selection.empty) {
            if (format === "bold") chain_0.extendMarkRange("bold");else if (format === "italic") chain_0.extendMarkRange("italic");else if (format === "underline") chain_0.extendMarkRange("underline");else if (format === "strikethrough") chain_0.extendMarkRange("strike");
          }
          if (format === "bold") chain_0.toggleBold().run();else if (format === "italic") chain_0.toggleItalic().run();else if (format === "underline") chain_0.toggleUnderline().run();else if (format === "strikethrough") chain_0.toggleStrike().run();
        },
        addClassName: className => {
          if (!className) return;
          if (!prepareStyleTarget()) return;
          const keepFocus_0 = editor_3.view.hasFocus();
          if (editor_3.state.selection.empty) (keepFocus_0 ? editor_3.chain().focus() : editor_3.chain()).extendMarkRange("textStyle").run();
          editor_3.commands.command(t23 => {
            const {
              tr: tr_0,
              state: state_2
            } = t23;
            const {
              from: from_2,
              to: to_2
            } = state_2.selection;
            if (from_2 === to_2) return false;
            const markType_0 = state_2.schema.marks.textStyle;
            state_2.doc.nodesBetween(from_2, to_2, (node_0, pos_0) => {
              if (!node_0.isText) return true;
              const tFrom_0 = Math.max(pos_0, from_2);
              const tTo_0 = Math.min(pos_0 + node_0.nodeSize, to_2);
              const baseAttrs_0 = node_0.marks.find(m_0 => m_0.type === markType_0)?.attrs ?? {};
              const existingClasses = String(baseAttrs_0.class ?? "").split(/\s+/).filter(Boolean);
              const incoming = className.split(/\s+/).filter(Boolean);
              const merged = smartMergeClasses(existingClasses, incoming).join(" ");
              const incomingHasColorClass = incoming.some(_temp10$6);
              const nextAttrs = {
                ...baseAttrs_0,
                class: merged || null
              };
              if (incomingHasColorClass) nextAttrs.color = null;
              tr_0.removeMark(tFrom_0, tTo_0, markType_0);
              tr_0.addMark(tFrom_0, tTo_0, markType_0.create(nextAttrs));
              return false;
            });
            return true;
          });
          if (keepFocus_0) editor_3.commands.focus();
        },
        removeClassName: className_0 => {
          if (!className_0) return;
          if (!prepareStyleTarget()) return;
          const keepFocus_1 = editor_3.view.hasFocus();
          if (editor_3.state.selection.empty) (keepFocus_1 ? editor_3.chain().focus() : editor_3.chain()).extendMarkRange("textStyle").run();
          const toRemove = new Set(className_0.split(/\s+/).filter(Boolean));
          editor_3.commands.command(t24 => {
            const {
              tr: tr_1,
              state: state_3
            } = t24;
            const {
              from: from_3,
              to: to_3
            } = state_3.selection;
            if (from_3 === to_3) return false;
            const markType_1 = state_3.schema.marks.textStyle;
            state_3.doc.nodesBetween(from_3, to_3, (node_1, pos_1) => {
              if (!node_1.isText) return true;
              const tFrom_1 = Math.max(pos_1, from_3);
              const tTo_1 = Math.min(pos_1 + node_1.nodeSize, to_3);
              const existingMark_1 = node_1.marks.find(m_1 => m_1.type === markType_1);
              if (!existingMark_1) return false;
              const baseAttrs_1 = {
                ...existingMark_1.attrs
              };
              const merged_0 = String(baseAttrs_1.class ?? "").split(/\s+/).filter(Boolean).filter(c_3 => !toRemove.has(c_3)).join(" ");
              tr_1.removeMark(tFrom_1, tTo_1, markType_1);
              const nextAttrs_0 = {
                ...baseAttrs_1,
                class: merged_0 || null
              };
              if (Object.values(nextAttrs_0).some(_temp11$5)) tr_1.addMark(tFrom_1, tTo_1, markType_1.create(nextAttrs_0));
              return false;
            });
            return true;
          });
          if (keepFocus_1) editor_3.commands.focus();
        }
      });
      return () => {
        onDeactivateRef.current?.();
        onSelectionChangeRef.current?.(null);
      };
    };
    t22 = [editor_3];
    $[38] = editor_3;
    $[39] = t21;
    $[40] = t22;
  } else {
    t21 = $[39];
    t22 = $[40];
  }
  (0, import_react.useEffect)(t21, t22);
  let t23;
  let t24;
  if ($[41] !== editor_3) {
    t23 = () => {
      if (!editor_3) return;
      const onDocPointerDown = event_4 => {
        if (committedRef.current) return;
        const target = event_4.target;
        if (!target) return;
        const container = containerRef.current;
        if (container && container.contains(target)) return;
        if (isBlurIntoSafeZone(target, containerRef)) return;
        committedRef.current = true;
        onCommitRef.current(serializeToContent(editor_3));
      };
      document.addEventListener("pointerdown", onDocPointerDown, true);
      return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
    };
    t24 = [editor_3];
    $[41] = editor_3;
    $[42] = t23;
    $[43] = t24;
  } else {
    t23 = $[42];
    t24 = $[43];
  }
  (0, import_react.useEffect)(t23, t24);
  let t25;
  if ($[44] !== editor_3) {
    t25 = <EditorContent editor={editor_3} />;
    $[44] = editor_3;
    $[45] = t25;
  } else t25 = $[45];
  let t26;
  if ($[46] !== t25 || $[47] !== wrapperStyle) {
    t26 = <div ref={containerRef} style={wrapperStyle} onPointerDown={_temp12$3} onMouseDown={_temp13$3} onClick={_temp14$3} onDoubleClick={_temp15$3}>{t25}</div>;
    $[46] = t25;
    $[47] = wrapperStyle;
    $[48] = t26;
  } else t26 = $[48];
  return t26;
}
function _temp15$3(e_2) {
  return e_2.stopPropagation();
}
function _temp14$3(e_1) {
  return e_1.stopPropagation();
}
function _temp13$3(e_0) {
  return e_0.stopPropagation();
}
function _temp12$3(e) {
  return e.stopPropagation();
}
function _temp11$5(v_4) {
  return v_4 != null && v_4 !== "";
}
function _temp10$6(c_2) {
  return getTailwindCategory(c_2) === "text-color";
}
function _temp1$7(t0) {
  const {
    tr,
    state: state_1
  } = t0;
  const {
    from: from_1,
    to: to_1
  } = state_1.selection;
  if (from_1 === to_1) return false;
  const markType = state_1.schema.marks.textStyle;
  let changed = false;
  state_1.doc.nodesBetween(from_1, to_1, (node, pos) => {
    if (!node.isText) return true;
    const existingMark = node.marks.find(m => m.type === markType);
    if (!existingMark) return false;
    const baseAttrs = {
      ...existingMark.attrs
    };
    const classes = String(baseAttrs.class ?? "").split(/\s+/).filter(Boolean);
    const kept = classes.filter(_temp0$7);
    if (kept.length === classes.length) return false;
    const tFrom = Math.max(pos, from_1);
    const tTo = Math.min(pos + node.nodeSize, to_1);
    tr.removeMark(tFrom, tTo, markType);
    tr.addMark(tFrom, tTo, markType.create({
      ...baseAttrs,
      class: kept.join(" ") || null
    }));
    changed = true;
    return false;
  });
  return changed;
}
function _temp0$7(c_1) {
  return getTailwindCategory(c_1) !== "text-color";
}
function _temp9$8(p) {
  return p !== "underline" && p !== "line-through";
}
function _temp8$9(mark) {
  return mark.type.name === "textStyle" || mark.type.name === "bold" || mark.type.name === "italic" || mark.type.name === "underline" || mark.type.name === "strike";
}
function _temp7$13(view, event_2) {
  collapseBeforeDragSelect(view, event_2);
  return false;
}
function _temp6$17(_view_0, _pos, event_1) {
  event_1.stopPropagation();
  return false;
}
function _temp5$20(_view, event_0) {
  event_0.stopPropagation();
  return false;
}
function _temp4$25() {
  return makeKeysExtension();
}
function _temp3$31(t0) {
  const [k_1, v_1] = t0;
  return `${k_1}: ${v_1}`;
}
function _temp2$47(c_0) {
  return "-" + c_0.toLowerCase();
}
function _temp$64(c) {
  return "-" + c.toLowerCase();
}

export { TextEditor };
