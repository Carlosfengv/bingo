import { ProjectLoadPanel } from "./ProjectLoadPanel";
import { useTranslation } from "@bingo/i18n";
import { Button } from "@bingo/ui";
import * as React from "react";

export function ProjectLoadError({ failure, onRetry, children, retryDisabled = false }) {
  const { t } = useTranslation("workspace");
  const [report, setReport] = React.useState(null);
  const [reportFailed, setReportFailed] = React.useState(false);
  const [copyState, setCopyState] = React.useState("idle");
  React.useEffect(() => {
    let active = true;
    setReport(null);
    setReportFailed(false);
    if (failure.incidentId) return;
    window.api.invoke("bingo:project-load-report", { root: failure.projectId, failure }).then(result => {
      if (active) setReport(result);
    }).catch(() => { if (active) setReportFailed(true); });
    return () => { active = false; };
  }, [failure.projectId, failure.code, failure.error, failure.sessionId, failure.buildId, failure.incidentId]);
  const incidentId = failure.incidentId || report?.incidentId;
  const information = JSON.stringify({ ...failure, error: failure.error || t("editor.loadTimeout"),
    incidentId: incidentId || null, reportPath: failure.reportPath || report?.reportPath || null }, null, 2);
  return <ProjectLoadPanel role="alert">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold leading-tight">{t("editor.loadErrorTitle")}</h1>
        <p className="whitespace-pre-wrap break-words text-sm text-ed-muted-foreground [overflow-wrap:anywhere]">{failure.error || t("editor.loadTimeout")}</p>
      </div>
      {children}
      <dl style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", columnGap: 16, rowGap: 8 }} className="min-w-0 text-sm">
        <dt className="text-ed-muted-foreground">{t("editor.errorProject")}</dt><dd className="select-text [overflow-wrap:anywhere]">{failure.projectId}</dd>
        <dt className="text-ed-muted-foreground">{t("editor.errorStage")}</dt><dd>{t(`editor.stages.${failure.stage || "connecting"}`)}</dd>
        <dt className="text-ed-muted-foreground">{t("editor.errorCode")}</dt><dd className="font-mono text-xs [overflow-wrap:anywhere]">{failure.code}</dd>
        <dt className="text-ed-muted-foreground">{t("editor.errorIncident")}</dt><dd className="select-text text-xs [overflow-wrap:anywhere]">{incidentId || t(reportFailed ? "editor.reportFailed" : "editor.reportSaving")}</dd>
      </dl>
      <p className="text-sm text-ed-muted-foreground">{t("editor.errorHelp")}</p>
      <details className="min-w-0 rounded-lg border border-ed-border p-3">
        <summary className="cursor-pointer text-sm">{t("editor.errorDetails")}</summary>
        <pre style={{ maxHeight: 224 }} className="mt-3 select-text overflow-auto whitespace-pre-wrap text-xs leading-relaxed">{information}</pre>
      </details>
      <div className="flex flex-wrap gap-2">
        <Button disabled={retryDisabled} onClick={onRetry}>{t("editor.tryAgain")}</Button>
        <Button variant="outline" onClick={async () => {
          try { await navigator.clipboard.writeText(information); setCopyState("copied"); }
          catch { setCopyState("failed"); }
        }}>{t(copyState === "copied" ? "editor.errorCopied" : "editor.copyError")}</Button>
      </div>
      {copyState === "failed" && <p role="status" className="text-sm text-ed-muted-foreground">{t("editor.copyErrorFailed")}</p>}
  </ProjectLoadPanel>;
}
