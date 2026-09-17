import { AIChatSettings } from "./AIChatSettings";
import { GeneralSettings } from "./GeneralSettings";
import { IconsSettings } from "./IconsSettings";
import { useTranslation } from "@bingo/i18n";
import { ChatIcon, Dialog, DialogContent, DialogDescription, DialogTitle, ScrollArea, SettingsIcon, Text$4 } from "@bingo/ui";
import { Cube as IconsIcon } from "@phosphor-icons/react/dist/icons/Cube";
import * as React from "react";

const CATEGORIES = [
  { id: "general", labelKey: "projectSettings.generalTab", Icon: SettingsIcon },
  { id: "ai", labelKey: "projectSettings.aiTab", Icon: ChatIcon },
  { id: "icons", labelKey: "projectSettings.iconsTab", Icon: IconsIcon },
];

function ProjectSettingsModal({
  open,
  onOpenChange,
  projectId,
  projectName = "",
  onRenameProject,
  canRename = false,
  allowedPaths,
  onAddAllowedPath,
  onRemoveAllowedPath,
  isElectron = false,
  iconLibraries = [],
  automaticIconLibraries = [],
  iconLibraryPolicy = { mode: "auto", disabledLibraries: [] },
  onAddIconPackage,
  onRemoveIconPackage,
  onSetIconLibraryMode,
  onAskAIForIconSetup,
  initialSection = "general",
  projectSize,
}) {
  const { t } = useTranslation("editor");
  const [active, setActive] = React.useState(initialSection);

  React.useEffect(() => {
    if (open) setActive(initialSection);
  }, [initialSection, open]);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={false} className="flex min-h-[520px] w-[800px] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-2xl border border-ed-border bg-ed-popover p-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] sm:max-w-[800px]">
      <DialogTitle className="sr-only">{t("projectSettings.modalTitle")}</DialogTitle>
      <DialogDescription className="sr-only">{t("projectSettings.modalDescription", { name: projectName || t("projectSettings.untitledProject") })}</DialogDescription>
      <aside className="flex w-[200px] shrink-0 flex-col gap-8 border-r border-ed-border bg-ed-muted/30 p-2">
        <div className="flex flex-col gap-2 p-1">
          <Text$4 size="2xs" weight="medium" variant="tertiary" className="uppercase tracking-[0.05em]">{t("projectSettings.workspace")}</Text$4>
        </div>
        <nav className="flex flex-col gap-1">
          {CATEGORIES.map(category => {
            const isActive = active === category.id;
            return <button key={category.id} type="button" onClick={() => setActive(category.id)} className={`flex flex-row items-center gap-1.5 rounded-md px-3 py-2 text-left ${isActive ? "bg-black/5 text-ed-foreground dark:bg-white/5" : "text-ed-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"}`}>
              <category.Icon width={18} height={18} className={isActive ? "" : "text-ed-muted-foreground"} />
              <Text$4 size="sm" weight={isActive ? "medium" : "regular"} variant={isActive ? "primary" : "tertiary"}>{t(category.labelKey)}</Text$4>
            </button>;
          })}
        </nav>
      </aside>
      <ScrollArea className="flex-1 bg-ed-muted/30">
        <div className="flex flex-col gap-7 px-10 py-8">
          {active === "general" ? <GeneralSettings projectId={projectId} projectName={projectName} onRenameProject={onRenameProject} canRename={canRename} projectSize={projectSize} isElectron={isElectron} /> : null}
          {active === "ai" ? <AIChatSettings allowedPaths={allowedPaths} onAddAllowedPath={onAddAllowedPath} onRemoveAllowedPath={onRemoveAllowedPath} isElectron={isElectron} /> : null}
          {active === "icons" ? <IconsSettings iconLibraries={iconLibraries} automaticIconLibraries={automaticIconLibraries} iconLibraryPolicy={iconLibraryPolicy} onAddIconPackage={onAddIconPackage} onRemoveIconPackage={onRemoveIconPackage} onSetIconLibraryMode={onSetIconLibraryMode} onAskAIForIconSetup={onAskAIForIconSetup} onConfigurationRequired={() => setActive("general")} /> : null}
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>;
}

export { ProjectSettingsModal };
