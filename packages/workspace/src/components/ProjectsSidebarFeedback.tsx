import {
  Button, ChatIcon, Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, SidebarMenu, SidebarMenuButton, SidebarMenuItem, cn$2,
} from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as React from "react";
import { toast } from "sonner";

function ProjectsSidebarFeedback({ rowClassName }) {
  const { t } = useTranslation("workspace");
  const [open, setOpen] = React.useState(false);
  return <>
    <SidebarMenu><SidebarMenuItem><SidebarMenuButton className={cn$2(rowClassName, "text-[11px]")} onClick={() => setOpen(true)}>
      <span className="flex size-5 items-center justify-center"><ChatIcon /></span><span>{t("notes.entry")}</span>
    </SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    <FeedbackDialog open={open} onOpenChange={setOpen} />
  </>;
}

function FeedbackDialog({ open, onOpenChange, initialMessage = "" }) {
  const { t } = useTranslation("workspace");
  const [message, setMessage] = React.useState(initialMessage);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { if (open) setMessage(initialMessage); }, [initialMessage, open]);
  const submit = async (event) => {
    event.preventDefault();
    if (!message.trim() || saving) return;
    setSaving(true);
    try {
      const result = await window.api.invoke("bingo:save-feedback", { message: message.trim() });
      toast.success(t("notes.saved", { filename: result.filename }));
      onOpenChange(false);
    } catch (error) {
      toast.error(t("notes.saveError"), error instanceof Error ? { description: error.message } : void 0);
    } finally {
      setSaving(false);
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{t("notes.title")}</DialogTitle>
        <DialogDescription>{t("notes.description")}</DialogDescription></DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} autoFocus
          aria-label={t("notes.inputLabel")} className="min-h-32 w-full resize-y rounded-md border border-ed-field-border bg-ed-field px-3 py-2 text-sm text-ed-foreground focus-visible:outline-2 focus-visible:outline-ed-ring" />
        <DialogFooter><Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t("actions.cancel", { ns: "common" })}</Button>
          <Button type="submit" size="sm" disabled={!message.trim() || saving}>{saving ? t("notes.saving") : t("notes.save")}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export { FeedbackDialog, ProjectsSidebarFeedback };
