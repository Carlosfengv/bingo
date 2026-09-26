import { useTranslation } from "@bingo/i18n";
import { useId, useLayoutEffect, useRef } from "react";
import { componentEmptyStyleArgument, componentStyleOverrides } from "../../../../../compiler/src/store/componentEditing";
import { componentStyleGroups, expandComponentStyle, updateComponentStyleProperties } from "../../../../../compiler/src/store/componentStyleProperties";
import { useComponentVariableIssues } from "../../hooks/useComponentVariableIssues";

export function ComponentOverridesPanel({ elements, originalElements = elements, componentIndex, store, readOnly, onUpdateElementStyles, onUpdateMultipleElementsStyles }) {
  const { t } = useTranslation("editor");
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const focusAfterReset = useRef<{ button: HTMLElement; index: number } | null>(null);
  useLayoutEffect(() => {
    const pending = focusAfterReset.current;
    if (!pending) return;
    focusAfterReset.current = null;
    if (pending.button.isConnected) return;
    const buttons = sectionRef.current?.querySelectorAll<HTMLButtonElement>('[data-style-override] button');
    const next = buttons?.[Math.min(pending.index, buttons.length - 1)];
    (next ?? sectionRef.current?.querySelector<HTMLElement>("h3"))?.focus();
  });
  const lists = elements.map(element => componentStyleOverrides(element, componentIndex?.[element.componentName]));
  const properties = [...new Set(lists.flatMap(list => list.map(entry => entry.property)))];
  const inactiveCount = properties.filter(property => lists.some(list => list.some(entry => entry.property === property && !entry.active))).length;
  const variableIssues = useComponentVariableIssues(elements, componentIndex, store);
  const emptyArguments = originalElements.filter(element => componentEmptyStyleArgument(element) !== undefined);
  const resetEmptyArgument = () => {
    if (readOnly) return;
    if (emptyArguments.length === 1) onUpdateElementStyles(emptyArguments[0].id, {});
    else if (emptyArguments.length) onUpdateMultipleElementsStyles(new Set(emptyArguments.map(element => element.id)), () => ({}));
  };
  const reset = (property?: string) => {
    if (readOnly) return;
    const activeButton = document.activeElement;
    if (activeButton instanceof HTMLButtonElement && sectionRef.current?.contains(activeButton)) {
      const buttons = Array.from(sectionRef.current.querySelectorAll('[data-style-override] button'));
      focusAfterReset.current = { button: activeButton, index: Math.max(0, buttons.indexOf(activeButton)) };
    }
    const update = (styles, id) => {
      const index = elements.findIndex(element => element.id === id);
      const updates = {};
      for (const entry of lists[index] ?? []) if (!property || property === entry.property) updates[entry.property] = undefined;
      return updateComponentStyleProperties(styles, updates);
    };
    if (elements.length === 1) onUpdateElementStyles(elements[0].id, update(elements[0].styles, elements[0].id));
    else onUpdateMultipleElementsStyles(new Set(elements.map(element => element.id)), update);
  };
  return <section ref={sectionRef} aria-labelledby={headingId} data-component-overrides className="border-b border-ed-border px-3.5 py-3">
    <div className="flex items-center justify-between gap-2">
      <h3 id={headingId} tabIndex={-1} className="text-[11px] font-medium text-ed-foreground">{t("componentInstance.overrides")}{properties.length > 0 && <span className="ml-2 font-normal text-ed-muted-foreground">{t("componentInstance.overrideCount", { count: properties.length })}</span>}</h3>
    </div>
    {inactiveCount > 0 && <p data-component-inactive-count role="status" className="mt-2 text-[10px] text-ed-muted-foreground">{t("componentInstance.inactiveCount", { count: inactiveCount })}</p>}
    {properties.length ? <div className="mt-2 space-y-2">{properties.map(property => {
      const entries = lists.map(list => list.find(entry => entry.property === property));
      const first = entries.find(Boolean)!;
      const mixed = entries.some(entry => !entry || !Object.is(entry.value, first.value));
      const active = entries.every(entry => !entry || entry.active);
      const mixedOrigin = entries.some(entry => entry && entry.origin !== first.origin);
      return <div key={property} data-style-override={property} className="text-[10px]">
        <div className="flex items-center gap-2"><span title={property} className="min-w-0 flex-1 truncate text-ed-inspector-value">{property}</span><span className="max-w-[45%] truncate text-ed-muted-foreground" title={String(first.value)}>{mixed ? t("componentInstance.mixed") : String(first.value)}</span><button type="button" disabled={readOnly} aria-label={t("componentInstance.resetNamed", { name: property })} onClick={() => reset(property)} className="shrink-0 text-ed-muted-foreground hover:text-ed-foreground disabled:opacity-50">{t("componentInstance.reset")}</button></div>
        <p className="mt-0.5 text-ed-muted-foreground">{t(`componentInstance.${mixedOrigin ? "mixedOrigin" : first.origin}`)} · {t(`componentInstance.${active ? "unknownEffect" : "inactive"}`)}</p>
        {variableIssues[property]?.length > 0 && <p data-component-variable-issue role="status" className="mt-0.5 break-words text-ed-muted-foreground">{t("componentInstance.unresolvedVariables", { names: variableIssues[property].join(", ") })}</p>}
        {componentStyleGroups[property] && entries.some(entry => entry && !expandComponentStyle(property, entry.value)) && <p className="mt-0.5 text-ed-muted-foreground">{t("componentInstance.groupResetHint")}</p>}
      </div>;
    })}<button type="button" disabled={readOnly} title={t("componentInstance.resetStylesHint")} onClick={() => reset()} className="mt-1 text-[10px] text-ed-muted-foreground hover:text-ed-foreground disabled:opacity-50">{t("componentInstance.resetStyles")}</button></div> : !emptyArguments.length && <p className="mt-2 text-[10px] text-ed-muted-foreground">{t("componentInstance.noOverrides")}</p>}
    {emptyArguments.length > 0 && <div data-empty-style-argument className="mt-2 text-[10px] text-ed-muted-foreground"><p>{t("componentInstance.emptyStyleArgument", { count: emptyArguments.length })}</p><button type="button" data-reset-style-argument disabled={readOnly} onClick={resetEmptyArgument} className="mt-1 hover:text-ed-foreground disabled:opacity-50">{t("componentInstance.resetStyleArgument")}</button></div>}
    {elements.some(element => element.props?.className) && <p className="mt-2 text-[10px] text-ed-muted-foreground">{t("componentInstance.classesRemain")}</p>}
  </section>;
}
