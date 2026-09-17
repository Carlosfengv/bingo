import logoIcon from "../../../packages/workspace/src/assets/logoIcon.png";
import { createElectronBackend } from "./backends/ElectronBackend";
import {
  EditorView, ProjectsPage, ProjectsSidebar, ProjectsSidebarContent, ProjectsSidebarHeader,
  syncSkillOverridesToMain, useAllowedPaths, useProject, useProjectIconSettings,
  useSkillOverrides, useUpdateAllowedPaths, useUpdateProject, queryClient,
} from "@bingo/workspace";
import { GLOBAL_SHORTCUTS, ProjectSettingsModal } from "@bingo/editor";
import { useTranslation } from "@bingo/i18n";
import { Button, EditorThemeProvider, PlayIcon, Toaster, Tooltip, TooltipProvider } from "@bingo/ui";
import * as React from "react";
import { ProjectTitlebar } from "./components/ProjectTitlebar";
import { ProjectTabLifecycle } from "./components/ProjectTabLifecycle";
import type { ProjectTab, ProjectTabsState } from "../../shared/projectTabs";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("[Renderer]", error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ error: null })} />;
  }
}

function ErrorFallback({ error, onRetry }) {
  const { t } = useTranslation("app");
  return <div className="flex h-screen items-center justify-center bg-ed-background p-8 text-ed-destructive">
      <div className="max-w-xl rounded-xl border border-ed-border bg-ed-card p-6">
        <h2 className="font-semibold">{t("error.title")}</h2>
        <p className="mt-2 text-sm text-ed-foreground-secondary">{t("error.description")}</p>
        <pre className="mt-3 whitespace-pre-wrap text-xs">{error.message}</pre>
        <button className="mt-4 rounded border border-ed-border px-3 py-1 text-sm" onClick={onRetry}>{t("error.retry")}</button>
      </div>
    </div>;
}

function ProjectEditor({ projectId, onBack }) {
  const { t } = useTranslation("app");
  const openPreviewRef = React.useRef<(() => void) | null>(null);
  const previewLabel = t("preview.title", { ns: "editor" });
  const { data: project } = useProject(projectId);
  const { data: allowedPathsData } = useAllowedPaths(projectId);
  const allowedPaths = allowedPathsData?.allowedPaths ?? [];
  const updateAllowedPaths = useUpdateAllowedPaths(projectId);
  const updateProject = useUpdateProject();
  const { data: skillOverridesData, isFetched: skillOverridesFetched } = useSkillOverrides();
  const [access, setAccess] = React.useState({ mode: "edit" });
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [settingsSection, setSettingsSection] = React.useState("general");
  const [externalMcpApprovals, setExternalMcpApprovals] = React.useState([]);
  React.useEffect(() => {
    window.api.send("project-tabs:status", { name: project?.name, source: "external-approvals",
      status: externalMcpApprovals.length ? "attention" : "idle" });
  }, [project?.name, externalMcpApprovals.length]);

  const iconSettings = useProjectIconSettings({
    projectId,
    projectName: project?.name,
    settingsOpen,
    onCreateIconSetupChatDraft: () => setSettingsOpen(false),
  });

  React.useEffect(() => {
    window.api.invoke("bingo:project-access-get", { projectId }).then(setAccess).catch(console.error);
    return window.api.on("project_access_changed", (event) => {
      if (event.projectId === projectId) setAccess((current) => ({ ...current, mode: event.mode }));
    });
  }, [projectId]);

  React.useEffect(() => {
    if (!skillOverridesFetched) return;
    syncSkillOverridesToMain(true, skillOverridesData?.overrides ?? {});
  }, [skillOverridesData?.overrides, skillOverridesFetched]);

  React.useEffect(() => {
    const offNeeded = window.api.on("mcp_external_tool_approval_needed", (approval) => {
      if (approval.projectId !== projectId) return;
      setExternalMcpApprovals((current) => current.some((item) => item.approvalId === approval.approvalId)
        ? current : [...current, approval]);
    });
    const offResolved = window.api.on("mcp_external_tool_approval_resolved", (event) => {
      if (event.projectId === projectId) setExternalMcpApprovals((current) => current.filter((item) => item.approvalId !== event.approvalId));
    });
    return () => { offNeeded(); offResolved(); };
  }, [projectId]);

  const addAllowedPath = (value) => {
    if (typeof value !== "string" || !value || allowedPaths.includes(value)) return;
    updateAllowedPaths.mutate([...allowedPaths, value]);
  };
  const removeAllowedPath = (value) => updateAllowedPaths.mutate(allowedPaths.filter((path) => path !== value));
  const handleExternalMcpApproval = (approvalId, approved, options) => {
    setExternalMcpApprovals((current) => current.filter((item) => item.approvalId !== approvalId));
    if (options?.autoApproveFileEdits) {
      window.api.invoke("mcp_external_auto_approve_file_edits", { projectId, enabled: true }).catch(console.error);
    }
    window.api.invoke("mcp_tool_approval", { approvalId, approved }).catch(console.error);
  };
  const openSettings = (section = "general") => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };

  return <div className="h-screen w-screen">
    <EditorView
      key={projectId}
      projectPath={projectId}
      readOnly={access.mode !== "edit"}
      createBackend={createElectronBackend}
      openPreviewRef={openPreviewRef}
      rightHeader={<div className="editor-panel-header flex items-center justify-end border-b border-ed-divider bg-ed-background p-3">
        <Tooltip content={`${previewLabel} (${GLOBAL_SHORTCUTS.togglePreviewWindow.keyLabel})`} contentProps={{ side: "bottom" }}>
          <Button variant="outline" size="xs" isChildText={false} aria-label={previewLabel}
            onClick={() => openPreviewRef.current?.()}>
            <PlayIcon width={14} height={14} aria-hidden="true" />
            <span>{previewLabel}</span>
          </Button>
        </Tooltip>
      </div>}
      allowedPaths={allowedPaths}
      onAddAllowedPath={addAllowedPath}
      onRemoveAllowedPath={removeAllowedPath}
      onClearAllowedPaths={() => updateAllowedPaths.mutate([])}
      externalMcpApprovals={externalMcpApprovals}
      onExternalMcpApproval={handleExternalMcpApproval}
      onOpenProjectSettings={openSettings}
      externalChatDraft={iconSettings.externalChatDraft}
      settingsRevision={iconSettings.editorSettingsRevision}
      projectName={project?.name ?? t("localProject")}
      projectIconUrl={logoIcon}
      onProjectIconClick={onBack}
      isElectron={true}
    />
    <ProjectSettingsModal
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      projectId={projectId}
      projectName={project?.name ?? ""}
      onRenameProject={(name) => updateProject.mutateAsync({ projectId, name })}
      canRename={true}
      allowedPaths={allowedPaths}
      onAddAllowedPath={addAllowedPath}
      onRemoveAllowedPath={removeAllowedPath}
      iconLibraries={iconSettings.iconLibraries}
      automaticIconLibraries={iconSettings.automaticIconLibraries}
      iconLibraryPolicy={iconSettings.iconLibraryPolicy}
      onAddIconPackage={iconSettings.addIconPackage}
      onRemoveIconPackage={iconSettings.removeIconPackage}
      onSetIconLibraryMode={iconSettings.setIconLibraryMode}
      onAskAIForIconSetup={iconSettings.askAIForIconSetup}
      isElectron={true}
      initialSection={settingsSection}
      projectSize={null}
    />
  </div>;
}

function ProjectFailure({ tab, onReload, onHome }: {
  tab: ProjectTab;
  onReload: () => Promise<unknown>;
  onHome: () => void;
}) {
  const { t } = useTranslation("app");
  const [recovering, setRecovering] = React.useState(false);
  const [reloadError, setReloadError] = React.useState("");
  const failure = tab.failure;
  const reload = async () => {
    if (recovering) return;
    setRecovering(true);
    setReloadError("");
    try { await onReload(); }
    catch (error) { setReloadError(String(error?.message || error)); setRecovering(false); }
  };
  return <main className="project-window-failure" role="alert">
    <div className="project-window-failure-card">
      <div className="project-window-failure-icon" aria-hidden="true">!</div>
      <h1>{t("tabs.projectFailedTitle", { name: tab.name })}</h1>
      <p>{t("tabs.projectFailedDescription")}</p>
      <dl>
        <div><dt>{t("tabs.failureReason")}</dt><dd>{failure?.reason || t("tabs.failureUnknown")}</dd></div>
        {failure?.exitCode != null && <div><dt>{t("tabs.failureExitCode")}</dt><dd>{failure.exitCode}</dd></div>}
        {failure?.occurredAt && <div><dt>{t("tabs.failureTime")}</dt><dd>{new Date(failure.occurredAt).toLocaleString()}</dd></div>}
      </dl>
      {failure?.detail && <pre>{failure.detail}</pre>}
      {reloadError && <div className="project-window-failure-reload-error">{reloadError}</div>}
      <div className="project-window-failure-actions">
        <button type="button" className="project-window-failure-primary" onClick={() => void reload()} disabled={recovering}>
          {recovering ? t("tabs.reopening") : t("tabs.reopenProject")}
        </button>
        <button type="button" onClick={onHome}>{t("tabs.backHome")}</button>
      </div>
      <p className="project-window-failure-note">{t("tabs.reopenSafety")}</p>
    </div>
  </main>;
}

function AppContent() {
  const [search, setSearch] = React.useState("");
  const { t } = useTranslation("app");
  const [error, setError] = React.useState("");
  const projectTab = new URLSearchParams(window.location.search).get("projectTab");
  const [tabState, setTabState] = React.useState<ProjectTabsState>({ tabs: [], activeId: null, revision: -1, platform: "darwin" });

  React.useEffect(() => {
    if (projectTab) return;
    const update = (next: ProjectTabsState) => setTabState(current => next.revision >= current.revision ? next : current);
    const off = window.api.on("project-tabs:changed", update);
    window.api.invoke("project-tabs:get").then(update).catch(error => setError(String(error.message || error)));
    return off;
  }, [projectTab]);
  React.useEffect(() => {
    if (!projectTab && tabState.activeId === null) void queryClient.invalidateQueries({ queryKey: ["projects"] });
  }, [projectTab, tabState.activeId]);

  React.useEffect(() => {
    if (!window.api?.on) return;
    return window.api.on("clear-caches-and-reload", async () => {
      await window.api.invoke("clear_all_caches");
      try { indexedDB.deleteDatabase("bingo-component-cache"); } catch {}
      window.location.reload();
    });
  }, []);

  const openProject = React.useCallback(async (id) => {
    setError("");
    try { await window.api.invoke("project-tabs:open", { projectId: id }); }
    catch (error) { setError(String(error.message || error)); }
  }, []);
  const run = (channel, args = undefined) => {
    setError("");
    return window.api.invoke(channel, args).catch(error => setError(String(error.message || error)));
  };

  if (projectTab) return <ProjectTabLifecycle><ErrorBoundary>
    <ProjectEditor projectId={projectTab} onBack={() => run("project-tabs:home")} />
  </ErrorBoundary></ProjectTabLifecycle>;
  const sidebar = <ProjectsSidebar
    header={<ProjectsSidebarHeader search={search} onSearchChange={setSearch} />}
    content={<ProjectsSidebarContent />}
  />;
  const activeTab = tabState.tabs.find(tab => tab.id === tabState.activeId);
  const activeFailure = activeTab?.failure ? activeTab : null;
  return <div className="project-window-shell">
    <ProjectTitlebar state={tabState} onActivate={(id, focus = true) => run("project-tabs:activate", { projectId: id, focus })}
      onClose={id => run("project-tabs:close", { projectId: id })} onHome={() => run("project-tabs:home")}
      onList={() => run("project-tabs:list")} />
    {activeFailure ? <ProjectFailure tab={activeFailure}
      onReload={() => window.api.invoke("project-tabs:reload", { projectId: activeFailure.id })}
      onHome={() => run("project-tabs:home")} /> : <div className="project-window-home"
      aria-hidden={tabState.activeId !== null} inert={tabState.activeId !== null || undefined}>
      {error && <div className="project-window-error" role="alert">{error}<button onClick={() => setError("")}>{t("tabs.dismiss")}</button></div>}
      <ProjectsPage sidebar={sidebar} onSelectProject={openProject} search={search} />
    </div>}
  </div>;
}

function App() {
  return <EditorThemeProvider><TooltipProvider><AppContent /><Toaster /></TooltipProvider></EditorThemeProvider>;
}

export { App };
