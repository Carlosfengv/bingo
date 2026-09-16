import { BingoLogo } from "../../assets/BingoLogo";
import { useTranslation } from "@bingo/i18n";
import { Button, CaretDownIcon, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, SettingsIcon, SimpleTabs, Tabs, TabsContent, TabsTrigger, Text$4, cn$2 } from "@bingo/ui";
import * as React from "react";

const TABS = [
  { value: "pages", labelKey: "navigation.pages" },
  { value: "assets", labelKey: "navigation.assets" },
  { value: "agents", labelKey: "navigation.agents" },
  { value: "skills", labelKey: "navigation.skills" },
];

function PendingTab({ name }) {
  const { t } = useTranslation("editor");
  return <div className="flex h-full items-center justify-center px-6 text-center">
    <Text$4 size="3xs" variant="secondary">{t("navigation.panelPending", { name })}</Text$4>
  </div>;
}

function LeftSidebarV2({
  projectName,
  onProjectIconClick,
  onOpenProjectSettings,
  pages,
  assets,
  agents,
  skills,
  activeTab,
  defaultTab = "pages",
  onActiveTabChange,
  onTabActivate,
  className,
}) {
  const { t } = useTranslation("editor");
  const [internalTab, setInternalTab] = React.useState(defaultTab);
  const slots = { pages, assets, agents, skills };
  const visibleTabs = TABS.filter(tab => {
    if (tab.value === "agents" || tab.value === "skills") return slots[tab.value] != null;
    return true;
  });
  const selectedTabRaw = activeTab ?? internalTab;
  const selectedTab = visibleTabs.some(tab => tab.value === selectedTabRaw) ? selectedTabRaw : visibleTabs[0]?.value ?? "pages";
  const handleTabChange = nextTab => {
    if (activeTab === undefined) setInternalTab(nextTab);
    onActiveTabChange?.(nextTab);
    onTabActivate?.(nextTab);
  };

  return <div className={cn$2("flex h-full min-h-0 flex-col overflow-hidden bg-ed-background", className)}>
    <div className="flex shrink-0 items-center justify-between gap-2 p-3">
      <div className="flex min-w-0 flex-row gap-1">
        <Button type="button" size="icon-xs" variant="secondary" className="shrink-0 text-ed-muted-foreground" isChildText={false} onClick={onProjectIconClick} title={onProjectIconClick ? t("navigation.backToFiles") : undefined}>
          <BingoLogo className="size-4 shrink-0" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="xs" variant="ghost" className="min-w-0 shrink" isChildText={false}>
              <span className="truncate">{projectName || t("navigation.untitledProject")}</span>
              <CaretDownIcon width={16} height={16} className="shrink-0 text-ed-foreground-secondary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4}>
            <DropdownMenuItem disabled={!onOpenProjectSettings} onSelect={onOpenProjectSettings}>
              <SettingsIcon width={16} height={16} className="text-ed-muted-foreground" />
              {t("navigation.projectSettings")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <Tabs value={selectedTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
      <div className="flex shrink-0 items-center border-b border-ed-divider px-3 pb-3">
        <SimpleTabs size="xs" className="w-fit shrink-0">
          {visibleTabs.map(tab => <TabsTrigger key={tab.value} value={tab.value} onClick={() => {
            if (tab.value === selectedTab) onTabActivate?.(tab.value);
          }}>{t(tab.labelKey)}</TabsTrigger>)}
        </SimpleTabs>
      </div>
      <TabsContent value="pages" forceMount className="min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden!">{pages ?? <PendingTab name={t("navigation.pages")} />}</TabsContent>
      <TabsContent value="assets" className="min-h-0 flex-1 overflow-hidden">{assets ?? <PendingTab name={t("navigation.assets")} />}</TabsContent>
      {agents != null ? <TabsContent value="agents" forceMount className="min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden!">{agents}</TabsContent> : null}
      {skills != null ? <TabsContent value="skills" className="min-h-0 flex-1 overflow-hidden">{skills}</TabsContent> : null}
    </Tabs>
  </div>;
}

export { LeftSidebarV2 };
