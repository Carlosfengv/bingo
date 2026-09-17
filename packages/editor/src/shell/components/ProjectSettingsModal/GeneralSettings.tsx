import { SettingRow } from "./SettingRow";
import { ConfigurationStorageSettings } from "./ConfigurationStorageSettings";
import { useTranslation } from "@bingo/i18n";
import { Button, DatabaseIcon, Input, Text$4, TextTIcon } from "@bingo/ui";
import * as React from "react";

function formatProjectBytes(bytes) {
  const KB = 1024;
  const MB = 1048576;
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) {
    const kb = bytes / KB;
    return kb >= 10 ? `${Math.round(kb)} KB` : `${kb.toFixed(1)} KB`;
  }
  const mb = bytes / MB;
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

function GeneralSettings({ projectId, projectName, onRenameProject, canRename = false, projectSize, isElectron = false }) {
  const { t } = useTranslation("editor");
  const [name, setName] = React.useState(projectName);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    setName(projectName);
    setError(null);
  }, [projectName]);

  const trimmed = name.trim();
  const canSave = canRename && !!onRenameProject && trimmed.length > 0 && trimmed !== projectName && !saving;
  const handleSave = async () => {
    if (!canSave || !onRenameProject) return;
    setSaving(true);
    setError(null);
    try {
      await onRenameProject(trimmed);
    } catch {
      setError(t("projectSettings.renameError"));
    } finally {
      setSaving(false);
    }
  };

  return <>
    <div className="flex flex-col gap-1.5">
      <Text$4 as="h2" size="xl" weight="medium">{t("projectSettings.generalTitle")}</Text$4>
      <Text$4 size="xs" variant="tertiary">{t("projectSettings.generalDescription")}</Text$4>
    </div>
    <div className="flex flex-col gap-6 rounded-2xl border border-ed-border bg-ed-background p-4">
      <SettingRow Icon={TextTIcon} title={t("projectSettings.projectName")} description={t("projectSettings.projectNameDescription")} action={canRename ? <Button size="xs" variant="outline" disabled={!canSave} onClick={() => void handleSave()}>{saving ? t("projectSettings.saving") : t("actions.save", { ns: "common" })}</Button> : null}>
        <div className="flex w-full flex-col gap-1.5">
          <Input value={name} onChange={event => { setName(event.target.value); if (error) setError(null); }} onKeyDown={event => {
            if (event.key === "Enter" && !event.nativeEvent?.isComposing) {
              event.preventDefault();
              void handleSave();
            }
          }} placeholder={t("projectSettings.untitledProject")} aria-label={t("projectSettings.projectName")} maxLength={200} disabled={!canRename || saving} className="w-full bg-ed-background" />
          {error ? <Text$4 size="2xs" variant="danger">{error}</Text$4> : null}
          {!canRename ? <Text$4 size="2xs" variant="tertiary">{t("projectSettings.renameUnavailable")}</Text$4> : null}
        </div>
      </SettingRow>
      {projectSize ? <ProjectSizeRow size={projectSize} /> : null}
      {isElectron && projectId ? <ConfigurationStorageSettings projectId={projectId} /> : null}
    </div>
  </>;
}

function ProjectSizeRow({ size }) {
  const { t } = useTranslation("editor");
  const { usedBytes, maxBytes } = size;
  const hasCap = maxBytes != null && maxBytes > 0;
  const usedPct = hasCap ? Math.min(100, usedBytes / maxBytes * 100) : 0;
  const barColor = hasCap && usedBytes >= maxBytes ? "bg-ed-destructive" : hasCap && usedPct >= 80 ? "bg-ed-warning" : "bg-ed-foreground";
  const usedLabel = formatProjectBytes(usedBytes);
  const limitLabel = hasCap ? formatProjectBytes(maxBytes) : t("projectSettings.unlimited");

  return <SettingRow Icon={DatabaseIcon} title={t("projectSettings.fileSize")} description={t("projectSettings.fileSizeDescription")}>
    <div className="flex w-full flex-col gap-2">
      <Text$4 size="xs" weight="medium" className="tabular-nums">{t("projectSettings.sizeUsage", { used: usedLabel, limit: limitLabel })}</Text$4>
      {hasCap ? <div className="h-1.5 w-full overflow-hidden rounded-full bg-ed-muted"><div className={`h-full rounded-full ${barColor}`} style={{ width: `${usedPct}%` }} /></div> : null}
    </div>
  </SettingRow>;
}

export { GeneralSettings };
