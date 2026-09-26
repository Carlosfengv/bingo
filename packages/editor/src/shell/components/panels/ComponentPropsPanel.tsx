import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "@bingo/i18n";
import { toast } from "sonner";
import { useComponentPreview } from "../../../shared/contexts/ComponentPreviewContext";
import { ComponentSourcePanel } from "./ComponentSourcePanel";
import { ComponentStyleAdapterPanel } from "./ComponentStyleAdapterPanel";
import { ComponentParameterColorPicker } from "./ComponentParameterColorPicker";
import { canResetComponentProp, componentIdentityMatches, componentPropControl, componentPropMetadataError, componentPropState, hasOwn, isPublicComponentProp, parseComponentPropInput, updateComponentProp, validateComponentProp } from "../../../../../compiler/src/store/componentEditing";
import type { ComponentProp, PropValue } from "../../../../../compiler/src/store/componentEditing";

const controlClass = "h-7 w-full min-w-0 rounded-md border border-ed-border bg-ed-input px-2 text-[11px] text-ed-foreground outline-none focus-visible:ring-1 focus-visible:ring-ed-ring disabled:opacity-50";

function ParameterField({ name, descriptor, elements, readOnly, onChange, previewStatus, unavailable }) {
  const { t } = useTranslation("editor");
  const fieldId = useId();
  const prop = descriptor as ComponentProp;
  const control = componentPropControl(prop);
  const metadataError = componentPropMetadataError(prop);
  const hasConstraints = control.kind === "number" && [prop.min, prop.max, prop.step].some(value => value !== undefined);
  const state = componentPropState(elements, name, prop);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [optionQuery, setOptionQuery] = useState("");
  const valueSignature = JSON.stringify(elements.map(element => [element.id, element.props?.[name], hasOwn(element.props, name)]));
  // Keep the actual input mounted so a successful preview does not lose focus.
  // External changes and undo still invalidate any unsubmitted text draft.
  useLayoutEffect(() => { setDraft(null); setError(false); }, [valueSignature]);
  const label = prop.label || name;
  const bound = elements.some(element => element.sourceExpressions?.props?.[name] || element.sourceExpressions?.spread);
  const disabled = readOnly || bound || control.kind === "readonly";
  const invalid = !state.mixed && state.explicit && !validateComponentProp(prop, state.value) && control.kind !== "readonly";
  const missing = !bound && !state.mixed && !state.known && prop.required;
  const requiredResetHint = state.anyExplicit && !bound && !canResetComponentProp(prop);
  const descriptionIds = [`${fieldId}-state`, ...(error || invalid || missing ? [`${fieldId}-error`] : []), ...(prop.description ? [`${fieldId}-description`] : []), ...(metadataError ? [`${fieldId}-metadata`] : []), ...(hasConstraints ? [`${fieldId}-constraints`] : []), ...(unavailable ? [`${fieldId}-unavailable`] : []), ...(requiredResetHint ? [`${fieldId}-required`] : [])].join(" ");
  const source = state.mixed ? "mixed" : bound ? "bound" : state.explicit ? "explicit" : state.known ? "default" : "unknownDefault";
  const binding = elements[0].sourceExpressions?.props?.[name]
    ?? elements[0].sourceExpressions?.attributes?.filter(attribute => !attribute.name).map(attribute => attribute.code).join(" ");
  const displayValue = state.value !== null && typeof state.value === "object" ? JSON.stringify(state.value) : String(state.value ?? "");
  const current = bound ? binding ?? "" : state.mixed || !state.known || control.kind === "number" && invalid ? "" : displayValue;
  const commit = (value: PropValue) => {
    if (disabled) return;
    if (!validateComponentProp(prop, value)) { setError(true); return; }
    onChange(name, prop, { value });
    setDraft(null);
    setError(false);
  };
  const commitDraft = () => {
    if (draft === null || disabled) return;
    try { commit(parseComponentPropInput(prop, draft)); } catch { setError(true); }
  };
  const options = bound ? undefined : control.options;
  const booleanKnown = !state.mixed && state.known && typeof state.value === "boolean";
  const optionLabel = (value: PropValue) => value === null ? "null" : value === true ? t("componentInstance.on") : value === false ? t("componentInstance.off") : value === "" ? t("componentInstance.emptyString") : String(value);
  const canReset = state.anyExplicit && canResetComponentProp(prop) && !bound && control.kind !== "readonly";
  const canPin = !state.anyExplicit && !state.mixed && state.known && !bound && control.kind !== "readonly" && validateComponentProp(prop, state.value);
  return <div data-component-prop={name} className="space-y-1" style={{ overflowWrap: "anywhere" }}>
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.45fr)" }}>
      <label htmlFor={fieldId} title={`${name}: ${prop.type}${prop.description ? `\n${prop.description}` : ""}`} className="min-w-0 truncate text-[11px] text-ed-inspector-value">{label}{prop.required && <span aria-hidden="true"> *</span>}</label>
      {!bound && control.kind === "boolean" ? <div className="flex min-w-0 items-center gap-2">
        <button id={fieldId} type="button" data-component-boolean role="checkbox" aria-label={label} aria-describedby={descriptionIds} aria-required={prop.required} aria-invalid={invalid || missing || undefined} aria-checked={booleanKnown ? state.value : "mixed"} disabled={disabled} onClick={() => commit(booleanKnown ? !state.value : true)} className="flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ed-ring disabled:opacity-50" style={{ minHeight: 28 }}>
          <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", width: 30, height: 18, padding: 2, border: `1px ${booleanKnown ? "solid" : "dashed"} var(--ed-border)`, borderRadius: 10, background: booleanKnown && state.value ? "var(--ed-primary)" : "var(--ed-input)", justifyContent: !booleanKnown ? "center" : state.value ? "flex-end" : "flex-start", flexShrink: 0 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: booleanKnown && state.value ? "var(--ed-primary-foreground)" : "var(--ed-foreground)" }} /></span>
          <span className="min-w-0 text-[11px] text-ed-foreground">{booleanKnown ? optionLabel(state.value) : state.value === null && !state.mixed ? "null" : t("componentInstance.choose")}</span>
        </button>
        {!booleanKnown && <button type="button" data-component-boolean-off disabled={disabled} aria-label={t("componentInstance.setOffNamed", { name: label })} onClick={() => commit(false)} style={{ flexShrink: 0, whiteSpace: "nowrap" }} className="text-[11px] text-ed-muted-foreground disabled:opacity-50">{t("componentInstance.off")}</button>}
      </div> : options ? <select id={fieldId} title={state.known && !state.mixed ? optionLabel(state.value) : undefined} aria-label={label} aria-describedby={descriptionIds} aria-required={prop.required} aria-invalid={invalid || error || missing || undefined} disabled={disabled} className={controlClass} value={state.mixed || !state.known || invalid ? "" : String(options.findIndex(value => Object.is(value, state.value)))} onChange={event => commit(options[Number(event.target.value)])}>
        <option value="" disabled>{t(`componentInstance.${state.mixed ? "mixed" : invalid ? "invalidValue" : "choose"}`)}</option>
        {options.map((value, index) => (optionLabel(value).toLocaleLowerCase().includes(optionQuery.toLocaleLowerCase()) || Object.is(value, state.value)) && <option key={index} value={index}>{optionLabel(value)}</option>)}
      </select> : <div className="flex min-w-0 items-center gap-2">{!bound && control.kind === "color" && <ComponentParameterColorPicker value={draft ?? current} valueLabel={state.mixed ? t("componentInstance.mixed") : !state.known ? t("componentInstance.unknownDefault") : state.value === null ? t("componentInstance.nullValue") : displayValue || t("componentInstance.emptyString")} disabled={disabled} label={t("componentInstance.pickColorNamed", { name: label })} describedBy={descriptionIds} onPreview={value => disabled ? undefined : onChange(name, prop, { value }, true)} onCommit={commit} />}<input id={fieldId} aria-label={label} aria-describedby={descriptionIds} aria-required={prop.required} aria-invalid={error || invalid || missing || undefined} className={controlClass} type={!bound && control.kind === "number" ? "number" : "text"} min={control.kind === "number" ? prop.min : undefined} max={control.kind === "number" ? prop.max : undefined} step={control.kind === "number" ? prop.step ?? "any" : undefined} disabled={disabled} value={draft ?? current} placeholder={state.mixed ? t("componentInstance.mixed") : !state.known ? t("componentInstance.followComponent") : undefined} onChange={event => { setDraft(event.target.value); setError(false); }} onBlur={commitDraft} onKeyDown={event => {
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); setDraft(null); setError(false); }
        if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); commitDraft(); }
      }} /></div>}
    </div>
    {options && options.length > 8 && <input type="search" data-component-option-search aria-label={t("componentInstance.searchOptions", { name: label })} disabled={disabled} className={controlClass} value={optionQuery} placeholder={t("componentInstance.searchOptions", { name: label })} onChange={event => setOptionQuery(event.target.value)} onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); setOptionQuery(""); } }} />}
    {options && optionQuery && !options.some(value => optionLabel(value).toLocaleLowerCase().includes(optionQuery.toLocaleLowerCase())) && <p role="status" className="text-[10px] text-ed-muted-foreground">{t("componentInstance.noMatchingOptions")}</p>}
    <div className="flex min-h-4 items-center justify-between gap-2 text-[10px] text-ed-muted-foreground">
      <span id={`${fieldId}-state`}>{t(`componentInstance.${previewStatus ? "draft" : source}`)}{!state.mixed && state.known && state.value === null && !bound && <span data-component-null-value> · {t("componentInstance.nullValue")}</span>}{control.kind === "readonly" && !bound ? ` · ${t("componentInstance.codeOnly")}` : ""}</span>
      {(canReset || canPin) && <button type="button" data-component-reset={canReset || undefined} data-component-pin={canPin || undefined} disabled={readOnly} aria-label={t(`componentInstance.${canReset ? "resetNamed" : "pinNamed"}`, { name: label })} className="shrink-0 hover:text-ed-foreground disabled:opacity-50" onClick={() => {
        if (readOnly) return;
        if (canReset) { onChange(name, prop, { reset: true }); setDraft(null); setError(false); document.getElementById(fieldId)?.focus(); }
        else commit(state.value);
      }}>{t(`componentInstance.${canReset ? "reset" : "pinValue"}`)}</button>}
    </div>
    {(error || invalid || missing) && <p id={`${fieldId}-error`} role="alert" className="text-[10px] text-red-500">{t(`componentInstance.${missing ? "requiredValue" : "invalidValue"}`)}{invalid ? `: ${String(state.value)}` : ""}</p>}
    {unavailable && <p id={`${fieldId}-unavailable`} role="status" className="text-[10px] text-ed-muted-foreground">{t("componentInstance.removedParameter")}</p>}
    {prop.description && <p id={`${fieldId}-description`} className="text-[10px] text-ed-muted-foreground">{prop.description}</p>}
    {metadataError && <p id={`${fieldId}-metadata`} role="alert" className="text-[10px] text-red-500">{t("componentInstance.metadataInvalid")} {metadataError}</p>}
    {hasConstraints && <p id={`${fieldId}-constraints`} className="text-[10px] text-ed-muted-foreground" data-component-number-constraints>{[prop.min !== undefined && t("componentInstance.minimum", { value: prop.min }), prop.max !== undefined && t("componentInstance.maximum", { value: prop.max }), prop.step !== undefined && t("componentInstance.step", { value: prop.step })].filter(Boolean).join(" · ")}</p>}
    {requiredResetHint && <p id={`${fieldId}-required`} className="text-[10px] text-ed-muted-foreground">{t("componentInstance.requiredResetHint")}</p>}
    {control.nullable && !options && !disabled && <button type="button" aria-label={t("componentInstance.setNullNamed", { name: label })} className="text-[10px] text-ed-muted-foreground hover:text-ed-foreground" onClick={() => commit(null)}>{t("componentInstance.setNull")}</button>}
    {(control.kind === "string" || control.kind === "color") && state.known && !state.mixed && state.value === null && !disabled && <button type="button" data-component-set-empty aria-label={t("componentInstance.setEmptyStringNamed", { name: label })} className="ml-2 text-[10px] text-ed-muted-foreground hover:text-ed-foreground" onClick={() => commit("")}>{t("componentInstance.setEmptyString")}</button>}
  </div>;
}

export function ComponentPropsPanel({ elements, componentIndex, readOnly, scanLoading, onRequestPropsScan, onUpdateElementProps, onUpdateMultipleElementsProps, onComponentSourceSaved, onOpenSource, onOpenComponent }) {
  const { t } = useTranslation("editor");
  const groupId = useId();
  const { store: previewStore, snapshot } = useComponentPreview();
  const requested = useRef(new Set<string>());
  const [retry, setRetry] = useState(0);
  const name = elements[0]?.componentName;
  const info = componentIndex?.[name];
  const compatible = elements.length > 0 && elements.every(element => element.type === "component" && element.componentName === name);
  const identityMismatch = elements.some(element => !componentIdentityMatches(element, info));
  readOnly = readOnly || identityMismatch;
  const baseSignature = JSON.stringify(elements.map(element => [element.id, element.props, element.componentEditing]));
  const metadataSignature = JSON.stringify(info);
  // A new selection, external edit, read-only transition or API update invalidates
  // this draft. Cleanup also prevents an unmounted panel from committing later.
  useLayoutEffect(() => () => previewStore?.cancel(), [previewStore, baseSignature, metadataSignature, readOnly]);
  useEffect(() => {
    if (!compatible || info?.props !== undefined || !onRequestPropsScan || scanLoading || requested.current.has(name)) return;
    requested.current.add(name);
    onRequestPropsScan(name);
  }, [compatible, info, name, onRequestPropsScan, scanLoading, retry]);
  if (!compatible) return <p className="border-b border-ed-border p-3 text-[11px] text-ed-muted-foreground">{t("componentInstance.incompatibleSelection")}</p>;
  const preview = snapshot && elements.every(element => snapshot.targets.has(element.id)) ? snapshot : null;
  const displayElements = preview ? elements.map(element => ({ ...element, props: preview.targets.get(element.id)!.after })) : elements;
  const declared = info?.props ?? {};
  const names = [...new Set([...Object.keys(declared), ...elements.flatMap(element => [...Object.keys(element.props ?? {}), ...Object.keys(element.sourceExpressions?.props ?? {})])])].filter(isPublicComponentProp);
  const props = names.filter(name => name !== "themeVariables" || info?.editing?.themeVariables !== "applied").map(name => [name, declared[name] ?? { type: "unknown", description: t(`componentInstance.${info?.props === undefined ? "unconfirmedParameter" : "removedParameter"}`) }] as const);
  const orderedProps = [...props].sort((a, b) => (a[1].order ?? Infinity) - (b[1].order ?? Infinity));
  const groups = props.some(([, prop]) => prop.group)
    ? ["appearance", "state", "content", "other"].map(key => ({ key, props: orderedProps.filter(([, prop]) => (["appearance", "state", "content", "other"].includes(prop.group) ? prop.group : "other") === key) })).filter(group => group.props.length)
    : [{ key: null, props: orderedProps }];
  const submit = (updater: (props: Record<string, unknown>) => Record<string, unknown>, onCommitted?: () => void, continuous = false) => {
    if (readOnly) return;
    // A different field must never publish an unconfirmed color gesture.
    const base = preview?.continuous ? elements : displayElements;
    const targets = elements.map((element, index) => ({ id: element.id, before: element.props ?? {}, after: updater(base[index].props ?? {}) }));
    if (targets.every(target => JSON.stringify(target.before) === JSON.stringify(target.after))) { previewStore?.cancel(); return; }
    const commit = () => {
      if (onUpdateMultipleElementsProps) onUpdateMultipleElementsProps(new Set(targets.map(target => target.id)), (current, id) => {
        const target = targets.find(target => target.id === id)!;
        if (!target || JSON.stringify(current) !== JSON.stringify(target.before)) throw new Error(t("componentInstance.previewChanged"));
        return target.after;
      });
      else if (targets.length === 1) onUpdateElementProps(targets[0].id, targets[0].after);
      onCommitted?.();
    };
    if (continuous) return previewStore?.preview(targets);
    if (previewStore) previewStore.start(targets, commit);
    else commit();
  };
  const change = (name: string, prop: ComponentProp, update: { value: PropValue } | { reset: true }, continuous = false) => submit(current => updateComponentProp(current, name, prop, update), undefined, continuous);
  const resettable = props.filter(([name, prop]) => componentPropControl(prop).kind !== "readonly" && canResetComponentProp(prop) && displayElements.some(element => hasOwn(element.props, name)) && !elements.some(element => element.sourceExpressions?.props?.[name] || element.sourceExpressions?.spread));
  const resetAll = () => {
    if (readOnly) return;
    const reset = current => resettable.reduce((next, [name, prop]) => updateComponentProp(next, name, prop, { reset: true }), current);
    const retained = props.filter(([name]) => !resettable.some(([resetName]) => resetName === name) && elements.some(element => hasOwn(element.props, name) || element.sourceExpressions?.props?.[name])).map(([name]) => name);
    submit(reset, () => { if (retained.length) toast.info(t("componentInstance.resetParamsRetained", { names: retained.join(", ") })); });
  };
  return <section data-component-parameters className="border-b border-ed-border px-3.5 py-3">
    {identityMismatch && <p data-component-identity-mismatch role="alert" className="mb-3 text-[11px] text-ed-muted-foreground">{t("componentInstance.identityMismatch")}</p>}
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-[11px] font-medium text-ed-foreground">{t("componentInstance.parameters")}</h3>
      {resettable.length > 0 && <button type="button" disabled={readOnly} title={t("componentInstance.resetParamsHint")} onClick={resetAll} className="text-[10px] text-ed-muted-foreground hover:text-ed-foreground disabled:opacity-50">{t("componentInstance.resetParameters")}</button>}
    </div>
    {preview && <div data-component-preview-status={preview.status} role={preview.status === "failed" ? "alert" : "status"} className="mb-3 text-[11px] text-ed-muted-foreground">
      <p>{t(`componentInstance.${preview.status === "failed" ? "previewFailed" : "previewPending"}`)}</p>
      {preview.error && <p className="break-words">{preview.error === "PREVIEW_TIMEOUT" ? t("componentInstance.previewTimeout") : preview.error}</p>}
      <button type="button" onClick={() => previewStore?.cancel()} className="mt-1 hover:text-ed-foreground">{t("componentInstance.discardDraft")}</button>
    </div>}
    {scanLoading && <p data-component-scan-state="loading" role="status" className="mb-2 text-[11px] text-ed-muted-foreground">{t("componentInstance.loading")}</p>}
    <div className="space-y-3">{groups.map(group => <div key={group.key ?? "ungrouped"} data-component-parameter-group={group.key ?? undefined} role={group.key ? "group" : undefined} aria-labelledby={group.key ? `${groupId}-${group.key}` : undefined} className="space-y-3">
      {group.key && <h4 id={`${groupId}-${group.key}`} className="text-[10px] font-medium text-ed-muted-foreground">{t(`componentInstance.groups.${group.key}`)}</h4>}
      {group.props.map(([name, prop]) => {
      const changed = preview && elements.some(element => {
        const after = preview.targets.get(element.id)!.after;
        return hasOwn(element.props, name) !== hasOwn(after, name) || !Object.is(element.props?.[name], after[name]);
      });
      return <ParameterField key={`${metadataSignature}:${readOnly}:${name}:${JSON.stringify(displayElements.map(element => [element.id, element.sourceExpressions?.props?.[name], element.sourceExpressions?.spread]))}`} name={name} descriptor={prop} elements={displayElements} readOnly={readOnly} onChange={change} previewStatus={changed ? preview!.status : undefined} unavailable={info?.props !== undefined && !hasOwn(declared, name)} />;
    })}</div>)}</div>
    {!scanLoading && info?.props === undefined && <p data-component-scan-state="unavailable" role="status" className="mt-2 text-[11px] text-ed-muted-foreground">{t("componentInstance.scanUnavailable")}</p>}
    {!props.length && !scanLoading && info?.props !== undefined && <p className="text-[11px] text-ed-muted-foreground">{t("componentInstance.noParameters")}</p>}
    {!scanLoading && info?.props === undefined && onRequestPropsScan && <button data-component-scan-retry className="mt-2 text-[11px] text-ed-muted-foreground hover:text-ed-foreground" type="button" onClick={() => { requested.current.delete(name); setRetry(value => value + 1); }}>{t("componentInstance.retry")}</button>}
    {elements.length === 1 && <ComponentSourcePanel key={elements[0].id} element={elements[0]} readOnly={readOnly} onComponentSourceSaved={onComponentSourceSaved} onOpenSource={onOpenSource} />}
    <ComponentStyleAdapterPanel key={name} componentName={name} info={info} readOnly={readOnly} onRequestPropsScan={onRequestPropsScan} onOpenSource={onOpenComponent ? path => onOpenComponent(name, path) : onOpenSource} />
    <ComponentStyleAdapterPanel key={`theme-${name}`} componentName={name} info={info} readOnly={readOnly} onRequestPropsScan={onRequestPropsScan} onOpenSource={onOpenComponent ? path => onOpenComponent(name, path) : onOpenSource} kind="theme" />
  </section>;
}
