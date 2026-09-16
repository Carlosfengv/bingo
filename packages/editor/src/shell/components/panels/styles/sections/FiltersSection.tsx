/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/sections/FiltersSection.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { FILTER_DEFINITIONS, FILTER_KINDS, normalizeFilterAmount, parseFilterValues, replaceFilterFunctions, serializeFilterValue, serializeFilters } from "../../../../utils/effectValues";
import { classifyEffect } from "../../../../utils/effects";
import { useStyleOps } from "../StyleOpsContext";
import { LayoutValueInput } from "../inputs/LayoutValueInput";
import { InspectorDropdown } from "../inputs/parts/InspectorDropdown";
import { IconBtn, InspectorRailRow } from "../primitives";
import { InspectorSection } from "./InspectorSection";
import { COMMENTED_STYLES_KEY, parseCommentedStyles, serializeCommentedStyles } from "@bingo/compiler";
import { useTranslation } from "@bingo/i18n";
import { BlendModeIcon, EyeClosedIcon, EyeIcon, FilterAmountIcon, MinusIcon, PlusIcon } from "@bingo/ui";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/** Repeatable layer/backdrop CSS filter rows with grouped type selection. */
var nextFilterRowId = 0;
function allocateFilterRowId() {
  nextFilterRowId += 1;
  return nextFilterRowId;
}
function parseFilterRows(filterValue, backdropFilterValue, commentedValue) {
  const values = parseFilterValues(filterValue, backdropFilterValue).map(value => ({
    ...value,
    enabled: true
  }));
  const hidden = parseCommentedStyles(commentedValue).filter(entry => entry.group === "filter").sort((a, b) => a.index - b.index);
  for (const entry of hidden) {
    const parsed = parseFilterValues(entry.property === "filter" ? entry.value : "", entry.property === "backdropFilter" ? entry.value : "")[0];
    if (!parsed) continue;
    values.splice(Math.min(entry.index, values.length), 0, {
      ...parsed,
      enabled: false
    });
  }
  return values.map(value => ({
    ...value,
    id: allocateFilterRowId()
  }));
}
function defaultFilter() {
  return {
    scope: "layer",
    kind: "blur",
    amount: 10
  };
}
function filterLabel(t, scope, kind) {
  const key = kind === "hue-rotate" ? "hueRotation" : kind;
  const label = t(`styles.${key}`);
  return scope === "backdrop" ? `${t("styles.backdrop")} ${label}` : label;
}
function FiltersSection() {
  const $ = (0, import_compiler_runtime.c)(66);
  const { t } = useTranslation("editor");
  const ops = useStyleOps();
  let t0;
  if ($[0] !== ops) {
    t0 = property => ops.sourceProps(property).source === "class" ? ops.get(property) : ops.getExplicit(property);
    $[0] = ops;
    $[1] = t0;
  } else t0 = $[1];
  const effectValue = t0;
  let t1;
  if ($[2] !== effectValue) {
    t1 = effectValue("filter");
    $[2] = effectValue;
    $[3] = t1;
  } else t1 = $[3];
  const filterValue = t1;
  let t2;
  if ($[4] !== effectValue) {
    t2 = effectValue("backdropFilter");
    $[4] = effectValue;
    $[5] = t2;
  } else t2 = $[5];
  const backdropFilterValue = t2;
  let t3;
  if ($[6] !== ops) {
    t3 = ops.getExplicit(COMMENTED_STYLES_KEY);
    $[6] = ops;
    $[7] = t3;
  } else t3 = $[7];
  const commentedValue = t3;
  const sourceKey = `${ops.selectedElementId}\n${filterValue}\n${backdropFilterValue}\n${commentedValue}`;
  let t4;
  if ($[8] !== backdropFilterValue || $[9] !== commentedValue || $[10] !== filterValue) {
    t4 = () => parseFilterRows(filterValue, backdropFilterValue, commentedValue);
    $[8] = backdropFilterValue;
    $[9] = commentedValue;
    $[10] = filterValue;
    $[11] = t4;
  } else t4 = $[11];
  const [rows, setRows] = import_react.useState(t4);
  const [rowsSourceKey, setRowsSourceKey] = import_react.useState(sourceKey);
  const [writtenKey, setWrittenKey] = import_react.useState(void 0);
  if (sourceKey !== rowsSourceKey) {
    setRowsSourceKey(sourceKey);
    if (writtenKey === `${filterValue}\n${backdropFilterValue}\n${commentedValue}`) setWrittenKey(void 0);else setRows(parseFilterRows(filterValue, backdropFilterValue, commentedValue));
  }
  let t5;
  if ($[12] !== ops) {
    t5 = () => {
      const filterClasses = ops.elementClassName.split(/\s+/).filter(Boolean).filter(_temp$35);
      if (filterClasses.length > 0) ops.removeClass(filterClasses);
    };
    $[12] = ops;
    $[13] = t5;
  } else t5 = $[13];
  const removeLegacyFilterClasses = t5;
  let t6;
  if ($[14] !== backdropFilterValue || $[15] !== commentedValue || $[16] !== filterValue || $[17] !== ops || $[18] !== removeLegacyFilterClasses) {
    t6 = nextRows => {
      const enabledRows = nextRows.filter(_temp2$27);
      const nextFilter = replaceFilterFunctions(filterValue, FILTER_KINDS, serializeFilters(enabledRows, "layer"));
      const nextBackdrop = replaceFilterFunctions(backdropFilterValue, FILTER_KINDS, serializeFilters(enabledRows, "backdrop"));
      const preservedComments = parseCommentedStyles(commentedValue).filter(_temp3$17);
      const filterComments = nextRows.flatMap(_temp4$15);
      const nextCommented = [...preservedComments, ...filterComments];
      const nextCommentedValue = nextCommented.length > 0 ? serializeCommentedStyles(nextCommented) : void 0;
      setRows(nextRows);
      setWrittenKey(`${nextFilter}\n${nextBackdrop}\n${nextCommentedValue ?? ""}`);
      ops.setMultiple({
        filter: nextFilter || void 0,
        backdropFilter: nextBackdrop || void 0,
        WebkitBackdropFilter: nextBackdrop || void 0,
        [COMMENTED_STYLES_KEY]: nextCommentedValue
      });
      removeLegacyFilterClasses();
    };
    $[14] = backdropFilterValue;
    $[15] = commentedValue;
    $[16] = filterValue;
    $[17] = ops;
    $[18] = removeLegacyFilterClasses;
    $[19] = t6;
  } else t6 = $[19];
  const write = t6;
  let t7;
  if ($[20] !== rows || $[21] !== write) {
    t7 = () => write([...rows, {
      ...defaultFilter(),
      id: allocateFilterRowId(),
      enabled: true
    }]);
    $[20] = rows;
    $[21] = write;
    $[22] = t7;
  } else t7 = $[22];
  const addFilter = t7;
  let t8;
  if ($[23] !== rows || $[24] !== write) {
    t8 = (id, patch) => write(rows.map(row_1 => row_1.id === id ? {
      ...row_1,
      ...patch
    } : row_1));
    $[23] = rows;
    $[24] = write;
    $[25] = t8;
  } else t8 = $[25];
  const patchFilter = t8;
  let t9;
  if ($[26] !== rows || $[27] !== write) {
    t9 = id_0 => write(rows.map(row_2 => row_2.id === id_0 ? {
      ...row_2,
      enabled: !row_2.enabled
    } : row_2));
    $[26] = rows;
    $[27] = write;
    $[28] = t9;
  } else t9 = $[28];
  const toggleFilter = t9;
  let t10;
  if ($[29] !== rows || $[30] !== write) {
    t10 = id_1 => write(rows.filter(row_3 => row_3.id !== id_1));
    $[29] = rows;
    $[30] = write;
    $[31] = t10;
  } else t10 = $[31];
  const removeFilter = t10;
  let T0;
  let t11;
  let t12;
  let t13;
  let t14;
  let t15;
  let t16;
  let t17;
  let t18;
  let t19;
  let t20;
  if (true) {
    const layerRows = rows.filter(_temp5$12);
    const backdropRows = rows.filter(_temp6$10);
    const rowGroups = [...(layerRows.length > 0 ? [{
      scope: "layer",
      label: backdropRows.length > 0 ? t("styles.layer") : void 0,
      rows: layerRows
    }] : []), ...(backdropRows.length > 0 ? [{
      scope: "backdrop",
      label: t("styles.backdrop"),
      rows: backdropRows
    }] : [])];
    let t21;
    if (true) {
      t21 = !ops.readOnly ? <IconBtn label={t("styles.addFilter")} onClick={addFilter}>{<PlusIcon />}</IconBtn> : null;
      $[49] = addFilter;
      $[50] = ops.readOnly;
      $[51] = t21;
    } else t21 = $[51];
    const addAction = t21;
    T0 = InspectorSection;
    t13 = true;
    t14 = "addable";
    t15 = t("styles.filters");
    t16 = rows.length > 0;
    t17 = addFilter;
    t18 = false;
    t19 = addAction;
    t20 = addAction;
    t11 = "space-y-2";
    t12 = rowGroups.map(group => <div key={group.scope} className="space-y-2">{group.label && <div className="text-[11px] leading-4 text-ed-foreground-secondary">{group.label}</div>}{<div className="space-y-2">{group.rows.map(row_6 => {
      const translatedFilterLabel = filterLabel(t, row_6.scope, row_6.kind);
      return <InspectorRailRow key={row_6.id} action={!ops.readOnly ? <IconBtn label={t("styles.removeFilter", { filter: translatedFilterLabel })} onClick={() => removeFilter(row_6.id)}>{<MinusIcon />}</IconBtn> : null}>{<div className="grid min-w-0 grid-cols-[minmax(0,1fr)_26px] gap-1.5">{<div className={row_6.enabled ? void 0 : "opacity-50"}>{<FilterRow value={row_6} onChange={patch_0 => patchFilter(row_6.id, patch_0)} readOnly={ops.readOnly} />}</div>}{!ops.readOnly && <IconBtn label={t(row_6.enabled ? "styles.hideFilter" : "styles.showFilter", { filter: translatedFilterLabel })} active={!row_6.enabled} onClick={() => toggleFilter(row_6.id)}>{row_6.enabled ? <EyeIcon /> : <EyeClosedIcon />}</IconBtn>}</div>}</InspectorRailRow>;
    })}</div>}</div>);
    $[32] = addFilter;
    $[33] = ops.readOnly;
    $[34] = patchFilter;
    $[35] = removeFilter;
    $[36] = rows;
    $[37] = toggleFilter;
    $[38] = T0;
    $[39] = t11;
    $[40] = t12;
    $[41] = t13;
    $[42] = t14;
    $[43] = t15;
    $[44] = t16;
    $[45] = t17;
    $[46] = t18;
    $[47] = t19;
    $[48] = t20;
  } else {
    T0 = $[38];
    t11 = $[39];
    t12 = $[40];
    t13 = $[41];
    t14 = $[42];
    t15 = $[43];
    t16 = $[44];
    t17 = $[45];
    t18 = $[46];
    t19 = $[47];
    t20 = $[48];
  }
  let t21;
  if ($[52] !== t11 || $[53] !== t12) {
    t21 = <div className={t11}>{t12}</div>;
    $[52] = t11;
    $[53] = t12;
    $[54] = t21;
  } else t21 = $[54];
  let t22;
  if ($[55] !== T0 || $[56] !== t13 || $[57] !== t14 || $[58] !== t15 || $[59] !== t16 || $[60] !== t17 || $[61] !== t18 || $[62] !== t19 || $[63] !== t20 || $[64] !== t21) {
    t22 = <T0 reserveActionRail={t13} variant={t14} title={t15} isSet={t16} onAdd={t17} optimisticOpenOnAdd={t18} collapsedAction={t19} action={t20}>{t21}</T0>;
    $[55] = T0;
    $[56] = t13;
    $[57] = t14;
    $[58] = t15;
    $[59] = t16;
    $[60] = t17;
    $[61] = t18;
    $[62] = t19;
    $[63] = t20;
    $[64] = t21;
    $[65] = t22;
  } else t22 = $[65];
  return t22;
}
function _temp6$10(row_5) {
  return row_5.scope === "backdrop";
}
function _temp5$12(row_4) {
  return row_4.scope === "layer";
}
function _temp4$15(row_0, index) {
  return row_0.enabled ? [] : [{
    group: "filter",
    index,
    property: row_0.scope === "backdrop" ? "backdropFilter" : "filter",
    value: serializeFilterValue(row_0)
  }];
}
function _temp3$17(entry) {
  return entry.group !== "filter";
}
function _temp2$27(row) {
  return row.enabled;
}
function _temp$35(className) {
  const type = classifyEffect(className);
  return type === "blur" || type === "backdrop-blur";
}
function FilterRow(t0) {
  const $ = (0, import_compiler_runtime.c)(27);
  const { t } = useTranslation("editor");
  const {
    value,
    onChange,
    readOnly
  } = t0;
  let t1;
  if ($[0] !== value.kind) {
    t1 = FILTER_DEFINITIONS.find(candidate => candidate.kind === value.kind);
    $[0] = value.kind;
    $[1] = t1;
  } else t1 = $[1];
  const definition = t1;
  let t2;
  if ($[2] !== onChange) {
    t2 = (scope, kind) => {
      const nextDefinition = FILTER_DEFINITIONS.find(candidate_0 => candidate_0.kind === kind);
      onChange({
        scope,
        kind,
        amount: nextDefinition.defaultAmount
      });
    };
    $[2] = onChange;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== readOnly || $[5] !== t2 || $[6] !== value.kind || $[7] !== value.scope) {
    t3 = <FilterTypeDropdown scope={value.scope} kind={value.kind} onChange={t2} readOnly={readOnly} />;
    $[4] = readOnly;
    $[5] = t2;
    $[6] = value.kind;
    $[7] = value.scope;
    $[8] = t3;
  } else t3 = $[8];
  let t4;
  if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = <FilterAmountIcon />;
    $[9] = t4;
  } else t4 = $[9];
  const t5 = String(value.amount);
  let t6;
  if ($[10] !== onChange || $[11] !== value.kind) {
    t6 = nextValue => {
      const amount = Number(nextValue);
      if (Number.isFinite(amount)) onChange({
        amount: normalizeFilterAmount(value.kind, amount)
      });
    };
    $[10] = onChange;
    $[11] = value.kind;
    $[12] = t6;
  } else t6 = $[12];
  const t7 = definition.unit;
  const t8 = definition.wrapAt === void 0 ? definition.min : void 0;
  const t9 = definition.max;
  let t10;
  if (true) {
    t10 = filterLabel(t, value.scope, value.kind);
    $[13] = value.kind;
    $[14] = value.scope;
    $[15] = t10;
  } else t10 = $[15];
  const t11 = t("styles.filterAmount", { filter: t10 });
  let t12;
  if ($[16] !== definition.max || $[17] !== definition.unit || $[18] !== readOnly || $[19] !== t11 || $[20] !== t5 || $[21] !== t6 || $[22] !== t8) {
    t12 = <LayoutValueInput icon={t4} value={t5} onChange={t6} unit="" suffix={t7} unitPicker={false} min={t8} max={t9} disabled={readOnly} ariaLabel={t11} />;
    $[16] = definition.max;
    $[17] = definition.unit;
    $[18] = readOnly;
    $[19] = t11;
    $[20] = t5;
    $[21] = t6;
    $[22] = t8;
    $[23] = t12;
  } else t12 = $[23];
  let t13;
  if ($[24] !== t12 || $[25] !== t3) {
    t13 = <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_72px] gap-2">{t3}{t12}</div>;
    $[24] = t12;
    $[25] = t3;
    $[26] = t13;
  } else t13 = $[26];
  return t13;
}
function FilterTypeDropdown(t0) {
  const $ = (0, import_compiler_runtime.c)(14);
  const { t } = useTranslation("editor");
  const {
    scope,
    kind,
    onChange,
    readOnly
  } = t0;
  let t1;
  if (true) {
    const key = kind === "hue-rotate" ? "hueRotation" : kind;
    t1 = t(`styles.${key}`);
    $[0] = kind;
    $[1] = scope;
    $[2] = t1;
  } else t1 = $[2];
  const currentLabel = t1;
  const filterTypeOptions = ["layer", "backdrop"].flatMap(optionScope => FILTER_DEFINITIONS.map(definition => ({
    value: `${optionScope}:${definition.kind}`,
    label: t(`styles.${definition.kind === "hue-rotate" ? "hueRotation" : definition.kind}`),
    group: t(optionScope === "backdrop" ? "styles.backdrop" : "styles.layer")
  })));
  let t2;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <BlendModeIcon className="size-4 shrink-0 text-ed-inspector-chrome" />;
    $[4] = t2;
  } else t2 = $[4];
  let t3;
  if ($[5] !== currentLabel) {
    t3 = <span className="flex min-w-0 items-center gap-1.5">{t2}{<span className="min-w-0 truncate">{currentLabel}</span>}</span>;
    $[5] = currentLabel;
    $[6] = t3;
  } else t3 = $[6];
  const t4 = `${scope}:${kind}`;
  let t5;
  if ($[7] !== onChange) {
    t5 = nextValue => {
      const [nextScope, nextKind] = nextValue.split(":");
      onChange(nextScope, nextKind);
    };
    $[7] = onChange;
    $[8] = t5;
  } else t5 = $[8];
  let t6;
  if (true) {
    t6 = <InspectorDropdown label={t("styles.filterType")} value={t3} selectedValue={t4} options={filterTypeOptions} onValueChange={t5} className="w-full" contentClassName="max-h-72" disabled={readOnly} />;
    $[9] = readOnly;
    $[10] = t3;
    $[11] = t4;
    $[12] = t5;
    $[13] = t6;
  } else t6 = $[13];
  return t6;
}

export { FiltersSection };
