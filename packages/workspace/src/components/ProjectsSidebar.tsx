import { GlobalSettingsRow } from "./GlobalSettings";
import { ProjectsSidebarFeedback } from "./ProjectsSidebarFeedback";
import {
  InputGroup, InputGroupAddon, InputGroupInput, Kbd, SearchIcon,
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarProvider,
  Text$4,
} from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as React from "react";

const SIDEBAR_ROW_CLASS = "h-6.5 cursor-default justify-start gap-2 rounded px-1.5 py-0 text-xs font-normal text-ed-foreground-secondary hover:text-ed-foreground [&_svg]:size-[15px]";

function ProjectsSidebar({ header, content }) {
  return <SidebarProvider className="h-full min-h-0 w-auto">
    <Sidebar collapsible="none" className="bg-ed-background">
      <SidebarHeader className="gap-0 p-0">{header}</SidebarHeader>
      <SidebarContent className="overflow-hidden p-0">{content}</SidebarContent>
      <SidebarFooter className="shrink-0 p-3 pt-0">
        <GlobalSettingsRow rowClassName={SIDEBAR_ROW_CLASS} />
        <ProjectsSidebarFeedback rowClassName={SIDEBAR_ROW_CLASS} />
      </SidebarFooter>
    </Sidebar>
  </SidebarProvider>;
}

function ProjectsSidebarHeader({ search = "", onSearchChange }) {
  const { t } = useTranslation("workspace");
  const searchRef = React.useRef(null);
  React.useEffect(() => {
    const focusSearch = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "f") return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  return <>
    <div className="flex h-12.5 items-center border-b border-ed-divider px-3">
      <Text$4 size="sm" weight="medium">Bingo</Text$4>
      <span className="ml-2 rounded bg-ed-muted px-1.5 py-0.5 text-[10px] text-ed-muted-foreground">{t("sidebar.local")}</span>
    </div>
    <div className="px-3 pt-3">
      <InputGroup size="xs" className="h-8 shadow-none focus-within:ring-0!">
        <InputGroupAddon align="inline-start"><SearchIcon /></InputGroupAddon>
        <InputGroupInput ref={searchRef} value={search} onChange={(event) => onSearchChange?.(event.target.value)} placeholder={t("sidebar.searchProjects")} aria-label={t("sidebar.searchProjects")} />
        <InputGroupAddon align="inline-end"><Kbd>⌘F</Kbd></InputGroupAddon>
      </InputGroup>
    </div>
  </>;
}

function ProjectsSidebarContent() {
  const { t } = useTranslation("workspace");
  return <div className="px-3 py-4">
    <Text$4 size="2xs" weight="medium" variant="tertiary">{t("sidebar.filesOnComputer")}</Text$4>
    <p className="mt-2 text-[11px] leading-4 text-ed-muted-foreground">{t("sidebar.localDescription")}</p>
  </div>;
}

export { ProjectsSidebar, ProjectsSidebarContent, ProjectsSidebarHeader };
