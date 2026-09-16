import { useTranslation } from "@bingo/i18n";
import { Button } from "@bingo/ui";

/** A viewport overlay: stays fixed while the followed canvas pans and zooms. */
function AgentFollowFrame({ onStop }) {
  const { t } = useTranslation("editor");
  const stopLabel = t("chat.stopFollowing");

  return (
    <div className="pointer-events-none absolute inset-0 z-50 border-2" style={{ borderColor: "var(--ed-secondary)" }}>
      <div
        className="absolute -top-0.5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-b-[9px] py-1 pl-3 pr-1 text-[11px] text-ed-foreground"
        style={{ backgroundColor: "var(--ed-secondary)" }}
      >
        <span role="status" className="whitespace-nowrap">{t("chat.followAssistant")}</span>
        <Button
          size="xs"
          variant="ghost"
          className="pointer-events-auto bg-ed-foreground/10 text-ed-foreground-secondary hover:bg-ed-foreground/15 hover:text-ed-foreground"
          aria-label={stopLabel}
          tooltip={stopLabel}
          onPointerDown={event => event.stopPropagation()}
          onClick={onStop}
        >
          {t("common:actions.stop")}
        </Button>
      </div>
    </div>
  );
}

export { AgentFollowFrame };
