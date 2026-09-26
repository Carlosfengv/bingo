import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import { useComponentPreview } from "../../../shared/contexts/ComponentPreviewContext";
import { SolidColorPicker } from "./styles/inputs/SolidColorPicker";

/** A color gesture previews the real instance and publishes only on Apply.
 * Closing, changing selection or losing the owning preview cancels it. */
export function ComponentParameterColorPicker({ value, valueLabel, disabled, label, describedBy, onPreview, onCommit }) {
  const { t } = useTranslation("editor");
  const { store, snapshot } = useComponentPreview();
  const [open, setOpen] = useState(false);
  const [candidate, setCandidate] = useState<string | null>(null);
  const [originalValue, setOriginalValue] = useState("");
  const session = useRef({ active: false, updating: false, token: undefined as number | undefined });
  const cancel = () => {
    const token = session.current.token;
    session.current.active = false;
    session.current.token = undefined;
    if (token !== undefined && store?.getSnapshot()?.token === token) store.cancel();
    setOpen(false);
    setCandidate(null);
  };
  useEffect(() => {
    const unsubscribe = store?.subscribe(() => {
      const owner = session.current;
      if (owner.active && !owner.updating && owner.token !== undefined && store.getSnapshot()?.token !== owner.token) {
        owner.active = false; owner.token = undefined;
        setOpen(false); setCandidate(null);
      }
    });
    return () => {
      unsubscribe?.();
      const token = session.current.token;
      session.current.active = false;
      session.current.token = undefined;
      if (token !== undefined && store?.getSnapshot()?.token === token) store.cancel();
    };
  }, [store]);
  useEffect(() => { if (disabled) cancel(); }, [disabled]);
  const preview = (color: string) => {
    if (disabled || !session.current.active) return;
    session.current.updating = true;
    try {
      session.current.token = onPreview(color);
      setCandidate(color);
    } finally { session.current.updating = false; }
  };
  const ownSnapshot = session.current.token === snapshot?.token ? snapshot : null;
  const failed = ownSnapshot?.status === "failed";
  const swatch = value && !value.includes("var(") && value !== "currentColor" && CSS.supports("color", value) ? value : "transparent";
  return <Popover open={open} onOpenChange={next => {
    if (!next) { cancel(); return; }
    if (disabled) return;
    session.current.active = true;
    setOriginalValue(valueLabel);
    setCandidate(null); setOpen(true);
  }}>
    <PopoverTrigger asChild><button type="button" data-component-color-picker disabled={disabled} aria-label={label} aria-describedby={describedBy} className="relative shrink-0 rounded-md border border-ed-border outline-none focus-visible:ring-1 focus-visible:ring-ed-ring disabled:opacity-50" style={{ width: 28, height: 28, background: "repeating-conic-gradient(#bbb 0% 25%, #eee 0% 50%) 0 / 8px 8px" }}>
      <span aria-hidden="true" style={{ position: "absolute", inset: 2, background: swatch, borderRadius: 3 }} />
    </button></PopoverTrigger>
    <PopoverContent data-component-color-dialog aria-label={label} side="left" align="start" style={{ width: 260, maxWidth: "calc(100vw - 24px)", maxHeight: "var(--radix-popover-content-available-height)", overflowY: "auto" }} onEscapeKeyDown={event => { event.preventDefault(); cancel(); }}>
      <div className="p-3 text-[11px] text-ed-foreground">
        <p className="mb-2">{label}</p>
        <p className="mb-2 text-ed-muted-foreground" style={{ overflowWrap: "anywhere" }}>{t("componentInstance.originalColor", { value: originalValue })}</p>
        <p className="mb-2 break-words text-ed-muted-foreground">{t("componentInstance.colorPreviewHint")}</p>
        <SolidColorPicker color={candidate ?? value} onChange={preview} />
        {failed && <p role="alert" className="mt-2 break-words text-red-500">{t("componentInstance.previewFailed")} {ownSnapshot.error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" data-component-color-cancel onClick={cancel} className="rounded-md px-2 py-1 focus-visible:ring-1 focus-visible:ring-ed-ring">{t("componentInstance.cancelColor")}</button>
          <button type="button" data-component-color-apply disabled={disabled || candidate === null || failed} onClick={() => {
            if (disabled || candidate === null || failed || !session.current.active) return;
            const color = candidate;
            session.current.active = false; session.current.token = undefined;
            setOpen(false); setCandidate(null);
            onCommit(color);
          }} className="rounded-md border border-ed-border px-2 py-1 focus-visible:ring-1 focus-visible:ring-ed-ring disabled:opacity-50">{t("componentInstance.applyColor")}</button>
        </div>
      </div>
    </PopoverContent>
  </Popover>;
}
