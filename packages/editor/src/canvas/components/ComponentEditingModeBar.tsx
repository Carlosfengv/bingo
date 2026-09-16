import { useTranslation } from "@bingo/i18n";
import { Button, ButtonGroup, CaretDownIcon, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, PencilIcon } from "@bingo/ui";
import { Cube } from "@phosphor-icons/react/dist/icons/Cube";
import * as React from "react";

/** Global mode strip shown while a component edit root is selected. */
function ComponentEditingModeBar({ componentName, filePath, isPreparing, onSave, onCancel }) {
  const { t } = useTranslation("editor");
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const shortPath = filePath ? filePath.replace(/^.*\/(components\/|src\/)/, "$1") : undefined;
  const status = t("componentEditing.status", { name: componentName });
  const saveLabel = isPreparing ? t("componentEditing.saving") : t("componentEditing.save");

  React.useEffect(() => {
    if (notesOpen) setNotes("");
  }, [notesOpen]);

  const submitWithNotes = () => {
    const trimmed = notes.trim();
    setNotesOpen(false);
    onSave(trimmed || undefined);
  };

  return (
    <>
      <div
        className="pointer-events-auto flex items-center gap-2 border border-ed-border bg-ed-background shadow-lg"
        style={{ height: 52, paddingLeft: 10, paddingRight: 10, borderRadius: 12, minWidth: 320, maxWidth: 560 }}
        role="status"
        aria-label={status}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-ed-canvas-component-edit/40 bg-ed-canvas-component-edit/10 text-ed-canvas-component-edit">
            <Cube size={14} weight="bold" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-ed-foreground">{status}</div>
            {shortPath && <div className="truncate font-mono text-[10px] text-ed-muted-foreground">{shortPath}</div>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-ed-muted-foreground hover:text-ed-foreground" onClick={onCancel} disabled={isPreparing}>
            {t("componentEditing.discard")}
          </Button>
          <ButtonGroup>
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => onSave()} disabled={isPreparing}>
              {saveLabel}
            </Button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-1.5" disabled={isPreparing} aria-label={t("componentEditing.moreSaveOptions")}>
                  <CaretDownIcon width={12} height={12} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                <DropdownMenuItem className="gap-2" onSelect={() => setNotesOpen(true)}>
                  <PencilIcon width={16} height={16} className="text-ed-muted-foreground" />
                  {t("componentEditing.saveWithInstructions")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        </div>
      </div>
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="!max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{t("componentEditing.dialogTitle", { name: componentName })}</DialogTitle>
            <DialogDescription>{t("componentEditing.dialogDescription")}</DialogDescription>
          </DialogHeader>
          <textarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder={t("componentEditing.instructionsPlaceholder")}
            rows={5}
            className="w-full resize-y rounded-md border border-ed-border bg-ed-background px-3 py-2 text-sm text-ed-foreground placeholder:text-ed-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ed-ring"
            autoFocus
            onKeyDown={event => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                submitWithNotes();
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setNotesOpen(false)}>{t("componentEditing.back")}</Button>
            <Button size="sm" variant="outline" onClick={submitWithNotes} disabled={isPreparing}>{saveLabel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { ComponentEditingModeBar };
