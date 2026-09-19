import * as React from "react";
import { useTranslation } from "@bingo/i18n";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@bingo/ui";
import { Plus, Undo2, Redo2, Copy, ArrowLeft, ArrowRight, Star, Trash2 } from "lucide-react";
import { useVariables, useVariableEditor } from "./VariableContext";
import { variableButtonClass as button, variableInputClass as input } from "./VariableControls";

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const scopeGroups = {
  color: { background: ["backgroundColor", "fill"], text: ["color", "textDecorationColor"], border: ["borderColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outlineColor", "stroke"] },
  number: { size: ["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight"], spacing: ["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "gap", "rowGap", "columnGap"], radius: ["borderRadius", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"], text: ["fontSize", "fontWeight", "letterSpacing", "lineHeight"], opacity: ["opacity"] },
};

function EditableText({ value, onCommit, label, className = "", disabled = false }) {
  const [draft, setDraft] = React.useState(String(value ?? ""));
  React.useEffect(() => { setDraft(String(value ?? "")); }, [value]);
  return <input aria-label={label} className={`${input} ${className}`} value={draft} disabled={disabled} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") { setDraft(String(value ?? "")); event.stopPropagation(); }
  }} onBlur={() => { if (draft !== String(value ?? "")) onCommit(draft); }} />;
}

function VariableValueCell({ token, mode, disabled, onCommit, tokens }) {
  const { t } = useTranslation("editor");
  const value = token.valuesByMode[mode.id];
  const [aliasOpen, setAliasOpen] = React.useState(value?.kind === "alias");
  const [error, setError] = React.useState("");
  React.useEffect(() => setAliasOpen(value?.kind === "alias"), [value?.kind]);
  const aliases = tokens.filter(candidate => candidate.type === token.type && candidate.id !== token.id);
  const label = `${token.name || token.id} · ${mode.name || mode.label || mode.id}`;
  const saveValue = text => {
    const next = token.type === "number" && !token.sourceNumber ? Number(text) : token.type === "boolean" ? text === "true" : text.trim();
    const previewColor = token.bindingTemplate ? token.bindingTemplate.replace(/var\(--[^)]+\)/, text).replace(/\$variable/g, text) : text;
    if (token.type === "color" && !CSS.supports("color", previewColor)) { setError(t("variables.invalidColor")); return; }
    if (token.type === "number" && (!text.trim() || (token.sourceNumber ? !CSS.supports("width", text.trim()) : !Number.isFinite(next)))) { setError(t("variables.invalidNumber")); return; }
    setError(""); onCommit({ kind: "literal", value: next });
  };
  const preview = value?.kind === "literal" ? token.bindingTemplate ? token.bindingTemplate.replace(/var\(--[^)]+\)/, String(value.value)).replace(/\$variable/g, String(value.value)) : value.value : undefined;
  return <div className="flex min-w-0 flex-col gap-1">
    <div className="flex min-w-0 items-center gap-1">
      {aliasOpen ? <select aria-label={`${t("variables.alias")} · ${label}`} className={`${input} w-full`} value={value?.tokenId || ""} disabled={disabled} onChange={event => { if (event.target.value) onCommit({ kind: "alias", tokenId: event.target.value }); }}>
        <option value="" disabled>{t("variables.alias")}</option>{aliases.map(alias => <option key={alias.id} value={alias.id}>{alias.name || alias.id}</option>)}
      </select> : <>
        {token.type === "color" && <span className="size-4 shrink-0 rounded-sm border border-ed-border" style={{ backgroundColor: preview }} />}
        <EditableText value={value?.value} label={label} disabled={disabled} className="w-full border-transparent bg-transparent hover:border-ed-border focus:border-ed-border" onCommit={saveValue} />
      </>}
      <button type="button" className={`${button} !px-1 text-ed-muted-foreground`} disabled={disabled} aria-label={`${t(aliasOpen ? "variables.literal" : "variables.alias")} · ${label}`} title={t(aliasOpen ? "variables.literal" : "variables.alias")} onClick={() => setAliasOpen(!aliasOpen)}>{aliasOpen ? "=" : "↗"}</button>
    </div>
    {value?.inheritedFromModeId && <span className="text-[10px] text-ed-muted-foreground">{t("variables.inheritedValue")}</span>}
    {error && <span role="alert" className="text-[11px] text-red-500">{error}</span>}
  </div>;
}

export function VariableManager() {
  const variables = useVariables();
  const [collectionId, setCollectionId] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState("");
  const [group, setGroup] = React.useState("");
  const [detailId, setDetailId] = React.useState<string | null>(null);
  React.useEffect(() => {
    const token = variables?.library.tokens.find(token => token.id === variables.focusTokenId);
    if (token) { setCollectionId(token.collectionId); setQuery(""); setGroup(""); setDetailId(token.id); }
  }, [variables?.focusTokenId, variables?.managerOpen]);
  // Keep filters between openings; the closed manager never subscribes to
  // selection or builds the token table.
  if (!variables?.managerOpen) return null;
  return <VariableManagerContent {...{ variables, collectionId, setCollectionId, query, setQuery, type, setType, group, setGroup, detailId, setDetailId }} />;
}

function VariableManagerContent({ variables, collectionId, setCollectionId, query, setQuery, type, setType, group, setGroup, detailId, setDetailId }) {
  const editor = useVariableEditor();
  const { t } = useTranslation("editor");
  const library = variables.library;
  const collection = library.collections.find(item => item.id === collectionId) || library.collections[0];
  const sourceCollection = collection?.sourceRef?.kind === "css";
  const tokens = library.tokens.filter(token => token.collectionId === collection?.id);
  const groups = [...new Set(tokens.map(token => (token.name || "").includes("/") ? token.name.split("/")[0] : "").filter(Boolean))] as string[];
  const visible = tokens.filter(token => (!type || token.type === type) && (!group || token.name?.startsWith(`${group}/`)) && `${token.name || token.id} ${JSON.stringify(token.valuesByMode)}`.toLowerCase().includes(query.toLowerCase()));
  const detail = library.tokens.find(token => token.id === detailId);
  const disabled = editor?.readOnly || variables.status === "loading" || variables.status === "saving" || !variables.source;
  const edit = transform => { if (!disabled) void variables.edit(transform); };
  const updateToken = (id, patch) => edit(next => { Object.assign(next.tokens.find(token => token.id === id), patch); return next; });
  const addCollection = () => {
    const id = newId("collection"), modeId = newId("mode");
    edit(next => { next.collections.push({ id, name: library.collections.length ? `${t("variables.collection")} ${library.collections.length + 1}` : "Colors", defaultModeId: modeId, modes: [{ id: modeId, name: "Light" }] }); return next; });
    setCollectionId(id); setGroup("");
  };
  const addVariable = variableType => {
    if (!collection) return;
    const id = newId("variable");
    edit(next => { next.tokens.push({ id, name: `${group ? `${group}/` : ""}${variableType}/${tokens.length + 1}`, collectionId: collection.id, type: variableType, cssName: id, valuesByMode: Object.fromEntries(collection.modes.map(mode => [mode.id, { kind: "literal", value: variableType === "color" ? "#FFFFFF" : 8 }])) }); return next; });
  };
  const addMode = sourceId => {
    const id = newId("mode");
    edit(next => {
      const target = next.collections.find(item => item.id === collection.id);
      const source = target.modes.find(mode => mode.id === sourceId) || target.modes[0];
      target.modes.push({ id, name: `${source.name || source.label || "Mode"} ${target.modes.length + 1}` });
      next.tokens.filter(token => token.collectionId === collection.id).forEach(token => { token.valuesByMode[id] = structuredClone(token.valuesByMode[source.id]); });
      return next;
    });
  };
  const moveMode = (modeId, offset, makeDefault = false) => edit(next => {
    const target = next.collections.find(item => item.id === collection.id);
    const from = target.modes.findIndex(mode => mode.id === modeId);
    const to = makeDefault ? 0 : Math.max(0, Math.min(target.modes.length - 1, from + offset));
    target.modes.splice(to, 0, target.modes.splice(from, 1)[0]); target.defaultModeId = target.modes[0].id;
    return next;
  });
  const usedLocally = (tokenId?, modeId?) => editor && [...editor.store.byId.values()].some((element: any) => tokenId ? element.theme?.bindings?.some(binding => binding.tokenId === tokenId) : Object.values(element.theme?.localCollectionModes || {}).includes(modeId));
  return <Dialog open={variables.managerOpen} onOpenChange={open => { if (!open) variables.closeManager(); }}>
    <DialogContent style={{ width: "min(1100px, 94vw)", height: "min(720px, 88vh)", maxWidth: "94vw" }} className="flex h-[min(720px,88vh)] w-[min(1100px,94vw)] max-w-none flex-col gap-0 overflow-hidden border-ed-border bg-ed-background p-0 text-ed-foreground sm:max-w-none" data-text-edit-safe="true" onKeyDown={event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) { event.preventDefault(); event.stopPropagation(); void (event.shiftKey ? variables.redo() : variables.undo()); }
    }}>
      <div className="flex shrink-0 items-center justify-between border-b border-ed-border px-5 py-3 pr-12">
        <DialogTitle className="text-sm font-semibold">{t("variables.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("variables.empty")}</DialogDescription>
        <div className="flex items-center gap-1"><span role="status" className="mr-3 text-[11px] text-ed-muted-foreground">{variables.status === "saving" ? t("variables.saving") : variables.status === "ready" ? t("variables.saved") : ""}</span>
          <button type="button" aria-label={t("variables.undo")} title={t("variables.undo")} className={button} disabled={disabled || !variables.canUndo} onClick={variables.undo}><Undo2 className="size-3.5" /></button>
          <button type="button" aria-label={t("variables.redo")} title={t("variables.redo")} className={button} disabled={disabled || !variables.canRedo} onClick={variables.redo}><Redo2 className="size-3.5" /></button>
        </div>
      </div>
      {variables.error && <div role="alert" className="flex shrink-0 items-center justify-between gap-3 border-b border-ed-border px-5 py-2 text-xs text-red-500"><span>{variables.error}</span><button type="button" className={button} onClick={variables.reload}>{t("variables.reload")}</button></div>}
      {variables.cssSource && <p className="border-b border-ed-border px-5 py-2 text-xs text-ed-muted-foreground">{t("variables.cssSourceDetected", { count: variables.library.tokens.filter(token => token.sourceRef?.kind === "css").length })}</p>}
      {!!variables.sourceWarnings?.length && <p className="border-b border-ed-border px-5 py-2 text-xs text-amber-500">{t("variables.sourceWarnings", { count: variables.sourceWarnings.length })}</p>}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-48 shrink-0 flex-col gap-1 overflow-y-auto border-r border-ed-border p-3">
          <span className="px-2 py-2 text-[11px] font-medium text-ed-muted-foreground">{t("variables.collection")}</span>
          {library.collections.map(item => <button type="button" key={item.id} className={`${button} justify-start truncate ${collection?.id === item.id ? "bg-ed-muted font-medium" : ""}`} onClick={() => { setCollectionId(item.id); setGroup(""); }}>{item.name || item.id}{item.sourceRef?.kind === "css" && <span className="ml-auto text-[9px] text-ed-muted-foreground">{t("variables.code")}</span>}</button>)}
          <button type="button" className={`${button} justify-start text-ed-muted-foreground`} disabled={disabled} onClick={addCollection}><Plus className="size-3.5" />{t("variables.newCollection")}</button>
          {groups.length > 0 && <div className="mt-4 flex flex-col gap-1 border-t border-ed-border pt-3"><button type="button" className={`${button} justify-start ${!group ? "bg-ed-muted" : ""}`} onClick={() => setGroup("")}>{t("variables.all")}</button>{groups.map(name => <button type="button" className={`${button} justify-start truncate ${name === group ? "bg-ed-muted" : ""}`} key={name} onClick={() => setGroup(name)}>{name}</button>)}</div>}
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          {!collection ? <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"><p className="max-w-sm text-sm leading-6 text-ed-muted-foreground">{t("variables.empty")}</p><button type="button" className={`${button} border border-ed-border`} disabled={disabled} onClick={addCollection}><Plus className="size-3.5" />{t("variables.newCollection")}</button></div> : <>
            <div className="flex flex-wrap items-center gap-2 border-b border-ed-border p-3">
              <EditableText label={t("variables.collection")} className="w-36 border-transparent font-medium" value={collection.name || collection.id} disabled={disabled || sourceCollection} onCommit={name => { if (name.trim()) edit(next => { next.collections.find(item => item.id === collection.id).name = name.trim(); return next; }); }} />
              <input aria-label={t("variables.search")} placeholder={t("variables.search")} value={query} onChange={event => setQuery(event.target.value)} className={`${input} min-w-28 flex-1`} />
              <select aria-label={t("variables.scope")} className={input} value={type} onChange={event => setType(event.target.value)}><option value="">{t("variables.all")}</option><option value="color">{t("variables.color")}</option><option value="number">{t("variables.number")}</option></select>
              <button type="button" className={button} disabled={disabled || sourceCollection} onClick={() => addMode(collection.defaultModeId)}><Plus className="size-3.5" />{t("variables.newMode")}</button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse text-xs"><thead className="sticky top-0 z-10 bg-ed-background"><tr>
                <th className="min-w-48 border-b border-r border-ed-border px-4 py-3 text-left font-medium">{t("variables.name")}</th>
                {collection.modes.map((mode, index) => <th key={mode.id} className="min-w-48 border-b border-r border-ed-border p-2 text-left font-medium">
                  <div className="flex items-center gap-1"><EditableText label={`${t("variables.modes")} · ${mode.name || mode.id}`} className="w-full border-transparent" value={mode.name || mode.label || mode.id} disabled={disabled || sourceCollection} onCommit={name => { if (name.trim()) edit(next => { next.collections.find(item => item.id === collection.id).modes.find(item => item.id === mode.id).name = name.trim(); return next; }); }} />{index === 0 && <span className="shrink-0 whitespace-nowrap text-[10px] text-ed-muted-foreground">{t("variables.default")}</span>}</div>
                  <div className="flex items-center gap-0.5 text-ed-muted-foreground">{[
                    [Star, "setDefault", () => moveMode(mode.id, 0, true), index === 0],
                    [ArrowLeft, "moveLeft", () => moveMode(mode.id, -1), index === 0],
                    [ArrowRight, "moveRight", () => moveMode(mode.id, 1), index === collection.modes.length - 1],
                    [Copy, "duplicate", () => addMode(mode.id), false],
                    [Trash2, "remove", () => edit(next => { const target = next.collections.find(item => item.id === collection.id); target.modes = target.modes.filter(item => item.id !== mode.id); target.defaultModeId = target.modes[0].id; next.tokens.filter(token => token.collectionId === collection.id).forEach(token => delete token.valuesByMode[mode.id]); return next; }), collection.modes.length < 2 || usedLocally(undefined, mode.id) || Object.values(editor?.pageModes || {}).includes(mode.id)],
                  ].map(([Icon, key, action, unavailable]: any) => <button type="button" key={key} className={`${button} !h-6 !px-1.5`} aria-label={`${t(`variables.${key}`)} · ${mode.name || mode.id}`} title={t(`variables.${key}`)} disabled={disabled || sourceCollection || unavailable} onClick={action}><Icon className="size-3" /></button>)}</div>
                </th>)}
              </tr></thead><tbody>
                {visible.map(token => <tr key={token.id} className="group hover:bg-ed-muted/30">
                  <td className="border-b border-r border-ed-border/60 px-3 py-2"><div className="flex items-center gap-1"><EditableText label={`${t("variables.name")} · ${token.name || token.id}`} value={token.name || token.id} className="w-full border-transparent bg-transparent" disabled={disabled || token.sourceRef?.kind === "css"} onCommit={name => { if (name.trim()) updateToken(token.id, { name: name.trim() }); }} /><button type="button" className={`${button} !px-1`} aria-label={`${t("variables.edit")} · ${token.name || token.id}`} onClick={() => setDetailId(detailId === token.id ? null : token.id)}>···</button></div></td>
                  {collection.modes.map(mode => <td key={mode.id} className="border-b border-r border-ed-border/60 px-3 py-2"><VariableValueCell token={token} mode={mode} disabled={disabled || token.sourceRef?.writable === false} tokens={library.tokens} onCommit={value => edit(next => { next.tokens.find(item => item.id === token.id).valuesByMode[mode.id] = value; return next; })} /></td>)}
                </tr>)}
              </tbody></table>
              {!visible.length && <p className="p-6 text-xs text-ed-muted-foreground">{t("variables.noMatches")}</p>}
            </div>
            <div className="flex shrink-0 gap-2 border-t border-ed-border p-3">{sourceCollection ? <span className="text-[11px] text-ed-muted-foreground">{t("variables.sourceManagedByCode")}</span> : <><button type="button" className={button} disabled={disabled} onClick={() => addVariable("color")}><Plus className="size-3.5" />{t("variables.color")}</button><button type="button" className={button} disabled={disabled} onClick={() => addVariable("number")}><Plus className="size-3.5" />{t("variables.number")}</button></>}</div>
          </>}
        </main>
        {detail && <aside className="flex w-56 shrink-0 flex-col gap-3 overflow-auto border-l border-ed-border p-4">
          <div className="flex items-center justify-between"><span className="text-xs font-medium">{t("variables.edit")}</span><button type="button" className={button} onClick={() => setDetailId(null)}>{t("variables.close")}</button></div>
          {detail.sourceRef?.kind === "css" && <div className="rounded-md bg-ed-muted px-2 py-2 text-[11px] leading-5 text-ed-muted-foreground"><div>{t("variables.sourceVariable")}</div><div className="truncate" title={Object.values(detail.sourceRef.modes || {}).find((mode: any) => mode.file)?.file}>{Object.values(detail.sourceRef.modes || {}).find((mode: any) => mode.file)?.file || t("variables.multipleFiles")}</div></div>}
          <label className="flex flex-col gap-1 text-xs">{t("variables.description")}<EditableText label={t("variables.description")} value={detail.description || ""} disabled={disabled || detail.sourceRef?.kind === "css"} onCommit={description => updateToken(detail.id, { description })} /></label>
          <fieldset className="flex flex-col gap-2 text-xs" disabled={disabled || detail.sourceRef?.kind === "css"}><legend className="mb-2">{t("variables.scope")}</legend>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!detail.scopes?.length || detail.scopes.includes("all")} onChange={() => updateToken(detail.id, { scopes: detail.scopes?.length ? [] : Object.values(scopeGroups[detail.type] || {}).flat() })} />{t("variables.allProperties")}</label>
            {Object.entries(scopeGroups[detail.type] || {}).map(([name, properties]: [string, string[]]) => <label key={name} className="flex items-center gap-2"><input type="checkbox" checked={!detail.scopes?.length || detail.scopes.includes("all") || properties.every(property => detail.scopes.includes(property))} onChange={event => {
              const current = !detail.scopes?.length || detail.scopes.includes("all") ? Object.values(scopeGroups[detail.type]).flat() as string[] : detail.scopes;
              const scopes = event.target.checked ? [...new Set([...current, ...properties])] : current.filter(property => !properties.includes(property));
              updateToken(detail.id, { scopes: scopes.length ? scopes : ["none"] });
            }} />{t(`variables.scopeLabels.${name}`)}</label>)}
          </fieldset>
          <button type="button" className={`${button} justify-start text-red-500`} disabled={disabled || detail.sourceRef?.kind === "css" || usedLocally(detail.id) || library.tokens.some(token => Object.values(token.valuesByMode).some((value: any) => value.kind === "alias" && value.tokenId === detail.id))} onClick={() => { edit(next => { next.tokens = next.tokens.filter(token => token.id !== detail.id); next.requiredTokenIds = (next.requiredTokenIds || []).filter(id => id !== detail.id); return next; }); setDetailId(null); }}><Trash2 className="size-3.5" />{t("variables.remove")}</button>
        </aside>}
      </div>
    </DialogContent>
  </Dialog>;
}
