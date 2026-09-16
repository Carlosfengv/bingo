/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/inputs/ColorPickerPopover.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { useAssetResolver } from "../../../../../shared/contexts/AssetContext";
import { useUploadImage } from "../../../../../shared/hooks/useUploadImage";
import { fileToUrl } from "../../../../../shared/utils/clipboard";
import { colorToHex } from "../../../../utils/colorMath";
import { defaultGradient, parseFill, serializeFill } from "../../../../utils/fillValue";
import { IconBtn, InspectorControlInput, InspectorControlShell, releaseInspectorControlFocus } from "../primitives";
import { translateInspectorText } from "../inspectorCopy";
import { ClassPickerContent } from "./ClassPickerContent";
import { GradientEditor } from "./GradientEditor";
import { SolidColorPicker } from "./SolidColorPicker";
import { InspectorDropdown } from "./parts/InspectorDropdown";
import { GradientIcon, ImageIcon, PopoverContent, SpinnerIcon, Tabs, TabsContent, TabsList, TabsTrigger, Tooltip, UploadIcon, XIcon, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import { SquareLogoIcon as e$5 } from "@phosphor-icons/react/dist/icons/SquareLogo";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import { toast } from "sonner";

/**
* The tabbed fill popover shared by ColorRow: a **Custom** tab with a fill-type
* row (Solid / Gradient / Image) over the matching editor — the custom
* {@link SolidColorPicker}, the {@link GradientEditor}, or an image URL
* field — followed by an "On this page" swatch grid sourced from the Tailwind
* palette. A **Libraries** tab exposes the searchable Tailwind color-class
* palette (ClassPickerContent). Mirrors the FontFamilyPicker's Custom/Libraries
* model. Available fill kinds are caller-controlled (`allowedKinds`).
*/
var FILL_TYPES = [{
  kind: "solid",
  label: "Solid",
  Icon: e$5
}, {
  kind: "gradient",
  label: "Gradient",
  Icon: GradientIcon
}, {
  kind: "image",
  label: "Image",
  Icon: ImageIcon
}];
/** First stop color of a gradient, or the solid color, as a seed. */
function seedColor(fill, resolvedSolid) {
  if (fill.kind === "gradient") return fill.stops[0]?.color ?? "#000000";
  if (fill.kind === "solid") return resolvedSolid || fill.color || "#000000";
  return resolvedSolid || "#000000";
}
var recentColors = [];
var SIZE_OPTIONS = [{
  label: "Cover",
  value: "cover"
}, {
  label: "Contain",
  value: "contain"
}, {
  label: "Fill",
  value: "100% 100%"
}, {
  label: "Auto",
  value: "auto"
}];
var POSITION_OPTIONS = [{
  label: "Center",
  value: "center"
}, {
  label: "Top",
  value: "top"
}, {
  label: "Bottom",
  value: "bottom"
}, {
  label: "Left",
  value: "left"
}, {
  label: "Right",
  value: "right"
}, {
  label: "Top left",
  value: "top left"
}, {
  label: "Top right",
  value: "top right"
}, {
  label: "Bottom left",
  value: "bottom left"
}, {
  label: "Bottom right",
  value: "bottom right"
}];
var REPEAT_OPTIONS = [{
  label: "No repeat",
  value: "no-repeat"
}, {
  label: "Repeat",
  value: "repeat"
}, {
  label: "Repeat X",
  value: "repeat-x"
}, {
  label: "Repeat Y",
  value: "repeat-y"
}];
function ImageConfigRow(t0) {
  const $ = (0, import_compiler_runtime.c)(20);
  const { t } = useTranslation("editor");
  const {
    label,
    value,
    fallback,
    options,
    onChange
  } = t0;
  const localizedLabel = translateInspectorText(t, label);
  const current = value ?? fallback;
  let t1;
  if ($[0] !== current || $[1] !== options) {
    let t2;
    if ($[3] !== current) {
      t2 = option => option.value === current;
      $[3] = current;
      $[4] = t2;
    } else t2 = $[4];
    t1 = options.find(t2);
    $[0] = current;
    $[1] = options;
    $[2] = t1;
  } else t1 = $[2];
  const currentOption = t1;
  const activeLabel = currentOption?.label ?? "Custom";
  let t2;
  if ($[5] !== current || $[6] !== currentOption || $[7] !== options) {
    t2 = currentOption ? options : [{
      value: current,
      label: "Custom",
      disabled: true
    }, ...options];
    $[5] = current;
    $[6] = currentOption;
    $[7] = options;
    $[8] = t2;
  } else t2 = $[8];
  const menuOptions = t2;
  let t3;
  if ($[9] !== localizedLabel) {
    t3 = <span className="text-[12px] text-ed-foreground">{localizedLabel}</span>;
    $[9] = localizedLabel;
    $[10] = t3;
  } else t3 = $[10];
  let t4;
  if ($[11] !== activeLabel || $[12] !== current || $[13] !== label || $[14] !== menuOptions || $[15] !== onChange) {
    t4 = <InspectorDropdown label={label} value={activeLabel} className="min-w-[104px]" selectedValue={current} options={menuOptions} onValueChange={onChange} />;
    $[11] = activeLabel;
    $[12] = current;
    $[13] = label;
    $[14] = menuOptions;
    $[15] = onChange;
    $[16] = t4;
  } else t4 = $[16];
  let t5;
  if ($[17] !== t3 || $[18] !== t4) {
    t5 = <div className="flex items-center justify-between gap-2">{t3}{t4}</div>;
    $[17] = t3;
    $[18] = t4;
    $[19] = t5;
  } else t5 = $[19];
  return t5;
}
function ColorPickerPopover(t0) {
  const $ = (0, import_compiler_runtime.c)(47);
  const { t } = useTranslation("editor");
  const {
    value,
    resolvedSolid,
    onChange,
    cssProperty,
    sourceClass,
    suggestions,
    onSelectClass,
    onClose,
    allowedKinds: t1,
    defaultTab: t2,
    width: t3,
    imageConfig,
    onChangeImageConfig
  } = t0;
  const allowedKinds = t1 === void 0 ? ["solid"] : t1;
  const defaultTab = t2 === void 0 ? "custom" : t2;
  const width = t3 === void 0 ? "w-[250px]" : t3;
  const fill = parseFill(value || resolvedSolid);
  let t4;
  if ($[0] !== onChange) {
    t4 = next => onChange(serializeFill(next), next.kind);
    $[0] = onChange;
    $[1] = t4;
  } else t4 = $[1];
  const emit = t4;
  const uploadImage = useUploadImage();
  const resolveAsset = useAssetResolver();
  const fileInputRef = import_react.useRef(null);
  const [uploading, setUploading] = import_react.useState(false);
  let t5;
  if ($[2] !== emit || $[3] !== uploadImage) {
    t5 = async file => {
      setUploading(true);
      const result = await fileToUrl(file, uploadImage);
      setUploading(false);
      if (result.error || !result.src) {
        toast.error(t("styles.imageUploadFailed"), result.errorMessage ? { description: result.errorMessage } : void 0);
        return;
      }
      emit({
        kind: "image",
        url: result.src
      });
    };
    $[2] = emit;
    $[3] = uploadImage;
    $[4] = t5;
  } else t5 = $[4];
  const handleImageFile = t5;
  const switchKind = kind => {
    if (kind === fill.kind) return;
    if (kind === "solid") emit({
      kind: "solid",
      color: seedColor(fill, resolvedSolid)
    });else if (kind === "gradient") emit(defaultGradient(seedColor(fill, resolvedSolid)));else emit({
      kind: "image",
      url: fill.kind === "image" ? fill.url : ""
    });
  };
  let swatches;
  if ($[5] !== suggestions) {
    swatches = [];
    const seenSwatches = new Set();
    for (const c of [...recentColors, ...suggestions.map(_temp$41)]) {
      const key = (c || "").toLowerCase();
      if (!key || seenSwatches.has(key)) continue;
      seenSwatches.add(key);
      swatches.push(c);
      if (swatches.length >= 28) break;
    }
    $[5] = suggestions;
    $[6] = swatches;
  } else swatches = $[6];
  const fillTypeButton = t6 => {
    const {
      kind: kind_0,
      label,
      Icon
    } = t6;
    const active = fill.kind === kind_0;
    return <IconBtn key={kind_0} label={label} active={active} disabled={!allowedKinds.includes(kind_0)} onClick={() => switchKind(kind_0)}>{<Icon />}</IconBtn>;
  };
  const T0 = PopoverContent;
  const t7 = "start";
  const t8 = "left";
  const t9 = 20;
  const t10 = -12;
  let t11;
  if ($[7] !== width) {
    t11 = cn$2(width, "rounded-xl flex flex-col gap-3");
    $[7] = width;
    $[8] = t11;
  } else t11 = $[8];
  const t12 = _temp2$31;
  const t13 = releaseInspectorControlFocus;
  const T1 = Tabs;
  const t14 = onSelectClass ? defaultTab : "custom";
  let t15;
  if (true) {
    t15 = <TabsTrigger value="custom" className="flex-1">{t("styles.custom")}</TabsTrigger>;
    $[9] = t15;
  } else t15 = $[9];
  let t16;
  if (true) {
    t16 = onSelectClass && <TabsTrigger value="libraries" className="flex-1">{t("styles.libraries")}</TabsTrigger>;
    $[10] = onSelectClass;
    $[11] = t16;
  } else t16 = $[11];
  let t17;
  if ($[12] !== t16) {
    t17 = <TabsList size="xs" className="w-min">{t15}{t16}</TabsList>;
    $[12] = t16;
    $[13] = t17;
  } else t17 = $[13];
  let t18;
  if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
    t18 = <XIcon />;
    $[14] = t18;
  } else t18 = $[14];
  let t19;
  if ($[15] !== onClose) {
    t19 = <IconBtn label="Close" onClick={onClose}>{t18}</IconBtn>;
    $[15] = onClose;
    $[16] = t19;
  } else t19 = $[16];
  let t20;
  if ($[17] !== t17 || $[18] !== t19) {
    t20 = <div className="flex items-center justify-between pt-2 px-2 pb-1 gap-2">{t17}{t19}</div>;
    $[17] = t17;
    $[18] = t19;
    $[19] = t20;
  } else t20 = $[19];
  const T2 = TabsContent;
  const t21 = "custom";
  const t22 = "m-0 flex flex-col";
  const t23 = allowedKinds.length > 1 && <div className="flex items-center gap-0.5 pt-2 px-2 pb-1">{FILL_TYPES.map(fillTypeButton)}</div>;
  const t24 = fill.kind === "gradient" ? <GradientEditor className="p-2" fill={fill} onChange={emit} suggestions={suggestions} cssProperty={cssProperty} /> : fill.kind === "image" ? <div className="flex flex-col gap-2 p-2">{<input ref={fileInputRef} type="file" accept="image/*" hidden={true} onChange={e_0 => {
      const file_0 = e_0.target.files?.[0];
      e_0.target.value = "";
      if (file_0) handleImageFile(file_0);
    }} />}{<button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={fill.url ? {
      backgroundImage: `url("${resolveAsset(fill.url)}")`
    } : void 0} className="h-36 rounded-lg border border-ed-border/50 bg-ed-muted bg-center bg-cover flex items-center justify-center gap-1 text-[12px] text-ed-muted-foreground hover:border-ed-ring overflow-hidden">{uploading ? <SpinnerIcon width={20} height={20} className="animate-spin" /> : !fill.url ? <>{<UploadIcon />} {t("styles.upload")}</> : null}</button>}{<InspectorControlShell>{<InspectorControlInput tooltip="Image URL" value={fill.url} onChange={e_1 => emit({
        kind: "image",
        url: e_1.target.value.trim()
      })} placeholder={t("styles.pasteImageUrl")} className="px-2" />}</InspectorControlShell>}{onChangeImageConfig && <div className="flex flex-col gap-2 pt-1">{<ImageConfigRow label="Resize" value={imageConfig?.size} fallback="cover" options={SIZE_OPTIONS} onChange={size => onChangeImageConfig({
        size
      })} />}{<ImageConfigRow label="Position" value={imageConfig?.position} fallback="center" options={POSITION_OPTIONS} onChange={position => onChangeImageConfig({
        position
      })} />}{<ImageConfigRow label="Repeat" value={imageConfig?.repeat} fallback="no-repeat" options={REPEAT_OPTIONS} onChange={repeat => onChangeImageConfig({
        repeat
      })} />}</div>}</div> : <SolidColorPicker className="pt-2 px-2 pb-1" color={resolvedSolid || (fill.kind === "solid" ? fill.color : "")} onChange={hex => onChange(hex, "solid")} />;
  let t25;
  if ($[20] !== fill.kind || $[21] !== onChange || $[22] !== swatches) {
    t25 = fill.kind === "solid" && swatches.length > 0 && <>{<hr className="my-2" />}{<div className="flex flex-wrap gap-1.5 pt-1 px-2 pb-2">{swatches.map((c_0, i) => <Tooltip key={`${c_0}-${i}`} content={c_0}>{<button type="button" aria-label={c_0} onClick={() => onChange(colorToHex(c_0), "solid")} className="rounded border border-ed-border/40" style={{
            width: 22,
            height: 22,
            backgroundColor: c_0
          }} />}</Tooltip>)}</div>}</>;
    $[20] = fill.kind;
    $[21] = onChange;
    $[22] = swatches;
    $[23] = t25;
  } else t25 = $[23];
  let t26;
  if ($[24] !== T2 || $[25] !== t23 || $[26] !== t24 || $[27] !== t25) {
    t26 = <T2 value={t21} className={t22}>{t23}{t24}{t25}</T2>;
    $[24] = T2;
    $[25] = t23;
    $[26] = t24;
    $[27] = t25;
    $[28] = t26;
  } else t26 = $[28];
  let t27;
  if ($[29] !== cssProperty || $[30] !== onClose || $[31] !== onSelectClass || $[32] !== sourceClass || $[33] !== suggestions) {
    t27 = onSelectClass && <TabsContent value="libraries" className="m-0">{<ClassPickerContent suggestions={suggestions} cssProperty={cssProperty} sourceClass={sourceClass} onSelect={onSelectClass} onClose={onClose} />}</TabsContent>;
    $[29] = cssProperty;
    $[30] = onClose;
    $[31] = onSelectClass;
    $[32] = sourceClass;
    $[33] = suggestions;
    $[34] = t27;
  } else t27 = $[34];
  let t28;
  if ($[35] !== T1 || $[36] !== t14 || $[37] !== t20 || $[38] !== t26 || $[39] !== t27) {
    t28 = <T1 defaultValue={t14}>{t20}{t26}{t27}</T1>;
    $[35] = T1;
    $[36] = t14;
    $[37] = t20;
    $[38] = t26;
    $[39] = t27;
    $[40] = t28;
  } else t28 = $[40];
  let t29;
  if ($[41] !== T0 || $[42] !== t11 || $[43] !== t12 || $[44] !== t13 || $[45] !== t28) {
    t29 = <T0 align={t7} side={t8} sideOffset={t9} alignOffset={t10} className={t11} onOpenAutoFocus={t12} onCloseAutoFocus={t13}>{t28}</T0>;
    $[41] = T0;
    $[42] = t11;
    $[43] = t12;
    $[44] = t13;
    $[45] = t28;
    $[46] = t29;
  } else t29 = $[46];
  return t29;
}
function _temp2$31(e) {
  return e.preventDefault();
}
function _temp$41(s) {
  return s.value;
}

export { ColorPickerPopover };
