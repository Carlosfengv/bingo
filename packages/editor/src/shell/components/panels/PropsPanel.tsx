/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/PropsPanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useAssetResolver } from "../../../shared/contexts/AssetContext";
import { useUploadImage } from "../../../shared/hooks/useUploadImage";
import { fileToUrl } from "../../../shared/utils/clipboard";
import { LUCIDE_PROPS_SCHEMA, PHOSPHOR_PROPS_SCHEMA } from "../../../types/components";
import { PropField, PropRow, handlePropInputKeyDown } from "./props/PropField";
import { IconBtn, InspectorControlAction, InspectorControlInput, InspectorControlShell } from "./styles/primitives";
import { getById, isBingoOwnedDomProp } from "@bingo/compiler";
import { useTranslation } from "@bingo/i18n";
import { PlusIcon, SpinnerIcon, Text$4, UploadIcon, XIcon } from "@bingo/ui";
import { DiamondsFourIcon as r$6 } from "@phosphor-icons/react/dist/icons/DiamondsFour";
import { FileTs as c$10 } from "@phosphor-icons/react/dist/icons/FileTs";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import { toast } from "sonner";

function ElementHeader(t0) {
  const $ = (0, import_compiler_runtime.c)(16);
  const { t } = useTranslation("editor");
  const {
    name,
    kind,
    detail,
    onGoToMain,
    onCreateComponent,
    disabled
  } = t0;
  const isComponent = kind === "component";
  const Icon = isComponent ? c$10 : r$6;
  const tooltipLabel = isComponent ? t("propsPanel.openComponentFile") : t("propsPanel.createComponent");
  const shortcut = isComponent ? "⌃⌥⌘K" : "⌥⌘K";
  const onClick = isComponent ? onGoToMain : kind === "html" ? onCreateComponent : void 0;
  const actionAvailable = !disabled && Boolean(onClick);
  let t1;
  if ($[0] !== name) {
    t1 = <span className="truncate">{name}</span>;
    $[0] = name;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== detail) {
    t2 = detail && <span className="shrink-0 text-ed-muted-foreground/60">/ {detail}</span>;
    $[2] = detail;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== t1 || $[5] !== t2) {
    t3 = <div className="flex min-w-0 items-center gap-1 text-[11px] font-normal leading-6 text-ed-inspector-value">{t1}{t2}</div>;
    $[4] = t1;
    $[5] = t2;
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== Icon || $[8] !== actionAvailable || $[9] !== onClick || $[10] !== shortcut || $[11] !== tooltipLabel) {
    t4 = actionAvailable && <div className="flex h-6 shrink-0 items-center">{<IconBtn label={tooltipLabel} tooltip={<div className="flex items-center gap-2">{<span>{tooltipLabel}</span>}{<span className="opacity-60">{shortcut}</span>}</div>} onClick={onClick}>{<Icon />}</IconBtn>}</div>;
    $[7] = Icon;
    $[8] = actionAvailable;
    $[9] = onClick;
    $[10] = shortcut;
    $[11] = tooltipLabel;
    $[12] = t4;
  } else t4 = $[12];
  let t5;
  if ($[13] !== t3 || $[14] !== t4) {
    t5 = <div className="w-full flex items-center justify-between gap-2 px-3 py-2 border-b border-ed-divider">{t3}{t4}</div>;
    $[13] = t3;
    $[14] = t4;
    $[15] = t5;
  } else t5 = $[15];
  return t5;
}
function normalizePropType(propType) {
  if (!propType) return "";
  return propType.toLowerCase().split("|").map(s => s.trim()).filter(s => s && s !== "undefined" && s !== "null").join("|");
}
function isBooleanType(propType) {
  return normalizePropType(propType) === "boolean";
}
var DEFAULT_ICON_PROPS_SCHEMA = {
  size: {
    type: "number",
    default: 24,
    label: "Size"
  },
  color: {
    type: "color",
    label: "Color"
  }
};
var ICON_PROP_LABEL_KEYS = {
  Size: "size",
  Weight: "weight",
  Color: "color",
  Mirrored: "mirrored",
  "Stroke Width": "strokeWidth",
  "Absolute Stroke": "absoluteStroke"
};
var ICON_WEIGHT_VALUE_KEYS = {
  thin: "thin",
  light: "light",
  regular: "regular",
  bold: "bold",
  fill: "fill",
  duotone: "duotone"
};
function localizedIconPropLabel(t, propName, propConfig) {
  const rawLabel = propConfig.label || propName;
  const key = ICON_PROP_LABEL_KEYS[rawLabel];
  return key ? t(`propsPanel.iconProps.${key}`) : rawLabel;
}
function localizedIconPropOptions(t, propName, options) {
  if (propName !== "weight" || !options) return options;
  return options.map(option => {
    const key = ICON_WEIGHT_VALUE_KEYS[option.value];
    return key ? { ...option, label: t(`propsPanel.iconWeightValues.${key}`) } : option;
  });
}
function getIconPropsSchema(libraryName, config) {
  if (config?.propsSchema) return config.propsSchema;
  if (libraryName.includes("phosphor")) return PHOSPHOR_PROPS_SCHEMA;
  if (libraryName.includes("lucide")) return LUCIDE_PROPS_SCHEMA;
  return DEFAULT_ICON_PROPS_SCHEMA;
}
var htmlPropsSchema = {
  img: [{
    type: "string",
    label: "src"
  }, {
    type: "string",
    label: "alt"
  }, {
    type: "number",
    label: "width"
  }, {
    type: "number",
    label: "height"
  }],
  a: [{
    type: "string",
    label: "href"
  }, {
    type: "string",
    label: "target"
  }, {
    type: "string",
    label: "rel"
  }],
  input: [{
    type: "string",
    label: "type"
  }, {
    type: "string",
    label: "placeholder"
  }, {
    type: "string",
    label: "name"
  }, {
    type: "string",
    label: "value"
  }, {
    type: "boolean",
    label: "disabled"
  }, {
    type: "boolean",
    label: "required"
  }],
  textarea: [{
    type: "string",
    label: "placeholder"
  }, {
    type: "string",
    label: "name"
  }, {
    type: "number",
    label: "rows"
  }, {
    type: "number",
    label: "cols"
  }, {
    type: "boolean",
    label: "disabled"
  }, {
    type: "boolean",
    label: "required"
  }],
  button: [{
    type: "string",
    label: "type"
  }, {
    type: "boolean",
    label: "disabled"
  }],
  video: [{
    type: "string",
    label: "src"
  }, {
    type: "boolean",
    label: "controls"
  }, {
    type: "boolean",
    label: "autoPlay"
  }, {
    type: "boolean",
    label: "loop"
  }, {
    type: "boolean",
    label: "muted"
  }],
  audio: [{
    type: "string",
    label: "src"
  }, {
    type: "boolean",
    label: "controls"
  }, {
    type: "boolean",
    label: "autoPlay"
  }, {
    type: "boolean",
    label: "loop"
  }],
  iframe: [{
    type: "string",
    label: "src"
  }, {
    type: "string",
    label: "title"
  }, {
    type: "number",
    label: "width"
  }, {
    type: "number",
    label: "height"
  }, {
    type: "string",
    label: "sandbox"
  }, {
    type: "string",
    label: "allow"
  }, {
    type: "boolean",
    label: "allowFullScreen"
  }, {
    type: "string",
    label: "loading"
  }, {
    type: "string",
    label: "referrerPolicy"
  }],
  label: [{
    type: "string",
    label: "htmlFor"
  }],
  select: [{
    type: "string",
    label: "name"
  }, {
    type: "string",
    label: "value"
  }, {
    type: "boolean",
    label: "disabled"
  }, {
    type: "boolean",
    label: "required"
  }, {
    type: "boolean",
    label: "multiple"
  }],
  option: [{
    type: "string",
    label: "value"
  }, {
    type: "boolean",
    label: "disabled"
  }]
};
/** Props handled elsewhere in the editor — hide from the right-panel props list. */
var PANEL_HIDDEN_PROPS = new Set(["style", "className", "children"]);
function isPanelHiddenProp(key) {
  return PANEL_HIDDEN_PROPS.has(key) || isBingoOwnedDomProp(key);
}
function buildPropStringValues(store, selectedElementId, selectedElementIds, isMultiSelect) {
  if (!selectedElementId && !isMultiSelect) return {};
  const el = selectedElementId ? getById(store, selectedElementId) ?? null : null;
  const allSelected = isMultiSelect ? Array.from(selectedElementIds).map(id => getById(store, id)).filter(Boolean) : [];
  const targetElement = isMultiSelect ? allSelected.find(e => e?.type === "component" || e?.type === "icon" || e?.type === "html") ?? el : el;
  if (!targetElement) return {};
  if (targetElement.type === "webview") return {
    src: targetElement.src ?? "",
    viewportWidth: targetElement.viewportWidth != null ? String(targetElement.viewportWidth) : "",
    viewportHeight: String(targetElement.viewportHeight ?? 600),
    label: targetElement.label ?? ""
  };
  if (targetElement.type !== "component" && targetElement.type !== "icon" && targetElement.type !== "html") return {};
  const currentProps = isMultiSelect && allSelected.length > 1 ? (() => {
    const first = allSelected[0]?.props || {};
    const consensus = {};
    for (const [key, value] of Object.entries(first)) {
      if (isPanelHiddenProp(key)) continue;
      if (allSelected.every(e => {
        const v = e.props?.[key];
        return v === value || String(v ?? "") === String(value ?? "");
      })) consensus[key] = value;
    }
    return consensus;
  })() : targetElement.props || {};
  const stringValues = {};
  Object.entries(currentProps).forEach(([key, value]) => {
    if (isPanelHiddenProp(key)) return;
    stringValues[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
  });
  return stringValues;
}
var COLOR_NAME_RE = /(^|[a-z_])(color|colour|fill|stroke|tint|accent|bg|background)$/i;
var CSS_COLOR_RE = /^#[0-9a-f]{3,8}$|^(rgba?|hsla?|oklch|oklab|color|hwb|lab|lch)\s*\(/i;
var NAMED_CSS_COLORS = new Set(["transparent", "currentcolor", "inherit", "red", "blue", "green", "yellow", "orange", "purple", "pink", "brown", "black", "white", "gray", "grey", "cyan", "magenta", "lime", "navy", "teal", "olive", "maroon", "silver", "gold"]);
function looksLikeCssColor(v) {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;
  if (CSS_COLOR_RE.test(s)) return true;
  if (NAMED_CSS_COLORS.has(s.toLowerCase())) return true;
  return false;
}
function detectColorProp(propName, currentValue, defaultValue) {
  if (COLOR_NAME_RE.test(propName)) {
    if (defaultValue !== void 0 && defaultValue !== "" && !looksLikeCssColor(defaultValue)) return false;
    return true;
  }
  return looksLikeCssColor(defaultValue) || looksLikeCssColor(currentValue);
}
/** Parse a union type string like `"a" | "b" | "c"` into its literal values */
function parseUnionLiterals(typeStr) {
  const parts = typeStr.split("|").map(s => s.trim());
  const literals = [];
  for (const part of parts) {
    if (part === "undefined" || part === "null" || part === "void") continue;
    const match = part.match(/^["'](.*)["']$/);
    if (!match) return null;
    if (match[1] === "") continue;
    literals.push(match[1]);
  }
  return literals.length > 0 ? literals : null;
}
/** Map a scanned component prop type to the PropField control to render. */
function resolveComponentPropKind(propName, propType, currentValue, propDefault) {
  const unionValues = parseUnionLiterals(propType);
  if (unionValues) return {
    kind: "enum",
    options: unionValues
  };
  if (isBooleanType(propType)) return {
    kind: "boolean"
  };
  if (detectColorProp(propName, currentValue, propDefault)) return {
    kind: "color"
  };
  if (normalizePropType(propType) === "number") return {
    kind: "number"
  };
  return {
    kind: "string"
  };
}
/** Map an icon-library schema entry to the PropField control to render. */
function iconPropKind(propConfig) {
  if (propConfig.type === "enum" && propConfig.options) return {
    kind: "enum",
    options: propConfig.options
  };
  if (propConfig.type === "color") return {
    kind: "color"
  };
  if (isBooleanType(propConfig.type)) return {
    kind: "boolean"
  };
  if (propConfig.type === "number") return {
    kind: "number"
  };
  return {
    kind: "string"
  };
}
function componentHasScannedProps(componentName, componentIndex) {
  return componentIndex?.[componentName]?.props !== void 0;
}
var EMPTY_SELECTED_IDS = new Set();
function PropsScanLoading() {
  const $ = (0, import_compiler_runtime.c)(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <div className="flex items-center justify-center px-2 py-4 border-b border-ed-border">{<SpinnerIcon width={14} height={14} className="animate-spin text-ed-muted-foreground" />}</div>;
    $[0] = t0;
  } else t0 = $[0];
  return t0;
}
function PropsPanel(t0) {
  const $ = (0, import_compiler_runtime.c)(183);
  const { t } = useTranslation("editor");
  const {
    selectedElementId,
    selectedElementIds: t1,
    store,
    componentIndex,
    iconLibraries,
    onUpdateElementProps,
    onSetElementPropsTransient,
    onUpdateMultipleElementsProps,
    onReplaceElement,
    onOpenComponent,
    onCreateComponent,
    readOnly: t2,
    scanLoading: t3,
    onRequestPropsScan,
    hideHeader: t4
  } = t0;
  const selectedElementIds = t1 === void 0 ? EMPTY_SELECTED_IDS : t1;
  const readOnly = t2 === void 0 ? false : t2;
  const scanLoading = t3 === void 0 ? false : t3;
  const hideHeader = t4 === void 0 ? false : t4;
  const isMultiSelect = selectedElementIds.size > 1;
  let t5;
  if ($[0] !== isMultiSelect || $[1] !== selectedElementId || $[2] !== selectedElementIds || $[3] !== store) {
    t5 = buildPropStringValues(store, selectedElementId, selectedElementIds, isMultiSelect);
    $[0] = isMultiSelect;
    $[1] = selectedElementId;
    $[2] = selectedElementIds;
    $[3] = store;
    $[4] = t5;
  } else t5 = $[4];
  const storePropValues = t5;
  const [propValues, setPropValues] = (0, import_react.useState)(storePropValues);
  let t6;
  if ($[5] !== isMultiSelect || $[6] !== selectedElementId || $[7] !== selectedElementIds || $[8] !== store) {
    t6 = {
      store,
      selectedElementId,
      selectedElementIds,
      isMultiSelect
    };
    $[5] = isMultiSelect;
    $[6] = selectedElementId;
    $[7] = selectedElementIds;
    $[8] = store;
    $[9] = t6;
  } else t6 = $[9];
  const [propSource, setPropSource] = (0, import_react.useState)(t6);
  const [newAttrName, setNewAttrName] = (0, import_react.useState)("");
  const propsScanRequestedRef = (0, import_react.useRef)(false);
  const [editingProp, setEditingProp] = (0, import_react.useState)(null);
  const uploadImage = useUploadImage();
  const imageFileInputRef = (0, import_react.useRef)(null);
  const [uploadingImage, setUploadingImage] = (0, import_react.useState)(false);
  const assetResolver = useAssetResolver();
  const [srcFieldFocused, setSrcFieldFocused] = (0, import_react.useState)(false);
  if (propSource.store !== store || propSource.selectedElementId !== selectedElementId || propSource.selectedElementIds !== selectedElementIds || propSource.isMultiSelect !== isMultiSelect) {
    setPropSource({
      store,
      selectedElementId,
      selectedElementIds,
      isMultiSelect
    });
    if (editingProp) setPropValues(prev => ({
      ...storePropValues,
      [editingProp]: prev[editingProp] ?? ""
    }));else setPropValues(storePropValues);
  }
  let t7;
  if ($[10] !== isMultiSelect || $[11] !== selectedElementIds || $[12] !== store) {
    t7 = isMultiSelect ? Array.from(selectedElementIds).map(id => getById(store, id)).filter(Boolean) : void 0;
    $[10] = isMultiSelect;
    $[11] = selectedElementIds;
    $[12] = store;
    $[13] = t7;
  } else t7 = $[13];
  const selectedElements = t7;
  let t8;
  if ($[14] !== selectedElementId || $[15] !== selectedElements?.[0] || $[16] !== store) {
    t8 = selectedElementId ? getById(store, selectedElementId) ?? null : selectedElements?.[0] ?? null;
    $[14] = selectedElementId;
    $[15] = selectedElements?.[0];
    $[16] = store;
    $[17] = t8;
  } else t8 = $[17];
  const element = t8;
  let t9;
  if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
    t9 = () => {
      propsScanRequestedRef.current = false;
    };
    $[18] = t9;
  } else t9 = $[18];
  let t10;
  if ($[19] !== componentIndex) {
    t10 = [componentIndex];
    $[19] = componentIndex;
    $[20] = t10;
  } else t10 = $[20];
  (0, import_react.useEffect)(t9, t10);
  let t11;
  let t12;
  if ($[21] !== componentIndex || $[22] !== element || $[23] !== isMultiSelect || $[24] !== onRequestPropsScan || $[25] !== readOnly || $[26] !== scanLoading || $[27] !== selectedElements) {
    t11 = () => {
      if (propsScanRequestedRef.current || scanLoading || readOnly || !onRequestPropsScan) return;
      if (!componentIndex || Object.keys(componentIndex).length === 0) return;
      if (element?.type === "component") {
        if (!componentHasScannedProps(element.componentName, componentIndex)) {
          propsScanRequestedRef.current = true;
          onRequestPropsScan(element.componentName);
        }
        return;
      }
      if (isMultiSelect && selectedElements) {
        const componentElements = selectedElements.filter(_temp$16);
        if (componentElements.length === 0) return;
        const componentName = componentElements[0].componentName;
        if (!componentHasScannedProps(componentName, componentIndex)) {
          propsScanRequestedRef.current = true;
          onRequestPropsScan(componentName);
        }
      }
    };
    t12 = [element, isMultiSelect, selectedElements, componentIndex, scanLoading, readOnly, onRequestPropsScan];
    $[21] = componentIndex;
    $[22] = element;
    $[23] = isMultiSelect;
    $[24] = onRequestPropsScan;
    $[25] = readOnly;
    $[26] = scanLoading;
    $[27] = selectedElements;
    $[28] = t11;
    $[29] = t12;
  } else {
    t11 = $[28];
    t12 = $[29];
  }
  (0, import_react.useEffect)(t11, t12);
  const parsePropValue = _temp2$9;
  let t13;
  if ($[30] === Symbol.for("react.memo_cache_sentinel")) {
    t13 = (propName, value_0) => {
      setEditingProp(propName);
      setPropValues(prev_0 => ({
        ...prev_0,
        [propName]: value_0
      }));
    };
    $[30] = t13;
  } else t13 = $[30];
  const handlePropInput = t13;
  let t14;
  if ($[31] !== element || $[32] !== isMultiSelect || $[33] !== onUpdateElementProps || $[34] !== onUpdateMultipleElementsProps || $[35] !== selectedElementId || $[36] !== selectedElementIds) {
    t14 = (propName_0, value_1, propType_0) => {
      setEditingProp(null);
      setPropValues(prev_1 => ({
        ...prev_1,
        [propName_0]: value_1
      }));
      const parsedValue = parsePropValue(value_1, propType_0);
      if (isMultiSelect && onUpdateMultipleElementsProps) onUpdateMultipleElementsProps(selectedElementIds, currentProps => {
        const newProps = {
          ...currentProps
        };
        if (parsedValue === void 0) delete newProps[propName_0];else newProps[propName_0] = parsedValue;
        return newProps;
      });else if (element && selectedElementId) {
        const newProps_0 = {
          ...element.props
        };
        if (parsedValue === void 0) delete newProps_0[propName_0];else newProps_0[propName_0] = parsedValue;
        onUpdateElementProps(selectedElementId, newProps_0);
      }
    };
    $[31] = element;
    $[32] = isMultiSelect;
    $[33] = onUpdateElementProps;
    $[34] = onUpdateMultipleElementsProps;
    $[35] = selectedElementId;
    $[36] = selectedElementIds;
    $[37] = t14;
  } else t14 = $[37];
  const commitPropValue = t14;
  let t15;
  if (true) {
    t15 = async e => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const loadingId = !isMultiSelect && selectedElementId ? selectedElementId : null;
      const baseProps = loadingId ? {
        ...(element?.props ?? {})
      } : null;
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : void 0;
      if (loadingId && baseProps && onSetElementPropsTransient) {
        const marker = {
          ...baseProps,
          "data-uploading": "true"
        };
        if (previewUrl) marker["data-upload-preview"] = previewUrl;
        onSetElementPropsTransient(loadingId, marker);
      }
      setUploadingImage(true);
      const toastId = toast.loading(t("propsPanel.addingFile", { name: file.name || t("propsPanel.file") }));
      const result = await fileToUrl(file, uploadImage);
      setUploadingImage(false);
      if (result.error) {
        if (loadingId && baseProps) onSetElementPropsTransient?.(loadingId, baseProps);
        toast.error(t("propsPanel.uploadFailed"), {
          id: toastId,
          description: result.errorMessage || void 0
        });
      } else if (result.src) {
        const src = result.src;
        if (loadingId && baseProps) {
          onUpdateElementProps(loadingId, {
            ...baseProps,
            src
          });
          setPropValues(prev_2 => ({
            ...prev_2,
            src
          }));
        } else commitPropValue("src", src);
        toast.dismiss(toastId);
      } else {
        if (loadingId && baseProps) onSetElementPropsTransient?.(loadingId, baseProps);
        toast.dismiss(toastId);
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    $[38] = commitPropValue;
    $[39] = element;
    $[40] = isMultiSelect;
    $[41] = onSetElementPropsTransient;
    $[42] = onUpdateElementProps;
    $[43] = selectedElementId;
    $[44] = uploadImage;
    $[45] = t15;
  } else t15 = $[45];
  const handleImageFileSelected = t15;
  if (!selectedElementId && !isMultiSelect) return null;
  if (!element) return null;
  if (isMultiSelect) {
    let t16;
    let t17;
    if (true) {
      t17 = Symbol.for("react.early_return_sentinel");
      bb0: {
        const iconElements = selectedElements.filter(_temp3$6);
        const componentElements_0 = selectedElements.filter(_temp4$7);
        if (iconElements.length === selectedElements.length && iconElements.length > 0) {
          const libraryName = iconElements[0].library;
          const libraryConfig = iconLibraries?.[libraryName];
          const schema = getIconPropsSchema(libraryName, libraryConfig);
          let t18;
          if (true) {
            t18 = <Text$4 size="sm" weight="semibold">{t("propsPanel.icon")}</Text$4>;
            $[57] = t18;
          } else t18 = $[57];
          const t19 = <div className="flex items-baseline gap-1.5">{t18}{<Text$4 size="xs" variant="tertiary">({t("propsPanel.selectedCount", { count: iconElements.length })})</Text$4>}</div>;
          let t20;
          if ($[58] !== t19) {
            t20 = <div className="p-3 border-b border-ed-border">{t19}</div>;
            $[58] = t19;
            $[59] = t20;
          } else t20 = $[59];
          const t21 = readOnly ? <div className="p-3">{<Text$4 size="xs" variant="tertiary">{t("propsPanel.readOnly")}</Text$4>}</div> : <div className="flex flex-col gap-2 px-3.5 py-2.5">{Object.entries(schema).map(t22 => {
              const [propName_1, propConfig] = t22;
              const values = iconElements.map(el_2 => el_2.props?.[propName_1]);
              const isMixed = new Set(values.map(v => v === void 0 ? String(propConfig.default ?? "") : String(v))).size > 1;
              const currentValue = editingProp === propName_1 ? propValues[propName_1] ?? "" : isMixed ? "" : propValues[propName_1] ?? String(propConfig.default ?? "");
              const {
                kind,
                options
              } = iconPropKind(propConfig);
              return <PropField key={propName_1} label={localizedIconPropLabel(t, propName_1, propConfig)} kind={kind} options={localizedIconPropOptions(t, propName_1, options)} value={currentValue} isMixed={isMixed} placeholder={String(propConfig.default ?? "")} onInput={v_0 => handlePropInput(propName_1, v_0)} onCommit={v_1 => commitPropValue(propName_1, v_1, propConfig.type)} />;
            })}</div>;
          let t23;
          if ($[60] !== t20 || $[61] !== t21) {
            t23 = <div className="border-b border-ed-border">{t20}{t21}</div>;
            $[60] = t20;
            $[61] = t21;
            $[62] = t23;
          } else t23 = $[62];
          t17 = t23;
          break bb0;
        }
        if ($[63] !== commitPropValue || $[64] !== editingProp || $[65] !== propValues || $[66] !== readOnly || $[67] !== selectedElements) {
          const htmlElements = selectedElements.filter(_temp5$4);
          if (htmlElements.length === selectedElements.length && htmlElements.length > 0) {
            if (new Set(htmlElements.map(_temp6$2)).size === 1) {
              const tag = htmlElements[0].tag;
              const propsForTag = htmlPropsSchema[tag] || [];
              if (propsForTag.length > 0 && !readOnly) {
                let t18;
                if (true) {
                  t18 = <Text$4 size="sm" weight="semibold">{t("propsPanel.attributes")}</Text$4>;
                  $[68] = t18;
                } else t18 = $[68];
                const t19 = <div className="flex items-baseline gap-1.5">{t18}{<Text$4 size="xs" variant="tertiary">{"<"}{tag}{"> ("}{htmlElements.length})</Text$4>}</div>;
                let t20;
                if ($[69] !== t19) {
                  t20 = <div className="p-3 border-b border-ed-border">{t19}</div>;
                  $[69] = t19;
                  $[70] = t20;
                } else t20 = $[70];
                const t21 = <div className="flex flex-col gap-2 px-3.5 py-2.5">{propsForTag.map(propConfig_0 => {
                    const propName_2 = propConfig_0.label;
                    const values_0 = htmlElements.map(el_5 => el_5.props?.[propName_2]);
                    const isMixed_0 = new Set(values_0.map(_temp7$1)).size > 1;
                    const currentValue_0 = editingProp === propName_2 ? propValues[propName_2] ?? "" : isMixed_0 ? "" : propValues[propName_2] ?? "";
                    return <PropField key={propName_2} label={propName_2} kind={propConfig_0.type} value={currentValue_0} isMixed={isMixed_0} onInput={v_3 => handlePropInput(propName_2, v_3)} onCommit={v_4 => commitPropValue(propName_2, v_4, propConfig_0.type)} />;
                  })}</div>;
                let t22;
                if ($[71] !== t20 || $[72] !== t21) {
                  t22 = <div className="border-b border-ed-border">{t20}{t21}</div>;
                  $[71] = t20;
                  $[72] = t21;
                  $[73] = t22;
                } else t22 = $[73];
                t17 = t22;
                break bb0;
              }
            }
          }
          $[63] = commitPropValue;
          $[64] = editingProp;
          $[65] = propValues;
          $[66] = readOnly;
          $[67] = selectedElements;
        }
        if (componentElements_0.length === 0) {
          t17 = null;
          break bb0;
        }
        if (new Set(componentElements_0.map(_temp8$1)).size !== 1) {
          let t18;
          if (true) {
            t18 = <div className="p-3">{<Text$4 size="xs" variant="tertiary">{t("propsPanel.mixedSelection", { count: selectedElementIds.size })}</Text$4>}</div>;
            $[74] = selectedElementIds.size;
            $[75] = t18;
          } else t18 = $[75];
          t17 = t18;
          break bb0;
        }
        const componentName_0 = componentElements_0[0].componentName;
        const availableProps = componentIndex?.[componentName_0]?.props || {};
        const editableProps = Object.entries(availableProps).filter(_temp9$1);
        if (editableProps.length === 0 && scanLoading) {
          let t18;
          if ($[76] === Symbol.for("react.memo_cache_sentinel")) {
            t18 = <PropsScanLoading />;
            $[76] = t18;
          } else t18 = $[76];
          t17 = t18;
          break bb0;
        }
        if (editableProps.length === 0) {
          t17 = null;
          break bb0;
        }
        let t18;
        if (true) {
          t18 = <Text$4 size="sm" weight="semibold">{t("propsPanel.props")}</Text$4>;
          $[77] = t18;
        } else t18 = $[77];
        const t19 = <div className="flex items-baseline gap-1.5">{t18}{<Text$4 size="xs" variant="tertiary">{componentName_0} ({componentElements_0.length})</Text$4>}</div>;
        let t20;
        if ($[78] !== t19) {
          t20 = <div className="p-3 border-b border-ed-border">{t19}</div>;
          $[78] = t19;
          $[79] = t20;
        } else t20 = $[79];
        t16 = <div className="border-b border-ed-border">{t20}{readOnly ? <div className="p-3">{<Text$4 size="xs" variant="tertiary">{t("propsPanel.readOnly")}</Text$4>}</div> : <div className="flex flex-col gap-2 px-3.5 py-2.5">{editableProps.map(t21 => {
              const [propName_3, propInfo] = t21;
              const isRequired = propInfo.required;
              const propType_1 = propInfo.type || "string";
              const propDefault = propInfo.default;
              const values_1 = componentElements_0.map(el_7 => el_7.props?.[propName_3]);
              const isMixed_1 = new Set(values_1.map(_temp0$1)).size > 1;
              const currentValue_1 = editingProp === propName_3 ? propValues[propName_3] ?? "" : isMixed_1 ? "" : propValues[propName_3] || "";
              const {
                kind: kind_0,
                options: options_0
              } = resolveComponentPropKind(propName_3, propType_1, currentValue_1, propDefault);
              return <PropField key={propName_3} label={propName_3} required={isRequired} kind={kind_0} options={options_0} value={currentValue_1} isMixed={isMixed_1} placeholder={kind_0 === "string" || kind_0 === "number" ? propType_1 : void 0} onInput={v_6 => handlePropInput(propName_3, v_6)} onCommit={v_7 => commitPropValue(propName_3, v_7, propType_1)} />;
            })}</div>}</div>;
      }
      $[46] = commitPropValue;
      $[47] = componentIndex;
      $[48] = editingProp;
      $[49] = iconLibraries;
      $[50] = propValues;
      $[51] = readOnly;
      $[52] = scanLoading;
      $[53] = selectedElementIds.size;
      $[54] = selectedElements;
      $[55] = t16;
      $[56] = t17;
    } else {
      t16 = $[55];
      t17 = $[56];
    }
    if (t17 !== Symbol.for("react.early_return_sentinel")) return t17;
    return t16;
  }
  if (element.type === "webview") {
    const webviewElement = element;
    let t16;
    if ($[80] !== onReplaceElement || $[81] !== selectedElementId || $[82] !== webviewElement) {
      t16 = patch => {
        if (!onReplaceElement) return;
        setEditingProp(null);
        onReplaceElement(selectedElementId, {
          ...webviewElement,
          ...patch
        });
      };
      $[80] = onReplaceElement;
      $[81] = selectedElementId;
      $[82] = webviewElement;
      $[83] = t16;
    } else t16 = $[83];
    const commitWebview = t16;
    let t17;
    if (true) {
      t17 = <Text$4 size="sm" weight="semibold">{t("propsPanel.livePreview")}</Text$4>;
      $[84] = t17;
    } else t17 = $[84];
    let t18;
    if ($[85] !== webviewElement.src) {
      t18 = <div className="p-3 border-b border-ed-border">{t17}{<Text$4 size="xs" variant="tertiary" className="mt-1">{webviewElement.src}</Text$4>}</div>;
      $[85] = webviewElement.src;
      $[86] = t18;
    } else t18 = $[86];
    const t19 = propValues.src ?? "";
    let t20;
    if ($[87] === Symbol.for("react.memo_cache_sentinel")) {
      t20 = v_8 => handlePropInput("src", v_8);
      $[87] = t20;
    } else t20 = $[87];
    let t21;
    if ($[88] !== commitWebview) {
      t21 = v_9 => {
        if (v_9.trim()) commitWebview({
          src: v_9.trim()
        });
      };
      $[88] = commitWebview;
      $[89] = t21;
    } else t21 = $[89];
    let t22;
    if (true) {
      t22 = <PropField label={t("propsPanel.url")} kind="string" value={t19} placeholder="http://localhost:3000" onInput={t20} onCommit={t21} />;
      $[90] = t19;
      $[91] = t21;
      $[92] = t22;
    } else t22 = $[92];
    const t23 = propValues.viewportWidth ?? "";
    let t24;
    if ($[93] === Symbol.for("react.memo_cache_sentinel")) {
      t24 = v_10 => handlePropInput("viewportWidth", v_10);
      $[93] = t24;
    } else t24 = $[93];
    let t25;
    if ($[94] !== commitWebview || $[95] !== webviewElement.viewportWidth) {
      t25 = v_11 => {
        const n = parseInt(v_11, 10);
        commitWebview({
          viewportWidth: Number.isFinite(n) ? Math.max(200, n) : webviewElement.viewportWidth
        });
      };
      $[94] = commitWebview;
      $[95] = webviewElement.viewportWidth;
      $[96] = t25;
    } else t25 = $[96];
    let t26;
    if (true) {
      t26 = <PropField label={t("propsPanel.width")} kind="number" value={t23} onInput={t24} onCommit={t25} />;
      $[97] = t23;
      $[98] = t25;
      $[99] = t26;
    } else t26 = $[99];
    const t27 = propValues.viewportHeight ?? "";
    let t28;
    if ($[100] === Symbol.for("react.memo_cache_sentinel")) {
      t28 = v_12 => handlePropInput("viewportHeight", v_12);
      $[100] = t28;
    } else t28 = $[100];
    let t29;
    if ($[101] !== commitWebview) {
      t29 = v_13 => {
        const n_0 = parseInt(v_13, 10);
        commitWebview({
          viewportHeight: Number.isFinite(n_0) ? Math.max(200, n_0) : void 0
        });
      };
      $[101] = commitWebview;
      $[102] = t29;
    } else t29 = $[102];
    let t30;
    if (true) {
      t30 = <PropField label={t("propsPanel.height")} kind="number" value={t27} onInput={t28} onCommit={t29} />;
      $[103] = t27;
      $[104] = t29;
      $[105] = t30;
    } else t30 = $[105];
    const t31 = propValues.label ?? "";
    let t32;
    if ($[106] === Symbol.for("react.memo_cache_sentinel")) {
      t32 = v_14 => handlePropInput("label", v_14);
      $[106] = t32;
    } else t32 = $[106];
    let t33;
    if ($[107] !== commitWebview) {
      t33 = v_15 => commitWebview({
        label: v_15 || void 0
      });
      $[107] = commitWebview;
      $[108] = t33;
    } else t33 = $[108];
    let t34;
    if (true) {
      t34 = <PropField label={t("propsPanel.label")} kind="string" value={t31} placeholder={t("propsPanel.autoLabel")} onInput={t32} onCommit={t33} />;
      $[109] = t31;
      $[110] = t33;
      $[111] = t34;
    } else t34 = $[111];
    let t35;
    if ($[112] !== t22 || $[113] !== t26 || $[114] !== t30 || $[115] !== t34) {
      t35 = <div className="flex flex-col gap-2 px-3.5 py-2.5">{t22}{t26}{t30}{t34}</div>;
      $[112] = t22;
      $[113] = t26;
      $[114] = t30;
      $[115] = t34;
      $[116] = t35;
    } else t35 = $[116];
    let t36;
    if ($[117] !== t18 || $[118] !== t35) {
      t36 = <div className="border-b border-ed-border">{t18}{t35}</div>;
      $[117] = t18;
      $[118] = t35;
      $[119] = t36;
    } else t36 = $[119];
    return t36;
  }
  if (element.type !== "component" && element.type !== "icon" && element.type !== "html") return null;
  if (element.type === "icon") {
    const iconElement = element;
    const libraryConfig_0 = iconLibraries?.[iconElement.library];
    let t16;
    let t17;
    let t18;
    let t19;
    if (true) {
      const schema_0 = getIconPropsSchema(iconElement.library, libraryConfig_0);
      t18 = "border-b border-ed-border";
      if ($[130] !== hideHeader || $[131] !== iconElement.iconName || $[132] !== iconElement.library || $[133] !== libraryConfig_0?.displayName) {
        t19 = !hideHeader && <ElementHeader name={iconElement.iconName} kind="icon" detail={libraryConfig_0?.displayName || iconElement.library} />;
        $[130] = hideHeader;
        $[131] = iconElement.iconName;
        $[132] = iconElement.library;
        $[133] = libraryConfig_0?.displayName;
        $[134] = t19;
      } else t19 = $[134];
      t16 = "flex flex-col gap-2 px-3.5 py-2.5 max-h-[300px] overflow-auto";
      t17 = Object.entries(schema_0).map(t20 => {
        const [propName_4, propConfig_1] = t20;
        const currentValue_2 = propValues[propName_4] ?? String(propConfig_1.default ?? "");
        const {
          kind: kind_1,
          options: options_1
        } = iconPropKind(propConfig_1);
        return <PropField key={propName_4} label={localizedIconPropLabel(t, propName_4, propConfig_1)} kind={kind_1} options={localizedIconPropOptions(t, propName_4, options_1)} value={currentValue_2} placeholder={String(propConfig_1.default ?? "")} onInput={v_16 => handlePropInput(propName_4, v_16)} onCommit={v_17 => commitPropValue(propName_4, v_17, propConfig_1.type)} />;
      });
      $[120] = commitPropValue;
      $[121] = hideHeader;
      $[122] = iconElement.iconName;
      $[123] = iconElement.library;
      $[124] = libraryConfig_0;
      $[125] = propValues;
      $[126] = t16;
      $[127] = t17;
      $[128] = t18;
      $[129] = t19;
    } else {
      t16 = $[126];
      t17 = $[127];
      t18 = $[128];
      t19 = $[129];
    }
    let t20;
    if ($[135] !== t16 || $[136] !== t17) {
      t20 = <div className={t16}>{t17}</div>;
      $[135] = t16;
      $[136] = t17;
      $[137] = t20;
    } else t20 = $[137];
    let t21;
    if ($[138] !== t18 || $[139] !== t19 || $[140] !== t20) {
      t21 = <div className={t18}>{t19}{t20}</div>;
      $[138] = t18;
      $[139] = t19;
      $[140] = t20;
      $[141] = t21;
    } else t21 = $[141];
    return t21;
  }
  if (element.type === "html") {
    const tag_0 = element.tag;
    let t16;
    if (true) {
      const propsForTag_0 = htmlPropsSchema[tag_0] || [];
      const schemaKeys = new Set(propsForTag_0.map(_temp1$1));
      const internalProps = new Set(["style", "className", "key", "ref", "children"]);
      const isInternalProp = key_0 => internalProps.has(key_0) || isBingoOwnedDomProp(key_0);
      const customAttrs = Object.entries(element.props || {}).filter(t17 => {
        const [key_1] = t17;
        return !schemaKeys.has(key_1) && !isInternalProp(key_1);
      });
      let t18;
      if ($[156] !== element || $[157] !== newAttrName || $[158] !== onUpdateElementProps || $[159] !== selectedElementId) {
        t18 = () => {
          const name = newAttrName.trim();
          if (!name) return;
          if (element && selectedElementId) onUpdateElementProps(selectedElementId, {
            ...element.props,
            [name]: ""
          });
          setNewAttrName("");
        };
        $[156] = element;
        $[157] = newAttrName;
        $[158] = onUpdateElementProps;
        $[159] = selectedElementId;
        $[160] = t18;
      } else t18 = $[160];
      const handleAddAttr = t18;
      const handleRemoveAttr = attrName => {
        const newProps_1 = {
          ...element.props
        };
        delete newProps_1[attrName];
        onUpdateElementProps(selectedElementId, newProps_1);
      };
      const hasSchemaProps = propsForTag_0.length > 0;
      const hasCustomAttrs = customAttrs.length > 0;
      const showAttrsSection = hasSchemaProps || hasCustomAttrs || !readOnly;
      const t19 = `<${tag_0}>`;
      let t20;
      if ($[161] !== onCreateComponent || $[162] !== readOnly || $[163] !== t19) {
        t20 = <ElementHeader name={t19} kind="html" onCreateComponent={onCreateComponent} disabled={readOnly} />;
        $[161] = onCreateComponent;
        $[162] = readOnly;
        $[163] = t19;
        $[164] = t20;
      } else t20 = $[164];
      t16 = <div>{t20}{showAttrsSection && <div className="flex flex-col w-full px-3.5 py-2.5 gap-2 border-b border-ed-border">{<div className="flex items-center justify-between w-full gap-2">{<Text$4 size="2xs" weight="regular" variant="secondary">{t("propsPanel.attributes")}</Text$4>}</div>}{propsForTag_0.map(propConfig_2 => {
            const propName_5 = propConfig_2.label;
            const currentValue_3 = propValues[propName_5] ?? "";
            if ((tag_0 === "img" || tag_0 === "video") && propName_5 === "src") {
              const isVideo = tag_0 === "video";
              const uploadLabel = isVideo ? t("propsPanel.uploadVideo") : t("propsPanel.uploadImage");
              return <>{currentValue_3.startsWith("data:") && <div className="p-2 bg-ed-muted rounded border border-ed-border">{isVideo ? <video src={currentValue_3} className="max-w-full max-h-24 mx-auto" muted={true} /> : <img src={currentValue_3} alt={t("propsPanel.preview")} className="max-w-full max-h-24 object-contain mx-auto" />}</div>}{<PropRow label={propName_5}>{<InspectorControlShell>{<InspectorControlInput value={srcFieldFocused ? currentValue_3 : currentValue_3 ? assetResolver(currentValue_3) : ""} selectOnFocus={false} onFocus={() => setSrcFieldFocused(true)} onChange={e_0 => handlePropInput(propName_5, e_0.target.value)} onBlur={e_1 => {
                      setSrcFieldFocused(false);
                      commitPropValue(propName_5, e_1.target.value);
                    }} onKeyDown={handlePropInputKeyDown} placeholder="https://..." className="pl-2" />}{!readOnly && <InspectorControlAction aria-label={uploadLabel} title={uploadLabel} disabled={uploadingImage} onClick={() => imageFileInputRef.current?.click()} className="pr-1.5">{uploadingImage ? <SpinnerIcon className="animate-spin" /> : <UploadIcon />}</InspectorControlAction>}</InspectorControlShell>}{<input ref={imageFileInputRef} type="file" accept={isVideo ? "video/*" : "image/*"} className="hidden" onChange={handleImageFileSelected} />}</PropRow>}</>;
            }
            return <PropField key={propName_5} label={propName_5} kind={propConfig_2.type} value={currentValue_3} onInput={v_18 => handlePropInput(propName_5, v_18)} onCommit={v_19 => commitPropValue(propName_5, v_19, propConfig_2.type)} />;
          })}{hasCustomAttrs && <>{hasSchemaProps && <Text$4 size="3xs" weight="medium" variant="tertiary" className="mt-1">{t("propsPanel.customAttributes")}</Text$4>}{customAttrs.map(t21 => {
              const [attrName_0] = t21;
              const currentValue_4 = propValues[attrName_0] ?? "";
              return <PropField key={attrName_0} label={attrName_0} kind="string" value={currentValue_4} readOnly={readOnly} onInput={v_20 => handlePropInput(attrName_0, v_20)} onCommit={v_21 => commitPropValue(attrName_0, v_21)} action={!readOnly ? <button onClick={() => handleRemoveAttr(attrName_0)} aria-label={t("propsPanel.removeAttribute", { name: attrName_0 })} className="shrink-0 rounded p-0.5 text-ed-muted-foreground hover:bg-ed-muted hover:text-ed-foreground">{<XIcon width={10} height={10} />}</button> : void 0} />;
            })}</>}{!readOnly && <div className="flex w-full items-center gap-1.5">{<InspectorControlShell className="flex-1">{<InspectorControlInput value={newAttrName} selectOnFocus={false} onChange={e_2 => setNewAttrName(e_2.target.value)} onKeyDown={e_3 => {
                e_3.stopPropagation();
                if (e_3.nativeEvent.isComposing || e_3.keyCode === 229) return;
                if (e_3.key === "Enter") handleAddAttr();
              }} placeholder="data-theme, role, aria-label..." className="pl-2" />}</InspectorControlShell>}{<IconBtn label={t("propsPanel.addAttribute")} onClick={handleAddAttr} disabled={!newAttrName.trim()}>{<PlusIcon />}</IconBtn>}</div>}</div>}</div>;
      $[142] = assetResolver;
      $[143] = commitPropValue;
      $[144] = element;
      $[145] = handleImageFileSelected;
      $[146] = newAttrName;
      $[147] = onCreateComponent;
      $[148] = onUpdateElementProps;
      $[149] = propValues;
      $[150] = readOnly;
      $[151] = selectedElementId;
      $[152] = srcFieldFocused;
      $[153] = tag_0;
      $[154] = uploadingImage;
      $[155] = t16;
    } else t16 = $[155];
    return t16;
  }
  const componentName_1 = element.componentName;
  const componentInfo_0 = componentIndex?.[componentName_1];
  const componentFilePath = componentInfo_0?.path;
  let t16;
  let t17;
  if (true) {
    const availableProps_0 = componentInfo_0?.props || {};
    const editableProps_0 = Object.entries(availableProps_0).filter(_temp10$1);
    if ($[175] !== componentFilePath || $[176] !== componentName_1 || $[177] !== hideHeader || $[178] !== onOpenComponent) {
      t16 = !hideHeader && <ElementHeader name={componentName_1} kind="component" onGoToMain={componentFilePath && onOpenComponent ? () => onOpenComponent(componentName_1, componentFilePath) : void 0} />;
      $[175] = componentFilePath;
      $[176] = componentName_1;
      $[177] = hideHeader;
      $[178] = onOpenComponent;
      $[179] = t16;
    } else t16 = $[179];
    t17 = scanLoading && editableProps_0.length === 0 ? <PropsScanLoading /> : editableProps_0.length > 0 ? <div className="flex flex-col w-full px-3.5 py-2.5 gap-2 border-b border-ed-border">{editableProps_0.map(t18 => {
        const [propName_6, propInfo_0] = t18;
        const isRequired_0 = propInfo_0.required;
        const propType_2 = propInfo_0.type || "string";
        const propDefault_0 = propInfo_0.default;
        const currentValue_5 = propValues[propName_6] || "";
        const {
          kind: kind_2,
          options: options_2
        } = resolveComponentPropKind(propName_6, propType_2, currentValue_5, propDefault_0);
        return <PropField key={propName_6} label={propName_6} required={isRequired_0} kind={kind_2} options={options_2} value={currentValue_5} placeholder={kind_2 === "string" || kind_2 === "number" ? propType_2 : void 0} onInput={v_22 => handlePropInput(propName_6, v_22)} onCommit={v_23 => commitPropValue(propName_6, v_23, propType_2)} />;
      })}</div> : null;
    $[165] = commitPropValue;
    $[166] = componentFilePath;
    $[167] = componentInfo_0?.props;
    $[168] = componentName_1;
    $[169] = hideHeader;
    $[170] = onOpenComponent;
    $[171] = propValues;
    $[172] = scanLoading;
    $[173] = t16;
    $[174] = t17;
  } else {
    t16 = $[173];
    t17 = $[174];
  }
  let t18;
  if ($[180] !== t16 || $[181] !== t17) {
    t18 = <div>{t16}{t17}</div>;
    $[180] = t16;
    $[181] = t17;
    $[182] = t18;
  } else t18 = $[182];
  return t18;
}
function _temp10$1(t0) {
  const [key_2] = t0;
  return !isPanelHiddenProp(key_2);
}
function _temp1$1(p) {
  return p.label;
}
function _temp0$1(v_5) {
  return v_5 === void 0 ? "" : typeof v_5 === "object" ? JSON.stringify(v_5) : String(v_5);
}
function _temp9$1(t0) {
  const [key] = t0;
  return !isPanelHiddenProp(key);
}
function _temp8$1(el_6) {
  return el_6.componentName;
}
function _temp7$1(v_2) {
  return v_2 === void 0 ? "" : String(v_2);
}
function _temp6$2(el_4) {
  return el_4.tag;
}
function _temp5$4(el_3) {
  return el_3.type === "html";
}
function _temp4$7(el_1) {
  return el_1.type === "component";
}
function _temp3$6(el_0) {
  return el_0.type === "icon";
}
function _temp2$9(value, propType) {
  if (value === "") return;
  const normalized = normalizePropType(propType);
  if (normalized === "number") return Number(value);else if (normalized === "boolean") return value === "true";else if (value.startsWith("{") || value.startsWith("[")) try {
    return JSON.parse(value);
  } catch {
    try {
      return new Function(`return ${value}`)();
    } catch {
      return value;
    }
  } else if (value === "true") return true;else if (value === "false") return false;else if (!isNaN(Number(value))) return Number(value);
  return value;
}
function _temp$16(el) {
  return el.type === "component";
}

export { ElementHeader, PropsPanel };
