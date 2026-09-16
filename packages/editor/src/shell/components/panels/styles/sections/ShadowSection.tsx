/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/sections/ShadowSection.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { parseShadowValues, replaceFilterFunctions, serializeBoxShadows, serializeShadowValue } from "../../../../utils/effectValues";
import { classifyEffect } from "../../../../utils/effects";
import { useStyleOps } from "../StyleOpsContext";
import { ColorRow } from "../inputs/ColorRow";
import { LayoutValueInput } from "../inputs/LayoutValueInput";
import { InspectorDropdown } from "../inputs/parts/InspectorDropdown";
import { IconBtn, InspectorControlAction, InspectorControlShell, InspectorRailRow } from "../primitives";
import { translateInspectorText } from "../inspectorCopy";
import { InspectorSection } from "./InspectorSection";
import { COMMENTED_STYLES_KEY, parseCommentedStyles, serializeCommentedStyles } from "@bingo/compiler";
import { BoxShadowIcon, CaretDownIcon, DropShadowIcon, EyeClosedIcon, EyeIcon, InnerShadowIcon, MinusIcon, PlusIcon, Popover, PopoverContent, PopoverTrigger, ShadowSoftnessIcon, ShadowSpreadIcon, XIcon } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Repeatable shadow rows with a left-side property editor popover. */
var DROP_SHADOW_FUNCTION = new Set(["drop-shadow"]);
var SHADOW_TYPES = [{
  value: "drop",
  label: "Drop Shadow",
  icon: DropShadowIcon
}, {
  value: "box",
  label: "Box Shadow",
  icon: BoxShadowIcon
}, {
  value: "inner",
  label: "Inner Shadow",
  icon: InnerShadowIcon
}];
var nextShadowRowId = 0;
function allocateShadowRowId() {
  nextShadowRowId += 1;
  return nextShadowRowId;
}
function parseShadowRows(boxShadowValue, filterValue, commentedValue) {
  const values = parseShadowValues(boxShadowValue, filterValue).map(value => ({
    ...value,
    enabled: true
  }));
  const hidden = parseCommentedStyles(commentedValue).filter(entry => entry.group === "shadow").sort((a, b) => a.index - b.index);
  for (const entry of hidden) {
    const parsed = parseShadowValues(entry.property === "boxShadow" ? entry.value : "", entry.property === "filter" ? entry.value : "")[0];
    if (!parsed) continue;
    values.splice(Math.min(entry.index, values.length), 0, {
      ...parsed,
      enabled: false
    });
  }
  return values.map(value => ({
    ...value,
    id: allocateShadowRowId()
  }));
}
function defaultShadow(kind = "drop") {
  if (kind === "drop") return {
    kind,
    x: "0px",
    y: "4px",
    blur: "6px",
    spread: "0px",
    color: "rgb(0 0 0 / 0.15)"
  };
  if (kind === "inner") return {
    kind,
    x: "0px",
    y: "2px",
    blur: "4px",
    spread: "0px",
    color: "rgb(0 0 0 / 0.08)"
  };
  return {
    kind,
    x: "0px",
    y: "4px",
    blur: "6px",
    spread: "-1px",
    color: "rgb(0 0 0 / 0.1)"
  };
}
function ShadowSection() {
  const $ = (0, import_compiler_runtime.c)(16);
  const { t } = useTranslation("editor");
  const ops = useStyleOps();
  const shadowClasses = ops.elementClassName.split(/\s+/).filter(Boolean).filter(_temp$33);
  const [openId, setOpenId] = import_react.useState(null);
  const boxShadowValue = ops.sourceProps("boxShadow").source === "class" ? shadowClasses.length > 0 ? ops.get("boxShadow") : "" : ops.getExplicit("boxShadow");
  let t0;
  if ($[0] !== ops) {
    t0 = ops.sourceProps("filter").source === "class" ? ops.get("filter") : ops.getExplicit("filter");
    $[0] = ops;
    $[1] = t0;
  } else t0 = $[1];
  const filterValue = t0;
  let t1;
  if ($[2] !== ops) {
    t1 = ops.getExplicit(COMMENTED_STYLES_KEY);
    $[2] = ops;
    $[3] = t1;
  } else t1 = $[3];
  const commentedValue = t1;
  const sourceKey = `${ops.selectedElementId}\n${boxShadowValue}\n${filterValue}\n${commentedValue}`;
  let t2;
  if ($[4] !== boxShadowValue || $[5] !== commentedValue || $[6] !== filterValue) {
    t2 = () => parseShadowRows(boxShadowValue, filterValue, commentedValue);
    $[4] = boxShadowValue;
    $[5] = commentedValue;
    $[6] = filterValue;
    $[7] = t2;
  } else t2 = $[7];
  const [rows, setRows] = import_react.useState(t2);
  const [rowsSourceKey, setRowsSourceKey] = import_react.useState(sourceKey);
  const [writtenKey, setWrittenKey] = import_react.useState(void 0);
  if (sourceKey !== rowsSourceKey) {
    setRowsSourceKey(sourceKey);
    if (writtenKey === `${boxShadowValue}\n${filterValue}\n${commentedValue}`) setWrittenKey(void 0);else {
      setRows(parseShadowRows(boxShadowValue, filterValue, commentedValue));
      setOpenId(null);
    }
  }
  const removeShadowClasses = () => {
    if (shadowClasses.length > 0) ops.removeClass(shadowClasses);
  };
  const write = nextRows => {
    const nextBoxShadow = serializeBoxShadows(nextRows.filter(_temp2$25));
    const dropShadows = nextRows.filter(_temp3$15).map(serializeShadowValue);
    const nextFilter = replaceFilterFunctions(filterValue, DROP_SHADOW_FUNCTION, dropShadows);
    const preservedComments = parseCommentedStyles(commentedValue).filter(_temp4$14);
    const shadowComments = nextRows.flatMap(_temp5$11);
    const nextCommented = [...preservedComments, ...shadowComments];
    const nextCommentedValue = nextCommented.length > 0 ? serializeCommentedStyles(nextCommented) : void 0;
    setRows(nextRows);
    setWrittenKey(`${nextBoxShadow}\n${nextFilter}\n${nextCommentedValue ?? ""}`);
    ops.setMultiple({
      boxShadow: nextBoxShadow || void 0,
      filter: nextFilter || void 0,
      [COMMENTED_STYLES_KEY]: nextCommentedValue
    });
    removeShadowClasses();
  };
  const addShadow = () => {
    const row_2 = {
      ...defaultShadow(),
      id: allocateShadowRowId(),
      enabled: true
    };
    write([...rows, row_2]);
    setOpenId(row_2.id);
  };
  const patchShadow = (id, patch) => write(rows.map(row_3 => row_3.id === id ? {
    ...row_3,
    ...patch
  } : row_3));
  const toggleShadow = id_0 => write(rows.map(row_4 => row_4.id === id_0 ? {
    ...row_4,
    enabled: !row_4.enabled
  } : row_4));
  const removeShadow = id_1 => {
    write(rows.filter(row_5 => row_5.id !== id_1));
    if (openId === id_1) setOpenId(null);
  };
  const addAction = !ops.readOnly ? <IconBtn label={t("styles.addShadow")} onClick={addShadow}>{<PlusIcon />}</IconBtn> : null;
  const T0 = InspectorSection;
  const t3 = true;
  const t4 = "addable";
  const t5 = t("styles.shadow");
  const t6 = rows.length > 0;
  const t7 = false;
  const t8 = "space-y-2";
  const t9 = rows.map(row_6 => {
    const rawTypeLabel = SHADOW_TYPES.find(type_0 => type_0.value === row_6.kind)?.label ?? "Shadow";
    const typeLabel = translateInspectorText(t, rawTypeLabel);
    return <InspectorRailRow key={row_6.id} action={!ops.readOnly ? <IconBtn label={t("styles.removeShadow", { type: typeLabel })} onClick={() => removeShadow(row_6.id)}>{<MinusIcon />}</IconBtn> : null}>{<div className="grid min-w-0 grid-cols-[minmax(0,1fr)_26px] gap-1.5">{<div className={row_6.enabled ? void 0 : "opacity-50"}>{<ShadowRow value={row_6} open={openId === row_6.id} onOpenChange={open => setOpenId(open ? row_6.id : null)} onChange={patch_0 => patchShadow(row_6.id, patch_0)} readOnly={ops.readOnly} />}</div>}{!ops.readOnly && <IconBtn label={t(row_6.enabled ? "styles.hideShadow" : "styles.showShadow", { type: typeLabel })} active={!row_6.enabled} onClick={() => toggleShadow(row_6.id)}>{row_6.enabled ? <EyeIcon /> : <EyeClosedIcon />}</IconBtn>}</div>}</InspectorRailRow>;
  });
  let t10;
  if ($[8] !== t9) {
    t10 = <div className={t8}>{t9}</div>;
    $[8] = t9;
    $[9] = t10;
  } else t10 = $[9];
  let t11;
  if (true) {
    t11 = <T0 reserveActionRail={t3} variant={t4} title={t5} isSet={t6} onAdd={addShadow} optimisticOpenOnAdd={t7} collapsedAction={addAction} action={addAction}>{t10}</T0>;
    $[10] = T0;
    $[11] = addAction;
    $[12] = addShadow;
    $[13] = t10;
    $[14] = t6;
    $[15] = t11;
  } else t11 = $[15];
  return t11;
}
function _temp5$11(row_1, index) {
  return row_1.enabled ? [] : [{
    group: "shadow",
    index,
    property: row_1.kind === "drop" ? "filter" : "boxShadow",
    value: serializeShadowValue(row_1)
  }];
}
function _temp4$14(entry) {
  return entry.group !== "shadow";
}
function _temp3$15(row_0) {
  return row_0.enabled && row_0.kind === "drop";
}
function _temp2$25(row) {
  return row.enabled;
}
function _temp$33(className) {
  const type = classifyEffect(className);
  return type === "shadow" || type === "shadow-color";
}
function ShadowRow(t0) {
  const $ = (0, import_compiler_runtime.c)(82);
  const { t } = useTranslation("editor");
  const {
    value,
    open,
    onOpenChange,
    onChange,
    readOnly
  } = t0;
  let t1;
  if ($[0] !== value) {
    t1 = SHADOW_TYPES.find(option => option.value === value.kind);
    $[0] = value;
    $[1] = t1;
  } else t1 = $[1];
  const type = t1;
  const translatedTypeLabel = translateInspectorText(t, type.label);
  const ShadowTypeIcon = type.icon;
  let t2;
  if ($[2] !== ShadowTypeIcon) {
    t2 = <ShadowTypeIcon className="size-4 shrink-0 text-ed-inspector-chrome" />;
    $[2] = ShadowTypeIcon;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if (true) {
    t3 = <span className="min-w-0 flex-1 truncate text-left">{translatedTypeLabel}</span>;
    $[4] = translatedTypeLabel;
    $[5] = t3;
  } else t3 = $[5];
  let t4;
  if ($[6] !== readOnly) {
    t4 = !readOnly && <CaretDownIcon className="shrink-0 text-ed-inspector-chrome" />;
    $[6] = readOnly;
    $[7] = t4;
  } else t4 = $[7];
  let t5;
  if ($[8] !== t2 || $[9] !== t3 || $[10] !== t4) {
    t5 = <>{t2}{t3}{t4}</>;
    $[8] = t2;
    $[9] = t3;
    $[10] = t4;
    $[11] = t5;
  } else t5 = $[11];
  const triggerContent = t5;
  if (readOnly) {
    let t6;
    if ($[12] !== triggerContent) {
      t6 = <InspectorControlShell>{<span className="flex min-w-0 flex-1 items-center gap-1.5 px-1 text-[11px]">{triggerContent}</span>}</InspectorControlShell>;
      $[12] = triggerContent;
      $[13] = t6;
    } else t6 = $[13];
    return t6;
  }
  let t6;
  if ($[14] !== triggerContent) {
    t6 = <PopoverTrigger asChild={true}>{<InspectorControlAction className="min-w-0 flex-1 justify-start gap-1.5 px-1 text-ed-inspector-value hover:text-ed-inspector-value">{triggerContent}</InspectorControlAction>}</PopoverTrigger>;
    $[14] = triggerContent;
    $[15] = t6;
  } else t6 = $[15];
  let t7;
  if ($[16] !== open || $[17] !== t6) {
    t7 = <InspectorControlShell active={open}>{t6}</InspectorControlShell>;
    $[16] = open;
    $[17] = t6;
    $[18] = t7;
  } else t7 = $[18];
  let t8;
  if (true) {
    t8 = <span className="text-[11px] font-medium text-ed-foreground">{t("styles.shadowProperties")}</span>;
    $[19] = t8;
  } else t8 = $[19];
  let t9;
  if ($[20] !== onOpenChange) {
    t9 = () => onOpenChange(false);
    $[20] = onOpenChange;
    $[21] = t9;
  } else t9 = $[21];
  let t10;
  if ($[22] === Symbol.for("react.memo_cache_sentinel")) {
    t10 = <XIcon />;
    $[22] = t10;
  } else t10 = $[22];
  let t11;
  if (true) {
    t11 = <div className="flex items-center justify-between">{t8}{<IconBtn label={t("styles.closeShadowEditor")} onClick={t9}>{t10}</IconBtn>}</div>;
    $[23] = t9;
    $[24] = t11;
  } else t11 = $[24];
  let t12;
  if ($[25] !== ShadowTypeIcon) {
    t12 = <ShadowTypeIcon className="size-4 shrink-0 text-ed-inspector-chrome" />;
    $[25] = ShadowTypeIcon;
    $[26] = t12;
  } else t12 = $[26];
  let t13;
  if (true) {
    t13 = <span className="min-w-0 truncate">{translatedTypeLabel}</span>;
    $[27] = translatedTypeLabel;
    $[28] = t13;
  } else t13 = $[28];
  let t14;
  if ($[29] !== t12 || $[30] !== t13) {
    t14 = <span className="flex min-w-0 items-center gap-1.5">{t12}{t13}</span>;
    $[29] = t12;
    $[30] = t13;
    $[31] = t14;
  } else t14 = $[31];
  const t15 = value.kind;
  let t16;
  if (true) {
    t16 = SHADOW_TYPES.map(option => ({ value: option.value, label: translateInspectorText(t, option.label) }));
    $[32] = t16;
  } else t16 = $[32];
  let t17;
  if ($[33] !== onChange || $[34] !== value.spread) {
    t17 = next => {
      const kind = next;
      onChange({
        kind,
        spread: kind === "drop" ? "0px" : value.spread
      });
    };
    $[33] = onChange;
    $[34] = value.spread;
    $[35] = t17;
  } else t17 = $[35];
  let t18;
  if (true) {
    t18 = <ShadowField label={t("styles.type")}>{<InspectorDropdown label={t("styles.shadowType")} value={t14} selectedValue={t15} options={t16} onValueChange={t17} />}</ShadowField>;
    $[36] = t14;
    $[37] = t17;
    $[38] = value.kind;
    $[39] = t18;
  } else t18 = $[39];
  let t19;
  if ($[40] === Symbol.for("react.memo_cache_sentinel")) {
    t19 = <span aria-hidden="true" className="flex size-4 items-center justify-center text-[10px] font-medium leading-none">X</span>;
    $[40] = t19;
  } else t19 = $[40];
  let t20;
  if ($[41] !== onChange) {
    t20 = x => onChange({
      x
    });
    $[41] = onChange;
    $[42] = t20;
  } else t20 = $[42];
  let t21;
  if (true) {
    t21 = <ShadowLengthField label="X" icon={t19} value={value.x} onChange={t20} />;
    $[43] = t20;
    $[44] = value.x;
    $[45] = t21;
  } else t21 = $[45];
  let t22;
  if ($[46] === Symbol.for("react.memo_cache_sentinel")) {
    t22 = <span aria-hidden="true" className="flex size-4 items-center justify-center text-[10px] font-medium leading-none">Y</span>;
    $[46] = t22;
  } else t22 = $[46];
  let t23;
  if ($[47] !== onChange) {
    t23 = y => onChange({
      y
    });
    $[47] = onChange;
    $[48] = t23;
  } else t23 = $[48];
  let t24;
  if (true) {
    t24 = <ShadowLengthField label="Y" icon={t22} value={value.y} onChange={t23} />;
    $[49] = t23;
    $[50] = value.y;
    $[51] = t24;
  } else t24 = $[51];
  let t25;
  if ($[52] === Symbol.for("react.memo_cache_sentinel")) {
    t25 = <ShadowSoftnessIcon />;
    $[52] = t25;
  } else t25 = $[52];
  let t26;
  if ($[53] !== onChange) {
    t26 = blur => onChange({
      blur
    });
    $[53] = onChange;
    $[54] = t26;
  } else t26 = $[54];
  let t27;
  if (true) {
    t27 = <ShadowLengthField label={t("styles.blur")} icon={t25} value={value.blur} min={0} onChange={t26} />;
    $[55] = t26;
    $[56] = value.blur;
    $[57] = t27;
  } else t27 = $[57];
  let t28;
  if (true) {
    t28 = value.kind !== "drop" && <ShadowLengthField label={t("styles.spread")} icon={<ShadowSpreadIcon />} value={value.spread} onChange={spread => onChange({
      spread
    })} />;
    $[58] = onChange;
    $[59] = value.kind;
    $[60] = value.spread;
    $[61] = t28;
  } else t28 = $[61];
  let t29;
  if ($[62] !== t21 || $[63] !== t24 || $[64] !== t27 || $[65] !== t28) {
    t29 = <div className="grid grid-cols-2 gap-2">{t21}{t24}{t27}{t28}</div>;
    $[62] = t21;
    $[63] = t24;
    $[64] = t27;
    $[65] = t28;
    $[66] = t29;
  } else t29 = $[66];
  let t30;
  if ($[67] !== onChange) {
    t30 = color => onChange({
      color
    });
    $[67] = onChange;
    $[68] = t30;
  } else t30 = $[68];
  let t31;
  if (true) {
    t31 = <ShadowField label={t("styles.color")}>{<ColorRow label={t("styles.shadowColor")} hideLabel={true} value={value.color} onChange={t30} cssProperty="color" />}</ShadowField>;
    $[69] = t30;
    $[70] = value.color;
    $[71] = t31;
  } else t31 = $[71];
  let t32;
  if ($[72] !== t11 || $[73] !== t18 || $[74] !== t29 || $[75] !== t31) {
    t32 = <PopoverContent side="left" align="start" sideOffset={20} className="w-64 space-y-3 p-2.5" onOpenAutoFocus={_temp6$9}>{t11}{t18}{t29}{t31}</PopoverContent>;
    $[72] = t11;
    $[73] = t18;
    $[74] = t29;
    $[75] = t31;
    $[76] = t32;
  } else t32 = $[76];
  let t33;
  if ($[77] !== onOpenChange || $[78] !== open || $[79] !== t32 || $[80] !== t7) {
    t33 = <Popover open={open} onOpenChange={onOpenChange} modal={false}>{t7}{t32}</Popover>;
    $[77] = onOpenChange;
    $[78] = open;
    $[79] = t32;
    $[80] = t7;
    $[81] = t33;
  } else t33 = $[81];
  return t33;
}
function _temp7$6(t0) {
  const {
    value: value_0,
    label
  } = t0;
  return {
    value: value_0,
    label
  };
}
function _temp6$9(event) {
  return event.preventDefault();
}
function ShadowLengthField(t0) {
  const $ = (0, import_compiler_runtime.c)(8);
  const {
    label,
    icon,
    value,
    min,
    onChange
  } = t0;
  let t1;
  if ($[0] !== icon || $[1] !== min || $[2] !== onChange || $[3] !== value) {
    t1 = <LayoutValueInput icon={icon} value={value} onChange={onChange} placeholder="0" unit="px" min={min} ariaLabel={label} />;
    $[0] = icon;
    $[1] = min;
    $[2] = onChange;
    $[3] = value;
    $[4] = t1;
  } else t1 = $[4];
  let t2;
  if ($[5] !== label || $[6] !== t1) {
    t2 = <ShadowField label={label}>{t1}</ShadowField>;
    $[5] = label;
    $[6] = t1;
    $[7] = t2;
  } else t2 = $[7];
  return t2;
}
function ShadowField(t0) {
  const $ = (0, import_compiler_runtime.c)(3);
  const {
    label,
    children
  } = t0;
  let t1;
  if ($[0] !== children || $[1] !== label) {
    t1 = <div role="group" aria-label={label} className="min-w-0">{children}</div>;
    $[0] = children;
    $[1] = label;
    $[2] = t1;
  } else t1 = $[2];
  return t1;
}

export { ShadowSection };
