import { Button, DatabaseIcon, Text$4 } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as React from "react";

import { SettingRow } from "./SettingRow";

function gitStatusLabel(status, t) {
  if (status === "tracked") return t("projectSettings.gitTracked");
  if (status === "ignored") return t("projectSettings.gitIgnored");
  if (status === "untracked") return t("projectSettings.gitUntracked");
  if (status === "not-repository") return t("projectSettings.gitNotRepository");
  return t("projectSettings.gitUnavailable");
}

function ConfigurationStorageSettings({ projectId }) {
  const { t } = useTranslation("editor");
  const [configuration, setConfiguration] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);

  const refresh = React.useCallback(async () => {
    if (!projectId || !window.api?.invoke) return;
    setLoading(true);
    try {
      setConfiguration(await window.api.invoke("bingo:configuration-inspect", { root: projectId }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("projectSettings.inspectConfigurationError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (!window.api?.on) return;
    return window.api.on("settings_changed", event => {
      if (String(event?.projectId) === String(projectId)) void refresh();
    });
  }, [projectId, refresh]);

  const choose = React.useCallback(async (mode, gitPreference) => {
    setSaving(true);
    setError(null);
    try {
      const prepared = await window.api.invoke("bingo:configuration-prepare", {
        root: projectId,
        mode,
        gitPreference,
        initialPatch: {
          iconLibraries: configuration?.settings?.iconLibraries ?? [],
          iconLibraryPolicy: configuration?.settings?.iconLibraryPolicy ?? { mode: "auto", disabledLibraries: [] }
        }
      });
      await window.api.invoke("bingo:configuration-apply", {
        root: projectId,
        planId: prepared.planId,
        operationId: `settings-${Date.now()}`
      });
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("projectSettings.updateConfigurationError"));
    } finally {
      setSaving(false);
    }
  }, [configuration, projectId, refresh, t]);

  const modeLabel = configuration?.mode === "project"
    ? t("projectSettings.savedInProject")
    : configuration?.mode === "app"
      ? t("projectSettings.savedOnComputer")
      : t("projectSettings.chooseStorage");
  const description = configuration?.mode === "project"
    ? configuration.configPath
    : configuration?.mode === "app"
      ? configuration.localSettingsPath
      : t("projectSettings.configurationAskBeforeCreate");

  return <SettingRow
    Icon={DatabaseIcon}
    title={t("projectSettings.configurationStorage")}
    description={t("projectSettings.configurationStorageDescription")}
  >
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <Text$4 size="xs" weight="medium">{loading ? t("projectSettings.checking") : modeLabel}</Text$4>
        <Text$4 size="2xs" variant="tertiary" className="break-all">{description}</Text$4>
        {configuration?.gitStatus && <Text$4 size="2xs" variant="tertiary">
          {gitStatusLabel(configuration.gitStatus.status, t)}
        </Text$4>}
        {configuration?.issues?.length > 0 && <Text$4 size="2xs" variant="danger">
          {t("projectSettings.configurationRecovery")}
        </Text$4>}
        {error && <Text$4 size="2xs" variant="danger">{error}</Text$4>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button size="xs" variant="outline" disabled={loading || saving} onClick={() => void choose("project", "unchanged")}>
          {t("projectSettings.saveInProject")}
        </Button>
        <Button size="xs" variant="outline" disabled={loading || saving} onClick={() => void choose("project", "ignore")}>
          {t("projectSettings.saveInProjectIgnored")}
        </Button>
        <Button size="xs" variant="outline" disabled={loading || saving} onClick={() => void choose("app", "not-applicable")}>
          {t("projectSettings.saveOnComputer")}
        </Button>
      </div>
      <Text$4 size="2xs" variant="tertiary">
        {t("projectSettings.configurationStorageNote")}
      </Text$4>
    </div>
  </SettingRow>;
}

export { ConfigurationStorageSettings };
