/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/tabs/DesignTab.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { isFlowLayoutDisplay } from "../../../../../canvas/utils/absolutePositioning";
import { getCanvasSpaceRect } from "../../../../../canvas/utils/domGeometry";
import { alignCanvasSelection, distributeCanvasSelection } from "../../../../../shared/utils/positionAlignment";
import { getTailwindCategory, parseTailwindClass, smartMergeClasses } from "../../../../../shared/utils/tailwindScale";
import { TEXT_STYLE_KEYS } from "../../../../constants";
import { getMergedValue, isMixed } from "../../../../utils/multiSelect";
import { usePropertyResolution } from "../../../../utils/styleResolution";
import { isInlineTypographyEdit } from "../../../../utils/tailwindClasses";
import { StyleOpsContext, useStyleOps } from "../StyleOpsContext";
import { StyleDimensionInput, StyleLayoutInput, StyleLayoutMinMaxInput } from "../fields/layout";
import { InspectorDropdown } from "../inputs/parts/InspectorDropdown";
import { translateInspectorText } from "../inspectorCopy";
import { FlexMainAxisGapInput, FlowToggleGroup, WrapToggleButton } from "../layout/controls";
import { FLEX_DISTRIBUTIONS, asFlexDistribution } from "../layout/flexDistribution";
import { AlignmentCellGlyph, DistributedItemLine, FlexAlignmentGlyph } from "../layout/glyphs";
import { PositionSection } from "../positioning/PositionSection";
import { IconBtn, InspectorRailRow, LayoutAddButton, LayoutFieldLabel } from "../primitives";
import { AppearanceSection } from "../sections/AppearanceSection";
import { BackgroundSection } from "../sections/BackgroundSection";
import { BorderSection } from "../sections/BorderSection";
import { FiltersSection } from "../sections/FiltersSection";
import { InspectorSection } from "../sections/InspectorSection";
import { MarginSection } from "../sections/MarginSection";
import { OutlineSection } from "../sections/OutlineSection";
import { PaddingSection } from "../sections/PaddingSection";
import { RadiusSection } from "../sections/RadiusSection";
import { ScaleSection } from "../sections/ScaleSection";
import { ShadowSection } from "../sections/ShadowSection";
import { TypographySection } from "../sections/TypographySection";
import { getById, getChildren$2, getParentId, isTextOwner } from "@bingo/compiler";
import { CropIcon, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, GapIcon, LockAspectRatioIcon, MaxWidthIcon, OverflowSettingsIcon, ZIndexIcon, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import { ArrowsInLineHorizontalIcon as r$8 } from "@phosphor-icons/react/dist/icons/ArrowsInLineHorizontal";
import { ArrowsInLineVerticalIcon as e$15 } from "@phosphor-icons/react/dist/icons/ArrowsInLineVertical";
import { ArrowsOutLineVerticalIcon as e$14 } from "@phosphor-icons/react/dist/icons/ArrowsOutLineVertical";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import * as import_jsx_runtime from "react/jsx-runtime";

/**
* Design tab — the visual styles editor. Builds the StyleOps object once
* (read/write/source/class helpers over the selected element or text
* selection, with multi-select merging) and provides it via StyleOpsContext
* so every section consumes it through useStyleField. Renders Position,
* Layout, Appearance, Radius, Margin, Background, Border, Typography, and
* Effects.
*/
var OVERFLOW_OPTIONS = [{
  value: "visible",
  label: "Show Overflow"
}, {
  value: "hidden",
  label: "Clip Content"
}, {
  value: "scroll",
  label: "Scroll Content"
}];
function elementWithTextSelection(rawElement, textSelectionState) {
  if (!textSelectionState || !rawElement) return rawElement;
  const baseProps = rawElement.props ?? {};
  if (textSelectionState.isFull) {
    const ownerClass = String(baseProps.className ?? "");
    const runClass = textSelectionState.className ?? "";
    const merged = [...new Set([...ownerClass.split(/\s+/), ...runClass.split(/\s+/)].filter(Boolean))].join(" ");
    if (merged === ownerClass) return rawElement;
    return {
      ...rawElement,
      props: {
        ...baseProps,
        className: merged
      }
    };
  }
  return {
    ...rawElement,
    styles: textSelectionState.styles,
    props: {
      ...baseProps,
      className: textSelectionState.className ?? ""
    }
  };
}
function flexDirectionOfParent(store, elId) {
  const parentKey = getParentId(store, elId);
  if (!parentKey || parentKey === "ROOT") return null;
  const parent = getById(store, parentKey);
  if (!parent) return null;
  const parentStyles = parent.styles || {};
  const d = parentStyles.display;
  if (d !== "flex" && d !== "inline-flex") return null;
  const dir = parentStyles.flexDirection || "row";
  return dir === "column" || dir === "column-reverse" ? "column" : "row";
}
function parentFlexDirection(store, isMultiSelect, selectedElements, selectedElementId) {
  if (isMultiSelect && selectedElements) {
    for (const el of selectedElements) {
      const result = flexDirectionOfParent(store, el.id);
      if (result) return result;
    }
    return null;
  }
  if (!selectedElementId) return null;
  return flexDirectionOfParent(store, selectedElementId);
}
var OPTIONAL_DIMENSION_FIELDS = [{
  property: "minWidth",
  label: "Min Width",
  initialValue: "0px"
}, {
  property: "maxWidth",
  label: "Max Width",
  initialValue: "100%"
}, {
  property: "minHeight",
  label: "Min Height",
  initialValue: "0px"
}, {
  property: "maxHeight",
  label: "Max Height",
  initialValue: "100%"
}];
var FRAME_ALIGNMENT_POSITIONS = new Set(["static", "relative", "absolute", "fixed", "sticky"]);
function OptionalDimensionFieldsMenu() {
  const $ = (0, import_compiler_runtime.c)(7);
  const { t } = useTranslation("editor");
  const {
    has,
    set,
    clear
  } = useStyleOps();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <DropdownMenuTrigger asChild={true}>{<IconBtn label="Size fields">{<OverflowSettingsIcon />}</IconBtn>}</DropdownMenuTrigger>;
    $[0] = t0;
  } else t0 = $[0];
  let t1;
  if (true) {
    t1 = OPTIONAL_DIMENSION_FIELDS.map(field => <DropdownMenuCheckboxItem key={field.property} checked={has(field.property)} onCheckedChange={checked => {
      if (checked) set(field.property, field.initialValue);else clear(field.property);
    }}>{translateInspectorText(t, field.label)}</DropdownMenuCheckboxItem>);
    $[1] = clear;
    $[2] = has;
    $[3] = set;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== t1) {
    t2 = <DropdownMenu modal={false}>{t0}{<DropdownMenuContent align="end" className="w-max min-w-0">{t1}</DropdownMenuContent>}</DropdownMenu>;
    $[5] = t1;
    $[6] = t2;
  } else t2 = $[6];
  return t2;
}
function DesignTab(t0) {
  const $ = (0, import_compiler_runtime.c)(93);
  const { t } = useTranslation("editor");
  const {
    element: rawElement,
    selectedElementId,
    selectedElements,
    store,
    onUpdateElementStyles,
    onUpdateElementProps,
    onUpdateMultipleElementsStyles,
    onUpdateElementPositions,
    onUpdateMultipleElementsProps,
    onToggleTextFormat,
    textSelectionState,
    readOnly,
    fonts
  } = t0;
  const element = elementWithTextSelection(rawElement, textSelectionState);
  const isMultiSelect = selectedElements && selectedElements.length > 1;
  let alignmentElements;
  let allCanvasRoots;
  let allFrameChildren;
  let allFramePositionsSupported;
  let t1;
  if ($[0] !== rawElement || $[1] !== selectedElements || $[2] !== store) {
    alignmentElements = selectedElements ?? (rawElement ? [rawElement] : []);
    let t2;
    if ($[8] !== store) {
      t2 = item => getParentId(store, item.id);
      $[8] = store;
      $[9] = t2;
    } else t2 = $[9];
    const alignmentParentKeys = alignmentElements.map(t2);
    allCanvasRoots = alignmentElements.length > 0 && alignmentParentKeys.every(_temp$31);
    allFrameChildren = alignmentElements.length > 0 && alignmentParentKeys.every(_temp2$23);
    allFramePositionsSupported = alignmentElements.every(_temp3$14);
    t1 = allFrameChildren && alignmentParentKeys.some(parentId => {
      if (!parentId || parentId === "ROOT") return false;
      const parent_1 = getById(store, parentId);
      if (isFlowLayoutDisplay(String(parent_1?.styles?.display ?? ""))) return true;
      return String(parent_1?.props?.className ?? "").split(/\s+/).some(_temp4$13);
    });
    $[0] = rawElement;
    $[1] = selectedElements;
    $[2] = store;
    $[3] = alignmentElements;
    $[4] = allCanvasRoots;
    $[5] = allFrameChildren;
    $[6] = allFramePositionsSupported;
    $[7] = t1;
  } else {
    alignmentElements = $[3];
    allCanvasRoots = $[4];
    allFrameChildren = $[5];
    allFramePositionsSupported = $[6];
    t1 = $[7];
  }
  const positionAlignmentScope = allCanvasRoots ? alignmentElements.length > 1 && onUpdateElementPositions ? "canvas" : "canvas-disabled" : allFrameChildren && allFramePositionsSupported ? t1 ? "frame-disabled" : "frame" : "none";
  let t2;
  if ($[10] !== alignmentElements || $[11] !== onUpdateElementPositions || $[12] !== positionAlignmentScope) {
    t2 = (axis, alignment) => {
      if (positionAlignmentScope !== "canvas" || !onUpdateElementPositions) return;
      const items = alignmentElements.flatMap(_temp5$10);
      if (items.length !== alignmentElements.length) return;
      onUpdateElementPositions(alignCanvasSelection(items, axis, alignment));
    };
    $[10] = alignmentElements;
    $[11] = onUpdateElementPositions;
    $[12] = positionAlignmentScope;
    $[13] = t2;
  } else t2 = $[13];
  const alignCanvasPosition = t2;
  const canDistributePosition = positionAlignmentScope === "canvas" && alignmentElements.length >= 3;
  let t3;
  if ($[14] !== alignmentElements || $[15] !== canDistributePosition || $[16] !== onUpdateElementPositions) {
    t3 = axis_0 => {
      if (!canDistributePosition || !onUpdateElementPositions) return;
      const items_0 = alignmentElements.flatMap(_temp6$8);
      if (items_0.length !== alignmentElements.length) return;
      onUpdateElementPositions(distributeCanvasSelection(items_0, axis_0));
    };
    $[14] = alignmentElements;
    $[15] = canDistributePosition;
    $[16] = onUpdateElementPositions;
    $[17] = t3;
  } else t3 = $[17];
  const distributeCanvasPosition = t3;
  const elementClassName = element?.props?.className;
  const {
    resolve,
    get: resolveGet,
    computed,
    pendingClasses
  } = usePropertyResolution(selectedElementId, element?.styles, !!isMultiSelect, elementClassName);
  const styles = element?.styles || {};
  const rawStyles = rawElement?.styles || {};
  const getMergedStyle = prop => {
    if (!isMultiSelect || !selectedElements) return element?.styles?.[prop] ?? computed[prop] ?? "";
    const result = getMergedValue(selectedElements, el => el.styles?.[prop]);
    return result === void 0 ? "" : result;
  };
  const get = p => {
    if (isMultiSelect) {
      const merged = getMergedStyle(p);
      if (isMixed(merged)) return "Mixed";
      return merged === void 0 ? "" : String(merged);
    }
    return resolveGet(p);
  };
  const getExplicit = p_0 => {
    if (isMultiSelect) return get(p_0);
    const res = resolve(p_0);
    if (res.source === "inline" || res.source === "class") return res.value;
    return "";
  };
  const classNameOf = _temp7$5;
  let t4;
  if ($[18] !== store) {
    t4 = startId => {
      let curr = startId;
      while (curr && curr !== "ROOT") {
        const colorClass = classNameOf(getById(store, curr)).split(/\s+/).filter(Boolean).find(_temp8$4);
        if (colorClass) return {
          className: colorClass,
          ownerId: curr
        };
        curr = getParentId(store, curr);
      }
      return null;
    };
    $[18] = store;
    $[19] = t4;
  } else t4 = $[19];
  const findInheritedColorClass = t4;
  let t5;
  if ($[20] !== onUpdateElementProps || $[21] !== readOnly || $[22] !== store) {
    t5 = (id, cls) => {
      if (readOnly || !onUpdateElementProps) return;
      const el_1 = getById(store, id);
      const props = (el_1 && "props" in el_1 ? el_1.props : void 0) ?? {};
      const updated = classNameOf(el_1).split(/\s+/).filter(Boolean).filter(c_0 => c_0 !== cls);
      onUpdateElementProps(id, {
        ...props,
        className: updated.join(" ")
      });
    };
    $[20] = onUpdateElementProps;
    $[21] = readOnly;
    $[22] = store;
    $[23] = t5;
  } else t5 = $[23];
  const removeClassFromElement = t5;
  const getSource = p_1 => {
    const res_0 = resolve(p_1);
    if (res_0.source === "class" || res_0.source === "inline" && res_0.isOverride) return res_0;
    if (p_1 === "color" && isTextOwner(store, selectedElementId)) {
      const inherited = findInheritedColorClass(selectedElementId);
      if (inherited) return {
        value: get("color"),
        source: "class",
        sourceClass: inherited.className,
        inheritedOwnerId: inherited.ownerId
      };
    }
    return null;
  };
  const removeClass = cls_0 => {
    if (readOnly) return;
    const toRemove = new Set(Array.isArray(cls_0) ? cls_0 : [cls_0]);
    if (isMultiSelect && onUpdateMultipleElementsProps && selectedElements) {
      const ids = new Set(selectedElements.map(_temp9$4));
      onUpdateMultipleElementsProps(ids, currentProps => {
        const updated_0 = (currentProps?.className || "").split(/\s+/).filter(Boolean).filter(c_1 => !toRemove.has(c_1));
        return {
          ...currentProps,
          className: updated_0.join(" ")
        };
      });
    } else if (onUpdateElementProps) {
      const currentProps_0 = isInlineTypographyEdit(textSelectionState, [...toRemove]) ? element?.props || {} : rawElement?.props || {};
      const updated_1 = (currentProps_0.className || "").split(/\s+/).filter(Boolean).filter(c_2 => !toRemove.has(c_2));
      onUpdateElementProps(selectedElementId, {
        ...currentProps_0,
        className: updated_1.join(" ")
      });
    }
  };
  const sourceProps = p_2 => {
    const src = getSource(p_2);
    if (!src) return {};
    const inheritedOwnerId = src.inheritedOwnerId;
    return {
      source: src.source,
      sourceClass: src.sourceClass,
      isPending: src.sourceClass ? pendingClasses.has(src.sourceClass) : false,
      onClearOverride: src.isOverride ? () => clear(p_2) : inheritedOwnerId && src.sourceClass ? () => removeClassFromElement(inheritedOwnerId, src.sourceClass) : src.source === "class" && src.sourceClass ? () => removeClass(src.sourceClass) : void 0
    };
  };
  const addClass = cls_1 => {
    if (readOnly) return;
    const classNames = Array.isArray(cls_1) ? cls_1 : [cls_1];
    if (isMultiSelect && onUpdateMultipleElementsProps && selectedElements) {
      const ids_0 = new Set(selectedElements.map(_temp0$3));
      onUpdateMultipleElementsProps(ids_0, currentProps_1 => {
        const merged_0 = smartMergeClasses((currentProps_1?.className || "").split(/\s+/).filter(Boolean), classNames);
        return {
          ...currentProps_1,
          className: merged_0.join(" ")
        };
      });
    } else if (onUpdateElementProps) {
      const currentProps_2 = isInlineTypographyEdit(textSelectionState, classNames) ? element?.props || {} : rawElement?.props || {};
      const merged_1 = smartMergeClasses((currentProps_2.className || "").split(/\s+/).filter(Boolean), classNames);
      onUpdateElementProps(selectedElementId, {
        ...currentProps_2,
        className: merged_1.join(" ")
      });
    }
  };
  const categoryInlineProps = {
    padding: ["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
    "padding-x": ["paddingLeft", "paddingRight"],
    "padding-y": ["paddingTop", "paddingBottom"],
    "padding-top": ["paddingTop"],
    "padding-right": ["paddingRight"],
    "padding-bottom": ["paddingBottom"],
    "padding-left": ["paddingLeft"],
    margin: ["margin", "marginTop", "marginRight", "marginBottom", "marginLeft"],
    "margin-x": ["marginLeft", "marginRight"],
    "margin-y": ["marginTop", "marginBottom"],
    "margin-top": ["marginTop"],
    "margin-right": ["marginRight"],
    "margin-bottom": ["marginBottom"],
    "margin-left": ["marginLeft"],
    "border-width": ["borderWidth", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"],
    "border-color": ["borderColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"],
    "border-style": ["borderStyle", "borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle"],
    "border-width-top": ["borderTopWidth"],
    "border-width-right": ["borderRightWidth"],
    "border-width-bottom": ["borderBottomWidth"],
    "border-width-left": ["borderLeftWidth"],
    "border-width-x": ["borderLeftWidth", "borderRightWidth"],
    "border-width-y": ["borderTopWidth", "borderBottomWidth"],
    "border-width-start": ["borderInlineStartWidth"],
    "border-width-end": ["borderInlineEndWidth"],
    "border-color-top": ["borderTopColor"],
    "border-color-right": ["borderRightColor"],
    "border-color-bottom": ["borderBottomColor"],
    "border-color-left": ["borderLeftColor"],
    "border-color-x": ["borderLeftColor", "borderRightColor"],
    "border-color-y": ["borderTopColor", "borderBottomColor"],
    "border-color-start": ["borderInlineStartColor"],
    "border-color-end": ["borderInlineEndColor"],
    "border-style-top": ["borderTopStyle"],
    "border-style-right": ["borderRightStyle"],
    "border-style-bottom": ["borderBottomStyle"],
    "border-style-left": ["borderLeftStyle"],
    "border-style-x": ["borderLeftStyle", "borderRightStyle"],
    "border-style-y": ["borderTopStyle", "borderBottomStyle"],
    "border-style-start": ["borderInlineStartStyle"],
    "border-style-end": ["borderInlineEndStyle"],
    "border-radius": ["borderRadius", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"],
    background: ["backgroundColor", "background", "backgroundImage"],
    "text-color": ["color", "backgroundImage", "backgroundClip", "WebkitBackgroundClip", "WebkitTextFillColor"],
    "text-size": ["fontSize"],
    "font-weight": ["fontWeight"],
    opacity: ["opacity"],
    gap: ["gap", "rowGap", "columnGap"],
    width: ["width"],
    height: ["height"]
  };
  const addClassForProperty = (cls_2, cssProp) => {
    addClass(cls_2);
    const cat = getTailwindCategory(cls_2);
    const propsToClear = /^border(Top|Right|Bottom|Left)(Width|Color|Style)$/.test(cssProp) ? [cssProp] : cat ? categoryInlineProps[cat] : null;
    if (propsToClear) {
      const toClear = propsToClear.filter(p_3 => has(p_3));
      if (toClear.length) clear(...toClear);
    } else if (has(cssProp)) clear(cssProp);
  };
  const getIsMixed = p_4 => {
    if (textSelectionState?.isMixed[p_4]) return true;
    if (!isMultiSelect) return false;
    return isMixed(getMergedStyle(p_4));
  };
  const has = p_5 => {
    if (isMultiSelect && selectedElements) return selectedElements.some(el_4 => {
      const s = el_4.styles;
      return s && p_5 in s && s[p_5] !== void 0 && s[p_5] !== "";
    });
    if (styles && p_5 in styles && styles[p_5] !== void 0 && styles[p_5] !== "") return true;
    return resolve(p_5).source === "class";
  };
  const hasAny = (...t6) => {
    return t6.some(p_6 => has(p_6));
  };
  let t7;
  if ($[24] !== onUpdateElementStyles || $[25] !== onUpdateMultipleElementsStyles || $[26] !== store || $[27] !== textSelectionState) {
    t7 = (parentId_0, props_1) => {
      if (textSelectionState && !textSelectionState.isFull) return;
      const keys = props_1.filter(_temp1$3);
      if (!keys.length) return;
      const ids_1 = new Set();
      const walk = id_0 => {
        for (const childId of getChildren$2(store, id_0)) {
          const child = getById(store, childId);
          const cs = child?.styles;
          if (child?.type === "text" && cs && keys.some(k => k in cs)) ids_1.add(childId);
          walk(childId);
        }
      };
      walk(parentId_0);
      if (!ids_1.size) return;
      if (onUpdateMultipleElementsStyles) onUpdateMultipleElementsStyles(ids_1, cur => {
        const next = {
          ...cur
        };
        keys.forEach(k_0 => delete next[k_0]);
        return next;
      });else for (const id_1 of ids_1) {
        const cs_0 = {
          ...(getById(store, id_1)?.styles ?? {})
        };
        keys.forEach(k_1 => delete cs_0[k_1]);
        onUpdateElementStyles(id_1, cs_0);
      }
    };
    $[24] = onUpdateElementStyles;
    $[25] = onUpdateMultipleElementsStyles;
    $[26] = store;
    $[27] = textSelectionState;
    $[28] = t7;
  } else t7 = $[28];
  const reconcileTextDescendants = t7;
  const set = (p_8, v) => {
    if (readOnly) return;
    if (isMultiSelect && onUpdateMultipleElementsStyles && selectedElements) {
      const ids_2 = new Set(selectedElements.map(_temp10$3));
      onUpdateMultipleElementsStyles(ids_2, currentStyles => ({
        ...currentStyles,
        [p_8]: v
      }));
    } else {
      const base = textSelectionState && TEXT_STYLE_KEYS.has(p_8) ? styles : rawStyles;
      onUpdateElementStyles(selectedElementId, {
        ...base,
        [p_8]: v
      });
      reconcileTextDescendants(selectedElementId, [p_8]);
    }
  };
  const setMultiple = updates => {
    if (readOnly) return;
    const applyUpdates = base_0 => {
      const merged_2 = {
        ...base_0,
        ...updates
      };
      for (const k_2 of Object.keys(merged_2)) if (merged_2[k_2] === void 0) delete merged_2[k_2];
      return merged_2;
    };
    if (isMultiSelect && onUpdateMultipleElementsStyles && selectedElements) {
      const ids_3 = new Set(selectedElements.map(_temp11$2));
      onUpdateMultipleElementsStyles(ids_3, currentStyles_0 => applyUpdates(currentStyles_0));
    } else {
      const updateKeys = Object.keys(updates);
      const base_1 = textSelectionState && updateKeys.every(_temp12$1) ? styles : rawStyles;
      onUpdateElementStyles(selectedElementId, applyUpdates(base_1));
      reconcileTextDescendants(selectedElementId, updateKeys);
    }
  };
  const clear = (...t8) => {
    const props_2 = t8;
    if (readOnly) return;
    if (isMultiSelect && onUpdateMultipleElementsStyles && selectedElements) {
      const ids_4 = new Set(selectedElements.map(_temp13$1));
      onUpdateMultipleElementsStyles(ids_4, currentStyles_1 => {
        const newStyles = {
          ...currentStyles_1
        };
        props_2.forEach(p_9 => delete newStyles[p_9]);
        return newStyles;
      });
    } else {
      const newStyles_0 = {
        ...(textSelectionState && props_2.every(_temp14$1) ? styles : rawStyles)
      };
      props_2.forEach(p_11 => delete newStyles_0[p_11]);
      onUpdateElementStyles(selectedElementId, newStyles_0);
      reconcileTextDescendants(selectedElementId, props_2);
    }
  };
  const isFlex = isMultiSelect && selectedElements ? selectedElements.some(_temp15$1) : get("display") === "flex" || get("display") === "inline-flex";
  const parentFlexDir = parentFlexDirection(store, isMultiSelect, selectedElements, selectedElementId);
  const flexDir = get("flexDirection");
  const flexWrap = get("flexWrap");
  const alignItems = get("alignItems");
  const justifyContent = get("justifyContent");
  const resolvedOverflow = get("overflow");
  const overflowMode = resolvedOverflow === "Mixed" ? null : resolvedOverflow === "hidden" || resolvedOverflow === "clip" ? "hidden" : resolvedOverflow === "scroll" || resolvedOverflow === "auto" ? "scroll" : "visible";
  let t9;
  if ($[29] !== overflowMode) {
    t9 = OVERFLOW_OPTIONS.find(option => option.value === overflowMode);
    $[29] = overflowMode;
    $[30] = t9;
  } else t9 = $[30];
  const overflowOption = t9;
  const isColumnDirection = flexDir === "column" || flexDir === "column-reverse";
  const distribution = asFlexDistribution(justifyContent);
  const isFlexWrapped = flexWrap === "wrap" || flexWrap === "wrap-reverse";
  const crossGapProperty = isColumnDirection ? "columnGap" : "rowGap";
  const getAlignment = () => {
    const valToPos = {
      "flex-start": 0,
      start: 0,
      normal: 0,
      stretch: 0,
      center: 1,
      "flex-end": 2,
      end: 2
    };
    if (isColumnDirection) return [distribution ? 1 : valToPos[justifyContent] ?? 0, valToPos[alignItems] ?? 0];else return [valToPos[alignItems] ?? 0, distribution ? 1 : valToPos[justifyContent] ?? 0];
  };
  const setAlignment = (row_1, col_1) => {
    const vals = ["flex-start", "center", "flex-end"];
    if (isColumnDirection) setMultiple({
      justifyContent: vals[row_1],
      alignItems: vals[col_1]
    });else setMultiple({
      alignItems: vals[row_1],
      justifyContent: vals[col_1]
    });
  };
  const setCrossAlignment = (row_2, col_2) => {
    set("alignItems", ["flex-start", "center", "flex-end"][isColumnDirection ? col_2 : row_2]);
  };
  const cycleDistribution = (row_3, col_3) => {
    const next_0 = FLEX_DISTRIBUTIONS[distribution ? FLEX_DISTRIBUTIONS.indexOf(distribution) + 1 : 0];
    if (!next_0) {
      setAlignment(row_3, col_3);
      return;
    }
    setMultiple({
      justifyContent: next_0,
      alignItems: ["flex-start", "center", "flex-end"][isColumnDirection ? col_3 : row_3]
    });
  };
  let t10;
  if ($[31] !== getAlignment) {
    t10 = getAlignment();
    $[31] = getAlignment;
    $[32] = t10;
  } else t10 = $[32];
  const [alignRow, alignCol] = t10;
  const [aspectLocked, setAspectLocked] = (0, import_react.useState)(false);
  if (!element && !isMultiSelect) {
    let t11;
    if (true) {
      t11 = <p className="p-3 text-[12px] text-ed-muted-foreground">{t("styles.noElement")}</p>;
      $[33] = t11;
    } else t11 = $[33];
    return t11;
  }
  const removeClassesByCategory = categories => {
    const wanted = new Set(Array.isArray(categories) ? categories : [categories]);
    const toRemove_0 = (elementClassName ?? "").split(/\s+/).filter(Boolean).filter(c_3 => {
      const cat_0 = getTailwindCategory(c_3);
      return cat_0 ? wanted.has(cat_0) : false;
    });
    if (toRemove_0.length) removeClass(toRemove_0);
  };
  const styleOps = {
    get,
    getExplicit,
    getIsMixed,
    has,
    hasAny,
    computed,
    set,
    setMultiple,
    clear,
    addClass,
    removeClass,
    removeClassesByCategory,
    addClassForProperty,
    sourceProps,
    readOnly: !!readOnly,
    isMultiSelect: !!isMultiSelect,
    selectedElementId,
    elementClassName: elementClassName ?? "",
    store,
    onUpdateElementStyles,
    positionAlignmentScope,
    alignCanvasPosition,
    canDistributePosition,
    distributeCanvasPosition,
    isFlex,
    parentFlexDir,
    fonts,
    onToggleTextFormat
  };
  let t11;
  if ($[34] === Symbol.for("react.memo_cache_sentinel")) {
    t11 = <PositionSection />;
    $[34] = t11;
  } else t11 = $[34];
  let t12;
  if ($[35] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = <OptionalDimensionFieldsMenu />;
    $[35] = t12;
  } else t12 = $[35];
  let t13;
  if ($[36] === Symbol.for("react.memo_cache_sentinel")) {
    t13 = <LayoutFieldLabel>Flow</LayoutFieldLabel>;
    $[36] = t13;
  } else t13 = $[36];
  const t14 = isFlex ? <WrapToggleButton /> : void 0;
  let t15;
  if ($[37] === Symbol.for("react.memo_cache_sentinel")) {
    t15 = <FlowToggleGroup />;
    $[37] = t15;
  } else t15 = $[37];
  let t16;
  if ($[38] !== t14) {
    t16 = <div className="flex flex-col gap-2">{t13}{<InspectorRailRow action={t14}>{t15}</InspectorRailRow>}</div>;
    $[38] = t14;
    $[39] = t16;
  } else t16 = $[39];
  let t17;
  if ($[40] === Symbol.for("react.memo_cache_sentinel")) {
    t17 = <LayoutFieldLabel>Dimensions</LayoutFieldLabel>;
    $[40] = t17;
  } else t17 = $[40];
  const t18 = aspectLocked ? t("styles.unlockAspectRatio") : t("styles.lockAspectRatio");
  let t19;
  if ($[41] !== aspectLocked) {
    t19 = () => setAspectLocked(!aspectLocked);
    $[41] = aspectLocked;
    $[42] = t19;
  } else t19 = $[42];
  let t20;
  if ($[43] === Symbol.for("react.memo_cache_sentinel")) {
    t20 = <LockAspectRatioIcon />;
    $[43] = t20;
  } else t20 = $[43];
  let t21;
  if ($[44] !== aspectLocked || $[45] !== t18 || $[46] !== t19) {
    t21 = <IconBtn label={t18} active={aspectLocked} onClick={t19}>{t20}</IconBtn>;
    $[44] = aspectLocked;
    $[45] = t18;
    $[46] = t19;
    $[47] = t21;
  } else t21 = $[47];
  let t22;
  if ($[48] !== aspectLocked) {
    t22 = aspectLocked && <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-1.5 w-2 -translate-x-1/2 -translate-y-1/2 bg-ed-field" />;
    $[48] = aspectLocked;
    $[49] = t22;
  } else t22 = $[49];
  let t23;
  let t24;
  if ($[50] !== aspectLocked) {
    t23 = <StyleDimensionInput label="W" property="width" aspectLocked={aspectLocked} />;
    t24 = <StyleDimensionInput label="H" property="height" aspectLocked={aspectLocked} />;
    $[50] = aspectLocked;
    $[51] = t23;
    $[52] = t24;
  } else {
    t23 = $[51];
    t24 = $[52];
  }
  let t25;
  if ($[53] !== t22 || $[54] !== t23 || $[55] !== t24) {
    t25 = <div className="relative grid min-w-0 grid-cols-2 gap-2">{t22}{t23}{t24}</div>;
    $[53] = t22;
    $[54] = t23;
    $[55] = t24;
    $[56] = t25;
  } else t25 = $[56];
  let t26;
  if ($[57] !== t21 || $[58] !== t25) {
    t26 = <div className="flex flex-col gap-2">{t17}{<InspectorRailRow action={t21}>{t25}</InspectorRailRow>}</div>;
    $[57] = t21;
    $[58] = t25;
    $[59] = t26;
  } else t26 = $[59];
  let t27;
  if (true) {
    const overflowLabel = overflowMode === "visible" ? t("styles.showOverflow") : overflowMode === "hidden" ? t("styles.clipContent") : overflowMode === "scroll" ? t("styles.scrollContent") : "-";
    t27 = overflowOption ? <span className="flex min-w-0 items-center gap-1.5">{<CropIcon className="size-4 shrink-0 text-ed-inspector-chrome" />}{<span className="truncate">{overflowLabel}</span>}</span> : "-";
    $[60] = overflowOption;
    $[61] = t27;
  } else t27 = $[61];
  const t28 = overflowMode ?? "visible";
  const t29 = overflowMode === null;
  let t30;
  if ($[62] !== setMultiple) {
    t30 = value => setMultiple({
      overflow: value,
      overflowX: void 0,
      overflowY: void 0
    });
    $[62] = setMultiple;
    $[63] = t30;
  } else t30 = $[63];
  let t31;
  if ($[64] !== t27 || $[65] !== t28 || $[66] !== t29 || $[67] !== t30) {
    t31 = <InspectorDropdown label="Overflow" value={t27} className="min-w-0 flex-1" selectedValue={t28} isMixed={t29} options={OVERFLOW_OPTIONS} onValueChange={t30} />;
    $[64] = t27;
    $[65] = t28;
    $[66] = t29;
    $[67] = t30;
    $[68] = t31;
  } else t31 = $[68];
  let t32;
  if (true) {
    t32 = <div role="group" aria-label={t("styles.zIndex")} className="min-w-0 flex-1">{<StyleLayoutInput property="zIndex" icon={<ZIndexIcon className="!size-3.5 text-ed-inspector-chrome" />} placeholder={t("styles.auto")} unit="" inputClassName="capitalize" />}</div>;
    $[69] = t32;
  } else t32 = $[69];
  let t33;
  if ($[70] !== t31) {
    t33 = <div className="flex min-w-0 gap-2">{t31}{t32}</div>;
    $[70] = t31;
    $[71] = t33;
  } else t33 = $[71];
  let t34;
  let t35;
  let t36;
  let t37;
  let t38;
  let t39;
  let t40;
  let t41;
  let t42;
  let t43;
  if ($[72] === Symbol.for("react.memo_cache_sentinel")) {
    t34 = <AppearanceSection />;
    t35 = <PaddingSection />;
    t36 = <MarginSection />;
    t37 = <RadiusSection />;
    t38 = <BackgroundSection />;
    t39 = <BorderSection />;
    t40 = <OutlineSection />;
    t41 = <TypographySection />;
    t42 = <ShadowSection />;
    t43 = <FiltersSection />;
    $[72] = t34;
    $[73] = t35;
    $[74] = t36;
    $[75] = t37;
    $[76] = t38;
    $[77] = t39;
    $[78] = t40;
    $[79] = t41;
    $[80] = t42;
    $[81] = t43;
  } else {
    t34 = $[72];
    t35 = $[73];
    t36 = $[74];
    t37 = $[75];
    t38 = $[76];
    t39 = $[77];
    t40 = $[78];
    t41 = $[79];
    t42 = $[80];
    t43 = $[81];
  }
  let t44;
  if ($[82] !== element || $[83] !== selectedElements) {
    t44 = selectedElements ?? (element ? [element] : []);
    $[82] = element;
    $[83] = selectedElements;
    $[84] = t44;
  } else t44 = $[84];
  let t45;
  if ($[85] !== onUpdateElementStyles || $[86] !== onUpdateMultipleElementsStyles || $[87] !== readOnly || $[88] !== store) {
    t45 = transforms => {
      if (readOnly || transforms.size === 0) return;
      if (onUpdateMultipleElementsStyles) onUpdateMultipleElementsStyles(new Set(transforms.keys()), (currentStyles_2, id_2) => {
        const next_1 = {
          ...currentStyles_2
        };
        const transform = transforms.get(id_2);
        if (transform) next_1.transform = transform;else delete next_1.transform;
        return next_1;
      });else for (const [id_3, transform_0] of transforms) {
        const current = getById(store, id_3);
        if (current) {
          const next_2 = {
            ...current.styles
          };
          if (transform_0) next_2.transform = transform_0;else delete next_2.transform;
          onUpdateElementStyles(id_3, next_2);
        }
      }
    };
    $[85] = onUpdateElementStyles;
    $[86] = onUpdateMultipleElementsStyles;
    $[87] = readOnly;
    $[88] = store;
    $[89] = t45;
  } else t45 = $[89];
  let t46;
  if ($[90] !== t44 || $[91] !== t45) {
    t46 = <ScaleSection elements={t44} onApply={t45} />;
    $[90] = t44;
    $[91] = t45;
    $[92] = t46;
  } else t46 = $[92];
  return <StyleOpsContext.Provider value={styleOps}>{t11}{<InspectorSection title="Layout" reserveActionRail={true} action={t12}>{<div className="flex flex-col gap-2">{t16}{<div className="flex flex-col gap-2">{t26}{(has("maxWidth") || has("maxHeight")) && <div className="flex min-w-0 gap-2">{has("maxWidth") ? <StyleLayoutMinMaxInput property="maxWidth" placeholder="none" icon={<MaxWidthIcon className="text-ed-muted-foreground" />} /> : <LayoutAddButton label="Max Width" onClick={() => set("maxWidth", "100%")} />}{has("maxHeight") ? <StyleLayoutMinMaxInput property="maxHeight" placeholder="none" icon={(0, import_jsx_runtime.jsx)(e$14, {
              size: 15,
              className: "text-ed-muted-foreground"
            })} /> : <LayoutAddButton label="Max Height" onClick={() => set("maxHeight", "100%")} />}</div>}{(has("minWidth") || has("minHeight")) && <div className="flex min-w-0 gap-2">{has("minWidth") ? <StyleLayoutMinMaxInput property="minWidth" placeholder="0" icon={(0, import_jsx_runtime.jsx)(r$8, {
              size: 15,
              className: "text-ed-muted-foreground"
            })} /> : <LayoutAddButton label="Min Width" onClick={() => set("minWidth", "0px")} />}{has("minHeight") ? <StyleLayoutMinMaxInput property="minHeight" placeholder="0" icon={(0, import_jsx_runtime.jsx)(e$15, {
              size: 15,
              className: "text-ed-muted-foreground"
            })} /> : <LayoutAddButton label="Min Height" onClick={() => set("minHeight", "0px")} />}</div>}</div>}{isFlex && <div className="flex min-w-0 gap-2">{<div className="flex min-w-0 flex-1 flex-col gap-2">{<LayoutFieldLabel>Alignment</LayoutFieldLabel>}{<div className={cn$2("grid h-[60px] w-full grid-cols-3 grid-rows-3 overflow-hidden bg-ed-muted py-1", "rounded-[5px]")}>{[0, 1, 2].map(row_4 => <>{[0, 1, 2].map(col_4 => {
                  const isActive = alignRow === row_4 && alignCol === col_4;
                  const isDistributedItem = !!distribution && (isColumnDirection ? col_4 === alignCol : row_4 === alignRow);
                  return <button key={`${row_4}-${col_4}`} type="button" aria-label={t("styles.setAlignment")} onClick={() => {
                    if (isDistributedItem) return;
                    if (distribution) setCrossAlignment(row_4, col_4);else setAlignment(row_4, col_4);
                  }} onDoubleClick={() => cycleDistribution(row_4, col_4)} className={cn$2("group/alignment-cell flex h-full w-full items-center justify-center rounded p-0", isDistributedItem || !distribution && isActive ? "text-ed-foreground" : "text-ed-foreground-secondary")}>{<span className="flex size-3.75 shrink-0 items-center justify-center">{distribution && isDistributedItem ? <DistributedItemLine direction={isColumnDirection ? "column" : "row"} index={isColumnDirection ? row_4 : col_4} mode={distribution} /> : isActive ? <FlexAlignmentGlyph direction={isColumnDirection ? "column" : "row"} row={row_4} col={col_4} /> : <>{<span className="size-0.5 rounded-full bg-current opacity-50 group-hover/alignment-cell:hidden" />}{<span className="hidden text-ed-foreground-secondary group-hover/alignment-cell:flex">{<AlignmentCellGlyph direction={isColumnDirection ? "column" : "row"} row={row_4} col={col_4} distribution={distribution} />}</span>}</>}</span>}</button>;
                })}</>)}</div>}</div>}{<div className="flex min-w-0 flex-1 flex-col gap-2">{<div className="flex min-w-0 flex-col gap-2 shrink-0">{<LayoutFieldLabel>Gap</LayoutFieldLabel>}{<FlexMainAxisGapInput />}{isFlexWrapped && <StyleLayoutInput property={crossGapProperty} modeOptions={[{
                value: "normal",
                label: "Normal"
              }]} icon={<GapIcon className={cn$2("size-3.75 shrink-0", isColumnDirection && "rotate-90")} />} />}</div>}</div>}</div>}{t33}</div>}</InspectorSection>}{t34}{t35}{t36}{t37}{t38}{t39}{t40}{t41}{t42}{t43}{t46}</StyleOpsContext.Provider>;
}
function _temp15$1(el_8) {
  const d = el_8.styles?.display;
  return d === "flex" || d === "inline-flex";
}
function _temp14$1(p_10) {
  return TEXT_STYLE_KEYS.has(p_10);
}
function _temp13$1(el_7) {
  return el_7.id;
}
function _temp12$1(k_3) {
  return TEXT_STYLE_KEYS.has(k_3);
}
function _temp11$2(el_6) {
  return el_6.id;
}
function _temp10$3(el_5) {
  return el_5.id;
}
function _temp1$3(p_7) {
  return TEXT_STYLE_KEYS.has(p_7);
}
function _temp0$3(el_3) {
  return el_3.id;
}
function _temp9$4(el_2) {
  return el_2.id;
}
function _temp8$4(c) {
  return getTailwindCategory(c) === "text-color";
}
function _temp7$5(el_0) {
  if (!el_0) return "";
  if ("props" in el_0) return String(el_0.props?.className ?? "");
  if (el_0.type === "text") return String(el_0.className ?? "");
  return "";
}
function _temp6$8(item_2) {
  const rect_0 = getCanvasSpaceRect(item_2.id);
  if (!rect_0) return [];
  return [{
    id: item_2.id,
    rect: rect_0,
    position: item_2.canvasPosition ?? {
      x: rect_0.x,
      y: rect_0.y
    }
  }];
}
function _temp5$10(item_1) {
  const rect = getCanvasSpaceRect(item_1.id);
  if (!rect) return [];
  return [{
    id: item_1.id,
    rect,
    position: item_1.canvasPosition ?? {
      x: rect.x,
      y: rect.y
    }
  }];
}
function _temp4$13(classToken) {
  return isFlowLayoutDisplay(parseTailwindClass(classToken)?.display);
}
function _temp3$14(item_0) {
  return FRAME_ALIGNMENT_POSITIONS.has(String(item_0.styles?.position ?? "static"));
}
function _temp2$23(parent_0) {
  return parent_0 !== "ROOT" && parent_0 !== null;
}
function _temp$31(parent) {
  return parent === "ROOT" || parent === null;
}

export { DesignTab };
