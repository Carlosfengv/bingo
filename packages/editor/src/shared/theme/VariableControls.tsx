import * as React from "react";
import { useTranslation } from "@bingo/i18n";
import { AddVariableIcon, Popover, PopoverContent, PopoverTrigger } from "@bingo/ui";
import { canBindVariable, variableTypeForProperty } from "../../../../compiler/src/runtime/variables";
import { useVariables, useVariableEditor, useVariableSnapshot } from "./VariableContext";

export const variableInputClass = "h-7 min-w-0 rounded-md border border-ed-border bg-ed-background px-2 text-xs text-ed-foreground outline-none focus-visible:ring-2 focus-visible:ring-ed-canvas-selection";
export const variableButtonClass = "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md px-2 text-xs text-ed-foreground hover:bg-ed-muted disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ed-canvas-selection";

export function VariableField({ property, children }) {
  const editor = useVariableEditor();
  if (!editor || !variableTypeForProperty(property)) return children;
  const bound = editor.ids.some(id => editor.bindingFor(id, property));
  return bound ? <VariableBindingControl property={property} /> : <div className="flex min-w-0 items-center gap-1"><div className="min-w-0 flex-1">{children}</div><VariableBindingControl property={property} compact /></div>;
}

export function VariablesButton({ className = "" }) {
  const variables = useVariables();
  const { t } = useTranslation("editor");
  if (!variables) return null;
  return <button type="button" className={`${variableButtonClass} ${className}`} onClick={() => variables.openManager()} title={t("variables.manage")}><AddVariableIcon className="size-3.5" />{t("variables.title")}</button>;
}

export function VariableModeControls({ page = false }) {
  const variables = useVariables();
  const editor = useVariableEditor();
  const { t } = useTranslation("editor");
  if (!variables || !editor) return null;
  const selected = page ? [] : editor.ids;
  const colorCollectionIds = new Set(variables.library.tokens.filter(token => token.type === "color").map(token => token.collectionId));
  const colorCollections = variables.library.collections.filter(collection => colorCollectionIds.has(collection.id));
  const collection = colorCollections.find(collection => collection.id === "project-styles") || colorCollections.find(collection => collection.sourceRef?.kind === "css") || colorCollections[0];
  if (!collection) return null;
  const explicit = page ? [editor.pageModes[collection.id] || ""] : selected.map(id => editor.store.byId.get(id)?.theme?.localCollectionModes?.[collection.id] || "");
  const mixed = new Set(explicit).size > 1;
  const resolved = page ? { modes: { [collection.id]: collection.defaultModeId }, sources: { [collection.id]: null } } : editor.resolveModes(editor.store.parentByChild.get(selected[0]) || null);
  const modeName = collection.modes.find(mode => mode.id === resolved.modes[collection.id])?.name || collection.modes.find(mode => mode.id === resolved.modes[collection.id])?.label || resolved.modes[collection.id];
  const sourceId = resolved.sources[collection.id];
  const source = sourceId === "PAGE" ? t("variables.page") : editor.store.byId.get(sourceId)?.name || sourceId || t("variables.default");
  const value = mixed ? "__mixed" : explicit[0] || "";
  return <div className="flex min-w-0 flex-col gap-2" data-variable-mode-controls="">
    {variables.error && <div role="alert" className="text-xs text-red-500">{variables.error} <button type="button" onClick={variables.reload}>{t("variables.reload")}</button></div>}
    <label style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr)" }} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-center gap-2 text-xs" title={`${t("variables.inherit")} ${source}`}>
      <span className="truncate text-ed-foreground-secondary">{t("variables.colorMode")}</span>
      <select aria-label={t("variables.colorMode")} className={`${variableInputClass} w-full`} value={value} disabled={editor.readOnly || variables.status === "loading"} onChange={event => editor.setMode(collection.id, event.target.value || null, page)}>
        {mixed && <option value="__mixed" disabled>{t("variables.mixed")}</option>}
        <option value="">{t(page ? "variables.default" : "variables.auto")} · {modeName}</option>
        {value && value !== "__mixed" && !collection.modes.some(mode => mode.id === value) && <option value={value} disabled>{t("variables.unavailable")}</option>}
        {collection.modes.map(mode => <option key={mode.id} value={mode.id}>{mode.name || mode.label || mode.id}</option>)}
      </select>
    </label>
  </div>;
}

export function VariableBindingControl({ property, compact = false }) {
  const variables = useVariables();
  const editor = useVariableEditor();
  const { t } = useTranslation("editor");
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [collectionId, setCollectionId] = React.useState("");
  if (!variables || !editor?.ids.length || !variableTypeForProperty(property)) return null;
  const bindings = editor.ids.map(id => editor.bindingFor(id, property));
  const binding = bindings[0];
  const mixed = new Set(bindings.map(binding => `${binding?.tokenId || ""}:${binding?.alpha ?? 1}`)).size > 1;
  const token = variables.library.tokens.find(token => token.id === binding?.tokenId);
  const values = binding ? editor.ids.map(id => editor.resolve(id).values[binding.tokenId]) : [];
  const valuesMixed = new Set(values).size > 1;
  const resolved = open ? editor.resolve(editor.ids[0]) : null;
  const candidates = open ? variables.library.tokens.filter(token => canBindVariable(token, property) && (!collectionId || token.collectionId === collectionId) && (token.name || token.id).toLowerCase().includes(query.toLowerCase())) : [];
  const label = mixed ? t("variables.mixed") : token?.name || token?.id || t(binding ? "variables.unavailable" : "variables.bind");
  return <Popover open={open} onOpenChange={setOpen} modal={false}>
    <PopoverTrigger asChild><button type="button" aria-label={`${t("variables.bind")} · ${property}`} title={valuesMixed ? t("variables.resolvedMixed") : label} disabled={editor.readOnly} style={compact ? { width: 24, height: 24, padding: 4 } : { maxWidth: "100%" }} className={`${variableButtonClass} ${compact ? "!size-6 !p-1" : "max-w-full justify-start border border-ed-border"}`} data-variable-property={property}>
      <AddVariableIcon className="size-3.5 shrink-0" />{!compact && <span className="truncate">{label}</span>}
    </button></PopoverTrigger>
    {open && <PopoverContent align="end" style={{ width: 288 }} className="w-72 overflow-hidden border-ed-border bg-ed-popover p-0 text-ed-foreground" data-text-edit-safe="true">
      <div className="flex flex-col gap-2 border-b border-ed-border p-2">
        <input aria-label={t("variables.search")} placeholder={t("variables.search")} className={variableInputClass} value={query} onChange={event => setQuery(event.target.value)} />
        <select aria-label={t("variables.collection")} className={variableInputClass} value={collectionId} onChange={event => setCollectionId(event.target.value)}><option value="">{t("variables.all")}</option>{variables.library.collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name || collection.id}</option>)}</select>
      </div>
      <div className="max-h-64 overflow-y-auto p-1" role="listbox" aria-label={t("variables.title")}>
        {candidates.map(candidate => {
          const value = resolved?.values[candidate.id];
          return <button type="button" role="option" aria-selected={!mixed && candidate.id === token?.id} key={candidate.id} disabled={value === undefined} onClick={() => { editor.bind(property, candidate.id); setOpen(false); }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-ed-muted disabled:opacity-40">
            {candidate.type === "color" ? <span className="size-4 shrink-0 rounded-sm border border-ed-border" style={{ backgroundColor: value }} /> : <span className="w-4 text-center text-ed-muted-foreground">#</span>}
            <span className="min-w-0 flex-1 truncate">{candidate.name || candidate.id}</span><span className="max-w-20 truncate text-[10px] text-ed-muted-foreground">{value === undefined ? t("variables.unavailable") : String(value)}</span>
          </button>;
        })}
        {!candidates.length && <p className="p-3 text-xs text-ed-muted-foreground">{t("variables.noMatches")}</p>}
      </div>
      <div className="flex flex-col gap-1 border-t border-ed-border p-2">
        {binding && !mixed && token?.type === "color" && <label className="flex items-center justify-between gap-2 text-xs">{t("variables.opacity")}<input type="number" min="0" max="100" aria-label={`${t("variables.opacity")} · ${property}`} className={`${variableInputClass} w-20`} defaultValue={(binding.alpha ?? 1) * 100} key={`${binding.tokenId}:${binding.alpha}`} onBlur={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0 && value <= 100) editor.bind(property, token.id, value / 100); }} /></label>}
        {bindings.some(Boolean) && <button type="button" disabled={bindings.some((binding, index) => binding && editor.resolve(editor.ids[index]).values[binding.tokenId] === undefined)} className={`${variableButtonClass} justify-start`} onClick={() => { editor.detach(property); setOpen(false); }}>{t("variables.detach")}</button>}
        <button type="button" className={`${variableButtonClass} justify-start`} onClick={() => { variables.openManager(token?.id); setOpen(false); }}>{t(token ? "variables.edit" : "variables.manage")}</button>
      </div>
    </PopoverContent>}
  </Popover>;
}

export function VariableLayerBadge({ element }) {
  const variables = useVariableSnapshot();
  if (!variables) return null;
  const entries = Object.entries(element.theme?.localCollectionModes || {});
  if (!entries.length) return null;
  const labels = entries.map(([collectionId, modeId]) => {
    const collection = variables.library.collections.find(item => item.id === collectionId);
    const mode = collection?.modes.find(item => item.id === modeId);
    return `${collection?.name || collectionId}: ${mode?.name || mode?.label || modeId}`;
  });
  return <span title={labels.join("\n")} className="ml-2 max-w-24 truncate rounded border border-ed-border px-1 text-[10px] text-ed-muted-foreground">{labels.length === 1 ? labels[0].split(": ").slice(1).join(": ") : `${labels.length} modes`}</span>;
}
