import { useRef, useState } from "react";
import { useTranslation } from "@bingo/i18n";
import { useBackendOptional } from "../../../backends/BackendContext";
import { useComponentPreview } from "../../../shared/contexts/ComponentPreviewContext";
import { componentSourceChanges } from "../../../../../compiler/src/codegen/componentSourceEdit";

export function ComponentSourcePanel({ element, readOnly, onComponentSourceSaved, onOpenSource }) {
  const { t } = useTranslation("editor");
  const backend = useBackendOptional();
  const { snapshot: preview } = useComponentPreview();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const binding = element.componentEditing?.sourceBinding;
  if (!backend?.saveComponentInstance) return null;
  if (!binding) return <p className="mt-3 text-[10px] text-ed-muted-foreground">{t("componentInstance.sourceUnbound")}</p>;
  const changes = componentSourceChanges(binding, element);
  const count = Object.keys(changes.props.set).length + changes.props.remove.length + Object.keys(changes.styles.set).length + changes.styles.remove.length + Number(changes.styleArgument !== undefined);
  const save = async () => {
    if (readOnly || busyRef.current || preview || !count) return;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const result = await backend.saveComponentInstance(structuredClone(element));
      if (!result.success) { setError(result); return; }
      onComponentSourceSaved?.(result);
    } catch (error) { setError({ error: String(error) }); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <div data-component-source className="mt-3 border-t border-ed-border pt-3 text-[10px] text-ed-muted-foreground">
    <p className="truncate" title={binding.filePath}>{binding.filePath} · {binding.exportName}</p>
    <p className="mt-1">{t(`componentInstance.${count ? "sourcePending" : "sourceSynced"}`, { count })}</p>
    <div className="mt-2 flex items-center justify-between gap-2">
      <button type="button" data-save-component-source disabled={readOnly || busy || !!preview || !count} onClick={save} className="hover:text-ed-foreground disabled:opacity-50">{t(`componentInstance.${busy ? "savingSource" : "saveSource"}`)}</button>
      {onOpenSource && <button type="button" onClick={() => onOpenSource(binding.filePath)} className="hover:text-ed-foreground">{t("componentInstance.openSourceCall")}</button>}
    </div>
    {error && <div role="alert" className="mt-2 break-words"><p>{t(`componentInstance.${error.code === "SOURCE_CONFLICT" ? "sourceConflict" : "sourceSaveFailed"}`)}</p><p>{error.error}</p>
      {error.expected && <details className="mt-1"><summary>{t("componentInstance.sourceDiff")}</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 180, overflow: "auto" }}>{error.expected}</pre><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 180, overflow: "auto" }}>{error.actual}</pre></details>}
    </div>}
  </div>;
}
