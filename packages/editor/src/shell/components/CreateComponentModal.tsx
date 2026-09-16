import { useTranslation } from "@bingo/i18n";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Text$4 } from "@bingo/ui";
import * as React from "react";

function CreateComponentModal({ isOpen, onClose, onConfirm }) {
  const { t } = useTranslation("editor");
  const [componentName, setComponentName] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setComponentName("");
      setError("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const trimmed = componentName.trim();
    if (!trimmed) {
      setError(t("componentModal.required"));
      return;
    }
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(trimmed)) {
      setError(t("componentModal.invalid"));
      return;
    }
    onConfirm(trimmed);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="!max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("componentModal.title")}</DialogTitle>
          <DialogDescription>{t("componentModal.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label htmlFor="componentName" className="mb-2 block">
              <Text$4 size="sm" className="text-ed-muted-foreground">{t("componentModal.name")}</Text$4>
            </label>
            <Input
              id="componentName"
              type="text"
              value={componentName}
              onChange={event => {
                setComponentName(event.target.value);
                setError("");
              }}
              onKeyDown={event => {
                if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                if (event.key === "Enter" && componentName.trim()) {
                  event.preventDefault();
                  handleConfirm();
                }
              }}
              placeholder="MyButton"
              autoFocus
              aria-invalid={!!error}
            />
            {error && <Text$4 size="xs" className="mt-1 text-red-500">{error}</Text$4>}
            <Text$4 size="xs" className="mt-1 text-ed-muted-foreground">{t("componentModal.formatHint")}</Text$4>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>{t("common:actions.cancel")}</Button>
          <Button variant="default" size="sm" onClick={handleConfirm} disabled={!componentName.trim()}>{t("componentModal.create")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { CreateComponentModal };
