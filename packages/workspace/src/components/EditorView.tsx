import { ProjectLoadError } from "./ProjectLoadError";
import { ProjectLoadProgress } from "./ProjectLoadProgress";
import { ProjectStylesAlert } from "./ProjectStylesAlert";
import { ProjectDependencyPrompt } from "./ProjectDependencyPrompt";
import { useProjectEnvironment } from "../hooks/useProjectEnvironment";
import { createProjectLoadFailure, updateProjectLoadProgress } from "../utils/projectLoadError";
import { createLocalBackend } from "../backends/LocalBackend";
import { useComponents } from "../hooks/useComponents";
import { useProjectBuilderSession } from "../hooks/useProjectBuilderSession";
import { useSkillOverrides, useUpdateSkillOverrides } from "../hooks/useSkillOverrides";
import { projectBuilderClient } from "../services/ProjectBuilderClient";
import { cleanupProjectStylesheet, loadProjectStylesheet } from "../services/projectStylesheet";
import { FeedbackDialog } from "./ProjectsSidebarFeedback";
import { executeCompiledModule, isLoadableIconLibrary } from "@bingo/compiler";
import { BackendProvider, BingoEditor, applyFonts, cleanupFonts } from "@bingo/editor";
import * as React from "react";

const INITIAL_LOAD_TIMEOUT_MS = 60_000;
const ICON_LIBRARY_DISPLAY_NAMES = {
  "lucide-react": "Lucide",
  "@phosphor-icons/react": "Phosphor",
  "@heroicons/react": "Heroicons",
  "@heroicons/react/24/outline": "Heroicons Outline",
  "@heroicons/react/24/solid": "Heroicons Solid",
  "@heroicons/react/20/solid": "Heroicons Mini",
};
const iconLibraryCache = new Map();

function isUsableIconExport(name, value) {
  return (typeof value === "function" || (typeof value === "object" && value !== null && "$$typeof" in value)) &&
    /^[A-Z][a-zA-Z0-9]*$/.test(name) && name !== "default";
}

function displayNameForIconLibrary(library) {
  return ICON_LIBRARY_DISPLAY_NAMES[library] ||
    (library.split("/").pop() || library).replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

async function loadInstalledIconLibrary(projectId, library, revision) {
  const cacheKey = `${projectId}:${library}:${revision || "current"}`;
  if (iconLibraryCache.has(cacheKey)) return iconLibraryCache.get(cacheKey);
  if (!isLoadableIconLibrary(library)) return undefined;
  const result = await window.api.invoke("bingo:load-module", { root: projectId, specifier: library });
  if (!result?.success || !result.url) throw new Error(result?.error || `Could not load ${library}`);
  const module = await executeCompiledModule(result.url);
  const icons = Object.fromEntries(Object.entries(module).filter(([name, value]) => isUsableIconExport(name, value)));
  if (Object.keys(icons).length === 0) throw new Error(`${library} does not export named React icon components`);
  iconLibraryCache.set(cacheKey, icons);
  return icons;
}

function projectAssetUrl(projectId, assetPath) {
  const rel = String(assetPath || "").replace(/^\/+/, "");
  const joined = `${projectId.replace(/[\\/]+$/, "")}/public/${rel}`.replace(/\\/g, "/");
  const encoded = joined.split("/").map((part, index) =>
    index === 0 && /^[A-Za-z]:$/.test(part) ? part : encodeURIComponent(part)
  ).join("/");
  return `file://${encoded.startsWith("/") ? "" : "/"}${encoded}`;
}

function EditorView({
  projectPath,
  projectAccessToken,
  readOnly = false,
  leftHeader,
  rightHeader,
  gitPanel,
  protoMode = false,
  onSelectionChange,
  createBackend: createBackendProp,
  onRebuildRef,
  openPreviewRef,
  allowedPaths,
  onAddAllowedPath,
  onRemoveAllowedPath,
  onClearAllowedPaths,
  isElectron = true,
  externalMcpApprovals,
  onExternalMcpApproval,
  onOpenProjectSettings,
  externalChatDraft,
  focusChatOnMount,
  settingsRevision,
  enableCssEditor = true,
  enableComponentEditV2 = true,
  enableWebviewTweak = true,
  enableSkillCustomization = true,
  enableSidebarV2 = true,
  projectName,
  projectIconUrl,
  onProjectIconClick,
}) {
  const projectId = projectPath;
  const [feedbackDraft, setFeedbackDraft] = React.useState(null);
  const [cssLoaded, setCssLoaded] = React.useState(false);
  const [loadTimedOut, setLoadTimedOut] = React.useState(false);
  const [loadAttempt, setLoadAttempt] = React.useState(0);
  const [loadProgress, setLoadProgress] = React.useState({ stage: "connecting" });
  const [cssError, setCssError] = React.useState(null);
  const loadStartedAt = React.useRef(Date.now());
  const [iconLibraries, setIconLibraries] = React.useState({});
  const [iconLoadErrors, setIconLoadErrors] = React.useState([]);
  const [projectFonts, setProjectFonts] = React.useState(undefined);
  const [settingsNonce, setSettingsNonce] = React.useState(0);
  const [backendChangedFile, setBackendChangedFile] = React.useState(null);
  const compiledClassNames = React.useRef(new Set()).current;
  const fileChangedRef = React.useRef(null);

  useProjectBuilderSession(projectId, projectAccessToken);
  const onSourceFilesUpdated = React.useCallback((paths) => {
    for (const filePath of paths) if (/\.(tsx?|jsx?)$/.test(filePath)) fileChangedRef.current?.(filePath);
    if (paths.some(filePath => /(?:^|\/)(?:package\.json|[^/]+\.(?:tsx?|jsx?))$/.test(filePath))) {
      setSettingsNonce(value => value + 1);
    }
  }, []);
  const componentsState = useComponents(projectId, { onSourceFilesUpdated });
  const {
    initialized, loading, error, components, componentIndex, registryRevision,
    reload, reconnect, scanLoading, requestPropsScan, waitForComponent,
    refreshComponentPaths, ensureComponentNames,
  } = componentsState;

  const onEnvironmentPrepared = React.useCallback(async (isCurrent) => {
    loadStartedAt.current = Date.now();
    setLoadTimedOut(false);
    setLoadProgress({ stage: "building" });
    setLoadAttempt(attempt => attempt + 1);
    if (!projectBuilderClient.isConnected(projectId)) await projectBuilderClient.connect(projectId);
    if (!isCurrent()) return;
    await projectBuilderClient.scanComponents({ forceRescan: true });
    if (!isCurrent()) return;
    // The rebuild publishes the new component/style events. Calling reload()
    // afterwards would set loading=true on an already connected client.
    setSettingsNonce(value => value + 1);
  }, [projectId]);
  const environment = useProjectEnvironment(projectId, {
    enabled: isElectron,
    refreshKey: `${cssError || ""}:${error || ""}:${loadProgress.error || ""}:${loadAttempt}`,
    onPrepared: onEnvironmentPrepared,
  });

  const { data: skillOverridesData } = useSkillOverrides();
  const updateSkillOverrides = useUpdateSkillOverrides(isElectron && enableSkillCustomization);
  const skillOverrides = skillOverridesData?.overrides ?? {};

  React.useEffect(() => {
    setCssLoaded(false);
    setLoadTimedOut(false);
    setCssError(null);
    setLoadProgress({ stage: "connecting" });
    loadStartedAt.current = Date.now();
    let active = true;
    let cssRequest = 0;
    const unsubscribe = projectBuilderClient.on((event) => {
      setLoadProgress(previous => updateProjectLoadProgress(previous, event));
      if (event.type !== "css:ready") return;
      const request = ++cssRequest;
      const payload = event.payload;
      if (payload?.error) {
        setCssError(String(payload.error));
        setCssLoaded(true);
        return;
      }
      if (!payload?.cssUrl) {
        setCssError(null);
        setCssLoaded(true);
        return;
      }
      loadProjectStylesheet(projectId, payload.cssUrl, {
        fontUrls: payload.fontUrls,
        compiledClasses: payload.compiledClasses,
        onCompiledClasses: (classes) => classes.forEach((name) => compiledClassNames.add(name)),
      }).then(() => { if (active && request === cssRequest) { setCssError(null); setCssLoaded(true); } })
        .catch(cause => {
          if (active && request === cssRequest) {
            setCssError(String(cause?.message || cause));
            setCssLoaded(true);
          }
        });
    }, projectId);
    return () => { active = false; unsubscribe(); };
  }, [compiledClassNames, projectId]);

  React.useEffect(() => {
    setLoadTimedOut(false);
    if (environment.busy || environment.inspection?.status === "needs-install" || (!loading && cssLoaded)) { setLoadTimedOut(false); return; }
    const timer = setTimeout(() => setLoadTimedOut(true), INITIAL_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading, cssLoaded, projectId, loadAttempt, loadProgress, environment.busy, environment.inspection?.status]);

  React.useEffect(() => {
    let cancelled = false;
    if (!initialized) return;
    window.api.invoke("bingo:store", { op: "read-settings", root: projectId }).then(async (settings) => {
      if (cancelled || !settings) return;
      const loadedLibraries = {};
      const loadErrors = [];
      const libraries = settings.effectiveIconLibraries || settings.iconLibraries || [];
      const discoveryRevision = `${settings._iconDiscovery?.revision || "settings"}:${loadAttempt}`;
      for (const library of libraries) {
        try {
          const icons = await loadInstalledIconLibrary(projectId, library, discoveryRevision);
          if (icons) loadedLibraries[library] = { icons, displayName: displayNameForIconLibrary(library) };
        } catch (cause) {
          console.warn(`[EditorView] Installed icon package unavailable: ${library}`, cause);
          loadErrors.push(`${library}: ${cause?.message || cause}`);
        }
      }
      if (cancelled) return;
      setIconLibraries(loadedLibraries);
      setIconLoadErrors(loadErrors);
      cleanupFonts();
      const fonts = settings.fonts;
      if (fonts && ((fonts.google?.length || 0) > 0 || (fonts.local?.length || 0) > 0)) {
        applyFonts(fonts, (relativePath) => projectAssetUrl(projectId, relativePath));
        setProjectFonts(fonts);
      } else {
        setProjectFonts(undefined);
      }
    }).catch((cause) => console.warn("[EditorView] Failed to load local settings:", cause));
    return () => { cancelled = true; };
  }, [initialized, loadAttempt, projectId, settingsNonce, settingsRevision]);

  React.useEffect(() => () => {
    cleanupProjectStylesheet(projectId);
    cleanupFonts();
  }, [projectId]);

  React.useEffect(() => {
    if (!backendChangedFile) return;
    onSourceFilesUpdated([backendChangedFile]);
    void refreshComponentPaths([backendChangedFile]);
  }, [backendChangedFile, onSourceFilesUpdated, refreshComponentPaths]);

  React.useEffect(() => {
    const onWorkspaceFile = (event) => {
      const detail = event.detail;
      if (!detail || detail.projectId !== projectId) return;
      if (detail.deleted) void reload();
      else {
        onSourceFilesUpdated([detail.path]);
        if (/\.(tsx?|jsx?)$/.test(detail.path)) void refreshComponentPaths([detail.path]);
      }
    };
    window.addEventListener("bingo-workspace-file-changed", onWorkspaceFile);
    return () => window.removeEventListener("bingo-workspace-file-changed", onWorkspaceFile);
  }, [onSourceFilesUpdated, projectId, refreshComponentPaths, reload]);

  const backendFactory = createBackendProp || createLocalBackend;
  const backend = React.useMemo(() => backendFactory(projectId, {
    compiledClasses: compiledClassNames,
    onSettingsChanged: () => setSettingsNonce((value) => value + 1),
    onFileChanged: (filePath) => setBackendChangedFile(filePath),
  }), [backendFactory, compiledClassNames, projectId]);
  React.useEffect(() => () => backend.dispose?.(), [backend]);

  const handleRebuild = React.useCallback(async () => {
    await projectBuilderClient.scanComponents({ forceRescan: true });
    await reload();
  }, [reload]);
  React.useEffect(() => {
    if (onRebuildRef) onRebuildRef.current = handleRebuild;
    return () => { if (onRebuildRef) onRebuildRef.current = null; };
  }, [handleRebuild, onRebuildRef]);

  const initialLoading = loading || !cssLoaded;
  const fatalError = Object.keys(components).length === 0 ? error || loadProgress.error : null;
  const dependencyPrompt = <ProjectDependencyPrompt environment={environment} readOnly={readOnly} />;
  React.useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("projectTab")) return;
    window.api.send("project-tabs:status", { source: "editor-load",
      status: loadTimedOut || fatalError ? "error" : initialLoading ? "loading" : "idle" });
  }, [initialLoading, fatalError, loadTimedOut]);
  const awaitingResources = environment.visible && (environment.busy || environment.inspection?.status === "needs-install");
  if ((initialLoading && !loadTimedOut && !fatalError) || (awaitingResources && (initialLoading || loadTimedOut || fatalError))) {
    return <ProjectLoadProgress
      preparation={awaitingResources}
      stage={cssLoaded && loading ? "runtime" : loadProgress.stage || "connecting"}
      processed={loadProgress.processed}
      total={loadProgress.total}
      onBack={onProjectIconClick}
    >{dependencyPrompt}</ProjectLoadProgress>;
  }
  if (loadTimedOut || fatalError) {
    const failureProgress = error && error !== loadProgress.error ? { ...loadProgress, stage: "runtime", code: "PROJECT_COMPONENT_LOAD_FAILED", incidentId: null, reportPath: null } : loadProgress;
    const failure = createProjectLoadFailure({ projectId, progress: failureProgress,
      error: fatalError, timedOut: loadTimedOut, cssLoaded, loading, startedAt: loadStartedAt.current });
    return <ProjectLoadError key={`${projectId}:${loadAttempt}`} failure={failure} retryDisabled={environment.busy} onRetry={() => {
      loadStartedAt.current = Date.now();
      setLoadTimedOut(false); setCssError(null); setCssLoaded(false); setLoadProgress({ stage: "connecting" });
      setLoadAttempt(attempt => attempt + 1);
      void reconnect();
    }}>{dependencyPrompt}</ProjectLoadError>;
  }

  const assetResolver = (url) => url.startsWith("/") ? projectAssetUrl(projectId, url) : url;
  return <BackendProvider backend={backend}>
    <BingoEditor
      components={components}
      componentIndex={componentIndex}
      componentsRevision={registryRevision}
      onProjectFilesEdited={refreshComponentPaths}
      iconLibraries={iconLibraries}
      fonts={projectFonts}
      assetResolver={assetResolver}
      projectPath={projectId}
      compilePreview={async () => null}
      readOnly={readOnly}
      leftHeader={leftHeader}
      rightHeader={rightHeader}
      protoMode={protoMode}
      gitPanel={gitPanel}
      onFileChangedRef={fileChangedRef}
      onComponentCreated={waitForComponent}
      serverDrivenFileRefresh={true}
      openPreviewRef={openPreviewRef}
      onSelectionChange={onSelectionChange}
      scanLoading={scanLoading}
      onRequestPropsScan={requestPropsScan}
      onEnsureComponentNames={ensureComponentNames}
      allowedPaths={allowedPaths}
      onAddAllowedPath={onAddAllowedPath}
      onRemoveAllowedPath={onRemoveAllowedPath}
      onClearAllowedPaths={onClearAllowedPaths}
      isElectron={isElectron}
      externalMcpApprovals={externalMcpApprovals}
      onExternalMcpApproval={onExternalMcpApproval}
      onOpenProjectSettings={onOpenProjectSettings}
      externalChatDraft={externalChatDraft}
      focusChatOnMount={focusChatOnMount}
      enableCssEditor={enableCssEditor}
      enableComponentEditV2={enableComponentEditV2}
      enableWebviewTweak={enableWebviewTweak}
      enableSkillCustomization={enableSkillCustomization}
      enableSidebarV2={enableSidebarV2}
      projectName={projectName}
      projectIconUrl={projectIconUrl}
      onProjectIconClick={onProjectIconClick}
      skillOverrides={skillOverrides}
      onUpdateSkillOverrides={(overrides) => updateSkillOverrides.mutate(overrides)}
      onFeedback={setFeedbackDraft}
      canvasAlert={cssError || iconLoadErrors.length > 0 || environment.visible ? <div
        style={{ top: 12, left: 12, right: 12, maxHeight: "60%" }}
        className="absolute z-30 flex flex-col gap-2 overflow-auto"
      >
        {dependencyPrompt}
        {cssError && <ProjectStylesAlert error={cssError} inline />}
        {iconLoadErrors.length > 0 && <div className="rounded-md border border-amber-500/30 bg-ed-background px-3 py-2 text-xs text-ed-foreground">
          Some project icon libraries could not be loaded: {iconLoadErrors.join(" · ")}
        </div>}
      </div> : undefined}
    />
    {feedbackDraft !== null && <FeedbackDialog
      open={true}
      initialMessage={feedbackDraft}
      onOpenChange={(open) => { if (!open) setFeedbackDraft(null); }}
    />}
  </BackendProvider>;
}

export { EditorView };
