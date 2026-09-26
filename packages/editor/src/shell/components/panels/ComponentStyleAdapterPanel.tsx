import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "@bingo/i18n";
import { useBackendOptional } from "../../../backends/BackendContext";

// A definition write outlives an individual selection. Keep its result for this
// backend session so reselecting an instance cannot offer the same write again.
const changesByBackend = new WeakMap();
function changeFor(backend, key) {
  let changes = backend && changesByBackend.get(backend);
  if (!changes) {
    changes = new Map();
    if (backend) changesByBackend.set(backend, changes);
  }
  if (!changes.has(key)) {
    const listeners = new Set<() => void>();
    let value = null;
    changes.set(key, {
      getSnapshot: () => value,
      subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
      set: next => { value = next; for (const listener of listeners) listener(); },
    });
  }
  return changes.get(key);
}

/** A reviewed definition change, intentionally separate from instance editing. */
export function ComponentStyleAdapterPanel({ componentName, info, readOnly, onRequestPropsScan, onOpenSource, kind = "style" }) {
  const { t } = useTranslation("editor");
  const backend = useBackendOptional();
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const change = useMemo(() => changeFor(backend, `${kind}:${componentName}`), [backend, kind, componentName]);
  const saved = useSyncExternalStore(change.subscribe, change.getSnapshot, change.getSnapshot);
  const theme = kind === "theme";
  const prefix = theme ? "themeAdapter" : "adapter";
  const status = info?.editing?.[theme ? "themeVariables" : "styleNormalization"];
  const label = suffix => t(`componentInstance.${prefix}${suffix}`);
  const applied = status === "applied" && !info?.runtimeError;
  const identityChanged = saved && info?.path && (saved.filePath !== info.path || saved.exportName !== (info.exportName || componentName));
  useEffect(() => {
    if (identityChanged || applied) change.set(null);
    else if (saved && saved.stage !== "writing" && info?.runtimeError && saved.error !== info.runtimeError) {
      change.set({ ...saved, stage: "failed", error: info.runtimeError });
    }
  }, [change, saved, identityChanged, applied, info?.runtimeError]);
  useEffect(() => {
    if (!saved || !["waiting", "refreshing"].includes(saved.stage)) return;
    const timer = setTimeout(() => {
      if (change.getSnapshot() === saved) change.set({ ...saved, stage: "failed", error: t("componentInstance.adapterRefreshUnconfirmed") });
    }, 15000);
    return () => clearTimeout(timer);
  }, [change, saved, t]);
  const refresh = async written => {
    const pending = { ...written, stage: "refreshing", error: "" };
    change.set(pending);
    try {
      const result = await onRequestPropsScan?.(componentName);
      if (change.getSnapshot() !== pending) return;
      change.set({ ...pending, stage: result?.success ? "waiting" : "failed", error: result?.error || (result?.success ? "" : t("componentInstance.adapterRefreshUnconfirmed")) });
    } catch (cause) {
      if (change.getSnapshot() === pending) change.set({ ...pending, stage: "failed", error: String(cause) });
    }
  };
  if (!backend?.adaptComponentStyle) return null;
  if (applied) return <p {...{ [theme ? "data-component-theme-adapted" : "data-component-style-adapted"]: true }} role="status" className="mt-3 text-[10px] text-ed-muted-foreground">{label("Applied")}</p>;
  if (saved && !identityChanged) return <div data-component-adapter-state={saved.stage} data-component-adapter-kind={kind} className="mt-3 border-t border-ed-border pt-3 text-[10px] text-ed-muted-foreground">
    <p role="status">{t(`componentInstance.${saved.stage === "writing" ? "adapterSaving" : saved.stage === "failed" ? "adapterRefreshFailed" : "adapterRefreshing"}`)}</p>
    <p className="mt-1 break-words">{saved.filePath}</p>
    {onOpenSource && <button type="button" data-component-adapter-open-source onClick={() => onOpenSource(saved.filePath)} className="mt-1 hover:text-ed-foreground">{t("propsPanel.openComponentFile")}</button>}
    {saved.error && <p role="alert" className="mt-2 break-words">{saved.error}</p>}
    {saved.stage === "failed" && onRequestPropsScan && <button type="button" data-component-adapter-retry className="mt-2 hover:text-ed-foreground" onClick={() => { if (change.getSnapshot() === saved) void refresh(saved); }}>{t("componentInstance.adapterRetryRefresh")}</button>}
  </div>;
  if (status !== "available") return null;
  const run = async (apply = false) => {
    if (readOnly || busyRef.current || change.getSnapshot() || apply && !proposal) return;
    busyRef.current = true; setBusy(true); setError("");
    const writing = apply ? { stage: "writing", filePath: proposal.filePath, exportName: proposal.exportName } : null;
    if (writing) change.set(writing);
    try {
      const result = await backend.adaptComponentStyle(componentName, apply ? proposal : undefined, kind);
      if (!result.success) { if (change.getSnapshot() === writing) change.set(null); setError(result.error); return; }
      setProposal(result.applied ? null : result);
      if (result.applied && change.getSnapshot() === writing) {
        const written = { filePath: result.filePath, exportName: result.exportName, stage: "waiting" };
        if (mounted.current) await refresh(written);
        else change.set(written);
      }
    } catch (error) { if (change.getSnapshot() === writing) change.set(null); setError(String(error)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <div {...{ [theme ? "data-component-theme-adapter" : "data-component-style-adapter"]: true }} className="mt-3 border-t border-ed-border pt-3 text-[10px] text-ed-muted-foreground">
    <p>{label("Hint")}</p>
    <button type="button" {...{ [theme ? "data-review-theme-adapter" : "data-review-style-adapter"]: true }} disabled={readOnly || busy} onClick={() => run()} className="mt-2 hover:text-ed-foreground disabled:opacity-50">{label("Review")}</button>
    {proposal && <div className="mt-2" role="region" aria-label={label("Review")}>
      <p>{label("Scope")}</p>
      <p className="mt-1 break-words">{proposal.filePath}</p>
      <details className="mt-2"><summary>{t("componentInstance.adapterSource")}</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 240, overflow: "auto" }}>{proposal.code}</pre></details>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" {...{ [theme ? "data-apply-theme-adapter" : "data-apply-style-adapter"]: true }} disabled={readOnly || busy} onClick={() => run(true)} className="hover:text-ed-foreground disabled:opacity-50">{t("componentInstance.adapterApply")}</button>
        <button type="button" disabled={busy} onClick={() => setProposal(null)}>{t("componentInstance.adapterCancel")}</button>
      </div>
    </div>}
    {error && <p role="alert" className="mt-2 break-words">{error}</p>}
  </div>;
}
