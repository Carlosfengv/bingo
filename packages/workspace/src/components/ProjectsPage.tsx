import logoIcon from "../assets/logoIcon.png";
import { useLocalProjectOpen } from "../hooks/useLocalProjectOpen";
import { useLocalDeleteProject, useLocalProjects } from "../hooks/useLocalProjects";
import { MonorepoProjectPicker } from "./MonorepoProjectPicker";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, PlusIcon, Text$4, TrashIcon } from "@bingo/ui";
import { useTranslation } from "@bingo/i18n";
import * as React from "react";

function ProjectsPage({ sidebar, onSelectProject, search = "" }) {
  const { t } = useTranslation("workspace");
  const { data: projects = [], isLoading, isError, refetch } = useLocalProjects("local");
  const deleteProject = useLocalDeleteProject();
  const [projectToRemove, setProjectToRemove] = React.useState(null);
  const [deleteDesignData, setDeleteDesignData] = React.useState(false);
  const [removeError, setRemoveError] = React.useState(null);
  const openFlow = useLocalProjectOpen(onSelectProject);
  const query = search.trim().toLowerCase();
  const visibleProjects = query
    ? projects.filter((project) => `${project.name} ${project.rootPath}`.toLowerCase().includes(query))
    : projects;

  const removeProject = async () => {
    if (!projectToRemove || deleteProject.isPending) return;
    setRemoveError(null);
    try {
      const result = await deleteProject.mutateAsync({ projectId: projectToRemove.id, deleteDesignData });
      if (result?.cancelled) return;
      setProjectToRemove(null);
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : t("projects.removeFailed"));
    }
  };

  return <div className="flex h-screen w-screen bg-ed-background">
    <div className="border-r border-ed-border">{sidebar}</div>
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-12.5 shrink-0 items-center justify-between border-b border-ed-divider px-10">
        <Text$4 as="h1" size="sm" weight="medium" variant="primary">{t("projects.title")}</Text$4>
        <Button size="xs" LeftIcon={PlusIcon} onClick={() => void openFlow.start()} disabled={openFlow.isBusy}>
          {t("projects.openFolder")}
        </Button>
      </header>
      <section className="min-h-0 flex-1 overflow-y-auto p-10">
        {isLoading && <Text$4 size="sm" variant="tertiary">{t("projects.loading")}</Text$4>}
        {isError && <div className="flex items-center gap-3"><Text$4 size="sm" variant="danger">{t("projects.loadError")}</Text$4><Button size="xs" variant="outline" onClick={() => void refetch()}>{t("actions.retry", { ns: "common" })}</Button></div>}
        {!isLoading && !isError && visibleProjects.length === 0 && <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-ed-border bg-ed-muted/30 p-10 text-center">
          <img src={logoIcon} alt="" className="size-12 rounded-xl" />
          <div><Text$4 size="lg" weight="medium">{query ? t("projects.noMatches") : t("projects.emptyTitle")}</Text$4>
            <Text$4 size="sm" variant="tertiary" className="mt-1">{t("projects.localDataNote")}</Text$4></div>
          {!query && <Button size="sm" LeftIcon={PlusIcon} onClick={() => void openFlow.start()}>{t("actions.chooseFolder", { ns: "common" })}</Button>}
        </div>}
        {visibleProjects.length > 0 && <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project) => <div key={project.id} className="group flex min-w-0 items-center gap-3 rounded-xl border border-ed-border bg-ed-card p-3 hover:bg-ed-muted/40">
            <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onSelectProject(project.id)}>
              <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-ed-border bg-ed-muted">
                {project.previewUrl ? <img src={project.previewUrl} alt="" className="h-full w-full object-cover" /> : <img src={logoIcon} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0"><Text$4 size="sm" weight="medium" className="truncate">{project.name}</Text$4>
                <div className="truncate text-[11px] text-ed-muted-foreground" title={project.rootPath}>{project.rootPath}</div></div>
            </button>
            <Button size="icon" variant="ghost" aria-label={t("projects.removeLabel", { name: project.name })} onClick={() => { setProjectToRemove(project); setDeleteDesignData(false); setRemoveError(null); }}><TrashIcon /></Button>
          </div>)}
        </div>}
      </section>
    </main>
    <MonorepoProjectPicker flow={openFlow} />
    <Dialog open={!!projectToRemove} onOpenChange={open => { if (!open && !deleteProject.isPending) setProjectToRemove(null); }}>
      <DialogContent showCloseButton={!deleteProject.isPending} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("projects.removeTitle", { name: projectToRemove?.name ?? "" })}</DialogTitle>
          <DialogDescription>{t("projects.removeDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-ed-foreground">
            <input type="checkbox" checked={deleteDesignData} disabled={deleteProject.isPending} onChange={event => setDeleteDesignData(event.target.checked)} aria-describedby="remove-design-data-help" className="mt-1 accent-current" />
            <span>{t("projects.deleteDesignData")}</span>
          </label>
          <p id="remove-design-data-help" className="pl-5 text-xs leading-5 text-ed-muted-foreground">{t("projects.deleteDesignDataHelp")}</p>
          {projectToRemove && <p className="break-all pl-5 text-xs text-ed-muted-foreground">{projectToRemove.rootPath}/.bingo/design/</p>}
        </div>
        {removeError && <p role="alert" className="text-xs text-ed-destructive">{removeError}</p>}
        <DialogFooter>
          <Button variant="secondary" disabled={deleteProject.isPending} onClick={() => setProjectToRemove(null)}>{t("actions.cancel", { ns: "common" })}</Button>
          <Button variant="destructive" disabled={deleteProject.isPending} onClick={() => void removeProject()}>{deleteProject.isPending ? t("projects.removing") : deleteDesignData ? t("projects.removeWithData") : t("projects.removeOnly")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

export { ProjectsPage };
