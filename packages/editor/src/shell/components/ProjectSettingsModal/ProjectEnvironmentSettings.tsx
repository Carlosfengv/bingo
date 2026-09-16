import { Button, DatabaseIcon, Text$4 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as React from "react";

import { SettingRow } from "./SettingRow";

function ProjectEnvironmentSettings({ projectId }) {
  const { t } = useTranslation("editor");
  const [status, setStatus] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [preparing, setPreparing] = React.useState(false);
  const [error, setError] = React.useState(null);

  const refresh = React.useCallback(async () => {
    if (!projectId || !window.api?.invoke) return;
    setLoading(true);
    try {
      setStatus(await window.api.invoke("bingo:environment-inspect", { root: projectId }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("projectSettings.inspectEnvironmentError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const prepare = React.useCallback(async () => {
    setPreparing(true);
    setError(null);
    try {
      await window.api.invoke("bingo:environment-prepare", { root: projectId });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("projectSettings.prepareEnvironmentError"));
    } finally {
      setPreparing(false);
    }
  }, [projectId, refresh, t]);

  const needsInstall = status?.status === "needs-install";
  const manager = status?.packageManager || t("projectSettings.defaultPackageManager");
  const description = loading
    ? t("projectSettings.checkingDependencies")
    : status?.status === "ready"
      ? t("projectSettings.dependenciesReady", { count: status.dependencyCount ?? 0 })
      : status?.status === "no-package"
        ? t("projectSettings.noPackageJson")
        : t("projectSettings.dependenciesMissing", { count: status?.missingDependencies?.length ?? 0, manager });

  return <SettingRow
    Icon={DatabaseIcon}
    title={t("projectSettings.projectEnvironment")}
    description={t("projectSettings.projectEnvironmentDescription")}
    action={needsInstall ? <Button size="xs" variant="outline" disabled={preparing} onClick={() => void prepare()}>{preparing ? t("projectSettings.preparing") : t("projectSettings.prepareProject")}</Button> : null}
  >
    <div className="flex w-full flex-col gap-1">
      <Text$4 size="xs" weight="medium">{description}</Text$4>
      {status?.workspaceRoot && status.workspaceRoot !== status.projectRoot && <Text$4 size="2xs" variant="tertiary" className="break-all">{t("projectSettings.installScope", { path: status.workspaceRoot })}</Text$4>}
      {needsInstall && <Text$4 size="2xs" variant="tertiary">{t("projectSettings.installWarning")}</Text$4>}
      {error && <Text$4 size="2xs" variant="danger">{error}</Text$4>}
    </div>
  </SettingRow>;
}

export { ProjectEnvironmentSettings };
