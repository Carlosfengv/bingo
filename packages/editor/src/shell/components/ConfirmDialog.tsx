/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/ConfirmDialog.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText: requestedConfirmText,
  cancelText: requestedCancelText,
  typeToConfirm,
  destructive = false,
  isLoading = false,
}) {
  const { t } = useTranslation("common");
  const confirmText = requestedConfirmText ?? t("actions.confirm");
  const cancelText = requestedCancelText ?? t("actions.cancel");
  const [typed, setTyped] = import_react.useState("");
  const confirmationInputId = import_react.useId();

  import_react.useEffect(() => {
    if (!isOpen) setTyped("");
  }, [isOpen]);

  const canConfirm = typeToConfirm ? typed === typeToConfirm : true;
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return <Dialog open={isOpen} onOpenChange={open => {
    if (!open) onClose();
  }}>
    <DialogContent showCloseButton={false} className="max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      {typeToConfirm && <div className="py-2">
        <label htmlFor={confirmationInputId} className="mb-2 block text-sm text-ed-muted-foreground">
          {t("confirmation.typeToConfirm", { value: typeToConfirm })}
        </label>
        <input id={confirmationInputId} type="text" value={typed} onChange={event => setTyped(event.target.value)} placeholder={typeToConfirm} autoFocus={true} className="w-full rounded-md border border-ed-border bg-ed-background px-3 py-2 text-sm text-ed-foreground focus:outline-none focus:ring-2 focus:ring-ed-ring" />
      </div>}
      <DialogFooter>
        <button type="button" onClick={onClose} disabled={isLoading} className="rounded-md border border-ed-border bg-ed-background px-4 py-2 text-sm text-ed-foreground hover:bg-ed-accent">
          {cancelText}
        </button>
        <button type="button" onClick={handleConfirm} disabled={!canConfirm || isLoading} className={`rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${destructive ? "bg-red-600 text-white hover:bg-red-700" : "bg-ed-primary text-ed-primary-foreground hover:bg-ed-primary/90"}`}>
          {isLoading ? t("status.working") : confirmText}
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

export { ConfirmDialog };
