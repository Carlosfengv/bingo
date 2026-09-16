/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/tabs/CSSTab.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { camelToKebab, kebabToCamel } from "../../../../utils/computedStyles";
import { getMergedValue, isMixed } from "../../../../utils/multiSelect";
import { Button, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* CSS tab — a textarea editor for the element's inline styles (camelCase ⇄
* kebab CSS), with a read-only "From Classes" cascade listing showing which
* Tailwind classes contribute which declarations (and what's overridden).
* Multi-select shows merged values, marking differing props as "Mixed".
*/
function CSSTab(t0) {
  const $ = (0, import_compiler_runtime.c)(42);
  const { t } = useTranslation("editor");
  const {
    element,
    selectedElementId,
    selectedElements,
    onUpdateElementStyles,
    onUpdateMultipleElementsStyles,
    readOnly,
    cascadeByClass
  } = t0;
  const isMultiSelect = selectedElements && selectedElements.length > 1;
  let t1;
  if ($[0] !== element?.styles) {
    t1 = element?.styles || {};
    $[0] = element?.styles;
    $[1] = t1;
  } else t1 = $[1];
  const styles = t1;
  const stylesToCSS = _temp3$25;
  const cssToStyles = _temp4$19;
  let t2;
  if ($[2] !== isMultiSelect || $[3] !== selectedElements || $[4] !== styles) {
    t2 = () => {
      if (!isMultiSelect || !selectedElements) return stylesToCSS(styles);
      const allProps = new Set();
      for (const el of selectedElements) {
        const s_0 = el.styles || {};
        Object.keys(s_0).forEach(k_0 => allProps.add(k_0));
      }
      const lines_0 = [];
      for (const prop_0 of Array.from(allProps).sort()) {
        const merged = getMergedValue(selectedElements, el_0 => el_0.styles?.[prop_0]);
        if (isMixed(merged)) lines_0.push(`${camelToKebab(prop_0)}: Mixed;`);else if (merged !== void 0 && merged !== "") lines_0.push(`${camelToKebab(prop_0)}: ${merged};`);
      }
      return lines_0.join("\n");
    };
    $[2] = isMultiSelect;
    $[3] = selectedElements;
    $[4] = styles;
    $[5] = t2;
  } else t2 = $[5];
  const getMergedStylesCSS = t2;
  const initialCSS = isMultiSelect ? getMergedStylesCSS() : stylesToCSS(styles);
  let t3;
  if ($[6] !== styles) {
    t3 = JSON.stringify(styles);
    $[6] = styles;
    $[7] = t3;
  } else t3 = $[7];
  const stylesKey = t3;
  let t4;
  if ($[8] !== selectedElements) {
    t4 = selectedElements?.map(_temp5$16).join(",") ?? "";
    $[8] = selectedElements;
    $[9] = t4;
  } else t4 = $[9];
  const selectedIdsKey = t4;
  const cssSyncKey = `${element?.id ?? ""}:${stylesKey}:${isMultiSelect}:${selectedIdsKey}`;
  const [localCSS, setLocalCSS] = (0, import_react.useState)(initialCSS);
  const [syncedCssKey, setSyncedCssKey] = (0, import_react.useState)(cssSyncKey);
  if (cssSyncKey !== syncedCssKey) {
    setSyncedCssKey(cssSyncKey);
    setLocalCSS(isMultiSelect ? getMergedStylesCSS() : stylesToCSS(styles));
  }
  let t5;
  if ($[10] !== isMultiSelect || $[11] !== localCSS || $[12] !== onUpdateElementStyles || $[13] !== onUpdateMultipleElementsStyles || $[14] !== readOnly || $[15] !== selectedElementId || $[16] !== selectedElements) {
    t5 = () => {
      if (readOnly) return;
      const newStyles = cssToStyles(localCSS);
      const filteredStyles = {};
      for (const [k_1, v_1] of Object.entries(newStyles)) {
        if (v_1 === "Mixed") continue;
        filteredStyles[k_1] = v_1;
      }
      if (isMultiSelect && onUpdateMultipleElementsStyles && selectedElements) {
        const ids = new Set(selectedElements.map(_temp6$14));
        onUpdateMultipleElementsStyles(ids, currentStyles => ({
          ...currentStyles,
          ...filteredStyles
        }));
      } else onUpdateElementStyles(selectedElementId, filteredStyles);
    };
    $[10] = isMultiSelect;
    $[11] = localCSS;
    $[12] = onUpdateElementStyles;
    $[13] = onUpdateMultipleElementsStyles;
    $[14] = readOnly;
    $[15] = selectedElementId;
    $[16] = selectedElements;
    $[17] = t5;
  } else t5 = $[17];
  const handleApply = t5;
  if (!element && !isMultiSelect) {
    let t6;
    if (true) {
      t6 = <p className="text-[12px] text-ed-muted-foreground">{t("styles.noElement")}</p>;
      $[18] = t6;
    } else t6 = $[18];
    return t6;
  }
  let t6;
  if ($[19] !== element?.styles) {
    t6 = element?.styles || {};
    $[19] = element?.styles;
    $[20] = t6;
  } else t6 = $[20];
  const inlineStyles = t6;
  let t7;
  if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
    t7 = cn$2("bg-ed-muted rounded overflow-hidden", "border border-transparent hover:border-ed-border focus-within:border-ed-ring");
    $[21] = t7;
  } else t7 = $[21];
  let t8;
  if ($[22] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = e_0 => {
      setLocalCSS(e_0.target.value);
      const el_3 = e_0.target;
      el_3.style.height = "auto";
      el_3.style.height = Math.max(60, el_3.scrollHeight) + "px";
    };
    $[22] = t8;
  } else t8 = $[22];
  let t9;
  if ($[23] !== handleApply) {
    t9 = e_1 => {
      if ((e_1.metaKey || e_1.ctrlKey) && e_1.key === "Enter") {
        e_1.preventDefault();
        handleApply();
      }
    };
    $[23] = handleApply;
    $[24] = t9;
  } else t9 = $[24];
  const t10 = isMultiSelect ? t("styles.cssAllSelectedComment") : t("styles.cssEmptyComment");
  let t11;
  if ($[25] !== localCSS || $[26] !== readOnly || $[27] !== t10 || $[28] !== t9) {
    t11 = <textarea ref={_temp7$10} value={localCSS} onChange={t8} onKeyDown={t9} placeholder={t10} disabled={readOnly} className="w-full min-h-[60px] p-3 text-[12px] font-mono bg-transparent resize-none text-ed-foreground placeholder:text-ed-muted-foreground outline-none overflow-hidden" />;
    $[25] = localCSS;
    $[26] = readOnly;
    $[27] = t10;
    $[28] = t9;
    $[29] = t11;
  } else t11 = $[29];
  let t12;
  if (true) {
    t12 = cascadeByClass && cascadeByClass.size > 0 && (() => {
      const normalClasses = [];
      const variantClasses = new Map();
      for (const [cls, entries_0] of cascadeByClass.entries()) {
        const normal = entries_0.filter(_temp8$7);
        const variants = entries_0.filter(_temp9$6);
        if (normal.length > 0) normalClasses.push([cls, normal]);
        for (const v_2 of variants) {
          const list = variantClasses.get(v_2.variant) || [];
          const existing = list.find(t13 => {
            const [c] = t13;
            return c === cls;
          });
          if (existing) existing[1].push({
            prop: v_2.prop,
            value: v_2.value
          });else list.push([cls, [{
            prop: v_2.prop,
            value: v_2.value
          }]]);
          variantClasses.set(v_2.variant, list);
        }
      }
      return <>{<div className="mx-3 border-t border-ed-border" />}{<div className="p-3 space-y-1.5">{<span className="text-[10px] text-ed-foreground uppercase tracking-wider">{t("styles.fromClasses")}</span>}{normalClasses.map(t14 => {
            const [cls_0, props] = t14;
            const allOverridden = props.every(_temp0$5);
            const hasInlineOverride = props.some(p_0 => inlineStyles[p_0.prop] !== void 0 && inlineStyles[p_0.prop] !== "");
            return <div key={cls_0} className={cn$2("flex gap-1.5 text-[12px] font-mono", (allOverridden || hasInlineOverride) && "opacity-40")}>{<div className="flex-1 min-w-0">{props.map(_temp1$5)}</div>}{<span className={cn$2("px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 self-start", allOverridden ? "bg-ed-foreground/5 text-ed-foreground/40 line-through" : "bg-ed-foreground/10 text-ed-foreground-secondary")}>{cls_0}</span>}</div>;
          })}{Array.from(variantClasses.entries()).map(_temp11$3)}</div>}</>;
    })();
    $[30] = cascadeByClass;
    $[31] = inlineStyles;
    $[32] = t12;
  } else t12 = $[32];
  let t13;
  if ($[33] !== t11 || $[34] !== t12) {
    t13 = <div className={t7}>{t11}{t12}</div>;
    $[33] = t11;
    $[34] = t12;
    $[35] = t13;
  } else t13 = $[35];
  let t14;
  if (true) {
    t14 = !readOnly && <div className="flex justify-end">{<Button variant="outline" size="xs" onClick={handleApply} className="px-2 text-[12px] shadow-none">{t("styles.applyShortcut")}</Button>}</div>;
    $[36] = handleApply;
    $[37] = readOnly;
    $[38] = t14;
  } else t14 = $[38];
  let t15;
  if ($[39] !== t13 || $[40] !== t14) {
    t15 = <div className="space-y-2">{t13}{t14}</div>;
    $[39] = t13;
    $[40] = t14;
    $[41] = t15;
  } else t15 = $[41];
  return t15;
}
function _temp11$3(t0) {
  const [variant, classList] = t0;
  return <div key={variant} className="mt-2 space-y-1">{<span className="text-[10px] text-ed-foreground uppercase tracking-wider">:{variant}</span>}{classList.map(t1 => {
      const [cls_1, props_0] = t1;
      return <div key={`${variant}:${cls_1}`} className="flex gap-1.5 text-[12px] font-mono opacity-60">{<div className="flex-1 min-w-0">{props_0.map(_temp10$4)}</div>}{<span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-ed-foreground/10 text-ed-foreground-secondary shrink-0 self-start">{cls_1}</span>}</div>;
    })}</div>;
}
function _temp10$4(p_2, i_0) {
  const kebab_0 = p_2.prop.replace(/([A-Z])/g, "-$1").toLowerCase();
  return <div key={i_0} className="text-ed-foreground/70 truncate">{kebab_0}: {p_2.value};</div>;
}
function _temp1$5(p_1, i) {
  const kebab = p_1.prop.replace(/([A-Z])/g, "-$1").toLowerCase();
  return <div key={i} className={cn$2("text-ed-foreground/70 truncate", p_1.overridden && "line-through")}>{kebab}: {p_1.value};</div>;
}
function _temp0$5(p) {
  return p.overridden;
}
function _temp9$6(e_3) {
  return e_3.variant;
}
function _temp8$7(e_2) {
  return !e_2.variant;
}
function _temp7$10(el_2) {
  if (el_2) {
    el_2.style.height = "auto";
    el_2.style.height = Math.max(60, el_2.scrollHeight) + "px";
  }
}
function _temp6$14(el_1) {
  return el_1.id;
}
function _temp5$16(e) {
  return e.id;
}
function _temp4$19(css) {
  const result = {};
  const lines = css.split(/[;\n]/).filter(Boolean);
  for (const line of lines) {
    const [prop, ...valueParts] = line.split(":");
    if (prop && valueParts.length > 0) {
      const kebabProp = prop.trim();
      const value = valueParts.join(":").trim();
      if (value) result[kebabToCamel(kebabProp)] = value;
    }
  }
  return result;
}
function _temp3$25(s) {
  const entries = Object.entries(s).filter(_temp$52);
  if (entries.length === 0) return "";
  return entries.map(_temp2$40).join("\n");
}
function _temp2$40(t0) {
  const [k, v_0] = t0;
  return `${camelToKebab(k)}: ${v_0};`;
}
function _temp$52(t0) {
  const [, v] = t0;
  return v !== void 0 && v !== "";
}

export { CSSTab };
