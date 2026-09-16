import { useTranslation } from "@bingo/i18n";
import { Button, Popover, PopoverContent, PopoverTrigger, ScrollArea } from "@bingo/ui";
import * as React from "react";

function ToolFailureDetails({ children, report, onTroubleshoot, onFeedback }) {
  const { t } = useTranslation("editor");
  const [open, setOpen] = React.useState(false);
  const actionSelected = React.useRef(false);

  const setPopoverOpen = (value) => {
    actionSelected.current = false;
    setOpen(value);
  };

  const selectAction = (action) => {
    actionSelected.current = true;
    setOpen(false);
    action();
  };

  return (
    <Popover open={open} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="text"
          isChildText={false}
          className="h-auto rounded-none p-0 hover:bg-ed-ghost-hover"
          aria-label={t("chat.showFailureDetails")}
        >
          {children}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        variant="menu"
        side="right"
        align="start"
        className="w-72 p-3"
        aria-label={t("chat.failureDetails")}
        onCloseAutoFocus={event => {
          if (actionSelected.current) event.preventDefault();
        }}
      >
        <div className="mb-2 text-ed-chat font-normal text-ed-foreground">{t("chat.failureTitle")}</div>
        <ScrollArea viewportClassName="max-h-48">
          <p className="whitespace-pre-wrap break-words text-ed-chat text-ed-foreground-secondary [overflow-wrap:anywhere]">{report}</p>
        </ScrollArea>
        <div className="mt-4 flex flex-wrap gap-1">
          <Button variant="outline" size="xs" onClick={() => selectAction(() => onTroubleshoot(report))}>
            {t("chat.troubleshoot")}
          </Button>
          {onFeedback && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => selectAction(() => {
                const message = `${t("chat.feedbackFailureIntro")}\n\n${report}`;
                onFeedback(message.length > 2000 ? `${message.slice(0, 1997)}...` : message);
              })}
            >
              {t("chat.sendFeedback")}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { ToolFailureDetails };
