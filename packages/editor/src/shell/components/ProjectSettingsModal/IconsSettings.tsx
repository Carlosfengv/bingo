import { SettingRow } from "./SettingRow";
import { isLoadableIconLibrary } from "@bingo/compiler";
import { useTranslation } from "@bingo/i18n";
import { ArrowRightIcon, ArrowUpRightIcon, Button, InfoIcon$1, Input, SparkleIcon, Text$4 } from "@bingo/ui";
import { Cube as IconsIcon } from "@phosphor-icons/react/dist/icons/Cube";
import { XCircle as RemoveIcon } from "@phosphor-icons/react/dist/icons/XCircle";
import * as React from "react";

function getNpmPackageUrl(importPath) {
  const parts = importPath.split("/").filter(Boolean);
  const packageName = importPath.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0] || importPath;
  return `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`;
}

function isConfigurationRequired(cause) {
  return cause?.code === "CONFIG_INITIALIZATION_REQUIRED" || /choose where (?:bingo should save|to save) (?:this project's |project )?configuration/i.test(String(cause?.message || cause));
}

function IconsSettings({ iconLibraries, automaticIconLibraries = [], iconLibraryPolicy = { mode: "auto" }, onAddIconPackage, onRemoveIconPackage, onSetIconLibraryMode, onAskAIForIconSetup, onConfigurationRequired }) {
  const { t } = useTranslation("editor");
  const [packageName, setPackageName] = React.useState("");
  const [error, setError] = React.useState(null);
  const [lastFailure, setLastFailure] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [removing, setRemoving] = React.useState(null);
  const [changingMode, setChangingMode] = React.useState(false);

  const changeMode = async mode => {
    if (!onSetIconLibraryMode || mode === iconLibraryPolicy.mode) return;
    setChangingMode(true);
    setError(null);
    try { await onSetIconLibraryMode(mode); }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      if (isConfigurationRequired(cause)) onConfigurationRequired?.();
    }
    finally { setChangingMode(false); }
  };

  const handleSubmit = async event => {
    event.preventDefault();
    const trimmed = packageName.trim();
    if (!trimmed) return;
    if (!isLoadableIconLibrary(trimmed)) {
      const issue = t("projectSettings.invalidIconPackage");
      setError(issue);
      setLastFailure({ attemptedPackage: trimmed, issue, suggestions: [] });
      return;
    }
    if (!onAddIconPackage) {
      const issue = t("projectSettings.iconSetupUnavailable");
      setError(issue);
      setLastFailure({ attemptedPackage: trimmed, issue, suggestions: [] });
      return;
    }
    setSaving(true);
    setError(null);
    setLastFailure(null);
    try {
      await onAddIconPackage(trimmed);
      setPackageName("");
    } catch (cause) {
      const issue = cause instanceof Error ? cause.message : String(cause);
      const iconSetup = cause && typeof cause === "object" ? cause.iconSetup : null;
      const suggestions = Array.isArray(iconSetup?.suggestions) ? iconSetup.suggestions.filter(item => typeof item === "string") : [];
      setError(issue);
      setLastFailure({ attemptedPackage: trimmed, issue, suggestions });
      if (isConfigurationRequired(cause)) onConfigurationRequired?.();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async library => {
    if (!onRemoveIconPackage) {
      setError(t("projectSettings.iconRemovalUnavailable"));
      return;
    }
    setRemoving(library);
    setError(null);
    try {
      await onRemoveIconPackage(library);
    } catch (cause) {
      const issue = cause instanceof Error ? cause.message : String(cause);
      setError(issue);
      setLastFailure({ attemptedPackage: library, issue, suggestions: [] });
      if (isConfigurationRequired(cause)) onConfigurationRequired?.();
    } finally {
      setRemoving(null);
    }
  };

  return <>
    <div className="flex flex-col gap-1.5">
      <Text$4 as="h2" size="xl" weight="medium">{t("projectSettings.iconsTitle")}</Text$4>
      <Text$4 size="xs" variant="tertiary">{t("projectSettings.iconsDescription")}</Text$4>
    </div>
    <div className="flex flex-col gap-6 rounded-2xl border border-ed-border bg-ed-background p-4">
      <SettingRow Icon={IconsIcon} title={t("projectSettings.iconPackages")} description={t("projectSettings.iconPackagesDescription")}>
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" size="xs" variant={iconLibraryPolicy.mode === "auto" ? "secondary" : "outline"} disabled={changingMode} onClick={() => void changeMode("auto")}>{t("projectSettings.iconModeAuto")}</Button>
            <Button type="button" size="xs" variant={iconLibraryPolicy.mode === "manual" ? "secondary" : "outline"} disabled={changingMode} onClick={() => void changeMode("manual")}>{t("projectSettings.iconModeManual")}</Button>
            <Text$4 size="2xs" variant="tertiary">{iconLibraryPolicy.mode === "auto" ? t("projectSettings.iconModeAutoDescription", { count: automaticIconLibraries.length }) : t("projectSettings.iconModeManualDescription")}</Text$4>
          </div>
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input value={packageName} onChange={event => { setPackageName(event.target.value); setError(null); setLastFailure(null); }} placeholder="lucide-react" className="font-mono" />
            <Button type="submit" size="xs" variant="outline" loading={saving} disabled={saving || !packageName.trim()}>{t("projectSettings.addIconPackage")}</Button>
          </form>
          {error ? <div className="rounded-xl border border-ed-border bg-ed-muted/40 p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-ed-border bg-ed-background"><InfoIcon$1 width={14} height={14} className="text-ed-muted-foreground" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium leading-4 text-ed-foreground">{lastFailure ? t("projectSettings.iconNeedsSetup") : t("projectSettings.iconChangeFailed")}</div>
                <p className="mt-1 break-words text-xs leading-5 text-ed-muted-foreground">{error}</p>
                {lastFailure?.suggestions?.length > 0 ? <div className="mt-2 flex flex-wrap gap-1.5">{lastFailure.suggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => { setPackageName(suggestion); setError(null); setLastFailure(null); }} className="inline-flex items-center gap-1 rounded-md border border-ed-border bg-ed-background px-1.5 py-0.5 font-mono text-[11px] text-ed-foreground hover:bg-ed-accent">{suggestion}<ArrowRightIcon width={11} height={11} /></button>)}</div> : null}
                {lastFailure ? <div className="mt-3 flex flex-wrap items-center gap-2">
                  {onAskAIForIconSetup ? <Button type="button" size="xs" variant="outline" LeftIcon={SparkleIcon} onClick={() => onAskAIForIconSetup({ attemptedPackage: lastFailure.attemptedPackage, issue: lastFailure.issue, suggestions: lastFailure.suggestions, enabledLibraries: iconLibraries })}>{t("projectSettings.askAssistant")}</Button> : null}
                  <Button size="xs" variant="secondary" className="text-ed-muted-foreground hover:text-ed-foreground" RightIcon={ArrowUpRightIcon} rightIconSize={12} rightIconClassName="shrink-0" onClick={() => window.open(getNpmPackageUrl(lastFailure.attemptedPackage), "_blank", "noreferrer")}>{t("projectSettings.viewOnNpm")}</Button>
                </div> : null}
              </div>
            </div>
          </div> : null}
          <div className="flex flex-wrap gap-2">
            {iconLibraries.length === 0 ? <Text$4 size="2xs" variant="tertiary">{t("projectSettings.noIconPackages")}</Text$4> : iconLibraries.map(library => <div key={library} className="inline-flex items-center gap-1 rounded border border-ed-border bg-ed-background px-1.5 py-0.5">
              <Text$4 size="2xs" className="font-mono">{library}</Text$4>
              <button type="button" onClick={() => void handleRemove(library)} disabled={removing === library} aria-label={t("projectSettings.removeIconPackage", { name: library })} className="text-ed-muted-foreground hover:text-ed-foreground disabled:opacity-50"><RemoveIcon size={14} /></button>
            </div>)}
          </div>
        </div>
      </SettingRow>
    </div>
  </>;
}

export { IconsSettings };
