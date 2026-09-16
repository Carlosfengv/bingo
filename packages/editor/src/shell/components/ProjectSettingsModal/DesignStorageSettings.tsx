import { Button, DatabaseIcon, Text$4 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as React from "react";

import { SettingRow } from "./SettingRow";

function DesignStorageSettings({ projectId }) {
  const { t } = useTranslation("editor");
  const [status, setStatus] = React.useState(null);
  const [portability, setPortability] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);

  const refresh = React.useCallback(async () => {
    if (!projectId || !window.api?.invoke) return;
    setLoading(true);
    try {
      const inspected = await window.api.invoke("bingo:design-storage-inspect", { root: projectId });
      setStatus(inspected);
      setPortability(inspected.projectAvailable ? await window.api.invoke("bingo:design-portability-inspect", { root: projectId }) : null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("projectSettings.inspectDesignError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  React.useEffect(() => { void refresh(); }, [refresh]);
  React.useEffect(() => {
    if (!window.api?.on) return;
    return window.api.on("design_storage_changed", event => {
      if (String(event?.projectId) === String(projectId)) void refresh();
    });
  }, [projectId, refresh]);

  const enable = React.useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await window.api.invoke("bingo:design-storage-enable", { root: projectId });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("projectSettings.saveDesignError"));
    } finally {
      setSaving(false);
    }
  }, [projectId, refresh, t]);

  const inProject = status?.mode === "project";
  const missing = status?.health === "missing";
  const summary = missing
    ? t("projectSettings.missingProjectDesign")
    : inProject
    ? `${t("projectSettings.pageCount", { count: status.pageCount ?? 0 })} · ${t("projectSettings.assetCount", { count: status.assetCount ?? 0 })}`
    : t("projectSettings.localDesignCounts", { count: status?.pageCount ?? 0 });

  let action = null;
  if (!loading && !inProject) action = <Button size="xs" variant="outline" disabled={saving} onClick={() => void enable()}>{saving ? t("projectSettings.saving") : t("projectSettings.saveInProject")}</Button>;

  return <SettingRow
    Icon={DatabaseIcon}
    title={t("projectSettings.designStorage")}
    description={t("projectSettings.designStorageDescription")}
    action={action}
  >
    <div className="flex w-full flex-col gap-1">
      <Text$4 size="xs" weight="medium">{loading ? t("projectSettings.checking") : missing ? t("projectSettings.designNeedsAttention") : inProject ? t("projectSettings.savedInProject") : t("projectSettings.savedOnComputer")}</Text$4>
      <Text$4 size="2xs" variant="tertiary">{summary}</Text$4>
      {status?.designPath && <Text$4 size="2xs" variant="tertiary" className="break-all">{status.designPath}</Text$4>}
      {inProject && <Text$4 size="2xs" variant="tertiary">{t("projectSettings.commitDesignFiles")}</Text$4>}
      {portability?.status === "needs-content" && <Text$4 size="2xs" variant="danger">{t("projectSettings.portabilityIssues", { assets: portability.missingAssets.length, paths: portability.localPaths.length })}</Text$4>}
      {portability?.status === "files-portable" && <Text$4 size="2xs" variant="tertiary">
        {portability.git?.status === "tracked-clean" ? t("projectSettings.gitClean")
          : portability.git?.status === "modified" ? t("projectSettings.gitModified")
            : portability.git?.status === "untracked" ? t("projectSettings.gitReady")
              : portability.git?.status === "ignored" ? t("projectSettings.gitDesignIgnored")
                : t("projectSettings.gitDesignNotTracked")}
      </Text$4>}
      {error && <Text$4 size="2xs" variant="danger">{error}</Text$4>}
    </div>
  </SettingRow>;
}

export { DesignStorageSettings };
