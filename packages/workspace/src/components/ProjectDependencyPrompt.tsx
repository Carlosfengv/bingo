import { useTranslation } from "@bingo/i18n";
import { Button } from "@bingo/ui";
import * as React from "react";

export function ProjectDependencyPrompt({ environment, readOnly = false }) {
  const { t } = useTranslation("workspace");
  if (!environment.visible) return null;
  const { inspection, phase, busy, error, prepare, refresh } = environment;
  const checkFailed = error?.step === "check";
  const reloadFailed = error?.step === "reload";
  const workspaceInstall = inspection?.workspaceRoot && inspection.workspaceRoot !== inspection.projectRoot;
  const errorKind = /spawn\s+\S+\s+ENOENT|(?:env:.*node:|(?:pnpm|npm|yarn|bun|node):).*?(?:not found|No such file)/i.test(error?.detail || "") ? "toolMissing"
    : /OUTSIDE_PROJECT_ROOT|needs access|does not own|access denied|EACCES/i.test(error?.detail || "") ? "accessNeeded"
    : "installFailed";
  const heading = busy ? (phase === "reloading" ? "reloading" : "preparing")
    : checkFailed ? "checkFailed" : reloadFailed ? "reloadFailed" : "title";

  return <section aria-busy={busy} className="flex min-w-0 flex-col gap-3 rounded-lg border border-ed-border bg-ed-background p-4 text-ed-foreground">
    <div role="status" aria-live="polite" className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold">{t(`editor.dependencies.${heading}`)}</h2>
      <p className="text-sm leading-relaxed text-ed-muted-foreground">{t(`editor.dependencies.${busy ? "progressHelp" : checkFailed ? "checkHelp" : reloadFailed ? "reloadHelp" : "description"}`)}</p>
    </div>
    {!busy && !checkFailed && !reloadFailed && <p className="text-xs leading-relaxed text-ed-muted-foreground">{t("editor.dependencies.installNote")}</p>}
    {workspaceInstall && !checkFailed && <p className="text-xs leading-relaxed text-ed-muted-foreground [overflow-wrap:anywhere]">{t("editor.dependencies.workspaceScope", { path: inspection.workspaceRoot })}</p>}
    {readOnly && <p className="text-sm text-ed-muted-foreground">{t("editor.dependencies.readOnly")}</p>}
    {error && !checkFailed && !reloadFailed && <p role="alert" className="text-sm text-ed-warning-foreground">{t(`editor.dependencies.${errorKind}`)}</p>}
    <div className="flex flex-wrap gap-2">
      {!checkFailed && !readOnly && <Button disabled={busy} onClick={() => void prepare()}>{t(`editor.dependencies.${busy ? "working" : reloadFailed ? "reload" : workspaceInstall ? "prepareWorkspace" : "prepare"}`)}</Button>}
      <Button variant="outline" disabled={busy || phase === "checking"} onClick={() => void refresh(true)}>{t("editor.dependencies.recheck")}</Button>
    </div>
    {(inspection?.workspaceRoot || error) && <details className="min-w-0 text-xs text-ed-muted-foreground">
      <summary className="cursor-pointer">{t("editor.dependencies.details")}</summary>
      <div className="mt-2 flex flex-col gap-2 [overflow-wrap:anywhere]">
        {inspection?.workspaceRoot && <p>{t("editor.dependencies.location", { path: inspection.workspaceRoot })}</p>}
        {!!inspection?.missingDependencies?.length && <p>{t("editor.dependencies.missing", { names: inspection.missingDependencies.join(", ") })}</p>}
        {error && <pre className="max-h-40 select-text overflow-auto whitespace-pre-wrap">{error.detail}</pre>}
      </div>
    </details>}
  </section>;
}
