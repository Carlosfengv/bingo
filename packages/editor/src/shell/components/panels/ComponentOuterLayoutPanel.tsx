import { useState } from "react";
import { useTranslation } from "@bingo/i18n";
import { componentStyleTarget } from "../../../../../compiler/src/store/componentEditing";
import { styleFieldLabel } from "./styles/primitives";
import { translateInspectorText } from "./styles/inspectorCopy";

const mainProperties = ["width", "height", "top", "right", "bottom", "left"];
const extraProperties = ["minWidth", "minHeight", "maxWidth", "maxHeight", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "transform", "transformOrigin", "zIndex"];

function OuterField({ property, elements, readOnly, update }) {
  const { t } = useTranslation("editor");
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const first = elements[0].styles?.[property];
  const mixed = elements.some(element => !Object.is(element.styles?.[property], first));
  const label = translateInspectorText(t, styleFieldLabel(property));
  const commit = () => {
    if (readOnly || draft === null) return;
    let value = draft.trim();
    if (value && /^-?(?:\d+\.?\d*|\.\d+)$/.test(value) && property !== "zIndex") value += "px";
    const cssName = property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    if (value && !CSS.supports(cssName, value)) { setInvalid(true); return; }
    update(property, value || undefined); setDraft(null); setInvalid(false);
  };
  return <label className="min-w-0 space-y-1 text-[10px] text-ed-muted-foreground">
    <span>{label}</span>
    <input data-outer-layout-property={property} aria-label={`${t("componentInstance.outerLayout")} · ${label}`} aria-invalid={invalid || undefined} disabled={readOnly}
      className="h-7 w-full min-w-0 rounded-md border border-ed-border bg-ed-input px-2 text-[11px] text-ed-foreground disabled:opacity-50"
      value={draft ?? (mixed ? "" : String(first ?? ""))} placeholder={mixed ? t("componentInstance.mixed") : "auto"}
      onChange={event => { setDraft(event.target.value); setInvalid(false); }} onBlur={commit}
      onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); setDraft(null); setInvalid(false); } if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.blur(); } }} />
    {invalid && <span role="alert">{t("componentInstance.invalidStyle")}</span>}
  </label>;
}

/** Only edit a wrapper that the existing renderer already creates. */
export function ComponentOuterLayoutPanel({ elements, readOnly, onUpdateMultipleElementsStyles }) {
  const { t } = useTranslation("editor");
  const update = (property: string, value?: string) => {
    if (readOnly || !elements.every(element => componentStyleTarget(element.styles, property) === "outer")) return;
    onUpdateMultipleElementsStyles(new Set(elements.map(element => element.id)), styles => {
      const next = { ...styles };
      if (value === undefined) delete next[property]; else next[property] = value;
      return next;
    });
  };
  const field = (property: string) => <OuterField key={`${property}:${JSON.stringify(elements.map(element => [element.id, element.styles?.[property]]))}`} property={property} elements={elements} readOnly={readOnly} update={update} />;
  return <section data-component-outer-layout className="border-b border-ed-border px-3.5 py-3">
    <h3 className="text-[11px] font-medium text-ed-foreground">{t("componentInstance.outerLayout")}</h3>
    <p className="my-2 text-[10px] text-ed-muted-foreground">{t("componentInstance.outerLayoutHint")}</p>
    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>{mainProperties.map(field)}</div>
    <details className="mt-2 text-[10px] text-ed-muted-foreground"><summary>{t("componentInstance.moreLayout")}</summary><div className="mt-2 grid gap-2" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>{extraProperties.map(field)}</div></details>
  </section>;
}
