import { ProjectLoadPanel } from "./ProjectLoadPanel";
import { useTranslation } from "@bingo/i18n";
import { Button } from "@bingo/ui";
import * as React from "react";

export function ProjectLoadProgress({ stage, processed = 0, total = 0, onBack, children, preparation = false }) {
  const { t } = useTranslation("workspace");
  const hasProgress = stage === "building" && total > 0;
  const boundedProcessed = hasProgress ? Math.min(Math.max(processed, 0), total) : 0;
  const progress = hasProgress ? boundedProcessed / total * 100 : 0;

  return <ProjectLoadPanel role={preparation ? "region" : "status"} aria-label={t("editor.loadingProject")} aria-live="polite" aria-busy={!preparation}>
    {!preparation && <><div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold leading-tight">{t("editor.loadingProject")}</h1>
      <p className="text-sm text-ed-muted-foreground">{t(`editor.stages.${stage || "connecting"}`)}</p>
    </div>
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-label={t(`editor.stages.${stage || "connecting"}`)}
        aria-valuemin={hasProgress ? 0 : undefined}
        aria-valuemax={hasProgress ? total : undefined}
        aria-valuenow={hasProgress ? boundedProcessed : undefined}
        className="h-2 overflow-hidden rounded-full bg-ed-secondary"
      >
        <div
          className={hasProgress ? "h-full rounded-full bg-ed-primary" : "h-full animate-pulse rounded-full bg-ed-primary"}
          style={hasProgress ? { width: `${progress}%`, transition: "width 200ms ease" } : { width: "33.333%" }}
        />
      </div>
      {hasProgress && <p className="text-sm tabular-nums text-ed-muted-foreground">{boundedProcessed} / {total}</p>}
    </div></>}
    {children}
    {onBack && <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={onBack}>{t("editor.backToProjects")}</Button>
    </div>}
  </ProjectLoadPanel>;
}
