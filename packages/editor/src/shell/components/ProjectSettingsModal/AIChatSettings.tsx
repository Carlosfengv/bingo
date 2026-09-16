import { publishFolderShared } from "../../../shared/state/folderShared";
import { SettingRow } from "./SettingRow";
import { useTranslation } from "@bingo/i18n";
import { Badge, Button, FolderIcon, Text$4, Tooltip, TooltipContent, TooltipTrigger } from "@bingo/ui";
import { XCircle as RemoveIcon } from "@phosphor-icons/react/dist/icons/XCircle";

function AIChatSettings({ allowedPaths, onAddAllowedPath, onRemoveAllowedPath, isElectron }) {
  const { t } = useTranslation("editor");

  const addFolder = async () => {
    if (!isElectron || typeof window.api?.invoke !== "function") return;
    try {
      const result = await window.api.invoke("pick_folder");
      if (typeof result?.path !== "string") return;
      onAddAllowedPath(result.path);
      publishFolderShared(result.path);
    } catch {}
  };

  return <>
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Text$4 as="h2" size="xl" weight="medium">{t("projectSettings.aiTitle")}</Text$4>
        {!isElectron ? <Tooltip><TooltipTrigger asChild><Badge variant="secondary" className="cursor-help text-[10px]">{t("projectSettings.desktopOnly")}</Badge></TooltipTrigger><TooltipContent side="top" className="max-w-64">{t("projectSettings.desktopOnlyHint")}</TooltipContent></Tooltip> : null}
      </div>
      <Text$4 size="xs" variant="tertiary">{t("projectSettings.aiDescription")}</Text$4>
    </div>
    <div className="flex flex-col gap-6 rounded-2xl border border-ed-border bg-ed-background p-4">
      <SettingRow Icon={FolderIcon} title={t("projectSettings.allowedFolders")} description={t("projectSettings.allowedFoldersDescription")} action={isElectron ? <Button size="xs" variant="outline" onClick={() => void addFolder()}>{t("projectSettings.addFolder")}</Button> : null}>
        <div className="flex w-full flex-col gap-2">
          {isElectron && allowedPaths.length === 0 ? <div className="rounded-md bg-ed-muted/50 px-3 py-2"><Text$4 size="2xs" variant="tertiary">{t("projectSettings.noFolders")}</Text$4></div> : null}
          {allowedPaths.map(path => <div key={path} className="flex items-center gap-1">
            <div className="flex min-w-0 flex-1 items-center rounded-md bg-ed-muted/50 px-3 py-2"><Text$4 size="2xs" weight="medium" variant="tertiary" className="truncate font-mono">{path}</Text$4></div>
            <Button size="icon-sm" variant="ghost" onClick={() => onRemoveAllowedPath(path)} aria-label={t("projectSettings.removeFolder", { path })} isChildText={false}><RemoveIcon size={16} className="text-ed-muted-foreground" /></Button>
          </div>)}
          {!isElectron ? <div className="rounded-md bg-ed-muted/50 px-3 py-2"><Text$4 size="2xs" variant="tertiary">{t("projectSettings.openOnDesktop")}</Text$4></div> : null}
        </div>
      </SettingRow>
    </div>
  </>;
}

export { AIChatSettings };
