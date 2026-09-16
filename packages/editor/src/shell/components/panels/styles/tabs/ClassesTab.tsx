/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/panels/styles/tabs/ClassesTab.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { smartMergeClasses } from "../../../../../shared/utils/tailwindScale";
import { isClassInCompiledStyles, searchClasses } from "../../../../utils/classIndex";
import { InspectorControlInput, InspectorControlShell } from "../primitives";
import { InspectorSection } from "../sections/InspectorSection";
import { Button, Popover, PopoverAnchor, PopoverContent, ScrollArea, SpinnerIcon, XIcon, cn$2 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";

/**
* Classes tab — raw Tailwind class management for the selected element(s).
* Shows class chips (with multi-select occurrence counts and a pending spinner
* for classes not yet in the compiled CSS) and an autocomplete add-input.
*/
function ClassAutocompleteInput(t0) {
  const $ = (0, import_compiler_runtime.c)(47);
  const { t } = useTranslation("editor");
  const {
    value,
    onChange,
    onAdd,
    inputRef,
    placeholder
  } = t0;
  const [showSuggestions, setShowSuggestions] = (0, import_react.useState)(false);
  const [selectedIndex, setSelectedIndex] = (0, import_react.useState)(0);
  const containerRef = (0, import_react.useRef)(null);
  let t1;
  if ($[0] !== value) {
    let t2;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
      t2 = /\s+/;
      $[2] = t2;
    } else t2 = $[2];
    t1 = value.split(t2);
    $[0] = value;
    $[1] = t1;
  } else t1 = $[1];
  const words = t1;
  const currentWord = words[words.length - 1] || "";
  const [indexWord, setIndexWord] = (0, import_react.useState)(currentWord);
  if (currentWord !== indexWord) {
    setIndexWord(currentWord);
    setSelectedIndex(0);
  }
  let t2;
  if ($[3] !== currentWord) {
    t2 = currentWord.length < 2 ? [] : searchClasses(document, currentWord, 15);
    $[3] = currentWord;
    $[4] = t2;
  } else t2 = $[4];
  const suggestions = t2;
  const hasSuggestions = suggestions.length > 0 && currentWord.length >= 2;
  let t3;
  if ($[5] !== inputRef || $[6] !== onChange || $[7] !== words) {
    t3 = className => {
      const newWords = [...words.slice(0, -1), className];
      onChange(newWords.join(" ") + " ");
      setShowSuggestions(false);
      inputRef.current?.focus();
    };
    $[5] = inputRef;
    $[6] = onChange;
    $[7] = words;
    $[8] = t3;
  } else t3 = $[8];
  const applySuggestion = t3;
  let t4;
  if ($[9] !== applySuggestion || $[10] !== hasSuggestions || $[11] !== onAdd || $[12] !== selectedIndex || $[13] !== showSuggestions || $[14] !== suggestions) {
    t4 = e => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Enter") {
        if (hasSuggestions && showSuggestions) {
          e.preventDefault();
          applySuggestion(suggestions[selectedIndex].className);
        } else onAdd();
      } else if (e.key === "ArrowDown" && hasSuggestions) {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
        setShowSuggestions(true);
      } else if (e.key === "ArrowUp" && hasSuggestions) {
        e.preventDefault();
        setSelectedIndex(_temp$51);
      } else if (e.key === "Escape") setShowSuggestions(false);else if (e.key === "Tab" && hasSuggestions && showSuggestions) {
        e.preventDefault();
        applySuggestion(suggestions[selectedIndex].className);
      }
    };
    $[9] = applySuggestion;
    $[10] = hasSuggestions;
    $[11] = onAdd;
    $[12] = selectedIndex;
    $[13] = showSuggestions;
    $[14] = suggestions;
    $[15] = t4;
  } else t4 = $[15];
  const handleKeyDown = t4;
  const t5 = hasSuggestions && showSuggestions;
  const t6 = hasSuggestions && showSuggestions;
  let t7;
  if ($[16] !== onChange) {
    t7 = e_0 => {
      onChange(e_0.target.value);
      setShowSuggestions(true);
    };
    $[16] = onChange;
    $[17] = t7;
  } else t7 = $[17];
  let t8;
  let t9;
  if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
    t8 = () => setShowSuggestions(true);
    t9 = () => setTimeout(() => setShowSuggestions(false), 200);
    $[18] = t8;
    $[19] = t9;
  } else {
    t8 = $[18];
    t9 = $[19];
  }
  let t10;
  if ($[20] !== handleKeyDown || $[21] !== inputRef || $[22] !== placeholder || $[23] !== t7 || $[24] !== value) {
    t10 = <InspectorControlInput ref={inputRef} value={value} onChange={t7} onKeyDown={handleKeyDown} onFocus={t8} onBlur={t9} placeholder={placeholder} className="px-3 font-mono" />;
    $[20] = handleKeyDown;
    $[21] = inputRef;
    $[22] = placeholder;
    $[23] = t7;
    $[24] = value;
    $[25] = t10;
  } else t10 = $[25];
  let t11;
  if ($[26] !== t10 || $[27] !== t6) {
    t11 = <PopoverAnchor asChild={true}>{<InspectorControlShell active={t6} className="flex-1">{t10}</InspectorControlShell>}</PopoverAnchor>;
    $[26] = t10;
    $[27] = t6;
    $[28] = t11;
  } else t11 = $[28];
  let t12;
  if ($[29] !== applySuggestion || $[30] !== selectedIndex || $[31] !== suggestions) {
    let t13;
    if ($[33] !== applySuggestion || $[34] !== selectedIndex) {
      t13 = (s, i_1) => <button key={s.className} onMouseDown={e_2 => {
        e_2.preventDefault();
        applySuggestion(s.className);
      }} className={cn$2("w-full flex items-center gap-2 px-2 py-1.5 text-[12px] rounded hover:bg-ed-muted text-left", i_1 === selectedIndex && "bg-ed-muted")}>{<span className="font-mono text-ed-foreground">{s.className}</span>}{<span className="text-ed-muted-foreground truncate flex-1">{s.summary}</span>}</button>;
      $[33] = applySuggestion;
      $[34] = selectedIndex;
      $[35] = t13;
    } else t13 = $[35];
    t12 = suggestions.map(t13);
    $[29] = applySuggestion;
    $[30] = selectedIndex;
    $[31] = suggestions;
    $[32] = t12;
  } else t12 = $[32];
  let t13;
  if ($[36] !== t12) {
    t13 = <PopoverContent side="top" align="start" className="w-64" onOpenAutoFocus={_temp2$39}>{<ScrollArea viewportClassName="max-h-[240px] p-1">{t12}</ScrollArea>}</PopoverContent>;
    $[36] = t12;
    $[37] = t13;
  } else t13 = $[37];
  let t14;
  if ($[38] !== t11 || $[39] !== t13 || $[40] !== t5) {
    t14 = <Popover open={t5} onOpenChange={setShowSuggestions} modal={false}>{t11}{t13}</Popover>;
    $[38] = t11;
    $[39] = t13;
    $[40] = t5;
    $[41] = t14;
  } else t14 = $[41];
  let t15;
  if (true) {
    t15 = <Button variant="outline" size="xs" className="shadow-none" onClick={onAdd}>{t("styles.add")}</Button>;
    $[42] = onAdd;
    $[43] = t15;
  } else t15 = $[43];
  let t16;
  if ($[44] !== t14 || $[45] !== t15) {
    t16 = <div ref={containerRef} className="flex gap-2">{t14}{t15}</div>;
    $[44] = t14;
    $[45] = t15;
    $[46] = t16;
  } else t16 = $[46];
  return t16;
}
function _temp2$39(e_1) {
  return e_1.preventDefault();
}
function _temp$51(i_0) {
  return Math.max(i_0 - 1, 0);
}
function ClassesTab(t0) {
  const $ = (0, import_compiler_runtime.c)(47);
  const { t } = useTranslation("editor");
  const {
    element,
    selectedElementId,
    selectedElements,
    onUpdateElementProps,
    onUpdateMultipleElementsProps,
    readOnly
  } = t0;
  const isMultiSelect = selectedElements && selectedElements.length > 1;
  const [newClass, setNewClass] = (0, import_react.useState)("");
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = new Set();
    $[0] = t1;
  } else t1 = $[0];
  const [pendingClasses, setPendingClasses] = (0, import_react.useState)(t1);
  const inputRef = (0, import_react.useRef)(null);
  let t2;
  let t3;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = () => {
      const handler = () => setPendingClasses(new Set());
      window.addEventListener("bingo-css-updated", handler);
      return () => window.removeEventListener("bingo-css-updated", handler);
    };
    t3 = [];
    $[1] = t2;
    $[2] = t3;
  } else {
    t2 = $[1];
    t3 = $[2];
  }
  (0, import_react.useEffect)(t2, t3);
  let t4;
  if ($[3] !== isMultiSelect || $[4] !== selectedElements) {
    t4 = () => {
      if (!isMultiSelect || !selectedElements) return [];
      const classCounts = {};
      const total = selectedElements.length;
      for (const el of selectedElements) {
        if (el.type === "text") continue;
        const classes = (el.props?.className || "").split(/\s+/).filter(Boolean);
        for (const cls of classes) classCounts[cls] = (classCounts[cls] || 0) + 1;
      }
      return Object.entries(classCounts).map(t5 => {
        const [cls_0, count] = t5;
        return {
          cls: cls_0,
          count,
          total
        };
      }).sort(_temp3$24);
    };
    $[3] = isMultiSelect;
    $[4] = selectedElements;
    $[5] = t4;
  } else t4 = $[5];
  const getClassesWithCounts = t4;
  let t5;
  if ($[6] !== element) {
    t5 = () => {
      if (!element || element.type === "text") return [];
      return (element.props?.className || "").split(/\s+/).filter(Boolean);
    };
    $[6] = element;
    $[7] = t5;
  } else t5 = $[7];
  const getClasses = t5;
  let T0;
  let handleAddClass;
  let t6;
  let t7;
  let t8;
  if ($[8] !== element || $[9] !== getClasses || $[10] !== getClassesWithCounts || $[11] !== isMultiSelect || $[12] !== newClass || $[13] !== onUpdateElementProps || $[14] !== onUpdateMultipleElementsProps || $[15] !== pendingClasses || $[16] !== readOnly || $[17] !== selectedElementId || $[18] !== selectedElements) {
    const classes_0 = getClasses();
    const classesWithCounts = isMultiSelect ? getClassesWithCounts() : [];
    handleAddClass = () => {
      if (!newClass.trim() || readOnly) return;
      const classesToAdd = newClass.trim().split(/\s+/).filter(Boolean);
      if (isMultiSelect && onUpdateMultipleElementsProps && selectedElements) {
        const ids = new Set(selectedElements.map(_temp4$18));
        onUpdateMultipleElementsProps(ids, currentProps => {
          const merged = smartMergeClasses((currentProps?.className || "").split(/\s+/).filter(Boolean), classesToAdd);
          return {
            ...currentProps,
            className: merged.join(" ")
          };
        });
      } else if (onUpdateElementProps) {
        const updated = smartMergeClasses(classes_0, classesToAdd);
        onUpdateElementProps(selectedElementId, {
          ...(element?.props || {}),
          className: updated.join(" ")
        });
      }
      const trulyNew = classesToAdd.filter(_temp5$15);
      if (trulyNew.length > 0) setPendingClasses(prev => {
        const next = new Set(prev);
        for (const cls_2 of trulyNew) next.add(cls_2);
        return next;
      });
      setNewClass("");
      inputRef.current?.focus();
    };
    const handleRemoveClass = cls_3 => {
      if (readOnly) return;
      if (isMultiSelect && onUpdateMultipleElementsProps && selectedElements) {
        const ids_0 = new Set(selectedElements.map(_temp6$13));
        onUpdateMultipleElementsProps(ids_0, currentProps_0 => {
          const updated_0 = (currentProps_0?.className || "").split(/\s+/).filter(Boolean).filter(c => c !== cls_3);
          return {
            ...currentProps_0,
            className: updated_0.join(" ")
          };
        });
      } else if (onUpdateElementProps) {
        const updated_1 = classes_0.filter(c_0 => c_0 !== cls_3);
        onUpdateElementProps(selectedElementId, {
          ...(element?.props || {}),
          className: updated_1.join(" ")
        });
      }
    };
    const hasClasses = isMultiSelect ? classesWithCounts.length > 0 : classes_0.length > 0;
    let t9;
    if ($[24] !== element || $[25] !== isMultiSelect || $[26] !== onUpdateElementProps || $[27] !== onUpdateMultipleElementsProps || $[28] !== readOnly || $[29] !== selectedElementId || $[30] !== selectedElements) {
      t9 = () => {
        if (readOnly) return;
        if (isMultiSelect && onUpdateMultipleElementsProps && selectedElements) {
          const ids_1 = new Set(selectedElements.map(_temp7$9));
          onUpdateMultipleElementsProps(ids_1, _temp8$6);
        } else if (onUpdateElementProps) {
          const newProps_0 = {
            ...(element?.props || {})
          };
          delete newProps_0.className;
          onUpdateElementProps(selectedElementId, newProps_0);
        }
      };
      $[24] = element;
      $[25] = isMultiSelect;
      $[26] = onUpdateElementProps;
      $[27] = onUpdateMultipleElementsProps;
      $[28] = readOnly;
      $[29] = selectedElementId;
      $[30] = selectedElements;
      $[31] = t9;
    } else t9 = $[31];
    const handleClearAll = t9;
    T0 = InspectorSection;
    t6 = t("styles.classes");
    if (true) {
      t7 = hasClasses && !readOnly && <button onClick={handleClearAll} className="text-[12px] text-ed-muted-foreground hover:text-ed-foreground">{t("styles.clear")}</button>;
      $[32] = handleClearAll;
      $[33] = hasClasses;
      $[34] = readOnly;
      $[35] = t7;
    } else t7 = $[35];
    t8 = isMultiSelect ? <div className="flex flex-wrap gap-1.5">{classesWithCounts.map((t10, i) => {
        const {
          cls: cls_4,
          count: count_0,
          total: total_0
        } = t10;
        const isCommon = count_0 === total_0;
        const isMixedCount = count_0 < total_0;
        return <div key={`${cls_4}-${i}`} className={cn$2("group flex items-center gap-1 px-2 py-1 rounded text-[12px] font-mono text-ed-foreground", isCommon ? "bg-ed-muted/50" : "bg-ed-muted/30 border border-dashed border-ed-border")}>{<span className={cn$2("truncate max-w-[120px]", isMixedCount && "text-ed-muted-foreground")}>{cls_4}</span>}{isMixedCount && <span className="text-[10px] text-ed-muted-foreground/70">({count_0}/{total_0})</span>}{!readOnly && <button onClick={() => handleRemoveClass(cls_4)} className="opacity-0 group-hover:opacity-100 hover:text-ed-destructive">{<XIcon />}</button>}</div>;
      })}</div> : classes_0.length > 0 && <div className="flex flex-wrap gap-1.5">{classes_0.map((cls_5, i_0) => {
        const isPending = pendingClasses.has(cls_5);
        return <div key={`${cls_5}-${i_0}`} className="group flex items-center gap-1 px-2 py-1 rounded bg-ed-muted/50 text-[12px] font-mono text-ed-foreground">{isPending && <SpinnerIcon className="animate-spin text-ed-muted-foreground shrink-0" />}{<span className="truncate max-w-[140px]">{cls_5}</span>}{!readOnly && <button onClick={() => handleRemoveClass(cls_5)} className="opacity-0 group-hover:opacity-100 hover:text-ed-destructive">{<XIcon />}</button>}</div>;
      })}</div>;
    $[8] = element;
    $[9] = getClasses;
    $[10] = getClassesWithCounts;
    $[11] = isMultiSelect;
    $[12] = newClass;
    $[13] = onUpdateElementProps;
    $[14] = onUpdateMultipleElementsProps;
    $[15] = pendingClasses;
    $[16] = readOnly;
    $[17] = selectedElementId;
    $[18] = selectedElements;
    $[19] = T0;
    $[20] = handleAddClass;
    $[21] = t6;
    $[22] = t7;
    $[23] = t8;
  } else {
    T0 = $[19];
    handleAddClass = $[20];
    t6 = $[21];
    t7 = $[22];
    t8 = $[23];
  }
  let t9;
  if (true) {
    t9 = !readOnly && <ClassAutocompleteInput value={newClass} onChange={setNewClass} onAdd={handleAddClass} inputRef={inputRef} placeholder={isMultiSelect ? t("styles.addClasses") : t("styles.addClassesExample")} />;
    $[36] = handleAddClass;
    $[37] = isMultiSelect;
    $[38] = newClass;
    $[39] = readOnly;
    $[40] = t9;
  } else t9 = $[40];
  let t10;
  if ($[41] !== T0 || $[42] !== t6 || $[43] !== t7 || $[44] !== t8 || $[45] !== t9) {
    t10 = <T0 title={t6} action={t7}>{t8}{t9}</T0>;
    $[41] = T0;
    $[42] = t6;
    $[43] = t7;
    $[44] = t8;
    $[45] = t9;
    $[46] = t10;
  } else t10 = $[46];
  return t10;
}
function _temp8$6(currentProps_1) {
  const newProps = {
    ...currentProps_1
  };
  delete newProps.className;
  return newProps;
}
function _temp7$9(el_2) {
  return el_2.id;
}
function _temp6$13(el_1) {
  return el_1.id;
}
function _temp5$15(cls_1) {
  return !isClassInCompiledStyles(document, cls_1);
}
function _temp4$18(el_0) {
  return el_0.id;
}
function _temp3$24(a, b) {
  return b.count - a.count || a.cls.localeCompare(b.cls);
}

export { ClassesTab };
