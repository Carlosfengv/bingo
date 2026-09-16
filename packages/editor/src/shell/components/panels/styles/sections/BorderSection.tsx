/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/sections/BorderSection.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { BORDER_TAILWIND_CATEGORIES } from "../../../../../shared/utils/tailwindScale";
import { BORDER_KEYS, BORDER_STYLES } from "../../../../constants";
import { useClassesForProperty } from "../../../../hooks/useClassSuggestions";
import { useStyleOps } from "../StyleOpsContext";
import { StyleColorInput } from "../fields/color";
import { StyleLayoutInput } from "../fields/layout";
import { ClassPickerContent } from "../inputs/ClassPickerContent";
import { InspectorDropdown } from "../inputs/parts/InspectorDropdown";
import { translateInspectorText } from "../inspectorCopy";
import { IconBtn, InspectorRailRow } from "../primitives";
import { InspectorSection } from "./InspectorSection";
import { AddVariableIcon, BorderAllIcon, BorderBottomIcon, BorderLeftIcon, BorderRightIcon, BorderTopIcon, BorderWidthIcon, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, MinusIcon, OverflowSettingsIcon, PlusIcon, Popover, PopoverContent, PopoverTrigger } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Border section — up to four independently colored/sized border sides. The
* first border targets every side; adding another converts it to Top + Bottom,
* followed by Left and Right. A shared style selector applies to every defined
* border.
*/
var BORDER_WIDTH_UNITS = ["px", "em", "rem", "ch"];
var SIDE_ORDER = ["top", "bottom", "left", "right"];
var SIDE_OPTIONS = [{
  value: "all",
  label: "All",
  icon: BorderAllIcon
}, {
  value: "top",
  label: "Top",
  icon: BorderTopIcon
}, {
  value: "bottom",
  label: "Bottom",
  icon: BorderBottomIcon
}, {
  value: "left",
  label: "Left",
  icon: BorderLeftIcon
}, {
  value: "right",
  label: "Right",
  icon: BorderRightIcon
}];
var SIDE_PROPS = {
  all: {
    width: "borderWidth",
    color: "borderColor",
    style: "borderStyle",
    shorthand: "border"
  },
  top: {
    width: "borderTopWidth",
    color: "borderTopColor",
    style: "borderTopStyle",
    shorthand: "borderTop"
  },
  bottom: {
    width: "borderBottomWidth",
    color: "borderBottomColor",
    style: "borderBottomStyle",
    shorthand: "borderBottom"
  },
  left: {
    width: "borderLeftWidth",
    color: "borderLeftColor",
    style: "borderLeftStyle",
    shorthand: "borderLeft"
  },
  right: {
    width: "borderRightWidth",
    color: "borderRightColor",
    style: "borderRightStyle",
    shorthand: "borderRight"
  }
};
function BorderSideSelect(t0) {
  const $ = (0, import_compiler_runtime.c)(19);
  const { t } = useTranslation("editor");
  const {
    side,
    usedSides,
    onChange
  } = t0;
  let t1;
  if ($[0] !== side) {
    t1 = SIDE_OPTIONS.find(option => option.value === side);
    $[0] = side;
    $[1] = t1;
  } else t1 = $[1];
  const current = t1;
  const currentLabel = translateInspectorText(t, current.label);
  const CurrentIcon = current.icon;
  let t2;
  if ($[2] !== CurrentIcon) {
    t2 = <CurrentIcon className="shrink-0 text-ed-inspector-chrome" />;
    $[2] = CurrentIcon;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== currentLabel) {
    t3 = <span className="truncate">{currentLabel}</span>;
    $[4] = currentLabel;
    $[5] = t3;
  } else t3 = $[5];
  let t4;
  if ($[6] !== t2 || $[7] !== t3) {
    t4 = <span className="flex min-w-0 items-center gap-1.5">{t2}{t3}</span>;
    $[6] = t2;
    $[7] = t3;
    $[8] = t4;
  } else t4 = $[8];
  let t5;
  if ($[9] !== side || $[10] !== usedSides) {
    t5 = SIDE_OPTIONS.map(option_0 => {
      const occupied = option_0.value === "all" ? side !== "all" && usedSides.size > 1 : option_0.value !== side && usedSides.has(option_0.value);
      return {
        ...option_0,
        disabled: occupied
      };
    });
    $[9] = side;
    $[10] = usedSides;
    $[11] = t5;
  } else t5 = $[11];
  let t6;
  if ($[12] !== onChange) {
    t6 = value => onChange(value);
    $[12] = onChange;
    $[13] = t6;
  } else t6 = $[13];
  let t7;
  if ($[14] !== side || $[15] !== t4 || $[16] !== t5 || $[17] !== t6) {
    t7 = <InspectorDropdown label="Border side" value={t4} selectedValue={side} options={t5} onValueChange={t6} />;
    $[14] = side;
    $[15] = t4;
    $[16] = t5;
    $[17] = t6;
    $[18] = t7;
  } else t7 = $[18];
  return t7;
}
function BorderStyleMenu(t0) {
  const $ = (0, import_compiler_runtime.c)(12);
  const { t } = useTranslation("editor");
  const {
    side,
    value,
    onChange
  } = t0;
  const triggerRef = import_react.useRef(null);
  const localizedSide = translateInspectorText(t, SIDE_OPTIONS.find(option => option.value === side)?.label ?? side);
  const localizedStyle = t(`styles.border${value[0].toUpperCase()}${value.slice(1)}`);
  const t1 = t("styles.borderStyleLabel", { side: localizedSide, style: localizedStyle });
  let t2;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <OverflowSettingsIcon />;
    $[0] = t2;
  } else t2 = $[0];
  let t3;
  if ($[1] !== t1) {
    t3 = <DropdownMenuTrigger asChild={true}>{<IconBtn ref={triggerRef} label={t1}>{t2}</IconBtn>}</DropdownMenuTrigger>;
    $[1] = t1;
    $[2] = t3;
  } else t3 = $[2];
  let t4;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = event => {
      event.preventDefault();
      triggerRef.current?.blur();
    };
    $[3] = t4;
  } else t4 = $[3];
  let t5;
  if (true) {
    t5 = BORDER_STYLES.map(style => <DropdownMenuCheckboxItem key={style} checked={style === value} onCheckedChange={checked => checked && onChange(style)}>{t(`styles.border${style[0].toUpperCase()}${style.slice(1)}`)}</DropdownMenuCheckboxItem>);
    $[4] = onChange;
    $[5] = value;
    $[6] = t5;
  } else t5 = $[6];
  let t6;
  if ($[7] !== t5) {
    t6 = <DropdownMenuContent align="end" className="min-w-[140px]" onCloseAutoFocus={t4}>{t5}</DropdownMenuContent>;
    $[7] = t5;
    $[8] = t6;
  } else t6 = $[8];
  let t7;
  if ($[9] !== t3 || $[10] !== t6) {
    t7 = <DropdownMenu modal={false}>{t3}{t6}</DropdownMenu>;
    $[9] = t3;
    $[10] = t6;
    $[11] = t7;
  } else t7 = $[11];
  return t7;
}
function BorderSection() {
  const $ = (0, import_compiler_runtime.c)(61);
  const {
    hasAny,
    get,
    getExplicit,
    setMultiple,
    clear,
    addClass,
    removeClassesByCategory
  } = useStyleOps();
  const [showLibrary, setShowLibrary] = import_react.useState(false);
  const borderColorSuggestions = useClassesForProperty("borderColor");
  let t0;
  if ($[0] !== hasAny) {
    t0 = side => {
      const props = SIDE_PROPS[side];
      return hasAny(props.width, props.color, props.style, props.shorthand);
    };
    $[0] = hasAny;
    $[1] = t0;
  } else t0 = $[1];
  const sideIsDefined = t0;
  let rows;
  let t1;
  if ($[2] !== hasAny || $[3] !== sideIsDefined) {
    const sideRows = SIDE_ORDER.filter(sideIsDefined);
    const allIsDefined = hasAny(SIDE_PROPS.all.width, SIDE_PROPS.all.color, SIDE_PROPS.all.style, SIDE_PROPS.all.shorthand);
    rows = sideRows.length ? sideRows : allIsDefined ? ["all"] : [];
    t1 = new Set(rows);
    $[2] = hasAny;
    $[3] = sideIsDefined;
    $[4] = rows;
    $[5] = t1;
  } else {
    rows = $[4];
    t1 = $[5];
  }
  const usedSides = t1;
  let t2;
  if ($[6] !== get || $[7] !== getExplicit) {
    t2 = (side_0, key, fallback) => {
      const property = SIDE_PROPS[side_0][key];
      return getExplicit(property) || get(property) || fallback;
    };
    $[6] = get;
    $[7] = getExplicit;
    $[8] = t2;
  } else t2 = $[8];
  const valueFor = t2;
  let t3;
  if ($[9] !== valueFor) {
    t3 = side_1 => ({
      width: valueFor(side_1, "width", "1px"),
      color: valueFor(side_1, "color", "#000000"),
      style: valueFor(side_1, "style", "solid")
    });
    $[9] = valueFor;
    $[10] = t3;
  } else t3 = $[10];
  const valuesFor = t3;
  const writeSide = _temp$39;
  const clearSide = _temp2$29;
  let t4;
  if ($[11] !== rows[0] || $[12] !== rows.length || $[13] !== setMultiple || $[14] !== usedSides || $[15] !== valuesFor) {
    t4 = () => {
      if (rows.length >= 4) return;
      if (rows.length === 0) {
        setMultiple(writeSide("all", {
          width: "1px",
          color: "#000000",
          style: "solid"
        }));
        return;
      }
      if (rows.length === 1 && rows[0] === "all") {
        const values_0 = valuesFor("all");
        setMultiple({
          ...clearSide("all"),
          ...writeSide("top", values_0),
          ...writeSide("bottom", values_0)
        });
        return;
      }
      const nextSide = SIDE_ORDER.find(side_4 => !usedSides.has(side_4));
      if (!nextSide) return;
      const seed = valuesFor(rows[0]);
      setMultiple(writeSide(nextSide, seed));
    };
    $[11] = rows[0];
    $[12] = rows.length;
    $[13] = setMultiple;
    $[14] = usedSides;
    $[15] = valuesFor;
    $[16] = t4;
  } else t4 = $[16];
  const addBorder = t4;
  let t5;
  if ($[17] !== setMultiple) {
    t5 = side_5 => {
      setMultiple(clearSide(side_5));
    };
    $[17] = setMultiple;
    $[18] = t5;
  } else t5 = $[18];
  const removeBorder = t5;
  let t6;
  if ($[19] !== setMultiple || $[20] !== valuesFor) {
    t6 = (from, to) => {
      if (from === to) return;
      const values_1 = valuesFor(from);
      setMultiple({
        ...clearSide(from),
        ...writeSide(to, values_1)
      });
    };
    $[19] = setMultiple;
    $[20] = valuesFor;
    $[21] = t6;
  } else t6 = $[21];
  const changeSide = t6;
  let t7;
  if ($[22] !== addClass || $[23] !== clear) {
    t7 = className => {
      addClass([className, "border"]);
      clear(...BORDER_KEYS);
      setShowLibrary(false);
    };
    $[22] = addClass;
    $[23] = clear;
    $[24] = t7;
  } else t7 = $[24];
  const applySectionClass = t7;
  let t8;
  if ($[25] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = <PopoverTrigger asChild={true}>{<IconBtn label="Apply border class">{<AddVariableIcon />}</IconBtn>}</PopoverTrigger>;
    $[25] = t8;
  } else t8 = $[25];
  let t9;
  if ($[26] === Symbol.for("react.memo_cache_sentinel")) {
    t9 = () => setShowLibrary(false);
    $[26] = t9;
  } else t9 = $[26];
  let t10;
  if ($[27] !== applySectionClass || $[28] !== borderColorSuggestions) {
    t10 = <PopoverContent align="end" className="w-64 p-0" onOpenAutoFocus={_temp3$18}>{<ClassPickerContent suggestions={borderColorSuggestions} cssProperty="borderColor" onSelect={applySectionClass} onClose={t9} />}</PopoverContent>;
    $[27] = applySectionClass;
    $[28] = borderColorSuggestions;
    $[29] = t10;
  } else t10 = $[29];
  let t11;
  if ($[30] !== showLibrary || $[31] !== t10) {
    t11 = <Popover open={showLibrary} onOpenChange={setShowLibrary} modal={false}>{t8}{t10}</Popover>;
    $[30] = showLibrary;
    $[31] = t10;
    $[32] = t11;
  } else t11 = $[32];
  const t12 = rows.length >= 4 ? "All border sides added" : "Add border";
  const t13 = rows.length >= 4;
  let t14;
  if ($[33] === Symbol.for("react.memo_cache_sentinel")) {
    t14 = <PlusIcon />;
    $[33] = t14;
  } else t14 = $[33];
  let t15;
  if ($[34] !== addBorder || $[35] !== t12 || $[36] !== t13) {
    t15 = <IconBtn label={t12} onClick={addBorder} disabled={t13}>{t14}</IconBtn>;
    $[34] = addBorder;
    $[35] = t12;
    $[36] = t13;
    $[37] = t15;
  } else t15 = $[37];
  let t16;
  if ($[38] !== t11 || $[39] !== t15) {
    t16 = <div className="flex items-center gap-1.5">{t11}{t15}</div>;
    $[38] = t11;
    $[39] = t15;
    $[40] = t16;
  } else t16 = $[40];
  const headerActions = t16;
  let t17;
  if ($[41] !== hasAny) {
    t17 = hasAny(...BORDER_KEYS);
    $[41] = hasAny;
    $[42] = t17;
  } else t17 = $[42];
  let t18;
  if ($[43] !== clear || $[44] !== removeClassesByCategory) {
    t18 = () => {
      clear(...BORDER_KEYS);
      removeClassesByCategory([...BORDER_TAILWIND_CATEGORIES]);
    };
    $[43] = clear;
    $[44] = removeClassesByCategory;
    $[45] = t18;
  } else t18 = $[45];
  let t19;
  if ($[46] !== changeSide || $[47] !== removeBorder || $[48] !== rows || $[49] !== setMultiple || $[50] !== usedSides || $[51] !== valueFor) {
    t19 = rows.length > 0 && <div className="flex flex-col gap-2">{rows.map(side_6 => {
        const props_2 = SIDE_PROPS[side_6];
        return <div key={side_6} className="space-y-2">{<InspectorRailRow action={<IconBtn label={`Remove ${side_6} border`} onClick={() => removeBorder(side_6)}>{<MinusIcon />}</IconBtn>}>{<div className="grid min-w-0 grid-cols-2 gap-2">{<StyleLayoutInput property={props_2.width} allowedUnits={BORDER_WIDTH_UNITS} icon={<BorderWidthIcon className="text-ed-inspector-chrome" />} onChange={value => setMultiple({
                [props_2.shorthand]: void 0,
                [props_2.width]: value
              })} />}{<BorderSideSelect side={side_6} usedSides={usedSides} onChange={nextSide_0 => changeSide(side_6, nextSide_0)} />}</div>}</InspectorRailRow>}{<InspectorRailRow action={<BorderStyleMenu side={side_6} value={valueFor(side_6, "style", "none")} onChange={style => setMultiple({
            [props_2.shorthand]: void 0,
            [props_2.style]: style
          })} />}>{<StyleColorInput property={props_2.color} fallbackProperty={side_6 === "all" ? void 0 : "borderColor"} label={`${side_6} border color`} hideLabel={true} onChange={value_0 => setMultiple({
              [props_2.shorthand]: void 0,
              [props_2.color]: value_0
            })} />}</InspectorRailRow>}</div>;
      })}</div>;
    $[46] = changeSide;
    $[47] = removeBorder;
    $[48] = rows;
    $[49] = setMultiple;
    $[50] = usedSides;
    $[51] = valueFor;
    $[52] = t19;
  } else t19 = $[52];
  let t20;
  if ($[53] !== addBorder || $[54] !== applySectionClass || $[55] !== borderColorSuggestions || $[56] !== headerActions || $[57] !== t17 || $[58] !== t18 || $[59] !== t19) {
    t20 = <InspectorSection reserveActionRail={true} variant="addable" title="Border" isSet={t17} onAdd={addBorder} onRemove={t18} action={headerActions} classSuggestions={borderColorSuggestions} cssProperty="borderColor" onSelectClass={applySectionClass}>{t19}</InspectorSection>;
    $[53] = addBorder;
    $[54] = applySectionClass;
    $[55] = borderColorSuggestions;
    $[56] = headerActions;
    $[57] = t17;
    $[58] = t18;
    $[59] = t19;
    $[60] = t20;
  } else t20 = $[60];
  return t20;
}
function _temp3$18(event) {
  return event.preventDefault();
}
function _temp2$29(side_3) {
  const props_1 = SIDE_PROPS[side_3];
  return {
    [props_1.shorthand]: void 0,
    [props_1.width]: void 0,
    [props_1.color]: void 0,
    [props_1.style]: void 0
  };
}
function _temp$39(side_2, values) {
  const props_0 = SIDE_PROPS[side_2];
  return {
    [props_0.shorthand]: void 0,
    [props_0.width]: values.width,
    [props_0.color]: values.color,
    [props_0.style]: values.style
  };
}

export { BorderSection };
